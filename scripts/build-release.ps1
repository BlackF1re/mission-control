param(
    [string]$SourceRoot = (Join-Path $PSScriptRoot "..\\router-export"),
    [string]$DistRoot = (Join-Path $PSScriptRoot "..\\dist"),
    [string]$RepoOwner = "BlackF1re",
    [string]$RepoName = "mission-control",
    [string]$Version
)

$ErrorActionPreference = "Stop"

function Write-Utf8NoBom {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][string]$Content
    )

    $encoding = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($Path, $Content, $encoding)
}

function Normalize-LineEndingsLf {
    param(
        [Parameter(Mandatory = $true)][string]$Content
    )

    return $Content.Replace("`r`n", "`n").Replace("`r", "`n")
}

function Get-Sha256 {
    param([Parameter(Mandatory = $true)][string]$Path)

    return (Get-FileHash -Algorithm SHA256 -Path $Path).Hash.ToLowerInvariant()
}

function Test-SemVer {
    param([Parameter(Mandatory = $true)][string]$Value)

    return $Value -match '^\d+\.\d+\.\d+$'
}

$uiSource = Join-Path $SourceRoot "ui"
$bridgeSource = Join-Path $uiSource "bridge\\mission_control_bridge.cgi"
$releaseTemplate = Join-Path $PSScriptRoot "install.sh.template"

if (-not (Test-Path $uiSource)) {
    throw "Missing UI source: $uiSource"
}

if (-not (Test-Path $bridgeSource)) {
    throw "Missing bridge source: $bridgeSource"
}

if (-not (Test-Path $releaseTemplate)) {
    throw "Missing installer template: $releaseTemplate"
}

if (-not $Version) {
    $bridgeText = Get-Content -Raw -Encoding UTF8 -Path $bridgeSource
    $match = [regex]::Match($bridgeText, 'MISSION_CONTROL_VERSION="([^"]+)"')
    if (-not $match.Success) {
        throw "Unable to detect Mission Control version from $bridgeSource"
    }
    $Version = $match.Groups[1].Value
}

if (-not (Test-SemVer -Value $Version)) {
    throw "Mission Control version must use semantic versioning X.Y.Z. Current value: $Version"
}

$tag = "v$Version"
$releaseBase = "https://github.com/$RepoOwner/$RepoName/releases/download/$tag"

if (Test-Path $DistRoot) {
    Remove-Item -Recurse -Force $DistRoot
}

$null = New-Item -ItemType Directory -Force -Path $DistRoot
$uiStage = Join-Path $DistRoot "ui"
$null = New-Item -ItemType Directory -Force -Path $uiStage

$uiFiles = @(
    "index.html",
    "mission_control.css",
    "mission_control_app.js",
    "mission_control_backend.js",
    "mission_control_bootstrap.js",
    "mission_control_mihomo_backend.js",
    "mission_control_mock_backend.js"
)

foreach ($file in $uiFiles) {
    $sourcePath = Join-Path $uiSource $file
    if (-not (Test-Path $sourcePath)) {
        throw "Missing UI file: $sourcePath"
    }
    $targetPath = Join-Path $uiStage $file
    $content = Get-Content -Raw -Encoding UTF8 -Path $sourcePath
    $content = Normalize-LineEndingsLf -Content $content
    $content = $content.Replace("__MISSION_CONTROL_VERSION__", $Version)
    Write-Utf8NoBom -Path $targetPath -Content $content
}

$uiReleasePath = Join-Path $uiStage "mission_control_release.json"
$uiReleaseJson = @{
    version = $Version
    name = "Mission Control"
    channel = "stable"
} | ConvertTo-Json -Depth 3
Write-Utf8NoBom -Path $uiReleasePath -Content $uiReleaseJson

$uiZipPath = Join-Path $DistRoot "mission-control-ui.zip"
Compress-Archive -Path (Join-Path $uiStage "*") -DestinationPath $uiZipPath -Force

$bridgeAssetPath = Join-Path $DistRoot "mission-control-bridge.cgi"
$bridgeContent = Get-Content -Raw -Encoding UTF8 -Path $bridgeSource
$bridgeContent = Normalize-LineEndingsLf -Content $bridgeContent
$bridgeContent = [regex]::Replace($bridgeContent, 'MISSION_CONTROL_VERSION="[^"]+"', "MISSION_CONTROL_VERSION=""$Version""", 1)
Write-Utf8NoBom -Path $bridgeAssetPath -Content $bridgeContent

$installScriptContent = Get-Content -Raw -Encoding UTF8 -Path $releaseTemplate
$installScriptContent = Normalize-LineEndingsLf -Content $installScriptContent
$installScriptContent = $installScriptContent.Replace("__REPO_OWNER__", $RepoOwner).Replace("__REPO_NAME__", $RepoName)
$installScriptPath = Join-Path $DistRoot "install.sh"
Write-Utf8NoBom -Path $installScriptPath -Content $installScriptContent

$manifestPath = Join-Path $DistRoot "mission-control-manifest.json"
$uiSha = Get-Sha256 -Path $uiZipPath
$bridgeSha = Get-Sha256 -Path $bridgeAssetPath
$installSha = Get-Sha256 -Path $installScriptPath

$manifest = [ordered]@{
    version = $Version
    tag = $tag
    repository = [ordered]@{
        owner = $RepoOwner
        name = $RepoName
    }
    ui = [ordered]@{
        version = $Version
        url = "$releaseBase/mission-control-ui.zip"
        sha256 = $uiSha
    }
    bridge = [ordered]@{
        version = $Version
        url = "$releaseBase/mission-control-bridge.cgi"
        sha256 = $bridgeSha
    }
    installer = [ordered]@{
        url = "$releaseBase/install.sh"
        sha256 = $installSha
    }
}

$manifestJson = $manifest | ConvertTo-Json -Depth 6
Write-Utf8NoBom -Path $manifestPath -Content $manifestJson

Write-Host "Mission Control release assets created in: $DistRoot"
Write-Host "Version: $Version"
Write-Host "Tag: $tag"
