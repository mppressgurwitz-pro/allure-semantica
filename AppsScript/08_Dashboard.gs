/**
 * 08_Dashboard.gs
 * ============================================================================
 * Сборка KPI-дашборда в листе _Dashboard.
 * Метрики: период отчёта, наш SKU, кол-во конкурентов, размер сем.ядра,
 *          top-10 запросов наших, top-10 missing, top-5 высокочастотных конкурентов.
 * ============================================================================
 */

function rebuildDashboard_(wbReport, semCore, missing, scored, log) {
  const ss = getTargetSpreadsheet_();
  const sh = getOrCreateSheet_(ss, CONFIG.SERVICE_TABS.DASHBOARD);
  sh.clear();

  const ourSku = String(wbReport.ourSku);
  const competitorSkus = (wbReport.skuList || []).filter(s => String(s) !== ourSku);

  const ourScored = scored.filter(s => s.isOurs).slice(0, 10);
  const competitorTop = scored.filter(s => !s.isOurs).slice(0, 10);

  // Layout
  let row = 1;
  function header(title, color) {
    sh.getRange(row, 1, 1, 6).merge()
      .setValue(title)
      .setFontWeight('bold').setFontSize(12)
      .setBackground(color || '#1c4587').setFontColor('#ffffff')
      .setHorizontalAlignment('left');
    row++;
  }

  // Шапка
  sh.getRange(row, 1).setValue('🤖 Конкурентный анализ — дашборд').setFontSize(16).setFontWeight('bold');
  row += 2;

  // Сводка
  header('📋 Параметры запуска', '#1c4587');
  const summary = [
    ['Период (текущий)',       wbReport.periodCurrent],
    ['Период (предыдущий)',    wbReport.periodPrev],
    ['Наш артикул',            ourSku],
    ['Артикулы конкурентов',   competitorSkus.join(', ')],
    ['Размер семантического ядра',   semCore.length],
    ['Missing keywords (total)',     missing.length],
    ['Дата запуска',           Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm')]
  ];
  sh.getRange(row, 1, summary.length, 2).setValues(summary);
  sh.getRange(row, 1, summary.length, 1).setFontWeight('bold');
  row += summary.length + 1;

  // Top-10 наших
  header('🏆 Top-10 запросов нашего SKU по Score', '#38761d');
  sh.getRange(row, 1, 1, 5).setValues([['Запрос', 'Частота', 'CR корзину', 'CR заказ', 'Score']]).setFontWeight('bold');
  row++;
  if (ourScored.length) {
    const rows = ourScored.map(s => [s.normalized, s.freq, s.cart, s.order, s.score]);
    sh.getRange(row, 1, rows.length, 5).setValues(rows);
    row += rows.length;
  } else {
    sh.getRange(row, 1).setValue('— нет данных —');
    row++;
  }
  row++;

  // Top missing
  header('🔍 Top Missing Keywords (что есть у конкурентов и нет у нас)', '#cc0000');
  sh.getRange(row, 1, 1, 5).setValues([['Запрос', 'Частота у конкурентов', 'CR корзину', 'CR заказ', 'Приоритет']]).setFontWeight('bold');
  row++;
  const topMissing = missing.slice(0, 20);
  if (topMissing.length) {
    const maxF = topMissing[0].competitorFreq || 1;
    const rows = topMissing.map(e => {
      const sc = (e.competitorFreq / maxF) * (1 + (e.bestOrder || 0) / 100);
      let prio = '🟢 Low';
      if (sc >= 0.6) prio = '🔴 High';
      else if (sc >= 0.3) prio = '🟡 Medium';
      return [e.normalized, e.competitorFreq, e.bestCart, e.bestOrder, prio];
    });
    sh.getRange(row, 1, rows.length, 5).setValues(rows);
    row += rows.length;
  } else {
    sh.getRange(row, 1).setValue('— все запросы конкурентов уже у нас есть —');
    row++;
  }
  row++;

  // Top-10 конкурентских (по score)
  header('📊 Top-10 запросов конкурентов по Score', '#674ea7');
  sh.getRange(row, 1, 1, 6).setValues([['Артикул', 'Запрос', 'Частота', 'CR корзину', 'CR заказ', 'Score']]).setFontWeight('bold');
  row++;
  if (competitorTop.length) {
    const rows = competitorTop.map(s => [s.sku, s.normalized, s.freq, s.cart, s.order, s.score]);
    sh.getRange(row, 1, rows.length, 6).setValues(rows);
    row += rows.length;
  } else {
    sh.getRange(row, 1).setValue('— нет данных —');
    row++;
  }
  row++;

  // Ссылки на подробные листы
  header('🔗 Подробные данные', '#0b5394');
  const links = [
    ['Семантическое ядро (полное)', '=HYPERLINK("#gid=' + getSheetGid_(ss, CONFIG.SERVICE_TABS.SEMCORE) + '"; "Открыть _SemanticCore")'],
    ['Missing keywords (полный список)', '=HYPERLINK("#gid=' + getSheetGid_(ss, CONFIG.SERVICE_TABS.MISSING) + '"; "Открыть _MissingKeywords")'],
    ['Скоринг (полный список)', '=HYPERLINK("#gid=' + getSheetGid_(ss, '_Scoring') + '"; "Открыть _Scoring")'],
    ['Лог запусков', '=HYPERLINK("#gid=' + getSheetGid_(ss, CONFIG.SERVICE_TABS.LOGS) + '"; "Открыть _Logs")']
  ];
  links.forEach(l => {
    sh.getRange(row, 1).setValue(l[0]).setFontWeight('bold');
    sh.getRange(row, 2).setFormula(l[1]);
    row++;
  });

  // Косметика
  sh.setColumnWidth(1, 360);
  sh.setColumnWidth(2, 200);
  for (let c = 3; c <= 6; c++) sh.setColumnWidth(c, 130);
  sh.setFrozenRows(2);
  log.step('📊 Дашборд пересобран');
}

function rebuildDashboardOnly() {
  const log = newLogContext_('manual: rebuildDashboardOnly');
  try {
    // Реконструируем cleanedKeywords из _KeywordsRaw
    const cleaned = rebuildCleanedFromRaw_(log);
    const semCore = buildSemanticCore_(cleaned, log);
    const missing = findMissingKeywords_(cleaned, log);
    const scored  = computeScoring_(cleaned, log);
    const wbReport = {
      ourSku: getParam_('OUR_SKU', CONFIG.DEFAULTS.OUR_SKU),
      periodCurrent: '(rebuild)',
      periodPrev: '(rebuild)',
      skuList: Object.keys(cleaned)
    };
    rebuildDashboard_(wbReport, semCore, missing, scored, log);
    log.flush('OK');
    SpreadsheetApp.getActive().toast('Дашборд пересобран', 'OK', 5);
  } catch (e) { log.error('Ошибка: ' + e.message); log.flush('ERROR'); throw e; }
}

function getSheetGid_(ss, name) {
  const sh = ss.getSheetByName(name);
  return sh ? sh.getSheetId() : 0;
}
