/*
 * app.js — der Startpunkt. Verbindet die Teile und hält, was allen gehört.
 *
 * Reihenfolge beim Start:
 *   1. Dialoge und Fehlerfang aufbauen.
 *   2. Speicher wählen (gemeinsam oder lokal; Werkstatt = immer lokal).
 *   3. Bildschirme anmelden und den ersten zeigen.
 *   4. Spielerliste laden — die Anmeldung entscheidet danach, ob das
 *      Anmelde-Vollbild kommt.
 *   5. Nach der Anmeldung: eigenen Verlauf holen, liegengebliebene
 *      Ergebnisse nachreichen.
 */

const APP = {

    spielerSpeicher: null,
    spielSpeicher: null,
    abgleich: null,

    /* Der eigene Wordle-Verlauf { datum: ERGEBNIS } — für „heute schon
       gespielt?" auf jedem Gerät, auch wenn die Runde woanders lief. */
    eigenerVerlauf: {},

    /* „Jetzt" — an EINER Stelle, damit die Werkstatt einen Tag vorgeben kann. */
    jetzt() {
        const datum = (typeof WERKSTATT !== "undefined" && WERKSTATT.aktiv()) ? WERKSTATT.datum() : null;
        if (datum) {
            const [jahr, monat, tag] = datum.split("-").map(Number);
            const heute = new Date();
            return new Date(jahr, monat - 1, tag, heute.getHours(), heute.getMinutes(), heute.getSeconds());
        }
        return new Date();
    },

    /* Das eigene Ergebnis eines Tages — aus der Datenbank oder aus der
       Warteliste des Geräts. */
    eigenesErgebnis(datum) {
        const ich = ANMELDUNG.ich();
        if (!ich || !datum) {
            return null;
        }
        return ERGEBNISSE.verlaufMitAusstehendem(APP.eigenerVerlauf, ich.id)[datum] || null;
    },

    async starten() {
        DIALOG.aufbauen(document.getElementById("dialog"), document.getElementById("kurzmeldung"));
        APP._fehlerFangen();

        /* Das UPCrew-Intro legt sich über alles; die App lädt darunter
           weiter, deshalb wird hier NICHT darauf gewartet. */
        INTRO.zeigen(document.getElementById("intro"));

        /* 2. Speicher */
        const werkstatt = WERKSTATT.aktiv();
        if (werkstatt) {
            WERKSTATT.vorbereiten();
        }
        const erzwungen = werkstatt ? "lokal" : null;

        /* Der Fortschritt zieht einmal in die Zweig-Form um (seit 0.11.0,
           js\fortschritt.js, „DER UMZUG") — vor dem ersten Bildschirm, damit
           jeder schon die neue Form sieht. Tut nichts, wenn alles umgezogen
           ist. */
        FORTSCHRITT.umziehenAlle();

        /* Das UPCrew-Konto (seit v0.2.0, js\konto.js) — nie in der Werkstatt,
           die immer lokal spielt. Jede Anfrage an die Datenbank trägt den
           Anmelde-Schlüssel; die Regeln lassen nur angemeldete Konten
           schreiben, und jedes nur seinen eigenen Eintrag. */
        if (!werkstatt) {
            KONTO.einrichten(KONFIG);
        }
        if (KONTO.aktiv()) {
            SpeicherGemeinsam.tokenGeber = () => KONTO.token();
            KONTO.beiVerloren = () => ANMELDUNG.sitzungVerloren();
        }

        const spieler = speicherErzeugen(KONFIG.speicher, KONFIG.speicher.spielerPfad,
            KONFIG.speicher.lokalerSchluesselSpieler, erzwungen,
            KONTO.aktiv() ? {
                eigeneUid: () => KONTO.uid(),
                aufbereiten: (roh) => SPIELER.normalisieren(roh)
            } : null);
        const spiel = speicherErzeugen(KONFIG.speicher, KONFIG.speicher.spielPfad,
            KONFIG.speicher.lokalerSchluesselSpiel, erzwungen);
        APP.spielerSpeicher = spieler.speicher;
        APP.spielSpeicher = spiel.speicher;
        if (spieler.hinweis) {
            APP.hinweisZeigen(spieler.hinweis);
        }

        APP.abgleich = new Abgleich(APP.spielerSpeicher, KONFIG.speicher, {
            beiDaten: () => APP._beiSpielerDaten(),
            beiStatus: (status, text) => APP._beiStatus(status, text)
        });
        ANMELDUNG.verbinden(APP.abgleich, document.getElementById("anmeldung"));
        ANMELDUNG.beiAngemeldet = () => APP._beiAngemeldet();

        /* Das gemeinsame Aussehen (seit 0.8.0): am Konto mitführen und auf
           Änderungen horchen — auch auf die aus Blunderluck. */
        AUSSEHEN_ABGLEICH.einrichten(APP.spielerSpeicher, () => APP._aussehenUid());
        APP._aussehenBeobachten();

        /* Der Fortschritt am Konto (seit 0.15.1, Regel §11b eingespielt):
           dieselben Leute wie beim Aussehen — nur echte Konten. */
        FORTSCHRITT_ABGLEICH.einrichten(APP.spielerSpeicher, () => APP._aussehenUid(), () => APP.fortschrittId());

        /* 3. Bildschirme — die Reihenfolge ist die im Menü hinter den drei
           Balken (seit 0.3.0; wie Blunderluck: Profil zuerst; seit 0.5.0
           Einstellungen als letzter Eintrag). Die Leiste unten führt ihre
           Einträge selbst (NAVIGATION.LEISTE). */
        START.anmelden();
        PROFIL_BILDSCHIRM.anmelden();
        FREUNDE_BILDSCHIRM.anmelden();
        EINSTELLUNGEN_BILDSCHIRM.anmelden();
        RANGLISTE_BILDSCHIRM.anmelden();
        HERAUSFORDERUNGEN_BILDSCHIRM.anmelden();
        SAMMLUNG_BILDSCHIRM.anmelden();
        WORDLE_BILDSCHIRM.anmelden();
        NAVIGATION.starten(document.getElementById("inhalt"), "start", document.getElementById("leiste"));

        /* 4. Spielerliste */
        APP._gestartet = true;
        await APP.abgleich.starten();

        APP._serviceWorkerAnmelden(werkstatt);
    },

    /* ---------------------------------------------------------------- *
     * Rückrufe
     * ---------------------------------------------------------------- */

    _beiSpielerDaten() {
        if (!APP._gestartet) {
            return;
        }
        ANMELDUNG.pruefen(APP.abgleich.geladen);

        const ich = ANMELDUNG.ich();
        NAVIGATION.markeSetzen("freunde", ich
            ? SPIELER.freundeVon(APP.abgleich.daten, ich.id).offen.length : 0);

        /* Neu zeichnen — ausser mitten im Spiel (die getippten Buchstaben
           gingen verloren), im Tab „Sammlung" (der Entwurf ginge verloren;
           der Tab zeichnet sich selbst, seit 0.8.0) oder während jemand in
           ein Feld schreibt. */
        const fokus = document.activeElement;
        const schreibt = fokus && (fokus.tagName === "INPUT" || fokus.tagName === "TEXTAREA");
        if (APP.UNGESTOERT.indexOf(NAVIGATION.aktuell) === -1 && !schreibt && !ANMELDUNG.offen) {
            NAVIGATION.auffrischen();
        }
    },

    /* Bildschirme, die neue Daten oder ein neues Aussehen NICHT neu bauen:
       das laufende Spiel und der Entwurf im Tab „Sammlung" (bis 0.8.1
       „Anpassen"). */
    UNGESTOERT: ["wordle", "sammlung"],

    /* ---------------------------------------------------------------- *
     * Das gemeinsame Aussehen (seit 0.8.0, js\upcrew-aussehen.js)
     * ---------------------------------------------------------------- */

    /* Wer sein Aussehen am Konto mitführt: nur angemeldete Spieler mit
       UPCrew-Konto — Gäste und die Werkstatt nicht. */
    _aussehenUid() {
        if (!KONTO.aktiv() || !ANMELDUNG.ich() || ANMELDUNG.istGast() || KONTO.istGastSitzung()) {
            return null;
        }
        return KONTO.uid();
    },

    /*
     * Der Baustein meldet jede Änderung mit ihrer Quelle:
     *   "selbst"      in DIESER App gewählt (Einstellungen, Anpassen) —
     *                 dann ans Konto schicken
     *   "andere-app"  Blunderluck im selben Browser, "konto" vom Konto,
     *   "geraet"      das Gerät wechselt hell/dunkel
     * Angewendet hat er schon selbst (Farben, Schrift, Knöpfe hängen an
     * <html>). Neu gebaut wird nur, was die Wahl als Text zeigt — die
     * Einstellungen; Spiel und Anpassen-Tab bleiben ungestört.
     */
    _aussehenBeobachten() {
        UPCREW_AUSSEHEN.beobachten((aussehen, quelle) => {
            if (quelle === "selbst") {
                AUSSEHEN_ABGLEICH.senden();
            }
            if (APP.UNGESTOERT.indexOf(NAVIGATION.aktuell) === -1) {
                NAVIGATION.auffrischen();
            }
        });
        /* Zurück in den Vordergrund: am Konto nachsehen, ob ein anderes
           Gerät umgestellt hat. */
        document.addEventListener("visibilitychange", () => {
            if (document.visibilityState === "visible") {
                AUSSEHEN_ABGLEICH.holen();
                APP._fortschrittHolen();
            }
        });
    },

    _beiStatus(status, text) {
        if (status === "fehler") {
            APP.hinweisZeigen(text);
        } else if (status === "bereit") {
            APP.hinweisZeigen("");
        }
    },

    async _beiAngemeldet() {
        const ich = ANMELDUNG.ich();
        if (!ich) {
            return;
        }
        NAVIGATION.markeSetzen("freunde", SPIELER.freundeVon(APP.abgleich.daten, ich.id).offen.length);

        const ziel = WERKSTATT.aktiv() ? WERKSTATT.startBildschirm() : null;
        if (ziel) {
            NAVIGATION.zeigen(ziel.id, ziel.parameter, true);
        } else {
            NAVIGATION.auffrischen();
        }
        if (WERKSTATT.aktiv()) {
            WERKSTATT.nachDemZeigen();
        }

        /* Das Aussehen vom Konto (seit 0.8.0): hat ein anderes Gerät
           zuletzt umgestellt, gilt das jetzt auch hier. */
        await AUSSEHEN_ABGLEICH.holen();
        /* Der Fortschritt vom Konto (seit 0.15.1). */
        await APP._fortschrittHolen();

        const nachgereicht = await ERGEBNISSE.nachreichen(APP.spielSpeicher);
        if (nachgereicht.gesendet > 0) {
            DIALOG.kurzmeldung(nachgereicht.gesendet === 1 ? "1 Ergebnis nachgereicht"
                : nachgereicht.gesendet + " Ergebnisse nachgereicht");
        }
        await APP._eigenenVerlaufLaden();

        /* Ein Gast wird hin und wieder gefragt, ob er sichern will (v0.2.0). */
        await ANMELDUNG.gastErinnern();
    },

    async _eigenenVerlaufLaden() {
        const ich = ANMELDUNG.ich();
        if (!ich) {
            return;
        }
        try {
            APP.eigenerVerlauf = await ERGEBNISSE.verlaufLaden(APP.spielSpeicher, ich.id);
        } catch (fehler) {
            /* Ohne Verlauf läuft alles weiter — nur „heute schon auf einem
               anderen Gerät gespielt" kann dann nicht erkannt werden. */
            return;
        }
        if (NAVIGATION.aktuell === "start") {
            NAVIGATION.auffrischen();
        }
    },

    /* Ein fertiges Tageswort — vom Wordle-Bildschirm gerufen. */
    async ergebnisMelden(runde) {
        const ich = ANMELDUNG.ich();
        if (!ich) {
            return;
        }
        APP.eigenerVerlauf[runde.datum] = ERGEBNISSE.ausRunde(runde);
        PROFIL_BILDSCHIRM._fuerId = null;

        const antwort = await ERGEBNISSE.melden(APP.spielSpeicher, ich.id, runde);
        if (antwort.fehler) {
            DIALOG.kurzmeldung("Ergebnis auf diesem Gerät gemerkt — es wird gesendet, "
                + "sobald die Verbindung klappt.", 4000);
        }
    },

    /* ---------------------------------------------------------------- *
     * Der Fortschritt (seit 0.10.0, UPCrew-Runde 5): Level, XP, Heute
     * ---------------------------------------------------------------- */

    /* Die Stufen des Aussehens (für die Belohnungen je Level) — allein aus
       dem Baustein, nie hier festgeschrieben. Seit 0.15.0 dazu die
       Kachel-Sets, die über das Level kommen (aus js\sammlung.js). */
    _stufen() {
        const stufen = { kachelset: SAMMLUNG.kachelsetStufen() };
        if (typeof UPCREW_ANPASSEN === "undefined") {
            return stufen;
        }
        return Object.assign({}, UPCREW_ANPASSEN.STUFEN, stufen);
    },

    /* Der eigene Fortschritt (ohne Anmeldung: der leere) — alle Zweige,
       also auch der von Blunderluck (seit 0.11.0). */
    fortschritt() {
        APP._gastUmzug();
        /* Seit 0.15.1 mit dem Stand vom Konto (je Zweig der neuere). */
        return FORTSCHRITT_ABGLEICH.mitKonto(FORTSCHRITT.laden(APP.fortschrittId()));
    },

    /* Den Fortschritt vom Konto holen; hat sich etwas geändert, neu
       zeichnen (ausser mitten im Spiel oder in der Sammlung). */
    async _fortschrittHolen() {
        const geaendert = await FORTSCHRITT_ABGLEICH.holen();
        if (geaendert && APP.UNGESTOERT.indexOf(NAVIGATION.aktuell) === -1) {
            NAVIGATION.auffrischen();
        }
    },

    /* Ein Gast von 0.10.0 stand unter seiner Konto-Id — sein Stand zieht
       einmal unter „gast" um (seit 0.11.0). Tut nichts, wenn „gast" schon
       einen Typoluck-Zweig hat. */
    _gastUmzug() {
        const ich = ICH.person();
        if (ich && ich.id && APP.fortschrittId() === FORTSCHRITT.GAST) {
            FORTSCHRITT.gastUebernehmen(ich.id);
        }
    },

    /* Unter welchem Eintrag der Fortschritt steht — wie Blunderluck
       (js\fortschritt-konto.js `_person`, seit v0.150.0): die Spieler-Id
       des eigenen Kontos, für Gäste und Nicht-Angemeldete „gast". Nur so
       sehen beide Spiele im selben Browser denselben Eintrag. */
    fortschrittId() {
        const ich = ICH.person();
        const gast = typeof ANMELDUNG !== "undefined" && ANMELDUNG.istGast();
        return (ich && ich.id && !gast) ? ich.id : FORTSCHRITT.GAST;
    },

    /* Das Level über alle Spiele: { level, hat, kosten }. */
    level() {
        return FORTSCHRITT.level(APP.fortschritt());
    },

    /*
     * Eine beendete Runde zählt: Wertung rechnen (js\wertung.js), dann XP,
     * Heute und Serie (js\fortschritt.js). Vom Wordle-Bildschirm gerufen,
     * GENAU EINMAL je Runde — im Augenblick, in dem sie endet. Das Tageswort
     * ist nur am eigenen Tag die Tagesaufgabe; Figuren gibt es nur dort (in
     * der Übung nur die Partie). Liefert { wertung, ergebnis } oder null.
     */
    fortschrittMelden(runde) {
        const wertung = WERTUNG.runde(runde);
        if (!wertung) {
            return null;
        }
        const datum = WORDLE.datumText(APP.jetzt());
        const tagesaufgabe = runde.modus === "tag" && runde.datum === datum;
        APP._gastUmzug();
        /* Gerechnet wird mit dem Konto-Stand dazu (Level, Serie, ×1,5 aus
           Blunderlucks Zweig vom Konto); geschrieben wird nur der eigene
           Zweig — aufs Gerät, danach ans Konto (seit 0.15.1). */
        const ergebnis = FORTSCHRITT.aendern(APP.fortschrittId(), (stand) => FORTSCHRITT.partie(
            FORTSCHRITT_ABGLEICH.mitKonto(stand), {
            datum: datum,
            tagesaufgabe: tagesaufgabe,
            figuren: tagesaufgabe ? wertung.figuren : 0,
            stufe: WERTUNG.schwierigkeit(runde.loesung),
            koennen: wertung.genauigkeit,
            zeitpunkt: Date.now(),
            geloest: runde.zustand === "gewonnen",
            versuche: runde.versuche.length,
            schwer: runde.schwer === true
        }, APP._stufen()));
        FORTSCHRITT_ABGLEICH.senden(ergebnis.stand);

        /* Level-Aufstieg und neue Stücke aus Taten (seit 0.13.0) als EINE
           Kurzmeldung — die Namen der Stücke kennt das Sammlungs-Modell. */
        const meldung = [];
        if (ergebnis.levelNachher > ergebnis.levelVorher) {
            meldung.push("Level " + ergebnis.levelNachher);
        }
        for (const stueck of SAMMLUNG.stueckeZuTaten(ergebnis.taten)) {
            meldung.push("Neu: " + stueck.name);
        }
        /* Kachel-Sets, die mit dem Level kamen (seit 0.15.0). */
        const namen = SAMMLUNG.kachelsetNamen();
        for (const belohnung of ergebnis.neu.filter((b) => b.art === "kachelset")) {
            meldung.push("Neu: " + (namen[belohnung.name] || belohnung.name));
        }
        if (meldung.length) {
            DIALOG.kurzmeldung(meldung.join(" · "), 2500);
        }
        return { wertung: wertung, ergebnis: ergebnis };
    },

    /* ---------------------------------------------------------------- *
     * Hinweisstreifen oben und Fehlerfang
     * ---------------------------------------------------------------- */

    hinweisZeigen(text) {
        const streifen = document.getElementById("hinweis");
        streifen.textContent = text || "";
        streifen.hidden = !text;
    },

    /* Ein unerwarteter Fehler soll nicht still verschwinden: Er steht oben
       im Streifen, mit dem Satz, den ein Wunsch-Eintrag bräuchte. */
    _fehlerFangen() {
        window.addEventListener("error", (ereignis) => {
            APP.hinweisZeigen("Da ist etwas schiefgegangen: " + (ereignis.message || "unbekannter Fehler")
                + ". Neu laden hilft meistens; melde es gern über die Einstellungen.");
        });
        window.addEventListener("unhandledrejection", (ereignis) => {
            const grund = ereignis.reason && ereignis.reason.message ? ereignis.reason.message : String(ereignis.reason);
            APP.hinweisZeigen("Da ist etwas schiefgegangen: " + grund);
        });
    },

    /* ---------------------------------------------------------------- *
     * Der Service Worker (sw.js) — offline starten, installierbar
     * ---------------------------------------------------------------- */

    _serviceWorkerAnmelden(werkstatt) {
        /* Nicht in der Werkstatt (Bildschirmfotos brauchen frische Dateien)
           und nicht unter file:// (dort gibt es keinen Worker). */
        if (werkstatt || !("serviceWorker" in navigator) || window.location.protocol === "file:") {
            return;
        }
        navigator.serviceWorker.register("sw.js").catch(() => {
            /* Ohne Worker läuft die App trotzdem — nur nicht offline. */
        });
    }
};

document.addEventListener("DOMContentLoaded", () => APP.starten());
