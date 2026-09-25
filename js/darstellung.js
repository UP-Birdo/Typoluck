/*
 * darstellung.js — wie die App aussieht: hell, dunkel oder wie das Gerät
 * (seit 0.6.0, ROADMAP Nr. 8), und die Sperre für Kachelfarben (seit 0.6.2).
 *
 * EIN Baustein, wie FUEHLEN für die Vibration:
 *
 *     DARSTELLUNG.thema()            "geraet" | "hell" | "dunkel"
 *     DARSTELLUNG.themaSetzen(wert)
 *     DARSTELLUNG.anwenden(wurzel)   schreibt die Wahl als Attribut an <html>
 *     DARSTELLUNG.kachelFarbeErlaubt(rolle, farbe)
 *
 * WIE ES WIRKT: Die Farben stehen nur als Variablen in css\stil.css. Dieser
 * Baustein setzt das Attribut `data-darstellung` ("hell" oder "dunkel";
 * fehlt es, gilt das Gerät) an <html>, und der Stil tauscht daraufhin die
 * Variablen. Keine Farbe steht hier.
 *
 * Ab Werk: wie das Gerät. Gespeichert je Gerät über ICH.einstellung, wie die
 * Vibration.
 *
 * DIE FARBWELT (seit 0.7.0, UPCrew-Runde 2): Die Farben kommen aus dem
 * gemeinsamen Baustein js\upcrew-farbwelten.js (kopiert aus
 * Design\3D-Schrift\final, nie abwandeln). `anwenden` setzt nach dem
 * Attribut die Farben der Welt als Variablen direkt an <html> — hell oder
 * dunkel, je nach `modus()`. Deshalb läuft `anwenden` bei JEDEM Wechsel:
 * beim Laden, nach der Wahl in den Einstellungen und wenn das Gerät
 * zwischen hell und dunkel wechselt (Horcher ganz unten). Die Werte in
 * css\stil.css bleiben der Rückfall, falls der Baustein fehlt.
 * Welt ist vorerst immer „werkstatt" (`FARBWELT`) — das Freischalten kommt
 * in Runde 3; was in `upcrew.farbwelt` steht, wird hier bewusst NICHT
 * gelesen.
 *
 * DIE KACHELFARBEN-SPERRE (Nutzer-Entscheidung 25.09.2026): Die New York
 * Times geht gegen Nachbauten vor, die den Look ihres Spiels übernehmen —
 * ausdrücklich genannt: grüne, gelbe und graue Kacheln. Deshalb gilt, für
 * die Farben ab Werk UND für jedes künftige Farbpaket, das man freischalten
 * kann: „richtig" ist NIE grün, „vorhanden" ist NIE gelb. Jede Kachelfarbe
 * läuft durch `kachelFarbeErlaubt`; tests\test-darstellung.js prüft damit
 * jede Kachelfarbe im Stil. Wer ein Farbpaket baut, prüft seine Kacheln
 * hier — nicht mit dem Auge. Seit 0.6.2 gibt es deshalb auch keine Wahl
 * „Grün/Gelb" mehr (0.6.0 hatte einen Schalter Grün/Gelb – Orange/Blau).
 *
 * Angewendet wird SOFORT beim Laden dieser Datei (ganz unten) — die Datei
 * steht früh in index.html, damit kein Bild in der falschen Farbe aufblitzt.
 */

