/*
 * test-fortschritt-abgleich.js — der Fortschritt am UPCrew-Konto
 * (js\fortschritt-abgleich.js, seit 0.15.1).
 *
 *   - senden schreibt NUR `.../fortschritt/version` und
 *     `.../fortschritt/spiele/typoluck` (Teilpfade) — Blunderlucks Zweig am
 *     Konto bleibt unberührt; die Marke geaendertAm zieht mit;
 *   - alles, was geschrieben wird, besteht die Regel §11b (in
 *     Apps\Blunderluck\SICHERHEIT.md) — hier als Prüffunktion nachgebaut,
 *     auch für einen absichtlich übervollen Stand (Grenzen 100/1000,
 *     Zähler-Namen, kein `umzug`, keine Zusatzfelder);
 *   - holen: am Konto neuer → aufs Gerät (nur der eigene Zweig); auf dem
 *     Gerät neuer → hinauf; Blunderluck vom Konto zählt beim Lesen mit;
 *   - Gäste/Werkstatt (uid null), Ablehnung, werfender uidGeber: still.
 *
 * Geprüft gegen die ECHTE lokale Rückwand (SpeicherLokal) — dieselbe
 * Mehrpfad-Wirkung wie die Datenbank. Ins Netz geht nichts.
 */

const { pruefe, gleich, spaeter, fazit } = require("./pruefer.js");
const { geraetLeeren } = require("./umgebung.js");
global.FORTSCHRITT = require("../js/fortschritt.js");
const FORTSCHRITT_ABGLEICH = require("../js/fortschritt-abgleich.js");

const SCHLUESSEL = "typoluck.test-konten";
const HEUTE = "2026-09-27";

/* ------------------------------------------------------------------ *
 * Die Regel §11b als Prüffunktion (Stand 27.09.2026, eingespielt).
 * Liefert eine Liste von Verstössen (leer = besteht).
 * ------------------------------------------------------------------ */
function regel11b(knoten) {
    const fehler = [];
    const zahl = (wert, von, bis, wo) => {
        if (typeof wert !== "number" || wert < von || (bis !== null && wert > bis)) {
            fehler.push(wo + ": " + JSON.stringify(wert));
        }
    };
    const liste = (wert, muster, pruefen, wo) => {
        if (wert === undefined) {
            return;
        }
        const eintraege = Array.isArray(wert) ? wert.map((w, i) => [String(i), w]) : Object.entries(wert || {});
        for (const [schluessel, w] of eintraege) {
            if (!muster.test(schluessel)) {
                fehler.push(wo + ": Stelle " + schluessel);
            }
            pruefen(w, wo + "/" + schluessel);
        }
    };
    const nurText = (max) => (w, wo) => {
        if (typeof w !== "string" || w.length > max) {
            fehler.push(wo + ": " + JSON.stringify(w));
        }
    };
    const datum = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;
    for (const schluessel of Object.keys(knoten)) {
        if (["version", "spiele", "schutz"].indexOf(schluessel) === -1) {
            fehler.push("oben: " + schluessel);
        }
    }
    if ("version" in knoten) {
        zahl(knoten.version, 1, 100, "version");
    }
    for (const [app, zweig] of Object.entries(knoten.spiele || {})) {
        if (!/^(blunderluck|typoluck)$/.test(app)) {
            fehler.push("spiele: " + app);
        }
        for (const feld of Object.keys(zweig)) {
            if (["xp", "partien", "stand", "gezaehlt", "tage", "heute", "turm", "zaehler", "taten"].indexOf(feld) === -1) {
                fehler.push(app + ": " + feld);
            }
        }
        if ("xp" in zweig) {
            zahl(zweig.xp, 0, 10000000, app + "/xp");
        }
        if ("partien" in zweig) {
            zahl(zweig.partien, 0, 10000000, app + "/partien");
        }
        if ("stand" in zweig) {
            zahl(zweig.stand, 0, null, app + "/stand");
        }
        liste(zweig.gezaehlt, /^[0-9]{1,2}$/, nurText(64), app + "/gezaehlt");
        liste(zweig.tage, /^[0-9]{1,3}$/, (w, wo) => {
            if (typeof w !== "string" || !datum.test(w)) {
                fehler.push(wo + ": " + JSON.stringify(w));
            }
        }, app + "/tage");
        liste(zweig.taten, /^[0-9]{1,3}$/, nurText(64), app + "/taten");
        if (zweig.heute) {
            for (const feld of Object.keys(zweig.heute)) {
                if (["datum", "versuche", "figuren"].indexOf(feld) === -1) {
                    fehler.push(app + "/heute: " + feld);
                }
            }
            if ("datum" in zweig.heute && (typeof zweig.heute.datum !== "string"
                    || !(zweig.heute.datum === "" || datum.test(zweig.heute.datum)))) {
                fehler.push(app + "/heute/datum");
            }
            if ("versuche" in zweig.heute) {
                zahl(zweig.heute.versuche, 0, 1000, app + "/heute/versuche");
            }
            if ("figuren" in zweig.heute) {
                zahl(zweig.heute.figuren, 0, 3, app + "/heute/figuren");
            }
        }
        for (const [name, wert] of Object.entries(zweig.zaehler || {})) {
            if (!/^[a-zA-Z]{1,32}$/.test(name)) {
                fehler.push(app + "/zaehler: " + name);
            }
            zahl(wert, 0, 1000000000, app + "/zaehler/" + name);
        }
        /* turm: nur figuren ("Zahl-Zahl": 1–3) und schwuere (seit 0.18.0
           schreibt Typoluck die Bibliothek hierher). */
        if (zweig.turm !== undefined) {
            for (const feld of Object.keys(zweig.turm)) {
                if (["figuren", "schwuere"].indexOf(feld) === -1) {
                    fehler.push(app + "/turm: " + feld);
                }
            }
            liste(zweig.turm.figuren, /^[0-9]{1,2}-[0-9]{1,2}$/, (w, wo) => zahl(w, 1, 3, wo), app + "/turm/figuren");
            liste(zweig.turm.schwuere, /^[0-9]{1,3}$/, (w, wo) => zahl(w, 0, 3, wo), app + "/turm/schwuere");
        }
    }
    return fehler;
}

