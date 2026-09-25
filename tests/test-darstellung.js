/*
 * test-darstellung.js — hell/dunkel (js\darstellung.js, seit 0.6.0) und die
 * Kachelfarben-Sperre (seit 0.6.2: „richtig“ nie grün, „vorhanden“ nie gelb
 * — NYT-Look). Die Sperre wird gegen JEDE Kachelfarbe im Stil gefahren.
 *
 * <html> wird durch ein Ersatzobjekt mit `dataset` vertreten; geprüft wird,
 * welche Attribute der Baustein setzt — der Stil macht daraus die Farben
 * (angesehen im Browser, nicht hier).
 */

const fs = require("fs");
const path = require("path");
const { pruefe, gleich, fazit } = require("./pruefer.js");
const { geraetLeeren } = require("./umgebung.js");
const DARSTELLUNG = require("../js/darstellung.js");

const wurzel = () => ({ dataset: {} });

/* ------------------------------------------------------------------ *
 * Vorgaben und Speichern
 * ------------------------------------------------------------------ */

geraetLeeren();
gleich("Ab Werk: wie das Gerät", DARSTELLUNG.thema(), "geraet");

DARSTELLUNG.themaSetzen("dunkel");
gleich("Dunkel wird gespeichert", DARSTELLUNG.thema(), "dunkel");
DARSTELLUNG.themaSetzen("hell");
gleich("Hell wird gespeichert", DARSTELLUNG.thema(), "hell");
DARSTELLUNG.themaSetzen("lila");
gleich("Unbekannter Wert wird zu „wie das Gerät“", DARSTELLUNG.thema(), "geraet");
ICH.einstellungSetzen("thema", 42);
gleich("Kaputter gespeicherter Wert liefert die Vorgabe", DARSTELLUNG.thema(), "geraet");

DARSTELLUNG.themaSetzen("dunkel");
gleich("Vibration bleibt unberührt", ICH.einstellung("vibration", true), true);

/* ------------------------------------------------------------------ *
 * Anwenden — die Attribute an <html>
 * ------------------------------------------------------------------ */

geraetLeeren();
let html = wurzel();
html.dataset.darstellung = "dunkel";
html.dataset.farben = "kontrast";
DARSTELLUNG.anwenden(html);
gleich("Wie das Gerät: kein Darstellungs-Attribut", html.dataset.darstellung, undefined);
gleich("Ein altes Farben-Attribut (bis 0.6.1) wird entfernt", html.dataset.farben, undefined);

geraetLeeren();
ICH.einstellungSetzen("farbenKontrast", true);
DARSTELLUNG.themaSetzen("hell");
html = wurzel();
DARSTELLUNG.anwenden(html);
gleich("Hell setzt data-darstellung=hell", html.dataset.darstellung, "hell");
gleich("Alte Einstellung farbenKontrast setzt nichts mehr", html.dataset.farben, undefined);

DARSTELLUNG.themaSetzen("dunkel");
DARSTELLUNG.anwenden(html);
gleich("Umschalten auf dunkel", html.dataset.darstellung, "dunkel");

let geworfen = false;
try {
    DARSTELLUNG.anwenden({});
} catch (fehler) {
    geworfen = true;
}
pruefe("Ohne dataset wirft anwenden nicht", !geworfen);

/* ------------------------------------------------------------------ *
 * Der Stil kennt die Attribute
 * ------------------------------------------------------------------ */

const stil = fs.readFileSync(path.join(__dirname, "..", "css", "stil.css"), "utf8");
pruefe("Stil: Gerät-dunkel gilt nicht, wenn hell gewählt ist",
    stil.indexOf(':root:not([data-darstellung="hell"])') !== -1);
pruefe("Stil: dunkel von Hand", stil.indexOf(':root[data-darstellung="dunkel"]') !== -1);
pruefe("Stil: kein Farben-Block mehr (Grün/Gelb-Wahl ist weg)",
    stil.indexOf("[data-farben=") === -1);

/* ------------------------------------------------------------------ *
 * Die Kachelfarben-Sperre (seit 0.6.2)
 * ------------------------------------------------------------------ */

/* Die Farben des NYT-Spiels (hell und dunkel) — alle müssen fallen. */
for (const farbe of ["#6aaa64", "#538d4e"]) {
    pruefe("Sperre: NYT-Grün ist für „richtig“ verboten: " + farbe,
        !DARSTELLUNG.kachelFarbeErlaubt("richtig", farbe).erlaubt);
}
for (const farbe of ["#c9b458", "#b59f3b"]) {
    pruefe("Sperre: NYT-Gelb ist für „vorhanden“ verboten: " + farbe,
        !DARSTELLUNG.kachelFarbeErlaubt("vorhanden", farbe).erlaubt);
}
/* Die eigenen Farben bis 0.6.1 — auch sie waren zu nah dran. */
pruefe("Sperre: altes Grün #3f8f4f fällt", !DARSTELLUNG.kachelFarbeErlaubt("richtig", "#3f8f4f").erlaubt);
pruefe("Sperre: altes Gelb #c9a227 fällt", !DARSTELLUNG.kachelFarbeErlaubt("vorhanden", "#c9a227").erlaubt);
/* Was erlaubt bleibt. */
pruefe("Sperre: Orange ist für „richtig“ erlaubt", DARSTELLUNG.kachelFarbeErlaubt("richtig", "#e8702a").erlaubt);
pruefe("Sperre: Blau ist für „vorhanden“ erlaubt", DARSTELLUNG.kachelFarbeErlaubt("vorhanden", "#3f8fe0").erlaubt);
pruefe("Sperre: Grau hat keinen Farbton und ist erlaubt",
    DARSTELLUNG.kachelFarbeErlaubt("richtig", "#787c84").erlaubt);
