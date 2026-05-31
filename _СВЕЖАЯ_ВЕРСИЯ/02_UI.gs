/**
 * 02_UI.gs
 * ============================================================================
 * Сайдбар для загрузки XLSX и серверные хелперы для UI.
 * ============================================================================
 */

function showUploadSidebar() {
  const html = HtmlService.createHtmlOutputFromFile('Sidebar')
    .setTitle(CONFIG.MENU_TITLE)
    .setWidth(360);
  SpreadsheetApp.getUi().showSidebar(html);
}

/**
 * Серверный обработчик загрузки. Принимает base64-XLSX → сохраняет в Drive
 * с конвертацией в Google Sheets → возвращает fileId и имя.
 */
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
  if (!created || !created.id) throw new Error('Drive API не вернул ID конвертированного файла');

  return { fileId: created.id, name: payload.name };
}

function runPipelineFromUI(fileId, name) {
  return runFullPipeline(fileId, name);
}

function runPipelineWithCopyFromUI(fileId, name, productName, ourSku) {
  const log = newLogContext_('copy-flow: ' + name);
  const startTs = new Date();
  try {
    const copy = createSpreadsheetCopy_({ productName, ourSku }, log);
    setOverrideTargetSs_(copy.id);
    try {
      runFullPipeline(fileId, name);
    } finally {
      clearOverrideTargetSs_();
    }
    log.flush('OK');
    return {
      ok: true,
      url: copy.url,
      name: copy.name,
      duration: (new Date() - startTs)
    };
  } catch (e) {
    clearOverrideTargetSs_();
    log.error('❌ Copy-flow упал: ' + e.message + '\n' + (e.stack || ''));
    log.flush('ERROR');
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

function showAbout() {
  SpreadsheetApp.getUi().alert(
    CONFIG.MENU_TITLE,
    'Автоматизация конкурентного анализа\nВерсия ' + CONFIG.VERSION +
    '\n\nСлужебные листы: ' + Object.values(CONFIG.SERVICE_TABS).join(', ') +
    '\nВкладки рекомендаций: ' + Object.values(CONFIG.ADVICE_TABS).join(', '),
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

function showHelp() {
  const html = HtmlService.createHtmlOutput(
    '<div style="font-family:Arial;padding:12px;line-height:1.5">' +
    '<h3>Как пользоваться</h3>' +
    '<ol>' +
    '<li>Скачайте отчёт «Сравнение карточек» с Wildberries в формате XLSX.</li>' +
    '<li>Меню → 🤖 Конкурентный анализ → 📥 Загрузить отчёт WB (XLSX)…</li>' +
    '<li>Загрузите MarketGuru (Кластеры + Полки), если есть.</li>' +
    '<li>Нажмите 🪄 Сделать семантику + SEO — заполнит вкладки <b>_Advice_*</b>.</li>' +
    '</ol>' +
    '<p>Параметры — лист <b>_Config</b>. Стоп-слова — <b>_StopWords</b>. История — <b>_Logs</b>.</p>' +
    '</div>'
  ).setWidth(420).setHeight(360);
  SpreadsheetApp.getUi().showModalDialog(html, 'Инструкция');
}
