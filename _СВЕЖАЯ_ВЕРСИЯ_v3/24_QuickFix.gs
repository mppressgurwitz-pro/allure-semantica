/**
 * 24_QuickFix.gs
 * Точечные исправления данных в Etiquettes_Master и Шаблон_INCI_для_Маши.
 * Запускать вручную, если нужно срочно вписать INCI без OCR / импорта.
 */

function quickFixIncis() {
  const log = newLogContext_('quickFixIncis');
  try {
    const ettId = String(getParam_('ETIQUETTES_MASTER_ID', '') || '').trim();
    const tplId = '1z9UxpQ3VCaBNk1zrOdwhui0Apml-uA4UpxuOfCDg8jk';
    if (!ettId) throw new Error('ETIQUETTES_MASTER_ID не задан. Сначала initMasterFiles.');

    // Точечные INCI — заполни здесь то, что нужно вписать вручную.
    // Ключ — Внутренний код (col J Etiquettes / col B Шаблона).
    const PATCHES = {
      'SH0003':  { name: 'S&H Скраб для лица',            brand: 'SAVACE & HERBS', gender: 'мужской',  inci: '' },
      'SH0003L': { name: 'S&H Скраб для лица 1L',         brand: 'SAVACE & HERBS', gender: 'мужской',  inci: '' },
      'SH0005':  { name: 'S&H Очищающий гель для лица',   brand: 'SAVACE & HERBS', gender: 'мужской',  inci: '' },
      'SH0005L': { name: 'S&H Очищающий гель 1L',         brand: 'SAVACE & HERBS', gender: 'мужской',  inci: '' }
    };

    // 1. Etiquettes_Master
    const ett = SpreadsheetApp.openById(ettId).getSheetByName('Состав_SKU');
    if (!ett) throw new Error('Нет листа Состав_SKU');
    if (ett.getLastColumn() < 11) ett.insertColumnsAfter(ett.getLastColumn(), 11 - ett.getLastColumn());
    if (!ett.getRange(1, 10).getValue()) ett.getRange(1, 10).setValue('Внутренний код').setFontWeight('bold');
    if (!ett.getRange(1, 11).getValue()) ett.getRange(1, 11).setValue('Ozon артикул').setFontWeight('bold');

    const ettLr = ett.getLastRow();
    const ettByCode = {};
    if (ettLr >= 2) {
      const cur = ett.getRange(2, 1, ettLr - 1, 11).getValues();
      for (let i = 0; i < cur.length; i++) {
        const code = String(cur[i][9] || '').trim();
        if (code) ettByCode[code] = { row: i + 2, values: cur[i] };
      }
    }

    const ts = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
    let ettUpdated = 0, ettCreated = 0;
    Object.keys(PATCHES).forEach(code => {
      const p = PATCHES[code];
      const ex = ettByCode[code];
      if (ex) {
        const row = [
          ex.values[0] || '',
          p.name  || ex.values[1] || '',
          p.brand || ex.values[2] || '',
          p.gender|| ex.values[3] || '',
          p.inci  || ex.values[4] || '',
          ex.values[5] || '',
          ts,
          'quickFix',
          'quickFix ' + ts,
          code,
          ex.values[10] || ''
        ];
        ett.getRange(ex.row, 1, 1, 11).setValues([row]);
        ettUpdated++;
        log.step('  ✓ ETT обновлён: ' + code);
      } else {
        ett.appendRow(['', p.name, p.brand, p.gender, p.inci, '', ts, 'quickFix', 'создано quickFix', code, '']);
        ettCreated++;
        log.step('  + ETT добавлен: ' + code);
      }
    });

    // 2. Шаблон_INCI_для_Маши.SKU_INCI
    const tpl = SpreadsheetApp.openById(tplId).getSheetByName('SKU_INCI');
    if (tpl) {
      const tplLr = tpl.getLastRow();
      const tplByCode = {};
      if (tplLr >= 2) {
        const cur = tpl.getRange(2, 1, tplLr - 1, 8).getValues();
        for (let i = 0; i < cur.length; i++) {
          const code = String(cur[i][1] || '').trim();
          if (code) tplByCode[code] = { row: i + 2, values: cur[i] };
        }
      }
      let tplUpdated = 0, tplCreated = 0;
      Object.keys(PATCHES).forEach(code => {
        const p = PATCHES[code];
        const ex = tplByCode[code];
        if (ex) {
          const row = [
            ex.values[0] || '',
            code,
            ex.values[2] || '',
            p.name  || ex.values[3] || '',
            p.brand || ex.values[4] || '',
            p.gender|| ex.values[5] || '',
            p.inci  || ex.values[6] || '',
            'quickFix ' + ts
          ];
          tpl.getRange(ex.row, 1, 1, 8).setValues([row]);
          tplUpdated++;
          log.step('  ✓ TPL обновлён: ' + code);
        } else {
          tpl.appendRow(['', code, '', p.name, p.brand, p.gender, p.inci, 'quickFix ' + ts]);
          tplCreated++;
          log.step('  + TPL добавлен: ' + code);
        }
      });
      log.step('TPL: обновлено ' + tplUpdated + ', создано ' + tplCreated);
    } else {
      log.step('Шаблон SKU_INCI не найден — пропускаю');
    }

    log.step('ИТОГО ETT: обновлено ' + ettUpdated + ', создано ' + ettCreated);
    log.flush('OK');
    try { SpreadsheetApp.getActive().toast('quickFix OK', '✅', 8); } catch (e) {}
  } catch (e) {
    log.error(e.message);
    log.flush('ERROR');
    throw e;
  }
}

