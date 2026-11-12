@echo off
chcp 65001 >nul
rem changupguide deploy: commit all changes -> pull --rebase -> push to GitHub main
rem   GitHub Pages(preview) and Railway(production, connected to main) redeploy automatically.
rem   Double-click to run manually. "deploy.bat auto" = no pause (used by the Claude Code Stop hook).
setlocal EnableDelayedExpansion
cd /d "%~dp0"
git rev-parse --is-inside-work-tree >NUL 2>&1 || (echo [deploy] not a git repository & exit /b 1)
rem 0) back up production data to this PC first (..\backups, outside git) - see tools\pc-backup.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\pc-backup.ps1"
git add -A
git diff --cached --quiet
if errorlevel 1 (
  for /f "tokens=*" %%t in ('powershell -NoProfile -Command "Get-Date -Format yyyy-MM-dd_HH:mm"') do set NOW=%%t
  git commit -q -m "deploy: !NOW!"
  echo [deploy] committed changes
)
git fetch -q origin main
for /f %%c in ('git rev-list --count origin/main..HEAD') do set AHEAD=%%c
for /f %%c in ('git rev-list --count HEAD..origin/main') do set BEHIND=%%c
if not "%BEHIND%"=="0" git pull -q --rebase origin main || (echo [deploy] rebase conflict - resolve manually & exit /b 1)
for /f %%c in ('git rev-list --count origin/main..HEAD') do set AHEAD=%%c
if "%AHEAD%"=="0" (
  echo [deploy] nothing to deploy
) else (
  git push -q origin HEAD:main && echo [deploy] pushed %AHEAD% commit^(s^) - GitHub Pages + Railway redeploy started
)
if /i not "%~1"=="auto" pause
endlocal
