/**
 * 28_MigrateCopiesTo4Tabs.gs — lazy migration одной SKU-копии на 4-листную модель SEO (ЧП-2bis H3).
 */

var MIGRATE_4TAB_SCHEMA_PREFIX_ = '4TAB_2026-';
var MIGRATE_4TAB_RESULTS_FOLDER_ID_ = '1gDUCk2a9h7z0zfNzAneXJkBtlupCYxy3';
var MASTER_SPREADSHEET_ID_4TAB_ = '16OBo1Enr19SFOuLm2pNy_JagMFppNqXKsYlUbLw_8S0';

var LEGACY_DRAFT_SHEET_ = '_Advice_SEO_Draft';
var TECH_START_MARKER_4TAB_ = '▼ ТЕХНИЧЕСКИЙ БЛОК';
var TECH_END_MARKER_4TAB_ = '▲ Конец технического блока';
var SEO_PUSH_ZONE_START_ROW_ = 54;

var COMMON_FIELD_KEYS_4TAB_ = [
  'ТНВЭД', 'ИКПУ', 'НДС', 'Декларация о соответствии', 'СГР',
  'Высота упаковки', 'Ширина упаковки', 'Длина упаковки',
  'Высота предмета', 'Ширина предмета', 'Длина предмета',
  'Вес упаковки', 'Штрихкод', 'Состав / INCI'
];

var LAYOUT_SHEET_NAMES_4TAB_ = [
  '_Config',
  '_Common',
  'SEO_WB_Asmus',
  'SEO_WB_Quantum',
  'SEO_OZON_Asmus',
  'SEO_OZON_Quantum',
  'KeywordsRaw'
];

/**
 * @param {Spreadsheet|null} ssOpt
 */
function migrateCopyTo4Tabs(ssOpt) {
  var ss = ssOpt || SpreadsheetApp.getActiveSpreadsheet();
  Logger.log('migrateCopyTo4Tabs: start ' + ss.getId());

  if (isAlreadyMigrated4Tab_(ss)) {
    SpreadsheetApp.getUi().alert(
      'Уже мигрирована',
      'SCHEMA_VERSION уже ' + getSchemaVersion_(ss),
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    return;
  }

  snapshotAdviceSeoDraft_(ss);
  ensureLayoutSheets_(ss);
  setupGenderMap_(ss);
  migrateLegacyDraftToSeoSheets_(ss);
  populateCommonSheet_(ss);

  var version = MIGRATE_4TAB_SCHEMA_PREFIX_ +
    Utilities.formatDate(new Date(), 'GMT+3', 'yyyy-MM-dd');
  setSchemaVersion_(ss, version);
  archiveLegacyDraft_(ss);

  var summary = 'Миграция завершена: ' + version + ' | ' + ss.getName();
  Logger.log(summary);
  SpreadsheetApp.getUi().alert(
    'Миграция завершена',
    'Проверь листы SEO_*.\nСтарый _Advice_SEO_Draft в архиве _DEPRECATED_…\n\n' + version,
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

/**
 * @param {Spreadsheet|null} ssOpt
 * @return {Object}
 */
function migrateCopyTo4Tabs_dryRun(ssOpt) {
  var ss = ssOpt || SpreadsheetApp.getActiveSpreadsheet();
  if (isAlreadyMigrated4Tab_(ss)) {
    var msg = 'Уже мигрирована: SCHEMA_VERSION = ' + getSchemaVersion_(ss);
    SpreadsheetApp.getUi().alert(msg);
    return { alreadyMigrated: true, currentVersion: getSchemaVersion_(ss) };
  }

  var missing = LAYOUT_SHEET_NAMES_4TAB_.filter(function(n) {
    return !ss.getSheetByName(n);
  });
  var report = {
    sheetsToCreate: missing,
    hasLegacyDraft: !!ss.getSheetByName(LEGACY_DRAFT_SHEET_),
    commonFieldsFound: listCommonFieldsInLegacy_(ss),
    vendorCode: readVendorCodeFromCopy_(ss)
  };
  Logger.log('migrateCopyTo4Tabs_dryRun: ' + JSON.stringify(report));
  SpreadsheetApp.getUi().alert('Dry-run', JSON.stringify(report, null, 2), SpreadsheetApp.getUi().ButtonSet.OK);
  return report;
}

/**
 * @return {Array<Array<string>>}
 */
function reportPendingMigrations() {
  var folder = DriveApp.getFolderById(MIGRATE_4TAB_RESULTS_FOLDER_ID_);
  var files = folder.getFilesByType(MimeType.GOOGLE_SHEETS);
  var rows = [['vendorCode', 'sheetId', 'schema_version', 'needs_migration', 'last_modified']];

  while (files.hasNext()) {
    var file = files.next();
    var name = file.getName();
    if (name.indexOf('Ср конк') < 0 && name.indexOf('Сравнение конкурентов') < 0) continue;
    var ss = SpreadsheetApp.open(file);
    var version = getSchemaVersion_(ss);
    rows.push([
      readVendorCodeFromCopy_(ss),
      ss.getId(),
      version || '',
      isAlreadyMigrated4Tab_(ss) ? 'no' : 'yes',
      file.getLastUpdated().toISOString()
    ]);
  }
  Logger.log('reportPendingMigrations: ' + (rows.length - 1) + ' copies');
  return rows;
}

// --- schema / config helpers ---

function getSchemaVersion_(ss) {
  var cfg = ss.getSheetByName('_Config');
  if (!cfg || cfg.getLastRow() < 2) return '';
  var data = cfg.getRange(2, 1, cfg.getLastRow() - 1, 2).getValues();
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][0]).trim() === 'ADVICE_SEO_SCHEMA_VERSION') {
      return String(data[i][1] || '').trim();
    }
  }
  return '';
}

