# PostgreSQL Restore Script for Windows
param([string]$BackupFile)

if (-not $BackupFile) {
    Write-Host "Usage: .\scripts\restore-db.ps1 -BackupFile <path-to-backup.sql>" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $BackupFile)) {
    Write-Host "Error: Backup file '$BackupFile' not found." -ForegroundColor Red
    exit 1
}

Write-Host "Restoring database from: $BackupFile..." -ForegroundColor Cyan
Get-Content $BackupFile | docker exec -i badminton-live-db psql -U badminton -d badminton_live
Write-Host "✅ Database successfully restored!" -ForegroundColor Green
