/*
 * speicher.js — die Leitung zur Ablage. Weiss nichts über den Inhalt.
 *
 * Zwei Rückwände mit derselben Schnittstelle; der Rest der App weiss nicht,
 * welche gerade arbeitet:
 *
 *     art               "lokal" | "gemeinsam"
 *     laden()           der ganze Knoten (roh, oder null)
 *     speichern(daten)  den ganzen Knoten ersetzen
 *     teilLaden(pfad)   einen Unterknoten (roh, oder null)
 *     teilSchreiben(a)  mehrere Unterknoten in EINEM Schritt setzen:
 *                       { "wordle/tage/2026-09-24/<id>": {...}, ... };
 *                       null als Wert löscht
 *     marke()           nur das Feld `geaendertAm` (oder null, wenn unklar)
 *
 * Firebase wird über die reine REST-Schnittstelle angesprochen (fetch), nicht
 * über das SDK — keine fremde Bibliothek, kein Bauschritt.
 *
 * JEDER NETZAUFRUF HAT EIN ZEITLIMIT. `fetch` gibt von sich aus nie auf; im
 * Funkloch hinge sonst die ganze App eine Minute lang (Blunderluck-Lehre,
 * dort v3.9).
 */

/* ------------------------------------------------------------------ *
 * Rückwand 1: lokal im Browser
 * ------------------------------------------------------------------ */

class SpeicherLokal {

    constructor(schluessel) {
        this.art = "lokal";
        this.beschreibung = "Nur auf diesem Gerät gespeichert";
        this.schluessel = schluessel;
    }

    _ganzLesen() {
        try {
            const text = window.localStorage.getItem(this.schluessel);
            return text ? JSON.parse(text) : null;
        } catch (fehler) {
            return null;
        }
    }

    _ganzSchreiben(daten) {
        window.localStorage.setItem(this.schluessel, JSON.stringify(daten));
    }

    async laden() {
        return this._ganzLesen();
    }

    async speichern(daten) {
        this._ganzSchreiben(daten);
    }

    async teilLaden(unterpfad) {
        let knoten = this._ganzLesen();
        for (const teil of SpeicherLokal._teile(unterpfad)) {
            if (!knoten || typeof knoten !== "object") {
                return null;
            }
            knoten = knoten[teil];
        }
        return (knoten === undefined) ? null : knoten;
    }

    /* Dieselbe Wirkung wie die Mehrpfad-Änderung der Datenbank: jeder Pfad
       wird gesetzt, null löscht. */
    async teilSchreiben(aenderungen) {
        const ganz = this._ganzLesen() || {};
        for (const pfad of Object.keys(aenderungen)) {
            const teile = SpeicherLokal._teile(pfad);
            let knoten = ganz;
            for (let i = 0; i < teile.length - 1; i++) {
                if (!knoten[teile[i]] || typeof knoten[teile[i]] !== "object") {
                    knoten[teile[i]] = {};
                }
                knoten = knoten[teile[i]];
            }
            const letzter = teile[teile.length - 1];
            if (aenderungen[pfad] === null) {
                delete knoten[letzter];
            } else {
                knoten[letzter] = JSON.parse(JSON.stringify(aenderungen[pfad]));
            }
        }
        this._ganzSchreiben(ganz);
    }

    async marke() {
        const ganz = this._ganzLesen();
        return (ganz && typeof ganz.geaendertAm === "number") ? ganz.geaendertAm : null;
    }

    static _teile(pfad) {
        return String(pfad || "").split("/").filter((teil) => teil !== "");
    }
}

/* ------------------------------------------------------------------ *
 * Rückwand 2: gemeinsam über die Firebase Realtime Database
 * ------------------------------------------------------------------ */

class SpeicherGemeinsam {

