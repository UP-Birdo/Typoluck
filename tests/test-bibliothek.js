/*
 * test-bibliothek.js — die Bibliothek (seit 0.18.0, js/bibliothek.js,
 * js/wortarten-daten.js; Stand im Fortschritt `turm.figuren`).
 *
 *   1. Wortarten: jede Ausnahme steht in der Lösungsliste, keine doppelt;
 *      Stichproben (grell ist kein Nomen, abend eins).
 *   2. Bücher und Bereiche: sechs Bücher à acht Level, Bereiche steigen im
 *      Buch und von Buch zu Buch, der Boss liegt oben; jeder Schlüssel
 *      passt zur Regel §11b.
 *   3. JEDER Bereich hat genug Wörter (≥ 8; Buch 1 nur Nomen gezählt) —
 *      gezählt über die EINE Lesestelle WORTBEWERTUNG.schwierigkeit, also
 *      auch dann noch richtig, wenn Wörter später zwischen den Bereichen
 *      wandern (Schwierigkeit aus Spieldaten).
 *   4. Ziehen: Zufall von aussen, verschiedene Wörter, zuletzt gespielte
 *      möglichst nicht, Rückfall bei leerem Bereich.
 *   5. Stand: offen, Boss nach allen, Buch durch, Ziel, Weiter.
 *   6. Fortschritt: beste Wertung je Level, XP je neue Figur, Konto-Form,
 *      Münzen (Figur, Boss), Hilfe höchstens ein Bauer.
 */

const fs = require("fs");
const pfad = require("path");
const vm = require("vm");
const { pruefe, gleich, fazit } = require("./pruefer.js");

const wurzel = pfad.join(__dirname, "..");
const lesen = (name) => fs.readFileSync(pfad.join(wurzel, name), "utf8");
const WOERTER = require("../js/woerter-de.js");
const WB = require("../js/wortbewertung.js");
const ARTEN = require("../js/wortarten-daten.js");
const B = require("../js/bibliothek.js");
global.UPCREW_ABZEICHEN = require("../js/upcrew-abzeichen.js");
const F = require("../js/fortschritt.js");
const M = require("../js/upcrew-muenzen.js");

const loesungen = WOERTER.loesungen;

/* 1. Wortarten */
{
    const alle = ARTEN.keinNomen.concat(ARTEN.beides);
    gleich("Wortarten: jede Ausnahme steht in der Lösungsliste", alle.filter((w) => loesungen.indexOf(w) === -1), []);
    gleich("Wortarten: keine doppelt", alle.filter((w, i) => alle.indexOf(w) !== i), []);
    pruefe("Wortarten: die Adjektive aus dem Auftrag sind kein Nomen",
        ["grell", "knapp", "krank", "schön", "still", "stark", "steil", "sanft", "sauer", "mutig", "ruhig",
            "eilig", "eitel", "offen", "prima", "genau", "klein", "breit", "braun", "dicht", "flach", "flink",
            "frech", "glatt", "krumm", "nackt", "nobel", "weich", "blind", "blond", "banal", "lokal", "extra",
            "bravo", "bitte", "heute"].every((w) => !B.istNomen(w)));
    pruefe("Wortarten: Nomen bleiben Nomen", ["abend", "tisch", "kerze", "vogel", "blume"].every((w) => B.istNomen(w)));
}

