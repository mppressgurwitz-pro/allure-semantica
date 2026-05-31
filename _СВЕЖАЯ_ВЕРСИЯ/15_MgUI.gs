/**
 * 15_MgUI.gs
 * ============================================================================
 * Сайдбар и серверные эндпоинты для загрузки MarketGuru-файлов.
 *
 * v2: пайплайн раскладывает файлы в очередь и стартует worker через триггер,
 *     чтобы не упереться в лимит 6 мин на 9 файлах × 2 типа.
 * ============================================================================
 */

function showMgSidebar() {
  const html = HtmlService.createHtmlOutputFromFile('MgSidebar')
    .setTitle('📊 MarketGuru')
    .setWidth(380);
  SpreadsheetApp.getUi().showSidebar(html);
}

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
 * Запустить MG-пайплайн через очередь: укладываем задачи в Properties и
 * запускаем первый worker. Если файлов мало — отрабатывает синхронно.
 * Если много — продолжит автоматически через trigger chaining.
 */
function runMgPipeline(clusterFileIds, shelfFileIds) {
  const log = newLogContext_('MG: clusters=' + (clusterFileIds||[]).length +
                              ', shelves=' + (shelfFileIds||[]).length);
  const startTs = new Date();
  try {
    mgQueueEnqueue_(clusterFileIds || [], shelfFileIds || [], log);
    // Сразу запускаем worker (без триггера — синхронный первый проход)
    const stats = mgQueueWorker_(true);
    log.step('✅ MG-пайплайн в очереди: clusters=' + stats.clusterDone + '/' + stats.clusterTotal +
             ', shelves=' + stats.shelfDone + '/' + stats.shelfTotal);
    log.flush('OK');
    return {
      ok: true,
      duration: (new Date() - startTs),
      clusterCount: stats.clusterDone,
      shelfCount: stats.shelfDone,
      pending: stats.pending
    };
  } catch (e) {
    log.error('❌ MG-пайплайн упал: ' + e.message + '\n' + (e.stack || ''));
    log.flush('ERROR');
    throw e;
  }
}

function openMgUploadSidebar() {
  showMgSidebar();
}
