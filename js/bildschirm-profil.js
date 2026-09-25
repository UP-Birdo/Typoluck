/*
 * bildschirm-profil.js — ein Spielerprofil: das eigene oder ein fremdes.
 *
 * Parameter `id`: wessen Profil. Ohne Parameter das eigene.
 *
 * Seit 0.5.0 zeigt das eigene Profil dasselbe wie ein fremdes: Spieler und
 * Statistik. Gerät, Konto und „Über Typoluck" stehen seitdem unter
 * Einstellungen (js\bildschirm-einstellungen.js, im Menü hinter den drei
 * Balken).
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
            imMenue: true,
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
            zurueck: () => NAVIGATION.zurueck()
        }));

        if (!spieler) {
            behaelter.appendChild(ZUSTAND.leer({ zeichen: "profil", text: "Unbekannter Spieler" }));
            return;
        }

        const kopf = BAUSTEINE.karte(null, "profil-kopf");
        kopf.appendChild(BAUSTEINE.kreis(spieler.name, "namens-kreis-gross"));
        kopf.appendChild(BAUSTEINE.el("h2", "profil-name", ANMELDUNG.anzeigeName(spieler)));
        if (!eigenes && ich) {
            kopf.appendChild(PROFIL_BILDSCHIRM._freundschaftBauen(ich, spieler));
        }
        behaelter.appendChild(kopf);

        const statistik = BAUSTEINE.karte("Wordle", "profil-statistik");
        statistik.id = "profil-statistik";
        PROFIL_BILDSCHIRM._statistikFuellen(statistik, id, eigenes);
        behaelter.appendChild(statistik);

        if (PROFIL_BILDSCHIRM._verlauf === null && !PROFIL_BILDSCHIRM._fehler) {
            PROFIL_BILDSCHIRM._laden(id, eigenes);
        }
    },

    _statistikFuellen(karte, id, eigenes) {
        while (karte.children.length > 1) {
            karte.removeChild(karte.lastChild);
        }
        const nochmal = () => {
            PROFIL_BILDSCHIRM._verlauf = null;
            PROFIL_BILDSCHIRM._fehler = "";
            PROFIL_BILDSCHIRM._statistikFuellen(karte, id, eigenes);
            PROFIL_BILDSCHIRM._laden(id, eigenes);
        };
        if (PROFIL_BILDSCHIRM._fehler) {
            karte.appendChild(ZUSTAND.fehler({ technik: PROFIL_BILDSCHIRM._fehler, nochmal: nochmal }));
            return;
        }
        if (PROFIL_BILDSCHIRM._verlauf === null) {
            karte.appendChild(ZUSTAND.laden({ zeilen: 2, nochmal: nochmal }));
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
            karte.appendChild(ZUSTAND.leer({
                zeichen: "wordle", text: "Noch nicht gespielt",
                aktion: eigenes ? { text: "Spielen", zeichen: "weiter",
                    beiKlick: () => NAVIGATION.zeigen("wordle", { modus: "tag" }) } : null
            }));
            return;
        }

        karte.appendChild(BAUSTEINE.el("h3", "unterkopf", "Gelöst im Versuch"));
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
        if (SPIELER.istVerteiler(ich) || SPIELER.istVerteiler(spieler)) {
            return bereich;
        }

        const setzen = (neu, meldung) => {
            ANMELDUNG.abgleich.aendern(neu);
            DIALOG.kurzmeldung(meldung);
        };

        if (lage === "freunde") {
            bereich.appendChild(BAUSTEINE.el("span", "schild schild-gut", "Freunde"));
        } else if (lage === "gesendet") {
            bereich.appendChild(BAUSTEINE.el("span", "schild", "Anfrage gesendet"));
        } else if (lage === "offen") {
            bereich.appendChild(BAUSTEINE.knopf({
                text: "Annehmen", art: "haupt", klein: true,
                beiKlick: () => setzen(SPIELER.freundHinzufuegen(daten, ich.id, spieler.id),
                    "Freunde: " + spieler.name)
            }));
        } else {
            bereich.appendChild(BAUSTEINE.knopf({
                text: "Anfragen", art: "haupt", klein: true, zeichen: "freunde",
                beiKlick: () => setzen(SPIELER.freundHinzufuegen(daten, ich.id, spieler.id),
                    "Anfrage gesendet")
            }));
        }
        return bereich;
    },

    async _laden(id, eigenes) {
        PROFIL_BILDSCHIRM._geladenAm = Date.now();
        try {
            PROFIL_BILDSCHIRM._verlauf = await ERGEBNISSE.verlaufLaden(APP.spielSpeicher, id);
        } catch (fehler) {
            PROFIL_BILDSCHIRM._verlauf = eigenes ? {} : null;
            PROFIL_BILDSCHIRM._fehler = eigenes ? "" : (fehler.message || "Fehler");
        }
        const karte = document.getElementById("profil-statistik");
        if (karte && NAVIGATION.aktuell === "profil" && PROFIL_BILDSCHIRM._fuerId === id) {
            PROFIL_BILDSCHIRM._statistikFuellen(karte, id, eigenes);
        }
    }
};