    /* Seit 0.22.0 in Blunderlucks Form (Regel §12, Phase A): Konstruktor
       (basis, pfad, aufbereiten), `adresse`, `markenAdresse`,
       `mitAnmeldung`, `_rufen(einstellungen, zeitlimit, was, adresse)` und
       Absagen mit „(HTTP n)" und `status` — damit die Konten-Rückwand
       `SpeicherKonten` Zeile für Zeile Blunderlucks sein kann
       (tests\test-konto.js vergleicht die Klasse). Typolucks eigene Wege
       (`teilLaden`, `teilSchreiben`, `laden` als Teil) bleiben. */
    constructor(basis, pfad, aufbereiten) {
        this.art = "gemeinsam";
        this.beschreibung = "Gemeinsam mit allen Mitspielern";
        this.basis = String(basis).replace(/\/+$/, "");
        this.pfad = String(pfad).replace(/^\/+|\/+$/g, "");
        this.aufbereiten = aufbereiten || ((daten) => daten);
        /* Hängt den Anmelde-Schlüssel an (siehe `_rufen`). */
        this.mitAnmeldung = true;
    }

    get adresse() {
        return this.basis + "/" + this.pfad + ".json";
    }

    get markenAdresse() {
        return this.basis + "/" + this.pfad + "/" + SpeicherGemeinsam.MARKEN_FELD + ".json";
    }

    _adresse(unterpfad, zusatz) {
        const sauber = String(unterpfad || "").replace(/^\/+|\/+$/g, "");
        return this.basis + "/" + this.pfad + (sauber ? "/" + sauber : "")
            + ".json" + (zusatz || "");
    }

    async laden() {
        return this.teilLaden("");
    }

    async speichern(daten) {
        await this._pruefen(await this._rufen({
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(daten)
        }, SpeicherGemeinsam.ZEITLIMIT_SPEICHERN_MS, "Das Speichern", this._adresse("")));
    }

    /* Einen Unterknoten holen; `flach` = nur die Schlüssel der Kinder
       (`?shallow=true`). null, wenn es ihn nicht gibt. */
    async teilLaden(unterpfad, flach) {
        const antwort = await this._rufen({ cache: "no-store" }, SpeicherGemeinsam.ZEITLIMIT_LADEN_MS,
            "Das Laden", this._adresse(unterpfad, flach ? "?shallow=true" : ""));
        await this._pruefen(antwort);
        return antwort.json();
    }

    /* Die Datenbank führt alle Pfade zusammen aus oder keinen. */
    async teilSchreiben(aenderungen) {
        await this._pruefen(await this._rufen({
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(aenderungen)
        }, SpeicherGemeinsam.ZEITLIMIT_SPEICHERN_MS, "Das Speichern", this._adresse("")));
    }

    /*
     * Die Marke: nur `geaendertAm`, 13 Bytes statt der ganzen Liste. Liefert
     * null statt zu werfen — jeder Zweifel heisst „weiss nicht", und dann
     * wird eben voll geladen. Ein verpasster Stand wäre teurer als ein
     * Ladevorgang zu viel.
     */
    async marke() {
        try {
            const antwort = await this._rufen({ cache: "no-store" },
                SpeicherGemeinsam.ZEITLIMIT_MARKE_MS, "Die Nachfrage", this.markenAdresse);
            if (!antwort.ok) {
                return null;
            }
            const wert = await antwort.json();
            return (typeof wert === "number" && isFinite(wert)) ? wert : null;
        } catch (fehler) {
            return null;
        }
    }

    /* Wirft einen Fehler mit Klartext, „(HTTP n)" und `status`. 401 heisst
       hier fast immer „die Regel für diesen Pfad fehlt noch" (oder seit
       Regel §12: dieser Pfad ist nicht mehr öffentlich). */
    async _pruefen(antwort) {
        if (antwort.ok) {
            return;
        }
        const fehler = new Error((antwort.status === 401
            ? "Die Datenbank lässt diesen Bereich (" + this.pfad + ") nicht zu"
            : "Die Datenbank antwortet mit einem Fehler") + " (HTTP " + antwort.status + ")");
        fehler.status = antwort.status;
        throw fehler;
    }

