/**
 * 01_Main.gs v3.0
 * Меню, точка входа, пайплайн.
 */

/**
 * Стандартный onOpen — работает, когда код запускается напрямую как bound-скрипт
 * (а не через library). Если код используется как library, в Bootstrap.gs копии
 * вызывается WBLib.bootstrapBuildMenu(SpreadsheetApp.getUi()) — функция ниже.
 */
function onOpen() {
  bootstrapBuildMenu(SpreadsheetApp.getUi());
}

/**
 * Публичная функция для вызова из Bootstrap.gs копии:
 *   function onOpen(e) { WBLib.bootstrapBuildMenu(SpreadsheetApp.getUi()); }
 *
 * ВАЖНО: имена обработчиков (строки в .addItem) разрешаются Apps Script-ом
 * в КОНТЕЙНЕРЕ (bound script), а не в библиотеке. Поэтому те имена должны
 * существовать как функции-обёртки в Bootstrap.gs каждой копии. Соответствие
 * см. в _LIBRARY_v4/Bootstrap.gs.
 */
function bootstrapBuildMenu(ui) {
  if (!ui) ui = SpreadsheetApp.getUi();
  ui.createMenu(CONFIG.MENU_TITLE)
    .addItem('📂 Подтянуть из Drive Маши и обработать всё', 'startDriveAutoFlow')
    .addSeparator()
    .addItem('🪄 Полный пакет рекомендаций: SEO + реклама + склады + полки (Claude)', 'generateFullSeo')
    .addSeparator()
    .addItem('📥 Загрузить отчёт WB вручную…', 'openUploadSidebar')
    .addItem('📊 Загрузить файлы MarketGuru вручную…', 'openMgUploadSidebar')
    .addItem('🆕 Создать таблицу для нового SKU…', 'createCopyForNewSkuPrompt')
    .addItem('➕ Создать карточку SKU (реестр + B1)', 'createSkuCardFromMasterDialog')
    .addItem('📋 Backfill реестра SKU', 'backfillSkuRegistryDialog')
    .addSeparator()
    .addItem('🔄 Миграция 4 ЛК (все копии в папке)', 'migrateAllCopiesTo4LKDialog')
    .addItem('🔄 Миграция 4 ЛК (текущая таблица)', 'migrateSingleCopyTo4LKDialog')
    .addItem('▶️ Перезапустить обработку последнего файла', 'rerunLastFile')
    .addSeparator()
    .addSubMenu(ui.createMenu('🗂 Мастер-файлы')
      .addItem('🆕 Создать Etiquettes_Master + Rules_Master', 'initMasterFiles')
      .addItem('📖 Открыть Etiquettes_Master', 'openEtiquettesMaster')
      .addItem('📖 Открыть Rules_Master', 'openRulesMaster')
      .addSeparator()
      .addItem('📄 Создать Шаблон INCI для Маши', 'downloadInciTemplate')
      .addItem('📷 Распознать этикетки в папке текущего SKU', 'importInciFromSkuFolder')
      .addItem('📋 Массовый импорт INCI из Excel…', 'importInciBulkFromExcel')
      .addItem('🔄 Импорт из Infomodel.xlsx', 'importFromInfomodel')
      .addItem('🔄 Sync Шаблон → Etiquettes_Master', 'syncTemplateToEtiquettes')
      .addItem('🔧 Fix _Config во всех копиях', 'fixAllCopies')
      .addItem('🩹 QuickFix INCI (ручная правка)', 'quickFixIncis')
      .addItem('📜 Перенести Rules_Master на v3.1 (13 правил)', 'migrateRulesMasterToV31')
      .addItem('🌸 Добавить колонки парфюмерии (v3.3)', 'migrateToV33ParfumerySchema')
      .addItem('📄 Создать PDF инструкции для Маши', 'createMashaInstructionPdf')
      .addItem('📦 Справочник шаблонов Ozon (лист)', 'setupOzonTemplateMapSheet')
    )
    .addSubMenu(ui.createMenu('🛠 Сервис')
      .addItem('🧱 Инициализация служебных листов', 'setupServiceSheets')
      .addItem('🔑 Задать Claude API ключ…', 'setClaudeApiKey')
      .addItem('📊 Пересобрать дашборд', 'rebuildDashboardOnly')
      .addItem('🧮 Пересчитать скоринг', 'recomputeScoringOnly')
      .addItem('🔍 Найти missing keywords', 'recomputeMissingOnly')
      .addItem('🧹 Очистить служебные листы', 'cleanServiceSheets')
      .addItem('⏱ Установить триггер onOpen', 'installTriggers')
    )
    .addToUi();
}

function installTriggers() {
  const ss = getTargetSpreadsheet_();
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'onOpen') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('onOpen').forSpreadsheet(ss).onOpen().create();
}