/**
 * Перезаписывает «Правила» в существующем Rules_Master актуальной редакцией v3.1
 * (13 правил от 14.05.2026 + R-SAFE). Не трогает другие листы Rules_Master.
 * Запускать один раз после публикации новой версии библиотеки.
 */
function migrateRulesMasterToV31() {
  const ui = (function(){ try { return SpreadsheetApp.getUi(); } catch (e) { return null; } })();
  const log = newLogContext_('migrateRulesMasterToV31');
  try {
    const rulesId = String(getParam_('RULES_MASTER_ID', '') || '').trim();
    if (!rulesId) throw new Error('RULES_MASTER_ID не задан. Сначала initMasterFiles.');
    const ss = SpreadsheetApp.openById(rulesId);
    const sh = ss.getSheetByName('Правила');
    if (!sh) throw new Error('В Rules_Master нет листа «Правила»');

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
      ['R-SAFE','Safety','Запрет: лечит, от <диагноза>, 100%, гарантирую, клинически доказано, №1','hard','Y','2026-05-14','медицина']
    ];

    // 1) Backup старого набора в отдельный лист с датой
    const tsTag = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd_HHmm');
    const oldLr = sh.getLastRow();
    if (oldLr >= 2) {
      const backupName = 'Правила_backup_' + tsTag;
      const backup = ss.insertSheet(backupName);
      const lc = sh.getLastColumn();
      backup.getRange(1, 1, oldLr, lc).setValues(sh.getRange(1, 1, oldLr, lc).getValues());
      log.step('Backup в лист: ' + backupName);
    }

    // 2) Очищаем и пишем новые правила
    sh.clear();
    sh.getRange(1, 1, 1, 7).setValues([['ID','Раздел','Правило','Severity','Active','Дата','Комментарий']])
      .setFontWeight('bold').setBackground('#fff2cc');
    sh.getRange(2, 1, rules.length, 7).setValues(rules);
    sh.setFrozenRows(1);
    sh.autoResizeColumns(1, 7);
    log.step('Правил записано: ' + rules.length);

    // 3) Обновляем «Лексикон»
    const lex = ss.getSheetByName('Лексикон');
    if (lex) {
      lex.clear();
      lex.getRange(1, 1, 1, 3).setValues([['Слово','Уровень','Комментарий']])
        .setFontWeight('bold').setBackground('#cfe2f3');
      const lexRows = [].concat(
        CONFIG.SAFETY_RED_LEXICON.map(w => [w, 'red', '']),
        CONFIG.SAFETY_AMBER_LEXICON.map(w => [w, 'amber', ''])
      );
      lex.getRange(2, 1, lexRows.length, 3).setValues(lexRows);
      lex.setFrozenRows(1);
      log.step('Лексикон: ' + lexRows.length + ' строк');
    }

    log.flush('OK');
    if (ui) ui.alert('✅ Rules_Master v3.1', 'Правил: ' + rules.length + '. Старая версия в листе «Правила_backup_' + tsTag + '».', ui.ButtonSet.OK);
  } catch (e) {
    log.error(e.message); log.flush('ERROR');
    if (ui) ui.alert('Ошибка: ' + e.message);
    throw e;
  }
}

