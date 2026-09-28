/*
 * test-wortstatistik.js — Wortstatistik, Spieler-Stufe, neue Schwierigkeit
 * und Lexikon (seit 0.23.1, js/wortstatistik.js und
 * js/wortstatistik-abgleich.js; Konzept Apps\UPCrew\docs\
 * DATENBANK-KONZEPT-12.md §6–§9 und §12 „Nur Typoluck").
 *
 *   1. Wortschlüssel: 8 Hex, keine Kollision über die Lösungsliste.
 *   2. Tatsachen und Klassen einer Runde (t/u/b, Hilfe, Grenze 5/6/7).
 *   3. Datensatz: erste Runde (e, w mit Nullen, l = e.c), Runde 2–4 (w…),
 *      ab 5 „-" ohne Summen; der Mehrpfad-Schritt mit Server-Zuwachs.
 *   4. Stufe: Rechnung, Grenzen, Unsicherheit, Zusammenführen.
 *   5. Neue Schwierigkeit aus Summen (Probe mit bekannter D), Übergang,
 *      Korrektur gewinnt, App-Daten mit Rückfall-Form.
 *   6. Lexikon: Export aus dem Werkzeug → Prüfen → Schritte; als „voll".
 *   7. Aufräumen, Detail-Ansicht.
 *   8. Abgleich: unter der alten Regel nichts senden (Warteschlange),
 *      unter §12 senden; Gast nie; Schwierigkeit mit Rückfall.
 *   9. Eingebunden (index.html, sw.js, Deploy-Sperre), Tageswort bleibt.
 */

const fs = require("fs");
const pfad = require("path");
const { pruefe, gleich, fazit, speicherAttrappe } = require("./pruefer.js");
require("./umgebung.js");

const wurzel = pfad.join(__dirname, "..");
const lesen = (name) => fs.readFileSync(pfad.join(wurzel, name), "utf8");
global.WORTBEWERTUNG = require("../js/wortbewertung.js");
const WS = require("../js/wortstatistik.js");
global.WORTSTATISTIK = WS;
const loesungen = WOERTER_DE.loesungen;

/* 1. Schlüssel */
{
    const schluessel = loesungen.map((w) => WS.schluessel(w));
    pruefe("Schlüssel: 8 Hex", schluessel.every((k) => /^[0-9a-f]{8}$/.test(k)));
    gleich("Keine Kollision über alle Lösungswörter", new Set(schluessel).size, loesungen.length);
    gleich("Schlüssel fest (gleich im Werkzeug)", WS.schluessel("ABEND"), WS.schluessel("abend"));
}

/* 2. Tatsachen und Klassen */
const runde = (angaben) => Object.assign({ modus: "tag", loesung: "abend", versuche: ["tisch", "abend"],
    zustand: "gewonnen", begonnenAm: 1000, beendetAm: 96000, tipps: [], extra: 0 }, angaben);
{
    const t = WS.tatsachen(runde({}), "2026-09-28");
    gleich("Tageswort in 2: Klasse 2, ohne Hilfe, Modus t, Dauer 95 s, Grün-Verlauf",
        [t.klasse, t.hilfe, t.m, t.d, t.f, t.tag, t.g], [2, false, "t", 95, "05", 20260928, 6]);
    gleich("Klassen: 7 = gelöst mit Extra-Versuch, 0 = nicht gelöst, 8 = nicht gelöst bei Grenze 5",
        [WS.klasse(true, 7, 7), WS.klasse(false, 0, 6), WS.klasse(false, 0, 5), WS.klasse(true, 1, 6)], [7, 0, 8, 1]);
    const boss = WS.tatsachen(runde({ modus: "bibliothek", zustand: "verloren", versuche: ["tisch", "tisch", "tisch",
        "tisch", "tisch"], regeln: { versuche: 5 } }), "2026-09-28");
    gleich("Boss nicht gelöst bei Grenze 5 → 8, Modus b", [boss.klasse, boss.m, boss.g, boss.v], [8, "b", 5, 0]);
    const hilfe = WS.tatsachen(runde({ modus: "uebung", tipps: [0], tinte: [1] }), "2026-09-28");
    gleich("Übung mit Tipp und Tinte: Hilfe, 2 Hilfen, Modus u", [hilfe.hilfe, hilfe.h, hilfe.m], [true, 2, "u"]);
    gleich("Laufende Runde zählt nicht", WS.tatsachen(runde({ zustand: "laeuft" }), "2026-09-28"), null);
}

