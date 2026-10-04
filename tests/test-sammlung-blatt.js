/*
 * test-sammlung-blatt.js — die Sammlung „Variante A" (seit 0.30.0, UPCrew-
 * Runde 8; Nutzer 03.10.2026: Kategorie-Kacheln, ein Tipp öffnet ein Blatt,
 * nichts rollt mehr waagrecht).
 *
 * Hier läuft der ECHTE Bildschirm js\bildschirm-sammlung.js mit den ECHTEN
 * Bausteinen (upcrew-anpassen, -sammlung, -katalog, -platz, -blatt,
 * -abzeichen, -aussehen, -farbwelten, -intro) und den echten Modellen
 * (js\sammlung.js, js\kachelsets.js) an einem kleinen DOM
 * (tests\kleines-dom.js). Nur App, Fortschritt, Dialog und Gerätespeicher
 * sind Attrappen.
 *
 *   1. Die Kachel-Sets des Spiels = die Art „kachelset" im Katalog.
 *   2. Die Fläche: Kacheln statt Regal-Reihen, Kachel-Sets als erstes Regal
 *      des Bausteins, Abzeichen und Modi als Kacheln der reinen Sammlung —
 *      und keine Gruppe „Kachel-Sets" mehr im Rest.
 *   3. „NN %" = `tab.zaehlen()` plus die eigenen Abschnitte.
 *   4. Im Blatt: ein freies Kachel-Set lässt sich wählen und übernehmen
 *      (ohne Rückfrage), ein gesperrtes nur ansehen.
 *   5. Mit Shop (seit 0.31.0): gesperrte, kaufbare Stücke tragen „im Shop";
 *      kein Level in der Oberfläche. Gekauftes (js\besitz.js, je Person)
 *      ist frei und lässt sich übernehmen.
 *   6. Die Vorschau zeigt das Kachel-Set des Entwurfs.
 *   7. Einbindung und Stil: nichts rollt waagrecht.
 *
 * Wie es aussieht und ob am Gerät wirklich nichts waagrecht rollt, zeigt
 * nur der Browser (ansicht\0.30.0, Messung in STATUS.md).
 */

const fs = require("fs");
const pfad = require("path");
const vm = require("vm");
const { pruefe, gleich, fazit, speicherAttrappe } = require("./pruefer.js");
const { dokumentBauen } = require("./kleines-dom.js");

const wurzel = pfad.join(__dirname, "..");
const lesen = (name) => fs.readFileSync(pfad.join(wurzel, name), "utf8");

/* In der Reihenfolge aus index.html (soweit die Sammlung sie braucht). */
const DATEIEN = ["js/upcrew-intro.js", "js/upcrew-farbwelten.js", "js/upcrew-aussehen.js", "js/kachelsets.js",
    "js/upcrew-katalog.js", "js/upcrew-besitz.js", "js/upcrew-platz.js", "js/upcrew-anpassen.js", "js/upcrew-abzeichen.js",
    "js/upcrew-abzeichen-spiele.js", "js/upcrew-sammlung.js", "js/upcrew-blatt.js", "js/sammlung.js",
    "js/bildschirm-sammlung.js", "js/besitz.js"];

/* Die Person, als die die Welt läuft (Eintrag in `upcrew.besitz`). */
const ICH_ID = "ich";

/*
 * Eine Welt: Dokument, Gerätespeicher und die Attrappen der App.
 *   level     das Level (Vorgabe 0)
 *   taten     erfüllte Taten (Vorgabe keine)
 *   alleFrei  Werkstatt: alles frei
 *   gewaehlt  das Kachel-Set, das das Gerät trägt (Vorgabe Papier)
 *   besitz    was im Gerätespeicher unter `upcrew.besitz` steht (je Person
 *             eine Menge; die Welt läuft als „ich") — Vorgabe nichts
 */
