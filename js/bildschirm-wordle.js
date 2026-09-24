/*
 * bildschirm-wordle.js — das Spiel am Bildschirm: Brett, Tastatur, Ende.
 *
 * Rechnet NICHTS selbst. Welche Farbe eine Kachel hat, ob ein Wort gilt, ob
 * die Runde vorbei ist — das sagt js\wordle.js. Dieser Bildschirm hält nur
 * die aktuelle Eingabe (die noch nicht abgeschickten Buchstaben) und zeigt an.
 *
 * Zwei Arten zu spielen (Parameter `modus`):
 *   "tag"     Das Tageswort — für alle gleich, einmal am Tag, zählt für die
 *             Rangliste. Angefangene Versuche überleben das Schliessen der
 *             App (ICH.spielstand).
 *   "uebung"  Ein zufälliges Wort, beliebig oft, zählt für nichts.
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
    eingabe: "",
    _behaelter: null,
    _tastenHoerer: null,
    _sperre: false,

    anmelden() {
        NAVIGATION.anmelden({
            id: "wordle",
            titel: "Wordle",
            gehoertZu: "start",
            inLeiste: false,
            zeigen: (behaelter, parameter) => WORDLE_BILDSCHIRM.zeigen(behaelter, parameter),
            verlassen: () => WORDLE_BILDSCHIRM.verlassen()
        });
    },

    /* ---------------------------------------------------------------- *
     * Auf- und Abbau
     * ---------------------------------------------------------------- */

    zeigen(behaelter, parameter) {
        const modus = (parameter && parameter.modus === "uebung") ? "uebung" : "tag";
        WORDLE_BILDSCHIRM._behaelter = behaelter;
        WORDLE_BILDSCHIRM.eingabe = "";
        WORDLE_BILDSCHIRM._sperre = false;

        const neueUebung = parameter && parameter.neu;
        WORDLE_BILDSCHIRM.runde = WORDLE_BILDSCHIRM._rundeHolen(modus, neueUebung);

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

        if (modus === "tag") {
            if (gemerkt && gemerkt.modus === "tag" && gemerkt.datum === heute) {
                return gemerkt;
            }
            const tag = WORDLE.tageswort(heute);
            return WORDLE.neueRunde({
                modus: "tag", datum: heute, nummer: tag.nummer,
                loesung: tag.wort, zeitpunkt: APP.jetzt().getTime()
            });
        }

        if (gemerkt && gemerkt.modus === "uebung" && gemerkt.zustand === "laeuft" && !neueUebung) {
            return gemerkt;
        }
        return WORDLE.neueRunde({
            modus: "uebung", loesung: WORDLE.uebungswort(Math.random()),
            zeitpunkt: APP.jetzt().getTime()
        });
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

        const titel = runde.modus === "tag" ? "Tageswort Nr. " + runde.nummer : "Übung";
        behaelter.appendChild(BAUSTEINE.kopfzeile(titel, {
            zurueck: () => NAVIGATION.zurueck(),
            rechts: BAUSTEINE.knopf({
                art: "flach", zeichen: "info", titel: "So wird gespielt",
                beiKlick: () => WORDLE_BILDSCHIRM._anleitungZeigen()
            })
        }));

        const spiel = BAUSTEINE.el("div", "wordle");
        spiel.appendChild(WORDLE_BILDSCHIRM._brettBauen());

        if (runde.zustand === "laeuft" || tastaturBehalten) {
            spiel.appendChild(WORDLE_BILDSCHIRM._tastaturBauen());
        } else {
            spiel.appendChild(WORDLE_BILDSCHIRM._endeBauen());
        }
        behaelter.appendChild(spiel);
    },

    _brettBauen() {
        const runde = WORDLE_BILDSCHIRM.runde;
        const bewertungen = WORDLE.bewertungen(runde);
        const brett = BAUSTEINE.el("div", "wordle-brett");
        brett.setAttribute("role", "grid");
        brett.setAttribute("aria-label", "Spielbrett");

        for (let zeile = 0; zeile < WORDLE.VERSUCHE; zeile++) {
            const reihe = BAUSTEINE.el("div", "wordle-zeile");
            reihe.setAttribute("role", "row");

            let buchstaben = [];
            let bewertung = null;
            if (zeile < runde.versuche.length) {
                buchstaben = Array.from(runde.versuche[zeile]);
                bewertung = bewertungen[zeile];
            } else if (zeile === runde.versuche.length && runde.zustand === "laeuft") {
                buchstaben = Array.from(WORDLE_BILDSCHIRM.eingabe);
                reihe.classList.add("wordle-zeile-aktiv");
            }

            for (let stelle = 0; stelle < WORDLE.LAENGE; stelle++) {
                reihe.appendChild(WORDLE_BILDSCHIRM._kachelBauen(
                    buchstaben[stelle] || "", bewertung ? bewertung[stelle] : null));
            }
            brett.appendChild(reihe);
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

    /* Das Ende: Lösung, Punkte, wie es weitergeht. */
    _endeBauen() {
        const runde = WORDLE_BILDSCHIRM.runde;
        const gewonnen = runde.zustand === "gewonnen";
        const karte = BAUSTEINE.karte(null, "wordle-ende");

        karte.appendChild(BAUSTEINE.el("p", "wordle-ende-titel", gewonnen
            ? WORDLE_BILDSCHIRM._lob(runde.versuche.length)
            : "Diesmal nicht."));
        const loesung = BAUSTEINE.el("p", "wordle-ende-loesung");
        loesung.appendChild(document.createTextNode("Das Wort war "));
        loesung.appendChild(BAUSTEINE.el("strong", null, runde.loesung.toUpperCase()));
        karte.appendChild(loesung);

        if (runde.modus === "tag") {
            const punkte = RANGLISTE.punkte(ERGEBNISSE.ausRunde(runde));
            karte.appendChild(BAUSTEINE.erklaerung(punkte === 1 ? "1 Punkt für die Rangliste."
                : punkte + " Punkte für die Rangliste."));
            karte.appendChild(BAUSTEINE.knopf({
                text: "Zur Rangliste", art: "haupt", breit: true, zeichen: "rangliste",
                beiKlick: () => NAVIGATION.zeigen("rangliste", null, true)
            }));
            karte.appendChild(BAUSTEINE.knopf({
                text: "Übungsrunde", art: "still", breit: true, zeichen: "uebung",
                beiKlick: () => NAVIGATION.zeigen("wordle", { modus: "uebung", neu: true }, true)
            }));
            karte.appendChild(BAUSTEINE.erklaerung("Das nächste Tageswort kommt um Mitternacht."));
        } else {
            karte.appendChild(BAUSTEINE.knopf({
                text: "Neues Übungswort", art: "haupt", breit: true, zeichen: "uebung",
                beiKlick: () => NAVIGATION.zeigen("wordle", { modus: "uebung", neu: true }, true)
            }));
        }
        return karte;
    },

    _schonGespieltZeigen(ergebnis) {
        const behaelter = WORDLE_BILDSCHIRM._behaelter;
        behaelter.innerHTML = "";
        behaelter.appendChild(BAUSTEINE.kopfzeile("Tageswort Nr. " + WORDLE_BILDSCHIRM.runde.nummer,
            { zurueck: () => NAVIGATION.zurueck() }));

        const karte = BAUSTEINE.karte(null, "wordle-ende");
        karte.appendChild(BAUSTEINE.el("p", "wordle-ende-titel", "Heute schon gespielt"));
        karte.appendChild(BAUSTEINE.erklaerung(ergebnis.geloest
            ? "Gelöst im " + ergebnis.versuche + ". Versuch — auf einem anderen Gerät."
            : "Nicht gelöst — auf einem anderen Gerät."));
        karte.appendChild(WORDLE_BILDSCHIRM.musterBauen(ergebnis.muster));
        karte.appendChild(BAUSTEINE.knopf({
            text: "Zur Rangliste", art: "haupt", breit: true, zeichen: "rangliste",
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

    _lob(versuche) {
        return ["Unglaublich!", "Grossartig!", "Stark!", "Gut gemacht!", "Geschafft!", "Knapp!"][versuche - 1]
            || "Geschafft!";
    },

    _anleitungZeigen() {
        DIALOG.hinweis("So wird gespielt",
            "Errate das Wort mit fünf Buchstaben in sechs Versuchen. Nach jedem "
                + "Versuch zeigen die Farben: Grün = richtiger Buchstabe an der "
                + "richtigen Stelle. Gelb = kommt vor, aber woanders. Grau = kommt "
                + "nicht vor. Umlaute sind eigene Buchstaben, ß wird als SS geschrieben. "
                + RANGLISTE.ERKLAERUNG);
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
            WORDLE_BILDSCHIRM.eingabe = Array.from(WORDLE_BILDSCHIRM.eingabe).slice(0, -1).join("");
            WORDLE_BILDSCHIRM._aktiveZeileAuffrischen();
            return;
        }
        if (taste === "eingabe") {
            WORDLE_BILDSCHIRM._abschicken();
            return;
        }
        if (Array.from(WORDLE_BILDSCHIRM.eingabe).length < WORDLE.LAENGE) {
            WORDLE_BILDSCHIRM.eingabe += taste;
            WORDLE_BILDSCHIRM._aktiveZeileAuffrischen(true);
        }
    },

    /* Nur die Zeile, in die gerade getippt wird — kein ganzes Neuzeichnen
       je Buchstabe (das liesse die Tastatur flackern). */
    _aktiveZeileAuffrischen(neuerBuchstabe) {
        const zeile = WORDLE_BILDSCHIRM._behaelter.querySelector(".wordle-zeile-aktiv");
        if (!zeile) {
            return;
        }
        const buchstaben = Array.from(WORDLE_BILDSCHIRM.eingabe);
        Array.from(zeile.children).forEach((kachel, i) => {
            const buchstabe = buchstaben[i] || "";
            kachel.textContent = buchstabe.toUpperCase();
            kachel.classList.toggle("kachel-gefuellt", buchstabe !== "");
            kachel.classList.remove("kachel-tipp");
        });
        if (neuerBuchstabe && buchstaben.length > 0) {
            const kachel = zeile.children[buchstaben.length - 1];
            void kachel.offsetWidth;
            kachel.classList.add("kachel-tipp");
        }
    },

    _abschicken() {
        const antwort = WORDLE.raten(WORDLE_BILDSCHIRM.runde, WORDLE_BILDSCHIRM.eingabe,
            APP.jetzt().getTime());

        if (antwort.fehler) {
            DIALOG.kurzmeldung(WORDLE.fehlerText(antwort.fehler), 1500);
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
        WORDLE_BILDSCHIRM.eingabe = "";
        WORDLE_BILDSCHIRM._merken();

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

    _beiRundenende() {
        const runde = WORDLE_BILDSCHIRM.runde;
        WORDLE_BILDSCHIRM._zeichnen();

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
