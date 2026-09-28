/*
 * wortstatistik-abgleich.js — Wortstatistik und Spieler-Stufe auf dem Gerät
 * und (erst unter Regel §12) in der Datenbank (seit 0.23.1; Konzept
 * Apps\UPCrew\docs\DATENBANK-KONZEPT-12.md §7.3, §9, Phase A Punkt 5).
 * Die Rechnung steht in js/wortstatistik.js.
 *
 * NACH JEDER BEENDETEN RUNDE (`melden`, aus APP.fortschrittMelden — genau
 * einmal je Runde):
 *   1. Stufe auf dem Gerät weiterrechnen (`typoluck.stufe`, je Spieler-Id;
 *      auch für Gäste).
 *   2. Nur echte Konten (nicht Gast, nicht UP#Plus): die Tatsachen der
 *      Runde in die Warteschlange (`typoluck.wortstatistik-warte`, je Wort
 *      die neuesten, höchstens 300 Wörter).
 *   3. Nur unter Regel §12 senden (`senden`, im Hintergrund, blockiert
 *      nichts): je Wort EIN Mehrpfad-Schritt auf `typoluck-intern`. Der
 *      eigene Datensatz liegt auch auf dem Gerät
 *      (`typoluck.wortstatistik-eigen`, je uid); lehnt die Regel ab (ein
 *      anderes Gerät war schneller), wird er einmal vom Server gelesen und
 *      der Schritt neu gerechnet. Unter der heutigen Regel geht NICHTS
 *      hinaus (sie kennt `typoluck-intern` nicht).
 *   4. Unter §12 die Stufe ans Konto: `konten/<uid>/stufe/typoluck`.
 *
 * BEIM START (§12, angemeldet): die neue Schwierigkeit aus
 * `typoluck-intern/schwierigkeit` (≈ 1 KB, auch aus dem Gerätespeicher
 * sofort) — passt sie zur Lösungsliste, liest WORTBEWERTUNG.schwierigkeit
 * sie statt js/wortbewertung-daten.js (Rückfall). Nie `runden`/`summen`.
 */

