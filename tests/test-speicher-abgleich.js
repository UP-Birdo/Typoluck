/*
 * test-speicher-abgleich.js — die lokale Rückwand (js\speicher.js) und der
 * Abgleich der Spielerliste (js\abgleich.js).
 *
 * Die gemeinsame Rückwand (Firebase) wird hier NICHT angesprochen —
 * Regressionstests gehen nie ins Netz (Haus-Regel). Stattdessen spielt eine
 * Attrappe den Server, mit derselben Schnittstelle.
 */

const { gleich, pruefe, spaeter, fazit } = require("./pruefer.js");
const { geraetLeeren } = require("./umgebung.js");

/* ------------------------------------------------------------------ *
 * SpeicherLokal: Teile lesen und schreiben wie die Datenbank
 * ------------------------------------------------------------------ */

spaeter("SpeicherLokal", (async () => {
    geraetLeeren();
    const lokal = new SpeicherLokal("test.spiel");
    gleich("Leer: nichts da", await lokal.laden(), null);
    gleich("Leer: keine Marke", await lokal.marke(), null);

    await lokal.teilSchreiben({ "wordle/tage/2026-09-24/a": { versuche: 3 }, "geaendertAm": 5 });
    gleich("Teil lesen", await lokal.teilLaden("wordle/tage/2026-09-24"), { a: { versuche: 3 } });
    gleich("Marke lesen", await lokal.marke(), 5);
    gleich("Nicht vorhandener Teil = null", await lokal.teilLaden("wordle/verlauf/zz"), null);

    await lokal.teilSchreiben({ "wordle/tage/2026-09-24/b": { versuche: 2 } });
    gleich("Zweiter Schreibvorgang behält den ersten",
        Object.keys(await lokal.teilLaden("wordle/tage/2026-09-24")), ["a", "b"]);

    await lokal.teilSchreiben({ "wordle/tage/2026-09-24/a": null });
    gleich("null löscht", Object.keys(await lokal.teilLaden("wordle/tage/2026-09-24")), ["b"]);
})());

gleich("Ohne Adresse fällt gemeinsam auf lokal zurück",
    speicherErzeugen({ modus: "gemeinsam", firebaseBasis: "" }, "spieler", "k").speicher.art, "lokal");
pruefe("… und sagt es", speicherErzeugen({ modus: "gemeinsam", firebaseBasis: "" }, "spieler", "k").hinweis !== "");
gleich("Werkstatt erzwingt lokal",
    speicherErzeugen({ modus: "gemeinsam", firebaseBasis: "https://x" }, "spieler", "k", "lokal").speicher.art, "lokal");
gleich("Adresse eines Teils",
    new SpeicherGemeinsam("https://db.example/", "/typoluck/")._adresse("wordle/tage", ""),
    "https://db.example/typoluck/wordle/tage.json");

/* ------------------------------------------------------------------ *
 * Abgleich: schreibt nie blind in die geteilte Liste
 * ------------------------------------------------------------------ */

function serverAttrappe(stand, erreichbar) {
    return {
        art: "gemeinsam",
        beschreibung: "Attrappe",
        stand: stand,
        erreichbar: erreichbar,
        geschrieben: [],
        async laden() {
            if (!this.erreichbar) {
                throw new Error("kein Netz");
            }
            return JSON.parse(JSON.stringify(this.stand));
        },
        async speichern(daten) {
            if (!this.erreichbar) {
                throw new Error("kein Netz");
            }
            this.geschrieben.push(daten);
            this.stand = JSON.parse(JSON.stringify(daten));
        },
        async marke() {
            return this.stand.geaendertAm;
        }
    };
}

const einstellung = { abfrageIntervallMs: 999999, schreibVerzoegerungMs: 1 };

