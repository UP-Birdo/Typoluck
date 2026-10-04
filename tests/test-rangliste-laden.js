/*
 * test-rangliste-laden.js — die Rangliste lädt höchstens alle 60 Sekunden
 * (seit 0.33.0, Befund E der Nacht 04.10.2026).
 *
 * Der ECHTE Bildschirm js\bildschirm-rangliste.js am kleinen DOM
 * (kleines-dom.js) mit der echten js\konfig.js; Bausteine, Modell und
 * Datenbank sind Attrappen, die Uhr ist gestellt. Geprüft wird:
 *
 *   1. Erstes Öffnen lädt (mit Platzhalter); nur vorbereitet lädt nichts.
 *   2. Ein Stand, der jünger als 60 s ist, wird beim Öffnen und Hinwischen
 *      (`zeigen`, `geoeffnet`) wiederverwendet — keine Anfrage.
 *   3. Danach wird nachgeladen; die Tabelle bleibt dabei stehen und wird
 *      erst ersetzt, wenn der neue Stand da ist (kein Platzhalter).
 *   4. „Aktualisieren" lädt immer.
 *   5. Je Zeitraum ein Stand: Heute ↔ 7 Tage ohne erneutes Laden.
 *   6. Das eigene Tageswort (`standVerwerfen`) lädt beim nächsten Öffnen.
 *   7. Ein neuer Tag lädt (und zeigt nicht die Tabelle von gestern).
 *   8. Nach einem Fehler lädt das nächste Öffnen.
 *   9. Die Zahl steht in js\konfig.js.
 */

const fs = require("fs");
const pfad = require("path");
const vm = require("vm");
const { pruefe, gleich, spaeter, fazit } = require("./pruefer.js");
const { dokumentBauen } = require("./kleines-dom.js");
const KONFIG = require("../js/konfig.js");

const wurzel = pfad.join(__dirname, "..");
const lesen = (name) => fs.readFileSync(pfad.join(wurzel, name), "utf8");

