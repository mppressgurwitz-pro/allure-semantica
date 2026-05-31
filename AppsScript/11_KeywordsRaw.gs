/**
 * 11_KeywordsRaw.gs
 * ============================================================================
 * Архив "сырых" нормализованных запросов в листе _KeywordsRaw.
 * Нужен для:
 *   1) повторного пересчёта скоринга/missing/дашборда без перезагрузки файла,
 *   2) истории — можно сравнивать предыдущий и текущий запуски.
 * ============================================================================
 */

function archiveKeywordsRaw_(cleanedKeywords, log) {
  const ss = getTargetSpreadsheet_();
  const sh = getOrCreateSheet_(ss, CONFIG.SERVICE_TABS.ARCHIVE_KW);
  const keepPrev = !!getParam_('KEEP_PREV_DATA', CONFIG.DEFAULTS.KEEP_PREV_DATA);

  if (!keepPrev || sh.getLastRow() < 2) {
    sh.clear();
    sh.getRange(1, 1, 1, 11).setValues([[
      'Дата', 'Артикул', 'Наш?', 'Запрос (ориг.)', 'Запрос (нормализ.)',
      'Частота', 'Частота (пред.)', 'CR корзину', 'CR корзину (пред.)', 'CR заказ', 'CR заказ (пред.)'
    ]]).setFontWeight('bold').setBackground('#ead1dc');
    sh.setFrozenRows(1);
  }

  const ts = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
  const out = [];
  Object.keys(cleanedKeywords).forEach(sku => {
    cleanedKeywords[sku].forEach(it => {
      out.push([
        ts, String(sku), it.isOurs ? '✅' : '',
        it.keyword, it.normalized,
        it.freq, it.freqPrev, it.cart, it.cartPrev, it.order, it.orderPrev
      ]);
    });
  });
  if (out.length) {
    sh.getRange(sh.getLastRow() + 1, 1, out.length, 11).setValues(out);
  }
  log.step('🗄 _KeywordsRaw: добавлено ' + out.length + ' записей');
}

/**
 * Восстановить cleanedKeywords из _KeywordsRaw для повторных пересчётов.
 */
function rebuildCleanedFromRaw_(log) {
  const ss = getTargetSpreadsheet_();
  const sh = ss.getSheetByName(CONFIG.SERVICE_TABS.ARCHIVE_KW);
  if (!sh || sh.getLastRow() < 2) {
    throw new Error('Нет данных в ' + CONFIG.SERVICE_TABS.ARCHIVE_KW + '. Сначала загрузите файл WB.');
  }
  const data = sh.getRange(2, 1, sh.getLastRow() - 1, 11).getValues();
  // Берём только последний срез (по самой свежей дате)
  let lastTs = '';
  data.forEach(r => { if (r[0] > lastTs) lastTs = r[0]; });
  const ourSku = String(getParam_('OUR_SKU', CONFIG.DEFAULTS.OUR_SKU));
  const result = {};
  data.forEach(r => {
    if (r[0] !== lastTs) return;
    const sku = String(r[1]);
    if (!result[sku]) result[sku] = [];
    result[sku].push({
      keyword: r[3], normalized: r[4],
      freq: parseNum_(r[5]), freqPrev: parseNum_(r[6]),
      cart: parseNum_(r[7]), cartPrev: parseNum_(r[8]),
      order: parseNum_(r[9]), orderPrev: parseNum_(r[10]),
      isOurs: (sku === ourSku)
    });
  });
  log.step('Reconstructed cleaned keywords из _KeywordsRaw: ' + Object.keys(result).length + ' SKU');
  return result;
}
