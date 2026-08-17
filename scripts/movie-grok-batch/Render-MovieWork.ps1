param(
    [Parameter(Mandatory = $true)]
    [string]$RunDirectory,
    [Parameter(Mandatory = $true)]
    [string]$Slug,
    [string]$ShortsAppDirectory = 'C:\Users\User\Desktop\채민\2_작품\shorts-webapp'
)

$ErrorActionPreference = 'Stop'
$resolvedRun = (Resolve-Path -LiteralPath $RunDirectory).Path
$resolvedApp = (Resolve-Path -LiteralPath $ShortsAppDirectory).Path
$manifest = Get-Content -LiteralPath (Join-Path $resolvedRun 'batch-manifest.json') -Encoding UTF8 -Raw | ConvertFrom-Json
$movie = @($manifest.works | Where-Object { $_.slug -eq $Slug }) | Select-Object -First 1
if (-not $movie) { throw "Unknown movie slug: $Slug" }

$movieRun = Join-Path $resolvedRun $Slug
foreach ($scene in 1..5) {
    $sceneNumber = '{0:D2}' -f $scene
    $clip = Join-Path $movieRun "clips\scene_${sceneNumber}_grok.mp4"
    if (-not (Test-Path -LiteralPath $clip -PathType Leaf)) { throw "Missing Grok clip: $clip" }
}

$work = Join-Path $resolvedApp 'work\movie-grok-batch'
$public = Join-Path $work 'public'
$audioRaw = Join-Path $movieRun 'audio\raw'
$audioProcessed = Join-Path $movieRun 'audio\processed'
$finalDirectory = Join-Path $movieRun 'final'
$directories = @($work, (Join-Path $work 'remotion'), $public, (Join-Path $public 'clips'), (Join-Path $public 'audio'), (Join-Path $public 'sfx'), $audioRaw, $audioProcessed, $finalDirectory)
foreach ($directory in $directories) { if (-not (Test-Path -LiteralPath $directory -PathType Container)) { $null = New-Item -ItemType Directory -Path $directory -Force } }

foreach ($template in @('index.ts','Root.tsx','MoviePilot.tsx')) {
    Copy-Item -LiteralPath (Join-Path $PSScriptRoot "remotion\$template.template") -Destination (Join-Path $work "remotion\$template") -Force
}

foreach ($scene in 1..5) {
    $sceneNumber = '{0:D2}' -f $scene
    Copy-Item -LiteralPath (Join-Path $movieRun "clips\scene_${sceneNumber}_grok.mp4") -Destination (Join-Path $public "clips\scene-0$scene.mp4") -Force
}

$ttsEntries = @()
for ($index = 0; $index -lt @($movie.narration).Count; $index += 1) {
    $number = '{0:D2}' -f ($index + 1)
    $ttsEntries += [ordered]@{ text = [string]$movie.narration[$index]; outputPath = (Join-Path $audioRaw "sentence-$number.wav") }
}
$ttsManifestPath = Join-Path $movieRun 'audio\tts-manifest.json'
[IO.File]::WriteAllText($ttsManifestPath, (@{entries=$ttsEntries} | ConvertTo-Json -Depth 5), [Text.UTF8Encoding]::new($false))
& (Join-Path $resolvedApp 'scripts\synthesize-heami.ps1') -ManifestPath $ttsManifestPath

$ffmpeg = 'C:\Users\User\Desktop\채민\2_작품\tools\ffmpeg-portable\ffmpeg-9.0-essentials_build\bin\ffmpeg.exe'
$ffprobe = 'C:\Users\User\Desktop\채민\2_작품\tools\ffmpeg-portable\ffmpeg-9.0-essentials_build\bin\ffprobe.exe'
$rawDurations = @()
for ($index = 0; $index -lt $ttsEntries.Count; $index += 1) {
    $number = '{0:D2}' -f ($index + 1)
    $wave = Join-Path $audioRaw "sentence-$number.wav"
    $rawDurations += [double](& $ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 $wave)
}
$firstNineSeconds = ($rawDurations[0..8] | Measure-Object -Sum).Sum
$narrationSpeed = [Math]::Max(1.0, $firstNineSeconds / 25.2)
$titleSpeed = [Math]::Max(1.0, $rawDurations[9] / 1.9)

