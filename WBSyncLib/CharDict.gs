/**
 * Справочник _WB_Char_Dict — матрица применимости характеристик по категории WB.
 */

function getCharDictSpreadsheetId_() {
  return PropertiesService.getScriptProperties().getProperty('CHAR_DICT_SPREADSHEET_ID') || '';
}

function loadCharDict_(ss) {
  const dictId = getCharDictSpreadsheetId_();
  let dictSs = ss;

  if (dictId) {
    try {
      dictSs = SpreadsheetApp.openById(dictId);
    } catch (e) {
      Logger.log('CHAR_DICT_SPREADSHEET_ID недоступен: ' + e.message + ', fallback на копию');
      dictSs = ss;
    }
  }

  const sh = dictSs.getSheetByName(WBSYNC_CONFIG.CHAR_DICT_SHEET);
  if (!sh) {
    Logger.log('_WB_Char_Dict не найден — фильтр категорий отключён');
    return { headers: WBSYNC_CONFIG.WB_CATEGORIES.slice(), rows: [] };
  }

  const data = sh.getDataRange().getValues();
  if (data.length < 2) return { headers: [], rows: [] };

  const headerRow = data[0];
  const headers = [];
  for (let c = 1; c < headerRow.length; c++) {
    const h = String(headerRow[c] || '').trim();
    if (h) headers.push(h);
  }

  const rows = [];
  for (let r = 1; r < data.length; r++) {
    const name = String(data[r][0] || '').trim();
    if (!name || WBSYNC_CONFIG.DOC_ROW_PATTERN.test(name)) continue;
    const applicable = {};
    for (let c = 0; c < headers.length; c++) {
      applicable[headers[c]] = normalizeBoolFlag_(data[r][c + 1]);
    }
    rows.push({ name: name, applicable: applicable });
  }

  return { headers: headers, rows: rows };
}

function normalizeBoolFlag_(v) {
  if (v === 1 || v === true || String(v).trim() === '1') return true;
  return false;
}

function resolveCategoryColumn_(subjectName, dict) {
  const raw = String(subjectName || '').trim();
  if (!raw) return '';

  if (dict.headers.indexOf(raw) >= 0) return raw;

  const fallback = WBSYNC_CONFIG.CATEGORY_FALLBACKS[raw];
  if (fallback) {
    Logger.log('⚠ Category fallback: «' + raw + '» → «' + fallback + '»');
    if (dict.headers.indexOf(fallback) >= 0) return fallback;
  }

  for (let i = 0; i < dict.headers.length; i++) {
    if (raw.indexOf(dict.headers[i]) >= 0 || dict.headers[i].indexOf(raw) >= 0) {
      return dict.headers[i];
    }
  }

  Logger.log('⚠ Категория «' + raw + '» не найдена в _WB_Char_Dict');
  return '';
}

function getApplicableSeoFields_(subjectName, ss) {
  const dict = loadCharDict_(ss);
  const categoryCol = resolveCategoryColumn_(subjectName, dict);
  if (!categoryCol) return [];

  return dict.rows
    .filter(function(row) { return row.applicable[categoryCol]; })
    .map(function(row) { return row.name; });
}

function getAllKnownFieldNames_(ss) {
  const dict = loadCharDict_(ss);
  const names = dict.rows.map(function(r) { return r.name; });
  WBSYNC_CONFIG.BASIC_CARD_FIELDS.forEach(function(f) {
    if (names.indexOf(f) < 0) names.push(f);
  });
  return names;
}

/**
 * Одноразовая установка: создать spreadsheet-справочник и записать id в Properties.
 * Запускать из редактора WBSyncLib после deploy.
 */
function setupCharDictSpreadsheetFromActive_() {
  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (!active) throw new Error('Нет active spreadsheet');
  PropertiesService.getScriptProperties().setProperty('CHAR_DICT_SPREADSHEET_ID', active.getId());
  Logger.log('CHAR_DICT_SPREADSHEET_ID = ' + active.getId());
}
