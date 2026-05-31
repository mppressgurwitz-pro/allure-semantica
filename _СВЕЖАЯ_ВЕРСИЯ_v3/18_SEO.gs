/**
 * 18_SEO.gs v2.5.0
 * normalizeSku_ + поиск по col A и col J + retry + JSON repair + raw answer save.
 */

function setClaudeApiKey() {
  const ui = SpreadsheetApp.getUi();
  const r = ui.prompt('🔑 Claude API ключ', 'sk-ant-…', ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  const key = r.getResponseText().trim();
  if (!key) { ui.alert('Пусто'); return; }
  PropertiesService.getUserProperties().setProperty(CONFIG.PROP_KEYS.CLAUDE_API_KEY, key);
  ui.alert('✅ Сохранено');
}

function getClaudeApiKey_() {
  return PropertiesService.getUserProperties().getProperty(CONFIG.PROP_KEYS.CLAUDE_API_KEY)
      || PropertiesService.getScriptProperties().getProperty(CONFIG.PROP_KEYS.CLAUDE_API_KEY) || '';
}

function generateFullSeo() {
  const ui = SpreadsheetApp.getUi();
  if (!getClaudeApiKey_()) { ui.alert('Не задан Claude API ключ.'); return; }
  const log = newLogContext_('generateFullSeo');
  try {
    log.step('🔎 Pre-flight…');
    const pre = doPreflight_(log);
    if (!pre.ok) { ui.alert(pre.message); log.flush('BLOCKED'); return; }
    log.step('📦 Сбор данных…');
    const data = collectAllData_(log, pre);
    log.step('🚦 Гейтинг…');
    const gated = applyGates_(data, pre, log);
    log.step('🧠 Промпт…');
    const prompt = buildComprehensivePrompt_(data, gated, pre);
    log.step('☁️ Claude…');
    const answer = callClaudeApi_(prompt, log);
    saveRawAnswerToTab_(answer, log);
    log.step('📥 Парс…');
    const parsed = parseClaudeAnswer_(answer, log);
    log.step('🔍 Постпроцесс…');
    const violations = postProcessValidate_(parsed, pre, log);
    log.step('📚 Снимок предыдущего черновика…');
    const version = snapshotAdviceTabs_(log, pre);
    log.step('💾 Запись (это будет v' + version + ' в логе)…');
    writeSeoDraft_(parsed.seo, data, pre, log);
    writeAdStrategy_(parsed.ad, data, log);
    writeLogistics_(parsed.logistics, data, log);
    writeShelfStrategy_(parsed.shelf, data, log);
    writeCompetitorAnalysis_(parsed.competitors, data, log);
    writeKeywordPriority_(gated, log);
    writeManualReview_(gated.flagged, violations, log);
    writeImplementationTracker_(parsed, data, log);
    log.flush('OK');
    ui.alert('✅ Готово', 'Особо: _Advice_Manual_Review, _Advice_Keyword_Priority.', ui.ButtonSet.OK);
  } catch (e) {
    log.error(e.message + '\n' + (e.stack||''));
    log.flush('ERROR');
    ui.alert('❌ Ошибка: ' + e.message + '\n\nСырой ответ в _Advice_Last_Raw.');
  }
}

/**
 * v3.2 — версионирование _Advice_* вкладок.
 * Перед каждой записью нового SEO: копируем текущие _Advice_* в _Advice_*_vN.
 * Исключения: _Advice_Implementation_Tracker (накопительный) и _Advice_Last_Raw (debug).
 * Возвращает номер созданной версии (или 0, если снимать было нечего).
 */
function snapshotAdviceTabs_(log, pre) {
  const ss = getTargetSpreadsheet_();
  const adviceTabs = Object.values(CONFIG.ADVICE_TABS);
  const skipFromSnapshot = [CONFIG.ADVICE_TABS.IMPLEMENTATION, CONFIG.ADVICE_TABS.LAST_RAW];
  const toSnapshot = adviceTabs.filter(t => skipFromSnapshot.indexOf(t) === -1);

  // Найти максимальный существующий номер версии
  let maxVersion = 0;
  const allSheetNames = ss.getSheets().map(s => s.getName());
  toSnapshot.forEach(tabName => {
    const reSrc = tabName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp('^' + reSrc + '_v(\\d+)$');
    allSheetNames.forEach(n => {
      const m = re.exec(n);
      if (m) {
        const v = parseInt(m[1], 10);
        if (v > maxVersion) maxVersion = v;
      }
    });
  });
  const nextVersion = maxVersion + 1;

  let snapshotted = 0;
  toSnapshot.forEach(tabName => {
    const sh = ss.getSheetByName(tabName);
    if (!sh) return;
    if (sh.getLastRow() < 2) return;
    // Не снимать placeholder «Заполнится после…»
    const firstCell = String(sh.getRange(1, 1).getValue() || '');
    if (firstCell.indexOf('Заполнится после') >= 0) return;
    const newName = tabName + '_v' + nextVersion;
    if (ss.getSheetByName(newName)) return;
    sh.copyTo(ss).setName(newName);
    snapshotted++;
  });

  if (snapshotted === 0) {
    log.step('📚 Нечего снимать — это первый прогон');
    return nextVersion;
  }

  log.step('📚 Снимок v' + nextVersion + ': ' + snapshotted + ' вкладок');

  // Лог версий
  const vlog = getOrCreateSheet_(ss, '_Advice_VersionLog');
  if (vlog.getLastRow() === 0) {
    vlog.getRange(1, 1, 1, 5).setValues([['Версия', 'Дата', 'SKU', 'Вкладок', 'Заметка']])
      .setFontWeight('bold').setBackground('#cfe2f3');
    vlog.setFrozenRows(1);
    vlog.setColumnWidth(1, 80); vlog.setColumnWidth(2, 140);
    vlog.setColumnWidth(3, 140); vlog.setColumnWidth(4, 80); vlog.setColumnWidth(5, 400);
  }
  const ts = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
  const skuStr = pre && pre.sku ? String(pre.sku) : '';
  vlog.appendRow(['v' + nextVersion, ts, skuStr, snapshotted, 'снимок до нового прогона']);

  return nextVersion;
}

function doPreflight_(log) {
  const ourSku = String(getParam_('OUR_SKU', CONFIG.DEFAULTS.OUR_SKU));
  const ourName = String(getParam_('OUR_PRODUCT_NAME', CONFIG.DEFAULTS.OUR_PRODUCT_NAME));
  const ettId = String(getParam_('ETIQUETTES_MASTER_ID', '') || '').trim();
  if (!ettId) return { ok: false, message: 'Не задан ETIQUETTES_MASTER_ID.' };
  const rulesId = String(getParam_('RULES_MASTER_ID', '') || '').trim();
  if (!rulesId) return { ok: false, message: 'Не задан RULES_MASTER_ID.' };

  let ett = readEtiquettesForSku_(ettId, ourSku);

  // v3.4: Self-healing — если SKU не найден, пробуем sync из Шаблона + import из XLSX.
  // Часто Маша заполнила данные, но никто не нажал sync. Pipeline сам это исправит.
  if (!ett) {
    log.step('⚠ SKU ' + ourSku + ' не найден в Etiquettes — пробую авто-sync из Шаблона...');
    try {
      syncTemplateToEtiquettes();
      ett = readEtiquettesForSku_(ettId, ourSku);
      if (ett) log.step('✓ Нашёл после sync Шаблона');
    } catch (e) {
      log.step('⚠ sync Шаблона: ' + e.message);
    }
  }
  if (!ett) {
    log.step('⚠ Всё ещё не найден — пробую impportFromInfomodel...');
    try {
      importFromInfomodel();
      ett = readEtiquettesForSku_(ettId, ourSku);
      if (ett) log.step('✓ Нашёл после importFromInfomodel');
    } catch (e) {
      log.step('⚠ importFromInfomodel: ' + e.message);
    }
  }
  if (!ett) return promptCreateEtiquetteRow_(ettId, ourSku, ourName);

  // v3.3 — для наборов INCI может быть пустым (берётся из компонентов)
  let setData = null;
  if (ett.is_set) {
    setData = readSetComponents_(ettId, ett, log);
    if (!setData || !setData.count) {
      return { ok: false, message: 'Набор ' + ourSku + ' помечен is_set=Y, но компоненты не найдены или Состав_набора пустой.' };
    }
    if ((!ett.inci || ett.inci.trim().length < 10) && (!setData.merged_inci || setData.merged_inci.length < 10)) {
      return { ok: false, message: 'У набора ' + ourSku + ' нет INCI ни в строке набора, ни у его компонентов.' };
    }
    log.step('🎁 Набор: ' + setData.count + ' компонентов, объединённый INCI=' + setData.merged_inci.length + 'симв.');
  } else if (!ett.inci || ett.inci.trim().length < 10) {
    return { ok: false, message: 'У SKU ' + ourSku + ' пустой INCI в Etiquettes_Master.\nЗаполни и повтори.' };
  }
  const rules = readRulesMaster_(rulesId);
  log.step('Pre-flight OK: бренд=' + ett.brand + ', пол=' + ett.gender +
           ', категория=' + (ett.category || '—') +
           (ett.fragrance_number ? ', №' + ett.fragrance_number : '') +
           (ett.volume_ml ? ', ' + ett.volume_ml + 'мл' : '') +
           (ett.is_set ? ', НАБОР' : ''));
  return { ok: true, sku: ourSku, name: ourName, etiquette: ett, setData, rules, ettId, rulesId };
}

function normalizeSku_(v) {
  if (v === null || v === undefined) return '';
  let s = String(v).trim();
  if (/^\d+(\.\d+)?[eE][+-]?\d+$/.test(s)) {
    const n = Number(s);
    if (isFinite(n)) s = Math.round(n).toString();
  }
  s = s.replace(/[\s ]/g, '');
  return s.toLowerCase();
}

function readEtiquettesForSku_(ettId, sku) {
  const ss = SpreadsheetApp.openById(ettId);
  const sh = ss.getSheetByName('Состав_SKU');
  if (!sh || sh.getLastRow() < 2) return null;
  const lc = Math.max(sh.getLastColumn(), 20);
  const data = sh.getRange(2, 1, sh.getLastRow() - 1, lc).getValues();
  const target = normalizeSku_(sku);
  if (!target) return null;
  for (const r of data) {
    const colA = normalizeSku_(r[0]);
    const colJ = lc >= 10 ? normalizeSku_(r[9]) : '';
    if (target === colA || target === colJ) {
      return {
        sku: r[0], name: r[1], brand: r[2], gender: r[3],
        inci: String(r[4] || ''), photo: r[5], updated: r[6],
        by: r[7], notes: r[8], internal_code: r[9], ozon: r[10],
        // v3.3 — парфюмерия и наборы
        category:        lc >= 12 ? String(r[11] || '').trim() : '',
        fragrance_number:lc >= 13 ? String(r[12] || '').trim() : '',
        key_notes_en:    lc >= 14 ? String(r[13] || '').trim() : '',
        key_notes_ru:    lc >= 15 ? String(r[14] || '').trim() : '',
        volume_ml:       lc >= 16 ? String(r[15] || '').trim() : '',
        family_id:       lc >= 17 ? String(r[16] || '').trim() : '',
        is_reference:    lc >= 18 ? /^(Y|TRUE|ДА|1)$/i.test(String(r[17])) : false,
        is_set:          lc >= 19 ? /^(Y|TRUE|ДА|1)$/i.test(String(r[18])) : false,
        set_components:  lc >= 20 ? String(r[19] || '').trim() : ''
      };
    }
  }
  return null;
}

/**
 * v3.3 — если SKU помечен is_set=Y, читает все компоненты по их WB nmID
 * и собирает агрегированные данные: список названий, объединённый INCI,
 * объединённый список ключевых нот (если у компонентов парфюмерии).
 */
function readSetComponents_(ettId, parentEtt, log) {
  if (!parentEtt.is_set) return null;
  const raw = String(parentEtt.set_components || '').trim();
  if (!raw) return null;
  const ids = raw.split(/[,;\s]+/).map(s => s.trim()).filter(Boolean);
  if (!ids.length) return null;
  const components = [];
  const inciSet = new Set();
  const notesEnSet = new Set();
  const notesRuSet = new Set();
  ids.forEach(id => {
    const c = readEtiquettesForSku_(ettId, id);
    if (!c) {
      if (log) log.step('⚠ Компонент набора не найден в Etiquettes: ' + id);
      return;
    }
    if (c.is_set) {
      if (log) log.step('⚠ Вложенный набор пропущен (не поддерживаем рекурсию): ' + id);
      return;
    }
    components.push({
      sku: c.sku, name: c.name, brand: c.brand,
      inci: c.inci, category: c.category,
      fragrance_number: c.fragrance_number,
      key_notes_en: c.key_notes_en, key_notes_ru: c.key_notes_ru,
      volume_ml: c.volume_ml
    });
    String(c.inci || '').split(/[,;]/).forEach(t => { const v = t.trim(); if (v) inciSet.add(v); });
    String(c.key_notes_en || '').split(/[,;]/).forEach(t => { const v = t.trim(); if (v) notesEnSet.add(v); });
    String(c.key_notes_ru || '').split(/[,;]/).forEach(t => { const v = t.trim(); if (v) notesRuSet.add(v); });
  });
  return {
    components,
    count: components.length,
    merged_inci: Array.from(inciSet).join(', '),
    merged_notes_en: Array.from(notesEnSet).join(', '),
    merged_notes_ru: Array.from(notesRuSet).join(', ')
  };
}

function readApprovedClaimsForSku_(ettId, sku, brand) {
  const ss = SpreadsheetApp.openById(ettId);
  const sh = ss.getSheetByName('Approved_claims');
  if (!sh || sh.getLastRow() < 2) return [];
  const data = sh.getRange(2, 1, sh.getLastRow() - 1, 6).getValues();
  const tSku = normalizeSku_(sku);
  const tBrand = String(brand || '').toLowerCase().trim();
  return data
    .filter(r => {
      const scope = String(r[0] || '').trim();
      return normalizeSku_(scope) === tSku || scope.toLowerCase() === tBrand;
    })
    .filter(r => /^(Y|TRUE)$/i.test(String(r[2])))
    .map(r => ({ scope: r[0], claim: r[1], basis: r[3] }));
}

function promptCreateEtiquetteRow_(ettId, sku, name) {
  const ui = SpreadsheetApp.getUi();
  const r1 = ui.alert('SKU ' + sku + ' не найден',
    'Создать строку-скелет в Etiquettes_Master?', ui.ButtonSet.YES_NO);
  if (r1 !== ui.Button.YES) return { ok: false, message: 'Отменено.' };
  const brands = Object.keys(CONFIG.BRAND_REGISTRY);
  const r2 = ui.prompt('Бренд', brands.map((b,i) => (i+1) + ') ' + b).join('\n'), ui.ButtonSet.OK_CANCEL);
  if (r2.getSelectedButton() !== ui.Button.OK) return { ok: false, message: 'Отменено.' };
  const bidx = parseInt(r2.getResponseText()) - 1;
  if (bidx < 0 || bidx >= brands.length) return { ok: false, message: 'Неверный номер.' };
  const brand = brands[bidx];
  const r3 = ui.prompt('Пол', '1) мужской\n2) женский\n3) унисекс', ui.ButtonSet.OK_CANCEL);
  if (r3.getSelectedButton() !== ui.Button.OK) return { ok: false, message: 'Отменено.' };
  let gender = CONFIG.BRAND_REGISTRY[brand].default_gender;
  const gx = parseInt(r3.getResponseText());
  if (gx === 1) gender = 'мужской'; else if (gx === 2) gender = 'женский'; else if (gx === 3) gender = 'унисекс';
  const ss = SpreadsheetApp.openById(ettId);
  const sh = ss.getSheetByName('Состав_SKU');
  const ts = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
  sh.appendRow([sku, name, brand, gender, '', '', ts, 'preflight_create', '']);
  return { ok: false, message: 'Создана строка #' + sh.getLastRow() + '. Заполни INCI и повтори.' };
}

function readRulesMaster_(rulesId) {
  const ss = SpreadsheetApp.openById(rulesId);
  const result = { rules: [], brands: [], lexicon: [] };
  let sh = ss.getSheetByName('Правила');
  if (sh && sh.getLastRow() > 1) {
    const d = sh.getRange(2, 1, sh.getLastRow()-1, 7).getValues();
    result.rules = d.filter(r => /^(Y|TRUE)$/i.test(String(r[4])))
      .map(r => ({ id: r[0], section: r[1], text: r[2], severity: r[3] }));
  }
  return result;
}

function collectAllData_(log, pre) {
  const ss = getTargetSpreadsheet_();
  const sem = readTopRows_(ss, CONFIG.SERVICE_TABS.SEMCORE, 80);
  const miss = readTopRows_(ss, CONFIG.SERVICE_TABS.MISSING, 60);
  const sco = readTopRows_(ss, '_Scoring', 60);
  const pok = readTopRows_(ss, CONFIG.TEMPLATE_TABS.POKAZATELI.name, 40);
  const skl = readTopRows_(ss, CONFIG.TEMPLATE_TABS.SKLADY.name, 50);
  const mgc = readTopRows_(ss, CONFIG.TEMPLATE_TABS.MG_CLUSTERS.name, 80);
  const mgs = readTopRows_(ss, CONFIG.TEMPLATE_TABS.MG_SHELVES.name, 80);
  const adsh = readTopRows_(ss, CONFIG.TEMPLATE_TABS.AD_SHELF_INPUT.name, 80);
  const claims = readApprovedClaimsForSku_(pre.ettId, pre.sku, pre.etiquette.brand);
  const currentCardRaw = String(getParam_('CURRENT_CARD_STATE_TAB', '_SEO_Draft | 🔴 Сравнение конкурентов') || '');
  const tabNames = currentCardRaw.split('|').map(s => s.trim()).filter(s => s.length);
  const currentCardParts = [];
  let totalCurrentRows = 0;
  tabNames.forEach(tn => {
    const part = readTopRows_(ss, tn, 100);
    if (part.rowCount > 0 || part.headers.length) {
      currentCardParts.push('=== ' + tn + ' ===\n' + part.text);
      totalCurrentRows += part.rowCount;
    } else {
      currentCardParts.push('=== ' + tn + ' === (пусто)');
    }
  });
  const currentCard = {
    rowCount: totalCurrentRows,
    text: currentCardParts.length ? currentCardParts.join('\n\n') : '(не указано)',
    tabs: tabNames
  };
  log.step('Данные: sem=' + sem.rowCount + ' miss=' + miss.rowCount +
           ' MGc=' + mgc.rowCount + ' MGs=' + mgs.rowCount +
           ' claims=' + claims.length + ' card=' + totalCurrentRows);
  return { semCore: sem, missing: miss, scoring: sco, pokazateli: pok, sklady: skl,
           mgCluster: mgc, mgShelf: mgs, adShelfInput: adsh, approvedClaims: claims,
           currentCard, currentCardTabName: tabNames.join(' | ') };
}

function readTopRows_(ss, name, limit) {
  if (!name) return { headers: [], rows: [], rowCount: 0, text: '(нет данных)' };
  const sh = ss.getSheetByName(name);
  if (!sh || sh.getLastRow() < 1) return { headers: [], rows: [], rowCount: 0, text: '(нет данных)' };
  const lr = sh.getLastRow(), lc = Math.max(sh.getLastColumn(), 1);
  const take = Math.min(lr, limit);
  const all = sh.getRange(1, 1, take, lc).getValues();
  return { headers: all[0] || [], rows: all.slice(1), rowCount: all.length - 1,
           text: all.map(r => r.map(v => String(v == null ? '' : v)).join(' | ')).join('\n') };
}

function applyGates_(data, pre, log) {
  const ett = pre.etiquette;
  const inciLow = String(ett.inci || '').toLowerCase();
  const red = CONFIG.SAFETY_RED_LEXICON.map(s => s.toLowerCase());
  const amber = CONFIG.SAFETY_AMBER_LEXICON.map(s => s.toLowerCase());
  const myBrand = ett.brand;
  const otherBrands = [];
  for (const k in CONFIG.BRAND_REGISTRY) {
    if (k === myBrand) continue;
    CONFIG.BRAND_REGISTRY[k].variants.forEach(v => { if (v.length > 2) otherBrands.push(v.toLowerCase()); });
  }
  const gender = String(ett.gender || 'унисекс').toLowerCase();
  const opposite = gender === 'мужской' ? ['женский','женск','дамск','для женщин']
                : gender === 'женский'  ? ['мужской','мужск','для мужчин'] : [];
  const approvedClaimsLow = (data.approvedClaims || []).map(c => String(c.claim).toLowerCase());

  const accepted = [], flagged = [];
  (data.semCore.rows || []).forEach(r => {
    const kw = String(r[0] || '').toLowerCase();
    if (!kw) return;
    if (/^\s*[\d\s]+\s*$/.test(kw)) { flagged.push({ kw: r[0], reason: 'digits_only', severity: 'BLOCK' }); return; }
    if (/\b\d+\s*(мл|л|г|кг|гр|шт)\b/i.test(kw)) { flagged.push({ kw: r[0], reason: 'volume_in_kw', severity: 'BLOCK' }); return; }
    const ob = otherBrands.find(b => kw.indexOf(b) >= 0);
    if (ob) { flagged.push({ kw: r[0], reason: 'other_brand:' + ob, severity: 'BLOCK' }); return; }
    const og = opposite.find(g => kw.indexOf(g) >= 0);
    if (og) { flagged.push({ kw: r[0], reason: 'opposite_gender:' + og, severity: 'BLOCK' }); return; }
    const rh = red.find(w => kw.indexOf(w) >= 0);
    if (rh) { flagged.push({ kw: r[0], reason: 'red:' + rh, severity: 'BLOCK' }); return; }
    // v3.2: AMBER теперь advisory. Ключ ВСЕГДА идёт в accepted.
    // Параллельно — заметка в flagged с REVIEW, чтобы человек глянул.
    // supported = clean review (есть подтверждение в INCI/approved_claims), unsupported = надо проверить руками.
    const ah = amber.find(w => kw.indexOf(w) >= 0);
    if (ah) {
      const inApproved = approvedClaimsLow.indexOf(ah) >= 0;
      const sup = checkInciSupport_(ah, inciLow);
      const supported = inApproved || sup.supported;
      accepted.push(r);
      flagged.push({
        kw: r[0],
        reason: (supported ? 'amber_supported:' : 'amber_advisory:') + ah,
        severity: 'REVIEW'
      });
      return;
    }
    accepted.push(r);
  });
  log.step('🚦 Gates: ' + (data.semCore.rows||[]).length + ' → ✓' + accepted.length + ' / ⚠' + flagged.length);
  return { accepted, flagged };
}

function checkInciSupport_(claim, inciLow) {
  const M = {
    'бессульфатный':         { neg: ['sulfate','sulphate','sulfat','лаурет'] },
    'безсульфатный':         { neg: ['sulfate','sulphate','sulfat','лаурет'] },
    'без сульфатов':         { neg: ['sulfate','sulphate','sulfat','лаурет'] },
    'с кератином':           { pos: ['keratin','кератин'] },
    'кератиновый':           { pos: ['keratin','кератин'] },
    'с цинком':              { pos: ['zinc','цинк','pyrithione'] },
    'с салициловой кислотой':{ pos: ['salicylic','салицил'] },
    'без парабенов':         { neg: ['paraben','парабен'] },
    'без силиконов':         { neg: ['siloxane','dimethicone','silicone'] }
  };
  const m = M[claim];
  if (!m) return { supported: false };
  if (m.pos) return { supported: m.pos.some(p => inciLow.indexOf(p) >= 0) };
  if (m.neg) return { supported: !m.neg.some(p => inciLow.indexOf(p) >= 0) };
  return { supported: false };
}

function buildComprehensivePrompt_(data, gated, pre) {
  const ett = pre.etiquette;
  const rulesText = (pre.rules.rules || []).map(r => `[${r.id || ''}|${r.severity || ''}] ${r.section}: ${r.text}`).join('\n');
  const claimsText = (data.approvedClaims || []).map(c => `${c.scope} → ${c.claim}`).join('\n');
  // v3.1: даём 80 ключей (было 60) и отдельно — top-15 для прямого вхождения в первые 2 абзаца
  const acceptedKw = gated.accepted.slice(0, 80).map(r => r.join(' | ')).join('\n');
  const top15ForDirectUse = gated.accepted.slice(0, 15).map(r => String(r[0] || '').trim()).filter(Boolean);

  const sys = 'Ты SEO-эксперт по Wildberries. Пишешь продающие SEO-описания, которые ' +
              'одновременно дают высокий рейтинг в поиске WB И конкурируют с описаниями ' +
              'конкурентов по плотности фактов и языка преимуществ. ' +
              'Приоритет источников: этикетка (INCI) > approved_claims > правила > семантика. ' +
              'Базовые косметические действия (очищает, увлажняет, питает, восстанавливает, ' +
              'мягкий, нежный, шелковистый, блеск, объём, рост, густота, против сухости) — ' +
              'используешь свободно, как конкуренты. Состав (конкретные компоненты) — ' +
              'ТОЛЬКО из INCI выше. Никогда не пишешь конкретное свойство ' +
              '(«с кератином», «без сульфатов», «с цинком»), которое нельзя проверить по INCI. ' +
              'Прямые медицинские заявления (лечит, от <диагноза>, фармакология, антимикотик) — ' +
              'ЗАПРЕЩЕНЫ. WB читает OCR с фото — на фото действуют те же правила.';

  // v3.3 — парфюмерия и наборы
  const isPerfumery = !!(ett.key_notes_en || ett.key_notes_ru || ett.fragrance_number);
  const isSet = !!(pre.setData);
  let productMeta = '## Товар\nSKU: ' + pre.sku + '\nНазвание: ' + pre.name +
                    '\nБренд: ' + ett.brand + '\nПол: ' + ett.gender;
  if (ett.category) productMeta += '\nКатегория: ' + ett.category;
  if (ett.fragrance_number) productMeta += '\nНомер аромата: №' + ett.fragrance_number;
  if (ett.volume_ml) productMeta += '\nОбъём: ' + ett.volume_ml + ' мл';
  if (isSet) productMeta += '\nЭто НАБОР из ' + pre.setData.count + ' продуктов';
  productMeta += '\n';

  let notesBlock = '';
  if (isPerfumery) {
    notesBlock =
      '## ⭐⭐⭐ КЛЮЧЕВЫЕ НОТЫ (фокус для парфюмерии)\n' +
      'EN (как на этикетке): ' + (ett.key_notes_en || '—') + '\n' +
      'RU (для копирайта):   ' + (ett.key_notes_ru || '—') + '\n' +
      'ОБЯЗАТЕЛЬНО: 3 русских ноты упомянуть в ПЕРВОМ абзаце description и включить ' +
      'в active_ingredients_ru. Это первичный покупательский триггер для парфюмерии на WB.\n\n';
  }

  let setBlock = '';
  if (isSet) {
    const compList = pre.setData.components.map((c, i) =>
      '  ' + (i + 1) + '. ' + (c.name || c.sku) +
      (c.fragrance_number ? ' (№' + c.fragrance_number + ')' : '') +
      (c.volume_ml ? ' ' + c.volume_ml + 'мл' : '') +
      (c.key_notes_ru ? ' — ноты: ' + c.key_notes_ru : '')
    ).join('\n');
    setBlock =
      '## 🎁 СОСТАВ НАБОРА\n' +
      'Это набор. Описание должно акцентировать: подарочная упаковка, выгода ' +
      'покупки комплектом, разнообразие нот/продуктов в одном наборе, экономия vs покупка по отдельности.\n' +
      'Компоненты:\n' + compList + '\n' +
      'Объединённый INCI всех компонентов (для контекста, не перечислять полностью):\n' +
      (pre.setData.merged_inci.substring(0, 800) || '(пусто)') + '\n' +
      'Объединённые ключевые ноты RU: ' + (pre.setData.merged_notes_ru || '—') + '\n\n';
  }

  const u =
    productMeta + '\n' +
    notesBlock +
    setBlock +
    '## ⭐ Текущая карточка\n```\n' + (data.currentCard.text || '(пусто)') + '\n```\n\n' +
    '## ⭐ INCI\n```\n' + (isSet ? pre.setData.merged_inci || ett.inci : ett.inci) + '\n```\n\n' +
    '## Approved claims\n```\n' + (claimsText || '(не задано)') + '\n```\n\n' +
    '## Master Rules\n```\n' + (rulesText || '(пусто)') + '\n```\n\n' +
    '## Top-80 ключей (после gate)\n```\n' + acceptedKw + '\n```\n\n' +
    '## ⭐ Топ-15 для прямого вхождения в первые 2 абзаца\n```\n' + top15ForDirectUse.join('\n') + '\n```\n\n' +
    '## Missing top-40\n```\n' + (data.missing.text || '').split('\n').slice(0, 40).join('\n') + '\n```\n\n' +
    '## Показатели vs 4 конкурента\n```\n' + data.pokazateli.text + '\n```\n\n' +
    '## Склады\n```\n' + data.sklady.text + '\n```\n\n' +
    (data.mgCluster.rowCount ? '## MG Кластеры\n```\n' + data.mgCluster.text.split('\n').slice(0,40).join('\n') + '\n```\n\n' : '') +
    (data.mgShelf.rowCount ? '## MG Полки\n```\n' + data.mgShelf.text.split('\n').slice(0,40).join('\n') + '\n```\n\n' : '') +
    '## 13 ПРАВИЛ НАПИСАНИЯ ОПИСАНИЯ (Wildberries) — соблюдать ВСЕ\n' +
    '1. НЕ заспамляй текст, но обеспечь прямые вхождения топ-ключей. Избегай частых повторений одного и того же слова более 3-х раз.\n' +
    '2. Данные о составе бери ТОЛЬКО из секции INCI выше — ни из каких других источников.\n' +
    '3. В описании укажи 3–5 главных активных компонентов состава НА РУССКОМ языке (пантенол, ниацинамид, кератин, гидролизованный протеин пшеницы и т.п. — не латиница).\n' +
    '4. Пол продукта = "' + ett.gender + '". Не используй слова, обозначающие противоположный пол. Если продукт мужской — никаких "женский/для женщин/дамский".\n' +
    '5. В тексте НЕ используй имена собственные, названия чужих брендов, числа (кроме объёма в характеристиках). Если ключ содержит цифры/чужой бренд/имя — переформулируй или пропусти.\n' +
    '6. Длина description: цель 1800–2500 символов с пробелами, абсолютный max 3000. НЕ короче 1800.\n' +
    '7. Стиль — продающее SEO-описание под Wildberries: фактическое, конкретное, с конкурентными преимуществами. Не реклама, не сторителлинг.\n' +
    '8. В title (наименовании) — НЕ упоминать бренд и НЕ дублировать литраж/объём. Литраж идёт только в characteristics.\n' +
    '9. Начало любого предложения НЕ должно содержать указательных местоимений (этот, эта, это, эти, тот, та, те, такой, такая, данный, данная, который, которая…).\n' +
    '10. Первые 2 абзаца ОБЯЗАТЕЛЬНО содержат самые высокочастотные и релевантные ключи из секции «Топ-15 для прямого вхождения» — в прямом вхождении, без склонения. Цель — минимум 8 из 15 ключей в первых двух абзацах.\n' +
    '11. В НАЧАЛЕ description бренд указывается оригинально латиницей: "' + ett.brand + '". Транслит ("' + (CONFIG.BRAND_REGISTRY[ett.brand] && CONFIG.BRAND_REGISTRY[ett.brand].variants ? (CONFIG.BRAND_REGISTRY[ett.brand].variants.find(v => /[А-Яа-я]/.test(v)) || '') : '') + '") можно один раз в середине текста.\n' +
    '12. Структура description — 4–5 абзацев. БЕЗ заголовков/подзаголовков блоков. БЕЗ вопросительных предложений (вопросов).\n' +
    '13. НЕ завершай description призывом к действию ("купите", "закажите", "в корзину", "успейте" и т.п.).\n' +
    '14. НЕ упоминай в description технические INCI-названия химических компонентов: ' +
    'Кокамидопропилбетаин, Поликватерниум-10/-7, Динатрий ЭДТА/EDTA, ' +
    'Цетеариловый/Цетиловый спирт, Лаурет/Лаурил сульфат натрия, Полисорбат, ' +
    'Сульфосукцинат, ПЭГ-N, Кокоилглутамат, Лауроилсаркозинат, Глицерил Олеат, ' +
    'Этилгексилглицерин, Фенилэтанол, Феноксиэтанол. Эти слова отпугивают покупателя. ' +
    'Описывай ЭФФЕКТ компонента человеческим языком: ' +
    'мягкое моющее вещество / мягкая моющая основа / гипоаллергенный ПАВ / ' +
    'кондиционирующий полимер для гладкости и расчёсываемости волос / ' +
    'стабилизатор формулы / эмульгатор / консервант. ' +
    'В блок active_ingredients_ru попадают ТОЛЬКО ключевые активные компоненты, ' +
    'которые покупатель ищет осознанно: пантенол, ниацинамид, кератин, гиалуроновая кислота, ' +
    'аминокислоты шёлка/пшеницы, экстракты растений (крапива, ромашка, плющ, имбирь, шалфей, мята), ' +
    'эфирные масла, ноты парфюмерных композиций. ' +
    'Моющую основу, эмульгаторы, стабилизаторы и консерванты в active_ingredients_ru НЕ включать.\n\n' +
    '## Дополнительные технические требования\n' +
    '- Title ≤ 60 символов\n' +
    '- Composition claims (что заявляешь по составу) — только из approved_claims или то, что напрямую читается в INCI\n' +
    '- characteristics — заполни релевантные WB-атрибуты на основе данных\n' +
    '- main_keywords — 10–15 ВЧ-ключей из top-15\n' +
    '- long_tail_keywords — 15–25 длинных хвостов из top-80\n' +
    '- photo_slides — ровно 6, на каждом слайде укажи captured keywords (WB OCR-индексирует фото)\n\n' +
    '## Вернуть JSON\n```json\n' +
    '{\n  "seo": {\n    "title": "...", "description": "...",\n' +
    '    "characteristics": [{"name":"","value":""}],\n' +
    '    "main_keywords": [], "long_tail_keywords": [],\n' +
    '    "active_ingredients_ru": [],\n' +
    '    "photo_slides": [{"slide_n":1,"role":"","current_text_observed":"","recommended_headline":"","recommended_subline":"","keywords_covered":[],"gap_vs_competitors":"","visual_concept":""}],\n' +
    '    "infographic_strategy":"","notes":""\n' +
    '  },\n' +
    '  "ad":{"auto_campaign":{"recommended_keys":[],"minus_words":[],"bid_strategy":""},"search_campaign":{"high_priority_keys":[],"medium_priority_keys":[],"bid_strategy":""},"notes":""},\n' +
    '  "logistics":{"priority_warehouses":[{"warehouse":"","reason":"","target_units":50}],"deprioritize_warehouses":[{"warehouse":"","reason":""}],"notes":""},\n' +
    '  "shelf":{"recommended_shelves":[{"shelf":"","reason":"","estimated_cost":""}],"skip_shelves":[{"shelf":"","reason":""}],"notes":""},\n' +
    '  "competitors":[{"sku":"","strengths":[],"weaknesses":[],"action_for_us":""}]\n' +
    '}\n```\nphoto_slides: ровно 6. active_ingredients_ru: 3-5 на русском.';
  return { sys, user: u };
}

function callClaudeApi_(prompt, log) {
  const apiKey = getClaudeApiKey_();
  const model = String(getParam_('CLAUDE_MODEL', CONFIG.DEFAULTS.CLAUDE_MODEL));
  const maxTokens = Number(getParam_('CLAUDE_MAX_TOKENS', CONFIG.DEFAULTS.CLAUDE_MAX_TOKENS)) || 16000;
  const body = { model, max_tokens: maxTokens, system: prompt.sys, messages: [{ role: 'user', content: prompt.user }] };
  const payload = JSON.stringify(body);
  const retryCodes = [408, 429, 500, 502, 503, 504, 529];
  const delays = [8000, 20000, 40000];
  for (let attempt = 1; attempt <= delays.length + 1; attempt++) {
    log.step('→ POST anthropic model=' + model + ' (' + attempt + '/' + (delays.length+1) + ')');
    let resp;
    try {
      resp = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
        method: 'post', contentType: 'application/json', muteHttpExceptions: true,
        headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        payload
      });
    } catch (e) {
      if (attempt <= delays.length) { log.step('⏳ сеть: ' + e.message); Utilities.sleep(delays[attempt-1]); continue; }
      throw e;
    }
    const code = resp.getResponseCode(), text = resp.getContentText();
    if (code === 200) {
      const j = JSON.parse(text);
      const c = (j.content || []).map(x => x.text).filter(Boolean).join('\n');
      log.step('← ' + c.length + ' chars stop=' + (j.stop_reason||'') + ' usage=' + (j.usage ? j.usage.input_tokens + '/' + j.usage.output_tokens : 'n/a'));
      return c;
    }
    if (retryCodes.indexOf(code) >= 0 && attempt <= delays.length) {
      log.step('⏳ ' + code + ', retry ' + (delays[attempt-1]/1000) + 'с');
      Utilities.sleep(delays[attempt-1]); continue;
    }
    throw new Error('Claude ' + code + ': ' + text.substring(0, 500));
  }
  throw new Error('Claude: исчерпаны попытки');
}

