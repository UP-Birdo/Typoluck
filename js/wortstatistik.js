/*
 * wortstatistik.js — Wortstatistik, Spieler-Stufe, neue Schwierigkeit und
 * Lexikon als reine Rechnung (seit 0.23.1; Konzept
 * UPCrew-Konzept DATENBANK-KONZEPT-12.md, Abschnitte 6, 7, 8 und 9).
 * Kein Bildschirm, kein Netz, kein Speicher — das macht
 * js/wortstatistik-abgleich.js bzw. die Verwaltung. Ohne Browser testbar.
 *
 * WORTSCHLÜSSEL `schluessel(wort)`: 8 Hex-Zeichen (FNV-1a 32 Bit über
 * "typoluck|ws|1|" + Wort). Gleich im Werkzeug (Lexikon-Export) und in der
 * App; keine Kollision über die Lösungsliste (Test). Das Wort selbst steht
 * nur im Lexikon (nur Admins).
 *
 * EIN SCHRITT JE BEENDETER RUNDE (Konzept §7.1): der eigene Datensatz
 * `runden/<uid>/<k>` = { r, s, z, l, e: { c, v, g, m, h, d, st, z, f },
 * w: { g, x, v, h, d } } und — solange `l` nicht "-" ist — die drei
 * Summen-Zeilen `summen/<k>/<l>`, `n`, `st` als Server-Zuwachs
 * (`{ ".sv": { increment } }`). Klassen: 1–6 gelöst im n. Versuch, 7 gelöst
 * im 7. oder später, 0 nicht gelöst bei Grenze ≥ 6, 8 nicht gelöst bei
 * Grenze < 6; Vorsilbe a = ohne, b = mit Hilfe (erste Runde), w =
 * Wiederholung (2. bis 4. Runde); ab der 5. Runde `l = "-"`.
 *
 * STUFE (Konzept §8/§9): { wert 0–100 (intern mit Nachkommastellen),
 * unsicher 2–8, runden, stand, tag }. Nach jeder Runde
 * S ← S + a · u · (s − E(S, D)), E = 1 / (1 + exp((D − S) / 10)); a = 1
 * erste Runde ohne Hilfe, 0,5 mit Hilfe, 1/3 Wiederholung, 0,1 ab der 5.
 * Zusammenführen: mehr Runden gewinnt, gleich viele → neuerer Stand.
 *
 * NEUE SCHWIERIGKEIT (Konzept §8, nur Admin): D_daten löst
 * Σ N_k · g_k · (s_k − E(S̄, D)) = 0 (Halbierung auf 0–100), Übergang
 * D = (20 · D_start + m · D_daten) / (20 + m); Korrektur von Hand gewinnt.
 * Daraus die App-Daten in der Form von js/wortbewertung-daten.js.
 */

const WORTSTATISTIK_WB = (typeof WORTBEWERTUNG !== "undefined") ? WORTBEWERTUNG : require("./wortbewertung.js");

