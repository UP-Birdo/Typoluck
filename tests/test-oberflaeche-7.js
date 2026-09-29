/*
 * test-oberflaeche-7.js — 0.25.0, gemeinsame Runde 7 „Oberfläche" (wie
 * Blunderluck v0.156.0, berichtigt durch Design\3D-Schrift\final\
 * EINBAU-2026-09-29.md: Leisten-Tabs sind SEITEN, Blätter nur für Bereiche
 * ohne Leisten-Knopf).
 *
 * Geprüft gegen ein kleines nachgebautes DOM (kein Browser, keine Datenbank):
 *   1. js\navigation.js + js\upcrew-blatt.js — Profil als Blatt, Einstellungen
 *      und Verwaltung stapeln sich darüber, schon Gestapeltes schliesst nur
 *      die darüber, ein Seitenwechsel schliesst alle, die Seite dahinter steht
 *      still (html.up-bl-offen), die Zurück-Taste schliesst zuerst das
 *      oberste Blatt, das Kreuz nimmt den eigenen Verlaufseintrag zurück.
 *   2. Die Typoluck-Abzeichen: Liste im gemeinsamen Baustein, Rechnung im
 *      Modell (FORTSCHRITT.tlAbzeichenFelder), Zähler nur höher.
 *   3. SPIELER.abzeichenSetzen — höchstens drei, keine doppelt, nur der
 *      eigene Eintrag.
 *   4. Serien-Kapsel und Karte: seit 0.26.0 ohne Schild und ohne Kauf
 *      (alte Werte stürzen nicht ab).
 *   5. Einstellungen im gemeinsamen Aufbau: feste Reihenfolge, „Nur in
 *      Typoluck".
 *   6. Einbindung: index.html, sw.js (offline), Kopien byte-gleich mit
 *      final, wo final erreichbar ist.
 */

const fs = require("fs");
const pfad = require("path");
const vm = require("vm");
const { pruefe, gleich, fazit } = require("./pruefer.js");

const wurzel = pfad.join(__dirname, "..");
const lesen = (name) => fs.readFileSync(pfad.join(wurzel, name), "utf8");

/* ------------------------------------------------------------------ *
 * Ein kleines DOM (nach dem Vorbild Blunderluck tests\test-oberflaeche-7.js)
 * ------------------------------------------------------------------ */

function neuesElement(tag) {
    const el = {
        tagName: String(tag).toUpperCase(),
        nodeType: 1,
        kinder: [],
        parentNode: null,
        attribute: {},
        dataset: {},
        hidden: false,
        scrollTop: 0,
        _text: "",
        _hoerer: {},
        style: { setProperty(n, w) { this[n] = w; } },
        get className() { return this.attribute["class"] || ""; },
        set className(w) { this.attribute["class"] = String(w); },
        get textContent() { return this._text + this.kinder.map((k) => k.textContent).join(""); },
        set textContent(w) { this.kinder = []; this._text = String(w); },
        set innerHTML(w) { this.kinder.forEach((k) => { k.parentNode = null; }); this.kinder = []; this._text = ""; },
        get innerHTML() { return ""; },
        get firstChild() { return this.kinder[0] || null; },
        appendChild(k) {
            if (k.parentNode) {
                k.parentNode.removeChild(k);
            }
            this.kinder.push(k);
            k.parentNode = this;
            return k;
        },
        insertBefore(k, vor) {
            if (k.parentNode) {
                k.parentNode.removeChild(k);
            }
            const i = this.kinder.indexOf(vor);
            if (i === -1) {
                this.kinder.push(k);
            } else {
                this.kinder.splice(i, 0, k);
            }
            k.parentNode = this;
            return k;
        },
        removeChild(k) {
            this.kinder = this.kinder.filter((x) => x !== k);
            k.parentNode = null;
            return k;
        },
        remove() {
            if (this.parentNode) {
                this.parentNode.removeChild(this);
            }
        },
        setAttribute(n, w) { this.attribute[n] = String(w); },
        getAttribute(n) { return (n in this.attribute) ? this.attribute[n] : null; },
        removeAttribute(n) { delete this.attribute[n]; },
        addEventListener(art, f) { (this._hoerer[art] = this._hoerer[art] || []).push(f); },
        removeEventListener() { },
        ausloesen(art, ereignis) {
            const e = Object.assign({ preventDefault() { }, stopPropagation() { }, target: this }, ereignis || {});
            for (const f of (this._hoerer[art] || [])) {
                f(e);
            }
        },
        querySelector(wahl) { return this.querySelectorAll(wahl)[0] || null; },
        querySelectorAll(wahl) {
            const treffer = [];
            const klassen = (wahl.match(/\.[a-zA-Z0-9_-]+/g) || []).map((k) => k.slice(1));
            const suchen = (e) => {
                for (const k of e.kinder) {
                    if (klassen.length && klassen.every((x) => k.classList && k.classList.contains(x))) {
                        treffer.push(k);
                    }
                    suchen(k);
                }
            };
            suchen(this);
            return treffer;
        }
    };
    el.classList = {
        add(...n) { const l = el.className.split(" ").filter(Boolean); for (const x of n) { if (l.indexOf(x) === -1) { l.push(x); } } el.className = l.join(" "); },
        remove(...n) { el.className = el.className.split(" ").filter((x) => x && n.indexOf(x) === -1).join(" "); },
        toggle(n, an) { const soll = (an === undefined) ? !this.contains(n) : !!an; if (soll) { this.add(n); } else { this.remove(n); } return soll; },
        contains(n) { return el.className.split(" ").indexOf(n) !== -1; }
    };
    return el;
}

