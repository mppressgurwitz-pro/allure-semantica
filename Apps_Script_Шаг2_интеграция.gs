/**
 * Шаг 2: откат предыдущего шага + интеграция технического блока в SEO-черновик.
 *
 * Что делает:
 *   1. Удаляет мой пустой _Advice_SEO_Draft (если он создан скриптом-шагом-1).
 *   2. Переименовывает _Advice_SEO_Draft_OLD_20260520 обратно в _Advice_SEO_Draft.
 *      => Ваш SEO-черновик возвращается на родное место.
 *   3. На том же листе, ниже последней строки SEO-аналитики, дописывает технический
 *      блок «зеркало WB-карточки» с колонками: Поле | Текущее в WB | Новое значение | Источник.
 *      => Это база для будущих PULL/PUSH-скриптов.
 *   4. Лист _WB_Char_Dict остаётся как есть (информационный справочник).
 *
 * Идемпотентность: повторный запуск увидит маркер блока и не задублирует.
 * Безопасность: удаляет только лист, который точно был создан мной (проверяет сигнатуру).
 *
 * Запуск: выберите функцию main → Run.
 *
 * 2026-05-20.
 */

const TARGET_SHEET_ID = '1NOO50oa9CWfXzA7AixR7zapj1xzr2e3xhK7lM6Cc3bQ'; // тест WB — Вариант B
const OLD_NAME = '_Advice_SEO_Draft_OLD_20260520';
const DRAFT_NAME = '_Advice_SEO_Draft';
const TECH_BLOCK_MARKER = '▼ ТЕХНИЧЕСКИЙ БЛОК — зеркало WB-карточки';

// 12 SEO-характеристик WB для категории «Пилинг» (фильтр из _WB_Char_Dict)
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

// 21 базовое поле карточки (тянутся GET-ом из WB, мерджатся в PUT)
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

// Идентификатор SKU — для скрипта (чтобы PULL/PUSH знали, по какому nmID работать)
const SKU_IDENT = [
  ['Артикул WB', '891058906',                  '', 'идентификатор SKU (для PULL/PUSH)'],
  ['Артикул продавца', 'PGBOT1M08',            '', 'идентификатор SKU'],
  ['Категория WB', 'Пилинг',                   '', 'из карточки, определяет набор характеристик'],
  ['Бренд', 'PRESS GURWITZ PERFUMERIE',        '', 'из карточки'],
  ['Наименование', 'Пилинг мужской Press Gurwitz Botanicals для кожи головы', '', 'из карточки, перезаписываемо']
];

