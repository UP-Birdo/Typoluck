/*
 * aussehen-abgleich.js — das Aussehen am UPCrew-Konto (seit 0.8.0,
 * UPCrew-Runde 3; seit 0.15.13 je Spiel).
 *
 * WOZU: js\upcrew-aussehen.js hält hell/dunkel, Farbwelt, Schrift und
 * Knöpfe im Browser-Speicher. Andere Geräte und die iPhone-Apps vom
 * Home-Bildschirm haben je eigenen Speicher — für sie reist das Aussehen
 * am Konto mit.
 *
 * SEIT 0.15.13 JE SPIEL (Nutzer 27.09.2026: „mach es doch so, dass es
 * nicht sync ist, also die Designs — wenn man auf Übernehmen drückt, soll
 * sich nur das Spiel ändern. Aber mach einen Schalter rein für die Zukunft,
 * falls ich beide wieder sync haben will"; wie Blunderluck v0.151.17,
 * js\aussehen-konto.js dort). Den Schalter hat der Baustein:
 * `UPCREW_AUSSEHEN.GETEILT`.
 *
 *   GETEILT = false (Standard):
 *     spieler/konten/<uid>/aussehenJe/typoluck
 *         { darstellung, farbwelt, schrift, knoepfe, leseschrift, stand }
 *     Geschrieben wird dorthin erst, wenn `AUSSEHEN_JE_AM_KONTO` true ist —
 *     der bleibt false, bis der Nutzer die Regel §11c
 *     (Apps\Blunderluck\SICHERHEIT.md) eingespielt hat; bis dahin bleibt das
 *     Aussehen auf dem Gerät. Gelesen wird der eigene Zweig; fehlt er, dient
 *     das alte gemeinsame Feld `aussehen` EINMAL als Umzug (Merker
 *     `typoluck.aussehen-umzug`), danach nie wieder — sonst zöge eine
 *     Änderung aus einem älteren Spiel über das Konto doch wieder mit.
 *     Das alte Feld `aussehen` wird nicht mehr geschrieben.
 *   GETEILT = true: wie bis 0.15.12 über `konten/<uid>/aussehen`.
 *
 *   senden()  nach jeder EIGENEN Änderung (js\app.js, Beobachter)
 *   holen()   beim Start nach der Anmeldung und bei jeder Rückkehr in den
 *             Vordergrund; der Baustein übernimmt nur, wenn `stand` am
 *             Konto neuer ist als auf dem Gerät
 *
 * WER: nur angemeldete Spieler — Gäste nicht, die Werkstatt nicht. Das
 * entscheidet der `uidGeber` aus js\app.js: liefert er null, passiert
 * nichts.
 *
 * Geschrieben wird immer nur ein TEILPFAD, zusammen mit `geaendertAm` in
 * EINEM Schritt (Mehrpfad-Änderung) — Regel 3 der Konten (Kopf von
 * js\spieler.js). Beim Zusammenführen des ganzen eigenen Eintrags gewinnt
 * je Spiel der neuere `stand` (SPIELER._neueresAussehenJe).
 *
 * STILL BEI FEHLER: Lehnt die Datenbank ab, bleibt das Aussehen auf dem
 * Gerät, ohne Meldung. Das Spiel läuft immer weiter.
 */

