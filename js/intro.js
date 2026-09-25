/*
 * intro.js — das UPCrew-Studio-Intro beim Start: der Anpasser für Typoluck.
 *
 * UPCrew ist das Studio hinter allen Spielen (Nutzer-Entscheidung
 * 24.09.2026). Beim Öffnen erscheint kurz das Studio-Zeichen, dann das
 * Spiel.
 *
 * SEIT 0.6.1 STECKT DAS INTRO SELBST IN js\upcrew-intro.js (+ css\upcrew-
 * intro.css) — dem gemeinsamen Baustein aller UPCrew-Apps. Quelle ist
 * dev\Design\3D-Schrift\final\; dort wird er geändert und in die Apps
 * KOPIERT, hier nie abgewandelt (Schnittstelle und Regeln:
 * Design\3D-Schrift\docs\EINBAU-INTRO.md). Diese Datei sagt ihm nur, was
 * nur Typoluck weiss: hell oder dunkel, Nummer, Name und Version der App.
 *
 * Die Regeln (Nutzer-Entscheidung 25.09.2026):
 *   - bei JEDEM Start (die Sperre „einmal je Besuch" ist weg);
 *   - jeder Start zeigt die nächste von sechs Arten (Zähler im Baustein,
 *     gemeinsam mit den anderen UPCrew-Apps);
 *   - ein Tipp oder eine Taste überspringt es sofort;
 *   - die App lädt darunter weiter — das Intro hält nichts auf.
 *
 * In der Werkstatt (?werkstatt) kommt es nur mit dem Schalter &intro, sonst
 * stünde es auf jedem Bildschirmfoto. &intro=C zeigt gezielt eine Art (A-F)
 * und zählt nicht weiter; &hell / &dunkel wirken auch hier.
 */

const INTRO = {

    /* Nummer und Name im Studio (Blunderluck 01, Typoluck 02, Trainer 03). */
    APP_NR: "02",
    APP_NAME: "Typoluck",

    /* Soll es jetzt kommen? */
    faellig() {
        if (typeof WERKSTATT !== "undefined" && WERKSTATT.aktiv()) {
            return WERKSTATT.wert("intro") !== null;
        }
        return true;
    },

    /* Hell oder dunkel — wie die App gerade aussieht: die Einstellung
       (html[data-darstellung]), sonst das Gerät. In der Werkstatt gelten
       &hell / &dunkel schon hier, weil WERKSTATT.vorbereiten() erst nach dem
       Intro läuft (js\app.js). */
    modus() {
        if (typeof WERKSTATT !== "undefined" && WERKSTATT.aktiv()) {
            if (WERKSTATT.wert("hell") !== null) {
                return "hell";
            }
            if (WERKSTATT.wert("dunkel") !== null) {
                return "dunkel";
            }
        }
        /* Seit 0.7.0 dieselbe Regel wie die Farbwelt (eine Stelle). */
        return DARSTELLUNG.modus();
    },

    /* Zeigt das Intro im Behälter und liefert ein Versprechen, das nach dem
       Ausblenden erfüllt ist (mit { art, welt, modus } oder null). */
    zeigen(behaelter) {
        if (!behaelter || !INTRO.faellig() || typeof UPCREW_INTRO === "undefined") {
            return Promise.resolve(null);
        }
        const optionen = {
            modus: INTRO.modus(),
            app: { nr: INTRO.APP_NR, name: INTRO.APP_NAME, version: KONFIG.APP_VERSION }
        };
        if (typeof WERKSTATT !== "undefined" && WERKSTATT.aktiv()) {
            const art = (WERKSTATT.wert("intro") || "").toUpperCase();
            if (UPCREW_INTRO.ARTEN.indexOf(art) !== -1) {
                optionen.art = art;
            }
        }
        return UPCREW_INTRO.zeigen(behaelter, optionen);
    }
};
