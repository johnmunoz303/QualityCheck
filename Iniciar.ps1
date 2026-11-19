$ErrorActionPreference = 'Stop'
$qcPython = Join-Path $PSScriptRoot '.venv/Scripts/python.exe'
if (-not (Test-Path -LiteralPath $qcPython)) { throw 'Ejecute primero Preparar.ps1.' }
if (-not (Test-Path -LiteralPath (Join-Path $PSScriptRoot 'frontend/dist/index.html'))) { throw 'Falta compilar React. Ejecute Preparar.ps1.' }
& $qcPython (Join-Path $PSScriptRoot 'scripts/start.py')
if ($LASTEXITCODE -ne 0) { throw 'No se pudo iniciar QualityCheck. Revise el error anterior.' }
