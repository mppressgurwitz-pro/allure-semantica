/**
 * 06_Semantics.gs
 * Семантическое ядро + missing keywords.
 */

function buildSemanticCore_(cleanedKeywords, log) {
  const map = {};
  Object.keys(cleanedKeywords).forEach(sku => {
    cleanedKeywords[sku].forEach(it => {
      const key = it.normalized;
      if (!map[key]) {
        map[key] = {
          normalized: key, original: it.keyword, totalFreq: 0,
          ourFreq: 0, competitorsFreq: 0, ourCart: 0, ourOrder: 0,
          bestCompetitorCart: 0, bestCompetitorOrder: 0,
          sources: new Set(), ourPresent: false
        };
      }
      const e = map[key];
      e.totalFreq += it.freq;
      e.sources.add(String(sku));
      if (it.isOurs) {
        e.ourFreq += it.freq;
        e.ourCart = Math.max(e.ourCart, it.cart || 0);
        e.ourOrder = Math.max(e.ourOrder, it.order || 0);
        e.ourPresent = true;
      } else {
        e.competitorsFreq += it.freq;
        e.bestCompetitorCart = Math.max(e.bestCompetitorCart, it.cart || 0);
        e.bestCompetitorOrder = Math.max(e.bestCompetitorOrder, it.order || 0);
      }
    });
  });
  const arr = Object.values(map).map(e => ({
    normalized: e.normalized, original: e.original, totalFreq: e.totalFreq,
    ourFreq: e.ourFreq, competitorsFreq: e.competitorsFreq,
    ourCart: e.ourCart, ourOrder: e.ourOrder,
    bestCompetitorCart: e.bestCompetitorCart, bestCompetitorOrder: e.bestCompetitorOrder,
    sources: Array.from(e.sources).sort().join(', '), ourPresent: e.ourPresent
  }));
  arr.sort((a, b) => b.totalFreq - a.totalFreq);
  log.step('🧠 SemCore: ' + arr.length);
  return arr;
}

function writeSemanticCore_(semCore, log) {
  const ss = getTargetSpreadsheet_();
  const sh = getOrCreateSheet_(ss, CONFIG.SERVICE_TABS.SEMCORE);
  sh.clear();
  const headers = ['Запрос нормализ.','Оригинал','Сумм. частота','Частота наш','Частота конк.','Наш?',
    'CR корзину наш','CR заказ наш','CR корзину лучш. конк.','CR заказ лучш. конк.','Источники'];
  sh.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold').setBackground('#fff2cc');
  if (semCore.length) {
    const rows = semCore.map(e => [e.normalized, e.original, e.totalFreq, e.ourFreq, e.competitorsFreq,
      e.ourPresent ? '✅' : '—', e.ourCart, e.ourOrder, e.bestCompetitorCart, e.bestCompetitorOrder, e.sources]);
    writeChunked_(sh, 2, 1, rows, log, 'SemCore');
  }
  sh.setFrozenRows(1);
}

function findMissingKeywords_(cleanedKeywords, log) {
  const ourSku = String(getParam_('OUR_SKU', CONFIG.DEFAULTS.OUR_SKU));
  const ourSet = new Set();
  (cleanedKeywords[ourSku] || []).forEach(it => ourSet.add(it.normalized));
  const competitorAgg = {};
  Object.keys(cleanedKeywords).forEach(sku => {
    if (String(sku) === ourSku) return;
    cleanedKeywords[sku].forEach(it => {
      const k = it.normalized;
      if (!competitorAgg[k]) {
        competitorAgg[k] = { normalized: k, original: it.keyword, freq: 0, bestCart: 0, bestOrder: 0, skus: new Set() };
      }
      const e = competitorAgg[k];
      e.freq += it.freq;
      e.bestCart = Math.max(e.bestCart, it.cart || 0);
      e.bestOrder = Math.max(e.bestOrder, it.order || 0);
      e.skus.add(String(sku));
    });
  });
  const missing = [];
  Object.values(competitorAgg).forEach(e => {
    if (!ourSet.has(e.normalized)) {
      missing.push({
        normalized: e.normalized, original: e.original, competitorFreq: e.freq,
        bestCart: e.bestCart, bestOrder: e.bestOrder,
        skus: Array.from(e.skus).sort().join(', ')
      });
    }
  });
  missing.sort((a, b) => b.competitorFreq - a.competitorFreq);
  const topN = Number(getParam_('MISSING_TOP_N', CONFIG.DEFAULTS.MISSING_TOP_N)) || 100;
  const sliced = missing.slice(0, topN);
  log.step('🔍 Missing: ' + missing.length + ' → top ' + sliced.length);
  return sliced;
}

function writeMissingKeywords_(missing, log) {
  const ss = getTargetSpreadsheet_();
  const sh = getOrCreateSheet_(ss, CONFIG.SERVICE_TABS.MISSING);
  sh.clear();
  const headers = ['Запрос норм.','Оригинал','Частота конк.','Лучший CR корз. %','Лучший CR зак. %','Конкуренты','Приоритет'];
  sh.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold').setBackground('#fce5cd');
  if (missing.length) {
    const maxFreq = missing[0].competitorFreq || 1;
    const rows = missing.map(e => {
      const score = (e.competitorFreq / maxFreq) * (1 + (e.bestOrder || 0) / 100);
      let prio = '🟢 Low';
      if (score >= 0.6) prio = '🔴 High'; else if (score >= 0.3) prio = '🟡 Medium';
      return [e.normalized, e.original, e.competitorFreq, e.bestCart, e.bestOrder, e.skus, prio];
    });
    writeChunked_(sh, 2, 1, rows, log, 'Missing');
  }
  sh.setFrozenRows(1);
}

function recomputeMissingOnly() {
  const log = newLogContext_('recomputeMissingOnly');
  try {
    const reb = rebuildCleanedFromRaw_(log);
    writeMissingKeywords_(findMissingKeywords_(reb, log), log);
    log.flush('OK');
  } catch (e) { log.error(e.message); log.flush('ERROR'); throw e; }
}
