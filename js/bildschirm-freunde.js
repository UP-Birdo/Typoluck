/*
 * bildschirm-freunde.js — Freunde finden, anfragen, annehmen, entfernen.
 *
 * SEIT 0.26.0 KEINE EIGENE SEITE MEHR (Nutzer 29.09.2026: „alte
 * Freunde-Seite ganz raus; Freunde nur noch als Reiter in der Rangliste"):
 * `zeigen(ort)` baut nur noch den Inhalt des Reiters „Freunde" der
 * Rangliste (js/bildschirm-rangliste.js). Bis 0.25.0 ein Blatt, davor ein
 * Punkt im Menü hinter den drei Balken.
 *
 * DIE FREUNDE GEHÖREN ZUM UPCREW-KONTO — sie stehen in der gemeinsamen
 * Kontenliste und gelten in jedem UPCrew-Spiel. Die Regeln (wer schreibt was) stehen in
 * js\spieler.js, Abschnitt „Freundschaft": Jede Aktion hier ändert NUR den
 * eigenen Eintrag; geschrieben wird über den Abgleich mit Zusammenführung.
 *
 * Die Freundeslisten sind — wie alles in dieser Datenbank — öffentlich
 * lesbar (docs\entscheidungen\entschieden.md).
 */

const FREUNDE_BILDSCHIRM = {

    /* Der Suchtext überlebt das Neuzeichnen. */
    suchtext: "",

    zeigen(behaelter) {
        const ich = ANMELDUNG.ich();
        if (!ich) {
            behaelter.appendChild(ZUSTAND.leer({ zeichen: "profil", text: "Nicht angemeldet" }));
            return;
        }
        if (SPIELER.istVerteiler(ich)) {
            behaelter.appendChild(ZUSTAND.leer({ zeichen: "zahnrad", text: "UP#Plus: keine Freunde" }));
            return;
        }
        const daten = ANMELDUNG.abgleich.daten;
        const sicht = SPIELER.freundeVon(daten, ich.id);

        if (sicht.offen.length > 0) {
            const karte = BAUSTEINE.karte("Anfragen");
            for (const anderer of sicht.offen) {
                karte.appendChild(FREUNDE_BILDSCHIRM._zeileBauen(anderer, [
                    BAUSTEINE.knopf({ text: "Annehmen", art: "haupt", klein: true,
                        beiKlick: () => FREUNDE_BILDSCHIRM._aendern("annehmen", anderer) }),
                    BAUSTEINE.knopf({ text: "Ablehnen", art: "still", klein: true,
                        beiKlick: () => FREUNDE_BILDSCHIRM._aendern("ablehnen", anderer) })
                ]));
            }
            behaelter.appendChild(karte);
        }

        /* Leer: Zeichen, drei Wörter, ein Knopf, der ins Suchfeld springt
           (UPCrew-Standard). Dass Freunde in allen UPCrew-Spielen gelten,
           sagt das Stichwort im Titel der Suche. */
        const freundeKarte = BAUSTEINE.karte("Freunde");
        if (sicht.freunde.length === 0) {
            freundeKarte.appendChild(ZUSTAND.leer({
                zeichen: "freunde", text: "Noch keine Freunde",
                aktion: { text: "Suchen", beiKlick: () => {
                    const feld = document.getElementById("freunde-suche");
                    if (feld) {
                        feld.focus();
                    }
                } }
            }));
        }
        for (const freund of sicht.freunde) {
            freundeKarte.appendChild(FREUNDE_BILDSCHIRM._zeileBauen(freund, [
                DIALOG.zweiSchritt(BAUSTEINE.knopf({ text: "Entfernen", art: "gefahr", klein: true }),
                    () => FREUNDE_BILDSCHIRM._aendern("entfernen", freund))
            ]));
        }
        behaelter.appendChild(freundeKarte);

        if (sicht.gesendet.length > 0) {
            const karte = BAUSTEINE.karte("Gesendet");
            for (const anderer of sicht.gesendet) {
                karte.appendChild(FREUNDE_BILDSCHIRM._zeileBauen(anderer, [
                    BAUSTEINE.knopf({ text: "Zurückziehen", art: "still", klein: true,
                        beiKlick: () => FREUNDE_BILDSCHIRM._aendern("zurueckziehen", anderer) })
                ]));
            }
            behaelter.appendChild(karte);
        }

        behaelter.appendChild(FREUNDE_BILDSCHIRM._sucheBauen(ich));
    },

    _sucheBauen(ich) {
        const karte = BAUSTEINE.karte("Suchen · alle UPCrew-Spiele");
        const feld = document.createElement("input");
        feld.className = "feld";
        feld.id = "freunde-suche";
        feld.type = "search";
        feld.placeholder = KONTO.aktiv() ? "Name#1234" : "Name";
        feld.value = FREUNDE_BILDSCHIRM.suchtext;
        feld.autocomplete = "off";
        feld.setAttribute("aria-label", KONTO.aktiv() ? "Freunde suchen · Name#Nummer" : "Spieler suchen");
        karte.appendChild(feld);

        const treffer = BAUSTEINE.el("div", "freunde-treffer");
        karte.appendChild(treffer);

        const zeigen = () => {
            treffer.innerHTML = "";
            const gesucht = FREUNDE_BILDSCHIRM.suchtext.trim().toLowerCase();
            if (gesucht === "") {
                return;
            }
            /*
             * NUR MIT „NAME#NUMMER" (seit 0.22.0, wie Blunderluck v0.154.0;
             * Regel §12, Nutzer: „bei der Freundes-Suche muss man den #
             * eingeben"). Die Nummer ist der Freundescode; unter §12 fragt
             * `KONTO.freundFinden` gezielt den einen Namens-Platz. Ohne
             * UPCrew-Konto (lokal, Werkstatt) bleibt der Namens-Filter.
             */
            if (KONTO.aktiv()) {
                FREUNDE_BILDSCHIRM._codeSucheZeigen(treffer, ich, FREUNDE_BILDSCHIRM.suchtext.trim(), zeigen);
                return;
            }
            const daten = ANMELDUNG.abgleich.daten;
            const gefunden = SPIELER.mitspieler(daten).filter((anderer) =>
                anderer.id !== ich.id && anderer.name
                && SPIELER.passtZurSuche(anderer, gesucht)
                && SPIELER.freundschaft(daten, ich.id, anderer.id) === "keine").slice(0, 20);

            if (gefunden.length === 0) {
                treffer.appendChild(ZUSTAND.leer({ zeichen: "freunde", text: "Niemand gefunden" }));
                return;
            }
            for (const anderer of gefunden) {
                treffer.appendChild(FREUNDE_BILDSCHIRM._zeileBauen(anderer, [
                    BAUSTEINE.knopf({ text: "Anfragen", art: "still", klein: true,
                        beiKlick: () => FREUNDE_BILDSCHIRM._aendern("anfragen", anderer) })
                ]));
            }
        };

        feld.addEventListener("input", () => {
            FREUNDE_BILDSCHIRM.suchtext = feld.value;
            zeigen();
        });
        zeigen();
        return karte;
    },

    /* Das Ergebnis der letzten Suche nach „Name#Nummer" und die laufende. */
    _suchErgebnis: null,
    _sucheLaeuft: null,

    _codeSucheZeigen(treffer, ich, gesucht, nochmal) {
        const teile = KONTO.eingabeZerlegen(gesucht);
        if (!teile.tag || teile.tag.length !== 4) {
            treffer.appendChild(ZUSTAND.leer({ zeichen: "freunde", text: "Name#Nummer nötig" }));
            return;
        }
        const ergebnis = FREUNDE_BILDSCHIRM._suchErgebnis;
        if (!ergebnis || ergebnis.eingabe !== gesucht) {
            treffer.appendChild(ZUSTAND.laden({ zeilen: 1 }));
            FREUNDE_BILDSCHIRM._suchen(gesucht, nochmal);
            return;
        }
        if (ergebnis.fehler) {
            treffer.appendChild(ZUSTAND.leer({ zeichen: "freunde", text: "Keine Verbindung" }));
            return;
        }
        const daten = ANMELDUNG.abgleich.daten;
        const anderer = ergebnis.spieler;
        if (!anderer || anderer.id === ich.id || SPIELER.istVerteiler(anderer) || SPIELER.istGast(anderer)
                || SPIELER.freundschaft(daten, ich.id, anderer.id) !== "keine") {
            treffer.appendChild(ZUSTAND.leer({ zeichen: "freunde", text: "Niemand gefunden" }));
            return;
        }
        treffer.appendChild(FREUNDE_BILDSCHIRM._zeileBauen(anderer, [
            BAUSTEINE.knopf({ text: "Anfragen", art: "still", klein: true,
                beiKlick: () => FREUNDE_BILDSCHIRM._aendern("anfragen", anderer) })
        ]));
    },

    async _suchen(eingabe, danach) {
        if (FREUNDE_BILDSCHIRM._sucheLaeuft === eingabe) {
            return;
        }
        FREUNDE_BILDSCHIRM._sucheLaeuft = eingabe;
        let ergebnis;
        try {
            ergebnis = await KONTO.freundFinden(ANMELDUNG.abgleich.daten, eingabe);
        } catch (fehler) {
            ergebnis = { fehler: "netz" };
        }
        FREUNDE_BILDSCHIRM._sucheLaeuft = null;
        FREUNDE_BILDSCHIRM._suchErgebnis = { eingabe: eingabe, spieler: ergebnis.spieler || null,
            fehler: ergebnis.fehler === "netz" };
        if (FREUNDE_BILDSCHIRM.suchtext.trim() === eingabe && typeof danach === "function") {
            danach();
        }
    },

    _zeileBauen(spieler, knoepfe) {
        const zeile = BAUSTEINE.el("div", "freunde-zeile");
        const name = document.createElement("button");
        name.type = "button";
        name.className = "freunde-name";
        name.appendChild(BAUSTEINE.kreis(spieler.name));
        const text = BAUSTEINE.el("span", null, ANMELDUNG.anzeigeName(spieler));
        /* Die Nummer nur leise und nur bei gleichen Namen (seit 0.15.6). */
        const nummer = SPIELER.nummerZusatz(ANMELDUNG.abgleich.daten, spieler);
        if (nummer) {
            text.appendChild(BAUSTEINE.el("span", "name-nummer", " " + nummer));
        }
        name.appendChild(text);
        name.addEventListener("click", () => PROFIL_BILDSCHIRM.profilOeffnen(spieler.id));
        zeile.appendChild(name);

        const leiste = BAUSTEINE.el("span", "freunde-knoepfe");
        knoepfe.forEach((knopf) => leiste.appendChild(knopf));
        zeile.appendChild(leiste);
        return zeile;
    },

    /* Jede Aktion ändert NUR den eigenen Eintrag. */
    _aendern(aktion, anderer) {
        const ich = ANMELDUNG.ich();
        if (!ich) {
            return;
        }
        const daten = ANMELDUNG.abgleich.daten;
        const neu = {
            anfragen: () => SPIELER.freundHinzufuegen(daten, ich.id, anderer.id),
            annehmen: () => SPIELER.freundHinzufuegen(daten, ich.id, anderer.id),
            ablehnen: () => SPIELER.freundAblehnen(daten, ich.id, anderer.id),
            entfernen: () => SPIELER.freundAblehnen(daten, ich.id, anderer.id),
            zurueckziehen: () => SPIELER.freundStreichen(daten, ich.id, anderer.id)
        }[aktion]();

        if (aktion === "anfragen") {
            FREUNDE_BILDSCHIRM.suchtext = "";
        }
        ANMELDUNG.abgleich.aendern(neu);
        DIALOG.kurzmeldung({
            anfragen: "Anfrage gesendet",
            annehmen: "Freunde: " + ANMELDUNG.anzeigeName(anderer),
            ablehnen: "Anfrage abgelehnt",
            entfernen: ANMELDUNG.anzeigeName(anderer) + " entfernt",
            zurueckziehen: "Anfrage zurückgezogen"
        }[aktion]);
    }
};
