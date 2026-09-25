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
 *     &dunkel                          dunkle Darstellung erzwingen
 *     &menue                           das Menü hinter den drei Balken
 *                                      offen zeigen (seit 0.3.0, Start)
 *     &felder=.a..e&stelle=2           beim Bildschirm wordle: die Zeile,
 *                                      in die getippt wird, vorbelegt
 *                                      („." = leer) und Feld 3 markiert
 *     &regel                           beim Bildschirm wordle: die
 *                                      Spielregel offen (seit 0.4.0)
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
        if (WERKSTATT._parameter().has("dunkel")) {
            document.documentElement.dataset.darstellung = "dunkel";
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

        const versuche = WERKSTATT.wert("versuche");
        if (versuche) {
            const tag = WORDLE.tageswort(heute);
            let runde = WORDLE.neueRunde({ modus: "tag", datum: heute, nummer: tag.nummer,
                loesung: tag.wort, zeitpunkt: 1 });
            for (const wort of versuche.split(",")) {
                runde = WORDLE.raten(runde, wort, 2).runde;
            }
            ICH.spielstandSetzen("wordle-tag", runde);
        }
    },

    /* Der Bildschirm, auf dem die App starten soll, samt Parameter. */
    startBildschirm() {
        const id = WERKSTATT.wert("bildschirm");
        if (!id) {
            return null;
        }
        return { id: id, parameter: { modus: WERKSTATT.wert("modus") || "tag" } };
    },

    /* Nach dem ersten Zeigen: Zustände, die man sonst nur mit einem Tipp
       erreicht (offenes Menü, vorgetippte Felder). Geht über dieselben
       Wege wie ein echter Tipp — Modell und Navigation. */
    nachDemZeigen() {
        if (WERKSTATT._parameter().has("menue")) {
            NAVIGATION._menueOeffnen();
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
