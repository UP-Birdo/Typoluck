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

    /* Seit 0.22.0 in der gemeinsamen Form (Regel §12, Phase A): Konstruktor
       (basis, pfad, aufbereiten), `adresse`, `markenAdresse`,
       `mitAnmeldung`, `_rufen(einstellungen, zeitlimit, was, adresse)` und
       Absagen mit „(HTTP n)" und `status` — das braucht die Konten-Rückwand
       `SpeicherKonten`, die in jedem UPCrew-Spiel dieselbe ist (seit 0.28.1
       der Baustein js\speicher-konten.js). Typolucks eigene Wege
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
/* Seit 0.31.0 3500 statt 800 ms: Im Mobilfunk dauert die Nachfrage oft
   länger als 800 ms — dann hiess die Antwort „weiss nicht", und es wurde
   alle fünf Sekunden alles geladen. Bleibt unter dem Takt der Abfrage
   (KONFIG.speicher.abfrageIntervallMs). */
SpeicherGemeinsam.ZEITLIMIT_MARKE_MS = 3500;

/* Welches Feld die Marke ist (wie Blunderluck). */
SpeicherGemeinsam.MARKEN_FELD = "geaendertAm";

/* Woher der Anmelde-Schlüssel kommt (`KONTO.token`, von app.js gesetzt). */
SpeicherGemeinsam.tokenGeber = null;

/* ------------------------------------------------------------------ *
 * Rückwand 3: die UPCrew-Konten — Klasse `SpeicherKonten`
 *
 * Steht seit 0.28.1 NICHT mehr hier, sondern im gemeinsamen Baustein
 * js\speicher-konten.js (Quelle: UPCrew-Bausteine, Kern, nie hier
 * abwandeln). Er erbt von `SpeicherGemeinsam` und wird deshalb in
 * index.html direkt NACH dieser Datei geladen. `speicherErzeugen` unten
 * nennt die Klasse trotzdem: Es läuft erst, wenn alle Dateien da sind.
 * ------------------------------------------------------------------ */

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
           { eigeneUid, aufbereiten }. Seit 0.22.0 in der Reihenfolge des
           Bausteins (basis, pfad, aufbereiten, eigeneUid). */
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
    module.exports = { SpeicherLokal, SpeicherGemeinsam, speicherErzeugen };
}
