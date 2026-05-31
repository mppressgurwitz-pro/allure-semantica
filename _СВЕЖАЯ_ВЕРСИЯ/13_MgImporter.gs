/**
 * 13_MgImporter.gs
 * ============================================================================
 * Чтение выгрузок MarketGuru — двух типов:
 *   1) "Кластеры": лист "Кластеры", артикул в B2, двухстрочная шапка (строки 3-4),
 *      данные с 5-й строки.
 *   2) "Мониторинг полок": лист "Мониторинг полок", артикул в B2, шапка в строке 3,
 *      данные с 5-й строки.
 * ============================================================================
 */

const MG_KIND = {
  CLUSTERS: 'CLUSTERS',
  SHELVES:  'SHELVES'
};

function readMgFile_(fileId, kind, log) {
  const ss = SpreadsheetApp.openById(fileId);
  let sh;
  if (kind === MG_KIND.CLUSTERS) {
    sh = ss.getSheetByName('Кластеры') || ss.getSheets()[0];
  } else {
    sh = ss.getSheetByName('Мониторинг полок') || ss.getSheets()[0];
  }
  if (!sh) throw new Error('Не найден целевой лист в MG-файле ' + fileId);

  const sku = String(sh.getRange(2, 2).getValue() || '').trim();
  if (!sku) throw new Error('Не найден артикул в ячейке B2 файла ' + fileId);

  const lr = sh.getLastRow(), lc = sh.getLastColumn();
  if (lr < 5) {
    log.step('⚠️ В MG-файле ' + sku + ' меньше 5 строк — пропускаю');
    return { sku, headers: [], rows: [] };
  }

  const head1 = sh.getRange(3, 1, 1, lc).getValues()[0];
  const head2 = sh.getRange(4, 1, 1, lc).getValues()[0];
  const headers = head1.map((h, i) => {
    const sub = String(head2[i] || '').trim();
    if (sub && !/^[—\-]+$/.test(sub)) return String(h || '').trim() + ' / ' + sub;
    return String(h || '').trim();
  });

  const rawRows = sh.getRange(5, 1, lr - 4, lc).getValues();
  const rows = rawRows.filter(r => r.some(v => v !== '' && v !== null));

  log.step('📥 MG ' + (kind === MG_KIND.CLUSTERS ? 'Кластеры' : 'Полки') +
           ': артикул ' + sku + ', строк=' + rows.length + ', столбцов=' + headers.length);
  return { sku, headers, rows };
}

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
