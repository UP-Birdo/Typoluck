/*
 * test-wordle.js — die Spielregeln (js\wordle.js).
 */

const { pruefe, gleich, fazit } = require("./pruefer.js");
require("./umgebung.js");

const R = WORDLE.RICHTIG;
const V = WORDLE.VORHANDEN;
const F = WORDLE.FALSCH;

/* ------------------------------------------------------------------ *
 * Bewerten — vor allem doppelte Buchstaben
 * ------------------------------------------------------------------ */

gleich("Alles richtig", WORDLE.bewerten("apfel", "apfel"), [R, R, R, R, R]);
gleich("Nichts davon", WORDLE.bewerten("humor", "apfel"), [F, F, F, F, F]);
gleich("Vorhanden an anderer Stelle", WORDLE.bewerten("leben", "nebel"), [V, R, R, R, V]);

/* Die Lösung hat nur EIN f: Das zweite f ist grau. */
gleich("Doppelter Buchstabe geraten, einfach in der Lösung",
    WORDLE.bewerten("affen", "apfel"), [R, F, R, R, F]);

/* Grün hat Vorrang: „liebe" hat zwei e, beide werden von grünen e
   verbraucht — das erste e von „ebene" bleibt deshalb grau. */
gleich("Grün verbraucht vor Gelb", WORDLE.bewerten("ebene", "liebe"), [F, V, R, F, R]);
gleich("Zwei e in der Lösung: eins grün, eins gelb", WORDLE.bewerten("ebene", "kerze"), [V, F, F, F, R]);
gleich("Zwei gleiche in der Lösung, beide gefunden",
    WORDLE.bewerten("essen", "messe"), [V, V, R, V, F]);
gleich("Umlaute zählen als eigene Buchstaben", WORDLE.bewerten("bären", "bauer"), [R, F, V, R, F]);
gleich("Gross- und Kleinschreibung egal", WORDLE.bewerten("APFEL", "apfel"), [R, R, R, R, R]);

/* ------------------------------------------------------------------ *
 * Eine Runde
 * ------------------------------------------------------------------ */

let runde = WORDLE.neueRunde({ modus: "tag", datum: "2026-09-24", nummer: 1, loesung: "apfel", zeitpunkt: 100 });
gleich("Neue Runde läuft", runde.zustand, "laeuft");

let antwort = WORDLE.raten(runde, "abc", 200);
gleich("Zu kurz wird abgewiesen", antwort.fehler, "zu-kurz");
pruefe("Abgewiesen ändert die Runde nicht", antwort.runde === runde);

antwort = WORDLE.raten(runde, "xyzqw", 200);
gleich("Unbekanntes Wort wird abgewiesen", antwort.fehler, "unbekannt");
pruefe("Zu jedem Fehler gibt es einen Satz", ["zu-kurz", "unbekannt", "vorbei"]
    .every((fehler) => WORDLE.fehlerText(fehler) !== ""));

antwort = WORDLE.raten(runde, "LEBEN", 200);
gleich("Gültiges Wort wird angenommen", antwort.fehler, "");
gleich("… und klein gespeichert", antwort.runde.versuche, ["leben"]);
pruefe("Die alte Runde bleibt unverändert", runde.versuche.length === 0);
runde = antwort.runde;

antwort = WORDLE.raten(runde, "apfel", 300);
gleich("Lösung gefunden = gewonnen", antwort.runde.zustand, "gewonnen");
gleich("Beendet-Zeitpunkt gesetzt", antwort.runde.beendetAm, 300);
gleich("Danach geht nichts mehr", WORDLE.raten(antwort.runde, "leben", 400).fehler, "vorbei");

let verloren = WORDLE.neueRunde({ modus: "uebung", loesung: "apfel" });
for (const wort of ["leben", "nebel", "humor", "kerze", "tisch", "stuhl"]) {
    verloren = WORDLE.raten(verloren, wort, 1).runde;
}
gleich("Sechs Fehlversuche = verloren", verloren.zustand, "verloren");
gleich("Kein siebter Versuch", WORDLE.raten(verloren, "apfel", 2).fehler, "vorbei");

/* ------------------------------------------------------------------ *
 * Tastatur und Muster
 * ------------------------------------------------------------------ */

