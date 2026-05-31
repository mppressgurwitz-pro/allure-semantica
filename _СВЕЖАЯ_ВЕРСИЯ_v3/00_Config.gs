/**
 * 00_Config.gs v3.0
 * Единая точка конфигурации.
 */

const CONFIG = {
  TARGET: {
    SCOPE_TO_BOUND_SS: true,
    SPREADSHEET_ID: '16OBo1Enr19SFOuLm2pNy_JagMFppNqXKsYlUbLw_8S0'
  },

  TEMPLATE_TABS: {
    POKAZATELI:        { name: '🟡 Показатели (вставка)',         gid: 1423033131, pasteAt: 'C1', clearFromCol: 3 },
    ZAPROSY:           { name: '🟡 Запросы (вставка)',             gid: 1902279302, pasteAt: 'B2', clearFromCol: 1 },
    SKLADY:            { name: '🟡 Склады и регионы (вставка)',    gid: 1367146370, pasteAt: 'A1', clearFromCol: 1 },
    MG_CLUSTERS:       { name: '🟡 Вставка МГ кластера',            gid: null,       pasteAt: 'A1', clearFromCol: 1 },
    MG_SHELVES:        { name: '🟡 Вставка МГ полки',               gid: null,       pasteAt: 'A1', clearFromCol: 1 },
    SRAVNENIE:         { name: '🔴 Сравнение конкурентов',          gid: null,       readonly: true },
    AD_SHELF_INPUT:    { name: 'выбор РП',                         gid: null,       readonly: true, optional: true }
  },

  SERVICE_TABS: {
    CONFIG:     '_Config',
    LOGS:       '_Logs',
    STOP_WORDS: '_StopWords',
    SEMCORE:    '_SemanticCore',
    MISSING:    '_MissingKeywords',
    DASHBOARD:  '_Dashboard',
    ARCHIVE_KW: '_KeywordsRaw'
  },

  ADVICE_TABS: {
    SEO_DRAFT:           '_Advice_SEO_Draft',
    AD_STRATEGY:         '_Advice_Ad_Strategy',
    LOGISTICS:           '_Advice_Logistics',
    SHELF_STRATEGY:      '_Advice_Shelf_Strategy',
    COMPETITOR_ANALYSIS: '_Advice_Competitor_Analysis',
    IMPLEMENTATION:      '_Advice_Implementation_Tracker',
    MANUAL_REVIEW:       '_Advice_Manual_Review',
    KEYWORD_PRIORITY:    '_Advice_Keyword_Priority',
    LAST_RAW:            '_Advice_Last_Raw'
  },

  WB_SHEETS: {
    OBSCHAYA:     'Общая информация',
    METRIKI:      'Метрики',
    POKAZATELI:   'Показатели',
    KW_VSE:       'Поисковые запросы по всем ар',
    KW_PER_SKU:   'Поисковые запросы по',
    SKLADY:       'Склады и регионы'
  },

  BRAND_REGISTRY: {
    'SAVACE & HERBS': {
      variants: ['SAVACE & HERBS','SAVACE HERBS','SAVACE','Savage&Herbs','Savage','Савач','Savach'],
      default_gender: 'мужской'
    },
    'PressGurwitz': {
      variants: ['PressGurwitz','Press Gurwitz','Press Gurwitz Perfumerie','Пресс Гурвитц','Пресс Гурвиц'],
      default_gender: 'унисекс'
    },
    'Glow Witch': {
      variants: ['Glow Witch','GlowWitch','Глоу Витч','Глоувитч'],
      default_gender: 'женский'
    }
  },

  // v3.2 (14.05.2026) — модель «RED = hard block, AMBER = advisory».
  //
  // RED = ТОЛЬКО прямые медицинские заявления и фармакология. Эти keywords НЕ
  // попадают в промпт Claude вообще. Лечит акне, убивает грибок, диагнозы.
  //
  // AMBER = рекомендательный режим. Keywords с этими словами:
  //   - ИДУТ в accepted (Claude может их использовать в черновике)
  //   - ОДНОВРЕМЕННО пишутся в _Advice_Manual_Review для финальной проверки
  //   - Если в INCI/approved_claims есть подтверждение — review_status = supported
  //
  // Базовые косметические действия — очищает, увлажняет, питает, восстанавливает,
  // мягкий, нежный, шелковистый, блеск, объём, густота, рост волос, против сухости —
  // НЕ В СПИСКАХ. Они разрешены свободно, как у конкурентов.
  SAFETY_RED_LEXICON: [
    // прямое заявление о лечении
    'лечит','лечебный','лечение','исцеляет','исцеление',
    'терапевт','терапевтический','медицинский','фармацевтический',
    // диагнозы (если ключ "лечит акне" — попадает в RED через "лечит")
    'от псориаза','от себорейного дерматита','от грибка','от микоза',
    'от экземы','от дерматита','от алопеции','от лишая',
    // фармакологические действия
    'убивает грибок','уничтожает грибок','противогрибковый','антимикотический',
    'бактерицидный','уничтожает бактерии'
  ],
  // AMBER — advisory. Keywords с этими словами идут И в Claude И в Manual_Review.
  // Состав AMBER = (а) клеймы с INCI-валидацией + (б) WB-рискованные суперлативы.
  SAFETY_AMBER_LEXICON: [
    // INCI-проверяемые
    'бессульфатный','безсульфатный','без сульфатов',
    'с кератином','кератиновый','с цинком','с салициловой кислотой','салициловый',
    'без парабенов','без силиконов','безсиликоновый',
    // антибактериальные (НЕ медицинские, но требуют осторожности при WB-модерации)
    'антисептический','антибактериальный','антимикробный',
    // WB-рискованные суперлативы — Claude может использовать (если конкуренты используют),
    // но человек должен проверить, не зарежет ли WB-модерация. В RED не держим:
    // запрет «100% эффект» одинаково жёстко лишает нас языка конкурентов.
    'гарантированный результат','100% эффект','100% защита','100% результат',
    '№1','лучше конкурентов','в 2 раза лучше','в 3 раза',
    'клинически доказано','доказано лабораторно','научно доказано'
  ],
  SENTENCE_START_STOPWORDS: [
    'типа','этот','эта','это','эти','он','она','они',
    'такой','такая','такое','такие','тот','та','те',
    'данный','данная','данное','данные','который','которая','которое','которые'
  ],
  CTA_MARKERS: [
    'купите','купить','закажите','заказать','оформите','оформить',
    'добавьте в корзину','в корзину','успейте','спешите','не упустите',
    'жми','жмите','кликни','кликните'
  ],

  DEFAULTS: {
    OUR_SKU: '445361666',
    OUR_PRODUCT_NAME: 'Шампунь Савач против перхоти 1 литр',
    MIN_FREQUENCY: 50,
    SCORE_WEIGHTS: { freq: 0.45, cart: 0.25, order: 0.30 },
    MISSING_TOP_N: 100,
    AUTOSAVE_ARCHIVE: true,
    ARCHIVE_FOLDER_ID: '',
    KEEP_PREV_DATA: false,
    CLAUDE_MODEL: 'claude-opus-4-6',
    CLAUDE_MAX_TOKENS: 16000,
    DRIVE_INBOX_FOLDER_ID: '1Q65aq4M3YvN4brrKkzyNBTC4irvxLOJf',
    // v3.1: target поднят с 700-1500 до 1800-2500 (фидбэк Маши: 1162 симв — пережали).
    // Hard max остаётся 3000 (правило #6).
    DESC_HARD_MAX: 3000, DESC_TARGET_MIN: 1800, DESC_TARGET_MAX: 2500,
    TITLE_HARD_MAX: 60,  TITLE_TARGET_MIN: 36, TITLE_TARGET_MAX: 58
  },

  DEFAULT_STOP_WORDS: [
    'аргинин','салициловая кислота','открывашка для консервов','гель для душа','гель',
    'консервов','клиар','clear','dove','head and shoulders','head&shoulders',
    'низкая цена','распродажа','скидка','доставка','оплата','купон','промокод',
    'бесплатно','хорошие отзывы','оригинал','подарок','премиум','бренд'
  ],

  CLEAN: { PUNCT_RE: /[^\p{L}\p{N}\s\-]/gu, MULTISPACE_RE: /\s+/g },

  LIMITS: {
    MAX_KEYWORDS_PER_SKU: 5000, BATCH_ROWS: 1000,
    MAX_LOG_ROWS: 500, SHEET_WRITE_CHUNK: 50,
    AUTO_FLOW_TIME_BUDGET_MS: 4 * 60 * 1000
  },

  PROP_KEYS: {
    LAST_RUN: 'LAST_RUN_ISO', LAST_FILE: 'LAST_FILE_ID',
    LAST_FILE_NAME: 'LAST_FILE_NAME', LAST_STATUS: 'LAST_STATUS',
    LAST_DURATION_MS: 'LAST_DURATION_MS', CLAUDE_API_KEY: 'CLAUDE_API_KEY',
    AUTO_FLOW_STATE: 'AUTO_FLOW_STATE'
  },

  MENU_TITLE: '🤖 Конкурентный анализ',
  VERSION: '3.0.0'
};

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

function getStopWords_() {
  const ss = getTargetSpreadsheet_();
  const sh = ss.getSheetByName(CONFIG.SERVICE_TABS.STOP_WORDS);
  if (!sh || sh.getLastRow() < 2) return CONFIG.DEFAULT_STOP_WORDS.map(s => s.toLowerCase());
  return sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues()
    .map(r => String(r[0] || '').trim().toLowerCase()).filter(s => s.length > 0);
}

function detectBrand_(text) {
  const lc = String(text || '').toLowerCase();
  for (const key in CONFIG.BRAND_REGISTRY) {
    const entry = CONFIG.BRAND_REGISTRY[key];
    for (const v of entry.variants) {
      if (lc.indexOf(v.toLowerCase()) >= 0) {
        return { key, default_gender: entry.default_gender, variants: entry.variants };
      }
    }
  }
  return null;
}

function getOrCreateSheet_(ss, name) {
  return ss.getSheetByName(name) || ss.insertSheet(name);
}
