# VERIFICATION_2026-05-30

> Сгенерировано Cursor при внедрении WBSyncLib. **Перед clasp push** сверьте id и кол-во копий вручную.

## Script IDs (из ТЗ — верифицировать через `.clasp.json`)

| Проект | scriptId | Локальная папка |
|--------|----------|-----------------|
| WBLib (WBConkAnalysisLib) | `1UPClgAghLSdKjey8NbCEwZI7_pJ1cVEUIHSKTSotOgzK5rl1ibxwt0qO` | `_СВЕЖАЯ_ВЕРСИЯ_v3\` |
| Bootstrap копий | `1R8RMQ4sR93SIcTsuEiXHrcxdrnTn1c1bl6-ulHVswFsQn4o1MTXhXEOH` | `_BOOTSTRAP_DEPLOY\` |
| Bootstrap мастера | `1mVmHnt5pTRekk9C3lNwTewMkmcLA508BEsys2YVRb5oZkjeTII0NymgU` | `_BOOTSTRAP_DEPLOY_MASTER\` |
| Прототип PGBOT1M08 | `1-iDt3Zs6Mz86_kKOO4z8gqfjm2OoQv-wnVKaKkeszA26Je9F9DO_tCkq` | `Apps_Script_Меню_копии_B.gs` |
| **WBSyncLib** | `1BE9YkOsfu9FsYDyHHTdvtHnCXTa8TXpf46EIMMRNSMRI06dn0cK5hvd2` | `WBSyncLib\` |

## Drive IDs

| Ресурс | ID |
|--------|-----|
| Корень «Еком автоматизация» | `1Q65aq4M3YvN4brrKkzyNBTC4irvxLOJf` |
| Мастер-таблица | `16OBo1Enr19SFOuLm2pNy_JagMFppNqXKsYlUbLw_8S0` |
| Результаты по семантике | `1gDUCk2a9h7z0zfNzAneXJkBtlupCYxy3` |
| Rules_Master | `18qij91xjmJZXHb96dohOFLGCfbCYMxXxFbwV_3XSRzA` |
| Etiquettes_Master | `1Vc5N-nZMSm_aVW2SQ7wu5HhFAk8fbrArPwmL7jEcFSY` |

## Эталон регрессии (не трогать до ЧП-3)

| Поле | Значение |
|------|----------|
| vendorCode | PGBOT1M08 |
| nmID | 891058906 |
| Spreadsheet | `1NOO50oa9CWfXzA7AixR7zapj1xzr2e3xhK7lM6Cc3bQ` |
| Кабинет | Асмус (iid 30164668) |

## Чеклист верификации

- [ ] `clasp --version` → 2.4.2
- [ ] Папка `1gDUCk2a…` — фактическое число копий (ожидание ~19, возможно больше)
- [ ] GET `content/v2/get/cards/list` с ключами Асмус / Quantum → HTTP 200
- [ ] xlsx `Мастер_шаблон_правка_2026-05-19.xlsx` — свежесть `_WB_Char_Dict`
- [ ] Backfill реестра: меню мастера → «Backfill реестра SKU» (dry-run)

## SKU-копии (заполнить после backfill)

| vendorCode | spreadsheetId | bound scriptId | B1 cabinet | status |
|------------|---------------|------------------|------------|--------|
| SH0001 | 169nzFXp4bjcHlQuDusGgiNpOsMVulNaRUERUI2jxwkQ | 1aydrFR5f… | ? | legacy |
| SH002 | 1o_IHMK5EBhH-QjY3wwGSJq2LwifLmS6zDZl2WN6kQ_U | ? | ? | legacy |
| PGBOT1M08 | 1NOO50oa9CWfXzA7AixR7zapj1xzr2e3xhK7lM6Cc3bQ | 1-iDt3Zs6… | Asmus | **regression only** |
| … | | | | |

## Известные расхождения

- «Туалетная вода» (PGEDT10050) — нет в `_WB_Char_Dict`; fallback → «Парфюмерная вода»
- WBSyncLib `CHAR_DICT`: читается из листа копии или `CHAR_DICT_SPREADSHEET_ID`
