# Create 4TAB test layout spreadsheet

Одноразовый standalone Apps Script для эталонного spreadsheet «7 листов» (промпт C).

## Не подключать WBLib / WBSyncLib

Это **шаблон разметки**, не рабочая SKU-копия.

## Шаги (Михаил или Маша)

```powershell
cd tools/create_4tab_template
clasp create --type standalone --title "Create4TabTemplate" --rootDir .
# clasp push   ← только после review, НЕ в WBSyncLib/WBLib
```

1. Открыть script.google.com → проект Create4TabTemplate
2. Run `createTemplateSpreadsheet`
3. Разрешить Drive/Sheets scopes
4. URL spreadsheet появится в alert + Logger

**Папка:** `1gDUCk2a9h7z0zfNzAneXJkBtlupCYxy3` (Результаты по семантике)  
**Имя файла:** `ШАБЛОН 4TAB — Test Layout 2026-05-31`  
**Share:** mkostuhina24@gmail.com (Editor) — автоматически в коде

## Листы

| Лист | Зоны |
|---|---|
| `_Config` | key/value, скрыт |
| `_Common` | общие поля карточки |
| `SEO_WB_Asmus` | шапка / PULL / PUSH / семантика |
| `SEO_WB_Quantum` | клон WB Quantum |
| `SEO_OZON_Asmus` | Ozon лимиты в A8 `<TBD из _Ozon_Limits>` |
| `SEO_OZON_Quantum` | клон Ozon Quantum |
| `KeywordsRaw` | placeholder |

## Screenshots

После создания — PrtScr каждого SEO-листа → `tools/create_4tab_template/screenshots/` (вручную).

## Стоп-лист

- Не копировать из мастера или 19 SKU
- Не clasp push в WBLib/WBSyncLib
- Удаление тестового файла — решение Михаила
