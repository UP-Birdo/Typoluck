/*
 * test-spielzeit.js — Spielzeit und „dabei seit" in Typoluck (seit 0.24.0,
 * Übernahme von Blunderluck v0.155.0/v0.155.2).
 *
 * Nutzer 28.09.2026: „log die zeit wie lange die app offen ist auf jedem
 * account" · „okay privat … auch bei gästen … sowohl als auch der start
 * datum" · „bis zur ersten stunde 0 bis 59 min danach 1h+ 2h".
 *
 * Geprüft:
 *   1. Der gemeinsame Teil (Auszug, Spielzeit, `FRUEH_ZAEHLER`,
 *      `_zaehlerZusammen`) steht seit 0.28.1 im Kern-Baustein
 *      js\fortschritt-kern.js — kein Vergleich mit Blunderluck mehr.
 *   2. Die Rechnung (wie Blunderlucks test-spielzeit.js): Zählen mit
 *      Grenze, „seit", Zusammenführen, Anzeige, Haken mit Standard aus.
 *   3. js\spielzeit.js: nur bei sichtbarer Seite, ins EIGENE Zweig
 *      `typoluck`, ans Konto erst beim Verbergen; Gast zählt auf dem Gerät,
 *      beim Sichern zieht alles zur Person (auch „dabei seit").
 *   4. Die Einbindung (app.js, Anmeldung, Profil, Einstellungen,
 *      Verwaltung, Auszug).
 * Die Regel (gezielter Pfad, nur Ja/Nein, nur der Besitzer) prüft
 * tests\test-regel-12.js gegen den Regel-Nachbau.
 */

const fs = require("fs");
const pfad = require("path");
const vm = require("vm");
const { pruefe, gleich, fazit } = require("./pruefer.js");

const projekt = pfad.join(__dirname, "..");
const lesen = (name) => fs.readFileSync(pfad.join(projekt, name), "utf8");

/* Eine Umgebung mit Gerätespeicher, FORTSCHRITT und SPIELZEIT; APP,
   ANMELDUNG und der Abgleich als Attrappen. */
function welt(ich) {
    const gespeichert = {};
    const speicher = {
        getItem: (s) => (s in gespeichert ? gespeichert[s] : null),
        setItem: (s, w) => { gespeichert[s] = String(w); },
        removeItem: (s) => { delete gespeichert[s]; }
    };
    const gesendet = [];
    const umgebung = {
        console, setTimeout, clearTimeout, setInterval() { return 1; },
        window: { localStorage: speicher },
        APP: {
            fortschrittId: () => (ich.gast ? "gast" : ich.id),
            _aussehenUid: () => (ich.gast ? null : ich.uid),
            fortschritt: () => umgebung.FORTSCHRITT.laden(ich.gast ? "gast" : ich.id)
        },
        ANMELDUNG: { ich: () => ({ id: ich.id, uid: ich.uid }), abgleich: { daten: { spieler: [] } } },
        FORTSCHRITT_ABGLEICH: { senden: (stand) => { gesendet.push(JSON.parse(JSON.stringify(stand))); return true; } }
    };
    umgebung.globalThis = umgebung;
    vm.createContext(umgebung);
    vm.runInContext(lesen("js/upcrew-abzeichen.js") + "\n;" + lesen("js/fortschritt-kern.js") + "\n;"
        + lesen("js/fortschritt.js") + "\n;" + lesen("js/spielzeit.js")
        + "\nObject.assign(globalThis, { FORTSCHRITT, SPIELZEIT });", umgebung);
    return { F: umgebung.FORTSCHRITT, S: umgebung.SPIELZEIT, gespeichert, gesendet };
}

