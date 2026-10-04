/*
 * test-start.js — der Start in der gemeinsamen Form des Studios und die
 * Bibliothek-Vorschau „B" mit dem Verlauf (seit 0.32.0).
 *
 * Hier laufen der ECHTE Bildschirm js\bildschirm-start.js und
 * js\start-bibliothek.js mit dem echten Modell (Bibliothek, Wordguesser),
 * den echten Bausteinen (BAUSTEINE, Platz, Blatt) und dem echten
 * js\bildschirm-wordle.js (Kacheln, Herzen) an einem kleinen DOM
 * (tests\kleines-dom.js). Attrappen sind nur App, Ich, Anmeldung,
 * Navigation und Dialog.
 *
 *   1. Die Liste der Arten ↔ das Quadrat; eine dritte Art ohne Umbau.
 *   2. Die gewählte Art überlebt den Neustart (Gerät).
 *   3. Der Knopf-Bereich: Bibliothek ein Knopf, Üben zwei; die offene
 *      Runde steht als „Zurück zur Runde" im Knopf.
 *   4. Vorschau „B": die Karte ist die Seite, jede Grafik ein Platz,
 *      keine Blätter-Leiste; ein Tipp öffnet den Verlauf, Zurück schliesst.
 *   5. Der Verlauf zeigt Vergangenes, Jetziges, Kommendes aus dem
 *      Fortschritt.
 *   6. Die Höhe: fester Knopf-Bereich, die Karte nimmt den Rest (im Stil);
 *      gemessen wird im Browser (STATUS.md).
 *
 * Wie es aussieht und ob etwas rollt, zeigt nur der Browser.
 */

const fs = require("fs");
const pfad = require("path");
const vm = require("vm");
const { pruefe, gleich, fazit, speicherAttrappe } = require("./pruefer.js");
const { dokumentBauen } = require("./kleines-dom.js");

const wurzel = pfad.join(__dirname, "..");
const lesen = (name) => fs.readFileSync(pfad.join(wurzel, name), "utf8");

const DATEIEN = ["js/woerter-de.js", "js/woerter-rate-de.js", "js/wordle.js", "js/wortbewertung-daten.js",
    "js/wortbewertung-korrektur.js", "js/wortbewertung.js", "js/wortarten-daten.js", "js/bibliothek.js",
    "js/upcrew-platz.js", "js/upcrew-blatt.js", "js/bausteine.js", "js/bildschirm-start.js",
    "js/start-bibliothek.js", "js/bildschirm-wordle.js"];

const HEUTE = new Date(2026, 9, 4, 12, 0);

/*
 * Eine Welt. `geraet` = der Gerätespeicher (bleibt über einen „Neustart"),
 * `turm` = der Stand der Bibliothek, `staende` = gemerkte Runden.
 */
function welt(wahl) {
    const o = wahl || {};
    const dokument = dokumentBauen();
    const s = { dokument, gezeigt: [], staende: Object.assign({}, o.staende || {}), turm: o.turm || { figuren: {}, schwuere: {} } };
    const umgebung = {
        console, setTimeout, clearTimeout, Promise,
        document: dokument,
        localStorage: o.geraet || speicherAttrappe(),
        matchMedia: () => ({ matches: true, addEventListener() { } }),
        history: { state: null, length: 1, pushState() { }, replaceState() { }, back() { } },
        addEventListener() { },
        removeEventListener() { },
        scrollTo() { },
        scrollY: 0,
        innerHeight: 640,
        ICH: {
            person: () => null,
            spielstand: (name) => (name in s.staende ? JSON.parse(JSON.stringify(s.staende[name])) : null),
            spielstandSetzen: (name, wert) => { s.staende[name] = wert; }
        },
        ANMELDUNG: { ich: () => null },
        APP: {
            jetzt: () => HEUTE,
            eigenesErgebnis: () => null,
            bibliothekStand: () => s.turm,
            durchgang: () => ({ herzen: 5, tinte: 1 }),
            bibliothekMitnahme: () => ({ effekt: "", ueben: 0 }),
            fortschritt: () => ({}),
            lieblingswoerter: () => []
        },
        NAVIGATION: {
            aktuell: "start",
            anmelden(b) { s.angemeldet = b; },
            zeigen: (id, parameter) => { s.gezeigt.push([id, parameter]); },
            auffrischen: () => s.zeichnen(),
            zurueck() { }
        },
        DIALOG: { kurzmeldung() { }, hinweis: () => Promise.resolve(), frage: () => Promise.resolve(false) }
    };
    umgebung.window = umgebung;
    vm.createContext(umgebung);
    for (const datei of DATEIEN) {
        vm.runInContext(lesen(datei), umgebung, { filename: datei });
    }
    vm.runInContext("globalThis.START = START; globalThis.BIBLIOTHEK = BIBLIOTHEK; globalThis.WORDLE = WORDLE;"
        + " globalThis.BAUSTEINE = BAUSTEINE;", umgebung);

    s.ort = dokument.createElement("main");
    s.ort.className = "inhalt";
    s.ebenen = dokument.createElement("div");
    dokument.body.appendChild(s.ort);
    dokument.body.appendChild(s.ebenen);
    umgebung.UPCREW_BLATT.einrichten({ ebenen: s.ebenen, haupt: s.ort, verlauf: false, horchen: false });

    s.umgebung = umgebung;
    s.S = umgebung.START;
    s.B = umgebung.BIBLIOTHEK;
    s.W = umgebung.WORDLE;
    s.blatt = umgebung.UPCREW_BLATT;
    s.zeichnen = () => {
        s.ort.textContent = "";
        s.S.zeigen(s.ort, null);
        return s;
    };
    s.text = (el) => (el ? el.textContent.replace(/\s+/g, " ").trim() : null);
    s.knoepfe = () => s.ort.querySelectorAll(".start-unten .start-spielen");
    s.knopfTexte = () => s.knoepfe().map((k) => [s.text(k.querySelector(".knopf-text")), s.text(k.querySelector(".start-spielen-unter"))]);
    s.eintraege = () => s.ort.querySelectorAll(".start-art-menue .start-art-eintrag");
    s.zug = () => new Promise((fertig) => setTimeout(fertig, 0));
    return s;
}

