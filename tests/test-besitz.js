/*
 * test-besitz.js — der Besitz aus dem Shop (seit 0.31.0, js\besitz.js) und
 * der Kauf eines Stücks (js\app.js `kaufenStueck`, `kaufOffenAufloesen`).
 *
 * Es laufen die ECHTEN Dateien: js\besitz.js, der Baustein
 * js\upcrew-besitz.js, Katalog, Münzen, Fortschritt (Kern + Typoluck),
 * js\fortschritt-abgleich.js — und js\app.js selbst (in einem eigenen
 * Kontext; nur Anmeldung und Dokument sind Attrappen). Das Konto spielt die
 * lokale Rückwand (SpeicherLokal), die Datenbank-Regel der Nachbau
 * (regel-nachbau.js) mit dem ECHTEN Regeltext §13 aus
 * ..\UPCrew\Firebase-Regeln (nur gelesen; fehlt er, prüft die Stelle nichts).
 *
 *   1. Gerät: `upcrew.besitz` je Person; fremde Einträge bleiben; Unlesbares
 *      = leer; der Eintrag schrumpft nie.
 *   2. Zwei Personen auf einem Gerät sehen je nur ihren Besitz; nach dem
 *      Abmelden gilt der Gast-Eintrag, nicht der des Kontos.
 *   3. Konto: nur geänderte Arten, mit Marke; die geschriebene Form besteht
 *      die Regel §13 (Länge, Zeichen, Art) — auch am Rand.
 *   4. Abgleich Gerät/Konto: Vereinigung in beide Richtungen, nie ersetzen;
 *      Gast, fehlende Regel, Ablehnung: still.
 *   5. Kauf: zieht Münzen ab und legt Besitz an; zu wenig Münzen = kein
 *      Kauf; doppelter Kauf unmöglich; Reihenfolge Merker → Besitz (Gerät,
 *      Konto) → Fortschritt → Merker weg; ein Gast kauft nur aufs Gerät;
 *      der gebuchte Fortschritt besteht den Datenvertrag und die Regel.
 *   6. Merker „Kauf offen": je Person, nachbuchen genau einmal.
 *   7. Gast → Konto wie der Fortschritt.
 */

const fs = require("fs");
const pfad = require("path");
const vm = require("vm");
const { pruefe, gleich, spaeter, fazit } = require("./pruefer.js");
const { geraetLeeren } = require("./umgebung.js");
require("./kern.js");
global.FORTSCHRITT = require("../js/fortschritt.js");
global.FORTSCHRITT_ABGLEICH = require("../js/fortschritt-abgleich.js");
global.UPCREW_MUENZEN = require("../js/upcrew-muenzen.js") || globalThis.UPCREW_MUENZEN;
global.UPCREW_KATALOG = require("../js/upcrew-katalog.js") || globalThis.UPCREW_KATALOG;
global.UPCREW_BESITZ = require("../js/upcrew-besitz.js");
const BESITZ = require("../js/besitz.js");
const { RegelNachbau } = require("./regel-nachbau.js");

const K = global.UPCREW_KATALOG;
const BE = global.UPCREW_BESITZ;
const M = global.UPCREW_MUENZEN;
const wurzel = pfad.join(__dirname, "..");
const lesen = (name) => fs.readFileSync(pfad.join(wurzel, name), "utf8");

const KONTEN = "typoluck.test-konten";
const OFFEN = "upcrew.kaufOffen.typoluck";
const zustand = { gast: false, uid: null, geladen: true };

/* js\app.js, wie der Browser es lädt — mit den echten Modellen von oben.
   Die Anmeldung: `ich()` kennt die gemerkte Person erst, wenn die
   Spielerliste geladen ist (`zustand.geladen`), wie js\anmeldung.js. */
const welt = { console, Date, Promise, JSON, Math, FORTSCHRITT: global.FORTSCHRITT,
    FORTSCHRITT_ABGLEICH: global.FORTSCHRITT_ABGLEICH, BESITZ, UPCREW_BESITZ: BE, UPCREW_MUENZEN: M, UPCREW_KATALOG: K,
    WORDLE: global.WORDLE, ICH: global.ICH,
    ANMELDUNG: {
        istGast: () => zustand.gast,
        ich: () => ((zustand.geladen && global.ICH.person()) ? { id: global.ICH.person().id, gast: zustand.gast } : null)
    },
    document: { addEventListener() { } } };
vm.createContext(welt);
vm.runInContext(lesen("js/app.js") + "\n;globalThis.APP = APP;", welt, { filename: "app.js" });
const APP = welt.APP;

/* Ein Kachel-Set und ein Paket aus dem Katalog, die es zu kaufen gibt. */
const SET = K.stuecke("kachelset").find((s) => s.weg === "kauf" && s.wirkt === true && typeof s.preis === "number");
const SET2 = K.stuecke("kachelset").filter((s) => s.weg === "kauf" && s.wirkt === true)[1];
const PAKET = K.stuecke("paket").find((s) => s.wirkt === true);
pruefe("Der Katalog führt kaufbare Kachel-Sets und ein kaufbares Paket", !!SET && !!SET2 && !!PAKET);

