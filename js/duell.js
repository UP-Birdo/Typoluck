/*
 * duell.js — das Duell (1 gegen 1) als reines Modell: kein Bildschirm, kein
 * Netz, kein Zufall ohne Auftrag (seit 0.34.0).
 *
 * GRUNDLAGE UND VERBINDLICHER VERTRAG: UPCrew-Konzept DUELL-KONZEPT-14.md
 * (Fassung 2) und die Regel §14 in den UPCrew-Regeltexten (Zweig
 * `typoluck-intern/duell`). Fest (Nutzer 03.10.2026): gleiches Wort für
 * beide · weniger Versuche gewinnt das Wort, bei Gleichstand die kürzere
 * Zeit · höchstens drei Wörter, bei 2:0 ist Schluss · lösen beide ein Wort
 * nicht, bekommen beide einen Punkt · nur EIN Duell gleichzeitig · ohne Tipp
 * und Extra-Versuch · der Gegner muss nicht online sein (Farbmuster mit
 * Zeiten, nie Wörter) · Münzen fürs Duell ruhen.
 *
 * Ein Duell, wie es in der Datenbank liegt (`spiele/<id>`):
 *
 *     kopf:  { a, b, t, n, v }      a = Herausforderer, b = Herausgeforderter
 *                                   (beides Konto-Nummern), t = Serverzeit
 *                                   beim Anlegen, n = Länge der Lösungsliste,
 *                                   v = 1 (Fassung des Vertrags)
 *     teil:  { a: { st, w }, b: { st, w } }
 *            st  a: "auf" · b: "an" | "ab" | "auf" (fehlt = nichts gesagt)
 *            w   je Wort 0–2 { b, m, z, p } — b Beginn (Serverzeit),
 *                m Farbmuster [RVF] Zeile an Zeile, z je Zeile 7 Ziffern ms
 *                seit Beginn, p Wertung (kleiner gewinnt). REST liefert `w`
 *                als LISTE ([{…}, null, {…}]) — gelesen wird beides.
 *
 * Wer schreibt was: die Schritte unten (`schritt…`), je ein Mehrpfad-PATCH
 * relativ zu `typoluck-intern/duell`. Geschrieben wird in
 * js\duell-abgleich.js — dort auch, was nur auf dem Gerät liegt.
 */

