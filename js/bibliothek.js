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
 *             mehr, Checkpoint) · t Truhe (Münzen) · h Händler (Tipp,
 *             Extra-Leben, Schild günstiger) · r Rast (seit 0.21.0: Heilen
 *             oder Üben) · f Fund (seit 0.21.0: Tausch mit Risiko) · b Boss
 *             (eigene Regel je Buch).
 *   Herzen    (seit 0.21.0, Konzept §3.7) ab Buch 2: 5 je Durchgang, NUR
 *             beim Scheitern an der Front weg (Wort −1, Elite −2, Boss −3).
 *             Bei 0 zurück zum Checkpoint. Seit 0.21.1 (Nutzer 28.09.2026:
 *             „zur letzten Rast / Elite-Gegner") = die letzte Rast ODER
 *             besiegte Elite des gegangenen Wegs, was später kam; ohne
 *             beides an den Buchanfang. Eine Rast zählt, sobald sie
 *             gegangen ist (gewählt oder „Weiter") — scheitern kann man an
 *             ihr ohnehin nicht, „beim Betreten" und „nach der Wahl" sind
 *             gleich. Elite besiegt → Herzen voll (Nutzer, 0.21.1).
 *             Figuren, Münzen und Merker bleiben; die Stationen danach sind
 *             neu zu spielen (`wieder`), eine Rast heilt je Durchgang nur
 *             einmal.
 *   Nur vorwärts (seit 0.21.1, Nutzer: „gegangene wege sollen nicht
 *             nochmal spielbar gemacht werden"): gespielt wird nur die
 *             Front (`spielbar`), kein Nachspielen für mehr Figuren.
 *   NICHT jetzt: Tinte, Lesezeichen, Design-Stücke, Siegel, Goldene
 *   Station, Tutorial. Scheitern ohne Herzen (Buch 1) oder mit Herzen
 *   übrig = dieselbe Station nochmal mit neuem Wort.
 *
 * DER DURCHGANG (seit 0.21.0) — NUR AUF DEM GERÄT (js/app.js
 *   `durchgang`): { herzen, wieder: [nr], geheilt: [nr], ueben: 0/1,
 *   effekt: "" | Fund-Wirkung für die nächste Kampf-Station }. Die heutige
 *   Regel §11b hat dafür kein Feld (`turm` kennt nur figuren/schwuere) —
 *   mit Regel §12 zieht es nach `bibliothek.lauf` (Konzept §7.1). Bis
 *   dahin gilt: Herzen und Rückfall je Gerät; ein zweites Gerät sieht den
 *   Weg ohne Rückfall. `sicht(turm, durchgaenge)` blendet die neu zu
 *   spielenden Stationen aus — alle Rechnungen darunter bleiben gleich.
 *
 * SPEICHER (ohne neue Datenbank-Regel, §11b gilt):
 *   Kampf-Stationen (Wort, Elite, Boss): `turm.figuren["<buch>-<nr>"]`
 *     = 1–3 Figuren, die beste bleibt. `nr` = laufende Nummer der Station im
 *     Buch AB 10 (10–99): So stößt nichts mit den alten Schlüsseln der
 *     6 × 8-Bibliothek zusammen (Level 0–7), und die Regel
 *     /^[0-9]{1,2}-[0-9]{1,2}$/ hält — höchstens 90 Stationen je Buch
 *     (tests/test-bibliothek.js prüft es).
 *   Truhe, Händler, Rast, Fund (keine Figuren):
 *     `turm.schwuere["<buch*100+nr>"]` = 1
 *     („betreten"). Die Regel erlaubt dort /^[0-9]{1,3}$/ mit 0–3 — bei
 *     höchstens 9 Büchern und nr ≤ 99 passt das. So zählen sie nicht als
 *     Figuren (Profil, Abzeichen).
 *   Erledigt ist eine Station, wenn EINER der beiden Einträge da ist —
 *     gleich welcher Art (seit 0.21.0): Die Vorlagen bekamen Rast und Fund
 *     an Stellen, an denen in 0.20.0 ein Wort oder eine Truhe stand; die
 *     Form (Spalten und Spuren) und damit jede Nummer blieb. So bleibt
 *     jeder in 0.20.0 gegangene Weg gegangen, und ein durchgespieltes Buch
 *     bleibt durch.
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
        r: { name: "Rast", zeichen: "kerze" },
        f: { name: "Fund", zeichen: "blatt" },
        b: { name: "Boss", zeichen: "siegelband" }
    },

    /* Kapitel-Vorlagen (Spalten von unten nach oben). X = das letzte
       Kapitel mit dem Boss oben. Seit 0.21.0 mit Rast und Fund wie im
       Entwurf — aber in der FORM von 0.20.0 (gleiche Spalten, gleiche
       Spuren, also gleiche Nummern; siehe „Erledigt" oben): B und D wie im
       Entwurf, A/C/X ohne die Spalte, die der Entwurf mehr hat; X mit der
       Rast direkt vor dem Boss (Konzept §2.1 „vorletzte Seite: Rast"),
       davor Truhe oder Fund statt des Händlers (sonst stünden Händler und
       Rast direkt hintereinander, §2.1). */
    VORLAGEN: {
        A: [["ein"], ["w"], ["w", "e"], ["r", "t"], ["w"], ["h", "f"], ["aus"]],
        B: [["ein"], ["w"], ["f", "w"], ["w", "e"], ["h"], ["w"], ["aus"]],
        C: [["ein"], ["w", "e"], ["t", "w"], ["w"], ["w", "r"], ["f"], ["aus"]],
        D: [["ein"], ["w"], ["e", "w"], ["w", "h"], ["w"], ["t"], ["aus"]],
        X: [["ein"], ["w"], ["e", "w"], ["t", "f"], ["r"], ["b"]]
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
    /* Truhe: Münzen 15–30 (ab Buch 5: 25–45), fest je Station. Nach einem
       Rückfall bringt dieselbe Truhe nichts mehr (js/app.js). */
    TRUHE: [[15, 30], [15, 30], [15, 30], [15, 30], [25, 45], [25, 45]],
    /* Händler: so viel billiger als im Shop. */
    RABATT: 0.3,
    WAREN: ["tipp", "leben", "schild"],
    ZULETZT_MAX: 30,
    RUECKFALL_ANZAHL: 8,

    /* Herzen (seit 0.21.0, Konzept §3.7): ab Buch HERZEN_AB, Start und
       höchstens HERZEN, Verlust nur beim Scheitern je Art; Rast heilt
       HEILEN. */
    HERZEN: 5,
    HERZEN_AB: 2,
    VERLUST: { w: 1, e: 2, b: 3 },
    HEILEN: 2,
    /* Rast „Üben": die nächste Elite oder der Boss +1 Versuch. */
    UEBEN_PLUS: 1,
    /* Längste Listen im Durchgang (Gerät). */
    LISTE_MAX: 99,

    /*
     * FUND — Tausch mit Risiko (Konzept §3.4). Zwei Angebote je Fund (fest
     * je Station, aus denen, die das Buch erlaubt), dazu immer „Nein".
     * `naechste` = gilt für die nächste Kampf-Station an der Front (Wort,
     * Elite, Boss) und ihre Belohnung nur, wenn sie gelöst wird. `herzen` =
     * nur in Büchern mit Herzen. Ohne Tinte, Lesezeichen, Design-Stücke und
     * Siegel — die gibt es noch nicht, ihre Angebote fehlen darum.
     */
    FUNDE: [
        { id: "herzmuenzen", gib: "−1 Herz", kriegst: "+40 Münzen", ab: 1, herzen: true },
        { id: "muenzenherz", gib: "30 Münzen", kriegst: "+1 Herz", ab: 1, herzen: true },
        { id: "doppelt", gib: "Doppelbuchstabe", kriegst: "Münzen ×2", ab: 2, naechste: true },
        { id: "fuenf", gib: "5 Versuche", kriegst: "+1 Figur", ab: 2, naechste: true },
        { id: "zeit", gib: "60 Sekunden", kriegst: "+1 Herz", ab: 3, herzen: true, naechste: true },
        { id: "wette", gib: "20 Münzen", kriegst: "≤ 4 Versuche: 50", ab: 1, naechste: true }
    ],
    FUND_MUENZEN: { herzmuenzen: 40, muenzenherz: 30, wette: 20, wetteZurueck: 50, wetteBis: 4, zeit: 60 },
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
       möglichst nicht). "" = keine Kampf-Station. `filter` (seit 0.21.0,
       Fund „Doppelbuchstabe") = Merkmale für WORTBEWERTUNG.passtMerkmale;
       hat der Bereich kein passendes Wort, die nächstgelegenen passenden. */
    wortZiehen(b, nr, zufall, vermeiden, filter) {
        let alle = BIBLIOTHEK.woerter(b, nr);
        if (!alle.length) {
            alle = BIBLIOTHEK.naechsteWoerter(b, nr);
        }
        if (filter && alle.length) {
            const passt = (wort) => BIBLIOTHEK_WB.passtMerkmale(wort, filter, BIBLIOTHEK_WOERTER.loesungen);
            let gefiltert = alle.filter(passt);
            if (!gefiltert.length) {
                const bereich = BIBLIOTHEK.bereich(b, nr);
                const mitte = (bereich.von + bereich.bis) / 2;
                gefiltert = BIBLIOTHEK_WOERTER.loesungen
                    .filter((wort) => Number.isInteger(BIBLIOTHEK_WB.schwierigkeit(wort))
                        && BIBLIOTHEK._passt(b, wort) && passt(wort))
                    .sort((x, y) => Math.abs(BIBLIOTHEK_WB.schwierigkeit(x) - mitte)
                        - Math.abs(BIBLIOTHEK_WB.schwierigkeit(y) - mitte))
                    .slice(0, BIBLIOTHEK.RUECKFALL_ANZAHL);
            }
            if (gefiltert.length) {
                alle = gefiltert;
            }
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

    /* Ist die Station erledigt? Kampf schreibt Figuren, alles andere den
       Merker; seit 0.21.0 zählt jeder der beiden, gleich welcher Art (die
       Vorlagen tauschten Arten an festen Nummern, Kopf „Erledigt"). */
    erledigt(turm, b, nr) {
        const st = BIBLIOTHEK.station(b, nr);
        if (!st || !turm) {
            return false;
        }
        if (BIBLIOTHEK.figurenVon(turm.figuren, b, nr) > 0) {
            return true;
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
       (höchstens 3); mit Hilfe aus dem Shop höchstens 1. `plus` (seit
       0.21.0, Fund „5 Versuche") = so viele mehr, höchstens 3. */
    figurenFuer(geloest, wertungFiguren, hilfe, art, plus) {
        if (!geloest) {
            return 0;
        }
        if (hilfe) {
            return 1;
        }
        const f = Math.max(1, Math.min(3, Math.floor(wertungFiguren || 1)));
        const mehr = (art === "e" ? 1 : 0) + (Number.isInteger(plus) && plus > 0 ? plus : 0);
        return Math.min(3, f + mehr);
    },

    /* Die Figuren einer beendeten Runde (Bildschirm und Fortschritt gleich):
       mit der Belohnung ihrer Mitnahme. `runde` = WORDLE-Runde. */
    figurenDerRunde(runde, wertungFiguren, hilfe) {
        const st = runde ? BIBLIOTHEK.station(runde.buch, runde.station) : null;
        const geloest = !!runde && runde.zustand === "gewonnen";
        const plus = BIBLIOTHEK.belohnung(runde && runde.mitnahme,
            { geloest: geloest, versuche: runde ? runde.versuche.length : 0, hilfe: hilfe }).figurPlus;
        return BIBLIOTHEK.figurenFuer(geloest, wertungFiguren, hilfe, st ? st.art : "w", plus);
    },

    /* ---------------------------------------------------------------- *
     * Herzen, Checkpoint, Rast, Fund (seit 0.21.0) — der Durchgang liegt
     * nur auf dem Gerät (Kopf „DER DURCHGANG"); alles hier ist rein.
     * ---------------------------------------------------------------- */

    /* Hat dieses Buch Herzen? (Konzept §3.7: Buch 1 ohne, ab Buch 2) */
    mitHerzen(b) {
        return !!BIBLIOTHEK.buch(b) && b >= BIBLIOTHEK.HERZEN_AB;
    },

    durchgangLeer(b) {
        return { herzen: BIBLIOTHEK.mitHerzen(b) ? BIBLIOTHEK.HERZEN : 0, wieder: [], geheilt: [],
            ueben: 0, effekt: "" };
    },

    /* Unsinn wird zum leeren Durchgang; nur Nummern dieses Buchs. */
    durchgangNormalisieren(roh, b) {
        const leer = BIBLIOTHEK.durchgangLeer(b);
        if (!roh || typeof roh !== "object" || Array.isArray(roh)) {
            return leer;
        }
        const nummern = (liste) => (Array.isArray(liste) ? liste : [])
            .filter((nr, i, alle) => Number.isInteger(nr) && BIBLIOTHEK.station(b, nr) && alle.indexOf(nr) === i)
            .slice(0, BIBLIOTHEK.LISTE_MAX);
        const herzen = Number.isInteger(roh.herzen) ? roh.herzen : leer.herzen;
        const effekt = BIBLIOTHEK.FUNDE.some((f) => f.naechste && f.id === roh.effekt) ? roh.effekt : "";
        return {
            herzen: BIBLIOTHEK.mitHerzen(b) ? Math.max(1, Math.min(BIBLIOTHEK.HERZEN, herzen)) : 0,
            wieder: nummern(roh.wieder),
            geheilt: nummern(roh.geheilt),
            ueben: roh.ueben === 1 ? 1 : 0,
            effekt: effekt
        };
    },

    /*
     * Die Sicht auf den Stand: Stationen, die nach einem Rückfall neu zu
     * spielen sind (`wieder` je Buch), gelten als nicht erledigt. Liefert
     * eine Kopie { figuren, schwuere }; `durchgaenge` = { <b>: Durchgang }.
     */
    sicht(turm, durchgaenge) {
        const figuren = Object.assign({}, (turm && turm.figuren) || {});
        const schwuere = Object.assign({}, (turm && turm.schwuere) || {});
        const alle = (durchgaenge && typeof durchgaenge === "object") ? durchgaenge : {};
        Object.keys(alle).forEach((schluessel) => {
            const b = parseInt(schluessel, 10);
            const dg = alle[schluessel];
            if (!BIBLIOTHEK.buch(b) || !dg || !Array.isArray(dg.wieder)) {
                return;
            }
            dg.wieder.forEach((nr) => {
                delete figuren[b + "-" + nr];
                delete schwuere[BIBLIOTHEK.merkerSchluessel(b, nr)];
            });
        });
        return { figuren: figuren, schwuere: schwuere };
    },

    /* Welche Arten Checkpoints sind (seit 0.21.1 auch die Rast). */
    CHECKPOINT_ARTEN: ["e", "r"],

    /* Der Checkpoint: die letzte gegangene Rast oder besiegte Elite auf dem
       Weg (Nummer) oder null (= Buchanfang). `turm` ist die Sicht. */
    checkpoint(turm, b) {
        const weg = BIBLIOTHEK.lauf(turm, b).weg;
        for (let n = weg.length - 1; n >= 0; n--) {
            if (BIBLIOTHEK.CHECKPOINT_ARTEN.indexOf(BIBLIOTHEK.station(b, weg[n]).art) !== -1) {
                return weg[n];
            }
        }
        return null;
    },

    /*
     * Gescheitert an einer Station: Nur an der Front (die Station, die den
     * Weg weiterbringt) und nur in Büchern mit Herzen kostet es. Bei 0
     * Herzen der Rückfall: alle gegangenen Stationen nach dem Checkpoint
     * (ohne Checkpoint: alle) kommen nach `wieder`, Herzen voll, Üben und
     * Fund-Wirkung weg; `geheilt` bleibt (eine Rast heilt je Durchgang
     * nur einmal). Liefert { dg, verlust, rueck, cp }.
     */
    scheitern(turm, b, nr, dg) {
        const alt = BIBLIOTHEK.durchgangNormalisieren(dg, b);
        const st = BIBLIOTHEK.station(b, nr);
        if (!st || !BIBLIOTHEK.istKampf(st.art) || !BIBLIOTHEK.mitHerzen(b) || !BIBLIOTHEK.spielbar(turm, b, nr)) {
            return { dg: alt, verlust: 0, rueck: false, cp: null };
        }
        const verlust = BIBLIOTHEK.VERLUST[st.art];
        const neu = JSON.parse(JSON.stringify(alt));
        if (alt.herzen - verlust > 0) {
            neu.herzen = alt.herzen - verlust;
            return { dg: neu, verlust: verlust, rueck: false, cp: null };
        }
        const cp = BIBLIOTHEK.checkpoint(turm, b);
        const weg = BIBLIOTHEK.lauf(turm, b).weg;
        const ab = cp === null ? 0 : weg.indexOf(cp) + 1;
        weg.slice(ab).forEach((n) => {
            if (neu.wieder.indexOf(n) === -1) {
                neu.wieder.push(n);
            }
        });
        neu.wieder = neu.wieder.slice(0, BIBLIOTHEK.LISTE_MAX);
        neu.herzen = BIBLIOTHEK.HERZEN;
        neu.ueben = 0;
        neu.effekt = "";
        return { dg: neu, verlust: verlust, rueck: true, cp: cp };
    },

    /* Eine Station ist (wieder) erledigt: raus aus `wieder`. */
    wiederErledigt(dg, b, nr) {
        const neu = BIBLIOTHEK.durchgangNormalisieren(dg, b);
        neu.wieder = neu.wieder.filter((n) => n !== nr);
        return neu;
    },

    /* Rast: „heilen" (+2 Herzen, nur mit Herzen, je Rast und Durchgang
       einmal, nicht bei vollen Herzen) oder „ueben" (nächste Elite/Boss +1
       Versuch). Liefert { dg, ok }. */
    rastMoeglich(dg, b, nr, wahl) {
        const d = BIBLIOTHEK.durchgangNormalisieren(dg, b);
        if (wahl === "heilen") {
            return BIBLIOTHEK.mitHerzen(b) && d.herzen < BIBLIOTHEK.HERZEN && d.geheilt.indexOf(nr) === -1;
        }
        return wahl === "ueben" && d.ueben === 0;
    },

    rastWaehlen(dg, b, nr, wahl) {
        if (!BIBLIOTHEK.rastMoeglich(dg, b, nr, wahl)) {
            return { dg: BIBLIOTHEK.durchgangNormalisieren(dg, b), ok: false };
        }
        const neu = BIBLIOTHEK.wiederErledigt(dg, b, nr);
        if (wahl === "heilen") {
            neu.herzen = Math.min(BIBLIOTHEK.HERZEN, neu.herzen + BIBLIOTHEK.HEILEN);
            neu.geheilt.push(nr);
        } else {
            neu.ueben = 1;
        }
        return { dg: neu, ok: true };
    },

    /* Die Angebote eines Funds (fest je Station; ein Buch ohne Herzen hat
       weniger zur Auswahl — Buch 1 heute nur die Wette). */
    fundAngebote(b, nr) {
        const erlaubt = BIBLIOTHEK.FUNDE.filter((f) => f.ab <= b && (!f.herzen || BIBLIOTHEK.mitHerzen(b)));
        if (erlaubt.length <= 2) {
            return erlaubt.slice();
        }
        const n = erlaubt.length;
        const i = (nr * 7 + b) % n;
        const j = (i + 1 + ((nr * 3 + b) % (n - 1))) % n;
        return [erlaubt[Math.min(i, j)], erlaubt[Math.max(i, j)]];
    },

    /* Geht dieser Tausch jetzt? `muenzen` = Kontostand. Eine Wirkung für
       die nächste Station gibt es nur eine auf einmal. */
    fundMoeglich(dg, b, id, muenzen) {
        const d = BIBLIOTHEK.durchgangNormalisieren(dg, b);
        const f = BIBLIOTHEK.FUNDE.find((x) => x.id === id);
        const m = BIBLIOTHEK.FUND_MUENZEN;
        if (!f || (f.herzen && !BIBLIOTHEK.mitHerzen(b)) || (f.naechste && d.effekt)) {
            return false;
        }
        if (id === "herzmuenzen") {
            return d.herzen > 1;
        }
        if (id === "muenzenherz") {
            return d.herzen < BIBLIOTHEK.HERZEN && muenzen >= m.muenzenherz;
        }
        if (id === "wette") {
            return muenzen >= m.wette;
        }
        return true;
    },

    /* Den Tausch nehmen (Münzen bucht die App). Liefert { dg, ok,
       muenzen } — `muenzen` > 0 gutschreiben, < 0 abbuchen. */
    fundNehmen(dg, b, nr, id, muenzen) {
        if (!BIBLIOTHEK.fundMoeglich(dg, b, id, muenzen)) {
            return { dg: BIBLIOTHEK.durchgangNormalisieren(dg, b), ok: false, muenzen: 0 };
        }
        const neu = BIBLIOTHEK.wiederErledigt(dg, b, nr);
        const m = BIBLIOTHEK.FUND_MUENZEN;
        const f = BIBLIOTHEK.FUNDE.find((x) => x.id === id);
        let betrag = 0;
        if (id === "herzmuenzen") {
            neu.herzen -= 1;
            betrag = m.herzmuenzen;
        } else if (id === "muenzenherz") {
            neu.herzen += 1;
            betrag = -m.muenzenherz;
        } else if (id === "wette") {
            betrag = -m.wette;
        }
        if (f.naechste) {
            neu.effekt = id;
        }
        return { dg: neu, ok: true, muenzen: betrag };
    },

    /* Was eine Kampf-Station beim Start aus dem Durchgang mitnimmt (nur an
       der Front): Fund-Wirkung und Üben (nur Elite/Boss). */
    mitnahme(turm, b, nr, dg) {
        const st = BIBLIOTHEK.station(b, nr);
        const d = BIBLIOTHEK.durchgangNormalisieren(dg, b);
        if (!st || !BIBLIOTHEK.istKampf(st.art) || !BIBLIOTHEK.spielbar(turm, b, nr)) {
            return { effekt: "", ueben: 0 };
        }
        return { effekt: d.effekt, ueben: (st.art === "e" || st.art === "b") ? d.ueben : 0 };
    },

    /* Die Regeln einer Runde samt Mitnahme: „5 Versuche" höchstens 5,
       „60 Sekunden" Uhr 60 s, Üben +1 Versuch (höchstens 8). */
    rundeRegeln(b, nr, mitnahme) {
        const r = BIBLIOTHEK.regeln(b, nr);
        if (!r) {
            return null;
        }
        const m = mitnahme || {};
        if (m.effekt === "fuenf") {
            r.versuche = Math.min(r.versuche || BIBLIOTHEK.VERSUCHE, 5);
        }
        if (m.effekt === "zeit") {
            r.zeit = r.zeit ? Math.min(r.zeit, BIBLIOTHEK.FUND_MUENZEN.zeit) : BIBLIOTHEK.FUND_MUENZEN.zeit;
        }
        if (m.ueben === 1) {
            r.versuche = Math.min(8, (r.versuche || BIBLIOTHEK.VERSUCHE) + BIBLIOTHEK.UEBEN_PLUS);
        }
        return r;
    },

    /* Der Wort-Filter einer Mitnahme („Doppelbuchstabe" = Pflicht). */
    wortFilter(mitnahme) {
        return (mitnahme && mitnahme.effekt === "doppelt") ? { doppelt: "pflicht" } : null;
    },

    /*
     * Nach einer Kampf-Runde mit Mitnahme: die Belohnung (nur gelöst) und
     * der Durchgang danach (Mitnahme verbraucht, gelöst → raus aus
     * `wieder`). { geloest, versuche, hilfe } aus der Runde.
     * Liefert { dg, muenzenMal, muenzenPlus, herzPlus, figurPlus }.
     */
    belohnung(mitnahme, runde) {
        const m = mitnahme || {};
        const r = runde || {};
        const ergebnis = { muenzenMal: 1, muenzenPlus: 0, herzPlus: 0, figurPlus: 0 };
        if (!r.geloest) {
            return ergebnis;
        }
        if (m.effekt === "doppelt") {
            ergebnis.muenzenMal = 2;
        } else if (m.effekt === "fuenf" && !r.hilfe) {
            ergebnis.figurPlus = 1;
        } else if (m.effekt === "zeit") {
            ergebnis.herzPlus = 1;
        } else if (m.effekt === "wette" && r.versuche <= BIBLIOTHEK.FUND_MUENZEN.wetteBis) {
            ergebnis.muenzenPlus = BIBLIOTHEK.FUND_MUENZEN.wetteZurueck;
        }
        return ergebnis;
    },

    /* Der Durchgang nach einer Kampf-Runde (ohne Scheitern-Rechnung):
       Mitnahme verbraucht, gelöst → erledigt, Herz aus der Belohnung;
       seit 0.21.1: Elite besiegt → Herzen voll (Nutzer 28.09.2026). */
    nachRunde(dg, b, nr, mitnahme, geloest, herzPlus) {
        const st = BIBLIOTHEK.station(b, nr);
        if (geloest && st && st.art === "e" && BIBLIOTHEK.mitHerzen(b)) {
            herzPlus = BIBLIOTHEK.HERZEN;
        }
        const neu = geloest ? BIBLIOTHEK.wiederErledigt(dg, b, nr) : BIBLIOTHEK.durchgangNormalisieren(dg, b);
        const m = mitnahme || {};
        if (m.effekt && neu.effekt === m.effekt) {
            neu.effekt = "";
        }
        if (m.ueben === 1) {
            neu.ueben = 0;
        }
        if (herzPlus > 0 && BIBLIOTHEK.mitHerzen(b)) {
            neu.herzen = Math.min(BIBLIOTHEK.HERZEN, neu.herzen + herzPlus);
        }
        return neu;
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
