/**
 * 28_MigrateCopiesTo4Tabs.gs — SKELETON (no runtime logic).
 * Lazy migration одной SKU-копии на 4-листную модель SEO (раздел 5 брифинга 2026-05-31).
 * Заменяет отменённый 26_MigrateCopiesTo4LK.gs (горизонтальная модель C–F).
 *
 * СТОП: не вызывать до реализации. Не clasp push до ЧП-3/ЧП-5.
 */

var MIGRATE_4TAB_SCHEMA_PREFIX_ = '4TAB_2026-';
var MIGRATE_4TAB_RESULTS_FOLDER_ID_ = '1gDUCk2a9h7z0zfNzAneXJkBtlupCYxy3';

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
  // 5. migrateLegacyDraftToSeoSheets_(ss);
  // 6. populateCommonSheet_(ss);
  // 7. setSchemaVersion_(ss, MIGRATE_4TAB_SCHEMA_PREFIX_ + '…');
  // 8. archiveLegacyDraft_(ss);
  // 9. SpreadsheetApp.getUi().alert('Миграция готова. Проверь листы SEO_*.');
  throw new Error('migrateCopyTo4Tabs: skeleton only — not implemented');
}

/**
 * Dry-run: отчёт без записи в spreadsheet.
 * @param {Spreadsheet|null} ssOpt
 * @return {Object} report { sheetsToCreate, sheetsToRename, rowsFromColC, commonFieldsFound }
 */
function migrateCopyTo4Tabs_dryRun(ssOpt) {
  // var ss = ssOpt || SpreadsheetApp.getActiveSpreadsheet();
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
  //     readVendorCodeFromCopy_(ss),  // TODO: источник vendorCode — _Config или имя файла?
  //     ss.getId(),
  //     version || '',
  //     isAlreadyMigrated4Tab_(ss) ? 'no' : 'yes',
  //     file.getLastUpdated().toISOString()
  //   ]);
  // }
  // return rows;
  throw new Error('reportPendingMigrations: skeleton only — not implemented');
}

// --- helpers (skeleton) ---

/**
 * @param {Spreadsheet} ss
 * @return {string} ADVICE_SEO_SCHEMA_VERSION из _Config или ''
 */
function getSchemaVersion_(ss) {
  // read _Config key ADVICE_SEO_SCHEMA_VERSION
  // TODO: формат key|value|description — см. мастер-шаблон _Config
  return '';
}

/**
 * @param {Spreadsheet} ss
 * @param {string} version e.g. "4TAB_2026-06-01"
 */
function setSchemaVersion_(ss, version) {
  // upsert _Config ADVICE_SEO_SCHEMA_VERSION
  // TODO: создать _Config если отсутствует (ensureLayoutSheets_ должен был)
}

/**
 * @param {Spreadsheet} ss
 * @return {boolean}
 */
function isAlreadyMigrated4Tab_(ss) {
  // var v = getSchemaVersion_(ss);
  // return v && String(v).indexOf(MIGRATE_4TAB_SCHEMA_PREFIX_) === 0;
  return false;
}

/**
 * Бэкап _Advice_SEO_Draft → _Backup_Advice_SEO_Draft_<timestamp>
 * @param {Spreadsheet} ss
 */
function snapshotAdviceSeoDraft_(ss) {
  // var draft = ss.getSheetByName('_Advice_SEO_Draft');
  // if (!draft) return;
  // draft.copyTo(ss).setName('_Backup_Advice_SEO_Draft_' + Utilities.formatDate(new Date(), 'Europe/Moscow', 'yyyy-MM-dd_HHmm'));
}

/**
 * Создаёт 7 листов из шаблона мастера, если отсутствуют.
 * @param {Spreadsheet} ss
 */
function ensureLayoutSheets_(ss) {
  // TODO: источник шаблона — мастер 16OBo1En… или локальный Template SS после промпта C
  // for each name in LAYOUT_SHEET_NAMES_4TAB_: copy sheet from template if missing
  // _Config → hideSheet()
  // SEO_* → apply4ZoneLayout_(ss, sheetName, cabinetMeta)
}

/**
 * Перенос legacy: колонка C «Новое значение» → SEO_WB_Asmus зона 3 (PUSH-черновик).
 * @param {Spreadsheet} ss
 */
function migrateLegacyDraftToSeoSheets_(ss) {
  // parse _Advice_SEO_Draft tech block + SEO block
  // map field names → rows in SEO_WB_Asmus zone 3 (col B «Новое значение», col C «Источник» = 'legacy:C')
  // TODO: Quantum/Ozon листы остаются пустыми — Маша заполнит вручную или отдельный импорт
  // TODO: GENDER_MAP_v1 в _Config — не хардкодить Асмус=ж (дефект D5)
}

/**
 * ТНВЭД, габариты, баркод, INCI → _Common.
 * @param {Spreadsheet} ss
 */
function populateCommonSheet_(ss) {
  // read legacy _Advice_SEO_Draft col B (текущее) + col C (новое) для COMMON_FIELD_KEYS_
  // write pairs to _Common: Поле | Значение | Источник | Примечания
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
