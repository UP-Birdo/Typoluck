/*
 * besitz.js — was der Spieler im Shop GEKAUFT hat: halten, abgleichen,
 * kaufen (seit 0.31.0, UPCrew-Runde 8 „Shop mit Besitz").
 *
 * GERECHNET wird im gemeinsamen Baustein js\upcrew-besitz.js (Menge lesen,
 * vereinigen, Preis, Kauf, Merker „Kauf offen") — hier steht nur, WO Typoluck
 * den Besitz ablegt und WANN es ihn abgleicht.
 *
 * AUF DEM GERÄT — `upcrew.besitz`, geteilt mit allen UPCrew-Spielen im selben
 * Browser, JE PERSON ein Eintrag:
 *     { "<spieler-id oder gast>": { schrift: ["…"], kachelset: ["blei"] } }
 * Die Kennung ist GENAU die, unter der der Fortschritt derselben Person in
 * `upcrew.fortschritt` liegt (`APP.fortschrittId`, kommt als `idGeber`) — so
 * sehen zwei Personen auf einem Gerät je nur ihren Besitz, und nach dem
 * Abmelden gilt der Eintrag „gast". Fremde Einträge bleiben beim Schreiben
 * stehen. Gäste haben nur das Gerät.
 *
 * AM KONTO — Regel §13 (live), je Art EIN Text:
 *     spieler/konten/<uid>/besitz/<art> = "wert_wert"   (höchstens 2000
 *     Zeichen aus A–Z a–z 0–9 _ -; die Art: Kleinbuchstabe, dann 1–23
 *     Kleinbuchstaben oder Ziffern)
 * Die Form liefert `UPCREW_BESITZ.alsText`; tests\test-besitz.js prüft sie
 * gegen den echten Regeltext. Geschrieben werden nur Arten, deren Text sich
 * geändert hat, mit `geaendertAm` im selben Schritt (Regel 3 der Konten,
 * Kopf von js\spieler.js).
 *
 * KÄUFE WACHSEN NUR: Gerät und Konto werden VEREINIGT, nie überschreibt eine
 * Seite die andere (`abgleichen`: beim Start nach der Anmeldung und bei jeder
 * Rückkehr in den Vordergrund — dort, wo auch der Fortschritt abgeglichen
 * wird; weicht eine Seite ab, wird dorthin zurückgeschrieben).
 *
 * DER KAUF (`kaufen`) — in dieser Reihenfolge, alles in EINEM Zug ohne
 * Warten (Begründung: Kopf von js\upcrew-besitz.js):
 *     0. nur, wenn die Person feststeht und ihr Konto-Besitz in dieser
 *        Sitzung abgeglichen ist (`APP.kaufBereit`, seit 0.33.1) — sonst
 *        wird nichts gebucht
 *     1. rechnen (`UPCREW_BESITZ.kaufen`) — speichert nichts
 *     2. Merker „Kauf offen" aufs Gerät
 *     3. Besitz speichern: Gerät (steht er dort nicht — Speicher voll —,
 *        Abbruch ohne Buchung, seit 0.33.1), dann Konto: `senden` holt den
 *        Konto-Stand frisch und schreibt die Vereinigung (seit 0.33.1; die
 *        Anfrage geht hinaus, die Antwort wird nicht abgewartet)
 *     4. Fortschritt speichern (`buchen` aus js\app.js: der Zähler
 *        `muenzenAusgegeben` im eigenen Zweig wächst um den Preis — derselbe
 *        Weg wie beim Vorrat-Kauf)
 *     5. Merker löschen
 * Bricht die App zwischen 3 und 4 ab, steht der Merker noch da:
 * `offenAufloesen` bucht den Preis beim nächsten Start nach (nie doppelt).
 *
 * DER MERKER — `upcrew.kaufOffen.typoluck`:
 *     { "wem": "<id>", "merker": { app, art, wert, preis, vorher } }
 * Aufgelöst wird nur für die Person von jetzt; der Merker einer anderen
 * Person bleibt liegen. (Ein Schlüssel je Spiel: Kauft vorher eine andere
 * Person, ersetzt ihr Merker den alten.)
 *
 * GAST → KONTO: wie der Fortschritt (js\spielzeit.js `gastZumKonto`) — nach
 * „Spielstand sichern" wandert der Gast-Eintrag in den Eintrag der Person,
 * der Gast-Eintrag verschwindet, das Konto bekommt die Vereinigung. Sonst
 * nirgends (wie der Fortschritt).
 *
 * WER: ans Konto nur echte Konten (`uidGeber` aus js\app.js liefert für
 * Gäste und die Werkstatt null) und nur mit eingespielter Regel §13 (derselbe
 * Schalter wie die Lieblingswörter). Fehler (Netz, Regel) bleiben still.
 */

