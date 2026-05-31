/**
 * 27_OzonTemplates.gs — bundle-копия для рестарта 2026-05-31.
 * Источник: _СВЕЖАЯ_ВЕРСИЯ_v3/27_OzonTemplates.gs (WBLib на сервере).
 *
 * Известные дефекты (чинить после ЧП-3):
 *  D2 — FILES с датой 27.05.2026; поиск на Drive — findOzonTemplateFile_ (префикс из ozon_limits.json)
 *  D3 — LOCAL_PATH C:\... → OZON_TEMPLATES_DRIVE_FOLDER_ID (Google Drive)
 *  D4 — fallback 'Косметика для ухода' в resolveOzonTemplateForWbCategory_ → Ui.alert, без default
 */

/**
 * 27_OzonTemplates.gs
 * Сопоставление категории WB → шаблон выгрузки Ozon (xlsx).
 * Локальные шаблоны: OneDrive\ОП_E-COMMERCE\Автоматизация\Шаблоны для SEO-Ozon
 */

var OZON_TEMPLATES = {
  LOCAL_PATH: 'C:\\Users\\mb\\OneDrive - Allure City, Inc\\ОП_E-COMMERCE\\Автоматизация\\Шаблоны для SEO-Ozon',
  MAP_SHEET: '_Ozon_Template_Map',
  /** Имена файлов (актуальная дата в имени — обновлять при смене шаблона Маши) */
  FILES: {
    'Парфюмерия': 'Парфюмерия_27.05.2026.xlsx',
    'Свеча': 'Свеча_27.05.2026.xlsx',
    'Соль для ванны': 'Соль для ванны_27.05.2026.xlsx',
    'Косметика для ухода': 'Косметика для ухода_27.05.2026.xlsx',
    'Косметика для ухода за волосами': 'Косметика_для_ухода_за_волосами_27_05_2026.xlsx',
    'Косметика для волос': 'Косметика_для_ухода_за_волосами_27_05_2026.xlsx',
    'Ароматы для дома': 'Ароматы для дома_27.05.2026.xlsx',
    'Средство после бритья': 'Средство после бритья_27.05.2026.xlsx',
    'Средства для гигиены тела': 'Средства для гигиены тела_27.05.2026.xlsx'
  },
  /**
   * Каноническая категория Ozon (configs / ozon_limits.json) → префикс имени xlsx на Drive.
   * Где совпадает с именем категории — как есть; иначе underscore-форма файла Маши.
   */
  OZON_CATEGORY_TO_FILENAME_PREFIX: {
    'Ароматы для дома': 'Ароматы для дома',
    'Косметика для ухода': 'Косметика для ухода',
    'Косметика для ухода за волосами': 'Косметика_для_ухода_за_волосами',
    'Косметика для волос': 'Косметика_для_ухода_за_волосами',
    'Парфюмерия': 'Парфюмерия',
    'Свеча': 'Свеча',
    'Соль для ванны': 'Соль для ванны',
    'Средства для гигиены тела': 'Средства для гигиены тела',
    'Средство после бритья': 'Средство после бритья'
  },
  /** Категория WB (subjectName / _WB_Char_Dict) → категория Ozon */
  WB_TO_OZON: {
    'Шампуни': 'Косметика для волос',
    'Кондиционеры для волос': 'Косметика для волос',
    'Пилинг': 'Косметика для ухода',
    'Гели': 'Косметика для ухода',
    'Спреи': 'Косметика для ухода',
    'Лосьоны': 'Косметика для ухода',
    'Мыло косметическое': 'Средства для гигиены тела',
    'Дезодоранты': 'Средства для гигиены тела',
    'Парфюмерная вода': 'Парфюмерия',
    'Духи': 'Парфюмерия',
    'Туалетная вода': 'Парфюмерия',
    'Парфюм для дома': 'Ароматы для дома',
    'Саше ароматические': 'Ароматы для дома',
    'Соль для ванн': 'Соль для ванны',
    'Косметические наборы для ухода': 'Косметика для ухода'
  }
};

