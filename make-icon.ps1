$source = @"
using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.IO;

public class IconMaker {
    public static void Create(string icoPath, string pngPath) {
        using (Bitmap bmp = new Bitmap(128, 128))
        using (Graphics g = Graphics.FromImage(bmp)) {
            g.SmoothingMode = SmoothingMode.AntiAlias;
            g.Clear(Color.Transparent);
            Rectangle rect = new Rectangle(4, 4, 120, 120);
            using (GraphicsPath path = new GraphicsPath()) {
                int r = 26;
                path.AddArc(4, 4, r, r, 180, 90);
                path.AddArc(124 - r, 4, r, r, 270, 90);
                path.AddArc(124 - r, 124 - r, r, r, 0, 90);
                path.AddArc(4, 124 - r, r, r, 90, 90);
                path.CloseFigure();
                using (LinearGradientBrush brush = new LinearGradientBrush(rect, Color.FromArgb(255, 26, 64), Color.FromArgb(170, 0, 28), 45f)) {
                    g.FillPath(brush, path);
                }
                using (Pen pen = new Pen(Color.FromArgb(240, 255, 255, 255), 3f)) {
                    g.DrawPath(pen, path);
                }
            }
            Point[] pts = new Point[] {
                new Point(70, 20),
                new Point(38, 66),
                new Point(64, 66),
                new Point(56, 108),
                new Point(90, 58),
                new Point(68, 58)
            };
            using (SolidBrush bolt = new SolidBrush(Color.White)) {
                g.FillPolygon(bolt, pts);
            }
            bmp.Save(pngPath, System.Drawing.Imaging.ImageFormat.Png);
            IntPtr hIcon = bmp.GetHicon();
            using (Icon icon = Icon.FromHandle(hIcon))
            using (FileStream fs = new FileStream(icoPath, FileMode.Create)) {
                icon.Save(fs);
            }
        }
    }
}
"@

Add-Type -TypeDefinition $source -ReferencedAssemblies "System.Drawing.dll"

$ico = "E:\mini project\taskflow.ico"
$png = "E:\mini project\public\icons\app.png"
[IconMaker]::Create($ico, $png)

$ws = New-Object -ComObject WScript.Shell
$desktop = [System.Environment]::GetFolderPath('Desktop')
$shortcutPath = Join-Path $desktop 'TaskFlow.lnk'

if (Test-Path $shortcutPath) {
    $s = $ws.CreateShortcut($shortcutPath)
    $s.IconLocation = "$ico,0"
    $s.Save()
    Write-Output "CUSTOM_ICON_APPLIED_SUCCESS"
}