    async _rufen(einstellungen, zeitlimit, was, adresse) {
        let ziel = adresse || this.adresse;
        /* Der Anmelde-Schlüssel des UPCrew-Kontos (seit v0.2.0,
           js\konto.js): Die Regeln lassen nur angemeldete Konten schreiben.
           Geholt VOR dem Zeitlimit; ohne Schlüssel geht die Anfrage trotzdem
           hinaus. */
        if (this.mitAnmeldung && typeof SpeicherGemeinsam.tokenGeber === "function") {
            let token = null;
            try {
                token = await SpeicherGemeinsam.tokenGeber();
            } catch (fehler) {
                token = null;
            }
            if (token) {
                ziel += (ziel.indexOf("?") === -1 ? "?" : "&")
                    + "auth=" + encodeURIComponent(token);
            }
        }

        if (typeof AbortController === "undefined") {
            return fetch(ziel, einstellungen);
        }
        const abbruch = new AbortController();
        const uhr = setTimeout(() => abbruch.abort(), zeitlimit);
        try {
            return await fetch(ziel, Object.assign({}, einstellungen, { signal: abbruch.signal }));
        } catch (fehler) {
            if (fehler && fehler.name === "AbortError") {
                throw new Error(was + " hat zu lange gedauert. Die Verbindung ist gerade zu schlecht.");
            }
            throw new Error(was + " ging nicht — keine Verbindung zum Netz.");
        } finally {
            clearTimeout(uhr);
        }
    }
}

SpeicherGemeinsam.ZEITLIMIT_LADEN_MS = 8000;
SpeicherGemeinsam.ZEITLIMIT_SPEICHERN_MS = 12000;
SpeicherGemeinsam.ZEITLIMIT_MARKE_MS = 800;

/* Welches Feld die Marke ist (wie Blunderluck). */
SpeicherGemeinsam.MARKEN_FELD = "geaendertAm";

/* Woher der Anmelde-Schlüssel kommt (`KONTO.token`, von app.js gesetzt). */
SpeicherGemeinsam.tokenGeber = null;

/* ------------------------------------------------------------------ *
 * Rückwand 3: die UPCrew-Konten (seit v0.2.0)
 *
 * Jedes Konto hat seinen EIGENEN Knoten unter `spieler/konten/<uid>`.
 * `laden` liefert die gewohnte Liste `{ geaendertAm, spieler: [ … ] }`,
 * `speichern` schreibt aus ihr NUR den eigenen Eintrag — und nur, wenn er
 * sich gegenüber dem Server geändert hat.
 *
 * SEIT 0.22.0 ZEILE FÜR ZEILE BLUNDERLUCKS KLASSE (v0.154.0, Regel §12
 * Phase A: Regel erkennen, Lesewege unter §12, Auszug + Anmeldeverzeichnis
 * im selben Schritt). NIE HIER ABWANDELN — in Blunderluck ändern und neu
 * kopieren; tests\test-konto.js vergleicht den Text der Klasse.
 * ------------------------------------------------------------------ */

class SpeicherKonten extends SpeicherGemeinsam {

    /* `eigeneUid()` liefert die Konto-Nummer dieses Geräts oder null. */
    constructor(basis, pfad, aufbereiten, eigeneUid) {
        super(basis, pfad, aufbereiten);
        this.eigeneUid = eigeneUid;

        /* Der eigene Eintrag, wie er zuletzt auf dem Server stand (als
           Text) — nur was davon abweicht, wird geschrieben. */
        this.zuletzt = null;
    }

    /* Aus den Knoten die gewohnte Liste — sortiert nach Konto-Nummer, damit
       jedes Gerät dieselbe Reihenfolge sieht (`inhaltGleich` vergleicht der
       Reihe nach). */
    static alsListe(roh) {
        if (!roh || typeof roh !== "object") {
            return null;
        }

        const stand = {};
        for (const schluessel of Object.keys(roh)) {
            if (schluessel !== "konten") {
                stand[schluessel] = roh[schluessel];
            }
        }

        const konten = (roh.konten && typeof roh.konten === "object") ? roh.konten : {};
        stand.spieler = Object.keys(konten).sort()
            .filter((uid) => konten[uid] && typeof konten[uid] === "object")
            .map((uid) => Object.assign({}, konten[uid], { uid: uid }));
        return stand;
    }

