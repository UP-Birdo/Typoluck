/*
 * test-knoepfe.js — die UPCrew-Knöpfe (seit 0.8.0, UPCrew-Runde 3).
 *
 *   1. BAUSTEINE.knopf gibt Haupt-, Still- und Gefahr-Knöpfen die Klassen
 *      des gemeinsamen Bausteins (up-kn + up-haupt/up-zweit/up-gefahr, nur
 *      Zeichen: up-rund) und den Leuchtpunkt als ERSTES Kind; flache
 *      Knöpfe und Menü-Einträge bleiben ohne. Die Tabs der Leiste (seit
 *      0.9.0, BAUSTEINE.tab) tragen genau das Markup von upcrew-leiste.css.
 *   2. Kein eigener Stil gibt diesen Knöpfen noch Rundung, Kante, Schatten
 *      oder Rahmen — die Form kommt allein aus css\upcrew-knoepfe.css.
 *      Gezählt wird in jeder eigenen Stil-Datei (die kopierten Bausteine
 *      upcrew-* sind ausgenommen, sie SIND die Form).
 *
 * bausteine.js braucht ein DOM; es läuft hier in einem eigenen Kontext mit
 * einem kleinen Ersatz-Dokument — die ECHTE Datei, keine Kopie.
 */

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { pruefe, gleich, fazit } = require("./pruefer.js");

const wurzel = path.join(__dirname, "..");

/* ------------------------------------------------------------------ *
 * 1. Die Klassen aus BAUSTEINE.knopf
 * ------------------------------------------------------------------ */

function element(tag) {
    return {
        tagName: String(tag).toUpperCase(),
        className: "",
        children: [],
        attribute: {},
        textContent: "",
        appendChild(kind) {
            this.children.push(kind);
            return kind;
        },
        setAttribute(name, wert) {
            this.attribute[name] = String(wert);
            if (name === "class") {
                this.className = String(wert);
            }
        },
        removeAttribute(name) {
            delete this.attribute[name];
            if (name === "class") {
                this.className = "";
            }
        },
        addEventListener() {}
    };
}

const kontext = vm.createContext({
    document: {
        createElement: (tag) => element(tag),
        createElementNS: (ns, tag) => element(tag)
    }
});
vm.runInContext(fs.readFileSync(path.join(wurzel, "js", "bausteine.js"), "utf8"), kontext,
    { filename: "bausteine.js" });
const BAUSTEINE = vm.runInContext("BAUSTEINE", kontext);

const klassen = (knopf) => knopf.className.split(/\s+/).filter(Boolean).sort();
const erstesKind = (knopf) => knopf.children[0] || {};

const erwartet = { haupt: "up-haupt", still: "up-zweit", gefahr: "up-gefahr" };
for (const art of Object.keys(erwartet)) {
    const knopf = BAUSTEINE.knopf({ text: "Los", art: art, zeichen: "weiter" });
    const k = klassen(knopf);
    pruefe("Knopf " + art + ": up-kn + " + erwartet[art],
        k.indexOf("up-kn") !== -1 && k.indexOf(erwartet[art]) !== -1, k.join(" "));
    pruefe("Knopf " + art + ": behält knopf-" + art, k.indexOf("knopf-" + art) !== -1);
    pruefe("Knopf " + art + ": mit Text kein up-rund", k.indexOf("up-rund") === -1);
    gleich("Knopf " + art + ": Leuchtpunkt als erstes Kind",
        [erstesKind(knopf).tagName, erstesKind(knopf).className], ["I", "up-led"]);
    gleich("Knopf " + art + ": danach Zeichen und Text",
        knopf.children.slice(1).map((kind) => kind.tagName), ["SVG", "SPAN"]);
}

gleich("Vorgabe (ohne Art) ist still = up-zweit", klassen(BAUSTEINE.knopf({ text: "x" })),
    ["knopf", "knopf-still", "up-kn", "up-zweit"]);
pruefe("Nur Zeichen, kein Text: up-rund",
    klassen(BAUSTEINE.knopf({ art: "haupt", zeichen: "weiter", titel: "Weiter" })).indexOf("up-rund") !== -1);
pruefe("Klein und breit bleiben Zusätze",
    ["knopf-klein", "knopf-breit"].every((z) =>
        klassen(BAUSTEINE.knopf({ text: "x", art: "haupt", klein: true, breit: true })).indexOf(z) !== -1));

for (const art of ["flach", "menue"]) {
    const knopf = BAUSTEINE.knopf({ text: "x", art: art, zeichen: "start" });
    pruefe("Knopf " + art + ": bleibt ohne up-kn", klassen(knopf).indexOf("up-kn") === -1, knopf.className);
    pruefe("Knopf " + art + ": ohne Leuchtpunkt", erstesKind(knopf).className !== "up-led");
}

