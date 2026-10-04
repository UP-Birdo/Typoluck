/*
 * bildschirm-shop.js — der Tab „Shop" (seit 0.17.0, Platz 5 der Leiste statt
 * „Bald"; wie Blunderluck v0.152.0).
 *
 * Nutzer 27.09.2026: „wir brauchen eine In-Game-Währung, die über beide
 * Spiele geht; mit denen kann man sich Extra-Leben, Tipps und Schild für
 * Flammen kaufen in einem Shop" · „Shop auf dem Platz von Bald soll der
 * kommen". Nutzer 03.10.2026: „Der shop soll endlich mal gemacht werden".
 * Den Tab zeichnet der gemeinsame Baustein js/upcrew-shop.js; die Münzen
 * rechnet js/upcrew-muenzen.js (Summe über alle Zweige des gemeinsamen
 * Fortschritts). Hier nur, was Typoluck eigen ist:
 *   - woher der Stand kommt (APP.fortschritt: Gerät + Konto) und wie ein
 *     Kauf gebucht wird (APP.kaufen: nur im eigenen Zweig);
 *   - was die Waren IN Typoluck tun (die Texte des Bausteins beschreiben
 *     Blunderluck): Extra-Leben = ein 7. Versuch, Tipp = ein richtiger
 *     Buchstabe an seiner Stelle (das Schild ist seit 0.26.0 weg).
 *     Seit 0.17.1 über die Baustein-Option `texte` (UPCREW_SHOP.bauen /
 *     UPCREW_SHOP.text) — UPCREW_MUENZEN.WAREN bleibt unverändert.
 *
 * SEIT 0.31.0 MIT DESIGN-REITER UND BESITZ (UPCrew-Runde 8): Neben dem
 * Vorrat („Typoluck") steht der Reiter „Design" — Angebot des Tages,
 * Design-Pakete, Einzelteile aus dem gemeinsamen Katalog
 * (js/upcrew-katalog.js). Preise, Pakete und Stufen stehen NUR dort. Eigen
 * ist hier:
 *   - der Besitz der Person von jetzt (js/besitz.js) und was sie auf dem
 *     heutigen Weg schon frei hat (`frei` — Taten, Level; js/sammlung.js);
 *   - der Kauf eines Stücks: kurze Rückfrage, dann APP.kaufenStueck (erst
 *     Besitz, dann Münzen), Kurzmeldung; neu zeichnet der Baustein selbst;
 *   - die ANPROBE: ein Stück oder ein Paket probeweise zeigen. Nichts wird
 *     gespeichert; oben liegt ein Streifen „Anprobe beenden"; ein
 *     Tab-Wechsel beendet sie.
 * DIE SEITE BLEIBT STEHEN: Der Baustein wird EINMAL gebaut; wird die Seite
 * neu gezeichnet (Einrasten des Bandes, neue Daten), hängt dieselbe Fläche
 * wieder ein und zeichnet sich frisch — der gewählte Reiter und offene
 * Blätter bleiben. Nichts auf der Seite rollt waagrecht.
 */

