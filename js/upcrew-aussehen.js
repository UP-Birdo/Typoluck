/*
 * upcrew-aussehen.js — EIN Aussehen für alle UPCrew-Spiele (Blunderluck, Typoluck; NICHT Trainer).
 *
 * Nutzer, 26.09.2026: „wenn man die eine App auf hell umstellt oder die Farbpalette / Schriftart nutzt, sollen
 * sich alle anderen Apps auch so umstellen.“
 *
 * Was hier liegt (ein JSON unter `upcrew.aussehen`):
 *     darstellung  "geraet" | "hell" | "dunkel"
 *     farbwelt     "werkstatt" | "studio" | "feld" | "tiefsee" | "gold"
 *     schrift      "S1" … "S6"   (Crew-Schnitte, docs\SCHRIFT-KNOEPFE.md)
 *     knoepfe      "K1" … "K6"
 *     leseschrift  true = immer die Standard-Schrift, egal was gewählt ist
 *     stand        Zeitpunkt der letzten Änderung (ms) — die neuere Wahl gewinnt
 *
 * WIE DIE ANDEREN APPS MITZIEHEN
 *  1. Gleicher Browser: beide Spiele liegen auf https://up-birdo.github.io/ → `localStorage` ist geteilt. Ist die
 *     andere App gerade offen, meldet der Browser die Änderung (`storage`-Ereignis) → sie stellt sich SOFORT um.
 *     Beim Zurückholen in den Vordergrund wird zusätzlich nachgelesen.
 *  2. Andere Geräte und iPhone-Home-Bildschirm-Apps (jede hat eigenen Speicher): über das UPCrew-Konto. Die App
 *     schreibt `fuerKonto()` nach jeder Änderung an ihr Konto und gibt beim Start/Vordergrund das Konto-Objekt an
 *     `uebernehmen()`; die neuere Wahl (`stand`) gewinnt. Gäste: nur Punkt 1.
 *
 * Freischalten entscheidet die App (Inventar am Konto, Pfad-Stufen): `setzen` nimmt nur, was `erlaubt` durchlässt.
 * Unbekannte Werte (z. B. eine neuere App kennt eine Schrift, die ältere nicht) fallen still auf den Standard.
 *
 * Nutzung:
 *     UPCREW_AUSSEHEN.anwenden();                    früh beim Laden (kein Aufblitzen)
 *     UPCREW_AUSSEHEN.beobachten(() => neuZeichnen);  andere App hat umgestellt
 *     UPCREW_AUSSEHEN.setzen({ darstellung: "hell" });
 *
 * Quelle NUR hier (Design\3D-Schrift\final), verteilt mit tools\Intro-Verteilen.cmd — nie in einer App abwandeln.
 */