/* Ein Turm: `schritte` Stationen in Buch `b` gegangen (Bücher davor durch). */
function turmBis(B, b, schritte, spur) {
    const turm = { figuren: {}, schwuere: {} };
    for (let n = 1; n < b; n++) {
        B.gehen(n, 99, "0", turm);
    }
    if (schritte > 0) {
        B.gehen(b, schritte, spur || "0", turm);
    }
    return turm;
}

/* ------------------------------------------------------------------ *
 * 1. Die Liste der Arten ↔ das Quadrat
 * ------------------------------------------------------------------ */
{
    const s = welt().zeichnen();
    const arten = s.S.ARTEN;
    gleich("Arten: Bibliothek · Üben, die erste ist die Vorgabe", [arten.map((a) => a.id), s.S.art()],
        [["bibliothek", "ueben"], "bibliothek"]);
    gleich("Quadrat: je Art EIN Eintrag, in der Reihenfolge der Liste",
        s.eintraege().map((e) => e.getAttribute("data-art")), arten.map((a) => a.id));
    gleich("Quadrat: Name und Stichworte aus der Liste",
        s.eintraege().map((e) => s.text(e.querySelector(".knopf-text"))),
        arten.map((a) => a.name + a.info));
    gleich("Quadrat: die Art von jetzt ist angehakt und steht im Quadrat",
        [s.eintraege().map((e) => e.getAttribute("aria-checked")), s.text(s.ort.querySelector(".start-art-knopf .knopf-text"))],
        [["true", "false"], "Bibliothek"]);
    gleich("Quadrat: das Zeichen jeder Art ist ein Platz „start/art-<id>“",
        s.ort.querySelectorAll(".start-art-halter .up-platz").map((p) => p.dataset.platz),
        ["start/art-bibliothek", "start/art-bibliothek", "start/art-ueben"]);
    const menue = s.ort.querySelector(".start-art-menue");
    const quadrat = s.ort.querySelector(".start-art-knopf");
    pruefe("Quadrat: die Wahl ist zu, ein Tipp klappt sie auf, noch einer zu",
        menue.hidden === true && (quadrat.click(), menue.hidden === false)
            && quadrat.getAttribute("aria-expanded") === "true" && (quadrat.click(), menue.hidden === true));
    pruefe("Der alte Schalter oben ist weg (kein Segment auf dem Start)",
        s.ort.querySelector(".segment") === null && !/_artSchalterBauen|BAUSTEINE\.segment/.test(
            lesen("js/bildschirm-start.js") + lesen("js/start-bibliothek.js")));

    /* Ein Tipp auf einen Eintrag wechselt die Art und zeichnet neu. */
    s.ort.querySelector(".start-art-knopf").click();
    s.eintraege()[1].click();
    gleich("Tipp auf „Üben“: Art gewechselt, Wahl zu, die Karte der Art steht da",
        [s.S.art(), s.S.artMenueOffen, !!s.ort.querySelector(".start-karte-ueben"), !!s.ort.querySelector(".bib-vorschau")],
        ["ueben", false, true, false]);

    /* Eine dritte Art ist EIN Eintrag in der Liste — sonst nichts. */
    arten.push({ id: "duell", name: "Duell", info: "1 gegen 1", zeichen: "partie",
        karte: (ort) => ort.appendChild(s.umgebung.BAUSTEINE.el("section", "start-karte probe-duell")),
        knoepfe: () => [{ text: "Herausfordern", haupt: true, tun: () => s.gezeigt.push(["duell"]) }] });
    s.zeichnen();
    gleich("Dritte Art: das Quadrat zeigt drei Einträge", s.eintraege().map((e) => e.getAttribute("data-art")),
        ["bibliothek", "ueben", "duell"]);
    s.eintraege()[2].click();
    gleich("Dritte Art: gewählt, gemerkt, ihre Karte und ihr Knopf stehen da",
        [s.S.art(), !!s.ort.querySelector(".probe-duell"), s.knopfTexte(), s.text(s.ort.querySelector(".start-art-knopf .knopf-text"))],
        ["duell", true, [["Herausfordern", null]], "Duell"]);
    s.knoepfe()[0].click();
    gleich("Dritte Art: ihr Knopf tut, was die Liste sagt", s.gezeigt, [["duell"]]);
    arten.pop();
    gleich("Eine Art, die es nicht (mehr) gibt, fällt auf die Vorgabe zurück", s.S.art(), "bibliothek");
}