function neueWelt() {
    const koerper = neuesElement("body");
    const wurzelEl = neuesElement("html");
    const verlauf = { eintraege: [{ id: "start" }], stelle: 0, zurueck: 0 };
    const hoerer = {};
    const umgebung = {
        console, setTimeout, clearTimeout,
        document: {
            body: koerper,
            documentElement: wurzelEl,
            createElement: neuesElement,
            createElementNS: (ns, t) => neuesElement(t),
            createTextNode: (t) => { const k = neuesElement("#text"); k.nodeType = 3; k._text = String(t); return k; },
            addEventListener() { },
            querySelector: () => null,
            querySelectorAll: (w) => koerper.querySelectorAll(w)
        },
        history: {
            get state() { return verlauf.eintraege[verlauf.stelle]; },
            get length() { return verlauf.stelle + 1; },
            pushState(z) { verlauf.eintraege = verlauf.eintraege.slice(0, verlauf.stelle + 1).concat([z]); verlauf.stelle++; },
            replaceState(z) { verlauf.eintraege[verlauf.stelle] = z; },
            back() { verlauf.zurueck++; }
        },
        scrollY: 0,
        scrollTo(a, b) { umgebung.scrollY = (typeof a === "object") ? a.top : b; },
        addEventListener(art, f) { hoerer[art] = f; },
        _verlauf: verlauf,
        /* Die Zurück-Taste des Handys: eine Stelle zurück, popstate. */
        _zurueckTaste() {
            verlauf.stelle = Math.max(0, verlauf.stelle - 1);
            hoerer.popstate({ state: verlauf.eintraege[verlauf.stelle] });
        },
        /* Ein history.back() aus dem Code kommt später als popstate an. */
        _zurueckAnkommen() {
            while (verlauf.zurueck > 0) {
                verlauf.zurueck--;
                verlauf.stelle = Math.max(0, verlauf.stelle - 1);
                hoerer.popstate({ state: verlauf.eintraege[verlauf.stelle] });
            }
        }
    };
    umgebung.window = umgebung;
    umgebung.globalThis = umgebung;
    vm.createContext(umgebung);
    return umgebung;
}

/* ------------------------------------------------------------------ *
 * 1. Navigation mit Blättern
 * ------------------------------------------------------------------ */

function navWelt() {
    const w = neueWelt();
    vm.runInContext(lesen("js/upcrew-blatt.js") + "\n;" + lesen("js/navigation.js")
        + "\n;globalThis.NAVIGATION = NAVIGATION;", w, { filename: "navigation.js" });
    const N = w.NAVIGATION;
    w.gebaut = [];
    const bildschirm = (id, alsBlatt) => N.anmelden({ id: id, titel: id, alsBlatt: alsBlatt,
        zeigen: (behaelter) => {
            w.gebaut.push(id + (N.imBlatt(behaelter) ? "@blatt" : "@seite"));
            behaelter.appendChild(neuesElement("p"));
        } });
    for (const id of ["start", "shop", "sammlung", "herausforderungen", "rangliste"]) {
        bildschirm(id, false);
    }
    for (const id of ["profil", "einstellungen", "verwaltung", "freunde"]) {
        bildschirm(id, true);
    }
    const inhalt = neuesElement("main");
    const ebenen = neuesElement("div");
    N.starten(inhalt, "start", null, ebenen);
    return { w, N, inhalt, ebenen, B: w.UPCREW_BLATT };
}

