/*
 * test-aussehen-abgleich.js — das gemeinsame Aussehen am UPCrew-Konto
 * (js\aussehen-abgleich.js, seit 0.8.0).
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
function aufbauen(uid) {
    geraetLeeren();
    const aussehen = aussehenLaden();
    const speicher = new SpeicherLokal(SCHLUESSEL);
    AUSSEHEN_ABGLEICH.einrichten(speicher, () => uid);
    return { aussehen, speicher };
}

/* Eine Rückwand, die immer ablehnt — wie die Datenbank, solange die Regel
   für den Pfad fehlt (401). */
const ablehnend = {
    teilSchreiben: async () => { throw Object.assign(new Error("401"), { status: 401 }); },
    teilLaden: async () => { throw Object.assign(new Error("401"), { status: 401 }); }
};

gleich("Der Pfad am Konto", AUSSEHEN_ABGLEICH.pfad("abc"), "konten/abc/aussehen");

spaeter("Abgleich", (async () => {

    /* Senden: das Aussehen landet am eigenen Konto, die Marke zieht mit. */
    let { aussehen, speicher } = aufbauen("uid-1");
    aussehen.setzen({ darstellung: "hell", schrift: "S4" });
    const vorher = Date.now();
    gleich("Senden klappt", await AUSSEHEN_ABGLEICH.senden(), true);
    const ganz = JSON.parse(geraet.getItem(SCHLUESSEL));
    gleich("Am Konto steht das Aussehen des Geräts", ganz.konten["uid-1"].aussehen, aussehen.fuerKonto());
    gleich("Nur die sechs Felder", Object.keys(ganz.konten["uid-1"].aussehen).sort(),
        ["darstellung", "farbwelt", "knoepfe", "leseschrift", "schrift", "stand"]);
    pruefe("Die Marke geaendertAm zieht mit (Regel 3 der Konten)", ganz.geaendertAm >= vorher);

    /* Fremde Felder des Kontos bleiben (Regel 1). */
    ({ aussehen, speicher } = aufbauen("uid-2"));
    await speicher.teilSchreiben({ "konten/uid-2": { name: "Anna", freunde: { x: true } } });
    aussehen.setzen({ knoepfe: "K2" });
    await AUSSEHEN_ABGLEICH.senden();
    const konto = JSON.parse(geraet.getItem(SCHLUESSEL)).konten["uid-2"];
    gleich("Name und Freunde bleiben unberührt", [konto.name, konto.freunde], ["Anna", { x: true }]);

    /* Holen: neuer am Konto gewinnt. */
    ({ aussehen, speicher } = aufbauen("uid-3"));
    aussehen.setzen({ darstellung: "dunkel" });
    const neuer = Object.assign(aussehen.fuerKonto(), { darstellung: "hell", farbwelt: "gold", stand: aussehen.lesen().stand + 1000 });
    await speicher.teilSchreiben({ "konten/uid-3/aussehen": neuer });
    let gemeldet = null;
    aussehen.beobachten((a, quelle) => { gemeldet = quelle; });
    gleich("Neuer am Konto: wird übernommen", await AUSSEHEN_ABGLEICH.holen(), true);
    gleich("… und gilt auf dem Gerät", [aussehen.lesen().darstellung, aussehen.lesen().farbwelt], ["hell", "gold"]);
    gleich("… und wird als „konto“ gemeldet (kein Zurückschicken)", gemeldet, "konto");

    /* Holen: älter am Konto verliert. */
    ({ aussehen, speicher } = aufbauen("uid-4"));
    aussehen.setzen({ darstellung: "dunkel" });
    await speicher.teilSchreiben({ "konten/uid-4/aussehen": { darstellung: "hell", stand: 1 } });
    gleich("Älter am Konto: bleibt wie auf dem Gerät",
        [await AUSSEHEN_ABGLEICH.holen(), aussehen.lesen().darstellung], [false, "dunkel"]);

    /* Nichts am Konto. */
    ({ aussehen, speicher } = aufbauen("uid-5"));
    gleich("Nichts am Konto: nichts passiert", await AUSSEHEN_ABGLEICH.holen(), false);

    /* Gäste, Werkstatt, abgemeldet: der uidGeber liefert null. */
    ({ aussehen, speicher } = aufbauen(null));
    aussehen.setzen({ darstellung: "hell" });
    gleich("Ohne Konto: kein Senden", await AUSSEHEN_ABGLEICH.senden(), false);
    gleich("Ohne Konto: nichts geschrieben", geraet.getItem(SCHLUESSEL), null);
    gleich("Ohne Konto: kein Holen", await AUSSEHEN_ABGLEICH.holen(), false);

    /* Die Datenbank lehnt ab (Regel noch nicht eingespielt): still weiter. */
    aufbauen("uid-6");
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
    aufbauen("x");
    AUSSEHEN_ABGLEICH.einrichten(new SpeicherLokal(SCHLUESSEL), () => { throw new Error("kaputt"); });
    gleich("Werfender uidGeber: kein Senden", await AUSSEHEN_ABGLEICH.senden(), false);
})());

fazit();
