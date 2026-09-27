/*
 * test-fortschritt.js — Level, XP, Serie, Heute (js\fortschritt.js, seit
 * 0.10.0, UPCrew-Runde 5).
 *
 *   - Level-Kosten 100, 125 … höchstens 500; Level aus XP;
 *   - XP je Partie, Tagesaufgabe, Figur, Serie — nur einmal je Tag;
 *   - beide Spiele am selben Tag: ×1,5, auch rückwirkend, einmal gezählt;
 *   - Serie: weiter, mit Schutz über eine Lücke, sonst neu;
 *   - nach Level 10: alle 5 ein Rahmen, dazwischen ein Serien-Schutz, der
 *     gleich gutgeschrieben wird;
 *   - der Datenvertrag ist additiv: fremde Felder und Blunderluck-Teile
 *     wandern durch, Kaputtes wird geglättet;
 *   - gespeichert je Spieler unter `upcrew.fortschritt`, frisch gelesen.
 */

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { pruefe, gleich, fazit, speicherAttrappe } = require("./pruefer.js");
const FORTSCHRITT = require("../js/fortschritt.js");

const fenster = {};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, "..", "js", "upcrew-anpassen.js"), "utf8"),
    { window: fenster }, { filename: "upcrew-anpassen.js" });
const STUFEN = fenster.UPCREW_ANPASSEN.STUFEN;

/* Level */
gleich("Kosten: 100, 125, 150 …", [1, 2, 3].map(FORTSCHRITT.kosten), [100, 125, 150]);
gleich("Kosten: höchstens 500", FORTSCHRITT.kosten(40), 500);
gleich("0 XP = Level 1", FORTSCHRITT.levelVon(0), { level: 1, hat: 0, kosten: 100 });
gleich("100 XP = Level 2", FORTSCHRITT.levelVon(100).level, 2);
gleich("225 XP = Level 3, 0 im Level", FORTSCHRITT.levelVon(225), { level: 3, hat: 0, kosten: 150 });
gleich("224 XP = Level 2, 124 im Level", FORTSCHRITT.levelVon(224), { level: 2, hat: 124, kosten: 125 });

/* Übung: nur die Partie */
const leer = FORTSCHRITT.leer();
const uebung = FORTSCHRITT.partie(leer, { spiel: "typoluck", datum: "2026-09-27", tagesaufgabe: false, figuren: 3 });
gleich("Übung: +10", uebung.xp, 10);
gleich("Übung: keine Serie", uebung.stand.serie.tage, 0);
gleich("Übung: zählt als Partie", uebung.stand.zaehler.partien, 1);

/* Tageswort mit König: 10 Partie + 30 Figuren + 20 Tagesaufgabe + 5 Serie Tag 1 */
const tag1 = FORTSCHRITT.partie(leer, { spiel: "typoluck", datum: "2026-09-27", tagesaufgabe: true, figuren: 3 });
gleich("Tageswort König, Tag 1: 65 XP", tag1.xp, 65);
gleich("Heute: Wort = 3 Figuren", tag1.stand.heute.wort, 3);
gleich("Serie: Tag 1", tag1.stand.serie, { tage: 1, schutz: 0, zuletzt: "2026-09-27" });
gleich("Zähler", [tag1.stand.zaehler.tagesaufgaben, tag1.stand.zaehler.figuren, tag1.stand.zaehler.besteSerie], [1, 3, 1]);
const nochmal = FORTSCHRITT.partie(tag1.stand, { spiel: "typoluck", datum: "2026-09-27", tagesaufgabe: true, figuren: 3 });
gleich("Dieselbe Tagesaufgabe nochmal: nur die Partie", nochmal.xp, 10);

/* Verloren: keine Tagesaufgabe, keine Serie */
const verloren = FORTSCHRITT.partie(leer, { spiel: "typoluck", datum: "2026-09-27", tagesaufgabe: true, figuren: 0 });
gleich("Tageswort verloren: nur die Partie", verloren.xp, 10);
gleich("Tageswort verloren: keine Serie", verloren.stand.serie.tage, 0);

/* Beide Spiele: Blunderluck hat heute das Tagesbrett (2 Figuren) */
const mitBrett = FORTSCHRITT.normalisieren({ xp: 50, heute: { datum: "2026-09-27", brett: 2, wort: 0, xp: 50 },
    serie: { tage: 1, schutz: 0, zuletzt: "2026-09-27" }, zaehler: { tagesaufgaben: 1 } });
