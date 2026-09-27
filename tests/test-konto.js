/*
 * test-konto.js — das UPCrew-Konto (seit v0.2.0): js\konto.js (in allen
 * UPCrew-Spielen gleich), die Konten-Rückwand in js\speicher.js und die
 * Abläufe in js\anmeldung.js.
 *
 * Regressionstests gehen nie ins Netz (Haus-Regel): Eine NACHGEBAUTE
 * Firebase spielt Anmeldung und Datenbank — mit den endgültigen Regeln aus
 * Apps\Blunderluck\SICHERHEIT.md, Abschnitt 11 (eigener Eintrag,
 * Namens-Plätze, Rollen, UP#Plus). Derselbe Nachbau wie in
 * Apps\Blunderluck\tests\test-konto.js.
 */

const { pruefe, gleich, spaeter, fazit, speicherAttrappe } = require("./pruefer.js");
const pfad = require("path");
const fs = require("fs");
const vm = require("vm");

const UPCREW = "https://upcrew-7a29d-default-rtdb.europe-west1.firebasedatabase.app";
const ALT = "https://blunderluck-8b7f0-default-rtdb.europe-west1.firebasedatabase.app";

function firebaseNachbauen() {
    const fb = {
        db: { upcrew: {}, alt: {} },
        konten: {},            // uid -> { email, passwort, anonym }
        tokens: {},
        erneuerungen: {},
        zaehler: 0,
        oberUid: null,
        aufrufe: [],
        erneuerungAufrufe: 0,
        erneuerungKaputt: false
    };

    const antwort = (status, inhalt) => ({
        ok: status >= 200 && status < 300,
        status: status,
        async json() { return JSON.parse(JSON.stringify(inhalt)); }
    });
    const fehler = (text) => antwort(400, { error: { message: text } });
    const kopie = (wert) => JSON.parse(JSON.stringify(wert));

    const sitzungGeben = (uid) => {
        fb.zaehler++;
        const idToken = "tok-" + uid + "-" + fb.zaehler;
        const refreshToken = "ref-" + uid + "-" + fb.zaehler;
        fb.tokens[idToken] = uid;
        fb.erneuerungen[refreshToken] = uid;
        return { localId: uid, idToken: idToken, refreshToken: refreshToken, expiresIn: "3600" };
    };
    const uidZuAdresse = (email) =>
        Object.keys(fb.konten).find((uid) => fb.konten[uid].email === email);

    const lesen = (baum, teile) => {
        let knoten = baum;
        for (const teil of teile) {
            if (!knoten || typeof knoten !== "object" || !(teil in knoten)) {
                return null;
            }
            knoten = knoten[teil];
        }
        return knoten === undefined ? null : knoten;
    };
    const setzen = (baum, teile, wert) => {
        let knoten = baum;
        for (let i = 0; i < teile.length - 1; i++) {
            if (!knoten[teile[i]] || typeof knoten[teile[i]] !== "object") {
                knoten[teile[i]] = {};
            }
            knoten = knoten[teile[i]];
        }
        const letzter = teile[teile.length - 1];
        if (wert === null) {
            delete knoten[letzter];
        } else {
            knoten[letzter] = kopie(wert);
        }
    };

    /* Die endgültigen Regeln (SICHERHEIT.md, Abschnitt 11). `alt` = Stand
       vor dem Schreiben, `neu` = Stand danach (wie `root`/`newData`). */
    const istAdmin = (alt, uid) => uid === fb.oberUid
        || lesen(alt, ["spieler", "rollen", uid]) === "admin";

    const darfSchreiben = (teile, wert, uid, alt, neu) => {
        if (!uid) {
            return false;
        }
        if (teile[0] === "blunderluck" || teile[0] === "typoluck") {
            return true;
        }
        if (teile[0] !== "spieler") {
            return false;
        }
        if (teile.length === 2 && teile[1] === "geaendertAm") {
            return typeof wert === "number";
        }
        if (teile.length === 3 && teile[1] === "rollen") {
            return uid === fb.oberUid && teile[2] !== fb.oberUid
                && (wert === null || wert === "admin");
        }
        if (teile.length === 4 && teile[1] === "namen") {
            const bisher = lesen(alt, teile);
            const erlaubt = ((bisher === null || bisher === uid) && (wert === null || wert === uid))
                || (bisher !== null && wert === uid
                    && lesen(alt, ["spieler", "konten", bisher, "neuVerbinden"]) === true)
                || (istAdmin(alt, uid) && bisher !== fb.oberUid);
            if (!erlaubt) {
                return false;
            }
            if (wert === null) {
                return true;
            }
            return typeof wert === "string"
                && (/^[0-9]{4}$/.test(teile[3]) || uid === fb.oberUid)
                && teile[2].length >= 3 && teile[2].length <= 16;
        }
        if (teile.length === 3 && teile[1] === "konten") {
            const ziel = teile[2];
            const bisher = lesen(alt, teile);
            const erlaubt = uid === ziel
                || (istAdmin(alt, uid) && ziel !== fb.oberUid)
                || (bisher && bisher.neuVerbinden === true && wert === null);
            if (!erlaubt) {
                return false;
            }
            if (wert === null) {
                return true;
            }
            return typeof wert.id === "string" && typeof wert.name === "string"
                && typeof wert.tag === "string" && wert.uid === ziel
                && wert.name.length >= 1 && wert.name.length <= 40
                && !("pinPruefwert" in wert) && !("pinSalz" in wert)
                && lesen(neu, ["spieler", "namen", wert.name.toLowerCase(), wert.tag]) === ziel;
        }
        return false;
    };

    fb.fetch = async (adresse, einstellungen) => {
        const url = new URL(adresse);
        const methode = (einstellungen && einstellungen.method) || "GET";
        const inhalt = einstellungen && einstellungen.body;
        fb.aufrufe.push({ adresse: adresse, methode: methode, inhalt: inhalt });

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
            fb.erneuerungAufrufe++;
            const uid = fb.erneuerungen[new URLSearchParams(inhalt).get("refresh_token")];
            if (!uid || fb.erneuerungKaputt) {
                return antwort(400, { error: { message: "INVALID_REFRESH_TOKEN" } });
            }
            const neu = sitzungGeben(uid);
            return antwort(200, { id_token: neu.idToken, refresh_token: neu.refreshToken,
                expires_in: "3600", user_id: uid });
        }

        const baumName = (adresse.indexOf(UPCREW) === 0) ? "upcrew"
            : (adresse.indexOf(ALT) === 0) ? "alt" : null;
        if (!baumName) {
            return antwort(404, null);
        }
        const baum = fb.db[baumName];
        const teile = url.pathname.replace(/\.json$/, "").split("/").filter((t) => t !== "");
        const uid = fb.tokens[url.searchParams.get("auth")] || null;

        if (methode === "GET") {
            return antwort(200, lesen(baum, teile));
        }
        if (baumName === "alt") {
            return antwort(401, { error: "Permission denied" });
        }
        if (methode === "PATCH") {
            const aenderungen = JSON.parse(inhalt);
            const neu = kopie(baum);
            for (const schluessel of Object.keys(aenderungen)) {
                setzen(neu, teile.concat(schluessel.split("/")), aenderungen[schluessel]);
            }
            for (const schluessel of Object.keys(aenderungen)) {
                if (!darfSchreiben(teile.concat(schluessel.split("/")), aenderungen[schluessel],
                        uid, baum, neu)) {
                    return antwort(401, { error: "Permission denied" });
                }
            }
            fb.db.upcrew = neu;
            return antwort(200, aenderungen);
        }
        return antwort(405, null);
    };

    return fb;
}

