/**
 * 26_MigrateCopiesTo4LK.gs
 * Retrofit копий в «Результаты по семантике» под 4 ЛК:
 *   WB Асмус, WB Quantum, OZON Асмус, OZON Quantum
 * + пол/артикулы по каждому ЛК, единая шапка, WBSyncLib-колонки PUSH.
 *
 * Идемпотентно: маркер _Config ADVICE_SEO_SCHEMA_VERSION = 4LK_2026-05-30
 */

var MIGRATE_4LK = {
  FOLDER_ID: '1gDUCk2a9h7z0zfNzAneXJkBtlupCYxy3',
  SCHEMA: '4LK_2026-05-30',
  DRAFT: '_Advice_SEO_Draft',
  CONFIG: '_Config',
  TECH_START: '▼ ТЕХНИЧЕСКИЙ БЛОК',
  TECH_END: '▲ Конец технического блока',
  /** PGBOT1M08 — регрессия: структуру можно, контент SEO не трогаем */
  REGRESSION_IDS: ['1NOO50oa9CWfXzA7AixR7zapj1xzr2e3xhK7lM6Cc3bQ'],
  COL: {
    FIELD: 1,
    CURRENT: 2,
    NEW_WB_ASMUS: 3,
    NEW_WB_QUANTUM: 4,
    NEW_OZON_ASMUS: 5,
    NEW_OZON_QUANTUM: 6,
    SOURCE: 7
  },
  NEW_HEADERS: [
    'Поле', 'Текущее в WB',
    'Новое WB Асмус', 'Новое WB Quantum', 'Новое OZON Асмус', 'Новое OZON Quantum',
    'Источник'
  ],
  DEFAULT_GENDER: {
    'WB Асмус': 'женский',
    'WB Quantum': 'мужской',
    'OZON Асмус': 'женский',
    'OZON Quantum': 'мужской'
  },
  CABINET_TO_COL: {
    'Asmus': 3,
    'Quantum': 4,
    'OZON_Asmus': 5,
    'OZON_Quantum': 6
  },
  ID_ROWS: [
    ['nmID / артикул WB Асмус', ''],
    ['nmID / артикул WB Quantum', ''],
    ['SKU OZON Асмус', ''],
    ['SKU OZON Quantum', ''],
    ['Пол — WB Асмус', ''],
    ['Пол — WB Quantum', ''],
    ['Пол — OZON Асмус', ''],
    ['Пол — OZON Quantum', '']
  ]
};

function migrateAllCopiesTo4LKDialog() {
  const ui = SpreadsheetApp.getUi();
  const ans = ui.alert(
    'Миграция 4 ЛК',
    'Папка «Результаты по семантике».\n' +
    'Добавит колонки SEO×4, артикулы и пол по ЛК, шапку B1.\n\n' +
    'Сначала dry-run (только лог)?',
    ui.ButtonSet.YES_NO_CANCEL
  );
  if (ans === ui.Button.CANCEL) return;
  const dryRun = ans === ui.Button.YES;
  const log = newLogContext_('migrate4LK dryRun=' + dryRun);
  try {
    const report = migrateAllCopiesTo4LK_(dryRun, log);
    log.flush('OK');
    ui.alert(dryRun ? 'Dry-run завершён' : 'Миграция завершена', report, ui.ButtonSet.OK);
  } catch (e) {
    log.error(e.message);
    log.flush('ERROR');
    ui.alert('Ошибка: ' + e.message);
  }
}