/* 3. Datensatz und Schritt */
{
    const t = WS.tatsachen(runde({}), "2026-09-28");
    const r1 = WS.datensatz(null, t, 41.4);
    gleich("Erste Runde: r 1, l = e.c, w mit Nullen", [r1.r, r1.l, r1.e.c, r1.w, r1.s],
        [1, "a2", "a2", { g: 0, x: 0, v: 0, h: 0, d: 0 }, 41]);
    const s1 = WS.schritt("uid-a", WS.schluessel("abend"), r1);
    gleich("Schritt: Datensatz + 3 Summen-Zeilen als Server-Zuwachs", Object.keys(s1).length, 4);
    gleich("… st wächst um s", s1["summen/" + WS.schluessel("abend") + "/st"], { ".sv": { increment: 41 } });
    const verloren = WS.tatsachen(runde({ zustand: "verloren", versuche: ["tisch"] }), "2026-09-29");
    let r = r1;
    const ls = [];
    for (let i = 0; i < 4; i++) {
        r = WS.datensatz(r, i % 2 ? t : verloren, 40);
        ls.push(r.l);
    }
    gleich("Runde 2–4: w<Klasse>, ab 5 „-“", ls, ["w0", "w2", "w0", "-"]);
    gleich("r = 1 + w.g + w.x; e bleibt fest", [r.r, 1 + r.w.g + r.w.x, r.e.c, r.e.z], [5, 5, "a2", 20260928]);
    gleich("Ab Runde 5: keine Summen-Zeilen", Object.keys(WS.schritt("u", "k", r)), ["runden/u/k"]);
    const warte = WS.warteAufnehmen(WS.warteAufnehmen([], { k: "a" }), { k: "a", neu: 1 });
    gleich("Warteschlange: je Wort das neueste", warte, [{ k: "a", neu: 1 }]);
    const viele = Array.from({ length: 320 }, (_, i) => ({ k: "k" + i })).reduce((l, e) => WS.warteAufnehmen(l, e), []);
    gleich("… höchstens 300", [viele.length, viele[0].k], [300, "k20"]);
}

/* 4. Stufe */
{
    const t = (klasse) => ({ klasse: klasse, hilfe: false, tag: 20260928 });
    const s0 = WS.stufeLeer();
    const gut = WS.stufeNach(s0, t(1), 1, 35, 5);
    const schlecht = WS.stufeNach(s0, t(0), 1, 35, 5);
    pruefe("Gelöst im 1. steigt, nicht gelöst sinkt (bei D = S)", gut.wert > 35 && schlecht.wert < 35);
    gleich("Erwartung bei S = D ist 0,5", WS.erwartung(40, 40), 0.5);
    gleich("Unsicherheit sinkt, nicht unter 2", [Math.round(gut.unsicher * 100), WS.stufeNach({ unsicher: 2 }, t(1), 1, 35, 1).unsicher],
        [760, 2]);
    const pause = WS.stufeNach({ wert: 35, unsicher: 3, tag: 20260901 }, t(4), 1, 35, 1);
    pruefe("Drei Wochen Pause: Unsicherheit wieder höher", pause.unsicher > 3 * 0.95);
    pruefe("Ab der 5. Runde eines Wortes kleiner Schritt", Math.abs(WS.stufeNach(s0, t(1), 5, 35, 1).wert - 35)
        < Math.abs(gut.wert - 35) / 5);
    gleich("Grenzen 0–100", [WS.stufeNach({ wert: 99.9, unsicher: 8 }, t(1), 1, 100, 1).wert <= 100,
        WS.stufeNach({ wert: 0.1, unsicher: 8 }, t(0), 1, 0, 1).wert >= 0], [true, true]);
    gleich("Zusammenführen: mehr Runden gewinnt, auch mit kleinerem Wert",
        WS.stufeZusammen({ wert: 20, runden: 9, stand: 1 }, { wert: 80, runden: 3, stand: 9 }).wert, 20);
    gleich("… gleich viele: neuerer Stand", WS.stufeZusammen({ wert: 20, runden: 3, stand: 1 },
        { wert: 80, runden: 3, stand: 9 }).wert, 80);
    gleich("Fürs Konto nur die vier Felder der Regel", Object.keys(WS.stufeFuerKonto(gut)).sort(),
        ["runden", "stand", "unsicher", "wert"]);
}