function setSchemaVersion_(ss, version) {
  var cfg = ss.getSheetByName('_Config');
  if (!cfg) {
    throw new Error('setSchemaVersion_: _Config sheet missing. Run ensureLayoutSheets_ first.');
  }
  upsertConfigParamOnSheet_4tab_(cfg, 'ADVICE_SEO_SCHEMA_VERSION', version, 'Schema version of 4-tab layout');
}

function isAlreadyMigrated4Tab_(ss) {
  var v = getSchemaVersion_(ss);
  return !!(v && String(v).indexOf(MIGRATE_4TAB_SCHEMA_PREFIX_) === 0);
}

function readVendorCodeFromCopy_(ss) {
  var cfg = ss.getSheetByName('_Config');
  if (cfg && cfg.getLastRow() >= 2) {
    var data = cfg.getRange(2, 1, cfg.getLastRow() - 1, 2).getValues();
    for (var i = 0; i < data.length; i++) {
      if (String(data[i][0]).trim() === 'OUR_SKU') {
        var v = String(data[i][1] || '').trim();
        if (v) return v;
      }
    }
  }
  var name = ss.getName();
  var m = name.match(/\(арт\s+([^)]+)\)/i);
  return m ? m[1].trim() : '';
}

function upsertConfigParamOnSheet_4tab_(cfgSh, key, value, description) {
  var lr = cfgSh.getLastRow();
  if (lr < 2) {
    cfgSh.appendRow([key, value, description]);
    return;
  }
  var data = cfgSh.getRange(2, 1, lr - 1, 2).getValues();
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][0]).trim() === key) {
      cfgSh.getRange(i + 2, 2).setValue(value);
      return;
    }
  }
  cfgSh.appendRow([key, value, description]);
}

// --- migration steps ---

function snapshotAdviceSeoDraft_(ss) {
  var draft = ss.getSheetByName(LEGACY_DRAFT_SHEET_);
  if (!draft) {
    Logger.log('snapshotAdviceSeoDraft_: no legacy draft');
    return;
  }
  var stamp = Utilities.formatDate(new Date(), 'GMT+3', 'yyyy-MM-dd_HH-mm');
  var backupName = '_Backup_Advice_SEO_Draft_' + stamp;
  if (ss.getSheetByName(backupName)) {
    Logger.log('snapshotAdviceSeoDraft_: backup exists, skip');
    return;
  }
  draft.copyTo(ss).setName(backupName);
  Logger.log('snapshotAdviceSeoDraft_: ' + backupName);
}

