/**
 * 22_SyncTemplateToEtiquettes.gs v3
 * v3 (15.05.2026): синхронизирует ВСЕ колонки шаблона (17 шт.) с Etiquettes_Master (20 шт.),
 *                 включая категории, ноты, объёмы, family_id и set-флаги для парфюмерии.
 * v2: создавал новые строки в Etiquettes_Master, если их нет (для 1L вариантов).
 */

// Карта колонок Шаблона → Etiquettes_Master
// Шаблон (17 cols):                       Etiquettes_Master (20 cols):
//  1 Артикул WB (nmID)                     1 Артикул
//  2 Внутренний код                       10 Внутренний код
//  3 Ozon артикул                         11 Ozon артикул
//  4 Название                              2 Название
//  5 Бренд                                 3 Бренд
//  6 Пол                                   4 Пол
//  7 INCI                                  5 INCI с этикетки
//  8 Заметки                               9 Заметки
//  9 Категория                            12 Категория
// 10 Номер аромата                        13 Номер аромата
// 11 Key notes (EN)                       14 Key notes (EN)
// 12 Ключевые ноты (RU)                   15 Ключевые ноты (RU)
// 13 Объём (мл)                           16 Объём (мл)
// 14 Family ID                            17 Family ID
// 15 Эталон Y/N                           18 Эталон Y/N
// 16 Набор Y/N                            19 Набор Y/N
// 17 Состав набора                        20 Состав набора

function syncTemplateToEtiquettes() {
  const TEMPLATE_ID = '1z9UxpQ3VCaBNk1zrOdwhui0Apml-uA4UpxuOfCDg8jk';
  const ETT_ID = String(getParam_('ETIQUETTES_MASTER_ID', '') || '').trim();
  if (!ETT_ID) { try { SpreadsheetApp.getUi().alert('Не задан ETIQUETTES_MASTER_ID'); } catch (e) {} return; }
  const log = newLogContext_('syncTemplateToEtt');
  try {
    const tpl = SpreadsheetApp.openById(TEMPLATE_ID).getSheetByName('SKU_INCI');
    if (!tpl || tpl.getLastRow() < 2) throw new Error('Шаблон пустой');
    const ett = SpreadsheetApp.openById(ETT_ID).getSheetByName('Состав_SKU');
    if (!ett) throw new Error('Нет Состав_SKU');

    // Убедиться, что Etiquettes имеет 20 колонок
    if (ett.getLastColumn() < 20) ett.insertColumnsAfter(ett.getLastColumn(), 20 - ett.getLastColumn());
    const ettHeaders = [
      'Артикул','Название','Бренд','Пол','INCI с этикетки','Фото (link)','Обновлено','Кто','Заметки',
      'Внутренний код','Ozon артикул','Категория','Номер аромата','Key notes (EN)','Ключевые ноты (RU)',
      'Объём (мл)','Family ID','Эталон Y/N','Набор Y/N','Состав набора (WB nmID через запятую)'
    ];
    for (let i = 0; i < ettHeaders.length; i++) {
      const c = i + 1;
      if (!String(ett.getRange(1, c).getValue() || '').trim()) {
        ett.getRange(1, c).setValue(ettHeaders[i]).setFontWeight('bold');
      }
    }

    const tplLc = Math.max(tpl.getLastColumn(), 17);
    const tplData = tpl.getRange(2, 1, tpl.getLastRow() - 1, tplLc).getValues();
    const ettLr = ett.getLastRow();
    const ettData = ettLr >= 2 ? ett.getRange(2, 1, ettLr - 1, 20).getValues() : [];
    const ettByCode = {};
    for (let i = 0; i < ettData.length; i++) {
      const code = String(ettData[i][9] || '').trim();
      if (code) ettByCode[code] = i + 2;
    }
    log.step('В Etiquettes ' + Object.keys(ettByCode).length + ' строк');
    const ts = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');

    let updWb = 0, updInci = 0, updOzon = 0, updNotes = 0, updCategory = 0, updFamily = 0, created = 0;
    const toAppend = [];

    tplData.forEach(r => {
      const wb       = String(r[0]  || '').trim();
      const code     = String(r[1]  || '').trim();
      const ozon     = String(r[2]  || '').trim();
      const name     = String(r[3]  || '').trim();
      const brand    = String(r[4]  || '').trim();
      const gender   = String(r[5]  || '').trim();
      const inci     = String(r[6]  || '').trim();
      const tnotes   = String(r[7]  || '').trim(); // tech notes (заметки)
      const category = String(r[8]  || '').trim();
      const fragnum  = String(r[9]  || '').trim();
      const notesEn  = String(r[10] || '').trim();
      const notesRu  = String(r[11] || '').trim();
      const volume   = String(r[12] || '').trim();
      const family   = String(r[13] || '').trim();
      const isRef    = String(r[14] || '').trim();
      const isSet    = String(r[15] || '').trim();
      const setComp  = String(r[16] || '').trim();
      if (!code) return;

      const ettRow = ettByCode[code];
      if (ettRow) {
        if (wb)       { ett.getRange(ettRow,  1).setValue(wb);       updWb++; }
        if (inci)     { ett.getRange(ettRow,  5).setValue(inci);     updInci++; }
        if (ozon)     { ett.getRange(ettRow, 11).setValue(ozon);     updOzon++; }
        if (category) { ett.getRange(ettRow, 12).setValue(category); updCategory++; }
        if (fragnum)  { ett.getRange(ettRow, 13).setValue(fragnum); }
        if (notesEn)  { ett.getRange(ettRow, 14).setValue(notesEn);  updNotes++; }
        if (notesRu)  { ett.getRange(ettRow, 15).setValue(notesRu); }
        if (volume)   { ett.getRange(ettRow, 16).setValue(volume); }
        if (family)   { ett.getRange(ettRow, 17).setValue(family); updFamily++; }
        if (isRef)    { ett.getRange(ettRow, 18).setValue(isRef); }
        if (isSet)    { ett.getRange(ettRow, 19).setValue(isSet); }
        if (setComp)  { ett.getRange(ettRow, 20).setValue(setComp); }
      } else {
        toAppend.push([
          wb, name || code, brand, gender, inci, '', ts, 'syncTemplate', tnotes || 'создано из шаблона',
          code, ozon, category, fragnum, notesEn, notesRu, volume, family, isRef, isSet, setComp
        ]);
        created++;
      }
    });
    if (toAppend.length) ett.getRange(ett.getLastRow() + 1, 1, toAppend.length, 20).setValues(toAppend);

    log.step('Обновлено: WB=' + updWb + ', INCI=' + updInci + ', Ozon=' + updOzon +
             ', Категория=' + updCategory + ', Ноты=' + updNotes + ', Family=' + updFamily +
             ' | СОЗДАНО строк=' + created);
    log.flush('OK');
    try { SpreadsheetApp.getActive().toast('Sync OK', '✅', 8); } catch (e) {}
  } catch (e) {
    log.error(e.message); log.flush('ERROR'); throw e;
  }
}
