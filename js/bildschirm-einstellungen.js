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
        behaelter.appendChild(EINSTELLUNGEN_BILDSCHIRM._geraetBauen());
        /* Konto-Knöpfe nur für Angemeldete — ohne Konto gäbe es nichts zu
           ändern (das Anmelde-Vollbild liegt dann ohnehin darüber). */
        if (ANMELDUNG.ich()) {
            behaelter.appendChild(EINSTELLUNGEN_BILDSCHIRM._kontoBauen());
        }
        behaelter.appendChild(EINSTELLUNGEN_BILDSCHIRM._ueberBauen());
    },

    /*
     * Dieses Gerät (seit 0.4.0): der Schalter für die Vibration
     * (UPCrew-Standard, Abschnitt 5 — ab Werk an). Ein Segment-Schalter
     * wie in der Rangliste. Kann das Gerät nicht vibrieren (iPhone), steht
     * das als Stichwort daneben, statt einen Schalter ohne Wirkung zu zeigen.
     */
    _geraetBauen() {
        const karte = BAUSTEINE.karte("Dieses Gerät");
        const zeile = BAUSTEINE.el("div", "einstellung-zeile");
        const name = BAUSTEINE.el("span", "einstellung-name");
        name.appendChild(BAUSTEINE.zeichen("vibration"));
        name.appendChild(BAUSTEINE.el("span", null, "Vibration"));
        zeile.appendChild(name);
        if (FUEHLEN.verfuegbar()) {
            zeile.appendChild(BAUSTEINE.segment(
                [{ wert: true, text: "An" }, { wert: false, text: "Aus" }],
                FUEHLEN.an(),
                (wert) => {
                    FUEHLEN.anSetzen(wert);
                    FUEHLEN.tippen();
                    NAVIGATION.auffrischen();
                }, "Vibration"));
        } else {
            zeile.appendChild(BAUSTEINE.el("span", "schild", "nicht möglich"));
        }
        karte.appendChild(zeile);
        return karte;
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
