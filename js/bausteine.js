/*
 * bausteine.js — die sichtbaren Grundteile: Knopf, Karte, Kopfzeile, Zeichen.
 *
 * WARUM ES DIESE DATEI GIBT — die Naht für den 3D-Look:
 * Der Nutzer hat angesagt, dass nach den 2D-Grundlagen 3D-Knöpfe und mehr
 * folgen (24.09.2026). Damit das später EIN Umbau an EINER Stelle ist und
 * nicht einer an jedem Bildschirm, entsteht JEDER Knopf der App hier
 * (`BAUSTEINE.knopf`), jede Karte hier, jedes Zeichen hier. Kein Bildschirm
 * baut sich einen <button> selbst.
 *
 * Wie der 3D-Look später andockt (Plan, docs\ARCHITECTURE.md, „3D"):
 *   1. Stufe „Tiefe per Stil": seit 0.8.0 die gemeinsamen UPCrew-Knöpfe
 *      (unten, `UP_KLASSEN`) — Kante, Tiefe und Einsinken kommen aus
 *      css\upcrew-knoepfe.css, ohne eine Zeile JavaScript.
 *   2. Stufe „echte Formen": `knopf()` bekommt einen Zweig, der zusätzlich
 *      ein gerendertes Bild bzw. eine three.js-Fläche einhängt. Die
 *      Bildschirme merken davon nichts, weil sie nur `knopf()` rufen.
 *
 * DIE UPCREW-KNÖPFE (seit 0.8.0, UPCrew-Runde 3): Haupt-, Still- und
 * Gefahr-Knöpfe tragen zusätzlich `up-kn` + `up-haupt` | `up-zweit` |
 * `up-gefahr` (nur Zeichen, kein Text: `up-rund`) und als erstes Kind den
 * Leuchtpunkt `<i class="up-led">`. Die Form (Rundung, Kante, Schatten,
 * Rahmen) kommt damit NUR aus dem kopierten Baustein css\upcrew-knoepfe.css
 * — in der Familie, die der Spieler im Tab „Anpassen" wählt (K1-K6), gleich
 * in Blunderluck. css\stil.css regelt für diese Knöpfe nur noch Grösse und
 * Anordnung; ein Test zählt, dass es so bleibt. NICHT umgestellt sind die
 * Knöpfe, die keine Knöpfe im Sinne des Standards sind: `flach` (Zeichen in
 * Kopfzeilen, Textverweise) und `menue` (Einträge hinter den drei Balken) —
 * wie Tasten und Kacheln behalten sie ihr eigenes Aussehen.
 *
 * DIE TABS DER LEISTE UNTEN (seit 0.9.0, UPCrew-Runde 4) entstehen in
 * `tab()`, nicht in `knopf()`: Ihr Aussehen kommt ganz aus dem kopierten
 * Baustein css\upcrew-leiste.css, und der verlangt genau sein Markup
 * (`up-tab`, Zeichen, Name) — wie Tasten und Segment-Schalter an genau
 * einer Stelle gebaut. Stücke der Sammlung und Abzeichen baut seit 0.15.9
 * der gemeinsame Baustein (js\upcrew-sammlung.js, js\upcrew-abzeichen.js).
 *
 * Die Zeichen sind eigene Linienzeichnungen (24er-Raster, nur Striche), keine
 * Emojis (Haus-Regel) und keine fremde Zeichensammlung.
 */

