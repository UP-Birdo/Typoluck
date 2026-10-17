/*
 * bildschirm-herausforderungen.js — die Herausforderungen: „Heute" (seit
 * 0.10.0, UPCrew-Runde 5; von 0.7.0 bis 0.9.0 ein Platzhalter).
 *
 * Nutzer 27.09.2026 (UPCrew-Konzept FORTSCHRITT.md, „GÜLTIGER STAND"):
 * Der Aufgaben-Tab zeigt nur HEUTE — je Spiel eine Tagesaufgabe mit
 * Figuren-Wertung, beide geschafft = ×1,5 XP (die Serie steht seit 0.25.0
 * als Kapsel im Kopf des Starts). Die jeweils andere App steht als Karte
 * mit „Zu …" darunter. Auftrag: Design-Auftrag AUFTRAEGE-RUNDE-5.md.
 *
 *   1. Tageswort (Typoluck) — offen: „Raten"; gespielt: Figuren.
 *   2. Tagesbrett (Blunderluck) — was Blunderluck im selben Browser
 *      eingetragen hat (seit 0.11.0 sein Zweig: `spiele.blunderluck.heute`
 *      mit `figuren > 0` und `datum` = heute), sonst „Zu Blunderluck".
 *   3. ×1,5 — leuchtet, wenn beide geschafft sind.
 *
 * Gerechnet wird nichts hier: Figuren und Serie kommen aus
 * js\fortschritt.js, der Stand des Tagesworts aus START.SPIELE.
 *
 * Erreichbar über den linken Eintrag der Leiste unten („Aufgaben",
 * NAVIGATION.LEISTE). Die Leiste heisst kurz „Aufgaben", der Bildschirm
 * „Herausforderungen" (Nutzer-Entscheidung 26.09.2026), gleich in
 * Blunderluck.
 */

