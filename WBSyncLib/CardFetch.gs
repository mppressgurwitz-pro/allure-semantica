/**
 * Поиск карточки WB: textSearch → полный обход аккаунта.
 */

function fetchCardByVendorCode_(vendorCode, cabinet) {
  return fetchCardByVendorCode_safe_(vendorCode, cabinet);
}

function fetchCardByVendorCode_safe_(vendorCode, cabinet) {
  Logger.log('Стратегия 1: textSearch "' + vendorCode + '" [' + cabinet + ']');
  const filtered = wbFetchCards_({
    settings: {
      cursor: { limit: WBSYNC_CONFIG.FULL_SCAN_PAGE_SIZE },
      filter: { withPhoto: -1, textSearch: vendorCode }
    }
  }, cabinet);

  Logger.log('  → textSearch вернул: ' + filtered.length);
  const inFiltered = filtered.find(function(c) {
    return String(c.vendorCode) === String(vendorCode);
  });
  if (inFiltered) {
    Logger.log('  → exact match в textSearch nmID=' + inFiltered.nmID);
    return inFiltered;
  }

  Logger.log('Стратегия 2: полный обход аккаунта [' + cabinet + ']');
  let cursor = null;
  let totalScanned = 0;

  for (let page = 0; page < WBSYNC_CONFIG.FULL_SCAN_MAX_PAGES; page++) {
    const body = {
      settings: {
        cursor: { limit: WBSYNC_CONFIG.FULL_SCAN_PAGE_SIZE },
        filter: { withPhoto: -1 }
      }
    };
    if (cursor && cursor.updatedAt && cursor.nmID) {
      body.settings.cursor.updatedAt = cursor.updatedAt;
      body.settings.cursor.nmID = cursor.nmID;
    }

    const json = wbFetchRaw_(body, cabinet);
    const cards = json.cards || [];
    totalScanned += cards.length;
    Logger.log('  страница ' + (page + 1) + ': ' + cards.length + ' (всего ' + totalScanned + ')');

    const exact = cards.find(function(c) {
      return String(c.vendorCode) === String(vendorCode);
    });
    if (exact) {
      Logger.log('  → exact match после ' + totalScanned + ' карточек nmID=' + exact.nmID);
      return exact;
    }

    if (cards.length < WBSYNC_CONFIG.FULL_SCAN_PAGE_SIZE || !json.cursor) break;
    cursor = json.cursor;
  }

  Logger.log('Карточка "' + vendorCode + '" не найдена после ' + totalScanned + ' карточек.');
  return null;
}
