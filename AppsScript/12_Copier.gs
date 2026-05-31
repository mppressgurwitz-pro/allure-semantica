/**
 * 12_Copier.gs
 * ============================================================================
 * Создание копии master-шаблона под новый SKU.
 *   1) Drive.Files.copy(masterId, {name, parents}) — копирует таблицу
 *      ВМЕСТЕ с container-bound скриптом (Apps Script V8 runtime).
 *   2) В копии перезаписываем OUR_SKU в листе _Config.
 *   3) Возвращаем url + id копии для дальнейшей обработки пайплайном.
 *
 * Идея: при создании копии скрипт пайплайна выполняется в контексте мастера,
 *       но операции записи направляются в копию через override-механизм
 *       (см. 00_Config.gs → getTargetSpreadsheet_).
 * ============================================================================
 */

/**
 * Создать копию master-шаблона.
 *
 * @param {Object} params {productName, ourSku}
 * @param {Object} log    log-context
 * @return {Object} {id, url, name}
 */
function createSpreadsheetCopy_(params, log) {
  const productName = String(params.productName || '').trim();
  const ourSku      = String(params.ourSku || '').trim();
  if (!productName) throw new Error('Не задано название товара для копии');
  if (!ourSku)      throw new Error('Не задан артикул WB нового SKU');

  const masterId = resolveMasterTemplateId_();
  if (!masterId) {
    throw new Error('Не определён MASTER_TEMPLATE_ID. Откройте лист _Config и пропишите ID мастер-шаблона.');
  }

  const safeProduct = productName.replace(/[\\/?*\[\]:]/g, '').trim();
  const newName = 'Сравнение конкурентов — ' + safeProduct + ' (арт ' + ourSku + ')';

  log.step('🆕 Копирую мастер-шаблон → ' + newName);

  const masterFile = DriveApp.getFileById(masterId);
  const folderId   = String(getParam_('COPIES_FOLDER_ID', '') || '').trim();
  let copyFile;
  if (folderId) {
    copyFile = masterFile.makeCopy(newName, DriveApp.getFolderById(folderId));
  } else {
    // По умолчанию — в ту же папку, где лежит мастер
    copyFile = masterFile.makeCopy(newName);
  }
  const copyId  = copyFile.getId();
  const copyUrl = copyFile.getUrl();
  log.step('✓ Копия создана: ' + copyUrl);

  // Перезаписываем OUR_SKU в _Config копии
  patchCopyConfig_(copyId, ourSku, productName, log);

  return { id: copyId, url: copyUrl, name: newName };
}

/**
 * Определить ID мастер-шаблона: из _Config → из CONFIG.TARGET.SPREADSHEET_ID → текущий SS.
 */
function resolveMasterTemplateId_() {
  const fromConfig = String(getParam_('MASTER_TEMPLATE_ID', '') || '').trim();
  if (fromConfig) return fromConfig;
  if (CONFIG.TARGET.SPREADSHEET_ID) return CONFIG.TARGET.SPREADSHEET_ID;
  const active = SpreadsheetApp.getActiveSpreadsheet();
  return active ? active.getId() : '';
}

/**
 * Прошить копию: записать OUR_SKU и OUR_PRODUCT_NAME в _Config копии.
 * Если _Config в копии нет (мастер не был инициализирован) — создаст служебные листы.
 */
function patchCopyConfig_(copyId, ourSku, productName, log) {
  const copySs = SpreadsheetApp.openById(copyId);

  // Безопасно: если служебных листов нет в копии — инициализируем через временный override
  let cfgSh = copySs.getSheetByName(CONFIG.SERVICE_TABS.CONFIG);
  if (!cfgSh) {
    log.step('В копии нет _Config — инициализирую служебные листы…');
    setOverrideTargetSs_(copyId);
    try {
      setupServiceSheets();
    } finally {
      clearOverrideTargetSs_();
    }
    cfgSh = copySs.getSheetByName(CONFIG.SERVICE_TABS.CONFIG);
    if (!cfgSh) throw new Error('Не удалось инициализировать _Config в копии');
  }

  // Точечная правка значений
  upsertConfigParam_(cfgSh, 'OUR_SKU', ourSku, 'Артикул WB нашего товара (наш SKU)');
  upsertConfigParam_(cfgSh, 'OUR_PRODUCT_NAME', productName, 'Название нашего товара (для дашборда)');

  log.step('✓ _Config в копии обновлён: OUR_SKU=' + ourSku);
}

function upsertConfigParam_(cfgSh, key, value, description) {
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

// ── Override-механизм ─────────────────────────────────────────────────────────
// Транзитный флаг в Script Properties: пока он установлен, getTargetSpreadsheet_
// возвращает spreadsheet по этому ID, а не активный.
function setOverrideTargetSs_(ssId) {
  PropertiesService.getScriptProperties().setProperty('__OVERRIDE_TARGET_SS_ID__', ssId);
}
function clearOverrideTargetSs_() {
  PropertiesService.getScriptProperties().deleteProperty('__OVERRIDE_TARGET_SS_ID__');
}
function getOverrideTargetSsId_() {
  return PropertiesService.getScriptProperties().getProperty('__OVERRIDE_TARGET_SS_ID__') || '';
}
