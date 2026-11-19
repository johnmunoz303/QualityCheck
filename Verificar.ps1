$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$qcPython = Join-Path $PSScriptRoot '.venv/Scripts/python.exe'
if (-not (Test-Path -LiteralPath $qcPython)) { throw 'Ejecute primero Preparar.ps1.' }
Push-Location -LiteralPath 'backend'
try {
    & $qcPython manage.py check
    if ($LASTEXITCODE -ne 0) { throw 'Falló la revisión de Django.' }
    & $qcPython (Join-Path $PSScriptRoot 'scripts/verify.py')
    if ($LASTEXITCODE -ne 0) { throw 'Fallaron las pruebas.' }
    & $qcPython (Join-Path $PSScriptRoot 'scripts/http_check.py')
    if ($LASTEXITCODE -ne 0) { throw 'Falló el recorrido HTTP.' }
} finally { Pop-Location }
Push-Location -LiteralPath 'frontend'
try {
    & npm.cmd test -- --reporter=default --reporter=json --outputFile=../docs/evidencias/pruebas-react.json
    if ($LASTEXITCODE -ne 0) { throw 'Fallaron las pruebas de React.' }
    & npm.cmd run build
    if ($LASTEXITCODE -ne 0) { throw 'Falló la compilación.' }
} finally { Pop-Location }
