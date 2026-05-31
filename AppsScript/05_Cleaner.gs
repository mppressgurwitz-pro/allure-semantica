/**
 * 05_Cleaner.gs
 * ============================================================================
 * Нормализация ключевых слов и фильтрация по стоп-словам / минимальной частоте.
 * Возвращает структуру по каждому SKU: {keyword, freq, freqPrev, cart, order, isOurs}
 * ============================================================================
 */

function cleanAllKeywords_(wbReport, log) {
  const stopWords = getStopWords_();
  const minFreq   = Number(getParam_('MIN_FREQUENCY', CONFIG.DEFAULTS.MIN_FREQUENCY)) || 0;
  const ourSku    = String(wbReport.ourSku);

  const result = {};   // sku → [{keyword, normalized, freq, freqPrev, cart, cartPrev, order, orderPrev, isOurs}]
  let totalIn = 0, totalOut = 0;

  Object.keys(wbReport.keywordsBySku).forEach(sku => {
    const block = wbReport.keywordsBySku[sku];
    const cleaned = [];
    block.rows.forEach(row => {
      totalIn++;
      const kwRaw   = row[0];
      const freq    = parseNum_(row[1]);
      const freqPrv = parseNum_(row[2]);
      const cart    = parseNum_(row[3]);
      const cartPrv = parseNum_(row[4]);
      const order   = parseNum_(row[5]);
      const orderPrv= parseNum_(row[6]);
      const norm    = normalizeKeyword_(kwRaw);
      if (!norm) return;
      if (containsStop_(norm, stopWords)) return;
      if (freq < minFreq) return;
      cleaned.push({
        keyword: String(kwRaw || '').trim(),
        normalized: norm,
        freq, freqPrev: freqPrv,
        cart, cartPrev: cartPrv,
        order, orderPrev: orderPrv,
        isOurs: (String(sku) === ourSku)
      });
      totalOut++;
    });
    // Дедупликация на уровне нормализованного запроса (на случай повторов)
    const dedup = {};
    cleaned.forEach(it => {
      const k = it.normalized;
      if (!dedup[k] || dedup[k].freq < it.freq) dedup[k] = it;
    });
    result[sku] = Object.values(dedup);
  });

  log.step('🧹 Нормализация: вход ' + totalIn + ' → выход ' + totalOut +
           ' (стоп-слов: ' + stopWords.length + ', min freq=' + minFreq + ')');
  return result;
}

function normalizeKeyword_(s) {
  if (s === null || s === undefined) return '';
  let v = String(s).toLowerCase().trim();
  if (!v) return '';
  // Унификация ё → е
  v = v.replace(/ё/g, 'е');
  // Удалить пунктуацию (кроме дефиса и буквенно-цифровых)
  v = v.replace(CONFIG.CLEAN.PUNCT_RE, ' ');
  v = v.replace(CONFIG.CLEAN.MULTISPACE_RE, ' ').trim();
  return v;
}

function containsStop_(normalized, stopWords) {
  // Стоп-слово срабатывает, если оно встречается как отдельное слово или подстрока (для составных)
  for (let i = 0; i < stopWords.length; i++) {
    const sw = stopWords[i];
    if (!sw) continue;
    if (normalized === sw) return true;
    // Подстрока с границами слова
    const re = new RegExp('(^|\\s)' + escapeRe_(sw) + '(\\s|$)');
    if (re.test(normalized)) return true;
  }
  return false;
}

function parseNum_(v) {
  if (v === null || v === undefined || v === '') return 0;
  if (typeof v === 'number') return v;
  const cleaned = String(v).replace(/[\s ]/g, '').replace(',', '.');
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

function escapeRe_(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
