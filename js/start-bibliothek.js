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

    /*
     * Lage einer Stelle im Buch (viewBox 400 × 560; Falz bei 280).
     * Seit 0.23.4 (Nutzer: „die einzelnen Steps sollen nicht am Rand vom
     * Buch liegen, sondern passend auf den Seiten, nicht außerhalb oder
     * auf der Außenlinie"): gerechnet aus dem INNENRAHMEN der Seite —
     * Seite 4 px vom Buchrand, Innenrahmen 10 px weiter, davon noch 8 px
     * Abstand plus Stationsradius (Boss 8 %, Front 7 %, Station 6 % der
     * Buchbreite). Das Buch hat dafür ein festes Seitenverhältnis 400 : 560
     * (css/stil-bibliothek.css). Bis 0.23.3: unten 530–316, oben 244–34
     * (der Boss lag auf der Aussenlinie). tests/test-bibliothek.js misst
     * es für Buchbreiten 250–700 px.
     */
    LAGE_UNTEN: [516, 344],
    LAGE_OBEN: [216, 68],

    _lage(kap, s, i) {
        const n = kap.length;
        const unten = Math.ceil(n / 2);
        const oben = n - unten;
        const vert = (von, bis, anz, j) => (anz === 1 ? (von + bis) / 2 : von + (bis - von) * j / (anz - 1));
        const y = s < unten ? vert(START.LAGE_UNTEN[0], START.LAGE_UNTEN[1], unten, s)
            : vert(START.LAGE_OBEN[0], START.LAGE_OBEN[1], oben, s - unten);
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

    /*
     * VORSCHAU UND VOLLBILD (seit 0.23.2, Nutzer 28.09.2026 zu 0.23.0 am
     * Handy: „das Buch auf dem Handy passt so nicht"):
     *   - Auf dem Start steht das Buch nur als VORSCHAU: klein, nicht
     *     bedienbar — Buch, Fortschritt (Herzen, Tinte, Boss in n) und die
     *     nächste Station. Antippen (oder „Aufschlagen") öffnet es.
     *   - Das VOLLBILD nutzt den ganzen Bildschirm (Leiste unten weg,
     *     Kerbe oben frei) — die bewusste Ausnahme von „keine Vollbild-
     *     Menüs". Stationen antippen, im Blatt bestätigen, spielen;
     *     Blättern mit Wischen hoch/runter; unten „Verlassen".
     *   - Nach einer Runde, wenn als Nächstes eine Kreuzung wartet, öffnet
     *     sich das Buch von selbst dort und fragt „Wo lang?" (Knopf „Weiter"
     *     am Rundenende, js/bildschirm-wordle.js).
     * `buchOffen` merkt nur die Anzeige; nichts wird gespeichert.
     */
    buchOffen: false,

    _bibliothekBauen(behaelter) {
        const turm = START._turm();
        const b = START._buchNr();
        const lauf = BIBLIOTHEK.lauf(turm, b);
        /* Seit 0.23.4 ohne Knopf „Aufschlagen" (Nutzer: „Aufschlagen soll
           raus als Knopf … man soll bei der Vorschau nichts auswählen
           können, nur die Vollansicht öffnen"): die Vorschau selbst ist
           der eine Knopf. */
        behaelter.appendChild(START._vorschauBauen(turm, b, lauf));
        START._vollbildAuffrischen();
    },

    /* Was als Nächstes wartet — für die Vorschau: { zeichen, text }. */
    naechste(turm, b, lauf) {
        if (lauf.durch) {
            return BIBLIOTHEK.buch(b + 1) && BIBLIOTHEK.offen(turm, b + 1)
                ? { zeichen: "weiter", text: "Buch " + (b + 1) } : { zeichen: "haken", text: "Geschafft" };
        }
        if (lauf.gabel) {
            return { zeichen: "gabel", text: "Wo lang?" };
        }
        const st = BIBLIOTHEK.station(b, lauf.jetzt);
        const name = st.art === "e" ? BIBLIOTHEK.elite(b, st.nr).name
            : (st.art === "b" ? BIBLIOTHEK.buch(b).boss.name : BIBLIOTHEK.ARTEN[st.art].name);
        return { zeichen: st.art === "w" ? "weiter" : BIBLIOTHEK.ARTEN[st.art].zeichen,
            text: BIBLIOTHEK.ROEM[st.k] + " · " + name };
    },

    /*
     * Die Vorschau (seit 0.23.4, Nutzer: „die Vorschau soll nur die halbe
     * Seite anzeigen; die ganzen Infos zur Karte sollen kommen, wenn man
     * drauf klickt"): Nummer und Titel, darunter ein Ausschnitt so hoch wie
     * eine Buchseite um die Stelle, an der man steht — ohne Herzen, Tinte,
     * „Boss in n" und Stations-Text. Ein Knopf; alles andere im Vollbild.
     */
    _vorschauBauen(turm, b, lauf) {
        const buch = BIBLIOTHEK.buch(b);
        const n = START.naechste(turm, b, lauf);
        const knopf = BAUSTEINE.knopf({ art: "flach", titel: buch.titel + " aufschlagen · " + n.text,
            beiKlick: () => START.buchOeffnen() });
        knopf.classList.add("bib-vorschau", "bib-stil-" + buch.stil);
        knopf.style.setProperty("--th", buch.farbe);
        const kopf = BAUSTEINE.el("span", "bib-kopf");
        kopf.appendChild(BAUSTEINE.el("span", "bib-nr", String(b)));
        kopf.appendChild(BAUSTEINE.el("span", "bib-titel", buch.titel));
        knopf.appendChild(kopf);
        const platz = BAUSTEINE.el("span", "bib-buch-platz");
        const halb = BAUSTEINE.el("span", "bib-halb");
        const buchEl = START._buchBauen(b, lauf, lauf.kapitel, true);
        const ab = START.halbAb(b, lauf);
        buchEl.style.top = ab ? "-100%" : "0";
        halb.classList.add(ab ? "schnitt-oben" : "schnitt-unten");
        halb.appendChild(buchEl);
        platz.appendChild(halb);
        knopf.appendChild(platz);
        return knopf;
    },

    /* Wo der Ausschnitt der Vorschau beginnt: 0 (obere Seite) oder 280
       (untere Seite) — immer eine GANZE Seite, die Schnittkante liegt im
       Falz, keine Station wird angeschnitten (Nutzer: „besser
       abschneiden"). Die Seite, auf der man steht (Front, Mitte der
       Gabelung; durch = oben beim Boss). Rein. */
    halbAb(b, lauf) {
        const kap = BIBLIOTHEK.kapitel(b, lauf.kapitel);
        const nrn = lauf.durch ? [] : (lauf.jetzt !== null ? [lauf.jetzt] : (lauf.gabel || []));
        const ys = nrn.map((nr) => BIBLIOTHEK.station(b, nr)).filter((st) => st && st.k === lauf.kapitel)
            .map((st) => START._lage(kap, st.s, st.i).y);
        const y = ys.length ? ys.reduce((a, c) => a + c, 0) / ys.length : (lauf.durch ? 0 : 280);
        return y < 280 ? 0 : 280;
    },

    buchOeffnen() {
        START.buchOffen = true;
        START.kapBlick = null;
        START.regalOffen = false;
        NAVIGATION.auffrischen();
        START._legendeEinmal();
    },

    buchSchliessen() {
        START.buchOffen = false;
        START.regalOffen = false;
        START._blattZu();
        START._vollbildEntfernen();
        NAVIGATION.auffrischen();
    },

    _vollbildEntfernen() {
        const alt = document.querySelector(".bib-vollbild");
        if (alt) {
            alt.remove();
        }
        document.body.classList.remove("buch-offen");
    },

    /* Beim Verlassen des Starts (NAVIGATION): Vollbild zu. */
    buchVerlassen() {
        START.buchOffen = false;
        START.regalOffen = false;
        START._vollbildEntfernen();
    },

    _vollbildAuffrischen() {
        START._vollbildEntfernen();
        if (!START.buchOffen || START.art() !== "bibliothek") {
            return;
        }
        const turm = START._turm();
        const b = START._buchNr();
        const lauf = BIBLIOTHEK.lauf(turm, b);
        const k = START._kapNr(b, lauf);
        const voll = BAUSTEINE.el("div", "bib-vollbild");
        voll.setAttribute("role", "dialog");
        voll.setAttribute("aria-label", BIBLIOTHEK.buch(b).titel);
        if (START.regalOffen) {
            voll.appendChild(START._regalBauen());
            voll.appendChild(START._vollbildReiheBauen(turm, b, null, k));
        } else {
            voll.appendChild(START._buchKarteBauen(turm, b, lauf, k));
            voll.appendChild(START._vollbildReiheBauen(turm, b, lauf, k));
        }
        document.body.appendChild(voll);
        document.body.classList.add("buch-offen");
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
        /* Die Legende (seit 0.23.4): alle Symbole erklärt. */
        const legende = BAUSTEINE.knopf({ art: "flach", text: "?", titel: "Legende",
            beiKlick: () => START.legendeZeigen() });
        legende.classList.add("bib-regal-knopf", "bib-legende-knopf");
        kopf.appendChild(legende);
        kopf.appendChild(regal);
        karte.appendChild(kopf);

        karte.appendChild(START._leisteBauen(turm, b, lauf, k, false));

        /* Seit 0.23.0 in einem Platz, der das Buch so gross macht, wie der
           Bildschirm es zulässt (die Startseite rollt nicht mehr). */
        const platz = BAUSTEINE.el("div", "bib-buch-platz");
        platz.appendChild(START._buchBauen(b, lauf, k));
        karte.appendChild(platz);
        return karte;
    },

    /* Herzen, Tinte, Kapitel-Punkte, „Boss in n" — im Vollbild und (als
       Bild, `vorschau`) in der Vorschau. */
    _leisteBauen(turm, b, lauf, k, vorschau) {
        const leiste = BAUSTEINE.el(vorschau ? "span" : "div", "bib-leiste");
        /* Die Herzen (seit 0.21.0, Konzept §3.7): ab Buch 2, solange das
           Buch nicht durch ist; sonst hält ein leerer Platz die Mitte. */
        /* Seit 0.23.0 daneben die Tinte des Buchs (Tintenfass + Zahl). */
        const vorrat = BAUSTEINE.el("span", "bib-vorrat");
        if (!lauf.durch) {
            if (BIBLIOTHEK.mitHerzen(b)) {
                vorrat.appendChild(WORDLE_BILDSCHIRM.herzenBauen(APP.durchgang(b).herzen, 0));
            }
            const tinte = BAUSTEINE.el("span", "bib-tinte");
            tinte.setAttribute("aria-label", APP.durchgang(b).tinte + " Tinte");
            tinte.appendChild(BAUSTEINE.zeichen("tintenfass"));
            tinte.appendChild(BAUSTEINE.el("b", null, String(APP.durchgang(b).tinte)));
            vorrat.appendChild(tinte);
        }
        leiste.appendChild(vorrat);
        const punkte = BAUSTEINE.el("span", "bib-kap-punkte");
        for (let n = 0; n < BIBLIOTHEK.anzahlKapitel(b); n++) {
            const p = vorschau ? BAUSTEINE.el("span", "knopf bib-kap-punkt")
                : BAUSTEINE.knopf({ art: "flach", titel: "Kapitel " + BIBLIOTHEK.ROEM[n],
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
        return leiste;
    },

    _buchBauen(b, lauf, k, vorschau) {
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
                /* In der Vorschau (seit 0.23.2) nur ein Bild: kein Knopf. */
                el = vorschau ? START._stationBild(b, st, zustand) : START._stationKnopf(b, st, zustand);
            }
            el.style.left = (L.x / 4) + "%";
            el.style.top = (L.y / 5.6) + "%";
            buchEl.appendChild(el);
        }));

        if (START._klapp) {
            buchEl.appendChild(BAUSTEINE.el("div", "umblatt " + START._klapp));
        }

        /*
         * Wischen blättert — seit 0.23.0 HOCH/RUNTER (Nutzer 28.09.2026:
         * „von oben nach unten wischen soll die buchseiten wechseln, nicht
         * von rechts nach links"): nach oben = nächstes Kapitel, nach unten
         * = voriges. Waagrecht gehört das Wischen wieder dem Tab-Wechsel
         * (gemeinsamer Baustein upcrew-wischen; `.buch` steht deshalb nicht
         * mehr in NAVIGATION.WISCHEN_SPERREN). `BUCH_WISCH` rechnet es.
         */
        if (vorschau) {
            return buchEl;
        }
        let start = null;
        buchEl.addEventListener("pointerdown", (e) => { start = { x: e.clientX, y: e.clientY }; });
        buchEl.addEventListener("pointercancel", () => { start = null; });
        buchEl.addEventListener("pointerup", (e) => {
            if (start === null) {
                return;
            }
            const schritt = START.buchWisch(e.clientX - start.x, e.clientY - start.y);
            start = null;
            if (schritt !== 0) {
                START._blaettern(k + schritt);
            }
        });
        return buchEl;
    },

    /* Ein Wisch im Buch: +1 (nach oben, nächstes Kapitel), -1 (nach unten),
       0 (zu kurz oder eher waagrecht — dann ist es ein Tab-Wisch). Rein. */
    BUCH_WISCH_PX: 50,

    buchWisch(dx, dy) {
        if (Math.abs(dy) < START.BUCH_WISCH_PX || Math.abs(dy) <= Math.abs(dx)) {
            return 0;
        }
        return dy < 0 ? 1 : -1;
    },

    /* Der Inhalt einer Station (Initiale oder Symbol). */
    _stationInhalt(b, st, ziel) {
        if (st.art === "w") {
            ziel.appendChild(BAUSTEINE.el("span", "ini", START._initiale(b, st.nr)));
        } else {
            ziel.appendChild(BAUSTEINE.zeichen(BIBLIOTHEK.ARTEN[st.art].zeichen));
        }
    },

    /* Die Station als Bild (Vorschau auf dem Start, seit 0.23.2). */
    _stationBild(b, st, zustand) {
        const el = BAUSTEINE.el("span", "st st-" + st.art + " " + zustand);
        START._stationInhalt(b, st, el);
        return el;
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
        /* Seit 0.23.4: die Besonderheit kurz am Gegner (nicht gegangen). */
        if ((st.art === "e" || st.art === "b") && zustand !== "fertig" && zustand !== "blass") {
            const kurz = START._gegnerKurz(b, st.nr);
            /* Neben der Station zur Buchmitte hin (Elite auf einer Spur; nach
               aussen läge der Chip auf dem Seitenrand), der Boss oben in der
               Mitte links neben sich (darunter wartet die Rast, rechts unten
               das Schloss) — nie über eine andere Station. */
            const spalte = BIBLIOTHEK.kapitel(b, st.k)[st.s];
            const seite = spalte.length === 2 ? (st.i === 0 ? " rechts" : " links") : " links";
            if (kurz) {
                knopf.appendChild(BAUSTEINE.el("span", "st-eigen" + seite, kurz));
            }
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

    /* Unten im Vollbild (seit 0.23.2): „Verlassen" zurück zur Vorschau,
       daneben die Hauptaktion. Die Pfeile ‹ › neben „Spielen" sind weg —
       geblättert wird mit Wischen hoch/runter oder über die Kapitel-Punkte. */
    _vollbildReiheBauen(turm, b, lauf, k) {
        const reihe = BAUSTEINE.el("div", "bib-spiel-reihe");
        reihe.appendChild(BAUSTEINE.knopf({ text: "Verlassen", art: "still", zeichen: "links",
            beiKlick: () => START.buchSchliessen() }));
        if (lauf) {
            const aktion = START._aktion(turm, b, lauf, k);
            const spielen = BAUSTEINE.knopf({ text: aktion.text, art: "haupt", zeichen: aktion.zeichen,
                beiKlick: () => aktion.tun && aktion.tun() });
            spielen.classList.add("bib-spielen");
            spielen.disabled = !!aktion.aus;
            reihe.appendChild(spielen);
        }
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
            /* Die Besonderheit des Gegners (seit 0.23.4) steht als eigene
               Reihe mit „i" darüber (START.gegnerChips). */
            if (st.art === "e" || st.art === "b") {
                blatt.appendChild(START.gegnerChips(b, nr));
            }
            if (st.art === "e") {
                chips.push("+1 Figur");
                if (herzen) {
                    chips.push("Checkpoint", "Herzen voll");
                }
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
        const wahl = BAUSTEINE.el("div", "bib-wahl " + (herzen ? "bib-wahl-drei" : "bib-wahl-zwei"));
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
        /* Tinte +1 (seit 0.23.0, Nutzer „Tinte A", höchstens 3). */
        const tinte = BAUSTEINE.knopf({ art: "flach", titel: "Tinte",
            beiKlick: () => waehlen("tinte", "+1 Tinte") });
        tinte.classList.add("bib-ware");
        tinte.appendChild(BAUSTEINE.zeichen("tintenfass"));
        tinte.appendChild(BAUSTEINE.el("span", "bib-ware-name", "+1 Tinte"));
        tinte.appendChild(BAUSTEINE.el("span", "bib-preis", dg.tinte + " / " + BIBLIOTHEK.TINTE_MAX));
        tinte.disabled = zu || !BIBLIOTHEK.rastMoeglich(dg, b, nr, "tinte");
        wahl.appendChild(tinte);
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
        const erledigt = BIBLIOTHEK.erledigt(START._turm(), b, nr);
        for (const f of BIBLIOTHEK.fundAngebote(b, nr)) {
            /* Seit 0.23.4 (Nutzer: „Funde besser erklären"): je Angebot
               Zeilen „Du gibst · Du bekommst · Wann" bzw. Wirkung aufs
               nächste Wort bzw. Einsatz · Wenn · Gewinn — und gesperrt,
               warum. */
            const erklaerung = BIBLIOTHEK.fundErklaerung(f.id);
            const zeilen = erklaerung ? erklaerung.zeilen : [{ was: "Du gibst", wert: f.gib, ton: "gib" },
                { was: "Du bekommst", wert: f.kriegst, ton: "kriegst" }];
            const grund = erledigt ? "" : (zu ? "Noch nicht dran" : BIBLIOTHEK.fundGrund(dg, b, f.id, muenzen));
            const k = BAUSTEINE.knopf({ art: "flach", titel: zeilen.map((z) => z.was + " " + z.wert).join(", "),
                beiKlick: () => {
                    if (APP.fundNehmen(b, nr, f.id)) {
                        DIALOG.kurzmeldung(f.kriegst);
                        START._blattZu();
                        NAVIGATION.auffrischen();
                    }
                } });
            k.classList.add("bib-tausch-knopf");
            if (erklaerung && erklaerung.wette) {
                k.classList.add("bib-wette");
            }
            for (const z of zeilen) {
                const zeile = BAUSTEINE.el("span", "bib-tausch-zeile ton-" + z.ton);
                zeile.appendChild(BAUSTEINE.el("span", "bib-tausch-was", z.was));
                zeile.appendChild(BAUSTEINE.el("b", "bib-tausch-wert", z.wert));
                k.appendChild(zeile);
            }
            if (grund) {
                k.appendChild(BAUSTEINE.el("span", "bib-tausch-grund", grund));
            }
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

    /* ---------------------------------------------------------------- *
     * BESSER ERKLÄREN (seit 0.23.4, Nutzer 28.09.2026: „die Besonderheit
     * des Gegners muss hinter das i kommen oder ersichtlich sein, was
     * passiert · eine Legende muss her"). Texte: js/bibliothek.js
     * (`gegner`, `besonderheiten`, `LEGENDE`).
     * ---------------------------------------------------------------- */

    /* Die Besonderheit als Chips + „i" (Blatt, Regal; die Runde baut ihre
       eigene Reihe mit denselben Texten). */
    gegnerChips(b, nr) {
        const g = BIBLIOTHEK.gegner(b, nr);
        const reihe = BAUSTEINE.el("div", "bib-chips bib-gegner-chips");
        if (!g) {
            return reihe;
        }
        for (const x of g.besonderheiten) {
            reihe.appendChild(BAUSTEINE.el("span", "bib-chip gegner", x.chip));
        }
        const info = BAUSTEINE.knopf({ art: "flach", zeichen: "info", titel: "Besonderheit erklärt",
            beiKlick: () => START.gegnerErklaeren(b, nr) });
        info.classList.add("bib-info");
        reihe.appendChild(info);
        return reihe;
    },

    /* Der Inhalt der Erklärung: je Besonderheit Chip + Was · Gesperrt ·
       So geht's; darunter, was ein Sieg bringt und ein Scheitern kostet. */
    gegnerErklaerungBauen(b, nr) {
        const g = BIBLIOTHEK.gegner(b, nr);
        const inhalt = BAUSTEINE.el("div", "bib-erklaerung");
        if (!g) {
            return inhalt;
        }
        for (const x of g.besonderheiten) {
            const teil = BAUSTEINE.el("div", "bib-erkl-teil");
            teil.appendChild(BAUSTEINE.el("span", "bib-chip gegner", x.chip));
            const zeilen = [["Was", x.was], ["Gesperrt", x.gesperrt], ["So geht's", x.wie]];
            for (const [was, wert] of zeilen) {
                if (!wert) {
                    continue;
                }
                const zeile = BAUSTEINE.el("div", "bib-erkl-zeile");
                zeile.appendChild(BAUSTEINE.el("span", "bib-tausch-was", was));
                zeile.appendChild(BAUSTEINE.el("b", null, wert));
                teil.appendChild(zeile);
            }
            inhalt.appendChild(teil);
        }
        const bilanz = [];
        if (g.art === "e") {
            bilanz.push("+1 Figur");
            if (BIBLIOTHEK.mitHerzen(b)) {
                bilanz.push("Checkpoint", "Herzen voll");
            }
        } else {
            bilanz.push("Buch geschafft");
        }
        if (BIBLIOTHEK.mitHerzen(b)) {
            const v = BIBLIOTHEK.VERLUST[g.art];
            bilanz.push("!Verloren: −" + v + (v === 1 ? " Herz" : " Herzen"));
        }
        const fuss = START._chips(bilanz);
        fuss.classList.add("bib-erkl-fuss");
        inhalt.appendChild(fuss);
        return inhalt;
    },

    /* Als Hinweis-Fenster (über Blatt, Vollbild und Runde). Liegt ein Blatt
       darunter, bleibt es „offen" (Wischen gesperrt). */
    gegnerErklaeren(b, nr) {
        const g = BIBLIOTHEK.gegner(b, nr);
        if (!g || typeof DIALOG === "undefined") {
            return;
        }
        const zu = DIALOG.hinweis(g.name, "", START.gegnerErklaerungBauen(b, nr));
        START._blattWiederOffen(zu);
    },

    _blattWiederOffen(zu) {
        if (zu && typeof zu.then === "function") {
            zu.then(() => {
                if (document.querySelector(".bib-blatt-grund")) {
                    document.body.classList.add("dialog-offen");
                }
            });
        }
    },

    /* Kurz am Gegner im Buch: die erste Besonderheit, bei mehr „+n". */
    _gegnerKurz(b, nr) {
        const g = BIBLIOTHEK.gegner(b, nr);
        if (!g || !g.besonderheiten.length) {
            return "";
        }
        const mehr = g.besonderheiten.length - 1;
        return g.besonderheiten[0].kurz + (mehr > 0 ? " +" + mehr : "");
    },

    /* DIE LEGENDE: alle Stations-Symbole, wie sie im Buch aussehen. */
    LEGENDE_SCHLUESSEL: "typoluck.legende-gesehen",

    legendeBauen() {
        const liste = BAUSTEINE.el("div", "bib-legende");
        const buch = BIBLIOTHEK.buch(START._buchNr());
        if (buch) {
            liste.style.setProperty("--th", buch.farbe);
        }
        for (const l of BIBLIOTHEK.LEGENDE) {
            const zeile = BAUSTEINE.el("div", "bib-legende-zeile");
            const bild = BAUSTEINE.el("span", "st st-" + l.art + " " + l.zustand + " bib-legende-st");
            if (l.art === "w") {
                bild.appendChild(BAUSTEINE.el("span", "ini", "W"));
            } else {
                bild.appendChild(BAUSTEINE.zeichen(BIBLIOTHEK.ARTEN[l.art].zeichen));
            }
            if (l.cp) {
                bild.appendChild(BAUSTEINE.el("span", "st-cp"));
            }
            if (l.schloss) {
                const schloss = BAUSTEINE.el("span", "st-schloss");
                schloss.appendChild(BAUSTEINE.zeichen("schloss"));
                bild.appendChild(schloss);
            }
            zeile.appendChild(bild);
            const text = BAUSTEINE.el("span", "bib-legende-text");
            text.appendChild(BAUSTEINE.el("b", null, l.name));
            text.appendChild(BAUSTEINE.el("span", null, l.text));
            zeile.appendChild(text);
            liste.appendChild(zeile);
        }
        return liste;
    },

    legendeZeigen() {
        if (typeof DIALOG === "undefined") {
            return;
        }
        START._blattWiederOffen(DIALOG.hinweis("Legende", "", START.legendeBauen()));
    },

    /* Beim ersten Aufschlagen eines Buchs einmal von selbst (Gerät). */
    _legendeEinmal() {
        let gesehen = false;
        try {
            gesehen = window.localStorage.getItem(START.LEGENDE_SCHLUESSEL) === "1";
            window.localStorage.setItem(START.LEGENDE_SCHLUESSEL, "1");
        } catch (fehler) {
            gesehen = true;
        }
        if (!gesehen) {
            START.legendeZeigen();
        }
    },

    /* An der Gabelung: zwei Knöpfe mit der Symbolreihe je Spur bis zum
       Treffpunkt; die Wahl öffnet das Blatt der ersten Station. */
    gabelBlatt(b, gabel, titel) {
        const buch = BIBLIOTHEK.buch(b);
        const bild = BAUSTEINE.el("span", "st moeglich bib-blatt-bild");
        bild.appendChild(BAUSTEINE.zeichen("gabel"));
        const blatt = START._blatt(bild, titel || "Weg wählen", buch.farbe);
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
                            const boss = BIBLIOTHEK.stationen(b).find((st) => st.art === "b");
                            blatt.appendChild(START.gegnerChips(b, boss.nr));
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
