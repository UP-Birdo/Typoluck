/*
 * bildschirm-sammlung.js — der Tab „Sammlung" (seit 0.9.0, UPCrew-Runde 4).
 *
 * Nutzer 27.09.2026: „Anpassen soll nicht unter einem Knopf liegen, muss
 * zusammenpassen." Album und Anpassen sind deshalb EINE Fläche, und sie
 * ersetzt den Tab „Anpassen" von 0.8.0 (bis dahin js\bildschirm-anpassen.js).
 * Auftrag: Design\3D-Schrift\docs\AUFTRAEGE-RUNDE-4.md.
 *
 * Von oben nach unten:
 *   1. Kopfzeile „Sammlung", rechts „NN %" gesammelt (SAMMLUNG.anteil).
 *      Sie klebt oben — die Vorschau des Bausteins klebt bündig darunter
 *      (--upa-oben in css\stil-bildschirme.css = Höhe der Kopfzeile).
 *   2. Der gemeinsame Baustein js\upcrew-anpassen.js DIREKT im Tab (kein
 *      Knopf, kein Blatt): Vorschau, Regale Farbwelt · Schrift · Knöpfe ·
 *      Darstellung · Sets. Kopiert aus Design\3D-Schrift\final, nie
 *      abwandeln — in Blunderluck derselbe.
 *   3. Unter den Regalen, VOR dem Balken „Zurück / Übernehmen", die reine
 *      Sammlung (js\sammlung.js, heute „Modi"). Der Balken klebt bündig auf
 *      der Leiste.
 *
 * Eigene Regale (wie Blunderlucks „Brett") hat Typoluck vorerst keins —
 * Kachel-Sets gibt es noch nicht.
 *
 * DIE STUFE ist seit 0.10.0 das Level (js\fortschritt.js): Was darüber
 * liegt, kann man in der Vorschau ansehen, aber nicht übernehmen. Ab welcher Stufe was frei ist,
 * steht allein im Baustein (`UPCREW_ANPASSEN.STUFEN`), nie hier. In der
 * Werkstatt (?werkstatt) ist alles frei.
 *
 * Erreichbar über Platz 2 der Leiste unten und über die Zeile „Anpassen" in
 * den Einstellungen.
 */

