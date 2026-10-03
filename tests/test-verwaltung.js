/*
 * test-verwaltung.js — die Verwaltung nur für Admins (seit 0.16.3,
 * js/bildschirm-verwaltung.js, Baustein-Vorschlag js/upcrew-spielerliste.js).
 *
 *   1. Nur Admins: Nicht-Admins sehen weder Eintrag noch Seite (auch nicht
 *      über die Adresse); UP#Plus und Rolle „admin" sehen den Einstieg; der
 *      Werkstatt-Schalter &admin wirkt nur auf dem eigenen Rechner.
 *   2. Lexikon: lädt die volle Bewertung erst beim Öffnen nach (nicht in
 *      index.html, nicht im Service Worker); filtern und sortieren.
 *   3. Spielerliste: Zeilen, sortieren, filtern, Details — nur lesen.
 */

const fs = require("fs");
const pfad = require("path");
const vm = require("vm");
const { pruefe, gleich, spaeter, fazit } = require("./pruefer.js");

const wurzel = pfad.join(__dirname, "..");
const lesen = (name) => fs.readFileSync(pfad.join(wurzel, name), "utf8");
const KONTO = require("../js/konto.js");
const SPIELER = require("../js/spieler.js");
require("./kern.js");
const FORTSCHRITT = require("../js/fortschritt.js");
const WB = require("../js/wortbewertung.js");
const WOERTER_DE = require("../js/woerter-de.js");
const SL = require("../js/upcrew-spielerliste.js");

const DATEN = {
    namen: { up: { Plus: "uid-ober" } },
    rollen: { "uid-admin": "admin" },
    spieler: [
        { id: "a", uid: "uid-admin", name: "Anna", tag: "1111",
            fortschritt: { version: 1, spiele: { typoluck: { xp: 900, partien: 30, stand: 1790500000000,
                tage: ["2026-09-25", "2026-09-26", "2026-09-27"], zaehler: { tagesaufgaben: 3, figuren: 5 } },
                blunderluck: { xp: 200, partien: 4, stand: 1790400000000, tage: ["2026-09-24"] } } } },
        { id: "b", uid: "uid-spieler", name: "Ben", tag: "2222",
            fortschritt: { version: 1, spiele: { typoluck: { xp: 50, partien: 2, stand: 1780000000000, tage: ["2026-06-01"] } } } },
        { id: "g", uid: "uid-gast", name: "Gast", tag: "3333", gast: true },
        { id: "u", uid: "uid-ober", name: "UP", tag: "Plus" }
    ]
};

function welt(uid, ort, parameter) {
    const k = {
        console, KONTO, SPIELER, FORTSCHRITT, WORTBEWERTUNG: WB, WOERTER_DE, UPCREW_SPIELERLISTE: SL,
        location: { hostname: ort || "up-birdo.github.io" },
        setTimeout: (f) => f(),
        gezeigt: [],
        eingehaengt: []
    };
    k.KONTO = Object.assign(Object.create(KONTO), { aktiv: () => !!uid, uid: () => uid });
    k.ANMELDUNG = { abgleich: { daten: DATEN } };
    k.WERKSTATT = parameter === undefined ? { aktiv: () => false, _parameter: () => new URLSearchParams("") }
        : { aktiv: () => true, _parameter: () => new URLSearchParams(parameter) };
    k.NAVIGATION = { anmelden(b) { k.bildschirm = b; }, zeigen(id, p, ersetzen) { k.gezeigt.push([id, ersetzen]); } };
    k.document = { head: { appendChild: (el) => k.eingehaengt.push(el) }, createElement: () => ({}) };
    vm.createContext(k);
    vm.runInContext(lesen("js/bildschirm-verwaltung.js") + "\n;globalThis.V = VERWALTUNG_BILDSCHIRM;", k,
        { filename: "bildschirm-verwaltung.js" });
    k.V.anmelden();
    return k;
}

/* Das Menü hinter den drei Balken gibt es seit 0.25.0 nicht mehr (gemeinsame
   Runde 7) — der einzige Weg ist die Zeile in den Einstellungen (1b). */
const NAV_QUELLE = lesen("js/navigation.js");

