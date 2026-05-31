/**
 * 99_Setup.gs
 * ============================================================================
 * Идемпотентная инициализация служебных листов: _Config, _StopWords, _Logs,
 * _SemanticCore, _MissingKeywords, _Scoring, _Dashboard, _KeywordsRaw.
 *
 * Безопасно вызывать многократно — существующие листы и значения не трогаются.
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
      ['COPIES_FOLDER_ID',    '',                                'ID папки Drive, куда складывать копии для новых SKU. Пусто = в ту же папку, где мастер']
    ];
    cfg.getRange(2, 1, defaults.length, 3).setValues(defaults);
    cfg.setColumnWidth(1, 200); cfg.setColumnWidth(2, 280); cfg.setColumnWidth(3, 480);
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

  // Прочие — создадутся пустыми (заполняются пайплайном)
  [CONFIG.SERVICE_TABS.SEMCORE, CONFIG.SERVICE_TABS.MISSING, CONFIG.SERVICE_TABS.DASHBOARD,
   CONFIG.SERVICE_TABS.ARCHIVE_KW, '_Scoring'
  ].forEach(n => getOrCreateSheet_(ss, n));

  SpreadsheetApp.getActive().toast('Служебные листы готовы', 'Setup', 5);
}

function cleanServiceSheets() {
  const ui = SpreadsheetApp.getUi();
  const r = ui.alert('Очистить служебные листы?',
    'Будут полностью очищены: _SemanticCore, _MissingKeywords, _Scoring, _Dashboard, _KeywordsRaw, _Logs.\nЛисты _Config и _StopWords останутся нетронутыми.\nПродолжить?',
    ui.ButtonSet.OK_CANCEL);
  if (r !== ui.Button.OK) return;
  const ss = getTargetSpreadsheet_();
  ['_SemanticCore', '_MissingKeywords', '_Scoring', '_Dashboard', '_KeywordsRaw', '_Logs'].forEach(n => {
    const sh = ss.getSheetByName(n);
    if (sh) sh.clear();
  });
  ui.alert('Очищено.');
}

function getOrCreateSheet_(ss, name) {
  return ss.getSheetByName(name) || ss.insertSheet(name);
}