function ensureLayoutSheets_(ss) {
  var master = SpreadsheetApp.openById(MASTER_SPREADSHEET_ID_4TAB_);
  LAYOUT_SHEET_NAMES_4TAB_.forEach(function(name) {
    if (ss.getSheetByName(name)) return;
    var src = master.getSheetByName(name);
    if (!src) {
      throw new Error('ensureLayoutSheets_: в мастере нет листа «' + name + '»');
    }
    src.copyTo(ss).setName(name);
    Logger.log('ensureLayoutSheets_: copied ' + name);
  });
  var cfg = ss.getSheetByName('_Config');
  if (cfg) cfg.hideSheet();
}

function setupGenderMap_(ss) {
  var ui = SpreadsheetApp.getUi();
  var labels = ['WB Асмус', 'WB Quantum', 'OZON Асмус', 'OZON Quantum'];
  var keys = ['wb_asmus', 'wb_quantum', 'ozon_asmus', 'ozon_quantum'];
  var map = {};

  for (var i = 0; i < 4; i++) {
    var resp = ui.prompt(
      labels[i],
      'Пол для ' + labels[i] + ': введи «ж», «м» или «у» (унисекс). Пусто = пропустить.',
      ui.ButtonSet.OK_CANCEL
    );
    if (resp.getSelectedButton() !== ui.Button.OK) {
      throw new Error('Маппинг пола отменён пользователем.');
    }
    var v = String(resp.getResponseText() || '').trim().toLowerCase();
    if (!v) {
      map[keys[i]] = '';
      continue;
    }
    if (['ж', 'м', 'у'].indexOf(v) < 0) {
      throw new Error('Недопустимое значение пола для ' + labels[i] + ': «' + v + '». Допустимо: ж, м, у.');
    }
    map[keys[i]] = v;
  }

  var cfg = ss.getSheetByName('_Config');
  if (!cfg) throw new Error('setupGenderMap_: нет _Config');
  upsertConfigParamOnSheet_4tab_(cfg, 'GENDER_MAP_v1', JSON.stringify(map), 'JSON пола по 4 ЛК');
  Logger.log('setupGenderMap_: ' + JSON.stringify(map));
}

function migrateLegacyDraftToSeoSheets_(ss) {
  var draft = ss.getSheetByName(LEGACY_DRAFT_SHEET_);
  var seoSh = ss.getSheetByName('SEO_WB_Asmus');
  if (!draft || !seoSh) {
    Logger.log('migrateLegacyDraftToSeoSheets_: skip (no draft or SEO_WB_Asmus)');
    return;
  }

  var all = draft.getDataRange().getValues();
  var bounds = findLegacyTechBlockBounds_(all);
  var migrated = 0;

  for (var i = 0; i < all.length; i++) {
    if (bounds.start >= 0 && bounds.end >= 0 && i >= bounds.start && i <= bounds.end) {
      continue;
    }
    var field = String(all[i][0] || '').trim();
    if (!field || isSkippableDraftFieldRow_(field)) continue;
    if (COMMON_FIELD_KEYS_4TAB_.indexOf(field) >= 0) continue;

    var valueC = String(all[i][2] || '').trim();
    if (!valueC) continue;

    upsertSeoPushFieldRow_(seoSh, field, valueC);
    migrated++;
  }
  Logger.log('migrateLegacyDraftToSeoSheets_: migrated rows=' + migrated);
}

function populateCommonSheet_(ss) {
  var draft = ss.getSheetByName(LEGACY_DRAFT_SHEET_);
  var common = ss.getSheetByName('_Common');
  if (!draft || !common) {
    Logger.log('populateCommonSheet_: skip');
    return;
  }

  var filled = 0;
  COMMON_FIELD_KEYS_4TAB_.forEach(function(fieldName) {
    var found = findFieldRowInLegacyDraft_(draft, fieldName);
    if (!found) return;

    var value = String(found.valueC || '').trim();
    var source = 'legacy:C';
    if (!value) {
      value = String(found.valueB || '').trim();
      source = value ? 'legacy:B' : '';
    }
    if (!value) return;

    writeCommonRow_(common, fieldName, value, source);
    filled++;
  });
  Logger.log('populateCommonSheet_: fields=' + filled);
}