function setupOzonTemplateMapSheet() {
  const ss = getTargetSpreadsheet_();
  const log = newLogContext_('setupOzonTemplateMap');
  try {
    ensureOzonTemplateMapSheet_(ss);
    log.flush('OK');
    SpreadsheetApp.getUi().alert(
      'Лист «' + OZON_TEMPLATES.MAP_SHEET + '» готов в мастер-файле.\n' +
      'Путь к xlsx: ' + OZON_TEMPLATES.LOCAL_PATH
    );
  } catch (e) {
    log.error(e.message);
    log.flush('ERROR');
    SpreadsheetApp.getUi().alert('Ошибка: ' + e.message);
  }
}

function ensureOzonTemplateMapSheet_(ss) {
  let sh = ss.getSheetByName(OZON_TEMPLATES.MAP_SHEET);
  if (!sh) {
    sh = ss.insertSheet(OZON_TEMPLATES.MAP_SHEET);
  }
  sh.clear();
  const headers = [
    'Категория WB', 'Категория Ozon', 'Файл шаблона xlsx', 'Локальный путь', 'Примечания'
  ];
  sh.getRange(1, 1, 1, headers.length).setValues([headers])
    .setFontWeight('bold').setBackground('#cfe2f3');
  sh.setFrozenRows(1);

  const rows = [];
  Object.keys(OZON_TEMPLATES.WB_TO_OZON).forEach(function(wbCat) {
    const ozonCat = OZON_TEMPLATES.WB_TO_OZON[wbCat];
    const file = OZON_TEMPLATES.FILES[ozonCat] || '';
    rows.push([wbCat, ozonCat, file, OZON_TEMPLATES.LOCAL_PATH, '']);
  });
  if (rows.length) {
    sh.getRange(2, 1, 1 + rows.length, headers.length).setValues(rows);
  }

  sh.getRange(1, 6).setValue('LOCAL_ROOT').setFontWeight('bold');
  sh.getRange(2, 6).setValue(OZON_TEMPLATES.LOCAL_PATH);
  return sh;
}

function resolveOzonTemplateForWbCategory_(wbCategory) {
  const raw = String(wbCategory || '').trim();
  if (!raw) return { ozonCategory: '', templateFile: '', localPath: OZON_TEMPLATES.LOCAL_PATH };

  let ozonCat = OZON_TEMPLATES.WB_TO_OZON[raw];
  if (!ozonCat) {
    Object.keys(OZON_TEMPLATES.WB_TO_OZON).forEach(function(k) {
      if (!ozonCat && (raw.indexOf(k) >= 0 || k.indexOf(raw) >= 0)) ozonCat = OZON_TEMPLATES.WB_TO_OZON[k];
    });
  }
  // D4: убрать fallback, заменить на Ui.alert
  if (!ozonCat) ozonCat = 'Косметика для ухода';

  const driveFile = findOzonTemplateFile_(ozonCat);
  const templateFile = driveFile
    ? driveFile.getName()
    : (OZON_TEMPLATES.FILES[ozonCat] || '');

  return {
    wbCategory: raw,
    ozonCategory: ozonCat,
    templateFile: templateFile,
    localPath: OZON_TEMPLATES.LOCAL_PATH,
    fullPath: OZON_TEMPLATES.LOCAL_PATH + '\\' + templateFile
  };
}

/** Script Property OZON_TEMPLATES_DRIVE_FOLDER_ID — папка xlsx Ozon на Google Drive */
function getOzonTemplatesDriveFolderId_() {
  return PropertiesService.getScriptProperties().getProperty('OZON_TEMPLATES_DRIVE_FOLDER_ID') || '';
}

/**
 * Ищет свежий xlsx шаблон в папке Drive по префиксу (см. OZON_CATEGORY_TO_FILENAME_PREFIX).
 * @param {string} ozonCategory
 * @return {GoogleAppsScript.Drive.File|null}
 */
