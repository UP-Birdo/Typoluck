/*
 * kern.js — stellt den Fortschritt so bereit, wie der Browser ihn sieht:
 * den Kern-Baustein js\fortschritt-kern.js als globalen Namen
 * `FORTSCHRITT_KERN` und das zusammengesetzte Ding aus js\fortschritt.js als
 * globalen Namen `FORTSCHRITT` (seit 0.28.1).
 *
 * WARUM: js\fortschritt.js setzt sich aus dem Kern und Typolucks eigenen
 * Gliedern zusammen (`Object.assign({}, FORTSCHRITT_KERN, { … })`), und die
 * Glieder des Kerns rufen alles über den Namen `FORTSCHRITT`. Im Browser
 * lädt index.html beide Dateien nacheinander, und beide Namen sind global;
 * ausserhalb gibt es keine gemeinsamen Namen. Jeder Test, der
 * js\fortschritt.js lädt, holt deshalb ZUERST diese Datei:
 *
 *     require("./kern.js");
 *     const FORTSCHRITT = require("../js/fortschritt.js");
 *
 * Das zweite `require` liefert dasselbe Ding, das hier global steht.
 * Geladen werden die ECHTEN Dateien aus js\ (keine Kopien).
 *
 * Tests, die ihre Dateien als Text in einen eigenen Kontext legen (vm),
 * brauchen diese Datei nicht: Sie stellen den Text von
 * js\fortschritt-kern.js VOR den von js\fortschritt.js.
 *
 * Der zweite Kern-Baustein, js\speicher-konten.js, braucht nichts von hier:
 * Er erbt von `SpeicherGemeinsam`, das tests\umgebung.js global bereitstellt;
 * danach genügt `require("../js/speicher-konten.js")`.
 */

const kern = require("../js/fortschritt-kern.js");

global.FORTSCHRITT_KERN = kern.FORTSCHRITT_KERN;
global.FORTSCHRITT_KERN_ERWARTET = kern.FORTSCHRITT_KERN_ERWARTET;
global.FORTSCHRITT = require("../js/fortschritt.js");

module.exports = {
    FORTSCHRITT_KERN: kern.FORTSCHRITT_KERN,
    FORTSCHRITT_KERN_ERWARTET: kern.FORTSCHRITT_KERN_ERWARTET,
    FORTSCHRITT: global.FORTSCHRITT
};
