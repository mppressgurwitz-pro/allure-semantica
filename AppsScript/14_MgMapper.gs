/**
 * 14_MgMapper.gs
 * ============================================================================
 * Запись MG-блоков (кластеры/полки) в жёлтые вкладки шаблона.
 *
 * Правило по ТЗ:
 *   столбец A = артикул (повторяется для каждой строки данных)
 *   столбец B и далее = данные из xlsx (включая шапку)
 *   шапка идёт в строку 1, данные — со строки 2.
 *
 * Перед записью весь диапазон A:end очищается (только контент, формулы вне
 * этого диапазона не трогаются).
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

  // Шапка берётся из первого блока. Все блоки должны иметь одинаковое число столбцов.
  const headers = blocks[0].headers;
  const colCount = headers.length;

  // Проверка консистентности
  const inconsistent = blocks.find(b => b.headers.length !== colCount);
  if (inconsistent) {
    log.step('⚠️ В MG ' + label + ' разное число столбцов между файлами (' +
             inconsistent.headers.length + ' vs ' + colCount + '). Беру шапку из первого файла.');
  }

  // Собираем единый массив: [Артикул, ... данные ...]
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

  // Расширяем лист если нужно
  if (sh.getMaxColumns() < totalCols) sh.insertColumnsAfter(sh.getMaxColumns(), totalCols - sh.getMaxColumns());
  if (sh.getMaxRows()    < totalRows) sh.insertRowsAfter(sh.getMaxRows(), totalRows - sh.getMaxRows());

  // Очищаем содержимое нашей зоны
  const lastDataRow = Math.max(sh.getLastRow(), totalRows);
  sh.getRange(1, 1, lastDataRow, totalCols).clearContent();

  // Шапка
  sh.getRange(1, 1, 1, totalCols)
    .setValues([['Артикул'].concat(headers)])
    .setFontWeight('bold').setBackground('#fff2cc');

  // Данные
  if (out.length) {
    sh.getRange(2, 1, out.length, totalCols).setValues(out);
  }

  log.step('✓ MG ' + label + ': записано ' + out.length + ' строк × ' + totalCols +
           ' столбцов на вкладку "' + tabName + '"');
}
