/*
 * test-fortschritt.js — Level, XP, Serie, Heute (js\fortschritt.js, seit
 * 0.10.0; seit 0.11.0 im gemeinsamen Zweig-Vertrag, seit 0.12.0 mit den
 * Profil-Werten).
 *
 *   - Level-Kosten 100, 125 … höchstens 500; Level aus der SUMME aller Zweige;
 *   - XP je Partie, Tagesaufgabe, Figur, Serie — nur einmal je Tag;
 *   - ×1,5 auf die eigene Tagesaufgabe, wenn Blunderluck heute geschafft hat;
 *   - Serie über die `tage` BEIDER Zweige, Schutz aus dem Level;
 *   - der Umzug des flachen 0.10.0-Stands: nichts geht verloren (XP, Serie,
 *     Schutz, heute, Zähler), auch als Mischform, auch einmalig im Speicher;
 *   - Typoluck schreibt nur seinen Zweig; fremde Zweige wandern wörtlich durch;
 *   - Profil: Rahmen/Titel, Abzeichen über alle Spiele, Statistik, Spiele.
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

const HEUTE = "2026-09-27";
const tl = (stand) => stand.spiele.typoluck;
/* Ein Blunderluck-Zweig, wie Blunderluck v0.149/v0.150 ihn schreibt. */
const blunderZweig = (angaben) => Object.assign({ xp: 0, partien: 0, gezaehlt: [], stand: 5 }, angaben);

/* ------------------------------------------------------------------ *
 * Level
 * ------------------------------------------------------------------ */
gleich("Kosten: 100, 125, 150 …", [1, 2, 3].map(FORTSCHRITT.kosten), [100, 125, 150]);
gleich("Kosten: höchstens 500", FORTSCHRITT.kosten(40), 500);
gleich("0 XP = Level 1", FORTSCHRITT.levelVon(0), { level: 1, hat: 0, kosten: 100 });
gleich("100 XP = Level 2", FORTSCHRITT.levelVon(100).level, 2);
gleich("225 XP = Level 3, 0 im Level", FORTSCHRITT.levelVon(225), { level: 3, hat: 0, kosten: 150 });
gleich("224 XP = Level 2, 124 im Level", FORTSCHRITT.levelVon(224), { level: 2, hat: 124, kosten: 125 });
const zweiSpiele = { version: 1, spiele: { typoluck: { xp: 60 }, blunderluck: blunderZweig({ xp: 70 }) } };
gleich("Level = Summe aller Zweige (60 + 70)", [FORTSCHRITT.gesamtXp(zweiSpiele), FORTSCHRITT.level(zweiSpiele).level],
    [130, 2]);

/* ------------------------------------------------------------------ *
 * Partien
 * ------------------------------------------------------------------ */
const leer = FORTSCHRITT.leer();
gleich("Leerer Stand: Zweig-Form", leer, { version: 1, spiele: {} });
const uebung = FORTSCHRITT.partie(leer, { datum: HEUTE, tagesaufgabe: false, figuren: 3 });
gleich("Übung: +10", uebung.xp, 10);
gleich("Übung: kein Tag", tl(uebung.stand).tage, []);
gleich("Übung: zählt als Partie", tl(uebung.stand).partien, 1);
pruefe("Übung: kein fremder Zweig entsteht", Object.keys(uebung.stand.spiele).join() === "typoluck");

/* Tageswort mit König: 10 Partie + 30 Figuren + 20 Tagesaufgabe + 5 Serie Tag 1 */
const tag1 = FORTSCHRITT.partie(leer, { datum: HEUTE, tagesaufgabe: true, figuren: 3, koennen: 81 });
gleich("Tageswort König, Tag 1: 65 XP", tag1.xp, 65);
gleich("Heute: 3 Figuren, 1 Versuch", tl(tag1.stand).heute, { datum: HEUTE, versuche: 1, figuren: 3 });
gleich("Tage: heute", tl(tag1.stand).tage, [HEUTE]);
const z1 = tl(tag1.stand).zaehler;
gleich("Zähler", [z1.tagesaufgaben, z1.figuren, z1.besteSerie, z1.beideTage], [1, 3, 1, 0]);
gleich("Können gemerkt", [z1.koennenSumme, z1.koennenAnzahl, z1.koennenBeste], [81, 1, 81]);
const nochmal = FORTSCHRITT.partie(tag1.stand, { datum: HEUTE, tagesaufgabe: true, figuren: 3 });
gleich("Dieselbe Tagesaufgabe nochmal: nur die Partie", nochmal.xp, 10);

const verloren = FORTSCHRITT.partie(leer, { datum: HEUTE, tagesaufgabe: true, figuren: 0 });
gleich("Tageswort verloren: nur die Partie", verloren.xp, 10);
gleich("Tageswort verloren: kein Tag", tl(verloren.stand).tage, []);

/* Beide Spiele: Blunderluck hat heute das Tagesbrett geschafft (2 Figuren) */
const mitBrett = { version: 1, spiele: { blunderluck: blunderZweig({ xp: 50, partien: 3,
    heute: { datum: HEUTE, versuche: 2, figuren: 2 }, tage: ["2026-09-26", HEUTE] }) } };
