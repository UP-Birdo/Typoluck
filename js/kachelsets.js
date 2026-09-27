/*
 * kachelsets.js — wie die Spielkacheln und die Tastatur aussehen: die
 * Kachel-Sets (seit 0.14.0, Nachtrag Runde 6: „Kachel-Sets anziehbar
 * machen; mehrere Sets bauen, in der Werkstatt alle frei zum Ausprobieren —
 * der Nutzer wählt danach, welche reinkommen").
 *
 *     KACHELSETS.SETS                  alle Sets, Reihenfolge der Anzeige
 *     KACHELSETS.set(id)               ein Set (unbekannt = Papier)
 *     KACHELSETS.gewaehlt()            die Kennung, die dieses Gerät trägt
 *     KACHELSETS.waehlen(id)           anziehen (merkt es und wendet an)
 *     KACHELSETS.stil(id)              der Stil eines Sets als CSS-Text
 *     KACHELSETS.anwenden(id, dokument)
 *
 * WAS EIN SET ÄNDERT: nur Farben und Oberfläche der Kacheln und Tasten —
 * Grund und Schrift der leeren Kachel, Rahmen, die drei Kachelfarben samt
 * Kante, die Tasten und die ausgeschlossenen Tasten; je Set ein Satz für
 * hell und einer für dunkel. Dazu wahlweise ein `muster`: ein feiner
 * Verlauf über Kachel und Taste (Maserung, Glanz) — nur ein Bild über der
 * Farbe, nie ein weicher Schatten (UPCrew-Standard).
 *
 * WAS GLEICH BLEIBT (Nutzer-Regeln): „richtig" bleibt Orange, „vorhanden"
 * bleibt Blau — ein Set dunkelt oder hellt sie nur ab. Die Kachelfarben-
 * Sperre (js\darstellung.js, `kachelFarbeErlaubt`) gilt für jedes Set, hell
 * und dunkel. Lesbarkeit prüft tests\test-kachelsets.js: Schrift auf jeder
 * Kachelfarbe mindestens 3 : 1 (grosse, fette Buchstaben), Schrift der
 * leeren Kachel und der Tasten mindestens 4,5 : 1.
 *
 * PAPIER ist das Grund-Set: Es ändert NICHTS, die App sieht damit aus wie
 * vor 0.14.0 (Farben der gewählten Farbwelt, Rückfall css\stil.css).
 *
 * WO DIE WAHL LIEGT: auf dem Gerät (ICH.einstellung "kachelset"), nicht am
 * Konto — wie der Schwer-Modus. Welche Sets man HAT, sagt die Sammlung
 * (js\sammlung.js); in der Werkstatt sind alle frei.
 *
 * WIE ES ANGEWENDET WIRD: Der Stil steht als CSS-Text in einem eigenen
 * <style id="kachelset-stil"> und hängt an `data-kachelset` auf <html>. So
 * gelten hell und dunkel auf dieselbe Art wie in css\stil.css (Gerät,
 * data-darstellung="hell"/"dunkel"), ohne dass hier jemand auf einen
 * Wechsel horchen muss.
 */

