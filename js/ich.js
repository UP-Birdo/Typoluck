/*
 * ich.js — was nur auf DIESEM Gerät liegt.
 *
 *   person       wer hier angemeldet ist ({ id, name })
 *   spielstand   angefangene Runden je Spiel — wer die App mitten im
 *                Tageswort schliesst, findet seine Versuche wieder
 *   ausstehend   fertige Ergebnisse, die noch nicht in der Datenbank sind
 *                (kein Netz, Regel fehlt) — sie werden beim nächsten Start
 *                nachgereicht (js\ergebnisse.js)
 *
 * Alle Schlüssel beginnen mit „typoluck.": Alle Apps unter
 * up-birdo.github.io teilen sich denselben Browser-Speicher. Die Anmeldung
 * ist bewusst NICHT zwischen den Spielen geteilt — wer in einem anderen
 * UPCrew-Spiel angemeldet ist, meldet sich hier einmal mit demselben Konto an.
 *
 * Alles ist ausfallsicher: Ist der Speicher gesperrt oder kaputt, liefert
 * jede Funktion einen leeren Wert und die App läuft weiter.
 */

const ICH = {

    SCHLUESSEL_PERSON: "typoluck.ich",
    SCHLUESSEL_SPIELSTAND: "typoluck.spielstand",
    SCHLUESSEL_AUSSTEHEND: "typoluck.ausstehend",

    /* Welcher Speicher benutzt wird. Die Tests setzen hier einen Ersatz ein. */
    _speicher() {
        return (typeof window !== "undefined") ? window.localStorage : null;
    },

    /* ---------------------------------------------------------------- *
     * Wer bin ich
     * ---------------------------------------------------------------- */

    person() {
        const roh = ICH._lesen(ICH.SCHLUESSEL_PERSON);
        if (!roh || typeof roh.id !== "string" || roh.id === "") {
            return null;
        }
        return { id: roh.id, name: (typeof roh.name === "string") ? roh.name : "" };
    },

    personSetzen(id, name) {
        ICH._schreiben(ICH.SCHLUESSEL_PERSON, { id: id, name: name });
    },

    personVergessen() {
        ICH._loeschen(ICH.SCHLUESSEL_PERSON);
    },

    /* ---------------------------------------------------------------- *
     * Angefangene Runden — je Schlüssel (z. B. "wordle-tag") eine
     * ---------------------------------------------------------------- */

    spielstand(schluessel) {
        const alle = ICH._lesen(ICH.SCHLUESSEL_SPIELSTAND);
        return (alle && typeof alle === "object" && alle[schluessel]) ? alle[schluessel] : null;
    },

    spielstandSetzen(schluessel, stand) {
        const alle = ICH._lesen(ICH.SCHLUESSEL_SPIELSTAND);
        const neu = (alle && typeof alle === "object") ? alle : {};
        if (stand === null) {
            delete neu[schluessel];
        } else {
            neu[schluessel] = stand;
        }
        ICH._schreiben(ICH.SCHLUESSEL_SPIELSTAND, neu);
    },

    /* ---------------------------------------------------------------- *
     * Ausstehende Ergebnisse — eine Liste von Schreib-Aufträgen
     * ---------------------------------------------------------------- */

    ausstehend() {
        const liste = ICH._lesen(ICH.SCHLUESSEL_AUSSTEHEND);
        return Array.isArray(liste) ? liste : [];
    },

    ausstehendSetzen(liste) {
        if (!Array.isArray(liste) || liste.length === 0) {
            ICH._loeschen(ICH.SCHLUESSEL_AUSSTEHEND);
            return;
        }
        ICH._schreiben(ICH.SCHLUESSEL_AUSSTEHEND, liste);
    },

    /* ---------------------------------------------------------------- *
     * Innereien
     * ---------------------------------------------------------------- */

    _lesen(schluessel) {
        try {
            const text = ICH._speicher().getItem(schluessel);
            return text ? JSON.parse(text) : null;
        } catch (fehler) {
            return null;
        }
    },

    _schreiben(schluessel, wert) {
        try {
            ICH._speicher().setItem(schluessel, JSON.stringify(wert));
        } catch (fehler) {
            /* Voller oder gesperrter Speicher: Die App läuft weiter, sie
               vergisst dann nur zwischen zwei Besuchen. */
        }
    },

    _loeschen(schluessel) {
        try {
            ICH._speicher().removeItem(schluessel);
        } catch (fehler) {
            /* wie oben */
        }
    }
};

if (typeof module !== "undefined" && module.exports) {
    module.exports = ICH;
}
