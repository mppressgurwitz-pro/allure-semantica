/**
 * 15_MgUI.gs
 * ============================================================================
 * Сайдбар и серверные эндпоинты для загрузки MarketGuru-файлов.
 *
 * Поддерживает мульти-загрузку: сразу несколько XLSX по разным артикулам,
 * сгруппированные в две секции — Кластеры и Мониторинг полок.
 * Каждый файл конвертируется в Google Sheets через Drive API,
 * потом партия читается и записывается в шаблон.
 * ============================================================================
 */

function showMgSidebar() {
  const html = HtmlService.createHtmlOutputFromFile('MgSidebar')
    .setTitle('📊 MarketGuru')
    .setWidth(380);
  SpreadsheetApp.getUi().showSidebar(html);
}

/**
 * Серверный обработчик: принимает массив payload-ов одного типа,
 * каждый — {base64, name, mimeType}.
 *
 * @param {Array<Object>} payloads
 * @return {Array<{fileId, name}>}
 */
function uploadMgFilesAndConvert(payloads) {
  if (!payloads || !payloads.length) throw new Error('Не передано ни одного файла');
  const archiveFolderId = String(getParam_('ARCHIVE_FOLDER_ID', CONFIG.DEFAULTS.ARCHIVE_FOLDER_ID) || '').trim();
  const parents = archiveFolderId ? [archiveFolderId] : [];
  const result = [];
  payloads.forEach(p => {
    if (!p.name || !p.name.toLowerCase().endsWith('.xlsx')) throw new Error('Ожидается .xlsx: ' + p.name);
    const blob = Utilities.newBlob(
      Utilities.base64Decode(p.base64),
      p.mimeType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      p.name
    );
    const meta = {
      name: p.name.replace(/\.xlsx$/i, '') + ' [GS-конверсия]',
      mimeType: 'application/vnd.google-apps.spreadsheet'
    };
    if (parents.length) meta.parents = parents;
    const created = Drive.Files.create(meta, blob, { supportsAllDrives: true });
    result.push({ fileId: created.id, name: p.name });
  });
  return result;
}

/**
 * Запустить полный пайплайн обработки MG: для одного или обоих типов сразу.
 *
 * @param {Array<string>} clusterFileIds
 * @param {Array<string>} shelfFileIds
 * @return {Object} {ok, duration, clusterCount, shelfCount}
 */
function runMgPipeline(clusterFileIds, shelfFileIds) {
  const log = newLogContext_('MG: clusters=' + (clusterFileIds||[]).length +
                              ', shelves=' + (shelfFileIds||[]).length);
  const startTs = new Date();
  try {
    let clusterCount = 0, shelfCount = 0;

    if (clusterFileIds && clusterFileIds.length) {
      log.step('🚀 Старт обработки MG Кластеров (' + clusterFileIds.length + ' файлов)');
      const blocks = readMgFilesBatch_(clusterFileIds, MG_KIND.CLUSTERS, log);
      pasteMgClusters_(blocks, log);
      clusterCount = blocks.length;
    }
    if (shelfFileIds && shelfFileIds.length) {
      log.step('🚀 Старт обработки MG Полок (' + shelfFileIds.length + ' файлов)');
      const blocks = readMgFilesBatch_(shelfFileIds, MG_KIND.SHELVES, log);
      pasteMgShelves_(blocks, log);
      shelfCount = blocks.length;
    }

    log.step('✅ MG-пайплайн завершён');
    log.flush('OK');
    return {
      ok: true,
      duration: (new Date() - startTs),
      clusterCount, shelfCount
    };
  } catch (e) {
    log.error('❌ MG-пайплайн упал: ' + e.message + '\n' + (e.stack || ''));
    log.flush('ERROR');
    throw e;
  }
}

/**
 * Открыть сайдбар MarketGuru.
 */
function openMgUploadSidebar() {
  showMgSidebar();
}
