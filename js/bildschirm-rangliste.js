/*
 * bildschirm-rangliste.js — die Rangliste: Heute oder die letzten 7 Tage,
 * alle Spieler oder nur ich und meine Freunde.
 *
 * SEIT 0.26.0 ZWEI REITER (wie Blunderluck v0.156.1; Nutzer 29.09.2026:
 * „alte Freunde-Seite am Start ganz raus; Freunde nur noch als Reiter in der
 * Rangliste"): „Wertung" (die Tabelle wie bisher) und „Freunde" (Anfragen,
 * Freundesliste, Suche — gebaut von js/bildschirm-freunde.js, das keine
 * eigene Seite mehr ist). Der Reiter trägt die Zahl offener Anfragen. Ein
 * Tipp auf einen Spieler öffnet direkt sein ausführliches Profil
 * (PROFIL_BILDSCHIRM.profilOeffnen; seit 0.26.1 ohne Vorschau-Karte).
 *
 * Rechnet nichts selbst — Punkte und Plätze kommen aus js\rangliste.js.
 * Einen Dauer-Abgleich gibt es hier nicht (die Tageswertung ändert sich
 * selten, und jede Abfrage kostet Datenvolumen). Seit 0.29.0 steht die
 * Rangliste als Seite im Band: Wird sie nur VORBEREITET (Leerlauf,
 * Nachbarseite beim Wischen), zeichnet sie sich, lädt aber nicht — geladen
 * wird erst, wenn sie offen ist.
 *
 * HÖCHSTENS ALLE 60 SEKUNDEN (seit 0.33.0; bis 0.32.0 lud jedes Öffnen und
 * jedes Hinwischen neu, „7 Tage" = 7 Anfragen): Ein Stand, der jünger ist
 * als `KONFIG.speicher.ranglisteFrischMs`, wird beim Öffnen wiederverwendet
 * — je Zeitraum einer (`_staende`). Immer geladen wird: auf „Aktualisieren"
 * und „Nochmal", nach dem eigenen Tageswort (`standVerwerfen`, js\app.js)
 * und an einem neuen Tag. Beim Nachladen bleibt die Tabelle stehen und wird
 * erst ersetzt, wenn der neue Stand da ist; der Platzhalter kommt nur, wenn
 * es für den Zeitraum noch gar keinen Stand gibt.
 */