function parseClaudeAnswer_(answer, log) {
  let s = answer.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  const f = s.indexOf('{'), l = s.lastIndexOf('}');
  if (f >= 0 && l > f) s = s.substring(f, l + 1);
  try { return JSON.parse(s); } catch (e1) {}
  const b = cutToLastBalanced_(s);
  if (b && b !== s) { try { return JSON.parse(b); } catch (e2) {} }
  const r = repairTruncatedJson_(s);
  if (r && r !== s) { try { return JSON.parse(r); } catch (e3) {} }
  log.error('Парс не вышел. len=' + s.length);
  throw new Error('Невалидный JSON. См. _Advice_Last_Raw.');
}

function cutToLastBalanced_(s) {
  let depth = 0, inStr = false, esc = false, last = -1;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (esc) { esc = false; continue; }
    if (c === '\\' && inStr) { esc = true; continue; }
    if (c === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (c === '{' || c === '[') depth++;
    else if (c === '}' || c === ']') { depth--; if (depth === 0) last = i; }
  }
  return last > 0 && last < s.length - 1 ? s.substring(0, last + 1) : null;
}

function repairTruncatedJson_(s) {
  let t = s.replace(/,\s*$/, '');
  let oc = 0, os = 0, inStr = false, esc = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (esc) { esc = false; continue; }
    if (c === '\\' && inStr) { esc = true; continue; }
    if (c === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (c === '{') oc++; else if (c === '}') oc--;
    else if (c === '[') os++; else if (c === ']') os--;
  }
  if (inStr) t += '"';
  for (let i = 0; i < os; i++) t += ']';
  for (let i = 0; i < oc; i++) t += '}';
  return t;
}