/* ------------------------------------------------------------------ *
 * 2. Die gewählte Art überlebt den Neustart
 * ------------------------------------------------------------------ */
{
    const geraet = speicherAttrappe();
    const erst = welt({ geraet }).zeichnen();
    erst.S.artSetzen("ueben");
    gleich("Gemerkt auf dem Gerät", geraet.getItem("typoluck.start-art"), "ueben");
    const danach = welt({ geraet }).zeichnen();
    gleich("Nach dem Neustart: dieselbe Art, ihre Karte, zwei Knöpfe",
        [danach.S.art(), !!danach.ort.querySelector(".start-karte-ueben"), danach.knoepfe().length], ["ueben", true, 2]);
    danach.S.artSetzen("bibliothek");
    gleich("… und zurück", [welt({ geraet }).S.art(), geraet.getItem("typoluck.start-art")], ["bibliothek", "bibliothek"]);
    geraet.setItem("typoluck.start-art", "frei");
    gleich("Alte Wahl „frei“ (bis 0.19.0) = Üben; Unbekanntes = Vorgabe",
        [welt({ geraet }).S.art(), (geraet.setItem("typoluck.start-art", "quatsch"), welt({ geraet }).S.art())],
        ["ueben", "bibliothek"]);
    const ohne = welt({ geraet: { getItem() { throw new Error("gesperrt"); }, setItem() { throw new Error("gesperrt"); } } });
    gleich("Ohne Gerätespeicher: die Vorgabe, nichts wirft", [ohne.S.art(), (ohne.zeichnen(), ohne.knoepfe().length)],
        ["bibliothek", 1]);
}

