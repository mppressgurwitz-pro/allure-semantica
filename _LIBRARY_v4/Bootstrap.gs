/**
 * Bootstrap.gs — единственный код в копии-под-SKU.
 * Вся логика живёт в библиотеке WBLib.
 *
 * УСТАНОВКА В КАЖДОЙ КОПИИ:
 * 1. Расширения → Apps Script → удали ВСЕ существующие .gs и .html файлы.
 * 2. Слева ➕ → Скрипт → имя Bootstrap → вставь этот код.
 * 3. Слева 📚 Libraries → ➕ → вставь Script ID библиотеки → версия (или Head)
 *    → Identifier ОБЯЗАТЕЛЬНО "WBLib" → Добавить.
 * 4. Ctrl+S, перезагрузи таблицу.
 *
 * Почему так. В Apps Script функции, на которые ссылаются:
 *   - .addItem('Имя', 'handlerName')  ← резолвятся в bound (этой) копии
 *   - google.script.run.X из HTML      ← тоже в bound
 *   - триггеры по имени                ← тоже в bound
 * Поэтому здесь — только тонкие обёртки, которые делегируют в WBLib.
 */

// === Точка входа ===
function onOpen(e) {
  try {
    WBLib.bootstrapBuildMenu(SpreadsheetApp.getUi());
  } catch (err) {
    SpreadsheetApp.getUi()
      .createMenu('⚠ WBLib не подключена')
      .addItem('Что делать?', 'libraryMissingHelp_')
      .addToUi();
  }
}

function libraryMissingHelp_() {
  SpreadsheetApp.getUi().alert(
    'Библиотека WBLib не подключена',
    'Открой Расширения → Apps Script → слева кликни 📚 Libraries → ➕ Add → вставь Script ID библиотеки → выбери версию → Identifier "WBLib" → Add. Перезагрузи таблицу.',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

// === Меню-обёртки ===
function generateFullSeo()           { WBLib.generateFullSeo(); }
function startDriveAutoFlow()        { WBLib.startDriveAutoFlow(); }
function openUploadSidebar()         { WBLib.openUploadSidebar(); }
function openMgUploadSidebar()       { WBLib.openMgUploadSidebar(); }
function setClaudeApiKey()           { WBLib.setClaudeApiKey(); }
function setupServiceSheets()        { WBLib.setupServiceSheets(); }
function rebuildDashboardOnly()      { WBLib.rebuildDashboardOnly(); }
function recomputeScoringOnly()      { WBLib.recomputeScoringOnly(); }
function recomputeMissingOnly()      { WBLib.recomputeMissingOnly(); }
function cleanServiceSheets()        { WBLib.cleanServiceSheets(); }
function initMasterFiles()           { WBLib.initMasterFiles(); }
function syncTemplateToEtiquettes()  { WBLib.syncTemplateToEtiquettes(); }
function fixAllCopies()              { WBLib.fixAllCopies(); }
function importInciFromSkuFolder()   { WBLib.importInciFromSkuFolder(); }
function importInciBulkFromExcel()   { WBLib.importInciBulkFromExcel(); }
function importFromInfomodel()       { WBLib.importFromInfomodel(); }
function quickFixIncis()             { WBLib.quickFixIncis(); }
function migrateRulesMasterToV31()   { WBLib.migrateRulesMasterToV31(); }
function migrateToV33ParfumerySchema(){ WBLib.migrateToV33ParfumerySchema(); }
function createMashaInstructionPdf() { WBLib.createMashaInstructionPdf(); }
function createCopyForNewSkuPrompt() { WBLib.createCopyForNewSkuPrompt(); }
function rerunLastFile()             { WBLib.rerunLastFile(); }
function openEtiquettesMaster()      { WBLib.openEtiquettesMaster(); }
function openRulesMaster()           { WBLib.openRulesMaster(); }
function downloadInciTemplate()      { WBLib.downloadInciTemplate(); }
function installTriggers()           { WBLib.installTriggers(); }

// === Sidebar callbacks (вызывают google.script.run.X из HTML) ===
function uploadXlsxAndConvert(p)                  { return WBLib.uploadXlsxAndConvert(p); }
function runPipelineFromUI(id, name)              { return WBLib.runPipelineFromUI(id, name); }
function runPipelineWithCopyFromUI(id, n, pn, su) { return WBLib.runPipelineWithCopyFromUI(id, n, pn, su); }
function getLastRunStatus()                       { return WBLib.getLastRunStatus(); }
function uploadMgFilesAndConvert(p)               { return WBLib.uploadMgFilesAndConvert(p); }
function uploadMgSingleFile(p)                    { return WBLib.uploadMgSingleFile(p); }
function runMgPipeline(c, s)                      { return WBLib.runMgPipeline(c, s); }
function runMgPipelineUnified(files)              { return WBLib.runMgPipelineUnified(files); }
function processBulkInciFile(b, n)                { return WBLib.processBulkInciFile(b, n); }

// === Trigger handlers — Apps Script резолвит их в bound по имени ===
function mgQueueWorker_trigger()        { WBLib.mgQueueWorker_trigger(); }
function autoFlowClaudeWaiter_trigger() { WBLib.autoFlowClaudeWaiter_trigger(); }
