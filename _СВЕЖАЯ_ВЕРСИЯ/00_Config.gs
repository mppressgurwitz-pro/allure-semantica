/**
 * 00_Config.gs
 * ============================================================================
 * Единая точка конфигурации. Все имена листов, GID, диапазоны, веса скоринга,
 * стоп-слова и идентификаторы хранятся либо здесь (статичные дефолты),
 * либо в листе "_Config" (изменяемые маркетологом).
 * НЕ ТРОГАТЬ существующие GID и формулы целевой таблицы.
 *
 * v2: добавлены вкладки _Advice_* для рекомендаций (SEO, реклама, логистика,
 *     полки, конкуренты, трекер внедрения).
 * ============================================================================
 */

const CONFIG = {

  // ── ЦЕЛЕВАЯ ТАБЛИЦА ────────────────────────────────────────────────────────
  TARGET: {
    SCOPE_TO_BOUND_SS: true,
    SPREADSHEET_ID: '1u0rZB7FL5Tb69G-OiPEvKLTBAWp42aXS97KWeGyaDaA'
  },

  // ── ВКЛАДКИ ШАБЛОНА (имена + GID для контроля) ─────────────────────────────
  TEMPLATE_TABS: {
    POKAZATELI:        { name: '🟡 Показатели (вставка)',         gid: 1423033131, pasteAt: 'C1', clearFromCol: 3 },
    ZAPROSY:           { name: '🟡 Запросы (вставка)',             gid: 1902279302, pasteAt: 'B2', clearFromCol: 1 },
    SKLADY:            { name: '🟡 Склады и регионы (вставка)',    gid: 1367146370, pasteAt: 'A1', clearFromCol: 1 },
    MG_CLUSTERS:       { name: '🟡 Вставка МГ кластера',            gid: null,       pasteAt: 'A1', clearFromCol: 1 },
    MG_SHELVES:        { name: '🟡 Вставка МГ полки',               gid: null,       pasteAt: 'A1', clearFromCol: 1 },
    SRAVNENIE:         { name: '🔴 Сравнение конкурентов',          gid: null,       readonly: true },
    // Опциональный вход для пожеланий по рекламной полке.
    // Если вкладка есть — скрипт её ПРОЧТЁТ как контекст для рекомендаций
    // (никогда не перезаписывает). Если её нет — без неё.
    AD_SHELF_INPUT:    { name: 'выбор РП',                         gid: null,       readonly: true, optional: true }
  },

  // ── СЛУЖЕБНЫЕ ВКЛАДКИ (создаются автоматически, если их нет) ───────────────
  SERVICE_TABS: {
    CONFIG:     '_Config',
    LOGS:       '_Logs',
    STOP_WORDS: '_StopWords',
    SEMCORE:    '_SemanticCore',
    MISSING:    '_MissingKeywords',
    DASHBOARD:  '_Dashboard',
    ARCHIVE_KW: '_KeywordsRaw'
  },

  // ── ВКЛАДКИ С РЕКОМЕНДАЦИЯМИ ОТ CLAUDE ─────────────────────────────────────
  ADVICE_TABS: {
    SEO_DRAFT:           '_Advice_SEO_Draft',
    AD_STRATEGY:         '_Advice_Ad_Strategy',
    LOGISTICS:           '_Advice_Logistics',
    SHELF_STRATEGY:      '_Advice_Shelf_Strategy',
    COMPETITOR_ANALYSIS: '_Advice_Competitor_Analysis',
    IMPLEMENTATION:      '_Advice_Implementation_Tracker'
  },

  // ── ИМЕНА ЛИСТОВ ВНУТРИ XLSX-ВЫГРУЗКИ WB ───────────────────────────────────
  WB_SHEETS: {
    OBSCHAYA:     'Общая информация',
    METRIKI:      'Метрики',
    POKAZATELI:   'Показатели',
    KW_VSE:       'Поисковые запросы по всем ар',
    KW_PER_SKU:   'Поисковые запросы по', // широкий матчинг
    SKLADY:       'Склады и регионы'
  },

  // ── ДЕФОЛТНЫЕ ПАРАМЕТРЫ ────────────────────────────────────────────────────
  DEFAULTS: {
    OUR_SKU: '445361666',
    OUR_PRODUCT_NAME: 'Шампунь Савач против перхоти 1 литр (SH0003L)',
    MIN_FREQUENCY: 50,
    SCORE_WEIGHTS: {
      freq: 0.45,
      cart: 0.25,
      order: 0.30
    },
    MISSING_TOP_N: 100,
    AUTOSAVE_ARCHIVE: true,
    ARCHIVE_FOLDER_ID: '',
    KEEP_PREV_DATA: false,
    // Модель Claude по умолчанию
    CLAUDE_MODEL: 'claude-sonnet-4-5-20250929',
    CLAUDE_MAX_TOKENS: 8000
  },

  // ── СТОП-СЛОВА ПО УМОЛЧАНИЮ ────────────────────────────────────────────────
  DEFAULT_STOP_WORDS: [
    'аргинин','салициловая кислота','открывашка для консервов','гель для душа','гель',
    'консервов','клиар','clear','dove','head and shoulders','head&shoulders','хедэндшолдерс',
    'низкая цена','распродажа','скидка','доставка','оплата','купон','промокод',
    'бесплатно','хорошие отзывы','оригинал','подарок','премиум','бренд'
  ],

  // ── РЕГЭКСПЫ ОЧИСТКИ ───────────────────────────────────────────────────────
  CLEAN: {
    PUNCT_RE:  /[^\p{L}\p{N}\s\-]/gu,
    MULTISPACE_RE: /\s+/g
  },

  // ── ЛИМИТЫ И БАТЧИНГ ───────────────────────────────────────────────────────
  LIMITS: {
    MAX_KEYWORDS_PER_SKU: 5000,
    BATCH_ROWS: 1000,
    MAX_LOG_ROWS: 500,
    SHEET_WRITE_CHUNK: 300
  },

  // ── ИМЕНА ВНУТРЕННИХ КЛЮЧЕЙ PROPERTIES ─────────────────────────────────────
  PROP_KEYS: {
    LAST_RUN: 'LAST_RUN_ISO',
    LAST_FILE: 'LAST_FILE_ID',
    LAST_FILE_NAME: 'LAST_FILE_NAME',
    LAST_STATUS: 'LAST_STATUS',
    LAST_DURATION_MS: 'LAST_DURATION_MS',
    CLAUDE_API_KEY: 'CLAUDE_API_KEY'
  },

  // ── СЛУЖЕБНОЕ ────────────────────────────────────────────────────────────
  MENU_TITLE: '🤖 Конкурентный анализ',
  VERSION: '2.0.0'
};

