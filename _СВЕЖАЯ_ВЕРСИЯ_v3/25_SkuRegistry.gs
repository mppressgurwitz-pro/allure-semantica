/**
 * 25_SkuRegistry.gs
 * Реестр SKU в мастер-таблице + создание копий с cabinet в B1.
 */

var SKU_REGISTRY_SHEET = 'Реестр SKU';
var SKU_REGISTRY_HEADERS = [
  'vendorCode', 'nmID_wb_asmus', 'nmID_wb_quantum',
  'nmID_ozon_asmus', 'nmID_ozon_quantum',
  'sheetId', 'createdAt',
  'lastSync_wb_asmus', 'lastSync_wb_quantum',
  'lastSync_ozon_asmus', 'lastSync_ozon_quantum',
  'status'
];

var DEFAULT_RESULTS_FOLDER_ID = '1gDUCk2a9h7z0zfNzAneXJkBtlupCYxy3';

function ensureSkuRegistrySheet_() {
  const ss = getTargetSpreadsheet_();
  let sh = ss.getSheetByName(SKU_REGISTRY_SHEET);
  if (!sh) {
    sh = ss.insertSheet(SKU_REGISTRY_SHEET);
    sh.getRange(1, 1, 1, SKU_REGISTRY_HEADERS.length).setValues([SKU_REGISTRY_HEADERS])
      .setFontWeight('bold').setBackground('#d9ead3');
    sh.setFrozenRows(1);
  }
  return sh;
}

function appendSkuRegistryRow_(row) {
  const sh = ensureSkuRegistrySheet_();
  sh.appendRow(row);
}

function findRegistryRowByVendor_(vendorCode) {
  const sh = ensureSkuRegistrySheet_();
  const lr = sh.getLastRow();
  if (lr < 2) return -1;
  const data = sh.getRange(2, 1, lr - 1, 1).getValues();
  for (let i = 0; i < data.length; i++) {
    if (String(data[i][0]).trim() === String(vendorCode).trim()) return i + 2;
  }
  return -1;
}

function upsertSkuRegistryRow_(vendorCode, patch) {
  const sh = ensureSkuRegistrySheet_();
  let rowNum = findRegistryRowByVendor_(vendorCode);
  if (rowNum < 0) {
    appendSkuRegistryRow_(new Array(SKU_REGISTRY_HEADERS.length).fill(''));
    rowNum = sh.getLastRow();
    sh.getRange(rowNum, 1).setValue(vendorCode);
  }
  SKU_REGISTRY_HEADERS.forEach(function(h, idx) {
    if (Object.prototype.hasOwnProperty.call(patch, h)) {
      sh.getRange(rowNum, idx + 1).setValue(patch[h]);
    }
  });
}

function patchCopyCabinetAndSku_(copyId, ourSku, productName, cabinet, log) {
  patchCopyConfig_(copyId, ourSku, productName, log);
  const copySs = SpreadsheetApp.openById(copyId);
  const draft = copySs.getSheetByName(CONFIG.ADVICE_TABS.SEO_DRAFT);
  if (draft) {
    draft.getRange('B1').setValue(cabinet);
    log.step('✓ _Advice_SEO_Draft!B1 = ' + cabinet);
  } else {
    log.step('⚠ Лист _Advice_SEO_Draft не найден — B1 не установлен');
  }
}

function createSkuCardFromMasterDialog() {
  const ui = SpreadsheetApp.getUi();
  const r1 = ui.prompt('➕ Создать карточку SKU', 'Артикул (vendorCode):', ui.ButtonSet.OK_CANCEL);
  if (r1.getSelectedButton() !== ui.Button.OK) return;
  const vendorCode = r1.getResponseText().trim();
  if (!vendorCode) { ui.alert('Артикул не задан'); return; }

  const r2 = ui.prompt('Название товара:', vendorCode, ui.ButtonSet.OK_CANCEL);
  if (r2.getSelectedButton() !== ui.Button.OK) return;
  const productName = r2.getResponseText().trim();
  if (!productName) { ui.alert('Название не задано'); return; }

  const r3 = ui.prompt('Кабинет WB (Asmus или Quantum):', 'Asmus', ui.ButtonSet.OK_CANCEL);
  if (r3.getSelectedButton() !== ui.Button.OK) return;
  const cabinet = r3.getResponseText().trim();
  if (cabinet !== 'Asmus' && cabinet !== 'Quantum') {
    ui.alert('Кабинет должен быть Asmus или Quantum');
    return;
  }

  const r4 = ui.prompt('Категория WB (для справки, опционально):', '', ui.ButtonSet.OK_CANCEL);
  const category = r4.getSelectedButton() === ui.Button.OK ? r4.getResponseText().trim() : '';

  const log = newLogContext_('createSkuCard: ' + vendorCode);
  try {
    const copy = createSpreadsheetCopyWithCabinet_({ productName, ourSku: vendorCode, cabinet, category }, log);
    upsertSkuRegistryRow_(vendorCode, {
      vendorCode: vendorCode,
      sheetId: copy.id,
      createdAt: new Date(),
      status: 'created'
    });
    log.flush('OK');
    ui.alert('✅ Готово', 'Создана: ' + copy.name + '\nКабинет B1: ' + cabinet + '\n' + copy.url, ui.ButtonSet.OK);
  } catch (e) {
    log.error(e.message);
    log.flush('ERROR');
    ui.alert('Ошибка: ' + e.message);
  }
}

