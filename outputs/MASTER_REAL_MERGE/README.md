# Master bound-script — merge package (Web Editor)

Пакет для **ручного** применения в Apps Script Editor мастера  
«Основная Сравнение конкурентов» (`16OBo1Enr19SFOuLm2pNy_JagMFppNqXKsYlUbLw_8S0`).

**Без `clasp push`.** Только копирование файлов в Web Editor.

| Файл | Назначение |
|------|------------|
| `appsscript.json` | Manifest: WBLib + **WBSyncLib**, Drive v3, scopes |
| `Bootstrap.gs` | Расширенные обёртки WBLib + hook `onOpenSeo_()` (дубли функций убраны) |
| `SeoWrapper.gs` | Меню SEO/WBSyncLib, **D6 fix** (без autoTransfer на open) |
| `InjectMasterTemplate.gs` | 7-tab 4TAB injection (`injectTemplatesIntoMaster`) |

Источник: `_BOOTSTRAP_DEPLOY_MASTER_ORPHAN/` (orphan scriptId — не пушить оттуда).

---

## Шаг 1 — Открыть редактор мастера

1. Открыть [мастер-файл](https://docs.google.com/spreadsheets/d/16OBo1Enr19SFOuLm2pNy_JagMFppNqXKsYlUbLw_8S0/edit).
2. **Extensions → Apps Script** (под `mppressgurwitz@gmail.com`, Editor).

---

## Шаг 2 — Manifest (`appsscript.json`)

1. В редакторе: **Project Settings** → включить **Show "appsscript.json" manifest file in editor** (если выключено).
2. Открыть `appsscript.json` слева.
3. Заменить содержимое на файл из этого пакета (`outputs/MASTER_REAL_MERGE/appsscript.json`).
4. Сохранить (Ctrl+S).

Проверить в manifest блок `libraries`:
- `WBLib` — `1UPClgAghLSdKjey8NbCEwZI7_pJ1cVEUIHSKTSotOgzK5rl1ibxwt0qO`, developmentMode
- `WBSyncLib` — `1BE9YkOsfu9FsYDyHHTdvtHnCXTa8TXpf46EIMMRNSMRI06dn0cK5hvd2`, developmentMode

При первом сохранении Editor может запросить **авторизацию scopes** — разрешить.

---

## Шаг 3 — `Bootstrap.gs`

1. Если есть старый `Bootstrap.gs` / `Code.gs` с меню WBLib — **заменить** содержимое на `Bootstrap.gs` из пакета.
2. Если файла нет — **+** → Script → имя `Bootstrap.gs` → вставить текст.
3. Убедиться, что в `onOpen()` вызывается `onOpenSeo_()` (из `SeoWrapper.gs`).

---

## Шаг 4 — `SeoWrapper.gs`

1. **+** → Script → `SeoWrapper.gs` (или заменить существующий).
2. Вставить содержимое из пакета.
3. Проверить: в `onOpenSeo_()` **нет** вызова `autoTransferSeoOnOpen` — только комментарий D6.

---

## Шаг 5 — `InjectMasterTemplate.gs`

1. **+** → Script → `InjectMasterTemplate.gs`.
2. Вставить содержимое из пакета (183 строки).
3. **Не запускать Run**, пока не готовы к шагу 7.

---

## Шаг 6 — Библиотеки (UI, если manifest не подхватил)

**Project Settings → Libraries** (или Resources → Libraries):

| Identifier | Script ID | Version |
|------------|-----------|---------|
| WBLib | `1UPClgAghLSdKjey8NbCEwZI7_pJ1cVEUIHSKTSotOgzK5rl1ibxwt0qO` | **Development mode** (HEAD) |
| WBSyncLib | `1BE9YkOsfu9FsYDyHHTdvtHnCXTa8TXpf46EIMMRNSMRI06dn0cK5hvd2` | **Development mode** (HEAD) |

Advanced service: **Google Drive API** v3 (если не включён).

---

## Шаг 7 — Run `injectTemplatesIntoMaster` (один раз)

1. Селектор функций → `injectTemplatesIntoMaster` → **Run**.
2. Функция **сама делает makeCopy** мастера в ту же Drive-папку.
3. В alert скопировать **URL бэкапа** и сохранить в чат/Notion.
4. Проверить новые листы (если их не было): `_Config`, `_Common`, `SEO_WB_Asmus`, `SEO_WB_Quantum`, `SEO_OZON_Asmus`, `SEO_OZON_Quantum`, `KeywordsRaw`.
5. Idempotent: существующие листы **не перезаписываются**.

---

## Шаг 8 — Smoke test

1. Закрыть и снова открыть мастер-таблицу (F5).
2. Меню WBLib должно появиться (как раньше).
3. Меню **🪄 SEO в WB** должно появиться (WBSyncLib).
4. **Не** должно быть автопереноса SEO при open (D6).

---

## Чеклист после merge

- [ ] `appsscript.json` — WBLib + WBSyncLib
- [ ] `Bootstrap.gs` — расширенный, без дублей `createSkuCardFromMasterDialog` / `backfillSkuRegistryDialog`
- [ ] `SeoWrapper.gs` — D6
- [ ] `InjectMasterTemplate.gs` — на месте
- [ ] Run `injectTemplatesIntoMaster` — бэкап URL зафиксирован
- [ ] **clasp push не выполнялся** (merge только через Web Editor)

---

## Связанные документы

- `outputs/MERGE_PLAN_MASTER_REAL.md` — контекст orphan vs real scriptId
- `_BOOTSTRAP_DEPLOY_MASTER_ORPHAN/ORPHAN_DO_NOT_PUSH.md` — не пушить в orphan scriptId
