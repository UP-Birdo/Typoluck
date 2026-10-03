/*
 * test-wischen.js — Tabs wechseln als SEITEN-BAND (seit 0.29.0, UPCrew-Runde 8;
 * gemeinsamer Baustein js\upcrew-wischen.js aus Apps\UPCrew\bausteine, gleich
 * in Blunderluck). Nutzer 03.10.2026: „als wären die seiten nicht wirklich
 * getrent einzelene seiten sondern eine breite wo man durch scrollen kann
 * wagrecht und an fix punkten hängen bleiebt".
 *
 * Die reine Logik des Bausteins und sein Verhalten am nachgestellten Gerät
 * prüft UPCrew selbst (..\UPCrew\tests\test-wischen-band.js und
 * test-wischen-geraet.js). HIER steht die Einbindung in Typoluck
 * (js\navigation.js), mit dem ECHTEN Baustein an einem kleinen nachgebauten
 * DOM — das Band ist eine Attrappe mit Rollstand, der Test rollt es, wie es
 * der Browser täte (`scroll`, `scrollend`):
 *
 *   1. Das Band hat genau die Seiten der Leiste, in ihrer Reihenfolge.
 *   2. Ein stiller Tab (Platzhalter) steht nicht im Band.
 *   3. Gezeichnet wird die offene Seite sofort, die anderen im Leerlauf und
 *      spätestens bei `kommt`.
 *   4. `wechseln` ruft `band.zu` — beim Tipp wie nach dem Einrasten, über
 *      denselben Weg (NAVIGATION.zeigen).
 *  4b. Seit 0.30.0 zieht die Leiste früher nach (`frueh: true`): losgelassen
 *      und über der Hälfte = EIN Wechsel sofort, beim Einrasten kein
 *      zweiter; der Wechsel rollt nichts und lässt keine Seite leer.
 *   5. Jede Leisten-Seite behält ihren Inhalt beim Wechsel; `auffrischen`
 *      trifft nur die eigene Seite.
 *   6. Gesperrt in der Runde, in Anmeldung, Dialog, Buch-Vollbild und Intro —
 *      sofort, über den Wächter.
 *   7. Ein Bildschirm ohne Leisten-Knopf verbirgt das Band; danach steht es
 *      ohne Weg wieder auf der offenen Seite.
 *   8. Hinter einem Blatt rückt die Seite des offenen Bildschirms zurück.
 *   9. Ohne Band-Element oder ohne Baustein: alles wie bis 0.28.1.
 *  10. Einbindung: index.html, sw.js, Stil, Bildschirme.
 *
 * Ob ein echter Browser so rollt und einrastet, zeigt nur der Browser (und
 * wie sich der Wisch anfühlt, nur das Handy).
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
 * Ein kleines DOM
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
 * Eine Welt: Dokument, Verlauf, Leerlauf und Wächter als Attrappen, das Band
 * mit Rollstand. wahl:
 *   ohneBaustein  UPCREW_WISCHEN fehlt (Datei nicht geladen)
 *   ohneBand      NAVIGATION.starten ohne Band-Element
 *   mitBlatt      js\upcrew-blatt.js laden, Halter der Blätter mitgeben
 *   leiste        (LEISTE) => …   die Leiste vor dem Start verändern
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
        introLaeuft: false,
        querySelector: (s) => (s === ".upi:not([hidden])" && dokument.introLaeuft ? {} : null),
        querySelectorAll: () => []
    };
    const verlauf = [];
    const leerlauf = [];
    const waechter = [];
    const fenster = { gerollt: 0 };
    const umgebung = {
        console, setTimeout, clearTimeout,
        document: dokument,
        history: { state: null, length: 1, pushState(z) { verlauf.push("neu:" + z.id); }, replaceState(z) { verlauf.push("ersetzt:" + z.id); }, back() { } },
        requestIdleCallback: (f) => leerlauf.push(f),
        MutationObserver: function (rueckruf) {
            this.observe = () => { };
            waechter.push(rueckruf);
        },
        scrollY: 0,
        scrollTo() { fenster.gerollt++; },
        addEventListener() { }
    };
    umgebung.window = umgebung;
    if (!o.ohneBaustein) {
        umgebung.UPCREW_WISCHEN = W;
    }
    vm.createContext(umgebung);
    vm.runInContext((o.mitBlatt ? lesen("js/upcrew-blatt.js") + "\n;" : "") + lesen("js/navigation.js")
        + "\n;globalThis.NAVIGATION = NAVIGATION;", umgebung, { filename: "navigation.js" });
    const N = umgebung.NAVIGATION;

    /* Die Bildschirme: Jeder zeichnet einen Absatz „<id>#<wievielter Bau>". */
    const gezeichnet = [];
    const verlassen = [];
    const unsichtbarGezeichnet = [];
    const bildschirm = (id, alsBlatt) => N.anmelden({
        id: id, titel: id, alsBlatt: alsBlatt,
        zeigen: (behaelter, parameter) => {
            gezeichnet.push(id);
            /* War der Ort beim Zeichnen zu sehen? (Wer misst, braucht das.) */
            if (!o.ohneBand && !o.ohneBaustein && !alsBlatt && (N.imBand(id) ? band.hidden : frei.hidden)) {
                unsichtbarGezeichnet.push(id);
            }
            const p = neuesElement("p");
            p.textContent = id + "#" + gezeichnet.filter((g) => g === id).length + (parameter ? "+" : "");
            behaelter.appendChild(p);
        },
        verlassen: () => verlassen.push(id)
    });
    for (const id of LEISTE.concat(["wordle"])) {
        bildschirm(id, false);
    }
    bildschirm("profil", true);
    if (typeof o.leiste === "function") {
        o.leiste(N.LEISTE);
    }

    /* Das Gerüst aus index.html: Band, daneben der Rollbereich mit dem gemeinsamen Ort. */
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

    const s = { N, umgebung, dokument, koerper, band, frei, inhalt, ebenen, gezeichnet, verlassen, verlauf, leerlauf,
        waechter, fenster, unsichtbarGezeichnet };
    s.seite = (id) => band.kinder.find((k) => k.dataset.upSeite === id) || null;
    s.ort = (id) => (s.seite(id) ? s.seite(id).kinder[0] : null);
    s.text = (id) => (s.ort(id) ? s.ort(id).textContent : null);
    s.anzahl = (id) => gezeichnet.filter((g) => g === id).length;
    /* Der Browser rollt: Rollstand setzen, `scroll`; mit ende = true rastet er dort ein. */
    s.rolle = (links, ende) => {
        band.scrollLeft = links;
        band.horcher.scroll({});
        if (ende) {
            band.horcher.scrollend({});
        }
    };
    /* Ein Finger greift das Band / lässt es los (nur mit `frueh` hört der Baustein darauf). */
    s.fingerRunter = () => band.horcher.touchstart({ touches: [{}] });
    s.fingerHoch = () => band.horcher.touchend({ touches: [] });
    s.leerlaufLeeren = () => {
        let runden = 0;
        while (leerlauf.length && runden++ < 20) {
            leerlauf.shift()();
        }
    };
    s.bedienbar = () => band.kinder.filter((k) => !k.hidden && !k.inert).map((k) => k.dataset.upSeite);
    return s;
}

