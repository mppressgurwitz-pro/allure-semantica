/**
 * 00_Config.gs
 * ============================================================================
 * Единая точка конфигурации. Все имена листов, GID, диапазоны, веса скоринга,
 * стоп-слова и идентификаторы хранятся либо здесь (статичные дефолты),
 * либо в листе "_Config" (изменяемые маркетологом).
 * НЕ ТРОГАТЬ существующие GID и формулы целевой таблицы.
 * ============================================================================
 */

const CONFIG = {

  // ── ЦЕЛЕВАЯ ТАБЛИЦА ────────────────────────────────────────────────────────
  // Скрипт привязан к конкретному файлу. Если SCOPE_TO_BOUND_SS=true,
  // используется текущая (контейнерная) таблица — это рекомендованный режим.
  TARGET: {
    SCOPE_TO_BOUND_SS: true,
    // Fallback ID — на случай если скрипт запускают standalone.
    // Дефолт указывает на актуальный мастер-шаблон Марии (рабочая таблица).
    SPREADSHEET_ID: '1u0rZB7FL5Tb69G-OiPEvKLTBAWp42aXS97KWeGyaDaA'
  },

  // ── ВКЛАДКИ ШАБЛОНА (имена + GID для контроля) ─────────────────────────────
  TEMPLATE_TABS: {
    POKAZATELI:        { name: '🟡 Показатели (вставка)',         gid: 1423033131, pasteAt: 'C1', clearFromCol: 3 },
    ZAPROSY:           { name: '🟡 Запросы (вставка)',             gid: 1902279302, pasteAt: 'B2', clearFromCol: 1 },
    SKLADY:            { name: '🟡 Склады и регионы (вставка)',    gid: 1367146370, pasteAt: 'A1', clearFromCol: 1 },
    MG_CLUSTERS:       { name: '🟡 Вставка МГ кластера',            gid: null,       pasteAt: 'A1', clearFromCol: 1 },
    MG_SHELVES:        { name: '🟡 Вставка МГ полки',               gid: null,       pasteAt: 'A1', clearFromCol: 1 },
    SRAVNENIE:         { name: '🔴 Сравнение конкурентов',          gid: null,       readonly: true }
  },

  // ── СЛУЖЕБНЫЕ ВКЛАДКИ (создаются автоматически, если их нет) ───────────────
  SERVICE_TABS: {
    CONFIG:     '_Config',         // редактируемые параметры
    LOGS:       '_Logs',           // журнал импортов
    STOP_WORDS: '_StopWords',      // стоп-слова
    SEMCORE:    '_SemanticCore',   // нормализованное семантическое ядро
    MISSING:    '_MissingKeywords',// missing keywords
    DASHBOARD:  '_Dashboard',      // KPI-сводка
    ARCHIVE_KW: '_KeywordsRaw'     // нормализованный сырой массив запросов с источниками
  },

  // ── ИМЕНА ЛИСТОВ ВНУТРИ XLSX-ВЫГРУЗКИ WB ───────────────────────────────────
  // WB обрезает имена листов до 31 символа. Используется .startsWith() матчинг.
  WB_SHEETS: {
    OBSCHAYA:     'Общая информация',
    METRIKI:      'Метрики',
    POKAZATELI:   'Показатели',
    KW_VSE:       'Поисковые запросы по всем ар',
    KW_PER_SKU:   'Поисковые запросы по артикул', // и "2 ", "3 ", "4 ", "5 " префиксы
    SKLADY:       'Склады и регионы'
  },

  // ── ДЕФОЛТНЫЕ ПАРАМЕТРЫ (запишутся в _Config при первом запуске) ───────────
  DEFAULTS: {
    OUR_SKU: '445361666',                    // Наш артикул WB
    OUR_PRODUCT_NAME: 'Шампунь Савач против перхоти 1 литр (SH0003L)',
    MIN_FREQUENCY: 50,                       // Порог частотности для попадания в семядро
    SCORE_WEIGHTS: {
      freq: 0.45,        // вес частотности
      cart: 0.25,        // вес конверсии в корзину
      order: 0.30        // вес конверсии в заказ
    },
    MISSING_TOP_N: 100,                      // Сколько top-missing keywords показывать
    AUTOSAVE_ARCHIVE: true,                  // Сохранять конвертированный GSheet файл в архив
    ARCHIVE_FOLDER_ID: '',                   // ID папки Drive для архива (можно оставить пустым)
    KEEP_PREV_DATA: false                    // Хранить ли предыдущую версию данных в _KeywordsRaw
  },

  // ── СТОП-СЛОВА ПО УМОЛЧАНИЮ (записываются в _StopWords) ────────────────────
  // Маркетолог редактирует список через лист _StopWords без касания кода.
  DEFAULT_STOP_WORDS: [
    // мусорные / нерелевантные категории
    'аргинин','салициловая кислота','открывашка для консервов','гель для душа','гель',
    'консервов','клиар','clear','dove','head and shoulders','head&shoulders','хедэндшолдерс',
    'низкая цена','распродажа','скидка','доставка','оплата','купон','промокод',
    // мужские/женские маркеры (опционально, если хотим вытащить именно "мужские")
    // НЕ включаем по умолчанию: это полезные фасеты
    // общие технические
    'бесплатно','хорошие отзывы','оригинал','подарок','премиум','бренд'
  ],

  // ── РЕГЭКСПЫ ОЧИСТКИ ───────────────────────────────────────────────────────
  CLEAN: {
    // Что вырезать из текста запроса при нормализации
    PUNCT_RE:  /[^\p{L}\p{N}\s\-]/gu,
    MULTISPACE_RE: /\s+/g
  },

  // ── ЛИМИТЫ И БАТЧИНГ ───────────────────────────────────────────────────────
  LIMITS: {
    MAX_KEYWORDS_PER_SKU: 5000,
    BATCH_ROWS: 1000,
    MAX_LOG_ROWS: 500
  },

  // ── ИМЕНА ВНУТРЕННИХ КЛЮЧЕЙ PROPERTIES ─────────────────────────────────────
  PROP_KEYS: {
    LAST_RUN: 'LAST_RUN_ISO',
    LAST_FILE: 'LAST_FILE_ID',
    LAST_FILE_NAME: 'LAST_FILE_NAME',
    LAST_STATUS: 'LAST_STATUS',
    LAST_DURATION_MS: 'LAST_DURATION_MS'
  },

  // ── СЛУЖЕБНОЕ ────────────────────────────────────────────────────────────
  MENU_TITLE: '🤖 Конкурентный анализ',
  VERSION: '1.0.0'
};

/**
 * Возвращает целевой Spreadsheet с учётом override-механизма.
 *
 * Приоритет:
 *   1. Транзитный override (установлен в Copier при работе с копией)
 *   2. Активный (контейнерный) spreadsheet
 *   3. Spreadsheet по фолбэк-ID
 */
function getTargetSpreadsheet_() {
  // 1. Override — приоритетен (используется при работе с копией шаблона)
  try {
    const ovr = PropertiesService.getScriptProperties().getProperty('__OVERRIDE_TARGET_SS_ID__');
    if (ovr) return SpreadsheetApp.openById(ovr);
  } catch (e) {
    // если PropertiesService недоступен — игнорируем
  }
  // 2. Контейнерный
  if (CONFIG.TARGET.SCOPE_TO_BOUND_SS) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (ss) return ss;
  }
  // 3. Фолбэк
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
