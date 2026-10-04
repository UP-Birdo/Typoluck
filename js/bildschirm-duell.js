/*
 * bildschirm-duell.js — das Duell auf dem Bildschirm (seit 0.34.0).
 *
 * NUR WENN DAS DUELL AN IST (`DUELL.an()`: KONFIG.REGEL_14_EINGESPIELT oder
 * die Werkstatt mit `&duell`): dann steht „Duell" als dritte Art im
 * Umschalt-Quadrat des Starts (`START.ARTEN`, ein Eintrag — kein Umbau des
 * Starts). Sonst trägt diese Datei nichts ein und zeigt nichts.
 *
 * Zwei Orte:
 *   - die Karte der Start-Art: das eine Duell (Gegner, Stand, wer dran ist)
 *     oder „kein Duell" mit den Einladungen; Knöpfe „Freund herausfordern",
 *     „Annehmen"/„Ablehnen", „Wort n spielen", „Duell ansehen";
 *   - der Bildschirm `duell` (ohne Leisten-Knopf, im gemeinsamen Ort):
 *       uebersicht  Stand, die drei Wörter, Spielen / Zurückziehen /
 *                   Aufgeben / Fertig, Einladungen, beendete Duelle
 *       freunde     „Freund herausfordern" (aus der Freundesliste)
 *       runde       ein Wort: das eigene Brett mit Buchstaben, darüber die
 *                   Uhr und der Geist des Gegners (nur Farben, im Takt
 *                   seiner Zeiten), keine Tipps, kein Extra-Leben
 *       wort        nach dem Wort: eigenes Brett, das Muster des Gegners,
 *                   Zeiten, wer das Wort holt
 *
 * Gerechnet wird nur im Modell (js\duell.js), gelesen und geschrieben nur
 * über js\duell-abgleich.js. Jede Grafik ist ein Platz (`UPCREW_PLATZ`):
 * `start/art-duell` (vom Start), `duell/vs-bild`, `duell/wort-geholt`,
 * `duell/sieg`, `duell/niederlage` — mit schlichtem Platzhalter. Nichts
 * rollt waagrecht.
 */