/* ------------------------------------------------------------------ *
 * 1. Das Band = die Leiste
 * ------------------------------------------------------------------ */

{
    const s = welt();
    const N = s.N;
    gleich("Die Leiste: Shop · Sammlung · Start · Aufgaben · Rangliste", N.LEISTE.map((e) => e.id), LEISTE);
    gleich("Das Band hat genau die Seiten der Leiste, in ihrer Reihenfolge",
        s.band.kinder.map((k) => k.dataset.upSeite), LEISTE);
    gleich("Der Baustein bekommt dieselbe Reihe (wischenTabs)", W.seiten(N.wischenTabs()), LEISTE);
    gleich("… und ordnet die Seiten danach (order 0–4)", LEISTE.map((id) => s.seite(id).style.order),
        ["0", "1", "2", "3", "4"]);
    pruefe("Jede Seite ist ein unmittelbares Kind des Bandes und trägt up-band-seite",
        s.band.kinder.every((k) => k.parentNode === s.band && k.classList.contains("up-band-seite")));
    pruefe("In jeder Seite steht EIN Ort: .inhalt mit data-bildschirm = Bildschirm-Id",
        LEISTE.every((id) => s.seite(id).kinder.length === 1 && s.ort(id).classList.contains("inhalt")
            && s.ort(id).dataset.bildschirm === id));
    gleich("Was keinen Leisten-Knopf hat, hat keine Seite", [N.imBand("wordle"), N.imBand("profil"), N.imBand("start")],
        [false, false, true]);

    gleich("Das Band beginnt ohne Weg auf der offenen Seite", [s.band.scrollLeft, s.band.rollen.length, N._band.ort()],
        [2 * BREITE, 0, "start"]);
    gleich("Nur die eingerastete Seite ist bedienbar (die Nachbarn sind inert)", s.bedienbar(), ["start"]);
    gleich("Das Band ist zu sehen, der gemeinsame Ort verborgen und leer",
        [s.band.hidden, s.frei.hidden, s.inhalt.kinder.length], [false, true, 0]);
    gleich("Das Dokument wird nicht mehr gerollt (kein window.scrollTo)", s.fenster.gerollt, 0);

    /* 3. Zeichnen: offen sofort, die anderen im Leerlauf */
    gleich("Gezeichnet ist beim Start nur die offene Seite", s.gezeichnet, ["start"]);
    gleich("Für die übrigen ist der Leerlauf bestellt (eine Seite je Runde)", s.leerlauf.length, 1);
    s.leerlauf.shift()();
    gleich("Leerlauf, Runde 1: die erste Seite der Leiste", s.gezeichnet, ["start", "shop"]);
    s.leerlaufLeeren();
    gleich("Nach dem Leerlauf steht jede Seite, jede genau einmal gezeichnet",
        s.gezeichnet.slice().sort(), LEISTE.slice().sort());
    gleich("Jede Seite zeichnet in IHREN Ort", LEISTE.map((id) => s.text(id)), LEISTE.map((id) => id + "#1"));
    gleich("Dabei wurde nichts gewechselt", [N.aktuell, s.verlauf.filter((v) => v.indexOf("neu:") === 0).length],
        ["start", 0]);
}

