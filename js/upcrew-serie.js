/*
 * upcrew-serie.js — die Serien-Kapsel im Kopf: Flammen-Kreis, dahinter die Woche; ein Tipp öffnet die Karte (große
 * Flamme, Woche, Schließen). Gleich in allen UPCrew-Spielen (gehört zu css/upcrew-serie.css, braucht
 * js/upcrew-flamme.js). Entstanden in Blunderluck v0.156.0 (Entwurf Oberfläche Runde 7, abgenommen 28.09.2026).
 *
 * OHNE SCHILDE (Nutzer 29.09.2026: „serien schild raus wenn du eine sieges serie hast soll nach einem lose nicht
 * aufhaltbar sein“): Flammen-Schild (Shop) und Serien-Schutz (Level) sind KOMPLETT weg — keine Schild-Zeichen in der
 * Kapsel, keine Schild-Reihen und kein „Schild kaufen“ in der Karte. Die Serie reißt ohne Rettung.
 * Rückwärts verträglich: alte Werte `schild`, `schildMax`, `schutz`, `schutzAlle` und eine alte Option `beiKauf`
 * werden still übergangen; nichts stürzt ab.
 *
 *     const k = UPCREW_SERIE.kapsel(halter, { beiKlick: () => … });   // hängt die Kapsel an `halter`
 *     k.setzen(werte);                                                // jederzeit, wenn der Stand kommt
 *     UPCREW_SERIE.karteFuellen(el, werte, { beiZu: () => … });       // Inhalt der Karte
 *
 *     werte = {
 *         serie: 12,             // Tage am Stück
 *         heute: true,           // heute schon geschafft
 *         woche: [false, …, true],   // die letzten 7 Tage, heute zuletzt
 *         tage: ["Mo", …]        // wahlfrei: Namen der 7 Tage (sonst leer)
 *     }
 *
 * Texte (wahlfrei `texte` bei karteFuellen): { zaehlt, heuteJa, heuteNein, zu }.
 * Kein Spiel-Eigenes. Alles über textContent; Farben aus der Farbwelt (--haupt, --karte, --karte-leise, --rahmen,
 * --schrift, --schrift-leise).
 */
