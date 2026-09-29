/*
 * upcrew-profil.js — das eigene Profil als Blatt, gleich in allen UPCrew-Spielen (gehört zu css/upcrew-profil.css,
 * braucht js/upcrew-abzeichen.js für die Kacheln). Entstanden in Blunderluck v0.156.0 als Vorschlag für
 * Design\3D-Schrift\final (Entwurf Oberfläche Runde 7, vom Nutzer abgenommen 28.09.2026).
 *
 * Aufbau (von oben): Ring mit Anfangsbuchstabe und Level · Name + klein „#Tag“ · XP-Balken · 3 ausgerüstete
 * Abzeichen (aus allen Spielen) · „Über dich“ (Spielzeit, dabei seit) · „Wo du stehst“ (Ort je Spiel) · wahlfrei
 * eigene Abschnitte der App. Das Zahnrad (→ Einstellungen) sitzt im Kopf des Blatts (`zahnrad(beiKlick)`).
 *
 *     UPCREW_PROFIL.zeichnen(ort, {
 *         name: "Jonas", tag: "#4821", level: 14, anteil: 0.62,        // anteil = XP im Level (0 … 1)
 *         xpText: "264 / 425 XP bis Level 15", ringKlasse: "…",       // wahlfrei
 *         abzeichen: [eintrag, …],                                    // die ausgerüsteten (UPCREW_ABZEICHEN)
 *         plaetze: 3,
 *         spielzeit: { wert: "2h+", zeilen: ["Blunderluck 1h+", …], oeffentlich: false } | null,
 *         seit: "12.08.2026" | "",
 *         orte: [{ spiel: "Blunderluck", titel: "Turm · Ort 2", unter: "…", anteil: 0.3, pfad: "…" }]
 *     }, {
 *         beiAbzeichen: () => …,       // Tipp auf einen Platz → Auswahl
 *         texte: { … },                // wahlfrei, siehe TEXTE
 *         zusatz: [element, …]         // wahlfrei: eigene Abschnitte der App ganz unten
 *     });
 *     UPCREW_PROFIL.abzeichenWahl(ort, alle, gewaehlt, { plaetze: 3, beiWechsel: (liste) => … });
 *     UPCREW_PROFIL.abschnitt(titel)   // ein Abschnitt im selben Aussehen (für `zusatz`)
 *
 * Kein Spiel-Eigenes hier: alle Zahlen und Texte kommen von der App; alles über textContent.
 */
