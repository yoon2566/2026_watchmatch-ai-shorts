param(
    [Parameter(Mandatory = $true)]
    [string]$RunDirectory,
    [string]$FfmpegDirectory = 'C:\Users\User\Desktop\채민\2_작품\tools\ffmpeg-portable\ffmpeg-9.0-essentials_build\bin'
)

$ErrorActionPreference = 'Stop'
$resolvedRun = (Resolve-Path -LiteralPath $RunDirectory).Path
$ffprobe = Join-Path $FfmpegDirectory 'ffprobe.exe'
$ffmpeg = Join-Path $FfmpegDirectory 'ffmpeg.exe'
foreach ($tool in @($ffprobe, $ffmpeg)) {
    if (-not (Test-Path -LiteralPath $tool -PathType Leaf)) { throw "Missing media tool: $tool" }
}

$manifest = Get-Content -LiteralPath (Join-Path $resolvedRun 'batch-manifest.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$results = foreach ($work in @($manifest.works)) {
    $workDirectory = Join-Path $resolvedRun $work.slug
    $clipResults = foreach ($scene in 1..5) {
        $sceneNumber = '{0:D2}' -f $scene
        $clipPath = Join-Path $workDirectory "clips\scene_${sceneNumber}_grok.mp4"
        if (-not (Test-Path -LiteralPath $clipPath -PathType Leaf)) {
            [ordered]@{ scene = $scene; exists = $false; valid = $false }
            continue
        }
        $probeText = & $ffprobe -v error -select_streams v:0 -show_entries stream=codec_name,width,height,r_frame_rate,nb_frames -show_entries format=duration,size -of json $clipPath
        if ($LASTEXITCODE -ne 0) { throw "ffprobe failed: $clipPath" }
        $probe = $probeText | ConvertFrom-Json
        $stream = @($probe.streams)[0]
        $duration = [double]$probe.format.duration
        [ordered]@{
            scene = $scene
            exists = $true
            valid = ($stream.codec_name -eq 'h264' -and $stream.width -eq 720 -and $stream.height -eq 1280 -and $duration -ge 5.5 -and $duration -le 6.5)
            codec = $stream.codec_name
            width = $stream.width
            height = $stream.height
            fps = $stream.r_frame_rate
            frames = [int]$stream.nb_frames
            duration = $duration
            bytes = [long]$probe.format.size
        }
    }

    $finalPath = Join-Path $workDirectory "final\$($work.slug)_watchmatch_30s.mp4"
    $finalResult = [ordered]@{ exists = $false; valid = $false }
    if (Test-Path -LiteralPath $finalPath -PathType Leaf) {
        $probeText = & $ffprobe -v error -show_entries stream=index,codec_name,codec_type,width,height,r_frame_rate,nb_frames -show_entries format=duration,size -of json $finalPath
        if ($LASTEXITCODE -ne 0) { throw "ffprobe failed: $finalPath" }
        $probe = $probeText | ConvertFrom-Json
        $video = @($probe.streams | Where-Object { $_.codec_type -eq 'video' })[0]
        $audio = @($probe.streams | Where-Object { $_.codec_type -eq 'audio' })[0]
        & $ffmpeg -v error -i $finalPath -f null NUL
        $decodeOk = $LASTEXITCODE -eq 0
        $duration = [double]$probe.format.duration
        $finalResult = [ordered]@{
            exists = $true
            valid = ($decodeOk -and $video.codec_name -eq 'h264' -and $audio.codec_name -eq 'aac' -and $video.width -eq 1080 -and $video.height -eq 1920 -and $video.r_frame_rate -eq '30/1' -and $duration -ge 29.5 -and $duration -le 30.5)
            videoCodec = $video.codec_name
            audioCodec = $audio.codec_name
            width = $video.width
            height = $video.height
            fps = $video.r_frame_rate
            frames = [int]$video.nb_frames
            duration = $duration
            bytes = [long]$probe.format.size
            decodeOk = $decodeOk
            sha256 = (Get-FileHash -LiteralPath $finalPath -Algorithm SHA256).Hash
            path = $finalPath
        }
    }

    $validClips = @($clipResults | Where-Object { $_.valid }).Count
    [ordered]@{
        slug = $work.slug
        title = $work.title
        validClipCount = $validClips
        clips = @($clipResults)
        final = $finalResult
        complete = ($validClips -eq 5 -and $finalResult.valid)
    }
}

$report = [ordered]@{
    generatedAt = (Get-Date).ToUniversalTime().ToString('o')
    runDirectory = $resolvedRun
    plannedWorks = @($results).Count
    completedWorks = @($results | Where-Object { $_.complete }).Count
    worksWithFiveClips = @($results | Where-Object { $_.validClipCount -eq 5 }).Count
    openRouterUsed = $false
    works = @($results)
}
$reportPath = Join-Path $resolvedRun 'batch-validation-report.json'
$report | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath $reportPath -Encoding UTF8
[pscustomobject]@{
    generatedAt = $report.generatedAt
    plannedWorks = $report.plannedWorks
    completedWorks = $report.completedWorks
    worksWithFiveClips = $report.worksWithFiveClips
    openRouterUsed = $report.openRouterUsed
} | Format-List
Write-Output $reportPath
