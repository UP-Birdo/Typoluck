/*
 * test-bibliothek.js — die Bibliothek als Doppelseite (seit 0.20.0,
 * js/bibliothek.js; 0.18.0–0.19.0 war es der Weg 6 × 8), die Wortarten
 * (js/wortarten-daten.js) und der Stand im Fortschritt
 * (`turm.figuren` / `turm.schwuere`).
 *
 *   1. Wortarten.
 *   2. Aufbau: 6 Bücher, Buch n hat n + 2 Kapitel, jedes Kapitel ein
 *      Eingang unten und genau ein Ausgang oben (letztes: Boss oben), nur
 *      1–2 Spuren, jede Station erreichbar, höchstens 90 Stationen je Buch,
 *      Schlüssel passen zu Regel §11b, keine Kollision mit 0.18.x.
 *   3. Jeder Bereich hat genug Wörter (über WORTBEWERTUNG.schwierigkeit).
 *   4. Regeln je Station (Wort, Elite, Boss), Truhe, Händler.
 *   5. Der Lauf: Gabelung, Weg, spielbar, Buch durch, nächstes Buch,
 *      Umzug aus 0.18.x.
 *   6. Fortschritt, Konto (Regel §11b), Münzen.
 *   7. Eingebunden, Texte.
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
const W = require("../js/wordle.js");
global.UPCREW_ABZEICHEN = require("../js/upcrew-abzeichen.js");
const F = require("../js/fortschritt.js");
const M = require("../js/upcrew-muenzen.js");

const loesungen = WOERTER.loesungen;

/* 1. Wortarten */
{
    const alle = ARTEN.keinNomen.concat(ARTEN.beides);
    gleich("Wortarten: jede Ausnahme steht in der Lösungsliste", alle.filter((w) => loesungen.indexOf(w) === -1), []);
    gleich("Wortarten: keine doppelt", alle.filter((w, i) => alle.indexOf(w) !== i), []);
    pruefe("Wortarten: Adjektive sind kein Nomen", ["grell", "knapp", "schön", "still", "lokal", "bitte", "heute"]
        .every((w) => !B.istNomen(w)));
    pruefe("Wortarten: Nomen bleiben Nomen", ["abend", "tisch", "kerze"].every((w) => B.istNomen(w)));
}

/* 2. Aufbau */
{
    gleich("Sechs Bücher", B.anzahlBuecher(), 6);
    gleich("Buch n hat n + 2 Kapitel", [1, 2, 3, 4, 5, 6].map((b) => B.anzahlKapitel(b)), [3, 4, 5, 6, 7, 8]);
    gleich("Titel", B.BUECHER.map((b) => b.titel),
        ["Das Bilderlexikon", "Das Tagebuch", "Das Kochbuch", "Der Reiseführer", "Der Krimi", "Das Wörterbuch"]);
    pruefe("Nur Buch 1 verspricht eine Wortart (nur Nomen)", B.BUECHER.filter((b) => b.nurNomen).length === 1
        && B.BUECHER[0].nurNomen === true);
    let form = true;
    let spuren = true;
    for (let b = 1; b <= 6; b++) {
        const n = B.anzahlKapitel(b);
        for (let k = 0; k < n; k++) {
            const kap = B.kapitel(b, k);
            const letztes = k === n - 1;
            if (kap[0].join() !== "ein" || kap[kap.length - 1].join() !== (letztes ? "b" : "aus")) {
                form = false;
            }
            if (!kap.every((spalte) => spalte.length === 1 || spalte.length === 2)) {
                spuren = false;
            }
            if (kap.slice(1).some((spalte) => spalte.indexOf("b") !== -1 && !(letztes && spalte === kap[kap.length - 1]))) {
                form = false;
            }
            if (kap.some((spalte) => spalte.some((a) => ["r", "f"].indexOf(a) !== -1))) {
                form = false;
            }
        }
    }
    pruefe("Jedes Kapitel: ein Eingang unten, genau ein Ausgang oben; Boss nur oben im letzten", form);
    pruefe("Gabelungen in höchstens 2 Spuren", spuren);
    pruefe("Keine Rast, kein Fund („fürs Erste“)", B.stationen(1).concat(B.stationen(6)).every((st) => "weth".indexOf(st.art) !== -1 || st.art === "b"));
    const maxNr = Math.max(...[1, 2, 3, 4, 5, 6].map((b) => Math.max(...B.stationen(b).map((st) => st.nr))));
    pruefe("Höchstens 90 Stationen je Buch (Nr 10–99)", maxNr <= 99 && B.stationen(1)[0].nr === 10, "max " + maxNr);
    pruefe("Schlüssel passen zu Regel §11b (figuren Zahl-Zahl, schwuere 1–3 Ziffern)",
        [1, 2, 3, 4, 5, 6].every((b) => B.stationen(b).every((st) => /^[0-9]{1,2}-[0-9]{1,2}$/.test(st.schluessel)
            && /^[0-9]{1,3}$/.test(B.merkerSchluessel(b, st.nr)))));
    pruefe("Keine Kollision mit den Schlüsseln der alten Bibliothek (Level 0–7)",
        [1, 2, 3, 4, 5, 6].every((b) => B.stationen(b).every((st) => st.nr >= 10)));
    /* Jede Station ist über irgendeinen Weg erreichbar. */
    let alleErreichbar = true;
    for (let b = 1; b <= 6; b++) {
        const gesehen = new Set();
        for (const wahl of ["0", "1", "01", "10", "0011", "1100"]) {
            B.gehen(b, 200, wahl).weg.forEach((st) => gesehen.add(st.nr));
        }
        if (B.stationen(b).some((st) => !gesehen.has(st.nr))) {
            alleErreichbar = false;
        }
    }
    pruefe("Jede Station liegt auf einem Weg", alleErreichbar);
}

