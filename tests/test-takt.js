/*
 * test-takt.js — der Takt der Marke-Abfrage je Bildschirm (seit 0.33.0,
 * Befund B der Nacht 04.10.2026).
 *
 * 5 s nur dort, wo Daten ANDERER Spieler zu sehen sind (Rangliste samt
 * Reiter „Freunde", das Profil eines anderen); sonst 15 s; bei
 * verborgener App ruht die Abfrage wie bisher. Die Zahlen stehen an EINER
 * Stelle (js\konfig.js).
 *
 *   1. Die Zahlen in js\konfig.js.
 *   2. Der ECHTE Abgleich (js\abgleich.js) mit gestellter Uhr und einer
 *      Server-Attrappe: wie oft bei 60 s Ticks wirklich gefragt wird.
 *   3. Das ECHTE js\app.js: welcher Takt auf welchem Bildschirm gilt.
 */

const fs = require("fs");
const pfad = require("path");
const vm = require("vm");
const { pruefe, gleich, spaeter, fazit } = require("./pruefer.js");
require("./umgebung.js");

const wurzel = pfad.join(__dirname, "..");
const lesen = (name) => fs.readFileSync(pfad.join(wurzel, name), "utf8");
const E = KONFIG.speicher;

/* ------------------------------------------------------------------ *
 * 1. Die Zahlen
 * ------------------------------------------------------------------ */

gleich("js\\konfig.js: schnell 5 s, ruhig 15 s", [E.abfrageIntervallMs, E.abfrageRuhigMs], [5000, 15000]);
gleich("… schnell auf Rangliste und Freunde (dazu das Profil eines anderen)", E.abfrageSchnellAuf,
    ["rangliste", "freunde"]);