/* ------------------------------------------------------------------ *
 * Die App in einer eigenen Umgebung
 * ------------------------------------------------------------------ */

function appLaden(fb) {
    const geraet = speicherAttrappe();
    const dialog = { antworten: [], hinweise: [], kurz: [] };
    const umgebung = {
        console, URL, URLSearchParams, AbortController, TextEncoder, Uint8Array, Uint32Array,
        crypto: globalThis.crypto,
        setTimeout, clearTimeout,
        setInterval() { return 0; },
        fetch: (a, e) => fb.fetch(a, e),
        document: { body: { classList: { add() {}, remove() {} } }, addEventListener() {} },
        window: { localStorage: geraet, addEventListener() {} },
        DIALOG: {
            async frage() { return dialog.antworten.shift(); },
            async eingabe() { return dialog.antworten.shift(); },
            async hinweis(t, x) { dialog.hinweise.push(t + ": " + x); },
            kurzmeldung(t) { dialog.kurz.push(t); }
        },
        NAVIGATION: { zeigen() {} }
    };
    umgebung.globalThis = umgebung;
    vm.createContext(umgebung);

    const quelle = ["konfig.js", "konto.js", "versiegelung.js", "spieler.js", "ich.js",
        "speicher.js", "abgleich.js", "anmeldung.js"]
        .map((n) => fs.readFileSync(pfad.join(__dirname, "..", "js", n), "utf8"))
        .join("\n;\n")
        + "\nObject.assign(globalThis, { KONFIG, KONTO, SPIELER, ICH, ANMELDUNG, Abgleich,"
        + " SpeicherGemeinsam, SpeicherKonten, speicherErzeugen });";
    vm.runInContext(quelle, umgebung, { filename: "typoluck-konto.js" });

    const { KONTO, SPIELER, ANMELDUNG, KONFIG } = umgebung;
    KONFIG.speicher.schreibVerzoegerungMs = 0;
    KONTO.einrichten(KONFIG);
    umgebung.SpeicherGemeinsam.tokenGeber = () => KONTO.token();
    KONTO.beiVerloren = () => ANMELDUNG.sitzungVerloren();

    const speicher = umgebung.speicherErzeugen(KONFIG.speicher, "spieler", "typoluck.spieler", null,
        { eigeneUid: () => KONTO.uid(), aufbereiten: (roh) => SPIELER.normalisieren(roh) }).speicher;
    const abgleich = new umgebung.Abgleich(speicher, KONFIG.speicher, {});
    ANMELDUNG.verbinden(abgleich, { hidden: true, innerHTML: "" });
    ANMELDUNG._vollbildZeigen = (vorname) => {
        ANMELDUNG.offen = true;
        umgebung.vollbild = vorname || "Weiche";
    };
    ANMELDUNG._fertig = () => {
        ANMELDUNG.offen = false;
    };
    return { umgebung, KONTO, SPIELER, ANMELDUNG, abgleich, speicher, dialog };
}

