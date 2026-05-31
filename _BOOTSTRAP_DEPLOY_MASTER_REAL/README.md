# Bound-script мастера (REAL)

**Spreadsheet:** `16OBo1Enr19SFOuLm2pNy_JagMFppNqXKsYlUbLw_8S0`

**scriptId (из URL редактора, подтверждён Михаилом 2026-05-31):**
`1_rwr2crtHI9sT_gykGYfJHnhUGteyZzwbEQnbHm1v7-B07DZxlu_9BRH`

## clasp clone — блокер 2026-05-31

```
clasp login --status  → mppressgurwitz@gmail.com ✓
clasp clone 1_rwr2crt… → Could not find script
```

**clasp list** не показывает bound-проекты (только 5 standalone).

### Что проверить вручную

1. **Script ID из Project Settings**, не из адресной строки браузера:
   Apps Script → ⚙ Project Settings → **Script ID** (скопировать оттуда).
2. **Google Apps Script API ON:** https://script.google.com/home/usersettings
3. **clasp login** с scope «Create and update Google Apps Script projects»:
   `clasp logout` → `clasp login` → отметить оба scope (Drive + Script projects).
4. Экспорт fallback: Apps Script → **File → Make a copy** проекта или скачать `.json` через API вручную.

**Не `clasp push` до ревью diff ORPHAN vs REAL.**

Orphan (мёртвый): `_BOOTSTRAP_DEPLOY_MASTER_ORPHAN/`
