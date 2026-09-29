/*
 * test-regel-12.js — Regel §12 „Spielerdaten schützen", Phase A: Typoluck
 * kann beides (seit 0.22.0; Apps\UPCrew\docs\DATENBANK-KONZEPT-12.md,
 * Abschnitte 4, 5, 10 und 12). Typoluck-Fassung von
 * Apps\Blunderluck\tests\test-regel-12.js (v0.154.0).
 *
 * Die ECHTEN Dateien (konto.js, speicher.js, spieler.js, fortschritt.js,
 * fortschritt-abgleich.js, anmeldung.js …) laufen gegen eine nachgebaute
 * Firebase, deren Datenbank von der ECHTEN Regel geschützt wird
 * (tests\regel-nachbau.js, Kopie aus Blunderluck, wertet die
 * Regel-Ausdrücke aus): erst die heutige Regel §11c (Blunderlucks
 * SICHERHEIT.md, „Die GESAMTE Regel"), dann §12 (Konzept Abschnitt 11). So
 * wird der Umstieg durchgespielt: Konten unter der alten Regel anlegen →
 * Regel §12 → UP#Plus zieht nach → alle Wege unter §12 → und zurück.
 *
 * Die Regeltexte liegen in den Nachbar-Ordnern (nur gelesen). Fehlen sie,
 * sagt der Test das und prüft nichts.
 *
 * Nachbau ≠ Firebase: Die Gegenprobe gegen den Firebase-Emulator fehlt.
 */

const pfad = require("path");
const dateisystem = require("fs");
const vm = require("vm");
const { RegelNachbau, firebaseMitRegel, wertBei } = require("./regel-nachbau.js");

let anzahlOk = 0;
let anzahlFehler = 0;

async function pruefe(bezeichnung, funktion) {
    try {
        await funktion();
        anzahlOk++;
    } catch (fehler) {
        anzahlFehler++;
        console.error("FEHLER: " + bezeichnung);
        console.error("        " + (fehler && fehler.stack ? fehler.stack.split("\n").slice(0, 3).join(" | ") : fehler));
    }
}

function gleich(ist, soll, was) {
    const a = JSON.stringify(ist);
    const b = JSON.stringify(soll);
    if (a !== b) {
        throw new Error((was || "Wert") + ": erwartet " + b + ", war " + a);
    }
}

function wahr(bedingung, was) {
    if (!bedingung) {
        throw new Error((was || "Bedingung") + " war nicht erfüllt");
    }
}

const projekt = pfad.join(__dirname, "..");
const sicherheitPfad = pfad.join(projekt, "..", "Blunderluck", "SICHERHEIT.md");
const konzeptPfad = pfad.join(projekt, "..", "UPCrew", "docs", "DATENBANK-KONZEPT-12.md");

if (!dateisystem.existsSync(sicherheitPfad) || !dateisystem.existsSync(konzeptPfad)) {
    console.log("Regeltexte nicht gefunden (Blunderluck\\SICHERHEIT.md, UPCrew\\docs\\DATENBANK-KONZEPT-12.md)"
        + " — nichts geprüft");
    console.log("0 ok, 0 Fehler");
    process.exit(0);
}

/* Der Block einer Sprache nach einer Überschrift. */
function blockNach(text, marke, sprache) {
    const start = text.indexOf(marke);
    if (start === -1) {
        throw new Error("Abschnitt fehlt: " + marke);
    }
    const a = text.indexOf("```" + sprache, start) + ("```" + sprache).length + 1;
    return text.slice(a, text.indexOf("```", a));
}

/* Zeilenenden zählen nicht (Konzept und SICHERHEIT.md liegen seit 29.09.2026 mit CRLF) — wie in
   Blunderlucks test-regel-12.js (v0.159.0). */
const sicherheit = dateisystem.readFileSync(sicherheitPfad, "utf8").replace(/\r/g, "");
const konzept = dateisystem.readFileSync(konzeptPfad, "utf8").replace(/\r/g, "");
const TEXT_11C = blockNach(sicherheit, "**Die GESAMTE Regel (§11 + §11a + §11b + §11c)", "text");
/* Geprüft wird gegen die EINGESPIELTE Regel (SICHERHEIT.md §14). Seit Blunderluck v0.159.0 trägt das
   Konzept Abschnitt 11 die Regel MIT Grau; sie steht in SICHERHEIT.md als §15 (vorbereitet). */
const TEXT_12 = blockNach(sicherheit, "## 14. Regel §12", "text");
const TEXT_12_GRAU = blockNach(sicherheit, "## 15. Regel §13", "text");
const TEXT_KONZEPT = blockNach(konzept, "## 11. Regeltext §12", "json");
const REGEL_11C = JSON.parse(TEXT_11C);
const REGEL_12 = JSON.parse(TEXT_12);

const BASIS = "https://upcrew-7a29d-default-rtdb.europe-west1.firebasedatabase.app";
const OBER = "yJaWLaK5Kah6fxmnXfDycJhO5cF3";
const PW = { ober: "Stark#Pw9", anna: "Anna#Pass1", bert: "Bert#Pass1", jonas: "Jonas#Pw1", neu: "Neu#Pass2" };

/* ------------------------------------------------------------------ *
 * Die App in einer eigenen Umgebung (wie test-konto.js, dazu Fortschritt,
 * Abzeichen und der Fortschritt-Abgleich)
 * ------------------------------------------------------------------ */

