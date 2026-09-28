/*
 * start-bibliothek.js — die Bibliothek auf dem Startbildschirm als
 * DOPPELSEITE (seit 0.20.0; ersetzt den Weg 6 × 8 aus 0.18.0).
 *
 * Vorlage: Entwurf Design\3D-Schrift\entwuerfe\Bibliothek-Doppelseite\
 * (doppelseite.js/.css), vom Nutzer am 28.09.2026 abgenommen („das passt
 * fürs Erste so"). Regeln und Stand: js/bibliothek.js; geschrieben wird nur
 * über APP (Fortschritt). Jeder Knopf entsteht in BAUSTEINE.knopf, jedes
 * Zeichen in BAUSTEINE.zeichen (Haus-Regel) — deshalb DOM statt der
 * HTML-Texte des Entwurfs.
 *
 * ERGÄNZT das Objekt START (Object.assign) und lädt NACH
 * js/bildschirm-start.js.
 *
 * WAS ZU SEHEN IST
 *   - Schalter Üben · Bibliothek oben (letzte Wahl auf dem Gerät).
 *   - Die Buch-Karte: Nummer, Titel, Regal-Knopf; Kapitel-Punkte und „Boss
 *     in n". Seit 0.21.0 links die Herzen (ab Buch 2; Buch 1 hat keine,
 *     der Platz bleibt leer).
 *   - Seit 0.21.0 Rast (Kerze: Heilen oder Üben) und Fund (loses Blatt:
 *     Tausch mit Risiko) als Stationen; der Checkpoint (seit 0.21.1 die
 *     letzte gegangene Rast oder besiegte Elite) trägt ein Lesezeichen.
 *     Seit 0.21.1 nur vorwärts: gespielt wird nur die Front.
 *     Was hier gewählt wird, rechnet
 *     js/bibliothek.js, gespeichert wird über APP (Durchgang: Gerät).
 *   - Das Buch hochkant: untere Seite · Falz · obere Seite, Kapitelzahl
 *     (römisch), Seitenzahlen, Lesezeichen im Kapitel, in dem man steht.
 *     Stationen: Wort = Initiale, sonst Symbol. Wege: Tinte = gegangen,
 *     punktiert = möglich, blass = nicht genommen. Keine Station im Falz.
 *   - Darunter ‹ Spielen › (Umblättern nur zwischen Kapiteln; Wischen im
 *     Buch blättert auch).
 *   - Blatt von unten mit Chips; an einer Gabelung „Weg wählen" mit zwei
 *     Knöpfen (Symbolreihe je Spur).
 *   - Das Regal: sechs Buchrücken, das aktuelle hebt sich, daneben der
 *     Boss-Kopf.
 */

