/*
 * wertung.js — wie gut eine Runde gespielt war (seit 0.10.0, UPCrew-Runde 5).
 *
 * Nutzer 27.09.2026 (Apps\UPCrew\docs\FORTSCHRITT.md, „GÜLTIGER STAND"):
 * Jede Runde bekommt eine Wertung wie die Partie-Auswertung bei Chess.com —
 * in Typoluck „Können je Versuch (wie viele Wörter er ausschliesst) + Glück
 * getrennt". Daraus die Figuren: Bauer = gelöst, Springer = gelöst UND
 * Genauigkeit über der ersten Schwelle, König = über der zweiten. Glück
 * wird angezeigt, zählt aber nie mit.
 *
 * DIE RECHNUNG — für jeden Versuch:
 *   Vorher gibt es eine Menge Wörter, die nach allem Bisherigen noch die
 *   Lösung sein können (die Kandidaten, n Stück). Jedes erlaubte Wort
 *   teilt diese Menge nach dem Farbmuster, das es zeigen würde. Wie viele
 *   Kandidaten bleiben im Mittel übrig? Das ist die ERWARTUNG eines
 *   Versuchs (Summe der Gruppengrössen im Quadrat, geteilt durch n).
 *     Können = log(n / Erwartung des Versuchs) / log(n / beste Erwartung)
 *   in Prozent: 100 = so gut wie der beste mögliche Versuch, 0 = schliesst
 *   im Mittel nichts aus. Der Logarithmus, weil „halbiert" bei 500
 *   Kandidaten so viel wert ist wie bei 10.
 *     Glück = wie viele der möglichen Ausgänge mehr Kandidaten übrig
 *   gelassen hätten als der eingetretene (die Hälfte der gleich guten
 *   zählt mit), in Prozent. 50 = durchschnittlich.
 *   Steht die Lösung schon fest (nur noch EIN Kandidat), wird der Versuch
 *   NICHT gewertet (`gewertet: false`, Anzeige „—"): Der Spieler kennt die
 *   Lösungsliste nicht und kann nicht wissen, dass nur noch ein Wort
 *   bleibt. (Erster Probelauf 27.09.2026: TISCH liess von 567 Wörtern nur
 *   BLICK übrig, BLUME danach hätte sonst 0 % bekommen und die Runde auf
 *   einen Bauern gedrückt.)
 *   Genauigkeit der Runde = Mittel des Könnens über die gewerteten
 *   Versuche; gibt es keinen, 100.
 *
 * Kandidaten sind die Wörter der Lösungsliste (nur sie können drankommen);
 * geraten werden darf jedes erlaubte Wort — der beste Versuch wird deshalb
 * unter ALLEN erlaubten Wörtern gesucht. Der erste Schritt ist für jede
 * Runde derselbe und wird einmal gerechnet und gemerkt.
 *
 * Die Schwellen (55/75) stammen aus dem Entwurf für den ersten Ort des
 * Typoluck-Turms (FORTSCHRITT.md, Fassung 5); das Tageswort nutzt sie,
 * bis der Turm eigene bekommt.
 */

const WERTUNG_WOERTER = (typeof WOERTER_DE !== "undefined")
    ? WOERTER_DE
    : require("./woerter-de.js");
const WERTUNG_WORDLE = (typeof WORDLE !== "undefined")
    ? WORDLE
    : require("./wordle.js");

