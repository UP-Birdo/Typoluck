/*
 * upcrew-shop.js — der Tab „Shop“ (Platz 5 der Leiste), gleich in Blunderluck und Typoluck, zu css\upcrew-shop.css.
 * Quelle NUR hier (Apps\UPCrew\bausteine), in die Apps KOPIEREN, nie abwandeln. Seit Runde 8 (04.10.2026): neu
 * gebaut — Design-Reiter mit Besitz; der alte Aufruf gilt weiter (dann zeigt der Tab nur den Vorrat).
 *
 * Nutzer, 27.09.2026: „Shop auf dem Platz von Bald soll der kommen“. Nutzer, 03.10.2026: „Der shop soll endlich
 * mal gemacht werden“ · zur Wahl im Entwurf: „es gab früher schon shop vorschau die fand ich super“ → Aussehen
 * der früheren Vorschau (Design\3D-Schrift\entwuerfe\Bibliothek, ?tab=shop).
 *
 * AUFBAU: Kopf mit Guthaben · Schalter „Design · <Spielname>“.
 *   DESIGN (aus upcrew-katalog.js, in beiden Spielen gleich; dazu die Stücke nur dieses Spiels):
 *     „Heute im Angebot“ — drei Kacheln nebeneinander, 20 % billiger, aus dem Datum (upcrew-besitz.js)
 *     „Design-Pakete“    — Karten untereinander, jede in IHRER Farbwelt, groß „UPCREW“, Kachel-Vorschau
 *     „Einzelteile“      — Kategorie-Kacheln wie in der Sammlung; ein Tipp öffnet ein Blatt mit Raster und Preisen
 *     Tipp auf ein Stück → Stück-Blatt: großer Platz, Name, Preis, „Anprobieren“, „Kaufen“.
 *     Bänder: im Besitz · neu · wird erspielt · bald. Ohne Guthaben ist „Kaufen“ gesperrt: „Es fehlen n“.
 *   <SPIELNAME> — nur der Vorrat dieses Spiels (Tipp, Extra-Versuch bzw. Zeit zurück), wie bisher.
 * NICHTS ROLLT WAAGRECHT (das Wischen gehört dem Tab-Wechsel). Kein Level irgendwo.
 *
 * VERTRAG (die App liefert Stand und Kauf, der Baustein zeichnet):
 *     const shop = UPCREW_SHOP.bauen(behaelter, {
 *         // --- wie bisher (gilt für den Vorrat) ---
 *         titel: "Shop",
 *         lesen: () => stand,                      // der gemeinsame Fortschritt (Guthaben, Vorrat über UPCREW_MUENZEN)
 *         kaufen: async (ware) => true/false,      // Vorrat: die App fragt nach, bucht und speichert
 *         texte: { leben: { name: "Zeit zurück", text: "…" } },   // wahlfrei: eigene Waren-Texte je Spiel
 *         bilder: { leben: "M4.5 12 A7.5 …" },                    // wahlfrei: eigenes Bild je Ware (24er-Pfad)
 *         // --- NEU (für den Reiter Design; fehlen Katalog, Besitz, Platz oder Blatt, gibt es nur den Vorrat) ---
 *         spiel: "typoluck",                       // welches Spiel (Katalog-Auswahl, Name des zweiten Reiters)
 *         spielName: "Typoluck",                   // wahlfrei
 *         besitz: () => besitz,                    // die Menge aus UPCREW_BESITZ (Gerät + Konto vereinigt)
 *         heute: () => "2026-10-03",               // wahlfrei: Datum für das Angebot (sonst Ortszeit des Geräts)
 *         frei: (art, wert) => true/false,         // wahlfrei: auf anderem Weg schon frei (zeigt „im Besitz“)
 *         kaufenStueck: async (stueck, preis) => true/false,   // die App fragt nach, rechnet mit
 *                                                  //  UPCREW_BESITZ.kaufen(…) und speichert (erst Besitz, dann
 *                                                  //  Fortschritt)
 *         anprobieren: (stuecke) => {},            // die App zeigt die Stücke probeweise (ein Stück oder der
 *                                                  //  Inhalt eines Pakets); ohne Rückruf ist der Knopf aus
 *         bildVon: (stueck) => "<…>",              // wahlfrei: Platzhalter-Bild des Spiels für ein Stück
 *         teil: "design" | "vorrat",               // wahlfrei: welcher Reiter zuerst
 *         beiTeil: (teil) => {}                    // wahlfrei: der Reiter wurde gewechselt
 *     });
 *     shop.zeichnen();                             // nach jedem neuen Stand (zeichnet auch offene Blätter neu)
 *     shop.teilSetzen("vorrat");  shop.teil();
 *     shop.oeffnen("kat:schrift" | "stueck:schrift-S3" | "paket:studio");  shop.schliessen();
 *     shop.kopf, shop.liste                        // wie bisher (liste = die Vorrat-Karten)
 *   `texte`/`bilder` ersetzen je Ware Name, Kurztext und Bild nur für die Anzeige — `UPCREW_MUENZEN.WAREN` wird
 *   nie verändert. UPCREW_SHOP.text(ware, texte) → { name, text } (auch für die Rückfrage der App).
 *
 * Jede Grafik ist ein PLATZ (upcrew-platz.js): die Münze „symbol/muenze“, die Waren „vorrat/<spiel>/<ware>“ (als
 * Platzhalter die heutigen Zeichen), die Stück-Bilder „stueck/<art>/<wert>“. Die Paket-Karte ist Gerüst: Sie
 * zeichnet sich aus den Farbwelt-Variablen ihres Pakets.
 * Braucht upcrew-muenzen.js, die Knopf-Familie (up-kn) und die Farbwelt-Variablen; für Design dazu
 * upcrew-katalog.js, upcrew-besitz.js, upcrew-platz.js, upcrew-blatt.js, upcrew-farbwelten.js, upcrew-aussehen.js.
 * Alle Texte über textContent.
 */