/**
 * Возвращает целевой Spreadsheet с учётом override-механизма.
 */
function getTargetSpreadsheet_() {
  try {
    const ovr = PropertiesService.getScriptProperties().getProperty('__OVERRIDE_TARGET_SS_ID__');
    if (ovr) return SpreadsheetApp.openById(ovr);
  } catch (e) {}
  if (CONFIG.TARGET.SCOPE_TO_BOUND_SS) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (ss) return ss;
  }
  return SpreadsheetApp.openById(CONFIG.TARGET.SPREADSHEET_ID);
}

/**
 * Получить значение из листа _Config по ключу с фолбэком на DEFAULTS.
 */
function getParam_(key, fallback) {
  const ss = getTargetSpreadsheet_();
  const sh = ss.getSheetByName(CONFIG.SERVICE_TABS.CONFIG);
  if (!sh) return (fallback !== undefined) ? fallback : null;
  const data = sh.getRange(2, 1, Math.max(sh.getLastRow() - 1, 0), 2).getValues();
  for (let i = 0; i < data.length; i++) {
    if (String(data[i][0]).trim() === key) {
      const v = data[i][1];
      if (v === '' || v === null) return fallback;
      return v;
    }
  }
  return (fallback !== undefined) ? fallback : null;
}

/**
 * Загрузить стоп-слова из листа _StopWords (lowercase, trimmed).
 */
function getStopWords_() {
  const ss = getTargetSpreadsheet_();
  const sh = ss.getSheetByName(CONFIG.SERVICE_TABS.STOP_WORDS);
  if (!sh || sh.getLastRow() < 2) return CONFIG.DEFAULT_STOP_WORDS.map(s => s.toLowerCase());
  const values = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues()
    .map(r => String(r[0] || '').trim().toLowerCase())
    .filter(s => s.length > 0);
  return values;
}