const WERTUNG = {

    /* Genauigkeit in Prozent, ab der es Springer bzw. König gibt. */
    SCHWELLEN: [55, 75],

    /*
     * DIE SCHWIERIGKEIT DES TAGESWORTS (seit 0.14.0, Nachtrag Runde 6:
     * Grund-XP der Tagesaufgabe „je nachdem, wie schwer was ist" — leicht
     * 15, mittel 20, schwer 30, in beiden Spielen gleich).
     * Gerechnet aus der Seltenheit der Buchstaben: Für jeden Buchstaben
     * zählt, in wie vielen Wörtern der Lösungsliste er vorkommt; ein Wort
     * bekommt die Summe über seine VERSCHIEDENEN Buchstaben (ein doppelter
     * zählt einmal — Doppelte machen es schwerer). Wenig = seltene
     * Buchstaben = schwer. Das schwächste Drittel der Liste ist schwer
     * (3), das mittlere mittel (2), das oberste leicht (1). Fest je Wort,
     * also fest je Datum; kein Zufall, keine Uhr.
     */
    _schwierigkeitTabelle: null,

    _buchstabenWert(wort, anteil) {
        const verschiedene = Array.from(new Set(String(wort).toLowerCase().split("")));
        return verschiedene.reduce((summe, zeichen) => summe + (anteil[zeichen] || 0), 0);
    },

    _schwierigkeitVorbereiten() {
        if (WERTUNG._schwierigkeitTabelle) {
            return WERTUNG._schwierigkeitTabelle;
        }
        const liste = WERTUNG_WOERTER.loesungen;
        const anteil = {};
        for (const wort of liste) {
            for (const zeichen of new Set(wort.toLowerCase().split(""))) {
                anteil[zeichen] = (anteil[zeichen] || 0) + 1 / liste.length;
            }
        }
        const werte = liste.map((wort) => WERTUNG._buchstabenWert(wort, anteil)).sort((a, b) => a - b);
        WERTUNG._schwierigkeitTabelle = {
            anteil: anteil,
            schwer: werte[Math.floor(werte.length / 3)],
            mittel: werte[Math.floor(2 * werte.length / 3)]
        };
        return WERTUNG._schwierigkeitTabelle;
    },

    /* 1 leicht, 2 mittel, 3 schwer. */
    schwierigkeit(wort) {
        const tabelle = WERTUNG._schwierigkeitVorbereiten();
        const wert = WERTUNG._buchstabenWert(wort, tabelle.anteil);
        if (wert < tabelle.schwer) {
            return 3;
        }
        return wert < tabelle.mittel ? 2 : 1;
    },

    /* Die Namen der Stufen — für die Anzeige (kurz). */
    STUFEN_NAMEN: { 1: "leicht", 2: "mittel", 3: "schwer" },

    /* Die beste Erwartung des ersten Versuchs — für alle Runden gleich. */
    _ersteBeste: null,

    /* Das Farbmuster als kurzer Text („rvfff"), Schlüssel der Gruppen. */
    _muster(geraten, loesung) {
        return WERTUNG_WORDLE.bewerten(geraten, loesung).map((farbe) => farbe.charAt(0)).join("");
    },

    /* Wie die Kandidaten nach einem Versuch in Gruppen zerfallen:
       { muster: anzahl }. */
    gruppen(geraten, kandidaten) {
        const gruppen = {};
        for (const wort of kandidaten) {
            const muster = WERTUNG._muster(geraten, wort);
            gruppen[muster] = (gruppen[muster] || 0) + 1;
        }
        return gruppen;
    },

    /* Wie viele Kandidaten im Mittel übrig bleiben. */
    erwartung(geraten, kandidaten) {
        const gruppen = WERTUNG.gruppen(geraten, kandidaten);
        let summe = 0;
        for (const muster of Object.keys(gruppen)) {
            summe += gruppen[muster] * gruppen[muster];
        }
        return kandidaten.length ? summe / kandidaten.length : 0;
    },

    /* Die beste Erwartung über alle erlaubten Wörter. */
    besteErwartung(kandidaten) {
        const alle = kandidaten.length === WERTUNG_WOERTER.loesungen.length;
        if (alle && WERTUNG._ersteBeste !== null) {
            return WERTUNG._ersteBeste;
        }
        let beste = Infinity;
        for (const wort of WERTUNG_WOERTER.loesungen.concat(WERTUNG_WOERTER.zusatz)) {
            beste = Math.min(beste, WERTUNG.erwartung(wort, kandidaten));
        }
        if (alle) {
            WERTUNG._ersteBeste = beste;
        }
        return beste;
    },

    /* Nur die Kandidaten, die zum Muster eines Versuchs passen. */
    _uebrig(geraten, muster, kandidaten) {
        return kandidaten.filter((wort) => WERTUNG._muster(geraten, wort) === muster);
    },

    /* Können und Glück eines Versuchs. */
    versuchWerten(geraten, loesung, kandidaten) {
        const n = kandidaten.length;
        const muster = WERTUNG._muster(geraten, loesung);
        const uebrig = WERTUNG._uebrig(geraten, muster, kandidaten);

        if (n <= 1) {
            return { wort: geraten, vorher: n, nachher: uebrig.length,
                gewertet: false, koennen: 0, glueck: 0, uebrig: uebrig };
        }

        const erwartung = WERTUNG.erwartung(geraten, kandidaten);
        const beste = WERTUNG.besteErwartung(kandidaten);
        let koennen = 100;
        if (beste < n) {
            koennen = Math.log(n / erwartung) / Math.log(n / beste) * 100;
        }

        const gruppen = WERTUNG.gruppen(geraten, kandidaten);
        let schlechter = 0;
        for (const anderes of Object.keys(gruppen)) {
            const anzahl = gruppen[anderes];
            if (anzahl > uebrig.length) {
                schlechter += anzahl;
            } else if (anzahl === uebrig.length) {
                schlechter += anzahl / 2;
            }
        }

        return {
            wort: geraten, vorher: n, nachher: uebrig.length, gewertet: true,
            koennen: Math.round(Math.max(0, Math.min(100, koennen))),
            glueck: Math.round(schlechter / n * 100),
            uebrig: uebrig
        };
    },

    /*
     * Die ganze Runde. Liefert
     *   { versuche: [{ wort, vorher, nachher, gewertet, koennen, glueck }],
     *     genauigkeit, glueck, figuren }
     * `figuren`: 0 = nicht gelöst, 1 Bauer, 2 Springer, 3 König.
     * Eine laufende Runde wird nicht gewertet (null).
     */
    runde(runde) {
        if (!runde || runde.zustand === "laeuft" || !runde.versuche.length) {
            return null;
        }
        let kandidaten = WERTUNG_WOERTER.loesungen.slice();
        /* Eine Lösung, die nicht (mehr) in der Liste steht, bleibt trotzdem
           wertbar: Sie zählt dann als einzige zusätzliche Möglichkeit. */
        if (kandidaten.indexOf(runde.loesung) === -1) {
            kandidaten.push(runde.loesung);
        }
        const versuche = [];
        for (const wort of runde.versuche) {
            const wert = WERTUNG.versuchWerten(wort, runde.loesung, kandidaten);
            kandidaten = wert.uebrig;
            delete wert.uebrig;
            versuche.push(wert);
        }
        const gewertet = versuche.filter((v) => v.gewertet);
        const mittel = (feld, leer) => gewertet.length
            ? Math.round(gewertet.reduce((s, v) => s + v[feld], 0) / gewertet.length)
            : leer;
        const genauigkeit = mittel("koennen", 100);
        return {
            versuche: versuche,
            genauigkeit: genauigkeit,
            glueck: mittel("glueck", 50),
            figuren: WERTUNG.figuren(runde.zustand === "gewonnen", genauigkeit)
        };
    },

    /* Die Figuren-Regel an EINER Stelle. */
    figuren(geloest, genauigkeit) {
        if (!geloest) {
            return 0;
        }
        return 1 + (genauigkeit >= WERTUNG.SCHWELLEN[0] ? 1 : 0) + (genauigkeit >= WERTUNG.SCHWELLEN[1] ? 1 : 0);
    }
};

if (typeof module !== "undefined" && module.exports) {
    module.exports = WERTUNG;
}
