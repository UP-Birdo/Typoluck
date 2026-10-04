/*
 * test-veraltet-app.js — wer die Seiten des Bandes veraltet meldet (seit
 * 0.33.0): das ECHTE js\app.js und js\spielzeit.js in einem eigenen Kontext,
 * mit dem echten Fortschritt (Kern + Typoluck) und dem echten Gerätespeicher
 * (js\ich.js); Navigation, Anmeldung und Konto sind Attrappen, die
 * mitschreiben. Wie die Navigation damit umgeht, prüft test-veraltet.js.
 *
 *   1. Die Stand-Marke: bleibt gleich, solange sich nichts ändert; ändert
 *      sich mit Fortschritt, Besitz, Person, angefangener Runde, wartendem
 *      Ergebnis, Einstellung (Kachel-Set) und dem Tag — auch wenn ein
 *      anderes Spiel im selben Browser schreibt. Die Spielzeit (alle 30 s)
 *      ändert sie NICHT.
 *   2. Auslöser: Kauf und Runden-Ende melden veraltet; neue Spielerdaten,
 *      Aussehen, Fortschritt vom Konto und der eigene Verlauf zeichnen neu
 *      oder melden veraltet, wenn die offene Seite ungestört bleibt.
 *   3. Befund Tabelle 1 Nr. 5: nach der Anmeldung kein doppeltes Zeichnen
 *      im selben Zug; derselbe Verlauf zeichnet nichts; die Rückkehr in die
 *      App ohne Änderung zeichnet nichts.
 */

const fs = require("fs");
const pfad = require("path");
const vm = require("vm");
const { pruefe, gleich, spaeter, fazit } = require("./pruefer.js");
const { geraetLeeren } = require("./umgebung.js");
require("./kern.js");
global.FORTSCHRITT = require("../js/fortschritt.js");

const wurzel = pfad.join(__dirname, "..");
const lesen = (name) => fs.readFileSync(pfad.join(wurzel, name), "utf8");
const app = lesen("js/app.js");

/* Eine Welt: frisches Gerät, js\app.js und js\spielzeit.js geladen. */
function welt(wahl) {
    const o = wahl || {};
    geraetLeeren();
    global.FORTSCHRITT._speicher = () => global.geraet;
    const s = { aufgefrischt: 0, veraltet: 0, verworfen: 0, offen: "start", tag: "2026-10-04", gast: false,
        ich: { id: "anna", name: "Anna" }, geaendert: false, besitzNeu: false, verlauf: {}, beimPruefen: null,
        sichtbar: [], aussehen: null };
    const umgebung = {
        console, Date, Promise, JSON, Math, Object, Array, String, Number,
        FORTSCHRITT: global.FORTSCHRITT, ICH: global.ICH, KONFIG: global.KONFIG,
        WORDLE: { datumText: () => s.tag },
        SPIELER: { freundeVon: () => ({ offen: [] }) },
        KONTO: { aktiv: () => false },
        BESITZ: { SCHLUESSEL: "upcrew.besitz", abgleichen: async () => s.besitzNeu },
        FORTSCHRITT_ABGLEICH: { holen: async () => s.geaendert, mitKonto: (stand) => stand, senden() { } },
        AUSSEHEN_ABGLEICH: { senden() { }, holen: async () => false },
        UPCREW_AUSSEHEN: { SCHLUESSEL: "upcrew.aussehen", beobachten(f) { s.aussehen = f; } },
        ERGEBNISSE: { verlaufLaden: async () => JSON.parse(JSON.stringify(s.verlauf)), ausRunde: (runde) => ({ versuche: 3 }),
            melden: async () => ({}) },
        PROFIL_BILDSCHIRM: { _fuerId: null },
        RANGLISTE_BILDSCHIRM: { standVerwerfen() { s.verworfen++; } },
        DIALOG: { kurzmeldung() { } },
        ANMELDUNG: {
            offen: false,
            ich: () => s.ich,
            istGast: () => s.gast,
            pruefen() {
                if (s.beimPruefen) {
                    s.beimPruefen();
                }
            }
        },
        NAVIGATION: {
            aufgefrischt: 0,
            get aktuell() { return s.offen; },
            auffrischen() { this.aufgefrischt++; s.aufgefrischt++; },
            veralten() { s.veraltet++; },
            markeSetzen() { },
            blaetter: () => (o.blaetter || [])
        },
        document: {
            activeElement: null,
            visibilityState: "visible",
            addEventListener(art, f) {
                if (art === "visibilitychange") {
                    s.sichtbar.push(f);
                }
            }
        }
    };
    vm.createContext(umgebung);
    vm.runInContext(app + "\n;globalThis.APP = APP;", umgebung, { filename: "app.js" });
    vm.runInContext(lesen("js/spielzeit.js") + "\n;globalThis.SPIELZEIT = SPIELZEIT;", umgebung, { filename: "spielzeit.js" });
    s.APP = umgebung.APP;
    s.SPIELZEIT = umgebung.SPIELZEIT;
    s.umgebung = umgebung;
    s.APP._gestartet = true;
    s.APP.abgleich = { geladen: true, daten: {} };
    ICH.personSetzen("anna", "Anna");
    return s;
}

