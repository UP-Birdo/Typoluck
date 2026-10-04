/*
 * test-konto-eintrag.js — das Speichern des GANZEN eigenen Konto-Eintrags
 * (seit 0.34.2).
 *
 * WORUM ES GEHT: Freunde und Abzeichen schreibt Typoluck als GANZEN Eintrag
 * `spieler/konten/<uid>` (js\abgleich.js → `SpeicherKonten.speichern`), Name
 * und Nummer ebenso (js\anmeldung.js → js\konto.js). Am selben Eintrag
 * hängen Dinge, die Typoluck nicht selbst pflegt: der Fortschritt-Zweig des
 * anderen UPCrew-Spiels, der Besitz aus dem Shop, das Aussehen je Spiel, der
 * Haken „Spielzeit öffentlich", künftige Felder. Bis 0.34.1 ging dabei
 * verloren:
 *   - der fremde Fortschritt-Zweig (`fuerKonto` gab nur den eigenen aus),
 *     damit sank auch das öffentliche Level im Auszug;
 *   - alles, was seit dem letzten Laden ein anderes Gerät oder Spiel ans
 *     Konto geschrieben hatte (der eigene Eintrag gewann als Ganzes).
 *
 * WIE GEPRÜFT WIRD: Die ECHTEN Dateien (konto.js, speicher.js,
 * speicher-konten.js, spieler.js, fortschritt-kern.js, fortschritt.js,
 * abgleich.js, anmeldung.js, upcrew-besitz.js …) laufen gegen die nachgebaute
 * Firebase (tests\regel-nachbau.js), geschützt vom ECHTEN eingespielten
 * Regeltext §13 aus ..\UPCrew\Firebase-Regeln (nur gelesen; fehlt er, prüft
 * der Test nichts). Jedes Schreiben geht also durch die Regel — was sie
 * ablehnt, kommt nicht an, und der Test wird rot.
 *
 * Nachbau ≠ Firebase: an der echten Datenbank ist nichts davon geprüft.
 */

const pfad = require("path");
const dateisystem = require("fs");
const vm = require("vm");
const { pruefe, gleich, spaeter, fazit } = require("./pruefer.js");
const { RegelNachbau, firebaseMitRegel } = require("./regel-nachbau.js");

const projekt = pfad.join(__dirname, "..");
const REGELDATEI = pfad.join(projekt, "..", "UPCrew", "Firebase-Regeln", "2026-09-29 NEUE Regel mit 13.txt");

if (!dateisystem.existsSync(REGELDATEI)) {
    console.log("Regeltext §13 nicht gefunden (UPCrew\\Firebase-Regeln) — nichts geprüft");
    console.log("0 ok, 0 Fehler");
    process.exit(0);
}

const REGEL = JSON.parse(dateisystem.readFileSync(REGELDATEI, "utf8").replace(/^﻿/, ""));
const BASIS = "https://upcrew-7a29d-default-rtdb.europe-west1.firebasedatabase.app";
const PW = "Anna#Pass1";
const UID = "uid-anna";
const kopie = (wert) => JSON.parse(JSON.stringify(wert));
/* Dasselbe mit sortierten Schlüsseln — die Reihenfolge der Felder zählt am Konto nicht. */
const geordnet = (wert) => {
    if (Array.isArray(wert)) {
        return wert.map(geordnet);
    }
    if (wert && typeof wert === "object") {
        const aus = {};
        Object.keys(wert).sort().forEach((k) => { aus[k] = geordnet(wert[k]); });
        return aus;
    }
    return wert;
};
const viel = (n, f) => Array.from({ length: n }, (_, i) => f(i));
const warten = (ms) => new Promise((fertig) => setTimeout(fertig, ms));

/* ------------------------------------------------------------------ *
 * Die Zweige am Konto
 * ------------------------------------------------------------------ */

/* Der Zweig des anderen Spiels, wie es ihn ans Konto schreibt. */
const ANDERER = () => ({
    xp: 2000, partien: 37, stand: 5000,
    gezaehlt: ["p-1", "p-2"],
    tage: ["2026-10-01", "2026-10-02"],
    heute: { datum: "2026-10-02", versuche: 2, figuren: 3 },
    turm: { figuren: { "1-0": 3, "1-1": 2 }, schwuere: { "7": 2 } },
    zaehler: { muenzenVerdient: 120, muenzenAusgegeben: 30, serie: 2, serieBis: 20261002,
        tagesaufgaben: 2, spielzeit: 900, seit: 20260901 },
    taten: ["erster-sieg"]
});

const EIGENER = () => ({
    xp: 300, partien: 9, stand: 4000,
    tage: ["2026-10-02"],
    heute: { datum: "2026-10-02", versuche: 3, figuren: 2 },
    zaehler: { tagesaufgaben: 4, figuren: 6, muenzenVerdient: 40 },
    taten: ["serie-7"]
});

function annaEintrag() {
    return {
        id: "id-anna", name: "Anna", tag: "1234", uid: UID, kennung: "k-anna",
        fortschritt: { version: 1, spiele: { blunderluck: ANDERER(), typoluck: EIGENER() } },
        besitz: { kachelset: "blei" },
        aussehenJe: { blunderluck: { farbwelt: "gold", stand: 11 }, typoluck: { farbwelt: "feld", stand: 12 } },
        spielzeitOeffentlich: true,
        lieblingswoerter: { typoluck: ["abend", "tisch"] },
        stufe: { typoluck: { wert: 40, runden: 5, stand: 7 } }
    };
}

/* ------------------------------------------------------------------ *
 * Die App in einer eigenen Umgebung (wie test-regel-12.js)
 * ------------------------------------------------------------------ */

