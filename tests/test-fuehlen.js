/*
 * test-fuehlen.js — die Vibration (js\fuehlen.js) und die Geräte-
 * Einstellungen (js\ich.js), seit 0.4.0.
 *
 * Das Gerät wird durch eine Attrappe ersetzt, die sich merkt, welches Muster
 * es bekommen hätte.
 */

const { pruefe, gleich, fazit } = require("./pruefer.js");
const { geraetLeeren } = require("./umgebung.js");
const FUEHLEN = require("../js/fuehlen.js");

let gespuert = [];
const mitVibration = { vibrate: (muster) => { gespuert.push(muster); return true; } };
const ohneVibration = {};

/* ------------------------------------------------------------------ *
 * Geräte-Einstellungen
 * ------------------------------------------------------------------ */

geraetLeeren();
gleich("Fehlende Einstellung liefert die Vorgabe", ICH.einstellung("vibration", true), true);
ICH.einstellungSetzen("vibration", false);
gleich("Gesetzte Einstellung wird gelesen", ICH.einstellung("vibration", true), false);
ICH.einstellungSetzen("anderes", 3);
gleich("Zweite Einstellung lässt die erste stehen", ICH.einstellung("vibration", true), false);
pruefe("Einstellungen liegen unter einem Typoluck-Schlüssel",
    ICH.SCHLUESSEL_EINSTELLUNGEN.startsWith("typoluck."));
geraet.setItem(ICH.SCHLUESSEL_EINSTELLUNGEN, "kaputt{");
gleich("Kaputter Speicher liefert die Vorgabe", ICH.einstellung("vibration", true), true);

/* ------------------------------------------------------------------ *
 * Vibration
 * ------------------------------------------------------------------ */

geraetLeeren();
FUEHLEN._navigator = () => mitVibration;
gespuert = [];
pruefe("Ab Werk an", FUEHLEN.an());
pruefe("Verfügbar, wenn das Gerät vibrieren kann", FUEHLEN.verfuegbar());
FUEHLEN.tippen();
FUEHLEN.erfolg();
FUEHLEN.fehler();
gleich("Tippen, Erfolg und Fehler haben je ihr Muster", gespuert,
    [FUEHLEN.MUSTER.tippen, FUEHLEN.MUSTER.erfolg, FUEHLEN.MUSTER.fehler]);
pruefe("Die drei Muster sind verschieden",
    new Set([FUEHLEN.MUSTER.tippen, FUEHLEN.MUSTER.erfolg, FUEHLEN.MUSTER.fehler].map(JSON.stringify)).size === 3);
pruefe("Tippen ist kurz (höchstens 15 ms)", FUEHLEN.MUSTER.tippen <= 15);

FUEHLEN.anSetzen(false);
gespuert = [];
FUEHLEN.tippen();
FUEHLEN.erfolg();
gleich("Ausgeschaltet vibriert nichts", gespuert, []);
pruefe("Ausgeschaltet bleibt gespeichert", !FUEHLEN.an());
FUEHLEN.anSetzen(true);
pruefe("Wieder eingeschaltet", FUEHLEN.an());

FUEHLEN._navigator = () => ohneVibration;
pruefe("iPhone (ohne vibrate): nicht verfügbar", !FUEHLEN.verfuegbar());
gleich("iPhone: tippen wirft nicht und meldet nichts", FUEHLEN._vibrieren(8), false);

FUEHLEN._navigator = () => ({ vibrate: () => { throw new Error("gesperrt"); } });
gleich("Wirft der Browser, bleibt die App stehen", FUEHLEN._vibrieren(8), false);

fazit();
