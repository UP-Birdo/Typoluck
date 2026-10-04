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
 * Seit 0.18.0 zwei Arten (js/start-bibliothek.js), von 0.20.0 bis 0.31.0
 * als Schalter Üben · Bibliothek oben.
 *
 * SEIT 0.32.0 DIE GEMEINSAME START-FORM DES STUDIOS (Entwurf
 * Design-Entwurf TL-Start und Runde-8, Nutzer 03.10.2026):
 * oben der Kopf, darunter EINE Karte, die den Platz
 * füllt (was die Art zeigt), unten der Knopf-Bereich fester Höhe —
 * links der grosse Knopf (Üben: zwei), rechts das Umschalt-Quadrat, das
 * die Art wählt. Der Schalter oben ist weg. Die Arten stehen an EINER
 * Stelle (`START.ARTEN`); eine dritte Art ist ein Eintrag dort.
 */

const START = {

    /*
     * DIE ARTEN DES STARTS — DIE EINE LISTE (seit 0.32.0). Das Quadrat, die
     * Wahl am Quadrat, die gemerkte Art, die Karte und die Knöpfe lesen
     * alle hier. Eine weitere Art (Duell) ist EIN Eintrag mehr:
     *   id        Kennung (so steht sie auf dem Gerät)
     *   name      Anzeigename (ein Wort)
     *   info      Stichworte in der Wahl
     *   zeichen   Platzhalter des Platzes `start/art-<id>` (BAUSTEINE.ZEICHEN)
     *   karte(ort)   zeichnet, was die Art zeigt, in den Start (die Karte
     *                füllt den Platz über dem Knopf-Bereich)
     *   knoepfe()    → [{ text, unter, haupt, aus, tun }] — ein oder zwei
     *                Knöpfe links vom Quadrat
     * Die erste Art ist die Vorgabe.
     */
    ARTEN: [
        {
            id: "bibliothek", name: "Bibliothek", info: "Buch für Buch", zeichen: "bibliothek",
            karte: (ort) => START._bibliothekBauen(ort),
            knoepfe: () => START._bibliothekKnoepfe()
        },
        {
            id: "ueben", name: "Üben", info: "Tageswort · Übung", zeichen: "uebung",
            karte: (ort) => ort.appendChild(START._uebenKarteBauen(START.SPIELE[0])),
            knoepfe: () => START._uebenKnoepfe(START.SPIELE[0])
        }
    ],

    ART_SCHLUESSEL: "typoluck.start-art",

    /* Die Wahl am Quadrat offen? (nur Anzeige) */
    artMenueOffen: false,
    _artHorcherAktiv: false,

    artVon(id) {
        return START.ARTEN.find((eintrag) => eintrag.id === id) || null;
    },

    /* Die gemerkte Art (Gerät): eine Kennung aus ARTEN, sonst die Vorgabe.
       „frei" hiess „ueben" bis 0.19.0. */
    art() {
        try {
            const wert = window.localStorage.getItem(START.ART_SCHLUESSEL);
            const id = wert === "frei" ? "ueben" : wert;
            if (START.artVon(id)) {
                return id;
            }
        } catch (fehler) {
            /* ohne Gerätespeicher: die Vorgabe */
        }
        return START.ARTEN[0].id;
    },

    artSetzen(id) {
        try {
            window.localStorage.setItem(START.ART_SCHLUESSEL, START.artVon(id) ? id : START.ARTEN[0].id);
        } catch (fehler) {
            /* dann gilt die Wahl bis zum Neuladen nicht */
        }
        START.artMenueOffen = false;
        START.regalOffen = false;
        NAVIGATION.auffrischen();
    },

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
            /* Seit 0.23.2: das Vollbild-Buch geht beim Verlassen zu. Es
               liegt ÜBER der Seite (am <body>), nicht in ihr — die Seite
               selbst bleibt seit 0.29.0 im Band stehen. */
            verlassen: () => START.buchVerlassen && START.buchVerlassen(),
            /* Seit 0.34.1: Der Start wird beim Tab-Wechsel nicht neu gezeichnet
               (0.33.0, die Stand-Marke kennt nur den Tag) — beim Betreten
               wird darum NUR die Zeit bis zum nächsten Tageswort nachgeführt. */
            geoeffnet: (ort) => START.zeitNachfuehren(ort)
        });
    },

    /* Jede Anzeige „nächstes in …" trägt `data-bis-morgen` und bekommt hier
       die Zeit von jetzt — sonst ändert sich nichts. */
    zeitNachfuehren(ort) {
        if (!ort || typeof ort.querySelectorAll !== "function") {
            return;
        }
        const zeit = "in " + START.bisMorgen(APP.jetzt());
        for (const el of ort.querySelectorAll("[data-bis-morgen]")) {
            /* `kurz` (seit 0.34.4): nur „in …" — „nächstes " steht davor in
               einem eigenen Teil, den der Knopf bei wenig Platz weglässt. */
            const text = el.getAttribute("data-bis-morgen") === "kurz" ? zeit : "nächstes " + zeit;
            if (el.textContent !== text) {
                el.textContent = text;
            }
        }
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
         * DIE ART BESTIMMT DEN INHALT (seit 0.32.0 über das Quadrat unten,
         * `START.ARTEN`; von 0.20.0 bis 0.31.0 über einen Schalter oben):
         * ihre Karte füllt den Platz, darunter der Knopf-Bereich.
         */
        const art = START.artVon(START.art());
        art.karte(behaelter);
        behaelter.appendChild(START._untenBauen(art));
        if (art.id === "bibliothek" && START._woLang) {
            START._woLang = false;
            const b = START._buchNr();
            const lauf = BIBLIOTHEK.lauf(START._turm(), b);
            if (lauf.gabel) {
                START.gabelBlatt(b, lauf.gabel, "Wo lang?");
            }
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

    /* ---------------------------------------------------------------- *
     * DER KNOPF-BEREICH UNTEN (seit 0.32.0): EINE Zeile fester Höhe
     * (`.start-unten`, 82 px = 74 px Knöpfe + 8 px Luft):
     *
     *   Bibliothek:  [ Spielen · Kapitel … ]                 [Art]
     *   Üben:        [ Tageswort ] [ Übung ]                 [Art]
     *
     * Eine offene (angefangene) Runde der Art steht im Knopf als „Zurück
     * zur Runde", darunter klein, welche und wie sie steht. Das Quadrat
     * bleibt dabei stehen: In Typoluck können mehrere Runden zugleich
     * offen sein (das Tageswort den ganzen Tag) — ohne Quadrat käme man
     * so lange nicht an die andere Art.
     * ---------------------------------------------------------------- */

    _untenBauen(art) {
        const unten = BAUSTEINE.el("div", "start-unten");
        const zeile = BAUSTEINE.el("div", "start-spielen-zeile");
        const knoepfe = art.knoepfe();
        if (knoepfe.length > 1) {
            zeile.classList.add("zwei");
        }
        knoepfe.forEach((k) => zeile.appendChild(START._spielenKnopf(k)));
        zeile.appendChild(START._artKnopfBauen(art));
        unten.appendChild(zeile);
        return unten;
    },

    /* Ein Knopf des Bereichs: Wort oben, klein darunter, was er startet. */
    _spielenKnopf(k) {
        const knopf = BAUSTEINE.knopf({ text: k.text, art: k.haupt ? "haupt" : "still",
            beiKlick: () => k.tun && k.tun() });
        knopf.classList.add("start-spielen");
        if (k.zurueck) {
            knopf.classList.add("start-zurueck");
        }
        if (k.bisMorgen) {
            /* „nächstes in 17 h 28 min" passt bei 360 px nicht in den Knopf
               (seit 0.34.4): „nächstes " ist ein eigener Teil, den der Stil
               bei wenig Platz im Knopf weglässt — die Zeit bleibt ganz. */
            const unter = BAUSTEINE.el("small", "start-spielen-unter");
            unter.appendChild(BAUSTEINE.el("span", "start-spielen-vorsatz", "nächstes "));
            const zeit = BAUSTEINE.el("span", null, "in " + START.bisMorgen(APP.jetzt()));
            zeit.setAttribute("data-bis-morgen", "kurz");
            unter.appendChild(zeit);
            knopf.appendChild(unter);
        } else if (k.unter) {
            const unter = BAUSTEINE.el("small", "start-spielen-unter", k.unter);
            knopf.appendChild(unter);
        }
        knopf.disabled = !!k.aus;
        return knopf;
    },

    /* Das Zeichen einer Art: ein Platz (`start/art-<id>`), bis zur
       gelieferten Datei das heutige Linien-Zeichen. */
    _artZeichen(art) {
        const zeichen = BAUSTEINE.zeichen(art.zeichen);
        return (typeof UPCREW_PLATZ !== "undefined")
            ? UPCREW_PLATZ.bauen("start/art-" + art.id, "26x26", { inhalt: zeichen, klasse: "start-art-zeichen" })
            : zeichen;
    },

    /*
     * DAS UMSCHALT-QUADRAT: zeigt die Art von jetzt; ein Tipp klappt die
     * Wahl nach OBEN auf (alle Einträge aus START.ARTEN — zwei, drei oder
     * mehr, ohne Umbau). Die Wahl wird nicht neu gezeichnet, nur gezeigt
     * und verborgen; ein Tipp daneben klappt sie zu.
     */
    _artKnopfBauen(art) {
        const halter = BAUSTEINE.el("div", "start-art-halter");
        halter.setAttribute("data-start-art", "");

        const knopf = BAUSTEINE.knopf({ art: "still", text: art.name,
            beiKlick: () => START._artMenueZeigen(halter, !START.artMenueOffen) });
        knopf.classList.add("start-art-knopf");
        knopf.setAttribute("aria-label", "Art wählen · " + art.name);
        knopf.setAttribute("aria-haspopup", "true");
        knopf.insertBefore(START._artZeichen(art), knopf.querySelector(".knopf-text"));
        halter.appendChild(knopf);

        const menue = BAUSTEINE.el("div", "start-art-menue");
        menue.setAttribute("role", "menu");
        for (const eintrag of START.ARTEN) {
            const punkt = BAUSTEINE.knopf({ art: "flach", text: eintrag.name,
                beiKlick: () => START.artSetzen(eintrag.id) });
            punkt.classList.add("start-art-eintrag");
            punkt.setAttribute("role", "menuitemradio");
            punkt.setAttribute("aria-checked", eintrag.id === art.id ? "true" : "false");
            punkt.setAttribute("data-art", eintrag.id);
            punkt.insertBefore(START._artZeichen(eintrag), punkt.firstChild);
            punkt.querySelector(".knopf-text").appendChild(BAUSTEINE.el("small", null, eintrag.info));
            menue.appendChild(punkt);
        }
        halter.appendChild(menue);
        START._artMenueZeigen(halter, START.artMenueOffen);
        return halter;
    },

    _artMenueZeigen(halter, offen) {
        START.artMenueOffen = !!offen;
        const menue = halter.querySelector(".start-art-menue");
        const knopf = halter.querySelector(".start-art-knopf");
        if (menue) {
            menue.hidden = !offen;
        }
        if (knopf) {
            knopf.setAttribute("aria-expanded", offen ? "true" : "false");
        }
        if (offen) {
            START._artHorcherAnmelden();
        }
    },

    /* Ein Tipp neben Quadrat und Wahl klappt die Wahl zu — und tut sonst
       nichts (er öffnet nicht nebenbei die Karte darunter). Ist die Wahl
       inzwischen anders zugegangen, ist es ein gewöhnlicher Tipp. */
    _artHorcherAnmelden() {
        if (START._artHorcherAktiv || typeof document.addEventListener !== "function") {
            return;
        }
        START._artHorcherAktiv = true;
        const horcher = (ereignis) => {
            const ziel = ereignis.target;
            if (ziel && typeof ziel.closest === "function" && ziel.closest("[data-start-art]")) {
                return;
            }
            document.removeEventListener("click", horcher, true);
            START._artHorcherAktiv = false;
            if (!START.artMenueOffen) {
                return;
            }
            ereignis.stopPropagation();
            ereignis.preventDefault();
            document.querySelectorAll("[data-start-art]").forEach((halter) => START._artMenueZeigen(halter, false));
        };
        document.addEventListener("click", horcher, true);
    },

    /*
     * DIE OFFENEN RUNDEN (seit 0.32.0): was angefangen und noch nicht
     * beendet ist — je Runde { unter, parameter } oder null.
     *   bibliothek  die gemerkte Runde läuft, hat einen Versuch und gehört
     *               zur Station, die gerade dran ist
     *   tag         das Tageswort von heute ist angefangen
     *   uebung      eine Übungsrunde ist angefangen
     */
    offeneRunden() {
        const offen = { bibliothek: null, tag: null, uebung: null };
        const tag = START.tagesDetail();
        if (tag.stand === "angefangen") {
            offen.tag = { unter: "Tageswort · " + tag.versuche + "/" + WORDLE.VERSUCHE, parameter: { modus: "tag" } };
        }
        const uebung = WORDLE.normalisieren(ICH.spielstand("wordle-uebung"));
        if (uebung && uebung.modus === "uebung" && uebung.zustand === "laeuft" && uebung.versuche.length > 0) {
            offen.uebung = { unter: "Übung · " + uebung.versuche.length + "/" + WORDLE.versucheMax(uebung),
                parameter: { modus: "uebung" } };
        }
        const bib = WORDLE.normalisieren(ICH.spielstand("wordle-bibliothek"));
        if (bib && bib.modus === "bibliothek" && bib.zustand === "laeuft" && bib.versuche.length > 0
                && typeof START._turm === "function" && BIBLIOTHEK.spielbar(START._turm(), bib.buch, bib.station)) {
            const st = BIBLIOTHEK.station(bib.buch, bib.station);
            offen.bibliothek = {
                unter: "Kapitel " + BIBLIOTHEK.ROEM[st.k] + " · " + bib.versuche.length + "/" + WORDLE.versucheMax(bib),
                parameter: { modus: "bibliothek", buch: bib.buch, station: bib.station }
            };
        }
        return offen;
    },

    /*
     * ÜBEN = ZWEI MODI (seit 0.23.4, Nutzer: „bei Typoluck sollen Tageswort
     * und Übung getrennt werden, also schon auf derselben Seite stehen, nur
     * als zwei Spielmodi"). Seit 0.32.0 EINE Karte (das Tageswort von
     * heute) und zwei Knöpfe unten:
     *   Tageswort  einmal am Tag, für alle gleich — offen / angefangen /
     *              gelöst / verloren, danach die Zeit bis zum nächsten.
     *   Übung      beliebig oft.
     * Zählung, Serie, Aufgaben und XP bleiben, wie sie sind. Die eine
     * Hauptaktion ist das Tageswort; ist es erledigt, die Übung.
     */
    _uebenKnoepfe(spiel) {
        const d = START.tagesDetail();
        const offen = START.offeneRunden();
        const fertig = d.stand === "geloest" || d.stand === "verloren";
        const tag = { haupt: !fertig, tun: () => NAVIGATION.zeigen(spiel.id, { modus: "tag" }) };
        if (offen.tag) {
            Object.assign(tag, { text: "Zurück zur Runde", unter: offen.tag.unter, zurueck: true });
        } else if (fertig) {
            Object.assign(tag, { text: "Ergebnis", unter: "nächstes in " + START.bisMorgen(APP.jetzt()), bisMorgen: true });
        } else {
            Object.assign(tag, { text: "Tageswort", unter: spiel.tagesName().replace("Tageswort ", "") });
        }
        const uebung = { haupt: fertig, tun: () => NAVIGATION.zeigen(spiel.id, { modus: "uebung" }) };
        if (offen.uebung) {
            Object.assign(uebung, { text: "Zurück zur Runde", unter: offen.uebung.unter, zurueck: true });
        } else {
            Object.assign(uebung, { text: "Übung", unter: "neues Wort" });
        }
        return [tag, uebung];
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

    /* Der Kopf einer Start-Karte: Nummer im Kreis, Titel, rechts ein Stand. */
    _kartenKopf(nr, titel, rechts) {
        const kopf = BAUSTEINE.el("span", "start-karte-kopf");
        const pille = BAUSTEINE.el("span", "start-karte-pille");
        pille.appendChild(BAUSTEINE.el("span", "start-karte-nr", String(nr)));
        pille.appendChild(BAUSTEINE.el("span", "start-karte-titel", titel));
        kopf.appendChild(pille);
        if (rechts) {
            kopf.appendChild(BAUSTEINE.el("span", "start-karte-rechts", rechts));
        }
        return kopf;
    },

    /*
     * DIE KARTE DER ART ÜBEN (seit 0.32.0, Entwurf TL-Start): das Tageswort
     * von heute — Nummer, Stand, darunter das Brett so weit, wie es auf
     * DIESEM Gerät gespielt ist (Kacheln aus WORDLE_BILDSCHIRM._kachelBauen,
     * Farben wie die Runde sie zeigt), unten die Zeit bis zum nächsten und
     * der Stand der Übung. Nur Anzeige; gespielt wird über die Knöpfe.
     */
    _uebenKarteBauen(spiel) {
        const d = START.tagesDetail();
        const fertig = d.stand === "geloest" || d.stand === "verloren";
        const stand = {
            offen: "offen",
            angefangen: "angefangen · " + d.versuche + "/" + WORDLE.VERSUCHE,
            geloest: "gelöst · " + d.versuche + "/" + WORDLE.VERSUCHE,
            verloren: "verloren"
        }[d.stand];
        const karte = BAUSTEINE.el("section", "start-karte start-karte-ueben");
        const nummer = spiel.tagesName().replace("Tageswort Nr. ", "");
        const kopf = START._kartenKopf(nummer, "Tageswort", stand);
        kopf.querySelector(".start-karte-rechts").classList.add("spiel-stand-" + d.stand);
        karte.appendChild(kopf);

        const heute = WORDLE.datumText(APP.jetzt());
        const runde = WORDLE.normalisieren(ICH.spielstand("wordle-tag"));
        const gilt = !!runde && runde.modus === "tag" && runde.datum === heute;
        const bewertungen = gilt ? WORDLE.bewertungen(runde) : [];
        const mass = BAUSTEINE.el("div", "start-ueben-mass");
        const raster = BAUSTEINE.el("div", "start-ueben-raster");
        /* Der Stand steht im Kopf; das Brett ist hier nur Bild. */
        raster.setAttribute("aria-hidden", "true");
        for (let zeile = 0; zeile < WORDLE.VERSUCHE; zeile++) {
            const wort = gilt ? Array.from(runde.versuche[zeile] || "") : [];
            for (let stelle = 0; stelle < WORDLE.LAENGE; stelle++) {
                raster.appendChild(WORDLE_BILDSCHIRM._kachelBauen(wort[stelle] || "",
                    bewertungen[zeile] ? bewertungen[zeile][stelle] : null));
            }
        }
        mass.appendChild(raster);
        karte.appendChild(mass);

        const offen = START.offeneRunden();
        const fuss = BAUSTEINE.el("div", "start-karte-fuss");
        const zeit = BAUSTEINE.el("span", null, fertig ? "nächstes in " + START.bisMorgen(APP.jetzt()) : "für alle gleich");
        if (fertig) {
            zeit.setAttribute("data-bis-morgen", "");
        }
        fuss.appendChild(zeit);
        fuss.appendChild(BAUSTEINE.el("span", null, offen.uebung ? offen.uebung.unter : "Übung · beliebig oft"));
        karte.appendChild(fuss);
        return karte;
    }
};

