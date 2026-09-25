/*
 * darstellung.js — wie die App aussieht: hell, dunkel oder wie das Gerät,
 * und die Kachelfarben für Farbenblinde (seit 0.6.0, ROADMAP Nr. 8).
 *
 * EIN Baustein, wie FUEHLEN für die Vibration:
 *
 *     DARSTELLUNG.thema()            "geraet" | "hell" | "dunkel"
 *     DARSTELLUNG.themaSetzen(wert)
 *     DARSTELLUNG.kontrast()         true = Orange/Blau statt Grün/Gelb
 *     DARSTELLUNG.kontrastSetzen(wert)
 *     DARSTELLUNG.anwenden(wurzel)   schreibt beides als Attribut an <html>
 *
 * WIE ES WIRKT: Die Farben stehen nur als Variablen in css\stil.css. Dieser
 * Baustein setzt zwei Attribute an <html> — `data-darstellung` ("hell" oder
 * "dunkel"; fehlt es, gilt das Gerät) und `data-farben="kontrast"` — und
 * der Stil tauscht daraufhin die Variablen. Keine Farbe steht hier.
 *
 * Ab Werk: wie das Gerät, Standard-Farben (Grün/Gelb ist Wordle-Standard
 * und bleibt die Vorgabe; der Kontrast ist ein Angebot, kein Ersatz).
 * Gespeichert je Gerät über ICH.einstellung, wie die Vibration.
 *
 * Angewendet wird SOFORT beim Laden dieser Datei (ganz unten) — die Datei
 * steht früh in index.html, damit kein Bild in der falschen Farbe aufblitzt.
 */

const DARSTELLUNG = {

    THEMEN: ["geraet", "hell", "dunkel"],

    thema() {
        const wert = ICH.einstellung("thema", "geraet");
        return DARSTELLUNG.THEMEN.indexOf(wert) !== -1 ? wert : "geraet";
    },

    themaSetzen(wert) {
        ICH.einstellungSetzen("thema", DARSTELLUNG.THEMEN.indexOf(wert) !== -1 ? wert : "geraet");
    },

    kontrast() {
        return ICH.einstellung("farbenKontrast", false) === true;
    },

    kontrastSetzen(wert) {
        ICH.einstellungSetzen("farbenKontrast", wert === true);
    },

    /* `wurzel` ist <html>; die Tests geben ein Ersatzobjekt mit `dataset`. */
    anwenden(wurzel) {
        const ziel = wurzel || (typeof document !== "undefined" ? document.documentElement : null);
        if (!ziel || !ziel.dataset) {
            return;
        }
        const thema = DARSTELLUNG.thema();
        if (thema === "geraet") {
            delete ziel.dataset.darstellung;
        } else {
            ziel.dataset.darstellung = thema;
        }
        if (DARSTELLUNG.kontrast()) {
            ziel.dataset.farben = "kontrast";
        } else {
            delete ziel.dataset.farben;
        }
    }
};

DARSTELLUNG.anwenden();

if (typeof module !== "undefined" && module.exports) {
    module.exports = DARSTELLUNG;
}
