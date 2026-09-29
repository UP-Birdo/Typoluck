/*
 * upcrew-blatt.js — Blätter und Karten über dem sichtbaren Hauptmenü, gleich in allen UPCrew-Spielen
 * (gehört zu css/upcrew-blatt.css). Entstanden in Blunderluck v0.156.0 als Vorschlag für
 * Design\3D-Schrift\final (Entwurf Oberfläche Runde 7, vom Nutzer abgenommen).
 *
 * Nutzer, 28.09.2026: „in beiden spielen soll es keine menüs geben in dem sinn das der ganze screen bedeckt ist dafür
 * soll alles was nicht im spiel ist popups sein welche im hintergrund noch das hauptmenü zeigt außer im spiel selbst
 * das soll ein anderer screen sein“.
 *
 *   BLATT  gross: beginnt unter dem Kopf der App (`--up-bl-oben`), endet über der Leiste (`--up-bl-unten`); das
 *          Hauptmenü rückt dahinter etwas kleiner und dunkler (`up-bl-dahinter` am Hauptelement). Blätter stapeln sich
 *          (Profil → Einstellungen → Verwaltung): das oberste trägt einen Zurück-Pfeil, das unterste ein ✕.
 *   KARTE  klein, mittig (Flamme, Hinweis, Kauf). Liegt über allem, auch über Blättern.
 *
 * Schliessen: ✕ / Zurück, Tipp auf den abgedunkelten Grund, Esc. Die Leiste der App liegt ÜBER den Blättern und bleibt
 * bedienbar (z-index der App höher als `--up-bl-ebene`).
 *
 * SEITE ODER BLATT (Nutzer 29.09.2026, gilt ab Blunderluck v0.157 / Typoluck 0.25): Was IN DER LEISTE steht (Shop,
 * Sammlung, Start, Aufgaben/Herausforderungen, Rangliste), ist eine normale SEITE im Hauptelement — nie ein Blatt.
 * Blätter und Karten NUR für Bereiche ohne Leisten-Knopf: Profil, Einstellungen, Verwaltung, Serien-Karte, Freunde,
 * Verlauf (und kleine Hinweise/Käufe als Karte). Ein Tipp in der Leiste schliesst alle Blätter
 * (`UPCREW_BLATT.alleSchliessen()`) und zeigt die Seite; die App ruft das in ihrem Tab-Wechsel.
 *
 * DIE SEITE STEHT STILL, solange etwas offen ist (29.09.2026, Nutzer: „wenn man scrollt kommt oben wieder die menüs
 * sichtbar“): `html.up-bl-offen` + `body.up-bl-offen` halten das Dokument fest (overflow hidden, kein Überrollen);
 * rollen kann nur der Inhalt des obersten Blatts, ohne Kette auf die Seite. Beim ersten Blatt rollt die Seite dahinter
 * nach OBEN (in der Lücke über dem Blatt steht so immer der Kopf der Seite, nicht irgendein Teil aus ihrer Mitte), beim
 * letzten Schliessen kommt die alte Rollposition zurück. Eine Karte allein lässt die Position stehen.
 * Bis 29.09. setzte der Baustein nur `body.up-bl-offen`, ohne eine Regel dazu — die Seite rollte hinter dem Blatt mit.
 *
 * Aufruf:
 *   UPCREW_BLATT.einrichten({ ebenen: <div>, haupt: <main> });     // einmal
 *   const b = UPCREW_BLATT.oeffnen({
 *       art: "blatt" | "karte",          // Vorgabe "blatt"
 *       titel: "Profil",
 *       inhalt: element | (el) => {},    // ein fertiges Element (wird beim Schliessen nur abgehängt, nicht zerstört)
 *                                         // oder eine Funktion, die in `el` zeichnet
 *       rechts: [element, …],            // wahlfrei: Knöpfe rechts im Kopf (z. B. Zahnrad)
 *       klasse: "…",                     // wahlfrei: Zusatzklasse am Blatt
 *       beimSchliessen: (wie) => {}      // wahlfrei: wie = "knopf" | "grund" | "esc" | "code" | "alle"
 *   });                                  // → { el, inhalt, schliessen() }
 *   UPCREW_BLATT.schliessen();  UPCREW_BLATT.alleSchliessen();  UPCREW_BLATT.anzahl();  UPCREW_BLATT.blaetter();
 *
 * Kein Spiel-Eigenes hier: Texte, Inhalte und Farben kommen von der App (Farben über die Variablen der Farbwelt).
 */
