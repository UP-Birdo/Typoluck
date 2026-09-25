/*
 * fuehlen.js — das Anfass-Gefühl: Vibration beim Antippen, bei Erfolg und
 * bei Fehlern (UPCrew-Standard, Abschnitt 5, seit 0.4.0).
 *
 * Nutzer 25.09.2026: Vibration „beim Tasten drücken und allem", Töne nein.
 * EIN Baustein, damit jede Stelle dasselbe Muster benutzt:
 *
 *     FUEHLEN.tippen()   ganz kurz — jeder Knopf, jede Taste, jedes Feld
 *     FUEHLEN.erfolg()   Tageswort gelöst
 *     FUEHLEN.fehler()   unbekanntes Wort, zu kurz, verloren
 *
 * Ab Werk AN; abschaltbar in den Einstellungen (seit 0.5.0; vorher im
 * Profil) — Gerät-Einstellung „vibration" in js\ich.js. Wo es keine
 * Vibration gibt, tut der Baustein still nichts.
 *
 * DAS IPHONE VIBRIERT FÜR WEB-APPS NICHT: `navigator.vibrate` fehlt in
 * Safari. Auf Android geht es. Der bekannte Umweg über einen Schalter-Knopf
 * (`<input type="checkbox" switch>`, Safari ab 17.4) ist bewusst NOCH NICHT
 * gebaut — der Standard verlangt, ihn erst auf dem iPhone des Nutzers zu
 * messen (offen, siehe STATUS.md). `verfuegbar()` sagt den Einstellungen, ob der
 * Schalter hier überhaupt etwas bewirkt.
 */

const FUEHLEN = {

    /* Die Muster in Millisekunden: vibrieren, Pause, vibrieren … */
    MUSTER: {
        tippen: 8,
        erfolg: [20, 60, 20, 60, 60],
        fehler: [70, 50, 70]
    },

    /* Die Vibrations-Schnittstelle des Geräts. Die Tests setzen einen Ersatz. */
    _navigator() {
        return (typeof navigator !== "undefined") ? navigator : null;
    },

    verfuegbar() {
        const nav = FUEHLEN._navigator();
        return !!nav && typeof nav.vibrate === "function";
    },

    an() {
        return ICH.einstellung("vibration", true) !== false;
    },

    anSetzen(wert) {
        ICH.einstellungSetzen("vibration", wert === true);
    },

    tippen() {
        FUEHLEN._vibrieren(FUEHLEN.MUSTER.tippen);
    },

    erfolg() {
        FUEHLEN._vibrieren(FUEHLEN.MUSTER.erfolg);
    },

    fehler() {
        FUEHLEN._vibrieren(FUEHLEN.MUSTER.fehler);
    },

    /* Liefert, ob vibriert wurde — für die Tests. Wirft nie: Manche Browser
       werfen, wenn die Seite noch nicht angetippt wurde. */
    _vibrieren(muster) {
        if (!FUEHLEN.an() || !FUEHLEN.verfuegbar()) {
            return false;
        }
        try {
            return FUEHLEN._navigator().vibrate(muster) !== false;
        } catch (fehler) {
            return false;
        }
    }
};

if (typeof module !== "undefined" && module.exports) {
    module.exports = FUEHLEN;
}
