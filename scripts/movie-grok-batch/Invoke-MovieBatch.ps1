param(
    [Parameter(Mandatory = $true)]
    [string]$RunDirectory,
    [string]$StartSlug = '',
    [int]$MaximumScenes = 0
)

$ErrorActionPreference = 'Stop'
$resolvedRun = [IO.Path]::GetFullPath($RunDirectory)
if (-not (Test-Path -LiteralPath $resolvedRun -PathType Container)) {
    $null = New-Item -ItemType Directory -Path $resolvedRun -Force
}

$generator = Join-Path $PSScriptRoot 'generate-prompts.mjs'
& node.exe $generator "--run=$resolvedRun"
if ($LASTEXITCODE -ne 0) { throw 'Prompt generation failed.' }

$manifest = Get-Content -LiteralPath (Join-Path $resolvedRun 'batch-manifest.json') -Encoding UTF8 -Raw | ConvertFrom-Json
$invokeShot = Join-Path (Split-Path -Parent $PSScriptRoot) 'howls-grok-pilot\Invoke-GrokShot.ps1'
$started = [string]::IsNullOrWhiteSpace($StartSlug)
$generated = 0

foreach ($work in @($manifest.works)) {
    if (-not $started) {
        if ($work.slug -eq $StartSlug) { $started = $true } else { continue }
    }
    for ($scene = 1; $scene -le 5; $scene += 1) {
        $sceneNumber = '{0:D2}' -f $scene
        $workDirectory = Join-Path $resolvedRun $work.slug
        $clipPath = Join-Path $workDirectory "clips\scene_${sceneNumber}_grok.mp4"
        $imagePath = Join-Path $workDirectory "images\scene_${sceneNumber}_source.jpg"
        if ((Test-Path -LiteralPath $clipPath -PathType Leaf) -and (Test-Path -LiteralPath $imagePath -PathType Leaf)) {
            Write-Host "SKIP $($work.slug) scene $sceneNumber"
            continue
        }
        if ($MaximumScenes -gt 0 -and $generated -ge $MaximumScenes) {
            Write-Host "Reached MaximumScenes=$MaximumScenes"
            exit 0
        }
        Write-Host "GENERATE $($work.slug) scene $sceneNumber"
        & $invokeShot `
            -PromptPath (Join-Path $workDirectory "prompts\scene_${sceneNumber}.txt") `
            -WorkingDirectory $workDirectory `
            -StdoutPath (Join-Path $workDirectory "logs\scene_${sceneNumber}.stdout.json") `
            -StderrPath (Join-Path $workDirectory "logs\scene_${sceneNumber}.stderr.log")
        if ($LASTEXITCODE -ne 0) {
            throw "Grok stopped at $($work.slug) scene $sceneNumber with exit code $LASTEXITCODE"
        }
        $generated += 1
    }
}

Write-Host "Movie batch generation completed. New scenes: $generated"

