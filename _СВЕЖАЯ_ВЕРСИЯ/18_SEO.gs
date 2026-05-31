/**
 * 18_SEO.gs
 * ============================================================================
 * Сборка комплексных рекомендаций через Claude API:
 *   _Advice_SEO_Draft           — черновик карточки WB (title, описание, blocks)
 *   _Advice_Ad_Strategy         — стратегия рекламы (ставки, ключи для кампаний)
 *   _Advice_Logistics           — что отгружать на какие склады
 *   _Advice_Shelf_Strategy      — рекомендации по рекламной полке (РП)
 *   _Advice_Competitor_Analysis — разбор каждого конкурента (что у них лучше)
 *   _Advice_Implementation_Tracker — шаги внедрения с чекбоксами
 *
 * API-ключ хранится в User Properties конкретного пользователя — другие
 * пользователи таблицы не могут его прочитать.
 *
 * Если на листе "выбор РП" есть данные — они идут в промпт как контекст
 * (читаем, не перезаписываем). На этом листе маркетолог может указывать
 * пожелания: какие категории полок интересуют, какой бюджет и т.д.
 * ============================================================================
 */

// ── Управление API-ключом ────────────────────────────────────────────────────

function setClaudeApiKey() {
  const ui = SpreadsheetApp.getUi();
  const r = ui.prompt(
    '🔑 Claude API ключ',
    'Введите ваш API ключ Anthropic (начинается с sk-ant-…).\n\n' +
    'Ключ сохранится в ваших личных User Properties — другие пользователи таблицы его не увидят.',
    ui.ButtonSet.OK_CANCEL
  );
  if (r.getSelectedButton() !== ui.Button.OK) return;
  const key = r.getResponseText().trim();
  if (!key) { ui.alert('Ключ пустой — отменено'); return; }
  if (!/^sk-ant-/.test(key)) {
    const c = ui.alert('Ключ не похож на Anthropic-формат (sk-ant-…). Сохранить всё равно?', ui.ButtonSet.YES_NO);
    if (c !== ui.Button.YES) return;
  }
  PropertiesService.getUserProperties().setProperty(CONFIG.PROP_KEYS.CLAUDE_API_KEY, key);
  ui.alert('✅ Ключ сохранён в ваших User Properties');
}

function getClaudeApiKey_() {
  const up = PropertiesService.getUserProperties().getProperty(CONFIG.PROP_KEYS.CLAUDE_API_KEY);
  if (up) return up;
  // Фолбэк на Script Properties — на случай, если разработчик заранее туда положил
  const sp = PropertiesService.getScriptProperties().getProperty(CONFIG.PROP_KEYS.CLAUDE_API_KEY);
  return sp || '';
}

// ── Главная точка входа: «Сделать семантику + SEO» ───────────────────────────

function generateFullSeo() {
  const ui = SpreadsheetApp.getUi();
  const key = getClaudeApiKey_();
  if (!key) {
    ui.alert('Не задан Claude API ключ. Меню → Сервис → 🔑 Задать Claude API ключ');
    return;
  }

  const log = newLogContext_('generateFullSeo');
  try {
    log.step('📦 Собираю данные из таблицы…');
    const data = collectAllData_(log);

    log.step('🧠 Формирую промпт для Claude…');
    const prompt = buildComprehensivePrompt_(data);

    log.step('☁️ Запрос к Claude API…');
    const answer = callClaudeApi_(prompt, log);

    log.step('📥 Парсю ответ и пишу во вкладки _Advice_*…');
    const parsed = parseClaudeAnswer_(answer, log);

    writeSeoDraft_(parsed.seo, data, log);
    writeAdStrategy_(parsed.ad, data, log);
    writeLogistics_(parsed.logistics, data, log);
    writeShelfStrategy_(parsed.shelf, data, log);
    writeCompetitorAnalysis_(parsed.competitors, data, log);
    writeImplementationTracker_(parsed, data, log);

    log.flush('OK');
    ui.alert('✅ Готово',
      'Рекомендации записаны во вкладки _Advice_*. Откройте _Dashboard — там ссылки.',
      ui.ButtonSet.OK);
  } catch (e) {
    log.error(e.message + '\n' + (e.stack||''));
    log.flush('ERROR');
    ui.alert('❌ Ошибка: ' + e.message);
  }
}

// ── Сбор контекста ───────────────────────────────────────────────────────────