/* 1. Der gemeinsame Teil kommt aus dem Kern-Baustein */
{
    /* Seit 0.28.1 KEIN Blick mehr nach Blunderluck: Auszug, Spielzeit,
       `FRUEH_ZAEHLER` und `_zaehlerZusammen` stehen in
       js\fortschritt-kern.js (Quelle ..\UPCrew\bausteine\kern; die
       Gleichheit mit der Quelle prüfen tests\test-oberflaeche-7.js und
       ..\UPCrew\tools\Bausteine-Pruefen.ps1). Hier bleibt: Die Glieder,
       die bisher Zeile für Zeile verglichen wurden, stehen im Kern und
       nicht mehr in js\fortschritt.js. */
    const kern = lesen("js/fortschritt-kern.js");
    const eigen = lesen("js/fortschritt.js");
    const namen = ["AUSZUG_WERTE", "auszug", "auszugPruefen", "auszugVon", "auszugLevel", "auszugSerie",
        "auszugAlsStand", "SPIELZEIT_OEFFENTLICH_STANDARD", "SPIELZEIT_SCHRITT_MAX", "SPIELZEIT_MAX",
        "spielzeitZaehlen", "spielzeitVon", "spielzeitSumme", "seitVon", "spielzeitText",
        "spielzeitOeffentlichVon", "_zaehlerZusammen", "FRUEH_ZAEHLER"];
    const steht = (text, name) => new RegExp("\\n    " + name + "\\s*[(:]").test(text);
    gleich("Auszug- und Spielzeit-Teil, _zaehlerZusammen, FRUEH_ZAEHLER: im Kern, nicht mehr in js\\fortschritt.js",
        namen.filter((name) => !steht(kern, name) || steht(eigen, name)), []);
    pruefe("FRUEH_ZAEHLER unverändert", kern.indexOf("    FRUEH_ZAEHLER: [\"seit\"],") !== -1);
}

/* 2. Die Rechnung */
{
    const { F } = welt({ id: "p", uid: "u" });
    const t = Date.parse("2026-09-28T10:00:00Z");
    let s = F.spielzeitZaehlen(null, 90, t, "typoluck");
    gleich("90 s im Zweig typoluck", F.spielzeitVon(s, "typoluck"), 90);
    s = F.spielzeitZaehlen(s, 100000, t + 1000, "typoluck");
    gleich("Ausreisser gekappt", F.spielzeitVon(s, "typoluck"), 90 + F.SPIELZEIT_SCHRITT_MAX);
    gleich("dabei seit", F.seitVon(s), "2026-09-28");
    gleich("seit als Zahl (Regel §11b)", s.spiele.typoluck.zaehler.seit, 20260928);
    gleich("Anzeige", [0, 59, 60, 3599, 3600, 7199, 7200].map(F.spielzeitText),
        ["0 min", "0 min", "1 min", "59 min", "1h+", "1h+", "2h+"]);
    const a = F.spielzeitZaehlen(null, 100, Date.parse("2026-09-20T10:00:00Z"), "typoluck");
    const b = F.spielzeitZaehlen(F.spielzeitZaehlen(null, 50, Date.parse("2026-09-25T10:00:00Z"), "typoluck"),
        100, Date.parse("2026-09-25T11:00:00Z"), "typoluck");
    gleich("Zusammenführen: grösserer Zähler, früheres seit",
        [F.spielzeitVon(F.zusammenfuehren(a, b), "typoluck"), F.seitVon(F.zusammenfuehren(a, b)), F.seitVon(F.zusammenfuehren(b, a))],
        [150, "2026-09-20", "2026-09-20"]);
    gleich("Haken: Standard privat, nur Ja/Nein", [F.SPIELZEIT_OEFFENTLICH_STANDARD, F.spielzeitOeffentlichVon({}),
        F.spielzeitOeffentlichVon({ spielzeitOeffentlich: true }), F.spielzeitOeffentlichVon({ spielzeitOeffentlich: "ja" })],
    [false, false, true, false]);
    pruefe("Auszug: Spielzeit nur mit Option", !("spielzeit" in F.auszug(s).werte)
        && F.auszug(s, undefined, { spielzeit: true }).werte.spielzeit === 90 + F.SPIELZEIT_SCHRITT_MAX);
    pruefe("Die Konto-Fassung nimmt die Zähler mit (Regel §11b)",
        F.fuerKonto(s).spiele.typoluck.zaehler.spielzeit === 90 + F.SPIELZEIT_SCHRITT_MAX
            && F.fuerKonto(s).spiele.typoluck.zaehler.seit === 20260928);
}

