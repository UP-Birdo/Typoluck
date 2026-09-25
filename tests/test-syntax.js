/*
 * test-syntax.js — hält die Dateien des Projekts zusammen.
 *
 *   - jede Programmdatei lässt sich übersetzen (auch die Bildschirme, die
 *     sonst kein Test lädt);
 *   - Version: js\konfig.js, sw.js, CHANGELOG.md und STATUS.md nennen
 *     dieselbe Nummer (Haus-Regel);
 *   - die Dateiliste des Service Workers passt zu index.html und zu dem,
 *     was wirklich im Projekt liegt — in beide Richtungen;
 *   - Haus-Regeln: kein confirm/alert/prompt, keine Emojis, keine Tabs;
 *   - die unantastbaren Werte (Speicherpfade, Passwort-Zutat) stehen noch.
 */

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { pruefe, gleich, fazit } = require("./pruefer.js");
require("./umgebung.js");

const wurzel = path.join(__dirname, "..");
const lesen = (datei) => fs.readFileSync(path.join(wurzel, datei), "utf8");
const liste = (ordner) => fs.readdirSync(path.join(wurzel, ordner)).map((name) => ordner + "/" + name);

/* ------------------------------------------------------------------ *
 * Übersetzbarkeit
 * ------------------------------------------------------------------ */

const programmDateien = liste("js").filter((datei) => datei.endsWith(".js")).concat(["sw.js"]);
for (const datei of programmDateien) {
    let fehler = "";
    try {
        new vm.Script(lesen(datei), { filename: datei });
    } catch (ausnahme) {
        fehler = ausnahme.message;
    }
    pruefe("Übersetzbar: " + datei, fehler === "", fehler);
}

/* ------------------------------------------------------------------ *
 * Version an allen Stellen gleich
 * ------------------------------------------------------------------ */

const version = KONFIG.APP_VERSION;
pruefe("Version im Format 0.MINOR.PATCH", /^0\.\d+\.\d+$/.test(version), version);
pruefe("Version steht genau einmal in konfig.js",
    (lesen("js/konfig.js").match(/APP_VERSION:/g) || []).length === 1);
pruefe("sw.js trägt dieselbe Nummer", lesen("sw.js").indexOf('"typoluck-v' + version + '"') !== -1);
pruefe("CHANGELOG.md hat einen Eintrag dafür", new RegExp("^## " + version.replace(/\./g, "\\.") + " ", "m")
    .test(lesen("CHANGELOG.md")));