function collectAllData_(log) {
  const ss = getTargetSpreadsheet_();
  const ourSku = String(getParam_('OUR_SKU', CONFIG.DEFAULTS.OUR_SKU));
  const ourName = String(getParam_('OUR_PRODUCT_NAME', CONFIG.DEFAULTS.OUR_PRODUCT_NAME));

  const semCore  = readTopRows_(ss, CONFIG.SERVICE_TABS.SEMCORE, 80);
  const missing  = readTopRows_(ss, CONFIG.SERVICE_TABS.MISSING, 60);
  const scoring  = readTopRows_(ss, '_Scoring', 60);
  const pokazateli = readTopRows_(ss, CONFIG.TEMPLATE_TABS.POKAZATELI.name, 40);
  const sklady   = readTopRows_(ss, CONFIG.TEMPLATE_TABS.SKLADY.name, 50);
  const mgCluster = readTopRows_(ss, CONFIG.TEMPLATE_TABS.MG_CLUSTERS.name, 80);
  const mgShelf   = readTopRows_(ss, CONFIG.TEMPLATE_TABS.MG_SHELVES.name, 80);
  const adShelfInput = readTopRows_(ss, CONFIG.TEMPLATE_TABS.AD_SHELF_INPUT.name, 80);

  log.step('Собрано: semCore=' + semCore.rowCount + ', missing=' + missing.rowCount +
           ', MG clusters=' + mgCluster.rowCount + ', MG shelves=' + mgShelf.rowCount +
           ', sklady=' + sklady.rowCount + ', pokazateli=' + pokazateli.rowCount +
           (adShelfInput.rowCount ? ', adShelfInput=' + adShelfInput.rowCount : ''));

  return { ourSku, ourName, semCore, missing, scoring, pokazateli, sklady, mgCluster, mgShelf, adShelfInput };
}

function readTopRows_(ss, name, limit) {
  const sh = ss.getSheetByName(name);
  if (!sh || sh.getLastRow() < 2) return { headers: [], rows: [], rowCount: 0, text: '(нет данных)' };
  const lr = sh.getLastRow();
  const lc = sh.getLastColumn();
  const take = Math.min(lr - 1, limit);
  const headers = sh.getRange(1, 1, 1, lc).getValues()[0];
  const rows = sh.getRange(2, 1, take, lc).getValues();
  // Текстовое представление для промпта
  const text = [headers.join(' | ')]
    .concat(rows.map(r => r.map(v => (v === null || v === undefined) ? '' : String(v)).join(' | ')))
    .join('\n');
  return { headers, rows, rowCount: rows.length, text };
}

// ── Построение промпта ───────────────────────────────────────────────────────