/* 3b. … und spätestens, wenn die Seite in Sicht kommt (`kommt`). */
{
    const s = welt();
    s.fingerRunter();
    s.rolle(2 * BREITE + 120);
    gleich("Die Nachbarseite kommt in Sicht: Sie wird jetzt gezeichnet", s.gezeichnet, ["start", "herausforderungen"]);
    s.rolle(2 * BREITE + 200);
    gleich("… nur einmal", s.anzahl("herausforderungen"), 1);
    gleich("… und die Leiste bleibt, solange der Finger das Band hält (auch über der Hälfte)", s.N.aktuell, "start");
    s.leerlaufLeeren();
    gleich("Der Leerlauf zeichnet sie nicht noch einmal", s.anzahl("herausforderungen"), 1);
}

/* ------------------------------------------------------------------ *
 * 2. Ein stiller Tab steht nicht im Band
 * ------------------------------------------------------------------ */

{
    const s = welt({ leiste: (L) => {
        L.splice(4, 0, { text: "Bald", zeichen: "bald", platzhalter: true });
    } });
    const tabs = s.N.wischenTabs();
    gleich("Der Platzhalter ist für den Baustein ein stiller Tab",
        JSON.parse(JSON.stringify(tabs[4])), { id: "platz-bald", still: true });
    gleich("Im Band stehen weiter genau die fünf Seiten (keine für „Bald“)",
        s.band.kinder.map((k) => k.dataset.upSeite), LEISTE);
    gleich("Von Aufgaben geht es gleich zur Rangliste", W.nachbar(tabs, "herausforderungen", 1), "rangliste");
    s.rolle(3 * BREITE, true);
    s.rolle(4 * BREITE, true);
    gleich("… auch am Gerät: die fünfte Seite ist die Rangliste", s.N.aktuell, "rangliste");
    gleich("Rechts ist Stopp", W.nachbar(tabs, "rangliste", 1), null);
    gleich("Links ist Stopp", W.nachbar(tabs, "shop", -1), null);
}

/* Ein Leisten-Eintrag ohne angemeldeten Bildschirm bekommt keine Seite. */
{
    const s = welt({ leiste: (L) => L.push({ id: "gibtsnicht", text: "Fehlt", zeichen: "bald" }) });
    gleich("Kein Bildschirm, keine Seite", [s.band.kinder.length, s.N.imBand("gibtsnicht")], [5, false]);
}

/* ------------------------------------------------------------------ *
 * 4. `wechseln` ruft `zu` — Tipp und Band gehen denselben Weg
 * ------------------------------------------------------------------ */

{
    const s = welt();
    const N = s.N;
    s.leerlaufLeeren();
    const zuRufe = [];
    const zuEcht = N._band.zu;
    N._band.zu = (id, wie) => { zuRufe.push(id + (wie && wie.sofort ? " sofort" : "")); return zuEcht(id, wie); };

    /* Tipp auf die Leiste = NAVIGATION.zeigen */
    N.zeigen("shop", null);
    gleich("Tipp: der Tab steht sofort, `wechseln` ruft band.zu(id)", [N.aktuell, zuRufe], ["shop", ["shop"]]);
    gleich("… das Band rollt sanft hin", s.band.rollen, [{ left: 0, behavior: "smooth" }]);
    gleich("… und das Ziel ist sofort bedienbar", s.bedienbar(), ["shop"]);
    s.rolle(BREITE);
    s.rolle(0, true);
    gleich("Angekommen: kein zweiter Wechsel, kein zweiter Verlaufseintrag",
        [N.aktuell, s.anzahl("shop"), s.verlauf.filter((v) => v === "neu:shop").length], ["shop", 2, 1]);

    /* Das Band rastet auf einer anderen Seite ein → derselbe Weg. Der
       Finger hält es dabei bis zum Schluss (sonst zöge die Leiste seit
       0.30.0 schon ab der Hälfte nach — Abschnitt 4b). */
    s.fingerRunter();
    s.rolle(BREITE / 2 + 40);
    gleich("Unterwegs bleibt die Leiste stehen, solange der Finger hält", N.aktuell, "shop");
    s.rolle(BREITE, true);
    s.fingerHoch();
    gleich("Eingerastet auf Sammlung: gewechselt über NAVIGATION.zeigen (Verlaufseintrag wie beim Tipp)",
        [N.aktuell, s.verlauf.slice(-1)[0]], ["sammlung", "neu:sammlung"]);
    gleich("… und `wechseln` hat wieder band.zu gerufen", zuRufe, ["shop", "sammlung"]);
    gleich("… das Band steht schon dort: kein weiteres Rollen", s.band.rollen.length, 1);
    gleich("… der Baustein kennt den Ort", N._band.ort(), "sammlung");

    /* Zwischen zwei Seiten losgelassen und zurück: nichts */
    s.rolle(BREITE + 60);
    s.rolle(BREITE, true);
    gleich("Kurz angezogen und zurück: kein Wechsel", [N.aktuell, s.anzahl("sammlung")], ["sammlung", 2]);

    /* ersetzen (kein Verlaufseintrag) springt ohne Weg */
    N.zeigen("rangliste", null, true);
    gleich("Mit ersetzen: ohne Weg zur Seite", [zuRufe.slice(-1)[0], s.band.scrollLeft, s.band.rollen.length],
        ["rangliste sofort", 4 * BREITE, 1]);

    /* Die Zurück-Taste */
    N._beiZurueck({ id: "start", parameter: null }, "start");
    gleich("Zurück-Taste: derselbe Wechsel, das Band rollt hin",
        [N.aktuell, zuRufe.slice(-1)[0], s.band.rollen.slice(-1)[0]], ["start", "start", { left: 2 * BREITE, behavior: "smooth" }]);
}