function welt(wahl) {
    const o = wahl || {};
    const dokument = dokumentBauen();
    const einstellungen = o.gewaehlt ? { kachelset: o.gewaehlt } : {};
    const s = { dokument, hinweise: [], fragen: [], einstellungen };
    const umgebung = {
        console, setTimeout, clearTimeout,
        document: dokument,
        localStorage: speicherAttrappe(),
        matchMedia: () => ({ matches: true, addEventListener() { } }),
        history: { state: null, length: 1, pushState() { }, replaceState() { }, back() { } },
        addEventListener() { },
        removeEventListener() { },
        scrollTo() { },
        scrollY: 0,
        innerHeight: 640,
        ICH: {
            einstellung: (name, vorgabe) => (name in einstellungen ? einstellungen[name] : vorgabe),
            einstellungSetzen: (name, wert) => { einstellungen[name] = wert; }
        },
        APP: { level: () => ({ level: o.level || 0 }), fortschritt: () => ({ spiele: {} }), jetzt: () => new Date(2026, 9, 4) },
        WORDLE: { datumText: () => "2026-10-04" },
        NAVIGATION: { anmelden() { }, imBand: () => true, auffrischen() { s.aufgefrischt = (s.aufgefrischt || 0) + 1; } },
        BAUSTEINE: {
            el(tag, klasse, text) {
                const el = dokument.createElement(tag);
                if (klasse) {
                    el.className = klasse;
                }
                if (text !== undefined && text !== null) {
                    el.textContent = String(text);
                }
                return el;
            }
        },
        DIALOG: {
            hinweis: (...was) => { s.hinweise.push(was); },
            frage: (...was) => { s.fragen.push(was); return Promise.resolve(false); }
        }
    };
    if (o.alleFrei) {
        umgebung.WERKSTATT = { aktiv: () => true, _parameter: () => new Set() };
    }
    umgebung.window = umgebung;
    vm.createContext(umgebung);
    for (const datei of DATEIEN) {
        vm.runInContext(lesen(datei), umgebung, { filename: datei });
    }
    /* Der Fortschritt als Attrappe — die Abzeichen aus dem echten Baustein (leerer Stand: keins erreicht). */
    if (o.besitz) {
        umgebung.localStorage.setItem("upcrew.besitz", JSON.stringify(o.besitz));
    }
    vm.runInContext("globalThis.FORTSCHRITT = { APP: 'typoluck', GAST: 'gast', _speicher: () => localStorage,"
        + " erfuellteTaten: () => " + JSON.stringify(o.taten || [])
        + ", abzeichen: () => UPCREW_ABZEICHEN.liste({ spiele: {} }, 0) };"
        + "globalThis.SAMMLUNG_BILDSCHIRM = SAMMLUNG_BILDSCHIRM; globalThis.SAMMLUNG = SAMMLUNG;"
        + "globalThis.KACHELSETS = KACHELSETS; globalThis.BESITZ = BESITZ;"
        + "BESITZ.einrichten(null, null, () => " + JSON.stringify(ICH_ID) + ");", umgebung);

    /* Das Gerüst aus index.html: der Ort einer Seite, daneben der Halter der Blätter. */
    s.ort = dokument.createElement("div");
    s.ort.className = "inhalt";
    s.ebenen = dokument.createElement("div");
    dokument.body.appendChild(s.ort);
    dokument.body.appendChild(s.ebenen);
    umgebung.UPCREW_BLATT.einrichten({ ebenen: s.ebenen, haupt: s.ort, verlauf: false, horchen: false });

    s.umgebung = umgebung;
    s.S = umgebung.SAMMLUNG_BILDSCHIRM;
    s.K = umgebung.UPCREW_KATALOG;
    s.KACHELSETS = umgebung.KACHELSETS;
    s.SAMMLUNG = umgebung.SAMMLUNG;
    s.zeigen = () => {
        s.S.zeigen(s.ort);
        s.tab = s.S._tab;
        return s;
    };
    s.text = (el) => (el ? el.textContent.replace(/\s+/g, " ").trim() : null);
    /* Die Stück-Knöpfe der Kachel-Sets — wo immer sie gerade stehen. */
    s.setKnoepfe = (in_) => (in_ || dokument.body).querySelectorAll(".upa-stueck[data-extra=\"kachelset\"]");
    s.setKnopf = (wert) => s.setKnoepfe().find((k) => k.dataset.wert === wert) || null;
    s.blatt = () => s.ebenen.querySelector(".upa-blatt");
    return s;
}

/* ------------------------------------------------------------------ *
 * 1. Kachel-Sets = Katalog
 * ------------------------------------------------------------------ */