const HERAUSFORDERUNGEN_BILDSCHIRM = {

    TITEL: "Herausforderungen",

    anmelden() {
        NAVIGATION.anmelden({
            id: "herausforderungen",
            titel: HERAUSFORDERUNGEN_BILDSCHIRM.TITEL,
            zeichen: "aufgaben",
            /* Steht links in der Leiste unten, nicht im Menü. */
            imMenue: false,
            zeigen: (behaelter) => HERAUSFORDERUNGEN_BILDSCHIRM.zeigen(behaelter)
        });
    },

    zeigen(behaelter) {
        behaelter.appendChild(BAUSTEINE.kopfzeile(HERAUSFORDERUNGEN_BILDSCHIRM.TITEL));

        const datum = WORDLE.datumText(APP.jetzt());
        const fortschritt = APP.fortschritt();
        const heute = {
            wort: FORTSCHRITT.heuteVon(fortschritt, "typoluck", datum),
            brett: FORTSCHRITT.heuteVon(fortschritt, "blunderluck", datum)
        };

        behaelter.appendChild(BAUSTEINE.el("h2", "heute-titel", "Heute"));
        behaelter.appendChild(HERAUSFORDERUNGEN_BILDSCHIRM._tageswortBauen(heute.wort));
        behaelter.appendChild(HERAUSFORDERUNGEN_BILDSCHIRM._tagesbrettBauen(heute.brett));

        const beide = heute.wort > 0 && heute.brett > 0;
        const faktor = BAUSTEINE.el("p", "heute-beide" + (beide ? " heute-beide-an" : ""));
        faktor.appendChild(BAUSTEINE.zeichen("beide"));
        faktor.appendChild(BAUSTEINE.el("strong", null, "×1,5"));
        faktor.setAttribute("aria-label", beide ? "Beide geschafft: ×1,5 XP" : "Beide schaffen: ×1,5 XP");
        behaelter.appendChild(faktor);

        /* Die Serie (bis 0.24.0 hier als sieben Flammen) steht seit 0.25.0
           oben im Kopf des Starts (Serien-Kapsel, gemeinsame Runde 7). */
    },

    /* Eine Karte je Tagesaufgabe: links das Bild, rechts Spiel, Name,
       Zusatz und Figuren oder Knopf. */
    _karteBauen(angaben) {
        const karte = BAUSTEINE.karte(null, "heute-karte" + (angaben.erledigt ? " heute-karte-erledigt" : ""));
        karte.appendChild(angaben.bild);
        const texte = BAUSTEINE.el("div", "heute-texte");
        texte.appendChild(BAUSTEINE.el("span", "heute-spiel", angaben.spiel));
        const name = BAUSTEINE.el("strong", "heute-name", angaben.name);
        /* Die Schwierigkeit als 1–3 Punkte — sie bestimmt die
           Grund-XP (leicht 15, mittel 20, schwer 30, js\fortschritt.js). */
        if (angaben.stufe) {
            const punkte = BAUSTEINE.el("span", "heute-stufe");
            punkte.setAttribute("role", "img");
            punkte.setAttribute("aria-label", "Schwierigkeit " + WERTUNG.STUFEN_NAMEN[angaben.stufe]);
            punkte.title = WERTUNG.STUFEN_NAMEN[angaben.stufe] + " · +" + FORTSCHRITT.grundXp(angaben.stufe) + " XP";
            for (let i = 1; i <= 3; i++) {
                punkte.appendChild(BAUSTEINE.el("i", i <= angaben.stufe ? "an" : null));
            }
            name.appendChild(punkte);
        }
        texte.appendChild(name);
        texte.appendChild(BAUSTEINE.el("span", "heute-zusatz", angaben.zusatz));
        texte.appendChild(angaben.unten);
        karte.appendChild(texte);
        return karte;
    },

    _tageswortBauen(figuren) {
        const spiel = START.SPIELE[0];
        const stand = spiel.tagesStand();
        const bild = BAUSTEINE.el("span", "heute-wort");
        for (let i = 0; i < WORDLE.LAENGE; i++) {
            bild.appendChild(BAUSTEINE.el("i", figuren > 0 ? "heute-wort-an" : null));
        }
        bild.setAttribute("aria-hidden", "true");

        /* Offen oder angefangen: raten. Erledigt: die Figuren — auch 0, wenn
           es nicht gelöst wurde (oder vor 0.10.0 bzw. auf einem anderen
           Gerät gespielt; dann weiss dieses Gerät keine Wertung). */
        const unten = stand === "erledigt"
            ? HERAUSFORDERUNGEN_BILDSCHIRM._erledigtBauen(figuren,
                APP.eigenesErgebnis(WORDLE.datumText(APP.jetzt())), HERAUSFORDERUNGEN_BILDSCHIRM._heutigeRunde())
            : BAUSTEINE.knopf({
                text: stand === "angefangen" ? "Weiter" : "Raten", art: "haupt", klein: true,
                beiKlick: () => NAVIGATION.zeigen("wordle", { modus: "tag" })
            });
        return HERAUSFORDERUNGEN_BILDSCHIRM._karteBauen({
            bild: bild, spiel: "Typoluck", name: "Tageswort",
            stufe: WERTUNG.schwierigkeit(WORDLE.tageswort(WORDLE.datumText(APP.jetzt())).wort),
            zusatz: spiel.tagesName().replace("Tageswort ", ""),
            unten: unten, erledigt: stand === "erledigt"
        });
    },

    /*
     * ERLEDIGT — GELÖST ODER NICHT (seit 0.37.0; aus der Rauchprobe 0.34.3:
     * ein verlorenes Tageswort sah unter Aufgaben aus wie „nicht gespielt“ —
     * leere Figuren, sonst nichts). Unter den Figuren steht jetzt, wie es
     * ausging: „Gelöst · 3/6“ oder „Nicht gelöst“. Weiss das Gerät kein
     * Ergebnis (anderes Gerät, Verlauf noch nicht geladen), nur die Figuren.
     *
     * EXTRA-LEBEN: Das gespeicherte Ergebnis zählt eine Lösung im 7. Versuch
     * als „nicht gelöst“ (Rangliste fair, jsrgebnisse.js `ausRunde`) — das
     * bleibt so. Für die Anzeige gilt deshalb zuerst die beendete Runde des
     * Tages auf DIESEM Gerät (`runde`): gewonnen in 7 = „Gelöst · 7 mit
     * Extra-Leben“. Wertung, Serie und XP ändern sich dadurch nicht.
     */
    ergebnisText(ergebnis, runde) {
        if (runde && typeof runde === "object" && runde.zustand === "gewonnen" && Array.isArray(runde.versuche)) {
            const n = runde.versuche.length;
            return n > WORDLE.VERSUCHE ? "Gelöst · " + n + " mit Extra-Leben" : "Gelöst · " + n + "/" + WORDLE.VERSUCHE;
        }
        if (!ergebnis || typeof ergebnis !== "object") {
            return "";
        }
        return ergebnis.geloest === true
            ? "Gelöst · " + ergebnis.versuche + "/" + WORDLE.VERSUCHE
            : "Nicht gelöst";
    },

    /* Die beendete Tagesrunde von heute auf diesem Gerät, sonst null. */
    _heutigeRunde() {
        const runde = WORDLE.normalisieren(ICH.spielstand("wordle-tag"));
        return (runde && runde.datum === WORDLE.datumText(APP.jetzt()) && runde.zustand !== "laeuft") ? runde : null;
    },

    _erledigtBauen(figuren, ergebnis, runde) {
        const reihe = BAUSTEINE.figuren(figuren, true);
        /* Freigabe „ausgang-aufgaben“ (seit 0.38.0): aus = nur die Figuren wie bis 0.36.0. */
        const frei = typeof UPCREW_FREIGABE === "undefined" || UPCREW_FREIGABE.darf("ausgang-aufgaben");
        const text = frei ? HERAUSFORDERUNGEN_BILDSCHIRM.ergebnisText(ergebnis, runde) : "";
        if (!text) {
            return reihe;
        }
        const unten = BAUSTEINE.el("span", "heute-erledigt");
        unten.appendChild(reihe);
        unten.appendChild(BAUSTEINE.el("span", "heute-ergebnis"
            + (text === "Nicht gelöst" ? " heute-ergebnis-verloren" : ""), text));
        return unten;
    },

    _tagesbrettBauen(figuren) {
        const andere = KONFIG.andereSpiele.blunderluck;
        const bild = BAUSTEINE.el("span", "heute-brett");
        for (let i = 0; i < 16; i++) {
            bild.appendChild(BAUSTEINE.el("i"));
        }
        bild.setAttribute("aria-hidden", "true");

        const unten = figuren > 0
            ? BAUSTEINE.figuren(figuren, true)
            : BAUSTEINE.knopf({
                text: "Zu " + andere.name, art: "still", klein: true, zeichen: "weiter",
                beiKlick: () => {
                    window.location.href = andere.adresse;
                }
            });
        return HERAUSFORDERUNGEN_BILDSCHIRM._karteBauen({
            bild: bild, spiel: andere.name, name: "Tagesbrett", zusatz: "für alle gleich",
            unten: unten, erledigt: figuren > 0
        });
    }
};
