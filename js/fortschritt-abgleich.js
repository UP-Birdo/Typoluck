/*
 * fortschritt-abgleich.js — der Fortschritt am UPCrew-Konto.
 *
 * WOZU: js\fortschritt.js hält Level, XP, Serie und Heute im Browser-
 * Speicher (`upcrew.fortschritt`); Blunderluck im SELBEN Browser sieht es
 * sofort. Andere Geräte und die iPhone-Apps vom Home-Bildschirm haben je
 * eigenen Speicher — für sie reist der Fortschritt am Konto mit:
 *
 *     spieler/konten/<uid>/fortschritt
 *         { version: 1, spiele: { typoluck: {…}, blunderluck: {…} } }
 *
 * Die Regel dafür steht in der Datenbank-Regel §11b; der Nutzer
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

    /* Der Stand des letzten Sendens für die Status-Lampe:
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
        /* Die fremden Zweige von vorher — zum Vergleich unten. */
        const fremdVorher = (FORTSCHRITT_ABGLEICH._kontoUid === uid)
            ? FORTSCHRITT_ABGLEICH._fremdText(FORTSCHRITT_ABGLEICH._konto) : "{}";
        FORTSCHRITT_ABGLEICH._konto = konto;
        FORTSCHRITT_ABGLEICH._kontoUid = uid;

        const geraet = FORTSCHRITT.laden(id);
        const hier = geraet.spiele[FORTSCHRITT.APP];
        const dort = konto.spiele[FORTSCHRITT.APP];
        const standVon = (zweig) => (zweig && typeof zweig.stand === "number") ? zweig.stand : 0;

        if (dort && standVon(dort) > standVon(hier)) {
            /* Am Konto neuer: aufs Gerät — nur der eigene Zweig, Zeitpunkt
               wie am Konto (sonst ginge er beim nächsten Mal wieder hinauf). */
            const ergebnis = FORTSCHRITT.aendern(id,
                (stand) => ({ stand: FORTSCHRITT.zusammenfuehren(stand, konto) }), standVon(dort));
            /* VEREINIGUNG STATT ERSETZEN (seit 0.36.0, offline Erspieltes):
               Brachte das Gerät beim Zusammenführen etwas mit, das am Konto
               fehlt (ein Zähler wie Münzen, offline verdient), geht die
               Vereinigung EINMAL hinauf — mit dem `stand` des Kontos, also ohne
               Schleife (beim nächsten Holen sind beide Seiten gleich). */
            if (ergebnis && ergebnis.stand && !FORTSCHRITT_ABGLEICH._wieAmKonto(ergebnis.stand, konto)) {
                await FORTSCHRITT_ABGLEICH.senden(ergebnis.stand);
            }
            return true;
        }
        /* Gerät neuer oder gleich alt (seit 0.36.0, Gegenprüfung Befund 1
           und 2): NIE den rohen Geräte-Zweig hinauf — sonst überschriebe ein
           offline gespieltes Gerät die Münzen und Zähler eines anderen Geräts
           am Konto. Erst mit dem Konto-Zweig vereinigen (neuere Fassung,
           Zähler je Name das Maximum), dann EINMAL senden, wenn das Konto
           davon abweicht. Auch bei GLEICHEM `stand` (die frühe Vereinigung in
           js\wer-spielt.js legt den Stand des Kontos aufs Gerät, samt offline
           verdienter Münzen): Sonst gingen diese erst mit dem nächsten
           Spielzug hinauf. Verglichen wird in der Form, die am Konto ankommt
           (`fuerKonto`) — so schreibt das nächste Holen nichts mehr. */
        if (hier && !FORTSCHRITT_ABGLEICH._wieAmKonto(FORTSCHRITT.zusammenfuehren(geraet, konto), konto)) {
            let stand = FORTSCHRITT.zusammenfuehren(geraet, konto);
            let geraetNeu = false;
            if (!FORTSCHRITT_ABGLEICH._gleich(FORTSCHRITT.zweig(stand), FORTSCHRITT.zweig(geraet))) {
                stand = FORTSCHRITT.aendern(id, (s) => ({ stand: FORTSCHRITT.zusammenfuehren(s, konto) }),
                    Math.max(standVon(hier), standVon(dort))).stand;
                geraetNeu = true;
            }
            await FORTSCHRITT_ABGLEICH.senden(stand);
            if (geraetNeu) {
                return true;
            }
        }
        /* Neues aus Blunderluck am Konto zeigt sich über `mitKonto`. Seit
           0.31.0 gilt das nur als Änderung, wenn sich an den fremden Zweigen
           wirklich etwas bewegt hat — bis 0.30.0 hiess „es gibt einen
           fremden Zweig" schon „geändert", und bei jeder Rückkehr in den
           Vordergrund wurde die offene Seite samt Blättern neu gezeichnet. */
        return FORTSCHRITT_ABGLEICH._fremdText(konto) !== fremdVorher;
    },

    /* Stünde am Konto schon genau das, was `stand` dort hinterliesse? (Der
       eigene Zweig in der Form des Datenvertrags, `fuerKonto`.) */
    _wieAmKonto(stand, konto) {
        const hinauf = FORTSCHRITT.zweig(FORTSCHRITT.normalisieren(FORTSCHRITT.fuerKonto(stand)));
        return FORTSCHRITT_ABGLEICH._gleich(hinauf, FORTSCHRITT.zweig(konto));
    },

    /* Zwei Werte gleich, unabhängig von der Reihenfolge der Schlüssel. */
    _gleich(a, b) {
        const ordnen = (w) => {
            if (Array.isArray(w)) {
                return w.map(ordnen);
            }
            if (w && typeof w === "object") {
                const aus = {};
                for (const k of Object.keys(w).sort()) {
                    aus[k] = ordnen(w[k]);
                }
                return aus;
            }
            return w;
        };
        return JSON.stringify(ordnen(a)) === JSON.stringify(ordnen(b));
    },

    /* Die Zweige der anderen Spiele als Text (zum Vergleichen). */
    _fremdText(stand) {
        const fremd = {};
        const spiele = (stand && stand.spiele && typeof stand.spiele === "object") ? stand.spiele : {};
        for (const app of Object.keys(spiele).sort()) {
            if (app !== FORTSCHRITT.APP) {
                fremd[app] = spiele[app];
            }
        }
        return JSON.stringify(fremd);
    }
};

if (typeof module !== "undefined" && module.exports) {
    module.exports = FORTSCHRITT_ABGLEICH;
}
