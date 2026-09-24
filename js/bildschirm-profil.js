/*
 * bildschirm-profil.js — ein Spielerprofil: das eigene oder ein fremdes.
 *
 * Parameter `id`: wessen Profil. Ohne Parameter das eigene — dann mit den
 * Einstellungen (Name, Passwort, Abmelden) und „Über Typoluck".
 *
 * Die Statistik rechnet js\rangliste.js aus dem Verlauf des Spielers
 * (`typoluck/wordle/verlauf/<id>`). Beim eigenen Profil zählen Ergebnisse,
 * die noch auf dem Gerät warten, schon mit.
 */

const PROFIL_BILDSCHIRM = {

    _verlauf: null,
    _fehler: "",
    _fuerId: null,
    _geladenAm: 0,

    anmelden() {
        NAVIGATION.anmelden({
            id: "profil",
            titel: "Profil",
            zeichen: "profil",
            inLeiste: true,
            zeigen: (behaelter, parameter) => PROFIL_BILDSCHIRM.zeigen(behaelter, parameter)
        });
    },

    zeigen(behaelter, parameter) {
        const ich = ANMELDUNG.ich();
        const id = (parameter && parameter.id) || (ich ? ich.id : null);
        const eigenes = !!ich && id === ich.id;
        const spieler = SPIELER.spielerFinden(ANMELDUNG.abgleich.daten, id);

        PROFIL_BILDSCHIRM._behaelter = behaelter;

        /* Der geladene Verlauf gilt eine halbe Minute. So baut ein Neuzeichnen
           wegen neuer Spielerdaten den Bildschirm nicht jedes Mal mit „Wird
           geladen" neu auf — ein neues Öffnen später holt aber frisch. */
        if (PROFIL_BILDSCHIRM._fuerId !== id || Date.now() - PROFIL_BILDSCHIRM._geladenAm > 30000) {
            PROFIL_BILDSCHIRM._verlauf = null;
            PROFIL_BILDSCHIRM._fehler = "";
            PROFIL_BILDSCHIRM._fuerId = id;
        }

        behaelter.appendChild(BAUSTEINE.kopfzeile(eigenes ? "Dein Profil" : "Profil", {
            zurueck: (parameter && parameter.id) ? () => NAVIGATION.zurueck() : null
        }));

        if (!spieler) {
            behaelter.appendChild(BAUSTEINE.erklaerung("Diesen Spieler gibt es nicht (mehr)."));
            return;
        }

        const kopf = BAUSTEINE.karte(null, "profil-kopf");
        kopf.appendChild(BAUSTEINE.kreis(spieler.name, "namens-kreis-gross"));
        kopf.appendChild(BAUSTEINE.el("h2", "profil-name", spieler.name));
        if (!eigenes && ich) {
            kopf.appendChild(PROFIL_BILDSCHIRM._freundschaftBauen(ich, spieler));
        }
        behaelter.appendChild(kopf);

        const statistik = BAUSTEINE.karte("Wordle", "profil-statistik");
        statistik.id = "profil-statistik";
        PROFIL_BILDSCHIRM._statistikFuellen(statistik, id, eigenes);
        behaelter.appendChild(statistik);

        if (eigenes) {
            behaelter.appendChild(PROFIL_BILDSCHIRM._einstellungenBauen());
            behaelter.appendChild(PROFIL_BILDSCHIRM._ueberBauen());
        }

        if (PROFIL_BILDSCHIRM._verlauf === null && !PROFIL_BILDSCHIRM._fehler) {
            PROFIL_BILDSCHIRM._laden(id, eigenes);
        }
    },

    _statistikFuellen(karte, id, eigenes) {
        while (karte.children.length > 1) {
            karte.removeChild(karte.lastChild);
        }
        if (PROFIL_BILDSCHIRM._fehler) {
            karte.appendChild(BAUSTEINE.erklaerung(PROFIL_BILDSCHIRM._fehler));
            return;
        }
        if (PROFIL_BILDSCHIRM._verlauf === null) {
            karte.appendChild(BAUSTEINE.erklaerung("Wird geladen …"));
            return;
        }

        const verlauf = eigenes
            ? ERGEBNISSE.verlaufMitAusstehendem(PROFIL_BILDSCHIRM._verlauf, id)
            : PROFIL_BILDSCHIRM._verlauf;
        const werte = RANGLISTE.statistik(verlauf, WORDLE.datumText(APP.jetzt()));

        const raster = BAUSTEINE.el("div", "statistik-raster");
        const kachel = (zahl, text) => {
            const feld = BAUSTEINE.el("div", "statistik-feld");
            feld.appendChild(BAUSTEINE.el("span", "statistik-zahl", String(zahl)));
            feld.appendChild(BAUSTEINE.el("span", "statistik-text", text));
            return feld;
        };
        raster.appendChild(kachel(werte.gespielt, "gespielt"));
        raster.appendChild(kachel(werte.quote + " %", "gelöst"));
        raster.appendChild(kachel(werte.serie, "Serie"));
        raster.appendChild(kachel(werte.besteSerie, "beste Serie"));
        karte.appendChild(raster);

        if (werte.gespielt === 0) {
            karte.appendChild(BAUSTEINE.erklaerung(eigenes
                ? "Noch kein Tageswort gespielt. Los geht es auf dem Start."
                : "Hat noch kein Tageswort gespielt."));
            return;
        }

        karte.appendChild(BAUSTEINE.el("h3", "unterkopf", "Gelöst im … Versuch"));
        const hoechster = Math.max(1, ...werte.verteilung);
        werte.verteilung.forEach((anzahl, i) => {
            const zeile = BAUSTEINE.el("div", "verteilung-zeile");
            zeile.appendChild(BAUSTEINE.el("span", "verteilung-nummer", String(i + 1)));
            const balken = BAUSTEINE.el("span", "verteilung-balken", String(anzahl));
            balken.style.width = Math.max(8, Math.round(100 * anzahl / hoechster)) + "%";
            zeile.appendChild(balken);
            karte.appendChild(zeile);
        });
    },

    _freundschaftBauen(ich, spieler) {
        const daten = ANMELDUNG.abgleich.daten;
        const lage = SPIELER.freundschaft(daten, ich.id, spieler.id);
        const bereich = BAUSTEINE.el("div", "profil-freundschaft");

        const setzen = (neu, meldung) => {
            ANMELDUNG.abgleich.aendern(neu);
            DIALOG.kurzmeldung(meldung);
        };

        if (lage === "freunde") {
            bereich.appendChild(BAUSTEINE.el("span", "schild schild-gut", "Ihr seid Freunde"));
        } else if (lage === "gesendet") {
            bereich.appendChild(BAUSTEINE.el("span", "schild", "Anfrage gesendet"));
        } else if (lage === "offen") {
            bereich.appendChild(BAUSTEINE.knopf({
                text: "Anfrage annehmen", art: "haupt", klein: true,
                beiKlick: () => setzen(SPIELER.freundHinzufuegen(daten, ich.id, spieler.id),
                    "Du und " + spieler.name + " seid jetzt Freunde")
            }));
        } else {
            bereich.appendChild(BAUSTEINE.knopf({
                text: "Als Freund anfragen", art: "haupt", klein: true, zeichen: "freunde",
                beiKlick: () => setzen(SPIELER.freundHinzufuegen(daten, ich.id, spieler.id),
                    "Anfrage an " + spieler.name + " gesendet")
            }));
        }
        return bereich;
    },

    _einstellungenBauen() {
        const karte = BAUSTEINE.karte("UPCrew-Konto");
        karte.appendChild(BAUSTEINE.erklaerung("Dein Konto gilt in allen Spielen von UPCrew — "
            + "mit demselben Namen, Passwort und denselben Freunden."));
        const reihe = BAUSTEINE.el("div", "knopf-spalte");
        reihe.appendChild(BAUSTEINE.knopf({ text: "Name ändern", art: "still", breit: true,
            beiKlick: () => ANMELDUNG.nameAendern() }));
        reihe.appendChild(BAUSTEINE.knopf({ text: "Passwort ändern", art: "still", breit: true,
            beiKlick: () => ANMELDUNG.passwortAendern() }));
        reihe.appendChild(BAUSTEINE.knopf({ text: "Abmelden", art: "gefahr", breit: true,
            beiKlick: () => ANMELDUNG.abmelden(false) }));
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
            angabe("Noch nicht gesendet", offen === 1 ? "1 Ergebnis" : offen + " Ergebnisse");
        }
        karte.appendChild(liste);
        karte.appendChild(BAUSTEINE.knopf({
            text: "Wunsch oder Fehler melden", art: "still", breit: true,
            beiKlick: () => WUNSCH.oeffnen()
        }));
        return karte;
    },

    async _laden(id, eigenes) {
        PROFIL_BILDSCHIRM._geladenAm = Date.now();
        try {
            PROFIL_BILDSCHIRM._verlauf = await ERGEBNISSE.verlaufLaden(APP.spielSpeicher, id);
        } catch (fehler) {
            PROFIL_BILDSCHIRM._verlauf = eigenes ? {} : null;
            PROFIL_BILDSCHIRM._fehler = eigenes ? "" : "Die Statistik ist gerade nicht erreichbar. " + fehler.message;
        }
        const karte = document.getElementById("profil-statistik");
        if (karte && NAVIGATION.aktuell === "profil" && PROFIL_BILDSCHIRM._fuerId === id) {
            PROFIL_BILDSCHIRM._statistikFuellen(karte, id, eigenes);
        }
    }
};
