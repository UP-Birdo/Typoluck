/*
 * fortschritt-abgleich.js — der Fortschritt am UPCrew-Konto (seit 0.15.1).
 *
 * WOZU: js\fortschritt.js hält Level, XP, Serie und Heute im Browser-
 * Speicher (`upcrew.fortschritt`); Blunderluck im SELBEN Browser sieht es
 * sofort. Andere Geräte und die iPhone-Apps vom Home-Bildschirm haben je
 * eigenen Speicher — für sie reist der Fortschritt am Konto mit:
 *
 *     spieler/konten/<uid>/fortschritt
 *         { version: 1, spiele: { typoluck: {…}, blunderluck: {…} } }
 *
 * Die Regel dafür steht in Apps\Blunderluck\SICHERHEIT.md §11b; der Nutzer
 * hat sie am 27.09.2026 eingespielt (zusammen mit §11 und §11a). Sie nimmt
 * NUR die Felder des Vertrags an, jede Zahl begrenzt — `FORTSCHRITT.fuerKonto`
 * liefert genau diese (tests\test-fortschritt-abgleich.js prüft jede Grenze
 * der Regel nach).
 *
 *   senden(stand)  nach jeder gemeldeten Runde: `.../fortschritt/version`
 *                  und `.../fortschritt/spiele/typoluck` als TEILPFADE — der
 *                  Blunderluck-Zweig am Konto bleibt unberührt, auch wenn
 *                  Typoluck ihn gar nicht kennt. Mit `geaendertAm` in EINEM
 *                  Schritt (Regel 3 der Konten, Kopf von js\spieler.js).
 *   holen()        beim Start nach der Anmeldung und bei jeder Rückkehr in
 *                  den Vordergrund: den Konto-Stand merken (`mitKonto` führt
 *                  ihn beim Lesen dazu, je Zweig gewinnt der neuere `stand`).
 *                  Ist Typolucks Zweig am Konto neuer, kommt er aufs Gerät;
 *                  ist er auf dem Gerät neuer (oder fehlt am Konto), geht er
 *                  hinauf. Fremde Zweige werden nur GELESEN, nie aufs Gerät
 *                  und nie ans Konto geschrieben.
 *
 * WER: nur angemeldete Spieler mit echtem Konto — Gäste nicht (ihr Stand
 * bleibt auf dem Gerät unter „gast"), die Werkstatt nicht (spielt lokal).
 * Das entscheidet der `uidGeber` aus js\app.js: liefert er null, passiert
 * nichts. Fehler (Netz, Regel) bleiben still — das Spiel läuft immer weiter.
 */

