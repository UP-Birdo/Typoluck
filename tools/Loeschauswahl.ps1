<#
    Loeschauswahl.ps1 - welche Dateien auf GitHub geloescht werden duerfen
    (seit 0.18.2, Nutzer 28.09.2026: Deploy-Skript soll loeschen koennen,
    "ja"). Wird von tools\Deploy-Typoluck.ps1 eingebunden (dot-source) und
    von tests\test-deploy-loeschen.js ohne Netz geprueft.

    REGEL (vorsichtig, lieber eine Datei zu wenig loeschen als eine zu viel):
    Ein Pfad aus dem Repository ist Loesch-Kandidat NUR, wenn
      1. er NICHT in der aktuellen Auslieferung steht,
      2. er in einem Bereich liegt, den dieses Skript verwaltet: in einem
         der freigegebenen Ordner (css/, js/, ...) oder eine freigegebene
         Wurzeldatei - alles andere (fremde Ordner, andere Projekte, Dateien
         an der Wurzel, die das Skript nicht kennt) bleibt unberuehrt,
      3. er NICHT in der festen Schutzliste steht (CNAME, .nojekyll,
         README.md, LICENSE, .gitignore, .gitattributes, 404.html, und
         alles unter .github/).
    Nur ASCII (PowerShell 5.1).
#>

$LoeschSchutz = @("CNAME", ".nojekyll", "README.md", "LICENSE", "LICENSE.md", ".gitignore",
                  ".gitattributes", "404.html")
$LoeschSchutzOrdner = @(".github/")

function Get-LoeschKandidaten {
    param(
        [string[]]$Vorhanden,
        [string[]]$Ausgeliefert,
        [string[]]$Ordner,
        [string[]]$Wurzeldateien
    )

    $liefer = @{}
    foreach ($p in $Ausgeliefert) { $liefer[$p] = $true }

    $kandidaten = @()
    foreach ($pfad in $Vorhanden) {
        if (-not $pfad) { continue }
        if ($liefer.ContainsKey($pfad)) { continue }

        $name = ($pfad -split "/")[-1]
        if ($LoeschSchutz -contains $pfad -or $LoeschSchutz -contains $name) { continue }
        $geschuetzt = $false
        foreach ($s in $LoeschSchutzOrdner) {
            if ($pfad.StartsWith($s)) { $geschuetzt = $true }
        }
        if ($geschuetzt) { continue }

        $verwaltet = $false
        if ($pfad -notmatch "/") {
            $verwaltet = $Wurzeldateien -contains $pfad
        } else {
            foreach ($o in $Ordner) {
                if ($pfad.StartsWith($o.TrimEnd("/") + "/")) { $verwaltet = $true }
            }
        }
        if (-not $verwaltet) { continue }

        $kandidaten += $pfad
    }
    return ,@($kandidaten | Sort-Object)
}
