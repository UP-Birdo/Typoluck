/*
 * test-notfall.js — der Notfall-Weg in index.html und der gehärtete
 * Service Worker (seit 0.15.4, weisse Seite am iPhone 27.09.2026).
 *
 * Das ECHTE Skript aus index.html (`<script id="notfall">`) läuft hier in
 * einer Attrappe von Fenster, Worker und Zwischenspeichern:
 *   - App gestartet und Stil da → nichts passiert;
 *   - App nicht gestartet (oder Stil fehlt) → NUR der Worker dieses Ordners
 *     wird abgemeldet, NUR typoluck-Speicher geleert, einmal neu geladen;
 *   - innerhalb von 5 Minuten ein zweites Mal → kein Neuladen, nur ein Link.
 * Dazu Quelltext-Prüfungen am Worker (eigener Speicher zuerst, Ersatz nur
 * aus typoluck-Speichern, keine umgeleitete Startseite).
 */

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { pruefe, gleich, spaeter, fazit, speicherAttrappe } = require("./pruefer.js");

const lesen = (datei) => fs.readFileSync(path.join(__dirname, "..", datei), "utf8");
const index = lesen("index.html");
const treffer = /<script id="notfall">([\s\S]*?)<\/script>/.exec(index);
pruefe("Notfall-Skript steht in index.html", !!treffer);
pruefe("… vor jedem Stil und jedem anderen Skript",
    index.indexOf('<script id="notfall">') < index.indexOf('<link rel="stylesheet"')
        && index.indexOf('<script id="notfall">') < index.indexOf('<script src='));
pruefe("… braucht keine andere Datei (kein src)", !/<script id="notfall" src=/.test(index));

const ORDNER = "https://up-birdo.github.io/Typoluck/";

/* Eine Welt für einen Lauf. */
function welt(angaben) {
    const zeit = { jetzt: angaben.jetzt || 1000000 };
    const uhren = [];
    const abgemeldet = [];
    const geloescht = [];
    let neuGeladen = 0;
    const koerper = { kinder: [], appendChild(el) { this.kinder.push(el); } };
    const sitzung = angaben.sitzung || speicherAttrappe();
    const fenster = {
        location: { href: ORDNER + "index.html", reload: () => { neuGeladen++; } },
        sessionStorage: sitzung,
        caches: {
            keys: async () => ["typoluck-v0.15.1", "typoluck-v0.15.2", "blunderluck-v0.151.1"],
            delete: async (name) => { geloescht.push(name); return true; }
        },
        TYPOLUCK_GESTARTET: angaben.gestartet
    };
    const kontext = {
        window: fenster,
        navigator: { serviceWorker: { getRegistrations: async () => [
            { scope: ORDNER, unregister: async () => { abgemeldet.push(ORDNER); return true; } },
            { scope: "https://up-birdo.github.io/Blunderluck/", unregister: async () => {
                abgemeldet.push("blunderluck"); return true; } }
        ] } },
        document: {
            documentElement: {},
            body: koerper,
            getElementById: (id) => koerper.kinder.find((el) => el.id === id) || null,
            createElement: () => ({ style: {} })
        },
        getComputedStyle: () => ({ getPropertyValue: () => (angaben.stil === false ? "" : " 8px") }),
        setTimeout: (f, ms) => { uhren.push({ f, ms }); },
        URL: URL,
        Promise: Promise,
        Date: { now: () => zeit.jetzt },
        Number: Number,
        String: String
    };
    vm.runInNewContext(treffer[1], kontext, { filename: "index.html#notfall" });
    return {
        uhren, abgemeldet, geloescht, koerper, sitzung, zeit, fenster,
        get neuGeladen() { return neuGeladen; },
        async ablaufen() {
            uhren.forEach((uhr) => uhr.f());
            await new Promise((fertig) => setImmediate(fertig));
            await new Promise((fertig) => setImmediate(fertig));
        }
    };
}

spaeter("Notfall", (async () => {
    const gut = welt({ gestartet: true });
    gleich("Wartet 10 Sekunden", gut.uhren.map((u) => u.ms), [10000]);
    await gut.ablaufen();
    gleich("App gestartet, Stil da: nichts passiert", [gut.neuGeladen, gut.abgemeldet.length, gut.geloescht.length], [0, 0, 0]);

    const kaputt = welt({ gestartet: undefined });
    await kaputt.ablaufen();
    gleich("Nicht gestartet: einmal neu geladen", kaputt.neuGeladen, 1);
    gleich("… nur der Worker dieses Ordners abgemeldet (Blunderluck bleibt)", kaputt.abgemeldet, [ORDNER]);
    gleich("… nur typoluck-Speicher geleert", kaputt.geloescht, ["typoluck-v0.15.1", "typoluck-v0.15.2"]);
    pruefe("… Merker gesetzt", !!kaputt.sitzung.getItem("typoluck.notfall"));

    const nochmal = welt({ gestartet: undefined, sitzung: kaputt.sitzung, jetzt: 1000000 + 60000 });
    await nochmal.ablaufen();
    gleich("Zweites Mal innerhalb von 5 Minuten: kein Neuladen (keine Schleife)", nochmal.neuGeladen, 0);
    gleich("… stattdessen ein Link „Neu laden“", nochmal.koerper.kinder.map((k) => k.textContent), ["Neu laden"]);

    const spaeterWieder = welt({ gestartet: undefined, sitzung: kaputt.sitzung, jetzt: 1000000 + 6 * 60000 });
    await spaeterWieder.ablaufen();
    gleich("Nach 5 Minuten darf es wieder retten", spaeterWieder.neuGeladen, 1);

    const ohneStil = welt({ gestartet: true, stil: false });
    await ohneStil.ablaufen();
    gleich("Gestartet, aber Stil fehlt: auch retten", ohneStil.neuGeladen, 1);
})());

/* Die App meldet ihren Start ganz am Anfang */
pruefe("app.js setzt TYPOLUCK_GESTARTET als Erstes in starten()",
    /async starten\(\) \{[\s\S]{0,300}?window\.TYPOLUCK_GESTARTET = true;/.test(lesen("js/app.js")));
pruefe("Der Stil, den der Notfall prüft, steht in css/stil.css", /--rund-klein:/.test(lesen("css/stil.css")));

/* Der gehärtete Worker */
const sw = lesen("sw.js");
pruefe("Worker sucht zuerst NUR im eigenen Speicher",
    /caches\.open\(SPEICHER_NAME\)\)\.match\(anfrage/.test(sw)
        && !/async function speicherZuerst[\s\S]*?caches\.match\(/.test(sw.split("async function irgendeinTreffer")[0]));
pruefe("Ersatz ohne Netz nur aus typoluck-Speichern", /name\.startsWith\("typoluck-"\)/.test(sw));
pruefe("Eine umgeleitete Startseite wird nachgebaut", /antwort\.redirected/.test(sw) && /new Response\(/.test(sw));
pruefe("Activate löscht weiter nur eigene alte Speicher",
    /name\.startsWith\("typoluck-"\) && name !== SPEICHER_NAME/.test(sw));

fazit();
