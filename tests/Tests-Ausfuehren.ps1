<#
    Tests-Ausfuehren.ps1 - fuehrt alle Regressionstests von Typoluck aus.

    Auf diesem Rechner ist kein Node installiert. Stattdessen springt die
    Node-Laufzeit ein, die in Visual Studio Code steckt: Code.exe laeuft mit
    gesetzter Umgebungsvariable ELECTRON_RUN_AS_NODE wie ein normales Node.

    Pfade relativ zu diesem Skript - es darf mit dem Projekt verschoben werden.

    Aufruf:
        powershell -ExecutionPolicy Bypass -File "tests\Tests-Ausfuehren.ps1"
    Bequemer, mit einer Zeile Fazit:
        powershell -ExecutionPolicy Bypass -File "tools\Test-Typoluck.ps1" -NurFazit

    Rueckgabe: Exit 0, wenn alle Testdateien "0 Fehler" melden, sonst 1.
#>

$ErrorActionPreference = "Stop"

$hier = Split-Path -Parent $MyInvocation.MyCommand.Path

# ---------------------------------------------------------------------
# Node-Laufzeit finden (VS Codes Electron)
#
# ZWEI ANMELDUNGEN AN EINEM RECHNER: Der PC wird als Domaenen- UND als
# lokaler Benutzer benutzt, und VS Code installiert sich je Profil in einen
# eigenen Ordner. Gesucht wird deshalb: eigenes Profil, systemweit, dann
# JEDES Benutzerprofil (Haus-Regel aus Apps\CLAUDE.md).
# ---------------------------------------------------------------------

$kandidaten = @(
    (Join-Path $env:LOCALAPPDATA "Programs\Microsoft VS Code\Code.exe"),
    "C:\Program Files\Microsoft VS Code\Code.exe",
    "C:\Program Files (x86)\Microsoft VS Code\Code.exe"
)

$kandidaten += (Get-ChildItem -LiteralPath "C:\Users" -Directory -ErrorAction SilentlyContinue |
    ForEach-Object { Join-Path $_.FullName "AppData\Local\Programs\Microsoft VS Code\Code.exe" })

$codeExe = $null
foreach ($kandidat in $kandidaten) {
    if (Test-Path -LiteralPath $kandidat) {
        $codeExe = $kandidat
        break
    }
}

if (-not $codeExe) {
    Write-Host "Code.exe wurde nicht gefunden. Gesuchte Orte:" -ForegroundColor Red
    $kandidaten | ForEach-Object { Write-Host "  $_" }
    exit 1
}

# ---------------------------------------------------------------------
# Testdateien ausfuehren
# ---------------------------------------------------------------------

$env:ELECTRON_RUN_AS_NODE = "1"

$testDateien = @(Get-ChildItem -LiteralPath $hier -Filter "test-*.js" | Sort-Object Name)

if ($testDateien.Count -eq 0) {
    Write-Host "Keine Testdateien gefunden." -ForegroundColor Yellow
    exit 1
}

$fehlerhaft = 0

foreach ($testDatei in $testDateien) {
    Write-Host ""
    Write-Host "--- $($testDatei.Name) ---" -ForegroundColor Cyan

    # Ein String, jeder Pfad gequotet: Der OneDrive-Pfad enthaelt
    # Leerzeichen und wuerde als Array-Argument zerlegt.
    $argument = '"{0}"' -f $testDatei.FullName

    $lauf = Start-Process -FilePath $codeExe -ArgumentList $argument -Wait -NoNewWindow -PassThru

    if ($lauf.ExitCode -ne 0) {
        $fehlerhaft++
        Write-Host "$($testDatei.Name): FEHLGESCHLAGEN (Exit $($lauf.ExitCode))" -ForegroundColor Red
    }
}

Write-Host ""
if ($fehlerhaft -eq 0) {
    Write-Host "Alle Testdateien in Ordnung." -ForegroundColor Green
    exit 0
}

Write-Host "$fehlerhaft Testdatei(en) fehlgeschlagen." -ForegroundColor Red
exit 1