{
    const s = welt();
    const art = s.K.art("kachelset");
    gleich("Katalog: die Art „kachelset“ gehört Typoluck, ist anlegbar und heisst als Regal genauso",
        [art.spiel, art.anlegbar, art.regal, art.name], ["typoluck", true, "kachelset", "Kachel-Sets"]);
    gleich("KACHELSETS.SETS[].id = die Werte der Art „kachelset“ im Katalog (gleiche Reihenfolge)",
        s.KACHELSETS.SETS.map((set) => set.id), s.K.stuecke("kachelset").map((stueck) => stueck.wert));
    gleich("… mit denselben Namen",
        s.KACHELSETS.SETS.map((set) => set.name), s.K.stuecke("kachelset").map((stueck) => stueck.name));
    pruefe("… und jedes wirkt (das Spiel kann es anwenden)", s.K.stuecke("kachelset").every((stueck) => stueck.wirkt === true));
    gleich("Das Modell liefert dem Regal genau diese Stücke",
        s.SAMMLUNG.kachelsetStuecke([], false, 0).map((stueck) => stueck.wert), s.K.stuecke("kachelset").map((stueck) => stueck.wert));
    gleich("Der Katalog besteht seine eigene Prüfung", s.K.pruefen(), []);
}

/* ------------------------------------------------------------------ *
 * 2. Die Fläche  +  3. „NN %“
 * ------------------------------------------------------------------ */

{
    const s = welt({ level: 0, taten: ["serie-7"] }).zeigen();
    const ort = s.ort;

    gleich("Keine Regal-Reihen mehr (.upa-reihe), dafür das Kachel-Raster",
        [ort.querySelectorAll(".upa-reihe").length, ort.querySelectorAll(".upa-kat-raster").length], [0, 1]);
    const kategorien = s.tab.kategorien();
    gleich("Erste Kachel: Typolucks Regal „Kachel-Sets“; dann Farbwelt · Schrift · Knöpfe",
        kategorien.slice(0, 4), ["kachelset", "farbwelt", "schrift", "knoepfe"]);
    gleich("Letzte zwei Kacheln: Darstellung · Sets", kategorien.slice(-2), ["darstellung", "sets"]);
    pruefe("Typolucks zweite eigene Art (Einbände) steht als Kachel da, Blunderlucks Arten nicht",
        kategorien.indexOf("einband") !== -1 && kategorien.indexOf("brett2d") === -1 && kategorien.indexOf("figurstil") === -1);
    gleich("Je Kategorie des Bausteins eine Kachel",
        ort.querySelectorAll(".upa-kat-eigen .upa-kat").map((k) => k.dataset.kat), kategorien);
    gleich("Die reine Sammlung als Kacheln: Abzeichen · Modi — keine Gruppe „Kachel-Sets“ mehr",
        ort.querySelectorAll(".up-sm-kat").map((k) => k.dataset.rest), ["abzeichen", "modi"]);
    gleich("… ihre Abschnitte hängen unsichtbar im Rest", [ort.querySelector(".up-sm-rest").classList.contains("up-sm-rest-kacheln"),
        ort.querySelectorAll(".up-sm-rest .up-sm-teil").map((t) => t.dataset.kennung)], [true, ["abzeichen", "modi"]]);
    gleich("Vor dem Tipp steht kein Stück-Knopf im Ort (die stehen im Blatt)", ort.querySelectorAll(".upa-stueck").length, 0);
    gleich("Die Kachel der Kachel-Sets zählt: Papier + Blei (Tat) von 10",
        s.text(ort.querySelector(".upa-kat[data-kat=\"kachelset\"] small")), "2/10");
    gleich("Die Kachel der Modi zählt 2/4", s.text(ort.querySelector(".up-sm-kat[data-rest=\"modi\"] small")), "2/4");
    pruefe("Der Würfel liegt im Balken (wuerfelUnten)", !!ort.querySelector(".upa-aktion .upa-zufall"));

    /* „NN %“ */
    const zahl = s.tab.zaehlen();
    const abschnitte = ort.querySelectorAll(".up-sm-rest .up-sm-teil")
        .map((t) => ({ hat: Number(t.dataset.hat), alle: Number(t.dataset.alle) }));
    const hat = zahl.hat + abschnitte.reduce((n, a) => n + a.hat, 0);
    const alle = zahl.alle + abschnitte.reduce((n, a) => n + a.alle, 0);
    pruefe("tab.zaehlen() zählt die Sammel-Kacheln (mehr als nur die Kachel-Sets)", zahl.alle > 10 && zahl.hat >= 2);
    gleich("Die eigenen Abschnitte: Abzeichen 0 erreicht, Modi 2/4",
        [abschnitte[0].hat, abschnitte[0].alle > 0, abschnitte[1]], [0, true, { hat: 2, alle: 4 }]);
    const anteil = ort.querySelector(".up-sm-anteil");
    gleich("„NN %“ = tab.zaehlen() plus die eigenen Abschnitte",
        [s.text(anteil), anteil.title], [Math.round(hat / alle * 100) + " %", hat + " von " + alle]);
    gleich("… gerechnet im Modell (SAMMLUNG.anteil)", s.SAMMLUNG.anteil(zahl, abschnitte),
        { hat: hat, alle: alle, prozent: Math.round(hat / alle * 100) });

    /* Ein Abschnitt der reinen Sammlung öffnet als Blatt. */
    ort.querySelector(".up-sm-kat[data-rest=\"modi\"]").click();
    gleich("Tipp auf „Modi“: der Abschnitt steht im Blatt, mit seinen vier Stücken",
        [s.umgebung.UPCREW_BLATT.anzahl(), s.ebenen.querySelectorAll(".up-sm-teil .up-sm-stueck").length], [1, 4]);
    s.ebenen.querySelector(".up-sm-stueck").click();
    gleich("… ein Modus zeigt beim Antippen seine Zeile", s.hinweise.slice(-1)[0], ["Tageswort", "Ein Wort am Tag, für alle gleich"]);
    s.umgebung.UPCREW_BLATT.alleSchliessen();
    gleich("Blatt zu: der Abschnitt hängt wieder im Rest",
        ort.querySelectorAll(".up-sm-rest .up-sm-teil").map((t) => t.dataset.kennung), ["abzeichen", "modi"]);
}

