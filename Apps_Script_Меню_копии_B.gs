/**
 * Bound-скрипт меню копии B — полный цикл двусторонней синхронизации с WB.
 *
 * Меню «🪄 SEO»:
 *   📥 PULL из WB                  → GET карточки → колонка «Текущее в WB»
 *   ↻ Перенести SEO → тех.блок     → SEO-черновик → колонка «Новое значение»
 *   🧹 Очистить «Новое значение»
 *   🚀 PUSH в WB (safe)            → GET → merge с «Новое значение» → PUT
 *   🔍 Проверить артикул           → диагностика кириллицы/латиницы в vendorCode
 *   🔧 Починить артикул (CYR→LAT)  → переписать ячейку артикула чистой латиницей
 *
 * Поиск карточки двухстратегиен: сначала textSearch, потом полный обход аккаунта.
 * onOpen ожидается в Bootstrap.gs — он должен в конце вызвать onOpenSeo_().
 *
 * 2026-05-21.
 */

const WB_API_KEY_PLACEHOLDER = 'eyJhbGciOiJFUzI1NiIsImtpZCI6IjIwMjYwMzAydjEiLCJ0eXAiOiJKV1QifQ.eyJhY2MiOjEsImVudCI6MSwiZXhwIjoxNzk1MTM2ODY2LCJpZCI6IjAxOWU0YWE2LTMyNWYtNzY0YS1iMTU2LWE4NGM0NzY4MGUwYiIsImlpZCI6MzAxNjQ2NjgsIm9pZCI6MTE2ODY4NywicyI6NDE1MCwic2lkIjoiNTc3MjI0MjAtODM1Ny00MjA4LThkZjctYmRjZTJkZjU2Y2YxIiwidCI6ZmFsc2UsInVpZCI6MzAxNjQ2Njh9.M1aX3Rv5vIx0wucB7KMXC-kJS41uUkWtOqiNcnPfjQ9f3tLEDA2d-Rb2xyQYyMX2E8lS1RcAEb9vx0ElooMzCA';

function getApiKey() {
  // Приоритет: константа выше → она всегда побеждает старые ключи из Script Properties
  if (WB_API_KEY_PLACEHOLDER && WB_API_KEY_PLACEHOLDER !== 'ВСТАВИТЬ_WB_API_KEY_СЮДА') return WB_API_KEY_PLACEHOLDER;
  const prop = PropertiesService.getScriptProperties().getProperty('WB_API_KEY');
  if (prop) return prop;
  if (typeof getToken === 'function') return getToken();
  if (typeof getApiToken === 'function') return getApiToken();
  throw new Error('WB API key не задан.');
}

const DRAFT_NAME = '_Advice_SEO_Draft';
const TECH_START_MARKER = '▼ ТЕХНИЧЕСКИЙ БЛОК';
const TECH_END_MARKER = '▲ Конец технического блока';

const WB_API_GET = 'https://content-api.wildberries.ru/content/v2/get/cards/list';
const WB_API_UPDATE = 'https://content-api.wildberries.ru/content/v2/cards/update';

const FIELD_MAP = {
  'Объём': 'Объем товара',
  'Эффект': 'Особенности косметики',
  'Назначение': 'Назначение косметического средства',
  'Тип средства': 'Вид пилинга',
  'Формат': 'Формат пилинга'
};

// ====================================================================
// ЗАЩИТА ОТ КИРИЛЛИЦЫ В VENDOR CODE
// ====================================================================
const CYR_TO_LAT = {
  'А': 'A', 'В': 'B', 'С': 'C', 'Е': 'E', 'Н': 'H', 'К': 'K',
  'М': 'M', 'О': 'O', 'Р': 'P', 'Т': 'T', 'Х': 'X', 'У': 'Y',
  'І': 'I', 'Ѕ': 'S', 'Ј': 'J', 'Ѵ': 'V', 'Ԁ': 'D', 'Ν': 'N',
  'а': 'a', 'с': 'c', 'е': 'e', 'о': 'o', 'р': 'p', 'х': 'x',
  'у': 'y', 'і': 'i', 'ѕ': 's', 'ј': 'j', 'ν': 'v'
};

function normalizeVendorCode_(s) {
  if (typeof s !== 'string') return s;
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    out += (CYR_TO_LAT[ch] !== undefined) ? CYR_TO_LAT[ch] : ch;
  }
  return out;
}