/* Die Konten-Rückwand: SpeicherLokal, und jedes Schreiben wird mitgeschrieben. */
function rueckwand() {
    const lokal = new SpeicherLokal(KONTEN);
    const w = {
        geschrieben: [],
        ereignisse: [],
        geladen: 0,
        teilLaden: (unterpfad) => { w.geladen++; return lokal.teilLaden(unterpfad); },
        teilSchreiben: async (aenderungen) => {
            const feld = Object.keys(aenderungen).filter((k) => k !== "geaendertAm").map((k) => k.split("/")[2]);
            w.ereignisse.push("konto:" + Array.from(new Set(feld)).join("+"));
            w.geschrieben.push(JSON.parse(JSON.stringify(aenderungen)));
            return lokal.teilSchreiben(aenderungen);
        }
    };
    return w;
}

/* Frisches Gerät; `person` = angemeldete Spieler-Id (ohne: niemand), `gast`,
   `uid` = echtes Konto, `muenzen` = verdient. */
function aufbauen(o) {
    geraetLeeren();
    global.FORTSCHRITT._speicher = () => global.geraet;
    const wand = rueckwand();
    global.FORTSCHRITT_ABGLEICH.einrichten(wand, () => zustand.uid, () => APP.fortschrittId());
    BESITZ.einrichten(wand, () => zustand.uid, () => APP.fortschrittId());
    BESITZ.REGEL = true;
    wechseln(o);
    if (o.muenzen) {
        verdienen(o.muenzen);
    }
    /* Ab hier jedes Schreiben des Geräts mitschreiben (für die Reihenfolge). */
    const geraet = global.geraet;
    const setzen = geraet.setItem;
    const entfernen = geraet.removeItem;
    geraet.setItem = (k, v) => { wand.ereignisse.push("geraet:" + k); setzen(k, v); };
    geraet.removeItem = (k) => { wand.ereignisse.push("geraet-weg:" + k); entfernen(k); };
    return wand;
}

function wechseln(o) {
    zustand.gast = !!o.gast;
    zustand.uid = o.uid || null;
    zustand.geladen = o.geladen !== false;
    if (o.person) {
        ICH.personSetzen(o.person, o.person);
    } else {
        ICH.personVergessen();
    }
}

function verdienen(betrag) {
    global.FORTSCHRITT.aendern(APP.fortschrittId(),
        (stand) => ({ stand: M.verdienen(stand, "typoluck", betrag, 5) }), 5);
}

const ausgegeben = () => (global.FORTSCHRITT.zweig(APP.fortschritt()).zaehler.muenzenAusgegeben || 0);
const besitzRoh = () => JSON.parse(global.geraet.getItem("upcrew.besitz") || "null");
const kontoFeld = (uid) => (((JSON.parse(global.geraet.getItem(KONTEN) || "{}").konten || {})[uid] || {}).besitz) || null;
const warten = () => new Promise((fertig) => setTimeout(fertig, 5));

/* ------------------------------------------------------------------ *
 * 1. Das Gerät  +  2. zwei Personen
 * ------------------------------------------------------------------ */
{
    aufbauen({ person: "anna" });
    gleich("Der Schlüssel im Gerät und der Merker je Spiel", [BESITZ.SCHLUESSEL, BESITZ.offenSchluessel()], ["upcrew.besitz", OFFEN]);
    gleich("Die Kennung der Person kommt aus derselben Funktion wie beim Fortschritt", [BESITZ._id(), APP.fortschrittId()], ["anna", "anna"]);
    gleich("Leeres Gerät: leere Menge", BESITZ.menge(), {});
    BESITZ.geraetDazu("anna", { kachelset: ["neon", "blei"] });
    gleich("Die Form: { <id>: menge }, je Art sortiert", besitzRoh(), { anna: { kachelset: ["blei", "neon"] } });
    BESITZ.geraetDazu("ben", { schrift: ["X9"] });
    BESITZ.geraetDazu("anna", { kachelset: ["glas"] });
    gleich("Fremde Einträge bleiben beim Schreiben stehen; der eigene wächst nur",
        besitzRoh(), { anna: { kachelset: ["blei", "glas", "neon"] }, ben: { schrift: ["X9"] } });
    BESITZ.geraetDazu("anna", {});
    gleich("Nichts dazu: der Eintrag schrumpft nie", BESITZ.geraet("anna"), { kachelset: ["blei", "glas", "neon"] });
    gleich("hat(): die Person von jetzt", [BESITZ.hat("kachelset", "neon"), BESITZ.hat("schrift", "X9")], [true, false]);

    /* 2. zwei Personen, Abmelden */
    BESITZ.geraetDazu("gast", { kachelset: ["sand"] });
    wechseln({ person: "ben" });
    gleich("Zweite Person auf demselben Gerät: nur ihr Besitz", BESITZ.menge(), { schrift: ["X9"] });
    wechseln({});
    gleich("Abgemeldet: der Gast-Eintrag, nicht der des Kontos", [BESITZ._id(), BESITZ.menge()], ["gast", { kachelset: ["sand"] }]);
    wechseln({ person: "anna", gast: true });
    gleich("Als Gast angemeldet: ebenso der Gast-Eintrag", BESITZ.menge(), { kachelset: ["sand"] });
    wechseln({ person: "anna" });
    gleich("Wieder angemeldet: der eigene Besitz ist unverändert da", BESITZ.menge(), { kachelset: ["blei", "glas", "neon"] });

    global.geraet.setItem("upcrew.besitz", "{kaputt");
    gleich("Unlesbares = leere Menge, wirft nie", BESITZ.menge(), {});
    global.geraet.setItem("upcrew.besitz", JSON.stringify({ anna: { "Gross": ["a"], kachelset: ["ok", "nicht ok", 7], x: "a_b" } }));
    gleich("Unpassendes fällt weg (Art, Wert), Text-Form wird gelesen", BESITZ.menge(), { kachelset: ["ok"] });
}

