/**
 * WBSyncLib — конфигурация WB PULL/PUSH.
 * API-ключи только в Script Properties: WB_API_KEY_ASMUS, WB_API_KEY_QUANTUM.
 */

var WBSYNC_CONFIG = {
  DRAFT_SHEET: '_Advice_SEO_Draft',
  CONFIG_SHEET: '_Config',
  CHAR_DICT_SHEET: '_WB_Char_Dict',
  SYNC_LOG_SHEET: '_Sync_Log',

  TECH_START_MARKER: '▼ ТЕХНИЧЕСКИЙ БЛОК',
  TECH_END_MARKER: '▲ Конец технического блока',

  WB_API_GET: 'https://content-api.wildberries.ru/content/v2/get/cards/list',
  WB_API_UPDATE: 'https://content-api.wildberries.ru/content/v2/cards/update',

  CABINETS: {
    ASMUS: 'Asmus',
    QUANTUM: 'Quantum',
    OZON_ASMUS: 'OZON_Asmus',
    OZON_QUANTUM: 'OZON_Quantum'
  },

  /** Колонка «Новое» в _Advice_SEO_Draft (1-based) для схемы 4LK */
  CABINET_NEW_COL: {
    'Asmus': 3,
    'Quantum': 4,
    'OZON_Asmus': 5,
    'OZON_Quantum': 6
  },

  /** Dev-override: не коммитить реальные JWT. Пустая строка = только Properties. */
  WB_API_KEY_ASMUS_PLACEHOLDER: '',
  WB_API_KEY_QUANTUM_PLACEHOLDER: '',

  CATEGORY_FALLBACKS: {
    'Туалетная вода': 'Парфюмерная вода'
  },

  WB_CATEGORIES: [
    'Гели', 'Дезодоранты', 'Духи', 'Кондиционеры для волос', 'Лосьоны',
    'Мыло косметическое', 'Парфюм для дома', 'Парфюмерная вода', 'Пилинг',
    'Саше ароматические', 'Соль для ванн', 'Спреи', 'Шампуни',
    'Косметические наборы для ухода'
  ],

  /** Базовые поля карточки — всегда участвуют в PUSH если заполнены в col C */
  BASIC_CARD_FIELDS: [
    'Title (наименование)', 'Наименование', 'Описание',
    'ТНВЭД', 'ИКПУ', 'Ставка НДС', 'Код упаковки', 'Тип доставки', 'NTIN',
    'Длина упаковки', 'Ширина упаковки', 'Высота упаковки', 'Вес с упаковкой (кг)',
    'Вес товара без упаковки (г)', 'Высота предмета', 'Ширина предмета',
    'Баркод', 'Состав', 'Торговое наименование',
    'Номер декларации соответствия', 'Дата регистрации сертификата/декларации',
    'Дата окончания действия сертификата/декларации', 'Номер сертификата соответствия',
    'Свидетельство о регистрации СГР'
  ],

  SEO_FIELD_MAP: {
    'Объём': 'Объем товара',
    'Эффект': 'Особенности косметики',
    'Назначение': 'Назначение косметического средства',
    'Тип средства': 'Вид пилинга',
    'Формат': 'Формат пилинга'
  },

  RETRY_MAX: 5,
  RETRY_BASE_MS: 1000,
  FULL_SCAN_MAX_PAGES: 30,
  FULL_SCAN_PAGE_SIZE: 100,

  DOC_ROW_PATTERN: /Блок для скрипта|редактируемо|▼|▲|^—/
};