function diagnoseString_(s) {
  if (typeof s !== 'string') return [];
  const out = [];
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    const code = s.charCodeAt(i);
    const isCyr = (code >= 0x0400 && code <= 0x04FF) || CYR_TO_LAT[ch] !== undefined;
    out.push({
      idx: i,
      char: ch,
      codeHex: 'U+' + code.toString(16).toUpperCase().padStart(4, '0'),
      isCyr: isCyr,
      latReplace: CYR_TO_LAT[ch] || null
    });
  }
  return out;
}

function describeCyrIssues_(s) {
  const diag = diagnoseString_(s);
  const bad = diag.filter(d => d.isCyr);
  if (!bad.length) return '';
  const list = bad.map(d => `позиция ${d.idx + 1}: "${d.char}" (${d.codeHex}) → должно быть "${d.latReplace || '?'}"`).join('\n');
  return 'В артикуле "' + s + '" найдены кириллические символы:\n' + list;
}

// ====================================================================
// MENU — вызывается из onOpen в Bootstrap.gs
// ====================================================================
function onOpenSeo_(e) {
  SpreadsheetApp.getUi().createMenu('🪄 SEO')
    .addItem('📥 PULL из WB (заполнить «Текущее в WB»)', 'pullFromWB')
    .addSeparator()
    .addItem('↻ Перенести SEO → тех.блок (вручную)', 'transferSeoToTechBlock')
    .addItem('🧹 Очистить «Новое значение»', 'clearNewValuesInTechBlock')
    .addSeparator()
    .addItem('🚀 PUSH в WB (safe: GET→merge→PUT)', 'pushToWBSafe')
    .addSeparator()
    .addItem('🔍 Проверить артикул на кириллицу', 'diagnoseVendorCode')
    .addItem('🔧 Починить артикул (заменить CYR→LAT)', 'fixVendorCodeInSheet')
    .addToUi();
  try { transferSeoToTechBlock_internal(true); } catch (err) { Logger.log('Auto-transfer: ' + err.message); }
}

// ====================================================================
// PULL
// ====================================================================
function pullFromWB() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const draft = ss.getSheetByName(DRAFT_NAME);
  if (!draft) { ui.alert('Лист ' + DRAFT_NAME + ' не найден.'); return; }

  const all = draft.getDataRange().getValues();
  const block = findTechBlock(all);
  if (!block) { ui.alert('Тех.блок не найден.'); return; }

  const rawVendor = readField(all, block, 'Артикул продавца');
  if (!rawVendor) { ui.alert('В тех.блоке не заполнен «Артикул продавца».'); return; }

  const normVendor = normalizeVendorCode_(rawVendor);
  const cyrIssue = describeCyrIssues_(rawVendor);
  if (cyrIssue) Logger.log('VendorCode cleanup: "' + rawVendor + '" → "' + normVendor + '"');

  // Сначала пробуем латинизированный
  let card = fetchCardByVendorCode_safe(normVendor);

  // Если не нашли и оригинал отличался — пробуем оригинал
  if (!card && normVendor !== rawVendor) {
    Logger.log('Fallback: пробуем с оригинальной строкой "' + rawVendor + '"');
    card = fetchCardByVendorCode_safe(rawVendor);
  }

  if (!card) {
    let msg = 'Карточка не найдена в WB по vendorCode = "' + normVendor + '"';
    if (cyrIssue) msg += '\n\nВнимание: ' + cyrIssue + '\n\nПопробуйте: 🪄 SEO → 🔧 Починить артикул, потом снова PULL.';
    else msg += '\n\nПроверьте: (1) ключ из того же кабинета, где карточка; (2) артикул в WB Seller Cabinet точно такой же.\nЖурнал выполнения (значок часов в Apps Script) покажет, что вернул WB.';
    ui.alert(msg);
    return;
  }

  setCachedCard(card);

  const flat = flattenCard(card);
  let filled = 0, notFound = [];
  for (let i = block.start; i <= block.end; i++) {
    const field = String(all[i][0] || '').trim();
    if (!field || field.startsWith('—') || field.startsWith('▼') || field.startsWith('▲')) continue;
    if (flat.hasOwnProperty(field)) {
      draft.getRange(i + 1, 2).setValue(flat[field]);
      filled++;
    } else if (isPullableField(field)) {
      notFound.push(field);
    }
  }
  if (card.nmID) {
    const r = findFieldRow(all, block, 'Артикул WB');
    if (r >= 0) draft.getRange(r + 1, 2).setValue(card.nmID);
  }
  if (card.subjectName) {
    const r = findFieldRow(all, block, 'Категория WB');
    if (r >= 0) draft.getRange(r + 1, 2).setValue(card.subjectName);
  }

  let msg = 'PULL завершён.\n  • Заполнено полей: ' + filled;
  if (notFound.length) msg += '\n  • Нет в ответе API (или другое имя): ' + notFound.join(', ');
  if (cyrIssue) msg += '\n\n⚠️ Внимание: ' + cyrIssue + '\n\nЗапустите 🔧 Починить артикул, чтобы исправить ячейку.';
  ui.alert(msg);
}