/* ------------------------------------------------------------------ *
 * 4b. Die Leiste zieht früher nach (seit 0.30.0, Wahl `frueh` am Baustein;
 *     Nutzer 03.10.2026): losgelassen und über der Hälfte = EIN Wechsel,
 *     sofort — beim Einrasten kein zweiter. Der Wechsel stört das Rollen
 *     nicht: kein scrollTo, die ankommende Seite ist nie leer.
 * ------------------------------------------------------------------ */

{
    const s = welt();
    const N = s.N;
    s.leerlaufLeeren();
    const zuRufe = [];
    const zuEcht = N._band.zu;
    N._band.zu = (id, wie) => { zuRufe.push(id); return zuEcht(id, wie); };
    const wechsel = (id) => s.verlauf.filter((v) => v === "neu:" + id).length;

    /* Der Finger zieht über die Hälfte und lässt los. */
    s.fingerRunter();
    s.rolle(2 * BREITE + 250);
    gleich("Über der Hälfte, der Finger hält noch: die Leiste steht", [N.aktuell, wechsel("herausforderungen")], ["start", 0]);
    s.fingerHoch();
    gleich("Losgelassen über der Hälfte: die Leiste zieht sofort nach — vor dem Einrasten",
        [N.aktuell, wechsel("herausforderungen"), N._band.ort()], ["herausforderungen", 1, "start"]);
    gleich("… über denselben Weg wie ein Tipp (NAVIGATION.zeigen → band.zu), aber das Band wird dabei nicht gestellt",
        [zuRufe, s.band.rollen.length, s.band.scrollLeft, s.fenster.gerollt], [["herausforderungen"], 0, 2 * BREITE + 250, 0]);
    gleich("… die ankommende Seite ist neu gezeichnet, nie leer — bedienbar wird sie erst beim Einrasten (Baustein 04.10.2026)",
        [s.text("herausforderungen"), s.ort("herausforderungen").kinder.length, s.bedienbar()],
        ["herausforderungen#2", 1, ["start"]]);
    gleich("… die verlassene Seite steht weiter da (sie ist noch halb zu sehen)", s.text("start"), "start#1");
    s.rolle(2 * BREITE + 340);
    gleich("Das Band rollt allein zu Ende: kein weiterer Wechsel unterwegs",
        [wechsel("herausforderungen"), s.anzahl("herausforderungen")], [1, 2]);
    s.rolle(3 * BREITE, true);
    gleich("Eingerastet: KEIN zweiter Wechsel, kein zweites Zeichnen — nur der Ort des Bandes zieht nach",
        [N.aktuell, wechsel("herausforderungen"), s.anzahl("herausforderungen"), N._band.ort(), s.band.rollen.length],
        ["herausforderungen", 1, 2, "herausforderungen", 0]);
    gleich("… und jetzt ist die neue Seite bedienbar", s.bedienbar(), ["herausforderungen"]);

    /* Schwung ohne Finger (das Band rollt nach dem Loslassen von selbst über die Hälfte). */
    s.rolle(3 * BREITE - 150);
    gleich("Ohne Finger, noch vor der Hälfte: nichts", [N.aktuell, wechsel("start")], ["herausforderungen", 0]);
    s.rolle(3 * BREITE - 220);
    gleich("Ohne Finger über die Hälfte: genau ein Wechsel, sofort", [N.aktuell, wechsel("start")], ["start", 1]);
    s.rolle(2 * BREITE + 40);
    s.rolle(2 * BREITE, true);
    gleich("… beim Einrasten kein zweiter", [N.aktuell, wechsel("start"), N._band.ort()], ["start", 1, "start"]);

    /* Unter der Hälfte losgelassen: Das Band federt zurück, die Leiste bleibt. */
    s.fingerRunter();
    s.rolle(2 * BREITE - 150);
    s.fingerHoch();
    s.rolle(2 * BREITE - 60);
    s.rolle(2 * BREITE, true);
    gleich("Unter der Hälfte losgelassen: kein Wechsel, nichts neu gezeichnet",
        [N.aktuell, wechsel("sammlung"), s.anzahl("sammlung")], ["start", 0, 1]);

    /* Die Leiste war voraus, der Finger greift noch einmal zu und zieht zurück. */
    s.fingerRunter();
    s.rolle(2 * BREITE - 260);
    s.fingerHoch();
    gleich("Voraus zur Sammlung", [N.aktuell, wechsel("sammlung")], ["sammlung", 1]);
    s.fingerRunter();
    s.rolle(2 * BREITE - 80);
    gleich("Noch einmal gegriffen und zurückgezogen: die Leiste wartet auf das Einrasten", N.aktuell, "sammlung");
    s.rolle(2 * BREITE, true);
    s.fingerHoch();
    gleich("Eingerastet auf der alten Seite: die Leiste wechselt zurück", [N.aktuell, N._band.ort()], ["start", "start"]);

    /* Der Tipp auf die Leiste fährt über fremde Seiten hinweg — dabei zieht nichts voraus. */
    const tippVorher = s.verlauf.length;
    N.zeigen("shop", null);
    s.rolle(BREITE + 100);
    s.rolle(BREITE - 150);
    gleich("Tipp von Start zum Shop: unterwegs über die Sammlung kein Wechsel dorthin",
        [N.aktuell, s.verlauf.slice(tippVorher)], ["shop", ["neu:shop"]]);
    s.rolle(0, true);
    gleich("… angekommen im Shop", [N.aktuell, N._band.ort()], ["shop", "shop"]);

    /* Gesperrt (Runde, Dialog): auch über der Hälfte zieht nichts voraus. */
    s.koerper.classList.add("dialog-offen");
    s.rolle(BREITE - 100);
    gleich("Gesperrt: kein früher Wechsel", N.aktuell, "shop");
    s.rolle(0, true);
    s.koerper.classList.remove("dialog-offen");
}

