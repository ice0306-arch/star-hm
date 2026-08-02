@echo off
setlocal
cd /d "%~dp0"
echo Starting HM AI Local Admin at http://127.0.0.1:43821
where pnpm >nul 2>nul
if %errorlevel%==0 (
  pnpm admin:db:migrate
  pnpm admin:local
  goto :end
)

where npm >nul 2>nul
if %errorlevel%==0 (
  npm run admin:db:migrate
  npm run admin:local
  goto :end
)

echo Node.js package manager not found. Install Node.js first, then run this file again.
pause

:end