// ====================================================================
// ПОИСК КАРТОЧКИ: 2 стратегии
// ====================================================================
function fetchCardByVendorCode(vendorCode) {
  return fetchCardByVendorCode_safe(vendorCode);
}

function fetchCardByVendorCode_safe(vendorCode) {
  // Стратегия 1: фильтрованный textSearch (быстрый путь)
  Logger.log('Стратегия 1: textSearch "' + vendorCode + '"');
  const filtered = _wbFetchCards({
    settings: {
      cursor: { limit: 100 },
      filter: { withPhoto: -1, textSearch: vendorCode }
    }
  });
  Logger.log('  → вернул карточек: ' + filtered.length);
  const inFiltered = filtered.find(c => String(c.vendorCode) === String(vendorCode));
  if (inFiltered) {
    Logger.log('  → точное совпадение найдено в textSearch (nmID=' + inFiltered.nmID + ')');
    return inFiltered;
  }

  // Стратегия 2: полный обход аккаунта (надёжный путь)
  Logger.log('Стратегия 2: полный обход карточек аккаунта');
  let cursor = null;
  let totalScanned = 0;
  for (let page = 0; page < 30; page++) { // защита: максимум 30 страниц × 100 = 3000 карточек
    const body = {
      settings: {
        cursor: { limit: 100 },
        filter: { withPhoto: -1 }
      }
    };
    if (cursor && cursor.updatedAt && cursor.nmID) {
      body.settings.cursor.updatedAt = cursor.updatedAt;
      body.settings.cursor.nmID = cursor.nmID;
    }
    const json = _wbFetchRaw(body);
    const cards = json.cards || [];
    totalScanned += cards.length;
    Logger.log('  страница ' + (page + 1) + ': карточек ' + cards.length + ' (всего отсканировано ' + totalScanned + ')');
    const exact = cards.find(c => String(c.vendorCode) === String(vendorCode));
    if (exact) {
      Logger.log('  → точное совпадение найдено после обхода ' + totalScanned + ' карточек (nmID=' + exact.nmID + ')');
      return exact;
    }
    if (cards.length < 100 || !json.cursor) break;
    cursor = json.cursor;
  }
  Logger.log('Карточка "' + vendorCode + '" не найдена после обхода ' + totalScanned + ' карточек.');
  return null;
}

function _wbFetchCards(body) {
  const json = _wbFetchRaw(body);
  return json.cards || [];
}

function _wbFetchRaw(body) {
  const resp = UrlFetchApp.fetch(WB_API_GET, {
    method: 'post',
    contentType: 'application/json',
    headers: { 'Authorization': getApiKey() },
    payload: JSON.stringify(body),
    muteHttpExceptions: true
  });
  const code = resp.getResponseCode();
  if (code !== 200) throw new Error('GET WB API HTTP ' + code + ': ' + resp.getContentText().slice(0, 500));
  return JSON.parse(resp.getContentText());
}

