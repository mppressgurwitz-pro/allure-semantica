/**
 * 10_Validator.gs
 */

function validateWbReport_(wbReport, log) {
  const issues = [];
  if (!wbReport) issues.push('Пустой отчёт');
  if (!wbReport.pokazateli || !wbReport.pokazateli.headers || !wbReport.pokazateli.headers.length) {
    issues.push('Нет "Показатели" или пуст');
  }
  if (!wbReport.skladyHeaders || !wbReport.skladyHeaders.length) {
    issues.push('Нет "Склады и регионы" или пуст');
  }
  const skuCount = Object.keys(wbReport.keywordsBySku || {}).length;
  if (skuCount === 0) issues.push('Не нашёл листов "Поисковые запросы по артикулу"');
  if (!wbReport.skuList || !wbReport.skuList.length) issues.push('Не удалось определить артикулы');
  const ourSku = String(wbReport.ourSku || '');
  if (ourSku && !(wbReport.keywordsBySku || {})[ourSku]) {
    log.step('⚠️ Запросов по нашему артикулу ' + ourSku + ' нет');
  }
  if (issues.length) throw new Error('Файл не WB:\n  • ' + issues.join('\n  • '));
  log.step('✓ Валидация OK, SKU=' + skuCount);
}