function saveRawAnswerToTab_(answer, log) {
  try {
    const ss = getTargetSpreadsheet_();
    const sh = ss.getSheetByName(CONFIG.ADVICE_TABS.LAST_RAW) || ss.insertSheet(CONFIG.ADVICE_TABS.LAST_RAW);
    sh.clear();
    const ts = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
    sh.getRange(1, 1).setValue('Сырой ответ Claude ' + ts + ' (' + answer.length + ' chars)').setFontWeight('bold');
    const C = 45000, chunks = [];
    for (let i = 0; i < answer.length; i += C) chunks.push([answer.substring(i, i+C)]);
    if (chunks.length) sh.getRange(2, 1, chunks.length, 1).setValues(chunks).setWrap(true).setFontFamily('Courier New');
    sh.setColumnWidth(1, 900);
  } catch (e) { log.error('Save raw: ' + e.message); }
}

function postProcessValidate_(parsed, pre, log) {
  const v = [];
  const ett = pre.etiquette;
  const title = String(parsed.seo?.title || '');
  const desc = String(parsed.seo?.description || '');
  const myV = (CONFIG.BRAND_REGISTRY[ett.brand]?.variants || []).map(s => s.toLowerCase());
  const tl = title.toLowerCase();
  const brandHit = myV.find(b => b.length > 2 && tl.indexOf(b) >= 0);
  if (brandHit) v.push({ rule: 'R-BRAND-03', severity: 'HARD', where: 'title', text: title, issue: 'бренд в title' });
  if (title.length > CONFIG.DEFAULTS.TITLE_HARD_MAX) v.push({ rule: 'R-TITLE-01', severity: 'HARD', where: 'title', text: title.length, issue: '>60' });
  const paras = desc.split(/\n\n+/).filter(Boolean);
  const last = (paras[paras.length - 1] || '').toLowerCase();
  const ctaHit = CONFIG.CTA_MARKERS.find(c => last.indexOf(c) >= 0);
  if (ctaHit) v.push({ rule: 'R-DESC-NO-CTA-01', severity: 'SOFT', where: 'description.last', text: last.substring(0,100), issue: 'CTA' });
  if (desc.length > CONFIG.DEFAULTS.DESC_HARD_MAX) v.push({ rule: 'R-DESC-LEN-01', severity: 'HARD', where: 'description', text: desc.length, issue: '>3000' });
  log.step('🔍 Постпроцесс: ' + v.length);
  return v;
}

