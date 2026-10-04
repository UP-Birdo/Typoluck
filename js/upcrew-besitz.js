/*
 * upcrew-besitz.js — was ein Spieler aus dem Shop BESITZT, und der Kauf (rein: ohne Bildschirm, ohne Speicher).
 * Braucht upcrew-katalog.js (Stücke, Preise) und upcrew-muenzen.js (Guthaben).
 * Quelle NUR hier (Apps\UPCrew\bausteine), in die Apps KOPIEREN, nie abwandeln. Neu seit Runde 8 (04.10.2026).
 *
 * WO ES LIEGT — am Konto im Feld `besitz` (Regel §13, live seit 29.09.2026, keine neue Regel nötig):
 *     konten/<uid>/besitz/<art> = EIN Text, höchstens 2000 Zeichen aus [A-Za-z0-9_-]; <art> = ^[a-z][a-z0-9]{1,23}$
 * Der Text ist die Liste der Werte dieser Art, getrennt mit "_" und sortiert: "S3_S5". Hier im Code ist Besitz
 * eine MENGE: { schrift: ["S3", "S5"], farbwelt: ["studio"] } — je Art eine sortierte Liste ohne Doppelte.
 * Im Besitz steht nur GEKAUFTES. Was jeder hat (weg "start") oder was erspielt wird, steht nicht darin.
 * Unbekannte Arten und Werte (eine neuere App kennt mehr) bleiben beim Lesen und Schreiben erhalten.
 *
 * KÄUFE WACHSEN NUR: Zwei Fassungen (Gerät und Konto, zwei Geräte) werden VEREINIGT (`zusammenfuehren`) — nie
 * überschreibt eine die andere. Bezahlt wird über den gemeinsamen Fortschritt wie bei UPCREW_MUENZEN: der Zähler
 * `muenzenAusgegeben` im EIGENEN Zweig des Spiels wächst um den Preis (Zähler wachsen nur, beim Zusammenführen
 * gilt der größere Wert). Kaufen zwei Geräte zugleich dasselbe Stück, ist es danach einmal im Besitz und zweimal
 * bezahlt — wie beim Vorrat heute werden dabei nie Daten überschrieben.
 *
 * IN WELCHER REIHENFOLGE DAS SPIEL SPEICHERT (ein Kauf ändert ZWEI Dinge: Besitz und Fortschritt):
 *     1. `kaufen(…)` rechnen — liefert den neuen Besitz und den neuen Fortschritt, speichert nichts.
 *     2. ZUERST den Besitz speichern (Gerät, dann Konto-Feld `besitz/<art>` aus `alsText`).
 *     3. DANN den Fortschritt speichern (wie nach jedem Vorrat-Kauf).
 *   Abbruch zwischen 2 und 3 (App zu, Netz weg): Das Stück ist im Besitz, die Münzen sind nicht abgezogen —
 *   der Spieler hat einmal nichts bezahlt, verloren geht nichts. Umgekehrt (erst Münzen, dann Besitz) wären bei
 *   einem Abbruch die Münzen weg und das Stück nicht da — darum diese Reihenfolge.
 *   Schlägt Schritt 2 am Konto fehl (Regel lehnt ab), bleibt der Kauf auf dem Gerät und wird beim nächsten
 *   Abgleich vereinigt — Schritt 3 trotzdem ausführen, sonst hätte das Gerät das Stück umsonst.
 *
 * MERKER „KAUF OFFEN“ — schließt die Lücke zwischen 2 und 3 (rein gerechnet; speichern und löschen tut das Spiel,
 * auf dem GERÄT, ein Schlüssel je Spiel, Vorschlag "upcrew.kaufOffen.<app>"):
 *     vor Schritt 2:   merker = offenMerken(standVORdemKauf, app, art, wert, preis)  → aufs Gerät legen (JSON),
 *                      ohne Warten direkt vor dem Besitz des Geräts
 *     nach Schritt 3:  Merker vom Gerät löschen
 *     beim Start (Besitz und Fortschritt des Geräts sind geladen, VOR dem ersten neuen Kauf):
 *                      r = offenAufloesen(stand, besitz, merkerVomGeraet, app, jetzt)
 *         "kein"        kein (lesbarer) Merker — nichts tun (einen unlesbaren löschen)
 *         "fremd"       der Merker gehört dem anderen Spiel — liegen lassen
 *         "verworfen"   das Stück ist nicht im Besitz: der Kauf kam nie bis Schritt 2 — Merker löschen
 *         "gebucht"     der Zähler steht schon auf vorher + Preis: Schritt 3 war fertig — Merker löschen
 *         "nachbuchen"  Stück im Besitz, Münzen nicht abgezogen: `r.stand` speichern, DANN Merker löschen
 *   Der Merker trägt, was vor dem Kauf im eigenen Zweig ausgegeben war (`vorher`) — so wird nie doppelt gebucht,
 *   auch wenn die App zwischen Schritt 3 und dem Löschen des Merkers ausgeht. Gebucht wird der Preis von damals
 *   (ein Angebot bleibt ein Angebot).
 *
 * ANGEBOT DES TAGES: drei Stücke, 20 % billiger, aus dem Datum gerechnet — für alle Spieler und in beiden
 * Spielen gleich. Im Topf liegt nur, was kaufbar ist, wirkt und beiden Spielen gehört; nie Erspieltes, nie
 * Pakete. Möglichst drei verschiedene Arten.
 *
 * Nutzung:
 *     UPCREW_BESITZ.lesen({ schrift: "S3_S5" })              → { schrift: ["S3", "S5"] }
 *     UPCREW_BESITZ.alsText(besitz)                          → { ok, feld: { schrift: "S3_S5" }, grund, art }
 *     UPCREW_BESITZ.zusammenfuehren(a, b)                    → Vereinigung
 *     UPCREW_BESITZ.hat(besitz, "schrift", "S3")             → true/false
 *     UPCREW_BESITZ.haken(() => besitz)                      → (art, wert) => true/false, für UPCREW_ANPASSEN
 *     UPCREW_BESITZ.angebot("2026-10-03")                    → [Stück, Stück, Stück]
 *     UPCREW_BESITZ.preis(stueck, "2026-10-03")              → { preis, voll, imAngebot } oder null
 *     UPCREW_BESITZ.kannKaufen(stand, besitz, art, wert, datum)   → { ok, grund, preis, fehlt }
 *     UPCREW_BESITZ.kaufen(stand, besitz, app, art, wert, datum, t)
 *                                                            → { ok, grund, preis, fehlt, stand, besitz, neu }
 *     UPCREW_BESITZ.datumText(ms)                            → "JJJJ-MM-TT" (Ortszeit)
 *     UPCREW_BESITZ.offenMerken(stand, app, art, wert, preis) → { app, art, wert, preis, vorher } oder null
 *     UPCREW_BESITZ.offenLesen(objektOderJsonText)           → sauberer Merker oder null
 *     UPCREW_BESITZ.offenAufloesen(stand, besitz, merker, app, t) → { lage, stand, preis, merker }
 * Gründe: "unbekannt" · "bald" (wirkt noch nicht) · "erspielt" · "start" (hat jeder) · "besitz" (schon da) ·
 *         "zuWenig" (mit `fehlt`) · "voll" (der Konto-Text würde länger als 2000 Zeichen) · "app".
 * `stand` ist der gemeinsame Fortschritt ({ version, spiele: { <app>: { zaehler, stand, … } } }); nichts wird
 * verändert, geliefert werden Kopien.
 */