function createSpreadsheetCopyWithCabinet_(params, log) {
  const productName = String(params.productName || '').trim();
  const ourSku = String(params.ourSku || '').trim();
  const cabinet = String(params.cabinet || 'Asmus').trim();
  if (!productName) throw new Error('Нет названия товара');
  if (!ourSku) throw new Error('Нет артикула');

  const masterId = resolveMasterTemplateId_();
  if (!masterId) throw new Error('Не определён MASTER_TEMPLATE_ID');

  const safeProduct = productName.replace(/[\\/?*\[\]:]/g, '').trim();
  const newName = 'Ср конк  — ' + safeProduct + ' ' + ourSku + ' (арт ' + ourSku + ')';
  log.step('🆕 Копирую ' + newName);

  const masterFile = DriveApp.getFileById(masterId);
  const folderId = String(getParam_('COPIES_FOLDER_ID', '') || '').trim() || DEFAULT_RESULTS_FOLDER_ID;
  let copyFile;
  try {
    copyFile = masterFile.makeCopy(newName, DriveApp.getFolderById(folderId));
  } catch (e) {
    log.step('⚠ Папка ' + folderId + ': ' + e.message + ', копирую в корень Drive');
    copyFile = masterFile.makeCopy(newName);
  }

  const copyId = copyFile.getId();
  patchCopyCabinetAndSku_(copyId, ourSku, productName, cabinet, log);
  try {
    migrateCopyTo4LK_(copyId, false, log);
  } catch (e) {
    log.step('⚠ migrate4LK: ' + e.message);
  }
  return { id: copyId, url: copyFile.getUrl(), name: newName };
}

function backfillSkuRegistryDialog() {
  const ui = SpreadsheetApp.getUi();
  const ans = ui.alert(
    'Backfill реестра SKU',
    'Просканировать папку «Результаты по семантике» и добавить отсутствующие записи?\n\nСначала dry-run в лог.',
    ui.ButtonSet.YES_NO
  );
  if (ans !== ui.Button.YES) return;

  const dryRun = ui.alert('Dry-run?', 'YES = только лог, NO = записать в реестр', ui.ButtonSet.YES_NO_CANCEL);
  if (dryRun === ui.Button.CANCEL) return;
  const write = dryRun === ui.Button.NO;

  const result = backfillSkuRegistry_(write);
  ui.alert('Backfill завершён', result, ui.ButtonSet.OK);
}

function backfillSkuRegistry_(write) {
  ensureSkuRegistrySheet_();
  const folder = DriveApp.getFolderById(DEFAULT_RESULTS_FOLDER_ID);
  const files = folder.getFilesByType(MimeType.GOOGLE_SHEETS);
  const lines = [];
  let added = 0;
  let skipped = 0;

  while (files.hasNext()) {
    const f = files.next();
    const name = f.getName();
    if (name.indexOf('Ср конк') < 0 && name.indexOf('Сравнение конкурентов') < 0) continue;

    let vendorCode = '';
    const artMatch = name.match(/\(арт\s+([^)]+)\)/i);
    if (artMatch) vendorCode = artMatch[1].trim();
    if (!vendorCode) {
      const parts = name.split(/\s+/);
      vendorCode = parts[parts.length - 1] || name;
    }

    if (findRegistryRowByVendor_(vendorCode) >= 0) {
      skipped++;
      continue;
    }

    lines.push('+ ' + vendorCode + ' | ' + name + ' | ' + f.getId());
    if (write) {
      upsertSkuRegistryRow_(vendorCode, {
        vendorCode: vendorCode,
        sheetId: f.getId(),
        createdAt: f.getDateCreated(),
        status: 'backfill'
      });
      added++;
    } else {
      added++;
    }
  }

  return 'Найдено новых: ' + added + ', уже в реестре: ' + skipped +
    (write ? ' (записано)' : ' (dry-run)') +
    '\n\n' + lines.slice(0, 30).join('\n') +
    (lines.length > 30 ? '\n... ещё ' + (lines.length - 30) : '');
}

function updateSkuRegistrySync_(vendorCode, cabinet, nmId) {
  const patch = {};
  if (cabinet === 'Asmus') {
    patch.nmID_wb_asmus = nmId;
    patch.lastSync_wb_asmus = new Date();
  } else if (cabinet === 'Quantum') {
    patch.nmID_wb_quantum = nmId;
    patch.lastSync_wb_quantum = new Date();
  }
  patch.status = 'synced';
  upsertSkuRegistryRow_(vendorCode, patch);
}
