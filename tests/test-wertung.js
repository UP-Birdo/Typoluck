/*
 * test-wertung.js — die Wertung einer Runde (js\wertung.js, seit 0.10.0).
 *
 *   - Erwartung und Gruppen rechnen richtig (kleines Handbeispiel);
 *   - Können liegt immer zwischen 0 und 100, der beste Versuch hat 100;
 *   - ein Versuch, der nichts ausschliesst, hat 0;
 *   - der letzte Kandidat richtig geraten = 100;
 *   - Glück ist getrennt und liegt zwischen 0 und 100;
 *   - Figuren: nicht gelöst 0, sonst 1..3 nach den Schwellen;
 *   - eine laufende Runde wird nicht gewertet;
 *   - eine ganze Runde auf der echten Wortliste ist schnell genug fürs Handy.
 */

const { pruefe, gleich, fazit } = require("./pruefer.js");
require("./umgebung.js");
const WERTUNG = require("../js/wertung.js");

/* Handbeispiel: Kandidaten abend/acker/adler; „acker" trennt alle drei. */
const kandidaten = ["abend", "acker", "adler"];
const gruppen = WERTUNG.gruppen("acker", kandidaten);
gleich("Gruppen: drei verschiedene Muster", Object.keys(gruppen).length, 3);
gleich("Erwartung bei drei Einzelgruppen = 1", WERTUNG.erwartung("acker", kandidaten), 1);
/* „zwölf" hat keinen Buchstaben mit abend/acker gemein: alles grau. */
const nichts = WERTUNG.erwartung("zwölf", ["abend", "acker"]);
gleich("Kein gemeinsamer Buchstabe: Erwartung = alle", nichts, 2);

const bester = WERTUNG.versuchWerten("acker", "abend", kandidaten);
gleich("Der beste Versuch hat Können 100", bester.koennen, 100);
gleich("Danach bleibt die Lösung allein", bester.nachher, 1);
pruefe("Der beste Versuch ist gewertet", bester.gewertet === true);
/* Steht die Lösung schon fest, zählt der Versuch nicht — der Spieler kennt
   die Lösungsliste nicht (erster Probelauf: TISCH 567 → 1, BLUME sonst 0 %). */
const letzter = WERTUNG.versuchWerten("abend", "abend", ["abend"]);
gleich("Lösung stand fest, richtig geraten: nicht gewertet", letzter.gewertet, false);
const falsch = WERTUNG.versuchWerten("acker", "abend", ["abend"]);
gleich("Lösung stand fest, anderes Wort: nicht gewertet", falsch.gewertet, false);

/* Figuren-Regel */
gleich("Nicht gelöst: 0 Figuren", WERTUNG.figuren(false, 99), 0);
gleich("Gelöst, unter der ersten Schwelle: Bauer", WERTUNG.figuren(true, WERTUNG.SCHWELLEN[0] - 1), 1);
gleich("Gelöst, auf der ersten Schwelle: Springer", WERTUNG.figuren(true, WERTUNG.SCHWELLEN[0]), 2);
gleich("Gelöst, auf der zweiten Schwelle: König", WERTUNG.figuren(true, WERTUNG.SCHWELLEN[1]), 3);
gleich("Schwellen wie im Entwurf (erster Ort)", WERTUNG.SCHWELLEN, [55, 75]);

/* Eine ganze Runde auf der echten Liste */
const loesung = WORDLE.tageswort("2026-09-27").wort;
let runde = WORDLE.neueRunde({ modus: "tag", datum: "2026-09-27", nummer: 4, loesung: loesung, zeitpunkt: 1 });
gleich("Laufende Runde: keine Wertung", WERTUNG.runde(runde), null);
for (const wort of ["tisch", "blume", loesung]) {
    runde = WORDLE.raten(runde, wort, 2).runde;
}
const beginn = Date.now();
const wertung = WERTUNG.runde(runde);
const dauer = Date.now() - beginn;
pruefe("Runde gewertet", !!wertung);
gleich("Je Versuch ein Eintrag", wertung.versuche.length, runde.versuche.length);
pruefe("Können und Glück je Versuch zwischen 0 und 100",
    wertung.versuche.every((v) => v.koennen >= 0 && v.koennen <= 100 && v.glueck >= 0 && v.glueck <= 100));
pruefe("Kandidaten werden nie mehr", wertung.versuche.every((v) => v.nachher <= v.vorher));
gleich("Der erste Versuch beginnt bei der ganzen Lösungsliste",
    wertung.versuche[0].vorher, WOERTER_DE.loesungen.length);
gleich("Letzter Versuch = Lösung: danach bleibt eine", wertung.versuche[wertung.versuche.length - 1].nachher, 1);
pruefe("Gelöst: mindestens ein Bauer", wertung.figuren >= 1);
const gewertete = wertung.versuche.filter((v) => v.gewertet);
gleich("Genauigkeit = Mittel des Könnens der gewerteten Versuche", wertung.genauigkeit,
    gewertete.length ? Math.round(gewertete.reduce((s, v) => s + v.koennen, 0) / gewertete.length) : 100);
pruefe("Der erste Versuch ist immer gewertet", wertung.versuche[0].gewertet === true);

/* Der Probelauf vom 27.09.2026: TISCH lässt nur BLICK übrig — BLUME und
   BLICK zählen nicht, die Genauigkeit ist die von TISCH. */
let probe = WORDLE.neueRunde({ modus: "tag", datum: "2026-09-27", nummer: 4, loesung: "blick", zeitpunkt: 1 });
for (const wort of ["tisch", "blume", "blick"]) {
    probe = WORDLE.raten(probe, wort, 2).runde;
}
const probeWertung = WERTUNG.runde(probe);
gleich("Probelauf: nur TISCH gewertet", probeWertung.versuche.map((v) => v.gewertet), [true, false, false]);
gleich("Probelauf: Genauigkeit = Können von TISCH", probeWertung.genauigkeit, probeWertung.versuche[0].koennen);
pruefe("Schnell genug (erste Wertung unter 3 s auf diesem Rechner)", dauer < 3000, dauer + " ms");

/* Verloren: keine Figur, Wertung trotzdem da */
let verloren = WORDLE.neueRunde({ modus: "uebung", loesung: loesung, zeitpunkt: 1 });
const falscheWoerter = WOERTER_DE.loesungen.filter((w) => w !== loesung).slice(0, 6);
for (const wort of falscheWoerter) {
    verloren = WORDLE.raten(verloren, wort, 2).runde;
}
const wertungVerloren = WERTUNG.runde(verloren);
gleich("Verloren: 0 Figuren", wertungVerloren.figuren, 0);
gleich("Verloren: sechs Versuche gewertet", wertungVerloren.versuche.length, 6);

fazit();