/* 1. Nur Admins */
{
    const spieler = welt("uid-spieler");
    gleich("Nicht-Admin: nicht erlaubt (kein Knopf in den Einstellungen)", spieler.V.erlaubt(), false);
    const kasten = { kinder: [], appendChild(x) { this.kinder.push(x); } };
    spieler.V.zeigen(kasten);
    gleich("Nicht-Admin über die Adresse: nichts gebaut, zurück zum Start",
        [kasten.kinder.length, spieler.gezeigt], [0, [["start", true]]]);
    gleich("Abgemeldet: nicht erlaubt", welt(null).V.erlaubt(), false);
    gleich("Gast: nicht erlaubt", welt("uid-gast").V.erlaubt(), false);
    /* Seit 0.17.1 (Nutzer 27.09.2026: „nur in den einstellungen … nicht
       doppelt irgendwo"): auch für Admins NIE im Menü, nur erlaubt. */
    gleich("Rolle „admin“: erlaubt", welt("uid-admin").V.erlaubt(), true);
    gleich("UP#Plus: erlaubt", welt("uid-ober").V.erlaubt(), true);
    gleich("Verwaltung öffnet als Blatt (seit 0.25.0)", welt("uid-admin").bildschirm.alsBlatt, true);
    gleich("Werkstatt &admin auf localhost: sichtbar", welt(null, "localhost", "werkstatt&admin").V.erlaubt(), true);
    gleich("Werkstatt &admin ausgeliefert (github.io): wirkt nicht",
        welt(null, "up-birdo.github.io", "werkstatt&admin").V.erlaubt(), false);
    gleich("Werkstatt ohne &admin: nicht sichtbar", welt(null, "localhost", "werkstatt").V.erlaubt(), false);
    pruefe("Kein Menü mehr in der Navigation", !/menueBauen|_imMenue/.test(NAV_QUELLE));
}

