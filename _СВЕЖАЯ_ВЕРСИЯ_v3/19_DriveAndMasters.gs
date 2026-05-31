/**
 * 19_DriveAndMasters.gs
 * Создание мастер-файлов + Drive auto-flow + помощники.
 */

function initMasterFiles() {
  const log = newLogContext_('initMasterFiles');
  try {
    const folderId = String(getParam_('DRIVE_INBOX_FOLDER_ID', CONFIG.DEFAULTS.DRIVE_INBOX_FOLDER_ID));
    log.step('Inbox folder: ' + folderId);
    const folder = DriveApp.getFolderById(folderId);

    let ettId = String(getParam_('ETIQUETTES_MASTER_ID', '') || '').trim();
    if (!ettId) {
      const f = SpreadsheetApp.create('Etiquettes_Master');
      ettId = f.getId();
      upsertConfig_('ETIQUETTES_MASTER_ID', ettId, 'ID Etiquettes_Master');
      DriveApp.getFileById(ettId).moveTo(folder);
      buildEtiquettesMasterStructure_(f);
      log.step('✓ Etiquettes_Master: ' + ettId);
      SpreadsheetApp.flush();
    } else log.step('• Etiquettes_Master уже есть: ' + ettId);

    let rulesId = String(getParam_('RULES_MASTER_ID', '') || '').trim();
    if (!rulesId) {
      const f = SpreadsheetApp.create('Rules_Master');
      rulesId = f.getId();
      upsertConfig_('RULES_MASTER_ID', rulesId, 'ID Rules_Master');
      DriveApp.getFileById(rulesId).moveTo(folder);
      buildRulesMasterStructure_(f);
      log.step('✓ Rules_Master: ' + rulesId);
      SpreadsheetApp.flush();
    } else log.step('• Rules_Master уже есть: ' + rulesId);

    upsertConfig_('DRIVE_INBOX_FOLDER_ID', folderId, 'Inbox folder');
    log.flush('OK');
    try { SpreadsheetApp.getActive().toast('Мастер-файлы готовы', '✅', 8); } catch (e) {}
  } catch (e) {
    log.error(e.message); log.flush('ERROR'); throw e;
  }
}

function upsertConfig_(key, value, descr) {
  const ss = getTargetSpreadsheet_();
  const sh = ss.getSheetByName(CONFIG.SERVICE_TABS.CONFIG);
  if (!sh) throw new Error('Нет _Config');
  const lr = sh.getLastRow();
  if (lr < 2) { sh.appendRow([key, value, descr]); return; }
  const data = sh.getRange(2, 1, lr - 1, 2).getValues();
  for (let i = 0; i < data.length; i++) {
    if (String(data[i][0]).trim() === key) { sh.getRange(i + 2, 2).setValue(value); return; }
  }
  sh.appendRow([key, value, descr]);
}

function buildEtiquettesMasterStructure_(ss) {
  const def = ss.getSheets()[0];
  def.setName('Состав_SKU');
  // v3.3 schema (20 cols):
  // 1-11: base (как было)
  // 12: category, 13: fragrance_number, 14-15: key_notes EN/RU,
  // 16: volume_ml, 17: family_id, 18: is_reference, 19: is_set, 20: set_components
  def.getRange(1, 1, 1, 20).setValues([[
    'Артикул','Название','Бренд','Пол','INCI с этикетки','Фото (link)',
    'Обновлено','Кто','Заметки','Внутренний код','Ozon артикул',
    'Категория','Номер аромата','Key notes (EN)','Ключевые ноты (RU)',
    'Объём (мл)','Family ID','Эталон Y/N','Набор Y/N','Состав набора (WB nmID через запятую)'
  ]]).setFontWeight('bold').setBackground('#fff2cc');
  def.setFrozenRows(1);
  def.setColumnWidth(12, 160); def.setColumnWidth(13, 100);
  def.setColumnWidth(14, 180); def.setColumnWidth(15, 180);
  def.setColumnWidth(16, 80);  def.setColumnWidth(17, 100);
  def.setColumnWidth(18, 90);  def.setColumnWidth(19, 90);
  def.setColumnWidth(20, 260);

  const ac = ss.insertSheet('Approved_claims');
  ac.getRange(1, 1, 1, 6).setValues([['SKU/Бренд','Claim','Y/N','Документ','Кто','Дата']])
    .setFontWeight('bold').setBackground('#d9ead3');
  ac.setFrozenRows(1);

  const ocr = ss.insertSheet('OCR_очередь');
  ocr.getRange(1, 1, 1, 4).setValues([['Артикул','Фото link','Статус','Заметки']])
    .setFontWeight('bold').setBackground('#cfe2f3');
  ocr.setFrozenRows(1);
}

