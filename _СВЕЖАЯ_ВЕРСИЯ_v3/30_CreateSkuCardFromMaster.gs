/**
 * 30_CreateSkuCardFromMaster.gs — создание SKU-копии из мастера по Шаблон_INCI / SKU_INCI.
 */

var MASTER_TEMPLATE_ID_DEFAULT_ = '16OBo1Enr19SFOuLm2pNy_JagMFppNqXKsYlUbLw_8S0';
var COPIES_FOLDER_ID_DEFAULT_ = '1gDUCk2a9h7z0zfNzAneXJkBtlupCYxy3';
var CREATE_SKU_SCHEMA_VERSION_ = '4TAB_2026-05-31';
var PGBOT1M08_REGRESSION_ID_ = '1NOO50oa9CWfXzA7AixR7zapj1xzr2e3xhK7lM6Cc3bQ';

function createSkuCardFromMasterDialog() {
  var html = HtmlService.createHtmlOutputFromFile('CreateSkuCardDialog')
    .setWidth(480)
    .setHeight(420);
  SpreadsheetApp.getUi().showModalDialog(html, '➕ Создать карточку SKU');
}

/**
 * Шаг 1: lookup по внутреннему коду → preview или ошибка.
 * @param {string} internalCode
 * @return {Object}
 */
function lookupSkuInciForCreateCard_(internalCode) {
  var code = String(internalCode || '').trim();
  if (!code) {
    return { ok: false, error: 'Введите внутренний код 1С' };
  }

  var data = readShablonINCIByInternalCode_(code);
  if (!data) {
    return {
      ok: false,
      error: 'SKU не найден в Шаблон_INCI_для_Маши, проверь код'
    };
  }

  var folderId = String(getParam_('COPIES_FOLDER_ID', '') || '').trim() ||
    COPIES_FOLDER_ID_DEFAULT_;
  var existing = findExistingCopyByInternalCode_(folderId, code);
  if (existing) {
    return {
      ok: false,
      error: 'Карточка с этим кодом уже есть в «Результаты по семантике»:\n' + existing.url,
      existingUrl: existing.url,
      existingName: existing.name
    };
  }

  return {
    ok: true,
    preview: buildSkuCreatePreview_(data)
  };
}

/**
 * @param {Object} data from readShablonINCIByInternalCode_
 * @return {Object}
 */
function buildSkuCreatePreview_(data) {
  return {
    internalCode: data.internalCode,
    name: data.name,
    brand: data.brand,
    nmid_wb_asmus: data.nmid_wb_asmus || '—',
    nmid_wb_quantum: data.nmid_wb_quantum || '—',
    sku_ozon_asmus: data.sku_ozon_asmus || '—',
    sku_ozon_quantum: data.sku_ozon_quantum || '—',
    hasInci: !!(data.inci && String(data.inci).trim()),
    inciPreview: data.inci ? String(data.inci).substring(0, 120) : '',
    photosFolderId: data.photosFolderId || '',
    photosFolderUrl: data.photosFolderUrl || '',
    isSet: data.isSet || ''
  };
}

/**
 * Шаг 2: подтверждение → создание копии.
 * @param {string} internalCode
 * @return {Object}
 */
function createSkuCardFromMasterConfirmed_(internalCode) {
  try {
    var code = String(internalCode || '').trim();
    if (!code) return { success: false, error: 'Внутренний код не задан' };

    var data = readShablonINCIByInternalCode_(code);
    if (!data) {
      return {
        success: false,
        error: 'SKU не найден в Шаблон_INCI_для_Маши, проверь код'
      };
    }

    var result = createSkuCardFromMaster_(data);
    return { success: true, sheetUrl: result.url, sheetId: result.id };
  } catch (e) {
    Logger.log('createSkuCardFromMasterConfirmed_ ERROR: ' + e.message);
    return { success: false, error: e.message };
  }
}

/**
 * @param {Object} data from readShablonINCIByInternalCode_
 * @return {{id: string, url: string, name: string}}
 */
