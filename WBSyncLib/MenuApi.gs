/**
 * Публичный API WBSyncLib — вызывается из SeoWrapper.gs в копиях.
 */

function pullFromAsmus(spreadsheet) {
  pullFromCabinet_(spreadsheet, WBSYNC_CONFIG.CABINETS.ASMUS);
}

function pullFromQuantum(spreadsheet) {
  pullFromCabinet_(spreadsheet, WBSYNC_CONFIG.CABINETS.QUANTUM);
}

function pushToAsmus(spreadsheet) {
  pushToCabinet_(spreadsheet, WBSYNC_CONFIG.CABINETS.ASMUS);
}

function pushToQuantum(spreadsheet) {
  pushToCabinet_(spreadsheet, WBSYNC_CONFIG.CABINETS.QUANTUM);
}

function transferSeoToTechBlock(spreadsheet) {
  transferSeoToTechBlock_(spreadsheet);
}

function clearNewValues(spreadsheet) {
  clearNewValuesInTechBlock_(spreadsheet);
}

function diagnoseVendor(spreadsheet) {
  diagnoseVendor_(spreadsheet);
}

function fixVendorCode(spreadsheet) {
  fixVendorCodeInSheet_(spreadsheet);
}

function getNotFoundFields(spreadsheet, cabinet) {
  return diagnoseNotFoundAfterPull_(spreadsheet, cabinet);
}

function setCabinet(spreadsheet, cabinet) {
  setCabinetInSheet_(spreadsheet, cabinet);
}

function autoTransferSeoOnOpen(spreadsheet) {
  try {
    transferSeoToTechBlockInternal_(openSpreadsheet_(spreadsheet), true);
  } catch (err) {
    Logger.log('autoTransferSeo: ' + err.message);
  }
}