spaeter("Abgleich", (async () => {
    /* Server hat Anna (mit Blunderluck-Feld). Mein Gerät kennt nur Anna von
       früher; inzwischen hat sich Ben angemeldet. Ich lege Clara an. */
    const server = serverAttrappe({ datenVersion: 1, geaendertAm: 100, spieler: [
        { id: "a", name: "Anna", abzeichen: ["x"], zukunft: 1 }] }, true);
    const abgleich = new Abgleich(server, einstellung, {});
    await abgleich.starten();
    pruefe("Nach dem Start: geladen", abgleich.geladen);

    server.stand.spieler.push({ id: "b", name: "Ben" });
    server.stand.geaendertAm = 200;

    abgleich.eigeneIdSetzen("c");
    abgleich.aendern(SPIELER.spielerHinzufuegen(abgleich.daten, "Clara", "c", 150));
    await abgleich.sofortSchreiben();

    gleich("Ben bleibt erhalten, Clara kommt dazu", server.stand.spieler.map((s) => s.id), ["a", "b", "c"]);
    gleich("Annas Blunderluck-Felder bleiben", [server.stand.spieler[0].abzeichen, server.stand.spieler[0].zukunft], [["x"], 1]);
    pruefe("Marke über der alten am Server", server.stand.geaendertAm > 200, "ist " + server.stand.geaendertAm);

    /* Ohne Netz: nicht blind schreiben, Änderung bleibt offen */
    server.erreichbar = false;
    const vorher = server.geschrieben.length;
    abgleich.aendern(SPIELER.nameSetzen(abgleich.daten, "c", "Clarissa", 300));
    await abgleich.sofortSchreiben();
    gleich("Ohne Netz wird nichts geschrieben", server.geschrieben.length, vorher);
    pruefe("… und die Änderung bleibt offen", abgleich.aenderungOffen);
    clearTimeout(abgleich.schreibZeitgeber);
    abgleich.schreibZeitgeber = null;

    server.erreichbar = true;
    await abgleich.sofortSchreiben();
    gleich("Mit Netz wird nachgeholt", server.stand.spieler[2].name, "Clarissa");

    /* Abfrage: gleiche Marke = nichts holen */
    let geholt = 0;
    const altLaden = server.laden.bind(server);
    server.laden = async () => { geholt++; return altLaden(); };
    await abgleich.fremdenStandHolen();
    gleich("Gleiche Marke: kein Laden", geholt, 0);
    server.stand.geaendertAm += 5;
    await abgleich.fremdenStandHolen();
    gleich("Neue Marke: einmal laden", geholt, 1);

    /* Seit 0.31.0 (Befund der Nacht 04.10.2026, Tabelle 1 Nr. 1): Der Start
       merkt die Marke des geladenen Stands — bis 0.30.0 lud die erste
       Abfrage nach fünf Sekunden bei JEDEM Start ein zweites Mal alles. */
    const frisch = serverAttrappe({ datenVersion: 1, geaendertAm: 500, spieler: [{ id: "a", name: "Anna" }] }, true);
    let ladungen = 0;
    const ladenFrisch = frisch.laden.bind(frisch);
    frisch.laden = async () => { ladungen++; return ladenFrisch(); };
    const zweiter = new Abgleich(frisch, einstellung, {});
    await zweiter.starten();
    gleich("Start: einmal geladen, die Marke dieses Stands gilt als gesehen", [ladungen, zweiter.markeGesehen], [1, 500]);
    await zweiter.fremdenStandHolen();
    gleich("Erste Abfrage nach dem Start: gleiche Marke, kein zweites volles Laden", ladungen, 1);
    frisch.stand.geaendertAm = 600;
    await zweiter.fremdenStandHolen();
    gleich("Bewegt sich die Marke danach, wird geladen", [ladungen, zweiter.markeGesehen], [2, 600]);
    const ohneNetz = new Abgleich(serverAttrappe({ geaendertAm: 9, spieler: [] }, false), einstellung, {});
    await ohneNetz.starten();
    gleich("Start ohne Netz: keine Marke gesehen (die nächste Abfrage lädt)", ohneNetz.markeGesehen, null);

    /* Nr. 3: nie zwei Abfragen zugleich. */
    let markenRufe = 0;
    let weiter = null;
    frisch.marke = () => {
        markenRufe++;
        return new Promise((fertig) => { weiter = () => fertig(frisch.stand.geaendertAm); });
    };
    const erste = zweiter.fremdenStandHolen();
    await zweiter.fremdenStandHolen();
    gleich("Zwei Abfragen zugleich: die zweite kehrt sofort um, die Marke wird einmal gefragt",
        [markenRufe, zweiter.holtGerade], [1, true]);
    weiter();
    await erste;
    gleich("Ist die erste fertig, ist der Merker gelöst", zweiter.holtGerade, false);
    frisch.marke = async () => { throw new Error("kaputt"); };
    try {
        await zweiter.fremdenStandHolen();
    } catch (fehler) {
        /* wie bisher nach aussen — hier zählt nur der Merker */
    }
    gleich("Auch nach einem Fehler ist der Merker gelöst", zweiter.holtGerade, false);
})());

/* Nr. 2: Die Nachfrage nach der Marke darf im Mobilfunk länger dauern — aber
   kürzer als der Takt der Abfrage, sonst stapelten sie sich. */
pruefe("Zeitlimit der Marke 3–4 s und unter dem Abfrage-Takt",
    SpeicherGemeinsam.ZEITLIMIT_MARKE_MS >= 3000 && SpeicherGemeinsam.ZEITLIMIT_MARKE_MS <= 4000
        && SpeicherGemeinsam.ZEITLIMIT_MARKE_MS < KONFIG.speicher.abfrageIntervallMs,
    String(SpeicherGemeinsam.ZEITLIMIT_MARKE_MS));

fazit();
