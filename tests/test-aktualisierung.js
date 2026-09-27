/*
 * test-aktualisierung.js — die neue Version auch zeigen (js\aktualisierung.js,
 * seit 0.15.2).
 *
 *   - nachfragen beim ersten Mal und dann höchstens alle 5 Minuten;
 *   - neu laden nur an einer sicheren Stelle (nichts getippt, kein Feld,
 *     kein Dialog, keine Anmeldung);
 *   - keine Schleife: nach einem Neuladen 60 s lang kein zweites;
 *   - die Verdrahtung in js\app.js ist da (update, controllerchange mit
 *     vorherigem Controller, Leiste über BAUSTEINE.knopf).
 * Ob der Browser wirklich neu lädt, prüft kein Test — das zeigt sich erst
 * live nach einer Auslieferung.
 */

const fs = require("fs");
const path = require("path");
const { pruefe, gleich, fazit } = require("./pruefer.js");
const AKTUALISIERUNG = require("../js/aktualisierung.js");

const lesen = (datei) => fs.readFileSync(path.join(__dirname, "..", datei), "utf8");
const MIN = 60 * 1000;

gleich("Abstand zum Nachfragen: 5 Minuten", AKTUALISIERUNG.PRUEF_ABSTAND_MS, 5 * MIN);
pruefe("Erstes Nachfragen immer", AKTUALISIERUNG.sollPruefen(1000, 0));
pruefe("Nach 2 Minuten nicht", !AKTUALISIERUNG.sollPruefen(10 * MIN, 8 * MIN));
pruefe("Nach 5 Minuten wieder", AKTUALISIERUNG.sollPruefen(13 * MIN, 8 * MIN));

pruefe("Sicher: nichts los", AKTUALISIERUNG.sicher({ getippt: 0 }));
pruefe("Sicher: ohne Angaben", AKTUALISIERUNG.sicher());
pruefe("Nicht sicher: Buchstaben getippt", !AKTUALISIERUNG.sicher({ getippt: 2 }));
pruefe("Nicht sicher: Feld beschrieben", !AKTUALISIERUNG.sicher({ schreibt: true }));
pruefe("Nicht sicher: Dialog offen", !AKTUALISIERUNG.sicher({ dialogOffen: true }));
pruefe("Nicht sicher: Anmeldung offen", !AKTUALISIERUNG.sicher({ anmeldungOffen: true }));

pruefe("Ohne Merker: neu laden erlaubt", AKTUALISIERUNG.neuLadenErlaubt(null, 5 * MIN));
pruefe("Merker vor 10 s: nicht noch einmal (keine Schleife)",
    !AKTUALISIERUNG.neuLadenErlaubt(String(5 * MIN - 10000), 5 * MIN));
pruefe("Merker vor 2 Minuten: wieder erlaubt", AKTUALISIERUNG.neuLadenErlaubt(String(3 * MIN), 5 * MIN));
pruefe("Kaputter Merker: erlaubt", AKTUALISIERUNG.neuLadenErlaubt("unsinn", 5 * MIN));
pruefe("Merker im sessionStorage, Namensraum Typoluck",
    AKTUALISIERUNG.MERKER.indexOf("typoluck.") === 0 && /sessionStorage\.setItem\(AKTUALISIERUNG\.MERKER/.test(lesen("js/aktualisierung.js")));

/* Die Verdrahtung */
const quelle = lesen("js/aktualisierung.js");
const app = lesen("js/app.js");
pruefe("Nachfragen per registration.update()", /_registrierung\.update\(\)/.test(quelle));
pruefe("Bei Rückkehr in den Vordergrund nachfragen", /visibilitychange[\s\S]*?pruefen\(\)/.test(quelle));
pruefe("controllerchange nur, wenn es vorher einen Controller gab",
    /hatteController = !!navigator\.serviceWorker\.controller/.test(quelle)
        && /controllerchange[\s\S]*?if \(hatteController\)/.test(quelle));
pruefe("Leiste über BAUSTEINE.knopf, kein eigener Knopf",
    /BAUSTEINE\.knopf\(/.test(quelle) && quelle.indexOf("createElement(\"button\")") === -1);
pruefe("app.js richtet die Aktualisierung nach dem Registrieren ein",
    /register\("sw\.js"\)[\s\S]*?AKTUALISIERUNG\.einrichten\(registrierung/.test(app));
pruefe("app.js meldet getippte Buchstaben, Feld, Dialog, Anmeldung",
    ["getippt:", "schreibt:", "dialogOffen:", "anmeldungOffen:"].every((t) => app.indexOf(t) !== -1));
pruefe("Die Werkstatt registriert weiterhin keinen Worker",
    /_serviceWorkerAnmelden\(werkstatt\) \{[\s\S]*?if \(werkstatt/.test(app));

fazit();
