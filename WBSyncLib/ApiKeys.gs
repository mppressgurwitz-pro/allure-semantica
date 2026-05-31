/**
 * API-ключи WB по кабинету. Приоритет: placeholder в Config > Script Properties.
 */

function getApiKey_(cabinet) {
  const c = String(cabinet || '').trim();
  if (c !== WBSYNC_CONFIG.CABINETS.ASMUS && c !== WBSYNC_CONFIG.CABINETS.QUANTUM) {
    throw new Error('Неизвестный кабинет: ' + cabinet);
  }

  const placeholder = c === WBSYNC_CONFIG.CABINETS.ASMUS
    ? WBSYNC_CONFIG.WB_API_KEY_ASMUS_PLACEHOLDER
    : WBSYNC_CONFIG.WB_API_KEY_QUANTUM_PLACEHOLDER;

  if (placeholder && placeholder !== 'ВСТАВИТЬ_WB_API_KEY_СЮДА') {
    return placeholder;
  }

  const propKey = c === WBSYNC_CONFIG.CABINETS.ASMUS ? 'WB_API_KEY_ASMUS' : 'WB_API_KEY_QUANTUM';
  const prop = PropertiesService.getScriptProperties().getProperty(propKey);
  if (prop) return prop;

  throw new Error('WB API key не задан для кабинета ' + c + '. Задайте Script Property ' + propKey + ' в проекте WBSyncLib.');
}

function setApiKeysForSetup_(asmusKey, quantumKey) {
  const props = PropertiesService.getScriptProperties();
  if (asmusKey) props.setProperty('WB_API_KEY_ASMUS', asmusKey);
  if (quantumKey) props.setProperty('WB_API_KEY_QUANTUM', quantumKey);
}

function debugApiKeyInfo_(cabinet) {
  try {
    const key = getApiKey_(cabinet);
    const parts = key.split('.');
    const payload = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(parts[1])).getDataAsString());
    return {
      cabinet: cabinet,
      iid: payload.iid,
      oid: payload.oid,
      exp: new Date(payload.exp * 1000).toISOString()
    };
  } catch (e) {
    return { cabinet: cabinet, error: e.message };
  }
}
