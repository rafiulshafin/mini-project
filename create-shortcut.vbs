Set WshShell = CreateObject("WScript.Shell")
strDesktop = WshShell.SpecialFolders("Desktop")
Set oShortcut = WshShell.CreateShortcut(strDesktop & "\TaskFlow.lnk")
oShortcut.TargetPath = "E:\mini project\TaskFlow-App.bat"
oShortcut.WorkingDirectory = "E:\mini project"
oShortcut.Description = "TaskFlow Protocol v2.5 PRO"
oShortcut.IconLocation = "shell32.dll,221"
oShortcut.Save
WScript.Echo "SUCCESS: Shortcut updated at " & strDesktop & "\TaskFlow.lnk"
