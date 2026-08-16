param(
    [ValidateRange(1, 65535)]
    [int]$Port = 3100
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$watchmodeKey = [Environment]::GetEnvironmentVariable('WATCHMODE_API_KEY', 'Process')

if ([string]::IsNullOrWhiteSpace($watchmodeKey)) {
    $watchmodeKey = [Environment]::GetEnvironmentVariable('4_WATCHMODE_API_KEY', 'Process')
}

if ([string]::IsNullOrWhiteSpace($watchmodeKey)) {
    $watchmodeKey = [Environment]::GetEnvironmentVariable('WATCHMODE_API_KEY', 'User')
}

if ([string]::IsNullOrWhiteSpace($watchmodeKey)) {
    $watchmodeKey = [Environment]::GetEnvironmentVariable('4_WATCHMODE_API_KEY', 'User')
}

if ([string]::IsNullOrWhiteSpace($watchmodeKey)) {
    throw 'Windows 사용자 환경 변수 WATCHMODE_API_KEY 또는 4_WATCHMODE_API_KEY가 설정되지 않았습니다.'
}

$previousWatchmodeKey = [Environment]::GetEnvironmentVariable('WATCHMODE_API_KEY', 'Process')
$env:WATCHMODE_API_KEY = $watchmodeKey

Push-Location -LiteralPath $projectRoot
try {
    & npm.cmd run dev -- --port $Port
    if ($LASTEXITCODE -ne 0) {
        exit $LASTEXITCODE
    }
}
finally {
    Pop-Location
    [Environment]::SetEnvironmentVariable('WATCHMODE_API_KEY', $previousWatchmodeKey, 'Process')
    $watchmodeKey = $null
}