/* ------------------------------------------------------------------ *
 * 4. Im Blatt wählen und übernehmen  +  5. ohne Shop  +  6. Vorschau
 * ------------------------------------------------------------------ */

{
    const s = welt({ level: 0, taten: ["serie-7"] }).zeigen();
    const B = s.umgebung.UPCREW_BLATT;

    pruefe("tab.blattOeffnen(\"kachelset\") öffnet das Blatt", s.tab.blattOeffnen("kachelset") === true && B.anzahl() === 1);
    const knoepfe = s.setKnoepfe(s.ebenen);
    gleich("Im Blatt (Halter der Blätter, nicht im Ort): die zehn Sets in der Reihenfolge des Spiels",
        [knoepfe.map((k) => k.dataset.wert), s.setKnoepfe(s.ort).length], [s.KACHELSETS.SETS.map((set) => set.id), 0]);
    gleich("Frei sind Papier (Grund-Set) und Blei (Tat erfüllt), die übrigen gesperrt",
        knoepfe.filter((k) => !k.classList.contains("zu")).map((k) => k.dataset.wert), ["papier", "blei"]);
    gleich("Getragen wird Papier", knoepfe.filter((k) => k.classList.contains("aktiv")).map((k) => k.dataset.wert), ["papier"]);

    /* 5. mit Shop (seit 0.31.0; 0.30.0: „wird erspielt“) */
    const baender = knoepfe.filter((k) => k.classList.contains("zu")).map((k) => s.text(k.querySelector(".upa-band")));
    pruefe("Mit Shop: jedes gesperrte Kachel-Set verweist auf den Shop („im Shop“)",
        baender.length === 8 && baender.every((b) => b === "im Shop"), baender.join(" | "));
    pruefe("Kein Level in der Oberfläche (kein „ab 6“, kein „Lv“, kein Schloss mit Zahl)",
        !/\bab \d|Lv|Level|Stufe \d/.test(s.text(s.blatt())) && s.blatt().querySelectorAll(".upa-schloss").length === 0);

    /* 4a. ein freies Set */
    const uebernehmen = () => s.blatt().querySelector(".upa-uebernehmen");
    gleich("Vorher: nichts zu übernehmen", [uebernehmen().disabled, s.text(uebernehmen())], [true, "Übernommen"]);
    s.setKnopf("blei").click();
    gleich("Tipp auf Blei (frei): gewählt im Entwurf, noch nicht getragen",
        [s.setKnopf("blei").getAttribute("aria-pressed"), s.KACHELSETS.gewaehlt(), uebernehmen().disabled, s.text(uebernehmen())],
        ["true", "papier", false, "Übernehmen"]);

    /* 6. Vorschau */
    const brett = () => s.blatt().querySelector(".upa-vorschau .upa-brett");
    const modus = s.blatt().querySelector(".upa-vorschau").dataset.modus;
    gleich("Die Vorschau im Blatt zeigt die Kachel-Farben von Blei",
        [brett().style.getPropertyValue("--kachel-richtig"), brett().style.getPropertyValue("--kachel-falsch")],
        [s.KACHELSETS.werte("blei", modus)["--kachel-richtig"], s.KACHELSETS.werte("blei", modus)["--kachel-falsch"]]);
    gleich("… auch die klebende Vorschau auf der Seite",
        s.ort.querySelector(".upa-vorschau .upa-brett").style.getPropertyValue("--kachel-richtig"),
        s.KACHELSETS.werte("blei", modus)["--kachel-richtig"]);
    gleich("… samt Muster des Sets auf den Kacheln",
        s.blatt().querySelector(".upa-vorschau .upa-kachel.richtig").style.backgroundImage, s.KACHELSETS.set("blei").muster);
    pruefe("Die Kachel auf der Seite sagt „Probe“", /Probe/.test(s.text(s.ort.querySelector(".upa-kat[data-kat=\"kachelset\"]"))));

    pruefe("Übernehmen lässt sich drücken", uebernehmen().click() === true);
    gleich("Übernommen: das Gerät trägt Blei (KACHELSETS.waehlen), ohne Rückfrage",
        [s.KACHELSETS.gewaehlt(), s.einstellungen.kachelset, s.dokument.documentElement.dataset.kachelset, s.fragen.length],
        ["blei", "blei", "blei", 0]);
    gleich("… die Markierung „getragen“ ist gewandert, der Knopf sagt „Übernommen“",
        [s.setKnoepfe().filter((k) => k.classList.contains("aktiv")).map((k) => k.dataset.wert), uebernehmen().disabled,
            s.text(uebernehmen())], [["blei"], true, "Übernommen"]);
    pruefe("… und die Seite wurde dafür nicht neu gebaut (das Blatt bleibt offen)", !s.aufgefrischt && B.anzahl() === 1);

    /* 4b. ein gesperrtes Set */
    s.setKnopf("leder").click();
    gleich("Tipp auf Leder (gesperrt): Probe ja — in der Vorschau zu sehen",
        [s.setKnopf("leder").getAttribute("aria-pressed"), brett().style.getPropertyValue("--kachel-richtig")],
        ["true", s.KACHELSETS.werte("leder", modus)["--kachel-richtig"]]);
    gleich("… übernehmen nein: der Knopf ist aus und sagt „Nicht im Besitz“",
        [uebernehmen().disabled, s.text(uebernehmen()), uebernehmen().click()], [true, "Nicht im Besitz", false]);
    gleich("… das Gerät trägt weiter Blei", [s.KACHELSETS.gewaehlt(), s.dokument.documentElement.dataset.kachelset], ["blei", "blei"]);
    pruefe("… und über der Vorschau steht der Hinweis „Probe · nicht im Besitz“",
        !s.ort.querySelector(".upa-hinweis").hidden && s.text(s.ort.querySelector(".upa-hinweis-text")) === "Probe · nicht im Besitz");

    s.blatt().querySelector(".upa-zurueck").click();
    gleich("Zurück: der Entwurf ist wieder das Getragene, die Vorschau zeigt Blei",
        [s.setKnopf("blei").getAttribute("aria-pressed"), s.setKnopf("leder").getAttribute("aria-pressed"),
            brett().style.getPropertyValue("--kachel-richtig")],
        ["true", "false", s.KACHELSETS.werte("blei", modus)["--kachel-richtig"]]);

    /* Papier setzt nichts: Es gelten die Kachelfarben der Farbwelt. */
    s.setKnopf("papier").click();
    gleich("Papier in der Probe: keine eigenen Kachel-Farben, kein Muster",
        [brett().style.getPropertyValue("--kachel-richtig"),
            s.blatt().querySelector(".upa-vorschau .upa-kachel.richtig").style.backgroundImage], ["", ""]);

    s.tab.blattSchliessen();
    gleich("Blatt zu: kein Stück-Knopf mehr im Dokument", [B.anzahl(), s.setKnoepfe().length], [0, 0]);

    /* Neu zeichnen (Einrasten des Bandes): Der alte Tab meldet sich ab, ein offenes Blatt geht zu. */
    s.tab.blattOeffnen("schrift");
    const alt = s.tab;
    s.ort.innerHTML = "";
    s.zeigen();
    pruefe("Neu gezeichnet: neuer Tab, das Blatt des alten ist zu", s.tab !== alt && B.anzahl() === 0);
    gleich("… und die Kachel-Sets beginnen mit dem, was das Gerät trägt (Papier ist nur Probe gewesen)",
        s.text(s.ort.querySelector(".upa-kat[data-kat=\"kachelset\"] small")), "2/10");
}

