/*
 * wer-spielt.js — „wer spielt“ steht fest, bevor das Spiel bedienbar ist: den EIGENEN Eintrag früh holen.
 * Gemeinsamer Baustein: in die Apps KOPIEREN, nie abwandeln (Liste: BAUSTEINE.json).
 * Neu seit 04.10.2026 (Runde 10, Teil 3; Nutzer: „Das laden können wir ja schon beginnen beim UPcrew intro?“).
 * Einbau in die Spiele: EINBAU-INTRO-WER-SPIELT.md.
 *
 * WAS ES TUT (sofort beim Start, noch vor APP.starten, während das Intro läuft):
 *   (a) Auf dem Gerät ist niemand gemerkt (oder nur eine Gast-Sitzung)  → sofort „gast“, kein Abruf.
 *   (b) Ein Konto ist gemerkt → NUR dessen eigener Eintrag (`konten/<uid>`: Konto, Fortschritt, Besitz — nicht die
 *       Spielerliste) über die Lese-Funktion des Spiels holen, mit dem Gerät VEREINIGEN (FORTSCHRITT.zusammenfuehren,
 *       UPCREW_BESITZ.zusammenfuehren — nichts nachgebaut) und das Ergebnis aufs Gerät legen → „konto“.
 *   (c) Fehler, kein Eintrag, fremder Eintrag — oder die Frist des Intros läuft ab → „geraet“: dasselbe Konto mit
 *       dem Stand dieses Geräts. Ein Abruf, der noch läuft, darf im Hintergrund fertig werden (dann wie (b)).
 *   Ein gemerktes Konto ist NIE „gast“ — auch ohne Netz nicht.
 *
 * DIE DATENBANK SPRICHT DIESE DATEI NIE AN. Das Spiel reicht `holen(uid)` herein (z. B. über seine Konten-
 * Rückwand); die Tests geben eine Attrappe mit Zähler. Kein DOM, kein Bildschirm.
 *
 * KEIN DOPPELTES LADEN — UND NIE EIN ALTER STAND (Fassung nach der Gegenprüfung 04.10.2026): Der Merker bedient
 * GENAU EINEN Leser: das ERSTE `laden()` der Konten-Rückwand beim Start (kern\speicher-konten.js), und dort nur
 * `konten/<eigene uid>`. Läuft der frühe Abruf noch, wartet dieses Laden auf DENSELBEN Abruf (`uebernehmen`),
 * statt ein zweites Mal zu holen. Danach ist der Merker weg — ebenso bei JEDEM Schreiben über die Rückwand
 * (`verwerfen`), beim Abmelden (`vergessen`) und nach VORAB_GUELTIG_MS (gemessen mit einer Uhr, die nie
 * rückwärts läuft). Lese-Wege, die bewusst frisch holen (`teilLaden`, das Laden vor dem Schreiben), sieht er nie.
 *
 * Nutzung:
 *     const wer = UPCREW_WER_SPIELT.starten({
 *         wer:   { id: "<spieler-id>" | null, uid: "<konto-uid>" | null, gast: true | false },  // vom Gerät
 *         holen: (uid) => Promise<roher Eintrag konten/<uid> oder null>,  // fehlt → kein Abruf, Fall (c)
 *         // freiwillig: fortschritt (Standard FORTSCHRITT), besitz (Standard UPCREW_BESITZ),
 *         //             speicher (Standard localStorage), jetzt (Uhr, Standard monoton), geraetSchreiben (true),
 *         //             leerlauf (Standard requestIdleCallback, höchstens LEERLAUF_MS — das Intro bleibt flüssig)
 *     });                                       // → Promise<Ergebnis>, wird nie abgelehnt, löst höchstens einmal
 *     UPCREW_INTRO.zeigen(behaelter, { …, werSpielt: wer });   // das Intro wartet darauf, mit Frist
 *     UPCREW_WER_SPIELT.stand()                 // → das Ergebnis JETZT (läuft der Abruf noch: „geraet“, Frist)
 *     UPCREW_WER_SPIELT.abwarten(ms)            // → Promise<Ergebnis> nach Abruf oder spätestens ms (ohne Intro)
 *     UPCREW_WER_SPIELT.uebernehmen(pfad, uid)  // → Promise<{ wert } | null>, EINMAL, nur für die Rückwand
 *     UPCREW_WER_SPIELT.verwerfen()             // der Merker taugt nicht mehr (geschrieben, erstes Laden vorbei)
 *     UPCREW_WER_SPIELT.vergessen()             // Abmelden / Kontowechsel: alles weg, ein laufender Abruf schreibt nichts
 *
 * Ergebnis: { art: "gast" | "konto" | "geraet", person: "<spieler-id>" | "gast", uid, geladen: true | false,
 *             aufGeraet: true | false, grund: "" | "laeuft" | "fehler" | "kein-eintrag" | "fremd" | "ohne-zugriff"
 *             | "vergessen" | "speicher", fortschritt, besitz, eintrag (roh vom Server oder null), zeit,
 *             spaeter (Promise, nur bei „laeuft“) }
 *   `person` ist der Schlüssel, unter dem das Spiel Fortschritt und Besitz dieser Person auf dem Gerät führt
 *   (`upcrew.fortschritt`, `upcrew.besitz`). `aufGeraet: false` bei „konto“ (grund „speicher“): geladen und
 *   vereinigt, aber der Gerätespeicher nahm es nicht (voll, gesperrt) — der Stand steht nur im Ergebnis.
 */
