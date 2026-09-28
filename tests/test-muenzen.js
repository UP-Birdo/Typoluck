/*
 * test-muenzen.js — Münzen, Shop und Serie ab Rundenstart (seit 0.17.0, wie
 * Apps\Blunderluck\tests\test-muenzen.js zu Blunderluck v0.152.0).
 *
 *   1. Die Serien- und Zähler-Rechnung ist in BEIDEN fortschritt.js
 *      identisch (Funktion für Funktion verglichen).
 *   2. Serie: jeder Rundenstart zählt, über 60 Tage, Schutz und Schilde,
 *      alte Stände wie bisher, zwei Geräte.
 *   3. Münzen: verdienen je Runde, Kontostand über beide Zweige, kaufen.
 *   4. Waren in Typoluck: Extra-Leben = 7. Versuch, Tipp = ein richtiger
 *      Buchstabe, mit Hilfe höchstens ein Bauer, Rangliste fair.
 *   5. Eingebunden: Shop statt „Bald", Start zählt beim ersten Versuch.
 */

const fs = require("fs");
const pfad = require("path");
const vm = require("vm");
const { pruefe, gleich, fazit } = require("./pruefer.js");

const wurzel = pfad.join(__dirname, "..");
const lesen = (name) => fs.readFileSync(pfad.join(wurzel, name), "utf8");
global.UPCREW_ABZEICHEN = require("../js/upcrew-abzeichen.js");
const F = require("../js/fortschritt.js");
const M = require("../js/upcrew-muenzen.js");
const WORDLE = require("../js/wordle.js");
const ERGEBNISSE = vm.runInNewContext(lesen("js/ergebnisse.js") + "\n;ERGEBNISSE", { WORDLE, console });

function tag(n) {
    return new Date(Date.UTC(2026, 0, 1 + n, 12)).toISOString().slice(0, 10);
}

/* 1. Dieselbe Rechnung wie Blunderluck */
function funktion(text, name) {
    const m = new RegExp("\\n    " + name.replace(/[$]/g, "\\$&") + "\\(").exec(text);
    if (!m) {
        return null;
    }
    const a = m.index + 1;
    return text.slice(a, text.indexOf("\n    },", a) + 7);
}
{
    const bl = pfad.join(wurzel, "..", "Blunderluck", "js", "fortschritt.js");
    const tl = lesen("js/fortschritt.js");
    const namen = ["zusammenfuehren", "_zaehlerZusammen", "serie", "_datumZahl", "_zahlDatum", "_tageZwischen",
        "_zaehlerSumme", "schildVorrat", "serieStand", "rundeGestartet", "_zaehlerAnlegen"];
    if (fs.existsSync(bl)) {
        const text = fs.readFileSync(bl, "utf8");
        for (const name of namen) {
            const eigen = funktion(tl, name);
            pruefe("Zeile für Zeile wie Blunderluck: " + name, eigen !== null && eigen === funktion(text, name));
        }
        pruefe("Zeile für Zeile wie Blunderluck: SERIE_ZAEHLER",
            tl.indexOf('SERIE_ZAEHLER: ["serie", "serieBis", "serieSchutz"],') !== -1
                && text.indexOf('SERIE_ZAEHLER: ["serie", "serieBis", "serieSchutz"],') !== -1);
    }
}