    /*
     * Ein Eintrag, wie er auf den Server darf: ohne Passwort-Prüfsummen, und
     * (seit v0.151.1, Regel §11a + §11b eingespielt am 27.09.2026) die Felder
     * `aussehen` und `fortschritt` nur so, wie die Regel sie erlaubt.
     * WARUM HIER: Blunderluck schreibt immer den GANZEN Konto-Eintrag. Ein
     * einziges Feld ausserhalb der Regel, und die Datenbank lehnt alles ab —
     * auch Freunde und Abzeichen. Das ist die eine Stelle, durch die jeder
     * Schreibvorgang eines Konto-Eintrags geht (`speichern`, `eintragSetzen`).
     */
    static eintragFuerServer(spieler) {
        const eintrag = JSON.parse(JSON.stringify(spieler));
        delete eintrag.pinPruefwert;
        delete eintrag.pinSalz;
        if (eintrag.aussehen !== undefined) {
            const aussehen = SpeicherKonten.aussehenFuerRegel(eintrag.aussehen);
            if (aussehen) {
                eintrag.aussehen = aussehen;
            } else {
                delete eintrag.aussehen;
            }
        }
        /* Das Aussehen je Spiel (seit v0.151.17, Regel §11c): nur die zwei
           Spiele, je Spiel nur die sechs Felder. */
        if (eintrag.aussehenJe !== undefined) {
            const je = {};
            const roh = (eintrag.aussehenJe && typeof eintrag.aussehenJe === "object") ? eintrag.aussehenJe : {};
            for (const app of ["blunderluck", "typoluck"]) {
                const sauber = SpeicherKonten.aussehenFuerRegel(roh[app]);
                if (sauber) {
                    je[app] = sauber;
                }
            }
            if (Object.keys(je).length > 0) {
                eintrag.aussehenJe = je;
            } else {
                delete eintrag.aussehenJe;
            }
        }
        /* Der Haken „Spielzeit öffentlich" (seit v0.155.2): nur Ja/Nein
           (Regel §14 `spielzeitOeffentlich`). */
        if ("spielzeitOeffentlich" in eintrag && typeof eintrag.spielzeitOeffentlich !== "boolean") {
            delete eintrag.spielzeitOeffentlich;
        }
        if (eintrag.fortschritt && typeof eintrag.fortschritt === "object"
                && typeof FORTSCHRITT !== "undefined" && typeof FORTSCHRITT.fuerKonto === "function") {
            eintrag.fortschritt = FORTSCHRITT.fuerKonto(eintrag.fortschritt);
        }
        return eintrag;
    }

    /*
     * DIE WERTE DER REGEL §11a (SICHERHEIT.md) — dieselben wie `WAHL` in
     * js\upcrew-aussehen.js; `test-konto-regel.js` prüft, dass Regel,
     * Baustein und diese Liste übereinstimmen.
     */
    static get REGEL_AUSSEHEN() {
        return {
            darstellung: ["geraet", "hell", "dunkel"],
            farbwelt: ["werkstatt", "studio", "feld", "tiefsee", "gold"],
            schrift: ["S1", "S2", "S3", "S4", "S5", "S6"],
            knoepfe: ["K1", "K2", "K3", "K4", "K5", "K6"]
        };
    }

    /* Nur die sechs Felder mit erlaubten Werten — oder null, wenn nichts
       Gültiges übrig bleibt. */
    static aussehenFuerRegel(roh) {
        if (!roh || typeof roh !== "object" || Array.isArray(roh)) {
            return null;
        }
        const erlaubt = SpeicherKonten.REGEL_AUSSEHEN;
        const aus = {};
        for (const feld of Object.keys(erlaubt)) {
            if (erlaubt[feld].indexOf(roh[feld]) !== -1) {
                aus[feld] = roh[feld];
            }
        }
        if (typeof roh.leseschrift === "boolean") {
            aus.leseschrift = roh.leseschrift;
        }
        if (typeof roh.stand === "number" && isFinite(roh.stand) && roh.stand >= 0) {
            aus.stand = roh.stand;
        }
        return Object.keys(aus).length > 0 ? aus : null;
    }

