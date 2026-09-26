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
const SPEICHER_NAME = "typoluck-v0.8.0";

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
    "./icon.svg",

    "./icons/icon-32.png",
    "./icons/icon-180.png",
    "./icons/icon-192.png",
    "./icons/icon-512.png",

    "./css/stil.css",
    "./css/stil-bildschirme.css",
    "./css/stil-wordle.css",
    "./css/upcrew-intro.css",
    "./css/upcrew-knoepfe.css",
    "./css/upcrew-anpassen.css",

    /* Die Crew-Schriften (seit 0.8.0) — alle zwölf, damit jede Wahl im
       Tab Anpassen auch offline trägt. (In dieser Liste keine geraden
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
    "./js/fuehlen.js",
    "./js/upcrew-intro.js",
    "./js/upcrew-farbwelten.js",
    "./js/upcrew-aussehen.js",
    "./js/darstellung.js",
    "./js/upcrew-anpassen.js",
    "./js/speicher.js",
    "./js/abgleich.js",
    "./js/woerter-de.js",
    "./js/wordle.js",
    "./js/ergebnisse.js",
    "./js/rangliste.js",
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
    "./js/bildschirm-einstellungen.js",
    "./js/bildschirm-herausforderungen.js",
    "./js/bildschirm-anpassen.js",
    "./js/aussehen-abgleich.js",
    "./js/wunsch.js",
    "./js/werkstatt.js",
    "./js/intro.js",
    "./js/app.js"
];

self.addEventListener("install", (ereignis) => {
    ereignis.waitUntil((async () => {
        const speicher = await caches.open(SPEICHER_NAME);
        /* Absichtlich hart: Scheitert EINE Datei, bleibt der alte Worker in
           Betrieb. Ein halb gefüllter Speicher wäre schlimmer als keiner. */
        await speicher.addAll(DATEIEN);
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

async function speicherZuerst(anfrage) {
    const treffer = await caches.match(anfrage, { ignoreSearch: true });
    if (treffer) {
        return treffer;
    }
    try {
        return await fetch(anfrage);
    } catch (fehler) {
        if (anfrage.mode === "navigate") {
            const start = await caches.match("./", { ignoreSearch: true });
            if (start) {
                return start;
            }
        }
        throw fehler;
    }
}

async function netzZuerst(anfrage) {
    try {
        return await fetch(anfrage);
    } catch (fehler) {
        const treffer = await caches.match(anfrage, { ignoreSearch: true });
        if (treffer) {
            return treffer;
        }
        throw fehler;
    }
}