function writeSeoDraft_(seo, data, pre, log) {
  const ss = getTargetSpreadsheet_();
  const sh = ss.getSheetByName(CONFIG.ADVICE_TABS.SEO_DRAFT) || ss.insertSheet(CONFIG.ADVICE_TABS.SEO_DRAFT);
  sh.clear();
  if (!seo) { sh.getRange(1,1).setValue('Нет данных'); return; }
  const ts = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
  const rows = [];
  rows.push(['🪄 SEO-черновик', '', '', '', '', '', '', '']);
  rows.push(['SKU: ' + pre.sku + ' · ' + pre.etiquette.brand + ' · ' + pre.etiquette.gender, '', '', '', '', '', '', '']);
  rows.push(['Сгенерировано: ' + ts, '', '', '', '', '', '', '']);
  rows.push(['', '', '', '', '', '', '', '']);
  let titleRow = rows.length + 1;
  rows.push(['Title (' + (seo.title || '').length + '/60)', '', '', '', '', '', '', '']);
  rows.push([seo.title || '', '', '', '', '', '', '', '']);
  rows.push(['', '', '', '', '', '', '', '']);
  let descRow = rows.length + 1;
  rows.push(['Описание', '', '', '', '', '', '', '']);
  rows.push([seo.description || '', '', '', '', '', '', '', '']);
  rows.push(['', '', '', '', '', '', '', '']);
  let charRow = rows.length + 1;
  rows.push(['Характеристики', '', '', '', '', '', '', '']);
  (seo.characteristics || []).forEach(c => rows.push([c.name || '', c.value || '', '', '', '', '', '', '']));
  rows.push(['', '', '', '', '', '', '', '']);
  let actRow = rows.length + 1;
  rows.push(['Активные компоненты (рус.)', '', '', '', '', '', '', '']);
  rows.push([(seo.active_ingredients_ru || []).join('\n'), '', '', '', '', '', '', '']);
  rows.push(['', '', '', '', '', '', '', '']);
  let mkRow = rows.length + 1;
  rows.push(['Main keywords', '', '', '', '', '', '', '']);
  rows.push([(seo.main_keywords || []).join('\n'), '', '', '', '', '', '', '']);
  rows.push(['', '', '', '', '', '', '', '']);
  let ltRow = rows.length + 1;
  rows.push(['Long-tail', '', '', '', '', '', '', '']);
  rows.push([(seo.long_tail_keywords || []).join('\n'), '', '', '', '', '', '', '']);
  rows.push(['', '', '', '', '', '', '', '']);
  let slHdr = rows.length + 1;
  rows.push(['📸 Фото-слайды', '', '', '', '', '', '', '']);
  if (seo.infographic_strategy) {
    rows.push(['Стратегия: ' + seo.infographic_strategy, '', '', '', '', '', '', '']);
    rows.push(['', '', '', '', '', '', '', '']);
  }
  let slTabHdr = rows.length + 1;
  rows.push(['#','Роль','Что сейчас','Headline','Subline','Ключи','Gap','Визуал']);
  const slides = (seo.photo_slides || []).slice(0, 12).map(s => [s.slide_n||'', s.role||'', s.current_text_observed||'',
    s.recommended_headline||'', s.recommended_subline||'', (s.keywords_covered||[]).join(', '),
    s.gap_vs_competitors||'', s.visual_concept||'']);
  slides.forEach(r => rows.push(r));
  rows.push(['', '', '', '', '', '', '', '']);
  let nRow = rows.length + 1;
  rows.push(['Заметки', '', '', '', '', '', '', '']);
  rows.push([seo.notes || '', '', '', '', '', '', '', '']);
  sh.getRange(1, 1, rows.length, 8).setValues(rows);
  sh.getRange(1,1).setFontSize(14).setFontWeight('bold');
  [titleRow, descRow, charRow, actRow, mkRow, ltRow, slHdr, nRow].forEach(r => sh.getRange(r,1,1,8).merge().setFontWeight('bold'));
  sh.getRange(titleRow,1,1,8).setBackground('#d9ead3');
  sh.getRange(descRow,1,1,8).setBackground('#fff2cc');
  sh.getRange(slHdr,1,1,8).setBackground('#9900ff').setFontColor('#ffffff').setFontSize(12);
  sh.getRange(slTabHdr,1,1,8).setFontWeight('bold').setBackground('#cfe2f3');
  if (slides.length) sh.getRange(slTabHdr+1,1,slides.length,8).setWrap(true);
  sh.setColumnWidth(1,60); sh.setColumnWidth(2,140); sh.setColumnWidth(3,220);
  sh.setColumnWidth(4,220); sh.setColumnWidth(5,240); sh.setColumnWidth(6,200);
  sh.setColumnWidth(7,240); sh.setColumnWidth(8,240);
  log.step('💾 SEO_Draft slides=' + slides.length);
}