{
    const { w, N, inhalt, ebenen, B } = navWelt();
    gleich("Start ist eine Seite", [N.aktuell, w.gebaut], ["start", ["start@seite"]]);

    w.scrollY = 300;
    N.zeigen("profil", null);
    gleich("Profil öffnet als Blatt über dem Start, die Seite bleibt", [N.aktuell, B.anzahl(), w.gebaut.slice(-1)[0]],
        ["start", 1, "profil@blatt"]);
    pruefe("Die Seite rückt dahinter", inhalt.classList.contains("up-bl-dahinter"));
    pruefe("Die Seite steht still (html + body up-bl-offen)",
        w.document.documentElement.classList.contains("up-bl-offen") && w.document.body.classList.contains("up-bl-offen"));
    gleich("Beim ersten Blatt rollt die Seite nach oben (Kopf in der Lücke)", w.scrollY, 0);
    gleich("Das Blatt liegt im Halter", ebenen.kinder.length, 1);

    N.zeigen("einstellungen", null);
    N.zeigen("verwaltung", null);
    gleich("Einstellungen und Verwaltung stapeln sich", B.anzahl(), 3);
    N.zeigen("einstellungen", null);
    gleich("Schon im Stapel: nur die darüber gehen zu (Verwaltung beenden)", B.anzahl(), 2);
    B.verlaufAbgleichen();   // sonst erst nach dem laufenden Zug (setTimeout 0)
    w._zurueckAnkommen();
    gleich("… und ihr Verlaufseintrag wird still zurückgenommen", [N.aktuell, B.anzahl()], ["start", 2]);

    w._zurueckTaste();
    gleich("Zurück-Taste: das oberste Blatt geht zu, die Seite bleibt", [N.aktuell, B.anzahl()], ["start", 1]);

    N.auffrischen();
    gleich("Auffrischen baut Seite und Blatt neu", w.gebaut.slice(-2), ["start@seite", "profil@blatt"]);

    N.zeigen("rangliste", null);
    gleich("Ein Seitenwechsel schliesst alle Blätter", [N.aktuell, B.anzahl(), ebenen.kinder.length], ["rangliste", 0, 0]);
    pruefe("… und gibt die Seite wieder frei",
        !w.document.documentElement.classList.contains("up-bl-offen") && !inhalt.classList.contains("up-bl-dahinter"));

    N.zeigen("freunde", null);
    const eintrag = B.oben();
    eintrag.schliessen();
    B.verlaufAbgleichen();
    const zurueckVorher = w._verlauf.zurueck;
    gleich("Schliessen per Kreuz nimmt den eigenen Verlaufseintrag zurück", [B.anzahl(), zurueckVorher], [0, 1]);
    w._zurueckAnkommen();
    gleich("… das popstate dazu wird überhört (die Seite bleibt)", N.aktuell, "rangliste");
    gleich("Die Seite wurde nicht neu gewechselt", w.gebaut.filter((g) => g === "rangliste@seite").length, 1);

    N.zeigen("profil", null, true);
    gleich("Mit ersetzen (Werkstatt): Blatt ohne Verlaufseintrag", B.anzahl(), 1);

    /* Seit 0.26.0: auch Karten (Level-Pfad, Vorschau, Serie, Abzeichen-Wahl) legen einen Eintrag an. */
    const stelleVorher = w._verlauf.stelle;
    B.oeffnen({ art: "karte", titel: "Serie" });
    gleich("Eine Karte legt einen Verlaufseintrag an", w._verlauf.stelle, stelleVorher + 1);
    w._zurueckTaste();
    gleich("Zurück-Taste schliesst die Karte, Blatt und Seite bleiben", [N.aktuell, B.anzahl()], ["rangliste", 1]);
}