    /*
     * LADEN — UNTER BEIDEN REGELN (seit v0.154.0, Regel §12 Phase A,
     * Apps\UPCrew\docs\DATENBANK-KONZEPT-12.md Abschnitt 4).
     *
     * Beim ersten Laden fragt `KONTO.regelErkennen`, welche Regel gilt.
     *   alt  — wie bisher: der ganze Knoten `spieler`.
     *   §12  — `geaendertAm` und `rollen`; dann
     *          Admins/UP#Plus: `konten` ganz und `namen` (Verwaltung);
     *          alle anderen: `oeffentlich` (fremde Auszüge) und nur
     *          `konten/<ich>` (der eigene, volle Eintrag);
     *          nicht angemeldet: keine Spieler.
     * Antwortet die Datenbank mit 401, wird die Regel neu erkannt und
     * einmal auf dem anderen Weg geladen. Das Ergebnis hat in beiden Fällen
     * dieselbe Form (`alsListe`); fremde Einträge tragen unter §12 statt
     * `fortschritt`, `tag`, `kennung` nur `auszug`.
     */
    async laden() {
        const regeln = (typeof KONTO !== "undefined" && typeof KONTO.regelErkennen === "function");
        if (regeln && !KONTO.regelBekannt) {
            await KONTO.regelErkennen();
        }
        let roh;
        try {
            roh = await this._rohLaden();
        } catch (fehler) {
            if (!regeln || !fehler || fehler.status !== 401) {
                throw fehler;
            }
            const vorher = KONTO.regel;
            await KONTO.regelErkennen();
            if (KONTO.regel === vorher) {
                throw fehler;
            }
            roh = await this._rohLaden();
        }
        const daten = this.aufbereiten(SpeicherKonten.alsListe(roh));
        this._merken(daten);
        if (regeln && KONTO.istP12()) {
            this._selbstEintragen(daten);
        }
        return daten;
    }

    async _rohLaden() {
        if (typeof KONTO !== "undefined" && typeof KONTO.istP12 === "function" && KONTO.istP12()) {
            return this._ladenP12();
        }
        const antwort = await this._rufen({ cache: "no-store" },
            SpeicherGemeinsam.ZEITLIMIT_LADEN_MS, "Das Laden");
        if (!antwort.ok) {
            throw SpeicherKonten._fehler("Laden fehlgeschlagen", antwort.status);
        }
        return antwort.json();
    }

    static _fehler(text, status) {
        const fehler = new Error(text + " (HTTP " + status + ")");
        fehler.status = status;
        return fehler;
    }

    /* Einen Unterknoten holen — null, wenn es ihn nicht gibt; wirft mit
       `status` bei einer Absage (401 = Regel lässt es nicht zu). */
    async _teilHolen(unterpfad) {
        const ziel = this.basis + "/" + this.pfad + "/" + unterpfad + ".json";
        const antwort = await this._rufen({ cache: "no-store" },
            SpeicherGemeinsam.ZEITLIMIT_LADEN_MS, "Das Laden", ziel);
        if (!antwort.ok) {
            throw SpeicherKonten._fehler("Laden fehlgeschlagen", antwort.status);
        }
        return antwort.json();
    }

    async _ladenP12() {
        const uid = this.eigeneUid ? this.eigeneUid() : null;
        const [marke, rollen] = await Promise.all([this._teilHolen(SpeicherGemeinsam.MARKEN_FELD),
            this._teilHolen("rollen")]);
        const roh = { rollen: (rollen && typeof rollen === "object") ? rollen : {} };
        if (typeof marke === "number") {
            roh[SpeicherGemeinsam.MARKEN_FELD] = marke;
        }
        if (!uid) {
            roh.konten = {};
            return roh;
        }
        if (KONTO.istAdmin(roh, uid)) {
            const [konten, namen, meinAuszug] = await Promise.all([this._teilHolen("konten"),
                this._teilHolen("namen"), this._teilHolen("oeffentlich/" + uid)]);
            roh.konten = (konten && typeof konten === "object") ? konten : {};
            roh.namen = (namen && typeof namen === "object") ? namen : {};
            this._oeffentlichVomServer = meinAuszug || null;
            return roh;
        }
        const [oeffentlich, eigen] = await Promise.all([this._teilHolen("oeffentlich"),
            this._teilHolen("konten/" + uid)]);
        roh.konten = {};
        const fremde = (oeffentlich && typeof oeffentlich === "object") ? oeffentlich : {};
        this._oeffentlichVomServer = fremde[uid] || null;
        for (const andere of Object.keys(fremde)) {
            if (fremde[andere] && typeof fremde[andere] === "object") {
                roh.konten[andere] = fremde[andere];
            }
        }
        if (eigen && typeof eigen === "object") {
            roh.konten[uid] = eigen;
        }
        return roh;
    }

