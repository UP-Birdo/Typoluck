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
 *         modus:    "tag" | "uebung" | "bibliothek" (seit 0.18.0),
 *         buch, level:  nur "bibliothek" — Buch ab 1, Level ab 0
 *         grund:    Versuche ohne Extra-Leben (0.18.1–0.18.5; nur noch als
 *                   Rückfall gespeicherter Runden gelesen)
 *         regeln:   seit 0.19.0 wahlfrei — die Regeln DIESER Runde (siehe
 *                   „DIE REGELN JE RUNDE" unten); fehlt es, gilt alles wie
 *                   bis 0.18.5 (Tageswort, Üben)
 *         uhrAb:    seit 0.19.0, nur mit regeln.zeit — Zeitpunkt des ersten
 *                   Tastendrucks
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

    /* Erlaubt = Lösungen + `zusatz` + seit 0.23.4 die grosse Rate-Liste
       der passenden Länge (js/woerter-rate-de.js, nie Lösung). */
    istErlaubt(wort) {
        if (!WORDLE._erlaubt) {
            WORDLE._erlaubt = new Set(WORDLE_WOERTER.loesungen.concat(WORDLE_WOERTER.zusatz));
        }
        const w = String(wort || "").toLowerCase();
        return WORDLE._erlaubt.has(w)
            || (typeof WOERTER_RATE_DE !== "undefined" && WOERTER_RATE_DE.hat(w));
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
        /* Seit 0.16.0: Wörter, die von Hand als „ungeeignet" markiert sind
           (js/wortbewertung-korrektur.js), kommen in der Übung nicht dran.
           Das Tageswort bleibt unberührt — Datum → Wort ändert sich nie. */
        const alle = WORDLE_WOERTER.loesungen;
        const wb = (typeof WORTBEWERTUNG !== "undefined") ? WORTBEWERTUNG : null;
        const geeignet = wb ? alle.filter((wort) => !wb.ungeeignet(wort)) : alle;
        const liste = geeignet.length ? geeignet : alle;
        const stelle = Math.min(liste.length - 1, Math.max(0, Math.floor(zufall * liste.length)));
        return liste[stelle];
    },

    /* ---------------------------------------------------------------- *
     * DIE REGELN JE RUNDE (seit 0.19.0; Konzept
     * Apps\UPCrew\docs\BIBLIOTHEK-UND-BELOHNUNGEN.md §3.8 und §9.1)
     *
     * Jede Station der Bibliothek kann ihre Runde anders machen. Die Regeln
     * stehen IN der Runde (`runde.regeln`), geprüft und begrenzt über
     * `regelnNormalisieren`. Eine Runde OHNE `regeln` (Tageswort, Üben)
     * verhält sich exakt wie bis 0.18.5.
     *
     *   versuche   4–8 (Standard 6)
     *   nurEchte   IMMER true (seit 0.23.2, Nutzer 28.09.2026: „bei Typoluck
     *              sollen doch immer nur echte Wörter zugelassen werden, auch
     *              am Anfang" — überholt „am Anfang alles eintippbar");
     *              `nurEchte: false` wird ignoriert
     *   hart       Schwer-Modus für DIESE Runde (in der Bibliothek gilt nur
     *              die Regel der Runde, nicht die Einstellung)
     *   zeit       0 = aus, sonst 30–300 Sekunden ab dem ersten Tastendruck
     *              (`uhrStarten`); danach ist die Runde verloren (`raten`
     *              meldet "zeit")
     *   ohneTipp   kein Tipp aus dem Vorrat (`tippMoeglich`)
     *   ohneLeben  kein Extra-Leben (`lebenMoeglich`)
     *   farben     "normal" | "ohneGelb" (vorhanden zeigt wie falsch) |
     *              "ersteZeileBlind" (Zeile 1 verdeckt, solange die Runde
     *              läuft)
     *   tastatur   "normal" | "ohneGrau" (keine grauen Tasten)
     * Unsinn wird zum Standard. Die WERTUNG (js/wertung.js) rechnet immer mit
     * der echten Bewertung.
     * ---------------------------------------------------------------- */

    REGELN_STANDARD: {
        versuche: 6, nurEchte: true, hart: false, zeit: 0,
        ohneTipp: false, ohneLeben: false, farben: "normal", tastatur: "normal"
    },

    regelnNormalisieren(roh) {
        const r = (roh && typeof roh === "object" && !Array.isArray(roh)) ? roh : {};
        const s = WORDLE.REGELN_STANDARD;
        const zahl = (w) => (typeof w === "number" && isFinite(w)) ? Math.round(w) : NaN;
        const versuche = zahl(r.versuche);
        const zeit = zahl(r.zeit);
        return {
            versuche: versuche >= 4 && versuche <= 8 ? versuche : s.versuche,
            nurEchte: true,
            hart: r.hart === true,
            zeit: zeit >= 30 && zeit <= 300 ? zeit : 0,
            ohneTipp: r.ohneTipp === true,
            ohneLeben: r.ohneLeben === true,
            farben: ["ohneGelb", "ersteZeileBlind"].indexOf(r.farben) !== -1 ? r.farben : "normal",
            tastatur: r.tastatur === "ohneGrau" ? "ohneGrau" : "normal"
        };
    },

    /* Die Regeln einer Runde — ohne `regeln` der Standard. */
    regelnVon(runde) {
        return (runde && runde.regeln) ? WORDLE.regelnNormalisieren(runde.regeln) : WORDLE.regelnNormalisieren(null);
    },

    /* Die Uhr (Regel `zeit`): beim ersten Tastendruck starten. Liefert die
       Runde (neu, wenn gestartet; sonst dieselbe). */
    uhrStarten(runde, zeitpunkt) {
        if (!runde || !runde.regeln || !WORDLE.regelnVon(runde).zeit || runde.uhrAb || runde.zustand !== "laeuft") {
            return runde;
        }
        const neu = JSON.parse(JSON.stringify(runde));
        neu.uhrAb = zeitpunkt || 0;
        return neu;
    },

    /* Ist die Zeit abgelaufen? (ohne Regel `zeit` nie) */
    zeitAbgelaufen(runde, zeitpunkt) {
        const zeit = WORDLE.regelnVon(runde).zeit;
        return !!(runde && runde.regeln && zeit && runde.uhrAb && zeitpunkt - runde.uhrAb >= zeit * 1000);
    },

    /* Restzeit in Sekunden (für eine spätere Anzeige); null ohne Uhr. */
    restZeit(runde, zeitpunkt) {
        const zeit = WORDLE.regelnVon(runde).zeit;
        if (!runde || !runde.regeln || !zeit) {
            return null;
        }
        if (!runde.uhrAb) {
            return zeit;
        }
        return Math.max(0, Math.ceil(zeit - (zeitpunkt - runde.uhrAb) / 1000));
    },

    /* Darf ein Tipp aus dem Vorrat eingesetzt werden? */
    tippMoeglich(runde) {
        return !!runde && runde.zustand === "laeuft" && !WORDLE.regelnVon(runde).ohneTipp
            && WORDLE.tippStelle(runde) >= 0;
    },

    /* ---------------------------------------------------------------- *
     * Eine Runde
     * ---------------------------------------------------------------- */

    neueRunde(angaben) {
        const runde = {
            modus: ["tag", "bibliothek"].indexOf(angaben.modus) !== -1 ? angaben.modus : "uebung",
            datum: angaben.datum || "",
            nummer: angaben.nummer || 0,
            loesung: String(angaben.loesung || "").toLowerCase(),
            versuche: [],
            zustand: "laeuft",
            begonnenAm: angaben.zeitpunkt || 0,
            beendetAm: 0,
            schwer: angaben.schwer === true,
            /* Seit 0.17.0 (Shop): `extra` = eingesetzte Extra-Leben (0 oder 1,
               je ein 7. Versuch), `tipps` = aufgedeckte Stellen (0–4). */
            extra: 0,
            tipps: []
        };
        /* Seit 0.18.0: ein Level der Bibliothek (js/bibliothek.js) — Buch
           ab 1, Level ab 0. Nur in diesem Modus. */
        if (runde.modus === "bibliothek") {
            runde.buch = Number.isInteger(angaben.buch) && angaben.buch > 0 ? angaben.buch : 1;
            runde.level = Number.isInteger(angaben.level) && angaben.level >= 0 ? angaben.level : 0;
            /* Weniger Versuche (0.18.1–0.18.5): nur noch Rückfall für
               gespeicherte Runden; neu kommt es über `regeln.versuche`. */
            if (Number.isInteger(angaben.grund) && angaben.grund >= 3 && angaben.grund < WORDLE.VERSUCHE) {
                runde.grund = angaben.grund;
            }
            if (Number.isInteger(angaben.station) && angaben.station >= 0) {
                runde.station = angaben.station;
            }
            /* Seit 0.21.0: was die Station aus dem Durchgang mitnahm (Fund-
               Wirkung, Rast „Üben"; js/bibliothek.js `mitnahme`) — nur, wenn
               etwas mitkam. Gewertet wird es am Rundenende (js/app.js). */
            const m = angaben.mitnahme;
            const effekt = (m && typeof m.effekt === "string" && /^[a-z]{1,16}$/.test(m.effekt)) ? m.effekt : "";
            if (m && typeof m === "object" && (effekt || m.ueben === 1)) {
                runde.mitnahme = { effekt: effekt, ueben: m.ueben === 1 ? 1 : 0 };
            }
        }
        /* Die Regeln je Runde (seit 0.19.0) — nur, wenn angegeben. */
        if (angaben.regeln && typeof angaben.regeln === "object") {
            runde.regeln = WORDLE.regelnNormalisieren(angaben.regeln);
            if (runde.regeln.hart) {
                runde.schwer = true;
            }
        }
        return runde;
    },

    /* Die Versuche ohne Extra-Leben: `regeln.versuche` (seit 0.19.0), sonst
       das alte Feld `grund` (gespeicherte Runden 0.18.1–0.18.5), sonst 6. */
    versucheGrund(runde) {
        if (runde && runde.regeln) {
            return WORDLE.regelnVon(runde).versuche;
        }
        return (runde && Number.isInteger(runde.grund)) ? runde.grund : WORDLE.VERSUCHE;
    },

    /* Wie viele Versuche diese Runde hat (6, mit Extra-Leben 7; beim Boss
       ab Buch 4 5 bzw. 6). */
    versucheMax(runde) {
        return WORDLE.versucheGrund(runde) + ((runde && runde.extra === 1) ? 1 : 0);
    },

    /* Hat die Runde Hilfe aus dem Shop genutzt? (Tageswort: höchstens ein
       Bauer, js/fortschritt.js `partie`.) */
    hilfeGenutzt(runde) {
        return !!runde && (runde.extra === 1 || (Array.isArray(runde.tipps) && runde.tipps.length > 0)
            /* Seit 0.23.0: Tinte der Bibliothek zählt wie ein Tipp. */
            || (Array.isArray(runde.tinte) && runde.tinte.length > 0));
    },

    /* Kann ein Extra-Leben eingesetzt werden? Nur, wenn der letzte Versuch
       (sonst der 6., beim Boss ab Buch 4 der 5.) danebenging und noch keins
       eingesetzt ist. */
    lebenMoeglich(runde) {
        return !!runde && runde.zustand === "verloren" && runde.extra !== 1
            && !WORDLE.regelnVon(runde).ohneLeben && !runde.zeitUm
            && runde.versuche.length === WORDLE.versucheGrund(runde);
    },

    /* Das Extra-Leben einsetzen: ein 7. Versuch. Liefert die neue Runde
       oder null. */
    lebenEinsetzen(runde) {
        if (!WORDLE.lebenMoeglich(runde)) {
            return null;
        }
        const neu = JSON.parse(JSON.stringify(runde));
        neu.extra = 1;
        neu.beendetAm = 0;
        neu.zustand = WORDLE._zustandVon(neu);
        return neu;
    },

    /* Die Stelle, die ein Tipp aufdecken würde: die erste, an der noch kein
       Versuch grün war und die noch nicht aufgedeckt ist; -1 = keine. */
    tippStelle(runde) {
        if (!runde || runde.zustand !== "laeuft") {
            return -1;
        }
        const ziel = Array.from(runde.loesung);
        const tipps = (Array.isArray(runde.tipps) ? runde.tipps : [])
            .concat(Array.isArray(runde.tinte) ? runde.tinte : []);
        for (let i = 0; i < WORDLE.LAENGE; i++) {
            const gruen = runde.versuche.some((wort) => Array.from(wort)[i] === ziel[i]);
            if (!gruen && tipps.indexOf(i) === -1) {
                return i;
            }
        }
        return -1;
    },

    /* Einen Tipp einsetzen: { runde, stelle, buchstabe } oder null. */
    tippEinsetzen(runde) {
        const stelle = WORDLE.tippStelle(runde);
        if (stelle < 0) {
            return null;
        }
        const neu = JSON.parse(JSON.stringify(runde));
        neu.tipps = (Array.isArray(neu.tipps) ? neu.tipps : []).concat([stelle]);
        return { runde: neu, stelle: stelle, buchstabe: Array.from(runde.loesung)[stelle] };
    },

    /*
     * TINTE (seit 0.23.0, Konzept Bibliothek §2.1, Nutzer „Tinte A"): ein
     * Gratis-Tipp aus dem Vorrat des Buchs — deckt wie ein Tipp auf, steht in
     * `runde.tinte` (nicht in `tipps`, damit der gekaufte Vorrat nicht
     * zählt). Gesperrt, wo die Regel Tipps sperrt (`ohneTipp`).
     */
    tinteMoeglich(runde) {
        return !!runde && runde.modus === "bibliothek" && runde.zustand === "laeuft"
            && !WORDLE.regelnVon(runde).ohneTipp && WORDLE.tippStelle(runde) >= 0;
    },

    tinteEinsetzen(runde) {
        if (!WORDLE.tinteMoeglich(runde)) {
            return null;
        }
        const stelle = WORDLE.tippStelle(runde);
        const neu = JSON.parse(JSON.stringify(runde));
        neu.tinte = (Array.isArray(neu.tinte) ? neu.tinte : []).concat([stelle]);
        return { runde: neu, stelle: stelle, buchstabe: Array.from(runde.loesung)[stelle] };
    },

    /*
     * DIE FESTEN FELDER (seit 0.23.0, Nutzer 28.09.2026: „der Buchstabe,
     * den man als Tipp bekommt, soll fix sein, nicht löschbar und gleich
     * richtig eingefärbt"): Jede Stelle aus Tipp oder Tinte steht in JEDER
     * weiteren Zeile schon da. Liefert je Stelle den Buchstaben oder "".
     */
    festeBuchstaben(runde) {
        const fest = new Array(WORDLE.LAENGE).fill("");
        if (!runde || typeof runde.loesung !== "string") {
            return fest;
        }
        const ziel = Array.from(runde.loesung);
        const stellen = (Array.isArray(runde.tipps) ? runde.tipps : [])
            .concat(Array.isArray(runde.tinte) ? runde.tinte : []);
        for (const i of stellen) {
            if (Number.isInteger(i) && i >= 0 && i < WORDLE.LAENGE) {
                fest[i] = ziel[i];
            }
        }
        return fest;
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
            loesung: roh.loesung, zeitpunkt: roh.begonnenAm, schwer: roh.schwer,
            buch: roh.buch, level: roh.level, grund: roh.grund, station: roh.station,
            regeln: roh.regeln, mitnahme: roh.mitnahme
        });
        /* Die Uhr (seit 0.19.0) bleibt, samt „Zeit um". */
        if (runde.regeln && typeof roh.uhrAb === "number" && roh.uhrAb > 0) {
            runde.uhrAb = roh.uhrAb;
        }
        if (roh.zeitUm === true) {
            runde.zeitUm = true;
        }
        runde.extra = roh.extra === 1 ? 1 : 0;
        runde.tipps = (Array.isArray(roh.tipps) ? roh.tipps : [])
            .filter((i, stelle, liste) => Number.isInteger(i) && i >= 0 && i < WORDLE.LAENGE
                && liste.indexOf(i) === stelle);
        /* Tinte (seit 0.23.0) — nur, wenn welche eingesetzt ist. */
        if (Array.isArray(roh.tinte) && roh.tinte.length) {
            runde.tinte = roh.tinte.filter((i, stelle, liste) => Number.isInteger(i) && i >= 0
                && i < WORDLE.LAENGE && liste.indexOf(i) === stelle && runde.tipps.indexOf(i) === -1);
        }
        runde.versuche = (Array.isArray(roh.versuche) ? roh.versuche : [])
            .filter((wort) => typeof wort === "string"
                && Array.from(wort).length === WORDLE.LAENGE)
            .slice(0, WORDLE.versucheMax(runde));
        runde.beendetAm = (typeof roh.beendetAm === "number") ? roh.beendetAm : 0;
        runde.zustand = WORDLE._zustandVon(runde);
        return runde;
    },

    /* Besteht eine Eingabe nur aus Buchstaben des Spiels? (Regel nurEchte:
       false — dann genügt das.) */
    _nurBuchstaben(eingabe) {
        return Array.from(eingabe).every((z) => WORDLE.BUCHSTABEN.indexOf(z) !== -1);
    },

    /*
     * Einen Versuch abgeben. Liefert { runde, fehler }:
     *   fehler ""            angenommen, `runde` ist die neue Runde
     *   fehler "vorbei"      die Runde ist schon entschieden
     *   fehler "zu-kurz"     weniger als fünf Buchstaben
     *   fehler "unbekannt"   kein Wort aus der Liste
     *   fehler "schwer"      Schwer-Modus: ein gefundener Buchstabe fehlt;
     *                        `hinweis` sagt welcher (seit 0.6.0)
     *   fehler "zeit"        Regel `zeit` (seit 0.19.0): die Zeit ist um —
     *                        `runde` ist dann die VERLORENE Runde
     * Bei einem anderen Fehler ist `runde` unverändert.
     */
    raten(runde, wort, zeitpunkt) {
        const eingabe = String(wort || "").toLowerCase();

        if (runde.zustand !== "laeuft") {
            return { runde: runde, fehler: "vorbei" };
        }
        if (WORDLE.zeitAbgelaufen(runde, zeitpunkt || 0)) {
            const um = JSON.parse(JSON.stringify(runde));
            um.zustand = "verloren";
            um.zeitUm = true;
            um.beendetAm = zeitpunkt || 0;
            return { runde: um, fehler: "zeit" };
        }
        if (Array.from(eingabe).length !== WORDLE.LAENGE) {
            return { runde: runde, fehler: "zu-kurz" };
        }
        const nurEchte = WORDLE.regelnVon(runde).nurEchte;
        if (nurEchte ? !WORDLE.istErlaubt(eingabe) : !WORDLE._nurBuchstaben(eingabe)) {
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

    /*
     * FESTE FELDER (seit 0.23.0): Aufgedeckte Buchstaben aus Tipp und Tinte
     * (`festeBuchstaben`) stehen fest in der Eingabe — `fest` je Stelle
     * true/false, nur vorhanden, wenn es feste gibt. Ein festes Feld lässt
     * sich nicht überschreiben, nicht löschen und nicht markieren; Tippen,
     * Löschen und Pfeile springen darüber.
     */
    eingabeFestsetzen(eingabe, runde) {
        const neu = WORDLE._eingabeKopie(eingabe);
        const buchstaben = WORDLE.festeBuchstaben(runde);
        if (buchstaben.every((b) => b === "")) {
            return neu;
        }
        neu.fest = buchstaben.map((b) => b !== "");
        buchstaben.forEach((b, i) => {
            if (b) {
                neu.felder[i] = b;
            }
        });
        if (neu.stelle < WORDLE.LAENGE && neu.fest[neu.stelle]) {
            neu.stelle = WORDLE._naechstesLeeres(neu.felder, neu.stelle);
        }
        return neu;
    },

    /* Die Eingabe für eine neue Zeile: leer bis auf die festen Felder,
       markiert ist das erste freie. */
    eingabeFuer(runde) {
        const neu = WORDLE.eingabeFestsetzen(WORDLE.leereEingabe(), runde);
        if (neu.fest && neu.fest[0]) {
            neu.stelle = WORDLE._naechstesLeeres(neu.felder, 0);
        }
        return neu;
    },

    _istFest(eingabe, i) {
        return !!(eingabe && Array.isArray(eingabe.fest) && eingabe.fest[i]);
    },

    /* Ein Feld antippen: es wird markiert, auch wenn schon etwas darin
       steht (der nächste Buchstabe ersetzt es dann). Feste Felder nicht. */
    eingabeWaehlen(eingabe, stelle) {
        const neu = WORDLE._eingabeKopie(eingabe);
        if (Number.isInteger(stelle) && stelle >= 0 && stelle < WORDLE.LAENGE && !WORDLE._istFest(neu, stelle)) {
            neu.stelle = stelle;
        }
        return neu;
    },

    /* Pfeiltasten: die Markierung ein Feld weiter (+1) oder zurück (-1),
       nie über den Rand hinaus, über feste Felder hinweg. Aus „nichts
       markiert" führt links auf das letzte freie Feld. */
    eingabeSchieben(eingabe, richtung) {
        const neu = WORDLE._eingabeKopie(eingabe);
        const schritt = richtung < 0 ? -1 : 1;
        let i = neu.stelle >= WORDLE.LAENGE ? WORDLE.LAENGE : neu.stelle;
        for (let n = 0; n < WORDLE.LAENGE; n++) {
            i += schritt;
            if (i < 0 || i >= WORDLE.LAENGE) {
                return neu;
            }
            if (!WORDLE._istFest(neu, i)) {
                neu.stelle = i;
                return neu;
            }
        }
        return neu;
    },

    /*
     * Einen Buchstaben tippen: Er kommt in das markierte Feld. Danach
     * springt die Markierung auf das nächste LEERE Feld rechts davon; gibt
     * es rechts keins mehr, auf das erste leere Feld von vorn; ist die
     * Zeile voll, auf „nichts markiert". So füllt man Lücken, ohne selbst
     * weiterzutippen. Feste Felder sind nie leer — sie werden übersprungen.
     */
    eingabeTippen(eingabe, buchstabe) {
        const neu = WORDLE._eingabeKopie(eingabe);
        const zeichen = String(buchstabe || "").toLowerCase();
        if (neu.stelle >= WORDLE.LAENGE || Array.from(zeichen).length !== 1
                || WORDLE.BUCHSTABEN.indexOf(zeichen) === -1) {
            return neu;
        }
        if (WORDLE._istFest(neu, neu.stelle)) {
            neu.stelle = WORDLE._naechstesLeeres(neu.felder, neu.stelle);
            if (neu.stelle >= WORDLE.LAENGE) {
                return neu;
            }
        }
        neu.felder[neu.stelle] = zeichen;
        neu.stelle = WORDLE._naechstesLeeres(neu.felder, neu.stelle);
        return neu;
    },

    /*
     * Löschen (seit 0.23.0 nach Nutzer 28.09.2026: „wenn man löschen drückt,
     * soll man die Felder nach links springen und löschen"): Steht im
     * markierten Feld ein Buchstabe, geht genau der weg und die Markierung
     * bleibt. Sonst springt die Markierung auf das nächste FREIE Feld links
     * (über feste hinweg) und leert es. Ganz links passiert nichts.
     */
    eingabeLoeschen(eingabe) {
        const neu = WORDLE._eingabeKopie(eingabe);
        if (neu.stelle < WORDLE.LAENGE && neu.felder[neu.stelle] !== "" && !WORDLE._istFest(neu, neu.stelle)) {
            neu.felder[neu.stelle] = "";
            return neu;
        }
        for (let i = Math.min(neu.stelle, WORDLE.LAENGE) - 1; i >= 0; i--) {
            if (!WORDLE._istFest(neu, i)) {
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
        const kopie = { felder: felder, stelle: stelle };
        if (eingabe && Array.isArray(eingabe.fest) && eingabe.fest.some((f) => f === true)) {
            kopie.fest = felder.map((_, i) => eingabe.fest[i] === true);
        }
        return kopie;
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
            "schwer": "Harter Modus",
            "zeit": "Zeit um"
        }[fehler] || "";
    },

    /* Kachel-Zustand „verdeckt" (Regel farben: ersteZeileBlind, seit 0.19.0). */
    VERDECKT: "verdeckt",

    /* Jede Zeile bewertet — für das Brett. Seit 0.19.0 wie die Runde sie
       ZEIGT (Regel `farben`); ohne Regeln die echte Bewertung. */
    bewertungen(runde) {
        const farben = runde.regeln ? WORDLE.regelnVon(runde).farben : "normal";
        return runde.versuche.map((wort, zeile) => {
            const echt = WORDLE.bewerten(wort, runde.loesung);
            if (farben === "ersteZeileBlind" && zeile === 0 && runde.zustand === "laeuft") {
                return echt.map(() => WORDLE.VERDECKT);
            }
            if (farben === "ohneGelb") {
                return echt.map((w) => (w === WORDLE.VORHANDEN ? WORDLE.FALSCH : w));
            }
            return echt;
        });
    },

    /*
     * Der beste bekannte Zustand je Buchstabe — für die Tastatur.
     * Grün schlägt Gelb schlägt Grau: Einmal als richtig erkannt, bleibt ein
     * Buchstabe grün, auch wenn er später an falscher Stelle geraten wird.
     * Seit 0.19.0 aus dem, was die Runde zeigt (`bewertungen`); verdeckte
     * Zeilen zählen nicht, Regel `tastatur: "ohneGrau"` zeigt kein Grau.
     */
    tastenZustand(runde) {
        const rang = { falsch: 1, vorhanden: 2, richtig: 3 };
        const zustand = {};
        const gezeigt = WORDLE.bewertungen(runde);
        runde.versuche.forEach((wort, zeile) => {
            const bewertung = gezeigt[zeile];
            Array.from(wort).forEach((buchstabe, i) => {
                if (!rang[bewertung[i]]) {
                    return;
                }
                const bisher = zustand[buchstabe];
                if (!bisher || rang[bewertung[i]] > rang[bisher]) {
                    zustand[buchstabe] = bewertung[i];
                }
            });
        });
        if (runde.regeln && WORDLE.regelnVon(runde).tastatur === "ohneGrau") {
            for (const buchstabe of Object.keys(zustand)) {
                if (zustand[buchstabe] === WORDLE.FALSCH) {
                    delete zustand[buchstabe];
                }
            }
        }
        return zustand;
    },

    /* Das Muster einer Runde ohne die Buchstaben: je Zeile fünf Zeichen,
       R = richtig, V = vorhanden, F = falsch. So kann die Rangliste zeigen,
       WIE jemand gelöst hat, ohne das Wort zu verraten. Immer die ECHTE
       Bewertung (seit 0.19.0 ausdrücklich, unabhängig von Regeln). */
    muster(runde) {
        const zeichen = { richtig: "R", vorhanden: "V", falsch: "F" };
        return runde.versuche.map((wort) => WORDLE.bewerten(wort, runde.loesung)
            .map((wert) => zeichen[wert]).join(""));
    },

    _zustandVon(runde) {
        if (runde.versuche.indexOf(runde.loesung) !== -1) {
            return "gewonnen";
        }
        if (runde.zeitUm === true) {
            return "verloren";
        }
        if (runde.versuche.length >= WORDLE.versucheMax(runde)) {
            return "verloren";
        }
        return "laeuft";
    }
};

if (typeof module !== "undefined" && module.exports) {
    module.exports = WORDLE;
}
