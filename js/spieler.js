/*
 * spieler.js — die UPCrew-Konten, die sich ALLE UPCrew-Spiele TEILEN.
 *
 * Reine Datenlogik: kein Bildschirm, kein Netz. Wer ist dabei, unter welchem
 * Namen, mit welcher Passwort-Prüfsumme, und wer ist mit wem befreundet.
 *
 * DER DATENVERTRAG GEHÖRT NICHT TYPOLUCK ALLEIN. Die Liste liegt unter
 * `spieler` in der UPCrew-Datenbank; jedes UPCrew-Spiel liest und schreibt
 * sie. Den Aufbau hat Blunderluck erfunden, das mit seinen Konten zu UPCrew
 * umzieht (Stand 24.09.2026, abgelesen aus Apps\Blunderluck\js\spieler.js):
 *
 *     {
 *         "datenVersion": 1,
 *         "geaendertAm": 1750000000000,   // die MARKE — siehe unten
 *         "spieler": [
 *             {
 *                 "id": "3f2c…",          // eindeutig, unveränderlich
 *                 "name": "Anna",
 *                 "pinPruefwert": "7c1f…",// Prüfsumme des Passworts
 *                 "pinSalz": "a91b…",
 *                 "freunde": ["9d2a…"],   // wen ICH als Freund führe
 *                 "abgelehnt": [],        // wen ich abgelehnt/entfernt habe
 *                 "abzeichen": [],        // von Blunderluck
 *                 …                       // was andere Spiele künftig ergänzen
 *             }
 *         ]
 *     }
 *
 * DREI REGELN, DIE HIER NIE AUFGEWEICHT WERDEN — sonst zerstört ein Spiel
 * die Konten-Daten eines anderen:
 *
 *  1. FREMDE FELDER WANDERN UNVERÄNDERT DURCH. Andere Spiele ergänzen den
 *     Vertrag (Blunderluck zuletzt `abzeichen`). Kennte Typoluck nur die
 *     Felder von heute und schriebe die Liste zurück, wären alle neueren
 *     Felder weg — für jeden Spieler. `normalisieren` kopiert deshalb JEDEN
 *     Eintrag vollständig und korrigiert nur die Felder, die es selbst
 *     braucht. Dasselbe gilt für unbekannte Felder ganz oben im Stand.
 *
 *  2. KEIN SPIEL LEGT EIGENE FELDER IN DIE KONTEN. Blunderluck verwirft
 *     beim Schreiben alles, was es nicht kennt. Was nur Typoluck braucht
 *     (Ergebnisse, Einstellungen), liegt unter `typoluck`
 *     (js\ergebnisse.js) oder auf dem Gerät (js\ich.js).
 *
 *  3. JEDE ÄNDERUNG ZIEHT `geaendertAm` HOCH. Andere Spiele fragen nur
 *     diese Marke ab und laden die Liste erst, wenn sie sich bewegt. Bliebe
 *     sie stehen, sähen sie ein neues Konto oder eine Freundschaftsanfrage
 *     erst viel später.
 *
 * Die Freundschaft wird GELESEN, nie in fremde Einträge geschrieben: Jeder
 * führt nur seine eigene Sicht (`freunde`, `abgelehnt`), die Beziehung
 * ergibt sich aus beiden Listen (`freundschaft`). Diese Regel muss in jedem
 * UPCrew-Spiel gleich lauten, sonst sähen die Spiele verschiedene
 * Freundschaften.
 */

