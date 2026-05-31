/**
 * SeoWrapper.gs — тонкая обёртка над WBSyncLib для bound-скрипта копии SKU.
 * Bundle-копия для рестарта 2026-05-31 (см. outputs/RESTORE_INDEX.md).
 *
 * Дефект D6: на сервере в _BOOTSTRAP_DEPLOY/SeoWrapper.gs autoTransferSeoOnOpen
 * всё ещё вызывается в onOpenSeo_. Ниже — целевая версия (вызов закомментирован).
 * Не push'ить до зелёного ЧП-3, затем синхронизировать с сервером.
 */

function onOpenSeo_() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🪄 SEO в WB')
    .addSubMenu(ui.createMenu('📥 Загрузить из WB')
      .addItem('Из Асмус', 'pullAsmus_')
      .addItem('Из Quantum', 'pullQuantum_'))
    .addSeparator()
    .addItem('↻ Перенести SEO → тех.блок', 'transferSeo_')
    .addItem('🧹 Очистить «Новое значение»', 'clearNew_')
    .addSeparator()
    .addSubMenu(ui.createMenu('📤 Выгрузить в WB')
      .addItem('В Асмус (safe GET→merge→PUT)', 'pushAsmus_')
      .addItem('В Quantum (safe GET→merge→PUT)', 'pushQuantum_'))
    .addSeparator()
    .addItem('🔍 Проверить артикул', 'diagnoseVendor_')
    .addItem('🔧 Починить артикул (CYR→LAT)', 'fixVendor_')
    .addSeparator()
    .addItem('⚙️ Ozon (скоро)', 'ozonStub_')
    .addToUi();

  // D6 fix: убрать авто-перенос при каждом onOpen
  // try {
  //   WBSyncLib.autoTransferSeoOnOpen(SpreadsheetApp.getActiveSpreadsheet());
  // } catch (err) {
  //   Logger.log('autoTransferSeo: ' + err.message);
  // }
}

function pullAsmus_() { WBSyncLib.pullFromAsmus(SpreadsheetApp.getActiveSpreadsheet()); }
function pullQuantum_() { WBSyncLib.pullFromQuantum(SpreadsheetApp.getActiveSpreadsheet()); }
function pushAsmus_() { WBSyncLib.pushToAsmus(SpreadsheetApp.getActiveSpreadsheet()); }
function pushQuantum_() { WBSyncLib.pushToQuantum(SpreadsheetApp.getActiveSpreadsheet()); }
function transferSeo_() { WBSyncLib.transferSeoToTechBlock(SpreadsheetApp.getActiveSpreadsheet()); }
function clearNew_() { WBSyncLib.clearNewValues(SpreadsheetApp.getActiveSpreadsheet()); }
function diagnoseVendor_() { WBSyncLib.diagnoseVendor(SpreadsheetApp.getActiveSpreadsheet()); }
function fixVendor_() { WBSyncLib.fixVendorCode(SpreadsheetApp.getActiveSpreadsheet()); }

function ozonStub_() {
  try {
    WBLib.showOzonExportHintDialog();
  } catch (e) {
    SpreadsheetApp.getUi().alert(
      'Ozon',
      'SEO → колонки E/F в _Advice_SEO_Draft.\n' +
      'Шаблоны xlsx: OneDrive\\ОП_E-COMMERCE\\Автоматизация\\Шаблоны для SEO-Ozon\n\n' +
      'Авто-выгрузка — после стабилизации WB (ЧП-5).',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  }
}

function wbsyncLibMissingHelp_() {
  SpreadsheetApp.getUi().alert(
    'WBSyncLib не подключена',
    'Apps Script → Libraries → добавьте WBSyncLib (Identifier: WBSyncLib, version HEAD).\n' +
    'После первого запуска разрешите scopes Library.',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}
