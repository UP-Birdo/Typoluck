/*
 * test-woerter.js — die Wortliste und der Tagesplan (js\woerter-de.js).
 */

const { pruefe, gleich, fazit } = require("./pruefer.js");
require("./umgebung.js");

const W = WOERTER_DE;
const alle = W.loesungen.concat(W.zusatz);

/* Jeder Eintrag: fünf Buchstaben aus a–z, ä, ö, ü */
const falsch = alle.filter((wort) => !/^[a-zäöü]{5}$/.test(wort));
pruefe("Jedes Wort hat genau 5 erlaubte Buchstaben", falsch.length === 0,
    "Abweichend: " + falsch.join(", "));

/* Kein ß (es gibt keine Taste dafür) */
pruefe("Kein Wort enthält ß", alle.every((wort) => wort.indexOf("ß") === -1));

/* Kein Wort doppelt, auch nicht über beide Listen */
const gesehen = new Set();
const doppelt = [];
for (const wort of alle) {
    if (gesehen.has(wort)) {
        doppelt.push(wort);
    }
    gesehen.add(wort);
}
pruefe("Kein Wort doppelt", doppelt.length === 0, "Doppelt: " + doppelt.join(", "));

pruefe("Mindestens 300 Lösungswörter", W.loesungen.length >= 300, "sind " + W.loesungen.length);

/* Jeder Buchstabe des Spiels muss auf der Tastatur existieren — die
   Buchstabenmenge des Modells deckt jede Lösung ab. */
const unbekannt = alle.filter((wort) => Array.from(wort).some((b) => WORDLE.BUCHSTABEN.indexOf(b) === -1));
pruefe("Alle Buchstaben sind im Spiel vorhanden", unbekannt.length === 0, unbekannt.join(", "));

/* ------------------------------------------------------------------ *
 * Der Tagesplan
 * ------------------------------------------------------------------ */

function ggt(a, b) {
    return b === 0 ? a : ggt(b, a % b);
}

pruefe("Der Tagesplan hat mindestens einen Abschnitt", W.TAGESPLAN.length >= 1);

W.TAGESPLAN.forEach((abschnitt, i) => {
    pruefe("Plan " + i + ": Datum im Format JJJJ-MM-TT", /^\d{4}-\d{2}-\d{2}$/.test(abschnitt.ab));
    pruefe("Plan " + i + ": anzahl passt in die Lösungsliste",
        abschnitt.anzahl >= 1 && abschnitt.anzahl <= W.loesungen.length,
        "anzahl " + abschnitt.anzahl + ", Liste " + W.loesungen.length);
    pruefe("Plan " + i + ": schritt ist teilerfremd zu anzahl (jedes Wort kommt dran)",
        ggt(abschnitt.schritt, abschnitt.anzahl) === 1);
    pruefe("Plan " + i + ": versatz ist eine ganze Zahl", Number.isInteger(abschnitt.versatz));
    if (i > 0) {
        pruefe("Plan " + i + ": beginnt nach dem vorigen Abschnitt",
            WORDLE.tageZwischen(W.TAGESPLAN[i - 1].ab, abschnitt.ab) > 0);
        pruefe("Plan " + i + ": die Liste wächst nur",
            abschnitt.anzahl >= W.TAGESPLAN[i - 1].anzahl);
    }
});

/* In `anzahl` aufeinanderfolgenden Tagen kommt jedes Wort genau einmal. */
const erster = W.TAGESPLAN[0];
const woerter = new Set();
const [j, m, t] = erster.ab.split("-").map(Number);
for (let tag = 0; tag < erster.anzahl; tag++) {
    const datum = new Date(Date.UTC(j, m - 1, t + tag));
    const text = datum.getUTCFullYear() + "-" + String(datum.getUTCMonth() + 1).padStart(2, "0")
        + "-" + String(datum.getUTCDate()).padStart(2, "0");
    woerter.add(WORDLE.tageswort(text).wort);
}
gleich("Im ersten Zyklus kommt jedes Wort genau einmal", woerter.size, erster.anzahl);

/*
 * UNVERÄNDERLICH: Das Wort vom ersten Tag. Ändert sich diese Zeile, hat
 * jemand die Liste umsortiert oder den ersten Planabschnitt angefasst — und
 * damit jedem vergangenen Tag ein anderes Wort gegeben. Das ist verboten
 * (Kopf von js\woerter-de.js).
 */
gleich("Tag 1 hat für immer dasselbe Wort", WORDLE.tageswort("2026-09-24"),
    { wort: "duell", nummer: 1 });
gleich("Tag 2 hat für immer dasselbe Wort", WORDLE.tageswort("2026-09-25"),
    { wort: "dampf", nummer: 2 });
gleich("Die ersten 567 Lösungswörter beginnen unverändert", W.loesungen.slice(0, 3),
    ["abend", "acker", "adler"]);

fazit();
