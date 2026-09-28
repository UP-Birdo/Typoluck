/*
 * start-bibliothek.js — die Bibliothek auf dem Startbildschirm (seit
 * 0.18.0). Typolucks Fassung von Blunderlucks js\start-turm.js (Vorlage
 * dort; Entwurf Design\3D-Schrift\entwuerfe\Herausforderungen\, `weg`).
 *
 * ERGÄNZT das Objekt START (Object.assign) und lädt deshalb NACH
 * js/bildschirm-start.js. Die Regeln stehen in js/bibliothek.js, der Stand
 * im Fortschritt (FORTSCHRITT.turmFiguren) — hier wird nur gezeichnet und
 * gestartet. Jeder Knopf entsteht in BAUSTEINE.knopf (Haus-Regel), jedes
 * Zeichen in BAUSTEINE.zeichen.
 *
 * WAS DER START IN DER BIBLIOTHEK ZEIGT (wie der Blunderluck-Turm, Nutzer
 * 27.09.2026: „mir reichen die Punkte vom Anfang"): den WEG durch das
 * aktuelle Buch — ein Punkt je Level im Zickzack von unten nach oben, oben
 * der Buchdeckel (offen, wenn der Boss gelöst ist), unter jedem Punkt die
 * Figuren. Rechts ▲▼ zum Blättern durch die Bücher, „Zu dir" springt
 * zurück. Der Boss-Punkt ist grösser und rot. Antippen eines Levels (oder
 * „Spielen") zeigt erst die VORSTELLUNG (Buch, Level oder BOSS, Bereich),
 * „Los" startet die Runde (js/bildschirm-wordle.js, Modus „bibliothek").
 *
 * DIE ART (Bibliothek · Frei) wählt man am Quadrat rechts neben „Spielen";
 * es zeigt das Zeichen der Art und klappt die Wahl nach oben auf (wie
 * Blunderluck; kein Band oben). Frei = der Start wie bis 0.17 (Tageswort
 * und Übung). Die letzte Wahl merkt sich das Gerät; ohne Wahl die
 * Bibliothek (Entwurf: „Start-Tab = Turm").
 */

