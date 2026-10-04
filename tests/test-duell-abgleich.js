/*
 * test-duell-abgleich.js — die Speicher-Schicht des Duells (seit 0.34.0,
 * js\duell-abgleich.js) mit dem echten Modell (js\duell.js, js\wordle.js).
 *
 *   1. Der Schalter: KONFIG.REGEL_14_EINGESPIELT ist false (festgehalten).
 *      Aus = keine dritte Art im Quadrat (der ECHTE Start und der ECHTE
 *      Duell-Bildschirm an einem kleinen DOM) und KEIN Pfad wird berührt —
 *      gezählt an der Schicht und an einer Firebase-Attrappe.
 *   2. Der ganze Ablauf mit der Attrappe der Werkstatt (gespielter Gegner):
 *      herausfordern → Gegner nimmt an → Wörter → 2:0 → Abschluss, dazu
 *      „Einladung liegt vor" über drei Wörter, Ablehnen, Zurückziehen,
 *      Aufgeben, nur EIN Duell, kein Tipp und kein Extra-Leben.
 *   3. Die echte Fassung (SpeicherGemeinsam auf typoluck-intern/duell)
 *      gegen den Regel-Nachbau mit dem ECHTEN Regeltext §14 aus
 *      ..\UPCrew\Firebase-Regeln (nur gelesen; fehlt er, prüft die Stelle
 *      nichts): jeder Schritt zweier Spieler erlaubt, danach ist der Zweig
 *      leer; die Missbrauchs-Fälle der Angriffstabelle verboten. Der Nachbau
 *      bekommt dafür — NUR hier — `now` fest (Date.now) und `.sv` aufgelöst.
 *   4. Warteliste: Netzfehler bleibt, 401 wird verworfen.
 */

const fs = require("fs");
const pfad = require("path");
const vm = require("vm");
const { pruefe, gleich, fazit, speicherAttrappe } = require("./pruefer.js");
require("./umgebung.js");
const { dokumentBauen } = require("./kleines-dom.js");
global.DUELL = require("../js/duell.js");
const { DUELL_ABGLEICH, DuellAttrappe } = require("../js/duell-abgleich.js");
global.DUELL_ABGLEICH = DUELL_ABGLEICH;
const { firebaseMitRegel, wertBei } = require("./regel-nachbau.js");

const A = DUELL_ABGLEICH;
const D = DUELL;
const L = WOERTER_DE.loesungen;
const wurzel = pfad.join(__dirname, "..");
const lesen = (name) => fs.readFileSync(pfad.join(wurzel, name), "utf8");
const T0 = 1800000000000;
let JETZT = T0;

/* Je Person ein Gerät; `als` stellt Gerät und Schicht auf diese Person. */
const geraete = {};
let zufallZahl = 0;
function als(uid, rueckwand, freunde) {
    if (!geraete[uid]) {
        geraete[uid] = speicherAttrappe();
    }
    global.window.localStorage = geraete[uid];
    A.einrichten({
        rueckwand: rueckwand, ich: () => uid, uhr: () => JETZT, loesungen: () => L,
        freunde: () => (freunde || []).map((f) => ({ uid: f, name: f })),
        zufall: () => Array.from({ length: 20 }, (_, i) => (zufallZahl * 7 + i * 13) % 256)
    });
    zufallZahl++;
}

/* Das Wort, das gerade dran ist, und ein falsches (erlaubtes) Wort. */
function loesungJetzt() {
    const d = A.lage.duell;
    return D.wort(d.id, d.kopf.n, A.sicht().nr, L);
}
const falschZu = (wort) => L[(L.indexOf(wort) + 1) % L.length];

/* Ein Wort spielen: `plan` = Liste aus "f" (falsch) und "r" (richtig),
   je Versuch `schritt` ms später. Liefert die Runde. */
async function wortSpielen(plan, schritt) {
    const start = await A.wortBeginnen();
    if (!start.ok) {
        return { start: start };
    }
    const nr = start.eintrag.nr;
    const wort = start.eintrag.runde.loesung;
    let antwort = null;
    for (const z of plan) {
        JETZT += schritt || 5000;
        antwort = await A.raten(nr, z === "r" ? wort : falschZu(wort));
    }
    return { start: start, nr: nr, wort: wort, antwort: antwort };
}

