/*
 * test-shop.js — der Shop mit Design-Reiter und Besitz (seit 0.31.0).
 *
 * Hier läuft der ECHTE Bildschirm js\bildschirm-shop.js mit den ECHTEN
 * Bausteinen (upcrew-shop, -besitz, -katalog, -platz, -blatt, -muenzen,
 * -anpassen, -aussehen, -farbwelten, -intro), dem echten Modell der Sammlung
 * und dem echten js\besitz.js an einem kleinen DOM (tests\kleines-dom.js).
 * Attrappen sind nur App (ein Fortschritt im Speicher), Dialog und
 * Navigation. Wie APP wirklich bucht, prüft tests\test-besitz.js.
 *
 *   1. Der Aufruf: Reiter „Design" und „Typoluck", die neuen Optionen.
 *   2. Kauf: Rückfrage Nein = nichts; Ja = Besitz da, Münzen weg,
 *      Kurzmeldung, das Blatt zeichnet sich neu; zu wenig Münzen = Knopf
 *      aus; doppelt geht nicht.
 *   3. Was auf dem heutigen Weg frei ist (Tat, Level), steht als „im
 *      Besitz" und wird nicht verkauft.
 *   4. Die Seite hält ihren Zustand: derselbe Griff, der gewählte Reiter.
 *   5. Anprobe: zeigen ohne zu speichern, „Anprobe beenden", Ende beim
 *      Verlassen.
 *   6. Einbindung und Stil: der Streifen liegt ausserhalb des Bandes,
 *      nichts rollt waagrecht.
 *
 * Ob auf der Shop-Seite am Gerät nichts waagrecht rollt, zeigt nur der
 * Browser (Messung bei 360 px in STATUS.md).
 */

const fs = require("fs");
const pfad = require("path");
const vm = require("vm");
const { pruefe, gleich, spaeter, fazit, speicherAttrappe } = require("./pruefer.js");
const { dokumentBauen } = require("./kleines-dom.js");

const wurzel = pfad.join(__dirname, "..");
const lesen = (name) => fs.readFileSync(pfad.join(wurzel, name), "utf8");

const DATEIEN = ["js/upcrew-intro.js", "js/upcrew-farbwelten.js", "js/upcrew-aussehen.js", "js/kachelsets.js",
    "js/upcrew-katalog.js", "js/upcrew-besitz.js", "js/upcrew-platz.js", "js/upcrew-anpassen.js", "js/upcrew-muenzen.js",
    "js/upcrew-shop.js", "js/upcrew-blatt.js", "js/sammlung.js", "js/bildschirm-sammlung.js", "js/besitz.js",
    "js/bildschirm-shop.js"];

/*
 * Eine Welt. `muenzen` = verdient, `taten`, `level`, `imBand` (Vorgabe ja).
 */
