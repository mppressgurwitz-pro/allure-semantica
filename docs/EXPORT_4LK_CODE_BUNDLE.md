# EXPORT: 4 ЛК — scriptId, код, доки, diff _Advice_SEO_Draft

**Дата выгрузки:** 2026-05-30  
**Корень проекта:** `C:\Users\mb\OneDrive - Allure City, Inc\Documents\Claude\Projects\Автоматизация Семантика\`

---

## 1. Script ID (из `.clasp.json`, проверено локально)

| Проект | scriptId | Editor URL |
|--------|----------|------------|
| **WBSyncLib** (NEW) | `1BE9YkOsfu9FsYDyHHTdvtHnCXTa8TXpf46EIMMRNSMRI06dn0cK5hvd2` | https://script.google.com/d/1BE9YkOsfu9FsYDyHHTdvtHnCXTa8TXpf46EIMMRNSMRI06dn0cK5hvd2/edit |
| **WBLib** (WBConkAnalysisLib) | `1UPClgAghLSdKjey8NbCEwZI7_pJ1cVEUIHSKTSotOgzK5rl1ibxwt0qO` | https://script.google.com/d/1UPClgAghLSdKjey8NbCEwZI7_pJ1cVEUIHSKTSotOgzK5rl1ibxwt0qO/edit |
| Bootstrap копий SKU | `1R8RMQ4sR93SIcTsuEiXHrcxdrnTn1c1bl6-ulHVswFsQn4o1MTXhXEOH` | https://script.google.com/d/1R8RMQ4sR93SIcTsuEiXHrcxdrnTn1c1bl6-ulHVswFsQn4o1MTXhXEOH/edit |
| Bootstrap **мастера** | `1mVmHnt5pTRekk9C3lNwTewMkmcLA508BEsys2YVRb5oZkjeTII0NymgU` | https://script.google.com/d/1mVmHnt5pTRekk9C3lNwTewMkmcLA508BEsys2YVRb5oZkjeTII0NymgU/edit |
| Прототип PGBOT1M08 (legacy) | `1-iDt3Zs6Mz86_kKOO4z8gqfjm2OoQv-wnVKaKkeszA26Je9F9DO_tCkq` | https://script.google.com/d/1-iDt3Zs6Mz86_kKOO4z8gqfjm2OoQv-wnVKaKkeszA26Je9F9DO_tCkq/edit |

| Spreadsheet | ID |
|-------------|-----|
| Мастер «Основная Сравнение конкурентов » | `16OBo1Enr19SFOuLm2pNy_JagMFppNqXKsYlUbLw_8S0` |
| Папка «Результаты по семантике» | `1gDUCk2a9h7z0zfNzAneXJkBtlupCYxy3` |
| Эталон PGBOT1M08 | `1NOO50oa9CWfXzA7AixR7zapj1xzr2e3xhK7lM6Cc3bQ` |

**WBSyncLib в bootstrap** (`_BOOTSTRAP_DEPLOY/appsscript.json`):

```json
{
  "userSymbol": "WBSyncLib",
  "libraryId": "1BE9YkOsfu9FsYDyHHTdvtHnCXTa8TXpf46EIMMRNSMRI06dn0cK5hvd2",
  "version": "0",
  "developmentMode": true
}
```

---

## 2. Diff `_Advice_SEO_Draft` — ДО vs ПОСЛЕ миграции 4LK

### 2.1. Шапка листа (строки 1–6)

**ДО** (типичная копия до 2026-05-30, 2 кабинета WB, одна колонка «Новое»):

```
A1: (пусто или SEO-черновик)     B1: (пусто)
... верхний SEO-блок (Title, Описание, Характеристики) ...
```

**ПОСЛЕ** (`26_MigrateCopiesTo4LK.gs` → `setupDraftHeaderPanel_`):

```
A1: Активный WB-кабинет (PULL/PUSH)   B1: Asmus | Quantum   C1: Схема   D1: 4LK_2026-05-30

     A          B              C                 D