gleich("Tagesbrett aus dem Blunderluck-Zweig", FORTSCHRITT.heuteVon(mitBrett, "blunderluck", HEUTE), 2);
pruefe("Anderes Spiel heute geschafft", FORTSCHRITT.andereHeute(mitBrett, HEUTE));
pruefe("… gestern zählt nicht", !FORTSCHRITT.andereHeute(mitBrett, "2026-09-28"));
const beide = FORTSCHRITT.partie(mitBrett, { datum: HEUTE, tagesaufgabe: true, figuren: 1 });
/* 10 Partie + 10 Figur + 20 × 1,5 = 30 + Serie 2 Tage (26. und 27. aus
   Blunderluck) = 10 → 60. */
gleich("Beide: ×1,5 auf die eigene Tagesaufgabe, Serie über beide Zweige", beide.xp, 60);
gleich("Beide-Tage gezählt", tl(beide.stand).zaehler.beideTage, 1);
gleich("Blunderlucks Zweig wörtlich unverändert", beide.stand.spiele.blunderluck, mitBrett.spiele.blunderluck);
const nichtBeide = { version: 1, spiele: { blunderluck: blunderZweig({
    heute: { datum: "2026-09-26", versuche: 1, figuren: 3 }, tage: ["2026-09-26"] }) } };
gleich("Tagesbrett von gestern: kein ×1,5 (10+10+20+Serie 2×5)",
    FORTSCHRITT.partie(nichtBeide, { datum: HEUTE, tagesaufgabe: true, figuren: 1 }).xp, 50);

/* Neuer Tag */
const morgen = FORTSCHRITT.partie(tag1.stand, { datum: "2026-09-28", tagesaufgabe: true, figuren: 2 });
gleich("Neuer Tag: heute neu", tl(morgen.stand).heute, { datum: "2026-09-28", versuche: 1, figuren: 2 });
/* 10 + 20 + 20 + Serie 2×5 = 60 */
gleich("Neuer Tag: 60 XP", morgen.xp, 60);
gleich("Neuer Tag: Serie 2", FORTSCHRITT.serieHeute(morgen.stand, "2026-09-28").tage, 2);

/* ------------------------------------------------------------------ *
 * Serie und Schutz
 * ------------------------------------------------------------------ */
const mitLuecke = { version: 1, spiele: {
    typoluck: { tage: ["2026-09-21", "2026-09-22", "2026-09-24"] },
    blunderluck: blunderZweig({ tage: ["2026-09-23"] }) } };
gleich("Serie über beide Zweige (21.–24.)", FORTSCHRITT.serie(mitLuecke, "2026-09-25", 0).tage, 4);
gleich("Lücke ohne Schutz: Serie reisst", FORTSCHRITT.serie(
    { spiele: { typoluck: { tage: ["2026-09-21", "2026-09-23"] } } }, "2026-09-23", 0).tage, 1);
gleich("Lücke mit Schutz: überbrückt", FORTSCHRITT.serie(
    { spiele: { typoluck: { tage: ["2026-09-21", "2026-09-23"] } } }, "2026-09-23", 1),
    { tage: 2, heute: true, schutzGenutzt: 1 });
/* Seit 0.26.0 (Nutzer 29.09.2026: „serien schild raus"): kein Schutz mehr. */
gleich("Schutz verdient: seit 0.26.0 immer 0", [10, 14, 15, 16, 80].map(FORTSCHRITT.schutzVerdient),
    [0, 0, 0, 0, 0]);
gleich("Serien-XP höchstens 35", FORTSCHRITT.partie({ spiele: { typoluck: { tage:
    ["2026-09-18", "2026-09-19", "2026-09-20", "2026-09-21", "2026-09-22", "2026-09-23", "2026-09-24",
        "2026-09-25", "2026-09-26"] } } }, { datum: HEUTE, tagesaufgabe: true, figuren: 1 }).xp, 10 + 10 + 20 + 35);

/* ------------------------------------------------------------------ *
 * DER UMZUG aus 0.10.0 (live!) — nichts darf verloren gehen
 * ------------------------------------------------------------------ */
const flach = {
    stand: 1759000000000, xp: 2150, level: 12,
    serie: { tage: 4, schutz: 1, zuletzt: "2026-09-26" },
    heute: { datum: HEUTE, brett: 0, wort: 2, xp: 40 },
    turm: {}, taten: ["t1", 7],
    zaehler: { partien: 44, tagesaufgaben: 9, beideTage: 1, figuren: 17, besteSerie: 6, eigenerZaehler: 3 },
    fremdOben: { a: 1 }
};
pruefe("Flacher Stand wird erkannt", FORTSCHRITT.umzugNoetig(flach));
const umgezogen = FORTSCHRITT.normalisieren(flach);
const uz = tl(umgezogen);
gleich("Umzug: XP bleiben", uz.xp, 2150);
gleich("Umzug: Level bleibt (aus der Summe gerechnet)", FORTSCHRITT.level(umgezogen).level,
    FORTSCHRITT.levelVon(2150).level);