function appLaden(fb) {
    const gespeichert = {};
    const dialog = { antworten: [], hinweise: [], kurz: [], listen: [] };
    const geraet = {
        getItem(s) { return (s in gespeichert) ? gespeichert[s] : null; },
        setItem(s, w) { gespeichert[s] = String(w); },
        removeItem(s) { delete gespeichert[s]; }
    };
    const umgebung = {
        console, URL, URLSearchParams, AbortController, TextEncoder, Uint8Array, Uint32Array, atob, btoa,
        crypto: globalThis.crypto,
        setTimeout, clearTimeout,
        setInterval() { return 0; },
        fetch: (a, e) => fb.fetch(a, e),
        document: { body: { classList: { add() {}, remove() {} } }, addEventListener() {}, hidden: false },
        window: { localStorage: geraet, addEventListener() {}, setTimeout, clearTimeout },
        KONFIG: {
            APP_VERSION: "test",
            speicher: {
                modus: "gemeinsam", firebaseBasis: BASIS, spielerPfad: "spieler", spielPfad: "typoluck",
                abfrageIntervallMs: 5000, schreibVerzoegerungMs: 0,
                lokalerSchluesselSpieler: "typoluck.spieler", lokalerSchluesselSpiel: "typoluck.spiel"
            },
            konto: { apiKey: "test-schluessel", domain: "konten.upcrew.invalid" }
        },
        DIALOG: {
            async frage() { return dialog.antworten.shift(); },
            async eingabe() { return dialog.antworten.shift(); },
            async liste(titel, text, eintraege) {
                dialog.listen.push({ titel, text, eintraege });
                return dialog.antworten.shift();
            },
            async hinweis(t, x) { dialog.hinweise.push(t + ": " + x); },
            kurzmeldung(t) { dialog.kurz.push(t); }
        },
        NAVIGATION: { zeigen() {} }
    };
    umgebung.globalThis = umgebung;
    vm.createContext(umgebung);

    const quelltext = ["konto.js", "upcrew-abzeichen.js", "fortschritt.js", "fortschritt-abgleich.js",
        "versiegelung.js", "spieler.js", "ich.js", "speicher.js", "abgleich.js", "anmeldung.js",
        "woerter-de.js", "wortbewertung-daten.js", "wortbewertung-korrektur.js", "wortbewertung.js",
        "wortstatistik.js", "wortstatistik-abgleich.js", "spielzeit.js"]
        .map((name) => dateisystem.readFileSync(pfad.join(projekt, "js", name), "utf8"))
        .join("\n;\n")
        + "\nObject.assign(globalThis, { KONTO, FORTSCHRITT, FORTSCHRITT_ABGLEICH, SPIELER, ICH, ANMELDUNG,"
        + " Abgleich, SpeicherGemeinsam, SpeicherKonten, speicherErzeugen, WORTSTATISTIK, WORTSTATISTIK_ABGLEICH,"
        + " WORTBEWERTUNG, WOERTER_DE, SPIELZEIT });";
    vm.runInContext(quelltext, umgebung, { filename: "typoluck-regel-12.js" });

    const { KONTO, SPIELER, ANMELDUNG, KONFIG } = umgebung;
    KONTO.einrichten(KONFIG);
    umgebung.SpeicherGemeinsam.tokenGeber = () => KONTO.token();
    const speicher = umgebung.speicherErzeugen(KONFIG.speicher, "spieler", "typoluck.spieler", null,
        { eigeneUid: () => KONTO.uid(), aufbereiten: (roh) => SPIELER.normalisieren(roh) }).speicher;
    const abgleich = new umgebung.Abgleich(speicher, KONFIG.speicher, {});
    ANMELDUNG.verbinden(abgleich, { hidden: true, innerHTML: "" });
    return { umgebung, KONTO, SPIELER, ANMELDUNG, FORTSCHRITT: umgebung.FORTSCHRITT, abgleich, speicher, dialog };
}

async function laden(w) {
    w.abgleich.daten = w.SPIELER.normalisieren(await w.speicher.laden());
    return w.abgleich.daten;
}

/* Anmelden wie der Knopf im Formular (js/anmeldung.js): KONTO prüft, unter
   §12 wird danach nachgeladen, dann übernommen. */
async function anmeldenWieFormular(w, name, passwort) {
    const ergebnis = await w.KONTO.anmeldenMitEingabe(w.abgleich.daten, name, passwort);
    if (ergebnis.ok) {
        await w.ANMELDUNG._nachAnmeldungLaden();
        w.ANMELDUNG._uebernehmen(ergebnis.spieler);
    }
    return ergebnis;
}

/* Eine Firebase mit UP#Plus (wie das Werkzeug es anlegte) unter der Regel §11c. */
function firebaseAnlegen() {
    const fb = firebaseMitRegel(BASIS, REGEL_11C);
    fb.kontoAnlegen(OBER, "up-plus@konten.upcrew.invalid", PW.ober);
    fb.db = { spieler: {
        geaendertAm: 1,
        konten: { [OBER]: { id: "id-ober", name: "UP", tag: "Plus", uid: OBER, kennung: "up-plus" } },
        namen: { up: { Plus: OBER } }
    } };
    return fb;
}

/* Unter der ALTEN Regel: Anna, Bert und zweimal Jonas (gleiches Passwort). */
async function kontenAnlegen(fb) {
    const w = appLaden(fb);
    await laden(w);
    gleich(w.KONTO.regel, "alt", "alte Regel erkannt");
    const anlegen = async (name, passwort) => {
        await laden(w);
        const ergebnis = await w.KONTO.kontoAnlegen(w.speicher, w.abgleich.daten, name, passwort);
        wahr(ergebnis.ok, "angelegt " + name + ": " + JSON.stringify(ergebnis));
        const eintrag = ergebnis.eintrag;
        w.KONTO.abmelden();
        return eintrag;
    };
    const anna = await anlegen("Anna", PW.anna);
    const bert = await anlegen("Bert", PW.bert);
    const jonas1 = await anlegen("Jonas", PW.jonas);
    fb.kontoAnlegen("uid-jonas2", "k-jonas2@konten.upcrew.invalid", PW.jonas);
    fb.db.spieler.konten["uid-jonas2"] = { id: "id-jonas2", name: "Jonas", tag: "7777", uid: "uid-jonas2",
        kennung: "k-jonas2", freunde: [], abgelehnt: [], abzeichen: [],
        fortschritt: { version: 1, spiele: { typoluck: { xp: 900, partien: 12 } } } };
    fb.db.spieler.namen.jonas = Object.assign({}, fb.db.spieler.namen.jonas, { "7777": "uid-jonas2" });
    return { anna, bert, jonas1 };
}

