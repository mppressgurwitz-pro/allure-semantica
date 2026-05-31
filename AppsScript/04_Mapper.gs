/**
 * 04_Mapper.gs
 * ============================================================================
 * Перенос "сырых" блоков данных в три жёлтые вкладки шаблона согласно ТЗ:
 *   🟡 Показатели (вставка)         — из листа "Показатели"  (paste at C1)
 *   🟡 Запросы (вставка)            — из листов "Поисковые запросы по артикулу N"
 *                                     (paste at B2; в столбец A — артикул)
 *   🟡 Склады и регионы (вставка)   — из листа "Склады и регионы" (paste at A1)
 * ============================================================================
 */

function pasteRawData_(wbReport, log) {
  const ss = getTargetSpreadsheet_();

  // ── 1. Показатели ──────────────────────────────────────────────────────────
  pastePokazateli_(ss, wbReport, log);

  // ── 2. Запросы ─────────────────────────────────────────────────────────────
  pasteZaprosy_(ss, wbReport, log);

  // ── 3. Склады и регионы ────────────────────────────────────────────────────
  pasteSklady_(ss, wbReport, log);
}

function pastePokazateli_(ss, wbReport, log) {
  const cfg = CONFIG.TEMPLATE_TABS.POKAZATELI;
  const sh = ss.getSheetByName(cfg.name);
  if (!sh) {
    log.step('⚠️ Не найдена вкладка ' + cfg.name + ' — пропускаю шаг "Показатели"');
    return;
  }
  // По ТЗ: вставляем начиная с C1, очищаем диапазон C1:end_col / end_row
  const startRow = 1, startCol = cfg.clearFromCol; // C = 3
  const headers = wbReport.pokazateli.headers || [];
  const rows    = wbReport.pokazateli.rows || [];
  if (!headers.length) {
    log.step('⚠️ Пустые "Показатели" в файле');
    return;
  }
  const lastRowExisting = sh.getMaxRows();
  const lastColExisting = sh.getMaxColumns();
  // Очищаем правую часть листа от startCol
  if (lastColExisting >= startCol) {
    sh.getRange(startRow, startCol, lastRowExisting, lastColExisting - startCol + 1).clearContent();
  }
  const totalRows = rows.length + 1; // headers + rows
  const totalCols = headers.length;
  if (sh.getMaxColumns() < startCol + totalCols - 1) {
    sh.insertColumnsAfter(sh.getMaxColumns(), startCol + totalCols - 1 - sh.getMaxColumns());
  }
  const matrix = [headers].concat(rows);
  sh.getRange(startRow, startCol, totalRows, totalCols).setValues(matrix);
  log.step('✓ Показатели: вставлено ' + rows.length + ' строк × ' + totalCols + ' столбцов в C1');
}

function pasteZaprosy_(ss, wbReport, log) {
  const cfg = CONFIG.TEMPLATE_TABS.ZAPROSY;
  const sh = ss.getSheetByName(cfg.name);
  if (!sh) {
    log.step('⚠️ Не найдена вкладка ' + cfg.name + ' — пропускаю шаг "Запросы"');
    return;
  }
  const skus = Object.keys(wbReport.keywordsBySku);
  if (!skus.length) {
    log.step('⚠️ Нет данных по запросам ни по одному артикулу');
    return;
  }
  // Универсальные заголовки (используем только если строка 1 в шаблоне пуста)
  const universalHeaders = [
    'Артикул WB',
    'Поисковый запрос',
    'Количество запросов',
    'Количество запросов (предыдущий период)',
    'Конверсия в корзину, %',
    'Конверсия в корзину, % (предыдущий период)',
    'Конверсия в заказ, %',
    'Конверсия в заказ, % (предыдущий период)'
  ];

  // Собираем единую таблицу: [Артикул, ... 7 колонок ...]
  const out = [];
  skus.forEach(sku => {
    const block = wbReport.keywordsBySku[sku];
    block.rows.forEach(row => {
      const r = row.slice(0, 7);
      while (r.length < 7) r.push('');
      // Артикул хранится строкой, чтобы Sheets не превратил в число с потерей ведущих нулей
      out.push([String(sku)].concat(r));
    });
  });

  const lastCol = 8; // A..H
  if (sh.getMaxColumns() < lastCol) sh.insertColumnsAfter(sh.getMaxColumns(), lastCol - sh.getMaxColumns());
  if (sh.getMaxRows() < out.length + 1) sh.insertRowsAfter(sh.getMaxRows(), (out.length + 1) - sh.getMaxRows());

  // Если строка 1 пуста — сами проставим универсальные заголовки.
  // Если в шаблоне уже есть заголовки/формулы — НЕ ТРОГАЕМ.
  const headerRow = sh.getRange(1, 1, 1, lastCol).getValues()[0];
  const headerEmpty = headerRow.every(v => v === '' || v === null);
  if (headerEmpty) {
    sh.getRange(1, 1, 1, lastCol).setValues([universalHeaders]).setFontWeight('bold').setBackground('#fff2cc');
  }

  // Очищаем диапазон со 2-й строки и ниже (только контент)
  const lastDataRow = Math.max(sh.getLastRow(), out.length + 1);
  if (lastDataRow >= 2) {
    sh.getRange(2, 1, lastDataRow - 1, lastCol).clearContent();
  }
  if (out.length) {
    sh.getRange(2, 1, out.length, lastCol).setValues(out);
  }
  log.step('✓ Запросы: вставлено ' + out.length + ' строк по ' + skus.length + ' артикулам');
}

function pasteSklady_(ss, wbReport, log) {
  const cfg = CONFIG.TEMPLATE_TABS.SKLADY;
  const sh = ss.getSheetByName(cfg.name);
  if (!sh) {
    log.step('⚠️ Не найдена вкладка ' + cfg.name + ' — пропускаю шаг "Склады"');
    return;
  }
  const headers = wbReport.skladyHeaders || [];
  const rows    = wbReport.skladyRows || [];
  if (!headers.length) {
    log.step('⚠️ Пусто в "Склады и регионы"');
    return;
  }
  const totalRows = rows.length + 1;
  const totalCols = headers.length;
  if (sh.getMaxColumns() < totalCols) sh.insertColumnsAfter(sh.getMaxColumns(), totalCols - sh.getMaxColumns());
  if (sh.getMaxRows() < totalRows)    sh.insertRowsAfter(sh.getMaxRows(), totalRows - sh.getMaxRows());
  sh.getRange(1, 1, sh.getMaxRows(), sh.getMaxColumns()).clearContent();
  const matrix = [headers].concat(rows);
  sh.getRange(1, 1, totalRows, totalCols).setValues(matrix);
  log.step('✓ Склады и регионы: вставлено ' + rows.length + ' строк × ' + totalCols + ' столбцов');
}