function createSkuCardFromMaster_(data) {
  var code = String(data.internalCode || '').trim();
  var name = String(data.name || '').trim() || code;
  Logger.log('createSkuCardFromMaster_: ' + code + ' ' + name);

  var masterId = String(getParam_('MASTER_TEMPLATE_ID', '') || '').trim() ||
    MASTER_TEMPLATE_ID_DEFAULT_;
  if (masterId === PGBOT1M08_REGRESSION_ID_) {
    throw new Error('Запрещено копировать PGBOT1M08 (регрессионный baseline)');
  }

  var folderId = String(getParam_('COPIES_FOLDER_ID', '') || '').trim() ||
    COPIES_FOLDER_ID_DEFAULT_;

  var existing = findExistingCopyByInternalCode_(folderId, code);
  if (existing) {
    throw new Error(
      'Карточка уже существует: ' + existing.name + '\n' + existing.url
    );
  }

  var copyName = buildSkuCopyFileName_(name, code);
  var copyFile = copyMasterSpreadsheetToFolder_(masterId, folderId, copyName);
  var copyId = copyFile.getId();

  if (copyId === PGBOT1M08_REGRESSION_ID_) {
    throw new Error('Ошибка: попытка записи в PGBOT1M08 — операция отменена');
  }

  var copySs = SpreadsheetApp.openById(copyId);
  deleteDefaultBlankSheetInSpreadsheet_(copySs);

  var cfg = copySs.getSheetByName('_Config');
  if (!cfg) {
    throw new Error('В копии нет листа _Config — проверьте шаблон мастера');
  }

  writeSkuConfigFromInciData_(cfg, data);
  cfg.hideSheet();

  writeSeoHeadersFromInciData_(copySs, data);

  try {
    var masterSs = getTargetSpreadsheet_();
    appendSkuRegistryRow(masterSs, {
      vendorCode: code,
      product_name: name,
      category_wb: '',
      category_ozon: '',
      nmID_wb_asmus: data.nmid_wb_asmus,
      nmID_wb_quantum: data.nmid_wb_quantum,
      nmID_ozon_asmus: data.sku_ozon_asmus,
      nmID_ozon_quantum: data.sku_ozon_quantum,
      sheet_id: copyId,
      sheet_url: copyFile.getUrl(),
      gender_map_json: JSON.stringify({
        wb_asmus: data.gender_wb_asmus,
        wb_quantum: data.gender_wb_quantum,
        ozon_asmus: data.gender_ozon_asmus,
        ozon_quantum: data.gender_ozon_quantum
      }),
      created_at: new Date().toISOString(),
      status: 'created'
    });
  } catch (regErr) {
    Logger.log('createSkuCardFromMaster_: registry skip — ' + regErr.message);
  }

  var summary = 'OK ' + code + ' → ' + copyFile.getUrl();
  Logger.log(summary);
  return { id: copyId, url: copyFile.getUrl(), name: copyName };
}

/**
 * @param {string} folderId
 * @param {string} internalCode
 * @return {{id: string, url: string, name: string}|null}
 */
function findExistingCopyByInternalCode_(folderId, internalCode) {
  var code = String(internalCode || '').trim();
  if (!code) return null;
  var folder = DriveApp.getFolderById(folderId);
  var files = folder.getFilesByType(MimeType.GOOGLE_SHEETS);
  while (files.hasNext()) {
    var f = files.next();
    if (f.getId() === PGBOT1M08_REGRESSION_ID_) continue;
    if (f.getName().indexOf(code) >= 0) {
      return { id: f.getId(), url: f.getUrl(), name: f.getName() };
    }
  }
  return null;
}

/**
 * @param {string} productName
 * @param {string} internalCode
 * @return {string}
 */
function buildSkuCopyFileName_(productName, internalCode) {
  var safeName = String(productName || '')
    .replace(/[\\/?*\[\]:]/g, '')
    .trim();
  var code = String(internalCode || '').trim();
  var base = 'SKU - ' + safeName;
  if (code && base.indexOf(code) < 0) {
    base += ' ' + code;
  }
  return base;
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Sheet} cfg
 * @param {Object} data
 */
