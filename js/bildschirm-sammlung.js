/*
 * bildschirm-sammlung.js — der Tab „Sammlung" (seit 0.9.0, UPCrew-Runde 4).
 *
 * Nutzer 27.09.2026: „Anpassen soll nicht unter einem Knopf liegen, muss
 * zusammenpassen." Album und Anpassen sind deshalb EINE Fläche, und sie
 * ersetzt den Tab „Anpassen" von 0.8.0 (bis dahin js\bildschirm-anpassen.js).
 * Auftrag: Design-Auftrag AUFTRAEGE-RUNDE-4.md.
 *
 * SEIT 0.30.0 „VARIANTE A" (UPCrew-Runde 8; Nutzer 03.10.2026: „es soll
 * nicht mehr nach rechts oder links scroll bar sein das hin und her wischen
 * gehört dem tab wechsel"): Statt waagrecht rollender Regal-Reihen stehen
 * unter der Vorschau KATEGORIE-KACHELN im 2er-Raster; ein Tipp öffnet ein
 * BLATT mit den Stücken (rollt nur senkrecht). Nichts auf der Seite rollt
 * mehr waagrecht — ein Wisch gehört dem Seiten-Band.
 *
 * DAS GERÜST (seit 0.15.9) ist der gemeinsame Baustein js\upcrew-sammlung.js
 * + css\upcrew-sammlung.css aus den UPCrew-Bausteinen — in Blunderluck
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
 * MIT SHOP UND BESITZ (seit 0.31.0; 0.30.0 lief noch mit `shop: false`):
 * Was im Shop gekauft ist, ist frei — `besitz(art, wert)` fragt
 * js\besitz.js (Gerät + Konto vereinigt, je Person). Gesperrtes, das es zu
 * kaufen gibt, trägt „im Shop". Der heutige Weg (Taten, Level) bleibt
 * daneben unverändert: Frei ist, was vorher frei war, ODER was gekauft ist.
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

    /* Besessenes (seit 0.27.0 als Naht, seit 0.31.0 echt): frei, egal
       welches Level — was die Person von jetzt im Shop gekauft hat
       (js\besitz.js). `art` ist der Katalog-Schlüssel („kachelset",
       „schrift" …). */
    besitz(art, wert) {
        return typeof BESITZ !== "undefined" && BESITZ.hat(art, wert);
    },

    /* Auf dem heutigen Weg frei — ohne Kauf (seit 0.31.0, für den Shop:
       so ein Stück wird dort nicht noch einmal verkauft). Gerechnet im
       Modell (`SAMMLUNG.erspielt`). */
    erspielt(art, wert) {
        return SAMMLUNG.erspielt(art, wert, SAMMLUNG_BILDSCHIRM._taten(), SAMMLUNG_BILDSCHIRM._alleFrei(),
            SAMMLUNG_BILDSCHIRM.stufe());
    },

    /* Der Weg in den Shop (seit 0.34.5, UPCrew-Runde 9; Vertrag `zumShop`
       im Kopf von js\upcrew-anpassen.js): Das Blatt zeigt für ein
       kaufbares, nicht besessenes Stück „Im Shop ansehen", schliesst sich
       beim Tipp und ruft hier mit dem Katalog-Schlüssel { art, wert }.
       Derselbe Weg wie ein Tipp auf die Leiste (das Band rollt; ist die
       Shop-Seite noch nicht gebaut oder veraltet, zeichnet der Wechsel sie
       jetzt), dann Reiter „Design" und das Stück-Blatt. Klappt das Öffnen
       nicht, bleibt es beim Tab-Wechsel. */
    zumShop(stueck) {
        if (!stueck || !stueck.art || !stueck.wert || typeof NAVIGATION === "undefined") {
            return false;
        }
        if (NAVIGATION.aktuell !== "shop") {
            NAVIGATION.zeigen("shop", null);
        }
        return typeof SHOP_BILDSCHIRM !== "undefined" && SHOP_BILDSCHIRM.stueckOeffnen(stueck.art, stueck.wert);
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
            regale: [SAMMLUNG_BILDSCHIRM._kachelsetRegal()],
            vorschau: SAMMLUNG_BILDSCHIRM._vorschau,
            zumShop: (stueck) => SAMMLUNG_BILDSCHIRM.zumShop(stueck)
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
       ob es frei ist (Tat oder Level — oder, seit 0.31.0, gekauft;
       js\sammlung.js). Übernommen wird über js\kachelsets.js — der Baustein
       lässt nur Freies zu. */
    _kachelsetRegal() {
        return {
            schluessel: "kachelset",
            titel: "Kachel-Sets",
            wert: KACHELSETS.gewaehlt(),
            stuecke: SAMMLUNG.kachelsetStuecke(SAMMLUNG_BILDSCHIRM._taten(), SAMMLUNG_BILDSCHIRM._alleFrei(),
                SAMMLUNG_BILDSCHIRM.stufe(), SAMMLUNG_BILDSCHIRM.besitz),
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