function buildRulesMasterStructure_(ss) {
  const def = ss.getSheets()[0];
  def.setName('Правила');
  def.getRange(1, 1, 1, 7).setValues([['ID','Раздел','Правило','Severity','Active','Дата','Комментарий']])
    .setFontWeight('bold').setBackground('#fff2cc');
  // v3.1 — 13 минимальных правил, согласованных 14.05.2026.
  // Источник: пользователь Михаил, после анализа конкурентов на WB.
  const rules = [
    ['R-01','Plotnost','Не заспамляй текст, но обеспечь прямые вхождения. Избегай повторения слова >3 раз','soft','Y','2026-05-14','#1'],
    ['R-02','Sostav','Данные о составе — только с этикетки (INCI)','hard','Y','2026-05-14','#2'],
    ['R-03','Sostav','3-5 главных активных компонентов в описании НА РУССКОМ','hard','Y','2026-05-14','#3'],
    ['R-04','Audience','Пол ЦА строгий — без слов противоположного пола','hard','Y','2026-05-14','#4'],
    ['R-05','Filter','Без имён, чужих брендов и чисел (кроме объёма в characteristics)','hard','Y','2026-05-14','#5'],
    ['R-06','Length','Description: цель 1800–2500 симв, max 3000, не короче 1800','hard','Y','2026-05-14','#6 (поднято с 700-1500)'],
    ['R-07','Style','Продающее SEO под WB. Фактическое, конкретное','soft','Y','2026-05-14','#7'],
    ['R-08','Title','Title без бренда и без повторения литража','hard','Y','2026-05-14','#8'],
    ['R-09','Sentence','Начало предложения без указательных местоимений (этот, эта, данный…)','hard','Y','2026-05-14','#9'],
    ['R-10','Density','Первые 2 абзаца — самые ВЧ-ключи в прямом вхождении (мин 8 из 15)','hard','Y','2026-05-14','#10 — ключевое'],
    ['R-11','Brand','Бренд в начале описания — оригинал (латиница). Транслит — один раз в середине','hard','Y','2026-05-14','#11'],
    ['R-12','Structure','Без подзаголовков блоков. Без вопросительных предложений','hard','Y','2026-05-14','#12'],
    ['R-13','CTA','Не завершать description призывом к покупке','hard','Y','2026-05-14','#13'],
    // Сохранённое жёсткое правило безопасности — медицинских заявлений всё равно нельзя.
    ['R-SAFE','Safety','Запрет: лечит, от <диагноза>, 100%, гарантирую, клинически доказано, №1','hard','Y','2026-05-14','медицина']
  ];
  def.getRange(2, 1, rules.length, 7).setValues(rules);
  def.setFrozenRows(1);

  const br = ss.insertSheet('Бренды');
  br.getRange(1, 1, 1, 4).setValues([['Бренд','Варианты_написания','Дефолтный_пол','Заметки']])
    .setFontWeight('bold').setBackground('#d9ead3');
  br.getRange(2, 1, 3, 4).setValues([
    ['SAVACE & HERBS','SAVACE & HERBS|SAVACE HERBS|SAVACE|Savage&Herbs|Савач|Savach','мужской',''],
    ['PressGurwitz','PressGurwitz|Press Gurwitz|Пресс Гурвитц','унисекс',''],
    ['Glow Witch','Glow Witch|GlowWitch|Глоу Витч','женский','']
  ]);
  br.setFrozenRows(1);

  const lex = ss.insertSheet('Лексикон');
  lex.getRange(1, 1, 1, 3).setValues([['Слово','Уровень','Комментарий']])
    .setFontWeight('bold').setBackground('#cfe2f3');
  const lexRows = [].concat(
    CONFIG.SAFETY_RED_LEXICON.map(w => [w, 'red', '']),
    CONFIG.SAFETY_AMBER_LEXICON.map(w => [w, 'amber', ''])
  );
  lex.getRange(2, 1, lexRows.length, 3).setValues(lexRows);
  lex.setFrozenRows(1);
}