pruefe("Der ruhige Takt ist ein Vielfaches des schnellen (die Uhr tickt im schnellen)",
    E.abfrageRuhigMs % E.abfrageIntervallMs === 0 && E.abfrageRuhigMs > E.abfrageIntervallMs);
{
    const ohneKommentar = (name) => lesen(name).replace(/\/\*[\s\S]*?\*\//g, "");
    const dateien = fs.readdirSync(pfad.join(wurzel, "js")).filter((d) => /\.js$/.test(d) && d !== "konfig.js"
        && d.indexOf("woerter-") !== 0);
    const fest = dateien.filter((d) => /abfrage\w*Ms\s*[:=]\s*\d|\b(5000|15000)\b[^\n]*abfrage|abfrage[^\n]*\b(5000|15000)\b/i
        .test(ohneKommentar("js/" + d)));
    gleich("Die Zahlen stehen NUR in js\\konfig.js (keine zweite Stelle im Code)", fest, []);
}

/* ------------------------------------------------------------------ *
 * 2. Der Abgleich im Takt
 * ------------------------------------------------------------------ */

function server() {
    return {
        art: "gemeinsam",
        beschreibung: "Attrappe",
        stand: { datenVersion: 1, geaendertAm: 100, spieler: [] },
        marken: 0,
        async laden() { return JSON.parse(JSON.stringify(this.stand)); },
        async speichern() { },
        async marke() { this.marken++; return this.stand.geaendertAm; }
    };
}

/* Ein Abgleich mit gestellter Uhr; `ticks(n)` = n Ticks der 5-s-Uhr. */
async function lauf(taktGeber) {
    const s = { zeit: 1000000, srv: server(), takt: 15000, uhr: null };
    const echtesIntervall = global.setInterval;
    global.setInterval = (f, ms) => { s.uhr = { f, ms }; return 1; };
    global.document = { hidden: false, addEventListener() { } };
    global.window.addEventListener = () => { };
    s.abgleich = new Abgleich(s.srv, { abfrageIntervallMs: 5000, abfrageRuhigMs: 15000, schreibVerzoegerungMs: 1 },
        taktGeber === false ? { jetzt: () => s.zeit } : { jetzt: () => s.zeit, takt: () => s.takt });
    await s.abgleich.starten();
    global.setInterval = echtesIntervall;
    s.ticks = async (n) => {
        for (let i = 0; i < n; i++) {
            /* Eine echte Uhr tickt nie genau: mal 3 ms zu früh, mal zu spät. */
            s.zeit += 5000 + (i % 2 === 0 ? -3 : 3);
            await s.uhr.f();
        }
    };
    return s;
}

spaeter("Takt", (async () => {
    const ruhig = await lauf();
    gleich("Die Uhr tickt im schnellen Takt (5 s)", ruhig.uhr.ms, 5000);
    await ruhig.ticks(12);
    gleich("Ruhiger Bildschirm (Start, Shop …): in 60 s viermal gefragt statt zwölfmal", ruhig.srv.marken, 4);

    const schnell = await lauf();
    schnell.takt = 5000;
    await schnell.ticks(12);
    gleich("Bildschirm mit Daten anderer (Rangliste): in 60 s zwölfmal, wie bisher", schnell.srv.marken, 12);

    const wechsel = await lauf();
    await wechsel.ticks(1);
    gleich("Ruhig, nach 5 s: noch nicht gefragt", wechsel.srv.marken, 0);
    wechsel.takt = 5000;
    await wechsel.ticks(1);
    gleich("Zur Rangliste gewechselt: spätestens beim nächsten Tick wird gefragt", wechsel.srv.marken, 1);
    await wechsel.ticks(2);
    gleich("… und weiter alle 5 s", wechsel.srv.marken, 3);
    wechsel.takt = 15000;
    await wechsel.ticks(2);
    gleich("Zurück auf den Start: zwei Ticks ohne Anfrage", wechsel.srv.marken, 3);
    await wechsel.ticks(1);
    gleich("… der dritte fragt wieder (15 s seit der letzten)", wechsel.srv.marken, 4);

    const ohne = await lauf(false);
    await ohne.ticks(6);
    gleich("Ohne Takt-Geber: bei jedem Tick, wie bis 0.32.0", ohne.srv.marken, 6);

    /* Verborgen ruht die Abfrage — und die Rückkehr fragt sofort */
    const verborgen = await lauf();
    global.document.hidden = true;
    await verborgen.ticks(12);
    gleich("Verborgene App: keine Anfrage, auch nach 60 s", verborgen.srv.marken, 0);
    global.document.hidden = false;
    await verborgen.abgleich.fremdenStandHolen();
    gleich("Zurück im Vordergrund (visibilitychange → fremdenStandHolen): sofort eine Anfrage", verborgen.srv.marken, 1);
    await verborgen.ticks(2);
    gleich("… danach zählt der Takt ab dieser Anfrage", verborgen.srv.marken, 1);
    await verborgen.ticks(1);
    gleich("… 15 s später die nächste", verborgen.srv.marken, 2);

    /* Eine offene eigene Änderung sperrt wie bisher — und verbraucht den Takt nicht */
    const gesperrt = await lauf();
    gesperrt.abgleich.aenderungOffen = true;
    await gesperrt.ticks(3);
    gleich("Eigene Änderung offen: nicht gefragt", gesperrt.srv.marken, 0);
    gesperrt.abgleich.aenderungOffen = false;
    await gesperrt.ticks(1);
    gleich("… danach beim nächsten Tick", gesperrt.srv.marken, 1);

    /* Seit 0.34.1 (Prüfung Fund 3): Hängt eine Abfrage (das Lesen der
       Antwort endet nie, z. B. beim Netzwechsel), gibt der Merker
       `holtGerade` nach 20 s von selbst frei — sonst fragte die App bis zum
       Neuladen nie wieder. */
    const haengt = await lauf();
    haengt.takt = 5000;
    const echteMarke = haengt.srv.marke;
    haengt.srv.marke = function () { this.marken++; return new Promise(() => { }); };
    /* Dieser eine Tick endet nie — darum ohne darauf zu warten. */
    haengt.zeit += 5000;
    haengt.uhr.f();
    await new Promise((fertig) => setImmediate(fertig));
    gleich("Hängende Abfrage: einmal gefragt, der Merker steht", [haengt.srv.marken, haengt.abgleich.holtGerade], [1, true]);
    haengt.srv.marke = echteMarke;
    await haengt.ticks(3);
    gleich("… binnen 15 s keine zweite Abfrage zugleich", haengt.srv.marken, 1);
    await haengt.ticks(2);
    gleich("… nach mehr als 20 s gilt der Merker als verfallen: es wird wieder gefragt", haengt.srv.marken, 2);
    await haengt.ticks(2);
    gleich("… und danach wieder im Takt", haengt.srv.marken, 4);
})());

/* ------------------------------------------------------------------ *
 * 3. Welcher Takt auf welchem Bildschirm (js\app.js)
 * ------------------------------------------------------------------ */
{
    const s = { offen: "start", blaetter: [], ich: { id: "anna" } };
    const umgebung = {
        console, Date, Promise, JSON, Math,
        KONFIG: KONFIG,
        document: { addEventListener() { } },
        ANMELDUNG: { ich: () => s.ich },
        NAVIGATION: {
            get aktuell() { return s.offen; },
            blaetter: () => s.blaetter
        }
    };
    vm.createContext(umgebung);
    vm.runInContext(lesen("js/app.js") + "\n;globalThis.APP = APP;", umgebung, { filename: "app.js" });
    const APP = umgebung.APP;
    const takt = (offen, blaetter) => {
        s.offen = offen;
        s.blaetter = blaetter || [];
        return APP.abfrageTakt();
    };

    gleich("Start, Shop, Sammlung, Aufgaben, die Runde: 15 s",
        ["start", "shop", "sammlung", "herausforderungen", "wordle"].map((id) => takt(id)), [15000, 15000, 15000, 15000, 15000]);
    gleich("Rangliste (samt Reiter Freunde): 5 s", takt("rangliste"), 5000);
    gleich("Das EIGENE Profil als Blatt über dem Start: 15 s",
        [takt("start", [{ id: "profil", parameter: null }]), takt("start", [{ id: "profil", parameter: { id: "anna" } }])],
        [15000, 15000]);
    gleich("Das Profil eines ANDEREN: 5 s", takt("start", [{ id: "profil", parameter: { id: "ben" } }]), 5000);
    gleich("Einstellungen über dem eigenen Profil: 15 s",
        takt("start", [{ id: "profil", parameter: null }, { id: "einstellungen", parameter: null }]), 15000);
    gleich("Ein Blatt aus der Liste (Freunde als Blatt, falls es das wieder gibt): 5 s",
        takt("start", [{ id: "profil", parameter: null }, { id: "freunde", parameter: null }]), 5000);
    gleich("Ein Blatt über der Rangliste: weiter 5 s", takt("rangliste", [{ id: "profil", parameter: null }]), 5000);
    s.ich = null;
    gleich("Nicht angemeldet: jedes Profil mit Id gilt als fremd", takt("start", [{ id: "profil", parameter: { id: "ben" } }]), 5000);

    const quelle = lesen("js/app.js");
    pruefe("app.js gibt dem Abgleich den Takt-Geber", /takt: \(\) => APP\.abfrageTakt\(\)/.test(quelle));
    pruefe("Der Abgleich tickt über imTakt (nicht mehr bei jedem Tick fragen)",
        /setInterval\(\s*\(\) => this\.imTakt\(\), this\.einstellung\.abfrageIntervallMs\)/.test(lesen("js/abgleich.js")));
    pruefe("Die Navigation nennt die offenen Blätter (für das Profil eines anderen)",
        /blaetter\(\) \{\s*return NAVIGATION\._blaetter\.map\(/.test(lesen("js/navigation.js")));
}

fazit();
