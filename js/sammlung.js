/*
 * sammlung.js — was es in Typoluck zu sammeln gibt, und wie viel davon man
 * hat (seit 0.9.0, UPCrew-Runde 4). Nur das Modell; gezeigt wird es in
 * js\bildschirm-sammlung.js.
 *
 * Nutzer 27.09.2026: Album und Anpassen sind EIN Tab „Sammlung" — oben das
 * Aussehen zum Anziehen (gemeinsamer Baustein js\upcrew-anpassen.js),
 * darunter die „reine Sammlung": Dinge, die man nicht anzieht, sondern
 * einfach hat. In Typoluck sind das die Modi. Auftrag:
 * Design-Auftrag AUFTRAEGE-RUNDE-4.md, Block „Typoluck".
 *
 * WAS „DA" HEISST: In dieser Runde ist alles da, was es heute gibt
 * (Tageswort, Übung; der Schwer-Modus seit 0.26.0 nicht mehr). Was noch nicht gebaut ist (Blitzwort,
 * Wort-Duell), steht als „?" mit einer Zeile, was es wird. Freischalten
 * über Taten kommt seit 0.13.0 — nur für NEUE Stücke (Gruppe
 * „Kachel-Sets"); nichts wird gesperrt, was vorher frei war (Auftrag:
 * „Nichts sperren, was heute frei ist").
 *
 * SEIT 0.30.0 (Sammlung „Variante A", UPCrew-Runde 8): Die Kachel-Sets
 * sind ein REGAL des Anpassen-Bausteins (Kachel mit Blatt, Probe,
 * Übernehmen) und stehen nicht mehr in der reinen Sammlung. Diese Datei
 * bleibt das Modell dafür, welches Set FREI ist (Tat oder Level,
 * `kachelsetStuecke`); die Liste der Sets führt der gemeinsame Katalog
 * (js\upcrew-katalog.js, Art „kachelset") — tests\test-sammlung.js hält
 * beide gleich.
 *
 * DER ANTEIL „NN %" oben rechts (seit 0.30.0): was der Anpassen-Baustein
 * über alle Sammel-Kacheln zählt (`tab.zaehlen()`, samt Kachel-Sets) plus
 * die eigenen Abschnitte der reinen Sammlung (Abzeichen, Modi). Die eigene
 * Rechnung über die Stufen-Tabelle des Bausteins gibt es nicht mehr. Ab
 * welcher Stufe ein Stück des Aussehens frei ist, steht allein im Baustein
 * (`UPCREW_ANPASSEN.STUFEN`) — nie hier.
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
            /* Seit 0.30.0: kein Abschnitt der reinen Sammlung mehr, sondern
               das Regal „kachelset" des Anpassen-Bausteins (= die Art im
               Katalog). */
            regal: "kachelset",
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
       bleiben, wie sie sind. `level` = das Level über alle Spiele.
       `besitz(art, wert)` (seit 0.31.0, wahlfrei): der Haken für Gekauftes —
       ein Stück eines Regals (Art = `regal`, heute die Kachel-Sets) ist
       auch da, wenn es im Shop gekauft wurde. Der Weg über Tat und Level
       bleibt daneben unverändert. */
    gruppen(taten, alleFrei, level, besitz) {
        const erfuellt = new Set(taten || []);
        const gekauft = (gruppe, stueck) => {
            if (!gruppe.regal || typeof besitz !== "function") {
                return false;
            }
            try {
                return besitz(gruppe.regal, stueck.id) === true;
            } catch (fehler) {
                return false;
            }
        };
        return SAMMLUNG.GRUPPEN.map((gruppe) => Object.assign({}, gruppe, {
            stuecke: gruppe.stuecke.map((stueck) => Object.assign({}, stueck, {
                da: stueck.da || (!!stueck.tat && erfuellt.has(stueck.tat))
                    || (typeof stueck.ab === "number" && (level || 0) >= stueck.ab)
                    || (alleFrei === true && stueck.anziehbar === true)
                    || gekauft(gruppe, stueck)
            }))
        }));
    },

    /* Die Gruppen der REINEN Sammlung (seit 0.30.0): alle ohne `regal` —
       heute die Modi. Mit dem Stand des Spielers wie `gruppen`. */
    restGruppen(taten, alleFrei, level) {
        return SAMMLUNG.gruppen(taten, alleFrei, level).filter((gruppe) => !gruppe.regal);
    },

    /* Die Kachel-Sets als Stücke für das Regal des Anpassen-Bausteins
       (seit 0.30.0): [{ wert, name, frei }] in der Reihenfolge der Anzeige.
       `frei` = was `gruppen` „da" nennt: Papier immer, sonst über die Tat
       oder das Level; mit `alleFrei` (Werkstatt) alle; seit 0.31.0 auch,
       was gekauft ist (`besitz`, wahlfrei). */
    kachelsetStuecke(taten, alleFrei, level, besitz) {
        const stuecke = [];
        for (const gruppe of SAMMLUNG.gruppen(taten, alleFrei, level, besitz)) {
            if (gruppe.regal !== "kachelset") {
                continue;
            }
            for (const stueck of gruppe.stuecke) {
                stuecke.push({ wert: stueck.id, name: stueck.name, frei: stueck.da === true });
            }
        }
        return stuecke;
    },

    /*
     * Ist ein Stück des Katalogs auf dem HEUTIGEN Weg frei — ohne Kauf
     * (seit 0.31.0, für den Shop: so ein Stück steht dort als „im Besitz"
     * und wird nicht noch einmal verkauft)? Kachel-Sets über Tat oder
     * Level, Farbwelt · Schrift · Knöpfe über die Stufen des Bausteins (nie
     * hier festgeschrieben). Alles andere: nein. `alleFrei` (Werkstatt)
     * gibt frei, was auch die Sammlung dann freigibt.
     */
    erspielt(art, wert, taten, alleFrei, level) {
        if (art === "kachelset") {
            return SAMMLUNG.kachelsetStuecke(taten, alleFrei, level).some((stueck) => stueck.wert === wert && stueck.frei);
        }
        if (typeof UPCREW_ANPASSEN === "undefined") {
            return false;
        }
        const stufen = UPCREW_ANPASSEN.STUFEN[art];
        if (!stufen || !(wert in stufen)) {
            return false;
        }
        return alleFrei === true || UPCREW_ANPASSEN.frei(art, wert, level) === true;
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

    /* Wie viele Stücke einer Gruppe man hat. */
    gruppeZaehlen(gruppe) {
        return {
            hat: gruppe.stuecke.filter((stueck) => stueck.da).length,
            alle: gruppe.stuecke.length
        };
    },

    /*
     * Der Anteil über alles (seit 0.30.0):
     *   zahl        { hat, alle } aus dem Anpassen-Baustein (`tab.zaehlen()`:
     *               alle Sammel-Kacheln samt Kachel-Sets)
     *   abschnitte  [{ hat, alle }, …] — die eigenen Abschnitte der reinen
     *               Sammlung (Abzeichen, Modi), so wie sie auf ihren Kacheln
     *               stehen
     * Liefert { hat, alle, prozent } — prozent ganzzahlig gerundet. Was
     * keine Zahl ist, zählt nicht. (Bis 0.29.0 rechnete diese Funktion
     * selbst über die Stufen-Tabelle des Bausteins.)
     */
    anteil(zahl, abschnitte) {
        const ganz = (wert) => {
            const n = Number(wert);
            return (isFinite(n) && n > 0) ? Math.floor(n) : 0;
        };
        let hat = ganz(zahl && zahl.hat);
        let alle = ganz(zahl && zahl.alle);
        for (const abschnitt of abschnitte || []) {
            hat += ganz(abschnitt && abschnitt.hat);
            alle += ganz(abschnitt && abschnitt.alle);
        }
        return { hat: hat, alle: alle, prozent: alle ? Math.round(hat / alle * 100) : 0 };
    }
};

if (typeof module !== "undefined" && module.exports) {
    module.exports = SAMMLUNG;
}
