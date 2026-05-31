/**
 * flattenCard / mergeCard — маппинг JSON WB ↔ строки _Advice_SEO_Draft.
 */

/** Доп. поля карточки вне characteristics */
var CARD_ROOT_FIELD_MAP = {
  'Title (наименование)': function(card) { return card.title; },
  'Наименование': function(card) { return card.title; },
  'Описание': function(card) { return card.description; },
  'Бренд': function(card) { return card.brand; },
  'Категория WB': function(card) { return card.subjectName; },
  'Артикул продавца': function(card) { return card.vendorCode; },
  'Артикул WB': function(card) { return card.nmID; },
  'Торговое наименование': function(card) { return card.tradeName || card.tradeBrand || ''; }
};

function flattenCard_(card) {
  const f = {};

  Object.keys(CARD_ROOT_FIELD_MAP).forEach(function(key) {
    const val = CARD_ROOT_FIELD_MAP[key](card);
    if (val !== undefined && val !== null && val !== '') f[key] = val;
  });

  if (card.dimensions) {
    if (card.dimensions.length != null) f['Длина упаковки'] = card.dimensions.length;
    if (card.dimensions.width != null) f['Ширина упаковки'] = card.dimensions.width;
    if (card.dimensions.height != null) f['Высота упаковки'] = card.dimensions.height;
    if (card.dimensions.weightBrutto != null) f['Вес с упаковкой (кг)'] = card.dimensions.weightBrutto;
  }

  if (Array.isArray(card.sizes) && card.sizes.length && Array.isArray(card.sizes[0].skus)) {
    f['Баркод'] = card.sizes[0].skus.join(', ');
  }

  if (Array.isArray(card.characteristics)) {
    card.characteristics.forEach(function(ch) {
      if (!ch || !ch.name) return;
      let v = ch.value;
      if (Array.isArray(v)) v = v.join(', ');
      f[ch.name] = v;
    });
  }

  if (Array.isArray(card.tnvedCodes) && card.tnvedCodes.length) {
    f['ТНВЭД'] = card.tnvedCodes.join(', ');
  }

  /** Предметные размеры — часто в characteristics, дублируем явные ключи */
  ['Высота предмета', 'Ширина предмета', 'ИКПУ', 'Код упаковки', 'Тип доставки', 'NTIN', 'Ставка НДС'].forEach(function(name) {
    if (!f[name] && card[name] != null) f[name] = card[name];
  });

  return f;
}

function mergeCard_(card, newValues) {
  const c = JSON.parse(JSON.stringify(card));

  if (newValues['Title (наименование)']) c.title = newValues['Title (наименование)'];
  if (newValues['Наименование'] && !newValues['Title (наименование)']) {
    c.title = newValues['Наименование'];
  }
  if (newValues['Описание']) c.description = newValues['Описание'];
  if (newValues['Торговое наименование']) {
    c.tradeName = newValues['Торговое наименование'];
  }

  if (Array.isArray(c.characteristics)) {
    c.characteristics = c.characteristics.map(function(ch) {
      if (ch && ch.name && Object.prototype.hasOwnProperty.call(newValues, ch.name)) {
        return Object.assign({}, ch, { value: splitValue_(newValues[ch.name]) });
      }
      return ch;
    });
  }

  if (c.dimensions) {
    if (newValues['Длина упаковки']) {
      c.dimensions.length = Number(newValues['Длина упаковки']) || c.dimensions.length;
    }
    if (newValues['Ширина упаковки']) {
      c.dimensions.width = Number(newValues['Ширина упаковки']) || c.dimensions.width;
    }
    if (newValues['Высота упаковки']) {
      c.dimensions.height = Number(newValues['Высота упаковки']) || c.dimensions.height;
    }
    if (newValues['Вес с упаковкой (кг)']) {
      c.dimensions.weightBrutto = Number(newValues['Вес с упаковкой (кг)']) || c.dimensions.weightBrutto;
    }
  }

  if (newValues['ТНВЭД']) {
    c.tnvedCodes = String(newValues['ТНВЭД']).split(/[,;]/).map(function(x) { return x.trim(); }).filter(Boolean);
  }

  return c;
}

function isBasicCardField_(name) {
  return WBSYNC_CONFIG.BASIC_CARD_FIELDS.indexOf(name) >= 0;
}

function isSeoCharacteristicField_(name) {
  if (isBasicCardField_(name)) return false;
  const exclude = ['Артикул WB', 'Артикул продавца', 'Категория WB', 'Бренд', 'Артикул OZON'];
  return exclude.indexOf(name) < 0;
}

