/*
 * darstellung.js — wie die App aussieht: Typolucks Anschluss an das
 * gemeinsame UPCrew-Aussehen, und die Sperre für Kachelfarben (seit 0.6.2).
 *
 *     DARSTELLUNG.thema()                "geraet" | "hell" | "dunkel"
 *     DARSTELLUNG.themaSetzen(wert)
 *     DARSTELLUNG.leseschrift()          true = immer die Standard-Schrift
 *     DARSTELLUNG.leseschriftSetzen(an)
 *     DARSTELLUNG.anwenden(wurzel)       schreibt alles an <html>
 *     DARSTELLUNG.modus()                "hell" | "dunkel" (wie es gerade aussieht)
 *     DARSTELLUNG.kachelFarbeErlaubt(rolle, farbe)
 *
 * EIN AUSSEHEN FÜR ALLE UPCREW-SPIELE (seit 0.8.0, UPCrew-Runde 3; Nutzer
 * 26.09.2026: „wenn man die eine App auf hell umstellt oder die
 * Farbpalette / Schriftart nutzt, sollen sich alle anderen Apps auch so
 * umstellen"). Hell/dunkel, Farbwelt, Schrift und Knöpfe stehen NUR noch im
 * gemeinsamen Baustein js\upcrew-aussehen.js (Schlüssel `upcrew.aussehen`,
 * kopiert aus Design\3D-Schrift\final, nie abwandeln). Diese Datei liest und
 * schreibt nur über ihn — sie hält selbst keinen Wert mehr. Was ab Werk gilt
 * (Standard-Schrift, Standard-Knöpfe), steht allein im Baustein; hier wird
 * nichts davon festgeschrieben.
 *
 * DER UMZUG DER ALTEN WAHL: Bis 0.7.0 lag hell/dunkel in den Einstellungen
 * dieses Geräts (ICH.einstellung "thema"). Beim ersten Laden mit 0.8.0
 * wird sie EINMAL per `UPCREW_AUSSEHEN.migrieren` übergeben — nur, wenn es
 * noch kein gemeinsames Aussehen gibt (hat Blunderluck im selben Browser
 * schon eins angelegt, gilt dessen). Danach wird "thema" nie mehr gelesen.
 *
 * DER FRÜHE AUFRUF: Diese Datei steht in index.html direkt nach
 * upcrew-aussehen.js und wendet beim Laden sofort an (ganz unten) — so
 * blitzt nichts in alten Farben oder der falschen Schrift auf.
 *
 * DIE KACHELFARBEN-SPERRE (Nutzer-Entscheidung 25.09.2026): Die New York
 * Times geht gegen Nachbauten vor, die den Look ihres Spiels übernehmen —
 * ausdrücklich genannt: grüne, gelbe und graue Kacheln. Deshalb gilt, für
 * die Farben ab Werk UND für jede Farbwelt, die man freischalten kann:
 * „richtig" ist NIE grün, „vorhanden" ist NIE gelb. Jede Kachelfarbe läuft
 * durch `kachelFarbeErlaubt`; tests\test-darstellung.js prüft damit jede
 * Kachelfarbe im Stil und jede Farbwelt des Bausteins, hell und dunkel.
 * Seit 0.6.2 gibt es deshalb auch keine Wahl „Grün/Gelb" mehr.
 */

const DARSTELLUNG = {

    THEMEN: ["geraet", "hell", "dunkel"],

    /* Verbotene Farbtöne (Grad auf dem Farbkreis) je Kachel-Rolle. Grau und
       fast graue Farben haben keinen Farbton und fallen nie hinein. */
    KACHEL_SPERRE: {
        richtig: { name: "grün", von: 75, bis: 165 },
        vorhanden: { name: "gelb", von: 38, bis: 70 }
    },

    /* Der gemeinsame Baustein. Im Browser ein globaler Name; die Tests
       setzen ihn ebenso. */
    _aussehen() {
        return (typeof UPCREW_AUSSEHEN !== "undefined") ? UPCREW_AUSSEHEN : null;
    },

    thema() {
        const aussehen = DARSTELLUNG._aussehen();
        const wert = aussehen ? aussehen.lesen().darstellung : "geraet";
        return DARSTELLUNG.THEMEN.indexOf(wert) !== -1 ? wert : "geraet";
    },

    /* Schreibt über den Baustein; der wendet selbst an und meldet es allen
       Beobachtern (js\app.js zeichnet neu und schickt es ans Konto). */
    themaSetzen(wert) {
        const aussehen = DARSTELLUNG._aussehen();
        if (aussehen) {
            aussehen.setzen({ darstellung: DARSTELLUNG.THEMEN.indexOf(wert) !== -1 ? wert : "geraet" });
        }
    },

    /* „Standard-Schrift" in den Einstellungen (seit 0.8.0): wer mit der
       gewählten Crew-Schrift schlecht liest, stellt hier die Standard-Schrift
       fest — die Wahl im Tab „Anpassen" bleibt dabei gespeichert. */
    leseschrift() {
        const aussehen = DARSTELLUNG._aussehen();
        return aussehen ? aussehen.lesen().leseschrift === true : false;
    },

    leseschriftSetzen(an) {
        const aussehen = DARSTELLUNG._aussehen();
        if (aussehen) {
            aussehen.setzen({ leseschrift: an === true });
        }
    },

    /* Einmalig: die bis 0.7.0 gespeicherte Wahl an den Baustein übergeben.
       Liefert true, wenn übergeben wurde. */
    migrieren() {
        const aussehen = DARSTELLUNG._aussehen();
        if (!aussehen) {
            return false;
        }
        const alt = ICH.einstellung("thema", "geraet");
        return aussehen.migrieren({
            darstellung: DARSTELLUNG.THEMEN.indexOf(alt) !== -1 ? alt : "geraet"
        });
    },

    /* `wurzel` ist <html>; die Tests geben ein Ersatzobjekt mit `dataset`.
       Der Baustein setzt data-darstellung (fehlt = Gerät), data-farbwelt,
       data-schrift, data-knoepfe, die Farben der Welt und --schrift-familie. */
    anwenden(wurzel) {
        const ziel = wurzel || (typeof document !== "undefined" ? document.documentElement : null);
        if (!ziel || !ziel.dataset) {
            return;
        }
        const aussehen = DARSTELLUNG._aussehen();
        if (aussehen) {
            aussehen.anwenden(ziel);
        }
        /* Bis 0.6.1 gab es data-farben="kontrast" (Orange/Blau als Wahl);
           seit 0.6.2 ist Orange/Blau der Standard. Ein altes Attribut darf
           nicht stehen bleiben. */
        delete ziel.dataset.farben;
    },

    /* "hell" oder "dunkel" — wie die App gerade aussieht: die Wahl, sonst
       das Gerät. Auch das Intro fragt hier. */
    modus() {
        const aussehen = DARSTELLUNG._aussehen();
        return aussehen ? aussehen.modus() : "dunkel";
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

/* Der frühe Aufruf: erst die alte Wahl übergeben, dann anwenden. Wechselt
   das Gerät zwischen hell und dunkel, zieht der Baustein selbst nach (bis
   0.7.0 stand dafür hier ein eigener Horcher). */
DARSTELLUNG.migrieren();
DARSTELLUNG.anwenden();

if (typeof module !== "undefined" && module.exports) {
    module.exports = DARSTELLUNG;
}
