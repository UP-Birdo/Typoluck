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

function geraetLeeren() {
    global.geraet = speicherAttrappe();
    global.window.localStorage = global.geraet;
}

module.exports = { geraetLeeren };
