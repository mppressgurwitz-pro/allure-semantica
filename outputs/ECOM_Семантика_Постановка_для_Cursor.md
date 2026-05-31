# ECOM Семантика — постановка для Cursor (предыстория)

Краткая выжимка контекста проекта Quantum Plus / Allure City Inc.

## Бизнес-задача

Автоматизация SEO-пайплайна для маркетплейсов WB и Ozon по ~19 SKU (и далее до 500 карточек на кабинет):

- конкурентный анализ → семантика → черновик SEO → PULL/PUSH в WB
- 4 кабинета: WB Асмус, WB Quantum, Ozon Асмус, Ozon Quantum
- главный ID товара — **внутренний SKU** из прайс-листа, не путать с nmID и артикулами 1С

## Архитектура (текущая)

| Слой | Назначение |
|---|---|
| Google Sheets мастер | Шаблон, реестр, создание копий SKU |
| Google Sheets копии SKU | KeywordsRaw, _Advice_SEO_Draft, будущие 4 SEO-листа |
| WBLib (`_СВЕЖАЯ_ВЕРСИЯ_v3`) | Legacy: импорт, семантика, скoring, copier, INCI |
| WBSyncLib | Новая Library: WB API PULL/PUSH, merge, diagnostics |
| Bootstrap bound scripts | Тонкие обёртки меню в мастере и копиях |

## Принцип миграции

**Не пересоздавать** 19 рабочих копий с конкурентным анализом. Только lazy-миграция по одной копии при открытии Машей.

## Пользователи

- **Маша** — оператор: PULL/PUSH, scopes Library, подпапки SKU
- **Михаил** — заказчик, архитектура, go/no-go на массовые прогоны

## Связанные документы

- `outputs/CURSOR_RESTART_FULL_BRIEF.md` — ТЗ рестарта 2026-05-31
- `outputs/RESTORE_INDEX.md` — статус восстановления
- `docs/SMOKE_CHECKLIST.md` — ЧП-1…ЧП-5
- `SEO_Pipeline_Спецификация.md` — полная спецификация пайплайна
