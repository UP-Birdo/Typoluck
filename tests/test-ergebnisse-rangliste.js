/*
 * test-ergebnisse-rangliste.js — was in die Datenbank kommt (js\ergebnisse.js)
 * und was die Rangliste daraus rechnet (js\rangliste.js).
 */

const { pruefe, gleich, spaeter, fazit } = require("./pruefer.js");
const { geraetLeeren } = require("./umgebung.js");

/* Eine gewonnene Tagesrunde in drei Versuchen */
let runde = WORDLE.neueRunde({ modus: "tag", datum: "2026-09-24", nummer: 1, loesung: "apfel", zeitpunkt: 1000 });
runde = WORDLE.raten(runde, "leben", 2000).runde;
runde = WORDLE.raten(runde, "lampe", 3000).runde;
runde = WORDLE.raten(runde, "apfel", 61000).runde;

const ergebnis = ERGEBNISSE.ausRunde(runde);
gleich("Ergebnis einer gewonnenen Runde", ergebnis, {
    geloest: true, versuche: 3, muster: ["VFFRF", "VVFVV", "RRRRR"],
    nummer: 1, beendetAm: 61000, dauerMs: 60000
});
pruefe("Das Wort steht NICHT im Ergebnis (öffentliche Datenbank)",
    JSON.stringify(ergebnis).indexOf("apfel") === -1);

let verloren = WORDLE.neueRunde({ modus: "tag", datum: "2026-09-24", loesung: "apfel" });
for (const wort of ["leben", "nebel", "humor", "kerze", "tisch", "stuhl"]) {
    verloren = WORDLE.raten(verloren, wort, 1).runde;
}
gleich("Verloren zählt als sechs Versuche", ERGEBNISSE.ausRunde(verloren).versuche, 6);
gleich("Verloren ist nicht gelöst", ERGEBNISSE.ausRunde(verloren).geloest, false);

gleich("Aenderungen: beide Stellen und die Marke", Object.keys(ERGEBNISSE.aenderungen("id1", "2026-09-24", ergebnis, 77)),
    ["wordle/tage/2026-09-24/id1", "wordle/verlauf/id1/2026-09-24", "geaendertAm"]);

gleich("Unbrauchbares Ergebnis fällt weg", ERGEBNISSE.normalisieren({ versuche: 9 }), null);
gleich("Muster-Müll fällt weg", ERGEBNISSE.normalisieren({ versuche: 2, geloest: true, muster: ["RRRRR", "XX", 4] }).muster, ["RRRRR"]);
gleich("Knoten: Müll fällt weg", Object.keys(ERGEBNISSE.knotenNormalisieren({ a: ergebnis, b: "kaputt" })), ["a"]);

/* ------------------------------------------------------------------ *
 * Senden über die Warteliste
 * ------------------------------------------------------------------ */

function leitung(klappt) {
    return {
        geschrieben: [],
        async teilSchreiben(aenderungen) {
            if (!klappt) {
                throw new Error("kein Netz");
            }
            this.geschrieben.push(aenderungen);
        }
    };
}

spaeter("Warteliste", (async () => {
    geraetLeeren();
    const kaputt = leitung(false);
    let antwort = await ERGEBNISSE.melden(kaputt, "id1", runde);
    gleich("Ohne Netz: nichts gesendet", antwort.gesendet, 0);
    gleich("Ohne Netz: Ergebnis bleibt auf dem Gerät", ICH.ausstehend().length, 1);
    gleich("Fehlertext kommt mit", antwort.fehler, "kein Netz");

    antwort = await ERGEBNISSE.melden(kaputt, "id1", runde);
    gleich("Dasselbe Ergebnis zweimal gemeldet: nur einmal in der Liste", ICH.ausstehend().length, 1);

    gleich("Wartendes zählt im eigenen Verlauf mit",
        Object.keys(ERGEBNISSE.verlaufMitAusstehendem({}, "id1")), ["2026-09-24"]);
    gleich("… aber nicht bei anderen", Object.keys(ERGEBNISSE.verlaufMitAusstehendem({}, "id2")), []);

    const heil = leitung(true);
    antwort = await ERGEBNISSE.nachreichen(heil);
    gleich("Mit Netz: nachgereicht", antwort.gesendet, 1);
    gleich("Mit Netz: Liste leer", ICH.ausstehend().length, 0);
    gleich("Gesendet an beide Stellen", Object.keys(heil.geschrieben[0]).length, 3);
})());