const konten = (fb) => (fb.db.upcrew.spieler && fb.db.upcrew.spieler.konten) || {};
const namen = (fb) => (fb.db.upcrew.spieler && fb.db.upcrew.spieler.namen) || {};

async function nachladen(w) {
    w.abgleich.daten = w.SPIELER.normalisieren(await w.speicher.laden());
}

/* ------------------------------------------------------------------ *
 * Die Prüfungen
 * ------------------------------------------------------------------ */

spaeter("UPCrew-Konto", (async () => {
    const fb = firebaseNachbauen();
    const w = appLaden(fb);
    await nachladen(w);

    pruefe("Konto ist eingerichtet", w.KONTO.aktiv());
    gleich("Eigener Schlüssel im Gerätespeicher", w.KONTO.SCHLUESSEL, "typoluck.konto");

    /* Neues Konto mit Nummer, ohne Prüfsumme, Passwort ohne Zutat */
    const mia = await w.KONTO.kontoAnlegen(w.speicher, w.abgleich.daten, "Mia", "Mia#Pass1");
    pruefe("Neues Konto angelegt", mia.ok, JSON.stringify(mia));
    const miaUid = w.KONTO.uid();
    pruefe("Nummer vergeben", /^[0-9]{4}$/.test(mia.eintrag.tag));
    gleich("Namens-Platz", namen(fb).mia[mia.eintrag.tag], miaUid);
    pruefe("Keine Prüfsumme in der Datenbank", JSON.stringify(fb.db.upcrew).indexOf("pinPruefwert") === -1);
    gleich("Firebase-Passwort", fb.konten[miaUid].passwort, "Mia#Pass1");

    const schwach = await w.KONTO.kontoAnlegen(w.speicher, w.abgleich.daten, "Tom", "1234");
    pruefe("Schwaches Passwort abgelehnt", !schwach.ok);

    /* Anmelden mit Name#Nummer */
    w.KONTO.abmelden();
    await nachladen(w);
    const anmeldung = await w.KONTO.anmeldenMitEingabe(w.abgleich.daten,
        "Mia#" + mia.eintrag.tag, "Mia#Pass1");
    pruefe("Anmelden mit Name#Nummer", anmeldung.ok, JSON.stringify(anmeldung));
    w.ANMELDUNG._uebernehmen(anmeldung.spieler);

    /* Passwort ändern */
    w.dialog.antworten = ["Mia#Pass1", "Neu#Pass2", "Neu#Pass2"];
    await w.ANMELDUNG.passwortAendern();
    gleich("Passwort geändert", fb.konten[miaUid].passwort, "Neu#Pass2");

    /* Name ändern: gesäubert, Nummer bleibt, alter Platz frei */
    w.dialog.antworten = ["Mi ara!"];
    await w.ANMELDUNG.nameAendern();
    gleich("Name gesäubert und geändert", konten(fb)[miaUid].name, "Miara");
    gleich("Nummer bleibt", konten(fb)[miaUid].tag, mia.eintrag.tag);
    pruefe("Alter Platz frei", !namen(fb).mia || !namen(fb).mia[mia.eintrag.tag]);

    /* Gast: anonym, sichern behält die Konto-Nummer */
    w.KONTO.abmelden();
    w.ANMELDUNG.ichId = null;
    await nachladen(w);
    const gast = await w.KONTO.gastAnlegen(w.speicher, w.abgleich.daten);
    pruefe("Gast angelegt", gast.ok, JSON.stringify(gast));
    const gastUid = w.KONTO.uid();
    pruefe("Gast ist anonym", fb.konten[gastUid] && fb.konten[gastUid].anonym);
    await nachladen(w);
    w.ANMELDUNG._uebernehmen(gast.eintrag);
    pruefe("istGast", w.ANMELDUNG.istGast());
    const gesichert = await w.KONTO.gastSichern(w.speicher, w.abgleich.daten, w.ANMELDUNG.ich(),
        "Lena", "Lena#Pass1");
    pruefe("Gast gesichert", gesichert.ok, JSON.stringify(gesichert));
    gleich("Dieselbe Konto-Nummer", w.KONTO.uid(), gastUid);
    pruefe("Nicht mehr anonym", !fb.konten[gastUid].anonym);

    /* Ein zweiter Gast meldet sich ab: Rückfrage, Gast-Konto weg */
    w.KONTO.abmelden();
    w.ANMELDUNG.ichId = null;
    await nachladen(w);
    const gast2 = await w.KONTO.gastAnlegen(w.speicher, w.abgleich.daten);
    await nachladen(w);
    w.ANMELDUNG._uebernehmen(gast2.eintrag);
    const gast2Uid = w.KONTO.uid();
    w.dialog.antworten = [true];
    await w.ANMELDUNG.abmelden(false);
    pruefe("Gast-Konto weggeräumt", !konten(fb)[gast2Uid] && !fb.konten[gast2Uid]);

    /* UP#Plus: erkannt, spielt nicht */
    fb.oberUid = "uid-ober";
    fb.konten["uid-ober"] = { email: "up-plus@konten.upcrew.invalid", passwort: "Stark#Pw9", anonym: false };
    fb.db.upcrew.spieler.konten["uid-ober"] = { id: "id-ober", name: "UP", tag: "Plus",
        uid: "uid-ober", kennung: "up-plus" };
    fb.db.upcrew.spieler.namen.up = { Plus: "uid-ober" };
    await nachladen(w);
    const ober = await w.KONTO.anmeldenMitEingabe(w.abgleich.daten, "UP#Plus", "Stark#Pw9");
    pruefe("UP#Plus meldet sich an", ober.ok, JSON.stringify(ober));
    pruefe("UP#Plus erkannt", w.ANMELDUNG.istOberAdmin());

    /* Konto löschen (Miara) */
    w.KONTO.abmelden();
    await nachladen(w);
    const wieder = await w.KONTO.anmeldenMitEingabe(w.abgleich.daten, "Miara", "Neu#Pass2");
    pruefe("Miara meldet sich an", wieder.ok, JSON.stringify(wieder));
    w.ANMELDUNG._uebernehmen(wieder.spieler);
    w.dialog.antworten = [true, "Neu#Pass2"];
    await w.ANMELDUNG.kontoLoeschen();
    pruefe("Eintrag gelöscht", !konten(fb)[miaUid]);
    pruefe("Firebase-Konto gelöscht", !fb.konten[miaUid]);
    pruefe("Abgemeldet", !w.KONTO.angemeldet() && w.ANMELDUNG.ichId === null);

    /* Gerät kennt die Person, aber keine Sitzung: Anmelde-Bild mit Namen */
    w.umgebung.ICH.personSetzen("id-x", "Lena");
    w.ANMELDUNG.offen = false;
    await nachladen(w);
    w.ANMELDUNG.pruefen(true);
    gleich("Anmelde-Bild mit gemerktem Namen", w.umgebung.vollbild, "Lena");

    /* ---------------------------------------------------------------- *
     * Seit 0.15.6 (wie Blunderluck v0.151.8): Anmelden nur mit Namen,
     * reihum bei gleichen Namen; Nummer würfelt die App, ändern nur in den
     * Einstellungen.
     * ---------------------------------------------------------------- */
    w.KONTO.abmelden();
    w.ANMELDUNG.ichId = null;
    await nachladen(w);
    const max1 = await w.KONTO.kontoAnlegen(w.speicher, w.abgleich.daten, "Max", "Eins#Pass1");
    const max1Uid = w.KONTO.uid();
    w.KONTO.abmelden();
    await nachladen(w);
    const max2 = await w.KONTO.kontoAnlegen(w.speicher, w.abgleich.daten, "Max", "Zwei#Pass2");
    const max2Uid = w.KONTO.uid();
    pruefe("Zwei Konten „Max“ mit gewürfelten, verschiedenen Nummern",
        max1.ok && max2.ok && /^[0-9]{4}$/.test(max2.eintrag.tag) && max1.eintrag.tag !== max2.eintrag.tag,
        JSON.stringify([max1, max2]));
    w.KONTO.abmelden();
    await nachladen(w);
    const nurName = await w.KONTO.anmeldenMitEingabe(w.abgleich.daten, "Max", "Zwei#Pass2");
    pruefe("Nur Name + Passwort: reihum das richtige Konto", nurName.ok && w.KONTO.uid() === max2Uid,
        JSON.stringify(nurName));
    w.KONTO.abmelden();
    const nurNameEins = await w.KONTO.anmeldenMitEingabe(w.abgleich.daten, "max", "Eins#Pass1");
    pruefe("… auch das erste (klein geschrieben)", nurNameEins.ok && w.KONTO.uid() === max1Uid);
    w.KONTO.abmelden();
    const reihumFalsch = await w.KONTO.anmeldenMitEingabe(w.abgleich.daten, "Max", "Gar#Nix99");
    gleich("Falsches Passwort bei allen: eine offene Meldung",
        [reihumFalsch.ok, reihumFalsch.fehler, reihumFalsch.reihum, reihumFalsch.text],
        [false, "falsch", true, "Name oder Passwort falsch."]);

    /* Höchstens 20 Versuche je Name */
    const echtesAnmelden = w.KONTO.anmelden;
    let versuche = 0;
    w.KONTO.anmelden = async () => {
        versuche++;
        return { ok: false, fehler: "falsch" };
    };
    const viele = [];
    for (let i = 1; i <= 25; i++) {
        viele.push({ id: "id-" + i, uid: "u-" + i, name: "Max", tag: String(1000 + i), kennung: "k-" + i });
    }
    await w.KONTO._anmeldenReihum(viele, "Gar#Nix99");
    gleich("Reihum: höchstens 20 Versuche", [versuche, w.KONTO.ANMELDEN_REIHUM_MAX], [20, 20]);
    versuche = 0;
    w.KONTO.anmelden = async () => {
        versuche++;
        return { ok: false, fehler: "zuViele" };
    };
    await w.KONTO._anmeldenReihum(viele, "x");
    gleich("Reihum: Abbruch bei „zu viele Versuche“", versuche, 1);
    w.KONTO.anmelden = echtesAnmelden;

    /* Nummer ändern: wählen, würfeln, besetzt, Gast */
    w.KONTO.abmelden();
    const wieder2 = await w.KONTO.anmeldenMitEingabe(w.abgleich.daten, "Max#" + max2.eintrag.tag, "Zwei#Pass2");
    pruefe("Mit Name#Nummer weiter direkt", wieder2.ok);
    w.ANMELDUNG._uebernehmen(wieder2.spieler);
    pruefe("tagPruefen: 4 Ziffern, nicht 0000",
        w.KONTO.tagPruefen("12a4") !== "" && w.KONTO.tagPruefen("0000") !== "" && w.KONTO.tagPruefen("4821") === "");
    w.dialog.antworten = ["4821"];
    await w.ANMELDUNG.nummerAendern();
    gleich("Nummer gewählt: Konto und Namens-Platz", [konten(fb)[max2Uid].tag, namen(fb).max["4821"]], ["4821", max2Uid]);
    pruefe("… alter Platz frei", !namen(fb).max[max2.eintrag.tag]);
    w.dialog.antworten = [""];
    await w.ANMELDUNG.nummerAendern();
    pruefe("Nummer gewürfelt", konten(fb)[max2Uid].tag !== "4821" && /^[0-9]{4}$/.test(konten(fb)[max2Uid].tag)
        && !namen(fb).max["4821"]);
    await nachladen(w);
    const besetzt = await w.KONTO.tagAendern(w.speicher, w.abgleich.daten,
        w.SPIELER.spielerFinden(w.abgleich.daten, wieder2.spieler.id), max1.eintrag.tag);
    gleich("Besetzte Nummer abgelehnt", besetzt.ok, false);
    const gastNummer = await w.KONTO.tagAendern(w.speicher, w.abgleich.daten, { gast: true, tag: "1111" }, "");
    gleich("Gast hat keine eigene Nummer", gastNummer.ok, false);

    /* Angezeigt wird nur der Name — die Nummer nur bei gleichen Namen */
    gleich("Anzeige ohne Nummer", w.ANMELDUNG.anzeigeName({ name: "Max", tag: "1234" }), "Max");
    const zweiMax = w.SPIELER.normalisieren({ spieler: [{ id: "a", name: "Max", tag: "1111" },
        { id: "b", name: "max", tag: "2222" }, { id: "c", name: "Lena", tag: "3333" }] });
    gleich("Nummer leise nur bei gleichen Namen",
        ["a", "c"].map((id) => w.SPIELER.nummerZusatz(zweiMax, w.SPIELER.spielerFinden(zweiMax, id))), ["#1111", ""]);
    pruefe("Suche findet Name und Name#Nummer",
        w.SPIELER.passtZurSuche({ name: "Max", tag: "1111" }, "ma")
            && w.SPIELER.passtZurSuche({ name: "Max", tag: "1111" }, "max#11")
            && !w.SPIELER.passtZurSuche({ name: "Max", tag: "1111" }, "#22"));
})());

