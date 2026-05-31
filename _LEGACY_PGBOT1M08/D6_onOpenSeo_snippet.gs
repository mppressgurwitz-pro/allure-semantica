/**
 * D6 fix snippet — canonical deploy file: Apps Script.js (bound PGBOT1M08, scriptId 1-iDt3Zs6…).
 * clasp push from _LEGACY_PGBOT1M08/ — 2026-05-31.
 * Removed: try { transferSeoToTechBlock_internal(true); } on every open.
 */
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
  // D6: auto-transfer отключён — перенос только по клику transferSeoToTechBlock
}