/* 3. Genug Wörter je Bereich */
{
    const zuWenig = [];
    let steigt = true;
    for (let b = 1; b <= 6; b++) {
        const kampf = B.stationen(b).filter((st) => B.istKampf(st.art));
        kampf.forEach((st) => {
            const n = B.woerter(b, st.nr).length;
            if (n < 8) {
                zuWenig.push(st.schluessel + ": " + n);
            }
        });
        const worte = kampf.filter((st) => st.art === "w").map((st) => B.bereich(b, st.nr).von);
        if (worte.some((v, i) => i > 0 && v < worte[i - 1])) {
            steigt = false;
        }
    }
    gleich("Jeder Bereich hat mindestens 8 Wörter", zuWenig, []);
    pruefe("Bereiche steigen im Buch", steigt);
    pruefe("Buch zu Buch schwerer (Anfang)", [1, 2, 3, 4, 5, 6].every((b, i, l) => i === 0
        || B.bereich(b, 10).von > B.bereich(l[i - 1], 10).von));
    pruefe("Buch 1 zieht nur Nomen", B.stationen(1).filter((st) => B.istKampf(st.art))
        .every((st) => B.woerter(1, st.nr).every((w) => B.istNomen(w))));
    const elite = B.stationen(2).find((st) => st.art === "e");
    pruefe("Elite: Bereich 8 höher als die Spalte", B.bereich(2, elite.nr).von
        === Math.min(92, B.bereich(2, B.stationen(2).find((st) => st.art === "w" && st.g === elite.g).nr).von + 8));
    pruefe("Die Wörter liegen im Bereich (EINE Lesestelle)", B.woerter(3, 15).every((w) => {
        const z = WB.schwierigkeit(w);
        return z >= B.bereich(3, 15).von && z <= B.bereich(3, 15).bis;
    }));
    const eins = B.stationen(1)[0].nr;
    const verschieden = new Set([0, 0.2, 0.4, 0.6, 0.8, 0.99].map((z) => B.wortZiehen(1, eins, z, [])));
    pruefe("Wort nicht fest je Station", verschieden.size >= 5);
    const erstes = B.wortZiehen(1, eins, 0, []);
    pruefe("Zuletzt gespielt wird ausgelassen", B.wortZiehen(1, eins, 0, [erstes]) !== erstes);
    gleich("Truhe/Händler ziehen kein Wort", B.wortZiehen(1, B.stationen(1).find((st) => st.art === "t").nr, 0.5, []), "");
}