/**
 * v3.3 — добавляет колонки парфюмерии и наборов И в Etiquettes_Master, И в Шаблон_INCI_для_Маши.
 * Идемпотентна: запускать можно несколько раз, ничего не сломается.
 * Новые колонки:
 *   Etiquettes_Master.Состав_SKU (cols 12-20):
 *     Категория, Номер аромата, Key notes (EN), Ключевые ноты (RU),
 *     Объём (мл), Family ID, Эталон Y/N, Набор Y/N, Состав набора (WB nmID через запятую)
 *   Шаблон_INCI_для_Маши.SKU_INCI (cols 9-17): то же самое
 * Существующие данные НЕ трогаются.
 */
function migrateToV33ParfumerySchema() {
  const ui = (function(){ try { return SpreadsheetApp.getUi(); } catch (e) { return null; } })();
  const log = newLogContext_('migrateToV33ParfumerySchema');
  try {
    const ettId = String(getParam_('ETIQUETTES_MASTER_ID', '') || '').trim();
    if (!ettId) throw new Error('ETIQUETTES_MASTER_ID не задан. Сначала initMasterFiles.');
    const TPL_ID = '1z9UxpQ3VCaBNk1zrOdwhui0Apml-uA4UpxuOfCDg8jk';

    // -------- 1. Etiquettes_Master.Состав_SKU --------
    const ett = SpreadsheetApp.openById(ettId).getSheetByName('Состав_SKU');
    if (!ett) throw new Error('В Etiquettes_Master нет листа Состав_SKU');
    const ettNewHeaders = [
      'Категория','Номер аромата','Key notes (EN)','Ключевые ноты (RU)',
      'Объём (мл)','Family ID','Эталон Y/N','Набор Y/N','Состав набора (WB nmID через запятую)'
    ];
    if (ett.getLastColumn() < 20) {
      ett.insertColumnsAfter(ett.getLastColumn(), 20 - ett.getLastColumn());
    }
    for (let i = 0; i < ettNewHeaders.length; i++) {
      const col = 12 + i;
      const cur = String(ett.getRange(1, col).getValue() || '').trim();
      if (!cur) {
        ett.getRange(1, col).setValue(ettNewHeaders[i]).setFontWeight('bold').setBackground('#fff2cc');
      }
    }
    ett.setColumnWidth(12, 160); ett.setColumnWidth(13, 100);
    ett.setColumnWidth(14, 180); ett.setColumnWidth(15, 180);
    ett.setColumnWidth(16, 80);  ett.setColumnWidth(17, 100);
    ett.setColumnWidth(18, 90);  ett.setColumnWidth(19, 90);
    ett.setColumnWidth(20, 260);
    log.step('✓ Etiquettes_Master.Состав_SKU расширен до 20 колонок');

    // -------- 2. Шаблон_INCI_для_Маши.SKU_INCI --------
    const tpl = SpreadsheetApp.openById(TPL_ID).getSheetByName('SKU_INCI');
    if (tpl) {
      const tplNewHeaders = [
        'Категория','Номер аромата','Key notes (EN)','Ключевые ноты (RU)',
        'Объём (мл)','Family ID','Эталон Y/N','Набор Y/N','Состав набора (WB nmID через запятую)'
      ];
      // Базовых 8 колонок, добавляем ещё 9 → итого 17
      if (tpl.getLastColumn() < 17) {
        tpl.insertColumnsAfter(tpl.getLastColumn(), 17 - tpl.getLastColumn());
      }
      for (let i = 0; i < tplNewHeaders.length; i++) {
        const col = 9 + i;
        const cur = String(tpl.getRange(1, col).getValue() || '').trim();
        if (!cur) {
          tpl.getRange(1, col).setValue(tplNewHeaders[i]).setFontWeight('bold').setBackground('#fff2cc');
        }
      }
      tpl.setColumnWidth(9, 160);  tpl.setColumnWidth(10, 100);
      tpl.setColumnWidth(11, 180); tpl.setColumnWidth(12, 180);
      tpl.setColumnWidth(13, 80);  tpl.setColumnWidth(14, 100);
      tpl.setColumnWidth(15, 90);  tpl.setColumnWidth(16, 90);
      tpl.setColumnWidth(17, 260);
      log.step('✓ Шаблон_INCI_для_Маши.SKU_INCI расширен до 17 колонок');
    } else {
      log.step('⚠ Шаблон SKU_INCI не найден — пропускаю (создастся при первом downloadInciTemplate)');
    }

    log.flush('OK');
    if (ui) ui.alert(
      '✅ Миграция v3.3 завершена',
      'Добавлены колонки:\n• Категория\n• Номер аромата (3, 6, 15…)\n• Key notes (EN) — с этикетки\n• Ключевые ноты (RU) — для копирайта\n• Объём (мл)\n• Family ID — общий ID для семьи продуктов\n• Эталон Y/N\n• Набор Y/N\n• Состав набора (WB nmID через запятую)\n\nЗаполни их в Шаблоне → потом меню «Sync Шаблон → Etiquettes_Master».',
      ui.ButtonSet.OK
    );
  } catch (e) {
    log.error(e.message); log.flush('ERROR');
    if (ui) ui.alert('Ошибка: ' + e.message);
    throw e;
  }
}