/* Kein fremder Name als Beispiel in sichtbaren Texten (seit 0.15.6, Nutzer:
   „nimm meinen Namen aus dem Vorschlag") und keine Nummer im Anmelden. */
{
    const ohneKommentare = (text) => text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    for (const name of ["konto.js", "anmeldung.js", "bildschirm-einstellungen.js", "bildschirm-freunde.js"]) {
        const quelle = ohneKommentare(fs.readFileSync(pfad.join(__dirname, "..", "js", name), "utf8"));
        pruefe(name + " nennt keinen Namen als Beispiel", !/Jonas/.test(quelle));
    }
    const seite = fs.readFileSync(pfad.join(__dirname, "..", "index.html"), "utf8").replace(/<!--[\s\S]*?-->/g, "");
    pruefe("index.html nennt keinen Namen als Beispiel", !/Jonas/.test(seite));
    const anmeldung = ohneKommentare(fs.readFileSync(pfad.join(__dirname, "..", "js", "anmeldung.js"), "utf8"));
    pruefe("Anmelden: Feld „Name“, kein „Name#Nummer“, keine „(#1234)“",
        !/Name#Nummer/.test(anmeldung) && !/\(#1234\)/.test(anmeldung) && /"Name und Passwort/.test(anmeldung));
    gleich("konto.js ist Blunderlucks Fassung (nur SCHLUESSEL eigen): Reihum-Grenze", require("../js/konto.js").ANMELDEN_REIHUM_MAX, 20);
}

fazit();
