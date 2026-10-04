/*
 * test-veraltet.js — Seiten im Band nur neu zeichnen, wenn sie veraltet sind
 * (seit 0.33.0; Einbindung in js\navigation.js, mit dem ECHTEN Baustein
 * js\upcrew-wischen.js an einem kleinen nachgebauten DOM wie in
 * test-wischen.js).
 *
 * TEIL 1 — DER BESTAND (galt schon vor 0.33.0 und muss weiter gelten):
 *   Nach jedem Auslöser, der etwas ändert (Anmeldung/Abmeldung, Abgleich mit
 *   neuem Stand, Aussehen = `auffrischen`; eine Runde; ein Kauf), zeigt JEDE
 *   Seite beim nächsten Besuch den neuen Stand — beim Tipp auf die Leiste
 *   wie beim Wischen.
 *
 * TEIL 2 — NEU SEIT 0.33.0:
 *   Wechsel ohne Änderung = kein Neu-Zeichnen; nach einem Auslöser genau ein
 *   Neu-Zeichnen je besuchter Seite; kein doppeltes Zeichnen beim Einrasten;
 *   veraltete Nachbarseiten im Leerlauf; der Zustand der Seite (Inhalt,
 *   Rollstand) bleibt; `geoeffnet` meldet das Öffnen ohne Neu-Zeichnen.
 *
 * Die Bildschirme hier zeichnen einen Absatz „<id>@<Stand>" — der Stand ist
 * eine Variable des Tests und steht für alles, was eine Seite zeigt (Münzen,
 * Name, Level, Tageswort).
 */

const fs = require("fs");
const pfad = require("path");
const vm = require("vm");
const { pruefe, gleich, fazit } = require("./pruefer.js");

const wurzel = pfad.join(__dirname, "..");
const lesen = (name) => fs.readFileSync(pfad.join(wurzel, name), "utf8");
const W = require("../js/upcrew-wischen.js");

const BREITE = 390;
const LEISTE = ["shop", "sammlung", "start", "herausforderungen", "rangliste"];

/* ------------------------------------------------------------------ *
 * Ein kleines DOM (wie test-wischen.js)
 * ------------------------------------------------------------------ */

function neuesElement(tag) {
    const el = {
        tagName: String(tag).toUpperCase(),
        nodeType: 1,
        kinder: [],
        parentNode: null,
        attribute: {},
        dataset: {},
        hidden: false,
        inert: false,
        scrollTop: 0,
        _text: "",
        horcher: {},
        style: { setProperty(n, w) { this[n] = w; } },
        get children() { return this.kinder; },
        get firstChild() { return this.kinder[0] || null; },
        get className() { return this.attribute["class"] || ""; },
        set className(w) { this.attribute["class"] = String(w); },
        get textContent() { return this._text + this.kinder.map((k) => k.textContent).join(""); },
        set textContent(w) { this.kinder = []; this._text = String(w); },
        set innerHTML(w) { this.kinder.forEach((k) => { k.parentNode = null; }); this.kinder = []; this._text = ""; },
        get innerHTML() { return ""; },
        appendChild(k) {
            if (k.parentNode) {
                k.parentNode.removeChild(k);
            }
            this.kinder.push(k);
            k.parentNode = this;
            return k;
        },
        removeChild(k) {
            this.kinder = this.kinder.filter((x) => x !== k);
            k.parentNode = null;
            return k;
        },
        setAttribute(n, w) { this.attribute[n] = String(w); },
        getAttribute(n) { return (n in this.attribute) ? this.attribute[n] : null; },
        removeAttribute(n) { delete this.attribute[n]; },
        addEventListener(art, f) { this.horcher[art] = f; },
        removeEventListener(art) { delete this.horcher[art]; },
        querySelector() { return null; },
        querySelectorAll() { return []; }
    };
    el.classList = {
        add(...n) { const l = el.className.split(" ").filter(Boolean); for (const x of n) { if (l.indexOf(x) === -1) { l.push(x); } } el.className = l.join(" "); },
        remove(...n) { el.className = el.className.split(" ").filter((x) => x && n.indexOf(x) === -1).join(" "); },
        toggle(n, an) { const soll = (an === undefined) ? !this.contains(n) : !!an; if (soll) { this.add(n); } else { this.remove(n); } return soll; },
        contains(n) { return el.className.split(" ").indexOf(n) !== -1; }
    };
    return el;
}

