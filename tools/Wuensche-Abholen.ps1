#requires -Version 7.0
<#
.SYNOPSIS
    Holt offene Wuensche von GitHub und traegt sie in TODO.md ein.

.DESCRIPTION
    Gegenstueck zum Knopf "Wunsch oder Fehler melden" im Profil der App:

        App  ->  vorbefuelltes GitHub-Formular  ->  Eintrag im Repo
             ->  DIESES SKRIPT  ->  TODO.md "## Anfragen"
             ->  Nutzer schreibt "bestaetigt" dahinter  ->  ROADMAP.md

    Lesen braucht keinen Schluessel (oeffentliches Repo, 60 anonyme Abfragen
    je Stunde). Nur -Schliessen braucht den Token von Deploy-Typoluck.ps1.

    Doppelte Eintraege sind ausgeschlossen: Jede Zeile traegt die Nummer des
    GitHub-Eintrags als [#12] am ANFANG einer Listenzeile. Gesucht wird nur
    dort - ein Beispiel "[#12]" im Fliesstext verschluckt so nie einen echten
    Wunsch (Lehre aus Blunderluck, 13.08.2026).

.EXAMPLE
    .\tools\Wuensche-Abholen.ps1 -Zeigen
    .\tools\Wuensche-Abholen.ps1
    .\tools\Wuensche-Abholen.ps1 -Schliessen 12,14
#>
[CmdletBinding()]
param(
    [switch] $Zeigen,
    [int[]]  $Schliessen
)

$ErrorActionPreference = "Stop"

$hier          = Split-Path -Parent $MyInvocation.MyCommand.Path
$projektOrdner = Split-Path -Parent $hier
$todoDatei     = Join-Path $projektOrdner "TODO.md"
$tokenDatei    = Join-Path $hier "github-token.dat"

$Besitzer   = "up-birdo"
$Repository = "Typoluck"

function Token-Lesen {
    if (-not (Test-Path -LiteralPath $tokenDatei)) {
        throw "Kein Token hinterlegt. Einmalig anlegen mit: tools\Deploy-Typoluck.ps1 -SetToken"
    }
    $verschluesselt = [System.IO.File]::ReadAllText($tokenDatei).Trim()
    $sicher = ConvertTo-SecureString -String $verschluesselt
    return [System.Net.NetworkCredential]::new("", $sicher).Password
}

function Anfragen-Holen {
    $adresse = "https://api.github.com/repos/$Besitzer/$Repository/issues?state=open&per_page=100"
    $kopf = @{ "Accept" = "application/vnd.github+json"; "User-Agent" = "Typoluck-Wuensche" }
    try {
        return Invoke-RestMethod -Uri $adresse -Headers $kopf -TimeoutSec 30
    } catch {
        throw "GitHub nicht erreichbar: $($_.Exception.Message)"
    }
}

# Zieht aus dem Formular-Text die eigentliche Idee heraus (Abschnitt
# "### Was wuenschst du dir?").
function Idee-Auslesen {
    param([string] $Rumpf)

    if (-not $Rumpf) { return "" }

    $sammeln = $false
    $text = @()
    foreach ($zeile in ($Rumpf -split "`r?`n")) {
        if ($zeile -match "^###\s") {
            $sammeln = ($zeile -match "Was ")
            continue
        }
        if ($sammeln -and $zeile.Trim() -ne "" -and $zeile.Trim() -ne "_No response_") {
            $text += $zeile.Trim()
        }
    }
    if ($text.Count -eq 0) {
        return ($Rumpf -replace "`r?`n", " ").Trim()
    }
    return ($text -join " ")
}

# ---------------------------------------------------------------------
# Schliessen
# ---------------------------------------------------------------------

if ($Schliessen) {
    $token = Token-Lesen
    $kopf = @{
        "Accept"        = "application/vnd.github+json"
        "Authorization" = "Bearer $token"
        "User-Agent"    = "Typoluck-Wuensche"
    }
    foreach ($nummer in $Schliessen) {
        $adresse = "https://api.github.com/repos/$Besitzer/$Repository/issues/$nummer"
        try {
            Invoke-RestMethod -Uri $adresse -Method Patch -Headers $kopf `
                -Body (@{ state = "closed" } | ConvertTo-Json) -ContentType "application/json" | Out-Null
            Write-Host "Eintrag #$nummer geschlossen." -ForegroundColor Green
        } catch {
            if ($_.Exception.Response -and $_.Exception.Response.StatusCode.value__ -eq 403) {
                Write-Host "Eintrag #$nummer NICHT geschlossen: Der Token darf keine Eintraege aendern." -ForegroundColor Yellow
                Write-Host "  Abhilfe: im Token 'Issues: Read and write' ergaenzen, dann -SetToken erneut." -ForegroundColor Yellow
            } else {
                Write-Host "Eintrag #$nummer NICHT geschlossen: $($_.Exception.Message)" -ForegroundColor Red
            }
        }
    }
    exit 0
}

# ---------------------------------------------------------------------
# Holen und eintragen
#
# STILLE FALLE: Invoke-RestMethod gibt eine JSON-Liste als EIN Objekt aus.
# Direkt gepipet kaeme das ganze Array als ein Wert an. Der Umweg ueber die
# Variable entrollt es; @(...) haelt Count auch bei null und einem Treffer.
# ---------------------------------------------------------------------

$roh = Anfragen-Holen
$anfragen = @($roh | Where-Object { -not $_.pull_request })

if ($anfragen.Count -eq 0) {
    Write-Host "Keine offenen Wuensche." -ForegroundColor Green
    exit 0
}

$todoText = [System.IO.File]::ReadAllText($todoDatei)
$neue = @()

foreach ($anfrage in $anfragen) {
    if ($todoText -match ("(?m)^\s*-\s*\[#" + $anfrage.number + "\]")) {
        continue
    }
    $idee = Idee-Auslesen -Rumpf $anfrage.body
    if (-not $idee) { $idee = $anfrage.title }
    $neue += [PSCustomObject]@{
        Marke = "[#$($anfrage.number)]"
        Text  = $idee
        Von   = $anfrage.user.login
    }
}

if ($neue.Count -eq 0) {
    Write-Host "Nichts Neues - alle $($anfragen.Count) offenen Wuensche stehen schon in TODO.md." -ForegroundColor Green
    exit 0
}

Write-Host "$($neue.Count) neue(r) Wunsch/Wuensche:" -ForegroundColor Cyan
foreach ($eintrag in $neue) {
    Write-Host "   $($eintrag.Marke) $($eintrag.Text)"
}

if ($Zeigen) {
    Write-Host ""
    Write-Host "Nur angezeigt - es wurde nichts geschrieben." -ForegroundColor Yellow
    exit 0
}

$zeilen = foreach ($eintrag in $neue) {
    "- $($eintrag.Marke) $($eintrag.Text) - von $($eintrag.Von)"
}

$abschnitt = "## Anfragen"
if (-not $todoText.Contains($abschnitt)) {
    throw "In TODO.md fehlt der Abschnitt '## Anfragen' - bitte pruefen."
}

# Ans ENDE des Abschnitts, damit der erklaerende Absatz darunter heil bleibt.
$start    = $todoText.IndexOf($abschnitt) + $abschnitt.Length
$naechste = $todoText.IndexOf("`n## ", $start)
if ($naechste -lt 0) { $naechste = $todoText.Length }

$bisher = $todoText.Substring($start, $naechste - $start)
$bisher = ($bisher -replace "(?m)^-\s*\(noch nichts\)\s*$", "").TrimEnd()
$letzte = ($bisher -split "`r?`n")[-1]
$trenner = if ($letzte -match "^\s*-\s") { "`n" } else { "`n`n" }
$bisher = $bisher + $trenner + ($zeilen -join "`n") + "`n"

$todoText = $todoText.Remove($start, $naechste - $start).Insert($start, $bisher)

$ohneBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($todoDatei, $todoText, $ohneBom)

Write-Host ""
Write-Host "In TODO.md unter '## Anfragen' eingetragen." -ForegroundColor Green
Write-Host "Schreib 'bestaetigt' hinter die Zeilen, die umgesetzt werden sollen." -ForegroundColor Green