const AUSSEHEN_ABGLEICH = {

    /* Schreibt Typoluck sein Aussehen je Spiel ans Konto? Erst anschalten,
       wenn der Nutzer Regel §11c eingespielt hat. */
    AUSSEHEN_JE_AM_KONTO: false,

    APP: "typoluck",
    FELD: "aussehen",
    FELD_JE: "aussehenJe",
    UMZUG_SCHLUESSEL: "typoluck.aussehen-umzug",

    /* Die Konten-Rückwand (APP.spielerSpeicher) und wer gerade abgleicht. */
    _speicher: null,
    _uidGeber: null,

    einrichten(speicher, uidGeber) {
        AUSSEHEN_ABGLEICH._speicher = speicher || null;
        AUSSEHEN_ABGLEICH._uidGeber = (typeof uidGeber === "function") ? uidGeber : null;
    },

    _geteilt() {
        return typeof UPCREW_AUSSEHEN !== "undefined" && UPCREW_AUSSEHEN.GETEILT !== false;
    },

    /* Der alte gemeinsame Pfad. */
    pfad(uid) {
        return "konten/" + uid + "/" + AUSSEHEN_ABGLEICH.FELD;
    },

    /* Der Pfad dieses Spiels (seit 0.15.13). */
    pfadJe(uid) {
        return "konten/" + uid + "/" + AUSSEHEN_ABGLEICH.FELD_JE + "/" + AUSSEHEN_ABGLEICH.APP;
    },

    /* Die Konto-Nummer, wenn abgeglichen werden darf — sonst null. */
    _uid() {
        if (!AUSSEHEN_ABGLEICH._speicher || !AUSSEHEN_ABGLEICH._uidGeber
            || typeof UPCREW_AUSSEHEN === "undefined") {
            return null;
        }
        let uid = null;
        try {
            uid = AUSSEHEN_ABGLEICH._uidGeber();
        } catch (fehler) {
            uid = null;
        }
        return (typeof uid === "string" && uid !== "") ? uid : null;
    },

    /* Das Aussehen dieses Geräts ans Konto. Liefert true bei Erfolg. */
    async senden() {
        const uid = AUSSEHEN_ABGLEICH._uid();
        if (!uid || typeof AUSSEHEN_ABGLEICH._speicher.teilSchreiben !== "function") {
            return false;
        }
        const geteilt = AUSSEHEN_ABGLEICH._geteilt();
        if (!geteilt && !AUSSEHEN_ABGLEICH.AUSSEHEN_JE_AM_KONTO) {
            return false;
        }
        const aenderungen = { geaendertAm: Date.now() };
        aenderungen[geteilt ? AUSSEHEN_ABGLEICH.pfad(uid) : AUSSEHEN_ABGLEICH.pfadJe(uid)] =
            UPCREW_AUSSEHEN.fuerKonto();
        try {
            await AUSSEHEN_ABGLEICH._speicher.teilSchreiben(aenderungen);
            return true;
        } catch (fehler) {
            return false;
        }
    },

    /* Einen Pfad laden: Objekt, null (leer) oder undefined (Fehler). */
    async _laden(pfad) {
        try {
            const wert = await AUSSEHEN_ABGLEICH._speicher.teilLaden(pfad);
            return (wert && typeof wert === "object") ? wert : null;
        } catch (fehler) {
            return undefined;
        }
    },

    /* Das Aussehen vom Konto holen. Liefert true, wenn es neuer war und
       übernommen wurde (dann hat der Baustein schon angewendet und seine
       Beobachter gerufen). */
    async holen() {
        const uid = AUSSEHEN_ABGLEICH._uid();
        if (!uid || typeof AUSSEHEN_ABGLEICH._speicher.teilLaden !== "function") {
            return false;
        }
        if (AUSSEHEN_ABGLEICH._geteilt()) {
            const gemeinsam = await AUSSEHEN_ABGLEICH._laden(AUSSEHEN_ABGLEICH.pfad(uid));
            return gemeinsam ? UPCREW_AUSSEHEN.uebernehmen(gemeinsam) : false;
        }
        const eigenes = await AUSSEHEN_ABGLEICH._laden(AUSSEHEN_ABGLEICH.pfadJe(uid));
        if (eigenes === undefined) {
            return false;
        }
        if (eigenes) {
            return UPCREW_AUSSEHEN.uebernehmen(eigenes);
        }
        /* Kein eigener Zweig: das alte gemeinsame Feld EINMAL als Umzug. */
        if (AUSSEHEN_ABGLEICH._umzugGemacht()) {
            return false;
        }
        const alt = await AUSSEHEN_ABGLEICH._laden(AUSSEHEN_ABGLEICH.pfad(uid));
        if (alt === undefined) {
            return false;
        }
        AUSSEHEN_ABGLEICH._umzugMerken();
        return alt ? UPCREW_AUSSEHEN.uebernehmen(alt) : false;
    },

    _umzugGemacht() {
        try {
            return window.localStorage.getItem(AUSSEHEN_ABGLEICH.UMZUG_SCHLUESSEL) === "1";
        } catch (fehler) {
            return false;
        }
    },

    _umzugMerken() {
        try {
            window.localStorage.setItem(AUSSEHEN_ABGLEICH.UMZUG_SCHLUESSEL, "1");
        } catch (fehler) {
            /* Gesperrter Speicher: dann eben beim nächsten Start noch einmal. */
        }
    }
};

if (typeof module !== "undefined" && module.exports) {
    module.exports = AUSSEHEN_ABGLEICH;
}
