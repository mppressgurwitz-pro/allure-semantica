/**
 * 29_SkuRegistry.gs — лист «Реестр SKU» в мастер-таблице (ЧП-2bis H1).
 */

var SKU_REGISTRY_SHEET_NAME_ = 'Реестр SKU';
var SKU_REGISTRY_HEADERS_ = [
  'vendorCode',
  'product_name',
  'category_wb',
  'category_ozon',
  'nmID_wb_asmus',
  'nmID_wb_quantum',
  'nmID_ozon_asmus',
  'nmID_ozon_quantum',
  'sheet_id',
  'sheet_url',
  'gender_map_json',
  'created_at',
  'last_sync_wb_asmus',
  'last_sync_wb_quantum',
  'last_sync_ozon_asmus',
  'last_sync_ozon_quantum',
  'status'
];

var SKU_REGISTRY_COPIES_FOLDER_ID_ = '1gDUCk2a9h7z0zfNzAneXJkBtlupCYxy3';

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @return {GoogleAppsScript.Spreadsheet.Sheet}
 */
function ensureSkuRegistrySheet(ss) {
  var masterSs = ss || getTargetSpreadsheet_();
  var sh = masterSs.getSheetByName(SKU_REGISTRY_SHEET_NAME_);
  if (!sh) {
    sh = masterSs.insertSheet(SKU_REGISTRY_SHEET_NAME_);
    sh.getRange(1, 1, 1, SKU_REGISTRY_HEADERS_.length)
      .setValues([SKU_REGISTRY_HEADERS_])
      .setFontWeight('bold')
      .setBackground('#d9ead3');
    sh.setFrozenRows(1);
    Logger.log('ensureSkuRegistrySheet: created ' + SKU_REGISTRY_SHEET_NAME_);
  }
  return sh;
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {Object} rowData keys from SKU_REGISTRY_HEADERS_
 */
function appendSkuRegistryRow(ss, rowData) {
  var masterSs = ss || getTargetSpreadsheet_();
  var vendorCode = String(rowData.vendorCode || '').trim();
  if (!vendorCode) {
    throw new Error('appendSkuRegistryRow: vendorCode обязателен');
  }
  if (findSkuRegistryRowByVendorCode_(masterSs, vendorCode)) {
    throw new Error('Реестр SKU: vendorCode «' + vendorCode + '» уже существует');
  }
  var sh = ensureSkuRegistrySheet(masterSs);
  sh.appendRow(skuRegistryRowToArray_(rowData));
  Logger.log('appendSkuRegistryRow: ' + vendorCode);
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {Object} rowData
 */
function upsertSkuRegistryRow(ss, rowData) {
  var masterSs = ss || getTargetSpreadsheet_();
  var vendorCode = String(rowData.vendorCode || '').trim();
  if (!vendorCode) throw new Error('upsertSkuRegistryRow: vendorCode обязателен');

  var found = findSkuRegistryRowByVendorCode_(masterSs, vendorCode);
  var sh = ensureSkuRegistrySheet(masterSs);
  if (!found) {
    sh.appendRow(skuRegistryRowToArray_(rowData));
    Logger.log('upsertSkuRegistryRow: appended ' + vendorCode);
    return;
  }
  SKU_REGISTRY_HEADERS_.forEach(function(h, idx) {
    if (Object.prototype.hasOwnProperty.call(rowData, h)) {
      sh.getRange(found.rowIndex, idx + 1).setValue(rowData[h]);
    }
  });
  Logger.log('upsertSkuRegistryRow: updated row ' + found.rowIndex + ' ' + vendorCode);
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {string} vendorCode
 * @return {{rowIndex: number, data: Object}|null}
 */
function findSkuRegistryRowByVendorCode_(ss, vendorCode) {
  var sh = ss.getSheetByName(SKU_REGISTRY_SHEET_NAME_);
  if (!sh || sh.getLastRow() < 2) return null;
  var code = String(vendorCode || '').trim();
  var lr = sh.getLastRow();
  var data = sh.getRange(2, 1, lr - 1, SKU_REGISTRY_HEADERS_.length).getValues();
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][0] || '').trim() === code) {
      return { rowIndex: i + 2, data: skuRegistryArrayToObject_(data[i]) };
    }
  }
  return null;
}

function skuRegistryRowToArray_(rowData) {
  return SKU_REGISTRY_HEADERS_.map(function(h) {
    var v = rowData[h];
    if (v === undefined || v === null) return '';
    if (v instanceof Date) return v.toISOString();
    return v;
  });
}

function skuRegistryArrayToObject_(row) {
  var o = {};
  SKU_REGISTRY_HEADERS_.forEach(function(h, idx) {
    o[h] = row[idx];
  });
  return o;
}

function readVendorCodeFromCopySpreadsheet_(copySs) {
  var cfg = copySs.getSheetByName('_Config');
  if (cfg && cfg.getLastRow() >= 2) {
    var data = cfg.getRange(2, 1, cfg.getLastRow() - 1, 2).getValues();
    for (var i = 0; i < data.length; i++) {
      if (String(data[i][0]).trim() === 'OUR_SKU') {
        var v = String(data[i][1] || '').trim();
        if (v) return v;
      }
    }
  }
  var name = copySs.getName();
  var artMatch = name.match(/\(арт\s+([^)]+)\)/i);
  if (artMatch) return artMatch[1].trim();
  return '';
}

