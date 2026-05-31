# WBSyncLib — Standalone Library для WB PULL/PUSH

## Deploy

**scriptId:** `1BE9YkOsfu9FsYDyHHTdvtHnCXTa8TXpf46EIMMRNSMRI06dn0cK5hvd2`  
**Editor:** https://script.google.com/d/1BE9YkOsfu9FsYDyHHTdvtHnCXTa8TXpf46EIMMRNSMRI06dn0cK5hvd2/edit

```powershell
cd "...\WBSyncLib"
clasp push
```

После первого deploy задайте Script Properties в редакторе WBSyncLib (см. таблицу ниже).  
`WBSYNC_LIB_SCRIPT_ID` уже прописан в `_BOOTSTRAP_DEPLOY*` appsscript.json.

## Script Properties (только в проекте WBSyncLib)

| Key | Описание |
|-----|----------|
| `WB_API_KEY_ASMUS` | JWT кабинет Асмус (exp 2027-01-24) |
| `WB_API_KEY_QUANTUM` | JWT кабинет Quantum |
| `CHAR_DICT_SPREADSHEET_ID` | (опц.) Spreadsheet с листом `_WB_Char_Dict` |

Ключи **не** коммитить в git.

## Публичный API

- `pullFromAsmus(spreadsheet)`
- `pullFromQuantum(spreadsheet)`
- `pushToAsmus(spreadsheet)` — требует B1=Asmus
- `pushToQuantum(spreadsheet)` — требует B1=Quantum
- `transferSeoToTechBlock`, `clearNewValues`, `diagnoseVendor`, `fixVendorCode`

## PUSH scope

Title + Описание + SEO-характеристики категории (из `_WB_Char_Dict`) + базовые поля карточки. Всегда GET → merge → PUT.
