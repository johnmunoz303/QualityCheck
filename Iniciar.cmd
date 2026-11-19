@echo off
setlocal
cd /d "%~dp0"
if not exist ".venv\Scripts\python.exe" (
    echo Primero debes preparar el proyecto. Consulta README.md.
    echo Ejecuta Preparar.ps1 o los comandos de preparacion manual.
    pause
    exit /b 1
)
".venv\Scripts\python.exe" "scripts\start.py"
if errorlevel 1 (
    echo.
    echo No se pudo iniciar QualityCheck. Revisa el mensaje anterior.
    pause
)
