/*
 * wortbewertung-korrektur.js — Korrekturen von Hand zur Wort-Bewertung
 * (js/wortbewertung.js). Die Korrektur gewinnt immer. Entsteht auf der
 * Werkzeug-Seite werkzeug/woerter-werkzeug.html (nur lokal) über
 * „Korrekturen herunterladen"; übernehmen mit werkzeug/Wortkorrektur-Uebernehmen.ps1.
 * Je Wort: stufe 1–3 (leicht/mittel/schwer), skala 1–10, ungeeignet true.
 */

const WORTBEWERTUNG_KORREKTUR = {};

if (typeof module !== "undefined" && module.exports) {
    module.exports = WORTBEWERTUNG_KORREKTUR;
}
