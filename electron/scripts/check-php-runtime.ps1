param(
    [string]$PhpPath = "electron/php"
)

Write-Host "Checking PHP runtime at: $PhpPath"

if (-not (Test-Path $PhpPath)) {
    Write-Error "PHP runtime folder not found: $PhpPath"
    exit 2
}

$phpExe = Join-Path $PhpPath 'php.exe'
if (-not (Test-Path $phpExe)) {
    Write-Error "php.exe not found in $PhpPath"
    Get-ChildItem -Path $PhpPath -Recurse | Select-Object -First 20 | ForEach-Object { Write-Host $_.FullName }
    exit 3
}

$extDir = Join-Path $PhpPath 'ext'
if (-not (Test-Path $extDir)) {
    Write-Error "Extensions folder not found: $extDir"
    exit 4
}

$pdoSqlite = Join-Path $extDir 'php_pdo_sqlite.dll'
$sqlite3 = Join-Path $extDir 'php_sqlite3.dll'

$missing = @()
if (-not (Test-Path $pdoSqlite)) { $missing += 'php_pdo_sqlite.dll' }
if (-not (Test-Path $sqlite3)) { $missing += 'php_sqlite3.dll' }

if ($missing.Count -gt 0) {
    Write-Error "Missing required PHP extensions: $($missing -join ', ')"
    Get-ChildItem -Path $extDir | Select-Object Name | ForEach-Object { Write-Host "Found ext: $($_.Name)" }
    exit 5
}

Write-Host "PHP runtime looks good: php.exe and required sqlite extensions present."
exit 0
