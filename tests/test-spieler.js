/*
 * test-spieler.js — die GETEILTE Spielerliste (js\spieler.js).
 *
 * Die wichtigsten Prüfungen stehen oben: dass Typoluck nichts von
 * Blunderluck kaputt macht (fremde Felder, Marke, Zusammenführen).
 */

const { pruefe, gleich, fazit } = require("./pruefer.js");
require("./umgebung.js");

/* Ein Stand, wie Blunderluck ihn schreiben könnte — mit Feldern, die
   Typoluck nicht kennt. */
const vonBlunderluck = {
    datenVersion: 1,
    geaendertAm: 5000,
    zukunftOben: { etwas: true },
    spieler: [
        { id: "a", name: "Anna", pinPruefwert: "p1", pinSalz: "s1", freunde: ["b"],
          abgelehnt: [], abzeichen: ["sieger"], zukunftsFeld: 42 },
        { id: "b", name: "Ben", pinPruefwert: "p2", pinSalz: "s2", freunde: ["a"],
          abgelehnt: [], abzeichen: [] }
    ]
};

/* ------------------------------------------------------------------ *
 * Regel 1: Fremde Felder wandern unverändert durch
 * ------------------------------------------------------------------ */

const norm = SPIELER.normalisieren(vonBlunderluck);
gleich("Unbekanntes Feld im Eintrag bleibt", norm.spieler[0].zukunftsFeld, 42);
gleich("Blunderluck-Feld abzeichen bleibt", norm.spieler[0].abzeichen, ["sieger"]);
gleich("Unbekanntes Feld oben bleibt", norm.zukunftOben, { etwas: true });
pruefe("Normalisieren ändert das Original nicht",
    vonBlunderluck.spieler[0].zukunftsFeld === 42 && norm.spieler[0] !== vonBlunderluck.spieler[0]);

const nachAenderung = SPIELER.freundHinzufuegen(vonBlunderluck, "b", "c", 6000);
gleich("Nach einer Änderung sind fremde Felder noch da", nachAenderung.spieler[0].zukunftsFeld, 42);

const umbenannt = SPIELER.nameSetzen(vonBlunderluck, "a", "Anne", 6000);
gleich("Namensänderung behält fremde Felder", umbenannt.spieler[0].zukunftsFeld, 42);
gleich("Namensänderung wirkt", umbenannt.spieler[0].name, "Anne");

/* Firebase liefert Listen mit Lücken als Objekt */
const alsObjekt = SPIELER.normalisieren({ spieler: { "0": { id: "x", name: "X" }, "2": { id: "y", name: "Y" } } });
gleich("Liste als Objekt wird zur Liste", alsObjekt.spieler.map((s) => s.id), ["x", "y"]);
gleich("Fehlende Listen werden angelegt", alsObjekt.spieler[0].freunde, []);
gleich("Fehlende Texte werden leer", alsObjekt.spieler[0].pinSalz, "");

gleich("Nichts ergibt einen leeren Stand", SPIELER.normalisieren(null).spieler, []);
const mitMuell = SPIELER.normalisieren({ spieler: [null, 5, { id: "z", freunde: ["a", 3, ""] }] });
gleich("Müll-Einträge fallen weg", mitMuell.spieler.length, 1);
gleich("Müll in Listen fällt weg", mitMuell.spieler[0].freunde, ["a"]);

/* ------------------------------------------------------------------ *
 * Regel 2: Ein neuer Eintrag sieht aus wie einer von Blunderluck
 * ------------------------------------------------------------------ */

gleich("Neuer Spieler hat genau die Blunderluck-Felder",
    Object.keys(SPIELER.neuerSpieler("Neu", "n")).sort(),
    ["abgelehnt", "abzeichen", "freunde", "id", "name", "pinPruefwert", "pinSalz"]);

/* ------------------------------------------------------------------ *
 * Regel 3: Die Marke geht bei jeder Änderung hoch
 * ------------------------------------------------------------------ */

pruefe("Änderung setzt die Marke", SPIELER.nameSetzen(vonBlunderluck, "a", "A", 9000).geaendertAm === 9000);
pruefe("Marke geht nie zurück (Uhr nachgehend)",
    SPIELER.nameSetzen(vonBlunderluck, "a", "A", 10).geaendertAm > 5000);

/* ------------------------------------------------------------------ *
 * Zusammenführen
 * ------------------------------------------------------------------ */

const serverNeu = JSON.parse(JSON.stringify(vonBlunderluck));
serverNeu.spieler.push({ id: "c", name: "Clara", pinPruefwert: "p3", pinSalz: "s3", freunde: [], abgelehnt: [] });
serverNeu.geaendertAm = 8000;