/* ------------------------------------------------------------------ *
 * 5. Jede Leisten-Seite behält ihren Inhalt
 * ------------------------------------------------------------------ */

{
    const s = welt();
    const N = s.N;
    s.leerlaufLeeren();
    const voll = () => LEISTE.every((id) => s.ort(id).kinder.length === 1);

    for (const id of ["shop", "rangliste", "sammlung", "herausforderungen", "start"]) {
        N.zeigen(id, null);
        pruefe("Wechsel zu „" + id + "“: alle fünf Seiten stehen mit Inhalt im Band", voll(),
            LEISTE.map((x) => x + ":" + s.ort(x).kinder.length).join(" "));
    }
    gleich("Der gemeinsame Ort blieb dabei leer", s.inhalt.kinder.length, 0);
    gleich("Beim Einrasten wird die Seite neu gezeichnet (wie bisher beim Öffnen), die anderen bleiben, wie sie sind",
        LEISTE.map((id) => s.text(id)), ["shop#2", "sammlung#2", "start#2", "herausforderungen#2", "rangliste#2"]);

    const vorher = LEISTE.map((id) => s.anzahl(id));
    N.auffrischen();
    gleich("auffrischen trifft nur die eigene Seite",
        LEISTE.map((id, i) => s.anzahl(id) - vorher[i]), [0, 0, 1, 0, 0]);
    pruefe("… und leert keine andere", voll());

    s.seite("start").scrollTop = 140;
    N.auffrischen();
    gleich("Die Seite behält beim Auffrischen ihren Rollstand", s.seite("start").scrollTop, 140);

    gleich("verlassen() wird weiter gemeldet (Aufräumen ausserhalb der Seite), baut aber nichts ab",
        [s.verlassen.length > 0, voll()], [true, true]);
}

