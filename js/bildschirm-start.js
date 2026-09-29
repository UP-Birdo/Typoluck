/*
 * bildschirm-start.js — der Startbildschirm: die Spiele und der Tag.
 *
 * DIE SPIELE STEHEN ALS LISTE DA (`START.SPIELE`), nicht als ein fest
 * eingebauter Wordle-Kasten. Typoluck ist eine Sammlung von Wortspielen;
 * das nächste Spiel ist ein Eintrag in dieser Liste plus ein eigener
 * Bildschirm, der sich bei NAVIGATION anmeldet — der Start selbst ändert
 * sich dafür nicht.
 *
 * Auf dem Start: Begrüssung, je Spiel (seit 0.23.4) ZWEI Karten —
 * Tageswort (Stand des Tages, danach Zeit bis zum nächsten) und Übung.
 * „Heute bei deinen Freunden" stand bis 0.23.0 darunter, seit 0.23.1 ist
 * es gelöscht (Freunde: Rangliste).
 * Seit 0.18.0 zwei Arten (js/start-bibliothek.js), seit 0.20.0 als
 * Schalter Üben · Bibliothek oben: Bibliothek (das Buch als Doppelseite)
 * oder Üben (die Kachel wie bisher).
 */

const START = {

    /*
     * Die Spiele der Sammlung.
     *   id          Kennung (auch der Bildschirm, den die Kachel öffnet)
     *   name        Anzeigename
     *   zeichen     Name aus BAUSTEINE.ZEICHEN
     *   beschreibung  Stichworte, kein Satz (UPCrew-Standard, seit 0.4.0)
     *   tagesName()   wie das heutige Rätsel heisst („Tageswort Nr. 3")
     *   tagesStand()  "offen" | "angefangen" | "erledigt" — Stand des heutigen Rätsels
     */
    SPIELE: [
        {
            id: "wordle",
            name: WORDLE.NAME,
            zeichen: "wordle",
            beschreibung: "5 Buchstaben · 6 Versuche",
            tagesName() {
                return "Tageswort Nr. " + WORDLE.tageswort(WORDLE.datumText(APP.jetzt())).nummer;
            },
            tagesStand() {
                const heute = WORDLE.datumText(APP.jetzt());
                if (APP.eigenesErgebnis(heute)) {
                    return "erledigt";
                }
                const runde = WORDLE.normalisieren(ICH.spielstand("wordle-tag"));
                if (runde && runde.datum === heute) {
                    return runde.zustand === "laeuft"
                        ? (runde.versuche.length > 0 ? "angefangen" : "offen")
                        : "erledigt";
                }
                return "offen";
            }
        }
    ],

    anmelden() {
        NAVIGATION.anmelden({
            id: "start",
            titel: "Start",
            zeichen: "start",
            imMenue: false,
            zeigen: (behaelter, parameter) => START.zeigen(behaelter, parameter),
            /* Seit 0.23.2: das Vollbild-Buch geht beim Verlassen zu. */
            verlassen: () => START.buchVerlassen && START.buchVerlassen()
        });
    },

    zeigen(behaelter, parameter) {
        /* Aus einer Bibliothek-Runde zurück (seit 0.20.0): in die Bibliothek,
           dorthin, wo man steht. */
        if (parameter && parameter.bibliothek && typeof START.artSetzen === "function") {
            try {
                window.localStorage.setItem(START.ART_SCHLUESSEL, "bibliothek");
            } catch (fehler) {
                /* egal */
            }
            START.buchBlick = null;
            START.kapBlick = null;
            START.regalOffen = false;
            /* Nur einmal (auch ein Neuzeichnen trägt denselben Parameter). */
            parameter.bibliothek = false;
            /* Seit 0.23.2: Wartet als Nächstes eine Kreuzung, öffnet sich das
               Buch von selbst dort und fragt „Wo lang?". */
            if (typeof START.buchOeffnen === "function") {
                const lauf = BIBLIOTHEK.lauf(START._turm(), BIBLIOTHEK.aktuellesBuch(START._turm()));
                START.buchOffen = !!lauf.gabel;
                START._woLang = !!lauf.gabel;
            }
        }
        const ich = ANMELDUNG.ich();
        const name = ich ? ich.name : (ICH.person() ? ICH.person().name : "");

        /* DIE KOPFZEILE WIE IN BLUNDERLUCK (seit 0.7.0, UPCrew-Runde 2):
           links das Profil, daneben seit 0.25.0 die Serien-Kapsel
           (gemeinsame Runde 7). Seit 0.26.0 ist das Profil hier die
           VORSCHAU-KARTE des Bausteins (Nutzer 29.09.2026: „nur ein vorschau
           profil … karte die oben ist mit den ausgerüsteten abzeichen titel
           und level und flammen mit natürlich dem namen"): ein Tipp auf die
           Karte (Bild oben links) → das ausführliche Profil, auf „Level N"
           → der Level-Pfad. Ohne Baustein wie bis 0.25.0 die Pille. */
        const kopf = BAUSTEINE.el("header", "start-kopf");
        /* Seit 0.26.0 abends (Koordination „Start ohne Scrollen"): EINE
           kompakte Kopfzeile aus dem Baustein (Kreis mit Level-Ring, Name,
           drei Abzeichen-Zeichen, Flamme rechts) statt der Vorschau-Karte;
           `data-up-bl-kopf` = hier beginnen Blätter darunter (gemessen). */
        kopf.setAttribute("data-up-bl-kopf", "");
        START._kopfFlamme = null;
        if (name) {
            kopf.appendChild(START._profilKarteBauen(ich, name));
            START._flammeBauen(kopf, START._kopfFlamme);
        }
        behaelter.appendChild(kopf);

        /*
         * DIE ART BESTIMMT DEN INHALT (seit 0.20.0 über den Schalter
         * Üben · Bibliothek oben, wie im Entwurf Bibliothek-Doppelseite; von
         * 0.18.0 bis 0.19.0 am Quadrat neben „Spielen"): BIBLIOTHEK = das
         * aufgeschlagene Buch (js/start-bibliothek.js), ÜBEN = die
         * Spiel-Kachel wie bisher (Tageswort, Übung).
         */
        const mitArt = typeof START.art === "function";
        if (mitArt) {
            behaelter.appendChild(START._artSchalterBauen());
        }
        if (mitArt && START.art() === "bibliothek") {
            START._bibliothekBauen(behaelter);
            if (START._woLang) {
                START._woLang = false;
                const b = START._buchNr();
                const lauf = BIBLIOTHEK.lauf(START._turm(), b);
                if (lauf.gabel) {
                    START.gabelBlatt(b, lauf.gabel, "Wo lang?");
                }
            }
        } else {
            START.SPIELE.forEach((spiel) => behaelter.appendChild(START._modiBauen(spiel)));
        }

        /* „Freunde heute" ist seit 0.23.0 nicht mehr auf dem Start (Nutzer:
           „freunde weg beim start · üben soll auch freunde raus"), seit
           0.23.1 samt Laden und Uhr gelöscht. Freunde: Rangliste. */
    },

    /*
     * DIE SERIEN-FLAMME (seit 0.16.1, gemeinsamer Baustein
     * js/upcrew-flamme.js; Nutzer 27.09.2026: „die Flamme soll oben in
     * deinem Profil bei beiden Spielen sein — ein Kreis mit einer Flamme und
     * in der Flamme die Anzeige, ausgelegt für 3 Stellen, alles drüber 1k+ …
     * sync mit deinem Profil"). Die Zahlen kommen aus dem gemeinsamen
     * Fortschritt (APP.fortschritt(): Gerät und Konto, je Zweig der neuere;
     * FORTSCHRITT.serieHeute: Serie über ALLE Zweige, heute geschafft,
     * freier Schutz) — an der Serien-Rechnung ändert sich nichts.
     *
     * SEIT 0.25.0 DIE SERIEN-KAPSEL (gemeinsamer Baustein js/upcrew-serie.js,
     * gemeinsame Runde 7, wie Blunderluck v0.156.0): hinter dem Flammen-Kreis
     * die sieben Tage. Ein Tipp öffnet die Karte (grosse Flamme, Woche).
     * Seit 0.26.0 ohne Schilde, ohne Serien-Schutz und ohne „Schild kaufen"
     * (Nutzer 29.09.2026: „serien schild raus"). Die Serie steht nicht mehr
     * in den Aufgaben. Ohne den Baustein wie bis 0.24.0 nur der Kreis, ein
     * Tipp führt dann zu den Aufgaben.
     */
    _flamme: null,
    _kapsel: null,

    _flammeBauen(halter, fertig) {
        START._flamme = null;
        START._kapsel = null;
        if (typeof UPCREW_FLAMME === "undefined") {
            return;
        }
        if (fertig) {
            /* Die Flamme der Kopfzeile (ein Kreis, keine Kapsel, keine Woche). */
            START._flamme = fertig;
        } else if (typeof UPCREW_SERIE !== "undefined") {
            START._kapsel = UPCREW_SERIE.kapsel(halter, { beiKlick: () => START.serieOeffnen() });
        } else {
            START._flamme = UPCREW_FLAMME.bauen(halter, {
                beiKlick: () => NAVIGATION.zeigen("herausforderungen", null)
            });
        }
        START.flammeAktualisieren();
    },

    /* Die Werte der Kapsel und der Karte: die Serie und die letzten sieben
       Tage (heute zuletzt, über alle Spiele). */
    TAGE_KURZ: ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"],

    serieWerte() {
        const stand = APP.fortschritt();
        const datum = WORDLE.datumText(APP.jetzt());
        const heute = FORTSCHRITT.serieHeute(stand, datum);
        const alleTage = FORTSCHRITT.alleTage(stand);
        const tage = [];
        let tag = datum;
        for (let i = 0; i < 7; i++) {
            tage.unshift(tag);
            tag = FORTSCHRITT._vortag(tag);
        }
        return {
            serie: heute.tage,
            heute: heute.heute === true,
            woche: tage.map((d) => alleTage.has(d)),
            tage: tage.map((d) => START.TAGE_KURZ[new Date(d + "T12:00:00").getDay()] || "")
        };
    },

    /* Die Karte zur Serie (über allem, auch über Blättern). */
    serieOeffnen() {
        if (typeof UPCREW_BLATT === "undefined" || typeof UPCREW_SERIE === "undefined") {
            NAVIGATION.zeigen("herausforderungen", null);
            return null;
        }
        const werte = START.serieWerte();
        return UPCREW_BLATT.oeffnen({
            art: "karte",
            titel: "Serie",
            klasse: "karte-serie",
            inhalt: (ort) => UPCREW_SERIE.karteFuellen(ort, werte, {
                beiZu: () => UPCREW_BLATT.schliessen("knopf")
            })
        });
    },

    /* Auch ohne Neuzeichnen: nach jeder Runde und wenn der Konto-Stand
       eintrifft (js/app.js). Liefert die gesetzten Werte (für Tests). */
    flammeAktualisieren() {
        if (START._kapsel) {
            const werte = START.serieWerte();
            START._kapsel.setzen(werte);
            return werte;
        }
        if (!START._flamme) {
            return null;
        }
        const heute = FORTSCHRITT.serieHeute(APP.fortschritt(), WORDLE.datumText(APP.jetzt()));
        const werte = { serie: heute.tage, heuteGeschafft: heute.heute };
        START._flamme.setzen(werte);
        return werte;
    },

    /* Das eigene Profil (seit 0.25.0 ein Blatt über dem Start). */
    profilOeffnen() {
        NAVIGATION.zeigen("profil", null);
    },

    /* „Verlauf" aus dem Drei-Striche-Menü: seit 0.26.2 ein eigenes Blatt mit
       den letzten Tageswörtern (die Partien stehen nicht mehr im Profil). */
    verlaufOeffnen() {
        return PROFIL_BILDSCHIRM.verlaufOeffnen();
    },

    /* Der Kopf oben (seit 0.26.0 die kompakte Kopfzeile; seit 0.26.1 Tipp →
       direkt das ausführliche Profil): Zahlen aus PROFIL_BILDSCHIRM.vorschauDaten
       — dieselben wie im Profil und in der Rangliste. Ohne Baustein oder Konto
       die Pille wie bis 0.25.0. */
    _profilKarteBauen(ich, name) {
        if (!ich || !PROFIL_BILDSCHIRM._mitBaustein() || typeof UPCREW_PROFIL.kopfzeile !== "function") {
            return START._kurzprofilBauen(ich, name);
        }
        const spieler = SPIELER.spielerFinden(ANMELDUNG.abgleich.daten, ich.id) || ich;
        const ort = BAUSTEINE.el("div", "start-kopfzeile");
        /* Seit 0.26.1: Flamme oben links / Level unten rechts am Kreis, rechts
           das Drei-Striche-Menü (Freunde · Verlauf · Einstellungen) aus dem Baustein. */
        const kopf = UPCREW_PROFIL.kopfzeile(ort, PROFIL_BILDSCHIRM.vorschauDaten(spieler, true), {
            beiOeffnen: () => START.profilOeffnen(),
            beiSerie: () => START.serieOeffnen(),
            beiLevel: () => PROFIL_BILDSCHIRM.levelPfadOeffnen(spieler, true),
            menue: [
                { text: "Freunde", zeichen: "freunde", beiKlick: () => RANGLISTE_BILDSCHIRM.freundeOeffnen() },
                { text: "Verlauf", zeichen: "uhr", beiKlick: () => START.verlaufOeffnen() },
                { text: "Einstellungen", zeichen: "zahnrad", beiKlick: () => NAVIGATION.zeigen("einstellungen", null) }
            ]
        });
        START._kopfFlamme = kopf.flamme;
        return ort;
    },

    /*
     * Das Kurzprofil oben links (seit 0.7.0; seit 0.26.0 nur noch Rückfall
     * ohne Baustein): Kreis mit Level-Ring, Name, darunter die
     * Tageswort-Quote („83 % Tageswort", bis 0.25.0 „… gelöst"). Ein Tipp
     * öffnet das eigene Profil. Die Zahlen rechnet RANGLISTE.statistik.
     */
    _kurzprofilBauen(ich, name) {
        const knopf = BAUSTEINE.knopf({
            art: "flach", titel: "Dein Profil",
            beiKlick: () => START.profilOeffnen()
        });
        knopf.classList.add("start-profil");
        /* Seit 0.10.0 (UPCrew-Runde 5): der Kreis trägt den Level-Ring —
           Ring = XP im laufenden Level, Zahl = Level (js\fortschritt.js).
           Seit 0.12.0 mit dem erreichten Rahmen. */
        const stufe = APP.level();
        knopf.appendChild(BAUSTEINE.levelRing(name, stufe.hat / stufe.kosten, stufe.level, false,
            FORTSCHRITT.rahmenVon(stufe.level)));

        const texte = BAUSTEINE.el("span", "start-profil-texte");
        texte.appendChild(BAUSTEINE.el("span", "start-profil-name", name));
        if (ich) {
            const verlauf = ERGEBNISSE.verlaufMitAusstehendem(APP.eigenerVerlauf, ich.id);
            const werte = RANGLISTE.statistik(verlauf, WORDLE.datumText(APP.jetzt()));
            texte.appendChild(BAUSTEINE.el("span", "start-profil-werte",
                werte.quote + " % Tageswort"));
        }
        knopf.appendChild(texte);
        return knopf;
    },

    /*
     * ÜBEN = ZWEI MODI (seit 0.23.4, Nutzer: „bei Typoluck sollen Tageswort
     * und Übung getrennt werden, also schon auf derselben Seite stehen, nur
     * als zwei Spielmodi"): zwei Karten, je ein Knopf.
     *   Tageswort  einmal am Tag, für alle gleich — offen / angefangen /
     *              gelöst / verloren, danach die Zeit bis zum nächsten.
     *   Übung      beliebig oft.
     * Zählung, Serie, Aufgaben und XP bleiben, wie sie sind (nur die
     * Oberfläche ist getrennt). Bis 0.23.3 eine Kachel mit „Spielen" und
     * „Übung" nebeneinander.
     */
    _modiBauen(spiel) {
        const teil = document.createDocumentFragment();
        teil.appendChild(START._tagesKarteBauen(spiel));
        teil.appendChild(START._uebungKarteBauen(spiel));
        return teil;
    },

    /* Stand des heutigen Tagesworts genauer: { stand: offen | angefangen |
       geloest | verloren, versuche }. */
    tagesDetail() {
        const heute = WORDLE.datumText(APP.jetzt());
        const ergebnis = APP.eigenesErgebnis(heute);
        if (ergebnis) {
            return { stand: ergebnis.geloest ? "geloest" : "verloren", versuche: ergebnis.versuche };
        }
        const runde = WORDLE.normalisieren(ICH.spielstand("wordle-tag"));
        if (runde && runde.datum === heute) {
            if (runde.zustand === "laeuft") {
                return { stand: runde.versuche.length > 0 ? "angefangen" : "offen", versuche: runde.versuche.length };
            }
            return { stand: runde.zustand === "gewonnen" ? "geloest" : "verloren", versuche: runde.versuche.length };
        }
        return { stand: "offen", versuche: 0 };
    },

    /* Bis zum nächsten Tageswort (lokale Mitternacht): „5 h 12 min". Rein. */
    bisMorgen(jetzt) {
        const morgen = new Date(jetzt.getFullYear(), jetzt.getMonth(), jetzt.getDate() + 1);
        const minuten = Math.max(1, Math.ceil((morgen.getTime() - jetzt.getTime()) / 60000));
        const h = Math.floor(minuten / 60);
        return (h > 0 ? h + " h " : "") + (minuten % 60) + " min";
    },

    _modusKarte(zeichen, name, satz) {
        const karte = BAUSTEINE.karte(null, "spiel-kachel modus-karte");
        const kopf = BAUSTEINE.el("div", "spiel-kachel-kopf");
        const bild = BAUSTEINE.el("span", "spiel-kachel-bild");
        bild.appendChild(BAUSTEINE.zeichen(zeichen));
        kopf.appendChild(bild);
        const texte = BAUSTEINE.el("div", "spiel-kachel-texte");
        texte.appendChild(BAUSTEINE.el("h2", "spiel-kachel-name", name));
        texte.appendChild(BAUSTEINE.el("p", "spiel-kachel-satz", satz));
        kopf.appendChild(texte);
        karte.appendChild(kopf);
        return karte;
    },

    _tagesKarteBauen(spiel) {
        const d = START.tagesDetail();
        const nummer = spiel.tagesName().replace("Tageswort ", "");
        const karte = START._modusKarte("kalender", "Tageswort", nummer + " · für alle gleich");
        const fertig = d.stand === "geloest" || d.stand === "verloren";
        const text = {
            offen: "offen",
            angefangen: "angefangen · " + d.versuche + "/" + WORDLE.VERSUCHE,
            geloest: "gelöst · " + d.versuche + "/" + WORDLE.VERSUCHE,
            verloren: "verloren"
        }[d.stand] + (fertig ? " · nächstes in " + START.bisMorgen(APP.jetzt()) : "");
        karte.appendChild(BAUSTEINE.el("p", "spiel-kachel-stand spiel-stand-" + d.stand, text));
        const knopf = BAUSTEINE.knopf({
            text: fertig ? "Ergebnis" : (d.stand === "angefangen" ? "Weiter" : "Spielen"),
            art: fertig ? "still" : "haupt", breit: true, zeichen: fertig ? "rangliste" : "weiter",
            beiKlick: () => NAVIGATION.zeigen(spiel.id, { modus: "tag" })
        });
        karte.appendChild(knopf);
        return karte;
    },

    _uebungKarteBauen(spiel) {
        const karte = START._modusKarte("uebung", "Übung", "beliebig oft · eigenes Wort");
        const runde = WORDLE.normalisieren(ICH.spielstand("wordle-uebung"));
        const laeuft = !!runde && runde.modus === "uebung" && runde.zustand === "laeuft" && runde.versuche.length > 0;
        karte.appendChild(BAUSTEINE.el("p", "spiel-kachel-stand spiel-stand-" + (laeuft ? "angefangen" : "offen"),
            laeuft ? "angefangen · " + runde.versuche.length + "/" + WORDLE.versucheMax(runde) : "neues Wort"));
        karte.appendChild(BAUSTEINE.knopf({
            text: laeuft ? "Weiter" : "Spielen", art: "haupt", breit: true, zeichen: "uebung",
            beiKlick: () => NAVIGATION.zeigen(spiel.id, { modus: "uebung" })
        }));
        return karte;
    }
};

