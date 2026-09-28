/*
 * test-wortbewertung.js — die Wort-Bewertung (seit 0.16.0, js/wortbewertung.js).
 *
 *   1. Die Rechnung: Farbmuster wie WORDLE.bewerten, Löser, Fallen, Muster,
 *      Vokal-Regel des Nutzers („einfache Worte sind welche mit zwei
 *      unterschiedlichen a e i o u"), Zahl 0–100.
 *   2. Die Daten passen zur Liste: js/wortbewertung-daten.js gehört zur
 *      aktuellen Lösungsliste und ist genau das, was die Rechnung heute
 *      ergibt (sonst: werkzeug/Woerter-Bewerten.ps1 neu ausführen).
 *   3. Stufen etwa je ein Drittel, Skala 1–10.
 *   4. Die Korrektur von Hand gewinnt immer; die Korrektur-Datei ist sauber.
 *   5. Das Tageswort nimmt diese Stufe; Datum → Wort bleibt wie vorher.
 *   6. Nur für den Nutzer: Die Werkzeug-Seite und die volle Bewertung werden
 *      NICHT ausgeliefert, die App hat keinen Einstieg dorthin.
 */

const fs = require("fs");
const pfad = require("path");
const vm = require("vm");
const { pruefe, gleich, fazit } = require("./pruefer.js");

const wurzel = pfad.join(__dirname, "..");
const lesen = (name) => fs.readFileSync(pfad.join(wurzel, name), "utf8");
const WOERTER = require("../js/woerter-de.js");
const WORDLE = require("../js/wordle.js");
const WB = require("../js/wortbewertung.js");
const DATEN = require("../js/wortbewertung-daten.js");
const WERTUNG = require("../js/wertung.js");

const loesungen = WOERTER.loesungen;
const erlaubt = WOERTER.loesungen.concat(WOERTER.zusatz);

/* 1. Rechnung */
{
    const farbe = { richtig: 2, vorhanden: 1, falsch: 0 };
    const alsZahl = (g, l) => WORDLE.bewerten(g, l).reduce((s, f) => s * 3 + farbe[f], 0);
    let abweichung = 0;
    for (const g of erlaubt.filter((_, i) => i % 17 === 0).concat(["apfel", "affen", "tasse", "ärger"])) {
        for (const l of loesungen) {
            if (WB.musterZahl(g, l) !== alsZahl(g, l)) {
                abweichung++;
            }
        }
    }
    gleich("Farbmuster wie WORDLE.bewerten (auch doppelte Buchstaben, Umlaute)", abweichung, 0);

    const start = WB.startwoerter(loesungen, erlaubt, 1)[0];
    const loeser = WB.loeser(loesungen, erlaubt, start);
    const versuche = loesungen.map((w) => loeser(w));
    pruefe("Löser: löst jedes Lösungswort in höchstens sechs Versuchen", versuche.every((v) => v >= 1 && v <= 6));
    gleich("Löser: das Startwort selbst in einem Versuch", loeser(start), loesungen.indexOf(start) !== -1 ? 1 : loeser(start));
    pruefe("Löser: im Mittel unter vier Versuchen",
        versuche.reduce((s, v) => s + v, 0) / versuche.length < 4);

    gleich("Fallen: Nachbarn an genau einer Stelle", WB.nachbarn("abcde", ["abcdf", "abcde", "xbcdf", "abcxx"]), 1);
    const anteil = WB.buchstabenAnteile(loesungen);
    const grenzen = { min: 0, max: 5 };
    const m1 = WB.muster("tasse", anteil, grenzen);
    const m2 = WB.muster("ärger", anteil, grenzen);
    gleich("Muster: doppelter Buchstabe gezählt", m1.doppelt, 1);
    gleich("Muster: Umlaut erkannt", [m2.umlaut, WB.muster("abend", anteil, grenzen).umlaut], [1, 0]);

    gleich("Vokale: verschiedene aus a e i o u", ["blume", "klang", "pasta", "extra", "ärger", "rhythm".slice(0, 5)]
        .map((w) => WB.vokale(w)), [2, 1, 1, 2, 1, 0]);
    const basis = { versuche: 3, nachbarn: 1, muster: 0.3, bekanntheit: null };
    const mit = (v) => WB.zahl(Object.assign({}, basis, { vokale: v }));
    pruefe("Nutzer-Regel: zwei verschiedene Vokale machen am leichtesten",
        mit(2) < mit(3) && mit(3) < mit(1) && mit(1) < mit(0));
    gleich("Nutzer-Regel wirkt deutlich: zwei statt einem Vokal = 20 Punkte leichter", mit(1) - mit(2), 20);
    gleich("Gewichte ergeben 1", Math.round(100 * Object.values(WB.GEWICHTE).reduce((s, g) => s + g, 0)), 100);
    gleich("Bekanntheit: Platz vorgesehen, zählt vorerst nicht", WB.GEWICHTE.bekanntheit, 0);
    pruefe("Zahl bleibt in 0–100", [WB.zahl({ versuche: 9, nachbarn: 9, muster: 1, vokale: 0 }),
        WB.zahl({ versuche: 1, nachbarn: 0, muster: 0, vokale: 2 })].every((z) => z >= 0 && z <= 100));
}

