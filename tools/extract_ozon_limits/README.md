# Extract Ozon limits from seller xlsx templates

Распаковывает JSON из листа `configs` (base64, разбит по ячейкам) в 8 шаблонах Ozon.

## Запуск

```powershell
cd tools/extract_ozon_limits
pip install -r requirements.txt
python extract.py --src "C:\Users\mb\OneDrive - Allure City, Inc\ОП_E-COMMERCE\Автоматизация\Шаблоны для SEO-Ozon"
```

Без `--src` используется дефолтный путь OneDrive; если папка не найдена — auto-discover `*SEO-Ozon*`.

## Выход

| Файл | Назначение |
|---|---|
| `ozon_limits.json` | `{категория: {field_id: {limits…}}}` |
| `ozon_limits.csv` | импорт в Google Sheet `_Ozon_Limits` |

CSV колонки: `ozon_category | field_id | field_name_ru | data_type | max_length | is_required | is_collection | allowed_values_count | notes`

## Sanity check (2026-05-31 прогон)

- **xlsx обработано:** 8
- **категорий:** 8 (все ожидаемые)
- **строк CSV:** 327 (≈39 полей/категория + 2 manual SEO rules)
- **размер JSON:** см. `ozon_limits.json` после прогона

Первые строки CSV — см. `ozon_limits.csv` (поля категории «Ароматы для дома», затем остальные).

## Примечания

- Base64 в `configs` **склеивается** из всех длинных ячеек листа (Ozon режет на 32767 симв/ячейку).
- `MaxValue` в JSON часто `null` — для Title/Description добавлены **manual rules** из Техздания SEO OZON (Title 200 симв., HTML в аннотации только br/ul/li).
- **Не** заливает в Google Sheets. **Не** clasp push.

## Лог пропусков

Если xlsx отсутствует или `configs` битый — строка `ERR` / `MISSING` в stdout.