/* Die Tabs der Leiste (seit 0.9.0, UPCrew-Runde 4): genau das Markup des
   Bausteins css\upcrew-leiste.css — up-tab, darin Zeichen (ohne eigene
   Klasse) und Name; der Name steht auch in aria-label. */
const tab = BAUSTEINE.tab({ name: "Start", zeichen: "start", beiKlick: () => {} });
gleich("Tab: nur up-tab", klassen(tab), ["up-tab"]);
gleich("Tab: Zeichen, dann Name", tab.children.map((kind) => kind.tagName), ["SVG", "SPAN"]);
gleich("Tab: Name im Text", tab.children[1].textContent, "Start");
gleich("Tab: Name für Vorleser", tab.attribute["aria-label"], "Start");
pruefe("Tab: kein Knopf-Stil (weder knopf noch up-kn)",
    klassen(tab).every((k) => k !== "knopf" && k !== "up-kn"));
const still = BAUSTEINE.tab({ name: "Bald", zeichen: "bald", still: true });
gleich("Stiller Tab: up-tab-still", klassen(still), ["up-tab", "up-tab-still"]);
pruefe("Stiller Tab: abgeschaltet", still.disabled === true);

/* ------------------------------------------------------------------ *
 * 2. Keine eigenen Form-Regeln mehr für diese Knöpfe
 * ------------------------------------------------------------------ */

/* Ein Selektor, der die UPCrew-Knöpfe trifft: ihre Art-Klassen, up-kn —
   oder der blanke `.knopf` (mit Zuständen wie :active), der für ALLE
   Knöpfe gilt. `.knopf.knopf-leiste` o. ä. trifft nur die anderen. */
function trifftUpKnopf(selektor) {
    const s = selektor.trim();
    return /\.knopf-(haupt|still|gefahr)\b/.test(s) || /\.up-kn\b/.test(s)
        || /^\.knopf(:[\w-]+(\([^)]*\))?)*$/.test(s);
}
const FORM = /(^|[;{\s])(border-radius|box-shadow|border|border-color|border-width|border-style)\s*:/;

let regeln = 0;
const verstoesse = [];
const eigeneStile = fs.readdirSync(path.join(wurzel, "css")).filter((d) => d.endsWith(".css") && !d.startsWith("upcrew-"));
for (const datei of eigeneStile) {
    const text = fs.readFileSync(path.join(wurzel, "css", datei), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    const block = /([^{}]+)\{([^{}]*)\}/g;
    let treffer;
    while ((treffer = block.exec(text)) !== null) {
        const selektoren = treffer[1].split(",").filter(trifftUpKnopf);
        if (selektoren.length === 0) {
            continue;
        }
        regeln++;
        const koerper = treffer[2];
        const zeilen = koerper.split(";").map((z) => z.trim()).filter((z) => FORM.test(" " + z));
        for (const zeile of zeilen) {
            verstoesse.push(datei + ": " + selektoren.map((s) => s.trim()).join(", ") + " { " + zeile + " }");
        }
    }
}
pruefe("Die Prüfung hat Knopf-Regeln gefunden (sonst prüfte sie nichts)", regeln >= 2, String(regeln));
gleich("Kein eigener Stil gibt den UPCrew-Knöpfen Rundung, Kante, Schatten oder Rahmen", verstoesse, []);
pruefe("Die alten Regeln .knopf-haupt/-still/-gefahr sind weg",
    !/\.knopf-(haupt|still|gefahr)\s*\{/.test(fs.readFileSync(path.join(wurzel, "css", "stil.css"), "utf8")));

/* Der Baustein ist da und lädt NACH dem eigenen Stil (sonst verlöre er). */
const index = fs.readFileSync(path.join(wurzel, "index.html"), "utf8");
const stile = (index.match(/<link rel="stylesheet" href="([^"]+)"/g) || []).map((z) => z.match(/href="([^"]+)"/)[1]);
/* Ausnahme seit 0.25.0: stil-blatt.css (nur die Werte der Blätter, keine
   Knopf-Regel — die Prüfung oben deckt auch sie ab) lädt nach allen
   Bausteinen, wie in Blunderluck. */
pruefe("upcrew-knoepfe.css lädt nach allen eigenen Stilen (ausser stil-blatt.css)",
    stile.indexOf("css/upcrew-knoepfe.css") > Math.max(...eigeneStile.filter((d) => d !== "stil-blatt.css")
        .map((d) => stile.indexOf("css/" + d))));

/* Gefahr braucht Kante und Schrift — hell und dunkel (drei Blöcke). */
const stil = fs.readFileSync(path.join(wurzel, "css", "stil.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
gleich("--gefahr-kante hell, Gerät-dunkel, dunkel", (stil.match(/--gefahr-kante:/g) || []).length, 3);
gleich("--gefahr-schrift hell, Gerät-dunkel, dunkel", (stil.match(/--gefahr-schrift:/g) || []).length, 3);

fazit();
