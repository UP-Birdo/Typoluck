/*
 * ergebnisse.js — was von einer gespielten Runde in die Datenbank kommt,
 * und wie es dort hinkommt.
 *
 * DER BEREICH `typoluck` GEHÖRT NUR DIESER APP. Aufbau (additiv — Felder
 * werden nur ergänzt, nie umbenannt oder gelöscht):
 *
 *     typoluck
 *     ├── geaendertAm: 1750000000000
 *     └── wordle
 *         ├── tage
 *         │   └── "2026-09-24"
 *         │       └── "<spielerId>": ERGEBNIS      ← die Rangliste des Tages
 *         └── verlauf
 *             └── "<spielerId>"
 *                 └── "2026-09-24": ERGEBNIS       ← das eigene Profil
 *
 *     ERGEBNIS = {
 *         geloest:   true,
 *         versuche:  3,                 // 1–6; ungelöst immer 6
 *         muster:    ["FVFFF", …],      // je Zeile R/V/F, OHNE Buchstaben
 *         nummer:    1,                 // Rätsel-Nummer
 *         beendetAm: 1750000000000,
 *         dauerMs:   84000
 *     }
 *
 * WARUM ZWEIMAL DASSELBE: Die Rangliste eines Tages braucht nur einen
 * kleinen Knoten (alle Spieler, ein Tag); das Profil nur einen anderen
 * (ein Spieler, alle Tage). Beide werden in EINEM Schritt geschrieben
 * (Mehrpfad-Änderung) — entweder beide oder keiner.
 *
 * WARUM DAS WORT NICHT DRINSTEHT: Die Datenbank ist öffentlich lesbar. Wer
 * früh spielt, verriete sonst allen anderen die Lösung des Tages. Welches
 * Wort an einem Tag dran war, rechnet `WORDLE.tageswort` jederzeit nach.
 *
 * JEDER SCHREIBT NUR SEINE EIGENEN KNOTEN. Deshalb gibt es hier — anders
 * als bei der Spielerliste — nichts zusammenzuführen und keinen Abgleich.
 *
 * ERST AUFS GERÄT, DANN INS NETZ: Ein fertiges Ergebnis kommt zuerst in die
 * Warteliste auf dem Gerät (ICH.ausstehend) und wird von dort gesendet.
 * Schlägt das fehl (kein Netz, Regel fehlt noch), bleibt es liegen und geht
 * beim nächsten Start raus. So geht kein gespieltes Tageswort verloren.
 */