function openEtiquettesMaster() {
  const id = String(getParam_('ETIQUETTES_MASTER_ID', '') || '').trim();
  if (!id) { try { SpreadsheetApp.getUi().alert('Сначала Создать мастер-файлы'); } catch (e) {} return; }
  const html = HtmlService.createHtmlOutput('<script>window.open("https://docs.google.com/spreadsheets/d/' + id + '/edit");google.script.host.close();</script>').setWidth(50).setHeight(50);
  SpreadsheetApp.getUi().showModalDialog(html, '...');
}
function openRulesMaster() {
  const id = String(getParam_('RULES_MASTER_ID', '') || '').trim();
  if (!id) { try { SpreadsheetApp.getUi().alert('Сначала Создать мастер-файлы'); } catch (e) {} return; }
  const html = HtmlService.createHtmlOutput('<script>window.open("https://docs.google.com/spreadsheets/d/' + id + '/edit");google.script.host.close();</script>').setWidth(50).setHeight(50);
  SpreadsheetApp.getUi().showModalDialog(html, '...');
}

function downloadInciTemplate() {
  const log = newLogContext_('downloadInciTemplate');
  try {
    const folderId = String(getParam_('DRIVE_INBOX_FOLDER_ID', CONFIG.DEFAULTS.DRIVE_INBOX_FOLDER_ID));
    const folder = DriveApp.getFolderById(folderId);
    const ss = SpreadsheetApp.create('Шаблон_INCI_для_Маши');
    const id = ss.getId();
    DriveApp.getFileById(id).moveTo(folder);
    const sh = ss.getSheets()[0];
    sh.setName('SKU_INCI');
    sh.getRange(1, 1, 1, 8).setValues([['Артикул WB (nmID)','Внутренний код','Ozon артикул','Название','Бренд','Пол','INCI','Заметки']])
      .setFontWeight('bold').setBackground('#fff2cc');
    sh.setFrozenRows(1);
    log.flush('OK');
    try { SpreadsheetApp.getUi().alert('Шаблон создан: ' + ss.getUrl()); } catch (e) {}
  } catch (e) { log.error(e.message); log.flush('ERROR'); throw e; }
}

function startDriveAutoFlow() {
  const ui = SpreadsheetApp.getUi();
  const log = newLogContext_('startDriveAutoFlow');
  try {
    const folderId = String(getParam_('DRIVE_INBOX_FOLDER_ID', CONFIG.DEFAULTS.DRIVE_INBOX_FOLDER_ID));
    const ourSku = String(getParam_('OUR_SKU', CONFIG.DEFAULTS.OUR_SKU)).trim();
    log.step('🔎 Ищу под-папку для SKU ' + ourSku);
    const parent = DriveApp.getFolderById(folderId);
    const folders = parent.getFolders();
    let target = null;
    while (folders.hasNext()) {
      const f = folders.next();
      if (f.getName().indexOf(ourSku) === 0) { target = f; break; }
    }
    if (!target) { try { ui.alert('Не нашёл под-папку с " ' + ourSku + ' "'); } catch (e) {} log.flush('NOFOLDER'); return; }
    log.step('✓ Папка: ' + target.getName());

    const classified = classifyDriveSubfolder_(target, log);
    log.step('WB=' + (classified.wb ? '✓' : '—') + ' MGc=' + classified.mg_clusters.length +
             ' MGs=' + classified.mg_shelves.length);
    PropertiesService.getDocumentProperties().setProperty(CONFIG.PROP_KEYS.AUTO_FLOW_STATE, JSON.stringify({
      sku: ourSku, folderId: target.getId(), classified, step: 'wb', start: new Date().toISOString()
    }));
    if (classified.wb) { log.step('🚀 WB'); runFullPipeline(classified.wb.convertedId, classified.wb.originalName); }
    if (classified.mg_clusters.length || classified.mg_shelves.length) {
      log.step('🚦 MG → очередь');
      mgQueueEnqueue_(classified.mg_clusters.map(x => x.convertedId), classified.mg_shelves.map(x => x.convertedId), log);
      mgQueueWorker_(true);
      scheduleClaudeWaiter_();
    } else {
      try { generateFullSeo(); } catch (e) {}
    }
    log.flush('OK');
    try { ui.alert('🚀 Запущено', 'Прогресс — в _Logs', ui.ButtonSet.OK); } catch (e) {}
  } catch (e) {
    log.error(e.message); log.flush('ERROR');
    try { ui.alert('Ошибка: ' + e.message); } catch (ex) {}
  }
}

