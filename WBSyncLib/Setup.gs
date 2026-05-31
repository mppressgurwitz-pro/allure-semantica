/**
 * Одноразовая настройка WBSyncLib (запуск из редактора Library).
 * API-ключи НЕ хранить в коде — только Script Properties.
 */

function setupInstructions() {
  Logger.log(
    'WBSyncLib setup:\n' +
    '1. Script Properties → WB_API_KEY_ASMUS, WB_API_KEY_QUANTUM\n' +
    '2. (опц.) CHAR_DICT_SPREADSHEET_ID — spreadsheet с _WB_Char_Dict\n' +
    '3. Deploy → копии подключают Library identifier WBSyncLib, version HEAD\n' +
    '4. Маша: при первом меню 🪄 SEO → Разрешить scopes'
  );
}

function verifyApiKeysConfigured() {
  const props = PropertiesService.getScriptProperties();
  const asmus = props.getProperty('WB_API_KEY_ASMUS');
  const quantum = props.getProperty('WB_API_KEY_QUANTUM');
  Logger.log('WB_API_KEY_ASMUS: ' + (asmus ? 'SET (' + asmus.length + ' chars)' : 'MISSING'));
  Logger.log('WB_API_KEY_QUANTUM: ' + (quantum ? 'SET (' + quantum.length + ' chars)' : 'MISSING'));
  if (asmus) Logger.log('Asmus JWT: ' + JSON.stringify(debugApiKeyInfo_('Asmus')));
  if (quantum) Logger.log('Quantum JWT: ' + JSON.stringify(debugApiKeyInfo_('Quantum')));
}
