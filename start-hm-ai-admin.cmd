@echo off
setlocal
cd /d "%~dp0"
echo Starting HM AI Local Admin at http://127.0.0.1:43821
npm run admin:local
