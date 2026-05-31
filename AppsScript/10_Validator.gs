/**
 * 10_Validator.gs
 * ============================================================================
 * Валидация WB-отчёта перед обработкой. При нарушении — кидаем понятное
 * исключение с человеческим описанием, которое пробрасывается в сайдбар.
 * ============================================================================
 */

function validateWbReport_(wbReport, log) {
  const issues = [];
  if (!wbReport) issues.push('Пустой отчёт');
  if (!wbReport.pokazateli || !wbReport.pokazateli.headers || !wbReport.pokazateli.headers.length) {
    issues.push('Отсутствует лист "Показатели" или он пуст');
  }
  if (!wbReport.skladyHeaders || !wbReport.skladyHeaders.length) {
    issues.push('Отсутствует лист "Склады и регионы" или он пуст');
  }
  const skuCount = Object.keys(wbReport.keywordsBySku || {}).length;
  if (skuCount === 0) {
    issues.push('Не нашёл ни одного листа "Поисковые запросы по артикулу" — проверьте файл');
  }
  if (!wbReport.skuList || !wbReport.skuList.length) {
    issues.push('Не удалось определить артикулы из листа "Общая информация"');
  }
  // Контроль наличия "нашего" артикула в данных
  const ourSku = String(wbReport.ourSku || '');
  if (ourSku && !(wbReport.keywordsBySku || {})[ourSku]) {
    log.step('⚠️ Запросов по нашему артикулу ' + ourSku + ' нет в файле — продолжаю, но missing keywords могут быть некорректны');
  }
  if (issues.length) {
    throw new Error('Файл не соответствует ожидаемой структуре WB:\n  • ' + issues.join('\n  • '));
  }
  log.step('✓ Валидация: структура OK, артикулов с запросами=' + skuCount);
}
