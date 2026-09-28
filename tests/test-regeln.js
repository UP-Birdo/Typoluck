/*
 * test-regeln.js — die Regeln je Runde (seit 0.19.0, js/wordle.js „DIE
 * REGELN JE RUNDE"; Konzept Apps\UPCrew\docs\BIBLIOTHEK-UND-BELOHNUNGEN.md
 * §3.8, §9.1) und die Wort-Merkmale (js/wortbewertung.js `merkmale`,
 * `passtMerkmale`).
 *
 *   1. Standard = heutiges Verhalten (Runde ohne `regeln`).
 *   2. Grenzen und Unsinn (regelnNormalisieren).
 *   3. Jede Regel einzeln: versuche, nurEchte, hart, zeit, ohneTipp,
 *      ohneLeben, farben, tastatur; normalisieren behält alles.
 *   4. Merkmale und Filter.
 */

const fs = require("fs");
const pfad = require("path");
const { pruefe, gleich, fazit } = require("./pruefer.js");

const W = require("../js/wordle.js");
const WB = require("../js/wortbewertung.js");
const WOERTER = require("../js/woerter-de.js");
const lesen = (name) => fs.readFileSync(pfad.join(__dirname, "..", name), "utf8");

const loesung = "abend";
const ohne = W.neueRunde({ modus: "uebung", loesung: loesung });
const rate = (runde, liste, t) => liste.reduce((r, w) => W.raten(r, w, t || 1).runde, runde);

/* 1. Standard = heutiges Verhalten */
{
    pruefe("Ohne Regeln kein Feld regeln", !("regeln" in ohne) && !("uhrAb" in ohne));
    gleich("Ohne Regeln: 6 Versuche, Tipp/Leben wie bisher", [W.versucheGrund(ohne), W.versucheMax(ohne)], [6, 6]);
    gleich("Ohne Regeln: unbekanntes Wort abgelehnt", W.raten(ohne, "xxxxx", 1).fehler, "unbekannt");
    const r = rate(ohne, ["tisch", "adler"]);
    gleich("Ohne Regeln: Bewertungen = echte Bewertung", W.bewertungen(r),
        [W.bewerten("tisch", loesung), W.bewerten("adler", loesung)]);
    gleich("Standard-Regeln = Runde ohne Regeln (Bewertung, Tastatur)",
        [W.bewertungen(rate(W.neueRunde({ modus: "uebung", loesung, regeln: {} }), ["tisch", "adler"])),
            W.tastenZustand(rate(W.neueRunde({ modus: "uebung", loesung, regeln: {} }), ["tisch", "adler"]))],
        [W.bewertungen(r), W.tastenZustand(r)]);
    gleich("Tageswort bleibt ohne Regeln", "regeln" in W.neueRunde({ modus: "tag", loesung, datum: "2026-09-28" }), false);
    gleich("Keine Uhr ohne Regel zeit", [W.uhrStarten(ohne, 5) === ohne, W.zeitAbgelaufen(ohne, 9e12), W.restZeit(ohne, 1)],
        [true, false, null]);
}

/* 2. Grenzen und Unsinn */
{
    const n = W.regelnNormalisieren;
    gleich("Standard", n(null), W.REGELN_STANDARD);
    gleich("versuche 4–8", [n({ versuche: 3 }).versuche, n({ versuche: 4 }).versuche, n({ versuche: 8 }).versuche,
        n({ versuche: 9 }).versuche, n({ versuche: "7" }).versuche], [6, 4, 8, 6, 6]);
    gleich("zeit 0 oder 30–300", [n({ zeit: 29 }).zeit, n({ zeit: 30 }).zeit, n({ zeit: 300 }).zeit, n({ zeit: 301 }).zeit],
        [0, 30, 300, 0]);
    gleich("Unsinn wird Standard", n({ farben: "lila", tastatur: "bunt", hart: "ja", nurEchte: 0, ohneTipp: 1 }),
        W.REGELN_STANDARD);
    gleich("nurEchte immer an (seit 0.23.2, Nutzer: immer nur echte Wörter)", [n({ nurEchte: false }).nurEchte,
        n({ nurEchte: undefined }).nurEchte], [true, true]);
}

