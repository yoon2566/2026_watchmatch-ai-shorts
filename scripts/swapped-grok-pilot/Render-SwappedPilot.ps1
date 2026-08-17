param(
    [Parameter(Mandatory = $true)]
    [string]$RunDirectory,
    [string]$ShortsAppDirectory = 'C:\Users\User\Desktop\채민\2_작품\shorts-webapp'
)

$ErrorActionPreference = 'Stop'
$resolvedRun = (Resolve-Path -LiteralPath $RunDirectory).Path
$resolvedApp = (Resolve-Path -LiteralPath $ShortsAppDirectory).Path
$remotionCli = Join-Path $resolvedApp 'node_modules\.bin\remotion.cmd'
if (-not (Test-Path -LiteralPath $remotionCli -PathType Leaf)) { throw "Remotion CLI was not found: $remotionCli" }

$work = Join-Path $resolvedApp 'work\swapped-grok-pilot'
$directories = @($work, (Join-Path $work 'remotion'), (Join-Path $work 'public'), (Join-Path $work 'public\clips'), (Join-Path $work 'public\audio'), (Join-Path $work 'public\sfx'), (Join-Path $resolvedRun 'final'))
foreach ($directory in $directories) { if (-not (Test-Path -LiteralPath $directory -PathType Container)) { $null = New-Item -ItemType Directory -Path $directory } }

$templates = @(
    @{source='index.ts.template';target='index.ts'},
    @{source='Root.tsx.template';target='Root.tsx'},
    @{source='SwappedPilot.tsx.template';target='SwappedPilot.tsx'}
)
foreach ($template in $templates) { Copy-Item -LiteralPath (Join-Path $PSScriptRoot "remotion\$($template.source)") -Destination (Join-Path $work "remotion\$($template.target)") -Force }

$clipMap = @{
    'scene_01_swap_grok.mp4'='scene-01.mp4'
    'scene_02_flight_grok.mp4'='scene-02.mp4'
    'scene_03_new_perspective_grok.mp4'='scene-03.mp4'
    'scene_04_teamwork_grok.mp4'='scene-04.mp4'
    'scene_05_choice_grok.mp4'='scene-05.mp4'
}
foreach ($entry in $clipMap.GetEnumerator()) { Copy-Item -LiteralPath (Join-Path $resolvedRun "clips\$($entry.Key)") -Destination (Join-Path $work "public\clips\$($entry.Value)") -Force }
foreach ($wave in Get-ChildItem -LiteralPath (Join-Path $resolvedRun 'audio\processed') -Filter '*.wav') { Copy-Item -LiteralPath $wave.FullName -Destination (Join-Path $work "public\audio\$($wave.Name)") -Force }
foreach ($effect in Get-ChildItem -LiteralPath (Join-Path $resolvedRun 'audio\sfx') -Filter '*.wav') { Copy-Item -LiteralPath $effect.FullName -Destination (Join-Path $work "public\sfx\$($effect.Name)") -Force }

$outputPath = Join-Path $resolvedRun 'final\swapped_watchmatch_30s.mp4'
$arguments = @('render','work\swapped-grok-pilot\remotion\index.ts','SwappedGrokPilot30s',$outputPath,'--codec=h264','--audio-codec=aac','--crf=18','--pixel-format=yuv420p','--public-dir=work\swapped-grok-pilot\public','--overwrite')
Push-Location -LiteralPath $resolvedApp
try {
    & $remotionCli @arguments
    if ($LASTEXITCODE -ne 0) { throw "Remotion render failed with exit code $LASTEXITCODE" }
} finally { Pop-Location }

Get-Item -LiteralPath $outputPath | Select-Object FullName,Length,LastWriteTime
