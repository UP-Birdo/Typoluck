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
 * Seit 0.33.0 bricht er das erste Laden nicht mehr ab (mit nachgestellten
 * Uhren und `document.readyState`):
 *   - lädt noch → keine Rettung nach der alten Frist, er wartet in
 *     Schritten von 1 s weiter;
 *   - fertig geladen und nicht gestartet → Rettung; gestartet → nichts;
 *   - nach insgesamt 30 s in jedem Fall die bisherige Rettung.
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
            /* Seit 0.33.0 fragt der Notfall-Weg, ob das Dokument fertig
               geladen ist. Ohne Angabe: fertig („complete"). */
            readyState: angaben.bereit || "complete",
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
    const ruhe = async () => {
        await new Promise((fertig) => setImmediate(fertig));
        await new Promise((fertig) => setImmediate(fertig));
    };
    return {
        uhren, abgemeldet, geloescht, koerper, sitzung, zeit, fenster, dokument: kontext.document,
        get neuGeladen() { return neuGeladen; },
        async ablaufen() {
            uhren.forEach((uhr) => uhr.f());
            await ruhe();
        },
        /* Seit 0.33.0 stellt der Notfall-Weg weitere Uhren: die jeweils
           ÄLTESTE noch nicht abgelaufene läuft ab. Liefert ihre Dauer (oder
           null, wenn keine mehr wartet); `gelaufen` zählt die Zeit mit. */
        gelaufen: 0,
        abgelaufen: 0,
        async schritt() {
            const uhr = uhren[this.abgelaufen];
            if (!uhr) {
                return null;
            }
            this.abgelaufen++;
            this.gelaufen += uhr.ms;
            uhr.f();
            await ruhe();
            return uhr.ms;
        },
        wartet() {
            return uhren.length - this.abgelaufen;
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

    /* ---- Seit 0.33.0: Der Notfall-Weg bricht das erste Laden nicht ab ---- */

    /* Gestartet: nach der ersten Frist ist Schluss, keine weitere Uhr. */
    const fertig = welt({ gestartet: true });
    await fertig.schritt();
    gleich("Gestartet: nichts, und es wartet keine weitere Uhr", [fertig.neuGeladen, fertig.wartet()], [0, 0]);

    /* Geladen und nicht gestartet: Rettung gleich nach der ersten Frist. */
    const kaputtGeladen = welt({ gestartet: undefined, bereit: "complete" });
    await kaputtGeladen.schritt();
    gleich("Fertig geladen und nicht gestartet: Rettung nach 10 s",
        [kaputtGeladen.neuGeladen, kaputtGeladen.gelaufen, kaputtGeladen.wartet()], [1, 10000, 0]);

    /* Lädt noch: keine Rettung nach der alten Frist — er wartet weiter. */
    for (const zustand of ["loading", "interactive"]) {
        const laedt = welt({ gestartet: undefined, bereit: zustand });
        await laedt.schritt();
        gleich("Lädt noch (" + zustand + "): KEINE Rettung nach 10 s, nichts abgemeldet, nichts geleert",
            [laedt.neuGeladen, laedt.abgemeldet.length, laedt.geloescht.length, !!laedt.sitzung.getItem("typoluck.notfall")],
            [0, 0, 0, false]);
        gleich("… er wartet in Schritten von 1 s weiter", [laedt.wartet(), laedt.uhren[1].ms], [1, 1000]);
    }

    /* … und rettet, sobald fertig geladen ist und die App dann nicht läuft. */
    const spaetFertig = welt({ gestartet: undefined, bereit: "loading" });
    await spaetFertig.schritt();
    await spaetFertig.schritt();
    await spaetFertig.schritt();
    gleich("Lädt nach 12 s immer noch: weiter keine Rettung", [spaetFertig.neuGeladen, spaetFertig.gelaufen], [0, 12000]);
    spaetFertig.dokument.readyState = "complete";
    await spaetFertig.schritt();
    gleich("Dann fertig geladen, App nicht gestartet: Rettung beim nächsten Schritt (13 s)",
        [spaetFertig.neuGeladen, spaetFertig.gelaufen, spaetFertig.wartet(), spaetFertig.abgemeldet], [1, 13000, 0, [ORDNER]]);

    /* Startet die App, während er wartet: nichts. */
    const spaetGestartet = welt({ gestartet: undefined, bereit: "loading" });
    await spaetGestartet.schritt();
    await spaetGestartet.schritt();
    spaetGestartet.fenster.TYPOLUCK_GESTARTET = true;
    spaetGestartet.dokument.readyState = "complete";
    await spaetGestartet.schritt();
    gleich("Langsam geladen, dann gestartet: keine Rettung, keine weitere Uhr",
        [spaetGestartet.neuGeladen, spaetGestartet.wartet(), spaetGestartet.koerper.kinder.length], [0, 0, 0]);

    /* Lädt und lädt: nach insgesamt 30 s in jedem Fall die bisherige Rettung. */
    const ewig = welt({ gestartet: undefined, bereit: "loading" });
    let schritte = 0;
    while (ewig.wartet() > 0 && schritte < 100) {
        await ewig.schritt();
        schritte++;
        if (ewig.gelaufen === 29000) {
            gleich("Lädt nach 29 s immer noch: noch keine Rettung", ewig.neuGeladen, 0);
        }
    }
    gleich("Lädt ewig: nach insgesamt 30 s die Rettung, in jedem Fall — eine Frist von 10 s, dann 20 Schritte von 1 s",
        [ewig.neuGeladen, ewig.gelaufen, schritte, ewig.wartet()], [1, 30000, 21, 0]);
    gleich("… dieselbe Rettung wie bisher (nur dieser Ordner, nur typoluck-Speicher, Merker)",
        [ewig.abgemeldet, ewig.geloescht, !!ewig.sitzung.getItem("typoluck.notfall")],
        [[ORDNER], ["typoluck-v0.15.1", "typoluck-v0.15.2"], true]);

    /* Die Grenzen bleiben: innerhalb von 5 Minuten nur der Link — auch nach dem langen Warten. */
    const ewigNochmal = welt({ gestartet: undefined, bereit: "loading", sitzung: ewig.sitzung, jetzt: 1000000 + 60000 });
    while (ewigNochmal.wartet() > 0) {
        await ewigNochmal.schritt();
    }
    gleich("Zweites Mal innerhalb von 5 Minuten (lädt wieder ewig): kein Neuladen, nur der Link",
        [ewigNochmal.neuGeladen, ewigNochmal.koerper.kinder.map((k) => k.textContent)], [0, ["Neu laden"]]);

    /* Fertig geladen, gestartet, aber der Stil fehlt: Rettung wie bisher. */
    const stilFehlt = welt({ gestartet: true, stil: false, bereit: "complete" });
    await stilFehlt.schritt();
    gleich("Fertig geladen, Stil fehlt: Rettung nach 10 s", [stilFehlt.neuGeladen, stilFehlt.gelaufen], [1, 10000]);
})());

pruefe("Der Notfall-Weg fragt, ob das Dokument fertig geladen ist, und wartet höchstens 30 s",
    /document\.readyState !== "complete" && gewartet < HOECHSTENS_MS/.test(treffer[1])
        && /var HOECHSTENS_MS = 30000;/.test(treffer[1]) && /var WARTEN_MS = 10000;/.test(treffer[1]));
pruefe("Die Seite hat weiter keine CSP (ein Fingerabdruck des Skripts ist nicht nötig)",
    !/Content-Security-Policy/i.test(index));

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