/* Level statt Tat: Kreide ab 3, Sand ab 6 — frei, ohne dass ein Level dasteht. */
{
    const s = welt({ level: 6, gewaehlt: "sand" }).zeigen();
    s.tab.blattOeffnen("kachelset");
    gleich("Level 6: frei sind Papier, Kreide, Sand; getragen wird Sand",
        [s.setKnoepfe().filter((k) => !k.classList.contains("zu")).map((k) => k.dataset.wert),
            s.setKnoepfe().filter((k) => k.classList.contains("aktiv")).map((k) => k.dataset.wert)],
        [["papier", "kreide", "sand"], ["sand"]]);
    s.tab.blattOeffnen("schrift");
    const schriften = s.ebenen.querySelectorAll(".upa-stueck[data-art=\"schrift\"]");
    gleich("Eine Katalog-Art im Blatt (Schrift): sechs Stücke, frei nach der Stufen-Tabelle des Bausteins",
        [schriften.length, schriften.filter((k) => !k.classList.contains("zu")).map((k) => k.dataset.wert).sort()],
        [6, Object.keys(s.umgebung.UPCREW_ANPASSEN.STUFEN.schrift)
            .filter((w) => s.umgebung.UPCREW_ANPASSEN.STUFEN.schrift[w] <= 6).sort()]);
    const schriftBaender = schriften.filter((k) => k.classList.contains("zu")).map((k) => s.text(k.querySelector(".upa-band")));
    pruefe("… die gesperrten tragen „im Shop“ oder „wird erspielt“, nie ein Level",
        schriftBaender.length > 0 && schriftBaender.every((b) => (b === "im Shop" || b === "wird erspielt") && !/\d/.test(b)),
        schriftBaender.join(" | "));
}

