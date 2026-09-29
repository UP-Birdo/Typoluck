/*
 * test-lieblingswoerter.js — Lieblingswörter und der Zensor (seit 0.28.0,
 * js/lieblingswoerter.js, js/wordle.js Regel `lieblingeBannen`,
 * js/bibliothek.js Boss „Der Zensor").
 *
 *   1. Zählung: erster Versuch zählt 3, spätere 1, je Runde ein Wort einmal.
 *   2. Top 3: Rang, Mindestzahl, klein gehalten (MAX, ALTER), Unsinn.
 *   3. Bann im Modell: bannSauber, raten „zensiert", Meldung, normalisieren.
 *   4. Zensor in der Bibliothek: Regel, Besonderheiten mit/ohne Wörter,
 *      Lösung nie ein Lieblingswort.
 *   5. Konto-Schleuse: Schalter aus → nichts; an → Pfad + Regel §13;
 *      Gast → nichts; unverändert → nicht nochmal; Ablehnung → still.
 *   6. Eingebunden: Schalter im Code aus, Datei in index.html und sw.js,
 *      Aufruf genau einmal je Runde (APP.fortschrittMelden).
 */

const fs = require("fs");
const pfad = require("path");
const { pruefe, gleich, spaeter, fazit } = require("./pruefer.js");
const { geraetLeeren } = require("./umgebung.js");
const L = require("../js/lieblingswoerter.js");
const W = require("../js/wordle.js");
const B = require("../js/bibliothek.js");
const { SpeicherKonten } = require("../js/speicher.js");

const lesen = (name) => fs.readFileSync(pfad.join(__dirname, "..", name), "utf8");
const zaehle = (stand, runden) => runden.reduce((s, r) => L.zaehlen(s, r), stand || L.leer());

/* 1. Zählung */
{
    const s = zaehle(null, [["adler", "blume", "adler"]]);
    gleich("Eine Runde: erster Versuch [1,0], späterer [0,1], doppelt nur einmal",
        [s.n, s.w.adler.slice(0, 2), s.w.blume.slice(0, 2)], [1, [1, 0], [0, 1]]);
    gleich("Punkte: erst ×3, sonst ×1", [L.punkte([2, 1, 0]), L.punkte([0, 4, 0])], [7, 4]);
    const leer = L.zaehlen(L.leer(), []);
    gleich("Leere Runde zählt nicht", leer.n, 0);
    const gross = L.zaehlen(L.leer(), ["ADLER"]);
    pruefe("Grossbuchstaben werden klein gezählt", !!gross.w.adler);
    const ohneSz = L.zaehlen(L.leer(), ["straße", "fuß", "masse", "äpfel"]);
    gleich("Nur a–z, ä, ö, ü: Wörter mit ß zählen nicht", Object.keys(ohneSz.w).sort(), ["masse", "äpfel"]);
    gleich("Nur ß-Wörter: Runde zählt nicht", L.zaehlen(L.leer(), ["straße"]).n, 0);
    gleich("normalisieren wirft alte ß-Einträge hinaus",
        Object.keys(L.normalisieren({ n: 2, w: { straße: [2, 0, 2], adler: [2, 0, 2] } }).w), ["adler"]);
    pruefe("_istWort: kein ß, keine Akzente", !L._istWort("straße") && !L._istWort("café") && L._istWort("übung"));
    const vorher = L.leer();
    L.zaehlen(vorher, ["adler"]);
    gleich("zaehlen ändert den alten Stand nicht", vorher.n, 0);
}

/* 2. Top 3 */
{
    gleich("Nach einer Runde noch keine Lieblingswörter", L.top(zaehle(null, [["adler", "blume"]])), []);
    /* adler 3× zuerst (9), blume 1× zuerst + 2× später (5), creme 4× später (4),
       dachs 2× später (2), eimer 1× zuerst (3, aber nur einmal) */
    const s = zaehle(null, [
        ["adler", "blume", "creme"], ["adler", "creme", "dachs"], ["adler", "blume", "creme"],
        ["blume", "creme", "dachs"], ["eimer"]
    ]);
    gleich("Top 3 nach Punkten, erster Versuch wiegt schwerer", L.top(s), ["adler", "blume", "creme"]);
    const gleichstand = zaehle(null, [["ebene", "fabel"], ["fabel", "ebene"]]);
    gleich("Gleichstand: gleiche Punkte → ABC", L.top(gleichstand), ["ebene", "fabel"]);

    /* Klein gehalten: nie mehr als MAX Wörter. */
    let viel = L.leer();
    const alle = W.alleLoesungen ? W.alleLoesungen() : require("../js/woerter-de.js").loesungen;
    for (let i = 0; i < 60; i++) {
        viel = L.zaehlen(viel, [alle[i], alle[i + 100]]);
    }
    pruefe("Höchstens MAX Wörter", Object.keys(viel.w).length <= L.MAX,
        Object.keys(viel.w).length + " > " + L.MAX);
    pruefe("Die neuesten bleiben", !!viel.w[alle[59]] && !!viel.w[alle[159]]);

    /* Alte fallen heraus: ALTER Runden nicht mehr gesehen. */
    let alt = zaehle(null, [["adler"], ["adler"]]);
    for (let i = 0; i < L.ALTER; i++) {
        alt = L.zaehlen(alt, ["blume"]);
    }
    pruefe("Nach ALTER Runden ohne das Wort fällt es heraus", !alt.w.adler && !!alt.w.blume);
    gleich("Und ist kein Lieblingswort mehr", L.top(alt), ["blume"]);

    gleich("Unsinn: normalisieren", L.normalisieren({ n: -3, w: { "x": [1, 1, 1], "ADLER": [1, 0, 0],
        "blume": "kaputt", "creme": [2, "a", 99] }, k: 7 }), { n: 0, w: { creme: [2, 0, 0] }, k: "" });
    gleich("Unsinn: top(null)", L.top(null), []);
}

