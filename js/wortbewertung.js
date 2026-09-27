/*
 * wortbewertung.js — wie schwer ein Lösungswort ist (seit 0.16.0).
 *
 * Nutzer 27.09.2026: „ein Bewertungssystem, von dem ich öfters sprach, in
 * Typoluck. Was es machen soll: Wörter bewerten, wie schwierig diese sind,
 * damit in einem Level-System mit Boss die Schwierigkeit erhöht wird."
 * Das ist das Werkzeug, auf das der Typoluck-Turm wartet (Runde 6, D0
 * Punkt 2). Seit 0.16.0 nimmt auch das Tageswort seine Stufe von hier
 * (bis 0.15.x: „seltene Buchstaben" in js\wertung.js).
 *
 * JEDES WORT DER LÖSUNGSLISTE BEKOMMT EINE ZAHL 0–100 aus vier Teilen:
 *
 *   a) LÖSER (Gewicht 0,40): Ein guter Löser spielt das Wort durch — wie
 *      der WordleBot: Er rät jedes Mal das erlaubte Wort, das im Mittel die
 *      wenigsten Kandidaten übrig lässt (dieselbe „Erwartung" wie
 *      js\wertung.js), gleich gute bevorzugt, wenn sie selbst Lösung sein
 *      können. Er startet mit den STARTWOERTER_ANZAHL besten Startwörtern
 *      (einmal gerechnet, fest), das Maß ist das Mittel der gebrauchten
 *      Versuche (7 = nicht in sechs gelöst). Gemappt: 2,0 Versuche → 0,
 *      4,5 → 1 (die Liste ist klein, der Löser braucht höchstens gut 4). Hauptgewicht, weil es genau misst, was ein guter Spieler
 *      erlebt: Wie lange bleibt das Wort unter anderen versteckt?
 *   b) FALLEN (0,15): wie viele andere Lösungswörter sich an GENAU einer
 *      Stelle unterscheiden (die „_ACHE"-Falle: Selbst wer vier Buchstaben
 *      kennt, muss raten). 0 → 0, 4 oder mehr → 1. Der Löser sieht das
 *      teils schon; die Falle trifft aber den Menschen härter als den
 *      Löser, der mit Trennwörtern arbeitet — daher eigenes Gewicht.
 *   c) MUSTER (0,20): doppelte Buchstaben (0,40 je Doppel, höchstens 1),
 *      Umlaute (0,30; ß kommt in der Liste nicht vor, es wird „ss"
 *      geschrieben) und seltene Buchstaben (0,30 × Seltenheit, die alte
 *      Rechnung aus js\wertung.js auf 0–1 gestreckt). Menschen denken
 *      selten an ein zweites E oder ein Ü — der Löser merkt davon nichts.
 *   e) VOKALE (0,25) — Nutzer-Regel 27.09.2026: „also einfache Worte sind
 *      welche mit zwei unterschiedlichen a e i o u". Genau zwei
 *      verschiedene Vokale → 0 (leicht); drei → 0,3 (leicht bis mittel,
 *      mehr Vokale verraten mehr, aber jeder muss an seinen Platz); vier
 *      und mehr → 0,5; nur einer (KLANG, PASTA) → 0,8; keiner aus a/e/i/o/u
 *      (nur Umlaut oder y) → 1. Deutliches Gewicht, damit die Regel
 *      sichtbar wirkt: allein sie verschiebt ein Wort um bis zu 25 Punkte.
 *   d) BEKANNTHEIT (Gewicht 0, Platz vorgesehen): Wie geläufig das Wort
 *      ist. Die Quelle einer Häufigkeitsliste entscheidet der Nutzer
 *      (docs\entscheidungen\offen-und-abgelehnt.md). Bis dahin neutral:
 *      `bekanntheit` ist null und zählt nicht mit.
 *
 * STUFEN: leicht / mittel / schwer über die Drittel der Zahlen (je rund
 * ein Drittel der Wörter — so kommen Tageswort-XP 15/20/30 im Mittel
 * gleich oft vor); dazu eine Skala 1–10 für den Turm (Zehntel). Die
 * Schwellen stehen in den Daten und ändern sich nur, wenn neu gerechnet
 * wird.
 *
 * WEIL (a) TEUER IST, rechnet die App nichts live: werkzeug\Woerter-Bewerten.ps1
 * rechnet vorab — die volle Bewertung nach werkzeug\wortbewertung-voll.js
 * (NICHT ausgeliefert) und nur Stufe/Skala je Wort nach
 * js\wortbewertung-daten.js (neu rechnen, wenn sich die Wortliste ändert;
 * tests\test-wortbewertung.js prüft, dass die Daten zur Liste passen). Von
 * Hand korrigiert wird in js\wortbewertung-korrektur.js über die
 * Werkzeug-Seite werkzeug\woerter-werkzeug.html (nur lokal, nur für den
 * Nutzer) — DIE KORREKTUR GEWINNT IMMER.
 */