(function () {
    "use strict";

    const RAUM = "http://www.w3.org/2000/svg";
    const PFADE = {
        flamme: "M12 3 C15 7 18 9 18 14 A6 6 0 0 1 6 14 C6 11 8 9 9 7 C10 10 11 11 12 11 C12 8 11 6 12 3 Z"
    };

    const TEXTE = {
        zaehlt: "alle Spiele",
        heuteJa: "Heute geschafft",
        heuteNein: "Heute offen",
        zu: "Schließen"
    };

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

    function zeichen(name, klasse) {
        const svg = document.createElementNS(RAUM, "svg");
        svg.setAttribute("viewBox", "0 0 24 24");
        svg.setAttribute("aria-hidden", "true");
        svg.setAttribute("focusable", "false");
        svg.setAttribute("class", klasse || "up-se-zeichen");
        const p = document.createElementNS(RAUM, "path");
        p.setAttribute("d", PFADE[name] || "");
        svg.appendChild(p);
        return svg;
    }

    const zahl = (w) => Math.max(0, Math.floor(Number(w) || 0));

    /* Reine Logik (getestet): die Werte sauber, die Woche immer 7 lang. Alte Schild-Felder fallen weg. */
    function sauber(werte) {
        const w = werte || {};
        const woche = (Array.isArray(w.woche) ? w.woche : []).slice(-7).map((a) => a === true);
        while (woche.length < 7) {
            woche.unshift(false);
        }
        const tage = (Array.isArray(w.tage) ? w.tage : []).slice(-7).map((t) => String(t || ""));
        while (tage.length < 7) {
            tage.unshift("");
        }
        return {
            serie: zahl(w.serie),
            heute: w.heute === true,
            woche: woche,
            tage: tage
        };
    }

    function beschriftung(w) {
        return "Serie " + w.serie + (w.serie === 1 ? " Tag" : " Tage") + " · " + (w.heute ? "heute geschafft" : "heute offen");
    }

    function kapsel(halter, optionen) {
        const o = optionen || {};
        const knopf = el("div", "up-se-kapsel");
        knopf.setAttribute("role", "button");
        knopf.tabIndex = 0;

        const flammeOrt = el("span", "up-se-flamme");
        knopf.appendChild(flammeOrt);
        const flamme = (typeof UPCREW_FLAMME !== "undefined") ? UPCREW_FLAMME.bauen(flammeOrt) : null;
        if (flamme && flamme.el) {
            flamme.el.tabIndex = -1;
            flamme.el.setAttribute("aria-hidden", "true");
        }

        const hinten = el("span", "up-se-hinten");
        hinten.setAttribute("aria-hidden", "true");
        const woche = el("span", "up-se-woche");
        hinten.appendChild(woche);
        knopf.appendChild(hinten);

        const tippen = () => {
            if (typeof o.beiKlick === "function") {
                o.beiKlick();
            }
        };
        knopf.addEventListener("click", tippen);
        knopf.addEventListener("keydown", (e) => {
            if (e && (e.key === "Enter" || e.key === " ")) {
                if (e.preventDefault) {
                    e.preventDefault();
                }
                tippen();
            }
        });

        function setzen(werte) {
            const w = sauber(werte);
            if (flamme) {
                flamme.setzen({ serie: w.serie, heuteGeschafft: w.heute });
            }
            woche.innerHTML = "";
            w.woche.forEach((an, i) => {
                const tag = el("i", (an ? "an" : "") + (i === 6 ? " heute" : ""));
                tag.appendChild(zeichen("flamme"));
                woche.appendChild(tag);
            });
            knopf.setAttribute("aria-label", beschriftung(w));
            return w;
        }

        halter.appendChild(knopf);
        setzen(o.werte || {});
        return { el: knopf, flamme: flamme, setzen: setzen };
    }

    function knopf(klasse, text, beiKlick) {
        const k = el("button", "up-kn " + klasse);
        k.type = "button";
        k.appendChild(el("i", "up-led"));
        k.appendChild(el("span", "", text));
        k.addEventListener("click", beiKlick);
        return k;
    }

    /* Der Inhalt der Karte (UPCREW_BLATT.oeffnen({ art: "karte", inhalt: (el) => karteFuellen(el, …) })). */
    function karteFuellen(ort, werte, optionen) {
        const o = optionen || {};
        const t = Object.assign({}, TEXTE, o.texte || {});
        const w = sauber(werte);
        ort.classList.add("up-se-karte");

        const gross = el("div", "up-se-gross");
        const flammeOrt = el("span", "up-se-gross-flamme");
        gross.appendChild(flammeOrt);
        if (typeof UPCREW_FLAMME !== "undefined") {
            const f = UPCREW_FLAMME.bauen(flammeOrt);
            f.setzen({ serie: w.serie, heuteGeschafft: w.heute });
            if (f.el) {
                f.el.tabIndex = -1;
            }
        }
        gross.appendChild(el("h2", "", w.serie + (w.serie === 1 ? " Tag Serie" : " Tage Serie")));
        gross.appendChild(el("small", "", (w.heute ? t.heuteJa : t.heuteNein) + " · " + t.zaehlt));
        ort.appendChild(gross);

        const woche = el("div", "up-se-woche-gross");
        w.woche.forEach((an, i) => {
            const tag = el("span", i === 6 ? "heute" : "");
            const flamme = el("i", an ? "an" : "");
            flamme.appendChild(zeichen("flamme"));
            tag.appendChild(flamme);
            tag.appendChild(document.createTextNode(w.tage[i]));
            woche.appendChild(tag);
        });
        ort.appendChild(woche);

        const knoepfe = el("div", "up-se-knoepfe");
        knoepfe.appendChild(knopf("up-zweit", t.zu, () => {
            if (typeof o.beiZu === "function") {
                o.beiZu();
            }
        }));
        ort.appendChild(knoepfe);
        return w;
    }

    const UPCREW_SERIE = { kapsel: kapsel, karteFuellen: karteFuellen, sauber: sauber, beschriftung: beschriftung,
        TEXTE: TEXTE, PFADE: PFADE };
    if (typeof window !== "undefined") {
        window.UPCREW_SERIE = UPCREW_SERIE;
    }
    if (typeof globalThis !== "undefined") {
        globalThis.UPCREW_SERIE = UPCREW_SERIE;
    }
    if (typeof module !== "undefined" && module.exports) {
        module.exports = UPCREW_SERIE;
    }
})();