/*
 * Eine Welt. wahl:
 *   mitBlatt   js\upcrew-blatt.js laden, Halter der Blätter mitgeben
 *   ohneBand   NAVIGATION.starten ohne Band-Element (Rückfall)
 */
function welt(wahl) {
    const o = wahl || {};
    const koerper = neuesElement("body");
    const wurzelEl = neuesElement("html");
    const dokument = {
        body: koerper,
        documentElement: wurzelEl,
        createElement: neuesElement,
        createElementNS: (ns, t) => neuesElement(t),
        addEventListener() { },
        querySelector: () => null,
        querySelectorAll: () => []
    };
    const verlauf = [];
    const leerlauf = [];
    const umgebung = {
        console, setTimeout, clearTimeout,
        document: dokument,
        history: { state: null, length: 1, pushState(z) { verlauf.push("neu:" + z.id); }, replaceState(z) { verlauf.push("ersetzt:" + z.id); }, back() { } },
        requestIdleCallback: (f) => leerlauf.push(f),
        MutationObserver: function () {
            this.observe = () => { };
        },
        scrollY: 0,
        scrollTo() { },
        addEventListener() { }
    };
    umgebung.window = umgebung;
    umgebung.UPCREW_WISCHEN = W;
    vm.createContext(umgebung);
    vm.runInContext((o.mitBlatt ? lesen("js/upcrew-blatt.js") + "\n;" : "") + lesen("js/navigation.js")
        + "\n;globalThis.NAVIGATION = NAVIGATION;", umgebung, { filename: "navigation.js" });
    const N = umgebung.NAVIGATION;

    /* Der Stand, den jede Seite zeigt. */
    const stand = { wert: "A" };
    const gezeichnet = [];
    const geoeffnet = [];
    const bildschirm = (id, alsBlatt) => N.anmelden({
        id: id, titel: id, alsBlatt: alsBlatt,
        zeigen: (behaelter) => {
            gezeichnet.push(id);
            const p = neuesElement("p");
            p.textContent = id + "@" + stand.wert;
            behaelter.appendChild(p);
        },
        geoeffnet: () => geoeffnet.push(id)
    });
    for (const id of LEISTE.concat(["wordle"])) {
        bildschirm(id, false);
    }
    bildschirm("profil", true);

    const band = neuesElement("div");
    band.className = "band up-band";
    band.ownerDocument = dokument;
    band.scrollLeft = 0;
    band.rollen = [];
    band.getBoundingClientRect = () => ({ width: band.hidden ? 0 : BREITE });
    Object.defineProperty(band, "clientWidth", { get: () => (band.hidden ? 0 : BREITE) });
    band.scrollTo = (ziel) => band.rollen.push(ziel);
    band.onscrollend = null;
    const frei = neuesElement("div");
    frei.className = "ohne-leiste";
    frei.hidden = true;
    const inhalt = neuesElement("main");
    inhalt.className = "inhalt";
    frei.appendChild(inhalt);
    const ebenen = neuesElement("div");
    koerper.appendChild(band);
    koerper.appendChild(frei);
    koerper.appendChild(ebenen);

    N.starten(inhalt, "start", null, o.mitBlatt ? ebenen : null, o.ohneBand ? undefined : band);

    const s = { N, umgebung, koerper, band, frei, inhalt, stand, gezeichnet, geoeffnet, leerlauf, verlauf };
    s.seite = (id) => band.kinder.find((k) => k.dataset.upSeite === id) || null;
    s.ort = (id) => (s.seite(id) ? s.seite(id).kinder[0] : null);
    s.text = (id) => (s.ort(id) ? s.ort(id).textContent : null);
    s.anzahl = (id) => gezeichnet.filter((g) => g === id).length;
    s.zahlen = () => LEISTE.map((id) => s.anzahl(id));
    s.rolle = (links, ende) => {
        band.scrollLeft = links;
        band.horcher.scroll({});
        if (ende) {
            band.horcher.scrollend({});
        }
    };
    s.fingerRunter = () => band.horcher.touchstart({ touches: [{}] });
    s.fingerHoch = () => band.horcher.touchend({ touches: [] });
    s.leerlaufLeeren = () => {
        let runden = 0;
        while (leerlauf.length && runden++ < 40) {
            leerlauf.shift()();
        }
    };
    /* Ein Wisch zur Nachbarseite, wie ihn das Gerät liefert: Finger zieht
       (die Nachbarseite kommt in Sicht), lässt über der Hälfte los (die
       Leiste zieht nach), das Band rollt aus und rastet ein. */
    s.wischen = (zu) => {
        const von = LEISTE.indexOf(N.aktuell);
        const nach = LEISTE.indexOf(zu);
        const r = nach > von ? 1 : -1;
        s.fingerRunter();
        s.rolle(von * BREITE + r * 120);
        s.rolle(von * BREITE + r * 250);
        s.fingerHoch();
        s.rolle(von * BREITE + r * 330);
        s.rolle(nach * BREITE, true);
    };
    /* Jede Seite einmal besuchen (Tipp auf die Leiste), am Ende wieder Start;
       liefert, was jede Seite im Augenblick ihres Besuchs zeigte. */
    s.rundgangTipp = () => {
        const gesehen = {};
        for (const id of ["shop", "rangliste", "sammlung", "herausforderungen", "start"]) {
            N.zeigen(id, null);
            s.rolle(LEISTE.indexOf(id) * BREITE, true);
            gesehen[id] = s.text(id);
        }
        return LEISTE.map((id) => gesehen[id]);
    };
    /* Dasselbe per Wisch: von Start nach rechts bis zur Rangliste, zurück
       bis zum Shop, wieder zum Start. */
    s.rundgangWisch = () => {
        const gesehen = {};
        for (const id of ["herausforderungen", "rangliste", "herausforderungen", "start", "sammlung", "shop", "sammlung", "start"]) {
            s.wischen(id);
            gesehen[id] = s.text(id);
        }
        return LEISTE.map((id) => gesehen[id]);
    };
    return s;
}

