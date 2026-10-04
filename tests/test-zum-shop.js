/*
 * test-zum-shop.js — der Weg aus der Sammlung in den Shop (seit 0.34.5,
 * UPCrew-Runde 9: ein kaufbares Stück zeigte im Blatt nur den grauen Knopf
 * „Nicht im Besitz" ohne Weg in den Shop).
 *
 * Hier laufen die ECHTEN Bildschirme js\bildschirm-sammlung.js und
 * js\bildschirm-shop.js mit der ECHTEN Navigation (js\navigation.js), dem
 * ECHTEN Seiten-Band (js\upcrew-wischen.js), den ECHTEN Blättern
 * (js\upcrew-blatt.js, mit Verlauf) und den echten Bausteinen von Sammlung,
 * Anpassen, Katalog, Besitz und Shop an einem kleinen DOM
 * (tests\kleines-dom.js). Attrappen sind nur App, Fortschritt, Dialog,
 * Verlauf und Leerlauf.
 *
 *   1. Der Knopf „Im Shop ansehen" ruft das Spiel mit dem Katalog-Schlüssel;
 *      danach ist der Shop-Tab offen (derselbe Weg wie ein Tipp auf die
 *      Leiste, das Band fährt hin), Reiter „Design", das Stück-Blatt da —
 *      auch wenn die Shop-Seite vorher noch nie gebaut war.
 *   2. Kaufen → zurück in die Sammlung: jetzt frei, „Übernehmen" statt
 *      „Im Shop ansehen", übernehmbar.
 *   3. Stand die Shop-Seite schon frisch da (Reiter „Typoluck"): sie wird
 *      nicht neu gebaut, der Reiter springt auf „Design", das Blatt öffnet.
 *   4. Ohne Kauf-Weg (frei, besessen, „bald") kein Knopf.
 *   5. Klappt das Öffnen nicht (Shop nicht geladen, unbekanntes Stück),
 *      bleibt es beim Tab-Wechsel — kein Fehler, nichts hängt.
 *
 * Wie es aussieht, zeigt nur der Browser (ansicht\0.34.5).
 */

const fs = require("fs");
const pfad = require("path");
const vm = require("vm");
const { pruefe, gleich, spaeter, fazit, speicherAttrappe } = require("./pruefer.js");
const { dokumentBauen } = require("./kleines-dom.js");
const W = require("../js/upcrew-wischen.js");

const wurzel = pfad.join(__dirname, "..");
const lesen = (name) => fs.readFileSync(pfad.join(wurzel, name), "utf8");

const BREITE = 360;

/* In der Reihenfolge aus index.html (soweit Sammlung, Shop und Navigation sie brauchen). */
const DATEIEN = ["js/upcrew-intro.js", "js/upcrew-farbwelten.js", "js/upcrew-aussehen.js", "js/kachelsets.js",
    "js/upcrew-katalog.js", "js/upcrew-besitz.js", "js/upcrew-platz.js", "js/upcrew-anpassen.js", "js/upcrew-abzeichen.js",
    "js/upcrew-abzeichen-spiele.js", "js/upcrew-sammlung.js", "js/upcrew-muenzen.js", "js/upcrew-shop.js",
    "js/upcrew-blatt.js", "js/sammlung.js", "js/bildschirm-sammlung.js", "js/besitz.js", "js/bildschirm-shop.js",
    "js/navigation.js"];

/*
 * Eine Welt, gestartet auf der Sammlung. Die übrigen Seiten entstehen erst,
 * wenn der Test den Leerlauf laufen lässt (`s.leerlauf()`).
 *   muenzen   verdient (Vorgabe 1000)
 *   besitz    was im Gerätespeicher unter `upcrew.besitz` steht
 *   ohneShop  der Baustein des Shops fehlt („Nicht geladen")
 */
