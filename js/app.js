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
        /* Für den Notfall-Weg in index.html (seit 0.15.4): „die App hat
           gestartet". Fehlt das nach 10 s, räumt er Worker und Speicher. */
        window.TYPOLUCK_GESTARTET = true;
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
        /* Die Status-Lampe der Einstellungen (seit 0.26.0) folgt jedem
           Speicher-Ereignis: Konten-Abgleich, Fortschritt, Netz an/aus. */
        FORTSCHRITT_ABGLEICH.beiZustand = () => APP._lampeAuffrischen();
        window.addEventListener("online", () => APP._lampeAuffrischen());
        window.addEventListener("offline", () => APP._lampeAuffrischen());

        /* Spielzeit und „dabei seit" (seit 0.24.0, wie Blunderluck v0.155.0):
           gezählt, solange die Seite sichtbar ist — auch als Gast. */
        if (typeof SPIELZEIT !== "undefined") {
            SPIELZEIT.starten();
        }

        /* Wortstatistik und Spieler-Stufe (seit 0.23.1, js/wortstatistik-
           abgleich.js): gesendet wird nur unter Regel §12, auf
           `typoluck-intern` — in der Werkstatt nie. */
        const intern = (KONTO.aktiv() && KONFIG.speicher.firebaseBasis && KONFIG.speicher.modus === "gemeinsam")
            ? new SpeicherGemeinsam(KONFIG.speicher.firebaseBasis, APP.INTERN_PFAD) : null;
        APP.internSpeicher = intern;
        /* Nur wenn die Datei da ist (eine alte, noch zwischengespeicherte Seite
           ohne sie darf nicht scheitern). */
        if (typeof WORTSTATISTIK_ABGLEICH !== "undefined") {
            WORTSTATISTIK_ABGLEICH.einrichten(intern, APP.spielerSpeicher, () => APP._aussehenUid(),
                () => APP.fortschrittId(), () => APP._echtesKonto());
        }

        /* 3. Bildschirme. Die Leiste unten führt ihre Einträge selbst
           (NAVIGATION.LEISTE); Profil, Einstellungen und Verwaltung öffnen
           seit 0.25.0 als Blatt (das Menü hinter den drei Balken ist weg).
           Die Freunde sind seit 0.26.0 ein Reiter der Rangliste (keine
           eigene Seite mehr, js/bildschirm-freunde.js baut nur den Inhalt). */
        START.anmelden();
        PROFIL_BILDSCHIRM.anmelden();
        SHOP_BILDSCHIRM.anmelden();
        VERWALTUNG_BILDSCHIRM.anmelden();
        EINSTELLUNGEN_BILDSCHIRM.anmelden();
        RANGLISTE_BILDSCHIRM.anmelden();
        HERAUSFORDERUNGEN_BILDSCHIRM.anmelden();
        SAMMLUNG_BILDSCHIRM.anmelden();
        WORDLE_BILDSCHIRM.anmelden();
        /* Seit 0.25.0 mit dem Halter der Blätter (js/upcrew-blatt.js). */
        NAVIGATION.starten(document.getElementById("inhalt"), "start", document.getElementById("leiste"),
            document.getElementById("ebenen"));

        /* 4. Spielerliste */
        APP._gestartet = true;
        await APP.abgleich.starten();
        /* Werkstatt (seit 0.18.5): das Formular „Neues UPCrew-Konto" mit
           Fehleingaben ansehen (&anmeldung&konto=neu, js/werkstatt.js). */
        if (werkstatt && WERKSTATT.wert("konto") === "neu") {
            WERKSTATT._kontoFormularZeigen();
        }

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
        APP._regel12Nachziehen(ich);
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
    /* Der Bereich nur für Admins und die Wortstatistik (Regel §12). */
    INTERN_PFAD: "typoluck-intern",

    /* Ein echtes Passwort-Konto: angemeldet, kein Gast, nicht UP#Plus. */
    _echtesKonto() {
        return !!APP._aussehenUid() && KONTO.uid() !== KONTO.OBER_UID;
    },

    /*
     * Seit 0.23.1: Sobald Daten da sind und Regel §12 gilt, die Stufe vom
     * Konto übernehmen (mehr Runden gewinnt), die Warteschlange der
     * Wortstatistik senden und — einmal je Sitzung — die neue
     * Schwierigkeit holen. Unter der heutigen Regel tut das nichts.
     */
    _schwierigkeitGeholt: false,

    _regel12Nachziehen(ich) {
        if (typeof WORTSTATISTIK_ABGLEICH === "undefined" || typeof KONTO.istP12 !== "function" || !KONTO.istP12()) {
            return;
        }
        if (ich) {
            WORTSTATISTIK_ABGLEICH.stufeVomKonto(ich);
        }
        WORTSTATISTIK_ABGLEICH.senden();
        if (!APP._schwierigkeitGeholt && APP._aussehenUid()) {
            APP._schwierigkeitGeholt = true;
            WORTSTATISTIK_ABGLEICH.schwierigkeitHolen();
        }
    },

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

    /* Der letzte Zustand des Konten-Abgleichs (laedt | schreibt | bereit |
       fehler) — für die Status-Lampe (seit 0.26.0). */
    _status: "",

    _beiStatus(status, text) {
        APP._status = status;
        APP._lampeAuffrischen();
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
        /* Danach einmal alte Flammen-Schilde erstatten (seit 0.26.0). */
        APP.schildeErstatten();

        const nachgereicht = await ERGEBNISSE.nachreichen(APP.spielSpeicher);
        if (nachgereicht.gesendet > 0) {
            DIALOG.kurzmeldung(nachgereicht.gesendet === 1 ? "1 Ergebnis nachgereicht"
                : nachgereicht.gesendet + " Ergebnisse nachgereicht");
        }
        await APP._eigenenVerlaufLaden();

        /* Ein Gast wird hin und wieder gefragt, ob er sichern will (v0.2.0). */
        await ANMELDUNG.gastErinnern();
    },

    /*
     * Was die Status-Lampe braucht (seit 0.26.0, Nutzer 29.09.2026: „bei
     * speicher mache eine status lampe rein"): der ECHTE Zustand von Netz,
     * Konten-Abgleich, Fortschritt am Konto und wartenden Ergebnissen.
     * Welche Farbe daraus wird, sagt EINSTELLUNGEN_BILDSCHIRM.lampeZustand.
     */
    speicherLage() {
        let ausstehend = 0;
        try {
            ausstehend = ICH.ausstehend().length;
        } catch (fehler) {
            ausstehend = 0;
        }
        return {
            online: typeof navigator === "undefined" || navigator.onLine !== false,
            status: APP._status,
            fortschritt: FORTSCHRITT_ABGLEICH.zustand || "",
            ausstehend: ausstehend
        };
    },

    _lampeAuffrischen() {
        if (typeof EINSTELLUNGEN_BILDSCHIRM !== "undefined") {
            EINSTELLUNGEN_BILDSCHIRM.lampeAuffrischen();
        }
    },

    /*
     * ALTE FLAMMEN-SCHILDE ERSTATTEN (seit 0.26.0; Schild und Serien-Schutz
     * sind weg): Wer noch unbenutzte Schilde hat, bekommt EINMAL den
     * Kaufpreis (50 je Stück) in Münzen — gerechnet in
     * `FORTSCHRITT.schildeErstatten`, gemerkt im Zähler `schildErstattet`.
     * Nach der Anmeldung, wenn der Konto-Stand da ist. Liefert die Münzen.
     */
    SCHILD_PREIS: 50,

    schildeErstatten() {
        const probe = FORTSCHRITT.schildeErstatten(APP.fortschritt(), FORTSCHRITT.APP, APP.SCHILD_PREIS, Date.now());
        if (probe.stueck <= 0) {
            return 0;
        }
        const ergebnis = FORTSCHRITT.aendern(APP.fortschrittId(), (stand) =>
            FORTSCHRITT.schildeErstatten(FORTSCHRITT_ABGLEICH.mitKonto(stand), FORTSCHRITT.APP,
                APP.SCHILD_PREIS, Date.now()));
        if (ergebnis.stueck > 0) {
            FORTSCHRITT_ABGLEICH.senden(ergebnis.stand);
            DIALOG.kurzmeldung("Schilde erstattet · +" + ergebnis.muenzen + " "
                + (typeof UPCREW_MUENZEN !== "undefined" ? UPCREW_MUENZEN.WAEHRUNG.name : "Münzen"), 3000);
        }
        return ergebnis.muenzen || 0;
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
        /* Die Serien-Flamme (seit 0.16.1) zieht auch ohne Neuzeichnen nach. */
        APP._flammeAktualisieren();
    },

    _flammeAktualisieren() {
        if (typeof START !== "undefined" && typeof START.flammeAktualisieren === "function") {
            START.flammeAktualisieren();
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
        /* Bibliothek (seit 0.21.0): die Sicht vor dem Schreiben (Front?)
           und die Belohnung der Mitnahme (Fund). */
        const imBuch = runde.modus === "bibliothek" && typeof BIBLIOTHEK !== "undefined";
        const vorherSicht = imBuch ? APP.bibliothekStand() : null;
        const bonus = imBuch ? BIBLIOTHEK.belohnung(runde.mitnahme, { geloest: runde.zustand === "gewonnen",
            versuche: runde.versuche.length, hilfe: WORDLE.hilfeGenutzt(runde) }) : null;
        /* Gerechnet wird mit dem Konto-Stand dazu (Level, Serie, ×1,5 aus
           Blunderlucks Zweig vom Konto); geschrieben wird nur der eigene
           Zweig — aufs Gerät, danach ans Konto (seit 0.15.1). */
        const ergebnis = FORTSCHRITT.aendern(APP.fortschrittId(), (stand) => {
            const basis = FORTSCHRITT_ABGLEICH.mitKonto(stand);
            const r = FORTSCHRITT.partie(basis, {
                datum: datum,
                tagesaufgabe: tagesaufgabe,
                figuren: tagesaufgabe ? wertung.figuren : 0,
                stufe: WERTUNG.schwierigkeit(runde.loesung),
                koennen: wertung.genauigkeit,
                zeitpunkt: Date.now(),
                geloest: runde.zustand === "gewonnen",
                versuche: runde.versuche.length,
                schwer: runde.schwer === true,
                /* Tipp oder Extra-Leben aus dem Shop: höchstens ein Bauer. */
                hilfe: WORDLE.hilfeGenutzt(runde),
                /* Ein Level der Bibliothek (seit 0.18.0): seine Figuren. */
                bibliothek: APP._bibliothekAngaben(runde, wertung)
            }, APP._stufen());
            /* Münzen (seit 0.17.0, wie Blunderluck v0.152.0). */
            r.muenzen = APP.muenzenFuerRunde(basis, r, runde, tagesaufgabe, datum);
            /* Fund „Doppelbuchstabe" (×2) und „Wette" (+50), seit 0.21.0. */
            if (bonus) {
                r.muenzen = r.muenzen * bonus.muenzenMal + bonus.muenzenPlus;
            }
            if (r.muenzen > 0) {
                r.stand = UPCREW_MUENZEN.verdienen(r.stand, FORTSCHRITT.APP, r.muenzen, Date.now());
            }
            return r;
        });
        FORTSCHRITT_ABGLEICH.senden(ergebnis.stand);
        APP._flammeAktualisieren();

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
        if (ergebnis.muenzen > 0) {
            meldung.push("+" + ergebnis.muenzen + " " + UPCREW_MUENZEN.WAEHRUNG.name);
        }
        /* Wortstatistik und Stufe (seit 0.23.1) — im Hintergrund. */
        if (typeof WORTSTATISTIK_ABGLEICH !== "undefined") {
            WORTSTATISTIK_ABGLEICH.melden(runde, datum, Date.now());
        }
        /* Herzen und Rückfall (seit 0.21.0). */
        const bibliothek = imBuch ? APP._bibliothekNachRunde(runde, vorherSicht) : null;
        if (bibliothek && bibliothek.voll) {
            meldung.push("Herzen voll");
        } else if (bibliothek && bibliothek.herzPlus > 0) {
            meldung.push("+" + bibliothek.herzPlus + " Herz");
        }
        if (bibliothek && bibliothek.rueck) {
            meldung.push(APP.rueckText(bibliothek));
        } else if (bibliothek && bibliothek.verlust > 0) {
            meldung.push("−" + bibliothek.verlust + (bibliothek.verlust === 1 ? " Herz" : " Herzen"));
        }
        /* Typoluck-Abzeichen (seit 0.25.0) — verdiente fest in den Zweig. */
        if (APP.abzeichenBuchen() > 0) {
            meldung.push("Neues Abzeichen");
        }
        if (meldung.length) {
            DIALOG.kurzmeldung(meldung.join(" · "), 2500);
        }
        return { wertung: wertung, ergebnis: ergebnis, bibliothek: bibliothek };
    },

    /*
     * DIE TYPOLUCK-ABZEICHEN BUCHEN (seit 0.25.0, gemeinsame Runde 7): was
     * FORTSCHRITT.tlAbzeichenFelder als verdient meldet, als Zähler in den
     * eigenen Zweig (nur höher) und ans Konto. Nach jeder Runde und beim
     * Öffnen des Profils. Liefert, wie viele neu dazukamen.
     */
    _buecher(stand) {
        if (typeof BIBLIOTHEK === "undefined") {
            return { erreicht: 0, alle: 0 };
        }
        return { erreicht: BIBLIOTHEK.erreicht(FORTSCHRITT.turmStand(stand)), alle: BIBLIOTHEK.anzahlBuecher() };
    },

    abzeichenBuchen() {
        const probe = APP.fortschritt();
        const felder = FORTSCHRITT.tlAbzeichenFelder(probe, APP._buecher(probe));
        if (FORTSCHRITT.zaehlerHeben(probe, felder).neu === 0) {
            return 0;
        }
        const ergebnis = FORTSCHRITT.aendern(APP.fortschrittId(),
            (stand) => FORTSCHRITT.zaehlerHeben(FORTSCHRITT_ABGLEICH.mitKonto(stand), felder));
        FORTSCHRITT_ABGLEICH.senden(ergebnis.stand);
        return ergebnis.neu;
    },

    /* ---------------------------------------------------------------- *
     * Münzen, Shop und Serie ab Rundenstart (seit 0.17.0, wie Blunderluck
     * v0.152.0 — js/upcrew-muenzen.js, js/fortschritt.js „DIE SERIE")
     * ---------------------------------------------------------------- */

    /*
     * Was eine beendete Runde an Münzen bringt (rein, getestet): Tageswort
     * zum ersten Mal heute geschafft +10, jede gelöste Übungsrunde +3, je
     * Level-Aufstieg +10. Seit 0.18.0 dazu die Bibliothek: je neue Figur +5,
     * erster gelöster Boss +25 (UPCREW_MUENZEN.VERDIENST, wie Blunderluck).
     */
    /* Die Angabe für FORTSCHRITT.partie zu einer Bibliothek-Runde, sonst
       null (seit 0.18.0). */
    _bibliothekAngaben(runde, wertung) {
        if (!runde || runde.modus !== "bibliothek" || typeof BIBLIOTHEK === "undefined"
                || !Number.isInteger(runde.station)) {
            return null;
        }
        const st = BIBLIOTHEK.station(runde.buch, runde.station);
        if (!st) {
            return null;
        }
        /* Seit 0.20.0 je Station (Schlüssel „Buch-Nr", Nr ab 10); Elite
           eine Figur mehr (js/bibliothek.js figurenFuer), seit 0.21.0 mit
           der Belohnung der Mitnahme (Fund „5 Versuche"). */
        return {
            schluessel: st.schluessel,
            figuren: BIBLIOTHEK.figurenDerRunde(runde, wertung.figuren, WORDLE.hilfeGenutzt(runde))
        };
    },

    /* Der Text zum Rückfall (seit 0.21.1: Rast oder Elite als Checkpoint). */
    rueckText(bib) {
        if (!bib || bib.cp === null || bib.cp === undefined) {
            return "Zurück zum Anfang";
        }
        return bib.cpArt === "r" ? "Zurück zur Rast" : "Zurück zur Elite";
    },

    /*
     * Nach einer Bibliothek-Runde (seit 0.21.0): Herzen und Rückfall bei
     * Scheitern an der Front, Mitnahme verbraucht, Herz aus der Belohnung.
     * `vorherSicht` = die Sicht VOR dem Schreiben (war die Station die
     * Front?). Schreibt nur den Durchgang (Gerät). Liefert
     * { verlust, rueck, cp, cpArt, herzen, mitHerzen, herzPlus, voll } oder
     * null.
     */
    _bibliothekNachRunde(runde, vorherSicht) {
        if (!runde || runde.modus !== "bibliothek" || typeof BIBLIOTHEK === "undefined"
                || !BIBLIOTHEK.station(runde.buch, runde.station)) {
            return null;
        }
        const b = runde.buch;
        const nr = runde.station;
        const geloest = runde.zustand === "gewonnen";
        const bel = BIBLIOTHEK.belohnung(runde.mitnahme,
            { geloest: geloest, versuche: runde.versuche.length, hilfe: WORDLE.hilfeGenutzt(runde) });
        const vorher = APP.durchgang(b);
        let dg = BIBLIOTHEK.nachRunde(vorher, b, nr, runde.mitnahme, geloest, bel.herzPlus);
        let r = { verlust: 0, rueck: false, cp: null };
        if (!geloest) {
            r = BIBLIOTHEK.scheitern(vorherSicht, b, nr, dg);
            dg = r.dg;
        }
        APP._durchgangSetzen(b, dg);
        /* Seit 0.21.1: Art des Checkpoints (Rast oder Elite) für die Meldung,
           `voll` = Elite besiegt, Herzen voll. */
        const cpArt = r.cp !== null ? BIBLIOTHEK.station(b, r.cp).art : "";
        return { verlust: r.verlust, rueck: r.rueck, cp: r.cp, cpArt: cpArt, herzen: dg.herzen,
            mitHerzen: BIBLIOTHEK.mitHerzen(b), herzPlus: geloest ? Math.max(0, dg.herzen - vorher.herzen) : 0,
            voll: geloest && BIBLIOTHEK.station(b, nr).art === "e" && BIBLIOTHEK.mitHerzen(b)
                && vorher.herzen < BIBLIOTHEK.HERZEN };
    },

    /* ---------------------------------------------------------------- *
     * Die Bibliothek (seit 0.20.0, js/bibliothek.js): Stand, Truhe,
     * Händler — geschrieben nur über den Fortschritt (Gerät + Konto)
     * ---------------------------------------------------------------- */

    /* Der Stand der Bibliothek, wie das Buch ihn zeigt: seit 0.21.0 die
       SICHT (nach einem Rückfall neu zu spielende Stationen gelten als
       offen, js/bibliothek.js `sicht`). `echt` = true: der gespeicherte
       Stand ohne Rückfall (für „schon einmal geöffnet"). */
    bibliothekStand(echt) {
        const turm = FORTSCHRITT.turmStand(APP.fortschritt());
        return echt ? turm : BIBLIOTHEK.sicht(turm, APP._durchgaenge());
    },

    /* ---------------------------------------------------------------- *
     * Der Durchgang (seit 0.21.0): Herzen, neu zu spielende Stationen,
     * Rast, Fund-Wirkung — NUR auf diesem Gerät (Spielstand
     * „bibliothek-durchgang", je Spieler-Id und Buch). Die heutige Regel
     * §11b hat dafür kein Feld; mit §12 zieht es ans Konto.
     * ---------------------------------------------------------------- */

    DURCHGANG: "bibliothek-durchgang",

    _durchgaenge() {
        const alle = ICH.spielstand(APP.DURCHGANG);
        const meine = (alle && typeof alle === "object") ? alle[APP.fortschrittId()] : null;
        return (meine && typeof meine === "object" && !Array.isArray(meine)) ? meine : {};
    },

    durchgang(b) {
        return BIBLIOTHEK.durchgangNormalisieren(APP._durchgaenge()[b], b);
    },

    _durchgangSetzen(b, dg) {
        const roh = ICH.spielstand(APP.DURCHGANG);
        const alle = (roh && typeof roh === "object" && !Array.isArray(roh)) ? roh : {};
        const id = APP.fortschrittId();
        const meine = (alle[id] && typeof alle[id] === "object") ? alle[id] : {};
        meine[b] = BIBLIOTHEK.durchgangNormalisieren(dg, b);
        alle[id] = meine;
        ICH.spielstandSetzen(APP.DURCHGANG, alle);
    },

    /* Münzen ausgeben ohne Ware (Fund: Wette, Herz kaufen) — so, wie der
       Baustein bucht: `muenzenAusgegeben` im eigenen Zweig wächst. Rein. */
    _muenzenAusgeben(alt, betrag, zeitpunkt) {
        const stand = FORTSCHRITT.normalisieren(alt);
        const zweig = stand.spiele[FORTSCHRITT.APP] || FORTSCHRITT.zweigLeer();
        const zaehler = (zweig.zaehler && typeof zweig.zaehler === "object") ? zweig.zaehler : {};
        const bisher = (typeof zaehler.muenzenAusgegeben === "number" && zaehler.muenzenAusgegeben > 0)
            ? Math.floor(zaehler.muenzenAusgegeben) : 0;
        zaehler.muenzenAusgegeben = Math.min(bisher + Math.max(0, Math.floor(betrag)), 1000000000);
        zweig.zaehler = zaehler;
        zweig.stand = Math.max((zweig.stand || 0) + 1, zeitpunkt || 0);
        stand.spiele[FORTSCHRITT.APP] = zweig;
        return stand;
    },

    /* Rast: „heilen" oder „ueben" (js/bibliothek.js `rastWaehlen`), danach
       ist die Rast gegangen. Liefert true/false. */
    rastWaehlen(buch, nr, wahl) {
        const r = BIBLIOTHEK.rastWaehlen(APP.durchgang(buch), buch, nr, wahl);
        if (!r.ok) {
            return false;
        }
        APP._durchgangSetzen(buch, r.dg);
        APP.stationMerken(buch, nr, 0);
        return true;
    },

    /* Fund: einen Tausch nehmen oder „Nein" (`id` leer). Münzen gebucht
       über den Fortschritt. Liefert true/false. */
    fundNehmen(buch, nr, id) {
        if (!id) {
            APP.stationMerken(buch, nr, 0);
            return true;
        }
        const muenzen = typeof UPCREW_MUENZEN !== "undefined" ? UPCREW_MUENZEN.anzeige(APP.fortschritt()) : 0;
        const r = BIBLIOTHEK.fundNehmen(APP.durchgang(buch), buch, nr, id, muenzen);
        if (!r.ok) {
            return false;
        }
        if (r.muenzen !== 0 && typeof UPCREW_MUENZEN !== "undefined") {
            const ergebnis = FORTSCHRITT.aendern(APP.fortschrittId(), (stand) => {
                const basis = FORTSCHRITT_ABGLEICH.mitKonto(stand);
                return { stand: r.muenzen > 0
                    ? UPCREW_MUENZEN.verdienen(basis, FORTSCHRITT.APP, r.muenzen, Date.now())
                    : APP._muenzenAusgeben(basis, -r.muenzen, Date.now()) };
            });
            FORTSCHRITT_ABGLEICH.senden(ergebnis.stand);
        }
        APP._durchgangSetzen(buch, r.dg);
        APP.stationMerken(buch, nr, 0);
        return true;
    },

    /* Tinte einsetzen (seit 0.23.0): ein Stück aus dem Vorrat des Buchs.
       Liefert true, wenn eins da war. */
    tinteNutzen(buch) {
        const dg = APP.durchgang(buch);
        if (dg.tinte < 1) {
            return false;
        }
        dg.tinte -= 1;
        APP._durchgangSetzen(buch, dg);
        return true;
    },

    /* Was eine Bibliothek-Runde aus dem Durchgang mitnimmt (seit 0.21.0;
       nur an der Front, js/bibliothek.js `mitnahme`). */
    bibliothekMitnahme(buch, nr) {
        return BIBLIOTHEK.mitnahme(APP.bibliothekStand(), buch, nr, APP.durchgang(buch));
    },

    /* Eine Station ohne Figuren betreten (Truhe öffnen: `muenzen` > 0;
       Händler, Rast, Fund: 0). Liefert true, wenn neu gemerkt. Seit
       0.21.0: nach einem Rückfall zählt sie wieder als gegangen, bringt
       aber keine Münzen ein zweites Mal. */
    stationMerken(buch, nr, muenzen) {
        const schluessel = BIBLIOTHEK.merkerSchluessel(buch, nr);
        if (APP.durchgang(buch).wieder.indexOf(nr) !== -1) {
            APP._durchgangSetzen(buch, BIBLIOTHEK.wiederErledigt(APP.durchgang(buch), buch, nr));
        }
        if (BIBLIOTHEK.erledigt(APP.bibliothekStand(true), buch, nr)) {
            return false;
        }
        const ergebnis = FORTSCHRITT.aendern(APP.fortschrittId(), (stand) => {
            let neu = FORTSCHRITT.stationMerken(FORTSCHRITT_ABGLEICH.mitKonto(stand), schluessel, Date.now());
            if (muenzen > 0 && typeof UPCREW_MUENZEN !== "undefined") {
                neu = UPCREW_MUENZEN.verdienen(neu, FORTSCHRITT.APP, muenzen, Date.now());
            }
            return { stand: neu };
        });
        FORTSCHRITT_ABGLEICH.senden(ergebnis.stand);
        APP._flammeAktualisieren();
        return true;
    },

    /* Beim Händler kaufen: Shop-Ware mit RABATT. Über den Baustein: erst der
       Nachlass gutgeschrieben, dann regulär gekauft — nur wenn der Kauf
       klappt, gilt beides (so bleibt die Rechnung im Baustein). */
    haendlerKaufen(ware) {
        if (typeof UPCREW_MUENZEN === "undefined" || !UPCREW_MUENZEN.WAREN[ware]) {
            return { ok: false, grund: "unbekannt" };
        }
        const preis = UPCREW_MUENZEN.WAREN[ware].preis;
        const nachlass = preis - BIBLIOTHEK.haendlerPreis(preis);
        let r = { ok: false, grund: "" };
        const ergebnis = FORTSCHRITT.aendern(APP.fortschrittId(), (stand) => {
            const basis = FORTSCHRITT_ABGLEICH.mitKonto(stand);
            if (UPCREW_MUENZEN.anzeige(basis) < preis - nachlass) {
                r = { ok: false, grund: "zuWenig" };
                return { stand: basis };
            }
            r = UPCREW_MUENZEN.kaufen(UPCREW_MUENZEN.verdienen(basis, FORTSCHRITT.APP, nachlass, Date.now()),
                FORTSCHRITT.APP, ware, Date.now());
            return { stand: r.ok ? r.stand : basis };
        });
        if (r.ok) {
            FORTSCHRITT_ABGLEICH.senden(ergebnis.stand);
            APP._flammeAktualisieren();
        }
        return { ok: r.ok, grund: r.grund };
    },

    muenzenFuerRunde(vorher, ergebnis, runde, tagesaufgabe, datum) {
        if (typeof UPCREW_MUENZEN === "undefined") {
            return 0;
        }
        const v = UPCREW_MUENZEN.VERDIENST;
        let summe = 0;
        if (tagesaufgabe) {
            if (!FORTSCHRITT.heuteVon(vorher, FORTSCHRITT.APP, datum)
                    && FORTSCHRITT.heuteVon(ergebnis.stand, FORTSCHRITT.APP, datum) > 0) {
                summe += v.tagesaufgabe;
            }
        } else if (runde.modus !== "tag" && runde.zustand === "gewonnen") {
            summe += v.sieg;
        }
        /* Die Bibliothek (seit 0.18.0, wie Blunderlucks Turm): je neue Figur
           eines Levels, beim ersten gelösten Boss eines Buchs dazu der Boss. */
        if (runde.modus === "bibliothek" && typeof BIBLIOTHEK !== "undefined" && Number.isInteger(runde.station)) {
            const schluessel = runde.buch + "-" + runde.station;
            const alt = FORTSCHRITT.turmFiguren(vorher)[schluessel] || 0;
            const neu = FORTSCHRITT.turmFiguren(ergebnis.stand)[schluessel] || 0;
            if (neu > alt) {
                summe += (neu - alt) * v.figur;
                if (alt === 0 && BIBLIOTHEK.istBoss(runde.buch, runde.station)) {
                    summe += v.boss;
                }
            }
        }
        if (ergebnis.levelNachher > ergebnis.levelVorher) {
            summe += (ergebnis.levelNachher - ergebnis.levelVorher) * v.level;
        }
        return summe;
    },

    /*
     * EINE RUNDE HAT ANGEFANGEN (Nutzer 27.09.2026: „Serie soll einfach:
     * einmal eine Runde starten, egal welches Game"). In Typoluck heisst
     * „gestartet": heute ein Versuch abgegeben — im Tageswort wie in der
     * Übung (js/bildschirm-wordle.js `_abschicken`). Nur das Öffnen zählt
     * nicht: Wer bloss das fertige Tageswort ansieht, hat nicht gespielt.
     * Einmal je Tag wirksam; wer damit 7, 14, 21 … Tage erreicht, bekommt
     * +20 Münzen. Liefert { serie, muenzen } oder null.
     */
    rundeGestartet() {
        const datum = WORDLE.datumText(APP.jetzt());
        const probe = APP.fortschritt();
        /* Seit 0.26.0 ohne Serien-Schutz (Schutz 0, js/fortschritt.js). */
        if (!FORTSCHRITT.rundeGestartet(probe, datum, Date.now(), undefined, 0).neu) {
            return null;
        }
        const ergebnis = FORTSCHRITT.aendern(APP.fortschrittId(), (stand) => {
            const vorher = FORTSCHRITT_ABGLEICH.mitKonto(stand);
            const r = FORTSCHRITT.rundeGestartet(vorher, datum, Date.now(), undefined, 0);
            let muenzen = 0;
            const bisher = FORTSCHRITT.serie(vorher, datum, 0);
            if (r.neu && typeof UPCREW_MUENZEN !== "undefined" && r.serie > 0 && r.serie % 7 === 0
                    && !(bisher.heute && bisher.tage === r.serie)) {
                muenzen = UPCREW_MUENZEN.VERDIENST.serieWoche;
                r.stand = UPCREW_MUENZEN.verdienen(r.stand, FORTSCHRITT.APP, muenzen, Date.now());
            }
            return { stand: r.stand, serie: r.serie, muenzen: muenzen };
        });
        FORTSCHRITT_ABGLEICH.senden(ergebnis.stand);
        APP._flammeAktualisieren();
        if (ergebnis.muenzen > 0) {
            DIALOG.kurzmeldung("+" + ergebnis.muenzen + " " + UPCREW_MUENZEN.WAEHRUNG.name, 2200);
        }
        return { serie: ergebnis.serie, muenzen: ergebnis.muenzen };
    },

    /* Kaufen im Shop: nur, wenn der Stand reicht. Liefert { ok, grund }. */
    kaufen(ware) {
        const pruefung = UPCREW_MUENZEN.kannKaufen(APP.fortschritt(), ware);
        if (!pruefung.ok) {
            return pruefung;
        }
        let ok = false;
        const ergebnis = FORTSCHRITT.aendern(APP.fortschrittId(), (stand) => {
            const r = UPCREW_MUENZEN.kaufen(FORTSCHRITT_ABGLEICH.mitKonto(stand), FORTSCHRITT.APP, ware, Date.now());
            ok = r.ok;
            return { stand: r.ok ? r.stand : FORTSCHRITT_ABGLEICH.mitKonto(stand), grund: r.grund };
        });
        if (ok) {
            FORTSCHRITT_ABGLEICH.senden(ergebnis.stand);
            APP._flammeAktualisieren();
        }
        return { ok: ok, grund: ergebnis.grund };
    },

    /* Ein Stück aus dem Vorrat nehmen (Leben, Tipp). Liefert true/false. */
    benutzen(ware) {
        if (UPCREW_MUENZEN.vorrat(APP.fortschritt(), ware) < 1) {
            return false;
        }
        let ok = false;
        const ergebnis = FORTSCHRITT.aendern(APP.fortschrittId(), (stand) => {
            const r = UPCREW_MUENZEN.benutzen(FORTSCHRITT_ABGLEICH.mitKonto(stand), FORTSCHRITT.APP, ware, Date.now());
            ok = r.ok;
            return { stand: r.stand };
        });
        if (ok) {
            FORTSCHRITT_ABGLEICH.senden(ergebnis.stand);
        }
        return ok;
    },

    vorrat(ware) {
        return (typeof UPCREW_MUENZEN === "undefined") ? 0 : UPCREW_MUENZEN.vorrat(APP.fortschritt(), ware);
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
        /* Seit 0.15.2: nachfragen und die neue Version auch zeigen
           (js\aktualisierung.js — bis 0.15.1 blieb die offene Seite alt). */
        navigator.serviceWorker.register("sw.js")
            .then((registrierung) => AKTUALISIERUNG.einrichten(registrierung, () => APP._lageFuerNeuladen()))
            .catch(() => {
                /* Ohne Worker läuft die App trotzdem — nur nicht offline. */
            });
    },

    /* Wie es gerade aussieht — für „darf jetzt neu geladen werden?"
       (AKTUALISIERUNG.sicher). */
    _lageFuerNeuladen() {
        const fokus = document.activeElement;
        const eingabe = (NAVIGATION.aktuell === "wordle" && WORDLE_BILDSCHIRM.eingabe)
            ? WORDLE_BILDSCHIRM.eingabe.felder : [];
        return {
            getippt: (eingabe || []).filter((zeichen) => zeichen).length,
            schreibt: !!fokus && (fokus.tagName === "INPUT" || fokus.tagName === "TEXTAREA"),
            dialogOffen: document.body.classList.contains("dialog-offen"),
            anmeldungOffen: !!ANMELDUNG.offen
        };
    }
};

document.addEventListener("DOMContentLoaded", () => APP.starten());