    /* Den eigenen Auszug sofort neu schreiben (seit v0.155.0: nach dem
       Umschalten „Spielzeit öffentlich"). Unter der alten Regel nichts. */
    oeffentlichNeu(daten) {
        if (typeof KONTO === "undefined" || typeof KONTO.istP12 !== "function" || !KONTO.istP12()) {
            return Promise.resolve();
        }
        this._eingetragen = false;
        this.zuletztOeffentlich = null;
        /* Was zuletzt vom Server kam, kann veraltet sein — sicher schreiben. */
        this._oeffentlichVomServer = { neu: true };
        return this._selbstEintragen(daten);
    }

    /*
     * Unter §12 trägt sich jedes Konto beim ersten Laden je Sitzung selbst
     * in `oeffentlich` und das Anmeldeverzeichnis ein, wenn dort etwas
     * fehlt oder abweicht (Konzept Phase A: „UP#Plus trägt sich beim ersten
     * Start im Modus §12 selbst ein" — und jeder andere auch). Still, im
     * Hintergrund; ein Fehler wird beim nächsten Start wiederholt.
     */
    async _selbstEintragen(daten) {
        if (this._eingetragen) {
            return;
        }
        const eigener = this._eigener(daten);
        if (!eigener || !KONTO.angemeldet()) {
            return;
        }
        this._eingetragen = true;
        try {
            const eintrag = Object.assign(SpeicherKonten.eintragFuerServer(eigener), { uid: eigener.uid });
            const pfade = KONTO.oeffentlichePfade(eintrag, null);
            const soll = KONTO.anmeldungVon(eintrag);
            const verzeichnis = soll ? await KONTO.verzeichnisLesen(eintrag.name) : [];
            if (verzeichnis === null) {
                this._eingetragen = false;
                return;
            }
            const ist = verzeichnis.find((zeile) => zeile.uid === eintrag.uid) || null;
            const verzeichnisPasst = !soll
                || (!!ist && ist.k === soll.k && ist.f === (soll.f === true));
            const text = JSON.stringify(pfade);
            if (verzeichnisPasst && KONTO._gleich(this._oeffentlichVomServer,
                    pfade["oeffentlich/" + eintrag.uid])) {
                this.zuletztOeffentlich = text;
                return;
            }
            pfade[SpeicherGemeinsam.MARKEN_FELD] = Date.now();
            await this.teilSchreiben(pfade);
            this.zuletztOeffentlich = text;
        } catch (fehler) {
            this._eingetragen = false;
        }
    }

    _eigener(daten) {
        const uid = this.eigeneUid ? this.eigeneUid() : null;
        if (!uid || !daten || !Array.isArray(daten.spieler)) {
            return null;
        }
        return daten.spieler.find((spieler) => spieler.uid === uid) || null;
    }

    _merken(daten) {
        const eigener = this._eigener(daten);
        this.zuletzt = eigener
            ? JSON.stringify(SpeicherKonten.eintragFuerServer(eigener)) : null;
    }

    async speichern(daten) {
        const eigener = this._eigener(daten);
        if (!eigener) {
            /* Ohne eigenen Eintrag gibt es nichts, was dieses Gerät
               schreiben dürfte. */
            return;
        }

        const eintrag = SpeicherKonten.eintragFuerServer(eigener);
        const text = JSON.stringify(eintrag);
        if (text === this.zuletzt) {
            return;
        }

        const aenderungen = {};
        aenderungen["konten/" + eigener.uid] = eintrag;

        /* Regel §12 (seit v0.154.0): Auszug und Verzeichnis-Eintrag im
           SELBEN Schritt — aber nur, wenn sie sich geändert haben, und nur
           dann zieht auch die Marke hoch (Konzept §4: „Marke nur, wenn sich
           der Auszug ändert"). Unter der alten Regel wie bisher. */
        let oeffentlichText = null;
        if (typeof KONTO !== "undefined" && typeof KONTO.istP12 === "function" && KONTO.istP12()) {
            const pfade = KONTO.oeffentlichePfade(Object.assign({}, eintrag, { uid: eigener.uid }), null);
            oeffentlichText = JSON.stringify(pfade);
            if (oeffentlichText !== this.zuletztOeffentlich) {
                Object.assign(aenderungen, pfade);
                aenderungen[SpeicherGemeinsam.MARKEN_FELD] = Date.now();
            }
        } else {
            aenderungen[SpeicherGemeinsam.MARKEN_FELD] = Date.now();
        }
        try {
            await this.teilSchreiben(aenderungen);
        } catch (fehler) {
            /* Eine Absage (401) kann heissen: Die Regel hat gewechselt. Beim
               nächsten Laden wird neu erkannt. */
            if (typeof KONTO !== "undefined" && /HTTP 401/.test(String(fehler && fehler.message))) {
                KONTO.regelBekannt = false;
            }
            throw fehler;
        }
        this.zuletzt = text;
        if (oeffentlichText !== null) {
            this.zuletztOeffentlich = oeffentlichText;
        }
    }

