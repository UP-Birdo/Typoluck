/*
 * abgleich.js — hält die Spielerliste auf dem Gerät und in der Datenbank
 * zusammen.
 *
 *   1. beim Start einmal laden,
 *   2. eigene Änderungen kurz verzögert schreiben — und VORHER mit dem Stand
 *      am Server zusammenführen (SPIELER.zusammenfuehren),
 *   3. solange die Seite sichtbar ist, regelmässig nachsehen, ob jemand
 *      anders etwas geändert hat — erst die Marke, nur bei Bewegung alles.
 *
 * Gebaut für die Spielerliste (klein, ganz geschrieben). Die Ergebnisse der
 * Spiele laufen NICHT hierüber: Dort schreibt jeder nur seine eigenen
 * Unterknoten (js\ergebnisse.js), da gibt es nichts zusammenzuführen.
 *
 * Die zwei Sperren, die Blunderluck teuer gelernt hat, gelten auch hier:
 *   - Solange eine eigene Änderung aussteht, wird kein fremder Stand
 *     übernommen (sonst verschwindet die eigene Eingabe wieder).
 *   - Eine Sperre, die VOR einem await geprüft wurde, gilt danach nicht
 *     mehr — nach der Antwort wird ein zweites Mal geprüft.
 */

class Abgleich {

    /*
     * speicher     — Rückwand aus speicher.js
     * einstellung  — KONFIG.speicher
     * rueckrufe    — { beiDaten(daten), beiStatus(status, text),
     *                  takt() — wahlfrei (seit 0.33.0): wie viele
     *                  Millisekunden JETZT zwischen zwei Abfragen liegen
     *                  sollen (je Bildschirm, js\app.js `abfrageTakt`);
     *                  jetzt() — wahlfrei: die Uhr (für Tests) }
     */
    constructor(speicher, einstellung, rueckrufe) {
        this.speicher = speicher;
        this.einstellung = einstellung;
        this.beiDaten = rueckrufe.beiDaten || (() => {});
        this.beiStatus = rueckrufe.beiStatus || (() => {});
        this.takt = (typeof rueckrufe.takt === "function") ? rueckrufe.takt : null;
        this.jetzt = (typeof rueckrufe.jetzt === "function") ? rueckrufe.jetzt : (() => Date.now());
        /* Wann zuletzt wirklich gefragt wurde (für den Takt). */
        this.abfrageZuletzt = 0;

        this.daten = SPIELER.leereDaten();
        this.eigeneId = null;

        this.aenderungOffen = false;
        this.schreibtGerade = false;
        this.schreibZeitgeber = null;
        this.abfrageZeitgeber = null;
        /* Fehlschläge beim Schreiben in Folge (seit 0.34.3) — bestimmt die
           Wartezeit bis zum nächsten Versuch (`_wiederholungMs`). */
        this.schreibFehlschlaege = 0;

        /* Zählt jeden eigenen Schreibvorgang — so erkennt eine Abfrage, deren
           Antwort erst NACH einem eigenen Schreiben ankommt, dass sie
           überholt ist. */
        this.vorgangsZaehler = 0;
        this.markeGesehen = null;
        /* Läuft gerade eine Abfrage nach fremden Änderungen? (seit 0.31.0) */
        this.holtGerade = false;
        this.holtSeit = 0;
        this.holNummer = 0;

        /* Kam schon einmal ein ECHTER Stand vom Server? Erst dann darf die
           Anmeldung aus einem fehlenden Eintrag schliessen, dass ein Konto
           weg ist (js\anmeldung.js, `pruefen`). */
        this.geladen = false;
    }

    eigeneIdSetzen(id) {
        this.eigeneId = id;
    }

