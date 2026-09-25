/* UPCrew-Farbwelten — macht aus einer Farbwelt die Farb-Platzhalter (CSS-Variablen) der Apps.
   Quelle: dev\Design\3D-Schrift\final\ (Ansicht: farbwelten-ansicht.html). In die Apps KOPIEREN, nicht abwandeln.
   Braucht upcrew-intro.js (dort stehen die sieben Grundfarben je Welt in UPCREW_INTRO.WELTEN).

   - Jede Welt gibt es dunkel UND hell.
   - Gemeinsame Oberflaeche: --flaeche --karte --karte-leise --rahmen --schrift --schrift-leise
     --haupt --haupt-schrift --haupt-kante --still-kante (gleiche Namen in Blunderluck und Typoluck).
   - Typoluck zusaetzlich Kacheln und Tastatur (--kachel-*, --taste-*), Blunderluck das Brett (--feld-hell/-dunkel).
   - Bedeutungsfarben bleiben unberuehrt: --gefahr, --gut, --warnung*, --feld-gewaehlt.
   - Wordguesser-Sperre wie Typoluck darstellung.js: "richtig" nie gruen (75-165 Grad), "vorhanden" nie gelb (38-70).

   Nutzung:  UPCREW_FARBWELTEN.anwenden("studio", "dunkel")          -> setzt die Variablen auf <html>
             UPCREW_FARBWELTEN.werte("studio", "hell")                -> { "--haupt": "#...", ... }
             UPCREW_FARBWELTEN.pruefen("studio", "hell")              -> Liste der Verstoesse (leer = gut) */
