param(
    [ValidateRange(1, 65535)]
    [int]$Port = 3100
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$localKey = [Environment]::GetEnvironmentVariable('3_openrouter', 'User')

if ([string]::IsNullOrWhiteSpace($localKey)) {
    throw "Windows 사용자 환경변수 '3_openrouter'가 비어 있습니다."
}

$previousKey = $env:OPENROUTER_API_KEY
$env:OPENROUTER_API_KEY = $localKey

try {
    Push-Location -LiteralPath $projectRoot
    try {
        & npm.cmd run dev -- --port $Port
        if ($LASTEXITCODE -ne 0) {
            exit $LASTEXITCODE
        }
    }
    finally {
        Pop-Location
    }
}
finally {
    if ($null -eq $previousKey) {
        Remove-Item -LiteralPath 'Env:\OPENROUTER_API_KEY' -ErrorAction SilentlyContinue
    }
    else {
        $env:OPENROUTER_API_KEY = $previousKey
    }
}
