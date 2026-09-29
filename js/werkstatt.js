/*
 * werkstatt.js — die App zum Ansehen und Abfotografieren, ohne Datenbank.
 *
 * WOZU: „Sehen geht vor Rechnen" (Haus-Regel). Wer etwas Sichtbares baut,
 * sieht es sich vor dem Ausliefern an — im Haus mit Edge kopflos und einem
 * Bildschirmfoto. Dafür braucht die App einen Zustand, den man herstellen
 * kann: angemeldet, mit Freunden, mit Ergebnissen, auf einem bestimmten
 * Bildschirm. Genau das baut diese Datei — und zwar NUR, wenn die Adresse
 * `?werkstatt` enthält.
 *
 * WAS SIE NIE TUT: die echte Datenbank anfassen. Mit `?werkstatt` läuft die
 * App zwingend im Modus „lokal" (js\app.js); alles liegt im Browser-Speicher
 * und wird bei jedem Aufruf frisch angelegt.
 *
 * Die Schalter in der Adresse:
 *
 *     ?werkstatt                       angemeldet als „Werkstatt", Start
 *     &bildschirm=rangliste            gleich auf diesen Bildschirm (jede
 *                                      angemeldete Id, z. B. auch
 *                                      einstellungen seit 0.5.0)
 *     &modus=uebung                    beim Bildschirm wordle: welche Art
 *     &versuche=hause,tisch            angefangene Tageswort-Runde
 *     &datum=2026-09-24                so tun, als wäre heute dieser Tag
 *     &anmeldung                       NICHT angemeldet (Anmelde-Vollbild)
 *     &dunkel / &hell                  Darstellung festlegen (sonst wie
 *                                      das Gerät)
 *     &seriekarte                      die Serien-Karte offen zeigen (seit
 *                                      0.25.0; bis 0.24.0 &menue = das Menü
 *                                      hinter den drei Balken, das es nicht
 *                                      mehr gibt). Profil, Einstellungen,
 *                                      Freunde, Verwaltung über
 *                                      &bildschirm=… öffnen als Blatt über
 *                                      dem Start; &auch=einstellungen legt
 *                                      ein zweites Blatt darüber
 *     &felder=.a..e&stelle=2           beim Bildschirm wordle: die Zeile,
 *                                      in die getippt wird, vorbelegt
 *                                      („." = leer) und Feld 3 markiert
 *     &regel                           beim Bildschirm wordle: die
 *                                      Spielregel offen (seit 0.4.0)
 *     &intro / &intro=C                das UPCrew-Intro zeigen (sonst nie
 *                                      in der Werkstatt); mit Buchstabe
 *                                      A-F genau diese Art (seit 0.6.1)
 *     &schrift=S6 &knoepfe=K3          das gemeinsame Aussehen vorgeben
 *     &farbwelt=studio                 (seit 0.8.0; sonst der Standard des
 *                                      Bausteins). Im Tab „Sammlung" ist in
 *                                      der Werkstatt alles freigeschaltet;
 *                                      &bildschirm=sammlung zeigt ihn (bis
 *                                      0.8.1 hiess er „anpassen").
 *     &kachelset=neon                  das Kachel-Set (seit 0.14.0);
 *     &kachelwahl                      &kachelwahl = Leiste oben zum
 *                                      Durchschalten aller Sets + hell/dunkel
 *     &xp=640&serie=4                  der Fortschritt (seit 0.10.0): XP,
 *     &wort=3&brett=2                  Serie, heute geschaffte Figuren je
 *     &bxp=300&turm=1-0:3,2-1:2        Tagesaufgabe; seit 0.11.0 als
 *     &umzug                           Zweige (Blunderluck-XP und -Turm
 *                                      dazu), &umzug = flacher 0.10.0-
 *                                      Stand zum Umziehen; `&schutz` gibt
 *                                      es nicht mehr (Schutz = aus dem
 *                                      Level gerechnet)
 *     &lauf=1:12:01,2:3                die Bibliothek (seit 0.20.0): je Buch
 *                                      so viele Stationen gegangen, an den
 *                                      Gabelungen die Spur aus „01…"
 *                                      (js/bibliothek.js `gehen`); 1:99 =
 *                                      Buch 1 durch
 *     &bibliothek=2-7:1                rohe Figuren in turm.figuren (z. B.
 *                                      alte 0.18.x-Schlüssel für den Umzug)
 *     &art=ueben                       Art des Starts (Vorgabe Bibliothek)
 *     &buch=3&kap=2                    auf dem Start: dieses Buch / Kapitel
 *     &offen                           (seit 0.23.2) das Buch im Vollbild statt
 *                                      der Vorschau
 *                                      (ab 1) ansehen; &regal = das Regal;
 *                                      &blatt=station|gabel|boss = das
 *                                      Blatt von unten offen. Mit
 *                                      &bildschirm=wordle&modus=bibliothek:
 *                                      Buch und &station=12 der Runde, dazu
 *                                      &versuche=
 *     &herzen=2&effekt=fuenf&ueben     der Durchgang (seit 0.21.0, Gerät)
 *     &wieder=13,15                    im Buch &buch (Vorgabe 2): Herzen,
 *                                      Fund-Wirkung (doppelt|fuenf|zeit|
 *                                      wette), Rast „Üben", nach einem
 *                                      Rückfall neu zu spielende Stationen.
 *                                      &effekt/&ueben gelten auch für eine
 *                                      Runde mit &modus=bibliothek&versuche=
 *     &regeln=ohneGelb,hart,versuche7, eine Übungsrunde mit Regeln (seit
 *       zeit90,ohneTipp,                 0.19.0, js/wordle.js „DIE REGELN JE
 *       ohneLeben,ersteZeileBlind,      RUNDE"); mit &bildschirm=wordle
 *       ohneGrau                        &modus=uebung, dazu &versuche=…
 *     &anmeldung&konto=neu             das Formular „Neues UPCrew-Konto"
 *                                      (seit 0.18.5); dazu &eingabe=Name,
 *                                      Passwort,Wiederholung (vorbelegt),
 *                                      &senden (Knopf drücken: alle
 *                                      Meldungen), &absage=doppelt|netz|
 *                                      vorhanden (so, wie die Absage vom
 *                                      Server am Feld stünde)
 *
 * Ausgeliefert wird die Datei trotzdem: Ohne `?werkstatt` tut sie nichts,
 * und so sieht man auf dem Handy mit derselben Adresse dasselbe wie am Rechner.
 */

