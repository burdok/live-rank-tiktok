@echo off
chcp 65001 >nul
title LIVE RANK TikTok
cd /d "%~dp0"
echo ===============================
echo     LIVE RANK - TikTok Live
echo ===============================
echo.
if not exist node_modules (
  echo Instalando dependencias...
  call npm install
  if errorlevel 1 pause & exit /b 1
)
start "" http://localhost:8091/admin.html
npm start
pause
