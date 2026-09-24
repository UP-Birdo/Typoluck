/*
 * bausteine.js — die sichtbaren Grundteile: Knopf, Karte, Kopfzeile, Zeichen.
 *
 * WARUM ES DIESE DATEI GIBT — die Naht für den 3D-Look:
 * Der Nutzer hat angesagt, dass nach den 2D-Grundlagen 3D-Knöpfe und mehr
 * folgen (24.09.2026). Damit das später EIN Umbau an EINER Stelle ist und
 * nicht einer an jedem Bildschirm, entsteht JEDER Knopf der App hier
 * (`BAUSTEINE.knopf`), jede Karte hier, jedes Zeichen hier. Kein Bildschirm
 * baut sich einen <button> selbst.
 *
 * Wie der 3D-Look später andockt (Plan, docs\ARCHITECTURE.md, „3D"):
 *   1. Stufe „Tiefe per Stil": Die Knöpfe tragen schon heute eine
 *      Tiefen-Variable (`--knopf-tiefe` in css\stil.css, heute 0). Wird sie
 *      grösser, bekommen alle Knöpfe eine Kante und sinken beim Drücken ein —
 *      ohne eine Zeile JavaScript.
 *   2. Stufe „echte Formen": `knopf()` bekommt einen Zweig, der zusätzlich
 *      ein gerendertes Bild bzw. eine three.js-Fläche einhängt. Die
 *      Bildschirme merken davon nichts, weil sie nur `knopf()` rufen.
 *
 * Die Zeichen sind eigene Linienzeichnungen (24er-Raster, nur Striche), keine
 * Emojis (Haus-Regel) und keine fremde Zeichensammlung.
 */