/* Die echten Bildschirme bauen sich beim Verlassen nicht mehr ab. */
{
    const sammlung = lesen("js/bildschirm-sammlung.js");
    const shop = lesen("js/bildschirm-shop.js");
    pruefe("Sammlung: entfernen() beim Verlassen nur noch ohne Band",
        /verlassen: \(\) => \{\s*if \(!NAVIGATION\.imBand\("sammlung"\)\) \{\s*SAMMLUNG_BILDSCHIRM\.entfernen\(\);\s*\}\s*\}/.test(sammlung));
    pruefe("Shop: der Griff bleibt im Band stehen",
        /verlassen: \(\) => \{\s*if \(!NAVIGATION\.imBand\("shop"\)\) \{\s*SHOP_BILDSCHIRM\._griff = null;\s*\}\s*\}/.test(shop));
    const rangliste = lesen("js/bildschirm-rangliste.js");
    pruefe("Rangliste: zeichnet in ihre Seite, lädt aber nur, wenn sie offen ist",
        /if \(NAVIGATION\.aktuell === "rangliste"\) \{\s*RANGLISTE_BILDSCHIRM\._laden\(\);/.test(rangliste)
            && /!NAVIGATION\.zeichenbar\("rangliste"\)/.test(rangliste));
    pruefe("Rangliste: der Platzhalter einer nur vorbereiteten Seite hat keine Uhr",
        /ruht: !RANGLISTE_BILDSCHIRM\._laedt/.test(rangliste)
            && /if \(einstellung\.ruht\) \{\s*return platzhalter;\s*\}\s*setTimeout/.test(lesen("js/zustand.js")));
}

/* ------------------------------------------------------------------ *
 * 6. Die Sperre
 * ------------------------------------------------------------------ */

{
    const s = welt();
    const N = s.N;
    s.leerlaufLeeren();
    const gesperrt = () => s.band.classList.contains("up-band-gesperrt");
    const waechterRufen = () => s.waechter.forEach((w) => w([]));

    gleich("Frei: erlaubt, das Band ist nicht gesperrt", [N.wischenErlaubt(), gesperrt()], [true, false]);
    gleich("Ein Wächter steht an <body> und am Intro", s.waechter.length, 1);
    for (const klasse of ["im-spiel", "anmeldung-offen", "dialog-offen", "buch-offen"]) {
        s.koerper.classList.add(klasse);
        gleich("body." + klasse + ": nicht erlaubt", N.wischenErlaubt(), false);
        waechterRufen();
        pruefe("body." + klasse + ": der Wächter sperrt das Band sofort", gesperrt());
        s.koerper.classList.remove(klasse);
        waechterRufen();
        pruefe("ohne body." + klasse + ": sofort wieder frei", !gesperrt());
    }
    s.dokument.introLaeuft = true;
    waechterRufen();
    gleich("Solange das Intro läuft: gesperrt", [N.wischenErlaubt(), gesperrt()], [false, true]);
    s.dokument.introLaeuft = false;
    waechterRufen();
    pruefe("Nach dem Intro: frei", !gesperrt());

    /* In der Runde (falls das Band dabei doch zu sehen wäre): nichts wechselt. */
    s.koerper.classList.add("im-spiel");
    N.bandAuffrischen();
    pruefe("In der Runde: bandAuffrischen sperrt", gesperrt());
    s.rolle(3 * BREITE, true);
    gleich("Gesperrt und doch verrutscht: zurück zur offenen Seite, kein Wechsel",
        [N.aktuell, s.band.scrollLeft], ["start", 2 * BREITE]);
    s.koerper.classList.remove("im-spiel");
    N.bandAuffrischen();
    s.rolle(3 * BREITE, true);
    gleich("Nach der Runde wieder: Start → Aufgaben", N.aktuell, "herausforderungen");
}

/* ------------------------------------------------------------------ *
 * 7. Ein Bildschirm ohne Leisten-Knopf verbirgt das Band
 * ------------------------------------------------------------------ */

{
    const s = welt();
    const N = s.N;
    s.leerlaufLeeren();
    s.frei.scrollTop = 77;

    N.zeigen("wordle", { modus: "uebung" });
    gleich("Runde offen: das Band ist verborgen, der gemeinsame Ort zu sehen", [s.band.hidden, s.frei.hidden], [true, false]);
    gleich("Die Runde zeichnet in den gemeinsamen Ort, der oben beginnt",
        [s.inhalt.textContent, s.inhalt.dataset.bildschirm, s.frei.scrollTop], ["wordle#1+", "wordle", 0]);
    gleich("Der Start wurde verlassen (das Buch im Vollbild geht zu), seine Seite steht weiter",
        [s.verlassen, s.text("start")], [["start"], "start#1"]);
    gleich("Der offene Bildschirm steht nicht im Band: der Baustein ruht (kein Nachbar)",
        [W.nachbar(N.wischenTabs(), "wordle", 1), W.nachbar(N.wischenTabs(), "wordle", -1)], [null, null]);
    N.auffrischen();
    gleich("auffrischen trifft dann nur die Runde", [s.anzahl("wordle"), s.anzahl("start")], [2, 1]);

    N.zeigen("wordle", { modus: "uebung", neu: true }, true);
    gleich("Runde → Runde: der gemeinsame Ort wird neu gezeichnet, nicht verlassen",
        [s.inhalt.kinder.length, s.verlassen], [1, ["start"]]);

    /* Runde zu Ende, zurück zum Start */
    s.band.scrollLeft = 0;       /* ein verborgenes Element verliert im Browser seinen Rollstand */
    const rollenVorher = s.band.rollen.length;
    N.zeigen("start", { bibliothek: true }, true);
    gleich("Zurück auf dem Start: das Band ist wieder da, der gemeinsame Ort verborgen und geräumt",
        [s.band.hidden, s.frei.hidden, s.inhalt.kinder.length], [false, true, 0]);
    gleich("… die Runde wurde verlassen (Tastatur, Uhr)", s.verlassen, ["start", "wordle"]);
    gleich("… das Band steht OHNE Weg wieder auf Start",
        [s.band.scrollLeft, s.band.rollen.length - rollenVorher, N._band.ort()], [2 * BREITE, 0, "start"]);
    gleich("… die Seite ist neu gezeichnet, mit ihrem Parameter", s.text("start"), "start#2+");
    gleich("… und nur sie ist bedienbar", s.bedienbar(), ["start"]);

    /* Aus der Runde direkt auf eine andere Leisten-Seite */
    N.zeigen("wordle", { modus: "tag" });
    s.band.scrollLeft = 0;
    N.zeigen("rangliste", null, true);
    gleich("Aus der Runde zur Rangliste: ohne Weg auf der Rangliste",
        [s.band.hidden, s.band.scrollLeft, N._band.ort(), N.aktuell], [false, 4 * BREITE, "rangliste", "rangliste"]);
    gleich("Gezeichnet wurde immer in einen sichtbaren Ort (erst zeigen, dann zeichnen — die Sammlung misst ihren Kopf)",
        s.unsichtbarGezeichnet, []);
}

/* Solange das Band verborgen ist (Runde), wird keine Seite im Hintergrund gezeichnet. */
{
    const s = welt();
    s.N.zeigen("wordle", { modus: "uebung" });
    s.leerlaufLeeren();
    gleich("Leerlauf während der Runde: keine Seite gezeichnet (sie mässe null)", s.gezeichnet, ["start", "wordle"]);
    s.N.zeigen("start", null, true);
    s.rolle(2 * BREITE - 120);
    gleich("Zurück im Band: die Nachbarseite wird gezeichnet, sobald sie in Sicht kommt",
        [s.gezeichnet.slice(-1)[0], s.unsichtbarGezeichnet], ["sammlung", []]);
}

/* ------------------------------------------------------------------ *
 * 8. Blätter über dem Band
 * ------------------------------------------------------------------ */

{
    const s = welt({ mitBlatt: true });
    const N = s.N;
    const B = s.umgebung.UPCREW_BLATT;
    s.leerlaufLeeren();
    N.zeigen("profil", null);
    gleich("Profil öffnet als Blatt über dem Start, das Band bleibt stehen", [N.aktuell, B.anzahl(), s.band.hidden],
        ["start", 1, false]);
    gleich("Dahinter rückt der Ort des offenen Bildschirms zurück — nur er",
        LEISTE.filter((id) => s.ort(id).classList.contains("up-bl-dahinter")), ["start"]);
    pruefe("Das Band sperrt dabei über das CSS des Bausteins (html.up-bl-offen)",
        s.dokument.documentElement.classList.contains("up-bl-offen")
            && /html\.up-bl-offen \.up-band \{\s*overflow-x: hidden;/.test(lesen("css/upcrew-wischen.css")));
    N.zeigen("rangliste", null);
    gleich("Ein Seitenwechsel schliesst das Blatt und gibt die Seite frei",
        [B.anzahl(), LEISTE.filter((id) => s.ort(id).classList.contains("up-bl-dahinter"))], [0, []]);
    N.zeigen("profil", null);
    gleich("Blatt über der Rangliste: jetzt rückt ihre Seite zurück",
        LEISTE.filter((id) => s.ort(id).classList.contains("up-bl-dahinter")), ["rangliste"]);
    N.auffrischen();
    gleich("auffrischen: die eigene Seite und das Blatt", [s.anzahl("rangliste"), s.anzahl("profil"), s.anzahl("start")],
        [3, 3, 1]);
}

/* ------------------------------------------------------------------ *
 * 9. Ohne Band (Tests, Rückfall): wie bis 0.28.1
 * ------------------------------------------------------------------ */

for (const [name, wahl] of [["ohne Band-Element", { ohneBand: true }], ["ohne den Baustein", { ohneBaustein: true }]]) {
    const s = welt(wahl);
    const N = s.N;
    gleich("Rückfall " + name + ": kein Band, keine Seiten", [N._band, s.band.kinder.length, N.imBand("start")],
        [null, 0, false]);
    gleich("Rückfall " + name + ": der Start zeichnet in den gemeinsamen Ort", s.inhalt.textContent, "start#1");
    N.zeigen("shop", null);
    gleich("Rückfall " + name + ": ein Wechsel leert und füllt denselben Ort, das Fenster rollt nach oben",
        [s.inhalt.textContent, s.inhalt.dataset.bildschirm, s.fenster.gerollt, s.leerlauf.length], ["shop#1", "shop", 2, 0]);
    gleich("Rückfall " + name + ": zeichnen darf dort nur der offene Bildschirm",
        [N.zeichenbar("shop"), N.zeichenbar("rangliste")], [true, false]);
}

/* ------------------------------------------------------------------ *
 * 10. Einbindung
 * ------------------------------------------------------------------ */

{
    const nav = lesen("js/navigation.js");
    const navOhneKommentar = nav.replace(/\/\*[\s\S]*?\*\//g, "");
    pruefe("Angemeldet wird das Band nach dem neuen Vertrag: tabs, aktiv, wechseln, erlaubt, kommt",
        /UPCREW_WISCHEN\.an\(bandEl, \{\s*tabs: [\s\S]*?aktiv: [\s\S]*?wechseln: [\s\S]*?erlaubt: [\s\S]*?kommt: /.test(navOhneKommentar));
    pruefe("Seit 0.30.0 zieht die Leiste früher nach: der Aufruf setzt frueh: true",
        /UPCREW_WISCHEN\.an\(bandEl, \{[\s\S]*?kommt: [\s\S]*?frueh: true\s*\}\);/.test(navOhneKommentar));
    pruefe("… und der Baustein kennt die Wahl (frueh) und beobachtet die Sperre selbst (Klassen an <html> und <body>)",
        /opt\.frueh/.test(lesen("js/upcrew-wischen.js"))
            && /new MutationObserver\(\(\) => sperreSetzen\(\)\)/.test(lesen("js/upcrew-wischen.js")));
    pruefe("Vom alten Vertrag ist nichts mehr da (sperren, bewegen, WISCHEN_SPERREN)",
        !/WISCHEN_SPERREN|sperren:|bewegen:/.test(navOhneKommentar));
    pruefe("Gewechselt wird über NAVIGATION.zeigen wie beim Tipp auf die Leiste",
        /wechseln: \(id\) => \{\s*if \(NAVIGATION\.aktuell !== id\) \{\s*NAVIGATION\.zeigen\(id, null\);/.test(navOhneKommentar));
    gleich("window.scrollTo gibt es nur noch im Rückfall ohne Band", (navOhneKommentar.match(/window\.scrollTo/g) || []).length, 1);
    pruefe("… dort, wo kein Band ist",
        /if \(!NAVIGATION\._bandEl\) \{\s*window\.scrollTo\(0, 0\);\s*return;/.test(navOhneKommentar));
    pruefe("Der Baustein ist der neue (Seiten-Band): an, seiten, nachbar — ohne entscheiden",
        typeof W.an === "function" && typeof W.seiten === "function" && typeof W.nachbar === "function"
            && W.entscheiden === undefined && W.startErlaubt === undefined);

    const index = lesen("index.html");
    pruefe("index.html lädt Baustein und Stil (vor navigation.js)",
        index.indexOf("js/upcrew-wischen.js") !== -1 && index.indexOf("css/upcrew-wischen.css") !== -1
            && index.indexOf("js/upcrew-wischen.js") < index.indexOf("js/navigation.js"));
    pruefe("index.html: das Band steht neben dem gemeinsamen Ort, nicht darin",
        /<div class="band up-band" id="band"><\/div>/.test(index)
            && /<div class="ohne-leiste" id="ohne-leiste" hidden>\s*<main class="inhalt" id="inhalt"><\/main>\s*<\/div>/.test(index));
    pruefe("app.js gibt das Band an NAVIGATION.starten", /document\.getElementById\("band"\)\);/.test(lesen("js/app.js")));
    const sw = lesen("sw.js");
    pruefe("Offline: sw.js kennt beide Dateien",
        sw.indexOf("\"./js/upcrew-wischen.js\"") !== -1 && sw.indexOf("\"./css/upcrew-wischen.css\"") !== -1);

    const stil = lesen("css/stil.css");
    pruefe("Das Dokument rollt nicht mehr",
        /html,\s*body \{\s*height: 100%;\s*overflow: hidden;\s*overscroll-behavior: none;/.test(stil));
    pruefe("Band und gemeinsamer Ort füllen den Platz unter dem Hinweisstreifen; verborgen heisst weg",
        /\.band\.up-band,\s*\.ohne-leiste \{\s*flex: 1 1 auto;[^}]*height: auto;[^}]*min-height: 0;/.test(stil)
            && /\.band\.up-band\[hidden\],\s*\.ohne-leiste\[hidden\] \{\s*display: none;/.test(stil));
    pruefe("Der gemeinsame Ort rollt für sich", /\.ohne-leiste \{\s*overflow-x: hidden;\s*overflow-y: auto;/.test(stil));
    pruefe("Die alte Regel für `.up-wischen` ist weg (die Klasse gibt es nicht mehr)",
        !/up-wischen/.test(stil.replace(/upcrew-wischen/g, "")));
    const bausteinStil = lesen("css/upcrew-wischen.css");
    pruefe("Baustein-Stil: der Browser rollt und rastet ein, höchstens eine Seite je Wisch",
        /scroll-snap-type: x mandatory;/.test(bausteinStil) && /scroll-snap-stop: always;/.test(bausteinStil)
            && /\.up-band \.up-band-fest \{\s*touch-action: pan-y pinch-zoom;/.test(bausteinStil));
}

fazit();
