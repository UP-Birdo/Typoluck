/*
 * test-duell.js — das Duell als reines Modell (seit 0.34.0, js\duell.js).
 *
 *   1. Gleiches Wort: Prüfvektor des Konzepts (AAAAAAAAAAAAAAAAAAA1, 567 →
 *      394, 257, 525), drei verschiedene Stellen, zu kurze Liste = kein Wort,
 *      Kennung aus 20 Zufallszahlen.
 *   2. Wertung `p`, Muster- und Zeiten-Kette (wie die Regel §14 sie will),
 *      `z` wird nie vertraut.
 *   3. Lesen: `w` als Liste ODER Objekt, Unsinn fällt weg.
 *   4. Stand: 2:0 = Schluss, beide ungelöst = beide ein Punkt, exakt gleich =
 *      beide, höchstens drei Wörter (2:1, 3:1, 2:2, 3:2, 3:3), Aufgabe,
 *      Aufgabe gegen einen, der nie begonnen hat (ohne Wertung), Frist.
 *   5. Das nächste Wort und die Lage (Reihenfolge, B erst nach der Annahme,
 *      der Herausforderer darf vorlegen, 48 h / 5 Tage).
 *   6. Geist, Schritte, Schalter.
 */

const { pruefe, gleich, fazit } = require("./pruefer.js");
require("./umgebung.js");
const D = require("../js/duell.js");

const L = WOERTER_DE.loesungen;
const T0 = 1800000000000;

/* Ein Duell bauen: a/b je Liste von p (null = nicht gespielt). */
function duell(pa, pb, wahl) {
    const o = wahl || {};
    const w = (liste) => (liste || []).map((p) => (p === null || p === undefined ? null
        : (p === "b" ? { b: T0 + 1000 } : { b: T0 + 1000, m: p === D.NICHT_GELOEST ? "FFFFF" : "RRRRR", z: "0001000", p: p })));
    return D.lesen({
        kopf: { a: "uid-a", b: "uid-b", t: T0, n: 567, v: 1 },
        teil: {
            a: Object.assign({ w: w(pa) }, o.ast ? { st: o.ast } : {}),
            b: Object.assign({ w: w(pb) }, o.bst === undefined ? { st: "an" } : (o.bst ? { st: o.bst } : {}))
        }
    }, "AAAAAAAAAAAAAAAAAAA1");
}
const P = (versuche, sek) => D.wertung(true, versuche, sek * 1000);
const X = D.NICHT_GELOEST;

/* ------------------------------------------------------------------ *
 * 1. Gleiches Wort
 * ------------------------------------------------------------------ */
gleich("Prüfvektor: AAAAAAAAAAAAAAAAAAA1 mit 567 → 394, 257, 525",
    D.stellen("AAAAAAAAAAAAAAAAAAA1", 567), [394, 257, 525]);
gleich("Die Lösungsliste hat heute 567 Wörter (der Vektor rechnet mit ihr)", L.length, 567);
gleich("Die Wörter des Prüfvektors kommen aus der Lösungsliste",
    [0, 1, 2].map((nr) => D.wort("AAAAAAAAAAAAAAAAAAA1", 567, nr, L)), [L[394], L[257], L[525]]);
pruefe("Zu kurze Liste (Gerät älter als der Herausforderer): kein Wort",
    D.wort("AAAAAAAAAAAAAAAAAAA1", 600, 0, L) === null && D.wort("AAAAAAAAAAAAAAAAAAA1", 567, 3, L) === null);