const FORTSCHRITT_ABGLEICH = {

    FELD: "fortschritt",

    _speicher: null,
    _uidGeber: null,
    _idGeber: null,

    /* Der zuletzt geholte Konto-Stand und für welche uid. */
    _konto: null,
    _kontoUid: null,

    /* `uidGeber` → Firebase-uid (oder null); `idGeber` → der Eintrag im
       Gerätespeicher (js\app.js `fortschrittId`). */
    einrichten(speicher, uidGeber, idGeber) {
        FORTSCHRITT_ABGLEICH._speicher = speicher || null;
        FORTSCHRITT_ABGLEICH._uidGeber = (typeof uidGeber === "function") ? uidGeber : null;
        FORTSCHRITT_ABGLEICH._idGeber = (typeof idGeber === "function") ? idGeber : null;
        FORTSCHRITT_ABGLEICH._konto = null;
        FORTSCHRITT_ABGLEICH._kontoUid = null;
    },

    pfad(uid) {
        return "konten/" + uid + "/" + FORTSCHRITT_ABGLEICH.FELD;
    },

    _uid() {
        if (!FORTSCHRITT_ABGLEICH._speicher || !FORTSCHRITT_ABGLEICH._uidGeber) {
            return null;
        }
        let uid = null;
        try {
            uid = FORTSCHRITT_ABGLEICH._uidGeber();
        } catch (fehler) {
            uid = null;
        }
        return (typeof uid === "string" && uid !== "") ? uid : null;
    },

    _id() {
        try {
            return FORTSCHRITT_ABGLEICH._idGeber ? FORTSCHRITT_ABGLEICH._idGeber() : null;
        } catch (fehler) {
            return null;
        }
    },

    /* Der Stand mit dem gemerkten Konto-Stand zusammengeführt (je Zweig der
       neuere) — ohne Konto unverändert. */
    mitKonto(stand) {
        const uid = FORTSCHRITT_ABGLEICH._uid();
        if (!uid || uid !== FORTSCHRITT_ABGLEICH._kontoUid || !FORTSCHRITT_ABGLEICH._konto) {
            return stand;
        }
        return FORTSCHRITT.zusammenfuehren(stand, FORTSCHRITT_ABGLEICH._konto);
    },

    /* Die Mehrpfad-Änderung fürs Konto — rein, damit der Test sie gegen die
       Regel prüfen kann. */
    aenderungen(uid, stand, jetzt) {
        const vertrag = FORTSCHRITT.fuerKonto(stand);
        const pfad = FORTSCHRITT_ABGLEICH.pfad(uid);
        const aenderungen = { geaendertAm: jetzt || Date.now() };
        aenderungen[pfad + "/version"] = vertrag.version;
        aenderungen[pfad + "/spiele/" + FORTSCHRITT.APP] = vertrag.spiele[FORTSCHRITT.APP];
        return aenderungen;
    },

    /* Der Stand des letzten Sendens für die Status-Lampe (seit 0.26.0):
       "" (nichts gesendet) | "wartet" | "gespeichert" | "fehler";
       `beiZustand` ruft die App nach jedem Wechsel. */
    zustand: "",
    beiZustand: null,

    _zustandSetzen(zustand) {
        FORTSCHRITT_ABGLEICH.zustand = zustand;
        if (typeof FORTSCHRITT_ABGLEICH.beiZustand === "function") {
            FORTSCHRITT_ABGLEICH.beiZustand(zustand);
        }
    },

    /* Typolucks Zweig ans Konto. Liefert true bei Erfolg. */
    async senden(stand) {
        const uid = FORTSCHRITT_ABGLEICH._uid();
        if (!uid || typeof FORTSCHRITT_ABGLEICH._speicher.teilSchreiben !== "function") {
            return false;
        }
        FORTSCHRITT_ABGLEICH._zustandSetzen("wartet");
        const ok = await FORTSCHRITT_ABGLEICH._senden(uid, stand);
        FORTSCHRITT_ABGLEICH._zustandSetzen(ok ? "gespeichert" : "fehler");
        return ok;
    },

    async _senden(uid, stand) {
        const aenderungen = FORTSCHRITT_ABGLEICH.aenderungen(uid, stand);
        /* Regel §12 (seit 0.22.0, Konzept Abschnitt 4 „Eigener
           Fortschritt"): der öffentliche Auszug zieht im selben Schritt mit
           (über alle Zweige, mit dem Konto-Stand). Lehnt die Datenbank das
           ab (etwa weil `oeffentlich/<ich>` noch fehlt), geht der Fortschritt
           allein hinauf — der Auszug folgt beim nächsten Selbst-Eintrag. */
        const mitAuszug = typeof KONTO !== "undefined" && typeof KONTO.istP12 === "function" && KONTO.istP12();
        const schritt = Object.assign({}, aenderungen);
        if (mitAuszug) {
            /* Seit 0.24.0 mit der Spielzeit, wenn der Haken am Konto an ist
               (jsspielzeit.js; wie `KONTO._spielzeitZeigen`). */
            const mitSpielzeit = typeof SPIELZEIT !== "undefined" && SPIELZEIT.oeffentlich();
            schritt["oeffentlich/" + uid + "/auszug"] = FORTSCHRITT.auszug(FORTSCHRITT_ABGLEICH.mitKonto(stand),
                undefined, { spielzeit: mitSpielzeit });
        }
        try {
            await FORTSCHRITT_ABGLEICH._speicher.teilSchreiben(schritt);
        } catch (fehler) {
            if (!mitAuszug) {
                return false;
            }
            try {
                await FORTSCHRITT_ABGLEICH._speicher.teilSchreiben(aenderungen);
            } catch (nochmal) {
                return false;
            }
        }
        /* Was hinaufging, gilt jetzt auch als Konto-Stand. */
        if (FORTSCHRITT_ABGLEICH._kontoUid === uid && FORTSCHRITT_ABGLEICH._konto) {
            FORTSCHRITT_ABGLEICH._konto.spiele[FORTSCHRITT.APP] = FORTSCHRITT.zweig(stand);
        }
        return true;
    },

    /* Den Konto-Stand holen und abgleichen. Liefert true, wenn sich auf dem
       Gerät etwas geändert hat (dann neu zeichnen). */
    async holen() {
        const uid = FORTSCHRITT_ABGLEICH._uid();
        const id = FORTSCHRITT_ABGLEICH._id();
        if (!uid || !id || typeof FORTSCHRITT_ABGLEICH._speicher.teilLaden !== "function") {
            return false;
        }
        let vomKonto = null;
        try {
            vomKonto = await FORTSCHRITT_ABGLEICH._speicher.teilLaden(FORTSCHRITT_ABGLEICH.pfad(uid));
        } catch (fehler) {
            return false;
        }
        const konto = FORTSCHRITT.normalisieren(vomKonto);
        FORTSCHRITT_ABGLEICH._konto = konto;
        FORTSCHRITT_ABGLEICH._kontoUid = uid;

        const geraet = FORTSCHRITT.laden(id);
        const hier = geraet.spiele[FORTSCHRITT.APP];
        const dort = konto.spiele[FORTSCHRITT.APP];
        const standVon = (zweig) => (zweig && typeof zweig.stand === "number") ? zweig.stand : 0;

        if (dort && standVon(dort) > standVon(hier)) {
            /* Am Konto neuer: aufs Gerät — nur der eigene Zweig, Zeitpunkt
               wie am Konto (sonst ginge er beim nächsten Mal wieder hinauf). */
            FORTSCHRITT.aendern(id, (stand) => ({ stand: FORTSCHRITT.zusammenfuehren(stand, konto) }), standVon(dort));
            return true;
        }
        if (hier && standVon(hier) > standVon(dort)) {
            await FORTSCHRITT_ABGLEICH.senden(geraet);
        }
        /* Neues aus Blunderluck am Konto zeigt sich über `mitKonto`. */
        return Object.keys(konto.spiele).some((app) => app !== FORTSCHRITT.APP);
    }
};

if (typeof module !== "undefined" && module.exports) {
    module.exports = FORTSCHRITT_ABGLEICH;
}