(function () {
  "use strict";

  const SCHLUESSEL = "upcrew.aussehen";
  const ALT_FARBWELT = "upcrew.farbwelt";   // liest das Intro; wird mitgeschrieben

  const WAHL = {
    darstellung: ["geraet", "hell", "dunkel"],
    farbwelt: ["werkstatt", "studio", "feld", "tiefsee", "gold"],
    schrift: ["S1", "S2", "S3", "S4", "S5", "S6"],
    knoepfe: ["K1", "K2", "K3", "K4", "K5", "K6"],
  };
  // Standard = frei für alle. Schrift und Knöpfe: Sieger der Bewertung, bis dahin S1/K1.
  const STANDARD = { darstellung: "geraet", farbwelt: "werkstatt", schrift: "S1", knoepfe: "K1", leseschrift: false, stand: 0 };

  // Wo die Crew-Schriften liegen (relativ zur Seite). Die App setzt es, falls anders: UPCREW_AUSSEHEN.schriftPfad = "…/".
  let schriftPfad = "schrift/";
  const geladen = new Set();
  /* Meldet beide Stärken einer Crew-Schrift an (einmal je Seite). Die Datei kommt erst, wenn Text sie braucht. */
  function schriftLaden(s) {
    if (geladen.has(s) || typeof FontFace !== "function" || !document.fonts) return;
    geladen.add(s);
    for (const [stil, gewicht] of [["normal", "400"], ["fett", "700"]]) {
      const f = new FontFace("Crew " + s, `url(${schriftPfad}crew-${s}-${stil}.woff2)`, { weight: gewicht, display: "swap" });
      document.fonts.add(f);
    }
  }
  const RUECKFALL = '"Segoe UI", system-ui, -apple-system, Roboto, Arial, sans-serif';

  let erlaubt = () => true;
  const horcher = new Set();

  const lies = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const schreib = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* privat/voll: dann nur für diese Sitzung */ } };

  function bereinigen(roh) {
    const a = Object.assign({}, STANDARD);
    if (roh && typeof roh === "object") {
      for (const k of Object.keys(WAHL)) if (WAHL[k].indexOf(roh[k]) !== -1) a[k] = roh[k];
      a.leseschrift = roh.leseschrift === true;
      a.stand = Number(roh.stand) > 0 ? Number(roh.stand) : 0;
    }
    return a;
  }

  let aktuell = null;
  function lesen() {
    if (!aktuell) {
      let roh = null;
      try { roh = JSON.parse(lies(SCHLUESSEL) || "null"); } catch (e) { roh = null; }
      if (!roh) {
        // Erststart mit diesem Baustein: die schon gewählte Farbwelt übernehmen
        const welt = lies(ALT_FARBWELT);
        roh = welt ? { farbwelt: welt } : null;
      }
      aktuell = bereinigen(roh);
    }
    return Object.assign({}, aktuell);
  }

  function speichern(neu) {
    aktuell = bereinigen(neu);
    schreib(SCHLUESSEL, JSON.stringify(aktuell));
    schreib(ALT_FARBWELT, aktuell.farbwelt);
  }

  function melden(quelle) {
    const a = lesen();
    horcher.forEach((fn) => { try { fn(a, quelle); } catch (e) { console.error(e); } });
  }

  /* Einmalig je App: die bisherige eigene Wahl (z. B. Typoluck `thema`) mitgeben, solange es noch keine gemeinsame
     gibt. Danach ist `upcrew.aussehen` führend. */
  function migrieren(alt) {
    if (lies(SCHLUESSEL)) return false;
    speichern(Object.assign(lesen(), alt || {}, { stand: 0 }));
    return true;
  }

  function setzen(teil) {
    const neu = Object.assign(lesen(), teil || {});
    for (const k of ["farbwelt", "schrift", "knoepfe"]) {
      if (teil && k in teil && !erlaubt(k, teil[k])) neu[k] = aktuell[k];
    }
    neu.stand = Date.now();
    speichern(neu);
    anwenden();
    melden("selbst");
    return lesen();
  }

  function modus() {
    const d = lesen().darstellung;
    if (d === "hell" || d === "dunkel") return d;
    const hell = typeof matchMedia === "function" && matchMedia("(prefers-color-scheme: light)").matches;
    return hell ? "hell" : "dunkel";
  }

  function schriftFamilie(a) {
    const s = a.leseschrift ? STANDARD.schrift : a.schrift;
    return `"Crew ${s}", ${RUECKFALL}`;
  }

  /* Schreibt alles an <html>: data-darstellung (fehlt = Gerät), data-farbwelt, data-schrift, data-knoepfe
     (die Knopf-Familie selbst steht in upcrew-knoepfe.css), die Farbwelt-Variablen (wenn upcrew-farbwelten.js da
     ist) und --schrift-familie. */
  function anwenden(ziel) {
    const el = ziel || (typeof document !== "undefined" && document.documentElement);
    if (!el || !el.dataset) return;
    const a = lesen();
    if (a.darstellung === "geraet") delete el.dataset.darstellung; else el.dataset.darstellung = a.darstellung;
    el.dataset.schrift = a.leseschrift ? STANDARD.schrift : a.schrift;
    el.dataset.knoepfe = a.knoepfe;
    if (el.style) {
      schriftLaden(a.leseschrift ? STANDARD.schrift : a.schrift);
      el.style.setProperty("--schrift-familie", schriftFamilie(a));
      if (window.UPCREW_FARBWELTEN) window.UPCREW_FARBWELTEN.anwenden(a.farbwelt, modus(), el);
    }
  }

  function beobachten(fn) { horcher.add(fn); return () => horcher.delete(fn); }

  /* Konto → Gerät. Gibt true zurück, wenn sich etwas geändert hat. */
  function uebernehmen(vomKonto) {
    if (!vomKonto || !(Number(vomKonto.stand) > lesen().stand)) return false;
    speichern(vomKonto);
    anwenden();
    melden("konto");
    return true;
  }
  const fuerKonto = () => lesen();

  // Andere App/Tab im selben Browser hat umgestellt
  if (typeof window !== "undefined") {
    window.addEventListener("storage", (e) => {
      if (e.key !== SCHLUESSEL && e.key !== null) return;
      aktuell = null;
      anwenden();
      melden("andere-app");
    });
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState !== "visible") return;
      const vorher = JSON.stringify(aktuell);
      aktuell = null;
      if (JSON.stringify(lesen()) !== vorher) { anwenden(); melden("andere-app"); }
    });
    if (typeof matchMedia === "function") {
      matchMedia("(prefers-color-scheme: light)").addEventListener("change", () => {
        if (lesen().darstellung === "geraet") { anwenden(); melden("geraet"); }
      });
    }
  }

  window.UPCREW_AUSSEHEN = {
    SCHLUESSEL, WAHL, STANDARD,
    lesen, setzen, anwenden, modus, beobachten, uebernehmen, fuerKonto, migrieren, schriftLaden,
    get schriftPfad() { return schriftPfad; }, set schriftPfad(p) { schriftPfad = String(p); },
    erlaubtSetzen: (fn) => { erlaubt = typeof fn === "function" ? fn : () => true; },
  };
})();