/* 2. Bücher und Bereiche */
{
    gleich("Sechs Bücher à acht Level", B.BUECHER.map((b) => b.level.length), [8, 8, 8, 8, 8, 8]);
    gleich("Nur Buch 1 nur Nomen", B.BUECHER.map((b) => b.nurNomen === true), [true, false, false, false, false, false]);
    let steigt = true;
    let bossOben = true;
    let passt = true;
    B.BUECHER.forEach((buch, b) => {
        buch.level.forEach(([von, bis], i) => {
            if (!(Number.isInteger(von) && Number.isInteger(bis) && von >= 0 && bis <= 100 && von < bis)) {
                passt = false;
            }
            if (i > 0 && !(von > buch.level[i - 1][0] && bis > buch.level[i - 1][1])) {
                steigt = false;
            }
        });
        const boss = buch.level[buch.level.length - 1];
        if (!buch.level.slice(0, -1).every(([von, bis]) => boss[1] > bis)) {
            bossOben = false;
        }
        if (b > 0 && !(buch.level[0][0] > B.BUECHER[b - 1].level[0][0])) {
            steigt = false;
        }
    });
    pruefe("Bereiche gültig (0–100, von < bis)", passt);
    pruefe("Bereiche steigen im Buch und von Buch zu Buch", steigt);
    pruefe("Der Boss liegt am oberen Ende seines Buchs", bossOben);
    pruefe("Schlüssel passen zur Regel §11b (Zahl-Zahl)", B.BUECHER.every((buch, b) =>
        buch.level.every((_, i) => /^[0-9]{1,2}-[0-9]{1,2}$/.test(B.schluessel(b + 1, i)))));
    gleich("Titel", [B.titel(2, 3), B.titel(2, 7)], ["Buch 2 · Level 4", "Buch 2 · Boss"]);
    /* Nutzer 28.09.2026: „Boss soll es jedes Buch am Ende geben." */
    gleich("Jedes Buch 1–6 hat am Ende einen Boss (und nur dort)",
        B.BUECHER.map((buch, b) => buch.level.map((_, i) => B.istBoss(b + 1, i)).join("")),
        B.BUECHER.map(() => "falsefalsefalsefalsefalsefalsefalsetrue"));
}

