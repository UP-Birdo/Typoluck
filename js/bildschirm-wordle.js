/*
 * bildschirm-wordle.js — das Spiel am Bildschirm: Brett, Tastatur, Ende.
 *
 * Rechnet NICHTS selbst. Welche Farbe eine Kachel hat, ob ein Wort gilt, ob
 * die Runde vorbei ist — das sagt js\wordle.js. Dieser Bildschirm hält nur
 * die aktuelle Eingabe (die noch nicht abgeschickten Buchstaben) und zeigt an.
 *
 * Die Eingabe sind seit 0.3.0 fünf Felder mit einer Markierung
 * (`WORDLE.leereEingabe`): Die Felder der aktiven Zeile lassen sich
 * antippen, der nächste Buchstabe landet im markierten Feld. Wohin die
 * Markierung danach springt, rechnet das Modell (`WORDLE.eingabe…`).
 *
 * Zwei Arten zu spielen (Parameter `modus`):
 *   "tag"     Das Tageswort — für alle gleich, einmal am Tag, zählt für die
 *             Rangliste. Angefangene Versuche überleben das Schliessen der
 *             App (ICH.spielstand).
 *   "uebung"  Ein zufälliges Wort, beliebig oft, zählt für nichts.
 *   "bibliothek"  Ein Level der Bibliothek (seit 0.18.0, js/bibliothek.js):
 *             Parameter `buch` (ab 1) und `level` (ab 0); das Wort wird
 *             beim Start aus dem festen Bereich des Levels gezogen, eine
 *             angefangene Runde desselben Levels geht weiter. Figuren,
 *             XP und Münzen meldet APP.fortschrittMelden.
 *
 * DIE KACHEL UND DIE TASTE ENTSTEHEN JE AN EINER STELLE (`_kachelBauen`,
 * `_tasteBauen`). Das ist die Naht für die 3D-Fassung — siehe Kopf von
 * js\bausteine.js.
 */