const RANGLISTE_BILDSCHIRM = {

    /* Die Auswahl überlebt das Neuzeichnen und den Bildschirmwechsel. */
    zeitraum: "tag",
    nurFreunde: false,
    /* Der Reiter: "wertung" | "freunde" (seit 0.26.0). */
    ansicht: "wertung",

    ansichtSetzen(id) {
        RANGLISTE_BILDSCHIRM.ansicht = (id === "freunde") ? "freunde" : "wertung";
        RANGLISTE_BILDSCHIRM._zeichnen();
        if (RANGLISTE_BILDSCHIRM.ansicht === "wertung") {
            RANGLISTE_BILDSCHIRM._ladenWennAlt();
        }
    },

    /* Die Freunde öffnen (von überall): Rangliste-Seite, Reiter „Freunde".
       Seit 0.33.0 zeichnet ein Wechsel nur Veraltetes neu — der andere
       Reiter muss darum gemeldet werden. */
    freundeOeffnen() {
        RANGLISTE_BILDSCHIRM.ansicht = "freunde";
        if (typeof NAVIGATION.veralten === "function") {
            NAVIGATION.veralten(["rangliste"]);
        }
        NAVIGATION.zeigen("rangliste", null);
    },

    _reiterBauen() {
        const reiter = BAUSTEINE.segment(
            [{ wert: "wertung", text: "Wertung" }, { wert: "freunde", text: "Freunde" }],
            RANGLISTE_BILDSCHIRM.ansicht,
            (wert) => RANGLISTE_BILDSCHIRM.ansichtSetzen(wert), "Ansicht");
        reiter.classList.add("rangliste-reiter");
        const freunde = reiter.querySelectorAll(".segment-wahl")[1];
        if (freunde) {
            freunde.classList.add("rangliste-reiter-freunde");
            NAVIGATION.markeAnbringen(freunde, "freunde");
        }
        return reiter;
    },

    /* Der gezeigte Stand { zeitraum, heute, tage, geladenUm } und, seit
       0.33.0, je Zeitraum der zuletzt geladene. */
    _stand: null,
    _staende: {},
    _fehler: "",
    _laedt: false,
    /* Seit 0.34.1: zählt jedes Verwerfen. Ein Laden, das vorher begann,
       darf seinen Stand zeigen, aber nicht als frisch merken. */
    _verworfen: 0,

    anmelden() {
        NAVIGATION.anmelden({
            id: "rangliste",
            titel: "Rangliste",
            zeichen: "rangliste",
            /* Seit 0.5.0 rechts in der Leiste unten statt im Menü. */
            imMenue: false,
            zeigen: (behaelter) => RANGLISTE_BILDSCHIRM.zeigen(behaelter),
            /* Seit 0.33.0: geöffnet, ohne neu gezeichnet zu werden (die
               Seite stand frisch im Band) — dann nur nachladen, falls der
               Stand zu alt ist. */
            geoeffnet: () => RANGLISTE_BILDSCHIRM._ladenWennAlt()
        });
    },

    zeigen(behaelter) {
        RANGLISTE_BILDSCHIRM._behaelter = behaelter;
        RANGLISTE_BILDSCHIRM._zeichnen();
        /* Nur die offene Seite lädt (seit 0.29.0) — und seit 0.33.0 nur,
           wenn ihr Stand älter als 60 Sekunden ist. */
        if (NAVIGATION.aktuell === "rangliste") {
            RANGLISTE_BILDSCHIRM._ladenWennAlt();
        }
    },

    /* Wie lange ein geladener Stand als frisch gilt (js\konfig.js). */
    frischMs() {
        const wert = (typeof KONFIG !== "undefined" && KONFIG.speicher) ? KONFIG.speicher.ranglisteFrischMs : null;
        return (typeof wert === "number" && wert >= 0) ? wert : 60000;
    },

    /* Ist der Stand dieses Zeitraums jung genug (und von heute)? */
    standFrisch(zeitraum) {
        const stand = RANGLISTE_BILDSCHIRM._staende[zeitraum];
        return !!stand && stand.heute === WORDLE.datumText(APP.jetzt())
            && Date.now() - stand.geladenUm < RANGLISTE_BILDSCHIRM.frischMs();
    },

    /* Das nächste Öffnen lädt neu (nach dem eigenen Tageswort). Die Tabelle
       bleibt bis dahin stehen. */
    standVerwerfen() {
        RANGLISTE_BILDSCHIRM._verworfen++;
        for (const zeitraum of Object.keys(RANGLISTE_BILDSCHIRM._staende)) {
            RANGLISTE_BILDSCHIRM._staende[zeitraum].geladenUm = 0;
        }
    },

    /* Beim Öffnen, Hinwischen und Umschalten: einen frischen Stand
       wiederverwenden, sonst laden. Ein Fehler von vorhin lädt immer. */
    _ladenWennAlt() {
        const zeitraum = RANGLISTE_BILDSCHIRM.zeitraum;
        if (!RANGLISTE_BILDSCHIRM._fehler && RANGLISTE_BILDSCHIRM.standFrisch(zeitraum)) {
            if (RANGLISTE_BILDSCHIRM._stand !== RANGLISTE_BILDSCHIRM._staende[zeitraum]) {
                RANGLISTE_BILDSCHIRM._stand = RANGLISTE_BILDSCHIRM._staende[zeitraum];
                RANGLISTE_BILDSCHIRM._zeichnen();
            }
            return;
        }
        RANGLISTE_BILDSCHIRM._laden();
    },

    _zeichnen() {
        const behaelter = RANGLISTE_BILDSCHIRM._behaelter;
        /* Im Band hat die Rangliste ihre eigene Seite und darf jederzeit
           zeichnen; im gemeinsamen Ort nur, solange sie offen ist. */
        if (!behaelter || !NAVIGATION.zeichenbar("rangliste")) {
            return;
        }
        /* Wer gerade im Suchfeld der Freunde schreibt, verliert es nicht
           durch ein Neuzeichnen nach dem Laden der Wertung. */
        if (RANGLISTE_BILDSCHIRM.ansicht === "freunde" && behaelter.querySelector("#freunde-suche")
                && document.activeElement === behaelter.querySelector("#freunde-suche")) {
            return;
        }
        behaelter.innerHTML = "";

        /* Kein „Zurück" (seit 0.5.0): Die Rangliste ist ein Ziel der Leiste
           unten, wie der Start — zurück geht es über die Leiste. Den Knopf
           „Freunde" rechts (0.25.0) ersetzt seit 0.26.0 der Reiter. */
        const wertung = RANGLISTE_BILDSCHIRM.ansicht !== "freunde";
        behaelter.appendChild(BAUSTEINE.kopfzeile("Rangliste", { rechts: wertung ? BAUSTEINE.knopf({
            art: "flach", zeichen: "info", titel: "Punkte",
            beiKlick: () => DIALOG.hinweis("Punkte", "", RANGLISTE_BILDSCHIRM.punkteTafelBauen())
        }) : null }));
        behaelter.appendChild(RANGLISTE_BILDSCHIRM._reiterBauen());
        if (!wertung) {
            const ort = BAUSTEINE.el("div", "rangliste-freunde-ort");
            behaelter.appendChild(ort);
            FREUNDE_BILDSCHIRM.zeigen(ort);
            return;
        }

        const auswahl = BAUSTEINE.el("div", "rangliste-auswahl");
        auswahl.appendChild(BAUSTEINE.segment(
            [{ wert: "tag", text: "Heute" }, { wert: "woche", text: "7 Tage" }],
            RANGLISTE_BILDSCHIRM.zeitraum,
            (wert) => {
                RANGLISTE_BILDSCHIRM.zeitraum = wert;
                /* Seit 0.33.0: Gibt es für den Zeitraum schon einen Stand,
                   steht er sofort da; geladen wird nur, wenn er zu alt ist. */
                if (RANGLISTE_BILDSCHIRM._staende[wert]) {
                    RANGLISTE_BILDSCHIRM._stand = RANGLISTE_BILDSCHIRM._staende[wert];
                }
                RANGLISTE_BILDSCHIRM._zeichnen();
                RANGLISTE_BILDSCHIRM._ladenWennAlt();
            }, "Zeitraum"));
        auswahl.appendChild(BAUSTEINE.segment(
            [{ wert: false, text: "Alle" }, { wert: true, text: "Nur Freunde" }],
            RANGLISTE_BILDSCHIRM.nurFreunde,
            (wert) => {
                RANGLISTE_BILDSCHIRM.nurFreunde = wert;
                RANGLISTE_BILDSCHIRM._zeichnen();
            }, "Wer"));
        behaelter.appendChild(auswahl);

        const karte = BAUSTEINE.karte(null, "rangliste-karte");
        behaelter.appendChild(karte);

        if (RANGLISTE_BILDSCHIRM._fehler) {
            karte.appendChild(ZUSTAND.fehler({
                technik: RANGLISTE_BILDSCHIRM._fehler, nochmal: () => RANGLISTE_BILDSCHIRM._laden()
            }));
        } else if (!RANGLISTE_BILDSCHIRM._stand || RANGLISTE_BILDSCHIRM._stand.zeitraum !== RANGLISTE_BILDSCHIRM.zeitraum) {
            /* `ruht`: Die Seite ist nur vorbereitet und lädt gerade nicht —
               dann ohne die Uhr, die nach 10 s „Keine Antwort" zeigt. */
            karte.appendChild(ZUSTAND.laden({ zeilen: 5, nochmal: () => RANGLISTE_BILDSCHIRM._laden(),
                ruht: !RANGLISTE_BILDSCHIRM._laedt }));
        } else {
            RANGLISTE_BILDSCHIRM._tabelleEinsetzen(karte);
        }

        behaelter.appendChild(BAUSTEINE.knopf({
            text: "Aktualisieren", art: "flach", zeichen: "aktualisieren",
            beiKlick: () => RANGLISTE_BILDSCHIRM._laden()
        }));
    },

    _tabelleEinsetzen(karte) {
        const ich = ANMELDUNG.ich();
        const daten = ANMELDUNG.abgleich.daten;
        const auswahl = RANGLISTE.auswahl(daten, ich ? ich.id : "", RANGLISTE_BILDSCHIRM.nurFreunde);
        const stand = RANGLISTE_BILDSCHIRM._stand;

        const zeilen = stand.zeitraum === "tag"
            ? RANGLISTE.tagesTabelle(stand.tage[stand.heute], daten, auswahl, ich ? ich.id : null)
            : RANGLISTE.zeitraumTabelle(stand.tage, daten, auswahl, ich ? ich.id : null);

        if (zeilen.length === 0) {
            karte.appendChild(ZUSTAND.leer({
                zeichen: "rangliste", text: stand.zeitraum === "tag" ? "Heute noch niemand" : "Noch niemand",
                aktion: { text: "Spielen", zeichen: "weiter",
                    beiKlick: () => NAVIGATION.zeigen("wordle", { modus: "tag" }) }
            }));
            return;
        }
        karte.appendChild(RANGLISTE_BILDSCHIRM.tabelleBauen(zeilen, stand.zeitraum, ich ? ich.id : ""));
    },

    /*
     * Die Tabelle selbst. Ein Tipp auf eine Zeile öffnet das Profil dieses
     * Spielers (0.26.0 kurz erst eine Vorschau-Karte, seit 0.26.1 direkt).
     */
    tabelleBauen(zeilen, zeitraum, ichId) {
        const liste = BAUSTEINE.el("ol", "rangliste");
        for (const zeile of zeilen) {
            const eintrag = BAUSTEINE.el("li", "rangliste-zeile" + (zeile.id === ichId ? " rangliste-ich" : ""));
            const knopf = document.createElement("button");
            knopf.type = "button";
            knopf.className = "rangliste-knopf";
            knopf.addEventListener("click", () => PROFIL_BILDSCHIRM.profilOeffnen(zeile.id));

            knopf.appendChild(BAUSTEINE.el("span", "rangliste-platz", zeile.platz + "."));
            knopf.appendChild(BAUSTEINE.kreis(zeile.name));
            const mitte = BAUSTEINE.el("span", "rangliste-mitte");
            const name = BAUSTEINE.el("span", "rangliste-name", zeile.name);
            /* Die Nummer nur leise und nur bei gleichen Namen (seit 0.15.6). */
            if (zeile.nummer) {
                name.appendChild(BAUSTEINE.el("span", "name-nummer", " " + zeile.nummer));
            }
            mitte.appendChild(name);
            /* Zahlen statt Sätzen (UPCrew-Standard): „3/6" = gelöst im
               dritten Versuch, „X/6" = nicht gelöst; über 7 Tage „4/5
               gelöst" = vier von fünf gespielten Tagen. */
            mitte.appendChild(BAUSTEINE.el("span", "rangliste-zusatz", zeitraum === "tag"
                ? (zeile.geloest ? zeile.versuche : "X") + "/" + WORDLE.VERSUCHE
                : zeile.geloest + "/" + zeile.gespielt + " gelöst"));
            knopf.appendChild(mitte);
            if (zeitraum === "tag") {
                knopf.appendChild(WORDLE_BILDSCHIRM.musterBauen(zeile.muster));
            }
            knopf.appendChild(BAUSTEINE.el("span", "rangliste-punkte", String(zeile.punkte)));

            eintrag.appendChild(knopf);
            liste.appendChild(eintrag);
        }
        return liste;
    },

    /*
     * Die Punkte-Tafel — Versuche gegen Punkte, statt eines Absatzes
     * (UPCrew-Standard, seit 0.4.0). Die Zahlen rechnet RANGLISTE.punkte,
     * die Tafel erfindet keine. Auch die Spielregel in Wordle zeigt sie.
     * Für Vorleseprogramme trägt sie die ausführliche Erklärung.
     */
    punkteTafelBauen() {
        const tafel = BAUSTEINE.el("div", "punkte-tafel");
        tafel.setAttribute("role", "img");
        tafel.setAttribute("aria-label", RANGLISTE.ERKLAERUNG);
        const spalte = (oben, unten) => {
            const feld = BAUSTEINE.el("div", "punkte-feld");
            feld.appendChild(BAUSTEINE.el("span", "punkte-versuch", oben));
            feld.appendChild(BAUSTEINE.el("span", "punkte-wert", unten));
            tafel.appendChild(feld);
        };
        for (let versuch = 1; versuch <= WORDLE.VERSUCHE; versuch++) {
            spalte(versuch + "/" + WORDLE.VERSUCHE,
                String(RANGLISTE.punkte({ geloest: true, versuche: versuch })));
        }
        spalte("X/" + WORDLE.VERSUCHE, String(RANGLISTE.punkte({ geloest: false })));
        return tafel;
    },

    async _laden() {
        if (RANGLISTE_BILDSCHIRM._laedt) {
            return;
        }
        RANGLISTE_BILDSCHIRM._laedt = true;
        const zeitraum = RANGLISTE_BILDSCHIRM.zeitraum;
        const heute = WORDLE.datumText(APP.jetzt());
        /* Ein Stand von gestern bleibt nicht stehen („Heute" wäre falsch). */
        if (RANGLISTE_BILDSCHIRM._stand && RANGLISTE_BILDSCHIRM._stand.heute !== heute) {
            RANGLISTE_BILDSCHIRM._stand = null;
            RANGLISTE_BILDSCHIRM._staende = {};
        }
        /* Seit 0.33.0: Steht für den Zeitraum schon eine Tabelle da, bleibt
           sie beim Nachladen stehen (kein Platzhalter-Blitzen). Der
           Lade-Platzhalter kommt nur ohne Stand — und nach einem Fehler
           („Nochmal") wird neu gezeichnet, damit die Meldung weggeht. */
        const steht = !!RANGLISTE_BILDSCHIRM._stand && RANGLISTE_BILDSCHIRM._stand.zeitraum === zeitraum;
        const hatteFehler = !!RANGLISTE_BILDSCHIRM._fehler;
        RANGLISTE_BILDSCHIRM._fehler = "";
        if (!steht || hatteFehler) {
            RANGLISTE_BILDSCHIRM._zeichnen();
        }

        const tage = zeitraum === "tag" ? [heute] : RANGLISTE.letzteTage(heute, 7);
        const verworfen = RANGLISTE_BILDSCHIRM._verworfen;
        let veraltetGeladen = false;
        try {
            const geladen = await ERGEBNISSE.tageLaden(APP.spielSpeicher, tage);
            /* Seit 0.34.1: Wurde der Stand verworfen, während dieses Laden
               lief, fehlt darin vielleicht das eigene Ergebnis — zeigen ja,
               als frisch merken nein. */
            veraltetGeladen = verworfen !== RANGLISTE_BILDSCHIRM._verworfen;
            const stand = {
                zeitraum: zeitraum,
                heute: heute,
                tage: geladen,
                geladenUm: veraltetGeladen ? 0 : Date.now()
            };
            RANGLISTE_BILDSCHIRM._staende[zeitraum] = stand;
            /* Gezeigt wird der Stand des Zeitraums, der JETZT gewählt ist. */
            if (RANGLISTE_BILDSCHIRM.zeitraum === zeitraum || !RANGLISTE_BILDSCHIRM._staende[RANGLISTE_BILDSCHIRM.zeitraum]) {
                RANGLISTE_BILDSCHIRM._stand = stand;
            }
        } catch (fehler) {
            RANGLISTE_BILDSCHIRM._fehler = fehler.message || "Fehler";
        } finally {
            RANGLISTE_BILDSCHIRM._laedt = false;
        }
        RANGLISTE_BILDSCHIRM._zeichnen();
        /* Wurde während des Ladens umgeschaltet, fehlt der Stand des neuen
           Zeitraums noch (bis 0.32.0 blieb dann der Platzhalter stehen). */
        if (RANGLISTE_BILDSCHIRM.zeitraum !== zeitraum && !RANGLISTE_BILDSCHIRM._fehler
                && NAVIGATION.aktuell === "rangliste") {
            RANGLISTE_BILDSCHIRM._ladenWennAlt();
        } else if (veraltetGeladen && NAVIGATION.aktuell === "rangliste") {
            /* Seit 0.34.1: verworfen während des Ladens, die Seite ist offen —
               gleich noch einmal laden. */
            RANGLISTE_BILDSCHIRM._laden();
        }
    }
};
