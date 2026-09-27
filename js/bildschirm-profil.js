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
        /* Das eigene Profil zeigt den Kreis mit Level-Ring (seit 0.10.0). */
        if (eigenes) {
            const stufe = FORTSCHRITT.levelVon(APP.fortschritt().xp);
            kopf.appendChild(BAUSTEINE.levelRing(spieler.name, stufe.hat / stufe.kosten, stufe.level, true));
        } else {
            kopf.appendChild(BAUSTEINE.kreis(spieler.name, "namens-kreis-gross"));
        }
        kopf.appendChild(BAUSTEINE.el("h2", "profil-name", ANMELDUNG.anzeigeName(spieler)));
        if (!eigenes && ich) {
            kopf.appendChild(PROFIL_BILDSCHIRM._freundschaftBauen(ich, spieler));
        }
        behaelter.appendChild(kopf);

        /* Das Level (seit 0.10.0, UPCrew-Runde 5) — nur im eigenen Profil:
           Der Fortschritt liegt vorerst nur auf dem Gerät, von anderen
           Spielern ist er nicht bekannt. */
        if (eigenes) {
            behaelter.appendChild(PROFIL_BILDSCHIRM._levelBauen());
        }

        const statistik = BAUSTEINE.karte(WORDLE.NAME, "profil-statistik");
        statistik.id = "profil-statistik";
        PROFIL_BILDSCHIRM._statistikFuellen(statistik, id, eigenes);
        behaelter.appendChild(statistik);

        if (PROFIL_BILDSCHIRM._verlauf === null && !PROFIL_BILDSCHIRM._fehler) {
            PROFIL_BILDSCHIRM._laden(id, eigenes);
        }
    },

    /*
     * Die Level-Karte (seit 0.10.0): Level mit XP-Balken, woher XP kommen,
     * die nächsten drei Level mit ihren Belohnungen und die Abzeichen.
     * Alle Zahlen aus js\fortschritt.js.
     */
    _levelBauen() {
        const fortschritt = APP.fortschritt();
        const stufe = FORTSCHRITT.levelVon(fortschritt.xp);
        const karte = BAUSTEINE.karte(null, "profil-level");

        /* Der Ring selbst steht in der Kopfkarte darüber. */
        const kopf = BAUSTEINE.el("div", "level-kopf");
        const texte = BAUSTEINE.el("div", "level-texte");
        texte.appendChild(BAUSTEINE.el("strong", "level-titel", "Level " + stufe.level));
        const balken = BAUSTEINE.el("span", "level-balken");
        balken.style.setProperty("--anteil", String(stufe.hat / stufe.kosten));
        balken.setAttribute("aria-hidden", "true");
        texte.appendChild(balken);
        texte.appendChild(BAUSTEINE.el("span", "level-xp", stufe.hat + " / " + stufe.kosten + " XP"));
        kopf.appendChild(texte);
        karte.appendChild(kopf);

        const quellen = BAUSTEINE.el("div", "level-quellen");
        for (const quelle of FORTSCHRITT.quellen()) {
            const feld = BAUSTEINE.el("span", "level-quelle");
            feld.title = quelle.titel;
            feld.appendChild(BAUSTEINE.zeichen(quelle.zeichen));
            feld.appendChild(BAUSTEINE.el("strong", null, quelle.wert));
            feld.appendChild(BAUSTEINE.el("span", "level-quelle-name", quelle.titel));
            quellen.appendChild(feld);
        }
        karte.appendChild(quellen);

        karte.appendChild(BAUSTEINE.el("h3", "level-zwischen", "Nächste Level"));
        const stufen = APP._stufen();
        for (let level = stufe.level + 1; level <= stufe.level + 3; level++) {
            const zeile = BAUSTEINE.el("div", "level-naechstes");
            zeile.appendChild(BAUSTEINE.el("span", "level-nummer", String(level)));
            const belohnungen = FORTSCHRITT.belohnungen(level, stufen, PROFIL_BILDSCHIRM._belohnungsNamen(stufen));
            const liste = BAUSTEINE.el("span", "level-belohnungen");
            for (const belohnung of belohnungen) {
                liste.appendChild(BAUSTEINE.el("span", "level-belohnung",
                    PROFIL_BILDSCHIRM.BELOHNUNG_ARTEN[belohnung.art] + " · " + belohnung.name));
            }
            if (!belohnungen.length) {
                liste.appendChild(BAUSTEINE.el("span", "level-belohnung-leer", "—"));
            }
            zeile.appendChild(liste);
            karte.appendChild(zeile);
        }

        karte.appendChild(BAUSTEINE.el("h3", "level-zwischen", "Abzeichen"));
        const abzeichen = BAUSTEINE.el("div", "level-abzeichen");
        for (const eintrag of FORTSCHRITT.abzeichen(fortschritt)) {
            const feld = BAUSTEINE.el("span", "abzeichen" + (eintrag.erreicht > 0 ? " abzeichen-an" : ""));
            feld.title = eintrag.titel + ": " + eintrag.wert + " / " + eintrag.naechste;
            feld.appendChild(BAUSTEINE.zeichen(eintrag.zeichen));
            feld.appendChild(BAUSTEINE.el("strong", null, String(eintrag.wert)));
            feld.appendChild(BAUSTEINE.el("span", "abzeichen-name", eintrag.kurz));
            abzeichen.appendChild(feld);
        }
        karte.appendChild(abzeichen);
        return karte;
    },

    /* Wie eine Belohnung heisst (kurz). */
    BELOHNUNG_ARTEN: {
        farbwelt: "Farbwelt",
        schrift: "Schrift",
        knoepfe: "Knöpfe",
        titel: "Titel",
        rahmen: "Rahmen",
        schutz: "Schutz"
    },

    /* Anzeigenamen der Aussehen-Stücke — aus den Bausteinen gelesen, nie
       hier festgeschrieben: Farbwelten aus UPCREW_INTRO.WELTEN, Schriften
       als „Crew n" wie im Anpassen-Regal. Knopf-Familien zeigen ihre
       Kennung (die Namen stecken im Baustein und sind nicht nach aussen
       gereicht). */
    _belohnungsNamen(stufen) {
        const namen = { farbwelt: {}, schrift: {}, knoepfe: {} };
        const welten = (typeof UPCREW_INTRO !== "undefined" && UPCREW_INTRO.WELTEN) || {};
        for (const wert of Object.keys((stufen && stufen.farbwelt) || {})) {
            namen.farbwelt[wert] = (welten[wert] && welten[wert].name) || wert;
        }
        for (const wert of Object.keys((stufen && stufen.schrift) || {})) {
            namen.schrift[wert] = "Crew " + wert.slice(1);
        }
        return namen;
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
