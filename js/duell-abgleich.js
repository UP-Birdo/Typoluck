/*
 * duell-abgleich.js — die Speicher-Schicht des Duells (seit 0.34.0).
 *
 * EINE Schnittstelle, zwei Rückwände (beide mit `teilLaden(pfad)` und
 * `teilSchreiben({ pfad: wert })`, null löscht, alles oder nichts):
 *   (a) die echte Datenbank: `SpeicherGemeinsam` auf `typoluck-intern/duell`
 *       — gebaut in js\app.js NUR, wenn KONFIG.REGEL_14_EINGESPIELT true ist;
 *   (b) `DuellAttrappe`: derselbe Zweig im Gerätespeicher, nur für die
 *       Werkstatt (`?werkstatt&duell`, mit einem gespielten Gegner) und die
 *       Tests. Sie prüft keine Regel — sie ist zum Ansehen da.
 * Ohne Rückwand (Schalter aus) tut hier jede Funktion nichts und kein Pfad
 * wird berührt (`zaehler` zählt jedes Lesen und Schreiben).
 *
 * SCHMAL LESEN (Konzept Abschnitt 5): nie eine Liste. Gelesen wird
 * `aktiv/<ich>`, `einladung/<ich>`, das eine Duell `spiele/<id>` oder ein
 * Blatt davon — beim Zeigen der Start-Art und beim Zurückkehren in die App,
 * beim Wort-Beginn und -Ende das Wort des Gegners. Während des Spielens kein
 * Takt; beim Warten (Karte sichtbar) alle 30 s zwei Blätter (`nachsehen`).
 * `geaendertAm` wird nie angefasst.
 *
 * 401 BEIM SCHREIBEN heisst „die Regel lässt es nicht zu" (Frist, der
 * Gegner hat aufgegeben, das Duell ist weg): verwerfen und die Lage neu
 * lesen — nie blind wiederholen. Ein Netzfehler lässt ein Ergebnis in der
 * Warteliste des Geräts (`typoluck.duell-warte`), es geht beim nächsten
 * Lesen hinaus.
 *
 * NUR AUF DEM GERÄT: die laufenden Runden mit den eigenen Buchstaben
 * (`typoluck.duell-runde`), die Warteliste, die letzten zehn beendeten
 * Duelle (`typoluck.duell-beendet`, dort wird das Löschen eines liegen
 * gebliebenen Duells einmal je Sitzung nachgeholt).
 */

/* ------------------------------------------------------------------ *
 * Rückwand (b): die Attrappe im Gerätespeicher
 * ------------------------------------------------------------------ */

class DuellAttrappe {

    constructor(schluessel, uhr) {
        this.art = "attrappe";
        this.schluessel = schluessel;
        this.uhr = uhr || (() => Date.now());
        /* Wird vor jedem Lesen gerufen (die Werkstatt lässt so den Gegner
           ziehen): (baum, jetzt) → baum. */
        this.vorDemLesen = null;
    }

    baum() {
        try {
            const text = window.localStorage.getItem(this.schluessel);
            const baum = text ? JSON.parse(text) : null;
            return (baum && typeof baum === "object") ? baum : {};
        } catch (fehler) {
            return {};
        }
    }

    baumSetzen(baum) {
        window.localStorage.setItem(this.schluessel, JSON.stringify(baum || {}));
    }

    static teile(pfad) {
        return String(pfad || "").split("/").filter((t) => t !== "");
    }

    /* `{".sv": "timestamp"}` wird zur Uhrzeit (wie beim Server). */
    static serverzeit(wert, jetzt) {
        if (wert && typeof wert === "object") {
            if (wert[".sv"] === "timestamp") {
                return jetzt;
            }
            const aus = Array.isArray(wert) ? [] : {};
            for (const k of Object.keys(wert)) {
                aus[k] = DuellAttrappe.serverzeit(wert[k], jetzt);
            }
            return aus;
        }
        return wert;
    }

    /* Setzt (null löscht) und räumt leere Knoten weg, wie Firebase. */
    static setzen(baum, teile, wert) {
        const kette = [baum];
        let knoten = baum;
        for (let i = 0; i < teile.length - 1; i++) {
            if (!knoten[teile[i]] || typeof knoten[teile[i]] !== "object") {
                knoten[teile[i]] = {};
            }
            knoten = knoten[teile[i]];
            kette.push(knoten);
        }
        const letzter = teile[teile.length - 1];
        if (wert === null || wert === undefined) {
            delete knoten[letzter];
        } else {
            knoten[letzter] = JSON.parse(JSON.stringify(wert));
        }
        for (let i = kette.length - 1; i >= 1; i--) {
            if (Object.keys(kette[i]).length === 0) {
                delete kette[i - 1][teile[i - 1]];
            }
        }
    }

    async teilLaden(pfad) {
        let baum = this.baum();
        if (typeof this.vorDemLesen === "function") {
            baum = this.vorDemLesen(baum, this.uhr()) || baum;
            this.baumSetzen(baum);
        }
        let knoten = baum;
        for (const teil of DuellAttrappe.teile(pfad)) {
            if (!knoten || typeof knoten !== "object" || !(teil in knoten)) {
                return null;
            }
            knoten = knoten[teil];
        }
        return (knoten === undefined) ? null : JSON.parse(JSON.stringify(knoten));
    }

    async teilSchreiben(aenderungen) {
        const baum = this.baum();
        const jetzt = this.uhr();
        for (const pfad of Object.keys(aenderungen || {})) {
            DuellAttrappe.setzen(baum, DuellAttrappe.teile(pfad), DuellAttrappe.serverzeit(aenderungen[pfad], jetzt));
        }
        this.baumSetzen(baum);
    }
}

