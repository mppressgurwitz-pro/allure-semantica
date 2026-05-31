# clasp clone × 5 — БЕЗ push. Запуск из корня проекта.
# 2026-05-31 restore session

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

Write-Host "=== clasp clone restore ===" -ForegroundColor Cyan
Write-Host "Root: $root"
Write-Host "clasp: $(clasp --version)"
clasp login --status

$projects = @(
    @{ Name = "WBSyncLib"; Id = "1BE9YkOsfu9FsYDyHHTdvtHnCXTa8TXpf46EIMMRNSMRI06dn0cK5hvd2" },
    @{ Name = "_СВЕЖАЯ_ВЕРСИЯ_v3"; Id = "1UPClgAghLSdKjey8NbCEwZI7_pJ1cVEUIHSKTSotOgzK5rl1ibxwt0qO" },
    @{ Name = "_BOOTSTRAP_DEPLOY"; Id = "1R8RMQ4sR93SIcTsuEiXHrcxdrnTn1c1bl6-ulHVswFsQn4o1MTXhXEOH" },
    @{ Name = "_BOOTSTRAP_DEPLOY_MASTER"; Id = "1mVmHnt5pTRekk9C3lNwTewMkmcLA508BEsys2YVRb5oZkjeTII0NymgU" },
    @{ Name = "_LEGACY_PGBOT1M08"; Id = "1-iDt3Zs6Mz86_kKOO4z8gqfjm2OoQv-wnVKaKkeszA26Je9F9DO_tCkq" }
)

foreach ($p in $projects) {
    Write-Host "`n--- $($p.Name) ---" -ForegroundColor Yellow
    if (-not (Test-Path $p.Name)) {
        New-Item -ItemType Directory -Path $p.Name | Out-Null
    }
    Push-Location $p.Name
    try {
        clasp clone $p.Id
    } finally {
        Pop-Location
    }
}

# Опционально: образец SH0001 до миграции
$shampoo = "_BOOTSTRAP_DEPLOY_SHAMPOO"
$shampooId = "1aydrFR5fXndpdq0RBy6krrqQ4BeEQmRcrhvMrKHkXdU5r_OlGoQNDquf"
Write-Host "`n--- $shampoo (reference) ---" -ForegroundColor Yellow
if (-not (Test-Path $shampoo)) {
    New-Item -ItemType Directory -Path $shampoo | Out-Null
}
Push-Location $shampoo
try {
    clasp clone $shampooId
} finally {
    Pop-Location
}

Write-Host "`n=== DONE - NO PUSH ===" -ForegroundColor Green