/* 5. Neue Schwierigkeit */
{
    /* Probe: Spieler mit S = 50 lösen ein Wort mit D = 60 der Erwartung
       nach — die Summen daraus müssen D ≈ 60 ergeben. */
    const E = WS.erwartung(50, 60);
    const summe = { n: 400, st: 400 * 50 };
    /* Leistungen 1 (Klasse 1) und 0 (Klasse 0) so gemischt, dass der
       Mittelwert E ist. */
    summe.a1 = Math.round(400 * E);
    summe.a0 = 400 - summe.a1;
    const d = WS.ausSummen(summe);
    pruefe("Summen mit bekannter D ergeben D auf ±5", Math.abs(d.d - 60) <= 5, d.d);
    gleich("Ohne Daten: Startwert", WS.neuesD({ z: 33 }, null), 33);
    pruefe("Wenig Daten: Startwert überwiegt", Math.abs(WS.neuesD({ z: 20 }, { n: 5, st: 250, a1: 5 }) - 20)
        < Math.abs(WS.neuesD({ z: 20 }, { n: 5, st: 250, a1: 5 }) - WS.ausSummen({ n: 5, st: 250, a1: 5 }).d));
    gleich("Korrektur gewinnt", WS.neuesD({ z: 20, korrektur: 77 }, summe), 77);
    const daten = WS.appDaten({}, {}, loesungen, 5);
    pruefe("App-Daten ohne Summen: Form wie js/wortbewertung-daten.js, passt zur Liste",
        WS.schwierigkeitPasst(daten, loesungen) && daten.skalaAb.length === 9);
    gleich("… und gleiche Zahlen wie heute (Rückfall = heutige Bewertung)", loesungen.slice(0, 20).map((w) => {
        WORTBEWERTUNG._datenErsatz = daten;
        const neu = WORTBEWERTUNG.schwierigkeit(w);
        WORTBEWERTUNG._datenErsatz = null;
        return neu === WORTBEWERTUNG.schwierigkeit(w);
    }).every(Boolean), true);
    pruefe("Falsche Liste passt nicht (Rückfall auf die JS-Datei)", !WS.schwierigkeitPasst(daten, loesungen.slice(1)));
}

/* 6. Lexikon */
{
    const voll = require("../werkzeug/wortbewertung-voll.js");
    const exp = WS.lexikonExport(voll, { abend: { zahl: 12, ungeeignet: true } }, loesungen);
    gleich("Export: ein Eintrag je Lösungswort", exp.anzahl, loesungen.length);
    const e = exp.eintraege[WS.schluessel("abend")];
    gleich("Eintrag: w, z, s 1–3, k 1–10, Korrektur, ungeeignet, Teile", [e.w, typeof e.z, e.s >= 1 && e.s <= 3,
        e.k >= 1 && e.k <= 10, e.korrektur, e.ungeeignet, Object.keys(e.teile).length], ["abend", "number", true, true, 12, true, 7]);
    const geprueft = WS.lexikonPruefen(JSON.parse(JSON.stringify(exp)));
    gleich("Prüfen nimmt alles an", [geprueft.ok, Object.keys(geprueft.eintraege).length, geprueft.schlecht],
        [true, loesungen.length, 0]);
    const falsch = WS.lexikonPruefen({ eintraege: { abcdef12: { w: "abend", z: 3 }, zz: { w: "x", z: 1 } } });
    gleich("Falscher Schlüssel oder Unsinn fällt weg", [falsch.ok, falsch.schlecht], [false, 2]);
    gleich("Schritte zu je 150", WS.lexikonSchritte(geprueft.eintraege).length, Math.ceil(loesungen.length / 150));
    const alsVoll = WS.lexikonAlsVoll(geprueft.eintraege);
    gleich("Aus der Datenbank wieder in der Form der Werkzeug-Bewertung", alsVoll.woerter.abend.length, 8);
    pruefe("Die Werkzeug-Seite exportiert lexikon-export.json", /lexikon-export\.json/.test(lesen("werkzeug/woerter-werkzeug.js"))
        && /wortstatistik\.js/.test(lesen("werkzeug/woerter-werkzeug.html")));
}

/* 7. Aufräumen und Detail */
{
    const runden = { a: { z: 20250901 }, b: { z: 20251001 }, c: { z: 20260927 } };
    gleich("Aufräumen: nur älter als 12 Monate", WS.aufraeumen("u", runden, 20260928), { "runden/u/a": null });
    const d = WS.detail({ a: { r: 2, z: 20260928, e: { v: 3, g: 6, m: "t", h: 0, d: 90, f: "124" }, w: { g: 1, x: 0 } },
        b: { r: 1, z: 20260927, e: { v: 0, g: 6, m: "u", h: 1, d: 30, f: "0000" }, w: { g: 0, x: 0 } } }, { a: "abend" });
    gleich("Detail: Summen und Zeilen", [d.summen.woerter, d.summen.quote, d.summen.versuche, d.summen.hilfe,
        d.zeilen[0].wort], [2, 50, 3, 50, "abend"]);
}