/* 3. Jede Regel */
{
    const mit = (regeln) => W.neueRunde({ modus: "uebung", loesung, regeln });
    const v7 = mit({ versuche: 7 });
    gleich("versuche 7", [W.versucheGrund(v7), W.versucheMax(v7)], [7, 7]);
    const v4 = rate(mit({ versuche: 4 }), ["tisch", "adler", "birne", "kerze"]);
    gleich("versuche 4: nach 4 Fehlversuchen verloren", v4.zustand, "verloren");

    gleich("Auch mit nurEchte: false kein Unsinn-Wort (seit 0.23.2)", W.raten(mit({ nurEchte: false }), "xqzvb", 1).fehler,
        "unbekannt");
    gleich("… ein echtes Wort geht", W.raten(mit({ nurEchte: false }), "tisch", 1).fehler, "");

    const hart = mit({ hart: true });
    pruefe("hart setzt den Schwer-Modus", hart.schwer === true);
    const h1 = rate(hart, ["adler"]);
    gleich("hart: gefundener Buchstabe muss bleiben", W.raten(h1, "tisch", 2).fehler, "schwer");

    const z = mit({ zeit: 60 });
    gleich("zeit: Restzeit vor dem Start", W.restZeit(z, 1000), 60);
    const zs = W.uhrStarten(z, 1000);
    gleich("zeit: Uhr startet einmal", [zs.uhrAb, W.uhrStarten(zs, 5000).uhrAb], [1000, 1000]);
    gleich("zeit: vor Ablauf", [W.zeitAbgelaufen(zs, 60999), W.restZeit(zs, 31000)], [false, 30]);
    const um = W.raten(zs, "tisch", 61000);
    gleich("zeit: nach Ablauf verloren, Fehler „zeit“", [um.fehler, um.runde.zustand, um.runde.versuche.length],
        ["zeit", "verloren", 0]);
    gleich("zeit: danach kein Extra-Leben", W.lebenMoeglich(um.runde), false);
    gleich("zeit: bleibt verloren nach dem Speichern", W.normalisieren(JSON.parse(JSON.stringify(um.runde))).zustand, "verloren");

    gleich("ohneTipp: kein Tipp", [W.tippMoeglich(mit({ ohneTipp: true })), W.tippMoeglich(ohne)], [false, true]);
    const sechs = ["tisch", "adler", "birne", "kerze", "vogel", "blume"];
    gleich("ohneLeben: kein Extra-Leben", [W.lebenMoeglich(rate(mit({ ohneLeben: true }), sechs)), W.lebenMoeglich(rate(ohne, sechs))],
        [false, true]);

    const gelb = rate(mit({ farben: "ohneGelb" }), ["adler"]);
    pruefe("ohneGelb: kein „vorhanden“ zu sehen, echte Bewertung hat es",
        W.bewertungen(gelb)[0].indexOf(W.VORHANDEN) === -1 && W.bewerten("adler", loesung).indexOf(W.VORHANDEN) !== -1);
    pruefe("ohneGelb: Tastatur ohne Gelb", Object.values(W.tastenZustand(gelb)).indexOf(W.VORHANDEN) === -1);

    const blind = rate(mit({ farben: "ersteZeileBlind" }), ["adler", "tisch"]);
    gleich("ersteZeileBlind: Zeile 1 verdeckt, Zeile 2 echt",
        [W.bewertungen(blind)[0], W.bewertungen(blind)[1]], [["verdeckt", "verdeckt", "verdeckt", "verdeckt", "verdeckt"], W.bewerten("tisch", loesung)]);
    pruefe("ersteZeileBlind: Tastatur zählt Zeile 1 nicht", !("a" in W.tastenZustand(blind)));
    const blindEnde = rate(mit({ farben: "ersteZeileBlind" }), ["adler", "abend"]);
    gleich("ersteZeileBlind: am Ende echt", W.bewertungen(blindEnde)[0], W.bewerten("adler", loesung));
    gleich("Muster (Rangliste) immer echt", W.muster(blind)[0], W.muster(rate(ohne, ["adler"]))[0]);

    const grau = rate(mit({ tastatur: "ohneGrau" }), ["tisch"]);
    gleich("ohneGrau: keine grauen Tasten", Object.values(W.tastenZustand(grau)).indexOf(W.FALSCH), -1);

    const alles = W.uhrStarten(mit({ versuche: 7, farben: "ohneGelb", zeit: 90, ohneTipp: true }), 5);
    const zurueck = W.normalisieren(JSON.parse(JSON.stringify(rate(alles, ["tisch"], 6))));
    gleich("normalisieren behält regeln und uhrAb", [zurueck.regeln, zurueck.uhrAb],
        [W.regelnNormalisieren({ versuche: 7, farben: "ohneGelb", zeit: 90, ohneTipp: true }), 5]);
    gleich("Alte Runde mit grund (0.18.x) bleibt lesbar", W.versucheGrund(W.normalisieren(
        { modus: "bibliothek", loesung, versuche: [], buch: 4, level: 7, grund: 5 })), 5);
}

/* 4. Merkmale */
{
    const m = (w) => WB.merkmale(w, WOERTER.loesungen);
    pruefe("kasse: nebeneinander, doppelt, sz", m("kasse").nebeneinander && m("kasse").doppelt && m("kasse").sz);
    pruefe("ebene: doppelt, nicht nebeneinander", m("ebene").doppelt && !m("ebene").nebeneinander);
    pruefe("klang: einVokal", m("klang").einVokal && !m("tisch").doppelt);
    pruefe("quark: selten", m("quark").selten && !m("abend").selten);
    pruefe("größe und masse: sz", WB.merkmale("größe").sz && WB.merkmale("masse").sz && !WB.merkmale("tisch").sz);
    pruefe("ärger: umlaut; biene: ie; eiche: zwielaut", m("ärger").umlaut && WB.merkmale("biene").ie && m("eiche").zwielaut);
    pruefe("falle nur mit Liste", WB.merkmale("kante").falle === false);
    const fallen = WOERTER.loesungen.filter((w) => m(w).falle);
    pruefe("falle: mindestens 4 Nachbarn", fallen.length > 0 && fallen.every((w) => WB.nachbarn(w, WOERTER.loesungen) >= 4));
    gleich("passtMerkmale: verboten / pflicht / leer",
        [WB.passtMerkmale("kasse", { nebeneinander: "verboten" }), WB.passtMerkmale("kasse", { nebeneinander: "pflicht" }),
            WB.passtMerkmale("tisch", {}), WB.passtMerkmale("tisch", { unsinn: "pflicht", selten: "egal" })],
        [false, true, true, true]);
    pruefe("Merkmale ändern Wörter und Liste nicht (rein)", !lesen("js/wortbewertung.js").match(/merkmale[^\n]*localStorage/));
}

fazit();