/* Ohne Baustein (oder ohne Halter): wie früher eine Seite mit Kopfzeile. */
{
    const w = neueWelt();
    vm.runInContext(lesen("js/navigation.js") + "\n;globalThis.NAVIGATION = NAVIGATION;", w);
    const N = w.NAVIGATION;
    const gebaut = [];
    N.anmelden({ id: "start", titel: "Start", zeigen: () => gebaut.push("start") });
    N.anmelden({ id: "profil", titel: "Profil", alsBlatt: true, zeigen: (b) => gebaut.push(N.imBlatt(b) ? "blatt" : "seite") });
    N.starten(neuesElement("main"), "start", null, null);
    N.zeigen("profil", null);
    gleich("Ohne Blatt-Baustein: Profil als Seite", [N.aktuell, gebaut], ["profil", ["start", "seite"]]);
}

/* Die Leiste: Shop · Sammlung · Start · Aufgaben · Rangliste. */
{
    const { N } = navWelt();
    gleich("Leisten-Reihenfolge seit 0.25.0", N.LEISTE.map((e) => e.id),
        ["shop", "sammlung", "start", "herausforderungen", "rangliste"]);
    pruefe("Kein Blatt in der Leiste", N.LEISTE.every((e) => !N._bildschirme[e.id].alsBlatt));
}

/* ------------------------------------------------------------------ *
 * 2. Typoluck-Abzeichen
 * ------------------------------------------------------------------ */

const FORTSCHRITT = require("../js/fortschritt.js");
const A = require("../js/upcrew-abzeichen.js");
global.UPCREW_ABZEICHEN = A;
const SPIELE = require("../js/upcrew-abzeichen-spiele.js");

{
    const liste = SPIELE.typoluck.abzeichen;
    gleich("Fünf Typoluck-Abzeichen (seit 0.26.0 ohne „Schwer-Profi“)", liste.length, 5);
    pruefe("Kennung tl-…, Zähler nur Buchstaben, einmalig",
        liste.every((e) => /^tl-[a-z-]+$/.test(e.kennung) && /^[a-zA-Z]{1,32}$/.test(e.feld)
            && e.weiter === 0 && e.stufen.length === 1));
    gleich("Jedes Feld der Liste hat eine Regel im Modell, und umgekehrt",
        liste.map((e) => e.feld).sort(), Object.keys(FORTSCHRITT.TL_ABZEICHEN).sort());
    gleich("Blunderlucks Liste bleibt, wie sie aus final kam", SPIELE.blunderluck.abzeichen.length, 14);

    const leer = FORTSCHRITT.leer();
    gleich("Nichts verdient: keine Felder", FORTSCHRITT.tlAbzeichenFelder(leer, { erreicht: 1, alle: 6 }), {});

    let stand = FORTSCHRITT.normalisieren(leer);
    stand.spiele.typoluck = FORTSCHRITT.zweigLeer();
    stand.spiele.typoluck.taten = ["zweiter-versuch", "koennen-90"];
    stand.spiele.typoluck.zaehler.koennenBeste = 100;
    gleich("Taten, 100 % und das erste Buch",
        FORTSCHRITT.tlAbzeichenFelder(stand, { erreicht: 2, alle: 6 }),
        { azZweiVersuche: 1, azKoennen: 1, azPerfekt: 1, azErstesBuch: 1 });
    gleich("Seit 0.26.0 kein „Schwer-Profi“ mehr (fünf Typoluck-Abzeichen)",
        [liste.length, liste.some((e) => e.kennung === "tl-schwer"), "azSchwer" in FORTSCHRITT.TL_ABZEICHEN],
        [5, false, false]);
    gleich("Alle Bücher: Bücherwurm",
        FORTSCHRITT.tlAbzeichenFelder(stand, { erreicht: 7, alle: 6 }).azBuecherwurm, 1);

    const r = FORTSCHRITT.zaehlerHeben(stand, { azKoennen: 1, azPerfekt: 1 });
    gleich("zaehlerHeben: zwei neu", r.neu, 2);
    gleich("… stehen im eigenen Zweig", [r.stand.spiele.typoluck.zaehler.azKoennen, r.stand.spiele.typoluck.zaehler.azPerfekt], [1, 1]);
    gleich("Nochmal: nichts neu (nur höher)", FORTSCHRITT.zaehlerHeben(r.stand, { azKoennen: 1 }).neu, 0);
    const tiefer = FORTSCHRITT.zaehlerHeben(r.stand, { azKoennen: 0 });
    gleich("Nie tiefer", [tiefer.neu, tiefer.stand.spiele.typoluck.zaehler.azKoennen], [0, 1]);
    gleich("Falsche Namen bleiben draussen", FORTSCHRITT.zaehlerHeben(r.stand, { "az-x": 1, "a b": 1 }).neu, 0);
    const mitBl = FORTSCHRITT.normalisieren(r.stand);
    mitBl.spiele.blunderluck = { zaehler: { azErsterSieg: 1 } };
    gleich("Fremde Zweige wandern unverändert durch",
        FORTSCHRITT.zaehlerHeben(mitBl, { azErstesBuch: 1 }).stand.spiele.blunderluck, { zaehler: { azErsterSieg: 1 } });
    pruefe("Die Zähler gehen ans Konto (fuerKonto lässt az… durch)",
        FORTSCHRITT.fuerKonto(r.stand).spiele.typoluck.zaehler.azKoennen === 1);

    const alle = A.alle(r.stand, 0);
    const tl = alle.filter((e) => e.spiel === "typoluck");
    gleich("Im gemeinsamen Baustein: verdient wird aus dem Zähler",
        tl.filter((e) => e.erreicht > 0).map((e) => e.kennung).sort(), ["tl-koennen", "tl-perfekt"]);
    gleich("Marke TL", tl[0].marke, "TL");
    gleich("Ausrüsten: nur verdiente, höchstens drei",
        A.ausgeruestet(alle, ["tl-schwer", "tl-koennen", "tl-zwei-versuche", "tl-perfekt", "tl-koennen"], 3)
            .map((e) => e.kennung),
        ["tl-koennen", "tl-perfekt"]);
}

