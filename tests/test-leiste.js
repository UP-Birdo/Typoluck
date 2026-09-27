/*
 * test-leiste.js — die wandernde Kapsel der Leiste (seit 0.15.12, gemeinsamer
 * Baustein js\upcrew-leiste.js + css\upcrew-leiste.css aus
 * Design\3D-Schrift\final, Fassung „C · Gleiten + Hüpfen"; Nutzer
 * 27.09.2026: „die Animation beim Tab-Wechseln unten muss besser werden").
 *
 *   1. Das Ziel der Kapsel aus den flex-Anteilen, MIT dem Seitenrand der
 *      Typoluck-Leiste (16 px, `.leiste.up-leiste` in css\stil.css).
 *   2. Die Einbindung: einmal `UPCREW_LEISTE.an(leisteEl)` nach dem Bauen,
 *      am Tab-Wechsel nichts; Laden in der richtigen Reihenfolge, offline.
 *   3. Ohne Bewegung bei `prefers-reduced-motion`.
 */

const fs = require("fs");
const pfad = require("path");
const { pruefe, gleich, fazit } = require("./pruefer.js");

const wurzel = pfad.join(__dirname, "..");
const lesen = (name) => fs.readFileSync(pfad.join(wurzel, name), "utf8");
const L = require("../js/upcrew-leiste.js");

/* 1. Ziel der Kapsel: 5 Tabs, einer aktiv (2,5), Leiste 390 px mit 16 px Rand. */
function leiste(breite, rand) {
    const tabs = [];
    const nav = {
        clientWidth: breite,
        children: tabs,
        _stil: { paddingLeft: rand + "px", paddingRight: rand + "px" }
    };
    for (let i = 0; i < 5; i++) {
        tabs.push({ classList: { contains: (k) => k === "up-tab" }, offsetTop: 10, offsetHeight: 44 });
    }
    return nav;
}
global.getComputedStyle = (el) => el._stil;
try {
    const nav = leiste(390, 16);
    const innen = 390 - 32;
    const teil = innen / (4 + 2.5);
    const z = L.ziel(nav, nav.children[2]);
    gleich("Start (Mitte): x = Rand + 2 Anteile + 4", Math.round(z.x * 100) / 100, Math.round((16 + 2 * teil + 4) * 100) / 100);
    gleich("Breite = 2,5 Anteile − 8", Math.round(z.w * 100) / 100, Math.round((2.5 * teil - 8) * 100) / 100);
    const links = L.ziel(nav, nav.children[0]);
    gleich("Erster Tab beginnt am Seitenrand (+4)", links.x, 20);
    const rechts = L.ziel(nav, nav.children[3]);
    pruefe("Letzter wählbarer Tab (Rangliste) endet vor dem Rand",
        rechts.x + rechts.w <= 390 - 16 - 4 - teil + 0.01);
    const nav320 = leiste(320, 16);
    const schmal = L.ziel(nav320, nav320.children[1]);
    pruefe("Bei 320 px: Kapsel positiv breit und in der Leiste", schmal.w > 40 && schmal.x > 16);
    gleich("Fremdes Element: kein Ziel", L.ziel(nav, {}), null);
} finally {
    delete global.getComputedStyle;
}
gleich("Aktiver Anteil passt zur CSS (flex 2.5)", L.AKTIV_ANTEIL, 2.5);
pruefe("CSS: der aktive Tab hat flex 2.5", /\[aria-current="page"\][^{]*\{[^}]*flex:\s*2\.5/.test(lesen("css/upcrew-leiste.css")));

/* 2. Einbindung */
{
    const nav = lesen("js/navigation.js");
    pruefe("Einmal nach dem Bauen der Leiste: UPCREW_LEISTE.an(leisteEl)",
        /NAVIGATION\._leisteMarkieren\(\);[\s\S]{0,600}UPCREW_LEISTE\.an\(leisteEl\)/.test(nav)
            && (nav.match(/UPCREW_LEISTE\.an\(/g) || []).length === 1);
    pruefe("Der Tab-Wechsel setzt weiter nur aria-current (nichts für die Kapsel)",
        /setAttribute\("aria-current", "page"\)/.test(nav) && !/up-kapsel|up-hopp/.test(nav));
    const index = lesen("index.html");
    pruefe("index.html: upcrew-leiste.js nach der Leisten-CSS und vor navigation.js",
        index.indexOf("js/upcrew-leiste.js") > index.indexOf("css/upcrew-leiste.css")
            && index.indexOf("js/upcrew-leiste.js") < index.indexOf("js/navigation.js"));
    pruefe("Offline: sw.js kennt upcrew-leiste.js", lesen("sw.js").indexOf("\"./js/upcrew-leiste.js\"") !== -1);
}

/* 3. Ohne Bewegung */
{
    const css = lesen("css/upcrew-leiste.css");
    const ruhig = css.slice(css.lastIndexOf("prefers-reduced-motion"));
    pruefe("prefers-reduced-motion: Kapsel ohne Übergang, Symbol ohne Hüpfen",
        /\.up-kapsel/.test(ruhig) && /transition: none/.test(ruhig) && /\.up-tab\.up-hopp svg \{ animation: none; \}/.test(ruhig));
}

fazit();