const DARSTELLUNG = {

    THEMEN: ["geraet", "hell", "dunkel"],

    /* Die Farbwelt der App (seit 0.7.0). Freischaltbare Welten kommen
       später; bis dahin genau diese. */
    FARBWELT: "werkstatt",

    /* Verbotene Farbtöne (Grad auf dem Farbkreis) je Kachel-Rolle. Grau und
       fast graue Farben haben keinen Farbton und fallen nie hinein. */
    KACHEL_SPERRE: {
        richtig: { name: "grün", von: 75, bis: 165 },
        vorhanden: { name: "gelb", von: 38, bis: 70 }
    },

    thema() {
        const wert = ICH.einstellung("thema", "geraet");
        return DARSTELLUNG.THEMEN.indexOf(wert) !== -1 ? wert : "geraet";
    },

    themaSetzen(wert) {
        ICH.einstellungSetzen("thema", DARSTELLUNG.THEMEN.indexOf(wert) !== -1 ? wert : "geraet");
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
        /* Bis 0.6.1 gab es data-farben="kontrast" (Orange/Blau als Wahl);
           seit 0.6.2 ist Orange/Blau der Standard. Ein altes Attribut darf
           nicht stehen bleiben. */
        delete ziel.dataset.farben;

        /* Die Farbwelt (seit 0.7.0) — nur mit echtem <html> (die Tests
           geben ein Ersatzobjekt ohne `style`) und wenn der Baustein da ist. */
        if (ziel.style && typeof UPCREW_FARBWELTEN !== "undefined") {
            UPCREW_FARBWELTEN.anwenden(DARSTELLUNG.FARBWELT, DARSTELLUNG.modus(), ziel);
        }
    },

    /* "hell" oder "dunkel" — wie die App gerade aussieht: die Wahl in den
       Einstellungen, sonst das Gerät. Auch das Intro fragt hier. */
    modus() {
        const thema = DARSTELLUNG.thema();
        if (thema === "hell" || thema === "dunkel") {
            return thema;
        }
        const geraetHell = typeof window !== "undefined" && !!(window.matchMedia
            && window.matchMedia("(prefers-color-scheme: light)").matches);
        return geraetHell ? "hell" : "dunkel";
    },

    /* Farbton in Grad (0-360) und Sättigung (0-1) einer Farbe "#rrggbb". */
    _farbton(farbe) {
        const treffer = /^#([0-9a-f]{6})$/i.exec(String(farbe).trim());
        if (!treffer) {
            return null;
        }
        const zahl = parseInt(treffer[1], 16);
        const r = ((zahl >> 16) & 255) / 255;
        const g = ((zahl >> 8) & 255) / 255;
        const b = (zahl & 255) / 255;
        const hoch = Math.max(r, g, b);
        const tief = Math.min(r, g, b);
        const spanne = hoch - tief;
        const saettigung = hoch === 0 ? 0 : spanne / hoch;
        let grad = 0;
        if (spanne > 0) {
            if (hoch === r) {
                grad = 60 * (((g - b) / spanne) % 6);
            } else if (hoch === g) {
                grad = 60 * ((b - r) / spanne + 2);
            } else {
                grad = 60 * ((r - g) / spanne + 4);
            }
        }
        return { grad: (grad + 360) % 360, saettigung: saettigung };
    },

    /* Darf diese Farbe für diese Kachel-Rolle ("richtig", "vorhanden")
       benutzt werden? Liefert { erlaubt, grund }. Unlesbare Farben sind
       nicht erlaubt — lieber auffallen als durchrutschen. */
    kachelFarbeErlaubt(rolle, farbe) {
        const sperre = DARSTELLUNG.KACHEL_SPERRE[rolle];
        if (!sperre) {
            return { erlaubt: true, grund: "" };
        }
        const ton = DARSTELLUNG._farbton(farbe);
        if (!ton) {
            return { erlaubt: false, grund: "keine Farbe im Format #rrggbb: " + farbe };
        }
        if (ton.saettigung >= 0.15 && ton.grad >= sperre.von && ton.grad <= sperre.bis) {
            return { erlaubt: false, grund: rolle + " darf nicht " + sperre.name + " sein: " + farbe };
        }
        return { erlaubt: true, grund: "" };
    }
};

DARSTELLUNG.anwenden();

/* Wechselt das Gerät zwischen hell und dunkel (Auto), zieht die Farbwelt
   mit (seit 0.7.0). Bei fester Wahl ändert sich dabei nichts. */
if (typeof window !== "undefined" && window.matchMedia) {
    const geraetDunkel = window.matchMedia("(prefers-color-scheme: dark)");
    if (geraetDunkel.addEventListener) {
        geraetDunkel.addEventListener("change", () => DARSTELLUNG.anwenden());
    }
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = DARSTELLUNG;
}