/* ------------------------------------------------------------------ *
 * Rangliste
 * ------------------------------------------------------------------ */

gleich("Punkte: 1. Versuch = 6", RANGLISTE.punkte({ geloest: true, versuche: 1 }), 6);
gleich("Punkte: 6. Versuch = 1", RANGLISTE.punkte({ geloest: true, versuche: 6 }), 1);
gleich("Punkte: nicht gelöst = 0", RANGLISTE.punkte({ geloest: false, versuche: 6 }), 0);
pruefe("Die Erklärung nennt die Zahlen", RANGLISTE.ERKLAERUNG.indexOf("6 Punkte") !== -1);

const spielerDaten = SPIELER.normalisieren({ spieler: [
    { id: "a", name: "Anna", freunde: ["b"] },
    { id: "b", name: "Ben", freunde: ["a"] },
    { id: "c", name: "Clara", freunde: [] }
] });
const e = (versuche, geloest, beendetAm) => ({ geloest: geloest, versuche: versuche, muster: [], beendetAm: beendetAm });

const tag = { a: e(4, true, 50), b: e(2, true, 90), c: e(4, true, 10), weg: e(1, true, 1) };
const tabelle = RANGLISTE.tagesTabelle(tag, spielerDaten, null);
gleich("Tagestabelle: Reihenfolge nach Punkten, dann wer früher fertig", tabelle.map((z) => z.id), ["b", "c", "a"]);
gleich("Gleiche Punkte = gleicher Platz", tabelle.map((z) => z.platz), [1, 2, 2]);
pruefe("Gelöschte Spieler stehen nicht in der Tabelle", tabelle.every((z) => z.id !== "weg"));

const nurFreunde = RANGLISTE.tagesTabelle(tag, spielerDaten, RANGLISTE.auswahl(spielerDaten, "a", true));
gleich("Nur Freunde: ich und meine Freunde", nurFreunde.map((z) => z.id), ["b", "a"]);
gleich("Alle: keine Auswahl", RANGLISTE.auswahl(spielerDaten, "a", false), null);

const woche = RANGLISTE.zeitraumTabelle({
    "2026-09-23": { a: e(2, true, 1), c: e(6, false, 1) },
    "2026-09-24": { a: e(6, true, 1), c: e(1, true, 1) }
}, spielerDaten, null);
gleich("Zeitraum: Summen", woche.map((z) => [z.id, z.punkte, z.gespielt, z.geloest]),
    [["a", 6, 2, 2], ["c", 6, 2, 1]]);
gleich("Zeitraum: Gleichstand, mehr gelöst zuerst, gleicher Platz", woche.map((z) => z.platz), [1, 1]);

gleich("Letzte Tage über den Monatswechsel", RANGLISTE.letzteTage("2026-10-02", 3),
    ["2026-10-02", "2026-10-01", "2026-09-30"]);

/* Statistik und Serie */
const verlauf = {
    "2026-09-20": e(3, true), "2026-09-21": e(6, false), "2026-09-22": e(2, true),
    "2026-09-23": e(4, true), "2026-09-24": e(5, true)
};
const statistik = RANGLISTE.statistik(verlauf, "2026-09-24");
gleich("Statistik: gespielt und gelöst", [statistik.gespielt, statistik.geloest, statistik.quote], [5, 4, 80]);
gleich("Statistik: Verteilung", statistik.verteilung, [0, 1, 1, 1, 1, 0]);
gleich("Serie: drei Tage am Stück bis heute", statistik.serie, 3);
gleich("Beste Serie", statistik.besteSerie, 3);
gleich("Heute noch nicht gespielt: Serie zählt bis gestern",
    RANGLISTE.statistik(verlauf, "2026-09-25").serie, 3);
gleich("Ein Tag ausgelassen: Serie gerissen", RANGLISTE.statistik(verlauf, "2026-09-26").serie, 0);
gleich("Lücke im Verlauf unterbricht die Serie",
    RANGLISTE.statistik({ "2026-09-01": e(2, true), "2026-09-03": e(2, true) }, "2026-09-03").serie, 1);
gleich("Leerer Verlauf", RANGLISTE.statistik({}, "2026-09-24").quote, 0);

fazit();