const meinAlterStand = SPIELER.nameSetzen(vonBlunderluck, "b", "Benny", 7000);
const zusammen = SPIELER.zusammenfuehren(serverNeu, meinAlterStand, "b");
gleich("Zusammenführen behält Neue vom Server", zusammen.spieler.map((s) => s.id), ["a", "b", "c"]);
gleich("… und setzt den eigenen Eintrag", zusammen.spieler[1].name, "Benny");
gleich("… und lässt fremde Einträge wie am Server", zusammen.spieler[0].zukunftsFeld, 42);
pruefe("Marke nach dem Zusammenführen liegt ÜBER der am Server", zusammen.geaendertAm > 8000,
    "ist " + zusammen.geaendertAm);
gleich("Rahmen kommt vom Server", zusammen.zukunftOben, { etwas: true });

const frischAngemeldet = SPIELER.spielerHinzufuegen(SPIELER.leereDaten(), "Dora", "d", 100);
const mitNeuem = SPIELER.zusammenfuehren(serverNeu, frischAngemeldet, "d");
gleich("Ein neues Konto wird angehängt", mitNeuem.spieler.map((s) => s.id), ["a", "b", "c", "d"]);

/* ------------------------------------------------------------------ *
 * Suchen, Passwort, Name
 * ------------------------------------------------------------------ */

gleich("Suche nach Name ohne Gross-/Kleinschreibung", SPIELER.spielerNachName(vonBlunderluck, " anna ").id, "a");
gleich("Unbekannter Name", SPIELER.spielerNachName(vonBlunderluck, "Zora"), null);
pruefe("Passwort hinterlegt", SPIELER.hatPasswort(norm.spieler[0]));
gleich("Passwort zu kurz", SPIELER.passwortPruefen("abc") !== "", true);
gleich("Passwort zu lang", SPIELER.passwortPruefen("abcdefghi") !== "", true);
gleich("Passwort mit Leerzeichen", SPIELER.passwortPruefen("ab cd") !== "", true);
gleich("Passwort in Ordnung", SPIELER.passwortPruefen("Ab3!"), "");
gleich("Name schon vergeben", SPIELER.namePruefen(vonBlunderluck, "ANNA", "b"), "Dieser Name ist schon vergeben.");
gleich("Eigener Name ist frei", SPIELER.namePruefen(vonBlunderluck, "Anna", "a"), "");
pruefe("Leerer Name geht nicht", SPIELER.namePruefen(vonBlunderluck, "  ", null) !== "");

/* ------------------------------------------------------------------ *
 * Freundschaft — dieselben vier Lagen wie in Blunderluck
 * ------------------------------------------------------------------ */

gleich("Beide führen einander = Freunde", SPIELER.freundschaft(vonBlunderluck, "a", "b"), "freunde");
let stand = SPIELER.normalisieren(serverNeu);
stand = SPIELER.freundHinzufuegen(stand, "a", "c", 1);
gleich("Ich führe ihn = gesendet", SPIELER.freundschaft(stand, "a", "c"), "gesendet");
gleich("Er führt mich = offen", SPIELER.freundschaft(stand, "c", "a"), "offen");
stand = SPIELER.freundAblehnen(stand, "c", "a", 2);
gleich("Abgelehnt = keine (für den Ablehnenden)", SPIELER.freundschaft(stand, "c", "a"), "keine");
gleich("Abgelehnt sieht für den Anfragenden aus wie gesendet", SPIELER.freundschaft(stand, "a", "c"), "gesendet");
stand = SPIELER.freundStreichen(stand, "a", "c", 3);
gleich("Zurückgezogen = keine", SPIELER.freundschaft(stand, "a", "c"), "keine");
stand = SPIELER.freundHinzufuegen(stand, "c", "a", 4);
gleich("Anfrage hebt eigene Ablehnung auf", SPIELER.spielerFinden(stand, "c").abgelehnt, []);
gleich("Mit sich selbst nie befreundet", SPIELER.freundschaft(stand, "a", "a"), "keine");
const sicht = SPIELER.freundeVon(vonBlunderluck, "a");
gleich("Freundes-Sicht", sicht.freunde.map((s) => s.id), ["b"]);

/* Nur der eigene Eintrag ändert sich */
const vorher = JSON.stringify(SPIELER.spielerFinden(serverNeu, "c"));
const nachher = SPIELER.freundHinzufuegen(serverNeu, "a", "c", 1);
gleich("Anfrage ändert den fremden Eintrag nicht", JSON.stringify(SPIELER.spielerFinden(nachher, "c")), vorher);

fazit();
