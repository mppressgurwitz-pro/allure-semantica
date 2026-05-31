/**
 * 13_MgImporter.gs
 * ============================================================================
 * Чтение выгрузок MarketGuru — двух типов:
 *   1) "Кластеры" (Анализ по артикулу → Кластеры)
 *      — 1 лист "Кластеры", артикул в ячейке B2,
 *        двухстрочная шапка (строки 3 и 4), данные с 5-й строки.
 *   2) "Мониторинг полок"
 *      — 1 лист "Мониторинг полок", артикул в B2,
 *        шапка в строке 3, данные с 5-й строки (4-я бывает пустая).
 *
 * На вход подаётся ID конвертированной (Drive→Sheets) копии XLSX-файла.
 * На выходе — структурированный объект {sku, headers, rows}.
 * ============================================================================
 */

const MG_KIND = {
  CLUSTERS: 'CLUSTERS',
  SHELVES:  'SHELVES'
};

/**
 * Прочитать один MG-файл (любой из двух типов).
 *
 * @param {string} fileId
 * @param {string} kind - MG_KIND.CLUSTERS | MG_KIND.SHELVES
 * @return {Object} {sku, headers: string[], rows: any[][]}
 */
function readMgFile_(fileId, kind, log) {
  const ss = SpreadsheetApp.openById(fileId);
  let sh;
  if (kind === MG_KIND.CLUSTERS) {
    sh = ss.getSheetByName('Кластеры') || ss.getSheets()[0];
  } else {
    sh = ss.getSheetByName('Мониторинг полок') || ss.getSheets()[0];
  }
  if (!sh) throw new Error('Не найден целевой лист в MG-файле ' + fileId);

  // Артикул из B2 (общий формат для обоих типов)
  const sku = String(sh.getRange(2, 2).getValue() || '').trim();
  if (!sku) throw new Error('Не найден артикул в ячейке B2 файла ' + fileId);

  const lr = sh.getLastRow(), lc = sh.getLastColumn();
  if (lr < 5) {
    log.step('⚠️ В MG-файле ' + sku + ' меньше 5 строк — пропускаю');
    return { sku, headers: [], rows: [] };
  }

  // Двухстрочная шапка: строки 3 и 4
  const head1 = sh.getRange(3, 1, 1, lc).getValues()[0];
  const head2 = sh.getRange(4, 1, 1, lc).getValues()[0];
  const headers = head1.map((h, i) => {
    const sub = String(head2[i] || '').trim();
    if (sub && !/^[—\-]+$/.test(sub)) return String(h || '').trim() + ' / ' + sub;
    return String(h || '').trim();
  });

  // Данные с 5-й строки
  const rawRows = sh.getRange(5, 1, lr - 4, lc).getValues();
  // Фильтр пустых строк
  const rows = rawRows.filter(r => r.some(v => v !== '' && v !== null));

  log.step('📥 MG ' + (kind === MG_KIND.CLUSTERS ? 'Кластеры' : 'Полки') +
           ': артикул ' + sku + ', строк=' + rows.length + ', столбцов=' + headers.length);
  return { sku, headers, rows };
}

/**
 * Прочитать массив MG-файлов одного типа и вернуть массив блоков.
 */
function readMgFilesBatch_(fileIds, kind, log) {
  const blocks = [];
  fileIds.forEach((fid, i) => {
    try {
      const block = readMgFile_(fid, kind, log);
      if (block.headers.length) blocks.push(block);
    } catch (e) {
      log.error('Ошибка чтения файла #' + (i + 1) + ' (' + fid + '): ' + e.message);
    }
  });
  return blocks;
}
