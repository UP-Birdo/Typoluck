/*
 * test-versiegelung.js — die Passwort-Prüfsumme MUSS in allen UPCrew-Spielen
 * gleich sein (und gleich der von Blunderluck, dessen Konten zu UPCrew
 * umziehen), sonst kommt niemand in sein UPCrew-Konto.
 *
 * Die Vergleichssumme unten wurde UNABHÄNGIG gerechnet (Python, hashlib,
 * 24.09.2026) über genau die Zeichenkette, die Blunderluck bildet:
 *
 *     "blunderluck-pin|" + passwort + "|" + salz
 */

const { pruefe, gleich, spaeter, fazit } = require("./pruefer.js");
require("./umgebung.js");

gleich("Die Zutat ist die von Blunderluck", VERSIEGELUNG.ZUTAT_PASSWORT, "blunderluck-pin|");
pruefe("Krypto steht in der Testumgebung zur Verfügung", VERSIEGELUNG.verfuegbar());

spaeter("Prüfsumme wie Blunderluck", (async () => {
    const summe = await VERSIEGELUNG.passwortPruefwertBilden("Geheim1", "00112233445566778899aabbccddeeff");
    gleich("Prüfsumme wie Blunderluck", summe,
        "81ab446bbaf8674b589160bdfb52b4488fddf22baca2f2f55bd596074fb4ee04");

    pruefe("Richtiges Passwort passt", await VERSIEGELUNG.passwortPruefen(
        "Geheim1", "00112233445566778899aabbccddeeff", summe));
    pruefe("Falsches Passwort passt nicht", !await VERSIEGELUNG.passwortPruefen(
        "geheim1", "00112233445566778899aabbccddeeff", summe));
    pruefe("Ohne Prüfsumme passt nichts", !await VERSIEGELUNG.passwortPruefen("Geheim1", "x", ""));
})());

const salz = VERSIEGELUNG.salzErzeugen();
pruefe("Salz hat 32 Hex-Zeichen", /^[0-9a-f]{32}$/.test(salz), salz);
pruefe("Zwei Salze sind verschieden", salz !== VERSIEGELUNG.salzErzeugen());

fazit();