gleich("Umzug: Partien", uz.partien, 44);
gleich("Umzug: Zähler (auch fremde)", [uz.zaehler.tagesaufgaben, uz.zaehler.beideTage, uz.zaehler.figuren,
    uz.zaehler.besteSerie, uz.zaehler.eigenerZaehler], [9, 1, 17, 6, 3]);
gleich("Umzug: Taten (nur Kennungen)", uz.taten, ["t1"]);
gleich("Umzug: heute = Tageswort mit 2 Figuren", uz.heute, { datum: HEUTE, versuche: 1, figuren: 2 });
gleich("Umzug: Serie wird zu Tagen bis zuletzt, dazu heute",
    uz.tage, ["2026-09-23", "2026-09-24", "2026-09-25", "2026-09-26", HEUTE]);
gleich("Umzug: Serie ist heute 5 (4 bis gestern + heute)", FORTSCHRITT.serieHeute(umgezogen, HEUTE).tage, 5);
gleich("Umzug: Serie ohne heute bliebe 4", FORTSCHRITT.serieHeute(FORTSCHRITT.normalisieren(
    Object.assign({}, flach, { heute: { datum: HEUTE, brett: 0, wort: 0, xp: 0 } })), HEUTE).tage, 4);
gleich("Umzug: ein alter Schutz rettet nichts mehr (seit 0.26.0)",
    FORTSCHRITT.serieHeute(umgezogen, HEUTE).schutz, 0);
gleich("Umzug: Stand-Zeitpunkt bleibt", uz.stand, 1759000000000);
pruefe("Umzug: der alte Stand steht NICHT im Zweig (nur Gerät, seit 0.14.0)", !("umzug" in uz));
gleich("Umzug: fremde Felder oben bleiben", umgezogen.fremdOben, { a: 1 });
pruefe("Umzug: keine flachen Felder mehr oben",
    ["xp", "serie", "heute", "zaehler", "level", "turm"].every((f) => !(f in umgezogen)));
pruefe("Nach dem Umzug nie wieder", !FORTSCHRITT.umzugNoetig(umgezogen));
gleich("Umzug zweimal = einmal", FORTSCHRITT.normalisieren(umgezogen), umgezogen);
const serieLang = FORTSCHRITT.normalisieren({ xp: 1, serie: { tage: 200, schutz: 0, zuletzt: "2026-09-26" } });
gleich("Umzug: lange Serie auf 60 Tage gekappt, beste Serie bleibt 200",
    [tl(serieLang).tage.length, tl(serieLang).zaehler.besteSerie], [60, 200]);

/* Mischform: Blunderluck hat den flachen Stand schon angefasst */
const misch = Object.assign({ version: 1, spiele: { blunderluck: blunderZweig({ xp: 90 }) } }, flach);
const mischNeu = FORTSCHRITT.normalisieren(misch);
gleich("Mischform: Typoluck-XP und Blunderluck-XP", [tl(mischNeu).xp, mischNeu.spiele.blunderluck.xp], [2150, 90]);
gleich("Mischform: Level aus beiden", FORTSCHRITT.gesamtXp(mischNeu), 2240);

/* Einmalig im Speicher: umziehenAlle — der alte Stand wörtlich auf dem
   Gerät unter eigenem Schlüssel, nie im Zweig */
const speicher = speicherAttrappe();
FORTSCHRITT._speicher = () => speicher;
const blunderEintrag = { version: 1, spiele: { blunderluck: blunderZweig({ xp: 40 }) } };
speicher.setItem(FORTSCHRITT.SCHLUESSEL, JSON.stringify({ "ich": flach, "anderer": blunderEintrag }));
gleich("umziehenAlle: ein Eintrag umgezogen", FORTSCHRITT.umziehenAlle(), 1);
let alle = JSON.parse(speicher.getItem(FORTSCHRITT.SCHLUESSEL));
gleich("umziehenAlle: im Speicher steht die Zweig-Form", alle.ich.spiele.typoluck.xp, 2150);
gleich("umziehenAlle: fremder Eintrag wörtlich", alle.anderer, blunderEintrag);
gleich("umziehenAlle: der alte Stand wörtlich auf dem Gerät", FORTSCHRITT.umzugGesichert("ich"), { von: "0.10.0", alt: {
    stand: flach.stand, xp: flach.xp, level: flach.level, serie: flach.serie, heute: flach.heute,
    turm: flach.turm, taten: flach.taten, zaehler: flach.zaehler } });
pruefe("umziehenAlle: Sicherung im Namensraum von Typoluck", FORTSCHRITT.UMZUG_SCHLUESSEL.indexOf("typoluck.") === 0);
gleich("umziehenAlle: beim zweiten Start nichts mehr", FORTSCHRITT.umziehenAlle(), 0);
/* 0.11.0–0.13.0 (nur lokal) legten `umzug` in den Zweig: zieht aufs Gerät */
speicher.setItem(FORTSCHRITT.SCHLUESSEL, JSON.stringify({ "lokal": { version: 1, spiele: {
    typoluck: { xp: 7, umzug: { von: "0.10.0", alt: { xp: 7 } } } } } }));