2    ЛК         Пол (SEO)      Артикул / nmID    Статус SEO
3    WB Асмус   женский        (из Артикул WB)   не начато
4    WB Quantum мужской        (пусто)           не начато
5    OZON Асмус женский        (из Артикул OZON) не начато
6    OZON Quantum мужской      (пусто)           не начато
```

### 2.2. Технический блок — заголовок таблицы

**ДО** (4 колонки, прототип `Apps_Script_Меню_копии_B.gs` / Шаг3):

| A | B | C | D |
|---|---|---|---|
| Поле | Текущее в WB | **Новое значение** | Источник |

**ПОСЛЕ** (7 колонок):

| A | B | C | D | E | F | G |
|---|---|---|---|---|---|---|
| Поле | Текущее в WB | **Новое WB Асмус** | **Новое WB Quantum** | **Новое OZON Асмус** | **Новое OZON Quantum** | Источник |

- Старые данные в **C сохраняются** (это WB Асмус).
- D, E, F — новые пустые колонки (insertColumnsAfter(3, 3)).
- Бывшая колонка D «Источник» сдвигается в **G**.

### 2.3. Новые строки в блоке «ИДЕНТИФИКАТОР SKU»

**ДО:**

```
Артикул WB
Артикул продавца
Категория WB
Бренд
Наименование
(опционально: Артикул OZON — одна колонка)
```

**ПОСЛЕ** (добавляются, если отсутствуют):

```
nmID / артикул WB Асмус      ← B = бывший «Артикул WB»
nmID / артикул WB Quantum
SKU OZON Асмус
SKU OZON Quantum
Пол — WB Асмус               ← B = женский (дефолт)
Пол — WB Quantum             ← B = мужской
Пол — OZON Асмус             ← B = женский
Пол — OZON Quantum           ← B = мужской
```

### 2.4. PUSH/PULL — какая колонка читается

| Операция | B1 | Колонка «Новое» |
|----------|-----|-----------------|
| pushToAsmus | Asmus | **C** (col 3) |
| pushToQuantum | Quantum | **D** (col 4) |
| Ozon (ручная/xlsx позже) | — | **E**, **F** |
| transferSeoToTechBlock | B1 | та же, что PUSH для B1 |

### 2.5. `_Config` — новые ключи после миграции

```
ADVICE_SEO_SCHEMA_VERSION = 4LK_2026-05-30
OZON_TEMPLATE_CATEGORY    = (из WB категории, напр. Косметика для волос)
OZON_TEMPLATE_FILE        = (напр. Косметика для волос_27.05.2026.xlsx)
OZON_TEMPLATES_LOCAL_PATH = C:\Users\mb\OneDrive - Allure City, Inc\ОП_E-COMMERCE\Автоматизация\Шаблоны для SEO-Ozon
OZON_TEMPLATE_FULL_PATH   = ...\Косметика для волос_27.05.2026.xlsx
```

---

## 3. `27_OzonTemplates.gs` (полный текст)

Путь: `_СВЕЖАЯ_ВЕРСИЯ_v3\27_OzonTemplates.gs`

```javascript
/**
 * 27_OzonTemplates.gs
 * Сопоставление категории WB → шаблон выгрузки Ozon (xlsx).
 * Локальные шаблоны: OneDrive\ОП_E-COMMERCE\Автоматизация\Шаблоны для SEO-Ozon
 */

var OZON_TEMPLATES = {
  LOCAL_PATH: 'C:\\Users\\mb\\OneDrive - Allure City, Inc\\ОП_E-COMMERCE\\Автоматизация\\Шаблоны для SEO-Ozon',
  MAP_SHEET: '_Ozon_Template_Map',
  /** Имена файлов (актуальная дата в имени — обновлять при смене шаблона Маши) */
  FILES: {
    'Парфюмерия': 'Парфюмерия_27.05.2026.xlsx',
    'Свеча': 'Свеча_27.05.2026.xlsx',
    'Соль для ванны': 'Соль для ванны_27.05.2026.xlsx',
    'Косметика для ухода': 'Косметика для ухода_27.05.2026.xlsx',
    'Косметика для волос': 'Косметика для волос_27.05.2026.xlsx',
    'Ароматы для дома': 'Ароматы для дома_27.05.2026.xlsx',
    'Средство после бритья': 'Средство после бритья_27.05.2026.xlsx',
    'Средства для гигиены тела': 'Средства для гигиены тела_27.05.2026.xlsx'
  },
  /** Категория WB (subjectName / _WB_Char_Dict) → категория Ozon */
  WB_TO_OZON: {
    'Шампуни': 'Косметика для волос',
    'Кондиционеры для волос': 'Косметика для волос',
    'Пилинг': 'Косметика для ухода',
    'Гели': 'Косметика для ухода',
    'Спреи': 'Косметика для ухода',
    'Лосьоны': 'Косметика для ухода',
    'Мыло косметическое': 'Средства для гигиены тела',
    'Дезодоранты': 'Средства для гигиены тела',
    'Парфюмерная вода': 'Парфюмерия',
    'Духи': 'Парфюмерия',
    'Туалетная вода': 'Парфюмерия',
    'Парфюм для дома': 'Ароматы для дома',
    'Саше ароматические': 'Ароматы для дома',
    'Соль для ванн': 'Соль для ванны',
    'Косметические наборы для ухода': 'Косметика для ухода'
  }
};