/* ------------------------------------------------------------------ *
 * 3. Die Form am Konto und die Regel §13
 * ------------------------------------------------------------------ */
const REGELDATEI = pfad.join(wurzel, "..", "UPCrew", "Firebase-Regeln", "2026-09-29 NEUE Regel mit 13.txt");
const nachbau = fs.existsSync(REGELDATEI)
    ? new RegelNachbau(JSON.parse(fs.readFileSync(REGELDATEI, "utf8").replace(/^﻿/, ""))) : null;

/* Eine Mehrpfad-Änderung unter `spieler` gegen die Regel fahren. */
function regelSagt(uid, aenderungen, alsUid) {
    const konto = { id: "p-" + uid, name: "Anna", tag: "1234", uid: uid };
    const baum = { spieler: { geaendertAm: 1, namen: { anna: { 1234: uid } }, konten: { [uid]: konto } } };
    const wege = Object.keys(aenderungen).map((k) => ({ weg: ["spieler"].concat(k.split("/")), wert: aenderungen[k] }));
    return nachbau.schreibenPruefen(baum, wege, { uid: alsUid || uid, provider: "password" });
}

{
    const a = BESITZ.aenderungen("u1", { kachelset: ["neon", "blei"], schrift: ["B2", "A1"] }, { schrift: "A1_B2" }, 77);
    gleich("Nur Arten, deren Text sich geändert hat, mit der Marke", a, { "konten/u1/besitz/kachelset": "blei_neon", geaendertAm: 77 });
    gleich("Nichts geändert: nichts zu schreiben", BESITZ.aenderungen("u1", { schrift: ["A1", "B2"] }, { schrift: "A1_B2" }, 77), null);
    gleich("Der Pfad am Konto", BESITZ.pfad("u1"), "konten/u1/besitz");

    /* Am Rand: genau 2000 Zeichen gehen, 2001 lehnt schon das Spiel ab. */
    const werte = Array.from({ length: 399 }, (_, i) => "w" + String(100 + i));
    const genau = { kachelset: werte.concat(["v2345"]) };
    const zuLang = { kachelset: werte.concat(["v23456"]) };
    gleich("Rand: der Text hat genau 2000 bzw. 2001 Zeichen",
        [BE.alsText(genau).feld.kachelset.length, werte.concat(["v23456"]).sort().join("_").length], [2000, 2001]);
    pruefe("2000 Zeichen: wird geschrieben", !!BESITZ.aenderungen("u1", genau, {}, 1));
    gleich("2001 Zeichen: das Spiel schreibt nichts (statt die Regel zu reissen)", BESITZ.aenderungen("u1", zuLang, {}, 1), null);

    if (nachbau) {
        /* Alles, was der Katalog überhaupt verkauft, auf einmal im Besitz. */
        const alles = {};
        for (const s of K.STUECKE.filter((x) => x.weg === "kauf")) {
            alles[s.art] = (alles[s.art] || []).concat([s.wert]);
        }
        const voll = BESITZ.aenderungen("u1", alles, {}, 5);
        gleich("Regel §13: der ganze Katalog im Besitz besteht (jede Art, jeder Wert)", regelSagt("u1", voll).grund, "");
        pruefe("… jeder Text bleibt weit unter 2000 Zeichen",
            Object.keys(voll).filter((k) => k !== "geaendertAm").every((k) => voll[k].length < 500));
        gleich("Regel §13: ein gewöhnlicher Kauf besteht", regelSagt("u1", a).ok, true);
        gleich("Regel §13: genau 2000 Zeichen bestehen", regelSagt("u1", BESITZ.aenderungen("u1", genau, {}, 1)).ok, true);
        /* Gegenprobe: Die Regel wird wirklich ausgewertet. */
        gleich("Gegenprobe: 2001 Zeichen, fremdes Zeichen, falsche Art, fremdes Konto lehnt die Regel ab",
            [regelSagt("u1", { geaendertAm: 1, "konten/u1/besitz/kachelset": "a".repeat(2001) }).ok,
                regelSagt("u1", { geaendertAm: 1, "konten/u1/besitz/kachelset": "blei neon" }).ok,
                regelSagt("u1", { geaendertAm: 1, "konten/u1/besitz/Kachelset": "blei" }).ok,
                regelSagt("u1", { geaendertAm: 1, "konten/u1/besitz/kachelset": ["blei"] }).ok,
                regelSagt("u1", a, "u2").ok],
            [false, false, false, false, false]);
    }
}

