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
 * DAS MENÜ STATT DER LEISTE UNTEN (seit 0.3.0, Nutzer 25.09.2026: „so wie
 * bei Blunderluck Freunde und Profil in drei Balken Menü"). Bis 0.2.1 stand
 * unten eine Leiste mit Start, Rangliste, Freunde, Profil. Jetzt steht auf
 * dem Start oben rechts EIN Knopf mit drei Balken (`menueBauen`); ein Tipp
 * klappt die Einträge auf, ein Tipp daneben (oder Esc) klappt sie zu. Die
 * Bildschirme hinter dem Menü haben links oben „Zurück". Vorbild ist
 * Blunderlucks Menüband (dort `START._menuebandBauen` in js\start.js) —
 * nachgebaut, nicht geteilt: Typoluck baut jeden Knopf in BAUSTEINE.knopf.
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

    anmelden(bildschirm) {
        NAVIGATION._bildschirme[bildschirm.id] = bildschirm;
        NAVIGATION._reihenfolge.push(bildschirm.id);
    },

    starten(inhaltEl, startId) {
        NAVIGATION._inhaltEl = inhaltEl;

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
