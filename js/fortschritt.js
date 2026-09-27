/*
 * fortschritt.js — Level, XP, Serie und „Heute" (seit 0.10.0, UPCrew-Runde 5).
 *
 * Nutzer 27.09.2026 (Apps\UPCrew\docs\FORTSCHRITT.md, „GÜLTIGER STAND";
 * Auftrag Design\3D-Schrift\docs\AUFTRAEGE-RUNDE-5.md): erstmal SOLO.
 *   Level  Ring ums Profilbild, Zahl daneben; XP aus allen UPCrew-Spielen.
 *          XP: Partie +10, je neue Figur +10, Tagesaufgabe +20, beide
 *          Spiele am selben Tag ×1,5, Serie +5 … +35.
 *   Heute  je Spiel eine Tagesaufgabe — in Typoluck das Tageswort, in
 *          Blunderluck das Tagesbrett. Beide geschafft = der Tag zählt ×1,5.
 *   Serie  Tage in Folge mit mindestens einer geschafften Tagesaufgabe; ein
 *          Serien-Schutz rettet einen verpassten Tag.
 *   Nach Level 10 (Nutzer 27.09.2026, offene Frage 6: „so übernehmen"):
 *          alle 5 Level ein Rahmen, dazwischen je ein Serien-Schutz.
 * Typoluck hat in dieser Runde KEINEN Turm (Nutzer 27.09.2026, offene
 * Frage 4: „erst Heute + Level") — `turm` wandert unberührt durch.
 *
 * DER DATENVERTRAG (Vorschlag aus dem Auftrag, additiv ergänzt):
 *     {
 *         stand,                               // Zeitpunkt der letzten Änderung; neuerer gewinnt
 *         xp, level,                           // level wird aus xp gerechnet
 *         serie:   { tage, schutz, zuletzt },  // zuletzt = "YYYY-MM-DD"
 *         heute:   { datum, brett, wort, xp }, // brett/wort = Figuren 0..3 (0 = nicht geschafft);
 *                                              // xp = heute verdient (Ergänzung für ×1,5)
 *         turm:    { blunderluck: {…}, typoluck: {…} },
 *         taten:   [ids],
 *         zaehler: { partien, tagesaufgaben, beideTage, figuren, besteSerie }
 *     }
 * Felder nur ERGÄNZEN; fremde Felder (z. B. Blunderluck-Zähler) wandern
 * unverändert durch — dieselbe Regel wie für die Konten (js\spieler.js).
 *
 * WO ES LIEGT (Nutzer 27.09.2026: „erst nur auf dem Gerät"): im
 * Browser-Speicher unter `upcrew.fortschritt`, je Spieler-Id ein Eintrag —
 * gemeinsam mit Blunderluck, weil beide Spiele auf up-birdo.github.io
 * denselben Speicher haben (wie `upcrew.aussehen`). Als Home-Bildschirm-App
 * hat jedes Spiel seinen eigenen Speicher; das gleicht erst das Konto aus
 * (`spieler/konten/<uid>/fortschritt`, braucht eine Regel in der
 * UPCrew-Datenbank — kommt, wenn der Nutzer sie einspielt).
 *
 * Alles hier ist rein: Jede Funktion bekommt den Stand und liefert einen
 * neuen. Gelesen und geschrieben wird nur in `laden` / `aendern`.
 * Achtung: alles läuft im Browser und ist fälschbar — für Solo in Ordnung,
 * für einen Rang gegen Menschen nicht (Auftrag Runde 5).
 */

