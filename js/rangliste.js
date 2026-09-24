/*
 * rangliste.js — Punkte, Plätze und Statistik. Reines Modell.
 *
 * PUNKTEREGELN NUR HIER: die Zahlen, die Rechnung UND der Erklärungstext
 * stehen zusammen, damit die angezeigte Regel nie von der gerechneten
 * abweicht. Der Bildschirm (js\bildschirm-rangliste.js) zeigt nur an.
 *
 * Die Rangliste schreibt nichts. Sie liest die Ergebnisse
 * (js\ergebnisse.js) und die Spielerliste (js\spieler.js) und rechnet.
 */

const RANGLISTE = {

    /* Gelöst im 1. Versuch = 6 Punkte, im 6. = 1 Punkt, ungelöst 0. */
    punkte(ergebnis) {
        if (!ergebnis || !ergebnis.geloest) {
            return 0;
        }
        return Math.max(0, 7 - ergebnis.versuche);
    },

    ERKLAERUNG: "Gelöst im ersten Versuch bringt 6 Punkte, im zweiten 5 und so "
        + "weiter bis 1 Punkt im sechsten. Nicht gelöst: 0 Punkte. Jeder Tag "
        + "zählt einmal — gewertet wird nur das Tageswort, nicht die Übung.",

    /* Die letzten `anzahl` Tage bis einschliesslich `heute`, neuester zuerst. */
    letzteTage(heute, anzahl) {
        const [jahr, monat, tag] = heute.split("-").map(Number);
        const tage = [];
        for (let i = 0; i < anzahl; i++) {
            const datum = new Date(Date.UTC(jahr, monat - 1, tag - i));
            tage.push(datum.getUTCFullYear() + "-"
                + String(datum.getUTCMonth() + 1).padStart(2, "0") + "-"
                + String(datum.getUTCDate()).padStart(2, "0"));
        }
        return tage;
    },

    /*
     * Wer in der Tabelle steht: alle, oder nur ich und meine Freunde.
     * Liefert eine Menge von Kennungen, oder null für „alle".
     */
    auswahl(spielerDaten, ichId, nurFreunde) {
        if (!nurFreunde) {
            return null;
        }
        const menge = new Set([ichId]);
        for (const freund of SPIELER.freundeVon(spielerDaten, ichId).freunde) {
            menge.add(freund.id);
        }
        return menge;
    },

    /*
     * Die Tabelle eines Tages. `tag` = { spielerId: ERGEBNIS }.
     * Zeilen: { id, name, punkte, versuche, geloest, muster, platz }.
     * Reihenfolge: Punkte absteigend, bei Gleichstand wer früher fertig war.
     * Gleiche Punkte = gleicher Platz.
     */
    tagesTabelle(tag, spielerDaten, auswahl) {
        const zeilen = [];
        for (const id of Object.keys(tag || {})) {
            const spieler = SPIELER.spielerFinden(spielerDaten, id);
            if (!spieler || (auswahl && !auswahl.has(id))) {
                continue;
            }
            const ergebnis = tag[id];
            zeilen.push({
                id: id,
                name: spieler.name,
                punkte: RANGLISTE.punkte(ergebnis),
                versuche: ergebnis.versuche,
                geloest: ergebnis.geloest,
                muster: ergebnis.muster,
                beendetAm: ergebnis.beendetAm
            });
        }
        zeilen.sort((a, b) => (b.punkte - a.punkte) || (a.beendetAm - b.beendetAm));
        return RANGLISTE._plaetzeVergeben(zeilen);
    },

    /*
     * Die Tabelle über mehrere Tage. `tage` = { datum: { spielerId: ERGEBNIS } }.
     * Zeilen: { id, name, punkte, gespielt, geloest, platz }.
     * Bei Punktgleichstand zählt, wer mehr gelöst hat, dann der Name.
     */
    zeitraumTabelle(tage, spielerDaten, auswahl) {
        const summen = {};
        for (const datum of Object.keys(tage || {})) {
            for (const id of Object.keys(tage[datum] || {})) {
                if (!summen[id]) {
                    summen[id] = { punkte: 0, gespielt: 0, geloest: 0 };
                }
                const ergebnis = tage[datum][id];
                summen[id].punkte += RANGLISTE.punkte(ergebnis);
                summen[id].gespielt += 1;
                summen[id].geloest += ergebnis.geloest ? 1 : 0;
            }
        }

        const zeilen = [];
        for (const id of Object.keys(summen)) {
            const spieler = SPIELER.spielerFinden(spielerDaten, id);
            if (!spieler || (auswahl && !auswahl.has(id))) {
                continue;
            }
            zeilen.push(Object.assign({ id: id, name: spieler.name }, summen[id]));
        }
        zeilen.sort((a, b) => (b.punkte - a.punkte) || (b.geloest - a.geloest)
            || a.name.localeCompare(b.name, "de"));
        return RANGLISTE._plaetzeVergeben(zeilen);
    },

    /*
     * Die Statistik eines Spielers aus seinem Verlauf { datum: ERGEBNIS }:
     * { gespielt, geloest, quote (0–100), verteilung [6 Zahlen],
     *   serie, besteSerie, punkte }.
     *
     * SERIE = gelöste Tage am Stück bis heute. Ist heute noch nicht gespielt,
     * zählt die Serie bis gestern — sie reisst erst, wenn ein Tag vorbeigeht.
     */
    statistik(verlauf, heute) {
        const daten = Object.keys(verlauf || {}).sort();
        const statistik = {
            gespielt: daten.length, geloest: 0, quote: 0,
            verteilung: [0, 0, 0, 0, 0, 0], serie: 0, besteSerie: 0, punkte: 0
        };

        let lauf = 0;
        let vorheriges = null;
        for (const datum of daten) {
            const ergebnis = verlauf[datum];
            statistik.punkte += RANGLISTE.punkte(ergebnis);
            if (ergebnis.geloest) {
                statistik.geloest++;
                statistik.verteilung[ergebnis.versuche - 1]++;
                const amStueck = vorheriges !== null && WORDLE.tageZwischen(vorheriges, datum) === 1;
                lauf = amStueck ? lauf + 1 : 1;
                vorheriges = datum;
            } else {
                lauf = 0;
                vorheriges = null;
            }
            statistik.besteSerie = Math.max(statistik.besteSerie, lauf);
        }

        /* Die laufende Serie gilt nur, wenn ihr letzter Tag heute oder
           gestern ist. */
        if (vorheriges !== null && WORDLE.tageZwischen(vorheriges, heute) <= 1) {
            statistik.serie = lauf;
        }
        statistik.quote = statistik.gespielt === 0 ? 0
            : Math.round(100 * statistik.geloest / statistik.gespielt);
        return statistik;
    },

    _plaetzeVergeben(zeilen) {
        let platz = 0;
        let letztePunkte = null;
        zeilen.forEach((zeile, i) => {
            if (zeile.punkte !== letztePunkte) {
                platz = i + 1;
                letztePunkte = zeile.punkte;
            }
            zeile.platz = platz;
        });
        return zeilen;
    }
};

if (typeof module !== "undefined" && module.exports) {
    module.exports = RANGLISTE;
}