function flattenCard(card) {
  const f = {};
  if (card.title) f['Title (наименование)'] = card.title;
  if (card.title) f['Наименование'] = card.title;
  if (card.description) f['Описание'] = card.description;
  if (card.brand) f['Бренд'] = card.brand;
  if (card.subjectName) f['Категория WB'] = card.subjectName;
  if (card.vendorCode) f['Артикул продавца'] = card.vendorCode;
  if (card.nmID) f['Артикул WB'] = card.nmID;

  if (card.dimensions) {
    if (card.dimensions.length != null) f['Длина упаковки'] = card.dimensions.length;
    if (card.dimensions.width != null) f['Ширина упаковки'] = card.dimensions.width;
    if (card.dimensions.height != null) f['Высота упаковки'] = card.dimensions.height;
    if (card.dimensions.weightBrutto != null) f['Вес с упаковкой (кг)'] = card.dimensions.weightBrutto;
  }

  if (Array.isArray(card.sizes) && card.sizes.length && Array.isArray(card.sizes[0].skus)) {
    f['Баркод'] = card.sizes[0].skus.join(', ');
  }

  if (Array.isArray(card.characteristics)) {
    for (const ch of card.characteristics) {
      if (!ch || !ch.name) continue;
      let v = ch.value;
      if (Array.isArray(v)) v = v.join(', ');
      f[ch.name] = v;
    }
  }

  if (Array.isArray(card.tnvedCodes) && card.tnvedCodes.length) {
    f['ТНВЭД'] = card.tnvedCodes.join(', ');
  }
  return f;
}

function isPullableField(name) {
  const skip = ['Title (наименование)'];
  return skip.indexOf(name) < 0;
}

// ====================================================================
// AUTO-TRANSFER (SEO-черновик → колонка C)
// ====================================================================
function transferSeoToTechBlock() {
  const result = transferSeoToTechBlock_internal(false);
  SpreadsheetApp.getUi().alert(result);
}

function transferSeoToTechBlock_internal(silent) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const draft = ss.getSheetByName(DRAFT_NAME);
  if (!draft) return 'Лист ' + DRAFT_NAME + ' не найден.';

  const all = draft.getDataRange().getValues();
  const block = findTechBlock(all);
  if (!block) return 'Тех.блок не найден.';

  const seo = parseSeoBlock(all, block.start);

  const valuesByWbName = {};
  if (seo.title) {
    valuesByWbName['Title (наименование)'] = seo.title;
    valuesByWbName['Наименование'] = seo.title;
  }
  if (seo.description) valuesByWbName['Описание'] = seo.description;

  const skipped = [];
  for (const [seoName, value] of Object.entries(seo.characteristics)) {
    let wbName = null;
    if (hasField(all, block, seoName)) wbName = seoName;
    else if (FIELD_MAP[seoName] && hasField(all, block, FIELD_MAP[seoName])) wbName = FIELD_MAP[seoName];
    if (wbName) valuesByWbName[wbName] = value;
    else skipped.push(seoName);
  }

  let written = 0;
  for (let i = block.start; i <= block.end; i++) {
    const field = String(all[i][0] || '').trim();
    if (!field || field.startsWith('—') || field.startsWith('▼') || field.startsWith('▲')) continue;
    if (valuesByWbName.hasOwnProperty(field)) {
      const existing = String(all[i][2] || '').trim();
      if (!existing) {
        draft.getRange(i + 1, 3).setValue(valuesByWbName[field]);
        written++;
      }
    }
  }

  const msg =
    'SEO → тех.блок:\n' +
    '  • Перенесено: ' + written + '\n' +
    (skipped.length ? '  • Без WB-аналога (норма): ' + skipped.join(', ') : '  • Все поля сопоставились');
  Logger.log(msg);
  return msg;
}

function parseSeoBlock(all, techStart) {
  const result = { title: '', description: '', characteristics: {} };
  for (let i = 0; i < techStart; i++) {
    const cell = String(all[i][0] || '').trim();
    if (/^Title(\s*\(.*\))?$/i.test(cell)) {
      for (let j = i + 1; j < techStart && j < i + 5; j++) {
        const v = String(all[j][0] || '').trim();
        if (v) { result.title = v; break; }
      }
    }
    if (/^Описание$/i.test(cell)) {
      for (let j = i + 1; j < techStart && j < i + 5; j++) {
        const v = String(all[j][0] || '').trim();
        if (v) { result.description = v.replace(/^["«]|["»]$/g, ''); break; }
      }
    }
    if (/^Характеристики$/i.test(cell)) {
      for (let j = i + 1; j < techStart; j++) {
        const name = String(all[j][0] || '').trim();
        const value = String(all[j][1] || '').trim();
        if (!name) break;
        if (/^(Активные компоненты|Main keywords|Long-tail|Фото|Заметки|🪄|📸)/i.test(name)) break;
        if (name && value) result.characteristics[name] = value;
      }
    }
  }
  return result;
}

