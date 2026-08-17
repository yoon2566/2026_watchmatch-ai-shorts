param(
    [Parameter(Mandatory = $true)][string]$BatchRoot,
    [Parameter(Mandatory = $true)][string]$PublicDirectory,
    [Parameter(Mandatory = $true)][string]$FfmpegPath
)

$ErrorActionPreference = 'Stop'
$OutputEncoding = [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)

$works = @(
    'spider-man-homecoming',
    'spider-man-far-from-home',
    'spider-man-into-the-spider-verse',
    'dont-say-good-luck',
    'la-casa',
    'kpop-demon-hunters'
)

if (-not (Test-Path -LiteralPath $FfmpegPath -PathType Leaf)) {
    throw "FFmpeg를 찾을 수 없습니다: $FfmpegPath"
}
[System.IO.Directory]::CreateDirectory($PublicDirectory) | Out-Null

function Convert-ToVttTimestamp([int]$Frame) {
    $milliseconds = [Math]::Round(($Frame / 30.0) * 1000)
    $hours = [Math]::Floor($milliseconds / 3600000)
    $milliseconds %= 3600000
    $minutes = [Math]::Floor($milliseconds / 60000)
    $milliseconds %= 60000
    $seconds = [Math]::Floor($milliseconds / 1000)
    $milliseconds %= 1000
    return '{0:00}:{1:00}:{2:00}.{3:000}' -f $hours, $minutes, $seconds, $milliseconds
}

foreach ($slug in $works) {
    $workDirectory = Join-Path $BatchRoot $slug
    $inputVideo = Join-Path $workDirectory "final\${slug}_watchmatch_30s.mp4"
    $captionsJson = Join-Path $workDirectory 'captions.json'
    $outputVideo = Join-Path $PublicDirectory "${slug}_watchmatch_30s_sites.mp4"
    $outputCaptions = Join-Path $PublicDirectory "${slug}_watchmatch_30s.ko.vtt"
    $temporaryVideo = "$outputVideo.partial.mp4"

    if (-not (Test-Path -LiteralPath $inputVideo -PathType Leaf)) { throw "입력 영상을 찾을 수 없습니다: $inputVideo" }
    if (-not (Test-Path -LiteralPath $captionsJson -PathType Leaf)) { throw "자막 JSON을 찾을 수 없습니다: $captionsJson" }

    if (Test-Path -LiteralPath $temporaryVideo -PathType Leaf) { Remove-Item -LiteralPath $temporaryVideo -Force }
    $arguments = @(
        '-hide_banner', '-loglevel', 'error', '-y', '-i', $inputVideo,
        '-map', '0:v:0', '-map', '0:a:0?',
        '-c:v', 'libx264', '-preset', 'fast', '-crf', '27', '-profile:v', 'high', '-pix_fmt', 'yuv420p',
        '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart',
        $temporaryVideo
    )
    & $FfmpegPath @arguments
    if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $temporaryVideo -PathType Leaf)) {
        throw "Sites 재생본 생성에 실패했습니다: $slug"
    }
    Move-Item -LiteralPath $temporaryVideo -Destination $outputVideo -Force

    $captions = Get-Content -LiteralPath $captionsJson -Raw -Encoding UTF8 | ConvertFrom-Json
    $lines = [System.Collections.Generic.List[string]]::new()
    $lines.Add('WEBVTT')
    $lines.Add('')
    for ($index = 0; $index -lt $captions.Count; $index++) {
        $caption = $captions[$index]
        $lines.Add([string]($index + 1))
        $lines.Add("$(Convert-ToVttTimestamp $caption.startFrame) --> $(Convert-ToVttTimestamp $caption.endFrame)")
        $lines.Add([string]$caption.text)
        if ($index -lt ($captions.Count - 1)) { $lines.Add('') }
    }
    [System.IO.File]::WriteAllLines($outputCaptions, $lines, [System.Text.UTF8Encoding]::new($false))
}

$summary = foreach ($slug in $works) {
    $videoPath = Join-Path $PublicDirectory "${slug}_watchmatch_30s_sites.mp4"
    [pscustomobject]@{
        slug = $slug
        bytes = (Get-Item -LiteralPath $videoPath).Length
        sha256 = (Get-FileHash -LiteralPath $videoPath -Algorithm SHA256).Hash.ToLowerInvariant()
    }
}
$summary | ConvertTo-Json -Depth 3