/* 3. Zählen: nur sichtbar, ins eigene Zweig, ans Konto beim Verbergen */
{
    const { F, S, gesendet, gespeichert } = welt({ id: "p-anna", uid: "u-anna" });
    const t = 1000000;
    S._sichtbarSeit = t;
    S._kontoZuletzt = t;
    gleich("30 s sichtbar", S.schritt(true, t + 30000), 30);
    gleich("noch nicht ans Konto", gesendet.length, 0);
    gleich("bis zum Verbergen", S.schritt(false, t + 40000), 10);
    gleich("beim Verbergen ans Konto", gesendet.length, 1);
    gleich("40 s am Konto, Zweig typoluck", F.spielzeitVon(gesendet[0], "typoluck"), 40);
    pruefe("Blunderlucks Zweig bleibt unberührt", !JSON.parse(gespeichert["upcrew.fortschritt"])["p-anna"].spiele.blunderluck);
    gleich("verborgen zählt nicht", S.schritt(false, t + 900000), 0);
    gleich("wieder sichtbar: ab jetzt", S.schritt(true, t + 910000), 0);
    gleich("eingeschlafene Seite gekappt", S.schritt(true, t + 5000000), F.SPIELZEIT_SCHRITT_MAX);
    gleich("ans Konto: bei jedem Verbergen, sichtbar spätestens alle 15 min", gesendet.length, 3);
    gleich("Profil: je Spiel, Summe, seit", [S.spielzeit().spiele.typoluck, S.spielzeit().summe, S.spielzeit().seit !== ""],
        [40 + F.SPIELZEIT_SCHRITT_MAX, 40 + F.SPIELZEIT_SCHRITT_MAX, true]);
    gleich("Anzeige „dabei seit“", S.datumText("2026-08-12"), "12.08.2026");
    gleich("Haken fürs Konto: gezielter Pfad + geaendertAm", S.aenderungen("u-anna", true, 9),
        { geaendertAm: 9, "konten/u-anna/spielzeitOeffentlich": true });
}

/* 3b. Gast: auf dem Gerät, beim Sichern zur Person */
{
    const ich = { id: "p-gast", uid: "u-gast", gast: true };
    const { F, S, gesendet, gespeichert } = welt(ich);
    S._sichtbarSeit = 0;
    S._kontoZuletzt = 0;
    S.schritt(false, 60000);
    gleich("Gast schreibt nichts ans Konto", gesendet.length, 0);
    const gastStand = JSON.parse(gespeichert["upcrew.fortschritt"]).gast;
    gleich("Gast zählt auf dem Gerät", F.spielzeitVon(gastStand, "typoluck"), 60);
    pruefe("Gast hat ein seit", F.seitVon(gastStand) !== "");
    gleich("Gast: kein Haken", S.oeffentlich(), false);
    ich.gast = false;
    pruefe("umgezogen", S.gastZumKonto("p-gast"));
    const alle = JSON.parse(gespeichert["upcrew.fortschritt"]);
    pruefe("Gast-Eintrag weg", !alle.gast);
    gleich("unter der Person", F.spielzeitVon(alle["p-gast"], "typoluck"), 60);
    gleich("ans Konto", F.spielzeitVon(gesendet[gesendet.length - 1], "typoluck"), 60);
    gleich("dabei seit zieht mit", S.spielzeit().seit, F.seitVon(gastStand));
    gleich("zweites Mal: nichts", S.gastZumKonto("p-gast"), false);
}

/* 4. Einbindung */
{
    pruefe("app.js startet das Zählen", /SPIELZEIT\.starten\(\)/.test(lesen("js/app.js")));
    pruefe("Nach „Spielstand sichern“ zieht der Gast-Stand um", /SPIELZEIT\.gastZumKonto\(ANMELDUNG\.ich\(\)\.id\)/.test(lesen("js/anmeldung.js")));
    const p = lesen("js/bildschirm-profil.js");
    pruefe("Profil: Spielzeit und „dabei seit“", /spielzeitZeilen/.test(p) && /FORTSCHRITT\.spielzeitText/.test(p) && /dabei seit/.test(p));
    pruefe("Einstellungen: Haken am Konto", /SPIELZEIT\.oeffentlichSetzen\(wert\)/.test(lesen("js/bildschirm-einstellungen.js")));
    const v = lesen("js/bildschirm-verwaltung.js");
    pruefe("Verwaltung: Spielzeit je Spieler", /spielzeitSumme\(spieler\.fortschritt\)/.test(v) && /spielzeitText\(daten, zeile\.uid\)/.test(v));
    pruefe("Eigener Auszug mit Spielzeit nur mit Haken", /\{ spielzeit: mitSpielzeit \}/.test(lesen("js/fortschritt-abgleich.js")));
    pruefe("spielzeit.js in index.html und im Service Worker",
        /<script src="js\/spielzeit\.js"><\/script>/.test(lesen("index.html")) && /"\.\/js\/spielzeit\.js",/.test(lesen("sw.js")));
}

fazit();
