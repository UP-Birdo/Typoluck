/*
 * sw.js — der Service Worker: macht Typoluck offline-fähig und installierbar.
 *
 * Er liegt in der WURZEL, weil ein Service Worker nur den Ordner bedienen
 * darf, in dem er liegt. Angemeldet wird er in js\app.js.
 *
 *   install   alle eigenen Dateien einmal in den Zwischenspeicher legen
 *   activate  Zwischenspeicher ÄLTERER Typoluck-Fassungen wegwerfen
 *   fetch     eigene Dateien aus dem Zwischenspeicher, alles Fremde
 *             (die Datenbank!) unangetastet ans Netz
 *
 * DIE NUMMER ZIEHT MIT DER APP-VERSION MIT (Haus-Regel). Bleibt sie stehen,
 * behalten die Geräte tagelang den alten Stand — der häufigste
 * Auslieferungsfehler im Haus. tests\test-syntax.js vergleicht sie mit
 * KONFIG.APP_VERSION und CHANGELOG.md, und die Liste DATEIEN mit dem, was
 * wirklich im Projekt liegt.
 */

/* Der Name des Zwischenspeichers. HIER STEHT DIE NUMMER GENAU EINMAL. */
const SPEICHER_NAME = "typoluck-v0.16.3";

/* Beim Bauen (localhost): Netz zuerst — sonst sieht man nach jeder Änderung
   die alte Fassung. Im Betrieb: Zwischenspeicher zuerst. */
const BEIM_BAUEN = self.location.hostname === "localhost"
    || self.location.hostname === "127.0.0.1";

/* Alles, was die App zum Laufen braucht — in der Reihenfolge aus index.html.
   Relative Pfade: Auf GitHub Pages liegt die App unter /Typoluck/, lokal
   unter /. */
const DATEIEN = [
    "./",
    "./index.html",
    "./manifest.webmanifest",

    "./icons/icon-32.png",
    "./icons/icon-180.png",
    "./icons/icon-192.png",
    "./icons/icon-512.png",
    "./icons/vorschau.png",

    "./css/stil.css",
    "./css/stil-bildschirme.css",
    "./css/stil-wordle.css",
    "./css/upcrew-intro.css",
    "./css/upcrew-knoepfe.css",
    "./css/upcrew-anpassen.css",
    "./css/upcrew-sammlung.css",
    "./css/upcrew-abzeichen.css",
    "./css/upcrew-wischen.css",
    "./css/upcrew-flamme.css",
    "./css/upcrew-spielerliste.css",
    "./css/upcrew-leiste.css",

    /* Die Crew-Schriften (seit 0.8.0) — alle zwölf, damit jede Wahl im
       Tab Sammlung auch offline trägt. (In dieser Liste keine geraden
       Anführungszeichen: tests\test-syntax.js liest sie als Dateinamen.) */
    "./schrift/crew-S1-normal.woff2",
    "./schrift/crew-S1-fett.woff2",
    "./schrift/crew-S2-normal.woff2",
    "./schrift/crew-S2-fett.woff2",
    "./schrift/crew-S3-normal.woff2",
    "./schrift/crew-S3-fett.woff2",
    "./schrift/crew-S4-normal.woff2",
    "./schrift/crew-S4-fett.woff2",
    "./schrift/crew-S5-normal.woff2",
    "./schrift/crew-S5-fett.woff2",
    "./schrift/crew-S6-normal.woff2",
    "./schrift/crew-S6-fett.woff2",

    "./js/konfig.js",
    "./js/konto.js",
    "./js/versiegelung.js",
    "./js/spieler.js",
    "./js/ich.js",
    "./js/upcrew-intro.js",
    "./js/upcrew-farbwelten.js",
    "./js/upcrew-aussehen.js",
    "./js/darstellung.js",
    "./js/kachelsets.js",
    "./js/upcrew-anpassen.js",
    "./js/upcrew-abzeichen.js",
    "./js/upcrew-sammlung.js",
    "./js/upcrew-wischen.js",
    "./js/upcrew-leiste.js",
    "./js/upcrew-flamme.js",
    "./js/upcrew-spielerliste.js",
    "./js/speicher.js",
    "./js/abgleich.js",
    "./js/woerter-de.js",
    "./js/wordle.js",
    "./js/ergebnisse.js",
    "./js/rangliste.js",
    "./js/wortbewertung-daten.js",
    "./js/wortbewertung-korrektur.js",
    "./js/wortbewertung.js",
    "./js/wertung.js",
    "./js/fortschritt.js",
    "./js/bausteine.js",
    "./js/zustand.js",
    "./js/dialog.js",
    "./js/navigation.js",
    "./js/anmeldung.js",
    "./js/bildschirm-start.js",
    "./js/bildschirm-wordle.js",
    "./js/bildschirm-rangliste.js",
    "./js/bildschirm-freunde.js",
    "./js/bildschirm-profil.js",
    "./js/bildschirm-verwaltung.js",
    "./js/bildschirm-einstellungen.js",
    "./js/bildschirm-herausforderungen.js",
    "./js/sammlung.js",
    "./js/bildschirm-sammlung.js",
    "./js/aussehen-abgleich.js",
    "./js/fortschritt-abgleich.js",
    "./js/wunsch.js",
    "./js/werkstatt.js",
    "./js/intro.js",
    "./js/aktualisierung.js",
    "./js/app.js"
];