function writeAdStrategy_(ad, data, log) {
  const ss = getTargetSpreadsheet_();
  const sh = ss.getSheetByName(CONFIG.ADVICE_TABS.AD_STRATEGY) || ss.insertSheet(CONFIG.ADVICE_TABS.AD_STRATEGY);
  sh.clear();
  if (!ad) { sh.getRange(1,1).setValue('Нет данных'); return; }
  const ac = ad.auto_campaign || {}, sc = ad.search_campaign || {};
  const rows = [
    ['📈 Стратегия рекламы',''], ['',''],
    ['Автокампания',''],
    ['Ключи', (ac.recommended_keys||[]).join('\n')],
    ['Минус', (ac.minus_words||[]).join('\n')],
    ['Ставки', ac.bid_strategy||''], ['',''],
    ['Поисковая',''],
    ['High', (sc.high_priority_keys||[]).join('\n')],
    ['Medium', (sc.medium_priority_keys||[]).join('\n')],
    ['Ставки', sc.bid_strategy||''], ['',''],
    ['Заметки', ad.notes||'']
  ];
  sh.getRange(1,1,rows.length,2).setValues(rows);
  sh.getRange(1,2,rows.length,1).setWrap(true);
  sh.setColumnWidth(1,200); sh.setColumnWidth(2,700);
}