function setupOzonTemplateMapSheet() {
  const ss = getTargetSpreadsheet_();
  const log = newLogContext_('setupOzonTemplateMap');
  try {
    ensureOzonTemplateMapSheet_(ss);
    log.flush('OK');
    SpreadsheetApp.getUi().alert(
      'Лист «' + OZON_TEMPLATES.MAP_SHEET + '» готов в мастер-файле.\n' +
      'Путь к xlsx: ' + OZON_TEMPLATES.LOCAL_PATH
    );
  } catch (e) {
    log.error(e.message);
    log.flush('ERROR');
    SpreadsheetApp.getUi().alert('Ошибка: ' + e.message);
  }
}

function ensureOzonTemplateMapSheet_(ss) {
  let sh = ss.getSheetByName(OZON_TEMPLATES.MAP_SHEET);
  if (!sh) {
    sh = ss.insertSheet(OZON_TEMPLATES.MAP_SHEET);
  }
  sh.clear();
  const headers = [
    'Категория WB', 'Категория Ozon', 'Файл шаблона xlsx', 'Локальный путь', 'Примечания'
  ];
  sh.getRange(1, 1, 1, headers.length).setValues([headers])
    .setFontWeight('bold').setBackground('#cfe2f3');
  sh.setFrozenRows(1);

  const rows = [];
  Object.keys(OZON_TEMPLATES.WB_TO_OZON).forEach(function(wbCat) {
    const ozonCat = OZON_TEMPLATES.WB_TO_OZON[wbCat];
    const file = OZON_TEMPLATES.FILES[ozonCat] || '';
    rows.push([wbCat, ozonCat, file, OZON_TEMPLATES.LOCAL_PATH, '']);
  });
  if (rows.length) {
    sh.getRange(2, 1, 1 + rows.length, headers.length).setValues(rows);
  }

  sh.getRange(1, 6).setValue('LOCAL_ROOT').setFontWeight('bold');
  sh.getRange(2, 6).setValue(OZON_TEMPLATES.LOCAL_PATH);
  return sh;
}

function resolveOzonTemplateForWbCategory_(wbCategory) {
  const raw = String(wbCategory || '').trim();
  if (!raw) return { ozonCategory: '', templateFile: '', localPath: OZON_TEMPLATES.LOCAL_PATH };

  let ozonCat = OZON_TEMPLATES.WB_TO_OZON[raw];
  if (!ozonCat) {
    Object.keys(OZON_TEMPLATES.WB_TO_OZON).forEach(function(k) {
      if (!ozonCat && (raw.indexOf(k) >= 0 || k.indexOf(raw) >= 0)) ozonCat = OZON_TEMPLATES.WB_TO_OZON[k];
    });
  }
  if (!ozonCat) ozonCat = 'Косметика для ухода';

  return {
    wbCategory: raw,
    ozonCategory: ozonCat,
    templateFile: OZON_TEMPLATES.FILES[ozonCat] || '',
    localPath: OZON_TEMPLATES.LOCAL_PATH,
    fullPath: OZON_TEMPLATES.LOCAL_PATH + '\\' + (OZON_TEMPLATES.FILES[ozonCat] || '')
  };
}

