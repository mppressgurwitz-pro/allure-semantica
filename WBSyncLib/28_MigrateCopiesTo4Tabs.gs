/**
 * 28_MigrateCopiesTo4Tabs.gs — SKELETON (no runtime logic for top-level migration).
 * Lazy migration одной SKU-копии на 4-листную модель SEO (раздел 5 брифинга 2026-05-31).
 * Заменяет отменённый 26_MigrateCopiesTo4LK.gs (горизонтальная модель C–F).
 *
 * PRE-REQUISITES:
 * - Master spreadsheet 16OBo1Enr19SFOuLm2pNy_JagMFppNqXKsYlUbLw_8S0 MUST have
 *   7 template sheets injected: _Config, _Common, SEO_WB_Asmus, SEO_WB_Quantum,
 *   SEO_OZON_Asmus, SEO_OZON_Quantum, KeywordsRaw.
 *   Without this — ensureLayoutSheets_ has nothing to copy from. See ПРОМПТ G.
 * - Maша authorized WBSyncLib scopes in each copy before lazy migration.
 *
 * СТОП: не вызывать migrateCopyTo4Tabs до полной реализации. Не clasp push до ЧП-2bis.
 */

var MIGRATE_4TAB_SCHEMA_PREFIX_ = '4TAB_2026-';
var MIGRATE_4TAB_RESULTS_FOLDER_ID_ = '1gDUCk2a9h7z0zfNzAneXJkBtlupCYxy3';
var MASTER_SPREADSHEET_ID_4TAB_ = '16OBo1Enr19SFOuLm2pNy_JagMFppNqXKsYlUbLw_8S0';

var COMMON_FIELD_KEYS_4TAB_ = [
  'ТНВЭД', 'ИКПУ', 'НДС', 'Декларация о соответствии', 'СГР',
  'Высота упаковки', 'Ширина упаковки', 'Длина упаковки',
  'Высота предмета', 'Ширина предмета', 'Длина предмета',
  'Вес упаковки', 'Штрихкод', 'Состав / INCI'
];
// ВАЖНО: тот же список должен быть в CreateTemplate.gs::buildCommonSheet_::fields.
// TODO Phase 2: вынести в общую константу (WBLib/99_Constants.gs или _Config мастера).

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
 * Главная функция миграции одной копии. Вызывается из wrapper в bound-скрипте копии.
 * @param {Spreadsheet|null} ssOpt Active spreadsheet или null → getActiveSpreadsheet()
 * @return {void}
 */
function migrateCopyTo4Tabs(ssOpt) {
  // 1. var ss = ssOpt || SpreadsheetApp.getActiveSpreadsheet();
  // 2. if (isAlreadyMigrated4Tab_(ss)) {
  //      SpreadsheetApp.getUi().alert('Уже мигрирована', 'SCHEMA_VERSION уже 4TAB_…', OK);
  //      return;
  //    }
  // 3. snapshotAdviceSeoDraft_(ss);
  // 4. ensureLayoutSheets_(ss);
  // 5. setupGenderMap_(ss);  // дефект D5: без хардкода
  // 5.5. (reserved — gender map before legacy draft transfer)
  // 6. migrateLegacyDraftToSeoSheets_(ss);
  // 7. populateCommonSheet_(ss);
  // 8. setSchemaVersion_(ss, MIGRATE_4TAB_SCHEMA_PREFIX_ + '…');
  // 9. archiveLegacyDraft_(ss);
  // 10. SpreadsheetApp.getUi().alert('Миграция готова. Проверь листы SEO_*.');
  throw new Error('migrateCopyTo4Tabs: skeleton only — not implemented');
}

/**
 * Dry-run: отчёт без записи в spreadsheet.
 * @param {Spreadsheet|null} ssOpt
 * @return {Object} report { sheetsToCreate, sheetsToRename, rowsFromColC, commonFieldsFound }
 */
function migrateCopyTo4Tabs_dryRun(ssOpt) {
  var ss = ssOpt || SpreadsheetApp.getActiveSpreadsheet();
  if (isAlreadyMigrated4Tab_(ss)) {
    var msg = 'Уже мигрирована: SCHEMA_VERSION = ' + getSchemaVersion_(ss);
    SpreadsheetApp.getUi().alert(msg);
    return { alreadyMigrated: true, currentVersion: getSchemaVersion_(ss) };
  }
  // var report = {
  //   sheetsToCreate: LAYOUT_SHEET_NAMES_4TAB_.filter(function(n) { return !ss.getSheetByName(n); }),
  //   sheetsToRename: ss.getSheetByName('_Advice_SEO_Draft') ? ['_Advice_SEO_Draft → _DEPRECATED_…'] : [],
  //   rowsFromColC: countNonEmptyColCInLegacyDraft_(ss),
  //   commonFieldsFound: listCommonFieldsInLegacy_(ss)
  // };
  // SpreadsheetApp.getUi().alert(JSON.stringify(report, null, 2));
  // return report;
  throw new Error('migrateCopyTo4Tabs_dryRun: skeleton only — not implemented');
}

