param(
    [Parameter(Mandatory = $true)]
    [string]$PromptPath,

    [Parameter(Mandatory = $true)]
    [string]$WorkingDirectory,

    [Parameter(Mandatory = $true)]
    [string]$StdoutPath,

    [Parameter(Mandatory = $true)]
    [string]$StderrPath
)

$ErrorActionPreference = 'Stop'

$grokPath = 'C:\Users\User\.grok\bin\grok.exe'
if (-not (Test-Path -LiteralPath $grokPath -PathType Leaf)) {
    throw "Grok CLI was not found: $grokPath"
}

$resolvedPrompt = (Resolve-Path -LiteralPath $PromptPath).Path
$resolvedWorkingDirectory = (Resolve-Path -LiteralPath $WorkingDirectory).Path

$startInfo = [Diagnostics.ProcessStartInfo]::new()
$startInfo.FileName = $grokPath
$startInfo.WorkingDirectory = $resolvedWorkingDirectory
$startInfo.UseShellExecute = $false
$startInfo.CreateNoWindow = $true
$startInfo.RedirectStandardOutput = $true
$startInfo.RedirectStandardError = $true

foreach ($environmentName in @($startInfo.Environment.Keys)) {
    if ($environmentName -match '(?i)openrouter') {
        $null = $startInfo.Environment.Remove($environmentName)
    }
}

$arguments = @(
    '--cwd', $resolvedWorkingDirectory,
    '--model', 'grok-4.6',
    '--reasoning-effort', 'medium',
    '--disable-web-search',
    '--no-memory',
    '--no-subagents',
    '--always-approve',
    '--max-turns', '6',
    '--tools', 'image_gen,image_edit,image_to_video,run_terminal_cmd',
    '--output-format', 'json',
    '--prompt-file', $resolvedPrompt
)

foreach ($argument in $arguments) {
    $null = $startInfo.ArgumentList.Add($argument)
}

$process = [Diagnostics.Process]::new()
$process.StartInfo = $startInfo
if (-not $process.Start()) {
    throw 'Failed to start Grok CLI.'
}

$stdoutTask = $process.StandardOutput.ReadToEndAsync()
$stderrTask = $process.StandardError.ReadToEndAsync()
$process.WaitForExit()
$stdout = $stdoutTask.GetAwaiter().GetResult()
$stderr = $stderrTask.GetAwaiter().GetResult()

[IO.File]::WriteAllText($StdoutPath, $stdout, [Text.UTF8Encoding]::new($false))
[IO.File]::WriteAllText($StderrPath, $stderr, [Text.UTF8Encoding]::new($false))

[ordered]@{
    exitCode = $process.ExitCode
    stdoutPath = [IO.Path]::GetFullPath($StdoutPath)
    stderrPath = [IO.Path]::GetFullPath($StderrPath)
    openRouterVariablesRemovedFromChild = $true
    model = 'grok-4.6'
    reasoningEffort = 'medium'
} | ConvertTo-Json -Compress

exit $process.ExitCode
