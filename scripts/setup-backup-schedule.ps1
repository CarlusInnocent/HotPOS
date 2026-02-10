# Setup Scheduled Tasks for HotPOS Database Backup
# Run this script AS ADMINISTRATOR to create the scheduled tasks

$ErrorActionPreference = "Stop"

$scriptPath = "C:\Users\Carlus\Desktop\HotPOS\scripts\backup-database.ps1"
$taskNameMorning = "HotPOS_DB_Backup_Morning"
$taskNameEvening = "HotPOS_DB_Backup_Evening"

# Check if script exists
if (!(Test-Path $scriptPath)) {
    Write-Error "Backup script not found at: $scriptPath"
    exit 1
}

# Create action (run PowerShell with the backup script)
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$scriptPath`""

# Create triggers for 7:30 AM and 10:30 PM daily
$triggerMorning = New-ScheduledTaskTrigger -Daily -At "07:30"
$triggerEvening = New-ScheduledTaskTrigger -Daily -At "22:30"

# Settings: run whether logged in or not, don't stop on battery
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

# Create principal (run with highest privileges)
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType S4U -RunLevel Highest

Write-Host "Creating scheduled tasks for HotPOS database backup..."

try {
    # Remove existing tasks if they exist
    if (Get-ScheduledTask -TaskName $taskNameMorning -ErrorAction SilentlyContinue) {
        Unregister-ScheduledTask -TaskName $taskNameMorning -Confirm:$false
        Write-Host "Removed existing task: $taskNameMorning"
    }
    if (Get-ScheduledTask -TaskName $taskNameEvening -ErrorAction SilentlyContinue) {
        Unregister-ScheduledTask -TaskName $taskNameEvening -Confirm:$false
        Write-Host "Removed existing task: $taskNameEvening"
    }

    # Register morning backup task
    Register-ScheduledTask -TaskName $taskNameMorning -Action $action -Trigger $triggerMorning -Settings $settings -Principal $principal -Description "HotPOS database backup at 7:30 AM"
    Write-Host "Created task: $taskNameMorning (7:30 AM daily)"

    # Register evening backup task
    Register-ScheduledTask -TaskName $taskNameEvening -Action $action -Trigger $triggerEvening -Settings $settings -Principal $principal -Description "HotPOS database backup at 10:30 PM"
    Write-Host "Created task: $taskNameEvening (10:30 PM daily)"

    Write-Host "`nScheduled tasks created successfully!"
    Write-Host "Backups will be saved to: E:\BACKUPS_HotPOS"
    Write-Host "Backups older than 30 days will be automatically deleted."
    Write-Host "`nTo test the backup now, run:"
    Write-Host "  powershell -File `"$scriptPath`""

} catch {
    Write-Error "Failed to create scheduled tasks: $_"
    Write-Host "`nMake sure you are running this script as Administrator."
    exit 1
}