/* 1b. Nur EIN Weg: der Knopf in den Einstellungen (seit 0.17.1) */
{
    const einst = lesen("js/bildschirm-einstellungen.js");
    pruefe("Einstellungen: Zeile „Verwaltung“ (Abschnitt Admin) nur mit VERWALTUNG_BILDSCHIRM.erlaubt()",
        /!VERWALTUNG_BILDSCHIRM\.erlaubt\(\)\) \{\s*return \{ art: "admin", zeilen: \[\] \};\s*\}\s*return \{ art: "admin", zeilen: \[\s*\{ zeichen: "werkzeug", titel: "Verwaltung"/.test(einst)
            && /NAVIGATION\.zeigen\("verwaltung"/.test(einst));
    pruefe("Verwaltung meldet sich mit imMenue: false an", /imMenue: false,/.test(lesen("js/bildschirm-verwaltung.js")));
    pruefe("Verwaltung nicht in der Leiste (und damit nicht wischbar)", !/id: "verwaltung"/.test(lesen("js/navigation.js")));
    const wege = fs.readdirSync(pfad.join(wurzel, "js")).filter((d) => d.endsWith(".js") && d !== "bildschirm-verwaltung.js")
        .filter((d) => !d.startsWith("upcrew-") && /["']verwaltung["']/.test(lesen("js/" + d)));
    gleich("Kein zweiter Weg: nur die Einstellungen nennen den Bildschirm", wege, ["bildschirm-einstellungen.js"]);
}

/* 2. Lexikon — seit 0.18.1 NICHT mehr ausgeliefert (Nutzer 28.09.2026:
   „soll nicht öffentlich sein"): ohne Admin-Quelle nur „Nur im Werkzeug". */
spaeter("Lexikon", (async () => {
    const k = welt("uid-admin");
    gleich("Ohne Quelle: kein Lexikon", k.V.lexikonDa(), false);
    let abgelehnt = "";
    await k.V.lexikonLaden().catch((f) => { abgelehnt = f.message; });
    gleich("… Laden lehnt ab, lädt kein Skript nach", [abgelehnt, k.eingehaengt.length], ["nur-werkzeug", 0]);
    pruefe("… der Bildschirm zeigt „Nur im Werkzeug“", /text: "Nur im Werkzeug"/.test(lesen("js/bildschirm-verwaltung.js")));
    pruefe("js/lexikon-daten.js liegt nicht mehr in js/ und nirgends in index.html oder sw.js",
        !fs.existsSync(pfad.join(wurzel, "js", "lexikon-daten.js"))
            && lesen("index.html").indexOf("lexikon-daten") === -1 && lesen("sw.js").indexOf("lexikon-daten") === -1);
    pruefe("Das Deploy-Skript sperrt lexikon-daten.js und wortbewertung-voll.js",
        /"lexikon-daten\.js"/.test(lesen("tools/Deploy-Typoluck.ps1"))
            && /"wortbewertung-voll\.js"/.test(lesen("tools/Deploy-Typoluck.ps1")));
    /* Die reinen Funktionen bleiben für die spätere Admin-Quelle. */
    const vollDatei = pfad.join(wurzel, "werkzeug", "wortbewertung-voll.js");
    if (fs.existsSync(vollDatei)) {
        const voll = require(vollDatei);
        k.V.LEXIKON_QUELLE = () => voll;
        gleich("Mit Quelle: geladen", (await k.V.lexikonLaden()).anzahl, WOERTER_DE.loesungen.length);
        const zeilen = k.V.lexikonZeilen(voll);
        gleich("Alle Lösungswörter im Lexikon", zeilen.length, WOERTER_DE.loesungen.length);
        const f = { suche: "", stufe: "3", vokale: "1", umlaut: false, doppelt: false, nach: "zahl" };
        const schwer = k.V.lexikonFiltern(zeilen, f);
        pruefe("Filter: nur schwer mit einem Vokal, absteigend nach Zahl",
            schwer.length > 0 && schwer.every((z) => z.stufe === 3 && z.vokale === 1)
                && schwer.every((z, i) => i === 0 || schwer[i - 1].zahl >= z.zahl));
        gleich("Suche", k.V.lexikonFiltern(zeilen, { suche: "blick", stufe: "", vokale: "" }).map((z) => z.wort), ["blick"]);
    }
    pruefe("Das Lexikon zeigt Zusatzwörter getrennt", /Zusatz · /.test(lesen("js/bildschirm-verwaltung.js")));
})());

/* 3. Spielerliste */
{
    const k = welt("uid-admin");
    const zeilen = k.V.spielerZeilen(DATEN, "2026-09-27");
    gleich("UP#Plus steht nicht in der Liste (reiner Verteiler)", zeilen.map((z) => z.name), ["Anna", "Ben", "Gast"]);
    const anna = zeilen[0];
    gleich("Anna: Rolle, Partien je Spiel, Serie über alle Zweige",
        [anna.rolle, anna.partienJe, anna.partien, anna.serie], ["Admin", { typoluck: 30, blunderluck: 4 }, 34, 4]);
    gleich("Anna: Level und XP aus dem Fortschritt", [anna.level, anna.xp],
        [FORTSCHRITT.level(DATEN.spieler[0].fortschritt).level, 1100]);
    gleich("Münzen: Feld vorgesehen, leer bis es sie gibt", anna.muenzen, null);
    pruefe("Abzeichen-Stand als erreicht/alle", anna.abzeichen && anna.abzeichen.alle === 5);
    gleich("Gast erkannt, ohne Fortschritt", [zeilen[2].gast, zeilen[2].partien, zeilen[2].zuletzt], [true, 0, 0]);
    gleich("Sortieren: zuletzt aktiv", SL.sortieren(zeilen, "zuletzt").map((z) => z.name), ["Anna", "Ben", "Gast"]);
    gleich("Sortieren: Level", SL.sortieren(zeilen, "level")[0].name, "Anna");
    gleich("Sortieren: Name", SL.sortieren(zeilen, "name").map((z) => z.name), ["Anna", "Ben", "Gast"]);
    gleich("Filter: ohne Gäste", SL.filtern(zeilen, { ohneGaeste: true }).map((z) => z.name), ["Anna", "Ben"]);
    gleich("Filter: Suche nach Name#Nummer", SL.filtern(zeilen, { suche: "ben#22" }).map((z) => z.name), ["Ben"]);
    gleich("Kurzzeile", SL.kurzzeile(zeilen[1]).split(" · ").slice(0, 3), ["Lv 1", "Serie 0", "2 Partien"]);
    gleich("Mit Münzen erscheinen sie in der Kurzzeile", SL.kurzzeile(Object.assign({}, zeilen[1], { muenzen: 40 }))
        .indexOf("40 Münzen") !== -1, true);
    const quelle = lesen("js/upcrew-spielerliste.js").replace(/\/\*[\s\S]*?\*\//g, "");
    pruefe("Nur lesen: der Baustein schreibt nichts (kein Speicher, keine Rollen)",
        !/teilSchreiben|rolleSetzen|speichern|aendern|innerHTML/.test(quelle));
}

fazit();