const alle = (wert) => LEISTE.map((id) => id + "@" + wert);

/* Seiten veraltet melden, wie es js\app.js seit 0.33.0 tut (vor 0.33.0 gab
   es das Glied nicht — jeder Besuch zeichnete ohnehin neu). */
const veralten = (N) => {
    if (typeof N.veralten === "function") {
        N.veralten();
    }
};

/* ================================================================== *
 * TEIL 1 — DER BESTAND: nach jedem Auslöser zeigt jede Seite beim
 * nächsten Besuch den neuen Stand
 * ================================================================== */

/* 1a. `auffrischen` (Anmeldung, Abgleich mit neuem Stand, Aussehen) — Tipp */
{
    const s = welt();
    s.leerlaufLeeren();
    gleich("Bestand: nach dem Start zeigt jede Seite den Stand vom Start", LEISTE.map((id) => s.text(id)), alle("A"));
    s.stand.wert = "B";
    s.N.auffrischen();
    gleich("Bestand: auffrischen zeichnet die offene Seite sofort neu", s.text("start"), "start@B");
    gleich("Bestand: nach auffrischen zeigt jede Seite beim Besuch (Tipp) den neuen Stand", s.rundgangTipp(), alle("B"));
}

/* 1b. … und beim Wischen */
{
    const s = welt();
    s.leerlaufLeeren();
    s.stand.wert = "B";
    s.N.auffrischen();
    gleich("Bestand: nach auffrischen zeigt jede Seite beim Besuch (Wisch) den neuen Stand", s.rundgangWisch(), alle("B"));
    s.stand.wert = "C";
    s.N.auffrischen();
    gleich("Bestand: … auch beim zweiten Mal", s.rundgangWisch(), alle("C"));
}

/* 1c. Eine Runde (Runden-Ende: Münzen, Level, Tageswort erledigt) */
{
    const s = welt();
    s.leerlaufLeeren();
    s.N.zeigen("wordle", { modus: "tag" });
    s.stand.wert = "R";
    veralten(s.N);
    s.band.scrollLeft = 0;
    s.N.zeigen("start", { bibliothek: true }, true);
    gleich("Bestand: zurück aus der Runde zeigt der Start den neuen Stand", s.text("start"), "start@R");
    gleich("Bestand: … und jede andere Seite beim Besuch (Tipp)", s.rundgangTipp(), alle("R"));

    s.N.zeigen("wordle", { modus: "uebung" });
    s.stand.wert = "S";
    veralten(s.N);
    s.band.scrollLeft = 0;
    s.N.zeigen("rangliste", null, true);
    gleich("Bestand: aus der Runde direkt zur Rangliste: neuer Stand", s.text("rangliste"), "rangliste@S");
    s.N.zeigen("start", null);
    s.rolle(2 * BREITE, true);
    gleich("Bestand: … und beim Wischen von dort", s.rundgangWisch(), alle("S"));
}