async function hauptlauf() {

    /* ------------------------------------------------------------------ *
     * 1. Der Schalter
     * ------------------------------------------------------------------ */
    gleich("KONFIG.REGEL_14_EINGESPIELT ist false (so wird ausgeliefert)", KONFIG.REGEL_14_EINGESPIELT, false);
    pruefe("… und steht so in js\\konfig.js", /REGEL_14_EINGESPIELT: false,/.test(lesen("js/konfig.js")));
    D._werkstatt = false;
    {
        const wand = { lesen: 0, schreiben: 0,
            async teilLaden() { wand.lesen++; return null; }, async teilSchreiben() { wand.schreiben++; } };
        als("uid-aus", wand, ["uid-b"]);
        await A.lageHolen();
        await A.herausfordern("uid-b");
        await A.annehmen("uid-b");
        await A.ablehnen("uid-b");
        await A.zurueckziehen();
        await A.wortBeginnen();
        await A.raten(0, "abend");
        await A.nachsehen();
        await A.warteSenden();
        await A.aufgeben();
        await A.abschliessen();
        await A.geistHolen(0);
        gleich("Schalter aus: kein Lesen, kein Schreiben (Rückwand und Zähler)",
            [wand.lesen, wand.schreiben, A.zaehler.lesen, A.zaehler.schreiben, A.lage, A.bereit()], [0, 0, 0, 0, null, false]);
    }
    {
        /* Dasselbe mit der echten Leitung an einer Firebase-Attrappe: keine
           einzige Anfrage an einen Duell-Pfad. */
        const fb = firebaseMitRegel(KONFIG.speicher.firebaseBasis, { rules: { ".read": true, ".write": true } });
        const leitung = new SpeicherGemeinsam(KONFIG.speicher.firebaseBasis, A.PFAD);
        leitung._rufen = (e, z, w, adresse) => fb.fetch(adresse, e);
        als("uid-aus", leitung, ["uid-b"]);
        await A.lageHolen();
        await A.herausfordern("uid-b");
        await A.wortBeginnen();
        await A.nachsehen();
        gleich("Schalter aus, echte Leitung: keine Anfrage", fb.aufrufe.length, 0);
    }
    {
        const app = lesen("js/app.js");
        pruefe("js\\app.js baut die echte Duell-Leitung NUR mit eingespielter Regel §14",
            /else if \(KONFIG\.REGEL_14_EINGESPIELT === true && intern\) \{\s*rueckwand = new SpeicherGemeinsam\(KONFIG\.speicher\.firebaseBasis, DUELL_ABGLEICH\.PFAD\);/.test(app)
                && (app.match(/DUELL_ABGLEICH\.PFAD/g) || []).length === 1);
        pruefe("Sonst nennt keine Datei den Duell-Zweig (nur die Schicht, an einer Stelle)",
            fs.readdirSync(pfad.join(wurzel, "js")).filter((d) => d.endsWith(".js") && d !== "duell-abgleich.js")
                .every((d) => !/typoluck-intern\/duell/.test(lesen("js/" + d).replace(/\/\*[\s\S]*?\*\//g, "")))
                && (lesen("js/duell-abgleich.js").replace(/\/\*[\s\S]*?\*\//g, "").match(/typoluck-intern\/duell/g) || []).length === 1);
        pruefe("Die Werkstatt stellt das Duell nur über DUELL._werkstatt an, nie über KONFIG",
            /DUELL\._werkstatt = true;/.test(lesen("js/werkstatt.js")) && !/REGEL_14_EINGESPIELT\s*=[^=]/.test(
                fs.readdirSync(pfad.join(wurzel, "js")).map((d) => lesen("js/" + d)).join("")));
    }
    startPruefen();

    /* ------------------------------------------------------------------ *
     * 2. Der Ablauf mit der Attrappe der Werkstatt
     * ------------------------------------------------------------------ */
    D._werkstatt = true;
    JETZT = T0;
    {
        als("w-ich", null, []);
        const attrappe = new DuellAttrappe("typoluck.duell-attrappe", () => JETZT);
        attrappe.vorDemLesen = A.werkstattGegner("w-ich", ["w-anna", "w-ben"], 3000);
        als("w-ich", attrappe, ["w-anna", "w-ben"]);
        const baum = () => attrappe.baum();

        await A.lageHolen();
        gleich("Werkstatt: frisch kein Duell, keine Einladung", [A.lage.duell, A.lage.einladungen, A.sicht().art], [null, [], "kein"]);
        const r = await A.herausfordern("w-anna");
        const id = A.lage.aktivId;
        gleich("Herausfordern: Duell steht, ich warte und darf Wort 1 schon spielen",
            [r.ok, D.kennungOk(id), A.sicht().art, A.sicht().nr, baum().einladung["w-anna"]["w-ich"], baum().spiele[id].kopf.t],
            [true, true, "wartet-annahme", 0, id, JETZT]);
        pruefe("Zurückziehen geht (vor der Annahme, kein Wort begonnen); Aufgeben nicht", A.zurueckziehenMoeglich() && !A.aufgebenMoeglich());
        const schreibenVorher = A.zaehler.schreiben;
        gleich("Nur EIN Duell: eine zweite Herausforderung wird nicht geschrieben",
            [(await A.herausfordern("w-ben")).grund, A.zaehler.schreiben], ["eins", schreibenVorher]);
        gleich("Auch gegen einen Fremden greift zuerst „nur ein Duell“", (await A.herausfordern("w-fremd")).grund, "eins");
        JETZT += 1000;
        gleich("Nachsehen nach 1 s: noch nicht angenommen", [await A.nachsehen(), A.sicht().art], [false, "wartet-annahme"]);
        JETZT += 3000;
        const lesenVorher = A.zaehler.lesen;
        await A.nachsehen();
        gleich("Nachsehen nach 4 s: Gegner hat angenommen und Wort 1 und 2 vorgelegt",
            [A.sicht().art, A.sicht().nr, A.lage.duell.teil.b.st, !!A.lage.duell.teil.b.w[0], !!A.lage.duell.teil.b.w[1]],
            ["dran", 0, "an", true, true]);
        pruefe("Nachsehen liest erst ein Blatt, dann die Lage", A.zaehler.lesen - lesenVorher >= 2);
        pruefe("Nach der Annahme: Zurückziehen nicht mehr, Aufgeben ja", !A.zurueckziehenMoeglich() && A.aufgebenMoeglich());

        const w0 = await wortSpielen(["f", "r"], 5000);
        gleich("Wort 1: Startmarke = Serverzeit beim Beginn, dann aufgedeckt; Geist des Gegners da",
            [w0.start.ok, w0.start.geist !== null, w0.start.geist && w0.start.geist.zeilen.length, w0.wort, typeof baum().spiele[id].teil.a.w[0].b],
            [true, true, 4, D.wort(id, L.length, 0, L), "number"]);
        const r0 = w0.start.eintrag.runde;
        gleich("Ohne Tipp und Extra-Leben, sechs Versuche", [r0.regeln.ohneTipp, r0.regeln.ohneLeben, WORDLE.versucheMax(r0),
            WORDLE.tippMoeglich(r0)], [true, true, 6, false]);
        const gesendet = baum().spiele[id].teil.a.w[0];
        gleich("Wort 1 gemeldet: m, z, p — keine Buchstaben", [gesendet.m.length, gesendet.z, gesendet.p, /^[RVF]+$/.test(gesendet.m) && /^[0-9]+$/.test(gesendet.z) && Object.keys(gesendet).sort().join() === "b,m,p,z"],
            [10, "00050000010000", D.wertung(true, 2, 10000), true]);
        gleich("Wort 1: ich hole es (2 Versuche gegen 4)", [A.sicht().stand.woerter[0].holt, A.sicht().stand.a, A.sicht().art, A.sicht().nr],
            ["a", 1, "dran", 1]);
        pruefe("Die Runde liegt auf dem Gerät (mit Buchstaben), nicht in der Datenbank",
            JSON.parse(global.window.localStorage.getItem(A.SCHLUESSEL_RUNDE)).runden["0"].runde.loesung === w0.wort
                && JSON.stringify(baum()).indexOf(w0.wort) === -1);

        const w1 = await wortSpielen(["r"], 4000);
        gleich("Wort 2 in einem Versuch: 2:0 = Schluss, gewonnen", [w1.antwort.fertig, A.sicht().art, A.sicht().stand.grund,
            D.ergebnisFuer(A.sicht().stand, "a")], [true, "beendet", "zweiNull", "gewonnen"]);
        pruefe("Nach 2:0 kein Wort 3 und kein Aufgeben", A.sicht().nr === -1 && !A.aufgebenMoeglich()
            && !(await A.wortBeginnen()).ok);
        await A.lageHolen();
        gleich("Der Gegner hat das Ergebnis gesehen (sein Zeiger weg), das Duell liegt noch",
            [!!(baum().aktiv || {})["w-anna"], !!baum().spiele[id]], [false, true]);
        const fertig = await A.abschliessen();
        gleich("Fertig: Duell, Zeiger und Einladung weg — nichts bleibt", [fertig.ok, JSON.stringify(baum()), A.lage.duell], [true, "{}", null]);
        gleich("Beendet auf dem Gerät gemerkt (letzte zehn)", A.beendet().map((e) => [e.gegner, e.ich, e.er, e.ergebnis, e.offen]),
            [["w-anna", 2, 0, "gewonnen", false]]);

        /* Zurückziehen: ein neues Duell, gleich wieder weg. */
        await A.herausfordern("w-ben");
        const zurueck = await A.zurueckziehen();
        gleich("Zurückziehen: alles weg, wieder frei", [zurueck.ok, JSON.stringify(baum()), A.lage.aktivId], [true, "{}", null]);

        /* Aufgeben: Gegner nimmt an, ich gebe auf. */
        await A.herausfordern("w-anna");
        JETZT += 3500;
        await A.lageHolen();
        const auf = await A.aufgeben();
        gleich("Aufgeben: mein Zeiger weg, verloren gemerkt (der Gegner hatte schon gespielt)",
            [auf.ok, A.lage.aktivId, A.beendet()[0].ergebnis, A.beendet()[0].offen], [true, null, "verloren", true]);
        await A.lageHolen();
        gleich("… der Gegner sieht es und löscht das Duell", JSON.stringify(baum()), "{}");
        await A.abschliessen();
        pruefe("Danach frei für ein neues Duell", A.lage.aktivId === null && A.sicht().art === "kein");
    }
    {
        /* Einladung liegt vor: Ben hat herausgefordert und zwei Wörter vorgelegt. */
        JETZT = T0 + 1000000;
        geraete["w-ich2"] = speicherAttrappe();
        als("w-ich2", null, []);
        const attrappe = new DuellAttrappe("typoluck.duell-attrappe", () => JETZT);
        A.werkstattEinladung(attrappe, "w-ben", "w-ich2", "WerkstattBenDuell001", L.length);
        attrappe.vorDemLesen = A.werkstattGegner("w-ich2", ["w-ben"], 3000);
        als("w-ich2", attrappe, ["w-ben"]);
        const baum = () => attrappe.baum();
        await A.lageHolen();
        gleich("Einladung liegt vor (von einem Freund), kein eigenes Duell",
            [A.lage.einladungen, A.lage.duell], [[{ von: "w-ben", id: "WerkstattBenDuell001" }], null]);
        const an = await A.annehmen("w-ben");
        gleich("Annehmen: ich bin B, dran mit Wort 1, Einladung weg",
            [an.ok, A.sicht().rolle, A.sicht().art, A.sicht().nr, !!(baum().einladung)], [true, "b", "dran", 0, false]);
        const w0 = await wortSpielen(["f", "f", "f", "f", "f", "f"], 3000);
        gleich("Wort 1 nicht gelöst (sechs Fehlversuche): p = 70 000 000, kein Extra-Leben",
            [w0.antwort.fertig, baum().spiele.WerkstattBenDuell001.teil.b.w[0].p, WORDLE.lebenMoeglich(w0.antwort.eintrag.runde)],
            [true, D.NICHT_GELOEST, false]);
        await wortSpielen(["r"], 2000);
        gleich("Wort 2 geholt: 1:1, Wort 3 kommt", [A.sicht().stand.b, A.sicht().stand.a, A.sicht().nr], [1, 1, 2]);
        await A.lageHolen();
        const w2 = await wortSpielen(["f", "r"], 4000);
        gleich("Wort 3: Geist (der Gegner hat es inzwischen gespielt), geholt → 2:1, Ende nach drei Wörtern",
            [w2.start.geist !== null, A.sicht().stand.b, A.sicht().stand.a, A.sicht().stand.grund, D.ergebnisFuer(A.sicht().stand, "b")],
            [true, 2, 1, "drei", "gewonnen"]);
        gleich("Drei verschiedene Wörter in diesem Duell", new Set([w0.wort, w2.wort, D.wort("WerkstattBenDuell001", L.length, 1, L)]).size, 3);
        await A.lageHolen();
        await A.abschliessen();
        gleich("Fertig: nichts bleibt", JSON.stringify(baum()), "{}");

        /* Ablehnen. */
        A.werkstattEinladung(attrappe, "w-ben", "w-ich2", "WerkstattBenDuell002", L.length);
        await A.lageHolen();
        const ab = await A.ablehnen("w-ben");
        gleich("Ablehnen: st = ab, Einladung weg, ich bleibe frei",
            [ab.ok, baum().spiele.WerkstattBenDuell002.teil.b.st, !!baum().einladung, A.lage.aktivId], [true, "ab", false, null]);
        /* Einladung eines Nicht-Freunds: nicht gezeigt, gelöscht. */
        A.werkstattEinladung(attrappe, "w-fremd", "w-ich2", "WerkstattFremdDuell1", L.length);
        await A.lageHolen();
        gleich("Einladung eines Nicht-Freunds: nicht gezeigt und gelöscht",
            [A.lage.einladungen.length, !!(baum().einladung && baum().einladung["w-ich2"])], [0, false]);
        /* Gerät älter als der Herausforderer: Bitte aktualisieren. */
        A.werkstattEinladung(attrappe, "w-ben", "w-ich2", "WerkstattBenDuell003", L.length + 5);
        await A.lageHolen();
        gleich("Lösungsliste des Geräts zu kurz: nicht annehmen („aktualisieren“), Einladung bleibt",
            [(await A.annehmen("w-ben")).grund, A.lage.einladungen.length], ["aktualisieren", 1]);
    }

    /* ------------------------------------------------------------------ *
     * 4. Warteliste: Netz weg = bleibt, 401 = verwerfen
     * ------------------------------------------------------------------ */
    {
        let art = "netz";
        const wand = {
            async teilLaden() { return null; },
            async teilSchreiben() {
                const fehler = new Error(art);
                if (art === "401") {
                    fehler.status = 401;
                }
                throw fehler;
            }
        };
        geraete["w-warte"] = speicherAttrappe();
        als("w-warte", wand, []);
        global.window.localStorage.setItem(A.SCHLUESSEL_WARTE, JSON.stringify([
            { wem: "w-warte", id: "WerkstattBenDuell009", rolle: "b", nr: 0, m: "RRRRR", z: "0001000", p: 10001000 },
            { wem: "jemand", id: "x", rolle: "a", nr: 0, m: "", z: "", p: D.NICHT_GELOEST }]));
        await A.warteSenden();
        gleich("Netzfehler: das Ergebnis bleibt in der Warteliste (fremde Einträge auch)",
            JSON.parse(global.window.localStorage.getItem(A.SCHLUESSEL_WARTE)).length, 2);
        art = "401";
        await A.warteSenden();
        gleich("401 (Frist, Gegner hat aufgegeben): verworfen, nicht wiederholt",
            JSON.parse(global.window.localStorage.getItem(A.SCHLUESSEL_WARTE)).map((w) => w.wem), ["jemand"]);
    }

    /* ------------------------------------------------------------------ *
     * 3. Die echte Fassung gegen die Regel §14
     * ------------------------------------------------------------------ */
    D._werkstatt = false;
    await regelPruefen();
}

/* ---------------------------------------------------------------------- *
 * Der Start: dritte Art nur, wenn das Duell an ist (echte Dateien, kleines DOM)
 * ---------------------------------------------------------------------- */
function startPruefen() {
    const DATEIEN = ["js/woerter-de.js", "js/woerter-rate-de.js", "js/wordle.js", "js/wortbewertung-daten.js",
        "js/wortbewertung-korrektur.js", "js/wortbewertung.js", "js/wortarten-daten.js", "js/bibliothek.js",
        "js/upcrew-platz.js", "js/upcrew-blatt.js", "js/bausteine.js", "js/bildschirm-start.js",
        "js/start-bibliothek.js", "js/bildschirm-wordle.js", "js/duell.js", "js/duell-abgleich.js", "js/bildschirm-duell.js"];
    function welt(konfig) {
        const dokument = dokumentBauen();
        const s = { gezeigt: [] };
        const umgebung = {
            console, setTimeout, clearTimeout, Promise,
            document: dokument, localStorage: speicherAttrappe(),
            matchMedia: () => ({ matches: true, addEventListener() { } }),
            history: { state: null, length: 1, pushState() { }, replaceState() { }, back() { } },
            addEventListener() { }, removeEventListener() { }, scrollTo() { },
            KONFIG: konfig,
            ICH: { person: () => null, spielstand: () => null, spielstandSetzen() { } },
            ANMELDUNG: { ich: () => null },
            APP: { jetzt: () => new Date(2026, 9, 4, 12), eigenesErgebnis: () => null, bibliothekStand: () => ({ figuren: {}, schwuere: {} }),
                durchgang: () => ({ herzen: 5, tinte: 1 }), bibliothekMitnahme: () => ({ effekt: "", ueben: 0 }), fortschritt: () => ({}) },
            NAVIGATION: { aktuell: "anders", anmelden(b) { s.angemeldet = b; }, zeigen: (id, p) => s.gezeigt.push([id, p]),
                auffrischen() { }, veralten() { }, zurueck() { } },
            ZUSTAND: { laden: () => dokument.createElement("div"), leer: () => dokument.createElement("div") },
            DIALOG: { kurzmeldung() { }, frage: () => Promise.resolve(false) }
        };
        umgebung.window = umgebung;
        vm.createContext(umgebung);
        for (const datei of DATEIEN) {
            vm.runInContext(lesen(datei), umgebung, { filename: datei });
        }
        vm.runInContext("globalThis.START = START; globalThis.DUELL = DUELL; globalThis.DUELL_BILDSCHIRM = DUELL_BILDSCHIRM;"
            + " globalThis.DUELL_ABGLEICH = DUELL_ABGLEICH;", umgebung);
        s.u = umgebung;
        return s;
    }
    const aus = welt({ REGEL_14_EINGESPIELT: false });
    aus.u.DUELL_BILDSCHIRM.anmelden();
    gleich("Schalter aus: der Bildschirm meldet sich an, die Art fehlt (Quadrat: Bibliothek · Üben)",
        [aus.angemeldet.id, aus.u.START.ARTEN.map((a) => a.id)], ["duell", ["bibliothek", "ueben"]]);
    aus.u.localStorage.setItem("typoluck.start-art", "duell");
    gleich("Schalter aus: eine gemerkte Art „duell“ fällt auf die Vorgabe zurück", aus.u.START.art(), "bibliothek");

    const an = welt({ REGEL_14_EINGESPIELT: true });
    an.u.DUELL_BILDSCHIRM.anmelden();
    an.u.DUELL_BILDSCHIRM.artEintragen();
    gleich("Schalter an: Duell ist die dritte Art, genau einmal", an.u.START.ARTEN.map((a) => a.id), ["bibliothek", "ueben", "duell"]);
    an.u.localStorage.setItem("typoluck.start-art", "duell");
    const ort = an.u.document.createElement("main");
    an.u.document.body.appendChild(ort);
    an.u.START.zeigen(ort, null);
    const texte = (sel) => ort.querySelectorAll(sel).map((e) => e.textContent.replace(/\s+/g, " ").trim());
    gleich("Ohne Konto: die Karte sagt es, der Knopf ist aus",
        [!!ort.querySelector(".start-karte-duell"), texte(".start-spielen .knopf-text"), ort.querySelector(".start-spielen").disabled],
        [true, ["Duell"], true]);
    gleich("Das Zeichen der Art ist der Platz „start/art-duell“, die Karte hat den Platz „duell/vs-bild“",
        [ort.querySelectorAll(".start-art-knopf .up-platz").map((p) => p.dataset.platz),
            ort.querySelectorAll(".start-karte-duell .up-platz").map((p) => p.dataset.platz)],
        [["start/art-duell"], ["duell/vs-bild"]]);
    /* Mit Konto und einer gelesenen Lage: herausfordern / annehmen. */
    const AB = an.u.DUELL_ABGLEICH;
    AB.einrichten({ rueckwand: { teilLaden: async () => null, teilSchreiben: async () => { } }, ich: () => "uid-x" });
    AB.lage = { wem: "uid-x", aktivId: null, duell: null, einladungen: [], zeit: Date.now() };
    ort.textContent = "";
    an.u.START.zeigen(ort, null);
    gleich("Kein Duell: „Freund herausfordern“", texte(".start-spielen .knopf-text"), ["Freund herausfordern"]);
    AB.lage.einladungen = [{ von: "uid-y", id: "AAAAAAAAAAAAAAAAAAA1" }];
    ort.textContent = "";
    an.u.START.zeigen(ort, null);
    gleich("Einladung liegt vor: „Annehmen“ · „Ablehnen“", texte(".start-spielen .knopf-text"), ["Annehmen", "Ablehnen"]);
    /* Seit 0.34.4 (Rauchprobe 0.34.3): bei einer Einladung kein „kein Duell“
       daneben — auf der Karte und in der Übersicht. */
    gleich("Karte mit Einladung: nur „Einladung · …“, kein „kein Duell“",
        texte(".duell-karte-mitte p"), ["Einladung · Gegner"]);
    const uebersicht = an.u.document.createElement("div");
    an.u.DUELL_BILDSCHIRM._ohneDuellZeichnen(uebersicht, AB.lage);
    gleich("Übersicht mit Einladung: „Einladung · …“, kein „kein Duell“",
        uebersicht.querySelectorAll("p").map((e) => e.textContent), ["Einladung · Gegner"]);
    AB.lage.einladungen = [];
    const leer = an.u.document.createElement("div");
    an.u.DUELL_BILDSCHIRM._ohneDuellZeichnen(leer, AB.lage);
    gleich("Übersicht ohne Einladung: „kein Duell“", leer.querySelectorAll("p").map((e) => e.textContent), ["kein Duell"]);
    ort.textContent = "";
    an.u.START.zeigen(ort, null);
    gleich("Karte ohne Einladung: „kein Duell“", texte(".duell-karte-mitte p"), ["kein Duell"]);
    /* Der Kopf über den Spalten der Wörter (seit 0.34.4). */
    const woerter = an.u.DUELL_BILDSCHIRM._woerterBauen({ teil: { a: { w: [] }, b: { w: [] } } },
        { rolle: "a", gegner: "uid-y", stand: { ende: false, woerter: [0, 1, 2].map((nr) => ({ nr, a: null, b: null, holt: null })) } });
    const zeilenTexte = woerter.querySelectorAll(".duell-wort").map((z) => z.children.map((c) => c.textContent));
    gleich("Wörter: zuerst ein Kopf (leer · Du · Gegner · Punkt), dann je Wort eine Zeile mit denselben vier Spalten",
        [zeilenTexte[0], zeilenTexte.length, zeilenTexte.every((z) => z.length === 4),
            woerter.querySelectorAll(".duell-wort-kopf").length], [["", "Du", "Gegner", "Punkt"], 4, true, 1]);
    const duellStil = lesen("css/stil-duell.css").replace(/\/\*[\s\S]*?\*\//g, "");
    pruefe("Stil: die Wort-Zeilen haben feste Rand-Spalten (der Kopf steht über denselben Spalten)",
        /\.duell-wort \{\s*grid-template-columns: 4em 1fr 1fr 4em;\s*\}/.test(duellStil));
    pruefe("Stil: der Platz „duell/vs-bild“ sitzt in der Übersicht mittig (auch ohne Duell, über „Beendet“)",
        /\.duell \.duell-vs-bild \{[^}]*align-self: center;/.test(duellStil));
    pruefe("Kein Stil lässt das Duell waagrecht rollen",
        !/overflow-x:\s*(auto|scroll)|white-space:\s*nowrap/.test(lesen("css/stil-duell.css").replace(/\/\*[\s\S]*?\*\//g, "")));
    pruefe("Die Runde baut Tasten über WORDLE_BILDSCHIRM._tasteBauen und Kacheln über _kachelBauen, keinen eigenen <button>",
        /WORDLE_BILDSCHIRM\._tasteBauen\(/.test(lesen("js/bildschirm-duell.js"))
            && /WORDLE_BILDSCHIRM\._kachelBauen\(/.test(lesen("js/bildschirm-duell.js"))
            && !/createElement\("button"\)/.test(lesen("js/bildschirm-duell.js")));
    pruefe("Das Duell meldet keinen Fortschritt, keine Münzen (Belohnungen ruhen)",
        !/fortschrittMelden|UPCREW_MUENZEN|muenzen/i.test((lesen("js/bildschirm-duell.js") + lesen("js/duell-abgleich.js") + lesen("js/duell.js"))
            .replace(/\/\*[\s\S]*?\*\//g, "")));
}

/* ---------------------------------------------------------------------- *
 * 3. Gegen den Regel-Nachbau mit dem echten Regeltext §14
 * ---------------------------------------------------------------------- */
async function regelPruefen() {
    const REGELDATEI = pfad.join(wurzel, "..", "UPCrew", "Firebase-Regeln", "2026-10-04 NEUE Regel mit 14 (NOCH NICHT EINSPIELEN).txt");
    if (!fs.existsSync(REGELDATEI)) {
        console.log("(Regeltext §14 nicht gefunden — Abschnitt 3 prüft nichts)");
        return;
    }
    const regeln = JSON.parse(fs.readFileSync(REGELDATEI, "utf8").replace(/^\uFEFF/, ""));
    pruefe("Regeltext §14: der Zweig duell steht in typoluck-intern", !!regeln.rules["typoluck-intern"].duell);
    const BASIS = KONFIG.speicher.firebaseBasis;
    const fb = firebaseMitRegel(BASIS, regeln);
    for (const uid of ["probe-a", "probe-b", "probe-c"]) {
        fb.konten[uid] = { email: uid + "@x.invalid", passwort: "p", anonym: false };
        fb.tokens["tok-" + uid] = uid;
    }
    fb.db = { spieler: {
        konten: { "probe-a": { n: 1 }, "probe-b": { n: 1 }, "probe-c": { n: 1 } },
        oeffentlich: { "probe-a": { name: "A" }, "probe-b": { name: "B" }, "probe-c": { name: "C" }, "gast-g": { name: "G", gast: true } }
    } };

    /* Nur hier: `now` fest (Date.now während der Prüfung) und `.sv` = jetzt. */
    const echtesNow = Date.now;
    Date.now = () => JETZT;
    const sv = (wert) => (wert && typeof wert === "object")
        ? (wert[".sv"] === "timestamp" ? JETZT : Object.fromEntries(Object.entries(wert).map(([k, v]) => [k, sv(v)]))) : wert;
    class Leitung extends SpeicherGemeinsam {
        constructor(token) {
            super(BASIS, A.PFAD);
            this.token = token;
        }
        async _rufen(einstellungen, zeitlimit, was, adresse) {
            const e = Object.assign({}, einstellungen);
            if (e.body) {
                e.body = JSON.stringify(sv(JSON.parse(e.body)));
            }
            return fb.fetch(adresse + (adresse.indexOf("?") === -1 ? "?" : "&") + (this.token ? "auth=" + this.token : ""), e);
        }
    }
    const leitung = (uid) => new Leitung(uid ? "tok-" + uid : "");
    const darf = async (uid, aenderungen) => {
        try {
            await leitung(uid).teilSchreiben(aenderungen);
            return true;
        } catch (fehler) {
            return fehler.status === 401 ? false : "Fehler: " + fehler.message;
        }
    };
    const absichtlich = new Set();
    const darfLesen = async (uid, weg) => {
        absichtlich.add(fb.aufrufe.length);
        try {
            await leitung(uid).teilLaden(weg);
            return true;
        } catch (fehler) {
            return fehler.status === 401 ? false : "Fehler: " + fehler.message;
        }
    };
    const zweig = () => wertBei(fb.db, ["typoluck-intern", "duell"]);
    const alt = KONFIG.REGEL_14_EINGESPIELT;
    KONFIG.REGEL_14_EINGESPIELT = true;
    const freund = { "probe-a": ["probe-b", "probe-c", "gast-g"], "probe-b": ["probe-a"], "probe-c": ["probe-a"] };
    const sei = (uid) => als(uid, leitung(uid), freund[uid]);
    try {
        /* --- Lauf 1: A fordert B, spielt vor; B nimmt an; 2:0 ----------- */
        JETZT = T0;
        sei("probe-a");
        await A.lageHolen();
        const h = await A.herausfordern("probe-b");
        const X = A.lage.aktivId;
        gleich("§14 erlaubt: Herausfordern (Kopf mit Serverzeit, Zeiger, Einladung)", [h.ok, A.lage.fehler, A.sicht().art], [true, false, "wartet-annahme"]);
        JETZT += 1000;
        const a0 = await wortSpielen(["f", "r"], 6000);
        JETZT += 1000;
        const a1 = await wortSpielen(["r"], 5000);
        gleich("§14 erlaubt: A legt Wort 1 und 2 vor der Annahme vor (Beginn, Ergebnis)",
            [a0.start.ok, a0.antwort.fertig, a1.start.ok, a1.antwort.fertig, A.wartet().length], [true, true, true, true, 0]);
        gleich("§14 verbietet: Wort 3 vor dem Gegner", await darf("probe-a", D.schrittWortBeginnen(X, "a", 2)), false);
        gleich("§14 verbietet: A gibt vor der Annahme auf (F2: nur Zurückziehen)",
            await darf("probe-a", D.schrittAufgeben(X, "a", "probe-a")), false);
        gleich("§14 verbietet: B spielt vor der Annahme", await darf("probe-b", D.schrittWortBeginnen(X, "b", 0)), false);
        gleich("§14 verbietet: A verbessert sein Ergebnis", await darf("probe-a",
            { ["spiele/" + X + "/teil/a/w/0/p"]: D.wertung(true, 1, 1) }), false);
        gleich("§14 verbietet: A löscht ein Blatt seines Worts", await darf("probe-a", { ["spiele/" + X + "/teil/a/w/0/m"]: null }), false);
        gleich("§14 verbietet: ein zweites Duell (eigener Zeiger hält das erste)", await darf("probe-a",
            D.schrittHerausfordern("BBBBBBBBBBBBBBBBBBB2", "probe-a", "probe-c", 567)), false);

        sei("probe-b");
        JETZT += 60000;
        await A.lageHolen();
        gleich("§14 erlaubt: B liest seine Einladung", [A.lage.fehler, A.lage.einladungen.map((e) => e.von)], [false, ["probe-a"]]);
        const an = await A.annehmen("probe-a");
        gleich("§14 erlaubt: Annehmen (st an + Zeiger + Einladung weg)", [an.ok, A.sicht().art, A.sicht().rolle], [true, "dran", "b"]);
        const b0 = await wortSpielen(["f", "f", "r"], 7000);
        gleich("§14 erlaubt: B spielt Wort 1, der Geist von A war da", [b0.start.ok, b0.start.geist !== null, b0.antwort.fertig], [true, true, true]);
        const b1 = await wortSpielen(["r"], 9000);
        gleich("A holt beide Wörter: 2:0, Schluss", [b1.antwort.fertig, A.sicht().art, A.sicht().stand.a, A.sicht().stand.b,
            D.ergebnisFuer(A.sicht().stand, "b")], [true, "beendet", 2, 0, "verloren"]);
        gleich("§14 verbietet: nach 2:0 Aufgeben", await darf("probe-b", D.schrittAufgeben(X, "b", "probe-b")), false);
        gleich("§14 verbietet: nach 2:0 ein drittes Wort", await darf("probe-b", D.schrittWortBeginnen(X, "b", 2)), false);
        gleich("§14 verbietet: C überschreibt ein fremdes Ergebnis", await darf("probe-c",
            { ["spiele/" + X + "/teil/a/w/0/p"]: D.wertung(true, 6, 1) }), false);
        gleich("§14 verbietet: B schreibt in den Teil von A", await darf("probe-b", { ["spiele/" + X + "/teil/a/st"]: "auf" }), false);
        gleich("§14 verbietet: Fremde lesen das Duell, Listen sind zu",
            [await darfLesen("probe-c", "spiele/" + X), await darfLesen("probe-a", "spiele"), await darfLesen("probe-b", "aktiv/probe-a"),
                await darfLesen("probe-a", "einladung/probe-b"), await darfLesen(null, "spiele/" + X), await darfLesen("probe-a", "")],
            [false, false, false, false, false, false]);
        const bFertig = await A.abschliessen();
        gleich("§14: B schliesst zuerst ab — das Duell darf er noch nicht löschen, nur seinen Zeiger",
            [bFertig.ok, A.beendet()[0].offen, !!wertBei(fb.db, ["typoluck-intern", "duell", "spiele", X])], [true, true, true]);
        sei("probe-a");
        await A.lageHolen();
        gleich("A sieht das Ergebnis: gewonnen", [A.sicht().art, D.ergebnisFuer(A.sicht().stand, "a")], ["beendet", "gewonnen"]);
        const aFertig = await A.abschliessen();
        gleich("§14 erlaubt: A als Zweiter löscht das Duell — der Zweig ist leer", [aFertig.ok, A.beendet()[0].offen, zweig()],
            [true, false, null]);

        /* --- Lauf 2: drei Wörter (1:1, dann 2:1) ------------------------ */
        JETZT += 3600000;
        sei("probe-a");
        await A.lageHolen();
        await A.herausfordern("probe-b");
        const Y = A.lage.aktivId;
        sei("probe-b");
        await A.lageHolen();
        await A.annehmen("probe-a");
        await wortSpielen(["r"], 3000);
        await wortSpielen(["f", "f", "f", "f", "f", "f"], 3000);
        sei("probe-a");
        await A.lageHolen();
        await wortSpielen(["f", "f", "f", "f", "f", "f"], 2000);
        await wortSpielen(["r"], 2000);
        gleich("1:1 nach zwei Wörtern: Wort 3 für beide", [A.sicht().stand.a, A.sicht().stand.b, A.sicht().nr], [1, 1, 2]);
        await wortSpielen(["f", "r"], 4000);
        sei("probe-b");
        await A.lageHolen();
        const b2 = await wortSpielen(["f", "f", "r"], 4000);
        gleich("§14 erlaubt: Wort 3 erst, als beide zwei hatten; Ende 2:1 für A", [b2.start.ok, A.sicht().art, A.sicht().stand.a,
            A.sicht().stand.b, A.sicht().stand.grund], [true, "beendet", 2, 1, "drei"]);
        gleich("§14 verbietet: nach drei Wörtern Aufgeben", await darf("probe-b", D.schrittAufgeben(Y, "b", "probe-b")), false);
        await A.abschliessen();
        sei("probe-a");
        await A.lageHolen();
        await A.abschliessen();
        gleich("Lauf 2: der Zweig ist danach leer", zweig(), null);

        /* --- Lauf 3: Aufgabe, Ablehnen, Zurückziehen, Verfall ----------- */
        sei("probe-a");
        await A.lageHolen();
        await A.herausfordern("probe-b");
        sei("probe-b");
        await A.lageHolen();
        await A.annehmen("probe-a");
        await wortSpielen(["r"], 3000);
        const auf = await A.aufgeben();
        gleich("§14 erlaubt: B gibt auf (st auf + Zeiger); A hatte nie begonnen = ohne Wertung", [auf.ok, A.beendet()[0].ergebnis], [true, "ohne Wertung"]);
        sei("probe-a");
        await A.lageHolen();
        gleich("A sieht die Aufgabe (ohne Wertung, er hatte nie begonnen), Löschen erlaubt",
            [D.ergebnisFuer(A.sicht().stand, "a"), (await A.abschliessen()).ok, zweig()], ["ohne Wertung", true, null]);

        await A.herausfordern("probe-b");
        sei("probe-b");
        await A.lageHolen();
        gleich("§14 erlaubt: Ablehnen", (await A.ablehnen("probe-a")).ok, true);
        sei("probe-a");
        await A.lageHolen();
        gleich("§14 erlaubt: A räumt das abgelehnte Duell beim Lesen auf, ist frei", [A.lage.aktivId, zweig()], [null, null]);

        await A.herausfordern("probe-b");
        gleich("§14 erlaubt: Zurückziehen (Duell + Zeiger + Einladung)", [(await A.zurueckziehen()).ok, zweig()], [true, null]);

        await A.herausfordern("probe-b");
        JETZT += D.FRIST_ANNAHME_MS + 1000;
        sei("probe-b");
        await A.lageHolen();
        gleich("§14: nach 48 h keine Annahme mehr — B löscht die Einladung", [(await A.annehmen("probe-a")).grund, A.lage.einladungen.length],
            ["verfallen", 0]);
        const Z = Object.keys(wertBei(fb.db, ["typoluck-intern", "duell", "spiele"]) || {})[0];
        gleich("§14 verbietet: Annehmen nach 48 h (auch direkt)", await darf("probe-b", D.schrittAnnehmen(Z, "probe-b", "probe-a")), false);
        sei("probe-a");
        await A.lageHolen();
        gleich("§14 erlaubt: A räumt das verfallene Duell auf", [A.lage.aktivId, zweig()], [null, null]);

        /* --- Lauf 4: Missbrauch am laufenden Duell, dann die Frist ------ */
        JETZT += 3600000;
        sei("probe-a");
        await A.lageHolen();
        await A.herausfordern("probe-b");
        const W = A.lage.aktivId;
        sei("probe-b");
        await A.lageHolen();
        await A.annehmen("probe-a");
        sei("probe-a");
        await A.lageHolen();
        await wortSpielen(["r"], 3000);
        gleich("§14 verbietet: A löscht das laufende Duell (Niederlage verstecken) / zieht nach der Annahme zurück",
            [await darf("probe-a", D.schrittAbschluss(W, "probe-a")), await darf("probe-a", D.schrittZurueckziehen(W, "probe-a", "probe-b"))],
            [false, false]);
        gleich("§14 verbietet: Zeiger lösen, solange das Duell läuft", await darf("probe-a", D.schrittZeigerLoesen("probe-a")), false);
        gleich("§14 verbietet: unbekannte Felder", [await darf("probe-a", { ["spiele/" + W + "/teil/a/w/1/q"]: 1 }),
            await darf("probe-a", { ["spiele/" + W + "/teil/a/x"]: 1 }), await darf("probe-a", { ["spiele/" + W + "/teil/c/st"]: "auf" })],
        [false, false, false]);
        gleich("§14 verbietet: eigene Uhr als Startmarke", await darf("probe-a", { ["spiele/" + W + "/teil/a/w/1/b"]: 12345 }), false);
        gleich("§14 erlaubt: Startmarke mit Serverzeit", await darf("probe-a", D.schrittWortBeginnen(W, "a", 1)), true);
        gleich("§14 verbietet: Ergebnis passt nicht zum Muster (gelöst ohne RRRRR)",
            await darf("probe-a", D.schrittWortMelden(W, "a", 1, "FFFFF", "0001000", D.wertung(true, 1, 1000))), false);
        gleich("§14 verbietet: nur ein Teil des Ergebnisses", await darf("probe-a", { ["spiele/" + W + "/teil/a/w/1/p"]: D.NICHT_GELOEST }), false);
        gleich("§14 verbietet: im Namen eines anderen herausfordern", await darf("probe-c",
            D.schrittHerausfordern("CCCCCCCCCCCCCCCCCCC3", "probe-a", "probe-c", 567)), false);
        gleich("§14 verbietet: Einladung ohne Duell", await darf("probe-c", { "einladung/probe-a/probe-c": "CCCCCCCCCCCCCCCCCCC3" }), false);
        gleich("§14 verbietet: einen Gast herausfordern", await darf("probe-c",
            D.schrittHerausfordern("CCCCCCCCCCCCCCCCCCC3", "probe-c", "gast-g", 567)), false);
        gleich("§14 erlaubt: C fordert A heraus (A hat schon ein Duell)", await darf("probe-c",
            D.schrittHerausfordern("CCCCCCCCCCCCCCCCCCC3", "probe-c", "probe-a", 567)), true);
        gleich("§14 verbietet: A nimmt eine zweite Einladung an (nur ein Duell)", await darf("probe-a",
            D.schrittAnnehmen("CCCCCCCCCCCCCCCCCCC3", "probe-a", "probe-c")), false);
        gleich("§14 erlaubt: C zieht zurück", await darf("probe-c", D.schrittZurueckziehen("CCCCCCCCCCCCCCCCCCC3", "probe-c", "probe-a")), true);
        JETZT = wertBei(fb.db, ["typoluck-intern", "duell", "spiele", W, "kopf", "t"]) + D.FRIST_DUELL_MS + 1;
        gleich("§14 verbietet nach der Frist (F1): Ergebnis eines begonnenen Worts, neues Wort, Aufgeben",
            [await darf("probe-a", D.schrittWortMelden(W, "a", 1, "RRRRR", "0001000", D.wertung(true, 1, 1000))),
                await darf("probe-b", D.schrittWortBeginnen(W, "b", 0)), await darf("probe-b", D.schrittAufgeben(W, "b", "probe-b"))],
            [false, false, false]);
        sei("probe-b");
        await A.lageHolen();
        gleich("Nach der Frist: beendet, das einseitige Wort zählt für A", [A.sicht().art, A.sicht().stand.grund, A.sicht().stand.a],
            ["beendet", "frist", 1]);
        gleich("§14 erlaubt nach der Frist: jeder der beiden löscht", [(await A.abschliessen()).ok,
            !!wertBei(fb.db, ["typoluck-intern", "duell", "spiele", W])], [true, false]);
        sei("probe-a");
        await A.lageHolen();
        gleich("A: Zeiger ins Leere wird gelöst, alles leer", [A.lage.aktivId, zweig()], [null, null]);
        gleich("Ohne Anmeldung: der ganze Zweig ist zu (Aussenmessung)", await darfLesen(null, ""), false);
        pruefe("Kein Schritt hat je `geaendertAm` angefasst", !fb.aufrufe.some((a) => /geaendertAm/.test(a.pfad))
            && fb.aufrufe.every((a) => a.pfad.indexOf("/typoluck-intern/duell") === 0));
        pruefe("Schmal gelesen: nie die Listen spiele, aktiv oder einladung als Ganzes",
            !fb.aufrufe.some((a, i) => !absichtlich.has(i) && a.methode === "GET" && /\/duell(\/(spiele|aktiv|einladung))?$/.test(a.pfad)));
    } finally {
        KONFIG.REGEL_14_EINGESPIELT = alt;
        Date.now = echtesNow;
    }
}

hauptlauf().then(() => fazit(), (fehler) => {
    pruefe("Ablauf ohne Ausnahme", false, fehler && fehler.stack);
    fazit();
});
