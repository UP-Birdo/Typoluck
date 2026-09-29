/*
 * upcrew-muenzen.js — die Währung über beide UPCrew-Spiele (rein, ohne Bildschirm und Speicher).
 * Quelle künftig Design\3D-Schrift\final — in die Apps KOPIEREN, nie abwandeln.
 *
 * Nutzer, 27.09.2026: „wir brauchen eine In-Game-Währung, die über beide Spiele geht; mit denen kann man sich
 * Extra-Leben, Tipps und Schild für Flammen kaufen in einem Shop“ · „Name → Münzen“.
 * Nutzer, 29.09.2026: „serien schild raus“ → die Ware `schild` (Flammen-Schild) ist WEG. Alte Zähler
 * `schildGekauft`/`schildGenutzt` bleiben im Stand liegen und werden still übergangen (`vorrat(stand, "schild")` = 0,
 * `kannKaufen`/`kaufen` → grund "unbekannt"). Bereits dafür ausgegebene Münzen bleiben ausgegeben.
 *
 * DER NAME steht an EINER Stelle: `WAEHRUNG` (Anzeige). Im Code heißt alles neutral „muenzen“/„waehrung“.
 *
 * WO ES LIEGT — im gemeinsamen Fortschritt (js\fortschritt.js, Zweig je Spiel), NUR als Zahlen in `zaehler`
 * (Regel SICHERHEIT.md §11b erlaubt dort jeden Namen aus Buchstaben mit einer Zahl 0 … 1 000 000 000 — keine neue
 * Regel nötig):
 *     muenzenVerdient, muenzenAusgegeben,
 *     lebenGekauft, lebenGenutzt, tippGekauft, tippGenutzt   (alt, nur noch liegend: schildGekauft, schildGenutzt)
 * KEIN ÜBERSCHREIBEN ZWISCHEN DEN SPIELEN: Jedes Spiel schreibt nur in SEINEM Zweig; Kontostand und Vorrat sind
 * die SUMME über alle Zweige (verdient − ausgegeben, gekauft − genutzt). Die Zähler wachsen nur — beim
 * Zusammenführen zweier Fassungen desselben Zweigs gilt je Name der größere Wert (FORTSCHRITT.zusammenfuehren).
 *
 * NIE UNTER NULL: Gekauft wird nur, wenn der Kontostand reicht (`kannKaufen`). Kaufen zwei Geräte GLEICHZEITIG
 * mit demselben Geld (jedes sieht den alten Stand), kann die Summe kurz unter null fallen — Daten werden dabei nie
 * überschrieben, beide Käufe bleiben. Angezeigt wird dann 0, gekauft werden kann erst wieder, wenn neu Verdientes
 * das Minus ausgeglichen hat (`saldo` rechnet ehrlich, `anzeige` zeigt höchstens bis 0). Ebenso beim Vorrat: Wird
 * ein letztes Stück auf zwei Geräten zugleich benutzt, gilt der Vorrat als 0.
 *
 * Nutzung:
 *     UPCREW_MUENZEN.saldo(stand)                      → Zahl (kann nach gleichzeitigen Käufen < 0 sein)
 *     UPCREW_MUENZEN.anzeige(stand)                    → Zahl ≥ 0
 *     UPCREW_MUENZEN.vorrat(stand, "tipp")             → Stück
 *     UPCREW_MUENZEN.verdienen(stand, app, betrag, t)  → neuer Stand
 *     UPCREW_MUENZEN.kannKaufen(stand, "leben")        → { ok, grund }
 *     UPCREW_MUENZEN.kaufen(stand, app, "leben", t)    → { ok, stand, grund }
 *     UPCREW_MUENZEN.benutzen(stand, app, "tipp", t)   → { ok, stand }
 *     UPCREW_MUENZEN.zeichen()                         → SVG der Münze (Farbwelt-Tokens, Klasse up-mz-zeichen)
 * `stand` ist der Fortschritt ({ version, spiele: { <app>: { …, zaehler, stand } } }); es wird nie verändert,
 * geliefert wird eine Kopie. `t` = Zeitpunkt (ms) für `stand` des Zweigs.
 */