/* 1d. Eine Änderung in einem Blatt (Einstellungen, Profil): auffrischen */
{
    const s = welt({ mitBlatt: true });
    s.leerlaufLeeren();
    s.N.zeigen("profil", null);
    s.stand.wert = "P";
    s.N.auffrischen();
    gleich("Bestand: auffrischen bei offenem Blatt: die Seite dahinter und das Blatt sind neu",
        [s.text("start"), s.anzahl("profil")], ["start@P", 2]);
    gleich("Bestand: … und jede andere Seite beim Besuch", s.rundgangTipp(), alle("P"));
}

/* 1e. Eine Änderung, während die offene Seite ungestört bleibt (Sammlung,
       Kauf im Shop: js\app.js zeichnet die offene Seite dann nicht neu) */
{
    const s = welt();
    s.leerlaufLeeren();
    s.N.zeigen("sammlung", null);
    s.rolle(BREITE, true);
    s.stand.wert = "K";
    veralten(s.N);
    gleich("Bestand: jede andere Seite zeigt beim Besuch den neuen Stand", s.rundgangTipp(), alle("K"));
    s.N.zeigen("sammlung", null);
    s.rolle(BREITE, true);
    gleich("Bestand: … und die ungestörte Seite beim nächsten Besuch auch", s.text("sammlung"), "sammlung@K");
}

/* 1f. Dieselbe Seite noch einmal zeigen (Abmeldung: zeigen("start", null,
       true) auf dem Start) zeichnet sie neu */
{
    const s = welt();
    s.leerlaufLeeren();
    s.stand.wert = "X";
    s.N.zeigen("start", null, true);
    gleich("Bestand: dieselbe Seite noch einmal gezeigt = neu gezeichnet", s.text("start"), "start@X");
}

/* ================================================================== *
 * TEIL 2 — NEU SEIT 0.33.0
 * ================================================================== */

const differenz = (s, vorher) => s.zahlen().map((n, i) => n - vorher[i]);

/* 2a. Wechsel ohne Änderung = kein Neu-Zeichnen */
{
    const s = welt();
    s.leerlaufLeeren();
    gleich("Nach Start und Leerlauf ist jede Seite genau einmal gezeichnet", s.zahlen(), [1, 1, 1, 1, 1]);
    s.rundgangTipp();
    gleich("Rundgang per Tipp ohne Änderung: nichts wird neu gezeichnet", s.zahlen(), [1, 1, 1, 1, 1]);
    s.rundgangWisch();
    gleich("Rundgang per Wisch ohne Änderung: nichts wird neu gezeichnet", s.zahlen(), [1, 1, 1, 1, 1]);
    for (let i = 0; i < 5; i++) {
        s.wischen("herausforderungen");
        s.wischen("start");
    }
    gleich("Fünfmal hin und her gewischt: kein einziges Neu-Zeichnen", s.zahlen(), [1, 1, 1, 1, 1]);
    s.leerlaufLeeren();
    gleich("… auch der Leerlauf zeichnet danach nichts", s.zahlen(), [1, 1, 1, 1, 1]);
    gleich("Jeder Besuch wurde dem Bildschirm trotzdem gemeldet (geoeffnet): 5 Tipps + 8 Wische + 10 Wische",
        s.geoeffnet.length, 23);
    gleich("… der Wechsel selbst läuft wie bisher (Leiste, Verlauf)", [s.N.aktuell, s.verlauf.filter((v) => v.indexOf("neu:") === 0).length],
        ["start", 23]);
    gleich("… und <body> trägt den offenen Bildschirm, auch ohne Zeichnen", s.koerper.dataset.bildschirm, "start");
    s.N.zeigen("shop", null);
    gleich("… auch gleich nach dem Wechsel", s.koerper.dataset.bildschirm, "shop");
}

