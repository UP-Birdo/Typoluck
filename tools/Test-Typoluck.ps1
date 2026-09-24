# Test-Typoluck.ps1 - die ganze Testkette mit EINEM Aufruf (Haus-Standard:
# tools\Test-<App>.ps1 in jedem Projekt gleich). Reicht an
# tests\Tests-Ausfuehren.ps1 durch.
#
# -NurFazit  gibt statt der vollen Ausgabe GENAU EINE Zeile aus:
#
#                Typoluck: 123 Pruefungen, 0 Fehler   (Exit 0)
#
#            und im Fehlerfall zusaetzlich jede fehlgeschlagene Pruefung mit
#            ihrer Testdatei. Der Exit-Code bleibt derselbe.

param(
    [switch]$NurFazit
)

$ErrorActionPreference = 'Stop'
$kette = Join-Path (Split-Path -Parent $PSScriptRoot) 'tests\Tests-Ausfuehren.ps1'

if (-not $NurFazit) {
    & powershell -ExecutionPolicy Bypass -File $kette
    exit $LASTEXITCODE
}

# Die Fehlermeldungen der Tests kommen ueber den Fehlerkanal (console.error).
# Deshalb fuer diesen Aufruf 'Continue' (sonst bricht die erste Fehlerzeile
# alles ab) und .ToString() (sonst kommen ErrorRecords statt Text).
$vorher = $ErrorActionPreference
$ErrorActionPreference = 'Continue'

$ausgabe = & powershell -ExecutionPolicy Bypass -File $kette 2>&1 |
    ForEach-Object { $_.ToString() }

$code = $LASTEXITCODE
$ErrorActionPreference = $vorher

$pruefungen = 0
$fehler = 0
$dateienMitFazit = 0

foreach ($zeile in $ausgabe) {
    $treffer = [regex]::Match([string]$zeile, '^(\d+) ok, (\d+) Fehler')
    if ($treffer.Success) {
        $pruefungen += [int]$treffer.Groups[1].Value
        $fehler += [int]$treffer.Groups[2].Value
        $dateienMitFazit++
    }
}

if ($fehler -gt 0 -or $code -ne 0) {
    $datei = ''
    $eingerueckteGehoerenDazu = $false

    foreach ($zeile in $ausgabe) {
        $text = [string]$zeile

        $kopf = [regex]::Match($text, '^--- (.+) ---$')
        if ($kopf.Success) {
            $datei = $kopf.Groups[1].Value
            $eingerueckteGehoerenDazu = $false
            continue
        }

        if ($text -match '^FEHLER: ' -or $text -match 'FEHLGESCHLAGEN' -or $text -match 'Error') {
            Write-Host ("[" + $datei + "] " + $text)
            $eingerueckteGehoerenDazu = $true
            continue
        }

        if ($eingerueckteGehoerenDazu -and $text -match '^\s{4,}\S') {
            Write-Host ("             " + $text.Trim())
            continue
        }

        $eingerueckteGehoerenDazu = $false
    }
}

Write-Host ("Typoluck: $pruefungen Pruefungen, $fehler Fehler, $dateienMitFazit Testdateien mit Fazit   (Exit $code)")
exit $code
