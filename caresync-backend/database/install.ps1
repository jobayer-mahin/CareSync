# CareSync HMS — Windows database setup for MySQL / MariaDB
# Requires the mysql client to be available on PATH.
#
# Usage:
#   .\install.ps1
# Optional:
#   .\install.ps1 -DbHost localhost -Port 3306 -User root -Password ""

param(
    [string]$DbHost = "localhost",
    [int]$Port = 3306,
    [string]$User = "root",
    [string]$Password = ""
)

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

function Invoke-MySqlFile {
    param(
        [string]$Database,
        [string]$FilePath
    )

    $sql = Get-Content -Raw -Path $FilePath

    if ([string]::IsNullOrEmpty($Password)) {
        $sql | & mysql -h $DbHost -P $Port -u $User --default-character-set=utf8mb4 $Database
    } else {
        $sql | & mysql -h $DbHost -P $Port -u $User "-p$Password" --default-character-set=utf8mb4 $Database
    }

    if ($LASTEXITCODE -ne 0) {
        throw "mysql failed while executing $FilePath (exit code $LASTEXITCODE)."
    }
}

Write-Host "Creating database..."
Invoke-MySqlFile "" "$scriptDir\00_create_database.sql"

Write-Host "Creating schema..."
Invoke-MySqlFile "caresync_hms_db" "$scriptDir\01_schema.sql"

Write-Host "Seeding data..."
Invoke-MySqlFile "caresync_hms_db" "$scriptDir\02_seed_data.sql"

Write-Host "Database setup complete."