/**
 * Из мастера: dry-run отчёт по копиям в папке результатов. Без массовой миграции.
 * @return {Array<Array<string>>} rows для листа «Реестр SKU»: vendorCode | sheetId | schema_version | needs_migration | last_modified
 */
function reportPendingMigrations() {
  // var folder = DriveApp.getFolderById(MIGRATE_4TAB_RESULTS_FOLDER_ID_);
  // var files = folder.getFilesByType(MimeType.GOOGLE_SHEETS);
  // var rows = [['vendorCode', 'sheetId', 'schema_version', 'needs_migration', 'last_modified']];
  // while (files.hasNext()) {
  //   var file = files.next();
  //   var ss = SpreadsheetApp.open(file);
  //   var version = getSchemaVersion_(ss);
  //   rows.push([
  //     readVendorCodeFromCopy_(ss),
  //     ss.getId(),
  //     version || '',
  //     isAlreadyMigrated4Tab_(ss) ? 'no' : 'yes',
  //     file.getLastUpdated().toISOString()
  //   ]);
  // }
  // return rows;
  throw new Error('reportPendingMigrations: skeleton only — not implemented');
}

// --- helpers ---

/**
 * @param {Spreadsheet} ss
 * @return {string} ADVICE_SEO_SCHEMA_VERSION из _Config или ''
 */
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

/**
 * @param {Spreadsheet} ss
 * @param {string} version e.g. "4TAB_2026-06-01"
 */
function setSchemaVersion_(ss, version) {
  var cfg = ss.getSheetByName('_Config');
  if (!cfg) {
    throw new Error('setSchemaVersion_: _Config sheet missing. Run ensureLayoutSheets_ first.');
  }
  var lr = cfg.getLastRow();
  if (lr < 2) {
    cfg.appendRow(['ADVICE_SEO_SCHEMA_VERSION', version, 'Schema version of 4-tab layout']);
    return;
  }
  var data = cfg.getRange(2, 1, lr - 1, 2).getValues();
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][0]).trim() === 'ADVICE_SEO_SCHEMA_VERSION') {
      cfg.getRange(i + 2, 2).setValue(version);
      return;
    }
  }
  cfg.appendRow(['ADVICE_SEO_SCHEMA_VERSION', version, 'Schema version of 4-tab layout']);
}

/**
 * @param {Spreadsheet} ss
 * @return {boolean}
 */
function isAlreadyMigrated4Tab_(ss) {
  var v = getSchemaVersion_(ss);
  return !!(v && String(v).indexOf(MIGRATE_4TAB_SCHEMA_PREFIX_) === 0);
}

/**
 * @param {Spreadsheet} ss
 * @return {string} vendorCode из _Config.OUR_SKU или имени файла
 */
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
  var m = name.match(/Ср конк\s+—\s+.+?\s+([A-Z0-9]+)\s+\d+\s+\(арт\s+\d+\)/);
  return m ? m[1] : '';
}

/**
 * Бэкап _Advice_SEO_Draft → _Backup_Advice_SEO_Draft_<timestamp>
 * @param {Spreadsheet} ss
 */
function snapshotAdviceSeoDraft_(ss) {
  // var draft = ss.getSheetByName('_Advice_SEO_Draft');
  // if (!draft) return;
  // var stamp = Utilities.formatDate(new Date(), 'GMT+3', 'yyyy-MM-dd_HH-mm');
  // var backupName = '_Backup_Advice_SEO_Draft_' + stamp;
  // if (ss.getSheetByName(backupName)) return;  // anti-дубль для повторного запуска
  // draft.copyTo(ss).setName(backupName);
}

/**
 * Создаёт 7 листов из шаблона мастера, если отсутствуют.
 * @param {Spreadsheet} ss
 */
function ensureLayoutSheets_(ss) {
  // TODO: источник шаблона — MASTER_SPREADSHEET_ID_4TAB_
  // for each name in LAYOUT_SHEET_NAMES_4TAB_: copy sheet from master if missing
  // _Config → hideSheet() в копии (в мастере _Config видим)
  // SEO_* → apply4ZoneLayout_(ss, sheetName, cabinetMeta)
}