/* 2b. Nach `auffrischen` genau ein Neu-Zeichnen je besuchter Seite */
{
    const s = welt();
    s.leerlaufLeeren();
    const vorher = s.zahlen();
    s.stand.wert = "B";
    s.N.auffrischen();
    gleich("auffrischen: sofort nur die offene Seite", differenz(s, vorher), [0, 0, 1, 0, 0]);
    gleich("… für die Nachbarn ist der Leerlauf bestellt (einmal)", s.leerlauf.length, 1);
    s.N.auffrischen();
    gleich("… ein zweites auffrischen bestellt keinen zweiten", [s.leerlauf.length, differenz(s, vorher)], [1, [0, 0, 2, 0, 0]]);
    s.leerlaufLeeren();
    gleich("Leerlauf: die veralteten NACHBARN (Sammlung, Aufgaben) sind nachgezeichnet, je einmal — die übrigen nicht",
        differenz(s, vorher), [0, 1, 2, 1, 0]);
    gleich("… sie zeigen schon den neuen Stand, bevor jemand wischt",
        [s.text("sammlung"), s.text("herausforderungen"), s.text("shop")], ["sammlung@B", "herausforderungen@B", "shop@A"]);
    const mitte = s.zahlen();
    gleich("Rundgang per Wisch: jede Seite zeigt den neuen Stand", s.rundgangWisch(), alle("B"));
    gleich("… gezeichnet wurden dabei nur noch die zwei, die noch veraltet waren — je genau einmal",
        differenz(s, mitte), [1, 0, 0, 0, 1]);
    s.leerlaufLeeren();
    s.rundgangTipp();
    gleich("… und danach nichts mehr", differenz(s, mitte), [1, 0, 0, 0, 1]);
}

/* 2c. Eine veraltete Seite wird gezeichnet, sobald sie in Sicht kommt —
       beim Wechsel über der Hälfte und beim Einrasten nicht noch einmal */
{
    const s = welt();
    s.leerlaufLeeren();
    s.stand.wert = "B";
    s.N.auffrischen();
    /* Der Leerlauf ist bestellt, war aber noch nicht so weit. */
    const vorher = s.zahlen();
    s.fingerRunter();
    s.rolle(2 * BREITE + 60);
    gleich("Die veraltete Nachbarseite kommt in Sicht: jetzt gezeichnet, mit dem neuen Stand",
        [differenz(s, vorher), s.text("herausforderungen")], [[0, 0, 0, 1, 0], "herausforderungen@B"]);
    s.rolle(2 * BREITE + 250);
    s.fingerHoch();
    gleich("Losgelassen über der Hälfte: die Leiste zieht nach, gezeichnet wird NICHT noch einmal",
        [s.N.aktuell, differenz(s, vorher)], ["herausforderungen", [0, 0, 0, 1, 0]]);
    s.rolle(3 * BREITE, true);
    gleich("Eingerastet: kein doppeltes Zeichnen", differenz(s, vorher), [0, 0, 0, 1, 0]);
    s.leerlaufLeeren();
    gleich("Der Leerlauf zieht dann den neuen veralteten Nachbarn nach (Rangliste), die offene Seite nicht",
        differenz(s, vorher), [0, 0, 0, 1, 1]);

    /* Tipp auf eine veraltete, nicht benachbarte Seite */
    const mitte = s.zahlen();
    s.N.zeigen("shop", null);
    gleich("Tipp auf eine veraltete Seite: genau einmal gezeichnet, sofort", [differenz(s, mitte), s.text("shop")],
        [[1, 0, 0, 0, 0], "shop@B"]);
    s.rolle(BREITE);
    s.rolle(0, true);
    gleich("… angekommen: nicht noch einmal", differenz(s, mitte)[0], 1);
}

