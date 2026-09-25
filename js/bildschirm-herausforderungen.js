/*
 * bildschirm-herausforderungen.js — die Herausforderungen: vorerst nur ein
 * Platzhalter (seit 0.7.0, UPCrew-Runde 2).
 *
 * WAS HIER HINKOMMT (Design\3D-Schrift\docs\FARBWELTEN-PLAN.md): ein
 * gemeinsamer Herausforderungs-Pfad für Typoluck und Blunderluck. Jede Stufe
 * sagt, was zu tun ist und in welcher App; geschafft zählt in beiden. Die
 * Belohnungen (z. B. Farbwelten) landen im Inventar des Profils. Welche
 * Aufgaben es gibt, legt der Nutzer später fest — gebaut wird das in
 * Runde 3, nicht vorher.
 *
 * Erreichbar über den linken Eintrag der Leiste unten („Aufgaben",
 * NAVIGATION.LEISTE). Die Leiste heisst kurz „Aufgaben", der Bildschirm
 * „Herausforderungen" (Nutzer-Entscheidung 26.09.2026). Titel und Satz
 * sind in Typoluck und Blunderluck wörtlich gleich
 * (Design\3D-Schrift\docs\AUFTRAEGE-RUNDE-2.md, „Gemeinsame Absprachen").
 */

const HERAUSFORDERUNGEN_BILDSCHIRM = {

    TITEL: "Herausforderungen",
    TEXT: "Kommt bald – hier siehst du deinen Weg durch beide Spiele.",

    anmelden() {
        NAVIGATION.anmelden({
            id: "herausforderungen",
            titel: HERAUSFORDERUNGEN_BILDSCHIRM.TITEL,
            zeichen: "aufgaben",
            /* Steht links in der Leiste unten, nicht im Menü. */
            imMenue: false,
            zeigen: (behaelter) => HERAUSFORDERUNGEN_BILDSCHIRM.zeigen(behaelter)
        });
    },

    zeigen(behaelter) {
        behaelter.appendChild(BAUSTEINE.kopfzeile(HERAUSFORDERUNGEN_BILDSCHIRM.TITEL));
        behaelter.appendChild(ZUSTAND.leer({
            zeichen: "aufgaben",
            text: HERAUSFORDERUNGEN_BILDSCHIRM.TEXT
        }));
    }
};
