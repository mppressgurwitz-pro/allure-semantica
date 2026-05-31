/**
 * 30_CreateSkuCardFromMaster.gs — ЧП-2bis H2: создание SKU-копии из мастера (HTML dialog).
 */

var MASTER_TEMPLATE_ID_DEFAULT_ = '16OBo1Enr19SFOuLm2pNy_JagMFppNqXKsYlUbLw_8S0';
var COPIES_FOLDER_ID_DEFAULT_ = '1gDUCk2a9h7z0zfNzAneXJkBtlupCYxy3';
var COPY_NAME_TEMPLATE_ = 'Ср конк  — {product_name} {sku_code} {wb_id} (арт {wb_id})';
var CREATE_SKU_SCHEMA_VERSION_ = '4TAB_2026-05-31';

var WB_CATEGORIES_CREATE_SKU_ = [
  'Гели', 'Дезодоранты', 'Духи', 'Кондиционеры для волос', 'Лосьоны',
  'Мыло косметическое', 'Парфюм для дома', 'Парфюмерная вода', 'Пилинг',
  'Саше ароматические', 'Соль для ванн', 'Спреи', 'Шампуни',
  'Косметические наборы для ухода'
];

var OZON_CATEGORIES_CREATE_SKU_ = [
  'Парфюмерия', 'Свеча', 'Соль для ванны', 'Косметика для ухода',
  'Косметика для ухода за волосами', 'Ароматы для дома',
  'Средство после бритья', 'Средства для гигиены тела'
];

function createSkuCardFromMasterDialog() {
  var html = HtmlService.createHtmlOutputFromFile('CreateSkuCardDialog')
    .setWidth(520)
    .setHeight(640);
  SpreadsheetApp.getUi().showModalDialog(html, '➕ Создать карточку SKU');
}

function getCreateSkuCardDialogMeta_() {
  return {
    wbCategories: WB_CATEGORIES_CREATE_SKU_,
    ozonCategories: OZON_CATEGORIES_CREATE_SKU_
  };
}

/**
 * @param {Object} formData
 * @return {{success: boolean, sheetUrl?: string, sheetId?: string, error?: string}}
 */
function createSkuCardFromMasterServer_(formData) {
  try {
    Logger.log('createSkuCardFromMasterServer_: ' + JSON.stringify(formData));

    var vendorCode = String(formData.vendorCode || '').trim();
    var productName = String(formData.product_name || '').trim();
    var categoryWb = String(formData.category_wb || '').trim();
    if (!vendorCode) return { success: false, error: 'vendorCode обязателен' };
    if (!productName) return { success: false, error: 'product_name обязателен' };
    if (!categoryWb) return { success: false, error: 'category_wb обязателен' };

    var categoryOzon = String(formData.category_ozon || '').trim();
    if (!categoryOzon && typeof resolveOzonTemplateForWbCategory_ === 'function') {
      var ozResolved = resolveOzonTemplateForWbCategory_(categoryWb);
      categoryOzon = String(ozResolved.ozonCategory || '').trim();
    }

    var nmWbAsmus = String(formData.nmID_wb_asmus || '').trim();
    var nmWbQuantum = String(formData.nmID_wb_quantum || '').trim();
    var nmOzonAsmus = String(formData.nmID_ozon_asmus || '').trim();
    var nmOzonQuantum = String(formData.nmID_ozon_quantum || '').trim();
    var nmAny = nmWbAsmus || nmWbQuantum || nmOzonAsmus || nmOzonQuantum || vendorCode;

    var genderMap = {
      wb_asmus: String(formData.gender_wb_asmus || '').trim(),
      wb_quantum: String(formData.gender_wb_quantum || '').trim(),
      ozon_asmus: String(formData.gender_ozon_asmus || '').trim(),
      ozon_quantum: String(formData.gender_ozon_quantum || '').trim()
    };
    ['wb_asmus', 'wb_quantum', 'ozon_asmus', 'ozon_quantum'].forEach(function(k) {
      var v = genderMap[k];
      if (v && ['ж', 'м', 'у'].indexOf(v) < 0) {
        throw new Error('Недопустимый пол для ' + k + ': «' + v + '». Допустимо: ж, м, у.');
      }
    });

    var masterId = String(getParam_('MASTER_TEMPLATE_ID', '') || '').trim() ||
      MASTER_TEMPLATE_ID_DEFAULT_;
    var folderId = String(getParam_('COPIES_FOLDER_ID', '') || '').trim() ||
      COPIES_FOLDER_ID_DEFAULT_;
    var copyName = generateCopyName_(productName, vendorCode, nmAny);

    var copyFile = copyMasterSpreadsheetToFolder_(masterId, folderId, copyName);
    var copyId = copyFile.getId();
    Logger.log('createSkuCard: copyId=' + copyId + ' name=' + copyName);

    var copySs = SpreadsheetApp.openById(copyId);
    deleteDefaultBlankSheetInSpreadsheet_(copySs);

    var cfg = copySs.getSheetByName('_Config');
    if (!cfg) {
      throw new Error('В копии нет листа _Config — проверьте шаблон мастера');
    }

    upsertConfigKey_(cfg, 'OUR_SKU', vendorCode, 'Артикул / vendorCode');
    upsertConfigKey_(cfg, 'OUR_PRODUCT_NAME', productName, 'Название для имени файла');
    upsertConfigKey_(cfg, 'CATEGORY_WB', categoryWb, 'Категория WB');
    upsertConfigKey_(cfg, 'CATEGORY_OZON', categoryOzon, 'Категория Ozon');
    upsertConfigKey_(cfg, 'NMID_WB_ASMUS', nmWbAsmus, 'nmID WB Асмус');
    upsertConfigKey_(cfg, 'NMID_WB_QUANTUM', nmWbQuantum, 'nmID WB Quantum');
    upsertConfigKey_(cfg, 'NMID_OZON_ASMUS', nmOzonAsmus, 'nmID Ozon Асмус');
    upsertConfigKey_(cfg, 'NMID_OZON_QUANTUM', nmOzonQuantum, 'nmID Ozon Quantum');
    upsertConfigKey_(cfg, 'GENDER_MAP_v1', JSON.stringify(genderMap), 'JSON пола по 4 ЛК');
    upsertConfigKey_(cfg, 'ADVICE_SEO_SCHEMA_VERSION', CREATE_SKU_SCHEMA_VERSION_, '4-tab layout');

    writeSeoSheetHeaderValues_(
      copySs.getSheetByName('SEO_WB_Asmus'),
      vendorCode,
      nmWbAsmus || '<TBD>',
      categoryWb,
      'WB Асмус'
    );
    writeSeoSheetHeaderValues_(
      copySs.getSheetByName('SEO_WB_Quantum'),
      vendorCode,
      nmWbQuantum || '<TBD>',
      categoryWb,
      'WB Quantum'
    );
    writeSeoSheetHeaderValues_(
      copySs.getSheetByName('SEO_OZON_Asmus'),
      vendorCode,
      nmOzonAsmus || '<TBD>',
      categoryOzon || '<TBD>',
      'OZON Асмус'
    );
    writeSeoSheetHeaderValues_(
      copySs.getSheetByName('SEO_OZON_Quantum'),
      vendorCode,
      nmOzonQuantum || '<TBD>',
      categoryOzon || '<TBD>',
      'OZON Quantum'
    );

    cfg.hideSheet();
    Logger.log('createSkuCard: _Config hidden, SEO headers written');

    var masterSs = getTargetSpreadsheet_();
    appendSkuRegistryRow(masterSs, {
      vendorCode: vendorCode,
      product_name: productName,
      category_wb: categoryWb,
      category_ozon: categoryOzon,
      nmID_wb_asmus: nmWbAsmus,
      nmID_wb_quantum: nmWbQuantum,
      nmID_ozon_asmus: nmOzonAsmus,
      nmID_ozon_quantum: nmOzonQuantum,
      sheet_id: copyId,
      sheet_url: copyFile.getUrl(),
      gender_map_json: JSON.stringify(genderMap),
      created_at: new Date().toISOString(),
      status: 'created'
    });

    var summary = 'OK vendorCode=' + vendorCode + ' url=' + copyFile.getUrl();
    Logger.log(summary);
    return { success: true, sheetUrl: copyFile.getUrl(), sheetId: copyId };
  } catch (e) {
    Logger.log('createSkuCardFromMasterServer_ ERROR: ' + e.message);
    return { success: false, error: e.message };
  }
}

