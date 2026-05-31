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
