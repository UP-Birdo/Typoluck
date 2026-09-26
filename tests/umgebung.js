/*
 * umgebung.js — lädt die ECHTEN Modell-Dateien aus js\ so, wie der Browser
 * sie sieht: als Namen im globalen Raum. Keine Kopien von Funktionen (Haus-
 * Regel: Kopien driften).
 *
 * Die Bildschirm-Dateien werden hier NICHT geladen — sie brauchen ein
 * echtes DOM. Sie werden im Browser angesehen (Werkstatt, docs\DEPLOYMENT.md).
 */

const { speicherAttrappe } = require("./pruefer.js");

const js = (name) => require("../js/" + name);

global.KONFIG = js("konfig.js");
global.WOERTER_DE = js("woerter-de.js");
global.VERSIEGELUNG = js("versiegelung.js");
global.SPIELER = js("spieler.js");
global.ICH = js("ich.js");
global.WORDLE = js("wordle.js");
global.ERGEBNISSE = js("ergebnisse.js");
global.RANGLISTE = js("rangliste.js");
global.Abgleich = js("abgleich.js");

const speicherTeile = js("speicher.js");
global.SpeicherLokal = speicherTeile.SpeicherLokal;
global.SpeicherGemeinsam = speicherTeile.SpeicherGemeinsam;
global.speicherErzeugen = speicherTeile.speicherErzeugen;

/* Der Gerätespeicher: eine Attrappe, je Test frisch zu setzen. */
global.geraet = speicherAttrappe();
global.window = { localStorage: global.geraet };
ICH._speicher = () => global.geraet;

/* Der Baustein js\upcrew-aussehen.js spricht `localStorage` ohne `window.`
   an. Node kennt je nach Fassung einen eigenen (oder einen, der nur mit
   Schalter funktioniert) — deshalb fest auf die Attrappe gebogen. */
function globalerSpeicher(speicher) {
    try {
        Object.defineProperty(globalThis, "localStorage", {
            value: speicher, writable: true, configurable: true
        });
    } catch (fehler) {
        global.localStorage = speicher;
    }
}
globalerSpeicher(global.geraet);

function geraetLeeren() {
    global.geraet = speicherAttrappe();
    global.window.localStorage = global.geraet;
    globalerSpeicher(global.geraet);
}

/*
 * Lädt den ECHTEN gemeinsamen Aussehen-Baustein (js\upcrew-aussehen.js,
 * seit 0.8.0) frisch — jedes Mal neu, weil er sich das gelesene Aussehen
 * merkt und ein neuer Gerätespeicher sonst nicht bei ihm ankäme. Er horcht
 * beim Laden auf Fenster und Dokument; beides bekommt hier eine stumme
 * Attrappe. Liefert den Baustein und setzt ihn global wie im Browser.
 */
function aussehenLaden() {
    global.window.addEventListener = global.window.addEventListener || (() => {});
    if (typeof global.document === "undefined") {
        global.document = { addEventListener: () => {}, visibilityState: "visible" };
    }
    const pfad = require.resolve("../js/upcrew-aussehen.js");
    delete require.cache[pfad];
    require(pfad);
    global.UPCREW_AUSSEHEN = global.window.UPCREW_AUSSEHEN;
    return global.UPCREW_AUSSEHEN;
}

module.exports = { geraetLeeren, aussehenLaden };
