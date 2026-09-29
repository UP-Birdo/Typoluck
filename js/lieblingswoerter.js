/*
 * lieblingswoerter.js — die Lieblingswörter eines Spielers (seit 0.28.0).
 *
 * WOZU: Der Boss „Der Zensor" (Buch 4, js/bibliothek.js) bannt die Wörter,
 * die man am liebsten rät (Konzept Apps\UPCrew\docs\BIBLIOTHEK-UND-
 * BELOHNUNGEN.md §3.5; Koordination 30.09.2026: „Top 3 privat ans Konto,
 * Boss bannt sie"). Nebenbei sieht man sie klein im eigenen Profil.
 *
 * GEZÄHLT AUF DEM GERÄT (`typoluck.lieblingswoerter`, je Spieler-Id, Gäste
 * „gast"), einmal je beendeter Runde (APP.fortschrittMelden):
 *     { je: { <id>: { n, w: { <wort>: [erst, sonst, zuletzt] }, k } } }
 *   n        gezählte Runden dieses Spielers
 *   erst     wie oft das Wort der ERSTE Versuch einer Runde war
 *   sonst    wie oft es ein späterer Versuch war
 *   zuletzt  `n` der letzten Runde mit dem Wort
 *   k        die zuletzt ans Konto geschickten Top 3 („a,b,c")
 * Ein Wort zählt je Runde höchstens einmal. Punkte = 3 × erst + 1 × sonst
 * (der erste Versuch ist die bewusste Wahl, spätere folgen dem Brett).
 *
 * KLEIN GEHALTEN: höchstens MAX Wörter. Ein Wort, das ALTER Runden lang
 * nicht mehr kam, fällt heraus; ist die Liste voll, fällt das mit den
 * wenigsten Punkten (bei Gleichstand das älteste) — nie eins der eben
 * gezählten Runde.
 *
 * TOP 3 = die Lieblingswörter: nach Punkten, nur Wörter, die in
 * mindestens MIN_RUNDEN Runden vorkamen (nach einer einzigen Runde hat
 * noch niemand Lieblingswörter).
 *
 * AM KONTO (privat, Regel §13 „Erweitert 30.09.", DATENBANK-KONZEPT-12.md):
 *     konten/<uid>/lieblingswoerter/typoluck/0..2   Kleinbuchstaben, 4–8
 * Nur echte Konten (der `uidGeber` aus js/app.js liefert für Gäste und die
 * Werkstatt null). Die Regel ist vorbereitet, aber NICHT eingespielt —
 * deshalb hängt das Schreiben am selben Schalter wie Grau:
 * `SpeicherKonten.REGEL_GRAU_EINGESPIELT` (Blunderlucks Klasse). Solange
 * er false ist, geht NICHTS ans Konto (sonst lehnt die Datenbank ab). Das
 * Feld `REGEL` überstimmt ihn nur in Tests. Die Zählung selbst bleibt
 * immer auf dem Gerät. Still bei Fehler.
 *
 * NUR a–z, ä, ö, ü (seit 30.09.2026): Die Tastatur hat kein ß, die
 * Wortlisten schreiben „ss" — ein Wort mit ß zählt nie (wie am Konto).
 *
 * Kein Math.random(), kein DOM — rein bis auf den Gerätespeicher (ICH).
 */