function findOzonTemplateFile_(ozonCategory) {
  const folderId = getOzonTemplatesDriveFolderId_();
  if (!folderId || !ozonCategory) return null;

  const folder = DriveApp.getFolderById(folderId);
  const prefix = OZON_TEMPLATES.OZON_CATEGORY_TO_FILENAME_PREFIX[ozonCategory] || ozonCategory;
  const it = folder.getFiles();
  var best = null;
  var bestName = '';
  while (it.hasNext()) {
    const f = it.next();
    const name = f.getName();
    if (!/\.xlsx$/i.test(name)) continue;
    if (name.indexOf(prefix) !== 0) continue;
    if (!best || name.localeCompare(bestName) > 0) {
      best = f;
      bestName = name;
    }
  }
  return best;
}

function applyOzonTemplateConfigToCopy_(ss) {
  const draft = ss.getSheetByName('_Advice_SEO_Draft');
  let wbCategory = '';
  if (draft) {
    const all = draft.getDataRange().getValues();
    const block = findTechBlock4LK_(all);
    if (block) {
      wbCategory = readFieldInBlock_(all, block, 'Категория WB');
    }
  }
  const resolved = resolveOzonTemplateForWbCategory_(wbCategory);
  let cfg = ss.getSheetByName('_Config');
  if (!cfg) return resolved;

  upsertConfigParamOnSheet_(cfg, 'OZON_TEMPLATE_CATEGORY', resolved.ozonCategory, 'Категория Ozon для xlsx');
  upsertConfigParamOnSheet_(cfg, 'OZON_TEMPLATE_FILE', resolved.templateFile, 'Имя файла шаблона Ozon');
  upsertConfigParamOnSheet_(cfg, 'OZON_TEMPLATES_LOCAL_PATH', resolved.localPath, 'OneDrive путь к папке шаблонов');
  if (resolved.fullPath) {
    upsertConfigParamOnSheet_(cfg, 'OZON_TEMPLATE_FULL_PATH', resolved.fullPath, 'Полный путь к xlsx');
  }
  return resolved;
}

function upsertConfigParamOnSheet_(cfgSh, key, value, description) {
  const lr = cfgSh.getLastRow();
  if (lr < 2) {
    cfgSh.appendRow([key, value, description]);
    return;
  }
  const data = cfgSh.getRange(2, 1, lr - 1, 2).getValues();
  for (let i = 0; i < data.length; i++) {
    if (String(data[i][0]).trim() === key) {
      cfgSh.getRange(i + 2, 2).setValue(value);
      return;
    }
  }
  cfgSh.appendRow([key, value, description]);
}

function showOzonExportHintDialog() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const cfg = ss.getSheetByName('_Config');
  let msg = 'Выгрузка Ozon (xlsx):\n\n';
  msg += 'SEO для Ozon пишется в колонки E (OZON Асмус) и F (OZON Quantum) листа _Advice_SEO_Draft.\n\n';
  msg += 'Папка шаблонов:\n' + OZON_TEMPLATES.LOCAL_PATH + '\n\n';

  if (cfg && cfg.getLastRow() >= 2) {
    const data = cfg.getRange(2, 1, cfg.getLastRow() - 1, 2).getValues();
    const pick = {};
    data.forEach(function(r) { pick[String(r[0]).trim()] = String(r[1] || ''); });
    if (pick.OZON_TEMPLATE_FILE) {
      msg += 'Шаблон для этого SKU: ' + pick.OZON_TEMPLATE_FILE + '\n';
      msg += 'Категория Ozon: ' + (pick.OZON_TEMPLATE_CATEGORY || '—') + '\n';
    }
  }
  msg += '\nАвто-заполнение xlsx — в следующей фазе (после ЧП-5 WB).';
  SpreadsheetApp.getUi().alert('Ozon — шаблоны', msg, SpreadsheetApp.getUi().ButtonSet.OK);
}