function buildPushValues_(all, block, categoryName, applicableSeoFields, newColIndex) {
  const colNew = newColIndex || 3;
  const newValues = {};

  for (let i = block.start; i <= block.end; i++) {
    const name = String(all[i][0] || '').trim();
    const newVal = String(all[i][colNew - 1] || '').trim();
    if (isSkippableFieldRow_(name) || !newVal) continue;

    if (isBasicCardField_(name)) {
      newValues[name] = newVal;
      continue;
    }

    if (isSeoCharacteristicField_(name)) {
      if (!categoryName || applicableSeoFields.indexOf(name) >= 0) {
        newValues[name] = newVal;
      }
    }
  }

  return newValues;
}

function getNewValueColumnForCabinet_(cabinet) {
  const map = WBSYNC_CONFIG.CABINET_NEW_COL;
  if (map[cabinet]) return map[cabinet];
  return 3;
}

function parseSeoBlock_(all, techStart) {
  const result = { title: '', description: '', characteristics: {} };
  for (let i = 0; i < techStart; i++) {
    const cell = String(all[i][0] || '').trim();
    if (/^Title(\s*\(.*\))?$/i.test(cell)) {
      for (let j = i + 1; j < techStart && j < i + 5; j++) {
        const v = String(all[j][0] || '').trim();
        if (v) { result.title = v; break; }
      }
    }
    if (/^Описание$/i.test(cell)) {
      for (let j = i + 1; j < techStart && j < i + 5; j++) {
        const v = String(all[j][0] || '').trim();
        if (v) { result.description = v.replace(/^["«]|["»]$/g, ''); break; }
      }
    }
    if (/^Характеристики$/i.test(cell)) {
      for (let j = i + 1; j < techStart; j++) {
        const name = String(all[j][0] || '').trim();
        const value = String(all[j][1] || '').trim();
        if (!name) break;
        if (/^(Активные компоненты|Main keywords|Long-tail|Фото|Заметки|🪄|📸)/i.test(name)) break;
        if (name && value) result.characteristics[name] = value;
      }
    }
  }
  return result;
}

function transferSeoToTechBlockInternal_(ss, silent) {
  const draft = ss.getSheetByName(WBSYNC_CONFIG.DRAFT_SHEET);
  if (!draft) return 'Лист ' + WBSYNC_CONFIG.DRAFT_SHEET + ' не найден.';

  const all = draft.getDataRange().getValues();
  const block = findTechBlock_(all);
  if (!block) return 'Тех.блок не найден.';

  const seo = parseSeoBlock_(all, block.start);
  const valuesByWbName = {};

  if (seo.title) {
    valuesByWbName['Title (наименование)'] = seo.title;
    valuesByWbName['Наименование'] = seo.title;
  }
  if (seo.description) valuesByWbName['Описание'] = seo.description;

  const skipped = [];
  Object.keys(seo.characteristics).forEach(function(seoName) {
    const value = seo.characteristics[seoName];
    let wbName = null;
    if (hasField_(all, block, seoName)) wbName = seoName;
    else if (WBSYNC_CONFIG.SEO_FIELD_MAP[seoName] && hasField_(all, block, WBSYNC_CONFIG.SEO_FIELD_MAP[seoName])) {
      wbName = WBSYNC_CONFIG.SEO_FIELD_MAP[seoName];
    }
    if (wbName) valuesByWbName[wbName] = value;
    else skipped.push(seoName);
  });

  let written = 0;
  const cabinet = String(draft.getRange('B1').getValue() || 'Asmus').trim();
  const targetCol = getNewValueColumnForCabinet_(cabinet);

  for (let i = block.start; i <= block.end; i++) {
    const field = String(all[i][0] || '').trim();
    if (isSkippableFieldRow_(field)) continue;
    if (Object.prototype.hasOwnProperty.call(valuesByWbName, field)) {
      const existing = String(all[i][targetCol - 1] || '').trim();
      if (!existing) {
        draft.getRange(i + 1, targetCol).setValue(valuesByWbName[field]);
        written++;
      }
    }
  }

  const msg = 'SEO → тех.блок (кол ' + targetCol + ', ' + cabinet + '):\n  • Перенесено: ' + written +
    (skipped.length ? '\n  • Без WB-аналога: ' + skipped.join(', ') : '\n  • Все поля сопоставились');
  Logger.log(msg);
  return msg;
}