const LIEBLINGSWOERTER = {

    SCHLUESSEL: "typoluck.lieblingswoerter",
    APP: "typoluck",
    GEWICHT_ERST: 3,
    GEWICHT_SONST: 1,
    TOP: 3,
    MIN_RUNDEN: 2,
    MAX: 40,
    ALTER: 300,
    /* Was die Regel am Konto erlaubt (§13, `lieblingswoerter/$app/$i`) —
       und seit 30.09.2026 auch, was überhaupt zählt (kein ß). */
    MUSTER_KONTO: /^[a-zäöü]{4,8}$/,

    /* Tests: true/false überstimmt den Schalter, sonst null. */
    REGEL: null,

    /* ---------------------------------------------------------------- *
     * Das Modell — rein
     * ---------------------------------------------------------------- */

    leer() {
        return { n: 0, w: {}, k: "" };
    },

    _istWort(wort) {
        return typeof wort === "string" && LIEBLINGSWOERTER.MUSTER_KONTO.test(wort);
    },

    normalisieren(roh) {
        const stand = LIEBLINGSWOERTER.leer();
        if (!roh || typeof roh !== "object" || Array.isArray(roh)) {
            return stand;
        }
        const zahl = (z) => (Number.isInteger(z) && z >= 0) ? z : 0;
        stand.n = zahl(roh.n);
        stand.k = typeof roh.k === "string" ? roh.k.slice(0, 40) : "";
        const w = (roh.w && typeof roh.w === "object") ? roh.w : {};
        for (const wort of Object.keys(w)) {
            const e = w[wort];
            if (LIEBLINGSWOERTER._istWort(wort) && Array.isArray(e)) {
                const eintrag = [zahl(e[0]), zahl(e[1]), Math.min(stand.n, zahl(e[2]))];
                if (eintrag[0] + eintrag[1] > 0) {
                    stand.w[wort] = eintrag;
                }
            }
        }
        return LIEBLINGSWOERTER._kuerzen(stand);
    },

    punkte(eintrag) {
        return Array.isArray(eintrag)
            ? eintrag[0] * LIEBLINGSWOERTER.GEWICHT_ERST + eintrag[1] * LIEBLINGSWOERTER.GEWICHT_SONST : 0;
    },

    /* Wörter nach Rang: Punkte, dann öfter zuerst, dann jünger, dann ABC. */
    _rang(stand) {
        return Object.keys(stand.w).sort((a, b) => {
            const x = stand.w[a];
            const y = stand.w[b];
            return LIEBLINGSWOERTER.punkte(y) - LIEBLINGSWOERTER.punkte(x)
                || y[0] - x[0] || y[2] - x[2] || (a < b ? -1 : a > b ? 1 : 0);
        });
    },

    /* Alte heraus, dann auf MAX kürzen (Schwächste, bei Gleichstand Älteste). */
    _kuerzen(stand) {
        for (const wort of Object.keys(stand.w)) {
            if (stand.n - stand.w[wort][2] >= LIEBLINGSWOERTER.ALTER) {
                delete stand.w[wort];
            }
        }
        const woerter = Object.keys(stand.w);
        if (woerter.length > LIEBLINGSWOERTER.MAX) {
            /* Wörter der eben gezählten Runde zuletzt — sonst käme ein neues
               Wort bei voller Liste nie hinein. */
            const jetzt = (e) => (e[2] === stand.n ? 1 : 0);
            woerter.sort((a, b) => {
                const x = stand.w[a];
                const y = stand.w[b];
                return jetzt(x) - jetzt(y) || LIEBLINGSWOERTER.punkte(x) - LIEBLINGSWOERTER.punkte(y)
                    || x[2] - y[2] || (a < b ? 1 : a > b ? -1 : 0);
            });
            for (const wort of woerter.slice(0, woerter.length - LIEBLINGSWOERTER.MAX)) {
                delete stand.w[wort];
            }
        }
        return stand;
    },

    /* Eine Runde zählen: `versuche` in Reihenfolge. Liefert einen NEUEN Stand. */
    zaehlen(stand, versuche) {
        const neu = LIEBLINGSWOERTER.normalisieren(JSON.parse(JSON.stringify(stand || {})));
        const liste = (Array.isArray(versuche) ? versuche : [])
            .map((wort) => String(wort || "").toLowerCase());
        if (!liste.some((wort) => LIEBLINGSWOERTER._istWort(wort))) {
            return neu;
        }
        neu.n += 1;
        const gesehen = {};
        liste.forEach((wort, i) => {
            if (!LIEBLINGSWOERTER._istWort(wort) || gesehen[wort]) {
                return;
            }
            gesehen[wort] = true;
            const e = neu.w[wort] || [0, 0, 0];
            e[i === 0 ? 0 : 1] += 1;
            e[2] = neu.n;
            neu.w[wort] = e;
        });
        return LIEBLINGSWOERTER._kuerzen(neu);
    },

    /* Die Top 3 — die Lieblingswörter (höchstens TOP, vielleicht keine). */
    top(stand) {
        const s = LIEBLINGSWOERTER.normalisieren(stand);
        return LIEBLINGSWOERTER._rang(s)
            .filter((wort) => s.w[wort][0] + s.w[wort][1] >= LIEBLINGSWOERTER.MIN_RUNDEN)
            .slice(0, LIEBLINGSWOERTER.TOP);
    },

    /* Was ans Konto darf: { "0": …, "1": …, "2": … } nur mit Wörtern nach
       der Regel — oder null, wenn keins übrig bleibt. */
    fuerKonto(woerter) {
        const sauber = (Array.isArray(woerter) ? woerter : [])
            .filter((wort) => typeof wort === "string" && LIEBLINGSWOERTER.MUSTER_KONTO.test(wort))
            .slice(0, LIEBLINGSWOERTER.TOP);
        if (!sauber.length) {
            return null;
        }
        const aus = {};
        sauber.forEach((wort, i) => { aus[String(i)] = wort; });
        return aus;
    },

    pfad(uid) {
        return "konten/" + uid + "/lieblingswoerter/" + LIEBLINGSWOERTER.APP;
    },

    /* ---------------------------------------------------------------- *
     * Das Gerät
     * ---------------------------------------------------------------- */

    _alle() {
        const roh = (typeof ICH !== "undefined") ? ICH._lesen(LIEBLINGSWOERTER.SCHLUESSEL) : null;
        return (roh && roh.je && typeof roh.je === "object") ? roh : { je: {} };
    },

    stand(id) {
        return LIEBLINGSWOERTER.normalisieren(LIEBLINGSWOERTER._alle().je[String(id || "gast")]);
    },

    _setzen(id, stand) {
        const alle = LIEBLINGSWOERTER._alle();
        alle.je[String(id || "gast")] = stand;
        if (typeof ICH !== "undefined") {
            ICH._schreiben(LIEBLINGSWOERTER.SCHLUESSEL, alle);
        }
    },

    /* Die Lieblingswörter eines Spielers auf diesem Gerät. */
    woerter(id) {
        return LIEBLINGSWOERTER.top(LIEBLINGSWOERTER.stand(id));
    },

    /* Eine beendete Runde zählen (js/app.js, genau einmal je Runde). */
    rundeZaehlen(id, runde) {
        if (!runde || !Array.isArray(runde.versuche) || !runde.versuche.length) {
            return LIEBLINGSWOERTER.woerter(id);
        }
        const neu = LIEBLINGSWOERTER.zaehlen(LIEBLINGSWOERTER.stand(id), runde.versuche);
        LIEBLINGSWOERTER._setzen(id, neu);
        return LIEBLINGSWOERTER.top(neu);
    },

    /* ---------------------------------------------------------------- *
     * Das Konto — nur mit eingespielter Regel §13
     * ---------------------------------------------------------------- */

    _speicher: null,
    _uidGeber: null,

    einrichten(speicher, uidGeber) {
        LIEBLINGSWOERTER._speicher = speicher || null;
        LIEBLINGSWOERTER._uidGeber = (typeof uidGeber === "function") ? uidGeber : null;
    },

    regelDa() {
        if (typeof LIEBLINGSWOERTER.REGEL === "boolean") {
            return LIEBLINGSWOERTER.REGEL;
        }
        return typeof SpeicherKonten !== "undefined" && SpeicherKonten.REGEL_GRAU_EINGESPIELT === true;
    },

    _uid() {
        if (!LIEBLINGSWOERTER._speicher || !LIEBLINGSWOERTER._uidGeber) {
            return null;
        }
        let uid = null;
        try {
            uid = LIEBLINGSWOERTER._uidGeber();
        } catch (fehler) {
            uid = null;
        }
        return (typeof uid === "string" && uid !== "") ? uid : null;
    },

    /* Die Top 3 von `id` ans Konto — nur mit Regel, nur echte Konten, nur
       wenn sie sich seit dem letzten Mal geändert haben. true = geschrieben. */
    async senden(id) {
        const uid = LIEBLINGSWOERTER._uid();
        if (!uid || !LIEBLINGSWOERTER.regelDa() || typeof LIEBLINGSWOERTER._speicher.teilSchreiben !== "function") {
            return false;
        }
        const stand = LIEBLINGSWOERTER.stand(id);
        const wert = LIEBLINGSWOERTER.fuerKonto(LIEBLINGSWOERTER.top(stand));
        const kennung = wert ? Object.values(wert).join(",") : "";
        if (!wert || kennung === stand.k) {
            return false;
        }
        const aenderungen = { geaendertAm: Date.now() };
        aenderungen[LIEBLINGSWOERTER.pfad(uid)] = wert;
        try {
            await LIEBLINGSWOERTER._speicher.teilSchreiben(aenderungen);
        } catch (fehler) {
            return false;
        }
        const nachher = LIEBLINGSWOERTER.stand(id);
        nachher.k = kennung;
        LIEBLINGSWOERTER._setzen(id, nachher);
        return true;
    }
};

if (typeof module !== "undefined" && module.exports) {
    module.exports = LIEBLINGSWOERTER;
}