/* Die Mehrpfad-Änderung auf den Konto-Knoten anwenden (wie die Datenbank). */
function anwenden(knoten, aenderungen, uid) {
    const kopie = JSON.parse(JSON.stringify(knoten || {}));
    const vorne = "konten/" + uid + "/fortschritt/";
    for (const [pfad, wert] of Object.entries(aenderungen)) {
        if (pfad.indexOf(vorne) !== 0) {
            continue;
        }
        const teile = pfad.slice(vorne.length).split("/");
        let ort = kopie;
        for (let i = 0; i < teile.length - 1; i++) {
            ort[teile[i]] = ort[teile[i]] || {};
            ort = ort[teile[i]];
        }
        ort[teile[teile.length - 1]] = JSON.parse(JSON.stringify(wert));
    }
    return kopie;
}

/* ------------------------------------------------------------------ *
 * Was geschrieben wird, besteht die Regel
 * ------------------------------------------------------------------ */
const normal = FORTSCHRITT.partie(FORTSCHRITT.leer(), { datum: HEUTE, tagesaufgabe: true, figuren: 2, stufe: 3,
    koennen: 70, geloest: true, versuche: 2 }).stand;
const aenderung = FORTSCHRITT_ABGLEICH.aenderungen("uid-a", normal, 1234);
gleich("Nur Teilpfade: version, spiele/typoluck, Marke", Object.keys(aenderung).sort(),
    ["geaendertAm", "konten/uid-a/fortschritt/spiele/typoluck", "konten/uid-a/fortschritt/version"]);
gleich("Normaler Stand besteht die Regel", regel11b(anwenden(null, aenderung, "uid-a")), []);