/**
 * Перенос legacy _Advice_SEO_Draft → SEO_WB_Asmus (только этот кабинет).
 * Правила переноса:
 *   - col C (Новое значение) → SEO_WB_Asmus зона 3 col B (Новое значение).
 *     Колонка "Источник" в зоне 3 = 'legacy:C'.
 *   - col B legacy ИГНОРИРУЕТСЯ — это снимок WB давно устаревший. Свежий
 *     PULL Маша делает уже в новой структуре, зона 2 заполнится тогда.
 *   - SEO_WB_Quantum, SEO_OZON_Asmus, SEO_OZON_Quantum остаются ПУСТЫМИ —
 *     Маша заполнит вручную или через отдельный импорт.
 * @param {Spreadsheet} ss
 */
function migrateLegacyDraftToSeoSheets_(ss) {
  // parse _Advice_SEO_Draft tech block + SEO block
  // map field names → rows in SEO_WB_Asmus zone 3 (col B «Новое значение», col C «Источник» = 'legacy:C')
  // GENDER_MAP_v1 в _Config — не хардкодить Асмус=ж (дефект D5)
}

/**
 * Заполняет лист _Common из legacy _Advice_SEO_Draft.
 * Приоритет значений:
 *   1. col C (Новое значение) — если непусто, это финальное значение Маши;
 *   2. col B (Текущее в WB) — fallback;
 *   3. '' — если оба пусты.
 * Записывает в _Common: Поле | Значение | Источник | Примечания.
 * Поле "Источник" = 'legacy:C' или 'legacy:B' или ''.
 * @param {Spreadsheet} ss
 */
function populateCommonSheet_(ss) {
  // read legacy _Advice_SEO_Draft via findFieldRowInLegacyDraft_ + COMMON_FIELD_KEYS_4TAB_
  // write pairs to _Common: Поле | Значение | Источник | Примечания
}

/**
 * Спрашивает Машу через Ui.prompt пол для каждого из 4 ЛК и записывает
 * в _Config.GENDER_MAP_v1 как JSON. Вызывается из migrateCopyTo4Tabs после
 * ensureLayoutSheets_ и до migrateLegacyDraftToSeoSheets_.
 *
 * Запрещено хардкодить дефолты (Асмус=ж/Quantum=м) — это дефект D5.
 * @param {Spreadsheet} ss
 */
function setupGenderMap_(ss) {
  // var ui = SpreadsheetApp.getUi();
  // var labels = ['WB Асмус', 'WB Quantum', 'OZON Асмус', 'OZON Quantum'];
  // var keys = ['wb_asmus', 'wb_quantum', 'ozon_asmus', 'ozon_quantum'];
  // var map = {};
  // for (var i = 0; i < 4; i++) {
  //   var resp = ui.prompt(labels[i], 'Пол для ' + labels[i] + ': введи "ж", "м" или "у" (унисекс)', ui.ButtonSet.OK_CANCEL);
  //   if (resp.getSelectedButton() !== ui.Button.OK) {
  //     throw new Error('Маппинг пола отменён пользователем.');
  //   }
  //   var v = String(resp.getResponseText() || '').trim().toLowerCase();
  //   if (['ж','м','у'].indexOf(v) < 0) {
  //     throw new Error('Недопустимое значение пола для ' + labels[i] + ': "' + v + '". Допустимо: ж, м, у.');
  //   }
  //   map[keys[i]] = v;
  // }
  // upsertConfigParamOnSheet_(ss.getSheetByName('_Config'), 'GENDER_MAP_v1', JSON.stringify(map), 'JSON пола по 4 ЛК');
  throw new Error('setupGenderMap_: skeleton only');
}

/**
 * Ищет в legacy _Advice_SEO_Draft строку по имени поля в col A.
 * @param {GoogleAppsScript.Spreadsheet.Sheet} draftSheet
 * @param {string} fieldName
 * @return {Object|null} { row, valueB, valueC } или null если не нашлось.
 */
function findFieldRowInLegacyDraft_(draftSheet, fieldName) {
  // var data = draftSheet.getRange(1, 1, draftSheet.getLastRow(), 3).getValues();
  // for (var i = 0; i < data.length; i++) {
  //   if (String(data[i][0]).trim() === fieldName) {
  //     return { row: i + 1, valueB: data[i][1], valueC: data[i][2] };
  //   }
  // }
  // return null;
  throw new Error('findFieldRowInLegacyDraft_: skeleton only');
}

/**
 * rename _Advice_SEO_Draft → _DEPRECATED_Advice_SEO_Draft_YYYY-MM-DD
 * @param {Spreadsheet} ss
 */
function archiveLegacyDraft_(ss) {
  // var draft = ss.getSheetByName('_Advice_SEO_Draft');
  // if (!draft) return;
  // draft.setName('_DEPRECATED_Advice_SEO_Draft_' + Utilities.formatDate(new Date(), 'Europe/Moscow', 'yyyy-MM-dd'));
}
