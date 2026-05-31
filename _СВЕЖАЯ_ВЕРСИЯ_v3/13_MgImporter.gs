/**
 * 13_MgImporter.gs
 * Чтение MarketGuru файлов.
 */

const MG_KIND = { CLUSTERS: 'CLUSTERS', SHELVES: 'SHELVES' };

function readMgFile_(fileId, kind, log) {
  const ss = SpreadsheetApp.openById(fileId);
  let sh;
  if (kind === MG_KIND.CLUSTERS) sh = ss.getSheetByName('Кластеры') || ss.getSheets()[0];
  else sh = ss.getSheetByName('Мониторинг полок') || ss.getSheets()[0];
  if (!sh) throw new Error('Не найден целевой лист');
  const sku = String(sh.getRange(2, 2).getValue() || '').trim();
  if (!sku) throw new Error('Нет артикула в B2');
  const lr = sh.getLastRow(), lc = sh.getLastColumn();
  if (lr < 5) return { sku, headers: [], rows: [] };
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
           ': ' + sku + ', строк=' + rows.length);
  return { sku, headers, rows };
}

function readMgFilesBatch_(fileIds, kind, log) {
  const blocks = [];
  fileIds.forEach((fid, i) => {
    try {
      const block = readMgFile_(fid, kind, log);
      if (block.headers.length) blocks.push(block);
    } catch (e) {
      log.error('Файл #' + (i + 1) + ': ' + e.message);
    }
  });
  return blocks;
}
