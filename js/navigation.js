/*
 * navigation.js — welcher Bildschirm gerade zu sehen ist, und die Leiste unten.
 *
 * Jeder Bildschirm meldet sich mit `NAVIGATION.anmelden({...})` an:
 *
 *     {
 *         id:        "rangliste",
 *         titel:     "Rangliste",        // Beschriftung in der Leiste
 *         zeichen:   "rangliste",        // Name aus BAUSTEINE.ZEICHEN
 *         inLeiste:  true,               // steht er unten in der Leiste?
 *         zeigen(behaelter, parameter),  // baut seinen Inhalt in den Behälter
 *         verlassen()                    // optional: aufräumen (Tastatur usw.)
 *     }
 *
 * Neue Spiele und neue Bildschirme kommen so dazu, ohne dass diese Datei
 * sich ändert: anmelden, fertig.
 *
 * DIE ZURÜCK-TASTE DES HANDYS gehört dazu: Jeder Wechsel legt einen Eintrag
 * in den Browser-Verlauf (history.pushState). Drückt man Zurück, kommt der
 * vorige Bildschirm — nicht die Seite, von der man kam. Die Leisten-Tabs
 * ersetzen den Eintrag statt ihn zu stapeln: Wer zwischen Start und
 * Rangliste hin- und herspringt, soll nicht zehnmal Zurück drücken müssen.
 */

const NAVIGATION = {

    _bildschirme: {},
    _reihenfolge: [],
    _inhaltEl: null,
    _leisteEl: null,
    aktuell: null,
    _parameter: null,

    anmelden(bildschirm) {
        NAVIGATION._bildschirme[bildschirm.id] = bildschirm;
        NAVIGATION._reihenfolge.push(bildschirm.id);
    },

    starten(inhaltEl, leisteEl, startId) {
        NAVIGATION._inhaltEl = inhaltEl;
        NAVIGATION._leisteEl = leisteEl;
        NAVIGATION._leisteBauen();

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
        if (history.state && history.length > 1) {
            history.back();
        } else {
            NAVIGATION.zeigen("start", null, true);
        }
    },

    /* Den gerade sichtbaren Bildschirm neu bauen — nach neuen Daten. */
    auffrischen() {
        if (NAVIGATION.aktuell) {
            NAVIGATION._bauen(NAVIGATION.aktuell, NAVIGATION._parameter);
        }
    },

    /* Zeigt eine Zahl am Leisten-Zeichen (z. B. offene Freundesanfragen). */
    markeSetzen(id, zahl) {
        const knopf = NAVIGATION._leisteEl
            ? NAVIGATION._leisteEl.querySelector('[data-bildschirm="' + id + '"]') : null;
        if (!knopf) {
            return;
        }
        let marke = knopf.querySelector(".leiste-marke");
        if (!zahl) {
            if (marke) {
                marke.remove();
            }
            return;
        }
        if (!marke) {
            marke = BAUSTEINE.el("span", "leiste-marke");
            knopf.appendChild(marke);
        }
        marke.textContent = String(zahl);
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
        NAVIGATION._leisteMarkieren(id);
        window.scrollTo(0, 0);
    },

    _bauen(id, parameter) {
        const bildschirm = NAVIGATION._bildschirme[id];
        const inhalt = NAVIGATION._inhaltEl;
        inhalt.innerHTML = "";
        inhalt.dataset.bildschirm = id;
        document.body.dataset.bildschirm = id;
        bildschirm.zeigen(inhalt, parameter);
    },

    _leisteBauen() {
        const leiste = NAVIGATION._leisteEl;
        leiste.innerHTML = "";
        for (const id of NAVIGATION._reihenfolge) {
            const bildschirm = NAVIGATION._bildschirme[id];
            if (!bildschirm.inLeiste) {
                continue;
            }
            const knopf = BAUSTEINE.knopf({
                art: "leiste", zeichen: bildschirm.zeichen, text: bildschirm.titel,
                beiKlick: () => NAVIGATION.zeigen(id, null, true)
            });
            knopf.dataset.bildschirm = id;
            leiste.appendChild(knopf);
        }
    },

    /* Hervorgehoben wird der Leisten-Eintrag des Bildschirms — oder der,
       zu dem er gehört (Wordle gehört zu Start). */
    _leisteMarkieren(id) {
        const bildschirm = NAVIGATION._bildschirme[id];
        const zugehoerig = (bildschirm && bildschirm.gehoertZu) || id;
        for (const knopf of NAVIGATION._leisteEl.querySelectorAll("[data-bildschirm]")) {
            const aktiv = knopf.dataset.bildschirm === zugehoerig;
            knopf.classList.toggle("leiste-aktiv", aktiv);
            if (aktiv) {
                knopf.setAttribute("aria-current", "page");
            } else {
                knopf.removeAttribute("aria-current");
            }
        }
    }
};
