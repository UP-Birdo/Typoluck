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

    constructor(basis, pfad) {
        this.art = "gemeinsam";
        this.beschreibung = "Gemeinsam mit allen Mitspielern";
        this.basis = String(basis).replace(/\/+$/, "");
        this.pfad = String(pfad).replace(/^\/+|\/+$/g, "");
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
        await this._pruefen(await this._rufen(this._adresse(""), {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(daten)
        }, SpeicherGemeinsam.ZEITLIMIT_SPEICHERN_MS, "Das Speichern"));
    }

    async teilLaden(unterpfad) {
        const antwort = await this._rufen(this._adresse(unterpfad), { cache: "no-store" },
            SpeicherGemeinsam.ZEITLIMIT_LADEN_MS, "Das Laden");
        await this._pruefen(antwort);
        return antwort.json();
    }

    /* Die Datenbank führt alle Pfade zusammen aus oder keinen. */
    async teilSchreiben(aenderungen) {
        await this._pruefen(await this._rufen(this._adresse(""), {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(aenderungen)
        }, SpeicherGemeinsam.ZEITLIMIT_SPEICHERN_MS, "Das Speichern"));
    }

    /*
     * Die Marke: nur `geaendertAm`, 13 Bytes statt der ganzen Liste. Liefert
     * null statt zu werfen — jeder Zweifel heisst „weiss nicht", und dann
     * wird eben voll geladen. Ein verpasster Stand wäre teurer als ein
     * Ladevorgang zu viel.
     */
    async marke() {
        try {
            const antwort = await this._rufen(this._adresse("geaendertAm"),
                { cache: "no-store" }, SpeicherGemeinsam.ZEITLIMIT_MARKE_MS, "Die Nachfrage");
            if (!antwort.ok) {
                return null;
            }
            const wert = await antwort.json();
            return (typeof wert === "number" && isFinite(wert)) ? wert : null;
        } catch (fehler) {
            return null;
        }
    }

    /* Wirft einen Fehler mit Klartext. 401 bekommt einen eigenen Satz: Das
       heisst hier fast immer „die Regel für diesen Pfad fehlt noch". */
    async _pruefen(antwort) {
        if (antwort.ok) {
            return;
        }
        const fehler = new Error(antwort.status === 401
            ? "Die Datenbank lässt diesen Bereich (" + this.pfad + ") noch nicht zu."
            : "Die Datenbank antwortet mit Fehler " + antwort.status + ".");
        fehler.status = antwort.status;
        throw fehler;
    }

    async _rufen(adresse, einstellungen, zeitlimit, was) {
        if (typeof AbortController === "undefined") {
            return fetch(adresse, einstellungen);
        }
        const abbruch = new AbortController();
        const uhr = setTimeout(() => abbruch.abort(), zeitlimit);
        try {
            return await fetch(adresse, Object.assign({}, einstellungen, { signal: abbruch.signal }));
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

/* ------------------------------------------------------------------ *
 * Auswahl der Rückwand
 * ------------------------------------------------------------------ */

/*
 * Liefert { speicher, hinweis }. Der Hinweis ist leer, wenn alles wie
 * eingestellt läuft — sonst nennt er den Grund für den Rückfall auf lokal.
 * `modusErzwingen` ("lokal") setzt die Werkstatt (js\werkstatt.js).
 */
function speicherErzeugen(einstellung, pfad, lokalerSchluessel, modusErzwingen) {
    const modus = modusErzwingen || einstellung.modus;

    if (modus === "gemeinsam") {
        if (!einstellung.firebaseBasis) {
            return {
                speicher: new SpeicherLokal(lokalerSchluessel),
                hinweis: "In js\\konfig.js fehlt die Datenbank-Adresse. Es wird nur auf diesem Gerät gespeichert."
            };
        }
        return { speicher: new SpeicherGemeinsam(einstellung.firebaseBasis, pfad), hinweis: "" };
    }
    return { speicher: new SpeicherLokal(lokalerSchluessel), hinweis: "" };
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = { SpeicherLokal, SpeicherGemeinsam, speicherErzeugen };
}
