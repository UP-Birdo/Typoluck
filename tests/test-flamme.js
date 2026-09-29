/*
 * test-flamme.js — die Serien-Flamme oben neben dem Kurzprofil (seit 0.16.1,
 * gemeinsamer Baustein js/upcrew-flamme.js; Nutzer 27.09.2026: „die Flamme
 * soll oben in deinem Profil bei beiden Spielen sein — ein Kreis mit einer
 * Flamme und in der Flamme die Anzeige, ausgelegt für 3 Stellen, alles
 * drüber 1k+ … sync mit deinem Profil").
 *
 *   1. Anzeige und Zustände des Bausteins.
 *   2. Die Zahlen: Serie über ALLE Zweige, Gerät und Konto zusammengeführt
 *      (APP.fortschritt → FORTSCHRITT_ABGLEICH.mitKonto → serieHeute).
 *   3. Einbindung: neben dem Kurzprofil, Tipp → Aufgaben, nachgezogen nach
 *      jeder Runde und wenn der Konto-Stand eintrifft; laden, offline.
 */

const fs = require("fs");
const pfad = require("path");
const vm = require("vm");
const { pruefe, gleich, fazit } = require("./pruefer.js");

const wurzel = pfad.join(__dirname, "..");
const lesen = (name) => fs.readFileSync(pfad.join(wurzel, name), "utf8");
const F = require("../js/upcrew-flamme.js");
const FORTSCHRITT = require("../js/fortschritt.js");
const WORDLE = require("../js/wordle.js");

/* 1. Anzeige */
gleich("Anzeige: bis drei Stellen als Zahl, danach 1k+/2k+",
    [0, 7, 42, 999, 1000, 1999, 2500, 12000].map(F.anzeige), ["0", "7", "42", "999", "1k+", "1k+", "2k+", "12k+"]);
pruefe("Anzeige: nie mehr als drei Zeichen bis 9999", [0, 5, 99, 999, 1000, 5000, 9999].every((n) => F.anzeige(n).length <= 3));
gleich("Zustände: aus / voll / offen", [F.zustand({ serie: 0 }), F.zustand({ serie: 3, heuteGeschafft: true }),
    F.zustand({ serie: 3, heuteGeschafft: false })], ["aus", "voll", "offen"]);

/* 2. Die Zahlen aus beiden Zweigen, Gerät + Konto */
const HEUTE = "2026-09-27";
function welt(geraet, konto) {
    const kontext = { console, FORTSCHRITT, WORDLE, require, module: { exports: {} } };
    vm.createContext(kontext);
    vm.runInContext(lesen("js/fortschritt-abgleich.js") + "\n;globalThis.FORTSCHRITT_ABGLEICH = FORTSCHRITT_ABGLEICH;",
        kontext, { filename: "fortschritt-abgleich.js" });
    const AB = kontext.FORTSCHRITT_ABGLEICH;
    AB.einrichten({}, () => "uid-1", () => "id-1");
    AB._konto = konto;
    AB._kontoUid = konto ? "uid-1" : null;
    kontext.APP = { fortschritt: () => AB.mitKonto(geraet), jetzt: () => new Date(2026, 8, 27, 12) };
    kontext.NAVIGATION = { anmelden() {}, zeigen(id) { kontext.gezeigt = id; } };
    vm.runInContext(lesen("js/bildschirm-start.js") + "\n;globalThis.START = START;", kontext, { filename: "bildschirm-start.js" });
    const START = kontext.START;
    let gesetzt = null;
    START._flamme = { setzen(w) { gesetzt = w; } };
    return { START, gesetzt: () => gesetzt, kontext };
}

