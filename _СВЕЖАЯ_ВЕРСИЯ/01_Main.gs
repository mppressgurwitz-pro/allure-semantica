/**
 * 01_Main.gs
 * ============================================================================
 * Точка входа: меню, обёртки запуска полного пайплайна.
 * v2: добавлены пункты «Сделать семантику + SEO» и управление API-ключом.
 * ============================================================================
 */

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu(CONFIG.MENU_TITLE)
    .addItem('📥 Загрузить отчёт WB (XLSX)…', 'openUploadSidebar')
    .addItem('📊 Загрузить файлы MarketGuru…', 'openMgUploadSidebar')
    .addSeparator()
    .addItem('🪄 Сделать семантику + SEO (Claude)', 'generateFullSeo')
    .addSeparator()
    .addItem('🆕 Создать таблицу для нового SKU (без файла)…', 'createCopyForNewSkuPrompt')
    .addItem('▶️ Перезапустить обработку последнего файла', 'rerunLastFile')
    .addSeparator()
    .addSubMenu(ui.createMenu('🛠 Сервис')
      .addItem('🧱 Инициализация служебных листов', 'setupServiceSheets')
      .addItem('🔑 Задать Claude API ключ…', 'setClaudeApiKey')
      .addItem('📊 Пересобрать дашборд', 'rebuildDashboardOnly')
      .addItem('🧮 Пересчитать скоринг', 'recomputeScoringOnly')
      .addItem('🔍 Найти missing keywords', 'recomputeMissingOnly')
      .addItem('🧹 Очистить служебные листы', 'cleanServiceSheets')
    )
    .addSubMenu(ui.createMenu('ℹ️ Справка')
      .addItem('Открыть инструкцию', 'showHelp')
      .addItem('О версии', 'showAbout')
    )
    .addToUi();
}

function installTriggers() {
  const ss = getTargetSpreadsheet_();
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'onOpen') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('onOpen').forSpreadsheet(ss).onOpen().create();
  SpreadsheetApp.getActive().toast('Триггер onOpen установлен', 'OK', 5);
}

/**
 * Главный пайплайн обработки одного XLSX-файла WB.
 */
function runFullPipeline(fileId, originalName) {
  const startTs = new Date();
  const log = newLogContext_(originalName);

  try {
    log.step('🚀 Старт обработки файла: ' + originalName);

    const wbReport = readWbReport_(fileId, log);
    validateWbReport_(wbReport, log);
    pasteRawData_(wbReport, log);

    const cleanedKeywords = cleanAllKeywords_(wbReport, log);

    const semCore = buildSemanticCore_(cleanedKeywords, log);
    writeSemanticCore_(semCore, log);

    const missing = findMissingKeywords_(cleanedKeywords, log);
    writeMissingKeywords_(missing, log);

    const scored = computeScoring_(cleanedKeywords, log);
    writeScoring_(scored, log);

    rebuildDashboard_(wbReport, semCore, missing, scored, log);

    archiveKeywordsRaw_(cleanedKeywords, log);

    log.step('✅ Готово');

    PropertiesService.getDocumentProperties().setProperties({
      [CONFIG.PROP_KEYS.LAST_RUN]: startTs.toISOString(),
      [CONFIG.PROP_KEYS.LAST_FILE]: fileId,
      [CONFIG.PROP_KEYS.LAST_FILE_NAME]: originalName,
      [CONFIG.PROP_KEYS.LAST_STATUS]: 'OK',
      [CONFIG.PROP_KEYS.LAST_DURATION_MS]: String(new Date() - startTs)
    });

    log.flush('OK');
    return { ok: true, message: 'Обработка завершена успешно', duration: (new Date() - startTs) };

  } catch (e) {
    log.error('❌ Ошибка пайплайна: ' + e.message + '\n' + (e.stack || ''));
    PropertiesService.getDocumentProperties().setProperties({
      [CONFIG.PROP_KEYS.LAST_STATUS]: 'ERROR: ' + e.message,
      [CONFIG.PROP_KEYS.LAST_DURATION_MS]: String(new Date() - startTs)
    });
    log.flush('ERROR');
    throw e;
  }
}

function rerunLastFile() {
  const props = PropertiesService.getDocumentProperties();
  const fileId = props.getProperty(CONFIG.PROP_KEYS.LAST_FILE);
  const name   = props.getProperty(CONFIG.PROP_KEYS.LAST_FILE_NAME);
  if (!fileId) {
    SpreadsheetApp.getUi().alert('Нет последнего файла. Загрузите XLSX через меню.');
    return;
  }
  runFullPipeline(fileId, name || '(без имени)');
  SpreadsheetApp.getActive().toast('Перезапуск завершён: ' + name, 'OK', 5);
}

function openUploadSidebar() {
  showUploadSidebar();
}

function createCopyForNewSkuPrompt() {
  const ui = SpreadsheetApp.getUi();
  const r1 = ui.prompt('Новый SKU', 'Введите название товара (например, "Шампунь Савач 1 л"):', ui.ButtonSet.OK_CANCEL);
  if (r1.getSelectedButton() !== ui.Button.OK) return;
  const productName = r1.getResponseText().trim();
  if (!productName) { ui.alert('Название не задано'); return; }

  const r2 = ui.prompt('Артикул WB', 'Введите артикул нашего товара (например, 445361666):', ui.ButtonSet.OK_CANCEL);
  if (r2.getSelectedButton() !== ui.Button.OK) return;
  const ourSku = r2.getResponseText().trim();
  if (!ourSku) { ui.alert('Артикул не задан'); return; }

  const log = newLogContext_('createCopyForNewSku: ' + productName);
  try {
    const copy = createSpreadsheetCopy_({ productName, ourSku }, log);
    log.flush('OK');
    const html = HtmlService.createHtmlOutput(
      '<div style="font-family:Arial;padding:14px">' +
      '<p>Создана новая таблица:</p>' +
      '<p><b>' + copy.name + '</b></p>' +
      '<p><a href="' + copy.url + '" target="_blank">Открыть таблицу</a></p>' +
      '<p>Откройте её и через меню «🤖 Конкурентный анализ → 📥 Загрузить отчёт WB» загрузите XLSX по этому товару.</p>' +
      '</div>'
    ).setWidth(420).setHeight(220);
    ui.showModalDialog(html, '✅ Готово');
  } catch (e) {
    log.error(e.message); log.flush('ERROR');
    ui.alert('Ошибка: ' + e.message);
  }
}
