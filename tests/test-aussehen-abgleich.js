/*
 * test-aussehen-abgleich.js — das Aussehen am UPCrew-Konto
 * (js\aussehen-abgleich.js, seit 0.8.0; seit 0.15.13 je Spiel unter
 * `konten/<uid>/aussehenJe/typoluck`, Schreiben erst mit Schalter
 * `AUSSEHEN_JE_AM_KONTO`, das alte Feld `aussehen` nur einmal als Umzug).
 *
 * Geprüft gegen den ECHTEN Baustein js\upcrew-aussehen.js und die ECHTE
 * lokale Rückwand (SpeicherLokal) — dieselbe Mehrpfad-Wirkung wie die
 * Datenbank. Ins Netz geht nichts.
 */

const { pruefe, gleich, spaeter, fazit } = require("./pruefer.js");
const { geraetLeeren, aussehenLaden } = require("./umgebung.js");
const AUSSEHEN_ABGLEICH = require("../js/aussehen-abgleich.js");

const SCHLUESSEL = "typoluck.test-konten";

/* Ein frisches Gerät mit einer lokalen Konten-Rückwand. */
function aufbauen(uid, schalter) {
    geraetLeeren();
    const aussehen = aussehenLaden();
    aussehen.app = "typoluck";
    const speicher = new SpeicherLokal(SCHLUESSEL);
    AUSSEHEN_ABGLEICH.einrichten(speicher, () => uid);
    AUSSEHEN_ABGLEICH.AUSSEHEN_JE_AM_KONTO = schalter === true;
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
gleich("Der Schalter steht aus, bis §11c eingespielt ist",
    require("fs").readFileSync(require("path").join(__dirname, "..", "js", "aussehen-abgleich.js"), "utf8")
        .match(/AUSSEHEN_JE_AM_KONTO: (true|false),/)[1], "false");

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
    gleich("Am Konto steht das Aussehen des Geräts unter aussehenJe/typoluck",
        konto.aussehenJe.typoluck, aussehen.fuerKonto());
    gleich("Nur die sechs Felder", Object.keys(konto.aussehenJe.typoluck).sort(),
        ["darstellung", "farbwelt", "knoepfe", "leseschrift", "schrift", "stand"]);
    gleich("Blunderlucks Zweig, das alte Feld, Name und Freunde bleiben unberührt",
        [konto.aussehenJe.blunderluck, konto.aussehen, konto.name, konto.freunde],
        [{ farbwelt: "gold", stand: 7 }, { farbwelt: "feld", stand: 3 }, "Anna", { x: true }]);
    pruefe("Die Marke geaendertAm zieht mit (Regel 3 der Konten)",
        JSON.parse(geraet.getItem(SCHLUESSEL)).geaendertAm >= vorher);

    /* Holen: der eigene Zweig, neuer gewinnt. */
    ({ aussehen, speicher } = aufbauen("uid-3"));
    aussehen.setzen({ darstellung: "dunkel" });
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
