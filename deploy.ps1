# Maskob — publish to Firebase only if the automated tests pass.
# Usage (from this folder):
#   powershell -ExecutionPolicy Bypass -File deploy.ps1              # site only
#   powershell -ExecutionPolicy Bypass -File deploy.ps1 -Rules       # site + database rules
param([switch]$Rules)
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$firebase = Join-Path $env:APPDATA 'npm\firebase.cmd'

Write-Host '== Running tests ==' -ForegroundColor Cyan
Push-Location (Join-Path $root 'tests')
try {
  if (-not (Test-Path 'node_modules')) { npm install --no-audit --no-fund | Out-Host }
  node --test
  if ($LASTEXITCODE -ne 0) { Write-Host 'Tests failed - nothing was published.' -ForegroundColor Red; exit 1 }
} finally { Pop-Location }

$only = if ($Rules) { 'firestore:rules,hosting' } else { 'hosting' }
Write-Host "== Tests passed - deploying ($only) ==" -ForegroundColor Green
& $firebase deploy --only $only --project fllow-maskob
exit $LASTEXITCODE
