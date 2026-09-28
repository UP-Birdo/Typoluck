/*
 * test-wischen.js — Tabs wechseln durch Wischen (seit 0.15.10, gemeinsamer
 * Baustein js\upcrew-wischen.js aus Design\3D-Schrift\final, gleich in
 * Blunderluck; Nutzer 27.09.2026: „mache, dass man in den Menüs swipen
 * kann, um die Tabs zu wechseln").
 *
 *   1. Die reine Logik des Bausteins (wie Apps\Blunderluck\tests\
 *      test-wischen.js): Schwellen, Richtung, stille Tabs, Enden, Sperren.
 *   2. Die Einbindung in Typoluck (js\navigation.js): Leisten-Reihenfolge,
 *      „Bald" still, Wechsel über NAVIGATION.zeigen wie ein Tipp, gesperrt
 *      in der Runde, in Anmeldung, Intro und Dialogen, auf Spielfeld,
 *      Tastatur und Umschaltern.
 *   3. Ein ganzer Wisch mit nachgestellten Zeiger-Ereignissen.
 */

const fs = require("fs");
const pfad = require("path");
const vm = require("vm");
const { pruefe, gleich, spaeter, fazit } = require("./pruefer.js");

const wurzel = pfad.join(__dirname, "..");
const lesen = (name) => fs.readFileSync(pfad.join(wurzel, name), "utf8");
const W = require("../js/upcrew-wischen.js");

/* ------------------------------------------------------------------ *
 * 1. Logik des Bausteins
 * ------------------------------------------------------------------ */

gleich("Nach links weit = nächster Tab rechts", W.entscheiden(-80, 10, 400), 1);
gleich("Nach rechts weit = vorheriger", W.entscheiden(80, 10, 400), -1);
gleich("Zu kurz und langsam: nichts", W.entscheiden(-50, 5, 400), 0);
gleich("Kurz, aber schnell: Wechsel", W.entscheiden(-40, 5, 60), 1);
gleich("Zu schräg: nichts", W.entscheiden(-90, 70, 300), 0);
gleich("Senkrecht rollen: nichts", W.entscheiden(0, 300, 300), 0);

/* ------------------------------------------------------------------ *
 * 2. Einbindung in Typoluck
 * ------------------------------------------------------------------ */

function welt() {
    const klassen = new Set();
    const umgebung = {
        console,
        UPCREW_WISCHEN: W,
        document: {
            body: { classList: { contains: (k) => klassen.has(k), add: (k) => klassen.add(k),
                remove: (k) => klassen.delete(k) } },
            querySelector: () => null
        },
        window: { addEventListener() {} },
        history: { pushState() {}, replaceState() {} }
    };
    vm.createContext(umgebung);
    vm.runInContext(lesen("js/navigation.js") + "\n;globalThis.NAVIGATION = NAVIGATION;", umgebung,
        { filename: "navigation.js" });
    return { NAVIGATION: umgebung.NAVIGATION, klassen, umgebung };
}

{
    const { NAVIGATION, klassen, umgebung } = welt();
    const tabs = NAVIGATION.wischenTabs();
    gleich("Wischbar: die Leiste in ihrer Reihenfolge, seit 0.17.0 mit dem Shop auf Platz 5", JSON.parse(JSON.stringify(tabs)),
        ["herausforderungen", "sammlung", "start", "rangliste", "shop"]);
    gleich("Von Start nach links wischen = Rangliste", W.nachbar(tabs, "start", 1), "rangliste");
    gleich("Von Start nach rechts wischen = Sammlung", W.nachbar(tabs, "start", -1), "sammlung");
    gleich("Nach Rangliste kommt der Shop", W.nachbar(tabs, "rangliste", 1), "shop");
    gleich("Rechtes Ende: nach dem Shop nichts", W.nachbar(tabs, "shop", 1), null);
    gleich("Ein stiller Platz würde übersprungen", W.nachbar(["a", { id: "b", still: true }], "a", 1), null);
    gleich("Linkes Ende: vor Aufgaben nichts", W.nachbar(tabs, "herausforderungen", -1), null);
    gleich("In der Runde (Wordguesser) steht kein Leisten-Tab: kein Ziel", W.nachbar(tabs, "wordle", 1), null);
    gleich("Profil und Einstellungen (Menü) wischen nicht", [W.nachbar(tabs, "profil", 1),
        W.nachbar(tabs, "einstellungen", -1)], [null, null]);

    gleich("Frei: erlaubt", NAVIGATION.wischenErlaubt(), true);
    for (const klasse of ["im-spiel", "anmeldung-offen", "dialog-offen"]) {
        klassen.add(klasse);
        gleich("Gesperrt bei body." + klasse, NAVIGATION.wischenErlaubt(), false);
        klassen.delete(klasse);
    }
    umgebung.document.querySelector = (s) => (s === ".upi:not([hidden])" ? {} : null);
    gleich("Gesperrt, solange das Intro läuft", NAVIGATION.wischenErlaubt(), false);
}

