/*
 * upcrew-serie.js — die Serien-Kapsel im Kopf: Flammen-Kreis, dahinter die Woche und die beiden Schilde; ein Tipp
 * öffnet die Karte mit Erklärung und „Schild kaufen“. Gleich in allen UPCrew-Spielen (gehört zu css/upcrew-serie.css,
 * braucht js/upcrew-flamme.js). Entstanden in Blunderluck v0.156.0 als Vorschlag für Design\3D-Schrift\final
 * (Entwurf Oberfläche Runde 7, vom Nutzer abgenommen 28.09.2026).
 *
 * Nutzer, 28.09.2026 (Entwurf): Serie „oben hinter der Flamme“ mit den Schilden (Flammen-Schild aus dem Shop,
 * Serien-Schutz vom Level); die Flamme fällt in den Herausforderungen weg.
 *
 *     const k = UPCREW_SERIE.kapsel(halter, { beiKlick: () => … });   // hängt die Kapsel an `halter`
 *     k.setzen(werte);                                                // jederzeit, wenn der Stand kommt
 *     UPCREW_SERIE.karteFuellen(el, werte, { beiKauf: () => …, beiZu: () => … });   // Inhalt der Karte
 *
 *     werte = {
 *         serie: 12,             // Tage am Stück
 *         heute: true,           // heute schon geschafft
 *         woche: [false, …, true],   // die letzten 7 Tage, heute zuletzt
 *         tage: ["Mo", …],       // wahlfrei: Namen der 7 Tage (sonst leer)
 *         schild: 1, schildMax: 2,   // Flammen-Schild aus dem Shop (Vorrat, Höchstmenge)
 *         schutz: 1, schutzAlle: 1   // Serien-Schutz vom Level (frei, verdient)
 *     }
 *
 * Texte (wahlfrei `texte` bei karteFuellen): { zaehlt, schild, schildText, schutz, schutzText, zu, kaufen }.
 * Kein Spiel-Eigenes: Zahlen und Ziel des Kaufknopfs liefert die App. Alles über textContent; Farben aus der
 * Farbwelt (--haupt, --karte, --karte-leise, --rahmen, --schrift, --schrift-leise).
 */
(function () {
    "use strict";

    const RAUM = "http://www.w3.org/2000/svg";
    const PFADE = {
        flamme: "M12 3 C15 7 18 9 18 14 A6 6 0 0 1 6 14 C6 11 8 9 9 7 C10 10 11 11 12 11 C12 8 11 6 12 3 Z",
        schild: "M12 3 L19 6 V11 C19 16 16 19 12 21 C8 19 5 16 5 11 V6 Z",
        schildLevel: "M12 3 L19 6 V11 C19 16 16 19 12 21 C8 19 5 16 5 11 V6 Z M9 12 L11 14 L15 10"
    };

    const TEXTE = {
        zaehlt: "zählt in allen Spielen",
        heuteJa: "Heute geschafft",
        heuteNein: "Heute noch offen",
        schild: "Flammen-Schild",
        schildText: "Aus dem Shop. Rettet die Serie einmal, dann ist er weg.",
        schutz: "Serien-Schutz",
        schutzText: "Vom Level. Überbrückt je Serie einen Tag; neue Serie = wieder voll.",
        zu: "Schließen",
        kaufen: "Schild kaufen"
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

    /* Reine Logik (getestet): die Werte sauber, die Woche immer 7 lang. */
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
            tage: tage,
            schild: zahl(w.schild),
            schildMax: zahl(w.schildMax),
            schutz: zahl(w.schutz),
            schutzAlle: zahl(w.schutzAlle)
        };
    }

    function beschriftung(w) {
        return "Serie " + w.serie + (w.serie === 1 ? " Tag" : " Tage")
            + " · Flammen-Schild " + w.schild + " · Serien-Schutz " + w.schutz;
    }

    function schildZeichen(art, anzahl) {
        const s = el("span", "up-se-schild up-se-" + art + (anzahl > 0 ? "" : " up-se-leer"));
        s.appendChild(zeichen(art === "kauf" ? "schild" : "schildLevel"));
        s.appendChild(document.createTextNode(String(anzahl)));
        return s;
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
        const schilde = el("span", "up-se-schilde");
        hinten.appendChild(woche);
        hinten.appendChild(schilde);
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
                flamme.setzen({ serie: w.serie, heuteGeschafft: w.heute, schutz: w.schild + w.schutz });
            }
            woche.innerHTML = "";
            w.woche.forEach((an, i) => {
                const tag = el("i", (an ? "an" : "") + (i === 6 ? " heute" : ""));
                tag.appendChild(zeichen("flamme"));
                woche.appendChild(tag);
            });
            schilde.innerHTML = "";
            schilde.appendChild(schildZeichen("kauf", w.schild));
            schilde.appendChild(schildZeichen("level", w.schutz));
            knopf.setAttribute("aria-label", beschriftung(w));
            return w;
        }

        halter.appendChild(knopf);
        setzen(o.werte || {});
        return { el: knopf, flamme: flamme, setzen: setzen };
    }

    function reihe(art, titel, text, zahlText) {
        const r = el("div", "up-se-reihe up-se-reihe-" + art);
        r.appendChild(zeichen(art === "kauf" ? "schild" : "schildLevel", "up-se-reihe-zeichen"));
        const mitte = el("div", "up-se-reihe-text");
        mitte.appendChild(el("b", "", titel));
        mitte.appendChild(el("small", "", text));
        r.appendChild(mitte);
        r.appendChild(el("span", "up-se-zahl", zahlText));
        return r;
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
            f.setzen({ serie: w.serie, heuteGeschafft: w.heute, schutz: 0 });
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

        ort.appendChild(reihe("kauf", t.schild, t.schildText, w.schild + (w.schildMax > 0 ? " / " + w.schildMax : "")));
        ort.appendChild(reihe("level", t.schutz, t.schutzText, w.schutz + " / " + w.schutzAlle));

        const knoepfe = el("div", "up-se-knoepfe");
        knoepfe.appendChild(knopf("up-zweit", t.zu, () => {
            if (typeof o.beiZu === "function") {
                o.beiZu();
            }
        }));
        const kauf = knopf("up-haupt", t.kaufen, () => {
            if (typeof o.beiKauf === "function") {
                o.beiKauf();
            }
        });
        if (w.schildMax > 0 && w.schild >= w.schildMax) {
            kauf.disabled = true;
        }
        knoepfe.appendChild(kauf);
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
