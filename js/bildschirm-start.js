/*
 * bildschirm-start.js — der Startbildschirm: die Spiele und der Tag.
 *
 * DIE SPIELE STEHEN ALS LISTE DA (`START.SPIELE`), nicht als ein fest
 * eingebauter Wordle-Kasten. Typoluck ist eine Sammlung von Wortspielen;
 * das nächste Spiel ist ein Eintrag in dieser Liste plus ein eigener
 * Bildschirm, der sich bei NAVIGATION anmeldet — der Start selbst ändert
 * sich dafür nicht.
 *
 * Auf dem Start: Begrüssung, je Spiel eine Kachel mit dem Stand des Tages
 * (offen / angefangen / erledigt) und darunter „Heute bei deinen Freunden".
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

    /*
     * „FREUNDE HEUTE" LEBT (seit 0.8.1, ROADMAP Nr. 9). Solange der Start
     * zu sehen ist, holt er die Tageswertung alle AUFFRISCHEN_MS still nach
     * — und sofort, wenn die App in den Vordergrund zurückkommt. Still
     * heisst: Die stehende Tabelle bleibt stehen (kein Lade-Platzhalter,
     * kein Flackern), neu gezeichnet wird nur, wenn sich wirklich etwas
     * geändert hat; ein Fehler beim Nachholen lässt die alte Tabelle stehen.
     * Nur wenn noch nichts für HEUTE da ist (erster Aufruf, neuer Tag), gibt
     * es den Platzhalter. Die Uhr läuft nur auf dem Start (beim Verlassen
     * aus) und nie in der Werkstatt (deren Daten ändern sich nicht, und ein
     * Kopflos-Bild bliebe sonst nie stehen).
     *
     * Kosten: Der Tagesknoten ist klein (je Spieler ein Ergebnis) — alle
     * 30 s ein paar Kilobyte, nur während jemand auf den Start schaut.
     */
    AUFFRISCHEN_MS: 30000,

    /* Der Tages-Stand der Freunde, für welches Datum er gilt, und der
       Fehler des letzten Ladens (nur, wenn nichts Brauchbares da ist). */
    _freundeHeute: null,
    _freundeFuer: null,
    _freundeFehler: "",

    /* Laufende Nummer der Ladevorgänge — eine ältere Antwort, die nach
       einer neueren ankommt, wird verworfen. */
    _ladeNr: 0,
    _uhr: null,

    anmelden() {
        NAVIGATION.anmelden({
            id: "start",
            titel: "Start",
            zeichen: "start",
            imMenue: false,
            zeigen: (behaelter) => START.zeigen(behaelter),
            verlassen: () => START._auffrischenAus()
        });
        /* Zurück in den Vordergrund: gleich nachsehen, statt bis zu 30 s
           auf die Uhr zu warten. */
        document.addEventListener("visibilitychange", () => {
            if (document.visibilityState === "visible" && START._uhr !== null
                && NAVIGATION.aktuell === "start") {
                START._freundeLaden(true);
            }
        });
    },

    zeigen(behaelter) {
        const ich = ANMELDUNG.ich();
        const name = ich ? ich.name : (ICH.person() ? ICH.person().name : "");

        /* DIE KOPFZEILE WIE IN BLUNDERLUCK (seit 0.7.0, UPCrew-Runde 2;
           Vorbild dort `START._kurzprofilBauen` / `_menuebandBauen` in
           js\start.js): links das Kurzprofil, rechts der Drei-Balken-Knopf
           mit Profil, Freunde und Einstellungen. Der Schriftzug „Typoluck"
           oben ist weg (Nutzer-Entscheidung 26.09.2026) — bis 0.6.x stand
           er links, der Namens-Kreis rechts neben den Balken. */
        const kopf = BAUSTEINE.el("header", "start-kopf");
        if (name) {
            kopf.appendChild(START._kurzprofilBauen(ich, name));
        }
        const rechts = BAUSTEINE.el("div", "start-kopf-rechts");
        rechts.appendChild(NAVIGATION.menueBauen());
        kopf.appendChild(rechts);
        behaelter.appendChild(kopf);

        for (const spiel of START.SPIELE) {
            behaelter.appendChild(START._spielKachelBauen(spiel));
        }

        behaelter.appendChild(START._freundeKarteBauen());
        START._freundeLaden(false);
        START._auffrischenAn();
    },

    /* Die Uhr einschalten — mehrfach gerufen (jeder Neubau des Starts)
       bleibt es bei EINER. */
    _auffrischenAn() {
        if (START._uhr !== null || (typeof WERKSTATT !== "undefined" && WERKSTATT.aktiv())) {
            return;
        }
        START._uhr = setInterval(() => {
            if (document.visibilityState === "visible" && NAVIGATION.aktuell === "start") {
                START._freundeLaden(true);
            }
        }, START.AUFFRISCHEN_MS);
    },

    _auffrischenAus() {
        if (START._uhr !== null) {
            clearInterval(START._uhr);
            START._uhr = null;
        }
    },

    /*
     * Das Kurzprofil oben links (seit 0.7.0): Kreis mit Anfangsbuchstabe,
     * Name, darunter „Serie 4 · 83 % gelöst". Ein Tipp öffnet das eigene
     * Profil. Die Zahlen rechnet RANGLISTE.statistik — dieselbe Zählung wie
     * auf der Profilseite, aus dem eigenen Verlauf samt noch nicht
     * gesendeter Ergebnisse. Ohne Konto (nur Gerät bekannt) steht nur der
     * Name da.
     */
    _kurzprofilBauen(ich, name) {
        const knopf = BAUSTEINE.knopf({
            art: "flach", titel: "Dein Profil",
            beiKlick: () => NAVIGATION.zeigen("profil", null)
        });
        knopf.classList.add("start-profil");
        knopf.appendChild(BAUSTEINE.kreis(name));

        const texte = BAUSTEINE.el("span", "start-profil-texte");
        texte.appendChild(BAUSTEINE.el("span", "start-profil-name", name));
        if (ich) {
            const verlauf = ERGEBNISSE.verlaufMitAusstehendem(APP.eigenerVerlauf, ich.id);
            const werte = RANGLISTE.statistik(verlauf, WORDLE.datumText(APP.jetzt()));
            texte.appendChild(BAUSTEINE.el("span", "start-profil-werte",
                "Serie " + werte.serie + " · " + werte.quote + " % gelöst"));
        }
        knopf.appendChild(texte);
        return knopf;
    },

    _spielKachelBauen(spiel) {
        const stand = spiel.tagesStand();
        const karte = BAUSTEINE.karte(null, "spiel-kachel");

        const kopf = BAUSTEINE.el("div", "spiel-kachel-kopf");
        const bild = BAUSTEINE.el("span", "spiel-kachel-bild");
        bild.appendChild(BAUSTEINE.zeichen(spiel.zeichen));
        kopf.appendChild(bild);
        const texte = BAUSTEINE.el("div", "spiel-kachel-texte");
        texte.appendChild(BAUSTEINE.el("h2", "spiel-kachel-name", spiel.name));
        texte.appendChild(BAUSTEINE.el("p", "spiel-kachel-satz", spiel.beschreibung));
        kopf.appendChild(texte);
        karte.appendChild(kopf);

        const raetsel = spiel.tagesName();
        /* Name des Rätsels und sein Stand als Stichwort — kein Satz. */
        const schild = BAUSTEINE.el("p", "spiel-kachel-stand spiel-stand-" + stand, raetsel + " · " + {
            offen: "offen",
            angefangen: "angefangen",
            erledigt: "erledigt"
        }[stand]);
        karte.appendChild(schild);

        const knoepfe = BAUSTEINE.el("div", "knopf-reihe");
        if (stand === "erledigt") {
            knoepfe.appendChild(BAUSTEINE.knopf({
                text: "Übungsrunde", art: "haupt", zeichen: "uebung",
                beiKlick: () => NAVIGATION.zeigen(spiel.id, { modus: "uebung" })
            }));
            knoepfe.appendChild(BAUSTEINE.knopf({
                text: "Ergebnis", art: "still",
                beiKlick: () => NAVIGATION.zeigen(spiel.id, { modus: "tag" })
            }));
        } else {
            knoepfe.appendChild(BAUSTEINE.knopf({
                text: stand === "angefangen" ? "Weiter" : "Spielen",
                art: "haupt", zeichen: "weiter",
                beiKlick: () => NAVIGATION.zeigen(spiel.id, { modus: "tag" })
            }));
            knoepfe.appendChild(BAUSTEINE.knopf({
                text: "Übung", art: "still", zeichen: "uebung",
                beiKlick: () => NAVIGATION.zeigen(spiel.id, { modus: "uebung" })
            }));
        }
        karte.appendChild(knoepfe);
        return karte;
    },

    /* „Freunde heute" — die Tagestabelle, nur Freunde und ich, höchstens
       fünf Zeilen. Laden, Leer und Fehler kommen aus js\zustand.js. */
    _freundeKarteBauen() {
        const karte = BAUSTEINE.karte("Freunde heute", "start-freunde");
        karte.id = "start-freunde";
        START._freundeKarteFuellen(karte);
        return karte;
    },

    _freundeKarteFuellen(karte) {
        while (karte.children.length > 1) {
            karte.removeChild(karte.lastChild);
        }
        const ich = ANMELDUNG.ich();
        if (!ich) {
            return;
        }
        if (START._freundeFehler) {
            karte.appendChild(ZUSTAND.fehler({
                technik: START._freundeFehler, nochmal: () => START._freundeLaden()
            }));
            return;
        }
        if (START._freundeHeute === null) {
            karte.appendChild(ZUSTAND.laden({ zeilen: 3, nochmal: () => START._freundeLaden() }));
            return;
        }

        const daten = ANMELDUNG.abgleich.daten;
        const zeilen = RANGLISTE.tagesTabelle(START._freundeHeute, daten,
            RANGLISTE.auswahl(daten, ich.id, true)).slice(0, 5);
        const hatFreunde = SPIELER.freundeVon(daten, ich.id).freunde.length > 0;

        if (!hatFreunde) {
            karte.appendChild(ZUSTAND.leer({
                zeichen: "freunde", text: "Noch keine Freunde",
                aktion: { text: "Freunde finden", zeichen: "freunde",
                    beiKlick: () => NAVIGATION.zeigen("freunde", null) }
            }));
            return;
        }
        if (zeilen.length === 0) {
            karte.appendChild(ZUSTAND.leer({
                zeichen: "wordle", text: "Heute noch niemand",
                aktion: { text: "Spielen", zeichen: "weiter",
                    beiKlick: () => NAVIGATION.zeigen("wordle", { modus: "tag" }) }
            }));
        } else {
            karte.appendChild(RANGLISTE_BILDSCHIRM.tabelleBauen(zeilen, "tag", ich.id));
        }

        karte.appendChild(BAUSTEINE.knopf({
            text: "Ganze Rangliste", art: "flach", zeichen: "weiter",
            beiKlick: () => NAVIGATION.zeigen("rangliste", null)
        }));
    },

    /*
     * Holt die Tageswertung.
     *   still = false  zeigt den Lade-Platzhalter, AUSSER es liegt schon
     *                  eine Wertung für heute vor (dann bleibt sie stehen,
     *                  bis die neue da ist — so flackert der Start nicht bei
     *                  jedem Neubau). Taugt auch für den Knopf „Nochmal".
     *   still = true   die Uhr: nie ein Platzhalter; ein Fehler lässt eine
     *                  stehende Tabelle stehen.
     * Neu gezeichnet wird nur, was sich geändert hat.
     */
    async _freundeLaden(still) {
        const heute = WORDLE.datumText(APP.jetzt());
        const vorhanden = START._freundeHeute !== null && START._freundeFuer === heute
            && !START._freundeFehler;
        const nr = ++START._ladeNr;
        if (!vorhanden && !still) {
            START._freundeHeute = null;
            START._freundeFuer = null;
            START._freundeFehler = "";
            START._freundeKarteNeu();
        }
        let neu;
        try {
            neu = await ERGEBNISSE.tagLaden(APP.spielSpeicher, heute);
        } catch (fehler) {
            if (nr !== START._ladeNr || (still && vorhanden)) {
                return;
            }
            START._freundeFehler = fehler.message || "Fehler";
            START._freundeKarteNeu();
            return;
        }
        if (nr !== START._ladeNr) {
            return;
        }
        const geaendert = !vorhanden || JSON.stringify(neu) !== JSON.stringify(START._freundeHeute);
        START._freundeHeute = neu;
        START._freundeFuer = heute;
        START._freundeFehler = "";
        if (geaendert) {
            START._freundeKarteNeu();
        }
    },

    _freundeKarteNeu() {
        const karte = document.getElementById("start-freunde");
        if (karte && NAVIGATION.aktuell === "start") {
            START._freundeKarteFuellen(karte);
        }
    }
};
