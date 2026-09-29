/*
 * bildschirm-einstellungen.js — die Einstellungen: UPCrew-Konto, Aussehen,
 * Privatsphäre, „Nur in Typoluck", Hilfe, Admin, Über Typoluck.
 *
 * SEIT 0.25.0 EIN BLATT im gemeinsamen Aufbau js\upcrew-einstellungen.js
 * (gemeinsame Runde 7; Nutzer 28.09.2026: „verwalten und die einstellungen
 * sollen in beiden spielen gleich aussehen"). Die Reihenfolge der Abschnitte
 * legt der Baustein fest; hier steht nur, was Typoluck hat. Erreichbar über
 * das Zahnrad im Profil (bis 0.24.0 im Menü hinter den drei Balken).
 *
 * SEIT 0.26.0 (Nutzer 29.09.2026: „mach den schweren modus raus · bei
 * speicher mache eine status lampe rein · was macht standart schrift?
 * brauchen wir eigentlich nicht · zu viele texte sätze"): kein Abschnitt
 * „Nur in Typoluck" mehr (der Schwer-Modus ist weg), kein Schalter
 * „Standard-Schrift", der Speicher mit Status-Lampe (`lampeZustand`), alle
 * Unterzeilen höchstens drei Wörter.
 *
 * Die Verwaltung (nur Admins) hat EINEN Weg: die Zeile im Abschnitt Admin
 * (seit 0.17.1, Nutzer 27.09.2026: „nur in den einstellungen … und nicht
 * doppelt irgendwo"; wie Blunderluck). Sie öffnet als Blatt darüber.
 */

const EINSTELLUNGEN_BILDSCHIRM = {

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
        EINSTELLUNGEN_BILDSCHIRM._lampe = null;
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
            { art: "hilfe", zeilen: [
                { zeichen: "hilfe", titel: "Wunsch oder Fehler", rechts: "pfeil",
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
            unter: gast ? "Gast · nur Gerät" : "Alle Spiele",
            klasse: "einstellungen-ich"
        }];
        if (gast) {
            zeilen.push({ zeichen: "hoch", titel: "Spielstand sichern", unter: "Konto anlegen",
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
            { zeichen: "sammlung", titel: "Anpassen", unter: "Farbe · Schrift · Knöpfe",
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
            { zeichen: "uhr", titel: "Spielzeit",
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
        ], hinweis: "Nur sichtbar gezählt" };
    },

    /* 4. Admin — die Verwaltung, nur für Admins. */
    _adminAbschnitt() {
        if (typeof VERWALTUNG_BILDSCHIRM === "undefined" || !VERWALTUNG_BILDSCHIRM.erlaubt()) {
            return { art: "admin", zeilen: [] };
        }
        return { art: "admin", zeilen: [
            { zeichen: "werkzeug", titel: "Verwaltung", rechts: "pfeil",
                beiKlick: () => NAVIGATION.zeigen("verwaltung", null) }
        ] };
    },

    /*
     * 5. Über Typoluck — Version, Speicher mit Status-Lampe (seit 0.26.0),
     * nicht gesendete Ergebnisse.
     *
     * DIE LAMPE rechnet `lampeZustand` (rein) aus dem ECHTEN Zustand:
     *   rot „Keine Verbindung"  offline (navigator.onLine false) oder der
     *                           letzte Abgleich der Konten bzw. des
     *                           Fortschritts ist gescheitert
     *   gelb „Wartet"           es wird gerade geladen/geschrieben, oder
     *                           Ergebnisse warten noch auf dem Gerät
     *   grün „Gespeichert"      sonst
     * Die Zeile stellt sich bei jedem Speicher-Ereignis um
     * (`lampeAuffrischen`, gerufen aus js\app.js).
     */
    _lampe: null,

    lampeZustand(lage) {
        const l = lage || {};
        if (l.online === false || l.status === "fehler" || l.fortschritt === "fehler") {
            return "offline";
        }
        if (l.status === "laedt" || l.status === "schreibt" || l.fortschritt === "wartet" || l.ausstehend > 0) {
            return "wartet";
        }
        return "gespeichert";
    },

    lampeAuffrischen() {
        const lampe = EINSTELLUNGEN_BILDSCHIRM._lampe;
        if (lampe && lampe.isConnected !== false && typeof lampe.setzen === "function") {
            return lampe.setzen(EINSTELLUNGEN_BILDSCHIRM.lampeZustand(APP.speicherLage()));
        }
        return null;
    },

    _ueberAbschnitt() {
        const speicher = UPCREW_EINSTELLUNGEN.speicherZeile(
            EINSTELLUNGEN_BILDSCHIRM.lampeZustand(APP.speicherLage()));
        EINSTELLUNGEN_BILDSCHIRM._lampe = speicher.lampe;
        const zeilen = [
            { zeichen: "info", titel: "Typoluck", unter: "von UPCrew",
                rechts: UPCREW_EINSTELLUNGEN.wert(KONFIG.APP_VERSION) },
            speicher
        ];
        const offen = ICH.ausstehend().length;
        if (offen > 0) {
            zeilen.push({ zeichen: "liste", titel: "Nicht gesendet",
                rechts: UPCREW_EINSTELLUNGEN.wert(offen === 1 ? "1 Ergebnis" : offen + " Ergebnisse") });
        }
        return { art: "ueber", zeilen: zeilen };
    },

    /* 6. Ganz unten, rot: das Konto selbst löschen (seit v0.2.0) — gilt für
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