const SHOP_BILDSCHIRM = {

    TITEL: "Shop",

    /* Was die Waren in Typoluck tun (spieleigen; Option `texte` des Bausteins). */
    TEXTE: {
        leben: { text: "Ein 7. Versuch, wenn der 6. danebengeht" },
        tipp: { text: "Deckt einen richtigen Buchstaben an seiner Stelle auf" }
    },

    /* Das Wort der Kachel-Probe im Streifen der Anprobe (Buchstabe, Art). */
    PROBE_KACHELN: [["l", "richtig"], ["e", "vorhanden"], ["s", "falsch"], ["e", "richtig"], ["n", "falsch"]],

    _griff: null,
    _wurzel: null,

    /* Der gewählte Reiter ("design" | "vorrat") — gilt weiter, auch wenn die
       Seite ohne Band neu gebaut wird. */
    _teil: null,

    /* Die laufende Anprobe: { name, farbwelt, schrift, knoepfe, kachelset }. */
    _anprobe: null,

    /* Was der Spieler auf dem heutigen Weg frei hat — je Zeichnung einmal
       gelesen (der Baustein fragt je Stück mehrfach). */
    _lage: null,

    anmelden() {
        NAVIGATION.anmelden({
            id: "shop",
            titel: SHOP_BILDSCHIRM.TITEL,
            zeichen: "shop",
            imMenue: false,
            zeigen: (behaelter) => SHOP_BILDSCHIRM.zeigen(behaelter),
            verlassen: () => SHOP_BILDSCHIRM.verlassen()
        });
    },

    /* Seit 0.29.0 (Seiten-Band): Die Seite bleibt im Band stehen, der Griff
       gilt weiter. Nur ohne Band wie bis 0.28.1. Seit 0.31.0 endet hier
       auch eine Anprobe (Tab-Wechsel). */
    verlassen() {
        SHOP_BILDSCHIRM.anprobeBeenden();
        if (!NAVIGATION.imBand("shop")) {
            SHOP_BILDSCHIRM._griff = null;
            SHOP_BILDSCHIRM._wurzel = null;
        }
    },

    zeigen(behaelter) {
        if (typeof UPCREW_SHOP === "undefined" || typeof UPCREW_MUENZEN === "undefined") {
            behaelter.appendChild(BAUSTEINE.kopfzeile(SHOP_BILDSCHIRM.TITEL));
            behaelter.appendChild(ZUSTAND.fehler({ text: "Nicht geladen" }));
            return;
        }
        /* Schon gebaut: dieselbe Fläche wieder einhängen und frisch zeichnen
           (Reiter und offene Blätter bleiben). */
        if (SHOP_BILDSCHIRM._griff && SHOP_BILDSCHIRM._wurzel) {
            behaelter.appendChild(SHOP_BILDSCHIRM._wurzel);
            SHOP_BILDSCHIRM.zeichnen();
            return;
        }
        /* Wie die Sammlung: der Tab direkt im rollenden Inhalt (klebender Kopf). */
        const wurzel = BAUSTEINE.el("section");
        behaelter.appendChild(wurzel);
        SHOP_BILDSCHIRM._wurzel = wurzel;
        SHOP_BILDSCHIRM._griff = UPCREW_SHOP.bauen(wurzel, {
            titel: SHOP_BILDSCHIRM.TITEL,
            lesen: () => APP.fortschritt(),
            texte: SHOP_BILDSCHIRM.TEXTE,
            kaufen: (ware) => SHOP_BILDSCHIRM.kaufen(ware),
            /* Seit 0.31.0: der Reiter „Design" (Katalog, Besitz, Kauf). */
            spiel: "typoluck",
            spielName: "Typoluck",
            besitz: () => SHOP_BILDSCHIRM.besitz(),
            heute: () => WORDLE.datumText(APP.jetzt()),
            frei: (art, wert) => SHOP_BILDSCHIRM.frei(art, wert),
            kaufenStueck: (stueck, preis) => SHOP_BILDSCHIRM.kaufenStueck(stueck, preis),
            anprobieren: (stuecke) => SHOP_BILDSCHIRM.anprobieren(stuecke),
            bildVon: (stueck) => SHOP_BILDSCHIRM.bildVon(stueck),
            teil: SHOP_BILDSCHIRM._teil || "design",
            beiTeil: (teil) => {
                SHOP_BILDSCHIRM._teil = teil;
            }
        });
    },

    /* Nach neuen Daten (Konto-Stand, eine Runde) neu zeichnen. */
    zeichnen() {
        SHOP_BILDSCHIRM._lage = null;
        if (SHOP_BILDSCHIRM._griff) {
            SHOP_BILDSCHIRM._griff.zeichnen();
        }
    },

    /* Ein Stück aus der Sammlung öffnen (seit 0.34.5, „Im Shop ansehen",
       js\bildschirm-sammlung.js `zumShop`): Reiter „Design", dann das
       Stück-Blatt "stueck:<art>-<wert>" (= UPCREW_KATALOG.kennung). Nur,
       wenn die Shop-Seite offen und gebaut ist; sonst und bei jedem Fehler
       nichts (es bleibt beim Tab-Wechsel). Liefert, ob das Blatt offen ist. */
    stueckOeffnen(art, wert) {
        const griff = SHOP_BILDSCHIRM._griff;
        if (!griff || typeof griff.oeffnen !== "function" || !art || !wert
                || (typeof NAVIGATION !== "undefined" && NAVIGATION.aktuell && NAVIGATION.aktuell !== "shop")) {
            return false;
        }
        try {
            if (typeof griff.teilSetzen === "function") {
                griff.teilSetzen("design");
            }
            return griff.oeffnen("stueck:" + art + "-" + wert) === true;
        } catch (fehler) {
            return false;
        }
    },

    /* ---------------------------------------------------------------- *
     * Der Vorrat (wie bisher)
     * ---------------------------------------------------------------- */

    async kaufen(ware) {
        const w = UPCREW_MUENZEN.WAREN[ware];
        if (!w) {
            return false;
        }
        const name = UPCREW_SHOP.text(ware, SHOP_BILDSCHIRM.TEXTE).name;
        const ja = await DIALOG.frage(name + " kaufen?", w.preis + " " + UPCREW_MUENZEN.WAEHRUNG.name, "Kaufen");
        if (!ja) {
            return false;
        }
        const r = APP.kaufen(ware);
        if (!r.ok) {
            DIALOG.kurzmeldung(r.grund === "voll" ? "Vorrat voll" : "Zu wenig " + UPCREW_MUENZEN.WAEHRUNG.name);
            return false;
        }
        DIALOG.kurzmeldung(name + " gekauft");
        return true;
    },

    /* ---------------------------------------------------------------- *
     * Design: Besitz, frei, Kauf (seit 0.31.0)
     * ---------------------------------------------------------------- */

    /* Die Menge der Person von jetzt (Gerät + Konto vereinigt). */
    besitz() {
        return (typeof BESITZ !== "undefined") ? BESITZ.menge() : {};
    },

    /* Auf dem heutigen Weg schon frei (Taten, Level) — der Shop zeigt es
       als „im Besitz" und verkauft es nicht noch einmal. Dieselbe Rechnung
       wie in der Sammlung (js/sammlung.js `erspielt`). */
    frei(art, wert) {
        if (typeof SAMMLUNG_BILDSCHIRM === "undefined" || typeof SAMMLUNG === "undefined") {
            return false;
        }
        if (!SHOP_BILDSCHIRM._lage) {
            SHOP_BILDSCHIRM._lage = {
                taten: SAMMLUNG_BILDSCHIRM._taten(),
                alleFrei: SAMMLUNG_BILDSCHIRM._alleFrei(),
                level: SAMMLUNG_BILDSCHIRM.stufe(),
                frei: {}
            };
            /* Gilt für diesen Zug — danach wird frisch gelesen. */
            Promise.resolve().then(() => {
                SHOP_BILDSCHIRM._lage = null;
            });
        }
        const lage = SHOP_BILDSCHIRM._lage;
        const kennung = art + "/" + wert;
        if (!(kennung in lage.frei)) {
            lage.frei[kennung] = SAMMLUNG.erspielt(art, wert, lage.taten, lage.alleFrei, lage.level);
        }
        return lage.frei[kennung];
    },

    /* Das Bild eines Stücks: Typoluck liefert kein eigenes — es bleibt der
       Platz des Bausteins („stueck/<art>/<wert>"), den der Nutzer füllt. */
    bildVon(stueck) {
        return "";
    },

    /* Ein Stück (oder Paket) kaufen: kurz fragen, dann rechnen und speichern
       (APP.kaufenStueck: erst Besitz, dann Münzen), Kurzmeldung. Gebucht
       wird der Preis, den der Baustein beim Kauf rechnet. */
    /* Seit 0.33.1 (Prüfung Besitz Fund 2/3): Ist ein Konto gemerkt, aber
       sein Besitz noch nicht abgeglichen (`APP.kaufBereit`), führt der
       Kauf-Knopf nur zu dieser Kurzmeldung — gebucht wird nichts. Ein
       echter Gast kauft wie bisher; Anprobieren geht immer. */
    KAUF_WARTET: "Kaufen geht, sobald dein Konto geladen ist",

    async kaufenStueck(stueck, preis) {
        if (!stueck || typeof APP.kaufenStueck !== "function") {
            return false;
        }
        if (typeof APP.kaufBereit === "function" && !APP.kaufBereit()) {
            DIALOG.kurzmeldung(SHOP_BILDSCHIRM.KAUF_WARTET);
            return false;
        }
        const waehrung = UPCREW_MUENZEN.WAEHRUNG.name;
        const ja = await DIALOG.frage(stueck.name + " kaufen?", preis + " " + waehrung, "Kaufen");
        if (!ja) {
            return false;
        }
        const r = APP.kaufenStueck(stueck.art, stueck.wert);
        SHOP_BILDSCHIRM._lage = null;
        if (!r.ok) {
            /* „laedt": während der Rückfrage unbereit geworden; „speicher":
               das Gerät nahm den Besitz nicht an (Fund 6). Beides: nichts
               gebucht. */
            DIALOG.kurzmeldung(r.grund === "laedt" ? SHOP_BILDSCHIRM.KAUF_WARTET
                : r.grund === "speicher" ? "Nicht gekauft · Speicher voll"
                    : r.grund === "zuWenig" ? "Zu wenig " + waehrung : "Nicht kaufbar");
            return false;
        }
        DIALOG.kurzmeldung(stueck.name + " gekauft");
        return true;
    },

    /* ---------------------------------------------------------------- *
     * Die Anprobe (seit 0.31.0): zeigen, nichts speichern
     * ---------------------------------------------------------------- */

    /* Rückruf des Bausteins: ein Stück oder der Inhalt eines Pakets. Gezeigt
       wird, was Typoluck anwenden kann — Farbwelt, Schrift, Knöpfe und das
       Kachel-Set. */
    anprobieren(stuecke) {
        const liste = (Array.isArray(stuecke) ? stuecke : []).filter((s) => s && s.art && s.wert);
        if (!liste.length) {
            return;
        }
        const anprobe = { name: liste.length === 1 ? liste[0].name : "Paket " + liste[0].name };
        for (const s of liste) {
            if (["farbwelt", "schrift", "knoepfe", "kachelset"].indexOf(s.art) !== -1) {
                anprobe[s.art] = s.wert;
            }
        }
        SHOP_BILDSCHIRM._anprobe = anprobe;
        SHOP_BILDSCHIRM._anprobeAnwenden();
    },

    /* `still` = das echte Aussehen wurde eben schon angewendet (js/app.js,
       Wechsel des Aussehens): nur noch den Streifen wegnehmen. */
    anprobeBeenden(still) {
        if (!SHOP_BILDSCHIRM._anprobe) {
            return;
        }
        SHOP_BILDSCHIRM._anprobe = null;
        if (still) {
            if (typeof KACHELSETS !== "undefined") {
                KACHELSETS.anwenden();
            }
            SHOP_BILDSCHIRM._streifenZeichnen();
            return;
        }
        SHOP_BILDSCHIRM._anprobeAnwenden();
    },

    /* Erst das echte Aussehen (was gespeichert ist), dann die Anprobe
       darüber. Gespeichert wird nichts. */
    _anprobeAnwenden() {
        const html = document.documentElement;
        if (typeof DARSTELLUNG !== "undefined") {
            DARSTELLUNG.anwenden();
        } else {
            UPCREW_AUSSEHEN.anwenden();
        }
        KACHELSETS.anwenden();
        const a = SHOP_BILDSCHIRM._anprobe;
        if (a) {
            if (a.farbwelt) {
                UPCREW_FARBWELTEN.anwenden(a.farbwelt, UPCREW_AUSSEHEN.modus(), html);
            }
            if (a.schrift) {
                UPCREW_AUSSEHEN.schriftLaden(a.schrift);
                html.style.setProperty("--schrift-familie", "\"Crew " + a.schrift + "\", system-ui, sans-serif");
            }
            if (a.knoepfe) {
                html.dataset.knoepfe = a.knoepfe;
            }
            if (a.kachelset) {
                KACHELSETS.anwenden(a.kachelset);
            }
        }
        SHOP_BILDSCHIRM._streifenZeichnen();
    },

    /* Der Streifen oben: Name, „Anprobe beenden", bei einem Kachel-Set dazu
       fünf Kacheln (auf der Shop-Seite stehen sonst keine). Er liegt fest
       über der Seite (`#anprobe` in index.html), nie in ihr. */
    _streifenZeichnen() {
        const streifen = document.getElementById("anprobe");
        if (!streifen) {
            return;
        }
        const a = SHOP_BILDSCHIRM._anprobe;
        streifen.textContent = "";
        streifen.hidden = !a;
        if (!a) {
            return;
        }
        const kopf = BAUSTEINE.el("div", "anprobe-kopf");
        kopf.appendChild(BAUSTEINE.el("span", "anprobe-name", a.name));
        kopf.appendChild(BAUSTEINE.knopf({ text: "Anprobe beenden", art: "still", klein: true,
            beiKlick: () => SHOP_BILDSCHIRM.anprobeBeenden() }));
        streifen.appendChild(kopf);
        if (a.kachelset && typeof WORDLE_BILDSCHIRM !== "undefined") {
            const reihe = BAUSTEINE.el("div", "anprobe-kacheln");
            reihe.setAttribute("aria-hidden", "true");
            for (const [buchstabe, art] of SHOP_BILDSCHIRM.PROBE_KACHELN) {
                reihe.appendChild(WORDLE_BILDSCHIRM._kachelBauen(buchstabe, art));
            }
            streifen.appendChild(reihe);
        }
    }
};