const ERGEBNISSE = {

    /* Aus einer beendeten Runde (js\wordle.js) das Ergebnis bauen. */
    ausRunde(runde) {
        return {
            geloest: runde.zustand === "gewonnen",
            versuche: runde.zustand === "gewonnen" ? runde.versuche.length : WORDLE.VERSUCHE,
            muster: WORDLE.muster(runde),
            nummer: runde.nummer || 0,
            beendetAm: runde.beendetAm || 0,
            dauerMs: Math.max(0, (runde.beendetAm || 0) - (runde.begonnenAm || 0))
        };
    },

    /* Ein geladenes Ergebnis in Form bringen; null, wenn unbrauchbar. */
    normalisieren(roh) {
        if (!roh || typeof roh !== "object") {
            return null;
        }
        const versuche = Number(roh.versuche);
        if (!Number.isInteger(versuche) || versuche < 1 || versuche > WORDLE.VERSUCHE) {
            return null;
        }
        return {
            geloest: roh.geloest === true,
            versuche: versuche,
            muster: Array.isArray(roh.muster)
                ? roh.muster.filter((zeile) => typeof zeile === "string" && /^[RVF]{5}$/.test(zeile))
                : [],
            nummer: Number(roh.nummer) || 0,
            beendetAm: Number(roh.beendetAm) || 0,
            dauerMs: Number(roh.dauerMs) || 0
        };
    },

    /* Einen ganzen Knoten { schluessel: ERGEBNIS } normalisieren;
       Unbrauchbares fällt weg. */
    knotenNormalisieren(roh) {
        const ergebnis = {};
        if (!roh || typeof roh !== "object") {
            return ergebnis;
        }
        for (const schluessel of Object.keys(roh)) {
            const eintrag = ERGEBNISSE.normalisieren(roh[schluessel]);
            if (eintrag) {
                ergebnis[schluessel] = eintrag;
            }
        }
        return ergebnis;
    },

    /* Die Mehrpfad-Änderung für ein Ergebnis — beide Stellen plus Marke. */
    aenderungen(spielerId, datum, ergebnis, zeitpunkt) {
        const aenderungen = {};
        aenderungen["wordle/tage/" + datum + "/" + spielerId] = ergebnis;
        aenderungen["wordle/verlauf/" + spielerId + "/" + datum] = ergebnis;
        aenderungen["geaendertAm"] = zeitpunkt;
        return aenderungen;
    },

    /* ---------------------------------------------------------------- *
     * Senden — über die Warteliste auf dem Gerät
     * ---------------------------------------------------------------- */

    /* Ein fertiges Tageswort melden: erst merken, dann senden. */
    async melden(speicher, spielerId, runde) {
        const auftrag = {
            spielerId: spielerId,
            datum: runde.datum,
            ergebnis: ERGEBNISSE.ausRunde(runde)
        };
        const liste = ICH.ausstehend().filter((alt) =>
            !(alt.spielerId === auftrag.spielerId && alt.datum === auftrag.datum));
        liste.push(auftrag);
        ICH.ausstehendSetzen(liste);
        return ERGEBNISSE.nachreichen(speicher);
    },

    /*
     * Alles aus der Warteliste senden. Liefert { gesendet, offen, fehler }.
     * Was gesendet ist, fliegt aus der Liste; was scheitert, bleibt. Beim
     * ersten Fehler wird aufgehört — hat das Netz gerade keine Lust, hat es
     * sie beim zweiten Auftrag auch nicht.
     */
    async nachreichen(speicher) {
        let liste = ICH.ausstehend();
        let gesendet = 0;
        let fehler = "";

        for (const auftrag of liste.slice()) {
            try {
                await speicher.teilSchreiben(ERGEBNISSE.aenderungen(
                    auftrag.spielerId, auftrag.datum, auftrag.ergebnis, Date.now()));
                gesendet++;
                liste = liste.filter((alt) => alt !== auftrag);
                ICH.ausstehendSetzen(liste);
            } catch (ausnahme) {
                fehler = ausnahme.message;
                break;
            }
        }
        return { gesendet: gesendet, offen: liste.length, fehler: fehler };
    },

    /* ---------------------------------------------------------------- *
     * Lesen
     * ---------------------------------------------------------------- */

    /* Alle Ergebnisse eines Tages: { spielerId: ERGEBNIS }. */
    async tagLaden(speicher, datum) {
        return ERGEBNISSE.knotenNormalisieren(await speicher.teilLaden("wordle/tage/" + datum));
    },

    /* Mehrere Tage gleichzeitig: { datum: { spielerId: ERGEBNIS } }. */
    async tageLaden(speicher, daten) {
        const antworten = await Promise.all(daten.map((datum) => ERGEBNISSE.tagLaden(speicher, datum)));
        const ergebnis = {};
        daten.forEach((datum, i) => {
            ergebnis[datum] = antworten[i];
        });
        return ergebnis;
    },

    /* Der eigene Verlauf: { datum: ERGEBNIS }. */
    async verlaufLaden(speicher, spielerId) {
        return ERGEBNISSE.knotenNormalisieren(await speicher.teilLaden("wordle/verlauf/" + spielerId));
    },

    /* Was noch auf dem Gerät wartet, zählt für das eigene Profil schon mit —
       sonst fehlte das Tageswort, bis das Netz wieder da ist. */
    verlaufMitAusstehendem(verlauf, spielerId) {
        const ergebnis = Object.assign({}, verlauf);
        for (const auftrag of ICH.ausstehend()) {
            if (auftrag.spielerId === spielerId && !ergebnis[auftrag.datum]) {
                const eintrag = ERGEBNISSE.normalisieren(auftrag.ergebnis);
                if (eintrag) {
                    ergebnis[auftrag.datum] = eintrag;
                }
            }
        }
        return ergebnis;
    }
};

if (typeof module !== "undefined" && module.exports) {
    module.exports = ERGEBNISSE;
}
