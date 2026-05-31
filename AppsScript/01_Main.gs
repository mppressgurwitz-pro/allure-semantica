/**
 * 01_Main.gs
 * ============================================================================
 * Точка входа: меню, обёртки запуска полного пайплайна.
 * ============================================================================
 */

/**
 * Триггер открытия таблицы — собирает кастомное меню в Google Sheets.
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu(CONFIG.MENU_TITLE)
    .addItem('📥 Загрузить отчёт WB (XLSX)…', 'openUploadSidebar')
    .addItem('📊 Загрузить файлы MarketGuru…', 'openMgUploadSidebar')
    .addItem('🆕 Создать таблицу для нового SKU (без файла)…', 'createCopyForNewSkuPrompt')
    .addItem('▶️ Перезапустить обработку последнего файла', 'rerunLastFile')
    .addSeparator()
    .addSubMenu(ui.createMenu('🛠 Сервис')
      .addItem('🧱 Инициализация служебных листов', 'setupServiceSheets')
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

/**
 * Установка триггера onOpen на случай если контейнер не подхватил автоматически.
 */
function installTriggers() {
  const ss = getTargetSpreadsheet_();
  // Снести старые триггеры этого скрипта
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'onOpen') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('onOpen').forSpreadsheet(ss).onOpen().create();
  SpreadsheetApp.getActive().toast('Триггер onOpen установлен', 'OK', 5);
}

/**
 * Главный пайплайн обработки одного XLSX-файла WB.
 * Вызывается из сайдбара после загрузки.
 *
 * @param {string} fileId - ID Google-конвертированного файла
 * @param {string} originalName - оригинальное имя для логов
 */
function runFullPipeline(fileId, originalName) {
  const startTs = new Date();
  const log = newLogContext_(originalName);

  try {
    log.step('🚀 Старт обработки файла: ' + originalName);

    // 1. Прочитать XLSX-выгрузку как объект
    const wbReport = readWbReport_(fileId, log);

    // 2. Валидация структуры
    validateWbReport_(wbReport, log);

    // 3. Перенести "сырые" блоки в шаблонные жёлтые вкладки
    pasteRawData_(wbReport, log);

    // 4. Нормализация ключевых слов и стоп-слова
    const cleanedKeywords = cleanAllKeywords_(wbReport, log);

    // 5. Семантическое ядро
    const semCore = buildSemanticCore_(cleanedKeywords, log);
    writeSemanticCore_(semCore, log);

    // 6. Missing keywords (что есть у конкурентов и нет у нас)
    const missing = findMissingKeywords_(cleanedKeywords, log);
    writeMissingKeywords_(missing, log);

    // 7. Скоринг
    const scored = computeScoring_(cleanedKeywords, log);
    writeScoring_(scored, log);

    // 8. Дашборд
    rebuildDashboard_(wbReport, semCore, missing, scored, log);

    // 9. Архив сырья
    archiveKeywordsRaw_(cleanedKeywords, log);

    log.step('✅ Готово');

    // 10. Запомнить параметры запуска
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

/**
 * Перезапустить пайплайн на последнем файле.
 */
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

/**
 * Открыть сайдбар загрузки файла.
 */
function openUploadSidebar() {
  showUploadSidebar();
}

/**
 * Создать пустую копию шаблона под новый SKU без обработки файла.
 * Полезно, когда хочется заранее подготовить таблицу под товар, а файл загрузить позже.
 */
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
