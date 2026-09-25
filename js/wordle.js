/*
 * wordle.js — die Regeln von Wordle. Reines Modell: kein Bildschirm, kein
 * Netz, kein Zufall ohne Auftrag.
 *
 * EINE REGEL STEHT GENAU EINMAL — HIER. Der Bildschirm
 * (js\bildschirm-wordle.js) fragt dieses Modell, welche Farbe eine Kachel
 * bekommt, ob ein Wort gilt und ob die Runde vorbei ist. Er rechnet nichts
 * davon selbst. Das ist auch die Voraussetzung für die spätere 3D-Fassung:
 * Sie zeichnet anders, rechnet aber mit denselben Antworten.
 *
 * Eine Runde ist ein schlichtes Objekt (lässt sich speichern und
 * wiederherstellen):
 *
 *     {
 *         modus:    "tag" | "uebung",
 *         datum:    "2026-09-24"   (nur beim Tageswort),
 *         nummer:   1              (Rätsel-Nummer, nur beim Tageswort),
 *         loesung:  "abend",
 *         versuche: ["hause", …],  (höchstens VERSUCHE Stück)
 *         zustand:  "laeuft" | "gewonnen" | "verloren",
 *         begonnenAm: 1750000000000,
 *         beendetAm:  0,
 *         schwer:   false          (seit 0.6.0: Schwer-Modus, siehe unten)
 *     }
 *
 * Jede Änderung liefert eine NEUE Runde — die alte bleibt unberührt.
 */

/* Im Browser liegt die Wortliste als eigene Datei davor; in den Tests wird
   sie hier geladen. */
const WORDLE_WOERTER = (typeof WOERTER_DE !== "undefined")
    ? WOERTER_DE
    : require("./woerter-de.js");

