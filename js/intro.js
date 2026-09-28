/*
 * intro.js — das UPCrew-Studio-Intro beim Start: der Anpasser für Typoluck.
 *
 * UPCrew ist das Studio hinter allen Spielen (Nutzer-Entscheidung
 * 24.09.2026). Beim Öffnen erscheint kurz das Studio-Zeichen, dann das
 * Spiel.
 *
 * SEIT 0.6.1 STECKT DAS INTRO SELBST IN js\upcrew-intro.js (+ css\upcrew-
 * intro.css) — dem gemeinsamen Baustein aller UPCrew-Apps. Quelle ist
 * dev\Design\3D-Schrift\final\; dort wird er geändert und in die Apps
 * KOPIERT, hier nie abgewandelt (Schnittstelle und Regeln:
 * Design\3D-Schrift\docs\EINBAU-INTRO.md). Diese Datei sagt ihm nur, was
 * nur Typoluck weiss: hell oder dunkel, Nummer, Name und Version der App.
 *
 * Die Regeln (Nutzer-Entscheidung 25.09.2026):
 *   - bei JEDEM Start (die Sperre „einmal je Besuch" ist weg);
 *   - jeder Start zeigt die nächste von sechs Arten (Zähler im Baustein,
 *     gemeinsam mit den anderen UPCrew-Apps);
 *   - ein Tipp oder eine Taste überspringt es sofort;
 *   - die App lädt darunter weiter — das Intro hält nichts auf.
 *
 * In der Werkstatt (?werkstatt) kommt es nur mit dem Schalter &intro, sonst
 * stünde es auf jedem Bildschirmfoto. &intro=C zeigt gezielt eine Art (A-F)
 * und zählt nicht weiter; &hell / &dunkel wirken auch hier.
 *
 * NEU LADEN (seit 0.18.2, Nutzer 28.09.2026: „Wenn ich die Seite neu lade,
 * soll die UPCrew-Animation erneut kommen"). Befund: Im normalen Betrieb
 * kam es schon bei jedem Laden (DOMContentLoaded → APP.starten →
 * INTRO.zeigen, im Browser nachgemessen auch nach location.reload()). Nicht
 * gekommen ist es (1) in der WERKSTATT — der Nutzer sieht die App über die
 * Werkstatt-Adressen (…?werkstatt…) an, und dort war das Intro ohne &intro
 * immer aus, auch beim Neuladen; (2) nie beim Zurückholen einer Seite aus
 * dem Zurück-Speicher des Browsers (kein Laden). Jetzt entscheidet
 * `entscheiden` (rein, tests/test-intro.js):
 *   - jedes Laden der Seite → Intro, auch F5/Neuladen;
 *   - Werkstatt: bei einem NEULADEN (Navigationsart „reload") ebenfalls,
 *     sonst nur mit &intro (Bildschirmfotos sind immer frische Aufrufe);
 *   - einzige Ausnahme: das automatische Neuladen der eigenen Aktualisierung
 *     (js/aktualisierung.js setzt den Merker `typoluck.neu-geladen` direkt
 *     davor; jünger als NACH_AKTUALISIERUNG_MS). Grund: Das passiert von
 *     selbst mitten in der Benutzung, sobald eine neue Version da ist — ein
 *     Intro wäre dann eine Unterbrechung, die der Spieler nicht ausgelöst
 *     hat; das Intro dieser Sitzung hat er schon gesehen.
 */

