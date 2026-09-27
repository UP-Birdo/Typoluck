/*
 * upcrew-wischen.js — Tabs wechseln durch waagrechtes Wischen, gleich in Blunderluck und Typoluck
 * (gehört zu css\upcrew-wischen.css). Quelle künftig Design\3D-Schrift\final — KOPIEREN, nie abwandeln.
 *
 * Nutzer, 27.09.2026: „mache, dass man in den Menüs swipen kann, um die Tabs zu wechseln“.
 *
 * VERTRAG
 *     UPCREW_WISCHEN.an(flaeche, {
 *         tabs: () => ["aufgaben", "sammlung", { id: "bald", still: true }, …],  // Leisten-Reihenfolge;
 *                                                     // still/gesperrt als { id, still: true } → übersprungen
 *         aktiv: () => "start",                       // der offene Tab (steht er nicht in `tabs`: kein Wischen)
 *         wechseln: (id, richtung) => TABS.wechseln(id),   // derselbe Weg wie ein Tipp auf die Leiste;
 *                                                     // richtung +1 = nach rechts in der Leiste, -1 = nach links
 *         erlaubt: () => !partieLaeuft,               // false = gar nicht wischen (Partie, Anmeldung …)
 *         sperren: ".brett, .mein-regler",            // wahlfrei: weitere Stellen, an denen kein Wischen startet
 *         bewegen: () => element                      // wahlfrei: was dem Finger folgt (Standard: flaeche)
 *     });   → liefert { aus() } zum Abmelden
 *
 * VERHALTEN
 *   - Nach links wischen = nächster Tab rechts, nach rechts = vorheriger. Stille Tabs werden übersprungen,
 *     KEIN Rundlauf: an den Enden (ganz links/rechts) ist Stopp — der Inhalt bewegt sich dort gar nicht.
 *   - Ausgelöst wird nur deutlich waagrecht: |dx| > 60 px und |dx| > 1,5·|dy| — oder schnell
 *     (≥ 0,5 px/ms, mindestens 30 px, ebenso waagrecht).
 *   - Senkrechtes Rollen bleibt Sache des Browsers: Die Fläche bekommt `touch-action: pan-y pinch-zoom`
 *     (Klasse `up-wischen`), alle Horcher sind passiv, nichts wird verhindert.
 *   - Der Inhalt folgt dem Finger gedämpft (Gummiband) und gleitet beim Wechsel aus bzw. ein;
 *     mit `prefers-reduced-motion: reduce` ohne jede Bewegung.
 *   - KEIN Wischen: wenn `erlaubt()` false ist; wenn ein Dialog offen ist (sichtbares [aria-modal="true"] oder
 *     dialog[open]); wenn der Finger auf etwas startet, das selbst waagrecht rollt oder zieht (Eingabefelder,
 *     Schieberegler, Regal-Reihen, Umschalter, [data-kein-wischen], alles mit waagrechtem Rollbalken, dazu
 *     `sperren`); bei mehr als einem Finger; beim Wischen vom Bildschirmrand (20 px, iOS-Zurück-Geste).
 *   - Nur Finger und Stift (pointerType touch/pen), nie die Maus.
 */
