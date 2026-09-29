/*
 * upcrew-flamme.js — die Serien-Flamme oben im Kurzprofil, gleich in Blunderluck und Typoluck
 * (gehört zu css\upcrew-flamme.css). Quelle künftig Design\3D-Schrift\final — KOPIEREN, nie abwandeln.
 *
 * Nutzer, 27.09.2026: „die Flamme soll oben in deinem Profil bei beiden Spielen sein — ein Kreis mit einer Flamme
 * und in der Flamme die Anzeige, ausgelegt für 3 Stellen, alles drüber 1k+ … Die Flamme soll sync mit deinem Profil
 * sein, damit sie erhalten bleibt, wenn du täglich ein Spiel von UPCrew spielst.“
 *
 * VERTRAG
 *     const flamme = UPCREW_FLAMME.bauen(halter, { beiKlick: () => … });   // hängt den Kreis an `halter`
 *     flamme.setzen({ serie: 12, heuteGeschafft: false });                  // jederzeit, z. B. wenn der Stand kommt
 *     flamme.el                                                             // der Knopf
 *   Die App liefert die Zahlen aus dem GEMEINSAMEN Fortschritt (Serie über alle Zweige) und entscheidet,
 *   was ein Tipp tut (Serien-Karte, upcrew-serie.js).
 *   OHNE SCHILD (Nutzer 29.09.2026: „serien schild raus … nach einem lose nicht aufhaltbar“): Flammen-Schild und
 *   Serien-Schutz sind weg. Ein altes Feld `schutz` wird still übergangen, am Kreis erscheint kein Schild mehr.
 *
 * ANZEIGE (reine Logik, getestet): 0–999 als Zahl; ab 1000 kurz „1k+“, „2k+“ … — nie mehr als drei Zeichen, der Kreis
 * wächst nie.
 * ZUSTÄNDE (Klasse am Knopf):
 *     up-fl-aus    Serie 0 — Flamme grau, erloschen
 *     up-fl-voll   heute schon geschafft — Flamme leuchtet
 *     up-fl-offen  Serie läuft, heute noch offen — gedämpft, leicht pulsierend (ohne Puls bei reduzierter Bewegung)
 * Farben nur aus der Farbwelt (--haupt, --haupt-schrift, --karte, --rahmen, --schrift-leise).
 */
(function () {
    "use strict";

    const RAUM = "http://www.w3.org/2000/svg";
    /* Eine breite Flamme (24er-Raster), damit drei Ziffern in ihren Bauch passen. */
    const FLAMME = "M12 1.5 C15.5 5.5 20.5 9 20.5 15 A8.5 8.5 0 0 1 3.5 15 C3.5 11 6.5 8 8 5.5 "
        + "C9 8.5 10.5 9.5 12 9.5 C12.3 6.5 11.2 4 12 1.5 Z";

    function anzeige(serie) {
        const n = Math.max(0, Math.floor(Number(serie) || 0));
        return n < 1000 ? String(n) : Math.floor(n / 1000) + "k+";
    }

    function zustand(daten) {
        const serie = Math.max(0, Math.floor(Number(daten && daten.serie) || 0));
        if (serie === 0) {
            return "aus";
        }
        return daten.heuteGeschafft ? "voll" : "offen";
    }

    function beschriftung(daten) {
        const serie = Math.max(0, Math.floor(Number(daten && daten.serie) || 0));
        const z = zustand(daten);
        const teile = ["Serie " + serie + (serie === 1 ? " Tag" : " Tage")];
        teile.push(z === "voll" ? "heute geschafft" : (z === "offen" ? "heute noch offen" : "keine Serie"));
        return teile.join(" · ");
    }

    function svg(pfad, klasse) {
        const s = document.createElementNS(RAUM, "svg");
        s.setAttribute("viewBox", "0 0 24 24");
        s.setAttribute("class", klasse);
        s.setAttribute("aria-hidden", "true");
        s.setAttribute("focusable", "false");
        const p = document.createElementNS(RAUM, "path");
        p.setAttribute("d", pfad);
        s.appendChild(p);
        return s;
    }

    function bauen(halter, opt) {
        opt = opt || {};
        const knopf = document.createElement("button");
        knopf.type = "button";
        knopf.className = "up-fl up-fl-aus";
        knopf.appendChild(svg(FLAMME, "up-fl-flamme"));
        const zahl = document.createElement("span");
        zahl.className = "up-fl-zahl";
        zahl.textContent = "0";
        knopf.appendChild(zahl);
        if (typeof opt.beiKlick === "function") {
            knopf.addEventListener("click", opt.beiKlick);
        }
        if (halter) {
            halter.appendChild(knopf);
        }

        const griff = {
            el: knopf,
            setzen(daten) {
                const d = daten || {};
                const z = zustand(d);
                knopf.className = "up-fl up-fl-" + z;
                zahl.textContent = anzeige(d.serie);
                const text = beschriftung(d);
                knopf.setAttribute("aria-label", text);
                knopf.title = text;
            }
        };
        griff.setzen({ serie: 0 });
        return griff;
    }

    const UPCREW_FLAMME = { bauen: bauen, anzeige: anzeige, zustand: zustand, beschriftung: beschriftung };
    globalThis.UPCREW_FLAMME = UPCREW_FLAMME;
    if (typeof module !== "undefined" && module.exports) {
        module.exports = UPCREW_FLAMME;
    }
})();