/* ------------------------------------------------------------------ *
 * 3. Der Knopf-Bereich und die offene Runde
 * ------------------------------------------------------------------ */
{
    /* Bibliothek, nichts offen: ein Knopf für die Station, die dran ist. */
    let s = welt().zeichnen();
    const lauf = s.B.lauf(s.turm, 1);
    gleich("Bibliothek: EIN Knopf „Spielen“, darunter Kapitel und Station; daneben das Quadrat",
        [s.knopfTexte(), s.ort.querySelectorAll(".start-spielen-zeile > *").length], [[["Spielen", "Kapitel I · Wort"]], 2]);
    pruefe("Bibliothek: der Knopf ist die Hauptaktion", s.knoepfe()[0].classList.contains("up-haupt"));
    s.knoepfe()[0].click();
    pruefe("Bibliothek: „Spielen“ öffnet das Blatt der Station, die dran ist (kein Vollbild)",
        !!s.dokument.querySelector(".bib-blatt-grund") && !s.dokument.querySelector(".bib-vollbild")
            && lauf.jetzt !== null);

    /* An der Gabelung. */
    s = welt();
    s.turm = turmBis(s.B, 1, 1);
    s.zeichnen();
    gleich("An der Gabelung: „Weg wählen“", s.knopfTexte(), [["Weg wählen", "Kapitel I"]]);

    /* Eine angefangene Bibliothek-Runde an der Station, die dran ist. */
    s = welt();
    const vorn = s.B.lauf(s.turm, 1).jetzt;
    let runde = s.W.neueRunde({ modus: "bibliothek", buch: 1, station: vorn, loesung: "abend", zeitpunkt: 1 });
    s.staende["wordle-bibliothek"] = runde;
    s.zeichnen();
    gleich("Runde ohne Versuch: nicht offen", s.knopfTexte(), [["Spielen", "Kapitel I · Wort"]]);
    runde = s.W.raten(runde, "tisch", 2).runde;
    s.staende["wordle-bibliothek"] = runde;
    s.zeichnen();
    gleich("Offene Runde: „Zurück zur Runde“, darunter welche und wie sie steht",
        s.knopfTexte(), [["Zurück zur Runde", "Kapitel I · 1/6"]]);
    pruefe("Offene Runde: das Quadrat bleibt (die andere Art bleibt erreichbar)", !!s.ort.querySelector(".start-art-knopf"));
    s.knoepfe()[0].click();
    gleich("Offene Runde: der Knopf führt in GENAU diese Runde (ohne „neu“)",
        s.gezeigt, [["wordle", { modus: "bibliothek", buch: 1, station: vorn }]]);
    s.turm = turmBis(s.B, 1, 1);
    s.zeichnen();
    gleich("Die gemerkte Runde gehört nicht mehr zur Station, die dran ist: nicht offen",
        s.knopfTexte(), [["Weg wählen", "Kapitel I"]]);

    /* Üben. */
    const geraet = speicherAttrappe();
    geraet.setItem("typoluck.start-art", "ueben");
    s = welt({ geraet }).zeichnen();
    const nummer = String(s.W.tageswort(s.W.datumText(HEUTE)).nummer);
    gleich("Üben: zwei Knöpfe Tageswort · Übung, daneben das Quadrat",
        [s.knopfTexte(), s.ort.querySelectorAll(".start-spielen-zeile > *").length,
            s.ort.querySelector(".start-spielen-zeile").classList.contains("zwei")],
        [[["Tageswort", "Nr. " + nummer], ["Übung", "neues Wort"]], 3, true]);
    gleich("Üben: Hauptaktion ist das Tageswort",
        s.knoepfe().map((k) => k.classList.contains("up-haupt")), [true, false]);
    s.knoepfe().forEach((k) => k.click());
    gleich("Üben: die Knöpfe starten Tageswort und Übung",
        s.gezeigt, [["wordle", { modus: "tag" }], ["wordle", { modus: "uebung" }]]);

    const heute = s.W.datumText(HEUTE);
    const tag = s.W.tageswort(heute);
    let tagRunde = s.W.neueRunde({ modus: "tag", datum: heute, nummer: tag.nummer, loesung: tag.wort, zeitpunkt: 1 });
    for (const wort of ["hause", "tisch"]) {
        tagRunde = s.W.raten(tagRunde, wort, 2).runde;
    }
    const offenTag = tagRunde.zustand === "laeuft";
    s = welt({ geraet, staende: { "wordle-tag": tagRunde } }).zeichnen();
    if (offenTag) {
        gleich("Tageswort angefangen: „Zurück zur Runde“ im Tageswort-Knopf, die Übung bleibt",
            s.knopfTexte(), [["Zurück zur Runde", "Tageswort · 2/6"], ["Übung", "neues Wort"]]);
        gleich("Die Karte zeigt das Brett so weit, wie gespielt ist (2 Zeilen von 6)",
            [s.ort.querySelectorAll(".start-ueben-raster .kachel").length,
                s.ort.querySelectorAll(".start-ueben-raster .kachel-gefuellt").length,
                s.text(s.ort.querySelector(".start-karte-rechts"))], [30, 10, "angefangen · 2/6"]);
    }
    let uebung = s.W.neueRunde({ modus: "uebung", loesung: "abend", zeitpunkt: 1 });
    uebung = s.W.raten(uebung, "tisch", 2).runde;
    s = welt({ geraet, staende: { "wordle-uebung": uebung } }).zeichnen();
    gleich("Übung angefangen: „Zurück zur Runde“ im Übung-Knopf, das Tageswort bleibt",
        s.knopfTexte(), [["Tageswort", "Nr. " + nummer], ["Zurück zur Runde", "Übung · 1/6"]]);
    gleich("offeneRunden: nur was angefangen ist", Object.keys(s.S.offeneRunden()).filter((k) => s.S.offeneRunden()[k]),
        ["uebung"]);

    /* Tageswort erledigt: Ergebnis, die Übung wird zur Hauptaktion. */
    s = welt({ geraet });
    s.umgebung.APP.eigenesErgebnis = () => ({ geloest: true, versuche: 3 });
    s.zeichnen();
    gleich("Tageswort erledigt: „Ergebnis“ mit der Zeit bis zum nächsten, Hauptaktion ist die Übung",
        [s.knopfTexte(), s.knoepfe().map((k) => k.classList.contains("up-haupt"))],
        [[["Ergebnis", "nächstes in 12 h 0 min"], ["Übung", "neues Wort"]], [false, true]]);
}

