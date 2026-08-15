$ErrorActionPreference = 'Stop'

$userKey = [Environment]::GetEnvironmentVariable('3_openrouter', 'User')
if ([string]::IsNullOrWhiteSpace($userKey)) {
    throw 'Windows User environment variable 3_openrouter is empty.'
}

$previousKey = [Environment]::GetEnvironmentVariable('OPENROUTER_API_KEY', 'Process')
try {
    [Environment]::SetEnvironmentVariable('OPENROUTER_API_KEY', $userKey, 'Process')
    & node.exe 'scripts/discover-netflix-candidates.mjs'
    if ($LASTEXITCODE -ne 0) { throw "Candidate discovery failed with exit code $LASTEXITCODE." }
}
finally {
    [Environment]::SetEnvironmentVariable('OPENROUTER_API_KEY', $previousKey, 'Process')
    $userKey = $null
}