const obersterEintrag = (lesen("CHANGELOG.md").match(/^## (\d+\.\d+\.\d+)/m) || [])[1];
gleich("Der oberste CHANGELOG-Eintrag ist die aktuelle Version", obersterEintrag, version);
pruefe("STATUS.md nennt die Version", lesen("STATUS.md").indexOf("**Version:** " + version) !== -1);

/* ------------------------------------------------------------------ *
 * Service Worker, index.html und Platte stimmen überein
 * ------------------------------------------------------------------ */

const sw = lesen("sw.js");
const swListe = (sw.match(/const DATEIEN = \[([\s\S]*?)\];/) || ["", ""])[1]
    .match(/"[^"]+"/g).map((eintrag) => eintrag.slice(1, -1));

const index = lesen("index.html");
const indexSkripte = (index.match(/<script src="([^"]+)"/g) || []).map((z) => z.match(/"([^"]+)"/)[1]);
const indexStile = (index.match(/<link rel="stylesheet" href="([^"]+)"/g) || []).map((z) => z.match(/href="([^"]+)"/)[1]);

gleich("sw.js: Programmdateien in der Reihenfolge von index.html",
    swListe.filter((e) => e.startsWith("./js/")), indexSkripte.map((e) => "./" + e));
gleich("sw.js: Stildateien in der Reihenfolge von index.html",
    swListe.filter((e) => e.startsWith("./css/")), indexStile.map((e) => "./" + e));

const aufPlatte = liste("js").concat(liste("css"), liste("icons"))
    .filter((datei) => /\.(js|css|png)$/.test(datei)).map((datei) => "./" + datei);
for (const datei of aufPlatte) {
    pruefe("Im Service Worker eingetragen: " + datei, swListe.indexOf(datei) !== -1);
}
for (const eintrag of swListe.filter((e) => e !== "./")) {
    pruefe("Datei aus sw.js existiert: " + eintrag, fs.existsSync(path.join(wurzel, eintrag)));
}
pruefe("index.html, Manifest und Zeichen im Service Worker",
    ["./", "./index.html", "./manifest.webmanifest", "./icon.svg"].every((e) => swListe.indexOf(e) !== -1));

/* ------------------------------------------------------------------ *
 * Haus-Regeln
 * ------------------------------------------------------------------ */

for (const datei of liste("js")) {
    const ohneKommentare = lesen(datei).replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    pruefe("Kein confirm/alert/prompt: " + datei, !/\b(confirm|alert|prompt)\s*\(/.test(ohneKommentare));
}

const textDateien = ["index.html", "sw.js", "manifest.webmanifest", "icon.svg"]
    .concat(liste("js"), liste("css"), liste("tests"), liste("tools"))
    .concat(fs.readdirSync(wurzel).filter((n) => n.endsWith(".md")))
    .filter((datei) => /\.(js|css|html|md|json|webmanifest|svg|ps1|cmd|yml)$/.test(datei));
const emoji = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B50}\u{2B55}]/u;
for (const datei of textDateien) {
    const text = lesen(datei);
    pruefe("Keine Emojis: " + datei, !emoji.test(text));
    pruefe("Keine Tabs (Einzug = 4 Leerzeichen): " + datei, text.indexOf("\t") === -1);
}

/* ------------------------------------------------------------------ *
 * UPCrew-Standard (seit 0.4.0, Apps\UPCrew-STANDARD.md)
 * ------------------------------------------------------------------ */

/* Text: keine Begrüßungen, keine Lob-Listen, keine Aufforderungs-Floskeln,
   kein „Wird geladen" (dafür gibt es ZUSTAND.laden). Gesucht wird im
   Programmtext ohne Kommentare — dort darf die Geschichte stehen. */
const verboteneFloskeln = /Willkommen|"Hallo|Sei die oder der|Unglaublich|Grossartig|Gut gemacht|Wird geladen|Los geht/;
for (const datei of liste("js").filter((d) => d.endsWith(".js"))) {
    const ohneKommentare = lesen(datei).replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    const treffer = ohneKommentare.match(verboteneFloskeln);
    pruefe("Keine Floskeln im Text: " + datei, !treffer, treffer ? treffer[0] : "");
}

/* Formen: jede Rundung verweist auf --rund-klein/-mittel/-voll, kein
   Schatten ist verschwommen (dritte Länge = Unschärfe muss 0 sein). */
for (const datei of liste("css")) {
    const stil = lesen(datei).replace(/\/\*[\s\S]*?\*\//g, "");
    const rundungen = stil.match(/border-radius:[^;]+;/g) || [];
    const fest = rundungen.filter((r) => !/var\(--rund-(klein|mittel|voll)\)/.test(r));
    pruefe("Nur die drei Rundungen: " + datei, fest.length === 0, fest.join(" | "));
    const schatten = (stil.match(/box-shadow:[^;]+;/g) || [])
        .filter((s) => /\d+px\s+\d+px\s+[1-9]\d*px/.test(s) || /rgba\(0, 0, 0/.test(s));
    pruefe("Keine weichen Schatten: " + datei, schatten.length === 0, schatten.join(" | "));
}
pruefe("Die drei Rundungen sind festgelegt",
    ["--rund-klein:", "--rund-mittel:", "--rund-voll:"].every((v) => lesen("css/stil.css").indexOf(v) !== -1));
pruefe("Die Schrift steht nur als Variable im Stil",
    (lesen("css/stil.css").match(/font-family:\s*"/g) || []).length === 0
        && /--schrift-familie:/.test(lesen("css/stil.css")));

/* ------------------------------------------------------------------ *
 * Unantastbare Werte
 * ------------------------------------------------------------------ */

/* Die Konten gehören UPCrew, nicht Blunderluck (Nutzer-Entscheidung
   24.09.2026) — Typoluck darf nie wieder auf die Blunderluck-Datenbank zeigen. */
pruefe("Datenbank ist die von UPCrew", /^https:\/\/upcrew-[a-z0-9]+-default-rtdb\./.test(KONFIG.speicher.firebaseBasis),
    KONFIG.speicher.firebaseBasis);
pruefe("Nicht die Blunderluck-Datenbank", KONFIG.speicher.firebaseBasis.indexOf("blunderluck") === -1);
pruefe("Die Anmeldung nennt kein anderes Spiel",
    !/Blunderluck/.test(lesen("js/anmeldung.js").replace(/\/\*[\s\S]*?\*\//g, "")));
gleich("Pfad der geteilten Spielerliste", KONFIG.speicher.spielerPfad, "spieler");
gleich("Pfad des eigenen Bereichs", KONFIG.speicher.spielPfad, "typoluck");
pruefe("Lokale Schlüssel gehören Typoluck",
    KONFIG.speicher.lokalerSchluesselSpieler.startsWith("typoluck.")
        && KONFIG.speicher.lokalerSchluesselSpiel.startsWith("typoluck."));
pruefe("Gerätespeicher-Schlüssel gehören Typoluck",
    [ICH.SCHLUESSEL_PERSON, ICH.SCHLUESSEL_SPIELSTAND, ICH.SCHLUESSEL_AUSSTEHEND, ICH.SCHLUESSEL_EINSTELLUNGEN]
        .every((schluessel) => schluessel.startsWith("typoluck.")));
pruefe("index.html nennt den Namen der App", /<h1 class="nur-vorlesen">Typoluck<\/h1>/.test(index));
gleich("Manifest: Name", JSON.parse(lesen("manifest.webmanifest")).name, "Typoluck");

fazit();
