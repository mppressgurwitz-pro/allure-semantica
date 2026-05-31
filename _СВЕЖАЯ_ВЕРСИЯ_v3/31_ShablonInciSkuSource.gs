/**
 * 31_ShablonInciSkuSource.gs — источник правды для создания SKU: Шаблон_INCI_для_Маши / SKU_INCI.
 */

var SHABLON_INCI_SPREADSHEET_ID_ = '1z9UxpQ3VCaBNk1zrOdwhui0Apml-uA4UpxuOfCDg8jk';
var SHABLON_INCI_SHEET_NAME_ = 'SKU_INCI';

/** @return {number} 1-based column index */
function colIndexFromLetter_(letters) {
  var s = String(letters || '').toUpperCase();
  var n = 0;
  for (var i = 0; i < s.length; i++) {
    n = n * 26 + (s.charCodeAt(i) - 64);
  }
  return n;
}

/**
 * @param {string} url
 * @return {string} folder/file id or ''
 */
function extractFolderIdFromUrl_(url) {
  var s = String(url || '').trim();
  if (!s) return '';
  var m = s.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (m) return m[1];
  m = s.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  return m ? m[1] : '';
}

/**
 * @param {string} internalCode Внутренний код 1С (колонка F)
 * @return {Object|null}
 */
function readShablonINCIByInternalCode_(internalCode) {
  var code = String(internalCode || '').trim();
  if (!code) return null;

  var ss = SpreadsheetApp.openById(SHABLON_INCI_SPREADSHEET_ID_);
  var sh = ss.getSheetByName(SHABLON_INCI_SHEET_NAME_);
  if (!sh || sh.getLastRow() < 2) return null;

  var lastCol = sh.getLastColumn();
  var lr = sh.getLastRow();
  var numRows = lr - 1;
  if (numRows < 1) return null;

  var colInternal = colIndexFromLetter_('F');
  var data = sh.getRange(2, 1, numRows, lastCol).getValues();

  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    if (String(row[colInternal - 1] || '').trim() !== code) continue;

    var photosUrl = String(row[lastCol - 1] || '').trim();
    return {
      internalCode: code,
      nmid_wb_quantum: String(row[0] || '').trim(),
      nmid_wb_asmus: String(row[1] || '').trim(),
      sku_ozon_quantum: String(row[2] || '').trim(),
      sku_ozon_asmus: String(row[3] || '').trim(),
      name: String(row[colIndexFromLetter_('G') - 1] || '').trim(),
      brand: String(row[colIndexFromLetter_('H') - 1] || '').trim(),
      gender_wb_quantum: String(row[colIndexFromLetter_('I') - 1] || '').trim(),
      gender_wb_asmus: String(row[colIndexFromLetter_('J') - 1] || '').trim(),
      gender_ozon_quantum: String(row[colIndexFromLetter_('K') - 1] || '').trim(),
      gender_ozon_asmus: String(row[colIndexFromLetter_('L') - 1] || '').trim(),
      inci: String(row[colIndexFromLetter_('M') - 1] || '').trim(),
      fragranceFamily: String(row[colIndexFromLetter_('AT') - 1] || '').trim(),
      topNotes: String(row[colIndexFromLetter_('AU') - 1] || '').trim(),
      midNotes: String(row[colIndexFromLetter_('AV') - 1] || '').trim(),
      baseNotes: String(row[colIndexFromLetter_('AW') - 1] || '').trim(),
      isSet: String(row[colIndexFromLetter_('AX') - 1] || '').trim(),
      setComposition: String(row[colIndexFromLetter_('AY') - 1] || '').trim(),
      photosFolderId: extractFolderIdFromUrl_(photosUrl),
      photosFolderUrl: photosUrl
    };
  }

  Logger.log('readShablonINCIByInternalCode_: not found ' + code);
  return null;
}
