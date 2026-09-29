/*
 * navigation.js — welcher Bildschirm gerade zu sehen ist: als SEITE im
 * Hauptelement oder als BLATT darüber.
 *
 * Jeder Bildschirm meldet sich mit `NAVIGATION.anmelden({...})` an:
 *
 *     {
 *         id:        "rangliste",
 *         titel:     "Rangliste",        // Titel (im Blatt oben)
 *         zeichen:   "rangliste",        // Name aus BAUSTEINE.ZEICHEN
 *         alsBlatt:  true,               // wahlfrei: öffnet als Blatt (seit 0.25.0)
 *         blattTitel(parameter),         // wahlfrei: Titel des Blatts je Parameter
 *         blattRechts(parameter),        // wahlfrei: Knöpfe rechts im Blatt-Kopf (Zahnrad)
 *         zeigen(behaelter, parameter),  // baut seinen Inhalt in den Behälter
 *         verlassen()                    // optional: aufräumen (Tastatur usw.)
 *     }
 *
 * Neue Spiele und neue Bildschirme kommen so dazu, ohne dass diese Datei
 * sich ändert: anmelden, fertig.
 *
 * SEITE ODER BLATT (seit 0.25.0, gemeinsame Runde 7 mit Blunderluck; Nutzer
 * 29.09.2026: „tabs werden auch als popup gezeigt das soll nicht" und „wenn
 * man scrollt kommt oben wieder die menüs sichtbar"). Was IN DER LEISTE steht
 * (Shop · Sammlung · Start · Aufgaben · Rangliste), ist eine normale SEITE
 * im Hauptelement. Blätter (gemeinsamer Baustein js\upcrew-blatt.js) NUR für
 * Bereiche ohne Leisten-Knopf: Profil, Einstellungen, Verwaltung, Freunde
 * (`alsBlatt: true`). Blätter stapeln sich (Profil → Einstellungen →
 * Verwaltung); ist ein Bildschirm schon im Stapel, gehen nur die darüber zu.
 * Ein Wechsel der SEITE (Leiste, Wischen, Zurück) schliesst alle Blätter
 * (`UPCREW_BLATT.alleSchliessen()`). Die Seite dahinter hält der Baustein
 * fest (`html.up-bl-offen`), solange etwas offen ist — so scheint beim
 * Rollen nichts von ihr durch. Ohne den Baustein (Tests) ist ein Blatt eine
 * Seite wie früher, mit „Zurück" (`imBlatt` sagt es dem Bildschirm).
 *
 * DAS MENÜ HINTER DEN DREI BALKEN gab es von 0.3.0 bis 0.24.0. Seit 0.25.0
 * ist es weg, seine Punkte sind verteilt wie in Blunderluck: Profil = das
 * Kurzprofil oben links, Einstellungen = das Zahnrad im Profil, Freunde =
 * der Knopf in der Rangliste (samt Zahl offener Anfragen, `markeSetzen`).
 *
 * DIE LEISTE UNTEN (seit 0.5.0) wird EINMAL gebaut (`leisteBauen`) und steht
 * fest am unteren Rand — auf JEDEM Bildschirm ausser in der Runde. Beim
 * Wechsel wird nur neu markiert (`_leisteMarkieren`). Seit 0.9.0 der
 * gemeinsame Baustein css\upcrew-leiste.css; die Tabs baut `BAUSTEINE.tab`,
 * „aktiv" ist allein aria-current="page". Reihenfolge seit 0.25.0 in beiden
 * Spielen (Nutzer 28.09.2026): Shop · Sammlung · Start · Aufgaben ·
 * Rangliste.
 *
 * DIE ZURÜCK-TASTE DES HANDYS gehört dazu: Jeder Wechsel legt einen Eintrag
 * in den Browser-Verlauf (history.pushState), jedes Blatt auch. Drückt man
 * Zurück, geht das oberste Blatt zu, sonst kommt der vorige Bildschirm. Wer
 * einen Eintrag ersetzen statt stapeln will, ruft `zeigen(id, parameter,
 * true)`.
 */