const WORDLE_BILDSCHIRM = {

    /* Die Tastatur — deutsches Layout (QWERTZ) mit Umlauten. */
    TASTATUR: [
        ["q", "w", "e", "r", "t", "z", "u", "i", "o", "p", "ü"],
        ["a", "s", "d", "f", "g", "h", "j", "k", "l", "ö", "ä"],
        ["eingabe", "y", "x", "c", "v", "b", "n", "m", "loeschen"]
    ],

    /* Wie lange das Aufdecken EINER Kachel dauert und der Versatz zwischen
       zweien — müssen zu den Werten in css\stil-wordle.css passen. */
    AUFDECKEN_MS: 320,
    VERSATZ_MS: 160,

    runde: null,
    eingabe: null,
    _behaelter: null,
    _tastenHoerer: null,
    _sperre: false,

    anmelden() {
        NAVIGATION.anmelden({
            id: "wordle",
            titel: WORDLE.NAME,
            imMenue: false,
            zeigen: (behaelter, parameter) => WORDLE_BILDSCHIRM.zeigen(behaelter, parameter),
            verlassen: () => WORDLE_BILDSCHIRM.verlassen()
        });
    },

    /* ---------------------------------------------------------------- *
     * Auf- und Abbau
     * ---------------------------------------------------------------- */

    zeigen(behaelter, parameter) {
        /* UP#Plus verwaltet nur und spielt nicht (seit v0.2.0). */
        if (typeof ANMELDUNG !== "undefined" && ANMELDUNG.istOberAdmin && ANMELDUNG.istOberAdmin()) {
            behaelter.innerHTML = "";
            behaelter.appendChild(BAUSTEINE.kopfzeile(WORDLE.NAME, { zurueck: () => NAVIGATION.zurueck() }));
            behaelter.appendChild(ZUSTAND.leer({ zeichen: "zahnrad", text: "UP#Plus spielt nicht" }));
            return;
        }
        const modus = (parameter && ["uebung", "bibliothek"].indexOf(parameter.modus) !== -1)
            ? parameter.modus : "tag";
        WORDLE_BILDSCHIRM._behaelter = behaelter;
        WORDLE_BILDSCHIRM.eingabe = WORDLE.leereEingabe();
        WORDLE_BILDSCHIRM._sperre = false;

        const neueUebung = parameter && parameter.neu;
        WORDLE_BILDSCHIRM.runde = (modus === "bibliothek")
            ? WORDLE_BILDSCHIRM._bibliothekRunde(parameter, neueUebung)
            : WORDLE_BILDSCHIRM._rundeHolen(modus, neueUebung);

        /* Heute schon auf einem ANDEREN Gerät gespielt: Die Datenbank kennt
           das Ergebnis, dieses Gerät kennt die Runde nicht. Dann gibt es kein
           zweites Mal — nur das Ergebnis. */
        const woanders = APP.eigenesErgebnis(WORDLE_BILDSCHIRM.runde.datum);
        if (modus === "tag" && woanders && WORDLE_BILDSCHIRM.runde.versuche.length === 0) {
            WORDLE_BILDSCHIRM._schonGespieltZeigen(woanders);
            return;
        }

        WORDLE_BILDSCHIRM._zeichnen();

        if (!WORDLE_BILDSCHIRM._tastenHoerer) {
            WORDLE_BILDSCHIRM._tastenHoerer = (ereignis) => WORDLE_BILDSCHIRM._beiTaste(ereignis);
            document.addEventListener("keydown", WORDLE_BILDSCHIRM._tastenHoerer);
        }
    },

    verlassen() {
        /* Die Leiste kommt auf jedem anderen Bildschirm zurück (seit 0.15.3). */
        document.body.classList.remove("im-spiel");
        if (WORDLE_BILDSCHIRM._tastenHoerer) {
            document.removeEventListener("keydown", WORDLE_BILDSCHIRM._tastenHoerer);
            WORDLE_BILDSCHIRM._tastenHoerer = null;
        }
    },

    /*
     * Die Runde holen: angefangene fortsetzen oder neu beginnen.
     * Beim Tageswort gilt die gespeicherte Runde nur, wenn sie von HEUTE ist.
     */
    _rundeHolen(modus, neueUebung) {
        const heute = WORDLE.datumText(APP.jetzt());
        const schluessel = "wordle-" + modus;
        const gemerkt = WORDLE.normalisieren(ICH.spielstand(schluessel));
        const schwer = WORDLE_BILDSCHIRM.schwerGewaehlt();

        if (modus === "tag") {
            if (gemerkt && gemerkt.modus === "tag" && gemerkt.datum === heute) {
                return WORDLE_BILDSCHIRM._schwerVorDemErstenVersuch(gemerkt, schwer);
            }
            const tag = WORDLE.tageswort(heute);
            return WORDLE.neueRunde({
                modus: "tag", datum: heute, nummer: tag.nummer,
                loesung: tag.wort, zeitpunkt: APP.jetzt().getTime(), schwer: schwer
            });
        }

        if (gemerkt && gemerkt.modus === "uebung" && gemerkt.zustand === "laeuft" && !neueUebung) {
            return WORDLE_BILDSCHIRM._schwerVorDemErstenVersuch(gemerkt, schwer);
        }
        return WORDLE.neueRunde({
            modus: "uebung", loesung: WORDLE.uebungswort(Math.random()),
            zeitpunkt: APP.jetzt().getTime(), schwer: schwer
        });
    },

    /*
     * Eine Runde der Bibliothek (seit 0.18.0): Läuft eine angefangene Runde
     * GENAU dieses Levels, geht sie weiter (so lässt sich ein Wort nicht
     * durch Verlassen neu würfeln). Sonst ein neues Wort aus dem festen
     * Bereich — die zuletzt gespielten Wörter (Gerät, „bibliothek-zuletzt")
     * möglichst nicht. Zufall von hier, gezogen im Modell.
     */
    _bibliothekRunde(parameter, neu) {
        const buch = parseInt(parameter && parameter.buch, 10) || 1;
        const level = Math.max(0, parseInt(parameter && parameter.level, 10) || 0);
        const schwer = WORDLE_BILDSCHIRM.schwerGewaehlt();
        const gemerkt = WORDLE.normalisieren(ICH.spielstand("wordle-bibliothek"));
        if (!neu && gemerkt && gemerkt.modus === "bibliothek" && gemerkt.zustand === "laeuft"
                && gemerkt.buch === buch && gemerkt.level === level) {
            return WORDLE_BILDSCHIRM._schwerVorDemErstenVersuch(gemerkt, schwer);
        }
        const zuletzt = ICH.spielstand("bibliothek-zuletzt");
        const wort = BIBLIOTHEK.wortZiehen(buch, level, Math.random(), zuletzt)
            || WORDLE.uebungswort(Math.random());
        ICH.spielstandSetzen("bibliothek-zuletzt", BIBLIOTHEK.zuletztMerken(zuletzt, wort));
        const runde = WORDLE.neueRunde({
            modus: "bibliothek", buch: buch, level: level, loesung: wort,
            zeitpunkt: APP.jetzt().getTime(), schwer: schwer, grund: BIBLIOTHEK.versuche(buch, level)
        });
        ICH.spielstandSetzen("wordle-bibliothek", runde);
        return runde;
    },

    /*
     * Der Schwer-Modus (seit 0.6.0) ist eine Einstellung dieses Geräts; die
     * Runde merkt sich beim Anlegen, ob sie schwer ist (js\wordle.js). Eine
     * gemerkte Runde OHNE Versuch übernimmt noch die aktuelle Wahl — wer
     * das Tageswort geöffnet, aber nicht angefangen hat, soll umschalten
     * können. Ab dem ersten Versuch bleibt es, wie es war.
     */
    schwerGewaehlt() {
        return ICH.einstellung("schwer", false) === true;
    },

    schwerSetzen(wert) {
        ICH.einstellungSetzen("schwer", wert === true);
    },

    _schwerVorDemErstenVersuch(runde, schwer) {
        if (runde.versuche.length === 0 && runde.schwer !== schwer) {
            const neu = JSON.parse(JSON.stringify(runde));
            neu.schwer = schwer;
            return neu;
        }
        return runde;
    },

    _merken() {
        const runde = WORDLE_BILDSCHIRM.runde;
        ICH.spielstandSetzen("wordle-" + runde.modus, runde);
    },

    /* ---------------------------------------------------------------- *
     * Zeichnen
     * ---------------------------------------------------------------- */

    /* `tastaturBehalten` = auch bei beendeter Runde noch die Tastatur zeigen
       (solange die letzte Zeile aufgedeckt wird). */
    _zeichnen(tastaturBehalten) {
        const behaelter = WORDLE_BILDSCHIRM._behaelter;
        const runde = WORDLE_BILDSCHIRM.runde;
        behaelter.innerHTML = "";

        /* Während einer Runde ist die Leiste unten weg (seit 0.15.3, Nutzer
           27.09.2026: „während spielen bei beiden games soll das band unten
           verschwinden"; gleich in Blunderluck während einer Partie). Feld
           und Tastatur bekommen den Platz; hinaus geht es über den
           Zurück-Pfeil oben. Beim Ergebnis ist sie wieder da. */
        document.body.classList.toggle("im-spiel", runde.zustand === "laeuft" || !!tastaturBehalten);

        const titel = runde.modus === "tag" ? "Tageswort Nr. " + runde.nummer
            : (runde.modus === "bibliothek" ? BIBLIOTHEK.titel(runde.buch, runde.level) : "Übung");
        const kopf = BAUSTEINE.kopfzeile(titel, {
            zurueck: () => NAVIGATION.zurueck(),
            rechts: BAUSTEINE.knopf({
                art: "flach", zeichen: "info", titel: "So wird gespielt",
                beiKlick: () => WORDLE_BILDSCHIRM._anleitungZeigen()
            })
        });
        /* „schwer" klein unter dem Titel, solange die Runde im Schwer-Modus
           läuft (seit 0.6.0) — damit man weiss, warum ein Wort abgewiesen
           wird. Als eigene Zeile, weil „… · schwer" im Titel auf schmalen
           Handys umbrach. */
        if (runde.schwer) {
            kopf.querySelector(".kopfzeile-titel")
                .appendChild(BAUSTEINE.el("span", "kopfzeile-zusatz", "schwer"));
        }
        /* Der Boss eines Buchs (seit 0.18.0): rote Kopfzeile mit „BOSS". */
        if (runde.modus === "bibliothek" && BIBLIOTHEK.istBoss(runde.buch, runde.level)) {
            kopf.classList.add("kopfzeile-boss");
        }
        behaelter.appendChild(kopf);

        const spiel = BAUSTEINE.el("div", "wordle");
        spiel.appendChild(WORDLE_BILDSCHIRM._brettBauen());

        const tipps = WORDLE_BILDSCHIRM._tippsBauen();
        if (tipps) {
            spiel.appendChild(tipps);
        }
        if (runde.zustand === "laeuft" || tastaturBehalten) {
            spiel.appendChild(WORDLE_BILDSCHIRM._tastaturBauen());
        } else {
            spiel.appendChild(WORDLE_BILDSCHIRM._endeBauen());
        }
        behaelter.appendChild(spiel);
    },

    /*
     * DIE WAREN AUS DEM SHOP (seit 0.17.0, js/bildschirm-shop.js):
     *   Tipp  — ein Knopf über der Tastatur, nur mit Vorrat: deckt einen
     *           richtigen Buchstaben an seiner Stelle auf (die erste Stelle,
     *           die noch nie grün war) und schreibt ihn in die Eingabe.
     *   Extra-Leben — angeboten, wenn der 6. Versuch danebenging: ein 7.
     *           Versuch (`_beiRundenende`).
     * Mit einer Ware gibt das Tageswort höchstens einen Bauern
     * (js/fortschritt.js `partie`, angaben.hilfe), und die Rangliste zählt
     * einen 7. Versuch nicht als gelöst (js/ergebnisse.js).
     */
    _tippsBauen() {
        const runde = WORDLE_BILDSCHIRM.runde;
        const tipps = Array.isArray(runde.tipps) ? runde.tipps : [];
        const vorrat = (typeof APP !== "undefined" && APP.vorrat) ? APP.vorrat("tipp") : 0;
        const knopfDa = runde.zustand === "laeuft" && vorrat > 0 && WORDLE.tippStelle(runde) >= 0;
        if (!knopfDa && !tipps.length) {
            return null;
        }
        const leiste = BAUSTEINE.el("div", "wordle-tipps");
        for (const stelle of tipps) {
            leiste.appendChild(BAUSTEINE.el("span", "wordle-tipp-marke",
                "Feld " + (stelle + 1) + ": " + Array.from(runde.loesung)[stelle].toUpperCase()));
        }
        if (knopfDa) {
            const knopf = BAUSTEINE.knopf({ text: "Tipp · " + vorrat, art: "still", zeichen: "info",
                beiKlick: () => WORDLE_BILDSCHIRM._tippEinsetzen() });
            knopf.classList.add("wordle-tipp-knopf");
            leiste.appendChild(knopf);
        }
        return leiste;
    },

    async _tippEinsetzen() {
        const runde = WORDLE_BILDSCHIRM.runde;
        if (WORDLE_BILDSCHIRM._sperre || runde.zustand !== "laeuft") {
            return;
        }
        const ja = await DIALOG.frage("Tipp einsetzen?", "Deckt einen richtigen Buchstaben auf"
            + (runde.modus === "tag" ? " · Tageswort dann höchstens ein Bauer" : ""), "Einsetzen");
        if (!ja) {
            return;
        }
        const tipp = WORDLE.tippEinsetzen(WORDLE_BILDSCHIRM.runde);
        if (!tipp || !APP.benutzen("tipp")) {
            return;
        }
        WORDLE_BILDSCHIRM.runde = tipp.runde;
        const eingabe = JSON.parse(JSON.stringify(WORDLE_BILDSCHIRM.eingabe));
        eingabe.felder[tipp.stelle] = tipp.buchstabe;
        if (eingabe.stelle === tipp.stelle) {
            eingabe.stelle = WORDLE._naechstesLeeres(eingabe.felder, eingabe.stelle);
        }
        WORDLE_BILDSCHIRM.eingabe = eingabe;
        WORDLE_BILDSCHIRM._merken();
        WORDLE_BILDSCHIRM._zeichnen();
        DIALOG.kurzmeldung("Feld " + (tipp.stelle + 1) + ": " + tipp.buchstabe.toUpperCase(), 1800);
    },

    _brettBauen() {
        const runde = WORDLE_BILDSCHIRM.runde;
        const bewertungen = WORDLE.bewertungen(runde);
        const brett = BAUSTEINE.el("div", "wordle-brett");
        brett.setAttribute("role", "grid");
        brett.setAttribute("aria-label", "Spielbrett");

        for (let zeile = 0; zeile < WORDLE.versucheMax(runde); zeile++) {
            const reihe = BAUSTEINE.el("div", "wordle-zeile");
            reihe.setAttribute("role", "row");

            let buchstaben = [];
            let bewertung = null;
            const aktiv = zeile === runde.versuche.length && runde.zustand === "laeuft";
            if (zeile < runde.versuche.length) {
                buchstaben = Array.from(runde.versuche[zeile]);
                bewertung = bewertungen[zeile];
            } else if (aktiv) {
                buchstaben = WORDLE_BILDSCHIRM.eingabe.felder;
                reihe.classList.add("wordle-zeile-aktiv");
            }

            for (let stelle = 0; stelle < WORDLE.LAENGE; stelle++) {
                const kachel = WORDLE_BILDSCHIRM._kachelBauen(
                    buchstaben[stelle] || "", bewertung ? bewertung[stelle] : null);
                if (aktiv) {
                    WORDLE_BILDSCHIRM._kachelAntippbarMachen(kachel, stelle);
                }
                reihe.appendChild(kachel);
            }
            brett.appendChild(reihe);
            if (aktiv) {
                WORDLE_BILDSCHIRM._markierungZeigen(reihe);
            }
        }
        return brett;
    },

    /* EINE Kachel. `bewertung` = null (offen) oder richtig/vorhanden/falsch. */
    _kachelBauen(buchstabe, bewertung) {
        const kachel = BAUSTEINE.el("div", "kachel", buchstabe.toUpperCase());
        kachel.setAttribute("role", "gridcell");
        if (buchstabe) {
            kachel.classList.add("kachel-gefuellt");
        }
        if (bewertung) {
            kachel.classList.add("kachel-" + bewertung);
            kachel.setAttribute("aria-label", buchstabe.toUpperCase() + ", " + {
                richtig: "an der richtigen Stelle",
                vorhanden: "kommt vor, andere Stelle",
                falsch: "kommt nicht vor"
            }[bewertung]);
        }
        return kachel;
    },

    /* Eine Kachel der aktiven Zeile: antippen markiert sie. Kein Knopf,
       damit die Kachel an EINER Stelle entsteht (`_kachelBauen`) — nur
       Beschriftung und Tipp kommen hier dazu. Am Rechner verschieben die
       Pfeiltasten die Markierung (`_beiTaste`). */
    _kachelAntippbarMachen(kachel, stelle) {
        kachel.dataset.stelle = String(stelle);
        kachel.setAttribute("aria-label", "Feld " + (stelle + 1)
            + (kachel.textContent ? ", " + kachel.textContent : ", leer"));
        kachel.addEventListener("click", () => {
            if (WORDLE_BILDSCHIRM._sperre || WORDLE_BILDSCHIRM.runde.zustand !== "laeuft") {
                return;
            }
            WORDLE_BILDSCHIRM.eingabe = WORDLE.eingabeWaehlen(WORDLE_BILDSCHIRM.eingabe, stelle);
            WORDLE_BILDSCHIRM._aktiveZeileAuffrischen();
        });
    },

    /* Das markierte Feld hervorheben — und nur das. */
    _markierungZeigen(zeile) {
        const stelle = WORDLE_BILDSCHIRM.eingabe.stelle;
        Array.from(zeile.children).forEach((kachel, i) => {
            kachel.classList.toggle("kachel-markiert", i === stelle);
            if (i === stelle) {
                kachel.setAttribute("aria-current", "true");
            } else {
                kachel.removeAttribute("aria-current");
            }
        });
    },

    _tastaturBauen() {
        const zustand = WORDLE.tastenZustand(WORDLE_BILDSCHIRM.runde);
        const tastatur = BAUSTEINE.el("div", "tastatur");
        tastatur.setAttribute("aria-label", "Tastatur");

        for (const reihe of WORDLE_BILDSCHIRM.TASTATUR) {
            const zeile = BAUSTEINE.el("div", "tastatur-zeile");
            for (const taste of reihe) {
                zeile.appendChild(WORDLE_BILDSCHIRM._tasteBauen(taste, zustand[taste]));
            }
            tastatur.appendChild(zeile);
        }
        return tastatur;
    },

    /* EINE Taste. */
    _tasteBauen(taste, bewertung) {
        const knopf = document.createElement("button");
        knopf.type = "button";
        knopf.className = "taste";

        if (taste === "eingabe") {
            knopf.classList.add("taste-breit");
            knopf.textContent = "Prüfen";
        } else if (taste === "loeschen") {
            knopf.classList.add("taste-breit");
            knopf.appendChild(BAUSTEINE.zeichen("loeschen"));
            knopf.setAttribute("aria-label", "Buchstaben löschen");
        } else {
            knopf.textContent = taste.toUpperCase();
            if (bewertung) {
                knopf.classList.add("taste-" + bewertung);
            }
        }
        knopf.addEventListener("click", () => WORDLE_BILDSCHIRM._eingeben(taste));
        return knopf;
    },

    /*
     * Das Ende: Ergebnis als Zahl, Lösung, Punkte, wie es weitergeht.
     * Kein Lob-Wort (UPCrew-Standard, seit 0.4.0; bis 0.3.0 „Unglaublich!
     * Grossartig! …") — der Erfolg zeigt sich über das Hüpfen der Zeile und
     * die Vibration, die Zahl „3/6" sagt den Rest.
     */
    _endeBauen() {
        const runde = WORDLE_BILDSCHIRM.runde;
        const gewonnen = runde.zustand === "gewonnen";
        const karte = BAUSTEINE.karte(null, "wordle-ende");

        karte.appendChild(BAUSTEINE.el("p", "wordle-ende-titel",
            (gewonnen ? runde.versuche.length : "X") + "/" + WORDLE.versucheMax(runde)));
        const loesung = BAUSTEINE.el("p", "wordle-ende-loesung");
        loesung.appendChild(BAUSTEINE.el("span", "wordle-ende-wort-titel", "Lösung"));
        loesung.appendChild(BAUSTEINE.el("strong", null, runde.loesung.toUpperCase()));
        karte.appendChild(loesung);
        karte.appendChild(WORDLE_BILDSCHIRM._wertungBauen(runde));

        if (runde.modus === "tag") {
            const punkte = RANGLISTE.punkte(ERGEBNISSE.ausRunde(runde));
            karte.appendChild(BAUSTEINE.el("p", "wordle-ende-punkte",
                "+" + punkte + (punkte === 1 ? " Punkt" : " Punkte")));
            karte.appendChild(BAUSTEINE.knopf({
                text: "Rangliste", art: "haupt", breit: true, zeichen: "rangliste",
                beiKlick: () => NAVIGATION.zeigen("rangliste", null, true)
            }));
            karte.appendChild(BAUSTEINE.knopf({
                text: "Übungsrunde", art: "still", breit: true, zeichen: "uebung",
                beiKlick: () => NAVIGATION.zeigen("wordle", { modus: "uebung", neu: true }, true)
            }));
            karte.appendChild(BAUSTEINE.el("p", "wordle-ende-naechstes", "Nächstes Wort: 0 Uhr"));
        } else if (runde.modus === "bibliothek") {
            WORDLE_BILDSCHIRM._bibliothekEndeBauen(karte, runde, gewonnen);
        } else {
            karte.appendChild(BAUSTEINE.knopf({
                text: "Neues Übungswort", art: "haupt", breit: true, zeichen: "uebung",
                beiKlick: () => NAVIGATION.zeigen("wordle", { modus: "uebung", neu: true }, true)
            }));
        }
        return karte;
    },

    /* Das Ende eines Bibliothek-Levels (seit 0.18.0): gelöst → „Weiter"
       zum nächsten offenen Level; nicht gelöst → „Nochmal" mit einem neuen
       Wort aus demselben Bereich. Darunter immer zurück zur Bibliothek. */
    _bibliothekEndeBauen(karte, runde, gewonnen) {
        const figuren = FORTSCHRITT.turmFiguren(APP.fortschritt());
        const weiter = gewonnen ? BIBLIOTHEK.danach(figuren, runde.buch, runde.level) : null;
        if (weiter) {
            karte.appendChild(BAUSTEINE.knopf({
                text: BIBLIOTHEK.istBoss(weiter.buch, weiter.level) ? "Weiter · Boss"
                    : (weiter.buch !== runde.buch ? "Weiter · Buch " + weiter.buch : "Weiter"),
                art: "haupt", breit: true, zeichen: "weiter",
                beiKlick: () => NAVIGATION.zeigen("wordle",
                    { modus: "bibliothek", buch: weiter.buch, level: weiter.level, neu: true }, true)
            }));
        } else {
            karte.appendChild(BAUSTEINE.knopf({
                text: "Nochmal", art: "haupt", breit: true, zeichen: "uebung",
                beiKlick: () => NAVIGATION.zeigen("wordle",
                    { modus: "bibliothek", buch: runde.buch, level: runde.level, neu: true }, true)
            }));
        }
        karte.appendChild(BAUSTEINE.knopf({
            text: BIBLIOTHEK.NAME, art: "still", breit: true, zeichen: "bibliothek",
            beiKlick: () => NAVIGATION.zeigen("start", null, true)
        }));
    },

    /* Was die gerade beendete Runde an XP brachte (seit 0.10.0) — gesetzt
       in _beiRundenende, gilt nur für genau diese Runde. */
    _gewinn: null,

    /*
     * Die Wertung (seit 0.10.0, UPCrew-Runde 5; js\wertung.js): Figuren,
     * Genauigkeit und Glück getrennt, je Versuch das Können und wie viele
     * Wörter danach noch möglich waren. In der Übung ohne Figuren — die
     * gibt es nur für die Tagesaufgabe. Gerechnet wird im Modell, hier nur
     * gezeigt.
     */
    _wertungBauen(runde) {
        const wertung = WERTUNG.runde(runde);
        const teil = BAUSTEINE.el("div", "wertung");
        if (!wertung) {
            return teil;
        }
        const kopf = BAUSTEINE.el("div", "wertung-kopf");
        if (runde.modus === "tag") {
            kopf.appendChild(BAUSTEINE.figuren(wertung.figuren));
        } else if (runde.modus === "bibliothek") {
            /* Wie der Fortschritt zählt: mit Hilfe aus dem Shop höchstens 1. */
            kopf.appendChild(BAUSTEINE.figuren(BIBLIOTHEK.figurenFuer(runde.zustand === "gewonnen",
                wertung.figuren, WORDLE.hilfeGenutzt(runde))));
        }
        const zahlen = BAUSTEINE.el("div", "wertung-zahlen");
        zahlen.appendChild(WORDLE_BILDSCHIRM._wertungZahl(wertung.genauigkeit + " %", "Können"));
        zahlen.appendChild(WORDLE_BILDSCHIRM._wertungZahl(wertung.glueck + " %", "Glück"));
        const gewinn = WORDLE_BILDSCHIRM._gewinn;
        if (gewinn && gewinn.loesung === runde.loesung && gewinn.begonnenAm === runde.begonnenAm) {
            zahlen.appendChild(WORDLE_BILDSCHIRM._wertungZahl("+" + gewinn.xp, "XP"));
            if (gewinn.muenzen > 0 && typeof UPCREW_MUENZEN !== "undefined") {
                zahlen.appendChild(WORDLE_BILDSCHIRM._wertungZahl("+" + gewinn.muenzen, UPCREW_MUENZEN.WAEHRUNG.name));
            }
        }
        kopf.appendChild(zahlen);
        teil.appendChild(kopf);

        const liste = BAUSTEINE.el("ol", "wertung-versuche");
        for (const versuch of wertung.versuche) {
            const zeile = BAUSTEINE.el("li", "wertung-versuch");
            zeile.appendChild(BAUSTEINE.el("span", "wertung-wort", versuch.wort.toUpperCase()));
            /* „—" = die Lösung stand schon fest, der Versuch zählt nicht. */
            zeile.appendChild(BAUSTEINE.el("span", "wertung-koennen",
                versuch.gewertet ? versuch.koennen + " %" : "—"));
            zeile.appendChild(BAUSTEINE.el("span", "wertung-uebrig", versuch.vorher + " → " + versuch.nachher));
            liste.appendChild(zeile);
        }
        teil.appendChild(liste);
        return teil;
    },

    _wertungZahl(wert, name) {
        const feld = BAUSTEINE.el("span", "wertung-zahl");
        feld.appendChild(BAUSTEINE.el("strong", null, wert));
        feld.appendChild(BAUSTEINE.el("span", null, name));
        return feld;
    },

    _schonGespieltZeigen(ergebnis) {
        const behaelter = WORDLE_BILDSCHIRM._behaelter;
        behaelter.innerHTML = "";
        behaelter.appendChild(BAUSTEINE.kopfzeile("Tageswort Nr. " + WORDLE_BILDSCHIRM.runde.nummer,
            { zurueck: () => NAVIGATION.zurueck() }));

        const karte = BAUSTEINE.karte(null, "wordle-ende");
        karte.appendChild(BAUSTEINE.el("p", "wordle-ende-titel",
            (ergebnis.geloest ? ergebnis.versuche : "X") + "/" + WORDLE.VERSUCHE));
        karte.appendChild(BAUSTEINE.el("p", "wordle-ende-naechstes", "Gespielt · anderes Gerät"));
        karte.appendChild(WORDLE_BILDSCHIRM.musterBauen(ergebnis.muster));
        karte.appendChild(BAUSTEINE.knopf({
            text: "Rangliste", art: "haupt", breit: true, zeichen: "rangliste",
            beiKlick: () => NAVIGATION.zeigen("rangliste", null, true)
        }));
        karte.appendChild(BAUSTEINE.knopf({
            text: "Übungsrunde", art: "still", breit: true, zeichen: "uebung",
            beiKlick: () => NAVIGATION.zeigen("wordle", { modus: "uebung", neu: true }, true)
        }));
        behaelter.appendChild(karte);
    },

    /* Ein Muster (["RVFFF", …]) als kleines Farbraster ohne Buchstaben —
       auch für die Rangliste. */
    musterBauen(muster) {
        const raster = BAUSTEINE.el("div", "muster");
        raster.setAttribute("aria-hidden", "true");
        const klasse = { R: "richtig", V: "vorhanden", F: "falsch" };
        for (const zeile of muster || []) {
            const reihe = BAUSTEINE.el("div", "muster-zeile");
            for (const zeichen of zeile) {
                reihe.appendChild(BAUSTEINE.el("span", "muster-feld muster-" + klasse[zeichen]));
            }
            raster.appendChild(reihe);
        }
        return raster;
    },

    /*
     * Die Spielregel als BILD statt als Absatz (UPCrew-Standard, seit
     * 0.4.0): drei Kacheln mit je einem Wort, darunter die Stichworte und
     * die Punkte-Tafel. Die Kacheln entstehen wie auf dem Brett
     * (`_kachelBauen`), damit Regel und Spiel gleich aussehen.
     */
    _anleitungZeigen() {
        const inhalt = BAUSTEINE.el("div", "anleitung");
        inhalt.appendChild(BAUSTEINE.el("p", "anleitung-kopf",
            WORDLE.LAENGE + " Buchstaben · " + WORDLE.VERSUCHE + " Versuche"));

        const farben = BAUSTEINE.el("div", "anleitung-farben");
        for (const [buchstabe, bewertung, wort] of [
            ["a", WORDLE.RICHTIG, "richtig"],
            ["b", WORDLE.VORHANDEN, "woanders"],
            ["c", WORDLE.FALSCH, "fehlt"]
        ]) {
            const spalte = BAUSTEINE.el("div", "anleitung-farbe");
            spalte.appendChild(WORDLE_BILDSCHIRM._kachelBauen(buchstabe, bewertung));
            spalte.appendChild(BAUSTEINE.el("span", "anleitung-wort", wort));
            farben.appendChild(spalte);
        }
        inhalt.appendChild(farben);
        inhalt.appendChild(BAUSTEINE.el("p", "anleitung-kopf", "Ä Ö Ü eigene Buchstaben · ß = SS"));
        inhalt.appendChild(RANGLISTE_BILDSCHIRM.punkteTafelBauen());
        DIALOG.hinweis("So geht's", "", inhalt);
    },

    /* ---------------------------------------------------------------- *
     * Eingabe
     * ---------------------------------------------------------------- */

    _beiTaste(ereignis) {
        if (NAVIGATION.aktuell !== "wordle" || document.body.classList.contains("dialog-offen")
                || ereignis.ctrlKey || ereignis.metaKey || ereignis.altKey) {
            return;
        }
        const taste = ereignis.key;
        if (taste === "Enter") {
            ereignis.preventDefault();
            WORDLE_BILDSCHIRM._eingeben("eingabe");
        } else if (taste === "Backspace") {
            ereignis.preventDefault();
            WORDLE_BILDSCHIRM._eingeben("loeschen");
        } else if (taste === "ArrowLeft" || taste === "ArrowRight") {
            /* Am Rechner: die Markierung mit den Pfeiltasten verschieben —
               dasselbe wie ein Feld antippen. */
            ereignis.preventDefault();
            if (!WORDLE_BILDSCHIRM._sperre && WORDLE_BILDSCHIRM.runde.zustand === "laeuft") {
                WORDLE_BILDSCHIRM.eingabe = WORDLE.eingabeSchieben(WORDLE_BILDSCHIRM.eingabe,
                    taste === "ArrowLeft" ? -1 : 1);
                WORDLE_BILDSCHIRM._aktiveZeileAuffrischen();
            }
        } else if (taste.length === 1 && WORDLE.BUCHSTABEN.indexOf(taste.toLowerCase()) !== -1) {
            WORDLE_BILDSCHIRM._eingeben(taste.toLowerCase());
        }
    },

    _eingeben(taste) {
        const runde = WORDLE_BILDSCHIRM.runde;
        if (WORDLE_BILDSCHIRM._sperre || runde.zustand !== "laeuft") {
            return;
        }

        if (taste === "loeschen") {
            WORDLE_BILDSCHIRM.eingabe = WORDLE.eingabeLoeschen(WORDLE_BILDSCHIRM.eingabe);
            WORDLE_BILDSCHIRM._aktiveZeileAuffrischen();
            return;
        }
        if (taste === "eingabe") {
            WORDLE_BILDSCHIRM._abschicken();
            return;
        }
        const vorher = WORDLE_BILDSCHIRM.eingabe;
        WORDLE_BILDSCHIRM.eingabe = WORDLE.eingabeTippen(vorher, taste);
        if (vorher.stelle < WORDLE.LAENGE) {
            WORDLE_BILDSCHIRM._aktiveZeileAuffrischen(vorher.stelle);
        }
    },

    /* Nur die Zeile, in die gerade getippt wird — kein ganzes Neuzeichnen
       je Buchstabe (das liesse die Tastatur flackern). `getipptAn` = das
       Feld, das eben einen Buchstaben bekam (es springt kurz auf). */
    _aktiveZeileAuffrischen(getipptAn) {
        const zeile = WORDLE_BILDSCHIRM._behaelter.querySelector(".wordle-zeile-aktiv");
        if (!zeile) {
            return;
        }
        const felder = WORDLE_BILDSCHIRM.eingabe.felder;
        Array.from(zeile.children).forEach((kachel, i) => {
            const buchstabe = felder[i] || "";
            kachel.textContent = buchstabe.toUpperCase();
            kachel.classList.toggle("kachel-gefuellt", buchstabe !== "");
            kachel.classList.remove("kachel-tipp");
            kachel.setAttribute("aria-label", "Feld " + (i + 1)
                + (buchstabe ? ", " + buchstabe.toUpperCase() : ", leer"));
        });
        WORDLE_BILDSCHIRM._markierungZeigen(zeile);
        if (Number.isInteger(getipptAn) && zeile.children[getipptAn]) {
            const kachel = zeile.children[getipptAn];
            void kachel.offsetWidth;
            kachel.classList.add("kachel-tipp");
        }
    },

    _abschicken() {
        const antwort = WORDLE.raten(WORDLE_BILDSCHIRM.runde,
            WORDLE.eingabeWort(WORDLE_BILDSCHIRM.eingabe), APP.jetzt().getTime());

        if (antwort.fehler) {
            DIALOG.kurzmeldung(antwort.hinweis || WORDLE.fehlerText(antwort.fehler), 1500);
            const zeile = WORDLE_BILDSCHIRM._behaelter.querySelector(".wordle-zeile-aktiv");
            if (zeile) {
                zeile.classList.remove("wordle-zeile-wackeln");
                void zeile.offsetWidth;
                zeile.classList.add("wordle-zeile-wackeln");
            }
            return;
        }

        const zeilenNummer = WORDLE_BILDSCHIRM.runde.versuche.length;
        WORDLE_BILDSCHIRM.runde = antwort.runde;
        WORDLE_BILDSCHIRM.eingabe = WORDLE.leereEingabe();
        WORDLE_BILDSCHIRM._merken();
        /* Serie ab Rundenstart (seit 0.17.0): heute ein Versuch abgegeben
           = heute gespielt (js/app.js `rundeGestartet`, einmal je Tag). */
        if (typeof APP !== "undefined" && APP.rundeGestartet) {
            APP.rundeGestartet();
        }

        /* Aufdecken: Das Brett wird mit der neuen Zeile gezeichnet, die Kacheln
           dieser Zeile drehen sich nacheinander um. Solange das läuft, nimmt
           die Tastatur nichts an. */
        WORDLE_BILDSCHIRM._sperre = true;
        WORDLE_BILDSCHIRM._zeichnenMitAufdecken(zeilenNummer);

        const dauer = WORDLE_BILDSCHIRM.AUFDECKEN_MS + WORDLE_BILDSCHIRM.VERSATZ_MS * (WORDLE.LAENGE - 1);
        setTimeout(() => {
            WORDLE_BILDSCHIRM._sperre = false;
            if (WORDLE_BILDSCHIRM.runde.zustand !== "laeuft") {
                WORDLE_BILDSCHIRM._beiRundenende();
            }
        }, dauer + 60);
    },

    _zeichnenMitAufdecken(zeilenNummer) {
        /* Während des Aufdeckens bleibt die Tastatur stehen — das Ende-Feld
           kommt erst, wenn alle Kacheln umgedreht sind (_beiRundenende). */
        WORDLE_BILDSCHIRM._zeichnen(true);

        const zeile = WORDLE_BILDSCHIRM._behaelter.querySelectorAll(".wordle-zeile")[zeilenNummer];
        if (!zeile) {
            return;
        }
        /* Die Farbe kommt erst in der MITTE der Klapp-Bewegung dazu — vorher
           sieht man die Kachel noch neutral zuklappen. (Rein über CSS geht
           das nicht: Eine Animation kann nicht „zur Farbe der Klasse"
           springen, sie würde hineinblenden.) */
        const reduziert = window.matchMedia
            && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        Array.from(zeile.children).forEach((kachel, i) => {
            const farbe = (kachel.className.match(/kachel-(richtig|vorhanden|falsch)/) || [])[0];
            if (!farbe || reduziert) {
                return;
            }
            kachel.classList.remove(farbe);
            kachel.classList.add("kachel-aufdecken");
            kachel.style.animationDelay = (i * WORDLE_BILDSCHIRM.VERSATZ_MS) + "ms";
            setTimeout(() => kachel.classList.add(farbe),
                i * WORDLE_BILDSCHIRM.VERSATZ_MS + WORDLE_BILDSCHIRM.AUFDECKEN_MS / 2);
        });
    },

    async _beiRundenende() {
        /* Extra-Leben (seit 0.17.0): Der 6. Versuch ging daneben, und es
           ist eins im Vorrat — dann erst fragen, bevor gewertet wird. */
        if (WORDLE.lebenMoeglich(WORDLE_BILDSCHIRM.runde) && APP.vorrat("leben") > 0) {
            WORDLE_BILDSCHIRM._sperre = true;
            const ja = await DIALOG.frage("Extra-Leben einsetzen?", "Ein "
                + (WORDLE.versucheGrund(WORDLE_BILDSCHIRM.runde) + 1) + ". Versuch · Vorrat "
                + APP.vorrat("leben") + (WORDLE_BILDSCHIRM.runde.modus === "tag"
                    ? " · Tageswort dann höchstens ein Bauer, Rangliste wie X/6" : ""), "Einsetzen");
            WORDLE_BILDSCHIRM._sperre = false;
            const neu = ja ? WORDLE.lebenEinsetzen(WORDLE_BILDSCHIRM.runde) : null;
            if (neu && APP.benutzen("leben")) {
                WORDLE_BILDSCHIRM.runde = neu;
                WORDLE_BILDSCHIRM._merken();
                WORDLE_BILDSCHIRM._zeichnen();
                return;
            }
        }
        const runde = WORDLE_BILDSCHIRM.runde;
        /* Seit 0.10.0: Wertung, XP, Heute — genau hier, einmal je Runde. Was
           dabei herauskam, zeigt das Ende-Feld (nur für DIESE Runde). */
        const gemeldet = APP.fortschrittMelden(runde);
        WORDLE_BILDSCHIRM._gewinn = gemeldet
            ? { loesung: runde.loesung, begonnenAm: runde.begonnenAm, xp: gemeldet.ergebnis.xp,
                muenzen: gemeldet.ergebnis.muenzen || 0 }
            : null;
        WORDLE_BILDSCHIRM._zeichnen();

        /* Bis 0.8.0 vibrierte hier Erfolg oder Fehler (FUEHLEN). Seit 0.8.1
           ist die Vibration überall raus (Nutzer 26.09.2026: „kommt erst
           wann anders"). */
        if (runde.zustand === "gewonnen") {
            const zeilen = WORDLE_BILDSCHIRM._behaelter.querySelectorAll(".wordle-zeile");
            const zeile = zeilen[runde.versuche.length - 1];
            if (zeile) {
                Array.from(zeile.children).forEach((kachel, i) => {
                    kachel.classList.add("kachel-jubel");
                    kachel.style.animationDelay = (i * 90) + "ms";
                });
            }
        }

        if (runde.modus === "tag") {
            APP.ergebnisMelden(runde);
        }
    }
};