gleich("umziehenAlle: altes umzug-Feld verlässt den Zweig", FORTSCHRITT.umziehenAlle(), 1);
pruefe("… nicht mehr im Zweig", !("umzug" in JSON.parse(speicher.getItem(FORTSCHRITT.SCHLUESSEL)).lokal.spiele.typoluck));
gleich("… sondern auf dem Gerät", FORTSCHRITT.umzugGesichert("lokal"), { von: "0.10.0", alt: { xp: 7 } });

/* Fürs Konto: nur die Felder der Regel §11b (Blunderluck SICHERHEIT.md) */
const kontoForm = FORTSCHRITT.fuerKonto({ version: 1, oben: 1, spiele: {
    typoluck: { xp: 5, partien: 2, stand: 9, tage: [HEUTE], heute: { datum: HEUTE, versuche: 1, figuren: 2, xp: 40 },
        zaehler: { figuren: 2, "kaputt-name": 3, text: "x" }, taten: ["serie-7"], umzug: { alt: {} }, neu: 1 },
    blunderluck: blunderZweig({ xp: 9 }) } });
gleich("Konto: oben nur version und spiele", Object.keys(kontoForm).sort(), ["spiele", "version"]);
gleich("Konto: nur der eigene Zweig", Object.keys(kontoForm.spiele), ["typoluck"]);
gleich("Konto: nur Felder der Regel", Object.keys(kontoForm.spiele.typoluck).sort(),
    ["gezaehlt", "heute", "partien", "stand", "tage", "taten", "xp", "zaehler"]);
gleich("Konto: heute ohne Zusatzfelder", kontoForm.spiele.typoluck.heute, { datum: HEUTE, versuche: 1, figuren: 2 });
pruefe("Konto: Zähler nur Buchstaben-Namen mit Zahl",
    Object.keys(kontoForm.spiele.typoluck.zaehler).every((k) => /^[a-zA-Z]{1,32}$/.test(k))
        && !("kaputt-name" in kontoForm.spiele.typoluck.zaehler) && !("text" in kontoForm.spiele.typoluck.zaehler));

/* ------------------------------------------------------------------ *
 * Speicher: nur der eigene Zweig wird geschrieben
 * ------------------------------------------------------------------ */
speicher.setItem(FORTSCHRITT.SCHLUESSEL, JSON.stringify({ "anderer": { xp: 500, blunder: true } }));
const gespeichert = FORTSCHRITT.aendern("ich", (stand) => FORTSCHRITT.partie(stand,
    { datum: HEUTE, tagesaufgabe: true, figuren: 2 }), 1234);
alle = JSON.parse(speicher.getItem(FORTSCHRITT.SCHLUESSEL));
gleich("Eigener Zweig gespeichert", alle.ich.spiele.typoluck.xp, tl(gespeichert.stand).xp);
gleich("Stand = Zeitpunkt der Änderung", alle.ich.spiele.typoluck.stand, 1234);
gleich("Fremder Eintrag (flach, anderer Spieler) bleibt unberührt", alle.anderer, { xp: 500, blunder: true });
gleich("Laden liest ihn zurück", tl(FORTSCHRITT.laden("ich")).xp, tl(gespeichert.stand).xp);

/* Blunderluck schreibt zwischen Lesen und Schreiben: sein Zweig bleibt */
speicher.setItem(FORTSCHRITT.SCHLUESSEL, JSON.stringify({ "ich": { version: 1, spiele: {
    typoluck: { xp: 100, stand: 10 }, blunderluck: blunderZweig({ xp: 30, stand: 20 }) } } }));
FORTSCHRITT.aendern("ich", (stand) => {
    /* In diesem Augenblick speichert Blunderluck im selben Browser. */
    const zwischen = JSON.parse(speicher.getItem(FORTSCHRITT.SCHLUESSEL));
    zwischen.ich.spiele.blunderluck.xp = 45;
    speicher.setItem(FORTSCHRITT.SCHLUESSEL, JSON.stringify(zwischen));
    return FORTSCHRITT.partie(stand, { datum: HEUTE });
}, 2000);
alle = JSON.parse(speicher.getItem(FORTSCHRITT.SCHLUESSEL));
gleich("Gleichzeitiges Blunderluck-Speichern geht nicht verloren", alle.ich.spiele.blunderluck.xp, 45);
gleich("… und der eigene Zweig ist drin", alle.ich.spiele.typoluck.xp, 110);

/* Gäste stehen seit 0.11.0 unter „gast" (wie Blunderluck); ein Gast-Stand
   von 0.10.0 unter der Konto-Id zieht einmal dorthin. */
speicher.setItem(FORTSCHRITT.SCHLUESSEL, JSON.stringify({ "gast-uid": flach,
    "gast": { version: 1, spiele: { blunderluck: blunderZweig({ xp: 20 }) } } }));
pruefe("Gast: Stand der Id zieht unter „gast“", FORTSCHRITT.gastUebernehmen("gast-uid"));
alle = JSON.parse(speicher.getItem(FORTSCHRITT.SCHLUESSEL));
gleich("Gast: Typoluck-Zweig da, Blunderluck-Zweig bleibt", [alle.gast.spiele.typoluck.xp, alle.gast.spiele.blunderluck.xp],
    [2150, 20]);
