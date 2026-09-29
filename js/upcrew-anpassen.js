/*
 * upcrew-anpassen.js — der Tab „Anpassen“, gleich in Blunderluck und Typoluck.
 * Quelle NUR hier (Design\3D-Schrift\final), verteilt mit tools\Intro-Verteilen.cmd — nie in einer App abwandeln.
 *
 * Nutzer, 26.09.2026: „ein Anpassungsbereich, wo die Spieler ihre Belohnungen testen und kombinieren können —
 * ein eigener Tab mit Vorschau, damit Spieler sich austoben können“ … „in beiden Apps“.
 *
 * Was er zeigt: oben die VORSCHAU (klebt, Typoluck/Blunderluck umschaltbar, Zufall), zeigt den Entwurf sofort —
 * auch Gesperrtes, mit „Vorschau · frei ab Stufe X“. Darunter Regale Farbwelt · Schrift · Knöpfe · Darstellung ·
 * Sets (3 Lieblings-Kombinationen). Unten „Zurück“ / „Übernehmen“ — Übernehmen nur mit Freigeschaltetem, gilt über
 * upcrew-aussehen.js in BEIDEN Spielen.
 *
 * Die App liefert nur den Platz und ihren Stand:
 *     const tab = UPCREW_ANPASSEN.zeigen(ort, {
 *         app: "typoluck",                 // welches Spiel die Vorschau zuerst zeigt
 *         stufe: 4,                        // erreichte Stufe im gemeinsamen Herausforderungs-Pfad
 *         alleFrei: false,                 // z. B. Werkstatt-Modus
 *         besitz(art, wert) {…},           // optional: true = besessen (z. B. im Shop gekauft) → frei, egal welches
 *                                          //  Level (seit 29.09.2026c; „Käufe aus dem Shop bleiben Besitz")
 *         sets: { lesen() {…}, schreiben(liste) {…} },  // optional; Standard: Gerät, später am Konto
 *         regale: [ … ]                    // optional: EIGENE Regale nur dieser App (siehe unten)
 *     });
 *
 * Eigene Regale (z. B. Blunderluck „Brett“: 2D/3D, entschieden 26.09.2026 — 3D erst ab Arena 2):
 *     { schluessel: "brett", titel: "Brett", wert: "2d",            // was die App gerade hat
 *       stuecke: [ { wert: "2d", name: "2D" }, { wert: "3d", name: "3D", frei: false, ab: "Arena 2" } ],
 *       uebernehmen(wert) { … } }                                    // die App speichert selbst
 * Der Wert landet im Entwurf unter entwurf.extra[schluessel]; die Blunderluck-Vorschau kennt "brett" = "3d"
 * (gekipptes Brett). Wer eine echte Vorschau zeichnen will: opt.vorschau(el, entwurf, app) nach dem Zeichnen.
 *     tab.stufeSetzen(5);  tab.neuZeichnen();  tab.entfernen();
 *
 * Freischalten (seit 29.09.2026c): frei ist, was `alleFrei`, `besitz(art, wert)` oder STUFEN[art][wert] <= stufe
 * (stufe = gemeinsames LEVEL) durchlässt; `UPCREW_ANPASSEN.frei(art, wert, stufe, besitz)` rechnet dasselbe für
 * die App. Grau ist Stufe 0 (immer frei, Start für neue Spieler), die anderen Farbwelten folgen dem Level-Pfad
 * (upcrew-levelpfad.js). Der WÜRFEL (Zufall, liegt in der Sammlung unten im Balken) wählt NUR Freies — bei Farbwelt,
 * Schrift und Knöpfen; ist nirgends eine Wahl, ist er aus.
 *
 * Braucht: upcrew-intro.js (WELTEN), upcrew-farbwelten.js, upcrew-aussehen.js, upcrew-knoepfe.css,
 * upcrew-anpassen.css, die Crew-Schriften unter UPCREW_AUSSEHEN.schriftPfad.
 */
