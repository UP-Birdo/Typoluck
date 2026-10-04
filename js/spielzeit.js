/*
 * spielzeit.js — Spielzeit und „dabei seit" in Typoluck (seit 0.24.0, wie
 * Blunderluck v0.155.0/v0.155.2 `js\fortschritt-konto.js`, Teil SPIELZEIT).
 *
 * Nutzer 28.09.2026: „log die zeit wie lange die app offen ist auf jedem
 * account" · „okay privat … auch bei gästen … sowohl als auch der start
 * datum" · „bis zur ersten stunde 0 bis 59 min danach 1h+ 2h".
 *
 * DIE RECHNUNG steht in js\fortschritt.js (im von Blunderluck Zeile für
 * Zeile übernommenen Teil): `spielzeitZaehlen`, `spielzeitVon`,
 * `spielzeitSumme`, `seitVon`, `spielzeitText`, `spielzeitOeffentlichVon`.
 * Gezählt wird im EIGENEN Zweig `fortschritt.spiele.typoluck`
 * (`zaehler.spielzeit` Sekunden, `zaehler.seit` JJJJMMTT).
 *
 * HIER nur das Zählen, das Hinaufgeben und der Haken:
 *   - gezählt wird nur, solange die Seite SICHTBAR ist, alle TAKT_MS die
 *     Zeit seit dem letzten Schritt (höchstens SPIELZEIT_SCHRITT_MAX) —
 *     aufs Gerät, auch als Gast (unter „gast");
 *   - ans Konto (nur mit echtem Konto, js\fortschritt-abgleich.js) beim
 *     Verbergen der Seite und höchstens alle KONTO_MS;
 *   - Gast → Konto: nach „Spielstand sichern" geht der ganze Gerätestand
 *     „gast" in die Person über (`gastZumKonto`);
 *   - der Haken „Spielzeit öffentlich" ist ein Feld AM KONTO
 *     (`konten/<uid>/spielzeitOeffentlich`, Ja/Nein, Standard aus), gezielt
 *     geschrieben; unter §12 zieht der eigene Auszug sofort nach.
 */

