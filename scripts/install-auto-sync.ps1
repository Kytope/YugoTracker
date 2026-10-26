# Crea (o actualiza) la tarea programada "CaosTracker Sync", que ejecuta auto-sync.ps1
# cada 15 minutos mientras tu sesión de Windows esté iniciada, sin abrir ventanas.
#
#   Instalar:    powershell -ExecutionPolicy Bypass -File scripts/install-auto-sync.ps1
#   Desinstalar: powershell -ExecutionPolicy Bypass -File scripts/install-auto-sync.ps1 -Uninstall

param(
    [switch]$Uninstall,
    [int]$Minutes = 15
)

$name = 'CaosTracker Sync'

if ($Uninstall) {
    Unregister-ScheduledTask -TaskName $name -Confirm:$false -ErrorAction SilentlyContinue
    Write-Host "Tarea '$name' eliminada."
    exit 0
}

$script = Join-Path $PSScriptRoot 'auto-sync.ps1'
$ps = (Get-Command powershell.exe).Source
# conhost --headless ejecuta la consola sin mostrar ninguna ventana (Windows 10 1809+ / 11).
$action = New-ScheduledTaskAction -Execute 'conhost.exe' `
    -Argument "--headless `"$ps`" -NoProfile -NonInteractive -ExecutionPolicy Bypass -File `"$script`"" `
    -WorkingDirectory (Split-Path -Parent $PSScriptRoot)
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) `
    -RepetitionInterval (New-TimeSpan -Minutes $Minutes)
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
    -StartWhenAvailable -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 10)
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited

Register-ScheduledTask -TaskName $name -Action $action -Trigger $trigger -Settings $settings `
    -Principal $principal -Description 'Sincroniza las partidas de ARAM: Caos desde el cliente de League' -Force | Out-Null

Write-Host "Tarea '$name' instalada: corre cada $Minutes minutos. Log en logs\sync.log"