(function () {
  "use strict";

  // Kachel-Farben je Welt: bewusst gesetzt, nicht abgeleitet (Sperre + Unterscheidbarkeit)
  const KACHELN = {
    werkstatt: { richtig: "#e8702a", vorhanden: "#3f8fe0" },   // = Typoluck 0.6.2
    studio:    { richtig: "#7a5cf0", vorhanden: "#e0622e" },
    feld:      { richtig: "#15989a", vorhanden: "#e8702a" },   // Feld ist gruen - die Kachel darf es nicht sein
    tiefsee:   { richtig: "#2f7de8", vorhanden: "#e0622e" },
    gold:      { richtig: "#b8800f", vorhanden: "#6b5cf0" },
  };
  const SPERRE = { richtig: { von: 75, bis: 165, name: "gruen" }, vorhanden: { von: 38, bis: 70, name: "gelb" } };

  // ---------- Farb-Rechnen ----------
  const rgb = h => [1, 3, 5].map(i => parseInt(h.substr(i, 2), 16));
  const hex = a => "#" + a.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
  const mische = (a, b, t) => { const x = rgb(a), y = rgb(b); return hex(x.map((v, i) => v * (1 - t) + y[i] * t)); };
  function leucht(h) {
    const k = rgb(h).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); });
    return .2126 * k[0] + .7152 * k[1] + .0722 * k[2];
  }
  const kontrast = (a, b) => { const x = leucht(a), y = leucht(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
  function farbton(h) {
    const [r, g, b] = rgb(h).map(v => v / 255), max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
    if (!d) return { grad: 0, saettigung: 0 };
    let grad = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    const hell = (max + min) / 2;
    return { grad: (grad * 60 + 360) % 360, saettigung: d / (1 - Math.abs(2 * hell - 1)) };
  }
  // Schrift auf einer Farbe: die lesbarere von zwei Kandidaten
  const aufFarbe = (grund, dunkel, hell) => kontrast(grund, dunkel) >= kontrast(grund, hell) ? dunkel : hell;

  // ---------- Werte einer Welt ----------
  function werte(welt, modus) {
    const W = window.UPCREW_INTRO && UPCREW_INTRO.WELTEN;
    if (!W) throw new Error("upcrew-intro.js fehlt");
    const key = W[welt] ? welt : "werkstatt", m = modus === "hell" ? "hell" : "dunkel";
    const f = W[key][m], k = KACHELN[key], d = m === "dunkel";
    const kante = (c, t = .28) => mische(c, "#000000", t);
    const v = {
      // Oberflaeche (beide Spiele)
      "--flaeche": f.bg,
      "--karte": f.fl,
      "--karte-leise": mische(f.fl, f.ta, d ? .35 : .3),
      "--rahmen": mische(f.fl, f.ta, d ? .8 : .75),
      "--schrift": f.ink,
      "--schrift-leise": f.lei,
      "--haupt": f.ak,
      "--haupt-schrift": aufFarbe(f.ak, d ? f.lcd : "#1a1a1a", "#ffffff"),
      "--haupt-kante": kante(f.ak),
      "--still-kante": d ? mische(f.bg, "#000000", .45) : mische(f.ta, "#000000", .08),
      // Typoluck: Kacheln und Tastatur
      "--kachel-richtig": k.richtig,
      "--kachel-vorhanden": k.vorhanden,
      "--kachel-falsch": d ? mische(f.ta, f.bg, .15) : mische(f.lei, f.ink, .25),
      "--kachel-schrift": "#ffffff",
      "--kachel-rahmen": d ? mische(f.fl, f.ta, .6) : mische(f.ta, f.fl, .15),
      "--kachel-rahmen-voll": d ? mische(f.ta, f.ink, .3) : mische(f.lei, f.ta, .2),
      "--kachel-richtig-kante": kante(k.richtig),
      "--kachel-vorhanden-kante": kante(k.vorhanden),
      "--taste": d ? mische(f.ta, f.ink, .12) : mische(f.ta, f.fl, .35),
      "--taste-schrift": d ? "#ffffff" : f.ink,
      "--taste-aus": d ? mische(f.bg, f.fl, .5) : mische(f.lei, f.ta, .1),
      "--taste-aus-schrift": d ? f.lei : f.fl,
      "--taste-kante": d ? mische(f.ta, "#000000", .3) : mische(f.ta, "#000000", .12),
      "--taste-aus-kante": d ? mische(f.bg, "#000000", .5) : mische(f.lei, "#000000", .2),
      // Blunderluck: Brett
      "--feld-hell": d ? mische(f.ink, f.ak, .14) : mische("#ffffff", f.ak, .08),
      "--feld-dunkel": d ? mische(f.ak, "#000000", .38) : mische(f.ak, "#000000", .12),
    };
    v["--kachel-falsch-kante"] = kante(v["--kachel-falsch"]);
    return v;
  }

  // ---------- Pruefen: Sperre und Lesbarkeit ----------
  function pruefen(welt, modus) {
    const v = werte(welt, modus), fehler = [];
    for (const rolle of ["richtig", "vorhanden"]) {
      const s = SPERRE[rolle], t = farbton(v["--kachel-" + rolle]);
      if (t.saettigung >= .15 && t.grad >= s.von && t.grad <= s.bis) fehler.push(`Kachel ${rolle} ist ${s.name}`);
    }
    const paare = [
      ["--schrift", "--flaeche", 7, "Schrift auf Grund"], ["--schrift", "--karte", 7, "Schrift auf Karte"],
      ["--schrift-leise", "--karte", 3, "leise Schrift auf Karte"], ["--haupt-schrift", "--haupt", 4.5, "Knopf-Schrift auf Hauptfarbe"],
      ["--kachel-schrift", "--kachel-richtig", 3, "Schrift auf Kachel richtig"], ["--kachel-schrift", "--kachel-vorhanden", 3, "Schrift auf Kachel vorhanden"],
      ["--kachel-schrift", "--kachel-falsch", 3, "Schrift auf Kachel falsch"], ["--taste-schrift", "--taste", 4.5, "Tastenschrift"],
    ];
    for (const [a, b, min, name] of paare) {
      const k = kontrast(v[a], v[b]);
      if (k < min) fehler.push(`${name}: Kontrast ${k.toFixed(1)} (mind. ${min})`);
    }
    return fehler;
  }

  function anwenden(welt, modus, ziel) {
    const el = ziel || document.documentElement, v = werte(welt, modus);
    for (const [k, w] of Object.entries(v)) el.style.setProperty(k, w);
    el.dataset.farbwelt = window.UPCREW_INTRO.WELTEN[welt] ? welt : "werkstatt";
    return v;
  }

  window.UPCREW_FARBWELTEN = { werte, pruefen, anwenden, kontrast, KACHELN };
})();