/* Sperren: Spielfeld, Tastatur, Umschalter, Menü — plus die des Bausteins. */
function element(klassen, eigen) {
    return Object.assign({
        nodeType: 1, parentElement: null, scrollWidth: 100, clientWidth: 100,
        closest(selektor) {
            const teile = selektor.split(",").map((s) => s.trim());
            return teile.some((t) => klassen.some((k) => t === k)) ? this : null;
        }
    }, eigen || {});
}
const dok = { querySelectorAll: () => [] };
{
    const { NAVIGATION } = welt();
    const opt = { dokument: dok, sperren: NAVIGATION.WISCHEN_SPERREN, erlaubt: () => true };
    gleich("Frei auf dem Inhalt", W.startErlaubt(element([]), 200, 390, opt), true);
    for (const k of [".wordle-brett", ".tastatur", ".segment", ".menue", ".upa-reihe", ".upa-mini-seg", "input", "textarea"]) {
        gleich("Kein Wischen auf " + k, W.startErlaubt(element([k]), 200, 390, opt), false);
    }
    gleich("Kein Wischen vom Bildschirmrand", W.startErlaubt(element([]), 10, 390, opt), false);
}

{
    const nav = lesen("js/navigation.js");
    pruefe("Eingebunden in NAVIGATION.starten über UPCREW_WISCHEN.an(inhaltEl",
        /NAVIGATION\.wischenEinrichten\(inhaltEl\)/.test(nav) && /UPCREW_WISCHEN\.an\(inhaltEl, \{/.test(nav));
    pruefe("Gewechselt wird über NAVIGATION.zeigen wie beim Tipp auf die Leiste",
        /wechseln: \(id\) => \{\s*if \(NAVIGATION\.aktuell !== id\) \{\s*NAVIGATION\.zeigen\(id, null\);/.test(nav));
    pruefe("Während der Runde gibt die Fläche jede Geste zurück (touch-action: auto)",
        /body\.im-spiel \.up-wischen \{\s*touch-action: auto;/.test(lesen("css/stil.css")));
    const index = lesen("index.html");
    pruefe("index.html lädt Baustein und Stil (vor navigation.js)",
        index.indexOf("js/upcrew-wischen.js") !== -1 && index.indexOf("css/upcrew-wischen.css") !== -1
            && index.indexOf("js/upcrew-wischen.js") < index.indexOf("js/navigation.js"));
    pruefe("Die Seite selbst rollt und überrollt nicht waagrecht (overflow-x: clip, overscroll-behavior-x: none)",
        /html,\s*body \{\s*overflow-x: clip;\s*overscroll-behavior-x: none;/.test(lesen("css/stil.css")));
    const sw = lesen("sw.js");
    pruefe("Offline: sw.js kennt beide Dateien",
        sw.indexOf("\"./js/upcrew-wischen.js\"") !== -1 && sw.indexOf("\"./css/upcrew-wischen.css\"") !== -1);
    const quelle = lesen("js/upcrew-wischen.js").replace(/\/\*[\s\S]*?\*\//g, "");
    pruefe("Baustein: passiv, kein preventDefault, nur Finger/Stift",
        !/preventDefault/.test(quelle) && /passive: true/.test(quelle)
            && /pointerType !== "touch" && e\.pointerType !== "pen"/.test(quelle));
}

/* ------------------------------------------------------------------ *
 * 3. Ein ganzer Wisch mit nachgestellten Zeigern
 * ------------------------------------------------------------------ */

function flaecheBauen() {
    const horcher = {};
    return {
        horcher,
        classList: { add() {}, remove() {} },
        style: {},
        offsetWidth: 390,
        addEventListener(art, f) { horcher[art] = f; },
        removeEventListener() {},
        zug(punkte, ziel, art) {
            const z = ziel || element([]);
            const typ = art || "touch";
            let t = 0;
            horcher.pointerdown({ pointerType: typ, pointerId: 1, target: z, clientX: punkte[0][0], clientY: punkte[0][1], timeStamp: t });
            for (const [x, y] of punkte.slice(1)) {
                t += 40;
                horcher.pointermove({ pointerType: typ, pointerId: 1, target: z, clientX: x, clientY: y, timeStamp: t });
            }
            const [x, y] = punkte[punkte.length - 1];
            horcher.pointerup({ pointerType: typ, pointerId: 1, target: z, clientX: x, clientY: y, timeStamp: t + 40 });
        }
    };
}

spaeter("Wischen mit Zeigern", (async () => {
    global.window = { innerWidth: 390 };
    global.document = { querySelectorAll: () => [] };
    const warten = () => new Promise((r) => setTimeout(r, 160));
    try {
        const { NAVIGATION, klassen } = welt();
        const gezeigt = [];
        NAVIGATION.aktuell = "rangliste";
        NAVIGATION.zeigen = (id) => { gezeigt.push(id); NAVIGATION.aktuell = id; };
        const f = flaecheBauen();
        NAVIGATION.wischenEinrichten(f);

        f.zug([[300, 400], [250, 402], [180, 405]]);
        await warten();
        gleich("Nach links gewischt: Rangliste → Shop", gezeigt, ["shop"]);
        f.zug([[300, 400], [250, 402], [180, 405]]);
        await warten();
        gleich("Rechtes Ende: nichts", gezeigt, ["shop"]);
        f.zug([[100, 400], [160, 401], [230, 403]]);
        await warten();
        f.zug([[100, 400], [160, 401], [230, 403]]);
        await warten();
        f.zug([[100, 400], [160, 401], [230, 403]]);
        await warten();
        f.zug([[100, 400], [160, 401], [230, 403]]);
        await warten();
        gleich("Nach rechts: Shop → Rangliste → Start → Sammlung → Aufgaben", gezeigt,
            ["shop", "rangliste", "start", "sammlung", "herausforderungen"]);
        f.zug([[100, 400], [160, 401], [230, 403]]);
        await warten();
        gleich("Linkes Ende: nichts", gezeigt.length, 5);

        f.zug([[200, 200], [205, 300], [210, 500]]);
        await warten();
        gleich("Senkrecht rollen: kein Wechsel", gezeigt.length, 5);
        f.zug([[300, 400], [250, 402], [180, 405]], element([".tastatur"]));
        await warten();
        gleich("Auf der Tastatur: kein Wechsel", gezeigt.length, 5);
        f.zug([[300, 400], [250, 402], [180, 405]], null, "mouse");
        await warten();
        gleich("Mit der Maus: kein Wechsel", gezeigt.length, 5);
        klassen.add("im-spiel");
        f.zug([[300, 400], [250, 402], [180, 405]]);
        await warten();
        gleich("In der Runde (body.im-spiel): kein Wechsel", gezeigt.length, 5);
        klassen.delete("im-spiel");
        f.zug([[300, 400], [250, 402], [180, 405]]);
        await warten();
        gleich("Danach wieder: Aufgaben → Sammlung", gezeigt[5], "sammlung");
        await new Promise((r) => setTimeout(r, 250));
        gleich("Die Fläche steht danach wieder an ihrem Platz", [f.style.transform, f.style.opacity], ["", ""]);

        /* Seit 0.15.11 (Nutzer: „rechts und links ist Stopp"): Am Ende ohne
           Nachbarn bewegt sich beim Ziehen GAR NICHTS, dazwischen folgt der
           Inhalt gedämpft. */
        const ziehen = (von, bis) => {
            const z = element([]);
            f.horcher.pointerdown({ pointerType: "touch", pointerId: 2, target: z, clientX: von, clientY: 400, timeStamp: 0 });
            f.horcher.pointermove({ pointerType: "touch", pointerId: 2, target: z, clientX: (von + bis) / 2, clientY: 401, timeStamp: 40 });
            f.horcher.pointermove({ pointerType: "touch", pointerId: 2, target: z, clientX: bis, clientY: 402, timeStamp: 80 });
            const weg = f.style.transform;
            f.horcher.pointercancel({ pointerId: 2 });
            return weg;
        };
        NAVIGATION.aktuell = "shop";
        gleich("Shop (rechtes Ende), nach links gezogen: nichts bewegt sich", ziehen(300, 150), "translateX(0px)");
        NAVIGATION.aktuell = "herausforderungen";
        gleich("Aufgaben, nach rechts gezogen: nichts bewegt sich", ziehen(100, 250), "translateX(0px)");
        pruefe("Dazwischen folgt der Inhalt dem Finger", /translateX\(-\d/.test(ziehen(300, 150)));
        await new Promise((r) => setTimeout(r, 250));
    } finally {
        delete global.window;
        delete global.document;
    }
})());

fazit();