const warten = () => new Promise((fertig) => setImmediate(fertig));

/* ------------------------------------------------------------------ *
 * 1. Die Stand-Marke
 * ------------------------------------------------------------------ */
{
    const s = welt();
    const APP = s.APP;
    const m0 = APP.standMarke();
    gleich("Die Marke nennt Tag und Person", m0.split("|").slice(0, 2), ["2026-10-04", "anna"]);
    gleich("Ohne Änderung bleibt sie gleich (auch beim zehnten Lesen)",
        Array.from({ length: 10 }, () => APP.standMarke()).every((m) => m === m0), true);

    const aenderungen = [
        ["der Fortschritt (eine Runde, Münzen)", () => FORTSCHRITT.aendern("anna", (stand) => {
            const neu = FORTSCHRITT.normalisieren(stand);
            neu.spiele.typoluck = neu.spiele.typoluck || FORTSCHRITT.zweigLeer();
            neu.spiele.typoluck.xp = (neu.spiele.typoluck.xp || 0) + 20;
            return { stand: neu };
        })],
        ["der Besitz (ein Kauf)", () => global.geraet.setItem("upcrew.besitz", JSON.stringify({ anna: { kachelset: ["neon"] } }))],
        ["das Aussehen", () => global.geraet.setItem("upcrew.aussehen", JSON.stringify({ farbwelt: "F2" }))],
        ["eine angefangene Runde", () => ICH.spielstandSetzen("wordle-tag", { versuche: ["TISCH"] })],
        ["ein wartendes Ergebnis", () => ICH.ausstehendSetzen([{ datum: "2026-10-04" }])],
        ["eine Einstellung (Kachel-Set)", () => ICH.einstellungSetzen("kachelset", "neon")],
        ["ein anderes Spiel im selben Browser (fremder Zweig im gemeinsamen Fortschritt)", () => {
            const alle = JSON.parse(global.geraet.getItem("upcrew.fortschritt") || "{}");
            alle.anna = alle.anna || { version: 1, spiele: {} };
            alle.anna.spiele = alle.anna.spiele || {};
            alle.anna.spiele.schwester = { stand: 99, heute: { datum: "2026-10-04", figuren: 2 } };
            global.geraet.setItem("upcrew.fortschritt", JSON.stringify(alle));
        }],
        ["der Tag", () => { s.tag = "2026-10-05"; }],
        ["die Person (Abmeldung)", () => { ICH.personVergessen(); s.gast = true; }]
    ];
    let vorher = m0;
    for (const [name, tun] of aenderungen) {
        tun();
        const jetzt = APP.standMarke();
        pruefe("Die Marke ändert sich: " + name, jetzt !== vorher, vorher + " → " + jetzt);
        gleich("… und bleibt danach wieder stehen (" + name + ")", APP.standMarke(), jetzt);
        vorher = jetzt;
    }
}