(function () {
    "use strict";

    const RAUM = "http://www.w3.org/2000/svg";
    const PFADE = {
        zahnrad: "M12 8.5 A3.5 3.5 0 1 0 12 15.5 A3.5 3.5 0 1 0 12 8.5 Z M12 2.5 V5 M12 19 V21.5 M2.5 12 H5 M19 12 H21.5 "
            + "M5.3 5.3 L7.1 7.1 M16.9 16.9 L18.7 18.7 M5.3 18.7 L7.1 16.9 M16.9 7.1 L18.7 5.3",
        uhr: "M12 3 A9 9 0 1 0 12.01 3 Z M12 7 V12 L15 14",
        kalender: "M4 6 H20 V20 H4 Z M4 10 H20 M8 3 V7 M16 3 V7",
        auge: "M2 12 C5 6 19 6 22 12 C19 18 5 18 2 12 Z M12 9.5 A2.5 2.5 0 1 0 12 14.5 A2.5 2.5 0 1 0 12 9.5 Z",
        schloss: "M6 11 H18 V20 H6 Z M8.5 11 V8 A3.5 3.5 0 0 1 15.5 8 V11",
        plus: "M12 6 V18 M6 12 H18",
        haken: "M5 12.5 L10 17 L19 7"
    };

    const TEXTE = {
        abzeichen: "Abzeichen · ausgerüstet",
        abzeichenHinweis: "Alle verdienten Abzeichen liegen fest im Profil, egal aus welchem Spiel. Antippen zum Tauschen.",
        leer: "frei",
        ueber: "Über dich",
        spielzeit: "Spielzeit",
        oeffentlich: "öffentlich",
        privat: "privat",
        seit: "dabei seit",
        seitUnter: "auch als Gast gezählt",
        orte: "Wo du stehst",
        wahlHinweis: "Tippe an, was du zeigen willst: bis zu 3, aus allen Spielen. UP = zählt über alle Spiele.",
        nochNicht: "Noch nicht verdient",
        zahnrad: "Einstellungen"
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

    function zeichen(pfad, klasse) {
        const svg = document.createElementNS(RAUM, "svg");
        svg.setAttribute("viewBox", "0 0 24 24");
        svg.setAttribute("aria-hidden", "true");
        svg.setAttribute("focusable", "false");
        svg.setAttribute("class", klasse || "up-pf-zeichen");
        const p = document.createElementNS(RAUM, "path");
        p.setAttribute("d", PFADE[pfad] || pfad || "");
        svg.appendChild(p);
        return svg;
    }

    const anteilVon = (w) => Math.max(0, Math.min(1, Number(w) || 0));

    /* Der Ring: Anfangsbuchstabe, Level unten rechts, Füllung = Anteil. Auch für den Kopf der App. */
    function ring(daten, gross) {
        const d = daten || {};
        const r = el("span", "up-pf-ring" + (gross ? " up-pf-ring-gross" : "") + (d.ringKlasse ? " " + d.ringKlasse : ""));
        r.style.setProperty("--up-pf-anteil", anteilVon(d.anteil).toFixed(3));
        r.appendChild(el("span", "up-pf-kreis", String(d.name || "").trim().charAt(0).toUpperCase() || "?"));
        if (typeof d.level === "number") {
            r.appendChild(el("span", "up-pf-level", String(d.level)));
        }
        return r;
    }

    function abschnitt(titel) {
        const s = el("section", "up-pf-abschnitt");
        if (titel) {
            s.appendChild(el("h3", "", titel));
        }
        return s;
    }

    function zahnrad(beiKlick, name) {
        const k = el("button", "up-bl-kopf-knopf up-pf-zahnrad");
        k.type = "button";
        k.setAttribute("aria-label", name || TEXTE.zahnrad);
        k.title = name || TEXTE.zahnrad;
        k.appendChild(zeichen("zahnrad"));
        if (typeof beiKlick === "function") {
            k.addEventListener("click", beiKlick);
        }
        return k;
    }

    function kachelVon(eintrag, beiKlick) {
        if (typeof UPCREW_ABZEICHEN !== "undefined") {
            return UPCREW_ABZEICHEN.kachel(eintrag, beiKlick);
        }
        const k = el("button", "up-az", eintrag.titel);
        k.type = "button";
        if (beiKlick) {
            k.addEventListener("click", beiKlick);
        }
        return k;
    }

    function zeichnen(ort, daten, optionen) {
        const d = daten || {};
        const o = optionen || {};
        const t = Object.assign({}, TEXTE, o.texte || {});
        ort.innerHTML = "";
        ort.classList.add("up-pf");

        /* Kopf: Ring, Name + #Tag, XP. */
        const kopf = el("div", "up-pf-kopf");
        kopf.appendChild(ring(d, true));
        const mitte = el("div", "up-pf-mitte");
        const name = el("div", "up-pf-name", d.name || "");
        if (d.tag) {
            name.appendChild(el("span", "up-pf-tag", d.tag));
        }
        mitte.appendChild(name);
        const balken = el("div", "up-pf-xp");
        const fuellung = el("i");
        fuellung.style.width = Math.round(anteilVon(d.anteil) * 100) + "%";
        balken.appendChild(fuellung);
        mitte.appendChild(balken);
        if (d.xpText) {
            mitte.appendChild(el("small", "up-pf-xp-text", d.xpText));
        }
        kopf.appendChild(mitte);
        ort.appendChild(kopf);

        /* Abzeichen: immer `plaetze` Plätze, leere mit Plus. */
        const plaetze = (typeof d.plaetze === "number" && d.plaetze > 0) ? d.plaetze : 3;
        const az = abschnitt(t.abzeichen);
        const reihe = el("div", "up-pf-plaetze");
        const beiAbzeichen = () => {
            if (typeof o.beiAbzeichen === "function") {
                o.beiAbzeichen();
            }
        };
        const liste = Array.isArray(d.abzeichen) ? d.abzeichen.slice(0, plaetze) : [];
        for (let i = 0; i < plaetze; i++) {
            const platz = el("div", "up-pf-platz");
            if (liste[i]) {
                platz.appendChild(kachelVon(liste[i], beiAbzeichen));
            } else {
                const leer = el("button", "up-pf-leer");
                leer.type = "button";
                leer.setAttribute("aria-label", t.abzeichen + " · " + t.leer);
                leer.appendChild(zeichen("plus"));
                leer.appendChild(el("span", "", t.leer));
                leer.addEventListener("click", beiAbzeichen);
                platz.appendChild(leer);
            }
            reihe.appendChild(platz);
        }
        az.appendChild(reihe);
        az.appendChild(el("p", "up-pf-hinweis", t.abzeichenHinweis));
        ort.appendChild(az);

        /* Über dich: Spielzeit, dabei seit. */
        if (d.spielzeit || d.seit) {
            const ueber = abschnitt(t.ueber);
            const fakten = el("div", "up-pf-fakten");
            if (d.spielzeit) {
                const f = el("div", "up-pf-fakt up-pf-spielzeit");
                const kl = el("small");
                kl.appendChild(zeichen("uhr"));
                kl.appendChild(document.createTextNode(t.spielzeit + " "));
                kl.appendChild(zeichen(d.spielzeit.oeffentlich ? "auge" : "schloss"));
                kl.appendChild(document.createTextNode(d.spielzeit.oeffentlich ? t.oeffentlich : t.privat));
                f.appendChild(kl);
                f.appendChild(el("b", "", d.spielzeit.wert || ""));
                for (const zeile of (d.spielzeit.zeilen || [])) {
                    f.appendChild(el("span", "up-pf-klein", zeile));
                }
                fakten.appendChild(f);
            }
            if (d.seit) {
                const f = el("div", "up-pf-fakt up-pf-seit");
                const kl = el("small");
                kl.appendChild(zeichen("kalender"));
                kl.appendChild(document.createTextNode(t.seit));
                f.appendChild(kl);
                f.appendChild(el("b", "", d.seit));
                f.appendChild(el("span", "up-pf-klein", t.seitUnter));
                fakten.appendChild(f);
            }
            ueber.appendChild(fakten);
            ort.appendChild(ueber);
        }

        /* Wo du stehst: je Spiel eine Zeile. */
        const orte = Array.isArray(d.orte) ? d.orte : [];
        if (orte.length > 0) {
            const wo = abschnitt(t.orte);
            const liste2 = el("div", "up-pf-orte");
            for (const eintrag of orte) {
                const z = el("div", "up-pf-ort");
                const bild = el("span", "up-pf-ort-bild");
                if (eintrag.pfad) {
                    bild.appendChild(zeichen(eintrag.pfad));
                }
                z.appendChild(bild);
                const text = el("span", "up-pf-ort-text");
                text.appendChild(el("small", "", eintrag.spiel || ""));
                text.appendChild(el("b", "", eintrag.titel || ""));
                if (eintrag.unter) {
                    text.appendChild(el("small", "", eintrag.unter));
                }
                z.appendChild(text);
                if (typeof eintrag.anteil === "number") {
                    const b = el("span", "up-pf-ort-balken");
                    const i = el("i");
                    i.style.width = Math.round(anteilVon(eintrag.anteil) * 100) + "%";
                    b.appendChild(i);
                    z.appendChild(b);
                }
                liste2.appendChild(z);
            }
            wo.appendChild(liste2);
            ort.appendChild(wo);
        }

        for (const zusatz of (o.zusatz || [])) {
            if (zusatz) {
                ort.appendChild(zusatz);
            }
        }
        return ort;
    }

    /* Die Auswahl: alle Abzeichen (verdiente antippbar), die gewählten mit Haken. Höchstens `plaetze`; beim Vierten
       fällt das älteste heraus. `beiWechsel(neueListe)` nach jedem Tipp; `beiGesperrt(eintrag)` für nicht verdiente. */
    function abzeichenWahl(ort, alle, gewaehlt, optionen) {
        const o = optionen || {};
        const t = Object.assign({}, TEXTE, o.texte || {});
        const plaetze = (typeof o.plaetze === "number" && o.plaetze > 0) ? o.plaetze : 3;
        let wahl = (Array.isArray(gewaehlt) ? gewaehlt : []).slice(0, plaetze);
        const vorrat = Array.isArray(alle) ? alle : [];

        function fuellen() {
            ort.innerHTML = "";
            ort.classList.add("up-pf", "up-pf-wahl");
            ort.appendChild(el("p", "up-pf-hinweis", t.wahlHinweis));
            const raster = el("div", "up-pf-alle");
            for (const eintrag of vorrat) {
                const kennung = eintrag.kennung || eintrag.id;
                const an = wahl.indexOf(kennung) !== -1;
                const zelle = el("div", "up-pf-wahl-zelle" + (eintrag.erreicht > 0 ? "" : " up-pf-gesperrt")
                    + (an ? " up-pf-an" : ""));
                const kachel = kachelVon(eintrag, () => {
                    if (!(eintrag.erreicht > 0)) {
                        if (typeof o.beiGesperrt === "function") {
                            o.beiGesperrt(eintrag);
                        }
                        return;
                    }
                    if (an) {
                        wahl = wahl.filter((k) => k !== kennung);
                    } else {
                        wahl = wahl.concat([kennung]);
                        if (wahl.length > plaetze) {
                            wahl = wahl.slice(wahl.length - plaetze);
                        }
                    }
                    fuellen();
                    if (typeof o.beiWechsel === "function") {
                        o.beiWechsel(wahl.slice());
                    }
                });
                kachel.setAttribute("aria-pressed", an ? "true" : "false");
                zelle.appendChild(kachel);
                if (an) {
                    const haken = el("span", "up-pf-haken");
                    haken.appendChild(zeichen("haken"));
                    zelle.appendChild(haken);
                }
                raster.appendChild(zelle);
            }
            ort.appendChild(raster);
        }
        fuellen();
        return { wahl: () => wahl.slice(), neu: fuellen };
    }

    const UPCREW_PROFIL = { zeichnen: zeichnen, abzeichenWahl: abzeichenWahl, ring: ring, abschnitt: abschnitt,
        zahnrad: zahnrad, TEXTE: TEXTE, PFADE: PFADE };
    if (typeof window !== "undefined") {
        window.UPCREW_PROFIL = UPCREW_PROFIL;
    }
    if (typeof globalThis !== "undefined") {
        globalThis.UPCREW_PROFIL = UPCREW_PROFIL;
    }
    if (typeof module !== "undefined" && module.exports) {
        module.exports = UPCREW_PROFIL;
    }
})();