/* ------------------------------------------------------------------ *
 * 4. bis 7. — mit Gerät und Konto
 * ------------------------------------------------------------------ */
spaeter("Abgleich, Kauf, Merker, Gast", (async () => {

    /* ---------- 4. Abgleich ---------- */
    let wand = aufbauen({ person: "anna", uid: "u-anna" });
    await wand.teilSchreiben({ "konten/u-anna": { name: "Anna", besitz: { schrift: "A1", kachelset: "glas" } } });
    BESITZ.geraetDazu("anna", { kachelset: ["blei"] });
    wand.geschrieben.length = 0;
    gleich("Abgleich: am Konto war mehr — auf dem Gerät kam etwas dazu", await BESITZ.abgleichen(), true);
    gleich("… das Gerät hat die Vereinigung", BESITZ.menge(), { kachelset: ["blei", "glas"], schrift: ["A1"] });
    gleich("… das Konto auch — geschrieben wurde nur die Art, die abwich",
        [kontoFeld("u-anna"), Object.keys(wand.geschrieben[0]).sort()],
        [{ schrift: "A1", kachelset: "blei_glas" }, ["geaendertAm", "konten/u-anna/besitz/kachelset"]]);
    gleich("… der Name am Konto ist unberührt", JSON.parse(global.geraet.getItem(KONTEN)).konten["u-anna"].name, "Anna");
    wand.geschrieben.length = 0;
    gleich("Abgleich ohne Unterschied: nichts neu, nichts geschrieben", [await BESITZ.abgleichen(), wand.geschrieben.length], [false, 0]);

    wand = aufbauen({ person: "anna", uid: "u-anna" });
    BESITZ.geraetDazu("anna", { kachelset: ["neon"] });
    gleich("Abgleich: nichts am Konto — das Gerät geht hinauf, auf dem Gerät nichts neu",
        [await BESITZ.abgleichen(), kontoFeld("u-anna")], [false, { kachelset: "neon" }]);

    wand = aufbauen({ person: "anna", gast: true, uid: null });
    BESITZ.geraetDazu("gast", { kachelset: ["neon"] });
    gleich("Gast: kein Abgleich, kein Senden, nichts gelesen, nichts geschrieben",
        [await BESITZ.abgleichen(), await BESITZ.senden(), wand.geladen, wand.geschrieben.length], [false, false, 0, 0]);

    wand = aufbauen({ person: "anna", uid: "u-anna" });
    BESITZ.REGEL = false;
    BESITZ.geraetDazu("anna", { kachelset: ["neon"] });
    gleich("Ohne eingespielte Regel: nichts ans Konto", [await BESITZ.abgleichen(), wand.geladen, wand.geschrieben.length], [false, 0, 0]);
    BESITZ.REGEL = null;
    gleich("Ohne Test-Schalter und ohne SpeicherKonten (Node): kein Konto", BESITZ.regelDa(), false);
    BESITZ.REGEL = true;

    aufbauen({ person: "anna", uid: "u-anna" });
    BESITZ.einrichten({
        teilLaden: async () => { throw Object.assign(new Error("401"), { status: 401 }); },
        teilSchreiben: async () => { throw Object.assign(new Error("401"), { status: 401 }); }
    }, () => "u-anna", () => "anna");
    BESITZ.geraetDazu("anna", { kachelset: ["neon"] });
    let geworfen = false;
    try {
        gleich("Abgelehnt: Abgleich false, Senden false", [await BESITZ.abgleichen(), await BESITZ.senden()], [false, false]);
    } catch (fehler) {
        geworfen = true;
    }
    pruefe("Abgelehnt: keine Ausnahme nach aussen, der Besitz bleibt auf dem Gerät",
        !geworfen && BESITZ.hat("kachelset", "neon"));

    /* ---------- Fund 2/3 (seit 0.33.1): Kaufen erst, wenn die Person feststeht und ihr Konto-Besitz
       in dieser Sitzung abgeglichen ist. Sonst wird NICHTS gebucht. ---------- */
    const nichtsGebucht = (w) => [BESITZ.menge(), ausgegeben(), global.geraet.getItem(OFFEN), w.ereignisse, w.geschrieben.length];

    /* Auf dem Gerät ist ein Konto gemerkt, die Spielerliste noch nicht geladen (Start, kein Netz). */
    wand = aufbauen({ person: "anna", uid: null, geladen: false, muenzen: 1000 });
    let warte = APP.kaufenStueck("kachelset", SET.wert);
    await warten();
    gleich("Konto gemerkt, Liste nicht geladen: kein Kauf („laedt“) — kein Merker, kein Besitz, keine Zahlung, nichts geschrieben",
        [warte.ok, warte.grund].concat(nichtsGebucht(wand)), [false, "laedt", {}, 0, null, [], 0]);
    gleich("… APP.kaufBereit sagt nein", APP.kaufBereit(), false);

    /* Angemeldet, die Liste ist da, der Besitz des Kontos noch nicht geholt. Am Konto liegt schon etwas
       (anderes Gerät, anderes Spiel). */
    wand = aufbauen({ person: "anna", uid: "u-anna", muenzen: 1000 });
    await wand.teilSchreiben({ "konten/u-anna/besitz": { kachelset: "glas" } });
    wand.ereignisse.length = 0;
    wand.geschrieben.length = 0;
    warte = APP.kaufenStueck("kachelset", SET.wert);
    await warten();
    gleich("Angemeldet, Konto-Besitz noch nicht abgeglichen: kein Kauf („laedt“), nichts gebucht",
        [warte.ok, warte.grund].concat(nichtsGebucht(wand)), [false, "laedt", {}, 0, null, [], 0]);
    const ladenEcht = wand.teilLaden;
    wand.teilLaden = async () => { throw new Error("kein Netz"); };
    gleich("… scheitert das Holen: weiter kein Kauf",
        [await BESITZ.abgleichen(), APP.kaufenStueck("kachelset", SET.wert).grund, ausgegeben()], [false, "laedt", 0]);
    wand.teilLaden = ladenEcht;
    await BESITZ.abgleichen();
    gleich("… nach dem Abgleich: Kauf gelingt", [APP.kaufBereit(), APP.kaufenStueck("kachelset", SET.wert).ok], [true, true]);
    await warten();
    gleich("… am Konto steht die Vereinigung (erst holen, dann schreiben — nie blind)",
        kontoFeld("u-anna").kachelset, ["glas", SET.wert].sort().join("_"));

    /* Eine andere Person meldet sich auf demselben Gerät an: Der Abgleich galt der ersten. */
    wechseln({ person: "ben", uid: "u-ben" });
    verdienen(1000);
    gleich("Andere Person auf dem Gerät: ihr Konto ist noch nicht abgeglichen — kein Kauf",
        [APP.kaufenStueck("kachelset", SET.wert).grund, ausgegeben()], ["laedt", 0]);

    /* Niemand gemerkt: ein echter Gast kauft wie bisher aufs Gerät. */
    wand = aufbauen({ muenzen: 1000 });
    const niemand = APP.kaufenStueck("kachelset", SET.wert);
    gleich("Niemand gemerkt (Gast): Kauf wie bisher, unter „gast“, nichts ans Konto",
        [niemand.ok, besitzRoh(), wand.geschrieben.length], [true, { gast: { kachelset: [SET.wert] } }, 0]);

    /* ---------- Fund 1 (seit 0.33.1): vor dem Schreiben ans Konto den Stand frisch holen ---------- */
    wand = aufbauen({ person: "anna", uid: "u-anna", muenzen: 1000 });
    await BESITZ.abgleichen();
    /* Nach dem Abgleich kauft ein anderes Gerät (oder Spiel) dieselbe Art. */
    await wand.teilSchreiben({ "konten/u-anna/besitz/kachelset": "glas" });
    gleich("Kauf nach einem fremden Kauf derselben Art: ok", APP.kaufenStueck("kachelset", SET.wert).ok, true);
    await warten();
    gleich("… am Konto bleibt der fremde Kauf (Vereinigung mit dem FRISCHEN Stand)",
        kontoFeld("u-anna").kachelset, ["glas", SET.wert].sort().join("_"));
    pruefe("… und das Gerät hat ihn jetzt auch", BESITZ.hat("kachelset", "glas"));

    wand = aufbauen({ person: "anna", uid: "u-anna", muenzen: 1000 });
    await BESITZ.abgleichen();
    await wand.teilSchreiben({ "konten/u-anna/besitz/kachelset": "glas" });
    const ladenGut = wand.teilLaden;
    wand.teilLaden = async () => { throw new Error("Zeitlimit"); };
    wand.geschrieben.length = 0;
    const ohneNetz = APP.kaufenStueck("kachelset", SET.wert);
    await warten();
    const besitzGeschrieben = () => wand.geschrieben.filter((a) => Object.keys(a).some((k) => k.indexOf("/besitz") !== -1)).length;
    gleich("Holen vor dem Schreiben scheitert: der Kauf gilt auf dem Gerät, ans Konto geht KEIN Besitz (nie mit altem Stand)",
        [ohneNetz.ok, BESITZ.hat("kachelset", SET.wert), besitzGeschrieben(), kontoFeld("u-anna").kachelset], [true, true, 0, "glas"]);
    wand.teilLaden = ladenGut;
    await BESITZ.abgleichen();
    gleich("… beim nächsten Abgleich kommt der Kauf ans Konto, der fremde bleibt",
        kontoFeld("u-anna").kachelset, ["glas", SET.wert].sort().join("_"));

    /* ---------- Fund 6 (seit 0.33.1): scheitert das Schreiben aufs Gerät, wird nicht gebucht ---------- */
    const besitzVoll = () => {
        const setzen = global.geraet.setItem;
        global.geraet.setItem = (k, v) => {
            if (k === "upcrew.besitz") {
                throw new Error("QuotaExceededError");
            }
            setzen(k, v);
        };
    };
    wand = aufbauen({ person: "anna", gast: true, muenzen: 1000 });
    besitzVoll();
    const voll = APP.kaufenStueck("kachelset", SET.wert);
    await warten();
    gleich("Gast, Speicher voll: kein Kauf („speicher“) — kein Besitz, keine Münze, kein Merker",
        [voll.ok, voll.grund, BESITZ.menge(), ausgegeben(), global.geraet.getItem(OFFEN)], [false, "speicher", {}, 0, null]);
    wand = aufbauen({ person: "anna", uid: "u-anna", muenzen: 1000 });
    await BESITZ.abgleichen();
    besitzVoll();
    wand.geschrieben.length = 0;
    const vollKonto = APP.kaufenStueck("kachelset", SET.wert);
    await warten();
    gleich("Konto, Speicher voll: ebenso — und nichts ans Konto",
        [vollKonto.ok, vollKonto.grund, ausgegeben(), global.geraet.getItem(OFFEN), wand.geschrieben.length],
        [false, "speicher", 0, null, 0]);

    /* ---------- 5. Kauf ---------- */
    wand = aufbauen({ person: "anna", uid: "u-anna", muenzen: 1000 });
    await BESITZ.abgleichen();
    const preis = BE.preis(SET, WORDLE.datumText(new Date())).preis;
    const vorher = M.saldo(APP.fortschritt());
    wand.ereignisse.length = 0;
    const r = APP.kaufenStueck("kachelset", SET.wert);
    gleich("Kauf: ok, zum Preis des Katalogs", [r.ok, r.grund, r.preis], [true, "", SET.preis]);
    gleich("Reihenfolge im Zug: Merker → Besitz aufs Gerät → Fortschritt aufs Gerät → Fortschritt ans Konto → Merker weg",
        wand.ereignisse.filter((e) => e.indexOf(KONTEN) === -1),
        ["geraet:" + OFFEN, "geraet:upcrew.besitz", "geraet:upcrew.fortschritt", "konto:fortschritt",
            "geraet-weg:" + OFFEN]);
    await warten();
    pruefe("… der Besitz geht ans Konto, sobald der Konto-Stand frisch geholt ist (seit 0.33.1)",
        wand.ereignisse.indexOf("konto:besitz") !== -1);
    gleich("Der Kauf legt Besitz an", BESITZ.menge(), { kachelset: [SET.wert] });
    gleich("… und zieht die Münzen ab: Guthaben und der Zähler muenzenAusgegeben im eigenen Zweig",
        [M.saldo(APP.fortschritt()), ausgegeben()], [vorher - preis, preis]);
    await warten();
    gleich("Am Konto: der Besitz als Text und der gebuchte Fortschritt",
        [kontoFeld("u-anna"), JSON.parse(global.geraet.getItem(KONTEN)).konten["u-anna"].fortschritt.spiele.typoluck.zaehler.muenzenAusgegeben],
        [{ kachelset: SET.wert }, preis]);
    gleich("Kein Merker bleibt liegen", global.geraet.getItem(OFFEN), null);

    /* Der Datenvertrag lässt die Buchung durch. */
    const gebucht = APP.fortschritt();
    gleich("Datenvertrag: normalisieren und fuerKonto behalten den Zähler",
        [global.FORTSCHRITT.normalisieren(JSON.parse(JSON.stringify(gebucht))).spiele.typoluck.zaehler.muenzenAusgegeben,
            global.FORTSCHRITT.fuerKonto(gebucht).spiele.typoluck.zaehler.muenzenAusgegeben], [preis, preis]);
    if (nachbau) {
        gleich("Regel: der gebuchte Fortschritt besteht (wie nach einem Vorrat-Kauf)",
            regelSagt("u-anna", global.FORTSCHRITT_ABGLEICH.aenderungen("u-anna", gebucht, 9)).grund, "");
        gleich("Regel: was der Kauf ans Konto schrieb, besteht",
            wand.geschrieben.filter((a) => Object.keys(a).some((k) => k.indexOf("/besitz/") !== -1))
                .map((a) => regelSagt("u-anna", a).ok), [true]);
    }

    /* doppelt */
    wand.geschrieben.length = 0;
    const nochmal = APP.kaufenStueck("kachelset", SET.wert);
    await warten();
    gleich("Doppelter Kauf unmöglich: abgelehnt („besitz“), keine Münze, nichts geschrieben",
        [nochmal.ok, nochmal.grund, ausgegeben(), wand.geschrieben.length, BESITZ.menge()],
        [false, "besitz", preis, 0, { kachelset: [SET.wert] }]);

    /* zu wenig */
    wand = aufbauen({ person: "anna", uid: "u-anna", muenzen: SET.preis - 1 });
    await BESITZ.abgleichen();
    wand.ereignisse.length = 0;
    const arm = APP.kaufenStueck("kachelset", SET.wert);
    gleich("Zu wenig Münzen = kein Kauf: abgelehnt mit dem Fehlbetrag, nichts gespeichert",
        [arm.ok, arm.grund, arm.fehlt, BESITZ.menge(), ausgegeben(), wand.ereignisse], [false, "zuWenig", 1, {}, 0, []]);
    gleich("Unbekanntes Stück: abgelehnt", APP.kaufenStueck("kachelset", "gibtesnicht").ok, false);

    /* Paket */
    wand = aufbauen({ person: "anna", uid: "u-anna", muenzen: 5000 });
    await BESITZ.abgleichen();
    const paket = APP.kaufenStueck("paket", PAKET.wert);
    const teile = K.inhalt(PAKET).filter((t) => t.weg === "kauf");
    gleich("Paket: ein Kauf zum Paket-Preis, im Besitz das Paket und jedes kaufbare Teil",
        [paket.ok, ausgegeben(), BESITZ.hat("paket", PAKET.wert), teile.length > 0 && teile.every((t) => BESITZ.hat(t.art, t.wert))],
        [true, PAKET.preis, true, true]);
    await warten();
    if (nachbau) {
        pruefe("Regel: jede Schreibung des Paket-Kaufs besteht",
            wand.geschrieben.length > 0 && wand.geschrieben.every((a) => regelSagt("u-anna", a).ok));
    }

    /* Gast */
    wand = aufbauen({ person: "anna", gast: true, uid: null, muenzen: 1000 });
    const gastKauf = APP.kaufenStueck("kachelset", SET.wert);
    await warten();
    gleich("Ein Gast kauft nur aufs Gerät: unter „gast“, Münzen abgezogen, nichts ans Konto",
        [gastKauf.ok, besitzRoh(), ausgegeben(), wand.geschrieben.length, wand.geladen],
        [true, { gast: { kachelset: [SET.wert] } }, SET.preis, 0, 0]);

    /* ---------- 6. Merker „Kauf offen“ ---------- */
    wand = aufbauen({ person: "anna", muenzen: 1000 });
    /* Abbruch zwischen Besitz und Fortschritt: `buchen` kommt nie an. */
    let abbruch = false;
    try {
        BESITZ.kaufen({ stand: APP.fortschritt(), art: "kachelset", wert: SET.wert, heute: "2026-10-04", jetzt: 50,
            buchen: () => { throw new Error("App zu"); } });
    } catch (fehler) {
        abbruch = true;
    }
    const merker = JSON.parse(global.geraet.getItem(OFFEN));
    gleich("Abbruch: Stück im Besitz, Münzen nicht abgezogen, der Merker liegt — mit der Person",
        [abbruch, BESITZ.hat("kachelset", SET.wert), ausgegeben(), merker.wem, merker.merker],
        [true, true, 0, "anna", { app: "typoluck", art: "kachelset", wert: SET.wert, preis: SET.preis, vorher: 0 }]);
    wechseln({ person: "ben" });
    gleich("Eine andere Person: der Merker bleibt liegen, nichts wird gebucht",
        [APP.kaufOffenAufloesen(), global.geraet.getItem(OFFEN) !== null, ausgegeben()], ["andere", true, 0]);
    wechseln({});
    gleich("Abgemeldet (Gast): ebenso", [APP.kaufOffenAufloesen(), global.geraet.getItem(OFFEN) !== null], ["andere", true]);
    wechseln({ person: "anna" });
    gleich("Die Person von damals: nachgebucht, Merker weg",
        [APP.kaufOffenAufloesen(), ausgegeben(), global.geraet.getItem(OFFEN)], ["nachbuchen", SET.preis, null]);
    gleich("Noch einmal: nichts mehr offen, nicht doppelt gebucht", [APP.kaufOffenAufloesen(), ausgegeben()], ["kein", SET.preis]);

    /* gebucht, verworfen, unlesbar */
    global.geraet.setItem(OFFEN, JSON.stringify({ wem: "anna", merker: merker.merker }));
    gleich("Merker noch da, aber schon gebucht (Abbruch vor dem Löschen): nur löschen",
        [APP.kaufOffenAufloesen(), ausgegeben(), global.geraet.getItem(OFFEN)], ["gebucht", SET.preis, null]);
    global.geraet.setItem(OFFEN, JSON.stringify({ wem: "anna", merker: Object.assign({}, merker.merker, { wert: SET2.wert }) }));
    gleich("Merker ohne Stück im Besitz (Abbruch vor dem Besitz): verworfen, nichts gebucht",
        [APP.kaufOffenAufloesen(), ausgegeben(), global.geraet.getItem(OFFEN)], ["verworfen", SET.preis, null]);
    global.geraet.setItem(OFFEN, "{kaputt");
    gleich("Unlesbarer Merker: gilt als keiner und wird gelöscht", [APP.kaufOffenAufloesen(), global.geraet.getItem(OFFEN)], ["kein", null]);
    global.geraet.setItem(OFFEN, JSON.stringify({ wem: "anna",
        merker: Object.assign({}, merker.merker, { wert: SET2.wert, vorher: ausgegeben() }) }));
    BESITZ.geraetDazu("anna", { kachelset: [SET2.wert] });
    verdienen(1000);
    const naechster = K.stuecke("kachelset").filter((s) => s.weg === "kauf" && s.wirkt === true)[2];
    const davor = ausgegeben();
    gleich("Vor einem neuen Kauf wird ein offener erst aufgelöst (nachgebucht), dann gekauft",
        [APP.kaufenStueck("kachelset", naechster.wert).ok, ausgegeben() - davor, global.geraet.getItem(OFFEN)],
        [true, SET.preis + naechster.preis, null]);

    /* ---------- 7. Gast → Konto ---------- */
    wand = aufbauen({ person: "anna", uid: "u-anna" });
    BESITZ.geraetDazu("gast", { kachelset: ["neon"] });
    BESITZ.geraetDazu("anna", { kachelset: ["blei"] });
    BESITZ.geraetDazu("ben", { kachelset: ["glas"] });
    global.geraet.setItem(OFFEN, JSON.stringify({ wem: "gast", merker: { app: "typoluck", art: "kachelset", wert: "neon", preis: 9, vorher: 0 } }));
    gleich("Gast → Konto: umgezogen", BESITZ.gastZumKonto("anna"), true);
    await warten();
    gleich("… vereinigt im Eintrag der Person, der Gast-Eintrag ist weg, andere bleiben",
        besitzRoh(), { anna: { kachelset: ["blei", "neon"] }, ben: { kachelset: ["glas"] } });
    gleich("… das Konto bekommt die Vereinigung, ein offener Merker des Gasts gehört jetzt der Person",
        [kontoFeld("u-anna"), JSON.parse(global.geraet.getItem(OFFEN)).wem], [{ kachelset: "blei_neon" }, "anna"]);
    gleich("Ohne Gast-Eintrag: nichts umgezogen", [BESITZ.gastZumKonto("anna"), BESITZ.gastZumKonto("gast"), BESITZ.gastZumKonto("")],
        [false, false, false]);
})());