function writeLogistics_(lg, data, log) {
  const ss = getTargetSpreadsheet_();
  const sh = ss.getSheetByName(CONFIG.ADVICE_TABS.LOGISTICS) || ss.insertSheet(CONFIG.ADVICE_TABS.LOGISTICS);
  sh.clear();
  if (!lg) { sh.getRange(1,1).setValue('Нет данных'); return; }
  const rows = [['📦 Логистика','','']];
  rows.push(['Склад','Целевые','Почему']);
  (lg.priority_warehouses||[]).forEach(w => rows.push([w.warehouse||'', w.target_units||'', w.reason||'']));
  rows.push(['','','']);
  rows.push(['Деприоритез.','','Почему']);
  (lg.deprioritize_warehouses||[]).forEach(w => rows.push([w.warehouse||'', '', w.reason||'']));
  rows.push(['Заметки','','']); rows.push([lg.notes||'','','']);
  sh.getRange(1,1,rows.length,3).setValues(rows);
  sh.getRange(1,3,rows.length,1).setWrap(true);
}

function writeShelfStrategy_(sh_, data, log) {
  const ss = getTargetSpreadsheet_();
  const sh = ss.getSheetByName(CONFIG.ADVICE_TABS.SHELF_STRATEGY) || ss.insertSheet(CONFIG.ADVICE_TABS.SHELF_STRATEGY);
  sh.clear();
  if (!sh_) { sh.getRange(1,1).setValue('Нет данных'); return; }
  const rows = [['🛒 РП','','']];
  rows.push(['Полка','Бюджет','Почему']);
  (sh_.recommended_shelves||[]).forEach(s => rows.push([s.shelf||'', s.estimated_cost||'', s.reason||'']));
  rows.push(['','','']);
  rows.push(['Не идти','','Почему']);
  (sh_.skip_shelves||[]).forEach(s => rows.push([s.shelf||'', '', s.reason||'']));
  rows.push(['Заметки','','']); rows.push([sh_.notes||'','','']);
  sh.getRange(1,1,rows.length,3).setValues(rows);
  sh.getRange(1,3,rows.length,1).setWrap(true);
}