const BAUSTEINE = {

    /*
     * Ein Knopf.
     *   text      Beschriftung
     *   art       "haupt" | "still" | "gefahr" | "flach"  (Vorgabe: still)
     *             Haupt = DIE eine Hauptaktion des Bildschirms.
     *   zeichen   optional ein Name aus ZEICHEN (steht vor dem Text)
     *   klein     true = kleinere Form für Zeilen und Leisten
     *   breit     true = volle Breite
     *   titel     Hinweis beim Darüberfahren / fürs Vorlesen
     *   beiKlick  Funktion
     */
    knopf(angaben) {
        const knopf = document.createElement("button");
        knopf.type = "button";
        knopf.className = "knopf knopf-" + (angaben.art || "still")
            + (angaben.klein ? " knopf-klein" : "")
            + (angaben.breit ? " knopf-breit" : "");

        if (angaben.zeichen) {
            knopf.appendChild(BAUSTEINE.zeichen(angaben.zeichen));
        }
        if (angaben.text) {
            const beschriftung = document.createElement("span");
            beschriftung.className = "knopf-text";
            beschriftung.textContent = angaben.text;
            knopf.appendChild(beschriftung);
        }
        if (angaben.titel) {
            knopf.title = angaben.titel;
            knopf.setAttribute("aria-label", angaben.titel);
        }
        if (angaben.beiKlick) {
            knopf.addEventListener("click", angaben.beiKlick);
        }
        return knopf;
    },

    /* Eine Karte mit optionaler Überschrift. */
    karte(titel, klasse) {
        const karte = document.createElement("section");
        karte.className = "karte" + (klasse ? " " + klasse : "");
        if (titel) {
            const kopf = document.createElement("h2");
            kopf.className = "karte-titel";
            kopf.textContent = titel;
            karte.appendChild(kopf);
        }
        return karte;
    },

    /* Die Kopfzeile eines Bildschirms: links Zurück (falls gewünscht),
       Mitte Titel, rechts ein beliebiges Element. */
    kopfzeile(titel, angaben) {
        const einstellung = angaben || {};
        const kopf = document.createElement("header");
        kopf.className = "kopfzeile";

        const links = document.createElement("div");
        links.className = "kopfzeile-seite";
        if (einstellung.zurueck) {
            links.appendChild(BAUSTEINE.knopf({
                art: "flach", zeichen: "zurueck", titel: "Zurück", beiKlick: einstellung.zurueck
            }));
        }
        kopf.appendChild(links);

        const mitte = document.createElement("h1");
        mitte.className = "kopfzeile-titel";
        mitte.textContent = titel;
        kopf.appendChild(mitte);

        const rechts = document.createElement("div");
        rechts.className = "kopfzeile-seite kopfzeile-rechts";
        if (einstellung.rechts) {
            rechts.appendChild(einstellung.rechts);
        }
        kopf.appendChild(rechts);

        return kopf;
    },

    /* Ein Segment-Schalter (z. B. „Heute | Woche"). `wahlen` = [{ wert, text }].
       Liefert das Element; `beiWahl(wert)` läuft bei jedem Wechsel. */
    segment(wahlen, aktuell, beiWahl, beschreibung) {
        const leiste = document.createElement("div");
        leiste.className = "segment";
        leiste.setAttribute("role", "radiogroup");
        if (beschreibung) {
            leiste.setAttribute("aria-label", beschreibung);
        }
        for (const wahl of wahlen) {
            const knopf = document.createElement("button");
            knopf.type = "button";
            knopf.className = "segment-wahl" + (wahl.wert === aktuell ? " segment-aktiv" : "");
            knopf.setAttribute("role", "radio");
            knopf.setAttribute("aria-checked", wahl.wert === aktuell ? "true" : "false");
            knopf.textContent = wahl.text;
            knopf.addEventListener("click", () => beiWahl(wahl.wert));
            leiste.appendChild(knopf);
        }
        return leiste;
    },

    /* Ein Element mit Klasse und Text — die Kurzform für alles Kleine. */
    el(tag, klasse, text) {
        const element = document.createElement(tag);
        if (klasse) {
            element.className = klasse;
        }
        if (text !== undefined && text !== null) {
            element.textContent = text;
        }
        return element;
    },

    /* Ein erklärender Satz in leiser Schrift. */
    erklaerung(text) {
        return BAUSTEINE.el("p", "erklaerung", text);
    },

    /* Der runde Namens-Kreis mit dem ersten Buchstaben. */
    kreis(name, klasse) {
        const kreis = BAUSTEINE.el("span", "namens-kreis" + (klasse ? " " + klasse : ""),
            String(name || "?").trim().charAt(0).toUpperCase() || "?");
        kreis.setAttribute("aria-hidden", "true");
        return kreis;
    },

    /* ---------------------------------------------------------------- *
     * Zeichen — Linienzeichnungen im 24er-Raster
     * ---------------------------------------------------------------- */

    ZEICHEN: {
        start: "M3 11 L12 4 L21 11 M5.5 9.5 V20 H10 V14.5 H14 V20 H18.5 V9.5",
        rangliste: "M7 4 H17 V9 A5 5 0 0 1 7 9 Z M7 6 H4 V7 A3 3 0 0 0 7 10 "
            + "M17 6 H20 V7 A3 3 0 0 1 17 10 M12 14 V17 M8 20 H16 M9.5 17 H14.5 V20 H9.5 Z",
        freunde: "M9 11 A3.5 3.5 0 1 0 9 4 A3.5 3.5 0 0 0 9 11 Z "
            + "M2.5 20 C2.5 16.5 5.5 14 9 14 C12.5 14 15.5 16.5 15.5 20 "
            + "M16 4.3 A3.3 3.3 0 0 1 16 10.7 M18 14.4 C20 15.2 21.5 17.2 21.5 20",
        profil: "M12 12 A4 4 0 1 0 12 4 A4 4 0 0 0 12 12 Z M4 21 C4 17 7.6 14 12 14 C16.4 14 20 17 20 21",
        zurueck: "M15 5 L8 12 L15 19",
        weiter: "M9 5 L16 12 L9 19",
        info: "M12 21 A9 9 0 1 0 12 3 A9 9 0 0 0 12 21 Z M12 11 V16.5 M12 7.5 V8",
        wordle: "M3.5 4.5 H9.5 V10.5 H3.5 Z M14.5 4.5 H20.5 V10.5 H14.5 Z "
            + "M3.5 13.5 H9.5 V19.5 H3.5 Z M14.5 13.5 H20.5 V19.5 H14.5 Z",
        uebung: "M4 4 H20 V20 H4 Z M8.5 8.5 V8.6 M15.5 8.5 V8.6 M12 12 V12.1 M8.5 15.5 V15.6 M15.5 15.5 V15.6",
        loeschen: "M9 5 H21 V19 H9 L3 12 Z M12 9 L17 15 M17 9 L12 15",
        aktualisieren: "M20 12 A8 8 0 1 1 17.7 6.3 M20 4 V8.5 H15.5",
        zahnrad: "M12 15 A3 3 0 1 0 12 9 A3 3 0 0 0 12 15 Z "
            + "M12 2.5 V5 M12 19 V21.5 M2.5 12 H5 M19 12 H21.5 "
            + "M5.3 5.3 L7 7 M17 17 L18.7 18.7 M5.3 18.7 L7 17 M17 7 L18.7 5.3",
        stern: "M12 3 L14.6 8.9 L21 9.5 L16.2 13.8 L17.6 20 L12 16.8 L6.4 20 L7.8 13.8 L3 9.5 L9.4 8.9 Z"
    },

    zeichen(name) {
        const ns = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(ns, "svg");
        svg.setAttribute("viewBox", "0 0 24 24");
        svg.setAttribute("class", "zeichen zeichen-" + name);
        svg.setAttribute("aria-hidden", "true");
        svg.setAttribute("focusable", "false");

        const pfad = document.createElementNS(ns, "path");
        pfad.setAttribute("d", BAUSTEINE.ZEICHEN[name] || "");
        svg.appendChild(pfad);
        return svg;
    }
};
