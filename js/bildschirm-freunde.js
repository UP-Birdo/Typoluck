/*
 * bildschirm-freunde.js — Freunde finden, anfragen, annehmen, entfernen.
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

    anmelden() {
        NAVIGATION.anmelden({
            id: "freunde",
            titel: "Freunde",
            zeichen: "freunde",
            inLeiste: true,
            zeigen: (behaelter) => FREUNDE_BILDSCHIRM.zeigen(behaelter)
        });
    },

    zeigen(behaelter) {
        behaelter.appendChild(BAUSTEINE.kopfzeile("Freunde"));

        const ich = ANMELDUNG.ich();
        if (!ich) {
            behaelter.appendChild(BAUSTEINE.erklaerung("Melde dich an, um Freunde zu finden."));
            return;
        }
        const daten = ANMELDUNG.abgleich.daten;
        const sicht = SPIELER.freundeVon(daten, ich.id);

        if (sicht.offen.length > 0) {
            const karte = BAUSTEINE.karte("Anfragen an dich");
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

        const freundeKarte = BAUSTEINE.karte("Deine Freunde");
        if (sicht.freunde.length === 0) {
            freundeKarte.appendChild(BAUSTEINE.erklaerung("Noch keine. Such unten nach einem Namen "
                + "und stell eine Anfrage — nimmt die andere Seite an, seid ihr Freunde. "
                + "Deine Freunde gelten in allen UPCrew-Spielen."));
        }
        for (const freund of sicht.freunde) {
            freundeKarte.appendChild(FREUNDE_BILDSCHIRM._zeileBauen(freund, [
                DIALOG.zweiSchritt(BAUSTEINE.knopf({ text: "Entfernen", art: "gefahr", klein: true }),
                    () => FREUNDE_BILDSCHIRM._aendern("entfernen", freund))
            ]));
        }
        behaelter.appendChild(freundeKarte);

        if (sicht.gesendet.length > 0) {
            const karte = BAUSTEINE.karte("Deine offenen Anfragen");
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
        const karte = BAUSTEINE.karte("Spieler finden");
        const feld = document.createElement("input");
        feld.className = "feld";
        feld.type = "search";
        feld.placeholder = "Namen eintippen …";
        feld.value = FREUNDE_BILDSCHIRM.suchtext;
        feld.autocomplete = "off";
        feld.setAttribute("aria-label", "Spieler suchen");
        karte.appendChild(feld);

        const treffer = BAUSTEINE.el("div", "freunde-treffer");
        karte.appendChild(treffer);

        const zeigen = () => {
            treffer.innerHTML = "";
            const gesucht = FREUNDE_BILDSCHIRM.suchtext.trim().toLowerCase();
            if (gesucht === "") {
                return;
            }
            const daten = ANMELDUNG.abgleich.daten;
            const gefunden = SPIELER.normalisieren(daten).spieler.filter((anderer) =>
                anderer.id !== ich.id && anderer.name
                && anderer.name.toLowerCase().indexOf(gesucht) !== -1
                && SPIELER.freundschaft(daten, ich.id, anderer.id) === "keine").slice(0, 20);

            if (gefunden.length === 0) {
                treffer.appendChild(BAUSTEINE.erklaerung("Niemand gefunden, der dazu passt."));
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

    _zeileBauen(spieler, knoepfe) {
        const zeile = BAUSTEINE.el("div", "freunde-zeile");
        const name = document.createElement("button");
        name.type = "button";
        name.className = "freunde-name";
        name.appendChild(BAUSTEINE.kreis(spieler.name));
        name.appendChild(BAUSTEINE.el("span", null, spieler.name));
        name.addEventListener("click", () => NAVIGATION.zeigen("profil", { id: spieler.id }));
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
            anfragen: "Anfrage an " + anderer.name + " gesendet",
            annehmen: "Du und " + anderer.name + " seid jetzt Freunde",
            ablehnen: "Anfrage abgelehnt",
            entfernen: anderer.name + " entfernt",
            zurueckziehen: "Anfrage zurückgezogen"
        }[aktion]);
    }
};