self.addEventListener("install", (ereignis) => {
    ereignis.waitUntil((async () => {
        const speicher = await caches.open(SPEICHER_NAME);
        /* Absichtlich hart: Scheitert EINE Datei, bleibt der alte Worker in
           Betrieb. Ein halb gefüllter Speicher wäre schlimmer als keiner. */
        /* `cache: "reload"` (seit 0.13.0): an der HTTP-Ablage des Browsers
           vorbei. Sonst legt ein neuer Worker eine Datei in der ALTEN
           Fassung ab, solange der Browser sie noch für frisch hält
           (GitHub Pages: 10 Minuten) — neue und alte Dateien gemischt. */
        await speicher.addAll(DATEIEN.map((datei) => new Request(datei, { cache: "reload" })));
        await self.skipWaiting();
    })());
});

self.addEventListener("activate", (ereignis) => {
    ereignis.waitUntil((async () => {
        /* NUR EIGENE SPEICHER LÖSCHEN: Unter up-birdo.github.io liegen auch
           Blunderluck und die anderen Apps des Hauses. */
        const namen = await caches.keys();
        await Promise.all(namen
            .filter((name) => name.startsWith("typoluck-") && name !== SPEICHER_NAME)
            .map((name) => caches.delete(name)));
        await self.clients.claim();
    })());
});

self.addEventListener("fetch", (ereignis) => {
    const anfrage = ereignis.request;

    /* Nur GET und nur die eigene Herkunft — die Datenbank liegt woanders
       und muss IMMER frisch sein. */
    if (anfrage.method !== "GET" || new URL(anfrage.url).origin !== self.location.origin) {
        return;
    }
    ereignis.respondWith(BEIM_BAUEN ? netzZuerst(anfrage) : speicherZuerst(anfrage));
});

/*
 * Zwischenspeicher zuerst — seit 0.15.4 gehärtet (weisse Seite am iPhone,
 * 27.09.2026, `docs\entscheidungen\erkenntnisse.md`):
 *   1. NUR im eigenen Speicher dieser Fassung suchen. Vorher suchte
 *      `caches.match` in ALLEN Speichern des Ursprungs (auch alten
 *      Typoluck-Fassungen und Blunderluck) — beim Wechsel konnten Dateien
 *      zweier Fassungen gemischt werden.
 *   2. Sonst das Netz. Eine Antwort, die kein „ok" ist (404-Seite als HTML
 *      für eine CSS-/JS-Anfrage), wird nicht als Treffer behandelt.
 *   3. Ohne Netz: irgendein Typoluck-Speicher, bei einer Navigation die
 *      Startseite.
 * Wirft nur, wenn es wirklich nichts gibt.
 */
async function speicherZuerst(anfrage) {
    let eigener = null;
    try {
        eigener = await (await caches.open(SPEICHER_NAME)).match(anfrage, { ignoreSearch: true });
    } catch (fehler) {
        eigener = null;
    }
    if (eigener) {
        return ohneUmleitung(eigener, anfrage);
    }
    try {
        const antwort = await fetch(anfrage);
        if (antwort.ok || anfrage.mode === "navigate") {
            return antwort;
        }
        const ersatz = await irgendeinTreffer(anfrage);
        return ersatz || antwort;
    } catch (fehler) {
        const ersatz = await irgendeinTreffer(anfrage);
        if (ersatz) {
            return ohneUmleitung(ersatz, anfrage);
        }
        throw fehler;
    }
}

/* Safari lehnt es ab, eine Seite (Navigation) mit einer Antwort zu öffnen,
   die unterwegs umgeleitet wurde („Response served by service worker has
   redirections"). Falls eine gespeicherte Startseite so eine ist, wird sie
   als frische Antwort mit demselben Inhalt nachgebaut. */
async function ohneUmleitung(antwort, anfrage) {
    if (!antwort.redirected || anfrage.mode !== "navigate") {
        return antwort;
    }
    return new Response(await antwort.blob(), {
        status: antwort.status, statusText: antwort.statusText, headers: antwort.headers
    });
}

/* Ein Treffer in irgendeinem Typoluck-Speicher (auch einer älteren
   Fassung) — nur als Notnagel ohne Netz. */
async function irgendeinTreffer(anfrage) {
    try {
        for (const name of await caches.keys()) {
            if (!name.startsWith("typoluck-")) {
                continue;
            }
            const speicher = await caches.open(name);
            const treffer = await speicher.match(anfrage, { ignoreSearch: true })
                || (anfrage.mode === "navigate" ? await speicher.match("./", { ignoreSearch: true }) : null);
            if (treffer) {
                return treffer;
            }
        }
    } catch (fehler) {
        return null;
    }
    return null;
}

async function netzZuerst(anfrage) {
    try {
        /* Beim Bauen immer beim Server nachfragen (seit 0.13.0) — der
           einfache Python-Server erlaubt dem Browser sonst, geänderte
           Dateien eine Weile aus seiner eigenen Ablage zu nehmen. */
        return await fetch(anfrage, { cache: "no-cache" });
    } catch (fehler) {
        const treffer = await caches.match(anfrage, { ignoreSearch: true });
        if (treffer) {
            return treffer;
        }
        throw fehler;
    }
}
