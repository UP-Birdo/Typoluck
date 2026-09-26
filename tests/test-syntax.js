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
    "js/upcrew-aussehen.js", "js/upcrew-anpassen.js", "css/upcrew-anpassen.css", "css/upcrew-knoepfe.css"
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
for (const datei of aufPlatte) {
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
gleich("Manifest: Name", JSON.parse(lesen("manifest.webmanifest")).name, "Typoluck");

/* ------------------------------------------------------------------ *
 * Die Leiste unten und das Menü (seit 0.5.0, Nutzer 25.09.2026: „unten
 * das Tab-Menü sollte nie weg, rechts die Rangliste, links ein
 * Platzhalter"; „in die drei Balken auch Einstellungen")
 * ------------------------------------------------------------------ */

pruefe("Die Leiste steht fest in index.html, ausserhalb des Inhalts",
    /<\/main>\s*(<!--[\s\S]*?-->\s*)?<nav class="leiste" id="leiste"/.test(index));
const leisteText = (lesen("js/navigation.js").match(/LEISTE: \[([\s\S]*?)\],/) || ["", ""])[1];
const leisteEintraege = leisteText.split("\n").filter((z) => z.indexOf("{") !== -1);
/* Seit 0.8.0 (UPCrew-Runde 3) fünf Plätze wie in Blunderluck:
   Aufgaben · Bald · Start · Rangliste · Anpassen — Start in der Mitte,
   Anpassen ganz rechts. */
gleich("Die Leiste hat fünf Einträge", leisteEintraege.length, 5);
/* Links seit 0.7.0 „Aufgaben" (UPCrew-Runde 2, gleich wie Blunderluck);
   bis 0.6.x der Platzhalter „Bald". */
pruefe("Links in der Leiste: Aufgaben",
    /id: "herausforderungen", text: "Aufgaben", zeichen: "aufgaben"/.test(leisteEintraege[0] || ""));
pruefe("Platz 2: der Platzhalter „Bald“ (abgeschaltet, ohne Bildschirm)",
    /text: "Bald", zeichen: "platzhalter", platzhalter: true/.test(leisteEintraege[1] || "")
        && !/id:/.test(leisteEintraege[1] || ""));
pruefe("Ganz rechts: Anpassen",
    /id: "anpassen", text: "Anpassen", zeichen: "anpassen"/.test(leisteEintraege[4] || ""));
gleich("Das Anpassen-Zeichen ist der gemeinsame Pfad mit Blunderluck",
    (lesen("js/bausteine.js").match(/anpassen: "([^"]+)"/) || [])[1],
    "M4 7 H13 M17 7 H20 M15 5 V9 M4 17 H7 M11 17 H20 M9 15 V19");
pruefe("Anpassen steht nicht im Menü",
    /id: "anpassen"[\s\S]*?imMenue: false/.test(lesen("js/bildschirm-anpassen.js")));
pruefe("Anpassen zeigt den gemeinsamen Tab als Typoluck, Stufe aus einer Stelle",
    /UPCREW_ANPASSEN\.zeigen\(ort, \{\s*app: "typoluck",\s*stufe: ANPASSEN_BILDSCHIRM\.stufe\(\)/
        .test(lesen("js/bildschirm-anpassen.js")));
pruefe("Anpassen räumt beim Verlassen auf",
    /verlassen: \(\) => ANPASSEN_BILDSCHIRM\.entfernen\(\)/.test(lesen("js/bildschirm-anpassen.js")));
pruefe("Keine Freischalt-Stufen oder Standard-Werte in der App festgeschrieben",
    liste("js").filter((d) => d.endsWith(".js") && KOPIEN.indexOf(d) === -1)
        .every((d) => !/\b(S[1-6]|K[1-6])\b"|"(S[1-6]|K[1-6])"|STUFEN\s*[=:]/.test(
            lesen(d).replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, ""))));
pruefe("Einstellungen: Standard-Schrift und Weg zu Anpassen",
    /"Standard-Schrift"/.test(lesen("js/bildschirm-einstellungen.js"))
        && /NAVIGATION\.zeigen\("anpassen"/.test(lesen("js/bildschirm-einstellungen.js")));
gleich("Das Aufgaben-Zeichen ist der gemeinsame Pfad mit Blunderluck",
    (lesen("js/bausteine.js").match(/aufgaben: "([^"]+)"/) || [])[1], "M4 20 L10 14 L14 17 L20 6 M15 6 H20 V11");
pruefe("Herausforderungen: Titel und Satz wie abgesprochen",
    lesen("js/bildschirm-herausforderungen.js").indexOf('TITEL: "Herausforderungen"') !== -1
        && lesen("js/bildschirm-herausforderungen.js")
            .indexOf("TEXT: \"Kommt bald – hier siehst du deinen Weg durch beide Spiele.\"") !== -1);
pruefe("Herausforderungen stehen nicht im Menü",
    /id: "herausforderungen"[\s\S]*?imMenue: false/.test(lesen("js/bildschirm-herausforderungen.js")));

/* Kopfzeile auf dem Start (seit 0.7.0, wie Blunderluck): kein Schriftzug
   mehr, links das Kurzprofil, rechts das Menü. */
pruefe("Start: kein Schriftzug „Typoluck“ mehr oben", lesen("js/bildschirm-start.js").indexOf("start-logo") === -1);
pruefe("Start: Kurzprofil mit Serie und Quote",
    /_kurzprofilBauen\(ich, name\)/.test(lesen("js/bildschirm-start.js"))
        && /"Serie " \+ werte\.serie \+ " · " \+ werte\.quote \+ " % gelöst"/.test(lesen("js/bildschirm-start.js")));
/* „Freunde heute" lebt (seit 0.8.1, ROADMAP Nr. 9): die Uhr läuft nur auf
   dem Start und nie in der Werkstatt, und sie zeigt nie den Platzhalter. */
const startText = lesen("js/bildschirm-start.js");
pruefe("Start: Uhr wird beim Verlassen abgeschaltet",
    /verlassen: \(\) => START\._auffrischenAus\(\)/.test(startText)
        && /clearInterval\(START\._uhr\)/.test(startText));
pruefe("Start: keine Uhr in der Werkstatt",
    /_auffrischenAn\(\) \{\s*if \(START\._uhr !== null \|\| \(typeof WERKSTATT !== "undefined" && WERKSTATT\.aktiv\(\)\)\)/
        .test(startText));
pruefe("Start: die Uhr lädt still", /setInterval\([\s\S]*?START\._freundeLaden\(true\)/.test(startText));
gleich("Start: alle 30 Sekunden", (startText.match(/AUFFRISCHEN_MS: (\d+)/) || [])[1], "30000");
pruefe("Mitte in der Leiste: Start", /id: "start"/.test(leisteEintraege[2] || ""));
pruefe("Platz 4 in der Leiste: die Rangliste", /id: "rangliste"/.test(leisteEintraege[3] || ""));
pruefe("Einstellungen stehen im Menü",
    /id: "einstellungen"[\s\S]*?imMenue: true/.test(lesen("js/bildschirm-einstellungen.js")));
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
pruefe("Der Anpassen-Tab lädt nach seinen Bausteinen und vor seinem Bildschirm",
    reihe.indexOf("js/upcrew-aussehen.js") < reihe.indexOf("js/upcrew-anpassen.js")
        && reihe.indexOf("js/upcrew-anpassen.js") < reihe.indexOf("js/bildschirm-anpassen.js"));

fazit();
