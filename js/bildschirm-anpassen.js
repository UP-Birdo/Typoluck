/*
 * bildschirm-anpassen.js — der Tab „Anpassen" (seit 0.8.0, UPCrew-Runde 3).
 *
 * Nutzer 26.09.2026: „ein Anpassungsbereich, wo die Spieler ihre
 * Belohnungen testen und kombinieren können — ein eigener Tab mit Vorschau"
 * … „in beiden Apps". Farbwelt, Schrift, Knöpfe und hell/dunkel werden hier
 * ausprobiert und übernommen; übernommen gilt es in BEIDEN Spielen
 * (js\upcrew-aussehen.js).
 *
 * DER TAB SELBST IST DER GEMEINSAME BAUSTEIN js\upcrew-anpassen.js (+ css\
 * upcrew-anpassen.css), kopiert aus Design\3D-Schrift\final, nie
 * abwandeln — in Blunderluck derselbe. Diese Datei liefert nur, was nur
 * Typoluck weiss: den Platz unter der eigenen Kopfzeile, den Namen der App,
 * die erreichte Stufe und ob alles frei ist (Werkstatt).
 *
 * DIE STUFE: Freigeschaltet wird über den gemeinsamen Herausforderungs-Pfad
 * beider Spiele. Den gibt es noch nicht — deshalb ist die Stufe 0: frei ist
 * nur der Standard, alles andere kann man in der Vorschau ansehen, aber
 * nicht übernehmen. Ab welcher Stufe was frei ist, steht allein im Baustein
 * (`UPCREW_ANPASSEN.STUFEN`), nie hier. In der Werkstatt (?werkstatt) ist
 * alles frei.
 *
 * Eigene Regale (wie Blunderlucks „Brett") hat Typoluck vorerst keine.
 *
 * Erreichbar über den rechten Eintrag der Leiste unten und über die Zeile
 * „Anpassen" in den Einstellungen.
 */

const ANPASSEN_BILDSCHIRM = {

    TITEL: "Anpassen",

    /* Der laufende Tab des Bausteins, solange der Bildschirm zu sehen ist. */
    _tab: null,

    anmelden() {
        NAVIGATION.anmelden({
            id: "anpassen",
            titel: ANPASSEN_BILDSCHIRM.TITEL,
            zeichen: "anpassen",
            /* Steht rechts in der Leiste unten, nicht im Menü. */
            imMenue: false,
            zeigen: (behaelter) => ANPASSEN_BILDSCHIRM.zeigen(behaelter),
            verlassen: () => ANPASSEN_BILDSCHIRM.entfernen()
        });
    },

    /* Die erreichte Stufe im gemeinsamen Herausforderungs-Pfad. Den Pfad
       gibt es noch nicht (Herausforderungen sind ein Platzhalter) — bis
       dahin 0. Wer den Pfad baut, liefert hier seine Stufe. */
    stufe() {
        return 0;
    },

    zeigen(behaelter) {
        /* Wird der Bildschirm neu gebaut (NAVIGATION.auffrischen), ohne dass
           man ihn verlassen hat, muss der alte Tab sich zuerst abmelden —
           sonst horchte er weiter auf Änderungen am Aussehen. */
        ANPASSEN_BILDSCHIRM.entfernen();

        behaelter.appendChild(BAUSTEINE.kopfzeile(ANPASSEN_BILDSCHIRM.TITEL));
        if (typeof UPCREW_ANPASSEN === "undefined") {
            behaelter.appendChild(ZUSTAND.fehler({ text: "Nicht geladen" }));
            return;
        }
        const ort = BAUSTEINE.el("div", "anpassen-ort");
        behaelter.appendChild(ort);
        ANPASSEN_BILDSCHIRM._tab = UPCREW_ANPASSEN.zeigen(ort, {
            app: "typoluck",
            stufe: ANPASSEN_BILDSCHIRM.stufe(),
            alleFrei: typeof WERKSTATT !== "undefined" && WERKSTATT.aktiv()
        });
    },

    entfernen() {
        if (ANPASSEN_BILDSCHIRM._tab) {
            ANPASSEN_BILDSCHIRM._tab.entfernen();
            ANPASSEN_BILDSCHIRM._tab = null;
        }
    }
};
