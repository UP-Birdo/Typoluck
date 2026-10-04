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
 *         { darstellung, farbwelt, schrift, knoepfe, stand }   (`leseschrift` seit 0.26.0 weg)
 *     Geschrieben wird dorthin, wenn `AUSSEHEN_JE_AM_KONTO` true ist — seit
 *     0.18.4 (Regel §11c, Datenbank-Regel, vom Nutzer am
 *     28.09.2026 eingespielt); bis 0.18.3 blieb das Aussehen auf dem Gerät.
 *     Gelesen wird der eigene Zweig; fehlt er, dient
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
 * GRAU UND DIE EINMALIGE UMSTELLUNG (seit 0.27.0, Design-Einbau 
 * EINBAU-2026-09-29c.md): Der Baustein stellt jedes Aussehen ohne Merker
 * `umstellung` einmal auf die Farbwelt „grau" um — auf dem Gerät und bei
 * allem, was vom Konto kommt. Trägt das Konto-Objekt den Merker noch nicht
 * (`UPCREW_AUSSEHEN.kontoBraucht`), schreibt `holen()` einmal
 * `fuerKonto()` ans Konto — auch wenn `uebernehmen` nichts geändert hat.
 * Dafür braucht die Datenbank die Regel-Ergänzung (`farbwelt` mit „grau",
 * neues Feld `umstellung`; vorbereitet in den UPCrew-Regeltexten 
 * „2026-09-29 NEUE Regel mit 13.txt"). Solange `SpeicherKonten.REGEL_GRAU_EINGESPIELT` false ist,
 * gilt der Fall „Regel fehlt" der Einbau-Notiz: beides wird NICHT
 * geschrieben (kein `umstellung`, „grau" fällt weg — ein fehlendes
 * `farbwelt` am Konto ergibt ohnehin Grau), und das einmalige Nachziehen
 * des Merkers entfällt. Das Gerät bleibt richtig.
 *
 * STILL BEI FEHLER: Lehnt die Datenbank ab, bleibt das Aussehen auf dem
 * Gerät, ohne Meldung. Das Spiel läuft immer weiter.
 */

const AUSSEHEN_ABGLEICH = {

    /* Schreibt Typoluck sein Aussehen je Spiel ans Konto? Seit 0.18.4 an:
       Der Nutzer hat Regel §11c am 28.09.2026 eingespielt („ja ist drin"). */
    AUSSEHEN_JE_AM_KONTO: true,

    /* Gilt die Regel mit Grau? Der EINE Schalter steht in der Klasse
       SpeicherKonten (Baustein js\speicher-konten.js aus
       den UPCrew-Bausteinen, `REGEL_GRAU_EINGESPIELT`); dieses Feld
       überstimmt ihn nur in Tests (true/false), sonst null. */
    REGEL_GRAU: null,

    _regelGrau() {
        if (typeof AUSSEHEN_ABGLEICH.REGEL_GRAU === "boolean") {
            return AUSSEHEN_ABGLEICH.REGEL_GRAU;
        }
        return typeof SpeicherKonten !== "undefined" && SpeicherKonten.REGEL_GRAU_EINGESPIELT === true;
    },

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
            AUSSEHEN_ABGLEICH.fuerKonto();
        try {
            await AUSSEHEN_ABGLEICH._speicher.teilSchreiben(aenderungen);
            return true;
        } catch (fehler) {
            return false;
        }
    },

    /* Was ans Konto geht: `fuerKonto()` des Bausteins — ohne Regel mit Grau
       ohne `umstellung` und ohne die Farbwelt „grau". */
    fuerKonto() {
        const wert = Object.assign({}, UPCREW_AUSSEHEN.fuerKonto());
        if (!AUSSEHEN_ABGLEICH._regelGrau()) {
            delete wert.umstellung;
            if (wert.farbwelt === "grau") {
                delete wert.farbwelt;
            }
        }
        return wert;
    },

    /* Konto-Objekt übernehmen; trägt es den Merker der Umstellung noch
       nicht, einmal das eigene Aussehen ans Konto (nur mit Regel). */
    async _uebernehmen(vomKonto) {
        const geaendert = vomKonto ? UPCREW_AUSSEHEN.uebernehmen(vomKonto) : false;
        if (AUSSEHEN_ABGLEICH._regelGrau() && typeof UPCREW_AUSSEHEN.kontoBraucht === "function"
                && UPCREW_AUSSEHEN.kontoBraucht(vomKonto)) {
            await AUSSEHEN_ABGLEICH.senden();
        }
        return geaendert;
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
            return gemeinsam === undefined ? false : AUSSEHEN_ABGLEICH._uebernehmen(gemeinsam);
        }
        const eigenes = await AUSSEHEN_ABGLEICH._laden(AUSSEHEN_ABGLEICH.pfadJe(uid));
        if (eigenes === undefined) {
            return false;
        }
        if (eigenes) {
            return AUSSEHEN_ABGLEICH._uebernehmen(eigenes);
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
        return AUSSEHEN_ABGLEICH._uebernehmen(alt);
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