(function () {
    "use strict";

    const RAUM = "http://www.w3.org/2000/svg";
    const PFADE = {
        zu: "M6 6 L18 18 M18 6 L6 18",
        zurueck: "M15 5 L8 12 L15 19"
    };

    const stapel = [];
    let gemerktY = null;
    let ebenenEl = null;
    let hauptEl = null;
    let horcht = false;

    function zeichen(pfad) {
        const svg = document.createElementNS(RAUM, "svg");
        svg.setAttribute("viewBox", "0 0 24 24");
        svg.setAttribute("aria-hidden", "true");
        svg.setAttribute("focusable", "false");
        const p = document.createElementNS(RAUM, "path");
        p.setAttribute("d", pfad);
        svg.appendChild(p);
        return svg;
    }

    function el(tag, klasse, text) {
        const e = document.createElement(tag);
        if (klasse) {
            e.className = klasse;
        }
        if (text !== undefined && text !== null) {
            e.textContent = String(text);
        }
        return e;
    }

    function knopf(pfad, name, beiKlick) {
        const k = el("button", "up-bl-kopf-knopf");
        k.type = "button";
        k.setAttribute("aria-label", name);
        k.appendChild(zeichen(pfad));
        k.addEventListener("click", beiKlick);
        return k;
    }

    function blaetter() {
        return stapel.filter((s) => s.art !== "karte").length;
    }

    function hintenSetzen() {
        const an = blaetter() > 0;
        if (hauptEl && hauptEl.classList) {
            hauptEl.classList.toggle("up-bl-dahinter", an);
        }
        seiteHalten(stapel.length > 0, blaetter() > 0);
    }

    function rollen(y) {
        if (typeof window !== "undefined" && typeof window.scrollTo === "function") {
            try {
                window.scrollTo({ top: y, left: 0, behavior: "instant" });
            } catch (fehler) {
                window.scrollTo(0, y);
            }
        }
    }

    /* Die Seite hinter Blättern und Karten festhalten (siehe Kopf „DIE SEITE STEHT STILL“). */
    function seiteHalten(an, nachOben) {
        if (typeof document === "undefined" || !document.documentElement || !document.body) {
            return;
        }
        const wurzel = document.documentElement;
        const war = wurzel.classList.contains("up-bl-offen");
        const y = (typeof window !== "undefined" && window.scrollY) || 0;
        if (an && !war) {
            gemerktY = y;
        }
        if (an && nachOben && y !== 0) {
            rollen(0);
        }
        wurzel.classList.toggle("up-bl-offen", an);
        document.body.classList.toggle("up-bl-offen", an);
        if (!an && war && gemerktY !== null) {
            rollen(gemerktY);
            gemerktY = null;
        }
    }

    function aufEsc(ereignis) {
        if (ereignis && ereignis.key === "Escape" && stapel.length > 0) {
            schliessen("esc");
        }
    }

    function einrichten(optionen) {
        const o = optionen || {};
        ebenenEl = o.ebenen || null;
        hauptEl = o.haupt || null;
        if (!horcht && typeof document !== "undefined" && document.addEventListener) {
            document.addEventListener("keydown", aufEsc);
            horcht = true;
        }
    }

    function oeffnen(optionen) {
        const o = optionen || {};
        const art = (o.art === "karte") ? "karte" : "blatt";
        const gestapelt = art === "blatt" && blaetter() > 0;

        const ebene = el("div", "up-bl-ebene" + (art === "karte" ? " up-bl-karte-ebene" : "")
            + (gestapelt ? " up-bl-oben-drauf" : ""));
        const grund = el("div", "up-bl-grund");
        grund.addEventListener("click", () => schliessen("grund"));
        ebene.appendChild(grund);

        const flaeche = el("section", (art === "karte" ? "up-bl-karte" : "up-bl-blatt") + (o.klasse ? " " + o.klasse : ""));
        flaeche.setAttribute("role", "dialog");
        /* Nur die KARTE ist modal. Ein Blatt ist ein Bereich wie ein Tab: Die Leiste bleibt bedienbar, und das
           Wischen zwischen den Leisten-Tabs (upcrew-wischen.js sperrt bei aria-modal) geht auch im Blatt. */
        if (art === "karte") {
            flaeche.setAttribute("aria-modal", "true");
        }
        flaeche.setAttribute("aria-label", o.titel || (art === "karte" ? "Hinweis" : "Blatt"));

        let kopf = null;
        if (art === "blatt") {
            kopf = el("div", "up-bl-kopf");
            if (gestapelt) {
                kopf.appendChild(knopf(PFADE.zurueck, "Zurück", () => schliessen("knopf")));
            }
            kopf.appendChild(el("h2", "up-bl-titel", o.titel || ""));
            for (const zusatz of (o.rechts || [])) {
                if (zusatz) {
                    kopf.appendChild(zusatz);
                }
            }
            if (!gestapelt) {
                kopf.appendChild(knopf(PFADE.zu, "Schließen", () => schliessen("knopf")));
            }
            flaeche.appendChild(kopf);
        }

        const inhalt = el("div", art === "karte" ? "up-bl-karte-inhalt" : "up-bl-inhalt");
        flaeche.appendChild(inhalt);
        ebene.appendChild(flaeche);

        const eintrag = { art: art, el: ebene, flaeche: flaeche, inhalt: inhalt, kopf: kopf, optionen: o };
        eintrag.schliessen = () => schliessenEintrag(eintrag, "code");
        stapel.push(eintrag);

        if (typeof Element !== "undefined" && o.inhalt instanceof Element) {
            inhalt.appendChild(o.inhalt);
        } else if (o.inhalt && typeof o.inhalt === "object" && o.inhalt.nodeType === 1) {
            inhalt.appendChild(o.inhalt);
        } else if (typeof o.inhalt === "function") {
            o.inhalt(inhalt, eintrag);
        }

        (ebenenEl || document.body).appendChild(ebene);
        hintenSetzen();
        return eintrag;
    }

    function schliessenEintrag(eintrag, wie) {
        const stelle = stapel.indexOf(eintrag);
        if (stelle === -1) {
            return;
        }
        stapel.splice(stelle, 1);
        /* Ein mitgegebenes Element nur abhängen (die App zeigt es später wieder, z. B. den Bereich eines Tabs). */
        const mitgegeben = eintrag.optionen.inhalt;
        if (mitgegeben && typeof mitgegeben === "object" && mitgegeben.parentNode === eintrag.inhalt) {
            eintrag.inhalt.removeChild(mitgegeben);
        }
        if (eintrag.el && eintrag.el.parentNode) {
            eintrag.el.parentNode.removeChild(eintrag.el);
        }
        hintenSetzen();
        if (typeof eintrag.optionen.beimSchliessen === "function") {
            eintrag.optionen.beimSchliessen(wie);
        }
    }

    /* Das oberste schliessen. */
    function schliessen(wie) {
        const oben = stapel[stapel.length - 1];
        if (oben) {
            schliessenEintrag(oben, wie || "code");
        }
    }

    /* Alle schliessen — von oben nach unten, jedes mit „alle". */
    function alleSchliessen() {
        while (stapel.length > 0) {
            schliessenEintrag(stapel[stapel.length - 1], "alle");
        }
    }

    function anzahl() {
        return stapel.length;
    }

    /* Das oberste (oder null) — z. B. um darin neu zu zeichnen. */
    function oben() {
        return stapel[stapel.length - 1] || null;
    }

    const UPCREW_BLATT = { einrichten, oeffnen, schliessen, alleSchliessen, anzahl, blaetter, oben, _stapel: stapel };
    if (typeof window !== "undefined") {
        window.UPCREW_BLATT = UPCREW_BLATT;
    }
    if (typeof globalThis !== "undefined") {
        globalThis.UPCREW_BLATT = UPCREW_BLATT;
    }
    if (typeof module !== "undefined" && module.exports) {
        module.exports = UPCREW_BLATT;
    }
})();
