/**
 * InjectMasterTemplate.gs — одноразовая прошивка мастера 7-листной 4TAB-схемой.
 * Запуск: Apps Script Editor мастера → Run injectTemplatesIntoMaster
 *
 * Мастер: 16OBo1Enr19SFOuLm2pNy_JagMFppNqXKsYlUbLw_8S0
 * Структура листов — из tools/create_4tab_template/CreateTemplate.gs (ШАБЛОН 4TAB).
 *
 * СТОП: не запускать без бэкапа (функция делает makeCopy автоматически).
 * Idempotent: существующие целевые листы не перезаписываются.
 */

var MASTER_SPREADSHEET_ID_INJECT_ = '16OBo1Enr19SFOuLm2pNy_JagMFppNqXKsYlUbLw_8S0';

var INJECT_SHEET_NAMES_4TAB_ = [
  '_Config',
  '_Common',
  'SEO_WB_Asmus',
  'SEO_WB_Quantum',
  'SEO_OZON_Asmus',
  'SEO_OZON_Quantum',
  'KeywordsRaw'
];

/**
 * Бэкап мастера + добавление недостающих листов шаблона.
 * @return {string} summary для alert / Logger
 */
function injectTemplatesIntoMaster() {
  var masterFile = DriveApp.getFileById(MASTER_SPREADSHEET_ID_INJECT_);
  var parentIter = masterFile.getParents();
  var folder = parentIter.hasNext() ? parentIter.next() : DriveApp.getRootFolder();
  var stamp = Utilities.formatDate(new Date(), 'GMT+3', 'yyyy-MM-dd_HHmm');
  var backupName = 'Основная Сравнение конкурентов BACKUP 2026-05-31_' + stamp;
  var backupFile = masterFile.makeCopy(backupName, folder);
  var backupUrl = backupFile.getUrl();

  var ss = SpreadsheetApp.openById(MASTER_SPREADSHEET_ID_INJECT_);
  var created = [];
  var skipped = [];

  INJECT_SHEET_NAMES_4TAB_.forEach(function(sheetName) {
    if (ss.getSheetByName(sheetName)) {
      skipped.push(sheetName);
      Logger.log('injectTemplatesIntoMaster: skip existing ' + sheetName);
      return;
    }
    injectBuildSheetByName_(ss, sheetName);
    created.push(sheetName);
  });

  var summary =
    'Бэкап: ' + backupUrl + '\n\n' +
    'Создано листов: ' + (created.length ? created.join(', ') : '(нет)') + '\n' +
    'Пропущено (уже были): ' + (skipped.length ? skipped.join(', ') : '(нет)');

  Logger.log(summary);
  SpreadsheetApp.getUi().alert('injectTemplatesIntoMaster', summary, SpreadsheetApp.getUi().ButtonSet.OK);
  return summary;
}

function injectBuildSheetByName_(ss, sheetName) {
  switch (sheetName) {
    case '_Config': injectBuildConfigSheet_(ss); break;
    case '_Common': injectBuildCommonSheet_(ss); break;
    case 'SEO_WB_Asmus': injectBuildSeoWbAsmus_(ss); break;
    case 'SEO_WB_Quantum': injectBuildSeoWbQuantum_(ss); break;
    case 'SEO_OZON_Asmus': injectBuildSeoOzonAsmus_(ss); break;
    case 'SEO_OZON_Quantum': injectBuildSeoOzonQuantum_(ss); break;
    case 'KeywordsRaw': injectBuildKeywordsRaw_(ss); break;
    default:
      throw new Error('injectBuildSheetByName_: unknown sheet ' + sheetName);
  }
}

/** _Config в мастере — видимый шаблон-донор (без hideSheet). */
function injectBuildConfigSheet_(ss) {
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
}

function injectBuildCommonSheet_(ss) {
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
  if (data.length) {
    sh.getRange(2, 1, 1 + data.length, 4).setValues(data);
  }
  sh.setFrozenRows(1);
}

function injectBuildSeoWbAsmus_(ss) {
  injectBuildSeoSheet4Zones_(ss, 'SEO_WB_Asmus', {
    cabinet: 'WB Асмус',
    nmidKey: 'NMID_WB_ASMUS',
    genderKey: 'wb_asmus',
    limits: 'Title=60 симв., Описание=2000 симв., Характеристики=по справочнику'
  });
}

function injectBuildSeoWbQuantum_(ss) {
  injectBuildSeoSheet4Zones_(ss, 'SEO_WB_Quantum', {
    cabinet: 'WB Quantum',
    nmidKey: 'NMID_WB_QUANTUM',
    genderKey: 'wb_quantum',
    limits: 'Title=60 симв., Описание=2000 симв.'
  });
}

function injectBuildSeoOzonAsmus_(ss) {
  injectBuildSeoSheet4Zones_(ss, 'SEO_OZON_Asmus', {
    cabinet: 'OZON Асмус',
    nmidKey: 'NMID_OZON_ASMUS',
    genderKey: 'ozon_asmus',
    limits: 'Title=200 симв./27 на слово; Описание=<TBD из _Ozon_Limits>; HTML: <br>/<ul>/<li> только в описании'
  });
}

function injectBuildSeoOzonQuantum_(ss) {
  injectBuildSeoSheet4Zones_(ss, 'SEO_OZON_Quantum', {
    cabinet: 'OZON Quantum',
    nmidKey: 'NMID_OZON_QUANTUM',
    genderKey: 'ozon_quantum',
    limits: 'Title=200 симв./27 на слово; Описание=<TBD из _Ozon_Limits>'
  });
}

function injectBuildSeoSheet4Zones_(ss, sheetName, meta) {
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
  injectStyleZoneHeader_(sh, 10, '▼ PULL — текущие значения в WB');
  sh.getRange(11, 1, 1, 3).setValues([['Поле', 'Значение в WB', 'Дата PULL']]).setFontWeight('bold');
  injectStyleZoneHeader_(sh, 52, '▼ PUSH-черновик — что выгружаем');
  sh.getRange(53, 1, 1, 4).setValues([['Поле', 'Новое значение', 'Источник', 'Валидация']]).setFontWeight('bold');
  injectStyleZoneHeader_(sh, 102, '▼ Семантика для этого кабинета');
  sh.getRange(103, 1, 1, 5).setValues([['Ключ', 'Частота', 'Вес', 'Использован в Title?', 'Использован в Описании?']]).setFontWeight('bold');
  sh.setFrozenRows(1);
}

function injectStyleZoneHeader_(sh, row, title) {
  sh.getRange(row, 1, 1, 5).merge();
  sh.getRange(row, 1).setValue(title).setBackground('#efefef').setFontWeight('bold');
}

function injectBuildKeywordsRaw_(ss) {
  var sh = ss.insertSheet('KeywordsRaw');
  sh.getRange(1, 1).setValue('Будет заполнено пайплайном WBLib (KeywordsRaw)');
  sh.getRange(2, 1).setValue('Шапка скопируется из существующих SKU-копий на этапе миграции.');
}
