/*
 * upcrew-shop.js — der Tab „Shop“ (Platz 5 der Leiste), gleich in Blunderluck und Typoluck, zu css\upcrew-shop.css.
 * Quelle künftig Design\3D-Schrift\final — in die Apps KOPIEREN, nie abwandeln.
 *
 * Nutzer, 27.09.2026: „Shop auf dem Platz von Bald soll der kommen“ — Münzen (js\upcrew-muenzen.js) gegen
 * Flammen-Schild, Extra-Leben und Tipp.
 *
 * VERTRAG (die App liefert Stand und Kauf, der Baustein zeichnet):
 *     const shop = UPCREW_SHOP.bauen(behaelter, {
 *         titel: "Shop",
 *         lesen: () => stand,                      // der gemeinsame Fortschritt (Saldo und Vorrat rechnet der Baustein
 *                                                  //  über UPCREW_MUENZEN)
 *         kaufen: async (ware) => true/false,      // die App fragt nach („Kaufen?“), bucht und speichert
 *         texte: { leben: { name: "Extra-Leben", text: "…" } },  // wahlfrei: eigene Waren-Texte je Spiel
 *         bilder: { leben: "M4.5 12 A7.5 …" }                   // wahlfrei: eigenes Bild je Ware (24er-Pfad)
 *     });
 *   `texte` ersetzt je Ware Name und Kurztext nur für die Anzeige — `UPCREW_MUENZEN.WAREN` wird nie verändert
 *   (Preise und Höchstvorrat bleiben dort, gleich in beiden Spielen). `bilder` ebenso für das Bild (VORSCHLAG aus
 *   Blunderluck v0.152.2: dort heißt „leben“ „Zeit zurück“ und zeigt eine Uhr statt des Herzens).
 *   UPCREW_SHOP.text(ware, texte) → { name, text } (auch für die Rückfrage der App).
 *     shop.zeichnen();                             // nach jedem neuen Stand
 *
 * MARKUP:
 *   <section class="up-shop">
 *     <div class="up-shop-kopf"><h2 class="up-shop-titel">Shop</h2>
 *       <span class="up-shop-saldo"><svg class="up-mz-zeichen"/>120</span></div>
 *     <div class="up-shop-liste">
 *       <article class="up-shop-karte [up-shop-zu]"><span class="up-shop-bild"><svg/></span>
 *         <div class="up-shop-text"><h3>Flammen-Schild</h3><p>…</p><p class="up-shop-hast">Du hast: 1</p></div>
 *         <div class="up-shop-kauf"><span class="up-shop-preis"><svg/>50</span>
 *           <button class="up-kn up-haupt up-shop-kaufen">Kaufen</button></div></article> …
 *     </div>
 *   </section>
 * Braucht upcrew-muenzen.js, die Knopf-Familie (up-kn) und die Farbwelt-Variablen. Alle Texte über textContent.
 */