const BAUSTEINE = {

    /* Welche Knopf-Art welche UPCrew-Klasse bekommt (seit 0.8.0). Arten,
       die hier fehlen, bleiben ohne `up-kn`. */
    UP_KLASSEN: {
        haupt: "up-haupt",
        still: "up-zweit",
        gefahr: "up-gefahr"
    },

    /*
     * Ein Knopf.
     *   text      Beschriftung
     *   art       "haupt" | "still" | "gefahr" | "flach" | "menue"
     *             (Vorgabe: still). Haupt = DIE eine Hauptaktion des
     *             Bildschirms; menue = Eintrag im Menü hinter den drei
     *             Balken (seit 0.3.0, gebaut in js\navigation.js). Die Art
     *             „leiste" (0.5.0 bis 0.8.1) ist seit 0.9.0 `tab()`.
     *   zeichen   optional ein Name aus ZEICHEN (steht vor dem Text)
     *   klein     true = kleinere Form für Zeilen und Leisten
     *   breit     true = volle Breite
     *   titel     Hinweis beim Darüberfahren / fürs Vorlesen
     *   beiKlick  Funktion
     */
    knopf(angaben) {
        const art = angaben.art || "still";
        const upKlasse = BAUSTEINE.UP_KLASSEN[art];
        const knopf = document.createElement("button");
        knopf.type = "button";
        knopf.className = "knopf knopf-" + art
            + (upKlasse ? " up-kn " + upKlasse + (angaben.text ? "" : " up-rund") : "")
            + (angaben.klein ? " knopf-klein" : "")
            + (angaben.breit ? " knopf-breit" : "");

        /* Der Leuchtpunkt der UPCrew-Knöpfe steht als ERSTES Kind (leuchtet
           nur in der Familie K3, sonst unsichtbar). */
        if (upKlasse) {
            knopf.appendChild(BAUSTEINE.el("i", "up-led"));
        }
        if (angaben.zeichen) {
            knopf.appendChild(BAUSTEINE.zeichen(angaben.zeichen));
        }
        if (angaben.text) {
            const beschriftung = document.createElement("span");
            beschriftung.className = "knopf-text";
            beschriftung.textContent = angaben.text;
            knopf.appendChild(beschriftung);
        }
        if (angaben.titel) {
            knopf.title = angaben.titel;
            knopf.setAttribute("aria-label", angaben.titel);
        }
        /* 0.4.0 bis 0.8.0 vibrierte hier jeder Knopf beim Antippen. Seit
           0.8.1 ist die Vibration überall raus (Nutzer 26.09.2026: „kommt
           erst wann anders"). */
        if (angaben.beiKlick) {
            knopf.addEventListener("click", angaben.beiKlick);
        }
        return knopf;
    },

    /*
     * Ein Tab der Leiste unten (seit 0.9.0) — Markup genau wie im Kopf von
     * css\upcrew-leiste.css, gleich in Blunderluck:
     *     <button type="button" class="up-tab" aria-label="Start">
     *         <svg viewBox="0 0 24 24" aria-hidden="true"><path d="…"/></svg><span>Start</span>
     *     </button>
     * Der Name ist nur am aktiven Tab zu sehen (aria-current="page", setzt
     * js\navigation.js); aria-label trägt ihn für Vorleseprogramme.
     *   name      ein Wort
     *   zeichen   Name aus ZEICHEN
     *   still     true = abgeschaltet, hält nur den Platz frei (up-tab-still)
     *   beiKlick  Funktion
     */
    tab(angaben) {
        const tab = document.createElement("button");
        tab.type = "button";
        tab.className = "up-tab" + (angaben.still ? " up-tab-still" : "");
        tab.setAttribute("aria-label", angaben.name);

        /* Das Zeichen ohne die Klasse „zeichen": Strich und Grösse regelt
           hier der Baustein, nicht der eigene Stil. */
        const zeichen = BAUSTEINE.zeichen(angaben.zeichen);
        zeichen.removeAttribute("class");
        tab.appendChild(zeichen);
        tab.appendChild(BAUSTEINE.el("span", null, angaben.name));

        if (angaben.still) {
            tab.disabled = true;
        } else if (angaben.beiKlick) {
            tab.addEventListener("click", angaben.beiKlick);
        }
        return tab;
    },

    /*
     * Die Wertung als Schachfiguren (seit 0.10.0, UPCrew-Runde 5; Nutzer
     * 27.09.2026: „Nimm Schachfiguren als Wertung"): Bauer, Springer,
     * König — die ersten `anzahl` leuchten. Gefüllte Formen, deshalb eigene
     * Pfade (FIGUREN) statt der Linien-Zeichen; Pfade wörtlich aus dem
     * Entwurf Design\3D-Schrift\entwuerfe\Herausforderungen.
     *   anzahl  0..3
     *   klein   true = für Zeilen und Karten
     */
    FIGUREN: [
        "M12 3.5 A3.2 3.2 0 1 1 11.99 3.5 Z M9 11 H15 L14 12.5 L16.5 18 H7.5 L10 12.5 Z M6 19 H18 V21.5 H6 Z",
        "M7 21.5 H18.5 V19 H17.2 C17.4 14.5 18.2 10.5 15.8 6.8 C14.3 4.4 11.8 3.2 9.6 3.6 L10.6 5.2 "
            + "C9.3 5.8 6.9 8 5.5 10.2 L6.4 12.3 L9.2 11.4 L11.3 10.4 C10.2 13 8.3 15 8.4 19 H7 Z",
        "M11 1.5 H13 V3.5 H15 V5.5 H13 V7.5 H11 V5.5 H9 V3.5 H11 Z M7.5 9 C9 8 15 8 16.5 9 L15 17.5 H9 Z "
            + "M6 18.5 H18 V21.5 H6 Z"
    ],

    figuren(anzahl, klein) {
        const reihe = BAUSTEINE.el("span", "figuren" + (klein ? " figuren-klein" : ""));
        reihe.setAttribute("role", "img");
        reihe.setAttribute("aria-label", ["Keine Figur", "Bauer", "Springer", "König"][anzahl] || "Keine Figur");
        const ns = "http://www.w3.org/2000/svg";
        BAUSTEINE.FIGUREN.forEach((d, i) => {
            const svg = document.createElementNS(ns, "svg");
            svg.setAttribute("viewBox", "0 0 24 24");
            svg.setAttribute("class", "figur" + (i < anzahl ? " figur-an" : ""));
            svg.setAttribute("aria-hidden", "true");
            const pfad = document.createElementNS(ns, "path");
            pfad.setAttribute("d", d);
            svg.appendChild(pfad);
            reihe.appendChild(svg);
        });
        return reihe;
    },

    /*
     * Der Namens-Kreis mit Level-Ring (seit 0.10.0): Der Ring füllt sich mit
     * den XP im laufenden Level, unten rechts steht die Level-Zahl.
     *   name     für den Anfangsbuchstaben
     *   anteil   0..1 (XP im Level / Kosten des Levels)
     *   level    Zahl
     *   gross    true = für das Profil
     *   rahmen   wahlfrei (seit 0.12.0): FORTSCHRITT.rahmenVon(level) —
     *            der erreichte Rahmen als äussere Kante (Kupfer, Silber,
     *            Glanz, Gold)
     */
    levelRing(name, anteil, level, gross, rahmen) {
        const ring = BAUSTEINE.el("span", "level-ring" + (gross ? " level-ring-gross" : "")
            + (rahmen ? " level-rahmen level-rahmen-" + rahmen.stufe : ""));
        if (rahmen) {
            ring.title = "Rahmen " + rahmen.name;
        }
        ring.style.setProperty("--anteil", String(Math.max(0, Math.min(1, anteil || 0))));
        ring.appendChild(BAUSTEINE.kreis(name, gross ? "namens-kreis-gross" : null));
        const zahl = BAUSTEINE.el("span", "level-zahl", String(level));
        zahl.setAttribute("aria-label", "Level " + level);
        ring.appendChild(zahl);
        return ring;
    },

    /* Eine Karte mit optionaler Überschrift. */
    karte(titel, klasse) {
        const karte = document.createElement("section");
        karte.className = "karte" + (klasse ? " " + klasse : "");
        if (titel) {
            const kopf = document.createElement("h2");
            kopf.className = "karte-titel";
            kopf.textContent = titel;
            karte.appendChild(kopf);
        }
        return karte;
    },

    /* Die Kopfzeile eines Bildschirms: links Zurück (falls gewünscht),
       Mitte Titel, rechts ein beliebiges Element. */
    kopfzeile(titel, angaben) {
        const einstellung = angaben || {};
        const kopf = document.createElement("header");
        kopf.className = "kopfzeile";

        const links = document.createElement("div");
        links.className = "kopfzeile-seite";
        if (einstellung.zurueck) {
            links.appendChild(BAUSTEINE.knopf({
                art: "flach", zeichen: "zurueck", titel: "Zurück", beiKlick: einstellung.zurueck
            }));
        }
        kopf.appendChild(links);

        const mitte = document.createElement("h1");
        mitte.className = "kopfzeile-titel";
        mitte.textContent = titel;
        kopf.appendChild(mitte);

        const rechts = document.createElement("div");
        rechts.className = "kopfzeile-seite kopfzeile-rechts";
        if (einstellung.rechts) {
            rechts.appendChild(einstellung.rechts);
        }
        kopf.appendChild(rechts);

        return kopf;
    },

    /* Ein Segment-Schalter (z. B. „Heute | Woche"). `wahlen` = [{ wert, text }].
       Liefert das Element; `beiWahl(wert)` läuft bei jedem Wechsel. */
    segment(wahlen, aktuell, beiWahl, beschreibung) {
        const leiste = document.createElement("div");
        leiste.className = "segment";
        leiste.setAttribute("role", "radiogroup");
        if (beschreibung) {
            leiste.setAttribute("aria-label", beschreibung);
        }
        for (const wahl of wahlen) {
            const knopf = document.createElement("button");
            knopf.type = "button";
            knopf.className = "segment-wahl" + (wahl.wert === aktuell ? " segment-aktiv" : "");
            knopf.setAttribute("role", "radio");
            knopf.setAttribute("aria-checked", wahl.wert === aktuell ? "true" : "false");
            knopf.textContent = wahl.text;
            knopf.addEventListener("click", () => beiWahl(wahl.wert));
            leiste.appendChild(knopf);
        }
        return leiste;
    },

    /* Ein Element mit Klasse und Text — die Kurzform für alles Kleine. */
    el(tag, klasse, text) {
        const element = document.createElement(tag);
        if (klasse) {
            element.className = klasse;
        }
        if (text !== undefined && text !== null) {
            element.textContent = text;
        }
        return element;
    },

    /* Ein erklärender Satz in leiser Schrift. */
    erklaerung(text) {
        return BAUSTEINE.el("p", "erklaerung", text);
    },

    /* Der runde Namens-Kreis mit dem ersten Buchstaben. */
    kreis(name, klasse) {
        const kreis = BAUSTEINE.el("span", "namens-kreis" + (klasse ? " " + klasse : ""),
            String(name || "?").trim().charAt(0).toUpperCase() || "?");
        kreis.setAttribute("aria-hidden", "true");
        return kreis;
    },

    /* ---------------------------------------------------------------- *
     * Zeichen — Linienzeichnungen im 24er-Raster
     * ---------------------------------------------------------------- */

    ZEICHEN: {
        start: "M3 11 L12 4 L21 11 M5.5 9.5 V20 H10 V14.5 H14 V20 H18.5 V9.5",
        rangliste: "M7 4 H17 V9 A5 5 0 0 1 7 9 Z M7 6 H4 V7 A3 3 0 0 0 7 10 "
            + "M17 6 H20 V7 A3 3 0 0 1 17 10 M12 14 V17 M8 20 H16 M9.5 17 H14.5 V20 H9.5 Z",
        freunde: "M9 11 A3.5 3.5 0 1 0 9 4 A3.5 3.5 0 0 0 9 11 Z "
            + "M2.5 20 C2.5 16.5 5.5 14 9 14 C12.5 14 15.5 16.5 15.5 20 "
            + "M16 4.3 A3.3 3.3 0 0 1 16 10.7 M18 14.4 C20 15.2 21.5 17.2 21.5 20",
        profil: "M12 12 A4 4 0 1 0 12 4 A4 4 0 0 0 12 12 Z M4 21 C4 17 7.6 14 12 14 C16.4 14 20 17 20 21",
        zurueck: "M15 5 L8 12 L15 19",
        /* Shop (seit 0.17.0): eine Einkaufstasche. */
        shop: "M5 8 H19 L18 20 H6 Z M9 8 V6.5 A3 3 0 0 1 15 6.5 V8",
        /* Verwaltung (seit 0.16.3, nur für Admins): ein Schild. */
        schild: "M12 3 L19 6 V11 C19 16 16 19 12 21 C8 19 5 16 5 11 V6 Z M9 12 L11 14 L15 10",
        /* Drei gleich lange Balken wie in Blunderluck (seit 0.3.0) —
           ungleiche Striche sähen nach Aufzählung aus, nicht nach Menü. */
        menue: "M4.2 7 H19.8 M4.2 12 H19.8 M4.2 17 H19.8",
        weiter: "M9 5 L16 12 L9 19",
        info: "M12 21 A9 9 0 1 0 12 3 A9 9 0 0 0 12 21 Z M12 11 V16.5 M12 7.5 V8",
        wordle: "M3.5 4.5 H9.5 V10.5 H3.5 Z M14.5 4.5 H20.5 V10.5 H14.5 Z "
            + "M3.5 13.5 H9.5 V19.5 H3.5 Z M14.5 13.5 H20.5 V19.5 H14.5 Z",
        uebung: "M4 4 H20 V20 H4 Z M8.5 8.5 V8.6 M15.5 8.5 V8.6 M12 12 V12.1 M8.5 15.5 V15.6 M15.5 15.5 V15.6",
        loeschen: "M9 5 H21 V19 H9 L3 12 Z M12 9 L17 15 M17 9 L12 15",
        aktualisieren: "M20 12 A8 8 0 1 1 17.7 6.3 M20 4 V8.5 H15.5",
        zahnrad: "M12 15 A3 3 0 1 0 12 9 A3 3 0 0 0 12 15 Z "
            + "M12 2.5 V5 M12 19 V21.5 M2.5 12 H5 M19 12 H21.5 "
            + "M5.3 5.3 L7 7 M17 17 L18.7 18.7 M5.3 18.7 L7 17 M17 7 L18.7 5.3",
        stern: "M12 3 L14.6 8.9 L21 9.5 L16.2 13.8 L17.6 20 L12 16.8 L6.4 20 L7.8 13.8 L3 9.5 L9.4 8.9 Z",
        /* Seit 0.4.0 für die Zustände (js\zustand.js): eine leere Ablage
           und ein durchgestrichenes Funknetz. */
        leer: "M3 13 L6 5 H18 L21 13 V19 H3 Z M3 13 H8 L9.5 15.5 H14.5 L16 13 H21",
        "kein-netz": "M2.5 9 A14 14 0 0 1 21.5 9 M5.5 12.5 A9.5 9.5 0 0 1 18.5 12.5 "
            + "M8.8 16 A4.8 4.8 0 0 1 15.2 16 M12 19.5 V19.6 M4 4 L20 20",
        /* Der freie Platz 5 der Leiste (seit 0.9.0): eine Uhr — „kommt
           noch". Bis 0.8.1 hielt ein Kästchen mit Plus den Platz frei.
           Pfad wörtlich aus den gemeinsamen Absprachen mit Blunderluck
           (Design\3D-Schrift\docs\AUFTRAEGE-RUNDE-4.md). */
        bald: "M12 7 V12 L15 14 M12 3 A9 9 0 1 0 12.01 3",
        /* Der Tab „Sammlung" (seit 0.9.0): vier Kacheln. Pfad wörtlich aus
           derselben Absprache. */
        sammlung: "M4 4 H10 V10 H4 Z M14 4 H20 V10 H14 Z M4 14 H10 V20 H4 Z M14 14 H20 V20 H14 Z",
        /* Die Aufgaben / Herausforderungen (seit 0.7.0): ein Weg, der nach
           oben rechts steigt. Pfad wörtlich aus den gemeinsamen Absprachen
           mit Blunderluck (Design\3D-Schrift\docs\AUFTRAEGE-RUNDE-2.md). */
        aufgaben: "M3 18 L9 12 L13 16 L21 8 M15 8 H21 V14",
        /* Fortschritt (seit 0.10.0, UPCrew-Runde 5) — Pfade wörtlich aus
           dem Entwurf Design\3D-Schrift\entwuerfe\Herausforderungen, damit
           Blunderluck dieselben zeigt: Flamme (Serie), Schild
           (Serien-Schutz), zwei Karten (beide Spiele), Kalender
           (Tagesaufgabe), Dreieck (Partie). */
        serie: "M12 3 C15 7 18 9 18 14 A6 6 0 0 1 6 14 C6 11 8 9 9 7 C10 10 11 11 12 11 C12 8 11 6 12 3 Z",
        schutz: "M12 3 L19 6 V11 C19 16 16 19 12 21 C8 19 5 16 5 11 V6 Z",
        beide: "M4 9 H14 V20 H4 Z M10 4 H20 V15 H16",
        kalender: "M4 6 H20 V20 H4 Z M4 10 H20 M8 3 V7 M16 3 V7",
        partie: "M8 5 L19 12 L8 19 Z",
        koenig: "M11 1.5 H13 V3.5 H15 V5.5 H13 V7.5 H11 V5.5 H9 V3.5 H11 Z M7.5 9 C9 8 15 8 16.5 9 L15 17.5 H9 Z "
            + "M6 18.5 H18 V21.5 H6 Z",
        /* „Anpassen" (seit 0.8.0): zwei Schieberegler. Pfad wörtlich aus
           den gemeinsamen Absprachen mit Blunderluck
           (Design\3D-Schrift\docs\AUFTRAEGE-RUNDE-3.md). Seit 0.9.0 kein
           eigener Tab mehr, nur noch die Zeile in den Einstellungen. */
        anpassen: "M4 7 H13 M17 7 H20 M15 5 V9 M4 17 H7 M11 17 H20 M9 15 V19",
        /* „Standard-Schrift" in den Einstellungen (seit 0.8.0): ein grosses
           A mit Grundlinie. */
        schrift: "M5 19 L12 4 L19 19 M8 13 H16 M3 21 H21",
        /* Hell/dunkel in den Einstellungen (seit 0.6.0): ein Kreis, halb
           geteilt, mit Strichen in der dunklen Hälfte. */
        darstellung: "M12 21 A9 9 0 1 0 12 3 A9 9 0 0 0 12 21 Z M12 3 V21 "
            + "M12 7 H16.5 M12 11 H18.5 M12 15 H18 M12 18.5 H15.5",
        /* Die Bibliothek (seit 0.18.0, js/start-bibliothek.js): drei Bücher
           im Regal; Frei = die Regler wie Blunderlucks Art „Frei". */
        bibliothek: "M4 20 V5 H8 V20 M8 20 V8 H12 V20 M13 19.5 L16 6 L20 7 L17 20.5 Z M3 20.5 H21",
        frei: "M4 7 H13 M17 7 H20 M15 5 V9 M4 17 H7 M11 17 H20 M9 15 V19",
        buch: "M12 6 C10 4.5 6.5 4 4 4.5 V19 C6.5 18.5 10 19 12 20.5 C14 19 17.5 18.5 20 19 V4.5 "
            + "C17.5 4 14 4.5 12 6 Z M12 6 V20.5",
        buchOffen: "M3 6 C6 5 9.5 5.5 12 7.5 C14.5 5.5 18 5 21 6 V19 C18 18 14.5 18.5 12 20.5 "
            + "C9.5 18.5 6 18 3 19 Z M12 7.5 V20.5",
        boss: "M4 5 L8 9 H16 L20 5 L18.5 14 C17.5 18 15 20.5 12 20.5 C9 20.5 6.5 18 5.5 14 Z "
            + "M8.5 13 L10.5 14 M15.5 13 L13.5 14 M10 17.5 H14",
        schloss: "M7 11 V8 A5 5 0 0 1 17 8 V11 M5 11 H19 V20 H5 Z",
        auf: "M6 15 L12 9 L18 15",
        ab: "M6 9 L12 15 L18 9",
        haken: "M5 12.5 L10 17 L19 7"
    },

    zeichen(name) {
        const ns = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(ns, "svg");
        svg.setAttribute("viewBox", "0 0 24 24");
        svg.setAttribute("class", "zeichen zeichen-" + name);
        svg.setAttribute("aria-hidden", "true");
        svg.setAttribute("focusable", "false");

        const pfad = document.createElementNS(ns, "path");
        pfad.setAttribute("d", BAUSTEINE.ZEICHEN[name] || "");
        svg.appendChild(pfad);
        return svg;
    }
};