/* 4. Regeln je Station, Truhe, Händler */
{
    const wort = B.stationen(2).find((st) => st.art === "w");
    gleich("Wort: 6 Versuche, nur echte Wörter", B.regeln(2, wort.nr), { versuche: 6, nurEchte: true });
    gleich("Buch 1: alles eintippbar", B.regeln(1, 10).nurEchte, false);
    for (let b = 1; b <= 6; b++) {
        const boss = B.stationen(b).find((st) => st.art === "b");
        const r = W.regelnNormalisieren(B.regeln(b, boss.nr));
        pruefe("Boss Buch " + b + " (" + B.buch(b).boss.name + "): eigene Regel, keine Uhr",
            JSON.stringify(r) !== JSON.stringify(W.regelnNormalisieren({ nurEchte: B.buch(b).nurEchte !== false }))
                && r.zeit === 0 && r.versuche >= 6);
    }
    for (let b = 1; b <= 6; b++) {
        for (const st of B.stationen(b).filter((x) => x.art === "e")) {
            const e = B.elite(b, st.nr);
            if (!e || e.ab > b || W.regelnNormalisieren(B.regeln(b, st.nr)).zeit !== 0) {
                pruefe("Elite " + st.schluessel + " hat eine erlaubte Verschärfung", false);
            }
        }
    }
    pruefe("Jede Elite hat eine Verschärfung, keine Uhr", true);
    gleich("Figuren: Elite eine mehr, höchstens 3; mit Hilfe höchstens 1",
        [B.figurenFuer(true, 1, false, "e"), B.figurenFuer(true, 3, false, "e"), B.figurenFuer(true, 2, false, "w"),
            B.figurenFuer(true, 3, true, "e"), B.figurenFuer(false, 3, false, "e")], [2, 3, 2, 1, 0]);
    pruefe("Truhe: 15–30 Münzen (ab Buch 5 25–45)", B.stationen(1).filter((st) => st.art === "t")
        .every((st) => B.truheMuenzen(1, st.nr) >= 15 && B.truheMuenzen(1, st.nr) <= 30)
        && B.stationen(5).filter((st) => st.art === "t").every((st) => B.truheMuenzen(5, st.nr) >= 25 && B.truheMuenzen(5, st.nr) <= 45));
    gleich("Händler: −30 % (Tipp, Extra-Leben, Schild)", ["tipp", "leben", "schild"].map((w) => B.haendlerPreis(M.WAREN[w].preis)),
        [11, 21, 35]);
    gleich("Titel einer Station", [B.titel(1, 10), B.titel(1, B.stationen(1).find((st) => st.art === "b").nr)],
        ["Das Bilderlexikon · I", "Das Bilderlexikon · Boss"]);
}

/* 5. Der Lauf */
{
    const leer = { figuren: {}, schwuere: {} };
    const l0 = B.lauf(leer, 1);
    gleich("Leer: erste Station wartet, Kapitel I", [l0.jetzt, l0.gabel, l0.kapitel, l0.durch], [10, null, 0, false]);
    pruefe("Leer: nur sie ist spielbar", B.spielbar(leer, 1, 10) && !B.spielbar(leer, 1, 11));
    const t = { figuren: { "1-10": 2 }, schwuere: {} };
    const l1 = B.lauf(t, 1);
    gleich("Nach der ersten: Gabelung mit zwei Stationen", l1.gabel, [11, 12]);
    pruefe("An der Gabelung sind beide spielbar", B.spielbar(t, 1, 11) && B.spielbar(t, 1, 12));
    t.figuren["1-12"] = 3;
    const l2 = B.lauf(t, 1);
    gleich("Rechte Spur gewählt: der Weg bleibt rechts", [l2.weg, l2.jetzt], [[10, 12], 14]);
    pruefe("Die andere Spur ist nicht mehr spielbar", !B.spielbar(t, 1, 11) && !B.spielbar(t, 1, 13));
    const halb = B.gehen(1, 6, "0").turm;
    gleich("Durch Kapitel I: Kapitel II beginnt", B.lauf(halb, 1).kapitel, 1);
    const ganz = B.gehen(1, 200, "01").turm;
    gleich("Ganzes Buch: durch, Buch 2 offen, Buch 3 zu", [B.durch(ganz, 1), B.offen(ganz, 2), B.offen(ganz, 3)], [true, true, false]);
    gleich("Aktuelles Buch = das höchste offene", [B.aktuellesBuch(leer), B.aktuellesBuch(ganz)], [1, 2]);
    pruefe("Boss erst am Ende: vorher nicht spielbar", !B.spielbar(halb, 1, B.stationen(1).find((st) => st.art === "b").nr));
    gleich("Boss in: Spalten bis einschliesslich Boss", B.bossIn(leer, 1), B.stationen(1).spalten);
    const truhe = B.gehen(1, 200, "0").weg.find((st) => st.art === "t");
    pruefe("Truhe wird über den Merker erledigt (keine Figur)", truhe && !(("1-" + truhe.nr) in B.gehen(1, 200, "0").turm.figuren));
    /* Umzug aus 0.18.x */
    gleich("Alter Boss Buch 2 („2-7“) → Buch 2 offen", B.offen({ figuren: { "2-7": 1 }, schwuere: {} }, 2), true);
    gleich("Nur alter Boss Buch 1 („1-7“) → Buch 2 noch zu", B.offen({ figuren: { "1-7": 2 }, schwuere: {} }, 2), false);
    gleich("Alte Level-Figuren stören den neuen Lauf nicht",
        B.lauf({ figuren: { "1-0": 3, "1-1": 3, "1-7": 3 }, schwuere: {} }, 1).jetzt, 10);
}