/* ------------------------------------------------------------------ *
 * 4. Vorschau „B": die Karte ist die Seite; Tipp → Verlauf; Zurück
 * ------------------------------------------------------------------ */
{
    const s = welt();
    s.turm = turmBis(s.B, 2, 3, "1");
    s.zeichnen();
    const karte = s.ort.querySelector(".bib-vorschau");
    const lauf = s.B.lauf(s.turm, 2);
    const kap = s.B.kapitel(2, lauf.kapitel);
    pruefe("Die Karte ist EIN Knopf und steht zwischen Kopf und Knopf-Bereich",
        !!karte && karte.localName === "button" && karte.classList.contains("start-karte")
            && s.ort.children.map((k) => k.className.split(" ")[0]).join(",") === "start-kopf,knopf,start-unten");
    gleich("Kopf der Karte: Nummer, Titel, Kapitel",
        [s.text(karte.querySelector(".start-karte-nr")), s.text(karte.querySelector(".start-karte-titel")),
            s.text(karte.querySelector(".start-karte-rechts"))], ["2", s.B.buch(2).titel, "Kapitel " + s.B.ROEM[lauf.kapitel]]);
    const feld = karte.querySelector(".bib-weg-feld");
    const stationen = feld.children.filter((k) => k.localName !== "svg");
    gleich("Der Weg: jede Stelle des Kapitels steht auf der Karte", stationen.length,
        kap.reduce((n, spalte) => n + spalte.length, 0));
    pruefe("JEDE Grafik ist ein Platz „bibliothek/…“ mit Maß (Grund und Stationen)",
        stationen.every((k) => k.classList.contains("up-platz") && /^bibliothek\/(station-[a-z]+|eingang|ausgang)$/.test(k.dataset.platz)
            && /^\d+x\d+$/.test(k.dataset.mass))
            && karte.querySelector(".bib-weg-grund").dataset.platz === "bibliothek/kapitel-weg"
            && karte.querySelector(".bib-weg-grund").dataset.mass === "366x520");
    gleich("Die Plätze der Stationen: je Art einer",
        Object.keys(s.S.PLATZ_ART).sort(), Object.keys(s.B.ARTEN).concat(["ein", "aus"]).sort());
    pruefe("Nichts in der Karte ist bedienbar (keine Knöpfe darin), keine Blätter-Leiste, keine Pfeile",
        karte.querySelectorAll("button").length === 0 && !karte.querySelector(".bib-kap-punkt, .bib-leiste, .bib-halb, .buch")
            && !/\u2191|\u2193|\u2039|\u203a/.test(karte.textContent));
    gleich("Zustände aus dem Lauf: gegangen, dran (oder Wahl)",
        [stationen.filter((k) => k.classList.contains("fertig") && !/eingang/.test(k.dataset.platz)).length,
            stationen.filter((k) => k.classList.contains("jetzt") || k.classList.contains("wahl")).length],
        [lauf.weg.filter((nr) => s.B.station(2, nr).k === lauf.kapitel).length, lauf.jetzt !== null ? 1 : 2]);

    /* Lage: nichts am Rand, nichts übereinander — für jedes Kapitel jedes Buchs. */
    let innen = true;
    let abstand = Infinity;
    for (let b = 1; b <= s.B.anzahlBuecher(); b++) {
        for (let k = 0; k < s.B.anzahlKapitel(b); k++) {
            const kk = s.B.kapitel(b, k);
            kk.forEach((spalte, sp) => spalte.forEach((_, i) => {
                const l = s.S.wegLage(kk, sp, i);
                innen = innen && l.y >= 7 && l.y <= 93 && [24, 50, 76].indexOf(l.x) !== -1;
                if (sp > 0) {
                    abstand = Math.min(abstand, s.S.wegLage(kk, sp - 1, 0).y - l.y);
                }
            }));
        }
    }
    pruefe("Lage: jede Stelle 7–93 % der Höhe, drei Spalten-Lagen; Spalten mindestens 12 % auseinander ("
        + abstand.toFixed(1) + " %; eine Station ist 10 % hoch)", innen && abstand >= 12);

    /* Tipp → Verlauf als Blatt. */
    gleich("Vor dem Tipp: kein Blatt", s.blatt.anzahl(), 0);
    karte.click();
    const blatt = s.ebenen.querySelector(".up-bl-blatt, .blatt-bib-verlauf");
    gleich("Tipp auf die Karte: EIN Blatt (UPCREW_BLATT) mit dem Verlauf",
        [s.blatt.anzahl(), s.blatt.blaetter(), !!s.ebenen.querySelector(".bib-verlauf"), !!blatt], [1, 1, true, true]);
    pruefe("Der Start dahinter bleibt stehen (kein Vollbild, keine Runde)",
        !s.dokument.querySelector(".bib-vollbild") && s.gezeigt.length === 0 && !!s.ort.querySelector(".bib-vorschau"));
    const zu = s.ebenen.querySelector(".up-bl-kopf-knopf");
    pruefe("Das Blatt hat seinen Schliessen-Knopf", !!zu);
    zu.click();
    gleich("Zurück schliesst es", [s.blatt.anzahl(), !!s.ebenen.querySelector(".bib-verlauf")], [0, false]);
    karte.click();
    s.blatt.schliessen("verlauf");
    gleich("… auch die Zurück-Taste (wie = „verlauf“)", s.blatt.anzahl(), 0);

    /* „Buch aufschlagen" im Verlauf: Blatt zu, Vollbild auf. */
    karte.click();
    const auf = s.ebenen.querySelectorAll(".bib-vl-fuss button")[0];
    auf.click();
    gleich("„Buch aufschlagen“: Blatt zu, das Buch im Vollbild",
        [s.blatt.anzahl(), s.S.buchOffen, !!s.dokument.querySelector(".bib-vollbild")], [0, true, true]);
    s.S.buchSchliessen();
}