function welt(wahl) {
    const o = wahl || {};
    const dokument = dokumentBauen();
    const einstellungen = {};
    const verlauf = [];
    const leerlauf = [];
    const s = { dokument, einstellungen, verlauf, fragen: [], meldungen: [], hinweise: [], antwort: true, fehler: [] };
    const umgebung = {
        console, setTimeout, clearTimeout, Promise,
        document: dokument,
        localStorage: speicherAttrappe(),
        matchMedia: () => ({ matches: true, addEventListener() { } }),
        history: {
            state: null, length: 1,
            pushState(z) { verlauf.push("neu:" + (z && z.id)); this.state = z; this.length++; },
            replaceState(z) { verlauf.push("ersetzt:" + (z && z.id)); this.state = z; },
            back() { verlauf.push("zurueck"); },
            go(n) { verlauf.push("gehe:" + n); }
        },
        requestIdleCallback: (f) => leerlauf.push(f),
        addEventListener() { },
        removeEventListener() { },
        scrollTo() { },
        scrollY: 0,
        innerHeight: 640,
        ICH: {
            einstellung: (name, vorgabe) => (name in einstellungen ? einstellungen[name] : vorgabe),
            einstellungSetzen: (name, wert) => { einstellungen[name] = wert; }
        },
        WORDLE: { datumText: () => "2026-10-04" },
        ZUSTAND: { fehler: (angaben) => { const p = dokument.createElement("p"); p.className = "zustand-fehler"; p.textContent = angaben.text; return p; } },
        BAUSTEINE: {
            el(tag, klasse, text) {
                const el = dokument.createElement(tag);
                if (klasse) {
                    el.className = klasse;
                }
                if (text !== undefined && text !== null) {
                    el.textContent = String(text);
                }
                return el;
            },
            knopf(angaben) {
                const k = dokument.createElement("button");
                k.className = "knopf";
                k.textContent = angaben.text;
                if (angaben.beiKlick) {
                    k.addEventListener("click", angaben.beiKlick);
                }
                return k;
            },
            kopfzeile: () => dokument.createElement("header")
        },
        DIALOG: {
            hinweis: (...was) => { s.hinweise.push(was); },
            frage: (...was) => { s.fragen.push(was); return Promise.resolve(s.antwort); },
            kurzmeldung: (text) => { s.meldungen.push(text); }
        },
        WORDLE_BILDSCHIRM: { _kachelBauen: () => dokument.createElement("div") }
    };
    umgebung.window = umgebung;
    umgebung.UPCREW_WISCHEN = W;
    vm.createContext(umgebung);
    for (const datei of DATEIEN) {
        vm.runInContext(lesen(datei), umgebung, { filename: datei });
    }
    if (o.besitz) {
        umgebung.localStorage.setItem("upcrew.besitz", JSON.stringify(o.besitz));
    }
    /* Die App: ein Fortschritt im Speicher; gekauft wird über das echte js\besitz.js, danach meldet sie die
       Seiten veraltet (wie js\app.js). */
    vm.runInContext("globalThis.FORTSCHRITT = { APP: 'typoluck', GAST: 'gast', _speicher: () => localStorage,"
        + " erfuellteTaten: () => [], abzeichen: () => UPCREW_ABZEICHEN.liste({ spiele: {} }, 0) };"
        + "globalThis.APP = { stand: { version: 1, spiele: { typoluck: { stand: 1, zaehler: { muenzenVerdient: "
        + (o.muenzen === undefined ? 1000 : o.muenzen) + " } } } },"
        + " level: () => ({ level: 0 }), jetzt: () => new Date(2026, 9, 4), fortschritt: () => APP.stand,"
        + " fortschrittId: () => 'ich', gebucht: 0, kaufBereit: () => true,"
        + " kaufen: () => ({ ok: true, grund: '' }),"
        + " kaufenStueck(art, wert) { const r = BESITZ.kaufen({ stand: APP.stand, art: art, wert: wert, heute: '2026-10-04', jetzt: 9,"
        + "     buchen: (x) => { APP.stand = x.stand; APP.gebucht++; } }); if (r.ok) { NAVIGATION.veralten(); } return r; } };"
        + "BESITZ.einrichten(null, null, () => 'ich');"
        + "globalThis.NAVIGATION = NAVIGATION; globalThis.SHOP_BILDSCHIRM = SHOP_BILDSCHIRM;"
        + "globalThis.SAMMLUNG_BILDSCHIRM = SAMMLUNG_BILDSCHIRM; globalThis.SAMMLUNG = SAMMLUNG;"
        + "globalThis.BESITZ = BESITZ; globalThis.KACHELSETS = KACHELSETS;", umgebung);
    if (o.ohneShop) {
        umgebung.UPCREW_SHOP = undefined;
    }

    /* Das Gerüst aus index.html: Band, gemeinsamer Ort, Halter der Blätter, Streifen der Anprobe. */
    const N = umgebung.NAVIGATION;
    umgebung.SHOP_BILDSCHIRM.anmelden();
    umgebung.SAMMLUNG_BILDSCHIRM.anmelden();
    for (const id of ["start", "herausforderungen", "rangliste"]) {
        N.anmelden({ id: id, titel: id, zeigen: (behaelter) => behaelter.appendChild(dokument.createElement("p")) });
    }
    const band = dokument.createElement("div");
    band.className = "band up-band";
    band.rollen = [];
    band.getBoundingClientRect = () => ({ top: 0, left: 0, right: BREITE, bottom: 640, width: band.hidden ? 0 : BREITE, height: 640 });
    Object.defineProperty(band, "clientWidth", { get: () => (band.hidden ? 0 : BREITE) });
    band.scrollTo = (ziel) => { band.rollen.push(ziel); };
    const frei = dokument.createElement("div");
    frei.className = "ohne-leiste";
    frei.hidden = true;
    const inhalt = dokument.createElement("main");
    inhalt.className = "inhalt";
    frei.appendChild(inhalt);
    const ebenen = dokument.createElement("div");
    const streifen = dokument.createElement("div");
    streifen.id = "anprobe";
    streifen.hidden = true;
    for (const el of [band, frei, ebenen, streifen]) {
        dokument.body.appendChild(el);
    }
    N.starten(inhalt, "sammlung", null, ebenen, band);

    s.umgebung = umgebung;
    s.N = N;
    s.band = band;
    s.ebenen = ebenen;
    s.Sa = umgebung.SAMMLUNG_BILDSCHIRM;
    s.Sh = umgebung.SHOP_BILDSCHIRM;
    s.K = umgebung.UPCREW_KATALOG;
    s.B = umgebung.BESITZ;
    s.leerlauf = () => {
        while (leerlauf.length) {
            leerlauf.shift()();
        }
    };
    s.zug = () => new Promise((fertig) => setTimeout(fertig, 0));
    s.text = (el) => (el ? el.textContent.replace(/\s+/g, " ").trim() : null);
    s.seite = (id) => band.querySelector(".inhalt[data-bildschirm=\"" + id + "\"]");
    s.blatt = () => ebenen.querySelector(".upa-blatt");
    s.shopKnopf = () => ebenen.querySelector(".upa-zumshop");
    s.uebernehmen = () => ebenen.querySelector(".upa-uebernehmen");
    s.shopBlatt = (kennung) => ebenen.querySelector("[data-up-shop=\"" + kennung + "\"]");
    /* Ein Stück im Blatt einer Kategorie antippen (es wird der Entwurf). */
    s.antippen = (kat, wert) => {
        if (!s.blatt()) {
            s.Sa._tab.blattOeffnen(kat);
        }
        const knopf = ebenen.querySelectorAll(".upa-stueck").find((k) => k.dataset.wert === wert);
        if (knopf) {
            knopf.click();
        }
        return knopf || null;
    };
    return s;
}