(function () {
  "use strict";

  // Ab welchem LEVEL etwas frei ist. PLATZHALTER — der Nutzer legt sie fest. Reihenfolge je Regal = Anzeige.
  // Farbwelt seit 29.09.2026c („alle auf Schwarz-Weiß"): Grau 0 = Start; die anderen wie der Level-Pfad
  // (upcrew-levelpfad.js TABELLE: Studio 3, Feld 11, Tiefsee 21, Gold 40). Werkstatt (bisher Standard) = Level 2,
  // PLATZHALTER (im Pfad kursiv). Vorher: werkstatt 0, studio 2, feld 4, tiefsee 6, gold 9.
  const STUFEN = {
    farbwelt: { grau: 0, werkstatt: 2, studio: 3, feld: 11, tiefsee: 21, gold: 40 },
    schrift: { S1: 0, S4: 2, S2: 3, S3: 5, S5: 7, S6: 8 },
    knoepfe: { K1: 0, K5: 2, K3: 3, K2: 4, K4: 6, K6: 9 },
    darstellung: { geraet: 0, hell: 0, dunkel: 0 },
  };
  const KNOPF_NAMEN = { K1: "Stufe", K2: "Kissen", K3: "Taste", K4: "Stempel", K5: "Kapsel", K6: "Ecke" };
  const DARST_NAMEN = { geraet: "Gerät", hell: "Hell", dunkel: "Dunkel" };
  const TEILE = ["farbwelt", "schrift", "knoepfe", "darstellung"];
  const WUERFEL_TEILE = ["farbwelt", "schrift", "knoepfe"];

  /* Frei? alleFrei, Besitz (Shop/Inventar der App) oder Stufe erreicht. Unbekanntes ist gesperrt. */
  function freiRechnen(art, w, stufe, besitz, alleFrei) {
    if (alleFrei) return true;
    if (typeof besitz === "function") { try { if (besitz(art, w)) return true; } catch (e) { /* App-Fehler: nur Stufe */ } }
    const tabelle = STUFEN[art] || {};
    if (!(w in tabelle)) return false;
    return tabelle[w] <= (Number(stufe) || 0);
  }
  const SETS_SCHLUESSEL = "upcrew.aussehen-sets";

  const SYM = {
    schloss: '<path d="M7 11 V8 A5 5 0 0 1 17 8 V11 M5 11 H19 V20 H5 Z"/>',
    zufall: '<rect x="4" y="4" width="16" height="16" rx="4"/><circle cx="9" cy="9" r=".9"/><circle cx="15" cy="15" r=".9"/><circle cx="15" cy="9" r=".9"/><circle cx="9" cy="15" r=".9"/>',
  };
  const sym = (n, k) => `<svg class="upa-sym${k ? " " + k : ""}" viewBox="0 0 24 24" aria-hidden="true">${SYM[n]}</svg>`;

  function zeigen(ort, opt) {
    const A = window.UPCREW_AUSSEHEN, F = window.UPCREW_FARBWELTEN, W = window.UPCREW_INTRO.WELTEN;
    opt = opt || {};
    let stufe = Number(opt.stufe) || 0, vorschauApp = opt.app === "blunderluck" ? "blunderluck" : "typoluck";
    const sets = opt.sets || {
      lesen() { try { return JSON.parse(localStorage.getItem(SETS_SCHLUESSEL) || "null") || [null, null, null]; } catch (e) { return [null, null, null]; } },
      schreiben(l) { try { localStorage.setItem(SETS_SCHLUESSEL, JSON.stringify(l)); } catch (e) { /* egal */ } },
    };
    const frei = (art, w) => freiRechnen(art, w, stufe, opt.besitz, opt.alleFrei);
    A.erlaubtSetzen(frei);
    A.WAHL.schrift.forEach(A.schriftLaden);

    const regale = Array.isArray(opt.regale) ? opt.regale : [];
    const regal = (k) => regale.find((r) => r.schluessel === k);
    const stueckVon = (k, w) => { const r = regal(k); return r && r.stuecke.find((s) => s.wert === w); };
    const extraFrei = (k, w) => { const s = stueckVon(k, w); return !!opt.alleFrei || !s || s.frei !== false; };
    const uebernommen = () => Object.assign(A.lesen(), { extra: regale.reduce((o, r) => (o[r.schluessel] = r.wert, o), {}) });

    let entwurf = uebernommen();
    const gleich = (a, b) => TEILE.every((k) => a[k] === b[k])
      && regale.every((r) => (a.extra || {})[r.schluessel] === (b.extra || {})[r.schluessel]);
    const modusVon = (d) => d === "hell" || d === "dunkel" ? d
      : (matchMedia("(prefers-color-scheme: light)").matches ? "hell" : "dunkel");

    /* Der Umschalter Typoluck/Blunderluck zeigt das Aussehen im ANDEREN Spiel — nur sinnvoll, wenn beide dasselbe
       Aussehen teilen (UPCREW_AUSSEHEN.GETEILT, seit 27.09.2026 Standard false: jedes Spiel sein eigenes). */
    const geteilt = A.GETEILT !== false;
    ort.classList.add("upa");
    ort.innerHTML = `
      <section class="upa-vorschau-rahmen">
        <div class="upa-leiste">
          ${geteilt ? `<div class="upa-mini-seg" role="group" aria-label="Vorschau">
            <button type="button" data-app="typoluck">Typoluck</button><button type="button" data-app="blunderluck">Blunderluck</button>
          </div>` : ""}
          <span class="upa-hinweis" hidden>${sym("schloss", "upa-klein")}<span></span></span>
          <button type="button" class="up-kn up-zweit up-rund upa-zufall" aria-label="Zufall"><i class="up-led"></i>${sym("zufall")}</button>
        </div>
        <div class="upa-vorschau"></div>
      </section>
      ${[...regale.map((r) => [r.schluessel, r.titel]), ["farbwelt", "Farbwelt"], ["schrift", "Schrift"], ["knoepfe", "Knöpfe"],
         ["darstellung", "Darstellung"], ["sets", "Sets"]].map(([r, t]) => `
        <section class="upa-regal"><h2>${t}</h2><div class="upa-reihe" data-regal="${r}"></div></section>`).join("")}
      <div class="upa-aktion">
        <button type="button" class="up-kn up-zweit upa-zurueck"><i class="up-led"></i><span>Zurück</span></button>
        <button type="button" class="up-kn up-haupt upa-uebernehmen"><i class="up-led"></i><span>Übernehmen</span></button>
      </div>`;
    const $ = (s) => ort.querySelector(s);
    const freieVon = (k) => Object.keys(STUFEN[k]).filter((w) => A.WAHL[k].indexOf(w) !== -1 && frei(k, w));
    const reihe = (r) => ort.querySelector(`[data-regal="${r}"]`);

    // ---------- Vorschau ----------
    const kachel = (b, art) => `<span class="upa-kachel ${art}">${b}</span>`;
    function typoluck() {
      const z1 = [["K", "falsch"], ["R", "vorhanden"], ["O", "falsch"], ["N", "richtig"], ["E", "richtig"]];
      const z2 = [["B", "falsch"], ["Ä", "richtig"], ["R", "falsch"], ["T", "vorhanden"], ["E", "richtig"]];
      return `<div class="upa-v-kopf"><b>Heute</b><span>3/6 · 12 480</span></div>
        <div class="upa-brett">${[z1, z2].map((z) => `<div>${z.map(([b, a]) => kachel(b, a)).join("")}</div>`).join("")}
          <div>${kachel("", "leer").repeat(5)}</div></div>
        <div class="upa-v-knoepfe"><button type="button" class="up-kn up-haupt" tabindex="-1"><i class="up-led"></i><span>Tägliches Wort</span></button>
          <button type="button" class="up-kn up-zweit" tabindex="-1"><i class="up-led"></i><span>Frei</span></button></div>
        <div class="upa-tasten">${[..."QWERTZUIOPÜ"].map((t) => `<span>${t}</span>`).join("")}</div>`;
    }
    function blunderluck() {
      const fig = { 0: "s♜", 2: "s♝", 4: "s♚", 11: "s♟", 13: "s♟", 17: "s♞", 21: "w♟", 23: "w♛", 27: "w♞", 30: "w♜", 34: "w♚" };
      let felder = "";
      for (let i = 0; i < 36; i++) {
        const f = fig[i], hell = (Math.floor(i / 6) + i % 6) % 2 === 0;
        felder += `<span class="${hell ? "hell" : "dunkel"}">${f ? `<i class="${f[0] === "w" ? "weiss" : "schwarz"}">${f.slice(1)}</i>` : ""}</span>`;
      }
      const drei = (entwurf.extra || {}).brett === "3d";
      return `<div class="upa-v-kopf"><b>Blunderluck</b><span>${drei ? "3D" : "2D"} · Rang 7</span></div>
        <div class="upa-schach-buehne${drei ? " upa-3d" : ""}"><div class="upa-schach">${felder}</div></div>
        <div class="upa-v-knoepfe"><button type="button" class="up-kn up-haupt" tabindex="-1"><i class="up-led"></i><span>Spielen</span></button>
          <button type="button" class="up-kn up-zweit" tabindex="-1"><i class="up-led"></i><span>Bob</span></button></div>`;
    }
    function vorschauZeichnen() {
      const el = $(".upa-vorschau"), m = modusVon(entwurf.darstellung);
      F.anwenden(entwurf.farbwelt, m, el);
      el.dataset.modus = m;
      el.dataset.knoepfe = entwurf.knoepfe;
      el.style.fontFamily = `"Crew ${entwurf.schrift}", system-ui, sans-serif`;
      el.innerHTML = vorschauApp === "typoluck" ? typoluck() : blunderluck();
      if (typeof opt.vorschau === "function") opt.vorschau(el, entwurf, vorschauApp);
      el.classList.remove("upa-neu"); void el.offsetWidth; el.classList.add("upa-neu");
      for (const b of ort.querySelectorAll(".upa-mini-seg button")) b.setAttribute("aria-pressed", String(b.dataset.app === vorschauApp));

      const gesperrt = ["farbwelt", "schrift", "knoepfe"].filter((k) => !frei(k, entwurf[k]));
      const extraZu = regale.filter((r) => !extraFrei(r.schluessel, entwurf.extra[r.schluessel]));
      const gruende = [];
      if (gesperrt.length) gruende.push("Stufe " + Math.max(...gesperrt.map((k) => STUFEN[k][entwurf[k]])));
      for (const r of extraZu) gruende.push(stueckVon(r.schluessel, entwurf.extra[r.schluessel]).ab || "später");
      const hinweis = $(".upa-hinweis");
      hinweis.hidden = !gruende.length;
      if (gruende.length) hinweis.querySelector("span").textContent = "ab " + gruende.join(" + ");
      const knopf = $(".upa-uebernehmen"), text = knopf.querySelector("span"), fertig = gleich(entwurf, uebernommen());
      knopf.disabled = !!gruende.length || fertig;
      text.textContent = gruende.length ? "Noch gesperrt" : fertig ? "Übernommen" : "Übernehmen";
      $(".upa-zurueck").disabled = fertig;
      // Würfel aus, wenn es nirgends eine Wahl gibt (z. B. neuer Spieler: nur Grau, S1, K1). Er liegt evtl. schon
      // im Balken (upcrew-sammlung wuerfelUnten) — gesucht wird am ganzen Ort.
      const wuerfel = ort.querySelector(".upa-zufall");
      if (wuerfel) wuerfel.disabled = !WUERFEL_TEILE.some((k) => freieVon(k).length > 1);
    }

    // ---------- Regale ----------
    function stueck(art, w, innen, name) {
      const zu = !frei(art, w);
      return `<button type="button" class="upa-stueck${zu ? " zu" : ""}${A.lesen()[art] === w ? " aktiv" : ""}" data-art="${art}" data-wert="${w}" aria-pressed="${entwurf[art] === w}">
        <span class="upa-bild">${innen}</span><span class="upa-name">${name}</span>
        ${zu ? `<span class="upa-schloss">${sym("schloss")}${STUFEN[art][w]}</span>` : ""}</button>`;
    }
    const BRETT_BILD = {
      "2d": '<span class="upa-brettbild"><i></i><i></i><i></i><i></i></span>',
      "3d": '<span class="upa-brettbild upa-3d"><i></i><i></i><i></i><i></i></span>',
    };
    function regaleZeichnen() {
      const m = modusVon(entwurf.darstellung);
      for (const r of regale) {
        reihe(r.schluessel).innerHTML = r.stuecke.map((s) => {
          const zu = !extraFrei(r.schluessel, s.wert);
          return `<button type="button" class="upa-stueck${zu ? " zu" : ""}${r.wert === s.wert ? " aktiv" : ""}" data-extra="${r.schluessel}" data-wert="${s.wert}" aria-pressed="${entwurf.extra[r.schluessel] === s.wert}">
            <span class="upa-bild">${s.bild || BRETT_BILD[s.wert] || ""}</span><span class="upa-name">${s.name}</span>
            ${zu ? `<span class="upa-schloss">${sym("schloss")}${s.ab || ""}</span>` : ""}</button>`;
        }).join("");
      }
      reihe("farbwelt").innerHTML = Object.keys(STUFEN.farbwelt).map((w) => {
        const f = W[w][m];
        return stueck("farbwelt", w, `<span class="upa-muster"><i style="background:${f.bg}"></i><i style="background:${f.fl}"></i><i style="background:${f.ak}"></i></span>`, W[w].name);
      }).join("");
      reihe("schrift").innerHTML = Object.keys(STUFEN.schrift).map((s) =>
        stueck("schrift", s, `<span class="upa-aa" style="font-family:'Crew ${s}'">Ag</span>`, "Crew " + s.slice(1))).join("");
      reihe("knoepfe").innerHTML = Object.keys(STUFEN.knoepfe).map((k) =>
        stueck("knoepfe", k, `<span class="upa-mini" data-knoepfe="${k}"><span class="up-kn up-haupt"><i class="up-led"></i>Los</span></span>`, KNOPF_NAMEN[k])).join("");
      reihe("darstellung").innerHTML = Object.keys(STUFEN.darstellung).map((d) =>
        stueck("darstellung", d, `<span class="upa-darst ${d}"></span>`, DARST_NAMEN[d])).join("");
      reihe("sets").innerHTML = sets.lesen().map((s, i) => {
        if (!s || !W[s.farbwelt]) return `<button type="button" class="upa-stueck upa-set leer" data-set="${i}"><span class="upa-bild">+</span><span class="upa-name">Merken</span></button>`;
        const f = W[s.farbwelt][modusVon(s.darstellung)];
        return `<button type="button" class="upa-stueck upa-set" data-set="${i}" aria-pressed="${gleich(s, entwurf)}">
          <span class="upa-bild upa-set-bild" style="background:${f.bg};font-family:'Crew ${s.schrift}'"><b style="color:${f.ak}">Ag</b></span>
          <span class="upa-name">Set ${i + 1}</span><span class="upa-set-weg" data-weg="${i}" role="button" aria-label="Set ${i + 1} leeren">×</span></button>`;
      }).join("");
    }
    const zeichnen = () => { regaleZeichnen(); vorschauZeichnen(); };

    // ---------- Bedienung ----------
    function klick(e) {
      const weg = e.target.closest("[data-weg]");
      if (weg) { const l = sets.lesen(); l[+weg.dataset.weg] = null; sets.schreiben(l); zeichnen(); return; }
      const set = e.target.closest("[data-set]");
      if (set) {
        const l = sets.lesen(), i = +set.dataset.set;
        if (l[i]) {
          // Eigene Regale nur, wenn diese App sie kennt und der Wert gültig ist
          const extra = Object.assign({}, entwurf.extra);
          for (const [k, w] of Object.entries(l[i].extra || {})) if (stueckVon(k, w)) extra[k] = w;
          entwurf = Object.assign({}, entwurf, l[i], { extra });
        } else {
          l[i] = TEILE.reduce((o, k) => (o[k] = entwurf[k], o), { extra: Object.assign({}, entwurf.extra) });
          sets.schreiben(l);
        }
        zeichnen(); return;
      }
      const st = e.target.closest(".upa-stueck[data-art]");
      if (st) { entwurf[st.dataset.art] = st.dataset.wert; zeichnen(); return; }
      const ex = e.target.closest(".upa-stueck[data-extra]");
      if (ex) {
        entwurf.extra = Object.assign({}, entwurf.extra, { [ex.dataset.extra]: ex.dataset.wert });
        // Brett/Figuren zeigen, wenn man sie antippt (Vorschlag BL v0.157.4: auch "figurart")
        if ((ex.dataset.extra === "brett" || ex.dataset.extra === "figurart") && geteilt) vorschauApp = "blunderluck";
        zeichnen(); return;
      }
      const app = e.target.closest(".upa-mini-seg button");
      if (app) { vorschauApp = app.dataset.app; vorschauZeichnen(); return; }
      if (e.target.closest(".upa-zufall")) {
        // Nur Freigeschaltetes/Besessenes (Nutzer 29.09.2026). Bis zu 8 Würfe, damit sich möglichst etwas ändert.
        const zufall = (l) => l[Math.floor(Math.random() * l.length)];
        const vorher = WUERFEL_TEILE.map((k) => entwurf[k]).join("|");
        for (let wurf = 0; wurf < 8; wurf++) {
          for (const k of WUERFEL_TEILE) { const l = freieVon(k); if (l.length) entwurf[k] = zufall(l); }
          if (WUERFEL_TEILE.map((k) => entwurf[k]).join("|") !== vorher) break;
        }
        zeichnen(); return;
      }
      if (e.target.closest(".upa-zurueck")) { entwurf = uebernommen(); zeichnen(); return; }
      if (e.target.closest(".upa-uebernehmen")) {
        A.setzen(TEILE.reduce((o, k) => (o[k] = entwurf[k], o), {}));
        for (const r of regale) {
          const w = entwurf.extra[r.schluessel];
          if (w !== r.wert) { r.wert = w; if (typeof r.uebernehmen === "function") r.uebernehmen(w); }
        }
        entwurf = uebernommen();
        zeichnen();
      }
    }
    ort.addEventListener("click", klick);
    const abmelden = A.beobachten((a, quelle) => { if (quelle !== "selbst") zeichnen(); });
    zeichnen();

    return {
      neuZeichnen: zeichnen,
      stufeSetzen(n) { stufe = Number(n) || 0; zeichnen(); },
      alleFreiSetzen(j) { opt.alleFrei = !!j; zeichnen(); },
      entfernen() { ort.removeEventListener("click", klick); abmelden(); ort.innerHTML = ""; ort.classList.remove("upa"); },
    };
  }

  window.UPCREW_ANPASSEN = { zeigen, STUFEN, frei: (art, w, stufe, besitz) => freiRechnen(art, w, stufe, besitz, false) };
})();