pruefe("Gast: der alte Eintrag bleibt stehen", !!alle["gast-uid"]);
pruefe("Gast: kein zweites Mal", !FORTSCHRITT.gastUebernehmen("gast-uid"));
gleich("Gast-Schlüssel wie Blunderluck", FORTSCHRITT.GAST, "gast");
speicher.setItem(FORTSCHRITT.SCHLUESSEL, JSON.stringify({ "ich": alle.gast }));

FORTSCHRITT.aendern(null, (stand) => FORTSCHRITT.partie(stand, { datum: HEUTE }));
gleich("Ohne Id wird nichts geschrieben", Object.keys(JSON.parse(speicher.getItem(FORTSCHRITT.SCHLUESSEL))), ["ich"]);
speicher.setItem(FORTSCHRITT.SCHLUESSEL, "{kaputt");
gleich("Kaputter Speicher: leerer Stand", FORTSCHRITT.laden("ich"), FORTSCHRITT.leer());
gleich("Schlüssel gehört UPCrew (geteilt mit Blunderluck)", FORTSCHRITT.SCHLUESSEL, "upcrew.fortschritt");

/* Zusammenführen: je Zweig der neuere */
const geraet = { version: 1, spiele: { typoluck: { xp: 50, stand: 9 }, blunderluck: blunderZweig({ xp: 1, stand: 1 }) } };
const konto = { version: 1, spiele: { typoluck: { xp: 40, stand: 3 }, blunderluck: blunderZweig({ xp: 70, stand: 8 }) } };
const zusammen = FORTSCHRITT.zusammenfuehren(geraet, konto);
gleich("Zusammenführen: je Zweig der neuere", [tl(zusammen).xp, zusammen.spiele.blunderluck.xp], [50, 70]);

/* Datenvertrag: Kaputtes im eigenen Zweig wird geglättet, Fremdes bleibt */
const kaputt = FORTSCHRITT.normalisieren({ version: 1, eigen: { x: 1 }, spiele: {
    typoluck: { xp: "viel", partien: -3, heute: { datum: "gestern", figuren: 9 }, tage: ["2026-09-27", "x", "2026-09-27"],
        zaehler: { figuren: -1, fremd: 7 }, taten: ["a", 5], neuesFeld: true },
    blunderluck: { xp: "auch kaputt", turm: { figuren: { "1-0": 3 } } },
    kaputtesSpiel: 5 } });
gleich("Kaputte XP: 0", tl(kaputt).xp, 0);
gleich("Negative Partien: 0", tl(kaputt).partien, 0);
gleich("Heute: kaputtes Datum leer, Figuren höchstens 3", tl(kaputt).heute, { datum: "", versuche: 0, figuren: 3 });
gleich("Tage: nur gültige, ohne Doppel", tl(kaputt).tage, ["2026-09-27"]);
gleich("Fremde Zähler wandern durch", tl(kaputt).zaehler.fremd, 7);
gleich("Neue Felder im eigenen Zweig bleiben", tl(kaputt).neuesFeld, true);
gleich("Fremde Felder oben bleiben", kaputt.eigen, { x: 1 });
gleich("Blunderlucks Zweig wörtlich (auch kaputt)", kaputt.spiele.blunderluck,
    { xp: "auch kaputt", turm: { figuren: { "1-0": 3 } } });
pruefe("Kein Zweig aus Unsinn", !("kaputtesSpiel" in kaputt.spiele));
gleich("Kaputte fremde XP zählen 0", FORTSCHRITT.gesamtXp(kaputt), 0);

/* ------------------------------------------------------------------ *
 * Belohnungen, Rahmen, Titel — seit 0.14.0 EINE Regel mit Blunderluck:
 * Rahmen ab Level 10, dann alle 5
 * ------------------------------------------------------------------ */
gleich("Level 11: kein Serien-Schutz mehr (seit 0.26.0), seit 0.27.0 die Farbwelt Feld",
    FORTSCHRITT.belohnungen(11, STUFEN), [{ art: "farbwelt", name: "feld" }]);
/* Seit 0.27.0 (EINBAU-2026-09-29c): Farbwelten nach dem Level-Pfad, Grau ist Stufe 0. */
gleich("Farbwelten: Werkstatt Lv 2, Studio 3, Feld 11, Tiefsee 21, Gold 40",
    [2, 3, 11, 21, 40].map((l) => FORTSCHRITT.belohnungen(l, STUFEN).filter((b) => b.art === "farbwelt").map((b) => b.name)),
    [["werkstatt"], ["studio"], ["feld"], ["tiefsee"], ["gold"]]);
pruefe("Grau ist keine Belohnung (Stufe 0, gleich da)",
    Array.from({ length: 100 }, (_, i) => i + 1).every((l) =>
        FORTSCHRITT.belohnungen(l, STUFEN).every((b) => !(b.art === "farbwelt" && b.name === "grau"))));
