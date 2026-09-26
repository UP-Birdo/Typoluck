<#
    Lokal-Starten.ps1 - liefert den Projektordner auf dem eigenen Rechner aus,
    damit die Seite vor dem Hochladen richtig geprueft werden kann.

    Warum ein Server? Per Doppelklick geoeffnet laeuft die Seite unter
    "file://". Dort gibt es keinen Service Worker, und die Datenbank-Abfragen
    verhalten sich anders. Unter "http://localhost:8091" verhaelt sich alles
    wie spaeter auf GitHub Pages - nur der Service Worker schaltet dort auf
    "Netz zuerst" (siehe sw.js, BEIM_BAUEN), damit jede Aenderung sofort
    sichtbar ist.

    ACHTUNG: Auch lokal spricht die App mit der ECHTEN Datenbank (dieselbe
    wie Blunderluck). Zum Ansehen ohne echte Daten die Werkstatt benutzen:
        http://localhost:8091/?werkstatt
    (Schalter: Kopf von js\werkstatt.js)

    Aufruf:
        powershell -ExecutionPolicy Bypass -File "tools\Lokal-Starten.ps1"
    oder "tools\Typoluck lokal starten.cmd" doppelklicken. Ende mit Strg+C.

    Mit -OhneBrowser startet nur der Server (fuer Bildschirmfotos mit Edge
    kopflos, ohne dass ein Fenster aufgeht).
#>

param(
    [int]$Port = 8091,
    [switch]$OhneBrowser
)

$ErrorActionPreference = "Stop"

$hier          = Split-Path -Parent $MyInvocation.MyCommand.Path
$projektOrdner = Split-Path -Parent $hier

$inhaltstypen = @{
    ".html"        = "text/html; charset=utf-8"
    ".css"         = "text/css; charset=utf-8"
    ".js"          = "application/javascript; charset=utf-8"
    ".json"        = "application/json; charset=utf-8"
    ".webmanifest" = "application/manifest+json; charset=utf-8"
    ".svg"         = "image/svg+xml"
    ".png"         = "image/png"
    ".ico"         = "image/x-icon"
    ".md"          = "text/plain; charset=utf-8"
    ".txt"         = "text/plain; charset=utf-8"
    ".woff2"       = "font/woff2"
}

$zuhoerer = New-Object System.Net.HttpListener
$zuhoerer.Prefixes.Add("http://localhost:$Port/")

try {
    $zuhoerer.Start()
} catch {
    Write-Host "Der Port $Port ist belegt oder gesperrt: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Typoluck laeuft unter http://localhost:$Port/" -ForegroundColor Green
Write-Host "Ohne echte Daten ansehen:  http://localhost:$Port/?werkstatt"
Write-Host "Ordner: $projektOrdner"
Write-Host "Beenden mit Strg+C."
Write-Host ""

if (-not $OhneBrowser) {
    try {
        Start-Process "http://localhost:$Port/"
    } catch {
        # Kein Browser gestartet - kein Grund abzubrechen.
    }
}

while ($zuhoerer.IsListening) {

    $zusammenhang = $zuhoerer.GetContext()
    $anfrage      = $zusammenhang.Request
    $antwort      = $zusammenhang.Response

    $relativerPfad = [System.Uri]::UnescapeDataString($anfrage.Url.AbsolutePath).TrimStart("/")
    if ($relativerPfad -eq "") {
        $relativerPfad = "index.html"
    }

    $datei = Join-Path $projektOrdner ($relativerPfad -replace "/", "\")

    # Ausbruch aus dem Projektordner verhindern - der Vergleich braucht das
    # Trennzeichen am Ende, sonst gaelte ein Nachbarordner mit gleichem
    # Namensanfang als "innerhalb".
    $vollerPfad = [System.IO.Path]::GetFullPath($datei)
    $wurzel     = [System.IO.Path]::GetFullPath($projektOrdner)
    if (-not $wurzel.EndsWith([System.IO.Path]::DirectorySeparatorChar)) {
        $wurzel += [System.IO.Path]::DirectorySeparatorChar
    }

    if (-not $vollerPfad.StartsWith($wurzel, [System.StringComparison]::OrdinalIgnoreCase)) {
        $antwort.StatusCode = 403
        $antwort.Close()
        continue
    }

    if (Test-Path -LiteralPath $vollerPfad -PathType Leaf) {
        $endung = [System.IO.Path]::GetExtension($vollerPfad).ToLowerInvariant()
        $typ    = $inhaltstypen[$endung]
        if (-not $typ) {
            $typ = "application/octet-stream"
        }

        $inhalt = [System.IO.File]::ReadAllBytes($vollerPfad)
        $antwort.ContentType = $typ
        $antwort.ContentLength64 = $inhalt.Length
        $antwort.Headers.Add("Cache-Control", "no-store")
        $antwort.OutputStream.Write($inhalt, 0, $inhalt.Length)
        Write-Host "200  $relativerPfad"
    } else {
        $antwort.StatusCode = 404
        $text = [System.Text.Encoding]::UTF8.GetBytes("Nicht gefunden: $relativerPfad")
        $antwort.ContentType = "text/plain; charset=utf-8"
        $antwort.OutputStream.Write($text, 0, $text.Length)
        Write-Host "404  $relativerPfad" -ForegroundColor Yellow
    }

    $antwort.Close()
}