const SAMMLUNG_BILDSCHIRM = {

    TITEL: "Sammlung",

    /* Der laufende Tab des Bausteins, solange der Bildschirm zu sehen ist. */
    _tab: null,

    anmelden() {
        NAVIGATION.anmelden({
            id: "sammlung",
            titel: SAMMLUNG_BILDSCHIRM.TITEL,
            zeichen: "sammlung",
            /* Steht in der Leiste unten, nicht im Menü. */
            imMenue: false,
            zeigen: (behaelter) => SAMMLUNG_BILDSCHIRM.zeigen(behaelter),
            verlassen: () => SAMMLUNG_BILDSCHIRM.entfernen()
        });
    },

    /* Die erreichte Stufe für das Aussehen = das Level (seit 0.10.0,
       UPCrew-Runde 5, js\fortschritt.js; 0.9.0 lieferte hier 0). Seit
       0.11.0 über alle Spiele (Summe der Zweige). */
    stufe() {
        return APP.level().level;
    },

    _alleFrei() {
        return typeof WERKSTATT !== "undefined" && WERKSTATT.aktiv();
    },

    zeigen(behaelter) {
        /* Wird der Bildschirm neu gebaut (NAVIGATION.auffrischen), ohne dass
           man ihn verlassen hat, muss der alte Tab sich zuerst abmelden —
           sonst horchte er weiter auf Änderungen am Aussehen. */
        SAMMLUNG_BILDSCHIRM.entfernen();

        if (typeof UPCREW_ANPASSEN === "undefined") {
            behaelter.appendChild(BAUSTEINE.kopfzeile(SAMMLUNG_BILDSCHIRM.TITEL));
            behaelter.appendChild(ZUSTAND.fehler({ text: "Nicht geladen" }));
            return;
        }

        const anteil = SAMMLUNG.anteil(UPCREW_ANPASSEN.STUFEN, SAMMLUNG_BILDSCHIRM.stufe(),
            SAMMLUNG_BILDSCHIRM._alleFrei(), SAMMLUNG_BILDSCHIRM._taten());
        const prozent = BAUSTEINE.el("span", "sammlung-anteil", anteil.prozent + " %");
        prozent.title = anteil.hat + " von " + anteil.alle + " gesammelt";
        prozent.setAttribute("aria-label", prozent.title);
        behaelter.appendChild(BAUSTEINE.kopfzeile(SAMMLUNG_BILDSCHIRM.TITEL, { rechts: prozent }));

        const ort = BAUSTEINE.el("div", "sammlung-ort");
        behaelter.appendChild(ort);
        SAMMLUNG_BILDSCHIRM._tab = UPCREW_ANPASSEN.zeigen(ort, {
            app: "typoluck",
            stufe: SAMMLUNG_BILDSCHIRM.stufe(),
            alleFrei: SAMMLUNG_BILDSCHIRM._alleFrei()
        });

        /* Die reine Sammlung in dieselbe Fläche, VOR den Übernehmen-Balken —
           so bleibt der Balken immer ganz unten. */
        ort.insertBefore(SAMMLUNG_BILDSCHIRM._gruppenBauen(), ort.querySelector(".upa-aktion"));
    },

    /* Je Gruppe ein Regal im Stil des Bausteins (Überschrift „Name n/m"),
       darin ein Gitter aus Stücken. Antippen zeigt die eine Zeile dazu. */
    /* Die erfüllten Taten (seit 0.13.0) — aus dem Fortschritt. */
    _taten() {
        return FORTSCHRITT.erfuellteTaten(APP.fortschritt(), WORDLE.datumText(APP.jetzt()));
    },

    _gruppenBauen() {
        const teil = BAUSTEINE.el("div", "sammlung-rest");
        const gewaehlt = KACHELSETS.gewaehlt();
        for (const gruppe of SAMMLUNG.gruppen(SAMMLUNG_BILDSCHIRM._taten(), SAMMLUNG_BILDSCHIRM._alleFrei(),
            SAMMLUNG_BILDSCHIRM.stufe())) {
            const zahl = SAMMLUNG.gruppeZaehlen(gruppe);
            const regal = BAUSTEINE.el("section", "upa-regal");
            const kopf = BAUSTEINE.el("h2", null, gruppe.titel + " ");
            kopf.appendChild(BAUSTEINE.el("span", "sammlung-zahl", zahl.hat + "/" + zahl.alle));
            regal.appendChild(kopf);

            const gitter = BAUSTEINE.el("div", "sammlung-gitter");
            for (const stueck of gruppe.stuecke) {
                gitter.appendChild(BAUSTEINE.stueck({
                    name: stueck.name, da: stueck.da,
                    aktiv: stueck.anziehbar === true && stueck.id === gewaehlt,
                    /* Gesperrt über das Level (seit 0.15.0): „ab 6" statt „···". */
                    schloss: typeof stueck.ab === "number" ? "ab " + stueck.ab : null,
                    beiKlick: () => SAMMLUNG_BILDSCHIRM._stueckAntippen(stueck, gewaehlt)
                }));
            }
            regal.appendChild(gitter);
            teil.appendChild(regal);
        }
        return teil;
    },

    /* Antippen: Gesperrt mit Tat zeigt die Tat (seit 0.13.0); ein
       anziehbares Stück, das man hat, lässt sich anziehen (seit 0.14.0,
       Kachel-Sets) — danach neu zeichnen, damit die Markierung wandert. */
    async _stueckAntippen(stueck, gewaehlt) {
        if (!stueck.da) {
            /* Der Schloss-Hinweis: die Tat oder das Level (seit 0.15.0). */
            const hinweis = stueck.tat ? FORTSCHRITT.tatTitel(stueck.tat)
                : (typeof stueck.ab === "number" ? "Ab Level " + stueck.ab : stueck.text);
            DIALOG.hinweis("?", hinweis);
            return;
        }
        if (stueck.anziehbar !== true || stueck.id === gewaehlt) {
            DIALOG.hinweis(stueck.name, stueck.text);
            return;
        }
        if (await DIALOG.frage(stueck.name, stueck.text, "Anziehen")) {
            KACHELSETS.waehlen(stueck.id);
            NAVIGATION.auffrischen();
        }
    },

    entfernen() {
        if (SAMMLUNG_BILDSCHIRM._tab) {
            SAMMLUNG_BILDSCHIRM._tab.entfernen();
            SAMMLUNG_BILDSCHIRM._tab = null;
        }
    }
};