function migrateSingleCopyTo4LKDialog() {
  const ui = SpreadsheetApp.getUi();
  const r = ui.prompt('ID таблицы-копии', SpreadsheetApp.getActiveSpreadsheet().getId(), ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  const id = r.getResponseText().trim();
  const log = newLogContext_('migrate4LK single ' + id);
  try {
    const result = migrateCopyTo4LK_(id, false, log);
    log.flush('OK');
    ui.alert(result);
  } catch (e) {
    log.error(e.message);
    log.flush('ERROR');
    ui.alert('Ошибка: ' + e.message);
  }
}

function migrateAllCopiesTo4LK_(dryRun, log) {
  const folder = DriveApp.getFolderById(MIGRATE_4LK.FOLDER_ID);
  const files = folder.getFilesByType(MimeType.GOOGLE_SHEETS);
  let scanned = 0;
  let migrated = 0;
  let skipped = 0;
  let failed = 0;
  const lines = [];

  while (files.hasNext()) {
    const f = files.next();
    const name = f.getName();
    const id = f.getId();
    if (!/^(Ср\s+конк|Сравнение\s+конкурентов)/i.test(name)) continue;
    scanned++;
    try {
      const r = migrateCopyTo4LK_(id, dryRun, log);
      if (r.indexOf('SKIP') === 0) skipped++;
      else migrated++;
      lines.push(name + ': ' + r);
    } catch (e) {
      failed++;
      lines.push(name + ': FAIL ' + e.message);
      log.step('✗ ' + name + ': ' + e.message);
    }
  }

  const summary = 'Проверено: ' + scanned + ', мигрировано: ' + migrated +
    ', пропуск: ' + skipped + ', ошибки: ' + failed + (dryRun ? ' (dry-run)' : '');
  log.step(summary);
  return summary + '\n\n' + lines.slice(0, 40).join('\n') +
    (lines.length > 40 ? '\n... ещё ' + (lines.length - 40) : '');
}

function migrateCopyTo4LK_(spreadsheetId, dryRun, log) {
  const ss = SpreadsheetApp.openById(spreadsheetId);
  const name = ss.getName();

  if (isAlreadyMigrated4LK_(ss)) {
    return 'SKIP уже ' + MIGRATE_4LK.SCHEMA;
  }

  const draft = ss.getSheetByName(MIGRATE_4LK.DRAFT);
  if (!draft) throw new Error('нет листа ' + MIGRATE_4LK.DRAFT);

  const isRegression = MIGRATE_4LK.REGRESSION_IDS.indexOf(spreadsheetId) >= 0;
  log.step('→ ' + name + (isRegression ? ' [regression]' : ''));

  if (dryRun) return 'OK dry-run: будет миграция 4LK';

  // 1. Расширить колонки (C → C..F новые, старый D→G)
  ensureFourNewColumns_(draft);

  // 2. Шапка листа: активный WB-кабинет + блок 4 ЛК
  setupDraftHeaderPanel_(draft, ss);

  // 3. Тех.блок: заголовок таблицы + строки артикулов/пола
  upgradeTechBlockStructure_(draft, isRegression);

  // 4. _Config
  upsertConfigSchemaVersion_(ss);

  // 5. Ozon: категория + файл шаблона xlsx
  try {
    const oz = applyOzonTemplateConfigToCopy_(ss);
    log.step('  Ozon шаблон: ' + (oz.templateFile || '—'));
  } catch (e) {
    log.step('  ⚠ Ozon config: ' + e.message);
  }

  // 6. B1 по умолчанию если пусто
  if (!String(draft.getRange('B1').getValue() || '').trim()) {
    draft.getRange('B1').setValue('Asmus');
  }

  log.step('  ✓ ' + name);
  return 'OK ' + MIGRATE_4LK.SCHEMA;
}

function isAlreadyMigrated4LK_(ss) {
  const cfg = ss.getSheetByName(MIGRATE_4LK.CONFIG);
  if (!cfg || cfg.getLastRow() < 2) return false;
  const data = cfg.getRange(2, 1, cfg.getLastRow() - 1, 2).getValues();
  for (let i = 0; i < data.length; i++) {
    if (String(data[i][0]).trim() === 'ADVICE_SEO_SCHEMA_VERSION') {
      return String(data[i][1]).trim() === MIGRATE_4LK.SCHEMA;
    }
  }
  // fallback: заголовок колонки D
  const draft = ss.getSheetByName(MIGRATE_4LK.DRAFT);
  if (!draft) return false;
  const hdr = draft.getRange(1, 1, 1, 7).getValues()[0];
  return String(hdr[3] || '').indexOf('Quantum') >= 0;
}

function ensureFourNewColumns_(draft) {
  const hdrProbe = String(draft.getRange(1, 4).getValue() || '');
  if (hdrProbe.indexOf('Quantum') >= 0 || hdrProbe.indexOf('Новое WB Quantum') >= 0) return;

  // Если старая схема 4 колонки (A-D) — вставить 3 колонки после C
  const lastCol = draft.getLastColumn();
  if (lastCol <= 4) {
    draft.insertColumnsAfter(3, 3);
  } else if (lastCol === 5) {
    draft.insertColumnsAfter(3, 2);
    draft.insertColumnsAfter(5, 1);
  } else if (lastCol === 6) {
    draft.insertColumnsAfter(3, 1);
  }
}

function setupDraftHeaderPanel_(draft, ss) {
  draft.getRange('A1').setValue('Активный WB-кабинет (PULL/PUSH)').setFontWeight('bold');
  draft.getRange('C1').setValue('Схема').setFontWeight('bold');
  draft.getRange('D1').setValue(MIGRATE_4LK.SCHEMA).setFontColor('#666666');

  const panel = [
    ['ЛК', 'Пол (SEO)', 'Артикул / nmID', 'Статус SEO'],
    ['WB Асмус', MIGRATE_4LK.DEFAULT_GENDER['WB Асмус'], '', 'не начато'],
    ['WB Quantum', MIGRATE_4LK.DEFAULT_GENDER['WB Quantum'], '', 'не начато'],
    ['OZON Асмус', MIGRATE_4LK.DEFAULT_GENDER['OZON Асмус'], '', 'не начато'],
    ['OZON Quantum', MIGRATE_4LK.DEFAULT_GENDER['OZON Quantum'], '', 'не начато']
  ];
  draft.getRange(2, 1, 6, 4).setValues(panel);
  draft.getRange(2, 1, 2, 4).setFontWeight('bold').setBackground('#d9ead3');

  // Перенос nmID из тех.блока если уже есть
  syncPanelArticlesFromTechBlock_(draft);
}

function syncPanelArticlesFromTechBlock_(draft) {
  const all = draft.getDataRange().getValues();
  const block = findTechBlock4LK_(all);
  if (!block) return;

  const nmAsm = readFieldInBlock_(all, block, 'Артикул WB') || readFieldInBlock_(all, block, 'nmID / артикул WB Асмус');
  const nmQnt = readFieldInBlock_(all, block, 'nmID / артикул WB Quantum');
  const ozA = readFieldInBlock_(all, block, 'SKU OZON Асмус') || readFieldInBlock_(all, block, 'Артикул OZON');
  const ozQ = readFieldInBlock_(all, block, 'SKU OZON Quantum');

  if (nmAsm) draft.getRange(3, 3).setValue(nmAsm);
  if (nmQnt) draft.getRange(4, 3).setValue(nmQnt);
  if (ozA) draft.getRange(5, 3).setValue(ozA);
  if (ozQ) draft.getRange(6, 3).setValue(ozQ);
}

function upgradeTechBlockStructure_(draft, preserveContentOnly) {
  const all = draft.getDataRange().getValues();
  const block = findTechBlock4LK_(all);
  if (!block) {
    appendMinimalTechBlock4LK_(draft);
    return;
  }

  // Обновить строку-заголовок таблицы внутри тех.блока
  for (let i = block.start; i <= block.end && i < block.start + 8; i++) {
    const a = String(all[i][0] || '').trim();
    if (a === 'Поле' || a.indexOf('Поле') === 0) {
      draft.getRange(i + 1, 1, 1, 7).setValues([MIGRATE_4LK.NEW_HEADERS])
        .setFontWeight('bold').setBackground('#d9ead3');
      break;
    }
  }

  ensureIdRowsInBlock_(draft, all, block);

  if (!preserveContentOnly) {
    applyDefaultGendersInBlock_(draft, all, block);
  }
}

function appendMinimalTechBlock4LK_(draft) {
  let row = draft.getLastRow() + 2;
  draft.getRange(row, 1).setValue(MIGRATE_4LK.TECH_START + ' — 4 ЛК');
  row += 2;
  draft.getRange(row, 1, 1, 7).setValues([MIGRATE_4LK.NEW_HEADERS]).setFontWeight('bold');
  row++;
  MIGRATE_4LK.ID_ROWS.forEach(function(r) {
    draft.getRange(row, 1, 1, 7).setValues([[r[0], r[1], '', '', '', '', '4LK migration']]);
    row++;
  });
  draft.getRange(row, 1).setValue(MIGRATE_4LK.TECH_END);
}

function ensureIdRowsInBlock_(draft, all, block) {
  const needed = [
    'nmID / артикул WB Асмус',
    'nmID / артикул WB Quantum',
    'SKU OZON Асмус',
    'SKU OZON Quantum',
    'Пол — WB Асмус',
    'Пол — WB Quantum',
    'Пол — OZON Асмус',
    'Пол — OZON Quantum'
  ];
  const existing = {};
  for (let i = block.start; i <= block.end; i++) {
    existing[String(all[i][0] || '').trim()] = true;
  }

  const missing = needed.filter(function(n) { return !existing[n]; });
  if (!missing.length) return;

  // Вставить после «— ИДЕНТИФИКАТОР SKU —» или в начало блока+3
  let insertAt = block.start + 3;
  for (let i = block.start; i <= block.end; i++) {
    if (String(all[i][0] || '').indexOf('ИДЕНТИФИКАТОР') >= 0) {
      insertAt = i + 2;
      break;
    }
  }

  draft.insertRowsBefore(insertAt, missing.length);
  missing.forEach(function(fieldName, idx) {
    const r = insertAt + idx;
    const rowData = [fieldName, '', '', '', '', '', '4LK migration'];
    draft.getRange(r, 1, 1, 7).setValues([rowData]);
    if (fieldName.indexOf('Пол —') === 0) {
      const lk = fieldName.replace('Пол — ', '');
      const g = MIGRATE_4LK.DEFAULT_GENDER[lk] || '';
      if (g) draft.getRange(r, 2).setValue(g);
    }
    if (fieldName === 'nmID / артикул WB Асмус') {
      const legacy = readFieldInBlock_(all, block, 'Артикул WB');
      if (legacy) draft.getRange(r, 2).setValue(legacy);
    }
  });
}

function applyDefaultGendersInBlock_(draft, all, block) {
  const map = {
    'Пол — WB Асмус': MIGRATE_4LK.DEFAULT_GENDER['WB Асмус'],
    'Пол — WB Quantum': MIGRATE_4LK.DEFAULT_GENDER['WB Quantum'],
    'Пол — OZON Асмус': MIGRATE_4LK.DEFAULT_GENDER['OZON Асмус'],
    'Пол — OZON Quantum': MIGRATE_4LK.DEFAULT_GENDER['OZON Quantum']
  };
  Object.keys(map).forEach(function(field) {
    for (let i = block.start; i <= block.end; i++) {
      if (String(all[i][0] || '').trim() !== field) continue;
      const cur = String(all[i][1] || draft.getRange(i + 1, 2).getValue() || '').trim();
      if (!cur) draft.getRange(i + 1, 2).setValue(map[field]);
      break;
    }
  });
}

function upsertConfigSchemaVersion_(ss) {
  let cfg = ss.getSheetByName(MIGRATE_4LK.CONFIG);
  if (!cfg) return;
  const lr = cfg.getLastRow();
  if (lr < 2) {
    cfg.appendRow(['ADVICE_SEO_SCHEMA_VERSION', MIGRATE_4LK.SCHEMA, '4LK migration']);
    return;
  }
  const data = cfg.getRange(2, 1, lr - 1, 2).getValues();
  for (let i = 0; i < data.length; i++) {
    if (String(data[i][0]).trim() === 'ADVICE_SEO_SCHEMA_VERSION') {
      cfg.getRange(i + 2, 2).setValue(MIGRATE_4LK.SCHEMA);
      return;
    }
  }
  cfg.appendRow(['ADVICE_SEO_SCHEMA_VERSION', MIGRATE_4LK.SCHEMA, '4LK migration']);
}

function findTechBlock4LK_(all) {
  let start = -1;
  let end = -1;
  for (let i = 0; i < all.length; i++) {
    const cell = String(all[i][0] || '');
    if (start === -1 && cell.indexOf(MIGRATE_4LK.TECH_START) >= 0) start = i;
    if (cell.indexOf(MIGRATE_4LK.TECH_END) >= 0) end = i;
  }
  return (start >= 0 && end >= 0) ? { start: start, end: end } : null;
}

function readFieldInBlock_(all, block, fieldName) {
  for (let i = block.start; i <= block.end; i++) {
    if (String(all[i][0] || '').trim() === fieldName) {
      return String(all[i][1] || '').trim();
    }
  }
  return '';
}

/** Колонка «Новое» для кабинета (используется WBSyncLib через WBLib) */
function getNewValueColumnForCabinet_(cabinet) {
  return MIGRATE_4LK.CABINET_TO_COL[cabinet] || 3;
}

function isCopy4LKSchema_(ss) {
  return isAlreadyMigrated4LK_(ss);
}
