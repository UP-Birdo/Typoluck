/*
 * upcrew-katalog.js — EINE Liste aller Sammel-Stücke beider UPCrew-Spiele (rein: nur Daten und Nachschlagen,
 * kein Bildschirm, kein Speicher). Sammlung (upcrew-anpassen.js) und Shop (upcrew-shop.js) zeichnen aus dieser
 * Liste, upcrew-besitz.js rechnet Preise und Käufe daraus.
 *
 * Gemeinsamer Baustein: in die Apps KOPIEREN, nie abwandeln.
 * Vorlage: der Katalog-Entwurf der Runde 8 (vom Nutzer gesehen).
 *
 * EINE ART (Kategorie):
 *     schluessel   passt auf die Konto-Regel `besitz/<art>`: ^[a-z][a-z0-9]{1,23}$
 *     name         Anzeigename
 *     spiel        "alle" | "blunderluck" | "typoluck"
 *     mass         Liefer-Maß des Stück-Bilds (Breite x Höhe in px bei 1x)
 *     preis        Preis jedes kaufbaren Stücks der Art (null = die Art ist nie kaufbar)
 *     anlegbar     true = man trägt EIN Stück davon (Kategorie in der Sammlung mit Probe und Übernehmen);
 *                  false = nur Besitz (Abzeichen zeigt das Spiel selbst, Pakete gibt es nur im Shop)
 *     regal        wahlfrei: unter welchem Schlüssel das Spiel dieses Regal heute an UPCREW_ANPASSEN gibt
 *                  (Blunderluck: "design2d", "thema", "figuren") — so bleibt der Aufruf des Spiels gleich
 *     bild         "baustein" = das Bild kommt aus den Bausteinen (Farbton, Schriftprobe, Mini-Knopf), es muss
 *                  keine Datei geliefert werden
 *
 * EIN STÜCK:
 *     art          Schlüssel der Art
 *     wert         nur [A-Za-z0-9-] (der Unterstrich trennt im Konto-Text). Was es heute schon gibt, heißt GENAU
 *                  wie im Spiel oder Baustein (Quellen siehe unten).
 *     name         Anzeigename
 *     weg          "start" (hat jeder) | "kauf" (im Shop) | "erspielt" (nie kaufbar)
 *     preis        Zahl bei "kauf", sonst null
 *     paket        wahlfrei: `wert` des ersten Design-Pakets, in dem das Stück steckt
 *     wirkt        true = das Spiel kann es heute anwenden; false = nur geführt (Shop: „bald“, nicht kaufbar)
 *     platz        Name des Bild-Platzes: "stueck/<art>/<wert>" (upcrew-platz.js)
 *     inhalt       nur Pakete: [[art, wert], …]
 *     vorschau     nur Farbwelten, die es noch nicht in UPCREW_INTRO.WELTEN gibt: ihre Grundfarben, damit die
 *                  Paket-Karte sich in der eigenen Farbwelt zeigen kann
 *
 * BEWUSST OHNE LEVEL-FELD (Nutzer 03.10.2026: „ignoriere erstmal die belohnungen … das machen wir dann nochmal
 * gemeinsam“). "erspielt" heißt nur „wird erspielt“. Was heute über das Level frei wird, steht weiter allein in
 * UPCREW_ANPASSEN.STUFEN und bleibt in seiner Wirkung unangetastet.
 *
 * PREISE: Design-Paket 900 · Farbwelt 400 ·
 * Material 250 · Schrift 200 · Knöpfe 150 · Sieg-Effekt 120 · Profilzeichen 120 · Flammen-Farbe 100 · Intro 100.
 * ANNAHME (steht NICHT in Abschnitt 6, aus dem Entwurf Runde 8 übernommen, der Nutzer entscheidet):
 *     Kachel-Set 250 · Brett-Design 2D 250 · Brett-Design 3D 250 · Figuren-Stil 250 · Einband 150 · Brettform 150.
 * Nicht im Katalog: der Vorrat (Tipp 15, Extra-Versuch/Zeit zurück 30) — Preise und Zähler bleiben in
 * UPCREW_MUENZEN.WAREN — und der Set-Platz (80; kein Sammel-Stück, im Entwurf nicht enthalten).
 *
 * QUELLEN DER WERTE (nachgemessen am 03.10.2026):
 *     farbwelt   UPCREW_INTRO.WELTEN / UPCREW_AUSSEHEN.WAHL.farbwelt: grau werkstatt studio feld tiefsee gold.
 *                Kirschblüte … Neon gibt es dort noch nicht → wirkt: false.
 *     schrift    UPCREW_AUSSEHEN.WAHL.schrift S1 … S6 (Name „Crew n“ wie upcrew-anpassen.js)
 *     knoepfe    UPCREW_AUSSEHEN.WAHL.knoepfe K1 … K6 (Namen KNOPF_NAMEN in upcrew-anpassen.js)
 *     abzeichen  upcrew-abzeichen.js (fünf gemeinsame, Kennung "up-<id>") und upcrew-abzeichen-spiele.js
 *     kachelset  Typoluck js\kachelsets.js SETS (id)
 *     brett2d    Blunderluck js\brett-design.js DESIGNS (wert)          — Regal "design2d"
 *     brett3d    Blunderluck js\sammlung.js THEMEN (wert)               — Regal "thema"
 *     figurstil  Blunderluck js\sammlung.js FIGUREN (wert)              — Regal "figuren"
 *     rahmen, titel, material, sieg, flamme, profilzeichen: die Namen aus upcrew-levelpfad.js TABELLE stehen
 *                hier mit; alles Weitere ist aus dem Entwurf (erfunden) und wirkt noch nicht.
 *
 * Nutzung:
 *     UPCREW_KATALOG.ARTEN / .STUECKE / .NEU / .PREISE / .PREISE_ANNAHME
 *     UPCREW_KATALOG.art("farbwelt")                 → Art oder null
 *     UPCREW_KATALOG.stueck("farbwelt", "studio")    → Stück oder null
 *     UPCREW_KATALOG.kennung(stueck)                 → "farbwelt-studio";  .nachKennung("farbwelt-studio")
 *     UPCREW_KATALOG.stuecke("kachelset")            → alle Stücke der Art
 *     UPCREW_KATALOG.arten("typoluck")               → Arten, die dieses Spiel zeigt (alle + eigene)
 *     UPCREW_KATALOG.inhalt(paket)                   → die Stücke eines Pakets
 *     UPCREW_KATALOG.istNeu(stueck)                  → steht auf der Liste NEU
 *     UPCREW_KATALOG.pruefen()                       → Liste der Verstöße (leer = gut)
 */