/* Die Spielzeit (alle 30 s) macht keine Seite veraltet */
{
    const s = welt();
    const APP = s.APP;
    const S = s.SPIELZEIT;
    const m0 = APP.standMarke();
    const rohVorher = global.geraet.getItem("upcrew.fortschritt");
    S._sichtbarSeit = 1000000;
    S._kontoZuletzt = 1000000;
    const gebucht = S.schritt(true, 1030000);
    gleich("Ein Schritt der Spielzeit bucht 30 s aufs Gerät", [gebucht, global.geraet.getItem("upcrew.fortschritt") !== rohVorher],
        [30, true]);
    gleich("… die Marke bleibt dabei gleich: keine Seite wird dadurch veraltet", APP.standMarke(), m0);
    S.schritt(true, 1060000);
    S.schritt(false, 1090000);
    gleich("… auch nach weiteren Schritten und beim Verbergen der App", APP.standMarke(), m0);

    /* Eine fremde Änderung kurz VOR dem Schritt geht nicht verloren */
    ICH.einstellungSetzen("kachelset", "blei");
    S._sichtbarSeit = 1100000;
    S.schritt(true, 1130000);
    pruefe("Was sich VOR einem Schritt der Spielzeit geändert hat, zählt weiter", APP.standMarke() !== m0);

    pruefe("js\\spielzeit.js bucht über APP.stillSchreiben (und läuft ohne APP wie bisher)",
        /if \(typeof APP !== "undefined" && typeof APP\.stillSchreiben === "function"\) \{\s*APP\.stillSchreiben\(buchen\);\s*\} else \{\s*buchen\(\);/
            .test(lesen("js/spielzeit.js")));
}

/* Ein kaputter Speicher wirft nicht */
{
    const s = welt();
    const echt = ICH._speicher;
    ICH._speicher = () => { throw new Error("gesperrt"); };
    let marke = null;
    try {
        marke = s.APP.standMarke();
    } catch (fehler) {
        marke = "geworfen";
    }
    ICH._speicher = echt;
    pruefe("Gesperrter Speicher: die Marke kommt trotzdem (Tag und Person)", /^2026-10-04\|/.test(String(marke)), String(marke));
}

/* ------------------------------------------------------------------ *
 * 2. + 3. Die Auslöser
 * ------------------------------------------------------------------ */

/* Kauf */
{
    const s = welt();
    const stand = FORTSCHRITT.laden("anna");
    s.APP._kaufBuchen({ stand: stand });
    gleich("Ein gebuchter Kauf meldet alle Seiten veraltet — gezeichnet wird nichts (der Shop zeichnet sich selbst)",
        [s.veraltet, s.aufgefrischt], [1, 0]);
    pruefe("Der Vorrat-Kauf (APP.kaufen) meldet es auch",
        /kaufen\(ware\) \{[\s\S]*?if \(ok\) \{[\s\S]*?APP\._seitenVeralten\(\);\s*\}\s*return \{ ok: ok, grund: ergebnis\.grund \};/.test(app));
    pruefe("Das Runden-Ende (APP.fortschrittMelden) meldet es",
        /fortschrittMelden\(runde\) \{[\s\S]*?FORTSCHRITT_ABGLEICH\.senden\(ergebnis\.stand\);\s*APP\._flammeAktualisieren\(\);[\s\S]{0,120}?APP\._seitenVeralten\(\);/
            .test(app));
}

/* `_seitenVeralten` ohne Navigation (Tests laden app.js allein) */
{
    const s = welt();
    delete s.umgebung.NAVIGATION.veralten;
    let geworfen = false;
    try {
        s.APP._seitenVeralten();
    } catch (fehler) {
        geworfen = true;
    }
    pruefe("_seitenVeralten ohne das Glied der Navigation: tut nichts, wirft nicht", !geworfen);
}

/* Das eigene Tageswort */
spaeter("Tageswort", (async () => {
    const s = welt();
    await s.APP.ergebnisMelden({ datum: "2026-10-04", modus: "tag" });
    gleich("Das eigene Tageswort: die Rangliste verwirft ihren Stand und alle Seiten sind veraltet — sofort und noch einmal, wenn es gesendet ist",
        [s.verworfen, s.veraltet], [2, 2]);
})());

/* Neue Spielerdaten (Abgleich, Anmeldung) */
{
    const s = welt();
    s.APP._beiSpielerDaten();
    gleich("Neue Spielerdaten: die offene Seite wird einmal neu gezeichnet", [s.aufgefrischt, s.veraltet], [1, 0]);

    /* Nr. 5: Die Prüfung meldet gleich an — `_beiAngemeldet` zeichnet schon. */
    s.beimPruefen = () => s.umgebung.NAVIGATION.auffrischen();
    s.APP._beiSpielerDaten();
    gleich("Meldet die Prüfung im selben Zug an (dort wird schon gezeichnet): KEIN zweites Zeichnen (vorher zwei)",
        s.aufgefrischt, 2);
    s.beimPruefen = null;

    s.offen = "sammlung";
    s.APP._beiSpielerDaten();
    gleich("Offen ist die Sammlung (ungestört): nicht zeichnen, aber alle Seiten veraltet", [s.aufgefrischt, s.veraltet], [2, 1]);
    s.offen = "wordle";
    s.APP._beiSpielerDaten();
    gleich("In der Runde ebenso", [s.aufgefrischt, s.veraltet], [2, 2]);
}

/* Das Aussehen */
{
    const s = welt();
    s.APP._aussehenBeobachten();
    s.aussehen({}, "konto");
    gleich("Aussehen geändert: die offene Seite neu", [s.aufgefrischt, s.veraltet], [1, 0]);
    s.offen = "sammlung";
    s.aussehen({}, "andere-app");
    gleich("Aussehen geändert, die Sammlung offen: nicht zeichnen, alle Seiten veraltet", [s.aufgefrischt, s.veraltet], [1, 1]);
}

/* Rückkehr in die App, Fortschritt vom Konto, eigener Verlauf */
spaeter("Rückkehr", (async () => {
    const s = welt();
    s.APP._aussehenBeobachten();
    gleich("Ein Horcher auf die Rückkehr in den Vordergrund steht", s.sichtbar.length, 1);
    s.sichtbar[0]();
    await warten();
    await warten();
    gleich("Rückkehr in die App OHNE Änderung: nichts wird gezeichnet, nichts veraltet (Befund Tabelle 1 Nr. 5)",
        [s.aufgefrischt, s.veraltet], [0, 0]);

    s.geaendert = true;
    await s.APP._fortschrittHolen();
    gleich("Der Fortschritt vom Konto ist neu: die offene Seite einmal", [s.aufgefrischt, s.veraltet], [1, 0]);
    s.offen = "sammlung";
    s.geaendert = false;
    s.besitzNeu = true;
    await s.APP._fortschrittHolen();
    gleich("Neuer Besitz, die Sammlung offen: nicht zeichnen, alle Seiten veraltet", [s.aufgefrischt, s.veraltet], [1, 1]);
    s.besitzNeu = false;
    await s.APP._fortschrittHolen();
    gleich("Nichts neu: nichts", [s.aufgefrischt, s.veraltet], [1, 1]);

    /* Der eigene Verlauf */
    const t = welt();
    await t.APP._eigenenVerlaufLaden();
    gleich("Der Verlauf kommt leer wie zuvor: nichts wird gezeichnet (vorher: der Start jedes Mal)",
        [t.aufgefrischt, t.veraltet], [0, 0]);
    t.verlauf = { "2026-10-03": { versuche: 4 } };
    await t.APP._eigenenVerlaufLaden();
    gleich("Der Verlauf ist neu, der Start offen: einmal zeichnen", [t.aufgefrischt, t.veraltet], [1, 0]);
    await t.APP._eigenenVerlaufLaden();
    gleich("Derselbe Verlauf noch einmal: nichts", [t.aufgefrischt, t.veraltet], [1, 0]);
    t.verlauf = { "2026-10-03": { versuche: 4 }, "2026-10-04": { versuche: 2 } };
    t.offen = "herausforderungen";
    await t.APP._eigenenVerlaufLaden();
    gleich("Der Verlauf ist neu, eine andere Seite offen: alle Seiten veraltet (die Aufgaben zeigen das Tageswort)",
        [t.aufgefrischt, t.veraltet], [1, 1]);
})());

/* Einbindung */
pruefe("app.js gibt der Navigation die Stand-Marke, bevor sie startet",
    app.indexOf("NAVIGATION.frischMarke = () => APP.standMarke();") !== -1
        && app.indexOf("NAVIGATION.frischMarke = () => APP.standMarke();") < app.indexOf("NAVIGATION.starten("));

fazit();
