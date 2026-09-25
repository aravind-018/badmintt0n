# PostgreSQL Backup Script for Windows
$backupDir = ".\backups"
if (!(Test-Path $backupDir)) { New-Item -ItemType Directory -Path $backupDir | Out-Null }
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFile = "$backupDir\badminton_live_backup_$timestamp.sql"

Write-Host "Starting PostgreSQL database backup..." -ForegroundColor Cyan
docker exec -t badminton-live-db pg_dump -U badminton -d badminton_live | Out-File -Encoding utf8 $backupFile
Write-Host "✅ Backup created at: $backupFile" -ForegroundColor Green
