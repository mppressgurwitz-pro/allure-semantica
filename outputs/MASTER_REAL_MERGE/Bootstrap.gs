/**
 * Bootstrap.gs — тонкая обёртка над WBLib.
 * Вся логика живёт в библиотеке WBConkAnalysisLib (Identifier: WBLib).
 *
 * Этот файл деплоится через clasp в каждую копию-под-SKU. Все 23+ старых .gs
 * заменяются им + appsscript.json содержит указание на библиотеку.
 *
 * Почему обёртки нужны: имена в .addItem('handler'), google.script.run.X и
 * триггеры резолвятся в bound-скрипте копии, не в библиотеке. Поэтому здесь —
 * обёртки 1-в-1 для каждой публичной функции WBLib.
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
  try {
    onOpenSeo_();
  } catch (err) {
    Logger.log('SEO menu: ' + err.message);
    try {
      SpreadsheetApp.getUi()
        .createMenu('⚠ WBSyncLib')
        .addItem('Что делать?', 'wbsyncLibMissingHelp_')
        .addToUi();
    } catch (e2) { Logger.log('WBSyncLib menu fallback: ' + e2.message); }
  }
}

function createSkuCardFromMasterDialog() { WBLib.createSkuCardFromMasterDialog(); }
function backfillSkuRegistryDialog() { WBLib.backfillSkuRegistryDialog(); }

function libraryMissingHelp_() {
  SpreadsheetApp.getUi().alert(
    'Библиотека WBLib не подключена',
    'Apps Script → Libraries → проверь что WBLib стоит. Identifier должен быть ровно "WBLib".',
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
function createCopyForNewSkuPrompt() { WBLib.createCopyForNewSkuPrompt(); }
function migrateAllCopiesTo4LKDialog() { WBLib.migrateAllCopiesTo4LKDialog(); }
function migrateSingleCopyTo4LKDialog() { WBLib.migrateSingleCopyTo4LKDialog(); }
function setupOzonTemplateMapSheet() { WBLib.setupOzonTemplateMapSheet(); }
function showOzonExportHintDialog() { WBLib.showOzonExportHintDialog(); }
function rerunLastFile()             { WBLib.rerunLastFile(); }
function openEtiquettesMaster()      { WBLib.openEtiquettesMaster(); }
function openRulesMaster()           { WBLib.openRulesMaster(); }
function downloadInciTemplate()      { WBLib.downloadInciTemplate(); }
function installTriggers()           { WBLib.installTriggers(); }

// === Sidebar callbacks ===
function uploadXlsxAndConvert(p)                  { return WBLib.uploadXlsxAndConvert(p); }
function runPipelineFromUI(id, name)              { return WBLib.runPipelineFromUI(id, name); }
function runPipelineWithCopyFromUI(id, n, pn, su) { return WBLib.runPipelineWithCopyFromUI(id, n, pn, su); }
function getLastRunStatus()                       { return WBLib.getLastRunStatus(); }
function uploadMgFilesAndConvert(p)               { return WBLib.uploadMgFilesAndConvert(p); }
function uploadMgSingleFile(p)                    { return WBLib.uploadMgSingleFile(p); }
function runMgPipeline(c, s)                      { return WBLib.runMgPipeline(c, s); }
function runMgPipelineUnified(files)              { return WBLib.runMgPipelineUnified(files); }
function processBulkInciFile(b, n)                { return WBLib.processBulkInciFile(b, n); }

// === Trigger handlers ===
function mgQueueWorker_trigger()        { WBLib.mgQueueWorker_trigger(); }
function autoFlowClaudeWaiter_trigger() { WBLib.autoFlowClaudeWaiter_trigger(); }

// injectTemplatesIntoMaster — см. InjectMasterTemplate.gs (Run из Apps Script Editor мастера)
