/*
 * anmeldung.js — Anmelden, neues Konto, Name und Passwort ändern, Abmelden.
 *
 * Die Anmeldung ist ein VOLLBILD über der ganzen App (#anmeldung in
 * index.html). Es erscheint nur, solange auf diesem Gerät niemand angemeldet
 * ist. Drei Wege:
 *
 *   1. Das Gerät kennt seinen Spieler schon — kein Bild, direkt hinein.
 *   2. Vorhandenes UPCrew-Konto: Name und Passwort. Geht mit jedem Konto,
 *      egal in welchem UPCrew-Spiel es angelegt wurde.
 *   3. Neues UPCrew-Konto: Name und Passwort (doppelt). Es gilt danach in
 *      allen UPCrew-Spielen.
 *
 * DER SPIELER MELDET SICH BEI UPCREW AN, NICHT BEI TYPOLUCK (Nutzer-Ansage
 * 24.09.2026): Wer nur ein Spiel kennt, soll sich nicht wundern, warum er
 * sich „bei einem anderen Spiel" anmeldet. Deshalb nennen die Texte hier nie
 * ein anderes Spiel, sondern immer das Studio.
 *
 * Die Datenregeln (Passwort-Länge, Name frei?, wie ein Eintrag aussieht)
 * stehen in js\spieler.js — hier wird nur gefragt und angezeigt.
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
                if (bekannt) {
                    ANMELDUNG._uebernehmen(bekannt);
                    ANMELDUNG._fertig();
                    return;
                }
                if (!echt) {
                    return;
                }
            }
            if (!ANMELDUNG.offen) {
                ANMELDUNG._vollbildZeigen();
            }
            return;
        }

        /* Angemeldet, aber der Eintrag ist aus der Liste verschwunden (in
           einem anderen UPCrew-Spiel entfernt): abmelden. */
        if (echt && !SPIELER.spielerFinden(daten, ANMELDUNG.ichId)) {
            ANMELDUNG.abmelden(true);
        }
    },

    /* ---------------------------------------------------------------- *
     * Das Vollbild
     * ---------------------------------------------------------------- */

    _vollbildZeigen() {
        ANMELDUNG.offen = true;
        ANMELDUNG._wurzelEl.hidden = false;
        document.body.classList.add("anmeldung-offen");
        ANMELDUNG._weicheZeigen();
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
    },

    _anmeldenZeigen() {
        const kasten = ANMELDUNG._kastenBauen("Anmelden",
            "Mit dem Namen und Passwort deines UPCrew-Kontos — von jedem Gerät aus.");
        const name = ANMELDUNG._feldBauen(kasten, "Name", false, "username");
        const passwort = ANMELDUNG._feldBauen(kasten, "Passwort", true, "current-password");

        const los = BAUSTEINE.knopf({ text: "Anmelden", art: "haupt", breit: true });
        const pruefen = () => {
            los.disabled = name.feld.value.trim() === "" || passwort.feld.value === "";
        };
        name.feld.addEventListener("input", pruefen);
        passwort.feld.addEventListener("input", pruefen);
        pruefen();

        let fehlversuche = 0;
        los.addEventListener("click", async () => {
            if (los.disabled) {
                return;
            }
            los.disabled = true;

            const spieler = SPIELER.spielerNachName(ANMELDUNG.abgleich.daten, name.feld.value);
            if (!spieler) {
                name.fehler.textContent = "Diesen Namen gibt es nicht. Neu hier? Dann erstell ein UPCrew-Konto.";
                pruefen();
                return;
            }
            name.fehler.textContent = "";

            if (!SPIELER.hatPasswort(spieler)) {
                await DIALOG.hinweis("Konto ohne Passwort",
                    "Für " + spieler.name + " ist kein Passwort hinterlegt, deshalb "
                        + "lässt sich die Anmeldung nicht prüfen. Wende dich bitte an UPCrew.");
                pruefen();
                return;
            }

            const richtig = await VERSIEGELUNG.passwortPruefen(
                passwort.feld.value, spieler.pinSalz, spieler.pinPruefwert);
            if (richtig) {
                ANMELDUNG._uebernehmen(spieler);
                ANMELDUNG._fertig();
                return;
            }

            fehlversuche++;
            passwort.feld.value = "";
            passwort.fehler.textContent = fehlversuche >= 3
                ? "Wieder falsch. Passwort vergessen? Zurücksetzen geht noch nicht "
                    + "in der App — wende dich bitte an UPCrew."
                : "Das Passwort stimmt nicht.";
            pruefen();
            passwort.feld.focus();
        });

        kasten.appendChild(los);
        ANMELDUNG._eingabetaste([name, passwort], los);
        kasten.appendChild(BAUSTEINE.knopf({
            text: "Zurück", art: "flach", breit: true, beiKlick: () => ANMELDUNG._weicheZeigen()
        }));
        name.feld.focus();
    },

    _neuesKontoZeigen() {
        const kasten = ANMELDUNG._kastenBauen("Neues UPCrew-Konto",
            "Damit spielst du in allen UPCrew-Spielen. Deinen Namen sehen die "
                + "anderen in der Rangliste.");
        const name = ANMELDUNG._feldBauen(kasten, "Name", false, "username");
        const passwort = ANMELDUNG._feldBauen(kasten, "Passwort (" + SPIELER.PASSWORT_MIN
            + " bis " + SPIELER.PASSWORT_MAX + " Zeichen)", true, "new-password");
        const wiederholung = ANMELDUNG._feldBauen(kasten, "Passwort wiederholen", true, "new-password");

        const los = BAUSTEINE.knopf({ text: "Konto erstellen", art: "haupt", breit: true });

        /* Jede Regel meldet sich sofort unter ihrem Feld; der Knopf wird erst
           frei, wenn alles stimmt. */
        const pruefen = () => {
            const nameWert = name.feld.value.trim();
            const nameFehler = nameWert === "" ? "" : SPIELER.namePruefen(ANMELDUNG.abgleich.daten, nameWert, null);
            const passwortFehler = passwort.feld.value === "" ? "" : SPIELER.passwortPruefen(passwort.feld.value);
            const wiederholungFehler = (wiederholung.feld.value !== ""
                && wiederholung.feld.value !== passwort.feld.value)
                ? "Die beiden Passwörter sind nicht gleich." : "";

            name.fehler.textContent = nameFehler;
            passwort.fehler.textContent = passwortFehler;
            wiederholung.fehler.textContent = wiederholungFehler;

            los.disabled = nameWert === "" || nameFehler !== ""
                || passwort.feld.value === "" || passwortFehler !== ""
                || wiederholung.feld.value === "" || wiederholungFehler !== "";
        };
        [name, passwort, wiederholung].forEach((teil) => teil.feld.addEventListener("input", pruefen));
        pruefen();

        los.addEventListener("click", async () => {
            if (los.disabled) {
                return;
            }
            los.disabled = true;
            await ANMELDUNG._kontoAnlegen(name.feld.value.trim(), passwort.feld.value);
        });

        kasten.appendChild(los);
        ANMELDUNG._eingabetaste([name, passwort, wiederholung], los);
        kasten.appendChild(BAUSTEINE.knopf({
            text: "Zurück", art: "flach", breit: true, beiKlick: () => ANMELDUNG._weicheZeigen()
        }));
        name.feld.focus();
    },

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
        const alt = await DIALOG.eingabe("Passwort ändern", "Zuerst das bisherige Passwort.",
            "", "Weiter", true);
        if (alt === null) {
            return;
        }
        if (!await VERSIEGELUNG.passwortPruefen(alt, ich.pinSalz, ich.pinPruefwert)) {
            await DIALOG.hinweis("Das stimmt nicht", "Das bisherige Passwort war falsch.");
            return;
        }
        const neu = await DIALOG.eingabe("Neues Passwort", SPIELER.PASSWORT_MIN + " bis "
            + SPIELER.PASSWORT_MAX + " Zeichen. Gilt in allen UPCrew-Spielen.", "", "Weiter", true);
        if (neu === null) {
            return;
        }
        const regel = SPIELER.passwortPruefen(neu);
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
        const salz = VERSIEGELUNG.salzErzeugen();
        const pruefwert = await VERSIEGELUNG.passwortPruefwertBilden(neu, salz);
        ANMELDUNG.abgleich.aendern(SPIELER.passwortSetzen(ANMELDUNG.abgleich.daten, ich.id, pruefwert, salz));
        DIALOG.kurzmeldung("Passwort geändert");
    },

    /* `still` = ohne Rückfrage (das Konto ist verschwunden). */
    async abmelden(still) {
        if (!still) {
            const sicher = await DIALOG.frage("Abmelden?",
                "Dein Konto bleibt bestehen. Du kannst dich jederzeit wieder anmelden.",
                "Abmelden", false);
            if (!sicher) {
                return;
            }
        }
        await ANMELDUNG.abgleich.sofortSchreiben();
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
