/*
 * bildschirm-sammlung.js — der Tab „Sammlung" (seit 0.9.0, UPCrew-Runde 4).
 *
 * Nutzer 27.09.2026: „Anpassen soll nicht unter einem Knopf liegen, muss
 * zusammenpassen." Album und Anpassen sind deshalb EINE Fläche, und sie
 * ersetzt den Tab „Anpassen" von 0.8.0 (bis dahin js\bildschirm-anpassen.js).
 * Auftrag: Design\3D-Schrift\docs\AUFTRAEGE-RUNDE-4.md.
 *
 * SEIT 0.30.0 „VARIANTE A" (UPCrew-Runde 8; Nutzer 03.10.2026: „es soll
 * nicht mehr nach rechts oder links scroll bar sein das hin und her wischen
 * gehört dem tab wechsel"): Statt waagrecht rollender Regal-Reihen stehen
 * unter der Vorschau KATEGORIE-KACHELN im 2er-Raster; ein Tipp öffnet ein
 * BLATT mit den Stücken (rollt nur senkrecht). Nichts auf der Seite rollt
 * mehr waagrecht — ein Wisch gehört dem Seiten-Band.
 *
 * DAS GERÜST (seit 0.15.9) ist der gemeinsame Baustein js\upcrew-sammlung.js
 * + css\upcrew-sammlung.css aus Apps\UPCrew\bausteine — in Blunderluck
 * derselbe (Nutzer 27.09.2026: „bei beiden Apps soll Sammlung gleich sein
 * und immer gleich bleiben", „1:1 bis auf die spieleigenen Items"). Er baut:
 *   1. den klebenden Kopf „Sammlung" mit „NN %";
 *   2. den Ort für js\upcrew-anpassen.js: klebende Vorschau, die Kacheln
 *      (zuerst Typolucks eigenes Regal „Kachel-Sets", dann die Arten aus
 *      dem Katalog js\upcrew-katalog.js, dann Darstellung · Sets), Balken
 *      „Zurück · Übernehmen" auf der Leiste;
 *   3. aus jedem Abschnitt der reinen Sammlung („Abzeichen",
 *      js\upcrew-abzeichen.js, und „Modi" aus js\sammlung.js) von selbst
 *      eine weitere Kachel mit Blatt.
 * Eigen ist hier NUR, was Typoluck hat: das Regal der Kachel-Sets (welche
 * frei sind, sagt js\sammlung.js; angezogen wird über js\kachelsets.js),
 * die Kachel-Farben des Sets in der Vorschau, die Modi und das Bild eines
 * Modus (`.stueck-bild`, Kürzel). Das Gerüst setzt die App nur über die
 * Stellschrauben in css\stil.css (`--up-sm-rand`, `--up-sm-leiste`,
 * `--oben-frei`). Der Tab steht DIREKT im Ort seiner Seite (`.inhalt`), und
 * die Seite selbst rollt (seit 0.29.0 die Seite im Band, bis 0.28.1 das
 * Dokument) — sonst kleben Kopf, Vorschau und Balken am iPhone versetzt
 * (Nutzer-Bild 27.09.2026).
 *
 * „NN %" (seit 0.30.0): `tab.zaehlen()` des Anpassen-Bausteins (alle
 * Sammel-Kacheln samt Kachel-Sets) plus die eigenen Abschnitte (Abzeichen,
 * Modi) — zusammengezählt in `SAMMLUNG.anteil`. Die eigene Rechnung über
 * die Stufen-Tabelle des Bausteins ist weg.
 *
 * OHNE SHOP (0.30.0): Der Shop mit Besitz und Kauf kommt in einer eigenen
 * Version. Bis dahin `shop: false` — gesperrte Stücke tragen „wird erspielt",
 * `besitz` liefert fest false. Frei bleibt, was vorher frei war.
 *
 * DIE STUFE ist seit 0.10.0 das Level (js\fortschritt.js): Was darüber
 * liegt, kann man in der Vorschau ansehen, aber nicht übernehmen. Ab welcher Stufe was frei ist,
 * steht allein im Baustein (`UPCREW_ANPASSEN.STUFEN`), nie hier — und die
 * Oberfläche nennt seit 0.30.0 kein Level mehr. In der Werkstatt
 * (?werkstatt) ist alles frei.
 *
 * Erreichbar über Platz 2 der Leiste unten und über die Zeile „Anpassen" in
 * den Einstellungen.
 */

