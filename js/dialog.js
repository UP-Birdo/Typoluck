/*
 * dialog.js — eigene Dialoge statt confirm(), alert() und prompt().
 *
 * Haus-Regel: Die Browser-Dialoge sind hässlich, blockieren die Seite und
 * lassen sich nicht gestalten. Die drei Namen sind im Haus gesetzt:
 *
 *     await DIALOG.frage(titel, text, jaText, gefaehrlich)   → true/false
 *     await DIALOG.hinweis(titel, text)                       → (nichts)
 *     await DIALOG.eingabe(titel, text, vorgabe, okText, verdeckt) → Text oder null
 *
 * Dazu zwei kleine Helfer:
 *
 *     DIALOG.kurzmeldung(text)          ein Streifen, der von selbst verschwindet
 *     DIALOG.zweiSchritt(knopf, aktion) kleine zerstörende Aktion: erster Tipp
 *                                       fragt „Sicher?", zweiter führt aus
 *
 * Es ist immer höchstens EIN Dialog offen. Wer einen neuen öffnet, während
 * einer offen ist, bekommt ihn danach (Warteschlange).
 */

const DIALOG = {

    _behaelter: null,
    _kurzmeldungEl: null,
    _kette: Promise.resolve(),

    aufbauen(behaelter, kurzmeldungEl) {
        DIALOG._behaelter = behaelter;
        DIALOG._kurzmeldungEl = kurzmeldungEl;
    },

    frage(titel, text, jaText, gefaehrlich) {
        return DIALOG._einreihen((fertig) => {
            const kasten = DIALOG._kastenBauen(titel, text);
            const leiste = DIALOG._leisteBauen(kasten);
            leiste.appendChild(BAUSTEINE.knopf({
                text: "Abbrechen", art: "still", beiKlick: () => fertig(false)
            }));
            const ja = BAUSTEINE.knopf({
                text: jaText || "Ja", art: gefaehrlich ? "gefahr" : "haupt",
                beiKlick: () => fertig(true)
            });
            leiste.appendChild(ja);
            return { fokus: ja, abbrechen: () => fertig(false) };
        });
    },

    hinweis(titel, text) {
        return DIALOG._einreihen((fertig) => {
            const kasten = DIALOG._kastenBauen(titel, text);
            const leiste = DIALOG._leisteBauen(kasten);
            const ok = BAUSTEINE.knopf({ text: "Verstanden", art: "haupt", beiKlick: () => fertig() });
            leiste.appendChild(ok);
            return { fokus: ok, abbrechen: () => fertig() };
        });
    },

    eingabe(titel, text, vorgabe, okText, verdeckt) {
        return DIALOG._einreihen((fertig) => {
            const kasten = DIALOG._kastenBauen(titel, text);

            const feld = document.createElement("input");
            feld.className = "feld";
            feld.type = verdeckt ? "password" : "text";
            feld.value = vorgabe || "";
            feld.autocomplete = "off";
            kasten.appendChild(feld);

            const leiste = DIALOG._leisteBauen(kasten);
            leiste.appendChild(BAUSTEINE.knopf({
                text: "Abbrechen", art: "still", beiKlick: () => fertig(null)
            }));
            leiste.appendChild(BAUSTEINE.knopf({
                text: okText || "OK", art: "haupt", beiKlick: () => fertig(feld.value)
            }));
            feld.addEventListener("keydown", (ereignis) => {
                if (ereignis.key === "Enter") {
                    ereignis.preventDefault();
                    fertig(feld.value);
                }
            });
            return { fokus: feld, abbrechen: () => fertig(null) };
        });
    },

    /* Ein Streifen unten, der nach ein paar Sekunden verschwindet. */
    kurzmeldung(text, dauerMs) {
        const el = DIALOG._kurzmeldungEl;
        if (!el) {
            return;
        }
        el.textContent = text;
        el.hidden = false;
        el.classList.remove("kurzmeldung-weg");
        clearTimeout(DIALOG._kurzmeldungUhr);
        DIALOG._kurzmeldungUhr = setTimeout(() => {
            el.classList.add("kurzmeldung-weg");
            DIALOG._kurzmeldungUhr = setTimeout(() => {
                el.hidden = true;
            }, 250);
        }, dauerMs || 2200);
    },

    /* Erster Tipp: Beschriftung wird zu „Sicher?". Zweiter Tipp innerhalb
       von drei Sekunden: ausführen. Sonst zurück auf den alten Text. */
    zweiSchritt(knopf, aktion) {
        const alterText = knopf.textContent;
        let scharf = false;
        let uhr = null;
        knopf.addEventListener("click", () => {
            if (scharf) {
                clearTimeout(uhr);
                scharf = false;
                knopf.textContent = alterText;
                aktion();
                return;
            }
            scharf = true;
            knopf.textContent = "Sicher?";
            uhr = setTimeout(() => {
                scharf = false;
                knopf.textContent = alterText;
            }, 3000);
        });
        return knopf;
    },

    /* ---------------------------------------------------------------- *
     * Innereien
     * ---------------------------------------------------------------- */

    /* Reiht den Dialog hinter den gerade offenen. `bauen(fertig)` baut den
       Inhalt und liefert { fokus, abbrechen }. */
    _einreihen(bauen) {
        const lauf = DIALOG._kette.then(() => new Promise((erledigt) => {
            const hintergrund = DIALOG._behaelter;
            hintergrund.innerHTML = "";
            hintergrund.hidden = false;
            document.body.classList.add("dialog-offen");

            let vorbei = false;
            const fertig = (wert) => {
                if (vorbei) {
                    return;
                }
                vorbei = true;
                document.removeEventListener("keydown", beiTaste);
                hintergrund.hidden = true;
                hintergrund.innerHTML = "";
                document.body.classList.remove("dialog-offen");
                erledigt(wert);
            };

            const teile = bauen(fertig);
            const beiTaste = (ereignis) => {
                if (ereignis.key === "Escape") {
                    teile.abbrechen();
                }
            };
            document.addEventListener("keydown", beiTaste);
            if (teile.fokus) {
                teile.fokus.focus();
            }
        }));
        DIALOG._kette = lauf.catch(() => {});
        return lauf;
    },

    _kastenBauen(titel, text) {
        const kasten = document.createElement("div");
        kasten.className = "dialog";
        kasten.setAttribute("role", "dialog");
        kasten.setAttribute("aria-modal", "true");

        const kopf = document.createElement("h2");
        kopf.className = "dialog-titel";
        kopf.textContent = titel;
        kasten.appendChild(kopf);

        if (text) {
            const absatz = document.createElement("p");
            absatz.className = "dialog-text";
            absatz.textContent = text;
            kasten.appendChild(absatz);
        }

        DIALOG._behaelter.appendChild(kasten);
        return kasten;
    },

    _leisteBauen(kasten) {
        const leiste = document.createElement("div");
        leiste.className = "dialog-knoepfe";
        kasten.appendChild(leiste);
        return leiste;
    }
};
