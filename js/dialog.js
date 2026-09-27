/*
 * dialog.js — eigene Dialoge statt confirm(), alert() und prompt().
 *
 * Haus-Regel: Die Browser-Dialoge sind hässlich, blockieren die Seite und
 * lassen sich nicht gestalten. Die drei Namen sind im Haus gesetzt:
 *
 *     await DIALOG.frage(titel, text, jaText, gefaehrlich)   → true/false
 *     await DIALOG.hinweis(titel, text, inhalt)               → (nichts)
 *     await DIALOG.eingabe(titel, text, vorgabe, okText, verdeckt, zusatz) → Text oder null
 *         zusatz (seit 0.15.8, optional): { mehrzeilig, filter, maxLaenge }
 *     await DIALOG.liste(titel, text, eintraege, abbrechenText)    → wert oder null
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

    /* `inhalt` (seit 0.4.0, optional): ein Element statt oder nach dem Text —
       der UPCrew-Standard will Bilder statt Sätze (z. B. die Spielregel als
       drei Kacheln). */
    hinweis(titel, text, inhalt) {
        return DIALOG._einreihen((fertig) => {
            const kasten = DIALOG._kastenBauen(titel, text);
            if (inhalt) {
                kasten.appendChild(inhalt);
            }
            const leiste = DIALOG._leisteBauen(kasten);
            const ok = BAUSTEINE.knopf({ text: "OK", art: "haupt", beiKlick: () => fertig() });
            leiste.appendChild(ok);
            return { fokus: ok, abbrechen: () => fertig() };
        });
    },

    /* `zusatz` (seit 0.15.8, für „Wunsch oder Fehler"): `mehrzeilig` macht
       ein Textfeld mit Zeilenumbrüchen (Eingabetaste = neue Zeile),
       `filter(text)` räumt bei jedem Tippen auf (die Einfügemarke bleibt
       an ihrer Stelle), `maxLaenge` begrenzt die Länge. */
    eingabe(titel, text, vorgabe, okText, verdeckt, zusatz) {
        const extra = zusatz || {};
        return DIALOG._einreihen((fertig) => {
            const kasten = DIALOG._kastenBauen(titel, text);

            const feld = document.createElement(extra.mehrzeilig ? "textarea" : "input");
            feld.className = extra.mehrzeilig ? "feld feld-mehrzeilig" : "feld";
            if (!extra.mehrzeilig) {
                feld.type = verdeckt ? "password" : "text";
            } else {
                feld.rows = 5;
            }
            if (extra.maxLaenge) {
                feld.maxLength = extra.maxLaenge;
            }
            feld.value = extra.filter ? extra.filter(vorgabe || "") : (vorgabe || "");
            feld.autocomplete = "off";
            if (typeof extra.filter === "function") {
                feld.addEventListener("input", () => {
                    const vorher = feld.value;
                    const sauber = extra.filter(vorher);
                    if (sauber !== vorher) {
                        const stelle = Math.max(0, (feld.selectionStart || 0) - (vorher.length - sauber.length));
                        feld.value = sauber;
                        feld.setSelectionRange(stelle, stelle);
                    }
                });
            }
            kasten.appendChild(feld);

            const leiste = DIALOG._leisteBauen(kasten);
            leiste.appendChild(BAUSTEINE.knopf({
                text: "Abbrechen", art: "still", beiKlick: () => fertig(null)
            }));
            leiste.appendChild(BAUSTEINE.knopf({
                text: okText || "OK", art: "haupt", beiKlick: () => fertig(feld.value)
            }));
            feld.addEventListener("keydown", (ereignis) => {
                if (ereignis.key === "Enter" && !extra.mehrzeilig) {
                    ereignis.preventDefault();
                    fertig(feld.value);
                }
            });
            return { fokus: feld, abbrechen: () => fertig(null) };
        });
    },

    /* Seit 0.15.7 (wie Blunderluck `DIALOG.liste`): eine kurze Auswahl.
       `eintraege` = [{ beschriftung, hinweis, wert }]; jede Zeile ist ein
       Knopf mit dem Namen und darunter klein dem Hinweis. Liefert den `wert`
       der angetippten Zeile oder null (Abbrechen, Escape). */
    liste(titel, text, eintraege, abbrechenText) {
        return DIALOG._einreihen((fertig) => {
            const kasten = DIALOG._kastenBauen(titel, text);
            const liste = document.createElement("div");
            liste.className = "dialog-liste";
            let erster = null;
            for (const eintrag of eintraege || []) {
                const zeile = document.createElement("button");
                zeile.type = "button";
                zeile.className = "dialog-listeneintrag";
                const name = document.createElement("span");
                name.className = "dialog-listenname";
                name.textContent = eintrag.beschriftung;
                zeile.appendChild(name);
                if (eintrag.hinweis) {
                    const hinweis = document.createElement("span");
                    hinweis.className = "dialog-listenhinweis";
                    hinweis.textContent = eintrag.hinweis;
                    zeile.appendChild(hinweis);
                }
                zeile.addEventListener("click", () => fertig(eintrag.wert));
                liste.appendChild(zeile);
                erster = erster || zeile;
            }
            kasten.appendChild(liste);
            const leiste = DIALOG._leisteBauen(kasten);
            const abbrechen = BAUSTEINE.knopf({
                text: abbrechenText || "Abbrechen", art: "still", beiKlick: () => fertig(null)
            });
            leiste.appendChild(abbrechen);
            return { fokus: erster || abbrechen, abbrechen: () => fertig(null) };
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
       von drei Sekunden: ausführen. Sonst zurück auf den alten Text.
       Getauscht wird NUR die Beschriftung (`.knopf-text`) — seit 0.8.0 steht
       davor der Leuchtpunkt der UPCrew-Knöpfe, der bleiben muss. */
    zweiSchritt(knopf, aktion) {
        const beschriftung = knopf.querySelector(".knopf-text") || knopf;
        const alterText = beschriftung.textContent;
        let scharf = false;
        let uhr = null;
        knopf.addEventListener("click", () => {
            if (scharf) {
                clearTimeout(uhr);
                scharf = false;
                beschriftung.textContent = alterText;
                aktion();
                return;
            }
            scharf = true;
            beschriftung.textContent = "Sicher?";
            uhr = setTimeout(() => {
                scharf = false;
                beschriftung.textContent = alterText;
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
