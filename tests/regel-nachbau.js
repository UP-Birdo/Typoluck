/*
 * regel-nachbau.js — ein Nachbau der Firebase-Regelprüfung und einer
 * Firebase (Anmeldung + Realtime Database über REST), gegen den die ECHTEN
 * App-Dateien laufen (seit v0.154.0, Regel §12). Keine Testdatei (heisst
 * nicht test-*.js); benutzt von tests\test-regel-12.js.
 *
 * WARUM EIN NEUER NACHBAU: test-konto.js prüft gegen eine von Hand
 * geschriebene Kurzfassung der Regel §11, test-konto-regel.js nur die
 * einfachen `.validate`-Ausdrücke. Die Regel §12 lebt von Dingen, die beide
 * nicht können: `.read`-Regeln mit Kaskade, gezieltes Lesen tiefer Knoten,
 * `newData.parent()`, `child(<Ausdruck>)`, `auth.provider`, Regex mit
 * Gruppen. Hier werden die Regel-AUSDRÜCKE wirklich ausgewertet: Jeder
 * Ausdruck wird zu einer JavaScript-Funktion in einer eigenen Umgebung, in
 * der Zeichenketten `matches`/`beginsWith`/`endsWith`/`contains` kennen.
 *
 * WAS NACHGEBAUT IST (Firebase-Dokumentation „Security Rules"):
 *   - `.read`: erlaubt, sobald EINE Regel auf dem Weg von der Wurzel bis zum
 *     gelesenen Knoten wahr ist (tiefer kann nichts mehr verbieten, und ein
 *     Recht TIEFER hilft beim Lesen weiter oben nicht).
 *   - `.write`: ebenso je geschriebenem Pfad — bei einer Mehrpfad-Änderung
 *     (PATCH) jeder Pfad für sich, alles oder nichts.
 *   - `.validate`: für jeden Knoten mit Wert im NEUEN Stand, der geschrieben
 *     wird oder über einem geschriebenen liegt; ein fehlender Kind-Name
 *     fällt auf den `$platzhalter` (so greift `$anderes: false`). Gelöschte
 *     Knoten werden nicht geprüft. Ein Fehler im Ausdruck zählt als falsch.
 *   - `root`/`data` = Stand vorher, `newData` = Stand nach ALLEN Pfaden.
 *   - Leere Objekte verschwinden (wie in Firebase).
 * NICHT nachgebaut: `.indexOn`, Abfragen mit orderBy, `now` genau, `.sv`.
 * Nachbau ≠ Firebase: Die Gegenprobe gegen den Emulator steht aus
 * (SICHERHEIT.md Abschnitt 14).
 */

const vm = require("vm");

/* Eine eigene Umgebung: Nur hier kennen Zeichenketten die Regel-Methoden. */
const REGEL_WELT = vm.createContext({});
vm.runInContext(
    "String.prototype.matches = function (re) { return re.test(String(this)); };"
    + "String.prototype.beginsWith = function (s) { return String(this).indexOf(s) === 0; };"
    + "String.prototype.endsWith = function (s) { const t = String(this); return t.slice(t.length - s.length) === s; };"
    + "String.prototype.contains = function (s) { return String(this).indexOf(s) !== -1; };",
    REGEL_WELT);

const kopie = (wert) => (wert === undefined ? null : JSON.parse(JSON.stringify(wert)));

function wertBei(baum, weg) {
    let knoten = baum;
    for (const teil of weg) {
        if (!knoten || typeof knoten !== "object" || !(teil in knoten)) {
            return null;
        }
        knoten = knoten[teil];
    }
    return (knoten === undefined) ? null : knoten;
}

/* Setzt (oder löscht mit null) und räumt leere Objekte weg. */
function setzen(baum, weg, wert) {
    if (weg.length === 0) {
        return kopie(wert) || {};
    }
    const kette = [baum];
    let knoten = baum;
    for (let i = 0; i < weg.length - 1; i++) {
        if (!knoten[weg[i]] || typeof knoten[weg[i]] !== "object") {
            knoten[weg[i]] = {};
        }
        knoten = knoten[weg[i]];
        kette.push(knoten);
    }
    const letzter = weg[weg.length - 1];
    const leer = (w) => w === null || w === undefined
        || (typeof w === "object" && !Array.isArray(w) && Object.keys(w).length === 0)
        || (Array.isArray(w) && w.length === 0);
    if (leer(wert)) {
        delete knoten[letzter];
    } else {
        knoten[letzter] = kopie(wert);
    }
    for (let i = kette.length - 1; i >= 1; i--) {
        if (Object.keys(kette[i]).length === 0) {
            delete kette[i - 1][weg[i - 1]];
        }
    }
    return baum;
}

