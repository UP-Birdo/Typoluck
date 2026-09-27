/*
 * test-wunsch.js — „Wunsch oder Fehler" nimmt nur Text (seit 0.15.8).
 *
 * Nutzer 27.09.2026: „bei Fehler melden eine Sperre für Sonderzeichen und
 * sonstigen Unfug einbauen, nur Text, sonst kann was schiefgehen".
 * Geprüft wird die ECHTE js\wunsch.js in einem eigenen Kontext:
 *   1. Erlaubt sind Buchstaben (mit Umlauten, ß, Akzenten), Ziffern,
 *      Leerzeichen, Zeilenumbruch und . , ! ? - ( ) : ; — sonst nichts.
 *   2. Vor dem Senden: Mehrfach-Leerzeichen zu einem, höchstens 500 Zeichen.
 *   3. Der Ablauf: Das Feld filtert beim Tippen, die Adresse trägt nur den
 *      gesäuberten Text, und der Rückfall-Hinweis zeigt ihn als Text.
 *   4. Dieselbe Zeichenliste wie Blunderluck; das Abhol-Skript prüft auch.
 */

const fs = require("fs");
const pfad = require("path");
const vm = require("vm");
const { pruefe, gleich, spaeter, fazit } = require("./pruefer.js");

const wurzel = pfad.join(__dirname, "..");
const quelle = fs.readFileSync(pfad.join(wurzel, "js", "wunsch.js"), "utf8");

function laden() {
    const welt = {
        eingaben: [],
        hinweise: [],
        geoeffnet: [],
        antwort: null,
        fensterDa: true
    };
    const umgebung = {
        DIALOG: {
            async eingabe(titel, text, vorgabe, okText, verdeckt, zusatz) {
                welt.eingaben.push({ titel, text, zusatz });
                return welt.antwort;
            },
            async hinweis(titel, text) {
                welt.hinweise.push({ titel, text });
            }
        },
        NAVIGATION: { aktuell: "einstellungen" },
        KONFIG: { APP_VERSION: "0.15.8" },
        window: {
            open(adresse) {
                welt.geoeffnet.push(adresse);
                return welt.fensterDa ? {} : null;
            }
        },
        encodeURIComponent
    };
    vm.createContext(umgebung);
    vm.runInContext(quelle + "\n;globalThis.WUNSCH = WUNSCH;", umgebung, { filename: "wunsch.js" });
    return { WUNSCH: umgebung.WUNSCH, welt };
}

const { WUNSCH } = laden();

/* 1. Die Zeichen */
const erlaubt = "Äpfel, Öl und Übung: ß é ç 0123456789 . , ! ? - ( ) : ;\nZweite Zeile";
gleich("Erlaubtes bleibt, wie es ist", WUNSCH.zeichenFiltern(erlaubt), erlaubt);

const verboten = ["<", ">", "[", "]", "{", "}", "\\", "/", "|", "$", "%", "&", "*", "=", "~", "^", "`",
    "\"", "'", "#", "@", "+", "_",
    "\u{1F600}", "\u{1F44D}", "\u2764", "\u0000", "\u0007", "\u001B", "\u007F", "\u0085",
    "\u200B", "\u200D", "\u202E", "\u2066", "\uFEFF", "\u00A0", "\u2028"];
for (const zeichen of verboten) {
    const code = "U+" + zeichen.codePointAt(0).toString(16).toUpperCase().padStart(4, "0");
    gleich("Verboten: " + code + " fliegt raus", WUNSCH.zeichenFiltern("a" + zeichen + "b"), "ab");
}
gleich("Eine ganze Einschleusung wird zu harmlosem Text",
    WUNSCH.saeubern("<script>alert(1)</script> ${x} `rm -rf /` [link](javascript:x)"),
    "scriptalert(1)script x rm -rf link(javascript:x)");
gleich("Tab wird Leerzeichen, Windows-Umbruch wird \\n",
    WUNSCH.zeichenFiltern("a\tb\r\nc\rd"), "a b\nc\nd");
gleich("Beim Tippen bleibt ein Leerzeichen am Ende stehen", WUNSCH.zeichenFiltern("Hallo "), "Hallo ");