/* 2. Serie */
{
    let stand = {};
    stand = F.rundeGestartet(stand, tag(0), 1, "blunderluck", 0).stand;
    gleich("Serie: am selben Tag nur einmal", F.rundeGestartet(stand, tag(0), 2, "blunderluck", 0).neu, false);
    stand = F.rundeGestartet(stand, tag(1), 3, "typoluck", 0).stand;
    const r = F.rundeGestartet(stand, tag(2), 4, "blunderluck", 0);
    gleich("Serie über beide Spiele: 3", r.serie, 3);
    gleich("Heute gestartet", F.serie(r.stand, tag(2), 0), { tage: 3, heute: true, schutzGenutzt: 0 });
    gleich("Morgen noch offen, läuft", [F.serie(r.stand, tag(3), 0).heute, F.serie(r.stand, tag(3), 0).tage], [false, 3]);
    gleich("Zwei Tage verpasst: vorbei", F.serie(r.stand, tag(5), 0).tage, 0);

    let lang = {};
    for (let n = 0; n < 400; n++) {
        lang = F.rundeGestartet(lang, tag(n), n + 1, n % 3 === 0 ? "typoluck" : "blunderluck", 0).stand;
    }
    gleich("Serie über 60 Tage (Zähler): 400", F.serie(lang, tag(399), 0).tage, 400);
    pruefe("Die Tagesliste bleibt kurz", lang.spiele.typoluck.tage.length <= 60);

    let gekauft = F.rundeGestartet({}, tag(0), 1, "typoluck", 0).stand;
    gekauft = M.verdienen(gekauft, "typoluck", 200, 2);
    gekauft = M.kaufen(gekauft, "typoluck", "schild", 3).stand;
    gleich("Ein Schild im Vorrat", F.schildVorrat(gekauft), 1);
    gleich("Gestern verpasst: lebt noch dank Schild", F.serie(gekauft, tag(2), 0).tage, 1);
    gleich("Die Flamme zählt den Schild als Schutz", F.serieHeute(gekauft, tag(2)).schutz >= 1, true);
    gekauft = F.rundeGestartet(gekauft, tag(2), 4, "typoluck", 0).stand;
    gleich("Überbrückt, Schild verbraucht", [F.serie(gekauft, tag(2), 0).tage, F.schildVorrat(gekauft)], [2, 0]);

    const alt = { spiele: { blunderluck: { tage: ["2026-09-24", "2026-09-26"] },
        typoluck: { tage: ["2026-09-25", "2026-09-22"] } } };
    gleich("Alte Stände ohne Zähler: wie bisher", [F.serie(alt, "2026-09-26", 0).tage, F.serie(alt, "2026-09-26", 1).tage], [3, 4]);

    const a = { spiele: { typoluck: { stand: 10, zaehler: { muenzenVerdient: 30, serie: 5, serieBis: 20260105 } } } };
    const b = { spiele: { typoluck: { stand: 20, zaehler: { muenzenVerdient: 12, serie: 2, serieBis: 20260101 } } } };
    const z = F.zusammenfuehren(a, b).spiele.typoluck.zaehler;
    gleich("Zwei Geräte: Münzen gehen nicht verloren, Serie aus dem neueren serieBis",
        [z.muenzenVerdient, z.serie, z.serieBis], [30, 5, 20260105]);
    gleich("Ans Konto gehen die neuen Zähler mit (Regel §11b: Buchstaben-Namen)",
        F.fuerKonto({ spiele: { typoluck: { zaehler: { muenzenVerdient: 7, serieBis: 20260105, schildGekauft: 1 } } } })
            .spiele.typoluck.zaehler.muenzenVerdient, 7);
}

/* 3. Münzen */
{
    const quelle = lesen("js/app.js");
    const start = quelle.indexOf("    muenzenFuerRunde(vorher");
    const text = quelle.slice(start, quelle.indexOf("\n    },", start) + 7);
    const APP = vm.runInNewContext("({" + text + "})", { FORTSCHRITT: F, UPCREW_MUENZEN: M });
    const vorher = F.leer();
    const heute = "2026-09-27";
    const tagErgebnis = F.partie(vorher, { datum: heute, tagesaufgabe: true, figuren: 2, stufe: 2, geloest: true, versuche: 3 });
    gleich("Tageswort zum ersten Mal geschafft: +10",
        APP.muenzenFuerRunde(vorher, tagErgebnis, { modus: "tag", zustand: "gewonnen" }, true, heute), 10);
    gleich("… nochmal am selben Tag: nichts", APP.muenzenFuerRunde(tagErgebnis.stand,
        F.partie(tagErgebnis.stand, { datum: heute, tagesaufgabe: true, figuren: 3, stufe: 2 }),
        { modus: "tag", zustand: "gewonnen" }, true, heute), 0);
    const uebung = F.partie(vorher, { datum: heute, tagesaufgabe: false, figuren: 0 });
    gleich("Gelöste Übung: +3", APP.muenzenFuerRunde(vorher, uebung, { modus: "uebung", zustand: "gewonnen" }, false, heute), 3);
    gleich("Verlorene Übung: nichts", APP.muenzenFuerRunde(vorher, uebung, { modus: "uebung", zustand: "verloren" }, false, heute), 0);
    gleich("Level-Aufstieg: +10 je Level", APP.muenzenFuerRunde(vorher,
        Object.assign({}, uebung, { levelVorher: 2, levelNachher: 4 }), { modus: "uebung", zustand: "verloren" }, false, heute), 20);

    let s = M.verdienen({}, "typoluck", 40, 1);
    s = M.verdienen(s, "blunderluck", 25, 2);
    gleich("Kontostand = Summe über beide Zweige", M.anzeige(s), 65);
    const kauf = M.kaufen(s, "typoluck", "leben", 3);
    gleich("Kaufen: Leben 30, Vorrat 1", [kauf.ok, M.anzeige(kauf.stand), M.vorrat(kauf.stand, "leben")], [true, 35, 1]);
    gleich("Zu wenig: kein Kauf", M.kaufen(M.verdienen({}, "typoluck", 10, 1), "typoluck", "leben", 2).ok, false);
}