/* ------------------------------------------------------------------ *
 * Gekauftes ist frei (seit 0.31.0): Besitz je Person, neben Tat und Level
 * ------------------------------------------------------------------ */

{
    /* „ich“ hat Neon und eine Schrift gekauft; eine andere Person auf demselben Gerät Glas. */
    const teureSchrift = (() => {
        const s0 = welt();
        const stufen = s0.umgebung.UPCREW_ANPASSEN.STUFEN.schrift;
        return Object.keys(stufen).sort((a, b) => stufen[b] - stufen[a])[0];
    })();
    const s = welt({ level: 0, besitz: { ich: { kachelset: ["neon"], schrift: [teureSchrift] }, anders: { kachelset: ["glas"] },
        gast: { kachelset: ["kupfer"] } } }).zeigen();
    gleich("Gekauft: die Kachel der Kachel-Sets zählt Papier + Neon", s.text(s.ort.querySelector(".upa-kat[data-kat=\"kachelset\"] small")), "2/10");
    s.tab.blattOeffnen("kachelset");
    gleich("… frei sind Papier und das gekaufte Neon — nicht, was eine andere Person oder der Gast gekauft hat",
        s.setKnoepfe().filter((k) => !k.classList.contains("zu")).map((k) => k.dataset.wert), ["papier", "neon"]);
    gleich("… das Modell sagt dasselbe (Tat/Level ODER Besitz)",
        s.SAMMLUNG.kachelsetStuecke([], false, 0, s.S.besitz).filter((st) => st.frei).map((st) => st.wert), ["papier", "neon"]);
    gleich("… ohne Haken wie bisher nur Papier (der heutige Weg ist unverändert)",
        s.SAMMLUNG.kachelsetStuecke([], false, 0).filter((st) => st.frei).map((st) => st.wert), ["papier"]);
    s.setKnopf("neon").click();
    const uebernehmen = s.blatt().querySelector(".upa-uebernehmen");
    gleich("Das gekaufte Set lässt sich wählen und übernehmen",
        [uebernehmen.disabled, uebernehmen.click(), s.KACHELSETS.gewaehlt(), s.dokument.documentElement.dataset.kachelset],
        [false, true, "neon", "neon"]);
    s.tab.blattOeffnen("schrift");
    const schriften = s.ebenen.querySelectorAll(".upa-stueck[data-art=\"schrift\"]");
    pruefe("Eine gekaufte Schrift ist bei Level 0 frei (die teuerste der Stufen-Tabelle)",
        schriften.some((k) => k.dataset.wert === teureSchrift && !k.classList.contains("zu")));
    gleich("Der Haken des Bildschirms fragt die Person von jetzt",
        [s.S.besitz("kachelset", "neon"), s.S.besitz("kachelset", "glas"), s.S.besitz("kachelset", "kupfer")], [true, false, false]);
    gleich("SAMMLUNG.erspielt: der heutige Weg ohne Kauf — Papier ja, Neon nein (nur gekauft), mit Tat ja",
        [s.SAMMLUNG.erspielt("kachelset", "papier", [], false, 0), s.SAMMLUNG.erspielt("kachelset", "neon", [], false, 0),
            s.SAMMLUNG.erspielt("kachelset", "neon", ["koennen-90"], false, 0), s.SAMMLUNG.erspielt("einband", "x", [], true, 99)],
        [true, false, true, false]);
}

