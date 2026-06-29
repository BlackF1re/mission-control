param(
    [string]$Router = "root@router",
    [string]$ExportRoot = (Join-Path $PSScriptRoot "..\\router-export")
)

$ErrorActionPreference = "Stop"

$uiDir = Join-Path $ExportRoot "ui"
$bridgeDir = Join-Path $uiDir "bridge"
$cgiDir = Join-Path $ExportRoot "cgi-bin"

New-Item -ItemType Directory -Force -Path $bridgeDir | Out-Null
New-Item -ItemType Directory -Force -Path $cgiDir | Out-Null

$bridgeRemoteCandidates = @(
    "/usr/libexec/mission-control/mission_control_bridge.cgi",
    "/etc/nikki/run/ui/bridge/mission_control_bridge.cgi"
)

$bridgeRemote = $null
foreach ($candidate in $bridgeRemoteCandidates) {
    ssh $Router "test -f $candidate" 2>$null
    if ($LASTEXITCODE -eq 0) {
        $bridgeRemote = $candidate
        break
    }
}

if (-not $bridgeRemote) {
    throw "Unable to find Mission Control bridge on router $Router"
}

$files = @(
    @{ Remote = "/etc/nikki/run/ui/index.html"; Local = (Join-Path $uiDir "index.html") }
    @{ Remote = "/etc/nikki/run/ui/mission_control.css"; Local = (Join-Path $uiDir "mission_control.css") }
    @{ Remote = "/etc/nikki/run/ui/mission_control_app.js"; Local = (Join-Path $uiDir "mission_control_app.js") }
    @{ Remote = "/etc/nikki/run/ui/mission_control_backend.js"; Local = (Join-Path $uiDir "mission_control_backend.js") }
    @{ Remote = "/etc/nikki/run/ui/mission_control_bootstrap.js"; Local = (Join-Path $uiDir "mission_control_bootstrap.js") }
    @{ Remote = "/etc/nikki/run/ui/mission_control_mihomo_backend.js"; Local = (Join-Path $uiDir "mission_control_mihomo_backend.js") }
    @{ Remote = "/etc/nikki/run/ui/mission_control_mock_backend.js"; Local = (Join-Path $uiDir "mission_control_mock_backend.js") }
    @{ Remote = "/etc/nikki/run/ui/mission_control_release.json"; Local = (Join-Path $uiDir "mission_control_release.json") }
    @{ Remote = $bridgeRemote; Local = (Join-Path $bridgeDir "mission_control_bridge.cgi") }
    @{ Remote = "/www/cgi-bin/mission-control-bridge"; Local = (Join-Path $cgiDir "mission-control-bridge") }
)

foreach ($file in $files) {
    scp "${Router}:$($file.Remote)" $file.Local
}
