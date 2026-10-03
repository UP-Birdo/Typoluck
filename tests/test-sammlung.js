/*
 * test-sammlung.js — das Modell der Sammlung (js\sammlung.js, seit 0.9.0).
 *
 *   - die Modi wie im Auftrag Runde 4: drei da (was es heute gibt), zwei
 *     als „?" mit einer Zeile;
 *   - „nichts sperren, was heute frei ist": jedes Stück, das es heute im
 *     Spiel gibt, ist da;
 *   - seit 0.30.0 (Sammlung „Variante A"): die Kachel-Sets als Regal des
 *     Anpassen-Bausteins (`kachelsetStuecke`, gleich dem Katalog
 *     js\upcrew-katalog.js), die reine Sammlung ohne sie (`restGruppen`),
 *     und „NN %" = Zahl des Bausteins plus eigene Abschnitte (`anteil`).
 *     Den Bildschirm mit den echten Bausteinen prüft
 *     tests\test-sammlung-blatt.js.
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

/* Kachel-Sets über Taten (seit 0.13.0) */
require("./kern.js");
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
gleich("Stücke zu Taten (für die Kurzmeldung)", SAMMLUNG.stueckeZuTaten(["koennen-90"]).map((s) => s.name), ["Neon"]);
pruefe("Die Gruppen-Vorlage bleibt unverändert", !sets.stuecke[1].da);

/* ------------------------------------------------------------------ *
 * Seit 0.30.0 (Sammlung „Variante A"): Die Kachel-Sets sind ein Regal des
 * Anpassen-Bausteins, die reine Sammlung sind nur noch die Modi (und die
 * Abzeichen, die der Baustein baut), und „NN %" rechnet der Baustein
 * (`tab.zaehlen()`) plus die eigenen Abschnitte.
 * ------------------------------------------------------------------ */

gleich("Die Gruppe Kachel-Sets ist ein Regal (Katalog-Art kachelset), die Modi nicht",
    SAMMLUNG.GRUPPEN.map((g) => g.regal || null), [null, "kachelset"]);
gleich("Reine Sammlung: nur noch die Modi", SAMMLUNG.restGruppen([], false, 0).map((g) => g.id), ["modi"]);
gleich("… mit ihrem Stand (2/4), auch in der Werkstatt",
    [SAMMLUNG.gruppeZaehlen(SAMMLUNG.restGruppen([], false, 0)[0]), SAMMLUNG.gruppeZaehlen(SAMMLUNG.restGruppen([], true, 0)[0])],
    [{ hat: 2, alle: 4 }, { hat: 2, alle: 4 }]);

/* Die Stücke für das Regal: { wert, name, frei } — frei wie bisher über Tat oder Level. */
const KACHELSETS = require("../js/kachelsets.js");
const KATALOG = require("../js/upcrew-katalog.js");
const regal0 = SAMMLUNG.kachelsetStuecke([], false, 0);
gleich("Regal: jedes Stück trägt genau wert, name, frei", regal0.map((s) => Object.keys(s).join()),
    regal0.map(() => "wert,name,frei"));
gleich("Regal: die zehn Sets des Spiels in ihrer Reihenfolge", regal0.map((s) => s.wert), KACHELSETS.SETS.map((s) => s.id));
gleich("KACHELSETS.SETS[].id = Katalog „kachelset“ (js\\upcrew-katalog.js)",
    KACHELSETS.SETS.map((s) => s.id), KATALOG.stuecke("kachelset").map((s) => s.wert));
gleich("… und die Namen im Modell sind die des Katalogs", regal0.map((s) => s.name), KATALOG.stuecke("kachelset").map((s) => s.name));
gleich("Die Katalog-Art heisst als Regal wie der Schlüssel, den Typoluck übergibt",
    [KATALOG.art("kachelset").regal, KATALOG.art("kachelset").spiel, SAMMLUNG.GRUPPEN[1].regal], ["kachelset", "typoluck", "kachelset"]);
