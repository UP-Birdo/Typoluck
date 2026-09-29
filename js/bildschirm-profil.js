/*
 * bildschirm-profil.js — ein Spielerprofil: das eigene oder ein fremdes.
 *
 * Parameter `id`: wessen Profil. Ohne Parameter das eigene.
 *
 * SEIT 0.25.0 EIN BLATT (gemeinsame Runde 7, wie Blunderluck v0.156.0,
 * `alsBlatt` in js\navigation.js): über der Seite, von der man kam — vom
 * Start (Kurzprofil), aus der Rangliste oder den Freunden. Das EIGENE Profil
 * baut der gemeinsame Baustein js\upcrew-profil.js: Ring, Name + #Tag, XP,
 * drei ausgerüstete Abzeichen aus ALLEN Spielen (ein Tipp öffnet die Auswahl
 * als Blatt darüber), Über dich (Spielzeit, dabei seit), Wo du stehst;
 * darunter Typolucks Statistik und die nächsten Level. Das Zahnrad oben
 * rechts öffnet die Einstellungen als Blatt darüber (sie standen bis 0.24.0
 * im Menü hinter den drei Balken). Ein fremdes Profil zeigt weiter Kreis,
 * Name, Freundschaft und die Wordguesser-Statistik.
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
            alsBlatt: true,
            blattRechts: (parameter) => (PROFIL_BILDSCHIRM.istEigenes(parameter)
                ? [PROFIL_BILDSCHIRM._zahnrad()] : []),
            zeigen: (behaelter, parameter) => PROFIL_BILDSCHIRM.zeigen(behaelter, parameter)
        });
    },

    istEigenes(parameter) {
        const ich = ANMELDUNG.ich();
        return !!ich && (!parameter || !parameter.id || parameter.id === ich.id);
    },

    /* Das Zahnrad → Einstellungen (als Blatt darüber). */
    _zahnrad() {
        const beiKlick = () => NAVIGATION.zeigen("einstellungen", null);
        if (typeof UPCREW_PROFIL !== "undefined") {
            return UPCREW_PROFIL.zahnrad(beiKlick);
        }
        return BAUSTEINE.knopf({ art: "flach", zeichen: "zahnrad", titel: "Einstellungen", beiKlick: beiKlick });
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

        /* Im Blatt tragen Titel, Schliessen und Zahnrad den Kopf des Blatts;
           ohne Blatt (Bildschirm-Tests) wie bisher eine Kopfzeile. */
        if (!NAVIGATION.imBlatt(behaelter)) {
            behaelter.appendChild(BAUSTEINE.kopfzeile(eigenes ? "Dein Profil" : "Profil", {
                zurueck: () => NAVIGATION.zurueck(),
                rechts: eigenes ? PROFIL_BILDSCHIRM._zahnrad() : null
            }));
        }

        if (!spieler) {
            behaelter.appendChild(ZUSTAND.leer({ zeichen: "profil", text: "Unbekannter Spieler" }));
            return;
        }

        const statistik = BAUSTEINE.karte(eigenes ? "Statistik · " + WORDLE.NAME : WORDLE.NAME, "profil-statistik");
        statistik.id = "profil-statistik";
        PROFIL_BILDSCHIRM._statistikFuellen(statistik, id, eigenes);

        if (eigenes && PROFIL_BILDSCHIRM._mitBaustein()) {
            APP.abzeichenBuchen();
            const ort = BAUSTEINE.el("div", "profil-blatt");
            UPCREW_PROFIL.zeichnen(ort, PROFIL_BILDSCHIRM.daten(spieler), {
                beiAbzeichen: () => PROFIL_BILDSCHIRM.abzeichenWahlOeffnen(),
                zusatz: [statistik, PROFIL_BILDSCHIRM._levelBauen(false)]
            });
            behaelter.appendChild(ort);
        } else if (eigenes) {
            behaelter.appendChild(PROFIL_BILDSCHIRM._kopfEigenBauen(spieler));
            behaelter.appendChild(PROFIL_BILDSCHIRM._levelBauen(true));
            behaelter.appendChild(statistik);
            behaelter.appendChild(PROFIL_BILDSCHIRM._abzeichenBauen());
        } else {
            /* Ein fremdes Profil: Kreis, Name, Freundschaft und die
               Wordguesser-Statistik — sein Fortschritt liegt nur auf SEINEM
               Gerät. */
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
            behaelter.appendChild(statistik);
        }
        /* Spielzeit (seit 0.24.0): im eigenen Profil steht sie seit 0.25.0
           im Baustein („Über dich"); fremd nur veröffentlicht. */
        if (!(eigenes && PROFIL_BILDSCHIRM._mitBaustein())) {
            const spielzeit = PROFIL_BILDSCHIRM._spielzeitBauen(spieler, eigenes);
            if (spielzeit) {
                behaelter.appendChild(spielzeit);
            }
        }

        if (PROFIL_BILDSCHIRM._verlauf === null && !PROFIL_BILDSCHIRM._fehler) {
            PROFIL_BILDSCHIRM._laden(id, eigenes);
        }
    },

    /* ---------------------------------------------------------------- *
     * Das eigene Profil aus dem Baustein (seit 0.25.0)
     * ---------------------------------------------------------------- */

    _mitBaustein() {
        return typeof UPCREW_PROFIL !== "undefined" && typeof UPCREW_ABZEICHEN !== "undefined"
            && typeof UPCREW_ABZEICHEN.alle === "function";
    },

    /* Alte Blunderluck-Kennungen im Konto-Feld (bis BL v0.155: „erster-sieg")
       → neue („bl-erster-sieg"), wie Blunderluck `PROFIL.umdeuten`. */
    umdeuten(kennung) {
        const k = String(kennung || "");
        const bl = (typeof UPCREW_ABZEICHEN_SPIELE !== "undefined" && UPCREW_ABZEICHEN_SPIELE.blunderluck)
            ? UPCREW_ABZEICHEN_SPIELE.blunderluck.abzeichen : [];
        return bl.some((e) => e.kennung === "bl-" + k) ? "bl-" + k : k;
    },

    /* Alle Abzeichen aller Spiele mit dem eigenen Stand (gemeinsame zuerst). */
    alleAbzeichen() {
        const stand = FORTSCHRITT.normalisieren(APP.fortschritt());
        const datum = WORDLE.datumText(APP.jetzt());
        return UPCREW_ABZEICHEN.alle(stand, FORTSCHRITT.laufendeSerie(stand, datum));
    },

    _gewaehlt(spieler) {
        return (spieler && Array.isArray(spieler.abzeichen) ? spieler.abzeichen : [])
            .map((k) => PROFIL_BILDSCHIRM.umdeuten(k));
    },

    /* Die Zahlen für den Baustein. */
    daten(spieler) {
        const stufe = APP.level();
        const fortschritt = APP.fortschritt();
        const alle = PROFIL_BILDSCHIRM.alleAbzeichen();
        const daten = {
            name: spieler.name,
            tag: KONTO.tagZusatz(spieler),
            level: stufe.level,
            anteil: stufe.kosten > 0 ? stufe.hat / stufe.kosten : 0,
            xpText: stufe.hat + " / " + stufe.kosten + " XP bis Level " + (stufe.level + 1),
            abzeichen: UPCREW_ABZEICHEN.ausgeruestet(alle, PROFIL_BILDSCHIRM._gewaehlt(spieler),
                SPIELER.ABZEICHEN_PLAETZE),
            plaetze: SPIELER.ABZEICHEN_PLAETZE,
            spielzeit: null,
            seit: "",
            orte: PROFIL_BILDSCHIRM.orte(fortschritt)
        };
        if (typeof SPIELZEIT !== "undefined") {
            const zeit = SPIELZEIT.spielzeit();
            daten.spielzeit = {
                wert: FORTSCHRITT.spielzeitText(zeit.summe),
                zeilen: Object.keys(zeit.spiele).filter((app) => zeit.spiele[app] > 0).sort()
                    .map((app) => (PROFIL_BILDSCHIRM.SPIEL_NAMEN[app] || app) + " "
                        + FORTSCHRITT.spielzeitText(zeit.spiele[app])),
                oeffentlich: SPIELZEIT._eigener() && SPIELZEIT.oeffentlich()
            };
            daten.seit = zeit.seit ? SPIELZEIT.datumText(zeit.seit) : "";
        }
        return daten;
    },

    /* Wo du stehst — je Spiel eine Zeile: Typoluck in der Bibliothek,
       Blunderluck im Turm (sobald sein Zweig da ist). */
    ORT_PFADE: {
        typoluck: "M4 5 C7 4 10 4 12 6 C14 4 17 4 20 5 V19 C17 18 14 18 12 20 C10 18 7 18 4 19 Z M12 6 V20",
        blunderluck: "M6 21 V9 L4 7 V3 H8 V5 H10 V3 H14 V5 H16 V3 H20 V7 L18 9 V21 Z M10 21 V16 H14 V21"
    },

    orte(fortschritt) {
        const orte = [];
        const andere = KONFIG.andereSpiele.blunderluck;
        for (const spiel of FORTSCHRITT.spiele(fortschritt, ["typoluck", "blunderluck"])) {
            const figuren = spiel.figuren + (spiel.figuren === 1 ? " Figur" : " Figuren");
            if (spiel.app === "typoluck" && typeof BIBLIOTHEK !== "undefined") {
                const alle = BIBLIOTHEK.anzahlBuecher();
                const erreicht = BIBLIOTHEK.erreicht(FORTSCHRITT.turmStand(fortschritt));
                orte.push({
                    spiel: "Typoluck",
                    titel: BIBLIOTHEK.NAME + (erreicht > alle ? " · alle Bücher" : " · Buch " + erreicht),
                    unter: figuren,
                    anteil: Math.min(1, (erreicht - 1) / Math.max(1, alle)),
                    pfad: PROFIL_BILDSCHIRM.ORT_PFADE.typoluck
                });
            } else if (spiel.app === "blunderluck" && spiel.ort > 0) {
                orte.push({
                    spiel: andere.name,
                    titel: "Turm · " + (andere.orte[spiel.ort - 1] || "Ort " + spiel.ort),
                    unter: figuren,
                    anteil: Math.min(1, (spiel.ort - 1) / Math.max(1, andere.orte.length)),
                    pfad: PROFIL_BILDSCHIRM.ORT_PFADE.blunderluck
                });
            }
        }
        return orte;
    },

    /* Die Auswahl als zweites Blatt: jede Änderung geht gleich ans Konto
       (über den Abgleich mit Zusammenführung, nur der eigene Eintrag). */
    abzeichenWahlOeffnen() {
        const ich = ANMELDUNG.ich();
        if (!ich || typeof UPCREW_BLATT === "undefined") {
            return null;
        }
        return UPCREW_BLATT.oeffnen({
            titel: "Abzeichen",
            klasse: "blatt-abzeichen",
            inhalt: (ort) => UPCREW_PROFIL.abzeichenWahl(ort, PROFIL_BILDSCHIRM.alleAbzeichen(),
                PROFIL_BILDSCHIRM._gewaehlt(SPIELER.spielerFinden(ANMELDUNG.abgleich.daten, ich.id)), {
                    plaetze: SPIELER.ABZEICHEN_PLAETZE,
                    beiWechsel: (liste) => {
                        ANMELDUNG.abgleich.aendern(SPIELER.abzeichenSetzen(ANMELDUNG.abgleich.daten, ich.id, liste));
                        NAVIGATION.auffrischen();
                    },
                    beiGesperrt: (eintrag) => DIALOG.kurzmeldung("Noch nicht verdient · "
                        + (eintrag.text || eintrag.titel))
                })
        });
    },

    /*
     * SPIELZEIT (seit 0.24.0): im EIGENEN Profil je Spiel und gesamt, dazu
     * „dabei seit" — auch als Gast (gezählt auf dem Gerät, js/spielzeit.js).
     * Im fremden Profil nur, wenn er sie veröffentlicht hat (Auszug), und
     * nur die Summe. Anzeige `FORTSCHRITT.spielzeitText` („N min", „Nh+").
     */
    SPIEL_NAMEN: { typoluck: "Typoluck", blunderluck: "Blunderluck" },

    spielzeitZeilen(spieler, eigenes) {
        if (eigenes) {
            const zeit = SPIELZEIT.spielzeit();
            const zeilen = Object.keys(zeit.spiele).filter((app) => zeit.spiele[app] > 0).sort()
                .map((app) => (PROFIL_BILDSCHIRM.SPIEL_NAMEN[app] || app) + " · "
                    + FORTSCHRITT.spielzeitText(zeit.spiele[app]));
            zeilen.push("Gesamt · " + FORTSCHRITT.spielzeitText(zeit.summe));
            if (zeit.seit) {
                zeilen.push("dabei seit " + SPIELZEIT.datumText(zeit.seit));
            }
            return zeilen;
        }
        const auszug = spieler && spieler.auszug && spieler.auszug.werte;
        return (auszug && typeof auszug.spielzeit === "number")
            ? ["Gesamt · " + FORTSCHRITT.spielzeitText(auszug.spielzeit)] : [];
    },

    _spielzeitBauen(spieler, eigenes) {
        if (typeof SPIELZEIT === "undefined") {
            return null;
        }
        const zeilen = PROFIL_BILDSCHIRM.spielzeitZeilen(spieler, eigenes);
        if (!zeilen.length) {
            return null;
        }
        const karte = BAUSTEINE.karte(eigenes ? "Spielzeit · nur du" : "Spielzeit", "profil-spielzeit");
        for (const zeile of zeilen) {
            karte.appendChild(BAUSTEINE.el("p", "profil-spielzeit-zeile", zeile));
        }
        if (eigenes && SPIELZEIT._eigener()) {
            karte.appendChild(BAUSTEINE.el("p", "profil-spielzeit-haken",
                SPIELZEIT.oeffentlich() ? "Öffentlich · Einstellungen" : "Privat · Einstellungen"));
        }
        return karte;
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
     * Ort und Figuren. Alle Zahlen aus js\fortschritt.js. Seit 0.25.0 ohne
     * „Spiele", wenn das Profil aus dem Baustein kommt (dort „Wo du stehst").
     */
    _levelBauen(mitSpielen) {
        const fortschritt = APP.fortschritt();
        const stufe = FORTSCHRITT.level(fortschritt);
        const karte = BAUSTEINE.karte(mitSpielen ? null : "Level", "profil-level");

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
           Blunderluck aus dessen Zweig; Typoluck seit 0.18.0 das erreichte
           Buch der Bibliothek (bis 0.17: „Turm bald"). */
        if (!mitSpielen) {
            return karte;
        }
        karte.appendChild(BAUSTEINE.el("h3", "level-zwischen", "Spiele"));
        const andere = KONFIG.andereSpiele.blunderluck;
        const namen = { typoluck: "Typoluck", blunderluck: andere.name };
        for (const spiel of FORTSCHRITT.spiele(fortschritt, ["blunderluck", "typoluck"])) {
            const zeile = BAUSTEINE.el("div", "profil-spiel");
            zeile.appendChild(BAUSTEINE.el("strong", "profil-spiel-name", namen[spiel.app]));
            let ortName = spiel.app === "blunderluck" && spiel.ort > 0
                ? (andere.orte[spiel.ort - 1] || "Ort " + spiel.ort) : "";
            if (spiel.app === "typoluck" && typeof BIBLIOTHEK !== "undefined") {
                const buch = Math.min(BIBLIOTHEK.erreicht(FORTSCHRITT.turmStand(fortschritt)),
                    BIBLIOTHEK.anzahlBuecher());
                ortName = BIBLIOTHEK.NAME + " · Buch " + buch;
            }
            zeile.appendChild(BAUSTEINE.el("span", "profil-ort" + (ortName ? "" : " profil-ort-leer"),
                ortName || "—"));
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
       Entwurf; seit 0.15.9 aus dem gemeinsamen Baustein
       js\upcrew-abzeichen.js, gleich in Blunderluck und in der Sammlung):
       Zeichen und je Stufe ein Punkt; antippen zeigt Wert und Stufen. */
    _abzeichenBauen() {
        const karte = BAUSTEINE.karte("Abzeichen", "profil-abzeichen");
        const datum = WORDLE.datumText(APP.jetzt());
        karte.appendChild(UPCREW_ABZEICHEN.raster(FORTSCHRITT.abzeichen(APP.fortschritt(), datum),
            (eintrag) => DIALOG.hinweis(eintrag.titel, "", UPCREW_ABZEICHEN.blatt(eintrag))));
        return karte;
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
        if (karte && NAVIGATION.sichtbar("profil") && PROFIL_BILDSCHIRM._fuerId === id) {
            PROFIL_BILDSCHIRM._statistikFuellen(karte, id, eigenes);
        }
    }
};
