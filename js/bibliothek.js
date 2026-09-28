/*
 * bibliothek.js — die Bibliothek (seit 0.18.0): Typolucks Fassung des
 * Blunderluck-Turms (Apps\Blunderluck\js\turm.js; Regeln:
 * Apps\UPCrew\docs\FORTSCHRITT.md, „GÜLTIGER STAND").
 *
 * Nutzer 27.09.2026 wörtlich: „benenne es bei typoluck um in Bibliothek und
 * die Stockwerke … sollen Bücher werden -> Erste Buch nur Nomen, zweite
 * etwas schwerer, immer so weiter. Wichtig: die einzelnen Level sollen nicht
 * bei jedem dasselbe Wort haben, sondern die Wörter haben ja einen Wert
 * zwischen 0–100 von der Schwierigkeit her; ein Level soll ein Wort aus
 * einem Bereich nehmen, der soll fix sein, aber das Wort nicht fix pro
 * Level. Bosse soll es auch geben."
 *
 * Die reine Tabelle und Rechnung — kein Bildschirm (js/start-bibliothek.js),
 * kein Speicher (der Stand liegt im Fortschritt, js/fortschritt.js, Zweig
 * `turm.figuren`, Schlüssel „Buch-Level" wie Blunderlucks „Ort-Stufe").
 * Ohne Browser testbar; der Zufall kommt als Zahl von aussen.
 *
 * WAS GILT:
 *   - Sechs BÜCHER, von Buch 1 aufwärts. Jedes hat acht LEVEL; das letzte
 *     ist der BOSS des Buchs.
 *   - Jedes Level hat einen FESTEN Schwierigkeitsbereich [von, bis] auf der
 *     Skala 0–100 der Wort-Bewertung (`WORTBEWERTUNG.schwierigkeit`, die EINE Lesestelle). Das
 *     WORT wird bei jedem Start zufällig aus diesem Bereich gezogen — nicht
 *     fest je Level, nicht bei allen gleich; die zuletzt gespielten Wörter
 *     werden möglichst ausgelassen (`wortZiehen`, `vermeiden`).
 *   - Die Bereiche steigen im Buch um je 2 Punkte, der Boss liegt am oberen
 *     Ende des Buchs (darüber). Von Buch zu Buch steigt alles um rund 10.
 *   - Buch 1 zieht NUR Nomen (js/wortarten-daten.js); ab Buch 2 alles.
 *     Wörter, die von Hand als „ungeeignet" markiert sind, nie.
 *   - Ein Level ist offen, wenn das davor gelöst ist; der Boss erst, wenn
 *     ALLE Level davor gelöst sind. Ist der Boss gelöst, ist das Buch
 *     durch und das nächste offen. Nachholen (mehr Figuren) geht immer.
 *   - Wertung je Level: 0 bis 3 Figuren wie im Blunderluck-Turm — Bauer =
 *     gelöst, Springer/König nach der Genauigkeit (js/wertung.js, Schwellen
 *     55/75). Mit Tipp oder Extra-Leben aus dem Shop höchstens ein Bauer.
 *
 * WARUM SECHS BÜCHER À ACHT LEVEL: Die Bewertung reicht von 5 bis 86, dicht
 * zwischen 15 und 55, oben dünn (20 Wörter über 65). Sechs Bücher decken
 * das mit Schritten von rund 10 ab, ohne dass oben ein Bereich leer läuft;
 * acht Level (7 + Boss) passen als ein Weg auf einen Handy-Bildschirm und
 * sind etwas mehr als Blunderluck (5–6 Stufen), weil ein Wort schneller
 * gespielt ist als eine Partie. Jeder Bereich hat mindestens 10 Wörter
 * (tests/test-bibliothek.js prüft ≥ 8; die Tabelle steht in
 * docs/entscheidungen/entschieden.md).
 *
 * DER BOSS: schwerster Bereich des Buchs (oberes Ende, weiter als die
 * Level), sichtbar anders (grösserer roter Punkt, Vorstellung „BOSS").
 * 0.18.1 hatte die Bosse ab Buch 4 auf FÜNF Versuche gesetzt; seit 0.18.3
 * wieder sechs (Nutzer 28.09.2026: „Nein → Boss heißt nicht automatisch
 * weniger Versuche"). Der MECHANISMUS bleibt: `bossVersuche` je Buch bzw.
 * künftig je Level/Gegner als Verschärfung, gelesen über
 * `BIBLIOTHEK.versuche`, sichtbar in der Vorstellung („N Versuche") und am
 * Ende („X/N"). Heute setzt ihn kein Buch.
 */

