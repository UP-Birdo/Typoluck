/*
 * sammlung.js — was es in Typoluck zu sammeln gibt, und wie viel davon man
 * hat (seit 0.9.0, UPCrew-Runde 4). Nur das Modell; gezeigt wird es in
 * js\bildschirm-sammlung.js.
 *
 * Nutzer 27.09.2026: Album und Anpassen sind EIN Tab „Sammlung" — oben das
 * Aussehen zum Anziehen (gemeinsamer Baustein js\upcrew-anpassen.js),
 * darunter die „reine Sammlung": Dinge, die man nicht anzieht, sondern
 * einfach hat. In Typoluck sind das die Modi. Auftrag:
 * Design\3D-Schrift\docs\AUFTRAEGE-RUNDE-4.md, Block „Typoluck".
 *
 * WAS „DA" HEISST: In dieser Runde ist alles da, was es heute gibt
 * (Tageswort, Übung, Schwer-Modus). Was noch nicht gebaut ist (Blitzwort,
 * Wort-Duell), steht als „?" mit einer Zeile, was es wird. Freischalten
 * über Taten kommt mit Runde 5 — und dann wird nichts gesperrt, was heute
 * frei ist (Auftrag: „Nichts sperren, was heute frei ist").
 *
 * DER ANTEIL „NN %" oben rechts zählt über alle Regale des Aussehens
 * (Farbwelt, Schrift, Knöpfe — Darstellung nicht, die ist immer ganz frei
 * und kein Sammelstück) und über die Gruppen hier. Ab welcher Stufe ein
 * Stück des Aussehens frei ist, steht allein im Baustein
 * (`UPCREW_ANPASSEN.STUFEN`) — hier wird es nur gelesen, nie festgeschrieben.
 */

const SAMMLUNG = {

    /* Die Gruppen der reinen Sammlung, in der Reihenfolge der Anzeige.
       Ein Stück: id, name (kurz, passt unter die Kachel), da (hat man es),
       text (eine Zeile beim Antippen — kein ganzer Satz, UPCrew-Standard).
       Neue Stücke nur hinten anhängen. */
    GRUPPEN: [
        {
            id: "modi",
            titel: "Modi",
            stuecke: [
                { id: "tag", name: "Tageswort", da: true, text: "Ein Wort am Tag, für alle gleich" },
                { id: "uebung", name: "Übung", da: true, text: "Beliebig viele Runden, jedes Mal ein neues Wort" },
                { id: "schwer", name: "Schwer", da: true, text: "Gefundene Buchstaben müssen bleiben" },
                { id: "blitzwort", name: "Blitzwort", da: false, text: "Kommt: raten gegen die Uhr" },
                { id: "duell", name: "Wort-Duell", da: false, text: "Kommt: zwei Spieler, ein Wort" }
            ]
        }
    ],

    /* Die Regale des gemeinsamen Aussehens, die als Sammelstücke zählen. */
    AUSSEHEN_TEILE: ["farbwelt", "schrift", "knoepfe"],

    /* Wie viele Stücke einer Gruppe man hat. */
    gruppeZaehlen(gruppe) {
        return {
            hat: gruppe.stuecke.filter((stueck) => stueck.da).length,
            alle: gruppe.stuecke.length
        };
    },

    /*
     * Der Anteil über alles: Aussehen + Gruppen.
     *   stufen    UPCREW_ANPASSEN.STUFEN (aus dem Baustein, von aussen
     *             hereingereicht — so bleibt das Modell ohne Browser testbar)
     *   stufe     erreichte Stufe (heute 0)
     *   alleFrei  Werkstatt: alles zählt als frei
     * Liefert { hat, alle, prozent } — prozent ganzzahlig gerundet.
     */
    anteil(stufen, stufe, alleFrei) {
        let hat = 0;
        let alle = 0;
        for (const teil of SAMMLUNG.AUSSEHEN_TEILE) {
            const liste = (stufen && stufen[teil]) || {};
            for (const wert of Object.keys(liste)) {
                alle += 1;
                if (alleFrei || liste[wert] <= (stufe || 0)) {
                    hat += 1;
                }
            }
        }
        for (const gruppe of SAMMLUNG.GRUPPEN) {
            const zahl = SAMMLUNG.gruppeZaehlen(gruppe);
            hat += zahl.hat;
            alle += zahl.alle;
        }
        return { hat: hat, alle: alle, prozent: alle ? Math.round(hat / alle * 100) : 0 };
    }
};

if (typeof module !== "undefined" && module.exports) {
    module.exports = SAMMLUNG;
}
