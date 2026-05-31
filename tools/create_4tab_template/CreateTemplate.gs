/**
 * One-shot: createTemplateSpreadsheet()
 * Standalone Apps Script — НЕ WBLib, НЕ WBSyncLib.
 * Создаёт «ШАБЛОН 4TAB — Test Layout 2026-05-31» в папке 1gDUCk2a…
 *
 * Запуск: Apps Script Editor → Run createTemplateSpreadsheet (от mppressgurwitz@gmail.com)
 * clasp push только для этого standalone-проекта после clasp create.
 */

var TEMPLATE_FOLDER_ID_ = '1gDUCk2a9h7z0zfNzAneXJkBtlupCYxy3';
var MASHA_EMAIL_ = 'mkostuhina24@gmail.com';
var TEMPLATE_TITLE_ = 'ШАБЛОН 4TAB — Test Layout 2026-05-31';

function createTemplateSpreadsheet() {
  var folder = DriveApp.getFolderById(TEMPLATE_FOLDER_ID_);
  var ss = SpreadsheetApp.create(TEMPLATE_TITLE_);
  DriveApp.getFileById(ss.getId()).moveTo(folder);

  buildConfigSheet_(ss);
  buildCommonSheet_(ss);
  buildSeoWbAsmus_(ss);
  buildSeoWbQuantum_(ss);
  buildSeoOzonAsmus_(ss);
  buildSeoOzonQuantum_(ss);
  buildKeywordsRaw_(ss);

  DriveApp.getFileById(ss.getId()).addEditor(MASHA_EMAIL_);
  Logger.log('Created: ' + ss.getUrl());
  SpreadsheetApp.getUi().alert('Готово', ss.getUrl(), SpreadsheetApp.getUi().ButtonSet.OK);
  return ss.getUrl();
}

function buildConfigSheet_(ss) {
  var sh = ss.insertSheet('_Config');
  var rows = [
    ['key', 'value', 'description'],
    ['OUR_SKU', '<TBD>', ''],
    ['CATEGORY_WB', '<TBD>', ''],
    ['CATEGORY_OZON', '<TBD>', ''],
    ['NMID_WB_ASMUS', '<TBD>', ''],
    ['NMID_WB_QUANTUM', '<TBD>', ''],
    ['NMID_OZON_ASMUS', '<TBD>', ''],
    ['NMID_OZON_QUANTUM', '<TBD>', ''],
    ['GENDER_MAP_v1', '{"wb_asmus":"","wb_quantum":"","ozon_asmus":"","ozon_quantum":""}', 'JSON'],
    ['OZON_TEMPLATE_FILE', '<TBD>', ''],
    ['OZON_TEMPLATES_DRIVE_FOLDER_ID', '<TBD>', ''],
    ['ADVICE_SEO_SCHEMA_VERSION', '4TAB_2026-05-31', '']
  ];
  sh.getRange(1, 1, rows.length, 3).setValues(rows);
  sh.getRange(1, 1, 1, 3).setFontWeight('bold').setBackground('#d9ead3');
  sh.hideSheet();
}

function buildCommonSheet_(ss) {
  var sh = ss.insertSheet('_Common');
  var fields = [
    'ТНВЭД', 'ИКПУ', 'НДС', 'Декларация о соответствии', 'СГР',
    'Высота упаковки', 'Ширина упаковки', 'Длина упаковки',
    'Высота предмета', 'Ширина предмета', 'Длина предмета',
    'Вес упаковки', 'Штрихкод', 'Состав / INCI'
  ];
  sh.getRange(1, 1, 1, 4).setValues([['Поле', 'Значение', 'Источник', 'Примечания']])
    .setFontWeight('bold').setBackground('#cfe2f3');
  var data = fields.map(function(f) { return [f, '', '', '']; });
  sh.getRange(2, 1, 1 + data.length, 4).setValues(data);
  sh.setFrozenRows(1);
}

function buildSeoWbAsmus_(ss) {
  buildSeoSheet4Zones_(ss, 'SEO_WB_Asmus', {
    cabinet: 'WB Асмус',
    nmidKey: 'NMID_WB_ASMUS',
    genderKey: 'wb_asmus',
    limits: 'Title=60 симв., Описание=2000 симв., Характеристики=по справочнику'
  });
}

function buildSeoWbQuantum_(ss) {
  buildSeoSheet4Zones_(ss, 'SEO_WB_Quantum', {
    cabinet: 'WB Quantum',
    nmidKey: 'NMID_WB_QUANTUM',
    genderKey: 'wb_quantum',
    limits: 'Title=60 симв., Описание=2000 симв.'
  });
}

function buildSeoOzonAsmus_(ss) {
  buildSeoSheet4Zones_(ss, 'SEO_OZON_Asmus', {
    cabinet: 'OZON Асмус',
    nmidKey: 'NMID_OZON_ASMUS',
    genderKey: 'ozon_asmus',
    limits: 'Title=200 симв./27 на слово; Описание=<TBD из _Ozon_Limits>; HTML: <br>/<ul>/<li> только в описании'
  });
}

function buildSeoOzonQuantum_(ss) {
  buildSeoSheet4Zones_(ss, 'SEO_OZON_Quantum', {
    cabinet: 'OZON Quantum',
    nmidKey: 'NMID_OZON_QUANTUM',
    genderKey: 'ozon_quantum',
    limits: 'Title=200 симв./27 на слово; Описание=<TBD из _Ozon_Limits>'
  });
}

function buildSeoSheet4Zones_(ss, sheetName, meta) {
  var sh = ss.insertSheet(sheetName);
  var cfgLookup = function(key) {
    return "=INDEX(_Config!B:B,MATCH(\"" + key + "\",_Config!A:A,0))";
  };
  sh.getRange(1, 1, 8, 2).setValues([
    ['VendorCode', cfgLookup('OUR_SKU')],
    ['nmID', cfgLookup(meta.nmidKey)],
    ['Кабинет', meta.cabinet],
    ['Пол', '<TBD GENDER_MAP_v1.' + meta.genderKey + '>'],
    ['Категория WB', cfgLookup('CATEGORY_WB')],
    ['Last PULL', '(TBD)'],
    ['Last PUSH', '(TBD)'],
    ['Лимиты', meta.limits]
  ]);
  styleZoneHeader_(sh, 10, '▼ PULL — текущие значения в WB');
  sh.getRange(11, 1, 11, 3).setValues([['Поле', 'Значение в WB', 'Дата PULL']]).setFontWeight('bold');
  styleZoneHeader_(sh, 52, '▼ PUSH-черновик — что выгружаем');
  sh.getRange(53, 1, 53, 4).setValues([['Поле', 'Новое значение', 'Источник', 'Валидация']]).setFontWeight('bold');
  styleZoneHeader_(sh, 102, '▼ Семантика для этого кабинета');
  sh.getRange(103, 1, 103, 5).setValues([['Ключ', 'Частота', 'Вес', 'Использован в Title?', 'Использован в Описании?']]).setFontWeight('bold');
  sh.setFrozenRows(1);
}

function styleZoneHeader_(sh, row, title) {
  sh.getRange(row, 1, 1, 5).merge();
  sh.getRange(row, 1).setValue(title).setBackground('#efefef').setFontWeight('bold');
}

function buildKeywordsRaw_(ss) {
  var sh = ss.insertSheet('KeywordsRaw');
  sh.getRange(1, 1).setValue('Будет заполнено пайплайном WBLib (KeywordsRaw)');
  sh.getRange(2, 1).setValue('Шапка скопируется из существующих SKU-копий на этапе миграции.');
}
