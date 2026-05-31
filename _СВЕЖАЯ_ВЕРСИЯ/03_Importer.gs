/**
 * 03_Importer.gs
 * ============================================================================
 * Чтение конвертированной Google-копии XLSX-выгрузки WB.
 * На выходе — структурированный объект wbReport.
 *
 * v3: ШИРОКИЙ матчинг листов по запросам (имена WB обрезаются Drive до 31 символа
 *     с литералом "..."). Артикул извлекаем строго из ячейки A1.
 * ============================================================================
 */

function readWbReport_(fileId, log) {
  log.step('Открываю конвертированную таблицу...');
  const src = SpreadsheetApp.openById(fileId);
  const sheets = src.getSheets();

  const findStartsWith = (prefix) => {
    for (const s of sheets) if (s.getName().startsWith(prefix)) return s;
    return null;
  };

  // ── Общая информация ───────────────────────────────────────────────────────
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

  // ── Показатели ─────────────────────────────────────────────────────────────
  const pok = findStartsWith(CONFIG.WB_SHEETS.POKAZATELI);
  let pokazateli = { headers: [], rows: [] };
  if (pok) {
    const lr = pok.getLastRow();
    const lc = pok.getLastColumn();
    if (lr >= 2 && lc >= 2) {
      const vals = pok.getRange(2, 2, lr - 1, lc - 1).getValues();
      pokazateli.headers = vals[0];
      pokazateli.rows    = vals.slice(1);
    }
  }

  // ── Склады и регионы ───────────────────────────────────────────────────────
  const skl = findStartsWith(CONFIG.WB_SHEETS.SKLADY);
  let skladyHeaders = [], skladyRows = [];
  if (skl) {
    const lr = skl.getLastRow();
    const lc = skl.getLastColumn();
    if (lr >= 2 && lc >= 2) {
      const vals = skl.getRange(2, 1, lr - 1, lc).getValues();
      skladyHeaders = vals[0];
      skladyRows    = vals.slice(1);
    }
  }

  // ── Поисковые запросы по всем артикулам (агрегат) ──────────────────────────
  let keywordsAll = { headers: [], rows: [] };
  const kwAllSh = findStartsWith(CONFIG.WB_SHEETS.KW_VSE);
  if (kwAllSh && kwAllSh.getLastRow() >= 2) {
    const lr = kwAllSh.getLastRow();
    const lc = kwAllSh.getLastColumn();
    const vals = kwAllSh.getRange(2, 1, lr - 1, lc).getValues();
    keywordsAll.headers = vals[0];
    keywordsAll.rows    = vals.slice(1);
  }

  // ── Поисковые запросы по каждому артикулу ──────────────────────────────────
  // ШИРОКИЙ матчинг: имя содержит "Поисковые запросы по", НО НЕ агрегатный лист.
  // Имя в Drive после конвертации обрезается до 31 символа, может оканчиваться на "...".
  // Артикул берём строго из A1 (там полный заголовок отчёта вида
  //   "Поисковые запросы по артикулу 445361666 за период с .. по ..").
  const keywordsBySku = {};
  const candidates = sheets.filter(s => {
    const name = s.getName();
    if (!/Поисковые запросы по/i.test(name)) return false;
    if (/по всем артикул/i.test(name))        return false;
    return true;
  });

  log.step('Найдено листов с запросами по артикулам: ' + candidates.length +
           ' (имена: ' + candidates.map(s => s.getName()).join(' | ') + ')');

  candidates.forEach(s => {
    const lr = s.getLastRow(), lc = s.getLastColumn();
    if (lr < 2) return;
    const title = String(s.getRange(1, 1).getValue() || '');
    const m = title.match(/артикулу\s+(\d+)/i);
    const sku = m ? m[1] : null;
    if (!sku) {
      log.step('⚠️ Не смог распознать артикул на листе: ' + s.getName() + ' (A1="' + title.substring(0, 60) + '")');
      return;
    }
    if (keywordsBySku[sku]) {
      log.step('⚠️ Дубль листа для артикула ' + sku + ' — пропускаю второй экземпляр');
      return;
    }
    const headers = s.getRange(2, 1, 1, lc).getValues()[0];
    const rows    = (lr >= 3) ? s.getRange(3, 1, lr - 2, lc).getValues() : [];
    keywordsBySku[String(sku)] = { headers, rows };
  });

  log.step('Прочитано: показатели=' + pokazateli.rows.length +
           ', склады=' + skladyRows.length +
           ', артикулов с запросами=' + Object.keys(keywordsBySku).length +
           ' (' + Object.keys(keywordsBySku).join(', ') + ')');

  return {
    fileId,
    periodCurrent: periodCurrent || '',
    periodPrev: periodPrev || '',
    skuList: skuList.length ? skuList : Object.keys(keywordsBySku),
    ourSku,
    pokazateli,
    skladyHeaders,
    skladyRows,
    keywordsAll,
    keywordsBySku
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
