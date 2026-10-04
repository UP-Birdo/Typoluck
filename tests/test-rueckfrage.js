/*
 * test-rueckfrage.js — die Rückfragen in der Runde, wenn der Spieler
 * inzwischen gegangen ist (seit 0.31.0, js\bildschirm-wordle.js
 * `_rundeOffen`).
 *
 * DER FEHLER BIS 0.30.0: „Tipp einsetzen?" oder „Extra-Leben einsetzen?"
 * ist offen, der Spieler geht mit der Zurück-Taste weg (der Dialog bleibt
 * offen) und tippt danach „Einsetzen" — die Runde zeichnete sich in den
 * verborgenen Ort und setzte `body.im-spiel`: Auf dem Start fehlte die
 * Leiste, und das Wischen war gesperrt.
 *
 * Es läuft der ECHTE Bildschirm js\bildschirm-wordle.js mit dem echten
 * Modell js\wordle.js; Dialog, Navigation und App sind Attrappen, das
 * Zeichnen wird nur gezählt (der Bildschirm selbst wird im Browser
 * angesehen).
 */

const fs = require("fs");
const pfad = require("path");
const vm = require("vm");
const { pruefe, gleich, spaeter, fazit } = require("./pruefer.js");
require("./umgebung.js");

const quelle = fs.readFileSync(pfad.join(__dirname, "..", "js", "bildschirm-wordle.js"), "utf8");

/* Eine Welt: der Bildschirm mit einer Runde, die Frage wartet auf `antworten(ja)`. */
function welt(runde, vorrat) {
    const s = { gezeichnet: 0, gemerkt: 0, benutzt: [], gemeldet: [], ergebnisse: [], fragen: [], antworten: null,
        vorrat: Object.assign({ tipp: 1, leben: 1 }, vorrat || {}) };
    const umgebung = {
        console, Promise, setTimeout, clearTimeout,
        WORDLE: global.WORDLE,
        NAVIGATION: { aktuell: "wordle", anmelden() { } },
        DIALOG: {
            frage: (titel) => new Promise((fertig) => { s.fragen.push(titel); s.antworten = fertig; }),
            kurzmeldung() { }
        },
        APP: {
            vorrat: (ware) => s.vorrat[ware] || 0,
            benutzen: (ware) => { s.benutzt.push(ware); return true; },
            tinteNutzen: () => true,
            fortschrittMelden: (r) => { s.gemeldet.push(r); return null; },
            ergebnisMelden: (r) => { s.ergebnisse.push(r); }
        },
        document: { body: { classList: { toggle() { s.imSpiel = true; }, remove() { }, add() { } } } }
    };
    umgebung.window = umgebung;
    vm.createContext(umgebung);
    vm.runInContext(quelle + "\n;globalThis.WORDLE_BILDSCHIRM = WORDLE_BILDSCHIRM;", umgebung, { filename: "bildschirm-wordle.js" });
    const W = umgebung.WORDLE_BILDSCHIRM;
    W._zeichnen = () => { s.gezeichnet++; };
    W._merken = () => { s.gemerkt++; };
    W.runde = runde;
    W.eingabe = global.WORDLE.leereEingabe();
    W._sperre = false;
    s.W = W;
    s.N = umgebung.NAVIGATION;
    s.zug = () => new Promise((fertig) => setTimeout(fertig, 0));
    return s;
}

const laufend = (modus) => WORDLE.neueRunde(modus === "tag"
    ? { modus: "tag", datum: "2026-10-04", nummer: 7, loesung: "abend", zeitpunkt: 1 }
    : { modus: "uebung", loesung: "abend", zeitpunkt: 1 });

/* Sechs Versuche daneben: verloren, ein Extra-Leben wäre möglich. */
function verloren(modus) {
    let runde = laufend(modus);
    const fehler = [];
    for (const wort of ["adler", "blume", "creme", "dachs", "eimer", "hafen"]) {
        const antwort = WORDLE.raten(runde, wort, 2);
        fehler.push(antwort.fehler);
        runde = antwort.runde;
    }
    return { runde, fehler };
}

{
    const v = verloren();
    gleich("Vorbereitung: sechs gültige Versuche, die Runde ist verloren, ein Extra-Leben möglich",
        [v.fehler.join(""), v.runde.zustand !== "laeuft", WORDLE.lebenMoeglich(v.runde), WORDLE.tippMoeglich(laufend())],
        ["", true, true, true]);
}