(function () {
    "use strict";

    const RAND_PX = 20;
    const MIN_DX = 60;
    const SCHNELL_DX = 30;
    const SCHNELL_PX_MS = 0.5;
    const VERHAELTNIS = 1.5;
    const ACHSE_PX = 10;
    const GUMMI = 0.35;
    const GUMMI_MAX = 90;

    const SPERREN = "input, textarea, select, [contenteditable=''], [contenteditable='true'], "
        + "input[type='range'], [data-kein-wischen], .upa-reihe, .upa-mini-seg";

    /* ---- Reine Logik (getestet) ---- */

    /* Entscheidet am Ende einer Bewegung: +1 (zum nächsten Tab rechts), -1 (zum vorherigen) oder 0. */
    function entscheiden(dx, dy, ms) {
        const ax = Math.abs(dx);
        const ay = Math.abs(dy);
        if (ax <= VERHAELTNIS * ay) {
            return 0;
        }
        const weit = ax > MIN_DX;
        const schnell = ax >= SCHNELL_DX && ms > 0 && ax / ms >= SCHNELL_PX_MS;
        if (!weit && !schnell) {
            return 0;
        }
        return dx < 0 ? 1 : -1;
    }

    /* Der Nachbar in Leisten-Reihenfolge, stille Tabs übersprungen; null an den Enden oder ohne aktiven Tab. */
    function nachbar(tabs, aktiv, schritt) {
        const liste = (tabs || []).map((t) => (typeof t === "string" ? { id: t } : t)).filter((t) => t && t.id);
        const stelle = liste.findIndex((t) => t.id === aktiv);
        if (stelle === -1 || !schritt) {
            return null;
        }
        for (let i = stelle + schritt; i >= 0 && i < liste.length; i += schritt) {
            if (!liste[i].still) {
                return liste[i].id;
            }
        }
        return null;
    }

    /* Darf an dieser Stelle ein Wischen beginnen? */
    function startErlaubt(ziel, x, breite, opt) {
        opt = opt || {};
        if (typeof opt.erlaubt === "function" && !opt.erlaubt()) {
            return false;
        }
        if (x < RAND_PX || x > breite - RAND_PX) {
            return false;
        }
        if (dialogOffen(opt.dokument)) {
            return false;
        }
        const selektor = SPERREN + (opt.sperren ? ", " + opt.sperren : "");
        if (ziel && typeof ziel.closest === "function" && ziel.closest(selektor)) {
            return false;
        }
        return !rolltWaagrecht(ziel);
    }

    function dialogOffen(dok) {
        const d = dok || (typeof document !== "undefined" ? document : null);
        if (!d || typeof d.querySelectorAll !== "function") {
            return false;
        }
        for (const el of d.querySelectorAll("[aria-modal='true'], dialog[open]")) {
            if (!el.getClientRects || el.getClientRects().length > 0) {
                return true;
            }
        }
        return false;
    }

    /* Liegt der Start in etwas, das selbst waagrecht rollt? */
    function rolltWaagrecht(el) {
        let e = el;
        while (e && e.nodeType === 1) {
            if (typeof getComputedStyle === "function" && e.scrollWidth > e.clientWidth + 1) {
                const ox = getComputedStyle(e).overflowX;
                if (ox === "auto" || ox === "scroll") {
                    return true;
                }
            }
            e = e.parentElement;
        }
        return false;
    }

    /* ---- Gerät ---- */

    function ruhig() {
        return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    }

    function an(flaeche, opt) {
        opt = opt || {};
        const bewegt = () => (typeof opt.bewegen === "function" && opt.bewegen()) || flaeche;
        flaeche.classList.add("up-wischen");

        let zug = null;          // { id, x, y, t, achse }
        const finger = new Set();

        const zuruecksetzen = (sanft) => {
            const el = bewegt();
            if (!el) {
                return;
            }
            if (sanft && !ruhig()) {
                el.style.transition = "transform 180ms ease-out";
                el.style.transform = "translateX(0)";
                setTimeout(() => {
                    el.style.transition = "";
                    el.style.transform = "";
                }, 190);
            } else {
                el.style.transition = "";
                el.style.transform = "";
                el.style.opacity = "";
            }
        };

        const wechselnMit = (id, schritt) => {
            const el = bewegt();
            if (ruhig() || !el) {
                zuruecksetzen(false);
                opt.wechseln(id, schritt);
                return;
            }
            el.style.transition = "transform 120ms ease-in, opacity 120ms ease-in";
            el.style.transform = "translateX(" + (-schritt * 48) + "px)";
            el.style.opacity = "0";
            setTimeout(() => {
                opt.wechseln(id, schritt);
                /* Die ausgeglittene Fläche sauber zurücklassen — sonst stünde
                   sie beim nächsten Öffnen noch verschoben und unsichtbar da. */
                el.style.transition = "";
                el.style.transform = "";
                el.style.opacity = "";
                const neu = bewegt();
                neu.style.transition = "none";
                neu.style.transform = "translateX(" + (schritt * 48) + "px)";
                neu.style.opacity = "0";
                void neu.offsetWidth;
                neu.style.transition = "transform 180ms ease-out, opacity 180ms ease-out";
                neu.style.transform = "translateX(0)";
                neu.style.opacity = "1";
                setTimeout(() => {
                    neu.style.transition = "";
                    neu.style.transform = "";
                    neu.style.opacity = "";
                }, 200);
            }, 120);
        };

        const runter = (e) => {
            if (e.pointerType !== "touch" && e.pointerType !== "pen") {
                return;
            }
            finger.add(e.pointerId);
            if (finger.size > 1) {
                if (zug) {
                    zug = null;
                    zuruecksetzen(true);
                }
                return;
            }
            const breite = (typeof window !== "undefined" && window.innerWidth) || 0;
            if (!startErlaubt(e.target, e.clientX, breite, opt)) {
                zug = null;
                return;
            }
            const tabs = opt.tabs();
            if (!tabs.some((t) => (typeof t === "string" ? t : t.id) === opt.aktiv())) {
                zug = null;
                return;
            }
            zug = { id: e.pointerId, x: e.clientX, y: e.clientY, t: e.timeStamp || Date.now(), achse: "" };
        };

        const bewegen = (e) => {
            if (!zug || e.pointerId !== zug.id) {
                return;
            }
            const dx = e.clientX - zug.x;
            const dy = e.clientY - zug.y;
            if (!zug.achse) {
                if (Math.abs(dx) < ACHSE_PX && Math.abs(dy) < ACHSE_PX) {
                    return;
                }
                zug.achse = Math.abs(dx) > VERHAELTNIS * Math.abs(dy) ? "x" : "y";
            }
            if (zug.achse !== "x" || ruhig()) {
                return;
            }
            /* Gummiband: gedämpft. Am Ende ohne Nachbarn bewegt sich GAR NICHTS — harter Stopp
               (Nutzer 27.09.2026: „man soll nicht infinite scrollen können, rechts und links ist Stopp“). */
            const schritt = dx < 0 ? 1 : -1;
            const hatZiel = !!nachbar(opt.tabs(), opt.aktiv(), schritt);
            const weg = hatZiel ? Math.max(-GUMMI_MAX, Math.min(GUMMI_MAX, dx * GUMMI)) : 0;
            const el = bewegt();
            if (el) {
                el.style.transition = "none";
                el.style.transform = "translateX(" + weg + "px)";
            }
        };

        const hoch = (e) => {
            finger.delete(e.pointerId);
            if (!zug || e.pointerId !== zug.id) {
                return;
            }
            const z = zug;
            zug = null;
            if (z.achse !== "x") {
                zuruecksetzen(false);
                return;
            }
            const schritt = entscheiden(e.clientX - z.x, e.clientY - z.y, (e.timeStamp || Date.now()) - z.t);
            const ziel = schritt ? nachbar(opt.tabs(), opt.aktiv(), schritt) : null;
            if (ziel && (typeof opt.erlaubt !== "function" || opt.erlaubt())) {
                wechselnMit(ziel, schritt);
            } else {
                zuruecksetzen(true);
            }
        };

        const abbrechen = (e) => {
            finger.delete(e.pointerId);
            if (zug && e.pointerId === zug.id) {
                zug = null;
                zuruecksetzen(true);
            }
        };

        const passiv = { passive: true };
        flaeche.addEventListener("pointerdown", runter, passiv);
        flaeche.addEventListener("pointermove", bewegen, passiv);
        flaeche.addEventListener("pointerup", hoch, passiv);
        flaeche.addEventListener("pointercancel", abbrechen, passiv);

        return {
            aus() {
                flaeche.classList.remove("up-wischen");
                flaeche.removeEventListener("pointerdown", runter, passiv);
                flaeche.removeEventListener("pointermove", bewegen, passiv);
                flaeche.removeEventListener("pointerup", hoch, passiv);
                flaeche.removeEventListener("pointercancel", abbrechen, passiv);
                zuruecksetzen(false);
            }
        };
    }

    const UPCREW_WISCHEN = { an: an, entscheiden: entscheiden, nachbar: nachbar, startErlaubt: startErlaubt,
        RAND_PX: RAND_PX, MIN_DX: MIN_DX, VERHAELTNIS: VERHAELTNIS };
    globalThis.UPCREW_WISCHEN = UPCREW_WISCHEN;
    if (typeof module !== "undefined" && module.exports) {
        module.exports = UPCREW_WISCHEN;
    }
})();