const NAVIGATION = {

    _bildschirme: {},
    _reihenfolge: [],
    _inhaltEl: null,
    aktuell: null,
    _parameter: null,

    /* Zahlen an Knöpfen (z. B. offene Freundesanfragen), je Bildschirm-Id.
       Gezeigt werden sie dort, wo der Knopf steht (`marke(id)`). */
    _marken: {},

    /*
     * Die Einträge der Leiste unten, von links nach rechts.
     *   id           der Bildschirm, den der Eintrag zeigt (fehlt beim
     *                Platzhalter)
     *   text         Name — ein Wort; sichtbar nur am aktiven Tab
     *   zeichen      Name aus BAUSTEINE.ZEICHEN
     *   auchAktivBei weitere Bildschirme, bei denen der Eintrag als
     *                „hier bin ich" markiert ist (ein Spiel gehört zum Start)
     *   platzhalter  true = abgeschaltet, hält nur den Platz frei
     */
    LEISTE: [
        /* Seit 0.25.0 (Nutzer 28.09.2026: „in beiden spielen shop nach ganz
           links dann sammlung start herausforderung und dann ganz rechts
           rangliste"). Bis 0.24.0: Aufgaben · Sammlung · Start · Rangliste ·
           Shop. */
        { id: "shop", text: "Shop", zeichen: "shop" },
        { id: "sammlung", text: "Sammlung", zeichen: "sammlung" },
        { id: "start", text: "Start", zeichen: "start", auchAktivBei: ["wordle"] },
        { id: "herausforderungen", text: "Aufgaben", zeichen: "aufgaben" },
        { id: "rangliste", text: "Rangliste", zeichen: "rangliste" }
    ],

    _leisteEl: null,

    /* Die offenen Blätter dieser Navigation, unten zuerst:
       { id, parameter, eintrag (UPCREW_BLATT), verlauf (Eintrag im Verlauf) }. */
    _blaetter: [],
    _ebenenEl: null,
    /* Wie viele popstate-Ereignisse gleich kommen, weil ein Blatt selbst
       zurückgegangen ist (Kreuz, Grund, Esc) — die werden überhört. */
    _stilleZurueck: 0,

    anmelden(bildschirm) {
        NAVIGATION._bildschirme[bildschirm.id] = bildschirm;
        NAVIGATION._reihenfolge.push(bildschirm.id);
    },

    starten(inhaltEl, startId, leisteEl, ebenenEl) {
        NAVIGATION._inhaltEl = inhaltEl;
        if (leisteEl) {
            NAVIGATION.leisteBauen(leisteEl);
            NAVIGATION.wischenEinrichten(inhaltEl);
        }
        if (ebenenEl && typeof UPCREW_BLATT !== "undefined") {
            NAVIGATION._ebenenEl = ebenenEl;
            UPCREW_BLATT.einrichten({ ebenen: ebenenEl, haupt: inhaltEl });
        }

        window.addEventListener("popstate", (ereignis) => NAVIGATION._beiZurueck(ereignis.state, startId));

        try {
            history.replaceState({ id: startId, parameter: null }, "");
        } catch (fehler) {
            /* Unter file:// verweigern manche Browser den Verlauf — dann
               eben ohne Zurück-Taste. */
        }
        NAVIGATION._wechseln(startId, null);
    },

    _beiZurueck(zustand, startId) {
        if (NAVIGATION._stilleZurueck > 0) {
            NAVIGATION._stilleZurueck--;
            return;
        }
        /* Erst das oberste Blatt (samt Karten darüber) schliessen. */
        const oben = NAVIGATION._blaetter[NAVIGATION._blaetter.length - 1];
        if (oben && oben.verlauf) {
            oben.verlauf = false;
            while (UPCREW_BLATT.anzahl() > 0 && NAVIGATION._blaetter.indexOf(oben) !== -1) {
                UPCREW_BLATT.schliessen("verlauf");
            }
            return;
        }
        if (zustand && NAVIGATION._bildschirme[zustand.id]) {
            NAVIGATION._wechseln(zustand.id, zustand.parameter || null);
        } else {
            NAVIGATION._wechseln(startId, null);
        }
    },

    /* Einen Bildschirm zeigen. `ersetzen` = kein neuer Verlaufseintrag. */
    zeigen(id, parameter, ersetzen) {
        const bildschirm = NAVIGATION._bildschirme[id];
        if (!bildschirm) {
            return;
        }
        if (bildschirm.alsBlatt && NAVIGATION.blattMoeglich()) {
            NAVIGATION._blattOeffnen(id, parameter || null, ersetzen);
            return;
        }
        const zustand = { id: id, parameter: parameter || null };
        try {
            if (ersetzen) {
                history.replaceState(zustand, "");
            } else {
                history.pushState(zustand, "");
            }
        } catch (fehler) {
            /* wie oben */
        }
        NAVIGATION._wechseln(id, parameter || null);
    },

    zurueck() {
        if (history.state && history.state.id !== "start" && history.length > 1) {
            history.back();
        } else {
            NAVIGATION.zeigen("start", null, true);
        }
    },

    /* Den gerade sichtbaren Bildschirm neu bauen — nach neuen Daten; offene
       Blätter bauen sich mit neu (ihre Rollposition bleibt). */
    auffrischen() {
        if (NAVIGATION.aktuell) {
            NAVIGATION._bauen(NAVIGATION.aktuell, NAVIGATION._parameter);
        }
        for (const blatt of NAVIGATION._blaetter.slice()) {
            NAVIGATION._blattBauen(blatt);
        }
    },

    /* Merkt eine Zahl für einen Knopf (z. B. offene Freundesanfragen) und
       zeigt sie sofort an jedem sichtbaren Knopf mit `data-marke="<id>"`. */
    markeSetzen(id, zahl) {
        NAVIGATION._marken[id] = zahl || 0;
        if (typeof document === "undefined" || typeof document.querySelectorAll !== "function") {
            return;
        }
        for (const knopf of document.querySelectorAll("[data-marke=\"" + id + "\"]")) {
            NAVIGATION.markeAnbringen(knopf, id);
        }
    },

    marke(id) {
        return NAVIGATION._marken[id] || 0;
    },

    /* Hängt die Zahl an einen Knopf (oder nimmt sie weg). */
    markeAnbringen(knopf, id) {
        knopf.dataset.marke = id;
        const alt = knopf.querySelector(".menue-marke");
        if (alt) {
            alt.remove();
        }
        if (NAVIGATION.marke(id) > 0) {
            knopf.appendChild(BAUSTEINE.el("span", "menue-marke", String(NAVIGATION.marke(id))));
        }
        return knopf;
    },

    /* ---------------------------------------------------------------- *
     * Blätter (seit 0.25.0, gemeinsamer Baustein js\upcrew-blatt.js)
     * ---------------------------------------------------------------- */

    blattMoeglich() {
        return typeof UPCREW_BLATT !== "undefined" && !!NAVIGATION._ebenenEl;
    },

    /* Steht der Behälter in einem Blatt? (Dann trägt das Blatt Titel und
       Schliessen — der Bildschirm baut keine eigene Kopfzeile.) */
    imBlatt(behaelter) {
        return !!(behaelter && behaelter.classList && behaelter.classList.contains("up-bl-inhalt"));
    },

    blattOffen(id) {
        return NAVIGATION._blaetter.some((blatt) => blatt.id === id);
    },

    /* Ist der Bildschirm zu sehen — als Seite oder als Blatt? */
    sichtbar(id) {
        return NAVIGATION.aktuell === id || NAVIGATION.blattOffen(id);
    },

    _blattOeffnen(id, parameter, ohneVerlauf) {
        const bildschirm = NAVIGATION._bildschirme[id];
        /* Schon im Stapel: nur die darüber schliessen, neu zeichnen. */
        const stelle = NAVIGATION._blaetter.findIndex((blatt) => blatt.id === id);
        if (stelle !== -1) {
            while (NAVIGATION._blaetter.length > stelle + 1) {
                NAVIGATION._blaetter[NAVIGATION._blaetter.length - 1].eintrag.schliessen();
            }
            const blatt = NAVIGATION._blaetter[stelle];
            blatt.parameter = parameter;
            NAVIGATION._blattBauen(blatt);
            return blatt.eintrag;
        }
        const blatt = { id: id, parameter: parameter, eintrag: null, verlauf: false };
        if (!ohneVerlauf) {
            try {
                history.pushState({ id: NAVIGATION.aktuell, parameter: NAVIGATION._parameter, blatt: id }, "");
                blatt.verlauf = true;
            } catch (fehler) {
                /* wie oben */
            }
        }
        blatt.eintrag = UPCREW_BLATT.oeffnen({
            titel: bildschirm.blattTitel ? bildschirm.blattTitel(parameter) : bildschirm.titel,
            klasse: "blatt-" + id,
            rechts: bildschirm.blattRechts ? bildschirm.blattRechts(parameter) : [],
            beimSchliessen: (wie) => NAVIGATION._blattZu(blatt, wie)
        });
        NAVIGATION._blaetter.push(blatt);
        NAVIGATION._blattBauen(blatt);
        return blatt.eintrag;
    },

    _blattBauen(blatt) {
        const inhalt = blatt.eintrag.inhalt;
        const y = inhalt.scrollTop;
        inhalt.innerHTML = "";
        inhalt.dataset.bildschirm = blatt.id;
        NAVIGATION._bildschirme[blatt.id].zeigen(inhalt, blatt.parameter);
        inhalt.scrollTop = y;
    },

    _blattZu(blatt, wie) {
        const stelle = NAVIGATION._blaetter.indexOf(blatt);
        if (stelle !== -1) {
            NAVIGATION._blaetter.splice(stelle, 1);
        }
        const bildschirm = NAVIGATION._bildschirme[blatt.id];
        if (bildschirm && bildschirm.verlassen && !NAVIGATION.blattOffen(blatt.id)) {
            bildschirm.verlassen();
        }
        /* Mit Kreuz, Grund, Esc oder im Code geschlossen: den eigenen
           Verlaufseintrag zurücknehmen (das popstate dazu wird überhört). */
        if (blatt.verlauf && wie !== "verlauf" && wie !== "alle") {
            blatt.verlauf = false;
            NAVIGATION._stilleZurueck++;
            try {
                history.back();
            } catch (fehler) {
                NAVIGATION._stilleZurueck--;
            }
        }
    },

    /* Alle Blätter und Karten zu — beim Wechsel der Seite. */
    _alleSchliessen() {
        if (typeof UPCREW_BLATT !== "undefined" && UPCREW_BLATT.anzahl() > 0) {
            UPCREW_BLATT.alleSchliessen();
        }
        NAVIGATION._blaetter = [];
    },

    /* ---------------------------------------------------------------- *
     * Die Leiste unten (seit 0.5.0)
     * ---------------------------------------------------------------- */

    /* Baut die Einträge aus `LEISTE` in das feste Element aus index.html.
       Läuft einmal beim Start; danach wird nur noch markiert. */
    leisteBauen(leisteEl) {
        NAVIGATION._leisteEl = leisteEl;
        leisteEl.innerHTML = "";
        for (const eintrag of NAVIGATION.LEISTE) {
            const tab = BAUSTEINE.tab({
                name: eintrag.text, zeichen: eintrag.zeichen, still: !!eintrag.platzhalter,
                beiKlick: () => {
                    /* Ein Tipp auf den Eintrag, auf dem man schon steht,
                       legt keinen neuen Verlaufseintrag an — offene Blätter
                       gehen aber zu (die Seite ist dann wieder zu sehen). */
                    if (NAVIGATION.aktuell !== eintrag.id) {
                        NAVIGATION.zeigen(eintrag.id, null);
                    } else {
                        NAVIGATION._alleSchliessen();
                    }
                }
            });
            if (!eintrag.platzhalter) {
                tab.dataset.bildschirm = eintrag.id;
            }
            leisteEl.appendChild(tab);
        }
        leisteEl.hidden = false;
        NAVIGATION._leisteMarkieren();
        /* Seit 0.15.12 („C · Gleiten + Hüpfen"): EINE Kapsel fährt zum neuen
           Tab — der gemeinsame Baustein js/upcrew-leiste.js beobachtet
           `aria-current` selbst, am Tab-Wechsel ändert sich hier nichts. */
        if (typeof UPCREW_LEISTE !== "undefined") {
            UPCREW_LEISTE.an(leisteEl);
        }
    },

    /*
     * WISCHEN (seit 0.15.10, gemeinsamer Baustein js\upcrew-wischen.js):
     * wischbar sind die Tabs der Leiste in ihrer Reihenfolge. Gewechselt
     * wird über denselben Weg wie ein Tipp auf die Leiste. Nicht gewischt
     * wird während einer Runde (`body.im-spiel`), in der Anmeldung, im Intro
     * und bei offenen Dialogen; nie auf dem Spielfeld, der Tastatur und
     * Umschaltern (`WISCHEN_SPERREN`, dazu die Sperren des Bausteins).
     * Blätter liegen ausserhalb des Hauptelements — auf ihnen wird nicht
     * gewischt.
     */
    WISCHEN_SPERREN: ".wordle-brett, .tastatur, .segment, .menue, .werkstatt-kachelwahl, .bib-blatt-grund",

    wischenTabs() {
        return NAVIGATION.LEISTE.map((eintrag) => (eintrag.platzhalter
            ? { id: "platz-" + eintrag.text.toLowerCase(), still: true } : eintrag.id));
    },

    wischenErlaubt() {
        const body = document.body;
        return !body.classList.contains("im-spiel")
            && !body.classList.contains("anmeldung-offen")
            && !body.classList.contains("dialog-offen")
            && !(typeof ANMELDUNG !== "undefined" && ANMELDUNG.offen)
            && !document.querySelector(".upi:not([hidden])");
    },

    wischenEinrichten(inhaltEl) {
        if (typeof UPCREW_WISCHEN === "undefined" || !inhaltEl) {
            return null;
        }
        return UPCREW_WISCHEN.an(inhaltEl, {
            tabs: () => NAVIGATION.wischenTabs(),
            aktiv: () => NAVIGATION.aktuell,
            /* Derselbe Weg wie ein Tipp auf die Leiste (leisteBauen). */
            wechseln: (id) => {
                if (NAVIGATION.aktuell !== id) {
                    NAVIGATION.zeigen(id, null);
                }
            },
            erlaubt: () => NAVIGATION.wischenErlaubt(),
            sperren: NAVIGATION.WISCHEN_SPERREN
        });
    },

    _leisteMarkieren() {
        const leiste = NAVIGATION._leisteEl;
        if (!leiste) {
            return;
        }
        for (const tab of leiste.querySelectorAll(".up-tab")) {
            const eintrag = NAVIGATION.LEISTE.find((e) => e.id && e.id === tab.dataset.bildschirm);
            const aktiv = !!eintrag && (eintrag.id === NAVIGATION.aktuell
                || (eintrag.auchAktivBei || []).indexOf(NAVIGATION.aktuell) !== -1);
            if (aktiv) {
                tab.setAttribute("aria-current", "page");
            } else {
                tab.removeAttribute("aria-current");
            }
        }
    },

    /* ---------------------------------------------------------------- *
     * Innereien
     * ---------------------------------------------------------------- */

    _wechseln(id, parameter) {
        /* Eine neue Seite: alle Blätter zu (Einbau-Notiz 29.09.2026). */
        NAVIGATION._alleSchliessen();
        const vorher = NAVIGATION._bildschirme[NAVIGATION.aktuell];
        if (vorher && vorher.verlassen && NAVIGATION.aktuell !== id) {
            vorher.verlassen();
        }
        NAVIGATION.aktuell = id;
        NAVIGATION._parameter = parameter;
        NAVIGATION._bauen(id, parameter);
        NAVIGATION._leisteMarkieren();
        window.scrollTo(0, 0);
    },

    _bauen(id, parameter) {
        const bildschirm = NAVIGATION._bildschirme[id];
        const inhalt = NAVIGATION._inhaltEl;
        inhalt.innerHTML = "";
        inhalt.dataset.bildschirm = id;
        document.body.dataset.bildschirm = id;
        bildschirm.zeigen(inhalt, parameter);
    }
};
