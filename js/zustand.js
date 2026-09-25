/*
 * zustand.js — die drei Zustände jeder Stelle, die auf Daten wartet:
 * Laden, Leer, Fehler (UPCrew-Standard, Abschnitt 3, seit 0.4.0).
 *
 * WARUM EIN BAUSTEIN: Vorher erfand jede Stelle ihren eigenen Satz
 * („Wird geladen …", „Die Rangliste ist gerade nicht erreichbar. …",
 * „Noch keine Freunde. Unter Freunde findest du …"). Der Standard verlangt
 * je Zustand ein festes Bild — und keinen Satz:
 *
 *   Laden   Platzhalter in der Form des Inhalts (graue Balken, sanft
 *           pulsierend). Dauert es länger als LADEN_GRENZE_MS, wird daraus
 *           von selbst der Fehler — ein ewiges Pulsieren wäre eine
 *           Falschaussage.
 *   Leer    Zeichen, höchstens drei Wörter, EIN Knopf, der weiterhilft.
 *   Fehler  Zeichen, ein bis zwei Wörter, Knopf „Nochmal", der genau den
 *           fehlgeschlagenen Schritt wiederholt.
 *
 * Jede Funktion liefert ein Element; der Aufrufer hängt es ein. Kommt die
 * Antwort, ersetzt er es durch den Inhalt — der Lade-Platzhalter ist dann
 * nicht mehr im Dokument, und seine Uhr läuft ins Leere.
 */

const ZUSTAND = {

    LADEN_GRENZE_MS: 10000,

    /*
     * Der Lade-Platzhalter.
     *   zeilen   wie viele graue Balken (Vorgabe 3) — so viele Zeilen, wie
     *            der Inhalt ungefähr haben wird, damit nichts springt
     *   nochmal  Funktion für den Fehler-Knopf, falls die Grenze reisst
     */
    laden(angaben) {
        const einstellung = angaben || {};
        const platzhalter = BAUSTEINE.el("div", "zustand-laden");
        platzhalter.setAttribute("role", "status");
        platzhalter.setAttribute("aria-label", "Lädt");
        const zeilen = einstellung.zeilen || 3;
        for (let i = 0; i < zeilen; i++) {
            platzhalter.appendChild(BAUSTEINE.el("span", "zustand-balken"));
        }
        setTimeout(() => {
            if (platzhalter.isConnected) {
                platzhalter.replaceWith(ZUSTAND.fehler({
                    text: "Keine Antwort", nochmal: einstellung.nochmal
                }));
            }
        }, ZUSTAND.LADEN_GRENZE_MS);
        return platzhalter;
    },

    /*
     * Leer.
     *   zeichen  Name aus BAUSTEINE.ZEICHEN (Vorgabe "leer")
     *   text     höchstens drei Wörter
     *   aktion   { text, zeichen, beiKlick } — der Knopf, der weiterhilft
     */
    leer(angaben) {
        const feld = ZUSTAND._feldBauen("zustand-leer", angaben.zeichen || "leer", angaben.text);
        if (angaben.aktion) {
            feld.appendChild(BAUSTEINE.knopf({
                text: angaben.aktion.text, art: "still", klein: true,
                zeichen: angaben.aktion.zeichen, beiKlick: angaben.aktion.beiKlick
            }));
        }
        return feld;
    },

    /*
     * Fehler.
     *   text     ein bis zwei Wörter (Vorgabe „Nicht erreichbar")
     *   nochmal  Funktion — wiederholt den fehlgeschlagenen Schritt
     *   technik  die technische Meldung; steht NICHT im Bild, nur als
     *            Hinweis beim Darüberfahren (für die Fehlersuche)
     */
    fehler(angaben) {
        const einstellung = angaben || {};
        const feld = ZUSTAND._feldBauen("zustand-fehler", "kein-netz",
            einstellung.text || "Nicht erreichbar");
        if (einstellung.technik) {
            feld.title = einstellung.technik;
        }
        if (typeof einstellung.nochmal === "function") {
            feld.appendChild(BAUSTEINE.knopf({
                text: "Nochmal", art: "still", klein: true, zeichen: "aktualisieren",
                beiKlick: einstellung.nochmal
            }));
        }
        return feld;
    },

    _feldBauen(klasse, zeichen, text) {
        const feld = BAUSTEINE.el("div", "zustand " + klasse);
        const bild = BAUSTEINE.el("span", "zustand-bild");
        bild.appendChild(BAUSTEINE.zeichen(zeichen));
        feld.appendChild(bild);
        if (text) {
            feld.appendChild(BAUSTEINE.el("p", "zustand-text", text));
        }
        return feld;
    }
};
