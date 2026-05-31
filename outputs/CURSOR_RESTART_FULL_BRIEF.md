# CURSOR_RESTART_FULL_BRIEF — навигация (2026-05-31)

Полный текст брифинга (12 разделов) передан в чат Cursor 2026-05-31.
Этот файл — **краткий указатель**; детали — в связанных документах проекта.

## Быстрый старт

1. Открыть **`outputs/RESTORE_INDEX.md`** — статус восстановления и инвентаризация
2. **Стоп-лист:** никакого `clasp push` до ЧП-3; не трогать PGBOT1M08 кроме регрессии
3. **ЧП-3:** `docs/SMOKE_CHECKLIST.md` → PGBOT1M08 PULL/PUSH Асмус
4. **Целевая модель:** 4 листа SEO на SKU (раздел 5 брифинга) → `28_MigrateCopiesTo4Tabs.gs` (ещё не написан)

## Script ID

| Проект | ID |
|---|---|
| WBSyncLib | `1BE9YkOsfu9FsYDyHHTdvtHnCXTa8TXpf46EIMMRNSMRI06dn0cK5hvd2` |
| WBLib | `1UPClgAghLSdKjey8NbCEwZI7_pJ1cVEUIHSKTSotOgzK5rl1ibxwt0qO` |
| Bootstrap копий SKU | `1R8RMQ4sR93SIcTsuEiXHrcxdrnTn1c1bl6-ulHVswFsQn4o1MTXhXEOH` | `_BOOTSTRAP_DEPLOY/` |
| **Bootstrap мастера (REAL)** | `1_rwr2crtHI9sT_gykGYfJHnhUGteyZzwbEQnbHm1v7-B07DZxlu_9BRH` | `_BOOTSTRAP_DEPLOY_MASTER_REAL/` |
| Bootstrap мастера (ORPHAN, не push) | `1mVmHnt5pTRekk9C3lNwTewMkmcLA508BEsys2YVRb5oZkjeTII0NymgU` | `_BOOTSTRAP_DEPLOY_MASTER_ORPHAN/` |
| Legacy PGBOT1M08 (bound копии, не мастер) | `1-iDt3Zs6Mz86_kKOO4z8gqfjm2OoQv-wnVKaKkeszA26Je9F9DO_tCkq` | `_LEGACY_PGBOT1M08/` |

## Drive ID

| Объект | ID |
|---|---|
| Мастер-таблица | `16OBo1Enr19SFOuLm2pNy_JagMFppNqXKsYlUbLw_8S0` |
| Папка SKU-копий | `1gDUCk2a9h7z0zfNzAneXJkBtlupCYxy3` |
| Эталон PGBOT1M08 | `1NOO50oa9CWfXzA7AixR7zapj1xzr2e3xhK7lM6Cc3bQ` |

## Локальная структура (clasp)

```
WBSyncLib/                  ← новая Library (WB PULL/PUSH)
_СВЕЖАЯ_ВЕРСИЯ_v3/          ← WBLib legacy + 4ЛК черновики
_BOOTSTRAP_DEPLOY/                  ← bound script копий SKU (1R8RMQ4…)
_BOOTSTRAP_DEPLOY_MASTER_REAL/      ← bound script мастера (1_rwr2crt…)
_BOOTSTRAP_DEPLOY_MASTER_ORPHAN/    ← ORPHAN 1mVmHnt5… — не push
_BOOTSTRAP_DEPLOY_SHAMPOO/  ← образец pre-WBSyncLib
_LEGACY_PGBOT1M08/          ← прототип меню
restore/clone_all.ps1       ← clasp clone × 5
outputs/                    ← bundle + RESTORE_INDEX
docs/                       ← SMOKE, MIGRATION, OZON_DEFERRED
```

## Отменено / не делать

- `26_MigrateCopiesTo4LK.gs` — горизонтальная модель C–F отменена
- Массовая миграция 19 копий из мастера
- Ozon REST до ЧП-5

## Дефекты D1–D11

См. `docs/EXPORT_4LK_CODE_BUNDLE.md`, bundle `outputs/SeoWrapper.gs`, `outputs/27_OzonTemplates.gs`

## Предыстория

`SEO_Pipeline_Спецификация.md`, `RUNBOOK_MASHA_SEO.md`, `HANDOFF_120_SKU.md` в корне проекта.