/**
 * v3.3 — собирает Инструкцию для Маши в PDF и кладёт в Drive Inbox.
 * Конвертация HTML → Google Doc → PDF.
 */
function createMashaInstructionPdf() {
  const ui = (function(){ try { return SpreadsheetApp.getUi(); } catch (e) { return null; } })();
  const log = newLogContext_('createMashaInstructionPdf');
  let tmpDocId = null;
  try {
    const inboxId = String(getParam_('DRIVE_INBOX_FOLDER_ID', CONFIG.DEFAULTS.DRIVE_INBOX_FOLDER_ID));
    const folder = DriveApp.getFolderById(inboxId);

    const html = mashaInstructionHtml_();
    const ts = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd_HH-mm');
    const pdfName = 'Инструкция_Маше_v3.3_' + ts + '.pdf';

    // Шаг 1: HTML → Google Doc (через Drive API v3 c конвертацией)
    const htmlBlob = Utilities.newBlob(html, 'text/html', 'tmp_instruction.html');
    const created = Drive.Files.create(
      { name: '_tmp_instruction_' + Utilities.getUuid().substring(0, 8),
        mimeType: 'application/vnd.google-apps.document' },
      htmlBlob, { supportsAllDrives: true }
    );
    tmpDocId = created.id;
    log.step('Google Doc создан: ' + tmpDocId);

    // Шаг 2: Doc → PDF blob
    const pdfBlob = DriveApp.getFileById(tmpDocId).getAs('application/pdf').setName(pdfName);
    log.step('PDF blob получен, размер: ' + pdfBlob.getBytes().length + ' байт');

    // Шаг 3: Сохранить PDF в Inbox
    const pdfFile = folder.createFile(pdfBlob);
    const url = pdfFile.getUrl();
    log.step('✓ PDF сохранён: ' + url);

    // Шаг 4: Удалить временный Doc
    DriveApp.getFileById(tmpDocId).setTrashed(true);
    log.step('Временный Doc удалён');

    log.flush('OK');
    if (ui) {
      const html2 = HtmlService.createHtmlOutput(
        '<div style="font-family:Arial;padding:14px">' +
        '<h3>✅ PDF готов</h3>' +
        '<p>Сохранён в папку Inbox:</p>' +
        '<p><a href="' + url + '" target="_blank">' + pdfName + '</a></p>' +
        '<p style="color:#5f6368;font-size:11px">Ссылка откроет файл в Drive. Можешь сразу расшарить Маше.</p>' +
        '</div>'
      ).setWidth(450).setHeight(220);
      ui.showModalDialog(html2, 'Инструкция_Маше готова');
    }
    return url;
  } catch (e) {
    log.error(e.message); log.flush('ERROR');
    if (tmpDocId) { try { DriveApp.getFileById(tmpDocId).setTrashed(true); } catch (x) {} }
    if (ui) ui.alert('Ошибка: ' + e.message);
    throw e;
  }
}