// ====================================================================
// PUSH (safe)
// ====================================================================
function pushToWBSafe() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const draft = ss.getSheetByName(DRAFT_NAME);
  if (!draft) { ui.alert('Лист ' + DRAFT_NAME + ' не найден.'); return; }

  const all = draft.getDataRange().getValues();
  const block = findTechBlock(all);
  if (!block) { ui.alert('Тех.блок не найден.'); return; }

  const rawVendor = readField(all, block, 'Артикул продавца');
  if (!rawVendor) { ui.alert('Не заполнен «Артикул продавца».'); return; }
  const vendorCode = normalizeVendorCode_(rawVendor);

  const card = fetchCardByVendorCode_safe(vendorCode);
  if (!card) { ui.alert('Карточка не найдена по "' + vendorCode + '". Сначала запустите PULL и убедитесь, что карточка находится.'); return; }

  const newValues = {};
  for (let i = block.start; i <= block.end; i++) {
    const name = String(all[i][0] || '').trim();
    const newVal = String(all[i][2] || '').trim();
    if (!name || name.startsWith('—') || name.startsWith('▼') || name.startsWith('▲')) continue;
    if (newVal) newValues[name] = newVal;
  }

  const updated = mergeCard(card, newValues);

  const ans = ui.alert('PUSH в WB',
    'Готов отправить обновлённую карточку для vendorCode = ' + vendorCode + '.\n' +
    'Полей будет изменено: ' + Object.keys(newValues).length + '.\n' +
    'Остальные поля карточки сохраняются как в текущем GET.\n\nОтправлять?',
    ui.ButtonSet.YES_NO);
  if (ans !== ui.Button.YES) { ui.alert('Отменено.'); return; }

  const resp = UrlFetchApp.fetch(WB_API_UPDATE, {
    method: 'post',
    contentType: 'application/json',
    headers: { 'Authorization': getApiKey() },
    payload: JSON.stringify([updated]),
    muteHttpExceptions: true
  });
  const code = resp.getResponseCode();
  const body = resp.getContentText();
  Logger.log('PUT HTTP ' + code + ': ' + body);
  if (code >= 200 && code < 300) {
    ui.alert('PUSH успешен. HTTP ' + code + '. WB примет изменения в течение 3 минут. Через минуту-две сделайте 📥 PULL — увидите свежее состояние.');
  } else {
    ui.alert('PUSH вернул ошибку. HTTP ' + code + '.\nТекст:\n' + body.slice(0, 800));
  }
}

function mergeCard(card, newValues) {
  const c = JSON.parse(JSON.stringify(card));

  if (newValues['Title (наименование)']) c.title = newValues['Title (наименование)'];
  if (newValues['Наименование'] && !newValues['Title (наименование)']) c.title = newValues['Наименование'];
  if (newValues['Описание']) c.description = newValues['Описание'];

  if (Array.isArray(c.characteristics)) {
    c.characteristics = c.characteristics.map(ch => {
      if (ch && ch.name && newValues.hasOwnProperty(ch.name)) {
        return { ...ch, value: splitValue(newValues[ch.name]) };
      }
      return ch;
    });
    const existingNames = c.characteristics.map(x => x && x.name).filter(Boolean);
    for (const name of Object.keys(newValues)) {
      if (existingNames.indexOf(name) < 0 && isWBCharField(name)) {
        c.characteristics.push({ name: name, value: splitValue(newValues[name]) });
      }
    }
  }

  if (c.dimensions) {
    if (newValues['Длина упаковки']) c.dimensions.length = Number(newValues['Длина упаковки']) || c.dimensions.length;
    if (newValues['Ширина упаковки']) c.dimensions.width = Number(newValues['Ширина упаковки']) || c.dimensions.width;
    if (newValues['Высота упаковки']) c.dimensions.height = Number(newValues['Высота упаковки']) || c.dimensions.height;
    if (newValues['Вес с упаковкой (кг)']) c.dimensions.weightBrutto = Number(newValues['Вес с упаковкой (кг)']) || c.dimensions.weightBrutto;
  }

  return c;
}

