/**
 * 11_KeywordsRaw.gs
 * ============================================================================
 * Архив "сырых" нормализованных запросов в листе _KeywordsRaw.
 * Используется для повторного пересчёта (рескоринг / missing / дашборд)
 * без перезагрузки исходного файла.
 *
 * v2: rebuildCleanedFromRaw_ берёт ВСЕ записи и дедуплицирует по (sku, normalized)
 *     с приоритетом наиболее свежей записи. Это лечит ситуацию, когда после
 *     нескольких прогонов в архив попадают строки с разными timestamps, и
 *     старая логика "только последний срез по дате" возвращала всего 1 SKU.
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
    writeChunked_(sh, sh.getLastRow() + 1, 1, out, log, 'KeywordsRaw');
  }
  log.step('🗄 _KeywordsRaw: добавлено ' + out.length + ' записей');
}

/**
 * Восстановить cleanedKeywords из _KeywordsRaw — БЕЗ фильтрации по timestamp.
 * Берём ВСЕ строки, дедуплицируем по (sku, normalized) с приоритетом
 * самой свежей записи (последнее значение в архиве выигрывает).
 */
function rebuildCleanedFromRaw_(log) {
  const ss = getTargetSpreadsheet_();
  const sh = ss.getSheetByName(CONFIG.SERVICE_TABS.ARCHIVE_KW);
  if (!sh || sh.getLastRow() < 2) {
    throw new Error('Нет данных в ' + CONFIG.SERVICE_TABS.ARCHIVE_KW + '. Сначала загрузите файл WB.');
  }
  const data = sh.getRange(2, 1, sh.getLastRow() - 1, 11).getValues();
  const ourSku = String(getParam_('OUR_SKU', CONFIG.DEFAULTS.OUR_SKU));

  // sku → normalized → {row, ts}
  const bySku = {};
  data.forEach(r => {
    const sku  = String(r[1] || '').trim();
    const norm = String(r[4] || '').trim();
    if (!sku || !norm) return;
    if (!bySku[sku]) bySku[sku] = {};
    const existing = bySku[sku][norm];
    const tsNew = String(r[0] || '');
    if (!existing || existing.ts <= tsNew) {
      bySku[sku][norm] = {
        ts: tsNew,
        keyword: r[3],
        normalized: norm,
        freq: parseNum_(r[5]),
        freqPrev: parseNum_(r[6]),
        cart: parseNum_(r[7]),
        cartPrev: parseNum_(r[8]),
        order: parseNum_(r[9]),
        orderPrev: parseNum_(r[10]),
        isOurs: (sku === ourSku)
      };
    }
  });

  const result = {};
  Object.keys(bySku).forEach(sku => {
    result[sku] = Object.values(bySku[sku]).map(o => ({
      keyword: o.keyword, normalized: o.normalized,
      freq: o.freq, freqPrev: o.freqPrev,
      cart: o.cart, cartPrev: o.cartPrev,
      order: o.order, orderPrev: o.orderPrev,
      isOurs: o.isOurs
    }));
  });

  log.step('Reconstructed cleaned keywords из _KeywordsRaw: ' + Object.keys(result).length +
           ' SKU (' + Object.keys(result).join(', ') + ')');
  return result;
}