function appLaden(fb) {
    const gespeichert = {};
    const dialog = { antworten: [], hinweise: [], kurz: [] };
    const geraet = {
        getItem(s) { return (s in gespeichert) ? gespeichert[s] : null; },
        setItem(s, w) { gespeichert[s] = String(w); },
        removeItem(s) { delete gespeichert[s]; }
    };
    const umgebung = {
        console, URL, URLSearchParams, AbortController, TextEncoder, Uint8Array, Uint32Array, atob, btoa,
        crypto: globalThis.crypto,
        setTimeout, clearTimeout,
        setInterval() { return 0; },
        fetch: (a, e) => fb.fetch(a, e),
        document: { body: { classList: { add() {}, remove() {} } }, addEventListener() {}, hidden: false },
        window: { localStorage: geraet, addEventListener() {}, setTimeout, clearTimeout },
        KONFIG: {
            APP_VERSION: "test",
            speicher: {
                modus: "gemeinsam", firebaseBasis: BASIS, spielerPfad: "spieler", spielPfad: "typoluck",
                /* Lange Verzögerung: Geschrieben wird im Test nur mit `sofortSchreiben`. */
                abfrageIntervallMs: 5000, schreibVerzoegerungMs: 600000,
                lokalerSchluesselSpieler: "typoluck.spieler", lokalerSchluesselSpiel: "typoluck.spiel"
            },
            konto: { apiKey: "test-schluessel", domain: "konten.upcrew.invalid" }
        },
        DIALOG: {
            async frage() { return dialog.antworten.shift(); },
            async eingabe() { return dialog.antworten.shift(); },
            async liste() { return dialog.antworten.shift(); },
            async hinweis(t, x) { dialog.hinweise.push(t + ": " + x); },
            kurzmeldung(t) { dialog.kurz.push(t); }
        },
        NAVIGATION: { zeigen() {} }
    };
    umgebung.globalThis = umgebung;
    vm.createContext(umgebung);

    const quelltext = ["konto.js", "upcrew-abzeichen.js", "upcrew-besitz.js", "fortschritt-kern.js", "fortschritt.js",
        "fortschritt-abgleich.js", "versiegelung.js", "spieler.js", "ich.js", "speicher.js",
        "speicher-konten.js", "abgleich.js", "anmeldung.js"]
        .map((name) => dateisystem.readFileSync(pfad.join(projekt, "js", name), "utf8"))
        .join("\n;\n")
        + "\nObject.assign(globalThis, { KONTO, FORTSCHRITT, FORTSCHRITT_ABGLEICH, SPIELER, ICH, ANMELDUNG,"
        + " Abgleich, SpeicherGemeinsam, SpeicherKonten, speicherErzeugen });";
    vm.runInContext(quelltext, umgebung, { filename: "typoluck-konto-eintrag.js" });

    const { KONTO, SPIELER, ANMELDUNG, KONFIG } = umgebung;
    KONTO.einrichten(KONFIG);
    umgebung.SpeicherGemeinsam.tokenGeber = () => KONTO.token();
    const speicher = umgebung.speicherErzeugen(KONFIG.speicher, "spieler", "typoluck.spieler", null,
        { eigeneUid: () => KONTO.uid(), aufbereiten: (roh) => SPIELER.normalisieren(roh) }).speicher;
    const abgleich = new umgebung.Abgleich(speicher, KONFIG.speicher, {});
    ANMELDUNG.verbinden(abgleich, { hidden: true, innerHTML: "" });
    return { umgebung, KONTO, SPIELER, ANMELDUNG, FORTSCHRITT: umgebung.FORTSCHRITT, abgleich, speicher, dialog };
}

/*
 * Eine Datenbank unter Regel §13 mit Anna (beide Zweige, Besitz, Aussehen je
 * Spiel …) und Bert, der Anna eine Anfrage gestellt hat. Annas öffentlicher
 * Auszug steht so da, wie ihn ein Spiel aus BEIDEN Zweigen rechnet.
 * `stoerung` (Funktion) lässt einzelne Aufrufe scheitern.
 */
function datenbank(eintrag) {
    const fb = firebaseMitRegel(BASIS, REGEL);
    fb.kontoAnlegen(UID, "k-anna@konten.upcrew.invalid", PW);
    fb.kontoAnlegen("uid-bert", "k-bert@konten.upcrew.invalid", PW);
    const anna = eintrag || annaEintrag();
    const bert = { id: "id-bert", name: "Bert", tag: "2222", uid: "uid-bert", kennung: "k-bert", freunde: ["id-anna"] };
    fb.db = { spieler: {
        geaendertAm: 100,
        konten: { [UID]: anna, "uid-bert": bert },
        namen: { anna: { "1234": UID }, bert: { "2222": "uid-bert" } },
        oeffentlich: { "uid-bert": { id: "id-bert", name: "Bert", tag: "2222", freunde: ["id-anna"] } },
        anmeldung: { anna: { [UID]: { k: "k-anna" } }, bert: { "uid-bert": { k: "k-bert" } } }
    } };
    const rechner = appLaden(fb);
    rechner.KONTO.regel = "p12";
    fb.db.spieler.oeffentlich[UID] = kopie(rechner.KONTO.oeffentlichVon(anna, undefined,
        anna.spielzeitOeffentlich === true));

    const echt = fb.fetch;
    fb.stoerung = null;
    fb.fetch = async (adresse, einstellungen) => {
        if (fb.stoerung) {
            const art = fb.stoerung(String(adresse), (einstellungen && einstellungen.method) || "GET");
            if (art === "wirft") {
                throw new Error("offline");
            }
            if (art === "fehler") {
                return { ok: false, status: 500, async json() { return null; } };
            }
        }
        return echt(adresse, einstellungen);
    };
    return fb;
}

/* Anna angemeldet, Spielerliste geladen. */
async function angemeldet(fb) {
    const w = appLaden(fb);
    const an = await w.KONTO.anmelden("k-anna", PW);
    pruefe("Anna ist angemeldet", an.ok, JSON.stringify(an));
    w.abgleich.daten = w.SPIELER.normalisieren(await w.speicher.laden());
    w.abgleich.geladen = true;
    w.ANMELDUNG._uebernehmen(w.abgleich.daten.spieler.find((s) => s.uid === UID));
    /* Der Selbst-Eintrag des ersten Ladens läuft im Hintergrund — abwarten. */
    await warten(15);
    return w;
}

const konto = (fb) => fb.db.spieler.konten[UID];
const auszug = (fb) => fb.db.spieler.oeffentlich[UID].auszug;
const patches = (fb) => fb.aufrufe.filter((a) => a.methode === "PATCH" || a.methode === "PUT").length;

/* Eine Änderung am eigenen Eintrag wie der Bildschirm: aendern, dann schreiben. */
async function ganzSpeichern(w, neu) {
    w.abgleich.aendern(neu);
    await w.abgleich.sofortSchreiben();
    if (w.abgleich.schreibZeitgeber !== null) {
        clearTimeout(w.abgleich.schreibZeitgeber);
        w.abgleich.schreibZeitgeber = null;
    }
}

/* Ein anderes Gerät (oder das andere Spiel) schreibt inzwischen ans Konto. */
function anderesGeraet(fb, aendern) {
    aendern(konto(fb));
    fb.db.spieler.geaendertAm += 1;
}