/**
 * Возвращает HTML-инструкцию для Маши. Версия v3.3.
 * Вынесено в отдельную функцию для удобства правок.
 */
function mashaInstructionHtml_() {
  return '<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"><title>Инструкция Маше</title>' +
    '<style>' +
    '@page{size:A4;margin:14mm}' +
    'body{font-family:Arial,sans-serif;color:#1a1a1a;font-size:10pt;line-height:1.4;max-width:210mm}' +
    'h1{font-size:16pt;margin:0 0 6px 0;border-bottom:2px solid #1a73e8;padding-bottom:4px}' +
    'h2{font-size:12pt;margin:14px 0 6px 0;color:#1a73e8;border-bottom:1px solid #dadce0;padding-bottom:2px}' +
    'p{margin:4px 0}' +
    '.lead{background:#fff9e6;border-left:3px solid #f29900;padding:6px 10px;margin:8px 0 14px;font-size:9.5pt}' +
    '.lead strong{color:#b06000}' +
    'table{width:100%;border-collapse:collapse;margin:6px 0 10px;font-size:9pt}' +
    'th{background:#fff2cc;border:1px solid #b89000;padding:4px 6px;text-align:left;font-weight:700}' +
    'td{border:1px solid #dadce0;padding:4px 6px;vertical-align:top}' +
    'td.col{background:#f7f7f9;font-weight:700;text-align:center;width:22px}' +
    'td.hdr{font-weight:700;width:110px}' +
    'td.example{font-family:Consolas,monospace;font-size:8.5pt;color:#137333}' +
    '.example-row{background:#f1f8f4;border:1px solid #b7dfb9;border-radius:4px;padding:6px 10px;margin:4px 0;font-size:9pt}' +
    '.example-row .title{color:#137333;font-weight:700;margin-bottom:2px}' +
    '.example-row code{background:white;padding:1px 4px;border-radius:3px;color:#1a73e8}' +
    '.dont{background:#fef0ef;border-left:3px solid #c5221f;padding:6px 10px;font-size:9.5pt}' +
    '.dont ul{margin:4px 0 0 18px;padding:0}' +
    '.dont li{margin:2px 0}' +
    '.footer{margin-top:14px;padding-top:8px;border-top:1px solid #dadce0;font-size:8.5pt;color:#5f6368;text-align:center}' +
    '</style></head><body>' +
    '<h1>Заполнение колонок I–Q в Шаблоне (для Маши)</h1>' +
    '<p style="color:#5f6368;font-size:9pt;margin:0 0 8px 0">Файл: <b>Шаблон_INCI_для_Маши</b> → вкладка <b>SKU_INCI</b> · Версия v3.3 от 15.05.2026</p>' +
    '<div class="lead"><strong>Зачем это нужно:</strong> без этих колонок парфюмерия не получит правильное SEO с нотами, а наборы будут описаны как одиночные товары. ' +
    '<strong>Обязательно</strong> заполнять всю парфюмерию (PressGurwitz №1–15 во всех формах и объёмах) и все наборы. ' +
    'Остальное (S&amp;H шампуни и т.п.) — по возможности: категория и объём.</div>' +
    '<h2>Что вписывать в каждую колонку</h2>' +
    '<table><thead><tr><th>Кол.</th><th>Заголовок</th><th>Что вписывать</th><th>Пример</th></tr></thead><tbody>' +
    '<tr><td class="col">I</td><td class="hdr">Категория</td><td>Тип продукта одним словосочетанием.</td><td class="example">Парфюмерная вода, Туалетная вода, Дезодорант, Лосьон для рук и тела, Шампунь, Гель для душа, Жидкое мыло, Свеча, Диффузор, Крем для рук, Соль для ванны, Маска для волос, Кондиционер, Бальзам после бритья, Скраб, Пилинг, Спрей, Набор</td></tr>' +
    '<tr><td class="col">J</td><td class="hdr">Номер аромата</td><td>Только цифра. Для PressGurwitz №1–15. Для не-парфюмерии — оставить пусто.</td><td class="example">3 · 6 · 15</td></tr>' +
    '<tr><td class="col">K</td><td class="hdr">Key notes (EN)</td><td>Английский оригинал с этикетки через запятую. Обычно 3 ноты.</td><td class="example">Tobacco, Cinnamon, Vanilla</td></tr>' +
    '<tr><td class="col">L</td><td class="hdr">Ключевые ноты (RU)</td><td>Русский перевод нот через запятую, маленькими буквами.</td><td class="example">табак, корица, ваниль</td></tr>' +
    '<tr><td class="col">M</td><td class="hdr">Объём (мл)</td><td>Только число, без «мл».</td><td class="example">10 · 30 · 50 · 300</td></tr>' +
    '<tr><td class="col">N</td><td class="hdr">Family ID</td><td>Идентификатор «семьи»: одинаковый у всех вариантов одного аромата в одной категории. Формат <b>БРЕНД-НОМЕР-КАТЕГОРИЯ</b>.</td><td class="example">PGP-3-EDP · PGP-2-LOTION · SH-DANDRUFF</td></tr>' +
    '<tr><td class="col">O</td><td class="hdr">Эталон Y/N</td><td><b>Y</b> у ОДНОГО SKU в семье (обычно самый продаваемый объём). У остальных — пусто.</td><td class="example">Y</td></tr>' +
    '<tr><td class="col">P</td><td class="hdr">Набор Y/N</td><td><b>Y</b> если это комплект из нескольких товаров (видно по названию). У одиночек — пусто.</td><td class="example">Y</td></tr>' +
    '<tr><td class="col">Q</td><td class="hdr">Состав набора</td><td>Только для наборов: WB-артикулы компонентов через запятую.</td><td class="example">445361666, 13771814, 868993506</td></tr>' +
    '</tbody></table>' +
    '<h2>Примеры строк</h2>' +
    '<div class="example-row"><div class="title">Парфюм PGP №3, 50 мл (эталон)</div>I: <code>Парфюмерная вода</code> · J: <code>3</code> · K: <code>Tobacco, Cinnamon, Vanilla</code> · L: <code>табак, корица, ваниль</code> · M: <code>50</code> · N: <code>PGP-3-EDP</code> · O: <code>Y</code> · P: пусто · Q: пусто</div>' +
    '<div class="example-row"><div class="title">Парфюм PGP №3, 10 мл (вариант той же семьи)</div>I: <code>Парфюмерная вода</code> · J: <code>3</code> · K: <code>Tobacco, Cinnamon, Vanilla</code> · L: <code>табак, корица, ваниль</code> · M: <code>10</code> · N: <code>PGP-3-EDP</code> · O: пусто · P: пусто · Q: пусто</div>' +
    '<div class="example-row"><div class="title">Лосьон PGP №2, 300 мл (эталон)</div>I: <code>Лосьон для рук и тела</code> · J: <code>2</code> · K: <code>Tonka bean, Pepper, Patchouli</code> · L: <code>бобы тонка, перец, пачули</code> · M: <code>300</code> · N: <code>PGP-2-LOTION</code> · O: <code>Y</code> · P: пусто · Q: пусто</div>' +
    '<div class="example-row"><div class="title">Набор PGP №1 (гель + молочко + парфюм)</div>I: <code>Набор</code> · J: <code>1</code> · K: <code>Cardamom, Leather, Jasmine</code> · L: <code>кардамон, кожа, жасмин</code> · M: пусто · N: пусто · O: пусто · P: <code>Y</code> · Q: <code>WB-арт-геля, WB-арт-молочка, WB-арт-парфюма</code></div>' +
    '<div class="example-row"><div class="title">Шампунь S&amp;H против перхоти, 1 л (эталон)</div>I: <code>Шампунь</code> · J: пусто · K: пусто · L: пусто · M: <code>1000</code> · N: <code>SH-DANDRUFF</code> · O: <code>Y</code> · P: пусто · Q: пусто</div>' +
    '<h2>После заполнения</h2>' +
    '<p>Когда заполнила парфюмерию (PressGurwitz №1–15 во всех формах) и наборы — попроси Михаила запустить из меню:</p>' +
    '<p><b>🤖 Конкурентный анализ → 🗂 Мастер-файлы → 🔄 Sync Шаблон → Etiquettes_Master</b></p>' +
    '<p>После этого SEO любого парфюмерного SKU будет включать ноты в первом абзаце описания, а наборы будут собираться из INCI всех компонентов по WB-артикулам.</p>' +
    '<h2>Чего НЕ делать</h2>' +
    '<div class="dont"><ul>' +
    '<li>Не путать языки: английский — в K, русский — в L.</li>' +
    '<li>Не ставить <b>Y</b> в «Эталон» у нескольких SKU одной семьи — только у одного.</li>' +
    '<li>Не оставлять «Состав набора» пустым, если поставила <b>Набор Y/N = Y</b>.</li>' +
    '<li>Не дублировать строки SKU — один SKU = одна строка.</li>' +
    '<li>Не вписывать в «Состав набора» WB-артикул, которого нет в этой же таблице.</li>' +
    '<li>Не менять заголовки в строке 1 — на них завязан синхронизатор.</li>' +
    '</ul></div>' +
    '<p style="margin-top:10px;font-size:9.5pt">Если непонятно — сверься с примерами выше или спроси Михаила. Лучше пропустить строку и пометить её жёлтым, чем заполнить наугад.</p>' +
    '<div class="footer">Документ обновляется по мере развития логики обработки. Версия v3.3, 15.05.2026.</div>' +
    '</body></html>';
}