/* 8. Abgleich (Gerät, Netz-Nachbau) */
(async () => {
    const speicher = speicherAttrappe();
    global.window = { localStorage: speicher };
    global.WORTSTATISTIK_ABGLEICH = require("../js/wortstatistik-abgleich.js");
    const A = global.WORTSTATISTIK_ABGLEICH;
    const geschrieben = [];
    let absage = 0;
    const intern = {
        async teilSchreiben(a) {
            if (absage > 0) {
                absage--;
                const f = new Error("x (HTTP 401)");
                f.status = 401;
                throw f;
            }
            geschrieben.push(a);
        },
        async teilLaden(p) {
            return p === "schwierigkeit" ? WS.appDaten({}, {}, loesungen, 9) : { r: 3, s: 30, z: 20260101, l: "w1",
                e: { c: "a3", v: 3, g: 6, m: "t", h: 0, d: 1, st: 30, z: 20260101, f: "1" }, w: { g: 2, x: 0, v: 5, h: 0, d: 2 } };
        }
    };
    const konten = { schritte: [], async teilSchreiben(a) { this.schritte.push(a); } };
    let p12 = false;
    let echt = true;
    global.KONTO = { istP12: () => p12 };
    A.einrichten(intern, konten, () => "uid-a", () => "id-a", () => echt);
    A.melden(runde({}), "2026-09-28", 10);
    await new Promise((r) => setTimeout(r, 5));
    gleich("Alte Regel: nichts gesendet, eine Runde wartet, Stufe auf dem Gerät", [geschrieben.length, A.warte().length,
        A.stufe().runden], [0, 1, 1]);
    p12 = true;
    gleich("§12: die Warteschlange geht hinaus", await A.senden(), 1);
    gleich("… ein Schritt mit Datensatz und Summen, Warteschlange leer", [Object.keys(geschrieben[0]).length, A.warte().length],
        [4, 0]);
    A.melden(runde({ loesung: "abend" }), "2026-09-29", 20);
    await new Promise((r) => setTimeout(r, 5));
    gleich("Zweite Runde desselben Wortes: r 2, l w…", [geschrieben[1]["runden/uid-a/" + WS.schluessel("abend")].r,
        geschrieben[1]["runden/uid-a/" + WS.schluessel("abend")].l], [2, "w2"]);
    gleich("Stufe geht unter §12 ans Konto (gezielter Pfad)", Object.keys(konten.schritte[0]), ["konten/uid-a/stufe/typoluck"]);
    absage = 1;
    A.melden(runde({}), "2026-09-30", 30);
    await new Promise((r) => setTimeout(r, 5));
    gleich("Abgelehnt (anderes Gerät schneller): eigener Datensatz gelesen, neu gerechnet (r 4)",
        geschrieben[2]["runden/uid-a/" + WS.schluessel("abend")].r, 4);
    echt = false;
    const vorher = geschrieben.length;
    A.melden(runde({ loesung: "tisch" }), "2026-09-30", 40);
    await new Promise((r) => setTimeout(r, 5));
    gleich("Gast: nichts in die Warteschlange, nichts gesendet", [geschrieben.length, A.warte().length], [vorher, 0]);
    echt = true;
    gleich("Schwierigkeit aus der Datenbank passt und gilt", await A.schwierigkeitHolen(), true);
    pruefe("… sie liegt auch auf dem Gerät", !!speicher.getItem(A.SCHWIERIGKEIT));
    WORTBEWERTUNG._datenErsatz = null;

    /* 9. Eingebunden */
    const index = lesen("index.html");
    pruefe("index.html lädt die Wortstatistik vor app.js", index.indexOf("js/wortstatistik.js") !== -1
        && index.indexOf("js/wortstatistik-abgleich.js") < index.indexOf("js/app.js"));
    pruefe("sw.js kennt beide Dateien", /wortstatistik\.js/.test(lesen("sw.js")) && /wortstatistik-abgleich\.js/.test(lesen("sw.js")));
    pruefe("Deploy-Sperre: lexikon-export.json nie hochladen", /"lexikon-export\.json"/.test(lesen("tools/Deploy-Typoluck.ps1")));
    const app = lesen("js/app.js");
    pruefe("APP: melden genau in fortschrittMelden, Nachziehen nur unter §12",
        /WORTSTATISTIK_ABGLEICH\.melden\(runde, datum, Date\.now\(\)\)/.test(app) && /_regel12Nachziehen\(ich\)/.test(app));
    const verw = lesen("js/bildschirm-verwaltung.js");
    pruefe("Verwaltung: Einspielen, Rechnen, Aufräumen, Detail erst beim Antippen",
        /lexikonEinspielen/.test(verw) && /schwierigkeitRechnen/.test(verw) && /statistikAufraeumen/.test(verw)
            && /_detailBauen\(zeile\)/.test(verw));
    fazit();
})();