/* ------------------------------------------------------------------ *
 * 3. SPIELER.abzeichenSetzen
 * ------------------------------------------------------------------ */

{
    const SPIELER = require("../js/spieler.js");
    const daten = SPIELER.leereDaten(1);
    daten.spieler.push(Object.assign(SPIELER.neuerSpieler("A", "a"), { fremd: 1 }), SPIELER.neuerSpieler("B", "b"));
    const neu = SPIELER.abzeichenSetzen(daten, "a", ["tl-schwer", "up-partien", "tl-schwer", "bl-veteran", "tl-perfekt", ""], 5);
    gleich("Höchstens drei, keine doppelt, keine leeren", neu.spieler[0].abzeichen, ["tl-schwer", "up-partien", "bl-veteran"]);
    gleich("Nur der eigene Eintrag", neu.spieler[1].abzeichen, []);
    gleich("Fremde Felder wandern durch, Stand gestempelt", [neu.spieler[0].fremd, neu.geaendertAm], [1, 5]);
    gleich("Das Original bleibt", daten.spieler[0].abzeichen, []);
}

/* ------------------------------------------------------------------ *
 * 4. Serie, 5. Einstellungen (Bausteine im kleinen DOM)
 * ------------------------------------------------------------------ */

{
    const w = neueWelt();
    vm.runInContext(lesen("js/upcrew-serie.js") + "\n;" + lesen("js/upcrew-einstellungen.js"), w);
    const ort = neuesElement("div");
    let kaufGerufen = false;
    w.UPCREW_SERIE.karteFuellen(ort, { serie: 3, schild: 2, schildMax: 2, schutz: 1, schutzAlle: 1 },
        { beiKauf: () => { kaufGerufen = true; } });
    pruefe("Serien-Karte: alte Schild-Werte stürzen nicht ab, kein Schild, kein Kauf (seit 0.26.0)",
        !/Schild|Schutz/.test(ort.textContent || "") && !kaufGerufen);

    const es = neuesElement("div");
    const reihe = w.UPCREW_EINSTELLUNGEN.bauen(es, "einstellungen", [
        { art: "gefahr", zeilen: [{ titel: "x", gefahr: true, beiKlick() { } }] },
        { art: "spiel", zeilen: [{ titel: "Beispiel" }] },
        { art: "konto", zeilen: [{ titel: "Name" }] },
        { art: "admin", zeilen: [] }
    ], { spiel: "Typoluck" });
    gleich("Feste Reihenfolge, leere Abschnitte fallen weg", reihe, ["konto", "spiel", "gefahr"]);
    gleich("„Nur in Typoluck“", es.kinder[1].kinder[0].textContent, "Nur in Typoluck");
}

