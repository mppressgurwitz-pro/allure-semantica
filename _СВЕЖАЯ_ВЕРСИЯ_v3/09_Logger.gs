/**
 * 09_Logger.gs
 */

function newLogContext_(label) {
  const ctx = {
    started: new Date(), label: label || '(unnamed)', steps: [], errors: []
  };
  ctx.step = function(m) {
    const ts = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'HH:mm:ss');
    ctx.steps.push('[' + ts + '] ' + m);
    try { SpreadsheetApp.getActive().toast(m, 'Импорт', 3); } catch (e) {}
    Logger.log(m);
  };
  ctx.error = function(m) { ctx.errors.push(m); Logger.log('ERROR: ' + m); };
  ctx.flush = function(status) {
    appendLogRow_({
      ts: ctx.started, label: ctx.label, status: status || 'UNKNOWN',
      durationMs: (new Date() - ctx.started),
      steps: ctx.steps.join('\n'), errors: ctx.errors.join('\n')
    });
  };
  return ctx;
}

function appendLogRow_(entry) {
  const ss = getTargetSpreadsheet_();
  const sh = getOrCreateSheet_(ss, CONFIG.SERVICE_TABS.LOGS);
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, 6).setValues([['Дата', 'Файл / событие', 'Статус', 'Длительность мс', 'Шаги', 'Ошибки']])
      .setFontWeight('bold').setBackground('#cfe2f3');
    sh.setFrozenRows(1);
  }
  sh.appendRow([
    Utilities.formatDate(entry.ts, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss'),
    entry.label, entry.status, entry.durationMs, entry.steps, entry.errors
  ]);
  const lr = sh.getLastRow();
  const max = CONFIG.LIMITS.MAX_LOG_ROWS;
  if (lr > max + 1) sh.deleteRows(2, lr - max - 1);
}