function runFullPipeline(fileId, originalName) {
  const startTs = new Date();
  const log = newLogContext_(originalName);
  try {
    log.step('🚀 Старт: ' + originalName);
    const wbReport = readWbReport_(fileId, log);
    validateWbReport_(wbReport, log);
    pasteRawData_(wbReport, log);
    const cleaned = cleanAllKeywords_(wbReport, log);
    const semCore = buildSemanticCore_(cleaned, log);
    writeSemanticCore_(semCore, log);
    const missing = findMissingKeywords_(cleaned, log);
    writeMissingKeywords_(missing, log);
    const scored = computeScoring_(cleaned, log);
    writeScoring_(scored, log);
    rebuildDashboard_(wbReport, semCore, missing, scored, log);
    archiveKeywordsRaw_(cleaned, log);
    log.step('✅ Готово');
    PropertiesService.getDocumentProperties().setProperties({
      [CONFIG.PROP_KEYS.LAST_RUN]: startTs.toISOString(),
      [CONFIG.PROP_KEYS.LAST_FILE]: fileId,
      [CONFIG.PROP_KEYS.LAST_FILE_NAME]: originalName,
      [CONFIG.PROP_KEYS.LAST_STATUS]: 'OK',
      [CONFIG.PROP_KEYS.LAST_DURATION_MS]: String(new Date() - startTs)
    });
    log.flush('OK');
    return { ok: true, duration: (new Date() - startTs) };
  } catch (e) {
    log.error('❌ ' + e.message + '\n' + (e.stack || ''));
    PropertiesService.getDocumentProperties().setProperties({
      [CONFIG.PROP_KEYS.LAST_STATUS]: 'ERROR: ' + e.message,
      [CONFIG.PROP_KEYS.LAST_DURATION_MS]: String(new Date() - startTs)
    });
    log.flush('ERROR');
    throw e;
  }
}

function rerunLastFile() {
  const p = PropertiesService.getDocumentProperties();
  const fileId = p.getProperty(CONFIG.PROP_KEYS.LAST_FILE);
  const name = p.getProperty(CONFIG.PROP_KEYS.LAST_FILE_NAME);
  if (!fileId) { SpreadsheetApp.getUi().alert('Нет последнего файла.'); return; }
  runFullPipeline(fileId, name || '(без имени)');
}

function openUploadSidebar() { showUploadSidebar(); }

function createCopyForNewSkuPrompt() {
  const ui = SpreadsheetApp.getUi();
  const r1 = ui.prompt('Новый SKU', 'Название товара:', ui.ButtonSet.OK_CANCEL);
  if (r1.getSelectedButton() !== ui.Button.OK) return;
  const productName = r1.getResponseText().trim();
  if (!productName) { ui.alert('Не задано'); return; }
  const r2 = ui.prompt('Артикул WB', 'Артикул:', ui.ButtonSet.OK_CANCEL);
  if (r2.getSelectedButton() !== ui.Button.OK) return;
  const ourSku = r2.getResponseText().trim();
  if (!ourSku) { ui.alert('Не задано'); return; }
  const log = newLogContext_('createCopyForNewSku: ' + productName);
  try {
    const copy = createSpreadsheetCopy_({ productName, ourSku }, log);
    log.flush('OK');
    ui.alert('✅ Готово', 'Создана: ' + copy.name + '\n' + copy.url, ui.ButtonSet.OK);
  } catch (e) {
    log.error(e.message); log.flush('ERROR');
    ui.alert('Ошибка: ' + e.message);
  }
}