    /*
     * Einen Eintrag gezielt setzen oder mit `null` löschen — für die Fälle,
     * die absichtlich einen FREMDEN Eintrag betreffen (Verwaltung) oder den
     * eigenen entfernen (Konto löschen). `weitere` sind zusätzliche Knoten
     * im selben Schritt (Neu-Verbinden: neuer Eintrag und alter weg, beides
     * oder keins).
     */
    async eintragSetzen(uid, eintrag, weitere) {
        const aenderungen = Object.assign({}, weitere || {});
        aenderungen["konten/" + uid] = (eintrag === null)
            ? null : SpeicherKonten.eintragFuerServer(eintrag);
        /* Regel §12 (seit v0.154.0): Auszug und Verzeichnis ziehen mit. */
        if (typeof KONTO !== "undefined" && typeof KONTO.istP12 === "function" && KONTO.istP12()) {
            if (eintrag === null) {
                aenderungen["oeffentlich/" + uid] = null;
            } else {
                Object.assign(aenderungen, KONTO.oeffentlichePfade(
                    Object.assign({}, aenderungen["konten/" + uid], { uid: uid }), null));
            }
        }
        aenderungen[SpeicherGemeinsam.MARKEN_FELD] = Date.now();
        await this.teilSchreiben(aenderungen);

        if (this.eigeneUid && uid === this.eigeneUid()) {
            this.zuletzt = (eintrag === null)
                ? null : JSON.stringify(SpeicherKonten.eintragFuerServer(eintrag));
        }
    }
}

/* ------------------------------------------------------------------ *
 * Auswahl der Rückwand
 * ------------------------------------------------------------------ */

/*
 * Liefert { speicher, hinweis }. Der Hinweis ist leer, wenn alles wie
 * eingestellt läuft — sonst nennt er den Grund für den Rückfall auf lokal.
 * `modusErzwingen` ("lokal") setzt die Werkstatt (js\werkstatt.js).
 */
function speicherErzeugen(einstellung, pfad, lokalerSchluessel, modusErzwingen, konten) {
    const modus = modusErzwingen || einstellung.modus;

    if (modus === "gemeinsam") {
        if (!einstellung.firebaseBasis) {
            return {
                speicher: new SpeicherLokal(lokalerSchluessel),
                hinweis: "In js\\konfig.js fehlt die Datenbank-Adresse. Es wird nur auf diesem Gerät gespeichert."
            };
        }
        /* Die Spielerliste mit UPCrew-Konten (seit v0.2.0): `konten` =
           { eigeneUid, aufbereiten }. Seit 0.22.0 in Blunderlucks
           Reihenfolge (basis, pfad, aufbereiten, eigeneUid). */
        if (konten) {
            return {
                speicher: new SpeicherKonten(einstellung.firebaseBasis, pfad,
                    konten.aufbereiten, konten.eigeneUid),
                hinweis: ""
            };
        }
        return { speicher: new SpeicherGemeinsam(einstellung.firebaseBasis, pfad), hinweis: "" };
    }
    return { speicher: new SpeicherLokal(lokalerSchluessel), hinweis: "" };
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = { SpeicherLokal, SpeicherGemeinsam, SpeicherKonten, speicherErzeugen };
}
