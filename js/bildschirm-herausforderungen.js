/*
 * bildschirm-herausforderungen.js — die Herausforderungen: „Heute" (seit
 * 0.10.0, UPCrew-Runde 5; von 0.7.0 bis 0.9.0 ein Platzhalter).
 *
 * Nutzer 27.09.2026 (Apps\UPCrew\docs\FORTSCHRITT.md, „GÜLTIGER STAND"):
 * Der Aufgaben-Tab zeigt nur HEUTE — je Spiel eine Tagesaufgabe mit
 * Figuren-Wertung, beide geschafft = ×1,5 XP, darunter die Serie (sieben
 * Flammen) mit dem Serien-Schutz. Die jeweils andere App steht als Karte
 * mit „Zu …" darunter. Auftrag: Design\3D-Schrift\docs\AUFTRAEGE-RUNDE-5.md.
 *
 *   1. Tageswort (Typoluck) — offen: „Raten"; gespielt: Figuren.
 *   2. Tagesbrett (Blunderluck) — was Blunderluck im selben Browser
 *      eingetragen hat (`heute.brett` im gemeinsamen Fortschritt), sonst
 *      „Zu Blunderluck".
 *   3. ×1,5 — leuchtet, wenn beide geschafft sind.
 *   4. Serie — sieben Flammen, rechts die Zahl der Schutz-Schilde.
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
        const heute = fortschritt.heute.datum === datum ? fortschritt.heute : { wort: 0, brett: 0 };

        behaelter.appendChild(BAUSTEINE.el("h2", "heute-titel", "Heute"));
        behaelter.appendChild(HERAUSFORDERUNGEN_BILDSCHIRM._tageswortBauen(heute.wort));
        behaelter.appendChild(HERAUSFORDERUNGEN_BILDSCHIRM._tagesbrettBauen(heute.brett));

        const beide = heute.wort > 0 && heute.brett > 0;
        const faktor = BAUSTEINE.el("p", "heute-beide" + (beide ? " heute-beide-an" : ""));
        faktor.appendChild(BAUSTEINE.zeichen("beide"));
        faktor.appendChild(BAUSTEINE.el("strong", null, "×1,5"));
        faktor.setAttribute("aria-label", beide ? "Beide geschafft: ×1,5 XP" : "Beide schaffen: ×1,5 XP");
        behaelter.appendChild(faktor);

        behaelter.appendChild(HERAUSFORDERUNGEN_BILDSCHIRM._serieBauen(fortschritt, datum));
    },

    /* Eine Karte je Tagesaufgabe: links das Bild, rechts Spiel, Name,
       Zusatz und Figuren oder Knopf. */
    _karteBauen(angaben) {
        const karte = BAUSTEINE.karte(null, "heute-karte" + (angaben.erledigt ? " heute-karte-erledigt" : ""));
        karte.appendChild(angaben.bild);
        const texte = BAUSTEINE.el("div", "heute-texte");
        texte.appendChild(BAUSTEINE.el("span", "heute-spiel", angaben.spiel));
        texte.appendChild(BAUSTEINE.el("strong", "heute-name", angaben.name));
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
            ? BAUSTEINE.figuren(figuren, true)
            : BAUSTEINE.knopf({
                text: stand === "angefangen" ? "Weiter" : "Raten", art: "haupt", klein: true,
                beiKlick: () => NAVIGATION.zeigen("wordle", { modus: "tag" })
            });
        return HERAUSFORDERUNGEN_BILDSCHIRM._karteBauen({
            bild: bild, spiel: "Typoluck", name: "Tageswort",
            zusatz: spiel.tagesName().replace("Tageswort ", ""),
            unten: unten, erledigt: stand === "erledigt"
        });
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
    },

    /* Sieben Flammen: so viele leuchten, wie die Serie Tage hat (ab sieben
       alle). Daneben die Zahl — und rechts die Schutz-Schilde. */
    _serieBauen(fortschritt, datum) {
        const tage = FORTSCHRITT.serieAn(fortschritt, datum);
        const reihe = BAUSTEINE.el("section", "heute-serie");
        reihe.setAttribute("aria-label", "Serie " + tage + " Tage, Serien-Schutz " + fortschritt.serie.schutz);
        const flammen = BAUSTEINE.el("span", "heute-flammen");
        for (let i = 0; i < 7; i++) {
            const flamme = BAUSTEINE.el("span", "heute-flamme" + (i < tage ? " heute-flamme-an" : ""));
            flamme.appendChild(BAUSTEINE.zeichen("serie"));
            flammen.appendChild(flamme);
        }
        reihe.appendChild(flammen);
        reihe.appendChild(BAUSTEINE.el("strong", "heute-serie-zahl", String(tage)));
        const schutz = BAUSTEINE.el("span", "heute-schutz");
        schutz.appendChild(BAUSTEINE.zeichen("schutz"));
        schutz.appendChild(BAUSTEINE.el("span", null, String(fortschritt.serie.schutz)));
        reihe.appendChild(schutz);
        return reihe;
    }
};
