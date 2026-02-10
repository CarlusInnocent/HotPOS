# HotPOS Database Backup Script
# Backs up hotpos_db to E:\BACKUPS_HotPOS
# Deletes backups older than 30 days

$ErrorActionPreference = "Stop"

# Configuration
$pgHost = "localhost"
$pgPort = "5432"
$pgDatabase = "hotpos_db"
$pgUser = "postgres"
$backupDir = "E:\BACKUPS_HotPOS"
$retentionDays = 30

# Set password in environment variable for pg_dump
$env:PGPASSWORD = "Jane2003"

# Create backup directory if it doesn't exist
if (!(Test-Path -Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
    Write-Host "Created backup directory: $backupDir"
}

# Generate timestamp for backup filename
$timestamp = Get-Date -Format "yyyy-MM-dd_HHmmss"
$backupFile = Join-Path $backupDir "hotpos_db_$timestamp.sql"

# Find pg_dump executable (check common paths)
$pgDumpPaths = @(
    "C:\Program Files\PostgreSQL\18\bin\pg_dump.exe",
    "C:\Program Files\PostgreSQL\17\bin\pg_dump.exe",
    "C:\Program Files\PostgreSQL\16\bin\pg_dump.exe",
    "C:\Program Files\PostgreSQL\15\bin\pg_dump.exe",
    "C:\Program Files\PostgreSQL\14\bin\pg_dump.exe",
    "C:\Program Files\PostgreSQL\13\bin\pg_dump.exe",
    "pg_dump.exe"  # If in PATH
)

$pgDump = $null
foreach ($path in $pgDumpPaths) {
    if (Test-Path $path) {
        $pgDump = $path
        break
    }
    if (Get-Command $path -ErrorAction SilentlyContinue) {
        $pgDump = $path
        break
    }
}

if (-not $pgDump) {
    Write-Error "pg_dump not found. Please ensure PostgreSQL is installed and pg_dump is in PATH."
    exit 1
}

Write-Host "Starting backup of $pgDatabase at $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')..."
Write-Host "Using pg_dump: $pgDump"

try {
    # Perform backup
    & $pgDump -h $pgHost -p $pgPort -U $pgUser -d $pgDatabase -F p -f $backupFile
    
    if ($LASTEXITCODE -eq 0) {
        $fileSize = (Get-Item $backupFile).Length / 1MB
        Write-Host "Backup completed successfully!"
        Write-Host "File: $backupFile"
        Write-Host "Size: $([math]::Round($fileSize, 2)) MB"
    } else {
        Write-Error "Backup failed with exit code $LASTEXITCODE"
        exit 1
    }
} catch {
    Write-Error "Backup failed: $_"
    exit 1
} finally {
    # Clear password from environment
    $env:PGPASSWORD = $null
}

# Delete old backups
Write-Host "`nCleaning up backups older than $retentionDays days..."
$cutoffDate = (Get-Date).AddDays(-$retentionDays)
$oldBackups = Get-ChildItem -Path $backupDir -Filter "hotpos_db_*.sql" | 
    Where-Object { $_.LastWriteTime -lt $cutoffDate }

if ($oldBackups.Count -gt 0) {
    foreach ($file in $oldBackups) {
        Remove-Item $file.FullName -Force
        Write-Host "Deleted: $($file.Name)"
    }
    Write-Host "Removed $($oldBackups.Count) old backup(s)"
} else {
    Write-Host "No old backups to remove"
}

Write-Host "`nBackup process completed at $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
