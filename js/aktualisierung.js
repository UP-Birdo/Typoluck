/*
 * aktualisierung.js — die neue Version auch wirklich zeigen (seit 0.15.2).
 *
 * DER FEHLER (Nutzer 27.09.2026: „ich bekomme die neuste Version nicht mehr
 * aufgerufen"; live nachgemessen an Blunderluck, dasselbe Muster hier): Der
 * Server liefert die neue Version, die Seite startet aber aus dem
 * Zwischenspeicher mit der alten. Der neue Worker installiert sich im
 * Hintergrund und übernimmt (skipWaiting/claim) — die OFFENE Seite bleibt
 * alt, erst der nächste Neustart zeigt die neue. Eine App vom
 * Home-Bildschirm wird fast nie neu gestartet, sondern nur hervorgeholt:
 * Dort kam die neue Version praktisch nie an. Bis 0.15.1 hat
 * `APP._serviceWorkerAnmelden` nur registriert.
 *
 * WAS JETZT PASSIERT (gleich in Blunderluck v0.151.2):
 *   1. Beim Start und bei jeder Rückkehr in den Vordergrund fragt der
 *      Worker beim Server nach (`registration.update()`), höchstens alle
 *      PRUEF_ABSTAND_MS.
 *   2. Übernimmt ein neuer Worker (`controllerchange`) — und gab es vorher
 *      schon einen (sonst ist es nur die allererste Installation) —, lädt
 *      die Seite EINMAL neu, aber nur an einer sicheren Stelle: nicht,
 *      solange Buchstaben getippt, ein Feld beschrieben oder ein Dialog
 *      bzw. die Anmeldung offen ist. Sonst erscheint oben eine schlichte
 *      Leiste „Neue Version" (antippen = sofort laden) und die Seite lädt
 *      beim nächsten sicheren Moment von selbst.
 *   3. Keine Endlosschleife: Vor dem Neuladen steht ein Merker in
 *      sessionStorage; innerhalb von SPERRE_MS danach wird nicht noch
 *      einmal neu geladen.
 *
 * Die Entscheidungen (`sollPruefen`, `sicher`, `neuLadenErlaubt`) sind rein
 * und stehen in tests\test-aktualisierung.js; die Verdrahtung mit dem
 * Browser (`einrichten`) wird angesehen, nicht getestet.
 */

