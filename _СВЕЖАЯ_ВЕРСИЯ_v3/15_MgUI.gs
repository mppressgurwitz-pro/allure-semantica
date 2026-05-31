/**
 * 15_MgUI.gs
 */

function showMgSidebar() {
  const html = HtmlService.createHtmlOutputFromFile('MgSidebar')
    .setTitle('📊 MarketGuru').setWidth(380);
  SpreadsheetApp.getUi().showSidebar(html);
}

/**
 * v3.2 — загружает файлы MarketGuru ПО ОДНОМУ.
 * Каждый вызов = 1 файл. Сайдбар вызывает в цикле, чтобы не упереться
 * в Apps Script UI timeout (~30 секунд на сервер-функцию).
 *
 * Auto-classify: пытаемся открыть сконвертированную таблицу и определить
 * её тип по имени листа («Кластеры» vs «Мониторинг полок»).
 * Если тип не определён — возвращаем kind='UNKNOWN', пользователь увидит варнинг.
 */
function uploadMgSingleFile(payload) {
  if (!payload || !payload.name) throw new Error('Не передан файл');
  if (!payload.name.toLowerCase().endsWith('.xlsx')) {
    return { ok: false, name: payload.name, error: 'Ожидается .xlsx' };
  }
  const archiveFolderId = String(getParam_('ARCHIVE_FOLDER_ID', CONFIG.DEFAULTS.ARCHIVE_FOLDER_ID) || '').trim();
  const parents = archiveFolderId ? [archiveFolderId] : [];
  const blob = Utilities.newBlob(
    Utilities.base64Decode(payload.base64),
    payload.mimeType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    payload.name
  );
  const meta = {
    name: payload.name.replace(/\.xlsx$/i, '') + ' [GS]',
    mimeType: 'application/vnd.google-apps.spreadsheet'
  };
  if (parents.length) meta.parents = parents;

  // Retry на транзиентные сбои Drive (HTTP 5xx, 429)
  let created = null, lastError = null;
  const delays = [3000, 8000, 15000];
  for (let attempt = 1; attempt <= delays.length + 1; attempt++) {
    try {
      created = Drive.Files.create(meta, blob, { supportsAllDrives: true });
      break;
    } catch (e) {
      lastError = e;
      const msg = String(e.message || '');
      const transient = /500|502|503|504|429|timeout|temporar/i.test(msg);
      if (!transient || attempt > delays.length) {
        return { ok: false, name: payload.name, error: msg };
      }
      Utilities.sleep(delays[attempt - 1]);
    }
  }
  if (!created) return { ok: false, name: payload.name, error: (lastError && lastError.message) || 'unknown' };

  // Auto-classify по имени листа
  let kind = 'UNKNOWN';
  try {
    const ss = SpreadsheetApp.openById(created.id);
    const names = ss.getSheets().map(s => s.getName());
    if (names.indexOf('Кластеры') >= 0) kind = MG_KIND.CLUSTERS;
    else if (names.indexOf('Мониторинг полок') >= 0) kind = MG_KIND.SHELVES;
  } catch (e) {
    // Если не смогли прочитать — оставляем UNKNOWN, не фатально
  }
  return { ok: true, fileId: created.id, name: payload.name, kind: kind };
}

/**
 * Старый интерфейс — для обратной совместимости. Если кто-то ещё вызывает
 * uploadMgFilesAndConvert(payloads), обрабатываем как было.
 */
function uploadMgFilesAndConvert(payloads) {
  if (!payloads || !payloads.length) throw new Error('Не передано файлов');
  const uploaded = [], failed = [];
  payloads.forEach(p => {
    const res = uploadMgSingleFile(p);
    if (res.ok) uploaded.push({ fileId: res.fileId, name: res.name, kind: res.kind });
    else failed.push({ name: res.name, error: res.error });
  });
  return { uploaded, failed };
}

/**
 * v3.2 — единый pipeline по списку файлов с уже определённым kind.
 * Сайдбар передаёт [{fileId, kind}, ...]. Раскидываем по очередям.
 */
function runMgPipelineUnified(files) {
  const log = newLogContext_('MG-unified: files=' + (files || []).length);
  const startTs = new Date();
  try {
    const clusters = (files || []).filter(f => f.kind === MG_KIND.CLUSTERS).map(f => f.fileId);
    const shelves = (files || []).filter(f => f.kind === MG_KIND.SHELVES).map(f => f.fileId);
    const unknown = (files || []).filter(f => f.kind === 'UNKNOWN' || !f.kind);
    if (unknown.length) {
      log.step('⚠ Тип не определён у ' + unknown.length + ' файла(ов) — пропускаю');
      unknown.forEach(f => log.step('  • ' + (f.name || f.fileId)));
    }
    log.step('Классы: clusters=' + clusters.length + ', shelves=' + shelves.length);
    mgQueueEnqueue_(clusters, shelves, log);
    const stats = mgQueueWorker_(true);
    log.step('✅ MG в очереди: c=' + stats.clusterDone + '/' + stats.clusterTotal +
             ', s=' + stats.shelfDone + '/' + stats.shelfTotal);
    log.flush('OK');
    return { ok: true, duration: (new Date() - startTs),
             clusterCount: stats.clusterDone, shelfCount: stats.shelfDone,
             pending: stats.pending, skipped: unknown.length };
  } catch (e) {
    log.error(e.message); log.flush('ERROR'); throw e;
  }
}

/** Старый интерфейс — для обратной совместимости. */
function runMgPipeline(clusterFileIds, shelfFileIds) {
  const log = newLogContext_('MG: clusters=' + (clusterFileIds||[]).length +
                              ', shelves=' + (shelfFileIds||[]).length);
  const startTs = new Date();
  try {
    mgQueueEnqueue_(clusterFileIds || [], shelfFileIds || [], log);
    const stats = mgQueueWorker_(true);
    log.step('✅ MG в очереди: c=' + stats.clusterDone + '/' + stats.clusterTotal +
             ', s=' + stats.shelfDone + '/' + stats.shelfTotal);
    log.flush('OK');
    return { ok: true, duration: (new Date() - startTs),
             clusterCount: stats.clusterDone, shelfCount: stats.shelfDone, pending: stats.pending };
  } catch (e) {
    log.error(e.message); log.flush('ERROR'); throw e;
  }
}

function openMgUploadSidebar() { showMgSidebar(); }
