/*
 * navigation.js — welcher Bildschirm gerade zu sehen ist, und das Menü
 * hinter den drei Balken.
 *
 * Jeder Bildschirm meldet sich mit `NAVIGATION.anmelden({...})` an:
 *
 *     {
 *         id:        "rangliste",
 *         titel:     "Rangliste",        // Beschriftung im Menü
 *         zeichen:   "rangliste",        // Name aus BAUSTEINE.ZEICHEN
 *         imMenue:   true,               // steht er im Menü hinter den Balken?
 *         zeigen(behaelter, parameter),  // baut seinen Inhalt in den Behälter
 *         verlassen()                    // optional: aufräumen (Tastatur usw.)
 *     }
 *
 * Neue Spiele und neue Bildschirme kommen so dazu, ohne dass diese Datei
 * sich ändert: anmelden, fertig.
 *
 * DAS MENÜ HINTER DEN DREI BALKEN (seit 0.3.0, Nutzer 25.09.2026: „so wie
 * bei Blunderluck Freunde und Profil in drei Balken Menü"). Auf dem Start
 * oben rechts steht EIN Knopf mit drei Balken (`menueBauen`); ein Tipp
 * klappt die Einträge auf, ein Tipp daneben (oder Esc) klappt sie zu. Die
 * Bildschirme hinter dem Menü haben links oben „Zurück". Vorbild ist
 * Blunderlucks Menüband (dort `START._menuebandBauen` in js\start.js) —
 * nachgebaut, nicht geteilt: Typoluck baut jeden Knopf in BAUSTEINE.knopf.
 * Im Menü seit 0.5.0: Profil, Freunde, Einstellungen.
 *
 * DIE LEISTE UNTEN (seit 0.5.0, Nutzer 25.09.2026: „unten das Tab-Menü
 * sollte nie weg, rechts soll weiterhin die Rangliste, links ein
 * Platzhalter, wird noch kommen"). 0.3.0 hatte die alte Leiste zugunsten
 * des Menüs entfernt; jetzt gibt es beides. Die Leiste wird EINMAL gebaut
 * (`leisteBauen`, aus `starten`) und steht fest am unteren Rand — auf JEDEM
 * Bildschirm, auch im Spiel. Beim Wechsel wird nur neu markiert, welcher
 * Eintrag gerade gilt (`_leisteMarkieren`), sie selbst bleibt stehen.
 * Welche Einträge sie trägt, steht in `LEISTE` — links seit 0.7.0
 * „Aufgaben" (bis 0.6.x ein abgeschalteter Platzhalter „Bald"), seit 0.8.0
 * fünf Plätze mit „Anpassen" ganz rechts.
 *
 * DIE ZURÜCK-TASTE DES HANDYS gehört dazu: Jeder Wechsel legt einen Eintrag
 * in den Browser-Verlauf (history.pushState). Drückt man Zurück, kommt der
 * vorige Bildschirm — nicht die Seite, von der man kam. Wer einen Eintrag
 * ersetzen statt stapeln will (z. B. vom Ende einer Runde zur Rangliste),
 * ruft `zeigen(id, parameter, true)`.
 */

