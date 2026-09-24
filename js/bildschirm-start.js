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
     *   beschreibung  ein Satz
     *   tagesName()   wie das heutige Rätsel heisst („Tageswort Nr. 3")
     *   tagesStand()  "offen" | "angefangen" | "erledigt" — Stand des heutigen Rätsels
     */
    SPIELE: [
        {
            id: "wordle",
            name: "Wordle",
            zeichen: "wordle",
            beschreibung: "Errate das Wort mit fünf Buchstaben in sechs Versuchen.",
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

    /* Der Tages-Stand der Freunde, einmal je Anzeige geholt. */
    _freundeHeute: null,
    _freundeFehler: "",

    anmelden() {
        NAVIGATION.anmelden({
            id: "start",
            titel: "Start",
            zeichen: "start",
            inLeiste: true,
            zeigen: (behaelter) => START.zeigen(behaelter)
        });
    },

    zeigen(behaelter) {
        const ich = ANMELDUNG.ich();
        const name = ich ? ich.name : (ICH.person() ? ICH.person().name : "");

        const kopf = BAUSTEINE.el("header", "start-kopf");
        const marke = BAUSTEINE.el("div", "start-marke");
        marke.appendChild(BAUSTEINE.el("span", "start-logo", "Typoluck"));
        marke.appendChild(BAUSTEINE.el("span", "start-gruss", name ? "Hallo " + name + "!" : "Hallo!"));
        kopf.appendChild(marke);
        const profilKnopf = BAUSTEINE.knopf({
            art: "flach", titel: "Dein Profil",
            beiKlick: () => NAVIGATION.zeigen("profil", null, true)
        });
        profilKnopf.appendChild(BAUSTEINE.kreis(name));
        kopf.appendChild(profilKnopf);
        behaelter.appendChild(kopf);

        for (const spiel of START.SPIELE) {
            behaelter.appendChild(START._spielKachelBauen(spiel));
        }

        behaelter.appendChild(START._freundeKarteBauen());
        START._freundeLaden();
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
        const schild = BAUSTEINE.el("p", "spiel-kachel-stand spiel-stand-" + stand, {
            offen: raetsel + " wartet auf dich.",
            angefangen: raetsel + " ist angefangen.",
            erledigt: raetsel + " ist erledigt. Morgen kommt das nächste."
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

    /* „Heute bei deinen Freunden" — die Tagestabelle, nur Freunde und ich,
       höchstens fünf Zeilen. */
    _freundeKarteBauen() {
        const karte = BAUSTEINE.karte("Heute bei deinen Freunden", "start-freunde");
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
            karte.appendChild(BAUSTEINE.erklaerung(START._freundeFehler));
            return;
        }
        if (START._freundeHeute === null) {
            karte.appendChild(BAUSTEINE.erklaerung("Wird geladen …"));
            return;
        }

        const daten = ANMELDUNG.abgleich.daten;
        const zeilen = RANGLISTE.tagesTabelle(START._freundeHeute, daten,
            RANGLISTE.auswahl(daten, ich.id, true)).slice(0, 5);
        const hatFreunde = SPIELER.freundeVon(daten, ich.id).freunde.length > 0;

        if (zeilen.length === 0) {
            karte.appendChild(BAUSTEINE.erklaerung(hatFreunde
                ? "Heute hat noch niemand von euch gespielt."
                : "Noch keine Freunde. Unter Freunde findest du andere Spieler."));
        } else {
            karte.appendChild(RANGLISTE_BILDSCHIRM.tabelleBauen(zeilen, "tag", ich.id));
        }

        karte.appendChild(BAUSTEINE.knopf({
            text: hatFreunde ? "Ganze Rangliste" : "Freunde finden", art: "flach", zeichen: "weiter",
            beiKlick: () => NAVIGATION.zeigen(hatFreunde ? "rangliste" : "freunde", null, true)
        }));
    },

    async _freundeLaden() {
        START._freundeHeute = null;
        START._freundeFehler = "";
        try {
            START._freundeHeute = await ERGEBNISSE.tagLaden(APP.spielSpeicher,
                WORDLE.datumText(APP.jetzt()));
        } catch (fehler) {
            START._freundeFehler = "Die Tageswertung ist gerade nicht erreichbar. " + fehler.message;
        }
        const karte = document.getElementById("start-freunde");
        if (karte && NAVIGATION.aktuell === "start") {
            START._freundeKarteFuellen(karte);
        }
    }
};