function readConfigValueFromCopy_(copySs, key) {
  var cfg = copySs.getSheetByName('_Config');
  if (!cfg || cfg.getLastRow() < 2) return '';
  var data = cfg.getRange(2, 1, cfg.getLastRow() - 1, 2).getValues();
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][0]).trim() === key) {
      return String(data[i][1] || '').trim();
    }
  }
  return '';
}

function parseProductNameFromCopyFileName_(name) {
  var m = name.match(/^Ср конк\s+—\s+(.+?)\s+[A-Z0-9]+\s+/i);
  if (m) return m[1].trim();
  m = name.match(/^Ср конк\s+—\s+(.+?)\s+\(арт/i);
  if (m) return m[1].trim();
  return name;
}

function backfillSkuRegistryDialog() {
  var ui = SpreadsheetApp.getUi();
  var ans = ui.alert(
    'Заполнить Реестр SKU из папки',
    'Просканировать папку «Результаты по семантике» и добавить отсутствующие копии?\n\nYES = записать, NO = только лог (dry-run).',
    ui.ButtonSet.YES_NO_CANCEL
  );
  if (ans === ui.Button.CANCEL) return;
  var write = ans === ui.Button.YES;
  var summary = backfillSkuRegistryFromFolder_(write);
  Logger.log(summary);
  ui.alert('Backfill реестра SKU', summary, ui.ButtonSet.OK);
}

/**
 * @param {boolean} write
 * @return {string}
 */
function backfillSkuRegistryFromFolder_(write) {
  var masterSs = getTargetSpreadsheet_();
  ensureSkuRegistrySheet(masterSs);
  var folder = DriveApp.getFolderById(SKU_REGISTRY_COPIES_FOLDER_ID_);
  var files = folder.getFilesByType(MimeType.GOOGLE_SHEETS);
  var lines = [];
  var added = 0;
  var skipped = 0;

  while (files.hasNext()) {
    var f = files.next();
    var name = f.getName();
    if (name.indexOf('Ср конк') < 0 && name.indexOf('Сравнение конкурентов') < 0) continue;

    var copySs;
    try {
      copySs = SpreadsheetApp.open(f);
    } catch (e) {
      lines.push('ERR open ' + name + ': ' + e.message);
      continue;
    }

    var vendorCode = readVendorCodeFromCopySpreadsheet_(copySs);
    if (!vendorCode) {
      lines.push('SKIP no vendorCode: ' + name);
      continue;
    }

    if (findSkuRegistryRowByVendorCode_(masterSs, vendorCode)) {
      skipped++;
      continue;
    }

    var rowData = {
      vendorCode: vendorCode,
      product_name: readConfigValueFromCopy_(copySs, 'OUR_PRODUCT_NAME') ||
        parseProductNameFromCopyFileName_(name),
      category_wb: readConfigValueFromCopy_(copySs, 'CATEGORY_WB'),
      category_ozon: readConfigValueFromCopy_(copySs, 'OZON_TEMPLATE_CATEGORY'),
      nmID_wb_asmus: readConfigValueFromCopy_(copySs, 'NMID_WB_ASMUS'),
      nmID_wb_quantum: readConfigValueFromCopy_(copySs, 'NMID_WB_QUANTUM'),
      nmID_ozon_asmus: readConfigValueFromCopy_(copySs, 'NMID_OZON_ASMUS'),
      nmID_ozon_quantum: readConfigValueFromCopy_(copySs, 'NMID_OZON_QUANTUM'),
      sheet_id: f.getId(),
      sheet_url: f.getUrl(),
      gender_map_json: readConfigValueFromCopy_(copySs, 'GENDER_MAP_v1'),
      created_at: f.getDateCreated().toISOString(),
      status: 'legacy'
    };

    lines.push('+ ' + vendorCode + ' | ' + name);
    if (write) {
      appendSkuRegistryRow(masterSs, rowData);
      added++;
    } else {
      added++;
    }
  }

  return 'Новых: ' + added + ', уже в реестре: ' + skipped +
    (write ? ' (записано)' : ' (dry-run)') +
    '\n\n' + lines.slice(0, 25).join('\n') +
    (lines.length > 25 ? '\n... ещё ' + (lines.length - 25) : '');
}

/** @deprecated use upsertSkuRegistryRow — sync hook для WBSyncLib */
function updateSkuRegistrySync_(vendorCode, cabinet, nmId) {
  var patch = { vendorCode: vendorCode, status: 'synced' };
  if (cabinet === 'Asmus') {
    patch.nmID_wb_asmus = nmId;
    patch.last_sync_wb_asmus = new Date().toISOString();
  } else if (cabinet === 'Quantum') {
    patch.nmID_wb_quantum = nmId;
    patch.last_sync_wb_quantum = new Date().toISOString();
  }
  upsertSkuRegistryRow(getTargetSpreadsheet_(), patch);
}