/* Der Schnappschuss der Regeln: data, newData, root. */
class Schnappschuss {
    constructor(baum, weg) {
        this._baum = baum;
        this._weg = weg;
    }
    val() {
        return kopie(wertBei(this._baum, this._weg));
    }
    child(pfad) {
        const teile = String(pfad).split("/").filter((t) => t !== "");
        return new Schnappschuss(this._baum, this._weg.concat(teile));
    }
    parent() {
        return new Schnappschuss(this._baum, this._weg.slice(0, -1));
    }
    exists() {
        return wertBei(this._baum, this._weg) !== null;
    }
    hasChild(pfad) {
        return this.child(pfad).exists();
    }
    hasChildren(liste) {
        const wert = wertBei(this._baum, this._weg);
        if (!wert || typeof wert !== "object") {
            return false;
        }
        if (!liste) {
            return Object.keys(wert).length > 0;
        }
        return liste.every((name) => this.hasChild(name));
    }
    isNumber() {
        return typeof wertBei(this._baum, this._weg) === "number";
    }
    isString() {
        return typeof wertBei(this._baum, this._weg) === "string";
    }
    isBoolean() {
        return typeof wertBei(this._baum, this._weg) === "boolean";
    }
}

const ausdruckSpeicher = new Map();

/* Einen Regel-Ausdruck auswerten. `umwelt`: { auth, root, data, newData, variablen }. */
function auswerten(ausdruck, umwelt) {
    if (ausdruck === true || ausdruck === "true") {
        return true;
    }
    if (ausdruck === false || ausdruck === "false" || typeof ausdruck !== "string") {
        return false;
    }
    const namen = Object.keys(umwelt.variablen).sort();
    const schluessel = namen.join(",") + "|" + ausdruck;
    let funktion = ausdruckSpeicher.get(schluessel);
    if (!funktion) {
        funktion = vm.runInContext("(function (auth, root, data, newData, now"
            + namen.map((n) => ", " + n).join("") + ") { return (" + ausdruck + "); })", REGEL_WELT);
        ausdruckSpeicher.set(schluessel, funktion);
    }
    try {
        return funktion(umwelt.auth, umwelt.root, umwelt.data, umwelt.newData, Date.now(),
            ...namen.map((n) => umwelt.variablen[n])) === true;
    } catch (fehler) {
        return false;
    }
}

/* Die Regel eines Kindes: genauer Name, sonst der eine `$platzhalter`. */
function kindRegel(regel, name) {
    if (!regel || typeof regel !== "object") {
        return null;
    }
    if (Object.prototype.hasOwnProperty.call(regel, name) && name[0] !== ".") {
        return { regel: regel[name], variable: null };
    }
    const platz = Object.keys(regel).find((k) => k[0] === "$");
    return platz ? { regel: regel[platz], variable: platz } : null;
}

class RegelNachbau {
    /* `regeln` = das JSON mit `rules`. */
    constructor(regeln) {
        this.regeln = regeln.rules;
    }

    /* Darf `auth` den Knoten `weg` (Liste) lesen? */
    darfLesen(baum, weg, auth) {
        let regel = this.regeln;
        const variablen = {};
        for (let tiefe = 0; tiefe <= weg.length; tiefe++) {
            if (!regel) {
                return false;
            }
            if (regel[".read"] !== undefined) {
                const ort = new Schnappschuss(baum, weg.slice(0, tiefe));
                if (auswerten(regel[".read"], { auth, root: new Schnappschuss(baum, []),
                    data: ort, newData: ort, variablen })) {
                    return true;
                }
            }
            if (tiefe === weg.length) {
                return false;
            }
            const kind = kindRegel(regel, weg[tiefe]);
            if (!kind) {
                return false;
            }
            if (kind.variable) {
                variablen[kind.variable] = weg[tiefe];
            }
            regel = kind.regel;
        }
        return false;
    }

