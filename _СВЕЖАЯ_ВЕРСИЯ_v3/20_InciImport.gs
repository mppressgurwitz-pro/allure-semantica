/**
 * 20_InciImport.gs — OCR этикеток + массовый импорт.
 */

function importInciFromSkuFolder() {
  const ui = SpreadsheetApp.getUi();
  const log = newLogContext_('importInciFromSkuFolder');
  try {
    const folderId = String(getParam_('DRIVE_INBOX_FOLDER_ID', CONFIG.DEFAULTS.DRIVE_INBOX_FOLDER_ID));
    const ourSku = String(getParam_('OUR_SKU', CONFIG.DEFAULTS.OUR_SKU)).trim();
    const ettId = String(getParam_('ETIQUETTES_MASTER_ID', '') || '').trim();
    if (!ettId) { ui.alert('Сначала Создать мастер-файлы'); return; }
    const parent = DriveApp.getFolderById(folderId);
    let target = null;
    const it = parent.getFolders();
    while (it.hasNext()) {
      const f = it.next();
      if (f.getName().indexOf(ourSku) === 0) { target = f; break; }
    }
    if (!target) { ui.alert('Не нашёл папку SKU ' + ourSku); return; }
    const labelFiles = [];
    const files = target.getFiles();
    while (files.hasNext()) {
      const f = files.next();
      const m = f.getMimeType();
      if (m === 'image/jpeg' || m === 'image/png' || m === 'application/pdf') labelFiles.push(f);
    }
    if (!labelFiles.length) { ui.alert('Нет файлов этикеток'); return; }
    let inci = null, photoLink = null;
    for (const f of labelFiles) {
      const txt = ocrFullTextOfFile_(f, log);
      if (!txt) continue;
      const parsed = parseInciFromOcrText_(txt);
      if (parsed) { inci = parsed; photoLink = 'https://drive.google.com/file/d/' + f.getId(); break; }
    }
    if (!inci) { ui.alert('⚠ Не распознал INCI. Заполни вручную.'); log.flush('OCR_MANUAL'); return; }
    upsertEtiquettesRow_(ettId, ourSku, { inci, photo_link: photoLink });
    log.flush('OK');
    ui.alert('✅ INCI распознан и записан');
  } catch (e) {
    log.error(e.message); log.flush('ERROR'); ui.alert('Ошибка: ' + e.message);
  }
}

function ocrFullTextOfFile_(file, log) {
  try {
    const blob = file.getBlob();
    const meta = { name: '_OCR_tmp_' + Utilities.getUuid().substring(0, 8),
      mimeType: 'application/vnd.google-apps.document' };
    const ocrDoc = Drive.Files.create(meta, blob, { ocrLanguage: 'ru' });
    const doc = DocumentApp.openById(ocrDoc.id);
    const text = doc.getBody().getText();
    try { DriveApp.getFileById(ocrDoc.id).setTrashed(true); } catch (e) {}
    return text;
  } catch (e) { log.error('OCR: ' + e.message); return null; }
}

function parseInciFromOcrText_(text) {
  const markers = [
    /\bingredients?\s*[:.\-—]\s*/i,
    /\binci\s*[:.\-—]\s*/i,
    /\bсостав\s*[:.\-—]\s*/i,
    /\bингредиенты\s*[:.\-—]\s*/i
  ];
  for (const re of markers) {
    const m = re.exec(text);
    if (m) {
      const after = text.substring(m.index + m[0].length, m.index + m[0].length + 2500);
      const stopRe = /(производитель|manufactured|made\s+in|изготовитель|срок\s+годности|объ[её]м|штрихкод|barcode)/i;
      const stopM = stopRe.exec(after);
      const inci = stopM ? after.substring(0, stopM.index) : after;
      const cleaned = inci.replace(/\s+/g, ' ').replace(/^[,;\s]+|[,;\s]+$/g, '').trim();
      if (cleaned.length > 20) return cleaned;
    }
  }
  return null;
}

function importInciBulkFromExcel() {
  const html = HtmlService.createHtmlOutput(
    '<html><body style="font-family:Arial;padding:14px">' +
    '<h3>📋 Массовый импорт INCI</h3>' +
    '<input type="file" id="f" accept=".xlsx" />' +
    '<button id="btn" onclick="run()" disabled style="margin-top:10px">Импорт</button>' +
    '<div id="log" style="margin-top:10px;padding:8px;background:#f5f5f5;border-radius:4px;min-height:40px;white-space:pre-wrap"></div>' +
    '<script>' +
    'const f=document.getElementById("f");f.onchange=()=>{document.getElementById("btn").disabled=!f.files.length};' +
    'function run(){document.getElementById("btn").disabled=true;document.getElementById("log").innerText="Загружаю…";' +
    'const fr=new FileReader();fr.onload=e=>{const b64=e.target.result.split(",")[1];' +
    'google.script.run.withSuccessHandler(r=>{document.getElementById("log").innerText=r;document.getElementById("btn").disabled=false;})' +
    '.withFailureHandler(err=>{document.getElementById("log").innerText="❌ "+err.message;document.getElementById("btn").disabled=false;})' +
    '.processBulkInciFile(b64,f.files[0].name)};fr.readAsDataURL(f.files[0])}' +
    '</script></body></html>'
  ).setWidth(500).setHeight(400);
  SpreadsheetApp.getUi().showModalDialog(html, 'Массовый импорт');
}

