# Sincroniza las partidas si el cliente de League está abierto y, si hay datos nuevos
# y el proyecto es un repo de git con remoto, los sube para que se publique la página.
# Lo ejecuta la tarea programada creada con install-auto-sync.ps1. Deja un log en logs/sync.log.

$ErrorActionPreference = 'Continue'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$root = Split-Path -Parent $PSScriptRoot
$data = Join-Path $root 'public\data\matches.json'
$logDir = Join-Path $root 'logs'
$log = Join-Path $logDir 'sync.log'
New-Item -ItemType Directory -Force $logDir | Out-Null

function Write-Log($msg) {
    "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')  $msg" | Add-Content -Path $log -Encoding utf8
}

# Log acotado: se queda con las últimas 500 líneas.
if ((Test-Path $log) -and (Get-Item $log).Length -gt 200KB) {
    Get-Content $log -Tail 500 | Set-Content $log -Encoding utf8
}

# Sin cliente abierto no se hace nada (ni se escribe al log, para no llenarlo con el PC encendido).
# Con el cliente abierto se registra cada ejecución, haya o no partidas nuevas.
if (-not (Get-Process LeagueClientUx -ErrorAction SilentlyContinue)) { exit 0 }

$node = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $node) { Write-Log 'ERROR: no encontré node en el PATH'; exit 1 }

$before = if (Test-Path $data) { (Get-FileHash $data).Hash } else { '' }
Push-Location $root
try {
    $out = & $node --import tsx scripts/sync.ts --auto 2>&1 | Out-String
    $after = if (Test-Path $data) { (Get-FileHash $data).Hash } else { '' }
    if ($LASTEXITCODE -ne 0) { Write-Log "ERROR en sync:`n$out"; exit 1 }
    if ($before -eq $after) { Write-Log 'Sin partidas nuevas.'; exit 0 }

    Write-Log ($out.Trim() -split "`r?`n" | Select-Object -Last 1)

    $isRepo = (git rev-parse --is-inside-work-tree 2>$null) -eq 'true'
    $hasRemote = $isRepo -and (git remote 2>$null)
    if ($hasRemote) {
        git add public/data/matches.json 2>&1 | Out-Null
        git commit -m "Actualizar partidas" 2>&1 | Out-Null
        $push = git push 2>&1 | Out-String
        if ($LASTEXITCODE -eq 0) { Write-Log 'Subido a GitHub' } else { Write-Log "ERROR en git push:`n$push" }
    }
}
finally {
    Pop-Location
}
