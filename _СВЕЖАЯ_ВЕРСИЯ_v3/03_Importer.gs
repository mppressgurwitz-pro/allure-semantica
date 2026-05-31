/**
 * 03_Importer.gs v3
 * Чтение WB XLSX. Широкий матчинг листов, артикул из A1.
 */

function readWbReport_(fileId, log) {
  log.step('Открываю конвертированную таблицу...');
  const src = SpreadsheetApp.openById(fileId);
  const sheets = src.getSheets();

  const findStartsWith = (prefix) => {
    for (const s of sheets) if (s.getName().startsWith(prefix)) return s;
    return null;
  };

  const obsh = findStartsWith(CONFIG.WB_SHEETS.OBSCHAYA);
  const periodCurrent = readKv_(obsh, 'Выбранный период');
  const periodPrev    = readKv_(obsh, 'Предыдущий период');
  const skuList = [];
  if (obsh) {
    const all = obsh.getDataRange().getValues();
    all.forEach(r => {
      const k = String(r[0] || '').trim();
      if (/^Выбранная номенклатура \d+/i.test(k) && r[1]) skuList.push(String(r[1]).trim());
    });
  }
  const ourSku = String(getParam_('OUR_SKU', CONFIG.DEFAULTS.OUR_SKU)).trim();

  const pok = findStartsWith(CONFIG.WB_SHEETS.POKAZATELI);
  let pokazateli = { headers: [], rows: [] };
  if (pok) {
    const lr = pok.getLastRow(), lc = pok.getLastColumn();
    if (lr >= 2 && lc >= 2) {
      const vals = pok.getRange(2, 2, lr - 1, lc - 1).getValues();
      pokazateli.headers = vals[0]; pokazateli.rows = vals.slice(1);
    }
  }

  const skl = findStartsWith(CONFIG.WB_SHEETS.SKLADY);
  let skladyHeaders = [], skladyRows = [];
  if (skl) {
    const lr = skl.getLastRow(), lc = skl.getLastColumn();
    if (lr >= 2 && lc >= 2) {
      const vals = skl.getRange(2, 1, lr - 1, lc).getValues();
      skladyHeaders = vals[0]; skladyRows = vals.slice(1);
    }
  }

  let keywordsAll = { headers: [], rows: [] };
  const kwAllSh = findStartsWith(CONFIG.WB_SHEETS.KW_VSE);
  if (kwAllSh && kwAllSh.getLastRow() >= 2) {
    const lr = kwAllSh.getLastRow(), lc = kwAllSh.getLastColumn();
    const vals = kwAllSh.getRange(2, 1, lr - 1, lc).getValues();
    keywordsAll.headers = vals[0]; keywordsAll.rows = vals.slice(1);
  }

  const keywordsBySku = {};
  const candidates = sheets.filter(s => {
    const name = s.getName();
    if (!/Поисковые запросы по/i.test(name)) return false;
    if (/по всем артикул/i.test(name))        return false;
    return true;
  });
  log.step('Листов с запросами: ' + candidates.length);

  candidates.forEach(s => {
    const lr = s.getLastRow(), lc = s.getLastColumn();
    if (lr < 2) return;
    const title = String(s.getRange(1, 1).getValue() || '');
    const m = title.match(/артикулу\s+(\d+)/i);
    const sku = m ? m[1] : null;
    if (!sku) { log.step('⚠️ Не распознал артикул: ' + s.getName()); return; }
    if (keywordsBySku[sku]) return;
    const headers = s.getRange(2, 1, 1, lc).getValues()[0];
    const rows = (lr >= 3) ? s.getRange(3, 1, lr - 2, lc).getValues() : [];
    keywordsBySku[String(sku)] = { headers, rows };
  });
  log.step('Артикулов с запросами: ' + Object.keys(keywordsBySku).length);

  return {
    fileId, periodCurrent: periodCurrent || '', periodPrev: periodPrev || '',
    skuList: skuList.length ? skuList : Object.keys(keywordsBySku),
    ourSku, pokazateli, skladyHeaders, skladyRows, keywordsAll, keywordsBySku
  };
}

function readKv_(sheet, key) {
  if (!sheet) return null;
  const data = sheet.getDataRange().getValues();
  for (let i = 0; i < data.length; i++) {
    if (String(data[i][0] || '').trim() === key) return data[i][1];
  }
  return null;
}