(function () {
    "use strict";

    const GAST = "gast";
    const SCHLUESSEL_FORTSCHRITT = "upcrew.fortschritt";
    const SCHLUESSEL_BESITZ = "upcrew.besitz";

    /* So lange darf das erste Laden der Rückwand den früh geholten Eintrag nehmen. Es startet in beiden Spielen
       gleich beim Start (spätestens nach dem Intro) — eine Minute ist reichlich. */
    const VORAB_GUELTIG_MS = 60000;

    /* Leerlauf: spätestens nach so vielen ms wird trotzdem gerechnet (ein Gerät ohne Leerlauf darf nicht hängen). */
    const LEERLAUF_MS = 300;
    function leerlaufStandard() {
        return new Promise((weiter) => {
            if (typeof requestIdleCallback === "function") {
                requestIdleCallback(() => weiter(), { timeout: LEERLAUF_MS });
            } else {
                setTimeout(weiter, 0);
            }
        });
    }

    /* Eine Uhr, die nie rückwärts läuft (performance.now; sonst Date.now, aber nie kleiner als zuletzt) — eine
       zurückgestellte Geräte-Uhr hält den Merker so nicht ewig frisch. */
    let uhrZuletzt = 0;
    function monoton() {
        let jetzt;
        try {
            jetzt = (typeof performance !== "undefined" && performance && typeof performance.now === "function")
                ? performance.now() : Date.now();
        } catch (fehler) {
            jetzt = Date.now();
        }
        uhrZuletzt = Math.max(uhrZuletzt, jetzt);
        return uhrZuletzt;
    }

    let lauf = null;        /* der eine laufende/fertige Lauf; vergessen() setzt ihn ab */

    const istObjekt = (w) => !!w && typeof w === "object" && !Array.isArray(w);
    const kopie = (w) => (w === undefined ? null : JSON.parse(JSON.stringify(w)));

    /* Die Glieder des Spiels zur Laufzeit beim Namen (kein `Function`/`eval` — die CSP von Blunderluck verbietet es). */
    function teile(opt) {
        return {
            fortschritt: opt.fortschritt || (typeof FORTSCHRITT !== "undefined" ? FORTSCHRITT : null),
            besitz: opt.besitz || (typeof UPCREW_BESITZ !== "undefined" ? UPCREW_BESITZ : null),
            speicher: opt.speicher || (function () {
                try { return typeof localStorage !== "undefined" ? localStorage : null; } catch (f) { return null; }
            })(),
            jetzt: typeof opt.jetzt === "function" ? opt.jetzt : monoton
        };
    }

    function alleLesen(speicher, schluessel) {
        try {
            const roh = speicher ? JSON.parse(speicher.getItem(schluessel) || "null") : null;
            return istObjekt(roh) ? roh : {};
        } catch (fehler) {
            return {};
        }
    }

    /* Wer ist auf dem Gerät gemerkt? → { person, uid } */
    function wer(roh) {
        const w = istObjekt(roh) ? roh : {};
        const id = (typeof w.id === "string" && w.id !== "") ? w.id : null;
        const uid = (typeof w.uid === "string" && w.uid !== "") ? w.uid : null;
        if (!id || w.gast === true || id === GAST) {
            return { person: GAST, uid: null };
        }
        return { person: id, uid: uid };
    }

    /* Ist der Eintrag vom Server wirklich der eigene? Spieler-Id muss stimmen (ein Eintrag ohne Id ist kein
       Beweis), eine mitgelieferte Konto-Nummer ebenso. */
    function eigener(roh, w) {
        return istObjekt(roh) && roh.id === w.person && (roh.uid === undefined || roh.uid === w.uid);
    }

    /* Der Stand dieser Person auf dem Gerät — Fortschritt und Besitz (beides frisch gelesen). */
    function geraetStand(t, person) {
        const f = alleLesen(t.speicher, SCHLUESSEL_FORTSCHRITT)[person];
        const b = alleLesen(t.speicher, SCHLUESSEL_BESITZ)[person];
        let fortschritt = f || null, besitz = istObjekt(b) ? b : {};
        try {
            fortschritt = t.fortschritt ? t.fortschritt.zusammenfuehren(f || null, null) : fortschritt;
        } catch (fehler) { /* roh lassen — das Spiel prüft beim Lesen ohnehin */ }
        try {
            besitz = t.besitz ? t.besitz.lesen(b) : besitz;
        } catch (fehler) { /* dto. */ }
        return { fortschritt: fortschritt, besitz: besitz };
    }

    function ergebnis(art, w, t, mehr) {
        const g = geraetStand(t, w.person);
        return Object.assign({ art: art, person: w.person, uid: w.uid, geladen: false, aufGeraet: true, grund: "",
            fortschritt: g.fortschritt, besitz: g.besitz, eintrag: null, zeit: Date.now() }, mehr || {});
    }

    /* Den Eintrag vom Konto mit dem Gerät vereinigen und (freiwillig) aufs Gerät legen — frisch gelesen, fremde
       Personen bleiben unberührt (wie `_lokalSchreiben` / `_geraetSchreiben` der Spiele). `geschrieben` = alles,
       was zu schreiben war, liegt auf dem Gerät. */
    function vereinigen(t, person, eintrag, schreiben) {
        const alleF = alleLesen(t.speicher, SCHLUESSEL_FORTSCHRITT);
        const alleB = alleLesen(t.speicher, SCHLUESSEL_BESITZ);
        const fortschritt = t.fortschritt
            ? t.fortschritt.zusammenfuehren(alleF[person] || null, eintrag.fortschritt || null)
            : (alleF[person] || eintrag.fortschritt || null);
        const besitz = t.besitz ? t.besitz.zusammenfuehren(alleB[person], eintrag.besitz) : (alleB[person] || {});
        let geschrieben = true;
        if (schreiben) {
            try {
                if (!t.speicher) {
                    throw new Error("kein Speicher");
                }
                if (fortschritt) {
                    alleF[person] = fortschritt;
                    t.speicher.setItem(SCHLUESSEL_FORTSCHRITT, JSON.stringify(alleF));
                }
                if (t.besitz && Object.keys(besitz).length > 0) {
                    alleB[person] = besitz;
                    t.speicher.setItem(SCHLUESSEL_BESITZ, JSON.stringify(alleB));
                }
            } catch (fehler) {
                /* privates Fenster, voller Speicher: der Stand steht nur im Ergebnis */
                geschrieben = false;
            }
        }
        return { fortschritt: fortschritt, besitz: besitz, geschrieben: geschrieben };
    }

    function starten(optionen) {
        const opt = optionen || {};
        let t, w;
        try {
            t = teile(opt);
            w = wer(opt.wer);
        } catch (fehler) {
            t = { fortschritt: null, besitz: null, speicher: null, jetzt: monoton };
            w = { person: GAST, uid: null };
        }
        const schluessel = w.person + "|" + (w.uid || "");
        /* Zweiter Aufruf für dieselbe Person: kein zweiter Abruf. */
        if (lauf && lauf.schluessel === schluessel) {
            return lauf.versprechen;
        }
        const neu = { schluessel: schluessel, versprechen: null, ergebnis: null, roh: null, rohUm: 0,
            uebernommen: false, verworfen: false, t: t, w: w };
        lauf = neu;
        const aktuell = () => lauf === neu;

        const fertig = (e) => {
            if (!neu.ergebnis) {
                neu.ergebnis = e;
            }
            return neu.ergebnis;
        };

        if (w.person === GAST) {
            neu.versprechen = Promise.resolve(fertig(ergebnis("gast", w, t)));
            return neu.versprechen;
        }
        if (!w.uid || typeof opt.holen !== "function") {
            neu.versprechen = Promise.resolve(fertig(ergebnis("geraet", w, t, { grund: "ohne-zugriff" })));
            return neu.versprechen;
        }

        let abruf;
        try {
            abruf = Promise.resolve(opt.holen(w.uid));
        } catch (fehler) {
            abruf = Promise.reject(fehler);
        }
        /* Die rohe Antwort — auf sie wartet auch das erste Laden der Rückwand (`uebernehmen`). */
        neu.roh = abruf.then((roh) => {
            neu.rohUm = t.jetzt();
            return { ok: true, roh: roh };
        }, () => ({ ok: false }));

        /* Das Vereinigen (Rechnen + Gerätespeicher) läuft in Leerlauf-Zeit, nicht mitten in einem Bild des
           Intros (Nutzer 04.10.2026, 13:50 Uhr: „die animation soll flüssig laufen“). */
        const leerlauf = typeof opt.leerlauf === "function" ? opt.leerlauf : leerlaufStandard;
        neu.versprechen = neu.roh.then((a) => leerlauf().then(() => a)).then((a) => {
            /* Abgemeldet / anderes Konto, während geladen wurde: nichts aufs Gerät, nichts merken. */
            if (!aktuell()) {
                return fertig(ergebnis("geraet", w, t, { grund: "vergessen" }));
            }
            if (!a.ok) {
                return fertig(ergebnis("geraet", w, t, { grund: "fehler" }));
            }
            if (!istObjekt(a.roh)) {
                return fertig(ergebnis("geraet", w, t, { grund: "kein-eintrag" }));
            }
            if (!eigener(a.roh, w)) {
                return fertig(ergebnis("geraet", w, t, { grund: "fremd" }));
            }
            const v = vereinigen(t, w.person, a.roh, opt.geraetSchreiben !== false);
            return fertig({ art: "konto", person: w.person, uid: w.uid, geladen: true, aufGeraet: v.geschrieben,
                grund: v.geschrieben ? "" : "speicher", fortschritt: v.fortschritt, besitz: v.besitz,
                eintrag: kopie(a.roh), zeit: Date.now() });
        }).catch(() => fertig(ergebnis("geraet", w, t, { grund: "fehler" })));
        return neu.versprechen;
    }

    /* Das Ergebnis JETZT. Läuft der Abruf noch: dasselbe Konto mit dem Geräte-Stand (Fall c), `spaeter` liefert
       das endgültige Ergebnis, sobald der Abruf fertig ist. Ohne `starten`: null. */
    function stand() {
        if (!lauf) {
            return null;
        }
        if (lauf.ergebnis) {
            return lauf.ergebnis;
        }
        return Object.assign(ergebnis("geraet", lauf.w, lauf.t, { grund: "laeuft" }), { spaeter: lauf.versprechen });
    }

    /* Ohne Intro (es kommt nicht bei jedem Start): auf den Abruf warten, höchstens `ms`. */
    function abwarten(ms) {
        if (!lauf) {
            return Promise.resolve(null);
        }
        return new Promise((fertig) => {
            const uhr = setTimeout(() => fertig(stand()), Math.max(0, Number(ms) || 0));
            lauf.versprechen.then(() => {
                clearTimeout(uhr);
                fertig(stand());
            });
        });
    }

    /*
     * Für das ERSTE Laden der Konten-Rückwand: `konten/<uid>` aus dem frühen Abruf — EINMAL. Läuft er noch, wird
     * auf ihn gewartet (kein zweiter Abruf). null = selbst holen: kein Lauf, andere Konto-Nummer, anderer Pfad,
     * schon übernommen, verworfen (geschrieben), vergessen, Abruf gescheitert, fremder Eintrag, zu alt.
     */
    function uebernehmen(unterpfad, uid) {
        const l = lauf;
        const pfad = typeof unterpfad === "string" ? unterpfad.replace(/^\/+|\/+$/g, "") : "";
        if (!l || !l.roh || l.uebernommen || l.verworfen || !uid || l.w.uid !== uid || pfad !== "konten/" + uid) {
            return Promise.resolve(null);
        }
        l.uebernommen = true;
        return l.roh.then((a) => {
            if (lauf !== l || l.verworfen || !a.ok || l.t.jetzt() - l.rohUm > VORAB_GUELTIG_MS) {
                return null;
            }
            if (a.roh === null || a.roh === undefined) {
                return { wert: null };
            }
            return eigener(a.roh, l.w) ? { wert: kopie(a.roh) } : null;
        }, () => null);
    }

    /* Der Merker taugt nicht mehr für die Rückwand (es wurde geschrieben, oder das erste Laden ist vorbei).
       Das Ergebnis für `stand()` bleibt. */
    function verwerfen() {
        if (lauf) {
            lauf.verworfen = true;
        }
    }

    /* Abmelden / Kontowechsel: alles weg; ein noch laufender Abruf schreibt danach nichts mehr aufs Gerät. */
    function vergessen() {
        if (lauf) {
            lauf.verworfen = true;
        }
        lauf = null;
    }

    const UPCREW_WER_SPIELT = { starten, stand, abwarten, uebernehmen, verwerfen, vergessen, GAST,
        SCHLUESSEL_FORTSCHRITT, SCHLUESSEL_BESITZ, VORAB_GUELTIG_MS };

    if (typeof window !== "undefined") {
        window.UPCREW_WER_SPIELT = UPCREW_WER_SPIELT;
    }
    if (typeof globalThis !== "undefined") {
        globalThis.UPCREW_WER_SPIELT = UPCREW_WER_SPIELT;
    }
    if (typeof module !== "undefined" && module.exports) {
        module.exports = UPCREW_WER_SPIELT;
    }
})();