function setupServiceSheets() {
  const ss = getTargetSpreadsheet_();
  const log = newLogContext_('setupServiceSheets');
  try {
    const cfg = getOrCreateSheet_(ss, CONFIG.SERVICE_TABS.CONFIG);
    if (cfg.getLastRow() === 0) {
      cfg.getRange(1, 1, 1, 3).setValues([['Параметр', 'Значение', 'Описание']])
        .setFontWeight('bold').setBackground('#fff2cc');
      const defaults = [
        ['OUR_SKU',             CONFIG.DEFAULTS.OUR_SKU,           'Артикул WB нашего товара'],
        ['OUR_PRODUCT_NAME',    CONFIG.DEFAULTS.OUR_PRODUCT_NAME,  'Название товара'],
        ['MIN_FREQUENCY',       CONFIG.DEFAULTS.MIN_FREQUENCY,     'Минимальная частотность для семядра'],
        ['MISSING_TOP_N',       CONFIG.DEFAULTS.MISSING_TOP_N,     'Сколько top-missing хранить'],
        ['SCORE_WEIGHTS',       JSON.stringify(CONFIG.DEFAULTS.SCORE_WEIGHTS), 'Веса скоринга'],
        ['ARCHIVE_FOLDER_ID',   CONFIG.DEFAULTS.ARCHIVE_FOLDER_ID, 'Папка архива (опц.)'],
        ['AUTOSAVE_ARCHIVE',    CONFIG.DEFAULTS.AUTOSAVE_ARCHIVE,  'TRUE/FALSE'],
        ['KEEP_PREV_DATA',      CONFIG.DEFAULTS.KEEP_PREV_DATA,    'TRUE = накапливать историю'],
        ['MASTER_TEMPLATE_ID',  CONFIG.TARGET.SPREADSHEET_ID,      'ID мастер-шаблона'],
        ['COPIES_FOLDER_ID',    '',                                'Папка для копий'],
        ['CLAUDE_MODEL',        CONFIG.DEFAULTS.CLAUDE_MODEL,      'Модель Claude'],
        ['CLAUDE_MAX_TOKENS',   CONFIG.DEFAULTS.CLAUDE_MAX_TOKENS, 'Лимит токенов ответа'],
        ['DRIVE_INBOX_FOLDER_ID', CONFIG.DEFAULTS.DRIVE_INBOX_FOLDER_ID, 'Inbox папка Маши'],
        ['CURRENT_CARD_STATE_TAB', '_SEO_Draft | 🔴 Сравнение конкурентов', 'Вкладки с текущим состоянием карточки']
      ];
      cfg.getRange(2, 1, defaults.length, 3).setValues(defaults);
      cfg.setColumnWidth(1, 220); cfg.setColumnWidth(2, 280); cfg.setColumnWidth(3, 480);
      cfg.setFrozenRows(1);
    }
    const sw = getOrCreateSheet_(ss, CONFIG.SERVICE_TABS.STOP_WORDS);
    if (sw.getLastRow() === 0) {
      sw.getRange(1, 1).setValue('Стоп-слово').setFontWeight('bold').setBackground('#fce5cd');
      sw.setFrozenRows(1);
      const rows = CONFIG.DEFAULT_STOP_WORDS.map(w => [w]);
      if (rows.length) sw.getRange(2, 1, rows.length, 1).setValues(rows);
    }
    const lg = getOrCreateSheet_(ss, CONFIG.SERVICE_TABS.LOGS);
    if (lg.getLastRow() === 0) {
      lg.getRange(1, 1, 1, 6).setValues([['Дата', 'Файл / событие', 'Статус', 'Длительность мс', 'Шаги', 'Ошибки']])
        .setFontWeight('bold').setBackground('#cfe2f3');
      lg.setFrozenRows(1);
    }
    [CONFIG.SERVICE_TABS.SEMCORE, CONFIG.SERVICE_TABS.MISSING, CONFIG.SERVICE_TABS.DASHBOARD,
     CONFIG.SERVICE_TABS.ARCHIVE_KW, '_Scoring'
    ].forEach(n => getOrCreateSheet_(ss, n));
    Object.values(CONFIG.ADVICE_TABS).forEach(n => {
      const adv = getOrCreateSheet_(ss, n);
      if (adv.getLastRow() === 0) {
        adv.getRange(1, 1).setValue('(Заполнится после кнопки «🪄 Полный пакет рекомендаций»)')
          .setFontStyle('italic').setFontColor('#888');
      }
    });
    log.flush('OK');
    try { SpreadsheetApp.getActive().toast('Служебные листы готовы', 'Setup', 5); } catch (e) {}
  } catch (e) {
    log.error(e.message); log.flush('ERROR'); throw e;
  }
}

function cleanServiceSheets() {
  const ui = SpreadsheetApp.getUi();
  const r = ui.alert('Очистить служебные листы?',
    'Очищу: _SemanticCore, _MissingKeywords, _Scoring, _Dashboard, _KeywordsRaw, _Logs + _Advice_* (кроме Implementation_Tracker).\n_Config, _StopWords останутся.',
    ui.ButtonSet.OK_CANCEL);
  if (r !== ui.Button.OK) return;
  const ss = getTargetSpreadsheet_();
  const toClean = [
    '_SemanticCore', '_MissingKeywords', '_Scoring', '_Dashboard', '_KeywordsRaw', '_Logs',
    CONFIG.ADVICE_TABS.SEO_DRAFT, CONFIG.ADVICE_TABS.AD_STRATEGY,
    CONFIG.ADVICE_TABS.LOGISTICS, CONFIG.ADVICE_TABS.SHELF_STRATEGY,
    CONFIG.ADVICE_TABS.COMPETITOR_ANALYSIS, CONFIG.ADVICE_TABS.MANUAL_REVIEW,
    CONFIG.ADVICE_TABS.KEYWORD_PRIORITY, CONFIG.ADVICE_TABS.LAST_RAW
  ];
  toClean.forEach(n => {
    const sh = ss.getSheetByName(n);
    if (sh) { try { sh.clear(); SpreadsheetApp.flush(); } catch (e) {} }
  });
  ui.alert('Очищено.');
}
