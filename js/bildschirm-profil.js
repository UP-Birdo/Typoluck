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

        /* Das eigene Profil ist seit 0.12.0 das Profil-Blatt aus dem
           Entwurf (Design\3D-Schrift\entwuerfe\Herausforderungen, Funktion
           `profilBlatt`): Kopf mit Level-Ring, Rahmen, Titel und XP-Balken;
           XP-Quellen, nächste Level, Spiele; Statistik; Abzeichen. Ein
           fremdes Profil zeigt weiter Kreis, Name, Freundschaft und die
           Wordguesser-Statistik — sein Fortschritt liegt nur auf SEINEM
           Gerät. */
        if (eigenes) {
            behaelter.appendChild(PROFIL_BILDSCHIRM._kopfEigenBauen(spieler));
            behaelter.appendChild(PROFIL_BILDSCHIRM._levelBauen());
        } else {
            const kopf = BAUSTEINE.karte(null, "profil-kopf");
            kopf.appendChild(BAUSTEINE.kreis(spieler.name, "namens-kreis-gross"));
            const name = BAUSTEINE.el("h2", "profil-name", ANMELDUNG.anzeigeName(spieler));
            /* Die Nummer nur leise und nur bei gleichen Namen (seit 0.15.6). */
            const nummer = SPIELER.nummerZusatz(ANMELDUNG.abgleich.daten, spieler);
            if (nummer) {
                name.appendChild(BAUSTEINE.el("span", "name-nummer", " " + nummer));
            }
            kopf.appendChild(name);
            if (ich) {
                kopf.appendChild(PROFIL_BILDSCHIRM._freundschaftBauen(ich, spieler));
            }
            behaelter.appendChild(kopf);
        }

        const statistik = BAUSTEINE.karte(eigenes ? "Statistik" : WORDLE.NAME, "profil-statistik");
        statistik.id = "profil-statistik";
        PROFIL_BILDSCHIRM._statistikFuellen(statistik, id, eigenes);
        behaelter.appendChild(statistik);

        if (eigenes) {
            behaelter.appendChild(PROFIL_BILDSCHIRM._abzeichenBauen());
        }

        if (PROFIL_BILDSCHIRM._verlauf === null && !PROFIL_BILDSCHIRM._fehler) {
            PROFIL_BILDSCHIRM._laden(id, eigenes);
        }
    },

    /* Der Kopf des eigenen Profils (seit 0.12.0): Ring mit Rahmen, Name,
       Titel, darunter Level und XP-Balken. */
    _kopfEigenBauen(spieler) {
        const stufe = APP.level();
        const rahmen = FORTSCHRITT.rahmenVon(stufe.level);
        const titel = FORTSCHRITT.titelVon(stufe.level);
        const kopf = BAUSTEINE.karte(null, "profil-kopf profil-kopf-eigen");
        kopf.appendChild(BAUSTEINE.levelRing(spieler.name, stufe.hat / stufe.kosten, stufe.level, true, rahmen));

        const texte = BAUSTEINE.el("div", "level-texte");
        texte.appendChild(BAUSTEINE.el("h2", "profil-name", ANMELDUNG.anzeigeName(spieler)));
        const zeile = BAUSTEINE.el("div", "profil-titelzeile");
        if (titel) {
            zeile.appendChild(BAUSTEINE.el("span", "profil-titel", titel));
        }
        if (rahmen) {
            zeile.appendChild(BAUSTEINE.el("span", "profil-rahmen profil-rahmen-" + rahmen.stufe, rahmen.name));
        }
        if (zeile.children.length) {
            texte.appendChild(zeile);
        }
        const xp = BAUSTEINE.el("div", "level-xp-zeile");
        xp.appendChild(BAUSTEINE.el("strong", "level-titel", "Level " + stufe.level));
        const balken = BAUSTEINE.el("span", "level-balken");
        balken.style.setProperty("--anteil", String(stufe.hat / stufe.kosten));
        balken.setAttribute("aria-hidden", "true");
        xp.appendChild(balken);
        xp.appendChild(BAUSTEINE.el("span", "level-xp", stufe.hat + " / " + stufe.kosten + " XP"));
        texte.appendChild(xp);
        kopf.appendChild(texte);
        return kopf;
    },

    /*
     * Die Level-Karte (seit 0.10.0, seit 0.12.0 wie im Entwurf): woher XP
     * kommen, die nächsten drei Level mit ihren Belohnungen und je Spiel
     * Ort und Figuren. Alle Zahlen aus js\fortschritt.js.
     */
    _levelBauen() {
        const fortschritt = APP.fortschritt();
        const stufe = FORTSCHRITT.level(fortschritt);
        const karte = BAUSTEINE.karte(null, "profil-level");

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
                /* Die Art nur davor, wo der Name sie nicht schon sagt
                   („Serien-Schutz", „Rahmen 20"). */
                const art = PROFIL_BILDSCHIRM.BELOHNUNG_ARTEN[belohnung.art];
                const sagtEsSchon = belohnung.art === "schutz" || belohnung.name.indexOf(art) === 0;
                liste.appendChild(BAUSTEINE.el("span", "level-belohnung level-belohnung-" + belohnung.art,
                    sagtEsSchon ? belohnung.name : art + " · " + belohnung.name));
            }
            if (!belohnungen.length) {
                liste.appendChild(BAUSTEINE.el("span", "level-belohnung-leer", "—"));
            }
            zeile.appendChild(liste);
            karte.appendChild(zeile);
        }

        /* Spiele (seit 0.12.0): je Spiel der Ort im Turm und die Figuren.
           Blunderluck aus dessen Zweig; Typoluck hat noch keinen Turm. */
        karte.appendChild(BAUSTEINE.el("h3", "level-zwischen", "Spiele"));
        const andere = KONFIG.andereSpiele.blunderluck;
        const namen = { typoluck: "Typoluck", blunderluck: andere.name };
        for (const spiel of FORTSCHRITT.spiele(fortschritt, ["blunderluck", "typoluck"])) {
            const zeile = BAUSTEINE.el("div", "profil-spiel");
            zeile.appendChild(BAUSTEINE.el("strong", "profil-spiel-name", namen[spiel.app]));
            const ortName = spiel.app === "blunderluck" && spiel.ort > 0
                ? (andere.orte[spiel.ort - 1] || "Ort " + spiel.ort) : "";
            zeile.appendChild(BAUSTEINE.el("span", "profil-ort" + (ortName ? "" : " profil-ort-leer"),
                ortName || (spiel.app === "typoluck" ? "Turm bald" : "—")));
            const figuren = BAUSTEINE.el("span", "profil-figuren");
            figuren.appendChild(BAUSTEINE.zeichen("koenig"));
            figuren.appendChild(BAUSTEINE.el("strong", null, String(spiel.figuren)));
            figuren.setAttribute("aria-label", spiel.figuren + " Figuren");
            zeile.appendChild(figuren);
            karte.appendChild(zeile);
        }
        return karte;
    },

    /* Die Abzeichen (seit 0.10.0; seit 0.12.0 eigene Karte wie im
       Entwurf): Zeichen und je Stufe ein Punkt; antippen zeigt Wert und
       Stufen. Werte über alle Spiele (js\fortschritt.js). */
    _abzeichenBauen() {
        const karte = BAUSTEINE.karte("Abzeichen", "profil-abzeichen");
        const raster = BAUSTEINE.el("div", "level-abzeichen");
        const datum = WORDLE.datumText(APP.jetzt());
        for (const eintrag of FORTSCHRITT.abzeichen(APP.fortschritt(), datum)) {
            raster.appendChild(BAUSTEINE.abzeichen(eintrag, () => PROFIL_BILDSCHIRM._abzeichenZeigen(eintrag)));
        }
        karte.appendChild(raster);
        return karte;
    },

    _abzeichenZeigen(eintrag) {
        const inhalt = BAUSTEINE.el("div", "abzeichen-blatt");
        const wert = BAUSTEINE.el("p", "abzeichen-wert");
        wert.appendChild(BAUSTEINE.el("strong", null, String(eintrag.wert)));
        wert.appendChild(BAUSTEINE.el("span", null, " " + eintrag.einheit));
        inhalt.appendChild(wert);
        const stufen = BAUSTEINE.el("div", "abzeichen-stufen");
        for (const stufe of eintrag.stufen) {
            stufen.appendChild(BAUSTEINE.el("span", eintrag.wert >= stufe ? "an" : null, String(stufe)));
        }
        stufen.appendChild(BAUSTEINE.el("span", "leise", "+" + eintrag.weiter + " …"));
        inhalt.appendChild(stufen);
        DIALOG.hinweis(eintrag.titel, "", inhalt);
    },

    /* Wie eine Belohnung heisst (kurz). */
    BELOHNUNG_ARTEN: {
        farbwelt: "Farbwelt",
        schrift: "Schrift",
        knoepfe: "Knöpfe",
        kachelset: "Kachel-Set",
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
        /* Kachel-Sets (seit 0.15.0) heissen, wie die Sammlung sie nennt. */
        const namen = { farbwelt: {}, schrift: {}, knoepfe: {}, kachelset: SAMMLUNG.kachelsetNamen() };
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
        const datum = WORDLE.datumText(APP.jetzt());
        const werte = RANGLISTE.statistik(verlauf, datum);

        const kachel = (zahl, text) => {
            const feld = BAUSTEINE.el("div", "statistik-feld");
            feld.appendChild(BAUSTEINE.el("span", "statistik-zahl", String(zahl)));
            feld.appendChild(BAUSTEINE.el("span", "statistik-text", text));
            return feld;
        };
        if (eigenes) {
            /* Seit 0.12.0 wie im Entwurf: sechs Kacheln — Partien und
               Können aus dem Fortschritt (auch Übung), Quote und Ø aus dem
               Tageswort-Verlauf, die längste Serie über alle Spiele. */
            const eigen = FORTSCHRITT.statistik(APP.fortschritt(), datum);
            const raster = BAUSTEINE.el("div", "statistik-raster statistik-raster-sechs");
            raster.appendChild(kachel(eigen.partien, "Partien"));
            raster.appendChild(kachel(werte.quote + " %", "gelöst"));
            raster.appendChild(kachel(eigen.koennen === null ? "—" : eigen.koennen + " %", "Ø Können"));
            raster.appendChild(kachel(eigen.bestesKoennen === null ? "—" : eigen.bestesKoennen + " %", "Bestes"));
            raster.appendChild(kachel(eigen.besteSerie, "Längste Serie"));
            raster.appendChild(kachel(werte.durchschnitt === null ? "—"
                : String(werte.durchschnitt).replace(".", ","), "Tageswort Ø"));
            karte.appendChild(raster);
        } else {
            const raster = BAUSTEINE.el("div", "statistik-raster");
            raster.appendChild(kachel(werte.gespielt, "gespielt"));
            raster.appendChild(kachel(werte.quote + " %", "gelöst"));
            raster.appendChild(kachel(werte.serie, "Serie"));
            raster.appendChild(kachel(werte.besteSerie, "beste Serie"));
            karte.appendChild(raster);
        }

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
