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
 * (Tageswort, Übung; der Schwer-Modus seit 0.26.0 nicht mehr). Was noch nicht gebaut ist (Blitzwort,
 * Wort-Duell), steht als „?" mit einer Zeile, was es wird. Freischalten
 * über Taten kommt seit 0.13.0 — nur für NEUE Stücke (Gruppe
 * „Kachel-Sets"); nichts wird gesperrt, was vorher frei war (Auftrag:
 * „Nichts sperren, was heute frei ist").
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
                { id: "blitzwort", name: "Blitzwort", da: false, text: "Kommt: raten gegen die Uhr" },
                { id: "duell", name: "Wort-Duell", da: false, text: "Kommt: zwei Spieler, ein Wort" }
            ]
        },
        /* Seit 0.13.0 (Nutzer 27.09.2026, Runde 6 Frage 3: „Taten bauen"):
           NEUE Stücke, die über eine Tat kommen (`tat` = Kennung in
           FORTSCHRITT.TATEN). Namen aus dem Entwurf (Kachel-Sets). Papier
           ist das Grund-Set und immer da. Bestandsschutz: Kein Stück, das
           es vor 0.13.0 gab, hängt an einer Tat. Seit 0.14.0 anziehbar
           (`anziehbar`, js\kachelsets.js) und zehn statt fünf. Nutzer
           27.09.2026 („alle", Runde 6): alle zehn kommen rein — Papier
           frei, Leder/Blei/Holz/Neon über Taten, die fünf neuen über das
           Level (`ab`, seit 0.15.0), verteilt zwischen die Stufen des
           Aussehens (Farbwelt, Schrift, Knöpfe frei bei 2–9). */
        {
            id: "kachelsets",
            titel: "Kachel-Sets",
            stuecke: [
                { id: "papier", name: "Papier", da: true, anziehbar: true, text: "Das Grund-Set" },
                { id: "leder", name: "Leder", da: false, anziehbar: true, tat: "zweiter-versuch", text: "Kachel-Set" },
                { id: "blei", name: "Blei", da: false, anziehbar: true, tat: "serie-7", text: "Kachel-Set" },
                { id: "holz", name: "Holz", da: false, anziehbar: true, tat: "schwer-geloest", text: "Kachel-Set" },
                { id: "neon", name: "Neon", da: false, anziehbar: true, tat: "koennen-90", text: "Kachel-Set" },
                { id: "kreide", name: "Kreide", da: false, anziehbar: true, ab: 3, text: "Kachel-Set" },
                { id: "sand", name: "Sand", da: false, anziehbar: true, ab: 6, text: "Kachel-Set" },
                { id: "mitternacht", name: "Mitternacht", da: false, anziehbar: true, ab: 9, text: "Kachel-Set" },
                { id: "kupfer", name: "Kupfer", da: false, anziehbar: true, ab: 12, text: "Kachel-Set" },
                { id: "glas", name: "Glas", da: false, anziehbar: true, ab: 16, text: "Kachel-Set" }
            ]
        }
    ],

    /* Die Gruppen mit dem Stand des Spielers: Ein Stück mit Tat ist da,
       sobald die Tat erfüllt ist; ein Stück mit `ab`, sobald das Level
       reicht (seit 0.15.0). `taten` = Set oder Liste der erfüllten
       Tat-Kennungen (FORTSCHRITT.erfuellteTaten). `alleFrei` (Werkstatt,
       seit 0.14.0): alles Anziehbare ist da — zum Ausprobieren; die Modi
       bleiben, wie sie sind. `level` = das Level über alle Spiele. */
    gruppen(taten, alleFrei, level) {
        const erfuellt = new Set(taten || []);
        return SAMMLUNG.GRUPPEN.map((gruppe) => Object.assign({}, gruppe, {
            stuecke: gruppe.stuecke.map((stueck) => Object.assign({}, stueck, {
                da: stueck.da || (!!stueck.tat && erfuellt.has(stueck.tat))
                    || (typeof stueck.ab === "number" && (level || 0) >= stueck.ab)
                    || (alleFrei === true && stueck.anziehbar === true)
            }))
        }));
    },

    /* Ab welchem Level welches Kachel-Set frei ist — als Tabelle wie
       UPCREW_ANPASSEN.STUFEN ({ kreide: 3, … }), für die Belohnungen je
       Level (js\fortschritt.js). */
    kachelsetStufen() {
        const tabelle = {};
        for (const gruppe of SAMMLUNG.GRUPPEN) {
            for (const stueck of gruppe.stuecke) {
                if (stueck.anziehbar === true && typeof stueck.ab === "number") {
                    tabelle[stueck.id] = stueck.ab;
                }
            }
        }
        return tabelle;
    },

    /* Anzeigenamen der Kachel-Sets ({ kreide: "Kreide", … }). */
    kachelsetNamen() {
        const namen = {};
        for (const gruppe of SAMMLUNG.GRUPPEN) {
            for (const stueck of gruppe.stuecke) {
                if (stueck.anziehbar === true) {
                    namen[stueck.id] = stueck.name;
                }
            }
        }
        return namen;
    },

    /* Die Stücke, die an diesen Taten hängen (für „Neu: …"). */
    stueckeZuTaten(taten) {
        const liste = taten || [];
        const treffer = [];
        for (const gruppe of SAMMLUNG.GRUPPEN) {
            for (const stueck of gruppe.stuecke) {
                if (stueck.tat && liste.indexOf(stueck.tat) !== -1) {
                    treffer.push(stueck);
                }
            }
        }
        return treffer;
    },

    /* Die Regale des gemeinsamen Aussehens, die als Sammelstücke zählen. */
    AUSSEHEN_TEILE: ["farbwelt", "schrift", "knoepfe"],

    /* Ist ein Wert des Aussehens frei? Über das Level oder als Besitz. */
    _aussehenFrei(liste, teil, wert, stufe, besitz) {
        if (typeof UPCREW_ANPASSEN !== "undefined" && typeof UPCREW_ANPASSEN.frei === "function"
                && liste === (UPCREW_ANPASSEN.STUFEN || {})[teil]) {
            return UPCREW_ANPASSEN.frei(teil, wert, stufe, besitz);
        }
        if (typeof besitz === "function") {
            try {
                if (besitz(teil, wert)) {
                    return true;
                }
            } catch (fehler) {
                /* Fehler beim Besitz: dann zählt nur die Stufe. */
            }
        }
        return liste[wert] <= (stufe || 0);
    },

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
     *   alleFrei  Werkstatt: alles Aussehen zählt als frei
     *   taten     erfüllte Taten (seit 0.13.0, wahlfrei)
     *   besitz    (art, wert) → true = besessen, egal welches Level (seit
     *             0.27.0, wahlfrei; „Käufe aus dem Shop bleiben Besitz").
     * Frei rechnet seit 0.27.0 der Baustein (`UPCREW_ANPASSEN.frei`), wenn er
     * geladen ist — sonst dieselbe Regel hier (Tests ohne Browser).
     * Liefert { hat, alle, prozent } — prozent ganzzahlig gerundet.
     */
    anteil(stufen, stufe, alleFrei, taten, besitz) {
        let hat = 0;
        let alle = 0;
        for (const teil of SAMMLUNG.AUSSEHEN_TEILE) {
            const liste = (stufen && stufen[teil]) || {};
            for (const wert of Object.keys(liste)) {
                alle += 1;
                if (alleFrei || SAMMLUNG._aussehenFrei(liste, teil, wert, stufe, besitz)) {
                    hat += 1;
                }
            }
        }
        for (const gruppe of SAMMLUNG.gruppen(taten, false, stufe)) {
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
