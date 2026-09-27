/*
 * fortschritt.js — Level, XP, Serie und „Heute" über alle UPCrew-Spiele
 * (seit 0.10.0, UPCrew-Runde 5; seit 0.11.0 im gemeinsamen Zweig-Vertrag,
 * Runde 6 Teil A; seit 0.12.0 mit Profil-Werten).
 *
 * Nutzer 27.09.2026 (Apps\UPCrew\docs\FORTSCHRITT.md, „GÜLTIGER STAND";
 * Aufträge Design\3D-Schrift\docs\AUFTRAEGE-RUNDE-5.md und -RUNDE-6.md):
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
 *          geschafft wurde (aus den `tage` aller Zweige gerechnet). Ein
 *          Serien-Schutz überbrückt einen fehlenden Tag; verdient wird er
 *          über das Level (nach Level 10 jedes Level, das kein Rahmen ist).
 *   Rahmen ab Level 10, dann alle 5 Level (10, 15, 20 …), dazwischen nach
 *          Level 10 je ein Serien-Schutz — EINE Regel für beide Spiele
 *          (seit 0.14.0, Namen wie Blunderluck `RAHMEN`/`TITEL`).
 * Typoluck hat noch KEINEN Turm (kommt mit 0.13.0) — `turm` wandert
 * unberührt durch.
 *
 * DER DATENVERTRAG (gemeinsam mit Blunderluck, Runde 6 Teil A; Vorlage ist
 * der Kopf von Apps\Blunderluck\js\fortschritt.js):
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
 *                 gezaehlt: [],                // Form wie Blunderluck (hier ungenutzt)
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
 *                 taten: [ids]                 // erfüllte Taten (seit 0.13.0, TATEN)
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
 * (`UMZUG_SCHLUESSEL`), nie im Zweig: Die Datenbank-Regel (Blunderluck
 * `SICHERHEIT.md` §11b) nimmt nur die Felder des Vertrags an, und
 * Blunderluck schickt beim Konto-Abgleich ALLE Zweige mit.
 *
 * FÜRS KONTO: `fuerKonto(stand)` liefert genau die Felder, die §11b
 * erlaubt (version, spiele.typoluck mit xp, partien, stand, gezaehlt, tage,
 * heute {datum, versuche, figuren}, zaehler {Buchstaben: Zahl}, taten).
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
 */

