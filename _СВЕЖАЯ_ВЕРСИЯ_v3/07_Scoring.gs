/**
 * 07_Scoring.gs
 * Скоринг ключей.
 */

function computeScoring_(cleanedKeywords, log) {
  const w = getParam_('SCORE_WEIGHTS', null) || CONFIG.DEFAULTS.SCORE_WEIGHTS;
  const wf = Number(w.freq) || 0.45, wc = Number(w.cart) || 0.25, wo = Number(w.order) || 0.30;
  let maxFreq = 0;
  Object.keys(cleanedKeywords).forEach(sku => {
    cleanedKeywords[sku].forEach(it => { if (it.freq > maxFreq) maxFreq = it.freq; });
  });
  if (!maxFreq) maxFreq = 1;
  const out = [];
  Object.keys(cleanedKeywords).forEach(sku => {
    cleanedKeywords[sku].forEach(it => {
      const fNorm = it.freq / maxFreq;
      const cNorm = Math.min(1, (it.cart || 0) / 100);
      const oNorm = Math.min(1, (it.order || 0) / 100);
      const score = wf * fNorm + wc * cNorm + wo * oNorm;
      out.push({
        sku: String(sku), keyword: it.keyword, normalized: it.normalized,
        freq: it.freq, cart: it.cart, order: it.order,
        score: Number(score.toFixed(4)), isOurs: it.isOurs
      });
    });
  });
  out.sort((a, b) => b.score - a.score);
  log.step('🧮 Скоринг: ' + out.length);
  return out;
}

function writeScoring_(scored, log) {
  const ss = getTargetSpreadsheet_();
  const sh = getOrCreateSheet_(ss, '_Scoring');
  sh.clear();
  const headers = ['Артикул','Наш?','Запрос норм.','Запрос ориг.','Частота','CR корз %','CR зак %','Score'];
  sh.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold').setBackground('#d9ead3');
  if (scored.length) {
    const rows = scored.map(s => [s.sku, s.isOurs ? '✅' : '', s.normalized, s.keyword, s.freq, s.cart, s.order, s.score]);
    writeChunked_(sh, 2, 1, rows, log, 'Scoring');
  }
  sh.setFrozenRows(1);
}

function recomputeScoringOnly() {
  const log = newLogContext_('recomputeScoringOnly');
  try {
    const reb = rebuildCleanedFromRaw_(log);
    writeScoring_(computeScoring_(reb, log), log);
    log.flush('OK');
  } catch (e) { log.error(e.message); log.flush('ERROR'); throw e; }
}