/* Das erste kaufbare, wirksame Kachel-Set (ohne Taten und bei Level 0 nicht frei). */
function kaufbaresSet(s) {
    return s.K.stuecke("kachelset").filter((x) => x.weg === "kauf" && x.wirkt === true)
        .find((x) => !s.Sa.erspielt("kachelset", x.wert));
}

spaeter("Weg in den Shop", (async () => {
    /* ------------------------------------------------------------------ *
     * 1. Knopf → Shop-Tab → Reiter Design → Stück-Blatt (Shop nie gebaut)
     * ------------------------------------------------------------------ */
    const s = welt();
    const stueck = kaufbaresSet(s);
    const kennung = "stueck:" + s.K.kennung(stueck);
    gleich("Die Kennung des Shops = „stueck:“ + Art + „-“ + Wert = UPCREW_KATALOG.kennung", kennung, "stueck:kachelset-" + stueck.wert);
    gleich("Vorher: die Sammlung ist offen, die Shop-Seite noch nie gebaut (sie entstünde im Leerlauf)",
        [s.N.aktuell, s.Sh._griff, s.seite("shop").children.length], ["sammlung", null, 0]);

    s.antippen("kachelset", stueck.wert);
    const knopf = s.shopKnopf();
    gleich("Ein kaufbares, nicht besessenes Stück zur Probe: „Im Shop ansehen“ statt „Nicht im Besitz“",
        [!!knopf && !knopf.hidden, s.text(knopf), s.uebernehmen().hidden], [true, "Im Shop ansehen", true]);
    gleich("… der Knopf trägt den Katalog-Schlüssel", [knopf.dataset.art, knopf.dataset.wert], ["kachelset", stueck.wert]);

    const gerufen = [];
    const echt = s.Sa.zumShop;
    s.Sa.zumShop = (weg) => { gerufen.push(JSON.parse(JSON.stringify(weg))); return echt.call(s.Sa, weg); };
    const rollenVorher = s.band.rollen.length;
    let fehler = null;
    try {
        knopf.click();
    } catch (f) {
        fehler = f;
    }
    s.Sa.zumShop = echt;
    gleich("Ein Tipp: kein Fehler, das Spiel wird EINMAL mit { art, wert } gerufen", [fehler, gerufen], [null, [{ art: "kachelset", wert: stueck.wert }]]);
    gleich("… der Shop-Tab ist offen (Verlaufseintrag wie beim Tipp auf die Leiste), das Sammlung-Blatt zu",
        [s.N.aktuell, s.verlauf.indexOf("neu:shop") !== -1, !!s.blatt()], ["shop", true, false]);
    const fahrt = s.band.rollen.slice(rollenVorher);
    pruefe("… das Band fährt zur Shop-Seite (ganz links)",
        (fahrt.length > 0 && fahrt[fahrt.length - 1].left === 0) || (fahrt.length === 0 && s.band.scrollLeft === 0),
        JSON.stringify({ fahrt, links: s.band.scrollLeft }));
    gleich("… die Shop-Seite ist jetzt gebaut, Reiter „Design“", [!!s.Sh._griff, s.Sh._griff && s.Sh._griff.teil(),
        s.seite("shop").querySelectorAll(".up-shop").length], [true, "design", 1]);
    const blatt = s.shopBlatt(kennung);
    pruefe("… das Stück-Blatt ist offen", !!blatt);
    const kauf = s.ebenen.querySelector(".up-shop-kaufen");
    gleich("… mit Preis und „Kaufen“", [!!kauf && kauf.disabled, s.text(kauf)], [false, "Kaufen · " + stueck.preis]);

    /* ------------------------------------------------------------------ *
     * 2. Kaufen → zurück in die Sammlung: frei und übernehmbar
     * ------------------------------------------------------------------ */
    kauf.click();
    await s.zug();
    gleich("Kaufen: Rückfrage, Besitz da, Münzen weg", [s.fragen.length, s.B.menge()], [1, { kachelset: [stueck.wert] }]);
    gleich("… das Blatt zeigt „Im Besitz“", s.text(s.ebenen.querySelector(".up-shop-kaufen")), "Im Besitz");
    await s.zug();
    s.N.zeigen("sammlung", null);
    gleich("Zurück in der Sammlung (Tipp auf die Leiste): alle Blätter zu", [s.N.aktuell, s.ebenen.querySelectorAll(".up-shop-blatt").length], ["sammlung", 0]);
    s.antippen("kachelset", stueck.wert);
    gleich("… das gekaufte Set: kein „Im Shop ansehen“ mehr, „Übernehmen“ ist an",
        [s.shopKnopf() ? s.shopKnopf().hidden : true, s.uebernehmen().hidden, s.uebernehmen().disabled, s.text(s.uebernehmen())],
        [true, false, false, "Übernehmen"]);
    s.uebernehmen().click();
    gleich("… und übernehmbar", s.umgebung.KACHELSETS.gewaehlt(), stueck.wert);

    /* ------------------------------------------------------------------ *
     * 3. Die Shop-Seite stand schon frisch da (Reiter „Typoluck“)
     * ------------------------------------------------------------------ */
    const f = welt();
    f.leerlauf();
    const griff = f.Sh._griff;
    pruefe("Im Leerlauf ist die Shop-Seite entstanden", !!griff);
    griff.teilSetzen("vorrat");
    const fStueck = kaufbaresSet(f);
    let gezeichnet = 0;
    const zeichnen = griff.zeichnen;
    griff.zeichnen = () => { gezeichnet++; return zeichnen(); };
    f.antippen("kachelset", fStueck.wert);
    f.shopKnopf().click();
    gleich("Frische Seite: nicht neu gebaut (derselbe Griff), der Reiter springt auf „Design“, das Blatt ist offen",
        [f.N.aktuell, f.Sh._griff === griff, griff.teil(), !!f.shopBlatt("stueck:" + f.K.kennung(fStueck))],
        ["shop", true, "design", true]);
    pruefe("… gezeichnet nur durch den Reiter-Wechsel (kein Neu-Bau der Seite)", gezeichnet <= 1, gezeichnet);
    f.N.zeigen("sammlung", null);
    f.N.zeigen("shop", null);
    gleich("Später über die Leiste: der Shop hält seinen Zustand (Reiter „Design“), kein offenes Blatt",
        [f.Sh._griff === griff, griff.teil(), f.ebenen.querySelectorAll(".up-shop-blatt").length], [true, "design", 0]);

    /* ------------------------------------------------------------------ *
     * 4. Ohne Kauf-Weg kein Knopf
     * ------------------------------------------------------------------ */
    const b = welt({ besitz: { ich: { kachelset: [fStueck.wert] } } });
    b.antippen("kachelset", fStueck.wert);
    gleich("Besessen: kein „Im Shop ansehen“, „Übernehmen“ ist an",
        [b.shopKnopf() ? b.shopKnopf().hidden : true, b.uebernehmen().hidden, b.uebernehmen().disabled], [true, false, false]);
    b.antippen("kachelset", "papier");
    gleich("Frei auf dem heutigen Weg (Grund-Set): kein Knopf", b.shopKnopf() ? b.shopKnopf().hidden : true, true);
    b.Sa._tab.blattSchliessen();
    const bald = ["farbwelt", "schrift", "knoepfe"].map((art) => b.K.stuecke(art).find((x) => x.wirkt !== true)).find(Boolean);
    if (bald) {
        b.antippen(bald.art, bald.wert);
        gleich("„Bald“ (" + bald.art + " " + bald.wert + "): kein Knopf", b.shopKnopf() ? b.shopKnopf().hidden : true, true);
        b.Sa._tab.blattSchliessen();
    }
    gleich("Das Regal der Sets (Darstellung · Sets) hat keinen Shop-Knopf",
        (b.Sa._tab.blattOeffnen("sets"), b.ebenen.querySelectorAll(".upa-zumshop").length), 0);

    /* ------------------------------------------------------------------ *
     * 5. Klappt das Öffnen nicht: nur der Tab-Wechsel
     * ------------------------------------------------------------------ */
    const o = welt({ ohneShop: true });
    const oStueck = kaufbaresSet(o);
    o.antippen("kachelset", oStueck.wert);
    let oFehler = null;
    try {
        o.shopKnopf().click();
    } catch (x) {
        oFehler = x;
    }
    gleich("Shop nicht geladen: kein Fehler, der Tab-Wechsel geschieht, kein Blatt, die Seite zeigt „Nicht geladen“",
        [oFehler, o.N.aktuell, o.ebenen.querySelectorAll(".up-bl-blatt, .up-shop-blatt, .upa-blatt").length,
            o.text(o.seite("shop").querySelector(".zustand-fehler"))], [null, "shop", 0, "Nicht geladen"]);
    o.N.zeigen("sammlung", null);
    pruefe("… die Sammlung geht danach wie vorher", o.N.aktuell === "sammlung" && !!o.seite("sammlung").querySelector(".upa-kat"));

    gleich("Unbekanntes Stück: false, kein Blatt (es bleibt beim Tab-Wechsel)",
        [s.Sh.stueckOeffnen("kachelset", "gibt-es-nicht"), s.Sh.stueckOeffnen("", ""), s.ebenen.querySelectorAll(".up-shop-blatt").length],
        [false, false, 0]);
    gleich("Nicht auf der Shop-Seite: stueckOeffnen öffnet nichts", [s.N.aktuell, s.Sh.stueckOeffnen("kachelset", stueck.wert)], ["sammlung", false]);
    gleich("zumShop ohne Stück: nichts geschieht", [s.Sa.zumShop(null), s.Sa.zumShop({ art: "kachelset" }), s.N.aktuell], [false, false, "sammlung"]);

    /* Quelle: derselbe Weg wie ein Tipp auf die Leiste. */
    const quelle = lesen("js/bildschirm-sammlung.js").replace(/\/\*[\s\S]*?\*\//g, "");
    pruefe("Die Sammlung übergibt zumShop an UPCREW_ANPASSEN.zeigen", /zumShop: \(stueck\) => SAMMLUNG_BILDSCHIRM\.zumShop\(stueck\)/.test(quelle));
    pruefe("zumShop wechselt über NAVIGATION.zeigen(\"shop\", null) — den Weg der Leiste", /NAVIGATION\.zeigen\("shop", null\)/.test(quelle));
})());

fazit();