function welt() {
    const dokument = dokumentBauen();
    const s = { dokument, zeit: 1000000, tag: "2026-10-04", anfragen: [], platzhalter: 0, antworten: [], fehler: null,
        veraltet: [], gezeigt: [], offen: "rangliste", daten: 1 };
    const el = (tag, klasse, text) => {
        const e = dokument.createElement(tag);
        if (klasse) {
            e.className = klasse;
        }
        if (text !== undefined && text !== null) {
            e.textContent = String(text);
        }
        return e;
    };
    const umgebung = {
        console, Promise, JSON, Object, Array, String,
        Date: { now: () => s.zeit },
        document: dokument,
        KONFIG: JSON.parse(JSON.stringify(KONFIG)),
        NAVIGATION: {
            get aktuell() { return s.offen; },
            zeichenbar: () => true,
            anmelden(b) { s.angemeldet = b; },
            markeAnbringen: (knopf) => knopf,
            veralten(ids) { s.veraltet.push(ids); },
            zeigen(id) { s.gezeigt.push(id); }
        },
        BAUSTEINE: {
            el: el,
            kopfzeile: () => el("header", "kopfzeile"),
            karte: (titel, klasse) => el("section", "karte " + (klasse || "")),
            kreis: () => el("span", "kreis"),
            knopf(angaben) {
                const k = el("button", "knopf", angaben.text || angaben.titel);
                if (angaben.beiKlick) {
                    k.addEventListener("click", angaben.beiKlick);
                }
                return k;
            },
            segment(wahlen, aktiv, beiWahl, name) {
                const gruppe = el("div", "segment");
                gruppe.setAttribute("aria-label", name);
                for (const wahl of wahlen) {
                    const k = el("button", "segment-wahl", wahl.text);
                    k.addEventListener("click", () => beiWahl(wahl.wert));
                    gruppe.appendChild(k);
                }
                return gruppe;
            }
        },
        ZUSTAND: {
            laden(angaben) {
                s.platzhalter++;
                return el("div", "zustand-laden" + (angaben.ruht ? " ruht" : ""));
            },
            fehler: () => el("div", "zustand-fehler"),
            leer: () => el("div", "zustand-leer")
        },
        ANMELDUNG: { ich: () => ({ id: "ich" }), abgleich: { daten: {} } },
        FREUNDE_BILDSCHIRM: { zeigen() { } },
        PROFIL_BILDSCHIRM: { profilOeffnen() { } },
        WORDLE_BILDSCHIRM: { musterBauen: () => el("span", "muster") },
        DIALOG: { hinweis() { } },
        WORDLE: { datumText: () => s.tag, VERSUCHE: 6 },
        APP: { jetzt: () => new Date(), spielSpeicher: {} },
        RANGLISTE: {
            auswahl: () => null,
            letzteTage: (heute, n) => Array.from({ length: n }, (x, i) => heute + "-" + i),
            /* Eine Zeile je Stand: der Name trägt, aus welcher Antwort er kam. */
            tagesTabelle: (tag) => [{ id: "a", platz: 1, name: "Tag" + tag.nr, geloest: true, versuche: 3, punkte: 4, muster: [] }],
            zeitraumTabelle: (tage) => [{ id: "a", platz: 1, name: "Woche" + Object.keys(tage).length + "/" + tage.nr,
                geloest: 1, gespielt: 1, punkte: 4 }],
            punkte: () => 1,
            ERKLAERUNG: ""
        },
        ERGEBNISSE: {
            /* Jede Anfrage wartet, bis der Test sie beantwortet. */
            tageLaden(speicher, tage) {
                s.anfragen.push(tage.slice());
                return new Promise((gut, schlecht) => {
                    s.antworten.push(() => {
                        if (s.fehler) {
                            schlecht(new Error(s.fehler));
                            return;
                        }
                        const nr = s.daten++;
                        const stand = { nr: nr };
                        for (const tag of tage) {
                            stand[tag] = { nr: nr };
                        }
                        gut(stand);
                    });
                });
            }
        }
    };
    vm.createContext(umgebung);
    vm.runInContext(lesen("js/bildschirm-rangliste.js") + "\n;globalThis.R = RANGLISTE_BILDSCHIRM;", umgebung,
        { filename: "bildschirm-rangliste.js" });
    s.R = umgebung.R;
    s.umgebung = umgebung;
    s.ort = dokument.createElement("div");
    dokument.body.appendChild(s.ort);
    s.R.anmelden();
    /* Die wartende Anfrage beantworten. */
    s.antworten_ = async () => {
        const liste = s.antworten.splice(0);
        liste.forEach((f) => f());
        await new Promise((fertig) => setImmediate(fertig));
        await new Promise((fertig) => setImmediate(fertig));
    };
    s.tabelle = () => {
        const name = s.ort.querySelector(".rangliste-name");
        return name ? name.textContent.trim() : null;
    };
    s.laedtBild = () => !!s.ort.querySelector(".zustand-laden");
    s.knopf = (text) => s.ort.querySelectorAll("button").find((k) => k.textContent === text);
    return s;
}