const BIBLIOTHEK_WB = (typeof WORTBEWERTUNG !== "undefined")
    ? WORTBEWERTUNG
    : require("./wortbewertung.js");
const BIBLIOTHEK_WOERTER = (typeof WOERTER_DE !== "undefined")
    ? WOERTER_DE
    : require("./woerter-de.js");
const BIBLIOTHEK_WORTARTEN = (typeof WORTARTEN_DATEN !== "undefined")
    ? WORTARTEN_DATEN
    : require("./wortarten-daten.js");

const BIBLIOTHEK = {

    NAME: "Bibliothek",

    /*
     * DIE BÜCHER. `level` = die festen Bereiche [von, bis] (beide
     * eingeschlossen), das letzte ist der Boss. `nurNomen` nur in Buch 1.
     */
    BUECHER: [
        { nurNomen: true,
            level: [[5, 14], [8, 16], [10, 18], [12, 20], [14, 22], [16, 24], [18, 26], [24, 32]] },
        { level: [[15, 22], [17, 24], [19, 26], [21, 28], [23, 30], [25, 32], [27, 34], [32, 40]] },
        { level: [[25, 32], [27, 34], [29, 36], [31, 38], [33, 40], [35, 42], [37, 44], [42, 50]] },
        { level: [[35, 42], [37, 44], [39, 46], [41, 48], [43, 50], [45, 52], [47, 54], [52, 60]] },
        { level: [[45, 52], [47, 54], [49, 56], [51, 58], [53, 60], [55, 62], [57, 64], [62, 72]] },
        { level: [[52, 58], [54, 60], [56, 62], [58, 64], [60, 66], [62, 68], [64, 72], [68, 100]] }
    ],

    /* Versuche eines Levels, wenn nichts anderes dasteht (= WORDLE.VERSUCHE). */
    VERSUCHE: 6,

    /* So viele zuletzt gespielte Wörter merkt sich das Gerät, damit sie
       beim nächsten Start nicht gleich wieder drankommen. */
    ZULETZT_MAX: 30,

    /* ---------------------------------------------------------------- *
     * Nachschlagen
     * ---------------------------------------------------------------- */

    anzahlBuecher() {
        return BIBLIOTHEK.BUECHER.length;
    },

    /* Buch Nummer `nr` (ab 1), oder null. */
    buch(nr) {
        return BIBLIOTHEK.BUECHER[nr - 1] || null;
    },

    anzahlLevel(nr) {
        const buch = BIBLIOTHEK.buch(nr);
        return buch ? buch.level.length : 0;
    },

    /* Der Schlüssel eines Levels im Fortschritt: "buch-level", Level ab 0
       (wie Blunderlucks „ort-stufe"; Regel §11b: /^[0-9]{1,2}-[0-9]{1,2}$/). */
    schluessel(nr, level) {
        return nr + "-" + level;
    },

    istBoss(nr, level) {
        const buch = BIBLIOTHEK.buch(nr);
        return !!buch && level === buch.level.length - 1;
    },

    /* Der feste Bereich eines Levels: { von, bis } oder null. */
    bereich(nr, level) {
        const buch = BIBLIOTHEK.buch(nr);
        const b = buch && buch.level[level];
        return b ? { von: b[0], bis: b[1] } : null;
    },

    /* Wie viele Versuche das Level hat: 6; der Boss eines Buchs mit
       `bossVersuche` so viele (Mechanismus seit 0.18.1; seit 0.18.3 setzt
       ihn kein Buch — die Verschärfung kommt mit der neuen Bibliothek je
       Level/Gegner). */
    versuche(nr, level) {
        const buch = BIBLIOTHEK.buch(nr);
        if (buch && BIBLIOTHEK.istBoss(nr, level) && Number.isInteger(buch.bossVersuche)) {
            return buch.bossVersuche;
        }
        return BIBLIOTHEK.VERSUCHE;
    },

    /* „Buch 2 · Level 3" bzw. „Buch 2 · Boss". */
    titel(nr, level) {
        if (!BIBLIOTHEK.buch(nr)) {
            return BIBLIOTHEK.NAME;
        }
        return "Buch " + nr + " · " + (BIBLIOTHEK.istBoss(nr, level) ? "Boss" : "Level " + (level + 1));
    },

    /* ---------------------------------------------------------------- *
     * Die Wörter eines Levels
     * ---------------------------------------------------------------- */

    /* Ist das Wort ein Nomen? (Alles, was nicht in js/wortarten-daten.js
       steht — dort stehen die Ausnahmen.) */
    istNomen(wort) {
        const w = String(wort || "").toLowerCase();
        const d = BIBLIOTHEK_WORTARTEN || {};
        return (d.keinNomen || []).indexOf(w) === -1 && (d.beides || []).indexOf(w) === -1;
    },

    /* Alle Wörter, die in diesem Level drankommen können (Listen-Reihenfolge). */
    woerter(nr, level) {
        const buch = BIBLIOTHEK.buch(nr);
        const bereich = BIBLIOTHEK.bereich(nr, level);
        if (!buch || !bereich) {
            return [];
        }
        return BIBLIOTHEK_WOERTER.loesungen.filter((wort) => {
            const zahl = BIBLIOTHEK_WB.schwierigkeit(wort);
            return Number.isInteger(zahl) && zahl >= bereich.von && zahl <= bereich.bis
                && !BIBLIOTHEK_WB.ungeeignet(wort)
                && (!buch.nurNomen || BIBLIOTHEK.istNomen(wort));
        });
    },

    /*
     * Ein Wort für einen Start des Levels. `zufall` in [0, 1) kommt von
     * aussen (Math.random() nie im Modell). `vermeiden` = zuletzt gespielte
     * Wörter; sie bleiben weg, solange danach noch etwas übrig ist. Liefert
     * das Wort oder "" (Level unbekannt).
     * Gezogen wird aus den Wörtern, die JETZT im Bereich liegen — kommt die
     * Schwierigkeit später aus Spieldaten, wandern Wörter zwischen den
     * Bereichen, und die Bereiche bleiben fest. Wäre ein Bereich dann leer,
     * nimmt das Level die RUECKFALL_ANZAHL Wörter, die ihm am nächsten
     * liegen (`naechsteWoerter`) — spielbar bleibt es immer.
     */
    wortZiehen(nr, level, zufall, vermeiden) {
        let alle = BIBLIOTHEK.woerter(nr, level);
        if (!alle.length) {
            alle = BIBLIOTHEK.naechsteWoerter(nr, level);
        }
        if (!alle.length) {
            return "";
        }
        const weg = Array.isArray(vermeiden) ? vermeiden : [];
        const frisch = alle.filter((wort) => weg.indexOf(wort) === -1);
        const liste = frisch.length ? frisch : alle;
        const z = (typeof zufall === "number" && isFinite(zufall)) ? zufall : 0;
        const stelle = Math.min(liste.length - 1, Math.max(0, Math.floor(z * liste.length)));
        return liste[stelle];
    },

    /* Rückfall für einen leeren Bereich: die Wörter (mit Wortart-Regel des
       Buchs), deren Schwierigkeit der Mitte des Bereichs am nächsten liegt. */
    RUECKFALL_ANZAHL: 8,

    naechsteWoerter(nr, level) {
        const buch = BIBLIOTHEK.buch(nr);
        const bereich = BIBLIOTHEK.bereich(nr, level);
        if (!buch || !bereich) {
            return [];
        }
        const mitte = (bereich.von + bereich.bis) / 2;
        return BIBLIOTHEK_WOERTER.loesungen
            .filter((wort) => Number.isInteger(BIBLIOTHEK_WB.schwierigkeit(wort))
                && !BIBLIOTHEK_WB.ungeeignet(wort) && (!buch.nurNomen || BIBLIOTHEK.istNomen(wort)))
            .map((wort, i) => ({ wort: wort, i: i, abstand: Math.abs(BIBLIOTHEK_WB.schwierigkeit(wort) - mitte) }))
            .sort((a, b) => a.abstand - b.abstand || a.i - b.i)
            .slice(0, BIBLIOTHEK.RUECKFALL_ANZAHL)
            .sort((a, b) => a.i - b.i)
            .map((e) => e.wort);
    },

    /* Die Merkliste nach einem Start: das Wort vorn, höchstens ZULETZT_MAX. */
    zuletztMerken(liste, wort) {
        const alt = Array.isArray(liste) ? liste.filter((w) => typeof w === "string" && w !== wort) : [];
        return (wort ? [wort] : []).concat(alt).slice(0, BIBLIOTHEK.ZULETZT_MAX);
    },

    /* ---------------------------------------------------------------- *
     * Der Stand — gerechnet aus den Figuren, nie gespeichert
     * ---------------------------------------------------------------- */

    /* Figuren eines Levels (0 bis 3) aus der Tabelle des Fortschritts. */
    figurenVon(figuren, nr, level) {
        const wert = (figuren && typeof figuren === "object")
            ? figuren[BIBLIOTHEK.schluessel(nr, level)] : 0;
        return (Number.isInteger(wert) && wert > 0) ? Math.min(wert, 3) : 0;
    },

    /* Ist der Boss dieses Buchs gelöst (= Buch durch)? */
    durch(figuren, nr) {
        const n = BIBLIOTHEK.anzahlLevel(nr);
        return n > 0 && BIBLIOTHEK.figurenVon(figuren, nr, n - 1) > 0;
    },

    /* Das ERREICHTE Buch: das unterste, das noch nicht durch ist; sind alle
       durch, Anzahl + 1. */
    erreicht(figuren) {
        let nr = 1;
        while (nr <= BIBLIOTHEK.anzahlBuecher() && BIBLIOTHEK.durch(figuren, nr)) {
            nr++;
        }
        return nr;
    },

    /* Darf dieses Level gespielt werden? Nur im erreichten Buch oder darunter;
       dort das erste, jedes nach einem gelösten, der Boss nach allen. */
    offen(figuren, nr, level) {
        const n = BIBLIOTHEK.anzahlLevel(nr);
        if (!n || level < 0 || level >= n || nr > BIBLIOTHEK.erreicht(figuren)) {
            return false;
        }
        if (BIBLIOTHEK.istBoss(nr, level)) {
            for (let i = 0; i < level; i++) {
                if (BIBLIOTHEK.figurenVon(figuren, nr, i) === 0) {
                    return false;
                }
            }
            return true;
        }
        return level === 0 || BIBLIOTHEK.figurenVon(figuren, nr, level - 1) > 0;
    },

    /* Das nächste offene Level ohne Figur im Buch, oder -1. */
    naechstes(figuren, nr) {
        const n = BIBLIOTHEK.anzahlLevel(nr);
        for (let i = 0; i < n; i++) {
            if (BIBLIOTHEK.figurenVon(figuren, nr, i) === 0 && BIBLIOTHEK.offen(figuren, nr, i)) {
                return i;
            }
        }
        return -1;
    },

    /* Figuren eines Buchs zusammen, und wie viele es höchstens gibt. */
    summe(figuren, nr) {
        const n = BIBLIOTHEK.anzahlLevel(nr);
        let hat = 0;
        for (let i = 0; i < n; i++) {
            hat += BIBLIOTHEK.figurenVon(figuren, nr, i);
        }
        return { hat: hat, alle: n * 3 };
    },

    /*
     * Was „Spielen" startet: das nächste Level im erreichten Buch. Ist alles
     * durch, das unterste Level mit weniger als drei Figuren (nachholen) —
     * und gibt es das nicht, noch einmal der letzte Boss.
     */
    ziel(figuren) {
        const anzahl = BIBLIOTHEK.anzahlBuecher();
        const nr = BIBLIOTHEK.erreicht(figuren);
        if (nr <= anzahl) {
            const i = BIBLIOTHEK.naechstes(figuren, nr);
            if (i >= 0) {
                return { buch: nr, level: i };
            }
        }
        for (let b = 1; b <= anzahl; b++) {
            for (let i = 0; i < BIBLIOTHEK.anzahlLevel(b); i++) {
                if (BIBLIOTHEK.figurenVon(figuren, b, i) < 3 && BIBLIOTHEK.offen(figuren, b, i)) {
                    return { buch: b, level: i };
                }
            }
        }
        return { buch: anzahl, level: BIBLIOTHEK.anzahlLevel(anzahl) - 1 };
    },

    /* Das Level nach diesem (für „Weiter" nach einem Sieg), oder null, wenn
       es noch nicht offen ist. Nach dem Boss das erste Level des nächsten
       Buchs. */
    danach(figuren, nr, level) {
        let b = nr;
        let i = level + 1;
        if (i >= BIBLIOTHEK.anzahlLevel(b)) {
            b += 1;
            i = 0;
        }
        return BIBLIOTHEK.offen(figuren, b, i) ? { buch: b, level: i } : null;
    },

    /*
     * WIE VIELE FIGUREN EIN LEVEL BRINGT: nicht gelöst 0; gelöst nach der
     * Figuren-Regel der Wertung (`wertungFiguren`, js/wertung.js); mit
     * Hilfe aus dem Shop höchstens 1.
     */
    figurenFuer(geloest, wertungFiguren, hilfe) {
        if (!geloest) {
            return 0;
        }
        const f = Math.max(1, Math.min(3, Math.floor(wertungFiguren || 1)));
        return hilfe ? 1 : f;
    }
};

if (typeof module !== "undefined" && module.exports) {
    module.exports = BIBLIOTHEK;
}
