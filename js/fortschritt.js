/*
 * fortschritt.js — Level, XP, Serie und „Heute" über alle UPCrew-Spiele
 * (seit 0.10.0, UPCrew-Runde 5; seit 0.11.0 im gemeinsamen Zweig-Vertrag,
 * Runde 6 Teil A; seit 0.12.0 mit Profil-Werten).
 *
 * Nutzer 27.09.2026 (UPCrew-Konzept FORTSCHRITT.md, „GÜLTIGER STAND";
 * Aufträge Design-Auftrag AUFTRAEGE-RUNDE-5.md und -RUNDE-6.md):
 * erstmal SOLO.
 *   Level  Ring ums Profilbild, Zahl daneben; XP aus ALLEN UPCrew-Spielen
 *          (Summe der Zweige, nur gerechnet, nie gespeichert).
 *          XP: Partie +10, je neue Figur +10, Tagesaufgabe nach
 *          Schwierigkeit leicht 15 · mittel 20 · schwer 30 (seit 0.14.0,
 *          Nachtrag Runde 6 — dieselbe Formel wie Blunderluck, dort Matt in
 *          1/2/3; ×1,5, wenn das andere Spiel seine Tagesaufgabe heute schon
 *          geschafft hat), Serie +5 … +35. Die Stufe des Tageworts rechnet
 *          js\wertung.js (`schwierigkeit`).
 *   Heute  je Spiel eine Tagesaufgabe — in Typoluck das Tageswort, in
 *          Blunderluck das Tagesbrett.
 *   Serie  Tage in Folge, an denen in IRGENDEINEM Spiel die Tagesaufgabe
 *          geschafft wurde (aus den `tage` aller Zweige gerechnet). Seit
 *          0.26.0 ohne Serien-Schutz: ein fehlender Tag beendet sie.
 *   Rahmen ab Level 10, dann alle 5 Level (10, 15, 20 …) — EINE Regel für beide Spiele
 *          (seit 0.14.0, Namen wie Blunderluck `RAHMEN`/`TITEL`).
 * Seit 0.18.0 hat Typoluck die BIBLIOTHEK (js\bibliothek.js, Typolucks
 * Fassung des Turms): ihre Figuren stehen im Zweig unter `turm.figuren`
 * („Buch-Level", Level ab 0, 1–3 Figuren — dieselbe Form wie Blunderlucks
 * „Ort-Stufe", Regel §11b erlaubt sie schon). Gemeldet über `partie`
 * (`angaben.bibliothek`); ein anderes `turm`-Feld (`schwuere`) wandert
 * unberührt durch.
 *
 * DER DATENVERTRAG (gemeinsam mit Blunderluck, Runde 6 Teil A; Vorlage ist
 * der Kopf von Blunderluck fortschritt.js):
 *
 *     Browser-Speicher  upcrew.fortschritt = { "<spieler-id oder gast>": FORTSCHRITT }
 *                       (Gäste und Nicht-Angemeldete unter „gast", wie Blunderluck)
 *     Konto             spieler/konten/<uid>/fortschritt = FORTSCHRITT
 *                       (erst mit der Datenbank-Regel — bis dahin Gerät)
 *
 *     FORTSCHRITT = {
 *         version: 1,
 *         spiele: {
 *             typoluck: {                      // NUR diesen Zweig schreibt Typoluck
 *                 xp, partien,
 *                 gezaehlt: [],                // Form wie Blunderluck; seit 0.35.0 die schon
 *                                              // gebuchten Duelle "duell-<Kennung>" (höchstens 100)
 *                 stand,                       // Zeitpunkt der letzten Änderung;
 *                                              // beim Zusammenführen gewinnt der neuere Zweig
 *                 heute: { datum: "YYYY-MM-DD", versuche, figuren },  // figuren 0 = nicht geschafft
 *                 tage:  ["YYYY-MM-DD", …],    // Tage mit geschaffter Tagesaufgabe (höchstens 60)
 *                 zaehler: {
 *                     tagesaufgaben,           // so oft die Tagesaufgabe geschafft
 *                     beideTage,               // Tage, an denen DIESES Spiel das zweite war
 *                     figuren,                 // Figuren AUSSERHALB des Turms (Tageswort)
 *                     besteSerie,              // längste Serie (über alle Spiele gerechnet)
 *                     koennenSumme, koennenAnzahl, koennenBeste   // seit 0.12.0, Statistik
 *                 },
 *                 taten: [ids],                // erfüllte Taten (seit 0.13.0, TATEN)
 *                 turm: { figuren: { "1-0": 2, … } }  // seit 0.18.0: die Bibliothek,
 *                                              // je Level die BESTE Wertung 1–3
 *             },
 *             blunderluck: { … }               // wandert UNVERÄNDERT durch; gelesen
 *         }                                    // werden nur xp, partien, heute, tage,
 *     }                                        // zaehler, turm.figuren
 *
 * Felder nur ERGÄNZEN, nie umdeuten; unbekannte Felder — oben wie im Zweig —
 * bleiben erhalten (dieselbe Regel wie für die Konten, js\spieler.js).
 * Figuren eines Zweigs = `zaehler.figuren` + Summe `turm.figuren` (so zählt
 * Blunderlucks Turm mit, ohne dass es doppelt zählt).
 *
 * DER UMZUG (0.10.0 → 0.11.0, einmalig): 0.10.0 schrieb einen FLACHEN Stand
 * { stand, xp, level, serie: { tage, schutz, zuletzt }, heute: { datum,
 * brett, wort, xp }, turm, taten, zaehler }. Der ist live — nichts darf
 * verloren gehen. `umziehen` macht daraus den Zweig `spiele.typoluck`:
 * XP, Partien, Zähler und Taten wandern hinüber, die Serie wird zu ebenso
 * vielen Tagen bis `zuletzt`, das heutige Tageswort zu `heute`. Der
 * Serien-Schutz wird seitdem aus dem Level GERECHNET (wie in Blunderluck) —
 * das ist nie weniger als der gespeicherte, weil der nur aus denselben
 * Level-Aufstiegen kam. Der alte Stand bleibt wörtlich erhalten — seit
 * 0.14.0 NUR auf dem Gerät, unter einem eigenen Schlüssel
 * (`UMZUG_SCHLUESSEL`), nie im Zweig: Die Datenbank-Regel §11b
 * nimmt nur die Felder des Vertrags an, und
 * Blunderluck schickt beim Konto-Abgleich ALLE Zweige mit.
 *
 * FÜRS KONTO: `fuerKonto(stand)` liefert genau die Felder, die §11b
 * erlaubt (version, spiele.typoluck mit xp, partien, stand, gezaehlt, tage,
 * heute {datum, versuche, figuren}, zaehler {Buchstaben: Zahl}, taten; seit
 * 0.18.0 turm {figuren {"b-l": 1–3}}, nur wenn es Figuren gibt).
 * SEIT 0.34.2 MIT DEN ZWEIGEN DER ANDEREN SPIELE (`KONTO_SPIELE`) und
 * `schutz`, in der Form der Regel, sonst unverändert: Der Konto-Eintrag wird
 * bei Freunden und Abzeichen als GANZES geschrieben (js\speicher-konten.js
 * schickt den Fortschritt dazu durch `fuerKonto`) — bis 0.34.1 fiel dabei
 * der Zweig des anderen Spiels am Konto weg. Das Senden nach einer Runde
 * (js\fortschritt-abgleich.js) nimmt weiter nur den eigenen Zweig.
 * Erkannt wird auch die Mischform, falls Blunderluck den flachen Stand vor
 * Typoluck angefasst hat (flache Felder oben UND `spiele` ohne Typoluck).
 *
 * WO ES LIEGT: im Browser-Speicher unter `upcrew.fortschritt`, je
 * Spieler-Id ein Eintrag — gemeinsam mit Blunderluck, weil beide Spiele auf
 * up-birdo.github.io denselben Speicher haben (lokal ebenso auf 8093).
 *
 * Alles hier ist rein: Jede Funktion bekommt den Stand und liefert einen
 * neuen. Gelesen und geschrieben wird nur in `laden` / `aendern` /
 * `umziehenAlle`. Achtung: alles läuft im Browser und ist fälschbar — für
 * Solo in Ordnung, für einen Rang gegen Menschen nicht (Auftrag Runde 5).
 *
 * DIE SERIE SEIT 0.17.0 (= Blunderluck v0.152.0) (Nutzer 27.09.2026: „Serie soll einfach: einmal
 * eine Runde starten, egal welches Game" · „ja über 60"). In BEIDEN
 * Spielen gleich (die Rechnung seit 0.28.1 in js\fortschritt-kern.js):
 *   - Ein Tag zählt, sobald in IRGENDEINEM UPCrew-Spiel eine Runde
 *     GESTARTET wird (`rundeGestartet`; Blunderluck: beim Anpfiff jeder
 *     Partie; Typoluck: beim ersten abgegebenen Versuch einer Runde,
 *     Tageswort wie Übung — js/app.js `rundeGestartet`). Der Tag kommt in `tage`
 *     (höchstens 60 gemerkt). Die Tagesaufgabe trägt ihren Tag weiter ein;
 *     ihre XP und die Karten „Heute" bleiben, wie sie sind.
 *   - ÜBER 60 TAGE trägt ein ZÄHLER am Zweig, nur Zahlen in `zaehler` (die
 *     Regel §11b erlaubt dort beliebige Buchstaben-Namen mit Zahlen — keine
 *     Regeländerung): `serie` = Länge der Serie, `serieBis` = ihr letzter Tag
 *     als Zahl JJJJMMTT, `serieSchutz` = in dieser Serie schon überbrückte
 *     Tage. Jedes Spiel schreibt nur SEINEN Zähler, und zwar den über BEIDE
 *     Spiele gerechneten Stand (`serieStand`).
 *   - GERECHNET wird so (`serieStand`): Man nimmt den Zähler mit dem
 *     NEUESTEN `serieBis` aus allen Zweigen und geht von dort die Tage aus
 *     `tage` (aller Zweige) vorwärts: der nächste Tag +1; EIN fehlender Tag
 *     wird von einem Schutz überbrückt (+1, der fehlende Tag zählt nicht mit);
 *     zwei oder mehr fehlende Tage beginnen neu bei 1. Ohne Zähler (alte
 *     Stände) beginnt es beim ältesten Tag — das ergibt genau die bisherige
 *     Rechnung. Warum ein Zähler statt einer langen Tagesliste: Die Liste
 *     wüchse endlos und wäre gegen die Regel (§11b: `tage` höchstens 1000
 *     Einträge) irgendwann zu lang; zwei Zahlen reichen für jede Länge.
 *   - SCHUTZ und SCHILD gibt es seit 0.26.0 nicht mehr (Nutzer 29.09.2026:
 *     „serien schild raus"): `schutzVerdient` und `schildVorrat` liefern 0,
 *     ein fehlender Tag beendet die Serie. Die Zähler `serieSchutz`,
 *     `schildGekauft` und `schildGenutzt` bleiben liegen (nichts löschen,
 *     Regeln unverändert); nicht verbrauchte Schilde erstattet
 *     `schildeErstatten` einmal in Münzen.
 *   - ZUSAMMENFÜHREN (gleiches Spiel, zwei Geräte): Zähler, die nur wachsen
 *     (Münzen, Käufe, Tagesaufgaben …), nehmen je Name den GRÖSSEREN Wert;
 *     die drei Serien-Zähler kommen gemeinsam aus der Fassung mit dem
 *     neueren `serieBis` (`zusammenfuehren`).
 *
 * SEIT 0.28.1 IN ZWEI DATEIEN: Was in jedem UPCrew-Spiel gleich ist —
 * Zusammenführen, die Serie, die Erstattung alter Schilde, der öffentliche
 * Auszug, Spielzeit und „dabei seit", die Datums-Helfer, `RAHMEN`/`TITEL` —
 * steht im Baustein js\fortschritt-kern.js (`FORTSCHRITT_KERN`, Quelle
 * den UPCrew-Bausteinen (Kern), nie hier abwandeln; in index.html VOR dieser
 * Datei). Hier steht nur Typolucks Teil; `FORTSCHRITT` ist beides zusammen.
 * Der Kern ruft alles über den Namen `FORTSCHRITT` und braucht von hier
 * `APP`, `_zahl`, `alleTage`, `gesamtXp`, `level`, `levelAus`,
 * `normalisieren`, `spielLeer` (`FORTSCHRITT_KERN_ERWARTET`). Kein Glied
 * des Kerns wird hier noch einmal geschrieben (tests\test-fortschritt.js).
 * Ausserhalb des Browsers muss `FORTSCHRITT_KERN` vorher als globaler Name
 * bereitstehen (tests\umgebung.js).
 */

