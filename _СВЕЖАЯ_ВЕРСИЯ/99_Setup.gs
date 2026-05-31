/**
 * 99_Setup.gs
 * ============================================================================
 * Идемпотентная инициализация служебных листов и листов рекомендаций.
 *
 * v2: добавлены _Advice_* вкладки. cleanServiceSheets() НЕ трогает
 *     _Advice_Implementation_Tracker (там ручные чекбоксы внедрения).
 * ============================================================================
 */

function setupServiceSheets() {
  const ss = getTargetSpreadsheet_();

  // _Config
  const cfg = getOrCreateSheet_(ss, CONFIG.SERVICE_TABS.CONFIG);
  if (cfg.getLastRow() === 0) {
    cfg.getRange(1, 1, 1, 3).setValues([['Параметр', 'Значение', 'Описание']])
      .setFontWeight('bold').setBackground('#fff2cc');
    const defaults = [
      ['OUR_SKU',             CONFIG.DEFAULTS.OUR_SKU,           'Артикул WB нашего товара (наш SKU)'],
      ['OUR_PRODUCT_NAME',    CONFIG.DEFAULTS.OUR_PRODUCT_NAME,  'Название нашего товара (только для дашборда)'],
      ['MIN_FREQUENCY',       CONFIG.DEFAULTS.MIN_FREQUENCY,     'Минимальная частотность запроса для попадания в семядро'],
      ['MISSING_TOP_N',       CONFIG.DEFAULTS.MISSING_TOP_N,     'Сколько top-missing keywords хранить в _MissingKeywords'],
      ['SCORE_WEIGHTS',       JSON.stringify(CONFIG.DEFAULTS.SCORE_WEIGHTS), 'Веса скоринга в JSON: {freq, cart, order}'],
      ['ARCHIVE_FOLDER_ID',   CONFIG.DEFAULTS.ARCHIVE_FOLDER_ID, 'ID папки Drive для архива конвертированных XLSX (опционально)'],
      ['AUTOSAVE_ARCHIVE',    CONFIG.DEFAULTS.AUTOSAVE_ARCHIVE,  'TRUE/FALSE — сохранять ли GS-копию в архив'],
      ['KEEP_PREV_DATA',      CONFIG.DEFAULTS.KEEP_PREV_DATA,    'TRUE = накапливать историю в _KeywordsRaw, FALSE = перезаписывать'],
      ['MASTER_TEMPLATE_ID',  CONFIG.TARGET.SPREADSHEET_ID,      'ID мастер-шаблона. Если пусто — берётся текущая таблица'],
      ['COPIES_FOLDER_ID',    '',                                'ID папки Drive, куда складывать копии для новых SKU. Пусто = в ту же папку, где мастер'],
      ['CLAUDE_MODEL',        CONFIG.DEFAULTS.CLAUDE_MODEL,      'Модель Claude для генерации SEO/Ad/Logistics-рекомендаций'],
      ['CLAUDE_MAX_TOKENS',   CONFIG.DEFAULTS.CLAUDE_MAX_TOKENS, 'Лимит токенов в ответе Claude (обычно 8000)']
    ];
    cfg.getRange(2, 1, defaults.length, 3).setValues(defaults);
    cfg.setColumnWidth(1, 220); cfg.setColumnWidth(2, 280); cfg.setColumnWidth(3, 480);
    cfg.setFrozenRows(1);
  }

  // _StopWords
  const sw = getOrCreateSheet_(ss, CONFIG.SERVICE_TABS.STOP_WORDS);
  if (sw.getLastRow() === 0) {
    sw.getRange(1, 1).setValue('Стоп-слово (одно слово или фраза)').setFontWeight('bold').setBackground('#fce5cd');
    sw.setFrozenRows(1);
    sw.setColumnWidth(1, 320);
    const rows = CONFIG.DEFAULT_STOP_WORDS.map(w => [w]);
    if (rows.length) sw.getRange(2, 1, rows.length, 1).setValues(rows);
  }

  // _Logs
  const lg = getOrCreateSheet_(ss, CONFIG.SERVICE_TABS.LOGS);
  if (lg.getLastRow() === 0) {
    lg.getRange(1, 1, 1, 6).setValues([['Дата', 'Файл / событие', 'Статус', 'Длительность, мс', 'Шаги', 'Ошибки']])
      .setFontWeight('bold').setBackground('#cfe2f3');
    lg.setFrozenRows(1);
    lg.setColumnWidth(1, 160); lg.setColumnWidth(2, 320); lg.setColumnWidth(5, 600); lg.setColumnWidth(6, 360);
  }

  // Служебные пустые
  [CONFIG.SERVICE_TABS.SEMCORE, CONFIG.SERVICE_TABS.MISSING, CONFIG.SERVICE_TABS.DASHBOARD,
   CONFIG.SERVICE_TABS.ARCHIVE_KW, '_Scoring'
  ].forEach(n => getOrCreateSheet_(ss, n));

  // _Advice_* — пустые, заполнятся при «Сделать семантику + SEO»
  Object.values(CONFIG.ADVICE_TABS).forEach(n => {
    const adv = getOrCreateSheet_(ss, n);
    if (adv.getLastRow() === 0) {
      adv.getRange(1, 1).setValue('(Заполнится после нажатия «🪄 Сделать семантику + SEO» в меню)')
        .setFontStyle('italic').setFontColor('#888888');
    }
  });

  SpreadsheetApp.getActive().toast('Служебные листы и _Advice_* готовы', 'Setup', 5);
}

function cleanServiceSheets() {
  const ui = SpreadsheetApp.getUi();
  const r = ui.alert('Очистить служебные листы?',
    'Будут очищены: _SemanticCore, _MissingKeywords, _Scoring, _Dashboard, _KeywordsRaw, _Logs,\n' +
    'плюс _Advice_SEO_Draft / _Ad_Strategy / _Logistics / _Shelf_Strategy / _Competitor_Analysis.\n\n' +
    '_Config, _StopWords и _Advice_Implementation_Tracker (с ручными чекбоксами) останутся нетронутыми.\nПродолжить?',
    ui.ButtonSet.OK_CANCEL);
  if (r !== ui.Button.OK) return;
  const ss = getTargetSpreadsheet_();
  const toClean = [
    '_SemanticCore', '_MissingKeywords', '_Scoring', '_Dashboard', '_KeywordsRaw', '_Logs',
    CONFIG.ADVICE_TABS.SEO_DRAFT,
    CONFIG.ADVICE_TABS.AD_STRATEGY,
    CONFIG.ADVICE_TABS.LOGISTICS,
    CONFIG.ADVICE_TABS.SHELF_STRATEGY,
    CONFIG.ADVICE_TABS.COMPETITOR_ANALYSIS
    // _Advice_Implementation_Tracker НЕ трогаем
  ];
  toClean.forEach(n => {
    const sh = ss.getSheetByName(n);
    if (sh) sh.clear();
  });
  ui.alert('Очищено. _Advice_Implementation_Tracker оставлен с историей чекбоксов.');
}

function getOrCreateSheet_(ss, name) {
  return ss.getSheetByName(name) || ss.insertSheet(name);
}
