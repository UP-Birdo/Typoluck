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

/* ------------------------------------------------------------------ *
 * Der Schwer-Modus (seit 0.6.0)
 * ------------------------------------------------------------------ */

/* Die Testwörter müssen erlaubt sein — sonst prüfte der Test „unbekannt"
   statt der Schwer-Regel. */
for (const wort of ["leben", "humor", "affen", "nebel", "apfel", "essen", "messe", "masse"]) {
    pruefe("Testwort erlaubt: " + wort, WORDLE.istErlaubt(wort));
}

const neueSchwere = (loesung) => WORDLE.neueRunde({ modus: "uebung", loesung: loesung, zeitpunkt: 1, schwer: true });

pruefe("Ab Werk nicht schwer", !WORDLE.neueRunde({ modus: "uebung", loesung: "apfel" }).schwer);
pruefe("Schwer wird in der Runde vermerkt", neueSchwere("apfel").schwer);

/* Lösung „apfel", geraten „leben": das zweite e ist grün (Feld 4), das l
   gelb, das erste e grau (apfel hat nur ein e). */
let schwer = WORDLE.raten(neueSchwere("apfel"), "leben", 2).runde;
gleich("Grüne Stelle muss bleiben", WORDLE.raten(schwer, "humor", 3).hinweis, "Feld 4: E");
gleich("… Fehler heisst „schwer“", WORDLE.raten(schwer, "humor", 3).fehler, "schwer");
gleich("Gelber Buchstabe muss vorkommen", WORDLE.raten(schwer, "affen", 3).hinweis, "L benutzen");
gleich("Alles benutzt: angenommen", WORDLE.raten(schwer, "nebel", 3).fehler, "");
gleich("Die Lösung selbst geht immer", WORDLE.raten(schwer, "apfel", 3).runde.zustand, "gewonnen");
gleich("Graue Buchstaben sind erlaubt (b und n aus „leben“)", WORDLE.schwerPruefen(schwer, "nebel"), "");
pruefe("Bei einem Schwer-Fehler bleibt die Runde, wie sie war",
    WORDLE.raten(schwer, "humor", 3).runde === schwer);

/* Lösung „messe", geraten „essen": s grün auf Feld 3, dazu e und s je
   zweimal grün oder gelb — also mindestens zwei e und zwei s. */
schwer = WORDLE.raten(neueSchwere("messe"), "essen", 2).runde;
gleich("Doppelte: grüne Stelle zuerst genannt", WORDLE.schwerPruefen(schwer, "nebel"), "Feld 3: S");
gleich("Doppelte: zwei e nötig, eins reicht nicht", WORDLE.schwerPruefen(schwer, "masse"), "E benutzen");
gleich("Doppelte: die Lösung erfüllt alles", WORDLE.schwerPruefen(schwer, "messe"), "");

const leicht = WORDLE.raten(WORDLE.neueRunde({ modus: "uebung", loesung: "apfel" }), "leben", 2).runde;
gleich("Ohne Schwer-Modus gilt nichts davon", WORDLE.raten(leicht, "humor", 3).fehler, "");

gleich("Alte Runde ohne Feld: nicht schwer",
    WORDLE.normalisieren({ modus: "uebung", loesung: "apfel", versuche: [] }).schwer, false);
pruefe("Gespeicherte schwere Runde bleibt schwer",
    WORDLE.normalisieren(JSON.parse(JSON.stringify(neueSchwere("apfel")))).schwer);

/* ------------------------------------------------------------------ *
 * Feste Felder aus Tipp und Tinte (seit 0.23.0, Nutzer: „fix, nicht
 * löschbar und gleich richtig eingefärbt"; Löschen springt nach links)
 * ------------------------------------------------------------------ */
{
    const r0 = WORDLE.neueRunde({ modus: "bibliothek", buch: 1, station: 10, loesung: "abend", zeitpunkt: 1 });
    const t = WORDLE.tippEinsetzen(r0);
    gleich("Tipp deckt die erste Stelle auf", [t.stelle, t.buchstabe], [0, "a"]);
    let e = WORDLE.eingabeFuer(t.runde);
    gleich("Neue Zeile: fester Buchstabe steht, Zeiger auf dem ersten freien Feld",
        [e.felder, e.fest, e.stelle], [["a", "", "", "", ""], [true, false, false, false, false], 1]);
    e = WORDLE.eingabeTippen(e, "b");
    e = WORDLE.eingabeLoeschen(e);
    e = WORDLE.eingabeLoeschen(e);
    e = WORDLE.eingabeLoeschen(e);
    gleich("Löschen springt über das feste Feld und löscht es nie", [e.felder[0], e.stelle], ["a", 1]);
    gleich("Antippen des festen Felds markiert es nicht", WORDLE.eingabeWaehlen(e, 0).stelle, 1);
    const mitte = WORDLE.eingabeFestsetzen({ felder: ["h", "", "", "", ""], stelle: 1 },
        Object.assign({}, r0, { tipps: [2] }));
    let m = WORDLE.eingabeTippen(mitte, "x");
    gleich("Tippen überspringt das feste Feld nach rechts", [m.felder.join(""), m.stelle], ["hxe", 3]);
    m = WORDLE.eingabeTippen(WORDLE.eingabeTippen(m, "y"), "z");
    gleich("… volle Zeile", m.felder.join(""), "hxeyz");
    m = WORDLE.eingabeLoeschen(WORDLE.eingabeLoeschen(WORDLE.eingabeLoeschen(m)));
    gleich("Rücktaste: z, y weg, dann über das feste e auf x", [m.felder.join(""), m.stelle], ["he", 1]);
    gleich("Pfeil links springt über das feste Feld",
        WORDLE.eingabeSchieben({ felder: ["h", "x", "e", "", ""], stelle: 3, fest: [false, false, true, false, false] }, -1).stelle, 1);
    const weiter = WORDLE.raten(t.runde, "abend", 2).runde;
    gleich("Auch in späteren Zeilen fest (Tipp gilt für die Runde)", WORDLE.eingabeFuer(Object.assign({}, weiter,
        { zustand: "laeuft" })).fest[0], true);
    gleich("Ohne Tipp: Eingabe ohne `fest` (wie bisher)", WORDLE.eingabeFuer(r0), WORDLE.leereEingabe());
    /* Tinte: wie ein Tipp, aber eigene Liste, nur in der Bibliothek, gesperrt mit ohneTipp. */
    const tinte = WORDLE.tinteEinsetzen(t.runde);
    gleich("Tinte deckt die nächste Stelle auf, eigene Liste", [tinte.stelle, tinte.runde.tinte, tinte.runde.tipps],
        [1, [1], [0]]);
    gleich("Tinte zählt als Hilfe", WORDLE.hilfeGenutzt(Object.assign({}, r0, { tinte: [3] })), true);
    gleich("Tinte nur in der Bibliothek, nicht mit ohneTipp",
        [WORDLE.tinteMoeglich(WORDLE.neueRunde({ modus: "uebung", loesung: "abend" })),
            WORDLE.tinteMoeglich(WORDLE.neueRunde({ modus: "bibliothek", loesung: "abend", regeln: { ohneTipp: true } }))],
        [false, false]);
    gleich("Gespeichert bleibt die Tinte", WORDLE.normalisieren(JSON.parse(JSON.stringify(tinte.runde))).tinte, [1]);
    gleich("Feste Buchstaben aus Tipp und Tinte", WORDLE.festeBuchstaben(tinte.runde), ["a", "b", "", "", ""]);
}

fazit();
