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
 *         beendetAm:  0
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
            beendetAm: 0
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
        const runde = WORDLE.neueRunde({
            modus: roh.modus, datum: roh.datum, nummer: roh.nummer,
            loesung: roh.loesung, zeitpunkt: roh.begonnenAm
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

        const neu = JSON.parse(JSON.stringify(runde));
        neu.versuche.push(eingabe);
        neu.zustand = WORDLE._zustandVon(neu);
        if (neu.zustand !== "laeuft") {
            neu.beendetAm = zeitpunkt || 0;
        }
        return { runde: neu, fehler: "" };
    },

    /* Der Satz, den der Bildschirm zu einem Fehler zeigt — steht beim Modell,
       damit Regel und Erklärung nicht auseinanderlaufen. */
    fehlerText(fehler) {
        return {
            "vorbei": "Diese Runde ist schon vorbei.",
            "zu-kurz": "Zu wenig Buchstaben.",
            "unbekannt": "Dieses Wort kenne ich nicht."
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