/* Seit 0.15.0: Kachel-Sets über das Level (Tabelle wie in js\sammlung.js) */
const mitSets = Object.assign({}, STUFEN, { kachelset: { kreide: 3, kupfer: 12 } });
pruefe("Level 3 bringt das Kachel-Set Kreide",
    FORTSCHRITT.belohnungen(3, mitSets, { kachelset: { kreide: "Kreide" } })
        .some((b) => b.art === "kachelset" && b.name === "Kreide"));
gleich("Level 12: Kachel-Set", FORTSCHRITT.belohnungen(12, mitSets).map((b) => b.art),
    ["kachelset"]);
gleich("Level 10: Rahmen Silber + Titel Stammgast", FORTSCHRITT.belohnungen(10, STUFEN),
    [{ art: "rahmen", name: "Silber" }, { art: "titel", name: "Stammgast" }]);
gleich("Level 15 Gold, 20 Platin, 25 Glanz 25 + Kenner", [15, 20, 25].map((l) => FORTSCHRITT.belohnungen(l, STUFEN)),
    [[{ art: "rahmen", name: "Gold" }], [{ art: "rahmen", name: "Platin" }],
        [{ art: "rahmen", name: "Glanz 25" }, { art: "titel", name: "Kenner" }]]);
pruefe("Kein Level bringt Schutz",
    Array.from({ length: 100 }, (_, i) => i + 1).every((l) => FORTSCHRITT.belohnungen(l, STUFEN).every((b) => b.art !== "schutz")));
pruefe("Unter Level 10 kein Rahmen (Kupfer ab 5, Silber ab 8 sind weg)",
    [1, 2, 3, 4, 5, 6, 7, 8, 9].every((l) => FORTSCHRITT.belohnungen(l, STUFEN).every((b) => b.art !== "rahmen")));
pruefe("Rahmen genau bei 10, 15, 20 … bis 100",
    Array.from({ length: 100 }, (_, i) => i + 1).every((l) =>
        FORTSCHRITT.belohnungen(l, null).some((b) => b.art === "rahmen") === (l >= 10 && l % 5 === 0)));
pruefe("Aussehen-Belohnungen kommen aus den Stufen des Bausteins",
    FORTSCHRITT.belohnungen(2, STUFEN).some((b) => b.art === "farbwelt"));
gleich("Rahmen: unter 10 keiner", FORTSCHRITT.rahmenVon(9), null);
gleich("Rahmen: 10 Silber, 17 Gold, 22 Platin, 31 Glanz",
    [10, 17, 22, 31].map((l) => FORTSCHRITT.rahmenVon(l).stufe), ["silber", "gold", "platin", "glanz"]);
gleich("Rahmen 31 heisst Glanz 30", FORTSCHRITT.rahmenVon(31).name, "Glanz 30");
gleich("Titel: 1 Neuling, 12 Stammgast, 30 Kenner, 50 Legende",
    [1, 12, 30, 50].map(FORTSCHRITT.titelVon), ["Neuling", "Stammgast", "Kenner", "Legende"]);

/* Grund-XP der Tagesaufgabe nach Schwierigkeit (seit 0.14.0) */
gleich("Grund-XP: leicht 15, mittel 20, schwer 30, unbekannt 20",
    [1, 2, 3, undefined].map(FORTSCHRITT.grundXp), [15, 20, 30, 20]);
gleich("Tageswort schwer, König, Tag 1: 10 + 30 + 30 + 5",
    FORTSCHRITT.partie(leer, { datum: HEUTE, tagesaufgabe: true, figuren: 3, stufe: 3 }).xp, 75);
gleich("Tageswort leicht, Bauer, mit Tagesbrett: 10 + 10 + 15×1,5 (23) + Serie 2×5",
    FORTSCHRITT.partie(mitBrett, { datum: HEUTE, tagesaufgabe: true, figuren: 1, stufe: 1 }).xp, 53);
const kurzVor11 = { spiele: { typoluck: { xp: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    .reduce((s, l) => s + FORTSCHRITT.kosten(l), 0) - 5 } } };
const aufstieg = FORTSCHRITT.partie(kurzVor11, { datum: HEUTE, tagesaufgabe: false }, STUFEN);
gleich("Aufstieg auf 11", [aufstieg.levelVorher, aufstieg.levelNachher], [10, 11]);
pruefe("Aufstieg meldet keinen Schutz", !aufstieg.neu.some((b) => b.art === "schutz"));
gleich("Schutz nach dem Aufstieg: 0", FORTSCHRITT.serieHeute(aufstieg.stand, HEUTE).schutz, 0);
const vonBlunderluck = { spiele: { typoluck: { xp: 90 }, blunderluck: blunderZweig({ xp: 5 }) } };
gleich("Aufstieg zählt Blunderlucks XP mit", FORTSCHRITT.partie(vonBlunderluck, { datum: HEUTE }).levelNachher, 2);

/* ------------------------------------------------------------------ *
 * Profil: Abzeichen, Statistik, Spiele
 * ------------------------------------------------------------------ */