const WORTSTATISTIK = {

    SALZ: "typoluck|ws|1|",
    LEISTUNG: { 1: 1, 2: 0.9, 3: 0.75, 4: 0.55, 5: 0.35, 6: 0.2, 7: 0.1, 0: 0, 8: 0.1 },
    GEWICHT: { a: 1, b: 0.5, w: 1 / 3 },
    WIEDERHOLUNG_BIS: 4,
    STUFE_START: 35,
    UNSICHER_START: 8,
    UNSICHER_MIN: 2,
    STARTGEWICHT: 20,
    WARTE_MAX: 300,
    AUFRAEUMEN_MONATE: 12,
    TEILE: ["versuche", "nachbarn", "muster", "doppelt", "umlaut", "selten", "vokale"],

    /* ---------------------------------------------------------------- *
     * Schlüssel, Datum
     * ---------------------------------------------------------------- */

    schluessel(wort) {
        let h = 2166136261;
        for (const z of WORTSTATISTIK.SALZ + String(wort || "").toLowerCase()) {
            h ^= z.codePointAt(0);
            h = Math.imul(h, 16777619) >>> 0;
        }
        return ("0000000" + h.toString(16)).slice(-8);
    },

    /* "2026-09-28" → 20260928 (0 bei Unsinn). */
    tagZahl(datum) {
        const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(datum || ""));
        return m ? Number(m[1] + m[2] + m[3]) : 0;
    },

    /* ---------------------------------------------------------------- *
     * Eine Runde → die Tatsachen
     * ---------------------------------------------------------------- */

    /*
     * Aus einer beendeten WORDLE-Runde: { k, wort, v, g, geloest, klasse,
     * hilfe, m, h, d, f, tag } oder null (läuft noch, kein Wort).
     * `heute` = "JJJJ-MM-TT".
     */
    tatsachen(runde, heute) {
        if (!runde || runde.zustand === "laeuft" || typeof runde.loesung !== "string"
                || !Array.isArray(runde.versuche) || runde.versuche.length === 0 && !runde.zeitUm) {
            return null;
        }
        const geloest = runde.zustand === "gewonnen";
        const v = geloest ? runde.versuche.length : 0;
        const grenze = WORTSTATISTIK._grenze(runde);
        const hilfen = (Array.isArray(runde.tipps) ? runde.tipps.length : 0)
            + (Array.isArray(runde.tinte) ? runde.tinte.length : 0) + (runde.extra === 1 ? 1 : 0);
        const ziel = Array.from(runde.loesung);
        const f = runde.versuche.slice(0, 20).map((wort) =>
            String(Array.from(wort).filter((b, i) => b === ziel[i]).length)).join("");
        const dauer = (runde.beendetAm > runde.begonnenAm && runde.begonnenAm > 0)
            ? Math.min(3600, Math.round((runde.beendetAm - runde.begonnenAm) / 1000)) : 0;
        return {
            k: WORTSTATISTIK.schluessel(runde.loesung),
            wort: runde.loesung,
            geloest: geloest,
            v: v,
            g: grenze,
            klasse: WORTSTATISTIK.klasse(geloest, v, grenze),
            hilfe: hilfen > 0,
            m: runde.modus === "tag" ? "t" : (runde.modus === "bibliothek" ? "b" : "u"),
            h: Math.min(9, hilfen),
            d: dauer,
            f: f,
            tag: WORTSTATISTIK.tagZahl(heute)
        };
    },

    _grenze(runde) {
        const grund = (runde.regeln && Number.isInteger(runde.regeln.versuche)) ? runde.regeln.versuche
            : (Number.isInteger(runde.grund) ? runde.grund : 6);
        return Math.max(1, Math.min(20, grund + (runde.extra === 1 ? 1 : 0)));
    },

    /* Die Ergebnis-Klasse 0–8 (Konzept §7.1). */
    klasse(geloest, v, grenze) {
        if (geloest) {
            return v >= 7 ? 7 : Math.max(1, v);
        }
        return grenze < 6 ? 8 : 0;
    },

    /* ---------------------------------------------------------------- *
     * Der Datensatz und der Schritt
     * ---------------------------------------------------------------- */

    /*
     * Der neue Datensatz zu `alt` (null = erste Runde) und den Tatsachen
     * `t`; `stufe` = ganze Zahl 0–100 dieser Runde.
     */
    datensatz(alt, t, stufe) {
        const s = Math.max(0, Math.min(100, Math.round(stufe)));
        if (!alt || !Number.isInteger(alt.r) || alt.r < 1) {
            const c = (t.hilfe ? "b" : "a") + t.klasse;
            return {
                r: 1, s: s, z: t.tag, l: c,
                e: { c: c, v: t.v, g: t.g, m: t.m, h: t.h, d: t.d, st: s, z: t.tag, f: t.f || "0" },
                w: { g: 0, x: 0, v: 0, h: 0, d: 0 }
            };
        }
        const r = alt.r + 1;
        const w = Object.assign({ g: 0, x: 0, v: 0, h: 0, d: 0 }, alt.w || {});
        return {
            r: r, s: s, z: t.tag,
            l: r <= WORTSTATISTIK.WIEDERHOLUNG_BIS ? "w" + t.klasse : "-",
            e: JSON.parse(JSON.stringify(alt.e)),
            w: { g: w.g + (t.geloest ? 1 : 0), x: w.x + (t.geloest ? 0 : 1), v: w.v + t.v,
                h: w.h + (t.hilfe ? 1 : 0), d: w.d + t.d }
        };
    },

    /* Der Mehrpfad-Schritt auf `typoluck-intern` (Konzept §7.3). */
    schritt(uid, k, datensatz) {
        const aenderungen = {};
        aenderungen["runden/" + uid + "/" + k] = datensatz;
        if (datensatz.l !== "-") {
            aenderungen["summen/" + k + "/" + datensatz.l] = { ".sv": { increment: 1 } };
            aenderungen["summen/" + k + "/n"] = { ".sv": { increment: 1 } };
            aenderungen["summen/" + k + "/st"] = { ".sv": { increment: datensatz.s } };
        }
        return aenderungen;
    },

    /* Die Warteschlange: je Wort die neuesten Tatsachen, höchstens
       WARTE_MAX Wörter (älteste fallen weg). Rein. */
    warteAufnehmen(liste, t) {
        const alt = Array.isArray(liste) ? liste.filter((e) => e && e.k !== t.k) : [];
        return alt.concat([t]).slice(-WORTSTATISTIK.WARTE_MAX);
    },

    /* ---------------------------------------------------------------- *
     * Die Spieler-Stufe
     * ---------------------------------------------------------------- */

    stufeLeer() {
        return { wert: WORTSTATISTIK.STUFE_START, unsicher: WORTSTATISTIK.UNSICHER_START, runden: 0, stand: 0, tag: 0 };
    },

    stufeNormalisieren(roh) {
        const l = WORTSTATISTIK.stufeLeer();
        if (!roh || typeof roh !== "object") {
            return l;
        }
        const zahl = (w, von, bis, vor) => (typeof w === "number" && isFinite(w)) ? Math.max(von, Math.min(bis, w)) : vor;
        return {
            wert: zahl(roh.wert, 0, 100, l.wert),
            unsicher: zahl(roh.unsicher, 0, 50, l.unsicher),
            runden: Math.floor(zahl(roh.runden, 0, 10000000, 0)),
            stand: zahl(roh.stand, 0, Number.MAX_SAFE_INTEGER, 0),
            tag: Math.floor(zahl(roh.tag, 0, 99991231, 0))
        };
    },

    erwartung(S, D) {
        return 1 / (1 + Math.exp((D - S) / 10));
    },

    /* Die Stufe nach einer Runde: `r` = Runden mit diesem Wort NACH dieser
       (1 = erste). `D` = Schwierigkeit des Wortes, `zeitpunkt` ms. */
    stufeNach(stufe, t, r, D, zeitpunkt) {
        const alt = WORTSTATISTIK.stufeNormalisieren(stufe);
        let u = alt.unsicher;
        if (alt.tag && t.tag) {
            const tage = Math.floor(WORTSTATISTIK._tageZwischen(alt.tag, t.tag) / 7);
            u = Math.min(WORTSTATISTIK.UNSICHER_START, u + Math.max(0, tage));
        }
        const a = r <= 1 ? (t.hilfe ? WORTSTATISTIK.GEWICHT.b : WORTSTATISTIK.GEWICHT.a)
            : (r <= WORTSTATISTIK.WIEDERHOLUNG_BIS ? WORTSTATISTIK.GEWICHT.w : 0.1);
        const d = (typeof D === "number" && isFinite(D)) ? D : WORTSTATISTIK.STUFE_START;
        const s = WORTSTATISTIK.LEISTUNG[t.klasse] || 0;
        const wert = Math.max(0, Math.min(100, alt.wert + a * u * (s - WORTSTATISTIK.erwartung(alt.wert, d))));
        return { wert: wert, unsicher: Math.max(WORTSTATISTIK.UNSICHER_MIN, 0.95 * u), runden: alt.runden + 1,
            stand: Math.max(alt.stand + 1, zeitpunkt || 0), tag: t.tag || alt.tag };
    },

    _tageZwischen(a, b) {
        const d = (z) => Date.UTC(Math.floor(z / 10000), Math.floor(z / 100) % 100 - 1, z % 100);
        return Math.round((d(b) - d(a)) / 86400000);
    },

    /* Gerät ↔ Konto: mehr Runden gewinnt; gleich viele → neuerer Stand. */
    stufeZusammen(a, b) {
        const x = WORTSTATISTIK.stufeNormalisieren(a);
        const y = WORTSTATISTIK.stufeNormalisieren(b);
        if (x.runden !== y.runden) {
            return x.runden > y.runden ? x : y;
        }
        return x.stand >= y.stand ? x : y;
    },

    /* Für das Konto (Regel §12: wert, unsicher, runden, stand). */
    stufeFuerKonto(stufe) {
        const s = WORTSTATISTIK.stufeNormalisieren(stufe);
        return { wert: Math.round(s.wert * 10) / 10, unsicher: Math.round(s.unsicher * 100) / 100,
            runden: s.runden, stand: Math.round(s.stand) };
    },

    /* ---------------------------------------------------------------- *
     * Das Lexikon
     * ---------------------------------------------------------------- */

    /* Aus der vollen Bewertung (Werkzeug) + Korrektur die Datei
       `lexikon-export.json`: { anzahl, pruefsumme, eintraege: { <k>: … } }. */
    lexikonExport(voll, korrektur, loesungen) {
        const eintraege = {};
        const spalten = voll.spalten || ["zahl", "versuche", "nachbarn", "muster", "doppelt", "umlaut", "selten", "vokale"];
        for (const wort of loesungen) {
            const werte = voll.woerter[wort];
            if (!werte) {
                continue;
            }
            const z = Math.max(0, Math.min(100, Math.round(werte[0])));
            const e = { w: wort, z: z, s: z >= voll.stufen[1] ? 3 : (z >= voll.stufen[0] ? 2 : 1),
                k: 1 + (voll.skala || []).filter((g) => z >= g).length, teile: {} };
            spalten.slice(1).forEach((name, i) => {
                const wert = werte[i + 1];
                if (typeof wert === "number" && isFinite(wert) && /^[a-z]{1,16}$/.test(name)) {
                    e.teile[name] = Math.round(wert * 1000) / 1000;
                }
            });
            const k = (korrektur || {})[wort] || {};
            if (Number.isInteger(k.zahl) && k.zahl >= 0 && k.zahl <= 100) {
                e.korrektur = k.zahl;
            }
            if (k.ungeeignet === true) {
                e.ungeeignet = true;
            }
            eintraege[WORTSTATISTIK.schluessel(wort)] = e;
        }
        return { anzahl: Object.keys(eintraege).length, pruefsumme: WORTSTATISTIK_WB.pruefsumme(loesungen),
            eintraege: eintraege };
    },

    /* Eine eingelesene Export-Datei prüfen: { ok, eintraege, fehler }. Nur
       Einträge in der Form der Regel (8 Hex, w 5 Zeichen, z 0–100 …). */
    lexikonPruefen(roh) {
        if (!roh || typeof roh !== "object" || !roh.eintraege || typeof roh.eintraege !== "object") {
            return { ok: false, fehler: "keine Lexikon-Datei", eintraege: {} };
        }
        const sauber = {};
        let schlecht = 0;
        for (const k of Object.keys(roh.eintraege)) {
            const e = roh.eintraege[k];
            const zahl = (w, von, bis) => typeof w === "number" && isFinite(w) && w >= von && w <= bis;
            if (!/^[0-9a-f]{8}$/.test(k) || !e || typeof e.w !== "string" || Array.from(e.w).length !== 5
                    || e.w.length !== 5 || !zahl(e.z, 0, 100) || WORTSTATISTIK.schluessel(e.w) !== k) {
                schlecht++;
                continue;
            }
            const aus = { w: e.w, z: e.z };
            if (zahl(e.s, 1, 3)) {
                aus.s = e.s;
            }
            if (zahl(e.k, 1, 10)) {
                aus.k = e.k;
            }
            if (zahl(e.korrektur, 0, 100)) {
                aus.korrektur = e.korrektur;
            }
            if (e.ungeeignet === true) {
                aus.ungeeignet = true;
            }
            if (e.teile && typeof e.teile === "object") {
                const t = {};
                for (const name of Object.keys(e.teile)) {
                    if (/^[a-z]{1,16}$/.test(name) && typeof e.teile[name] === "number" && isFinite(e.teile[name])) {
                        t[name] = e.teile[name];
                    }
                }
                if (Object.keys(t).length) {
                    aus.teile = t;
                }
            }
            sauber[k] = aus;
        }
        const anzahl = Object.keys(sauber).length;
        return { ok: anzahl > 0, eintraege: sauber, schlecht: schlecht,
            fehler: anzahl > 0 ? "" : "keine gültigen Einträge" };
    },

    /* Das Lexikon aus der Datenbank in der Form der Werkzeug-Bewertung
       (`voll.woerter[wort] = [zahl, versuche, nachbarn, muster, doppelt,
       umlaut, selten, vokale]`) — für die Lexikon-Ansicht der Verwaltung. */
    lexikonAlsVoll(lexikon) {
        const woerter = {};
        for (const k of Object.keys(lexikon || {})) {
            const e = lexikon[k];
            if (!e || typeof e.w !== "string") {
                continue;
            }
            const t = e.teile || {};
            woerter[e.w] = [e.z].concat(WORTSTATISTIK.TEILE.map((n) => (typeof t[n] === "number" ? t[n] : 0)));
        }
        return { woerter: woerter };
    },

    /* Die Schreib-Schritte fürs Einspielen: je `groesse` Einträge einer. */
    lexikonSchritte(eintraege, groesse) {
        const schluessel = Object.keys(eintraege || {}).sort();
        const schritte = [];
        const n = groesse || 150;
        for (let i = 0; i < schluessel.length; i += n) {
            const schritt = {};
            for (const k of schluessel.slice(i, i + n)) {
                schritt["lexikon/" + k] = eintraege[k];
            }
            schritte.push(schritt);
        }
        return schritte;
    },

    /* ---------------------------------------------------------------- *
     * Die neue Schwierigkeit (Admin)
     * ---------------------------------------------------------------- */

    /* D aus den Summen eines Wortes (null ohne Daten) und m. */
    ausSummen(summe) {
        const z = summe || {};
        const n = typeof z.n === "number" ? z.n : 0;
        if (n < 1) {
            return { d: null, m: 0 };
        }
        const sMittel = (typeof z.st === "number" ? z.st : 0) / n;
        const zeilen = [];
        let m = 0;
        for (const art of ["a", "b", "w"]) {
            for (let k = 0; k <= 8; k++) {
                const anzahl = typeof z[art + k] === "number" ? z[art + k] : 0;
                if (anzahl > 0) {
                    const g = WORTSTATISTIK.GEWICHT[art];
                    zeilen.push({ gewicht: anzahl * g, leistung: WORTSTATISTIK.LEISTUNG[k] });
                    m += anzahl * g;
                }
            }
        }
        if (!zeilen.length) {
            return { d: null, m: 0 };
        }
        const f = (D) => zeilen.reduce((summe, zl) => summe + zl.gewicht * (zl.leistung
            - WORTSTATISTIK.erwartung(sMittel, D)), 0);
        /* f fällt in D (schwerer → Erwartung kleiner → f grösser)? E sinkt
           mit D, also steigt f mit D. Halbierung auf 0–100. */
        let von = 0;
        let bis = 100;
        if (f(von) >= 0) {
            return { d: 0, m: m };
        }
        if (f(bis) <= 0) {
            return { d: 100, m: m };
        }
        for (let i = 0; i < 40; i++) {
            const mitte = (von + bis) / 2;
            if (f(mitte) < 0) {
                von = mitte;
            } else {
                bis = mitte;
            }
        }
        return { d: (von + bis) / 2, m: m };
    },

    /* Übergang Start → Daten; Korrektur gewinnt. */
    neuesD(eintrag, summe) {
        if (eintrag && typeof eintrag.korrektur === "number") {
            return eintrag.korrektur;
        }
        const start = eintrag && typeof eintrag.z === "number" ? eintrag.z : WORTSTATISTIK.STUFE_START;
        const daten = WORTSTATISTIK.ausSummen(summe);
        if (daten.d === null) {
            return start;
        }
        const g = WORTSTATISTIK.STARTGEWICHT;
        return (g * start + daten.m * daten.d) / (g + daten.m);
    },

    /* Die App-Daten (Form von js/wortbewertung-daten.js) für die
       Lösungsliste: je Wort die neue Zahl, Drittel- und Zehntel-Grenzen,
       verschleiert. `lexikon` und `summen` nach Schlüssel. */
    appDaten(lexikon, summen, loesungen, zeitpunkt) {
        const zahlen = loesungen.map((wort) => {
            const k = WORTSTATISTIK.schluessel(wort);
            const e = (lexikon || {})[k];
            const alt = WORTSTATISTIK_WB.schwierigkeit(wort);
            const basis = e || (Number.isInteger(alt) ? { z: alt } : null);
            return Math.round(WORTSTATISTIK.neuesD(basis, (summen || {})[k]));
        });
        const sortiert = zahlen.slice().sort((a, b) => a - b);
        const bei = (anteil) => sortiert[Math.min(sortiert.length - 1, Math.floor(anteil * sortiert.length))];
        return {
            anzahl: loesungen.length,
            pruefsumme: WORTSTATISTIK_WB.pruefsumme(loesungen),
            stufenAb: [bei(1 / 3), bei(2 / 3)],
            skalaAb: [1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => bei(i / 10)),
            kodiert: WORTSTATISTIK_WB.verschleiern(zahlen, loesungen),
            stand: zeitpunkt || 0
        };
    },

    /* Passt eine gelesene Schwierigkeit zur Lösungsliste? */
    schwierigkeitPasst(daten, loesungen) {
        return !!daten && typeof daten.kodiert === "string" && daten.anzahl === loesungen.length
            && daten.pruefsumme === WORTSTATISTIK_WB.pruefsumme(loesungen)
            && Array.isArray(daten.stufenAb) && daten.stufenAb.length === 2;
    },

    /* ---------------------------------------------------------------- *
     * Aufräumen und Detail-Ansicht (Admin)
     * ---------------------------------------------------------------- */

    /* Welche Datensätze eines Spielers älter als 12 Monate sind (am Tag
       `heute`, JJJJMMTT): die Lösch-Pfade relativ zu typoluck-intern. */
    aufraeumen(uid, runden, heute) {
        const grenze = heute - 10000 * Math.floor(WORTSTATISTIK.AUFRAEUMEN_MONATE / 12)
            - 100 * (WORTSTATISTIK.AUFRAEUMEN_MONATE % 12);
        const weg = {};
        for (const k of Object.keys(runden || {})) {
            const z = runden[k] && runden[k].z;
            if (typeof z === "number" && z < grenze) {
                weg["runden/" + uid + "/" + k] = null;
            }
        }
        return weg;
    },

    /* Die Detail-Ansicht eines Spielers: je Wort und Summen. `woerter` =
       { <k>: wort } (aus dem Lexikon). */
    detail(runden, woerter) {
        const zeilen = [];
        let erste = 0;
        let geloest = 0;
        let versuche = 0;
        let dauer = 0;
        let hilfe = 0;
        for (const k of Object.keys(runden || {})) {
            const d = runden[k];
            if (!d || !d.e) {
                continue;
            }
            erste++;
            const ok = d.e.v > 0;
            geloest += ok ? 1 : 0;
            versuche += ok ? d.e.v : 0;
            dauer += d.e.d || 0;
            hilfe += d.e.h > 0 ? 1 : 0;
            zeilen.push({ k: k, wort: (woerter || {})[k] || k, r: d.r, v: d.e.v, g: d.e.g, m: d.e.m, h: d.e.h,
                d: d.e.d, f: d.e.f || "", z: d.z, wg: (d.w && d.w.g) || 0, wx: (d.w && d.w.x) || 0 });
        }
        zeilen.sort((a, b) => b.z - a.z || a.wort.localeCompare(b.wort, "de"));
        return {
            zeilen: zeilen,
            summen: {
                woerter: erste,
                quote: erste ? Math.round(100 * geloest / erste) : 0,
                versuche: geloest ? Math.round(10 * versuche / geloest) / 10 : 0,
                dauer: erste ? Math.round(dauer / erste) : 0,
                hilfe: erste ? Math.round(100 * hilfe / erste) : 0
            }
        };
    }
};

if (typeof module !== "undefined" && module.exports) {
    module.exports = WORTSTATISTIK;
}
