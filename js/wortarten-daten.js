/*
 * wortarten-daten.js — welche Lösungswörter KEINE Nomen sind (seit 0.18.0,
 * von Hand gesetzt; Claude, 27.09.2026 — zum Nachsehen durch den Nutzer).
 *
 * Wozu: Buch 1 der Bibliothek zieht NUR Nomen (Nutzer 27.09.2026: „Erste
 * Buch nur Nomen, zweite etwas schwerer, immer so weiter"). Die
 * Lösungsliste (js/woerter-de.js) kennt keine Wortart; deshalb steht hier
 * die Ausnahme — jedes Lösungswort, das NICHT hier steht, gilt als Nomen.
 *
 *   keinNomen  Adjektive, Adverbien, Partikeln, Ausrufe (blind, heute,
 *              bravo …) — nie in Buch 1.
 *   beides     klein geschrieben ein anderes Wort, gross geschrieben auch
 *              ein Nomen (Leben/leben, Reich/reich, Lokal/lokal …). Auch sie
 *              NICHT in Buch 1: Wer „reich" rät, denkt nicht zuerst an „das
 *              Reich" — Buch 1 soll eindeutig sein.
 * Ab Buch 2 kommt jedes Wort dran (auch die hier genannten).
 *
 * Wer die Lösungsliste hinten erweitert, prüft die neuen Wörter und trägt
 * Nicht-Nomen hier ein; tests/test-bibliothek.js prüft, dass jedes Wort
 * hier in der Lösungsliste steht und nicht doppelt vorkommt.
 */

const WORTARTEN_DATEN = {
    keinNomen: [
        "banal", "blind", "blond", "braun", "bravo", "breit", "dicht", "eigen", "eilig",
        "eitel", "flach", "flink", "frech", "genau", "glatt", "grell", "heute", "klein", "knapp",
        "krank", "krumm", "leise", "mager", "mutig", "nackt", "nobel", "offen", "prima", "ruhig",
        "sanft", "sauer", "schön", "stark", "steil", "still", "weich"
    ],
    beides: [
        "bitte", "elend", "essen", "extra", "feige", "ideal", "leben", "lokal", "recht", "reich", "stolz"
    ]
};

if (typeof module !== "undefined" && module.exports) {
    module.exports = WORTARTEN_DATEN;
}
