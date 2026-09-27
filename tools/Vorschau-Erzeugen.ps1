<#
    Vorschau-Erzeugen.ps1 - zeichnet das Vorschaubild fuer geteilte Links
    (seit 0.15.5): icons\vorschau.png, 1200 x 630 Pixel (das Mass, das
    iMessage, WhatsApp und Co. fuer og:image erwarten).

    Inhalt: Grund in der Werkstatt-Farbwelt (dunkel), links das App-Zeichen
    (icons\icon-512.png aus der Design-Sitzung), rechts "Typoluck" und
    "Wortspiele mit Freunden", darunter fuenf Kacheln in Orange/Blau/Grau
    wie im Spiel (nie Gruen/Gelb - NYT-Look, CLAUDE.md).

    Aufruf:
        powershell -ExecutionPolicy Bypass -File "tools\Vorschau-Erzeugen.ps1"

    Bordmittel (System.Drawing), kein Node, kein Python. Pfade relativ zu
    diesem Skript. Aendert sich das App-Zeichen, dieses Skript neu laufen
    lassen.
#>

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

$hier          = Split-Path -Parent $MyInvocation.MyCommand.Path
$projektOrdner = Split-Path -Parent $hier
$zeichenDatei  = Join-Path $projektOrdner "icons\icon-512.png"
$ziel          = Join-Path $projektOrdner "icons\vorschau.png"

$breite = 1200
$hoehe  = 630

# Werkstatt dunkel (js\upcrew-intro.js, WELTEN.werkstatt.dunkel)
$grundFarbe  = [System.Drawing.ColorTranslator]::FromHtml("#17181a")
$flaeche     = [System.Drawing.ColorTranslator]::FromHtml("#232427")
$schrift     = [System.Drawing.ColorTranslator]::FromHtml("#eeebe4")
$leise       = [System.Drawing.ColorTranslator]::FromHtml("#8f8c85")
$orange      = [System.Drawing.ColorTranslator]::FromHtml("#e8702a")
$blau        = [System.Drawing.ColorTranslator]::FromHtml("#3f8fe0")
$grau        = [System.Drawing.ColorTranslator]::FromHtml("#474b53")

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

$bild = New-Object System.Drawing.Bitmap($breite, $hoehe)
$g = [System.Drawing.Graphics]::FromImage($bild)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.Clear($grundFarbe)

# Karte in der Mitte (harte Kante unten, kein weicher Schatten)
$karte = New-RundesRechteck -X 60 -Y 60 -B 1080 -H 510 -R 40
$kante = New-RundesRechteck -X 60 -Y 70 -B 1080 -H 510 -R 40
$pinsel = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::Black)
$g.FillPath($pinsel, $kante)
$pinsel.Dispose()
$pinsel = New-Object System.Drawing.SolidBrush($flaeche)
$g.FillPath($pinsel, $karte)
$pinsel.Dispose()

# Das App-Zeichen links
$zeichen = [System.Drawing.Image]::FromFile($zeichenDatei)
$g.DrawImage($zeichen, 120, 135, 330, 330)
$zeichen.Dispose()

# Schrift rechts
$familie = "Segoe UI"
$titel = New-Object System.Drawing.Font($familie, 84, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
$unter = New-Object System.Drawing.Font($familie, 38, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
$pinsel = New-Object System.Drawing.SolidBrush($schrift)
$g.DrawString("Typoluck", $titel, $pinsel, 500, 150)
$pinsel.Dispose()
$pinsel = New-Object System.Drawing.SolidBrush($leise)
$g.DrawString("Wortspiele mit Freunden", $unter, $pinsel, 506, 262)
$pinsel.Dispose()

# Fuenf Kacheln wie im Spiel
$farben = @($orange, $blau, $grau, $orange, $grau)
$buchstaben = @("W", "O", "R", "T", "E")
$kachelSchrift = New-Object System.Drawing.Font($familie, 54, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
$format = New-Object System.Drawing.StringFormat
$format.Alignment = [System.Drawing.StringAlignment]::Center
$format.LineAlignment = [System.Drawing.StringAlignment]::Center
for ($i = 0; $i -lt 5; $i++) {
    $x = 506 + $i * 118
    $kachel = New-RundesRechteck -X $x -Y 350 -B 104 -H 104 -R 14
    $pinsel = New-Object System.Drawing.SolidBrush($farben[$i])
    $g.FillPath($pinsel, $kachel)
    $pinsel.Dispose()
    $pinsel = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    $rechteck = New-Object System.Drawing.RectangleF([single]$x, [single]350, [single]104, [single]104)
    $g.DrawString($buchstaben[$i], $kachelSchrift, $pinsel, $rechteck, $format)
    $pinsel.Dispose()
    $kachel.Dispose()
}

$g.Dispose()
$bild.Save($ziel, [System.Drawing.Imaging.ImageFormat]::Png)
$bild.Dispose()

$groesse = [math]::Round((Get-Item -LiteralPath $ziel).Length / 1KB, 1)
Write-Host ("Vorschaubild: {0} ({1} KB)" -f $ziel, $groesse)
