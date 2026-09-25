/*
 * test-darstellung.js — hell/dunkel und die Kachelfarben für Farbenblinde
 * (js\darstellung.js, seit 0.6.0).
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
pruefe("Ab Werk: Standard-Farben", !DARSTELLUNG.kontrast());

DARSTELLUNG.themaSetzen("dunkel");
gleich("Dunkel wird gespeichert", DARSTELLUNG.thema(), "dunkel");
DARSTELLUNG.themaSetzen("hell");
gleich("Hell wird gespeichert", DARSTELLUNG.thema(), "hell");
DARSTELLUNG.themaSetzen("lila");
gleich("Unbekannter Wert wird zu „wie das Gerät“", DARSTELLUNG.thema(), "geraet");
ICH.einstellungSetzen("thema", 42);
gleich("Kaputter gespeicherter Wert liefert die Vorgabe", DARSTELLUNG.thema(), "geraet");

DARSTELLUNG.kontrastSetzen(true);
pruefe("Kontrast wird gespeichert", DARSTELLUNG.kontrast());
DARSTELLUNG.kontrastSetzen("ja");
pruefe("Nur echtes true schaltet Kontrast ein", !DARSTELLUNG.kontrast());

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
gleich("Standard-Farben: kein Farben-Attribut", html.dataset.farben, undefined);

DARSTELLUNG.themaSetzen("hell");
DARSTELLUNG.kontrastSetzen(true);
html = wurzel();
DARSTELLUNG.anwenden(html);
gleich("Hell setzt data-darstellung=hell", html.dataset.darstellung, "hell");
gleich("Kontrast setzt data-farben=kontrast", html.dataset.farben, "kontrast");

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
const kontrastStelle = stil.indexOf(':root[data-farben="kontrast"]');
pruefe("Stil: Kontrast-Farben vorhanden", kontrastStelle !== -1);
pruefe("Stil: Kontrast steht NACH den Dunkel-Blöcken (überschreibt beide)",
    kontrastStelle > stil.indexOf(':root[data-darstellung="dunkel"]'));
const kontrastBlock = stil.slice(kontrastStelle, stil.indexOf("}", kontrastStelle));
pruefe("Stil: Kontrast setzt richtig und vorhanden samt Kanten",
    ["--kachel-richtig:", "--kachel-richtig-kante:", "--kachel-vorhanden:", "--kachel-vorhanden-kante:"]
        .every((v) => kontrastBlock.indexOf(v) !== -1));

fazit();