function writeSkuConfigFromInciData_(cfg, data) {
  upsertConfigKey_(cfg, 'OUR_SKU', data.internalCode, 'Внутренний код 1С');
  upsertConfigKey_(cfg, 'OUR_PRODUCT_NAME', data.name, 'Название');
  upsertConfigKey_(cfg, 'NMID_WB_ASMUS', data.nmid_wb_asmus, 'nmID WB Асмус');
  upsertConfigKey_(cfg, 'NMID_WB_QUANTUM', data.nmid_wb_quantum, 'nmID WB Quantum');
  upsertConfigKey_(cfg, 'NMID_OZON_ASMUS', data.sku_ozon_asmus, 'SKU Ozon Асмус');
  upsertConfigKey_(cfg, 'NMID_OZON_QUANTUM', data.sku_ozon_quantum, 'SKU Ozon Quantum');
  upsertConfigKey_(cfg, 'GENDER_WB_ASMUS', data.gender_wb_asmus, 'Пол WB Асмус');
  upsertConfigKey_(cfg, 'GENDER_WB_QUANTUM', data.gender_wb_quantum, 'Пол WB Quantum');
  upsertConfigKey_(cfg, 'GENDER_OZON_ASMUS', data.gender_ozon_asmus, 'Пол Ozon Асмус');
  upsertConfigKey_(cfg, 'GENDER_OZON_QUANTUM', data.gender_ozon_quantum, 'Пол Ozon Quantum');
  upsertConfigKey_(cfg, 'BRAND', data.brand, 'Бренд');
  upsertConfigKey_(cfg, 'NAME', data.name, 'Название товара');
  upsertConfigKey_(cfg, 'INCI', data.inci, 'INCI');
  upsertConfigKey_(cfg, 'FRAGRANCE_FAMILY', data.fragranceFamily, 'Семейство аромата');
  upsertConfigKey_(cfg, 'TOP_NOTES', data.topNotes, 'Верхние ноты');
  upsertConfigKey_(cfg, 'MID_NOTES', data.midNotes, 'Средние ноты');
  upsertConfigKey_(cfg, 'BASE_NOTES', data.baseNotes, 'Базовые ноты');
  upsertConfigKey_(cfg, 'IS_SET', data.isSet, 'Набор Y/N');
  upsertConfigKey_(cfg, 'SET_COMPOSITION', data.setComposition, 'Состав набора');
  upsertConfigKey_(cfg, 'PHOTOS_FOLDER_ID', data.photosFolderId, 'Папка SKU (Drive ID)');
  upsertConfigKey_(cfg, 'GENDER_MAP_v1', JSON.stringify({
    wb_asmus: data.gender_wb_asmus,
    wb_quantum: data.gender_wb_quantum,
    ozon_asmus: data.gender_ozon_asmus,
    ozon_quantum: data.gender_ozon_quantum
  }), 'JSON пола по 4 ЛК');
  upsertConfigKey_(cfg, 'ADVICE_SEO_SCHEMA_VERSION', CREATE_SKU_SCHEMA_VERSION_, '4-tab layout');
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {Object} data
 */
function writeSeoHeadersFromInciData_(ss, data) {
  writeSeoSheetHeaderValues_(
    ss.getSheetByName('SEO_WB_Asmus'),
    data.internalCode,
    data.nmid_wb_asmus || '<TBD>',
    '',
    'WB Асмус'
  );
  writeSeoSheetHeaderValues_(
    ss.getSheetByName('SEO_WB_Quantum'),
    data.internalCode,
    data.nmid_wb_quantum || '<TBD>',
    '',
    'WB Quantum'
  );
  writeSeoSheetHeaderValues_(
    ss.getSheetByName('SEO_OZON_Asmus'),
    data.internalCode,
    data.sku_ozon_asmus || '<TBD>',
    '',
    'OZON Асмус'
  );
  writeSeoSheetHeaderValues_(
    ss.getSheetByName('SEO_OZON_Quantum'),
    data.internalCode,
    data.sku_ozon_quantum || '<TBD>',
    '',
    'OZON Quantum'
  );
}

function copyMasterSpreadsheetToFolder_(masterId, folderId, copyName) {
  try {
    var resource = {
      name: copyName,
      parents: [folderId]
    };
    var copied = Drive.Files.copy(resource, masterId, { supportsAllDrives: true });
    return DriveApp.getFileById(copied.id);
  } catch (e) {
    Logger.log('Drive.Files.copy failed: ' + e.message + ' — fallback makeCopy');
    var masterFile = DriveApp.getFileById(masterId);
    return masterFile.makeCopy(copyName, DriveApp.getFolderById(folderId));
  }
}

function writeSeoSheetHeaderValues_(sh, vendorCode, nmID, categoryLabel, cabinetLabel) {
  if (!sh) return;
  sh.getRange(1, 2).setValue(vendorCode);
  sh.getRange(2, 2).setValue(nmID || '<TBD>');
  sh.getRange(3, 2).setValue(cabinetLabel || '');
  if (categoryLabel) {
    sh.getRange(5, 2).setValue(categoryLabel);
  }
}

function upsertConfigKey_(cfgSheet, key, value, description) {
  var lr = cfgSheet.getLastRow();
  if (lr < 2) {
    cfgSheet.appendRow([key, value, description]);
    return;
  }
  var numRows = lr - 1;
  var data = cfgSheet.getRange(2, 1, numRows, 2).getValues();
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][0]).trim() === key) {
      cfgSheet.getRange(i + 2, 2).setValue(value);
      return;
    }
  }
  cfgSheet.appendRow([key, value, description]);
}

function deleteDefaultBlankSheetInSpreadsheet_(ss) {
  var defaultSheet = ss.getSheetByName('Лист1') || ss.getSheetByName('Sheet1');
  if (defaultSheet && ss.getSheets().length > 1) {
    ss.deleteSheet(defaultSheet);
    Logger.log('deleteDefaultBlankSheetInSpreadsheet_: removed default sheet');
  }
}