const freie = (taten, alleFrei, level) => SAMMLUNG.kachelsetStuecke(taten, alleFrei, level).filter((s) => s.frei).map((s) => s.wert);
gleich("Regal, Level 0 ohne Taten: frei nur Papier", freie([], false, 0), ["papier"]);
gleich("Regal, mit Taten: Leder und Neon dazu", freie(["zweiter-versuch", "koennen-90"], false, 0), ["papier", "leder", "neon"]);
gleich("Regal, Level 12: Kreide, Sand, Mitternacht, Kupfer dazu", freie([], false, 12),
    ["papier", "kreide", "sand", "mitternacht", "kupfer"]);
gleich("Regal, Werkstatt: alle frei", freie([], true, 0).length, 10);
pruefe("Regal: `frei` ist immer true oder false (der Baustein fragt `frei !== false`)",
    SAMMLUNG.kachelsetStuecke([], false, 0).every((s) => s.frei === true || s.frei === false));

/* „NN %“: tab.zaehlen() plus die eigenen Abschnitte. */
gleich("Anteil: Zahl des Bausteins plus Abschnitte",
    SAMMLUNG.anteil({ hat: 6, alle: 40 }, [{ hat: 1, alle: 10 }, { hat: 2, alle: 4 }]), { hat: 9, alle: 54, prozent: 17 });
gleich("Anteil: die Abschnitte dürfen Text sein (so stehen sie an den Kacheln)",
    SAMMLUNG.anteil({ hat: 6, alle: 40 }, [{ hat: "1", alle: "10" }]), { hat: 7, alle: 50, prozent: 14 });
gleich("Anteil: ohne Abschnitte nur der Baustein", SAMMLUNG.anteil({ hat: 3, alle: 12 }), { hat: 3, alle: 12, prozent: 25 });
gleich("Anteil: nichts da = 0 %, keine Teilung durch null", SAMMLUNG.anteil(null, []), { hat: 0, alle: 0, prozent: 0 });
gleich("Anteil: was keine Zahl ist, zählt nicht",
    SAMMLUNG.anteil({ hat: "x", alle: 10 }, [{ hat: -2, alle: undefined }, null]), { hat: 0, alle: 10, prozent: 0 });
gleich("Anteil: alles da = 100 %", SAMMLUNG.anteil({ hat: 5, alle: 5 }, [{ hat: 4, alle: 4 }]).prozent, 100);
pruefe("Die eigene Rechnung über die Stufen-Tabelle ist weg",
    SAMMLUNG.AUSSEHEN_TEILE === undefined && SAMMLUNG._aussehenFrei === undefined && SAMMLUNG.anteil.length === 2);

/* Die Stufen des Aussehens stehen weiter allein im Baustein (unverändert). */
gleich("Farbwelt-Stufen aus dem Baustein", STUFEN.farbwelt,
    { grau: 0, werkstatt: 2, studio: 3, feld: 11, tiefsee: 21, gold: 40 });
pruefe("Baustein: frei(farbwelt, grau, 0) ja, werkstatt erst ab 2",
    fenster.UPCREW_ANPASSEN.frei("farbwelt", "grau", 0) && !fenster.UPCREW_ANPASSEN.frei("farbwelt", "werkstatt", 1)
        && fenster.UPCREW_ANPASSEN.frei("farbwelt", "werkstatt", 2));
gleich("Baustein: Besitz zählt, egal welches Level; Besitz, der wirft: nur die Stufe",
    [fenster.UPCREW_ANPASSEN.frei("farbwelt", "gold", 0, (art, wert) => art === "farbwelt" && wert === "gold"),
        fenster.UPCREW_ANPASSEN.frei("farbwelt", "gold", 0, () => { throw new Error("x"); })], [true, false]);
pruefe("Die Sammlung gibt dem Baustein den Besitz mit",
    /besitz: SAMMLUNG_BILDSCHIRM\.besitz/.test(fs.readFileSync(path.join(__dirname, "..", "js", "bildschirm-sammlung.js"), "utf8")));

fazit();
