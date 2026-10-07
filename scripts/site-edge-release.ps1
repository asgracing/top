param(
    [Parameter(Mandatory=$true)][ValidateSet('stage','activate','verify','rollback')][string]$Action,
    [Parameter(Mandatory=$true)][string]$Version
)
$ErrorActionPreference = 'Stop'
$workspace = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$secretDirectory = Join-Path $workspace 'portal-secrets'
$secretPath = Join-Path $secretDirectory 'cloudflare-release-token.dpapi'
if (-not (Test-Path -LiteralPath $secretPath)) { $secretPath = Join-Path $secretDirectory 'cloudflare-read-token.dpapi' }
if (-not (Test-Path -LiteralPath $secretPath)) { throw 'No locally saved Cloudflare token.' }
$previousToken = [Environment]::GetEnvironmentVariable('CLOUDFLARE_API_TOKEN', 'Process')
$secureToken = $null
$tokenBuffer = [IntPtr]::Zero
$resultCode = 1
try {
    $secureToken = ConvertTo-SecureString ((Get-Content -LiteralPath $secretPath -Raw).Trim())
    $tokenBuffer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureToken)
    $plainToken = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($tokenBuffer).Trim()
    [Environment]::SetEnvironmentVariable('CLOUDFLARE_API_TOKEN', $plainToken, 'Process')
    $plainToken = $null
    & python (Join-Path $PSScriptRoot 'site-edge-release.py') --action $Action --version $Version
    $resultCode = $LASTEXITCODE
} finally {
    [Environment]::SetEnvironmentVariable('CLOUDFLARE_API_TOKEN', $previousToken, 'Process')
    if ($tokenBuffer -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($tokenBuffer) }
    if ($null -ne $secureToken) { $secureToken.Dispose() }
    $plainToken = $null
}
exit $resultCode
