/*
 * navigation.js — welcher Bildschirm gerade zu sehen ist: als SEITE (im
 * Band der Leisten-Tabs oder im gemeinsamen Ort) oder als BLATT darüber.
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
 * DAS SEITEN-BAND (seit 0.29.0, UPCrew-Runde 8, gemeinsamer Baustein
 * js\upcrew-wischen.js; Nutzer 03.10.2026: „als wären die seiten nicht
 * wirklich getrent einzelene seiten sondern eine breite wo man durch scrollen
 * kann wagrecht und an fix punkten hängen bleiebt"). Jeder Bildschirm MIT
 * Leisten-Knopf hat seine EIGENE, stehenbleibende Seite im Band (`#band`,
 * gebaut in `bandBauen` aus `LEISTE`): `zeigen(behaelter, …)` bekommt den
 * Ort dieser Seite. Der Browser rollt das Band waagrecht und rastet ein; der
 * Baustein ruft danach `wechseln` — derselbe Weg wie ein Tipp auf die Leiste.
 *   - Gezeichnet wird die offene Seite sofort, die anderen im Leerlauf nach
 *     dem Start und spätestens, wenn der Baustein `kommt(id)` meldet. Beim
 *     Einrasten (und beim Tipp) wird die Seite neu gezeichnet wie bisher.
 *   - `verlassen()` baut eine Leisten-Seite nicht ab — sie bleibt stehen.
 *   - Alles OHNE Leisten-Knopf (Runde, Rückfall-Seiten) zeichnet weiter in
 *     den gemeinsamen Ort (`#inhalt`); solange so ein Bildschirm offen ist,
 *     ist das Band verborgen und der Baustein ruht.
 *   - Das Dokument rollt nicht mehr: jede Seite des Bandes und der Rollbereich
 *     um den gemeinsamen Ort rollen für sich (css\stil.css, „Der Rahmen").
 *   - Ohne Band-Element oder ohne den Baustein (Tests) zeichnet wie bis 0.28.1
 *     jeder Bildschirm in den gemeinsamen Ort.
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

    /* Das Seiten-Band (seit 0.29.0): das Element, der Griff des Bausteins
       (zu, auffrischen …), je Leisten-Bildschirm der Ort in seiner Seite,
       welche Seiten schon gezeichnet sind, und der Rollbereich um den
       gemeinsamen Ort. */
    _bandEl: null,
    _band: null,
    _seiten: {},
    _gebaut: {},
    _freiEl: null,

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
       { id, parameter, eintrag (UPCREW_BLATT) } — den Verlaufseintrag führt der Baustein. */
    _blaetter: [],
    _ebenenEl: null,

    anmelden(bildschirm) {
        NAVIGATION._bildschirme[bildschirm.id] = bildschirm;
        NAVIGATION._reihenfolge.push(bildschirm.id);
    },

    starten(inhaltEl, startId, leisteEl, ebenenEl, bandEl) {
        NAVIGATION._inhaltEl = inhaltEl;
        NAVIGATION.bandBauen(bandEl);
        if (leisteEl) {
            NAVIGATION.leisteBauen(leisteEl);
        }
        if (ebenenEl && typeof UPCREW_BLATT !== "undefined") {
            NAVIGATION._ebenenEl = ebenenEl;
            /* Zurück-Taste: Blätter UND Karten legen seit 0.26.0 im Baustein je einen Verlaufseintrag an; der
               Horcher hier fragt ihn zuerst (UPCREW_BLATT.beiZurueck). */
            UPCREW_BLATT.einrichten({ ebenen: ebenenEl, haupt: inhaltEl, verlauf: true, horchen: false });
        }

        window.addEventListener("popstate", (ereignis) => NAVIGATION._beiZurueck(ereignis.state, startId, ereignis));

        try {
            history.replaceState({ id: startId, parameter: null }, "");
        } catch (fehler) {
            /* Unter file:// verweigern manche Browser den Verlauf — dann
               eben ohne Zurück-Taste. */
        }
        NAVIGATION._wechseln(startId, null);
        /* Erst jetzt das Band anmelden: Es beginnt ohne Weg auf der offenen
           Seite. Danach die übrigen Seiten im Leerlauf zeichnen. */
        NAVIGATION.wischenEinrichten();
        NAVIGATION._imLeerlaufBauen();
    },

    _beiZurueck(zustand, startId, ereignis) {
        /* Erst das oberste Blatt bzw. die oberste Karte (seit 0.26.0 im Baustein, auch Level-Pfad, Vorschau-,
           Serien-Karte und Abzeichen-Wahl); ein still zurückgenommener Eintrag wird dort überhört. */
        if (typeof UPCREW_BLATT !== "undefined" && typeof UPCREW_BLATT.beiZurueck === "function"
                && UPCREW_BLATT.beiZurueck(ereignis || { state: zustand })) {
            return;
        }
        if (zustand && NAVIGATION._bildschirme[zustand.id]) {
            NAVIGATION._wechseln(zustand.id, zustand.parameter || null);
        } else {
            NAVIGATION._wechseln(startId, null);
        }
    },

    /* Einen Bildschirm zeigen. `ersetzen` = kein neuer Verlaufseintrag (das
       Band springt dann ohne Weg zur Seite). */
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
        NAVIGATION._wechseln(id, parameter || null, !!ersetzen);
    },

    zurueck() {
        if (history.state && history.state.id !== "start" && history.length > 1) {
            history.back();
        } else {
            NAVIGATION.zeigen("start", null, true);
        }
    },

    /* Den gerade sichtbaren Bildschirm neu bauen — nach neuen Daten; offene
       Blätter bauen sich mit neu (ihre Rollposition bleibt). Seit 0.29.0
       trifft das nur die EIGENE Seite: Die anderen Seiten des Bandes bleiben
       stehen und werden neu gezeichnet, wenn das Band auf ihnen einrastet. */
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
        const blatt = { id: id, parameter: parameter, eintrag: null };
        blatt.eintrag = UPCREW_BLATT.oeffnen({
            verlauf: !ohneVerlauf,
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
        /* Den Verlaufseintrag nimmt seit 0.26.0 der Baustein selbst zurück. */
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

    /* ---------------------------------------------------------------- *
     * Das Seiten-Band (seit 0.29.0, gemeinsamer Baustein
     * js\upcrew-wischen.js — Vertrag in dessen Kopf)
     * ---------------------------------------------------------------- */

    /*
     * Baut je Leisten-Eintrag EINE Seite in das Band: die Seite
     * (`.up-band-seite`, `data-up-seite="<Bildschirm-Id>"`) rollt senkrecht
     * für sich, darin der Ort (`.inhalt`, `data-bildschirm`), in den der
     * Bildschirm zeichnet — so gelten alle Regeln `.inhalt[data-bildschirm=…]`
     * weiter. Ein stiller Platz (`platzhalter`) bekommt keine Seite. Ohne
     * Band-Element oder ohne den Baustein bleibt alles beim gemeinsamen Ort.
     */
    bandBauen(bandEl) {
        NAVIGATION._bandEl = null;
        NAVIGATION._band = null;
        NAVIGATION._seiten = {};
        NAVIGATION._gebaut = {};
        NAVIGATION._freiEl = null;
        if (!bandEl || typeof UPCREW_WISCHEN === "undefined") {
            return;
        }
        NAVIGATION._bandEl = bandEl;
        const eltern = NAVIGATION._inhaltEl ? NAVIGATION._inhaltEl.parentNode : null;
        NAVIGATION._freiEl = (eltern && eltern.classList && eltern.classList.contains("ohne-leiste"))
            ? eltern : NAVIGATION._inhaltEl;
        bandEl.innerHTML = "";
        for (const eintrag of NAVIGATION.LEISTE) {
            if (eintrag.platzhalter || !eintrag.id || !NAVIGATION._bildschirme[eintrag.id]) {
                continue;
            }
            const seite = document.createElement("section");
            seite.className = "band-seite up-band-seite";
            seite.dataset.upSeite = eintrag.id;
            seite.setAttribute("aria-label", eintrag.text);
            const ort = document.createElement("div");
            ort.className = "inhalt";
            ort.dataset.bildschirm = eintrag.id;
            seite.appendChild(ort);
            bandEl.appendChild(seite);
            NAVIGATION._seiten[eintrag.id] = ort;
        }
    },

    /* Hat der Bildschirm eine eigene Seite im Band? */
    imBand(id) {
        return !!NAVIGATION._seiten[id];
    },

    /* Darf der Bildschirm jetzt in seinen Ort zeichnen (auch nach einem
       späten Laden)? Eine Leisten-Seite immer — sie steht im Band; alles
       andere nur, solange es offen ist (der gemeinsame Ort gehört sonst
       schon dem nächsten Bildschirm). */
    zeichenbar(id) {
        return NAVIGATION.aktuell === id || NAVIGATION.imBand(id);
    },

    /* Die Tabs für den Baustein: die Leiste in ihrer Reihenfolge, ein
       Platzhalter als stiller Tab (er steht nicht im Band). */
    wischenTabs() {
        return NAVIGATION.LEISTE.map((eintrag) => (eintrag.platzhalter
            ? { id: "platz-" + eintrag.text.toLowerCase(), still: true } : eintrag.id));
    },

    /*
     * Gesperrt ist das Band während einer Runde (`body.im-spiel`), in der
     * Anmeldung, im Intro, bei offenen Dialogen und solange das Buch im
     * Vollbild offen ist. Ein offenes Blatt oder eine Karte sperrt der
     * Baustein selbst (html.up-bl-offen).
     */
    wischenErlaubt() {
        const body = document.body;
        return !body.classList.contains("im-spiel")
            && !body.classList.contains("anmeldung-offen")
            && !body.classList.contains("dialog-offen")
            && !body.classList.contains("buch-offen")
            && !(typeof ANMELDUNG !== "undefined" && ANMELDUNG.offen)
            && !document.querySelector(".upi:not([hidden])");
    },

    wischenEinrichten() {
        const bandEl = NAVIGATION._bandEl;
        if (typeof UPCREW_WISCHEN === "undefined" || !bandEl) {
            return null;
        }
        NAVIGATION._band = UPCREW_WISCHEN.an(bandEl, {
            tabs: () => NAVIGATION.wischenTabs(),
            aktiv: () => NAVIGATION.aktuell,
            /* Derselbe Weg wie ein Tipp auf die Leiste (leisteBauen);
               `_wechseln` ruft am Ende `band.zu(id)`. Seit 0.30.0 kommt der
               Ruf FRÜH (`frueh`, unten): schon während das losgelassene
               Band zur Nachbarseite ausrollt, nicht erst nach dem
               Einrasten. `_wechseln` darf das Rollen darum nicht stören —
               es rollt selbst nichts (`band.zu` schweigt, solange die
               Leiste voraus ist), zeichnet die ankommende Seite im selben
               Zug neu (nie leer) und lässt ihren Rollstand stehen. */
            wechseln: (id) => {
                if (NAVIGATION.aktuell !== id) {
                    NAVIGATION.zeigen(id, null);
                }
            },
            erlaubt: () => NAVIGATION.wischenErlaubt(),
            /* Die Seite kommt gleich in Sicht: jetzt zeichnen, falls der
               Leerlauf noch nicht so weit war. */
            kommt: (id) => {
                NAVIGATION._seiteBauen(id);
            },
            /* Die Leiste zieht früher nach (seit 0.30.0, Nutzer 03.10.2026):
               Sobald der Finger oben ist und das Band die Hälfte zur
               Nachbarseite überschritten hat, kommt `wechseln`; beim
               Einrasten dann kein zweites Mal. */
            frueh: true
        });
        NAVIGATION._sperreBeobachten();
        return NAVIGATION._band;
    },

    /* Tabs oder Sperre haben sich geändert (Runde beginnt/endet, Anmeldung):
       Die Sperre gilt dann sofort, nicht erst ab der nächsten Berührung. */
    bandAuffrischen() {
        if (NAVIGATION._band && NAVIGATION._bandEl && !NAVIGATION._bandEl.hidden) {
            NAVIGATION._band.auffrischen();
        }
    },

    /* Alles, wovon `wischenErlaubt` abhängt, steht als Klasse am <body>
       (im-spiel, anmeldung-offen, dialog-offen, buch-offen) oder ist das
       Intro (`hidden`). EIN Wächter an diesen zwei Stellen ruft
       `bandAuffrischen`, sobald sich die Antwort ändert — so muss kein
       Bildschirm daran denken. */
    _sperreBeobachten() {
        if (typeof MutationObserver !== "function" || !document.body) {
            return;
        }
        let zuletzt = NAVIGATION.wischenErlaubt();
        const waechter = new MutationObserver(() => {
            const jetzt = NAVIGATION.wischenErlaubt();
            if (jetzt !== zuletzt) {
                zuletzt = jetzt;
                NAVIGATION.bandAuffrischen();
            }
        });
        waechter.observe(document.body, { attributes: true, attributeFilter: ["class"] });
        const intro = document.querySelector(".upi");
        if (intro) {
            waechter.observe(intro, { attributes: true, attributeFilter: ["hidden"] });
        }
    },

    /* Eine Leisten-Seite zum ersten Mal zeichnen (Leerlauf, `kommt`). Die
       offene Seite zeichnet `_wechseln`. Nicht, solange das Band verborgen
       ist (Runde): Wer beim Zeichnen misst, mässe dann null — die Seite
       kommt später dran (`kommt`, Öffnen). Liefert true, wenn gezeichnet
       wurde. */
    _seiteBauen(id) {
        if (!NAVIGATION._seiten[id] || NAVIGATION._gebaut[id] || !NAVIGATION._bildschirme[id]
                || (NAVIGATION._bandEl && NAVIGATION._bandEl.hidden)) {
            return false;
        }
        NAVIGATION._bauen(id, null);
        return true;
    },

    /* Nach dem Start: die übrigen Seiten nacheinander, je eine im Leerlauf.
       Scheitert eine, bleibt sie leer — beim Öffnen wird sie ohnehin neu
       gezeichnet (und der Fehler dort gezeigt wie bisher). */
    _imLeerlaufBauen() {
        const offen = Object.keys(NAVIGATION._seiten).filter((id) => !NAVIGATION._gebaut[id]);
        if (!offen.length) {
            return;
        }
        const planen = () => {
            if (typeof requestIdleCallback === "function") {
                requestIdleCallback(weiter, { timeout: 600 });
            } else if (typeof setTimeout === "function") {
                setTimeout(weiter, 80);
            }
        };
        const weiter = () => {
            try {
                NAVIGATION._seiteBauen(offen.shift());
            } catch (fehler) {
                /* siehe oben */
            }
            if (offen.length) {
                planen();
            }
        };
        planen();
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

    _wechseln(id, parameter, sofort) {
        /* Eine neue Seite: alle Blätter zu (Einbau-Notiz 29.09.2026). */
        NAVIGATION._alleSchliessen();
        const vorherId = NAVIGATION.aktuell;
        const vorher = NAVIGATION._bildschirme[vorherId];
        if (vorher && vorher.verlassen && vorherId !== id) {
            vorher.verlassen();
        }
        /* Mit Band: Ein Bildschirm ohne Leisten-Knopf räumt den gemeinsamen
           Ort, wenn er geht (eine Leisten-Seite bleibt stehen). */
        if (NAVIGATION._bandEl && vorherId && vorherId !== id && !NAVIGATION.imBand(vorherId)) {
            NAVIGATION._inhaltEl.innerHTML = "";
        }
        NAVIGATION.aktuell = id;
        NAVIGATION._parameter = parameter;
        NAVIGATION._hauptSetzen(id);
        /* Erst zeigen, dann zeichnen: Wer beim Zeichnen misst (die Sammlung
           ihren Kopf, die Runde ihr Brett), braucht einen sichtbaren Ort. */
        const warVerborgen = NAVIGATION._ortZeigen(id);
        NAVIGATION._bauen(id, parameter);
        NAVIGATION._leisteMarkieren();
        NAVIGATION._bandStellen(id, sofort, warVerborgen);
    },

    /* Der Ort, in den ein Bildschirm zeichnet: seine Seite im Band oder der
       gemeinsame Ort. */
    _ort(id) {
        return NAVIGATION._seiten[id] || NAVIGATION._inhaltEl;
    },

    /* Hinter einem Blatt rückt der Ort des OFFENEN Bildschirms zurück
       (`up-bl-dahinter`), und dort wird der Kopf gemessen — mit Band ist das
       je Bildschirm ein anderes Element. Die Blätter sind hier schon zu. */
    _hauptSetzen(id) {
        if (NAVIGATION._bandEl && NAVIGATION._ebenenEl && typeof UPCREW_BLATT !== "undefined") {
            UPCREW_BLATT.einrichten({ ebenen: NAVIGATION._ebenenEl, haupt: NAVIGATION._ort(id), verlauf: true,
                horchen: false });
        }
    },

    /*
     * Band oder gemeinsamer Ort — was zu sehen ist. Eine Leisten-Seite: das
     * Band. Sonst: Band verborgen (der Baustein ruht), dafür der Rollbereich
     * um den gemeinsamen Ort. Liefert, ob das Band vorher verborgen war.
     */
    _ortZeigen(id) {
        const bandEl = NAVIGATION._bandEl;
        if (!bandEl) {
            return false;
        }
        const imBand = NAVIGATION.imBand(id);
        const warVerborgen = !!bandEl.hidden;
        bandEl.hidden = !imBand;
        NAVIGATION._freiEl.hidden = imBand;
        return warVerborgen;
    },

    /*
     * Nach dem Zeichnen: Das Band rollt zur Seite (`band.zu`; kommt es aus
     * dem Verborgenen oder mit `sofort`, ohne Weg), der Rollbereich um den
     * gemeinsamen Ort beginnt oben. `window.scrollTo` gibt es nur noch ohne
     * Band (mit Band rollt das Dokument nicht).
     */
    _bandStellen(id, sofort, warVerborgen) {
        if (!NAVIGATION._bandEl) {
            window.scrollTo(0, 0);
            return;
        }
        if (!NAVIGATION.imBand(id)) {
            NAVIGATION._freiEl.scrollTop = 0;
            return;
        }
        if (!NAVIGATION._band) {
            return;
        }
        if (warVerborgen) {
            NAVIGATION._band.auffrischen();
        } else {
            NAVIGATION._band.zu(id, sofort ? { sofort: true } : undefined);
        }
    },

    /* Zeichnet einen Bildschirm in seinen Ort. Eine Leisten-Seite behält
       dabei ihren Rollstand (wie ein Blatt). */
    _bauen(id, parameter) {
        const bildschirm = NAVIGATION._bildschirme[id];
        const inhalt = NAVIGATION._ort(id);
        const seite = NAVIGATION._seiten[id] ? inhalt.parentNode : null;
        const y = seite ? seite.scrollTop : 0;
        inhalt.innerHTML = "";
        inhalt.dataset.bildschirm = id;
        if (id === NAVIGATION.aktuell) {
            document.body.dataset.bildschirm = id;
        }
        bildschirm.zeigen(inhalt, parameter);
        if (seite) {
            NAVIGATION._gebaut[id] = true;
            seite.scrollTop = y;
        }
    }
};
