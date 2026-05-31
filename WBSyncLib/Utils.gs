/**
 * Утилиты листа _Advice_SEO_Draft.
 */

const CYR_TO_LAT = {
  'А': 'A', 'В': 'B', 'С': 'C', 'Е': 'E', 'Н': 'H', 'К': 'K',
  'М': 'M', 'О': 'O', 'Р': 'P', 'Т': 'T', 'Х': 'X', 'У': 'Y',
  'І': 'I', 'Ѕ': 'S', 'Ј': 'J', 'Ѵ': 'V', 'Ԁ': 'D', 'Ν': 'N',
  'а': 'a', 'с': 'c', 'е': 'e', 'о': 'o', 'р': 'p', 'х': 'x',
  'у': 'y', 'і': 'i', 'ѕ': 's', 'ј': 'j', 'ν': 'v'
};

function openSpreadsheet_(spreadsheetOrId) {
  if (!spreadsheetOrId) throw new Error('Spreadsheet не передан');
  if (typeof spreadsheetOrId === 'string') {
    return SpreadsheetApp.openById(spreadsheetOrId);
  }
  return spreadsheetOrId;
}

function normalizeVendorCode_(s) {
  if (typeof s !== 'string') return s;
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    out += (CYR_TO_LAT[ch] !== undefined) ? CYR_TO_LAT[ch] : ch;
  }
  return out;
}

function diagnoseString_(s) {
  if (typeof s !== 'string') return [];
  const out = [];
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    const code = s.charCodeAt(i);
    const isCyr = (code >= 0x0400 && code <= 0x04FF) || CYR_TO_LAT[ch] !== undefined;
    out.push({
      idx: i,
      char: ch,
      codeHex: 'U+' + code.toString(16).toUpperCase().padStart(4, '0'),
      isCyr: isCyr,
      latReplace: CYR_TO_LAT[ch] || null
    });
  }
  return out;
}

function describeCyrIssues_(s) {
  const diag = diagnoseString_(s);
  const bad = diag.filter(function(d) { return d.isCyr; });
  if (!bad.length) return '';
  const list = bad.map(function(d) {
    return 'позиция ' + (d.idx + 1) + ': "' + d.char + '" (' + d.codeHex + ') → "' + (d.latReplace || '?') + '"';
  }).join('\n');
  return 'В артикуле "' + s + '" найдены кириллические символы:\n' + list;
}

function findTechBlock_(all) {
  let start = -1;
  let end = -1;
  for (let i = 0; i < all.length; i++) {
    const cell = String(all[i][0] || '');
    if (start === -1 && cell.indexOf(WBSYNC_CONFIG.TECH_START_MARKER) >= 0) start = i;
    if (cell.indexOf(WBSYNC_CONFIG.TECH_END_MARKER) >= 0) end = i;
  }
  return (start >= 0 && end >= 0) ? { start: start, end: end } : null;
}

function hasField_(all, block, fieldName) {
  for (let i = block.start; i <= block.end; i++) {
    if (String(all[i][0] || '').trim() === fieldName) return true;
  }
  return false;
}

function readField_(all, block, fieldName) {
  for (let i = block.start; i <= block.end; i++) {
    if (String(all[i][0] || '').trim() === fieldName) {
      return String(all[i][1] || '').trim();
    }
  }
  return '';
}

function findFieldRow_(all, block, fieldName) {
  for (let i = block.start; i <= block.end; i++) {
    if (String(all[i][0] || '').trim() === fieldName) return i;
  }
  return -1;
}

function isSkippableFieldRow_(field) {
  if (!field) return true;
  if (field.startsWith('—') || field.startsWith('▼') || field.startsWith('▲')) return true;
  return WBSYNC_CONFIG.DOC_ROW_PATTERN.test(field);
}

function isPullableField_(name) {
  return ['Title (наименование)'].indexOf(name) < 0;
}

function splitValue_(s) {
  if (typeof s !== 'string') return s;
  const trimmed = s.trim();
  if (trimmed.indexOf(';') >= 0) {
    return trimmed.split(';').map(function(x) { return x.trim(); }).filter(Boolean);
  }
  return trimmed;
}

function getCabinetFromSheet_(ss) {
  const draft = ss.getSheetByName(WBSYNC_CONFIG.DRAFT_SHEET);
  if (!draft) return '';
  return String(draft.getRange('B1').getValue() || '').trim();
}

function assertCabinetConfigured_(ss, operation) {
  const cabinet = getCabinetFromSheet_(ss);
  if (!cabinet || (cabinet !== WBSYNC_CONFIG.CABINETS.ASMUS && cabinet !== WBSYNC_CONFIG.CABINETS.QUANTUM)) {
    SpreadsheetApp.getUi().alert(
      'Ошибка маршрутизации',
      operation + ' отменён.\n\n' +
      'Ячейка _Advice_SEO_Draft!B1 должна содержать «Asmus» или «Quantum».\n' +
      'Сейчас: «' + cabinet + '» (пусто = ошибка).\n\n' +
      'Заполните B1 и повторите.',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    return null;
  }
  return cabinet;
}

function assertCabinetMatches_(ss, targetCabinet, operation) {
  const configured = assertCabinetConfigured_(ss, operation);
  if (!configured) return null;
  if (configured !== targetCabinet) {
    SpreadsheetApp.getUi().alert(
      'Несовпадение кабинета',
      operation + ' в кабинет «' + targetCabinet + '» отменён.\n\n' +
      'В B1 указан «' + configured + '».\n' +
      'Измените B1 или выберите операцию для нужного кабинета.',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    return null;
  }
  return configured;
}

function appendSyncLog_(ss, message) {
  let sh = ss.getSheetByName(WBSYNC_CONFIG.SYNC_LOG_SHEET);
  if (!sh) {
    sh = ss.insertSheet(WBSYNC_CONFIG.SYNC_LOG_SHEET);
    sh.getRange(1, 1, 1, 3).setValues([['Timestamp', 'Cabinet', 'Message']]).setFontWeight('bold');
  }
  sh.appendRow([new Date(), '', message]);
}

function sleepMs_(ms) {
  Utilities.sleep(ms);
}