{
    const geraet = { version: 1, spiele: { typoluck: { xp: 50, stand: 5, tage: ["2026-09-25", "2026-09-27"] } } };
    const konto = { version: 1, spiele: { blunderluck: { xp: 40, stand: 9, tage: ["2026-09-26"] } } };
    const nurGeraet = welt(geraet, null);
    gleich("Nur Gerät: Serie aus Typolucks Tagen (Lücke am 26.)", nurGeraet.START.flammeAktualisieren().serie, 1);
    const beide = welt(geraet, konto);
    const w = beide.START.flammeAktualisieren();
    gleich("Mit Konto: Blunderlucks Tag füllt die Lücke — Serie über alle Zweige", [w.serie, w.heuteGeschafft], [3, true]);
    gleich("… und genau das bekommt die Flamme", beide.gesetzt(), w);
    gleich("… dieselbe Zahl wie die Rechnung im Fortschritt (nichts neu gerechnet)", w.serie,
        FORTSCHRITT.serieHeute(FORTSCHRITT.zusammenfuehren(geraet, konto), HEUTE).tage);

    const offen = welt({ version: 1, spiele: { typoluck: { xp: 5, stand: 1, tage: ["2026-09-25", "2026-09-26"] } } }, null);
    const o = offen.START.flammeAktualisieren();
    gleich("Heute noch offen: Serie bis gestern, nicht geschafft", [o.serie, o.heuteGeschafft], [2, false]);
    const leer = welt({ version: 1, spiele: {} }, null);
    gleich("Nichts gespielt: Serie 0", leer.START.flammeAktualisieren().serie, 0);
    pruefe("Kein Schutz mehr an die Flamme (seit 0.26.0)", !("schutz" in w));
    const ohne = welt(geraet, null);
    ohne.START._flamme = null;
    gleich("Ohne Flamme (kein Kurzprofil): nichts passiert", ohne.START.flammeAktualisieren(), null);
}

/* 3. Einbindung */
{
    const start = lesen("js/bildschirm-start.js");
    pruefe("In der Kopfzeile oben rechts (seit 0.26.0 abends: die Flamme der Kopfzeile, keine Kapsel)",
        /kopf\.appendChild\(START\._profilKarteBauen\(ich, name\)\);[\s\S]{0,200}START\._flammeBauen\(kopf, START\._kopfFlamme\);/.test(start)
        && /beiSerie: \(\) => START\.serieOeffnen\(\)/.test(start));
    pruefe("Tipp führt zu den Aufgaben (Tab Heute)",
        /beiKlick: \(\) => NAVIGATION\.zeigen\("herausforderungen", null\)/.test(start));
    pruefe("Zahlen aus FORTSCHRITT.serieHeute(APP.fortschritt(), …) — keine eigene Serien-Rechnung",
        /FORTSCHRITT\.serieHeute\(APP\.fortschritt\(\), WORDLE\.datumText\(APP\.jetzt\(\)\)\)/.test(start));
    const app = lesen("js/app.js");
    pruefe("Nachgezogen nach jeder Runde und wenn der Konto-Stand eintrifft",
        /FORTSCHRITT_ABGLEICH\.senden\(ergebnis\.stand\);\s*APP\._flammeAktualisieren\(\);/.test(app)
            && /async _fortschrittHolen\(\) \{[\s\S]*?APP\._flammeAktualisieren\(\);/.test(app));
    const index = lesen("index.html");
    pruefe("index.html lädt Baustein und Stil, vor dem Start-Bildschirm",
        index.indexOf("css/upcrew-flamme.css") !== -1 && index.indexOf("js/upcrew-flamme.js") !== -1
            && index.indexOf("js/upcrew-flamme.js") < index.indexOf("js/bildschirm-start.js"));
    const sw = lesen("sw.js");
    pruefe("Offline: sw.js kennt beide Dateien",
        sw.indexOf("\"./js/upcrew-flamme.js\"") !== -1 && sw.indexOf("\"./css/upcrew-flamme.css\"") !== -1);
    pruefe("Der Kreis ist 44 px (wie in Blunderluck)", /\.up-fl \{[^}]*width: 44px;[^}]*height: 44px;/.test(lesen("css/upcrew-flamme.css")));
}

fazit();
