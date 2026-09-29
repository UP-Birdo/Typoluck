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

/* Die kopierten UPCrew-Bausteine aus Design\3D-Schrift\final — hier NIE
   abgewandelt. Für sie gelten die Form-Prüfungen des eigenen Stils nicht
   (die Knopf-Familien haben eigene Rundungen, das ist ihr Zweck), und die
   Emoji-Prüfung nicht (der Anpassen-Tab zeigt Schachfiguren U+265A-265F,
   die in den geprüften Zeichenbereich fallen, aber keine Emojis sind).
   Tabs und Übersetzbarkeit werden auch bei ihnen geprüft. */
const KOPIEN = [
    "js/upcrew-intro.js", "css/upcrew-intro.css", "js/upcrew-farbwelten.js",
    "js/upcrew-aussehen.js", "js/upcrew-anpassen.js", "css/upcrew-anpassen.css", "css/upcrew-knoepfe.css",
    "css/upcrew-leiste.css",
    /* seit 0.15.9: Sammlungs-Gerüst und Abzeichen, gleich in Blunderluck */
    "js/upcrew-sammlung.js", "css/upcrew-sammlung.css", "js/upcrew-abzeichen.js", "css/upcrew-abzeichen.css",
    /* seit 0.15.10: Tabs wechseln durch Wischen, gleich in Blunderluck */
    "js/upcrew-wischen.js", "css/upcrew-wischen.css",
    /* seit 0.15.12: die wandernde Kapsel der Leiste („C · Gleiten + Hüpfen") */
    "js/upcrew-leiste.js",
    /* seit 0.16.1: die Serien-Flamme oben neben dem Kurzprofil */
    "js/upcrew-flamme.js", "css/upcrew-flamme.css",
    /* seit 0.16.3: Spielerliste der Admins — Vorschlag aus Typoluck für final,
       ab dort wie jede Kopie behandelt (nie abwandeln) */
    "js/upcrew-spielerliste.js", "css/upcrew-spielerliste.css",
    /* seit 0.17.0: Münzen und Shop über beide Spiele */
    "js/upcrew-muenzen.js", "js/upcrew-shop.js", "css/upcrew-shop.css",
    /* seit 0.25.0 (gemeinsame Runde 7): Blätter, Serien-Kapsel, Profil,
       Einstellungen/Verwaltung und die Abzeichen aller Spiele (dort trägt
       Typoluck seine Liste ein — Vorschlag an final) */
    "js/upcrew-blatt.js", "css/upcrew-blatt.css", "js/upcrew-serie.js", "css/upcrew-serie.css",
    "js/upcrew-profil.js", "css/upcrew-profil.css", "js/upcrew-einstellungen.js", "css/upcrew-einstellungen.css",
    "js/upcrew-abzeichen-spiele.js",
    /* seit 0.26.0: der Level-Pfad (Blatt) */
    "js/upcrew-levelpfad.js", "css/upcrew-levelpfad.css"
];

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
/* Ausnahme (0.16.3 bis 0.18.0): das Lexikon der Admins wurde nur
   nachgeladen. Seit 0.18.1 wird es gar nicht mehr ausgeliefert
   (tests/test-verwaltung.js); die Liste bleibt für künftige Fälle. */
/* Seit 0.23.4: die Rate-Listen mit 4, 6 und 7 Buchstaben lädt
   js/woerter-rate-de.js erst, wenn eine Runde dieser Länge startet. */
const NUR_NACHGELADEN = ["./js/woerter-rate-de-4.js", "./js/woerter-rate-de-6.js", "./js/woerter-rate-de-7.js"];
for (const datei of NUR_NACHGELADEN) {
    pruefe("Nur nachgeladen, nicht im Service Worker und nicht in index.html: " + datei,
        swListe.indexOf(datei) === -1 && indexSkripte.indexOf(datei.slice(2)) === -1);
}
for (const datei of aufPlatte.filter((d) => NUR_NACHGELADEN.indexOf(d) === -1)) {
    pruefe("Im Service Worker eingetragen: " + datei, swListe.indexOf(datei) !== -1);
}
for (const eintrag of swListe.filter((e) => e !== "./")) {
    pruefe("Datei aus sw.js existiert: " + eintrag, fs.existsSync(path.join(wurzel, eintrag)));
}
pruefe("index.html und Manifest im Service Worker",
    ["./", "./index.html", "./manifest.webmanifest"].every((e) => swListe.indexOf(e) !== -1));

/* Die App-Zeichen (seit 0.8.1): nur die PNGs aus der Design-Sitzung. Das
   alte icon.svg zeigt das alte Logo — weder im Manifest noch in der Seite. */
const manifest = JSON.parse(lesen("manifest.webmanifest"));
gleich("Manifest: nur PNG-Zeichen 192 und 512", manifest.icons.map((z) => z.src),
    ["icons/icon-192.png", "icons/icon-512.png"]);
pruefe("Seite bindet icon.svg nicht mehr ein", !/href="icon\.svg"/.test(index));
pruefe("Service Worker lädt icon.svg nicht mehr", swListe.indexOf("./icon.svg") === -1);
for (const groesse of [32, 180, 192, 512]) {
    pruefe("App-Zeichen vorhanden: icon-" + groesse + ".png",
        fs.existsSync(path.join(wurzel, "icons", "icon-" + groesse + ".png")));
}

/* Die Crew-Schriften (seit 0.8.0): alle zwölf offline — und die Lizenz liegt
   daneben (SIL OFL verlangt, dass sie mitgeht). */
