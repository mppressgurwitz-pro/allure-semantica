/**
 * 14_MgMapper.gs
 * ============================================================================
 * Запись MG-блоков (кластеры/полки) в жёлтые вкладки шаблона.
 * Столбец A = артикул, столбцы B+ = данные. Шапка в строке 1, данные со строки 2.
 *
 * v2: добавлен инкрементальный режим processMgFilesIncrementally_ — обрабатывает
 *     файлы по одному (для очереди с trigger chaining, чтобы избежать лимита 6 мин).
 * ============================================================================
 */

function pasteMgClusters_(blocks, log) {
  pasteMgGeneric_(blocks, CONFIG.TEMPLATE_TABS.MG_CLUSTERS.name, 'Кластеры', log);
}

function pasteMgShelves_(blocks, log) {
  pasteMgGeneric_(blocks, CONFIG.TEMPLATE_TABS.MG_SHELVES.name, 'Полки', log);
}

function pasteMgGeneric_(blocks, tabName, label, log) {
  if (!blocks || !blocks.length) {
    log.step('⚠️ Нет блоков MG ' + label + ' — пропускаю вставку');
    return;
  }
  const ss = getTargetSpreadsheet_();
  const sh = ss.getSheetByName(tabName);
  if (!sh) {
    throw new Error('В целевой таблице нет вкладки "' + tabName +
                    '". Добавьте её в шаблон или переименуйте существующую.');
  }

  const headers = blocks[0].headers;
  const colCount = headers.length;

  const inconsistent = blocks.find(b => b.headers.length !== colCount);
  if (inconsistent) {
    log.step('⚠️ В MG ' + label + ' разное число столбцов между файлами (' +
             inconsistent.headers.length + ' vs ' + colCount + '). Беру шапку из первого файла.');
  }

  const out = [];
  blocks.forEach(b => {
    b.rows.forEach(row => {
      const r = row.slice(0, colCount);
      while (r.length < colCount) r.push('');
      out.push([String(b.sku)].concat(r));
    });
  });

  const totalCols = colCount + 1;
  const totalRows = out.length + 1;

  if (sh.getMaxColumns() < totalCols) sh.insertColumnsAfter(sh.getMaxColumns(), totalCols - sh.getMaxColumns());
  if (sh.getMaxRows()    < totalRows) sh.insertRowsAfter(sh.getMaxRows(), totalRows - sh.getMaxRows());

  const lastDataRow = Math.max(sh.getLastRow(), totalRows);
  sh.getRange(1, 1, lastDataRow, totalCols).clearContent();

  sh.getRange(1, 1, 1, totalCols)
    .setValues([['Артикул'].concat(headers)])
    .setFontWeight('bold').setBackground('#fff2cc');

  if (out.length) {
    writeChunked_(sh, 2, 1, out, log, 'MG-' + label);
  }

  log.step('✓ MG ' + label + ': записано ' + out.length + ' строк × ' + totalCols +
           ' столбцов на вкладку "' + tabName + '"');
}

/**
 * Инкрементальный режим: добавить один блок в конец вкладки, не пересобирая всё.
 * Используется очередью MG (см. 17_MgQueue.gs), чтобы оставаться в лимите 6 мин.
 */
function appendMgBlock_(block, tabName, label, log) {
  if (!block || !block.headers || !block.headers.length || !block.rows.length) return;
  const ss = getTargetSpreadsheet_();
  const sh = ss.getSheetByName(tabName);
  if (!sh) throw new Error('Нет вкладки "' + tabName + '"');

  const colCount = block.headers.length;
  const totalCols = colCount + 1;

  // Если лист пустой — сначала проставим шапку
  if (sh.getLastRow() === 0) {
    if (sh.getMaxColumns() < totalCols) sh.insertColumnsAfter(sh.getMaxColumns(), totalCols - sh.getMaxColumns());
    sh.getRange(1, 1, 1, totalCols)
      .setValues([['Артикул'].concat(block.headers)])
      .setFontWeight('bold').setBackground('#fff2cc');
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
  writeChunked_(sh, startRow, 1, out, log, 'MG-' + label + '-append');
  log.step('✓ MG ' + label + ' добавлено ' + out.length + ' строк по артикулу ' + block.sku);
}
