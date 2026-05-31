/**
 * Диагностика vendorCode и notFound после PULL.
 */

function diagnoseVendor_(spreadsheetOrId) {
  const ss = openSpreadsheet_(spreadsheetOrId);
  const ui = SpreadsheetApp.getUi();
  const draft = ss.getSheetByName(WBSYNC_CONFIG.DRAFT_SHEET);
  if (!draft) {
    ui.alert('Лист ' + WBSYNC_CONFIG.DRAFT_SHEET + ' не найден.');
    return;
  }

  const all = draft.getDataRange().getValues();
  const block = findTechBlock_(all);
  if (!block) {
    ui.alert('Тех.блок не найден.');
    return;
  }

  const raw = readField_(all, block, 'Артикул продавца');
  if (!raw) {
    ui.alert('Ячейка «Артикул продавца» пустая.');
    return;
  }

  const diag = diagnoseString_(raw);
  const fixed = normalizeVendorCode_(raw);
  const bad = diag.filter(function(d) { return d.isCyr; });

  const lines = diag.map(function(d) {
    const mark = d.isCyr ? '⚠️ КИРИЛЛИЦА' : 'OK';
    const repl = d.latReplace ? '  → "' + d.latReplace + '"' : '';
    return '[' + (d.idx + 1) + '] "' + d.char + '"  ' + d.codeHex + '  ' + mark + repl;
  });

  let msg = 'Артикул: "' + raw + '" (длина ' + raw.length + ')\n\n' + lines.join('\n');
  if (bad.length) {
    msg += '\n\n⚠️ Кириллических: ' + bad.length + '\nПравильная латиница: "' + fixed + '"';
  } else {
    msg += '\n\n✅ Чисто латиница.';
  }

  const cabinet = getCabinetFromSheet_(ss);
  if (cabinet) {
    const info = debugApiKeyInfo_(cabinet);
    msg += '\n\nКабинет B1: ' + cabinet;
    if (info.exp) msg += '\nJWT exp: ' + info.exp;
  }

  ui.alert(msg);
}

function diagnoseNotFoundAfterPull_(spreadsheetOrId, cabinet) {
  const ss = openSpreadsheet_(spreadsheetOrId);
  const draft = ss.getSheetByName(WBSYNC_CONFIG.DRAFT_SHEET);
  if (!draft) return [];

  const all = draft.getDataRange().getValues();
  const block = findTechBlock_(all);
  if (!block) return [];

  const vendor = normalizeVendorCode_(readField_(all, block, 'Артикул продавца'));
  if (!vendor) return ['Артикул продавца пуст'];

  const card = fetchCardByVendorCode_safe_(vendor, cabinet || WBSYNC_CONFIG.CABINETS.ASMUS);
  if (!card) return ['Карточка не найдена'];

  const flat = flattenCard_(card);
  const notFound = [];

  for (let i = block.start; i <= block.end; i++) {
    const field = String(all[i][0] || '').trim();
    if (isSkippableFieldRow_(field)) continue;
    if (!Object.prototype.hasOwnProperty.call(flat, field) && isPullableField_(field)) {
      notFound.push(field);
    }
  }

  return notFound;
}

function fixVendorCodeInSheet_(spreadsheetOrId) {
  const ss = openSpreadsheet_(spreadsheetOrId);
  const ui = SpreadsheetApp.getUi();
  const draft = ss.getSheetByName(WBSYNC_CONFIG.DRAFT_SHEET);
  if (!draft) {
    ui.alert('Лист ' + WBSYNC_CONFIG.DRAFT_SHEET + ' не найден.');
    return;
  }

  const all = draft.getDataRange().getValues();
  const block = findTechBlock_(all);
  if (!block) {
    ui.alert('Тех.блок не найден.');
    return;
  }

  const row = findFieldRow_(all, block, 'Артикул продавца');
  if (row < 0) {
    ui.alert('Строка «Артикул продавца» не найдена.');
    return;
  }

  const raw = String(all[row][1] || '').trim();
  if (!raw) {
    ui.alert('Ячейка B пустая.');
    return;
  }

  const fixed = normalizeVendorCode_(raw);
  if (fixed === raw) {
    ui.alert('Кириллицы нет. Чинить нечего.');
    return;
  }

  const ans = ui.alert(
    'Починить артикул?',
    'Сейчас: "' + raw + '"\nБудет: "' + fixed + '"',
    ui.ButtonSet.YES_NO
  );
  if (ans !== ui.Button.YES) return;

  draft.getRange(row + 1, 2).setValue(fixed);
  ui.alert('Готово. Артикул: "' + fixed + '". Запустите PULL.');
}

function debugWBSearch_(cabinet, vendorCode) {
  const code = vendorCode || 'PGBOT1M08';
  const info = debugApiKeyInfo_(cabinet || WBSYNC_CONFIG.CABINETS.ASMUS);
  Logger.log('=== WB DEBUG === cabinet=' + (cabinet || 'Asmus') + ' ' + JSON.stringify(info));

  const card = fetchCardByVendorCode_safe_(code, cabinet || WBSYNC_CONFIG.CABINETS.ASMUS);
  Logger.log('Search "' + code + '": ' + (card ? 'FOUND nmID=' + card.nmID : 'NOT FOUND'));
  if (card) Logger.log('flattenCard keys: ' + Object.keys(flattenCard_(card)).join(', '));
}
