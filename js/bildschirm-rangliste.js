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
            inLeiste: true,
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
            rechts: BAUSTEINE.knopf({
                art: "flach", zeichen: "info", titel: "Wie gezählt wird",
                beiKlick: () => DIALOG.hinweis("Wie gezählt wird", RANGLISTE.ERKLAERUNG)
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
            karte.appendChild(BAUSTEINE.erklaerung(RANGLISTE_BILDSCHIRM._fehler));
        } else if (!RANGLISTE_BILDSCHIRM._stand || RANGLISTE_BILDSCHIRM._stand.zeitraum !== RANGLISTE_BILDSCHIRM.zeitraum) {
            karte.appendChild(BAUSTEINE.erklaerung("Wird geladen …"));
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
            karte.appendChild(BAUSTEINE.erklaerung(stand.zeitraum === "tag"
                ? "Heute hat noch niemand das Tageswort gelöst. Sei die oder der Erste!"
                : "In den letzten 7 Tagen hat hier noch niemand gespielt."));
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
            knopf.addEventListener("click", () => NAVIGATION.zeigen("profil", { id: zeile.id }));

            knopf.appendChild(BAUSTEINE.el("span", "rangliste-platz", zeile.platz + "."));
            knopf.appendChild(BAUSTEINE.kreis(zeile.name));
            const mitte = BAUSTEINE.el("span", "rangliste-mitte");
            mitte.appendChild(BAUSTEINE.el("span", "rangliste-name", zeile.name));
            mitte.appendChild(BAUSTEINE.el("span", "rangliste-zusatz", zeitraum === "tag"
                ? (zeile.geloest ? "gelöst in " + zeile.versuche : "nicht gelöst")
                : zeile.geloest + " von " + zeile.gespielt + " gelöst"));
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

    async _laden() {
        if (RANGLISTE_BILDSCHIRM._laedt) {
            return;
        }
        RANGLISTE_BILDSCHIRM._laedt = true;
        RANGLISTE_BILDSCHIRM._fehler = "";

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
            RANGLISTE_BILDSCHIRM._fehler = "Die Rangliste ist gerade nicht erreichbar. " + fehler.message;
        } finally {
            RANGLISTE_BILDSCHIRM._laedt = false;
        }
        RANGLISTE_BILDSCHIRM._zeichnen();
    }
};