const FORTSCHRITT = {

    SCHLUESSEL: "upcrew.fortschritt",

    /* Die XP-Quellen — die einzige Stelle mit diesen Zahlen. */
    XP: {
        partie: 10,
        figur: 10,
        tagesaufgabe: 20,
        serieJeTag: 5,
        serieHoechstens: 7,
        beideFaktor: 1.5
    },

    /* Die XP-Quellen zum Anzeigen (Profil) — aus denselben Zahlen. Kurz,
       kein Satz (UPCrew-Standard). */
    quellen() {
        const xp = FORTSCHRITT.XP;
        return [
            { zeichen: "partie", wert: "+" + xp.partie, titel: "Partie" },
            { zeichen: "koenig", wert: "+" + xp.figur, titel: "Figur" },
            { zeichen: "kalender", wert: "+" + xp.tagesaufgabe, titel: "Heute" },
            { zeichen: "beide", wert: "×" + String(xp.beideFaktor).replace(".", ","), titel: "Beide" },
            { zeichen: "serie", wert: "+" + xp.serieJeTag + "…" + xp.serieJeTag * xp.serieHoechstens, titel: "Serie" }
        ];
    },

    /* Die Spiele mit Tagesaufgabe und ihr Feld in `heute`. */
    TAGESAUFGABEN: { typoluck: "wort", blunderluck: "brett" },

    /* Belohnungen, die nicht aus dem Aussehen kommen (Level 1 bis 10). */
    EXTRAS: {
        1: { art: "titel", name: "Neuling" },
        5: { art: "rahmen", name: "Kupfer" },
        8: { art: "rahmen", name: "Silber" },
        10: { art: "titel", name: "Stammgast" }
    },

    /* Abzeichen: Stufen, danach feste Schritte ohne Ende. `kurz` passt unter
       die Kachel im Profil, `titel` steht im Hinweis. */
    ABZEICHEN: [
        { id: "partien", titel: "Viel gespielt", kurz: "Partien", zeichen: "partie",
            stufen: [10, 50, 100, 250, 500, 1000], weiter: 500 },
        { id: "besteSerie", titel: "Serie", kurz: "Serie", zeichen: "serie",
            stufen: [3, 7, 30, 100, 365], weiter: 365 },
        { id: "beideTage", titel: "Beide Spiele", kurz: "Beide", zeichen: "beide",
            stufen: [1, 10, 30, 100], weiter: 100 },
        { id: "figuren", titel: "Figuren", kurz: "Figuren", zeichen: "koenig",
            stufen: [10, 30, 60, 100, 150], weiter: 50 },
        { id: "tagesaufgaben", titel: "Tagesaufgaben", kurz: "Heute", zeichen: "kalender",
            stufen: [1, 10, 50, 100, 365], weiter: 365 }
    ],

    /* Welcher Speicher benutzt wird. Die Tests setzen hier einen Ersatz ein. */
    _speicher() {
        return (typeof window !== "undefined") ? window.localStorage : null;
    },

    /* ---------------------------------------------------------------- *
     * Der Stand
     * ---------------------------------------------------------------- */

    leer() {
        return {
            stand: 0,
            xp: 0,
            level: 1,
            serie: { tage: 0, schutz: 0, zuletzt: "" },
            heute: { datum: "", brett: 0, wort: 0, xp: 0 },
            turm: {},
            taten: [],
            zaehler: { partien: 0, tagesaufgaben: 0, beideTage: 0, figuren: 0, besteSerie: 0 }
        };
    },

    /* Einen gespeicherten (vielleicht alten, fremden oder kaputten) Stand
       in Form bringen — die Nachrüst-Stelle des additiven Datenvertrags.
       Unbekannte Felder bleiben erhalten. */
    normalisieren(roh) {
        const zahl = (wert, vorgabe) => (typeof wert === "number" && isFinite(wert) && wert >= 0) ? wert : vorgabe;
        const text = (wert) => (typeof wert === "string") ? wert : "";
        const objekt = (wert) => (wert && typeof wert === "object" && !Array.isArray(wert)) ? wert : {};
        const quelle = objekt(roh);
        const leer = FORTSCHRITT.leer();

        const stand = Object.assign({}, quelle);
        stand.stand = zahl(quelle.stand, 0);
        stand.xp = Math.floor(zahl(quelle.xp, 0));
        stand.level = FORTSCHRITT.levelVon(stand.xp).level;
        stand.serie = Object.assign({}, objekt(quelle.serie), {
            tage: Math.floor(zahl(objekt(quelle.serie).tage, 0)),
            schutz: Math.floor(zahl(objekt(quelle.serie).schutz, 0)),
            zuletzt: text(objekt(quelle.serie).zuletzt)
        });
        const heute = objekt(quelle.heute);
        stand.heute = Object.assign({}, heute, {
            datum: text(heute.datum),
            brett: Math.min(3, Math.floor(zahl(heute.brett, 0))),
            wort: Math.min(3, Math.floor(zahl(heute.wort, 0))),
            xp: Math.floor(zahl(heute.xp, 0))
        });
        stand.turm = objekt(quelle.turm);
        stand.taten = Array.isArray(quelle.taten) ? quelle.taten.filter((t) => typeof t === "string") : [];
        stand.zaehler = Object.assign({}, objekt(quelle.zaehler));
        for (const feld of Object.keys(leer.zaehler)) {
            stand.zaehler[feld] = Math.floor(zahl(stand.zaehler[feld], 0));
        }
        return stand;
    },

    /* ---------------------------------------------------------------- *
     * Level
     * ---------------------------------------------------------------- */

    /* XP von Level L nach L+1: 100, 125, 150 … höchstens 500. */
    kosten(level) {
        return Math.min(100 + 25 * (level - 1), 500);
    },

    /* Level aus XP: { level, hat (XP im laufenden Level), kosten }. */
    levelVon(xp) {
        let level = 1;
        let rest = Math.max(0, Math.floor(xp || 0));
        while (rest >= FORTSCHRITT.kosten(level)) {
            rest -= FORTSCHRITT.kosten(level);
            level += 1;
        }
        return { level: level, hat: rest, kosten: FORTSCHRITT.kosten(level) };
    },

    /*
     * Was es beim Erreichen von Level L gibt. `stufen` =
     * UPCREW_ANPASSEN.STUFEN (Farbwelt, Schrift, Knöpfe frei ab Stufe =
     * Level), von aussen hereingereicht; `namen` optional { farbwelt: {id:
     * Name}, knoepfe: {…} } für die Anzeige.
     * Liefert [{ art, name }] — art: farbwelt | schrift | knoepfe | titel |
     * rahmen | schutz.
     */
    belohnungen(level, stufen, namen) {
        const liste = [];
        const namenVon = namen || {};
        for (const teil of ["farbwelt", "schrift", "knoepfe"]) {
            const tabelle = (stufen && stufen[teil]) || {};
            for (const wert of Object.keys(tabelle)) {
                if (tabelle[wert] === level && level > 0) {
                    liste.push({ art: teil, name: (namenVon[teil] && namenVon[teil][wert]) || wert });
                }
            }
        }
        if (FORTSCHRITT.EXTRAS[level]) {
            liste.push(Object.assign({}, FORTSCHRITT.EXTRAS[level]));
        }
        if (level > 10) {
            liste.push(level % 5 === 0
                ? { art: "rahmen", name: "Rahmen " + level }
                : { art: "schutz", name: "Serien-Schutz" });
        }
        return liste;
    },

    /* ---------------------------------------------------------------- *
     * Serie
     * ---------------------------------------------------------------- */

    /* Die Serie, wie sie an `datum` gilt: Ist der letzte geschaffte Tag
       älter als gestern und reicht der Schutz nicht für die Lücke, ist sie
       vorbei (0). Rein — verbraucht nichts. */
    serieAn(stand, datum) {
        const serie = stand.serie;
        if (!serie.zuletzt || !datum) {
            return 0;
        }
        const abstand = FORTSCHRITT._tageZwischen(serie.zuletzt, datum);
        if (abstand <= 1) {
            return serie.tage;
        }
        return (abstand - 1 <= serie.schutz) ? serie.tage : 0;
    },

    /* Ein geschaffter Tag: Serie weiter (Lücke mit Schutz überbrücken) oder
       neu bei 1. Liefert die neue `serie`. */
    _serieWeiter(serie, datum) {
        if (serie.zuletzt === datum) {
            return Object.assign({}, serie);
        }
        const neu = Object.assign({}, serie, { zuletzt: datum });
        if (!serie.zuletzt) {
            neu.tage = 1;
            return neu;
        }
        const luecke = FORTSCHRITT._tageZwischen(serie.zuletzt, datum) - 1;
        if (luecke <= 0) {
            neu.tage = serie.tage + 1;
        } else if (luecke <= serie.schutz) {
            neu.schutz = serie.schutz - luecke;
            neu.tage = serie.tage + 1;
        } else {
            neu.tage = 1;
        }
        return neu;
    },

    _tageZwischen(von, bis) {
        const [j1, m1, t1] = von.split("-").map(Number);
        const [j2, m2, t2] = bis.split("-").map(Number);
        return Math.round((Date.UTC(j2, m2 - 1, t2) - Date.UTC(j1, m1 - 1, t1)) / 86400000);
    },

    /* ---------------------------------------------------------------- *
     * Eine gespielte Partie
     * ---------------------------------------------------------------- */

    /* `heute` auf den Tag bringen: an einem neuen Tag fängt es leer an. */
    _heuteFuer(stand, datum) {
        if (stand.heute.datum === datum) {
            return Object.assign({}, stand.heute);
        }
        return Object.assign({}, stand.heute, { datum: datum, brett: 0, wort: 0, xp: 0 });
    },

    /*
     * Eine Partie melden.
     *   angaben.spiel         "typoluck" | "blunderluck"
     *   angaben.datum         "YYYY-MM-DD"
     *   angaben.tagesaufgabe  true = das war die Tagesaufgabe des Spiels
     *   angaben.figuren       0..3 (0 = nicht geschafft)
     * `stufen` = UPCREW_ANPASSEN.STUFEN (optional, für die Belohnungen).
     * Liefert { stand, xp, levelVorher, levelNachher, neu (Belohnungen der
     * neu erreichten Level) }. Ein Serien-Schutz darunter ist schon
     * gutgeschrieben.
     */
    partie(alt, angaben, stufen) {
        const stand = FORTSCHRITT.normalisieren(alt);
        const datum = angaben.datum;
        const heute = FORTSCHRITT._heuteFuer(stand, datum);
        const feld = FORTSCHRITT.TAGESAUFGABEN[angaben.spiel];
        const figuren = Math.max(0, Math.min(3, Math.floor(angaben.figuren || 0)));
        const zaehler = Object.assign({}, stand.zaehler);
        let serie = Object.assign({}, stand.serie);

        let gewinn = FORTSCHRITT.XP.partie;
        zaehler.partien += 1;

        /* Die Tagesaufgabe zählt nur beim ersten Schaffen des Tages; neue
           Figuren nur, soweit es mehr sind als schon da. */
        if (angaben.tagesaufgabe && feld) {
            const vorher = heute[feld];
            if (figuren > vorher) {
                gewinn += FORTSCHRITT.XP.figur * (figuren - vorher);
                zaehler.figuren += figuren - vorher;
            }
            if (vorher === 0 && figuren > 0) {
                const schonHeute = heute.brett > 0 || heute.wort > 0;
                gewinn += FORTSCHRITT.XP.tagesaufgabe;
                zaehler.tagesaufgaben += 1;
                if (!schonHeute) {
                    serie = FORTSCHRITT._serieWeiter(serie, datum);
                    gewinn += FORTSCHRITT.XP.serieJeTag * Math.min(serie.tage, FORTSCHRITT.XP.serieHoechstens);
                    zaehler.besteSerie = Math.max(zaehler.besteSerie, serie.tage);
                }
            }
            heute[feld] = Math.max(vorher, figuren);
        }

        /* Beide Spiele heute geschafft: ab jetzt ×1,5 — auch rückwirkend für
           das, was heute schon verdient war (einmal, beim Eintreten). */
        const beideVorher = FORTSCHRITT._beide(stand.heute, datum);
        const beideJetzt = heute.brett > 0 && heute.wort > 0;
        let bonus = 0;
        if (beideJetzt && !beideVorher) {
            bonus = Math.round((heute.xp + gewinn) * (FORTSCHRITT.XP.beideFaktor - 1));
            zaehler.beideTage += 1;
        } else if (beideJetzt) {
            bonus = Math.round(gewinn * (FORTSCHRITT.XP.beideFaktor - 1));
        }
        gewinn += bonus;
        heute.xp += gewinn;

        const levelVorher = stand.level;
        const neuerStand = Object.assign({}, stand, {
            xp: stand.xp + gewinn,
            heute: heute,
            serie: serie,
            zaehler: zaehler
        });
        neuerStand.level = FORTSCHRITT.levelVon(neuerStand.xp).level;

        /* Belohnungen der neu erreichten Level; Serien-Schutz gleich gutschreiben. */
        const neu = [];
        for (let level = levelVorher + 1; level <= neuerStand.level; level++) {
            for (const belohnung of FORTSCHRITT.belohnungen(level, stufen)) {
                if (belohnung.art === "schutz") {
                    neuerStand.serie = Object.assign({}, neuerStand.serie,
                        { schutz: neuerStand.serie.schutz + 1 });
                }
                neu.push(belohnung);
            }
        }

        return { stand: neuerStand, xp: gewinn, levelVorher: levelVorher, levelNachher: neuerStand.level, neu: neu };
    },

    _beide(heute, datum) {
        return heute.datum === datum && heute.brett > 0 && heute.wort > 0;
    },

    /* Abzeichen mit erreichter Stufe: [{ …abzeichen, wert, erreicht,
       naechste }]. Über die letzte Stufe hinaus geht es in festen Schritten. */
    abzeichen(stand) {
        return FORTSCHRITT.ABZEICHEN.map((abzeichen) => {
            const wert = stand.zaehler[abzeichen.id] || 0;
            let erreicht = abzeichen.stufen.filter((stufe) => wert >= stufe).length;
            let naechste = abzeichen.stufen[erreicht];
            if (naechste === undefined) {
                const letzte = abzeichen.stufen[abzeichen.stufen.length - 1];
                const dazu = Math.floor((wert - letzte) / abzeichen.weiter);
                erreicht += dazu;
                naechste = letzte + (dazu + 1) * abzeichen.weiter;
            }
            return Object.assign({}, abzeichen, { wert: wert, erreicht: erreicht, naechste: naechste });
        });
    },

    /* ---------------------------------------------------------------- *
     * Lesen und schreiben — je Spieler-Id ein Eintrag
     * ---------------------------------------------------------------- */

    _alle() {
        try {
            const speicher = FORTSCHRITT._speicher();
            const roh = speicher ? JSON.parse(speicher.getItem(FORTSCHRITT.SCHLUESSEL) || "null") : null;
            return (roh && typeof roh === "object" && !Array.isArray(roh)) ? roh : {};
        } catch (fehler) {
            return {};
        }
    },

    laden(id) {
        if (!id) {
            return FORTSCHRITT.leer();
        }
        return FORTSCHRITT.normalisieren(FORTSCHRITT._alle()[id]);
    },

    /* Lesen, ändern, schreiben in EINEM Zug — frisch gelesen, damit ein
       anderes Spiel im selben Browser nichts verliert. `aenderung(stand)`
       liefert { stand, … }; das Ganze kommt zurück. Schreibt nichts ohne
       Id; ein gesperrter Speicher lässt die App weiterlaufen. */
    aendern(id, aenderung, jetzt) {
        const alle = FORTSCHRITT._alle();
        const ergebnis = aenderung(FORTSCHRITT.normalisieren(alle[id]));
        if (!id) {
            return ergebnis;
        }
        ergebnis.stand.stand = jetzt || Date.now();
        alle[id] = ergebnis.stand;
        try {
            const speicher = FORTSCHRITT._speicher();
            if (speicher) {
                speicher.setItem(FORTSCHRITT.SCHLUESSEL, JSON.stringify(alle));
            }
        } catch (fehler) {
            /* voll oder gesperrt — der Fortschritt bleibt diesmal aus */
        }
        return ergebnis;
    }
};

if (typeof module !== "undefined" && module.exports) {
    module.exports = FORTSCHRITT;
}