/* 3. Genug Wörter je Bereich */
{
    const zuWenig = [];
    B.BUECHER.forEach((buch, b) => {
        buch.level.forEach((_, i) => {
            const woerter = B.woerter(b + 1, i);
            if (woerter.length < 8) {
                zuWenig.push((b + 1) + "-" + i + ": " + woerter.length);
            }
        });
    });
    gleich("Jeder Bereich hat mindestens 8 Wörter", zuWenig, []);
    pruefe("Buch 1 zieht nur Nomen", B.BUECHER[0].level.every((_, i) => B.woerter(1, i).every((w) => B.istNomen(w))));
    pruefe("Ab Buch 2 sind auch Nicht-Nomen dabei",
        B.BUECHER.slice(1).some((buch, b) => buch.level.some((_, i) => B.woerter(b + 2, i).some((w) => !B.istNomen(w)))));
    pruefe("Die Wörter liegen im Bereich (über WORTBEWERTUNG.schwierigkeit)",
        B.woerter(3, 2).every((w) => WB.schwierigkeit(w) >= 29 && WB.schwierigkeit(w) <= 36));
    pruefe("Die Bibliothek liest die Schwierigkeit nur über WORTBEWERTUNG.schwierigkeit",
        /BIBLIOTHEK_WB\.schwierigkeit\(/.test(lesen("js/bibliothek.js"))
            && !/\.zahlen|\.stufen|lexikon/i.test(lesen("js/bibliothek.js").replace(/\/\*[\s\S]*?\*\//g, "")));
    /* Wandert die Schwierigkeit (Korrektur), wandert das Wort mit. */
    const wort = B.woerter(1, 0)[0];
    WB._korrekturErsatz = { [wort]: { zahl: 99 } };
    pruefe("Ein Wort, dessen Schwierigkeit sich ändert, verlässt den Bereich", B.woerter(1, 0).indexOf(wort) === -1
        && B.woerter(6, 7).indexOf(wort) !== -1);
    WB._korrekturErsatz = { [wort]: { ungeeignet: true } };
    pruefe("Als ungeeignet markiert: in keinem Level", B.woerter(1, 0).indexOf(wort) === -1);
    WB._korrekturErsatz = null;
}

/* 4. Ziehen */
{
    const liste = B.woerter(2, 4);
    const gezogen = new Set([0, 0.2, 0.4, 0.6, 0.8, 0.99].map((z) => B.wortZiehen(2, 4, z, [])));
    pruefe("Verschiedener Zufall, verschiedene Wörter (nicht fest je Level)", gezogen.size >= 5);
    pruefe("Jedes gezogene Wort liegt im Bereich", [...gezogen].every((w) => liste.indexOf(w) !== -1));
    gleich("Gleicher Zufall, gleiches Wort (kein Würfeln im Modell)", B.wortZiehen(2, 4, 0.3, []), B.wortZiehen(2, 4, 0.3, []));
    const erstes = B.wortZiehen(2, 4, 0, []);
    pruefe("Zuletzt gespielt wird ausgelassen", B.wortZiehen(2, 4, 0, [erstes]) !== erstes);
    gleich("Ist alles zuletzt gespielt, kommt trotzdem ein Wort", liste.indexOf(B.wortZiehen(2, 4, 0, liste)) !== -1, true);
    let merk = [];
    for (let i = 0; i < 40; i++) {
        merk = B.zuletztMerken(merk, "w" + i);
    }
    gleich("Merkliste: neuestes vorn, höchstens ZULETZT_MAX", [merk[0], merk.length], ["w39", B.ZULETZT_MAX]);
    gleich("Merkliste: kein Wort doppelt", B.zuletztMerken(["a", "b"], "b"), ["b", "a"]);
    /* Ein leerer Bereich (später möglich, wenn Wörter wandern). */
    B.BUECHER.push({ level: [[150, 160]] });
    const nr = B.BUECHER.length;
    gleich("Leerer Bereich: keine Wörter im Bereich", B.woerter(nr, 0), []);
    const rueckfall = B.naechsteWoerter(nr, 0);
    pruefe("… Rückfall: die nächstgelegenen Wörter", rueckfall.length === B.RUECKFALL_ANZAHL
        && rueckfall.indexOf(B.wortZiehen(nr, 0, 0.5, [])) !== -1);
    B.BUECHER.pop();
    gleich("Unbekanntes Level: kein Wort", B.wortZiehen(9, 0, 0.5, []), "");
}

/* 5. Stand */
{
    const leer = {};
    gleich("Leer: Buch 1 erreicht, Level 1 offen, Level 2 zu", [B.erreicht(leer), B.offen(leer, 1, 0), B.offen(leer, 1, 1)],
        [1, true, false]);
    gleich("Leer: Ziel = Buch 1, Level 1", B.ziel(leer), { buch: 1, level: 0 });
    const sechs = {};
    for (let i = 0; i < 6; i++) {
        sechs["1-" + i] = 1;
    }
    gleich("Boss erst nach ALLEN Leveln davor", [B.offen(sechs, 1, 7), B.offen(sechs, 1, 6)], [false, true]);
    sechs["1-6"] = 2;
    gleich("… dann offen, Ziel = Boss", [B.offen(sechs, 1, 7), B.ziel(sechs)], [true, { buch: 1, level: 7 }]);
    gleich("Buch 2 noch zu", B.offen(sechs, 2, 0), false);
    gleich("Weiter nach Level 7: der Boss", B.danach(sechs, 1, 6), { buch: 1, level: 7 });
    sechs["1-7"] = 1;
    gleich("Boss gelöst: Buch durch, Buch 2 erreicht", [B.durch(sechs, 1), B.erreicht(sechs), B.offen(sechs, 2, 0)], [true, 2, true]);
    gleich("Weiter nach dem Boss: Buch 2, Level 1", B.danach(sechs, 1, 7), { buch: 2, level: 0 });
    gleich("Summe Buch 1", B.summe(sechs, 1), { hat: 9, alle: 24 });
    const alles = {};
    B.BUECHER.forEach((buch, b) => buch.level.forEach((_, i) => { alles[B.schluessel(b + 1, i)] = 3; }));
    alles["2-3"] = 1;
    gleich("Alles durch: Ziel = unterstes Level unter 3 Figuren (nachholen)", B.ziel(alles), { buch: 2, level: 3 });
    gleich("Figuren: nicht gelöst 0, gelöst nach Wertung, mit Hilfe höchstens 1",
        [B.figurenFuer(false, 3, false), B.figurenFuer(true, 3, false), B.figurenFuer(true, 3, true), B.figurenFuer(true, 0, false)],
        [0, 3, 1, 1]);
}

/* 6. Fortschritt, Konto, Münzen */
{
    const heute = "2026-09-28";
    const r1 = F.partie(F.leer(), { datum: heute, bibliothek: { schluessel: "1-0", figuren: 2 }, zeitpunkt: 5 });
    gleich("Level gelöst: Figuren im Zweig unter turm.figuren", F.turmFiguren(r1.stand), { "1-0": 2 });
    gleich("… XP: Partie 10 + 2 neue Figuren × 10", r1.xp, 30);
    const r2 = F.partie(r1.stand, { datum: heute, bibliothek: { schluessel: "1-0", figuren: 1 } });
    gleich("Schlechter nochmal: die beste bleibt, keine Figur-XP", [F.turmFiguren(r2.stand)["1-0"], r2.xp], [2, 10]);
    const r3 = F.partie(r2.stand, { datum: heute, bibliothek: { schluessel: "1-0", figuren: 3 } });
    gleich("Besser: +1 Figur", [F.turmFiguren(r3.stand)["1-0"], r3.xp], [3, 20]);
    const kaputt = F.partie(r3.stand, { datum: heute, bibliothek: { schluessel: "x-1", figuren: 3 } });
    gleich("Kaputter Schlüssel: nichts", F.turmFiguren(kaputt.stand), { "1-0": 3 });
    gleich("Figuren im Profil zählen die Bibliothek mit", F.spiele(r3.stand, ["typoluck"])[0].figuren, 3);
    const konto = F.fuerKonto(r3.stand);
    gleich("Konto: turm nur mit figuren", konto.spiele.typoluck.turm, { figuren: { "1-0": 3 } });
    pruefe("Konto: ohne Bibliothek kein turm-Feld", !("turm" in F.fuerKonto(F.leer()).spiele.typoluck));
    const normal = F.normalisieren({ spiele: { typoluck: { turm: { figuren: { "1-0": 7, "a-b": 1, "2-1": 0 }, schwuere: { 1: 2 } } } } });
    gleich("Normalisieren: nur gültige Figuren, schwuere bleibt", normal.spiele.typoluck.turm,
        { figuren: { "1-0": 3 }, schwuere: { 1: 2 } });

    const quelle = lesen("js/app.js");
    const start = quelle.indexOf("    muenzenFuerRunde(vorher");
    const text = quelle.slice(start, quelle.indexOf("\n    },", start) + 7);
    const APP = vm.runInNewContext("({" + text + "})", { FORTSCHRITT: F, UPCREW_MUENZEN: M, BIBLIOTHEK: B });
    const v = M.VERDIENST;
    const boss = F.partie(F.leer(), { datum: heute, bibliothek: { schluessel: "1-7", figuren: 2 } });
    gleich("Münzen: gelöster Boss (erstmals) = Sieg + 2 Figuren + Boss",
        APP.muenzenFuerRunde(F.leer(), boss, { modus: "bibliothek", buch: 1, level: 7, zustand: "gewonnen" }, false, heute),
        v.sieg + 2 * v.figur + v.boss);
    gleich("Münzen: Level ohne neue Figur = nur Sieg",
        APP.muenzenFuerRunde(r1.stand, r2, { modus: "bibliothek", buch: 1, level: 0, zustand: "gewonnen" }, false, heute),
        v.sieg);
    gleich("Münzen: verloren = nichts",
        APP.muenzenFuerRunde(F.leer(), F.partie(F.leer(), { datum: heute }),
            { modus: "bibliothek", buch: 1, level: 0, zustand: "verloren" }, false, heute), 0);

    const app = lesen("js/app.js");
    pruefe("APP meldet die Bibliothek an FORTSCHRITT.partie", /bibliothek: APP\._bibliothekAngaben\(runde, wertung\)/.test(app)
        && /BIBLIOTHEK\.figurenFuer\(runde\.zustand === "gewonnen", wertung\.figuren,\s*WORDLE\.hilfeGenutzt\(runde\)\)/.test(app));
}

/* 6b. Versuche je Level (Mechanismus seit 0.18.1). Seit 0.18.3 (Nutzer
   28.09.2026: „Nein → Boss heißt nicht automatisch weniger Versuche") haben
   alle Level und Bosse wieder 6; der Mechanismus bleibt für Verschärfungen. */
{
    const WORDLE = require("../js/wordle.js");
    pruefe("Alle Level und alle Bosse: 6 Versuche",
        B.BUECHER.every((buch, b) => buch.level.every((_, i) => B.versuche(b + 1, i) === 6)));
    /* Der Mechanismus mit einem Probe-Wert. */
    B.BUECHER[3].bossVersuche = 5;
    gleich("Mechanismus: Boss mit bossVersuche 5, Level bleibt 6", [B.versuche(4, 7), B.versuche(4, 3)], [5, 6]);
    const wort = B.wortZiehen(4, 7, 0.5, []);
    let runde = WORDLE.neueRunde({ modus: "bibliothek", buch: 4, level: 7, loesung: wort, grund: B.versuche(4, 7) });
    delete B.BUECHER[3].bossVersuche;
    gleich("… Runde mit 5 Versuchen", [WORDLE.versucheGrund(runde), WORDLE.versucheMax(runde)], [5, 5]);
    for (const w of WOERTER.loesungen.filter((x) => x !== wort).slice(0, 5)) {
        runde = WORDLE.raten(runde, w, 1).runde;
    }
    gleich("… nach 5 Fehlversuchen verloren, Extra-Leben möglich", [runde.zustand, WORDLE.lebenMoeglich(runde)], ["verloren", true]);
    const leben = WORDLE.lebenEinsetzen(runde);
    gleich("… mit Extra-Leben ein 6. Versuch", [leben.zustand, WORDLE.versucheMax(leben)], ["laeuft", 6]);
    gleich("… gemerkt und wieder gelesen: bleibt 5", WORDLE.versucheGrund(WORDLE.normalisieren(JSON.parse(JSON.stringify(runde)))), 5);
    gleich("Ohne Angabe wie immer 6", WORDLE.versucheMax(WORDLE.neueRunde({ modus: "uebung", loesung: "abend" })), 6);
    pruefe("Die Vorstellung nennt die Versuche", /" Versuche"/.test(lesen("js/start-bibliothek.js")));
    pruefe("Die Runde bekommt die Versuche des Levels", /grund: BIBLIOTHEK\.versuche\(buch, level\)/.test(lesen("js/bildschirm-wordle.js")));
}

/* 7. Eingebunden, Texte */
{
    const index = lesen("index.html");
    pruefe("index.html lädt Wortarten, Bibliothek, Start-Bibliothek und Stil",
        ["js/wortarten-daten.js", "js/bibliothek.js", "js/start-bibliothek.js", "css/stil-bibliothek.css"]
            .every((d) => index.indexOf(d) !== -1)
        && index.indexOf("js/bibliothek.js") > index.indexOf("js/wortbewertung.js")
        && index.indexOf("js/start-bibliothek.js") > index.indexOf("js/bildschirm-start.js"));
    const start = lesen("js/start-bibliothek.js").replace(/\/\*[\s\S]*?\*\//g, "");
    pruefe("Start-Bibliothek baut keine eigenen Knöpfe", start.indexOf('createElement("button")') === -1);
    pruefe("Sichtbar heisst es Bibliothek und Buch, nie Turm",
        !/"[^"]*Turm[^"]*"/.test(start) && /"Buch "/.test(start));
    const wordle = lesen("js/bildschirm-wordle.js");
    pruefe("Runde der Bibliothek: Wort beim Start gezogen, zuletzt gemerkt",
        /BIBLIOTHEK\.wortZiehen\(buch, level, Math\.random\(\), zuletzt\)/.test(wordle)
            && /BIBLIOTHEK\.zuletztMerken\(zuletzt, wort\)/.test(wordle));
}

fazit();
