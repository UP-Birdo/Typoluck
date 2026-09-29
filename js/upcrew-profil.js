/*
 * upcrew-profil.js — das Profil ZWEISTUFIG, gleich in allen UPCrew-Spielen (gehört zu css/upcrew-profil.css,
 * braucht js/upcrew-abzeichen.js für die Kacheln; nutzt js/upcrew-blatt.js, js/upcrew-levelpfad.js und
 * js/upcrew-einstellungen.js, wenn da). Entstanden in Blunderluck v0.156.0; zweistufig seit 29.09.2026.
 *
 * Nutzer 29.09.2026: „generell soll es nur ein vorschau profil geben karte die oben ist mit den ausgerüsteten
 * abzeichen titel und level und flammen mit natürlich dem namen -> und halt das ausführliche wenn man draufklickt
 * mit mehr inhalten statistiken und so“ · „unten soll das level kachel aus dem profil“ · „das einstellungs symbol ist
 * kein zahnrad“ · „zu viele texte sätze im profil“. Gilt für das EIGENE und FREMDE Profile, beide Spiele.
 *
 * START-KOPF (seit 29.09.2026 abends, Koordination „Start ohne Scrollen“): KEINE Vorschau-Karte auf dem Start,
 * sondern `UPCREW_PROFIL.kopfzeile(ort, daten, { beiOeffnen, beiSerie })` — Kreis mit Level-Ring, Name #Tag, die drei
 * Abzeichen als Zeichen, rechts EINE Flamme im Kreis. Tipp auf den Kreis → Vorschau-Karte (Stufe 1) → ausführlich.
 * Die ausgerüsteten Abzeichen stehen überall KOMPAKT als Zeichen (UPCREW_ABZEICHEN.symbol), auch in Karte und Profil.
 *
 * STUFE 1 — die VORSCHAU-KARTE (eine Karte, sonst kein Kurzprofil):
 *     UPCREW_PROFIL.vorschau(ort, {
 *         name: "Jonas", tag: "#4821", titel: "Stammgast",           // titel wahlfrei
 *         level: 14, imLevel: 264, kosten: 425, anteil: 0.62,         // gemeinsames Level (FORTSCHRITT.levelAus)
 *         serie: 12, heute: true,                                     // Flamme/Serie über alle Spiele
 *         abzeichen: [eintrag, …], plaetze: 3                         // die ausgerüsteten, egal aus welchem Spiel
 *     }, {
 *         beiOeffnen: () => …,         // Tipp auf die Karte → das ausführliche Profil (z. B. UPCREW_PROFIL.oeffnen)
 *         beiLevel: () => …            // wahlfrei; Vorgabe: UPCREW_LEVELPFAD.oeffnen(daten)
 *     });   → die Karte
 *   Die ganze Karte ist EIN Knopf; nur der Level-Knopf darin öffnet stattdessen den Level-Pfad.
 *
 * STUFE 2 — das AUSFÜHRLICHE Profil (Inhalt eines Blatts):
 *     UPCREW_PROFIL.oeffnen(daten, optionen)      // Blatt „Profil“ (UPCREW_BLATT) mit Zahnrad NUR bei eigen
 *     UPCREW_PROFIL.zeichnen(ort, daten, optionen)   // nur der Inhalt
 *   daten wie oben, dazu wahlfrei:
 *         alle: [eintrag, …],                         // ALLE Abzeichen (UPCREW_ABZEICHEN.alle) für „Abzeichen“
 *         spielzeit: { wert: "2h+", zeilen: ["Blunderluck 1h+"], oeffentlich: false } | null,
 *         seit: "12.08.2026",
 *         orte: [{ spiel: "Blunderluck", titel: "Turm · Ort 2", unter: "…", anteil: 0.3, pfad: "…" }]
 *   optionen:
 *         eigen: true,                                // eigenes Profil: Zahnrad, Abzeichen wählen
 *         beiZahnrad: () => …,                        // → Einstellungen (nur mit eigen)
 *         beiAbzeichen: () => …,                      // Tipp auf „Wählen“/einen Platz → Auswahl (nur eigen)
 *         beiAbzeichenTipp: (eintrag) => …,           // Tipp auf ein Abzeichen in „Abzeichen“ (Stufen zeigen)
 *         beiLevel: () => …,                          // wie bei der Vorschau
 *         statistik: element | (ort) => {},           // DIE APP gibt ihre Statistik hinein (Abschnitt „Statistik“)
 *         verlauf: element | (ort) => {},             // DIE APP gibt Partien/Verlauf hinein (Abschnitt „Partien“)
 *         zusatz: [element, …],                       // weitere eigene Abschnitte (UPCREW_PROFIL.abschnitt)
 *         texte: { … }                                // wahlfrei, siehe TEXTE (z. B. verlauf: "Verlauf")
 *   Reihenfolge (fest): Kopf (Ring, Name #Tag, Titel) · Ausgerüstet (3 Plätze) · Statistik · Stand (orte) ·
 *   Partien · Abzeichen (alle) · Über (Spielzeit, dabei seit) · zusatz · LEVEL-KACHEL GANZ UNTEN (antippbar → Pfad).
 *
 *     UPCREW_PROFIL.abzeichenWahl(ort, alle, gewaehlt, { plaetze: 3, beiWechsel: (liste) => … });
 *     UPCREW_PROFIL.abschnitt(titel) · ring(daten, gross) · levelKachel(daten, beiLevel) · zahnrad(beiKlick)
 *
 * Kurze Texte: nur Beschriftungen (1–3 Wörter), keine erklärenden Sätze. Kein Spiel-Eigenes: alle Zahlen und Texte
 * kommen von der App; alles über textContent. Alte Aufrufe von `zeichnen` (Stand 28.09.) laufen weiter — der XP-Balken
 * steht jetzt in der Level-Kachel unten, `xpText` ebenso.
 */
