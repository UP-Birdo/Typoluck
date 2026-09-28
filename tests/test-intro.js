/*
 * test-intro.js — wann das UPCrew-Intro kommt (seit 0.18.2, js/intro.js
 * `entscheiden`). Nutzer 28.09.2026: „Wenn ich die Seite neu lade, soll die
 * UPCrew-Animation erneut kommen."
 */

const fs = require("fs");
const pfad = require("path");
const { pruefe, gleich, fazit } = require("./pruefer.js");

const wurzel = pfad.join(__dirname, "..");
const lesen = (name) => fs.readFileSync(pfad.join(wurzel, name), "utf8");
const INTRO = require("../js/intro.js");
const AKTUALISIERUNG = require("../js/aktualisierung.js");

gleich("Jedes Laden: Intro", INTRO.entscheiden({ ladeArt: "navigate" }), true);
gleich("Neuladen (F5): Intro", INTRO.entscheiden({ ladeArt: "reload" }), true);
gleich("Zurück/Vor (wird neu geladen): Intro", INTRO.entscheiden({ ladeArt: "back_forward" }), true);
gleich("Ohne Angaben: Intro", INTRO.entscheiden(), true);
gleich("Automatisches Neuladen der Aktualisierung (vor 2 s): kein Intro",
    INTRO.entscheiden({ ladeArt: "reload", aktualisiertVorMs: 2000 }), false);
gleich("… Merker alt (vor 5 min), der Nutzer lädt selbst neu: Intro",
    INTRO.entscheiden({ ladeArt: "reload", aktualisiertVorMs: 300000 }), true);
gleich("Werkstatt, frischer Aufruf ohne &intro (Bildschirmfoto): kein Intro",
    INTRO.entscheiden({ werkstatt: true, ladeArt: "navigate" }), false);
gleich("Werkstatt, Neuladen: Intro", INTRO.entscheiden({ werkstatt: true, ladeArt: "reload" }), true);
gleich("Werkstatt mit &intro: Intro", INTRO.entscheiden({ werkstatt: true, introSchalter: true, ladeArt: "navigate" }), true);
gleich("Merker der Aktualisierung: derselbe Name wie in js/aktualisierung.js",
    lesen("js/intro.js").indexOf('"' + AKTUALISIERUNG.MERKER + '"') !== -1, true);
pruefe("Das Intro startet bei jedem Laden der Seite (DOMContentLoaded → APP.starten → INTRO.zeigen)",
    /document\.addEventListener\("DOMContentLoaded", \(\) => APP\.starten\(\)\)/.test(lesen("js/app.js"))
        && /INTRO\.zeigen\(document\.getElementById\("intro"\)\)/.test(lesen("js/app.js")));

/* Die Farbwelt des Intros (seit 0.18.3) */
const welten = ["werkstatt", "studio", "feld", "tiefsee", "gold"];
gleich("Normal: die gewählte Farbwelt dieses Spiels",
    INTRO.weltWaehlen({ gewaehlt: "feld", standard: "werkstatt", welten: welten }), "feld");
gleich("Werkstatt: &farbwelt (nicht der Stand des vorigen Aufrufs)",
    INTRO.weltWaehlen({ werkstatt: true, werkstattWelt: "gold", gewaehlt: "feld", standard: "werkstatt", welten: welten }), "gold");
gleich("Werkstatt ohne &farbwelt: der Standard (wie vorbereiten)",
    INTRO.weltWaehlen({ werkstatt: true, gewaehlt: "feld", standard: "werkstatt", welten: welten }), "werkstatt");
gleich("Unbekannte Welt (z. B. neues Paket, das der Intro-Baustein nicht kennt): Standard",
    INTRO.weltWaehlen({ gewaehlt: "pink", standard: "werkstatt", welten: welten }), "werkstatt");
pruefe("Das Intro bekommt die Welt aus INTRO.welt()", /welt: INTRO\.welt\(\)/.test(lesen("js/intro.js")));

fazit();