    /* Liefert, ob das erste Laden geklappt hat. Wirft nie: Die App muss auch
       ohne Netz starten, der Stand kommt dann mit der nächsten Abfrage. */
    async starten() {
        let geladen = false;
        this.beiStatus("laedt", "Lädt");
        try {
            this.daten = SPIELER.normalisieren(await this.speicher.laden());
            geladen = true;
            this.geladen = true;
            /* Seit 0.31.0: Die Marke dieses Stands gilt als gesehen — sonst
               fände die erste Abfrage nach fünf Sekunden „null ≠ Marke" und
               lüde bei jedem Start ein zweites Mal alles. Die Marke steht im
               geladenen Stand (unter Regel §12 wird sie VOR den Daten
               geholt: höchstens einmal zu viel laden, nie einmal zu wenig). */
            if (typeof this.daten.geaendertAm === "number") {
                this.markeGesehen = this.daten.geaendertAm;
            }
            this.beiStatus("bereit", this.speicher.beschreibung);
        } catch (fehler) {
            this.beiStatus("fehler", fehler.message);
        }
        this.beiDaten(this.daten);

        if (this.speicher.art === "gemeinsam") {
            /* Die Uhr tickt im schnellen Takt; ob bei einem Tick wirklich
               gefragt wird, entscheidet `imTakt` (seit 0.33.0). */
            this.abfrageZuletzt = this.jetzt();
            this.abfrageZeitgeber = setInterval(
                () => this.imTakt(), this.einstellung.abfrageIntervallMs);
        }
        if (typeof document !== "undefined") {
            document.addEventListener("visibilitychange", () => {
                if (document.hidden) {
                    this.sofortSchreiben();
                } else {
                    this.fremdenStandHolen();
                }
            });
            window.addEventListener("pagehide", () => this.sofortSchreiben());
        }
        return geladen;
    }

    /* Eine Änderung übernehmen und das Schreiben einplanen. */
    aendern(neueDaten) {
        this.daten = SPIELER.normalisieren(neueDaten);
        this.aenderungOffen = true;
        this.beiDaten(this.daten);
        this._schreibenPlanen();
    }

    /* Nicht auf die Verzögerung warten — für ein frisch angelegtes Konto
       und beim Verlassen der Seite. */
    sofortSchreiben() {
        if (this.schreibZeitgeber !== null) {
            clearTimeout(this.schreibZeitgeber);
            this.schreibZeitgeber = null;
        }
        if (this.aenderungOffen && !this.schreibtGerade) {
            return this.schreiben();
        }
        return Promise.resolve();
    }

    /* `warten` (Millisekunden) nur für die Wiederholung nach einem
       Fehlschlag (`_wiederholungMs`); sonst die übliche Verzögerung. */
    _schreibenPlanen(warten) {
        if (this.schreibZeitgeber !== null) {
            clearTimeout(this.schreibZeitgeber);
        }
        this.schreibZeitgeber = setTimeout(() => this.schreiben(),
            (typeof warten === "number") ? warten : this.einstellung.schreibVerzoegerungMs);
    }

    /*
     * WIE LANGE NACH EINEM FEHLSCHLAG GEWARTET WIRD (seit 0.34.3, wie das
     * Schwester-Spiel; Prüfung 0.34.2 Fund 2). Bis 0.34.2 plante der
     * Fehlerfall mit den festen 500 ms und ohne Ende neu — lehnte die
     * Datenbank den Eintrag ab, folgte alle halbe Sekunde ein volles Laden
     * samt abgelehntem Schreiben. Jetzt verdoppelt sich die Wartezeit je
     * Fehlschlag in Folge (500 ms, 1 s, 2 s … höchstens 30 s) und fällt nach
     * dem ersten Erfolg auf den Anfang zurück. Die Änderung bleibt offen;
     * eine neue Änderung und das Verlassen der Seite versuchen es sofort.
     */
    _wiederholungMs() {
        const grund = this.einstellung.schreibVerzoegerungMs;
        const basis = (typeof grund === "number" && grund > 0) ? grund : 500;
        const stufe = Math.min(Math.max(this.schreibFehlschlaege - 1, 0), 16);
        return Math.min(basis * Math.pow(2, stufe), Abgleich.WIEDERHOLUNG_MAX_MS);
    }

    async schreiben() {
        this.schreibZeitgeber = null;
        this.schreibtGerade = true;
        this.vorgangsZaehler++;
        this.beiStatus("schreibt", "Wird gespeichert …");

        try {
            /* Erst den Stand vom Server holen und NUR den eigenen Eintrag
               hineinsetzen. Ohne Kontakt zum Server wird nicht blind
               geschrieben — die Liste gehört allen UPCrew-Spielen, und ein alter
               Stand würde dort Spieler löschen. Die Änderung bleibt offen
               und wird später erneut versucht. */
            if (this.speicher.art === "gemeinsam") {
                const fremd = await this.speicher.laden();
                this.daten = SPIELER.zusammenfuehren(fremd, this.daten, this.eigeneId);
            }
            await this.speicher.speichern(this.daten);
            this.aenderungOffen = false;
            this.schreibFehlschlaege = 0;
            this.markeGesehen = this.daten.geaendertAm;
            this.beiDaten(this.daten);
            this.beiStatus("bereit", this.speicher.beschreibung);
        } catch (fehler) {
            this.schreibFehlschlaege++;
            this.beiStatus("fehler", "Nicht gespeichert: " + fehler.message);
            this._schreibenPlanen(this._wiederholungMs());
        } finally {
            this.schreibtGerade = false;
        }
    }

