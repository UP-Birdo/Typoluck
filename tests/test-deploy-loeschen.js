/*
 * test-deploy-loeschen.js — welche Dateien das Deploy-Skript auf GitHub
 * löschen darf (seit 0.18.2, tools/Loeschauswahl.ps1). Ohne Netz: Die echte
 * PowerShell-Funktion bekommt erfundene Listen.
 */

const fs = require("fs");
const pfad = require("path");
const { spawnSync } = require("child_process");
const { pruefe, gleich, fazit } = require("./pruefer.js");

const wurzel = pfad.join(__dirname, "..");
const lesen = (name) => fs.readFileSync(pfad.join(wurzel, name), "utf8");
const skript = pfad.join(wurzel, "tools", "Loeschauswahl.ps1");

function auswahl(vorhanden, ausgeliefert) {
    const liste = (a) => "@(" + a.map((x) => "'" + x.replace(/'/g, "''") + "'").join(",") + ")";
    const befehl = ". '" + skript.replace(/'/g, "''") + "'; "
        + "$o = @('css','js','icons','schrift','docs','tests','tools','.github'); "
        + "$w = @('index.html','sw.js','README.md','CHANGELOG.md','manifest.webmanifest','icon.svg'); "
        + "$k = Get-LoeschKandidaten -Vorhanden " + liste(vorhanden) + " -Ausgeliefert " + liste(ausgeliefert)
        + " -Ordner $o -Wurzeldateien $w; ConvertTo-Json -InputObject @($k) -Compress";
    const r = spawnSync("powershell", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", befehl], { encoding: "utf8" });
    if (r.status !== 0) {
        return { fehler: (r.stderr || "").trim() };
    }
    const text = (r.stdout || "").trim();
    return text ? [].concat(JSON.parse(text)) : [];
}

const ausgeliefert = ["index.html", "sw.js", "CHANGELOG.md", "js/app.js", "css/stil.css", "tests/test-a.js"];
const vorhanden = ausgeliefert.concat([
    "js/lexikon-daten.js",          // nicht mehr Teil der App → löschen
    "css/alt.css",                  // dito
    "README.md",                    // Schutzliste (auch wenn nicht ausgeliefert)
    "CNAME", ".nojekyll", "LICENSE", // Schutzliste
    ".github/workflows/x.yml",      // .github/ geschützt
    "anderes-projekt/index.html",   // fremder Ordner: nie
    "notizen.txt",                  // unbekannte Wurzeldatei: nie
    "manifest.webmanifest",         // freigegebene Wurzeldatei, fehlt lokal → löschen
    "jsx/fremd.js"                  // Ordner, der nur mit „js" beginnt: nie
]);
const kandidaten = auswahl(vorhanden, ausgeliefert);
gleich("Löschen nur, was in verwalteten Ordnern liegt und nicht mehr ausgeliefert wird",
    kandidaten, ["css/alt.css", "js/lexikon-daten.js", "manifest.webmanifest"]);
gleich("Alles ausgeliefert: nichts löschen", auswahl(ausgeliefert, ausgeliefert), []);
gleich("Leeres Repository: nichts löschen", auswahl([], ausgeliefert), []);

const deploy = lesen("tools/Deploy-Typoluck.ps1");
pruefe("Deploy-Skript bindet die Auswahl ein und fragt vor dem Löschen (j/n)",
    /\. \(Join-Path \$hier "Loeschauswahl\.ps1"\)/.test(deploy) && /Read-Host "Diese .* loeschen\? \(j\/n\)"/.test(deploy));
pruefe("-NurAnzeigen listet getrennt und löscht nie",
    deploy.indexOf("wuerden geloescht") !== -1
        && deploy.indexOf("if ($NurAnzeigen)") < deploy.indexOf("Read-Host \"Diese"));
pruefe("Nur ASCII in den PowerShell-Skripten", !/[^\x00-\x7F]/.test(deploy) && !/[^\x00-\x7F]/.test(lesen("tools/Loeschauswahl.ps1")));

fazit();
