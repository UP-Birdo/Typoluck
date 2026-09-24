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
        const spieler = speicherErzeugen(KONFIG.speicher, KONFIG.speicher.spielerPfad,
            KONFIG.speicher.lokalerSchluesselSpieler, erzwungen);
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

        /* 3. Bildschirme — die Reihenfolge ist die der Leiste unten. */
        START.anmelden();
        RANGLISTE_BILDSCHIRM.anmelden();
        FREUNDE_BILDSCHIRM.anmelden();
        PROFIL_BILDSCHIRM.anmelden();
        WORDLE_BILDSCHIRM.anmelden();
        NAVIGATION.starten(document.getElementById("inhalt"), document.getElementById("leiste"), "start");

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
           gingen verloren) oder während jemand in ein Feld schreibt. */
        const fokus = document.activeElement;
        const schreibt = fokus && (fokus.tagName === "INPUT" || fokus.tagName === "TEXTAREA");
        if (NAVIGATION.aktuell !== "wordle" && !schreibt && !ANMELDUNG.offen) {
            NAVIGATION.auffrischen();
        }
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

        const nachgereicht = await ERGEBNISSE.nachreichen(APP.spielSpeicher);
        if (nachgereicht.gesendet > 0) {
            DIALOG.kurzmeldung(nachgereicht.gesendet === 1 ? "1 Ergebnis nachgereicht"
                : nachgereicht.gesendet + " Ergebnisse nachgereicht");
        }
        await APP._eigenenVerlaufLaden();
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
                + ". Neu laden hilft meistens; melde es gern über dein Profil.");
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