    /*
     * Eine Mehrpfad-Änderung prüfen: `aenderungen` = [{ weg, wert }].
     * Liefert { ok, neu, grund }.
     */
    schreibenPruefen(baum, aenderungen, auth) {
        let neu = kopie(baum) || {};
        for (const { weg, wert } of aenderungen) {
            neu = setzen(neu, weg, wert);
        }
        const root = new Schnappschuss(baum, []);

        /* .write je Pfad */
        for (const { weg } of aenderungen) {
            let regel = this.regeln;
            const variablen = {};
            let erlaubt = false;
            for (let tiefe = 0; tiefe <= weg.length && regel; tiefe++) {
                if (regel[".write"] !== undefined && auswerten(regel[".write"], {
                    auth, root, data: new Schnappschuss(baum, weg.slice(0, tiefe)),
                    newData: new Schnappschuss(neu, weg.slice(0, tiefe)), variablen })) {
                    erlaubt = true;
                    break;
                }
                if (tiefe === weg.length) {
                    break;
                }
                const kind = kindRegel(regel, weg[tiefe]);
                if (!kind) {
                    break;
                }
                if (kind.variable) {
                    variablen[kind.variable] = weg[tiefe];
                }
                regel = kind.regel;
            }
            if (!erlaubt) {
                return { ok: false, neu: null, grund: ".write " + weg.join("/") };
            }
        }

        /* .validate: Vorfahren aller Pfade und alles unter den Pfaden. */
        const zuPruefen = new Set();
        for (const { weg } of aenderungen) {
            for (let tiefe = 0; tiefe <= weg.length; tiefe++) {
                zuPruefen.add(JSON.stringify(weg.slice(0, tiefe)));
            }
            const unten = (w) => {
                const wert = wertBei(neu, w);
                if (wert && typeof wert === "object") {
                    for (const k of Object.keys(wert)) {
                        zuPruefen.add(JSON.stringify(w.concat(k)));
                        unten(w.concat(k));
                    }
                }
            };
            unten(weg);
        }
        for (const text of zuPruefen) {
            const weg = JSON.parse(text);
            if (wertBei(neu, weg) === null) {
                continue;
            }
            let regel = this.regeln;
            const variablen = {};
            let gefunden = true;
            for (const teil of weg) {
                const kind = kindRegel(regel, teil);
                if (!kind) {
                    gefunden = false;
                    break;
                }
                if (kind.variable) {
                    variablen[kind.variable] = teil;
                }
                regel = kind.regel;
            }
            if (!gefunden || !regel || typeof regel !== "object" && regel !== false) {
                continue;
            }
            const validate = (typeof regel === "object") ? regel[".validate"] : undefined;
            if (validate === undefined) {
                continue;
            }
            if (!auswerten(validate, { auth, root, data: new Schnappschuss(baum, weg),
                newData: new Schnappschuss(neu, weg), variablen })) {
                return { ok: false, neu: null, grund: ".validate " + weg.join("/") };
            }
        }
        return { ok: true, neu: neu, grund: "" };
    }
}

/*
 * Eine ganze Firebase: Anmeldung (identitytoolkit, securetoken, anonym) und
 * EINE Realtime Database unter `basis`, geschützt vom RegelNachbau.
 * `fb.fetch(adresse, einstellungen)` ersetzt fetch. `fb.aufrufe` zählt mit.
 */