const BESITZ = {

    SCHLUESSEL: "upcrew.besitz",
    OFFEN_VORSATZ: "upcrew.kaufOffen.",
    FELD: "besitz",

    /* Tests: true/false überstimmt den Schalter der Regel, sonst null. */
    REGEL: null,

    _rueckwand: null,
    _uidGeber: null,
    _idGeber: null,

    /* Was zuletzt am Konto stand ({ art: text }) und für welche uid. */
    _kontoFeld: null,
    _kontoUid: null,

    /* `speicher` = die Rückwand der Konten; `uidGeber` → Firebase-uid oder
       null; `idGeber` → der Eintrag im Gerätespeicher (`APP.fortschrittId`). */
    einrichten(speicher, uidGeber, idGeber) {
        BESITZ._rueckwand = speicher || null;
        BESITZ._uidGeber = (typeof uidGeber === "function") ? uidGeber : null;
        BESITZ._idGeber = (typeof idGeber === "function") ? idGeber : null;
        BESITZ._kontoFeld = null;
        BESITZ._kontoUid = null;
    },

    app() {
        return FORTSCHRITT.APP;
    },

    offenSchluessel() {
        return BESITZ.OFFEN_VORSATZ + BESITZ.app();
    },

    regelDa() {
        if (typeof BESITZ.REGEL === "boolean") {
            return BESITZ.REGEL;
        }
        return typeof SpeicherKonten !== "undefined" && SpeicherKonten.REGEL_GRAU_EINGESPIELT === true;
    },

    _uid() {
        if (!BESITZ._rueckwand || !BESITZ._uidGeber) {
            return null;
        }
        let uid = null;
        try {
            uid = BESITZ._uidGeber();
        } catch (fehler) {
            uid = null;
        }
        return (typeof uid === "string" && uid !== "") ? uid : null;
    },

    _id() {
        let id = null;
        try {
            id = BESITZ._idGeber ? BESITZ._idGeber() : null;
        } catch (fehler) {
            id = null;
        }
        return (typeof id === "string" && id !== "") ? id : null;
    },

    /* ---------------------------------------------------------------- *
     * Das Gerät — je Person ein Eintrag
     * ---------------------------------------------------------------- */

    /* Derselbe Speicher wie der Fortschritt (die Tests setzen dort einen
       Ersatz ein). */
    _speicher() {
        return FORTSCHRITT._speicher();
    },

    _istObjekt(wert) {
        return !!wert && typeof wert === "object" && !Array.isArray(wert);
    },

    /* Alle Einträge des Geräts. Unlesbares = leer, wirft nie. */
    _alle() {
        try {
            const speicher = BESITZ._speicher();
            const roh = speicher ? JSON.parse(speicher.getItem(BESITZ.SCHLUESSEL) || "null") : null;
            return BESITZ._istObjekt(roh) ? roh : {};
        } catch (fehler) {
            return {};
        }
    },

    _alleSchreiben(alle) {
        try {
            const speicher = BESITZ._speicher();
            if (speicher) {
                speicher.setItem(BESITZ.SCHLUESSEL, JSON.stringify(alle));
            }
        } catch (fehler) {
            /* voll oder gesperrt — der Besitz bleibt diesmal aus */
        }
    },

    /* Der Besitz einer Person auf diesem Gerät (eine saubere Menge — nicht
       verändern). Sammlung und Shop fragen je Stück: Solange der Text im
       Speicher derselbe ist, wird nicht noch einmal gelesen und gesäubert. */
    _gemerkt: { roh: null, id: null, menge: null },

    geraet(id) {
        if (!id) {
            return {};
        }
        let roh = null;
        try {
            const speicher = BESITZ._speicher();
            roh = speicher ? speicher.getItem(BESITZ.SCHLUESSEL) : null;
        } catch (fehler) {
            roh = null;
        }
        const g = BESITZ._gemerkt;
        if (g.menge && g.roh === roh && g.id === id) {
            return g.menge;
        }
        const menge = UPCREW_BESITZ.lesen(BESITZ._alle()[id]);
        BESITZ._gemerkt = { roh: roh, id: id, menge: menge };
        return menge;
    },

    /* Eine Menge zum Eintrag der Person dazulegen: frisch gelesen (ein
       anderes Spiel im selben Browser verliert nichts), vereinigt (der
       Eintrag schrumpft nie), fremde Einträge bleiben. Liefert die Menge,
       die danach dasteht. Schreibt nichts ohne Id. */
    geraetDazu(id, menge) {
        if (!id) {
            return UPCREW_BESITZ.lesen(menge);
        }
        const alle = BESITZ._alle();
        const vorher = UPCREW_BESITZ.lesen(alle[id]);
        const danach = UPCREW_BESITZ.zusammenfuehren(vorher, menge);
        if (JSON.stringify(danach) !== JSON.stringify(vorher)) {
            alle[id] = danach;
            BESITZ._alleSchreiben(alle);
        }
        return danach;
    },

    /* Der Besitz der Person von JETZT (angemeldet: ihr Eintrag; Gast und
       abgemeldet: „gast"). */
    menge() {
        return BESITZ.geraet(BESITZ._id());
    },

    /* Der Haken für alles, was „frei" rechnet (Sammlung, Shop). */
    hat(art, wert) {
        return UPCREW_BESITZ.hat(BESITZ.menge(), art, wert);
    },

    /* ---------------------------------------------------------------- *
     * Das Konto
     * ---------------------------------------------------------------- */

    pfad(uid) {
        return "konten/" + uid + "/" + BESITZ.FELD;
    },

    /* Die Mehrpfad-Änderung fürs Konto — rein, damit der Test sie gegen die
       Regel prüfen kann: je Art, deren Text von `kontoFeld` abweicht, ein
       Pfad; dazu die Marke. null, wenn nichts abweicht oder ein Text nicht
       auf die Regel passt (zu lang). */
    aenderungen(uid, menge, kontoFeld, jetzt) {
        const text = UPCREW_BESITZ.alsText(menge);
        if (!text.ok) {
            return null;
        }
        const bisher = BESITZ._istObjekt(kontoFeld) ? kontoFeld : {};
        const aenderungen = {};
        for (const art of Object.keys(text.feld)) {
            if (text.feld[art] !== bisher[art]) {
                aenderungen[BESITZ.pfad(uid) + "/" + art] = text.feld[art];
            }
        }
        if (Object.keys(aenderungen).length === 0) {
            return null;
        }
        aenderungen.geaendertAm = jetzt || Date.now();
        return aenderungen;
    },

    /* Schreibt, was am Konto fehlt. true = das Konto steht danach wie
       `menge` (auch, wenn nichts zu schreiben war). */
    async _kontoSchreiben(uid, menge) {
        const aenderungen = BESITZ.aenderungen(uid, menge, BESITZ._kontoFeld);
        if (!aenderungen) {
            return UPCREW_BESITZ.alsText(menge).ok;
        }
        try {
            await BESITZ._rueckwand.teilSchreiben(aenderungen);
        } catch (fehler) {
            return false;
        }
        if (BESITZ._kontoUid === uid) {
            BESITZ._kontoFeld = UPCREW_BESITZ.alsText(menge).feld;
        }
        return true;
    },

    _kontoMoeglich() {
        return !!BESITZ._uid() && !!BESITZ._id() && BESITZ.regelDa()
            && typeof BESITZ._rueckwand.teilLaden === "function"
            && typeof BESITZ._rueckwand.teilSchreiben === "function";
    },

    /* Für den Kauf (seit 0.33.1, `APP.kaufBereit`): true, wenn es kein
       Konto abzugleichen gibt (Gast, Werkstatt, ohne Regel) oder der Besitz
       des Kontos von JETZT in dieser Sitzung geholt ist. */
    kontoBereit() {
        if (!BESITZ._kontoMoeglich()) {
            return true;
        }
        return BESITZ._kontoUid === BESITZ._uid();
    },

    /* Gerät und Konto vereinigen: holen, zusammenführen, zurückschreiben, wo
       etwas fehlt. Liefert true, wenn auf dem Gerät etwas dazukam (dann neu
       zeichnen). Ohne Konto, ohne Regel, bei Fehler: false. */
    async abgleichen() {
        return (await BESITZ._abgleichenLage()).neu;
    },

    /* Der Abgleich selbst: { ok, neu } — ok = frisch geholt UND das Konto
       steht danach wie die Vereinigung; neu = auf dem Gerät kam etwas dazu.
       Scheitert das Holen, wird NICHT geschrieben (seit 0.33.1, Fund 1:
       nie mit einem alten Stand überschreiben; der nächste Abgleich holt
       es nach). */
    async _abgleichenLage() {
        if (!BESITZ._kontoMoeglich()) {
            return { ok: false, neu: false };
        }
        const uid = BESITZ._uid();
        const id = BESITZ._id();
        let vomKonto = null;
        try {
            vomKonto = await BESITZ._rueckwand.teilLaden(BESITZ.pfad(uid));
        } catch (fehler) {
            return { ok: false, neu: false };
        }
        /* Zweite Prüfung NACH der Antwort: Hat inzwischen jemand anders das
           Gerät (abgemeldet, anderes Konto), gehört die Antwort nicht mehr
           hierher. */
        if (BESITZ._uid() !== uid || BESITZ._id() !== id) {
            return { ok: false, neu: false };
        }
        const feld = {};
        if (BESITZ._istObjekt(vomKonto)) {
            for (const art of Object.keys(vomKonto)) {
                if (typeof vomKonto[art] === "string") {
                    feld[art] = vomKonto[art];
                }
            }
        }
        BESITZ._kontoFeld = feld;
        BESITZ._kontoUid = uid;

        const vorher = BESITZ.geraet(id);
        const alles = BESITZ.geraetDazu(id, UPCREW_BESITZ.lesen(feld));
        const ok = await BESITZ._kontoSchreiben(uid, alles);
        return { ok: ok, neu: JSON.stringify(alles) !== JSON.stringify(vorher) };
    },

    /* Den Besitz des Geräts ans Konto — nach einem Kauf. IMMER erst den
       Konto-Stand frisch holen und vereinigen (seit 0.33.1, Prüfung Besitz
       Fund 1): Der Stand vom Start kann alt sein — ein anderes Gerät oder
       Spiel hat inzwischen dieselbe Art gekauft, und ein Schreiben mit dem
       alten Stand nähme ihm das Stück. Kostet einen kleinen GET je Kauf.
       true = das Konto steht danach wie die Vereinigung. */
    async senden() {
        return (await BESITZ._abgleichenLage()).ok;
    },

    /* GAST → KONTO (wie `SPIELZEIT.gastZumKonto` für den Fortschritt): der
       Gast-Eintrag wandert in den Eintrag der Person und verschwindet; ein
       offener Merker des Gasts gehört jetzt der Person. Liefert, ob etwas
       umgezogen ist. */
    gastZumKonto(id) {
        if (!id || id === FORTSCHRITT.GAST) {
            return false;
        }
        const offen = BESITZ._offenLesen();
        if (offen && offen.wem === FORTSCHRITT.GAST) {
            BESITZ._offenSetzen(id, offen.merker);
        }
        const alle = BESITZ._alle();
        if (!(FORTSCHRITT.GAST in alle)) {
            return false;
        }
        const gast = UPCREW_BESITZ.lesen(alle[FORTSCHRITT.GAST]);
        alle[id] = UPCREW_BESITZ.zusammenfuehren(alle[id], gast);
        delete alle[FORTSCHRITT.GAST];
        BESITZ._alleSchreiben(alle);
        if (Object.keys(gast).length === 0) {
            return false;
        }
        BESITZ.senden();
        return true;
    },

    /* ---------------------------------------------------------------- *
     * Der Merker „Kauf offen" (Gerät)
     * ---------------------------------------------------------------- */

    /* { wem, merker } oder null (fehlt, unlesbar). */
    _offenLesen() {
        try {
            const speicher = BESITZ._speicher();
            const roh = speicher ? JSON.parse(speicher.getItem(BESITZ.offenSchluessel()) || "null") : null;
            if (!BESITZ._istObjekt(roh) || typeof roh.wem !== "string" || !roh.wem) {
                return null;
            }
            const merker = UPCREW_BESITZ.offenLesen(roh.merker);
            return merker ? { wem: roh.wem, merker: merker } : null;
        } catch (fehler) {
            return null;
        }
    },

    _offenSetzen(wem, merker) {
        try {
            const speicher = BESITZ._speicher();
            if (speicher && wem && merker) {
                speicher.setItem(BESITZ.offenSchluessel(), JSON.stringify({ wem: wem, merker: merker }));
            }
        } catch (fehler) {
            /* ohne Merker geht nichts verloren (Kopf von upcrew-besitz.js) */
        }
    },

    _offenLoeschen() {
        try {
            const speicher = BESITZ._speicher();
            if (speicher) {
                speicher.removeItem(BESITZ.offenSchluessel());
            }
        } catch (fehler) {
            /* bleibt liegen, wird beim nächsten Start aufgelöst */
        }
    },

    /*
     * Was ist aus einem gemerkten Kauf geworden? Nur für die Person von
     * jetzt. `stand` = ihr Fortschritt (Gerät + Konto), `buchen(r)` speichert
     * `r.stand` wie nach einem Kauf. Liefert die Lage:
     *   "kein"        nichts gemerkt (ein unlesbarer Rest wird gelöscht)
     *   "andere"      der Merker gehört einer anderen Person — bleibt liegen
     *   "fremd"       … einem anderen Spiel — bleibt liegen
     *   "verworfen"   das Stück ist nicht im Besitz — Merker gelöscht
     *   "gebucht"     die Münzen sind schon abgezogen — Merker gelöscht
     *   "nachbuchen"  Stück da, Münzen nicht: gebucht, dann Merker gelöscht
     */
    offenAufloesen(stand, jetzt, buchen) {
        const id = BESITZ._id();
        const offen = BESITZ._offenLesen();
        if (!offen) {
            let liegt = false;
            try {
                liegt = BESITZ._speicher().getItem(BESITZ.offenSchluessel()) !== null;
            } catch (fehler) {
                liegt = false;
            }
            if (liegt) {
                BESITZ._offenLoeschen();
            }
            return "kein";
        }
        if (!id || offen.wem !== id) {
            return "andere";
        }
        const r = UPCREW_BESITZ.offenAufloesen(stand, BESITZ.geraet(id), offen.merker, BESITZ.app(), jetzt || Date.now());
        if (r.lage === "fremd") {
            return "fremd";
        }
        if (r.lage === "nachbuchen" && typeof buchen === "function") {
            buchen(r);
        }
        BESITZ._offenLoeschen();
        return r.lage;
    },

    /* ---------------------------------------------------------------- *
     * Der Kauf
     * ---------------------------------------------------------------- */

    /*
     * Ein Stück kaufen — rechnen und speichern in der Reihenfolge aus dem
     * Kopf dieser Datei. `angaben`:
     *   stand    der Fortschritt von jetzt (Gerät + Konto, alle Zweige)
     *   art, wert, heute ("JJJJ-MM-TT"), jetzt (ms)
     *   buchen   (r) => … speichert `r.stand` (Gerät, dann Konto)
     * Liefert { ok, grund, preis, fehlt, neu } wie der Baustein. Fragt
     * nicht nach und meldet nichts — das tut der Bildschirm.
     */
    kaufen(angaben) {
        const id = BESITZ._id();
        const r = UPCREW_BESITZ.kaufen(angaben.stand, BESITZ.geraet(id), BESITZ.app(), angaben.art, angaben.wert,
            angaben.heute, angaben.jetzt || Date.now());
        if (!r.ok || !id) {
            return { ok: false, grund: r.ok ? "app" : r.grund, preis: r.preis, fehlt: r.fehlt, neu: [] };
        }
        BESITZ._offenSetzen(id, UPCREW_BESITZ.offenMerken(angaben.stand, BESITZ.app(), angaben.art, angaben.wert, r.preis));
        BESITZ.geraetDazu(id, r.besitz);
        /* Steht der Besitz wirklich auf dem Gerät? (seit 0.33.1, Prüfung
           Besitz Fund 6: Speicher voll oder gesperrt.) Sonst wird NICHT
           gebucht — kein Münz-Abzug, nichts ans Konto, Merker weg. */
        const steht = BESITZ.geraet(id);
        if (!r.neu.every((s) => UPCREW_BESITZ.hat(steht, s.art, s.wert))) {
            BESITZ._offenLoeschen();
            return { ok: false, grund: "speicher", preis: r.preis, fehlt: 0, neu: [] };
        }
        BESITZ.senden();
        angaben.buchen(r);
        BESITZ._offenLoeschen();
        return { ok: true, grund: "", preis: r.preis, fehlt: 0, neu: r.neu };
    }
};

if (typeof module !== "undefined" && module.exports) {
    module.exports = BESITZ;
}