const KACHELSETS = {

    STANDARD: "papier",

    /* Die Variablen, die ein Set setzen darf (ohne `--`). */
    VARIABLEN: [
        "kachel-grund", "kachel-text", "kachel-rahmen", "kachel-rahmen-voll",
        "kachel-falsch", "kachel-falsch-kante", "kachel-richtig", "kachel-richtig-kante",
        "kachel-vorhanden", "kachel-vorhanden-kante", "kachel-schrift",
        "taste", "taste-schrift", "taste-kante", "taste-aus", "taste-aus-schrift", "taste-aus-kante"
    ],

    /* Die Sets. Reihenfolge = Anzeige. Die Werte je Zeile in der Reihenfolge
       von VARIABLEN (siehe `_werte`). Papier ist leer = Standard. */
    SETS: [
        { id: "papier", name: "Papier", hell: null, dunkel: null, muster: null },
        {
            id: "leder", name: "Leder",
            hell: ["#f3e6d6", "#3b2616", "#c9a887", "#8a5f3c", "#7a5c45", "#5a4230", "#c4571c", "#8e3d12",
                "#2f6fb5", "#214f82", "#ffffff", "#e2cdb4", "#2b1a0d", "#b99673", "#8a6d56", "#f6ece1", "#5f4837"],
            dunkel: ["#2a1f17", "#f3e6d6", "#4a3627", "#8a6446", "#4d3a2c", "#33261c", "#d8672a", "#9a4516",
                "#3c7fcc", "#285a93", "#ffffff", "#6b4f3a", "#ffffff", "#45321f", "#241a12", "#8c7663", "#120c08"],
            muster: "repeating-linear-gradient(45deg, rgb(255 255 255 / 0.05) 0 1px, transparent 1px 5px)"
        },
        {
            id: "blei", name: "Blei",
            hell: ["#e6e9ec", "#1f2327", "#a9b0b8", "#5d656e", "#6b727b", "#4b5159", "#d9612a", "#9c4015",
                "#3a78c2", "#29568c", "#ffffff", "#cfd4da", "#16191c", "#9aa2ab", "#7d848d", "#f4f6f8", "#555b62"],
            dunkel: ["#1e2226", "#e9ecef", "#3a4047", "#7b838c", "#3f454c", "#2a2e33", "#e0692d", "#a24817",
                "#4585d0", "#2d5f99", "#ffffff", "#4a5058", "#ffffff", "#2e3338", "#1a1d20", "#737a82", "#0b0c0e"],
            muster: "linear-gradient(180deg, rgb(255 255 255 / 0.2), transparent 55%)"
        },
        {
            id: "holz", name: "Holz",
            hell: ["#f0dcc0", "#3a240f", "#c79a66", "#8b5a2b", "#8f7155", "#654d38", "#d0601f", "#93400f",
                "#336fae", "#234e7c", "#ffffff", "#dcbf98", "#2d1a08", "#b08654", "#8a6c50", "#fbf2e6", "#66503b"],
            dunkel: ["#3a2a1c", "#f2e2cc", "#5c4330", "#9a724d", "#56422f", "#3b2d20", "#dd6a28", "#9d4a18",
                "#3f80c8", "#2a5b91", "#ffffff", "#7a5a3c", "#ffffff", "#523b26", "#2b1f14", "#957a60", "#150f09"],
            muster: "repeating-linear-gradient(100deg, rgb(0 0 0 / 0.06) 0 2px, transparent 2px 7px)"
        },
        {
            id: "neon", name: "Neon",
            hell: ["#ffffff", "#111318", "#c7cbe0", "#7b61ff", "#5b5f6b", "#3c3f48", "#f25f0a", "#b3440a",
                "#1b8cff", "#0f5fb3", "#ffffff", "#eef0ff", "#111318", "#b9bde8", "#6d7080", "#f5f6ff", "#474a57"],
            dunkel: ["#0b0c12", "#f5f6ff", "#2a2c45", "#8a74ff", "#2e3040", "#1b1c27", "#f25f0a", "#b3440a",
                "#1b8cff", "#0f5fb3", "#ffffff", "#343a5e", "#ffffff", "#1c2040", "#121320", "#6a6e90", "#05050b"],
            muster: null
        },
        {
            id: "kreide", name: "Kreide",
            hell: ["#eef2f0", "#1d2a25", "#9fb0a8", "#4d5e57", "#5f6d67", "#414d48", "#e0662a", "#a04818",
                "#3a7fcf", "#28599a", "#ffffff", "#d6dfdb", "#14201b", "#a2b2ab", "#75847e", "#f3f7f5", "#52605a"],
            dunkel: ["#24302b", "#f1f5ec", "#3f4f48", "#cfd9cf", "#3a4843", "#26302c", "#e46b2c", "#a54b19",
                "#3f86d6", "#2a5e9c", "#ffffff", "#3b4a44", "#f1f5ec", "#26312c", "#1a221f", "#76867f", "#0c100e"],
            muster: null
        },
        {
            id: "sand", name: "Sand",
            hell: ["#f7efdc", "#3a3121", "#d9c8a0", "#9a8559", "#8c8068", "#655b48", "#e06a26", "#a14c16",
                "#3b7fc4", "#295b8e", "#ffffff", "#eadcb9", "#2e2616", "#c6b284", "#8f846c", "#fffaf0", "#6e6553"],
            dunkel: ["#2e2a20", "#f4ead3", "#4c4533", "#a39062", "#4a4435", "#322e24", "#e57030", "#a64f1a",
                "#4386cf", "#2c5f97", "#ffffff", "#6a5f45", "#ffffff", "#463e2b", "#211e16", "#8e8468", "#100e0a"],
            muster: "repeating-linear-gradient(0deg, rgb(0 0 0 / 0.04) 0 1px, transparent 1px 4px)"
        },
        {
            id: "mitternacht", name: "Mitternacht",
            hell: ["#e8ecf6", "#151b2e", "#aab4cf", "#4b5680", "#5a6180", "#3d4259", "#e3672a", "#a3481a",
                "#3d7fd6", "#2a5a9c", "#ffffff", "#d3daea", "#10162a", "#9ea9c6", "#6f7797", "#f2f4fa", "#4a5170"],
            dunkel: ["#0f1528", "#e8ecf6", "#242d4a", "#56628f", "#262e4a", "#161c30", "#e8702a", "#b0501a",
                "#4a8ce6", "#2e63a8", "#ffffff", "#2b3558", "#ffffff", "#18203a", "#0b1020", "#5f6a96", "#04060d"],
            muster: null
        },
        {
            id: "kupfer", name: "Kupfer",
            hell: ["#f6e7de", "#3a1f12", "#d8a78a", "#a0572e", "#8a6a5c", "#634a3f", "#d35b1e", "#963f10",
                "#3574b8", "#245286", "#ffffff", "#ecd0bf", "#2f170b", "#cc9a7c", "#8f7063", "#fff6f1", "#6c5348"],
            dunkel: ["#2c1a12", "#f6e2d6", "#55301f", "#c07a4d", "#4a3027", "#311f19", "#e0662a", "#a14818",
                "#3f81cc", "#2a5c93", "#ffffff", "#6d3e27", "#ffffff", "#45261a", "#20130d", "#946d5b", "#0f0906"],
            muster: "linear-gradient(180deg, rgb(255 255 255 / 0.16), transparent 55%)"
        },
        {
            id: "glas", name: "Glas",
            hell: ["#eef6fb", "#13222c", "#b4d2e4", "#5f8fae", "#6d8292", "#4b5c69", "#e56a2a", "#a64c19",
                "#2f7ed0", "#1f5a98", "#ffffff", "#dcebf4", "#0f1d26", "#a8c7da", "#748c9c", "#f4fafd", "#516674"],
            dunkel: ["#10202b", "#e4f2fa", "#24414f", "#6aa3c2", "#26404f", "#172a35", "#e8702a", "#b0501a",
                "#3f8fe0", "#2a67a8", "#ffffff", "#24404f", "#ffffff", "#142630", "#0b171e", "#5d7d8f", "#03080b"],
            muster: "linear-gradient(135deg, rgb(255 255 255 / 0.22), transparent 45%)"
        }
    ],

    /* Ein Set; unbekannte Kennung = Papier. */
    set(id) {
        return KACHELSETS.SETS.find((eintrag) => eintrag.id === id) || KACHELSETS.SETS[0];
    },

    /* { "--kachel-grund": "#…", … } für einen Modus ("hell"/"dunkel") —
       leer bei Papier. */
    _werte(set, modus) {
        const liste = set[modus];
        const werte = {};
        if (!liste) {
            return werte;
        }
        KACHELSETS.VARIABLEN.forEach((name, i) => {
            werte["--" + name] = liste[i];
        });
        return werte;
    },

    werte(id, modus) {
        return KACHELSETS._werte(KACHELSETS.set(id), modus === "dunkel" ? "dunkel" : "hell");
    },

    /* `!important`, weil die Farbwelt (Baustein js\upcrew-aussehen.js)
       dieselben Kachel- und Tastenfarben DIREKT an <html> schreibt — sonst
       gewänne sie immer (auf 8093 im Browser gesehen, 27.09.2026). Das Set
       geht der Farbwelt bei Kacheln und Tasten bewusst vor; Papier setzt
       nichts, dann gilt die Farbwelt. */
    _block(auswahl, werte) {
        const zeilen = Object.keys(werte).map((name) => "    " + name + ": " + werte[name] + " !important;");
        return auswahl + " {\n" + zeilen.join("\n") + "\n}\n";
    },

    /* Der Stil eines Sets als CSS-Text: hell als Grund, dunkel für das
       dunkle Gerät (ausser hell gewählt) und für „dunkel" gewählt — wie
       css\stil.css. Papier = leer. */
    stil(id) {
        const set = KACHELSETS.set(id);
        if (!set.hell) {
            return "";
        }
        const wurzel = ':root[data-kachelset="' + set.id + '"]';
        let text = KACHELSETS._block(wurzel, KACHELSETS._werte(set, "hell"));
        const dunkel = KACHELSETS._werte(set, "dunkel");
        text += "@media (prefers-color-scheme: dark) {\n"
            + KACHELSETS._block(wurzel + ':not([data-darstellung="hell"])', dunkel) + "}\n";
        text += KACHELSETS._block(wurzel + '[data-darstellung="dunkel"]', dunkel);
        if (set.muster) {
            text += wurzel + " .kachel,\n" + wurzel + " .taste {\n    background-image: " + set.muster + ";\n}\n";
        }
        return text;
    },

    gewaehlt() {
        const id = (typeof ICH !== "undefined") ? ICH.einstellung("kachelset", KACHELSETS.STANDARD) : KACHELSETS.STANDARD;
        return KACHELSETS.set(id).id;
    },

    waehlen(id) {
        const kennung = KACHELSETS.set(id).id;
        if (typeof ICH !== "undefined") {
            ICH.einstellungSetzen("kachelset", kennung);
        }
        KACHELSETS.anwenden(kennung);
        return kennung;
    },

    /* Schreibt den Stil in <style id="kachelset-stil"> und setzt
       data-kachelset auf <html>. `dokument` für Tests. */
    anwenden(id, dokument) {
        const doc = dokument || (typeof document !== "undefined" ? document : null);
        if (!doc || !doc.documentElement) {
            return;
        }
        const kennung = KACHELSETS.set(id || KACHELSETS.gewaehlt()).id;
        let stil = doc.getElementById("kachelset-stil");
        if (!stil) {
            stil = doc.createElement("style");
            stil.id = "kachelset-stil";
            doc.head.appendChild(stil);
        }
        stil.textContent = KACHELSETS.stil(kennung);
        doc.documentElement.dataset.kachelset = kennung;
    }
};

/* Der frühe Aufruf (wie js\darstellung.js): sofort anwenden, damit keine
   Kachel in den falschen Farben aufblitzt. */
if (typeof document !== "undefined") {
    KACHELSETS.anwenden();
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = KACHELSETS;
}