const INTRO = {

    /* Nummer und Name im Studio (Blunderluck 01, Typoluck 02, Trainer 03). */
    APP_NR: "02",
    APP_NAME: "Typoluck",

    /* So lange nach dem Merker der Aktualisierung gilt ein Laden als deren
       automatisches Neuladen. */
    NACH_AKTUALISIERUNG_MS: 15000,

    /*
     * Die Entscheidung, rein: `lage` = { werkstatt, introSchalter, ladeArt
     * ("navigate" | "reload" | "back_forward" | …), aktualisiertVorMs
     * (Alter des Aktualisierungs-Merkers in ms oder null) }.
     */
    entscheiden(lage) {
        const l = lage || {};
        if (typeof l.aktualisiertVorMs === "number" && l.aktualisiertVorMs >= 0
                && l.aktualisiertVorMs < INTRO.NACH_AKTUALISIERUNG_MS) {
            return false;
        }
        if (l.werkstatt) {
            return !!l.introSchalter || l.ladeArt === "reload";
        }
        return true;
    },

    /* Wie diese Seite geladen wurde (Navigation Timing). */
    _ladeArt() {
        try {
            const eintrag = performance.getEntriesByType("navigation")[0];
            if (eintrag && eintrag.type) {
                return eintrag.type;
            }
            return (performance.navigation && performance.navigation.type === 1) ? "reload" : "navigate";
        } catch (fehler) {
            return "navigate";
        }
    },

    /* Alter des Merkers, den js/aktualisierung.js vor dem Neuladen setzt. */
    _aktualisiertVorMs() {
        try {
            const zeit = Number(window.sessionStorage.getItem("typoluck.neu-geladen"));
            return zeit > 0 ? Date.now() - zeit : null;
        } catch (fehler) {
            return null;
        }
    },

    /* Soll es jetzt kommen? */
    faellig() {
        const werkstatt = typeof WERKSTATT !== "undefined" && WERKSTATT.aktiv();
        return INTRO.entscheiden({
            werkstatt: werkstatt,
            introSchalter: werkstatt && WERKSTATT.wert("intro") !== null,
            ladeArt: INTRO._ladeArt(),
            aktualisiertVorMs: INTRO._aktualisiertVorMs()
        });
    },

    /*
     * DIE FARBWELT DES INTROS (seit 0.18.3, Nutzer 28.09.2026: „Bei der
     * Animation am Anfang soll sie sich auch ändern, wenn man ein neues
     * Design-Paket nutzt, sprich pink, dann soll das UPCrew statt Orange
     * Pink nutzen"). Befund: Im normalen Betrieb nahm das Intro schon die
     * Farbwelt DIESES Spiels (UPCREW_AUSSEHEN.lesen().farbwelt, Schlüssel
     * `typoluck.aussehen`, im Browser mit „Feld" nachgemessen). Orange kam
     * in der WERKSTATT: Das Intro läuft VOR WERKSTATT.vorbereiten(), und das
     * setzt das Aussehen bei jedem Laden auf den Standard (Werkstatt =
     * Orange) plus &farbwelt — das Intro zeigte also den Stand des vorigen
     * Aufrufs, eine im Tab „Sammlung" gewählte Welt war nach dem Neuladen
     * weg. Jetzt (rein, `weltWaehlen`, tests/test-intro.js):
     *   - normal: die gewählte Farbwelt dieses Spiels;
     *   - Werkstatt: die Welt, die vorbereiten() gleich setzen wird
     *     (&farbwelt, sonst der Standard des Bausteins);
     *   - eine Welt, die der Intro-Baustein nicht kennt: Standard.
     */
    weltWaehlen(lage) {
        const l = lage || {};
        const bekannt = (w) => !!w && Array.isArray(l.welten) && l.welten.indexOf(w) !== -1;
        const wunsch = l.werkstatt ? (l.werkstattWelt || l.standard) : l.gewaehlt;
        return bekannt(wunsch) ? wunsch : l.standard;
    },

    welt() {
        const werkstatt = typeof WERKSTATT !== "undefined" && WERKSTATT.aktiv();
        const aussehen = (typeof UPCREW_AUSSEHEN !== "undefined") ? UPCREW_AUSSEHEN : null;
        return INTRO.weltWaehlen({
            werkstatt: werkstatt,
            werkstattWelt: werkstatt ? WERKSTATT.wert("farbwelt") : null,
            gewaehlt: aussehen ? aussehen.lesen().farbwelt : null,
            standard: aussehen ? aussehen.STANDARD.farbwelt : "werkstatt",
            welten: (typeof UPCREW_INTRO !== "undefined") ? Object.keys(UPCREW_INTRO.WELTEN) : []
        });
    },

    /* Hell oder dunkel — wie die App gerade aussieht: die Einstellung
       (html[data-darstellung]), sonst das Gerät. In der Werkstatt gelten
       &hell / &dunkel schon hier, weil WERKSTATT.vorbereiten() erst nach dem
       Intro läuft (js\app.js). */
    modus() {
        if (typeof WERKSTATT !== "undefined" && WERKSTATT.aktiv()) {
            if (WERKSTATT.wert("hell") !== null) {
                return "hell";
            }
            if (WERKSTATT.wert("dunkel") !== null) {
                return "dunkel";
            }
            /* Ohne Schalter setzt vorbereiten() „wie das Gerät" (seit 0.18.3
               auch hier, nicht der Stand des vorigen Aufrufs). */
            return (window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches) ? "dunkel" : "hell";
        }
        /* Seit 0.7.0 dieselbe Regel wie die Farbwelt (eine Stelle). */
        return DARSTELLUNG.modus();
    },

    /* Zeigt das Intro im Behälter und liefert ein Versprechen, das nach dem
       Ausblenden erfüllt ist (mit { art, welt, modus } oder null). */
    zeigen(behaelter) {
        if (!behaelter || !INTRO.faellig() || typeof UPCREW_INTRO === "undefined") {
            return Promise.resolve(null);
        }
        const optionen = {
            modus: INTRO.modus(),
            /* Die eigene Farbwelt (seit 0.15.13, wie Blunderluck v0.151.17):
               Jedes Spiel hat sein eigenes Aussehen, der gemeinsame Merker
               upcrew.farbwelt wird nicht mehr geschrieben. */
            welt: INTRO.welt(),
            app: { nr: INTRO.APP_NR, name: INTRO.APP_NAME, version: KONFIG.APP_VERSION }
        };
        if (typeof WERKSTATT !== "undefined" && WERKSTATT.aktiv()) {
            const art = (WERKSTATT.wert("intro") || "").toUpperCase();
            if (UPCREW_INTRO.ARTEN.indexOf(art) !== -1) {
                optionen.art = art;
            }
        }
        return UPCREW_INTRO.zeigen(behaelter, optionen);
    }
};

if (typeof module !== "undefined" && module.exports) {
    module.exports = INTRO;
}
