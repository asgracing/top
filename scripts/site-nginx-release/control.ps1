param(
 [Parameter(Mandatory=$true)][ValidateSet('issue-tls','cutover','rollback','configure-renewal','finalize')][string]$Action,
 [Parameter(Mandatory=$true)][ValidatePattern('^site-redirects-[0-9]{8}-r[0-9]+$')][string]$Version,
 [string]$Revision
)
$ErrorActionPreference='Stop'
$workspace=Split-Path (Split-Path (Split-Path $PSScriptRoot -Parent) -Parent) -Parent
$secretPath=Join-Path $workspace 'portal-secrets/cloudflare-release-token.dpapi'
if (-not (Test-Path -LiteralPath $secretPath)) { $secretPath=Join-Path $workspace 'portal-secrets/cloudflare-read-token.dpapi' }
if (-not (Test-Path -LiteralPath $secretPath)) { throw 'Saved Cloudflare token unavailable.' }
$previousToken=[Environment]::GetEnvironmentVariable('CLOUDFLARE_API_TOKEN','Process')
$secureToken=$null
$tokenBuffer=[IntPtr]::Zero
try {
 $secureToken=ConvertTo-SecureString ((Get-Content -LiteralPath $secretPath -Raw).Trim())
 $tokenBuffer=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureToken)
 [Environment]::SetEnvironmentVariable('CLOUDFLARE_API_TOKEN',[Runtime.InteropServices.Marshal]::PtrToStringBSTR($tokenBuffer).Trim(),'Process')
 $scriptArgs=@((Join-Path $PSScriptRoot 'control.py'),$Action,'--version',$Version)
 if ($Revision) { $scriptArgs+=@('--revision',$Revision) }
 & python @scriptArgs
 $resultCode=$LASTEXITCODE
} finally {
 [Environment]::SetEnvironmentVariable('CLOUDFLARE_API_TOKEN',$previousToken,'Process')
 if ($tokenBuffer -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($tokenBuffer) }
 if ($null -ne $secureToken) { $secureToken.Dispose() }
}
exit $resultCode