/* 6. Fortschritt, Konto, Münzen */
{
    const heute = "2026-09-28";
    const r1 = F.partie(F.leer(), { datum: heute, bibliothek: { schluessel: "1-10", figuren: 2 }, zeitpunkt: 5 });
    gleich("Station gelöst: Figuren in turm.figuren, XP Partie + 2 Figuren", [F.turmFiguren(r1.stand), r1.xp], [{ "1-10": 2 }, 30]);
    const m = F.stationMerken(r1.stand, B.merkerSchluessel(1, 14), 9);
    gleich("Truhe gemerkt in turm.schwuere, Figuren bleiben", F.turmStand(m), { figuren: { "1-10": 2 }, schwuere: { 114: 1 } });
    pruefe("Merker zählen nicht als Figuren", F.spiele(m, ["typoluck"])[0].figuren === 2);
    gleich("Konto: turm mit figuren und schwuere", F.fuerKonto(m).spiele.typoluck.turm, { figuren: { "1-10": 2 }, schwuere: { 114: 1 } });
    const unsinn = F.normalisieren({ spiele: { typoluck: { turm: { figuren: { "1-10": 2 }, schwuere: { 114: 1, 1234: 1, abc: 2, 115: 9 } } } } });
    gleich("Merker bereinigt (1–3 Ziffern, 0–3)", unsinn.spiele.typoluck.turm.schwuere, { 114: 1, 115: 3 });
    const nach = F.partie(m, { datum: heute, bibliothek: { schluessel: "1-12", figuren: 1 } });
    gleich("Eine weitere Partie behält die Merker", F.turmStand(nach.stand).schwuere, { 114: 1 });

    const quelle = lesen("js/app.js");
    const start = quelle.indexOf("    muenzenFuerRunde(vorher");
    const text = quelle.slice(start, quelle.indexOf("\n    },", start) + 7);
    const APP = vm.runInNewContext("({" + text + "})", { FORTSCHRITT: F, UPCREW_MUENZEN: M, BIBLIOTHEK: B });
    const v = M.VERDIENST;
    const bossNr = B.stationen(1).find((st) => st.art === "b").nr;
    const boss = F.partie(F.leer(), { datum: heute, bibliothek: { schluessel: "1-" + bossNr, figuren: 2 } });
    gleich("Münzen: Boss erstmals = Sieg + 2 Figuren + Boss",
        APP.muenzenFuerRunde(F.leer(), boss, { modus: "bibliothek", buch: 1, station: bossNr, zustand: "gewonnen" }, false, heute),
        v.sieg + 2 * v.figur + v.boss);
    gleich("Münzen: Station ohne neue Figur = nur Sieg",
        APP.muenzenFuerRunde(r1.stand, F.partie(r1.stand, { datum: heute, bibliothek: { schluessel: "1-10", figuren: 1 } }),
            { modus: "bibliothek", buch: 1, station: 10, zustand: "gewonnen" }, false, heute), v.sieg);
    const app = lesen("js/app.js");
    pruefe("APP: Station → Schlüssel und Figuren (Elite +1)", /bibliothek: APP\._bibliothekAngaben\(runde, wertung\)/.test(app)
        && /WORDLE\.hilfeGenutzt\(runde\), st\.art\)/.test(app));
    pruefe("APP: Händler über den Baustein (Nachlass gutschreiben, dann regulär kaufen)",
        /UPCREW_MUENZEN\.kaufen\(UPCREW_MUENZEN\.verdienen\(basis, FORTSCHRITT\.APP, nachlass/.test(app));
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
    pruefe("Keine Herzen, keine Rast, kein Fund auf dem Buch", !/herz|Rast|Fund|Tinte/.test(start.replace(/bib-herzen-platz/g, "")));
    pruefe("Schalter Üben · Bibliothek", /text: "Üben"/.test(start) && /BIBLIOTHEK\.NAME/.test(start));
    const wordle = lesen("js/bildschirm-wordle.js");
    pruefe("Runde der Bibliothek: Station, Wort gezogen, Regeln der Station",
        /BIBLIOTHEK\.wortZiehen\(buch, station, Math\.random\(\), zuletzt\)/.test(wordle)
            && /regeln: BIBLIOTHEK\.regeln\(buch, station\)/.test(wordle));
    const r = W.neueRunde({ modus: "bibliothek", buch: 1, station: 12, loesung: "abend", regeln: B.regeln(1, 12) });
    gleich("Runde trägt Buch und Station", [r.buch, r.station, W.normalisieren(JSON.parse(JSON.stringify(r))).station], [1, 12, 12]);
}

fazit();