/* ------------------------------------------------------------------ *
 * 5. Der Verlauf: Vergangenes, Jetziges, Kommendes aus dem Fortschritt
 * ------------------------------------------------------------------ */
{
    const s = welt();
    const B = s.B;

    /* Ganz am Anfang. */
    let d = s.S.verlaufDaten({ figuren: {}, schwuere: {} }, 1);
    gleich("Anfang: nichts war, die erste Station ist dran",
        [d.war.length, d.jetzt.map((e) => [e.was, e.nr, e.kapitel])], [0, [["station", B.lauf({}, 1).jetzt, 0]]]);
    gleich("Anfang: es kommen alle übrigen Spalten bis zum Boss, dann die Bücher 2–6 (zu)",
        [d.kommt.filter((e) => e.was !== "buch").length, d.kommt.filter((e) => e.was === "buch").map((e) => [e.nr, e.zu]),
            d.kommt.filter((e) => e.was !== "buch").pop().name],
        [B.stationen(1).spalten - 1, [[2, true], [3, true], [4, true], [5, true], [6, true]], B.buch(1).boss.name]);

    /* Mitten in Buch 2, an einer Gabelung vorbei. */
    const turm = turmBis(B, 2, 6, "1");
    const lauf = B.lauf(turm, 2);
    d = s.S.verlaufDaten(turm, 2);
    gleich("War: erst Buch 1 (mit seinen Figuren), dann die gegangenen Stationen in ihrer Reihenfolge",
        [d.war[0], d.war.slice(1).map((e) => e.nr)],
        [{ was: "buch", nr: 1, titel: B.buch(1).titel, figuren: B.summe(turm, 1), zu: false }, lauf.weg]);
    pruefe("War: Kampf-Stationen tragen ihre Figuren",
        d.war.slice(1).every((e) => e.figuren === B.figurenVon(turm.figuren, 2, e.nr))
            && d.war.slice(1).some((e) => e.figuren > 0));
    gleich("Jetzt: genau die Front (eine Station oder die Wahl an der Gabelung)",
        [d.jetzt.length, d.jetzt[0].was === (lauf.gabel ? "wahl" : "station"),
            lauf.gabel ? d.jetzt[0].arten.length : d.jetzt[0].nr], [1, true, lauf.gabel ? 2 : lauf.jetzt]);
    gleich("War + Jetzt + Kommt = alle Spalten des Buchs",
        d.war.length - 1 + 1 + d.kommt.filter((e) => e.was !== "buch").length, B.stationen(2).spalten);
    gleich("Kommt: zuletzt der Boss, danach die Bücher 3–6",
        [d.kommt.filter((e) => e.was !== "buch").pop().art, d.kommt.filter((e) => e.was === "buch").map((e) => e.nr)],
        ["b", [3, 4, 5, 6]]);
    pruefe("Kommt: nichts Gegangenes, nichts Verpasstes — nur Erreichbares",
        d.kommt.filter((e) => e.was === "station").every((e) => !B.erledigt(turm, 2, e.nr)));

    /* Buch durch (als angesehenes Buch). */
    const fertig = turmBis(B, 2, 0);
    d = s.S.verlaufDaten(fertig, 1);
    gleich("Buch durch: alles war, nichts ist dran, es kommen nur Bücher (das nächste offen)",
        [d.durch, d.jetzt.length, d.war.length, d.kommt.map((e) => [e.was, e.nr, e.zu]).slice(0, 2)],
        [true, 0, B.lauf(fertig, 1).weg.length, [["buch", 2, false], ["buch", 3, true]]]);

    /* Gezeichnet: Abschnitte und Zeilen im Blatt. */
    s.turm = turm;
    s.zeichnen();
    s.ort.querySelector(".bib-vorschau").click();
    const v = s.ebenen.querySelector(".bib-verlauf");
    d = s.S.verlaufDaten(turm, 2);
    gleich("Blatt: drei Abschnitte War · Jetzt · Kommt in dieser Reihenfolge",
        v.querySelectorAll(".bib-vl-titel").map((t) => s.text(t)), ["War", "Jetzt", "Kommt"]);
    gleich("Blatt: je Eintrag eine Zeile",
        [v.querySelectorAll(".bib-vl-zeile.war").length, v.querySelectorAll(".bib-vl-zeile.jetzt").length,
            v.querySelectorAll(".bib-vl-zeile.kommt").length], [d.war.length, d.jetzt.length, d.kommt.length]);
    pruefe("Blatt: jedes Bild ist ein Platz „bibliothek/…“ (Stationen und Bücher)",
        v.querySelectorAll(".bib-vl-bild").length >= d.war.length + d.kommt.length
            && v.querySelectorAll(".bib-vl-bild").every((p) => p.classList.contains("up-platz") && /^bibliothek\//.test(p.dataset.platz))
            && v.querySelectorAll(".bib-vl-buch .bib-vl-bild").every((p) => /^bibliothek\/buch-[a-z]+$/.test(p.dataset.platz)));
    pruefe("Blatt: oben Buch und Stand (Herzen, Tinte, Boss in n) — nur Anzeige",
        /Buch 2/.test(s.text(v.querySelector(".bib-vl-buch"))) && !!v.querySelector(".bib-vl-kopf .bib-leiste")
            && v.querySelectorAll(".bib-vl-kopf button").length === 0);

    /* Seit 0.34.4 (Rauchprobe 0.34.3): dieselbe Station hiess auf der Karte
       „B" und im Verlauf „W" — die Wahl trug keine Nummern, der Verlauf fiel
       auf „W" zurück. Jetzt kommt das Zeichen einer Wort-Station an beiden
       Stellen aus EINER Quelle (`_initiale(buch, nr)`). */
    const alleEintraege = d.war.concat(d.jetzt, d.kommt);
    const wahlen = alleEintraege.filter((e) => e.was === "wahl");
    pruefe("Verlauf-Daten: jede Wahl trägt die Nummern ihrer Stationen (so viele wie Arten)",
        wahlen.length > 0 && wahlen.every((e) => Array.isArray(e.nummern) && e.nummern.length === e.arten.length
            && e.nummern.every((nr, i) => B.station(2, nr).art === e.arten[i])));
    const erwartet = alleEintraege.map((e) => (e.was === "wahl"
        ? e.arten.map((art, i) => (art === "w" ? s.S._initiale(2, e.nummern[i]) : null))
        : (e.was === "station" && e.art === "w" ? [s.S._initiale(2, e.nr)] : [])).filter((x) => x).join("/"));
    gleich("Blatt: das Zeichen jeder Wort-Station (auch in einer Wahl) ist ihre Initiale wie auf der Karte",
        v.querySelectorAll(".bib-vl-zeile").map((z) => z.querySelectorAll(".ini").map((i) => s.text(i)).join("/")), erwartet);
    pruefe("Die Probe trägt: mindestens eine Wahl mit einer Wort-Station, deren Initiale nicht „W\" ist",
        wahlen.some((e) => e.arten.some((a, i) => a === "w" && s.S._initiale(2, e.nummern[i]) !== "W")));
    s.blatt.alleSchliessen();

    /* Karte und Verlauf nebeneinander (Buch 1 am Anfang): jede Initiale der
       Karte steht auch im Verlauf. */
    const k1 = welt();
    k1.turm = { figuren: {}, schwuere: {} };
    k1.zeichnen();
    const karteIni = k1.ort.querySelectorAll(".bib-vorschau .ini").map((i) => k1.text(i));
    k1.ort.querySelector(".bib-vorschau").click();
    const blattIni = k1.ebenen.querySelectorAll(".bib-verlauf .ini").map((i) => k1.text(i));
    pruefe("Buch 1: jede Initiale der Karte steht auch im Verlauf (eine Quelle)",
        karteIni.length > 0 && karteIni.every((z) => blattIni.indexOf(z) !== -1));
    k1.blatt.alleSchliessen();
}

/* ------------------------------------------------------------------ *
 * 6. Höhe und Stil (soweit ohne Browser prüfbar), Einbindung
 * ------------------------------------------------------------------ */
{
    const stil = lesen("css/stil-bibliothek.css").replace(/\/\*[\s\S]*?\*\//g, "");
    const regel = (auswahl) => {
        const t = new RegExp("(^|\\})\\s*" + auswahl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*\\{([^}]*)\\}").exec(stil);
        return t ? t[2] : "";
    };
    pruefe("Der Start ist so hoch wie der Bildschirm und rollt nicht; unten 16 px + Leiste frei",
        /height: 100dvh;/.test(regel(".inhalt[data-bildschirm=\"start\"]")) && /overflow: hidden;/.test(regel(".inhalt[data-bildschirm=\"start\"]"))
            && /padding-bottom: calc\(16px \+ var\(--leiste-hoehe\) \+ env\(safe-area-inset-bottom\)\);/
                .test(regel(".inhalt[data-bildschirm=\"start\"]")));
    pruefe("Knopf-Bereich: fest 82 px, Knöpfe 74 px, Quadrat 74 × 74, Abstand 12 px",
        /flex: none;[\s\S]*height: 82px;/.test(regel(".start-unten")) && /gap: 12px;[\s\S]*height: 74px;/.test(regel(".start-spielen-zeile"))
            && /height: 74px;/.test(regel(".start-unten .start-spielen")) && /flex: 0 0 74px;/.test(regel(".start-art-halter"))
            && /width: 74px;\s*height: 74px;/.test(regel(".start-art-halter .start-art-knopf")));
    pruefe("Die Karte nimmt den Rest und darf schrumpfen (so passt der Start in 640 px)",
        /flex: 1 1 auto;[\s\S]*min-height: 0;/.test(regel(".inhalt[data-bildschirm=\"start\"] > .start-karte")));
    pruefe("Die Wahl klappt nach oben auf", /bottom: calc\(100% \+ 8px\);/.test(regel(".start-art-menue")));
    pruefe("Nichts auf dem Start und im Verlauf rollt waagrecht",
        !/overflow-x:\s*(auto|scroll)/.test(stil) && /overflow-x: hidden;/.test(regel(".bib-verlauf")));
    pruefe("Kein eigener Stil gibt den Knöpfen des Bereichs Rundung, Kante oder Schatten",
        [".start-unten .start-spielen", ".start-art-halter .start-art-knopf", ".start-spielen-zeile.zwei .start-spielen"]
            .every((a) => !/border|box-shadow/.test(regel(a))));
    /* Seit 0.34.4 (Rauchprobe 0.34.3: „nächstes in 17 …" bei 360 px, 140 px
       Text in 105 px): „nächstes " fällt bei schmaler Breite weg, die Zeit
       bleibt ganz. */
    /* Die Regel hängt am Platz im Knopf (Container-Abfrage), nicht an der
       Bildschirmbreite: gemessen bei 360/375/390/412/430 px Platz
       105/113/120/131/140 px → überall die kurze Fassung (77 px). */
    pruefe("Der Knopf ist ein Container (Breite), der Vorsatz fällt bei höchstens 150 px Platz weg",
        /container-type: inline-size;/.test(regel(".start-spielen-zeile > .start-spielen"))
            && /@container \(max-width: 150px\)\s*\{\s*\.start-spielen-vorsatz\s*\{\s*display: none;\s*\}\s*\}/.test(stil));
    pruefe("Keine feste Bildschirm-Grenze mehr für den Vorsatz", !/@media[^{]*\{\s*\.start-spielen-vorsatz/.test(stil));
    const geraet7 = speicherAttrappe();
    geraet7.setItem("typoluck.start-art", "ueben");
    const s7 = welt({ geraet: geraet7 });
    s7.S.anmelden();
    s7.umgebung.APP.eigenesErgebnis = () => ({ geloest: false, versuche: 6 });
    s7.zeichnen();
    const unter = s7.knoepfe()[0].querySelector(".start-spielen-unter");
    gleich("Ergebnis-Knopf: „nächstes \" als eigener Teil, die Zeit („in …\") trägt die Nachführung",
        [s7.text(unter.querySelector(".start-spielen-vorsatz")), unter.querySelectorAll("[data-bis-morgen=\"kurz\"]").map((e) => e.textContent)],
        ["nächstes", ["in 12 h 0 min"]]);
    const schwester = "Blunder" + "luck";
    pruefe("Der Start verweist auf kein Schwester-Spiel (keine Datei von dort)",
        [lesen("js/start-bibliothek.js"), lesen("js/bildschirm-start.js"), lesen("tests/test-start.js")]
            .every((t) => !new RegExp("[\\\\/]" + schwester + "[\\\\/]").test(t)));
    pruefe("Werkstatt: &verlauf und &artwahl", /has\("verlauf"\)/.test(lesen("js/werkstatt.js"))
        && /has\("artwahl"\)/.test(lesen("js/werkstatt.js")));
}

/* ------------------------------------------------------------------ *
 * 7. Die Zeit bis zum nächsten Tageswort beim Betreten (seit 0.34.1)
 *    Seit 0.33.0 zeichnet der Start beim Tab-Wechsel nicht neu (die
 *    Stand-Marke kennt nur den Tag). Beim Öffnen (`geoeffnet`) wird darum
 *    NUR die Zeit-Anzeige nachgeführt — Knopf und Karte, sonst nichts.
 * ------------------------------------------------------------------ */
{
    const geraet = speicherAttrappe();
    geraet.setItem("typoluck.start-art", "ueben");
    const s = welt({ geraet });
    s.umgebung.APP.eigenesErgebnis = () => ({ geloest: true, versuche: 3 });
    s.S.anmelden();
    s.zeichnen();
    const fuss = () => s.ort.querySelectorAll(".start-karte-fuss span").map((e) => s.text(e))[0];
    gleich("Vorher: Knopf und Karte zeigen 12 h 0 min", [s.knopfTexte()[0][1], fuss()],
        ["nächstes in 12 h 0 min", "nächstes in 12 h 0 min"]);
    const karte = s.ort.querySelector(".start-karte-ueben");
    const knopf = s.knoepfe()[0];
    s.umgebung.APP.jetzt = () => new Date(2026, 9, 4, 15, 10);
    pruefe("Der Start meldet `geoeffnet` an", typeof s.angemeldet.geoeffnet === "function");
    if (typeof s.angemeldet.geoeffnet === "function") {
        s.angemeldet.geoeffnet(s.ort);
    }
    gleich("Nach 3 h 10 min Start wieder betreten: Knopf und Karte zeigen 8 h 50 min",
        [s.knopfTexte()[0][1], fuss()], ["nächstes in 8 h 50 min", "nächstes in 8 h 50 min"]);
    pruefe("Dabei wird nichts neu gezeichnet (dieselbe Karte, derselbe Knopf)",
        s.ort.querySelector(".start-karte-ueben") === karte && s.knoepfe()[0] === knopf);

    /* Ohne Zeit-Anzeige (Tageswort offen, Bibliothek) tut `geoeffnet` nichts. */
    const offen = welt({ geraet });
    offen.S.anmelden();
    offen.zeichnen();
    const vorher = offen.ort.innerHTML;
    if (typeof offen.angemeldet.geoeffnet === "function") {
        offen.angemeldet.geoeffnet(offen.ort);
    }
    gleich("Tageswort offen: `geoeffnet` ändert nichts", offen.ort.innerHTML, vorher);
    pruefe("Kein anderer Bildschirm zeigt eine Uhrzeit-abhängige Zeit (nur der Start rechnet `bisMorgen`)",
        ["js/bildschirm-herausforderungen.js", "js/bildschirm-shop.js", "js/bildschirm-sammlung.js", "js/bildschirm-profil.js",
            "js/bildschirm-rangliste.js", "js/start-bibliothek.js"].every((d) => !/bisMorgen|getHours|getMinutes/.test(lesen(d))));
}

fazit();
