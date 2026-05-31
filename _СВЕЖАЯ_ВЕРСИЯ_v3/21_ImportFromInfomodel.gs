/**
 * 21_ImportFromInfomodel.gs v6
 * v6 FIX: НЕ перезаписывает существующий INCI, если в источнике INCI не найден.
 */

const IFI_META_BLACKLIST = [
  'тип данных','обязательное','параметры','комментарий',
  'текстовое поле','цифровое поле','справочник',
  'да','нет','—','-','необходимо','см. на упаковке'
];

function importFromInfomodel() {
  const SOURCE_ID   = '11QeKEgrZBcfQ0Dq_4OAWGaQ2Y535GvcX';
  const ETT_ID      = String(getParam_('ETIQUETTES_MASTER_ID', '') || '').trim();
  const TEMPLATE_ID = '1z9UxpQ3VCaBNk1zrOdwhui0Apml-uA4UpxuOfCDg8jk';
  const SHEETS_TO_PROCESS = [
    { name: 'S&H', brand_canonical: 'SAVACE & HERBS', gender_default: 'мужской' },
    { name: 'PGP', brand_canonical: 'PressGurwitz',    gender_default: 'унисекс' }
  ];
  const log = newLogContext_('importFromInfomodel');
  let tmpId = null;
  try {
    log.step('Беру blob: ' + SOURCE_ID);
    const blob = DriveApp.getFileById(SOURCE_ID).getBlob();
    log.step('Конвертирую XLSX → Google Sheet');
    const created = Drive.Files.create(
      { name: '_tmp_inforomodel_' + Utilities.getUuid().substring(0, 8),
        mimeType: 'application/vnd.google-apps.spreadsheet' },
      blob, { supportsAllDrives: true }
    );
    tmpId = created.id;
    const src = SpreadsheetApp.openById(tmpId);
    const ts = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');

    const records = [];
    for (const spec of SHEETS_TO_PROCESS) {
      const sh = src.getSheetByName(spec.name);
      if (!sh) continue;
      const lr = sh.getLastRow(), lc = sh.getLastColumn();
      if (lr < 4 || lc < 6) continue;
      const headers = sh.getRange(3, 1, 1, lc).getValues()[0].map(h => String(h || '').toLowerCase().trim());
      const colArt = ifiFindCol_(headers, ['артикул']);
      const colName = ifiFindCol_(headers, ['рабочее наименование','наименование товара','название']);
      if (colArt < 0) continue;
      let dataStartRow = -1;
      const probeLen = Math.min(15, lr - 3);
      const probe = sh.getRange(4, colArt + 1, probeLen, 1).getValues();
      for (let i = 0; i < probe.length; i++) {
        if (ifiIsRealArtikul_(probe[i][0])) { dataStartRow = 4 + i; break; }
      }
      if (dataStartRow < 0) continue;
      log.step('"' + spec.name + '": артикул=col' + (colArt+1) + ', данные с row ' + dataStartRow);
      const colInci = ifiPickInci_(sh, headers, dataStartRow, lc, log);
      const inciFound = colInci >= 0;
      log.step('  → INCI: col' + (colInci+1) + (inciFound ? ' "' + headers[colInci] + '"' : ' НЕ НАЙДЕНО'));
      const data = sh.getRange(dataStartRow, 1, lr - dataStartRow + 1, lc).getValues();
      let added = 0, skipped = 0;
      data.forEach(r => {
        const internal_code = String(r[colArt] || '').trim();
        if (!ifiIsRealArtikul_(internal_code)) { skipped++; return; }
        const name = colName >= 0 ? String(r[colName] || '').trim() : '';
        if (!name || ifiIsMeta_(name)) { skipped++; return; }
        const inciRaw = inciFound ? String(r[colInci] || '').trim() : '';
        const inci = ifiIsMeta_(inciRaw) ? '' : inciRaw;
        records.push({ internal_code, name, brand: spec.brand_canonical,
          gender: spec.gender_default, inci, inciFound, source: spec.name });
        added++;
      });
      log.step('  → собрано: ' + added + ', пропущено: ' + skipped);
    }
    if (!records.length) { log.flush('EMPTY'); return; }
    log.step('Всего: ' + records.length);

    log.step('Пишу в Шаблон…');
    ifiUpsertTemplate_(TEMPLATE_ID, records, log, ts);
    if (ETT_ID) {
      log.step('Пишу в Etiquettes…');
      ifiUpsertEtt_(ETT_ID, records, log, ts);
    }
    log.flush('OK');
  } catch (e) {
    log.error(e.message); log.flush('ERROR'); throw e;
  } finally {
    if (tmpId) { try { DriveApp.getFileById(tmpId).setTrashed(true); } catch (e) {} }
  }
}

function ifiPickInci_(sh, headers, dataStartRow, lc, log) {
  const candidates = [];
  for (let c = 0; c < headers.length; c++) {
    const h = headers[c];
    if (h.indexOf('состав') >= 0 || h.indexOf('inci') >= 0 ||
        h.indexOf('ingredients') >= 0 || h.indexOf('ингредиенты') >= 0) candidates.push(c);
  }
  if (!candidates.length) return -1;
  const sampleRows = Math.min(5, sh.getLastRow() - dataStartRow + 1);
  let best = -1, bestScore = 0;
  candidates.forEach(c => {
    const samples = sh.getRange(dataStartRow, c + 1, sampleRows, 1).getValues();
    let totalLen = 0;
    for (const row of samples) {
      const v = String(row[0] || '').trim();
      if (v && !ifiIsMeta_(v) && v.length > 10) totalLen += v.length;
    }
    const avgLen = totalLen / sampleRows;
    const isEng = headers[c].indexOf('английском') >= 0 || headers[c].indexOf('inci') >= 0;
    const score = avgLen + (isEng && avgLen > 50 ? 10 : 0);
    log.step('  candidate col' + (c+1) + ' "' + headers[c] + '": avg ' + avgLen.toFixed(0));
    if (score > bestScore && avgLen > 20) { bestScore = score; best = c; }
  });
  return best;
}