const NAVIGATION = {

    _bildschirme: {},
    _reihenfolge: [],
    _inhaltEl: null,
    aktuell: null,
    _parameter: null,

    /* Die Zahlen am Menü (z. B. offene Freundesanfragen), je Bildschirm-Id.
       Sie werden gemerkt, weil das Menü bei jedem Zeichnen neu entsteht. */
    _marken: {},

    /* Das gerade sichtbare Menü: der Halter, und ob es offen ist. */
    _menueHalter: null,
    _menueOffen: false,
    _aussenHoerer: null,

    /*
     * Die Einträge der Leiste unten, von links nach rechts.
     *   id           der Bildschirm, den der Eintrag zeigt (fehlt beim
     *                Platzhalter)
     *   text         Beschriftung unter dem Zeichen — ein Wort
     *   zeichen      Name aus BAUSTEINE.ZEICHEN
     *   auchAktivBei weitere Bildschirme, bei denen der Eintrag als
     *                „hier bin ich" markiert ist (ein Spiel gehört zum Start)
     *   platzhalter  true = abgeschaltet, hält nur den Platz frei
     * Wer den Platzhalter mit Leben füllt, gibt ihm eine `id` und nimmt
     * `platzhalter` weg — sonst ändert sich nichts.
     */
    LEISTE: [
        /* Seit 0.7.0 (UPCrew-Runde 2) statt des Platzhalters „Bald":
           Aufgaben = die Herausforderungen, gleich wie in Blunderluck.
           Seit 0.8.0 (UPCrew-Runde 3) fünf Plätze wie in Blunderluck:
           Anpassen ganz rechts, Start bleibt in der Mitte — Platz 2 hält
           dafür wieder ein Platzhalter „Bald" frei (in Blunderluck steht dort
           „Fähigkeiten"). */
        { id: "herausforderungen", text: "Aufgaben", zeichen: "aufgaben" },
        { text: "Bald", zeichen: "platzhalter", platzhalter: true },
        { id: "start", text: "Start", zeichen: "start", auchAktivBei: ["wordle"] },
        { id: "rangliste", text: "Rangliste", zeichen: "rangliste" },
        { id: "anpassen", text: "Anpassen", zeichen: "anpassen" }
    ],

    _leisteEl: null,

    anmelden(bildschirm) {
        NAVIGATION._bildschirme[bildschirm.id] = bildschirm;
        NAVIGATION._reihenfolge.push(bildschirm.id);
    },

    starten(inhaltEl, startId, leisteEl) {
        NAVIGATION._inhaltEl = inhaltEl;
        if (leisteEl) {
            NAVIGATION.leisteBauen(leisteEl);
        }

        window.addEventListener("popstate", (ereignis) => {
            const zustand = ereignis.state;
            if (zustand && NAVIGATION._bildschirme[zustand.id]) {
                NAVIGATION._wechseln(zustand.id, zustand.parameter || null);
            } else {
                NAVIGATION._wechseln(startId, null);
            }
        });

        try {
            history.replaceState({ id: startId, parameter: null }, "");
        } catch (fehler) {
            /* Unter file:// verweigern manche Browser den Verlauf — dann
               eben ohne Zurück-Taste. */
        }
        NAVIGATION._wechseln(startId, null);
    },

    /* Einen Bildschirm zeigen. `ersetzen` = kein neuer Verlaufseintrag. */
    zeigen(id, parameter, ersetzen) {
        if (!NAVIGATION._bildschirme[id]) {
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

    /* Den gerade sichtbaren Bildschirm neu bauen — nach neuen Daten. Ein
       offenes Menü bleibt dabei offen: Neue Daten kommen jederzeit, und
       ein Menü, das einem unter dem Finger zuklappt, wäre ein Fehler. */
    auffrischen() {
        if (NAVIGATION.aktuell) {
            const warOffen = NAVIGATION._menueOffen;
            NAVIGATION._bauen(NAVIGATION.aktuell, NAVIGATION._parameter);
            if (warOffen) {
                NAVIGATION._menueOeffnen();
            }
        }
    },

    /* Merkt eine Zahl für einen Menü-Eintrag (z. B. offene Freundesanfragen)
       und zeigt sie sofort, falls das Menü gerade zu sehen ist — offen
       bleibt offen (wie beim Auffrischen). */
    markeSetzen(id, zahl) {
        NAVIGATION._marken[id] = zahl || 0;
        const alt = NAVIGATION._menueHalter;
        if (alt && alt.isConnected) {
            const warOffen = NAVIGATION._menueOffen;
            const neu = NAVIGATION.menueBauen();
            alt.replaceWith(neu);
            if (warOffen) {
                NAVIGATION._menueOeffnen();
            }
        }
    },

    /* ---------------------------------------------------------------- *
     * Das Menü hinter den drei Balken
     * ---------------------------------------------------------------- */

    /*
     * Baut den Halter: den Balken-Knopf und darunter das (zunächst
     * verborgene) Feld mit einem Eintrag je Bildschirm mit `imMenue`.
     * Wer ihn einhängt (heute der Start), braucht sonst nichts zu tun.
     */
    menueBauen() {
        NAVIGATION._menueSchliessen();

        const halter = BAUSTEINE.el("div", "menue-halter");
        const summe = NAVIGATION._reihenfolge.reduce((zahl, id) =>
            zahl + (NAVIGATION._bildschirme[id].imMenue ? (NAVIGATION._marken[id] || 0) : 0), 0);

        const balken = BAUSTEINE.knopf({
            art: "flach", zeichen: "menue", titel: "Menü",
            beiKlick: () => NAVIGATION._menueUmschalten()
        });
        balken.setAttribute("aria-expanded", "false");
        balken.setAttribute("aria-haspopup", "menu");
        if (summe > 0) {
            balken.appendChild(BAUSTEINE.el("span", "menue-marke", String(summe)));
        }
        halter.appendChild(balken);

        const liste = BAUSTEINE.el("div", "menue");
        liste.setAttribute("role", "menu");
        liste.hidden = true;
        for (const id of NAVIGATION._reihenfolge) {
            const bildschirm = NAVIGATION._bildschirme[id];
            if (!bildschirm.imMenue) {
                continue;
            }
            const eintrag = BAUSTEINE.knopf({
                art: "menue", zeichen: bildschirm.zeichen, text: bildschirm.titel,
                beiKlick: () => {
                    NAVIGATION._menueSchliessen();
                    NAVIGATION.zeigen(id, null);
                }
            });
            eintrag.setAttribute("role", "menuitem");
            eintrag.dataset.bildschirm = id;
            if (NAVIGATION._marken[id]) {
                eintrag.appendChild(BAUSTEINE.el("span", "menue-marke", String(NAVIGATION._marken[id])));
            }
            liste.appendChild(eintrag);
        }
        halter.appendChild(liste);

        NAVIGATION._menueHalter = halter;
        return halter;
    },

    _menueUmschalten() {
        if (NAVIGATION._menueOffen) {
            NAVIGATION._menueSchliessen();
        } else {
            NAVIGATION._menueOeffnen();
        }
    },

    /*
     * Öffnen: Feld zeigen und EINEN Horcher am Dokument anmelden, der bei
     * einem Tipp ausserhalb des Halters oder bei Esc zuklappt. Er wird beim
     * Schliessen wieder abgemeldet — ein verwaister Horcher bliebe sonst
     * hängen (dieselbe Vorsicht wie in Blunderluck).
     */
    _menueOeffnen() {
        const halter = NAVIGATION._menueHalter;
        if (!halter) {
            return;
        }
        halter.querySelector(".menue").hidden = false;
        halter.firstChild.setAttribute("aria-expanded", "true");
        NAVIGATION._menueOffen = true;

        NAVIGATION._aussenHoerer = (ereignis) => {
            if (ereignis.type === "keydown") {
                if (ereignis.key === "Escape") {
                    NAVIGATION._menueSchliessen();
                }
                return;
            }
            if (!halter.contains(ereignis.target)) {
                NAVIGATION._menueSchliessen();
            }
        };
        /* Erst nach diesem Tipp anmelden — sonst fängt der Horcher genau
           den Klick, der das Menü eben geöffnet hat. */
        setTimeout(() => {
            if (NAVIGATION._menueOffen && NAVIGATION._aussenHoerer) {
                document.addEventListener("click", NAVIGATION._aussenHoerer);
                document.addEventListener("keydown", NAVIGATION._aussenHoerer);
            }
        }, 0);
    },

    _menueSchliessen() {
        if (NAVIGATION._aussenHoerer) {
            document.removeEventListener("click", NAVIGATION._aussenHoerer);
            document.removeEventListener("keydown", NAVIGATION._aussenHoerer);
            NAVIGATION._aussenHoerer = null;
        }
        NAVIGATION._menueOffen = false;
        const halter = NAVIGATION._menueHalter;
        if (halter) {
            const liste = halter.querySelector(".menue");
            if (liste) {
                liste.hidden = true;
            }
            if (halter.firstChild) {
                halter.firstChild.setAttribute("aria-expanded", "false");
            }
        }
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
            const knopf = BAUSTEINE.knopf({
                art: "leiste", zeichen: eintrag.zeichen, text: eintrag.text,
                beiKlick: eintrag.platzhalter ? null : () => {
                    /* Ein Tipp auf den Eintrag, auf dem man schon steht,
                       legt keinen neuen Verlaufseintrag an. */
                    if (NAVIGATION.aktuell !== eintrag.id) {
                        NAVIGATION.zeigen(eintrag.id, null);
                    }
                }
            });
            if (eintrag.platzhalter) {
                knopf.disabled = true;
                knopf.classList.add("knopf-leiste-platzhalter");
            } else {
                knopf.dataset.bildschirm = eintrag.id;
            }
            leisteEl.appendChild(knopf);
        }
        leisteEl.hidden = false;
        NAVIGATION._leisteMarkieren();
    },

    _leisteMarkieren() {
        const leiste = NAVIGATION._leisteEl;
        if (!leiste) {
            return;
        }
        for (const knopf of leiste.querySelectorAll(".knopf-leiste")) {
            const eintrag = NAVIGATION.LEISTE.find((e) => e.id && e.id === knopf.dataset.bildschirm);
            const aktiv = !!eintrag && (eintrag.id === NAVIGATION.aktuell
                || (eintrag.auchAktivBei || []).indexOf(NAVIGATION.aktuell) !== -1);
            knopf.classList.toggle("knopf-leiste-aktiv", aktiv);
            if (aktiv) {
                knopf.setAttribute("aria-current", "page");
            } else {
                knopf.removeAttribute("aria-current");
            }
        }
    },

    /* ---------------------------------------------------------------- *
     * Innereien
     * ---------------------------------------------------------------- */

    _wechseln(id, parameter) {
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
        NAVIGATION._menueSchliessen();
        NAVIGATION._menueHalter = null;

        const bildschirm = NAVIGATION._bildschirme[id];
        const inhalt = NAVIGATION._inhaltEl;
        inhalt.innerHTML = "";
        inhalt.dataset.bildschirm = id;
        document.body.dataset.bildschirm = id;
        bildschirm.zeigen(inhalt, parameter);
    }
};