(function () {
    "use strict";

    const WAEHRUNG = { name: "Münzen", einzahl: "Münze" };

    /* Was es wofür gibt (Nutzer 27.09.2026, als Standard; hier änderbar). */
    const VERDIENST = {
        tagesaufgabe: 10,
        sieg: 3,
        figur: 5,
        boss: 25,
        serieWoche: 20,
        level: 10
    };

    /* Die Waren. `hoechstens` = größter Vorrat (0 = ohne Grenze). */
    const WAREN = {
        leben: { id: "leben", name: "Extra-Leben", preis: 30, hoechstens: 0,
            text: "Eine verlorene Stufe gleich nochmal" },
        tipp: { id: "tipp", name: "Tipp", preis: 15, hoechstens: 0,
            text: "Zeigt in einer Partie einen guten Zug" }
    };

    const HOECHSTENS = 1000000000;

    const istObjekt = (w) => !!w && typeof w === "object" && !Array.isArray(w);
    const zahl = (w) => (typeof w === "number" && isFinite(w) && w > 0) ? Math.floor(w) : 0;
    const kopie = (w) => JSON.parse(JSON.stringify(w === undefined ? null : w));

    function summe(stand, name) {
        const spiele = (istObjekt(stand) && istObjekt(stand.spiele)) ? stand.spiele : {};
        let s = 0;
        for (const app of Object.keys(spiele)) {
            const z = istObjekt(spiele[app]) ? spiele[app].zaehler : null;
            if (istObjekt(z)) {
                s += zahl(z[name]);
            }
        }
        return s;
    }

    function saldo(stand) {
        return summe(stand, "muenzenVerdient") - summe(stand, "muenzenAusgegeben");
    }

    function anzeige(stand) {
        return Math.max(0, saldo(stand));
    }

    function vorrat(stand, ware) {
        if (!WAREN[ware]) {
            return 0;
        }
        return Math.max(0, summe(stand, ware + "Gekauft") - summe(stand, ware + "Genutzt"));
    }

    /* Eine Kopie mit sicherem Zweig `app`; liefert { neu, zweig }. */
    function mitZweig(stand, app, zeitpunkt) {
        const neu = istObjekt(stand) ? kopie(stand) : {};
        if (!istObjekt(neu.spiele)) {
            neu.spiele = {};
        }
        if (typeof neu.version !== "number") {
            neu.version = 1;
        }
        const zweig = istObjekt(neu.spiele[app]) ? neu.spiele[app]
            : { xp: 0, partien: 0, gezaehlt: [], stand: 0 };
        zweig.zaehler = istObjekt(zweig.zaehler) ? zweig.zaehler : {};
        zweig.stand = Math.max(zahl(zweig.stand) + 1, zahl(zeitpunkt));
        neu.spiele[app] = zweig;
        return { neu: neu, zweig: zweig };
    }

    function erhoehen(zweig, name, um) {
        zweig.zaehler[name] = Math.min(zahl(zweig.zaehler[name]) + um, HOECHSTENS);
    }

    function verdienen(stand, app, betrag, zeitpunkt) {
        const um = zahl(betrag);
        if (!app || um < 1) {
            return istObjekt(stand) ? kopie(stand) : stand;
        }
        const { neu, zweig } = mitZweig(stand, app, zeitpunkt);
        erhoehen(zweig, "muenzenVerdient", um);
        return neu;
    }

    function kannKaufen(stand, ware) {
        const w = WAREN[ware];
        if (!w) {
            return { ok: false, grund: "unbekannt" };
        }
        if (w.hoechstens > 0 && vorrat(stand, ware) >= w.hoechstens) {
            return { ok: false, grund: "voll" };
        }
        if (saldo(stand) < w.preis) {
            return { ok: false, grund: "zuWenig" };
        }
        return { ok: true, grund: "" };
    }

    function kaufen(stand, app, ware, zeitpunkt) {
        const pruefung = kannKaufen(stand, ware);
        if (!pruefung.ok || !app) {
            return { ok: false, stand: stand, grund: pruefung.grund || "app" };
        }
        const { neu, zweig } = mitZweig(stand, app, zeitpunkt);
        erhoehen(zweig, "muenzenAusgegeben", WAREN[ware].preis);
        erhoehen(zweig, ware + "Gekauft", 1);
        return { ok: true, stand: neu, grund: "" };
    }

    function benutzen(stand, app, ware, zeitpunkt) {
        if (!WAREN[ware] || !app || vorrat(stand, ware) < 1) {
            return { ok: false, stand: stand };
        }
        const { neu, zweig } = mitZweig(stand, app, zeitpunkt);
        erhoehen(zweig, ware + "Genutzt", 1);
        return { ok: true, stand: neu };
    }

    /* Die Münze im Werkstatt-Stil: ein Kreis mit Rand und einem Stern-Präge (24er-Raster). */
    function zeichen() {
        const ns = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(ns, "svg");
        svg.setAttribute("viewBox", "0 0 24 24");
        svg.setAttribute("class", "up-mz-zeichen");
        svg.setAttribute("aria-hidden", "true");
        svg.setAttribute("focusable", "false");
        const rand = document.createElementNS(ns, "circle");
        rand.setAttribute("cx", "12");
        rand.setAttribute("cy", "12");
        rand.setAttribute("r", "9");
        rand.setAttribute("class", "up-mz-rand");
        svg.appendChild(rand);
        const praege = document.createElementNS(ns, "path");
        praege.setAttribute("d", "M12 7.5 L13.3 10.6 L16.5 10.8 L14 12.9 L14.8 16 L12 14.3 L9.2 16 L10 12.9 L7.5 10.8 L10.7 10.6 Z");
        praege.setAttribute("class", "up-mz-praege");
        svg.appendChild(praege);
        return svg;
    }

    const UPCREW_MUENZEN = { WAEHRUNG: WAEHRUNG, VERDIENST: VERDIENST, WAREN: WAREN,
        saldo: saldo, anzeige: anzeige, vorrat: vorrat, verdienen: verdienen,
        kannKaufen: kannKaufen, kaufen: kaufen, benutzen: benutzen, zeichen: zeichen };
    globalThis.UPCREW_MUENZEN = UPCREW_MUENZEN;
    if (typeof module !== "undefined" && module.exports) {
        module.exports = UPCREW_MUENZEN;
    }
})();