function firebaseMitRegel(basis, regeln) {
    const nachbau = new RegelNachbau(regeln);
    const fb = {
        db: {},
        konten: {},     // uid -> { email, passwort, anonym }
        tokens: {},     // idToken -> uid
        erneuerungen: {},
        zaehler: 0,
        aufrufe: [],
        nachbau: nachbau,
        regelSetzen(neueRegeln) {
            fb.nachbau = new RegelNachbau(neueRegeln);
        },
        /* Ein Konto von aussen anlegen (Werkzeug): liefert die uid. */
        kontoAnlegen(uid, email, passwort) {
            fb.konten[uid] = { email: email, passwort: passwort, anonym: false };
            return uid;
        }
    };
    const antwort = (status, inhalt) => ({
        ok: status >= 200 && status < 300,
        status: status,
        async json() { return kopie(inhalt); }
    });
    const fehler = (text) => antwort(400, { error: { message: text } });
    const sitzungGeben = (uid) => {
        fb.zaehler++;
        const idToken = "tok-" + uid + "-" + fb.zaehler;
        const refreshToken = "ref-" + uid + "-" + fb.zaehler;
        fb.tokens[idToken] = uid;
        fb.erneuerungen[refreshToken] = uid;
        return { localId: uid, idToken: idToken, refreshToken: refreshToken, expiresIn: "3600" };
    };
    const uidZuAdresse = (email) => Object.keys(fb.konten).find((uid) => fb.konten[uid].email === email);
    const authVon = (token) => {
        const uid = token ? fb.tokens[token] : null;
        if (!uid || !fb.konten[uid]) {
            return null;
        }
        return { uid: uid, provider: fb.konten[uid].anonym ? "anonymous" : "password" };
    };

    fb.fetch = async (adresse, einstellungen) => {
        const url = new URL(adresse);
        const methode = (einstellungen && einstellungen.method) || "GET";
        const inhalt = einstellungen && einstellungen.body;
        const pfadText = url.pathname.replace(/\.json$/, "");
        fb.aufrufe.push({ methode: methode, pfad: decodeURIComponent(pfadText),
            flach: url.searchParams.get("shallow") === "true", auth: !!url.searchParams.get("auth") });

        if (url.host === "identitytoolkit.googleapis.com") {
            const d = JSON.parse(inhalt);
            const endpunkt = url.pathname.split("/").pop();
            if (endpunkt === "accounts:signUp") {
                if (!d.email) {
                    const uid = "anon-" + (++fb.zaehler);
                    fb.konten[uid] = { email: null, passwort: null, anonym: true };
                    return antwort(200, sitzungGeben(uid));
                }
                if (uidZuAdresse(d.email)) {
                    return fehler("EMAIL_EXISTS");
                }
                const uid = "uid-" + (++fb.zaehler);
                fb.konten[uid] = { email: d.email, passwort: d.password, anonym: false };
                return antwort(200, sitzungGeben(uid));
            }
            if (endpunkt === "accounts:signInWithPassword") {
                const uid = uidZuAdresse(d.email);
                if (!uid || fb.konten[uid].passwort !== d.password) {
                    return fehler("INVALID_LOGIN_CREDENTIALS");
                }
                return antwort(200, sitzungGeben(uid));
            }
            if (endpunkt === "accounts:update") {
                const uid = fb.tokens[d.idToken];
                if (!uid || !fb.konten[uid]) {
                    return fehler("INVALID_ID_TOKEN");
                }
                if (d.email) {
                    if (uidZuAdresse(d.email) && uidZuAdresse(d.email) !== uid) {
                        return fehler("EMAIL_EXISTS");
                    }
                    fb.konten[uid].email = d.email;
                    fb.konten[uid].anonym = false;
                }
                if (d.password) {
                    fb.konten[uid].passwort = d.password;
                }
                return antwort(200, sitzungGeben(uid));
            }
            if (endpunkt === "accounts:delete") {
                const uid = fb.tokens[d.idToken];
                if (!uid || !fb.konten[uid]) {
                    return fehler("USER_NOT_FOUND");
                }
                delete fb.konten[uid];
                return antwort(200, {});
            }
            return fehler("UNBEKANNT");
        }
        if (url.host === "securetoken.googleapis.com") {
            const uid = fb.erneuerungen[new URLSearchParams(inhalt).get("refresh_token")];
            if (!uid) {
                return antwort(400, { error: { message: "INVALID_REFRESH_TOKEN" } });
            }
            const neu = sitzungGeben(uid);
            return antwort(200, { id_token: neu.idToken, refresh_token: neu.refreshToken,
                expires_in: "3600", user_id: uid });
        }
        if (adresse.indexOf(basis) !== 0) {
            return antwort(404, null);
        }
        const weg = pfadText.split("/").filter((t) => t !== "").map(decodeURIComponent);
        const auth = authVon(url.searchParams.get("auth"));
        if (methode === "GET") {
            if (!fb.nachbau.darfLesen(fb.db, weg, auth)) {
                return antwort(401, { error: "Permission denied" });
            }
            const wert = wertBei(fb.db, weg);
            if (url.searchParams.get("shallow") === "true" && wert && typeof wert === "object") {
                const flach = {};
                for (const k of Object.keys(wert)) {
                    flach[k] = true;
                }
                return antwort(200, flach);
            }
            return antwort(200, wert);
        }
        let aenderungen;
        if (methode === "PATCH") {
            const roh = JSON.parse(inhalt);
            aenderungen = Object.keys(roh).map((k) => ({
                weg: weg.concat(k.split("/").filter((t) => t !== "")), wert: roh[k] }));
        } else if (methode === "PUT") {
            aenderungen = [{ weg: weg, wert: JSON.parse(inhalt) }];
        } else if (methode === "DELETE") {
            aenderungen = [{ weg: weg, wert: null }];
        } else {
            return antwort(405, null);
        }
        const ergebnis = fb.nachbau.schreibenPruefen(fb.db, aenderungen, auth);
        if (!ergebnis.ok) {
            fb.letzteAbsage = ergebnis.grund;
            return antwort(401, { error: "Permission denied" });
        }
        fb.db = ergebnis.neu;
        return antwort(200, methode === "PATCH" ? JSON.parse(inhalt) : null);
    };
    return fb;
}

module.exports = { RegelNachbau, firebaseMitRegel, Schnappschuss, auswerten, wertBei, setzen };