function ifiIsRealArtikul_(v) {
  const s = String(v || '').trim();
  return s.length >= 3 && !ifiIsMeta_(s) && /\d/.test(s);
}
function ifiIsMeta_(v) {
  const s = String(v || '').toLowerCase().trim();
  if (!s) return false;
  for (const m of IFI_META_BLACKLIST) {
    if (s === m) return true;
    if (s.indexOf(m) === 0 && s.length < m.length + 4) return true;
  }
  return false;
}
function ifiFindCol_(headers, patterns) {
  for (const p of patterns) {
    const i = headers.findIndex(h => h.indexOf(p) >= 0);
    if (i >= 0) return i;
  }
  return -1;
}

function ifiUpsertTemplate_(tplId, records, log, ts) {
  const tpl = SpreadsheetApp.openById(tplId);
  let sh = tpl.getSheetByName('SKU_INCI');
  if (!sh) sh = tpl.insertSheet('SKU_INCI');
  const HEADERS = ['Артикул WB (nmID)','Внутренний код','Ozon артикул','Название','Бренд','Пол','INCI','Заметки'];
  sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold').setBackground('#fff2cc');
  sh.setFrozenRows(1);
  const lr = sh.getLastRow();
  const existingByCode = {};
  if (lr >= 2) {
    const cur = sh.getRange(2, 1, lr - 1, HEADERS.length).getValues();
    for (let i = 0; i < cur.length; i++) {
      const code = String(cur[i][1] || '').trim();
      if (code) existingByCode[code] = { row: i + 2, values: cur[i] };
    }
  }
  let updated = 0, appended = 0;
  const toAppend = [];
  records.forEach(rec => {
    const ex = existingByCode[rec.internal_code];
    if (ex) {
      // КЛЮЧ: если INCI не найден в источнике — оставляем существующий
      const inciToWrite = rec.inciFound && rec.inci ? rec.inci : (ex.values[6] || '');
      const row = [ex.values[0] || '', rec.internal_code, ex.values[2] || '',
        rec.name, rec.brand, rec.gender, inciToWrite,
        'обновлено ' + ts + ' из ' + rec.source];
      sh.getRange(ex.row, 1, 1, HEADERS.length).setValues([row]);
      updated++;
    } else {
      toAppend.push(['', rec.internal_code, '', rec.name, rec.brand, rec.gender,
        rec.inciFound ? rec.inci : '', 'импорт ' + ts + ' из ' + rec.source]);
      appended++;
    }
  });
  if (toAppend.length) sh.getRange(sh.getLastRow() + 1, 1, toAppend.length, HEADERS.length).setValues(toAppend);
  log.step('  Шаблон: обновлено ' + updated + ', добавлено ' + appended);
}

function ifiUpsertEtt_(ettId, records, log, ts) {
  const ett = SpreadsheetApp.openById(ettId);
  let sh = ett.getSheetByName('Состав_SKU');
  if (!sh) throw new Error('Нет Состав_SKU');
  const lr = sh.getLastRow();
  if (sh.getLastColumn() < 11) sh.insertColumnsAfter(sh.getLastColumn(), 11 - sh.getLastColumn());
  if (!sh.getRange(1, 10).getValue()) sh.getRange(1, 10).setValue('Внутренний код').setFontWeight('bold');
  if (!sh.getRange(1, 11).getValue()) sh.getRange(1, 11).setValue('Ozon артикул').setFontWeight('bold');
  const existingByCode = {};
  if (lr >= 2) {
    const cur = sh.getRange(2, 1, lr - 1, 11).getValues();
    for (let i = 0; i < cur.length; i++) {
      const code = String(cur[i][9] || '').trim();
      if (code) existingByCode[code] = { row: i + 2, values: cur[i] };
    }
  }
  let updated = 0, appended = 0;
  const toAppend = [];
  records.forEach(rec => {
    const ex = existingByCode[rec.internal_code];
    if (ex) {
      const inciToWrite = rec.inciFound && rec.inci ? rec.inci : (ex.values[4] || '');
      const row = [ex.values[0] || '', rec.name, rec.brand, rec.gender, inciToWrite, ex.values[5] || '',
        ts, 'auto_import', 'обновлено из ' + rec.source, rec.internal_code, ex.values[10] || ''];
      sh.getRange(ex.row, 1, 1, 11).setValues([row]);
      updated++;
    } else {
      toAppend.push(['', rec.name, rec.brand, rec.gender,
        rec.inciFound ? rec.inci : '', '', ts, 'auto_import',
        'импорт из ' + rec.source, rec.internal_code, '']);
      appended++;
    }
  });
  if (toAppend.length) sh.getRange(sh.getLastRow() + 1, 1, toAppend.length, 11).setValues(toAppend);
  log.step('  Etiquettes: обновлено ' + updated + ', добавлено ' + appended);
}