function applyOzonTemplateConfigToCopy_(ss) {
  const draft = ss.getSheetByName('_Advice_SEO_Draft');
  let wbCategory = '';
  if (draft) {
    const all = draft.getDataRange().getValues();
    const block = findTechBlock4LK_(all);
    if (block) {
      wbCategory = readFieldInBlock_(all, block, 'Категория WB');
    }
  }
  const resolved = resolveOzonTemplateForWbCategory_(wbCategory);
  let cfg = ss.getSheetByName('_Config');
  if (!cfg) return resolved;

  upsertConfigParamOnSheet_(cfg, 'OZON_TEMPLATE_CATEGORY', resolved.ozonCategory, 'Категория Ozon для xlsx');
  upsertConfigParamOnSheet_(cfg, 'OZON_TEMPLATE_FILE', resolved.templateFile, 'Имя файла шаблона Ozon');
  upsertConfigParamOnSheet_(cfg, 'OZON_TEMPLATES_LOCAL_PATH', resolved.localPath, 'OneDrive путь к папке шаблонов');
  if (resolved.fullPath) {
    upsertConfigParamOnSheet_(cfg, 'OZON_TEMPLATE_FULL_PATH', resolved.fullPath, 'Полный путь к xlsx');
  }
  return resolved;
}

function upsertConfigParamOnSheet_(cfgSh, key, value, description) {
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

function showOzonExportHintDialog() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const cfg = ss.getSheetByName('_Config');
  let msg = 'Выгрузка Ozon (xlsx):\n\n';
  msg += 'SEO для Ozon пишется в колонки E (OZON Асмус) и F (OZON Quantum) листа _Advice_SEO_Draft.\n\n';
  msg += 'Папка шаблонов:\n' + OZON_TEMPLATES.LOCAL_PATH + '\n\n';

  if (cfg && cfg.getLastRow() >= 2) {
    const data = cfg.getRange(2, 1, cfg.getLastRow() - 1, 2).getValues();
    const pick = {};
    data.forEach(function(r) { pick[String(r[0]).trim()] = String(r[1] || ''); });
    if (pick.OZON_TEMPLATE_FILE) {
      msg += 'Шаблон для этого SKU: ' + pick.OZON_TEMPLATE_FILE + '\n';
      msg += 'Категория Ozon: ' + (pick.OZON_TEMPLATE_CATEGORY || '—') + '\n';
    }
  }
  msg += '\nАвто-заполнение xlsx — в следующей фазе (после ЧП-5 WB).';
  SpreadsheetApp.getUi().alert('Ozon — шаблоны', msg, SpreadsheetApp.getUi().ButtonSet.OK);
}
```

---

## 4. `SeoWrapper.gs` (полный текст, `_BOOTSTRAP_DEPLOY\`)

```javascript
/**
 * SeoWrapper.gs — тонкая обёртка над WBSyncLib для bound-скрипта копии SKU.
 * WBSyncLib scriptId задаётся в appsscript.json после clasp create.
 */

function onOpenSeo_() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🪄 SEO в WB')
    .addSubMenu(ui.createMenu('📥 Загрузить из WB')
      .addItem('Из Асмус', 'pullAsmus_')
      .addItem('Из Quantum', 'pullQuantum_'))
    .addSeparator()
    .addItem('↻ Перенести SEO → тех.блок', 'transferSeo_')
    .addItem('🧹 Очистить «Новое значение»', 'clearNew_')
    .addSeparator()
    .addSubMenu(ui.createMenu('📤 Выгрузить в WB')
      .addItem('В Асмус (safe GET→merge→PUT)', 'pushAsmus_')
      .addItem('В Quantum (safe GET→merge→PUT)', 'pushQuantum_'))
    .addSeparator()
    .addItem('🔍 Проверить артикул', 'diagnoseVendor_')
    .addItem('🔧 Починить артикул (CYR→LAT)', 'fixVendor_')
    .addSeparator()
    .addItem('⚙️ Ozon (скоро)', 'ozonStub_')
    .addToUi();

  try {
    WBSyncLib.autoTransferSeoOnOpen(SpreadsheetApp.getActiveSpreadsheet());
  } catch (err) {
    Logger.log('autoTransferSeo: ' + err.message);
  }
}

