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
 * Geladen wird bei jedem Öffnen und auf Knopfdruck; einen Dauer-Abgleich
 * gibt es hier nicht (die Tageswertung ändert sich selten, und jede Abfrage
 * kostet Datenvolumen). Seit 0.29.0 steht die Rangliste als Seite im Band:
 * Wird sie nur VORBEREITET (Leerlauf, Nachbarseite beim Wischen), zeichnet
 * sie sich, lädt aber nicht — geladen wird erst, wenn sie offen ist.
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
        if (RANGLISTE_BILDSCHIRM.ansicht === "wertung" && !RANGLISTE_BILDSCHIRM._stand) {
            RANGLISTE_BILDSCHIRM._laden();
        }
    },

    /* Die Freunde öffnen (von überall): Rangliste-Seite, Reiter „Freunde". */
    freundeOeffnen() {
        RANGLISTE_BILDSCHIRM.ansicht = "freunde";
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

    _stand: null,
    _fehler: "",
    _laedt: false,

    anmelden() {
        NAVIGATION.anmelden({
            id: "rangliste",
            titel: "Rangliste",
            zeichen: "rangliste",
            /* Seit 0.5.0 rechts in der Leiste unten statt im Menü. */
            imMenue: false,
            zeigen: (behaelter) => RANGLISTE_BILDSCHIRM.zeigen(behaelter)
        });
    },

    zeigen(behaelter) {
        RANGLISTE_BILDSCHIRM._behaelter = behaelter;
        RANGLISTE_BILDSCHIRM._zeichnen();
        /* Nur die offene Seite lädt (seit 0.29.0). */
        if (NAVIGATION.aktuell === "rangliste") {
            RANGLISTE_BILDSCHIRM._laden();
        }
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
                RANGLISTE_BILDSCHIRM._zeichnen();
                RANGLISTE_BILDSCHIRM._laden();
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
        RANGLISTE_BILDSCHIRM._fehler = "";
        /* Sofort den Lade-Platzhalter zeigen — auch nach „Nochmal". */
        if (RANGLISTE_BILDSCHIRM._stand && RANGLISTE_BILDSCHIRM._stand.zeitraum === RANGLISTE_BILDSCHIRM.zeitraum) {
            RANGLISTE_BILDSCHIRM._stand = null;
        }
        RANGLISTE_BILDSCHIRM._zeichnen();

        const zeitraum = RANGLISTE_BILDSCHIRM.zeitraum;
        const heute = WORDLE.datumText(APP.jetzt());
        const tage = zeitraum === "tag" ? [heute] : RANGLISTE.letzteTage(heute, 7);
        try {
            RANGLISTE_BILDSCHIRM._stand = {
                zeitraum: zeitraum,
                heute: heute,
                tage: await ERGEBNISSE.tageLaden(APP.spielSpeicher, tage)
            };
        } catch (fehler) {
            RANGLISTE_BILDSCHIRM._fehler = fehler.message || "Fehler";
        } finally {
            RANGLISTE_BILDSCHIRM._laedt = false;
        }
        RANGLISTE_BILDSCHIRM._zeichnen();
    }
};
