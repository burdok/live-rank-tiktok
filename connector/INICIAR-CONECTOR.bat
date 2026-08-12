@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ========================================
echo  LIVE RANK - CONECTOR TIKTOK
echo ========================================
echo.
echo Verificando dependencias...
call npm install --no-audit --no-fund
if errorlevel 1 (
  echo.
  echo ERRO ao instalar dependencias.
  pause
  exit /b 1
)
echo.
echo Versao instalada do conector TikTok:
call npm list tiktok-live-connector --depth=0
echo.
node connector.js
echo.
pause
