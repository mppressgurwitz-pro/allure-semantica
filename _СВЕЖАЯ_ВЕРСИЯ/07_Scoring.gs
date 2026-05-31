/**
 * 07_Scoring.gs
 * ============================================================================
 * Скоринг ключевых слов:
 *    score = freqWeight   * normalize(freq across all keywords)
 *          + cartWeight   * (cart/100)
 *          + orderWeight  * (order/100)
 * ============================================================================
 */

function computeScoring_(cleanedKeywords, log) {
  const w = getParam_('SCORE_WEIGHTS', null) || CONFIG.DEFAULTS.SCORE_WEIGHTS;
  const wf = Number(w.freq)  || CONFIG.DEFAULTS.SCORE_WEIGHTS.freq;
  const wc = Number(w.cart)  || CONFIG.DEFAULTS.SCORE_WEIGHTS.cart;
  const wo = Number(w.order) || CONFIG.DEFAULTS.SCORE_WEIGHTS.order;

  let maxFreq = 0;
  Object.keys(cleanedKeywords).forEach(sku => {
    cleanedKeywords[sku].forEach(it => { if (it.freq > maxFreq) maxFreq = it.freq; });
  });
  if (!maxFreq) maxFreq = 1;

  const out = [];
  Object.keys(cleanedKeywords).forEach(sku => {
    cleanedKeywords[sku].forEach(it => {
      const fNorm = it.freq / maxFreq;
      const cNorm = Math.min(1, (it.cart  || 0) / 100);
      const oNorm = Math.min(1, (it.order || 0) / 100);
      const score = wf * fNorm + wc * cNorm + wo * oNorm;
      out.push({
        sku: String(sku),
        keyword: it.keyword,
        normalized: it.normalized,
        freq: it.freq,
        cart: it.cart,
        order: it.order,
        score: Number(score.toFixed(4)),
        isOurs: it.isOurs
      });
    });
  });
  out.sort((a, b) => b.score - a.score);
  log.step('🧮 Скоринг: ' + out.length + ' пар (артикул, запрос); веса freq=' + wf + ' cart=' + wc + ' order=' + wo);
  return out;
}

function writeScoring_(scored, log) {
  const ss = getTargetSpreadsheet_();
  const name = '_Scoring';
  const sh = getOrCreateSheet_(ss, name);
  sh.clear();
  const headers = ['Артикул', 'Наш?', 'Запрос (нормализ.)', 'Запрос (ориг.)', 'Частота', 'CR корзину, %', 'CR заказ, %', 'Score'];
  sh.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold').setBackground('#d9ead3');
  if (scored.length) {
    const rows = scored.map(s => [s.sku, s.isOurs ? '✅' : '', s.normalized, s.keyword, s.freq, s.cart, s.order, s.score]);
    writeChunked_(sh, 2, 1, rows, log, 'Scoring');
  }
  sh.setFrozenRows(1);
  log.step('💾 Записано ' + scored.length + ' строк в _Scoring');
}

function recomputeScoringOnly() {
  const log = newLogContext_('manual: recomputeScoringOnly');
  try {
    const reb = rebuildCleanedFromRaw_(log);
    const scored = computeScoring_(reb, log);
    writeScoring_(scored, log);
    log.flush('OK');
    SpreadsheetApp.getActive().toast('Скоринг пересчитан', 'OK', 5);
  } catch (e) { log.error('Ошибка: ' + e.message); log.flush('ERROR'); throw e; }
}