const profil = { version: 1, spiele: {
    typoluck: { xp: 300, partien: 1600, tage: ["2026-09-25", "2026-09-26"],
        zaehler: { tagesaufgaben: 12, beideTage: 1, figuren: 20, besteSerie: 4,
            koennenSumme: 300, koennenAnzahl: 4, koennenBeste: 92 } },
    blunderluck: blunderZweig({ xp: 50, partien: 37, tage: ["2026-09-24", "2026-09-25", "2026-09-26"],
        turm: { figuren: { "1-0": 3, "1-1": 2, "2-0": 1 } } })
} };
const werte = FORTSCHRITT.abzeichenWerte(profil, HEUTE);
gleich("Abzeichen über beide Spiele: Partien", werte.partien, 1637);
gleich("Abzeichen: Figuren = Tageswort + Turm", werte.figuren, 26);
gleich("Abzeichen: Tagesaufgaben = Zähler + Blunderluck-Tage", werte.tagesaufgaben, 15);
gleich("Abzeichen: Beide = mindestens die gemeinsamen Tage", werte.beideTage, 2);
gleich("Abzeichen: Serie = max(bester Lauf, laufende über beide)", werte.besteSerie, 4);
const abz = FORTSCHRITT.abzeichen(profil, HEUTE);
const viel = abz.find((a) => a.id === "partien");
gleich("Viel gespielt 1637: 6 Stufen + 1 Schritt, nach oben offen", [viel.erreicht, viel.naechste], [7, 2000]);
const UPCREW_ABZEICHEN = require("../js/upcrew-abzeichen.js");
gleich("Abzeichen-Stufen wie im Entwurf", UPCREW_ABZEICHEN.ABZEICHEN.map((a) => a.stufen), [
    [10, 50, 100, 250, 500, 1000], [3, 7, 30, 100, 365], [1, 10, 30, 100], [10, 30, 60, 100, 150], [1, 10, 50, 100, 365]]);