const beide = FORTSCHRITT.partie(mitBrett, { spiel: "typoluck", datum: "2026-09-27", tagesaufgabe: true, figuren: 1 });
/* Gewinn: 10 + 10 (1 Figur) + 20 = 40 (keine Serie: der Tag zählte schon);
   Bonus: (50 + 40) × 0,5 = 45 → 85. */
gleich("Beide geschafft: ×1,5 rückwirkend", beide.xp, 85);
gleich("Beide-Tage gezählt", beide.stand.zaehler.beideTage, 1);
gleich("Serie zählt den Tag nur einmal", beide.stand.serie.tage, 1);
const danach = FORTSCHRITT.partie(beide.stand, { spiel: "typoluck", datum: "2026-09-27", tagesaufgabe: false });
gleich("Danach am selben Tag: jede Partie ×1,5", danach.xp, 15);
gleich("Beide-Tage nicht doppelt", danach.stand.zaehler.beideTage, 1);

/* Neuer Tag: heute fängt leer an */
const morgen = FORTSCHRITT.partie(beide.stand, { spiel: "typoluck", datum: "2026-09-28", tagesaufgabe: true, figuren: 2 });
gleich("Neuer Tag: Brett wieder 0", morgen.stand.heute.brett, 0);
gleich("Neuer Tag: Serie 2", morgen.stand.serie.tage, 2);
/* 10 + 20 + 20 + Serie 2×5 = 60 */
gleich("Neuer Tag: 60 XP", morgen.xp, 60);

/* Serie mit Lücke */
const alt = FORTSCHRITT.normalisieren({ serie: { tage: 5, schutz: 1, zuletzt: "2026-09-25" } });
gleich("Serie an: gestern verpasst, Schutz reicht", FORTSCHRITT.serieAn(alt, "2026-09-27"), 5);
gleich("Serie an: zwei Tage verpasst, Schutz reicht nicht", FORTSCHRITT.serieAn(alt, "2026-09-28"), 0);
const gerettet = FORTSCHRITT.partie(alt, { spiel: "typoluck", datum: "2026-09-27", tagesaufgabe: true, figuren: 1 });
gleich("Lücke mit Schutz: Serie 6, Schutz verbraucht", [gerettet.stand.serie.tage, gerettet.stand.serie.schutz], [6, 0]);
const gerissen = FORTSCHRITT.partie(alt, { spiel: "typoluck", datum: "2026-09-29", tagesaufgabe: true, figuren: 1 });
gleich("Lücke ohne genug Schutz: Serie neu bei 1", [gerissen.stand.serie.tage, gerissen.stand.serie.schutz], [1, 1]);
gleich("Serien-XP höchstens 35", FORTSCHRITT.partie(FORTSCHRITT.normalisieren(
    { serie: { tage: 20, schutz: 0, zuletzt: "2026-09-26" } }),
    { spiel: "typoluck", datum: "2026-09-27", tagesaufgabe: true, figuren: 1 }).xp, 10 + 10 + 20 + 35);

/* Belohnungen */
gleich("Level 11: Serien-Schutz", FORTSCHRITT.belohnungen(11, STUFEN), [{ art: "schutz", name: "Serien-Schutz" }]);
gleich("Level 15: Rahmen", FORTSCHRITT.belohnungen(15, STUFEN), [{ art: "rahmen", name: "Rahmen 15" }]);
pruefe("Level 1 bis 10: kein Schutz, kein Level-Rahmen",
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].every((l) => FORTSCHRITT.belohnungen(l, STUFEN).every((b) => b.art !== "schutz")));
pruefe("Aussehen-Belohnungen kommen aus den Stufen des Bausteins",
    FORTSCHRITT.belohnungen(2, STUFEN).some((b) => b.art === "farbwelt"));
