$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
function Invoke-Checked {
    param([string]$Program, [string[]]$Arguments)
    & $Program @Arguments
    if ($LASTEXITCODE -ne 0) { throw "Falló el comando: $Program $Arguments" }
}
if (-not (Test-Path -LiteralPath '.venv/Scripts/python.exe')) {
    Invoke-Checked 'python' @('-m', 'venv', '.venv')
}
$qcPython = Join-Path $PSScriptRoot '.venv/Scripts/python.exe'
Invoke-Checked $qcPython @('-m', 'pip', 'install', '--index-url', 'https://pypi.org/simple', '-r', 'backend/requirements.txt')
Push-Location -LiteralPath 'frontend'
try {
    Invoke-Checked 'npm.cmd' @('ci')
    Invoke-Checked 'npm.cmd' @('run', 'build')
} finally { Pop-Location }
Push-Location -LiteralPath 'backend'
try {
    Invoke-Checked $qcPython @('manage.py', 'migrate')
    Invoke-Checked $qcPython @('manage.py', 'seed_demo')
    Invoke-Checked $qcPython @('manage.py', 'check')
} finally { Pop-Location }
Write-Host 'Preparación terminada. Ejecute Iniciar.ps1 y abra http://127.0.0.1:8000'
