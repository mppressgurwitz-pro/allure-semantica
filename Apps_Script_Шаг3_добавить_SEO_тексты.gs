/**
 * Шаг 3: пересборка технического блока с добавлением строк Title и Описание.
 *
 * Что делает:
 *   1. Находит в листе _Advice_SEO_Draft маркеры «▼ ТЕХНИЧЕСКИЙ БЛОК» и «▲ Конец технического блока».
 *   2. Удаляет всё, что между ними (включая сами маркеры).
 *   3. Записывает технический блок заново — теперь со структурой:
 *        — ИДЕНТИФИКАТОР SKU (5 строк, заполнено)
 *        — SEO-ТЕКСТЫ (2 строки: Title, Описание) ← НОВОЕ
 *        — SEO-ХАРАКТЕРИСТИКИ WB (12 строк для категории «Пилинг»)
 *        — БАЗОВЫЕ ПОЛЯ КАРТОЧКИ (21 строка)
 *   4. SEO-аналитика выше блока не трогается.
 *
 * Идемпотентен: повторный запуск удаляет старый блок и пишет свежий.
 *
 * ВАЖНО: чтобы тиражировать на остальные SKU — поменяйте TARGET_SHEET_ID и SKU_VALUES,
 * выберите подходящий PILING_CHARS (либо подставьте набор для своей категории
 * из _WB_Char_Dict — список характеристик с 1 в колонке нужной категории).
 *
 * 2026-05-20.
 */

const TARGET_SHEET_ID = '1NOO50oa9CWfXzA7AixR7zapj1xzr2e3xhK7lM6Cc3bQ'; // тест WB — Вариант B
const DRAFT_NAME = '_Advice_SEO_Draft';
const TECH_START_MARKER = '▼ ТЕХНИЧЕСКИЙ БЛОК';
const TECH_END_MARKER = '▲ Конец технического блока';

// ===== Идентификатор SKU =====
const SKU_VALUES = [
  ['Артикул WB', '891058906', '', 'идентификатор SKU (для PULL/PUSH)'],
  ['Артикул продавца', 'PGBOT1M08', '', 'идентификатор SKU'],
  ['Категория WB', 'Пилинг', '', 'определяет набор WB-характеристик'],
  ['Бренд', 'PRESS GURWITZ PERFUMERIE', '', 'из карточки'],
  ['Наименование', 'Пилинг мужской Press Gurwitz Botanicals для кожи головы', '', 'из карточки, перезаписываемо']
];

// ===== SEO-тексты (новый подблок) =====
// Title и Описание — главные SEO-поля, которые скрипт PUSH отправляет в WB.
// PULL заполнит колонку B текущим значением из GET. Новое — пишет «🪄 SEO» меню или Маша руками.
const SEO_TEXTS = [
  ['Title (наименование)', '', '', 'из верхнего SEO-черновика, поле Title'],
  ['Описание', '', '', 'из верхнего SEO-черновика, блок «Описание»']
];

// ===== 12 SEO-характеристик WB для категории «Пилинг» =====
const PILING_CHARS = [
  ['Вид пилинга', 'специфичная Пилинг'],
  ['Действие', 'частая'],
  ['Комплектация', 'универсальная'],
  ['Назначение косметического средства', 'частая'],
  ['Объем товара', 'универсальная'],
  ['Особенности косметики', 'универсальная'],
  ['Срок годности', 'универсальная'],
  ['Страна производства', 'универсальная'],
  ['Торговое наименование', 'универсальная'],
  ['Упаковка', 'универсальная'],
  ['Форма упаковки', 'универсальная'],
  ['Формат пилинга', 'специфичная Пилинг']
];

// ===== 21 базовое поле карточки =====
const BASE_FIELDS = [
  'ТНВЭД', 'ИКПУ', 'Ставка НДС', 'Код упаковки', 'Тип доставки', 'NTIN', 'Артикул OZON',
  'Номер декларации соответствия', 'Дата регистрации сертификата/декларации',
  'Дата окончания действия сертификата/декларации', 'Номер сертификата соответствия',
  'Свидетельство о регистрации СГР',
  'Вес с упаковкой (кг)', 'Вес товара без упаковки (г)',
  'Высота упаковки', 'Длина упаковки', 'Ширина упаковки',
  'Высота предмета', 'Ширина предмета',
  'Баркод', 'Состав'
];

