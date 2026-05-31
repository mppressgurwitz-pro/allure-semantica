/**
 * 02_UI.gs
 * Сайдбар для загрузки XLSX.
 */

function showUploadSidebar() {
  const html = HtmlService.createHtmlOutputFromFile('Sidebar')
    .setTitle(CONFIG.MENU_TITLE).setWidth(360);
  SpreadsheetApp.getUi().showSidebar(html);
}

function uploadXlsxAndConvert(payload) {
  if (!payload || !payload.base64) throw new Error('Пустой payload загрузки');
  if (!payload.name || !payload.name.toLowerCase().endsWith('.xlsx')) {
    throw new Error('Ожидается .xlsx файл');
  }
  const bytes = Utilities.base64Decode(payload.base64);
  const blob  = Utilities.newBlob(bytes, payload.mimeType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', payload.name);
  const archiveFolderId = String(getParam_('ARCHIVE_FOLDER_ID', CONFIG.DEFAULTS.ARCHIVE_FOLDER_ID) || '').trim();
  const parents = archiveFolderId ? [archiveFolderId] : [];
  const meta = {
    name: payload.name.replace(/\.xlsx$/i, '') + ' [GS-конверсия]',
    mimeType: 'application/vnd.google-apps.spreadsheet'
  };
  if (parents.length) meta.parents = parents;
  const created = Drive.Files.create(meta, blob, { supportsAllDrives: true });
  if (!created || !created.id) throw new Error('Drive API не вернул ID');
  return { fileId: created.id, name: payload.name };
}

function runPipelineFromUI(fileId, name) { return runFullPipeline(fileId, name); }

function runPipelineWithCopyFromUI(fileId, name, productName, ourSku) {
  const log = newLogContext_('copy-flow: ' + name);
  const startTs = new Date();
  try {
    const copy = createSpreadsheetCopy_({ productName, ourSku }, log);
    setOverrideTargetSs_(copy.id);
    try { runFullPipeline(fileId, name); } finally { clearOverrideTargetSs_(); }
    log.flush('OK');
    return { ok: true, url: copy.url, name: copy.name, duration: (new Date() - startTs) };
  } catch (e) {
    clearOverrideTargetSs_();
    log.error(e.message); log.flush('ERROR');
    throw e;
  }
}

function getLastRunStatus() {
  const p = PropertiesService.getDocumentProperties();
  return {
    lastRun:    p.getProperty(CONFIG.PROP_KEYS.LAST_RUN) || '',
    lastFile:   p.getProperty(CONFIG.PROP_KEYS.LAST_FILE_NAME) || '',
    lastStatus: p.getProperty(CONFIG.PROP_KEYS.LAST_STATUS) || '',
    duration:   p.getProperty(CONFIG.PROP_KEYS.LAST_DURATION_MS) || ''
  };
}