pruefe("Mit n kürzer als die Liste gilt nur der Anfang der Liste",
    D.stellen("AAAAAAAAAAAAAAAAAAA1", 100).every((s) => s < 100));
{
    let alleVerschieden = true;
    for (let i = 0; i < 300; i++) {
        const id = D.kennung(Array.from({ length: 20 }, (_, k) => (i * 31 + k * 7) % 256));
        const s = D.stellen(id, 567);
        if (new Set(s).size !== 3) {
            alleVerschieden = false;
        }
    }
    pruefe("Drei verschiedene Wörter je Duell (300 Kennungen)", alleVerschieden);
    gleich("Eine belegte Stelle rückt weiter (n = 3: alle drei Stellen)",
        D.stellen("AAAAAAAAAAAAAAAAAAA1", 3).slice().sort(), [0, 1, 2]);
}
const kennung = D.kennung([0, 1, 2, 63, 64, 255, 26, 52, 62, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
pruefe("Kennung: 20 Zeichen A–Z a–z 0–9 _ -", D.kennungOk(kennung) && kennung.length === 20, kennung);
pruefe("Kennung prüfen: Unsinn nein", !D.kennungOk("kurz") && !D.kennungOk("AAAAAAAAAAAAAAAAAAA/") && !D.kennungOk(null));

/* ------------------------------------------------------------------ *
 * 2. Wertung, Muster, Zeiten
 * ------------------------------------------------------------------ */
gleich("p: gelöst im 3. Versuch nach 41,5 s", D.wertung(true, 3, 41500), 30041500);
gleich("p: nicht gelöst genau 70 000 000", [D.wertung(false, 6, 1), D.wertung(true, 7, 1), D.wertung(true, 0, 1)], [X, X, X]);
gleich("p: Dauer gedeckelt bei 9 999 999 ms", D.wertung(true, 2, 99999999), 29999999);
gleich("p zerlegen", [D.zerlegen(30041500), D.zerlegen(X)],
    [{ geloest: true, versuche: 3, dauerMs: 41500 }, { geloest: false, versuche: 0, dauerMs: 0 }]);
pruefe("Weniger Versuche schlägt jede Zeit, bei gleichen Versuchen die kürzere Zeit",
    P(2, 99) < P(3, 1) && P(3, 10) < P(3, 11) && P(6, 9999) < X);
gleich("Muster als Kette (Zeilen aus WORDLE.muster)", D.musterText(["FFVFF", "RRRRR"]), "FFVFFRRRRR");
gleich("Muster: Unsinn wird leer", [D.musterText(["FFVF"]), D.musterText(["abcde"])], ["", ""]);
gleich("Muster in Zeilen", D.musterZeilen("FFVFFRRRRR"), ["FFVFF", "RRRRR"]);
gleich("Zeiten: je Zeile 7 Ziffern", D.zeitenText([900, 41500, 12000000]), "000090000415009999999");
{
    const rundePassend = (m, p) => {
        /* wörtlich wie Regel §14, Zeile `p`: m.length * 2000000 */
        const geloest = /^[RVF]{0,25}RRRRR$/.test(m);
        return geloest ? (p >= m.length * 2000000 && p < m.length * 2000000 + 10000000) : p === X;
    };
    const runde = WORDLE.raten(WORDLE.raten(WORDLE.neueRunde({ modus: "uebung", loesung: L[394], zeitpunkt: 1 }),
        L[257], 2).runde, L[394], 3).runde;
    const m = D.musterText(WORDLE.muster(runde));
    const p = D.wertung(runde.zustand === "gewonnen", runde.versuche.length, 3000);
    pruefe("Eine echte Runde: m und p passen so zusammen, wie die Regel es prüft (p im Band der Zeilenzahl)",
        m.length === 10 && rundePassend(m, p), m + " " + p);
    pruefe("Nicht gelöst: p = 70 000 000 passt zu jedem Muster ohne RRRRR am Ende", rundePassend("FFFFFRRVFF", X));
}
gleich("z lesen: gültig", D.zeitenLesen("00010000002500", "FFVFFRRRRR", P(2, 30)), [1000, 2500]);
gleich("z lesen: nicht aufsteigend → gleichmässig bis zur Dauer", D.zeitenLesen("00030000002500", "FFVFFRRRRR", P(2, 30)), [15000, 30000]);
gleich("z lesen: nach der Dauer → gleichmässig", D.zeitenLesen("00010000099999", "FFVFFRRRRR", P(2, 30)), [15000, 30000]);
gleich("z lesen: falsche Länge → gleichmässig", D.zeitenLesen("0001000", "FFVFFRRRRR", P(2, 30)), [15000, 30000]);

/* ------------------------------------------------------------------ *
 * 3. Lesen
 * ------------------------------------------------------------------ */
{
    const wort = { b: T0 + 5, m: "RRRRR", z: "0004000", p: P(1, 4) };
    const alsObjekt = D.lesen({ kopf: { a: "x", b: "y", t: T0, n: 567, v: 1 }, teil: { a: { w: { 0: wort, 2: wort } } } }, "id");
    const alsListe = D.lesen({ kopf: { a: "x", b: "y", t: T0, n: 567, v: 1 }, teil: { a: { w: [wort, null, wort] } } }, "id");
    gleich("w als Objekt und als Liste (REST) ergibt dasselbe", alsListe, alsObjekt);
    gleich("w gelesen: Wort 0 und 2 da, 1 fehlt", alsObjekt.teil.a.w.map((w) => !!w), [true, false, true]);
    pruefe("Ohne Kopf kein Duell", D.lesen({ teil: {} }) === null && D.lesen(null) === null
        && D.lesen({ kopf: { a: "x", b: "y", t: "nein", n: 567 } }) === null);
    const unsinn = D.lesen({ kopf: { a: "x", b: "y", t: T0, n: 567, v: 1 }, teil: { a: { st: "quatsch", w: [{ b: "x", m: 5, p: "7" }] }, b: { st: "an" } } }, "id");
    gleich("Unsinn fällt weg (Status, Felder falscher Art)", [unsinn.teil.a.st, unsinn.teil.a.w[0], unsinn.teil.b.st], ["", null, "an"]);
    const nurBeginn = D.lesen({ kopf: { a: "x", b: "y", t: T0, n: 567, v: 1 }, teil: { b: { st: "an", w: [{ b: T0 + 9 }] } } }, "id");
    gleich("Nur begonnen: b, kein p", nurBeginn.teil.b.w[0], { b: T0 + 9 });
}

/* ------------------------------------------------------------------ *
 * 4. Der Stand
 * ------------------------------------------------------------------ */
const st = (d, jetzt) => {
    const s = D.stand(d, jetzt || T0 + 60000);
    return [s.a, s.b, s.ende, s.grund, s.sieger];
};
gleich("Läuft: 1:0 nach einem Wort", st(duell([P(2, 10)], [P(3, 10)])), [1, 0, false, "", null]);
gleich("2:0 nach zwei Wörtern = Schluss", st(duell([P(2, 10), P(3, 5)], [P(3, 10), P(4, 5)])), [2, 0, true, "zweiNull", "a"]);
gleich("2:0 für B", st(duell([X, P(5, 5)], [P(6, 99), P(4, 5)])), [0, 2, true, "zweiNull", "b"]);
gleich("1:1 nach zwei Wörtern: weiter", st(duell([P(2, 10), P(5, 5)], [P(3, 10), P(4, 5)])), [1, 1, false, "", null]);
gleich("Beide nicht gelöst = beide einen Punkt (2:1 nach zwei Wörtern, weiter)",
    st(duell([P(2, 10), X], [P(3, 10), X])), [2, 1, false, "", null]);
gleich("Exakt gleich (Versuche UND ms) = beide einen Punkt", st(duell([P(3, 10)], [P(3, 10)])), [1, 1, false, "", null]);
gleich("Endstand 2:2 (1:1 + beide ungelöst … ) nach drei Wörtern",
    st(duell([P(2, 1), P(5, 1), X], [P(3, 1), P(4, 1), X])), [2, 2, true, "drei", "gleich"]);
gleich("Endstand 3:3", st(duell([X, X, X], [X, X, X])), [3, 3, true, "drei", "gleich"]);
gleich("Endstand 2:1", st(duell([P(2, 1), P(5, 1), P(1, 1)], [P(3, 1), P(4, 1), P(2, 1)])), [2, 1, true, "drei", "a"]);
gleich("Endstand 3:1", st(duell([P(2, 1), X, P(1, 1)], [P(3, 1), X, P(2, 1)])), [3, 1, true, "drei", "a"]);
gleich("Endstand 3:2", st(duell([P(2, 1), X, X], [P(3, 1), X, X])), [3, 2, true, "drei", "a"]);
gleich("Höchstens drei Wörter: ein viertes gibt es nicht", D.stand(duell([1, 1, 1], [2, 2, 2])).woerter.length, 3);
{
    const s = D.stand(duell([P(2, 10)], [P(3, 10), "b"], { ast: "auf" }), T0 + 60000);
    gleich("Aufgabe: der andere gewinnt, Grund Aufgabe", [s.ende, s.grund, s.sieger, s.aufgegeben, s.ohneWertung],
        [true, "aufgabe", "b", "a", false]);
    gleich("Aus Sicht des Aufgebenden: verloren, des anderen: gewonnen",
        [D.ergebnisFuer(s, "a"), D.ergebnisFuer(s, "b")], ["verloren", "gewonnen"]);
    const frueh = D.stand(duell([P(2, 10)], [], { bst: "auf" }), T0 + 60000);
    gleich("B gibt auf, A hat schon gespielt: A gewinnt, B verliert",
        [frueh.sieger, frueh.ohneWertung, D.ergebnisFuer(frueh, "b")], ["a", false, "verloren"]);
    const gegenNie = D.stand(duell([P(2, 10)], [], { ast: "auf" }), T0 + 60000);
    gleich("Aufgabe gegen einen, der noch kein Wort begonnen hat: ohne Wertung, keine Niederlage (Konzept 10.2)",
        [gegenNie.sieger, gegenNie.ohneWertung, D.ergebnisFuer(gegenNie, "a")], ["b", true, "ohne Wertung"]);
    const ohne = D.stand(duell([], [P(2, 10)], { ast: "auf" }), T0 + 60000);
    gleich("… und wer nie begonnen hat, gibt auf: ohne Wertung", [ohne.ohneWertung, D.ergebnisFuer(ohne, "a")],
        [false, "verloren"]);
    const leer = D.stand(duell([], [], { bst: "auf" }), T0 + 60000);
    gleich("Aufgabe, keiner hat begonnen: ohne Wertung für beide", [leer.ohneWertung, D.ergebnisFuer(leer, "a"), D.ergebnisFuer(leer, "b")],
        [true, "ohne Wertung", "ohne Wertung"]);
}
{
    const spaet = T0 + D.FRIST_DUELL_MS + 1;
    gleich("Frist: Wörter, die nur einer gespielt hat, zählen für ihn; keiner = zählt nicht",
        st(duell([P(2, 10), P(3, 3)], [P(3, 10)]), spaet), [2, 0, true, "frist", "a"]);
    gleich("Vor der Frist zählt ein einseitiges Wort nicht", st(duell([P(2, 10), P(3, 3)], [P(3, 10)]), T0 + 1000),
        [1, 0, false, "", null]);
    gleich("Frist ohne Annahme ist kein Ende (das ist „verfallen“)", D.stand(duell([P(2, 1)], [], { bst: "" }), spaet).ende, false);
}

/* ------------------------------------------------------------------ *
 * 5. Das nächste Wort und die Lage
 * ------------------------------------------------------------------ */
const J = T0 + 60000;
gleich("A vor der Annahme: Wort 1 und 2 darf er vorlegen, Wort 3 nicht",
    [D.naechstesWort(duell([], [], { bst: "" }), "a", J), D.naechstesWort(duell([P(2, 1)], [], { bst: "" }), "a", J),
        D.naechstesWort(duell([P(2, 1), P(2, 1)], [], { bst: "" }), "a", J)], [0, 1, -1]);
gleich("B vor der Annahme: nichts; nach Ablehnung: nichts", [D.naechstesWort(duell([], [], { bst: "" }), "b", J),
    D.naechstesWort(duell([], [], { bst: "ab" }), "b", J)], [-1, -1]);
gleich("Wort 3 erst, wenn BEIDE zwei Wörter haben (und es nicht 2:0 steht)",
    [D.naechstesWort(duell([P(2, 1), P(5, 1)], [P(3, 1)]), "a", J), D.naechstesWort(duell([P(2, 1), P(5, 1)], [P(3, 1), P(4, 1)]), "a", J),
        D.naechstesWort(duell([P(2, 1), P(3, 1)], [P(3, 1), P(4, 1)]), "b", J)], [-1, 2, -1]);
gleich("Ein begonnenes Wort ist das nächste", D.naechstesWort(duell(["b"], []), "a", J), 0);
gleich("Nach der Frist, nach einer Aufgabe: kein Wort mehr",
    [D.naechstesWort(duell([], []), "a", T0 + D.FRIST_DUELL_MS + 1), D.naechstesWort(duell([], [], { ast: "auf" }), "b", J)], [-1, -1]);
const lage = (d, uid, jetzt) => {
    const l = D.lage(d, uid, jetzt || J);
    return [l.art, l.rolle, l.nr];
};
gleich("Lage: kein Duell / fremdes", [lage(null, "uid-a"), lage(duell([], []), "uid-c")], [["kein", null, -1], ["kein", null, -1]]);
gleich("Lage: A wartet auf die Annahme, darf Wort 1 spielen", lage(duell([], [], { bst: "" }), "uid-a"), ["wartet-annahme", "a", 0]);
gleich("Lage: B ist eingeladen", lage(duell([], [], { bst: "" }), "uid-b"), ["einladung", "b", -1]);
gleich("Lage: 48 h ohne Antwort = verfallen (für beide)",
    [lage(duell([], [], { bst: "" }), "uid-a", T0 + D.FRIST_ANNAHME_MS + 1), lage(duell([], [], { bst: "" }), "uid-b", T0 + D.FRIST_ANNAHME_MS + 1)],
    [["verfallen", "a", -1], ["verfallen", "b", -1]]);
gleich("Lage: abgelehnt", lage(duell([], [], { bst: "ab" }), "uid-a"), ["abgelehnt", "a", -1]);
gleich("Lage: dran / wartet", [lage(duell([P(2, 1)], []), "uid-b"), lage(duell([P(2, 1), P(3, 1)], []), "uid-a")],
    [["dran", "b", 0], ["wartet", "a", -1]]);
gleich("Lage: beendet (2:0)", lage(duell([P(2, 10), P(3, 5)], [P(3, 10), P(4, 5)]), "uid-b"), ["beendet", "b", -1]);
pruefe("Lage: begonnen (Startmarke steht, kein Ergebnis)", D.lage(duell(["b"], []), "uid-a", J).begonnen === true);
pruefe("Zurückziehen nur, solange A kein Wort begonnen hat (Merkmal)",
    !D.wortBegonnen(duell([], [], { bst: "" }), "a") && D.wortBegonnen(duell(["b"], [], { bst: "" }), "a"));

/* ------------------------------------------------------------------ *
 * 6. Geist, Schritte, Schalter
 * ------------------------------------------------------------------ */
{
    const d = D.lesen({ kopf: { a: "uid-a", b: "uid-b", t: T0, n: 567, v: 1 },
        teil: { a: { w: [{ b: 1, m: "FFVFFRRRRR", z: "00090000021000", p: P(2, 21) }] }, b: { st: "an" } } }, "id");
    gleich("Geist: nur Farben und Zeiten des Gegners", D.geist(d, "b", 0), { zeilen: ["FFVFF", "RRRRR"], zeiten: [9000, 21000], p: 20021000 });
    pruefe("Kein Geist ohne Ergebnis des Gegners, keiner vom eigenen Wort", D.geist(d, "b", 1) === null && D.geist(d, "a", 0) === null);
    pruefe("Kein Buchstabe im Geist (nur R, V, F)", D.geist(d, "b", 0).zeilen.every((z) => /^[RVF]{5}$/.test(z)));
}
const SV = { ".sv": "timestamp" };
gleich("Schritt Herausfordern: Kopf + Zeiger + Einladung in EINEM Schritt",
    D.schrittHerausfordern("AAAAAAAAAAAAAAAAAAA1", "a1", "b1", 567),
    { "spiele/AAAAAAAAAAAAAAAAAAA1/kopf": { a: "a1", b: "b1", t: SV, n: 567, v: 1 },
        "aktiv/a1": "AAAAAAAAAAAAAAAAAAA1", "einladung/b1/a1": "AAAAAAAAAAAAAAAAAAA1" });
gleich("Schritt Annehmen: st an + Zeiger + Einladung weg", D.schrittAnnehmen("I", "b1", "a1"),
    { "spiele/I/teil/b/st": "an", "aktiv/b1": "I", "einladung/b1/a1": null });
gleich("Schritt Ablehnen: st ab + Einladung weg", D.schrittAblehnen("I", "b1", "a1"),
    { "spiele/I/teil/b/st": "ab", "einladung/b1/a1": null });
gleich("Schritt Zurückziehen: Duell, Zeiger, Einladung", D.schrittZurueckziehen("I", "a1", "b1"),
    { "spiele/I": null, "aktiv/a1": null, "einladung/b1/a1": null });
gleich("Schritt Wort beginnen: nur die Startmarke (Serverzeit)", D.schrittWortBeginnen("I", "b", 2), { "spiele/I/teil/b/w/2/b": SV });
gleich("Schritt Wort melden: m, z, p zusammen", D.schrittWortMelden("I", "a", 0, "RRRRR", "0001000", 10001000),
    { "spiele/I/teil/a/w/0/m": "RRRRR", "spiele/I/teil/a/w/0/z": "0001000", "spiele/I/teil/a/w/0/p": 10001000 });
gleich("Schritt Aufgeben: st auf + eigener Zeiger", D.schrittAufgeben("I", "b", "b1"), { "spiele/I/teil/b/st": "auf", "aktiv/b1": null });
gleich("Schritt Abschluss / nur Zeiger", [D.schrittAbschluss("I", "a1"), D.schrittZeigerLoesen("a1")],
    [{ "spiele/I": null, "aktiv/a1": null }, { "aktiv/a1": null }]);
pruefe("Kein Schritt fasst geaendertAm an", !/geaendertAm/.test(JSON.stringify([D.schrittHerausfordern("I", "a", "b", 1),
    D.schrittAnnehmen("I", "b", "a"), D.schrittAufgeben("I", "a", "a"), D.schrittAbschluss("I", "a")])));
gleich("Schalter: aus (KONFIG) = Duell aus; nur die Werkstatt stellt es an",
    [KONFIG.REGEL_14_EINGESPIELT, D.an(), (D._werkstatt = true, D.an()), (D._werkstatt = false, D.an())], [false, false, true, false]);
pruefe("Das Modell würfelt nicht", !/Math\.random/.test(require("fs").readFileSync(require("path").join(__dirname, "..", "js", "duell.js"), "utf8")));

fazit();
