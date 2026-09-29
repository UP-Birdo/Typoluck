/*
 * bildschirm-einstellungen.js — die Einstellungen: UPCrew-Konto, Aussehen,
 * Privatsphäre, „Nur in Typoluck", Hilfe, Admin, Über Typoluck.
 *
 * SEIT 0.25.0 EIN BLATT im gemeinsamen Aufbau js\upcrew-einstellungen.js
 * (gemeinsame Runde 7; Nutzer 28.09.2026: „verwalten und die einstellungen
 * sollen in beiden spielen gleich aussehen"). Die Reihenfolge der Abschnitte
 * legt der Baustein fest; hier steht nur, was Typoluck hat. Spiel-Eigenes
 * (Schwer-Modus) steht im Abschnitt „Nur in Typoluck". Erreichbar über das
 * Zahnrad im Profil (bis 0.24.0 im Menü hinter den drei Balken).
 *
 * Die Verwaltung (nur Admins) hat EINEN Weg: die Zeile im Abschnitt Admin
 * (seit 0.17.1, Nutzer 27.09.2026: „nur in den einstellungen … und nicht
 * doppelt irgendwo"; wie Blunderluck). Sie öffnet als Blatt darüber.
 */

const EINSTELLUNGEN_BILDSCHIRM = {

    STERN: "M12 3 L14.6 8.6 L20.5 9.3 L16 13.3 L17.3 19.2 L12 16.2 L6.7 19.2 L8 13.3 L3.5 9.3 L9.4 8.6 Z",

    anmelden() {
        NAVIGATION.anmelden({
            id: "einstellungen",
            titel: "Einstellungen",
            zeichen: "zahnrad",
            alsBlatt: true,
            zeigen: (behaelter) => EINSTELLUNGEN_BILDSCHIRM.zeigen(behaelter)
        });
    },

    zeigen(behaelter) {
        if (!NAVIGATION.imBlatt(behaelter)) {
            behaelter.appendChild(BAUSTEINE.kopfzeile("Einstellungen", {
                zurueck: () => NAVIGATION.zurueck()
            }));
        }
        const inhalt = BAUSTEINE.el("div", "einstellungen-inhalt");
        behaelter.appendChild(inhalt);
        UPCREW_EINSTELLUNGEN.bauen(inhalt, "einstellungen", EINSTELLUNGEN_BILDSCHIRM.abschnitte(),
            { spiel: "Typoluck" });
    },

    abschnitte() {
        return [
            EINSTELLUNGEN_BILDSCHIRM._kontoAbschnitt(),
            EINSTELLUNGEN_BILDSCHIRM._aussehenAbschnitt(),
            EINSTELLUNGEN_BILDSCHIRM._privatAbschnitt(),
            EINSTELLUNGEN_BILDSCHIRM._spielAbschnitt(),
            { art: "hilfe", zeilen: [
                { zeichen: "hilfe", titel: "Wunsch oder Fehler melden", rechts: "pfeil",
                    beiKlick: () => WUNSCH.oeffnen() }
            ] },
            EINSTELLUNGEN_BILDSCHIRM._adminAbschnitt(),
            EINSTELLUNGEN_BILDSCHIRM._ueberAbschnitt(),
            EINSTELLUNGEN_BILDSCHIRM._gefahrAbschnitt()
        ];
    },

    /*
     * 1. Das UPCrew-Konto — gilt in allen Spielen. Nur HIER steht die
     * Nummer (seit 0.15.6, wie Blunderluck v0.151.8). Ein Gast (seit
     * v0.2.0) sichert hier seinen Spielstand.
     */
    _kontoAbschnitt() {
        const ich = ANMELDUNG.ich();
        if (!ich) {
            return { art: "konto", zeilen: [{ zeichen: "person", titel: "Nicht angemeldet" }] };
        }
        const gast = ANMELDUNG.istGast();
        const mitNummer = KONTO.aktiv() && ich.gast !== true && !!ich.tag;
        const zeilen = [{
            zeichen: "person", titel: ich.name, tag: mitNummer ? "#" + ich.tag : "",
            unter: gast ? "Gast · nur dieses Gerät" : "Angemeldet · gilt in allen Spielen",
            klasse: "einstellungen-ich"
        }];
        if (gast) {
            zeilen.push({ zeichen: "hoch", titel: "Spielstand sichern", unter: "Konto anlegen · alle Geräte",
                rechts: "pfeil", beiKlick: () => ANMELDUNG.gastSichernOeffnen() });
        }
        zeilen.push({ zeichen: "person", titel: "Name ändern", rechts: "pfeil",
            beiKlick: () => ANMELDUNG.nameAendern() });
        if (mitNummer) {
            zeilen.push({ zeichen: "liste", titel: "Nummer ändern", rechts: "pfeil",
                beiKlick: () => ANMELDUNG.nummerAendern() });
        }
        zeilen.push({ zeichen: "schloss", titel: "Passwort ändern", rechts: "pfeil",
            beiKlick: () => ANMELDUNG.passwortAendern() });
        zeilen.push({ zeichen: "verlassen", titel: "Abmelden", beiKlick: () => ANMELDUNG.abmelden(false) });
        return { art: "konto", zeilen: zeilen };
    },

    /*
     * 2. Aussehen — über das gemeinsame UPCrew-Aussehen (seit 0.8.0,
     * js\darstellung.js → js\upcrew-aussehen.js), gilt auch in Blunderluck.
     * Anpassen führt auf die Seite „Sammlung".
     */
    _aussehenAbschnitt() {
        return { art: "aussehen", zeilen: [
            { zeichen: "farbe", titel: "Darstellung",
                rechts: UPCREW_EINSTELLUNGEN.segment([
                    { wert: "geraet", text: "Auto" },
                    { wert: "hell", text: "Hell" },
                    { wert: "dunkel", text: "Dunkel" }
                ], DARSTELLUNG.thema(), (wert) => DARSTELLUNG.themaSetzen(wert), "Darstellung") },
            { zeichen: "schrift", titel: "Standard-Schrift", unter: "immer die Leseschrift",
                rechts: UPCREW_EINSTELLUNGEN.schalter(DARSTELLUNG.leseschrift(),
                    (an) => DARSTELLUNG.leseschriftSetzen(an), "Standard-Schrift") },
            { zeichen: "sammlung", titel: "Anpassen", unter: "Farbwelt, Schrift, Knöpfe · Sammlung",
                rechts: "pfeil", beiKlick: () => NAVIGATION.zeigen("sammlung", null) }
        ] };
    },

    /*
     * 3. Privatsphäre — Spielzeit öffentlich zeigen? (seit 0.24.0, wie
     * Blunderluck v0.155.2: ein Feld AM KONTO, gilt in allen UPCrew-Spielen;
     * Standard privat). Nur mit echtem Konto.
     */
    _privatAbschnitt() {
        if (typeof SPIELZEIT === "undefined" || !SPIELZEIT._eigener()) {
            return { art: "privatsphaere", zeilen: [] };
        }
        return { art: "privatsphaere", zeilen: [
            { zeichen: "uhr", titel: "Spielzeit", unter: "Standard privat · sonst nur du und Admins",
                rechts: UPCREW_EINSTELLUNGEN.segment([
                    { wert: false, text: "Privat" },
                    { wert: true, text: "Öffentlich" }
                ], SPIELZEIT.oeffentlich(), (wert) => {
                    SPIELZEIT.oeffentlichSetzen(wert).then((ok) => {
                        if (!ok) {
                            DIALOG.kurzmeldung("Nicht gespeichert");
                        }
                        NAVIGATION.auffrischen();
                    });
                }, "Spielzeit") }
        ], hinweis: "Unter 1 h „N min“, danach „1h+“ · gezählt nur, solange die App sichtbar ist" };
    },

    /*
     * 4. Nur in Typoluck — der Schwer-Modus (seit 0.6.0). Gilt ab der
     * nächsten Runde — eine angefangene bleibt, wie sie war (js\wordle.js,
     * „Der Schwer-Modus"). Gespeichert je Gerät.
     */
    _spielAbschnitt() {
        return { art: "spiel", zeilen: [
            { zeichen: EINSTELLUNGEN_BILDSCHIRM.STERN, titel: "Schwer-Modus",
                unter: WORDLE.NAME + " · ab der nächsten Runde",
                rechts: UPCREW_EINSTELLUNGEN.schalter(WORDLE_BILDSCHIRM.schwerGewaehlt(), (an) => {
                    WORDLE_BILDSCHIRM.schwerSetzen(an);
                    NAVIGATION.auffrischen();
                }, "Schwer-Modus") }
        ] };
    },

    /* 5. Admin — die Verwaltung, nur für Admins. */
    _adminAbschnitt() {
        if (typeof VERWALTUNG_BILDSCHIRM === "undefined" || !VERWALTUNG_BILDSCHIRM.erlaubt()) {
            return { art: "admin", zeilen: [] };
        }
        return { art: "admin", zeilen: [
            { zeichen: "werkzeug", titel: "Verwaltung", unter: "nur Rolle Admin", rechts: "pfeil",
                beiKlick: () => NAVIGATION.zeigen("verwaltung", null) }
        ] };
    },

    /* 6. Über Typoluck — Version, Speicher, nicht gesendete Ergebnisse. */
    _ueberAbschnitt() {
        const zeilen = [
            { zeichen: "info", titel: "Über Typoluck", unter: "Ein Spiel von UPCrew",
                rechts: UPCREW_EINSTELLUNGEN.wert(KONFIG.APP_VERSION) },
            { zeichen: "datenbank", titel: "Speicher",
                rechts: UPCREW_EINSTELLUNGEN.wert(APP.spielSpeicher ? APP.spielSpeicher.beschreibung : "") }
        ];
        const offen = ICH.ausstehend().length;
        if (offen > 0) {
            zeilen.push({ zeichen: "liste", titel: "Nicht gesendet",
                rechts: UPCREW_EINSTELLUNGEN.wert(offen === 1 ? "1 Ergebnis" : offen + " Ergebnisse") });
        }
        return { art: "ueber", zeilen: zeilen };
    },

    /* 7. Ganz unten, rot: das Konto selbst löschen (seit v0.2.0) — gilt für
       alle Spiele von UPCrew, die Rückfrage stellt die Anmeldung. */
    _gefahrAbschnitt() {
        if (!KONTO.aktiv() || !ANMELDUNG.ich()) {
            return { art: "gefahr", zeilen: [] };
        }
        return { art: "gefahr", zeilen: [
            { titel: "UPCrew-Konto löschen", gefahr: true, beiKlick: () => ANMELDUNG.kontoLoeschen() }
        ] };
    }
};