const WORTBEWERTUNG = {

    /* Die Gewichte (Summe 1; `bekanntheit` 0, bis es eine Quelle gibt). */
    GEWICHTE: { loeser: 0.40, vokale: 0.25, fallen: 0.15, muster: 0.20, bekanntheit: 0 },

    /* e) Wie schwer die Zahl VERSCHIEDENER Vokale aus a/e/i/o/u macht
       (Nutzer-Regel, siehe Kopf): 2 = leicht (0), 3 = leicht bis mittel,
       4 und mehr = mittel, 1 = schwer, 0 (nur Umlaut/y) = am schwersten. */
    VOKAL_WERT: { 0: 1, 1: 0.8, 2: 0, 3: 0.3, 4: 0.5, 5: 0.5 },

    /* Mit wie vielen der besten Startwörter der Löser spielt (Mittel). */
    STARTWOERTER_ANZAHL: 3,

    /* Die Abbildung der Teilwerte auf 0–1 (siehe Kopf). */
    LOESER_VON: 2.0,
    LOESER_BIS: 4.5,
    FALLEN_VOLL: 4,
    VERSUCHE: 6,

    STUFEN_NAMEN: { 1: "leicht", 2: "mittel", 3: "schwer" },

    /* ---------------------------------------------------------------- *
     * Die Rechnung (rein — braucht nur die Wortlisten)
     * ---------------------------------------------------------------- */

    /* Das Farbmuster als Zahl 0–242 (Basis 3: 2 richtig, 1 vorhanden,
       0 falsch) — dieselbe Regel wie WORDLE.bewerten, nur schneller. */
    musterZahl(geraten, loesung) {
        const r = Array.from(geraten);
        const z = Array.from(loesung);
        const farbe = [0, 0, 0, 0, 0];
        const uebrig = {};
        for (let i = 0; i < 5; i++) {
            if (r[i] === z[i]) {
                farbe[i] = 2;
            } else {
                uebrig[z[i]] = (uebrig[z[i]] || 0) + 1;
            }
        }
        for (let i = 0; i < 5; i++) {
            if (farbe[i] !== 2 && uebrig[r[i]] > 0) {
                farbe[i] = 1;
                uebrig[r[i]]--;
            }
        }
        return farbe[0] * 81 + farbe[1] * 27 + farbe[2] * 9 + farbe[3] * 3 + farbe[4];
    },

    /* Summe der Gruppengrössen im Quadrat, geteilt durch n — wie viele
       Kandidaten im Mittel übrig bleiben. */
    _erwartung(geraten, kandidaten, tabelle) {
        const gruppen = new Map();
        for (const k of kandidaten) {
            const m = tabelle(geraten, k);
            gruppen.set(m, (gruppen.get(m) || 0) + 1);
        }
        let summe = 0;
        for (const g of gruppen.values()) {
            summe += g * g;
        }
        return summe / kandidaten.length;
    },

    /* Der beste Versuch für eine Kandidatenmenge: kleinste Erwartung, bei
       Gleichstand ein Wort, das selbst Lösung sein kann, dann das Alphabet. */
    _besterVersuch(kandidaten, erlaubt, tabelle) {
        if (kandidaten.length <= 2) {
            return kandidaten[0];
        }
        const istKandidat = new Set(kandidaten);
        let bestes = null;
        let besteErw = Infinity;
        for (const wort of erlaubt) {
            const e = WORTBEWERTUNG._erwartung(wort, kandidaten, tabelle);
            const besser = e < besteErw - 1e-9
                || (Math.abs(e - besteErw) <= 1e-9 && istKandidat.has(wort) && !istKandidat.has(bestes));
            if (besser) {
                bestes = wort;
                besteErw = e;
            }
        }
        return bestes;
    },

    /* Die besten Startwörter (aufsteigend nach Erwartung, dann Alphabet). */
    startwoerter(loesungen, erlaubt, anzahl) {
        const tabelle = WORTBEWERTUNG.musterZahl;
        return erlaubt.map((wort) => ({ wort: wort, e: WORTBEWERTUNG._erwartung(wort, loesungen, tabelle) }))
            .sort((a, b) => a.e - b.e || (a.wort < b.wort ? -1 : 1))
            .slice(0, anzahl)
            .map((x) => x.wort);
    },

    /* Ein Löser mit festem Startwort. Liefert versuche(ziel) → 1..7
       (7 = nicht in sechs Versuchen). Merkt sich die Entscheidungen je
       Kandidatenmenge, damit 567 Wörter schnell gehen. */
    loeser(loesungen, erlaubt, startwort) {
        const tabelle = WORTBEWERTUNG.musterZahl;
        const gemerkt = new Map();
        const naechster = (kandidaten) => {
            const schluessel = kandidaten.join(",");
            if (!gemerkt.has(schluessel)) {
                gemerkt.set(schluessel, WORTBEWERTUNG._besterVersuch(kandidaten, erlaubt, tabelle));
            }
            return gemerkt.get(schluessel);
        };
        return function versuche(ziel) {
            let kandidaten = loesungen;
            let geraten = startwort;
            for (let versuch = 1; versuch <= WORTBEWERTUNG.VERSUCHE; versuch++) {
                if (geraten === ziel) {
                    return versuch;
                }
                const m = tabelle(geraten, ziel);
                kandidaten = kandidaten.filter((k) => k !== geraten && tabelle(geraten, k) === m);
                geraten = naechster(kandidaten);
            }
            return WORTBEWERTUNG.VERSUCHE + 1;
        };
    },

    /* b) Wie viele Lösungswörter sich an genau einer Stelle unterscheiden. */
    nachbarn(wort, loesungen) {
        const w = Array.from(wort);
        let anzahl = 0;
        for (const anderes of loesungen) {
            if (anderes === wort) {
                continue;
            }
            const a = Array.from(anderes);
            let unterschiede = 0;
            for (let i = 0; i < 5 && unterschiede < 2; i++) {
                if (a[i] !== w[i]) {
                    unterschiede++;
                }
            }
            if (unterschiede === 1) {
                anzahl++;
            }
        }
        return anzahl;
    },

    /* Wie oft jeder Buchstabe in den Lösungswörtern vorkommt (Anteil der
       Wörter, die ihn haben). */
    buchstabenAnteile(loesungen) {
        const anteil = {};
        for (const wort of loesungen) {
            for (const z of new Set(Array.from(wort))) {
                anteil[z] = (anteil[z] || 0) + 1 / loesungen.length;
            }
        }
        return anteil;
    },

    _haeufigkeit(wort, anteil) {
        return Array.from(new Set(Array.from(wort))).reduce((s, z) => s + (anteil[z] || 0), 0);
    },

    /* c) Muster: { doppelt (Anzahl Doppel), umlaut (0/1), selten (0–1), wert (0–1) }.
       `grenzen` = { min, max } der Buchstaben-Häufigkeit über die Liste. */
    muster(wort, anteil, grenzen) {
        const zeichen = Array.from(wort);
        const zahl = {};
        for (const z of zeichen) {
            zahl[z] = (zahl[z] || 0) + 1;
        }
        const doppelt = Object.keys(zahl).reduce((s, z) => s + (zahl[z] - 1), 0);
        const umlaut = /[äöüß]/.test(wort) ? 1 : 0;
        const h = WORTBEWERTUNG._haeufigkeit(wort, anteil);
        const spanne = Math.max(1e-9, grenzen.max - grenzen.min);
        const selten = Math.min(1, Math.max(0, (grenzen.max - h) / spanne));
        const wert = Math.min(1, 0.40 * Math.min(1, doppelt) + 0.30 * umlaut + 0.30 * selten
            + (doppelt > 1 ? 0.10 : 0));
        return { doppelt: doppelt, umlaut: umlaut, selten: Math.round(selten * 100) / 100, wert: wert };
    },

    /* Wie viele VERSCHIEDENE Vokale aus a, e, i, o, u (Umlaute und y
       zählen nicht). */
    vokale(wort) {
        return new Set(Array.from(String(wort)).filter((z) => "aeiou".indexOf(z) !== -1)).size;
    },

    /* Die Zahl 0–100 aus den Teilen. */
    zahl(teile) {
        const g = WORTBEWERTUNG.GEWICHTE;
        const e = WORTBEWERTUNG.VOKAL_WERT[Math.min(5, teile.vokale || 0)];
        const a = Math.min(1, Math.max(0, (teile.versuche - WORTBEWERTUNG.LOESER_VON)
            / (WORTBEWERTUNG.LOESER_BIS - WORTBEWERTUNG.LOESER_VON)));
        const b = Math.min(1, teile.nachbarn / WORTBEWERTUNG.FALLEN_VOLL);
        const c = teile.muster;
        const d = (typeof teile.bekanntheit === "number") ? teile.bekanntheit : 0;
        return Math.round(100 * (g.loeser * a + g.vokale * e + g.fallen * b + g.muster * c + g.bekanntheit * d));
    },

    /* Alles für eine Wortliste — das Werkzeug schreibt das Ergebnis nach
       js\wortbewertung-daten.js. `melden(i, n)` zeigt den Fortschritt. */
    berechnen(loesungen, erlaubt, melden) {
        const starts = WORTBEWERTUNG.startwoerter(loesungen, erlaubt, WORTBEWERTUNG.STARTWOERTER_ANZAHL);
        const loeser = starts.map((start) => WORTBEWERTUNG.loeser(loesungen, erlaubt, start));
        const anteil = WORTBEWERTUNG.buchstabenAnteile(loesungen);
        const haeufig = loesungen.map((w) => WORTBEWERTUNG._haeufigkeit(w, anteil));
        const grenzen = { min: Math.min(...haeufig), max: Math.max(...haeufig) };
        const woerter = {};
        loesungen.forEach((wort, i) => {
            const versuche = loeser.map((l) => l(wort));
            const mittel = Math.round(100 * versuche.reduce((s, v) => s + v, 0) / versuche.length) / 100;
            const n = WORTBEWERTUNG.nachbarn(wort, loesungen);
            const m = WORTBEWERTUNG.muster(wort, anteil, grenzen);
            const v = WORTBEWERTUNG.vokale(wort);
            const teile = { versuche: mittel, vokale: v, nachbarn: n, muster: m.wert, bekanntheit: null };
            woerter[wort] = [WORTBEWERTUNG.zahl(teile), mittel, n, Math.round(m.wert * 100) / 100,
                m.doppelt, m.umlaut, m.selten, v];
            if (melden) {
                melden(i + 1, loesungen.length);
            }
        });
        const sortiert = loesungen.map((w) => woerter[w][0]).sort((a, b) => a - b);
        const bei = (anteilWert) => sortiert[Math.min(sortiert.length - 1, Math.floor(anteilWert * sortiert.length))];
        return {
            startwoerter: starts,
            grenzen: grenzen,
            /* Ab dieser Zahl mittel bzw. schwer (Drittel). */
            stufen: [bei(1 / 3), bei(2 / 3)],
            /* Ab dieser Zahl Skala 2 … 10 (Zehntel). */
            skala: [1, 2, 3, 4, 5, 6, 7, 8, 9].map((k) => bei(k / 10)),
            woerter: woerter
        };
    },

    /* Eine kurze Prüfsumme der Lösungsliste (Reihenfolge zählt). */
    pruefsumme(liste) {
        let h = 2166136261;
        for (const z of liste.join(" ")) {
            h ^= z.codePointAt(0);
            h = Math.imul(h, 16777619) >>> 0;
        }
        return h.toString(16);
    },

    /* ---------------------------------------------------------------- *
     * Zur Laufzeit: nur die Stufen + Korrektur von Hand
     *
     * Die App bekommt NUR, was sie braucht (Nutzer 27.09.2026: „nur ich
     * soll diese filtern und die ganze Library sehen können"):
     * js\wortbewertung-daten.js trägt je Lösungswort Stufe und Skala als
     * zwei Ziffernfolgen in Listen-Reihenfolge — keine Zahlen, keine
     * Teilwerte. Die ganze Bewertung (Zahl, Löser, Fallen, Muster) liegt in
     * werkzeug\wortbewertung-voll.js, das NICHT ausgeliefert wird und nur
     * die Werkzeug-Seite werkzeug\woerter-werkzeug.html liest.
     * ---------------------------------------------------------------- */

    /* `vorhanden` ist der Wert der Seite (typeof-geprüft — ein `const` oben
       in einem Skript steht NICHT an globalThis), sonst in Node die Datei. */
    _global(vorhanden, datei, leer) {
        if (typeof vorhanden !== "undefined" && vorhanden !== null) {
            return vorhanden;
        }
        if (typeof require === "function") {
            try {
                return require(datei);
            } catch (fehler) {
                return leer;
            }
        }
        return leer;
    },

    /* Für Tests und die Werkzeug-Seite: andere Daten/Korrekturen einsetzen. */
    _datenErsatz: null,
    _korrekturErsatz: null,
    _listeErsatz: null,

    daten() {
        return WORTBEWERTUNG._datenErsatz
            || WORTBEWERTUNG._global(typeof WORTBEWERTUNG_DATEN !== "undefined" ? WORTBEWERTUNG_DATEN : undefined,
                "./wortbewertung-daten.js", null);
    },

    korrektur() {
        return WORTBEWERTUNG._korrekturErsatz
            || WORTBEWERTUNG._global(typeof WORTBEWERTUNG_KORREKTUR !== "undefined" ? WORTBEWERTUNG_KORREKTUR : undefined,
                "./wortbewertung-korrektur.js", {}) || {};
    },

    _liste() {
        if (WORTBEWERTUNG._listeErsatz) {
            return WORTBEWERTUNG._listeErsatz;
        }
        const woerter = WORTBEWERTUNG._global(typeof WOERTER_DE !== "undefined" ? WOERTER_DE : undefined,
            "./woerter-de.js", null);
        return woerter ? woerter.loesungen : [];
    },

    _stelle: null,
    _stelleFuer: null,

    _index(wort) {
        const liste = WORTBEWERTUNG._liste();
        if (WORTBEWERTUNG._stelleFuer !== liste) {
            WORTBEWERTUNG._stelle = new Map(liste.map((w, i) => [w, i]));
            WORTBEWERTUNG._stelleFuer = liste;
        }
        const i = WORTBEWERTUNG._stelle.get(wort);
        return (typeof i === "number") ? i : -1;
    },

    /* Aus den Daten (ohne Korrektur): { stufe, skala } oder null. */
    _auto(wort) {
        const d = WORTBEWERTUNG.daten();
        const i = WORTBEWERTUNG._index(wort);
        if (!d || i < 0 || i >= d.stufen.length) {
            return null;
        }
        return { stufe: Number(d.stufen[i]), skala: parseInt(d.skala[i], 16) + 1 };
    },

    /* Stufe, Skala, ungeeignet eines Wortes — DIE KORREKTUR GEWINNT IMMER:
       { wort, stufe, skala, ungeeignet, korrigiert, auto } oder null. */
    eintrag(wort) {
        const w = String(wort || "").toLowerCase();
        const auto = WORTBEWERTUNG._auto(w);
        if (!auto) {
            return null;
        }
        const k = WORTBEWERTUNG.korrektur()[w] || {};
        const stufe = [1, 2, 3].indexOf(k.stufe) !== -1 ? k.stufe : auto.stufe;
        const skala = (Number.isInteger(k.skala) && k.skala >= 1 && k.skala <= 10) ? k.skala : auto.skala;
        return {
            wort: w, stufe: stufe, skala: skala, ungeeignet: k.ungeeignet === true,
            korrigiert: stufe !== auto.stufe || skala !== auto.skala || k.ungeeignet === true,
            auto: auto
        };
    },

    /* 1 leicht, 2 mittel, 3 schwer — mit Korrektur; unbekannt: 2. */
    stufe(wort) {
        const e = WORTBEWERTUNG.eintrag(wort);
        return e ? e.stufe : 2;
    },

    /* 1–10 für den Turm — mit Korrektur; unbekannt: 5. */
    skala(wort) {
        const e = WORTBEWERTUNG.eintrag(wort);
        return e ? e.skala : 5;
    },

    ungeeignet(wort) {
        const e = WORTBEWERTUNG.eintrag(wort);
        return !!(e && e.ungeeignet);
    },

    /* Aus der vollen Bewertung (Werkzeug) die App-Daten: zwei Ziffernfolgen
       in Listen-Reihenfolge (Stufe 1–3; Skala 1–10 als 0–9). */
    appDaten(voll, loesungen) {
        const stufen = [];
        const skala = [];
        for (const wort of loesungen) {
            const zahl = voll.woerter[wort][0];
            const st = zahl >= voll.stufen[1] ? 3 : (zahl >= voll.stufen[0] ? 2 : 1);
            const sk = 1 + voll.skala.filter((g) => zahl >= g).length;
            stufen.push(String(st));
            skala.push((sk - 1).toString(16));
        }
        return { anzahl: loesungen.length, pruefsumme: WORTBEWERTUNG.pruefsumme(loesungen),
            stufen: stufen.join(""), skala: skala.join("") };
    },

    /* Der Inhalt von js\wortbewertung-korrektur.js zu einer Korrektur —
       die Werkzeug-Seite bietet ihn zum Herunterladen an. */
    korrekturDatei(korrektur) {
        const sauber = {};
        for (const wort of Object.keys(korrektur || {}).sort()) {
            const k = korrektur[wort] || {};
            const eintrag = {};
            if ([1, 2, 3].indexOf(k.stufe) !== -1) {
                eintrag.stufe = k.stufe;
            }
            if (Number.isInteger(k.skala) && k.skala >= 1 && k.skala <= 10) {
                eintrag.skala = k.skala;
            }
            if (k.ungeeignet === true) {
                eintrag.ungeeignet = true;
            }
            if (Object.keys(eintrag).length && /^[a-zäöü]{5}$/.test(wort)) {
                sauber[wort] = eintrag;
            }
        }
        return "/*\n"
            + " * wortbewertung-korrektur.js — Korrekturen von Hand zur Wort-Bewertung\n"
            + " * (js\\wortbewertung.js). Die Korrektur gewinnt immer. Entsteht auf der\n"
            + " * Werkzeug-Seite werkzeug\\woerter-werkzeug.html → „Korrekturen\n"
            + " * herunterladen\"; übernehmen mit werkzeug\\Wortkorrektur-Uebernehmen.ps1.\n"
            + " * Je Wort: stufe 1–3 (leicht/mittel/schwer), skala 1–10, ungeeignet true.\n"
            + " */\n\n"
            + "const WORTBEWERTUNG_KORREKTUR = " + JSON.stringify(sauber, null, 4) + ";\n\n"
            + "if (typeof module !== \"undefined\" && module.exports) {\n"
            + "    module.exports = WORTBEWERTUNG_KORREKTUR;\n"
            + "}\n";
    },

    /* ---------------------------------------------------------------- *
     * Der Tageswort-Plan (Vorschlag, ändert nichts)
     * ---------------------------------------------------------------- */

    /* Die Stufen der nächsten `tage` Tageswörter ab `datum`, dazu, wo
       dreimal hintereinander dieselbe schwere Stufe käme. */
    plan(datum, tage, tageswort, plusTage) {
        const zeilen = [];
        for (let i = 0; i < tage; i++) {
            const tag = plusTage(datum, i);
            const t = tageswort(tag);
            const e = WORTBEWERTUNG.eintrag(t.wort);
            zeilen.push({ datum: tag, nummer: t.nummer, wort: t.wort, stufe: e ? e.stufe : 2,
                ungeeignet: !!(e && e.ungeeignet) });
        }
        zeilen.forEach((z, i) => {
            z.dreiSchwer = i >= 2 && [0, 1, 2].every((k) => zeilen[i - k].stufe === 3);
        });
        const zahl = { 1: 0, 2: 0, 3: 0 };
        zeilen.forEach((z) => { zahl[z.stufe]++; });
        return { zeilen: zeilen, verteilung: zahl, dreiSchwer: zeilen.filter((z) => z.dreiSchwer).length };
    }
};

if (typeof module !== "undefined" && module.exports) {
    module.exports = WORTBEWERTUNG;
}