spaeter("Rückfragen", (async () => {

    /* ---------- Tipp ---------- */
    let runde = laufend();
    let s = welt(runde);
    let lauf = s.W._aufdecken("tipp");
    gleich("Tipp: es wird gefragt", s.fragen, ["Tipp einsetzen?"]);
    s.antworten(true);
    await lauf;
    gleich("Geblieben und „Einsetzen“: der Tipp wird verbraucht, die Runde gezeichnet (wie bisher)",
        [s.benutzt, s.gezeichnet, s.W.runde !== runde], [["tipp"], 1, true]);

    runde = laufend();
    s = welt(runde);
    lauf = s.W._aufdecken("tipp");
    s.N.aktuell = "start";
    s.antworten(true);
    await lauf;
    gleich("Mit Zurück gegangen, dann „Einsetzen“: nichts verbraucht, nichts gezeichnet, die Runde unverändert",
        [s.benutzt, s.gezeichnet, s.gemerkt, s.W.runde === runde, !!s.imSpiel], [[], 0, 0, true, false]);

    runde = laufend();
    s = welt(runde);
    lauf = s.W._aufdecken("tipp");
    s.N.aktuell = "start";
    s.N.aktuell = "wordle";
    s.W.runde = laufend();
    const neue = s.W.runde;
    s.antworten(true);
    await lauf;
    gleich("Gegangen und in eine ANDERE Runde zurück: die alte Frage setzt dort nichts ein",
        [s.benutzt, s.gezeichnet, s.W.runde === neue], [[], 0, true]);

    runde = laufend();
    s = welt(runde);
    lauf = s.W._aufdecken("tipp");
    s.antworten(false);
    await lauf;
    gleich("„Nein“: nichts", [s.benutzt, s.gezeichnet], [[], 0]);

    /* ---------- Extra-Leben ---------- */
    runde = verloren().runde;
    s = welt(runde);
    lauf = s.W._beiRundenende();
    gleich("Extra-Leben: es wird gefragt, solange gesperrt", [s.fragen, s.W._sperre], [["Extra-Leben einsetzen?"], true]);
    s.antworten(true);
    await lauf;
    gleich("Geblieben und „Einsetzen“: das Leben wird verbraucht, die Runde läuft weiter, gewertet wird noch nicht",
        [s.benutzt, s.gezeichnet, s.W.runde.zustand, s.gemeldet.length, s.W._sperre], [["leben"], 1, "laeuft", 0, false]);

    runde = verloren("tag").runde;
    s = welt(runde);
    lauf = s.W._beiRundenende();
    s.N.aktuell = "start";
    s.antworten(true);
    await lauf;
    gleich("Mit Zurück gegangen, dann „Einsetzen“: kein Leben verbraucht, nichts gezeichnet (kein `im-spiel` auf dem Start)",
        [s.benutzt, s.gezeichnet, !!s.imSpiel, s.W.runde === runde], [[], 0, false, true]);
    gleich("… die Runde ist trotzdem zu Ende und wird GENAU EINMAL gewertet und gemeldet",
        [s.gemeldet.length, s.gemeldet[0] === runde, s.ergebnisse.length, s.ergebnisse[0] === runde], [1, true, 1, true]);

    runde = verloren().runde;
    s = welt(runde);
    lauf = s.W._beiRundenende();
    s.N.aktuell = "start";
    s.N.aktuell = "wordle";
    s.W.runde = laufend();
    const andere = s.W.runde;
    s.antworten(true);
    await lauf;
    gleich("Gegangen und in eine ANDERE Runde zurück: gewertet wird die beendete, nicht die neue; die neue bleibt, wie sie ist",
        [s.gemeldet.length, s.gemeldet[0] === runde, s.benutzt, s.gezeichnet, s.W.runde === andere], [1, true, [], 0, true]);

    runde = verloren().runde;
    s = welt(runde);
    lauf = s.W._beiRundenende();
    s.antworten(false);
    await lauf;
    gleich("Geblieben und „Nein“: gewertet und gezeichnet (wie bisher)", [s.gemeldet.length, s.gezeichnet, s.benutzt], [1, 1, []]);

    runde = verloren().runde;
    s = welt(runde, { leben: 0 });
    await s.W._beiRundenende();
    gleich("Ohne Vorrat: keine Frage, gleich gewertet und gezeichnet", [s.fragen.length, s.gemeldet.length, s.gezeichnet], [0, 1, 1]);
})());

{
    const ohne = quelle.replace(/\/\*[\s\S]*?\*\//g, "");
    pruefe("Beide Rückfragen prüfen danach, ob die Runde noch offen ist",
        (ohne.match(/WORDLE_BILDSCHIRM\._rundeOffen\(runde\)/g) || []).length === 2);
    pruefe("`im-spiel` setzt allein das Zeichnen", (ohne.match(/classList\.toggle\("im-spiel"/g) || []).length === 1);
}

fazit();