function welt(wahl) {
    const o = wahl || {};
    const dokument = dokumentBauen();
    const einstellungen = {};
    const s = { dokument, einstellungen, fragen: [], meldungen: [], antwort: true, imBand: o.imBand !== false };
    const umgebung = {
        console, setTimeout, clearTimeout, Promise,
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
        WORDLE: { datumText: () => "2026-10-04" },
        NAVIGATION: { anmelden(b) { s.angemeldet = b; }, imBand: () => s.imBand },
        ZUSTAND: { fehler: () => dokument.createElement("p") },
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
            },
            knopf(angaben) {
                const k = dokument.createElement("button");
                k.className = "knopf";
                k.textContent = angaben.text;
                if (angaben.beiKlick) {
                    k.addEventListener("click", angaben.beiKlick);
                }
                return k;
            },
            kopfzeile: () => dokument.createElement("header")
        },
        DIALOG: {
            frage: (...was) => { s.fragen.push(was); return Promise.resolve(s.antwort); },
            kurzmeldung: (text) => { s.meldungen.push(text); }
        },
        WORDLE_BILDSCHIRM: {
            _kachelBauen(buchstabe, art) {
                const k = dokument.createElement("div");
                k.className = "kachel kachel-" + art;
                k.textContent = buchstabe.toUpperCase();
                return k;
            }
        }
    };
    umgebung.window = umgebung;
    vm.createContext(umgebung);
    for (const datei of DATEIEN) {
        vm.runInContext(lesen(datei), umgebung, { filename: datei });
    }
    /* Die App: ein Fortschritt im Speicher; gekauft wird über das echte js\besitz.js. */
    vm.runInContext("globalThis.FORTSCHRITT = { APP: 'typoluck', GAST: 'gast', _speicher: () => localStorage,"
        + " erfuellteTaten: () => " + JSON.stringify(o.taten || []) + " };"
        + "globalThis.APP = { stand: { version: 1, spiele: { typoluck: { stand: 1, zaehler: { muenzenVerdient: " + (o.muenzen || 0) + " } } } },"
        + " level: () => ({ level: " + (o.level || 0) + " }), jetzt: () => new Date(2026, 9, 4), fortschritt: () => APP.stand,"
        + " fortschrittId: () => 'ich', gebucht: 0,"
        + " kaufen: () => ({ ok: true, grund: '' }),"
        + " kaufenStueck(art, wert) { return BESITZ.kaufen({ stand: APP.stand, art: art, wert: wert, heute: '2026-10-04', jetzt: 9,"
        + "     buchen: (r) => { APP.stand = r.stand; APP.gebucht++; } }); } };"
        + "BESITZ.einrichten(null, null, () => 'ich');"
        + "globalThis.SHOP_BILDSCHIRM = SHOP_BILDSCHIRM; globalThis.BESITZ = BESITZ; globalThis.KACHELSETS = KACHELSETS;", umgebung);

    s.ort = dokument.createElement("div");
    s.ort.className = "inhalt";
    s.ebenen = dokument.createElement("div");
    s.streifen = dokument.createElement("div");
    s.streifen.id = "anprobe";
    s.streifen.hidden = true;
    dokument.body.appendChild(s.ort);
    dokument.body.appendChild(s.ebenen);
    dokument.body.appendChild(s.streifen);
    umgebung.UPCREW_BLATT.einrichten({ ebenen: s.ebenen, haupt: s.ort, verlauf: false, horchen: false });

    s.umgebung = umgebung;
    s.S = umgebung.SHOP_BILDSCHIRM;
    s.K = umgebung.UPCREW_KATALOG;
    s.M = umgebung.UPCREW_MUENZEN;
    s.B = umgebung.BESITZ;
    s.zeigen = () => {
        s.S.zeigen(s.ort);
        return s;
    };
    s.text = (el) => (el ? el.textContent.replace(/\s+/g, " ").trim() : null);
    s.saldo = () => s.M.saldo(umgebung.APP.stand);
    s.kaufKnopf = () => s.ebenen.querySelector(".up-shop-kaufen");
    s.anprobeKnopf = () => s.ebenen.querySelector(".up-shop-anprobieren");
    s.zug = () => new Promise((fertig) => setTimeout(fertig, 0));
    return s;
}

const kennung = (s, art, n) => {
    const stueck = s.K.stuecke(art).filter((x) => x.weg === "kauf" && x.wirkt === true)[n || 0];
    return { stueck, kennung: s.K.kennung(stueck) };
};