function pullAsmus_() { WBSyncLib.pullFromAsmus(SpreadsheetApp.getActiveSpreadsheet()); }
function pullQuantum_() { WBSyncLib.pullFromQuantum(SpreadsheetApp.getActiveSpreadsheet()); }
function pushAsmus_() { WBSyncLib.pushToAsmus(SpreadsheetApp.getActiveSpreadsheet()); }
function pushQuantum_() { WBSyncLib.pushToQuantum(SpreadsheetApp.getActiveSpreadsheet()); }
function transferSeo_() { WBSyncLib.transferSeoToTechBlock(SpreadsheetApp.getActiveSpreadsheet()); }
function clearNew_() { WBSyncLib.clearNewValues(SpreadsheetApp.getActiveSpreadsheet()); }
function diagnoseVendor_() { WBSyncLib.diagnoseVendor(SpreadsheetApp.getActiveSpreadsheet()); }
function fixVendor_() { WBSyncLib.fixVendorCode(SpreadsheetApp.getActiveSpreadsheet()); }

function ozonStub_() {
  try {
    WBLib.showOzonExportHintDialog();
  } catch (e) {
    SpreadsheetApp.getUi().alert(
      'Ozon',
      'SEO → колонки E/F в _Advice_SEO_Draft.\n' +
      'Шаблоны xlsx: OneDrive\\ОП_E-COMMERCE\\Автоматизация\\Шаблоны для SEO-Ozon\n\n' +
      'Авто-выгрузка — после стабилизации WB (ЧП-5).',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  }
}

function wbsyncLibMissingHelp_() {
  SpreadsheetApp.getUi().alert(
    'WBSyncLib не подключена',
    'Apps Script → Libraries → добавьте WBSyncLib (Identifier: WBSyncLib, version HEAD).\n' +
    'После первого запуска разрешите scopes Library.',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}
```

**Отличие `_BOOTSTRAP_DEPLOY_MASTER\SeoWrapper.gs`:** идентичен, кроме fallback-текста в `ozonStub_` (без «xlsx» в одной строке).

---

## 5. `docs/MIGRATION_4LK.md` (полный текст)

```markdown
# Миграция существующих копий на схему 4 ЛК

**Мастер-файл:** [Основная Сравнение конкурентов](https://docs.google.com/spreadsheets/d/16OBo1Enr19SFOuLm2pNy_JagMFppNqXKsYlUbLw_8S0/edit)

**Копии SKU:** [Результаты по семантике](https://drive.google.com/drive/folders/1gDUCk2a9h7z0zfNzAneXJkBtlupCYxy3)

**Шаблоны Ozon (xlsx):** `C:\Users\mb\OneDrive - Allure City, Inc\ОП_E-COMMERCE\Автоматизация\Шаблоны для SEO-Ozon`

---

## Единый механизм (4 кабинета)

| Кабинет | Колонка «Новое» | Пол (дефолт) | Выгрузка |
|---------|-----------------|--------------|----------|
| WB Асмус | C | женский | WBSyncLib PULL/PUSH, B1=Asmus |
| WB Quantum | D | мужской | WBSyncLib PULL/PUSH, B1=Quantum |
| OZON Асмус | E | женский | xlsx-шаблон по категории (ручная/авто позже) |
| OZON Quantum | F | мужской | xlsx-шаблон по категории |

В `_Config` каждой копии после миграции:

- `ADVICE_SEO_SCHEMA_VERSION` = `4LK_2026-05-30`
- `OZON_TEMPLATE_CATEGORY`, `OZON_TEMPLATE_FILE`, `OZON_TEMPLATES_LOCAL_PATH`

Справочник WB→Ozon в мастере: лист **`_Ozon_Template_Map`** (меню → «📦 Справочник шаблонов Ozon»).

---

## Что добавляется в каждый файл (без пересоздания)

| Элемент | Где |
|---------|-----|
| Шапка 4 ЛК (пол + артикул + статус) | `_Advice_SEO_Draft` строки 2–6 |
| Активный WB-кабинет для PULL/PUSH | `B1` = `Asmus` или `Quantum` |
| Колонки «Новое» ×4 | C … F |
| Строки nmID/SKU и «Пол — …» ×4 | технический блок |
| Привязка к xlsx Ozon | `_Config` |

**Колонка C (старые данные) сохраняется** — это SEO для WB Асмус.

---

## Как запустить

1. Открыть [мастер-таблицу](https://docs.google.com/spreadsheets/d/16OBo1Enr19SFOuLm2pNy_JagMFppNqXKsYlUbLw_8S0/edit).
2. Один раз: **🗂 Мастер-файлы → 📦 Справочник шаблонов Ozon (лист)**.
3. **🔄 Миграция 4 ЛК (все копии в папке)** — сначала Yes (dry-run), потом No (запись).

Для одной копии: **🔄 Миграция 4 ЛК (текущая таблица)**.

---

## Ozon — как работает сейчас

1. Маша заполняет SEO в колонках **E** и **F** (разный текст под пол/кабинет).
2. В `_Config` указан файл шаблона, например `Косметика для волос_27.05.2026.xlsx`.
3. Меню копии **⚙️ Ozon** — подсказка с путём и именем шаблона.
4. Авто-заполнение xlsx из колонок E/F — фаза после стабилизации WB (ЧП-5).

Категории шаблонов (8): Парфюмерия, Свеча, Соль для ванны, Косметика для ухода, Косметика для волос, Ароматы для дома, Средство после бритья, Средства для гигиены тела.

---

## Проверка

- `_Config` → `ADVICE_SEO_SCHEMA_VERSION = 4LK_2026-05-30`
- Тех.блок: 7 колонок, заголовки «Новое WB Асмус» … «Новое OZON Quantum»
- `_Config` → `OZON_TEMPLATE_FILE` не пуст для SKU с известной категорией WB
```

---

## 6. `docs/OZON_DEFERRED.md` (полный текст)

```markdown
# Ozon phase — deferred until ЧП-5

См. п. 4.6–4.7 исходного ТЗ. **Не активировать** до завершения lazy migration WB (ЧП-5).

## Открытые решения (для Михаила)

1. Один `MarketplaceSyncLib` vs два Library
2. Ozon-PUSH: REST API vs xlsx-генератор
3. Квантум=мужской / Асмус=женский — жёстко или конфиг
4. SKU унисекс — один SEO на 4 ЛК или 4 копии
5. SEO×4 — расширить `_Advice_SEO_Draft` vs `_Advice_SEO_OZON_Draft`
6. Маршрутизация B1 vs B2=Platform

## Подготовка (можно параллельно, не блокирует WB)

- Распаковать `configs.XLS_TEMPLATE_INFO_BASE64` из 8 Ozon-шаблонов → `_OZON_Char_Dict`
- Промпт SEO Ozon: бренд первым, 200/27 симв., `<br>/<ul>/<li>` в аннотации

## Реестр SKU

Колонки `nmID_ozon_*` и `lastSync_ozon_*` уже заложены в `25_SkuRegistry.gs`.
```

---

## 7. `26_MigrateCopiesTo4LK.gs` (полный текст, 389 строк)

Путь: `_СВЕЖАЯ_ВЕРСИЯ_v3\26_MigrateCopiesTo4LK.gs`  
Копия: `docs\export\26_MigrateCopiesTo4LK.gs`

```javascript
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
```

---

## 8. Локальные пути к исходникам

| Файл | Путь |
|------|------|
| 27_OzonTemplates.gs | `...\Автоматизация Семантика\_СВЕЖАЯ_ВЕРСИЯ_v3\27_OzonTemplates.gs` |
| 26_MigrateCopiesTo4LK.gs | `...\Автоматизация Семантика\_СВЕЖАЯ_ВЕРСИЯ_v3\26_MigrateCopiesTo4LK.gs` |
| 26_MigrateCopiesTo4LK.gs (копия) | `...\Автоматизация Семантика\docs\export\26_MigrateCopiesTo4LK.gs` |
| SeoWrapper.gs | `...\Автоматизация Семантика\_BOOTSTRAP_DEPLOY\SeoWrapper.gs` |
| WBSyncLib | `...\Автоматизация Семантика\WBSyncLib\` |
| Эта выгрузка | `...\Автоматизация Семантика\docs\EXPORT_4LK_CODE_BUNDLE.md` |