const kurzVor11 = FORTSCHRITT.normalisieren({ xp: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].reduce((s, l) => s + FORTSCHRITT.kosten(l), 0) - 5 });
gleich("Kurz vor Level 11 steht Level 10", kurzVor11.level, 10);
const aufstieg = FORTSCHRITT.partie(kurzVor11, { spiel: "typoluck", datum: "2026-09-27", tagesaufgabe: false }, STUFEN);
gleich("Aufstieg auf 11", [aufstieg.levelVorher, aufstieg.levelNachher], [10, 11]);
gleich("Serien-Schutz gleich gutgeschrieben", aufstieg.stand.serie.schutz, 1);
pruefe("Aufstieg meldet die Belohnung", aufstieg.neu.some((b) => b.art === "schutz"));

/* Datenvertrag */
const fremd = FORTSCHRITT.normalisieren({ xp: "viel", level: 99, turm: { blunderluck: { ort: 2 } },
    zaehler: { partien: -3, siegeBlunderluck: 7 }, taten: ["a", 5], eigen: { x: 1 },
    heute: { datum: "2026-09-27", brett: 9 } });
gleich("Kaputte XP: 0", fremd.xp, 0);
gleich("Level wird aus XP gerechnet, nicht übernommen", fremd.level, 1);
gleich("Blunderlucks Turm wandert durch", fremd.turm, { blunderluck: { ort: 2 } });
gleich("Fremde Zähler wandern durch", fremd.zaehler.siegeBlunderluck, 7);
gleich("Negative Zähler: 0", fremd.zaehler.partien, 0);
gleich("Taten: nur Kennungen", fremd.taten, ["a"]);
gleich("Fremde Felder wandern durch", fremd.eigen, { x: 1 });
gleich("Figuren höchstens 3", fremd.heute.brett, 3);

/* Abzeichen */
const abz = FORTSCHRITT.abzeichen(FORTSCHRITT.normalisieren({ zaehler: { partien: 1600, besteSerie: 4 } }));
const viel = abz.find((a) => a.id === "partien");
gleich("Viel gespielt 1600: 6 Stufen + 1 Schritt", [viel.erreicht, viel.naechste], [7, 2000]);
const serie = abz.find((a) => a.id === "besteSerie");
gleich("Serie 4: Stufe 1, nächste 7", [serie.erreicht, serie.naechste], [1, 7]);

/* XP-Quellen aus denselben Zahlen */
gleich("Quellen zum Anzeigen", FORTSCHRITT.quellen().map((q) => q.wert), ["+10", "+10", "+20", "×1,5", "+5…35"]);
pruefe("Kurze Namen passen unter die Kacheln (höchstens 7 Zeichen)",
    FORTSCHRITT.quellen().every((q) => q.titel.length <= 7) && FORTSCHRITT.ABZEICHEN.every((a) => a.kurz.length <= 7));

/* Speicher: je Spieler, frisch gelesen, fremde Einträge bleiben */
const speicher = speicherAttrappe();
FORTSCHRITT._speicher = () => speicher;
speicher.setItem(FORTSCHRITT.SCHLUESSEL, JSON.stringify({ "anderer": { xp: 500, blunder: true } }));
const gespeichert = FORTSCHRITT.aendern("ich", (stand) => FORTSCHRITT.partie(stand,
    { spiel: "typoluck", datum: "2026-09-27", tagesaufgabe: true, figuren: 2 }), 1234);
const alle = JSON.parse(speicher.getItem(FORTSCHRITT.SCHLUESSEL));
gleich("Eigener Eintrag gespeichert", alle.ich.xp, gespeichert.stand.xp);
gleich("Stand = Zeitpunkt der Änderung", alle.ich.stand, 1234);
gleich("Fremder Eintrag bleibt unberührt", alle.anderer, { xp: 500, blunder: true });
gleich("Laden liest ihn zurück", FORTSCHRITT.laden("ich").xp, gespeichert.stand.xp);
FORTSCHRITT.aendern(null, (stand) => FORTSCHRITT.partie(stand, { spiel: "typoluck", datum: "2026-09-27" }));
gleich("Ohne Id wird nichts geschrieben", Object.keys(JSON.parse(speicher.getItem(FORTSCHRITT.SCHLUESSEL))).sort(),
    ["anderer", "ich"]);
speicher.setItem(FORTSCHRITT.SCHLUESSEL, "{kaputt");
gleich("Kaputter Speicher: leerer Stand", FORTSCHRITT.laden("ich").xp, 0);
gleich("Schlüssel gehört UPCrew (geteilt mit Blunderluck)", FORTSCHRITT.SCHLUESSEL, "upcrew.fortschritt");

fazit();