(function () {
    "use strict";

    const RAUM = "http://www.w3.org/2000/svg";
    /* Das Zahnrad: dasselbe gefüllte Zeichen wie UPCREW_EINSTELLUNGEN.ZEICHEN.zahnrad (8 Zähne, Loch per evenodd). */
    const ZAHNRAD = "M19.37 10.16 L22.47 10.34 A10.6 10.6 0 0 1 22.47 13.66 L19.37 13.84 A7.6 7.6 0 0 1 18.51 15.91 "
        + "L20.58 18.23 A10.6 10.6 0 0 1 18.23 20.58 L15.91 18.51 A7.6 7.6 0 0 1 13.84 19.37 L13.66 22.47 "
        + "A10.6 10.6 0 0 1 10.34 22.47 L10.16 19.37 A7.6 7.6 0 0 1 8.09 18.51 L5.77 20.58 A10.6 10.6 0 0 1 3.42 18.23 "
        + "L5.49 15.91 A7.6 7.6 0 0 1 4.63 13.84 L1.53 13.66 A10.6 10.6 0 0 1 1.53 10.34 L4.63 10.16 "
        + "A7.6 7.6 0 0 1 5.49 8.09 L3.42 5.77 A10.6 10.6 0 0 1 5.77 3.42 L8.09 5.49 A7.6 7.6 0 0 1 10.16 4.63 "
        + "L10.34 1.53 A10.6 10.6 0 0 1 13.66 1.53 L13.84 4.63 A7.6 7.6 0 0 1 15.91 5.49 L18.23 3.42 "
        + "A10.6 10.6 0 0 1 20.58 5.77 L18.51 8.09 A7.6 7.6 0 0 1 19.37 10.16 Z "
        + "M15.4 12 A3.4 3.4 0 1 0 8.6 12 A3.4 3.4 0 1 0 15.4 12 Z";
    const PFADE = {
        zahnrad: ZAHNRAD,
        uhr: "M12 3 A9 9 0 1 0 12.01 3 Z M12 7 V12 L15 14",
        kalender: "M4 6 H20 V20 H4 Z M4 10 H20 M8 3 V7 M16 3 V7",
        auge: "M2 12 C5 6 19 6 22 12 C19 18 5 18 2 12 Z M12 9.5 A2.5 2.5 0 1 0 12 14.5 A2.5 2.5 0 1 0 12 9.5 Z",
        schloss: "M6 11 H18 V20 H6 Z M8.5 11 V8 A3.5 3.5 0 0 1 15.5 8 V11",
        plus: "M12 6 V18 M6 12 H18",
        haken: "M5 12.5 L10 17 L19 7",
        flamme: "M12 3 C15 7 18 9 18 14 A6 6 0 0 1 6 14 C6 11 8 9 9 7 C10 10 11 11 12 11 C12 8 11 6 12 3 Z",
        rechts: "M9 5 L16 12 L9 19"
    };
    const GEFUELLT = { zahnrad: true, flamme: true };

    const TEXTE = {
        profil: "Profil",
        oeffnen: "Profil öffnen",
        abzeichen: "Ausgerüstet",
        alle: "Abzeichen",
        waehlen: "Wählen",
        leer: "frei",
        statistik: "Statistik",
        verlauf: "Partien",
        ueber: "Über",
        spielzeit: "Spielzeit",
        oeffentlich: "öffentlich",
        privat: "privat",
        seit: "Dabei seit",
        orte: "Stand",
        level: "Level",
        levelPfad: "Level-Weg",
        serie: "Serie",
        wahlHinweis: "Bis zu 3",
        nochNicht: "Gesperrt",
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
        svg.setAttribute("class", (klasse || "up-pf-zeichen") + (GEFUELLT[pfad] ? " up-pf-gefuellt" : ""));
        const p = document.createElementNS(RAUM, "path");
        p.setAttribute("d", PFADE[pfad] || pfad || "");
        if (GEFUELLT[pfad]) {
            p.setAttribute("fill-rule", "evenodd");
        }
        svg.appendChild(p);
        return svg;
    }

    const anteilVon = (w) => Math.max(0, Math.min(1, Number(w) || 0));
    const ganz = (w) => Math.max(0, Math.floor(Number(w) || 0));

    /* Der Level-Stand aus den Daten: { level, imLevel, kosten, anteil } (fehlt imLevel/kosten, bleibt der Anteil). */
    function levelStand(d) {
        const level = Math.max(1, ganz(d.level) || 1);
        const kosten = ganz(d.kosten) || ((typeof UPCREW_LEVELPFAD !== "undefined") ? UPCREW_LEVELPFAD.kosten(level) : 0);
        const imLevel = (typeof d.imLevel === "number") ? ganz(d.imLevel) : Math.round(anteilVon(d.anteil) * kosten);
        return { level: level, imLevel: imLevel, kosten: kosten, anteil: kosten > 0 ? imLevel / kosten : anteilVon(d.anteil) };
    }

    function levelAuf(d, o) {
        return (e) => {
            if (e && e.stopPropagation) {
                e.stopPropagation();
            }
            if (typeof o.beiLevel === "function") {
                o.beiLevel();
            } else if (typeof UPCREW_LEVELPFAD !== "undefined") {
                UPCREW_LEVELPFAD.oeffnen(levelStand(d), { texte: o.levelTexte });
            }
        };
    }

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

    function abschnitt(titel, rechts) {
        const s = el("section", "up-pf-abschnitt");
        if (titel) {
            const h = el("h3", "", titel);
            if (rechts) {
                h.appendChild(rechts);
            }
            s.appendChild(h);
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

    function inhaltEinsetzen(ziel, inhalt) {
        if (typeof inhalt === "function") {
            inhalt(ziel);
        } else if (inhalt && inhalt.nodeType) {
            ziel.appendChild(inhalt);
        }
    }

    /* ---------- Stufe 1: die Vorschau-Karte ---------- */
    function vorschau(ort, daten, optionen) {
        const d = daten || {};
        const o = optionen || {};
        const t = Object.assign({}, TEXTE, o.texte || {});
        ort.textContent = "";
        const karte = el("div", "up-pf-karte");

        const auf = el("button", "up-pf-karte-auf");
        auf.type = "button";
        auf.setAttribute("aria-label", t.oeffnen + ": " + (d.name || ""));
        auf.addEventListener("click", () => {
            if (typeof o.beiOeffnen === "function") {
                o.beiOeffnen();
            }
        });
        karte.appendChild(auf);

        karte.appendChild(ring(Object.assign({}, d, { level: undefined }), false));   // Level steht im Knopf daneben
        const mitte = el("div", "up-pf-karte-mitte");
        const name = el("div", "up-pf-name up-pf-name-klein", d.name || "");
        if (d.tag) {
            name.appendChild(el("span", "up-pf-tag", d.tag));
        }
        mitte.appendChild(name);
        if (d.titel) {
            mitte.appendChild(el("div", "up-pf-titel", d.titel));
        }
        const zeile = el("div", "up-pf-karte-zeile");
        const stand = levelStand(d);
        const lv = el("button", "up-pf-lv up-lp-antippbar");
        lv.type = "button";
        lv.setAttribute("aria-label", t.level + " " + stand.level + " · " + t.levelPfad);
        lv.appendChild(el("b", "", t.level + " " + stand.level));
        const mini = el("span", "up-pf-lv-balken");
        const i = el("i");
        i.style.width = Math.round(stand.anteil * 100) + "%";
        mini.appendChild(i);
        lv.appendChild(mini);
        lv.addEventListener("click", levelAuf(d, o));
        zeile.appendChild(lv);
        const serie = ganz(d.serie);
        const fl = el("span", "up-pf-serie" + (serie > 0 ? (d.heute ? " up-pf-serie-voll" : " up-pf-serie-offen") : " up-pf-serie-aus"));
        fl.setAttribute("aria-label", t.serie + " " + serie);
        fl.appendChild(zeichen("flamme"));
        fl.appendChild(el("b", "", serie));
        zeile.appendChild(fl);
        mitte.appendChild(zeile);
        karte.appendChild(mitte);
        karte.appendChild(zeichen("rechts", "up-pf-zeichen up-pf-karte-pfeil"));

        const reihe = symbolReihe(d, "up-pf-karte-abzeichen");
        reihe.setAttribute("aria-hidden", "true");
        karte.appendChild(reihe);
        ort.appendChild(karte);
        return karte;
    }

    /* Die ausgerüsteten Abzeichen KOMPAKT, nur als Zeichen (Koordination 29.09.2026 „Start ohne Scrollen“): leere
       Plätze als leerer Kreis. Ohne upcrew-abzeichen.js ein Kürzel im Kreis. */
    function symbolVon(eintrag, beiKlick) {
        if (typeof UPCREW_ABZEICHEN !== "undefined" && typeof UPCREW_ABZEICHEN.symbol === "function") {
            return UPCREW_ABZEICHEN.symbol(eintrag, beiKlick);
        }
        const s = el("span", "up-az-symbol" + (eintrag ? " up-az-an" : " up-az-symbol-leer"),
            eintrag ? String(eintrag.kurz || eintrag.titel || "").charAt(0) : "");
        if (eintrag) {
            s.title = eintrag.titel || "";
        }
        return s;
    }

    function symbolReihe(d, klasse) {
        const plaetze = (typeof d.plaetze === "number" && d.plaetze > 0) ? d.plaetze : 3;
        const liste = Array.isArray(d.abzeichen) ? d.abzeichen.slice(0, plaetze) : [];
        const reihe = el("span", "up-pf-symbole" + (klasse ? " " + klasse : ""));
        for (let n = 0; n < plaetze; n++) {
            reihe.appendChild(symbolVon(liste[n] || null, null));
        }
        return reihe;
    }

    /* ---------- Der Kopf des Starts: EINE kompakte Zeile (Koordination 29.09.2026 „Start ohne Scrollen“) ----------
       Links der Profil-Kreis mit dem Level als Ring (Zahl klein unten links), daneben Name + #Tag und die drei
       ausgerüsteten Abzeichen als Zeichen; rechts EINE Flamme mit der Serie im Kreis (upcrew-flamme.js).
           const kopf = UPCREW_PROFIL.kopfzeile(ort, daten, { beiOeffnen, beiSerie });
           kopf.flamme.setzen({ serie, heuteGeschafft })     // null ohne upcrew-flamme.js oder ohne beiSerie
       Ein Tipp auf Kreis/Name → beiOeffnen (die Vorschau-Karte), auf die Flamme → beiSerie (die Serien-Karte). */
    function kopfzeile(ort, daten, optionen) {
        const d = daten || {};
        const o = optionen || {};
        const t = Object.assign({}, TEXTE, o.texte || {});
        ort.textContent = "";
        const zeile = el("div", "up-pf-kopfzeile");
        const auf = el("button", "up-pf-kz-auf");
        auf.type = "button";
        auf.setAttribute("aria-label", t.oeffnen + ": " + (d.name || "")
            + (typeof d.level === "number" ? " · " + t.level + " " + d.level : ""));
        auf.addEventListener("click", () => {
            if (typeof o.beiOeffnen === "function") {
                o.beiOeffnen();
            }
        });
        const r = ring(d, false);
        r.classList.add("up-pf-ring-kopf");
        auf.appendChild(r);
        const mitte = el("span", "up-pf-kz-mitte");
        const name = el("span", "up-pf-kz-name", d.name || "");
        if (d.tag) {
            name.appendChild(el("small", "up-pf-tag", d.tag));
        }
        mitte.appendChild(name);
        const reihe = symbolReihe(d, "up-pf-kz-abzeichen");
        reihe.setAttribute("aria-hidden", "true");
        mitte.appendChild(reihe);
        auf.appendChild(mitte);
        zeile.appendChild(auf);
        let flamme = null;
        if (typeof o.beiSerie === "function" && typeof UPCREW_FLAMME !== "undefined") {
            flamme = UPCREW_FLAMME.bauen(zeile, { beiKlick: o.beiSerie });
            flamme.setzen({ serie: ganz(d.serie), heuteGeschafft: d.heute === true });
        }
        ort.appendChild(zeile);
        return { el: zeile, flamme: flamme };
    }

    /* Die Level-Kachel (ganz unten im ausführlichen Profil): antippbar → Level-Pfad. */
    function levelKachel(daten, beiLevel, texte) {
        const d = daten || {};
        const t = Object.assign({}, TEXTE, texte || {});
        const stand = levelStand(d);
        const k = el("button", "up-pf-levelkachel up-lp-antippbar");
        k.type = "button";
        k.setAttribute("aria-label", t.level + " " + stand.level + " · " + t.levelPfad);
        const zahl = el("span", "up-pf-lk-zahl");
        zahl.appendChild(el("small", "", t.level));
        zahl.appendChild(el("b", "", stand.level));
        k.appendChild(zahl);
        const mitte = el("span", "up-pf-lk-mitte");
        const balken = el("span", "up-pf-xp");
        const fuellung = el("i");
        fuellung.style.width = Math.round(stand.anteil * 100) + "%";
        balken.appendChild(fuellung);
        mitte.appendChild(balken);
        mitte.appendChild(el("small", "up-pf-xp-text", d.xpText || (stand.kosten > 0
            ? stand.imLevel + " / " + stand.kosten + " XP" : "")));
        k.appendChild(mitte);
        const pfeil = el("span", "up-pf-lk-pfad", t.levelPfad);
        pfeil.appendChild(zeichen("rechts", "up-pf-zeichen up-pf-klein-zeichen"));
        k.appendChild(pfeil);
        if (typeof beiLevel === "function") {
            k.addEventListener("click", beiLevel);
        }
        return k;
    }

    /* ---------- Stufe 2: das ausführliche Profil ---------- */
    function zeichnen(ort, daten, optionen) {
        const d = daten || {};
        const o = optionen || {};
        const t = Object.assign({}, TEXTE, o.texte || {});
        const eigen = o.eigen === true || (o.eigen === undefined && typeof o.beiAbzeichen === "function");
        ort.innerHTML = "";
        ort.classList.add("up-pf");

        /* Kopf: Ring, Name + #Tag, Titel. */
        const kopf = el("div", "up-pf-kopf");
        kopf.appendChild(ring(d, true));
        const mitte = el("div", "up-pf-mitte");
        const name = el("div", "up-pf-name", d.name || "");
        if (d.tag) {
            name.appendChild(el("span", "up-pf-tag", d.tag));
        }
        mitte.appendChild(name);
        if (d.titel) {
            mitte.appendChild(el("div", "up-pf-titel", d.titel));
        }
        kopf.appendChild(mitte);
        ort.appendChild(kopf);

        /* Ausgerüstet: immer `plaetze` Plätze; leere mit Plus nur im eigenen Profil. */
        const plaetze = (typeof d.plaetze === "number" && d.plaetze > 0) ? d.plaetze : 3;
        const beiAbzeichen = () => {
            if (eigen && typeof o.beiAbzeichen === "function") {
                o.beiAbzeichen();
            }
        };
        let waehlen = null;
        if (eigen && typeof o.beiAbzeichen === "function") {
            waehlen = el("button", "up-pf-h3-knopf", t.waehlen);
            waehlen.type = "button";
            waehlen.addEventListener("click", beiAbzeichen);
        }
        const az = abschnitt(t.abzeichen, waehlen);
        /* Kompakt als Zeichen (29.09.2026): der Name beim Antippen (fremd: beiAbzeichenTipp) bzw. als title. */
        const reihe = el("div", "up-pf-plaetze up-pf-plaetze-kompakt");
        const liste = Array.isArray(d.abzeichen) ? d.abzeichen.slice(0, plaetze) : [];
        for (let i = 0; i < plaetze; i++) {
            const platz = el("div", "up-pf-platz");
            if (liste[i]) {
                platz.appendChild(symbolVon(liste[i], eigen ? beiAbzeichen : (typeof o.beiAbzeichenTipp === "function"
                    ? () => o.beiAbzeichenTipp(liste[i]) : null)));
            } else if (eigen) {
                const leer = el("button", "up-pf-leer up-az-symbol up-az-symbol-leer");
                leer.type = "button";
                leer.setAttribute("aria-label", t.abzeichen + " · " + t.leer);
                leer.title = t.leer;
                leer.appendChild(zeichen("plus"));
                leer.addEventListener("click", beiAbzeichen);
                platz.appendChild(leer);
            } else {
                platz.appendChild(el("span", "up-pf-leer up-pf-leer-fremd up-az-symbol up-az-symbol-leer"));
            }
            reihe.appendChild(platz);
        }
        az.appendChild(reihe);
        ort.appendChild(az);

        /* Statistik der App. */
        if (o.statistik) {
            const s = abschnitt(t.statistik);
            inhaltEinsetzen(s, o.statistik);
            ort.appendChild(s);
        }

        /* Stand: je Spiel eine Zeile. */
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

        /* Partien/Verlauf der App. */
        if (o.verlauf) {
            const v = abschnitt(t.verlauf);
            inhaltEinsetzen(v, o.verlauf);
            ort.appendChild(v);
        }

        /* Alle Abzeichen (verdiente hell, andere blass). */
        const alle = Array.isArray(d.alle) ? d.alle : [];
        if (alle.length > 0) {
            const a = abschnitt(t.alle);
            const raster = el("div", "up-pf-alle");
            for (const eintrag of alle) {
                const zelle = el("div", "up-pf-wahl-zelle" + (eintrag.erreicht > 0 ? "" : " up-pf-gesperrt"));
                zelle.appendChild(kachelVon(eintrag, typeof o.beiAbzeichenTipp === "function"
                    ? () => o.beiAbzeichenTipp(eintrag) : null));
                raster.appendChild(zelle);
            }
            a.appendChild(raster);
            ort.appendChild(a);
        }

        /* Über: Spielzeit, dabei seit. */
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
                fakten.appendChild(f);
            }
            ueber.appendChild(fakten);
            ort.appendChild(ueber);
        }

        for (const zusatz of (o.zusatz || [])) {
            if (zusatz) {
                ort.appendChild(zusatz);
            }
        }

        /* Level-Kachel GANZ UNTEN (Nutzer 29.09.2026). */
        if (typeof d.level === "number") {
            const lvAbschnitt = abschnitt(t.level);
            lvAbschnitt.classList.add("up-pf-level-abschnitt");
            lvAbschnitt.appendChild(levelKachel(d, levelAuf(d, o), o.texte));
            ort.appendChild(lvAbschnitt);
        }
        return ort;
    }

    /* Das ausführliche Profil als Blatt. Zahnrad nur im eigenen Profil (und nur mit beiZahnrad). */
    function oeffnen(daten, optionen) {
        const o = optionen || {};
        const t = Object.assign({}, TEXTE, o.texte || {});
        if (typeof UPCREW_BLATT === "undefined") {
            return null;
        }
        const rechts = (o.eigen === true && typeof o.beiZahnrad === "function") ? [zahnrad(o.beiZahnrad, t.zahnrad)] : [];
        return UPCREW_BLATT.oeffnen({
            titel: o.titel || t.profil,
            rechts: rechts,
            klasse: "up-pf-blatt",
            inhalt: (ort) => zeichnen(ort, daten, o)
        });
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
            ort.appendChild(el("p", "up-pf-hinweis", t.wahlHinweis + " · " + wahl.length + "/" + plaetze));
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

    const UPCREW_PROFIL = { vorschau: vorschau, kopfzeile: kopfzeile, zeichnen: zeichnen, oeffnen: oeffnen, abzeichenWahl: abzeichenWahl,
        ring: ring, abschnitt: abschnitt, levelKachel: levelKachel, levelStand: levelStand, zahnrad: zahnrad,
        TEXTE: TEXTE, PFADE: PFADE };
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
