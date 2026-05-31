# RESTORE_INDEX — сессия 2026-05-31

## Статус: локальная база синхронизирована с Google (pull, без push)

**Папка проекта:** `C:\Users\mb\OneDrive - Allure City, Inc\Documents\Claude\Projects\Автоматизация Семантика`

**clasp:** 2.4.2 | **login:** mppressgurwitz@gmail.com

---

## Что сделано в этой сессии

1. `clasp pull` по 5 проектам + clone `_LEGACY_PGBOT1M08`
2. Инвентаризация файлов (см. ниже)
3. **push НЕ выполнялся** (стоп-лист соблюдён)

---

## Инвентаризация после pull

| Папка | scriptId | Файлов (.gs/.js) | Размер | Вердикт |
|---|---|---:|---:|---|
| `WBSyncLib/` | `1BE9YkO…` | 12 модулей | ~43 KB | **Полный код Library** — не заглушка |
| `_СВЕЖАЯ_ВЕРСИЯ_v3/` (WBLib) | `1UPCl…` | 30 | ~245 KB | Полный legacy + 4ЛК (`25_SkuRegistry`, `26_MigrateCopiesTo4LK`, `27_OzonTemplates`) |
| `_BOOTSTRAP_DEPLOY/` | `1R8RMQ4…` | 3 | ~8 KB | Bootstrap + SeoWrapper |
| `_BOOTSTRAP_DEPLOY_MASTER/` | `1mVmHnt5…` | 3 | ~9 KB | Bootstrap мастера + SeoWrapper |
| `_BOOTSTRAP_DEPLOY_SHAMPOO/` | `1aydrFR…` | 2 | ~5 KB | Pre-WBSyncLib образец |
| `_LEGACY_PGBOT1M08/` | `1-iDt3Zs6…` | 3 | — | Прототип PULL/PUSH (Apps Script.js) |

### WBSyncLib — модули на сервере

- `ApiKeys`, `CardFetch`, `CardMerge`, `CharDict`, `Config`, `Diagnostics`
- `MenuApi` (публичный API: pull/push/diagnose/autoTransfer)
- `Setup`, `SheetSync`, `Utils`, `WbClient`

### Известные дефекты (ещё на сервере, не трогаем до ЧП-3)

- **D6:** `SeoWrapper.gs` строки 26–30 — `autoTransferSeoOnOpen` в `onOpenSeo_`
- **D2/D3/D4:** `27_OzonTemplates.gs` — хардкод дат, LOCAL_PATH, fallback категории

### Замечание: дубликаты .gs + .js

После `clasp pull` в `WBSyncLib/` лежат и `.gs` (локальные), и `.js` (с сервера). Перед следующим push — привести к одному формату через `.claspignore` или удалить дубли **локально**, не push'ить вслепую.

---

## Следующий шаг (блокер): ЧП-3

**Spreadsheet:** [PGBOT1M08](https://docs.google.com/spreadsheets/d/1NOO50oa9CWfXzA7AixR7zapj1xzr2e3xhK7lM6Cc3bQ/edit)

1. Записать baseline: ТНВЭД, декларация, габариты (col B в `_Advice_SEO_Draft`)
2. Меню → 🪄 SEO в WB → 📥 PULL → Из Асмус → HTTP 200
3. Меню → 📤 PUSH → В Асмус → HTTP 200
4. Повторный PULL — критичные поля не обнулены
5. 🔍 Проверить артикул → notFound ≤ 3

**Кто:** Маша (scopes) или Михаил. Cursor не может выполнить WB API из IDE.

---

## Стоп-лист (актуален)

- ❌ `clasp push` до зелёного ЧП-3
- ❌ «🔄 Миграция 4 ЛК (все копии)» в мастере
- ❌ Изменения PGBOT1M08 кроме PULL/PUSH теста
- ❌ Восстанавливать `26_MigrateCopiesTo4LK.gs` как целевую модель (отменена → будет `28_MigrateCopiesTo4Tabs.gs`)

---

## Git

- **Commit:** `0577e3f` + fix WBSyncLib submodule → обычные файлы
- **Remote GitHub:** `allure-semantica` (private) — создать: `gh repo create allure-semantica --private --source=. --push`
- **Важно:** `.gitignore` игнорирует `**/*.js` (артефакты clasp pull); источник — `.gs`

---

## Ссылки

| Документ | Путь |
|---|---|
| Полное ТЗ | `outputs/CURSOR_RESTART_FULL_BRIEF.md` |
| Smoke checklist | `docs/SMOKE_CHECKLIST.md` |
| Дефекты 4ЛК | `docs/EXPORT_4LK_CODE_BUNDLE.md` |
| clone script | `restore/clone_all.ps1` |