function archiveLegacyDraft_(ss) {
  var draft = ss.getSheetByName(LEGACY_DRAFT_SHEET_);
  if (!draft) return;
  var depName = '_DEPRECATED_Advice_SEO_Draft_' +
    Utilities.formatDate(new Date(), 'GMT+3', 'yyyy-MM-dd');
  if (ss.getSheetByName(depName)) {
    depName += '_' + Utilities.formatDate(new Date(), 'GMT+3', 'HHmmss');
  }
  draft.setName(depName);
  Logger.log('archiveLegacyDraft_: ' + depName);
}

// --- field / row helpers ---

function findFieldRowInLegacyDraft_(draftSheet, fieldName) {
  var lr = draftSheet.getLastRow();
  if (lr < 1) return null;
  var data = draftSheet.getRange(1, 1, lr, 3).getValues();
  var target = String(fieldName || '').trim();
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][0] || '').trim() === target) {
      return { row: i + 1, valueB: data[i][1], valueC: data[i][2] };
    }
  }
  return null;
}

function findFieldRowInCommonSheet_(commonSheet, fieldName) {
  var lr = commonSheet.getLastRow();
  if (lr < 2) return -1;
  var data = commonSheet.getRange(2, 1, lr - 1, 1).getValues();
  var target = String(fieldName || '').trim();
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][0] || '').trim() === target) return i + 2;
  }
  return -1;
}

function writeCommonRow_(commonSheet, fieldName, value, source) {
  var row = findFieldRowInCommonSheet_(commonSheet, fieldName);
  if (row < 0) {
    commonSheet.appendRow([fieldName, value, source, '']);
    return;
  }
  commonSheet.getRange(row, 2).setValue(value);
  commonSheet.getRange(row, 3).setValue(source);
}

function findLegacyTechBlockBounds_(all) {
  var start = -1;
  var end = -1;
  for (var i = 0; i < all.length; i++) {
    var cell = String(all[i][0] || '');
    if (start < 0 && cell.indexOf(TECH_START_MARKER_4TAB_) >= 0) start = i;
    if (cell.indexOf(TECH_END_MARKER_4TAB_) >= 0) end = i;
  }
  return { start: start, end: end };
}

function isSkippableDraftFieldRow_(field) {
  if (!field) return true;
  if (field.indexOf('▼') === 0 || field.indexOf('▲') === 0) return true;
  if (field === 'Поле' || field === 'Новое значение' || field === 'Текущее в WB') return true;
  if (field === 'Источник' || field === 'Валидация') return true;
  return false;
}

function upsertSeoPushFieldRow_(seoSh, fieldName, value) {
  var startRow = SEO_PUSH_ZONE_START_ROW_;
  var lastRow = Math.max(seoSh.getLastRow(), startRow);
  var numRows = lastRow - startRow + 1;
  var colA = seoSh.getRange(startRow, 1, numRows, 1).getValues();

  for (var j = 0; j < colA.length; j++) {
    if (String(colA[j][0] || '').trim() === fieldName) {
      seoSh.getRange(startRow + j, 2).setValue(value);
      seoSh.getRange(startRow + j, 3).setValue('legacy:C');
      return;
    }
  }

  var appendRow = startRow + colA.length;
  for (var k = 0; k < colA.length; k++) {
    if (!String(colA[k][0] || '').trim()) {
      appendRow = startRow + k;
      break;
    }
  }
  seoSh.getRange(appendRow, 1, 1, 3).setValues([[fieldName, value, 'legacy:C']]);
}

function listCommonFieldsInLegacy_(ss) {
  var draft = ss.getSheetByName(LEGACY_DRAFT_SHEET_);
  if (!draft) return [];
  return COMMON_FIELD_KEYS_4TAB_.filter(function(f) {
    return !!findFieldRowInLegacyDraft_(draft, f);
  });
}
