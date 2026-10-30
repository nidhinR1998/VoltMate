@echo off
setlocal
echo ========================================================
echo        VoltMate - Standalone Android APK Builder
echo ========================================================
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0build_apk.ps1" %*
if %ERRORLEVEL% NEQ 0 (
    echo [!] Build encountered an error.
    pause
    exit /b %ERRORLEVEL%
)
pause