/* ------------------------------------------------------------------ *
 * Die Schicht
 * ------------------------------------------------------------------ */

const DUELL_ABGLEICH = {

    PFAD: "typoluck-intern/duell",
    SCHLUESSEL_RUNDE: "typoluck.duell-runde",
    SCHLUESSEL_WARTE: "typoluck.duell-warte",
    SCHLUESSEL_BEENDET: "typoluck.duell-beendet",
    SCHLUESSEL_ATTRAPPE: "typoluck.duell-attrappe",
    BEENDET_MAX: 10,

    /* Warten auf den Gegner: so oft wird nachgesehen (Werkstatt schneller). */
    TAKT_MS: 30000,

    /* Die Runde im Duell: sechs Versuche, kein Tipp, kein Extra-Leben. */
    REGELN: { versuche: 6, ohneTipp: true, ohneLeben: true },

    _rueckwand: null,
    _ich: () => null,
    _uhr: () => Date.now(),
    _freunde: () => [],
    _loesungen: () => [],
    _zufall: null,
    _nachgeholt: false,

    /* Jedes Lesen und Schreiben an der Rückwand (Tests: Schalter aus = 0). */
    zaehler: { lesen: 0, schreiben: 0 },

    /* Die zuletzt gelesene Lage: { aktivId, duell, einladungen: [{ von, id }],
       zeit } oder null (noch nie gelesen). */
    lage: null,
    laedt: false,

    /* Wird nach jeder Änderung der Lage gerufen (die Oberfläche zeichnet). */
    beiAenderung: null,

    /*
     * angaben: { rueckwand, ich() → Konto-Nummer oder null, uhr() → ms,
     *            freunde() → [{ uid, name }], loesungen() → Liste,
     *            zufall() → 20 Zahlen 0–255 }
     */
    einrichten(angaben) {
        const a = angaben || {};
        DUELL_ABGLEICH._rueckwand = a.rueckwand || null;
        DUELL_ABGLEICH._ich = a.ich || (() => null);
        DUELL_ABGLEICH._uhr = a.uhr || (() => Date.now());
        DUELL_ABGLEICH._freunde = a.freunde || (() => []);
        DUELL_ABGLEICH._loesungen = a.loesungen || (() => []);
        DUELL_ABGLEICH._zufall = a.zufall || null;
        DUELL_ABGLEICH._nachgeholt = false;
        DUELL_ABGLEICH.lage = null;
        DUELL_ABGLEICH.zaehler = { lesen: 0, schreiben: 0 };
    },

    /* Darf überhaupt etwas geschehen? Schalter (oder Werkstatt), Rückwand,
       ein echtes Konto. */
    bereit() {
        return DUELL.an() && !!DUELL_ABGLEICH._rueckwand && !!DUELL_ABGLEICH._ich();
    },

    ich() {
        return DUELL_ABGLEICH._ich();
    },

    jetzt() {
        return DUELL_ABGLEICH._uhr();
    },

    async _lesen(pfad) {
        if (!DUELL_ABGLEICH.bereit()) {
            throw new Error("Duell aus");
        }
        DUELL_ABGLEICH.zaehler.lesen++;
        return DUELL_ABGLEICH._rueckwand.teilLaden(pfad);
    },

    async _schreiben(aenderungen) {
        if (!DUELL_ABGLEICH.bereit()) {
            throw new Error("Duell aus");
        }
        DUELL_ABGLEICH.zaehler.schreiben++;
        return DUELL_ABGLEICH._rueckwand.teilSchreiben(aenderungen);
    },

    _abgelehnt(fehler) {
        return !!fehler && fehler.status === 401;
    },

    _gemeldet() {
        if (typeof DUELL_ABGLEICH.beiAenderung === "function") {
            try {
                DUELL_ABGLEICH.beiAenderung();
            } catch (fehler) {
                /* die Oberfläche darf die Schicht nicht stören */
            }
        }
    },

    /* Die Lage aus Sicht von mir (DUELL.lage) — ohne Lesen. */
    sicht() {
        /* Eine Lage gehört der Person, die sie gelesen hat (Abmelden,
           anderes Konto auf demselben Gerät). */
        if (DUELL_ABGLEICH.lage && DUELL_ABGLEICH.lage.wem !== DUELL_ABGLEICH.ich()) {
            DUELL_ABGLEICH.lage = null;
        }
        const lage = DUELL_ABGLEICH.lage;
        return DUELL.lage(lage ? lage.duell : null, DUELL_ABGLEICH.ich(), DUELL_ABGLEICH.jetzt());
    },

    /* ---------------------------------------------------------------- *
     * Lesen
     * ---------------------------------------------------------------- */

    /*
     * Zeiger, Einladungen und (falls da) das eine Duell. Räumt dabei auf:
     * Einladungen von Nicht-Freunden und kaputte werden gelöscht, ein
     * abgelehntes oder verfallenes eigenes Duell wird zurückgezogen, ein
     * Zeiger ins Leere gelöst. Liefert die Lage oder null.
     */
    async lageHolen() {
        if (!DUELL_ABGLEICH.bereit() || DUELL_ABGLEICH.laedt) {
            return DUELL_ABGLEICH.lage;
        }
        DUELL_ABGLEICH.laedt = true;
        try {
            await DUELL_ABGLEICH.warteSenden();
            await DUELL_ABGLEICH._lageLesen();
            await DUELL_ABGLEICH._aufraeumen();
            await DUELL_ABGLEICH._nachholen();
        } catch (fehler) {
            if (DUELL_ABGLEICH.lage) {
                DUELL_ABGLEICH.lage.fehler = true;
            } else {
                DUELL_ABGLEICH.lage = { wem: DUELL_ABGLEICH.ich(), aktivId: null, duell: null, einladungen: [], zeit: 0, fehler: true };
            }
        } finally {
            DUELL_ABGLEICH.laedt = false;
        }
        DUELL_ABGLEICH._gemeldet();
        return DUELL_ABGLEICH.lage;
    },

    async _lageLesen() {
        const ich = DUELL_ABGLEICH.ich();
        const aktiv = await DUELL_ABGLEICH._lesen("aktiv/" + ich);
        const roh = await DUELL_ABGLEICH._lesen("einladung/" + ich);
        let duell = null;
        if (DUELL.kennungOk(aktiv)) {
            duell = DUELL.lesen(await DUELL_ABGLEICH._lesen("spiele/" + aktiv), aktiv);
        }
        const freunde = new Set(DUELL_ABGLEICH._freunde().map((f) => f.uid));
        const einladungen = [];
        for (const von of Object.keys(roh && typeof roh === "object" ? roh : {})) {
            const id = roh[von];
            if (!DUELL.kennungOk(id) || !freunde.has(von)) {
                /* Das Spiel zeigt Einladungen von Nicht-Freunden nicht an und
                   löscht sie (Konzept Abschnitt 2). */
                await DUELL_ABGLEICH._still(DUELL.schrittEinladungLoeschen(ich, von));
                continue;
            }
            einladungen.push({ von: von, id: id });
        }
        DUELL_ABGLEICH.lage = {
            wem: ich,
            aktivId: DUELL.kennungOk(aktiv) ? aktiv : null,
            duell: duell,
            einladungen: einladungen,
            zeit: DUELL_ABGLEICH.jetzt(),
            fehler: false
        };
    },

    /* Schreiben, Absage still hinnehmen (Aufräumen). true = geschrieben. */
    async _still(aenderungen) {
        try {
            await DUELL_ABGLEICH._schreiben(aenderungen);
            return true;
        } catch (fehler) {
            return false;
        }
    },

    async _aufraeumen() {
        const lage = DUELL_ABGLEICH.lage;
        const ich = DUELL_ABGLEICH.ich();
        if (!lage) {
            return;
        }
        /* Ein Zeiger auf ein Duell, das es nicht mehr gibt: lösen. */
        if (lage.aktivId && !lage.duell) {
            if (await DUELL_ABGLEICH._still(DUELL.schrittZeigerLoesen(ich))) {
                lage.aktivId = null;
            }
            return;
        }
        const sicht = DUELL.lage(lage.duell, ich, DUELL_ABGLEICH.jetzt());
        if (lage.duell && sicht.rolle === "a" && (sicht.art === "abgelehnt" || sicht.art === "verfallen")) {
            /* Erst aufräumen, dann ist man frei (Konzept 2b, 2d). */
            if (await DUELL_ABGLEICH._still(DUELL.schrittZurueckziehen(lage.duell.id, ich, lage.duell.kopf.b))) {
                DUELL_ABGLEICH._beendetMerken(lage.duell, false, sicht.art);
                DUELL_ABGLEICH._rundenLoeschen(lage.duell.id);
                lage.duell = null;
                lage.aktivId = null;
            }
        }
    },

    /* (Bau-Plan 3 f) Einmal je Sitzung: liegen gebliebene Duelle löschen. */
    async _nachholen() {
        if (DUELL_ABGLEICH._nachgeholt) {
            return;
        }
        DUELL_ABGLEICH._nachgeholt = true;
        const ich = DUELL_ABGLEICH.ich();
        const liste = DUELL_ABGLEICH._beendetAlle();
        let geaendert = false;
        for (const eintrag of liste) {
            if (eintrag.wem !== ich || !eintrag.offen || eintrag.id === (DUELL_ABGLEICH.lage && DUELL_ABGLEICH.lage.aktivId)) {
                continue;
            }
            await DUELL_ABGLEICH._still(DUELL.schrittAbschluss(eintrag.id, ich));
            eintrag.offen = false;
            geaendert = true;
        }
        if (geaendert) {
            DUELL_ABGLEICH._geraetSchreiben(DUELL_ABGLEICH.SCHLUESSEL_BEENDET, liste);
        }
    },

    /* Ein Blatt des Gegner-Worts holen (≤ 125 Bytes) und in die Lage legen. */
    async geistHolen(nr) {
        const lage = DUELL_ABGLEICH.lage;
        const sicht = DUELL_ABGLEICH.sicht();
        if (!lage || !lage.duell || !sicht.rolle) {
            return null;
        }
        const g = DUELL.anderer(sicht.rolle);
        try {
            const roh = await DUELL_ABGLEICH._lesen("spiele/" + lage.duell.id + "/teil/" + g + "/w/" + nr);
            lage.duell.teil[g].w[nr] = DUELL._wortLesen(roh);
        } catch (fehler) {
            return null;
        }
        return DUELL.geist(lage.duell, sicht.rolle, nr);
    },

    /*
     * Beim Warten (Karte sichtbar): EIN oder zwei Blätter statt der ganzen
     * Lage. Ändert sich etwas, wird die Lage neu gelesen. true = neu gelesen.
     */
    async nachsehen() {
        const lage = DUELL_ABGLEICH.lage;
        const sicht = DUELL_ABGLEICH.sicht();
        if (!DUELL_ABGLEICH.bereit() || DUELL_ABGLEICH.laedt) {
            return false;
        }
        if (!lage || !lage.duell) {
            await DUELL_ABGLEICH.lageHolen();
            return true;
        }
        const id = lage.duell.id;
        try {
            if (sicht.art === "wartet-annahme") {
                if (await DUELL_ABGLEICH._lesen("spiele/" + id + "/teil/b/st") !== null) {
                    await DUELL_ABGLEICH.lageHolen();
                    return true;
                }
                return false;
            }
            if (sicht.art === "wartet") {
                const g = DUELL.anderer(sicht.rolle);
                const nr = lage.duell.teil[g].w.findIndex((w) => !w || typeof w.p !== "number");
                const st = await DUELL_ABGLEICH._lesen("spiele/" + id + "/teil/" + g + "/st");
                const p = nr >= 0 ? await DUELL_ABGLEICH._lesen("spiele/" + id + "/teil/" + g + "/w/" + nr + "/p") : null;
                if (st !== (lage.duell.teil[g].st || null) || p !== null || DUELL.abgelaufen(lage.duell, DUELL_ABGLEICH.jetzt())) {
                    await DUELL_ABGLEICH.lageHolen();
                    return true;
                }
            }
        } catch (fehler) {
            return false;
        }
        return false;
    },

    /* ---------------------------------------------------------------- *
     * Herausfordern, antworten, zurückziehen
     * ---------------------------------------------------------------- */

    _kennungNeu() {
        let zahlen = null;
        if (typeof DUELL_ABGLEICH._zufall === "function") {
            zahlen = DUELL_ABGLEICH._zufall();
        } else if (typeof crypto !== "undefined" && crypto && typeof crypto.getRandomValues === "function") {
            zahlen = Array.from(crypto.getRandomValues(new Uint8Array(20)));
        } else {
            zahlen = Array.from({ length: 20 }, () => Math.floor(Math.random() * 256));
        }
        return DUELL.kennung(zahlen);
    },

    /* Ergebnis jeder Handlung: { ok, grund } — grund "aus" | "eins" | "weg" |
       "aktualisieren" | "verfallen" | "abgelehnt" | "netz" | "gegner". */
    async herausfordern(gegner) {
        if (!DUELL_ABGLEICH.bereit()) {
            return { ok: false, grund: "aus" };
        }
        const ich = DUELL_ABGLEICH.ich();
        if (!DUELL_ABGLEICH.lage) {
            await DUELL_ABGLEICH.lageHolen();
        }
        if (DUELL_ABGLEICH.lage && DUELL_ABGLEICH.lage.aktivId) {
            return { ok: false, grund: "eins" };
        }
        if (!gegner || gegner === ich || !DUELL_ABGLEICH._freunde().some((f) => f.uid === gegner)) {
            return { ok: false, grund: "gegner" };
        }
        const id = DUELL_ABGLEICH._kennungNeu();
        const ergebnis = await DUELL_ABGLEICH._handeln(
            DUELL.schrittHerausfordern(id, ich, gegner, DUELL_ABGLEICH._loesungen().length));
        await DUELL_ABGLEICH.lageHolen();
        return ergebnis;
    },

    async _handeln(aenderungen) {
        try {
            await DUELL_ABGLEICH._schreiben(aenderungen);
            return { ok: true, grund: "" };
        } catch (fehler) {
            return { ok: false, grund: DUELL_ABGLEICH._abgelehnt(fehler) ? "abgelehnt" : "netz" };
        }
    },

    _einladung(von) {
        const lage = DUELL_ABGLEICH.lage;
        return (lage && lage.einladungen.find((e) => e.von === von)) || null;
    },

    async annehmen(von) {
        const ich = DUELL_ABGLEICH.ich();
        const e = DUELL_ABGLEICH._einladung(von);
        if (!DUELL_ABGLEICH.bereit() || !e) {
            return { ok: false, grund: "weg" };
        }
        if (DUELL_ABGLEICH.lage.aktivId) {
            return { ok: false, grund: "eins" };
        }
        let d = null;
        try {
            d = DUELL.lesen(await DUELL_ABGLEICH._lesen("spiele/" + e.id), e.id);
        } catch (fehler) {
            return { ok: false, grund: "netz" };
        }
        let grund = "";
        if (!d || d.kopf.a !== von || d.kopf.b !== ich || d.teil.b.st) {
            grund = "weg";
        } else if (d.kopf.v !== DUELL.VERTRAG || DUELL_ABGLEICH._loesungen().length < d.kopf.n) {
            /* Bitte Typoluck aktualisieren — die Einladung bleibt liegen. */
            return { ok: false, grund: "aktualisieren" };
        } else if (DUELL.annahmeVorbei(d, DUELL_ABGLEICH.jetzt())) {
            grund = "verfallen";
        }
        if (grund) {
            await DUELL_ABGLEICH._still(DUELL.schrittEinladungLoeschen(ich, von));
            await DUELL_ABGLEICH.lageHolen();
            return { ok: false, grund: grund };
        }
        const ergebnis = await DUELL_ABGLEICH._handeln(DUELL.schrittAnnehmen(e.id, ich, von));
        await DUELL_ABGLEICH.lageHolen();
        return ergebnis;
    },

    async ablehnen(von) {
        const ich = DUELL_ABGLEICH.ich();
        const e = DUELL_ABGLEICH._einladung(von);
        if (!DUELL_ABGLEICH.bereit() || !e) {
            return { ok: false, grund: "weg" };
        }
        let ergebnis = await DUELL_ABGLEICH._handeln(DUELL.schrittAblehnen(e.id, ich, von));
        if (!ergebnis.ok && ergebnis.grund === "abgelehnt") {
            /* Das Duell ist schon weg (zurückgezogen, verfallen): nur die
               Einladung löschen. */
            ergebnis = await DUELL_ABGLEICH._handeln(DUELL.schrittEinladungLoeschen(ich, von));
        }
        await DUELL_ABGLEICH.lageHolen();
        return ergebnis;
    },

    /* Nur der Herausforderer, nur vor der Annahme und solange er kein Wort
       begonnen hat (Konzept Abschnitt 3: sonst liesse sich das erste Wort
       „neu würfeln"). */
    zurueckziehenMoeglich() {
        const lage = DUELL_ABGLEICH.lage;
        const sicht = DUELL_ABGLEICH.sicht();
        return !!lage && !!lage.duell && sicht.art === "wartet-annahme" && !DUELL.wortBegonnen(lage.duell, "a");
    },

    async zurueckziehen() {
        if (!DUELL_ABGLEICH.zurueckziehenMoeglich()) {
            return { ok: false, grund: "weg" };
        }
        const d = DUELL_ABGLEICH.lage.duell;
        const ergebnis = await DUELL_ABGLEICH._handeln(
            DUELL.schrittZurueckziehen(d.id, DUELL_ABGLEICH.ich(), d.kopf.b));
        if (ergebnis.ok) {
            DUELL_ABGLEICH._rundenLoeschen(d.id);
        }
        await DUELL_ABGLEICH.lageHolen();
        return ergebnis;
    },

    /* Aufgeben: nur im angenommenen, laufenden Duell. */
    aufgebenMoeglich() {
        const sicht = DUELL_ABGLEICH.sicht();
        const lage = DUELL_ABGLEICH.lage;
        return !!lage && !!lage.duell && DUELL.angenommen(lage.duell) && (sicht.art === "dran" || sicht.art === "wartet");
    },

    async aufgeben() {
        if (!DUELL_ABGLEICH.aufgebenMoeglich()) {
            return { ok: false, grund: "weg" };
        }
        const lage = DUELL_ABGLEICH.lage;
        const sicht = DUELL_ABGLEICH.sicht();
        const ich = DUELL_ABGLEICH.ich();
        const ergebnis = await DUELL_ABGLEICH._handeln(DUELL.schrittAufgeben(lage.duell.id, sicht.rolle, ich));
        if (!ergebnis.ok) {
            await DUELL_ABGLEICH.lageHolen();
            return ergebnis;
        }
        /* Der eigene Zeiger ist im selben Schritt gelöst: Das Ergebnis steht
           nur noch hier; das Löschen des Duells holt der Gegner (oder der
           nächste Start) nach. */
        lage.duell.teil[sicht.rolle].st = "auf";
        lage.aktivId = null;
        DUELL_ABGLEICH._beendetMerken(lage.duell, true);
        DUELL_ABGLEICH._gemeldet();
        return ergebnis;
    },

    /*
     * Abschluss (Ergebnis gesehen): erst Duell + eigener Zeiger löschen (geht,
     * wenn der Gegner es schon gesehen hat, oder nach der Frist), bei 401
     * nur den Zeiger. Danach ist man frei.
     */
    async abschliessen() {
        const lage = DUELL_ABGLEICH.lage;
        const ich = DUELL_ABGLEICH.ich();
        if (!DUELL_ABGLEICH.bereit() || !lage || !lage.duell) {
            return { ok: false, grund: "weg" };
        }
        const d = lage.duell;
        let offen = false;
        let ergebnis = await DUELL_ABGLEICH._handeln(DUELL.schrittAbschluss(d.id, ich));
        if (!ergebnis.ok && ergebnis.grund === "abgelehnt") {
            offen = true;
            ergebnis = lage.aktivId ? await DUELL_ABGLEICH._handeln(DUELL.schrittZeigerLoesen(ich))
                : { ok: true, grund: "" };
        }
        if (!ergebnis.ok) {
            return ergebnis;
        }
        DUELL_ABGLEICH._beendetMerken(d, offen);
        DUELL_ABGLEICH._rundenLoeschen(d.id);
        lage.duell = null;
        lage.aktivId = null;
        await DUELL_ABGLEICH.lageHolen();
        return ergebnis;
    },

    /* ---------------------------------------------------------------- *
     * Ein Wort spielen (die Runde liegt nur auf dem Gerät)
     * ---------------------------------------------------------------- */

    _geraetLesen(schluessel, ersatz) {
        try {
            const text = window.localStorage.getItem(schluessel);
            const wert = text ? JSON.parse(text) : null;
            return wert === null || wert === undefined ? ersatz : wert;
        } catch (fehler) {
            return ersatz;
        }
    },

    _geraetSchreiben(schluessel, wert) {
        try {
            window.localStorage.setItem(schluessel, JSON.stringify(wert));
            return true;
        } catch (fehler) {
            return false;
        }
    },

    /* { wem, id, runden: { "<nr>": { nr, ab, zeiten, runde, gemeldet } } } */
    _runden(id) {
        const alle = DUELL_ABGLEICH._geraetLesen(DUELL_ABGLEICH.SCHLUESSEL_RUNDE, null);
        if (!alle || alle.wem !== DUELL_ABGLEICH.ich() || alle.id !== id || !alle.runden) {
            return { wem: DUELL_ABGLEICH.ich(), id: id, runden: {} };
        }
        return alle;
    },

    _rundenLoeschen(id) {
        const alle = DUELL_ABGLEICH._geraetLesen(DUELL_ABGLEICH.SCHLUESSEL_RUNDE, null);
        if (alle && alle.id === id) {
            try {
                window.localStorage.removeItem(DUELL_ABGLEICH.SCHLUESSEL_RUNDE);
            } catch (fehler) {
                /* egal */
            }
        }
    },

    /* Die Runde eines Worts auf diesem Gerät (oder null). */
    rundeVon(nr) {
        const lage = DUELL_ABGLEICH.lage;
        if (!lage || !lage.duell) {
            return null;
        }
        const e = DUELL_ABGLEICH._runden(lage.duell.id).runden[String(nr)];
        if (!e || typeof WORDLE === "undefined") {
            return null;
        }
        const runde = WORDLE.normalisieren(e.runde);
        return runde ? { nr: nr, ab: e.ab, zeiten: Array.isArray(e.zeiten) ? e.zeiten : [], runde: runde, gemeldet: !!e.gemeldet } : null;
    },

    _rundeMerken(eintrag) {
        const lage = DUELL_ABGLEICH.lage;
        const alle = DUELL_ABGLEICH._runden(lage.duell.id);
        alle.runden[String(eintrag.nr)] = eintrag;
        return DUELL_ABGLEICH._geraetSchreiben(DUELL_ABGLEICH.SCHLUESSEL_RUNDE, alle);
    },

    /*
     * Wort beginnen: ERST die Startmarke schreiben (Serverzeit), DANN das
     * Wort aufdecken. Eine schon angefangene Runde auf diesem Gerät geht
     * weiter. Ist das Wort woanders begonnen (die Marke steht, das Gerät
     * kennt die Runde nicht), gibt es kein zweites Aufdecken: grund
     * "woanders" (die Oberfläche bietet „als nicht gelöst melden").
     * Liefert { ok, grund, eintrag, geist }.
     */
    async wortBeginnen() {
        const lage = DUELL_ABGLEICH.lage;
        const sicht = DUELL_ABGLEICH.sicht();
        if (!DUELL_ABGLEICH.bereit() || !lage || !lage.duell || sicht.nr < 0) {
            return { ok: false, grund: "weg" };
        }
        const d = lage.duell;
        const nr = sicht.nr;
        const da = DUELL_ABGLEICH.rundeVon(nr);
        if (da) {
            return { ok: true, grund: "", eintrag: da, geist: DUELL.geist(d, sicht.rolle, nr) };
        }
        const wort = DUELL.wort(d.id, d.kopf.n, nr, DUELL_ABGLEICH._loesungen());
        if (!wort || d.kopf.v !== DUELL.VERTRAG) {
            return { ok: false, grund: "aktualisieren" };
        }
        if (sicht.begonnen) {
            return { ok: false, grund: "woanders" };
        }
        const ergebnis = await DUELL_ABGLEICH._handeln(DUELL.schrittWortBeginnen(d.id, sicht.rolle, nr));
        if (!ergebnis.ok) {
            if (ergebnis.grund === "abgelehnt") {
                await DUELL_ABGLEICH.lageHolen();
            }
            return ergebnis;
        }
        const ab = DUELL_ABGLEICH.jetzt();
        const eintrag = {
            nr: nr, ab: ab, zeiten: [], gemeldet: false,
            runde: WORDLE.neueRunde({ modus: "uebung", loesung: wort, zeitpunkt: ab, regeln: DUELL_ABGLEICH.REGELN })
        };
        d.teil[sicht.rolle].w[nr] = Object.assign({}, d.teil[sicht.rolle].w[nr] || {}, { b: ab });
        DUELL_ABGLEICH._rundeMerken(eintrag);
        const geist = await DUELL_ABGLEICH.geistHolen(nr);
        return { ok: true, grund: "", eintrag: DUELL_ABGLEICH.rundeVon(nr), geist: geist };
    },

    /*
     * Einen Versuch abgeben: { fehler, eintrag, fertig } — `fehler` wie
     * WORDLE.raten. Ist die Runde zu Ende, wird das Ergebnis gemeldet.
     */
    async raten(nr, wort) {
        const eintrag = DUELL_ABGLEICH.rundeVon(nr);
        if (!eintrag || eintrag.runde.zustand !== "laeuft") {
            return { fehler: "vorbei", eintrag: eintrag, fertig: !!eintrag };
        }
        const jetzt = DUELL_ABGLEICH.jetzt();
        const antwort = WORDLE.raten(eintrag.runde, wort, jetzt);
        if (antwort.fehler) {
            return { fehler: antwort.fehler, eintrag: eintrag, fertig: false };
        }
        eintrag.runde = antwort.runde;
        eintrag.zeiten = eintrag.zeiten.concat([Math.max(0, jetzt - eintrag.ab)]);
        DUELL_ABGLEICH._rundeMerken(eintrag);
        const fertig = eintrag.runde.zustand !== "laeuft";
        if (fertig) {
            await DUELL_ABGLEICH._melden(eintrag);
        }
        return { fehler: "", eintrag: DUELL_ABGLEICH.rundeVon(nr), fertig: fertig };
    },

    /* Das Wort abbrechen (oder woanders begonnen): nicht gelöst melden. */
    async wortAbbrechen(nr) {
        const lage = DUELL_ABGLEICH.lage;
        if (!lage || !lage.duell) {
            return { ok: false, grund: "weg" };
        }
        let eintrag = DUELL_ABGLEICH.rundeVon(nr);
        if (!eintrag) {
            eintrag = { nr: nr, ab: DUELL_ABGLEICH.jetzt(), zeiten: [], gemeldet: false, runde: null };
        } else if (eintrag.runde.zustand === "laeuft") {
            eintrag.runde = Object.assign({}, eintrag.runde, { zustand: "verloren" });
        }
        await DUELL_ABGLEICH._melden(eintrag);
        return { ok: true, grund: "" };
    },

    /* m, z, p aus der Runde; erst in die Warteliste, dann senden. */
    async _melden(eintrag) {
        const lage = DUELL_ABGLEICH.lage;
        const sicht = DUELL_ABGLEICH.sicht();
        if (!lage || !lage.duell || !sicht.rolle) {
            return;
        }
        const runde = eintrag.runde;
        const geloest = !!runde && runde.zustand === "gewonnen";
        const zeilen = runde ? WORDLE.muster(runde) : [];
        const zeiten = eintrag.zeiten.slice(0, zeilen.length);
        const dauer = zeiten.length ? zeiten[zeiten.length - 1] : 0;
        const m = DUELL.musterText(zeilen);
        const z = DUELL.zeitenText(zeiten);
        const p = DUELL.wertung(geloest, zeilen.length, dauer);
        const warte = DUELL_ABGLEICH._geraetLesen(DUELL_ABGLEICH.SCHLUESSEL_WARTE, []);
        const liste = (Array.isArray(warte) ? warte : []).filter((w) => !(w.id === lage.duell.id && w.nr === eintrag.nr));
        liste.push({ wem: DUELL_ABGLEICH.ich(), id: lage.duell.id, rolle: sicht.rolle, nr: eintrag.nr, m: m, z: z, p: p });
        DUELL_ABGLEICH._geraetSchreiben(DUELL_ABGLEICH.SCHLUESSEL_WARTE, liste);
        if (runde) {
            eintrag.gemeldet = true;
            DUELL_ABGLEICH._rundeMerken(eintrag);
        }
        await DUELL_ABGLEICH.warteSenden();
        await DUELL_ABGLEICH.geistHolen(eintrag.nr);
        DUELL_ABGLEICH._gemeldet();
    },

    /* Die Warteliste senden. Netzfehler: bleibt liegen. 401 (Frist, Gegner
       hat aufgegeben): verwerfen, die Lage wird neu gelesen. */
    async warteSenden() {
        if (!DUELL_ABGLEICH.bereit()) {
            return 0;
        }
        const ich = DUELL_ABGLEICH.ich();
        const liste = DUELL_ABGLEICH._geraetLesen(DUELL_ABGLEICH.SCHLUESSEL_WARTE, []);
        if (!Array.isArray(liste) || !liste.length) {
            return 0;
        }
        const bleibt = [];
        let gesendet = 0;
        let netz = false;
        for (const w of liste) {
            if (w.wem !== ich || netz) {
                bleibt.push(w);
                continue;
            }
            try {
                await DUELL_ABGLEICH._schreiben(DUELL.schrittWortMelden(w.id, w.rolle, w.nr, w.m, w.z, w.p));
                gesendet++;
                const lage = DUELL_ABGLEICH.lage;
                if (lage && lage.duell && lage.duell.id === w.id) {
                    lage.duell.teil[w.rolle].w[w.nr] = Object.assign({}, lage.duell.teil[w.rolle].w[w.nr] || {},
                        { m: w.m, z: w.z, p: w.p });
                }
            } catch (fehler) {
                if (DUELL_ABGLEICH._abgelehnt(fehler)) {
                    continue;
                }
                netz = true;
                bleibt.push(w);
            }
        }
        DUELL_ABGLEICH._geraetSchreiben(DUELL_ABGLEICH.SCHLUESSEL_WARTE, bleibt);
        return gesendet;
    },

    wartet() {
        const liste = DUELL_ABGLEICH._geraetLesen(DUELL_ABGLEICH.SCHLUESSEL_WARTE, []);
        return (Array.isArray(liste) ? liste : []).filter((w) => w.wem === DUELL_ABGLEICH.ich());
    },

    /* ---------------------------------------------------------------- *
     * Die letzten zehn beendeten Duelle (nur Gerät)
     * ---------------------------------------------------------------- */

    _beendetAlle() {
        const liste = DUELL_ABGLEICH._geraetLesen(DUELL_ABGLEICH.SCHLUESSEL_BEENDET, []);
        return Array.isArray(liste) ? liste : [];
    },

    _beendetMerken(d, offen, art) {
        const ich = DUELL_ABGLEICH.ich();
        const rolle = DUELL.rolle(d, ich);
        if (!rolle) {
            return;
        }
        const stand = DUELL.stand(d, DUELL_ABGLEICH.jetzt());
        const eintrag = {
            wem: ich, id: d.id, gegner: rolle === "a" ? d.kopf.b : d.kopf.a,
            ich: stand[rolle], er: stand[DUELL.anderer(rolle)],
            ergebnis: art === "abgelehnt" ? "abgelehnt" : (art === "verfallen" ? "verfallen" : DUELL.ergebnisFuer(stand, rolle)),
            datum: DUELL_ABGLEICH.jetzt(), offen: !!offen
        };
        const liste = [eintrag].concat(DUELL_ABGLEICH._beendetAlle().filter((e) => !(e.id === d.id && e.wem === ich)));
        DUELL_ABGLEICH._geraetSchreiben(DUELL_ABGLEICH.SCHLUESSEL_BEENDET, liste.slice(0, DUELL_ABGLEICH.BEENDET_MAX));
    },

    beendet() {
        const ich = DUELL_ABGLEICH.ich();
        return DUELL_ABGLEICH._beendetAlle().filter((e) => e.wem === ich);
    },

    /* ---------------------------------------------------------------- *
     * Die Werkstatt: ein gespielter Gegner in der Attrappe
     * ---------------------------------------------------------------- */

    /* Wie der Gegner jedes Wort spielt (nur Farben und Zeiten). */
    GEGNER_ZUEGE: [
        { zeilen: ["FFVFF", "RFVFV", "RRFRR", "RRRRR"], zeiten: [9000, 21000, 34000, 47000] },
        { zeilen: ["VFFRF", "RRRFF", "RRRRR"], zeiten: [11000, 26000, 38000] },
        { zeilen: ["FFFFF", "FVFFF", "RVFFF", "RRVFF", "RRRFV", "RRRFR"], zeiten: [8000, 19000, 33000, 45000, 61000, 80000] }
    ],

    /* Der Zug eines Gegner-Worts { b, m, z, p } (b liegt vor `jetzt`). */
    gegnerWort(nr, jetzt) {
        const zug = DUELL_ABGLEICH.GEGNER_ZUEGE[nr];
        const geloest = zug.zeilen[zug.zeilen.length - 1] === "RRRRR";
        const dauer = zug.zeiten[zug.zeiten.length - 1];
        return {
            b: jetzt - dauer - 1000, m: DUELL.musterText(zug.zeilen), z: DUELL.zeitenText(zug.zeiten),
            p: DUELL.wertung(geloest, zug.zeilen.length, dauer)
        };
    },

    /*
     * Der gespielte Gegner (Werkstatt): Jeder in `gegner` nimmt eine
     * Einladung von `ich` nach `annehmenNachMs` an, spielt jedes Wort, das er
     * darf, sofort (so ist sein Geist beim eigenen Wort schon da), sieht ein
     * Ergebnis sofort (löst seinen Zeiger) und löscht das Duell, sobald `ich`
     * es auch gesehen hat. Liefert die Funktion für `vorDemLesen`.
     */
    werkstattGegner(ich, gegner, annehmenNachMs) {
        const warten = typeof annehmenNachMs === "number" ? annehmenNachMs : 3000;
        return (baum, jetzt) => {
            const spiele = (baum && baum.spiele) || {};
            for (const id of Object.keys(spiele)) {
                const roh = spiele[id];
                const d = DUELL.lesen(roh, id);
                if (!d) {
                    continue;
                }
                const bot = d.kopf.a === ich ? d.kopf.b : (d.kopf.b === ich ? d.kopf.a : null);
                if (!bot || gegner.indexOf(bot) === -1) {
                    continue;
                }
                const rolle = DUELL.rolle(d, bot);
                if (rolle === "b" && !d.teil.b.st && jetzt - d.kopf.t >= warten && !DUELL.annahmeVorbei(d, jetzt)) {
                    DuellAttrappe.setzen(baum, ["spiele", id, "teil", "b", "st"], "an");
                    DuellAttrappe.setzen(baum, ["aktiv", bot], id);
                    DuellAttrappe.setzen(baum, ["einladung", bot, ich], null);
                }
                let jetztD = DUELL.lesen(baum.spiele[id], id);
                let nr = DUELL.naechstesWort(jetztD, rolle, jetzt);
                while (nr >= 0) {
                    DuellAttrappe.setzen(baum, ["spiele", id, "teil", rolle, "w", String(nr)], DUELL_ABGLEICH.gegnerWort(nr, jetzt));
                    jetztD = DUELL.lesen(baum.spiele[id], id);
                    nr = DUELL.naechstesWort(jetztD, rolle, jetzt);
                }
                if (DUELL.stand(jetztD, jetzt).ende) {
                    if (baum.aktiv && baum.aktiv[bot] === id) {
                        DuellAttrappe.setzen(baum, ["aktiv", bot], null);
                    }
                    if (!baum.aktiv || baum.aktiv[ich] !== id) {
                        DuellAttrappe.setzen(baum, ["spiele", id], null);
                    }
                }
            }
            return baum;
        };
    },

    /* Eine Einladung von `von` an `an`, wie der Herausforderer sie anlegt —
       er hat seine ersten zwei Wörter schon gespielt (Werkstatt). */
    werkstattEinladung(attrappe, von, an, id, n) {
        const jetzt = attrappe.uhr();
        const baum = attrappe.baum();
        DuellAttrappe.setzen(baum, ["spiele", id, "kopf"], { a: von, b: an, t: jetzt - 60000, n: n, v: DUELL.VERTRAG });
        DuellAttrappe.setzen(baum, ["spiele", id, "teil", "a", "w", "0"], DUELL_ABGLEICH.gegnerWort(0, jetzt - 50000));
        DuellAttrappe.setzen(baum, ["spiele", id, "teil", "a", "w", "1"], DUELL_ABGLEICH.gegnerWort(1, jetzt - 20000));
        DuellAttrappe.setzen(baum, ["aktiv", von], id);
        DuellAttrappe.setzen(baum, ["einladung", an, von], id);
        attrappe.baumSetzen(baum);
    }
};

if (typeof module !== "undefined" && module.exports) {
    module.exports = { DUELL_ABGLEICH, DuellAttrappe };
}
