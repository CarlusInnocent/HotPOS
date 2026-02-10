# HotPOS Server Mode Configuration Script
# Run this script AS ADMINISTRATOR to configure the PC as a server
# Prevents sleep, hibernate, and network disconnection during inactivity

$ErrorActionPreference = "Stop"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  HotPOS Server Mode Configuration" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "ERROR: This script must be run as Administrator!" -ForegroundColor Red
    Write-Host "Right-click PowerShell and select 'Run as administrator'" -ForegroundColor Yellow
    pause
    exit 1
}

Write-Host "1. Configuring Power Settings..." -ForegroundColor Yellow

# Disable sleep mode (set to Never = 0)
powercfg /change standby-timeout-ac 0
Write-Host "   - Sleep mode: DISABLED" -ForegroundColor Green

# Disable hibernate
powercfg /change hibernate-timeout-ac 0
powercfg /hibernate off
Write-Host "   - Hibernate: DISABLED" -ForegroundColor Green

# Allow monitor to turn off after 15 minutes (saves energy, doesn't affect server)
powercfg /change monitor-timeout-ac 15
Write-Host "   - Monitor timeout: 15 minutes" -ForegroundColor Green

# Disable USB selective suspend (important for USB network adapters)
powercfg /SETACVALUEINDEX SCHEME_CURRENT 2a737441-1930-4402-8d77-b2bebba308a3 48e6b7a6-50f5-4782-a5d4-53bb8f07e226 0
Write-Host "   - USB selective suspend: DISABLED" -ForegroundColor Green

# Disable hard disk timeout
powercfg /change disk-timeout-ac 0
Write-Host "   - Hard disk sleep: DISABLED" -ForegroundColor Green

# Apply changes
powercfg /SETACTIVE SCHEME_CURRENT
Write-Host "   - Power plan activated" -ForegroundColor Green

Write-Host ""
Write-Host "2. Configuring Network Adapter Power Management..." -ForegroundColor Yellow

# Disable "Allow the computer to turn off this device to save power" for all network adapters
$networkAdapters = Get-NetAdapter | Where-Object { $_.Status -eq 'Up' }
foreach ($adapter in $networkAdapters) {
    try {
        # Find the PnP device
        $pnpDevice = Get-PnpDevice -FriendlyName "*$($adapter.InterfaceDescription)*" -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($pnpDevice) {
            # Disable power management via registry
            $instanceId = $pnpDevice.InstanceId -replace '\\', '\\'
            $regPath = "HKLM:\SYSTEM\CurrentControlSet\Enum\$($pnpDevice.InstanceId)\Device Parameters"
            
            # Try common network adapter power management registry keys
            $netRegPath = "HKLM:\SYSTEM\CurrentControlSet\Control\Class\{4d36e972-e325-11ce-bfc1-08002be10318}"
            $adaptersInReg = Get-ChildItem $netRegPath -ErrorAction SilentlyContinue | Where-Object { 
                (Get-ItemProperty $_.PSPath -ErrorAction SilentlyContinue).DriverDesc -like "*$($adapter.InterfaceDescription)*" 
            }
            
            foreach ($regAdapter in $adaptersInReg) {
                # PnPCapabilities: 24 = disable power management, 0 = enable
                Set-ItemProperty -Path $regAdapter.PSPath -Name "PnPCapabilities" -Value 24 -Type DWord -ErrorAction SilentlyContinue
            }
            
            Write-Host "   - $($adapter.Name): Power management DISABLED" -ForegroundColor Green
        }
    } catch {
        Write-Host "   - $($adapter.Name): Could not configure (may need manual setup)" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "3. Configuring Windows Services..." -ForegroundColor Yellow

# Enable and start Windows Remote Management (for remote access)
try {
    Set-Service -Name WinRM -StartupType Automatic -ErrorAction SilentlyContinue
    Start-Service -Name WinRM -ErrorAction SilentlyContinue
    Write-Host "   - Windows Remote Management: ENABLED" -ForegroundColor Green
} catch {
    Write-Host "   - Windows Remote Management: Could not configure" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "4. Configuring Additional Settings..." -ForegroundColor Yellow

# Disable Fast Startup (can cause issues with servers)
$regPath = "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Power"
Set-ItemProperty -Path $regPath -Name "HiberbootEnabled" -Value 0 -ErrorAction SilentlyContinue
Write-Host "   - Fast Startup: DISABLED (prevents boot issues)" -ForegroundColor Green

# Keep network connection during sleep (if sleep were ever re-enabled)
$regPath = "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Power"
if (Test-Path $regPath) {
    Set-ItemProperty -Path $regPath -Name "CsEnabled" -Value 0 -ErrorAction SilentlyContinue
}
Write-Host "   - Connected Standby: DISABLED" -ForegroundColor Green

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Configuration Complete!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Your PC is now configured as a server:" -ForegroundColor White
Write-Host "  - Will NEVER sleep or hibernate" -ForegroundColor White
Write-Host "  - Network stays connected at all times" -ForegroundColor White
Write-Host "  - USB devices stay powered" -ForegroundColor White
Write-Host "  - Hard disk stays active" -ForegroundColor White
Write-Host "  - Monitor turns off after 15 min (saves energy)" -ForegroundColor White
Write-Host ""
Write-Host "NOTE: A restart is recommended for all changes to take effect." -ForegroundColor Yellow
Write-Host ""

$restart = Read-Host "Would you like to restart now? (y/n)"
if ($restart -eq 'y' -or $restart -eq 'Y') {
    Write-Host "Restarting in 10 seconds... Press Ctrl+C to cancel." -ForegroundColor Yellow
    Start-Sleep -Seconds 10
    Restart-Computer -Force
} else {
    Write-Host "Please restart your computer when convenient." -ForegroundColor Yellow
}