const FORTSCHRITT = {

    SCHLUESSEL: "upcrew.fortschritt",
    VERSION: 1,

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
        beideFaktor: 1.5
    },

    /* Der alte 0.10.0-Stand nach dem Umzug — nur auf dem Gerät (seit
       0.14.0, vorher im Zweig unter `umzug`). Liegt im Namensraum von
       Typoluck, nicht unter `upcrew.`. */
    UMZUG_SCHLUESSEL: "typoluck.fortschritt-umzug",

    /* Rahmen und Titel (seit 0.14.0 wie Blunderluck `RAHMEN`/`TITEL`,
       Nachtrag Runde 6: „ein Profil, eine Regel" — Rahmen ab Level 10,
       dann alle 5). Über Level 20 heisst jeder weitere Rahmen „Glanz n". */
    RAHMEN: [
        { ab: 10, id: "silber", name: "Silber" },
        { ab: 15, id: "gold", name: "Gold" },
        { ab: 20, id: "platin", name: "Platin" }
    ],

    TITEL: [
        { ab: 1, name: "Neuling" },
        { ab: 10, name: "Stammgast" },
        { ab: 25, name: "Kenner" },
        { ab: 50, name: "Legende" }
    ],

    /* Schutz gegen Unsinn aus dem Speicher; so viele Tage merkt sich ein
       Zweig (wie Blunderluck — genug für jede sichtbare Serie). */
    XP_MAX: 10000000,
    TAGE_MAX: 60,

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
        { id: "schwer-geloest", titel: "Gelöst im Schwer-Modus" },
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

    _istObjekt(wert) {
        return !!wert && typeof wert === "object" && !Array.isArray(wert);
    },

    /* Eine Zahl ≥ 0, ganz, höchstens `hoechstens` — sonst 0. */
    _zahl(wert, hoechstens) {
        return (typeof wert === "number" && isFinite(wert) && wert > 0)
            ? Math.min(Math.floor(wert), hoechstens || FORTSCHRITT.XP_MAX) : 0;
    },

    _istDatum(wert) {
        return typeof wert === "string" && /^\d{4}-\d{2}-\d{2}$/.test(wert);
    },

    _kopie(wert) {
        return wert === undefined ? undefined : JSON.parse(JSON.stringify(wert));
    },

    /* Der Tag davor, als „JJJJ-MM-TT" (in UTC gerechnet — es zählt nur die
       Kalenderfolge). */
    _vortag(datum) {
        const d = new Date(datum + "T12:00:00Z");
        d.setUTCDate(d.getUTCDate() - 1);
        return d.toISOString().slice(0, 10);
    },

    /* ---------------------------------------------------------------- *
     * Grundformen
     * ---------------------------------------------------------------- */

    leer() {
        return { version: FORTSCHRITT.VERSION, spiele: {} };
    },

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
        /* `umzug` gehört seit 0.14.0 nur aufs Gerät (UMZUG_SCHLUESSEL). */
        delete zweig.umzug;
        return zweig;
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
     * Normalisieren und Zusammenführen
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

    /* Zwei Stände zusammen (Gerät und später Konto): je Spiel gewinnt der
       Zweig mit dem neueren `stand` — wie in Blunderluck. */
    zusammenfuehren(a, b) {
        const eins = FORTSCHRITT.normalisieren(a);
        const zwei = FORTSCHRITT.normalisieren(b);
        const ergebnis = Object.assign({}, zwei, eins, { spiele: {} });
        const apps = new Set(Object.keys(eins.spiele).concat(Object.keys(zwei.spiele)));
        for (const app of apps) {
            const x = eins.spiele[app];
            const y = zwei.spiele[app];
            if (!x || !y) {
                ergebnis.spiele[app] = x || y;
            } else {
                ergebnis.spiele[app] = (FORTSCHRITT._zahl(y.stand, Number.MAX_SAFE_INTEGER)
                    > FORTSCHRITT._zahl(x.stand, Number.MAX_SAFE_INTEGER)) ? y : x;
            }
        }
        return ergebnis;
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
     * Rahmen ist, ein Serien-Schutz. Seit 0.15.0 darf `stufen` zusätzlich
     * `kachelset` tragen (Kachel-Sets über das Level, Tabelle aus
     * SAMMLUNG.kachelsetStufen — js\app.js `_stufen` legt sie dazu).
     * Liefert [{ art, name }] — art: farbwelt | schrift | knoepfe |
     * kachelset | titel | rahmen | schutz.
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
        if (level > 10 && !rahmen) {
            liste.push({ art: "schutz", name: "Serien-Schutz" });
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
     * Serie
     * ---------------------------------------------------------------- */

    /* Serien-Schutze, die bis Level L verdient sind (Level 11 bis L, ohne
       die Rahmen-Level) — wie Blunderluck. */
    schutzVerdient(level) {
        let anzahl = 0;
        for (let l = 11; l <= level; l++) {
            if (l % 5 !== 0) {
                anzahl++;
            }
        }
        return anzahl;
    },

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

    /*
     * DIE SERIE (Rechnung wörtlich wie Blunderluck, damit beide Spiele
     * dieselbe Zahl zeigen): Tage am Stück bis heute (oder bis gestern, wenn
     * heute noch nichts geschafft ist), in IRGENDEINEM Spiel. Ein fehlender
     * Tag wird von einem Serien-Schutz überbrückt, solange welche da sind.
     * Liefert { tage, heute, schutzGenutzt }.
     */
    serie(stand, datum, schutz) {
        const tage = FORTSCHRITT.alleTage(stand);
        const heute = tage.has(datum);
        let tag = heute ? datum : FORTSCHRITT._vortag(datum);
        let laenge = 0;
        let genutzt = 0;
        let vorrat = Math.max(0, Math.floor(schutz || 0));
        for (let schritt = 0; schritt < 400; schritt++) {
            if (tage.has(tag)) {
                laenge++;
            } else if (laenge > 0 && vorrat > 0 && tage.has(FORTSCHRITT._vortag(tag))) {
                vorrat--;
                genutzt++;
            } else {
                break;
            }
            tag = FORTSCHRITT._vortag(tag);
        }
        return { tage: laenge, heute: heute, schutzGenutzt: genutzt };
    },

    /* Für den Tab „Heute": Serie samt freien Schutzen an `datum`. */
    serieHeute(stand, datum) {
        const schutz = FORTSCHRITT.schutzVerdient(FORTSCHRITT.level(stand).level);
        const serie = FORTSCHRITT.serie(stand, datum, schutz);
        return { tage: serie.tage, heute: serie.heute, schutz: Math.max(0, schutz - serie.schutzGenutzt) };
    },

    /* ---------------------------------------------------------------- *
     * Eine gespielte Partie
     * ---------------------------------------------------------------- */

    /* Grund-XP der Tagesaufgabe je Schwierigkeit (1 leicht … 3 schwer);
       Unbekanntes zählt als mittel. */
    grundXp(stufe) {
        return FORTSCHRITT.XP.tagesaufgabe[stufe] || FORTSCHRITT.XP.tagesaufgabe[2];
    },

    /* Die Felder des Vertrags, wie sie ans Konto dürfen (Regel §11b in
       Apps\Blunderluck\SICHERHEIT.md): `version` und NUR der eigene Zweig,
       darin nur erlaubte Felder. `umzug` und alles Unbekannte bleiben
       draussen — die Regel lehnt sonst den GANZEN Konto-Eintrag ab. */
    fuerKonto(stand) {
        const zweig = FORTSCHRITT.zweig(stand);
        const zaehler = {};
        for (const feld of Object.keys(zweig.zaehler)) {
            if (/^[a-zA-Z]{1,32}$/.test(feld) && typeof zweig.zaehler[feld] === "number") {
                zaehler[feld] = Math.min(FORTSCHRITT._zahl(zweig.zaehler[feld], 1000000000), 1000000000);
            }
        }
        return {
            version: FORTSCHRITT.VERSION,
            spiele: {
                typoluck: {
                    xp: zweig.xp,
                    partien: zweig.partien,
                    stand: zweig.stand,
                    gezaehlt: zweig.gezaehlt.filter((id) => id.length <= 64).slice(-100),
                    tage: zweig.tage.slice(-1000),
                    heute: { datum: zweig.heute.datum, versuche: zweig.heute.versuche, figuren: zweig.heute.figuren },
                    zaehler: zaehler,
                    taten: zweig.taten.filter((id) => id.length <= 64).slice(-1000)
                }
            }
        };
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
     * `stufen` = UPCREW_ANPASSEN.STUFEN (optional, für die Belohnungen).
     * Liefert { stand, xp, levelVorher, levelNachher, neu (Belohnungen der
     * neu erreichten Level), taten (neu erfüllte Tat-Kennungen) }.
     */
    partie(alt, angaben, stufen) {
        const stand = FORTSCHRITT.normalisieren(alt);
        const zweig = stand.spiele[FORTSCHRITT.APP] || FORTSCHRITT.zweigLeer();
        const datum = angaben.datum;
        const figuren = Math.max(0, Math.min(3, Math.floor(angaben.figuren || 0)));
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

    /* ---------------------------------------------------------------- *
     * Profil: Abzeichen, Statistik, Spiele (seit 0.12.0)
     * ---------------------------------------------------------------- */

    /*
     * DIE ABZEICHEN (seit 0.15.9) rechnet der gemeinsame Baustein
     * js\upcrew-abzeichen.js aus Design\3D-Schrift\final — gleich in
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
    }
};

if (typeof module !== "undefined" && module.exports) {
    module.exports = FORTSCHRITT;
}
