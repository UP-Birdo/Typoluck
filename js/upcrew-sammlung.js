/*
 * upcrew-sammlung.js — das GERÜST des Tabs „Sammlung", gleich in Blunderluck und Typoluck.
 * Gehört zu css\upcrew-sammlung.css. Quelle NUR hier (Apps\UPCrew\bausteine), in die Apps KOPIEREN, nie abwandeln.
 *
 * Nutzer, 27.09.2026: „bei beiden Apps soll Sammlung gleich sein und immer gleich bleiben“.
 * Nutzer, 03.10.2026: Sammlung = Variante A — Kategorie-Kacheln, ein Tipp öffnet ein Blatt; nichts rollt waagrecht.
 *
 * Das Gerüst baut nur die Fläche; die Inhalte liefert die App (Aufruf WIE BISHER):
 *     const g = UPCREW_SAMMLUNG.bauen(behaelter, { titel: "Sammlung" });
 *     //  g.kopf     klebende Kopfzeile, volle Breite (Titel links, „NN %“ rechts)
 *     //  g.ort      Platz für UPCREW_ANPASSEN.zeigen(g.ort, …) — klebende Vorschau, Kategorie-Kacheln,
 *     //             Balken „Zurück · Übernehmen“ (der Baustein upcrew-anpassen.js)
 *     g.anteilSetzen(hat, alle);          // „NN %“, gerundet; Titel „hat von alle“
 *     g.restEinsetzen(rest);              // die reine Sammlung; legt dabei auch den Würfel in den Balken
 *     g.wuerfelUnten();                   // Würfel neben Zurück · Übernehmen — nach jedem UPCREW_ANPASSEN.zeigen
 *     g.obenSetzen();                     // Vorschau klebt bündig unter der Kopfzeile (nach jedem Zeichnen)
 *
 * Die reine Sammlung (Dinge, die man nicht „anzieht“), aus denselben Teilen in beiden Apps (WIE BISHER):
 *     const rest = UPCREW_SAMMLUNG.rest();
 *     const teil = UPCREW_SAMMLUNG.teil("Brettformen", 12, 12);     // Abschnitt „Name n/m“
 *     const gitter = UPCREW_SAMMLUNG.gitter();                      // Raster, 4 Spalten
 *     gitter.appendChild(UPCREW_SAMMLUNG.stueck({ name: "Kreuz", bild: element, da: true, beiKlick() {…} }));
 *     teil.appendChild(UPCREW_SAMMLUNG.innen());                    // oder: eigener Inhalt mit dem Einzug
 *     rest.appendChild(UPCREW_SAMMLUNG.abzeichenTeil(liste, beiKlick));
 *
 * NEU in Variante A — ohne dass die App etwas ändert: `restEinsetzen` macht aus JEDEM Abschnitt (`teil`) eine
 * KATEGORIE-KACHEL (Platz „kategorie/<kennung>“, Name, n/m, Strich) im selben 2er-Raster wie die Kacheln des
 * Anpassen-Bausteins. Ein Tipp öffnet den Abschnitt in einem BLATT (upcrew-blatt.js); beim Schließen hängt er
 * wieder — unsichtbar — im Rest. Der Abschnitt bleibt dasselbe Element (aufgeklappte Einträge, angemeldete
 * Horcher der App bleiben). Fehlt upcrew-blatt.js oder das Raster, stehen die Abschnitte wie bisher untereinander.
 *     UPCREW_SAMMLUNG.teil(titel, hat, alle, kennung)   // `kennung` wahlfrei (sonst aus dem Titel): Name des
 *                                                       // Platzes und der Kachel (data-rest)
 *     g.restOeffnen(kennung)                            // das Blatt eines Abschnitts öffnen (Probe-Seite, Tests)
 *
 * Alle Texte über textContent, keine Farben, keine App-Namen. Braucht upcrew-anpassen.js nur für g.ort,
 * upcrew-platz.js für das Bild der Kacheln.
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

    /* "Kachel-Sets" → "kachel-sets", "Fähigkeiten" → "faehigkeiten" */
    function kennungAus(titel) {
        return String(titel || "").toLowerCase()
            .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
            .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "teil";
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

        let offen = null;

        /* Ein Abschnitt im Blatt: Das Element wandert hinein und beim Schließen zurück an seinen Platz. */
        function abschnittOeffnen(abschnitt) {
            const B = (typeof UPCREW_BLATT !== "undefined") ? UPCREW_BLATT : null;
            if (!B || !abschnitt || abschnitt === offen) {
                return false;
            }
            const eltern = abschnitt.parentNode;
            const danach = abschnitt.nextSibling;
            const zahl = element("span", "up-sm-blatt-zahl",
                (abschnitt.dataset.hat || "") + "/" + (abschnitt.dataset.alle || ""));
            offen = abschnitt;
            B.oeffnen({
                titel: abschnitt.dataset.titel || "",
                klasse: "up-sm-blatt",
                rechts: [zahl],
                inhalt: (el) => {
                    el.appendChild(abschnitt);
                },
                beimSchliessen: () => {
                    offen = null;
                    if (eltern) {
                        eltern.insertBefore(abschnitt, (danach && danach.parentNode === eltern) ? danach : null);
                    }
                }
            });
            return true;
        }

        function restKachel(abschnitt) {
            const hat = Number(abschnitt.dataset.hat) || 0;
            const alle = Number(abschnitt.dataset.alle) || 0;
            const knopf = element("button", "upa-kat up-sm-kat");
            knopf.type = "button";
            knopf.dataset.rest = abschnitt.dataset.kennung || "";
            const bild = element("span", "upa-kat-bild");
            if (typeof UPCREW_PLATZ !== "undefined") {
                bild.appendChild(UPCREW_PLATZ.bauen("kategorie/" + knopf.dataset.rest, "96x96",
                    { text: abschnitt.dataset.titel }));
            }
            knopf.appendChild(bild);
            const text = element("span", "upa-kat-text");
            text.appendChild(element("b", "", abschnitt.dataset.titel || ""));
            text.appendChild(element("small", "", hat + "/" + alle));
            knopf.appendChild(text);
            const strich = element("i", "upa-strich");
            const voll = element("i");
            voll.style.width = (alle > 0 ? Math.round(hat / alle * 100) : 0) + "%";
            strich.appendChild(voll);
            knopf.appendChild(strich);
            knopf.addEventListener("click", () => abschnittOeffnen(abschnitt));
            return knopf;
        }

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
                const kannSuchen = typeof ort.querySelector === "function";
                const balken = kannSuchen ? ort.querySelector(".upa-aktion") : null;
                if (balken) {
                    ort.insertBefore(rest, balken);
                } else {
                    ort.appendChild(rest);
                }
                /* Variante A: je Abschnitt eine Kachel im Raster des Anpassen-Bausteins. Mehrfach aufrufbar
                   (Blunderluck setzt denselben Rest bei jedem Öffnen wieder ein): alte Kacheln fliegen raus. */
                const raster = kannSuchen ? ort.querySelector(".upa-kat-raster") : null;
                const mitBlatt = typeof UPCREW_BLATT !== "undefined";
                if (raster && typeof raster.querySelectorAll === "function") {
                    for (const alt of Array.from(raster.querySelectorAll(".up-sm-kat"))) {
                        raster.removeChild(alt);
                    }
                }
                const abschnitte = (rest && typeof rest.querySelectorAll === "function")
                    ? Array.from(rest.querySelectorAll(".up-sm-teil")) : [];
                const alsKacheln = !!raster && mitBlatt && abschnitte.length > 0;
                if (rest && rest.classList) {
                    rest.classList.toggle("up-sm-rest-kacheln", alsKacheln);
                }
                if (alsKacheln) {
                    for (const abschnitt of abschnitte) {
                        raster.appendChild(restKachel(abschnitt));
                    }
                }
                this.wuerfelUnten();
            },

            /* Das Blatt eines Abschnitts öffnen (Kennung wie an der Kachel, data-rest). */
            restOeffnen(kennung) {
                const abschnitt = (typeof ort.querySelector === "function")
                    ? ort.querySelector('.up-sm-teil[data-kennung="' + String(kennung) + '"]') : null;
                return abschnittOeffnen(abschnitt);
            },

            /* Der Würfel „Zufall“ wandert aus der Leiste über der Vorschau vorn in den Balken; sein Klick bleibt
               beim Anpassen-Baustein (der hört am ganzen Ort). */
            wuerfelUnten() {
                if (typeof ort.querySelector !== "function") {
                    return false;
                }
                const wuerfel = ort.querySelector(".upa-zufall");
                const balken = ort.querySelector(".upa-aktion");
                if (!wuerfel || !balken || wuerfel.parentNode === balken) {
                    return !!wuerfel && !!balken;
                }
                balken.insertBefore(wuerfel, balken.firstChild);
                return true;
            },

            obenSetzen() {
                behaelter.style.setProperty("--upa-oben", (kopf.offsetHeight || 0) + "px");
            }
        };
    }

    function rest() {
        return element("div", "up-sm-rest");
    }

    function teil(titel, hat, alle, kennung) {
        const abschnitt = element("section", "upa-regal up-sm-teil");
        const kopf = element("h2", "", titel + " ");
        kopf.appendChild(element("span", "up-sm-zahl", hat + "/" + alle));
        abschnitt.appendChild(kopf);
        if (abschnitt.dataset) {
            abschnitt.dataset.titel = String(titel);
            abschnitt.dataset.hat = String(hat);
            abschnitt.dataset.alle = String(alle);
            abschnitt.dataset.kennung = kennung ? String(kennung) : kennungAus(titel);
        }
        return abschnitt;
    }

    function gitter() {
        return element("div", "up-sm-gitter");
    }

    function innen() {
        return element("div", "up-sm-innen");
    }

    /* „Abzeichen n/m“ (n = mit erreichter Stufe) und das Raster. */
    function abzeichenTeil(liste, beiKlick) {
        const eintraege = Array.isArray(liste) ? liste : [];
        const erreicht = eintraege.filter((eintrag) => eintrag.erreicht > 0).length;
        const abschnitt = teil("Abzeichen", erreicht, eintraege.length, "abzeichen");
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