function processBulkInciFile(b64, name) {
  const log = newLogContext_('bulkInci: ' + name);
  try {
    const ettId = String(getParam_('ETIQUETTES_MASTER_ID', '') || '').trim();
    if (!ettId) throw new Error('Сначала initMasterFiles');
    const blob = Utilities.newBlob(Utilities.base64Decode(b64),
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', name);
    const tmpId = Drive.Files.create(
      { name: '_tmp_inci_' + Utilities.getUuid().substring(0,8),
        mimeType: 'application/vnd.google-apps.spreadsheet' },
      blob, { supportsAllDrives: true }).id;
    const ss = SpreadsheetApp.openById(tmpId);
    const sh = ss.getSheets()[0];
    const data = sh.getDataRange().getValues();
    if (data.length < 2) throw new Error('Файл пустой');
    const head = data[0].map(h => String(h || '').toLowerCase().trim());
    const col = {
      sku: findCol_(head, ['артикул','sku','код']),
      name: findCol_(head, ['название','имя','наименование']),
      brand: findCol_(head, ['бренд','brand']),
      gender: findCol_(head, ['пол','gender']),
      inci: findCol_(head, ['inci','состав','ingredients','ингредиенты']),
      notes: findCol_(head, ['заметки','notes'])
    };
    if (col.sku < 0) throw new Error('Нет колонки артикула');
    if (col.inci < 0) throw new Error('Нет колонки INCI');
    let added = 0, updated = 0, skipped = 0;
    for (let i = 1; i < data.length; i++) {
      const r = data[i];
      const sku = String(r[col.sku] || '').trim();
      const inci = String(r[col.inci] || '').trim();
      if (!sku || !inci || inci.length < 10) { skipped++; continue; }
      const productName = col.name >= 0 ? String(r[col.name] || '') : '';
      let brand = col.brand >= 0 ? String(r[col.brand] || '').trim() : '';
      let gender = col.gender >= 0 ? String(r[col.gender] || '').trim() : '';
      if (!brand && productName) { const det = detectBrand_(productName); if (det) brand = det.key; }
      if (!brand) brand = '(?)';
      if (!gender && CONFIG.BRAND_REGISTRY[brand]) gender = CONFIG.BRAND_REGISTRY[brand].default_gender;
      if (!gender) gender = 'унисекс';
      const res = upsertEtiquettesRow_(ettId, sku, { name: productName, brand, gender, inci });
      if (res === 'added') added++; else updated++;
    }
    try { DriveApp.getFileById(tmpId).setTrashed(true); } catch (e) {}
    log.flush('OK');
    return '✅ Добавлено: ' + added + ', обновлено: ' + updated + ', пропущено: ' + skipped;
  } catch (e) {
    log.error(e.message); log.flush('ERROR'); throw e;
  }
}

function findCol_(headers, candidates) {
  for (const c of candidates) {
    const idx = headers.findIndex(h => h.indexOf(c) >= 0);
    if (idx >= 0) return idx;
  }
  return -1;
}

function upsertEtiquettesRow_(ettId, sku, data) {
  const ss = SpreadsheetApp.openById(ettId);
  const sh = ss.getSheetByName('Состав_SKU');
  const ts = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
  const lr = sh.getLastRow();
  let foundRow = -1;
  if (lr >= 2) {
    const colA = sh.getRange(2, 1, lr - 1, 1).getValues();
    for (let i = 0; i < colA.length; i++) {
      if (String(colA[i][0]).trim() === String(sku).trim()) { foundRow = i + 2; break; }
    }
  }
  if (foundRow > 0) {
    const cur = sh.getRange(foundRow, 1, 1, 11).getValues()[0];
    if (data.name)       cur[1] = data.name;
    if (data.brand)      cur[2] = data.brand;
    if (data.gender)     cur[3] = data.gender;
    if (data.inci)       cur[4] = data.inci;
    if (data.photo_link) cur[5] = data.photo_link;
    cur[6] = ts; cur[7] = 'bulk_import';
    sh.getRange(foundRow, 1, 1, 11).setValues([cur]);
    return 'updated';
  } else {
    sh.appendRow([sku, data.name || '', data.brand || '', data.gender || '',
      data.inci || '', data.photo_link || '', ts, 'bulk_import', '', '', '']);
    return 'added';
  }
}

function addToOcrQueue_(ettId, sku, photoLink, fullOcrText) {
  const ss = SpreadsheetApp.openById(ettId);
  const sh = ss.getSheetByName('OCR_очередь');
  sh.appendRow([sku, photoLink, 'TODO', (fullOcrText || '').substring(0, 1500)]);
}