Object.assign(START, {

    ART_SCHLUESSEL: "typoluck.start-art",

    /* Anzeige-Gedächtnis (nicht gespeichert): angesehenes Buch/Kapitel
       (null = wo man steht), Regal offen, Richtung des Umblätterns. */
    buchBlick: null,
    kapBlick: null,
    regalOffen: false,
    _klapp: "",

    /* Die gemerkte Art: "bibliothek" (Vorgabe) oder "ueben" (bis 0.19.0
       hiess das „frei"). */
    art() {
        try {
            const wert = window.localStorage.getItem(START.ART_SCHLUESSEL);
            if (wert === "ueben" || wert === "frei") {
                return "ueben";
            }
        } catch (fehler) {
            /* ohne Gerätespeicher: die Vorgabe */
        }
        return "bibliothek";
    },

    artSetzen(id) {
        try {
            window.localStorage.setItem(START.ART_SCHLUESSEL, id === "ueben" ? "ueben" : "bibliothek");
        } catch (fehler) {
            /* dann gilt die Wahl bis zum Neuladen nicht */
        }
        START.regalOffen = false;
        NAVIGATION.auffrischen();
    },

    /* Der Schalter Üben · Bibliothek (BAUSTEINE.segment). */
    _artSchalterBauen() {
        const schalter = BAUSTEINE.segment([
            { wert: "ueben", text: "Üben" },
            { wert: "bibliothek", text: BIBLIOTHEK.NAME }
        ], START.art(), (wert) => START.artSetzen(wert), "Art");
        schalter.classList.add("start-art-schalter");
        return schalter;
    },

    /* ---------------------------------------------------------------- *
     * Stand und Blick
     * ---------------------------------------------------------------- */

    _turm() {
        return APP.bibliothekStand();
    },

    _buchNr() {
        const turm = START._turm();
        const b = START.buchBlick || BIBLIOTHEK.aktuellesBuch(turm);
        return BIBLIOTHEK.offen(turm, b) ? b : BIBLIOTHEK.aktuellesBuch(turm);
    },

    _kapNr(b, lauf) {
        const n = BIBLIOTHEK.anzahlKapitel(b);
        const k = (START.kapBlick === null) ? lauf.kapitel : START.kapBlick;
        return Math.max(0, Math.min(n - 1, k));
    },

    /* Ein Buchstabe als Initiale einer Wort-Station (fest je Station). */
    INITIALEN: "BHKLMNRSTW",

    _initiale(b, nr) {
        return START.INITIALEN[(nr * 7 + b * 3) % START.INITIALEN.length];
    },

    /* Lage einer Stelle im Buch (viewBox 400 × 560; Falz bei 280, keine
       Station zwischen 244 und 316) — aus dem Entwurf. */
    _lage(kap, s, i) {
        const n = kap.length;
        const unten = Math.ceil(n / 2);
        const oben = n - unten;
        const vert = (von, bis, anz, j) => (anz === 1 ? (von + bis) / 2 : von + (bis - von) * j / (anz - 1));
        const y = s < unten ? vert(530, 316, unten, s) : vert(244, 34, oben, s - unten);
        const x = kap[s].length === 1 ? 200 : (i === 0 ? 96 : 304);
        return { x: x, y: y };
    },

    /* Zustände der Stellen eines Kapitels: fertig, jetzt (wartet), wahl
       (Gabelung), moeglich, blass. Schlüssel "s-i". */
    _zustaende(b, k, lauf) {
        const kap = BIBLIOTHEK.kapitel(b, k);
        const z = {};
        const weg = new Set(lauf.weg);
        const front = lauf.jetzt !== null ? [lauf.jetzt] : (lauf.gabel || []);
        const erreichbar = new Set();
        if (!lauf.durch && k === lauf.kapitel) {
            let rand = front.map((nr) => BIBLIOTHEK.station(b, nr)).map((st) => [st.s, st.i]);
            rand.forEach(([s, i]) => erreichbar.add(s + "-" + i));
            while (rand.length) {
                const neu = [];
                rand.forEach(([s, i]) => BIBLIOTHEK.nachfolger(b, k, s, i).forEach((j) => {
                    const id = (s + 1) + "-" + j;
                    if (!erreichbar.has(id)) {
                        erreichbar.add(id);
                        neu.push([s + 1, j]);
                    }
                }));
                rand = neu;
            }
        }
        kap.forEach((spalte, s) => spalte.forEach((art, i) => {
            const id = s + "-" + i;
            if (art === "ein") {
                z[id] = (lauf.durch || k <= lauf.kapitel) ? "fertig" : "moeglich";
                return;
            }
            if (art === "aus") {
                z[id] = (lauf.durch || k < lauf.kapitel) ? "fertig" : (k > lauf.kapitel || erreichbar.has(id) ? "moeglich" : "blass");
                return;
            }
            const st = BIBLIOTHEK.stationAn(b, k, s, i);
            if (weg.has(st.nr)) {
                z[id] = "fertig";
            } else if (lauf.jetzt === st.nr) {
                z[id] = "jetzt";
            } else if (lauf.gabel && lauf.gabel.indexOf(st.nr) !== -1) {
                z[id] = "wahl";
            } else if (!lauf.durch && (k > lauf.kapitel || erreichbar.has(id))) {
                z[id] = "moeglich";
            } else {
                z[id] = "blass";
            }
        }));
        return z;
    },

    /* ---------------------------------------------------------------- *
     * Die Bibliothek auf dem Start
     * ---------------------------------------------------------------- */

    _bibliothekBauen(behaelter) {
        if (START.regalOffen) {
            behaelter.appendChild(START._regalBauen());
            return;
        }
        const turm = START._turm();
        const b = START._buchNr();
        const lauf = BIBLIOTHEK.lauf(turm, b);
        const k = START._kapNr(b, lauf);
        behaelter.appendChild(START._buchKarteBauen(turm, b, lauf, k));
        behaelter.appendChild(START._spielReiheBauen(turm, b, lauf, k));
    },

    _buchKarteBauen(turm, b, lauf, k) {
        const buch = BIBLIOTHEK.buch(b);
        const karte = BAUSTEINE.el("section", "bib-karte bib-stil-" + buch.stil);
        karte.style.setProperty("--th", buch.farbe);

        const kopf = BAUSTEINE.el("div", "bib-kopf");
        kopf.appendChild(BAUSTEINE.el("span", "bib-nr", String(b)));
        kopf.appendChild(BAUSTEINE.el("span", "bib-titel", buch.titel));
        const regal = BAUSTEINE.knopf({ art: "flach", zeichen: "regal", titel: "Bücherregal",
            beiKlick: () => { START.regalOffen = true; NAVIGATION.auffrischen(); } });
        regal.classList.add("bib-regal-knopf");
        kopf.appendChild(regal);
        karte.appendChild(kopf);

        const leiste = BAUSTEINE.el("div", "bib-leiste");
        /* Die Herzen (seit 0.21.0, Konzept §3.7): ab Buch 2, solange das
           Buch nicht durch ist; sonst hält ein leerer Platz die Mitte. */
        if (BIBLIOTHEK.mitHerzen(b) && !lauf.durch) {
            leiste.appendChild(WORDLE_BILDSCHIRM.herzenBauen(APP.durchgang(b).herzen, 0));
        } else {
            leiste.appendChild(BAUSTEINE.el("span", "bib-herzen-platz"));
        }
        const punkte = BAUSTEINE.el("span", "bib-kap-punkte");
        for (let n = 0; n < BIBLIOTHEK.anzahlKapitel(b); n++) {
            const p = BAUSTEINE.knopf({ art: "flach", titel: "Kapitel " + BIBLIOTHEK.ROEM[n],
                beiKlick: () => START._blaettern(n) });
            p.classList.add("bib-kap-punkt");
            if (n === k) {
                p.classList.add("an");
            }
            if (lauf.durch || n < lauf.kapitel) {
                p.classList.add("geschafft");
            }
            if (n === BIBLIOTHEK.anzahlKapitel(b) - 1) {
                p.classList.add("boss");
            }
            punkte.appendChild(p);
        }
        leiste.appendChild(punkte);
        const bossIn = BAUSTEINE.el("span", "bib-boss-in");
        bossIn.appendChild(BAUSTEINE.zeichen(lauf.durch ? "haken" : "siegelband"));
        bossIn.appendChild(BAUSTEINE.el("b", null, lauf.durch ? "" : String(BIBLIOTHEK.bossIn(turm, b))));
        bossIn.setAttribute("aria-label", lauf.durch ? "Buch durch" : "Boss in " + BIBLIOTHEK.bossIn(turm, b) + " Stationen");
        leiste.appendChild(bossIn);
        karte.appendChild(leiste);

        karte.appendChild(START._buchBauen(b, lauf, k));
        return karte;
    },

    _buchBauen(b, lauf, k) {
        const kap = BIBLIOTHEK.kapitel(b, k);
        const z = START._zustaende(b, k, lauf);
        const buchEl = BAUSTEINE.el("div", "buch");
        buchEl.appendChild(BAUSTEINE.el("div", "buch-seite oben"));
        buchEl.appendChild(BAUSTEINE.el("div", "falz"));
        buchEl.appendChild(BAUSTEINE.el("div", "buch-seite unten"));
        buchEl.appendChild(BAUSTEINE.el("span", "kapitel-zahl", BIBLIOTHEK.ROEM[k]));
        const seiteOben = BAUSTEINE.el("span", "seitenzahl seitenzahl-oben", String(k * 2 + 2));
        const seiteUnten = BAUSTEINE.el("span", "seitenzahl seitenzahl-unten", String(k * 2 + 1));
        buchEl.appendChild(seiteOben);
        buchEl.appendChild(seiteUnten);
        if (!lauf.durch && lauf.kapitel === k) {
            buchEl.appendChild(BAUSTEINE.el("span", "lesezeichen"));
        }

        /* Die Wege. */
        const ns = "http://www.w3.org/2000/svg";
        const pfad = document.createElementNS(ns, "svg");
        pfad.setAttribute("class", "pfad");
        pfad.setAttribute("viewBox", "0 0 400 560");
        pfad.setAttribute("preserveAspectRatio", "none");
        pfad.setAttribute("aria-hidden", "true");
        const linien = [];
        kap.forEach((spalte, s) => spalte.forEach((_, i) => BIBLIOTHEK.nachfolger(b, k, s, i).forEach((j) => {
            const a = z[s + "-" + i];
            const c = z[(s + 1) + "-" + j];
            const A = START._lage(kap, s, i);
            const C = START._lage(kap, s + 1, j);
            const art = (a === "fertig" && (c === "fertig" || c === "jetzt")) ? "weg"
                : ((a === "fertig" || a === "jetzt" || a === "wahl" || a === "moeglich")
                    && (c === "jetzt" || c === "wahl" || c === "moeglich")) ? "offen" : "blass";
            const ym = (A.y + C.y) / 2;
            linien.push({ art: art, d: "M" + A.x + " " + A.y + " C" + A.x + " " + ym + " " + C.x + " " + ym + " " + C.x + " " + C.y });
        })));
        const rang = { blass: 0, offen: 1, weg: 2 };
        linien.sort((p, q) => rang[p.art] - rang[q.art]).forEach((l) => {
            const p = document.createElementNS(ns, "path");
            p.setAttribute("class", "pf pf-" + l.art);
            p.setAttribute("d", l.d);
            p.setAttribute("vector-effect", "non-scaling-stroke");
            pfad.appendChild(p);
        });
        buchEl.appendChild(pfad);

        /* Die Stationen. */
        kap.forEach((spalte, s) => spalte.forEach((art, i) => {
            const L = START._lage(kap, s, i);
            const zustand = z[s + "-" + i];
            let el;
            if (art === "ein" || art === "aus") {
                el = BAUSTEINE.el("span", "st st-" + art + " " + zustand);
            } else {
                const st = BIBLIOTHEK.stationAn(b, k, s, i);
                el = START._stationKnopf(b, st, zustand);
            }
            el.style.left = (L.x / 4) + "%";
            el.style.top = (L.y / 5.6) + "%";
            buchEl.appendChild(el);
        }));

        if (START._klapp) {
            buchEl.appendChild(BAUSTEINE.el("div", "umblatt " + START._klapp));
        }

        /* Wischen blättert (waagrecht, wie im Entwurf). */
        let x0 = null;
        buchEl.addEventListener("pointerdown", (e) => { x0 = e.clientX; });
        buchEl.addEventListener("pointerup", (e) => {
            if (x0 === null) {
                return;
            }
            const d = e.clientX - x0;
            x0 = null;
            if (Math.abs(d) > 50) {
                START._blaettern(k + (d < 0 ? 1 : -1));
            }
        });
        return buchEl;
    },

    /* Der Inhalt einer Station (Initiale oder Symbol). */
    _stationInhalt(b, st, ziel) {
        if (st.art === "w") {
            ziel.appendChild(BAUSTEINE.el("span", "ini", START._initiale(b, st.nr)));
        } else {
            ziel.appendChild(BAUSTEINE.zeichen(BIBLIOTHEK.ARTEN[st.art].zeichen));
        }
    },

    _stationKnopf(b, st, zustand) {
        const knopf = BAUSTEINE.knopf({
            art: "flach",
            titel: BIBLIOTHEK.ARTEN[st.art].name,
            beiKlick: () => START.stationBlatt(b, st.nr)
        });
        knopf.classList.add("st", "st-" + st.art, zustand);
        START._stationInhalt(b, st, knopf);
        /* Der Checkpoint (seit 0.21.0; seit 0.21.1 Rast oder Elite):
           Lesezeichen — nur in Büchern mit Herzen. */
        if (BIBLIOTHEK.CHECKPOINT_ARTEN.indexOf(st.art) !== -1 && zustand === "fertig" && BIBLIOTHEK.mitHerzen(b)
                && BIBLIOTHEK.checkpoint(START._turm(), b) === st.nr) {
            const cp = BAUSTEINE.el("span", "st-cp");
            cp.setAttribute("aria-label", "Checkpoint");
            knopf.appendChild(cp);
        }
        if (st.art === "b" && zustand !== "fertig") {
            const schloss = BAUSTEINE.el("span", "st-schloss");
            schloss.appendChild(BAUSTEINE.zeichen("schloss"));
            knopf.appendChild(schloss);
        }
        return knopf;
    },

    /* Was „Spielen" gerade tut. */
    _aktion(turm, b, lauf, k) {
        if (lauf.durch) {
            const naechstes = b + 1;
            if (BIBLIOTHEK.buch(naechstes) && BIBLIOTHEK.offen(turm, naechstes)) {
                return { text: "Buch " + naechstes, zeichen: "weiter",
                    tun: () => { START.buchBlick = naechstes; START.kapBlick = null; NAVIGATION.auffrischen(); } };
            }
            return { text: "Geschafft", zeichen: "haken", aus: true };
        }
        if (lauf.kapitel !== k) {
            return { text: BIBLIOTHEK.ROEM[lauf.kapitel], zeichen: lauf.kapitel > k ? "weiter" : "links",
                tun: () => START._blaettern(lauf.kapitel) };
        }
        if (lauf.gabel) {
            return { text: "Weg wählen", zeichen: "gabel", tun: () => START.gabelBlatt(b, lauf.gabel) };
        }
        const st = BIBLIOTHEK.station(b, lauf.jetzt);
        const text = { w: "Spielen", e: "Elite", b: "Boss", t: "Truhe", h: "Händler", r: "Rast", f: "Fund" }[st.art];
        return { text: text, zeichen: st.art === "w" ? "weiter" : BIBLIOTHEK.ARTEN[st.art].zeichen,
            tun: () => START.stationBlatt(b, st.nr) };
    },

    _spielReiheBauen(turm, b, lauf, k) {
        const reihe = BAUSTEINE.el("div", "bib-spiel-reihe");
        const zurueck = BAUSTEINE.knopf({ art: "still", zeichen: "links", titel: "Kapitel zurück",
            beiKlick: () => START._blaettern(k - 1) });
        zurueck.disabled = k === 0;
        reihe.appendChild(zurueck);
        const aktion = START._aktion(turm, b, lauf, k);
        const spielen = BAUSTEINE.knopf({ text: aktion.text, art: "haupt", zeichen: aktion.zeichen,
            beiKlick: () => aktion.tun && aktion.tun() });
        spielen.classList.add("bib-spielen");
        spielen.disabled = !!aktion.aus;
        reihe.appendChild(spielen);
        const vor = BAUSTEINE.knopf({ art: "still", zeichen: "weiter", titel: "Kapitel vor",
            beiKlick: () => START._blaettern(k + 1) });
        vor.disabled = k >= BIBLIOTHEK.anzahlKapitel(b) - 1;
        reihe.appendChild(vor);
        return reihe;
    },

    /* Umblättern nur zwischen Kapiteln: die Seite klappt über den Falz,
       dahinter liegt das neue Kapitel. */
    _blaettern(ziel) {
        const b = START._buchNr();
        const lauf = BIBLIOTHEK.lauf(START._turm(), b);
        const jetzt = START._kapNr(b, lauf);
        if (ziel < 0 || ziel >= BIBLIOTHEK.anzahlKapitel(b) || ziel === jetzt) {
            return;
        }
        const ruhig = typeof window.matchMedia === "function"
            && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (ruhig) {
            START.kapBlick = ziel;
            NAVIGATION.auffrischen();
            return;
        }
        START._klapp = ziel > jetzt ? "vor" : "zurueck";
        NAVIGATION.auffrischen();
        window.setTimeout(() => {
            START._klapp = "";
            START.kapBlick = ziel;
            NAVIGATION.auffrischen();
        }, 280);
    },

    /* ---------------------------------------------------------------- *
     * Das Blatt von unten
     * ---------------------------------------------------------------- */

    _blattZu() {
        const alt = document.querySelector(".bib-blatt-grund");
        if (alt) {
            alt.remove();
        }
        document.body.classList.remove("dialog-offen");
    },

    /* Ein Blatt mit Kopf (Symbol + Titel); liefert den Inhalt-Behälter. */
    _blatt(kopfInhalt, titel, farbe) {
        START._blattZu();
        const grund = BAUSTEINE.el("div", "bib-blatt-grund");
        if (farbe) {
            grund.style.setProperty("--th", farbe);
        }
        grund.addEventListener("click", (e) => {
            if (e.target === grund) {
                START._blattZu();
            }
        });
        const blatt = BAUSTEINE.el("div", "bib-blatt");
        blatt.setAttribute("role", "dialog");
        blatt.setAttribute("aria-label", titel);
        blatt.appendChild(BAUSTEINE.el("div", "bib-griff"));
        const kopf = BAUSTEINE.el("div", "bib-blatt-kopf");
        if (kopfInhalt) {
            kopf.appendChild(kopfInhalt);
        }
        kopf.appendChild(BAUSTEINE.el("h2", null, titel));
        blatt.appendChild(kopf);
        grund.appendChild(blatt);
        document.body.appendChild(grund);
        document.body.classList.add("dialog-offen");
        return blatt;
    },

    _chips(liste) {
        const reihe = BAUSTEINE.el("div", "bib-chips");
        for (const c of liste) {
            const warn = c.charAt(0) === "!";
            reihe.appendChild(BAUSTEINE.el("span", "bib-chip" + (warn ? " warn" : ""), warn ? c.slice(1) : c));
        }
        return reihe;
    },

    _knopfReihe(blatt, knoepfe) {
        const reihe = BAUSTEINE.el("div", "bib-blatt-knoepfe");
        reihe.appendChild(BAUSTEINE.knopf({ text: "Zurück", art: "still", beiKlick: () => START._blattZu() }));
        knoepfe.forEach((k) => reihe.appendChild(k));
        blatt.appendChild(reihe);
    },

    /* Das Blatt einer Station: was sie ist, was sie bringt, Los. */
    stationBlatt(b, nr) {
        const buch = BIBLIOTHEK.buch(b);
        const st = BIBLIOTHEK.station(b, nr);
        if (!buch || !st) {
            return;
        }
        const turm = START._turm();
        const erledigt = BIBLIOTHEK.erledigt(turm, b, nr);
        const spielbar = BIBLIOTHEK.offen(turm, b) && BIBLIOTHEK.spielbar(turm, b, nr);
        const bild = BAUSTEINE.el("span", "st st-" + st.art + " moeglich bib-blatt-bild");
        START._stationInhalt(b, st, bild);
        let titel = BIBLIOTHEK.ARTEN[st.art].name;
        if (st.art === "e") {
            titel = BIBLIOTHEK.elite(b, nr).name;
        } else if (st.art === "b") {
            titel = buch.boss.name;
        } else if (st.art === "h") {
            titel = "Antiquar";
        }
        const blatt = START._blatt(bild, titel, buch.farbe);
        const knoepfe = [];
        const herzen = BIBLIOTHEK.mitHerzen(b);

        if (BIBLIOTHEK.istKampf(st.art)) {
            /* Seit 0.21.0: was die Station an der Front mitnimmt (Fund,
               Üben) und was ein Scheitern kostet. */
            const mitnahme = spielbar ? APP.bibliothekMitnahme(b, nr) : { effekt: "", ueben: 0 };
            const regeln = WORDLE.regelnNormalisieren(BIBLIOTHEK.rundeRegeln(b, nr, mitnahme));
            const chips = [];
            if (buch.nurNomen) {
                chips.push("Nomen");
            }
            if (st.art === "e") {
                chips.push(BIBLIOTHEK.elite(b, nr).eigen, "+1 Figur");
                if (herzen) {
                    chips.push("Checkpoint", "Herzen voll");
                }
            }
            if (st.art === "b") {
                chips.push(buch.boss.eigen);
            }
            chips.push(regeln.versuche + " Versuche");
            if (regeln.zeit) {
                chips.push(regeln.zeit + " s");
            }
            const fund = BIBLIOTHEK.FUNDE.find((f) => f.id === mitnahme.effekt);
            if (fund) {
                chips.push(fund.gib + " → " + fund.kriegst);
            }
            if (herzen && spielbar) {
                const v = BIBLIOTHEK.VERLUST[st.art];
                chips.push("!−" + v + (v === 1 ? " Herz" : " Herzen"));
            }
            blatt.appendChild(START._chips(chips));
            const fig = BIBLIOTHEK.figurenVon(turm.figuren, b, nr);
            if (fig > 0) {
                const zeile = BAUSTEINE.el("div", "bib-blatt-figuren");
                zeile.appendChild(BAUSTEINE.figuren(fig));
                blatt.appendChild(zeile);
            }
            const los = BAUSTEINE.knopf({ text: fig > 0 ? "Geschafft" : "Los", art: "haupt", zeichen: "weiter",
                beiKlick: () => {
                    START._blattZu();
                    NAVIGATION.zeigen("wordle", { modus: "bibliothek", buch: b, station: nr, neu: true });
                } });
            /* Nur vorwärts (seit 0.21.1, Nutzer: „gegangene wege sollen nicht
               nochmal spielbar gemacht werden"): nur die Front. */
            los.disabled = !spielbar;
            knoepfe.push(los);
        } else if (st.art === "t") {
            /* Nach einem Rückfall (seit 0.21.0) ist die Truhe schon leer. */
            const leer = BIBLIOTHEK.erledigt(APP.bibliothekStand(true), b, nr);
            const muenzen = leer ? 0 : BIBLIOTHEK.truheMuenzen(b, nr);
            const inhalt = BAUSTEINE.el("div", "bib-wahl");
            const fach = BAUSTEINE.el("span", "bib-fach");
            fach.appendChild(BAUSTEINE.zeichen("muenze"));
            fach.appendChild(BAUSTEINE.el("b", null, (leer ? "" : "+") + muenzen));
            inhalt.appendChild(fach);
            blatt.appendChild(inhalt);
            const oeffnen = BAUSTEINE.knopf({ text: erledigt ? "Geöffnet" : (leer ? "Weiter" : "Öffnen"), art: "haupt",
                zeichen: "schatulle",
                beiKlick: () => {
                    if (APP.stationMerken(b, nr, muenzen)) {
                        DIALOG.kurzmeldung("+" + muenzen + " " + UPCREW_MUENZEN.WAEHRUNG.name);
                    }
                    START._blattZu();
                    NAVIGATION.auffrischen();
                } });
            oeffnen.disabled = erledigt || !spielbar;
            knoepfe.push(oeffnen);
        } else if (st.art === "h") {
            const wahl = BAUSTEINE.el("div", "bib-wahl bib-wahl-drei");
            for (const ware of BIBLIOTHEK.WAREN) {
                const w = UPCREW_MUENZEN.WAREN[ware];
                const preis = BIBLIOTHEK.haendlerPreis(w.preis);
                const name = (typeof SHOP_BILDSCHIRM !== "undefined" && typeof UPCREW_SHOP !== "undefined")
                    ? UPCREW_SHOP.text(ware, SHOP_BILDSCHIRM.TEXTE).name : w.name;
                const k = BAUSTEINE.knopf({ art: "flach", titel: name + " kaufen",
                    beiKlick: () => {
                        const r = APP.haendlerKaufen(ware);
                        DIALOG.kurzmeldung(r.ok ? name + " · " + preis + " " + UPCREW_MUENZEN.WAEHRUNG.name
                            : (r.grund === "voll" ? "Vorrat voll" : "Zu wenig " + UPCREW_MUENZEN.WAEHRUNG.name));
                    } });
                k.classList.add("bib-ware");
                k.appendChild(BAUSTEINE.zeichen({ tipp: "gluehbirne", leben: "stern", schild: "schutz" }[ware]));
                k.appendChild(BAUSTEINE.el("span", "bib-ware-name", name));
                const p = BAUSTEINE.el("span", "bib-preis");
                p.appendChild(BAUSTEINE.el("s", null, String(w.preis)));
                p.appendChild(BAUSTEINE.el("b", null, " " + preis));
                k.appendChild(p);
                k.disabled = erledigt || !spielbar;
                wahl.appendChild(k);
            }
            blatt.appendChild(wahl);
            const weiter = BAUSTEINE.knopf({ text: erledigt ? "Besucht" : "Weiter", art: "haupt", zeichen: "weiter",
                beiKlick: () => {
                    APP.stationMerken(b, nr, 0);
                    START._blattZu();
                    NAVIGATION.auffrischen();
                } });
            weiter.disabled = erledigt || !spielbar;
            knoepfe.push(weiter);
        } else if (st.art === "r") {
            knoepfe.push(START._rastBauen(blatt, b, nr, erledigt || !spielbar));
        } else if (st.art === "f") {
            knoepfe.push(START._fundBauen(blatt, b, nr, erledigt || !spielbar));
        }
        if (erledigt && !BIBLIOTHEK.istKampf(st.art)) {
            const hinweis = BAUSTEINE.el("p", "bib-blatt-hinweis");
            hinweis.appendChild(BAUSTEINE.zeichen("haken"));
            blatt.appendChild(hinweis);
        }
        START._knopfReihe(blatt, knoepfe);
    },

    /*
     * RAST (seit 0.21.0, Konzept §3.1): EINE Wahl — Heilen (+2 Herzen, nur
     * ab Buch 2, je Rast und Durchgang einmal) oder Üben (nächste Elite
     * oder Boss +1 Versuch). Die Wahl beendet die Rast; „Weiter" ohne Wahl
     * auch. Die Rast ist der Checkpoint, sobald sie gegangen ist (seit
     * 0.21.1, Chip). Liefert den Weiter-Knopf.
     */
    _rastBauen(blatt, b, nr, zu) {
        const dg = APP.durchgang(b);
        const herzen = BIBLIOTHEK.mitHerzen(b);
        if (herzen) {
            blatt.appendChild(START._chips(["Checkpoint"]));
        }
        const wahl = BAUSTEINE.el("div", "bib-wahl " + (herzen ? "bib-wahl-zwei" : "bib-wahl-eins"));
        const waehlen = (was, meldung) => {
            if (APP.rastWaehlen(b, nr, was)) {
                DIALOG.kurzmeldung(meldung);
                START._blattZu();
                NAVIGATION.auffrischen();
            }
        };
        if (herzen) {
            const heilen = BAUSTEINE.knopf({ art: "flach", titel: "Heilen",
                beiKlick: () => waehlen("heilen", "+" + BIBLIOTHEK.HEILEN + " Herzen") });
            heilen.classList.add("bib-ware", "bib-rast-heilen");
            heilen.appendChild(BAUSTEINE.zeichen("herz"));
            heilen.appendChild(BAUSTEINE.el("span", "bib-ware-name", "+" + BIBLIOTHEK.HEILEN));
            heilen.disabled = zu || !BIBLIOTHEK.rastMoeglich(dg, b, nr, "heilen");
            wahl.appendChild(heilen);
        }
        const ueben = BAUSTEINE.knopf({ art: "flach", titel: "Üben",
            beiKlick: () => waehlen("ueben", "Elite/Boss +" + BIBLIOTHEK.UEBEN_PLUS + " Versuch") });
        ueben.classList.add("bib-ware");
        ueben.appendChild(BAUSTEINE.zeichen("uebung"));
        ueben.appendChild(BAUSTEINE.el("span", "bib-ware-name", "+" + BIBLIOTHEK.UEBEN_PLUS + " Versuch"));
        ueben.appendChild(BAUSTEINE.el("span", "bib-preis", "Elite · Boss"));
        ueben.disabled = zu || !BIBLIOTHEK.rastMoeglich(dg, b, nr, "ueben");
        wahl.appendChild(ueben);
        blatt.appendChild(wahl);
        /* Ohne Wahl weiter (etwa bei vollen Herzen und schon geübt). */
        const weiter = BAUSTEINE.knopf({ text: "Weiter", art: "still",
            beiKlick: () => {
                APP.stationMerken(b, nr, 0);
                START._blattZu();
                NAVIGATION.auffrischen();
            } });
        weiter.disabled = zu;
        return weiter;
    },

    /*
     * FUND (seit 0.21.0, Konzept §3.4): zwei Angebote „gib → kriegst"
     * (fest je Station) und „Nein". Wirkungen für die nächste Kampf-Station
     * stehen danach als Chip auf deren Blatt. Liefert den Nein-Knopf.
     */
    _fundBauen(blatt, b, nr, zu) {
        const dg = APP.durchgang(b);
        const muenzen = (typeof UPCREW_MUENZEN !== "undefined") ? UPCREW_MUENZEN.anzeige(APP.fortschritt()) : 0;
        const wahl = BAUSTEINE.el("div", "bib-wahl bib-tausch");
        for (const f of BIBLIOTHEK.fundAngebote(b, nr)) {
            const k = BAUSTEINE.knopf({ art: "flach", titel: f.gib + " gegen " + f.kriegst,
                beiKlick: () => {
                    if (APP.fundNehmen(b, nr, f.id)) {
                        DIALOG.kurzmeldung(f.kriegst);
                        START._blattZu();
                        NAVIGATION.auffrischen();
                    }
                } });
            k.classList.add("bib-tausch-knopf");
            k.appendChild(BAUSTEINE.el("span", "bib-gib", f.gib));
            k.appendChild(BAUSTEINE.el("span", "bib-pfeil", "→"));
            k.appendChild(BAUSTEINE.el("span", "bib-kriegst", f.kriegst));
            k.disabled = zu || !BIBLIOTHEK.fundMoeglich(dg, b, f.id, muenzen);
            wahl.appendChild(k);
        }
        blatt.appendChild(wahl);
        const nein = BAUSTEINE.knopf({ text: "Nein", art: "still",
            beiKlick: () => {
                APP.fundNehmen(b, nr, "");
                START._blattZu();
                NAVIGATION.auffrischen();
            } });
        nein.disabled = zu;
        return nein;
    },

    /* An der Gabelung: zwei Knöpfe mit der Symbolreihe je Spur bis zum
       Treffpunkt; die Wahl öffnet das Blatt der ersten Station. */
    gabelBlatt(b, gabel) {
        const buch = BIBLIOTHEK.buch(b);
        const bild = BAUSTEINE.el("span", "st moeglich bib-blatt-bild");
        bild.appendChild(BAUSTEINE.zeichen("gabel"));
        const blatt = START._blatt(bild, "Weg wählen", buch.farbe);
        const wahl = BAUSTEINE.el("div", "bib-gabel-wahl");
        gabel.forEach((nr) => {
            const erste = BIBLIOTHEK.station(b, nr);
            const kap = BIBLIOTHEK.kapitel(b, erste.k);
            const knopf = BAUSTEINE.knopf({ art: "flach", titel: erste.i === 0 ? "Linker Weg" : "Rechter Weg",
                beiKlick: () => START.stationBlatt(b, nr) });
            knopf.classList.add("bib-gabel-knopf");
            const spur = BAUSTEINE.el("span", "bib-spur");
            spur.appendChild(BAUSTEINE.zeichen(erste.i === 0 ? "links" : "weiter"));
            knopf.appendChild(spur);
            for (let s = erste.s; s < kap.length && kap[s].length === 2; s++) {
                if (s > erste.s) {
                    knopf.appendChild(BAUSTEINE.el("span", "bib-pfeil", "›"));
                }
                const st = BIBLIOTHEK.stationAn(b, erste.k, s, erste.i);
                const zeichen = BAUSTEINE.el("span", "st st-" + st.art + " moeglich bib-klein");
                START._stationInhalt(b, st, zeichen);
                knopf.appendChild(zeichen);
            }
            wahl.appendChild(knopf);
        });
        blatt.appendChild(wahl);
        START._knopfReihe(blatt, []);
    },

    /* ---------------------------------------------------------------- *
     * Das Regal
     * ---------------------------------------------------------------- */

    _regalBauen() {
        const turm = START._turm();
        const aktuell = START._buchNr();
        const teil = BAUSTEINE.el("section", "bib-regal-teil");
        const kopf = BAUSTEINE.el("div", "bib-regal-kopf");
        kopf.appendChild(BAUSTEINE.knopf({ text: "Aufschlagen", art: "still", zeichen: "buch",
            beiKlick: () => { START.regalOffen = false; NAVIGATION.auffrischen(); } }));
        teil.appendChild(kopf);
        const regal = BAUSTEINE.el("div", "bib-regal");
        const brett = (von, bis) => {
            const reihe = BAUSTEINE.el("div", "bib-brett");
            const buecher = BAUSTEINE.el("div", "bib-brett-buecher");
            for (let b = von; b <= bis; b++) {
                const buch = BIBLIOTHEK.buch(b);
                const offen = BIBLIOTHEK.offen(turm, b);
                const durch = BIBLIOTHEK.durch(turm, b);
                const r = BAUSTEINE.knopf({ art: "flach", titel: buch.titel,
                    beiKlick: () => {
                        if (!offen) {
                            DIALOG.kurzmeldung("Erst Buch " + (b - 1));
                            return;
                        }
                        START.buchBlick = b;
                        START.kapBlick = null;
                        START.regalOffen = false;
                        NAVIGATION.auffrischen();
                    } });
                r.classList.add("bib-ruecken");
                if (b === aktuell) {
                    r.classList.add("jetzt");
                }
                if (!offen) {
                    r.classList.add("zu");
                }
                r.style.setProperty("--b-farbe", buch.farbe);
                r.style.height = (150 + ((b * 37) % 5) * 6) + "px";
                r.appendChild(BAUSTEINE.el("span", "bib-r-nr", String(b)));
                r.appendChild(BAUSTEINE.el("span", "bib-r-titel", buch.titel));
                if (durch || !offen) {
                    const z = BAUSTEINE.el("span", "bib-r-zeichen");
                    z.appendChild(BAUSTEINE.zeichen(durch ? "haken" : "schloss"));
                    r.appendChild(z);
                }
                buecher.appendChild(r);
                if (b === aktuell) {
                    const gegner = BAUSTEINE.knopf({ art: "flach", zeichen: "siegelband", titel: buch.boss.name,
                        beiKlick: () => {
                            const bild = BAUSTEINE.el("span", "st st-b moeglich bib-blatt-bild");
                            bild.appendChild(BAUSTEINE.zeichen("siegelband"));
                            const blatt = START._blatt(bild, buch.boss.name, buch.farbe);
                            blatt.appendChild(START._chips([buch.boss.eigen]));
                            START._knopfReihe(blatt, []);
                        } });
                    gegner.classList.add("bib-gegner-kopf");
                    buecher.appendChild(gegner);
                }
            }
            reihe.appendChild(buecher);
            reihe.appendChild(BAUSTEINE.el("div", "bib-brett-holz"));
            return reihe;
        };
        regal.appendChild(brett(1, 3));
        regal.appendChild(brett(4, 6));
        teil.appendChild(regal);
        return teil;
    }
});
