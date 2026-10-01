$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$taskNode = Get-Command node -ErrorAction SilentlyContinue
if (-not $taskNode) {
    $taskBundledNode = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
    if (Test-Path -LiteralPath $taskBundledNode) { $taskNode = @{ Source = $taskBundledNode } }
    else { throw 'Node.js est requis pour démarrer depuis les sources.' }
}
& $taskNode.Source scripts/build.cjs
if ($LASTEXITCODE -ne 0) { throw 'La compilation a échoué.' }
Start-Process -FilePath (Join-Path $PSScriptRoot 'node_modules\electron\dist\electron.exe') -ArgumentList '.' -WorkingDirectory $PSScriptRoot
