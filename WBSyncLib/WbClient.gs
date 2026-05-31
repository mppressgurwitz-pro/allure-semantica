/**
 * HTTP-клиент WB с retry на 429/500.
 */

function wbFetchRaw_(body, cabinet) {
  const key = getApiKey_(cabinet);
  let lastError = null;

  for (let attempt = 0; attempt < WBSYNC_CONFIG.RETRY_MAX; attempt++) {
    const resp = UrlFetchApp.fetch(WBSYNC_CONFIG.WB_API_GET, {
      method: 'post',
      contentType: 'application/json',
      headers: { Authorization: key },
      payload: JSON.stringify(body),
      muteHttpExceptions: true
    });

    const code = resp.getResponseCode();
    const text = resp.getContentText();

    if (code === 200) {
      return JSON.parse(text);
    }

    if (code === 429 || code >= 500) {
      const wait = WBSYNC_CONFIG.RETRY_BASE_MS * Math.pow(2, attempt);
      Logger.log('WB GET retry ' + (attempt + 1) + '/' + WBSYNC_CONFIG.RETRY_MAX + ' HTTP ' + code + ', wait ' + wait + 'ms');
      sleepMs_(wait);
      lastError = new Error('GET WB API HTTP ' + code + ': ' + text.slice(0, 500));
      continue;
    }

    throw new Error('GET WB API HTTP ' + code + ': ' + text.slice(0, 500));
  }

  throw lastError || new Error('GET WB API: исчерпаны попытки retry');
}

function wbFetchCards_(body, cabinet) {
  const json = wbFetchRaw_(body, cabinet);
  return json.cards || [];
}

function wbUpdateCards_(cards, cabinet) {
  const key = getApiKey_(cabinet);
  let lastError = null;

  for (let attempt = 0; attempt < WBSYNC_CONFIG.RETRY_MAX; attempt++) {
    const resp = UrlFetchApp.fetch(WBSYNC_CONFIG.WB_API_UPDATE, {
      method: 'post',
      contentType: 'application/json',
      headers: { Authorization: key },
      payload: JSON.stringify(cards),
      muteHttpExceptions: true
    });

    const code = resp.getResponseCode();
    const text = resp.getContentText();

    if (code >= 200 && code < 300) {
      return { code: code, body: text };
    }

    if (code === 429 || code >= 500) {
      const wait = WBSYNC_CONFIG.RETRY_BASE_MS * Math.pow(2, attempt);
      Logger.log('WB PUT retry ' + (attempt + 1) + '/' + WBSYNC_CONFIG.RETRY_MAX + ' HTTP ' + code + ', wait ' + wait + 'ms');
      sleepMs_(wait);
      lastError = { code: code, body: text };
      continue;
    }

    return { code: code, body: text };
  }

  return lastError || { code: 0, body: 'retry exhausted' };
}