let tasten = WORDLE.neueRunde({ modus: "uebung", loesung: "apfel" });
tasten = WORDLE.raten(tasten, "leben", 1).runde;    /* l gelb, e grün an Stelle 4 */
tasten = WORDLE.raten(tasten, "lampe", 1).runde;    /* l gelb, a gelb, p gelb, e gelb */
const zustand = WORDLE.tastenZustand(tasten);
gleich("Grün bleibt grün, auch wenn später gelb geraten", zustand.e, R);
gleich("Gelb bleibt gelb", zustand.l, V);
gleich("Grau ist grau", zustand.b, F);
pruefe("Nie geratene Buchstaben haben keinen Zustand", zustand.q === undefined);

gleich("Muster ohne Buchstaben", WORDLE.muster(tasten), ["VFFRF", "VVFVV"]);

/* ------------------------------------------------------------------ *
 * Datum, Tageswort, Übung
 * ------------------------------------------------------------------ */

gleich("Datum als Text (Ortszeit)", WORDLE.datumText(new Date(2026, 0, 5, 23, 59)), "2026-01-05");
gleich("Tage über die Zeitumstellung (März)", WORDLE.tageZwischen("2026-03-28", "2026-03-30"), 2);
gleich("Tage über die Zeitumstellung (Oktober)", WORDLE.tageZwischen("2026-10-24", "2026-10-26"), 2);
gleich("Tage rückwärts", WORDLE.tageZwischen("2026-09-24", "2026-09-20"), -4);

gleich("Dasselbe Datum, dasselbe Wort", WORDLE.tageswort("2026-12-01"), WORDLE.tageswort("2026-12-01"));
pruefe("Zwei Tage hintereinander verschiedene Wörter",
    WORDLE.tageswort("2026-12-01").wort !== WORDLE.tageswort("2026-12-02").wort);
gleich("Rätsel-Nummer zählt ab dem Start", WORDLE.tageswort("2026-10-04").nummer, 11);
pruefe("Auch vor dem Start gibt es ein gültiges Wort",
    WOERTER_DE.loesungen.indexOf(WORDLE.tageswort("2026-01-01").wort) !== -1);

gleich("Übungswort bei 0", WORDLE.uebungswort(0), WOERTER_DE.loesungen[0]);
gleich("Übungswort knapp unter 1", WORDLE.uebungswort(0.99999),
    WOERTER_DE.loesungen[WOERTER_DE.loesungen.length - 1]);
pruefe("Jedes Lösungswort ist auch erlaubt", WOERTER_DE.loesungen.every((wort) => WORDLE.istErlaubt(wort)));

/* ------------------------------------------------------------------ *
 * Wiederherstellen (Gerätespeicher)
 * ------------------------------------------------------------------ */

gleich("Kaputter Stand ergibt nichts", WORDLE.normalisieren({ loesung: "zu" }), null);
gleich("Kein Stand ergibt nichts", WORDLE.normalisieren(null), null);
const alt = WORDLE.normalisieren({ modus: "tag", datum: "2026-09-24", loesung: "apfel",
    versuche: ["leben", 7, "zu", "apfel", "humor"] });
gleich("Unbrauchbare Versuche fallen weg", alt.versuche, ["leben", "apfel", "humor"]);
gleich("Zustand wird neu gerechnet", alt.zustand, "gewonnen");

/* ------------------------------------------------------------------ *
 * Die Eingabe — Felder antippen und vor-eintragen (seit 0.3.0)
 * ------------------------------------------------------------------ */

function tippe(eingabe, text) {
    for (const zeichen of Array.from(text)) {
        eingabe = WORDLE.eingabeTippen(eingabe, zeichen);
    }
    return eingabe;
}

let e = WORDLE.leereEingabe();
gleich("Leere Eingabe: fünf leere Felder, erstes markiert", e, { felder: ["", "", "", "", ""], stelle: 0 });

