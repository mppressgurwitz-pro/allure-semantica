# Diff отчёт 27_OzonTemplates.gs v1 → v2

**Дата:** 2026-05-31  
**A (v1):** `_СВЕЖАЯ_ВЕРСИЯ_v3/27_OzonTemplates.gs` — clasp pull с сервера WBLib  
**B (v2):** `outputs/27_OzonTemplates.gs` — bundle после рестарта

## git diff --stat

```
1 file changed, 11 insertions(+), 1 deletion(-)
```

## Важно: v2 **ещё не реализован**

Файл B — это v1 **+ комментарии-напоминания** о дефектах D2/D3/D4. Исполняемый код **идентичен** v1. Настоящая v2 (Drive folder ID, searchFiles, без fallback) — **ещё не написана**.

## Что изменилось — высокий уровень

| Дефект | Статус в outputs/ | Как должно быть в настоящей v2 |
|---|---|---|
| **D2** хардкод `27.05.2026` в FILES | ❌ NOT FIXED | `resolveTemplateFileOnDrive_(ozonCategory)` через `DriveApp.searchFiles` |
| **D3** LOCAL_PATH `C:\...` | ❌ NOT FIXED | `OZON_TEMPLATES.DRIVE_FOLDER_ID` + Script Property |
| **D4** fallback `'Косметика для ухода'` | ❌ NOT FIXED | `Ui.alert` + throw, без default |
| 4-листная модель в `applyOzonTemplateConfigToCopy_` | ❌ NOT FIXED | читать `CATEGORY_WB` из `_Config`, не из `_Advice_SEO_Draft` |

## Diff по строкам (единственные отличия)

1. Добавлен блок комментариев в начале файла (дефекты D2–D4).
2. В `resolveOzonTemplateForWbCategory_` — комментарий `// D4: убрать fallback` (код fallback **остался**).
3. Удалён JSDoc `/** Вызывается из migrateCopyTo4LK … */` перед `applyOzonTemplateConfigToCopy_`.

## Что осталось как было

- Маппинг `WB_TO_OZON` (15 категорий WB)
- Словарь `FILES` с датами 27.05.2026
- `LOCAL_PATH` Windows OneDrive
- Структура листа `_Ozon_Template_Map`
- `showOzonExportHintDialog` — ссылки на колонки E/F legacy `_Advice_SEO_Draft`

## Зависимости перед заливкой настоящей v2

- Script Property `OZON_TEMPLATES_DRIVE_FOLDER_ID` в WBLib
- Папка xlsx Ozon на Google Drive (не OneDrive C:\)
- В копии SKU: лист `_Config` с `CATEGORY_WB` (4-листная модель)
- `MimeType.MICROSOFT_EXCEL`, `DriveApp.getFolderById` — стандартные API

## Риски при заливке

- Без `OZON_TEMPLATES_DRIVE_FOLDER_ID` — падение `setupOzonTemplateMapSheet` / `resolveOzonTemplateForWbCategory_` (лучше, чем молчаливый fallback на «Косметика для ухода»).
- Пока v2 не написана — **заливать outputs/ как есть бессмысленно**.

## Когда заливать

**НЕ СЕЙЧАС.** После ЧП-5, на Ozon-фазе. Сначала написать настоящую v2, прогнать на тестовой копии.

## Patch

См. `diff_v1_to_v2.patch` (комментарии-only diff).