function writeCompetitorAnalysis_(comps, data, log) {
  const ss = getTargetSpreadsheet_();
  const sh = ss.getSheetByName(CONFIG.ADVICE_TABS.COMPETITOR_ANALYSIS) || ss.insertSheet(CONFIG.ADVICE_TABS.COMPETITOR_ANALYSIS);
  sh.clear();
  if (!comps || !comps.length) { sh.getRange(1,1).setValue('Нет данных'); return; }
  const rows = [['🥷 Конкуренты','','',''], ['','','',''], ['SKU','Сильные','Слабые','Что сделать']];
  comps.forEach(c => rows.push([c.sku||'', (c.strengths||[]).join('\n'), (c.weaknesses||[]).join('\n'), c.action_for_us||'']));
  sh.getRange(1,1,rows.length,4).setValues(rows);
  sh.getRange(4,1,comps.length,4).setWrap(true);
}

function writeKeywordPriority_(gated, log) {
  const ss = getTargetSpreadsheet_();
  const sh = ss.getSheetByName(CONFIG.ADVICE_TABS.KEYWORD_PRIORITY) || ss.insertSheet(CONFIG.ADVICE_TABS.KEYWORD_PRIORITY);
  sh.clear();
  const rows = [['🔑 Keyword Priority','','']];
  rows.push(['Запрос','Частота','Источники']);
  gated.accepted.slice(0, 200).forEach(r => rows.push([r[0]||'', r[2]||'', r[10]||'']));
  sh.getRange(1,1,rows.length,3).setValues(rows);
}