/* 4. Waren in Typoluck */
{
    let runde = WORDLE.neueRunde({ modus: "tag", datum: "2026-09-27", nummer: 4, loesung: "blick" });
    gleich("Ohne Leben: 6 Versuche", WORDLE.versucheMax(runde), 6);
    for (const w of ["abend", "acker", "adler", "ahorn", "aktie", "alarm"]) {
        runde = WORDLE.raten(runde, w, 1).runde;
    }
    gleich("Nach 6 Fehlern verloren, Leben möglich", [runde.zustand, WORDLE.lebenMoeglich(runde)], ["verloren", true]);
    const mitLeben = WORDLE.lebenEinsetzen(runde);
    gleich("Extra-Leben: ein 7. Versuch, die Runde läuft wieder", [mitLeben.zustand, WORDLE.versucheMax(mitLeben)], ["laeuft", 7]);
    gleich("… nur einmal", WORDLE.lebenEinsetzen(Object.assign({}, mitLeben, { zustand: "verloren", versuche: runde.versuche.concat(["album"]) })), null);
    const geloest = WORDLE.raten(mitLeben, "blick", 2).runde;
    gleich("Im 7. Versuch gelöst", [geloest.zustand, geloest.versuche.length], ["gewonnen", 7]);
    const ergebnis = ERGEBNISSE.ausRunde(geloest);
    gleich("Rangliste bleibt fair: 7. Versuch zählt wie X/6", [ergebnis.geloest, ergebnis.versuche, ergebnis.muster.length], [false, 6, 6]);
    gleich("Gespeichert und neu gelesen: Leben bleibt", WORDLE.normalisieren(JSON.parse(JSON.stringify(geloest))).extra, 1);
    gleich("Hilfe genutzt", WORDLE.hilfeGenutzt(geloest), true);

    let neu = WORDLE.neueRunde({ modus: "uebung", loesung: "blick" });
    neu = WORDLE.raten(neu, "blatt", 1).runde;
    gleich("Tipp: die erste Stelle, die noch nie grün war", WORDLE.tippStelle(neu), 2);
    const t = WORDLE.tippEinsetzen(neu);
    gleich("Tipp deckt I an Feld 3 auf", [t.stelle, t.buchstabe, t.runde.tipps], [2, "i", [2]]);
    gleich("Der nächste Tipp nimmt die nächste Stelle", WORDLE.tippStelle(t.runde), 3);
    gleich("Ohne Hilfe keine Hilfe", WORDLE.hilfeGenutzt(neu), false);

    const mitHilfe = F.partie(F.leer(), { datum: "2026-09-27", tagesaufgabe: true, figuren: 3, stufe: 2, hilfe: true });
    gleich("Tageswort mit Hilfe: höchstens ein Bauer", F.heuteVon(mitHilfe.stand, "typoluck", "2026-09-27"), 1);
    const ohne = F.partie(F.leer(), { datum: "2026-09-27", tagesaufgabe: true, figuren: 3, stufe: 2 });
    gleich("… ohne Hilfe drei", F.heuteVon(ohne.stand, "typoluck", "2026-09-27"), 3);
}

/* 5. Eingebunden */
{
    const nav = lesen("js/navigation.js");
    pruefe("Shop statt „Bald“ auf Platz 5", /\{ id: "shop", text: "Shop", zeichen: "shop" \}/.test(nav) && !/platzhalter: true \}/.test(nav));
    const wordle = lesen("js/bildschirm-wordle.js");
    pruefe("Start zählt beim abgegebenen Versuch (Tageswort und Übung)", /APP\.rundeGestartet\(\)/.test(wordle));
    pruefe("Tipp-Knopf nur mit Vorrat, Extra-Leben nach dem 6. Fehler",
        /APP\.vorrat\("tipp"\)/.test(wordle) && /WORDLE\.lebenMoeglich\(WORDLE_BILDSCHIRM\.runde\) && APP\.vorrat\("leben"\) > 0/.test(wordle));
    pruefe("Münzen im Ergebnis neben den XP", /gewinn\.muenzen > 0/.test(wordle));
    const shop = lesen("js/bildschirm-shop.js");
    pruefe("Shop aus dem Baustein, Kauf über APP.kaufen, Waren-Texte für Typoluck",
        /UPCREW_SHOP\.bauen\(/.test(shop) && /APP\.kaufen\(ware\)/.test(shop) && /7\. Versuch/.test(shop));
    /* 0.17.1: eigene Texte über die Option `texte`, WAREN bleibt unberührt. */
    pruefe("Shop-Texte über die Option texte, WAREN nie überschrieben",
        /texte: SHOP_BILDSCHIRM\.TEXTE/.test(shop) && !/WAREN\[[^\]]+\]\.(text|name)\s*=/.test(shop));
    const SHOP = require("../js/upcrew-shop.js");
    const vorher = JSON.stringify(M.WAREN);
    const tl = { leben: { text: "Ein 7. Versuch" } };
    gleich("UPCREW_SHOP.text: eigener Text, Name aus WAREN", SHOP.text("leben", tl),
        { name: M.WAREN.leben.name, text: "Ein 7. Versuch" });
    gleich("UPCREW_SHOP.text: ohne texte der Baustein-Text", SHOP.text("tipp").text, M.WAREN.tipp.text);
    pruefe("UPCREW_SHOP.text verändert WAREN nicht", JSON.stringify(M.WAREN) === vorher);
    const index = lesen("index.html");
    pruefe("index.html lädt Münzen, Shop und Stil",
        ["js/upcrew-muenzen.js", "js/upcrew-shop.js", "css/upcrew-shop.css", "js/bildschirm-shop.js"].every((d) => index.indexOf(d) !== -1));
}

fazit();
