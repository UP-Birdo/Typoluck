/*
 * pruefer.js — das kleine Prüfwerkzeug aller Testdateien.
 *
 * Jede Testdatei ruft am Ende `fazit()`. Das gibt genau die Zeile aus, die
 * tools\Test-Typoluck.ps1 zusammenzählt:
 *
 *     12 ok, 0 Fehler
 *
 * Fehler kommen als „FEHLER: <Name>" mit eingerückter Begründung darunter.
 * Exit-Code 0 nur bei null Fehlern.
 *
 * ACHTUNG, Reihenfolge: Neue Prüfungen gehören VOR den Aufruf von
 * `fazit()` — dahinter laufen sie nie (Haus-Erkenntnis).
 */

let anzahlOk = 0;
let anzahlFehler = 0;
const offen = [];

function pruefe(name, bedingung, begruendung) {
    if (bedingung) {
        anzahlOk++;
        return;
    }
    anzahlFehler++;
    console.error("FEHLER: " + name);
    if (begruendung) {
        console.error("    " + begruendung);
    }
}

function gleich(name, ist, soll) {
    const a = JSON.stringify(ist);
    const b = JSON.stringify(soll);
    pruefe(name, a === b, "ist:  " + a + "\n    soll: " + b);
}

/* Für asynchrone Prüfungen: sammeln, `fazit()` wartet auf alle. */
function spaeter(name, versprechen) {
    offen.push(Promise.resolve(versprechen).catch((fehler) => {
        pruefe(name + " (Ausnahme)", false, fehler && fehler.stack ? fehler.stack : String(fehler));
    }));
}

async function fazit() {
    await Promise.all(offen);
    console.log(anzahlOk + " ok, " + anzahlFehler + " Fehler");
    process.exit(anzahlFehler === 0 ? 0 : 1);
}

/* Ein Browser-Speicher zum Mitnehmen (localStorage-Ersatz). */
function speicherAttrappe() {
    const daten = {};
    return {
        getItem: (k) => (Object.prototype.hasOwnProperty.call(daten, k) ? daten[k] : null),
        setItem: (k, v) => { daten[k] = String(v); },
        removeItem: (k) => { delete daten[k]; },
        _daten: daten
    };
}

module.exports = { pruefe, gleich, spaeter, fazit, speicherAttrappe };