function main() {
  const ss = SpreadsheetApp.openById(TARGET_SHEET_ID);
  Logger.log('Открыта таблица: ' + ss.getName());

  // ===== Шаг A. Удалить мой пустой _Advice_SEO_Draft (только если это точно мой) =====
  const current = ss.getSheetByName(DRAFT_NAME);
  if (current) {
    const a1 = String(current.getRange('A1').getValue() || '');
    const a2 = String(current.getRange('A2').getValue() || '');
    const b2 = String(current.getRange('B2').getValue() || '');
    // Сигнатура моего пустого: A1="Поле", A2="Артикул WB", B2="891058906"
    if (a1 === 'Поле' && a2 === 'Артикул WB' && b2 === '891058906') {
      ss.deleteSheet(current);
      Logger.log('Удалён пустой _Advice_SEO_Draft (от шага 1)');
    } else {
      Logger.log('Лист _Advice_SEO_Draft не похож на пустой каркас (A1="' + a1 + '") — НЕ удаляю.');
    }
  } else {
    Logger.log('Текущего _Advice_SEO_Draft нет — нечего удалять.');
  }

  // ===== Шаг B. Переименовать OLD обратно =====
  const oldSheet = ss.getSheetByName(OLD_NAME);
  if (oldSheet && !ss.getSheetByName(DRAFT_NAME)) {
    oldSheet.setName(DRAFT_NAME);
    Logger.log('Восстановлен _Advice_SEO_Draft из ' + OLD_NAME);
  } else if (!oldSheet) {
    Logger.log('Архивный ' + OLD_NAME + ' не найден.');
  } else {
    Logger.log('OLD есть, но и _Advice_SEO_Draft есть. Переименование пропущено.');
  }

  // ===== Шаг C. Найти восстановленный лист =====
  const draft = ss.getSheetByName(DRAFT_NAME);
  if (!draft) {
    throw new Error('После отката _Advice_SEO_Draft не найден. Проверьте состояние таблицы.');
  }

  // ===== Шаг D. Проверить — не дописан ли уже технический блок =====
  const all = draft.getDataRange().getValues();
  for (let i = 0; i < all.length; i++) {
    const cell = String(all[i][0] || '');
    if (cell.indexOf('ТЕХНИЧЕСКИЙ БЛОК') >= 0) {
      Logger.log('Технический блок уже присутствует (строка ' + (i+1) + '). Пропускаю дозапись.');
      Logger.log('Готово.');
      return;
    }
  }

  // ===== Шаг E. Дописать технический блок =====
  let row = draft.getLastRow() + 3; // отступ 2 пустые строки
  const startRow = row;

  // E.1. Разделитель
  draft.getRange(row, 1).setValue(TECH_BLOCK_MARKER);
  draft.getRange(row, 1, 1, 4).merge().setFontWeight('bold').setBackground('#fff2cc')
       .setHorizontalAlignment('left').setFontSize(11);
  row++;
  draft.getRange(row, 1).setValue('Блок для скрипта выгрузки в WB. PULL заполняет «Текущее в WB» из GET-карточки. Вы редактируете «Новое значение». PUSH делает GET→merge→PUT.');
  draft.getRange(row, 1, 1, 4).merge().setFontStyle('italic').setFontSize(9).setWrap(true);
  row += 2;

  // E.2. Шапка таблицы
  const header = ['Поле', 'Текущее в WB', 'Новое значение', 'Источник'];
  draft.getRange(row, 1, 1, 4).setValues([header]).setFontWeight('bold').setBackground('#d9ead3');
  row++;
  const headerRow = row - 1;

  // E.3. Подзаголовок: идентификатор SKU
  draft.getRange(row, 1).setValue('— ИДЕНТИФИКАТОР SKU —');
  draft.getRange(row, 1, 1, 4).merge().setFontWeight('bold').setBackground('#efefef');
  row++;
  for (const item of SKU_IDENT) {
    draft.getRange(row, 1, 1, 4).setValues([item]);
    row++;
  }

  // E.4. Подзаголовок: SEO-характеристики WB (категорийные)
  draft.getRange(row, 1).setValue('— SEO-ХАРАКТЕРИСТИКИ WB (категория «Пилинг», 12 полей) —');
  draft.getRange(row, 1, 1, 4).merge().setFontWeight('bold').setBackground('#efefef');
  row++;
  for (const [field, source] of PILING_CHARS) {
    draft.getRange(row, 1, 1, 4).setValues([[field, '', '', source]]);
    row++;
  }

  // E.5. Подзаголовок: базовые поля карточки
  draft.getRange(row, 1).setValue('— БАЗОВЫЕ ПОЛЯ КАРТОЧКИ (21 поле, из GET-карточки) —');
  draft.getRange(row, 1, 1, 4).merge().setFontWeight('bold').setBackground('#efefef');
  row++;
  for (const field of BASE_FIELDS) {
    draft.getRange(row, 1, 1, 4).setValues([[field, '', '', 'из GET-карточки']]);
    row++;
  }

  // E.6. Финальная пометка
  row++;
  draft.getRange(row, 1).setValue('▲ Конец технического блока.');
  draft.getRange(row, 1, 1, 4).merge().setFontStyle('italic').setFontColor('#888888').setFontSize(9);

  // E.7. Косметика: ширина колонок
  draft.setColumnWidth(1, 320); // Поле
  draft.setColumnWidth(2, 240); // Текущее в WB
  draft.setColumnWidth(3, 280); // Новое значение
  draft.setColumnWidth(4, 220); // Источник

  Logger.log('Технический блок дописан со строки ' + startRow + ' по ' + row + ' (' + (row - startRow + 1) + ' строк).');
  Logger.log('Готово.');
}
