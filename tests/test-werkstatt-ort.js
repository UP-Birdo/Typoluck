/*
 * test-werkstatt-ort.js — die Werkstatt gibt es NUR auf einem lokalen
 * Rechner (seit 0.34.1, Prüfung der Nacht 04.10.2026 Fund 4).
 *
 * Bis 0.34.0 wirkte `?werkstatt` auch auf der ausgelieferten Adresse: Wer
 * einen solchen Link öffnete, verlor auf seinem Gerät alle `typoluck.*`-
 * Einträge samt Konto-Sitzung und einen offenen Kauf-Merker. Seitdem prüft
 * `WERKSTATT._parameter()` als EINE Stelle ganz vorn den Ort: nur
 * `localhost`, `127.0.0.1` und `[::1]` lesen die Adresse, überall sonst
 * gibt es keinen Werkstatt-Parameter (still übergangen, nichts gelöscht).
 *
 * Hier läuft das ECHTE js\werkstatt.js (dazu js\konfig.js und
 * js\duell.js) mit einer nachgestellten Adresse und einem Gerätespeicher.
 */

const fs = require("fs");
const pfad = require("path");
const vm = require("vm");
const { gleich, fazit } = require("./pruefer.js");

const wurzel = pfad.join(__dirname, "..");
const lesen = (name) => fs.readFileSync(pfad.join(wurzel, name), "utf8");

/* Ein Gerät mit Spielstand, Konto-Sitzung und offenem Kauf-Merker. Wie
   window.localStorage: Object.keys liefert die gespeicherten Schlüssel. */
function geraet() {
    const g = {};
    Object.defineProperties(g, {
        getItem: { value: (s) => (Object.prototype.hasOwnProperty.call(g, s) ? g[s] : null) },
        setItem: { value: (s, w) => { g[s] = String(w); } },
        removeItem: { value: (s) => { delete g[s]; } }
    });
    g.setItem("typoluck.konto", "{\"uid\":\"echt\"}");
    g.setItem("typoluck.spielstand", "{\"wordle-tag\":1}");
    g.setItem("upcrew.kaufOffen.typoluck", "{\"wem\":\"echt\",\"merker\":{}}");
    return g;
}

function welt(hostname, search) {
    const speicher = geraet();
    const k = {
        console, JSON, Object, URLSearchParams,
        localStorage: speicher,
        location: { hostname, search },
        document: { documentElement: { style: { setProperty() { } } } }
    };
    k.window = k;
    vm.createContext(k);
    vm.runInContext(lesen("js/konfig.js") + "\n" + lesen("js/duell.js") + "\n" + lesen("js/werkstatt.js")
        + "\n;globalThis.WERKSTATT = WERKSTATT; globalThis.DUELL = DUELL; globalThis.KONFIG = KONFIG;", k,
        { filename: "werkstatt.js" });
    k.speicher = speicher;
    /* So startet js\app.js: vorbereiten NUR, wenn die Werkstatt aktiv ist. */
    k.starten = () => {
        if (k.WERKSTATT.aktiv()) {
            try {
                k.WERKSTATT.vorbereiten();
            } catch (fehler) {
                /* Der Rest von vorbereiten braucht die ganze App — hier
                   zählt nur, was vorher gelöscht wurde. */
            }
        }
    };
    return k;
}

/* 1. Die echte Seite: keine Werkstatt, kein Duell, nichts gelöscht */
for (const ort of ["up-birdo.github.io", "typoluck.example.org", "localhost.example.org", "192.168.0.5", ""]) {
    const k = welt(ort, "?werkstatt&duell=einladung&bildschirm=shop&datum=2020-01-01&admin");
    gleich("Adresse „" + (ort || "(Datei)") + "“: ?werkstatt wird still übergangen (keine Werkstatt, keine Parameter)",
        [k.WERKSTATT.aktiv(), k.WERKSTATT.wert("duell"), k.WERKSTATT._parameter().has("duell"),
            k.WERKSTATT._parameter().has("admin"), k.WERKSTATT.datum()],
        [false, null, false, false, null]);
    k.starten();
    gleich("… nichts gelöscht: Spielstand, Konto-Sitzung, Kauf-Merker bleiben",
        [k.speicher.getItem("typoluck.konto"), k.speicher.getItem("typoluck.spielstand"),
            k.speicher.getItem("upcrew.kaufOffen.typoluck")],
        ["{\"uid\":\"echt\"}", "{\"wordle-tag\":1}", "{\"wem\":\"echt\",\"merker\":{}}"]);
    gleich("… das Duell bleibt aus (Schalter §14 aus, keine Werkstatt-Attrappe)",
        [k.KONFIG.REGEL_14_EINGESPIELT, k.DUELL._werkstatt, k.DUELL.an()], [false, false, false]);
    /* Auch wer vorbereiten direkt riefe, löscht nichts. */
    try {
        k.WERKSTATT.vorbereiten();
    } catch (fehler) {
        /* egal */
    }
    gleich("… auch ein direkter Aufruf von vorbereiten löscht nichts",
        [k.speicher.getItem("typoluck.konto"), k.speicher.getItem("upcrew.kaufOffen.typoluck") !== null], ["{\"uid\":\"echt\"}", true]);
}

/* 2. Lokal: alles wie bisher */
for (const ort of ["localhost", "127.0.0.1", "[::1]"]) {
    const k = welt(ort, "?werkstatt&duell=einladung&datum=2026-09-24");
    gleich("Adresse „" + ort + "“: die Werkstatt ist da, die Parameter gelten",
        [k.WERKSTATT.aktiv(), k.WERKSTATT.wert("duell"), k.WERKSTATT.datum()], [true, "einladung", "2026-09-24"]);
    k.starten();
    gleich("… und sie legt frisch an (die typoluck.*-Einträge sind weg, wie bisher)",
        [k.speicher.getItem("typoluck.konto"), k.speicher.getItem("typoluck.spielstand")], [null, null]);
}
{
    const k = welt("localhost", "");
    gleich("localhost ohne ?werkstatt: keine Werkstatt, nichts gelöscht",
        [k.WERKSTATT.aktiv(), (k.starten(), k.speicher.getItem("typoluck.konto"))], [false, "{\"uid\":\"echt\"}"]);
}

/* 3. Die Prüfung steht an EINER Stelle: jeder Weg zur Adresse geht über _parameter */
{
    const quelle = lesen("js/werkstatt.js").replace(/\/\*[\s\S]*?\*\//g, "");
    gleich("werkstatt.js liest window.location.search nur an einer Stelle", (quelle.match(/location\.search/g) || []).length, 1);
    const anderswo = fs.readdirSync(pfad.join(wurzel, "js")).filter((d) => /\.js$/.test(d) && d !== "werkstatt.js")
        .filter((d) => /has\(\s*"werkstatt"\s*\)/.test(lesen("js/" + d)));
    gleich("Kein anderer Code fragt ?werkstatt selbst ab", anderswo, []);
}

fazit();