function splitValue(s) {
  if (typeof s !== 'string') return s;
  const trimmed = s.trim();
  if (trimmed.indexOf(';') >= 0) return trimmed.split(';').map(x => x.trim()).filter(Boolean);
  return trimmed;
}

function isWBCharField(name) {
  const exclude = [
    'Артикул WB', 'Артикул продавца', 'Категория WB', 'Бренд', 'Наименование',
    'Title (наименование)', 'Описание',
    'Длина упаковки', 'Ширина упаковки', 'Высота упаковки', 'Вес с упаковкой (кг)', 'Вес товара без упаковки (г)',
    'Высота предмета', 'Ширина предмета',
    'Баркод', 'ТНВЭД', 'ИКПУ', 'Ставка НДС', 'Код упаковки', 'Тип доставки', 'NTIN', 'Артикул OZON',
    'Номер декларации соответствия', 'Дата регистрации сертификата/декларации',
    'Дата окончания действия сертификата/декларации', 'Номер сертификата соответствия',
    'Свидетельство о регистрации СГР', 'Состав'
  ];
  return exclude.indexOf(name) < 0;
}

// ====================================================================
// ДИАГНОСТИКА И ПОЧИНКА АРТИКУЛА
// ====================================================================
function diagnoseVendorCode() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const draft = ss.getSheetByName(DRAFT_NAME);
  if (!draft) { ui.alert('Лист ' + DRAFT_NAME + ' не найден.'); return; }

  const all = draft.getDataRange().getValues();
  const block = findTechBlock(all);
  if (!block) { ui.alert('Тех.блок не найден.'); return; }

  const raw = readField(all, block, 'Артикул продавца');
  if (!raw) { ui.alert('Ячейка «Артикул продавца» пустая.'); return; }

  const diag = diagnoseString_(raw);
  const fixed = normalizeVendorCode_(raw);
  const bad = diag.filter(d => d.isCyr);

  const lines = diag.map(d => {
    const mark = d.isCyr ? '⚠️ КИРИЛЛИЦА' : 'OK';
    const repl = d.latReplace ? '  → "' + d.latReplace + '"' : '';
    return '[' + (d.idx + 1) + '] "' + d.char + '"  ' + d.codeHex + '  ' + mark + repl;
  });

  let msg = 'Артикул: "' + raw + '" (длина ' + raw.length + ')\n\n' + lines.join('\n');
  if (bad.length) {
    msg += '\n\n⚠️ Найдено кириллических букв: ' + bad.length;
    msg += '\nПравильная латиница: "' + fixed + '"';
    msg += '\n\nНажмите 🪄 SEO → 🔧 Починить артикул, чтобы заменить ячейку автоматически.';
  } else {
    msg += '\n\n✅ Чисто латиница, проблем нет.';
  }
  ui.alert(msg);
}

function fixVendorCodeInSheet() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const draft = ss.getSheetByName(DRAFT_NAME);
  if (!draft) { ui.alert('Лист ' + DRAFT_NAME + ' не найден.'); return; }

  const all = draft.getDataRange().getValues();
  const block = findTechBlock(all);
  if (!block) { ui.alert('Тех.блок не найден.'); return; }

  const row = findFieldRow(all, block, 'Артикул продавца');
  if (row < 0) { ui.alert('Строка «Артикул продавца» не найдена в тех.блоке.'); return; }

  const raw = String(all[row][1] || '').trim();
  if (!raw) { ui.alert('Ячейка «Артикул продавца» (колонка B) пустая. Нечего чинить.'); return; }

  const fixed = normalizeVendorCode_(raw);
  if (fixed === raw) {
    ui.alert('В артикуле "' + raw + '" нет кириллических двойняшек. Чинить нечего.');
    return;
  }

  const ans = ui.alert('Починить артикул?',
    'Сейчас в ячейке: "' + raw + '"\n' +
    'Будет записано:  "' + fixed + '"\n\n' +
    'Кириллические буквы будут заменены на латинские двойники. Продолжить?',
    ui.ButtonSet.YES_NO);
  if (ans !== ui.Button.YES) { ui.alert('Отменено.'); return; }

  draft.getRange(row + 1, 2).setValue(fixed);
  ui.alert('Готово. Артикул заменён на "' + fixed + '". Теперь запустите 📥 PULL.');
}