function main() {
  const ss = SpreadsheetApp.openById(TARGET_SHEET_ID);
  const draft = ss.getSheetByName(DRAFT_NAME);
  if (!draft) throw new Error('Лист ' + DRAFT_NAME + ' не найден.');
  Logger.log('Открыт лист: ' + DRAFT_NAME);

  // ===== Шаг A. Удалить старый тех.блок (если есть) =====
  const all = draft.getDataRange().getValues();
  let startRow = -1, endRow = -1;
  for (let i = 0; i < all.length; i++) {
    const cell = String(all[i][0] || '');
    if (startRow === -1 && cell.indexOf(TECH_START_MARKER) >= 0) startRow = i + 1; // 1-based
    if (cell.indexOf(TECH_END_MARKER) >= 0) endRow = i + 1;
  }
  if (startRow > 0 && endRow > 0 && endRow >= startRow) {
    draft.deleteRows(startRow, endRow - startRow + 1);
    Logger.log('Удалён старый тех.блок (строки ' + startRow + '–' + endRow + ').');
  } else {
    Logger.log('Старого тех.блока не нашлось — будет создан с нуля.');
  }

  // ===== Шаг B. Найти позицию для нового блока (3 строки после последней непустой) =====
  let row = draft.getLastRow() + 3;
  const blockStart = row;

  // ===== Шаг C. Шапка-разделитель =====
  draft.getRange(row, 1).setValue(TECH_START_MARKER + ' — зеркало WB-карточки');
  draft.getRange(row, 1, 1, 4).merge().setFontWeight('bold').setBackground('#fff2cc').setFontSize(11);
  row++;
  draft.getRange(row, 1).setValue('Блок для скрипта выгрузки в WB. PULL заполняет «Текущее в WB» из GET-карточки. Вы редактируете «Новое значение». PUSH делает GET→merge→PUT.');
  draft.getRange(row, 1, 1, 4).merge().setFontStyle('italic').setFontSize(9).setWrap(true);
  row += 2;

  // ===== Шаг D. Шапка таблицы =====
  draft.getRange(row, 1, 1, 4).setValues([['Поле', 'Текущее в WB', 'Новое значение', 'Источник']])
       .setFontWeight('bold').setBackground('#d9ead3');
  row++;

  // ===== Шаг E. Подблок «ИДЕНТИФИКАТОР SKU» =====
  row = writeSubBlock(draft, row, '— ИДЕНТИФИКАТОР SKU —', SKU_VALUES);

  // ===== Шаг F. Подблок «SEO-ТЕКСТЫ» — НОВЫЙ =====
  row = writeSubBlock(draft, row, '— SEO-ТЕКСТЫ (Title, Описание — главные поля для PUSH) —', SEO_TEXTS);

  // ===== Шаг G. Подблок «SEO-ХАРАКТЕРИСТИКИ WB» =====
  const charsRows = PILING_CHARS.map(([field, source]) => [field, '', '', source]);
  row = writeSubBlock(draft, row, '— SEO-ХАРАКТЕРИСТИКИ WB (категория «Пилинг», 12 полей) —', charsRows);

  // ===== Шаг H. Подблок «БАЗОВЫЕ ПОЛЯ» =====
  const baseRows = BASE_FIELDS.map(f => [f, '', '', 'из GET-карточки']);
  row = writeSubBlock(draft, row, '— БАЗОВЫЕ ПОЛЯ КАРТОЧКИ (21 поле, из GET-карточки) —', baseRows);

  // ===== Шаг I. Финальная пометка =====
  row++;
  draft.getRange(row, 1).setValue(TECH_END_MARKER);
  draft.getRange(row, 1, 1, 4).merge().setFontStyle('italic').setFontColor('#888888').setFontSize(9);

  // ===== Шаг J. Косметика =====
  draft.setColumnWidth(1, 320);
  draft.setColumnWidth(2, 240);
  draft.setColumnWidth(3, 280);
  draft.setColumnWidth(4, 220);

  Logger.log('Технический блок пересобран: строки ' + blockStart + '–' + row + ' (всего ' + (row - blockStart + 1) + ' строк).');
  Logger.log('Готово.');
}

function writeSubBlock(sheet, row, title, rows) {
  sheet.getRange(row, 1).setValue(title);
  sheet.getRange(row, 1, 1, 4).merge().setFontWeight('bold').setBackground('#efefef');
  row++;
  if (rows.length > 0) {
    sheet.getRange(row, 1, rows.length, 4).setValues(rows);
    row += rows.length;
  }
  return row;
}