const WERKSTATT = {

    _parameter() {
        try {
            return new URLSearchParams(window.location.search);
        } catch (fehler) {
            return new URLSearchParams("");
        }
    },

    aktiv() {
        return WERKSTATT._parameter().has("werkstatt");
    },

    wert(name) {
        return WERKSTATT._parameter().get(name);
    },

    /* Das „Heute" der Werkstatt, oder null. */
    datum() {
        const wert = WERKSTATT.wert("datum");
        return (wert && /^\d{4}-\d{2}-\d{2}$/.test(wert)) ? wert : null;
    },

    /* Vor dem Start der App: alles frisch anlegen. */
    vorbereiten() {
        const speicher = window.localStorage;
        for (const schluessel of Object.keys(speicher)) {
            if (schluessel.indexOf("typoluck.") === 0) {
                speicher.removeItem(schluessel);
            }
        }
        /* Das Aussehen (seit 0.8.0 gemeinsam, js\upcrew-aussehen.js): erst
           auf den Standard des Bausteins zurück — sonst hinge jedes
           Bildschirmfoto davon ab, was vorher im Browser gewählt war —,
           dann die Schalter aus der Adresse. Unbekannte Werte verwirft der
           Baustein still. Die Werkstatt liegt auf localhost und teilt ihren
           Speicher nicht mit der ausgelieferten App. */
        if (typeof UPCREW_AUSSEHEN !== "undefined") {
            UPCREW_AUSSEHEN.setzen(Object.assign({}, UPCREW_AUSSEHEN.STANDARD));
            const wahl = {};
            for (const teil of ["farbwelt", "schrift", "knoepfe"]) {
                if (WERKSTATT.wert(teil)) {
                    wahl[teil] = WERKSTATT.wert(teil);
                }
            }
            UPCREW_AUSSEHEN.setzen(wahl);
        }
        /* Darstellung über denselben Weg wie die Einstellungen (seit
           0.6.0) — so zeigt auch der Einstellungen-Bildschirm die Wahl an. */
        if (WERKSTATT._parameter().has("dunkel")) {
            DARSTELLUNG.themaSetzen("dunkel");
        } else if (WERKSTATT._parameter().has("hell")) {
            DARSTELLUNG.themaSetzen("hell");
        }
        DARSTELLUNG.anwenden();

        /* `&kerbe` (seit 0.15.8): der iPhone-Streifen oben zum Ansehen am
           Rechner — 47 px statt env(safe-area-inset-top), das der Browser
           hier mit 0 liefert (css\stil.css `--oben-frei`). */
        if (WERKSTATT._parameter().has("kerbe")) {
            document.documentElement.style.setProperty("--oben-frei", "47px");
        }

        /* Das Kachel-Set (seit 0.14.0, js\kachelsets.js): `&kachelset=neon`
           zieht es an, sonst Papier. `&kachelwahl` legt oben eine Leiste
           zum schnellen Durchschalten aller Sets und von hell/dunkel über
           jeden Bildschirm — zum Aussuchen, welche Sets reinkommen. */
        KACHELSETS.waehlen(WERKSTATT.wert("kachelset") || KACHELSETS.STANDARD);
        if (WERKSTATT._parameter().has("kachelwahl")) {
            WERKSTATT._kachelwahlZeigen();
        }

        const heute = WORDLE.datumText(APP.jetzt());
        const namen = ["Werkstatt", "Anna", "Ben", "Clara", "Dora", "Emil"];
        const ids = namen.map((name) => "werkstatt-" + name.toLowerCase());

        /* Die Spielerliste: Werkstatt ist mit Anna, Ben und Clara befreundet,
           Dora hat angefragt, Emil ist ein Fremder. */
        let daten = SPIELER.leereDaten(1);
        namen.forEach((name, i) => {
            daten = SPIELER.spielerHinzufuegen(daten, name, ids[i], 1);
        });
        /* Nummern (seit 0.23.0 hinter jedem Namen zu sehen: „#Tag"). */
        daten.spieler.forEach((spieler, i) => {
            spieler.tag = String(4100 + i * 37);
        });
        for (const freund of [1, 2, 3]) {
            daten = SPIELER.freundHinzufuegen(daten, ids[0], ids[freund], 1);
            daten = SPIELER.freundHinzufuegen(daten, ids[freund], ids[0], 1);
        }
        daten = SPIELER.freundHinzufuegen(daten, ids[4], ids[0], 1);
        speicher.setItem(KONFIG.speicher.lokalerSchluesselSpieler, JSON.stringify(daten));

        /* Ergebnisse der letzten sieben Tage — erfunden, aber nach den
           echten Regeln gebaut (Muster passend zur Versuchszahl). */
        const spiel = { geaendertAm: 1, wordle: { tage: {}, verlauf: {} } };
        const tage = RANGLISTE.letzteTage(heute, 7);
        const plan = [
            [null, 3, 4, 2, 5, 0, 4],
            [3, 4, 6, 0, 3, 4, 5],
            [4, 2, 3, 5, 4, 3, 0],
            [5, 5, 0, 4, 6, 3, 4],
            [0, 3, 3, 0, 2, 4, 3],
            [6, 0, 0, 5, 0, 0, 5]
        ];
        plan.forEach((reihe, wer) => {
            reihe.forEach((versuche, tag) => {
                if (versuche === null) {
                    return;
                }
                const datum = tage[tag];
                const ergebnis = WERKSTATT._ergebnis(versuche, datum);
                spiel.wordle.tage[datum] = spiel.wordle.tage[datum] || {};
                spiel.wordle.tage[datum][ids[wer]] = ergebnis;
                spiel.wordle.verlauf[ids[wer]] = spiel.wordle.verlauf[ids[wer]] || {};
                spiel.wordle.verlauf[ids[wer]][datum] = ergebnis;
            });
        });
        speicher.setItem(KONFIG.speicher.lokalerSchluesselSpiel, JSON.stringify(spiel));

        if (!WERKSTATT._parameter().has("anmeldung")) {
            ICH.personSetzen(ids[0], namen[0]);
        }

        /* Der Fortschritt (seit 0.10.0, js\fortschritt.js) liegt unter
           `upcrew.fortschritt`, nicht unter „typoluck." — deshalb eigens
           frisch anlegen, auf Wunsch mit Werten aus der Adresse. Seit
           0.11.0 wird NUR der Eintrag der Werkstatt ersetzt: Auf dem
           gemeinsamen Server (8093) liegt daneben Blunderlucks Stand. */
        WERKSTATT._fortschrittAnlegen(speicher, ids[0], heute);
        WERKSTATT._durchgangAnlegen(ids[0]);

        /* Art des Starts und angesehenes Buch (seit 0.18.0). */
        if (WERKSTATT.wert("art") && typeof START.ART_SCHLUESSEL === "string") {
            speicher.setItem(START.ART_SCHLUESSEL, WERKSTATT.wert("art"));
        }
        if (WERKSTATT.wert("buch") && WERKSTATT.wert("bildschirm") !== "wordle") {
            START.buchBlick = parseInt(WERKSTATT.wert("buch"), 10) || null;
        }
        if (WERKSTATT.wert("kap")) {
            START.kapBlick = Math.max(0, (parseInt(WERKSTATT.wert("kap"), 10) || 1) - 1);
        }
        if (WERKSTATT._parameter().has("regal")) {
            START.regalOffen = true;
            START.buchOffen = true;
        }
        /* Seit 0.23.2: das Buch im Vollbild (&offen; &blatt öffnet es auch). */
        if (WERKSTATT._parameter().has("offen") || WERKSTATT.wert("blatt")) {
            START.buchOffen = true;
        }
        const versuche = WERKSTATT.wert("versuche");
        if (WERKSTATT.wert("regeln") !== null && WERKSTATT.wert("modus") === "uebung") {
            /* Eine Übungsrunde mit Regeln (seit 0.19.0). */
            let runde = WORDLE.neueRunde({ modus: "uebung", loesung: WORDLE.uebungswort(0.37), zeitpunkt: 1,
                regeln: WERKSTATT.regelnLesen(WERKSTATT.wert("regeln")) });
            for (const wort of (versuche || "").split(",").filter((w) => w)) {
                runde = WORDLE.raten(runde, wort, 2).runde;
            }
            ICH.spielstandSetzen("wordle-uebung", runde);
        } else if (versuche && WERKSTATT.wert("modus") === "bibliothek") {
            /* Eine angefangene Bibliothek-Runde: Wort aus dem Bereich (fest
               gezogen, Mitte der Liste), dann die Versuche. */
            const buch = parseInt(WERKSTATT.wert("buch"), 10) || 1;
            const station = parseInt(WERKSTATT.wert("station"), 10) || BIBLIOTHEK.NR_AB;
            const mitnahme = { effekt: WERKSTATT.wert("effekt") || "", ueben: WERKSTATT._parameter().has("ueben") ? 1 : 0 };
            let runde = WORDLE.neueRunde({ modus: "bibliothek", buch: buch, station: station,
                loesung: BIBLIOTHEK.wortZiehen(buch, station, 0.5, []), zeitpunkt: 1,
                regeln: BIBLIOTHEK.rundeRegeln(buch, station, mitnahme) || {}, mitnahme: mitnahme });
            for (const wort of versuche.split(",")) {
                runde = WORDLE.raten(runde, wort, 2).runde;
            }
            ICH.spielstandSetzen("wordle-bibliothek", runde);
        } else if (versuche) {
            const tag = WORDLE.tageswort(heute);
            let runde = WORDLE.neueRunde({ modus: "tag", datum: heute, nummer: tag.nummer,
                loesung: tag.wort, zeitpunkt: 1 });
            for (const wort of versuche.split(",")) {
                runde = WORDLE.raten(runde, wort, 2).runde;
            }
            ICH.spielstandSetzen("wordle-tag", runde);
        }
    },

    /*
     * Der Fortschritt der Werkstatt (seit 0.11.0 in der Zweig-Form):
     *   &xp=640      XP im Typoluck-Zweig
     *   &serie=4     so viele Tage am Stück bis heute (Typoluck)
     *   &wort=3      heute geschafftes Tageswort (Figuren)
     *   &brett=2     heute geschafftes Tagesbrett — als Blunderluck-Zweig,
     *                wie Blunderluck ihn schreibt (dazu &bxp= und &turm=
     *                „Ort-Stufe:Figuren,…", z. B. 1-0:3,2-1:2)
     *   &taten=zweiter-versuch,schwer-geloest   erfüllte Taten (seit 0.13.0)
     *   &umzug       statt allem: ein FLACHER 0.10.0-Stand, den die App
     *                beim Start umziehen lässt (zum Ansehen des Umzugs)
     */
    _fortschrittAnlegen(speicher, id, heute) {
        let alle = {};
        try {
            alle = JSON.parse(speicher.getItem(FORTSCHRITT.SCHLUESSEL) || "{}") || {};
        } catch (fehler) {
            alle = {};
        }
        delete alle[id];
        const zahl = (name) => Math.max(0, parseInt(WERKSTATT.wert(name), 10) || 0);
        const parameter = WERKSTATT._parameter();

        if (parameter.has("umzug")) {
            alle[id] = {
                stand: 1, xp: zahl("xp"), level: 1,
                serie: { tage: zahl("serie"), schutz: 0, zuletzt: zahl("serie") ? heute : "" },
                heute: { datum: heute, brett: 0, wort: Math.min(3, zahl("wort")), xp: 0 },
                turm: {}, taten: [],
                zaehler: { partien: Math.floor(zahl("xp") / 12), tagesaufgaben: zahl("serie"),
                    beideTage: 0, figuren: zahl("serie") * 2, besteSerie: zahl("serie") }
            };
        } else if (["xp", "serie", "brett", "wort", "bxp", "turm", "taten", "bibliothek", "lauf"].some((name) => parameter.has(name))) {
            const tage = [];
            let tag = heute;
            for (let i = 0; i < zahl("serie"); i++) {
                tage.unshift(tag);
                tag = FORTSCHRITT._vortag(tag);
            }
            const zweig = Object.assign(FORTSCHRITT.zweigLeer(), {
                xp: zahl("xp"), partien: Math.floor(zahl("xp") / 12), stand: 1, tage: tage,
                heute: { datum: heute, versuche: zahl("wort") ? 1 : 0, figuren: Math.min(3, zahl("wort")) }
            });
            Object.assign(zweig.zaehler, { tagesaufgaben: tage.length, besteSerie: tage.length,
                figuren: tage.length * 2, beideTage: zahl("brett") && zahl("wort") ? 1 : 0,
                koennenSumme: zweig.partien * 64, koennenAnzahl: zweig.partien,
                koennenBeste: zweig.partien ? 91 : 0 });
            zweig.taten = (WERKSTATT.wert("taten") || "").split(",").filter((id) => id);
            const turm = { figuren: WERKSTATT._bibliothekFiguren(WERKSTATT.wert("bibliothek") || ""), schwuere: {} };
            for (const teil of (WERKSTATT.wert("lauf") || "").split(",").filter((t) => t)) {
                const [b, schritte, wahl] = teil.split(":");
                BIBLIOTHEK.gehen(parseInt(b, 10) || 1, parseInt(schritte, 10) || 0, wahl || "0", turm);
            }
            if (Object.keys(turm.figuren).length || Object.keys(turm.schwuere).length) {
                zweig.turm = turm;
            }
            const eintrag = { version: FORTSCHRITT.VERSION, spiele: { typoluck: zweig } };
            if (parameter.has("brett") || parameter.has("bxp") || parameter.has("turm")) {
                const figuren = {};
                for (const teil of (WERKSTATT.wert("turm") || "").split(",")) {
                    const [stufe, anzahl] = teil.split(":");
                    if (/^\d{1,2}-\d{1,2}$/.test(stufe)) {
                        figuren[stufe] = Math.min(3, Math.max(1, parseInt(anzahl, 10) || 1));
                    }
                }
                eintrag.spiele.blunderluck = {
                    xp: zahl("bxp"), partien: Math.floor(zahl("bxp") / 10), gezaehlt: [], stand: 1,
                    turm: { figuren: figuren },
                    heute: { datum: heute, versuche: zahl("brett") ? 1 : 0, figuren: Math.min(3, zahl("brett")) },
                    tage: zahl("brett") ? [heute] : []
                };
            }
            alle[id] = eintrag;
        }
        speicher.setItem(FORTSCHRITT.SCHLUESSEL, JSON.stringify(alle));
    },

    /* Der Durchgang der Bibliothek (seit 0.21.0): &herzen= &effekt= &ueben
       &wieder= für das Buch &buch (Vorgabe 2) — wie APP ihn ablegt. */
    _durchgangAnlegen(id) {
        const p = WERKSTATT._parameter();
        if (!["herzen", "effekt", "ueben", "wieder"].some((name) => p.has(name))) {
            ICH.spielstandSetzen(APP.DURCHGANG, null);
            return;
        }
        const b = parseInt(WERKSTATT.wert("buch"), 10) || 2;
        const roh = {
            herzen: parseInt(WERKSTATT.wert("herzen"), 10) || BIBLIOTHEK.HERZEN,
            wieder: (WERKSTATT.wert("wieder") || "").split(",").map((t) => parseInt(t, 10)).filter((n) => n > 0),
            geheilt: [],
            ueben: p.has("ueben") ? 1 : 0,
            effekt: WERKSTATT.wert("effekt") || ""
        };
        const alle = {};
        alle[id] = {};
        alle[id][b] = BIBLIOTHEK.durchgangNormalisieren(roh, b);
        ICH.spielstandSetzen(APP.DURCHGANG, alle);
    },

    /* `&regeln=` lesen (seit 0.19.0): Liste von Stichworten → Regel-Objekt. */
    regelnLesen(text) {
        const regeln = {};
        for (const teil of String(text || "").split(",").map((t) => t.trim()).filter((t) => t)) {
            let treffer;
            if ((treffer = /^versuche(\d+)$/.exec(teil))) {
                regeln.versuche = Number(treffer[1]);
            } else if ((treffer = /^zeit(\d+)$/.exec(teil))) {
                regeln.zeit = Number(treffer[1]);
            } else if (["hart", "ohneTipp", "ohneLeben"].indexOf(teil) !== -1) {
                regeln[teil] = true;
            } else if (["ohneGelb", "ersteZeileBlind"].indexOf(teil) !== -1) {
                regeln.farben = teil;
            } else if (teil === "ohneGrau") {
                regeln.tastatur = "ohneGrau";
            }
        }
        return regeln;
    },

    /* `&bibliothek=` lesen: rohe Figuren „1-12:3,2-7:1". */
    _bibliothekFiguren(text) {
        const figuren = {};
        for (const teil of text.split(",")) {
            const [stelle, anzahl] = teil.split(":");
            if (/^\d{1,2}-\d{1,2}$/.test(stelle)) {
                figuren[stelle] = Math.min(3, Math.max(1, parseInt(anzahl, 10) || 1));
            }
        }
        return figuren;
    },

    /* Die Leiste zum Durchschalten (nur Werkstatt): oben die Sets, darunter
       hell/dunkel. Gebaut aus BAUSTEINE.segment — kein eigener Knopf. */
    _kachelwahlZeigen() {
        let leiste = document.getElementById("werkstatt-kachelwahl");
        if (!leiste) {
            leiste = BAUSTEINE.el("div", "werkstatt-kachelwahl");
            leiste.id = "werkstatt-kachelwahl";
            document.body.appendChild(leiste);
        }
        leiste.textContent = "";
        const sets = BAUSTEINE.segment(KACHELSETS.SETS.map((set) => ({ wert: set.id, text: set.name })),
            KACHELSETS.gewaehlt(), (id) => {
                KACHELSETS.waehlen(id);
                WERKSTATT._kachelwahlZeigen();
            }, "Kachel-Set");
        leiste.appendChild(sets);
        const modus = BAUSTEINE.segment([{ wert: "hell", text: "Hell" }, { wert: "dunkel", text: "Dunkel" }],
            DARSTELLUNG.modus(), (wert) => {
                DARSTELLUNG.themaSetzen(wert);
                WERKSTATT._kachelwahlZeigen();
            }, "Darstellung");
        leiste.appendChild(modus);
        const aktiv = sets.querySelector(".segment-aktiv");
        if (aktiv && aktiv.scrollIntoView) {
            aktiv.scrollIntoView({ block: "nearest", inline: "center" });
        }
    },

    /* Der Bildschirm, auf dem die App starten soll, samt Parameter. */
    startBildschirm() {
        const id = WERKSTATT.wert("bildschirm");
        if (!id) {
            return null;
        }
        return { id: id, parameter: { modus: WERKSTATT.wert("modus") || "tag",
            buch: parseInt(WERKSTATT.wert("buch"), 10) || 1,
            station: parseInt(WERKSTATT.wert("station"), 10) || BIBLIOTHEK.NR_AB } };
    },

    /* Nach dem ersten Zeigen: Zustände, die man sonst nur mit einem Tipp
       erreicht (offenes Menü, vorgetippte Felder). Geht über dieselben
       Wege wie ein echter Tipp — Modell und Navigation. */
    nachDemZeigen() {
        const auch = WERKSTATT.wert("auch");
        if (auch) {
            NAVIGATION.zeigen(auch, null, true);
        }
        if (WERKSTATT._parameter().has("seriekarte") && typeof START.serieOeffnen === "function") {
            START.serieOeffnen();
        }
        /* Das Blatt von unten (seit 0.20.0): wartende Station, Gabelung
           oder der Boss des angesehenen Buchs. */
        const blatt = WERKSTATT.wert("blatt");
        if (blatt && NAVIGATION.aktuell === "start" && typeof START.stationBlatt === "function") {
            const turm = APP.bibliothekStand();
            const b = START._buchNr();
            const lauf = BIBLIOTHEK.lauf(turm, b);
            if (blatt === "boss") {
                START.stationBlatt(b, BIBLIOTHEK.stationen(b).find((st) => st.art === "b").nr);
            } else if (blatt === "gabel" && lauf.gabel) {
                START.gabelBlatt(b, lauf.gabel);
            } else if (lauf.jetzt !== null) {
                START.stationBlatt(b, lauf.jetzt);
            } else if (lauf.gabel) {
                START.gabelBlatt(b, lauf.gabel);
            }
        }
        if (WERKSTATT._parameter().has("regel") && NAVIGATION.aktuell === "wordle") {
            WORDLE_BILDSCHIRM._anleitungZeigen();
        }
        const felder = WERKSTATT.wert("felder");
        if (felder && NAVIGATION.aktuell === "wordle" && WORDLE_BILDSCHIRM.eingabe) {
            let eingabe = WORDLE.leereEingabe();
            Array.from(felder).slice(0, WORDLE.LAENGE).forEach((zeichen, i) => {
                if (zeichen !== ".") {
                    eingabe = WORDLE.eingabeTippen(WORDLE.eingabeWaehlen(eingabe, i), zeichen);
                }
            });
            const stelle = parseInt(WERKSTATT.wert("stelle"), 10);
            WORDLE_BILDSCHIRM.eingabe = WORDLE.eingabeWaehlen(eingabe, stelle);
            WORDLE_BILDSCHIRM._aktiveZeileAuffrischen();
        }
    },

    /* Das Formular „Neues UPCrew-Konto" mit Fehleingaben (seit 0.18.5) —
       über dieselben Wege wie ein Tipp: Felder füllen (input-Ereignis),
       Knopf drücken; die Server-Absage über ANMELDUNG._kontoFertig. */
    _kontoFormularZeigen() {
        ANMELDUNG._kontoRegelnZeigen = true;
        ANMELDUNG.offen = true;
        ANMELDUNG._wurzelEl.hidden = false;
        document.body.classList.add("anmeldung-offen");
        ANMELDUNG._neuesKontoZeigen();
        const bloecke = Array.from(ANMELDUNG._wurzelEl.querySelectorAll(".feld-block"));
        const teile = bloecke.map((block) => ({ feld: block.querySelector("input"),
            fehler: block.querySelector(".feld-fehler") }));
        const werte = (WERKSTATT.wert("eingabe") || "").split(",");
        teile.forEach((teil, i) => {
            teil.feld.value = werte[i] || "";
            teil.feld.dispatchEvent(new Event("input"));
        });
        if (WERKSTATT._parameter().has("senden")) {
            const knopf = ANMELDUNG._wurzelEl.querySelector(".knopf-haupt");
            if (knopf) {
                knopf.click();
            }
        }
        const absage = WERKSTATT.wert("absage");
        if (absage) {
            const allgemein = { fehler: ANMELDUNG._wurzelEl.querySelector(".anmeldung-allgemein") };
            ANMELDUNG._kontoFertig({ ok: false, feld: KONTO.fehlerFeld(absage), fehler: absage,
                text: KONTO.fehlerText(absage) }, teile[0], () => true, "",
            { name: teile[0], passwort: teile[1], wiederholung: teile[2], allgemein: allgemein });
        }
    },

    /* 0 = nicht gelöst (sechs Versuche), sonst gelöst im n-ten Versuch. */
    _ergebnis(versuche, datum) {
        const muster = [];
        const anzahl = versuche === 0 ? 6 : versuche;
        const zwischen = ["FFVFF", "RFVFF", "RRFVF", "RRVRF", "RRRRF"];
        for (let i = 0; i < anzahl - 1; i++) {
            muster.push(zwischen[Math.min(i, zwischen.length - 1)]);
        }
        muster.push(versuche === 0 ? "RRFRF" : "RRRRR");
        return {
            geloest: versuche !== 0, versuche: anzahl, muster: muster,
            nummer: WORDLE.tageswort(datum).nummer,
            beendetAm: 1000 + versuche, dauerMs: 60000
        };
    }
};
