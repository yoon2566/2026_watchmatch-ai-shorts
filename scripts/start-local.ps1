param(
    [ValidateRange(1, 65535)]
    [int]$Port = 3100
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot

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