const FORTSCHRITT = Object.assign({}, FORTSCHRITT_KERN, {

    SCHLUESSEL: "upcrew.fortschritt",

    /* Der Eintrag für Gäste und Nicht-Angemeldete — wie Blunderluck. */
    GAST: "gast",

    /* Dieses Spiel — der Zweig, den Typoluck schreibt. */
    APP: "typoluck",

    /* Die XP-Quellen — die einzige Stelle mit diesen Zahlen. */
    XP: {
        partie: 10,
        figur: 10,
        /* Grund-XP der Tagesaufgabe je Schwierigkeit 1 leicht, 2 mittel,
           3 schwer (seit 0.14.0; vorher fest 20). */
        tagesaufgabe: { 1: 15, 2: 20, 3: 30 },
        serieJeTag: 5,
        serieHoechstens: 7,
        beideFaktor: 1.5,
        /* Das Duell (seit 0.35.0, Nutzer 04.10.2026: „duell soll xp geben
           ein wenig mehr wie die bibliothek"). Massstab: eine gewonnene
           Station der Bibliothek bringt `partie` + je neuer Figur `figur`,
           also höchstens 10 + 3 × 10 = 40 XP. Im Duell gibt JEDES geholte
           Wort (ein Punkt, auch „beide") etwas mehr als eine solche Station,
           ein Sieg legt einen kleinen Zuschlag drauf; Niederlage und
           Unentschieden bringen nur die Wort-XP. Keine Münzen. Gebucht wird
           genau einmal je Duell (`duellZaehlen`). */
        duellWort: 45,
        duellSieg: 20
    },

    /* Die Liste der gezählten Partien (`gezaehlt`): höchstens so viele
       Einträge (Regel §13: Stelle 0–99, je Eintrag höchstens 64 Zeichen). */
    GEZAEHLT_MAX: 100,
    /* Vorsilbe der Duell-Einträge darin: "duell-" + Kennung (20 Zeichen). */
    DUELL_VORSILBE: "duell-",

    /* Der alte 0.10.0-Stand nach dem Umzug — nur auf dem Gerät (seit
       0.14.0, vorher im Zweig unter `umzug`). Liegt im Namensraum von
       Typoluck, nicht unter `upcrew.`. */
    UMZUG_SCHLUESSEL: "typoluck.fortschritt-umzug",

    /* Die XP-Quellen zum Anzeigen (Profil) — aus denselben Zahlen. Kurz,
       kein Satz (UPCrew-Standard). */
    quellen() {
        const xp = FORTSCHRITT.XP;
        return [
            { zeichen: "partie", wert: "+" + xp.partie, titel: "Partie" },
            { zeichen: "koenig", wert: "+" + xp.figur, titel: "Figur" },
            { zeichen: "kalender", wert: "+" + xp.tagesaufgabe[1] + "…" + xp.tagesaufgabe[3], titel: "Heute" },
            { zeichen: "beide", wert: "×" + String(xp.beideFaktor).replace(".", ","), titel: "Beide" },
            { zeichen: "serie", wert: "+" + xp.serieJeTag + "…" + xp.serieJeTag * xp.serieHoechstens, titel: "Serie" }
        ];
    },

    /* Die Taten (seit 0.13.0, Nutzer 27.09.2026: „Taten bauen, damit ich
       sie sehe"): Jede schaltet ein NEUES Sammelstück frei (js\sammlung.js,
       Feld `tat`). Nur, was sicher messbar ist. Erfüllt wird eine Tat beim
       Melden einer Runde und steht dann im Zweig unter `taten`; die Serie
       zählt auch rückwirkend (sie ist aus den Tagen gerechnet). `titel`
       steht beim Antippen des gesperrten Stücks — kurz, kein Satz. */
    TATEN: [
        { id: "zweiter-versuch", titel: "Tageswort im 2. Versuch" },
        { id: "serie-7", titel: "7 Tage Serie" },
        { id: "schwer-geloest", titel: "Gelöst im Harten Modus" },
        { id: "koennen-90", titel: "90 % Können in einer Runde" }
    ],

    /* Die Zähler, die Typoluck in seinem Zweig führt. */
    ZAEHLER: ["tagesaufgaben", "beideTage", "figuren", "besteSerie",
        "koennenSumme", "koennenAnzahl", "koennenBeste"],

    /* Die flachen Felder von 0.10.0 — nur für den Umzug. */
    FLACHE_FELDER: ["stand", "xp", "level", "serie", "heute", "turm", "taten", "zaehler"],

    /* Welcher Speicher benutzt wird. Die Tests setzen hier einen Ersatz ein. */
    _speicher() {
        return (typeof window !== "undefined") ? window.localStorage : null;
    },

    /* ---------------------------------------------------------------- *
     * Kleine Helfer
     * ---------------------------------------------------------------- */

    /* Eine Zahl ≥ 0, ganz, höchstens `hoechstens` — sonst 0. */
    _zahl(wert, hoechstens) {
        return (typeof wert === "number" && isFinite(wert) && wert > 0)
            ? Math.min(Math.floor(wert), hoechstens || FORTSCHRITT.XP_MAX) : 0;
    },

    _kopie(wert) {
        return wert === undefined ? undefined : JSON.parse(JSON.stringify(wert));
    },

    /* ---------------------------------------------------------------- *
     * Grundformen
     * ---------------------------------------------------------------- */

    zweigLeer() {
        const zaehler = {};
        for (const feld of FORTSCHRITT.ZAEHLER) {
            zaehler[feld] = 0;
        }
        return {
            xp: 0, partien: 0, gezaehlt: [], stand: 0,
            heute: { datum: "", versuche: 0, figuren: 0 },
            tage: [],
            zaehler: zaehler,
            taten: []
        };
    },

    /* Den eigenen Zweig in Form bringen. Unbekannte Felder bleiben. */
    _zweigNormalisieren(roh) {
        const quelle = FORTSCHRITT._istObjekt(roh) ? roh : {};
        const zweig = Object.assign(FORTSCHRITT.zweigLeer(), FORTSCHRITT._kopie(quelle));
        zweig.xp = FORTSCHRITT._zahl(quelle.xp);
        zweig.partien = FORTSCHRITT._zahl(quelle.partien);
        zweig.stand = FORTSCHRITT._zahl(quelle.stand, Number.MAX_SAFE_INTEGER);
        zweig.gezaehlt = Array.isArray(quelle.gezaehlt)
            ? quelle.gezaehlt.filter((id) => typeof id === "string" && id !== "") : [];
        const h = FORTSCHRITT._istObjekt(quelle.heute) ? quelle.heute : {};
        zweig.heute = Object.assign({ datum: "", versuche: 0, figuren: 0 }, FORTSCHRITT._kopie(h), {
            datum: FORTSCHRITT._istDatum(h.datum) ? h.datum : "",
            versuche: FORTSCHRITT._zahl(h.versuche, 1000),
            figuren: FORTSCHRITT._zahl(h.figuren, 3)
        });
        zweig.tage = FORTSCHRITT._tageVon(quelle);
        const zaehler = FORTSCHRITT._istObjekt(quelle.zaehler) ? FORTSCHRITT._kopie(quelle.zaehler) : {};
        for (const feld of FORTSCHRITT.ZAEHLER) {
            zaehler[feld] = FORTSCHRITT._zahl(zaehler[feld]);
        }
        zweig.zaehler = zaehler;
        zweig.taten = Array.isArray(quelle.taten) ? quelle.taten.filter((t) => typeof t === "string") : [];
        /* Die Bibliothek (seit 0.18.0): nur Schlüssel „Zahl-Zahl" mit 1 bis
           3 Figuren (wie Blunderluck). Andere Felder unter `turm` bleiben. */
        if ("turm" in quelle) {
            zweig.turm = Object.assign({}, FORTSCHRITT._istObjekt(quelle.turm) ? FORTSCHRITT._kopie(quelle.turm) : {},
                { figuren: FORTSCHRITT._turmTabelle(quelle.turm) });
            /* Seit 0.20.0: Merker der Bibliothek (Truhe/Händler betreten). */
            if (FORTSCHRITT._istObjekt(quelle.turm) && "schwuere" in quelle.turm) {
                zweig.turm.schwuere = FORTSCHRITT._merkerTabelle(quelle.turm);
            }
        }
        /* `umzug` gehört seit 0.14.0 nur aufs Gerät (UMZUG_SCHLUESSEL). */
        delete zweig.umzug;
        return zweig;
    },

    /* Die Figuren-Tabelle eines `turm`-Felds, bereinigt: { "b-l": 1–3 }. */
    _turmTabelle(turm) {
        const roh = (FORTSCHRITT._istObjekt(turm) && FORTSCHRITT._istObjekt(turm.figuren)) ? turm.figuren : {};
        const figuren = {};
        for (const schluessel of Object.keys(roh)) {
            const wert = roh[schluessel];
            if (/^\d{1,2}-\d{1,2}$/.test(schluessel) && Number.isInteger(wert) && wert > 0) {
                figuren[schluessel] = Math.min(wert, 3);
            }
        }
        return figuren;
    },

    /* Die Merker eines `turm`-Felds (seit 0.20.0: betretene Truhen und
       Händler der Bibliothek, js/bibliothek.js), bereinigt nach Regel §11b:
       { "<1–3 Ziffern>": 0–3 }. */
    _merkerTabelle(turm) {
        const roh = (FORTSCHRITT._istObjekt(turm) && FORTSCHRITT._istObjekt(turm.schwuere)) ? turm.schwuere : {};
        const merker = {};
        for (const schluessel of Object.keys(roh)) {
            const wert = roh[schluessel];
            if (/^\d{1,3}$/.test(schluessel) && Number.isInteger(wert) && wert >= 0) {
                merker[schluessel] = Math.min(wert, 3);
            }
        }
        return merker;
    },

    /* Der ganze Bibliothek-Stand für js/bibliothek.js: { figuren, schwuere }. */
    turmStand(stand) {
        const turm = FORTSCHRITT.zweig(stand).turm;
        return { figuren: FORTSCHRITT._turmTabelle(turm), schwuere: FORTSCHRITT._merkerTabelle(turm) };
    },

    /* Eine Station ohne Figuren als betreten merken (seit 0.20.0, Truhe und
       Händler der Bibliothek). Rein: liefert den neuen Stand. */
    stationMerken(alt, schluessel, zeitpunkt) {
        const stand = FORTSCHRITT.normalisieren(alt);
        const zweig = stand.spiele[FORTSCHRITT.APP] || FORTSCHRITT.zweigLeer();
        if (!/^\d{1,3}$/.test(String(schluessel))) {
            return stand;
        }
        const turm = FORTSCHRITT._istObjekt(zweig.turm) ? zweig.turm : {};
        const merker = FORTSCHRITT._merkerTabelle(turm);
        merker[String(schluessel)] = 1;
        zweig.turm = Object.assign({}, turm, { figuren: FORTSCHRITT._turmTabelle(turm), schwuere: merker });
        zweig.stand = Math.max(zweig.stand + 1, zeitpunkt || 0);
        stand.spiele[FORTSCHRITT.APP] = zweig;
        return stand;
    },

    /* Die Figuren der Bibliothek ({ "1-0": 2, … }) — leer ohne. */
    turmFiguren(stand) {
        return FORTSCHRITT._turmTabelle(FORTSCHRITT.zweig(stand).turm);
    },

    /* ---------------------------------------------------------------- *
     * Der Umzug aus 0.10.0 (einmalig)
     * ---------------------------------------------------------------- */

    /* Liegt ein flacher 0.10.0-Stand vor (auch als Mischform), der noch
       keinen Typoluck-Zweig hat? */
    umzugNoetig(roh) {
        if (!FORTSCHRITT._istObjekt(roh)) {
            return false;
        }
        if (FORTSCHRITT._istObjekt(roh.spiele) && FORTSCHRITT._istObjekt(roh.spiele[FORTSCHRITT.APP])) {
            return false;
        }
        return typeof roh.xp === "number" || FORTSCHRITT._istObjekt(roh.serie)
            || FORTSCHRITT._istObjekt(roh.heute) || FORTSCHRITT._istObjekt(roh.zaehler);
    },

    /* Flacher Stand → Zweig-Form. Andere Zweige und fremde Felder oben
       bleiben; die flachen Felder ziehen in den Typoluck-Zweig und stehen
       dort zusätzlich wörtlich unter `umzug.alt`. */
    umziehen(roh) {
        if (!FORTSCHRITT.umzugNoetig(roh)) {
            return FORTSCHRITT._kopie(roh);
        }
        const alt = {};
        const stand = { version: FORTSCHRITT.VERSION, spiele: {} };
        for (const schluessel of Object.keys(roh)) {
            if (FORTSCHRITT.FLACHE_FELDER.indexOf(schluessel) !== -1) {
                alt[schluessel] = FORTSCHRITT._kopie(roh[schluessel]);
            } else if (schluessel === "spiele") {
                stand.spiele = FORTSCHRITT._istObjekt(roh.spiele) ? FORTSCHRITT._kopie(roh.spiele) : {};
            } else {
                stand[schluessel] = FORTSCHRITT._kopie(roh[schluessel]);
            }
        }

        const objekt = (wert) => FORTSCHRITT._istObjekt(wert) ? wert : {};
        const serie = objekt(alt.serie);
        const heute = objekt(alt.heute);
        const zaehler = objekt(alt.zaehler);

        /* Die Serie: `tage` Tage bis `zuletzt`, lückenlos. Eine Lücke, die
           damals ein Schutz überbrückt hat, zählt so wie ein gespielter Tag
           — die Serie bleibt gleich lang. */
        const tage = [];
        if (FORTSCHRITT._istDatum(serie.zuletzt)) {
            let tag = serie.zuletzt;
            const anzahl = Math.min(FORTSCHRITT._zahl(serie.tage), FORTSCHRITT.TAGE_MAX);
            for (let i = 0; i < anzahl; i++) {
                tage.unshift(tag);
                tag = FORTSCHRITT._vortag(tag);
            }
        }
        const wort = FORTSCHRITT._zahl(heute.wort, 3);
        if (wort > 0 && FORTSCHRITT._istDatum(heute.datum) && tage.indexOf(heute.datum) === -1) {
            tage.push(heute.datum);
            tage.sort();
        }

        const zweigZaehler = FORTSCHRITT._kopie(zaehler);
        delete zweigZaehler.partien;
        zweigZaehler.besteSerie = Math.max(FORTSCHRITT._zahl(zaehler.besteSerie), FORTSCHRITT._zahl(serie.tage));

        stand.spiele[FORTSCHRITT.APP] = FORTSCHRITT._zweigNormalisieren({
            xp: alt.xp,
            partien: zaehler.partien,
            gezaehlt: [],
            stand: alt.stand,
            heute: FORTSCHRITT._istDatum(heute.datum)
                ? { datum: heute.datum, versuche: wort > 0 ? 1 : 0, figuren: wort }
                : { datum: "", versuche: 0, figuren: 0 },
            tage: tage,
            zaehler: zweigZaehler,
            taten: alt.taten
        });
        return stand;
    },

    /* Die flachen 0.10.0-Felder eines Eintrags, wörtlich (für die
       Sicherung auf dem Gerät). */
    _flacheFelder(roh) {
        const alt = {};
        for (const schluessel of FORTSCHRITT.FLACHE_FELDER) {
            if (FORTSCHRITT._istObjekt(roh) && schluessel in roh) {
                alt[schluessel] = FORTSCHRITT._kopie(roh[schluessel]);
            }
        }
        return alt;
    },

    /* Den alten Stand einer Id auf dem Gerät sichern — einmal; ein
       vorhandener wird nie überschrieben. `alt` = die flachen Felder. */
    _altSichern(id, alt) {
        try {
            const speicher = FORTSCHRITT._speicher();
            if (!speicher || !id) {
                return;
            }
            const roh = JSON.parse(speicher.getItem(FORTSCHRITT.UMZUG_SCHLUESSEL) || "null");
            const sicherung = FORTSCHRITT._istObjekt(roh) ? roh : {};
            if (!sicherung[id]) {
                sicherung[id] = { von: "0.10.0", alt: alt };
                speicher.setItem(FORTSCHRITT.UMZUG_SCHLUESSEL, JSON.stringify(sicherung));
            }
        } catch (fehler) {
            /* voll oder gesperrt — der Umzug selbst läuft trotzdem */
        }
    },

    /* Was auf dem Gerät zum Umzug einer Id gesichert ist (oder null). */
    umzugGesichert(id) {
        try {
            const speicher = FORTSCHRITT._speicher();
            const roh = speicher ? JSON.parse(speicher.getItem(FORTSCHRITT.UMZUG_SCHLUESSEL) || "null") : null;
            return (FORTSCHRITT._istObjekt(roh) && roh[id]) || null;
        } catch (fehler) {
            return null;
        }
    },

    /* Ein Gast stand in 0.10.0 unter seiner Konto-Id; seit 0.11.0 stehen
       Gäste wie in Blunderluck unter „gast". Hat „gast" noch keinen
       Typoluck-Zweig, kommt der aus dem Eintrag der Id dorthin (der Eintrag
       der Id bleibt stehen). Liefert true, wenn etwas übernommen wurde. */
    gastUebernehmen(id) {
        if (!id || id === FORTSCHRITT.GAST) {
            return false;
        }
        const alle = FORTSCHRITT._alle();
        const gast = FORTSCHRITT.normalisieren(alle[FORTSCHRITT.GAST]);
        const alt = FORTSCHRITT.normalisieren(alle[id]);
        if (gast.spiele[FORTSCHRITT.APP] || !alt.spiele[FORTSCHRITT.APP]) {
            return false;
        }
        if (FORTSCHRITT.umzugNoetig(alle[id])) {
            FORTSCHRITT._altSichern(id, FORTSCHRITT._flacheFelder(alle[id]));
        }
        const eintrag = FORTSCHRITT.umziehen(FORTSCHRITT._istObjekt(alle[FORTSCHRITT.GAST])
            ? alle[FORTSCHRITT.GAST] : FORTSCHRITT.leer());
        eintrag.version = eintrag.version || FORTSCHRITT.VERSION;
        eintrag.spiele = FORTSCHRITT._istObjekt(eintrag.spiele) ? eintrag.spiele : {};
        eintrag.spiele[FORTSCHRITT.APP] = alt.spiele[FORTSCHRITT.APP];
        alle[FORTSCHRITT.GAST] = eintrag;
        FORTSCHRITT._schreiben(alle);
        return true;
    },

    /* Beim Start einmal über ALLE Einträge im Gerät: Wer noch flach ist,
       zieht um und wird sofort zurückgeschrieben. Liefert die Zahl der
       umgezogenen Einträge. Ein gesperrter Speicher lässt die App laufen. */
    umziehenAlle() {
        const alle = FORTSCHRITT._alle();
        let anzahl = 0;
        for (const id of Object.keys(alle)) {
            if (FORTSCHRITT.umzugNoetig(alle[id])) {
                FORTSCHRITT._altSichern(id, FORTSCHRITT._flacheFelder(alle[id]));
                alle[id] = FORTSCHRITT.umziehen(alle[id]);
                anzahl++;
            }
            /* 0.11.0 bis 0.13.0 (nur lokal gebaut) legten die Sicherung in
               den Zweig — sie zieht aufs Gerät und aus dem Zweig heraus. */
            const zweig = FORTSCHRITT._istObjekt(alle[id]) && FORTSCHRITT._istObjekt(alle[id].spiele)
                ? alle[id].spiele[FORTSCHRITT.APP] : null;
            if (FORTSCHRITT._istObjekt(zweig) && "umzug" in zweig) {
                const umzug = zweig.umzug;
                FORTSCHRITT._altSichern(id, FORTSCHRITT._istObjekt(umzug) ? umzug.alt : umzug);
                delete zweig.umzug;
                anzahl++;
            }
        }
        if (anzahl > 0) {
            FORTSCHRITT._schreiben(alle);
        }
        return anzahl;
    },

    /* ---------------------------------------------------------------- *
     * Normalisieren (Zusammenführen: js\fortschritt-kern.js)
     * ---------------------------------------------------------------- */

    /*
     * Einen gespeicherten (vielleicht alten, fremden oder kaputten) Stand in
     * Form bringen — die Nachrüst-Stelle des additiven Datenvertrags. Ein
     * flacher 0.10.0-Stand zieht dabei um. Fremde Zweige bleiben WÖRTLICH,
     * wie sie sind (Typoluck schreibt sie nie), nur der eigene wird
     * geglättet.
     */
    normalisieren(roh) {
        const quelle = FORTSCHRITT.umzugNoetig(roh) ? FORTSCHRITT.umziehen(roh)
            : (FORTSCHRITT._istObjekt(roh) ? roh : {});
        const stand = FORTSCHRITT.leer();
        for (const schluessel of Object.keys(quelle)) {
            if (schluessel !== "spiele" && schluessel !== "version") {
                stand[schluessel] = FORTSCHRITT._kopie(quelle[schluessel]);
            }
        }
        if (typeof quelle.version === "number" && quelle.version > FORTSCHRITT.VERSION) {
            stand.version = quelle.version;
        }
        const spiele = FORTSCHRITT._istObjekt(quelle.spiele) ? quelle.spiele : {};
        for (const app of Object.keys(spiele)) {
            if (!FORTSCHRITT._istObjekt(spiele[app])) {
                continue;
            }
            stand.spiele[app] = app === FORTSCHRITT.APP
                ? FORTSCHRITT._zweigNormalisieren(spiele[app])
                : FORTSCHRITT._kopie(spiele[app]);
        }
        return stand;
    },

    /* Der Zweig eines Spiels (Vorgabe: der eigene) — nie null. */
    zweig(stand, app) {
        const name = app || FORTSCHRITT.APP;
        const zweig = FORTSCHRITT.normalisieren(stand).spiele[name];
        if (zweig) {
            return zweig;
        }
        return name === FORTSCHRITT.APP ? FORTSCHRITT.zweigLeer() : {};
    },

    /* ---------------------------------------------------------------- *
     * Einen Zweig lesen — auch fremde, deshalb jedes Feld misstrauisch
     * ---------------------------------------------------------------- */

    _tageVon(zweig) {
        const liste = (zweig && Array.isArray(zweig.tage)) ? zweig.tage : [];
        return liste.filter((tag, stelle) => FORTSCHRITT._istDatum(tag) && liste.indexOf(tag) === stelle)
            .sort()
            .slice(-FORTSCHRITT.TAGE_MAX);
    },

    _zaehlerVon(zweig, feld) {
        return (zweig && FORTSCHRITT._istObjekt(zweig.zaehler)) ? FORTSCHRITT._zahl(zweig.zaehler[feld]) : 0;
    },

    /* Figuren eines Zweigs: ausserhalb des Turms (`zaehler.figuren`) plus
       die besten Figuren je Turm-Stufe (`turm.figuren`, 1 bis 3). */
    _figurenVon(zweig) {
        let summe = FORTSCHRITT._zaehlerVon(zweig, "figuren");
        const turm = (zweig && FORTSCHRITT._istObjekt(zweig.turm)
            && FORTSCHRITT._istObjekt(zweig.turm.figuren)) ? zweig.turm.figuren : {};
        for (const schluessel of Object.keys(turm)) {
            summe += FORTSCHRITT._zahl(turm[schluessel], 3);
        }
        return summe;
    },

    /* Die Tagesaufgabe eines Spiels an `datum`: Figuren 0..3. */
    heuteVon(stand, app, datum) {
        const zweig = FORTSCHRITT.zweig(stand, app);
        const h = FORTSCHRITT._istObjekt(zweig.heute) ? zweig.heute : {};
        return (h.datum === datum) ? FORTSCHRITT._zahl(h.figuren, 3) : 0;
    },

    /* Hat an `datum` ein ANDERES Spiel als `app` seine Tagesaufgabe
       geschafft? (Karte „Tagesbrett" und ×1,5.) */
    andereHeute(stand, datum, app) {
        const eigenes = app || FORTSCHRITT.APP;
        const sauber = FORTSCHRITT.normalisieren(stand);
        return Object.keys(sauber.spiele)
            .some((anderes) => anderes !== eigenes && FORTSCHRITT.heuteVon(sauber, anderes, datum) > 0);
    },

    /* ---------------------------------------------------------------- *
     * Level
     * ---------------------------------------------------------------- */

    /* XP von Level L nach L+1: 100, 125, 150 … höchstens 500. */
    kosten(level) {
        return Math.min(100 + 25 * (Math.max(1, level) - 1), 500);
    },

    /* Level aus XP: { level, hat (XP im laufenden Level), kosten }. */
    levelVon(xp) {
        let level = 1;
        let rest = FORTSCHRITT._zahl(xp);
        while (rest >= FORTSCHRITT.kosten(level)) {
            rest -= FORTSCHRITT.kosten(level);
            level += 1;
        }
        return { level: level, hat: rest, kosten: FORTSCHRITT.kosten(level) };
    },

    /* XP aller Spiele zusammen — nur gerechnet, nie gespeichert. */
    gesamtXp(stand) {
        const sauber = FORTSCHRITT.normalisieren(stand);
        return Object.keys(sauber.spiele)
            .reduce((summe, app) => summe + FORTSCHRITT._zahl(sauber.spiele[app].xp), 0);
    },

    /* Das Level über alle Spiele: { level, hat, kosten }. */
    level(stand) {
        return FORTSCHRITT.levelVon(FORTSCHRITT.gesamtXp(stand));
    },

    /*
     * Was es beim Erreichen von Level L gibt. `stufen` =
     * UPCREW_ANPASSEN.STUFEN (Farbwelt, Schrift, Knöpfe frei ab Stufe =
     * Level), von aussen hereingereicht; `namen` optional { farbwelt: {id:
     * Name}, … } für die Anzeige. Seit 0.14.0 EINE Regel mit Blunderluck:
     * Rahmen ab Level 10, dann alle 5 (Silber, Gold, Platin, danach
     * „Glanz n"); Titel aus TITEL; nach Level 10 jedes Level, das kein
     * Rahmen ist, ein Serien-Schutz (seit 0.26.0 weg). Seit 0.15.0 darf `stufen` zusätzlich
     * `kachelset` tragen (Kachel-Sets über das Level, Tabelle aus
     * SAMMLUNG.kachelsetStufen — js\app.js `_stufen` legt sie dazu).
     * Liefert [{ art, name }] — art: farbwelt | schrift | knoepfe |
     * kachelset | titel | rahmen.
     */
    belohnungen(level, stufen, namen) {
        const liste = [];
        const namenVon = namen || {};
        for (const teil of ["farbwelt", "schrift", "knoepfe", "kachelset"]) {
            const tabelle = (stufen && stufen[teil]) || {};
            for (const wert of Object.keys(tabelle)) {
                if (tabelle[wert] === level && level > 0) {
                    liste.push({ art: teil, name: (namenVon[teil] && namenVon[teil][wert]) || wert });
                }
            }
        }
        const rahmen = FORTSCHRITT._rahmenBei(level);
        if (rahmen) {
            liste.push({ art: "rahmen", name: rahmen.name });
        }
        for (const titel of FORTSCHRITT.TITEL) {
            if (titel.ab === level) {
                liste.push({ art: "titel", name: titel.name });
            }
        }
        return liste;
    },

    /* Der Rahmen, der GENAU bei Level L dazukommt (oder null). */
    _rahmenBei(level) {
        if (level < 10 || level % 5 !== 0) {
            return null;
        }
        const fest = FORTSCHRITT.RAHMEN.find((rahmen) => rahmen.ab === level);
        return fest ? Object.assign({}, fest) : { ab: level, id: "glanz", name: "Glanz " + level };
    },

    /* Der Rahmen, den man mit Level L trägt: der zuletzt erreichte
       { name, ab, stufe } — `stufe` für das Aussehen (silber, gold, platin,
       glanz). Unter Level 10 keiner (null). */
    rahmenVon(level) {
        if (level < 10) {
            return null;
        }
        const rahmen = FORTSCHRITT._rahmenBei(level - level % 5);
        return { name: rahmen.name, ab: rahmen.ab, stufe: rahmen.id };
    },

    /* Der Titel, den man mit Level L trägt (der zuletzt erreichte). */
    titelVon(level) {
        let gefunden = null;
        for (const titel of FORTSCHRITT.TITEL) {
            if (level >= titel.ab) {
                gefunden = titel.name;
            }
        }
        return gefunden;
    },

    /* ---------------------------------------------------------------- *
     * Serie (die Rechnung selbst: js\fortschritt-kern.js)
     * ---------------------------------------------------------------- */

    /* Alle Tage mit geschaffter Tagesaufgabe, über alle Spiele. */
    alleTage(stand) {
        const sauber = FORTSCHRITT.normalisieren(stand);
        const tage = new Set();
        for (const app of Object.keys(sauber.spiele)) {
            for (const tag of FORTSCHRITT._tageVon(sauber.spiele[app])) {
                tage.add(tag);
            }
        }
        return tage;
    },

    /* Der Name des Kerns für den leeren Zweig (die gemeinsame Rechnung in
       js\fortschritt-kern.js ruft ihn) — in Typoluck derselbe wie
       `zweigLeer`. */
    spielLeer() {
        return FORTSCHRITT.zweigLeer();
    },

    /* Für den Tab „Heute": Serie samt freien Schutzen an `datum`. */
    serieHeute(stand, datum) {
        const schutz = FORTSCHRITT.schutzVerdient(FORTSCHRITT.level(stand).level);
        const serie = FORTSCHRITT.serie(stand, datum, schutz);
        /* Seit 0.17.0 mit den gekauften Flammen-Schilden (wie Blunderluck
           `FORTSCHRITT_KONTO.heute().schutzFrei`). */
        return { tage: serie.tage, heute: serie.heute,
            schutz: Math.max(0, schutz - serie.schutzGenutzt) + FORTSCHRITT.schildVorrat(stand) };
    },

    /* ---------------------------------------------------------------- *
     * Eine gespielte Partie
     * ---------------------------------------------------------------- */

    /* Grund-XP der Tagesaufgabe je Schwierigkeit (1 leicht … 3 schwer);
       Unbekanntes zählt als mittel. */
    grundXp(stufe) {
        return FORTSCHRITT.XP.tagesaufgabe[stufe] || FORTSCHRITT.XP.tagesaufgabe[2];
    },

    /* Die Spiele, deren Zweige die Datenbank-Regel am Konto annimmt
       (`fortschritt/spiele/$app`, Regel §13) — die Reihenfolge, in der
       `fuerKonto` sie ausgibt. */
    KONTO_SPIELE: ["blunderluck", "typoluck"],

    /* Eine Tabelle { name: zahl } in der Form der Regel: nur Namen nach
       `muster`, nur Zahlen ab `von`, höchstens `bis`. Auch eine Liste zählt
       (Firebase liefert dichte Zahlen-Schlüssel als Liste). Sonst nichts
       verändert — keine Rundung. */
    _tabelleFuerKonto(roh, muster, von, bis) {
        const aus = {};
        if (!roh || typeof roh !== "object") {
            return aus;
        }
        for (const name of Object.keys(roh)) {
            const wert = roh[name];
            if (muster.test(name) && typeof wert === "number" && isFinite(wert) && wert >= von) {
                aus[name] = Math.min(wert, bis);
            }
        }
        return aus;
    },

    /* Eine Liste in der Form der Regel: nur, was `passt`, höchstens
       `hoechstens` (die letzten). Auch ein Objekt mit Zahlen-Schlüsseln
       zählt (Firebase bei Lücken). */
    _listeFuerKonto(roh, passt, hoechstens) {
        let liste = [];
        if (Array.isArray(roh)) {
            liste = roh;
        } else if (FORTSCHRITT._istObjekt(roh)) {
            liste = Object.keys(roh).filter((k) => /^\d+$/.test(k))
                .sort((a, b) => Number(a) - Number(b)).map((k) => roh[k]);
        }
        return liste.filter(passt).slice(-hoechstens);
    },

    /*
     * Der Zweig eines ANDEREN Spiels, wie er ans Konto darf (seit 0.34.2).
     * Typoluck ändert ihn nie — er wird durchgereicht, weil der Konto-Eintrag
     * als Ganzes geschrieben wird. Deshalb: jedes Feld, das die Regel §13
     * kennt, bleibt, wie es ist (nichts gerundet, nichts gekürzt, was die
     * Regel erlaubt: 100 Kennungen, 1000 Tage, 1000 Taten); was sie ablehnt,
     * bleibt draussen — sie lehnte sonst den GANZEN Konto-Eintrag ab. Felder,
     * die fehlen, werden nicht angelegt.
     */
    _fremdFuerKonto(roh) {
        const quelle = FORTSCHRITT._istObjekt(roh) ? roh : {};
        const zweig = {};
        const zahl = (ziel, feld, wert, bis) => {
            if (typeof wert === "number" && isFinite(wert)) {
                ziel[feld] = Math.min(Math.max(wert, 0), bis);
            }
        };
        const mitInhalt = (feld, wert) => {
            if (Object.keys(wert).length > 0) {
                zweig[feld] = wert;
            }
        };
        const kurzerText = (text) => typeof text === "string" && text.length <= 64;

        zahl(zweig, "xp", quelle.xp, FORTSCHRITT.XP_MAX);
        zahl(zweig, "partien", quelle.partien, FORTSCHRITT.XP_MAX);
        zahl(zweig, "stand", quelle.stand, Number.MAX_VALUE);
        mitInhalt("gezaehlt", FORTSCHRITT._listeFuerKonto(quelle.gezaehlt, kurzerText, 100));
        mitInhalt("tage", FORTSCHRITT._listeFuerKonto(quelle.tage, FORTSCHRITT._istDatum, 1000));
        if (FORTSCHRITT._istObjekt(quelle.heute)) {
            const heute = {};
            if (quelle.heute.datum === "" || FORTSCHRITT._istDatum(quelle.heute.datum)) {
                heute.datum = quelle.heute.datum;
            }
            zahl(heute, "versuche", quelle.heute.versuche, 1000);
            zahl(heute, "figuren", quelle.heute.figuren, 3);
            mitInhalt("heute", heute);
        }
        if (FORTSCHRITT._istObjekt(quelle.turm)) {
            const turm = {};
            const figuren = FORTSCHRITT._tabelleFuerKonto(quelle.turm.figuren, /^\d{1,2}-\d{1,2}$/, 1, 3);
            const merker = FORTSCHRITT._tabelleFuerKonto(quelle.turm.schwuere, /^\d{1,3}$/, 0, 3);
            if (Object.keys(figuren).length > 0) {
                turm.figuren = figuren;
            }
            if (Object.keys(merker).length > 0) {
                turm.schwuere = merker;
            }
            mitInhalt("turm", turm);
        }
        mitInhalt("zaehler", FORTSCHRITT._tabelleFuerKonto(quelle.zaehler, /^[a-zA-Z]{1,32}$/, 0, 1000000000));
        mitInhalt("taten", FORTSCHRITT._listeFuerKonto(quelle.taten, kurzerText, 1000));
        return zweig;
    },

    /* Die Felder des Vertrags, wie sie ans Konto dürfen (Regel §11b in
       Datenbank-Regel, heute §13): `version`, der eigene
       Zweig mit nur erlaubten Feldern — `umzug` und alles Unbekannte bleiben
       draussen, die Regel lehnt sonst den GANZEN Konto-Eintrag ab — und
       (seit 0.34.2) die Zweige der anderen Spiele samt `schutz`, unverändert
       in der Form der Regel (`_fremdFuerKonto`). */
    fuerKonto(stand) {
        const zweig = FORTSCHRITT.zweig(stand);
        const zaehler = {};
        for (const feld of Object.keys(zweig.zaehler)) {
            if (/^[a-zA-Z]{1,32}$/.test(feld) && typeof zweig.zaehler[feld] === "number") {
                zaehler[feld] = Math.min(FORTSCHRITT._zahl(zweig.zaehler[feld], 1000000000), 1000000000);
            }
        }
        const typoluck = {
            xp: zweig.xp,
            partien: zweig.partien,
            stand: zweig.stand,
            gezaehlt: zweig.gezaehlt.filter((id) => id.length <= 64).slice(-100),
            tage: zweig.tage.slice(-1000),
            heute: { datum: zweig.heute.datum, versuche: zweig.heute.versuche, figuren: zweig.heute.figuren },
            zaehler: zaehler,
            taten: zweig.taten.filter((id) => id.length <= 64).slice(-1000)
        };
        /* Die Bibliothek (seit 0.18.0): `turm.figuren`, seit 0.20.0 auch
           `turm.schwuere` (Merker) — je nur mit Inhalt. */
        const figuren = FORTSCHRITT._turmTabelle(zweig.turm);
        const merker = FORTSCHRITT._merkerTabelle(zweig.turm);
        if (Object.keys(figuren).length || Object.keys(merker).length) {
            typoluck.turm = {};
            if (Object.keys(figuren).length) {
                typoluck.turm.figuren = figuren;
            }
            if (Object.keys(merker).length) {
                typoluck.turm.schwuere = merker;
            }
        }
        /* Seit 0.34.2: die anderen Zweige und `schutz` reisen mit (Kopf). */
        const sauber = FORTSCHRITT.normalisieren(stand);
        const spiele = {};
        for (const app of FORTSCHRITT.KONTO_SPIELE) {
            if (app === FORTSCHRITT.APP) {
                spiele[app] = typoluck;
                continue;
            }
            const fremd = FORTSCHRITT._fremdFuerKonto(sauber.spiele[app]);
            if (Object.keys(fremd).length > 0) {
                spiele[app] = fremd;
            }
        }
        const vertrag = { version: FORTSCHRITT.VERSION, spiele: spiele };
        const schutz = FORTSCHRITT._tabelleFuerKonto(sauber.schutz, /^[a-zA-Z]{1,32}$/, 0, 1000);
        if (Object.keys(schutz).length > 0) {
            vertrag.schutz = schutz;
        }
        return vertrag;
    },

    /*
     * Eine Partie melden (schreibt NUR den Typoluck-Zweig).
     *   angaben.datum         "YYYY-MM-DD"
     *   angaben.tagesaufgabe  true = das war das Tageswort des Tages
     *   angaben.figuren       0..3 (0 = nicht geschafft)
     *   angaben.koennen       0..100, wahlfrei (Statistik, seit 0.12.0)
     *   angaben.zeitpunkt     für `stand`, wahlfrei
     *   angaben.geloest, .versuche, .schwer   für die Taten (seit 0.13.0)
     *   angaben.stufe         Schwierigkeit der Tagesaufgabe 1..3 (seit
     *                         0.14.0; fehlt sie, gilt mittel)
     *   angaben.hilfe         true = Tipp oder Extra-Leben aus dem Shop
     *                         benutzt (seit 0.17.0, wie Blunderluck
     *                         `tagesaufgabe(…, hilfe)`): höchstens ein Bauer
     *   angaben.bibliothek    { schluessel: "2-3", figuren: 0–3 } (seit
     *                         0.18.0, js/bibliothek.js): die Wertung eines
     *                         Levels. Es bleibt die BESTE je Level; jede
     *                         Figur mehr als vorher +10 XP („neue Figur") —
     *                         wie Blunderlucks `partieZaehlen(…, turm)`
     * `stufen` = UPCREW_ANPASSEN.STUFEN (optional, für die Belohnungen).
     * Liefert { stand, xp, levelVorher, levelNachher, neu (Belohnungen der
     * neu erreichten Level), taten (neu erfüllte Tat-Kennungen) }.
     */
    partie(alt, angaben, stufen) {
        const stand = FORTSCHRITT.normalisieren(alt);
        const zweig = stand.spiele[FORTSCHRITT.APP] || FORTSCHRITT.zweigLeer();
        const datum = angaben.datum;
        const figuren = Math.max(0, Math.min(angaben.hilfe ? 1 : 3, Math.floor(angaben.figuren || 0)));
        const zaehler = zweig.zaehler;
        const levelVorher = FORTSCHRITT.level(stand).level;
        const vorherTaten = FORTSCHRITT.erfuellteTaten(stand, datum);

        let gewinn = FORTSCHRITT.XP.partie;
        zweig.partien += 1;

        if (typeof angaben.koennen === "number" && isFinite(angaben.koennen)) {
            const koennen = Math.max(0, Math.min(100, Math.round(angaben.koennen)));
            zaehler.koennenSumme += koennen;
            zaehler.koennenAnzahl += 1;
            zaehler.koennenBeste = Math.max(zaehler.koennenBeste, koennen);
        }

        /* Die Tagesaufgabe zählt nur beim ersten Schaffen des Tages; neue
           Figuren nur, soweit es mehr sind als schon da. */
        if (angaben.tagesaufgabe && FORTSCHRITT._istDatum(datum)) {
            const heute = zweig.heute.datum === datum
                ? Object.assign({}, zweig.heute) : { datum: datum, versuche: 0, figuren: 0 };
            heute.versuche += 1;
            const vorher = heute.figuren;
            if (figuren > vorher) {
                gewinn += FORTSCHRITT.XP.figur * (figuren - vorher);
                zaehler.figuren += figuren - vorher;
            }
            if (vorher === 0 && figuren > 0) {
                const andere = FORTSCHRITT.andereHeute(stand, datum);
                gewinn += Math.round(FORTSCHRITT.grundXp(angaben.stufe)
                    * (andere ? FORTSCHRITT.XP.beideFaktor : 1));
                zaehler.tagesaufgaben += 1;
                if (andere) {
                    zaehler.beideTage += 1;
                }
                zweig.tage = FORTSCHRITT._tageVon({ tage: zweig.tage.concat([datum]) });
                stand.spiele[FORTSCHRITT.APP] = zweig;
                const serie = FORTSCHRITT.serie(stand, datum, FORTSCHRITT.schutzVerdient(levelVorher)).tage;
                gewinn += Math.min(FORTSCHRITT.XP.serieJeTag * serie,
                    FORTSCHRITT.XP.serieJeTag * FORTSCHRITT.XP.serieHoechstens);
                zaehler.besteSerie = Math.max(zaehler.besteSerie, serie);
            }
            heute.figuren = Math.max(vorher, figuren);
            zweig.heute = heute;
        }

        /* Die Bibliothek (seit 0.18.0). */
        const bib = angaben.bibliothek;
        if (bib && /^\d{1,2}-\d{1,2}$/.test(bib.schluessel)
                && Number.isInteger(bib.figuren) && bib.figuren > 0) {
            const tabelle = FORTSCHRITT._turmTabelle(zweig.turm);
            const vorher = tabelle[bib.schluessel] || 0;
            const neu = Math.min(bib.figuren, 3);
            if (neu > vorher) {
                tabelle[bib.schluessel] = neu;
                gewinn += (neu - vorher) * FORTSCHRITT.XP.figur;
            }
            zweig.turm = Object.assign({}, FORTSCHRITT._istObjekt(zweig.turm) ? zweig.turm : {}, { figuren: tabelle });
        }

        zweig.xp = Math.min(zweig.xp + gewinn, FORTSCHRITT.XP_MAX);
        zweig.stand = Math.max(zweig.stand + 1, angaben.zeitpunkt || 0);
        stand.spiele[FORTSCHRITT.APP] = zweig;

        /* Taten (seit 0.13.0): was diese Runde neu erfüllt — gemerkt wird,
           was die Runde selbst zeigt; die Serie ist ohnehin gerechnet. */
        zweig.taten = zweig.taten.concat(FORTSCHRITT._tatenDerRunde(stand, angaben)
            .filter((id) => zweig.taten.indexOf(id) === -1));
        const nachherTaten = FORTSCHRITT.erfuellteTaten(stand, datum);
        const neueTaten = FORTSCHRITT.TATEN.map((tat) => tat.id)
            .filter((id) => nachherTaten.has(id) && !vorherTaten.has(id));

        const levelNachher = FORTSCHRITT.level(stand).level;
        const neu = [];
        for (let level = levelVorher + 1; level <= levelNachher; level++) {
            neu.push(...FORTSCHRITT.belohnungen(level, stufen));
        }
        return { stand: stand, xp: gewinn, levelVorher: levelVorher, levelNachher: levelNachher, neu: neu,
            taten: neueTaten };
    },

    /* ---------------------------------------------------------------- *
     * Das Duell (seit 0.35.0)
     * ---------------------------------------------------------------- */

    /*
     * Die XP eines beendeten Duells aus Sicht von `rolle` ("a" | "b").
     * `stand` = DUELL.stand(…) ({ ende, a, b, sieger, ohneWertung }).
     * Liefert { woerter, sieg, xp }; läuft das Duell noch: xp 0. Ein Sieg
     * „ohne Wertung" (Aufgabe, bevor der Sieger ein Wort begann) bringt
     * keinen Zuschlag.
     */
    duellXp(stand, rolle) {
        const leer = { woerter: 0, sieg: false, xp: 0 };
        if (!stand || stand.ende !== true || (rolle !== "a" && rolle !== "b")) {
            return leer;
        }
        const woerter = Math.max(0, Math.min(3, Math.floor(Number(stand[rolle]) || 0)));
        const sieg = stand.ohneWertung !== true && stand.sieger === rolle;
        return {
            woerter: woerter,
            sieg: sieg,
            xp: woerter * FORTSCHRITT.XP.duellWort + (sieg ? FORTSCHRITT.XP.duellSieg : 0)
        };
    },

    /* Der Eintrag eines Duells in `gezaehlt` — "" bei falscher Kennung
       (20 Zeichen aus A–Z a–z 0–9 _ -, wie DUELL.KENNUNG_MUSTER). */
    _duellEintrag(id) {
        return (typeof id === "string" && /^[A-Za-z0-9_-]{20}$/.test(id)) ? FORTSCHRITT.DUELL_VORSILBE + id : "";
    },

    /* Ist dieses Duell im Typoluck-Zweig schon gebucht? */
    duellGezaehlt(stand, id) {
        const eintrag = FORTSCHRITT._duellEintrag(id);
        const zweig = FORTSCHRITT.normalisieren(stand).spiele[FORTSCHRITT.APP];
        return !!eintrag && !!zweig && zweig.gezaehlt.indexOf(eintrag) !== -1;
    },

    /*
     * Ein beendetes Duell buchen — GENAU EINMAL je Kennung: Die Kennung
     * kommt in `gezaehlt` (die jüngsten GEZAEHLT_MAX bleiben), die XP in
     * den eigenen Zweig. Schon gebucht, falsche Kennung oder 0 XP: nichts
     * ändert sich (`neu: false`). Keine Partie, keine Münzen.
     *   angaben.id         Duell-Kennung
     *   angaben.xp         aus `duellXp`
     *   angaben.zeitpunkt  für `stand`, wahlfrei
     * Liefert { stand, xp, neu, levelVorher, levelNachher, belohnungen }.
     */
    duellZaehlen(alt, angaben, stufen) {
        const stand = FORTSCHRITT.normalisieren(alt);
        const levelVorher = FORTSCHRITT.level(stand).level;
        const a = angaben || {};
        const eintrag = FORTSCHRITT._duellEintrag(a.id);
        const xp = (typeof a.xp === "number" && isFinite(a.xp) && a.xp > 0) ? Math.floor(a.xp) : 0;
        if (!eintrag || xp === 0 || FORTSCHRITT.duellGezaehlt(stand, a.id)) {
            return { stand: stand, xp: 0, neu: false, levelVorher: levelVorher, levelNachher: levelVorher,
                belohnungen: [] };
        }
        const zweig = stand.spiele[FORTSCHRITT.APP] || FORTSCHRITT.zweigLeer();
        zweig.gezaehlt = zweig.gezaehlt.concat([eintrag]).slice(-FORTSCHRITT.GEZAEHLT_MAX);
        zweig.xp = Math.min(zweig.xp + xp, FORTSCHRITT.XP_MAX);
        zweig.stand = Math.max(zweig.stand + 1, a.zeitpunkt || 0);
        stand.spiele[FORTSCHRITT.APP] = zweig;
        const levelNachher = FORTSCHRITT.level(stand).level;
        const belohnungen = [];
        for (let level = levelVorher + 1; level <= levelNachher; level++) {
            belohnungen.push(...FORTSCHRITT.belohnungen(level, stufen));
        }
        return { stand: stand, xp: xp, neu: true, levelVorher: levelVorher, levelNachher: levelNachher,
            belohnungen: belohnungen };
    },

    /* ---------------------------------------------------------------- *
     * Taten (seit 0.13.0)
     * ---------------------------------------------------------------- */

    /* Welche Taten diese eine Runde erfüllt. `angaben` wie bei `partie`,
       dazu geloest (true/false), versuche (Zahl), schwer (true/false). */
    _tatenDerRunde(stand, angaben) {
        const ids = [];
        const geloest = angaben.geloest === true;
        if (angaben.tagesaufgabe && geloest && angaben.versuche > 0 && angaben.versuche <= 2) {
            ids.push("zweiter-versuch");
        }
        if (angaben.schwer === true && geloest) {
            ids.push("schwer-geloest");
        }
        if (geloest && typeof angaben.koennen === "number" && angaben.koennen >= 90) {
            ids.push("koennen-90");
        }
        return ids;
    },

    /* Alle erfüllten Taten: die gemerkten im eigenen Zweig und die, die sich
       aus dem Stand rechnen lassen (Serie 7 — über alle Spiele). */
    erfuellteTaten(stand, datum) {
        const zweig = FORTSCHRITT.zweig(stand);
        const erfuellt = new Set(zweig.taten.filter((id) => FORTSCHRITT.TATEN.some((tat) => tat.id === id)));
        if (FORTSCHRITT.abzeichenWerte(stand, datum).besteSerie >= 7) {
            erfuellt.add("serie-7");
        }
        return erfuellt;
    },

    /* Der Anzeige-Titel einer Tat (oder ""). */
    tatTitel(id) {
        const tat = FORTSCHRITT.TATEN.find((eintrag) => eintrag.id === id);
        return tat ? tat.titel : "";
    },

    /*
     * DIE TYPOLUCK-ABZEICHEN (seit 0.25.0, gemeinsame Runde 7; Nutzer
     * 28.09.2026: „wenn ich in dem einen Spiel ein Abzeichen bekomme, soll es
     * fix im Profil liegen"). Die Liste (Kennung „tl-…", Zähler „az…") steht
     * im gemeinsamen Baustein js\upcrew-abzeichen-spiele.js; WANN eines
     * verdient ist, steht nur hier. Verdiente werden als Zähler = 1 in den
     * eigenen Zweig geschrieben (`zaehlerHeben`, nur höher) — so sieht auch
     * Blunderluck sie. `buecher` = { erreicht, alle } aus der Bibliothek
     * (die Rechnung dort kennt das Modell hier nicht).
     */
    TL_ABZEICHEN: {
        azZweiVersuche: (zweig) => zweig.taten.indexOf("zweiter-versuch") !== -1,
        azKoennen: (zweig) => zweig.taten.indexOf("koennen-90") !== -1,
        azPerfekt: (zweig) => FORTSCHRITT._zaehlerVon(zweig, "koennenBeste") >= 100,
        azErstesBuch: (zweig, b) => b.erreicht >= 2,
        azBuecherwurm: (zweig, b) => b.alle > 0 && b.erreicht > b.alle
    },

    /* Die verdienten Typoluck-Abzeichen als { feld: 1 }. Rein. */
    tlAbzeichenFelder(stand, buecher) {
        const zweig = FORTSCHRITT.zweig(stand);
        const b = { erreicht: FORTSCHRITT._zahl(buecher && buecher.erreicht),
            alle: FORTSCHRITT._zahl(buecher && buecher.alle) };
        const felder = {};
        for (const feld of Object.keys(FORTSCHRITT.TL_ABZEICHEN)) {
            if (FORTSCHRITT.TL_ABZEICHEN[feld](zweig, b)) {
                felder[feld] = 1;
            }
        }
        return felder;
    },

    /* Zähler im EIGENEN Zweig anheben — nur höher, nie tiefer (wie
       Blunderluck `FORTSCHRITT_KONTO.zaehlerHeben`). Liefert { stand, neu }
       (neu = wie viele sich geändert haben). Nur Namen aus Buchstaben. */
    zaehlerHeben(stand, felder) {
        const sauber = FORTSCHRITT.normalisieren(stand);
        const zweig = FORTSCHRITT.zweig(sauber);
        let neu = 0;
        for (const feld of Object.keys(felder || {})) {
            const wert = FORTSCHRITT._zahl(felder[feld], 1000000000);
            if (/^[a-zA-Z]{1,32}$/.test(feld) && wert > FORTSCHRITT._zaehlerVon(zweig, feld)) {
                zweig.zaehler[feld] = wert;
                neu++;
            }
        }
        if (neu > 0) {
            sauber.spiele[FORTSCHRITT.APP] = zweig;
        }
        return { stand: sauber, neu: neu };
    },

    /* ---------------------------------------------------------------- *
     * Profil: Abzeichen, Statistik, Spiele (seit 0.12.0)
     * ---------------------------------------------------------------- */

    /*
     * DIE ABZEICHEN (seit 0.15.9) rechnet der gemeinsame Baustein
     * js\upcrew-abzeichen.js aus den UPCrew-Bausteinen — gleich in
     * Blunderluck, über ALLE Zweige (Rechnung 1:1 aus Typoluck 0.12.0, die
     * eigene Kopie hier ist weg; tests\test-fortschritt.js prüft, dass
     * derselbe Fortschritt dieselben Abzeichen ergibt). Nur die LAUFENDE
     * Serie kennt der Baustein nicht — die gibt Typoluck mit.
     */
    _abzeichenBaustein() {
        if (typeof UPCREW_ABZEICHEN !== "undefined") {
            return UPCREW_ABZEICHEN;
        }
        /* In den Tests (Node) liegt der Baustein neben dieser Datei. */
        return require("./upcrew-abzeichen.js");
    },

    /* Die laufende Serie über alle Spiele (0 ohne Datum). */
    laufendeSerie(stand, datum) {
        return datum ? FORTSCHRITT.serieHeute(FORTSCHRITT.normalisieren(stand), datum).tage : 0;
    },

    /* Die Werte der Abzeichen: { partien, besteSerie, beideTage, figuren,
       tagesaufgaben }. */
    abzeichenWerte(stand, datum) {
        return FORTSCHRITT._abzeichenBaustein().werte(FORTSCHRITT.normalisieren(stand),
            FORTSCHRITT.laufendeSerie(stand, datum));
    },

    /* Die Abzeichen mit erreichter Stufe (UPCREW_ABZEICHEN.liste). */
    abzeichen(stand, datum) {
        return FORTSCHRITT._abzeichenBaustein().liste(FORTSCHRITT.normalisieren(stand),
            FORTSCHRITT.laufendeSerie(stand, datum));
    },

    /* Die Typoluck-Statistik aus dem eigenen Zweig: { partien, figuren,
       koennen (Ø, oder null), bestesKoennen (oder null), besteSerie }. */
    statistik(stand, datum) {
        const zweig = FORTSCHRITT.zweig(stand);
        const anzahl = zweig.zaehler.koennenAnzahl;
        return {
            partien: zweig.partien,
            figuren: FORTSCHRITT._figurenVon(zweig),
            koennen: anzahl ? Math.round(zweig.zaehler.koennenSumme / anzahl) : null,
            bestesKoennen: anzahl ? zweig.zaehler.koennenBeste : null,
            besteSerie: FORTSCHRITT.abzeichenWerte(stand, datum).besteSerie
        };
    },

    /*
     * Die Spiele fürs Profil: [{ app, figuren, ort }]. `ort` ist die Nummer
     * des höchsten Orts im Turm, in dem der Zweig Figuren hat (1, solange
     * keine; 0 = das Spiel hat noch keinen Turm oder wurde nie gespielt).
     * Den NAMEN des Orts kennt das Spiel selbst (Blunderluck: KONFIG).
     */
    spiele(stand, apps) {
        const sauber = FORTSCHRITT.normalisieren(stand);
        return apps.map((app) => {
            const zweig = sauber.spiele[app];
            let ort = 0;
            if (zweig && FORTSCHRITT._istObjekt(zweig.turm)) {
                ort = 1;
                const figuren = FORTSCHRITT._istObjekt(zweig.turm.figuren) ? zweig.turm.figuren : {};
                for (const schluessel of Object.keys(figuren)) {
                    const treffer = /^(\d{1,2})-\d{1,2}$/.exec(schluessel);
                    if (treffer && FORTSCHRITT._zahl(figuren[schluessel], 3) > 0) {
                        ort = Math.max(ort, Number(treffer[1]));
                    }
                }
            }
            return { app: app, figuren: zweig ? FORTSCHRITT._figurenVon(zweig) : 0, ort: ort };
        });
    },

    /* ---------------------------------------------------------------- *
     * Lesen und schreiben — je Spieler-Id ein Eintrag
     * ---------------------------------------------------------------- */

    _alle() {
        try {
            const speicher = FORTSCHRITT._speicher();
            const roh = speicher ? JSON.parse(speicher.getItem(FORTSCHRITT.SCHLUESSEL) || "null") : null;
            return FORTSCHRITT._istObjekt(roh) ? roh : {};
        } catch (fehler) {
            return {};
        }
    },

    _schreiben(alle) {
        try {
            const speicher = FORTSCHRITT._speicher();
            if (speicher) {
                speicher.setItem(FORTSCHRITT.SCHLUESSEL, JSON.stringify(alle));
            }
        } catch (fehler) {
            /* voll oder gesperrt — der Fortschritt bleibt diesmal aus */
        }
    },

    laden(id) {
        if (!id) {
            return FORTSCHRITT.leer();
        }
        return FORTSCHRITT.normalisieren(FORTSCHRITT._alle()[id]);
    },

    /* Lesen, ändern, schreiben in EINEM Zug — frisch gelesen, damit ein
       anderes Spiel im selben Browser nichts verliert. Zurückgeschrieben
       wird nur der EIGENE Zweig; alles andere im Eintrag bleibt, wie es
       gerade im Speicher steht. `aenderung(stand)` liefert { stand, … };
       das Ganze kommt zurück. Schreibt nichts ohne Id. */
    aendern(id, aenderung, jetzt) {
        const ergebnis = aenderung(FORTSCHRITT.normalisieren(id ? FORTSCHRITT._alle()[id] : null));
        if (!id) {
            return ergebnis;
        }
        /* Unmittelbar vor dem Schreiben noch einmal frisch lesen: Was ein
           anderes Spiel inzwischen in SEINEN Zweig geschrieben hat, bleibt. */
        const alle = FORTSCHRITT._alle();
        const eigener = ergebnis.stand.spiele[FORTSCHRITT.APP] || FORTSCHRITT.zweigLeer();
        eigener.stand = Math.max(eigener.stand || 0, jetzt || Date.now());
        if (FORTSCHRITT.umzugNoetig(alle[id])) {
            FORTSCHRITT._altSichern(id, FORTSCHRITT._flacheFelder(alle[id]));
        }
        const eintrag = FORTSCHRITT.umziehen(FORTSCHRITT._istObjekt(alle[id]) ? alle[id] : FORTSCHRITT.leer());
        eintrag.version = eintrag.version || FORTSCHRITT.VERSION;
        eintrag.spiele = FORTSCHRITT._istObjekt(eintrag.spiele) ? eintrag.spiele : {};
        eintrag.spiele[FORTSCHRITT.APP] = eigener;
        alle[id] = eintrag;
        FORTSCHRITT._schreiben(alle);
        return ergebnis;
    },

    /* ---------------------------------------------------------------- *
     * Ein Helfer unter dem Namen, den der Kern ruft (seit 0.22.0; der
     * Auszug steht seit 0.28.1 in js\fortschritt-kern.js, `auszugLevel`):
     * `levelAus` = `levelVon` in der Form { level, imLevel, kosten, anteil }.
     * ---------------------------------------------------------------- */

    levelAus(xp) {
        const l = FORTSCHRITT.levelVon(xp);
        return { level: l.level, imLevel: l.hat, kosten: l.kosten, anteil: l.hat / l.kosten };
    }
});

if (typeof module !== "undefined" && module.exports) {
    module.exports = FORTSCHRITT;
}