/* Seit 0.26.0: die Status-Lampe der Einstellungen aus dem echten Zustand
   (EINSTELLUNGEN_BILDSCHIRM.lampeZustand, rein). */
{
    const E = vm.runInNewContext(lesen("js/bildschirm-einstellungen.js") + "\n;EINSTELLUNGEN_BILDSCHIRM", {});
    const z = (lage) => E.lampeZustand(lage);
    gleich("Lampe: alles ruhig = grün", z({ online: true, status: "bereit", fortschritt: "gespeichert", ausstehend: 0 }),
        "gespeichert");
    gleich("Lampe: noch nie gesendet = grün", z({ online: true, status: "", fortschritt: "", ausstehend: 0 }), "gespeichert");
    gleich("Lampe: schreibt / lädt / Fortschritt unterwegs / Ergebnis wartet = gelb",
        [z({ status: "schreibt" }), z({ status: "laedt" }), z({ fortschritt: "wartet" }), z({ ausstehend: 2 })],
        ["wartet", "wartet", "wartet", "wartet"]);
    gleich("Lampe: offline / Fehler = rot",
        [z({ online: false }), z({ status: "fehler" }), z({ fortschritt: "fehler", ausstehend: 1 })],
        ["offline", "offline", "offline"]);
}

/* ------------------------------------------------------------------ *
 * 6. Einbindung
 * ------------------------------------------------------------------ */

{
    const index = lesen("index.html");
    const sw = lesen("sw.js");
    const neu = ["js/upcrew-blatt.js", "js/upcrew-serie.js", "js/upcrew-profil.js", "js/upcrew-einstellungen.js",
        "js/upcrew-abzeichen-spiele.js", "css/upcrew-blatt.css", "css/upcrew-serie.css", "css/upcrew-profil.css",
        "css/upcrew-einstellungen.css", "css/stil-blatt.css",
        /* seit 0.26.0 (Einbau-Notiz 29.09.2026 b) */
        "js/upcrew-levelpfad.js", "css/upcrew-levelpfad.css"];
    for (const datei of neu) {
        pruefe("Geladen und offline: " + datei, index.indexOf("\"" + datei + "\"") !== -1 && sw.indexOf("\"./" + datei + "\"") !== -1);
    }
    pruefe("Serie nach der Flamme, Abzeichen-Daten nach dem Abzeichen-Baustein, alles vor den Bildschirmen",
        index.indexOf("js/upcrew-flamme.js") < index.indexOf("js/upcrew-serie.js")
            && index.indexOf("js/upcrew-abzeichen.js") < index.indexOf("js/upcrew-abzeichen-spiele.js")
            && index.indexOf("js/upcrew-einstellungen.js") < index.indexOf("js/navigation.js"));
    pruefe("scrollbar-gutter gegen den Seitwärts-Ruck", /html \{\s*scrollbar-gutter: stable;/.test(lesen("css/stil-blatt.css")));
    pruefe("Die Blätter liegen unter der Leiste (--up-bl-ebene < --ebene-leiste)",
        Number((lesen("css/stil-blatt.css").match(/--up-bl-ebene: (\d+);/) || [])[1])
            < Number((lesen("css/stil.css").match(/--ebene-leiste: (\d+);/) || [])[1]));
    pruefe("Nach jeder Runde werden verdiente Abzeichen gebucht",
        /APP\.abzeichenBuchen\(\) > 0/.test(lesen("js/app.js")));

    /* Byte-gleich mit final, wo final erreichbar ist (auf anderen Rechnern
       fehlt der Ordner — dann nichts zu prüfen). upcrew-abzeichen-spiele.js
       trägt die Typoluck-Liste (Vorschlag an final) und ist ausgenommen. */
    const FINAL = pfad.join(wurzel, "..", "..", "Design", "3D-Schrift", "final");
    if (fs.existsSync(FINAL)) {
        for (const datei of neu.filter((d) => /upcrew-/.test(d) && !/abzeichen-spiele/.test(d))
            .concat(["js/upcrew-abzeichen.js", "css/upcrew-abzeichen.css", "js/upcrew-sammlung.js", "css/upcrew-sammlung.css",
                /* seit 0.26.0 geändert in final */
                "js/upcrew-flamme.js", "css/upcrew-flamme.css", "js/upcrew-muenzen.js", "js/upcrew-shop.js",
                "js/upcrew-aussehen.js"])) {
            const quelle = pfad.join(FINAL, pfad.basename(datei));
            pruefe("Byte-gleich mit final: " + datei,
                fs.existsSync(quelle) && fs.readFileSync(quelle).equals(fs.readFileSync(pfad.join(wurzel, datei))));
        }
    }
}

fazit();
