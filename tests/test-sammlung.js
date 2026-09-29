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
/* Seit 0.26.0 ohne „Schwer" (Nutzer 29.09.2026: Schwer-Modus raus). */
gleich("Modi: die vier Stücke in der Reihenfolge des Auftrags", modi.stuecke.map((s) => s.id),
    ["tag", "uebung", "blitzwort", "duell"]);
gleich("Modi: da sind die, die es heute gibt", modi.stuecke.filter((s) => s.da).map((s) => s.id),
    ["tag", "uebung"]);
pruefe("Was noch nicht da ist, sagt „Kommt“",
    modi.stuecke.filter((s) => !s.da).every((s) => /^Kommt: /.test(s.text)));
pruefe("Jedes Stück hat eine Zeile, keinen Satz mit Punkt",
    modi.stuecke.every((s) => s.text && s.text.length <= 60 && !/\.$/.test(s.text)));
gleich("Modi zählen 2/4", SAMMLUNG.gruppeZaehlen(modi), { hat: 2, alle: 4 });

/* Anteil: bei Stufe 0 je Aussehen-Regal nur die Stücke mit Stufe 0. */
/* Kachel-Sets über Taten (seit 0.13.0) */
const FORTSCHRITT = require("../js/fortschritt.js");
const sets = SAMMLUNG.GRUPPEN.find((g) => g.id === "kachelsets");
gleich("Kachel-Sets: die fünf aus dem Entwurf zuerst, dann fünf Vorschläge (seit 0.14.0)", sets.stuecke.map((s) => s.name),
    ["Papier", "Leder", "Blei", "Holz", "Neon", "Kreide", "Sand", "Mitternacht", "Kupfer", "Glas"]);
pruefe("Kachel-Sets sind anziehbar", sets.stuecke.every((s) => s.anziehbar === true));
gleich("Werkstatt: alle Sets da, Modi unverändert", SAMMLUNG.gruppen([], true).map((g) => SAMMLUNG.gruppeZaehlen(g)),
    [{ hat: 2, alle: 4 }, { hat: 10, alle: 10 }]);
gleich("Ohne Taten: nur Papier da", SAMMLUNG.gruppeZaehlen(SAMMLUNG.gruppen([]).find((g) => g.id === "kachelsets")),
    { hat: 1, alle: 10 });
gleich("Mit Tat: das Stück ist da", SAMMLUNG.gruppen(new Set(["serie-7"])).find((g) => g.id === "kachelsets")
    .stuecke.filter((s) => s.da).map((s) => s.id), ["papier", "blei"]);
pruefe("Jede Tat eines Stücks gibt es im Fortschritt",
    SAMMLUNG.GRUPPEN.every((g) => g.stuecke.every((s) => !s.tat || FORTSCHRITT.tatTitel(s.tat) !== "")));
pruefe("Bestandsschutz: kein altes Stück hängt an einer Tat",
    modi.stuecke.every((s) => !s.tat));
/* Seit 0.15.0 (Nutzer 27.09.2026: „alle"): die fünf neuen Sets über das Level */
gleich("Kachel-Sets über das Level: 3, 6, 9, 12, 16", SAMMLUNG.kachelsetStufen(),
    { kreide: 3, sand: 6, mitternacht: 9, kupfer: 12, glas: 16 });
gleich("Level 9: Papier + Kreide, Sand, Mitternacht", SAMMLUNG.gruppen([], false, 9).find((g) => g.id === "kachelsets")
    .stuecke.filter((s) => s.da).map((s) => s.id), ["papier", "kreide", "sand", "mitternacht"]);
gleich("Level 2: nur Papier", SAMMLUNG.gruppen([], false, 2).find((g) => g.id === "kachelsets")
    .stuecke.filter((s) => s.da).map((s) => s.id), ["papier"]);
pruefe("Jedes Set kommt über genau einen Weg (frei, Tat oder Level)",
    sets.stuecke.every((s) => [s.da === true, !!s.tat, typeof s.ab === "number"].filter(Boolean).length === 1));
pruefe("Keine Level-Stufe fällt auf einen Rahmen (10, 15, 20 …)",
    Object.values(SAMMLUNG.kachelsetStufen()).every((l) => l < 10 || l % 5 !== 0));
gleich("Anteil zählt Sets über das Level", SAMMLUNG.anteil(null, 12, false).hat, 2 + 1 + 4);
gleich("Stücke zu Taten (für die Kurzmeldung)", SAMMLUNG.stueckeZuTaten(["koennen-90"]).map((s) => s.name), ["Neon"]);
pruefe("Die Gruppen-Vorlage bleibt unverändert", !sets.stuecke[1].da);

const aussehenAlle = ["farbwelt", "schrift", "knoepfe"].reduce((n, t) => n + Object.keys(STUFEN[t]).length, 0);
const aussehenFrei0 = ["farbwelt", "schrift", "knoepfe"]
    .reduce((n, t) => n + Object.values(STUFEN[t]).filter((s) => s <= 0).length, 0);
const null0 = SAMMLUNG.anteil(STUFEN, 0, false);
gleich("Anteil Stufe 0: gezählt über Aussehen + Modi + Kachel-Sets", [null0.hat, null0.alle],
    [aussehenFrei0 + 2 + 1, aussehenAlle + 4 + 10]);
gleich("Anteil Stufe 0: Prozent gerundet", null0.prozent,
    Math.round((aussehenFrei0 + 3) / (aussehenAlle + 14) * 100));
const werkstatt = SAMMLUNG.anteil(STUFEN, 0, true);
gleich("Werkstatt: alles Aussehen frei, Modi 2/4, Sets nach Taten", werkstatt.hat, aussehenAlle + 3);
pruefe("Höhere Stufe gibt nie weniger", SAMMLUNG.anteil(STUFEN, 5, false).hat >= null0.hat);
gleich("Taten zählen im Anteil mit", SAMMLUNG.anteil(STUFEN, 0, false, ["serie-7", "koennen-90"]).hat, null0.hat + 2);
pruefe("Darstellung zählt nicht mit (immer frei, kein Sammelstück)",
    SAMMLUNG.AUSSEHEN_TEILE.indexOf("darstellung") === -1);
gleich("Ohne Stufen-Tabelle: nur die Gruppen", SAMMLUNG.anteil(null, 0, false), { hat: 3, alle: 14, prozent: 21 });

fazit();