/* 2. Vor dem Senden */
gleich("Mehrfach-Leerzeichen zu einem, Ränder weg",
    WUNSCH.saeubern("   Das   Spiel  hängt  \n\n\n\n  manchmal   "), "Das Spiel hängt\n\nmanchmal");
gleich("Höchstens 500 Zeichen", [WUNSCH.MAX_LAENGE, WUNSCH.saeubern("x".repeat(900)).length,
    WUNSCH.zeichenFiltern("x".repeat(900)).length], [500, 500, 500]);
gleich("Nur Unfug ergibt leeren Text", WUNSCH.saeubern("<<>>{}$%&\u{1F600}"), "");

/* 3. Der Ablauf */
spaeter("Wunsch-Ablauf", (async () => {
    const eins = laden();
    eins.welt.antwort = "Bitte   mehr <b>Wörter</b> \u{1F600} & Level!";
    await eins.WUNSCH.oeffnen();
    const zusatz = eins.welt.eingaben[0].zusatz;
    pruefe("Das Feld ist mehrzeilig, filtert beim Tippen und kennt die Grenze",
        zusatz && zusatz.mehrzeilig === true && zusatz.filter === eins.WUNSCH.zeichenFiltern
            && zusatz.maxLaenge === 500, JSON.stringify(zusatz));
    const adresse = new URL(eins.welt.geoeffnet[0]);
    gleich("Ins Formular geht nur der gesäuberte Text",
        [adresse.host, adresse.searchParams.get("idee"), adresse.searchParams.get("stelle"),
            adresse.searchParams.get("fassung")],
        ["github.com", "Bitte mehr bWörterb Level!", "einstellungen", "v0.15.8"]);

    const zwei = laden();
    zwei.welt.antwort = "  <>{}  ";
    await zwei.WUNSCH.oeffnen();
    gleich("Nur Unfug: nichts wird geöffnet", zwei.welt.geoeffnet.length, 0);
    zwei.welt.antwort = null;
    await zwei.WUNSCH.oeffnen();
    gleich("Abbrechen: nichts wird geöffnet", zwei.welt.geoeffnet.length, 0);

    const drei = laden();
    drei.welt.fensterDa = false;
    drei.welt.antwort = "Fehler <img src=x onerror=alert(1)> im Rätsel";
    await drei.WUNSCH.oeffnen();
    pruefe("Fenster blockiert: der Hinweis zeigt nur den gesäuberten Text",
        drei.welt.hinweise.length === 1
            && /Fehler img srcx onerroralert\(1\) im Rätsel$/.test(drei.welt.hinweise[0].text)
            && !/[<>=]/.test(drei.welt.hinweise[0].text), JSON.stringify(drei.welt.hinweise));
})());

/* 4. Anzeige als Text, dieselbe Liste wie Blunderluck, Prüfung beim Abholen */
{
    const dialog = fs.readFileSync(pfad.join(wurzel, "js", "dialog.js"), "utf8");
    pruefe("Dialoge setzen Text nur über textContent (innerHTML nur zum Leeren)",
        !/innerHTML\s*=(?!\s*"")/.test(dialog) && /absatz\.textContent = text/.test(dialog));
    const blunderluck = pfad.join(wurzel, "..", "Blunderluck", "js", "wunsch.js");
    if (fs.existsSync(blunderluck)) {
        const dort = /NICHT_ERLAUBT:\s*(\/.*\/[a-z]*),/.exec(fs.readFileSync(blunderluck, "utf8"));
        const hier = /NICHT_ERLAUBT:\s*(\/.*\/[a-z]*),/.exec(quelle);
        gleich("Dieselbe Zeichenliste wie Blunderluck", hier && hier[1], dort && dort[1]);
    }
    const abholen = fs.readFileSync(pfad.join(wurzel, "tools", "Wuensche-Abholen.ps1"), "utf8");
    pruefe("tools\\Wuensche-Abholen.ps1 säubert Text und Titel, bevor sie in TODO.md landen",
        /function Text-Saeubern/.test(abholen) && /Text-Saeubern -Text \$idee/.test(abholen)
            && /MaxLaenge\s*=\s*500/.test(abholen));
}

fazit();