(function () {
    "use strict";

    const RAUM = "http://www.w3.org/2000/svg";
    /* Die heutigen Bilder der Waren (24er-Raster) — Platzhalter der Plätze „vorrat/<spiel>/<ware>“. */
    const BILDER = {
        leben: "M12 20 C7 16.5 3.5 13.5 3.5 9.5 A4.5 4.5 0 0 1 12 7 A4.5 4.5 0 0 1 20.5 9.5 C20.5 13.5 17 16.5 12 20 Z",
        tipp: "M9 18 H15 M10 21 H14 M12 3 A6 6 0 0 1 16 13.5 C15.2 14.3 15 15 15 16 H9 C9 15 8.8 14.3 8 13.5 A6 6 0 0 1 12 3 Z"
    };
    const REIHENFOLGE = ["leben", "tipp"];
    const GRUENDE = { zuWenig: "Zu wenig", voll: "Vorrat voll" };
    const SPIEL_NAMEN = { typoluck: "Typoluck", blunderluck: "Blunderluck" };
    const BAND = { besitz: "im Besitz", neu: "neu", erspielt: "wird erspielt", bald: "bald" };
    const KAUF_TEXT = { besitz: "Im Besitz", start: "Im Besitz", erspielt: "Wird erspielt", bald: "Bald",
        voll: "Kein Platz", unbekannt: "Nicht kaufbar", app: "Nicht kaufbar" };
    const MINI_WORT = ["L", "E", "S", "E", "N"];
    const MINI_ART = ["r", "v", "", "r", ""];

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

    const zahlText = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");

    /* Das Bild einer Ware: aus `bilder` des Spiels (ein Pfad), sonst das gemeinsame. */
    function bild(ware, bilder) {
        const eigen = (bilder && typeof bilder === "object" && typeof bilder[ware] === "string" && bilder[ware])
            ? bilder[ware] : "";
        const svg = document.createElementNS(RAUM, "svg");
        svg.setAttribute("viewBox", "0 0 24 24");
        svg.setAttribute("aria-hidden", "true");
        svg.setAttribute("focusable", "false");
        const p = document.createElementNS(RAUM, "path");
        p.setAttribute("d", eigen || BILDER[ware] || "");
        svg.appendChild(p);
        return svg;
    }

    /* Name und Kurztext einer Ware: aus `texte` des Spiels, sonst aus UPCREW_MUENZEN.WAREN. */
    function text(id, texte) {
        const ware = UPCREW_MUENZEN.WAREN[id] || {};
        const eigen = (texte && typeof texte === "object" && texte[id] && typeof texte[id] === "object") ? texte[id] : {};
        return {
            name: typeof eigen.name === "string" && eigen.name ? eigen.name : (ware.name || id),
            text: typeof eigen.text === "string" ? eigen.text : (ware.text || "")
        };
    }

    /* Die Münze: der Platz „symbol/muenze“, als Platzhalter das heutige Zeichen. */
    function muenze() {
        const zeichen = UPCREW_MUENZEN.zeichen();
        return (typeof UPCREW_PLATZ !== "undefined")
            ? UPCREW_PLATZ.bauen("symbol/muenze", "24x24", { inhalt: zeichen, klasse: "up-shop-mz" }) : zeichen;
    }

    /* „(Münze) [alt durchgestrichen] Zahl“ */
    function betrag(zahl, alt) {
        const s = el("span", "up-shop-betrag");
        s.appendChild(muenze());
        if (typeof alt === "number" && alt !== zahl) {
            s.appendChild(el("s", "", zahlText(alt)));
        }
        s.appendChild(el("span", "", zahlText(zahl)));
        return s;
    }

    function knopf(klasse, beschriftung) {
        const k = el("button", "up-kn " + klasse);
        k.type = "button";
        k.appendChild(el("i", "up-led"));
        k.appendChild(el("span", "", beschriftung));
        return k;
    }

    function bauen(behaelter, opt) {
        opt = opt || {};
        const M = UPCREW_MUENZEN;
        const K = (typeof UPCREW_KATALOG !== "undefined") ? UPCREW_KATALOG : null;
        const BE = (typeof UPCREW_BESITZ !== "undefined") ? UPCREW_BESITZ : null;
        const P = (typeof UPCREW_PLATZ !== "undefined") ? UPCREW_PLATZ : null;
        const BL = (typeof UPCREW_BLATT !== "undefined") ? UPCREW_BLATT : null;
        const A = (typeof UPCREW_AUSSEHEN !== "undefined") ? UPCREW_AUSSEHEN : null;
        const mitDesign = !!K && !!BE && !!P && !!BL;
        const spiel = SPIEL_NAMEN[opt.spiel] ? opt.spiel : ((A && SPIEL_NAMEN[A.app]) ? A.app : "");
        const spielName = opt.spielName || SPIEL_NAMEN[spiel] || "Vorrat";
        let teil = (mitDesign && opt.teil !== "vorrat") ? "design" : "vorrat";
        let beschaeftigt = false;
        let offen = [];

        behaelter.classList.add("up-shop");
        const kopf = el("div", "up-shop-kopf");
        kopf.appendChild(el("h2", "up-shop-titel", opt.titel || "Shop"));
        const saldo = el("span", "up-shop-saldo");
        kopf.appendChild(saldo);
        behaelter.appendChild(kopf);

        const seg = el("div", "up-shop-seg");
        seg.setAttribute("role", "group");
        seg.setAttribute("aria-label", "Bereich");
        const segKnoepfe = {};
        for (const eintrag of [["design", "Design"], ["vorrat", spielName]]) {
            const k = el("button", "", eintrag[1]);
            k.type = "button";
            k.dataset.teil = eintrag[0];
            k.addEventListener("click", () => teilSetzen(eintrag[0]));
            segKnoepfe[eintrag[0]] = k;
            seg.appendChild(k);
        }
        const design = el("div", "up-shop-design");
        if (mitDesign) {
            behaelter.appendChild(seg);
            behaelter.appendChild(design);
        }
        const liste = el("div", "up-shop-liste");
        behaelter.appendChild(liste);

        /* ---------- Stand von jetzt ---------- */
        const stand = () => (typeof opt.lesen === "function" ? opt.lesen() : null);
        const besitz = () => BE.lesen(typeof opt.besitz === "function" ? opt.besitz() : null);
        const heute = () => (typeof opt.heute === "function" ? opt.heute() : BE.datumText());
        const modus = () => ((A && typeof A.modus === "function") ? A.modus() : "dunkel");
        const artenHier = () => K.arten(spiel || undefined);

        function hat(s) {
            if (BE.imBesitz(besitz(), s) || s.weg === "start") {
                return true;
            }
            try {
                return typeof opt.frei === "function" && !!opt.frei(s.art, s.wert);
            } catch (fehler) {
                return false;
            }
        }

        function bandVon(s) {
            if (hat(s)) {
                return "besitz";
            }
            if (!s.wirkt) {
                return "bald";
            }
            if (s.weg === "erspielt") {
                return "erspielt";
            }
            return K.istNeu(s) ? "neu" : "";
        }

        function bandEl(art) {
            return art ? el("i", "up-shop-band up-shop-band-" + art, BAND[art]) : null;
        }

        /* Was der Kauf-Knopf sagt: { ok, text, preis }. */
        function kaufLage(s) {
            if (hat(s)) {
                return { ok: false, text: KAUF_TEXT.besitz, preis: 0 };
            }
            const p = BE.kannKaufen(stand(), besitz(), s.art, s.wert, heute());
            if (p.ok) {
                return { ok: true, text: "Kaufen · " + zahlText(p.preis), preis: p.preis };
            }
            if (p.grund === "zuWenig") {
                return { ok: false, text: "Es fehlen " + zahlText(p.fehlt), preis: p.preis };
            }
            return { ok: false, text: KAUF_TEXT[p.grund] || KAUF_TEXT.unbekannt, preis: p.preis };
        }

        function stueckBild(s, klasse) {
            let eigen = "";
            try {
                eigen = typeof opt.bildVon === "function" ? (opt.bildVon(s) || "") : "";
            } catch (fehler) {
                eigen = "";
            }
            return P.stueck(s, { modus: modus(), html: typeof eigen === "string" ? eigen : "", klasse: klasse });
        }

        function preisZeile(s) {
            if (hat(s)) {
                return null;
            }
            const p = BE.preis(s, heute());
            if (!p) {
                return null;
            }
            const zeile = el("span", "up-shop-preis");
            zeile.appendChild(betrag(p.preis, p.voll));
            zeile.setAttribute("aria-label", p.preis + " " + M.WAEHRUNG.name);
            return zeile;
        }

        /* Die Farbwelt-Variablen eines Pakets: aus upcrew-farbwelten.js, für noch nicht gebaute Welten aus den
           Vorschau-Farben des Katalogs (nur die Variablen, die die Karte braucht). */
        function weltWerte(wert) {
            const m = modus();
            const F = (typeof window !== "undefined") ? window.UPCREW_FARBWELTEN : null;
            const W = (typeof window !== "undefined" && window.UPCREW_INTRO) ? window.UPCREW_INTRO.WELTEN : null;
            if (F && W && W[wert]) {
                return F.werte(wert, m);
            }
            const s = K.stueck("farbwelt", wert);
            const f = (s && s.vorschau) ? s.vorschau[m] : null;
            if (!f) {
                return null;
            }
            const hellAuf = !F || F.kontrast(f.ak, "#ffffff") >= 3;
            return {
                "--flaeche": f.bg, "--karte": f.fl, "--karte-leise": f.ta, "--rahmen": f.ta, "--schrift": f.ink,
                "--schrift-leise": f.lei, "--haupt": f.ak, "--haupt-schrift": hellAuf ? "#ffffff" : "#1a1a1a",
                "--haupt-kante": "color-mix(in srgb, " + f.ak + " 72%, #000000)",
                "--still-kante": "color-mix(in srgb, " + f.bg + " 60%, #000000)",
                "--kachel-richtig": s.vorschau.kacheln.richtig, "--kachel-vorhanden": s.vorschau.kacheln.vorhanden,
                "--kachel-falsch": f.ta, "--kachel-schrift": "#ffffff",
                "--feld-hell": "color-mix(in srgb, #ffffff 86%, " + f.ak + ")",
                "--feld-dunkel": "color-mix(in srgb, " + f.ak + " 80%, #000000)"
            };
        }

        function weltAn(ziel, wert) {
            const v = weltWerte(wert);
            if (v) {
                for (const name of Object.keys(v)) {
                    ziel.style.setProperty(name, v[name]);
                }
            }
        }

        /* Die Kachel-Vorschau der Paket-Karte: Typoluck fünf Kacheln, Blunderluck fünf Felder. */
        function miniVorschau() {
            const reihe = el("div", "up-shop-mini");
            for (let i = 0; i < 5; i++) {
                if (spiel === "blunderluck") {
                    reihe.appendChild(el("i", i % 2 === 0 ? "h" : "d"));
                } else {
                    reihe.appendChild(el("i", MINI_ART[i], MINI_WORT[i]));
                }
            }
            return reihe;
        }

        function marke(gross) {
            const m = el("div", "up-shop-marke" + (gross ? " up-shop-marke-gross" : ""));
            m.appendChild(el("b", "", "UP"));
            m.appendChild(document.createTextNode("CREW"));
            return m;
        }

        /* ---------- Kacheln ---------- */

        /* Ein Stück als Kachel (Angebot, Raster im Blatt): Bild, Name, Preis, Band. Tipp = Stück-Blatt. */
        function teilKachel(s) {
            const k = el("button", "up-shop-teil" + (hat(s) ? " up-shop-hat" : ""));
            k.type = "button";
            k.dataset.stueck = K.kennung(s);
            k.appendChild(stueckBild(s));
            k.appendChild(el("b", "up-shop-teil-name", s.name));
            const zeile = preisZeile(s);
            if (zeile) {
                k.appendChild(zeile);
            }
            const band = bandEl(bandVon(s));
            if (band) {
                k.appendChild(band);
            }
            k.addEventListener("click", () => (s.art === "paket" ? paketBlatt(s) : stueckBlatt(s)));
            return k;
        }

        function paketKarte(p) {
            const karte = el("button", "up-shop-paket");
            karte.type = "button";
            karte.dataset.paket = p.wert;
            weltAn(karte, p.wert);
            const links = el("div", "up-shop-paket-text");
            links.appendChild(marke(false));
            links.appendChild(el("div", "up-shop-paket-name", p.name));
            links.appendChild(el("small", "", K.inhalt(p).filter((t) => t.art !== "farbwelt")
                .map((t) => t.name).join(" · ")));
            links.appendChild(miniVorschau());
            karte.appendChild(links);
            const rechts = el("div", "up-shop-paket-rechts");
            const band = bandEl(bandVon(p));
            if (band) {
                rechts.appendChild(band);
            }
            if (!hat(p) && p.wirkt) {
                const preis = el("span", "up-shop-mini-knopf");
                preis.appendChild(betrag(p.preis));
                rechts.appendChild(preis);
            }
            karte.appendChild(rechts);
            karte.setAttribute("aria-label", "Design-Paket " + p.name);
            karte.addEventListener("click", () => paketBlatt(p));
            return karte;
        }

        /* Eine Kategorie der Einzelteile — wie die Kacheln der Sammlung. */
        function katKachel(art) {
            const alle = K.stuecke(art.schluessel);
            const n = alle.filter(hat).length;
            const offene = alle.filter((s) => !hat(s) && s.weg === "kauf" && s.wirkt);
            const zeigt = offene[0] || alle.find((s) => !hat(s)) || alle[0];
            const bald = !alle.some((s) => s.wirkt);
            const k = el("button", "up-shop-kat" + (bald ? " up-shop-kat-bald" : ""));
            k.type = "button";
            k.dataset.kat = art.schluessel;
            const bildEl = el("span", "up-shop-kat-bild");
            bildEl.appendChild(stueckBild(zeigt));
            k.appendChild(bildEl);
            const t = el("span", "up-shop-kat-text");
            t.appendChild(el("b", "", art.name));
            let zusatz = "alles im Besitz";
            if (offene.length > 0) {
                zusatz = "ab " + zahlText(Math.min.apply(null, offene.map((s) => BE.preis(s, heute()).preis)));
            } else if (alle.some((s) => !hat(s))) {
                zusatz = bald ? "bald" : "wird erspielt";
            }
            const klein = el("small", "", n + "/" + alle.length + (bald ? " " : " · " + zusatz + " "));
            if (bald) {
                klein.appendChild(bandEl("bald"));
            } else if (alle.some((s) => !hat(s) && K.istNeu(s))) {
                klein.appendChild(bandEl("neu"));
            }
            t.appendChild(klein);
            k.appendChild(t);
            const strich = el("i", "up-shop-strich");
            const voll = el("i");
            voll.style.width = (alle.length ? Math.round(n / alle.length * 100) : 0) + "%";
            strich.appendChild(voll);
            k.appendChild(strich);
            k.addEventListener("click", () => katBlatt(art));
            return k;
        }

        function zwischen(titel, klein) {
            const h = el("h3", "up-shop-zwischen", titel);
            if (klein) {
                h.appendChild(document.createTextNode(" "));
                h.appendChild(el("small", "", klein));
            }
            return h;
        }

        /* ---------- Blätter (upcrew-blatt.js) ---------- */

        function blattAuf(titel, klasse, kennung, zeichner) {
            const saldoEl = el("span", "up-shop-saldo");
            const eintrag = BL.oeffnen({
                titel: titel,
                klasse: "up-shop-blatt " + klasse,
                rechts: [saldoEl],
                inhalt: () => {},
                beimSchliessen: () => {
                    offen = offen.filter((o) => o.eintrag !== eintrag);
                }
            });
            const o = {
                eintrag: eintrag,
                zeichnen() {
                    saldoZeigen(saldoEl);
                    eintrag.inhalt.textContent = "";
                    zeichner(eintrag.inhalt);
                }
            };
            /* Welches Blatt das ist ("kat:schrift", "stueck:schrift-S3", "paket:studio") — für Tests und Fotos. */
            eintrag.flaeche.dataset.upShop = kennung;
            offen.push(o);
            o.zeichnen();
            return o;
        }

        function katBlatt(art) {
            return blattAuf(art.name, "up-shop-blatt-kat", "kat:" + art.schluessel, (inhalt) => {
                const koerper = el("div", "up-shop-koerper");
                const raster = el("div", "up-shop-raster");
                for (const s of K.stuecke(art.schluessel)) {
                    raster.appendChild(teilKachel(s));
                }
                koerper.appendChild(raster);
                inhalt.appendChild(koerper);
            });
        }

        /* Der Fuß eines Stück- oder Paket-Blatts: Anprobieren · Kaufen. */
        function fuss(s, probe) {
            const f = el("div", "up-shop-fuss");
            const an = knopf("up-zweit up-shop-anprobieren", "Anprobieren");
            an.disabled = probe.length === 0 || typeof opt.anprobieren !== "function";
            an.addEventListener("click", () => {
                if (!an.disabled) {
                    opt.anprobieren(probe);
                }
            });
            f.appendChild(an);
            const lage = kaufLage(s);
            const kauf = knopf("up-haupt up-shop-kaufen", lage.text);
            kauf.disabled = !lage.ok || typeof opt.kaufenStueck !== "function";
            kauf.setAttribute("aria-label", s.name + ": " + lage.text);
            kauf.addEventListener("click", async () => {
                if (beschaeftigt || kauf.disabled) {
                    return;
                }
                beschaeftigt = true;
                try {
                    await opt.kaufenStueck(s, lage.preis);
                } finally {
                    beschaeftigt = false;
                    zeichnen();
                }
            });
            f.appendChild(kauf);
            return f;
        }

        function lageText(s) {
            if (hat(s)) {
                return "Schon im Besitz — liegt in der Sammlung.";
            }
            if (!s.wirkt) {
                return "Kommt bald — noch nicht kaufbar.";
            }
            if (s.weg === "erspielt") {
                return "Wird erspielt — nicht kaufbar.";
            }
            return "";
        }

        function grossPreis(s) {
            const p = BE.preis(s, heute());
            const zeile = el("p", "up-shop-grosspreis");
            zeile.appendChild(betrag(p.preis, p.voll));
            if (p.imAngebot) {
                zeile.appendChild(el("small", "", "heute im Angebot"));
            }
            return zeile;
        }

        function stueckBlatt(s) {
            const art = K.art(s.art);
            return blattAuf(art.name, "up-shop-blatt-stueck", "stueck:" + K.kennung(s), (inhalt) => {
                const koerper = el("div", "up-shop-koerper up-shop-stueck");
                const rahmen = el("div", "up-shop-gross");
                rahmen.appendChild(stueckBild(s, "up-shop-gross-bild"));
                const band = bandEl(bandVon(s));
                if (band) {
                    rahmen.appendChild(band);
                }
                koerper.appendChild(rahmen);
                koerper.appendChild(el("h3", "up-shop-name", s.name));
                koerper.appendChild(el("p", "up-shop-leise", art.name + " · " + (art.spiel === "alle"
                    ? "gilt in beiden Spielen" : "nur in " + (SPIEL_NAMEN[art.spiel] || art.spiel))));
                const lage = lageText(s);
                koerper.appendChild(lage ? el("p", "up-shop-leise", lage) : grossPreis(s));
                const paket = s.paket ? K.stueck("paket", s.paket) : null;
                if (paket && !hat(s)) {
                    koerper.appendChild(el("p", "up-shop-leise", "Auch im Design-Paket „" + paket.name + "“ ("
                        + zahlText(paket.preis) + ")."));
                }
                inhalt.appendChild(koerper);
                inhalt.appendChild(fuss(s, s.wirkt ? [s] : []));
            });
        }

        function paketBlatt(p) {
            return blattAuf("Design-Paket", "up-shop-blatt-paket", "paket:" + p.wert, (inhalt) => {
                const teile = K.inhalt(p);
                const koerper = el("div", "up-shop-koerper up-shop-stueck");
                const buehne = el("div", "up-shop-buehne");
                weltAn(buehne, p.wert);
                const schrift = teile.find((t) => t.art === "schrift");
                const knoepfe = teile.find((t) => t.art === "knoepfe");
                if (schrift) {
                    if (A && typeof A.schriftLaden === "function") {
                        A.schriftLaden(schrift.wert);
                    }
                    buehne.style.fontFamily = "\"Crew " + schrift.wert + "\", system-ui, sans-serif";
                }
                if (knoepfe) {
                    buehne.dataset.knoepfe = knoepfe.wert;
                }
                buehne.appendChild(marke(true));
                buehne.appendChild(el("b", "up-shop-paket-name", p.name));
                buehne.appendChild(miniVorschau());
                const probe = el("span", "up-kn up-haupt");
                probe.appendChild(el("i", "up-led"));
                probe.appendChild(el("span", "", "Spielen"));
                buehne.appendChild(probe);
                const band = bandEl(bandVon(p));
                if (band) {
                    buehne.appendChild(band);
                }
                koerper.appendChild(buehne);
                const lage = lageText(p);
                koerper.appendChild(lage ? el("p", "up-shop-leise", lage) : grossPreis(p));
                koerper.appendChild(el("p", "up-shop-leise",
                    "Farbwelt mit Vorschlägen. Alles danach einzeln im Besitz und einzeln tauschbar."));
                koerper.appendChild(zwischen("Inhalt"));
                const raster = el("div", "up-shop-raster");
                for (const t of teile) {
                    raster.appendChild(teilKachel(t));
                }
                koerper.appendChild(raster);
                inhalt.appendChild(koerper);
                inhalt.appendChild(fuss(p, p.wirkt ? teile.filter((t) => t.wirkt) : []));
            });
        }

        /* ---------- Seite ---------- */

        function saldoZeigen(ziel) {
            const haben = M.anzeige(stand());
            ziel.textContent = "";
            ziel.appendChild(betrag(haben));
            ziel.setAttribute("aria-label", haben + " " + M.WAEHRUNG.name);
        }

        function designZeichnen() {
            design.textContent = "";
            const angebot = BE.angebot(heute());
            if (angebot.length > 0) {
                design.appendChild(zwischen("Heute im Angebot", "−20 % · für alle gleich"));
                const reihe = el("div", "up-shop-angebot");
                for (const s of angebot) {
                    reihe.appendChild(teilKachel(s));
                }
                design.appendChild(reihe);
            }
            const pakete = K.stuecke("paket");
            if (pakete.length > 0) {
                design.appendChild(zwischen("Design-Pakete", "je " + zahlText(K.art("paket").preis)));
                const stapel = el("div", "up-shop-pakete");
                for (const p of pakete) {
                    stapel.appendChild(paketKarte(p));
                }
                design.appendChild(stapel);
            }
            design.appendChild(zwischen("Einzelteile"));
            const raster = el("div", "up-shop-kat-raster");
            for (const art of artenHier()) {
                /* Nur Arten, in denen es etwas zu kaufen gibt (Rahmen, Titel, Abzeichen werden nur erspielt). */
                if (art.schluessel !== "paket" && K.stuecke(art.schluessel).some((s) => s.weg === "kauf")) {
                    raster.appendChild(katKachel(art));
                }
            }
            design.appendChild(raster);
        }

        function vorratZeichnen() {
            const jetzt = stand();
            liste.textContent = "";
            for (const id of REIHENFOLGE) {
                const ware = M.WAREN[id];
                if (!ware) {
                    continue;
                }
                const kann = M.kannKaufen(jetzt, id);
                const karte = el("article", "up-shop-karte" + (kann.ok ? "" : " up-shop-zu"));
                const b = el("span", "up-shop-bild up-shop-bild-" + id);
                const zeichen = bild(id, opt.bilder);
                b.appendChild(P ? P.bauen("vorrat/" + (spiel || "spiel") + "/" + id, "48x48", { inhalt: zeichen })
                    : zeichen);
                karte.appendChild(b);

                const textEl = el("div", "up-shop-text");
                const anzeige = text(id, opt.texte);
                textEl.appendChild(el("h3", "", anzeige.name));
                textEl.appendChild(el("p", "", anzeige.text));
                const vorrat = M.vorrat(jetzt, id);
                textEl.appendChild(el("p", "up-shop-hast",
                    "Du hast: " + vorrat + (ware.hoechstens > 0 ? " / " + ware.hoechstens : "")));
                karte.appendChild(textEl);

                const kauf = el("div", "up-shop-kauf");
                const preis = el("span", "up-shop-preis");
                preis.appendChild(betrag(ware.preis));
                preis.setAttribute("aria-label", ware.preis + " " + M.WAEHRUNG.name);
                kauf.appendChild(preis);
                const k = knopf("up-haupt up-shop-kaufen", kann.ok ? "Kaufen" : (GRUENDE[kann.grund] || "Kaufen"));
                k.disabled = !kann.ok;
                k.setAttribute("aria-label", anzeige.name + " kaufen");
                k.addEventListener("click", async () => {
                    if (beschaeftigt || k.disabled || typeof opt.kaufen !== "function") {
                        return;
                    }
                    beschaeftigt = true;
                    try {
                        await opt.kaufen(id);
                    } finally {
                        beschaeftigt = false;
                        zeichnen();
                    }
                });
                kauf.appendChild(k);
                karte.appendChild(kauf);
                liste.appendChild(karte);
            }
        }

        function zeichnen() {
            saldoZeigen(saldo);
            if (mitDesign) {
                for (const name of Object.keys(segKnoepfe)) {
                    segKnoepfe[name].setAttribute("aria-pressed", String(name === teil));
                }
                design.hidden = teil !== "design";
                liste.hidden = teil !== "vorrat";
                if (teil === "design") {
                    designZeichnen();
                }
            }
            vorratZeichnen();
            for (const o of offen.slice()) {
                o.zeichnen();
            }
        }

        function teilSetzen(neu) {
            teil = (neu === "design" && mitDesign) ? "design" : "vorrat";
            zeichnen();
            if (typeof opt.beiTeil === "function") {
                opt.beiTeil(teil);
            }
        }

        /* "kat:schrift" · "stueck:schrift-S3" · "paket:studio" */
        function oeffnen(was) {
            if (!mitDesign) {
                return false;
            }
            const text0 = String(was || "");
            const stelle = text0.indexOf(":");
            const typ = text0.slice(0, stelle);
            const rest = text0.slice(stelle + 1);
            if (typ === "kat" && K.art(rest)) {
                katBlatt(K.art(rest));
                return true;
            }
            const s = typ === "paket" ? K.stueck("paket", rest) : (typ === "stueck" ? K.nachKennung(rest) : null);
            if (!s) {
                return false;
            }
            if (s.art === "paket") {
                paketBlatt(s);
            } else {
                stueckBlatt(s);
            }
            return true;
        }

        function schliessen() {
            for (const o of offen.slice().reverse()) {
                o.eintrag.schliessen();
            }
        }

        zeichnen();
        return { zeichnen: zeichnen, kopf: kopf, liste: liste, design: design, teilSetzen: teilSetzen,
            teil: () => teil, oeffnen: oeffnen, schliessen: schliessen };
    }

    const UPCREW_SHOP = { bauen: bauen, text: text, BILDER: BILDER, REIHENFOLGE: REIHENFOLGE };
    globalThis.UPCREW_SHOP = UPCREW_SHOP;
    if (typeof module !== "undefined" && module.exports) {
        module.exports = UPCREW_SHOP;
    }
})();