(function () {
    "use strict";

    const RAUM = "http://www.w3.org/2000/svg";
    /* Die Bilder der Waren (24er-Raster, Strich 2, runde Enden). */
    const BILDER = {
        schild: "M12 3 L19 6 V11 C19 16 16 19 12 21 C8 19 5 16 5 11 V6 Z M12 8.5 C13.5 10 15 11 15 13 A3 3 0 0 1 9 13 C9 11.5 10 10.5 10.7 9.8 C11 11 11.5 11.5 12 11.5 C12 10.3 11.7 9.4 12 8.5 Z",
        leben: "M12 20 C7 16.5 3.5 13.5 3.5 9.5 A4.5 4.5 0 0 1 12 7 A4.5 4.5 0 0 1 20.5 9.5 C20.5 13.5 17 16.5 12 20 Z",
        tipp: "M9 18 H15 M10 21 H14 M12 3 A6 6 0 0 1 16 13.5 C15.2 14.3 15 15 15 16 H9 C9 15 8.8 14.3 8 13.5 A6 6 0 0 1 12 3 Z"
    };
    const REIHENFOLGE = ["schild", "leben", "tipp"];
    const GRUENDE = { zuWenig: "Zu wenig", voll: "Vorrat voll" };

    function el(tag, klasse, text) {
        const e = document.createElement(tag);
        if (klasse) {
            e.className = klasse;
        }
        if (text !== undefined && text !== null) {
            e.textContent = String(text);
        }
        return e;
    }

    /* Das Bild einer Ware: aus `bilder` des Spiels (ein Pfad), sonst das gemeinsame. */
    function bild(ware, bilder) {
        const eigen = (bilder && typeof bilder === "object" && typeof bilder[ware] === "string" && bilder[ware])
            ? bilder[ware] : "";
        const svg = document.createElementNS(RAUM, "svg");
        svg.setAttribute("viewBox", "0 0 24 24");
        svg.setAttribute("aria-hidden", "true");
        svg.setAttribute("focusable", "false");
        const p = document.createElementNS(RAUM, "path");
        p.setAttribute("d", eigen || BILDER[ware] || "");
        svg.appendChild(p);
        return svg;
    }

    /* Name und Kurztext einer Ware: aus `texte` des Spiels, sonst aus UPCREW_MUENZEN.WAREN. */
    function text(id, texte) {
        const ware = UPCREW_MUENZEN.WAREN[id] || {};
        const eigen = (texte && typeof texte === "object" && texte[id] && typeof texte[id] === "object") ? texte[id] : {};
        return {
            name: typeof eigen.name === "string" && eigen.name ? eigen.name : (ware.name || id),
            text: typeof eigen.text === "string" ? eigen.text : (ware.text || "")
        };
    }

    function betrag(zahl) {
        const s = el("span", "up-shop-betrag");
        s.appendChild(UPCREW_MUENZEN.zeichen());
        s.appendChild(el("span", "", String(zahl)));
        return s;
    }

    function bauen(behaelter, opt) {
        opt = opt || {};
        const M = UPCREW_MUENZEN;
        behaelter.classList.add("up-shop");
        const kopf = el("div", "up-shop-kopf");
        kopf.appendChild(el("h2", "up-shop-titel", opt.titel || "Shop"));
        const saldo = el("span", "up-shop-saldo");
        kopf.appendChild(saldo);
        behaelter.appendChild(kopf);
        const liste = el("div", "up-shop-liste");
        behaelter.appendChild(liste);
        let beschaeftigt = false;

        function zeichnen() {
            const stand = typeof opt.lesen === "function" ? opt.lesen() : null;
            const haben = M.anzeige(stand);
            saldo.textContent = "";
            saldo.appendChild(betrag(haben));
            saldo.setAttribute("aria-label", haben + " " + M.WAEHRUNG.name);
            liste.textContent = "";
            for (const id of REIHENFOLGE) {
                const ware = M.WAREN[id];
                if (!ware) {
                    continue;
                }
                const kann = M.kannKaufen(stand, id);
                const karte = el("article", "up-shop-karte" + (kann.ok ? "" : " up-shop-zu"));
                const b = el("span", "up-shop-bild up-shop-bild-" + id);
                b.appendChild(bild(id, opt.bilder));
                karte.appendChild(b);

                const textEl = el("div", "up-shop-text");
                const anzeige = text(id, opt.texte);
                textEl.appendChild(el("h3", "", anzeige.name));
                textEl.appendChild(el("p", "", anzeige.text));
                const vorrat = M.vorrat(stand, id);
                textEl.appendChild(el("p", "up-shop-hast",
                    "Du hast: " + vorrat + (ware.hoechstens > 0 ? " / " + ware.hoechstens : "")));
                karte.appendChild(textEl);

                const kauf = el("div", "up-shop-kauf");
                const preis = el("span", "up-shop-preis");
                preis.appendChild(betrag(ware.preis));
                preis.setAttribute("aria-label", ware.preis + " " + M.WAEHRUNG.name);
                kauf.appendChild(preis);
                const knopf = el("button", "up-kn up-haupt up-shop-kaufen");
                knopf.type = "button";
                knopf.appendChild(el("i", "up-led"));
                knopf.appendChild(el("span", "", kann.ok ? "Kaufen" : (GRUENDE[kann.grund] || "Kaufen")));
                knopf.disabled = !kann.ok;
                knopf.setAttribute("aria-label", anzeige.name + " kaufen");
                knopf.addEventListener("click", async () => {
                    if (beschaeftigt || knopf.disabled || typeof opt.kaufen !== "function") {
                        return;
                    }
                    beschaeftigt = true;
                    try {
                        await opt.kaufen(id);
                    } finally {
                        beschaeftigt = false;
                        zeichnen();
                    }
                });
                kauf.appendChild(knopf);
                karte.appendChild(kauf);
                liste.appendChild(karte);
            }
        }

        zeichnen();
        return { zeichnen: zeichnen, kopf: kopf, liste: liste };
    }

    const UPCREW_SHOP = { bauen: bauen, text: text, BILDER: BILDER, REIHENFOLGE: REIHENFOLGE };
    globalThis.UPCREW_SHOP = UPCREW_SHOP;
    if (typeof module !== "undefined" && module.exports) {
        module.exports = UPCREW_SHOP;
    }
})();
