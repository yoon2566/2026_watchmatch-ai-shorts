param(
    [Parameter(Mandatory = $true)]
    [string]$RunDirectory,
    [string]$StartSlug = '',
    [int]$MaximumWorks = 0
)

$ErrorActionPreference = 'Stop'
$resolvedRun = (Resolve-Path -LiteralPath $RunDirectory).Path
$manifestPath = Join-Path $resolvedRun 'batch-manifest.json'
$manifest = Get-Content -LiteralPath $manifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
$invokeBatch = Join-Path $PSScriptRoot 'Invoke-MovieBatch.ps1'
$renderWork = Join-Path $PSScriptRoot 'Render-MovieWork.ps1'
$verifyBatch = Join-Path $PSScriptRoot 'Verify-MovieBatch.ps1'
$started = [string]::IsNullOrWhiteSpace($StartSlug)
$completedThisRun = 0

foreach ($work in @($manifest.works)) {
    if (-not $started) {
        if ($work.slug -eq $StartSlug) { $started = $true } else { continue }
    }
    if ($MaximumWorks -gt 0 -and $completedThisRun -ge $MaximumWorks) { break }

    $workDirectory = Join-Path $resolvedRun $work.slug
    $finalPath = Join-Path $workDirectory "final\$($work.slug)_watchmatch_30s.mp4"
    if (Test-Path -LiteralPath $finalPath -PathType Leaf) {
        Write-Host "SKIP COMPLETE $($work.slug)"
        continue
    }

    $missingScenes = 0
    foreach ($scene in 1..5) {
        $sceneNumber = '{0:D2}' -f $scene
        $clipPath = Join-Path $workDirectory "clips\scene_${sceneNumber}_grok.mp4"
        $imagePath = Join-Path $workDirectory "images\scene_${sceneNumber}_source.jpg"
        if (-not ((Test-Path -LiteralPath $clipPath -PathType Leaf) -and (Test-Path -LiteralPath $imagePath -PathType Leaf))) {
            $missingScenes += 1
        }
    }

    if ($missingScenes -gt 0) {
        Write-Host "START $($work.slug) missingScenes=$missingScenes"
        & $invokeBatch -RunDirectory $resolvedRun -StartSlug $work.slug -MaximumScenes $missingScenes
        if ($LASTEXITCODE -ne 0) { throw "Generation stopped at $($work.slug)" }
    }

    & $renderWork -RunDirectory $resolvedRun -Slug $work.slug
    if ($LASTEXITCODE -ne 0) { throw "Render stopped at $($work.slug)" }
    & $verifyBatch -RunDirectory $resolvedRun
    if ($LASTEXITCODE -ne 0) { throw "Verification stopped at $($work.slug)" }

    $report = Get-Content -LiteralPath (Join-Path $resolvedRun 'batch-validation-report.json') -Raw -Encoding UTF8 | ConvertFrom-Json
    $verifiedWork = @($report.works | Where-Object { $_.slug -eq $work.slug }) | Select-Object -First 1
    if (-not $verifiedWork.complete) { throw "Final verification failed: $($work.slug)" }
    $completedThisRun += 1
    Write-Host "COMPLETE $($work.slug) completedThisRun=$completedThisRun"
}

Write-Host "Continuation finished. Completed this run: $completedThisRun"
