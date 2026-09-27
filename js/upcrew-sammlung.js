/*
 * upcrew-sammlung.js — das GERÜST des Tabs „Sammlung", gleich in Blunderluck und Typoluck.
 * Gehört zu css\upcrew-sammlung.css. Quelle künftig Design\3D-Schrift\final — in die Apps KOPIEREN, nie abwandeln.
 *
 * Nutzer, 27.09.2026: „bei beiden Apps soll Sammlung gleich sein und immer gleich bleiben“.
 * Vorlage ist die Blunderluck-Sammlung v0.151.4 (herausgezogen in Blunderluck v0.151.11).
 *
 * Das Gerüst baut nur die Fläche; die Inhalte liefert die App:
 *     const g = UPCREW_SAMMLUNG.bauen(behaelter, { titel: "Sammlung" });
 *     //  g.kopf     klebende Kopfzeile, volle Breite (Titel links, „NN %“ rechts)
 *     //  g.ort      Platz für UPCREW_ANPASSEN.zeigen(g.ort, …) — Umschalter der Spiele, klebende Vorschau,
 *     //             Regale, Balken „Zurück · Übernehmen“ (der Baustein upcrew-anpassen.js)
 *     g.anteilSetzen(hat, alle);          // „NN %“, gerundet; Titel „hat von alle“
 *     g.restEinsetzen(rest);              // die reine Sammlung VOR den Balken (fehlt er: ans Ende)
 *     g.obenSetzen();                     // Vorschau klebt bündig unter der Kopfzeile (nach jedem Zeichnen)
 *
 * Die reine Sammlung (Dinge, die man nicht „anzieht“), aus denselben Teilen in beiden Apps:
 *     const rest = UPCREW_SAMMLUNG.rest();
 *     const teil = UPCREW_SAMMLUNG.teil("Brettformen", 12, 12);     // Überschrift wie die Regale: „Name n/m“
 *     const gitter = UPCREW_SAMMLUNG.gitter();                      // Raster, 4 Spalten
 *     gitter.appendChild(UPCREW_SAMMLUNG.stueck({ name: "Kreuz", bild: element, da: true, beiKlick() {…} }));
 *     teil.appendChild(UPCREW_SAMMLUNG.innen());                    // oder: eigener Inhalt mit dem Regal-Einzug
 *
 * Die Gruppe „Abzeichen“ (seit Blunderluck v0.151.12) ist in beiden Apps gleich; nur die Liste kommt aus dem
 * gemeinsamen Fortschritt (upcrew-abzeichen.js):
 *     rest.appendChild(UPCREW_SAMMLUNG.abzeichenTeil(UPCREW_ABZEICHEN.liste(stand, laufendeSerie),
 *         (eintrag) => DIALOG.hinweis(eintrag.titel, "", UPCREW_ABZEICHEN.blatt(eintrag))));
 *
 * Alle Texte über textContent, keine Farben, keine App-Namen. Braucht upcrew-anpassen.js nur für g.ort.
 */
(function () {
    "use strict";

    function element(tag, klasse, text) {
        const el = document.createElement(tag);
        if (klasse) {
            el.className = klasse;
        }
        if (text !== undefined && text !== null) {
            el.textContent = String(text);
        }
        return el;
    }

    function bauen(behaelter, opt) {
        opt = opt || {};
        behaelter.classList.add("up-sm");

        const kopf = element("div", "up-sm-kopf");
        const titel = element("h2", "up-sm-titel", opt.titel || "Sammlung");
        const anteil = element("span", "up-sm-anteil");
        kopf.appendChild(titel);
        kopf.appendChild(anteil);
        behaelter.appendChild(kopf);

        const ort = element("div", "up-sm-ort");
        behaelter.appendChild(ort);

        return {
            kopf: kopf,
            titel: titel,
            anteil: anteil,
            ort: ort,

            anteilSetzen(hat, alle) {
                const prozent = alle > 0 ? Math.round(hat / alle * 100) : 0;
                anteil.textContent = prozent + " %";
                anteil.setAttribute("aria-label", prozent + " Prozent gesammelt");
                anteil.title = hat + " von " + alle;
                return prozent;
            },

            restEinsetzen(rest) {
                const balken = (typeof ort.querySelector === "function") ? ort.querySelector(".upa-aktion") : null;
                if (balken) {
                    ort.insertBefore(rest, balken);
                } else {
                    ort.appendChild(rest);
                }
            },

            obenSetzen() {
                behaelter.style.setProperty("--upa-oben", (kopf.offsetHeight || 0) + "px");
            }
        };
    }

    function rest() {
        return element("div", "up-sm-rest");
    }

    function teil(titel, hat, alle) {
        const abschnitt = element("section", "upa-regal up-sm-teil");
        const kopf = element("h2", "", titel + " ");
        kopf.appendChild(element("span", "up-sm-zahl", hat + "/" + alle));
        abschnitt.appendChild(kopf);
        return abschnitt;
    }

    function gitter() {
        return element("div", "up-sm-gitter");
    }

    function innen() {
        return element("div", "up-sm-innen");
    }

    /* „Abzeichen n/m“ (n = mit erreichter Stufe) und das Raster der fünf. */
    function abzeichenTeil(liste, beiKlick) {
        const eintraege = Array.isArray(liste) ? liste : [];
        const erreicht = eintraege.filter((eintrag) => eintrag.erreicht > 0).length;
        const abschnitt = teil("Abzeichen", erreicht, eintraege.length);
        abschnitt.classList.add("up-sm-abzeichen");
        if (typeof UPCREW_ABZEICHEN !== "undefined") {
            abschnitt.appendChild(UPCREW_ABZEICHEN.raster(eintraege, beiKlick));
        }
        return abschnitt;
    }

    function stueck(o) {
        o = o || {};
        const knopf = element("button", "up-sm-stueck" + (o.da === false ? "" : " up-sm-da"));
        knopf.type = "button";
        knopf.setAttribute("aria-label", o.name || "");
        if (o.bild) {
            knopf.appendChild(o.bild);
        }
        knopf.appendChild(element("span", "up-sm-stueck-name", o.name || ""));
        if (typeof o.beiKlick === "function") {
            knopf.addEventListener("click", o.beiKlick);
        }
        return knopf;
    }

    const UPCREW_SAMMLUNG = { bauen: bauen, rest: rest, teil: teil, gitter: gitter, innen: innen, stueck: stueck,
        abzeichenTeil: abzeichenTeil };
    globalThis.UPCREW_SAMMLUNG = UPCREW_SAMMLUNG;
    if (typeof module !== "undefined" && module.exports) {
        module.exports = UPCREW_SAMMLUNG;
    }
})();
