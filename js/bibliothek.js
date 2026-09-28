/*
 * bibliothek.js — die Bibliothek als DOPPELSEITE (seit 0.20.0; ersetzt die
 * Bibliothek 6 × 8 aus 0.18.0).
 *
 * Nutzer 28.09.2026 zum Entwurf Design\3D-Schrift\entwuerfe\
 * Bibliothek-Doppelseite\: „das passt fürs Erste so, fertig machen, damit ich
 * hochladen kann". Konzept: Apps\UPCrew\docs\BIBLIOTHEK-UND-BELOHNUNGEN.md,
 * Fassung 4 (Abschnitt 0). Die reine Tabelle und Rechnung — kein Bildschirm
 * (js/start-bibliothek.js), kein Speicher (js/fortschritt.js). Ohne Browser
 * testbar; der Zufall kommt von aussen.
 *
 * AUFBAU
 *   Buch      sechs Bücher mit Themen. Die Titel versprechen keine Wortart:
 *             nur Buch 1 „Das Bilderlexikon" zieht nur Nomen, die anderen
 *             alle Wörter mit steigender Schwierigkeit (Verb- und
 *             Adjektiv-Listen fehlen noch).
 *   Kapitel   eine Doppelseite; Spalten von unten nach oben, je Spalte eine
 *             oder zwei Stationen (Spuren). Unten ein Eingang („ein"), oben
 *             genau ein Ausgang („aus"), im letzten Kapitel oben der Boss.
 *             Zwei Spuren hintereinander bleiben je in ihrer Spur; eine Spur
 *             gabelt sich in zwei, zwei treffen sich in einer.
 *   Station   w Wort · e Elite (Verschärfung über `runde.regeln`, eine Figur
 *             mehr) · t Truhe (Münzen) · h Händler (Tipp, Extra-Leben,
 *             Schild günstiger) · b Boss (eigene Regel je Buch).
 *   NICHT jetzt (bewusst, „fürs Erste"): Rast, Fund, Herzen, Tinte,
 *   Design-Stücke, Checkpoint. Scheitern = das Level nochmal mit neuem Wort
 *   aus demselben Bereich.
 *
 * SPEICHER (ohne neue Datenbank-Regel, §11b gilt):
 *   Kampf-Stationen (Wort, Elite, Boss): `turm.figuren["<buch>-<nr>"]`
 *     = 1–3 Figuren, die beste bleibt. `nr` = laufende Nummer der Station im
 *     Buch AB 10 (10–99): So stößt nichts mit den alten Schlüsseln der
 *     6 × 8-Bibliothek zusammen (Level 0–7), und die Regel
 *     /^[0-9]{1,2}-[0-9]{1,2}$/ hält — höchstens 90 Stationen je Buch
 *     (tests/test-bibliothek.js prüft es).
 *   Truhe und Händler (keine Figuren): `turm.schwuere["<buch*100+nr>"]` = 1
 *     („betreten"). Die Regel erlaubt dort /^[0-9]{1,3}$/ mit 0–3 — bei
 *     höchstens 9 Büchern und nr ≤ 99 passt das. So zählen sie nicht als
 *     Figuren (Profil, Abzeichen).
 *   Gewählter Weg, aktuelle Station, Buch durch: GERECHNET aus diesen
 *   Einträgen (`lauf`) — nichts sonst wird gespeichert.
 *
 * UMZUG AUS 0.18.x: Die alten Figuren („Buch-Level", Level 0–7) bleiben im
 * Zweig stehen (sie zählen weiter als Figuren) und stören nichts, weil die
 * neuen Nummern bei 10 beginnen. Wer dort Buch 2 oder höher durch hatte
 * (Boss-Schlüssel „b-7" mit b ≥ 2), startet in Buch 2 (`sprung`).
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

    /* Die Arten der Stationen (Zeichen: js/bausteine.js ZEICHEN). */
    ARTEN: {
        w: { name: "Wort", zeichen: null },
        e: { name: "Elite", zeichen: "wurm" },
        t: { name: "Truhe", zeichen: "schatulle" },
        h: { name: "Händler", zeichen: "antiquar" },
        b: { name: "Boss", zeichen: "siegelband" }
    },

    /* Kapitel-Vorlagen (Spalten von unten nach oben; aus dem Entwurf, ohne
       Rast und Fund). X = das letzte Kapitel mit dem Boss oben. */
    VORLAGEN: {
        A: [["ein"], ["w"], ["w", "e"], ["t", "w"], ["w"], ["h", "w"], ["aus"]],
        B: [["ein"], ["w"], ["e", "w"], ["w", "t"], ["w"], ["w"], ["aus"]],
        C: [["ein"], ["w", "e"], ["w", "w"], ["t"], ["w", "h"], ["w"], ["aus"]],
        D: [["ein"], ["w"], ["w", "h"], ["e", "w"], ["w"], ["t"], ["aus"]],
        X: [["ein"], ["w"], ["e", "w"], ["t", "h"], ["w"], ["b"]]
    },

    /*
     * DIE BÜCHER. `kap` = Kapitel-Vorlagen (Buch n hat n + 2 Kapitel, wie im
     * Konzept 3/4/5 …), `von`/`bis` = Schwierigkeit vom ersten Level bis
     * zum Boss (Konzept §2.2), `farbe` = Themenfarbe (Einband, Tinte),
     * `stil` = Papier-Muster. `boss` = Name, Eigenheit (Chip) und Regeln.
     */
    BUECHER: [
        { titel: "Das Bilderlexikon", farbe: "#1d8a6e", stil: "lexikon", nurNomen: true, nurEchte: false,
            von: 8, bis: 32, kap: ["A", "C", "X"],
            boss: { name: "Der Staubwedler", eigen: "Erste Zeile verstaubt", regeln: { farben: "ersteZeileBlind" } } },
        { titel: "Das Tagebuch", farbe: "#3a64c8", stil: "tagebuch", von: 12, bis: 38, kap: ["A", "B", "C", "X"],
            boss: { name: "Der Tintenfresser", eigen: "Tastatur ohne Grau", regeln: { tastatur: "ohneGrau" } } },
        { titel: "Das Kochbuch", farbe: "#c26a2a", stil: "kochbuch", von: 18, bis: 44, kap: ["B", "D", "A", "C", "X"],
            boss: { name: "Die Küchenchefin", eigen: "Harter Modus · 7 Versuche", regeln: { hart: true, versuche: 7 } } },
        { titel: "Der Reiseführer", farbe: "#2a93a6", stil: "reise", von: 24, bis: 50, kap: ["A", "C", "B", "D", "A", "X"],
            boss: { name: "Der Zensor", eigen: "Kein Gelb · 7 Versuche · ohne Tipp",
                regeln: { farben: "ohneGelb", versuche: 7, ohneTipp: true } } },
        { titel: "Der Krimi", farbe: "#8a3b52", stil: "krimi", von: 30, bis: 56, kap: ["C", "A", "D", "B", "C", "A", "X"],
            boss: { name: "Die Spurenleserin", eigen: "Harter Modus · ohne Grau · ohne Tipp",
                regeln: { hart: true, tastatur: "ohneGrau", ohneTipp: true } } },
        { titel: "Das Wörterbuch", farbe: "#9a7a1c", stil: "woerterbuch", von: 36, bis: 64,
            kap: ["A", "B", "C", "D", "A", "C", "B", "X"],
            boss: { name: "Der Archivar", eigen: "Harter Modus · ohne Grau · ohne Tipp · ohne Extra-Leben",
                regeln: { hart: true, tastatur: "ohneGrau", ohneTipp: true, ohneLeben: true } } }
    ],

    /* Die Elite-Verschärfungen (Buchschädlinge, Konzept §3.6), ab Buch `ab`. */
    ELITEN: [
        { name: "Bücherwurm", eigen: "Harter Modus", ab: 1, regeln: { hart: true } },
        { name: "Eselsohr", eigen: "Erste Zeile verdeckt", ab: 1, regeln: { farben: "ersteZeileBlind" } },
        { name: "Staublaus", eigen: "Tastatur ohne Grau", ab: 3, regeln: { tastatur: "ohneGrau" } },
        { name: "Bleiche", eigen: "Kein Gelb", ab: 4, regeln: { farben: "ohneGelb" } },
        { name: "Leseverbot", eigen: "Ohne Tipp und Extra-Leben", ab: 5, regeln: { ohneTipp: true, ohneLeben: true } }
    ],

    NR_AB: 10,
    NR_BIS: 99,
    BREITE: 8,
    VERSUCHE: 6,
    /* Truhe: Münzen 15–30 (ab Buch 5: 25–45), fest je Station. */
    TRUHE: [[15, 30], [15, 30], [15, 30], [15, 30], [25, 45], [25, 45]],
    /* Händler: so viel billiger als im Shop. */
    RABATT: 0.3,
    WAREN: ["tipp", "leben", "schild"],
    ZULETZT_MAX: 30,
    RUECKFALL_ANZAHL: 8,
    ROEM: ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"],

    /* ---------------------------------------------------------------- *
     * Nachschlagen
     * ---------------------------------------------------------------- */

    anzahlBuecher() {
        return BIBLIOTHEK.BUECHER.length;
    },

    buch(nr) {
        return BIBLIOTHEK.BUECHER[nr - 1] || null;
    },

    kapitel(b, k) {
        const buch = BIBLIOTHEK.buch(b);
        return (buch && buch.kap[k]) ? BIBLIOTHEK.VORLAGEN[buch.kap[k]] : null;
    },

    anzahlKapitel(b) {
        const buch = BIBLIOTHEK.buch(b);
        return buch ? buch.kap.length : 0;
    },

    _cache: {},

    /*
     * Die Stationen eines Buchs in fester Reihenfolge (Kapitel, Spalte von
     * unten, Spur von links): { nr, k, s, i, art, g (Spalten-Index im Buch
     * über alle Station-Spalten), schluessel }. `nr` ab NR_AB.
     */
    stationen(b) {
        if (BIBLIOTHEK._cache[b]) {
            return BIBLIOTHEK._cache[b];
        }
        const buch = BIBLIOTHEK.buch(b);
        const liste = [];
        if (!buch) {
            return liste;
        }
        let nr = BIBLIOTHEK.NR_AB;
        let g = 0;
        buch.kap.forEach((_, k) => {
            BIBLIOTHEK.kapitel(b, k).forEach((spalte, s) => {
                if (spalte[0] === "ein" || spalte[0] === "aus") {
                    return;
                }
                spalte.forEach((art, i) => {
                    liste.push({ nr: nr, k: k, s: s, i: i, art: art, g: g, schluessel: b + "-" + nr });
                    nr++;
                });
                g++;
            });
        });
        liste.spalten = g;
        BIBLIOTHEK._cache[b] = liste;
        return liste;
    },

    station(b, nr) {
        return BIBLIOTHEK.stationen(b).find((st) => st.nr === nr) || null;
    },

    stationAn(b, k, s, i) {
        return BIBLIOTHEK.stationen(b).find((st) => st.k === k && st.s === s && st.i === i) || null;
    },

    istKampf(art) {
        return art === "w" || art === "e" || art === "b";
    },

    istBoss(b, nr) {
        const st = BIBLIOTHEK.station(b, nr);
        return !!st && st.art === "b";
    },

    /* Der Schlüssel für Truhe/Händler in turm.schwuere. */
    merkerSchluessel(b, nr) {
        return String(b * 100 + nr);
    },

    /* Die Nachfolger einer Stelle (Spur-Indizes der nächsten Spalte). */
    nachfolger(b, k, s, i) {
        const kap = BIBLIOTHEK.kapitel(b, k);
        const naechste = kap && kap[s + 1];
        if (!naechste) {
            return [];
        }
        return (kap[s].length === 2 && naechste.length === 2) ? [i] : naechste.map((_, j) => j);
    },

    /* ---------------------------------------------------------------- *
     * Was eine Station ist: Bereich, Regeln, Titel
     * ---------------------------------------------------------------- */

    /* Der feste Bereich [von, bis] einer Kampf-Station. Steigt über die
       Spalten des Buchs gleichmässig, Breite 8; Elite +8; Boss = oberes Ende. */
    bereich(b, nr) {
        const buch = BIBLIOTHEK.buch(b);
        const st = BIBLIOTHEK.station(b, nr);
        if (!buch || !st || !BIBLIOTHEK.istKampf(st.art)) {
            return null;
        }
        const w = BIBLIOTHEK.BREITE;
        if (st.art === "b") {
            return { von: buch.bis - w, bis: buch.bis };
        }
        const gesamt = Math.max(1, BIBLIOTHEK.stationen(b).spalten - 1);
        const von = Math.round(buch.von + (st.g / gesamt) * (buch.bis - w - buch.von));
        const plus = st.art === "e" ? w : 0;
        return { von: Math.min(100 - w, von + plus), bis: Math.min(100, von + w + plus) };
    },

    /* Die Verschärfung einer Elite (fest je Station, aus den erlaubten). */
    elite(b, nr) {
        const st = BIBLIOTHEK.station(b, nr);
        if (!st || st.art !== "e") {
            return null;
        }
        const erlaubt = BIBLIOTHEK.ELITEN.filter((e) => e.ab <= b);
        return erlaubt[(st.nr * 7 + b) % erlaubt.length];
    },

    /* Die Regeln der Runde (js/wordle.js regelnNormalisieren). */
    regeln(b, nr) {
        const buch = BIBLIOTHEK.buch(b);
        const st = BIBLIOTHEK.station(b, nr);
        if (!buch || !st || !BIBLIOTHEK.istKampf(st.art)) {
            return null;
        }
        const grund = { versuche: BIBLIOTHEK.VERSUCHE, nurEchte: buch.nurEchte !== false };
        if (st.art === "e") {
            return Object.assign(grund, BIBLIOTHEK.elite(b, nr).regeln);
        }
        if (st.art === "b") {
            return Object.assign(grund, buch.boss.regeln);
        }
        return grund;
    },

    /* Die Versuche einer Station (für Anzeige). */
    versuche(b, nr) {
        const r = BIBLIOTHEK.regeln(b, nr);
        return (r && r.versuche) || BIBLIOTHEK.VERSUCHE;
    },

    /* „Das Bilderlexikon · II" bzw. „… · Boss". */
    titel(b, nr) {
        const buch = BIBLIOTHEK.buch(b);
        const st = BIBLIOTHEK.station(b, nr);
        if (!buch || !st) {
            return BIBLIOTHEK.NAME;
        }
        if (st.art === "b") {
            return buch.titel + " · Boss";
        }
        return buch.titel + " · " + BIBLIOTHEK.ROEM[st.k] + (st.art === "e" ? " · Elite" : "");
    },

    /* Münzen einer Truhe (fest je Station). */
    truheMuenzen(b, nr) {
        const [von, bis] = BIBLIOTHEK.TRUHE[b - 1] || BIBLIOTHEK.TRUHE[0];
        return von + ((nr * 7 + b * 3) % (bis - von + 1));
    },

    /* Preis beim Händler: Shop-Preis − RABATT, gerundet. */
    haendlerPreis(preis) {
        return Math.max(1, Math.round(preis * (1 - BIBLIOTHEK.RABATT)));
    },

    /* ---------------------------------------------------------------- *
     * Die Wörter einer Station
     * ---------------------------------------------------------------- */

    istNomen(wort) {
        const w = String(wort || "").toLowerCase();
        const d = BIBLIOTHEK_WORTARTEN || {};
        return (d.keinNomen || []).indexOf(w) === -1 && (d.beides || []).indexOf(w) === -1;
    },

    _passt(b, wort) {
        const buch = BIBLIOTHEK.buch(b);
        return !BIBLIOTHEK_WB.ungeeignet(wort) && (!buch.nurNomen || BIBLIOTHEK.istNomen(wort));
    },

    /* Alle Wörter, die JETZT im Bereich der Station liegen (die EINE
       Lesestelle WORTBEWERTUNG.schwierigkeit). */
    woerter(b, nr) {
        const bereich = BIBLIOTHEK.bereich(b, nr);
        if (!bereich) {
            return [];
        }
        return BIBLIOTHEK_WOERTER.loesungen.filter((wort) => {
            const zahl = BIBLIOTHEK_WB.schwierigkeit(wort);
            return Number.isInteger(zahl) && zahl >= bereich.von && zahl <= bereich.bis && BIBLIOTHEK._passt(b, wort);
        });
    },

    /* Rückfall für einen leer gewordenen Bereich: die nächstgelegenen. */
    naechsteWoerter(b, nr) {
        const bereich = BIBLIOTHEK.bereich(b, nr);
        if (!bereich) {
            return [];
        }
        const mitte = (bereich.von + bereich.bis) / 2;
        return BIBLIOTHEK_WOERTER.loesungen
            .filter((wort) => Number.isInteger(BIBLIOTHEK_WB.schwierigkeit(wort)) && BIBLIOTHEK._passt(b, wort))
            .map((wort, i) => ({ wort: wort, i: i, abstand: Math.abs(BIBLIOTHEK_WB.schwierigkeit(wort) - mitte) }))
            .sort((x, y) => x.abstand - y.abstand || x.i - y.i)
            .slice(0, BIBLIOTHEK.RUECKFALL_ANZAHL)
            .sort((x, y) => x.i - y.i)
            .map((e) => e.wort);
    },

    /* Ein Wort für einen Start (Zufall von aussen, zuletzt gespielte
       möglichst nicht). "" = keine Kampf-Station. */
    wortZiehen(b, nr, zufall, vermeiden) {
        let alle = BIBLIOTHEK.woerter(b, nr);
        if (!alle.length) {
            alle = BIBLIOTHEK.naechsteWoerter(b, nr);
        }
        if (!alle.length) {
            return "";
        }
        const weg = Array.isArray(vermeiden) ? vermeiden : [];
        const frisch = alle.filter((wort) => weg.indexOf(wort) === -1);
        const liste = frisch.length ? frisch : alle;
        const z = (typeof zufall === "number" && isFinite(zufall)) ? zufall : 0;
        return liste[Math.min(liste.length - 1, Math.max(0, Math.floor(z * liste.length)))];
    },

    zuletztMerken(liste, wort) {
        const alt = Array.isArray(liste) ? liste.filter((w) => typeof w === "string" && w !== wort) : [];
        return (wort ? [wort] : []).concat(alt).slice(0, BIBLIOTHEK.ZULETZT_MAX);
    },

    /* ---------------------------------------------------------------- *
     * Der Stand — gerechnet aus turm.figuren / turm.schwuere
     * ---------------------------------------------------------------- */

    /* Figuren einer Station (0–3). */
    figurenVon(figuren, b, nr) {
        const wert = (figuren && typeof figuren === "object") ? figuren[b + "-" + nr] : 0;
        return (Number.isInteger(wert) && wert > 0) ? Math.min(wert, 3) : 0;
    },

    /* Ist die Station erledigt? Kampf: Figuren > 0; Truhe/Händler: Merker. */
    erledigt(turm, b, nr) {
        const st = BIBLIOTHEK.station(b, nr);
        if (!st || !turm) {
            return false;
        }
        if (BIBLIOTHEK.istKampf(st.art)) {
            return BIBLIOTHEK.figurenVon(turm.figuren, b, nr) > 0;
        }
        const m = turm.schwuere && turm.schwuere[BIBLIOTHEK.merkerSchluessel(b, nr)];
        return Number.isInteger(m) && m > 0;
    },

    /*
     * DER LAUF durch ein Buch (gerechnet): Von unten nach oben wird in jeder
     * Spalte die erledigte Station der erlaubten Spuren genommen. Die erste
     * Spalte ohne erledigte Station ist die Front:
     *   { weg: [nr…] (gegangene Stationen), jetzt: nr (eine Station wartet)
     *     oder null, gabel: [nr, nr] (zwei Stationen zur Wahl) oder null,
     *     kapitel: k der Front, durch: Boss erledigt }
     */
    lauf(turm, b) {
        const buch = BIBLIOTHEK.buch(b);
        const ergebnis = { weg: [], jetzt: null, gabel: null, kapitel: 0, durch: false };
        if (!buch) {
            return ergebnis;
        }
        for (let k = 0; k < buch.kap.length; k++) {
            const kap = BIBLIOTHEK.kapitel(b, k);
            let spur = 0;
            for (let s = 1; s < kap.length; s++) {
                const erlaubt = BIBLIOTHEK.nachfolger(b, k, s - 1, spur);
                if (kap[s][0] === "aus") {
                    break;
                }
                const kandidaten = erlaubt.map((i) => BIBLIOTHEK.stationAn(b, k, s, i));
                const gegangen = kandidaten.find((st) => BIBLIOTHEK.erledigt(turm, b, st.nr));
                if (gegangen) {
                    ergebnis.weg.push(gegangen.nr);
                    spur = gegangen.i;
                    if (gegangen.art === "b") {
                        ergebnis.durch = true;
                        ergebnis.kapitel = k;
                        return ergebnis;
                    }
                    continue;
                }
                ergebnis.kapitel = k;
                if (kandidaten.length === 1) {
                    ergebnis.jetzt = kandidaten[0].nr;
                } else {
                    ergebnis.gabel = kandidaten.map((st) => st.nr);
                }
                return ergebnis;
            }
        }
        return ergebnis;
    },

    /* Darf diese Station jetzt gespielt/betreten werden? Die wartende
       Station oder eine der beiden an der Gabelung. */
    spielbar(turm, b, nr) {
        const l = BIBLIOTHEK.lauf(turm, b);
        return l.jetzt === nr || (Array.isArray(l.gabel) && l.gabel.indexOf(nr) !== -1);
    },

    /* Buch durch? (Boss erledigt) */
    durch(turm, b) {
        return BIBLIOTHEK.lauf(turm, b).durch;
    },

    /* Umzug aus 0.18.x: alte Boss-Figur „b-7" mit b ≥ 2 → Buch 2 offen. */
    sprung(turm) {
        const f = (turm && turm.figuren) || {};
        return Object.keys(f).some((k) => /^[2-9]-7$/.test(k) && Number.isInteger(f[k]) && f[k] > 0);
    },

    /* Ist das Buch offen? Buch 1 immer; sonst nach dem Boss davor (Buch 2
       auch über den Umzug). */
    offen(turm, b) {
        if (!BIBLIOTHEK.buch(b)) {
            return false;
        }
        if (b === 1) {
            return true;
        }
        return BIBLIOTHEK.durch(turm, b - 1) || (b === 2 && BIBLIOTHEK.sprung(turm));
    },

    /* Das Buch, in dem man steht: das höchste offene. */
    aktuellesBuch(turm) {
        let aktuell = 1;
        for (let b = 1; b <= BIBLIOTHEK.anzahlBuecher(); b++) {
            if (BIBLIOTHEK.offen(turm, b)) {
                aktuell = b;
            }
        }
        return aktuell;
    },

    /* Für das Profil (Name wie bis 0.19.0). */
    erreicht(turm) {
        return BIBLIOTHEK.aktuellesBuch(turm);
    },

    /* Wie viele Stationen (Spalten) noch bis einschliesslich Boss. */
    bossIn(turm, b) {
        const l = BIBLIOTHEK.lauf(turm, b);
        if (l.durch) {
            return 0;
        }
        const front = BIBLIOTHEK.station(b, l.jetzt !== null ? l.jetzt : l.gabel[0]);
        return BIBLIOTHEK.stationen(b).spalten - front.g;
    },

    /* Figuren eines Buchs zusammen (neue Stationen). */
    summe(turm, b) {
        const f = (turm && turm.figuren) || {};
        return BIBLIOTHEK.stationen(b).reduce((s, st) => s + BIBLIOTHEK.figurenVon(f, b, st.nr), 0);
    },

    /* Figuren für ein gelöstes Level: aus der Wertung; Elite eine mehr
       (höchstens 3); mit Hilfe aus dem Shop höchstens 1. */
    figurenFuer(geloest, wertungFiguren, hilfe, art) {
        if (!geloest) {
            return 0;
        }
        if (hilfe) {
            return 1;
        }
        const f = Math.max(1, Math.min(3, Math.floor(wertungFiguren || 1)));
        return art === "e" ? Math.min(3, f + 1) : f;
    },

    /* Ein Weg durch das Buch zum Ansehen und Testen: `schritte` Stationen
       ab dem Anfang, an Gabelungen die Spur aus `wahl` ("0101…"). Liefert
       { turm, weg }. */
    gehen(b, schritte, wahl, turm) {
        const t = turm || { figuren: {}, schwuere: {} };
        t.figuren = t.figuren || {};
        t.schwuere = t.schwuere || {};
        const weg = [];
        const w = String(wahl || "0");
        let gabeln = 0;
        for (let n = 0; n < schritte; n++) {
            const l = BIBLIOTHEK.lauf(t, b);
            if (l.durch) {
                break;
            }
            let nr = l.jetzt;
            if (nr === null) {
                nr = l.gabel[w[gabeln % w.length] === "1" ? 1 : 0];
                gabeln++;
            }
            const st = BIBLIOTHEK.station(b, nr);
            if (BIBLIOTHEK.istKampf(st.art)) {
                t.figuren[b + "-" + nr] = 1 + ((nr + b) % 3);
            } else {
                t.schwuere[BIBLIOTHEK.merkerSchluessel(b, nr)] = 1;
            }
            weg.push(st);
        }
        return { turm: t, weg: weg };
    }
};

if (typeof module !== "undefined" && module.exports) {
    module.exports = BIBLIOTHEK;
}
