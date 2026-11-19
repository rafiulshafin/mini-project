@echo off
setlocal
set "TARGET=%~dp0TaskFlow-App.bat"
set "SHORTCUT=%USERPROFILE%\Desktop\TaskFlow.lnk"

echo Creating TaskFlow shortcut on your Windows Desktop...
powershell -NoProfile -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%SHORTCUT%'); $s.TargetPath = '%TARGET%'; $s.WorkingDirectory = '%~dp0'; $s.Description = 'TaskFlow Daily Productivity App'; $s.Save()" 2>nul

if exist "%USERPROFILE%\Desktop\TaskFlow.lnk" (
    echo.
    echo =======================================================
    echo  SUCCESS! 'TaskFlow' shortcut was placed on your Desktop!
    echo  You can now double-click it anytime like a native app.
    echo =======================================================
) else (
    echo.
    echo [Notice] Could not auto-place on Desktop.
    echo You can simply right-click 'TaskFlow-App.bat' and click:
    echo 'Show more options' -^> 'Send to' -^> 'Desktop (create shortcut)'
)
echo.
pause