function buildComprehensivePrompt_(d) {
  const sys = 'Ты — старший аналитик e-commerce и SEO-эксперт по Wildberries. ' +
              'Тебе дают семантическое ядро, missing keywords, данные MarketGuru (кластеры и полки), ' +
              'остатки на складах и метрики по нашему артикулу против 4 конкурентов. ' +
              'Твоя задача — выдать конкретные действия маркетологу: ' +
              'не общие советы, а готовые тексты, ставки, артикулы складов и точные ключи.';

  const user =
    '## Контекст\n' +
    'Наш товар: ' + d.ourName + '\n' +
    'Артикул WB: ' + d.ourSku + '\n\n' +

    '## Семантическое ядро (top-80 по сумм. частоте)\n```\n' + d.semCore.text + '\n```\n\n' +

    '## Missing keywords (top-60, что есть у конкурентов и нет у нас)\n```\n' + d.missing.text + '\n```\n\n' +

    '## Scoring top-60\n```\n' + d.scoring.text + '\n```\n\n' +

    '## Показатели — наша воронка vs 4 конкурента\n```\n' + d.pokazateli.text + '\n```\n\n' +

    '## Склады и регионы (остатки/заказы в день)\n```\n' + d.sklady.text + '\n```\n\n' +

    (d.mgCluster.rowCount ? '## MarketGuru — Кластеры\n```\n' + d.mgCluster.text + '\n```\n\n' : '') +
    (d.mgShelf.rowCount   ? '## MarketGuru — Мониторинг полок\n```\n' + d.mgShelf.text + '\n```\n\n' : '') +
    (d.adShelfInput.rowCount ? '## Пожелания по рекламной полке (от маркетолога, вкладка "выбор РП")\n```\n' + d.adShelfInput.text + '\n```\n\n' : '') +

    '## Что нужно вернуть\n' +
    'Ответь СТРОГО валидным JSON по схеме ниже, без лишнего текста до или после, без markdown-обёрток.\n\n' +
    '```json\n' +
    '{\n' +
    '  "seo": {\n' +
    '    "title": "новый title карточки (до 60 знаков, главный hi-freq запрос + бренд)",\n' +
    '    "description": "продающее описание 800-1500 символов с ключами, упомянуть top-15 наших и top-10 missing high",\n' +
    '    "characteristics": [\n' +
    '       {"name": "Назначение", "value": "..."}, {"name": "Тип", "value": "..."}\n' +
    '    ],\n' +
    '    "main_keywords": ["до 15 ключей в title и first-screen описания"],\n' +
    '    "long_tail_keywords": ["до 30 long-tail для блоков характеристик и FAQ"],\n' +
    '    "notes": "что важно знать о решении"\n' +
    '  },\n' +
    '  "ad": {\n' +
    '    "auto_campaign": {\n' +
    '      "recommended_keys": ["ключи для автокампании"],\n' +
    '      "minus_words": ["слова, которые надо минусовать"],\n' +
    '      "bid_strategy": "обоснование стартовой ставки и логика её корректировки"\n' +
    '    },\n' +
    '    "search_campaign": {\n' +
    '      "high_priority_keys": ["ключи в кампанию поиск с указанием ставок"],\n' +
    '      "medium_priority_keys": [],\n' +
    '      "bid_strategy": "..."\n' +
    '    },\n' +
    '    "notes": "общая стратегия рекламы"\n' +
    '  },\n' +
    '  "logistics": {\n' +
    '    "priority_warehouses": [\n' +
    '      {"warehouse": "название", "reason": "почему сюда отгрузить", "target_units": 50}\n' +
    '    ],\n' +
    '    "deprioritize_warehouses": [\n' +
    '      {"warehouse": "название", "reason": "почему не имеет смысла"}\n' +
    '    ],\n' +
    '    "notes": "..."\n' +
    '  },\n' +
    '  "shelf": {\n' +
    '    "recommended_shelves": [\n' +
    '      {"shelf": "название полки", "reason": "почему сюда встать", "estimated_cost": "ориентировочный бюджет"}\n' +
    '    ],\n' +
    '    "skip_shelves": [{"shelf": "...", "reason": "..."}],\n' +
    '    "notes": "..."\n' +
    '  },\n' +
    '  "competitors": [\n' +
    '    {"sku": "артикул", "strengths": ["что у них работает"], "weaknesses": ["где у них дыры — наша возможность"], "action_for_us": "что сделать, чтобы обойти"}\n' +
    '  ]\n' +
    '}\n' +
    '```\n\n' +
    'ВАЖНО: только валидный JSON, никаких комментариев, никакого текста вокруг. ' +
    'Если данных не хватает — заполни поле строкой "(недостаточно данных, нужно X)".';

  return { sys, user };
}

// ── Вызов Claude API ─────────────────────────────────────────────────────────

function callClaudeApi_(prompt, log) {
  const apiKey = getClaudeApiKey_();
  if (!apiKey) throw new Error('Claude API ключ не задан');
  const model = String(getParam_('CLAUDE_MODEL', CONFIG.DEFAULTS.CLAUDE_MODEL));
  const maxTokens = Number(getParam_('CLAUDE_MAX_TOKENS', CONFIG.DEFAULTS.CLAUDE_MAX_TOKENS)) || 8000;

  const body = {
    model: model,
    max_tokens: maxTokens,
    system: prompt.sys,
    messages: [{ role: 'user', content: prompt.user }]
  };

  log.step('→ POST https://api.anthropic.com/v1/messages  model=' + model + '  prompt=' + prompt.user.length + ' chars');

  const resp = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
    method: 'post',
    contentType: 'application/json',
    muteHttpExceptions: true,
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    payload: JSON.stringify(body)
  });

  const code = resp.getResponseCode();
  const text = resp.getContentText();
  if (code !== 200) {
    throw new Error('Claude API ошибка ' + code + ': ' + text.substring(0, 500));
  }
  const j = JSON.parse(text);
  const content = (j.content || []).map(c => c.text).filter(Boolean).join('\n');
  log.step('← ответ получен: ' + content.length + ' chars (usage in/out=' +
           (j.usage ? j.usage.input_tokens + '/' + j.usage.output_tokens : 'n/a') + ')');
  return content;
}

