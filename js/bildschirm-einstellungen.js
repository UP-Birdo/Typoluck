/*
 * bildschirm-einstellungen.js — die Einstellungen: dieses Gerät, das
 * UPCrew-Konto und „Über Typoluck".
 *
 * SEIT 0.5.0 (Nutzer 25.09.2026: „in die drei Balken soll auch
 * Einstellungen rein"). Bis 0.4.0 standen diese drei Karten unten im
 * eigenen Profil. Sie sind hierher umgezogen, unverändert im Inhalt: Das
 * Profil zeigt seitdem nur noch den Spieler und seine Statistik — dasselbe
 * wie ein fremdes Profil —, und alles, was man EINSTELLT, liegt an einer
 * Stelle hinter den drei Balken.
 */

const EINSTELLUNGEN_BILDSCHIRM = {

    anmelden() {
        NAVIGATION.anmelden({
            id: "einstellungen",
            titel: "Einstellungen",
            zeichen: "zahnrad",
            imMenue: true,
            zeigen: (behaelter) => EINSTELLUNGEN_BILDSCHIRM.zeigen(behaelter)
        });
    },

    zeigen(behaelter) {
        behaelter.appendChild(BAUSTEINE.kopfzeile("Einstellungen", {
            zurueck: () => NAVIGATION.zurueck()
        }));
        behaelter.appendChild(EINSTELLUNGEN_BILDSCHIRM._wordleBauen());
        behaelter.appendChild(EINSTELLUNGEN_BILDSCHIRM._geraetBauen());
        /* Konto-Knöpfe nur für Angemeldete — ohne Konto gäbe es nichts zu
           ändern (das Anmelde-Vollbild liegt dann ohnehin darüber). */
        if (ANMELDUNG.ich()) {
            behaelter.appendChild(EINSTELLUNGEN_BILDSCHIRM._kontoBauen());
        }
        behaelter.appendChild(EINSTELLUNGEN_BILDSCHIRM._ueberBauen());
    },

    /*
     * Das Wortspiel (seit 0.6.0; Name seit 0.6.2 aus WORDLE.NAME): der
     * Schwer-Modus. Gilt ab der nächsten Runde — eine angefangene bleibt,
     * wie sie war (Begründung: js\wordle.js, „Der Schwer-Modus").
     * Gespeichert je Gerät wie die übrigen.
     */
    _wordleBauen() {
        const karte = BAUSTEINE.karte(WORDLE.NAME);
        karte.appendChild(EINSTELLUNGEN_BILDSCHIRM._zeileBauen("stern", "Schwer-Modus",
            BAUSTEINE.segment(
                [{ wert: false, text: "Aus" }, { wert: true, text: "An" }],
                WORDLE_BILDSCHIRM.schwerGewaehlt(),
                (wert) => {
                    WORDLE_BILDSCHIRM.schwerSetzen(wert);
                    NAVIGATION.auffrischen();
                }, "Schwer-Modus")));
        return karte;
    },

    /*
     * Dieses Gerät (seit 0.4.0): der Schalter für die Vibration
     * (UPCrew-Standard, Abschnitt 5 — ab Werk an). Ein Segment-Schalter
     * wie in der Rangliste. Kann das Gerät nicht vibrieren (iPhone), steht
     * das als Stichwort daneben, statt einen Schalter ohne Wirkung zu zeigen.
     */
    _geraetBauen() {
        const karte = BAUSTEINE.karte("Dieses Gerät");

        /* Hell / dunkel / wie das Gerät (seit 0.6.0). Seit 0.8.0 über das
           gemeinsame Aussehen (js\darstellung.js → js\upcrew-aussehen.js):
           gilt damit auch in Blunderluck. Anwenden und neu zeichnen löst der
           Baustein selbst aus (Beobachter in js\app.js). */
        karte.appendChild(EINSTELLUNGEN_BILDSCHIRM._zeileBauen("darstellung", "Darstellung",
            BAUSTEINE.segment(
                [{ wert: "geraet", text: "Auto" }, { wert: "hell", text: "Hell" },
                    { wert: "dunkel", text: "Dunkel" }],
                DARSTELLUNG.thema(),
                (wert) => DARSTELLUNG.themaSetzen(wert), "Darstellung")));

        /* Standard-Schrift (seit 0.8.0): stellt die Standard-Schrift fest,
           egal welche Crew-Schrift im Tab „Anpassen" gewählt ist. */
        karte.appendChild(EINSTELLUNGEN_BILDSCHIRM._zeileBauen("schrift", "Standard-Schrift",
            BAUSTEINE.segment(
                [{ wert: false, text: "Aus" }, { wert: true, text: "An" }],
                DARSTELLUNG.leseschrift(),
                (wert) => DARSTELLUNG.leseschriftSetzen(wert), "Standard-Schrift")));

        /* Der Weg in den Tab „Anpassen" (seit 0.8.0): Farbwelt, Schrift,
           Knöpfe. */
        karte.appendChild(EINSTELLUNGEN_BILDSCHIRM._zeileBauen("anpassen", "Anpassen",
            BAUSTEINE.knopf({
                art: "flach", zeichen: "weiter", titel: "Anpassen öffnen",
                beiKlick: () => NAVIGATION.zeigen("anpassen", null)
            })));

        /* Bis 0.6.1 stand hier der Schalter „Kacheln: Grün/Gelb –
           Orange/Blau". Seit 0.6.2 gibt es kein Grün/Gelb mehr (NYT-Look,
           js\darstellung.js „Kachelfarben-Sperre"); die Kacheln folgen
           später den Farbpaketen, die man freischaltet. */

        karte.appendChild(EINSTELLUNGEN_BILDSCHIRM._zeileBauen("vibration", "Vibration",
            FUEHLEN.verfuegbar()
                ? BAUSTEINE.segment(
                    [{ wert: true, text: "An" }, { wert: false, text: "Aus" }],
                    FUEHLEN.an(),
                    (wert) => {
                        FUEHLEN.anSetzen(wert);
                        FUEHLEN.tippen();
                        NAVIGATION.auffrischen();
                    }, "Vibration")
                : BAUSTEINE.el("span", "schild", "nicht möglich")));
        return karte;
    },

    /* Eine Zeile „Zeichen + Name links, Schalter rechts". */
    _zeileBauen(zeichen, text, schalter) {
        const zeile = BAUSTEINE.el("div", "einstellung-zeile");
        const name = BAUSTEINE.el("span", "einstellung-name");
        name.appendChild(BAUSTEINE.zeichen(zeichen));
        name.appendChild(BAUSTEINE.el("span", null, text));
        zeile.appendChild(name);
        zeile.appendChild(schalter);
        return zeile;
    },

    _kontoBauen() {
        const karte = BAUSTEINE.karte("UPCrew-Konto · alle Spiele");
        const reihe = BAUSTEINE.el("div", "knopf-spalte");
        /* Ein Gast (seit v0.2.0) sichert hier seinen Spielstand. */
        if (ANMELDUNG.istGast()) {
            reihe.appendChild(BAUSTEINE.knopf({ text: "Spielstand sichern", art: "haupt", breit: true,
                beiKlick: () => ANMELDUNG.gastSichernOeffnen() }));
        }
        reihe.appendChild(BAUSTEINE.knopf({ text: "Name ändern", art: "still", breit: true,
            beiKlick: () => ANMELDUNG.nameAendern() }));
        reihe.appendChild(BAUSTEINE.knopf({ text: "Passwort ändern", art: "still", breit: true,
            beiKlick: () => ANMELDUNG.passwortAendern() }));
        reihe.appendChild(BAUSTEINE.knopf({ text: "Abmelden", art: "gefahr", breit: true,
            beiKlick: () => ANMELDUNG.abmelden(false) }));
        /* Seit v0.2.0 (Nutzer 25.09.2026): das Konto selbst löschen — gilt
           für alle Spiele von UPCrew, die Rückfrage stellt die Anmeldung. */
        if (KONTO.aktiv()) {
            reihe.appendChild(BAUSTEINE.knopf({ text: "UPCrew-Konto löschen", art: "gefahr",
                breit: true, beiKlick: () => ANMELDUNG.kontoLoeschen() }));
        }
        karte.appendChild(reihe);
        return karte;
    },

    _ueberBauen() {
        const karte = BAUSTEINE.karte("Über Typoluck");
        const liste = BAUSTEINE.el("dl", "angaben");
        const angabe = (begriff, wert) => {
            liste.appendChild(BAUSTEINE.el("dt", null, begriff));
            liste.appendChild(BAUSTEINE.el("dd", null, wert));
        };
        angabe("Ein Spiel von", "UPCrew");
        angabe("Version", KONFIG.APP_VERSION);
        angabe("Speicher", APP.spielSpeicher ? APP.spielSpeicher.beschreibung : "");
        const offen = ICH.ausstehend().length;
        if (offen > 0) {
            angabe("Nicht gesendet", offen === 1 ? "1 Ergebnis" : offen + " Ergebnisse");
        }
        karte.appendChild(liste);
        karte.appendChild(BAUSTEINE.knopf({
            text: "Wunsch oder Fehler melden", art: "still", breit: true,
            beiKlick: () => WUNSCH.oeffnen()
        }));
        return karte;
    }
};