const SPIELER = {

    DATEN_VERSION: 1,

    /* Die Passwort-Regel — in jedem UPCrew-Spiel gleich (auch Blunderluck),
       sonst liesse sich ein hier gewähltes Passwort dort nicht ändern. */
    PASSWORT_MIN: 4,
    PASSWORT_MAX: 8,

    /* Die Felder, die Typoluck in jedem Eintrag braucht, mit ihrer
       Grundform. Alles andere in einem Eintrag bleibt, wie es kam. */
    _textFelder: ["name", "pinPruefwert", "pinSalz"],
    _listenFelder: ["freunde", "abgelehnt"],

    /* ---------------------------------------------------------------- *
     * Grundstrukturen
     * ---------------------------------------------------------------- */

    idErzeugen() {
        const krypto = (typeof globalThis !== "undefined") ? globalThis.crypto : null;
        if (krypto && typeof krypto.randomUUID === "function") {
            return krypto.randomUUID();
        }
        SPIELER._zaehler = (SPIELER._zaehler || 0) + 1;
        return "spieler-" + Date.now() + "-" + SPIELER._zaehler;
    },

    /*
     * Ein neuer Eintrag — mit GENAU den Feldern, die Blunderluck bei einem
     * neuen Spieler anlegt (`abzeichen` eingeschlossen). So sieht ein in
     * Typoluck angelegtes Konto für Blunderluck aus wie ein eigenes.
     */
    neuerSpieler(name, id) {
        return {
            id: id || SPIELER.idErzeugen(),
            name: (name === undefined || name === null) ? "" : String(name),
            pinPruefwert: "",
            pinSalz: "",
            freunde: [],
            abgelehnt: [],
            abzeichen: []
        };
    },

    leereDaten(zeitpunkt) {
        return {
            datenVersion: SPIELER.DATEN_VERSION,
            geaendertAm: (zeitpunkt === undefined) ? 0 : zeitpunkt,
            spieler: []
        };
    },

    /*
     * Bringt einen beliebigen (auch halben oder kaputten) Stand in Form —
     * OHNE etwas Fremdes zu verlieren (Regel 1 oben).
     *
     * Ein Eintrag ohne gültige Kennung bleibt trotzdem in der Liste: Er
     * gehört vielleicht jemandem, und Typoluck hat nicht zu entscheiden,
     * ob er weg darf. Er ist nur nicht auffindbar.
     */
    normalisieren(rohdaten) {
        const roh = (rohdaten && typeof rohdaten === "object") ? rohdaten : {};

        /* Tiefe Kopie über JSON: Der Stand kommt ohnehin als JSON aus der
           Datenbank, und so kann keine Änderung auf das Original durchgreifen. */
        const daten = JSON.parse(JSON.stringify(roh));

        if (typeof daten.datenVersion !== "number") {
            daten.datenVersion = SPIELER.DATEN_VERSION;
        }
        if (typeof daten.geaendertAm !== "number" || !isFinite(daten.geaendertAm)) {
            daten.geaendertAm = 0;
        }

        /* Firebase liefert eine Liste als Objekt mit Zahlen-Schlüsseln,
           wenn darin Lücken sind — beides wird zur Liste. */
        let liste = daten.spieler;
        if (liste && !Array.isArray(liste) && typeof liste === "object") {
            liste = Object.keys(liste)
                .sort((a, b) => Number(a) - Number(b))
                .map((schluessel) => liste[schluessel]);
        }
        daten.spieler = [];

        for (const eintrag of (Array.isArray(liste) ? liste : [])) {
            if (!eintrag || typeof eintrag !== "object") {
                continue;
            }
            for (const feld of SPIELER._textFelder) {
                if (typeof eintrag[feld] !== "string") {
                    eintrag[feld] = "";
                }
            }
            for (const feld of SPIELER._listenFelder) {
                /* Leere Listen speichert Firebase gar nicht — sie fehlen
                   dann beim Laden und werden hier wieder angelegt. */
                eintrag[feld] = Array.isArray(eintrag[feld])
                    ? eintrag[feld].filter((wert) => typeof wert === "string" && wert !== "")
                    : [];
            }
            daten.spieler.push(eintrag);
        }

        return daten;
    },

    kopieren(daten) {
        return SPIELER.normalisieren(daten);
    },

    /* ---------------------------------------------------------------- *
     * Suchen
     * ---------------------------------------------------------------- */

    spielerFinden(daten, id) {
        if (!id) {
            return null;
        }
        const stand = SPIELER.normalisieren(daten);
        return stand.spieler.find((spieler) => spieler.id === id) || null;
    },

    /* Ohne Rücksicht auf Gross- und Kleinschreibung — wie in Blunderluck,
       damit „Anna" und „anna" dasselbe Konto sind. */
    spielerNachName(daten, name) {
        const gesucht = String(name || "").trim().toLowerCase();
        if (gesucht === "") {
            return null;
        }
        const stand = SPIELER.normalisieren(daten);
        return stand.spieler.find((spieler) =>
            spieler.name.trim().toLowerCase() === gesucht) || null;
    },

    hatPasswort(spieler) {
        return !!(spieler && spieler.pinPruefwert && spieler.pinSalz);
    },

    /* Liefert "" bei gültigem Passwort, sonst die Begründung als Satz. */
    passwortPruefen(text) {
        const wert = (text === undefined || text === null) ? "" : String(text);
        if (/\s/.test(wert)) {
            return "Leerzeichen sind im Passwort nicht erlaubt.";
        }
        if (wert.length < SPIELER.PASSWORT_MIN || wert.length > SPIELER.PASSWORT_MAX) {
            return "Das Passwort braucht " + SPIELER.PASSWORT_MIN + " bis "
                + SPIELER.PASSWORT_MAX + " Zeichen.";
        }
        return "";
    },

    /* Liefert "" bei gültigem Namen, sonst die Begründung. */
    namePruefen(daten, name, eigeneId) {
        const wert = String(name || "").trim();
        if (wert === "") {
            return "Bitte einen Namen eingeben.";
        }
        if (wert.length > 20) {
            return "Höchstens 20 Zeichen.";
        }
        const vorhanden = SPIELER.spielerNachName(daten, wert);
        if (vorhanden && vorhanden.id !== eigeneId) {
            return "Dieser Name ist schon vergeben.";
        }
        return "";
    },

    /* ---------------------------------------------------------------- *
     * Änderungen — jede liefert einen NEUEN Stand und zieht die Marke hoch
     * ---------------------------------------------------------------- */

    spielerHinzufuegen(daten, name, id, zeitpunkt) {
        const neu = SPIELER.kopieren(daten);
        neu.spieler.push(SPIELER.neuerSpieler(name, id));
        return SPIELER._gestempelt(neu, zeitpunkt);
    },

    passwortSetzen(daten, id, pruefwert, salz, zeitpunkt) {
        return SPIELER._eigenenAendern(daten, id, zeitpunkt, (spieler) => {
            spieler.pinPruefwert = String(pruefwert || "");
            spieler.pinSalz = String(salz || "");
        });
    },

    nameSetzen(daten, id, name, zeitpunkt) {
        return SPIELER._eigenenAendern(daten, id, zeitpunkt, (spieler) => {
            spieler.name = String(name || "").trim();
        });
    },

    /* ---------------------------------------------------------------- *
     * Zusammenführen — der Schutz gegen gegenseitiges Überschreiben
     *
     * Geschrieben wird immer die GANZE Liste. Ohne Zusammenführen würde ein
     * Gerät mit altem Stand jeden löschen, der sich inzwischen angemeldet
     * hat — in BEIDEN Apps. Die Regel (dieselbe wie in Blunderluck): Jeder
     * ist Herr über seinen eigenen Eintrag, alles andere kommt vom Server.
     * ---------------------------------------------------------------- */

    zusammenfuehren(fremd, eigen, eigeneId) {
        const fremdStand = SPIELER.normalisieren(fremd);
        const eigenStand = SPIELER.normalisieren(eigen);

        const meiner = eigenStand.spieler.find((spieler) => spieler.id === eigeneId) || null;

        /* Der Rahmen (datenVersion und was Blunderluck oben ergänzt) kommt
           vom Server. Die Marke muss danach GRÖSSER sein als die am Server —
           nicht nur gleich: Steht die Uhr eines anderen Geräts vor, hielte
           Blunderluck den geschriebenen Stand sonst für schon gesehen. */
        const ergebnis = SPIELER.kopieren(fremdStand);
        ergebnis.geaendertAm = Math.max(eigenStand.geaendertAm, fremdStand.geaendertAm + 1);

        let gefunden = false;
        ergebnis.spieler = fremdStand.spieler.map((spieler) => {
            if (meiner && spieler.id === eigeneId) {
                gefunden = true;
                return meiner;
            }
            return spieler;
        });

        if (meiner && !gefunden) {
            ergebnis.spieler.push(meiner);
        }
        return ergebnis;
    },

    /* Inhaltlicher Vergleich ohne Marke — nur bei echten Unterschieden
       wird neu gezeichnet. */
    inhaltGleich(a, b) {
        return JSON.stringify(SPIELER.normalisieren(a).spieler)
            === JSON.stringify(SPIELER.normalisieren(b).spieler);
    },

    /* ---------------------------------------------------------------- *
     * Freundschaft — dieselben vier Lagen wie in Blunderluck
     *
     *     "freunde"   beide führen einander
     *     "gesendet"  ich führe ihn, er mich (noch) nicht
     *     "offen"     er führt mich, ich habe nicht abgelehnt
     *     "keine"     nichts davon
     * ---------------------------------------------------------------- */

    freundschaft(daten, ichId, andererId) {
        if (!ichId || !andererId || ichId === andererId) {
            return "keine";
        }
        const stand = SPIELER.normalisieren(daten);
        const ich = stand.spieler.find((spieler) => spieler.id === ichId);
        const anderer = stand.spieler.find((spieler) => spieler.id === andererId);
        if (!ich || !anderer) {
            return "keine";
        }

        const ichFuehre = ich.freunde.indexOf(andererId) !== -1;
        const erFuehrt = anderer.freunde.indexOf(ichId) !== -1;

        if (ichFuehre && erFuehrt) {
            return "freunde";
        }
        if (ichFuehre) {
            return "gesendet";
        }
        if (erFuehrt && ich.abgelehnt.indexOf(andererId) === -1) {
            return "offen";
        }
        return "keine";
    },

    /* { freunde, offen, gesendet } — jeweils Listen von Einträgen. */
    freundeVon(daten, ichId) {
        const stand = SPIELER.normalisieren(daten);
        const sicht = { freunde: [], offen: [], gesendet: [] };
        for (const anderer of stand.spieler) {
            const lage = SPIELER.freundschaft(stand, ichId, anderer.id);
            if (sicht[lage]) {
                sicht[lage].push(anderer);
            }
        }
        return sicht;
    },

    /* Anfrage stellen und annehmen sind dieselbe Handlung: den anderen in
       die eigene Liste eintragen. Eine frühere Ablehnung fällt dabei weg. */
    freundHinzufuegen(daten, ichId, andererId, zeitpunkt) {
        return SPIELER._eigenenAendern(daten, ichId, zeitpunkt, (spieler) => {
            if (ichId === andererId) {
                return;
            }
            if (spieler.freunde.indexOf(andererId) === -1) {
                spieler.freunde.push(andererId);
            }
            spieler.abgelehnt = spieler.abgelehnt.filter((wert) => wert !== andererId);
        });
    },

    /* Eigene Anfrage zurückziehen — keine Ablehnung. */
    freundStreichen(daten, ichId, andererId, zeitpunkt) {
        return SPIELER._eigenenAendern(daten, ichId, zeitpunkt, (spieler) => {
            spieler.freunde = spieler.freunde.filter((wert) => wert !== andererId);
        });
    },

    /* Ablehnen und „Freund entfernen" sind dieselbe Handlung. */
    freundAblehnen(daten, ichId, andererId, zeitpunkt) {
        return SPIELER._eigenenAendern(daten, ichId, zeitpunkt, (spieler) => {
            if (ichId === andererId) {
                return;
            }
            spieler.freunde = spieler.freunde.filter((wert) => wert !== andererId);
            if (spieler.abgelehnt.indexOf(andererId) === -1) {
                spieler.abgelehnt.push(andererId);
            }
        });
    },

    /* ---------------------------------------------------------------- *
     * Innereien
     * ---------------------------------------------------------------- */

    /* Ändert NUR den Eintrag mit dieser Kennung und stempelt den Stand. */
    _eigenenAendern(daten, id, zeitpunkt, aenderung) {
        const neu = SPIELER.kopieren(daten);
        for (const spieler of neu.spieler) {
            if (spieler.id === id) {
                aenderung(spieler);
            }
        }
        return SPIELER._gestempelt(neu, zeitpunkt);
    },

    /* Regel 3: Die Marke geht bei JEDER Änderung hoch — und nie zurück,
       auch wenn die Uhr dieses Geräts nachgeht. */
    _gestempelt(daten, zeitpunkt) {
        const jetzt = (zeitpunkt === undefined) ? Date.now() : zeitpunkt;
        daten.geaendertAm = Math.max(jetzt, (daten.geaendertAm || 0) + 1);
        return daten;
    }
};

if (typeof module !== "undefined" && module.exports) {
    module.exports = SPIELER;
}