/* Ein absichtlich übervoller Stand */
const viel = (n, f) => Array.from({ length: n }, (_, i) => f(i));
const uebervoll = { version: 1, oben: "fremd", schutz: { alt: 3 }, spiele: {
    typoluck: {
        xp: 99999999999, partien: -5, stand: 17,
        turm: { figuren: { "1-0": 3, "1-1": 9, "1-2": 0, "x-1": 2, "123-1": 1 }, fremd: 1 },
        gezaehlt: viel(250, (i) => "p-" + i),
        tage: viel(1500, (i) => new Date(Date.UTC(2020, 0, 1 + i)).toISOString().slice(0, 10)),
        taten: viel(1500, (i) => "t" + i).concat(["x".repeat(80)]),
        heute: { datum: HEUTE, versuche: 5000, figuren: 9, xp: 40, extra: true },
        zaehler: { figuren: 3, "mit-strich": 2, zahl1: 4, text: "a", riesig: 5e12 },
        umzug: { von: "0.10.0", alt: { xp: 1 } },
        neuesFeld: 1
    },
    blunderluck: { xp: 5 } } };
const aenderungVoll = FORTSCHRITT_ABGLEICH.aenderungen("uid-b", uebervoll, 1);
const kontoVoll = anwenden(null, aenderungVoll, "uid-b");
gleich("Übervoller Stand: besteht trotzdem die Regel", regel11b(kontoVoll), []);
const tv = kontoVoll.spiele.typoluck;
pruefe("… ohne umzug und Zusatzfelder", !("umzug" in tv) && !("neuesFeld" in tv));
gleich("… Bibliothek: nur gültige Figuren (seit 0.18.0)", tv.turm, { figuren: { "1-0": 3, "1-1": 3 } });
pruefe("… Blunderlucks Zweig wird nicht mitgeschickt", !("blunderluck" in kontoVoll.spiele));
pruefe("… Listen gekappt (tage/taten ≤ 1000, gezaehlt ≤ 100)",
    tv.tage.length <= 1000 && tv.taten.length <= 1000 && tv.gezaehlt.length <= 100);
pruefe("… Zähler nur mit Buchstaben-Namen", Object.keys(tv.zaehler).every((k) => /^[a-zA-Z]+$/.test(k)));

/* ------------------------------------------------------------------ *
 * Senden und holen gegen die lokale Rückwand
 * ------------------------------------------------------------------ */
function aufbauen(uid, id) {
    geraetLeeren();
    FORTSCHRITT._speicher = () => global.geraet;
    const speicher = new SpeicherLokal(SCHLUESSEL);
    FORTSCHRITT_ABGLEICH.einrichten(speicher, () => uid, () => id || uid);
    return speicher;
}
const kontoKnoten = (uid) => {
    const ganz = JSON.parse(global.geraet.getItem(SCHLUESSEL) || "{}");
    return ((ganz.konten || {})[uid] || {}).fortschritt || null;
};
const ablehnend = {
    teilSchreiben: async () => { throw Object.assign(new Error("401"), { status: 401 }); },
    teilLaden: async () => { throw Object.assign(new Error("401"), { status: 401 }); }
};

