/**
 * 12_Copier.gs
 * Создание копии master-шаблона.
 */

function createSpreadsheetCopy_(params, log) {
  const productName = String(params.productName || '').trim();
  const ourSku = String(params.ourSku || '').trim();
  if (!productName) throw new Error('Нет названия товара');
  if (!ourSku) throw new Error('Нет артикула');
  const masterId = resolveMasterTemplateId_();
  if (!masterId) throw new Error('Не определён MASTER_TEMPLATE_ID');
  const safeProduct = productName.replace(/[\\/?*\[\]:]/g, '').trim();
  // Имя по эталону: "Ср конк  — {название} (арт {sku})" — двойной пробел между «конк» и тире сохраняем
  const newName = 'Ср конк  — ' + safeProduct + ' (арт ' + ourSku + ')';
  log.step('🆕 Копирую ' + newName);
  const masterFile = DriveApp.getFileById(masterId);
  // Папка результатов: сначала пробуем _Config.COPIES_FOLDER_ID, если пусто — дефолт «Результаты по семантике»
  const DEFAULT_RESULTS_FOLDER_ID = '1gDUCk2a9h7z0zfNzAneXJkBtlupCYxy3';
  const folderId = String(getParam_('COPIES_FOLDER_ID', '') || '').trim() || DEFAULT_RESULTS_FOLDER_ID;
  let copyFile;
  try {
    copyFile = masterFile.makeCopy(newName, DriveApp.getFolderById(folderId));
  } catch (e) {
    log.step('⚠ Не удалось создать в папке ' + folderId + ' (' + e.message + '), копирую в корень Drive');
    copyFile = masterFile.makeCopy(newName);
  }
  const copyId = copyFile.getId();
  const copyUrl = copyFile.getUrl();
  log.step('✓ Копия создана: ' + copyUrl);
  patchCopyConfig_(copyId, ourSku, productName, log);
  return { id: copyId, url: copyUrl, name: newName };
}

function resolveMasterTemplateId_() {
  const fromConfig = String(getParam_('MASTER_TEMPLATE_ID', '') || '').trim();
  if (fromConfig) return fromConfig;
  if (CONFIG.TARGET.SPREADSHEET_ID) return CONFIG.TARGET.SPREADSHEET_ID;
  const active = SpreadsheetApp.getActiveSpreadsheet();
  return active ? active.getId() : '';
}

function patchCopyConfig_(copyId, ourSku, productName, log) {
  const copySs = SpreadsheetApp.openById(copyId);
  let cfgSh = copySs.getSheetByName(CONFIG.SERVICE_TABS.CONFIG);
  if (!cfgSh) {
    setOverrideTargetSs_(copyId);
    try { setupServiceSheets(); } finally { clearOverrideTargetSs_(); }
    cfgSh = copySs.getSheetByName(CONFIG.SERVICE_TABS.CONFIG);
    if (!cfgSh) throw new Error('Не удалось инициализировать _Config');
  }
  upsertConfigParam_(cfgSh, 'OUR_SKU', ourSku, 'Артикул WB');
  upsertConfigParam_(cfgSh, 'OUR_PRODUCT_NAME', productName, 'Название товара');
  log.step('✓ _Config обновлён: OUR_SKU=' + ourSku);
}

function upsertConfigParam_(cfgSh, key, value, description) {
  const lr = cfgSh.getLastRow();
  if (lr < 2) { cfgSh.appendRow([key, value, description]); return; }
  const data = cfgSh.getRange(2, 1, lr - 1, 2).getValues();
  for (let i = 0; i < data.length; i++) {
    if (String(data[i][0]).trim() === key) {
      cfgSh.getRange(i + 2, 2).setValue(value); return;
    }
  }
  cfgSh.appendRow([key, value, description]);
}

function setOverrideTargetSs_(ssId) {
  PropertiesService.getScriptProperties().setProperty('__OVERRIDE_TARGET_SS_ID__', ssId);
}
function clearOverrideTargetSs_() {
  PropertiesService.getScriptProperties().deleteProperty('__OVERRIDE_TARGET_SS_ID__');
}
function getOverrideTargetSsId_() {
  return PropertiesService.getScriptProperties().getProperty('__OVERRIDE_TARGET_SS_ID__') || '';
}
