/*
 * aussehen-abgleich.js — das gemeinsame Aussehen am UPCrew-Konto (seit
 * 0.8.0, UPCrew-Runde 3).
 *
 * WOZU: js\upcrew-aussehen.js hält hell/dunkel, Farbwelt, Schrift und
 * Knöpfe im Browser-Speicher; Blunderluck und Typoluck im SELBEN Browser
 * ziehen darüber sofort mit. Andere Geräte und die iPhone-Apps vom
 * Home-Bildschirm haben aber je eigenen Speicher — für sie reist das
 * Aussehen am Konto mit:
 *
 *     spieler/konten/<uid>/aussehen
 *         { darstellung, farbwelt, schrift, knoepfe, leseschrift, stand }
 *
 *   senden()  nach jeder EIGENEN Änderung (js\app.js, Beobachter)
 *   holen()   beim Start nach der Anmeldung und bei jeder Rückkehr in den
 *             Vordergrund; der Baustein übernimmt nur, wenn `stand` am
 *             Konto neuer ist als auf dem Gerät
 *
 * WER: nur angemeldete Spieler — Gäste nicht (sie haben kein dauerhaftes
 * Konto), die Werkstatt nicht (spielt lokal). Das entscheidet der
 * `uidGeber` aus js\app.js: liefert er null, passiert nichts.
 *
 * STILL BEI FEHLER: Die Regel der Datenbank für diesen Pfad schlägt der
 * Blunderluck-Auftrag vor (Apps\Blunderluck\SICHERHEIT.md §11), einspielen
 * tut der Nutzer. Bis dahin lehnt die Datenbank ab — dann bleibt das
 * Aussehen eben auf dem Gerät, ohne Meldung. Das Spiel läuft immer weiter.
 *
 * Geschrieben wird der Pfad zusammen mit `geaendertAm` in EINEM Schritt
 * (Mehrpfad-Änderung) — Regel 3 der Konten (Kopf von js\spieler.js): jede
 * Änderung zieht die Marke hoch, damit die anderen Spiele es merken. Das
 * Feld selbst gehört allen UPCrew-Spielen, keinem einzelnen (Regel 2).
 */

const AUSSEHEN_ABGLEICH = {

    FELD: "aussehen",

    /* Die Konten-Rückwand (APP.spielerSpeicher) und wer gerade abgleicht. */
    _speicher: null,
    _uidGeber: null,

    einrichten(speicher, uidGeber) {
        AUSSEHEN_ABGLEICH._speicher = speicher || null;
        AUSSEHEN_ABGLEICH._uidGeber = (typeof uidGeber === "function") ? uidGeber : null;
    },

    pfad(uid) {
        return "konten/" + uid + "/" + AUSSEHEN_ABGLEICH.FELD;
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
        const aenderungen = { geaendertAm: Date.now() };
        aenderungen[AUSSEHEN_ABGLEICH.pfad(uid)] = UPCREW_AUSSEHEN.fuerKonto();
        try {
            await AUSSEHEN_ABGLEICH._speicher.teilSchreiben(aenderungen);
            return true;
        } catch (fehler) {
            return false;
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
        let vomKonto = null;
        try {
            vomKonto = await AUSSEHEN_ABGLEICH._speicher.teilLaden(AUSSEHEN_ABGLEICH.pfad(uid));
        } catch (fehler) {
            return false;
        }
        if (!vomKonto || typeof vomKonto !== "object") {
            return false;
        }
        return UPCREW_AUSSEHEN.uebernehmen(vomKonto);
    }
};

if (typeof module !== "undefined" && module.exports) {
    module.exports = AUSSEHEN_ABGLEICH;
}
