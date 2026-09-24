/*
 * versiegelung.js — Prüfsummen für das Passwort eines Kontos.
 *
 * Die Datenbank ist öffentlich lesbar, der Quelltext liegt auf GitHub.
 * Gespeichert wird deshalb nie ein Passwort, sondern nur eine SHA-256-
 * Prüfsumme mit einem offenen Zufallssalz (damit jedes Gerät prüfen kann).
 *
 * DAS VERFAHREN IST NICHT FREI WÄHLBAR. Die Konten gehören UPCrew und
 * gelten in allen UPCrew-Spielen (Nutzer-Entscheidung 24.09.2026). Jedes
 * Spiel muss deshalb EXAKT gleich rechnen: dieselbe Zutat, dieselbe
 * Reihenfolge, dieselbe Hex-Schreibweise. Weicht auch nur ein Zeichen ab,
 * kommt niemand mehr in sein Konto. `tests\test-versiegelung.js` hält eine
 * fest gerechnete Prüfsumme fest.
 *
 * Die Zutat heisst aus Geschichte „blunderluck-pin|": Blunderluck hat das
 * Verfahren erfunden und zieht mit seinen Konten zu UPCrew um. Mit
 * derselben Zutat lassen sich diese Konten samt Passwort übernehmen — mit
 * einer neuen müssten alle ihr Passwort neu setzen. Spieler sehen die Zutat
 * nie.
 *
 * Grenze, die man kennen muss: Das Passwort hat 4 bis 8 Zeichen. Wer
 * Prüfsumme und Salz aus der Datenbank holt, kann kurze Passwörter mit
 * einem kleinen Programm durchprobieren. Das ist ein Türschloss unter
 * Freunden, kein Tresor (docs\entscheidungen\entschieden.md).
 */

const VERSIEGELUNG = {

    /*
     * ACHTUNG, DAS „blunderluck" HIER IST KEIN NAME, SONDERN EINE ZUTAT.
     * Sie darf NIE umbenannt werden — auch nicht in „upcrew" oder
     * „typoluck". Sonst passt keine einzige vorhandene Prüfsumme mehr.
     */
    ZUTAT_PASSWORT: "blunderluck-pin|",

    /* Steht die Krypto-Funktion zur Verfügung? Browser bieten sie nur in
       sicherem Zusammenhang an (HTTPS oder localhost). */
    verfuegbar() {
        const krypto = (typeof globalThis !== "undefined") ? globalThis.crypto : null;
        return !!(krypto && krypto.subtle && typeof krypto.subtle.digest === "function");
    },

    /* Zufälliges Salz als Hex-Zeichenkette (16 Byte). */
    salzErzeugen() {
        const bytes = new Uint8Array(16);
        globalThis.crypto.getRandomValues(bytes);
        return VERSIEGELUNG._alsHex(bytes);
    },

    /* Prüfsumme eines Passworts mit Salz. Liefert "", wenn keine Krypto
       verfügbar ist. */
    async passwortPruefwertBilden(passwort, salz) {
        if (!VERSIEGELUNG.verfuegbar()) {
            return "";
        }
        return VERSIEGELUNG._summeBilden(VERSIEGELUNG.ZUTAT_PASSWORT
            + String(passwort || "") + "|" + String(salz || ""));
    },

    async passwortPruefen(passwort, salz, pruefwert) {
        if (!pruefwert) {
            return false;
        }
        const gerechnet = await VERSIEGELUNG.passwortPruefwertBilden(passwort, salz);
        return gerechnet !== "" && gerechnet === pruefwert;
    },

    /* ---------------------------------------------------------------- *
     * Innereien
     * ---------------------------------------------------------------- */

    async _summeBilden(text) {
        const daten = new TextEncoder().encode(text);
        const summe = await globalThis.crypto.subtle.digest("SHA-256", daten);
        return VERSIEGELUNG._alsHex(new Uint8Array(summe));
    },

    _alsHex(bytes) {
        let text = "";
        for (const byte of bytes) {
            text += byte.toString(16).padStart(2, "0");
        }
        return text;
    }
};

if (typeof module !== "undefined" && module.exports) {
    module.exports = VERSIEGELUNG;
}