/* ------------------------------------------------------------------ *
 * 1. Der Aufruf
 * ------------------------------------------------------------------ */
{
    const s = welt({ muenzen: 1000 }).zeigen();
    const seg = s.ort.querySelectorAll(".up-shop-seg button");
    gleich("Zwei Reiter: Design · Typoluck — Design zuerst", [seg.map((k) => s.text(k)), s.S._griff.teil()], [["Design", "Typoluck"], "design"]);
    pruefe("Design: Pakete und Einzelteile stehen da, darunter Typolucks Kachel-Sets — keine Arten nur des anderen Spiels",
        s.ort.querySelectorAll(".up-shop-paket").length > 0
            && s.ort.querySelectorAll(".up-shop-kat").map((k) => k.dataset.kat).indexOf("kachelset") !== -1
            && s.ort.querySelectorAll(".up-shop-kat").map((k) => k.dataset.kat).indexOf("brett2d") === -1);
    gleich("Das Guthaben im Kopf", s.text(s.ort.querySelector(".up-shop-kopf .up-shop-saldo")), "1 000");
    s.S._griff.teilSetzen("vorrat");
    gleich("Reiter Typoluck: der Vorrat wie bisher — Extra-Leben und Tipp mit Typolucks Texten",
        [s.ort.querySelectorAll(".up-shop-karte h3").map((h) => s.text(h)), s.text(s.ort.querySelector(".up-shop-karte p"))],
        [["Extra-Leben", "Tipp"], "Ein 7. Versuch, wenn der 6. danebengeht"]);

    const quelle = lesen("js/bildschirm-shop.js").replace(/\/\*[\s\S]*?\*\//g, "");
    for (const option of ["spiel: \"typoluck\"", "spielName: \"Typoluck\"", "besitz: ", "heute: () => WORDLE.datumText(APP.jetzt())",
        "frei: ", "kaufenStueck: ", "anprobieren: ", "bildVon: ", "teil: ", "beiTeil: "]) {
        pruefe("Option des Bausteins gesetzt: " + option.trim(), quelle.indexOf(option) !== -1);
    }
    pruefe("Keine Preise, Pakete oder Stufen im Bildschirm festgeschrieben", !/\b(250|900|150)\b/.test(quelle));
}

/* ------------------------------------------------------------------ *
 * 2. Kauf
 * ------------------------------------------------------------------ */
spaeter("Kauf im Blatt", (async () => {
    const s = welt({ muenzen: 1000 }).zeigen();
    const { stueck, kennung: k } = kennung(s, "kachelset");
    pruefe("Das Stück-Blatt öffnet", s.S._griff.oeffnen("stueck:" + k) === true);
    gleich("Kaufen ist an und nennt den Preis des Katalogs; Anprobieren ist an",
        [s.kaufKnopf().disabled, s.text(s.kaufKnopf()), s.anprobeKnopf().disabled],
        [false, "Kaufen · " + stueck.preis, false]);

    s.antwort = false;
    s.kaufKnopf().click();
    await s.zug();
    gleich("Rückfrage „<Name> kaufen?“ mit dem Preis — Nein: nichts gekauft, nichts gemeldet",
        [s.fragen[0], s.B.menge(), s.saldo(), s.meldungen], [[stueck.name + " kaufen?", stueck.preis + " Münzen", "Kaufen"], {}, 1000, []]);

    s.antwort = true;
    s.kaufKnopf().click();
    await s.zug();
    gleich("Ja: der Besitz ist da, die Münzen sind weg, Kurzmeldung",
        [s.B.menge(), s.saldo(), s.meldungen], [{ kachelset: [stueck.wert] }, 1000 - stueck.preis, [stueck.name + " gekauft"]]);
    gleich("Das Blatt hat sich neu gezeichnet: Kaufen ist aus („Im Besitz“), das Guthaben im Blatt stimmt",
        [s.kaufKnopf().disabled, s.text(s.kaufKnopf()), s.text(s.ebenen.querySelector(".up-shop-saldo"))],
        [true, "Im Besitz", String(1000 - stueck.preis)]);
    s.kaufKnopf().click();
    await s.zug();
    gleich("Doppelt geht nicht: der Knopf ist aus, es wird nicht gefragt und nicht gebucht",
        [s.fragen.length, s.umgebung.APP.gebucht, s.saldo()], [2, 1, 1000 - stueck.preis]);
    gleich("… auch am Knopf vorbei: abgelehnt, „Nicht kaufbar“",
        [await s.S.kaufenStueck(stueck, stueck.preis), s.meldungen.slice(-1)[0], s.umgebung.APP.gebucht], [false, "Nicht kaufbar", 1]);
    s.umgebung.UPCREW_BLATT.alleSchliessen();
    pruefe("Auf der Seite zählt die Kategorie jetzt das Grund-Set und das gekaufte: 2/10",
        /^2\/10/.test(s.text(s.ort.querySelector(".up-shop-kat[data-kat=\"kachelset\"] small"))),
        s.text(s.ort.querySelector(".up-shop-kat[data-kat=\"kachelset\"] small")));

    /* zu wenig */
    const arm = welt({ muenzen: 10 }).zeigen();
    const teuer = kennung(arm, "kachelset");
    arm.S._griff.oeffnen("stueck:" + teuer.kennung);
    gleich("Zu wenig Münzen: Kaufen ist aus und nennt, was fehlt",
        [arm.kaufKnopf().disabled, arm.text(arm.kaufKnopf())], [true, "Es fehlen " + (teuer.stueck.preis - 10)]);
    arm.kaufKnopf().click();
    await arm.zug();
    gleich("… nichts gefragt, nichts gekauft", [arm.fragen.length, arm.B.menge(), arm.saldo()], [0, {}, 10]);
    gleich("… am Knopf vorbei: abgelehnt, „Zu wenig Münzen“",
        [await arm.S.kaufenStueck(teuer.stueck, teuer.stueck.preis), arm.meldungen.slice(-1)[0], arm.B.menge()], [false, "Zu wenig Münzen", {}]);

    /* ---------- 3. heute schon frei ---------- */
    const frei = welt({ muenzen: 1000, taten: ["serie-7"], level: 3 }).zeigen();
    gleich("frei(): Tat (Blei), Level (Kreide), Grund-Set (Papier) — Neon nicht",
        ["blei", "kreide", "papier", "neon"].map((w) => frei.S.frei("kachelset", w)), [true, true, true, false]);
    frei.S._griff.oeffnen("stueck:kachelset-blei");
    gleich("Was die Tat schon freigab, verkauft der Shop nicht noch einmal",
        [frei.kaufKnopf().disabled, frei.text(frei.kaufKnopf())], [true, "Im Besitz"]);
    gleich("bildVon: Typoluck liefert kein eigenes Bild (der Platz bleibt Platzhalter)", frei.S.bildVon({ art: "kachelset", wert: "blei" }), "");

    /* ---------- 3b. Konto noch nicht geladen (seit 0.33.1, Prüfung Besitz Fund 2/3) ---------- */
    const wartet = welt({ muenzen: 1000 }).zeigen();
    const wStueck = kennung(wartet, "kachelset");
    wartet.umgebung.APP.kaufBereit = () => false;
    wartet.S._griff.oeffnen("stueck:" + wStueck.kennung);
    wartet.antwort = true;
    wartet.kaufKnopf().click();
    await wartet.zug();
    gleich("Konto nicht geladen: Kaufen führt zur Kurzmeldung — keine Rückfrage, nichts gekauft, nichts gebucht",
        [wartet.fragen.length, wartet.meldungen, wartet.B.menge(), wartet.saldo(), wartet.umgebung.APP.gebucht],
        [0, ["Kaufen geht, sobald dein Konto geladen ist"], {}, 1000, 0]);
    wartet.anprobeKnopf().click();
    gleich("… Anprobieren geht trotzdem", [wartet.anprobeKnopf().disabled, wartet.S._anprobe !== null], [false, true]);
    wartet.S.anprobeBeenden(true);
    /* Während der Rückfrage wird das Konto unbereit (z. B. Personenwechsel): APP meldet „laedt". */
    wartet.umgebung.APP.kaufBereit = () => true;
    const vorKauf = wartet.umgebung.APP.kaufenStueck;
    wartet.umgebung.APP.kaufenStueck = () => ({ ok: false, grund: "laedt", preis: 0, fehlt: 0 });
    gleich("… „laedt“ nach der Rückfrage: dieselbe Kurzmeldung",
        [await wartet.S.kaufenStueck(wStueck.stueck, wStueck.stueck.preis), wartet.meldungen.slice(-1)[0]],
        [false, "Kaufen geht, sobald dein Konto geladen ist"]);
    wartet.umgebung.APP.kaufenStueck = () => ({ ok: false, grund: "speicher", preis: 0, fehlt: 0 });
    gleich("… „speicher“ (Gerät voll, Fund 6): eigene Kurzmeldung, nichts gebucht",
        [await wartet.S.kaufenStueck(wStueck.stueck, wStueck.stueck.preis), wartet.meldungen.slice(-1)[0], wartet.saldo()],
        [false, "Nicht gekauft · Speicher voll", 1000]);
    wartet.umgebung.APP.kaufenStueck = vorKauf;

    /* ---------- 4. Zustand über den Tab-Wechsel ---------- */
    const z = welt({ muenzen: 1000 }).zeigen();
    const griff = z.S._griff;
    griff.teilSetzen("vorrat");
    z.S.verlassen();
    z.ort.innerHTML = "";
    z.zeigen();
    gleich("Im Band neu gezeichnet: derselbe Griff, dieselbe Fläche wieder eingehängt, der Reiter bleibt",
        [z.S._griff === griff, z.ort.querySelectorAll(".up-shop").length, z.S._griff.teil(),
            z.ort.querySelector(".up-shop-design").hidden], [true, 1, "vorrat", true]);
    z.S._griff.oeffnen("stueck:" + kennung(z, "kachelset").kennung);
    z.ort.innerHTML = "";
    z.zeigen();
    gleich("… ein offenes Blatt bleibt offen", z.umgebung.UPCREW_BLATT.anzahl(), 1);
    z.umgebung.UPCREW_BLATT.alleSchliessen();
    z.imBand = false;
    z.S.verlassen();
    z.ort.innerHTML = "";
    z.zeigen();
    gleich("Ohne Band neu gebaut: neuer Griff — der gewählte Reiter gilt weiter", [z.S._griff === griff, z.S._griff.teil()], [false, "vorrat"]);
    pruefe("Angemeldet mit eigenem verlassen()", typeof z.S.verlassen === "function"
        && /verlassen: \(\) => SHOP_BILDSCHIRM\.verlassen\(\)/.test(lesen("js/bildschirm-shop.js")));

    /* ---------- 5. Anprobe ---------- */
    const a = welt({ muenzen: 1000 }).zeigen();
    const html = a.dokument.documentElement;
    const set = kennung(a, "kachelset", 1);
    a.S._griff.oeffnen("stueck:" + set.kennung);
    a.anprobeKnopf().click();
    gleich("Anprobe eines Kachel-Sets: angewendet, aber nicht gespeichert",
        [html.dataset.kachelset, a.umgebung.KACHELSETS.gewaehlt(), "kachelset" in a.einstellungen], [set.stueck.wert, "papier", false]);
    gleich("Der Streifen: Name, „Anprobe beenden“, fünf Kacheln",
        [a.streifen.hidden, a.text(a.streifen.querySelector(".anprobe-name")), a.text(a.streifen.querySelector(".knopf")),
            a.streifen.querySelectorAll(".anprobe-kacheln .kachel").length], [false, set.stueck.name, "Anprobe beenden", 5]);
    gleich("Die Anprobe kauft nichts", [a.B.menge(), a.saldo(), a.fragen.length], [{}, 1000, 0]);
    a.streifen.querySelector(".knopf").click();
    gleich("„Anprobe beenden“: zurück auf das Getragene, der Streifen ist weg",
        [html.dataset.kachelset, a.streifen.hidden, a.streifen.textContent], ["papier", true, ""]);

    const getragen = JSON.stringify(a.umgebung.UPCREW_AUSSEHEN.lesen());
    const paket = a.K.stuecke("paket").find((p) => p.wirkt === true);
    const teile = a.K.inhalt(paket).filter((t) => t.wirkt);
    const welt0 = html.style.getPropertyValue("--haupt");
    a.S.anprobieren(teile);
    const farbwelt = teile.find((t) => t.art === "farbwelt");
    const knoepfe = teile.find((t) => t.art === "knoepfe");
    gleich("Anprobe eines Pakets: Farbwelt (und Knöpfe) angewendet, „Paket <Name>“ im Streifen",
        [html.style.getPropertyValue("--haupt"), knoepfe ? html.dataset.knoepfe : "", a.text(a.streifen.querySelector(".anprobe-name"))],
        [a.umgebung.UPCREW_FARBWELTEN.werte(farbwelt.wert, a.umgebung.UPCREW_AUSSEHEN.modus())["--haupt"],
            knoepfe ? knoepfe.wert : "", "Paket " + teile[0].name]);
    gleich("… gespeichert ist weiter das alte Aussehen", JSON.stringify(a.umgebung.UPCREW_AUSSEHEN.lesen()), getragen);
    a.S.verlassen();
    gleich("Tab-Wechsel (verlassen) beendet die Anprobe: Farben wie vorher, Streifen weg",
        [html.style.getPropertyValue("--haupt"), a.streifen.hidden, a.S._anprobe], [welt0, true, null]);
    a.S.anprobieren([]);
    a.S.anprobieren(null);
    gleich("Leere Anprobe: nichts geschieht", [a.streifen.hidden, a.S._anprobe], [true, null]);
    a.S.anprobieren([set.stueck]);
    a.S.anprobeBeenden(true);
    gleich("Ändert sich das echte Aussehen (js\\app.js): Anprobe still beendet", [a.streifen.hidden, html.dataset.kachelset], [true, "papier"]);
})());

/* ------------------------------------------------------------------ *
 * 6. Einbindung und Stil
 * ------------------------------------------------------------------ */
{
    const index = lesen("index.html");
    pruefe("index.html: der Streifen der Anprobe liegt ausserhalb des Bandes (ein eigenes Element nach den Ebenen)",
        index.indexOf("id=\"ebenen\"") < index.indexOf("id=\"anprobe\"")
            && /\n    <div class="anprobe" id="anprobe" hidden><\/div>/.test(index));
    pruefe("app.js beendet die Anprobe, wenn sich das Aussehen ändert", /SHOP_BILDSCHIRM\.anprobeBeenden\(true\)/.test(lesen("js/app.js")));
    const ohne = (name) => lesen(name).replace(/\/\*[\s\S]*?\*\//g, "");
    pruefe("Der Baustein des Shops hat keinen waagrechten Rollbereich", !/overflow(-x)?:\s*(auto|scroll)/.test(ohne("css/upcrew-shop.css")));
    const stil = ohne("css/stil-bildschirme.css");
    const anprobe = (stil.match(/\.anprobe[^{]*\{[^}]*\}/g) || []).join("\n");
    pruefe("Der Streifen: fest über der Seite, höchstens so breit wie der Schirm, nichts rollt",
        /\.anprobe \{[^}]*position: fixed;[^}]*max-width: calc\(100% - 24px\);/.test(stil) && !/overflow(-x)?:\s*(auto|scroll)/.test(anprobe));
    pruefe("Kein eigener Stil an der Fläche des Bausteins (.up-shop)",
        ["css/stil.css", "css/stil-bildschirme.css", "css/stil-blatt.css"].every((d) => !/\.up-shop/.test(ohne(d))));

    /* Die Kurzmeldung („Extra-Leben gekauft") seit 0.34.4 (Rauchprobe 0.34.3:
       bei 360 px zwei Zeilen über den Reitern, beim Ausblenden halb
       durchsichtig). Ob sie im Browser einzeilig ist, misst nur der Browser
       (ansicht\0.34.4). */
    const kurz = (ohne("css/stil.css").match(/\.kurzmeldung \{[^}]*\}/) || [""])[0];
    const weg = (ohne("css/stil.css").match(/\.kurzmeldung-weg \{[^}]*\}/) || [""])[0];
    pruefe("Kurzmeldung: so breit wie ihr Text (nicht halb so breit wie der Schirm), höchstens Schirm − 32 px",
        /width: max-content;/.test(kurz) && /max-width: calc\(100% - 32px\);/.test(kurz));
    pruefe("Kurzmeldung: 8 px oben, enger Rand und Zeilenabstand (zwei Zeilen enden vor den Reitern)",
        /top: calc\(8px \+ var\(--oben-frei\)\);/.test(kurz) && /padding: 8px 18px;/.test(kurz) && /line-height: 1\.25;/.test(kurz));
    pruefe("Kurzmeldung: verschwindet nach oben, nie halb durchsichtig (kein opacity)",
        /transition: transform 250ms ease;/.test(kurz) && /transform: translate\(-50%,/.test(weg) && !/opacity/.test(kurz + weg));
}

fazit();
