/**
 * PULL / PUSH / вспомогательные операции с листом.
 */

function pullFromCabinet_(spreadsheetOrId, cabinet) {
  const ss = openSpreadsheet_(spreadsheetOrId);
  const ui = SpreadsheetApp.getUi();
  assertCabinetConfigured_(ss, 'PULL');

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

  const rawVendor = readField_(all, block, 'Артикул продавца');
  if (!rawVendor) {
    ui.alert('В тех.блоке не заполнен «Артикул продавца».');
    return;
  }

  const normVendor = normalizeVendorCode_(rawVendor);
  const cyrIssue = describeCyrIssues_(rawVendor);

  let card = fetchCardByVendorCode_safe_(normVendor, cabinet);
  if (!card && normVendor !== rawVendor) {
    card = fetchCardByVendorCode_safe_(rawVendor, cabinet);
  }

  if (!card) {
    let msg = 'Карточка не найдена в WB (' + cabinet + ') vendorCode = "' + normVendor + '"';
    if (cyrIssue) msg += '\n\n' + cyrIssue;
    ui.alert(msg);
    appendSyncLog_(ss, 'PULL FAIL ' + cabinet + ' ' + normVendor);
    return;
  }

  PropertiesService.getDocumentProperties().setProperty('_wb_card_cache', JSON.stringify(card));

  const flat = flattenCard_(card);
  let filled = 0;
  const notFound = [];

  for (let i = block.start; i <= block.end; i++) {
    const field = String(all[i][0] || '').trim();
    if (isSkippableFieldRow_(field)) continue;
    if (Object.prototype.hasOwnProperty.call(flat, field)) {
      draft.getRange(i + 1, 2).setValue(flat[field]);
      filled++;
    } else if (isPullableField_(field)) {
      notFound.push(field);
    }
  }

  if (card.nmID) {
    const r = findFieldRow_(all, block, 'Артикул WB');
    if (r >= 0) draft.getRange(r + 1, 2).setValue(card.nmID);
  }
  if (card.subjectName) {
    const r = findFieldRow_(all, block, 'Категория WB');
    if (r >= 0) draft.getRange(r + 1, 2).setValue(card.subjectName);
  }

  let msg = 'PULL (' + cabinet + ') завершён.\n  • Заполнено: ' + filled;
  if (notFound.length) msg += '\n  • Нет в API: ' + notFound.join(', ');
  if (cyrIssue) msg += '\n\n⚠️ ' + cyrIssue;
  ui.alert(msg);
  appendSyncLog_(ss, 'PULL OK ' + cabinet + ' nmID=' + card.nmID + ' filled=' + filled);
}

function pushToCabinet_(spreadsheetOrId, cabinet) {
  const ss = openSpreadsheet_(spreadsheetOrId);
  const ui = SpreadsheetApp.getUi();
  if (!assertCabinetMatches_(ss, cabinet, 'PUSH')) return;

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

  const rawVendor = readField_(all, block, 'Артикул продавца');
  if (!rawVendor) {
    ui.alert('Не заполнен «Артикул продавца».');
    return;
  }

  const vendorCode = normalizeVendorCode_(rawVendor);
  const card = fetchCardByVendorCode_safe_(vendorCode, cabinet);
  if (!card) {
    ui.alert('Карточка не найдена по "' + vendorCode + '". Сначала PULL.');
    return;
  }

  const categoryName = card.subjectName || readField_(all, block, 'Категория WB');
  const applicableSeo = getApplicableSeoFields_(categoryName, ss);
  const newCol = getNewValueColumnForCabinet_(cabinet);
  const newValues = buildPushValues_(all, block, categoryName, applicableSeo, newCol);

  if (!Object.keys(newValues).length) {
    ui.alert('Нет заполненных значений в колонке «Новое» (C).');
    return;
  }

  const updated = mergeCard_(card, newValues);
  const ans = ui.alert(
    'PUSH в WB (' + cabinet + ')',
    'vendorCode = ' + vendorCode + '\n' +
    'Полей к изменению: ' + Object.keys(newValues).length + '\n' +
    'Остальное сохраняется из GET.\n\nОтправлять?',
    ui.ButtonSet.YES_NO
  );
  if (ans !== ui.Button.YES) {
    ui.alert('Отменено.');
    return;
  }

  const result = wbUpdateCards_([updated], cabinet);
  Logger.log('PUT HTTP ' + result.code + ': ' + result.body);

  if (result.code >= 200 && result.code < 300) {
    ui.alert('PUSH успешен. HTTP ' + result.code + '. Через 1–2 мин сделайте PULL.');
    appendSyncLog_(ss, 'PUSH OK ' + cabinet + ' nmID=' + card.nmID + ' fields=' + Object.keys(newValues).length);
  } else {
    ui.alert('PUSH ошибка HTTP ' + result.code + '.\n' + String(result.body).slice(0, 800));
    appendSyncLog_(ss, 'PUSH FAIL ' + cabinet + ' HTTP ' + result.code);
  }
}

function clearNewValuesInTechBlock_(spreadsheetOrId) {
  const ss = openSpreadsheet_(spreadsheetOrId);
  const draft = ss.getSheetByName(WBSYNC_CONFIG.DRAFT_SHEET);
  if (!draft) return;

  const all = draft.getDataRange().getValues();
  const block = findTechBlock_(all);
  if (!block) return;

  let cleared = 0;
  const keep = ['Артикул WB', 'Артикул продавца', 'Категория WB', 'Бренд'];
  const newCols = [3, 4, 5, 6];

  for (let i = block.start; i <= block.end; i++) {
    const fieldName = String(all[i][0] || '').trim();
    if (isSkippableFieldRow_(fieldName)) continue;
    if (keep.indexOf(fieldName) >= 0) continue;
    newCols.forEach(function(c) {
      draft.getRange(i + 1, c).clearContent();
    });
    cleared++;
  }

  SpreadsheetApp.getUi().alert('Очищено: ' + cleared);
}

function transferSeoToTechBlock_(spreadsheetOrId) {
  const ss = openSpreadsheet_(spreadsheetOrId);
  const msg = transferSeoToTechBlockInternal_(ss, false);
  SpreadsheetApp.getUi().alert(msg);
}

function setCabinetInSheet_(spreadsheetOrId, cabinet) {
  const ss = openSpreadsheet_(spreadsheetOrId);
  const draft = ss.getSheetByName(WBSYNC_CONFIG.DRAFT_SHEET);
  if (!draft) throw new Error('Лист ' + WBSYNC_CONFIG.DRAFT_SHEET + ' не найден');
  draft.getRange('B1').setValue(cabinet);
}