e = tippe(e, "hau");
gleich("Der Reihe nach tippen wie bisher", e, { felder: ["h", "a", "u", "", ""], stelle: 3 });
e = tippe(e, "se");
gleich("Volle Zeile: nichts mehr markiert", e.stelle, WORDLE.LAENGE);
gleich("Das Wort zum Abschicken", WORDLE.eingabeWort(e), "hause");
gleich("Volle Zeile: weiterer Buchstabe tut nichts", tippe(e, "x").felder, ["h", "a", "u", "s", "e"]);

e = WORDLE.eingabeLoeschen(e);
gleich("Löschen nach voller Zeile nimmt den letzten", e, { felder: ["h", "a", "u", "s", ""], stelle: 4 });
e = WORDLE.eingabeLoeschen(e);
gleich("Löschen auf leerem Feld nimmt den links davon", e, { felder: ["h", "a", "u", "", ""], stelle: 3 });

/* Vor-eintragen: erst das letzte Feld, dann von vorn. */
e = WORDLE.eingabeWaehlen(WORDLE.leereEingabe(), 4);
e = tippe(e, "e");
gleich("Feld 5 antippen und e tippen", e.felder, ["", "", "", "", "e"]);
gleich("… danach springt die Markierung auf das erste leere Feld", e.stelle, 0);
gleich("Mit Lücke gibt es kein ganzes Wort", WORDLE.eingabeWort(e), "e");
gleich("… und raten sagt zu-kurz", WORDLE.raten(runde, WORDLE.eingabeWort(e), 1).fehler, "zu-kurz");
e = tippe(e, "haus");
gleich("Die Lücken füllen sich der Reihe nach", WORDLE.eingabeWort(e), "hause");

/* Mitten hinein: Feld 3 steht schon fest, dann springt man darüber. */
e = WORDLE.eingabeWaehlen(WORDLE.leereEingabe(), 2);
e = tippe(e, "u");
gleich("Nach dem Tippen in Feld 3 geht es rechts weiter", e.stelle, 3);
e = WORDLE.eingabeWaehlen(e, 0);
e = tippe(e, "ha");
gleich("Von vorn: das feste Feld wird übersprungen", e, { felder: ["h", "a", "u", "", ""], stelle: 3 });

e = WORDLE.eingabeWaehlen(e, 1);
gleich("Antippen eines vollen Felds markiert es nur", e.felder, ["h", "a", "u", "", ""]);
gleich("Ein Buchstabe ersetzt es", tippe(e, "o").felder, ["h", "o", "u", "", ""]);
gleich("Löschen auf vollem Feld leert genau dieses", WORDLE.eingabeLoeschen(e),
    { felder: ["h", "", "u", "", ""], stelle: 1 });
gleich("Löschen ganz vorn ohne Buchstaben tut nichts", WORDLE.eingabeLoeschen(WORDLE.leereEingabe()),
    WORDLE.leereEingabe());

gleich("Pfeil rechts", WORDLE.eingabeSchieben(WORDLE.leereEingabe(), 1).stelle, 1);
gleich("Pfeil links am Rand bleibt stehen", WORDLE.eingabeSchieben(WORDLE.leereEingabe(), -1).stelle, 0);
gleich("Pfeil links aus voller Zeile markiert das letzte Feld",
    WORDLE.eingabeSchieben(tippe(WORDLE.leereEingabe(), "hause"), -1).stelle, 4);
gleich("Pfeil rechts am Ende bleibt auf dem letzten Feld",
    WORDLE.eingabeSchieben(WORDLE.eingabeWaehlen(WORDLE.leereEingabe(), 4), 1).stelle, 4);

gleich("Unsinnige Stelle wird ignoriert", WORDLE.eingabeWaehlen(WORDLE.leereEingabe(), 9).stelle, 0);
gleich("Nur Spiel-Buchstaben kommen hinein", tippe(WORDLE.leereEingabe(), "1ß-").felder,
    ["", "", "", "", ""]);
gleich("Grossbuchstaben werden klein", tippe(WORDLE.leereEingabe(), "Ä").felder[0], "ä");
const vorher = WORDLE.leereEingabe();
WORDLE.eingabeTippen(vorher, "a");
pruefe("Tippen ändert die alte Eingabe nicht", vorher.felder[0] === "");
gleich("Kaputte Eingabe wird zur leeren", WORDLE.eingabeTippen(null, "a").felder, ["a", "", "", "", ""]);

fazit();