async function umsteigen(fb) {
    fb.regelSetzen(REGEL_12);
    const w = appLaden(fb);
    const an = await w.KONTO.anmelden("up-plus", PW.ober);
    wahr(an.ok, "UP#Plus angemeldet");
    await laden(w);
    gleich(w.KONTO.regel, "p12", "Regel §12 erkannt");
    const ergebnis = await w.KONTO.nachziehen(w.speicher);
    wahr(ergebnis.ok, "nachgezogen: " + JSON.stringify(ergebnis));
    return { w, ergebnis };
}

async function angemeldetAls(fb, name, passwort) {
    const w = appLaden(fb);
    await laden(w);
    const ergebnis = await anmeldenWieFormular(w, name, passwort);
    wahr(ergebnis.ok, "angemeldet " + name + ": " + JSON.stringify(ergebnis));
    return w;
}

const spieler = (fb) => fb.db.spieler;

/* ------------------------------------------------------------------ *
 * Die Prüfungen
 * ------------------------------------------------------------------ */

(async () => {

    await pruefe("Regeltext §12: gültiges JSON, Konzept = Blunderlucks SICHERHEIT.md §14 bzw. §15 (mit Grau); §11c-Zeilen bis auf die geänderten enthalten", () => {
        wahr(REGEL_12.rules && REGEL_12.rules.spieler, "Regel §12 gelesen");
        wahr(JSON.parse(TEXT_12_GRAU).rules.spieler, "Regel §12 mit Grau gelesen");
        /* Seit 0.24.0 (Blunderluck v0.155.2): derselbe Text steht in
           SICHERHEIT.md §14 und im Konzept Abschnitt 11; seit 0.27.0 trägt
           das Konzept die Regel mit Grau = SICHERHEIT.md §15. */
        gleich(TEXT_KONZEPT === (TEXT_KONZEPT.indexOf("\"umstellung\"") !== -1 ? TEXT_12_GRAU : TEXT_12), true,
            "Konzept Abschnitt 11 = SICHERHEIT.md §14 bzw. §15");
        wahr(TEXT_12.indexOf("\"spielzeitOeffentlich\"") !== -1, "Regeltext mit spielzeitOeffentlich (v0.155.2)");
        const zeilen12 = new Set(TEXT_12.split("\n").map((z) => z.trim()));
        const fehlen = TEXT_11C.split("\n").map((z) => z.trim())
            .filter((z) => /"\.(read|write|validate)"/.test(z) && !zeilen12.has(z));
        /* Geändert laut Konzept: `geaendertAm` (+ .read), `namen/$name/$tag`;
           seit v0.155.0 dazu `blunderluck` (.write wandert nach unten,
           Löschregel) und `team-schach` (mehrzeilig) — wie in Blunderlucks
           test-regel-12.js. */
        gleich(fehlen.map((z) => z.slice(0, 15)), ["\"geaendertAm\": ", "\"$tag\": { \".wri",
            "\".write\": \"auth", "\"team-schach\": "], "nur die geänderten Zeilen fehlen");
        wahr(REGEL_11C.rules.spieler[".read"] === true && REGEL_12.rules.spieler[".read"] === undefined,
            "spieler/.read gestrichen");
        wahr(REGEL_12.rules.typoluck, "Bereich typoluck bleibt");
    });

    await pruefe("Regel-Nachbau: Nummern-Codes (0001, 9999, A7K2 ja; AB1C, OABC, a7k2, ABC nein; Plus nur UP#Plus)", () => {
        const nachbau = new RegelNachbau(REGEL_12);
        const auth = { uid: "uid-x", provider: "password" };
        const geht = (tag, wer) => nachbau.schreibenPruefen({}, [{ weg: ["spieler", "namen", "jonas", tag],
            wert: (wer || auth).uid }], wer || auth).ok;
        for (const tag of ["0001", "9999", "A7K2"]) {
            wahr(geht(tag), tag + " abgelehnt");
        }
        for (const tag of ["AB1C", "OABC", "a7k2", "ABC"]) {
            wahr(!geht(tag), tag + " angenommen");
        }
        wahr(!geht("Plus"), "Plus für andere angenommen");
        wahr(geht("Plus", { uid: OBER, provider: "password" }), "Plus für UP#Plus abgelehnt");
    });

    const fb = firebaseAnlegen();
    let konten = null;
    let umstieg = null;

    await pruefe("Alte Regel: Konten anlegen wie bisher, keine §12-Knoten; ganzes spieler gelesen", async () => {
        konten = await kontenAnlegen(fb);
        wahr(!spieler(fb).oeffentlich && !spieler(fb).anmeldung, "keine §12-Knoten unter der alten Regel");
        const w = appLaden(fb);
        await laden(w);
        gleich(w.KONTO.regel, "alt", "alt");
        wahr(w.abgleich.daten.spieler.some((s) => s.name === "Anna" && s.tag), "alte Regel: ganze Liste mit Nummern");
    });

    await pruefe("Regel-Erkennung: 200 = alt, 401 = §12, Netzfehler = bleibt", async () => {
        const w = appLaden(fb);
        gleich(await w.KONTO.regelErkennen(), "alt", "200");
        fb.regelSetzen(REGEL_12);
        gleich(await w.KONTO.regelErkennen(), "p12", "401");
        const netz = fb.fetch;
        fb.fetch = async () => { throw new Error("offline"); };
        gleich(await w.KONTO.regelErkennen(), "p12", "Netzfehler: bleibt");
        fb.fetch = netz;
        fb.regelSetzen(REGEL_11C);
    });

    await pruefe("Umstieg: Regel §12, UP#Plus zieht nach — zweimal = dasselbe", async () => {
        umstieg = await umsteigen(fb);
        const anzahl = Object.keys(spieler(fb).konten).length;
        gleich(umstieg.ergebnis.geschrieben, anzahl, "alle Konten nachgezogen");
        gleich(Object.keys(spieler(fb).oeffentlich).length, anzahl, "Auszug für jedes Konto");
        gleich(Object.keys(spieler(fb).anmeldung.jonas).length, 2, "beide Jonas im Verzeichnis");
        const nochmal = await umstieg.w.KONTO.nachziehen(umstieg.w.speicher);
        gleich([nochmal.geschrieben, nochmal.uebersprungen], [0, anzahl], "zweiter Lauf: nichts zu tun");
        const auszug = spieler(fb).oeffentlich["uid-jonas2"];
        gleich(Object.keys(auszug).sort(), ["auszug", "id", "name", "tag"], "nur erlaubte Felder (seit 0.24.0 mit #Tag)");
        gleich(auszug.auszug.xp, 900, "XP im Auszug (Typoluck-Zweig)");
    });

    await pruefe("§12 nachziehen: nur UP#Plus; Knopf in der Typoluck-Verwaltung nur für UP#Plus unter §12", async () => {
        const w = await angemeldetAls(fb, "Anna", PW.anna);
        wahr(!(await w.KONTO.nachziehen(w.speicher)).ok, "Anna darf nicht nachziehen");
        const quelle = dateisystem.readFileSync(pfad.join(projekt, "js", "bildschirm-verwaltung.js"), "utf8");
        wahr(/!KONTO\.istP12\(\) \|\| KONTO\.uid\(\) !== KONTO\.OBER_UID/.test(quelle), "Bedingung des Knopfs");
    });

    await pruefe("§12 Lesen: niemand liest spieler ganz; fremde nur als Auszug, der eigene voll", async () => {
        const w = await angemeldetAls(fb, "Anna", PW.anna);
        const vorher = fb.aufrufe.length;
        const daten = await laden(w);
        const aufrufe = fb.aufrufe.slice(vorher).filter((a) => a.methode === "GET");
        wahr(!aufrufe.some((a) => a.pfad === "/spieler" && !a.flach), "spieler ganz gelesen");
        wahr(!aufrufe.some((a) => a.pfad === "/spieler/konten"), "alle Konten gelesen");
        const ich = daten.spieler.find((s) => s.name === "Anna");
        wahr(ich && ich.tag && ich.kennung, "eigener Eintrag mit Nummer");
        const bert = daten.spieler.find((s) => s.name === "Bert");
        wahr(bert && bert.tag && !bert.kennung && !bert.fortschritt && bert.auszug, "Bert nur als Auszug (seit 0.24.0 mit Nummer)");
        wahr(w.SPIELER.istVerteiler(daten.spieler.find((s) => s.uid === OBER)), "UP#Plus ohne Nummer erkannt");
        wahr(!w.SPIELER.mitspieler(daten).some((s) => s.uid === OBER), "UP#Plus in keiner Liste");
        const jonas = daten.spieler.filter((s) => s.name === "Jonas");
        /* Seit 0.23.0 „#Tag" bei allen — seit 0.24.0 (Blunderluck v0.155.0)
           steht er unter §12 auch im fremden Auszug. */
        gleich(jonas.map((s) => w.SPIELER.nummerZusatz(daten, s)), jonas.map((s) => "#" + s.tag), "fremde mit #Tag aus dem Auszug");
        wahr(jonas.every((s) => /^[0-9A-Z]{4}$/.test(s.tag)), "beide Jonas mit Nummer");
        gleich(w.SPIELER.nummerZusatz(daten, ich), "#" + ich.tag, "eigener mit #Tag");
    });

    await pruefe("§12 Anmelden: vor der Anmeldung keine Spieler; falsches Passwort, Gast, unbekannt; danach eigener Eintrag", async () => {
        const w = appLaden(fb);
        await laden(w);
        gleich(w.abgleich.daten.spieler.length, 0, "vor der Anmeldung keine Spieler");
        gleich((await w.KONTO.anmeldenMitEingabe(w.abgleich.daten, "Anna", "Falsch#Pw1")).fehler, "falsch", "falsch");
        gleich((await w.KONTO.anmeldenMitEingabe(w.abgleich.daten, "Gast", "x")).fehler, "gast", "Gast-Name");
        gleich((await w.KONTO.anmeldenMitEingabe(w.abgleich.daten, "Zora", PW.anna)).fehler, "unbekannt", "unbekannt");
        const gut = await anmeldenWieFormular(w, "anna", PW.anna);
        wahr(gut.ok, "Anna angemeldet");
        wahr(w.ANMELDUNG.ich() && w.ANMELDUNG.ich().tag === konten.anna.tag, "eigener Eintrag nach der Anmeldung da");
    });

    await pruefe("§12 Anmelden: gleiche Namen + gleiches Passwort → Auswahl mit Nummer erst nach dem Passwort", async () => {
        const w = appLaden(fb);
        await laden(w);
        const ergebnis = await w.KONTO.anmeldenMitEingabe(w.abgleich.daten, "Jonas", PW.jonas);
        gleich(ergebnis.fehler, "auswahl", "Auswahl");
        gleich(ergebnis.auswahl.map((s) => s.tag).sort(), [konten.jonas1.tag, "7777"].sort(), "Nummern der Treffer");
        w.dialog.antworten = [String(ergebnis.auswahl.findIndex((s) => s.tag === "7777"))];
        const gewaehlt = await w.ANMELDUNG._kontoAuswaehlen(ergebnis.auswahl, PW.jonas);
        wahr(gewaehlt.ok && w.KONTO.uid() === "uid-jonas2", "gewählt angemeldet");
        wahr(w.ANMELDUNG.ich() && w.ANMELDUNG.ich().uid === "uid-jonas2", "eigener Eintrag nachgeladen");
        const direkt = appLaden(fb);
        await laden(direkt);
        const mitNummer = await direkt.KONTO.anmeldenMitEingabe(direkt.abgleich.daten, "Jonas#7777", PW.jonas);
        wahr(mitNummer.ok && direkt.KONTO.uid() === "uid-jonas2", "Name#Nummer direkt");
    });

    await pruefe("§12 Freund suchen: nur Name#Nummer, gezielt; nur Name → Hinweis", async () => {
        const w = await angemeldetAls(fb, "Bert", PW.bert);
        gleich((await w.KONTO.freundFinden(w.abgleich.daten, "Anna")).fehler, "nummer", "nur Name");
        const vorher = fb.aufrufe.length;
        const fund = await w.KONTO.freundFinden(w.abgleich.daten, "Anna#" + konten.anna.tag);
        gleich(fund.spieler && fund.spieler.name, "Anna", "gefunden");
        wahr(fb.aufrufe.slice(vorher).some((a) => a.pfad === "/spieler/namen/anna/" + konten.anna.tag), "gezielt gelesen");
        wahr(!(await w.KONTO.freundFinden(w.abgleich.daten, "Anna#0000")).spieler, "falsche Nummer: niemand");
        const seite = dateisystem.readFileSync(pfad.join(projekt, "js", "bildschirm-freunde.js"), "utf8");
        wahr(/KONTO\.freundFinden\(ANMELDUNG\.abgleich\.daten, eingabe\)/.test(seite)
            && /"Name#Nummer nötig"/.test(seite), "Freunde-Bildschirm sucht über freundFinden");
    });

    await pruefe("§12 Nummer ändern: EIN Schritt (neuer Platz, alter frei, Konto); Suche folgt", async () => {
        const w = await angemeldetAls(fb, "Anna", PW.anna);
        const alt = konten.anna.tag;
        const ich = w.ANMELDUNG.ich();
        spieler(fb).namen.anna = Object.assign({}, spieler(fb).namen.anna, { "5555": "uid-fremd" });
        const abgelehnt = await w.KONTO.tagAendern(w.speicher, w.abgleich.daten, ich, "5555");
        gleich(abgelehnt.text, "Diese Nummer ist vergeben.", "besetzt");
        const patchVorher = fb.aufrufe.filter((a) => a.methode === "PATCH").length;
        const neu = await w.KONTO.tagAendern(w.speicher, w.abgleich.daten, ich, "4242");
        wahr(neu.ok, "freie Nummer: " + JSON.stringify(neu));
        gleich(fb.aufrufe.filter((a) => a.methode === "PATCH").length - patchVorher, 1, "EIN Schritt");
        gleich(spieler(fb).namen.anna["4242"], ich.uid, "neuer Platz");
        wahr(!(alt in spieler(fb).namen.anna), "alter Platz frei");
        const b = await angemeldetAls(fb, "Bert", PW.bert);
        wahr((await b.KONTO.freundFinden(b.abgleich.daten, "Anna#4242")).spieler, "neue Nummer gefunden");
        wahr(!(await b.KONTO.freundFinden(b.abgleich.daten, "Anna#" + alt)).spieler, "alte nicht mehr");
        konten.anna.tag = "4242";
    });

    await pruefe("§12 Konto anlegen und Gast: Konto, Auszug, Verzeichnis in einem Schritt; Gast ohne Verzeichnis", async () => {
        const w = appLaden(fb);
        await laden(w);
        const ergebnis = await w.KONTO.kontoAnlegen(w.speicher, w.abgleich.daten, "Carla", "Carla#Pw1");
        wahr(ergebnis.ok, "angelegt: " + JSON.stringify(ergebnis));
        const uid = w.KONTO.uid();
        wahr(spieler(fb).konten[uid] && spieler(fb).oeffentlich[uid] && spieler(fb).anmeldung.carla[uid],
            "Konto, Auszug, Verzeichnis");
        const g = appLaden(fb);
        await laden(g);
        const gast = await g.KONTO.gastAnlegen(g.speicher, g.abgleich.daten);
        wahr(gast.ok, "Gast: " + JSON.stringify(gast));
        gleich(spieler(fb).oeffentlich[g.KONTO.uid()].gast, true, "Auszug mit gast");
        wahr(!spieler(fb).anmeldung.gast, "Gast nicht im Verzeichnis");
    });

    await pruefe("§12 Marke: steigt bei öffentlichen Änderungen (Freund), nicht beim Aussehen", async () => {
        const w = await angemeldetAls(fb, "Anna", PW.anna);
        await laden(w);
        const uid = w.KONTO.uid();
        await w.speicher.speichern(w.abgleich.daten);
        const marke = spieler(fb).geaendertAm;
        const mitAussehen = JSON.parse(JSON.stringify(w.abgleich.daten));
        mitAussehen.spieler.find((s) => s.uid === uid).aussehenJe = { typoluck: { farbwelt: "gold", stand: 5 } };
        await w.speicher.speichern(mitAussehen);
        gleich(spieler(fb).konten[uid].aussehenJe.typoluck.farbwelt, "gold", "Aussehen geschrieben");
        gleich(spieler(fb).geaendertAm, marke, "Marke unverändert");
        const bertId = mitAussehen.spieler.find((s) => s.name === "Bert").id;
        const ichId = mitAussehen.spieler.find((s) => s.uid === uid).id;
        await w.speicher.speichern(w.SPIELER.freundHinzufuegen(mitAussehen, ichId, bertId));
        wahr(spieler(fb).geaendertAm > marke, "Marke gestiegen");
        wahr(JSON.stringify(spieler(fb).oeffentlich[uid].freunde).indexOf(bertId) !== -1, "Freund im Auszug");
    });

    await pruefe("§12 Typoluck: Fortschritt als Teilpfad + Auszug im selben Schritt (FORTSCHRITT_ABGLEICH.senden)", async () => {
        const w = await angemeldetAls(fb, "Anna", PW.anna);
        const uid = w.KONTO.uid();
        const U = w.umgebung;
        U.FORTSCHRITT_ABGLEICH.einrichten(w.speicher, () => uid, () => uid);
        const stand = { version: 1, spiele: { typoluck: { xp: 640, partien: 9, stand: 5, tage: ["2026-09-28"] } } };
        const ok = await U.FORTSCHRITT_ABGLEICH.senden(stand);
        wahr(ok, "gesendet");
        gleich(spieler(fb).konten[uid].fortschritt.spiele.typoluck.xp, 640, "Fortschritt am Konto");
        gleich(spieler(fb).oeffentlich[uid].auszug.xp, 640, "Auszug zog mit");
        gleich(spieler(fb).oeffentlich[uid].tag, spieler(fb).konten[uid].tag, "Nummer im Auszug = die am Konto (seit 0.24.0)");
        gleich(Object.keys(spieler(fb).oeffentlich[uid]).indexOf("kennung"), -1, "keine Kennung im Auszug");
    });

    await pruefe("§12 Typoluck: Aussehen je Spiel als Teilpfad wird angenommen", async () => {
        const w = await angemeldetAls(fb, "Anna", PW.anna);
        const uid = w.KONTO.uid();
        await w.speicher.teilSchreiben({ ["konten/" + uid + "/aussehenJe/typoluck"]: { farbwelt: "feld", stand: 9 } });
        gleich(spieler(fb).konten[uid].aussehenJe.typoluck.farbwelt, "feld", "geschrieben");
    });

    await pruefe("§12 Spielzeit (0.24.0): Haken am Konto gezielt, Auszug mit/ohne Spielzeit; nur Ja/Nein, nur der Besitzer; §11c nimmt es an", async () => {
        const w = await angemeldetAls(fb, "Anna", PW.anna);
        const uid = w.KONTO.uid();
        const U = w.umgebung;
        U.APP = { spielerSpeicher: w.speicher, fortschrittId: () => uid, _aussehenUid: () => uid,
            fortschritt: () => U.FORTSCHRITT.laden(uid) };
        U.FORTSCHRITT_ABGLEICH.einrichten(w.speicher, () => uid, () => uid);
        wahr(U.SPIELZEIT._eigener() && U.SPIELZEIT.oeffentlich() === false, "eigener Eintrag, Standard privat");
        const stand = U.FORTSCHRITT.spielzeitZaehlen({ version: 1, spiele: { typoluck: { xp: 10, stand: 5 } } },
            100, Date.now(), "typoluck");
        U.FORTSCHRITT.aendern(uid, () => ({ stand: stand }));
        wahr(await U.FORTSCHRITT_ABGLEICH.senden(stand), "gesendet");
        gleich(spieler(fb).konten[uid].fortschritt.spiele.typoluck.zaehler.spielzeit, 100, "Spielzeit am Konto (§11b)");
        wahr(!("spielzeit" in spieler(fb).oeffentlich[uid].auszug.werte), "privat: nicht im Auszug");
        wahr(await U.SPIELZEIT.oeffentlichSetzen(true), "Haken an");
        gleich(spieler(fb).konten[uid].spielzeitOeffentlich, true, "Haken am Konto");
        gleich(spieler(fb).oeffentlich[uid].auszug.werte.spielzeit, 100, "öffentlich: im eigenen Auszug");
        const mehr = U.FORTSCHRITT.spielzeitZaehlen(stand, 20, Date.now(), "typoluck");
        U.FORTSCHRITT.aendern(uid, () => ({ stand: mehr }));
        wahr(await U.FORTSCHRITT_ABGLEICH.senden(mehr), "nochmal gesendet");
        gleich(spieler(fb).oeffentlich[uid].auszug.werte.spielzeit, 120, "Auszug zieht mit");
        wahr(await U.SPIELZEIT.oeffentlichSetzen(false), "Haken aus");
        wahr(!("spielzeit" in spieler(fb).oeffentlich[uid].auszug.werte), "wieder privat");
        const nachbau = new RegelNachbau(REGEL_12);
        const weg = (a) => Object.keys(a).map((k) => ({ weg: ["spieler"].concat(k.split("/")), wert: a[k] }));
        const auth = { uid: uid, provider: "password" };
        wahr(!nachbau.schreibenPruefen(fb.db, weg({ geaendertAm: 9, ["konten/" + uid + "/spielzeitOeffentlich"]: "ja" }),
            auth).ok, "nur Ja/Nein");
        const baum = JSON.parse(JSON.stringify(fb.db));
        baum.spieler.rollen = Object.assign({}, baum.spieler.rollen, { "u-adm": "admin" });
        wahr(!nachbau.schreibenPruefen(baum, weg(U.SPIELZEIT.aenderungen(uid, true, 9)),
            { uid: "u-adm", provider: "password" }).ok, "ein Admin ändert den Haken nicht");
        wahr(nachbau.schreibenPruefen(fb.db, weg(U.SPIELZEIT.aenderungen(uid, true, 9)), auth).ok, "Besitzer darf");
        const alt = new RegelNachbau(REGEL_11C);
        wahr(alt.schreibenPruefen(fb.db, weg(U.SPIELZEIT.aenderungen(uid, true, 9)), auth).ok,
            "§11c nimmt das Feld gezielt an");
    });

    await pruefe("Auszug: nur erlaubte Felder; Level und fünf Abzeichen = aus dem vollen Fortschritt", async () => {
        const w = appLaden(fb);
        const F = w.FORTSCHRITT;
        const A = w.umgebung.UPCREW_ABZEICHEN;
        const heute = "2026-09-28";
        const staende = [
            null,
            { version: 1, spiele: { typoluck: { xp: 4321, partien: 57, tage: ["2026-09-26", "2026-09-27", "2026-09-28"],
                zaehler: { serie: 3, serieBis: 20260928, besteSerie: 9, figuren: 12, tagesaufgaben: 20, beideTage: 2 } },
            blunderluck: { xp: 800, partien: 30, tage: ["2026-09-27"], zaehler: { tagesaufgaben: 5 } } } }
        ];
        for (const stand of staende) {
            const a = F.auszug(stand, heute);
            gleich(Object.keys(a).sort(), ["serie", "serieBis", "werte", "xp"], "Felder");
            gleich(F.auszugLevel(a).level, F.level(stand).level, "Level");
            const sauber = F.normalisieren(stand);
            const laufend = F.serie(sauber, heute, F.schutzVerdient(F.level(sauber).level)).tage;
            const voll = A.liste(sauber, laufend).map((e) => [e.id, e.wert, e.erreicht]);
            const ausAuszug = A.liste(F.auszugAlsStand(a), F.auszugSerie(a, heute)).map((e) => [e.id, e.wert, e.erreicht]);
            gleich(ausAuszug, voll, "fünf Abzeichen");
        }
        const oeff = w.KONTO.oeffentlichVon({ id: "i", name: "N", tag: "0001", kennung: "k", uid: "u",
            aussehen: {}, fortschritt: staende[1], stufe: {}, freunde: ["a"], abzeichen: [] });
        gleich(Object.keys(oeff).sort(), ["auszug", "freunde", "id", "name", "tag"], "öffentlich nur erlaubte Felder (seit 0.24.0 mit #Tag)");
    });

    await pruefe("401 mitten im Lauf: alte Regel zurück → App fällt von selbst in den Modus alt, und wieder vor", async () => {
        const w = await angemeldetAls(fb, "Anna", PW.anna);
        gleich(w.KONTO.regel, "p12", "p12");
        fb.regelSetzen(REGEL_11C);
        await laden(w);
        const bertId = w.abgleich.daten.spieler.find((s) => s.name === "Bert").id;
        const ichId = w.ANMELDUNG.ich().id;
        let abgelehnt = false;
        try {
            await w.speicher.speichern(w.SPIELER.freundAblehnen(w.abgleich.daten, ichId, bertId));
        } catch (fehler) {
            abgelehnt = true;
        }
        wahr(abgelehnt, "Schreiben mit §12-Knoten unter der alten Regel abgelehnt");
        await laden(w);
        gleich(w.KONTO.regel, "alt", "neu erkannt: alt");
        await w.speicher.speichern(w.SPIELER.freundAblehnen(w.abgleich.daten, ichId, bertId));
        fb.regelSetzen(REGEL_12);
        await laden(w);
        gleich(w.KONTO.regel, "p12", "401 beim Laden: neu erkannt");
        wahr(wertBei(fb.db, ["spieler", "oeffentlich"]), "Knoten stehen noch");
    });

    /* ---------------------------------------------------------------- *
     * Typoluck-Teil (seit 0.23.1): Lexikon, Wortstatistik, Schwierigkeit
     * gegen die echte Regel §12 (`typoluck-intern`). Der Nachbau kennt
     * `.sv` nicht — die Hülle unten löst `{".sv": {"increment": n}}` vor
     * dem Prüfen so auf, wie der Server es tut.
     * ---------------------------------------------------------------- */
    const echtesFetch = fb.fetch;
    fb.fetch = async (adresse, einstellungen) => {
        if (einstellungen && einstellungen.method === "PATCH" && typeof einstellungen.body === "string"
                && einstellungen.body.indexOf(".sv") !== -1) {
            const basisPfad = new URL(adresse).pathname.replace(/\.json$/, "").split("/").filter((t) => t);
            const inhalt = JSON.parse(einstellungen.body);
            for (const k of Object.keys(inhalt)) {
                const w = inhalt[k];
                if (w && typeof w === "object" && w[".sv"] && typeof w[".sv"].increment === "number") {
                    const alt = wertBei(fb.db, basisPfad.concat(k.split("/")));
                    inhalt[k] = (typeof alt === "number" ? alt : 0) + w[".sv"].increment;
                }
            }
            einstellungen = Object.assign({}, einstellungen, { body: JSON.stringify(inhalt) });
        }
        return echtesFetch(adresse, einstellungen);
    };
    const intern = (w) => new w.umgebung.SpeicherGemeinsam(BASIS, "typoluck-intern");
    const WS12 = require("../js/wortstatistik.js");
    const LOESUNGEN = require("../js/woerter-de.js").loesungen;
    const KEY = WS12.schluessel("abend");
    const abgelehnt = async (speicher, a) => {
        try {
            await speicher.teilSchreiben(a);
            return false;
        } catch (fehler) {
            return fehler.status === 401;
        }
    };
    /* Anmelden direkt mit der Kennung (unabhängig vom Anmeldeverzeichnis,
       damit dieser Teil nur `typoluck-intern` prüft). */
    const direkt = async (eintrag, passwort) => {
        const w = appLaden(fb);
        const an = await w.KONTO.anmelden(eintrag.kennung, passwort);
        wahr(an.ok, "angemeldet " + eintrag.name);
        await laden(w);
        return w;
    };
    const lesenGesperrt = async (speicher, p) => {
        try {
            await speicher.teilLaden(p);
            return false;
        } catch (fehler) {
            return fehler.status === 401;
        }
    };

    await pruefe("§12 Lexikon: UP#Plus spielt die Werkzeug-Datei ein; Spieler lesen das Lexikon nicht", async () => {
        const up = appLaden(fb);
        await up.KONTO.anmelden("up-plus", PW.ober);
        await laden(up);
        const voll = require("../werkzeug/wortbewertung-voll.js");
        const gepr = WS12.lexikonPruefen(JSON.parse(JSON.stringify(WS12.lexikonExport(voll, {}, LOESUNGEN))));
        for (const schritt of WS12.lexikonSchritte(gepr.eintraege)) {
            await intern(up).teilSchreiben(schritt);
        }
        gleich(fb.db["typoluck-intern"].lexikon[KEY].w, "abend", "eingespielt");
        const anna = await direkt(konten.anna, PW.anna);
        wahr(await lesenGesperrt(intern(anna), "lexikon"), "Anna liest das Lexikon nicht");
    });

    await pruefe("§12 Wortstatistik: Runde → EIN Schritt (Datensatz + Summen) angenommen; zweite Runde w…", async () => {
        const w = await direkt(konten.anna, PW.anna);
        const uid = w.KONTO.uid();
        const A = w.umgebung.WORTSTATISTIK_ABGLEICH;
        A.einrichten(intern(w), w.speicher, () => uid, () => uid, () => true);
        const runde = { modus: "tag", loesung: "abend", versuche: ["tisch", "abend"], zustand: "gewonnen",
            begonnenAm: 1000, beendetAm: 61000, tipps: [], extra: 0 };
        A.melden(runde, "2026-10-01", 5);
        await new Promise((r) => setTimeout(r, 50));
        await A.senden();
        const satz = fb.db["typoluck-intern"].runden[uid][KEY];
        gleich([satz.r, satz.l, fb.db["typoluck-intern"].summen[KEY].a2, fb.db["typoluck-intern"].summen[KEY].n],
            [1, "a2", 1, 1], "Datensatz und Summen");
        A.melden(Object.assign({}, runde, { versuche: ["tisch"], zustand: "verloren" }), "2026-10-02", 6);
        await new Promise((r) => setTimeout(r, 50));
        await A.senden();
        gleich([fb.db["typoluck-intern"].runden[uid][KEY].r, fb.db["typoluck-intern"].summen[KEY].w0,
            fb.db["typoluck-intern"].summen[KEY].n], [2, 1, 2], "zweite Runde");
        gleich(A.warte().length, 0, "Warteschlange leer");
        gleich(fb.db.spieler.konten[uid].stufe.typoluck.runden, 2, "Stufe am Konto");
        wahr(await lesenGesperrt(intern(w), "summen"), "Spieler lesen keine Summen");
        wahr((await intern(w).teilLaden("runden/" + uid + "/" + KEY)).r === 2, "eigenen Datensatz lesen geht");
    });

    await pruefe("§12 Wortstatistik: Gegenproben (Datensatz allein, falsche Klasse, fremde uid, Wort ohne Lexikon)", async () => {
        const w = await direkt(konten.bert, PW.bert);
        const uid = w.KONTO.uid();
        const t = WS12.tatsachen({ modus: "uebung", loesung: "abend", versuche: ["abend"], zustand: "gewonnen",
            begonnenAm: 1, beendetAm: 2000, tipps: [] }, "2026-10-01");
        const satz = WS12.datensatz(null, t, 30);
        const s = intern(w);
        wahr(await abgelehnt(s, { ["runden/" + uid + "/" + KEY]: satz }), "Datensatz ohne Summen");
        const falscheKlasse = WS12.schritt(uid, KEY, satz);
        falscheKlasse["summen/" + KEY + "/a5"] = { ".sv": { increment: 1 } };
        delete falscheKlasse["summen/" + KEY + "/a1"];
        wahr(await abgelehnt(s, falscheKlasse), "falsche Klasse");
        wahr(await abgelehnt(s, WS12.schritt("uid-fremd", KEY, satz)), "fremde uid");
        wahr(await abgelehnt(s, WS12.schritt(uid, "ffffffff", satz)), "Wort ohne Lexikon");
        wahr(!(await abgelehnt(s, WS12.schritt(uid, KEY, satz))), "richtiger Schritt geht");
    });

    await pruefe("§12 Schwierigkeit: UP#Plus rechnet und schreibt; Spieler lesen sie, die App nimmt sie", async () => {
        const up = appLaden(fb);
        await up.KONTO.anmelden("up-plus", PW.ober);
        await laden(up);
        const [lexikon, summen] = await Promise.all([intern(up).teilLaden("lexikon"), intern(up).teilLaden("summen")]);
        const daten = WS12.appDaten(lexikon, summen, LOESUNGEN, 7);
        await intern(up).teilSchreiben({ schwierigkeit: daten });
        const w = await direkt(konten.anna, PW.anna);
        const uid = w.KONTO.uid();
        w.umgebung.WORTSTATISTIK_ABGLEICH.einrichten(intern(w), w.speicher, () => uid, () => uid, () => true);
        wahr(await w.umgebung.WORTSTATISTIK_ABGLEICH.schwierigkeitHolen(), "geholt und angewandt");
        wahr(w.umgebung.WORTBEWERTUNG._datenErsatz && w.umgebung.WORTBEWERTUNG._datenErsatz.kodiert === daten.kodiert,
            "die EINE Lesestelle liest die neue");
        wahr(await lesenGesperrt(intern(appLaden(fb)), "schwierigkeit"), "ohne Anmeldung nicht lesbar");
    });

    await pruefe("§12 Aufräumen: UP#Plus löscht alte Datensätze eines Spielers, Summen bleiben", async () => {
        const up = appLaden(fb);
        await up.KONTO.anmelden("up-plus", PW.ober);
        await laden(up);
        const uid = Object.keys(fb.db["typoluck-intern"].runden)[0];
        fb.db["typoluck-intern"].runden[uid][KEY].z = 20240101;
        const summeVorher = JSON.stringify(fb.db["typoluck-intern"].summen[KEY]);
        const schritt = WS12.aufraeumen(uid, await intern(up).teilLaden("runden/" + uid), 20261001);
        await intern(up).teilSchreiben(schritt);
        wahr(!wertBei(fb.db, ["typoluck-intern", "runden", uid, KEY]), "gelöscht");
        gleich(JSON.stringify(fb.db["typoluck-intern"].summen[KEY]), summeVorher, "Summen unverändert");
    });

    await pruefe("Alte Regel: die App sendet keine Wortstatistik (Warteschlange)", async () => {
        fb.regelSetzen(REGEL_11C);
        const w = appLaden(fb);
        await laden(w);
        const A = w.umgebung.WORTSTATISTIK_ABGLEICH;
        A.einrichten(intern(w), w.speicher, () => "uid-x", () => "uid-x", () => true);
        const vorher = fb.aufrufe.length;
        A.melden({ modus: "tag", loesung: "abend", versuche: ["abend"], zustand: "gewonnen",
            begonnenAm: 1, beendetAm: 2, tipps: [] }, "2026-10-03", 9);
        await new Promise((r) => setTimeout(r, 50));
        wahr(!fb.aufrufe.slice(vorher).some((a) => /typoluck-intern/.test(a.pfad)), "nichts an typoluck-intern");
        gleich(A.warte().length, 1, "wartet");
        fb.regelSetzen(REGEL_12);
    });

    console.log(anzahlOk + " ok, " + anzahlFehler + " Fehler");
    process.exit(anzahlFehler === 0 ? 0 : 1);
})();