const DUELL_BILDSCHIRM = {

    _behaelter: null,
    _parameter: null,
    _ansicht: "uebersicht",
    _nr: -1,
    _geist: null,
    eingabe: null,
    _tastenHoerer: null,
    _uhr: null,
    _takt: null,
    _sperre: false,

    /* Takt der Uhr in der Runde; Takt des Nachsehens beim Warten (in der
       Werkstatt schneller, sonst DUELL_ABGLEICH.TAKT_MS). */
    UHR_TAKT_MS: 250,
    WERKSTATT_TAKT_MS: 3000,

    anmelden() {
        NAVIGATION.anmelden({
            id: "duell",
            titel: "Duell",
            imMenue: false,
            zeigen: (behaelter, parameter) => DUELL_BILDSCHIRM.zeigen(behaelter, parameter),
            verlassen: () => DUELL_BILDSCHIRM.verlassen()
        });
        DUELL_BILDSCHIRM.artEintragen();
        /* Zurück in der App: einmal lesen, wenn das Duell zu sehen ist. */
        if (DUELL.an() && typeof document !== "undefined" && typeof document.addEventListener === "function") {
            document.addEventListener("visibilitychange", () => {
                if (document.visibilityState === "visible" && DUELL_BILDSCHIRM._taktGilt()) {
                    DUELL_ABGLEICH.lageHolen();
                    DUELL_BILDSCHIRM._taktStarten();
                }
            });
        }
    },

    /* Die dritte Art des Starts — NUR, wenn das Duell an ist. */
    ART: {
        id: "duell", name: "Duell", info: "1 gegen 1", zeichen: "partie",
        karte: (ort) => DUELL_BILDSCHIRM.karteBauen(ort),
        knoepfe: () => DUELL_BILDSCHIRM.knoepfe()
    },

    artEintragen() {
        if (!DUELL.an() || typeof START === "undefined" || !Array.isArray(START.ARTEN) || START.artVon("duell")) {
            return false;
        }
        START.ARTEN.push(DUELL_BILDSCHIRM.ART);
        return true;
    },

    /* ---------------------------------------------------------------- *
     * Freunde und Namen (Namen stehen nie im Duell, nur hier)
     * ---------------------------------------------------------------- */

    /* [{ uid, name }] — Freunde mit Konto (kein Gast, nicht UP#Plus). In
       der Werkstatt hat die Liste keine Konto-Nummern: dort gilt die Id. */
    freunde() {
        if (typeof ANMELDUNG === "undefined" || !ANMELDUNG.ich() || !ANMELDUNG.abgleich) {
            return [];
        }
        const ich = ANMELDUNG.ich();
        return SPIELER.freundeVon(ANMELDUNG.abgleich.daten, ich.id).freunde
            .filter((s) => !SPIELER.istGast(s) && !SPIELER.istVerteiler(s))
            .map((s) => ({ uid: s.uid || (DUELL._werkstatt ? s.id : ""), name: s.name }))
            .filter((f) => !!f.uid);
    },

    name(uid) {
        const f = DUELL_BILDSCHIRM.freunde().find((x) => x.uid === uid);
        return f ? f.name : "Gegner";
    },

    /* „4 · 0:47" | „X" (nicht gelöst) | "" */
    pText(p) {
        if (typeof p !== "number") {
            return "";
        }
        const t = DUELL.zerlegen(p);
        return t.geloest ? t.versuche + " · " + DUELL_BILDSCHIRM.zeitText(t.dauerMs) : "X";
    },

    zeitText(ms) {
        const s = Math.max(0, Math.floor((ms || 0) / 1000));
        return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
    },

    _platz(name, groesse, klasse) {
        if (typeof UPCREW_PLATZ === "undefined") {
            return BAUSTEINE.el("div", "duell-platz " + (klasse || ""));
        }
        return UPCREW_PLATZ.bauen(name, groesse, { klasse: "duell-platz " + (klasse || "") });
    },

    /* ---------------------------------------------------------------- *
     * Die Karte der Start-Art
     * ---------------------------------------------------------------- */

    _standText(sicht) {
        const s = sicht.stand;
        return sicht.rolle ? s[sicht.rolle] + " : " + s[DUELL.anderer(sicht.rolle)] : "";
    },

    _lageText(sicht) {
        const gegner = DUELL_BILDSCHIRM.name(sicht.gegner);
        return {
            "wartet-annahme": "wartet auf " + gegner,
            "dran": "Du bist dran · Wort " + (sicht.nr + 1) + " von 3",
            "wartet": "wartet auf " + gegner,
            "beendet": DUELL.ergebnisFuer(sicht.stand, sicht.rolle) || "beendet"
        }[sicht.art] || "";
    },

    karteBauen(ort) {
        const karte = BAUSTEINE.el("section", "start-karte start-karte-duell");
        const sicht = DUELL_ABGLEICH.sicht();
        const lage = DUELL_ABGLEICH.lage;
        const kopf = (typeof START !== "undefined" && START._kartenKopf)
            ? START._kartenKopf(sicht.art === "dran" ? 1 : 0, "Duell", "1 gegen 1") : BAUSTEINE.el("p", null, "Duell");
        karte.appendChild(kopf);
        const mitte = BAUSTEINE.el("div", "duell-karte-mitte");
        mitte.appendChild(DUELL_BILDSCHIRM._platz("duell/vs-bild", "390x300", "duell-vs-bild"));
        if (!DUELL_ABGLEICH.bereit()) {
            mitte.appendChild(BAUSTEINE.el("p", "duell-karte-zeile", "nur mit UPCrew-Konto"));
        } else if (!lage) {
            mitte.appendChild(ZUSTAND.laden({}));
        } else if (lage.duell) {
            const name = DUELL_BILDSCHIRM.name(sicht.gegner);
            mitte.appendChild(BAUSTEINE.el("p", "duell-karte-gegner", "Du · " + name));
            mitte.appendChild(BAUSTEINE.el("p", "duell-gross", DUELL_BILDSCHIRM._standText(sicht)));
            mitte.appendChild(BAUSTEINE.el("p", "duell-karte-zeile duell-lage-" + sicht.art, DUELL_BILDSCHIRM._lageText(sicht)));
        } else {
            /* „kein Duell" nur ohne Einladung (seit 0.34.4: vorher stand es
               über „Einladung · Ben"). */
            if (!lage.einladungen.length) {
                mitte.appendChild(BAUSTEINE.el("p", "duell-karte-zeile", "kein Duell"));
            }
            for (const e of lage.einladungen.slice(0, 3)) {
                mitte.appendChild(BAUSTEINE.el("p", "duell-karte-zeile duell-einladung",
                    "Einladung · " + DUELL_BILDSCHIRM.name(e.von)));
            }
        }
        if (lage && lage.fehler) {
            mitte.appendChild(BAUSTEINE.el("p", "duell-karte-zeile duell-leise", "nicht erreichbar"));
        }
        karte.appendChild(mitte);
        const fuss = BAUSTEINE.el("div", "start-karte-fuss");
        const zuletzt = DUELL_ABGLEICH.beendet()[0];
        fuss.appendChild(BAUSTEINE.el("span", null, zuletzt
            ? DUELL_BILDSCHIRM.name(zuletzt.gegner) + " · " + zuletzt.ich + " : " + zuletzt.er + " " + zuletzt.ergebnis
            : "gleiches Wort · 3 Wörter"));
        fuss.appendChild(BAUSTEINE.el("span", null, "nur Freunde"));
        karte.appendChild(fuss);
        ort.appendChild(karte);
        DUELL_BILDSCHIRM._startGezeigt();
    },

    /* Die Knöpfe links vom Quadrat. */
    knoepfe() {
        const sicht = DUELL_ABGLEICH.sicht();
        const lage = DUELL_ABGLEICH.lage;
        const zeigen = (parameter) => NAVIGATION.zeigen("duell", parameter || { ansicht: "uebersicht" });
        if (!DUELL_ABGLEICH.bereit()) {
            return [{ text: "Duell", unter: "nur mit Konto", aus: true }];
        }
        if (!lage) {
            return [{ text: "Duell", unter: "lädt", aus: true }];
        }
        if (lage.duell) {
            if (sicht.nr >= 0) {
                return [{ text: sicht.begonnen ? "Weiter spielen" : "Wort " + (sicht.nr + 1) + " spielen",
                    unter: DUELL_BILDSCHIRM.name(sicht.gegner) + " · " + DUELL_BILDSCHIRM._standText(sicht),
                    haupt: true, tun: () => zeigen({ ansicht: "spielen" }) }];
            }
            return [{ text: sicht.art === "beendet" ? "Ergebnis" : "Duell ansehen",
                unter: DUELL_BILDSCHIRM._lageText(sicht), haupt: true, tun: () => zeigen() }];
        }
        const e = lage.einladungen[0];
        if (e) {
            return [
                { text: "Annehmen", unter: DUELL_BILDSCHIRM.name(e.von), haupt: true,
                    tun: () => DUELL_BILDSCHIRM.annehmen(e.von, true) },
                { text: "Ablehnen", unter: DUELL_BILDSCHIRM.name(e.von), tun: () => DUELL_BILDSCHIRM.ablehnen(e.von) }
            ];
        }
        return [{ text: "Freund herausfordern", unter: "1 gegen 1", haupt: true,
            tun: () => zeigen({ ansicht: "freunde" }) }];
    },

    /* Die Start-Art ist zu sehen: einmal lesen (nicht, wenn die Seite nur
       im Leerlauf gezeichnet wird), dann beim Warten nachsehen. */
    _startGezeigt() {
        if (typeof NAVIGATION === "undefined" || NAVIGATION.aktuell !== "start") {
            return;
        }
        DUELL_BILDSCHIRM._ladenWennAlt();
        DUELL_BILDSCHIRM._taktStarten();
    },

    _ladenWennAlt() {
        DUELL_ABGLEICH.sicht();
        const lage = DUELL_ABGLEICH.lage;
        if (!DUELL_ABGLEICH.bereit() || DUELL_ABGLEICH.laedt) {
            return;
        }
        if (!lage || DUELL_ABGLEICH.jetzt() - lage.zeit > DUELL_BILDSCHIRM.taktMs()) {
            DUELL_ABGLEICH.lageHolen();
        }
    },

    /* ---------------------------------------------------------------- *
     * Nachsehen beim Warten (nur sichtbar, nie während des Spielens)
     * ---------------------------------------------------------------- */

    taktMs() {
        return DUELL._werkstatt ? DUELL_BILDSCHIRM.WERKSTATT_TAKT_MS : DUELL_ABGLEICH.TAKT_MS;
    },

    _taktGilt() {
        if (typeof document !== "undefined" && document.visibilityState === "hidden") {
            return false;
        }
        if (NAVIGATION.aktuell === "duell") {
            return DUELL_BILDSCHIRM._ansicht === "uebersicht";
        }
        return NAVIGATION.aktuell === "start" && typeof START !== "undefined" && START.art() === "duell";
    },

    _taktStarten() {
        if (DUELL_BILDSCHIRM._takt || typeof window === "undefined" || typeof window.setInterval !== "function") {
            return;
        }
        DUELL_BILDSCHIRM._takt = window.setInterval(() => DUELL_BILDSCHIRM._taktSchlag(), DUELL_BILDSCHIRM.taktMs());
    },

    _taktAnhalten() {
        if (DUELL_BILDSCHIRM._takt) {
            window.clearInterval(DUELL_BILDSCHIRM._takt);
            DUELL_BILDSCHIRM._takt = null;
        }
    },

    _taktSchlag() {
        if (!DUELL_ABGLEICH.bereit() || !DUELL_BILDSCHIRM._taktGilt()) {
            DUELL_BILDSCHIRM._taktAnhalten();
            return;
        }
        const art = DUELL_ABGLEICH.sicht().art;
        if (!DUELL_ABGLEICH.lage || art === "wartet" || art === "wartet-annahme") {
            DUELL_ABGLEICH.nachsehen();
        }
    },

    /* Die Lage hat sich geändert (DUELL_ABGLEICH.beiAenderung). */
    auffrischen() {
        if (typeof NAVIGATION === "undefined") {
            return;
        }
        if (NAVIGATION.aktuell === "duell") {
            if (DUELL_BILDSCHIRM._ansicht === "uebersicht" || DUELL_BILDSCHIRM._ansicht === "freunde") {
                DUELL_BILDSCHIRM._zeichnen();
            }
            if (typeof NAVIGATION.veralten === "function") {
                NAVIGATION.veralten(["start"]);
            }
        } else if (NAVIGATION.aktuell === "start" && typeof START !== "undefined" && START.art() === "duell") {
            NAVIGATION.auffrischen();
        } else if (typeof NAVIGATION.veralten === "function") {
            NAVIGATION.veralten(["start"]);
        }
    },

    /* ---------------------------------------------------------------- *
     * Der Bildschirm
     * ---------------------------------------------------------------- */

    zeigen(behaelter, parameter) {
        const neu = parameter !== DUELL_BILDSCHIRM._parameter || behaelter !== DUELL_BILDSCHIRM._behaelter;
        DUELL_BILDSCHIRM._behaelter = behaelter;
        DUELL_BILDSCHIRM._parameter = parameter;
        if (!DUELL.an()) {
            behaelter.innerHTML = "";
            behaelter.appendChild(BAUSTEINE.kopfzeile("Duell", { zurueck: () => NAVIGATION.zurueck() }));
            behaelter.appendChild(ZUSTAND.leer({ zeichen: "partie", text: "Duell kommt bald" }));
            return;
        }
        if (neu) {
            const ansicht = parameter && parameter.ansicht;
            DUELL_BILDSCHIRM._ansicht = ansicht === "freunde" ? "freunde" : "uebersicht";
            if (ansicht === "spielen") {
                /* Nur einmal (ein Neuzeichnen trägt denselben Parameter). */
                parameter.ansicht = "uebersicht";
                DUELL_BILDSCHIRM._zeichnen();
                DUELL_BILDSCHIRM.spielen();
                return;
            }
        }
        DUELL_BILDSCHIRM._zeichnen();
        if (neu) {
            DUELL_BILDSCHIRM._ladenWennAlt();
            DUELL_BILDSCHIRM._taktStarten();
        }
    },

    verlassen() {
        document.body.classList.remove("im-spiel");
        DUELL_BILDSCHIRM._uhrAnhalten();
        DUELL_BILDSCHIRM._tastaturAus();
        DUELL_BILDSCHIRM._parameter = null;
    },

    _zeichnen() {
        const behaelter = DUELL_BILDSCHIRM._behaelter;
        if (!behaelter) {
            return;
        }
        behaelter.innerHTML = "";
        const ansicht = DUELL_BILDSCHIRM._ansicht;
        document.body.classList.toggle("im-spiel", ansicht === "runde");
        if (ansicht !== "runde") {
            DUELL_BILDSCHIRM._uhrAnhalten();
            DUELL_BILDSCHIRM._tastaturAus();
        }
        if (ansicht === "freunde") {
            DUELL_BILDSCHIRM._freundeZeichnen(behaelter);
        } else if (ansicht === "runde") {
            DUELL_BILDSCHIRM._rundeZeichnen(behaelter);
        } else if (ansicht === "wort") {
            DUELL_BILDSCHIRM._wortZeichnen(behaelter);
        } else {
            DUELL_BILDSCHIRM._uebersichtZeichnen(behaelter);
        }
    },

    _wechseln(ansicht) {
        DUELL_BILDSCHIRM._ansicht = ansicht;
        DUELL_BILDSCHIRM._zeichnen();
        if (ansicht === "uebersicht") {
            DUELL_BILDSCHIRM._taktStarten();
        }
    },

    _knopf(text, art, tun, zeichen) {
        return BAUSTEINE.knopf({ text: text, art: art, breit: true, zeichen: zeichen,
            beiKlick: () => DUELL_BILDSCHIRM._sperre ? null : tun() });
    },

    /* Eine Handlung mit Sperre (kein Doppel-Tipp) und Kurzmeldung. */
    async _tun(handlung) {
        if (DUELL_BILDSCHIRM._sperre) {
            return null;
        }
        DUELL_BILDSCHIRM._sperre = true;
        let ergebnis = null;
        try {
            ergebnis = await handlung();
        } finally {
            DUELL_BILDSCHIRM._sperre = false;
        }
        if (ergebnis && !ergebnis.ok) {
            DIALOG.kurzmeldung(DUELL_BILDSCHIRM.grundText(ergebnis.grund), 1800);
        }
        return ergebnis;
    },

    grundText(grund) {
        return {
            aus: "Duell aus", eins: "Nur ein Duell gleichzeitig", weg: "Nicht mehr da",
            aktualisieren: "Bitte Typoluck aktualisieren", verfallen: "Einladung verfallen",
            abgelehnt: "Nicht mehr möglich", netz: "Keine Verbindung", gegner: "Kein Freund",
            woanders: "Woanders begonnen"
        }[grund] || "Nicht möglich";
    },

    /* --- Übersicht --------------------------------------------------- */

    _uebersichtZeichnen(behaelter) {
        behaelter.appendChild(BAUSTEINE.kopfzeile("Duell", { zurueck: () => NAVIGATION.zurueck() }));
        const ort = BAUSTEINE.el("div", "duell");
        behaelter.appendChild(ort);
        DUELL_ABGLEICH.sicht();
        const lage = DUELL_ABGLEICH.lage;
        if (!DUELL_ABGLEICH.bereit()) {
            ort.appendChild(ZUSTAND.leer({ zeichen: "partie", text: "nur mit UPCrew-Konto" }));
            return;
        }
        if (!lage) {
            ort.appendChild(ZUSTAND.laden({}));
            return;
        }
        if (lage.duell) {
            DUELL_BILDSCHIRM._duellZeichnen(ort, lage.duell);
        } else {
            DUELL_BILDSCHIRM._ohneDuellZeichnen(ort, lage);
        }
        DUELL_BILDSCHIRM._beendetZeichnen(ort);
    },

    /* „+110 XP" für ein beendetes Duell, sonst "" (seit 0.35.0). */
    xpText(sicht) {
        if (typeof FORTSCHRITT === "undefined" || !sicht || sicht.art !== "beendet") {
            return "";
        }
        const xp = FORTSCHRITT.duellXp(sicht.stand, sicht.rolle).xp;
        return xp > 0 ? "+" + xp + " XP" : "";
    },

    _vsBauen(sicht, stand) {
        const vs = BAUSTEINE.el("div", "duell-vs");
        vs.appendChild(DUELL_BILDSCHIRM._platz("duell/vs-bild", "390x300", "duell-vs-bild"));
        const zeile = BAUSTEINE.el("div", "duell-vs-zeile");
        zeile.appendChild(BAUSTEINE.el("span", "duell-vs-name", "Du"));
        zeile.appendChild(BAUSTEINE.el("strong", "duell-gross", stand));
        zeile.appendChild(BAUSTEINE.el("span", "duell-vs-name", DUELL_BILDSCHIRM.name(sicht.gegner)));
        vs.appendChild(zeile);
        return vs;
    },

    _duellZeichnen(ort, d) {
        const sicht = DUELL_ABGLEICH.sicht();
        ort.appendChild(DUELL_BILDSCHIRM._vsBauen(sicht, DUELL_BILDSCHIRM._standText(sicht)));
        ort.appendChild(BAUSTEINE.el("p", "duell-lage duell-lage-" + sicht.art, DUELL_BILDSCHIRM._lageText(sicht)));

        if (sicht.art === "beendet") {
            const ergebnis = DUELL.ergebnisFuer(sicht.stand, sicht.rolle);
            ort.appendChild(DUELL_BILDSCHIRM._platz(ergebnis === "gewonnen" ? "duell/sieg" : "duell/niederlage",
                "160x160", "duell-ende-bild"));
            /* Die XP dieses Duells (seit 0.35.0; gerechnet im Modell,
               gebucht genau einmal in APP.duellZaehlen). */
            const xp = DUELL_BILDSCHIRM.xpText(sicht);
            if (xp) {
                ort.appendChild(BAUSTEINE.el("p", "duell-xp", xp));
            }
        }
        ort.appendChild(DUELL_BILDSCHIRM._woerterBauen(d, sicht));

        const knoepfe = BAUSTEINE.el("div", "duell-knoepfe");
        if (sicht.nr >= 0) {
            knoepfe.appendChild(DUELL_BILDSCHIRM._knopf(sicht.begonnen ? "Weiter spielen" : "Wort " + (sicht.nr + 1) + " spielen",
                "haupt", () => DUELL_BILDSCHIRM.spielen(), "partie"));
        }
        if (sicht.art === "beendet") {
            knoepfe.appendChild(DUELL_BILDSCHIRM._knopf("Fertig", "haupt", () => DUELL_BILDSCHIRM._tun(() => DUELL_ABGLEICH.abschliessen())));
        }
        if (DUELL_ABGLEICH.zurueckziehenMoeglich()) {
            knoepfe.appendChild(DUELL_BILDSCHIRM._knopf("Zurückziehen", "gefahr", () => DUELL_BILDSCHIRM.zurueckziehen()));
        }
        if (DUELL_ABGLEICH.aufgebenMoeglich()) {
            knoepfe.appendChild(DUELL_BILDSCHIRM._knopf("Aufgeben", "gefahr", () => DUELL_BILDSCHIRM.aufgeben()));
        }
        ort.appendChild(knoepfe);
    },

    /* Die drei Wörter: eigenes Ergebnis, das des Gegners (erst, wenn ich das
       Wort auch habe oder das Duell vorbei ist), wer es holt. */
    _woerterBauen(d, sicht) {
        const liste = BAUSTEINE.el("ol", "duell-woerter");
        const g = DUELL.anderer(sicht.rolle);
        const name = DUELL_BILDSCHIRM.name(sicht.gegner);
        /* Ein schlichter Kopf über den Spalten (seit 0.34.4: vorher stand
           nur „–" / „gespielt", unklar wer was ist). Nur Anzeige. */
        const kopf = BAUSTEINE.el("li", "duell-wort duell-wort-kopf");
        kopf.appendChild(BAUSTEINE.el("span", "duell-wort-nr", ""));
        kopf.appendChild(BAUSTEINE.el("span", "duell-wort-ich", "Du"));
        kopf.appendChild(BAUSTEINE.el("span", "duell-wort-er", name));
        kopf.appendChild(BAUSTEINE.el("span", "duell-wort-holt", "Punkt"));
        liste.appendChild(kopf);
        sicht.stand.woerter.forEach((w) => {
            const zeile = BAUSTEINE.el("li", "duell-wort");
            const eigen = w[sicht.rolle];
            const fremd = w[g];
            const ownW = d.teil[sicht.rolle].w[w.nr];
            zeile.appendChild(BAUSTEINE.el("span", "duell-wort-nr", "Wort " + (w.nr + 1)));
            zeile.appendChild(BAUSTEINE.el("span", "duell-wort-ich",
                eigen !== null ? DUELL_BILDSCHIRM.pText(eigen) : (ownW && typeof ownW.b === "number" ? "läuft" : "–")));
            const zeigen = eigen !== null || sicht.stand.ende;
            zeile.appendChild(BAUSTEINE.el("span", "duell-wort-er",
                fremd === null ? "–" : (zeigen ? DUELL_BILDSCHIRM.pText(fremd) : "gespielt")));
            const holt = w.holt === null ? "" : (w.holt === "beide" ? "beide" : (w.holt === sicht.rolle ? "Du" : name));
            zeile.appendChild(BAUSTEINE.el("span", "duell-wort-holt" + (w.holt === sicht.rolle ? " ich" : ""), holt));
            liste.appendChild(zeile);
        });
        return liste;
    },

    _ohneDuellZeichnen(ort, lage) {
        ort.appendChild(DUELL_BILDSCHIRM._platz("duell/vs-bild", "390x300", "duell-vs-bild"));
        if (!lage.einladungen.length) {
            ort.appendChild(BAUSTEINE.el("p", "duell-lage", "kein Duell"));
        }
        for (const e of lage.einladungen) {
            const karte = BAUSTEINE.el("div", "duell-einladung-karte");
            karte.appendChild(BAUSTEINE.el("p", "duell-einladung-name", "Einladung · " + DUELL_BILDSCHIRM.name(e.von)));
            const zeile = BAUSTEINE.el("div", "duell-knoepfe zwei");
            zeile.appendChild(DUELL_BILDSCHIRM._knopf("Annehmen", "haupt", () => DUELL_BILDSCHIRM.annehmen(e.von)));
            zeile.appendChild(DUELL_BILDSCHIRM._knopf("Ablehnen", "still", () => DUELL_BILDSCHIRM.ablehnen(e.von)));
            karte.appendChild(zeile);
            ort.appendChild(karte);
        }
        const knoepfe = BAUSTEINE.el("div", "duell-knoepfe");
        knoepfe.appendChild(DUELL_BILDSCHIRM._knopf("Freund herausfordern", lage.einladungen.length ? "still" : "haupt",
            () => DUELL_BILDSCHIRM._wechseln("freunde"), "freunde"));
        ort.appendChild(knoepfe);
    },

    _beendetZeichnen(ort) {
        const liste = DUELL_ABGLEICH.beendet();
        if (!liste.length) {
            return;
        }
        const teil = BAUSTEINE.el("section", "duell-beendet");
        teil.appendChild(BAUSTEINE.el("h2", "duell-titel", "Beendet"));
        const ol = BAUSTEINE.el("ol", "duell-beendet-liste");
        for (const e of liste) {
            const li = BAUSTEINE.el("li", "duell-beendet-zeile");
            li.appendChild(BAUSTEINE.el("span", null, DUELL_BILDSCHIRM.name(e.gegner)));
            li.appendChild(BAUSTEINE.el("span", null, e.ich + " : " + e.er));
            li.appendChild(BAUSTEINE.el("span", "duell-leise", e.ergebnis));
            ol.appendChild(li);
        }
        teil.appendChild(ol);
        ort.appendChild(teil);
    },

    /* --- Freund herausfordern ---------------------------------------- */

    _freundeZeichnen(behaelter) {
        behaelter.appendChild(BAUSTEINE.kopfzeile("Freund herausfordern",
            { zurueck: () => DUELL_BILDSCHIRM._wechseln("uebersicht") }));
        const ort = BAUSTEINE.el("div", "duell");
        const freunde = DUELL_BILDSCHIRM.freunde();
        if (!freunde.length) {
            ort.appendChild(ZUSTAND.leer({ zeichen: "freunde", text: "noch keine Freunde" }));
        }
        const liste = BAUSTEINE.el("div", "duell-freunde");
        for (const f of freunde) {
            liste.appendChild(DUELL_BILDSCHIRM._knopf(f.name, "still", () => DUELL_BILDSCHIRM.herausfordern(f.uid), "partie"));
        }
        ort.appendChild(liste);
        ort.appendChild(BAUSTEINE.el("p", "duell-leise", "gleiches Wort · höchstens 3 Wörter · ohne Tipp"));
        behaelter.appendChild(ort);
    },

    /* ---------------------------------------------------------------- *
     * Handlungen
     * ---------------------------------------------------------------- */

    async herausfordern(uid) {
        const ergebnis = await DUELL_BILDSCHIRM._tun(() => DUELL_ABGLEICH.herausfordern(uid));
        if (ergebnis && ergebnis.ok) {
            DIALOG.kurzmeldung("Herausgefordert · " + DUELL_BILDSCHIRM.name(uid), 1500);
            if (NAVIGATION.aktuell === "duell") {
                DUELL_BILDSCHIRM._wechseln("uebersicht");
            }
        }
        return ergebnis;
    },

    async annehmen(von, zumDuell) {
        const ergebnis = await DUELL_BILDSCHIRM._tun(() => DUELL_ABGLEICH.annehmen(von));
        if (ergebnis && ergebnis.ok && zumDuell) {
            NAVIGATION.zeigen("duell", { ansicht: "uebersicht" });
        }
        return ergebnis;
    },

    async ablehnen(von) {
        return DUELL_BILDSCHIRM._tun(() => DUELL_ABGLEICH.ablehnen(von));
    },

    async zurueckziehen() {
        const ja = await DIALOG.frage("Zurückziehen?", "Duell und Einladung weg", "Zurückziehen");
        return ja ? DUELL_BILDSCHIRM._tun(() => DUELL_ABGLEICH.zurueckziehen()) : null;
    },

    async aufgeben() {
        const ja = await DIALOG.frage("Aufgeben?", DUELL_BILDSCHIRM.name(DUELL_ABGLEICH.sicht().gegner) + " gewinnt", "Aufgeben");
        return ja ? DUELL_BILDSCHIRM._tun(() => DUELL_ABGLEICH.aufgeben()) : null;
    },

    /* Das nächste Wort beginnen (oder die angefangene Runde fortsetzen). */
    async spielen() {
        const ergebnis = await DUELL_BILDSCHIRM._tun(() => DUELL_ABGLEICH.wortBeginnen());
        if (ergebnis && !ergebnis.ok && ergebnis.grund === "woanders") {
            const ja = await DIALOG.frage("Woanders begonnen", "Zählt hier als nicht gelöst", "Melden");
            if (ja) {
                await DUELL_BILDSCHIRM._tun(() => DUELL_ABGLEICH.wortAbbrechen(DUELL_ABGLEICH.sicht().nr));
            }
            return ergebnis;
        }
        if (!ergebnis || !ergebnis.ok || NAVIGATION.aktuell !== "duell") {
            return ergebnis;
        }
        DUELL_BILDSCHIRM._nr = ergebnis.eintrag.nr;
        DUELL_BILDSCHIRM._geist = ergebnis.geist;
        DUELL_BILDSCHIRM.eingabe = WORDLE.leereEingabe();
        DUELL_BILDSCHIRM._wechseln(ergebnis.eintrag.runde.zustand === "laeuft" ? "runde" : "wort");
        return ergebnis;
    },

    /* ---------------------------------------------------------------- *
     * Die Runde eines Worts
     * ---------------------------------------------------------------- */

    _eintrag() {
        return DUELL_ABGLEICH.rundeVon(DUELL_BILDSCHIRM._nr);
    },

    _rundeZeichnen(behaelter) {
        const eintrag = DUELL_BILDSCHIRM._eintrag();
        if (!eintrag) {
            DUELL_BILDSCHIRM._ansicht = "uebersicht";
            DUELL_BILDSCHIRM._uebersichtZeichnen(behaelter);
            return;
        }
        const runde = eintrag.runde;
        behaelter.appendChild(BAUSTEINE.kopfzeile("Wort " + (eintrag.nr + 1) + " von 3",
            { zurueck: () => DUELL_BILDSCHIRM._wechseln("uebersicht") }));
        const spiel = BAUSTEINE.el("div", "wordle duell-runde");

        const uhr = BAUSTEINE.el("div", "wordle-uhr duell-uhr");
        uhr.setAttribute("role", "timer");
        uhr.appendChild(BAUSTEINE.zeichen("uhr"));
        uhr.appendChild(BAUSTEINE.el("span", "wordle-uhr-zeit", "0:00"));
        spiel.appendChild(uhr);

        spiel.appendChild(DUELL_BILDSCHIRM._geistBauen());

        const brett = BAUSTEINE.el("div", "wordle-brett");
        brett.setAttribute("role", "grid");
        brett.setAttribute("aria-label", "Spielbrett");
        const bewertungen = WORDLE.bewertungen(runde);
        for (let zeile = 0; zeile < WORDLE.versucheMax(runde); zeile++) {
            const reihe = BAUSTEINE.el("div", "wordle-zeile");
            const aktiv = zeile === runde.versuche.length && runde.zustand === "laeuft";
            const buchstaben = zeile < runde.versuche.length ? Array.from(runde.versuche[zeile])
                : (aktiv ? DUELL_BILDSCHIRM.eingabe.felder : []);
            if (aktiv) {
                reihe.classList.add("wordle-zeile-aktiv");
            }
            for (let stelle = 0; stelle < WORDLE.LAENGE; stelle++) {
                const kachel = WORDLE_BILDSCHIRM._kachelBauen(buchstaben[stelle] || "",
                    bewertungen[zeile] ? bewertungen[zeile][stelle] : null);
                if (aktiv) {
                    kachel.classList.toggle("kachel-markiert", stelle === DUELL_BILDSCHIRM.eingabe.stelle);
                    kachel.addEventListener("click", () => {
                        DUELL_BILDSCHIRM.eingabe = WORDLE.eingabeWaehlen(DUELL_BILDSCHIRM.eingabe, stelle);
                        DUELL_BILDSCHIRM._zeichnen();
                    });
                }
                reihe.appendChild(kachel);
            }
            brett.appendChild(reihe);
        }
        spiel.appendChild(brett);

        /* Die Tasten entstehen in WORDLE_BILDSCHIRM._tasteBauen (die Naht für
           den 3D-Look); als Kopie ohne dessen Horcher, mit dem eigenen. */
        const zustand = WORDLE.tastenZustand(runde);
        const tastatur = BAUSTEINE.el("div", "tastatur");
        tastatur.setAttribute("aria-label", "Tastatur");
        for (const reiheTasten of WORDLE_BILDSCHIRM.TASTATUR) {
            const zeile = BAUSTEINE.el("div", "tastatur-zeile");
            for (const taste of reiheTasten) {
                const knopf = WORDLE_BILDSCHIRM._tasteBauen(taste, zustand[taste]).cloneNode(true);
                knopf.addEventListener("click", () => DUELL_BILDSCHIRM._eingeben(taste));
                zeile.appendChild(knopf);
            }
            tastatur.appendChild(zeile);
        }
        spiel.appendChild(tastatur);
        behaelter.appendChild(spiel);

        DUELL_BILDSCHIRM._tastaturAn();
        DUELL_BILDSCHIRM._uhrStarten();
        DUELL_BILDSCHIRM._uhrSchlag();
    },

    /* Der Geist: das Brett des Gegners nur in Farben; jede Zeile erscheint,
       sobald die eigene Uhr seine Zeit dieser Zeile erreicht. */
    _geistBauen() {
        const halter = BAUSTEINE.el("div", "duell-geist");
        const name = DUELL_BILDSCHIRM.name(DUELL_ABGLEICH.sicht().gegner);
        const geist = DUELL_BILDSCHIRM._geist;
        halter.appendChild(BAUSTEINE.el("span", "duell-geist-name", name));
        const muster = BAUSTEINE.el("div", "muster duell-geist-muster");
        muster.setAttribute("aria-hidden", "true");
        for (let zeile = 0; zeile < DUELL.VERSUCHE; zeile++) {
            const reihe = BAUSTEINE.el("div", "muster-zeile");
            for (let i = 0; i < WORDLE.LAENGE; i++) {
                reihe.appendChild(BAUSTEINE.el("span", "muster-feld duell-geist-feld"));
            }
            muster.appendChild(reihe);
        }
        halter.appendChild(muster);
        halter.appendChild(BAUSTEINE.el("span", "duell-geist-text", geist ? "" : "spielt nach dir"));
        return halter;
    },

    _geistZeigen(vergangen) {
        const geist = DUELL_BILDSCHIRM._geist;
        const behaelter = DUELL_BILDSCHIRM._behaelter;
        if (!geist || !behaelter) {
            return;
        }
        const zeichen = { R: "muster-richtig", V: "muster-vorhanden", F: "muster-falsch" };
        const reihen = behaelter.querySelectorAll(".duell-geist-muster .muster-zeile");
        geist.zeilen.forEach((zeile, i) => {
            if (!reihen[i] || geist.zeiten[i] > vergangen) {
                return;
            }
            Array.from(zeile).forEach((z, k) => {
                const feld = reihen[i].children[k];
                if (feld && !feld.classList.contains(zeichen[z])) {
                    feld.classList.add(zeichen[z]);
                }
            });
        });
        const text = behaelter.querySelector(".duell-geist-text");
        const fertig = geist.zeiten.length ? geist.zeiten[geist.zeiten.length - 1] : 0;
        if (text) {
            text.textContent = vergangen >= fertig ? (DUELL.zerlegen(geist.p).geloest ? "gelöst" : "nicht gelöst") : "spielt";
        }
    },

    _uhrStarten() {
        DUELL_BILDSCHIRM._uhrAnhalten();
        if (typeof window !== "undefined" && typeof window.setInterval === "function") {
            DUELL_BILDSCHIRM._uhr = window.setInterval(() => DUELL_BILDSCHIRM._uhrSchlag(), DUELL_BILDSCHIRM.UHR_TAKT_MS);
        }
    },

    _uhrAnhalten() {
        if (DUELL_BILDSCHIRM._uhr) {
            window.clearInterval(DUELL_BILDSCHIRM._uhr);
            DUELL_BILDSCHIRM._uhr = null;
        }
    },

    _uhrSchlag() {
        const eintrag = DUELL_BILDSCHIRM._eintrag();
        const behaelter = DUELL_BILDSCHIRM._behaelter;
        if (!eintrag || !behaelter || DUELL_BILDSCHIRM._ansicht !== "runde" || NAVIGATION.aktuell !== "duell") {
            DUELL_BILDSCHIRM._uhrAnhalten();
            return;
        }
        const vergangen = Math.max(0, DUELL_ABGLEICH.jetzt() - eintrag.ab);
        const feld = behaelter.querySelector(".duell-uhr .wordle-uhr-zeit");
        if (feld) {
            feld.textContent = DUELL_BILDSCHIRM.zeitText(vergangen);
        }
        DUELL_BILDSCHIRM._geistZeigen(vergangen);
    },

    _tastaturAn() {
        if (DUELL_BILDSCHIRM._tastenHoerer || typeof document.addEventListener !== "function") {
            return;
        }
        DUELL_BILDSCHIRM._tastenHoerer = (ereignis) => DUELL_BILDSCHIRM._beiTaste(ereignis);
        document.addEventListener("keydown", DUELL_BILDSCHIRM._tastenHoerer);
    },

    _tastaturAus() {
        if (DUELL_BILDSCHIRM._tastenHoerer) {
            document.removeEventListener("keydown", DUELL_BILDSCHIRM._tastenHoerer);
            DUELL_BILDSCHIRM._tastenHoerer = null;
        }
    },

    _beiTaste(ereignis) {
        if (NAVIGATION.aktuell !== "duell" || DUELL_BILDSCHIRM._ansicht !== "runde"
                || document.body.classList.contains("dialog-offen")
                || ereignis.ctrlKey || ereignis.metaKey || ereignis.altKey) {
            return;
        }
        const taste = ereignis.key;
        if (taste === "Enter") {
            ereignis.preventDefault();
            DUELL_BILDSCHIRM._eingeben("eingabe");
        } else if (taste === "Backspace") {
            ereignis.preventDefault();
            DUELL_BILDSCHIRM._eingeben("loeschen");
        } else if (taste === "ArrowLeft" || taste === "ArrowRight") {
            ereignis.preventDefault();
            DUELL_BILDSCHIRM.eingabe = WORDLE.eingabeSchieben(DUELL_BILDSCHIRM.eingabe, taste === "ArrowLeft" ? -1 : 1);
            DUELL_BILDSCHIRM._zeichnen();
        } else if (taste.length === 1 && WORDLE.BUCHSTABEN.indexOf(taste.toLowerCase()) !== -1) {
            DUELL_BILDSCHIRM._eingeben(taste.toLowerCase());
        }
    },

    async _eingeben(taste) {
        const eintrag = DUELL_BILDSCHIRM._eintrag();
        if (DUELL_BILDSCHIRM._sperre || !eintrag || eintrag.runde.zustand !== "laeuft") {
            return;
        }
        if (taste === "loeschen") {
            DUELL_BILDSCHIRM.eingabe = WORDLE.eingabeLoeschen(DUELL_BILDSCHIRM.eingabe);
            DUELL_BILDSCHIRM._zeichnen();
            return;
        }
        if (taste !== "eingabe") {
            DUELL_BILDSCHIRM.eingabe = WORDLE.eingabeTippen(DUELL_BILDSCHIRM.eingabe, taste);
            DUELL_BILDSCHIRM._zeichnen();
            return;
        }
        DUELL_BILDSCHIRM._sperre = true;
        let antwort = null;
        try {
            antwort = await DUELL_ABGLEICH.raten(DUELL_BILDSCHIRM._nr, WORDLE.eingabeWort(DUELL_BILDSCHIRM.eingabe));
        } finally {
            DUELL_BILDSCHIRM._sperre = false;
        }
        if (antwort.fehler) {
            DIALOG.kurzmeldung(WORDLE.fehlerText(antwort.fehler) || "Nicht möglich", 1200);
            return;
        }
        DUELL_BILDSCHIRM.eingabe = WORDLE.leereEingabe();
        if (antwort.fertig) {
            DUELL_BILDSCHIRM._geist = DUELL.geist(DUELL_ABGLEICH.lage && DUELL_ABGLEICH.lage.duell,
                DUELL_ABGLEICH.sicht().rolle, DUELL_BILDSCHIRM._nr);
            DUELL_BILDSCHIRM._wechseln("wort");
            return;
        }
        DUELL_BILDSCHIRM._zeichnen();
    },

    /* --- Nach dem Wort ----------------------------------------------- */

    _wortZeichnen(behaelter) {
        const eintrag = DUELL_BILDSCHIRM._eintrag();
        const lage = DUELL_ABGLEICH.lage;
        const sicht = DUELL_ABGLEICH.sicht();
        const nr = DUELL_BILDSCHIRM._nr;
        behaelter.appendChild(BAUSTEINE.kopfzeile("Wort " + (nr + 1) + " von 3",
            { zurueck: () => DUELL_BILDSCHIRM._wechseln("uebersicht") }));
        const ort = BAUSTEINE.el("div", "duell");
        if (!eintrag || !lage || !lage.duell || !sicht.rolle) {
            DUELL_BILDSCHIRM._wechseln("uebersicht");
            return;
        }
        const d = lage.duell;
        const eigenP = DUELL._p(d, sicht.rolle, nr);
        const geist = DUELL.geist(d, sicht.rolle, nr);
        const wort = BAUSTEINE.el("p", "wordle-ende-loesung");
        wort.appendChild(BAUSTEINE.el("span", "wordle-ende-wort-titel", "Lösung"));
        wort.appendChild(BAUSTEINE.el("strong", null, eintrag.runde.loesung.toUpperCase()));
        ort.appendChild(wort);

        const vergleich = BAUSTEINE.el("div", "duell-vergleich");
        const links = BAUSTEINE.el("div", "duell-seite");
        links.appendChild(BAUSTEINE.el("span", "duell-vs-name", "Du"));
        const brett = BAUSTEINE.el("div", "duell-klein-brett");
        const bewertungen = WORDLE.bewertungen(eintrag.runde);
        eintrag.runde.versuche.forEach((versuch, zeile) => {
            const reihe = BAUSTEINE.el("div", "wordle-zeile");
            Array.from(versuch).forEach((b, i) => reihe.appendChild(WORDLE_BILDSCHIRM._kachelBauen(b, bewertungen[zeile][i])));
            brett.appendChild(reihe);
        });
        links.appendChild(brett);
        links.appendChild(BAUSTEINE.el("span", "duell-wort-ich", eigenP !== null ? DUELL_BILDSCHIRM.pText(eigenP) : "wird gesendet"));
        vergleich.appendChild(links);

        const rechts = BAUSTEINE.el("div", "duell-seite");
        rechts.appendChild(BAUSTEINE.el("span", "duell-vs-name", DUELL_BILDSCHIRM.name(sicht.gegner)));
        if (geist) {
            const muster = BAUSTEINE.el("div", "muster duell-muster-gross");
            const klasse = { R: "muster-richtig", V: "muster-vorhanden", F: "muster-falsch" };
            geist.zeilen.forEach((zeile) => {
                const reihe = BAUSTEINE.el("div", "muster-zeile");
                Array.from(zeile).forEach((z) => reihe.appendChild(BAUSTEINE.el("span", "muster-feld " + klasse[z])));
                muster.appendChild(reihe);
            });
            rechts.appendChild(muster);
            rechts.appendChild(BAUSTEINE.el("span", "duell-wort-er", DUELL_BILDSCHIRM.pText(geist.p)));
        } else {
            rechts.appendChild(BAUSTEINE.el("p", "duell-leise", "spielt noch"));
        }
        vergleich.appendChild(rechts);
        ort.appendChild(vergleich);

        const w = DUELL.stand(d, DUELL_ABGLEICH.jetzt()).woerter[nr];
        if (w && w.holt) {
            const ich = w.holt === sicht.rolle;
            if (ich) {
                ort.appendChild(DUELL_BILDSCHIRM._platz("duell/wort-geholt", "120x120", "duell-geholt-bild"));
            }
            ort.appendChild(BAUSTEINE.el("p", "duell-lage",
                w.holt === "beide" ? "beide holen das Wort" : (ich ? "Du holst das Wort" : DUELL_BILDSCHIRM.name(sicht.gegner) + " holt das Wort")));
        }
        if (DUELL_ABGLEICH.wartet().length) {
            ort.appendChild(BAUSTEINE.el("p", "duell-leise", "wird gesendet, sobald Netz da ist"));
        }
        const knoepfe = BAUSTEINE.el("div", "duell-knoepfe");
        knoepfe.appendChild(DUELL_BILDSCHIRM._knopf("Weiter", "haupt", () => {
            DUELL_BILDSCHIRM._wechseln("uebersicht");
            DUELL_ABGLEICH.lageHolen();
        }));
        ort.appendChild(knoepfe);
        behaelter.appendChild(ort);
    }
};

if (typeof module !== "undefined" && module.exports) {
    module.exports = DUELL_BILDSCHIRM;
}
