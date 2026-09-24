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
     * rueckrufe    — { beiDaten(daten), beiStatus(status, text) }
     */
    constructor(speicher, einstellung, rueckrufe) {
        this.speicher = speicher;
        this.einstellung = einstellung;
        this.beiDaten = rueckrufe.beiDaten || (() => {});
        this.beiStatus = rueckrufe.beiStatus || (() => {});

        this.daten = SPIELER.leereDaten();
        this.eigeneId = null;

        this.aenderungOffen = false;
        this.schreibtGerade = false;
        this.schreibZeitgeber = null;
        this.abfrageZeitgeber = null;

        /* Zählt jeden eigenen Schreibvorgang — so erkennt eine Abfrage, deren
           Antwort erst NACH einem eigenen Schreiben ankommt, dass sie
           überholt ist. */
        this.vorgangsZaehler = 0;
        this.markeGesehen = null;

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
        this.beiStatus("laedt", "Wird geladen …");
        try {
            this.daten = SPIELER.normalisieren(await this.speicher.laden());
            geladen = true;
            this.geladen = true;
            this.beiStatus("bereit", this.speicher.beschreibung);
        } catch (fehler) {
            this.beiStatus("fehler", fehler.message);
        }
        this.beiDaten(this.daten);

        if (this.speicher.art === "gemeinsam") {
            this.abfrageZeitgeber = setInterval(
                () => this.fremdenStandHolen(), this.einstellung.abfrageIntervallMs);
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

    _schreibenPlanen() {
        if (this.schreibZeitgeber !== null) {
            clearTimeout(this.schreibZeitgeber);
        }
        this.schreibZeitgeber = setTimeout(() => this.schreiben(),
            this.einstellung.schreibVerzoegerungMs);
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
            this.markeGesehen = this.daten.geaendertAm;
            this.beiDaten(this.daten);
            this.beiStatus("bereit", this.speicher.beschreibung);
        } catch (fehler) {
            this.beiStatus("fehler", "Nicht gespeichert: " + fehler.message);
            this._schreibenPlanen();
        } finally {
            this.schreibtGerade = false;
        }
    }

    async fremdenStandHolen() {
        if (this._gesperrt()) {
            return;
        }
        if (typeof document !== "undefined" && document.hidden) {
            return;
        }

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

if (typeof module !== "undefined" && module.exports) {
    module.exports = Abgleich;
}
