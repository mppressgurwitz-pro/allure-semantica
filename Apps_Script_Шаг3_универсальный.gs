/**
 * Шаг 3 (универсальный): пересборка технического блока с автоопределением
 * нужного набора WB-характеристик через лист _WB_Char_Dict.
 *
 * Что нового по сравнению с предыдущей версией:
 *   1. НЕТ захардкоженных PILING_CHARS. Скрипт сам читает _WB_Char_Dict,
 *      находит колонку с категорией SKU, выбирает строки с 1 — это и есть
 *      нужный набор полей. Работает для всех 14 категорий WB без правок кода.
 *   2. Параметризован: для запуска на другой копии меняется только TARGET_SHEET_ID
 *      и SKU_INFO. Под раскатку на 120 SKU напишу мастер-функцию, которая
 *      пройдёт по списку — будет один прогон на всё.
 *
 * Идемпотентен. Лист _WB_Char_Dict в копии должен присутствовать.
 *
 * 2026-05-20.
 */

const TARGET_SHEET_ID = '1NOO50oa9CWfXzA7AixR7zapj1xzr2e3xhK7lM6Cc3bQ'; // тест WB — Вариант B
const DRAFT_NAME = '_Advice_SEO_Draft';
const DICT_NAME = '_WB_Char_Dict';
const TECH_START_MARKER = '▼ ТЕХНИЧЕСКИЙ БЛОК';
const TECH_END_MARKER = '▲ Конец технического блока';

// SKU-параметры — единственное, что меняется при тиражировании на другой файл
const SKU_INFO = {
  articulWB: '891058906',
  articulSeller: 'PGBOT1M08',
  category: 'Пилинг', // ← по этой строке скрипт ищет колонку в _WB_Char_Dict
  brand: 'PRESS GURWITZ PERFUMERIE',
  name: 'Пилинг мужской Press Gurwitz Botanicals для кожи головы'
};

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

  // ===== Шаг A. Достать список WB-характеристик категории из _WB_Char_Dict =====
  const chars = getCharsForCategory(ss, SKU_INFO.category);
  Logger.log('Категория «' + SKU_INFO.category + '»: подобрано ' + chars.length + ' WB-характеристик из _WB_Char_Dict');

  // ===== Шаг B. Удалить старый тех.блок (если есть) =====
  const all = draft.getDataRange().getValues();
  let startRow = -1, endRow = -1;
  for (let i = 0; i < all.length; i++) {
    const cell = String(all[i][0] || '');
    if (startRow === -1 && cell.indexOf(TECH_START_MARKER) >= 0) startRow = i + 1;
    if (cell.indexOf(TECH_END_MARKER) >= 0) endRow = i + 1;
  }
  if (startRow > 0 && endRow > 0) {
    draft.deleteRows(startRow, endRow - startRow + 1);
    Logger.log('Удалён старый тех.блок (строки ' + startRow + '–' + endRow + ').');
  }

  // ===== Шаг C. Пересобрать =====
  let row = draft.getLastRow() + 3;
  const blockStart = row;

  // Шапка
  draft.getRange(row, 1).setValue(TECH_START_MARKER + ' — зеркало WB-карточки');
  draft.getRange(row, 1, 1, 4).merge().setFontWeight('bold').setBackground('#fff2cc').setFontSize(11);
  row++;
  draft.getRange(row, 1).setValue('Блок для скрипта выгрузки в WB. PULL заполняет «Текущее в WB» из GET-карточки. Колонка «Новое значение» автозаполняется при открытии таблицы (меню «🪄 SEO»). PUSH делает GET→merge→PUT.');
  draft.getRange(row, 1, 1, 4).merge().setFontStyle('italic').setFontSize(9).setWrap(true);
  row += 2;

  // Шапка таблицы
  draft.getRange(row, 1, 1, 4).setValues([['Поле', 'Текущее в WB', 'Новое значение', 'Источник']])
       .setFontWeight('bold').setBackground('#d9ead3');
  row++;

  // SKU
  row = writeSubBlock(draft, row, '— ИДЕНТИФИКАТОР SKU —', [
    ['Артикул WB', SKU_INFO.articulWB, '', 'идентификатор SKU (для PULL/PUSH)'],
    ['Артикул продавца', SKU_INFO.articulSeller, '', 'идентификатор SKU'],
    ['Категория WB', SKU_INFO.category, '', 'определяет набор WB-характеристик'],
    ['Бренд', SKU_INFO.brand, '', 'из карточки'],
    ['Наименование', SKU_INFO.name, '', 'из карточки, перезаписываемо']
  ]);

  // SEO-тексты
  row = writeSubBlock(draft, row, '— SEO-ТЕКСТЫ (Title, Описание — главные поля для PUSH) —', [
    ['Title (наименование)', '', '', 'из верхнего SEO-черновика, поле Title'],
    ['Описание', '', '', 'из верхнего SEO-черновика, блок «Описание»']
  ]);

  // WB-характеристики (динамически)
  const charsRows = chars.map(c => [c.name, '', '', c.group]);
  row = writeSubBlock(
    draft, row,
    '— SEO-ХАРАКТЕРИСТИКИ WB (категория «' + SKU_INFO.category + '», ' + chars.length + ' полей) —',
    charsRows
  );

  // Базовые поля
  const baseRows = BASE_FIELDS.map(f => [f, '', '', 'из GET-карточки']);
  row = writeSubBlock(draft, row, '— БАЗОВЫЕ ПОЛЯ КАРТОЧКИ (' + BASE_FIELDS.length + ' полей, из GET-карточки) —', baseRows);

  // Конец
  row++;
  draft.getRange(row, 1).setValue(TECH_END_MARKER);
  draft.getRange(row, 1, 1, 4).merge().setFontStyle('italic').setFontColor('#888888').setFontSize(9);

  // Косметика
  draft.setColumnWidth(1, 320);
  draft.setColumnWidth(2, 240);
  draft.setColumnWidth(3, 280);
  draft.setColumnWidth(4, 220);

  Logger.log('Технический блок пересобран: строки ' + blockStart + '–' + row);
  Logger.log('Готово.');
}

/**
 * Универсальный читатель _WB_Char_Dict.
 * Находит колонку с заголовком = category, выбирает все строки с непустым именем характеристики
 * (колонка B) и значением 1 в найденной колонке. Возвращает массив { name, group }.
 */
function getCharsForCategory(ss, category) {
  const dict = ss.getSheetByName(DICT_NAME);
  if (!dict) throw new Error('Лист ' + DICT_NAME + ' не найден.');
  const data = dict.getDataRange().getValues();
  const header = data[0];

  // Найти индекс колонки с категорией (приводим к нижнему регистру для устойчивости)
  let colIdx = -1;
  for (let i = 0; i < header.length; i++) {
    if (String(header[i] || '').trim().toLowerCase() === category.toLowerCase()) {
      colIdx = i;
      break;
    }
  }
  if (colIdx < 0) throw new Error('В ' + DICT_NAME + ' не найдена колонка категории «' + category + '».');

  const out = [];
  for (let i = 1; i < data.length; i++) {
    const name = String(data[i][1] || '').trim(); // колонка B — «Характеристика WB»
    const group = String(data[i][2] || '').trim(); // колонка C — «Группа»
    const flag = Number(data[i][colIdx]) || 0;
    if (name && flag === 1) {
      out.push({ name: name, group: group.toLowerCase() + (group ? ' ' + category : '') });
    }
  }
  return out;
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
