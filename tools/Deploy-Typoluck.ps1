<#
    Deploy-Typoluck.ps1 - laedt das Projekt nach GitHub, ohne git und ohne
    Weboberflaeche. Reine PowerShell-Aufrufe gegen die GitHub-Schnittstelle
    (Haus-Muster wie Blunderluck, Trainer, Quizz, Lernheft).

    ERSTE EINRICHTUNG (einmalig, macht der Nutzer selbst):

        1. Auf github.com unter up-birdo ein Repository "Typoluck" anlegen,
           OEFFENTLICH, mit "Add a README file" (ein leeres Repository hat
           keinen Zweig "main", an den dieses Skript anhaengen koennte).
        2. Token anlegen: github.com -> Settings -> Developer settings ->
           Personal access tokens -> Fine-grained tokens -> Generate new token
             - Repository access: Only select repositories -> Typoluck
             - Permissions -> Repository permissions:
                 Contents: Read and write
                 Issues:   Read and write  (fuer Wuensche-Abholen -Schliessen)
        3. Token hinterlegen:
               powershell -ExecutionPolicy Bypass -File "tools\Deploy-Typoluck.ps1" -SetToken
           Er wird per DPAPI verschluesselt neben dem Skript abgelegt und laesst
           sich nur von DIESEM Windows-Konto auf DIESEM Rechner lesen.
        4. Nach der ersten Auslieferung: Settings -> Pages -> Branch "main",
           Ordner "/ (root)" -> Save.

    NORMALER AUFRUF (alle geaenderten Dateien in EINEM Commit):

        powershell -ExecutionPolicy Bypass -File "tools\Deploy-Typoluck.ps1"

    Nur nachsehen, ohne zu senden:

        powershell -ExecutionPolicy Bypass -File "tools\Deploy-Typoluck.ps1" -NurAnzeigen

    Warum ein einziger Commit? GitHub Pages baut nach jedem Commit neu und
    erlaubt nur wenige Bauvorgaenge je Stunde.
#>

param(
    [switch]$SetToken,
    [switch]$NurAnzeigen,
    [string]$Nachricht = ""
)

$ErrorActionPreference = "Stop"

$hier          = Split-Path -Parent $MyInvocation.MyCommand.Path
$projektOrdner = Split-Path -Parent $hier
$tokenDatei    = Join-Path $hier "github-token.dat"

$Besitzer   = "up-birdo"
$Repository = "Typoluck"
$Zweig      = "main"

# ---------------------------------------------------------------------
# Was wird hochgeladen
#
# Freigegeben sind die Wurzeldateien unten und die genannten Ordner.
# Alles andere bleibt liegen - insbesondere die interne Planung und der
# Zugriffsschluessel. "sw.js" MUSS mit: Ein Service Worker darf nur den
# Ordner bedienen, in dem er liegt.
# ---------------------------------------------------------------------

$freigegebeneDateien = @("index.html", "sw.js", "README.md", "CHANGELOG.md",
                         "manifest.webmanifest", "icon.svg")
# "schrift" seit 0.8.0: die Crew-Schriften (woff2) samt LIZENZ.txt - der
# Service Worker verlangt sie, ohne sie scheitert seine Installation.
$freigegebeneOrdner  = @("css", "js", "icons", "schrift", "docs", "tests", "tools", ".github")
$gesperrteDateien    = @("TODO.md", "TODO-Archiv.md", "ROADMAP.md", "ROADMAP-Archiv.md",
                         "CLAUDE.md", "STATUS.md", "github-token.dat")

# Diese Endungen sind KEIN Text und muessen als eigener Datenklumpen (Blob)
# hochgeladen werden.
$binaerEndungen = @(".png", ".jpg", ".jpeg", ".gif", ".ico", ".webp", ".glb", ".woff2")

# ---------------------------------------------------------------------
# Zugriffsschluessel hinterlegen
# ---------------------------------------------------------------------

if ($SetToken) {
    Write-Host ""
    Write-Host "Zugriffsschluessel fuer GitHub hinterlegen" -ForegroundColor Cyan
    Write-Host "Der Schluessel wird verschluesselt abgelegt und nicht angezeigt."
    Write-Host ""

    $geheim = Read-Host -Prompt "Token einfuegen" -AsSecureString
    if (-not $geheim -or $geheim.Length -eq 0) {
        Write-Host "Nichts eingegeben - abgebrochen." -ForegroundColor Yellow
        exit 1
    }

    # WriteAllText statt Set-Content: Set-Content haengt einen Zeilenumbruch
    # an, und ConvertTo-SecureString scheitert spaeter daran.
    $verschluesselt = ConvertFrom-SecureString -SecureString $geheim
    [System.IO.File]::WriteAllText($tokenDatei, $verschluesselt, [System.Text.ASCIIEncoding]::new())
    Write-Host "Gespeichert unter: $tokenDatei" -ForegroundColor Green
    Write-Host "Diese Datei gehoert NICHT ins Repository (steht auf der Sperrliste)."
    exit 0
}

