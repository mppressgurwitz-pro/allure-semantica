# Smoke / регрессия WBSyncLib (ЧП-1 … ЧП-5)

## ЧП-1 — Deploy Library

```powershell
cd WBSyncLib
git init
git add .
git commit -m "Initial WBSyncLib"
clasp create --type standalone --title WBSyncLib
clasp push
```

Script Properties в WBSyncLib: `WB_API_KEY_ASMUS`, `WB_API_KEY_QUANTUM`.

Обновить `WBSYNC_LIB_SCRIPT_ID` в `_BOOTSTRAP_DEPLOY*` appsscript.json.

## ЧП-2 — Новая тест-копия (НЕ PGBOT1M08)

1. Мастер → **➕ Создать карточку SKU** → тестовый артикул, Quantum.
2. `clasp push` bootstrap в bound script копии (lazy).
3. PULL Асмус → HTTP 200, колонка B заполнена.
4. PUSH Quantum (если карточка в Quantum) → HTTP 200.

## ЧП-3 — Регрессия PGBOT1M08

Spreadsheet `1NOO50oa9CWfXzA7AixR7zapj1xzr2e3xhK7lM6Cc3bQ`

1. Записать baseline: ТНВЭД, декларация, габариты (col B).
2. PULL → PUSH Асмус → HTTP 200.
3. PULL снова — критичные поля не обнулены.
4. `diagnoseVendor` → notFound минимален.

## ЧП-4 — E2E через кнопку

Создать копию Quantum через мастер → реестр SKU → PULL/PUSH.

## ЧП-5 — Lazy migration

Маша: 5/19 копий с новым bootstrap + WBSyncLib → go на 14.

---

**Ozon (ЧП-6):** после ЧП-5 — отдельный план.
