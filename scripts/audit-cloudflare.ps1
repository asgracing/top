param([switch]$SaveToken)
$ErrorActionPreference = 'Stop'
$workspace = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$secretDirectory = Join-Path $workspace 'portal-secrets'
$secretPath = Join-Path $secretDirectory 'cloudflare-read-token.dpapi'

if ($SaveToken) {
    Write-Host 'Paste the Cloudflare read-only API token. Input is hidden; do not send it in chat.'
    $enteredToken = Read-Host -AsSecureString 'Token'
    try {
        if ($enteredToken.Length -eq 0) { throw 'Empty token; nothing saved.' }
        if (-not (Test-Path -LiteralPath $secretDirectory)) {
            New-Item -ItemType Directory -Path $secretDirectory | Out-Null
        }
        # Windows DPAPI, bound to this user/computer. No plaintext credential file.
        ConvertFrom-SecureString $enteredToken | Set-Content -LiteralPath $secretPath -Encoding Ascii
    } finally { $enteredToken.Dispose() }
}
if (-not (Test-Path -LiteralPath $secretPath)) {
    throw 'No saved read token. Create a scoped read-only Cloudflare token and run this script with -SaveToken.'
}
$previousToken = [Environment]::GetEnvironmentVariable('CLOUDFLARE_API_TOKEN', 'Process')
$secureToken = $null
$tokenBuffer = [IntPtr]::Zero
$resultCode = 1
try {
    $encryptedToken = (Get-Content -LiteralPath $secretPath -Raw).Trim()
    $secureToken = ConvertTo-SecureString $encryptedToken
    $tokenBuffer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureToken)
    $plainToken = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($tokenBuffer).Trim()
    if ($plainToken -match '\s' -or $plainToken.Length -lt 20) { throw 'Token format invalid.' }
    [Environment]::SetEnvironmentVariable('CLOUDFLARE_API_TOKEN', $plainToken, 'Process')
    $plainToken = $null
    # Audit performs GET requests only; token is not passed in command arguments.
    & python (Join-Path $PSScriptRoot 'audit-edge-config.py')
    $resultCode = $LASTEXITCODE
} finally {
    [Environment]::SetEnvironmentVariable('CLOUDFLARE_API_TOKEN', $previousToken, 'Process')
    if ($tokenBuffer -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($tokenBuffer) }
    if ($null -ne $secureToken) { $secureToken.Dispose() }
    $plainToken = $null
}
exit $resultCode