function writeManualReview_(flagged, violations, log) {
  const ss = getTargetSpreadsheet_();
  const sh = ss.getSheetByName(CONFIG.ADVICE_TABS.MANUAL_REVIEW) || ss.insertSheet(CONFIG.ADVICE_TABS.MANUAL_REVIEW);
  sh.clear();
  // v3.2: явное разделение блокировок vs advisory.
  // BLOCK — ключ НЕ ушёл в Claude. REVIEW (amber_*) — ключ В описании, проверь.
  const rows = [['⚠️ Manual Review — что проверить руками','','','','']];
  rows.push(['BLOCK = ключ исключён из черновика. REVIEW = ключ В описании (advisory).','','','','']);
  rows.push(['','','','','']);
  rows.push(['Severity','Источник','Что','Причина','Решение (заполни)']);
  // Сортировка: BLOCK выше, REVIEW ниже
  const sortedFlagged = (flagged || []).slice().sort((a, b) => {
    const sev = (s) => s === 'BLOCK' ? 0 : 1;
    return sev(a.severity) - sev(b.severity);
  });
  sortedFlagged.forEach(f => {
    let reasonExplain = f.reason || '';
    if (reasonExplain.indexOf('amber_supported:') === 0) reasonExplain = '✓ Подтверждено INCI/approved (' + reasonExplain.replace('amber_supported:','') + ')';
    else if (reasonExplain.indexOf('amber_advisory:') === 0) reasonExplain = '⚠ В описании, проверь риск WB-модерации (' + reasonExplain.replace('amber_advisory:','') + ')';
    else if (reasonExplain.indexOf('red:') === 0) reasonExplain = '⛔ Медицинский claim, заблокирован (' + reasonExplain.replace('red:','') + ')';
    else if (reasonExplain.indexOf('other_brand:') === 0) reasonExplain = '⛔ Чужой бренд (' + reasonExplain.replace('other_brand:','') + ')';
    else if (reasonExplain.indexOf('opposite_gender:') === 0) reasonExplain = '⛔ Противоположный пол (' + reasonExplain.replace('opposite_gender:','') + ')';
    rows.push([f.severity || '', 'keyword', f.kw || '', reasonExplain, '']);
  });
  rows.push(['','','','','']);
  rows.push(['Severity','Где','Текст','Правило','Решение (заполни)']);
  (violations||[]).forEach(v => rows.push([v.severity||'', v.where||'', v.text||'', v.rule + ': ' + v.issue, '']));
  sh.getRange(1,1,rows.length,5).setValues(rows);
  sh.getRange(1,1,1,5).merge().setFontWeight('bold').setBackground('#fff2cc').setHorizontalAlignment('center');
  sh.getRange(2,1,1,5).merge().setFontStyle('italic').setBackground('#fff8e1');
  sh.getRange(4,1,1,5).setFontWeight('bold').setBackground('#cfe2f3');
  sh.setColumnWidth(1, 90); sh.setColumnWidth(2, 90); sh.setColumnWidth(3, 280);
  sh.setColumnWidth(4, 380); sh.setColumnWidth(5, 180);
}

function writeImplementationTracker_(parsed, data, log) {
  const ss = getTargetSpreadsheet_();
  const sh = ss.getSheetByName(CONFIG.ADVICE_TABS.IMPLEMENTATION) || ss.insertSheet(CONFIG.ADVICE_TABS.IMPLEMENTATION);
  const isEmpty = sh.getLastRow() < 2;
  const ts = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
  const steps = [];
  if (parsed.seo) {
    steps.push([false,'Обновить title','SEO_Draft']);
    steps.push([false,'Заменить описание','SEO_Draft']);
    steps.push([false,'Характеристики','SEO_Draft']);
    steps.push([false,'Фото-слайды','SEO_Draft']);
  }
  if (parsed.ad) { steps.push([false,'Автокампания','Ad']); steps.push([false,'Поисковая','Ad']); }
  if (parsed.logistics) steps.push([false,'Склады','Logistics']);
  if (parsed.shelf) steps.push([false,'Полки','Shelf']);
  if (parsed.competitors) steps.push([false,'Конкуренты','Competitor']);
  steps.push([false,'Проверить Manual_Review','Manual_Review']);
  const header = isEmpty ? [['✅ Трекер','','','',''], ['Сделано','Шаг','Откуда','Кто','Срок']] : [];
  const sep = isEmpty ? [] : [['','— ' + ts + ' —','','','']];
  const block = header.concat(sep).concat(steps.map(s => [s[0], s[1], s[2], '', '']));
  const start = isEmpty ? 1 : sh.getLastRow() + 2;
  if (block.length) sh.getRange(start, 1, block.length, 5).setValues(block);
  if (steps.length) {
    const checkStart = start + (isEmpty ? 2 : sep.length);
    sh.getRange(checkStart, 1, steps.length, 1).insertCheckboxes();
  }
}