/* Werkstatt: alles frei. */
{
    const s = welt({ alleFrei: true }).zeigen();
    gleich("Werkstatt: alle zehn Kachel-Sets frei",
        s.text(s.ort.querySelector(".upa-kat[data-kat=\"kachelset\"] small")), "10/10");
    s.tab.blattOeffnen("kachelset");
    s.setKnopf("glas").click();
    s.blatt().querySelector(".upa-uebernehmen").click();
    gleich("… und jedes lässt sich übernehmen", s.KACHELSETS.gewaehlt(), "glas");
}

/* ------------------------------------------------------------------ *
 * 7. Einbindung und Stil
 * ------------------------------------------------------------------ */

{
    const bildschirm = lesen("js/bildschirm-sammlung.js");
    const ohneKommentar = bildschirm.replace(/\/\*[\s\S]*?\*\//g, "");
    pruefe("Der Aufruf: mit Besitz, ohne `shop: false` (seit 0.31.0), mit dem Regal der Kachel-Sets und der eigenen Vorschau",
        /UPCREW_ANPASSEN\.zeigen\(geruest\.ort, \{[^}]*besitz: SAMMLUNG_BILDSCHIRM\.besitz,[^}]*regale: \[SAMMLUNG_BILDSCHIRM\._kachelsetRegal\(\)\],[^}]*vorschau: SAMMLUNG_BILDSCHIRM\._vorschau/.test(ohneKommentar)
            && !/shop: false/.test(ohneKommentar));
    pruefe("Das Regal: Schlüssel kachelset, Wert vom Gerät, Übernehmen = KACHELSETS.waehlen",
        /schluessel: "kachelset",\s*titel: "Kachel-Sets",\s*wert: KACHELSETS\.gewaehlt\(\),\s*stuecke: SAMMLUNG\.kachelsetStuecke\([\s\S]*?uebernehmen: KACHELSETS\.waehlen/.test(ohneKommentar));
    pruefe("Besitz liefert echt (seit 0.31.0): fragt js\\besitz.js",
        /besitz\(art, wert\) \{\s*return typeof BESITZ !== "undefined" && BESITZ\.hat\(art, wert\);\s*\}/.test(ohneKommentar));
    pruefe("Keine „Anziehen“-Rückfrage mehr, keine Markierung .stueck-aktiv, kein Neuzeichnen nach dem Anziehen",
        !/Anziehen|DIALOG\.frage|stueck-aktiv|NAVIGATION\.auffrischen/.test(ohneKommentar)
            && !/stueck-aktiv/.test(lesen("css/stil-bildschirme.css").replace(/\/\*[\s\S]*?\*\//g, "")));
    pruefe("Kein Level-Text mehr aus dem Bildschirm („ab 6“, „Ab Level“)", !/"ab "|Ab Level/.test(ohneKommentar));
    pruefe("„NN %“ über tab.zaehlen() und die Abschnitte, nicht mehr über die Stufen-Tabelle",
        /SAMMLUNG\.anteil\(SAMMLUNG_BILDSCHIRM\._tab\.zaehlen\(\), abschnitte\)/.test(ohneKommentar)
            && !/UPCREW_ANPASSEN\.STUFEN/.test(ohneKommentar)
            && !/AUSSEHEN_TEILE|_aussehenFrei/.test(lesen("js/sammlung.js")));

    const index = lesen("index.html");
    const skripte = (index.match(/<script src="([^"]+)"/g) || []).map((z) => z.match(/"([^"]+)"/)[1]);
    const stile = (index.match(/<link rel="stylesheet" href="([^"]+)"/g) || []).map((z) => z.match(/href="([^"]+)"/)[1]);
    pruefe("index.html: upcrew-platz.css VOR upcrew-anpassen.css",
        stile.indexOf("css/upcrew-platz.css") !== -1 && stile.indexOf("css/upcrew-platz.css") < stile.indexOf("css/upcrew-anpassen.css"));
    gleich("index.html: upcrew-katalog.js, upcrew-besitz.js (seit 0.31.0), upcrew-platz.js, direkt vor upcrew-anpassen.js",
        skripte.slice(skripte.indexOf("js/upcrew-katalog.js"), skripte.indexOf("js/upcrew-katalog.js") + 4),
        ["js/upcrew-katalog.js", "js/upcrew-besitz.js", "js/upcrew-platz.js", "js/upcrew-anpassen.js"]);
    pruefe("… und vor upcrew-sammlung.js", skripte.indexOf("js/upcrew-platz.js") < skripte.indexOf("js/upcrew-sammlung.js"));
    pruefe("Der Besitz ist dabei (seit 0.31.0): Baustein upcrew-besitz.js und das eigene js/besitz.js vor app.js",
        fs.existsSync(pfad.join(wurzel, "js", "upcrew-besitz.js")) && skripte.indexOf("js/besitz.js") !== -1
            && skripte.indexOf("js/besitz.js") < skripte.indexOf("js/app.js"));
    const sw = lesen("sw.js");
    for (const datei of ["js/upcrew-katalog.js", "js/upcrew-platz.js", "css/upcrew-platz.css", "js/upcrew-besitz.js", "js/besitz.js"]) {
        pruefe("Offline (sw.js): " + datei, sw.indexOf("\"./" + datei + "\"") !== -1);
    }

    /* Nichts rollt waagrecht: In den Bausteinen der Sammlung gibt es keinen waagrechten Rollbereich mehr, und
       im eigenen Stil nur einen — die Kachel-Wahl der Werkstatt, die fest über der Seite liegt, nie in ihr. */
    const ohne = (name) => lesen(name).replace(/\/\*[\s\S]*?\*\//g, "");
    const rolltQuer = /overflow(-x)?:\s*(auto|scroll)/;
    for (const datei of ["css/upcrew-anpassen.css", "css/upcrew-sammlung.css", "css/upcrew-platz.css", "css/upcrew-abzeichen.css",
        "css/upcrew-shop.css"]) {
        pruefe("Kein waagrechter Rollbereich im Baustein: " + datei, !rolltQuer.test(ohne(datei)));
    }
    pruefe("Die Regal-Reihe (.upa-reihe) gibt es im Baustein nicht mehr",
        !/upa-reihe/.test(ohne("css/upcrew-anpassen.css")) && !/upa-reihe/.test(ohne("js/upcrew-anpassen.js")));
    const eigene = ["css/stil.css", "css/stil-bildschirme.css", "css/stil-wordle.css", "css/stil-bibliothek.css", "css/stil-blatt.css"];
    const regeln = eigene.map(ohne).join("\n").match(/[^{}]+\{[^{}]*overflow(-x)?:\s*(auto|scroll)[^{}]*\}/g) || [];
    gleich("Im eigenen Stil rollt nur die Kachel-Wahl der Werkstatt waagrecht (fest über der Seite)",
        regeln.map((r) => r.split("{")[0].trim()), [".werkstatt-kachelwahl .segment"]);
}

fazit();