const schriften = liste("schrift").filter((d) => d.endsWith(".woff2"));
gleich("Zwölf Crew-Schriften im Ordner schrift", schriften.length, 12);
for (const datei of schriften) {
    pruefe("Im Service Worker eingetragen: " + datei, swListe.indexOf("./" + datei) !== -1);
}
pruefe("Die Schrift-Lizenz liegt bei", fs.existsSync(path.join(wurzel, "schrift", "LIZENZ.txt")));

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
    if (KOPIEN.indexOf(datei) === -1) {
        pruefe("Keine Emojis: " + datei, !emoji.test(text));
    }
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
for (const datei of liste("css").filter((d) => KOPIEN.indexOf(d) === -1)) {
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
/* Kein festes Violett ausserhalb der Farbwelten (seit 0.15.4, Nutzer
   27.09.2026: „die Farben stimmen nicht" — die Anmeldung war fest
   UPCrew-violett). Violett gibt es nur als Farbwelt „Studio" im kopierten
   Baustein; die Kachel-Sets (js\kachelsets.js) sind eigene Wahl des
   Spielers und ausgenommen. Violett = Farbton 250–300°, deutlich gesättigt. */
function farbton(hex) {
    const zahl = parseInt(hex.slice(1), 16);
    const r = ((zahl >> 16) & 255) / 255;
    const g = ((zahl >> 8) & 255) / 255;
    const b = (zahl & 255) / 255;
    const hoch = Math.max(r, g, b);
    const spanne = hoch - Math.min(r, g, b);
    let grad = 0;
    if (spanne > 0) {
        grad = hoch === r ? 60 * (((g - b) / spanne) % 6) : hoch === g ? 60 * ((b - r) / spanne + 2) : 60 * ((r - g) / spanne + 4);
    }
    return { grad: (grad + 360) % 360, saettigung: hoch === 0 ? 0 : spanne / hoch };
}
for (const datei of liste("css").concat(liste("js").filter((d) => d.endsWith(".js")))
    .filter((d) => KOPIEN.indexOf(d) === -1 && d !== "js/kachelsets.js")) {
    const text = lesen(datei).replace(/\/\*[\s\S]*?\*\//g, "");
    const violett = (text.match(/#[0-9a-fA-F]{6}\b/g) || []).filter((hex) => {
        const ton = farbton(hex);
        return ton.saettigung >= 0.25 && ton.grad >= 250 && ton.grad <= 300;
    });
    pruefe("Kein festes Violett: " + datei, violett.length === 0, violett.join(" "));
}
pruefe("Die Anmeldung setzt keine eigenen Farben mehr (erbt die Farbwelt)",
    !/\.anmeldung\s*\{[^}]*--haupt:/.test(lesen("css/stil.css")));

pruefe("Die Schrift steht nur als Variable im Stil",
    (lesen("css/stil.css").match(/font-family:\s*"/g) || []).length === 0
        && /--schrift-familie:/.test(lesen("css/stil.css")));

/* Vibration überall raus (seit 0.8.1, Nutzer 26.09.2026: „kommt erst wann
   anders") — auch in den kopierten Bausteinen, auch kein Schalter mehr. */
for (const datei of liste("js").filter((d) => d.endsWith(".js"))) {
    const ohneKommentare = lesen(datei).replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    pruefe("Keine Vibration: " + datei, !/vibrate|FUEHLEN/.test(ohneKommentare));
}
pruefe("Kein Schalter „Vibration“ in den Einstellungen",
    !/"Vibration"/.test(lesen("js/bildschirm-einstellungen.js")));

/* ------------------------------------------------------------------ *
 * Keine fremde Marke (seit 0.6.2)
 * ------------------------------------------------------------------ */

/* „Wordle" ist eine Marke der New York Times (Nutzer-Entscheidung
   25.09.2026): Der Name darf nirgends stehen, wo ihn ein Spieler sieht —
   nicht im Programmtext (ohne Kommentare), nicht in der Seite, im Manifest,
   in der öffentlichen README oder in den Meldeformularen. Die inneren Namen
   (WORDLE, "wordle") sind klein bzw. gross geschrieben und fallen nicht
   darunter. Der sichtbare Name steht in WORDLE.NAME. */
const sichtbar = liste("js").filter((d) => d.endsWith(".js"))
    .map((datei) => [datei, lesen(datei).replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "")])
    .concat(["index.html", "manifest.webmanifest", "README.md", "icon.svg"]
        .map((datei) => [datei, lesen(datei).replace(/<!--[\s\S]*?-->/g, "")]))
    .concat(liste(".github/ISSUE_TEMPLATE").map((datei) => [datei, lesen(datei)]));
for (const [datei, text] of sichtbar) {
    pruefe("Kein „Wordle“ sichtbar: " + datei, !/Wordle/.test(text));
}
gleich("Der sichtbare Spielname", WORDLE.NAME, "Wordguesser");

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
/* Seit 0.15.5: Vorschau für geteilte Links (og:), Adressen absolut */
for (const eigenschaft of ["og:title", "og:description", "og:url", "og:image", "og:type"]) {
    pruefe("Link-Vorschau: " + eigenschaft, new RegExp('<meta property="' + eigenschaft + '" content="[^"]+">').test(index));
}
pruefe("Link-Vorschau: twitter:card gross", /<meta name="twitter:card" content="summary_large_image">/.test(index));
const ogBild = (/<meta property="og:image" content="([^"]+)">/.exec(index) || [])[1] || "";
pruefe("Link-Vorschau: Bild absolut und vorhanden",
    /^https:\/\/up-birdo\.github\.io\/Typoluck\//.test(ogBild)
        && fs.existsSync(path.join(wurzel, ogBild.replace("https://up-birdo.github.io/Typoluck/", ""))));
pruefe("Link-Vorschau: Adresse absolut", /<meta property="og:url" content="https:\/\/up-birdo\.github\.io\/Typoluck\/">/.test(index));
gleich("Manifest: Name", JSON.parse(lesen("manifest.webmanifest")).name, "Typoluck");

/* ------------------------------------------------------------------ *
 * Die Leiste unten und das Menü (seit 0.5.0, Nutzer 25.09.2026: „unten
 * das Tab-Menü sollte nie weg, rechts die Rangliste, links ein
 * Platzhalter"; „in die drei Balken auch Einstellungen")
 * ------------------------------------------------------------------ */

pruefe("Die Leiste steht fest in index.html, ausserhalb des Inhalts, als Baustein up-leiste",
    /<\/main>\s*(<div id="ebenen"><\/div>\s*)?(<!--[\s\S]*?-->\s*)?<nav class="leiste up-leiste" id="leiste"/.test(index));
/* Seit 0.25.0: der Halter der Blätter direkt nach der Seite, ausserhalb von ihr. */
pruefe("Der Halter der Blätter steht neben der Seite (nicht darin)",
    /<main class="inhalt" id="inhalt"><\/main>\s*<div id="ebenen"><\/div>/.test(index));
const leisteText = (lesen("js/navigation.js").match(/LEISTE: \[([\s\S]*?)\],/) || ["", ""])[1];
const leisteEintraege = leisteText.split("\n").filter((z) => z.indexOf("{") !== -1);
/* Seit 0.9.0 (UPCrew-Runde 4) in BEIDEN Spielen gleich:
   Aufgaben · Sammlung · Start · Rangliste · Bald — Start in der Mitte,
   Platz 5 still. (0.8.0: Aufgaben · Bald · Start · Rangliste · Anpassen.) */
gleich("Die Leiste hat fünf Einträge", leisteEintraege.length, 5);
/* Seit 0.25.0 in beiden Spielen (Nutzer 28.09.2026): Shop · Sammlung ·
   Start · Aufgaben · Rangliste. Bis 0.24.0 Aufgaben links, Shop rechts. */
pruefe("Links in der Leiste: der Shop",
    /id: "shop", text: "Shop", zeichen: "shop"/.test(leisteEintraege[0] || ""));
pruefe("Platz 2: Sammlung",
    /id: "sammlung", text: "Sammlung", zeichen: "sammlung"/.test(leisteEintraege[1] || ""));
pruefe("Platz 4: Aufgaben",
    /id: "herausforderungen", text: "Aufgaben", zeichen: "aufgaben"/.test(leisteEintraege[3] || ""));
gleich("Das Sammlung-Zeichen ist der gemeinsame Pfad mit Blunderluck",
    (lesen("js/bausteine.js").match(/sammlung: "([^"]+)"/) || [])[1],
    "M4 4 H10 V10 H4 Z M14 4 H20 V10 H14 Z M4 14 H10 V20 H4 Z M14 14 H20 V20 H14 Z");
gleich("Das Bald-Zeichen ist der gemeinsame Pfad mit Blunderluck",
    (lesen("js/bausteine.js").match(/bald: "([^"]+)"/) || [])[1], "M12 7 V12 L15 14 M12 3 A9 9 0 1 0 12.01 3");
pruefe("Die Leiste baut ihre Tabs mit BAUSTEINE.tab, aktiv nur über aria-current",
    /BAUSTEINE\.tab\(/.test(lesen("js/navigation.js"))
        && !/knopf-leiste/.test(lesen("js/navigation.js") + lesen("css/stil.css")));
pruefe("Keine eigenen Regeln mehr für Schrift, Farbbalken oder Höhe der Tabs",
    !/\.up-tab/.test(lesen("css/stil.css") + lesen("css/stil-bildschirme.css")));
pruefe("Der Tab „Anpassen“ ist weg (in der Sammlung aufgegangen)",
    !fs.existsSync(path.join(wurzel, "js", "bildschirm-anpassen.js"))
        && !/ANPASSEN_BILDSCHIRM/.test(liste("js").filter((d) => d.endsWith(".js")).map(lesen).join("")));
const sammlungText = lesen("js/bildschirm-sammlung.js");
pruefe("Sammlung steht nicht im Menü", /id: "sammlung"[\s\S]*?imMenue: false/.test(sammlungText));
/* Seit 0.15.9 baut das Gerüst der gemeinsame Baustein js\upcrew-sammlung.js
   (Nutzer: „bei beiden Apps soll Sammlung gleich sein und immer gleich
   bleiben"). Typoluck setzt nur die Stellschrauben und liefert Inhalte. */
pruefe("Sammlung: Gerüst aus UPCREW_SAMMLUNG, Tab direkt im rollenden Inhalt",
    /const wurzel = BAUSTEINE\.el\("section"\);\s*behaelter\.appendChild\(wurzel\);\s*const geruest = UPCREW_SAMMLUNG\.bauen\(wurzel/
        .test(sammlungText));
pruefe("Sammlung zeigt den gemeinsamen Tab im Ort des Gerüsts, als Typoluck, Stufe aus einer Stelle",
    /UPCREW_ANPASSEN\.zeigen\(geruest\.ort, \{\s*app: "typoluck",\s*stufe: SAMMLUNG_BILDSCHIRM\.stufe\(\)/.test(sammlungText));
pruefe("Sammlung: reine Sammlung übers Gerüst VOR den Balken, Anteil aus dem Modell, Vorschau bündig",
    /geruest\.restEinsetzen\(/.test(sammlungText) && /SAMMLUNG\.anteil\(UPCREW_ANPASSEN\.STUFEN/.test(sammlungText)
        && /geruest\.anteilSetzen\(anteil\.hat, anteil\.alle\)/.test(sammlungText) && /geruest\.obenSetzen\(\)/.test(sammlungText));
pruefe("Sammlung: Abzeichen als erste Gruppe, aus dem gemeinsamen Baustein",
    /UPCREW_SAMMLUNG\.rest\(\);[\s\S]*?UPCREW_SAMMLUNG\.abzeichenTeil\(FORTSCHRITT\.abzeichen\(/.test(sammlungText));
pruefe("Sammlung: Teile, Gitter und Stücke aus dem Gerüst",
    /UPCREW_SAMMLUNG\.teil\(/.test(sammlungText) && /UPCREW_SAMMLUNG\.gitter\(\)/.test(sammlungText)
        && /UPCREW_SAMMLUNG\.stueck\(/.test(sammlungText));
pruefe("Sammlung räumt beim Verlassen auf",
    /verlassen: \(\) => SAMMLUNG_BILDSCHIRM\.entfernen\(\)/.test(sammlungText));
{
    const bildschirme = lesen("css/stil-bildschirme.css").replace(/\/\*[\s\S]*?\*\//g, "");
    pruefe("Sammlung: kein eigenes Gerüst mehr (Kopf, Ort, Balken, Vorschau-Lage kommen aus dem Baustein)",
        !/sammlung-(kopf|ort|rest|gitter|anteil|zahl)|data-bildschirm="sammlung"|upa-aktion|upa-vorschau|--upa-oben/
            .test(bildschirme));
    pruefe("Sammlung: Stellschrauben des Gerüsts in css\\stil.css",
        /--up-sm-rand: var\(--inhalt-rand\);/.test(lesen("css/stil.css"))
            && /--up-sm-leiste: calc\(var\(--leiste-hoehe\) \+ env\(safe-area-inset-bottom, 0px\)\);/.test(lesen("css/stil.css")));
    pruefe("Die Seite selbst rollt: kein Inhalt mit eigenem Rollbereich",
        !/\.inhalt[^{]*\{[^}]*overflow(-y)?:\s*(auto|scroll)/.test(lesen("css/stil.css") + bildschirme));
    const stile = indexStile;
    pruefe("Sammlungs- und Abzeichen-Stil laden NACH upcrew-anpassen.css",
        stile.indexOf("css/upcrew-sammlung.css") > stile.indexOf("css/upcrew-anpassen.css")
            && stile.indexOf("css/upcrew-abzeichen.css") > stile.indexOf("css/upcrew-anpassen.css"));
    pruefe("Abzeichen- und Sammlungs-Baustein laden vor der Sammlung und dem Profil",
        indexSkripte.indexOf("js/upcrew-abzeichen.js") !== -1
            && indexSkripte.indexOf("js/upcrew-sammlung.js") !== -1
            && indexSkripte.indexOf("js/upcrew-sammlung.js") < indexSkripte.indexOf("js/bildschirm-sammlung.js")
            && indexSkripte.indexOf("js/upcrew-abzeichen.js") < indexSkripte.indexOf("js/bildschirm-profil.js"));
}
/* Der iPhone-Streifen oben (seit 0.15.8, Nutzer-Bild: Spielfeld lief unter
   die Uhrzeit): eine feste, deckende Fläche, der Inhalt beginnt darunter,
   und nichts Festes oder Klebendes sitzt mehr bei `top: 0` ohne sie. */
{
    const stil = lesen("css/stil.css");
    const alle = stil + lesen("css/stil-bildschirme.css") + lesen("css/stil-wordle.css");
    pruefe("Streifen oben: --oben-frei aus env(safe-area-inset-top)",
        /--oben-frei: env\(safe-area-inset-top, 0px\)/.test(stil));
    pruefe("Streifen oben: feste Fläche in Grundfarbe, so hoch wie der Streifen",
        /body::before \{[^}]*position: fixed;[^}]*top: 0;[^}]*height: var\(--oben-frei\);[^}]*background: var\(--flaeche\);/.test(stil));
    pruefe("Streifen oben: der Inhalt beginnt darunter",
        /\.inhalt \{[^}]*padding: calc\(8px \+ var\(--oben-frei\)\)/.test(stil));
    pruefe("Streifen oben: kein klebendes/festes Teil mehr mit top: 0 (ausser der Fläche selbst)",
        !/position: (sticky|fixed);\s*top: 0;/.test(alle.replace(/body::before \{[^}]*\}/, "")));
    pruefe("Streifen oben: env(safe-area-inset-top) nur noch an einer Stelle",
        (alle.match(/safe-area-inset-top/g) || []).length === 1);
}
pruefe("Neu gezeichnet wird die Sammlung nicht von fremden Daten (der Entwurf bliebe sonst nicht)",
    /UNGESTOERT: \["wordle", "sammlung"\]/.test(lesen("js/app.js")));
pruefe("Keine Freischalt-Stufen oder Standard-Werte in der App festgeschrieben",
    liste("js").filter((d) => d.endsWith(".js") && KOPIEN.indexOf(d) === -1)
        .every((d) => !/\b(S[1-6]|K[1-6])\b"|"(S[1-6]|K[1-6])"|STUFEN\s*[=:]/.test(
            /* Ausgenommen: die Klasse SpeicherKonten (seit 0.22.0 Zeile für
               Zeile Blunderlucks — ihre Liste REGEL_AUSSEHEN sind die Werte
               der Datenbank-Regel §11a, keine Freischalt-Stufen). */
            lesen(d).replace(/\nclass SpeicherKonten [\s\S]*?\n\}\n/, "\n")
                .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, ""))));
/* Seit 0.26.0 (Nutzer 29.09.2026): kein Schalter „Standard-Schrift", kein
   Schwer-Modus, der Speicher mit Status-Lampe. */
pruefe("Einstellungen: ohne Standard-Schrift und Schwer-Modus, „Anpassen“ springt in die Sammlung",
    !/Standard-Schrift|leseschrift|Schwer-Modus|schwerGewaehlt/.test(lesen("js/bildschirm-einstellungen.js").replace(/\/\*[\s\S]*?\*\//g, ""))
        && /"Anpassen"[\s\S]*?NAVIGATION\.zeigen\("sammlung"/.test(lesen("js/bildschirm-einstellungen.js")));
pruefe("Einstellungen: Speicher mit Status-Lampe aus dem echten Zustand",
    /UPCREW_EINSTELLUNGEN\.speicherZeile\(/.test(lesen("js/bildschirm-einstellungen.js"))
        && /APP\.speicherLage\(\)/.test(lesen("js/bildschirm-einstellungen.js"))
        && /FORTSCHRITT_ABGLEICH\.beiZustand = /.test(lesen("js/app.js")));
pruefe("Kein Schwer-Modus mehr als Einstellung (nur noch Regel `hart` der Bibliothek)",
    liste("js").filter((d) => d.endsWith(".js")).every((d) => !/schwerGewaehlt|schwerSetzen|einstellungSetzen\("schwer"/.test(lesen(d))));
pruefe("Keine Leseschrift mehr in der App (ausser SpeicherKonten, Blunderlucks)",
    ["js/darstellung.js", "js/bildschirm-einstellungen.js", "js/werkstatt.js"]
        .every((d) => !/leseschrift\s*[:(=]|\.leseschrift/.test(lesen(d))));
gleich("Das Aufgaben-Zeichen ist der gemeinsame Pfad mit Blunderluck",
    (lesen("js/bausteine.js").match(/aufgaben: "([^"]+)"/) || [])[1], "M3 18 L9 12 L13 16 L21 8 M15 8 H21 V14");
/* Seit 0.10.0 (UPCrew-Runde 5) zeigen die Herausforderungen „Heute" statt
   des Platzhalters: Tageswort, Tagesbrett von Blunderluck, ×1,5, Serie. */
const heuteText = lesen("js/bildschirm-herausforderungen.js");
pruefe("Herausforderungen: Titel wie abgesprochen, kein Platzhalter mehr",
    heuteText.indexOf('TITEL: "Herausforderungen"') !== -1 && heuteText.indexOf("Kommt bald") === -1);
/* Seit 0.25.0 (gemeinsame Runde 7) steht die Serie nicht mehr hier, sondern
   als Kapsel im Kopf des Starts (js/upcrew-serie.js). */
pruefe("Heute: Tageswort, Tagesbrett und ×1,5 — die Serie nicht mehr",
    ["_tageswortBauen", "_tagesbrettBauen", "\"×1,5\""].every((t) => heuteText.indexOf(t) !== -1)
        && heuteText.indexOf("_serieBauen") === -1);
pruefe("Heute: die andere App aus KONFIG, nicht festgeschrieben",
    /KONFIG\.andereSpiele\.blunderluck/.test(heuteText) && !/github\.io/.test(heuteText));
pruefe("Serien-Kapsel: Serie aus dem Modell, Kapsel und Karte aus dem Baustein",
    /FORTSCHRITT\.serieHeute\(/.test(lesen("js/bildschirm-start.js"))
        && /UPCREW_SERIE\.kapsel\(/.test(lesen("js/bildschirm-start.js"))
        && /UPCREW_SERIE\.karteFuellen\(/.test(lesen("js/bildschirm-start.js")));
/* Seit 0.26.0 (Nutzer 29.09.2026: „serien schild raus"): ohne Schild,
   Schutz und „Schild kaufen". */
pruefe("Serien-Karte: kein Schild, kein Schutz, kein Kauf",
    !/beiKauf|schildVorrat|schutzVerdient|schildMax|schutzAlle/.test(lesen("js/bildschirm-start.js")));
/* Seit 0.11.0 (Runde 6 Teil A): Tageswort und Tagesbrett aus den Zweigen,
   der Link zu Blunderluck relativ (derselbe Ursprung live und auf 8093). */
pruefe("Heute: Tagesbrett aus dem Blunderluck-Zweig, Tageswort aus dem eigenen",
    /FORTSCHRITT\.heuteVon\(fortschritt, "blunderluck", datum\)/.test(heuteText)
        && /FORTSCHRITT\.heuteVon\(fortschritt, "typoluck", datum\)/.test(heuteText));
gleich("Blunderluck relativ verlinkt", KONFIG.andereSpiele.blunderluck.adresse, "../Blunderluck/");
pruefe("Der Fortschritt zieht beim Start einmal um, vor den Bildschirmen",
    /FORTSCHRITT\.umziehenAlle\(\)[\s\S]*START\.anmelden\(\)/.test(lesen("js/app.js")));

/* Fortschritt und Wertung (seit 0.10.0): Modelle vor den Bausteinen
   geladen; jede beendete Runde meldet sich GENAU EINMAL — im Augenblick
   des Endes, nie beim Zeichnen. */
pruefe("Wertung und Fortschritt laden nach dem Spiel-Modell und vor den Bausteinen",
    indexSkripte.indexOf("js/wordle.js") < indexSkripte.indexOf("js/wertung.js")
        && indexSkripte.indexOf("js/wertung.js") < indexSkripte.indexOf("js/fortschritt.js")
        && indexSkripte.indexOf("js/fortschritt.js") < indexSkripte.indexOf("js/bausteine.js")
        && indexSkripte.indexOf("js/fortschritt.js") < indexSkripte.indexOf("js/werkstatt.js"));
const wordleBildschirm = lesen("js/bildschirm-wordle.js").replace(/\/\*[\s\S]*?\*\//g, "");
gleich("Der Fortschritt wird an genau einer Stelle gemeldet",
    (wordleBildschirm.match(/APP\.fortschrittMelden\(/g) || []).length, 1);
pruefe("… und zwar beim Rundenende",
    /_beiRundenende\(\) \{[\s\S]*?APP\.fortschrittMelden\(runde\)/.test(wordleBildschirm));
pruefe("Sammlung: Stufe = Level (über alle Spiele)",
    /stufe\(\) \{\s*return APP\.level\(\)\.level;/.test(lesen("js/bildschirm-sammlung.js")));
pruefe("Start: Kurzprofil mit Level-Ring und Rahmen",
    /BAUSTEINE\.levelRing\([\s\S]*?FORTSCHRITT\.rahmenVon\(/.test(lesen("js/bildschirm-start.js")));
/* Seit 0.12.0: das Profil-Blatt wie im Entwurf — nur im eigenen Profil. */
const profilText = lesen("js/bildschirm-profil.js");
/* Seit 0.26.0 zweistufig (Nutzer 29.09.2026): Vorschau-Karte, dann das
   ausführliche Profil aus dem Baustein — eigen UND fremd; Statistik und
   Partien gibt Typoluck hinein; jede Level-Anzeige → Level-Pfad. */
pruefe("Profil: ausführlich aus dem Baustein, eigen und fremd, mit Statistik und Partien",
    /UPCREW_PROFIL\.zeichnen\(ort, PROFIL_BILDSCHIRM\.daten\(spieler, eigenes\), \{\s*eigen: eigenes,[\s\S]*?statistik: statistik,\s*verlauf: verlauf,/
        .test(profilText));
pruefe("Profil: jeder Tipp direkt ins ausführliche Profil, keine Vorschau-Karte (seit 0.26.1), Start mit Kopfzeile",
    !/UPCREW_PROFIL\.vorschau\(/.test(profilText) && profilText.indexOf("vorschauOeffnen") === -1
        && /UPCREW_PROFIL\.kopfzeile\(ort, PROFIL_BILDSCHIRM\.vorschauDaten\(spieler, true\)/.test(lesen("js/bildschirm-start.js"))
        && /beiOeffnen: \(\) => START\.profilOeffnen\(\)/.test(lesen("js/bildschirm-start.js"))
        && /UPCREW_ABZEICHEN\.fremdAusgeruestet\(/.test(profilText)
        && /PROFIL_BILDSCHIRM\.profilOeffnen\(zeile\.id\)/.test(lesen("js/bildschirm-rangliste.js"))
        && /PROFIL_BILDSCHIRM\.profilOeffnen\(spieler\.id\)/.test(lesen("js/bildschirm-freunde.js"))
        && !/vorschauOeffnen/.test(lesen("js/bildschirm-start.js") + lesen("js/bildschirm-rangliste.js") + lesen("js/bildschirm-freunde.js")));
pruefe("Start: Kopfzeile mit Flamme/Level am Kreis und Drei-Striche-Menü Freunde · Verlauf · Einstellungen (seit 0.26.1)",
    /beiLevel: \(\) => PROFIL_BILDSCHIRM\.levelPfadOeffnen\(spieler, true\)/.test(lesen("js/bildschirm-start.js"))
        && /menue: \[\s*\{ text: "Freunde"[^\n]*RANGLISTE_BILDSCHIRM\.freundeOeffnen\(\)[\s\S]{0,120}text: "Verlauf"[^\n]*START\.verlaufOeffnen\(\)[\s\S]{0,140}text: "Einstellungen"[^\n]*NAVIGATION\.zeigen\("einstellungen", null\)/
            .test(lesen("js/bildschirm-start.js"))
        && /function menue\(halter, punkte, optionen\)/.test(lesen("js/upcrew-profil.js"))
        && /\.up-pf-kz-ecke \{[^}]*min-width: 32px;[^}]*height: 32px;/.test(lesen("css/upcrew-profil.css")));
pruefe("Profil: Fremde aus dem öffentlichen Auszug (§12)",
    ["FORTSCHRITT.auszugVon(", "FORTSCHRITT.auszugLevel(", "FORTSCHRITT.auszugSerie(", "FORTSCHRITT.auszugAlsStand("]
        .every((t) => profilText.indexOf(t) !== -1));
pruefe("Level antippbar → Level-Pfad", /UPCREW_LEVELPFAD\.oeffnen\(/.test(profilText)
    && /beiLevel: \(\) => PROFIL_BILDSCHIRM\.levelPfadOeffnen\(/.test(profilText));
pruefe("Statistik: „Tageswort gelöst“ statt „gelöst“ (seit 0.26.0)",
    profilText.indexOf("\"Tageswort gelöst\"") !== -1 && !/, "gelöst"\)/.test(profilText));
pruefe("Profil: Abzeichen-Wahl schreibt über SPIELER.abzeichenSetzen",
    /SPIELER\.abzeichenSetzen\(ANMELDUNG\.abgleich\.daten, ich\.id, liste\)/.test(profilText));
pruefe("Profil: Werte aus dem Modell (Spiele, Statistik, Level, Titel)",
    ["FORTSCHRITT.spiele(", "FORTSCHRITT.statistik(", "FORTSCHRITT.level(", "FORTSCHRITT.titelVon("]
        .every((t) => profilText.indexOf(t) !== -1));
pruefe("Profil: Abzeichen aus dem gemeinsamen Baustein, keine eigene Kopie",
    /UPCREW_ABZEICHEN\.alle\(/.test(profilText) && /UPCREW_ABZEICHEN\.blatt\(/.test(profilText)
        && profilText.indexOf("\"button\"") === -1 && !/abzeichen\(eintrag, beiKlick\)/.test(lesen("js/bausteine.js")));
pruefe("Profil: Orte von Blunderluck aus KONFIG",
    /KONFIG\.andereSpiele\.blunderluck/.test(profilText)
        && KONFIG.andereSpiele.blunderluck.orte.length === 6);
pruefe("XP-Zahlen stehen nur im Modell",
    liste("js").filter((d) => d.endsWith(".js") && d !== "js/fortschritt.js")
        .every((d) => !/tagesaufgabe:\s*20|beideFaktor:/.test(lesen(d))));
pruefe("Herausforderungen stehen nicht im Menü",
    /id: "herausforderungen"[\s\S]*?imMenue: false/.test(lesen("js/bildschirm-herausforderungen.js")));

/* Kopfzeile auf dem Start (seit 0.7.0, wie Blunderluck): kein Schriftzug
   mehr, links das Kurzprofil, rechts das Menü. */
pruefe("Start: kein Schriftzug „Typoluck“ mehr oben", lesen("js/bildschirm-start.js").indexOf("start-logo") === -1);
pruefe("Start: Vorschau-Karte oben, Rückfall Kurzprofil mit Tageswort-Quote",
    /_profilKarteBauen\(ich, name\)/.test(lesen("js/bildschirm-start.js"))
        && /werte\.quote \+ " % Tageswort"/.test(lesen("js/bildschirm-start.js"))
        && !/"Serie " \+ werte\.serie/.test(lesen("js/bildschirm-start.js")));
/* „Freunde heute" auf dem Start ist seit 0.23.1 gelöscht (Laden, Uhr,
   Karte) — Freunde zeigt die Rangliste. */
const startText = lesen("js/bildschirm-start.js");
pruefe("Start: keine Freunde-Uhr mehr", !/_freundeLaden|_auffrischenAn|AUFFRISCHEN_MS|setInterval/.test(startText));
pruefe("Mitte in der Leiste: Start", /id: "start"/.test(leisteEintraege[2] || ""));
/* Seit 0.15.3 (Nutzer 27.09.2026): während einer Runde keine Leiste unten */
const wordleQuelle = lesen("js/bildschirm-wordle.js");
pruefe("Runde läuft: body.im-spiel wird im Zeichnen gesetzt (auch beim Aufdecken der letzten Zeile)",
    /_zeichnen\(tastaturBehalten\) \{[\s\S]*?classList\.toggle\("im-spiel", runde\.zustand === "laeuft" \|\| !!tastaturBehalten\)/
        .test(wordleQuelle));
/* Seit 0.23.3 (Nutzer 28.09.2026): Tastatur unten fest, nur das Brett rollt */
const wordleStil = lesen("css/stil-wordle.css");
pruefe("Runde: Seite rollt nicht (100dvh, overflow hidden)",
    /body\.im-spiel \.inhalt\[data-bildschirm="wordle"\] \{[^}]*height: 100dvh;[^}]*overflow: hidden;/.test(wordleStil));
pruefe("Runde: unten Platz für die Wischleiste (safe-area)",
    /body\.im-spiel \.inhalt\[data-bildschirm="wordle"\] \{[^}]*env\(safe-area-inset-bottom\)/.test(wordleStil));
pruefe("Runde: nur das Brett rollt",
    /\.wordle-brett \{[^}]*overflow-y: auto;/.test(wordleStil));
pruefe("Runde: aktive Zeile rollt ins Bild",
    /_aktiveZeileZeigen\(\) \{/.test(wordleQuelle)
        && (wordleQuelle.match(/_aktiveZeileZeigen\(\);/g) || []).length >= 2);
pruefe("Beim Verlassen kommt die Leiste zurück",
    /verlassen\(\) \{[\s\S]*?classList\.remove\("im-spiel"\)/.test(wordleQuelle));
pruefe("Stil: im Spiel keine Leiste, unten nur der iPhone-Streifen",
    /body\.im-spiel \.leiste\.up-leiste \{\s*display: none;/.test(lesen("css/stil.css"))
        && /body\.im-spiel \.inhalt \{\s*padding-bottom: calc\(16px \+ env\(safe-area-inset-bottom\)\);/.test(lesen("css/stil.css")));
pruefe("Der Zurück-Pfeil bleibt der Weg hinaus", /zurueck: \(\) => NAVIGATION\.zurueck\(\)/.test(wordleQuelle));
pruefe("Rechts in der Leiste: die Rangliste (seit 0.25.0)", /id: "rangliste"/.test(leisteEintraege[4] || ""));

/* Seit 0.25.0 (gemeinsame Runde 7, Einbau-Notiz 29.09.2026): Leisten-Tabs
   sind SEITEN, Blätter nur für Bereiche ohne Leisten-Knopf; kein Menü hinter
   den drei Balken mehr. */
const navText = lesen("js/navigation.js");
const indexStileAlle = (index.match(/<link rel="stylesheet" href="([^"]+)"/g) || [])
    .map((z) => z.match(/href="([^"]+)"/)[1]);
for (const [datei, id] of [["js/bildschirm-profil.js", "profil"], ["js/bildschirm-einstellungen.js", "einstellungen"],
    ["js/bildschirm-verwaltung.js", "verwaltung"]]) {
    pruefe("Als Blatt: " + id, new RegExp("id: \"" + id + "\"[\\s\\S]*?alsBlatt: true").test(lesen(datei)));
}
for (const datei of ["js/bildschirm-shop.js", "js/bildschirm-sammlung.js", "js/bildschirm-start.js",
    "js/bildschirm-herausforderungen.js", "js/bildschirm-rangliste.js", "js/bildschirm-wordle.js"]) {
    pruefe("Seite, kein Blatt: " + datei, !/alsBlatt/.test(lesen(datei)));
}
pruefe("Kein Menü hinter den drei Balken mehr",
    !/menueBauen|_menueOeffnen/.test(liste("js").filter((d) => d.endsWith(".js")).map(lesen).join("")));
pruefe("Ein Seitenwechsel schliesst alle Blätter",
    /_wechseln\(id, parameter\) \{\s*\/\*[^*]*\*\/\s*NAVIGATION\._alleSchliessen\(\);/.test(navText)
        && /UPCREW_BLATT\.alleSchliessen\(\)/.test(navText));
pruefe("Blätter über den Baustein, eingerichtet mit Halter und Seite",
    /UPCREW_BLATT\.einrichten\(\{ ebenen: ebenenEl, haupt: inhaltEl, verlauf: true, horchen: false \}\)/.test(navText)
        && /document\.getElementById\("ebenen"\)/.test(lesen("js/app.js")));
pruefe("Zurück-Taste schliesst zuerst das oberste Blatt",
    /_beiZurueck\(zustand, startId, ereignis\) \{[\s\S]{0,400}UPCREW_BLATT\.beiZurueck\(/.test(navText));
pruefe("Zahnrad im Profil → Einstellungen (echtes Zahnrad des Bausteins)",
    /blattRechts:[\s\S]*?_zahnrad\(\)/.test(lesen("js/bildschirm-profil.js"))
    && /UPCREW_EINSTELLUNGEN\.zahnradKnopf\(beiKlick/.test(lesen("js/bildschirm-profil.js")));
/* Seit 0.26.0 (wie Blunderluck v0.156.1): Freunde als REITER der Rangliste,
   keine eigene Seite und kein Knopf mehr. */
pruefe("Freunde: Reiter der Rangliste mit der Zahl offener Anfragen",
    /\{ wert: "freunde", text: "Freunde" \}/.test(lesen("js/bildschirm-rangliste.js"))
        && /NAVIGATION\.markeAnbringen\(freunde, "freunde"\)/.test(lesen("js/bildschirm-rangliste.js"))
        && /FREUNDE_BILDSCHIRM\.zeigen\(ort\)/.test(lesen("js/bildschirm-rangliste.js")));
pruefe("Freunde: keine eigene Seite mehr",
    !/id: "freunde"|NAVIGATION\.zeigen\("freunde"|FREUNDE_BILDSCHIRM\.anmelden/
        .test(liste("js").filter((d) => d.endsWith(".js")).map(lesen).join("")));
pruefe("Einstellungen und Verwaltung im gemeinsamen Aufbau, als Typoluck",
    /UPCREW_EINSTELLUNGEN\.bauen\(inhalt, "einstellungen", [\s\S]*?\{ spiel: "Typoluck" \}\)/.test(lesen("js/bildschirm-einstellungen.js"))
        && /UPCREW_EINSTELLUNGEN\.bauen\(inhalt, "verwaltung", [\s\S]*?\{ spiel: "Typoluck" \}\)/.test(lesen("js/bildschirm-verwaltung.js")));
pruefe("Die Seite hinter Blättern steht still (Regel im Baustein, stil-blatt.css zuletzt)",
    /html\.up-bl-offen,\s*html\.up-bl-offen body \{\s*overflow: hidden;/.test(lesen("css/upcrew-blatt.css"))
        && indexStileAlle[indexStileAlle.length - 1] === "css/stil-blatt.css");
pruefe("Die Rangliste steht nicht doppelt (nicht auch im Menü)",
    /id: "rangliste"[\s\S]*?imMenue: false/.test(lesen("js/bildschirm-rangliste.js")));

/* ------------------------------------------------------------------ *
 * Die UPCrew-Bausteine (seit 0.7.0): kopiert, nie abgewandelt
 * ------------------------------------------------------------------ */

/* Farbwelt und Intro kommen aus Design\3D-Schrift\final. Der Test liest
   bewusst NUR im eigenen Projekt (ein Projekt muss sich allein verschieben
   lassen, und ein Pfad nach draussen zur Laufzeit ginge an der
   Projekt-Schranke vorbei). Ob die Kopien gleich der Quelle sind, prüft
   der Mensch bzw. Claude beim Kopieren (Byte-Vergleich, STATUS.md). */
for (const kopie of KOPIEN) {
    pruefe("UPCrew-Baustein vorhanden: " + kopie, fs.existsSync(path.join(wurzel, kopie)));
}
const reihe = indexSkripte;
pruefe("Farbwelt lädt VOR darstellung.js (kein Aufblitzen alter Farben)",
    reihe.indexOf("js/upcrew-intro.js") !== -1
        && reihe.indexOf("js/upcrew-intro.js") < reihe.indexOf("js/upcrew-farbwelten.js")
        && reihe.indexOf("js/upcrew-farbwelten.js") < reihe.indexOf("js/darstellung.js"));
/* Seit 0.8.0: nach upcrew-farbwelten.js kommt upcrew-aussehen.js, DIREKT
   danach der frühe Aufruf (darstellung.js wendet beim Laden an). */
gleich("Aussehen direkt nach der Farbwelt, darstellung.js direkt danach",
    reihe.slice(reihe.indexOf("js/upcrew-farbwelten.js"), reihe.indexOf("js/upcrew-farbwelten.js") + 3),
    ["js/upcrew-farbwelten.js", "js/upcrew-aussehen.js", "js/darstellung.js"]);
pruefe("darstellung.js wendet beim Laden an (erst Umzug, dann anwenden)",
    /\nDARSTELLUNG\.migrieren\(\);\nDARSTELLUNG\.anwenden\(\);\n/.test(lesen("js/darstellung.js").replace(/\r/g, "")));
pruefe("Die alte Wahl „thema“ wird nur noch beim Umzug gelesen",
    (lesen("js/darstellung.js").replace(/\/\*[\s\S]*?\*\//g, "").match(/"thema"/g) || []).length === 1);
pruefe("Der Anpassen-Baustein lädt nach seinen Bausteinen und vor der Sammlung",
    reihe.indexOf("js/upcrew-aussehen.js") < reihe.indexOf("js/upcrew-anpassen.js")
        && reihe.indexOf("js/upcrew-anpassen.js") !== -1
        && reihe.indexOf("js/upcrew-anpassen.js") < reihe.indexOf("js/bildschirm-sammlung.js"));
pruefe("Das Sammlungs-Modell lädt vor seinem Bildschirm",
    reihe.indexOf("js/sammlung.js") !== -1 && reihe.indexOf("js/sammlung.js") < reihe.indexOf("js/bildschirm-sammlung.js"));
pruefe("Der Leisten-Baustein lädt NACH dem eigenen Stil",
    indexStile.indexOf("css/upcrew-leiste.css") > indexStile.indexOf("css/stil.css")
        && indexStile.indexOf("css/upcrew-leiste.css") > indexStile.indexOf("css/stil-bildschirme.css"));

fazit();