(function () {
    "use strict";

    const GRENZE = 2000;
    const TRENNER = "_";
    const NACHLASS = 0.2;
    const ANGEBOT_ANZAHL = 3;
    const HOECHSTENS = 1000000000;

    const ART_MUSTER = /^[a-z][a-z0-9]{1,23}$/;
    const WERT_MUSTER = /^[A-Za-z0-9-]+$/;
    const DATUM_MUSTER = /^\d{4}-\d{2}-\d{2}$/;

    const katalog = () => globalThis.UPCREW_KATALOG;
    const muenzen = () => globalThis.UPCREW_MUENZEN;

    const istObjekt = (w) => !!w && typeof w === "object" && !Array.isArray(w);
    const zahl = (w) => (typeof w === "number" && isFinite(w) && w > 0) ? Math.floor(w) : 0;

    /* Eine Liste von Werten sauber machen: nur gültige, ohne Doppelte, sortiert. */
    function werteListe(roh) {
        const liste = Array.isArray(roh) ? roh : (typeof roh === "string" ? roh.split(TRENNER) : []);
        const gesehen = {};
        const sauber = [];
        for (const w of liste) {
            if (typeof w === "string" && WERT_MUSTER.test(w) && !gesehen[w]) {
                gesehen[w] = true;
                sauber.push(w);
            }
        }
        return sauber.sort();
    }

    /* Konto-Feld (Text je Art) ODER eine Menge (Liste je Art) → saubere Menge. Unpassendes fällt still weg. */
    function lesen(feld) {
        const besitz = {};
        if (!istObjekt(feld)) {
            return besitz;
        }
        for (const art of Object.keys(feld).sort()) {
            if (!ART_MUSTER.test(art)) {
                continue;
            }
            const werte = werteListe(feld[art]);
            if (werte.length > 0) {
                besitz[art] = werte;
            }
        }
        return besitz;
    }

    /* Menge → Konto-Feld. Lehnt ehrlich ab, wenn ein Text nicht auf die Regel passt (zu lang). */
    function alsText(besitz) {
        const sauber = lesen(besitz);
        const feld = {};
        for (const art of Object.keys(sauber)) {
            const text = sauber[art].join(TRENNER);
            if (text.length > GRENZE) {
                return { ok: false, feld: null, grund: "zuLang", art: art };
            }
            feld[art] = text;
        }
        return { ok: true, feld: feld, grund: "", art: "" };
    }

    /* Vereinigung — Käufe wachsen nur. */
    function zusammenfuehren(a, b) {
        const eins = lesen(a);
        const zwei = lesen(b);
        const besitz = {};
        for (const art of Object.keys(Object.assign({}, eins, zwei)).sort()) {
            besitz[art] = werteListe((eins[art] || []).concat(zwei[art] || []));
        }
        return besitz;
    }

    function hat(besitz, art, wert) {
        const liste = (istObjekt(besitz) && Array.isArray(besitz[art])) ? besitz[art] : null;
        return !!liste && liste.indexOf(wert) !== -1;
    }

    /* Der Haken für UPCREW_ANPASSEN.zeigen(ort, { besitz }) — `quelle` liefert den Besitz von JETZT. */
    function haken(quelle) {
        return (art, wert) => hat(typeof quelle === "function" ? quelle() : quelle, art, wert);
    }

    function dazu(besitz, art, wert) {
        const neu = lesen(besitz);
        neu[art] = werteListe((neu[art] || []).concat([wert]));
        return lesen(neu);
    }

    /* ---------- Angebot des Tages ---------- */

    function datumText(ms) {
        const d = (typeof ms === "number") ? new Date(ms) : new Date();
        const zwei = (n) => (n < 10 ? "0" : "") + n;
        return d.getFullYear() + "-" + zwei(d.getMonth() + 1) + "-" + zwei(d.getDate());
    }

    /* Zufall mit fester Saat (mulberry32) — gleiche Saat, gleiche Folge, auf jedem Gerät. */
    function zufall(saat) {
        let a = saat >>> 0;
        return function () {
            a = (a + 0x6D2B79F5) >>> 0;
            let t = a;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    function angebotsTopf() {
        const K = katalog();
        return K.STUECKE.filter((s) => s.weg === "kauf" && s.wirkt === true && s.art !== "paket"
            && typeof s.preis === "number" && K.art(s.art).spiel === "alle");
    }

    /* Gemerkt je Datum (04.10.2026): `preis` fragt je Stück nach dem Angebot — gerechnet wird es je Datum nur
       einmal. Gilt nur, solange derselbe Katalog mit derselben Stück-Liste geladen ist; höchstens 31 Tage. */
    const gemerkt = { katalog: null, stuecke: null, tage: new Map() };

    function angebot(datum) {
        if (typeof datum !== "string" || !DATUM_MUSTER.test(datum) || !katalog()) {
            return [];
        }
        const K = katalog();
        if (gemerkt.katalog !== K || gemerkt.stuecke !== K.STUECKE) {
            gemerkt.katalog = K;
            gemerkt.stuecke = K.STUECKE;
            gemerkt.tage.clear();
        }
        let wahl = gemerkt.tage.get(datum);
        if (!wahl) {
            wahl = angebotRechnen(datum);
            if (gemerkt.tage.size >= 31) {
                gemerkt.tage.clear();
            }
            gemerkt.tage.set(datum, wahl);
        }
        return wahl.slice();
    }

    function angebotRechnen(datum) {
        let saat = 0;
        for (let i = 0; i < datum.length; i++) {
            saat = (saat * 31 + datum.charCodeAt(i)) >>> 0;
        }
        const wurf = zufall(saat);
        const topf = angebotsTopf();
        /* Mischen (Fisher-Yates), dann je Art das erste — so endet es immer, auch bei kleinem Topf. */
        for (let i = topf.length - 1; i > 0; i--) {
            const j = Math.floor(wurf() * (i + 1));
            const merk = topf[i];
            topf[i] = topf[j];
            topf[j] = merk;
        }
        const wahl = [];
        const arten = {};
        for (const s of topf) {
            if (wahl.length < ANGEBOT_ANZAHL && !arten[s.art]) {
                arten[s.art] = true;
                wahl.push(s);
            }
        }
        for (const s of topf) {
            if (wahl.length < ANGEBOT_ANZAHL && wahl.indexOf(s) === -1) {
                wahl.push(s);
            }
        }
        return wahl;
    }

    /* Der Preis von heute: { preis, voll, imAngebot } — oder null, wenn das Stück keinen Preis hat. */
    function preis(stueck, datum) {
        if (!stueck || stueck.weg !== "kauf" || typeof stueck.preis !== "number") {
            return null;
        }
        const imAngebot = angebot(datum).indexOf(stueck) !== -1;
        return {
            preis: imAngebot ? Math.round(stueck.preis * (1 - NACHLASS)) : stueck.preis,
            voll: stueck.preis,
            imAngebot: imAngebot
        };
    }

    /* ---------- Kauf ---------- */

    /* Ein Paket ist im Besitz, wenn es gekauft wurde oder jedes kaufbare Teil daraus einzeln da ist. */
    function imBesitz(besitz, stueck) {
        if (!stueck) {
            return false;
        }
        if (hat(besitz, stueck.art, stueck.wert)) {
            return true;
        }
        if (stueck.art !== "paket") {
            return false;
        }
        const teile = katalog().inhalt(stueck).filter((t) => t.weg === "kauf");
        return teile.length > 0 && teile.every((t) => hat(besitz, t.art, t.wert));
    }

    /* Was der Kauf in den Besitz legt: das Stück selbst, bei einem Paket dazu jedes kaufbare Teil, das fehlt. */
    function neueStuecke(besitz, stueck) {
        const liste = [stueck];
        if (stueck.art === "paket") {
            for (const teil of katalog().inhalt(stueck)) {
                if (teil.weg === "kauf") {
                    liste.push(teil);
                }
            }
        }
        return liste.filter((s) => !hat(besitz, s.art, s.wert)).map((s) => ({ art: s.art, wert: s.wert }));
    }

    function kannKaufen(stand, besitz, art, wert, datum) {
        const antwort = (grund, zusatz) => Object.assign({ ok: grund === "", grund: grund, preis: 0, fehlt: 0 },
            zusatz || {});
        const K = katalog();
        const M = muenzen();
        const stueck = K ? K.stueck(art, wert) : null;
        if (!stueck || !M) {
            return antwort("unbekannt");
        }
        if (stueck.wirkt !== true) {
            return antwort("bald");
        }
        if (stueck.weg !== "kauf") {
            return antwort(stueck.weg === "erspielt" ? "erspielt" : "start");
        }
        const heute = preis(stueck, datum);
        if (!heute) {
            return antwort("unbekannt");
        }
        const menge = lesen(besitz);
        if (imBesitz(menge, stueck)) {
            return antwort("besitz", { preis: heute.preis });
        }
        const haben = M.saldo(stand);
        if (haben < heute.preis) {
            return antwort("zuWenig", { preis: heute.preis, fehlt: heute.preis - haben });
        }
        let danach = menge;
        for (const s of neueStuecke(menge, stueck)) {
            danach = dazu(danach, s.art, s.wert);
        }
        if (!alsText(danach).ok) {
            return antwort("voll", { preis: heute.preis });
        }
        return antwort("", { preis: heute.preis });
    }

    /* Eine Kopie des Fortschritts mit sicherem Zweig `app` — dieselbe Buchung wie in upcrew-muenzen.js
       (`mitZweig`, `erhoehen`): Zähler wachsen nur, `stand` des Zweigs rückt vor. */
    function ausgeben(stand, app, betrag, zeitpunkt) {
        const neu = istObjekt(stand) ? JSON.parse(JSON.stringify(stand)) : {};
        if (!istObjekt(neu.spiele)) {
            neu.spiele = {};
        }
        if (typeof neu.version !== "number") {
            neu.version = 1;
        }
        const zweig = istObjekt(neu.spiele[app]) ? neu.spiele[app] : { xp: 0, partien: 0, gezaehlt: [], stand: 0 };
        zweig.zaehler = istObjekt(zweig.zaehler) ? zweig.zaehler : {};
        zweig.stand = Math.max(zahl(zweig.stand) + 1, zahl(zeitpunkt));
        zweig.zaehler.muenzenAusgegeben = Math.min(zahl(zweig.zaehler.muenzenAusgegeben) + betrag, HOECHSTENS);
        neu.spiele[app] = zweig;
        return neu;
    }

    function kaufen(stand, besitz, app, art, wert, datum, zeitpunkt) {
        const pruefung = kannKaufen(stand, besitz, art, wert, datum);
        const menge = lesen(besitz);
        if (!pruefung.ok || typeof app !== "string" || !app) {
            return { ok: false, grund: pruefung.grund || "app", preis: pruefung.preis, fehlt: pruefung.fehlt,
                stand: stand, besitz: menge, neu: [] };
        }
        const neu = neueStuecke(menge, katalog().stueck(art, wert));
        let danach = menge;
        for (const s of neu) {
            danach = dazu(danach, s.art, s.wert);
        }
        return { ok: true, grund: "", preis: pruefung.preis, fehlt: 0,
            stand: ausgeben(stand, app, pruefung.preis, zeitpunkt), besitz: danach, neu: neu };
    }

    /* ---------- Merker „Kauf offen“ (rein — aufs Gerät legen und löschen tut das Spiel) ---------- */

    /* Was im Zweig `app` bisher ausgegeben ist. */
    function ausgegeben(stand, app) {
        const zweig = (istObjekt(stand) && istObjekt(stand.spiele)) ? stand.spiele[app] : null;
        return (istObjekt(zweig) && istObjekt(zweig.zaehler)) ? zahl(zweig.zaehler.muenzenAusgegeben) : 0;
    }

    const ganzeZahl = (w, mindestens) => typeof w === "number" && isFinite(w) && Math.floor(w) === w
        && w >= mindestens && w <= HOECHSTENS;

    /* Ein Merker vom Gerät (Objekt oder JSON-Text) → sauberer Merker oder null. Unpassendes gilt als „kein“. */
    function offenLesen(roh) {
        let m = roh;
        if (typeof roh === "string") {
            try {
                m = JSON.parse(roh);
            } catch (fehler) {
                return null;
            }
        }
        if (!istObjekt(m) || typeof m.app !== "string" || !m.app
            || typeof m.art !== "string" || !ART_MUSTER.test(m.art)
            || typeof m.wert !== "string" || !WERT_MUSTER.test(m.wert)
            || !ganzeZahl(m.preis, 1) || !ganzeZahl(m.vorher, 0)) {
            return null;
        }
        return { app: m.app, art: m.art, wert: m.wert, preis: m.preis, vorher: m.vorher };
    }

    /* Der Merker für einen Kauf, der gleich gespeichert wird. `stand` ist der Fortschritt VOR dem Kauf. */
    function offenMerken(stand, app, art, wert, preis) {
        return offenLesen({ app: app, art: art, wert: wert, preis: preis, vorher: ausgegeben(stand, app) });
    }

    /* Beim Start: Was ist aus dem gemerkten Kauf geworden? Liefert die Lage und — nur bei "nachbuchen" — den
       Fortschritt mit dem nachgebuchten Preis. Nichts wird verändert. */
    function offenAufloesen(stand, besitz, merker, app, zeitpunkt) {
        const m = offenLesen(merker);
        const antwort = (lage, neu) => ({ lage: lage, stand: neu || stand, preis: m ? m.preis : 0, merker: m });
        if (!m) {
            return antwort("kein");
        }
        if (typeof app !== "string" || m.app !== app) {
            return antwort("fremd");
        }
        if (!hat(lesen(besitz), m.art, m.wert)) {
            return antwort("verworfen");
        }
        if (ausgegeben(stand, app) >= m.vorher + m.preis) {
            return antwort("gebucht");
        }
        return antwort("nachbuchen", ausgeben(stand, app, m.preis, zeitpunkt));
    }

    const UPCREW_BESITZ = { GRENZE: GRENZE, TRENNER: TRENNER, NACHLASS: NACHLASS,
        lesen: lesen, alsText: alsText, zusammenfuehren: zusammenfuehren, hat: hat, haken: haken,
        imBesitz: imBesitz, angebot: angebot, preis: preis, datumText: datumText,
        kannKaufen: kannKaufen, kaufen: kaufen,
        offenMerken: offenMerken, offenLesen: offenLesen, offenAufloesen: offenAufloesen };
    globalThis.UPCREW_BESITZ = UPCREW_BESITZ;
    if (typeof module !== "undefined" && module.exports) {
        module.exports = UPCREW_BESITZ;
    }
})();
