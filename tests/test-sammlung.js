/*
 * test-sammlung.js — das Modell der Sammlung (js\sammlung.js, seit 0.9.0).
 *
 *   - die Modi wie im Auftrag Runde 4: drei da (was es heute gibt), zwei
 *     als „?" mit einer Zeile;
 *   - „nichts sperren, was heute frei ist": jedes Stück, das es heute im
 *     Spiel gibt, ist da;
 *   - der Anteil zählt Farbwelt, Schrift und Knöpfe aus dem ECHTEN Baustein
 *     (js\upcrew-anpassen.js) plus die Gruppen.
 */

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { pruefe, gleich, fazit } = require("./pruefer.js");

const SAMMLUNG = require("../js/sammlung.js");

/* Die Stufen stehen allein im Baustein — hier aus der echten Datei gelesen
   (sie braucht ein Fenster, das sie beschreiben kann). */
const fenster = {};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, "..", "js", "upcrew-anpassen.js"), "utf8"),
    { window: fenster }, { filename: "upcrew-anpassen.js" });
const STUFEN = fenster.UPCREW_ANPASSEN.STUFEN;

const modi = SAMMLUNG.GRUPPEN.find((g) => g.id === "modi");
pruefe("Es gibt die Gruppe Modi", !!modi);
gleich("Modi: die fünf Stücke in der Reihenfolge des Auftrags", modi.stuecke.map((s) => s.id),
    ["tag", "uebung", "schwer", "blitzwort", "duell"]);
gleich("Modi: da sind die, die es heute gibt", modi.stuecke.filter((s) => s.da).map((s) => s.id),
    ["tag", "uebung", "schwer"]);
pruefe("Was noch nicht da ist, sagt „Kommt“",
    modi.stuecke.filter((s) => !s.da).every((s) => /^Kommt: /.test(s.text)));
pruefe("Jedes Stück hat eine Zeile, keinen Satz mit Punkt",
    modi.stuecke.every((s) => s.text && s.text.length <= 60 && !/\.$/.test(s.text)));
gleich("Modi zählen 3/5", SAMMLUNG.gruppeZaehlen(modi), { hat: 3, alle: 5 });

/* Anteil: bei Stufe 0 je Aussehen-Regal nur die Stücke mit Stufe 0. */
const aussehenAlle = ["farbwelt", "schrift", "knoepfe"].reduce((n, t) => n + Object.keys(STUFEN[t]).length, 0);
const aussehenFrei0 = ["farbwelt", "schrift", "knoepfe"]
    .reduce((n, t) => n + Object.values(STUFEN[t]).filter((s) => s <= 0).length, 0);
const null0 = SAMMLUNG.anteil(STUFEN, 0, false);
gleich("Anteil Stufe 0: gezählt über Aussehen + Modi", [null0.hat, null0.alle], [aussehenFrei0 + 3, aussehenAlle + 5]);
gleich("Anteil Stufe 0: Prozent gerundet", null0.prozent, Math.round((aussehenFrei0 + 3) / (aussehenAlle + 5) * 100));
const werkstatt = SAMMLUNG.anteil(STUFEN, 0, true);
gleich("Werkstatt: alles Aussehen frei, Modi bleiben 3/5", werkstatt.hat, aussehenAlle + 3);
pruefe("Höhere Stufe gibt nie weniger", SAMMLUNG.anteil(STUFEN, 5, false).hat >= null0.hat);
pruefe("Darstellung zählt nicht mit (immer frei, kein Sammelstück)",
    SAMMLUNG.AUSSEHEN_TEILE.indexOf("darstellung") === -1);
gleich("Ohne Stufen-Tabelle: nur die Gruppen", SAMMLUNG.anteil(null, 0, false), { hat: 3, alle: 5, prozent: 60 });

fazit();