(function () {
    "use strict";

    const ART_MUSTER = /^[a-z][a-z0-9]{1,23}$/;
    const WERT_MUSTER = /^[A-Za-z0-9-]+$/;
    const WEGE = ["start", "kauf", "erspielt"];
    const SPIELE = ["alle", "blunderluck", "typoluck"];

    /* Tabelle aus Abschnitt 6 … */
    const PREISE = { paket: 900, farbwelt: 400, material: 250, schrift: 200, knoepfe: 150, sieg: 120,
        profilzeichen: 120, flamme: 100, intro: 100 };
    /* … und die Annahmen (siehe Kopf). */
    const PREISE_ANNAHME = { kachelset: 250, brett2d: 250, brett3d: 250, figurstil: 250, einband: 150,
        brettform: 150 };

    function artBauen(schluessel, name, spiel, zusatz) {
        const preis = (schluessel in PREISE) ? PREISE[schluessel]
            : ((schluessel in PREISE_ANNAHME) ? PREISE_ANNAHME[schluessel] : null);
        return Object.assign({ schluessel: schluessel, name: name, spiel: spiel, mass: "96x96", preis: preis,
            anlegbar: true }, zusatz || {});
    }

    /* Reihenfolge = Anzeige. */
    const ARTEN = [
        artBauen("farbwelt", "Farbwelten", "alle", { bild: "baustein" }),
        artBauen("schrift", "Schriften", "alle", { bild: "baustein" }),
        artBauen("knoepfe", "Knöpfe", "alle", { bild: "baustein" }),
        artBauen("material", "Materialien", "alle"),
        artBauen("sieg", "Sieg-Effekte", "alle"),
        artBauen("flamme", "Flammen-Farben", "alle"),
        artBauen("profilzeichen", "Profilzeichen", "alle"),
        artBauen("rahmen", "Rahmen", "alle"),
        artBauen("titel", "Titel", "alle"),
        artBauen("intro", "Intro-Varianten", "alle"),
        artBauen("abzeichen", "Abzeichen", "alle", { anlegbar: false }),
        artBauen("paket", "Design-Pakete", "alle", { anlegbar: false }),
        artBauen("kachelset", "Kachel-Sets", "typoluck", { regal: "kachelset" }),
        artBauen("einband", "Einbände", "typoluck"),
        artBauen("brett2d", "Brett-Design · 2D", "blunderluck", { regal: "design2d" }),
        artBauen("brett3d", "Brett-Design · 3D", "blunderluck", { regal: "thema" }),
        artBauen("figurstil", "Figuren-Stil · 3D", "blunderluck", { regal: "figuren" }),
        artBauen("brettform", "Brettformen", "blunderluck")
    ];
    const ART = {};
    for (const a of ARTEN) {
        ART[a.schluessel] = a;
    }

    const STUECKE = [];
    const NACH_KENNUNG = {};

    const kennung = (s) => s.art + "-" + s.wert;

    function neu(art, wert, name, weg, wirkt, zusatz) {
        const w = weg || "kauf";
        const stueck = Object.assign({
            art: art,
            wert: wert,
            name: name,
            weg: w,
            preis: w === "kauf" ? ART[art].preis : null,
            wirkt: wirkt === true,
            platz: "stueck/" + art + "/" + wert
        }, zusatz || {});
        STUECKE.push(stueck);
        NACH_KENNUNG[kennung(stueck)] = stueck;
        return stueck;
    }

    /* Eine Reihe: [wert, name, weg (fehlt = "kauf"), wirkt (fehlt = Vorgabe der Reihe)]. */
    function reihe(art, wirkt, liste) {
        for (const e of liste) {
            neu(art, e[0], e[1], e[2], e.length > 3 ? e[3] : wirkt);
        }
    }

    /* ---------- gemeinsam (beide Spiele) ---------- */

    /* Die fünf neuen Welten (Vorschlag Abschnitt 6): Grundfarben aus dem Entwurf Runde 8 (bestehen dort
       UPCREW_FARBWELTEN.pruefen() in hell und dunkel). Sie wirken erst, wenn sie in upcrew-intro.js und
       upcrew-farbwelten.js stehen — bis dahin nur als Vorschau der Paket-Karte. */
    const VORSCHAU_FARBEN = {
        kirschbluete: {
            dunkel: { bg: "#1c1217", fl: "#291a22", ta: "#472e3a", ink: "#f8eaf0", lei: "#a38995", ak: "#f0609a" },
            hell: { bg: "#f0e4e9", fl: "#faf5f7", ta: "#e0cbd4", ink: "#29171f", lei: "#846b75", ak: "#cf3273" },
            kacheln: { richtig: "#cf3273", vorhanden: "#3f8fe0" } },
        nordlicht: {
            dunkel: { bg: "#0e1819", fl: "#172527", ta: "#2a4245", ink: "#e6f4f4", lei: "#82999b", ak: "#2fd0c8" },
            hell: { bg: "#deeaea", fl: "#f2f8f8", ta: "#c2d6d6", ink: "#132123", lei: "#657b7c", ak: "#0a7f7a" },
            kacheln: { richtig: "#15989a", vorhanden: "#e0622e" } },
        mitternacht: {
            dunkel: { bg: "#0e0f1f", fl: "#17182d", ta: "#2b2d4f", ink: "#e9eafa", lei: "#888aa8", ak: "#6d74ff" },
            hell: { bg: "#e3e4f1", fl: "#f4f5fb", ta: "#c9cbe2", ink: "#15162b", lei: "#6a6c88", ak: "#4a50e0" },
            kacheln: { richtig: "#5a60f0", vorhanden: "#e0622e" } },
        sandstein: {
            dunkel: { bg: "#1b1512", fl: "#27201b", ta: "#43362d", ink: "#f4ece4", lei: "#9c8e82", ak: "#e07a4f" },
            hell: { bg: "#ece2d8", fl: "#f9f4ee", ta: "#d8c8b8", ink: "#241a13", lei: "#7d6e61", ak: "#c2562a" },
            kacheln: { richtig: "#c2562a", vorhanden: "#3f8fe0" } },
        neon: {
            dunkel: { bg: "#08080a", fl: "#131317", ta: "#2a2a33", ink: "#f6f2fa", lei: "#8e8a99", ak: "#ff2fd0" },
            hell: { bg: "#e8e6ec", fl: "#f7f6f9", ta: "#cfccd6", ink: "#121116", lei: "#6d6a76", ak: "#d312a8" },
            kacheln: { richtig: "#d312a8", vorhanden: "#2f7de8" } }
    };

    reihe("farbwelt", true, [
        ["grau", "Grau", "start"], ["werkstatt", "Werkstatt"], ["studio", "Studio"], ["feld", "Feld"],
        ["tiefsee", "Tiefsee"], ["gold", "Gold", "erspielt"],
        ["kirschbluete", "Kirschblüte", "kauf", false], ["nordlicht", "Nordlicht", "kauf", false],
        ["mitternacht", "Mitternacht", "kauf", false], ["sandstein", "Sandstein", "kauf", false],
        ["neon", "Neon", "kauf", false]
    ]);
    for (const wert of Object.keys(VORSCHAU_FARBEN)) {
        NACH_KENNUNG["farbwelt-" + wert].vorschau = VORSCHAU_FARBEN[wert];
    }
    /* Reihenfolge wie UPCREW_ANPASSEN.STUFEN (= Anzeige heute). */
    reihe("schrift", true, [
        ["S1", "Crew 1", "start"], ["S4", "Crew 4"], ["S2", "Crew 2"], ["S3", "Crew 3"], ["S5", "Crew 5"],
        ["S6", "Crew 6"]
    ]);
    reihe("knoepfe", true, [
        ["K1", "Stufe", "start"], ["K5", "Kapsel"], ["K3", "Taste"], ["K2", "Kissen"], ["K4", "Stempel"],
        ["K6", "Ecke"]
    ]);
    /* Ab hier wirkt noch nichts: Die Spiele können diese Arten heute nicht anwenden. Holz, Kreide, Neon, Kupfer,
       Glas · Konfetti, Tinte, Funken, Feuerwerk · Blau, Violett · Feder, Krone stehen so in upcrew-levelpfad.js. */
    reihe("material", false, [
        ["papier", "Papier", "start"], ["holz", "Holz"], ["kreide", "Kreide"], ["neon", "Neon"],
        ["kupfer", "Kupfer"], ["glas", "Glas"], ["messing", "Messing"], ["marmor", "Marmor"], ["beton", "Beton"],
        ["samt", "Samt"], ["goldpraegung", "Goldprägung", "erspielt"]
    ]);
    reihe("sieg", false, [
        ["konfetti", "Konfetti", "start"], ["tinte", "Tinte"], ["funken", "Funken"], ["feuerwerk", "Feuerwerk"],
        ["sternregen", "Sternregen"], ["muenzregen", "Münzregen"], ["blitz", "Blitz"], ["glanz", "Glanz"],
        ["meisterstempel", "Meister-Stempel", "erspielt"]
    ]);
    reihe("flamme", false, [
        ["orange", "Orange", "start"], ["blau", "Blau"], ["violett", "Violett"], ["gruen", "Grün"],
        ["pink", "Pink"], ["tuerkis", "Türkis"], ["weiss", "Weiß"], ["rot", "Rot"], ["magenta", "Magenta"]
    ]);
    reihe("profilzeichen", false, [
        ["punkt", "Punkt", "start"], ["feder", "Feder"], ["krone", "Krone"], ["stern", "Stern"],
        ["blitz", "Blitz"], ["anker", "Anker"], ["wuerfel", "Würfel"], ["schluessel", "Schlüssel"],
        ["kompass", "Kompass"], ["mond", "Mond"], ["sonne", "Sonne"], ["blatt", "Blatt"], ["tropfen", "Tropfen"],
        ["zahnrad", "Zahnrad"]
    ]);
    /* Rahmen und Titel: nur erspielt (Abschnitt 6 „Geschmack ist kaufbar, Können nicht“). Silber … Glanz 4 und
       Stammgast, Kenner, Legende stehen so in upcrew-levelpfad.js; Schlicht, Neuling und die übrigen Titel sind
       aus dem Entwurf. */
    reihe("rahmen", false, [
        ["schlicht", "Schlicht", "start"], ["silber", "Silber", "erspielt"], ["gold", "Gold", "erspielt"],
        ["platin", "Platin", "erspielt"], ["glanz-1", "Glanz 1", "erspielt"], ["glanz-2", "Glanz 2", "erspielt"],
        ["glanz-3", "Glanz 3", "erspielt"], ["glanz-4", "Glanz 4", "erspielt"]
    ]);
    reihe("titel", false, [
        ["neuling", "Neuling", "start"], ["stammgast", "Stammgast", "erspielt"], ["kenner", "Kenner", "erspielt"],
        ["legende", "Legende", "erspielt"], ["tueftler", "Tüftler", "erspielt"],
        ["wortschmied", "Wortschmied", "erspielt"], ["stratege", "Stratege", "erspielt"],
        ["sammler", "Sammler", "erspielt"], ["meister", "Meister", "erspielt"]
    ]);
    reihe("intro", false, [
        ["klassik", "Klassik", "start"], ["kurz", "Kurz"], ["schreibmaschine", "Schreibmaschine"],
        ["wuerfelwurf", "Würfelwurf"]
    ]);

    /* Abzeichen: die echten Listen (fünf gemeinsame aus upcrew-abzeichen.js mit Kennung "up-<id>", dann
       upcrew-abzeichen-spiele.js). Nur erspielt; sichtbar in beiden Spielen. */
    reihe("abzeichen", true, [
        ["up-partien", "Viel gespielt"], ["up-besteSerie", "Serie"], ["up-beideTage", "Beide Spiele"],
        ["up-figuren", "Figuren"], ["up-tagesaufgaben", "Tagesaufgaben"],
        ["bl-erster-sieg", "Erster Sieg"], ["bl-veteran", "Veteran"], ["bl-beidhaendig", "Beidhändig"],
        ["bl-serie-3", "Serienheld"], ["bl-comeback", "Comeback"], ["bl-blitzmatt", "Blitzmatt"],
        ["bl-marathon", "Marathon"], ["bl-nachteule", "Nachteule"], ["bl-sammler", "Sammler"],
        ["bl-allrounder", "Allrounder"], ["bl-hunderter", "Hunderter"], ["bl-unaufhaltsam", "Unaufhaltsam"],
        ["bl-dauerbrenner", "Dauerbrenner"], ["bl-legende", "Legende"],
        ["tl-zwei-versuche", "Blitzmerker"], ["tl-koennen", "Wortkönner"], ["tl-perfekt", "Perfekt"],
        ["tl-erstes-buch", "Erstes Buch"], ["tl-buecherwurm", "Bücherwurm"]
    ].map((e) => [e[0], e[1], "erspielt"]));

    /* ---------- Typoluck ---------- */
    /* Die zehn Sets aus js\kachelsets.js. Heute kommen Leder, Blei, Holz, Neon über Taten und die übrigen über
       das Level — das bleibt so; „kauf“ ist ein WEITERER Weg (Annahme aus dem Entwurf). */
    reihe("kachelset", true, [
        ["papier", "Papier", "start"], ["leder", "Leder"], ["blei", "Blei"], ["holz", "Holz"], ["neon", "Neon"],
        ["kreide", "Kreide"], ["sand", "Sand"], ["mitternacht", "Mitternacht"], ["kupfer", "Kupfer"],
        ["glas", "Glas"]
    ]);
    reihe("einband", false, [
        ["leinen", "Leinen", "start"], ["leder", "Leder"], ["samt", "Samt"], ["marmorpapier", "Marmorpapier"],
        ["kork", "Kork"], ["boss-1", "Boss-Einband I", "erspielt"], ["boss-2", "Boss-Einband II", "erspielt"],
        ["boss-3", "Boss-Einband III", "erspielt"]
    ]);

    /* ---------- Blunderluck ---------- */
    reihe("brett2d", true, [
        ["grau", "Grau", "start"], ["farbwelt", "Farbwelt"], ["holz", "Holz"], ["marmor", "Marmor"],
        ["nacht", "Nacht"], ["turnier", "Turnier"]
    ]);
    reihe("brett3d", true, [
        ["blunderluck", "Farbwelt", "start"], ["holz", "Holz"], ["marmor", "Marmor"], ["nacht", "Nacht"],
        ["turnier", "Turnier"]
    ]);
    reihe("figurstil", true, [
        ["emaille", "Emaille", "start"], ["matt", "Matt"], ["porzellan", "Porzellan"], ["metall", "Metall"],
        ["glas", "Glas", "kauf", false]
    ]);
    /* Erfunden (Entwurf). Achtung: In Blunderluck heißt heute die Liste der Spielarten „Brettformen“. */
    reihe("brettform", false, [
        ["klassisch", "Klassisch", "start"], ["rund", "Rund"], ["kantig", "Kantig"], ["fuge", "Mit Fuge"],
        ["insel", "Insel"]
    ]);

    /* ---------- Design-Pakete: je kaufbare Farbwelt eins ----------
       Inhalt = Farbwelt + Vorschläge Schrift, Knöpfe, Material, Flamme; nach dem Kauf ist jedes Teil einzeln im
       Besitz. Ein Paket wirkt, wenn seine Farbwelt wirkt (ANNAHME: Teile, die noch nicht wirken, liegen dann
       schon im Besitz bereit). */
    const PAKET_LISTE = [
        ["werkstatt", "Werkstatt", "S1", "K1", "messing", "orange"],
        ["studio", "Studio", "S4", "K5", "glas", "violett"],
        ["feld", "Feld", "S2", "K2", "holz", "gruen"],
        ["tiefsee", "Tiefsee", "S3", "K6", "marmor", "blau"],
        ["kirschbluete", "Kirschblüte", "S5", "K5", "samt", "pink"],
        ["nordlicht", "Nordlicht", "S2", "K3", "glas", "tuerkis"],
        ["mitternacht", "Mitternacht", "S6", "K6", "beton", "weiss"],
        ["sandstein", "Sandstein", "S4", "K4", "kupfer", "rot"],
        ["neon", "Neon", "S3", "K3", "neon", "magenta"]
    ];
    for (const p of PAKET_LISTE) {
        const inhalt = [["farbwelt", p[0]], ["schrift", p[2]], ["knoepfe", p[3]], ["material", p[4]],
            ["flamme", p[5]]];
        neu("paket", p[0], p[1], "kauf", NACH_KENNUNG["farbwelt-" + p[0]].wirkt, { inhalt: inhalt });
        for (const teil of inhalt) {
            const s = NACH_KENNUNG[teil[0] + "-" + teil[1]];
            /* `paket` am Stück = das erste Paket, in dem es steckt. */
            if (s && !s.paket) {
                s.paket = p[0];
            }
        }
    }

    /* „neu“ ist kein Feld des Stücks, sondern eine Liste von Kennungen (wechselt mit jeder Lieferung). */
    const NEU = ["farbwelt-kirschbluete", "farbwelt-nordlicht", "farbwelt-mitternacht", "farbwelt-sandstein",
        "farbwelt-neon", "paket-kirschbluete", "paket-neon", "flamme-magenta", "profilzeichen-zahnrad",
        "sieg-glanz", "kachelset-glas", "einband-kork", "figurstil-glas", "brettform-insel"];

    /* ---------- Nachschlagen ---------- */
    function art(schluessel) {
        return ART[schluessel] || null;
    }

    function stueck(artSchluessel, wert) {
        return NACH_KENNUNG[artSchluessel + "-" + wert] || null;
    }

    /* "farbwelt-studio" → Stück. Der Wert darf selbst Bindestriche tragen ("abzeichen-bl-erster-sieg"). */
    function nachKennung(text) {
        return NACH_KENNUNG[String(text)] || null;
    }

    function stuecke(artSchluessel) {
        return STUECKE.filter((s) => s.art === artSchluessel);
    }

    /* Die Arten, die ein Spiel zeigt: die gemeinsamen und seine eigenen. Ohne Spiel: alle. */
    function arten(spiel) {
        return ARTEN.filter((a) => !spiel || a.spiel === "alle" || a.spiel === spiel);
    }

    function inhalt(paket) {
        const liste = (paket && Array.isArray(paket.inhalt)) ? paket.inhalt : [];
        return liste.map((teil) => stueck(teil[0], teil[1])).filter(Boolean);
    }

    function istNeu(s) {
        return !!s && NEU.indexOf(kennung(s)) !== -1;
    }

    function zahlen() {
        const je = {};
        for (const s of STUECKE) {
            je[s.art] = (je[s.art] || 0) + 1;
        }
        return je;
    }

    /* Hält die Liste ehrlich (auch tests\test-katalog.js): leer = gut. */
    function pruefen() {
        const fehler = [];
        const gesehen = {};
        for (const a of ARTEN) {
            if (!ART_MUSTER.test(a.schluessel)) {
                fehler.push("Art " + a.schluessel + ": Schlüssel passt nicht auf die Konto-Regel");
            }
            if (SPIELE.indexOf(a.spiel) === -1) {
                fehler.push("Art " + a.schluessel + ": unbekanntes Spiel " + a.spiel);
            }
            if (!/^\d+x\d+$/.test(a.mass)) {
                fehler.push("Art " + a.schluessel + ": Maß fehlt");
            }
        }
        for (const s of STUECKE) {
            const k = kennung(s);
            if (!ART[s.art]) {
                fehler.push(k + ": unbekannte Art");
                continue;
            }
            if (!WERT_MUSTER.test(s.wert)) {
                fehler.push(k + ": Wert passt nicht auf [A-Za-z0-9-]");
            }
            if (gesehen[k]) {
                fehler.push(k + ": doppelt");
            }
            gesehen[k] = true;
            if (WEGE.indexOf(s.weg) === -1) {
                fehler.push(k + ": unbekannter Weg " + s.weg);
            }
            if (s.weg === "kauf" ? !(typeof s.preis === "number" && s.preis > 0) : s.preis !== null) {
                fehler.push(k + ": Preis passt nicht zum Weg");
            }
            if (typeof s.wirkt !== "boolean" || typeof s.name !== "string" || !s.name) {
                fehler.push(k + ": wirkt oder Name fehlt");
            }
            if (s.platz !== "stueck/" + s.art + "/" + s.wert) {
                fehler.push(k + ": Platz-Name stimmt nicht");
            }
            if (s.paket !== undefined && !NACH_KENNUNG["paket-" + s.paket]) {
                fehler.push(k + ": Paket " + s.paket + " gibt es nicht");
            }
            if (s.art === "paket") {
                for (const teil of s.inhalt || []) {
                    const t = stueck(teil[0], teil[1]);
                    if (!t) {
                        fehler.push(k + ": Inhalt " + teil.join("-") + " gibt es nicht");
                    } else if (t.weg === "erspielt") {
                        fehler.push(k + ": enthält Erspieltes (" + teil.join("-") + ")");
                    }
                }
            }
        }
        for (const k of NEU) {
            if (!NACH_KENNUNG[k]) {
                fehler.push("NEU: " + k + " gibt es nicht");
            }
        }
        return fehler;
    }

    const UPCREW_KATALOG = { ARTEN: ARTEN, STUECKE: STUECKE, NEU: NEU, PREISE: PREISE,
        PREISE_ANNAHME: PREISE_ANNAHME, ART_MUSTER: ART_MUSTER, WERT_MUSTER: WERT_MUSTER, WEGE: WEGE,
        art: art, stueck: stueck, kennung: kennung, nachKennung: nachKennung, stuecke: stuecke, arten: arten,
        inhalt: inhalt, istNeu: istNeu, zahlen: zahlen, pruefen: pruefen };
    globalThis.UPCREW_KATALOG = UPCREW_KATALOG;
    if (typeof module !== "undefined" && module.exports) {
        module.exports = UPCREW_KATALOG;
    }
})();
