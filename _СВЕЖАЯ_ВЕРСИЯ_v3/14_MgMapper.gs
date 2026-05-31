/**
 * 14_MgMapper.gs
 */

function pasteMgClusters_(blocks, log) {
  pasteMgGeneric_(blocks, CONFIG.TEMPLATE_TABS.MG_CLUSTERS.name, 'Кластеры', log);
}
function pasteMgShelves_(blocks, log) {
  pasteMgGeneric_(blocks, CONFIG.TEMPLATE_TABS.MG_SHELVES.name, 'Полки', log);
}

function pasteMgGeneric_(blocks, tabName, label, log) {
  if (!blocks || !blocks.length) return;
  const ss = getTargetSpreadsheet_();
  const sh = ss.getSheetByName(tabName);
  if (!sh) throw new Error('Нет вкладки "' + tabName + '"');
  const headers = blocks[0].headers;
  const colCount = headers.length;
  const out = [];
  blocks.forEach(b => {
    b.rows.forEach(row => {
      const r = row.slice(0, colCount);
      while (r.length < colCount) r.push('');
      out.push([String(b.sku)].concat(r));
    });
  });
  const totalCols = colCount + 1;
  if (sh.getMaxColumns() < totalCols) sh.insertColumnsAfter(sh.getMaxColumns(), totalCols - sh.getMaxColumns());
  if (sh.getMaxRows() < out.length + 1) sh.insertRowsAfter(sh.getMaxRows(), (out.length + 1) - sh.getMaxRows());
  safeClear_(sh.getRange(1, 1, Math.max(sh.getLastRow(), out.length + 1), totalCols), log);
  safeSetValues_(sh.getRange(1, 1, 1, totalCols), [['Артикул'].concat(headers)], log, label + '-header');
  sh.getRange(1, 1, 1, totalCols).setFontWeight('bold').setBackground('#fff2cc');
  if (out.length) writeChunked_(sh, 2, 1, out, log, 'MG-' + label);
  log.step('✓ MG ' + label + ': ' + out.length + ' строк');
}

function appendMgBlock_(block, tabName, label, log) {
  if (!block || !block.headers || !block.headers.length || !block.rows.length) return;
  const ss = getTargetSpreadsheet_();
  const sh = ss.getSheetByName(tabName);
  if (!sh) throw new Error('Нет вкладки "' + tabName + '"');
  const colCount = block.headers.length;
  const totalCols = colCount + 1;
  if (sh.getLastRow() === 0) {
    if (sh.getMaxColumns() < totalCols) sh.insertColumnsAfter(sh.getMaxColumns(), totalCols - sh.getMaxColumns());
    safeSetValues_(sh.getRange(1, 1, 1, totalCols), [['Артикул'].concat(block.headers)], log, label);
    sh.getRange(1, 1, 1, totalCols).setFontWeight('bold').setBackground('#fff2cc');
  }
  const out = block.rows.map(row => {
    const r = row.slice(0, colCount);
    while (r.length < colCount) r.push('');
    return [String(block.sku)].concat(r);
  });
  const startRow = sh.getLastRow() + 1;
  if (sh.getMaxRows() < startRow + out.length - 1) {
    sh.insertRowsAfter(sh.getMaxRows(), (startRow + out.length - 1) - sh.getMaxRows());
  }
  writeChunked_(sh, startRow, 1, out, log, 'MG-' + label);
  log.step('✓ MG ' + label + ' append ' + out.length + ' по ' + block.sku);
}