/* 2d. Runden-Ende: genau ein Neu-Zeichnen je besuchter Seite */
{
    const s = welt();
    s.leerlaufLeeren();
    const vorher = s.zahlen();
    s.N.zeigen("wordle", { modus: "tag" });
    s.stand.wert = "R";
    s.N.veralten();
    s.leerlaufLeeren();
    gleich("In der Runde zeichnet der Leerlauf keine Seite (das Band ist verborgen)", differenz(s, vorher), [0, 0, 0, 0, 0]);
    s.band.scrollLeft = 0;
    s.N.zeigen("start", null, true);
    gleich("Zurück auf dem Start: er ist neu gezeichnet, einmal", [differenz(s, vorher), s.text("start")],
        [[0, 0, 1, 0, 0], "start@R"]);
    gleich("Rundgang: jede Seite zeigt den neuen Stand", s.rundgangWisch(), alle("R"));
    gleich("… jede genau einmal neu gezeichnet", differenz(s, vorher), [1, 1, 1, 1, 1]);
}
{
    /* Auch OHNE dass jemand `veralten` ruft: Wer aus einem Bildschirm ohne
       Leisten-Knopf zurückkommt, findet jede Seite veraltet. */
    const s = welt();
    s.leerlaufLeeren();
    const vorher = s.zahlen();
    s.N.zeigen("wordle", { modus: "uebung" });
    s.stand.wert = "U";
    s.band.scrollLeft = 0;
    s.N.zeigen("start", null, true);
    gleich("Aus der Runde zurück (ohne Meldung): jede Seite zeigt beim Besuch den neuen Stand", s.rundgangTipp(), alle("U"));
    gleich("… jede genau einmal neu gezeichnet", differenz(s, vorher), [1, 1, 1, 1, 1]);
}

/* 2e. `veralten()`: die offene Seite bleibt ungestört (Sammlung, Kauf im Shop) */
{
    const s = welt();
    s.leerlaufLeeren();
    s.N.zeigen("sammlung", null);
    s.rolle(BREITE, true);
    const vorher = s.zahlen();
    const entwurf = neuesElement("p");
    entwurf.textContent = "Entwurf";
    s.ort("sammlung").appendChild(entwurf);
    s.stand.wert = "K";
    s.N.veralten();
    gleich("veralten: nichts wird sofort gezeichnet, die offene Seite bleibt stehen (ihr Entwurf auch)",
        [differenz(s, vorher), s.text("sammlung")], [[0, 0, 0, 0, 0], "sammlung@AEntwurf"]);
    s.leerlaufLeeren();
    gleich("Leerlauf: nur die Nachbarn (Shop, Start) — nie die offene Seite",
        [differenz(s, vorher), s.text("sammlung")], [[1, 0, 1, 0, 0], "sammlung@AEntwurf"]);
    s.wischen("start");
    s.wischen("sammlung");
    gleich("Beim nächsten Besuch ist die ungestörte Seite neu, genau einmal",
        [differenz(s, vorher)[1], s.text("sammlung")], [1, "sammlung@K"]);
    s.N.veralten(["rangliste"]);
    s.leerlaufLeeren();
    const mitte = s.zahlen();
    s.rundgangTipp();
    gleich("veralten([\"rangliste\"]) trifft nur diese Seite (und die zwei, die noch vom ersten Mal veraltet waren)",
        differenz(s, mitte), [0, 0, 0, 1, 1]);
}

/* 2f. Der Zustand der Seite bleibt: derselbe Inhalt (gewählter Reiter),
       derselbe Rollstand — der Wechsel fasst die Seite nicht an */
{
    const s = welt();
    s.leerlaufLeeren();
    s.N.zeigen("shop", null);
    s.rolle(0, true);
    const knoten = s.ort("shop").kinder[0];
    knoten.dataset.reiter = "vorrat";
    s.seite("shop").scrollTop = 140;
    s.N.zeigen("sammlung", null);
    s.N.zeigen("shop", null);
    gleich("Weg und wieder hin: derselbe Knoten, derselbe Reiter, derselbe Rollstand",
        [s.ort("shop").kinder[0] === knoten, s.ort("shop").kinder[0].dataset.reiter, s.seite("shop").scrollTop],
        [true, "vorrat", 140]);
    s.rolle(0, true);
    s.fingerRunter();
    s.rolle(120);
    s.rolle(0, true);
    s.fingerHoch();
    gleich("Angezogen und zurück: unverändert", [s.ort("shop").kinder[0] === knoten, s.seite("shop").scrollTop], [true, 140]);
    s.stand.wert = "B";
    s.N.auffrischen();
    gleich("auffrischen zeichnet neu und behält den Rollstand (wie bisher)",
        [s.text("shop"), s.seite("shop").scrollTop], ["shop@B", 140]);
}