    /*
     * Ein Tick der Uhr (seit 0.33.0, Befund B): Gefragt wird nur, wenn seit
     * der letzten Abfrage der Takt von JETZT verstrichen ist — 5 s auf
     * Bildschirmen mit Daten anderer Spieler, sonst 15 s (js\konfig.js;
     * welcher gilt, sagt `takt()`). Ohne `takt` bei jedem Tick, wie bis
     * 0.32.0. Die halbe Tick-Länge Spielraum fängt eine Uhr, die ein paar
     * Millisekunden zu früh tickt. Wer auf einen schnellen Bildschirm
     * wechselt, wird so spätestens beim nächsten Tick gefragt.
     */
    imTakt() {
        const takt = this.takt ? this.takt() : this.einstellung.abfrageIntervallMs;
        const spiel = this.einstellung.abfrageIntervallMs / 2;
        if (this.jetzt() - this.abfrageZuletzt < takt - spiel) {
            return Promise.resolve(false);
        }
        return this.fremdenStandHolen();
    }

    async fremdenStandHolen() {
        if (this._gesperrt()) {
            return;
        }
        if (typeof document !== "undefined" && document.hidden) {
            return;
        }
        /* Seit 0.31.0: nie zwei Abfragen zugleich. Ein langsames volles
           Laden (bis 8 s) und der nächste 5-s-Takt liefen sonst nebeneinander
           — zwei volle Ladungen statt einer. Der nächste Takt holt nach. */
        /* Seit 0.34.1: Das Zeitlimit deckt nur den Abruf bis zu den
           Kopfzeilen; bleibt das Lesen der Antwort hängen, wäre der Merker
           für immer gesetzt. Nach `HOLEN_VERFALL_MS` gilt er als verfallen. */
        if (this.holtGerade && this.jetzt() - this.holtSeit < Abgleich.HOLEN_VERFALL_MS) {
            return;
        }
        const nr = ++this.holNummer;
        this.holtGerade = true;
        this.holtSeit = this.jetzt();
        this.abfrageZuletzt = this.jetzt();
        try {
            await this._fremdenStandHolen();
        } finally {
            /* Nur die eigene Abfrage gibt den Merker frei — eine verfallene,
               die doch noch endet, nicht die neue. */
            if (this.holNummer === nr) {
                this.holtGerade = false;
            }
        }
    }

    async _fremdenStandHolen() {
        const standVorher = this.vorgangsZaehler;

        /* Erst die Marke, und zwar VOR dem Laden: Ändert sich der Stand
           zwischen beiden, lädt die nächste Abfrage einmal zu viel — nie
           einmal zu wenig. */
        const marke = await this.speicher.marke();
        if (marke !== null && marke === this.markeGesehen) {
            return;
        }

        try {
            const fremd = SPIELER.normalisieren(await this.speicher.laden());

            /* Zweite Prüfung NACH der Antwort (siehe Kopf der Datei). */
            if (this._gesperrt() || this.vorgangsZaehler !== standVorher) {
                return;
            }
            const warErstesMal = !this.geladen;
            this.geladen = true;
            if (warErstesMal || !SPIELER.inhaltGleich(fremd, this.daten)) {
                this.daten = fremd;
                this.beiDaten(this.daten);
            } else {
                this.daten = fremd;
            }
            this.markeGesehen = marke;
            this.beiStatus("bereit", this.speicher.beschreibung);
        } catch (fehler) {
            this.beiStatus("fehler", fehler.message);
        }
    }

    _gesperrt() {
        return this.schreibtGerade || this.aenderungOffen || this.schreibZeitgeber !== null;
    }
}

/* Seit 0.34.1: Nach so vielen Millisekunden gibt eine hängende Abfrage den
   Merker `holtGerade` frei (Nachfrage 3,5 s + Laden 8 s + Spielraum). */
Abgleich.HOLEN_VERFALL_MS = 20000;

/* Seit 0.34.3: die längste Wartezeit vor einem neuen Schreibversuch. */
Abgleich.WIEDERHOLUNG_MAX_MS = 30000;

if (typeof module !== "undefined" && module.exports) {
    module.exports = Abgleich;
}