spaeter("Rangliste laden", (async () => {
    /* 1. Erstes Öffnen */
    const s = welt();
    const R = s.R;
    gleich("Die Zahl steht in js\\konfig.js: 60 Sekunden", [KONFIG.speicher.ranglisteFrischMs, R.frischMs()], [60000, 60000]);
    pruefe("Die Rangliste meldet `geoeffnet` an (Öffnen ohne Neu-Zeichnen)", typeof s.angemeldet.geoeffnet === "function");

    s.offen = "start";
    s.angemeldet.zeigen(s.ort);
    gleich("Nur vorbereitet (Leerlauf, Nachbarseite): gezeichnet, aber keine Anfrage — der Platzhalter ruht",
        [s.anfragen.length, !!s.ort.querySelector(".zustand-laden.ruht")], [0, true]);

    s.offen = "rangliste";
    s.angemeldet.geoeffnet();
    gleich("Geöffnet, noch kein Stand: EINE Anfrage (Heute = ein Tag), mit Lade-Platzhalter",
        [s.anfragen.length, s.anfragen[0].length, s.laedtBild(), !!s.ort.querySelector(".zustand-laden.ruht")],
        [1, 1, true, false]);
    await s.antworten_();
    gleich("Der Stand ist da: die Tabelle", [s.tabelle(), s.laedtBild()], ["Tag1", false]);

    /* 2. Jünger als 60 s: wiederverwenden */
    const platzhalterVorher = s.platzhalter;
    s.zeit += 5000;
    s.angemeldet.geoeffnet();
    s.zeit += 20000;
    s.angemeldet.zeigen(s.ort);
    s.zeit += 34000;
    s.angemeldet.geoeffnet();
    gleich("Dreimal geöffnet binnen 59 s (hingewischt, neu gezeichnet): keine weitere Anfrage, die Tabelle steht",
        [s.anfragen.length, s.tabelle(), s.platzhalter - platzhalterVorher], [1, "Tag1", 0]);

    /* 3. Älter als 60 s: nachladen, die Tabelle bleibt stehen */
    s.zeit += 2000;
    s.angemeldet.geoeffnet();
    gleich("Nach 61 s geöffnet: es wird nachgeladen — die Tabelle bleibt dabei stehen (kein Platzhalter)",
        [s.anfragen.length, s.tabelle(), s.laedtBild(), s.platzhalter - platzhalterVorher], [2, "Tag1", false, 0]);
    s.angemeldet.geoeffnet();
    gleich("Solange geladen wird, keine zweite Anfrage", s.anfragen.length, 2);
    await s.antworten_();
    gleich("Der neue Stand ist da: jetzt erst wird die Tabelle ersetzt", [s.tabelle(), s.platzhalter - platzhalterVorher],
        ["Tag2", 0]);

    /* 4. „Aktualisieren" lädt immer */
    s.zeit += 1000;
    s.knopf("Aktualisieren").click();
    gleich("„Aktualisieren“ nach 1 s: lädt trotzdem, die Tabelle bleibt stehen",
        [s.anfragen.length, s.tabelle(), s.laedtBild()], [3, "Tag2", false]);
    await s.antworten_();
    gleich("… und zeigt dann den neuen Stand", s.tabelle(), "Tag3");

    /* 5. Je Zeitraum ein Stand */
    s.ort.querySelectorAll(".segment-wahl").find((k) => k.textContent === "7 Tage").click();
    gleich("„7 Tage“ zum ersten Mal: sieben Tage in EINER Runde, mit Platzhalter (es gibt noch keinen Stand)",
        [s.anfragen.length, s.anfragen[3].length, s.laedtBild()], [4, 7, true]);
    await s.antworten_();
    gleich("… dann die Tabelle der Woche", s.tabelle(), "Woche8/4");
    s.zeit += 10000;
    s.ort.querySelectorAll(".segment-wahl").find((k) => k.textContent === "Heute").click();
    gleich("Zurück auf „Heute“ binnen 60 s: keine Anfrage, die Tabelle von vorhin sofort",
        [s.anfragen.length, s.tabelle(), s.laedtBild()], [4, "Tag3", false]);
    s.ort.querySelectorAll(".segment-wahl").find((k) => k.textContent === "7 Tage").click();
    gleich("… und wieder „7 Tage“: auch ohne Anfrage", [s.anfragen.length, s.tabelle(), s.laedtBild()], [4, "Woche8/4", false]);
    s.zeit += 61000;
    s.ort.querySelectorAll(".segment-wahl").find((k) => k.textContent === "Heute").click();
    gleich("Nach 71 s auf „Heute“: die alte Tabelle sofort, dazu eine Anfrage",
        [s.anfragen.length, s.anfragen[4].length, s.tabelle(), s.laedtBild()], [5, 1, "Tag3", false]);
    await s.antworten_();
    gleich("… ersetzt, sobald sie da ist", s.tabelle(), "Tag5");

    /* 6. Das eigene Tageswort */
    s.zeit += 1000;
    R.standVerwerfen();
    gleich("standVerwerfen (eigenes Tageswort): die Tabelle bleibt stehen, nichts wird geladen", [s.anfragen.length, s.tabelle()],
        [5, "Tag5"]);
    s.angemeldet.geoeffnet();
    gleich("… aber das nächste Öffnen lädt, auch vor Ablauf der 60 s", [s.anfragen.length, s.tabelle(), s.laedtBild()],
        [6, "Tag5", false]);
    await s.antworten_();
    gleich("… mit dem neuen Stand", s.tabelle(), "Tag6");

    /* 7. Ein neuer Tag */
    s.zeit += 1000;
    s.tag = "2026-10-05";
    s.angemeldet.geoeffnet();
    gleich("Neuer Tag: lädt sofort, und die Tabelle von gestern bleibt NICHT unter „Heute“ stehen",
        [s.anfragen.length, s.tabelle(), s.laedtBild()], [7, null, true]);
    await s.antworten_();
    gleich("… dann der Stand von heute", s.tabelle(), "Tag7");

    /* 8. Fehler */
    s.zeit += 61000;
    s.fehler = "kein Netz";
    s.angemeldet.geoeffnet();
    await s.antworten_();
    gleich("Nachladen scheitert: der Fehler steht da (mit „Nochmal“)", [!!s.ort.querySelector(".zustand-fehler"), s.anfragen.length],
        [true, 8]);
    s.fehler = null;
    s.zeit += 1000;
    s.angemeldet.geoeffnet();
    gleich("Nach einem Fehler lädt das nächste Öffnen, auch binnen 60 s", s.anfragen.length, 9);
    await s.antworten_();
    gleich("… und zeigt wieder die Tabelle", [s.tabelle(), !!s.ort.querySelector(".zustand-fehler")], ["Tag8", false]);

    /* 9. Die Zahl aus js\konfig.js gilt */
    const t = welt();
    t.umgebung.KONFIG.speicher.ranglisteFrischMs = 0;
    t.angemeldet.zeigen(t.ort);
    await t.antworten_();
    t.zeit += 1;
    t.angemeldet.geoeffnet();
    gleich("Frist 0 in js\\konfig.js: jedes Öffnen lädt (wie bis 0.32.0)", t.anfragen.length, 2);
    await t.antworten_();

    /* Während des Ladens umgeschaltet: der neue Zeitraum wird nachgeholt */
    const u = welt();
    u.angemeldet.zeigen(u.ort);
    u.ort.querySelectorAll(".segment-wahl").find((k) => k.textContent === "7 Tage").click();
    gleich("Während des Ladens umgeschaltet: keine zweite Anfrage zugleich", u.anfragen.length, 1);
    await u.antworten_();
    gleich("… danach wird der gewählte Zeitraum nachgeholt", [u.anfragen.length, u.anfragen[1].length], [2, 7]);
    await u.antworten_();
    gleich("… und gezeigt", u.tabelle(), "Woche8/2");

    /* Die Freunde öffnen: der andere Reiter muss gezeichnet werden */
    const f = welt();
    f.R.freundeOeffnen();
    gleich("freundeOeffnen meldet die Rangliste veraltet (sonst bliebe der Reiter „Wertung“ stehen) und zeigt sie",
        [f.R.ansicht, f.veraltet, f.gezeigt], ["freunde", [["rangliste"]], ["rangliste"]]);

    /* 10. Seit 0.34.1 (Prüfung Fund 2): Ein Laden, das schon lief, als der
       Stand verworfen wurde (eigenes Tageswort gesendet, Nachreichen beim
       Anmelden), zeigt seinen Stand, merkt ihn aber NICHT als frisch. */
    const w = welt();
    w.angemeldet.zeigen(w.ort);
    gleich("Wettlauf: das Laden läuft", w.anfragen.length, 1);
    w.R.standVerwerfen();
    w.offen = "start";
    await w.antworten_();
    gleich("Verworfen während des Ladens: der Stand wird gezeigt, aber nicht als frisch gemerkt, kein Nachladen im Hintergrund",
        [w.tabelle(), w.R.standFrisch("tag"), w.anfragen.length], ["Tag1", false, 1]);
    w.offen = "rangliste";
    w.zeit += 1000;
    w.angemeldet.geoeffnet();
    gleich("… das nächste Öffnen (binnen 60 s) lädt neu", w.anfragen.length, 2);
    await w.antworten_();
    gleich("… und dieser Stand gilt dann als frisch", [w.tabelle(), w.R.standFrisch("tag")], ["Tag2", true]);

    const v = welt();
    v.angemeldet.zeigen(v.ort);
    v.R.standVerwerfen();
    await v.antworten_();
    gleich("Verworfen während des Ladens bei OFFENER Rangliste: gleich danach wird neu geladen",
        [v.anfragen.length, v.tabelle()], [2, "Tag1"]);
    await v.antworten_();
    gleich("… und der neue Stand ist frisch", [v.tabelle(), v.R.standFrisch("tag"), v.anfragen.length], ["Tag2", true, 2]);

    const app = lesen("js/app.js");
    const anmelden = app.slice(app.indexOf("async _beiAngemeldet()"), app.indexOf("speicherLage()"));
    pruefe("Nachgereichte Ergebnisse beim Anmelden verwerfen den Stand der Rangliste (app.js)",
        /nachgereicht\.gesendet > 0\)\s*\{[^}]*APP\._ergebnisGeaendert\(\)/.test(anmelden));
})());

fazit();