const AKTUALISIERUNG = {

    /* Höchstens so oft beim Server nachfragen. */
    PRUEF_ABSTAND_MS: 5 * 60 * 1000,

    /* So lange nach einem Neuladen kein zweites (gegen Schleifen). */
    SPERRE_MS: 60 * 1000,

    /* Wie oft nachgesehen wird, ob gerade ein sicherer Moment ist. */
    WARTEN_MS: 3000,

    MERKER: "typoluck.neu-geladen",

    /* ---------------------------------------------------------------- *
     * Die reinen Entscheidungen
     * ---------------------------------------------------------------- */

    /* Beim Server nachfragen? Ja beim ersten Mal und nach dem Abstand. */
    sollPruefen(jetzt, zuletzt) {
        return !zuletzt || jetzt - zuletzt >= AKTUALISIERUNG.PRUEF_ABSTAND_MS;
    },

    /*
     * Ist jetzt ein sicherer Moment zum Neuladen? `lage`:
     *   getippt        Buchstaben in der Zeile, in die gerade getippt wird
     *   schreibt       ein Eingabefeld hat den Fokus
     *   dialogOffen    ein eigener Dialog ist offen
     *   anmeldungOffen das Anmelde-Vollbild ist offen
     * Eine angefangene Runde selbst ist sicher — sie liegt auf dem Gerät
     * (ICH.spielstand); verloren gingen nur die getippten Buchstaben.
     */
    sicher(lage) {
        const l = lage || {};
        return !(l.getippt > 0) && !l.schreibt && !l.dialogOffen && !l.anmeldungOffen;
    },

    /* Darf neu geladen werden? Nein, wenn der Merker jünger als SPERRE_MS ist. */
    neuLadenErlaubt(merker, jetzt) {
        const zeit = Number(merker);
        return !(zeit > 0 && jetzt - zeit < AKTUALISIERUNG.SPERRE_MS);
    },

    /* ---------------------------------------------------------------- *
     * Die Verdrahtung mit dem Browser
     * ---------------------------------------------------------------- */

    _registrierung: null,
    _zuletztGeprueft: 0,
    _wartet: false,
    _uhr: null,
    _lageGeber: null,

    /*
     * `registrierung` = das Ergebnis von navigator.serviceWorker.register;
     * `lageGeber()` liefert die `lage` für `sicher` (js\app.js).
     */
    einrichten(registrierung, lageGeber) {
        AKTUALISIERUNG._registrierung = registrierung;
        AKTUALISIERUNG._lageGeber = lageGeber;
        const hatteController = !!navigator.serviceWorker.controller;

        navigator.serviceWorker.addEventListener("controllerchange", () => {
            if (hatteController) {
                AKTUALISIERUNG._neueVersion();
            }
        });
        document.addEventListener("visibilitychange", () => {
            if (document.visibilityState === "visible") {
                AKTUALISIERUNG.pruefen();
            }
        });
        AKTUALISIERUNG.pruefen();
    },

    /* Beim Server nachfragen, ob es einen neueren Worker gibt. */
    pruefen() {
        const jetzt = Date.now();
        if (!AKTUALISIERUNG._registrierung
            || !AKTUALISIERUNG.sollPruefen(jetzt, AKTUALISIERUNG._zuletztGeprueft)) {
            return;
        }
        AKTUALISIERUNG._zuletztGeprueft = jetzt;
        AKTUALISIERUNG._registrierung.update().catch(() => {
            /* offline — beim nächsten Mal */
        });
    },

    _merker() {
        try {
            return window.sessionStorage.getItem(AKTUALISIERUNG.MERKER);
        } catch (fehler) {
            return null;
        }
    },

    _lage() {
        try {
            return AKTUALISIERUNG._lageGeber ? AKTUALISIERUNG._lageGeber() : {};
        } catch (fehler) {
            return {};
        }
    },

    /* Ein neuer Worker hat übernommen. */
    _neueVersion() {
        if (!AKTUALISIERUNG.neuLadenErlaubt(AKTUALISIERUNG._merker(), Date.now())) {
            return;
        }
        if (AKTUALISIERUNG.sicher(AKTUALISIERUNG._lage())) {
            AKTUALISIERUNG.laden();
            return;
        }
        AKTUALISIERUNG._leisteZeigen();
        if (!AKTUALISIERUNG._wartet) {
            AKTUALISIERUNG._wartet = true;
            AKTUALISIERUNG._uhr = setInterval(() => {
                if (AKTUALISIERUNG.sicher(AKTUALISIERUNG._lage())) {
                    AKTUALISIERUNG.laden();
                }
            }, AKTUALISIERUNG.WARTEN_MS);
        }
    },

    /* Merker setzen, dann neu laden. */
    laden() {
        if (AKTUALISIERUNG._uhr) {
            clearInterval(AKTUALISIERUNG._uhr);
            AKTUALISIERUNG._uhr = null;
        }
        try {
            window.sessionStorage.setItem(AKTUALISIERUNG.MERKER, String(Date.now()));
        } catch (fehler) {
            /* ohne Merker lädt es trotzdem genau einmal */
        }
        window.location.reload();
    },

    /* Die schlichte Leiste oben: ein Knopf „Neue Version". */
    _leisteZeigen() {
        if (document.getElementById("aktualisierung")) {
            return;
        }
        const leiste = BAUSTEINE.el("div", "aktualisierung");
        leiste.id = "aktualisierung";
        leiste.setAttribute("role", "status");
        leiste.appendChild(BAUSTEINE.knopf({
            text: "Neue Version", art: "haupt", klein: true, zeichen: "aktualisieren",
            beiKlick: () => AKTUALISIERUNG.laden()
        }));
        document.body.appendChild(leiste);
    }
};

if (typeof module !== "undefined" && module.exports) {
    module.exports = AKTUALISIERUNG;
}
