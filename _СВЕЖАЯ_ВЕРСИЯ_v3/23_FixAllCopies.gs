/**
 * 23_FixAllCopies.gs
 * Обходит копии в Drive Inbox, выравнивает их _Config.
 * Дополнительно: удаляет дубликаты строк в _Config.
 */

function fixAllCopies() {
  const INBOX_FOLDER_ID = '1Q65aq4M3YvN4brrKkzyNBTC4irvxLOJf';
  const EXPECTED = {
    ETIQUETTES_MASTER_ID: String(getParam_('ETIQUETTES_MASTER_ID', '') || '').trim(),
    RULES_MASTER_ID:      String(getParam_('RULES_MASTER_ID', '') || '').trim(),
    DRIVE_INBOX_FOLDER_ID: INBOX_FOLDER_ID
  };
  if (!EXPECTED.ETIQUETTES_MASTER_ID || !EXPECTED.RULES_MASTER_ID) {
    try { SpreadsheetApp.getUi().alert('Сначала запусти initMasterFiles'); } catch (e) {}
    return;
  }
  const SKIP_IDS = [EXPECTED.ETIQUETTES_MASTER_ID, EXPECTED.RULES_MASTER_ID,
                    '1z9UxpQ3VCaBNk1zrOdwhui0Apml-uA4UpxuOfCDg8jk'];
  const log = newLogContext_('fixAllCopies');
  try {
    const folder = DriveApp.getFolderById(INBOX_FOLDER_ID);
    const files = folder.getFilesByType(MimeType.GOOGLE_SHEETS);
    let scanned = 0, fixed = 0, failed = 0, okCnt = 0;
    while (files.hasNext()) {
      const f = files.next();
      const name = f.getName();
      const id = f.getId();
      if (SKIP_IDS.indexOf(id) >= 0) continue;
      if (!/^(Сравнение\s+конкурентов|Ср\s+конк)/i.test(name)) { log.step('• пропуск: ' + name); continue; }
      scanned++;
      log.step('═══ ' + name + ' (' + id + ')');
      try {
        const ss = SpreadsheetApp.openById(id);
        const sh = ss.getSheetByName('_Config');
        if (!sh) { log.step('  ✗ нет _Config'); failed++; continue; }
        const lr = sh.getLastRow();
        const map = {};
        const rowIdxByKey = {};
        const duplicateRowsToDelete = [];
        if (lr >= 2) {
          const data = sh.getRange(2, 1, lr - 1, 2).getValues();
          for (let i = 0; i < data.length; i++) {
            const k = String(data[i][0] || '').trim();
            if (!k) continue;
            if (rowIdxByKey[k]) {
              // дубликат — пометим на удаление
              duplicateRowsToDelete.push(i + 2);
            } else {
              rowIdxByKey[k] = i + 2;
              map[k] = String(data[i][1] || '');
            }
          }
        }
        // Удалим дубликаты СНИЗУ ВВЕРХ
        duplicateRowsToDelete.sort((a,b)=>b-a).forEach(r => sh.deleteRow(r));
        if (duplicateRowsToDelete.length) {
          log.step('  → удалено дубликат-строк: ' + duplicateRowsToDelete.length);
        }
        log.step('  OUR_SKU=' + (map.OUR_SKU || '(пусто)') +
                 ' ETT=' + ((map.ETIQUETTES_MASTER_ID || '').substring(0,12) + '...') +
                 ' RULES=' + ((map.RULES_MASTER_ID || '').substring(0,12) + '...'));
        let n = 0;
        Object.keys(EXPECTED).forEach(key => {
          const cur = (map[key] || '').trim();
          const exp = EXPECTED[key];
          if (cur === exp) return;
          // Пересчитаем номер строки после удаления дубликатов
          const freshLr = sh.getLastRow();
          let foundRow = -1;
          if (freshLr >= 2) {
            const data = sh.getRange(2, 1, freshLr - 1, 1).getValues();
            for (let i = 0; i < data.length; i++) {
              if (String(data[i][0]).trim() === key) { foundRow = i + 2; break; }
            }
          }
          if (foundRow > 0) sh.getRange(foundRow, 2).setValue(exp);
          else sh.appendRow([key, exp, 'fixAllCopies']);
          log.step('  → ' + key + ': "' + cur + '" → "' + exp + '"');
          n++;
        });
        if (n === 0 && duplicateRowsToDelete.length === 0) { log.step('  ✓ всё ок'); okCnt++; }
        else fixed++;
      } catch (e) {
        log.step('  ✗ ' + e.message); failed++;
      }
    }
    log.step('ИТОГО: проверено=' + scanned + ', исправлено=' + fixed + ', уже_ок=' + okCnt + ', ошибки=' + failed);
    log.flush('OK');
    try { SpreadsheetApp.getActive().toast('Fix: проверено ' + scanned + ', исправлено ' + fixed, '✅', 10); } catch (e) {}
  } catch (e) {
    log.error(e.message); log.flush('ERROR'); throw e;
  }
}
