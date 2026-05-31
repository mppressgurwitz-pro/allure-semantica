/**
 * 08_Dashboard.gs
 */

function rebuildDashboard_(wbReport, semCore, missing, scored, log) {
  const ss = getTargetSpreadsheet_();
  const sh = getOrCreateSheet_(ss, CONFIG.SERVICE_TABS.DASHBOARD);
  sh.clear();
  const ourSku = String(wbReport.ourSku);
  const competitorSkus = (wbReport.skuList || []).filter(s => String(s) !== ourSku);
  const ourScored = scored.filter(s => s.isOurs).slice(0, 10);
  const competitorTop = scored.filter(s => !s.isOurs).slice(0, 10);

  let row = 1;
  function header(t, c) {
    sh.getRange(row, 1, 1, 6).merge().setValue(t).setFontWeight('bold').setFontSize(12)
      .setBackground(c || '#1c4587').setFontColor('#ffffff').setHorizontalAlignment('left');
    row++;
  }
  sh.getRange(row, 1).setValue('🤖 Конкурентный анализ — дашборд').setFontSize(16).setFontWeight('bold');
  row += 2;

  header('📋 Параметры запуска', '#1c4587');
  const summary = [
    ['Период (текущий)', wbReport.periodCurrent],
    ['Период (пред.)', wbReport.periodPrev],
    ['Наш артикул', ourSku],
    ['Конкуренты', competitorSkus.join(', ')],
    ['Размер сем. ядра', semCore.length],
    ['Missing keywords', missing.length],
    ['Дата запуска', Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm')]
  ];
  sh.getRange(row, 1, summary.length, 2).setValues(summary);
  sh.getRange(row, 1, summary.length, 1).setFontWeight('bold');
  row += summary.length + 1;

  header('🏆 Top-10 наших запросов', '#38761d');
  sh.getRange(row, 1, 1, 5).setValues([['Запрос','Частота','CR корз','CR зак','Score']]).setFontWeight('bold');
  row++;
  if (ourScored.length) {
    const rows = ourScored.map(s => [s.normalized, s.freq, s.cart, s.order, s.score]);
    sh.getRange(row, 1, rows.length, 5).setValues(rows);
    row += rows.length;
  } else { sh.getRange(row, 1).setValue('— нет —'); row++; }
  row++;

  header('🔍 Top Missing Keywords', '#cc0000');
  sh.getRange(row, 1, 1, 5).setValues([['Запрос','Частота конк.','CR корз','CR зак','Приоритет']]).setFontWeight('bold');
  row++;
  const topMissing = missing.slice(0, 20);
  if (topMissing.length) {
    const maxF = topMissing[0].competitorFreq || 1;
    const rows = topMissing.map(e => {
      const sc = (e.competitorFreq / maxF) * (1 + (e.bestOrder || 0) / 100);
      let prio = '🟢'; if (sc >= 0.6) prio = '🔴'; else if (sc >= 0.3) prio = '🟡';
      return [e.normalized, e.competitorFreq, e.bestCart, e.bestOrder, prio];
    });
    sh.getRange(row, 1, rows.length, 5).setValues(rows);
    row += rows.length;
  }
  row++;

  header('🪄 Рекомендации Claude', '#9900ff');
  const adviceLinks = [
    ['SEO-черновик', CONFIG.ADVICE_TABS.SEO_DRAFT],
    ['Реклама', CONFIG.ADVICE_TABS.AD_STRATEGY],
    ['Логистика', CONFIG.ADVICE_TABS.LOGISTICS],
    ['Полки', CONFIG.ADVICE_TABS.SHELF_STRATEGY],
    ['Конкуренты', CONFIG.ADVICE_TABS.COMPETITOR_ANALYSIS],
    ['Трекер', CONFIG.ADVICE_TABS.IMPLEMENTATION],
    ['Manual Review', CONFIG.ADVICE_TABS.MANUAL_REVIEW],
    ['Keyword Priority', CONFIG.ADVICE_TABS.KEYWORD_PRIORITY]
  ];
  adviceLinks.forEach(l => {
    sh.getRange(row, 1).setValue(l[0]).setFontWeight('bold');
    sh.getRange(row, 2).setFormula('=HYPERLINK("#gid=' + getSheetGid_(ss, l[1]) + '"; "Открыть")');
    row++;
  });
  sh.setColumnWidth(1, 280); sh.setColumnWidth(2, 200);
  sh.setFrozenRows(2);
}

function rebuildDashboardOnly() {
  const log = newLogContext_('rebuildDashboardOnly');
  try {
    const cleaned = rebuildCleanedFromRaw_(log);
    rebuildDashboard_({
      ourSku: getParam_('OUR_SKU', CONFIG.DEFAULTS.OUR_SKU),
      periodCurrent: '(rebuild)', periodPrev: '(rebuild)', skuList: Object.keys(cleaned)
    }, buildSemanticCore_(cleaned, log), findMissingKeywords_(cleaned, log), computeScoring_(cleaned, log), log);
    log.flush('OK');
  } catch (e) { log.error(e.message); log.flush('ERROR'); throw e; }
}

function getSheetGid_(ss, name) {
  const sh = ss.getSheetByName(name);
  return sh ? sh.getSheetId() : 0;
}
