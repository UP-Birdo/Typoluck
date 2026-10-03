/*
 * test-aussehen-abgleich.js — das Aussehen am UPCrew-Konto
 * (js\aussehen-abgleich.js, seit 0.8.0; seit 0.15.13 je Spiel unter
 * `konten/<uid>/aussehenJe/typoluck`, Schreiben erst mit Schalter
 * `AUSSEHEN_JE_AM_KONTO`, das alte Feld `aussehen` nur einmal als Umzug).
 *
 * Geprüft gegen den ECHTEN Baustein js\upcrew-aussehen.js und die ECHTE
 * lokale Rückwand (SpeicherLokal) — dieselbe Mehrpfad-Wirkung wie die
 * Datenbank. Ins Netz geht nichts.
 *
 * Seit 0.27.0 (EINBAU-2026-09-29c): Farbwelt „grau" und Merker
 * `umstellung`. Seit 30.09.2026 ist die Regel eingespielt, der Schalter
 * steht an. Geprüft wird weiter beides — Schalter `REGEL_GRAU` aus:
 * beides geht nicht ans Konto; an: beides geht mit, und ein Konto-Objekt
 * ohne Merker bekommt einmal das eigene Aussehen.
 */

const { pruefe, gleich, spaeter, fazit } = require("./pruefer.js");
const { geraetLeeren, aussehenLaden } = require("./umgebung.js");
const AUSSEHEN_ABGLEICH = require("../js/aussehen-abgleich.js");
/* Seit 0.28.1 der Baustein js\speicher-konten.js; er erbt von
   SpeicherGemeinsam, das umgebung.js oben global bereitgestellt hat. */
const { SpeicherKonten } = require("../js/speicher-konten.js");

const SCHLUESSEL = "typoluck.test-konten";

/* Ein frisches Gerät mit einer lokalen Konten-Rückwand. */
function aufbauen(uid, schalter) {
    geraetLeeren();
    const aussehen = aussehenLaden();
    aussehen.app = "typoluck";
    const speicher = new SpeicherLokal(SCHLUESSEL);
    AUSSEHEN_ABGLEICH.einrichten(speicher, () => uid);
    AUSSEHEN_ABGLEICH.AUSSEHEN_JE_AM_KONTO = schalter === true;
    AUSSEHEN_ABGLEICH.REGEL_GRAU = null;
    return { aussehen, speicher };
}
const konten = () => (JSON.parse(geraet.getItem(SCHLUESSEL) || "null") || {}).konten || {};

/* Eine Rückwand, die immer ablehnt — wie die Datenbank, solange die Regel
   für den Pfad fehlt (401). */
const ablehnend = {
    teilSchreiben: async () => { throw Object.assign(new Error("401"), { status: 401 }); },
    teilLaden: async () => { throw Object.assign(new Error("401"), { status: 401 }); }
};

gleich("Die Pfade am Konto", [AUSSEHEN_ABGLEICH.pfad("abc"), AUSSEHEN_ABGLEICH.pfadJe("abc")],
    ["konten/abc/aussehen", "konten/abc/aussehenJe/typoluck"]);
gleich("Der Schalter steht an (Regel §11c am 28.09.2026 eingespielt, seit 0.18.4)",
    require("fs").readFileSync(require("path").join(__dirname, "..", "js", "aussehen-abgleich.js"), "utf8")
        .match(/AUSSEHEN_JE_AM_KONTO: (true|false),/)[1], "true");
gleich("Regel mit Grau eingespielt (30.09.2026): SpeicherKonten.REGEL_GRAU_EINGESPIELT an, kein eigener Schalter",
    [SpeicherKonten.REGEL_GRAU_EINGESPIELT, require("fs").readFileSync(require("path").join(__dirname, "..", "js",
        "aussehen-abgleich.js"), "utf8").match(/REGEL_GRAU: (\w+),/)[1]], [true, "null"]);

/* Regel §11c (Apps\Blunderluck\SICHERHEIT.md) als Prüffunktion für
   aussehenJe/<app>: Verstösse als Liste (leer = besteht). */
