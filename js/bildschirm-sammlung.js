/*
 * bildschirm-sammlung.js — der Tab „Sammlung" (seit 0.9.0, UPCrew-Runde 4).
 *
 * Nutzer 27.09.2026: „Anpassen soll nicht unter einem Knopf liegen, muss
 * zusammenpassen." Album und Anpassen sind deshalb EINE Fläche, und sie
 * ersetzt den Tab „Anpassen" von 0.8.0 (bis dahin js\bildschirm-anpassen.js).
 * Auftrag: Design\3D-Schrift\docs\AUFTRAEGE-RUNDE-4.md.
 *
 * DAS GERÜST (seit 0.15.9) ist der gemeinsame Baustein js\upcrew-sammlung.js
 * + css\upcrew-sammlung.css aus Apps\UPCrew\bausteine — in Blunderluck
 * derselbe (Nutzer 27.09.2026: „bei beiden Apps soll Sammlung gleich sein
 * und immer gleich bleiben", „1:1 bis auf die spieleigenen Items"). Er baut:
 *   1. den klebenden Kopf „Sammlung" mit „NN %" (SAMMLUNG.anteil);
 *   2. den Ort für js\upcrew-anpassen.js: Umschalter der Spiele, klebende
 *      Vorschau, Regale Farbwelt · Schrift · Knöpfe · Darstellung · Sets,
 *      Balken „Zurück · Übernehmen" auf der Leiste;
 *   3. davor die reine Sammlung: zuerst „Abzeichen" (js\upcrew-abzeichen.js,
 *      gleich in beiden Apps), dann die spieleigenen Gruppen (Modi,
 *      Kachel-Sets aus js\sammlung.js).
 * Eigen ist hier NUR, was Typoluck hat: die Gruppen, das Bild eines Stücks
 * (`.stueck-bild`, Kürzel), die Markierung des getragenen Kachel-Sets
 * (`.stueck-aktiv`) und was Antippen tut. Das Gerüst setzt die App nur über
 * die Stellschrauben in css\stil.css (`--up-sm-rand`, `--up-sm-leiste`,
 * `--oben-frei`). Der Tab steht DIREKT im rollenden Inhalt (`#inhalt`), und
 * die Seite selbst rollt — sonst kleben Kopf, Vorschau und Balken am
 * iPhone versetzt (Nutzer-Bild 27.09.2026).
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

    /* Besessenes Aussehen (seit 0.27.0, Einbau 29.09.2026c): frei, egal
       welches Level. Der Shop von Typoluck verkauft heute keine Farbwelt,
       Schrift oder Knöpfe — die Naht ist nur vorbereitet. */
    besitz(art, wert) {
        return false;
    },

    _alleFrei() {
        return typeof WERKSTATT !== "undefined" && WERKSTATT.aktiv()
            && !WERKSTATT._parameter().has("gesperrt");
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

        const wurzel = BAUSTEINE.el("section");
        behaelter.appendChild(wurzel);
        const geruest = UPCREW_SAMMLUNG.bauen(wurzel, { titel: SAMMLUNG_BILDSCHIRM.TITEL });

        SAMMLUNG_BILDSCHIRM._tab = UPCREW_ANPASSEN.zeigen(geruest.ort, {
            app: "typoluck",
            stufe: SAMMLUNG_BILDSCHIRM.stufe(),
            alleFrei: SAMMLUNG_BILDSCHIRM._alleFrei(),
            besitz: SAMMLUNG_BILDSCHIRM.besitz
        });

        /* Die reine Sammlung VOR den Balken (das Gerüst weiß, wohin), „NN %"
           in den Kopf, die Vorschau bündig darunter. */
        geruest.restEinsetzen(SAMMLUNG_BILDSCHIRM._restBauen());
        const anteil = SAMMLUNG.anteil(UPCREW_ANPASSEN.STUFEN, SAMMLUNG_BILDSCHIRM.stufe(),
            SAMMLUNG_BILDSCHIRM._alleFrei(), SAMMLUNG_BILDSCHIRM._taten(), SAMMLUNG_BILDSCHIRM.besitz);
        geruest.anteilSetzen(anteil.hat, anteil.alle);
        geruest.obenSetzen();
    },

    /* Die erfüllten Taten (seit 0.13.0) — aus dem Fortschritt. */
    _taten() {
        return FORTSCHRITT.erfuellteTaten(APP.fortschritt(), WORDLE.datumText(APP.jetzt()));
    },

    /* Die reine Sammlung aus den Teilen des Gerüsts: zuerst die Abzeichen
       (Stand von JETZT, über alle Spiele), dann je Gruppe ein Teil
       „Name n/m" mit einem Gitter aus Stücken. */
    _restBauen() {
        const rest = UPCREW_SAMMLUNG.rest();
        const datum = WORDLE.datumText(APP.jetzt());
        rest.appendChild(UPCREW_SAMMLUNG.abzeichenTeil(FORTSCHRITT.abzeichen(APP.fortschritt(), datum),
            (eintrag) => DIALOG.hinweis(eintrag.titel, "", UPCREW_ABZEICHEN.blatt(eintrag))));

        const gewaehlt = KACHELSETS.gewaehlt();
        for (const gruppe of SAMMLUNG.gruppen(SAMMLUNG_BILDSCHIRM._taten(), SAMMLUNG_BILDSCHIRM._alleFrei(),
            SAMMLUNG_BILDSCHIRM.stufe())) {
            const zahl = SAMMLUNG.gruppeZaehlen(gruppe);
            const teil = UPCREW_SAMMLUNG.teil(gruppe.titel, zahl.hat, zahl.alle);
            const gitter = UPCREW_SAMMLUNG.gitter();
            for (const stueck of gruppe.stuecke) {
                gitter.appendChild(SAMMLUNG_BILDSCHIRM._stueckBauen(stueck, gewaehlt));
            }
            teil.appendChild(gitter);
            rest.appendChild(teil);
        }
        return rest;
    },

    /* Ein Stück: das Gerüst baut den Knopf, Typoluck gibt das Bild (Kürzel
       oder „?") und markiert das getragene Kachel-Set. Gesperrt über das
       Level steht „ab 6" statt des Namens (seit 0.15.0). */
    _stueckBauen(stueck, gewaehlt) {
        const bild = BAUSTEINE.el("span", "stueck-bild", stueck.da ? String(stueck.name).slice(0, 2) : "?");
        const schloss = typeof stueck.ab === "number" ? "ab " + stueck.ab : "···";
        const knopf = UPCREW_SAMMLUNG.stueck({
            name: stueck.da ? stueck.name : schloss,
            bild: bild,
            da: stueck.da,
            beiKlick: () => SAMMLUNG_BILDSCHIRM._stueckAntippen(stueck, gewaehlt)
        });
        if (!stueck.da) {
            knopf.setAttribute("aria-label", "Noch nicht da, " + schloss);
        }
        if (stueck.anziehbar === true && stueck.id === gewaehlt) {
            knopf.classList.add("stueck-aktiv");
            knopf.setAttribute("aria-current", "true");
        }
        return knopf;
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
