/*
 * test-aussehen-je-spiel.js — jedes Spiel sein eigenes Aussehen (seit 0.15.13,
 * wie Apps\Blunderluck\tests\test-aussehen-je-spiel.js; Nutzer 27.09.2026:
 * „mach es doch so, dass es nicht sync ist, also die Designs — wenn man auf
 * Übernehmen drückt, soll sich nur das Spiel ändern. Aber mach einen
 * Schalter rein für die Zukunft, falls ich beide wieder sync haben will").
 *
 * Der ECHTE Baustein js\upcrew-aussehen.js läuft in einer Attrappe von
 * Fenster und gemeinsamem Browser-Speicher (gleicher Ursprung), einmal mit
 * `GETEILT = false` (wie ausgeliefert) und einmal mit `true` (Quelltext für
 * den Test umgestellt). Dazu: Konto je Spiel beim Zusammenführen, Intro mit
 * eigener Farbwelt, `app` gesetzt, Anpassen ohne Umschalter.
 */

const fs = require("fs");
const pfad = require("path");
const vm = require("vm");
const { pruefe, gleich, fazit } = require("./pruefer.js");

const lesen = (name) => fs.readFileSync(pfad.join(__dirname, "..", name), "utf8");
const QUELLE = lesen("js/upcrew-aussehen.js");

function welt(speicher, pfadName, geteilt) {
    const lauscher = {};
    const umgebung = {
        console,
        localStorage: {
            getItem: (k) => (k in speicher ? speicher[k] : null),
            setItem: (k, v) => { speicher[k] = String(v); },
            removeItem: (k) => { delete speicher[k]; }
        },
        location: { pathname: pfadName },
        document: {
            documentElement: { dataset: {}, style: { setProperty() {} } },
            addEventListener() {},
            visibilityState: "visible"
        }
    };
    umgebung.window = { addEventListener: (name, fn) => { lauscher[name] = fn; } };
    vm.createContext(umgebung);
    const text = geteilt ? QUELLE.replace("const GETEILT = false;", "const GETEILT = true;") : QUELLE;
    if (geteilt && text === QUELLE) {
        throw new Error("Schalter `const GETEILT = false;` nicht gefunden");
    }
    vm.runInContext(text, umgebung);
    return { A: umgebung.window.UPCREW_AUSSEHEN, lauscher };
}

const ALT = JSON.stringify({ darstellung: "dunkel", farbwelt: "feld", schrift: "S2", knoepfe: "K3", leseschrift: false, stand: 5 });

pruefe("Der Schalter steht im Baustein auf false", /const GETEILT = false;/.test(QUELLE));

{
    const speicher = { "upcrew.aussehen": ALT };
    const { A } = welt(speicher, "/Typoluck/", false);
    gleich("Typoluck aus dem Pfad erkannt, eigener Schlüssel", [A.app, A.SCHLUESSEL], ["typoluck", "typoluck.aussehen"]);
    /* Seit 0.27.0: die alte Wahl ist „von vorher" → einmal auf Grau, der Rest bleibt. */
    gleich("Umzug: die bisherige gemeinsame Wahl gilt (Farbwelt einmal auf Grau)",
        [A.lesen().farbwelt, A.lesen().schrift, A.lesen().knoepfe, A.lesen().umstellung, A.umgestelltJetzt],
        ["grau", "S2", "K3", 1, true]);
    pruefe("… und liegt gleich als eigener Stand ab", "typoluck.aussehen" in speicher);
    gleich("… der gemeinsame Schlüssel bleibt unverändert", speicher["upcrew.aussehen"], ALT);
}

