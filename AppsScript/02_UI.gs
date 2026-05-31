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
 *
 * @param {Object} payload {base64, mimeType, name}
 * @return {Object} {fileId, name}
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

  // Drive API v3 — конвертация в Google Sheets через mimeType=application/vnd.google-apps.spreadsheet
  const meta = {
    name: payload.name.replace(/\.xlsx$/i, '') + ' [GS-конверсия]',
    mimeType: 'application/vnd.google-apps.spreadsheet'
  };
  if (parents.length) meta.parents = parents;

  const created = Drive.Files.create(meta, blob, { supportsAllDrives: true });
  if (!created || !created.id) throw new Error('Drive API не вернул ID конвертированного файла');

  return { fileId: created.id, name: payload.name };
}

/**
 * Серверный запуск полного пайплайна по fileId, возвращает резюме.
 * Режим in-place: пайплайн пишет в текущую (активную) таблицу.
 */
function runPipelineFromUI(fileId, name) {
  return runFullPipeline(fileId, name);
}

/**
 * Серверный запуск с предварительным копированием master-шаблона.
 * Режим create-copy: создаём копию под новый SKU и пишем данные в неё.
 *
 * @param {string} fileId        ID конвертированного XLSX в Drive
 * @param {string} name          оригинальное имя файла
 * @param {string} productName   название нашего товара (войдёт в имя копии)
 * @param {string} ourSku        артикул WB нашего товара (запишется в _Config копии)
 * @return {Object} {ok, url, name, duration}
 */
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

/**
 * Серверный хелпер: получить статус последнего запуска.
 */
function getLastRunStatus() {
  const p = PropertiesService.getDocumentProperties();
  return {
    lastRun:    p.getProperty(CONFIG.PROP_KEYS.LAST_RUN) || '',
    lastFile:   p.getProperty(CONFIG.PROP_KEYS.LAST_FILE_NAME) || '',
    lastStatus: p.getProperty(CONFIG.PROP_KEYS.LAST_STATUS) || '',
    duration:   p.getProperty(CONFIG.PROP_KEYS.LAST_DURATION_MS) || ''
  };
}

/**
 * Простое окошко "О программе".
 */
function showAbout() {
  SpreadsheetApp.getUi().alert(
    CONFIG.MENU_TITLE,
    'Автоматизация конкурентного анализа\nВерсия ' + CONFIG.VERSION +
    '\n\nСлужебные листы: ' + Object.values(CONFIG.SERVICE_TABS).join(', '),
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
    '<li>Выберите файл в сайдбаре и нажмите «Загрузить и обработать».</li>' +
    '<li>Дождитесь сообщения «Готово» и проверьте дашборд (_Dashboard).</li>' +
    '</ol>' +
    '<p>Параметры маркетолог меняет в листе <b>_Config</b>, стоп-слова — в листе <b>_StopWords</b>.</p>' +
    '<p>История запусков — в листе <b>_Logs</b>.</p>' +
    '</div>'
  ).setWidth(420).setHeight(360);
  SpreadsheetApp.getUi().showModalDialog(html, 'Инструкция');
}