/* Gerät: je Spieler getrennt */
{
    geraetLeeren();
    const runde = { versuche: ["adler", "blume"] };
    L.rundeZaehlen("a", runde);
    L.rundeZaehlen("a", runde);
    L.rundeZaehlen("gast", { versuche: ["creme"] });
    gleich("Gerät: je Spieler-Id getrennt", [L.woerter("a"), L.woerter("gast"), L.woerter("b")],
        [["adler", "blume"], [], []]);
    pruefe("Gerät: ein Schlüssel „typoluck.lieblingswoerter\"", geraet.getItem(L.SCHLUESSEL) !== null);
    gleich("Runde ohne Versuche: nichts gezählt", L.rundeZaehlen("a", { versuche: [] }), ["adler", "blume"]);
}

/* 3. Bann im Modell */
{
    const zensor = { versuche: 7, farben: "ohneGelb", ohneTipp: true, lieblingeBannen: true };
    gleich("regelnNormalisieren behält lieblingeBannen nur, wenn true",
        [W.regelnNormalisieren(zensor).lieblingeBannen, "lieblingeBannen" in W.regelnNormalisieren({ lieblingeBannen: 1 })],
        [true, false]);
    gleich("bannSauber: nur 5 Buchstaben, klein, ohne Doppelte, ohne Lösung, höchstens 3",
        W.bannSauber(["ADLER", "adler", "abend", "xy", 7, "blume", "creme", "dachs"], "abend"),
        ["adler", "blume", "creme"]);
    const runde = W.neueRunde({ modus: "bibliothek", buch: 4, station: 12, loesung: "abend",
        regeln: zensor, gebannt: ["adler", "abend", "blume"] });
    gleich("Runde: gebannt ohne die Lösung", runde.gebannt, ["adler", "blume"]);
    const ohneRegel = W.neueRunde({ modus: "bibliothek", buch: 4, station: 12, loesung: "abend",
        regeln: { versuche: 7 }, gebannt: ["adler"] });
    pruefe("Ohne Regel kein Bann", !("gebannt" in ohneRegel));
    const a = W.raten(runde, "adler", 1);
    gleich("raten: gebanntes Wort → „zensiert\", Runde unverändert", [a.fehler, a.runde.versuche.length], ["zensiert", 0]);
    gleich("raten: gebannt auch gross", W.raten(runde, "ADLER", 1).fehler, "zensiert");
    gleich("Meldung „zensiert\" (nur ein Wort, passt bei 360 px)", W.fehlerText("zensiert"), "Zensiert");
    pruefe("Meldung kurz (höchstens 30 Zeichen, kein Satz)", W.fehlerText("zensiert").length <= 30
        && !/[.!]$/.test(W.fehlerText("zensiert")));
    gleich("raten: anderes Wort geht", W.raten(runde, "hafen", 1).fehler, "");
    gleich("raten: die Lösung geht immer", W.raten(runde, "abend", 1).runde.zustand, "gewonnen");
    gleich("Unbekanntes bleibt „unbekannt\"", W.raten(runde, "qqqqq", 1).fehler, "unbekannt");
    const gemerkt = W.normalisieren(JSON.parse(JSON.stringify(runde)));
    gleich("normalisieren behält den Bann", [gemerkt.gebannt, W.istGebannt(gemerkt, "blume")], [["adler", "blume"], true]);
    const leer = W.neueRunde({ modus: "bibliothek", buch: 4, station: 12, loesung: "abend", regeln: zensor, gebannt: [] });
    gleich("Keine Lieblingswörter: leerer Bann, alles eingebbar", [leer.gebannt, W.raten(leer, "adler", 1).fehler], [[], ""]);
}