{
    const speicher = { "upcrew.aussehen": ALT, "blunderluck.aussehen": JSON.stringify({ farbwelt: "tiefsee", stand: 9 }) };
    const typo = welt(speicher, "/Typoluck/", false);
    typo.A.setzen({ farbwelt: "gold", darstellung: "hell" });
    gleich("Übernehmen in Typoluck: typoluck.aussehen", JSON.parse(speicher["typoluck.aussehen"]).farbwelt, "gold");
    gleich("… Blunderluck unverändert", JSON.parse(speicher["blunderluck.aussehen"]).farbwelt, "tiefsee");
    gleich("… gemeinsamer Schlüssel nicht geschrieben", speicher["upcrew.aussehen"], ALT);
    pruefe("… upcrew.farbwelt nicht geschrieben", !("upcrew.farbwelt" in speicher));
    const blunder = welt(speicher, "/Blunderluck/", false);
    blunder.A.setzen({ farbwelt: "studio" });
    gleich("Umgekehrt: Blunderluck ändert Typoluck nicht", JSON.parse(speicher["typoluck.aussehen"]).farbwelt, "gold");
    let gemeldet = 0;
    typo.A.beobachten(() => { gemeldet++; });
    typo.lauscher.storage({ key: "blunderluck.aussehen" });
    gleich("Kein Mitziehen über das storage-Ereignis", [gemeldet, typo.A.lesen().farbwelt], [0, "gold"]);
}

{
    const speicher = {};
    const { A } = welt(speicher, "/", false);
    gleich("Lokal ohne /Typoluck/ im Pfad: erst gemeinsam", A.SCHLUESSEL, "upcrew.aussehen");
    A.app = "typoluck";
    gleich("… mit app = \"typoluck\" der eigene Schlüssel", A.SCHLUESSEL, "typoluck.aussehen");
    pruefe("darstellung.js setzt app = \"typoluck\" vor dem ersten Lesen",
        /UPCREW_AUSSEHEN\.app = "typoluck";\s*\}\s*DARSTELLUNG\.migrieren\(\);\s*DARSTELLUNG\.anwenden\(\);/.test(lesen("js/darstellung.js")));
}

{
    const speicher = {};
    const blunder = welt(speicher, "/Blunderluck/", true);
    blunder.A.setzen({ farbwelt: "studio" });
    const typo = welt(speicher, "/Typoluck/", true);
    gleich("GETEILT = true: wieder ein Aussehen für beide", [speicher["upcrew.farbwelt"], typo.A.lesen().farbwelt],
        ["studio", "studio"]);
}

/* Konto: beim Zusammenführen je Spiel der neuere Stand */
{
    const SPIELER = require("../js/spieler.js");
    const meiner = { id: "i", name: "A", aussehen: { farbwelt: "feld", stand: 5 },
        aussehenJe: { typoluck: { farbwelt: "gold", stand: 20 }, blunderluck: { farbwelt: "feld", stand: 3 } } };
    const server = { id: "i", name: "A", aussehen: { farbwelt: "studio", stand: 8 },
        aussehenJe: { typoluck: { farbwelt: "tiefsee", stand: 10 }, blunderluck: { farbwelt: "studio", stand: 30 } } };
    const ergebnis = SPIELER.zusammenfuehren({ spieler: [server] }, { spieler: [meiner] }, "i");
    const ich = ergebnis.spieler[0];
    gleich("Je Spiel gewinnt der neuere Stand (Typoluck meiner, Blunderluck vom Server)",
        [ich.aussehenJe.typoluck.farbwelt, ich.aussehenJe.blunderluck.farbwelt], ["gold", "studio"]);
    gleich("Das alte Feld: der neuere Stand", ich.aussehen.farbwelt, "studio");
    gleich("Sonst bleibt der eigene Eintrag", ich.name, "A");
    gleich("aussehenJe muss ein Objekt sein", SPIELER.normalisieren({ spieler: [{ id: "x", aussehenJe: "kaputt" }] })
        .spieler[0].aussehenJe, undefined);
}

pruefe("Intro: die eigene Farbwelt geht mit (upcrew.farbwelt wird nicht mehr geschrieben)",
    /welt: INTRO\.welt\(\)/.test(lesen("js/intro.js"))
        && /gewaehlt: aussehen \? aussehen\.lesen\(\)\.farbwelt : null/.test(lesen("js/intro.js")));
pruefe("Anpassen: der Umschalter Typoluck/Blunderluck nur bei GETEILT",
    /const geteilt = A\.GETEILT !== false;/.test(lesen("js/upcrew-anpassen.js"))
        && /\$\{geteilt \? `<div class="upa-mini-seg"/.test(lesen("js/upcrew-anpassen.js")));

fazit();
