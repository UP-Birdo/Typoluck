/*
 * intro.js — das UPCrew-Intro beim Start.
 *
 * UPCrew ist das Studio hinter allen Spielen (Nutzer-Entscheidung
 * 24.09.2026). Wie bei Spielefirmen üblich, erscheint beim Öffnen kurz das
 * Studio-Zeichen, dann das Spiel. Es soll ALLE UPCrew-Apps gleich eröffnen —
 * wer es in einer anderen App nachbaut, hält sich an den Aufbau und die
 * Zeiten hier (docs\GESTALTUNG.md, „Das UPCrew-Intro").
 *
 * Drei Regeln, damit es nicht nervt:
 *   - höchstens einmal je Besuch (sessionStorage), nicht bei jedem Neuladen
 *     innerhalb derselben Sitzung;
 *   - ein Tipp oder eine Taste überspringt es sofort;
 *   - die App lädt darunter weiter — das Intro hält nichts auf.
 *
 * In der Werkstatt (?werkstatt) kommt es nur mit dem Schalter &intro, sonst
 * stünde es auf jedem Bildschirmfoto.
 */

const INTRO = {

    /* Wie lange das Zeichen steht, und wie lange es ausblendet (muss zu
       css\stil.css, .intro-weg, passen). */
    STEHT_MS: 1800,
    AUSBLENDEN_MS: 400,

    SCHLUESSEL: "upcrew.intro-gesehen",

    /* Soll es jetzt kommen? */
    faellig() {
        if (typeof WERKSTATT !== "undefined" && WERKSTATT.aktiv()) {
            return WERKSTATT.wert("intro") !== null;
        }
        try {
            return window.sessionStorage.getItem(INTRO.SCHLUESSEL) !== "ja";
        } catch (fehler) {
            return true;
        }
    },

    /* Zeigt das Intro im Behälter und liefert ein Versprechen, das nach dem
       Ausblenden erfüllt ist. */
    zeigen(behaelter) {
        return new Promise((fertig) => {
            if (!behaelter || !INTRO.faellig()) {
                fertig();
                return;
            }
            try {
                window.sessionStorage.setItem(INTRO.SCHLUESSEL, "ja");
            } catch (fehler) {
                /* Ohne Sitzungsspeicher kommt es eben jedes Mal. */
            }

            behaelter.innerHTML = "";
            const logo = BAUSTEINE.el("div", "intro-logo");
            logo.setAttribute("role", "img");
            logo.setAttribute("aria-label", "UPCrew");
            logo.appendChild(BAUSTEINE.el("span", "intro-up", "UP"));
            logo.appendChild(BAUSTEINE.el("span", "intro-crew", "Crew"));
            behaelter.appendChild(logo);
            behaelter.appendChild(BAUSTEINE.el("p", "intro-zeile", "präsentiert"));
            behaelter.hidden = false;

            let vorbei = false;
            const beenden = () => {
                if (vorbei) {
                    return;
                }
                vorbei = true;
                clearTimeout(uhr);
                document.removeEventListener("keydown", beenden);
                behaelter.classList.add("intro-weg");
                setTimeout(() => {
                    behaelter.hidden = true;
                    behaelter.classList.remove("intro-weg");
                    behaelter.innerHTML = "";
                    fertig();
                }, INTRO.AUSBLENDEN_MS);
            };

            const uhr = setTimeout(beenden, INTRO.STEHT_MS);
            behaelter.addEventListener("click", beenden, { once: true });
            document.addEventListener("keydown", beenden);
        });
    }
};