function parseClaudeAnswer_(answer, log) {
  // Снимем markdown-обёртки, если Claude их добавил
  let s = answer.trim();
  s = s.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  // Иногда модель пишет текст ДО JSON. Найдём первую { и последнюю }.
  const first = s.indexOf('{'), last = s.lastIndexOf('}');
  if (first >= 0 && last > first) s = s.substring(first, last + 1);
  try {
    return JSON.parse(s);
  } catch (e) {
    log.error('JSON parse failed: ' + e.message + '. Кусок ответа: ' + s.substring(0, 500));
    throw new Error('Claude вернул невалидный JSON. См. _Logs.');
  }
}

// ── Запись результатов во вкладки _Advice_* ──────────────────────────────────

function writeSeoDraft_(seo, data, log) {
  const ss = getTargetSpreadsheet_();
  const sh = getOrCreateSheet_(ss, CONFIG.ADVICE_TABS.SEO_DRAFT);
  sh.clear();
  if (!seo) { sh.getRange(1,1).setValue('Нет данных от Claude'); return; }

  let row = 1;
  sh.getRange(row, 1).setValue('🪄 SEO-черновик карточки WB').setFontWeight('bold').setFontSize(14); row++;
  sh.getRange(row, 1).setValue('Артикул: ' + data.ourSku + ' · ' + data.ourName); row++;
  sh.getRange(row, 1).setValue('Сгенерировано: ' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm')); row += 2;

  function block(label, content, color) {
    sh.getRange(row, 1).setValue(label).setFontWeight('bold').setBackground(color || '#fff2cc'); row++;
    sh.getRange(row, 1).setValue(content || '').setWrap(true); row++;
    row++;
  }

  block('Title (до 60 знаков)', seo.title, '#d9ead3');
  block('Описание', seo.description, '#fff2cc');

  sh.getRange(row, 1).setValue('Характеристики').setFontWeight('bold').setBackground('#cfe2f3'); row++;
  (seo.characteristics || []).forEach(ch => {
    sh.getRange(row, 1).setValue(ch.name || '');
    sh.getRange(row, 2).setValue(ch.value || '');
    row++;
  });
  row++;

  block('Main keywords (для title и first-screen)',     (seo.main_keywords || []).join('\n'), '#d9ead3');
  block('Long-tail keywords (для характеристик и FAQ)',  (seo.long_tail_keywords || []).join('\n'), '#fce5cd');
  block('Заметки',                                       seo.notes, '#ead1dc');

  sh.setColumnWidth(1, 280); sh.setColumnWidth(2, 700);
  log.step('💾 ' + CONFIG.ADVICE_TABS.SEO_DRAFT + ' записан');
}

function writeAdStrategy_(ad, data, log) {
  const ss = getTargetSpreadsheet_();
  const sh = getOrCreateSheet_(ss, CONFIG.ADVICE_TABS.AD_STRATEGY);
  sh.clear();
  if (!ad) { sh.getRange(1,1).setValue('Нет данных от Claude'); return; }

  let row = 1;
  sh.getRange(row, 1).setValue('📈 Стратегия рекламы').setFontWeight('bold').setFontSize(14); row++;
  sh.getRange(row, 1).setValue('Артикул: ' + data.ourSku); row += 2;

  sh.getRange(row, 1, 1, 2).setValues([['Автокампания', '']]).setFontWeight('bold').setBackground('#cfe2f3'); row++;
  const ac = ad.auto_campaign || {};
  sh.getRange(row, 1).setValue('Рекомендуемые ключи');
  sh.getRange(row, 2).setValue((ac.recommended_keys || []).join('\n')).setWrap(true); row++;
  sh.getRange(row, 1).setValue('Минус-слова');
  sh.getRange(row, 2).setValue((ac.minus_words || []).join('\n')).setWrap(true); row++;
  sh.getRange(row, 1).setValue('Ставочная стратегия');
  sh.getRange(row, 2).setValue(ac.bid_strategy || '').setWrap(true); row += 2;

  sh.getRange(row, 1, 1, 2).setValues([['Поисковая кампания', '']]).setFontWeight('bold').setBackground('#d9ead3'); row++;
  const sc = ad.search_campaign || {};
  sh.getRange(row, 1).setValue('High-priority ключи');
  sh.getRange(row, 2).setValue((sc.high_priority_keys || []).join('\n')).setWrap(true); row++;
  sh.getRange(row, 1).setValue('Medium-priority ключи');
  sh.getRange(row, 2).setValue((sc.medium_priority_keys || []).join('\n')).setWrap(true); row++;
  sh.getRange(row, 1).setValue('Ставочная стратегия');
  sh.getRange(row, 2).setValue(sc.bid_strategy || '').setWrap(true); row += 2;

  sh.getRange(row, 1).setValue('Общие заметки').setFontWeight('bold'); row++;
  sh.getRange(row, 1).setValue(ad.notes || '').setWrap(true);

  sh.setColumnWidth(1, 250); sh.setColumnWidth(2, 700);
  log.step('💾 ' + CONFIG.ADVICE_TABS.AD_STRATEGY + ' записан');
}

function writeLogistics_(lg, data, log) {
  const ss = getTargetSpreadsheet_();
  const sh = getOrCreateSheet_(ss, CONFIG.ADVICE_TABS.LOGISTICS);
  sh.clear();
  if (!lg) { sh.getRange(1,1).setValue('Нет данных от Claude'); return; }

  let row = 1;
  sh.getRange(row, 1).setValue('📦 Логистика и склады').setFontWeight('bold').setFontSize(14); row += 2;

  sh.getRange(row, 1, 1, 3).setValues([['Склад', 'Целевые единицы', 'Обоснование']])
    .setFontWeight('bold').setBackground('#d9ead3'); row++;
  (lg.priority_warehouses || []).forEach(w => {
    sh.getRange(row, 1).setValue(w.warehouse || '');
    sh.getRange(row, 2).setValue(w.target_units || '');
    sh.getRange(row, 3).setValue(w.reason || '').setWrap(true);
    row++;
  });
  row++;

  sh.getRange(row, 1, 1, 3).setValues([['Деприоритезировать', '', 'Почему']])
    .setFontWeight('bold').setBackground('#fce5cd'); row++;
  (lg.deprioritize_warehouses || []).forEach(w => {
    sh.getRange(row, 1).setValue(w.warehouse || '');
    sh.getRange(row, 3).setValue(w.reason || '').setWrap(true);
    row++;
  });
  row += 2;

  sh.getRange(row, 1).setValue('Заметки').setFontWeight('bold'); row++;
  sh.getRange(row, 1).setValue(lg.notes || '').setWrap(true);

  sh.setColumnWidth(1, 250); sh.setColumnWidth(2, 130); sh.setColumnWidth(3, 600);
  log.step('💾 ' + CONFIG.ADVICE_TABS.LOGISTICS + ' записан');
}

function writeShelfStrategy_(sh_, data, log) {
  const ss = getTargetSpreadsheet_();
  const sh = getOrCreateSheet_(ss, CONFIG.ADVICE_TABS.SHELF_STRATEGY);
  sh.clear();
  if (!sh_) { sh.getRange(1,1).setValue('Нет данных от Claude'); return; }

  let row = 1;
  sh.getRange(row, 1).setValue('🛒 Стратегия рекламной полки (РП)').setFontWeight('bold').setFontSize(14); row++;
  sh.getRange(row, 1).setValue('Источник пожеланий: вкладка "выбор РП" (' +
    (data.adShelfInput.rowCount ? data.adShelfInput.rowCount + ' строк прочитано' : 'нет данных, использованы только семядро и MG-полки') + ')').setWrap(true);
  row += 2;

  sh.getRange(row, 1, 1, 3).setValues([['Полка', 'Бюджет', 'Почему встать']])
    .setFontWeight('bold').setBackground('#d9ead3'); row++;
  (sh_.recommended_shelves || []).forEach(s => {
    sh.getRange(row, 1).setValue(s.shelf || '');
    sh.getRange(row, 2).setValue(s.estimated_cost || '');
    sh.getRange(row, 3).setValue(s.reason || '').setWrap(true);
    row++;
  });
  row++;

  sh.getRange(row, 1, 1, 3).setValues([['Не идти на эти полки', '', 'Почему']])
    .setFontWeight('bold').setBackground('#fce5cd'); row++;
  (sh_.skip_shelves || []).forEach(s => {
    sh.getRange(row, 1).setValue(s.shelf || '');
    sh.getRange(row, 3).setValue(s.reason || '').setWrap(true);
    row++;
  });
  row += 2;

  sh.getRange(row, 1).setValue('Заметки').setFontWeight('bold'); row++;
  sh.getRange(row, 1).setValue(sh_.notes || '').setWrap(true);

  sh.setColumnWidth(1, 280); sh.setColumnWidth(2, 130); sh.setColumnWidth(3, 600);
  log.step('💾 ' + CONFIG.ADVICE_TABS.SHELF_STRATEGY + ' записан');
}

function writeCompetitorAnalysis_(comps, data, log) {
  const ss = getTargetSpreadsheet_();
  const sh = getOrCreateSheet_(ss, CONFIG.ADVICE_TABS.COMPETITOR_ANALYSIS);
  sh.clear();
  if (!comps || !comps.length) { sh.getRange(1,1).setValue('Нет данных от Claude'); return; }

  sh.getRange(1, 1).setValue('🥷 Разбор конкурентов').setFontWeight('bold').setFontSize(14);
  const headers = ['SKU', 'Сильные стороны', 'Слабые стороны', 'Что сделать нам'];
  sh.getRange(3, 1, 1, headers.length).setValues([headers]).setFontWeight('bold').setBackground('#cfe2f3');
  comps.forEach((c, i) => {
    const row = 4 + i;
    sh.getRange(row, 1).setValue(c.sku || '');
    sh.getRange(row, 2).setValue((c.strengths || []).join('\n')).setWrap(true);
    sh.getRange(row, 3).setValue((c.weaknesses || []).join('\n')).setWrap(true);
    sh.getRange(row, 4).setValue(c.action_for_us || '').setWrap(true);
  });
  sh.setColumnWidth(1, 110); sh.setColumnWidth(2, 320); sh.setColumnWidth(3, 320); sh.setColumnWidth(4, 380);
  sh.setFrozenRows(3);
  log.step('💾 ' + CONFIG.ADVICE_TABS.COMPETITOR_ANALYSIS + ' записан');
}

function writeImplementationTracker_(parsed, data, log) {
  const ss = getTargetSpreadsheet_();
  const sh = getOrCreateSheet_(ss, CONFIG.ADVICE_TABS.IMPLEMENTATION);
  // Не очищаем, если в треке уже есть отметки — но если пусто, заполним
  if (sh.getLastRow() > 1) {
    log.step('Трекер внедрения уже есть — не перезаписываю чекбоксы, добавляю новый сгенерированный список ниже');
  } else {
    sh.clear();
  }

  let row = sh.getLastRow() + 1;
  if (row < 2) row = 1;
  if (row === 1) {
    sh.getRange(row, 1).setValue('✅ Трекер внедрения рекомендаций').setFontWeight('bold').setFontSize(14); row++;
    const headers = ['Сделано', 'Шаг', 'Откуда', 'Ответственный', 'Срок'];
    sh.getRange(row, 1, 1, headers.length).setValues([headers]).setFontWeight('bold').setBackground('#cfe2f3');
    row++;
  } else {
    row++;
    sh.getRange(row, 2).setValue('— новый запуск ' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm') + ' —').setFontStyle('italic');
    row++;
  }

  const steps = [];
  if (parsed.seo)         steps.push([false, 'Обновить title карточки', 'SEO_Draft → Title']);
  if (parsed.seo)         steps.push([false, 'Заменить описание карточки', 'SEO_Draft → Описание']);
  if (parsed.seo)         steps.push([false, 'Прописать характеристики', 'SEO_Draft → Характеристики']);
  if (parsed.ad)          steps.push([false, 'Запустить автокампанию', 'Ad_Strategy → Автокампания']);
  if (parsed.ad)          steps.push([false, 'Запустить поисковую кампанию', 'Ad_Strategy → Поисковая']);
  if (parsed.logistics)   steps.push([false, 'Отгрузить на приоритетные склады', 'Logistics → priority_warehouses']);
  if (parsed.shelf)       steps.push([false, 'Выкупить рекламные полки', 'Shelf_Strategy → recommended_shelves']);
  if (parsed.competitors) steps.push([false, 'Прокачать слабые места vs конкуренты', 'Competitor_Analysis → action_for_us']);

  if (steps.length) {
    sh.getRange(row, 1, steps.length, 3).setValues(steps);
    sh.getRange(row, 1, steps.length, 1).insertCheckboxes();
  }
  sh.setColumnWidth(1, 90); sh.setColumnWidth(2, 350); sh.setColumnWidth(3, 280);
  sh.setColumnWidth(4, 140); sh.setColumnWidth(5, 120);
  log.step('💾 ' + CONFIG.ADVICE_TABS.IMPLEMENTATION + ' обновлён (+' + steps.length + ' шагов)');
}