const WORDLE = {

    /* DER NAME, DEN DER SPIELER SIEHT — steht nur hier (seit 0.6.2).
       „Wordle" ist eine Marke der New York Times und darf NIE sichtbar sein
       (Nutzer-Entscheidung 25.09.2026, tests\test-syntax.js wacht darüber).
       Die inneren Namen (WORDLE, "wordle" als Bildschirm-Id und als Pfad in
       der Datenbank) bleiben: Sie sieht niemand, und die Pfade gehören zum
       Datenvertrag. */
    NAME: "Wordguesser",

    VERSUCHE: 6,
    LAENGE: 5,

    /* Die drei Bewertungen einer Kachel. Die Namen sind zugleich die
       CSS-Klassen-Endungen (kachel-richtig …) — der Bildschirm hängt sie nur an. */
    RICHTIG: "richtig",
    VORHANDEN: "vorhanden",
    FALSCH: "falsch",

    /* Die Buchstaben, die es im Spiel gibt — Grundlage für die Tastatur und
       für die Prüfung einer Eingabe. */
    BUCHSTABEN: "abcdefghijklmnopqrstuvwxyzäöü",

    /* ---------------------------------------------------------------- *
     * Wörter
     * ---------------------------------------------------------------- */

    /* Eine Menge aller erlaubten Wörter, einmal gebaut. */
    _erlaubt: null,

    istErlaubt(wort) {
        if (!WORDLE._erlaubt) {
            WORDLE._erlaubt = new Set(WORDLE_WOERTER.loesungen.concat(WORDLE_WOERTER.zusatz));
        }
        return WORDLE._erlaubt.has(String(wort || "").toLowerCase());
    },

    /* ---------------------------------------------------------------- *
     * Die Bewertung — das Herz des Spiels
     *
     * Zwei Durchgänge, damit doppelte Buchstaben richtig zählen:
     *   1. Alles an der richtigen Stelle ist grün und „verbraucht" diesen
     *      Buchstaben der Lösung.
     *   2. Von links nach rechts: Ein Buchstabe ist gelb, solange die Lösung
     *      davon noch unverbrauchte Exemplare hat — sonst grau.
     *
     * Beispiel: Lösung „apfel", geraten „affen" → a grün, erstes f grün,
     * zweites f grau (die Lösung hat nur ein f), e gelb… so wie man es von
     * Wordle kennt.
     * ---------------------------------------------------------------- */

    bewerten(geraten, loesung) {
        const rate = Array.from(String(geraten).toLowerCase());
        const ziel = Array.from(String(loesung).toLowerCase());
        const ergebnis = new Array(rate.length).fill(WORDLE.FALSCH);
        const uebrig = {};

        for (let i = 0; i < rate.length; i++) {
            if (rate[i] === ziel[i]) {
                ergebnis[i] = WORDLE.RICHTIG;
            } else {
                uebrig[ziel[i]] = (uebrig[ziel[i]] || 0) + 1;
            }
        }
        for (let i = 0; i < rate.length; i++) {
            if (ergebnis[i] === WORDLE.RICHTIG) {
                continue;
            }
            if (uebrig[rate[i]] > 0) {
                ergebnis[i] = WORDLE.VORHANDEN;
                uebrig[rate[i]]--;
            }
        }
        return ergebnis;
    },

    /* ---------------------------------------------------------------- *
     * Das Tageswort — für alle Geräte gleich, ohne Server
     * ---------------------------------------------------------------- */

    /* "YYYY-MM-DD" nach der ORTSZEIT des Geräts: Der Tag wechselt für jeden
       um Mitternacht bei ihm zu Hause, nicht nach Weltzeit. */
    datumText(datum) {
        const d = datum || new Date();
        return d.getFullYear() + "-"
            + String(d.getMonth() + 1).padStart(2, "0") + "-"
            + String(d.getDate()).padStart(2, "0");
    },

    /* Ganze Tage von `von` bis `bis` (beides "YYYY-MM-DD"). Über Date.UTC
       gerechnet, damit die Zeitumstellung keinen Tag verschluckt. */
    tageZwischen(von, bis) {
        const [j1, m1, t1] = von.split("-").map(Number);
        const [j2, m2, t2] = bis.split("-").map(Number);
        return Math.round((Date.UTC(j2, m2 - 1, t2) - Date.UTC(j1, m1 - 1, t1)) / 86400000);
    },

    /* Liefert { wort, nummer } für einen Tag. `nummer` zählt ab dem ersten
       Planabschnitt (Tag 1 = erstes Rätsel). */
    tageswort(datumText) {
        const plan = WORDLE_WOERTER.TAGESPLAN;
        let abschnitt = plan[0];
        for (const eintrag of plan) {
            if (WORDLE.tageZwischen(eintrag.ab, datumText) >= 0) {
                abschnitt = eintrag;
            }
        }
        const tag = WORDLE.tageZwischen(abschnitt.ab, datumText);
        const n = abschnitt.anzahl;
        const stelle = (((tag * abschnitt.schritt + abschnitt.versatz) % n) + n) % n;

        return {
            wort: WORDLE_WOERTER.loesungen[stelle],
            nummer: WORDLE.tageZwischen(plan[0].ab, datumText) + 1
        };
    },

    /* Ein Wort für die Übung. `zufall` ist eine Zahl in [0, 1) — sie kommt
       von aussen, damit das Modell selbst nie würfelt (und testbar bleibt). */
    uebungswort(zufall) {
        const liste = WORDLE_WOERTER.loesungen;
        const stelle = Math.min(liste.length - 1, Math.max(0, Math.floor(zufall * liste.length)));
        return liste[stelle];
    },

    /* ---------------------------------------------------------------- *
     * Eine Runde
     * ---------------------------------------------------------------- */

    neueRunde(angaben) {
        return {
            modus: angaben.modus === "tag" ? "tag" : "uebung",
            datum: angaben.datum || "",
            nummer: angaben.nummer || 0,
            loesung: String(angaben.loesung || "").toLowerCase(),
            versuche: [],
            zustand: "laeuft",
            begonnenAm: angaben.zeitpunkt || 0,
            beendetAm: 0,
            schwer: angaben.schwer === true
        };
    },

    /* Eine gespeicherte (vielleicht alte oder kaputte) Runde in Form
       bringen — die Nachrüst-Stelle des additiven Datenvertrags. Liefert
       null, wenn nichts Brauchbares darin steht. */
    normalisieren(roh) {
        if (!roh || typeof roh !== "object" || typeof roh.loesung !== "string"
                || Array.from(roh.loesung).length !== WORDLE.LAENGE) {
            return null;
        }
        /* `schwer` fehlt in Runden von vor 0.6.0 — dann eben nicht schwer. */
        const runde = WORDLE.neueRunde({
            modus: roh.modus, datum: roh.datum, nummer: roh.nummer,
            loesung: roh.loesung, zeitpunkt: roh.begonnenAm, schwer: roh.schwer
        });
        runde.versuche = (Array.isArray(roh.versuche) ? roh.versuche : [])
            .filter((wort) => typeof wort === "string"
                && Array.from(wort).length === WORDLE.LAENGE)
            .slice(0, WORDLE.VERSUCHE);
        runde.beendetAm = (typeof roh.beendetAm === "number") ? roh.beendetAm : 0;
        runde.zustand = WORDLE._zustandVon(runde);
        return runde;
    },

    /*
     * Einen Versuch abgeben. Liefert { runde, fehler }:
     *   fehler ""            angenommen, `runde` ist die neue Runde
     *   fehler "vorbei"      die Runde ist schon entschieden
     *   fehler "zu-kurz"     weniger als fünf Buchstaben
     *   fehler "unbekannt"   kein Wort aus der Liste
     *   fehler "schwer"      Schwer-Modus: ein gefundener Buchstabe fehlt;
     *                        `hinweis` sagt welcher (seit 0.6.0)
     * Bei einem Fehler ist `runde` unverändert.
     */
    raten(runde, wort, zeitpunkt) {
        const eingabe = String(wort || "").toLowerCase();

        if (runde.zustand !== "laeuft") {
            return { runde: runde, fehler: "vorbei" };
        }
        if (Array.from(eingabe).length !== WORDLE.LAENGE) {
            return { runde: runde, fehler: "zu-kurz" };
        }
        if (!WORDLE.istErlaubt(eingabe)) {
            return { runde: runde, fehler: "unbekannt" };
        }
        if (runde.schwer) {
            const hinweis = WORDLE.schwerPruefen(runde, eingabe);
            if (hinweis) {
                return { runde: runde, fehler: "schwer", hinweis: hinweis };
            }
        }

        const neu = JSON.parse(JSON.stringify(runde));
        neu.versuche.push(eingabe);
        neu.zustand = WORDLE._zustandVon(neu);
        if (neu.zustand !== "laeuft") {
            neu.beendetAm = zeitpunkt || 0;
        }
        return { runde: neu, fehler: "" };
    },

    /* ---------------------------------------------------------------- *
     * Der Schwer-Modus (seit 0.6.0, ROADMAP Nr. 7)
     *
     * Wie im Original-Wordle: Was man schon weiss, muss man benutzen.
     *   - Ein grüner Buchstabe muss an SEINER Stelle bleiben.
     *   - Ein gelber (oder grüner) Buchstabe muss im Wort vorkommen — so
     *     oft, wie er in einem früheren Versuch grün oder gelb war (zwei
     *     gelbe „e" heissen: mindestens zwei e).
     * Graue Buchstaben darf man weiter tippen (auch das wie das Original).
     *
     * Geprüft wird gegen JEDEN früheren Versuch, grüne Stellen zuerst — so
     * nennt der Hinweis das Wichtigste. Liefert "" (in Ordnung) oder ein
     * Stichwort für die Kurzmeldung: „Feld 3: A" bzw. „E benutzen".
     *
     * Ob eine Runde schwer ist, steht IN der Runde (`schwer`) und wird beim
     * Anlegen festgelegt — umschalten mitten in einer Runde geht nicht,
     * sonst liesse sich die Regel nach einem Blick auf die Tastatur abstellen.
     * ---------------------------------------------------------------- */

    schwerPruefen(runde, wort) {
        const eingabe = Array.from(String(wort || "").toLowerCase());
        const frueher = runde.versuche.map((versuch) => ({
            buchstaben: Array.from(versuch),
            bewertung: WORDLE.bewerten(versuch, runde.loesung)
        }));

        for (const versuch of frueher) {
            for (let i = 0; i < WORDLE.LAENGE; i++) {
                if (versuch.bewertung[i] === WORDLE.RICHTIG && eingabe[i] !== versuch.buchstaben[i]) {
                    return "Feld " + (i + 1) + ": " + versuch.buchstaben[i].toUpperCase();
                }
            }
        }
        for (const versuch of frueher) {
            const noetig = {};
            versuch.buchstaben.forEach((buchstabe, i) => {
                if (versuch.bewertung[i] !== WORDLE.FALSCH) {
                    noetig[buchstabe] = (noetig[buchstabe] || 0) + 1;
                }
            });
            for (const buchstabe of Object.keys(noetig)) {
                const vorhanden = eingabe.filter((b) => b === buchstabe).length;
                if (vorhanden < noetig[buchstabe]) {
                    return buchstabe.toUpperCase() + " benutzen";
                }
            }
        }
        return "";
    },

    /* ---------------------------------------------------------------- *
     * Die Eingabe — die Zeile, in die gerade getippt wird (seit 0.3.0)
     *
     * Nutzer 25.09.2026: „dass man auf die Felder klicken kann in der Zeile,
     * wo man gerade schreiben soll, dass man schon vor-eintragen kann".
     * Deshalb ist die Eingabe kein Text mehr, der nur hinten wächst, sondern
     * fünf Felder mit einer Markierung:
     *
     *     { felder: ["h", "", "u", "", ""], stelle: 1 }
     *
     *   felder   je Stelle ein Buchstabe oder "" (Lücken sind erlaubt)
     *   stelle   das markierte Feld, 0 bis LAENGE-1 — dorthin kommt der
     *            nächste Buchstabe. LAENGE heisst „nichts markiert": die
     *            Zeile wurde von vorn nach hinten vollgetippt, ein weiterer
     *            Buchstabe tut nichts (wie im klassischen Wordle).
     *
     * Wer der Reihe nach tippt, merkt keinen Unterschied zu vorher. Die
     * Regeln stehen hier und nicht im Bildschirm (eiserne Regel „Regeln nur
     * im Modell"); jede Funktion liefert eine NEUE Eingabe.
     * ---------------------------------------------------------------- */

    leereEingabe() {
        return { felder: new Array(WORDLE.LAENGE).fill(""), stelle: 0 };
    },

    /* Ein Feld antippen: es wird markiert, auch wenn schon etwas darin
       steht (der nächste Buchstabe ersetzt es dann). */
    eingabeWaehlen(eingabe, stelle) {
        const neu = WORDLE._eingabeKopie(eingabe);
        if (Number.isInteger(stelle) && stelle >= 0 && stelle < WORDLE.LAENGE) {
            neu.stelle = stelle;
        }
        return neu;
    },

    /* Pfeiltasten: die Markierung ein Feld weiter (+1) oder zurück (-1),
       nie über den Rand hinaus. Aus „nichts markiert" führt links auf das
       letzte Feld. */
    eingabeSchieben(eingabe, richtung) {
        const neu = WORDLE._eingabeKopie(eingabe);
        const von = neu.stelle >= WORDLE.LAENGE ? WORDLE.LAENGE : neu.stelle;
        neu.stelle = Math.min(WORDLE.LAENGE - 1, Math.max(0, von + (richtung < 0 ? -1 : 1)));
        return neu;
    },

    /*
     * Einen Buchstaben tippen: Er kommt in das markierte Feld. Danach
     * springt die Markierung auf das nächste LEERE Feld rechts davon; gibt
     * es rechts keins mehr, auf das erste leere Feld von vorn; ist die
     * Zeile voll, auf „nichts markiert". So füllt man Lücken, ohne selbst
     * weiterzutippen.
     */
    eingabeTippen(eingabe, buchstabe) {
        const neu = WORDLE._eingabeKopie(eingabe);
        const zeichen = String(buchstabe || "").toLowerCase();
        if (neu.stelle >= WORDLE.LAENGE || Array.from(zeichen).length !== 1
                || WORDLE.BUCHSTABEN.indexOf(zeichen) === -1) {
            return neu;
        }
        neu.felder[neu.stelle] = zeichen;
        neu.stelle = WORDLE._naechstesLeeres(neu.felder, neu.stelle);
        return neu;
    },

    /*
     * Löschen: Steht im markierten Feld ein Buchstabe, geht genau der weg
     * und die Markierung bleibt. Ist es leer (oder nichts markiert), geht
     * der nächste Buchstabe LINKS davon weg und die Markierung wandert
     * dorthin — das ist das gewohnte Zurück-Löschen beim Tippen.
     */
    eingabeLoeschen(eingabe) {
        const neu = WORDLE._eingabeKopie(eingabe);
        if (neu.stelle < WORDLE.LAENGE && neu.felder[neu.stelle] !== "") {
            neu.felder[neu.stelle] = "";
            return neu;
        }
        for (let i = Math.min(neu.stelle, WORDLE.LAENGE) - 1; i >= 0; i--) {
            if (neu.felder[i] !== "") {
                neu.felder[i] = "";
                neu.stelle = i;
                return neu;
            }
        }
        return neu;
    },

    /* Das Wort zum Abschicken. Mit Lücke ist es kürzer als LAENGE — dann
       sagt `raten` von selbst „zu-kurz". */
    eingabeWort(eingabe) {
        return WORDLE._eingabeKopie(eingabe).felder.join("");
    },

    /* Hilfen der Eingabe */

    _eingabeKopie(eingabe) {
        const felder = new Array(WORDLE.LAENGE).fill("");
        const roh = (eingabe && Array.isArray(eingabe.felder)) ? eingabe.felder : [];
        for (let i = 0; i < WORDLE.LAENGE; i++) {
            felder[i] = (typeof roh[i] === "string") ? roh[i] : "";
        }
        const stelle = (eingabe && Number.isInteger(eingabe.stelle)
            && eingabe.stelle >= 0 && eingabe.stelle <= WORDLE.LAENGE) ? eingabe.stelle : 0;
        return { felder: felder, stelle: stelle };
    },

    _naechstesLeeres(felder, von) {
        for (let i = von + 1; i < WORDLE.LAENGE; i++) {
            if (felder[i] === "") {
                return i;
            }
        }
        for (let i = 0; i < von; i++) {
            if (felder[i] === "") {
                return i;
            }
        }
        return WORDLE.LAENGE;
    },

    /* Die Worte, die der Bildschirm zu einem Fehler zeigt — stehen beim
       Modell, damit Regel und Erklärung nicht auseinanderlaufen. Seit 0.4.0
       Stichworte statt Sätze (UPCrew-Standard, Abschnitt „Text"). */
    fehlerText(fehler) {
        return {
            "vorbei": "Runde vorbei",
            "zu-kurz": "Zu kurz",
            "unbekannt": "Unbekanntes Wort",
            "schwer": "Schwer-Modus"
        }[fehler] || "";
    },

    /* Jede Zeile bewertet — für das Brett. */
    bewertungen(runde) {
        return runde.versuche.map((wort) => WORDLE.bewerten(wort, runde.loesung));
    },

    /*
     * Der beste bekannte Zustand je Buchstabe — für die Tastatur.
     * Grün schlägt Gelb schlägt Grau: Einmal als richtig erkannt, bleibt ein
     * Buchstabe grün, auch wenn er später an falscher Stelle geraten wird.
     */
    tastenZustand(runde) {
        const rang = { falsch: 1, vorhanden: 2, richtig: 3 };
        const zustand = {};
        runde.versuche.forEach((wort) => {
            const bewertung = WORDLE.bewerten(wort, runde.loesung);
            Array.from(wort).forEach((buchstabe, i) => {
                const bisher = zustand[buchstabe];
                if (!bisher || rang[bewertung[i]] > rang[bisher]) {
                    zustand[buchstabe] = bewertung[i];
                }
            });
        });
        return zustand;
    },

    /* Das Muster einer Runde ohne die Buchstaben: je Zeile fünf Zeichen,
       R = richtig, V = vorhanden, F = falsch. So kann die Rangliste zeigen,
       WIE jemand gelöst hat, ohne das Wort zu verraten. */
    muster(runde) {
        const zeichen = { richtig: "R", vorhanden: "V", falsch: "F" };
        return WORDLE.bewertungen(runde).map((zeile) =>
            zeile.map((wert) => zeichen[wert]).join(""));
    },

    _zustandVon(runde) {
        if (runde.versuche.indexOf(runde.loesung) !== -1) {
            return "gewonnen";
        }
        if (runde.versuche.length >= WORDLE.VERSUCHE) {
            return "verloren";
        }
        return "laeuft";
    }
};

if (typeof module !== "undefined" && module.exports) {
    module.exports = WORDLE;
}