/* 4. Zensor in der Bibliothek */
{
    const b = B.BUECHER.findIndex((buch) => buch.boss.name === "Der Zensor") + 1;
    pruefe("Der Zensor ist ein Boss", b > 0);
    const r = B.BUECHER[b - 1].boss.regeln;
    gleich("Zensor-Regeln: kein Gelb, 7 Versuche, ohne Tipp, Lieblingswörter gebannt",
        [r.farben, r.versuche, r.ohneTipp, r.lieblingeBannen], ["ohneGelb", 7, true, true]);
    const regeln = W.regelnNormalisieren(r);
    const ids = (liste) => B.besonderheiten(regeln, liste).map((x) => x.id);
    gleich("Ohne Lieblingswörter: nur kein Gelb (kein Bann-Chip)", ids([]), ["versuche", "ohneGelb", "ohneTipp"]);
    gleich("Mit Lieblingswörtern: Bann-Chip nach „Kein Gelb\"", ids(["adler"]),
        ["versuche", "ohneGelb", "lieblingeBannen", "ohneTipp"]);
    const bann = B.besonderheiten(regeln, ["adler", "blume"]).find((x) => x.id === "lieblingeBannen");
    gleich("Erklärung nennt die eigenen Wörter", bann.gesperrt, "ADLER · BLUME");
    gleich("Chip kurz", bann.kurz, "Zensiert");
    pruefe("Unbekannt (ohne Liste): Regel allgemein genannt", ids(undefined).indexOf("lieblingeBannen") !== -1);
    gleich("Andere Bosse bannen nicht", B.BUECHER.filter((x) => x.boss.regeln.lieblingeBannen).length, 1);

    /* Die Lösung ist nie ein gebanntes Wort. */
    const st = B.station ? (() => {
        for (let nr = 0; nr < 200; nr++) {
            if (B.station(b, nr) && B.station(b, nr).art === "b") {
                return nr;
            }
        }
        return -1;
    })() : -1;
    pruefe("Boss-Station gefunden", st >= 0);
    const bereich = B.woerter(b, st);
    const verboten = bereich.slice(0, 3);
    let getroffen = 0;
    for (let i = 0; i < 50; i++) {
        const z = i / 50;
        if (verboten.indexOf(B.wortZiehen(b, st, z, [], null, verboten)) !== -1) {
            getroffen++;
        }
    }
    gleich("wortZiehen: verbotene Wörter nie gezogen (50 Züge)", getroffen, 0);
    gleich("wortZiehen ohne Verbot wie bisher", B.wortZiehen(b, st, 0, []), bereich[0]);
    const nurEins = [bereich[0]];
    pruefe("Alles verboten → trotzdem ein Wort (Rückfall; die Runde nimmt es aus dem Bann)",
        typeof B.wortZiehen(b, st, 0.3, [], null, bereich) === "string");
    gleich("Gegner mit Wörtern", B.gegner(b, st, nurEins).besonderheiten.some((x) => x.id === "lieblingeBannen"), true);
}

