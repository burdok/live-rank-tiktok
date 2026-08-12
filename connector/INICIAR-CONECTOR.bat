@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ========================================
echo  LIVE RANK - CONECTOR TIKTOK
echo ========================================
if not exist node_modules (
  echo Instalando dependencias...
  call npm install
)
echo.
node connector.js
echo.
pause