spaeter("Konto-Eintrag ganz speichern", (async () => {

    /* -------------------------------------------------------------- *
     * 1. Freund annehmen — der Ablauf aus dem Fund
     * -------------------------------------------------------------- */
    {
        const fb = datenbank();
        const w = await angemeldet(fb);
        const vorher = kopie(konto(fb));
        gleich("Ausgang: das Level über beide Zweige (2300 XP) ist 11",
            [auszug(fb).xp, w.FORTSCHRITT.auszugLevel(auszug(fb)).level], [2300, 11]);
        gleich("Ausgang: der erste Start schreibt nichts am Auszug um", auszug(fb).xp, 2300);

        await ganzSpeichern(w, w.SPIELER.freundHinzufuegen(w.abgleich.daten, "id-anna", "id-bert"));
        pruefe("Freund annehmen: die Datenbank nimmt den Eintrag an (Regel §13)",
            w.abgleich.aenderungOffen === false, "Absage: " + fb.letzteAbsage);
        gleich("Freund annehmen: der Freund steht am Konto", konto(fb).freunde, ["id-bert"]);
        gleich("Freund annehmen: der Zweig des anderen Spiels steht unverändert am Konto",
            geordnet(konto(fb).fortschritt.spiele.blunderluck), geordnet(vorher.fortschritt.spiele.blunderluck));
        gleich("Freund annehmen: der eigene Zweig bleibt (XP, Stand)",
            [konto(fb).fortschritt.spiele.typoluck.xp, konto(fb).fortschritt.spiele.typoluck.stand], [300, 4000]);
        gleich("Freund annehmen: der öffentliche Auszug zählt weiter BEIDE Zweige", auszug(fb).xp, 2300);
        gleich("Freund annehmen: das öffentliche Level bleibt 11",
            w.FORTSCHRITT.auszugLevel(auszug(fb)).level, 11);
        gleich("Freund annehmen: Besitz unverändert", konto(fb).besitz, vorher.besitz);
        gleich("Freund annehmen: Aussehen je Spiel unverändert", konto(fb).aussehenJe, vorher.aussehenJe);
        gleich("Freund annehmen: Haken, Lieblingswörter, Stufe unverändert",
            [konto(fb).spielzeitOeffentlich, konto(fb).lieblingswoerter, konto(fb).stufe],
            [vorher.spielzeitOeffentlich, vorher.lieblingswoerter, vorher.stufe]);
        gleich("Freund annehmen: Kennung, Name, Nummer unverändert",
            [konto(fb).id, konto(fb).name, konto(fb).tag, konto(fb).kennung], ["id-anna", "Anna", "1234", "k-anna"]);
    }

    /* -------------------------------------------------------------- *
     * 2. Abzeichen speichern, Freund ablehnen
     * -------------------------------------------------------------- */
    {
        const fb = datenbank();
        const w = await angemeldet(fb);
        const vorher = kopie(konto(fb));
        await ganzSpeichern(w, w.SPIELER.abzeichenSetzen(w.abgleich.daten, "id-anna", ["up-serie", "tl-woerter"]));
        pruefe("Abzeichen: angenommen", w.abgleich.aenderungOffen === false, "Absage: " + fb.letzteAbsage);
        gleich("Abzeichen: stehen am Konto", konto(fb).abzeichen, ["up-serie", "tl-woerter"]);
        gleich("Abzeichen: der Zweig des anderen Spiels steht unverändert am Konto",
            geordnet(konto(fb).fortschritt.spiele.blunderluck), geordnet(vorher.fortschritt.spiele.blunderluck));
        gleich("Abzeichen: der Auszug zählt beide Zweige", auszug(fb).xp, 2300);

        await ganzSpeichern(w, w.SPIELER.freundAblehnen(w.abgleich.daten, "id-anna", "id-bert"));
        gleich("Ablehnen danach: der Zweig des anderen Spiels steht weiter da",
            geordnet(konto(fb).fortschritt.spiele.blunderluck), geordnet(vorher.fortschritt.spiele.blunderluck));
        gleich("Ablehnen danach: abgelehnt steht am Konto", konto(fb).abgelehnt, ["id-bert"]);
    }

    /* -------------------------------------------------------------- *
     * 3. Der erste Start einer Sitzung (Selbst-Eintrag) senkt das
     *    öffentliche Level nicht
     * -------------------------------------------------------------- */
    {
        const fb = datenbank();
        const vorher = patches(fb);
        await angemeldet(fb);
        gleich("Start: der Auszug zählt weiter beide Zweige", auszug(fb).xp, 2300);
        gleich("Start: nichts wird geschrieben, wenn der Auszug stimmt", patches(fb) - vorher, 0);
    }

    /* -------------------------------------------------------------- *
     * 4. Inzwischen hat ein anderes Gerät / das andere Spiel ans Konto
     *    geschrieben: nichts davon geht verloren
     * -------------------------------------------------------------- */
    {
        const fb = datenbank();
        const w = await angemeldet(fb);
        anderesGeraet(fb, (k) => {
            k.fortschritt.spiele.blunderluck.xp = 2150;
            k.fortschritt.spiele.blunderluck.stand = 6000;
            k.fortschritt.spiele.blunderluck.zaehler.muenzenVerdient = 150;
            k.fortschritt.spiele.typoluck.xp = 360;
            k.fortschritt.spiele.typoluck.stand = 7000;
            k.besitz = { kachelset: "blei_neon", schrift: "S3" };
            k.spielzeitOeffentlich = false;
            k.lieblingswoerter = { typoluck: ["kraft", "abend"] };
            k.stufe = { typoluck: { wert: 55, runden: 9, stand: 9 } };
            k.neuesFeld = { a: 1 };
        });
        const frisch = kopie(konto(fb));
        await ganzSpeichern(w, w.SPIELER.freundHinzufuegen(w.abgleich.daten, "id-anna", "id-bert"));
        pruefe("Anderes Gerät: angenommen", w.abgleich.aenderungOffen === false, "Absage: " + fb.letzteAbsage);
        gleich("Anderes Gerät: der eigene Freund steht am Konto", konto(fb).freunde, ["id-bert"]);
        gleich("Anderes Gerät: der Zweig des anderen Spiels wie frisch geladen (nicht die alte Kopie)",
            geordnet(konto(fb).fortschritt.spiele.blunderluck), geordnet(frisch.fortschritt.spiele.blunderluck));
        gleich("Anderes Gerät: der eigene Zweig fällt nicht auf den älteren Stand zurück",
            [konto(fb).fortschritt.spiele.typoluck.xp, konto(fb).fortschritt.spiele.typoluck.stand], [360, 7000]);
        gleich("Anderes Gerät: der Auszug rechnet mit den frischen Zweigen", auszug(fb).xp, 2510);
        gleich("Anderes Gerät: gekaufter Besitz bleibt", konto(fb).besitz, { kachelset: "blei_neon", schrift: "S3" });
        gleich("Anderes Gerät: der Haken „Spielzeit öffentlich\" bleibt, wie er am Konto steht",
            konto(fb).spielzeitOeffentlich, false);
        gleich("Anderes Gerät: Lieblingswörter und Stufe wie am Konto",
            [konto(fb).lieblingswoerter, konto(fb).stufe], [frisch.lieblingswoerter, frisch.stufe]);
        gleich("Anderes Gerät: ein Feld, das Typoluck nicht kennt, bleibt", konto(fb).neuesFeld, { a: 1 });
    }

    /* -------------------------------------------------------------- *
     * 5. Besitz: Vereinigung, nie ersetzen
     * -------------------------------------------------------------- */
    {
        const w = appLaden(datenbank());
        const S = w.SPIELER;
        const server = { spieler: [Object.assign(annaEintrag(), { besitz: { kachelset: "blei_neon", paket: "start" } })] };
        const lokal = { spieler: [Object.assign(annaEintrag(), { besitz: { kachelset: "blei_glas", schrift: "S5" } })] };
        gleich("Besitz: Gerät und Konto werden vereinigt (je Art, sortiert)",
            S.zusammenfuehren(server, lokal, "id-anna").spieler[0].besitz,
            { kachelset: "blei_glas_neon", paket: "start", schrift: "S5" });
        const ohne = { spieler: [Object.assign(annaEintrag(), { besitz: undefined })] };
        gleich("Besitz: fehlt er in der eigenen Kopie, gilt der vom Konto",
            S.zusammenfuehren(server, kopie(ohne), "id-anna").spieler[0].besitz, { kachelset: "blei_neon", paket: "start" });
        gleich("Besitz: fehlt er am Konto, bleibt der eigene",
            S.zusammenfuehren(kopie(ohne), lokal, "id-anna").spieler[0].besitz, { kachelset: "blei_glas", schrift: "S5" });
        const lang = viel(400, (i) => "w" + String(i).padStart(3, "0")).join("_");
        const voll = { spieler: [Object.assign(annaEintrag(), { besitz: { kachelset: lang } })] };
        const zuViel = S.zusammenfuehren(voll, lokal, "id-anna").spieler[0].besitz;
        gleich("Besitz: passt die Vereinigung einer Art nicht in die Regel (2000 Zeichen), bleibt der Text vom Konto",
            [zuViel.kachelset === lang, zuViel.schrift], [true, "S5"]);
    }

    /* -------------------------------------------------------------- *
     * 6. Das Laden vor dem Speichern scheitert: nichts wird geschrieben
     * -------------------------------------------------------------- */
    for (const fall of [
        { name: "ohne Netz", stoerung: (adresse, methode) => (methode === "GET" && adresse.indexOf(BASIS) === 0 ? "wirft" : "") },
        { name: "nur der eigene Eintrag kommt nicht", stoerung: (adresse, methode) =>
            (methode === "GET" && adresse.indexOf("/spieler/konten/" + UID + ".json") !== -1 ? "fehler" : "") }
    ]) {
        const fb = datenbank();
        const w = await angemeldet(fb);
        const vorher = JSON.stringify(konto(fb));
        const geschrieben = patches(fb);
        fb.stoerung = fall.stoerung;
        await ganzSpeichern(w, w.SPIELER.freundHinzufuegen(w.abgleich.daten, "id-anna", "id-bert"));
        gleich("Laden scheitert (" + fall.name + "): nichts geschrieben, die Änderung bleibt offen",
            [patches(fb) - geschrieben, JSON.stringify(konto(fb)) === vorher, w.abgleich.aenderungOffen], [0, true, true]);
        fb.stoerung = null;
        await w.abgleich.sofortSchreiben();
        gleich("… und geht beim nächsten Versuch vollständig hinauf",
            [konto(fb).freunde, (konto(fb).fortschritt.spiele.blunderluck || {}).xp, auszug(fb).xp], [["id-bert"], 2000, 2300]);
    }

    /* -------------------------------------------------------------- *
     * 7. Name und Nummer ändern (js\anmeldung.js → js\konto.js)
     * -------------------------------------------------------------- */
    {
        const fb = datenbank();
        const w = await angemeldet(fb);
        const vorher = kopie(konto(fb));
        w.dialog.antworten = ["Annika"];
        await w.ANMELDUNG.nameAendern();
        gleich("Name ändern: der neue Name steht am Konto und im Verzeichnis",
            [konto(fb).name, fb.db.spieler.namen.annika && fb.db.spieler.namen.annika["1234"], w.dialog.hinweise], ["Annika", UID, []]);
        gleich("Name ändern: beide Zweige stehen unverändert am Konto",
            geordnet(konto(fb).fortschritt), geordnet(vorher.fortschritt));
        gleich("Name ändern: Besitz und der Auszug über beide Zweige bleiben",
            [konto(fb).besitz, auszug(fb).xp], [vorher.besitz, 2300]);

        w.dialog.antworten = ["4321"];
        await w.ANMELDUNG.nummerAendern();
        gleich("Nummer ändern: die neue Nummer steht am Konto", [konto(fb).tag, w.dialog.hinweise], ["4321", []]);
        gleich("Nummer ändern: beide Zweige stehen unverändert am Konto", geordnet(konto(fb).fortschritt), geordnet(vorher.fortschritt));
    }
    {
        const fb = datenbank();
        const w = await angemeldet(fb);
        anderesGeraet(fb, (k) => {
            k.fortschritt.spiele.blunderluck.xp = 2150;
            k.fortschritt.spiele.blunderluck.stand = 6000;
            k.besitz = { kachelset: "blei_neon" };
        });
        w.dialog.antworten = ["Annika"];
        await w.ANMELDUNG.nameAendern();
        gleich("Name ändern nach fremder Änderung: der Name steht am Konto", konto(fb).name, "Annika");
        gleich("Name ändern nach fremder Änderung: der frische Zweig des anderen Spiels bleibt (nicht die alte Kopie)",
            [konto(fb).fortschritt.spiele.blunderluck.xp, konto(fb).fortschritt.spiele.blunderluck.stand], [2150, 6000]);
        gleich("Name ändern nach fremder Änderung: der inzwischen gekaufte Besitz bleibt",
            konto(fb).besitz, { kachelset: "blei_neon" });
        gleich("Name ändern nach fremder Änderung: der Auszug rechnet frisch", auszug(fb).xp, 2450);

        anderesGeraet(fb, (k) => {
            k.fortschritt.spiele.blunderluck.xp = 2200;
            k.fortschritt.spiele.blunderluck.stand = 6500;
        });
        w.dialog.antworten = ["4321"];
        await w.ANMELDUNG.nummerAendern();
        gleich("Nummer ändern nach fremder Änderung: Nummer und frischer Zweig",
            [konto(fb).tag, konto(fb).fortschritt.spiele.blunderluck.xp], ["4321", 2200]);
    }
    {
        const fb = datenbank();
        const w = await angemeldet(fb);
        const vorher = JSON.stringify(konto(fb));
        const geschrieben = patches(fb);
        fb.stoerung = (adresse, methode) => (methode === "GET" && adresse.indexOf("/spieler/konten/" + UID + ".json") !== -1 ? "fehler" : "");
        w.dialog.antworten = ["Annika"];
        await w.ANMELDUNG.nameAendern();
        gleich("Name ändern, Laden scheitert: nichts geschrieben, ein Hinweis",
            [patches(fb) - geschrieben, JSON.stringify(konto(fb)) === vorher, w.dialog.hinweise.length], [0, true, 1]);
        w.dialog.antworten = ["4321"];
        await w.ANMELDUNG.nummerAendern();
        gleich("Nummer ändern, Laden scheitert: nichts geschrieben, ein Hinweis",
            [patches(fb) - geschrieben, JSON.stringify(konto(fb)) === vorher, w.dialog.hinweise.length], [0, true, 2]);
    }

    /* -------------------------------------------------------------- *
     * 8. Die Grenzen der Regel: nichts kürzen, was sie erlaubt
     * -------------------------------------------------------------- */
    {
        const voll = annaEintrag();
        const tag = (i) => new Date(Date.UTC(2023, 0, 1 + i)).toISOString().slice(0, 10);
        voll.fortschritt.schutz = { serie: 1000, Rest: 0.5 };
        voll.fortschritt.spiele.blunderluck = {
            xp: 10000000, partien: 10000000, stand: 9007199254740000,
            gezaehlt: viel(100, (i) => ("p-" + i).padEnd(64, "x")),
            tage: viel(1000, tag),
            taten: viel(1000, (i) => ("t" + i).padEnd(64, "y")),
            heute: { datum: "", versuche: 1000, figuren: 3 },
            turm: { figuren: { "99-99": 3, "0-0": 1 }, schwuere: { "999": 3, "500": 0 } },
            zaehler: { a: 1000000000, [("z").repeat(32)]: 0.5, muenzenVerdient: 77 }
        };
        const fb = datenbank(voll);
        const w = await angemeldet(fb);
        const vorher = kopie(konto(fb));
        await ganzSpeichern(w, w.SPIELER.freundHinzufuegen(w.abgleich.daten, "id-anna", "id-bert"));
        pruefe("Grenzen: ein Zweig am Rand der Regel wird angenommen",
            w.abgleich.aenderungOffen === false, "Absage: " + fb.letzteAbsage);
        gleich("Grenzen: … und steht danach wörtlich wie vorher am Konto (100 Kennungen, 1000 Tage, 1000 Taten, Kommazahl)",
            geordnet(konto(fb).fortschritt.spiele.blunderluck), geordnet(vorher.fortschritt.spiele.blunderluck));
        gleich("Grenzen: `schutz` am Fortschritt bleibt", konto(fb).fortschritt.schutz, { serie: 1000, Rest: 0.5 });
    }

    /* -------------------------------------------------------------- *
     * 9. `fuerKonto`: nichts schicken, was die Regel ablehnt
     * -------------------------------------------------------------- */
    {
        const w = appLaden(datenbank());
        const F = w.FORTSCHRITT;
        const nachbau = new RegelNachbau(REGEL);
        const regelSagt = (fortschritt) => {
            const eintrag = { id: "id-x", name: "Xaver", tag: "1111", uid: "uid-x", fortschritt: fortschritt };
            const baum = { spieler: { geaendertAm: 1, namen: { xaver: { 1111: "uid-x" } } } };
            return nachbau.schreibenPruefen(baum, [{ weg: ["spieler", "konten", "uid-x"], wert: eintrag }],
                { uid: "uid-x", provider: "password" });
        };
        const wild = { version: 1, oben: "fremd", schutz: { ok: 3, "mit-strich": 1, viel: 5000, text: "x" }, spiele: {
            typoluck: EIGENER(),
            blunderluck: {
                xp: 99999999999, partien: -5, stand: 17, fremd: 1, umzug: { alt: 1 },
                gezaehlt: viel(130, (i) => "p-" + i).concat(["x".repeat(80), 7]),
                tage: ["2026-10-01", "kein-datum", 5],
                taten: { 0: "a", 2: "c", x: "nicht" },
                heute: { datum: "falsch", versuche: 5000, figuren: 9, extra: true },
                turm: { figuren: { "1-0": 3, "1-1": 9, "1-2": 0, "x-1": 2, "123-1": 1 }, schwuere: [null, 2, 9], fremd: 1 },
                zaehler: { figuren: 3, "mit-strich": 2, text: "a", riesig: 5e12 }
            },
            drittes: { xp: 5 }
        } };
        const form = F.fuerKonto(wild);
        const ergebnis = regelSagt(form);
        pruefe("fuerKonto: ein wilder fremder Zweig besteht danach die Regel §13", ergebnis.ok, ergebnis.grund);
        gleich("fuerKonto: nur die Spiele, die die Regel kennt", Object.keys(form.spiele).sort(), ["blunderluck", "typoluck"]);
        const b = form.spiele.blunderluck;
        gleich("fuerKonto: fremder Zweig — nur Felder der Regel", Object.keys(b).sort(),
            ["gezaehlt", "heute", "partien", "stand", "tage", "taten", "turm", "xp", "zaehler"]);
        gleich("fuerKonto: fremder Zweig — Zahlen in den Grenzen", [b.xp, b.partien, b.stand], [10000000, 0, 17]);
        gleich("fuerKonto: fremder Zweig — Listen: nur Gültiges, höchstens so viele wie die Regel erlaubt",
            [b.gezaehlt.length, b.gezaehlt[99], b.tage, b.taten], [100, "p-129", ["2026-10-01"], ["a", "c"]]);
        gleich("fuerKonto: fremder Zweig — heute, Turm, Zähler bereinigt",
            [b.heute, b.turm, b.zaehler],
            [{ versuche: 1000, figuren: 3 }, { figuren: { "1-0": 3, "1-1": 3 }, schwuere: { 1: 2, 2: 3 } },
                { figuren: 3, riesig: 1000000000 }]);
        gleich("fuerKonto: `schutz` nur mit Buchstaben-Namen und Zahlen bis 1000", form.schutz, { ok: 3, viel: 1000 });
        gleich("fuerKonto: oben sonst nichts", Object.keys(form).sort(), ["schutz", "spiele", "version"]);
        gleich("fuerKonto: ohne fremden Zweig nur der eigene, ohne `schutz`",
            [Object.keys(F.fuerKonto({ spiele: { typoluck: EIGENER() } }).spiele), "schutz" in F.fuerKonto({})],
            [["typoluck"], false]);
        gleich("fuerKonto: der eigene Zweig ist derselbe, ob ein fremder dabei ist oder nicht",
            F.fuerKonto(wild).spiele.typoluck, F.fuerKonto({ spiele: { typoluck: EIGENER() } }).spiele.typoluck);

        /* Das Senden nach einer Runde schreibt weiter NUR den eigenen Zweig. */
        w.umgebung.FORTSCHRITT_ABGLEICH.einrichten(null, () => null, () => null);
        gleich("Runden-Senden: weiter nur Teilpfade des eigenen Zweigs",
            Object.keys(w.umgebung.FORTSCHRITT_ABGLEICH.aenderungen("uid-x", wild, 5)).sort(),
            ["geaendertAm", "konten/uid-x/fortschritt/spiele/typoluck", "konten/uid-x/fortschritt/version"]);
    }

    /* -------------------------------------------------------------- *
     * 10. Zusammenführen des Fortschritts im eigenen Eintrag
     *     (seit 0.34.3: der eigene Zweig FELDWEISE wie der Kern —
     *     die neuere Fassung, Zähler je Name das Maximum; wörtlich,
     *     nichts umgerechnet)
     * -------------------------------------------------------------- */
    {
        const w = appLaden(datenbank());
        const S = w.SPIELER;
        const F = w.FORTSCHRITT;
        const mit = (aendern) => {
            const e = annaEintrag();
            aendern(e);
            return { spieler: [e] };
        };
        const tl = (daten) => daten.spieler[0].fortschritt.spiele.typoluck;
        const eigen = (server, lokal) => S.zusammenfuehren(server, lokal, "id-anna").spieler[0].fortschritt.spiele.typoluck;
        const server = mit((e) => { e.fortschritt.spiele.blunderluck.xp = 2500; e.fortschritt.spiele.typoluck.stand = 3000; });
        const lokal = mit((e) => { e.fortschritt.spiele.blunderluck.xp = 1; e.fortschritt.spiele.typoluck.xp = 310; });
        const f = S.zusammenfuehren(server, lokal, "id-anna").spieler[0].fortschritt;
        gleich("Zusammenführen: fremder Zweig vom Konto, eigener Zweig die neuere Fassung (hier: die eigene Kopie)",
            [f.spiele.blunderluck.xp, f.spiele.typoluck.xp, f.spiele.typoluck.stand], [2500, 310, 4000]);
        const ohneFremd = mit((e) => { delete e.fortschritt.spiele.blunderluck; });
        gleich("Zusammenführen: fehlt der fremde Zweig am Konto, wird er nicht aus der alten Kopie zurückgeholt",
            Object.keys(S.zusammenfuehren(ohneFremd, lokal, "id-anna").spieler[0].fortschritt.spiele), ["typoluck"]);
        const ohneFortschritt = mit((e) => { delete e.fortschritt; });
        const ohne = S.zusammenfuehren(ohneFortschritt, lokal, "id-anna").spieler[0].fortschritt;
        gleich("Zusammenführen: hat das Konto gar keinen Fortschritt, kommt nur der EIGENE Zweig aus der Kopie (kein fremder)",
            [Object.keys(ohne.spiele), ohne.spiele.typoluck.xp, "schutz" in ohne], [["typoluck"], 310, false]);
        gleich("Zusammenführen: weder Konto noch Kopie mit Fortschritt — es entsteht keiner",
            "fortschritt" in S.zusammenfuehren(ohneFortschritt, kopie(ohneFortschritt), "id-anna").spieler[0], false);
        const ohneEigen = mit((e) => { delete e.fortschritt; });
        const nurFremd = mit((e) => { delete e.fortschritt.spiele.typoluck; });
        gleich("Zusammenführen: Konto ohne Fortschritt, Kopie nur mit fremdem Zweig — kein Fortschritt",
            "fortschritt" in S.zusammenfuehren(ohneEigen, nurFremd, "id-anna").spieler[0], false);
        gleich("Zusammenführen: fehlt der Fortschritt in der eigenen Kopie, gilt der vom Konto",
            S.zusammenfuehren(server, ohneFortschritt, "id-anna").spieler[0].fortschritt.spiele.blunderluck.xp, 2500);
        const fremder = S.zusammenfuehren(server, lokal, "id-niemand").spieler[0];
        gleich("Zusammenführen: ein fremder Eintrag kommt unverändert vom Server", fremder.fortschritt.spiele.blunderluck.xp, 2500);

        /* Das Gerät ist weiter als das Konto (Prüfung Ablauf B: das Konto
           ging rückwärts — eine nachgehende Uhr hat per Teilpfad gesendet). */
        const zweig = (stand, xp, zaehler, taten) => Object.assign(EIGENER(), { stand: stand, xp: xp, zaehler: zaehler },
            taten ? { taten: taten } : {});
        const kontoB = mit((e) => { e.fortschritt.spiele.typoluck = zweig(8000, 560, { muenzenVerdient: 80, tagesaufgaben: 5 }, ["serie-7", "neu-b"]); });
        const kopieB = mit((e) => { e.fortschritt.spiele.typoluck = zweig(9000, 500, { muenzenVerdient: 50, tagesaufgaben: 4 }); });
        const b = eigen(kontoB, kopieB);
        gleich("Gerät weiter als Konto: die neuere Fassung (stand 9000), die Zähler je Name das Maximum (80 Münzen, 5 Aufgaben)",
            [b.stand, b.xp, b.zaehler.muenzenVerdient, b.zaehler.tagesaufgaben], [9000, 500, 80, 5]);
        const kern = F.zusammenfuehren({ version: 1, spiele: { typoluck: tl(kopieB) } },
            { version: 1, spiele: { typoluck: tl(kontoB) } }).spiele.typoluck;
        gleich("Gerät weiter als Konto: dieselben Zähler und derselbe Stand wie FORTSCHRITT.zusammenfuehren (Kern)",
            [b.stand, b.zaehler.muenzenVerdient, b.zaehler.tagesaufgaben],
            [kern.stand, kern.zaehler.muenzenVerdient, kern.zaehler.tagesaufgaben]);
        gleich("Gerät weiter als Konto: wörtlich — nichts in Geräte-Form umgerechnet (kein `gezaehlt` dazu, keine Null-Zähler)",
            [Object.keys(b).sort(), Object.keys(b.zaehler).sort()],
            [Object.keys(tl(kopieB)).sort(), ["muenzenVerdient", "tagesaufgaben"]]);

        /* Das Konto ist weiter als das Gerät (der Fall, für den 0.34.2 „der
           neuere gewinnt" gewählt hatte: die alte Kopie schrieb einen
           frischeren Konto-Stand zurück). */
        const kontoW = mit((e) => { e.fortschritt.spiele.typoluck = zweig(7000, 360, { muenzenVerdient: 90, figuren: 6 }); });
        const kopieW = mit((e) => { e.fortschritt.spiele.typoluck = zweig(4000, 300, { muenzenVerdient: 40, figuren: 6 }); });
        const k = eigen(kontoW, kopieW);
        gleich("Konto weiter als Gerät: der frischere Konto-Stand bleibt (stand 7000, xp 360, 90 Münzen)",
            [k.stand, k.xp, k.zaehler.muenzenVerdient], [7000, 360, 90]);

        /* Beide haben Verschiedenes. */
        const kontoV = mit((e) => { e.fortschritt.spiele.typoluck = zweig(7000, 360, { muenzenVerdient: 90, figuren: 6 }); });
        const kopieV = mit((e) => { e.fortschritt.spiele.typoluck = zweig(4000, 300, { muenzenVerdient: 40, figuren: 9, tagesaufgaben: 4 }); });
        const v = eigen(kontoV, kopieV);
        gleich("Beide verschieden: neuere Fassung vom Konto, jeder Zähler das Maximum beider Seiten",
            [v.stand, v.xp, v.zaehler], [7000, 360, { muenzenVerdient: 90, figuren: 9, tagesaufgaben: 4 }]);
        const kontoG = mit((e) => { e.fortschritt.spiele.typoluck = zweig(5000, 333, { muenzenVerdient: 10 }); });
        const kopieG = mit((e) => { e.fortschritt.spiele.typoluck = zweig(5000, 111, { muenzenVerdient: 20 }); });
        const g = eigen(kontoG, kopieG);
        gleich("Gleicher Stand: das Konto gilt, die Zähler das Maximum",
            [g.xp, g.zaehler.muenzenVerdient], [333, 20]);

        /* Fund 2: Name, Nummer, Kennung, Gast, neuVerbinden, uid vom Konto. */
        const kontoN = mit((e) => {
            Object.assign(e, { name: "Annika", tag: "5555", kennung: "k-neu", neuVerbinden: true });
        });
        const kopieN = mit((e) => {
            Object.assign(e, { gast: true, freunde: ["id-bert"], abzeichen: ["up-serie"] });
        });
        const n = S.zusammenfuehren(kontoN, kopieN, "id-anna").spieler[0];
        gleich("Mit Konto: Name, Nummer, Kennung, Gast, neuVerbinden, uid wie am frisch geladenen Konto",
            [n.name, n.tag, n.kennung, "gast" in n, n.neuVerbinden, n.uid], ["Annika", "5555", "k-neu", false, true, UID]);
        gleich("Mit Konto: die eigenen Änderungen (Freunde, Abzeichen) kommen weiter aus der Kopie",
            [n.freunde, n.abzeichen], [["id-bert"], ["up-serie"]]);
        const lokalerModus = { spieler: [{ id: "id-l", name: "Alt", freunde: [] }] };
        const lokalNeu = { spieler: [{ id: "id-l", name: "Neu", freunde: [] }] };
        gleich("Ohne Konto (lokaler Modus, kein `uid` am Server-Eintrag): der Name aus der Kopie gilt weiter",
            S.zusammenfuehren(lokalerModus, lokalNeu, "id-l").spieler[0].name, "Neu");

        /* Fund 5: was am Konto fehlt, holt die alte Kopie nicht zurück. */
        const kontoL = mit((e) => { delete e.lieblingswoerter; delete e.stufe; });
        const l = S.zusammenfuehren(kontoL, mit(() => {}), "id-anna").spieler[0];
        gleich("Fehlen Lieblingswörter und Stufe am Konto, kommen sie nicht aus der Kopie zurück",
            ["lieblingswoerter" in l, "stufe" in l], [false, false]);
    }

    /* -------------------------------------------------------------- *
     * 11. Ablauf B: das Konto ging rückwärts (zweites Gerät mit
     *     nachgehender Uhr), dann Freund annehmen — keine Münze geht
     *     verloren
     * -------------------------------------------------------------- */
    {
        const e = annaEintrag();
        e.fortschritt.spiele.typoluck = Object.assign(EIGENER(), { stand: 9000, xp: 500,
            zaehler: { muenzenVerdient: 50, tagesaufgaben: 4 } });
        const fb = datenbank(e);
        const w = await angemeldet(fb);
        anderesGeraet(fb, (k) => {
            k.fortschritt.spiele.typoluck = Object.assign(EIGENER(), { stand: 8000, xp: 560,
                zaehler: { muenzenVerdient: 80, tagesaufgaben: 5 }, taten: ["serie-7", "neu-b"] });
        });
        const vorher = kopie(konto(fb));
        await ganzSpeichern(w, w.SPIELER.freundHinzufuegen(w.abgleich.daten, "id-anna", "id-bert"));
        pruefe("Ablauf B: angenommen (Regel §13)", w.abgleich.aenderungOffen === false, "Absage: " + fb.letzteAbsage);
        const t = konto(fb).fortschritt.spiele.typoluck;
        gleich("Ablauf B: Münzen und Aufgaben je Name das Maximum (80, 5), Stand die neuere Fassung (9000)",
            [t.stand, t.zaehler.muenzenVerdient, t.zaehler.tagesaufgaben], [9000, 80, 5]);
        gleich("Ablauf B: der Zweig des anderen Spiels unverändert",
            geordnet(konto(fb).fortschritt.spiele.blunderluck), geordnet(vorher.fortschritt.spiele.blunderluck));

        /* Danach arbeitet FORTSCHRITT_ABGLEICH nicht dagegen: Der Stand am
           Konto ist keiner, den es nicht schon gab — ein Gerät mit 8000
           holt die Fassung 9000 (wie bisher), eins mit 9000 sendet nichts. */
        gleich("Ablauf B: der geschriebene Stand ist der höhere der beiden (kein neuer erfunden)", t.stand, 9000);
    }

    /* -------------------------------------------------------------- *
     * 12. Name / Nummer / Freigabe hat ein anderes Gerät geändert
     *     (Abläufe C, K, F)
     * -------------------------------------------------------------- */
    {
        /* C: Nummer anderswo 1234 → 5555, hier Freund annehmen. */
        const fb = datenbank();
        const w = await angemeldet(fb);
        anderesGeraet(fb, (k) => { k.tag = "5555"; });
        fb.db.spieler.namen.anna = { "5555": UID };
        await ganzSpeichern(w, w.SPIELER.freundHinzufuegen(w.abgleich.daten, "id-anna", "id-bert"));
        pruefe("Ablauf C: Freund annehmen nach fremder Nummernänderung wird angenommen",
            w.abgleich.aenderungOffen === false, "Absage: " + fb.letzteAbsage);
        gleich("Ablauf C: Freund und neue Nummer stehen am Konto", [konto(fb).freunde, konto(fb).tag], [["id-bert"], "5555"]);

        /* … danach hier die Nummer ändern: der ECHTE alte Platz wird frei. */
        w.dialog.antworten = ["7777"];
        await w.ANMELDUNG.nummerAendern();
        gleich("Ablauf C: Nummer ändern danach — neue Nummer, kein verwaister Platz",
            [konto(fb).tag, fb.db.spieler.namen.anna, w.dialog.hinweise], ["7777", { "7777": UID }, []]);
    }
    {
        /* K: Nummer anderswo geändert, hier Name ändern (Kopie noch alt). */
        const fb = datenbank();
        const w = await angemeldet(fb);
        anderesGeraet(fb, (k) => { k.tag = "5555"; });
        fb.db.spieler.namen.anna = { "5555": UID };
        w.dialog.antworten = ["Annika"];
        await w.ANMELDUNG.nameAendern();
        gleich("Ablauf K: Name ändern — die Nummer springt nicht zurück, kein verwaister Platz",
            [konto(fb).name, konto(fb).tag, fb.db.spieler.namen.annika, fb.db.spieler.namen.anna || null, w.dialog.hinweise],
            ["Annika", "5555", { "5555": UID }, null, []]);
    }
    {
        /* Name anderswo geändert, hier Freund annehmen. */
        const fb = datenbank();
        const w = await angemeldet(fb);
        anderesGeraet(fb, (k) => { k.name = "Annika"; });
        delete fb.db.spieler.namen.anna;
        fb.db.spieler.namen.annika = { "1234": UID };
        delete fb.db.spieler.anmeldung.anna;
        fb.db.spieler.anmeldung.annika = { [UID]: { k: "k-anna" } };
        await ganzSpeichern(w, w.SPIELER.freundHinzufuegen(w.abgleich.daten, "id-anna", "id-bert"));
        pruefe("Name anderswo geändert: Freund annehmen wird angenommen",
            w.abgleich.aenderungOffen === false, "Absage: " + fb.letzteAbsage);
        gleich("Name anderswo geändert: der neue Name bleibt am Konto", konto(fb).name, "Annika");
    }
    {
        /* F: Ein Admin hat das Konto zum Neu-Verbinden freigegeben. */
        const fb = datenbank();
        const w = await angemeldet(fb);
        anderesGeraet(fb, (k) => { k.neuVerbinden = true; });
        await ganzSpeichern(w, w.SPIELER.freundHinzufuegen(w.abgleich.daten, "id-anna", "id-bert"));
        pruefe("Ablauf F: angenommen", w.abgleich.aenderungOffen === false, "Absage: " + fb.letzteAbsage);
        gleich("Ablauf F: die Freigabe zum Neu-Verbinden bleibt", konto(fb).neuVerbinden, true);
    }

    /* -------------------------------------------------------------- *
     * 13. Was am Konto fehlt, kommt nicht aus der alten Kopie zurück
     *     (Abläufe D, E)
     * -------------------------------------------------------------- */
    {
        const fb = datenbank();
        const w = await angemeldet(fb);
        anderesGeraet(fb, (k) => { delete k.lieblingswoerter; });
        await ganzSpeichern(w, w.SPIELER.freundHinzufuegen(w.abgleich.daten, "id-anna", "id-bert"));
        pruefe("Ablauf D: angenommen", w.abgleich.aenderungOffen === false, "Absage: " + fb.letzteAbsage);
        gleich("Ablauf D: am Konto gelöschte Lieblingswörter bleiben weg", "lieblingswoerter" in konto(fb), false);
    }
    {
        const fb = datenbank();
        const w = await angemeldet(fb);
        anderesGeraet(fb, (k) => { delete k.fortschritt; });
        await ganzSpeichern(w, w.SPIELER.freundHinzufuegen(w.abgleich.daten, "id-anna", "id-bert"));
        pruefe("Ablauf E: angenommen (Regel §13)", w.abgleich.aenderungOffen === false, "Absage: " + fb.letzteAbsage);
        gleich("Ablauf E: Konto ohne Fortschritt — nur der eigene Zweig kommt zurück, nicht der des anderen Spiels",
            [Object.keys(konto(fb).fortschritt.spiele), konto(fb).fortschritt.spiele.typoluck.xp], [["typoluck"], 300]);
    }

    /* -------------------------------------------------------------- *
     * 14. Abgelehntes Schreiben: die Wartezeit wächst (500 ms, 1 s,
     *     2 s … höchstens 30 s), nach einem Erfolg wieder 500 ms
     * -------------------------------------------------------------- */
    {
        const w = appLaden(datenbank());
        const U = w.umgebung;
        const geplant = [];
        let scheitern = true;
        const speicher = {
            art: "gemeinsam", beschreibung: "test",
            async laden() { return { spieler: [] }; },
            async speichern() { if (scheitern) { throw new Error("abgelehnt"); } }
        };
        const a = new U.Abgleich(speicher, { schreibVerzoegerungMs: 500, abfrageIntervallMs: 5000 }, {});
        const echtSetzen = U.setTimeout;
        const echtLoeschen = U.clearTimeout;
        U.setTimeout = (f, ms) => { geplant.push(ms); return 1; };
        U.clearTimeout = () => {};
        try {
            a.aenderungOffen = true;
            for (let i = 0; i < 8; i++) {
                await a.schreiben();
            }
            gleich("Wiederholung: die Wartezeit verdoppelt sich je Fehlschlag, höchstens 30 s",
                geplant, [500, 1000, 2000, 4000, 8000, 16000, 30000, 30000]);
            gleich("Wiederholung: die Änderung bleibt offen", a.aenderungOffen, true);
            scheitern = false;
            await a.schreiben();
            scheitern = true;
            geplant.length = 0;
            a.aenderungOffen = true;
            await a.schreiben();
            gleich("Wiederholung: nach einem Erfolg beginnt sie wieder bei 500 ms", geplant, [500]);
        } finally {
            U.setTimeout = echtSetzen;
            U.clearTimeout = echtLoeschen;
        }
    }
})());

fazit();