/* 2g. `geoeffnet` — nur, wenn die Seite ohne Zeichnen geöffnet wird */
{
    const s = welt();
    s.leerlaufLeeren();
    gleich("Beim Start und im Leerlauf: kein geoeffnet (dort wird gezeichnet)", s.geoeffnet, []);
    s.N.zeigen("rangliste", null);
    gleich("Frische Seite geöffnet: geoeffnet statt zeigen", [s.geoeffnet, s.anzahl("rangliste")], [["rangliste"], 1]);
    s.N.veralten(["shop"]);
    s.N.zeigen("shop", null);
    gleich("Veraltete Seite geöffnet: zeigen statt geoeffnet", [s.geoeffnet, s.anzahl("shop")], [["rangliste"], 2]);
    s.N.zeigen("start", { bibliothek: true }, true);
    gleich("Mit Parameter: immer gezeichnet (der Parameter gehört zum Zeichnen)", [s.geoeffnet, s.anzahl("start")],
        [["rangliste"], 2]);
    s.N.zeigen("start", null, true);
    gleich("Dieselbe Seite noch einmal: gezeichnet", s.anzahl("start"), 3);
}

/* 2h. Die Stand-Marke der App (`frischMarke`) */
{
    const s = welt();
    const marke = { wert: "tag1|anna|0", wirft: false, gelesen: 0 };
    s.N.frischMarke = () => {
        marke.gelesen++;
        if (marke.wirft) {
            throw new Error("kaputt");
        }
        return marke.wert;
    };
    s.N.auffrischen();
    s.leerlaufLeeren();
    s.rundgangTipp();
    const vorher = s.zahlen();
    s.rundgangWisch();
    gleich("Gleiche Marke: kein Neu-Zeichnen", differenz(s, vorher), [0, 0, 0, 0, 0]);
    pruefe("… die Marke wird beim Wechsel gelesen", marke.gelesen > 0);

    marke.wert = "tag2|anna|0";
    s.stand.wert = "T";
    gleich("Andere Marke (neuer Tag): sofort wird nichts gezeichnet", differenz(s, vorher), [0, 0, 0, 0, 0]);
    gleich("… aber jede Seite zeigt beim Besuch den neuen Stand", s.rundgangWisch(), alle("T"));
    gleich("… die offene Seite beim Wiederkommen, jede genau einmal", differenz(s, vorher), [1, 1, 1, 1, 1]);
    s.rundgangTipp();
    gleich("… danach wieder Ruhe", differenz(s, vorher), [1, 1, 1, 1, 1]);

    marke.wirft = true;
    const mitte = s.zahlen();
    s.rundgangTipp();
    gleich("Wirft der Geber: jede Seite gilt als veraltet (wie bis 0.32.0 — jeder Besuch zeichnet)",
        differenz(s, mitte), [1, 1, 1, 1, 1]);
}

/* 2i. Der Leerlauf zeichnet nicht, während das Band rollt */
{
    const s = welt();
    s.leerlaufLeeren();
    const vorher = s.zahlen();
    s.N.auffrischen();
    s.band.scrollLeft = 2 * BREITE + 150;        /* zwischen zwei Seiten */
    s.leerlauf.shift()();
    gleich("Das Band rollt: der Leerlauf wartet (neu bestellt, nichts gezeichnet)",
        [differenz(s, vorher), s.leerlauf.length], [[0, 0, 1, 0, 0], 1]);
    s.band.scrollLeft = 2 * BREITE;
    s.leerlaufLeeren();
    gleich("Das Band steht: jetzt zieht er die Nachbarn nach", differenz(s, vorher), [0, 1, 1, 1, 0]);
}

/* 2j. Ohne Band (Rückfall): jeder Wechsel zeichnet wie bis 0.28.1 */
{
    const s = welt({ ohneBand: true });
    s.N.zeigen("shop", null);
    s.N.zeigen("start", null);
    s.N.zeigen("shop", null);
    gleich("Rückfall ohne Band: jeder Wechsel zeichnet, kein geoeffnet, kein Leerlauf",
        [s.anzahl("shop"), s.anzahl("start"), s.geoeffnet.length, s.leerlauf.length], [2, 2, 0, 0]);
    s.N.veralten();
    s.N.auffrischen();
    gleich("… veralten und auffrischen laufen dort ohne Fehler", s.anzahl("shop"), 3);
}

fazit();
