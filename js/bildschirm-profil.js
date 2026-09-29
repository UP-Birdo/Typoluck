/*
 * bildschirm-profil.js — ein Spielerprofil: das eigene oder ein fremdes.
 *
 * Parameter `id`: wessen Profil. Ohne Parameter das eigene.
 *
 * SEIT 0.26.0 ZWEISTUFIG (Nutzer 29.09.2026: „generell soll es nur ein
 * vorschau profil geben karte die oben ist mit den ausgerüsteten abzeichen
 * titel und level und flammen mit natürlich dem namen -> und halt das
 * ausführliche wenn man draufklickt mit mehr inhalten statistiken und so";
 * Einbau-Notiz Design\3D-Schrift\final\EINBAU-2026-09-29b.md):
 *   Stufe 1  seit 0.26.1 KEINE Vorschau-Karte mehr (Nutzer 29.09.2026
 *            nachts: „nicht erst eine vorschau vom profil … das was hinter
 *            dem pfeil steht soll direkt kommen"): die Kopfzeile auf dem
 *            Start (js/bildschirm-start.js) und jeder Name in Rangliste und
 *            Freunden öffnen direkt dieses Blatt (`profilOeffnen`).
 *            Zahlen: `vorschauDaten` — eigene aus dem Fortschritt, fremde aus
 *            dem ÖFFENTLICHEN AUSZUG (Regel §12, `FORTSCHRITT.auszugVon`,
 *            wie Blunderluck `RANGLISTE.abzeichenListe`).
 *   Stufe 2  dieses Blatt „Profil" (`alsBlatt` in js\navigation.js): das
 *            ausführliche Profil aus UPCREW_PROFIL.zeichnen — Kopf,
 *            Ausgerüstet, Statistik (von hier), Stand, bei Fremden die
 *            Freundschaft. Das Zahnrad (nur eigen) oben rechts →
 *            Einstellungen.
 *            SEIT 0.26.2 SCHLANK (Nutzer 29.09.2026 spät: „den wählen knopf
 *            raus … Partien aus profil … flamme oben rechts … level balken …
 *            dabei seit kompakter … sammlung der abzeichen soll auch raus"):
 *            kein „Wählen" (jeder der 3 Plätze öffnet die Auswahl), keine
 *            Partien (die letzten Tageswörter stehen im eigenen Blatt
 *            „Verlauf", `verlaufOeffnen`, über das Menü), keine Abzeichen-Liste,
 *            kein „Über" und keine Level-Kachel; oben rechts die Flamme,
 *            darunter der Level-Balken (klappt den Level-Pfad auf),
 *            „seit …" und die Spielzeit NUR von Typoluck (Tipp → Rechnung).
 * Jede Level-Anzeige öffnet den LEVEL-PFAD (js/upcrew-levelpfad.js,
 * `levelPfadOeffnen`).
 *
 * Die Statistik rechnet js\rangliste.js aus dem Tageswort-Verlauf des
 * Spielers (`typoluck/wordle/verlauf/<id>`); beim eigenen Profil zählen
 * Ergebnisse, die noch auf dem Gerät warten, schon mit. „gelöst" heisst
 * seit 0.26.0 „Tageswort gelöst" (siehe `_statistikFuellen`).
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

    /* Das Zahnrad → Einstellungen (als Blatt darüber). Seit 0.26.0 das
       echte Zahnrad des Bausteins (Nutzer: „das einstellungs symbol ist
       kein zahnrad"). */
    _zahnrad() {
        const beiKlick = () => NAVIGATION.zeigen("einstellungen", null);
        if (typeof UPCREW_EINSTELLUNGEN !== "undefined" && typeof UPCREW_EINSTELLUNGEN.zahnradKnopf === "function") {
            return UPCREW_EINSTELLUNGEN.zahnradKnopf(beiKlick, "Einstellungen", "up-bl-kopf-knopf");
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

        const statistik = BAUSTEINE.el("div", "profil-statistik");
        statistik.id = "profil-statistik";
        PROFIL_BILDSCHIRM._statistikFuellen(statistik, id, eigenes);

        if (PROFIL_BILDSCHIRM._mitBaustein()) {
            if (eigenes) {
                APP.abzeichenBuchen();
            }
            const ort = BAUSTEINE.el("div", "profil-blatt");
            const zusatz = [];
            if (!eigenes && ich && !SPIELER.istVerteiler(ich) && !SPIELER.istVerteiler(spieler)) {
                const abschnitt = UPCREW_PROFIL.abschnitt("Freundschaft");
                abschnitt.appendChild(PROFIL_BILDSCHIRM._freundschaftBauen(ich, spieler));
                zusatz.push(abschnitt);
            }
            UPCREW_PROFIL.zeichnen(ort, PROFIL_BILDSCHIRM.daten(spieler, eigenes), {
                eigen: eigenes,
                beiAbzeichen: eigenes ? () => PROFIL_BILDSCHIRM.abzeichenWahlOeffnen() : undefined,
                beiSerie: (eigenes && typeof START !== "undefined") ? () => START.serieOeffnen() : undefined,
                beiLevel: () => PROFIL_BILDSCHIRM.levelPfadOeffnen(spieler, eigenes),
                statistik: statistik,
                zusatz: zusatz
            });
            behaelter.appendChild(ort);
        } else {
            behaelter.appendChild(statistik);
        }

        if (PROFIL_BILDSCHIRM._verlauf === null && !PROFIL_BILDSCHIRM._fehler) {
            PROFIL_BILDSCHIRM._laden(id, eigenes);
        }
    },

    /* ---------------------------------------------------------------- *
     * Die Daten für den Baustein (seit 0.25.0; seit 0.26.0 auch fremd)
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

    /*
     * Die Zahlen der VORSCHAU-KARTE (Stufe 1) — eigen oder fremd:
     *   eigen  Level, Serie und Abzeichen aus dem eigenen Fortschritt
     *          (Gerät + Konto, alle Zweige);
     *   fremd  aus dem öffentlichen Auszug (§12): Level aus `xp`, Serie aus
     *          `serie`/`serieBis`, Abzeichen = die gemeinsamen fünf aus
     *          `werte`; gewählte Abzeichen eines Spiels (bl-/tl-) gelten als
     *          verdient, weil die Auswahl nur Verdientes annimmt (Nutzer
     *          29.09.2026: „überall gezeigt, auch bei Fremden") — wie
     *          Blunderluck, im Baustein `UPCREW_ABZEICHEN.fremdAusgeruestet`.
     * `alle` (alle Abzeichen) wird für das ausführliche Profil mitgegeben.
     */
    vorschauDaten(spieler, eigenes) {
        const heute = WORDLE.datumText(APP.jetzt());
        let stufe;
        let serie;
        let heuteDa;
        let alle;
        if (eigenes) {
            const stand = APP.fortschritt();
            const l = FORTSCHRITT.level(stand);
            stufe = { level: l.level, imLevel: l.hat, kosten: l.kosten };
            const s = FORTSCHRITT.serieHeute(stand, heute);
            serie = s.tage;
            heuteDa = s.heute === true;
            alle = PROFIL_BILDSCHIRM.alleAbzeichen();
        } else {
            const auszug = FORTSCHRITT.auszugVon(spieler, heute);
            stufe = FORTSCHRITT.auszugLevel(auszug);
            serie = FORTSCHRITT.auszugSerie(auszug, heute);
            heuteDa = serie > 0 && !!auszug && auszug.serieBis === FORTSCHRITT._datumZahl(heute);
            alle = UPCREW_ABZEICHEN.alle(FORTSCHRITT.auszugAlsStand(auszug), serie);
        }
        const gewaehlt = PROFIL_BILDSCHIRM._gewaehlt(spieler);
        return {
            name: spieler.name,
            tag: KONTO.tagZusatz(spieler),
            titel: FORTSCHRITT.titelVon(stufe.level) || "",
            level: stufe.level,
            imLevel: stufe.imLevel,
            kosten: stufe.kosten,
            anteil: stufe.kosten > 0 ? stufe.imLevel / stufe.kosten : 0,
            serie: serie,
            heute: heuteDa,
            abzeichen: eigenes
                ? UPCREW_ABZEICHEN.ausgeruestet(alle, gewaehlt, SPIELER.ABZEICHEN_PLAETZE)
                : UPCREW_ABZEICHEN.fremdAusgeruestet(alle, gewaehlt, SPIELER.ABZEICHEN_PLAETZE),
            plaetze: SPIELER.ABZEICHEN_PLAETZE,
            alle: alle
        };
    },

    /* Die Zahlen für das ausführliche Profil: die der Karte, dazu Spielzeit,
       „dabei seit" und „Wo du stehst" (nur eigen; fremd nur die
       veröffentlichte Spielzeit). Seit 0.26.2 ist `spielzeit.wert` NUR
       Typoluck; die anderen Spiele und die Summe zeigt der Tipp darauf. */
    daten(spieler, eigenes) {
        const daten = PROFIL_BILDSCHIRM.vorschauDaten(spieler, eigenes !== false);
        daten.spielzeit = null;
        daten.seit = "";
        daten.orte = [];
        if (eigenes === false) {
            const zeilen = typeof SPIELZEIT !== "undefined" ? PROFIL_BILDSCHIRM.spielzeitZeilen(spieler, false) : [];
            if (zeilen.length) {
                daten.spielzeit = { wert: zeilen[0].replace("Gesamt · ", ""), oeffentlich: true };
            }
            return daten;
        }
        daten.orte = PROFIL_BILDSCHIRM.orte(APP.fortschritt());
        if (typeof SPIELZEIT !== "undefined") {
            const zeit = SPIELZEIT.spielzeit();
            daten.spielzeit = {
                wert: FORTSCHRITT.spielzeitText(zeit.spiele.typoluck || 0),
                spiel: "Typoluck",
                andere: Object.keys(zeit.spiele).filter((app) => app !== "typoluck" && zeit.spiele[app] > 0).sort()
                    .map((app) => ({ spiel: PROFIL_BILDSCHIRM.SPIEL_NAMEN[app] || app,
                        wert: FORTSCHRITT.spielzeitText(zeit.spiele[app]) })),
                summe: FORTSCHRITT.spielzeitText(zeit.summe),
                oeffentlich: SPIELZEIT._eigener() && SPIELZEIT.oeffentlich()
            };
            daten.seit = zeit.seit ? SPIELZEIT.datumText(zeit.seit) : "";
        }
        return daten;
    },

    /* Der Level-Pfad (seit 0.26.0, Nutzer: „ich will auf level klicken
       können um den level pfad zu sehen") als Blatt darüber. */
    levelPfadOeffnen(spieler, eigenes) {
        if (typeof UPCREW_LEVELPFAD === "undefined") {
            return null;
        }
        const d = PROFIL_BILDSCHIRM.vorschauDaten(spieler, eigenes);
        return UPCREW_LEVELPFAD.oeffnen({ level: d.level, imLevel: d.imLevel, kosten: d.kosten });
    },

    /* Das ausführliche Profil eines Spielers (aus Rangliste und Freunden).
       Seit 0.26.1 DIREKT, ohne Vorschau-Karte dazwischen (Nutzer 29.09.2026:
       „das was hinter dem pfeil steht soll direkt kommen"). */
    profilOeffnen(id) {
        NAVIGATION.zeigen("profil", { id: id });
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

    /*
     * DIE STATISTIK (Abschnitt „Statistik" des Bausteins).
     *
     * „GELÖST 100 %" (Nutzer 29.09.2026: „gelöst 100% steht bei mir kann
     * aber garnicht sein"): Die Quote kommt aus RANGLISTE.statistik und
     * zählt NUR Tageswort-Tage mit gemeldetem Ergebnis — nicht Übung, nicht
     * Bibliothek und keinen Tag, an dem das Tageswort angefangen, aber nie
     * zu Ende gespielt wurde (dafür gibt es kein Ergebnis). Die Rechnung
     * stimmt also; falsch war die Beschriftung: „gelöst" stand bis 0.25.0
     * neben „Partien", die ALLE Runden zählen (auch Übung und Bibliothek),
     * und las sich wie „alle Partien gelöst". Eine Quote über alle Runden
     * lässt sich nicht nachrechnen (der Fortschritt zählt Partien, aber keine
     * gelösten), also steht seit 0.26.0 klar „Tageswort gelöst" mit „N/M
     * Tage" daneben, und die Tageswort-Zahlen stehen beieinander.
     */
    _statistikFuellen(karte, id, eigenes) {
        karte.textContent = "";
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

        const verlauf = PROFIL_BILDSCHIRM._verlaufVon(id, eigenes);
        const datum = WORDLE.datumText(APP.jetzt());
        const werte = RANGLISTE.statistik(verlauf, datum);

        const kachel = (zahl, text, unter) => {
            const feld = BAUSTEINE.el("div", "statistik-feld");
            feld.appendChild(BAUSTEINE.el("span", "statistik-zahl", String(zahl)));
            feld.appendChild(BAUSTEINE.el("span", "statistik-text", text));
            if (unter) {
                feld.appendChild(BAUSTEINE.el("span", "statistik-unter", unter));
            }
            return feld;
        };
        const tage = werte.geloest + "/" + werte.gespielt + " Tage";
        if (eigenes) {
            /* Sechs Kacheln: oben alle Runden (Partien, Können — aus dem
               Fortschritt, auch Übung und Bibliothek), darunter nur das
               Tageswort (gelöst, Ø Versuche, längste Serie). */
            const eigen = FORTSCHRITT.statistik(APP.fortschritt(), datum);
            const raster = BAUSTEINE.el("div", "statistik-raster statistik-raster-sechs");
            raster.appendChild(kachel(eigen.partien, "Partien"));
            raster.appendChild(kachel(eigen.koennen === null ? "—" : eigen.koennen + " %", "Ø Können"));
            raster.appendChild(kachel(eigen.bestesKoennen === null ? "—" : eigen.bestesKoennen + " %", "Bestes"));
            raster.appendChild(kachel(werte.quote + " %", "Tageswort gelöst", tage));
            raster.appendChild(kachel(werte.durchschnitt === null ? "—"
                : String(werte.durchschnitt).replace(".", ","), "Tageswort Ø"));
            raster.appendChild(kachel(eigen.besteSerie, "Längste Serie"));
            karte.appendChild(raster);
            const lieblinge = PROFIL_BILDSCHIRM.lieblingeBauen();
            if (lieblinge) {
                karte.appendChild(lieblinge);
            }
        } else {
            const raster = BAUSTEINE.el("div", "statistik-raster");
            raster.appendChild(kachel(werte.gespielt, "Tageswörter"));
            raster.appendChild(kachel(werte.quote + " %", "Tageswort gelöst", tage));
            raster.appendChild(kachel(werte.serie, "Serie"));
            raster.appendChild(kachel(werte.besteSerie, "beste Serie"));
            karte.appendChild(raster);
        }

        if (werte.gespielt === 0) {
            karte.appendChild(ZUSTAND.leer({
                zeichen: "wordle", text: "Noch kein Tageswort",
                aktion: eigenes ? { text: "Spielen", zeichen: "weiter",
                    beiKlick: () => NAVIGATION.zeigen("wordle", { modus: "tag" }) } : null
            }));
            return;
        }

        karte.appendChild(BAUSTEINE.el("h3", "unterkopf", "Tageswort · Versuche"));
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

    /* DIE LIEBLINGSWÖRTER (seit 0.28.0, js/lieblingswoerter.js): klein
       unter der eigenen Statistik, mit Schloss — nur man selbst sieht sie
       (fremde Profile bauen das nie). Keine = nichts. */
    lieblingeBauen() {
        const woerter = (typeof APP !== "undefined" && APP.lieblingswoerter) ? APP.lieblingswoerter() : [];
        if (!woerter.length) {
            return null;
        }
        const zeile = BAUSTEINE.el("div", "profil-lieblinge");
        zeile.setAttribute("title", "Nur für dich sichtbar");
        const kopf = BAUSTEINE.el("span", "profil-lieblinge-kopf");
        kopf.appendChild(BAUSTEINE.zeichen("schloss"));
        kopf.appendChild(BAUSTEINE.el("span", null, "Lieblingswörter"));
        zeile.appendChild(kopf);
        for (const wort of woerter) {
            zeile.appendChild(BAUSTEINE.el("span", "profil-liebling", wort.toUpperCase()));
        }
        return zeile;
    },

    _verlaufVon(id, eigenes) {
        return eigenes
            ? ERGEBNISSE.verlaufMitAusstehendem(PROFIL_BILDSCHIRM._verlauf || {}, id)
            : (PROFIL_BILDSCHIRM._verlauf || {});
    },

    /* Der VERLAUF (seit 0.26.2 ein eigenes Blatt über das Drei-Striche-Menü „Verlauf", Nutzer
       29.09.2026 spät: „Partien aus profil da der verlauf soll nur unter
       verlauf stehen"; bis 0.26.1 der Abschnitt „Partien" im Profil): die
       letzten Tageswörter, neueste zuerst — Datum, Versuche, Punkte. */
    VERLAUF_ZEILEN: 30,

    verlaufOeffnen() {
        const ich = ANMELDUNG.ich();
        if (!ich || typeof UPCREW_BLATT === "undefined") {
            NAVIGATION.zeigen("profil", null);
            return null;
        }
        if (PROFIL_BILDSCHIRM._fuerId !== ich.id || Date.now() - PROFIL_BILDSCHIRM._geladenAm > 30000) {
            PROFIL_BILDSCHIRM._verlauf = null;
            PROFIL_BILDSCHIRM._fehler = "";
            PROFIL_BILDSCHIRM._fuerId = ich.id;
        }
        const ort = BAUSTEINE.el("div", "profil-verlauf verlauf-blatt");
        const fuellen = () => {
            if (PROFIL_BILDSCHIRM._verlauf === null) {
                ort.textContent = "";
                ort.appendChild(ZUSTAND.laden({ zeilen: 3 }));
                return;
            }
            PROFIL_BILDSCHIRM._verlaufFuellen(ort, ich.id, true);
        };
        fuellen();
        const blatt = UPCREW_BLATT.oeffnen({ titel: "Verlauf", klasse: "blatt-verlauf", inhalt: ort });
        if (PROFIL_BILDSCHIRM._verlauf === null) {
            PROFIL_BILDSCHIRM._laden(ich.id, true).then(fuellen);
        }
        return blatt;
    },

    _verlaufFuellen(ort, id, eigenes) {
        ort.textContent = "";
        if (PROFIL_BILDSCHIRM._verlauf === null || PROFIL_BILDSCHIRM._fehler) {
            return;
        }
        const verlauf = PROFIL_BILDSCHIRM._verlaufVon(id, eigenes);
        const tage = Object.keys(verlauf).sort().reverse().slice(0, PROFIL_BILDSCHIRM.VERLAUF_ZEILEN);
        if (!tage.length) {
            ort.appendChild(BAUSTEINE.el("p", "profil-verlauf-leer", "—"));
            return;
        }
        const liste = BAUSTEINE.el("ol", "profil-verlauf-liste");
        for (const tag of tage) {
            const e = verlauf[tag];
            const zeile = BAUSTEINE.el("li", "profil-verlauf-zeile" + (e.geloest ? "" : " profil-verlauf-verloren"));
            zeile.appendChild(BAUSTEINE.el("span", "profil-verlauf-datum", tag.slice(8, 10) + "." + tag.slice(5, 7) + "."));
            zeile.appendChild(BAUSTEINE.el("span", "profil-verlauf-art", "Tageswort"));
            zeile.appendChild(BAUSTEINE.el("span", "profil-verlauf-versuche",
                (e.geloest ? e.versuche : "X") + "/" + WORDLE.VERSUCHE));
            zeile.appendChild(BAUSTEINE.el("strong", "profil-verlauf-punkte", String(RANGLISTE.punkte(e))));
            liste.appendChild(zeile);
        }
        ort.appendChild(liste);
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