const SAMMLUNG_BILDSCHIRM = {

    TITEL: "Sammlung",

    /* Der laufende Tab des Bausteins (seit 0.29.0, solange die Seite im
       Band steht — auch wenn gerade eine andere Seite eingerastet ist). */
    _tab: null,

    anmelden() {
        NAVIGATION.anmelden({
            id: "sammlung",
            titel: SAMMLUNG_BILDSCHIRM.TITEL,
            zeichen: "sammlung",
            /* Steht in der Leiste unten, nicht im Menü. */
            imMenue: false,
            zeigen: (behaelter) => SAMMLUNG_BILDSCHIRM.zeigen(behaelter),
            /* Seit 0.29.0 (Seiten-Band): Die Sammlung bleibt als Seite im
               Band stehen — der Tab baut sich beim Verlassen NICHT mehr ab
               (`entfernen` leert ihn), sonst käme beim Zurückwischen eine
               leere Seite herein. Neu gezeichnet wird beim Einrasten
               (`zeigen` meldet den alten Tab zuerst ab). Nur ohne Band
               (gemeinsamer Ort) wird wie bis 0.28.1 aufgeräumt. */
            verlassen: () => {
                if (!NAVIGATION.imBand("sammlung")) {
                    SAMMLUNG_BILDSCHIRM.entfernen();
                }
            }
        });
    },

    /* Die erreichte Stufe für das Aussehen = das Level (seit 0.10.0,
       UPCrew-Runde 5, js\fortschritt.js; 0.9.0 lieferte hier 0). Seit
       0.11.0 über alle Spiele (Summe der Zweige). */
    stufe() {
        return APP.level().level;
    },

    /* Besessenes Aussehen (seit 0.27.0, Einbau 29.09.2026c): frei, egal
       welches Level. Typoluck speichert noch keinen Besitz (der Shop mit
       Kauf kommt eigens) — die Naht ist nur vorbereitet. */
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
            besitz: SAMMLUNG_BILDSCHIRM.besitz,
            /* Der Shop mit Besitz kommt eigens: bis dahin „wird erspielt". */
            shop: false,
            regale: [SAMMLUNG_BILDSCHIRM._kachelsetRegal()],
            vorschau: SAMMLUNG_BILDSCHIRM._vorschau
        });

        /* Die reine Sammlung VOR den Balken (das Gerüst weiß, wohin, und
           macht aus jedem Abschnitt eine Kachel mit Blatt), „NN %" in den
           Kopf, die Vorschau bündig darunter. */
        const rest = SAMMLUNG_BILDSCHIRM._restBauen();
        geruest.restEinsetzen(rest);
        const abschnitte = Array.from(rest.querySelectorAll(".up-sm-teil"))
            .map((abschnitt) => ({ hat: abschnitt.dataset.hat, alle: abschnitt.dataset.alle }));
        const anteil = SAMMLUNG.anteil(SAMMLUNG_BILDSCHIRM._tab.zaehlen(), abschnitte);
        geruest.anteilSetzen(anteil.hat, anteil.alle);
        geruest.obenSetzen();
    },

    /* Die erfüllten Taten (seit 0.13.0) — aus dem Fortschritt. */
    _taten() {
        return FORTSCHRITT.erfuellteTaten(APP.fortschritt(), WORDLE.datumText(APP.jetzt()));
    },

    /* Die Kachel-Sets als eigenes Regal des Anpassen-Bausteins (seit
       0.30.0; bis 0.29.0 eine Gruppe der reinen Sammlung mit „Anziehen"-
       Rückfrage). Der Schlüssel „kachelset" ist die Katalog-Art: Die Liste
       der Stücke kommt aus js\upcrew-katalog.js, Typoluck sagt je Stück,
       ob es frei ist (Tat oder Level, js\sammlung.js). Übernommen wird über
       js\kachelsets.js — der Baustein lässt nur Freies zu. */
    _kachelsetRegal() {
        return {
            schluessel: "kachelset",
            titel: "Kachel-Sets",
            wert: KACHELSETS.gewaehlt(),
            stuecke: SAMMLUNG.kachelsetStuecke(SAMMLUNG_BILDSCHIRM._taten(), SAMMLUNG_BILDSCHIRM._alleFrei(),
                SAMMLUNG_BILDSCHIRM.stufe()),
            uebernehmen: KACHELSETS.waehlen
        };
    },

    /* Die Vorschau des Bausteins zeigt die Kacheln in den Farben der
       Farbwelt. Typoluck legt das Kachel-Set des Entwurfs darüber (seit
       0.30.0 — sonst sähe man beim Antippen eines Sets keine Probe): die
       Variablen des Sets an Brett und Tasten der Vorschau, dazu sein
       Muster. Beide Teile baut der Baustein bei jedem Zeichnen neu, es
       bleibt also nichts vom vorigen Set stehen. Papier setzt nichts. */
    _vorschau(el, entwurf, app) {
        if (app !== "typoluck" || !el || typeof el.querySelectorAll !== "function") {
            return;
        }
        const id = (entwurf && entwurf.extra && entwurf.extra.kachelset) || KACHELSETS.STANDARD;
        const werte = KACHELSETS.werte(id, el.dataset.modus);
        const muster = KACHELSETS.set(id).muster;
        for (const teil of el.querySelectorAll(".upa-brett, .upa-tasten")) {
            for (const name of Object.keys(werte)) {
                teil.style.setProperty(name, werte[name]);
            }
        }
        if (muster) {
            for (const flaeche of el.querySelectorAll(".upa-kachel:not(.leer), .upa-tasten span")) {
                flaeche.style.backgroundImage = muster;
            }
        }
    },

    /* Die reine Sammlung aus den Teilen des Gerüsts: zuerst die Abzeichen
       (Stand von JETZT, über alle Spiele), dann je Gruppe ein Teil
       „Name n/m" mit einem Gitter aus Stücken. Die Kachel-Sets stehen
       seit 0.30.0 nicht mehr hier (sie sind ein Regal, siehe oben). */
    _restBauen() {
        const rest = UPCREW_SAMMLUNG.rest();
        const datum = WORDLE.datumText(APP.jetzt());
        rest.appendChild(UPCREW_SAMMLUNG.abzeichenTeil(FORTSCHRITT.abzeichen(APP.fortschritt(), datum),
            (eintrag) => DIALOG.hinweis(eintrag.titel, "", UPCREW_ABZEICHEN.blatt(eintrag))));

        for (const gruppe of SAMMLUNG.restGruppen(SAMMLUNG_BILDSCHIRM._taten(), SAMMLUNG_BILDSCHIRM._alleFrei(),
            SAMMLUNG_BILDSCHIRM.stufe())) {
            const zahl = SAMMLUNG.gruppeZaehlen(gruppe);
            const teil = UPCREW_SAMMLUNG.teil(gruppe.titel, zahl.hat, zahl.alle, gruppe.id);
            const gitter = UPCREW_SAMMLUNG.gitter();
            for (const stueck of gruppe.stuecke) {
                gitter.appendChild(SAMMLUNG_BILDSCHIRM._stueckBauen(stueck));
            }
            teil.appendChild(gitter);
            rest.appendChild(teil);
        }
        return rest;
    },

    /* Ein Stück der reinen Sammlung (ein Modus): das Gerüst baut den Knopf,
       Typoluck gibt das Bild (Kürzel oder „?"). */
    _stueckBauen(stueck) {
        const bild = BAUSTEINE.el("span", "stueck-bild", stueck.da ? String(stueck.name).slice(0, 2) : "?");
        const knopf = UPCREW_SAMMLUNG.stueck({
            name: stueck.da ? stueck.name : "···",
            bild: bild,
            da: stueck.da,
            beiKlick: () => SAMMLUNG_BILDSCHIRM._stueckAntippen(stueck)
        });
        if (!stueck.da) {
            knopf.setAttribute("aria-label", "Noch nicht da");
        }
        return knopf;
    },

    /* Antippen zeigt die eine Zeile des Stücks — was es ist oder was es
       wird („Kommt: …"). */
    _stueckAntippen(stueck) {
        DIALOG.hinweis(stueck.da ? stueck.name : "?", stueck.text);
    },

    entfernen() {
        if (SAMMLUNG_BILDSCHIRM._tab) {
            SAMMLUNG_BILDSCHIRM._tab.entfernen();
            SAMMLUNG_BILDSCHIRM._tab = null;
        }
    }
};
