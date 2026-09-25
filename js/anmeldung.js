/*
 * anmeldung.js — Anmelden, neues Konto, Gast, Name und Passwort ändern,
 * Abmelden, Konto löschen.
 *
 * Die Anmeldung ist ein VOLLBILD über der ganzen App (#anmeldung in
 * index.html). Es erscheint nur, solange auf diesem Gerät niemand angemeldet
 * ist.
 *
 * DER SPIELER MELDET SICH BEI UPCREW AN, NICHT BEI TYPOLUCK (Nutzer-Ansage
 * 24.09.2026): Die Texte hier nennen nie ein anderes Spiel, immer das
 * Studio.
 *
 * SEIT v0.2.0 DAS UPCREW-KONTO (js\konto.js, in allen UPCrew-Spielen gleich):
 * Anmeldung über Firebase, Name mit Nummer (Jonas#0001), Gast-Zugang,
 * Passwort-Regel, Rollen. Die Regeln und Abläufe stehen dort; hier wird nur
 * gefragt und gezeigt. Ohne Firebase (Werkstatt, lokaler Modus) gilt der
 * alte Weg mit Prüfsumme (js\spieler.js, js\versiegelung.js).
 */

const ANMELDUNG = {

    abgleich: null,
    ichId: null,
    offen: false,
    _wurzelEl: null,

    /* Läuft nach jeder erfolgreichen Anmeldung (von app.js gesetzt). */
    beiAngemeldet: null,

    /* Jedes dritte Öffnen fragt ein Gast, ob er sichern will. */
    GAST_ERINNERUNG_SCHLUESSEL: "typoluck.gast-erinnerung",
    GAST_ERINNERUNG_JEDES: 3,

    verbinden(abgleich, wurzelEl) {
        ANMELDUNG.abgleich = abgleich;
        ANMELDUNG._wurzelEl = wurzelEl;
    },

    /* Der eigene Eintrag aus der Spielerliste, oder null. */
    ich() {
        return ANMELDUNG.ichId ? SPIELER.spielerFinden(ANMELDUNG.abgleich.daten, ANMELDUNG.ichId) : null;
    },

    /* UP#Plus verwaltet nur und spielt nicht (Nutzer 25.09.2026). */
    istOberAdmin() {
        return KONTO.aktiv() && !!ANMELDUNG.abgleich
            && KONTO.istOberAdmin(ANMELDUNG.abgleich.daten, KONTO.uid());
    },

    istGast() {
        const ich = ANMELDUNG.ich();
        return !!(ich && ich.gast === true);
    },

    /* Wie ein Spieler angezeigt wird: mit UPCrew-Konto samt Nummer. */
    anzeigeName(spieler) {
        return KONTO.aktiv() ? KONTO.anzeigeName(spieler) : (spieler ? spieler.name : "");
    },

    /*
     * Beim Start und nach jedem neuen Stand der Spielerliste.
     * `echt` = der Stand kam wirklich vom Server (nicht der leere Anfang
     * nach einem Ladefehler). Nur ein ECHTER Stand darf jemanden abmelden —
     * sonst flöge man bei jedem Funkloch aus seinem Konto (Blunderluck-Lehre
     * vom 27.08.2026, dort v0.89.0).
     */
    pruefen(echt) {
        const daten = ANMELDUNG.abgleich.daten;
        const person = ICH.person();

        if (!ANMELDUNG.ichId) {
            if (person) {
                const bekannt = SPIELER.spielerFinden(daten, person.id);
                if (ANMELDUNG._sitzungPasst(bekannt)) {
                    ANMELDUNG._uebernehmen(bekannt);
                    ANMELDUNG._fertig();
                    return;
                }
                if (!echt) {
                    return;
                }
                /* Das Gerät kennt die Person, aber keine UPCrew-Sitzung:
                   gleich das Anmelde-Bild mit dem Namen. */
                if (KONTO.aktiv() && !ANMELDUNG.offen) {
                    ANMELDUNG._vollbildZeigen(person.name);
                    return;
                }
            }
            if (!ANMELDUNG.offen) {
                ANMELDUNG._vollbildZeigen();
            }
            return;
        }

        /* Angemeldet, aber der Eintrag ist aus der Liste verschwunden (in
           einem anderen UPCrew-Spiel entfernt): abmelden. Mit UPCrew-Konto
           erst beim Server nachfragen — eine überholte Antwort darf
           niemanden abmelden. */
        if (echt && !SPIELER.spielerFinden(daten, ANMELDUNG.ichId)) {
            if (KONTO.aktiv()) {
                ANMELDUNG._fehlendenEintragPruefen();
                return;
            }
            ANMELDUNG.abmelden(true);
        }
    },

    /* Passt die Firebase-Sitzung dieses Geräts zum Eintrag? Ohne
       UPCrew-Konto (lokal, Werkstatt) genügt der Eintrag. Ein Eintrag ohne
       Nummer ist noch nicht fertig umgezogen. */
    _sitzungPasst(spieler) {
        if (!spieler) {
            return false;
        }
        if (!KONTO.aktiv()) {
            return true;
        }
        return KONTO.angemeldet() && spieler.uid === KONTO.uid() && !!spieler.tag;
    },

    _pruefeFehlend: false,

    async _fehlendenEintragPruefen() {
        if (ANMELDUNG._pruefeFehlend) {
            return;
        }
        ANMELDUNG._pruefeFehlend = true;
        try {
            const frisch = SPIELER.normalisieren(await ANMELDUNG.abgleich.speicher.laden());
            if (ANMELDUNG.ichId && !SPIELER.spielerFinden(frisch, ANMELDUNG.ichId)) {
                await ANMELDUNG.abmelden(true);
            }
        } catch (fehler) {
            /* Kein Netz: Der nächste Stand fragt wieder. */
        } finally {
            ANMELDUNG._pruefeFehlend = false;
        }
    },

    /* Firebase erkennt die Sitzung nicht mehr an (KONTO.beiVerloren). */
    sitzungVerloren() {
        if (ANMELDUNG.ichId) {
            ANMELDUNG.abmelden(true);
        }
    },

    /* ---------------------------------------------------------------- *
     * Das Vollbild
     * ---------------------------------------------------------------- */

    _vollbildZeigen(vorname) {
        ANMELDUNG.offen = true;
        ANMELDUNG._wurzelEl.hidden = false;
        document.body.classList.add("anmeldung-offen");
        if (vorname) {
            ANMELDUNG._anmeldenZeigen(vorname);
        } else {
            ANMELDUNG._weicheZeigen();
        }
    },

    _fertig() {
        ANMELDUNG.offen = false;
        ANMELDUNG._wurzelEl.hidden = true;
        ANMELDUNG._wurzelEl.innerHTML = "";
        document.body.classList.remove("anmeldung-offen");
        if (typeof ANMELDUNG.beiAngemeldet === "function") {
            ANMELDUNG.beiAngemeldet();
        }
    },

    _weicheZeigen() {
        const kasten = ANMELDUNG._kastenBauen("Willkommen bei Typoluck",
            "Wortspiele mit Freunden. Du spielst mit deinem UPCrew-Konto — "
                + "ein Konto für alle Spiele von UPCrew. Hast du schon eins, "
                + "melde dich einfach an.");

        kasten.appendChild(BAUSTEINE.knopf({
            text: "Mit UPCrew-Konto anmelden", art: "haupt", breit: true,
            beiKlick: () => ANMELDUNG._anmeldenZeigen()
        }));
        kasten.appendChild(BAUSTEINE.knopf({
            text: "Neues UPCrew-Konto erstellen", art: "still", breit: true,
            beiKlick: () => ANMELDUNG._neuesKontoZeigen()
        }));
        if (KONTO.aktiv()) {
            kasten.appendChild(BAUSTEINE.knopf({
                text: "Als Gast spielen", art: "still", breit: true,
                beiKlick: () => ANMELDUNG._gastStarten()
            }));
        }
    },

    _anmeldenZeigen(vorname) {
        const mitKonto = KONTO.aktiv();
        const kasten = ANMELDUNG._kastenBauen("Anmelden", vorname
            ? "Gib einmal dein Passwort ein — danach bleibst du auf diesem Gerät angemeldet."
            : (mitKonto
                ? "Mit Name#Nummer (z. B. Jonas#0001) und dem Passwort deines UPCrew-Kontos."
                : "Mit dem Namen und Passwort deines UPCrew-Kontos — von jedem Gerät aus."));
        const name = ANMELDUNG._feldBauen(kasten, mitKonto ? "Name#Nummer" : "Name",
            false, "username");
        const passwort = ANMELDUNG._feldBauen(kasten, "Passwort", true, "current-password");
        if (mitKonto) {
            name.feld.addEventListener("input", () => {
                const sauber = KONTO.eingabeSaeubern(name.feld.value);
                if (sauber !== name.feld.value) {
                    name.feld.value = sauber;
                }
            });
        }

        const los = BAUSTEINE.knopf({ text: "Anmelden", art: "haupt", breit: true });
        const pruefen = () => {
            los.disabled = name.feld.value.trim() === "" || passwort.feld.value === "";
        };
        name.feld.addEventListener("input", pruefen);
        passwort.feld.addEventListener("input", pruefen);

        let fehlversuche = 0;
        const falsch = () => {
            fehlversuche++;
            passwort.feld.value = "";
            passwort.fehler.textContent = fehlversuche >= 3
                ? "Wieder falsch. Passwort vergessen? Bitte einen Admin von UPCrew, "
                    + "dein Konto zum Neu-Verbinden freizugeben."
                : "Das Passwort stimmt nicht.";
            pruefen();
            passwort.feld.focus();
        };

        los.addEventListener("click", async () => {
            if (los.disabled) {
                return;
            }
            los.disabled = true;
            name.fehler.textContent = "";
            passwort.fehler.textContent = "";

            /* Mit UPCrew-Konto prüft Firebase das Passwort. */
            if (mitKonto) {
                const ergebnis = await KONTO.anmeldenMitEingabe(ANMELDUNG.abgleich.daten,
                    name.feld.value, passwort.feld.value);
                if (ergebnis.ok) {
                    ANMELDUNG._uebernehmen(ergebnis.spieler);
                    ANMELDUNG._fertig();
                    return;
                }
                if (ergebnis.fehler === "freigegeben") {
                    ANMELDUNG._neuVerbindenZeigen(ergebnis.spieler);
                    return;
                }
                if (ergebnis.fehler === "falsch") {
                    falsch();
                    return;
                }
                (ergebnis.feld === "name" ? name : passwort).fehler.textContent = ergebnis.text;
                pruefen();
                return;
            }

            const spieler = SPIELER.spielerNachName(ANMELDUNG.abgleich.daten, name.feld.value);
            if (!spieler) {
                name.fehler.textContent = "Diesen Namen gibt es nicht. Neu hier? Dann erstell ein UPCrew-Konto.";
                pruefen();
                return;
            }
            if (!SPIELER.hatPasswort(spieler)) {
                await DIALOG.hinweis("Konto ohne Passwort",
                    "Für " + spieler.name + " ist kein Passwort hinterlegt, deshalb "
                        + "lässt sich die Anmeldung nicht prüfen. Wende dich bitte an UPCrew.");
                pruefen();
                return;
            }
            if (await VERSIEGELUNG.passwortPruefen(passwort.feld.value, spieler.pinSalz,
                    spieler.pinPruefwert)) {
                ANMELDUNG._uebernehmen(spieler);
                ANMELDUNG._fertig();
                return;
            }
            falsch();
        });

        kasten.appendChild(los);
        ANMELDUNG._eingabetaste([name, passwort], los);
        kasten.appendChild(BAUSTEINE.knopf({
            text: "Zurück", art: "flach", breit: true, beiKlick: () => ANMELDUNG._weicheZeigen()
        }));
        if (vorname) {
            name.feld.value = mitKonto ? KONTO.eingabeSaeubern(vorname) : vorname;
            passwort.feld.focus();
        } else {
            name.feld.focus();
        }
        pruefen();
    },

    _neuesKontoZeigen() {
        const mitKonto = KONTO.aktiv();
        const kasten = ANMELDUNG._kastenBauen("Neues UPCrew-Konto", mitKonto
            ? "Damit spielst du in allen UPCrew-Spielen. Deine Nummer (#1234) bekommst du automatisch."
            : "Damit spielst du in allen UPCrew-Spielen. Deinen Namen sehen die anderen in der Rangliste.");
        const name = ANMELDUNG._feldBauen(kasten,
            mitKonto ? "Name (nur Buchstaben und Ziffern)" : "Name", false, "username");
        const passwort = ANMELDUNG._feldBauen(kasten, "Passwort (" + (mitKonto
            ? KONTO.passwortRegelText()
            : SPIELER.PASSWORT_MIN + " bis " + SPIELER.PASSWORT_MAX + " Zeichen") + ")",
            true, "new-password");
        const wiederholung = ANMELDUNG._feldBauen(kasten, "Passwort wiederholen", true, "new-password");
        if (mitKonto) {
            ANMELDUNG._nameFeldSaeubern(name.feld);
        }

        const los = BAUSTEINE.knopf({ text: "Konto erstellen", art: "haupt", breit: true });
        const pruefen = ANMELDUNG._formularPruefen(name, passwort, wiederholung, los);

        los.addEventListener("click", async () => {
            if (los.disabled) {
                return;
            }
            los.disabled = true;
            if (mitKonto) {
                const ergebnis = await KONTO.kontoAnlegen(ANMELDUNG.abgleich.speicher,
                    ANMELDUNG.abgleich.daten, name.feld.value, passwort.feld.value);
                await ANMELDUNG._kontoFertig(ergebnis, name, pruefen, "Willkommen, ");
                return;
            }
            await ANMELDUNG._kontoAnlegen(name.feld.value.trim(), passwort.feld.value);
        });

        kasten.appendChild(los);
        ANMELDUNG._eingabetaste([name, passwort, wiederholung], los);
        kasten.appendChild(BAUSTEINE.knopf({
            text: "Zurück", art: "flach", breit: true, beiKlick: () => ANMELDUNG._weicheZeigen()
        }));
        name.feld.focus();
        pruefen();
    },

    /* Der alte Weg ohne Firebase (Werkstatt, lokaler Modus). */
    async _kontoAnlegen(name, passwort) {
        const abgleich = ANMELDUNG.abgleich;
        const id = SPIELER.idErzeugen();
        const salz = VERSIEGELUNG.verfuegbar() ? VERSIEGELUNG.salzErzeugen() : "";
        const pruefwert = await VERSIEGELUNG.passwortPruefwertBilden(passwort, salz);

        ANMELDUNG.ichId = id;
        abgleich.eigeneIdSetzen(id);
        ICH.personSetzen(id, name);

        const mitSpieler = SPIELER.spielerHinzufuegen(abgleich.daten, name, id);
        abgleich.aendern(SPIELER.passwortSetzen(mitSpieler, id, pruefwert, salz));

        /* Ein frisches Konto wartet nicht auf die Schreibverzögerung: Wer
           die Seite gleich danach schliesst, verlöre es sonst. */
        abgleich.sofortSchreiben();
        ANMELDUNG._fertig();
        DIALOG.kurzmeldung("Willkommen, " + name + "!");
    },

    /* Neu verbinden („Passwort vergessen"): Ein Admin hat das Konto
       freigegeben — neues Passwort, alles andere bleibt. */
    _neuVerbindenZeigen(spieler) {
        const kasten = ANMELDUNG._kastenBauen("Konto neu verbinden",
            "Leg ein neues Passwort fest — " + KONTO.passwortRegelText() + ".");
        const passwort = ANMELDUNG._feldBauen(kasten, "Neues Passwort", true, "new-password");
        const wiederholung = ANMELDUNG._feldBauen(kasten, "Passwort wiederholen", true, "new-password");
        const los = BAUSTEINE.knopf({ text: "Neu verbinden", art: "haupt", breit: true });
        const pruefen = ANMELDUNG._formularPruefen(null, passwort, wiederholung, los);

        los.addEventListener("click", async () => {
            if (los.disabled) {
                return;
            }
            los.disabled = true;
            const ergebnis = await KONTO.neuVerbinden(ANMELDUNG.abgleich.speicher,
                ANMELDUNG.abgleich.daten, spieler, passwort.feld.value);
            await ANMELDUNG._kontoFertig(ergebnis, passwort, pruefen, "Willkommen zurück, ");
        });

        kasten.appendChild(los);
        ANMELDUNG._eingabetaste([passwort, wiederholung], los);
        kasten.appendChild(BAUSTEINE.knopf({
            text: "Abbrechen", art: "flach", breit: true, beiKlick: () => ANMELDUNG._weicheZeigen()
        }));
        passwort.feld.focus();
        pruefen();
    },

    /* Ein Gast: anonymes UPCrew-Konto, an dieses Gerät gebunden. */
    async _gastStarten() {
        const ergebnis = await KONTO.gastAnlegen(ANMELDUNG.abgleich.speicher,
            ANMELDUNG.abgleich.daten);
        if (!ergebnis.ok) {
            await DIALOG.hinweis("Gast-Zugang", ergebnis.text);
            return;
        }
        await ANMELDUNG._nachladen();
        ANMELDUNG._uebernehmen(ergebnis.eintrag);
        ANMELDUNG._fertig();
        DIALOG.kurzmeldung("Du spielst als " + KONTO.anzeigeName(ergebnis.eintrag));
    },

    /* Jedes dritte Öffnen fragt ein Gast, ob er seinen Spielstand sichern
       will (von app.js nach der Anmeldung gerufen). */
    async gastErinnern() {
        if (!KONTO.aktiv() || !ANMELDUNG.istGast()) {
            return;
        }
        let zaehler = 0;
        try {
            zaehler = Number(window.localStorage.getItem(ANMELDUNG.GAST_ERINNERUNG_SCHLUESSEL)) || 0;
            window.localStorage.setItem(ANMELDUNG.GAST_ERINNERUNG_SCHLUESSEL, String(zaehler + 1));
        } catch (fehler) {
            return;
        }
        if ((zaehler + 1) % ANMELDUNG.GAST_ERINNERUNG_JEDES !== 0) {
            return;
        }
        const jetzt = await DIALOG.frage("Spielstand sichern?",
            "Als Gast hängt dein Spielstand an diesem Gerät. Mit einem UPCrew-Konto "
                + "nimmst du alles mit.", "Jetzt sichern", false);
        if (jetzt) {
            ANMELDUNG.gastSichernOeffnen();
        }
    },

    gastSichernOeffnen() {
        const eintrag = ANMELDUNG.ich();
        if (!eintrag || eintrag.gast !== true) {
            return;
        }
        ANMELDUNG.offen = true;
        ANMELDUNG._wurzelEl.hidden = false;
        document.body.classList.add("anmeldung-offen");

        const kasten = ANMELDUNG._kastenBauen("Spielstand sichern",
            "Such dir einen Namen und ein Passwort aus. Alles, was du als "
                + KONTO.anzeigeName(eintrag) + " gespielt hast, bleibt.");
        const name = ANMELDUNG._feldBauen(kasten, "Name (nur Buchstaben und Ziffern)", false, "username");
        ANMELDUNG._nameFeldSaeubern(name.feld);
        const passwort = ANMELDUNG._feldBauen(kasten,
            "Passwort (" + KONTO.passwortRegelText() + ")", true, "new-password");
        const wiederholung = ANMELDUNG._feldBauen(kasten, "Passwort wiederholen", true, "new-password");
        const los = BAUSTEINE.knopf({ text: "Sichern", art: "haupt", breit: true });
        const pruefen = ANMELDUNG._formularPruefen(name, passwort, wiederholung, los);

        los.addEventListener("click", async () => {
            if (los.disabled) {
                return;
            }
            los.disabled = true;
            const ergebnis = await KONTO.gastSichern(ANMELDUNG.abgleich.speicher,
                ANMELDUNG.abgleich.daten, eintrag, name.feld.value, passwort.feld.value);
            await ANMELDUNG._kontoFertig(ergebnis, name, pruefen, "Gesichert! Du bist jetzt ");
        });

        kasten.appendChild(los);
        ANMELDUNG._eingabetaste([name, passwort, wiederholung], los);
        kasten.appendChild(BAUSTEINE.knopf({
            text: "Später", art: "flach", breit: true, beiKlick: () => ANMELDUNG._fertig()
        }));
        name.feld.focus();
        pruefen();
    },

    _uebernehmen(spieler) {
        ANMELDUNG.ichId = spieler.id;
        ANMELDUNG.abgleich.eigeneIdSetzen(spieler.id);
        ICH.personSetzen(spieler.id, spieler.name);
    },

    /* ---------------------------------------------------------------- *
     * Aus dem Profil heraus
     * ---------------------------------------------------------------- */

    async nameAendern() {
        const ich = ANMELDUNG.ich();
        if (!ich) {
            return;
        }
        if (KONTO.aktiv()) {
            const eingabe = await DIALOG.eingabe("Name ändern",
                "Nur Buchstaben und Ziffern. Gilt in allen UPCrew-Spielen; deine "
                    + "Nummer bleibt, wenn sie frei ist.", ich.name, "Speichern");
            if (eingabe === null) {
                return;
            }
            const name = KONTO.nameSaeubern(eingabe);
            if (name === ich.name) {
                return;
            }
            const ergebnis = await KONTO.nameAendern(ANMELDUNG.abgleich.speicher,
                ANMELDUNG.abgleich.daten, ich, name);
            if (!ergebnis.ok) {
                await DIALOG.hinweis("Das geht nicht", ergebnis.text);
                return;
            }
            await ANMELDUNG._nachladen();
            ICH.personSetzen(ich.id, name);
            DIALOG.kurzmeldung("Du heisst jetzt " + KONTO.anzeigeName(ergebnis.eintrag));
            return;
        }
        const neu = await DIALOG.eingabe("Name ändern",
            "Der neue Name gilt in allen UPCrew-Spielen.", ich.name, "Speichern");
        if (neu === null || neu.trim() === ich.name) {
            return;
        }
        const fehler = SPIELER.namePruefen(ANMELDUNG.abgleich.daten, neu, ich.id);
        if (fehler) {
            await DIALOG.hinweis("Das geht nicht", fehler);
            return;
        }
        ANMELDUNG.abgleich.aendern(SPIELER.nameSetzen(ANMELDUNG.abgleich.daten, ich.id, neu));
        ICH.personSetzen(ich.id, neu.trim());
        DIALOG.kurzmeldung("Name geändert");
    },

    async passwortAendern() {
        const ich = ANMELDUNG.ich();
        if (!ich) {
            return;
        }
        const mitKonto = KONTO.aktiv();
        const alt = await DIALOG.eingabe("Passwort ändern", "Zuerst das bisherige Passwort.",
            "", "Weiter", true);
        if (alt === null) {
            return;
        }
        /* Mit UPCrew-Konto prüft Firebase — das liefert zugleich den
           frischen Schlüssel, den Firebase für die Änderung verlangt. */
        if (mitKonto) {
            const probe = await KONTO.anmelden(KONTO.kennungVon(ich), alt);
            if (!probe.ok) {
                await DIALOG.hinweis("Das stimmt nicht", KONTO.fehlerText(probe.fehler));
                return;
            }
        } else if (!await VERSIEGELUNG.passwortPruefen(alt, ich.pinSalz, ich.pinPruefwert)) {
            await DIALOG.hinweis("Das stimmt nicht", "Das bisherige Passwort war falsch.");
            return;
        }
        const neu = await DIALOG.eingabe("Neues Passwort", (mitKonto
            ? KONTO.passwortRegelText()
            : SPIELER.PASSWORT_MIN + " bis " + SPIELER.PASSWORT_MAX + " Zeichen")
            + ". Gilt in allen UPCrew-Spielen.", "", "Weiter", true);
        if (neu === null) {
            return;
        }
        const regel = mitKonto ? KONTO.passwortPruefen(neu) : SPIELER.passwortPruefen(neu);
        if (regel) {
            await DIALOG.hinweis("Das geht nicht", regel);
            return;
        }
        const nochmal = await DIALOG.eingabe("Noch einmal", "Das neue Passwort wiederholen.",
            "", "Speichern", true);
        if (nochmal !== neu) {
            await DIALOG.hinweis("Nicht gleich", "Die beiden Eingaben waren verschieden. Nichts geändert.");
            return;
        }
        if (mitKonto) {
            const ergebnis = await KONTO.passwortAendern(neu);
            if (!ergebnis.ok) {
                await DIALOG.hinweis("Nichts geändert", KONTO.fehlerText(ergebnis.fehler));
                return;
            }
            DIALOG.kurzmeldung("Passwort geändert");
            return;
        }
        const salz = VERSIEGELUNG.salzErzeugen();
        const pruefwert = await VERSIEGELUNG.passwortPruefwertBilden(neu, salz);
        ANMELDUNG.abgleich.aendern(SPIELER.passwortSetzen(ANMELDUNG.abgleich.daten, ich.id, pruefwert, salz));
        DIALOG.kurzmeldung("Passwort geändert");
    },

    /* UPCrew-Konto löschen: Rückfrage, Passwort (Firebase verlangt eine
       frische Anmeldung), dann Eintrag, Namens-Platz und Firebase-Konto. Ein
       Gast braucht kein Passwort. Die Wordle-Ergebnisse bleiben stehen; ohne
       Namen zeigt sie niemand mehr. */
    async kontoLoeschen() {
        const ich = ANMELDUNG.ich();
        if (!ich || !KONTO.aktiv()) {
            return;
        }
        const sicher = await DIALOG.frage("UPCrew-Konto löschen?",
            "Dein Konto verschwindet in ALLEN Spielen von UPCrew. Das lässt sich "
                + "nicht rückgängig machen.", "Weiter", true);
        if (!sicher) {
            return;
        }
        let ergebnis;
        if (ich.gast === true) {
            ergebnis = await KONTO.eintragEntfernen(ANMELDUNG.abgleich.speicher, ich);
            await KONTO.loeschen();
        } else {
            const passwort = await DIALOG.eingabe("Zur Sicherheit",
                "Noch einmal dein Passwort.", "", "Endgültig löschen", true);
            if (passwort === null) {
                return;
            }
            ergebnis = await KONTO.kontoLoeschen(ANMELDUNG.abgleich.speicher, ich, passwort);
        }
        if (!ergebnis.ok) {
            await DIALOG.hinweis("Nicht gelöscht", ergebnis.text);
            return;
        }
        ANMELDUNG.abgleich.daten = SPIELER.spielerEntfernen(ANMELDUNG.abgleich.daten, ich.id);
        await ANMELDUNG.abmelden(true);
        DIALOG.kurzmeldung("Konto gelöscht");
    },

    /* `still` = ohne Rückfrage (das Konto ist verschwunden). Ein Gast wird
       gewarnt: Sein Spielstand ist danach weg, sein Gast-Konto wird
       weggeräumt. */
    async abmelden(still) {
        const ich = ANMELDUNG.ich();
        const gast = !still && KONTO.aktiv() && ich && ich.gast === true;
        if (!still) {
            const sicher = await DIALOG.frage(gast ? "Als Gast abmelden?" : "Abmelden?",
                gast
                    ? "Dein Gast-Spielstand ist danach weg. Sichern kannst du ihn im Profil."
                    : "Dein Konto bleibt bestehen. Du kannst dich jederzeit wieder anmelden.",
                gast ? "Trotzdem abmelden" : "Abmelden", gast);
            if (!sicher) {
                return;
            }
        }
        await ANMELDUNG.abgleich.sofortSchreiben();
        if (gast) {
            await KONTO.eintragEntfernen(ANMELDUNG.abgleich.speicher, ich);
            await KONTO.loeschen();
        }
        /* Auch die UPCrew-Sitzung vergessen (seit v0.2.0). */
        KONTO.abmelden();
        ANMELDUNG.ichId = null;
        ANMELDUNG.abgleich.eigeneIdSetzen(null);
        ICH.personVergessen();
        NAVIGATION.zeigen("start", null, true);
        ANMELDUNG._vollbildZeigen();
    },

    /* ---------------------------------------------------------------- *
     * Bausteine des Vollbilds
     * ---------------------------------------------------------------- */

    _kastenBauen(titel, text) {
        const wurzel = ANMELDUNG._wurzelEl;
        wurzel.innerHTML = "";

        const kasten = BAUSTEINE.el("div", "anmeldung-kasten");
        /* Oben steht das Studio: Das Konto gehört UPCrew, nicht dem Spiel. */
        kasten.appendChild(BAUSTEINE.el("div", "anmeldung-marke", "UPCrew"));
        kasten.appendChild(BAUSTEINE.el("h1", "anmeldung-titel", titel));
        if (text) {
            kasten.appendChild(BAUSTEINE.erklaerung(text));
        }
        wurzel.appendChild(kasten);
        return kasten;
    },

    _feldBauen(kasten, beschriftung, verdeckt, autoFuellen) {
        const block = BAUSTEINE.el("label", "feld-block");
        block.appendChild(BAUSTEINE.el("span", "feld-beschriftung", beschriftung));
        const feld = document.createElement("input");
        feld.className = "feld";
        feld.type = verdeckt ? "password" : "text";
        feld.autocomplete = autoFuellen || "off";
        feld.spellcheck = false;
        feld.setAttribute("autocapitalize", "off");
        block.appendChild(feld);
        const fehler = BAUSTEINE.el("span", "feld-fehler");
        fehler.setAttribute("aria-live", "polite");
        block.appendChild(fehler);
        kasten.appendChild(block);
        return { feld: feld, fehler: fehler };
    },

    /* Symbole und Leerzeichen fallen beim Tippen sofort heraus. */
    _nameFeldSaeubern(feld) {
        feld.maxLength = KONTO.NAME_MAX;
        feld.addEventListener("input", () => {
            const sauber = KONTO.nameSaeubern(feld.value);
            if (sauber !== feld.value) {
                feld.value = sauber;
            }
        });
    },

    /* Live-Prüfung: Name (optional), Passwort, Wiederholung. Mit UPCrew-Konto
       die Regeln aus js\konto.js, sonst die alten aus js\spieler.js. */
    _formularPruefen(name, passwort, wiederholung, knopf) {
        const mitKonto = KONTO.aktiv();
        const pruefen = () => {
            let gueltig = true;
            if (name) {
                const wert = name.feld.value.trim();
                const regel = wert === "" ? "" : (mitKonto
                    ? KONTO.namePruefen(wert)
                    : SPIELER.namePruefen(ANMELDUNG.abgleich.daten, wert, null));
                name.fehler.textContent = regel;
                gueltig = gueltig && wert !== "" && regel === "";
            }
            const wert = passwort.feld.value;
            const regel = wert === "" ? ""
                : (mitKonto ? KONTO.passwortPruefen(wert) : SPIELER.passwortPruefen(wert));
            passwort.fehler.textContent = regel;
            gueltig = gueltig && wert !== "" && regel === "";

            const gleich = wiederholung.feld.value === wert;
            wiederholung.fehler.textContent = (wiederholung.feld.value !== "" && !gleich)
                ? "Die beiden Passwörter sind nicht gleich." : "";
            gueltig = gueltig && wiederholung.feld.value !== "" && gleich;
            knopf.disabled = !gueltig;
        };
        [name, passwort, wiederholung].filter(Boolean)
            .forEach((teil) => teil.feld.addEventListener("input", pruefen));
        return pruefen;
    },

    async _kontoFertig(ergebnis, meldungFeld, pruefen, gruss) {
        if (!ergebnis.ok) {
            meldungFeld.fehler.textContent = ergebnis.text;
            pruefen();
            return;
        }
        await ANMELDUNG._nachladen();
        ANMELDUNG._uebernehmen(ergebnis.eintrag);
        ANMELDUNG._fertig();
        DIALOG.kurzmeldung(gruss + KONTO.anzeigeName(ergebnis.eintrag));
    },

    /* Die Spielerliste frisch vom Server — nach jedem Konto-Ablauf. */
    async _nachladen() {
        try {
            ANMELDUNG.abgleich.daten = SPIELER.normalisieren(await ANMELDUNG.abgleich.speicher.laden());
            ANMELDUNG.abgleich.beiDaten(ANMELDUNG.abgleich.daten);
        } catch (fehler) {
            /* Kein Netz: Die regelmässige Abfrage holt es nach. */
        }
    },

    /* Die Eingabetaste springt ins nächste Feld, im letzten löst sie den Knopf aus. */
    _eingabetaste(teile, knopf) {
        teile.forEach((teil, i) => {
            teil.feld.addEventListener("keydown", (ereignis) => {
                if (ereignis.key !== "Enter") {
                    return;
                }
                ereignis.preventDefault();
                if (i < teile.length - 1) {
                    teile[i + 1].feld.focus();
                } else {
                    knopf.click();
                }
            });
        });
    }
};