const SPIELZEIT = {

    TAKT_MS: 30000,
    KONTO_MS: 15 * 60 * 1000,
    _sichtbarSeit: null,
    _kontoZuletzt: 0,
    _uhr: null,

    /* Woher die App ihre Teile nimmt (in Tests austauschbar). */
    _id() {
        return (typeof APP !== "undefined") ? APP.fortschrittId() : null;
    },

    _uid() {
        return (typeof APP !== "undefined") ? APP._aussehenUid() : null;
    },

    starten() {
        if (SPIELZEIT._uhr || typeof document === "undefined") {
            return;
        }
        const sichtbar = () => document.visibilityState !== "hidden";
        SPIELZEIT._sichtbarSeit = sichtbar() ? Date.now() : null;
        SPIELZEIT._kontoZuletzt = Date.now();
        SPIELZEIT._uhr = setInterval(() => SPIELZEIT.schritt(sichtbar()), SPIELZEIT.TAKT_MS);
        document.addEventListener("visibilitychange", () => SPIELZEIT.schritt(sichtbar()));
    },

    /*
     * Ein Schritt: die sichtbare Zeit seit dem letzten Schritt buchen.
     * `sichtbar` = ist die Seite JETZT sichtbar. Wird sie gerade verborgen,
     * geht der Stand ans Konto. Liefert die gebuchten Sekunden.
     */
    schritt(sichtbar, jetzt) {
        const zeit = (typeof jetzt === "number") ? jetzt : Date.now();
        let gebucht = 0;
        if (SPIELZEIT._sichtbarSeit !== null) {
            gebucht = Math.min(Math.floor(Math.max(0, zeit - SPIELZEIT._sichtbarSeit) / 1000),
                FORTSCHRITT.SPIELZEIT_SCHRITT_MAX);
            if (gebucht > 0) {
                const buchen = () => FORTSCHRITT.aendern(SPIELZEIT._id(),
                    (stand) => ({ stand: FORTSCHRITT.spielzeitZaehlen(stand, gebucht, zeit, FORTSCHRITT.APP) }), zeit);
                /* Seit 0.33.0: Die Spielzeit lässt keine Seite anders
                   aussehen — ihr Schreiben (alle 30 s) macht die Seiten des
                   Bandes nicht veraltet (js\app.js `stillSchreiben`). */
                if (typeof APP !== "undefined" && typeof APP.stillSchreiben === "function") {
                    APP.stillSchreiben(buchen);
                } else {
                    buchen();
                }
            }
        }
        SPIELZEIT._sichtbarSeit = sichtbar ? zeit : null;
        if (!sichtbar || zeit - SPIELZEIT._kontoZuletzt >= SPIELZEIT.KONTO_MS) {
            SPIELZEIT.sichern(zeit);
        }
        return gebucht;
    },

    /* Den Gerätestand (mit Spielzeit) ans Konto — nur mit echtem Konto
       (sonst tut `senden` nichts). */
    sichern(jetzt) {
        SPIELZEIT._kontoZuletzt = (typeof jetzt === "number") ? jetzt : Date.now();
        if (SPIELZEIT._uid()) {
            FORTSCHRITT_ABGLEICH.senden(FORTSCHRITT.laden(SPIELZEIT._id()));
        }
    },

    /* "2026-08-12" → "12.08.2026" (Anzeige von „dabei seit"). */
    datumText(iso) {
        const t = String(iso || "").split("-");
        return t.length === 3 ? t[2] + "." + t[1] + "." + t[0] : "";
    },

    /* Für das eigene Profil: { spiele: { app: Sekunden }, summe, seit
       ("JJJJ-MM-TT" oder "") } — über alle Zweige, mit dem Konto-Stand. */
    spielzeit() {
        const stand = APP.fortschritt();
        const spiele = {};
        for (const app of Object.keys(FORTSCHRITT.normalisieren(stand).spiele)) {
            spiele[app] = FORTSCHRITT.spielzeitVon(stand, app);
        }
        return { spiele: spiele, summe: FORTSCHRITT.spielzeitSumme(stand), seit: FORTSCHRITT.seitVon(stand) };
    },

    /*
     * GAST → KONTO (Nutzer: Spielzeit und Startdatum „auch bei gästen",
     * beim Umzug mitnehmen): Nach „Spielstand sichern" liegt der Gast-Stand
     * auf dem Gerät noch unter „gast". Er wird mit dem Eintrag der Person
     * zusammengeführt (Spielzeit, „dabei seit", XP, Serie — alles), der
     * Gast-Eintrag verschwindet (wie Blunderluck, gemeinsamer Gerätespeicher
     * `upcrew.fortschritt`), und der Stand geht ans Konto. Liefert, ob etwas
     * umgezogen ist.
     */
    gastZumKonto(id) {
        if (!id || id === FORTSCHRITT.GAST) {
            return false;
        }
        const alle = FORTSCHRITT._alle();
        const gast = alle[FORTSCHRITT.GAST];
        if (!FORTSCHRITT._istObjekt(gast)) {
            return false;
        }
        alle[id] = FORTSCHRITT.zusammenfuehren(alle[id] || null, gast);
        delete alle[FORTSCHRITT.GAST];
        FORTSCHRITT._schreiben(alle);
        if (SPIELZEIT._uid()) {
            FORTSCHRITT_ABGLEICH.senden(FORTSCHRITT.laden(id));
        }
        return true;
    },

    /* ---------------------------------------------------------------- *
     * Der Haken „Spielzeit öffentlich" (am Konto)
     * ---------------------------------------------------------------- */

    /* Der eigene Eintrag (mit uid) — oder null für Gäste und ohne Konto. */
    _eigener() {
        if (!SPIELZEIT._uid()) {
            return null;
        }
        const ich = ANMELDUNG.ich();
        return (ich && ich.uid) ? ich : null;
    },

    oeffentlich() {
        return FORTSCHRITT.spielzeitOeffentlichVon(SPIELZEIT._eigener());
    },

    /* Die Änderung fürs Konto — rein, damit der Test sie gegen die Regel
       prüfen kann: das Feld gezielt, mit `geaendertAm` im selben Schritt
       (Regel 3 der Konten). */
    aenderungen(uid, an, jetzt) {
        const aenderungen = { geaendertAm: jetzt || Date.now() };
        aenderungen["konten/" + uid + "/spielzeitOeffentlich"] = (an === true);
        return aenderungen;
    },

    /* Umschalten: ans Konto, im Speicher des Abgleichs nachgetragen (damit
       ein späteres Schreiben des ganzen Eintrags es behält), unter §12 den
       eigenen Auszug sofort neu — über `FORTSCHRITT_ABGLEICH.senden` mit
       dem Stand vom Gerät (der Eintrag im Abgleich kennt die jüngste
       Spielzeit nicht). Liefert true bei Erfolg. */
    async oeffentlichSetzen(an) {
        const ich = SPIELZEIT._eigener();
        const speicher = APP.spielerSpeicher;
        if (!ich || !speicher || typeof speicher.teilSchreiben !== "function") {
            return false;
        }
        try {
            await speicher.teilSchreiben(SPIELZEIT.aenderungen(ich.uid, an));
        } catch (fehler) {
            return false;
        }
        const daten = ANMELDUNG.abgleich && ANMELDUNG.abgleich.daten;
        const eintrag = daten && Array.isArray(daten.spieler) ? daten.spieler.find((s) => s.id === ich.id) : null;
        if (eintrag) {
            eintrag.spielzeitOeffentlich = (an === true);
        }
        await FORTSCHRITT_ABGLEICH.senden(FORTSCHRITT.laden(SPIELZEIT._id()));
        return true;
    }
};

if (typeof module !== "undefined" && module.exports) {
    module.exports = SPIELZEIT;
}
