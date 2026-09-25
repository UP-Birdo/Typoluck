/*
 * bildschirm-rangliste.js — die Rangliste: Heute oder die letzten 7 Tage,
 * alle Spieler oder nur ich und meine Freunde.
 *
 * Rechnet nichts selbst — Punkte und Plätze kommen aus js\rangliste.js.
 * Geladen wird bei jedem Öffnen und auf Knopfdruck; einen Dauer-Abgleich
 * gibt es hier nicht (die Tageswertung ändert sich selten, und jede Abfrage
 * kostet Datenvolumen).
 */

const RANGLISTE_BILDSCHIRM = {

    /* Die Auswahl überlebt das Neuzeichnen und den Bildschirmwechsel. */
    zeitraum: "tag",
    nurFreunde: false,

    _stand: null,
    _fehler: "",
    _laedt: false,

    anmelden() {
        NAVIGATION.anmelden({
            id: "rangliste",
            titel: "Rangliste",
            zeichen: "rangliste",
            imMenue: true,
            zeigen: (behaelter) => RANGLISTE_BILDSCHIRM.zeigen(behaelter)
        });
    },

    zeigen(behaelter) {
        RANGLISTE_BILDSCHIRM._behaelter = behaelter;
        RANGLISTE_BILDSCHIRM._zeichnen();
        RANGLISTE_BILDSCHIRM._laden();
    },

    _zeichnen() {
        const behaelter = RANGLISTE_BILDSCHIRM._behaelter;
        if (!behaelter || NAVIGATION.aktuell !== "rangliste") {
            return;
        }
        behaelter.innerHTML = "";

        behaelter.appendChild(BAUSTEINE.kopfzeile("Rangliste", {
            zurueck: () => NAVIGATION.zurueck(),
            rechts: BAUSTEINE.knopf({
                art: "flach", zeichen: "info", titel: "Punkte",
                beiKlick: () => DIALOG.hinweis("Punkte", "", RANGLISTE_BILDSCHIRM.punkteTafelBauen())
            })
        }));

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
            [{ wert: false, text: "Alle" }, { wert: true, text: "Freunde" }],
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
            karte.appendChild(ZUSTAND.laden({ zeilen: 5, nochmal: () => RANGLISTE_BILDSCHIRM._laden() }));
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
            ? RANGLISTE.tagesTabelle(stand.tage[stand.heute], daten, auswahl)
            : RANGLISTE.zeitraumTabelle(stand.tage, daten, auswahl);

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
     * Die Tabelle selbst — auch der Start benutzt sie für „Heute bei deinen
     * Freunden". Ein Tipp auf eine Zeile öffnet das Profil dieses Spielers.
     */
    tabelleBauen(zeilen, zeitraum, ichId) {
        const liste = BAUSTEINE.el("ol", "rangliste");
        for (const zeile of zeilen) {
            const eintrag = BAUSTEINE.el("li", "rangliste-zeile" + (zeile.id === ichId ? " rangliste-ich" : ""));
            const knopf = document.createElement("button");
            knopf.type = "button";
            knopf.className = "rangliste-knopf";
            knopf.addEventListener("click", () => {
                FUEHLEN.tippen();
                NAVIGATION.zeigen("profil", { id: zeile.id });
            });

            knopf.appendChild(BAUSTEINE.el("span", "rangliste-platz", zeile.platz + "."));
            knopf.appendChild(BAUSTEINE.kreis(zeile.name));
            const mitte = BAUSTEINE.el("span", "rangliste-mitte");
            mitte.appendChild(BAUSTEINE.el("span", "rangliste-name", zeile.name));
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
