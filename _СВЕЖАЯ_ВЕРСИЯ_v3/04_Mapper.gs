/**
 * 04_Mapper.gs
 * Вставка raw-данных + универсальный writeChunked_ с safeSetValues_.
 */

function pasteRawData_(wbReport, log) {
  const ss = getTargetSpreadsheet_();
  pastePokazateli_(ss, wbReport, log);
  pasteZaprosy_(ss, wbReport, log);
  pasteSklady_(ss, wbReport, log);
}

function pastePokazateli_(ss, wbReport, log) {
  const cfg = CONFIG.TEMPLATE_TABS.POKAZATELI;
  const sh = ss.getSheetByName(cfg.name);
  if (!sh) { log.step('⚠️ Нет ' + cfg.name); return; }
  const startRow = 1, startCol = cfg.clearFromCol;
  const headers = wbReport.pokazateli.headers || [];
  const rows = wbReport.pokazateli.rows || [];
  if (!headers.length) return;
  if (sh.getMaxColumns() >= startCol) {
    safeClear_(sh.getRange(startRow, startCol, sh.getMaxRows(), sh.getMaxColumns() - startCol + 1), log);
  }
  const totalCols = headers.length;
  if (sh.getMaxColumns() < startCol + totalCols - 1) {
    sh.insertColumnsAfter(sh.getMaxColumns(), startCol + totalCols - 1 - sh.getMaxColumns());
  }
  writeChunked_(sh, startRow, startCol, [headers].concat(rows), log, 'Показатели');
  log.step('✓ Показатели: ' + rows.length + ' строк');
}

function pasteZaprosy_(ss, wbReport, log) {
  const cfg = CONFIG.TEMPLATE_TABS.ZAPROSY;
  const sh = ss.getSheetByName(cfg.name);
  if (!sh) return;
  const skus = Object.keys(wbReport.keywordsBySku);
  if (!skus.length) return;
  const universalHeaders = [
    'Артикул WB','Поисковый запрос','Количество запросов','Количество запросов (пред.)',
    'CR корзину, %','CR корзину, % (пред.)','CR заказ, %','CR заказ, % (пред.)'
  ];
  const out = [];
  skus.forEach(sku => {
    wbReport.keywordsBySku[sku].rows.forEach(row => {
      const r = row.slice(0, 7);
      while (r.length < 7) r.push('');
      out.push([String(sku)].concat(r));
    });
  });
  const lastCol = 8;
  if (sh.getMaxColumns() < lastCol) sh.insertColumnsAfter(sh.getMaxColumns(), lastCol - sh.getMaxColumns());
  if (sh.getMaxRows() < out.length + 1) sh.insertRowsAfter(sh.getMaxRows(), (out.length + 1) - sh.getMaxRows());
  const headerRow = sh.getRange(1, 1, 1, lastCol).getValues()[0];
  if (headerRow.every(v => v === '' || v === null)) {
    safeSetValues_(sh.getRange(1, 1, 1, lastCol), [universalHeaders], log, 'Запросы-header');
    sh.getRange(1, 1, 1, lastCol).setFontWeight('bold').setBackground('#fff2cc');
  }
  const lastDataRow = Math.max(sh.getLastRow(), out.length + 1);
  if (lastDataRow >= 2) safeClear_(sh.getRange(2, 1, lastDataRow - 1, lastCol), log);
  if (out.length) writeChunked_(sh, 2, 1, out, log, 'Запросы');
  log.step('✓ Запросы: ' + out.length + ' строк');
}

function pasteSklady_(ss, wbReport, log) {
  const cfg = CONFIG.TEMPLATE_TABS.SKLADY;
  const sh = ss.getSheetByName(cfg.name);
  if (!sh) return;
  const headers = wbReport.skladyHeaders || [];
  const rows = wbReport.skladyRows || [];
  if (!headers.length) return;
  if (sh.getMaxColumns() < headers.length) sh.insertColumnsAfter(sh.getMaxColumns(), headers.length - sh.getMaxColumns());
  if (sh.getMaxRows() < rows.length + 1) sh.insertRowsAfter(sh.getMaxRows(), (rows.length + 1) - sh.getMaxRows());
  safeClear_(sh.getRange(1, 1, sh.getMaxRows(), sh.getMaxColumns()), log);
  writeChunked_(sh, 1, 1, [headers].concat(rows), log, 'Склады');
  log.step('✓ Склады: ' + rows.length + ' строк');
}

function safeSetValues_(range, values, log, label) {
  const delays = [5000, 15000, 30000, 45000, 60000, 90000];
  let attempt = 0;
  while (true) {
    try { range.setValues(values); return; }
    catch (e) {
      attempt++;
      if (attempt > delays.length) throw e;
      if (log && log.step) log.step('⏳ ' + (label||'write') + ' retry ' + attempt + ': ' + e.message);
      try { SpreadsheetApp.flush(); } catch (e2) {}
      Utilities.sleep(delays[attempt-1]);
    }
  }
}

function safeClear_(range, log) {
  const delays = [5000, 15000, 30000];
  let attempt = 0;
  while (true) {
    try { range.clearContent(); return; }
    catch (e) {
      attempt++;
      if (attempt > delays.length) throw e;
      if (log && log.step) log.step('⏳ clear retry ' + attempt + ': ' + e.message);
      Utilities.sleep(delays[attempt-1]);
    }
  }
}

function writeChunked_(sh, startRow, startCol, rows2d, log, label) {
  if (!rows2d || !rows2d.length) return;
  const CHUNK = (CONFIG.LIMITS && CONFIG.LIMITS.SHEET_WRITE_CHUNK) || 50;
  const cols = rows2d[0].length;
  for (let i = 0; i < rows2d.length; i += CHUNK) {
    const slice = rows2d.slice(i, i + CHUNK);
    safeSetValues_(sh.getRange(startRow + i, startCol, slice.length, cols), slice, log,
                   (label||'write') + ' chunk#' + (Math.floor(i/CHUNK)+1));
    if (((i/CHUNK) % 3) === 2) { try { SpreadsheetApp.flush(); } catch (e) {} }
  }
}