/**
 * @param {string} masterId
 * @param {string} folderId
 * @param {string} copyName
 * @return {GoogleAppsScript.Drive.File}
 */
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

/**
 * @param {GoogleAppsScript.Spreadsheet.Sheet|null} sh
 * @param {string} vendorCode
 * @param {string} nmID
 * @param {string} categoryLabel
 * @param {string} cabinetLabel
 */
function writeSeoSheetHeaderValues_(sh, vendorCode, nmID, categoryLabel, cabinetLabel) {
  if (!sh) return;
  sh.getRange(1, 2).setValue(vendorCode);
  sh.getRange(2, 2).setValue(nmID || '<TBD>');
  sh.getRange(3, 2).setValue(cabinetLabel || '');
  sh.getRange(5, 2).setValue(categoryLabel || '');
}

function upsertConfigKey_(cfgSheet, key, value, description) {
  var lr = cfgSheet.getLastRow();
  if (lr < 2) {
    cfgSheet.appendRow([key, value, description]);
    return;
  }
  var data = cfgSheet.getRange(2, 1, lr - 1, 2).getValues();
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][0]).trim() === key) {
      cfgSheet.getRange(i + 2, 2).setValue(value);
      return;
    }
  }
  cfgSheet.appendRow([key, value, description]);
}

/**
 * @param {string} productName
 * @param {string} vendorCode
 * @param {string} nmIdAny
 * @return {string}
 */
function generateCopyName_(productName, vendorCode, nmIdAny) {
  var safeProduct = String(productName || '').replace(/[\\/?*\[\]:]/g, '').trim();
  var sku = String(vendorCode || '').trim();
  var wbId = String(nmIdAny || sku).trim() || sku;
  return COPY_NAME_TEMPLATE_
    .replace('{product_name}', safeProduct)
    .replace(/\{sku_code\}/g, sku)
    .replace(/\{wb_id\}/g, wbId);
}

/**
 * Удаляет пустой лист Google по умолчанию после копирования мастера (≥1 других листов).
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 */
function deleteDefaultBlankSheetInSpreadsheet_(ss) {
  var defaultSheet = ss.getSheetByName('Лист1') || ss.getSheetByName('Sheet1');
  if (defaultSheet && ss.getSheets().length > 1) {
    ss.deleteSheet(defaultSheet);
    Logger.log('deleteDefaultBlankSheetInSpreadsheet_: removed default sheet');
  }
}
