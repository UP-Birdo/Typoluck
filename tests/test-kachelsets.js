/*
 * test-kachelsets.js — die Kachel-Sets (js\kachelsets.js, seit 0.14.0).
 *
 *   - 8–10 Sets, Papier = Grund-Set ohne eigene Werte (Aussehen wie bisher);
 *   - jedes andere Set hat hell UND dunkel, jede Variable, nur #rrggbb;
 *   - „richtig" bleibt Orange, „vorhanden" bleibt Blau, und die
 *     Kachelfarben-Sperre (js\darstellung.js) gilt für jedes Set;
 *   - lesbar: Schrift auf den Kachelfarben ≥ 3 : 1, leere Kachel und Tasten
 *     ≥ 4,5 : 1, ausgeschlossene Tasten ≥ 3 : 1 (hell und dunkel);
 *   - der Stil hängt an data-kachelset und folgt hell/dunkel wie stil.css;
 *   - die Wahl liegt auf dem Gerät, Unbekanntes wird Papier;
 *   - jedes anziehbare Stück der Sammlung ist ein Set.
 */

const { pruefe, gleich, fazit } = require("./pruefer.js");
require("./umgebung.js");
const DARSTELLUNG = require("../js/darstellung.js");
const KACHELSETS = require("../js/kachelsets.js");
const SAMMLUNG = require("../js/sammlung.js");

/* Relative Helligkeit und Kontrast nach WCAG. */
function helligkeit(farbe) {
    const zahl = parseInt(farbe.slice(1), 16);
    const kanal = (wert) => {
        const c = wert / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * kanal((zahl >> 16) & 255) + 0.7152 * kanal((zahl >> 8) & 255) + 0.0722 * kanal(zahl & 255);
}
function kontrast(a, b) {
    const x = helligkeit(a);
    const y = helligkeit(b);
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

pruefe("8 bis 10 Sets", KACHELSETS.SETS.length >= 8 && KACHELSETS.SETS.length <= 10);
gleich("Papier zuerst und Standard", [KACHELSETS.SETS[0].id, KACHELSETS.STANDARD], ["papier", "papier"]);
gleich("Papier ändert nichts", [KACHELSETS.stil("papier"), KACHELSETS.werte("papier", "hell")], ["", {}]);
pruefe("Kennungen eindeutig", new Set(KACHELSETS.SETS.map((s) => s.id)).size === KACHELSETS.SETS.length);
pruefe("Namen kurz (unter die Kachel)", KACHELSETS.SETS.every((s) => s.name.length <= 11));

for (const set of KACHELSETS.SETS.slice(1)) {
    for (const modus of ["hell", "dunkel"]) {
        const w = KACHELSETS.werte(set.id, modus);
        const wo = set.name + " " + modus;
        pruefe(wo + ": alle Variablen, nur #rrggbb",
            KACHELSETS.VARIABLEN.every((name) => /^#[0-9a-f]{6}$/i.test(w["--" + name] || "")));
        for (const rolle of ["richtig", "vorhanden"]) {
            for (const endung of ["", "-kante"]) {
                const antwort = DARSTELLUNG.kachelFarbeErlaubt(rolle, w["--kachel-" + rolle + endung]);
                pruefe(wo + ": Sperre " + rolle + endung, antwort.erlaubt, antwort.grund);
            }
        }
        const richtig = DARSTELLUNG._farbton(w["--kachel-richtig"]).grad;
        const vorhanden = DARSTELLUNG._farbton(w["--kachel-vorhanden"]).grad;
        pruefe(wo + ": richtig bleibt Orange (" + Math.round(richtig) + "°)", richtig >= 10 && richtig <= 36);
        pruefe(wo + ": vorhanden bleibt Blau (" + Math.round(vorhanden) + "°)", vorhanden >= 195 && vorhanden <= 225);
        for (const rolle of ["richtig", "vorhanden", "falsch"]) {
            const k = kontrast(w["--kachel-schrift"], w["--kachel-" + rolle]);
            pruefe(wo + ": Schrift auf " + rolle + " lesbar (" + k.toFixed(2) + ")", k >= 3);
        }
        const leer = kontrast(w["--kachel-text"], w["--kachel-grund"]);
        pruefe(wo + ": leere Kachel lesbar (" + leer.toFixed(2) + ")", leer >= 4.5);
        const taste = kontrast(w["--taste-schrift"], w["--taste"]);
        pruefe(wo + ": Taste lesbar (" + taste.toFixed(2) + ")", taste >= 4.5);
        const aus = kontrast(w["--taste-aus-schrift"], w["--taste-aus"]);
        pruefe(wo + ": ausgeschlossene Taste lesbar (" + aus.toFixed(2) + ")", aus >= 3);
        const abstand = kontrast(w["--taste-aus"], w["--taste"]);
        pruefe(wo + ": ausgeschlossene Taste unterscheidbar (" + abstand.toFixed(2) + ")", abstand >= 1.4);
    }
}

/* Der Stil */
const stil = KACHELSETS.stil("neon");
pruefe("Stil hängt an data-kachelset", stil.indexOf(':root[data-kachelset="neon"] {') === 0);
pruefe("Stil folgt dem dunklen Gerät, ausser hell gewählt",
    stil.indexOf('@media (prefers-color-scheme: dark) {\n:root[data-kachelset="neon"]:not([data-darstellung="hell"])') !== -1);
pruefe("Stil folgt „dunkel“ gewählt", stil.indexOf(':root[data-kachelset="neon"][data-darstellung="dunkel"]') !== -1);
pruefe("Muster nur als Bild, kein Schatten",
    KACHELSETS.SETS.every((s) => !/shadow/.test(KACHELSETS.stil(s.id))));

/* Anwenden auf ein Ersatz-Dokument */
const kopf = { kinder: [], appendChild(el) { this.kinder.push(el); } };
const dok = {
    documentElement: { dataset: {} },
    head: kopf,
    getElementById: (id) => kopf.kinder.find((el) => el.id === id) || null,
    createElement: () => ({ id: "", textContent: "" })
};
KACHELSETS.anwenden("holz", dok);
KACHELSETS.anwenden("blei", dok);
gleich("Anwenden: ein Stil-Element, Attribut gesetzt", [kopf.kinder.length, dok.documentElement.dataset.kachelset],
    [1, "blei"]);
pruefe("Anwenden: Stil des Sets", kopf.kinder[0].textContent === KACHELSETS.stil("blei"));

/* Wahl auf dem Gerät */
gleich("Ab Werk: Papier", KACHELSETS.gewaehlt(), "papier");
ICH.einstellungSetzen("kachelset", "gibtsnicht");
gleich("Unbekannte Wahl: Papier", KACHELSETS.gewaehlt(), "papier");
ICH.einstellungSetzen("kachelset", "kreide");
gleich("Gewählt: Kreide", KACHELSETS.gewaehlt(), "kreide");

/* Sammlung: jedes anziehbare Stück ist ein Set, jedes Set steht in der Sammlung */
const anziehbar = SAMMLUNG.GRUPPEN.flatMap((g) => g.stuecke).filter((s) => s.anziehbar);
gleich("Sammlung und Sets decken sich", anziehbar.map((s) => s.id), KACHELSETS.SETS.map((s) => s.id));
gleich("Namen gleich", anziehbar.map((s) => s.name), KACHELSETS.SETS.map((s) => s.name));

fazit();