/* ------------------------------------------------------------------ *
 * Eingebunden
 * ------------------------------------------------------------------ */
{
    const app = lesen("js/app.js");
    const index = lesen("index.html");
    pruefe("app.js richtet den Besitz ein — mit derselben Kennung wie der Fortschritt",
        /BESITZ\.einrichten\(APP\.spielerSpeicher, \(\) => APP\._aussehenUid\(\), \(\) => APP\.fortschrittId\(\)\)/.test(app));
    pruefe("Abgleich dort, wo der Fortschritt abgeglichen wird (Anmeldung, Vordergrund)",
        /async _fortschrittHolen\(\) \{\s*const geaendert = await FORTSCHRITT_ABGLEICH\.holen\(\);[\s\S]{0,400}?await BESITZ\.abgleichen\(\)/.test(app));
    pruefe("Nach der Anmeldung wird ein offener Kauf aufgelöst", /await APP\._fortschrittHolen\(\);[\s\S]{0,300}?APP\.kaufOffenAufloesen\(\);/.test(app));
    pruefe("Gebucht wird der Stand des Bausteins auf dem Weg des Vorrat-Kaufs (aendern, dann senden)",
        /_kaufBuchen\(r\) \{\s*const ergebnis = FORTSCHRITT\.aendern\(APP\.fortschrittId\(\), \(\) => \(\{ stand: r\.stand \}\)\);\s*FORTSCHRITT_ABGLEICH\.senden\(ergebnis\.stand\);/.test(app));
    pruefe("Gast → Konto an derselben Stelle wie der Fortschritt (Spielstand sichern)",
        /SPIELZEIT\.gastZumKonto\(ANMELDUNG\.ich\(\)\.id\);[\s\S]{0,400}?BESITZ\.gastZumKonto\(ANMELDUNG\.ich\(\)\.id\);/.test(lesen("js/anmeldung.js")));
    pruefe("index.html lädt js/besitz.js nach dem Fortschritt-Abgleich und vor app.js",
        index.indexOf("js/fortschritt-abgleich.js") < index.indexOf("js/besitz.js") && index.indexOf("js/besitz.js") < index.indexOf("js/app.js"));
    pruefe("Kein Schalter im Code festgestellt (REGEL: null)", /REGEL: null,/.test(lesen("js/besitz.js")));
}

fazit();