/* 2. Die Daten passen zur Liste */
{
    gleich("Daten: gleiche Anzahl wie die Lösungsliste", DATEN.anzahl, loesungen.length);
    gleich("Daten: gleiche Prüfsumme (Reihenfolge zählt)", DATEN.pruefsumme, WB.pruefsumme(loesungen));
    /* Seit 0.18.1 verschleiert (Nutzer 28.09.2026: „soll nicht öffentlich
       sein"): keine lesbaren Werte je Wort in der ausgelieferten Datei. */
    gleich("Daten: nur Schwellen und `kodiert` (seit 0.18.1)", Object.keys(DATEN).sort(),
        ["anzahl", "kodiert", "pruefsumme", "skalaAb", "stufenAb"]);
    pruefe("Daten: `kodiert` ist Base64 mit einem Byte je Wort",
        /^[A-Za-z0-9+/]+=*$/.test(DATEN.kodiert) && Buffer.from(DATEN.kodiert, "base64").length === loesungen.length);
    const roh = Array.from(Buffer.from(DATEN.kodiert, "base64"));
    pruefe("Daten: die Bytes sind NICHT die Zahlen (verschleiert)",
        roh.filter((b, i) => b === WB.schwierigkeit(loesungen[i])).length < loesungen.length / 20);
    const datei = lesen("js/wortbewertung-daten.js").replace(/\/\*[\s\S]*?\*\//g, "");
    pruefe("Daten: keine lesbare Ziffernfolge je Wort mehr (stufen/skala/zahlen)",
        !/"(stufen|skala|zahlen)"\s*:/.test(datei) && !/[0-9]{40,}/.test(datei));
    pruefe("Eine Lesestelle: Stufe und Skala aus der Schwierigkeit",
        loesungen.every((w) => { const e = WB.eintrag(w); return WB.stufe(w) === e.stufe
            && e.stufe === (e.zahl >= DATEN.stufenAb[1] ? 3 : (e.zahl >= DATEN.stufenAb[0] ? 2 : 1)); }));
    pruefe("WORTBEWERTUNG.schwierigkeit: jedes Lösungswort hat eine Zahl 0–100",
        loesungen.every((w) => { const e = WB.eintrag(w); return Number.isInteger(e.zahl) && e.zahl >= 0 && e.zahl <= 100; }));
    const neu = WB.berechnen(loesungen, erlaubt);
    const frisch = WB.appDaten(neu, loesungen);
    pruefe("Daten = was die Rechnung heute ergibt (sonst werkzeug\\Woerter-Bewerten.ps1 neu ausführen)",
        JSON.stringify(frisch) === JSON.stringify(DATEN));
    pruefe("Entschleiert = die gerechnete Zahl, für jedes Wort",
        loesungen.every((w) => WB.schwierigkeit(w) === neu.woerter[w][0]));
    const vollDatei = pfad.join(wurzel, "werkzeug", "wortbewertung-voll.js");
    if (fs.existsSync(vollDatei)) {
        const voll = require(vollDatei);
        pruefe("Werkzeug-Daten gehören zur selben Liste", voll.pruefsumme === DATEN.pruefsumme
            && JSON.stringify(WB.appDaten(voll, loesungen)) === JSON.stringify(DATEN));
    }

    /* 3. Stufen und Skala */
    for (const stufe of [1, 2, 3]) {
        const anteil = loesungen.filter((w) => WB.eintrag(w).stufe === stufe).length / loesungen.length;
        pruefe("Stufe " + WB.STUFEN_NAMEN[stufe] + ": etwa ein Drittel (" + Math.round(anteil * 100) + " %)",
            anteil > 0.25 && anteil < 0.42);
    }
    pruefe("Skala: alle zehn Stufen belegt", new Set(loesungen.map((w) => WB.eintrag(w).skala)).size === 10);
    pruefe("Skala und Stufe passen zusammen (leicht nie über 5, schwer nie unter 6)",
        loesungen.every((w) => { const e = WB.eintrag(w); return !(e.stufe === 1 && e.skala > 5) && !(e.stufe === 3 && e.skala < 6); }));
}

/* 4. Die Korrektur gewinnt */
{
    const w = loesungen[0];
    const auto = WB.eintrag(w);
    WB._korrekturErsatz = { [w]: { stufe: auto.stufe === 3 ? 1 : 3, skala: 10, ungeeignet: true } };
    const k = WB.eintrag(w);
    gleich("Korrektur gewinnt: Stufe", k.stufe, auto.stufe === 3 ? 1 : 3);
    gleich("Korrektur gewinnt: Skala", k.skala, 10);
    gleich("Korrektur: ungeeignet, als korrigiert markiert", [k.ungeeignet, k.korrigiert, WB.ungeeignet(w)], [true, true, true]);
    gleich("Korrektur: die gerechnete Stufe bleibt sichtbar", k.auto, auto.auto);
    gleich("Tageswort-Stufe folgt der Korrektur", WERTUNG.schwierigkeit(w), k.stufe);
    WB._korrekturErsatz = { [w]: { zahl: 77 } };
    gleich("Korrektur gewinnt: Zahl 0–100 (seit 0.18.0, Bibliothek)", [WB.schwierigkeit(w), WB.eintrag(w).korrigiert], [77, true]);
    WB._korrekturErsatz = { [w]: { stufe: 7, skala: 0, zahl: 101, ungeeignet: "ja" } };
    gleich("Ungültige Korrektur wird übergangen", [WB.eintrag(w).stufe, WB.eintrag(w).skala, WB.eintrag(w).ungeeignet],
        [auto.stufe, auto.skala, false]);
    gleich("Ungültige Zahl wird übergangen", WB.schwierigkeit(w), auto.zahl);

    global.WORTBEWERTUNG = WB;
    WB._korrekturErsatz = {};
    for (const wort of loesungen.slice(0, 560)) {
        WB._korrekturErsatz[wort] = { ungeeignet: true };
    }
    const uebung = new Set();
    for (let i = 0; i < 200; i++) {
        uebung.add(WORDLE.uebungswort(i / 200));
    }
    pruefe("Übung: „ungeeignet“ kommt nicht dran", [...uebung].every((x) => loesungen.indexOf(x) >= 560));
    delete global.WORTBEWERTUNG;
    WB._korrekturErsatz = null;

    const text = WB.korrekturDatei({ "ärger": { stufe: 3, skala: 11, x: 1 }, "Kaputt!": { stufe: 1 }, "hallo": {} });
    const kasten = { module: { exports: {} } };
    vm.runInNewContext(text, kasten);
    /* Seit 0.18.2 verschleiert: kein Wort, kein Wert lesbar. */
    gleich("Korrektur-Datei: nur `kodiert`", Object.keys(kasten.module.exports), ["kodiert"]);
    pruefe("Korrektur-Datei: kein Wort lesbar", text.replace(/\/\*[\s\S]*?\*\//g, "").indexOf("ärger") === -1);
    gleich("Korrektur-Datei: entschleiert nur gültige Wörter und Felder",
        WB.korrekturEntschleiern(kasten.module.exports.kodiert), { "ärger": { stufe: 3 } });
    const leer = { module: { exports: {} } };
    vm.runInNewContext(WB.korrekturDatei({}), leer);
    gleich("Leere Korrektur bleibt {}", leer.module.exports, {});
    /* Die App liest die verschleierte Form. */
    const w0 = loesungen[3];
    const kodiert = { module: { exports: {} } };
    vm.runInNewContext(WB.korrekturDatei({ [w0]: { zahl: 91, ungeeignet: true } }), kodiert);
    global.WORTBEWERTUNG_KORREKTUR = kodiert.module.exports;
    gleich("Verschleierte Korrektur wirkt (Zahl, ungeeignet)", [WB.schwierigkeit(w0), WB.ungeeignet(w0)], [91, true]);
    delete global.WORTBEWERTUNG_KORREKTUR;
    WB._korrekturFuer = null;
    const echt = require("../js/wortbewertung-korrektur.js");
    pruefe("Die Korrektur im Projekt: leer oder verschleiert",
        Object.keys(echt).length === 0 || (Object.keys(echt).length === 1 && typeof echt.kodiert === "string"));
    gleich("Die Korrektur im Projekt ist ein Objekt", typeof require("../js/wortbewertung-korrektur.js"), "object");
}

/* 5. Tageswort */
{
    gleich("Datum → Wort unverändert (vergangene Tage)",
        ["2026-09-24", "2026-09-27", "2026-10-01"].map((d) => WORDLE.tageswort(d).wort), ["duell", "blick", "walze"]);
    gleich("Tageswort-Stufe = Stufe der Bewertung",
        WERTUNG.schwierigkeit(WORDLE.tageswort("2026-09-27").wort), WB.stufe(WORDLE.tageswort("2026-09-27").wort));
    const plus = (d, n) => { const [j, m, t] = d.split("-").map(Number); const x = new Date(Date.UTC(j, m - 1, t + n));
        return x.toISOString().slice(0, 10); };
    const plan = WB.plan("2026-09-27", 30, (d) => WORDLE.tageswort(d), plus);
    gleich("Plan: 30 Tage, Stufen gezählt", [plan.zeilen.length, plan.verteilung[1] + plan.verteilung[2] + plan.verteilung[3]], [30, 30]);
    pruefe("Plan: „dreimal schwer“ richtig erkannt", plan.zeilen.every((z, i) => z.dreiSchwer
        === (i >= 2 && plan.zeilen[i].stufe === 3 && plan.zeilen[i - 1].stufe === 3 && plan.zeilen[i - 2].stufe === 3)));
    pruefe("Die Herausforderungen zeigen die Stufe aus WERTUNG.schwierigkeit",
        /stufe: WERTUNG\.schwierigkeit\(WORDLE\.tageswort/.test(lesen("js/bildschirm-herausforderungen.js")));
}

/* 6. Nur für den Nutzer — nicht ausgeliefert */
{
    const deploy = lesen("tools/Deploy-Typoluck.ps1");
    const ordner = (deploy.match(/\$freigegebeneOrdner\s*=\s*@\(([^)]*)\)/) || [])[1] || "";
    const dateien = (deploy.match(/\$freigegebeneDateien\s*=\s*@\(([^)]*)\)/) || [])[1] || "";
    pruefe("Deploy sendet den Ordner werkzeug\\ nicht", ordner !== "" && !/werkzeug/i.test(ordner + dateien));
    pruefe("Die Werkzeug-Seite liegt in werkzeug\\ (nicht in js\\, tools\\ oder der Wurzel)",
        fs.existsSync(pfad.join(wurzel, "werkzeug", "woerter-werkzeug.html"))
            && !fs.existsSync(pfad.join(wurzel, "woerter-werkzeug.html"))
            && !fs.existsSync(pfad.join(wurzel, "tools", "woerter-werkzeug.html"))
            && !fs.existsSync(pfad.join(wurzel, "js", "wortbewertung-voll.js")));
    const app = ["index.html", "sw.js"].concat(fs.readdirSync(pfad.join(wurzel, "js")).map((d) => "js/" + d))
        .map((d) => lesen(d).replace(/\/\*[\s\S]*?\*\//g, "")).join("\n");
    pruefe("Die App hat keinen Einstieg zur Wort-Liste (kein werkzeug, kein bildschirm=woerter)",
        !/woerter-werkzeug|wortbewertung-voll|bildschirm=woerter|WORTBEWERTUNG_VOLL/.test(app));
}

fazit();