const DUELL = {

    VERTRAG: 1,
    WOERTER: 3,
    VERSUCHE: 6,

    /* Die Fristen der Regel §14 (Konzept Abschnitt 10, Punkt 1). */
    FRIST_ANNAHME_MS: 172800000,
    FRIST_DUELL_MS: 432000000,

    /* Wertung `p`: gelöst = Versuche × 10 000 000 + Dauer (0–9 999 999 ms),
       nicht gelöst genau 70 000 000. */
    VERSUCH_FAKTOR: 10000000,
    DAUER_MAX: 9999999,
    NICHT_GELOEST: 70000000,

    KENNUNG_MUSTER: /^[A-Za-z0-9_-]{20}$/,
    KENNUNG_ZEICHEN: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-",

    /* Platzhalter der Serverzeit (Firebase REST). */
    SERVERZEIT: { ".sv": "timestamp" },

    /* Die Werkstatt darf das Duell ohne Regel zeigen (js\werkstatt.js,
       `&duell`) — nie das echte Spiel. */
    _werkstatt: false,

    /* Ist das Duell da? NUR mit eingespielter Regel §14 (KONFIG) oder in
       der Werkstatt. Sonst: nichts zu sehen, kein Pfad berührt. */
    an() {
        return (typeof KONFIG !== "undefined" && !!KONFIG && KONFIG.REGEL_14_EINGESPIELT === true)
            || DUELL._werkstatt === true;
    },

    /* ---------------------------------------------------------------- *
     * Gleiches Wort für beide (Konzept Abschnitt 3)
     * ---------------------------------------------------------------- */

    /* FNV-1a 32 Bit über die Zeichen von `text` (wie
       WORTSTATISTIK.schluessel, hier als Zahl). */
    streuung(text) {
        let h = 2166136261;
        for (const z of String(text)) {
            h ^= z.codePointAt(0);
            h = Math.imul(h, 16777619) >>> 0;
        }
        return h;
    },

    /* Die drei Stellen in der Lösungsliste; eine schon vergebene rückt
       weiter (+1, mod n). Prüfvektor: AAAAAAAAAAAAAAAAAAA1, 567 → 394, 257, 525. */
    stellen(id, n) {
        const vergeben = [];
        for (let nr = 0; nr < DUELL.WOERTER; nr++) {
            let stelle = DUELL.streuung("typoluck|duell|1|" + nr + "|" + id) % n;
            while (vergeben.indexOf(stelle) !== -1) {
                stelle = (stelle + 1) % n;
            }
            vergeben.push(stelle);
        }
        return vergeben;
    },

    /* Das Wort Nummer `nr` (0–2) eines Duells. null, wenn dieses Gerät
       weniger Lösungen kennt, als der Herausforderer beim Anlegen hatte
       („Bitte Typoluck aktualisieren"). */
    wort(id, n, nr, loesungen) {
        if (!Array.isArray(loesungen) || !Number.isInteger(n) || n < 1 || loesungen.length < n
                || !Number.isInteger(nr) || nr < 0 || nr >= DUELL.WOERTER) {
            return null;
        }
        return loesungen[DUELL.stellen(id, n)[nr]];
    },

    /* Eine neue Kennung aus 20 Zufallszahlen 0–255 (von aussen, z. B.
       crypto.getRandomValues). */
    kennung(bytes) {
        let id = "";
        for (let i = 0; i < 20; i++) {
            const zahl = (bytes && Number.isInteger(bytes[i])) ? bytes[i] : 0;
            id += DUELL.KENNUNG_ZEICHEN[zahl & 63];
        }
        return id;
    },

    kennungOk(id) {
        return typeof id === "string" && DUELL.KENNUNG_MUSTER.test(id);
    },

    /* ---------------------------------------------------------------- *
     * Die Wertung eines Worts
     * ---------------------------------------------------------------- */

    wertung(geloest, versuche, dauerMs) {
        if (!geloest || !Number.isInteger(versuche) || versuche < 1 || versuche > DUELL.VERSUCHE) {
            return DUELL.NICHT_GELOEST;
        }
        const dauer = Math.min(DUELL.DAUER_MAX, Math.max(0, Math.round(Number(dauerMs) || 0)));
        return versuche * DUELL.VERSUCH_FAKTOR + dauer;
    },

    zerlegen(p) {
        if (typeof p !== "number" || !isFinite(p) || p >= DUELL.NICHT_GELOEST || p < DUELL.VERSUCH_FAKTOR) {
            return { geloest: false, versuche: 0, dauerMs: 0 };
        }
        return { geloest: true, versuche: Math.floor(p / DUELL.VERSUCH_FAKTOR), dauerMs: p % DUELL.VERSUCH_FAKTOR };
    },

    /* Das Muster als eine Kette (Zeilen aus WORDLE.muster aneinander). */
    musterText(zeilen) {
        const text = (Array.isArray(zeilen) ? zeilen : []).join("");
        return (/^[RVF]{0,30}$/.test(text) && text.length % 5 === 0) ? text : "";
    },

    musterZeilen(text) {
        const zeilen = [];
        const roh = (typeof text === "string" && /^[RVF]*$/.test(text)) ? text : "";
        for (let i = 0; i + 5 <= roh.length && zeilen.length < DUELL.VERSUCHE; i += 5) {
            zeilen.push(roh.slice(i, i + 5));
        }
        return zeilen;
    },

    /* Je Zeile 7 Ziffern: ms seit Beginn, gedeckelt. */
    zeitenText(zeiten) {
        return (Array.isArray(zeiten) ? zeiten : []).slice(0, DUELL.VERSUCHE).map((ms) => {
            const wert = Math.min(DUELL.DAUER_MAX, Math.max(0, Math.round(Number(ms) || 0)));
            return String(wert).padStart(7, "0");
        }).join("");
    },

    /*
     * Die Zeiten eines Gegner-Worts zum Abspielen — `z` wird nie vertraut
     * (Bau-Plan 3 e): so viele Zeilen wie `m`, aufsteigend, nicht nach der
     * Dauer aus `p`. Sonst gleichmässig verteilt.
     */
    zeitenLesen(z, m, p) {
        const zeilen = DUELL.musterZeilen(m).length;
        const teil = DUELL.zerlegen(p);
        const bis = teil.geloest ? teil.dauerMs : DUELL.DAUER_MAX;
        if (typeof z === "string" && /^[0-9]*$/.test(z) && z.length === zeilen * 7) {
            const liste = [];
            for (let i = 0; i < zeilen; i++) {
                liste.push(Number(z.slice(i * 7, i * 7 + 7)));
            }
            const ok = liste.every((ms, i) => ms <= bis && (i === 0 || ms >= liste[i - 1]));
            if (ok) {
                return liste;
            }
        }
        const gesamt = teil.geloest ? teil.dauerMs : zeilen * 15000;
        return Array.from({ length: zeilen }, (_, i) => Math.round(gesamt * (i + 1) / Math.max(1, zeilen)));
    },

    /* ---------------------------------------------------------------- *
     * Lesen: ein Duell aus der Datenbank in Form bringen
     * ---------------------------------------------------------------- */

    _wortLesen(roh) {
        if (!roh || typeof roh !== "object") {
            return null;
        }
        const wort = {};
        if (typeof roh.b === "number" && isFinite(roh.b)) {
            wort.b = roh.b;
        }
        if (typeof roh.p === "number" && isFinite(roh.p) && roh.p % 1 === 0) {
            wort.p = roh.p;
            wort.m = (typeof roh.m === "string" && /^[RVF]{0,30}$/.test(roh.m) && roh.m.length % 5 === 0) ? roh.m : "";
            wort.z = (typeof roh.z === "string" && /^[0-9]{0,42}$/.test(roh.z)) ? roh.z : "";
        }
        return Object.keys(wort).length ? wort : null;
    },

    /* `w` als Liste ODER Objekt (Gegenprüfung, Bau-Plan 3 a). */
    _teilLesen(roh) {
        const teil = { st: "", w: [null, null, null] };
        if (!roh || typeof roh !== "object") {
            return teil;
        }
        if (["an", "ab", "auf"].indexOf(roh.st) !== -1) {
            teil.st = roh.st;
        }
        const w = roh.w;
        if (w && typeof w === "object") {
            for (let nr = 0; nr < DUELL.WOERTER; nr++) {
                const eintrag = Array.isArray(w) ? w[nr] : w[String(nr)];
                teil.w[nr] = DUELL._wortLesen(eintrag);
            }
        }
        return teil;
    },

    /* Liefert { id, kopf, teil: { a, b } } oder null (ohne Kopf kein Duell). */
    lesen(roh, id) {
        if (!roh || typeof roh !== "object" || !roh.kopf || typeof roh.kopf !== "object") {
            return null;
        }
        const k = roh.kopf;
        if (typeof k.a !== "string" || typeof k.b !== "string" || typeof k.t !== "number"
                || !Number.isInteger(k.n)) {
            return null;
        }
        const teil = roh.teil || {};
        return {
            id: id || "",
            kopf: { a: k.a, b: k.b, t: k.t, n: k.n, v: k.v },
            teil: { a: DUELL._teilLesen(teil.a), b: DUELL._teilLesen(teil.b) }
        };
    },

    /* ---------------------------------------------------------------- *
     * Stand und Lage
     * ---------------------------------------------------------------- */

    _p(d, wer, nr) {
        const w = d && d.teil && d.teil[wer] && d.teil[wer].w[nr];
        return (w && typeof w.p === "number") ? w.p : null;
    },

    anderer(rolle) {
        return rolle === "a" ? "b" : "a";
    },

    rolle(d, uid) {
        if (!d || !uid) {
            return null;
        }
        return d.kopf.a === uid ? "a" : (d.kopf.b === uid ? "b" : null);
    },

    angenommen(d) {
        return !!d && (d.teil.b.st === "an" || d.teil.b.st === "auf");
    },

    /* 2:0 nach zwei Wörtern (wie ZWEI_NULL der Regel): "a" | "b" | null. */
    zweiNull(d) {
        const a0 = DUELL._p(d, "a", 0);
        const b0 = DUELL._p(d, "b", 0);
        const a1 = DUELL._p(d, "a", 1);
        const b1 = DUELL._p(d, "b", 1);
        if (a1 === null || b1 === null || a0 === null || b0 === null) {
            return null;
        }
        if (a0 < b0 && a1 < b1) {
            return "a";
        }
        if (b0 < a0 && b1 < a1) {
            return "b";
        }
        return null;
    },

    /* Abgelaufen: 5 Tage ab dem Anlegen. */
    abgelaufen(d, jetzt) {
        return !!d && typeof jetzt === "number" && d.kopf.t + DUELL.FRIST_DUELL_MS < jetzt;
    },

    annahmeVorbei(d, jetzt) {
        return !!d && typeof jetzt === "number" && d.kopf.t + DUELL.FRIST_ANNAHME_MS < jetzt;
    },

    /*
     * Der Stand aus beiden Teilen:
     *   woerter  je Wort { nr, a, b, holt: "a" | "b" | "beide" | null }
     *   a, b     Punkte
     *   ende     entschieden (2:0, drei Wörter, Aufgabe) oder Frist (nur
     *            angenommen); grund "zweiNull" | "drei" | "aufgabe" | "frist" | ""
     *   sieger   "a" | "b" | "gleich" | null (läuft noch)
     *   aufgegeben  wer aufgab, sonst null
     *   ohneWertung  Aufgabe gegen einen, der noch kein Wort begonnen hat —
     *            zählt nicht als Niederlage (Konzept 10.2)
     */
    stand(d, jetzt) {
        const aus = { woerter: [], a: 0, b: 0, ende: false, grund: "", sieger: null, aufgegeben: null, ohneWertung: false };
        if (!d) {
            return aus;
        }
        const zweiNull = DUELL.zweiNull(d);
        const aufgegeben = d.teil.a.st === "auf" ? "a" : (d.teil.b.st === "auf" ? "b" : null);
        const drei = DUELL._p(d, "a", 2) !== null && DUELL._p(d, "b", 2) !== null;
        const frist = DUELL.angenommen(d) && DUELL.abgelaufen(d, jetzt);
        const entschieden = !!aufgegeben || !!zweiNull || drei;
        for (let nr = 0; nr < DUELL.WOERTER; nr++) {
            const pa = DUELL._p(d, "a", nr);
            const pb = DUELL._p(d, "b", nr);
            let holt = null;
            if (pa !== null && pb !== null) {
                holt = pa < pb ? "a" : (pb < pa ? "b" : "beide");
            } else if (frist && !entschieden && (pa !== null || pb !== null)) {
                /* Frist: ein Wort, das nur einer gespielt hat, zählt für ihn. */
                holt = pa !== null ? "a" : "b";
            }
            if (holt === "a" || holt === "beide") {
                aus.a++;
            }
            if (holt === "b" || holt === "beide") {
                aus.b++;
            }
            aus.woerter.push({ nr: nr, a: pa, b: pb, holt: holt });
        }
        aus.ende = entschieden || frist;
        aus.grund = aufgegeben ? "aufgabe" : (zweiNull ? "zweiNull" : (drei ? "drei" : (frist ? "frist" : "")));
        aus.aufgegeben = aufgegeben;
        if (aufgegeben) {
            const gewinner = DUELL.anderer(aufgegeben);
            aus.sieger = gewinner;
            aus.ohneWertung = !d.teil[gewinner].w.some((w) => w && typeof w.b === "number");
        } else if (aus.ende) {
            aus.sieger = aus.a > aus.b ? "a" : (aus.b > aus.a ? "b" : "gleich");
        }
        return aus;
    },

    /*
     * Das nächste Wort, das `rolle` spielen darf (0–2), oder -1. Ein
     * begonnenes, noch nicht gemeldetes Wort ist das nächste. Wort 2 erst
     * nach dem eigenen Wort 1, Wort 3 erst, wenn beide zwei Wörter haben und
     * es nicht 2:0 steht. B erst nach der Annahme; der Herausforderer darf
     * die ersten zwei Wörter schon vorher spielen.
     */
    naechstesWort(d, rolle, jetzt) {
        if (!d || (rolle !== "a" && rolle !== "b") || DUELL.abgelaufen(d, jetzt)
                || d.teil.a.st === "auf" || d.teil.b.st === "auf" || d.teil.b.st === "ab") {
            return -1;
        }
        if (rolle === "b" && d.teil.b.st !== "an") {
            return -1;
        }
        if (DUELL.zweiNull(d) || (DUELL._p(d, "a", 2) !== null && DUELL._p(d, "b", 2) !== null)) {
            return -1;
        }
        const eigen = d.teil[rolle].w;
        for (let nr = 0; nr < DUELL.WOERTER; nr++) {
            const w = eigen[nr];
            if (w && typeof w.p === "number") {
                continue;
            }
            if (nr < 2) {
                return nr;
            }
            const beide = DUELL._p(d, "a", 1) !== null && DUELL._p(d, "b", 1) !== null;
            return beide ? 2 : -1;
        }
        return -1;
    },

    /*
     * Die Lage eines Duells für `uid`:
     *   kein            kein Duell
     *   wartet-annahme  ich habe herausgefordert, der andere hat noch nicht
     *                   geantwortet (nr: das Wort, das ich schon spielen darf)
     *   einladung       ich bin eingeladen und habe nicht geantwortet
     *   abgelehnt       der andere hat abgelehnt (A räumt auf)
     *   verfallen       48 h ohne Antwort
     *   dran            ich darf Wort `nr` spielen (begonnen: schon aufgedeckt)
     *   wartet          ich warte auf den Gegner
     *   beendet         entschieden oder abgelaufen
     */
    lage(d, uid, jetzt) {
        const rolle = DUELL.rolle(d, uid);
        if (!d || !rolle) {
            return { art: "kein", rolle: null, gegner: "", nr: -1, stand: DUELL.stand(null, jetzt) };
        }
        const aus = {
            art: "", rolle: rolle, gegner: rolle === "a" ? d.kopf.b : d.kopf.a,
            nr: DUELL.naechstesWort(d, rolle, jetzt), stand: DUELL.stand(d, jetzt), begonnen: false
        };
        if (aus.nr >= 0) {
            const w = d.teil[rolle].w[aus.nr];
            aus.begonnen = !!w && typeof w.b === "number";
        }
        const st = d.teil.b.st;
        if (st === "ab") {
            aus.art = "abgelehnt";
        } else if (!st) {
            aus.art = DUELL.annahmeVorbei(d, jetzt) ? "verfallen" : (rolle === "a" ? "wartet-annahme" : "einladung");
            if (aus.art !== "wartet-annahme") {
                aus.nr = -1;
                aus.begonnen = false;
            }
        } else if (aus.stand.ende) {
            aus.art = "beendet";
            aus.nr = -1;
        } else {
            aus.art = aus.nr >= 0 ? "dran" : "wartet";
        }
        return aus;
    },

    /* Hat `rolle` schon ein Wort begonnen (Zurückziehen nur vorher)? */
    wortBegonnen(d, rolle) {
        return !!d && d.teil[rolle].w.some((w) => w && typeof w.b === "number");
    },

    /* Das Wort des Gegners als Geist: { zeilen, zeiten, p } oder null. */
    geist(d, rolle, nr) {
        if (!d || (rolle !== "a" && rolle !== "b")) {
            return null;
        }
        const w = d.teil[DUELL.anderer(rolle)].w[nr];
        if (!w || typeof w.p !== "number") {
            return null;
        }
        return { zeilen: DUELL.musterZeilen(w.m), zeiten: DUELL.zeitenLesen(w.z, w.m, w.p), p: w.p };
    },

    /* Was ein Spieler aus seiner Sicht sieht: „gewonnen" | „verloren" |
       „unentschieden" | „ohne Wertung" | "" (läuft). */
    ergebnisFuer(stand, rolle) {
        if (!stand || !stand.ende || !stand.sieger) {
            return "";
        }
        if (stand.ohneWertung) {
            return "ohne Wertung";
        }
        if (stand.sieger === "gleich") {
            return "unentschieden";
        }
        return stand.sieger === rolle ? "gewonnen" : "verloren";
    },

    /* ---------------------------------------------------------------- *
     * Die Schritte — je EIN Mehrpfad-PATCH relativ zu typoluck-intern/duell
     * (Konzept Abschnitt 2). null löscht.
     * ---------------------------------------------------------------- */

    schrittHerausfordern(id, a, b, n) {
        const aus = {};
        aus["spiele/" + id + "/kopf"] = { a: a, b: b, t: DUELL.SERVERZEIT, n: n, v: DUELL.VERTRAG };
        aus["aktiv/" + a] = id;
        aus["einladung/" + b + "/" + a] = id;
        return aus;
    },

    schrittAnnehmen(id, b, a) {
        const aus = {};
        aus["spiele/" + id + "/teil/b/st"] = "an";
        aus["aktiv/" + b] = id;
        aus["einladung/" + b + "/" + a] = null;
        return aus;
    },

    schrittAblehnen(id, b, a) {
        const aus = {};
        aus["spiele/" + id + "/teil/b/st"] = "ab";
        aus["einladung/" + b + "/" + a] = null;
        return aus;
    },

    /* Zurückziehen (A, solange B nicht angenommen hat), auch Aufräumen nach
       Ablehnung oder Verfall: Duell, Zeiger und Einladung zusammen. */
    schrittZurueckziehen(id, a, b) {
        const aus = {};
        aus["spiele/" + id] = null;
        aus["aktiv/" + a] = null;
        aus["einladung/" + b + "/" + a] = null;
        return aus;
    },

    schrittEinladungLoeschen(an, von) {
        const aus = {};
        aus["einladung/" + an + "/" + von] = null;
        return aus;
    },

    schrittWortBeginnen(id, rolle, nr) {
        const aus = {};
        aus["spiele/" + id + "/teil/" + rolle + "/w/" + nr + "/b"] = DUELL.SERVERZEIT;
        return aus;
    },

    schrittWortMelden(id, rolle, nr, m, z, p) {
        const weg = "spiele/" + id + "/teil/" + rolle + "/w/" + nr + "/";
        const aus = {};
        aus[weg + "m"] = m;
        aus[weg + "z"] = z;
        aus[weg + "p"] = p;
        return aus;
    },

    schrittAufgeben(id, rolle, uid) {
        const aus = {};
        aus["spiele/" + id + "/teil/" + rolle + "/st"] = "auf";
        aus["aktiv/" + uid] = null;
        return aus;
    },

    /* Abschluss: erst Duell + eigener Zeiger (geht, wenn der andere es
       schon gesehen hat, oder nach der Frist) … */
    schrittAbschluss(id, uid) {
        const aus = {};
        aus["spiele/" + id] = null;
        aus["aktiv/" + uid] = null;
        return aus;
    },

    /* … sonst nur der eigene Zeiger. */
    schrittZeigerLoesen(uid) {
        const aus = {};
        aus["aktiv/" + uid] = null;
        return aus;
    }
};

if (typeof module !== "undefined" && module.exports) {
    module.exports = DUELL;
}