// ====================================================================
// ОТЛАДКА (запускать из редактора через «Выполнить»)
// ====================================================================
function debugWBSearch() {
  const key = getApiKey();
  let iidInfo = 'unknown';
  try {
    const parts = key.split('.');
    const payload = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(parts[1])).getDataAsString());
    iidInfo = 'iid=' + payload.iid + ', oid=' + payload.oid + ', exp=' + new Date(payload.exp * 1000).toISOString();
  } catch (e) { iidInfo = 'parse error: ' + e.message; }
  Logger.log('=== WB DEBUG START ===');
  Logger.log('Key info: ' + iidInfo);
  Logger.log('Key prefix (first 40 chars): ' + key.slice(0, 40));

  const resp1 = UrlFetchApp.fetch(WB_API_GET, {
    method: 'post', contentType: 'application/json',
    headers: { 'Authorization': key },
    payload: JSON.stringify({ settings: { cursor: { limit: 100 }, filter: { withPhoto: -1, textSearch: 'PGBOT1M08' }}}),
    muteHttpExceptions: true
  });
  Logger.log('textSearch "PGBOT1M08" → HTTP ' + resp1.getResponseCode());
  Logger.log('Response (first 1500): ' + resp1.getContentText().slice(0, 1500));

  const resp2 = UrlFetchApp.fetch(WB_API_GET, {
    method: 'post', contentType: 'application/json',
    headers: { 'Authorization': key },
    payload: JSON.stringify({ settings: { cursor: { limit: 100 }, filter: { withPhoto: -1 }}}),
    muteHttpExceptions: true
  });
  Logger.log('Full list (no filter) → HTTP ' + resp2.getResponseCode());

  if (resp2.getResponseCode() === 200) {
    const json = JSON.parse(resp2.getContentText());
    const cards = json.cards || [];
    Logger.log('Total cards returned: ' + cards.length);
    Logger.log('First 20 vendorCodes: ' + cards.slice(0, 20).map(c => '"' + c.vendorCode + '"').join(', '));
    const exact = cards.find(c => String(c.vendorCode) === 'PGBOT1M08');
    Logger.log('Exact match PGBOT1M08 in full list: ' + (exact ? ('FOUND nmID=' + exact.nmID) : 'NOT FOUND'));
  }
  Logger.log('=== WB DEBUG END ===');
}

// ====================================================================
// УТИЛИТЫ
// ====================================================================
function findTechBlock(all) {
  let start = -1, end = -1;
  for (let i = 0; i < all.length; i++) {
    const cell = String(all[i][0] || '');
    if (start === -1 && cell.indexOf(TECH_START_MARKER) >= 0) start = i;
    if (cell.indexOf(TECH_END_MARKER) >= 0) end = i;
  }
  return (start >= 0 && end >= 0) ? { start: start, end: end } : null;
}

function hasField(all, block, fieldName) {
  for (let i = block.start; i <= block.end; i++) {
    if (String(all[i][0] || '').trim() === fieldName) return true;
  }
  return false;
}

function readField(all, block, fieldName) {
  for (let i = block.start; i <= block.end; i++) {
    if (String(all[i][0] || '').trim() === fieldName) {
      return String(all[i][1] || '').trim();
    }
  }
  return '';
}

function findFieldRow(all, block, fieldName) {
  for (let i = block.start; i <= block.end; i++) {
    if (String(all[i][0] || '').trim() === fieldName) return i;
  }
  return -1;
}

function setCachedCard(card) {
  PropertiesService.getDocumentProperties().setProperty('_wb_card_cache', JSON.stringify(card));
}

function clearNewValuesInTechBlock() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const draft = ss.getSheetByName(DRAFT_NAME);
  if (!draft) return;
  const all = draft.getDataRange().getValues();
  const block = findTechBlock(all);
  if (!block) return;
  let cleared = 0;
  for (let i = block.start; i <= block.end; i++) {
    const fieldName = String(all[i][0] || '').trim();
    if (!fieldName || fieldName.startsWith('—') || fieldName.startsWith('▼') || fieldName.startsWith('▲')) continue;
    if (['Артикул WB', 'Артикул продавца', 'Категория WB', 'Бренд'].indexOf(fieldName) >= 0) continue;
    draft.getRange(i + 1, 3).clearContent();
    cleared++;
  }
  SpreadsheetApp.getUi().alert('Очищено: ' + cleared);
}
