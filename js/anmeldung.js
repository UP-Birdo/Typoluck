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
 * Anmeldung über Firebase, Name mit Nummer (Name#1234, die Nummer würfelt die App), Gast-Zugang,
 * Passwort-Regel, Rollen. Die Regeln und Abläufe stehen dort; hier wird nur
 * gefragt und gezeigt. Ohne Firebase (Werkstatt, lokaler Modus) gilt der
 * alte Weg mit Prüfsumme (js\spieler.js, js\versiegelung.js).
 *
 * SEIT 0.39.0 NUR NOCH DAS ANMELDE-VOLLBILD (Weiche, Anmelden, Neues Konto,
 * Neu verbinden, Gast, „Welches Konto?"). Name, Nummer, Passwort ändern,
 * Gast sichern samt Erinnerung, Abmelden mit Rückfrage und Konto löschen
 * stehen im Baustein js\upcrew-konto.js — gleich in allen UPCrew-Apps
 * (Nutzer 17.10.2026; UPCrew bausteine\EINBAU-VERWALTUNG.md). Hier stehen
 * nur noch die Haken dafür (`_nachladen`, `_frischZumSchreiben`,
 * `_nachAbmelden`, `_nachLoeschen`, `_nachGastSichern`, `_nachKonto`);
 * eingerichtet in EINSTELLUNGEN_BILDSCHIRM.kontoEinrichten.
 */

const ANMELDUNG = {

    abgleich: null,
    ichId: null,
    offen: false,
    _wurzelEl: null,

    /* Läuft nach jeder erfolgreichen Anmeldung (von app.js gesetzt). */
    beiAngemeldet: null,

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

    /* Wie ein Spieler angezeigt wird: seit 0.15.6 NUR der Name (Nutzer
       27.09.2026: „brauchst nicht mal den #… zu zeigen"). Die Nummer steht
       leise daneben nur bei gleichen Namen (SPIELER.nummerZusatz) und zum
       Ändern in den Einstellungen (Baustein js\upcrew-konto.js). */
    anzeigeName(spieler) {
        return spieler ? spieler.name : "";
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
            ANMELDUNG.abmelden();
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
                await ANMELDUNG.abmelden();
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
            ANMELDUNG.abmelden();
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
        /* Keine Begrüßung, kein Absatz (UPCrew-Standard, seit 0.4.0; bis
           0.3.0 „Willkommen bei Typoluck" mit drei Sätzen darunter). */
        const kasten = ANMELDUNG._kastenBauen("Typoluck", "Ein Konto · alle UPCrew-Spiele");

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
                ? "Name und Passwort deines UPCrew-Kontos."
                : "Mit dem Namen und Passwort deines UPCrew-Kontos — von jedem Gerät aus."));
        const name = ANMELDUNG._feldBauen(kasten, "Name", false, "username");
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
                    await ANMELDUNG._nachAnmeldungLaden();
                    ANMELDUNG._uebernehmen(ergebnis.spieler);
                    ANMELDUNG._fertig();
                    return;
                }
                if (ergebnis.fehler === "freigegeben") {
                    ANMELDUNG._neuVerbindenZeigen(ergebnis.spieler);
                    return;
                }
                if (ergebnis.fehler === "auswahl") {
                    const gewaehlt = await ANMELDUNG._kontoAuswaehlen(ergebnis.auswahl,
                        passwort.feld.value);
                    if (gewaehlt.ok) {
                        ANMELDUNG._fertig();
                        return;
                    }
                    if (!gewaehlt.abgebrochen) {
                        passwort.fehler.textContent = gewaehlt.text || KONTO.fehlerText("netz");
                    }
                    pruefen();
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
            ? "Damit spielst du in allen UPCrew-Spielen."
            : "Damit spielst du in allen UPCrew-Spielen. Deinen Namen sehen die anderen in der Rangliste.");
        const name = ANMELDUNG._feldBauen(kasten,
            "Name", false, "username");
        const passwort = ANMELDUNG._feldBauen(kasten, "Passwort (" + (ANMELDUNG._kontoRegeln()
            ? KONTO.passwortRegelText()
            : SPIELER.PASSWORT_MIN + " bis " + SPIELER.PASSWORT_MAX + " Zeichen") + ")",
            true, "new-password");
        const wiederholung = ANMELDUNG._feldBauen(kasten, "Passwort wiederholen", true, "new-password");
        if (ANMELDUNG._kontoRegeln()) {
            ANMELDUNG._nameFeldSaeubern(name.feld);
        }

        const los = BAUSTEINE.knopf({ text: "Konto erstellen", art: "haupt", breit: true });
        const pruefen = ANMELDUNG._formularPruefen(name, passwort, wiederholung, los);
        const allgemein = ANMELDUNG._allgemeinBauen(kasten);
        const felder = { name: name, passwort: passwort, wiederholung: wiederholung, allgemein: allgemein };

        los.addEventListener("click", async () => {
            if (los.disabled || !pruefen(true)) {
                return;
            }
            los.disabled = true;
            allgemein.fehler.textContent = "";
            if (mitKonto) {
                const ergebnis = await KONTO.kontoAnlegen(ANMELDUNG.abgleich.speicher,
                    ANMELDUNG.abgleich.daten, name.feld.value, passwort.feld.value);
                await ANMELDUNG._kontoFertig(ergebnis, name, pruefen, "Angemeldet · ", felder);
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
        DIALOG.kurzmeldung("Angemeldet · " + name);
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
        const allgemein = ANMELDUNG._allgemeinBauen(kasten);

        los.addEventListener("click", async () => {
            if (los.disabled || !pruefen(true)) {
                return;
            }
            los.disabled = true;
            allgemein.fehler.textContent = "";
            const ergebnis = await KONTO.neuVerbinden(ANMELDUNG.abgleich.speicher,
                ANMELDUNG.abgleich.daten, spieler, passwort.feld.value);
            await ANMELDUNG._kontoFertig(ergebnis, passwort, pruefen, "Angemeldet · ",
                { passwort: passwort, wiederholung: wiederholung, allgemein: allgemein });
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
        DIALOG.kurzmeldung("Gast");
    },

    _uebernehmen(spieler) {
        ANMELDUNG.ichId = spieler.id;
        ANMELDUNG.abgleich.eigeneIdSetzen(spieler.id);
        ICH.personSetzen(spieler.id, spieler.name);
    },

    /*
     * „Welches Konto?" (seit 0.15.7, wie Blunderluck v0.151.9): Name und
     * Passwort passen zu mehreren gleichnamigen Konten. Hier — und nur hier
     * im Ablauf — steht die Nummer, weil die Konten sonst nicht zu
     * unterscheiden sind; dazu Level und letzter Spieltag, soweit im Eintrag
     * lesbar. Liefert { ok } oder { abgebrochen } oder { ok:false, text }.
     */
    async _kontoAuswaehlen(auswahl, passwort) {
        const eintraege = auswahl.map((spieler, nummer) => ({
            beschriftung: spieler.name,
            hinweis: ANMELDUNG._kontoErkennung(spieler),
            wert: String(nummer)
        }));
        const wahl = await DIALOG.liste("Welches Konto?",
            "Dein Passwort passt zu mehreren Konten", eintraege, "Abbrechen");
        if (wahl === null || wahl === undefined || !auswahl[Number(wahl)]) {
            KONTO.auswahlVerwerfen();
            return { abgebrochen: true };
        }
        const ergebnis = await KONTO.anmeldenAuswahl(auswahl[Number(wahl)], passwort);
        if (!ergebnis.ok) {
            return ergebnis;
        }
        await ANMELDUNG._nachAnmeldungLaden();
        ANMELDUNG._uebernehmen(ergebnis.spieler);
        return { ok: true };
    },

    /* „#1234 · Level 5 · zuletzt 26.09." — was ohne Anmeldung lesbar ist. */
    _kontoErkennung(spieler) {
        const teile = ["#" + spieler.tag];
        if (typeof FORTSCHRITT !== "undefined" && spieler.fortschritt) {
            try {
                teile.push("Level " + FORTSCHRITT.level(spieler.fortschritt).level);
                const tage = Array.from(FORTSCHRITT.alleTage(spieler.fortschritt)).sort();
                const letzter = tage[tage.length - 1];
                if (letzter) {
                    teile.push("zuletzt " + letzter.slice(8, 10) + "." + letzter.slice(5, 7) + ".");
                }
            } catch (fehler) {
                /* Unlesbarer Fortschritt: dann nur die Nummer. */
            }
        }
        return teile.join(" · ");
    },

    /*
     * Abmelden OHNE Rückfrage (seit 0.39.0 nur noch so): das Konto ist
     * verschwunden (`pruefen`, `_fehlendenEintragPruefen`) oder die
     * Sitzung verloren (`sitzungVerloren`). Abmelden aus den Einstellungen
     * — mit Rückfrage und Gast-Warnung — läuft über UPCREW_KONTO.abmelden.
     */
    async abmelden() {
        await ANMELDUNG.abgleich.sofortSchreiben();
        /* Auch die UPCrew-Sitzung vergessen. */
        KONTO.abmelden();
        await ANMELDUNG._nachAbmelden();
    },

    /* ---------------------------------------------------------------- *
     * Haken für den Baustein js\upcrew-konto.js (seit 0.39.0)
     * ---------------------------------------------------------------- */

    /* Person vergessen, Start, Anmelde-Vollbild. */
    async _nachAbmelden() {
        ANMELDUNG.ichId = null;
        ANMELDUNG.abgleich.eigeneIdSetzen(null);
        ICH.personVergessen();
        NAVIGATION.zeigen("start", null, true);
        ANMELDUNG._vollbildZeigen();
    },

    /* Nach „Konto löschen": den eigenen Eintrag auch aus der Kopie nehmen
       (wie bis 0.38.0), dann wie nach dem Abmelden. Die Wordle-Ergebnisse
       bleiben stehen; ohne Namen zeigt sie niemand mehr. */
    async _nachLoeschen() {
        if (ANMELDUNG.ichId && ANMELDUNG.abgleich.daten) {
            ANMELDUNG.abgleich.daten = SPIELER.spielerEntfernen(ANMELDUNG.abgleich.daten, ANMELDUNG.ichId);
        }
        await ANMELDUNG._nachAbmelden();
    },

    /* Nach „Spielstand sichern": Spielzeit, „dabei seit", Besitz und
       Lieblingswörter vom Gerät ans Konto (seit 0.24.0 / 0.31.0 / 0.36.0). */
    async _nachGastSichern(eintrag) {
        if (eintrag) {
            ANMELDUNG._uebernehmen(eintrag);
        }
        if (!ANMELDUNG.ich()) {
            return;
        }
        if (typeof SPIELZEIT !== "undefined") {
            SPIELZEIT.gastZumKonto(ANMELDUNG.ich().id);
        }
        /* Der Besitz aus dem Shop zieht genauso mit (seit 0.31.0,
           js/besitz.js): an derselben Stelle wie der Fortschritt. */
        if (typeof BESITZ !== "undefined") {
            BESITZ.gastZumKonto(ANMELDUNG.ich().id);
        }
        /* Seit 0.36.0 auch die Lieblingswörter, danach die Top 3 ans Konto. */
        if (typeof LIEBLINGSWOERTER !== "undefined") {
            LIEBLINGSWOERTER.gastZumKonto(ANMELDUNG.ich().id);
            LIEBLINGSWOERTER.senden(ANMELDUNG.ich().id);
        }
    },

    /* Nach Name, Nummer, Passwort, Gast sichern: den Namen auf dem Gerät
       nachziehen und neu zeichnen. */
    _nachKonto(art, eintrag) {
        if (art === "name" && eintrag) {
            ICH.personSetzen(eintrag.id, eintrag.name);
        }
        if (typeof NAVIGATION.auffrischen === "function") {
            NAVIGATION.auffrischen();
        }
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

    /*
     * Live-Prüfung: Name (optional), Passwort, Wiederholung.
     *
     * SEIT 0.18.5 SAGT DAS FORMULAR IMMER, WAS NICHT STIMMT (Nutzer
     * 28.09.2026: „Bei falscher Eingabe beim Account-Erstellen soll eine
     * Meldung kommen, was genau nicht stimmt"; wie Blunderluck v0.152.4,
     * js\anmeldung-konto.js `_kontoFormularPruefen`). Bis dahin war der
     * Knopf still gesperrt, solange etwas fehlte. Jetzt:
     *   - beim Tippen die Meldung am Feld, sobald darin etwas steht;
     *   - der Knopf ist immer drückbar; beim Drücken (`pruefen(true)`)
     *     stehen ALLE Meldungen da (auch „Name fehlt."), der Fokus springt
     *     ins erste falsche Feld;
     *   - die Absage vom Server steht am richtigen Feld (`ergebnis.feld`,
     *     `_kontoFertig`) oder in der Zeile über dem Knopf („allgemein").
     * Mit UPCrew-Konto prüft `KONTO.formularPruefen` (in jedem Spiel
     * gleich), ohne Konto (lokaler Modus, Werkstatt) die alten Regeln aus
     * js\spieler.js in derselben Form. `pruefen(alles)` liefert, ob alles
     * passt.
     */
    /* Nur Werkstatt (&konto=neu): die Regeln des UPCrew-Kontos zeigen, obwohl
       die Werkstatt lokal läuft. Ändert NUR Prüfung und Beschriftung — der
       Weg beim Absenden bleibt lokal (nie die echte Datenbank). */
    _kontoRegelnZeigen: false,

    _kontoRegeln() {
        return KONTO.aktiv() || ANMELDUNG._kontoRegelnZeigen === true;
    },

    _formularPruefung(name, passwort, wiederholung) {
        if (ANMELDUNG._kontoRegeln()) {
            return KONTO.formularPruefen(name, passwort, wiederholung);
        }
        const n = String(name || "").trim();
        const ergebnis = {
            name: n === "" ? "Name fehlt." : SPIELER.namePruefen(ANMELDUNG.abgleich.daten, n, null),
            passwort: passwort === "" ? "Passwort fehlt." : SPIELER.passwortPruefen(passwort),
            wiederholung: wiederholung === "" ? "Bitte das Passwort wiederholen."
                : (wiederholung !== passwort ? "Die Passwörter sind nicht gleich." : ""),
            feld: ""
        };
        ergebnis.feld = ["name", "passwort", "wiederholung"].find((f) => ergebnis[f]) || "";
        return ergebnis;
    },

    _formularPruefen(name, passwort, wiederholung, knopf) {
        const pruefen = (alles) => {
            /* Ohne Namensfeld (Neu verbinden) zählt der Name als passend. */
            const ergebnis = ANMELDUNG._formularPruefung(name ? name.feld.value : "Abc",
                passwort.feld.value, wiederholung.feld.value);
            const zeigen = (teil, schluessel) => {
                if (teil) {
                    teil.fehler.textContent = (alles === true || teil.feld.value !== "")
                        ? ergebnis[schluessel] : "";
                }
            };
            zeigen(name, "name");
            zeigen(passwort, "passwort");
            zeigen(wiederholung, "wiederholung");
            knopf.disabled = false;
            if (alles === true && ergebnis.feld) {
                const erstes = { name: name, passwort: passwort, wiederholung: wiederholung }[ergebnis.feld];
                if (erstes && erstes.feld.focus) {
                    erstes.feld.focus();
                }
            }
            return !ergebnis.feld;
        };
        [name, passwort, wiederholung].filter(Boolean)
            .forEach((teil) => teil.feld.addEventListener("input", () => pruefen(false)));
        return pruefen;
    },

    /* Die allgemeine Meldungszeile über dem Knopf (Verbindung, Server —
       seit 0.18.5). */
    _allgemeinBauen(kasten) {
        const zeile = BAUSTEINE.el("p", "feld-fehler anmeldung-allgemein");
        zeile.setAttribute("role", "alert");
        kasten.appendChild(zeile);
        return { feld: { focus() { } }, fehler: zeile };
    },

    /* `felder`: { name, passwort, wiederholung, allgemein } —
       die Absage steht am Feld aus `ergebnis.feld`, sonst an `meldungFeld`. */
    async _kontoFertig(ergebnis, meldungFeld, pruefen, gruss, felder) {
        if (!ergebnis.ok) {
            pruefen(false);
            const ziel = (felder && ergebnis.feld && felder[ergebnis.feld]) || meldungFeld;
            ziel.fehler.textContent = ergebnis.text;
            return;
        }
        await ANMELDUNG._nachladen();
        ANMELDUNG._uebernehmen(ergebnis.eintrag);
        ANMELDUNG._fertig();
        /* Die Meldung ist ein Stichwort mit Namen, keine Begrüßung. (Die
           Vibration dazu ist seit 0.8.1 raus.) */
        /* Nur der Name: Die Nummer ist zufällig und muss niemand
           kennen — zu sehen und zu ändern in den Einstellungen. */
        DIALOG.kurzmeldung(gruss + ergebnis.eintrag.name);
    },

    /* Regel §12 (seit 0.22.0, wie Blunderluck v0.154.0): Vor der Anmeldung
       war nur die Marke lesbar — der eigene Eintrag und die Liste kommen
       erst jetzt. Unter der alten Regel lag beides schon da. */
    async _nachAnmeldungLaden() {
        if (typeof KONTO.istP12 === "function" && KONTO.istP12()) {
            await ANMELDUNG._nachladen();
        }
    },

    /*
     * VOR dem Ändern von Name oder Nummer: js\konto.js schreibt
     * dabei den GANZEN eigenen Eintrag — genau den, der ihm übergeben wird.
     * Die Kopie im Abgleich kann aber älter sein als das Konto (die Frage
     * stand eine Weile offen; ein anderes Gerät oder Spiel hat inzwischen
     * Fortschritt oder Besitz geschrieben) — dann stünde danach wieder der
     * alte Stand am Konto. Deshalb wie `Abgleich.schreiben`: erst frisch
     * laden, dann zusammenführen (`SPIELER.zusammenfuehren`: Eigenes aus der
     * Kopie, alles andere vom Konto). Seit 0.34.3 kommen dabei auch Name,
     * Nummer, Kennung, Gast, neuVerbinden und uid vom frisch geladenen Konto
     * (`SPIELER._kontoFelder`) — so ist `ich` hier der ECHTE alte Platz, den
     * js\konto.js freigibt; den neuen Namen bzw. die neue Nummer setzt
     * js\konto.js erst danach. Liefert { daten, ich } — oder null,
     * wenn das Laden scheitert: Dann wird NICHT geschrieben.
     */
    async _frischZumSchreiben() {
        const abgleich = ANMELDUNG.abgleich;
        let fremd = null;
        try {
            fremd = await abgleich.speicher.laden();
        } catch (fehler) {
            return null;
        }
        const daten = SPIELER.zusammenfuehren(fremd, abgleich.daten, ANMELDUNG.ichId);
        const ich = SPIELER.spielerFinden(daten, ANMELDUNG.ichId);
        return ich ? { daten: daten, ich: ich } : null;
    },

    /* Die Spielerliste frisch vom Server — nach jedem Konto-Ablauf. Seit
       0.39.0 liefert sie den neuen Stand oder null (Laden gescheitert) —
       der Baustein js\upcrew-konto.js schreibt nur mit frischem Stand. */
    async _nachladen() {
        try {
            ANMELDUNG.abgleich.daten = SPIELER.normalisieren(await ANMELDUNG.abgleich.speicher.laden());
            ANMELDUNG.abgleich.beiDaten(ANMELDUNG.abgleich.daten);
            return ANMELDUNG.abgleich.daten;
        } catch (fehler) {
            /* Kein Netz: Die regelmässige Abfrage holt es nach. */
            return null;
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