spaeter("Abgleich", (async () => {
    gleich("Der Pfad am Konto", FORTSCHRITT_ABGLEICH.pfad("abc"), "konten/abc/fortschritt");

    /* Senden: Blunderlucks Zweig am Konto bleibt */
    let speicher = aufbauen("uid-1");
    await speicher.teilSchreiben({ "konten/uid-1": { name: "Anna" },
        "konten/uid-1/fortschritt": { version: 1, spiele: { blunderluck: { xp: 70, stand: 9 } } } });
    const vorher = Date.now();
    gleich("Senden klappt", await FORTSCHRITT_ABGLEICH.senden(normal), true);
    let konto = kontoKnoten("uid-1");
    gleich("Am Konto: Typolucks Zweig", konto.spiele.typoluck.xp, FORTSCHRITT.zweig(normal).xp);
    gleich("Am Konto: Blunderlucks Zweig unberührt", konto.spiele.blunderluck, { xp: 70, stand: 9 });
    gleich("Name des Kontos unberührt", JSON.parse(global.geraet.getItem(SCHLUESSEL)).konten["uid-1"].name, "Anna");
    pruefe("Marke geaendertAm zieht mit", JSON.parse(global.geraet.getItem(SCHLUESSEL)).geaendertAm >= vorher);
    gleich("Was am Konto steht, besteht die Regel", regel11b(konto), []);

    /* Holen: am Konto neuer → aufs Gerät, nur der eigene Zweig */
    speicher = aufbauen("uid-2");
    FORTSCHRITT.aendern("uid-2", (s) => FORTSCHRITT.partie(s, { datum: HEUTE }), 100);
    await speicher.teilSchreiben({ "konten/uid-2/fortschritt": { version: 1, spiele: {
        typoluck: { xp: 500, partien: 40, stand: 5000 }, blunderluck: { xp: 80, stand: 7 } } } });
    gleich("Am Konto neuer: geändert", await FORTSCHRITT_ABGLEICH.holen(), true);
    const geraetStand = FORTSCHRITT.laden("uid-2");
    gleich("… Typolucks Zweig vom Konto auf dem Gerät", [geraetStand.spiele.typoluck.xp, geraetStand.spiele.typoluck.stand],
        [500, 5000]);
    pruefe("… Blunderlucks Zweig NICHT aufs Gerät geschrieben", !("blunderluck" in geraetStand.spiele));
    gleich("… aber beim Lesen dabei (Level aus beiden)", FORTSCHRITT.gesamtXp(FORTSCHRITT_ABGLEICH.mitKonto(geraetStand)), 580);

    /* Holen: auf dem Gerät neuer → hinauf */
    speicher = aufbauen("uid-3");
    FORTSCHRITT.aendern("uid-3", (s) => FORTSCHRITT.partie(s, { datum: HEUTE }), 9000);
    await speicher.teilSchreiben({ "konten/uid-3/fortschritt": { version: 1, spiele: {
        typoluck: { xp: 1, stand: 50 }, blunderluck: { xp: 3, stand: 2 } } } });
    await FORTSCHRITT_ABGLEICH.holen();
    konto = kontoKnoten("uid-3");
    gleich("Gerät neuer: am Konto jetzt der Gerätestand", konto.spiele.typoluck.stand, 9000);
    gleich("… Blunderlucks Zweig am Konto unberührt", konto.spiele.blunderluck, { xp: 3, stand: 2 });

    /* Holen: nichts am Konto → hinauf */
    speicher = aufbauen("uid-4");
    FORTSCHRITT.aendern("uid-4", (s) => FORTSCHRITT.partie(s, { datum: HEUTE }), 77);
    await FORTSCHRITT_ABGLEICH.holen();
    gleich("Nichts am Konto: der Gerätestand geht hinauf", kontoKnoten("uid-4").spiele.typoluck.stand, 77);

    /* Gäste, Werkstatt: uid null */
    aufbauen(null, "gast");
    gleich("Ohne Konto: kein Senden", await FORTSCHRITT_ABGLEICH.senden(normal), false);
    gleich("Ohne Konto: kein Holen", await FORTSCHRITT_ABGLEICH.holen(), false);
    gleich("Ohne Konto: nichts geschrieben", global.geraet.getItem(SCHLUESSEL), null);
    gleich("Ohne Konto: Lesen unverändert", FORTSCHRITT_ABGLEICH.mitKonto(normal), normal);

    /* Ablehnung und werfender uidGeber: still */
    aufbauen("uid-5");
    FORTSCHRITT_ABGLEICH.einrichten(ablehnend, () => "uid-5", () => "uid-5");
    let geworfen = false;
    try {
        gleich("Abgelehnt: Senden false", await FORTSCHRITT_ABGLEICH.senden(normal), false);
        gleich("Abgelehnt: Holen false", await FORTSCHRITT_ABGLEICH.holen(), false);
    } catch (fehler) {
        geworfen = true;
    }
    pruefe("Abgelehnt: keine Ausnahme nach aussen", !geworfen);
    FORTSCHRITT_ABGLEICH.einrichten(new SpeicherLokal(SCHLUESSEL), () => { throw new Error("kaputt"); }, () => "x");
    gleich("Werfender uidGeber: kein Senden", await FORTSCHRITT_ABGLEICH.senden(normal), false);
})());

fazit();