function classifyDriveSubfolder_(folder, log) {
  const result = { wb: null, mg_clusters: [], mg_shelves: [], etiquettes: [] };
  const files = folder.getFiles();
  while (files.hasNext()) {
    const f = files.next();
    const name = f.getName();
    const mime = f.getMimeType();
    if (mime === 'image/jpeg' || mime === 'image/png' || mime === 'application/pdf') {
      result.etiquettes.push({ id: f.getId(), name }); continue;
    }
    if (!/\.xlsx$/i.test(name)) continue;
    const converted = convertXlsxFileToSheet_(f, log);
    const ss = SpreadsheetApp.openById(converted.id);
    const sheetNames = ss.getSheets().map(s => s.getName());
    const entry = { convertedId: converted.id, originalName: name };
    if (sheetNames.some(n => /^Кластер/i.test(n))) result.mg_clusters.push(entry);
    else if (sheetNames.some(n => /Мониторинг полок/i.test(n))) result.mg_shelves.push(entry);
    else if (sheetNames.some(n => /Поисковые запросы|Общая информация/i.test(n))) result.wb = entry;
  }
  return result;
}

function convertXlsxFileToSheet_(file, log) {
  const blob = file.getBlob();
  const archiveFolderId = String(getParam_('ARCHIVE_FOLDER_ID', CONFIG.DEFAULTS.ARCHIVE_FOLDER_ID) || '').trim();
  const meta = {
    name: file.getName().replace(/\.xlsx$/i, '') + ' [GS]',
    mimeType: 'application/vnd.google-apps.spreadsheet'
  };
  if (archiveFolderId) meta.parents = [archiveFolderId];
  const created = Drive.Files.create(meta, blob, { supportsAllDrives: true });
  return { id: created.id, name: meta.name };
}

function scheduleClaudeWaiter_() {
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'autoFlowClaudeWaiter_trigger') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('autoFlowClaudeWaiter_trigger').timeBased().after(2 * 60 * 1000).create();
}

function autoFlowClaudeWaiter_trigger() {
  const log = newLogContext_('claudeWaiter');
  try {
    const mgState = PropertiesService.getDocumentProperties().getProperty('MG_QUEUE_STATE');
    if (mgState) {
      scheduleClaudeWaiter_();
      log.flush('WAIT'); return;
    }
    ScriptApp.getProjectTriggers().forEach(t => {
      if (t.getHandlerFunction() === 'autoFlowClaudeWaiter_trigger') ScriptApp.deleteTrigger(t);
    });
    generateFullSeo();
    PropertiesService.getDocumentProperties().deleteProperty(CONFIG.PROP_KEYS.AUTO_FLOW_STATE);
    log.flush('OK');
  } catch (e) { log.error(e.message); log.flush('ERROR'); }
}

function showHelp() {
  SpreadsheetApp.getUi().alert('Справка', 'Меню → Полный пакет рекомендаций (Claude) — основной workflow.\n\nПодробности в репозитории проекта.', SpreadsheetApp.getUi().ButtonSet.OK);
}
function showAbout() {
  SpreadsheetApp.getUi().alert('О версии', 'WBConkAnalysis v' + CONFIG.VERSION, SpreadsheetApp.getUi().ButtonSet.OK);
}