/**
 * Удаляет дубликаты мастер-файлов (если случайно создано несколько Etiquettes / Rules).
 * Оставляет тот, ID которого записан в User Properties.
 */
function quickFixTrashDuplicateMasters() {
  const log = newLogContext_('quickFixTrashDuplicates');
  try {
    const keepEtt = String(getParam_('ETIQUETTES_MASTER_ID', '') || '').trim();
    const keepRules = String(getParam_('RULES_MASTER_ID', '') || '').trim();
    const inboxId = String(getParam_('DRIVE_INBOX_FOLDER_ID', CONFIG.DEFAULTS.DRIVE_INBOX_FOLDER_ID));
    const folder = DriveApp.getFolderById(inboxId);
    const files = folder.getFilesByType(MimeType.GOOGLE_SHEETS);
    let trashed = 0;
    while (files.hasNext()) {
      const f = files.next();
      const n = f.getName();
      const id = f.getId();
      if (/^Etiquettes_Master/i.test(n) && id !== keepEtt) {
        f.setTrashed(true);
        log.step('Trash ETT-дубликат: ' + n + ' (' + id + ')');
        trashed++;
      } else if (/^Rules_Master/i.test(n) && id !== keepRules) {
        f.setTrashed(true);
        log.step('Trash RULES-дубликат: ' + n + ' (' + id + ')');
        trashed++;
      }
    }
    log.step('Удалено в корзину: ' + trashed);
    log.flush('OK');
    try { SpreadsheetApp.getActive().toast('Дубликатов удалено: ' + trashed, '✅', 8); } catch (e) {}
  } catch (e) {
    log.error(e.message);
    log.flush('ERROR');
    throw e;
  }
}