Object.assign(START, {

    ART_SCHLUESSEL: "typoluck.start-art",
    GESEHEN_SCHLUESSEL: "typoluck.bibliothek-gesehen",

    ARTEN: [
        { id: "bibliothek", name: "Bibliothek", zeichen: "bibliothek" },
        { id: "frei", name: "Frei", zeichen: "frei" }
    ],

    /* Anzeige-Gedächtnis: Art-Wahl offen? Welches Buch wird angesehen
       (0 = das eigene)? In welche Richtung wurde zuletzt geblättert? */
    artMenueOffen: false,
    buchBlick: 0,
    _buchRichtung: 0,
    _artHorcherAktiv: false,

    art() {
        try {
            const wert = window.localStorage.getItem(START.ART_SCHLUESSEL);
            if (START.ARTEN.some((eintrag) => eintrag.id === wert)) {
                return wert;
            }
        } catch (fehler) {
            /* ohne Gerätespeicher: die Vorgabe */
        }
        return "bibliothek";
    },

    artSetzen(id) {
        try {
            window.localStorage.setItem(START.ART_SCHLUESSEL, id);
        } catch (fehler) {
            /* dann gilt die Wahl bis zum Neuladen nicht — hinnehmbar */
        }
        START.artMenueOffen = false;
        START.buchBlick = 0;
        NAVIGATION.auffrischen();
    },

    /* ---------------------------------------------------------------- *
     * Das Quadrat neben „Spielen": die Wahl der Art
     * ---------------------------------------------------------------- */

    _artKnopfBauen() {
        const halter = BAUSTEINE.el("div", "start-art-halter");
        halter.dataset.startArt = "1";
        const art = START.ARTEN.find((a) => a.id === START.art()) || START.ARTEN[0];
        const knopf = BAUSTEINE.knopf({
            art: "still", zeichen: art.zeichen, titel: "Art wählen · " + art.name,
            beiKlick: () => {
                START.artMenueOffen = !START.artMenueOffen;
                NAVIGATION.auffrischen();
            }
        });
        knopf.classList.add("start-art-knopf");
        knopf.setAttribute("aria-haspopup", "true");
        knopf.setAttribute("aria-expanded", START.artMenueOffen ? "true" : "false");
        knopf.appendChild(BAUSTEINE.zeichen("auf"));
        halter.appendChild(knopf);

        if (START.artMenueOffen) {
            const menue = BAUSTEINE.el("div", "start-art-menue");
            menue.setAttribute("role", "menu");
            for (const eintrag of START.ARTEN) {
                const punkt = BAUSTEINE.knopf({
                    art: "menue", zeichen: eintrag.zeichen, text: eintrag.name,
                    beiKlick: () => START.artSetzen(eintrag.id)
                });
                punkt.setAttribute("role", "menuitemradio");
                punkt.setAttribute("aria-checked", eintrag.id === art.id ? "true" : "false");
                if (eintrag.id === art.id) {
                    const haken = BAUSTEINE.zeichen("haken");
                    haken.classList.add("start-art-haken");
                    punkt.appendChild(haken);
                }
                menue.appendChild(punkt);
            }
            halter.appendChild(menue);
            START._artHorcherAnmelden();
        }
        return halter;
    },

    /* Ein Tipp daneben klappt die Wahl zu (wie Blunderluck). */
    _artHorcherAnmelden() {
        if (START._artHorcherAktiv || typeof document === "undefined") {
            return;
        }
        START._artHorcherAktiv = true;
        const horcher = (ereignis) => {
            const ziel = ereignis.target;
            if (ziel && typeof ziel.closest === "function" && ziel.closest("[data-start-art]")) {
                return;
            }
            document.removeEventListener("click", horcher, true);
            START._artHorcherAktiv = false;
            if (START.artMenueOffen) {
                START.artMenueOffen = false;
                NAVIGATION.auffrischen();
            }
        };
        document.addEventListener("click", horcher, true);
    },

    /* ---------------------------------------------------------------- *
     * Der Weg durch ein Buch
     * ---------------------------------------------------------------- */

    /* Die Lage der Punkte (in Prozent der Weg-Fläche), Level 1 unten. */
    WEG_X: [28, 56, 76, 60, 32, 50, 74, 46],

    _wegY(i, n) {
        return 94 - i * (66 / Math.max(1, n - 1));
    },

    /* Der Stand: Figuren-Tabelle und erreichtes Buch. */
    _bibliothekStand() {
        const figuren = FORTSCHRITT.turmFiguren(APP.fortschritt());
        return { figuren: figuren, buch: BIBLIOTHEK.erreicht(figuren) };
    },

    _bibliothekKarteBauen() {
        const stand = START._bibliothekStand();
        const anzahl = BIBLIOTHEK.anzahlBuecher();
        const eigener = Math.min(stand.buch, anzahl);
        const nr = Math.min(Math.max(START.buchBlick || eigener, 1), anzahl);
        const zustand = (nr < stand.buch) ? "fertig" : (nr === stand.buch ? "jetzt" : "zu");

        const karte = BAUSTEINE.el("section", "bib-karte bib-buch-" + nr + " bib-" + zustand
            + (START._buchRichtung > 0 ? " bib-rein-oben" : (START._buchRichtung < 0 ? " bib-rein-unten" : "")));
        START._buchRichtung = 0;

        const kopf = BAUSTEINE.el("div", "bib-kopf");
        const name = BAUSTEINE.el("span", "bib-name");
        name.appendChild(BAUSTEINE.el("span", "bib-nr", String(nr)));
        const titel = BAUSTEINE.el("span", "bib-titel");
        titel.appendChild(BAUSTEINE.el("span", "bib-titel-klein", BIBLIOTHEK.NAME));
        titel.appendChild(BAUSTEINE.el("b", null, "Buch " + nr));
        name.appendChild(titel);
        kopf.appendChild(name);
        const summe = BIBLIOTHEK.summe(stand.figuren, nr);
        const zahl = BAUSTEINE.el("span", "bib-summe");
        zahl.appendChild(BAUSTEINE.zeichen("koenig"));
        zahl.appendChild(BAUSTEINE.el("span", null, summe.hat + "/" + summe.alle));
        kopf.appendChild(zahl);
        karte.appendChild(kopf);

        karte.appendChild(START._wegBauen(nr, stand, zustand));
        karte.appendChild(START._blaetternBauen(nr, eigener, anzahl));

        if (nr !== eigener) {
            const zuDir = BAUSTEINE.knopf({
                text: "Zu dir", art: "still", klein: true,
                beiKlick: () => START._buchBlaettern(0, nr > eigener ? -1 : 1)
            });
            zuDir.classList.add("bib-zu-dir");
            karte.appendChild(zuDir);
        }
        return karte;
    },

    _wegBauen(nr, stand, zustand) {
        const n = BIBLIOTHEK.anzahlLevel(nr);
        const weg = BAUSTEINE.el("div", "bib-weg");

        const naechstes = (zustand === "jetzt") ? BIBLIOTHEK.naechstes(stand.figuren, nr) : -1;
        const durch = BIBLIOTHEK.durch(stand.figuren, nr);
        const punkte = [];
        for (let i = 0; i < n; i++) {
            punkte.push(START.WEG_X[i % START.WEG_X.length] + "," + START._wegY(i, n).toFixed(1));
        }
        punkte.push("50,7");
        let bis = 0;
        if (zustand === "fertig" || durch) {
            bis = n + 1;
        } else if (zustand === "jetzt") {
            bis = (naechstes === -1) ? n : naechstes + 1;
        }
        const ns = "http://www.w3.org/2000/svg";
        const linien = document.createElementNS(ns, "svg");
        linien.setAttribute("class", "bib-linien");
        linien.setAttribute("viewBox", "0 0 100 100");
        linien.setAttribute("preserveAspectRatio", "none");
        linien.setAttribute("aria-hidden", "true");
        const grau = document.createElementNS(ns, "polyline");
        grau.setAttribute("class", "bib-linie");
        grau.setAttribute("points", punkte.join(" "));
        linien.appendChild(grau);
        if (bis > 1) {
            const farbig = document.createElementNS(ns, "polyline");
            farbig.setAttribute("class", "bib-linie bib-linie-fertig");
            farbig.setAttribute("points", punkte.slice(0, bis).join(" "));
            linien.appendChild(farbig);
        }
        weg.appendChild(linien);

        for (let i = 0; i < n; i++) {
            weg.appendChild(START._punktBauen(nr, i, n, stand, zustand, naechstes));
        }

        /* Oben der Buchdeckel: offen, wenn der Boss gelöst ist. */
        const deckel = BAUSTEINE.knopf({
            art: "flach", titel: durch ? "Buch durch · nächstes Buch" : "Buch · erst den Boss lösen",
            beiKlick: () => {
                if (durch && nr < BIBLIOTHEK.anzahlBuecher()) {
                    START._buchBlaettern(nr + 1, 1);
                } else {
                    DIALOG.kurzmeldung(durch ? "Letztes Buch" : "Erst den Boss lösen");
                }
            }
        });
        deckel.classList.add("bib-punkt", "bib-deckel");
        if (durch) {
            deckel.classList.add("offen");
        }
        deckel.style.left = "50%";
        deckel.style.top = "7%";
        const kreis = BAUSTEINE.el("span", "bib-kreis");
        kreis.appendChild(BAUSTEINE.zeichen(durch ? "buchOffen" : "schloss"));
        deckel.appendChild(kreis);
        weg.appendChild(deckel);

        if (zustand === "zu") {
            const schloss = BAUSTEINE.el("div", "bib-schloss");
            schloss.appendChild(BAUSTEINE.zeichen("schloss"));
            schloss.appendChild(BAUSTEINE.el("span", null, "Erst Buch " + (nr - 1)));
            weg.appendChild(schloss);
        }
        return weg;
    },

    _punktBauen(nr, i, n, stand, zustand, naechstes) {
        const figuren = BIBLIOTHEK.figurenVon(stand.figuren, nr, i);
        const boss = BIBLIOTHEK.istBoss(nr, i);
        const offen = BIBLIOTHEK.offen(stand.figuren, nr, i);
        const art = (i === naechstes) ? "jetzt" : (figuren > 0 ? "fertig" : (offen ? "offen" : "zu"));

        const punkt = BAUSTEINE.knopf({
            art: "flach",
            titel: (boss ? "Boss" : "Level " + (i + 1)) + " · " + figuren + " von 3 Figuren"
                + (offen ? "" : " · gesperrt"),
            beiKlick: () => {
                if (offen && zustand !== "zu") {
                    START.vorstellungZeigen(nr, i);
                } else {
                    DIALOG.kurzmeldung(boss ? "Erst alle Level davor" : "Erst das Level davor");
                }
            }
        });
        punkt.classList.add("bib-punkt", "bib-punkt-" + art);
        if (boss) {
            punkt.classList.add("bib-boss");
        }
        punkt.style.left = START.WEG_X[i % START.WEG_X.length] + "%";
        punkt.style.top = START._wegY(i, n).toFixed(1) + "%";

        const kreis = BAUSTEINE.el("span", "bib-kreis");
        if (art === "jetzt" && !boss) {
            kreis.appendChild(BAUSTEINE.zeichen("buch"));
        } else if (boss) {
            kreis.appendChild(BAUSTEINE.zeichen("boss"));
        } else if (art === "zu") {
            kreis.appendChild(BAUSTEINE.zeichen("schloss"));
        } else {
            kreis.textContent = String(i + 1);
        }
        punkt.appendChild(kreis);
        if (art !== "jetzt") {
            punkt.appendChild(BAUSTEINE.figuren(figuren, true));
        }
        return punkt;
    },

    /* ▲▼ und ein Punkt je Buch — oben das höchste, das eigene markiert. */
    _blaetternBauen(nr, eigener, anzahl) {
        const leiste = BAUSTEINE.el("div", "bib-blaettern");
        const hoch = BAUSTEINE.knopf({ art: "flach", zeichen: "auf", titel: "Buch darüber",
            beiKlick: () => START._buchBlaettern(nr + 1, 1) });
        hoch.classList.add("bib-bl");
        hoch.disabled = nr >= anzahl;
        leiste.appendChild(hoch);
        const punkte = BAUSTEINE.el("span", "bib-bl-punkte");
        for (let b = anzahl; b >= 1; b--) {
            punkte.appendChild(BAUSTEINE.el("i", (b === nr ? "da" : "") + (b === eigener ? " du" : "")));
        }
        leiste.appendChild(punkte);
        const runter = BAUSTEINE.knopf({ art: "flach", zeichen: "ab", titel: "Buch darunter",
            beiKlick: () => START._buchBlaettern(nr - 1, -1) });
        runter.classList.add("bib-bl");
        runter.disabled = nr <= 1;
        leiste.appendChild(runter);
        return leiste;
    },

    _buchBlaettern(nr, richtung) {
        START.buchBlick = nr;
        START._buchRichtung = richtung;
        NAVIGATION.auffrischen();
    },

    /* ---------------------------------------------------------------- *
     * „Spielen" in der Bibliothek
     * ---------------------------------------------------------------- */

    /* Die Zeile unter dem Weg: Spielen (nächstes Level) und das Quadrat. */
    _bibliothekSpielenBauen() {
        const ziel = BIBLIOTHEK.ziel(START._bibliothekStand().figuren);
        const zeile = BAUSTEINE.el("div", "start-spielen-zeile");
        const spielen = BAUSTEINE.knopf({
            text: "Spielen", art: "haupt",
            beiKlick: () => START.vorstellungZeigen(ziel.buch, ziel.level)
        });
        spielen.classList.add("start-spielen");
        spielen.appendChild(BAUSTEINE.el("small", "start-spielen-unter",
            BIBLIOTHEK.titel(ziel.buch, ziel.level)));
        zeile.appendChild(spielen);
        zeile.appendChild(START._artKnopfBauen());
        return zeile;
    },

    /*
     * DIE VORSTELLUNG (wie Blunderlucks „VS", Entwurf `gegnerIntro`): oben
     * Buch und Level — beim Boss dunkelrot mit „BOSS" und kurzem Beben —,
     * der feste Bereich der Schwierigkeit (und „nur Nomen" in Buch 1),
     * unten die eigenen Figuren dieses Levels, „Zurück" und „Los". Das Wort
     * selbst kennt erst die Runde.
     */
    vorstellungZeigen(nr, level) {
        if (typeof document === "undefined" || !document.body) {
            return;
        }
        const alt = document.querySelector(".bib-vs");
        if (alt) {
            alt.remove();
        }
        const boss = BIBLIOTHEK.istBoss(nr, level);
        const bereich = BIBLIOTHEK.bereich(nr, level);
        const buch = BIBLIOTHEK.buch(nr);
        const vs = BAUSTEINE.el("div", "bib-vs bib-buch-" + nr + (boss ? " bib-vs-boss" : ""));
        vs.setAttribute("role", "dialog");
        vs.setAttribute("aria-label", BIBLIOTHEK.titel(nr, level));

        const oben = BAUSTEINE.el("div", "bib-vs-oben");
        oben.appendChild(BAUSTEINE.el("span", "bib-vs-lage", BIBLIOTHEK.NAME + " · Buch " + nr));
        if (boss) {
            oben.appendChild(BAUSTEINE.el("span", "bib-vs-bosswort", "BOSS"));
        }
        const bild = BAUSTEINE.el("span", "bib-vs-bild");
        bild.appendChild(BAUSTEINE.zeichen(boss ? "boss" : "buch"));
        oben.appendChild(bild);
        oben.appendChild(BAUSTEINE.el("b", "bib-vs-name",
            "Level " + (level + 1) + "/" + BIBLIOTHEK.anzahlLevel(nr)));
        const eigen = BAUSTEINE.el("span", "bib-vs-eigen", "Schwierigkeit " + bereich.von + "–" + bereich.bis
            + (buch.nurNomen ? " · nur Nomen" : ""));
        oben.appendChild(eigen);
        /* Die Versuche (seit 0.18.1): beim Boss ab Buch 4 hervorgehoben. */
        const versuche = BIBLIOTHEK.versuche(nr, level);
        oben.appendChild(BAUSTEINE.el("span", "bib-vs-versuche" + (versuche < BIBLIOTHEK.VERSUCHE ? " weniger" : ""),
            versuche + " Versuche"));
        vs.appendChild(oben);

        const unten = BAUSTEINE.el("div", "bib-vs-unten");
        unten.appendChild(BAUSTEINE.figuren(BIBLIOTHEK.figurenVon(START._bibliothekStand().figuren, nr, level)));
        const knoepfe = BAUSTEINE.el("div", "bib-vs-knoepfe");
        knoepfe.appendChild(BAUSTEINE.knopf({ text: "Zurück", art: "still",
            beiKlick: () => START._vorstellungSchliessen(vs) }));
        const los = BAUSTEINE.knopf({ text: "Los", art: "haupt", zeichen: "weiter",
            beiKlick: () => {
                START._vorstellungSchliessen(vs);
                NAVIGATION.zeigen("wordle", { modus: "bibliothek", buch: nr, level: level });
            } });
        los.classList.add("bib-vs-los");
        knoepfe.appendChild(los);
        unten.appendChild(knoepfe);
        vs.appendChild(unten);

        document.body.appendChild(vs);
        /* Erst nach dem ersten Bild einblenden, sonst gleitet nichts; der
           Zeitgeber ist die Rückfallebene (Fenster im Hintergrund). */
        const zeigen = () => vs.classList.add("da");
        if (typeof requestAnimationFrame === "function") {
            requestAnimationFrame(() => requestAnimationFrame(zeigen));
        }
        window.setTimeout(zeigen, 80);
    },

    _vorstellungSchliessen(vs) {
        vs.classList.remove("da");
        window.setTimeout(() => {
            if (vs.parentNode) {
                vs.parentNode.removeChild(vs);
            }
        }, 260);
    },

    /* ---------------------------------------------------------------- *
     * Ein neues Buch (Banner „Neues Buch", wie Blunderlucks „Neuer Ort")
     * ---------------------------------------------------------------- */

    /* Einmal je neu erreichtem Buch; beim allerersten Öffnen ohne Banner
       (sonst feierte jedes neue Gerät das Buch, in dem man längst ist). */
    _neuesBuchPruefen() {
        const buch = Math.min(START._bibliothekStand().buch, BIBLIOTHEK.anzahlBuecher());
        let gesehen = 0;
        try {
            gesehen = parseInt(window.localStorage.getItem(START.GESEHEN_SCHLUESSEL) || "0", 10) || 0;
            window.localStorage.setItem(START.GESEHEN_SCHLUESSEL, String(Math.max(buch, gesehen)));
        } catch (fehler) {
            return;
        }
        if (gesehen === 0 || buch <= gesehen) {
            return;
        }
        const banner = BAUSTEINE.el("div", "bib-banner bib-buch-" + buch);
        banner.setAttribute("role", "status");
        banner.appendChild(BAUSTEINE.el("span", "bib-banner-klein", "Neues Buch"));
        banner.appendChild(BAUSTEINE.el("b", null, "Buch " + buch));
        banner.addEventListener("click", () => banner.remove());
        document.body.appendChild(banner);
        window.setTimeout(() => banner.classList.add("weg"), 2800);
        window.setTimeout(() => banner.remove(), 3300);
    }
});