for ($index = 0; $index -lt $ttsEntries.Count; $index += 1) {
    $number = '{0:D2}' -f ($index + 1)
    $raw = Join-Path $audioRaw "sentence-$number.wav"
    $processed = Join-Path $audioProcessed "sentence-$number.wav"
    $speed = if ($index -eq 9) { $titleSpeed } else { $narrationSpeed }
    & $ffmpeg -hide_banner -loglevel error -y -i $raw -filter:a ("atempo={0:F6}" -f $speed) $processed
    if ($LASTEXITCODE -ne 0) { throw "Audio speed adjustment failed: $raw" }
    Copy-Item -LiteralPath $processed -Destination (Join-Path $public "audio\sentence-$number.wav") -Force
}

$cues = @()
$startFrame = 8
for ($index = 0; $index -lt 9; $index += 1) {
    $number = '{0:D2}' -f ($index + 1)
    $wave = Join-Path $audioProcessed "sentence-$number.wav"
    $duration = [double](& $ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 $wave)
    if ($LASTEXITCODE -ne 0) { throw "ffprobe failed: $wave" }
    $frames = [Math]::Max(12, [Math]::Ceiling($duration * 30))
    $endFrame = $startFrame + $frames
    if ($endFrame -gt 827) { throw "Narration exceeds the 27.6 second safe window for $Slug" }
    $cues += [ordered]@{text=[string]$movie.narration[$index];startFrame=$startFrame;endFrame=$endFrame;src="audio/sentence-$number.wav"}
    $startFrame = $endFrame + 4
}
$titleWave = Join-Path $audioProcessed 'sentence-10.wav'
$titleFrames = [Math]::Max(12, [Math]::Ceiling(([double](& $ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 $titleWave)) * 30))
$titleEnd = [Math]::Min(899, 837 + $titleFrames)
$cues += [ordered]@{text=[string]$movie.narration[9];startFrame=837;endFrame=$titleEnd;src='audio/sentence-10.wav'}

$existingPilot = 'C:\Users\User\Desktop\채민\2_작품\output\swapped_grok_pilot\run-20260817-125521\audio\sfx'
Copy-Item -LiteralPath (Join-Path $existingPilot 'low-hit.wav') -Destination (Join-Path $public 'sfx\low-hit.wav') -Force
Copy-Item -LiteralPath (Join-Path $existingPilot 'wing-whoosh.wav') -Destination (Join-Path $public 'sfx\whoosh.wav') -Force
Copy-Item -LiteralPath (Join-Path $existingPilot 'stream-rumble.wav') -Destination (Join-Path $public 'sfx\rumble.wav') -Force

$movieData = [ordered]@{title=[string]$movie.title;year=[int]$movie.year;emphasis=@($movie.emphasis);cues=$cues}
[IO.File]::WriteAllText((Join-Path $work 'remotion\movie.json'), ($movieData | ConvertTo-Json -Depth 6), [Text.UTF8Encoding]::new($false))
[IO.File]::WriteAllText((Join-Path $movieRun 'captions.json'), ($cues | ConvertTo-Json -Depth 5), [Text.UTF8Encoding]::new($false))

$remotion = Join-Path $resolvedApp 'node_modules\.bin\remotion.cmd'
$output = Join-Path $finalDirectory "${Slug}_watchmatch_30s.mp4"
$arguments = @('render','work\movie-grok-batch\remotion\index.ts','MovieGrokShort30s',$output,'--codec=h264','--audio-codec=aac','--crf=20','--pixel-format=yuv420p','--public-dir=work\movie-grok-batch\public','--overwrite')
Push-Location -LiteralPath $resolvedApp
try {
    & $remotion @arguments
    if ($LASTEXITCODE -ne 0) { throw "Remotion render failed with exit code $LASTEXITCODE" }
} finally { Pop-Location }

Get-Item -LiteralPath $output | Select-Object FullName,Length,LastWriteTime