if (-not (Test-Path -LiteralPath $tokenDatei)) {
    Write-Host "Kein Zugriffsschluessel hinterlegt." -ForegroundColor Red
    Write-Host "Einmalig einrichten mit:  Deploy-Typoluck.ps1 -SetToken"
    exit 1
}

try {
    # Trim: eine Ablage mit Zeilenumbruch am Ende wuerde das Entschluesseln sprengen.
    $gespeichert = (Get-Content -LiteralPath $tokenDatei -Raw).Trim()
    $geheim = ConvertTo-SecureString -String $gespeichert
    $roh    = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($geheim)
    $token  = [System.Runtime.InteropServices.Marshal]::PtrToStringBSTR($roh)
    [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($roh)
} catch {
    Write-Host "Der hinterlegte Schluessel laesst sich nicht lesen: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "DPAPI ist an das Windows-KONTO gebunden - unter der anderen Anmeldung"
    Write-Host "dieses Rechners gilt er nicht. Neu hinterlegen mit:  Deploy-Typoluck.ps1 -SetToken"
    exit 1
}

$kopfzeilen = @{
    "Authorization" = "Bearer $token"
    "Accept"        = "application/vnd.github+json"
    "User-Agent"    = "Deploy-Typoluck"
}

# ---------------------------------------------------------------------
# Hilfsfunktionen
# ---------------------------------------------------------------------

function Invoke-GitHub {
    param(
        [string]$Pfad,
        [string]$Methode = "GET",
        $Koerper = $null
    )

    $adresse = "https://api.github.com/repos/$Besitzer/$Repository$Pfad"

    if ($null -ne $Koerper) {
        $text  = $Koerper | ConvertTo-Json -Depth 12 -Compress
        $bytes = [System.Text.Encoding]::UTF8.GetBytes($text)
        return Invoke-RestMethod -Uri $adresse -Method $Methode -Headers $kopfzeilen `
                                 -Body $bytes -ContentType "application/json; charset=utf-8"
    }

    return Invoke-RestMethod -Uri $adresse -Method $Methode -Headers $kopfzeilen
}

# Git-Kennung einer Datei, so wie Git sie bildet - damit erkennt das Skript
# ohne Hochladen, ob sich eine Datei geaendert hat.
function Get-BlobKennung {
    param([byte[]]$Bytes)

    $kopf   = [System.Text.Encoding]::ASCII.GetBytes("blob $($Bytes.Length)" + [char]0)
    $gesamt = New-Object byte[] ($kopf.Length + $Bytes.Length)
    [Array]::Copy($kopf, 0, $gesamt, 0, $kopf.Length)
    [Array]::Copy($Bytes, 0, $gesamt, $kopf.Length, $Bytes.Length)

    $sha = [System.Security.Cryptography.SHA1]::Create()
    return (($sha.ComputeHash($gesamt) | ForEach-Object { $_.ToString("x2") }) -join "")
}

# ---------------------------------------------------------------------
# Dateien einsammeln
# ---------------------------------------------------------------------

$dateien = New-Object System.Collections.Generic.List[object]

function Add-Datei {
    param([System.IO.FileInfo]$Datei)

    if ($gesperrteDateien -contains $Datei.Name) {
        return
    }

    $relativ = $Datei.FullName.Substring($projektOrdner.Length + 1).Replace("\", "/")
    $bytes   = [System.IO.File]::ReadAllBytes($Datei.FullName)
    $istText = -not ($binaerEndungen -contains $Datei.Extension.ToLowerInvariant())

    $dateien.Add([pscustomobject]@{
        Pfad    = $relativ
        IstText = $istText
        Inhalt  = if ($istText) {
                      [System.Text.Encoding]::UTF8.GetString($bytes)
                  } else {
                      [System.Convert]::ToBase64String($bytes)
                  }
        Kennung = Get-BlobKennung -Bytes $bytes
    })
}

foreach ($name in $freigegebeneDateien) {
    $voll = Join-Path $projektOrdner $name
    if (Test-Path -LiteralPath $voll -PathType Leaf) {
        Add-Datei -Datei (Get-Item -LiteralPath $voll)
    }
}

foreach ($ordner in $freigegebeneOrdner) {
    $voll = Join-Path $projektOrdner $ordner
    if (Test-Path -LiteralPath $voll -PathType Container) {
        Get-ChildItem -LiteralPath $voll -Recurse -File | ForEach-Object { Add-Datei -Datei $_ }
    }
}

if ($dateien.Count -eq 0) {
    Write-Host "Keine Dateien gefunden - nichts zu tun." -ForegroundColor Yellow
    exit 1
}

# Version fuer die Commit-Beschreibung aus js\konfig.js lesen.
$version = "?"
$konfigDatei = Join-Path $projektOrdner "js\konfig.js"
if (Test-Path -LiteralPath $konfigDatei) {
    $konfigText = Get-Content -LiteralPath $konfigDatei -Raw
    if ($konfigText -match 'APP_VERSION:\s*"([^"]+)"') {
        $version = $Matches[1]
    }
}

if (-not $Nachricht) {
    $Nachricht = "Typoluck v$version"
}

# ---------------------------------------------------------------------
# Mit dem Stand auf GitHub vergleichen
# ---------------------------------------------------------------------

Write-Host ""
Write-Host "Typoluck v$version -> $Besitzer/$Repository ($Zweig)" -ForegroundColor Cyan

try {
    $ref       = Invoke-GitHub -Pfad "/git/ref/heads/$Zweig"
    $commitAlt = Invoke-GitHub -Pfad "/git/commits/$($ref.object.sha)"
    $baum      = Invoke-GitHub -Pfad "/git/trees/$($commitAlt.tree.sha)?recursive=1"
} catch {
    Write-Host "Kein Zugriff auf das Repository: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Gibt es das Repository mit einer README (Zweig main)? Stimmen Token und Rechte?"
    exit 1
}

$vorhanden = @{}
foreach ($eintrag in $baum.tree) {
    if ($eintrag.type -eq "blob") {
        $vorhanden[$eintrag.path] = $eintrag.sha
    }
}

$geaendert = @()
foreach ($datei in $dateien) {
    if (-not $vorhanden.ContainsKey($datei.Pfad)) {
        $geaendert += [pscustomobject]@{ Datei = $datei; Art = "neu" }
    } elseif ($vorhanden[$datei.Pfad] -ne $datei.Kennung) {
        $geaendert += [pscustomobject]@{ Datei = $datei; Art = "geaendert" }
    }
}

Write-Host "Geprueft: $($dateien.Count) Dateien, davon zu senden: $($geaendert.Count)"
foreach ($eintrag in $geaendert) {
    Write-Host ("   {0,-10} {1}" -f $eintrag.Art, $eintrag.Datei.Pfad)
}

if ($geaendert.Count -eq 0) {
    Write-Host "Alles auf dem neuesten Stand." -ForegroundColor Green
    exit 0
}

if ($NurAnzeigen) {
    Write-Host "Nur angezeigt - es wurde nichts gesendet." -ForegroundColor Yellow
    exit 0
}

# ---------------------------------------------------------------------
# In einem einzigen Commit hochladen
# ---------------------------------------------------------------------

Write-Host ""
Write-Host "Wird gesendet ..." -ForegroundColor Cyan

$baumEintraege = @()
foreach ($eintrag in $geaendert) {
    if ($eintrag.Datei.IstText) {
        $baumEintraege += @{
            path    = $eintrag.Datei.Pfad
            mode    = "100644"
            type    = "blob"
            content = $eintrag.Datei.Inhalt
        }
    } else {
        $blob = Invoke-GitHub -Pfad "/git/blobs" -Methode "POST" -Koerper @{
            content  = $eintrag.Datei.Inhalt
            encoding = "base64"
        }
        $baumEintraege += @{
            path = $eintrag.Datei.Pfad
            mode = "100644"
            type = "blob"
            sha  = $blob.sha
        }
        Write-Host ("   Bild vorbereitet: {0}" -f $eintrag.Datei.Pfad)
    }
}

$neuerBaum = Invoke-GitHub -Pfad "/git/trees" -Methode "POST" -Koerper @{
    base_tree = $commitAlt.tree.sha
    tree      = $baumEintraege
}

$neuerCommit = Invoke-GitHub -Pfad "/git/commits" -Methode "POST" -Koerper @{
    message = $Nachricht
    tree    = $neuerBaum.sha
    parents = @($ref.object.sha)
}

Invoke-GitHub -Pfad "/git/refs/heads/$Zweig" -Methode "PATCH" -Koerper @{
    sha = $neuerCommit.sha
} | Out-Null

Write-Host ""
Write-Host "Fertig. Commit: $($neuerCommit.sha.Substring(0,7)) - $Nachricht" -ForegroundColor Green
Write-Host "Die Seite ist in ein bis zwei Minuten aktuell:"
Write-Host "   https://$Besitzer.github.io/$Repository/"
exit 0
