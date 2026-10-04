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
require("./kern.js");
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
            if (kap.some((spalte) => spalte.some((a) => ["ein", "aus"].indexOf(a) === -1 && !B.ARTEN[a]))) {
                form = false;
            }
        }
    }
    pruefe("Jedes Kapitel: ein Eingang unten, genau ein Ausgang oben; Boss nur oben im letzten", form);
    pruefe("Gabelungen in höchstens 2 Spuren", spuren);
    pruefe("Seit 0.21.0: jedes Buch hat Rast und Fund",
        [1, 2, 3, 4, 5, 6].every((b) => ["r", "f"].every((a) => B.stationen(b).some((st) => st.art === a))));
    pruefe("Rast direkt vor dem Boss", [1, 2, 3, 4, 5, 6].every((b) => {
        const liste = B.stationen(b);
        const boss = liste.find((st) => st.art === "b");
        return liste.filter((st) => st.g === boss.g - 1).every((st) => st.art === "r");
    }));
    /* Die Form von 0.20.0 (Spalten und Spuren) bleibt — damit jede Nummer. */
    gleich("Vorlagen: Spalten und Spuren wie 0.20.0",
        ["A", "B", "C", "D", "X"].map((k) => B.VORLAGEN[k].slice(1).filter((s) => s[0] !== "aus").map((s) => s.length).join("")),
        ["12212", "12211", "22121", "12211", "12211"]);
    gleich("Boss-Nummern wie 0.20.0", [1, 2, 3, 4, 5, 6].map((b) => B.stationen(b).find((st) => st.art === "b").nr),
        [32, 39, 46, 54, 62, 69]);
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
    gleich("Buch 1: seit 0.23.2 auch nur echte Wörter (Nutzer)", B.regeln(1, 10).nurEchte, true);
    pruefe("Kein Buch lässt Unsinn-Wörter zu", [1, 2, 3, 4, 5, 6].every((b) => B.stationen(b)
        .filter((st) => B.istKampf(st.art)).every((st) => B.regeln(b, st.nr).nurEchte === true)));
    for (let b = 1; b <= 6; b++) {
        const boss = B.stationen(b).find((st) => st.art === "b");
        const r = W.regelnNormalisieren(B.regeln(b, boss.nr));
        pruefe("Boss Buch " + b + " (" + B.buch(b).boss.name + "): eigene Regel, keine Uhr",
            JSON.stringify(r) !== JSON.stringify(W.regelnNormalisieren({ nurEchte: true }))
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
    /* Seit 0.26.0 ohne Schild (Nutzer 29.09.2026: „serien schild raus"). */
    gleich("Händler: −30 % (Tipp, Extra-Leben)", B.WAREN.map((w) => B.haendlerPreis(M.WAREN[w].preis)),
        [11, 21]);
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
        && /BIBLIOTHEK\.figurenDerRunde\(runde, wertung\.figuren, WORDLE\.hilfeGenutzt\(runde\)\)/.test(app));
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
    pruefe("Kein Siegel auf dem Buch (noch nicht gebaut); Tinte seit 0.23.0", !/Siegel/.test(start) && /"tintenfass"/.test(start));
    pruefe("Herzen, Rast, Fund und Checkpoint auf dem Buch (seit 0.21.0)", /herzenBauen/.test(start)
        && /_rastBauen/.test(start) && /_fundBauen/.test(start) && /st-cp/.test(start));
    /* Seit 0.32.0 wählt das Quadrat unten die Art (die eine Liste START.ARTEN in js\bildschirm-start.js;
       tests\test-start.js); bis 0.31.0 ein Schalter oben. */
    const startSeite = lesen("js/bildschirm-start.js");
    pruefe("Arten Bibliothek · Üben in der einen Liste, kein Schalter mehr",
        new RegExp("id: \"bibliothek\", name: \"" + B.NAME + "\",").test(startSeite) && /id: "ueben", name: "Üben",/.test(startSeite)
            && !/BAUSTEINE\.segment/.test(start + startSeite));
    const wordle = lesen("js/bildschirm-wordle.js");
    pruefe("Runde der Bibliothek: Station, Wort gezogen, Regeln der Station",
        /BIBLIOTHEK\.wortZiehen\(buch, station, Math\.random\(\), zuletzt, BIBLIOTHEK\.wortFilter\(mitnahme\),\s*gebannt\)/.test(wordle)
            /* seit 0.28.0: Regeln einmal geholt, Zensor-Bann als letztes Argument */
            && /const regeln = BIBLIOTHEK\.rundeRegeln\(buch, station, mitnahme\)/.test(wordle) && /regeln: regeln,/.test(wordle)
            && /APP\.bibliothekMitnahme\(buch, station\)/.test(wordle));
    const r = W.neueRunde({ modus: "bibliothek", buch: 1, station: 12, loesung: "abend", regeln: B.regeln(1, 12) });
    gleich("Runde trägt Buch und Station", [r.buch, r.station, W.normalisieren(JSON.parse(JSON.stringify(r))).station], [1, 12, 12]);
    const bw = lesen("js/bildschirm-wordle.js");
    pruefe("Uhr: Anzeige über dem Brett, beendet die Runde selbst über WORDLE.raten",
        /_uhrBauen\(\)/.test(bw) && /WORDLE\.restZeit\(runde, /.test(bw)
        && /_zeitUm\(WORDLE\.raten\(runde, "", jetzt\)\)/.test(bw) && /_uhrAnhalten\(\)/.test(bw));
}

/* 8. Herzen, Checkpoint, Rast, Fund, Mitnahme (seit 0.21.0) */
{
    /* Wege aus 0.20.0 bleiben gegangen: jede Art zählt über Figur ODER Merker. */
    gleich("Art-Tausch: Rast mit altem Merker und Fund mit alter Figur sind erledigt",
        [B.station(1, 13).art, B.erledigt({ figuren: {}, schwuere: { 113: 1 } }, 1, 13),
            B.station(1, 17).art, B.erledigt({ figuren: { "1-17": 2 }, schwuere: {} }, 1, 17)], ["r", true, "f", true]);
    /* Ein in 0.20.0 durchgespieltes Buch 1 (Kampf = Figur, Truhe/Händler = Merker, alte Arten). */
    const alt020 = { figuren: { "1-10": 2, "1-12": 2, "1-14": 1, "1-15": 3, "1-17": 1, "1-19": 2, "1-21": 1, "1-25": 2, "1-26": 1,
        "1-27": 3, "1-31": 1, "1-32": 2 }, schwuere: { 122: 1, 124: 1, 129: 1 } };
    gleich("Buch 1 aus 0.20.0 bleibt durch, Buch 2 offen", [B.durch(alt020, 1), B.offen(alt020, 2)], [true, true]);

    gleich("Herzen erst ab Buch 2", [B.mitHerzen(1), B.mitHerzen(2), B.durchgangLeer(1).herzen, B.durchgangLeer(2).herzen],
        [false, true, 0, 5]);
    gleich("Durchgang: Unsinn wird leer, fremde Nummern fallen weg",
        B.durchgangNormalisieren({ herzen: 9, wieder: [12, 12, 999, "x"], geheilt: [13], ueben: 3, effekt: "gift" }, 2),
        { herzen: 5, wieder: [12], geheilt: [13], ueben: 0, effekt: "", tinte: 1 });

    const leer = { figuren: {}, schwuere: {} };
    const buch1 = B.scheitern(leer, 1, 10, B.durchgangLeer(1));
    gleich("Buch 1: Scheitern kostet nichts", [buch1.verlust, buch1.rueck], [0, false]);
    const wort = B.scheitern(leer, 2, 10, B.durchgangLeer(2));
    gleich("Wort gescheitert: −1 Herz", [wort.verlust, wort.dg.herzen, wort.rueck], [1, 4, false]);
    const gabel = B.gehen(2, 1, "0").turm;
    gleich("Elite gescheitert: −2", B.scheitern(gabel, 2, 12, B.durchgangLeer(2)).dg.herzen, 3);
    gleich("Nicht an der Front (schon gegangen): kein Verlust",
        B.scheitern(B.gehen(2, 2, "0").turm, 2, 10, B.durchgangLeer(2)).verlust, 0);
    const bossDa = B.gehen(2, 200, "0").turm;
    const bossNr = B.stationen(2).find((st) => st.art === "b").nr;
    delete bossDa.figuren["2-" + bossNr];
    gleich("Boss gescheitert: −3", B.scheitern(bossDa, 2, bossNr, B.durchgangLeer(2)).verlust, 3);

    /* Checkpoint = letzte gegangene Rast oder besiegte Elite (seit 0.21.1). */
    const mitElite = B.gehen(2, 3, "1").turm;
    gleich("Weg über die Elite: Checkpoint ist sie", [B.lauf(mitElite, 2).weg, B.checkpoint(mitElite, 2)], [[10, 12, 14], 12]);
    const ueberRast = B.gehen(2, 3, "0").turm;
    gleich("Weg über die Rast: Checkpoint ist sie", [B.lauf(ueberRast, 2).weg, B.checkpoint(ueberRast, 2)], [[10, 11, 13], 13]);
    const fallRast = B.scheitern(ueberRast, 2, 15, { herzen: 1 });
    gleich("0 Herzen nach der Rast: direkt dahinter, Herzen voll", [fallRast.rueck, fallRast.cp, fallRast.dg.wieder,
        fallRast.dg.herzen, B.lauf(B.sicht(ueberRast, { 2: fallRast.dg }), 2).jetzt], [true, 13, [], 5, 15]);
    const spaeter = B.gehen(2, 8, "11").turm;
    gleich("Die letzte auf dem Weg zählt (nicht die erste Elite)",
        [B.lauf(spaeter, 2).weg, B.checkpoint(spaeter, 2)], [[10, 12, 14, 15, 17, 18, 20, 22], 22]);
    const ohneElite = B.gehen(2, 1, "0").turm;
    gleich("Weg ohne Rast und Elite: kein Checkpoint", B.checkpoint(ohneElite, 2), null);
    gleich("Elite besiegt: Herzen voll; Wort nicht", [B.nachRunde({ herzen: 2 }, 2, 12, null, true, 0).herzen,
        B.nachRunde({ herzen: 2 }, 2, 11, null, true, 0).herzen, B.nachRunde({ herzen: 2 }, 2, 12, null, false, 0).herzen,
        B.nachRunde({}, 1, 12, null, true, 0).herzen], [5, 2, 2, 0]);
    const fall = B.scheitern(mitElite, 2, 15, { herzen: 1, wieder: [], geheilt: [13], ueben: 1, effekt: "fuenf" });
    gleich("0 Herzen: zurück hinter die Elite, Herzen voll, Üben/Fund weg, geheilt bleibt",
        [fall.rueck, fall.cp, fall.dg.wieder, fall.dg.herzen, fall.dg.ueben, fall.dg.effekt, fall.dg.geheilt],
        [true, 12, [14], 5, 0, "", [13]]);
    const sicht = B.sicht(mitElite, { 2: fall.dg });
    gleich("Sicht: die Station nach der Elite wartet wieder", B.lauf(sicht, 2).jetzt, 14);
    pruefe("Sicht ändert den Stand nicht", mitElite.figuren["2-12"] > 0 && mitElite.schwuere["214"] === 1);
    const fall0 = B.scheitern(ohneElite, 2, 11, { herzen: 1 });
    gleich("0 Herzen ohne Rast und Elite: zurück an den Buchanfang", [fall0.cp, fall0.dg.wieder, B.lauf(B.sicht(ohneElite,
        { 2: fall0.dg }), 2).jetzt], [null, [10], 10]);
    gleich("Wieder gegangen: raus aus der Liste", B.wiederErledigt(fall.dg, 2, 14).wieder, []);
    /* Nur vorwärts (seit 0.21.1): gegangene Stationen sind nicht spielbar,
       durchgespielte Bücher bleiben durch. */
    gleich("Gegangene Station nicht spielbar", [B.spielbar(mitElite, 2, 10), B.spielbar(mitElite, 2, 12),
        B.spielbar(mitElite, 2, 15)], [false, false, true]);
    const ganz021 = B.gehen(2, 200, "0110").turm;
    gleich("Buch 2 aus 0.21.0 durchgespielt: bleibt durch, Buch 3 offen", [B.durch(ganz021, 2), B.offen(ganz021, 3)],
        [true, true]);
    const startQuelle = lesen("js/start-bibliothek.js");
    pruefe("Blatt: Los nur an der Front (kein Nachspielen)", /los\.disabled = !spielbar;/.test(startQuelle)
        && !/Nochmal/.test(startQuelle.replace(/\/\*[\s\S]*?\*\//g, "")));

    /* Rast */
    const r1 = B.rastWaehlen({ herzen: 2 }, 2, 13, "heilen");
    gleich("Rast heilt +2 und merkt sich die Rast", [r1.ok, r1.dg.herzen, r1.dg.geheilt], [true, 4, [13]]);
    gleich("Dieselbe Rast heilt im Durchgang nur einmal", B.rastMoeglich(r1.dg, 2, 13, "heilen"), false);
    gleich("Volle Herzen: nicht heilen", B.rastMoeglich({ herzen: 5 }, 2, 13, "heilen"), false);
    gleich("Buch 1: nur Üben", [B.rastMoeglich({}, 1, 13, "heilen"), B.rastMoeglich({}, 1, 13, "ueben")], [false, true]);
    const u = B.rastWaehlen({}, 2, 13, "ueben");
    gleich("Üben: +1 Versuch nur für Elite/Boss an der Front",
        [u.dg.ueben, B.mitnahme(gabel, 2, 12, u.dg).ueben, B.mitnahme(gabel, 2, 11, u.dg).ueben,
            B.rundeRegeln(2, 12, { ueben: 1 }).versuche], [1, 1, 0, 7]);

    /* Fund */
    gleich("Buch 1: Wette und Tinte gegen Münzen (ohne Herzen)", B.fundAngebote(1, 17).map((f) => f.id).sort(), ["tintemuenzen", "wette"]);
    const angebote = [17, 19, 32, 37].map((nr) => B.fundAngebote(2, nr).map((f) => f.id));
    pruefe("Buch 2: zwei verschiedene Angebote je Fund, fest je Station",
        angebote.every((a) => a.length === 2 && a[0] !== a[1])
            && JSON.stringify(B.fundAngebote(2, 17)) === JSON.stringify(B.fundAngebote(2, 17)), JSON.stringify(angebote));
    pruefe("Zeit-Angebot erst ab Buch 3", [2].every((b) => B.stationen(b).filter((st) => st.art === "f")
        .every((st) => B.fundAngebote(b, st.nr).every((f) => f.id !== "zeit"))));
    gleich("Fund geht nur, wenn man es tragen kann",
        [B.fundMoeglich({ herzen: 1 }, 2, "herzmuenzen", 0), B.fundMoeglich({}, 2, "wette", 10),
            B.fundMoeglich({ effekt: "fuenf" }, 2, "doppelt", 99), B.fundMoeglich({ herzen: 5 }, 2, "muenzenherz", 99)],
        [false, false, false, false]);
    const hm = B.fundNehmen({ herzen: 3 }, 2, 17, "herzmuenzen", 0);
    const we = B.fundNehmen({}, 2, 17, "wette", 25);
    gleich("Fund: −1 Herz für +40; Wette kostet 20 und wirkt auf die nächste Station",
        [hm.dg.herzen, hm.muenzen, we.muenzen, we.dg.effekt], [2, 40, -20, "wette"]);

    /* Mitnahme und Belohnung */
    const fuenf = { effekt: "fuenf", ueben: 0 };
    gleich("Mitnahme nur an der Front und für Kampf", [B.mitnahme(leer, 2, 10, fuenf).effekt,
        B.mitnahme(leer, 2, 11, fuenf).effekt], ["fuenf", ""]);
    gleich("Regeln: „5 Versuche“, „60 Sekunden“", [B.rundeRegeln(2, 10, fuenf).versuche,
        B.rundeRegeln(2, 10, { effekt: "zeit" }).zeit, B.rundeRegeln(2, 10, {}).zeit || 0], [5, 60, 0]);
    pruefe("Doppelbuchstabe: jedes gezogene Wort hat einen",
        [0, 0.3, 0.6, 0.99].map((z) => B.wortZiehen(2, 15, z, [], B.wortFilter({ effekt: "doppelt" })))
            .every((w) => WB.merkmale(w).doppelt));
    gleich("Belohnung nur gelöst: ×2, +1 Figur (ohne Hilfe), +1 Herz, Wette ≤ 4",
        [B.belohnung({ effekt: "doppelt" }, { geloest: true }).muenzenMal,
            B.belohnung(fuenf, { geloest: true }).figurPlus, B.belohnung(fuenf, { geloest: true, hilfe: true }).figurPlus,
            B.belohnung({ effekt: "zeit" }, { geloest: true }).herzPlus,
            B.belohnung({ effekt: "wette" }, { geloest: true, versuche: 4 }).muenzenPlus,
            B.belohnung({ effekt: "wette" }, { geloest: true, versuche: 5 }).muenzenPlus,
            B.belohnung({ effekt: "doppelt" }, { geloest: false }).muenzenMal], [2, 1, 0, 1, 50, 0, 1]);
    const nach = B.nachRunde({ herzen: 3, effekt: "zeit", ueben: 1, wieder: [15] }, 2, 15, { effekt: "zeit", ueben: 1 }, true, 1);
    gleich("Nach der Runde: Mitnahme verbraucht, erledigt, Herz dazu", [nach.effekt, nach.ueben, nach.wieder, nach.herzen],
        ["", 0, [], 4]);
    const runde = W.neueRunde({ modus: "bibliothek", buch: 2, station: 15, loesung: "abend", mitnahme: fuenf });
    gleich("Runde trägt die Mitnahme (auch gespeichert), Tageswort nie",
        [runde.mitnahme, W.normalisieren(JSON.parse(JSON.stringify(runde))).mitnahme,
            W.neueRunde({ modus: "tag", loesung: "abend", mitnahme: fuenf }).mitnahme], [fuenf, fuenf, undefined]);
    runde.zustand = "gewonnen";
    runde.versuche = ["tisch", "abend"];
    gleich("Figuren der Runde: +1 aus „5 Versuche“", B.figurenDerRunde(runde, 2, false), 3);

    /* Münzen ausgeben ohne Ware (APP._muenzenAusgeben, rein) */
    const quelle = lesen("js/app.js");
    const anfang = quelle.indexOf("    _muenzenAusgeben(alt");
    const text = quelle.slice(anfang, quelle.indexOf("\n    },", anfang) + 7);
    const APP = vm.runInNewContext("({" + text + "})", { FORTSCHRITT: F });
    const reich = M.verdienen(F.leer(), "typoluck", 50, 1);
    const arm = APP._muenzenAusgeben(reich, 20, 2);
    gleich("Münzen ausgeben: Kontostand −20, nur im eigenen Zweig", [M.saldo(arm), Object.keys(arm.spiele)], [30, ["typoluck"]]);
    pruefe("Konto: der Durchgang geht nicht ans Konto (§11b kennt ihn nicht)",
        JSON.stringify(F.fuerKonto(arm)).indexOf("herzen") === -1 && /bibliothek-durchgang/.test(quelle));
}

/* 9. Tinte (seit 0.23.0, Nutzer „Tinte A") */
{
    gleich("Tinte: Start 1, höchstens 3, auch in Buch 1", [B.durchgangLeer(1).tinte, B.durchgangLeer(2).tinte,
        B.durchgangNormalisieren({ tinte: 9 }, 1).tinte, B.durchgangNormalisieren({}, 1).tinte], [1, 1, 3, 1]);
    const r = B.rastWaehlen({ tinte: 2 }, 1, 13, "tinte");
    gleich("Rast: Tinte +1", [r.ok, r.dg.tinte], [true, 3]);
    gleich("… nicht über 3", B.rastMoeglich(r.dg, 1, 13, "tinte"), false);
    const fall = B.scheitern(B.gehen(2, 3, "1").turm, 2, 15, { herzen: 1, tinte: 3 });
    gleich("Rückfall: Tinte 1 (Konzept §3.7)", fall.dg.tinte, 1);
    const tausch = B.fundNehmen({ herzen: 3, tinte: 1 }, 2, 17, "herztinte", 0);
    gleich("Fund: −1 Herz → +2 Tinte", [tausch.dg.herzen, tausch.dg.tinte], [2, 3]);
    const verkauft = B.fundNehmen({ tinte: 1 }, 1, 17, "tintemuenzen", 0);
    gleich("Fund: 1 Tinte → +35 Münzen", [verkauft.dg.tinte, verkauft.muenzen], [0, 35]);
    gleich("… ohne Tinte geht es nicht", B.fundMoeglich({ tinte: 0 }, 1, "tintemuenzen", 0), false);
    const quelle = lesen("js/app.js");
    pruefe("APP.tinteNutzen zieht eine vom Durchgang ab", /tinteNutzen\(buch\) \{[\s\S]*?dg\.tinte -= 1;/.test(quelle));
    const bw = lesen("js/bildschirm-wordle.js");
    pruefe("Runde: Tinte-Knopf nur mit Vorrat und WORDLE.tinteMoeglich; Einsetzen über APP.tinteNutzen",
        /tinte > 0 && WORDLE\.tinteMoeglich\(runde\)/.test(bw) && /APP\.tinteNutzen\(runde\.buch\)/.test(bw));
    pruefe("Mit Tinte höchstens eine Figur (Hilfe)", B.figurenDerRunde({ buch: 1, station: 10, zustand: "gewonnen",
        versuche: ["abend"], tinte: [0] }, 3, W.hilfeGenutzt({ tinte: [0] })) === 1);
}

/* 10. Start und Buch (seit 0.23.0, Nutzer 28.09.2026) */
{
    const quelle = lesen("js/start-bibliothek.js");
    const welt = {};
    const start = vm.runInNewContext("(" + quelle.slice(quelle.indexOf("    BUCH_WISCH_PX:"),
        quelle.indexOf("    /* Der Inhalt einer Station")).replace(/^\s*BUCH_WISCH_PX: 50,/, "{ BUCH_WISCH_PX: 50,")
        .replace(/,\s*$/, "") + " })", welt);
    welt.START = start;
    gleich("Buch-Wisch: hoch = nächstes Kapitel, runter = voriges, waagrecht/kurz = nichts (Tab-Wisch)",
        [start.buchWisch(5, -80), start.buchWisch(-4, 90), start.buchWisch(120, -60), start.buchWisch(0, 30)], [1, -1, 0, 0]);
    pruefe("Waagrecht wechselt auch über dem Buch der Tab (.buch nicht mehr gesperrt)",
        lesen("js/navigation.js").indexOf(", .buch,") === -1);
    const startSeite = lesen("js/bildschirm-start.js").replace(/\/\*[\s\S]*?\*\//g, "");
    pruefe("Freunde nicht mehr auf dem Start (Bibliothek und Üben); seit 0.23.1 ganz gelöscht",
        !/_freundeKarte|_freundeLaden|start-freunde/.test(startSeite + lesen("css/stil-bildschirme.css")));
    const stil = lesen("css/stil-bibliothek.css");
    pruefe("Startseite rollt nicht: so hoch wie der Bildschirm, overflow hidden",
        /\.inhalt\[data-bildschirm="start"\] \{[^}]*height: 100dvh;[^}]*overflow: hidden;/.test(stil));
    pruefe("Buch-Inhalte bleiben im Buch (overflow hidden, Linien abgeschnitten)",
        /\.buch \{\s*overflow: hidden;/.test(stil) && /svg\.pfad \{\s*overflow: hidden;/.test(stil));
}

/* 11. Vorschau und Vollbild (seit 0.23.2, Nutzer: „das Buch auf dem Handy passt so nicht") */
{
    const q = lesen("js/start-bibliothek.js");
    /* Seit 0.23.4 (Nutzer: „Aufschlagen soll raus als Knopf … die Vorschau soll nur die halbe Seite anzeigen"). */
    const bauen = q.slice(q.indexOf("    _bibliothekBauen(behaelter) {"), q.indexOf("    /* Was als Nächstes wartet"))
        .replace(/\/\*[\s\S]*?\*\//g, "");
    const vorschau = q.slice(q.indexOf("    _vorschauBauen(turm, b, lauf) {"), q.indexOf("    /* Was der grosse Knopf unten tut"));
    pruefe("Start: nur die Vorschau (ein Knopf, Stationen als Bild), kein „Aufschlagen“, keine Pfeile ‹ ›",
        /vorschau \? START\._stationBild\(b, st, zustand\) : START\._stationKnopf/.test(q) && bauen.length > 0
            && !/Aufschlagen"/.test(bauen) && !/titel: "Kapitel zurück"/.test(q) && !/titel: "Kapitel vor"/.test(q));
    /* Seit 0.32.0 (Nutzer 03.10.2026: „B aber die pfeile rechts weg man soll drauf klicken damit man den verlauf
       sehen kann"): die Karte ist die Seite — kein Ausschnitt mehr, ein Tipp öffnet den Verlauf. Der echte
       Bildschirm am kleinen DOM: tests\test-start.js. */
    pruefe("Vorschau „B“: der Weg füllt die Karte (kein halbes Buch), ohne Herzen/Tinte/Boss in n, Tipp → Verlauf",
        vorschau.length > 0 && /START\._wegBauen\(b, lauf, lauf\.kapitel\)/.test(vorschau)
            && /beiKlick: \(\) => START\.bibVerlaufOeffnen\(\)/.test(vorschau)
            && !/_leisteBauen|bib-naechste|bib-halb|_buchBauen/.test(vorschau) && !/halbAb|bib-halb/.test(q)
            && !/bib-halb/.test(lesen("css/stil-bibliothek.css")));
    pruefe("Vollbild: Leiste weg (body.buch-offen), unten „Verlassen“ + Hauptaktion",
        /document\.body\.classList\.add\("buch-offen"\)/.test(q) && /text: "Verlassen"/.test(q)
            && /body\.buch-offen \.leiste\.up-leiste \{\s*display: none;/.test(lesen("css/stil-bibliothek.css")));
    const s = lesen("js/bildschirm-start.js");
    pruefe("Nach der Runde an einer Kreuzung: Buch von selbst offen, „Wo lang?“",
        /START\.gabelBlatt\(b, lauf\.gabel, "Wo lang\?"\)/.test(s) && /verlassen: \(\) => START\.buchVerlassen/.test(s)
            && /kreuzung \? "Wo lang\?" : "Weiter"/.test(lesen("js/bildschirm-wordle.js")));
}


/* 12. Besser erklären (seit 0.23.4, Nutzer: „Funde besser erklären · Besonderheit des Gegners hinter das i ·
   eine Legende muss her") */
{
    gleich("Besonderheiten: Standard = keine", B.besonderheiten({ versuche: 6, nurEchte: true }), []);
    gleich("Besonderheiten: feste Reihenfolge, Versuche und Uhr zuerst",
        B.besonderheiten({ versuche: 5, zeit: 60, hart: true, farben: "ohneGelb", tastatur: "ohneGrau",
            ohneTipp: true, ohneLeben: true }).map((x) => x.id),
        ["versuche", "zeit", "hart", "ohneGelb", "ohneGrau", "ohneTipp", "ohneLeben"]);
    pruefe("Jede Verschärfung hat Chip, kurz, was, wie",
        Object.keys(B.VERSCHAERFUNGEN).every((id) => ["chip", "kurz", "was", "wie"]
            .every((f) => typeof B.VERSCHAERFUNGEN[id][f] === "string" && B.VERSCHAERFUNGEN[id][f].length > 0)));
    /* Jede Elite und jeder Boss hat mindestens eine Besonderheit, und jede Regel wird erklärt. */
    let alleGegner = true;
    let alleRegeln = true;
    for (let b = 1; b <= B.anzahlBuecher(); b++) {
        for (const st of B.stationen(b)) {
            const g = B.gegner(b, st.nr);
            if (st.art !== "e" && st.art !== "b") {
                alleGegner = alleGegner && g === null;
                continue;
            }
            alleGegner = alleGegner && !!g && g.besonderheiten.length > 0 && typeof g.name === "string";
            const r = B.regeln(b, st.nr);
            const ids = g.besonderheiten.map((x) => x.id);
            alleRegeln = alleRegeln && (!r.hart || ids.indexOf("hart") !== -1)
                && (!r.ohneTipp || ids.indexOf("ohneTipp") !== -1) && (!r.ohneLeben || ids.indexOf("ohneLeben") !== -1)
                && (!r.tastatur || ids.indexOf("ohneGrau") !== -1) && (!r.farben || ids.indexOf(r.farben) !== -1);
        }
    }
    pruefe("Gegner: nur Elite und Boss, jeder mit Name und mindestens einer Besonderheit", alleGegner);
    pruefe("Gegner: jede Regel der Station steht in den Besonderheiten", alleRegeln);
    gleich("Boss Buch 3: Harter Modus + 7 Versuche", B.gegner(3, B.stationen(3).find((s) => s.art === "b").nr)
        .besonderheiten.map((x) => x.chip), ["7 Versuche", "Harter Modus"]);

    pruefe("Fund: jedes Angebot erklärt (gibst/bekommst oder Wirkung, Wette mit Einsatz · Wenn · Gewinn)",
        B.FUNDE.every((f) => {
            const e = B.fundErklaerung(f.id);
            return !!e && e.zeilen.length >= 2 && e.zeilen.some((z) => z.ton === "kriegst");
        }));
    gleich("Fund: −1 Herz → 2 Tinte, sofort", B.fundErklaerung("herztinte").zeilen.map((z) => z.wert),
        ["1 Herz", "2 Tinte", "sofort"]);
    gleich("Fund: Wette = Einsatz, Wenn, Gewinn", B.fundErklaerung("wette").zeilen.map((z) => z.was),
        ["Einsatz", "Wenn", "Gewinn"]);
    gleich("Fund: unbekannt → null", B.fundErklaerung("gibtsnicht"), null);
    /* fundGrund "" genau dann, wenn fundMoeglich. */
    let einig = true;
    for (const b of [1, 2, 3]) {
        for (const f of B.FUNDE) {
            for (const dg of [{ herzen: 1, tinte: 0 }, { herzen: 5, tinte: 3 }, { herzen: 3, tinte: 1, effekt: "wette" },
                { herzen: 3, tinte: 1 }]) {
                for (const m of [0, 25, 100]) {
                    einig = einig && ((B.fundGrund(dg, b, f.id, m) === "") === B.fundMoeglich(dg, b, f.id, m));
                }
            }
        }
    }
    pruefe("Fund: Sperr-Grund genau dann leer, wenn der Tausch geht", einig);
    gleich("Fund: Gründe", [B.fundGrund({ herzen: 1 }, 2, "herzmuenzen", 0), B.fundGrund({ herzen: 5 }, 2, "muenzenherz", 99),
        B.fundGrund({ herzen: 3 }, 2, "muenzenherz", 10), B.fundGrund({ tinte: 0 }, 2, "tintemuenzen", 0),
        B.fundGrund({ effekt: "zeit" }, 3, "wette", 99)],
        ["Nur noch 1 Herz", "Herzen voll", "Zu wenig Münzen", "Keine Tinte", "Schon ein Tausch offen"]);

    const arten = new Set(B.LEGENDE.map((l) => l.art));
    pruefe("Legende: alle Stations-Arten + Lesezeichen, Nächste, Gegangen, Gesperrt",
        Object.keys(B.ARTEN).every((a) => arten.has(a)) && B.LEGENDE.some((l) => l.cp)
            && B.LEGENDE.some((l) => l.schloss) && B.LEGENDE.some((l) => l.zustand === "jetzt")
            && B.LEGENDE.some((l) => l.zustand === "fertig" && !l.cp));

    const q = lesen("js/start-bibliothek.js");
    pruefe("Buch: Legende-Knopf im Vollbild, beim ersten Öffnen einmal von selbst",
        /titel: "Legende"/.test(q) && /LEGENDE_SCHLUESSEL/.test(q) && /START\._legendeEinmal\(\)/.test(q));
    pruefe("Buch und Blatt: Gegner-Chips mit „i“ (START.gegnerChips / gegnerErklaeren)",
        /START\.gegnerChips\(b, nr\)/.test(q) && /gegnerErklaeren\(b, nr\)/.test(q) && /st-eigen/.test(q));
    pruefe("Fund-Blatt: Erklärung und Sperr-Grund je Angebot",
        /BIBLIOTHEK\.fundErklaerung\(f\.id\)/.test(q) && /BIBLIOTHEK\.fundGrund\(/.test(q));
    const bw = lesen("js/bildschirm-wordle.js");
    pruefe("Runde: Gegner-Chips mit „i“ auch während der Runde",
        /_gegnerBauen\(\)/.test(bw) && /START\.gegnerErklaeren\(runde\.buch, runde\.station, gebannt\)/.test(bw));
}

/* 13. Kreuzung von selbst (seit 0.23.4). Die halbe Vorschau (`halbAb`) gibt es seit 0.32.0 nicht mehr — die
   Karte „B" zeigt das ganze Kapitel (Lage: `wegLage`, tests\test-start.js). */
{
    const bw = lesen("js/bildschirm-wordle.js");
    pruefe("Kreuzung: nach der Runde von selbst ins Buch (Zeit, einmal je Runde, nur direkt nach der Wertung)",
        /if \(kreuzung && bib\) \{\s*WORDLE_BILDSCHIRM\._kreuzungPlanen\(runde, weiter\);/.test(bw)
            && /KREUZUNG_MS: 2000,/.test(bw) && /_kreuzungFuer === schluessel/.test(bw));
}

/* 14. Stationen im Innenrahmen der Seite (seit 0.23.4, Nutzer: „die einzelnen Steps sollen nicht am Rand vom
   Buch liegen, sondern passend auf den Seiten, nicht außerhalb oder auf der Außenlinie") — gemessen wie im CSS:
   Buch 400 : 560, Seite 4 px vom Rand, Innenrahmen 10 px weiter, Abstand ≥ 8 px; Radius Boss 8 %, sonst
   höchstens 7 % (Front), Ein/Aus 2 % (mind. 5 px) der Buchbreite. */
{
    const quelle = lesen("js/start-bibliothek.js");
    const teil = quelle.slice(quelle.indexOf("    LAGE_UNTEN:"), quelle.indexOf("    /* Zustände der Stellen"));
    const welt = {};
    const start = vm.runInNewContext("({" + teil + "})", welt);
    welt.START = start;
    let kleinster = Infinity;
    let wo = "";
    for (const breite of [250, 286, 320, 360, 400, 520, 700]) {
        const hoehe = breite * 560 / 400;
        const px = breite / 400;
        for (let b = 1; b <= B.anzahlBuecher(); b++) {
            for (let k = 0; k < B.anzahlKapitel(b); k++) {
                const kap = B.kapitel(b, k);
                kap.forEach((spalte, s) => spalte.forEach((art, i) => {
                    const l = start._lage(kap, s, i);
                    const x = l.x * px;
                    const y = l.y * px;
                    const r = art === "b" ? 0.08 * breite
                        : (art === "ein" || art === "aus" ? Math.max(0.02 * breite, 5) : Math.max(0.07 * breite, 11));
                    const oben = l.y < 280;
                    const seite = oben ? [4, hoehe / 2 - 4] : [hoehe / 2 + 4, hoehe - 4];
                    const rahmen = { l: 10, r: breite - 10, o: seite[0] + 10, u: seite[1] - 10 };
                    const abstand = Math.min(x - r - rahmen.l, rahmen.r - (x + r), y - r - rahmen.o, rahmen.u - (y + r));
                    if (abstand < kleinster) {
                        kleinster = abstand;
                        wo = "Buch " + b + " Kap " + k + " Spalte " + s + " (" + art + ") bei " + breite + " px";
                    }
                }));
            }
        }
    }
    pruefe("Jede Station ≥ 8 px im Innenrahmen ihrer Seite (Buchbreite 250–700 px); kleinster Abstand "
        + kleinster.toFixed(1) + " px — " + wo, kleinster >= 8);
    pruefe("Buch mit festem Seitenverhältnis 400 : 560 (Vollbild und Vorschau)",
        /\.bib-buch-platz > \.buch \{\s*width: min\(100cqw, calc\(100cqh \* 400 \/ 560\)\);\s*height: auto;\s*aspect-ratio: 400 \/ 560;/
            .test(lesen("css/stil-bibliothek.css")));
    pruefe("Keine Station im Falz (280 ± 36)", [start.LAGE_OBEN[0], start.LAGE_UNTEN[1]]
        .every((y) => Math.abs(y - 280) >= 36));
}

/* 15. Üben = zwei Modi (seit 0.23.4, Nutzer: „Tageswort und Übung getrennt … als zwei Spielmodi") */
{
    const s = lesen("js/bildschirm-start.js");
    const teil = s.slice(s.indexOf("    bisMorgen(jetzt) {"), s.indexOf("    /* Der Kopf einer Start-Karte"));
    const start = vm.runInNewContext("({" + teil.replace(/,\s*$/, "") + "})", {});
    gleich("Bis zum nächsten Tageswort", [start.bisMorgen(new Date(2026, 8, 28, 18, 48)),
        start.bisMorgen(new Date(2026, 8, 28, 23, 59, 30)), start.bisMorgen(new Date(2026, 8, 28, 0, 0))],
    ["5 h 12 min", "1 min", "24 h 0 min"]);
    /* Seit 0.32.0: EINE Karte (das Tageswort) und zwei Knöpfe im Knopf-Bereich unten (tests\test-start.js fährt
       den echten Bildschirm); bis 0.31.0 zwei Karten mit je einem Knopf. */
    pruefe("Üben: zwei Modi Tageswort und Übung als zwei Knöpfe, eine Karte",
        /knoepfe: \(\) => START\._uebenKnoepfe\(START\.SPIELE\[0\]\)/.test(s)
            && /NAVIGATION\.zeigen\(spiel\.id, \{ modus: "tag" \}\)/.test(s)
            && /NAVIGATION\.zeigen\(spiel\.id, \{ modus: "uebung" \}\)/.test(s)
            && !/_spielKachelBauen|_modiBauen|_modusKarte/.test(s));
    const bw = lesen("js/bildschirm-wordle.js");
    pruefe("Ende: „Nächstes Übungswort“ nur in der Übung, kein Übungs-Knopf am Tageswort",
        /text: "Nächstes Übungswort"/.test(bw) && !/text: "Übungsrunde"/.test(bw));
}

fazit();