/* 5. Konto-Schleuse */
function rueckwand() {
    const geschrieben = [];
    return { geschrieben, teilSchreiben: async (a) => { geschrieben.push(JSON.parse(JSON.stringify(a))); } };
}
const regel13 = (() => {
    const text = fs.readFileSync(pfad.join(__dirname, "..", "..", "UPCrew", "docs", "DATENBANK-KONZEPT-12.md"), "utf8");
    const t = text.match(/"lieblingswoerter": \{[\s\S]*?matches\(\/(\^\[a-zäöü\]\{4,8\}\$)\//);
    return t ? new RegExp(t[1]) : null;
})();
pruefe("Regel §13 (Konzept §11) enthält lieblingswoerter mit Muster", !!regel13);

spaeter("Konto-Schleuse", (async () => {
    const vorbereiten = (uid, regel) => {
        geraetLeeren();
        const wand = rueckwand();
        L.einrichten(wand, () => uid);
        L.REGEL = regel;
        L.rundeZaehlen("ich", { versuche: ["adler", "blume", "creme"] });
        L.rundeZaehlen("ich", { versuche: ["adler", "blume", "creme"] });
        return wand;
    };

    let wand = vorbereiten("uid1", false);
    gleich("Schalter aus: nichts ans Konto", [await L.senden("ich"), wand.geschrieben.length], [false, 0]);
    gleich("Schalter aus: gezählt wird trotzdem", L.woerter("ich"), ["adler", "blume", "creme"]);

    wand = vorbereiten("uid1", true);
    gleich("Schalter an: geschrieben", await L.senden("ich"), true);
    const a = wand.geschrieben[0] || {};
    gleich("Pfad und Werte", a["konten/uid1/lieblingswoerter/typoluck"], { 0: "adler", 1: "blume", 2: "creme" });
    pruefe("Mit geaendertAm (Regel 3 der Konten)", typeof a.geaendertAm === "number");
    gleich("Nur diese zwei Pfade", Object.keys(a).sort(), ["geaendertAm", "konten/uid1/lieblingswoerter/typoluck"]);
    pruefe("Alle Werte bestehen die Regel §13", !!regel13
        && Object.values(a["konten/uid1/lieblingswoerter/typoluck"] || {}).every((w) => regel13.test(w)));
    gleich("Unverändert: kein zweites Mal", [await L.senden("ich"), wand.geschrieben.length], [false, 1]);
    L.rundeZaehlen("ich", { versuche: ["dachs", "eimer"] });
    L.rundeZaehlen("ich", { versuche: ["dachs"] });
    L.rundeZaehlen("ich", { versuche: ["dachs"] });
    gleich("Geändert: wieder geschickt", [await L.senden("ich"), wand.geschrieben.length], [true, 2]);
    gleich("Neue Top 3", wand.geschrieben[1]["konten/uid1/lieblingswoerter/typoluck"], { 0: "dachs", 1: "adler", 2: "blume" });

    wand = vorbereiten(null, true);
    gleich("Gast (keine uid): nichts ans Konto", [await L.senden("ich"), wand.geschrieben.length], [false, 0]);

    geraetLeeren();
    L.einrichten({ teilSchreiben: async () => { throw Object.assign(new Error("401"), { status: 401 }); } }, () => "uid1");
    L.REGEL = true;
    L.rundeZaehlen("ich", { versuche: ["adler"] });
    L.rundeZaehlen("ich", { versuche: ["adler"] });
    gleich("Ablehnung: still, false, Merker bleibt leer", [await L.senden("ich"), L.stand("ich").k], [false, ""]);

    gleich("fuerKonto: nur Wörter nach der Regel", L.fuerKonto(["adler", "straße", "ab", "blume"]), { 0: "adler", 1: "blume" });
    gleich("fuerKonto: nichts übrig → null", L.fuerKonto(["ab"]), null);
    L.REGEL = null;
    gleich("Ohne SpeicherKonten (Node ohne Seite): kein Konto", L.regelDa(), false);
    /* Im Browser ist SpeicherKonten global; hier nur für diese Prüfung. */
    globalThis.SpeicherKonten = SpeicherKonten;
    gleich("Ohne Test-Schalter gilt SpeicherKonten.REGEL_GRAU_EINGESPIELT", L.regelDa(), SpeicherKonten.REGEL_GRAU_EINGESPIELT);
    delete globalThis.SpeicherKonten;
})());

/* 6. Eingebunden */
{
    gleich("SpeicherKonten.REGEL_GRAU_EINGESPIELT an (Regel §13 am 30.09.2026 eingespielt)", SpeicherKonten.REGEL_GRAU_EINGESPIELT, true);
    gleich("Kein eigener Schalter im Code (REGEL: null)", lesen("js/lieblingswoerter.js").match(/REGEL: (\w+),/)[1], "null");
    pruefe("index.html lädt js/lieblingswoerter.js vor app.js",
        lesen("index.html").indexOf("js/lieblingswoerter.js") > 0
        && lesen("index.html").indexOf("js/lieblingswoerter.js") < lesen("index.html").indexOf("js/app.js"));
    pruefe("sw.js hält js/lieblingswoerter.js vor", lesen("sw.js").indexOf("./js/lieblingswoerter.js") !== -1);
    const app = lesen("js/app.js");
    const melden = app.slice(app.indexOf("    fortschrittMelden(runde) {"), app.indexOf("    fortschrittMelden(runde) {") + 1200);
    pruefe("Gezählt in APP.fortschrittMelden (genau einmal je Runde)", melden.indexOf("APP._lieblingeZaehlen(runde)") !== -1);
    gleich("_lieblingeZaehlen nur einmal gerufen", (app.match(/APP\._lieblingeZaehlen\(/g) || []).length, 1);
    pruefe("Profil zeigt Lieblingswörter nur beim eigenen", /if \(eigenes\) \{[\s\S]*?lieblingeBauen\(\)[\s\S]*?\} else \{/
        .test(lesen("js/bildschirm-profil.js")));
    pruefe("Runde übergibt die Wörter an wortZiehen und neueRunde",
        /wortZiehen\([^;]*gebannt\)/.test(lesen("js/bildschirm-wordle.js"))
        && /mitnahme: mitnahme, gebannt: gebannt/.test(lesen("js/bildschirm-wordle.js")));
}

fazit();