/* Seit 0.15.9 rechnet der gemeinsame Baustein js\upcrew-abzeichen.js. Derselbe
   Fortschritt muss dieselben Abzeichen ergeben wie die eigene Rechnung bis
   0.15.8 — die Werte unten hat die ALTE Rechnung geliefert (vor dem Umbau
   einmal ausgeführt): [id, wert, erreicht, naechste] je Abzeichen. */
{
    const bz = (angaben) => Object.assign({ xp: 0, partien: 0, gezaehlt: [], stand: 5 }, angaben);
    const faelle = [
        [{ version: 1, spiele: {} }, "2026-09-27"],
        [profil, "2026-09-27"],
        [{ version: 1, spiele: {
            typoluck: { xp: 90000, partien: 4200, tage: ["2026-09-20", "2026-09-21", "2026-09-22", "2026-09-23",
                "2026-09-24", "2026-09-25", "2026-09-26", "2026-09-27"],
                zaehler: { tagesaufgaben: 800, beideTage: 250, figuren: 400, besteSerie: 900 } },
            blunderluck: bz({ partien: 3000, tage: ["2026-09-26", "2026-09-27"],
                turm: { figuren: { "1-0": 3, "1-1": 3, "1-2": 3, "2-0": 9 } } }) } }, "2026-09-27"],
        [{ version: 1, spiele: { blunderluck: bz({ partien: 12, tage: ["2026-09-25", "2026-09-26", "2026-09-27"] }) } },
            "2026-09-27"],
        [{ version: 1, spiele: { typoluck: { partien: 5, tage: ["2026-09-26", "2026-09-27", "kaputt", "2026-09-27"],
            zaehler: { figuren: -3, besteSerie: "x" } } } }, "2026-09-28"],
        [{ version: 1, spiele: { typoluck: { partien: 40, tage: ["2026-09-26"], zaehler: { besteSerie: 2 } } } }, null]
    ];
    const vorher = [
        [["partien", 0, 0, 10], ["besteSerie", 0, 0, 3], ["beideTage", 0, 0, 1], ["figuren", 0, 0, 10], ["tagesaufgaben", 0, 0, 1]],
        [["partien", 1637, 7, 2000], ["besteSerie", 4, 1, 7], ["beideTage", 2, 1, 10], ["figuren", 26, 1, 30], ["tagesaufgaben", 15, 2, 50]],
        [["partien", 7200, 18, 7500], ["besteSerie", 900, 6, 1095], ["beideTage", 250, 5, 300], ["figuren", 412, 10, 450], ["tagesaufgaben", 802, 6, 1095]],
        [["partien", 12, 1, 50], ["besteSerie", 3, 1, 7], ["beideTage", 0, 0, 1], ["figuren", 0, 0, 10], ["tagesaufgaben", 3, 1, 10]],
        [["partien", 5, 0, 10], ["besteSerie", 2, 0, 3], ["beideTage", 0, 0, 1], ["figuren", 0, 0, 10], ["tagesaufgaben", 0, 0, 1]],
        [["partien", 40, 1, 50], ["besteSerie", 2, 0, 3], ["beideTage", 0, 0, 1], ["figuren", 0, 0, 10], ["tagesaufgaben", 0, 0, 1]]
    ];
    faelle.forEach(([stand, datum], i) => {
        gleich("Abzeichen aus dem Baustein = wie vorher, Fall " + (i + 1),
            FORTSCHRITT.abzeichen(stand, datum).map((a) => [a.id, a.wert, a.erreicht, a.naechste]), vorher[i]);
    });
    gleich("Titel, Kurzname, Zeichen, Einheit wie vorher", UPCREW_ABZEICHEN.ABZEICHEN.map((a) =>
        [a.titel, a.kurz, a.zeichen, a.weiter, a.einheit]), [
        ["Viel gespielt", "Partien", "partie", 500, "Partien"], ["Serie", "Serie", "serie", 365, "Tage am Stück"],
        ["Beide Spiele", "Beide", "beide", 100, "Tage"], ["Figuren", "Figuren", "koenig", 50, "Figuren"],
        ["Tagesaufgaben", "Heute", "kalender", 365, "geschafft"]]);
    pruefe("Keine eigene Abzeichen-Rechnung mehr in js\\fortschritt.js",
        !/ABZEICHEN:\s*\[/.test(fs.readFileSync(path.join(__dirname, "..", "js", "fortschritt.js"), "utf8")));
}
gleich("Statistik aus dem Typoluck-Zweig", FORTSCHRITT.statistik(profil, HEUTE),
    { partien: 1600, figuren: 20, koennen: 75, bestesKoennen: 92, besteSerie: 4 });
gleich("Statistik ohne Können: null", FORTSCHRITT.statistik(leer, HEUTE).koennen, null);
gleich("Spiele: Ort und Figuren", FORTSCHRITT.spiele(profil, ["blunderluck", "typoluck"]),
    [{ app: "blunderluck", figuren: 6, ort: 2 }, { app: "typoluck", figuren: 20, ort: 0 }]);
gleich("Spiele: Blunderluck nie gespielt", FORTSCHRITT.spiele(leer, ["blunderluck"]),
    [{ app: "blunderluck", figuren: 0, ort: 0 }]);

/* ------------------------------------------------------------------ *
 * Taten (seit 0.13.0)
 * ------------------------------------------------------------------ */
const zweiter = FORTSCHRITT.partie(leer, { datum: HEUTE, tagesaufgabe: true, figuren: 3, geloest: true,
    versuche: 2, koennen: 80 });
gleich("Tageswort im 2. Versuch: Tat erfüllt und gemeldet", [tl(zweiter.stand).taten, zweiter.taten],
    [["zweiter-versuch"], ["zweiter-versuch"]]);
const zweiterNochmal = FORTSCHRITT.partie(zweiter.stand, { datum: HEUTE, geloest: true, versuche: 1, koennen: 95,
    tagesaufgabe: false });
gleich("Übung im 1. Versuch zählt nicht als Tageswort, 95 % Können schon", zweiterNochmal.taten, ["koennen-90"]);
gleich("Taten stehen nicht doppelt", tl(zweiterNochmal.stand).taten, ["zweiter-versuch", "koennen-90"]);
gleich("Harter Modus (Bibliothek) gelöst", FORTSCHRITT.partie(leer, { datum: HEUTE, geloest: true, versuche: 5, schwer: true })
    .taten, ["schwer-geloest"]);
gleich("Nicht gelöst: keine Tat", FORTSCHRITT.partie(leer, { datum: HEUTE, tagesaufgabe: true, geloest: false,
    versuche: 2, schwer: true, koennen: 99 }).taten, []);
const sechsTage = { spiele: { typoluck: { tage: ["2026-09-21", "2026-09-22", "2026-09-23", "2026-09-24",
    "2026-09-25", "2026-09-26"] } } };
pruefe("Serie 6: noch keine Tat", !FORTSCHRITT.erfuellteTaten(sechsTage, HEUTE).has("serie-7"));
gleich("Serie 7 erreicht: Tat gemeldet", FORTSCHRITT.partie(sechsTage, { datum: HEUTE, tagesaufgabe: true,
    figuren: 1, geloest: true, versuche: 4 }).taten, ["serie-7"]);
pruefe("Serie 7 zählt rückwirkend (aus dem besten Lauf)",
    FORTSCHRITT.erfuellteTaten({ spiele: { typoluck: { zaehler: { besteSerie: 9 } } } }, HEUTE).has("serie-7"));
pruefe("Unbekannte Tat-Kennungen zählen nicht",
    FORTSCHRITT.erfuellteTaten({ spiele: { typoluck: { taten: ["gibtsnicht"] } } }, HEUTE).size === 0);
gleich("Tat-Titel", FORTSCHRITT.tatTitel("serie-7"), "7 Tage Serie");

/* XP-Quellen aus denselben Zahlen */
gleich("Quellen zum Anzeigen", FORTSCHRITT.quellen().map((q) => q.wert), ["+10", "+10", "+15…30", "×1,5", "+5…35"]);
pruefe("Kurze Namen passen unter die Kacheln (höchstens 7 Zeichen)",
    FORTSCHRITT.quellen().every((q) => q.titel.length <= 7) && UPCREW_ABZEICHEN.ABZEICHEN.every((a) => a.kurz.length <= 7));

fazit();