function regel11c(je, mitGrau) {
    const fehler = [];
    for (const [app, a] of Object.entries(je || {})) {
        if (!/^(blunderluck|typoluck)$/.test(app)) {
            fehler.push("app " + app);
        }
        for (const [feld, wert] of Object.entries(a || {})) {
            const ok = {
                darstellung: (w) => typeof w === "string" && /^(geraet|hell|dunkel)$/.test(w),
                farbwelt: (w) => typeof w === "string" && (mitGrau
                    ? /^(grau|werkstatt|studio|feld|tiefsee|gold)$/ : /^(werkstatt|studio|feld|tiefsee|gold)$/).test(w),
                umstellung: mitGrau ? (w) => typeof w === "number" && w >= 0 && w <= 9 : null,
                schrift: (w) => typeof w === "string" && /^S[1-6]$/.test(w),
                knoepfe: (w) => typeof w === "string" && /^K[1-6]$/.test(w),
                leseschrift: (w) => typeof w === "boolean",
                stand: (w) => typeof w === "number" && w >= 0
            }[feld];
            if (!ok || !ok(wert)) {
                fehler.push(app + "/" + feld + ": " + JSON.stringify(wert));
            }
        }
    }
    return fehler;
}

spaeter("Abgleich", (async () => {

    /* Schalter aus: nichts ans Konto — das Aussehen bleibt auf dem Gerät. */
    let { aussehen, speicher } = aufbauen("uid-1", false);
    aussehen.setzen({ darstellung: "hell", schrift: "S4" });
    gleich("Schalter aus: kein Senden", await AUSSEHEN_ABGLEICH.senden(), false);
    gleich("Schalter aus: nichts geschrieben", geraet.getItem(SCHLUESSEL), null);

    /* Schalter an: nur der eigene Zweig, das alte Feld nicht. */
    ({ aussehen, speicher } = aufbauen("uid-1", true));
    await speicher.teilSchreiben({ "konten/uid-1": { name: "Anna", freunde: { x: true },
        aussehen: { farbwelt: "feld", stand: 3 }, aussehenJe: { blunderluck: { farbwelt: "gold", stand: 7 } } } });
    aussehen.setzen({ darstellung: "hell", schrift: "S4" });
    const vorher = Date.now();
    gleich("Schalter an: Senden klappt", await AUSSEHEN_ABGLEICH.senden(), true);
    const konto = konten()["uid-1"];
    const ohneGrau = Object.assign({}, aussehen.fuerKonto());
    delete ohneGrau.farbwelt;
    delete ohneGrau.umstellung;
    gleich("Gerät: Grau mit Merker", [aussehen.lesen().farbwelt, aussehen.lesen().umstellung], ["grau", 1]);
    gleich("Ohne Regel mit Grau: am Konto das Aussehen ohne „grau“ und ohne Merker",
        konto.aussehenJe.typoluck, ohneGrau);
    gleich("§11c (heutige Regel): aussehenJe besteht", regel11c(konto.aussehenJe), []);
    /* Seit 0.26.0 ohne `leseschrift` (die Regel erlaubt es, verlangt es nicht). */
    gleich("§11c: nur die vier Felder (fehlendes farbwelt = Grau)", Object.keys(konto.aussehenJe.typoluck).sort(),
        ["darstellung", "knoepfe", "schrift", "stand"]);
    pruefe("§11c: die Prüffunktion lehnt Fremdes ab",
        regel11c({ typoluck: { farbwelt: "pink", extra: 1 }, trainer: {} }).length === 3);
    pruefe("§11c heute: „grau“ und `umstellung` würden abgelehnt",
        regel11c({ typoluck: { farbwelt: "grau", umstellung: 1 } }).length === 2
            && regel11c({ typoluck: { farbwelt: "grau", umstellung: 1 } }, true).length === 0);
    aussehen.setzen({ farbwelt: "studio" });
    await AUSSEHEN_ABGLEICH.senden();
    gleich("Ohne Regel mit Grau: andere Farbwelt geht mit, Merker nicht",
        [konten()["uid-1"].aussehenJe.typoluck.farbwelt, "umstellung" in konten()["uid-1"].aussehenJe.typoluck],
        ["studio", false]);
    gleich("Blunderlucks Zweig, das alte Feld, Name und Freunde bleiben unberührt",
        [konten()["uid-1"].aussehenJe.blunderluck, konto.aussehen, konto.name, konto.freunde],
        [{ farbwelt: "gold", stand: 7 }, { farbwelt: "feld", stand: 3 }, "Anna", { x: true }]);
    pruefe("Die Marke geaendertAm zieht mit (Regel 3 der Konten)",
        JSON.parse(geraet.getItem(SCHLUESSEL)).geaendertAm >= vorher);

    /* Mit Regel mit Grau: beides geht mit, genau die sechs Felder. */
    ({ aussehen, speicher } = aufbauen("uid-8", true));
    AUSSEHEN_ABGLEICH.REGEL_GRAU = true;
    aussehen.setzen({ darstellung: "hell" });
    await AUSSEHEN_ABGLEICH.senden();
    gleich("Mit Regel: am Konto genau fuerKonto() (grau, Merker)",
        konten()["uid-8"].aussehenJe.typoluck, aussehen.fuerKonto());
    gleich("Mit Regel: besteht die neue §11c", regel11c(konten()["uid-8"].aussehenJe, true), []);
    gleich("Mit Regel: genau die sechs Felder", Object.keys(konten()["uid-8"].aussehenJe.typoluck).sort(),
        ["darstellung", "farbwelt", "knoepfe", "schrift", "stand", "umstellung"]);
    gleich("SpeicherKonten mit Regel lässt beides durch (ganzer Eintrag)",
        SpeicherKonten.aussehenFuerRegel({ farbwelt: "grau", umstellung: 1, stand: 2 }, true),
        { farbwelt: "grau", umstellung: 1, stand: 2 });
    gleich("SpeicherKonten ohne Regel: beides fällt weg",
        SpeicherKonten.aussehenFuerRegel({ farbwelt: "grau", umstellung: 1, stand: 2 }, false), { stand: 2 });
    gleich("SpeicherKonten ohne Test-Schalter (heute, Regel eingespielt): beides geht mit",
        SpeicherKonten.aussehenFuerRegel({ farbwelt: "grau", umstellung: 1, stand: 2 }), { farbwelt: "grau", umstellung: 1, stand: 2 });
    gleich("SpeicherKonten: Merker nur ganzzahlig 0–9",
        [SpeicherKonten.aussehenFuerRegel({ umstellung: 10 }, true), SpeicherKonten.aussehenFuerRegel({ umstellung: 1.5 }, true),
            SpeicherKonten.aussehenFuerRegel({ umstellung: "1" }, true)], [null, null, null]);

    /* Konto von vorher (ohne Merker, ältere Wahl): Gerät bleibt, Konto bekommt EINMAL das eigene Aussehen. */
    ({ aussehen, speicher } = aufbauen("uid-9", true));
    AUSSEHEN_ABGLEICH.REGEL_GRAU = true;
    aussehen.setzen({ darstellung: "dunkel" });
    await speicher.teilSchreiben({ "konten/uid-9/aussehenJe/typoluck": { farbwelt: "gold", darstellung: "hell", stand: 1 } });
    gleich("Konto ohne Merker, älter: nichts übernommen", await AUSSEHEN_ABGLEICH.holen(), false);
    gleich("… aber das Konto trägt jetzt Grau und den Merker",
        [konten()["uid-9"].aussehenJe.typoluck.farbwelt, konten()["uid-9"].aussehenJe.typoluck.umstellung,
            konten()["uid-9"].aussehenJe.typoluck.darstellung], ["grau", 1, "dunkel"]);
    const markeVorher = JSON.parse(geraet.getItem(SCHLUESSEL)).geaendertAm;
    await new Promise((fertig) => setTimeout(fertig, 5));
    await AUSSEHEN_ABGLEICH.holen();
    gleich("… und nur einmal (mit Merker schreibt holen() nicht mehr)",
        JSON.parse(geraet.getItem(SCHLUESSEL)).geaendertAm, markeVorher);

    /* Konto von vorher, NEUER als das Gerät: wird übernommen, aber auf Grau gestellt. */
    ({ aussehen, speicher } = aufbauen("uid-10", true));
    AUSSEHEN_ABGLEICH.REGEL_GRAU = true;
    aussehen.setzen({ darstellung: "dunkel" });
    await speicher.teilSchreiben({ "konten/uid-10/aussehenJe/typoluck":
        { farbwelt: "gold", darstellung: "hell", stand: aussehen.lesen().stand + 1000 } });
    gleich("Konto ohne Merker, neuer: übernommen, Farbwelt Grau",
        [await AUSSEHEN_ABGLEICH.holen(), aussehen.lesen().darstellung, aussehen.lesen().farbwelt], [true, "hell", "grau"]);
    gleich("… Konto nachgezogen", konten()["uid-10"].aussehenJe.typoluck.umstellung, 1);

    /* Ohne Regel mit Grau: holen() schreibt nie. */
    ({ aussehen, speicher } = aufbauen("uid-11", true));
    await speicher.teilSchreiben({ "konten/uid-11/aussehenJe/typoluck": { farbwelt: "gold", stand: 1 } });
    await AUSSEHEN_ABGLEICH.holen();
    gleich("Ohne Regel mit Grau: holen() schreibt nichts nach",
        konten()["uid-11"].aussehenJe.typoluck, { farbwelt: "gold", stand: 1 });

    /* Holen: der eigene Zweig, neuer gewinnt. */
    ({ aussehen, speicher } = aufbauen("uid-3"));
    aussehen.setzen({ darstellung: "dunkel" });
    /* Mit Merker (eine Wahl NACH der Umstellung). */
    const neuer = Object.assign(aussehen.fuerKonto(), { darstellung: "hell", farbwelt: "gold", stand: aussehen.lesen().stand + 1000 });
    await speicher.teilSchreiben({ "konten/uid-3/aussehenJe/typoluck": neuer,
        "konten/uid-3/aussehenJe/blunderluck": Object.assign({}, neuer, { farbwelt: "studio", stand: neuer.stand + 5 }) });
    let gemeldet = null;
    aussehen.beobachten((a, quelle) => { gemeldet = quelle; });
    gleich("Eigener Zweig neuer: wird übernommen", await AUSSEHEN_ABGLEICH.holen(), true);
    gleich("… und gilt auf dem Gerät (nicht Blunderlucks Wahl)",
        [aussehen.lesen().darstellung, aussehen.lesen().farbwelt], ["hell", "gold"]);
    gleich("… und wird als „konto“ gemeldet (kein Zurückschicken)", gemeldet, "konto");

    /* Holen: älter verliert. */
    ({ aussehen, speicher } = aufbauen("uid-4"));
    aussehen.setzen({ darstellung: "dunkel" });
    await speicher.teilSchreiben({ "konten/uid-4/aussehenJe/typoluck": { darstellung: "hell", stand: 1 } });
    gleich("Eigener Zweig älter: bleibt wie auf dem Gerät",
        [await AUSSEHEN_ABGLEICH.holen(), aussehen.lesen().darstellung], [false, "dunkel"]);

    /* Umzug: kein eigener Zweig, das alte gemeinsame Feld EINMAL. */
    ({ aussehen, speicher } = aufbauen("uid-7"));
    aussehen.setzen({ darstellung: "dunkel" });
    await speicher.teilSchreiben({ "konten/uid-7/aussehen":
        Object.assign(aussehen.fuerKonto(), { darstellung: "hell", stand: aussehen.lesen().stand + 1000 }) });
    gleich("Umzug: das alte Feld wird einmal übernommen", await AUSSEHEN_ABGLEICH.holen(), true);
    gleich("… Merker gesetzt", geraet.getItem("typoluck.aussehen-umzug"), "1");
    await speicher.teilSchreiben({ "konten/uid-7/aussehen":
        Object.assign(aussehen.fuerKonto(), { darstellung: "dunkel", stand: aussehen.lesen().stand + 5000 }) });
    gleich("… danach nie wieder (sonst zöge ein anderes Spiel über das Konto mit)",
        [await AUSSEHEN_ABGLEICH.holen(), aussehen.lesen().darstellung], [false, "hell"]);

    /* Nichts am Konto. */
    aufbauen("uid-5");
    gleich("Nichts am Konto: nichts passiert", await AUSSEHEN_ABGLEICH.holen(), false);

    /* Gäste, Werkstatt, abgemeldet: der uidGeber liefert null. */
    ({ aussehen } = aufbauen(null, true));
    aussehen.setzen({ darstellung: "hell" });
    gleich("Ohne Konto: kein Senden", await AUSSEHEN_ABGLEICH.senden(), false);
    gleich("Ohne Konto: nichts geschrieben", geraet.getItem(SCHLUESSEL), null);
    gleich("Ohne Konto: kein Holen", await AUSSEHEN_ABGLEICH.holen(), false);

    /* Die Datenbank lehnt ab: still weiter. */
    aufbauen("uid-6", true);
    AUSSEHEN_ABGLEICH.einrichten(ablehnend, () => "uid-6");
    let geworfen = false;
    try {
        gleich("Abgelehnt: Senden meldet false", await AUSSEHEN_ABGLEICH.senden(), false);
        gleich("Abgelehnt: Holen meldet false", await AUSSEHEN_ABGLEICH.holen(), false);
    } catch (fehler) {
        geworfen = true;
    }
    pruefe("Abgelehnt: keine Ausnahme nach aussen", !geworfen);

    /* Ein uidGeber, der selbst wirft, legt nichts lahm. */
    aufbauen("x", true);
    AUSSEHEN_ABGLEICH.einrichten(new SpeicherLokal(SCHLUESSEL), () => { throw new Error("kaputt"); });
    gleich("Werfender uidGeber: kein Senden", await AUSSEHEN_ABGLEICH.senden(), false);
    AUSSEHEN_ABGLEICH.AUSSEHEN_JE_AM_KONTO = false;
})());

fazit();