pruefe("Sperre: unlesbare Farbe ist nicht erlaubt",
    !DARSTELLUNG.kachelFarbeErlaubt("richtig", "green").erlaubt);

/* JEDE Kachelfarbe in JEDER Stil-Datei — auch in künftigen Farbpaketen. */
let gezaehlt = 0;
for (const datei of fs.readdirSync(path.join(__dirname, "..", "css"))) {
    const text = fs.readFileSync(path.join(__dirname, "..", "css", datei), "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, "");
    const muster = /--kachel-(richtig|vorhanden)(?:-kante)?:\s*([^;]+);/g;
    let treffer;
    while ((treffer = muster.exec(text)) !== null) {
        gezaehlt++;
        const antwort = DARSTELLUNG.kachelFarbeErlaubt(treffer[1], treffer[2]);
        pruefe("Kachelfarbe erlaubt: " + datei + " " + treffer[0], antwort.erlaubt, antwort.grund);
    }
}
pruefe("Die Sperre hat Kachelfarben gefunden (mindestens hell und dunkel)", gezaehlt >= 8, String(gezaehlt));

/* ------------------------------------------------------------------ *
 * Die Farbwelten (seit 0.7.0, js\upcrew-farbwelten.js)
 * ------------------------------------------------------------------ */

/* Der Baustein hängt sich an `window`; das Intro liefert die Grundfarben. */
require("../js/upcrew-intro.js");
require("../js/upcrew-farbwelten.js");
global.UPCREW_INTRO = window.UPCREW_INTRO;
global.UPCREW_FARBWELTEN = window.UPCREW_FARBWELTEN;
pruefe("Farbwelten-Baustein geladen", typeof UPCREW_FARBWELTEN === "object" && UPCREW_FARBWELTEN !== null);
gleich("Die App nutzt vorerst nur Werkstatt", DARSTELLUNG.FARBWELT, "werkstatt");

/* Werkstatt liefert genau die heutigen Kachelfarben aus css\stil.css. */
for (const modus of ["dunkel", "hell"]) {
    const werte = UPCREW_FARBWELTEN.werte("werkstatt", modus);
    gleich("Werkstatt " + modus + ": Kachel richtig wie im Stil", werte["--kachel-richtig"], "#e8702a");
    gleich("Werkstatt " + modus + ": Kachel vorhanden wie im Stil", werte["--kachel-vorhanden"], "#3f8fe0");
}

/* JEDE Welt, hell und dunkel — auch die, die man erst später freischaltet:
   Kacheln durch die Sperre, Lesbarkeit durch die Prüfung des Bausteins. */
for (const welt of Object.keys(UPCREW_INTRO.WELTEN)) {
    for (const modus of ["dunkel", "hell"]) {
        const werte = UPCREW_FARBWELTEN.werte(welt, modus);
        for (const rolle of ["richtig", "vorhanden"]) {
            const antwort = DARSTELLUNG.kachelFarbeErlaubt(rolle, werte["--kachel-" + rolle]);
            pruefe("Farbwelt " + welt + " " + modus + ": Kachel " + rolle + " erlaubt", antwort.erlaubt, antwort.grund);
        }
        const verstoesse = UPCREW_FARBWELTEN.pruefen(welt, modus);
        pruefe("Farbwelt " + welt + " " + modus + ": lesbar", verstoesse.length === 0, verstoesse.join(" | "));
    }
}

/* Anwenden setzt die Farben an <html>: mit Ersatz-`style`. */
geraetLeeren();
DARSTELLUNG.themaSetzen("hell");
const gesetzt = {};
html = { dataset: {}, style: { setProperty: (name, wert) => { gesetzt[name] = wert; } } };
DARSTELLUNG.anwenden(html);
gleich("Anwenden setzt die helle Werkstatt-Fläche",
    gesetzt["--flaeche"], UPCREW_INTRO.WELTEN.werkstatt.hell.bg);
gleich("Anwenden merkt die Welt am <html>", html.dataset.farbwelt, "werkstatt");
DARSTELLUNG.themaSetzen("dunkel");
DARSTELLUNG.anwenden(html);
gleich("Wechsel auf dunkel zieht die Farben mit",
    gesetzt["--flaeche"], UPCREW_INTRO.WELTEN.werkstatt.dunkel.bg);

fazit();