const WORTSTATISTIK_ABGLEICH = {

    WARTE: "typoluck.wortstatistik-warte",
    EIGEN: "typoluck.wortstatistik-eigen",
    STUFE: "typoluck.stufe",
    SCHWIERIGKEIT: "typoluck.schwierigkeit",

    _intern: null,
    _konten: null,
    _uidGeber: null,
    _idGeber: null,
    _echtGeber: null,
    _sendetGerade: false,

    /* `intern` = Speicher auf `typoluck-intern` (null = nie senden),
       `konten` = Konten-Speicher, `uid()`, `id()` (Fortschritt-Id),
       `echt()` = echtes Passwort-Konto (kein Gast, nicht UP#Plus). */
    einrichten(intern, konten, uid, id, echt) {
        WORTSTATISTIK_ABGLEICH._intern = intern || null;
        WORTSTATISTIK_ABGLEICH._konten = konten || null;
        WORTSTATISTIK_ABGLEICH._uidGeber = uid || null;
        WORTSTATISTIK_ABGLEICH._idGeber = id || null;
        WORTSTATISTIK_ABGLEICH._echtGeber = echt || null;
        WORTSTATISTIK_ABGLEICH._schwierigkeitVomGeraet();
    },

    _uid() {
        return WORTSTATISTIK_ABGLEICH._uidGeber ? WORTSTATISTIK_ABGLEICH._uidGeber() : null;
    },

    _id() {
        return WORTSTATISTIK_ABGLEICH._idGeber ? WORTSTATISTIK_ABGLEICH._idGeber() : "gast";
    },

    _echt() {
        return !!(WORTSTATISTIK_ABGLEICH._echtGeber && WORTSTATISTIK_ABGLEICH._echtGeber());
    },

    _p12() {
        return typeof KONTO !== "undefined" && typeof KONTO.istP12 === "function" && KONTO.istP12();
    },

    /* Gerätespeicher: ein Objekt je Schlüssel, darin je Id/uid. */
    _lesen(schluessel) {
        try {
            const roh = JSON.parse(window.localStorage.getItem(schluessel) || "{}");
            return (roh && typeof roh === "object" && !Array.isArray(roh)) ? roh : {};
        } catch (fehler) {
            return {};
        }
    },

    _schreiben(schluessel, wert) {
        try {
            window.localStorage.setItem(schluessel, JSON.stringify(wert));
        } catch (fehler) {
            /* voll oder gesperrt: dann eben nicht */
        }
    },

    _je(schluessel, wer) {
        return WORTSTATISTIK_ABGLEICH._lesen(schluessel)[wer];
    },

    _jeSetzen(schluessel, wer, wert) {
        const alle = WORTSTATISTIK_ABGLEICH._lesen(schluessel);
        alle[wer] = wert;
        WORTSTATISTIK_ABGLEICH._schreiben(schluessel, alle);
    },

    /* Die Stufe dieses Spielers (Gerät). */
    stufe() {
        return WORTSTATISTIK.stufeNormalisieren(WORTSTATISTIK_ABGLEICH._je(WORTSTATISTIK_ABGLEICH.STUFE,
            WORTSTATISTIK_ABGLEICH._id()));
    },

    warte() {
        const w = WORTSTATISTIK_ABGLEICH._je(WORTSTATISTIK_ABGLEICH.WARTE, WORTSTATISTIK_ABGLEICH._uid() || "-");
        return Array.isArray(w) ? w : [];
    },

    _eigen() {
        const e = WORTSTATISTIK_ABGLEICH._je(WORTSTATISTIK_ABGLEICH.EIGEN, WORTSTATISTIK_ABGLEICH._uid() || "-");
        return (e && typeof e === "object") ? e : {};
    },

    /* Nach einer beendeten Runde (genau einmal). `heute` = JJJJ-MM-TT. */
    melden(runde, heute, zeitpunkt) {
        const t = WORTSTATISTIK.tatsachen(runde, heute);
        if (!t) {
            return null;
        }
        const vorher = WORTSTATISTIK_ABGLEICH.stufe();
        const eigen = WORTSTATISTIK_ABGLEICH._eigen();
        const r = ((eigen[t.k] && eigen[t.k].r) || 0) + 1;
        const D = WORTBEWERTUNG.schwierigkeit(t.wort);
        const nachher = WORTSTATISTIK.stufeNach(vorher, t, r, D, zeitpunkt || Date.now());
        WORTSTATISTIK_ABGLEICH._jeSetzen(WORTSTATISTIK_ABGLEICH.STUFE, WORTSTATISTIK_ABGLEICH._id(), nachher);
        const uid = WORTSTATISTIK_ABGLEICH._uid();
        if (uid && WORTSTATISTIK_ABGLEICH._echt()) {
            const eintrag = Object.assign({}, t, { s: Math.round(vorher.wert) });
            delete eintrag.wort;
            WORTSTATISTIK_ABGLEICH._jeSetzen(WORTSTATISTIK_ABGLEICH.WARTE, uid,
                WORTSTATISTIK.warteAufnehmen(WORTSTATISTIK_ABGLEICH.warte(), eintrag));
            WORTSTATISTIK_ABGLEICH.senden();
            WORTSTATISTIK_ABGLEICH.stufeSenden();
        }
        return { tatsachen: t, stufe: nachher };
    },

    /* Die Warteschlange senden — nur unter §12, ein Wort nach dem anderen. */
    async senden() {
        const uid = WORTSTATISTIK_ABGLEICH._uid();
        if (WORTSTATISTIK_ABGLEICH._sendetGerade || !WORTSTATISTIK_ABGLEICH._intern || !uid
                || !WORTSTATISTIK_ABGLEICH._echt() || !WORTSTATISTIK_ABGLEICH._p12()) {
            return 0;
        }
        WORTSTATISTIK_ABGLEICH._sendetGerade = true;
        let gesendet = 0;
        try {
            for (const t of WORTSTATISTIK_ABGLEICH.warte()) {
                if (!await WORTSTATISTIK_ABGLEICH._eins(uid, t)) {
                    continue;
                }
                gesendet++;
                WORTSTATISTIK_ABGLEICH._jeSetzen(WORTSTATISTIK_ABGLEICH.WARTE, uid,
                    WORTSTATISTIK_ABGLEICH.warte().filter((e) => e.k !== t.k));
            }
        } finally {
            WORTSTATISTIK_ABGLEICH._sendetGerade = false;
        }
        return gesendet;
    },

    async _eins(uid, t) {
        const schreiben = async (alt) => {
            const satz = WORTSTATISTIK.datensatz(alt, t, t.s);
            await WORTSTATISTIK_ABGLEICH._intern.teilSchreiben(WORTSTATISTIK.schritt(uid, t.k, satz));
            const eigen = WORTSTATISTIK_ABGLEICH._eigen();
            eigen[t.k] = satz;
            WORTSTATISTIK_ABGLEICH._jeSetzen(WORTSTATISTIK_ABGLEICH.EIGEN, uid, eigen);
        };
        try {
            await schreiben(WORTSTATISTIK_ABGLEICH._eigen()[t.k] || null);
            return true;
        } catch (fehler) {
            if (!fehler || fehler.status !== 401) {
                return false;
            }
        }
        /* Abgelehnt: vielleicht war ein anderes Gerät schneller (oder ein
           anderer Spieler gleichzeitig beim selben Wort) — einmal den eigenen
           Datensatz lesen und neu rechnen. */
        try {
            const vomServer = await WORTSTATISTIK_ABGLEICH._intern.teilLaden("runden/" + uid + "/" + t.k);
            await schreiben(vomServer && typeof vomServer === "object" ? vomServer : null);
            return true;
        } catch (fehler) {
            return false;
        }
    },

    /* Die Stufe ans Konto (nur §12, gezielter Pfad). */
    async stufeSenden() {
        const uid = WORTSTATISTIK_ABGLEICH._uid();
        const konten = WORTSTATISTIK_ABGLEICH._konten;
        if (!uid || !konten || typeof konten.teilSchreiben !== "function" || !WORTSTATISTIK_ABGLEICH._echt()
                || !WORTSTATISTIK_ABGLEICH._p12()) {
            return false;
        }
        const aenderungen = {};
        aenderungen["konten/" + uid + "/stufe/typoluck"] = WORTSTATISTIK.stufeFuerKonto(WORTSTATISTIK_ABGLEICH.stufe());
        try {
            await konten.teilSchreiben(aenderungen);
            return true;
        } catch (fehler) {
            return false;
        }
    },

    /* Der eigene Eintrag kam vom Konto: dessen Stufe mit dem Gerät
       zusammenführen (mehr Runden gewinnt). */
    stufeVomKonto(eintrag) {
        const vomKonto = eintrag && eintrag.stufe && eintrag.stufe.typoluck;
        if (!vomKonto) {
            return;
        }
        const zusammen = WORTSTATISTIK.stufeZusammen(WORTSTATISTIK_ABGLEICH.stufe(), vomKonto);
        WORTSTATISTIK_ABGLEICH._jeSetzen(WORTSTATISTIK_ABGLEICH.STUFE, WORTSTATISTIK_ABGLEICH._id(), zusammen);
    },

    /* ---------------------------------------------------------------- *
     * Die Schwierigkeit aus der Datenbank (mit Rückfall)
     * ---------------------------------------------------------------- */

    _anwenden(daten) {
        if (!WORTSTATISTIK.schwierigkeitPasst(daten, WOERTER_DE.loesungen)) {
            return false;
        }
        WORTBEWERTUNG._datenErsatz = { anzahl: daten.anzahl, pruefsumme: daten.pruefsumme,
            stufenAb: daten.stufenAb.slice(), skalaAb: (daten.skalaAb || []).slice(), kodiert: daten.kodiert };
        return true;
    },

    _schwierigkeitVomGeraet() {
        try {
            const roh = JSON.parse(window.localStorage.getItem(WORTSTATISTIK_ABGLEICH.SCHWIERIGKEIT) || "null");
            WORTSTATISTIK_ABGLEICH._anwenden(roh);
        } catch (fehler) {
            /* dann gilt js/wortbewertung-daten.js */
        }
    },

    /* Frisch aus der Datenbank (nur §12, angemeldet). Liefert true, wenn
       eine passende Schwierigkeit jetzt gilt. */
    async schwierigkeitHolen() {
        if (!WORTSTATISTIK_ABGLEICH._intern || !WORTSTATISTIK_ABGLEICH._uid() || !WORTSTATISTIK_ABGLEICH._p12()) {
            return false;
        }
        try {
            const daten = await WORTSTATISTIK_ABGLEICH._intern.teilLaden("schwierigkeit");
            if (!WORTSTATISTIK_ABGLEICH._anwenden(daten)) {
                return false;
            }
            WORTSTATISTIK_ABGLEICH._schreiben(WORTSTATISTIK_ABGLEICH.SCHWIERIGKEIT, daten);
            return true;
        } catch (fehler) {
            return false;
        }
    }
};

if (typeof module !== "undefined" && module.exports) {
    module.exports = WORTSTATISTIK_ABGLEICH;
}
