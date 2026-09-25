<#
    Icons-Erzeugen.ps1 - zeichnet die App-Zeichen von Typoluck als PNG.

    Warum PNG, wenn es icon.svg gibt? Der Startbildschirm von iPhone und iPad
    nimmt ausschliesslich PNG. Damit beides aus derselben Quelle stammt,
    stehen hier DIESELBEN Koordinaten wie in icon.svg - wer das Zeichen
    aendert, aendert beide Dateien und sieht sich das Ergebnis in 32 Pixeln an.

    Erzeugt werden:
        icons\icon-512.png    Startbildschirm und Vorschau
        icons\icon-192.png    Startbildschirm (Android)
        icons\icon-180.png    Startbildschirm (Apple)
        icons\icon-32.png     Lesezeichen im Browser

    Aufruf:
        powershell -ExecutionPolicy Bypass -File "tools\Icons-Erzeugen.ps1"

    Bordmittel (System.Drawing), kein Node, kein Python. Pfade relativ zu
    diesem Skript.
#>

$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

$hier          = Split-Path -Parent $MyInvocation.MyCommand.Path
$projektOrdner = Split-Path -Parent $hier
$zielOrdner    = Join-Path $projektOrdner "icons"

if (-not (Test-Path -LiteralPath $zielOrdner)) {
    New-Item -ItemType Directory -Path $zielOrdner | Out-Null
}

# ---------------------------------------------------------------------
# Die Farben und Formen - dieselben Werte wie in icon.svg (512er-Raster)
# ---------------------------------------------------------------------

$violett = [System.Drawing.ColorTranslator]::FromHtml("#5b3cc4")
$orange  = [System.Drawing.ColorTranslator]::FromHtml("#e8702a")
$blau    = [System.Drawing.ColorTranslator]::FromHtml("#3f8fe0")
$weiss   = [System.Drawing.Color]::White

# Abgerundetes Rechteck als Zeichenpfad (x, y, Breite, Hoehe, Radius).
function New-RundesRechteck {
    param([single]$X, [single]$Y, [single]$B, [single]$H, [single]$R)

    $pfad = New-Object System.Drawing.Drawing2D.GraphicsPath
    $d = 2 * $R
    $pfad.AddArc($X, $Y, $d, $d, 180, 90)
    $pfad.AddArc($X + $B - $d, $Y, $d, $d, 270, 90)
    $pfad.AddArc($X + $B - $d, $Y + $H - $d, $d, $d, 0, 90)
    $pfad.AddArc($X, $Y + $H - $d, $d, $d, 90, 90)
    $pfad.CloseFigure()
    return $pfad
}

function New-Icon {
    param([int]$Kantenlaenge, [string]$Datei)

    $m = $Kantenlaenge / 512.0

    $bild = New-Object System.Drawing.Bitmap($Kantenlaenge, $Kantenlaenge)
    $g = [System.Drawing.Graphics]::FromImage($bild)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.Clear([System.Drawing.Color]::Transparent)

    # Grund
    $grund = New-RundesRechteck -X 0 -Y 0 -B (512 * $m) -H (512 * $m) -R (96 * $m)
    $pinsel = New-Object System.Drawing.SolidBrush($violett)
    $g.FillPath($pinsel, $grund)
    $pinsel.Dispose()

    # Orange Kachel (seit 0.6.2; bis 0.6.1 gruen - NYT-Look, siehe icon.svg)
    $kachel = New-RundesRechteck -X (96 * $m) -Y (160 * $m) -B (256 * $m) -H (256 * $m) -R (36 * $m)
    $pinsel = New-Object System.Drawing.SolidBrush($orange)
    $g.FillPath($pinsel, $kachel)
    $pinsel.Dispose()

    # Das T aus zwei Rechtecken
    $pinsel = New-Object System.Drawing.SolidBrush($weiss)
    $g.FillRectangle($pinsel, [single](144 * $m), [single](212 * $m), [single](160 * $m), [single](44 * $m))
    $g.FillRectangle($pinsel, [single](202 * $m), [single](212 * $m), [single](44 * $m), [single](160 * $m))
    $pinsel.Dispose()

    # Blaue Kachel mit violettem Rand (der Rand trennt sie von der orangen)
    $klein = New-RundesRechteck -X (312 * $m) -Y (88 * $m) -B (104 * $m) -H (104 * $m) -R (22 * $m)
    $pinsel = New-Object System.Drawing.SolidBrush($blau)
    $g.FillPath($pinsel, $klein)
    $pinsel.Dispose()
    $stift = New-Object System.Drawing.Pen($violett, [single](12 * $m))
    $g.DrawPath($stift, $klein)
    $stift.Dispose()

    $grund.Dispose()
    $kachel.Dispose()
    $klein.Dispose()
    $g.Dispose()

    $ziel = Join-Path $zielOrdner $Datei
    $bild.Save($ziel, [System.Drawing.Imaging.ImageFormat]::Png)
    $bild.Dispose()

    $groesse = [math]::Round((Get-Item -LiteralPath $ziel).Length / 1KB, 1)
    Write-Host ("  {0,-16} {1}x{1}  {2} KB" -f $Datei, $Kantenlaenge, $groesse)
}

Write-Host ""
Write-Host "App-Zeichen werden gezeichnet:" -ForegroundColor Cyan

New-Icon -Kantenlaenge 512 -Datei "icon-512.png"
New-Icon -Kantenlaenge 192 -Datei "icon-192.png"
New-Icon -Kantenlaenge 180 -Datei "icon-180.png"
New-Icon -Kantenlaenge 32  -Datei "icon-32.png"

Write-Host ""
Write-Host "Fertig: $zielOrdner" -ForegroundColor Green
