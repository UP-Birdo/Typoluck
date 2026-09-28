/*
 * bildschirm-verwaltung.js — „Verwaltung" für Admins (seit 0.16.3).
 *
 * Nutzer 27.09.2026: „der Admin soll in Typoluck das Lexikon sehen mit den
 * Wörtern, und in beiden generell eine Spielerliste mit Statistiken und co —
 * aber nur der Admin-Account".
 *
 * NUR IN DEN EINSTELLUNGEN (seit 0.17.1, Nutzer 27.09.2026: „der verwalten
 * tab sollte aber nur in den einstellungen der beiden spiele liegen und
 * nicht doppelt irgendwo"; wie Blunderluck js\einstellungen.js): Der
 * Bildschirm steht NICHT im Menü und NICHT in der Leiste (`imMenue: false`,
 * nicht in NAVIGATION.LEISTE, nicht wischbar); der einzige Weg ist der Knopf
 * „Verwaltung" in der Karte „UPCrew-Konto" der Einstellungen
 * (EINSTELLUNGEN_BILDSCHIRM._kontoBauen), und der steht nur da, wenn
 * `erlaubt()`. Bis 0.16.3 stand er im Menü hinter den drei Balken.
 *
 * NUR FÜR ADMINS (KONTO.istAdmin: UP#Plus oder Rolle „admin"): Der Knopf
 * erscheint nur für sie, und der Bildschirm
 * prüft beim Zeichnen selbst noch einmal — wer anders hierher kommt (Adresse
 * mit &bildschirm=verwaltung, Zurück-Taste), landet sofort auf dem Start und
 * sieht nichts. In der Werkstatt gibt es `&admin` zum Ansehen, aber NUR auf
 * dem eigenen Rechner (localhost/127.0.0.1) — ausgeliefert wirkt es nicht.
 *
 * EHRLICH ZUR SICHERHEIT: Das ist eine Sperre der OBERFLÄCHE. Die Konten
 * (`spieler`) sind laut Datenbank-Regel für jeden lesbar, und die Wortliste
 * samt Bewertung liegt öffentlich im Repository. Wer technisch nachsieht,
 * kommt an die Daten (siehe STATUS.md, Vorschlag zu den Regeln).
 *
 * Zwei Teile (Umschalter oben):
 *   Lexikon  alle Wörter — Lösungen (bewertet) und Zusatzwörter getrennt.
 *            SEIT 0.18.1 (Nutzer 28.09.2026: „soll nicht öffentlich sein")
 *            wird die volle Bewertung NICHT mehr ausgeliefert (bis 0.18.0
 *            js/lexikon-daten.js, öffentlich lesbar). Bis sie aus einem nur
 *            für Admins lesbaren Datenbank-Knoten kommt (nächste Regel,
 *            Konzept bei der Koordination), zeigt der Teil „Lösungen" nur
 *            „Nur im Werkzeug" — die Bewertung sieht der Nutzer im lokalen
 *            Werkzeug (werkzeug\woerter-werkzeug.html). Die reinen
 *            Funktionen `lexikonZeilen`/`lexikonFiltern` bleiben für dann;
 *            die Quelle trägt `LEXIKON_QUELLE` ein (heute null).
 *   Spieler  der gemeinsame Baustein js/upcrew-spielerliste.js — nur lesen.
 */

const VERWALTUNG_BILDSCHIRM = {

    TITEL: "Verwaltung",
    /* Woher die volle Bewertung kommt: heute nirgendwoher (null) — später
       eine Funktion, die sie aus dem Admin-Knoten der Datenbank holt und ein
       Versprechen liefert. */
    LEXIKON_QUELLE: null,
    SEITE: 60,

    _teil: "lexikon",
    _lexikonLaden: null,
    _filter: { suche: "", stufe: "", vokale: "", umlaut: false, doppelt: false, nach: "zahl", liste: "loesungen" },
    _zeigenBis: 60,

    anmelden() {
        NAVIGATION.anmelden({
            id: "verwaltung",
            titel: VERWALTUNG_BILDSCHIRM.TITEL,
            zeichen: "schild",
            /* Seit 0.17.1 nie im Menü — nur der Knopf in den Einstellungen. */
            imMenue: false,
            zeigen: (behaelter) => VERWALTUNG_BILDSCHIRM.zeigen(behaelter)
        });
    },

    /* Werkstatt-Schalter `&admin` — nur auf dem eigenen Rechner. */
    _werkstattAdmin() {
        const lokal = typeof location !== "undefined"
            && ["localhost", "127.0.0.1", "[::1]"].indexOf(location.hostname) !== -1;
        return lokal && typeof WERKSTATT !== "undefined" && WERKSTATT.aktiv()
            && WERKSTATT._parameter().has("admin");
    },

    /* Darf dieses Gerät die Verwaltung sehen? */
    erlaubt() {
        if (VERWALTUNG_BILDSCHIRM._werkstattAdmin()) {
            return true;
        }
        if (typeof KONTO === "undefined" || !KONTO.aktiv() || typeof ANMELDUNG === "undefined"
                || !ANMELDUNG.abgleich) {
            return false;
        }
        return KONTO.istAdmin(ANMELDUNG.abgleich.daten, KONTO.uid());
    },

    zeigen(behaelter) {
        if (!VERWALTUNG_BILDSCHIRM.erlaubt()) {
            /* Nichts zeigen, gleich zurück zum Start. */
            setTimeout(() => NAVIGATION.zeigen("start", null, true), 0);
            return;
        }
        behaelter.appendChild(BAUSTEINE.kopfzeile(VERWALTUNG_BILDSCHIRM.TITEL, {
            zurueck: () => NAVIGATION.zurueck()
        }));
        behaelter.appendChild(BAUSTEINE.segment([
            { wert: "lexikon", text: "Lexikon" },
            { wert: "spieler", text: "Spieler" }
        ], VERWALTUNG_BILDSCHIRM._teil, (wert) => {
            VERWALTUNG_BILDSCHIRM._teil = wert;
            NAVIGATION.auffrischen();
        }, "Teil der Verwaltung"));

        /* Seit 0.23.1: Lexikon aus der Datenbank (nur §12), automatisch rechnen/aufräumen. */
        VERWALTUNG_BILDSCHIRM._quelleSetzen();
        VERWALTUNG_BILDSCHIRM._automatisch();
        const ort = BAUSTEINE.el("div", "verwaltung-ort");
        behaelter.appendChild(ort);
        if (VERWALTUNG_BILDSCHIRM._teil === "spieler") {
            VERWALTUNG_BILDSCHIRM._spielerZeigen(ort);
        } else {
            VERWALTUNG_BILDSCHIRM._lexikonZeigen(ort);
        }
    },

    /* ---------------------------------------------------------------- *
     * Lexikon
     * ---------------------------------------------------------------- */

    /* Gibt es eine Quelle für die volle Bewertung? (seit 0.18.1 nein) */
    lexikonDa() {
        return typeof VERWALTUNG_BILDSCHIRM.LEXIKON_QUELLE === "function";
    },

    /* Holt die volle Bewertung EINMAL aus der Quelle. */
    lexikonLaden() {
        if (!VERWALTUNG_BILDSCHIRM.lexikonDa()) {
            return Promise.reject(new Error("nur-werkzeug"));
        }
        if (!VERWALTUNG_BILDSCHIRM._lexikonLaden) {
            VERWALTUNG_BILDSCHIRM._lexikonLaden = Promise.resolve(VERWALTUNG_BILDSCHIRM.LEXIKON_QUELLE())
                .catch((fehler) => {
                    VERWALTUNG_BILDSCHIRM._lexikonLaden = null;
                    throw fehler;
                });
        }
        return VERWALTUNG_BILDSCHIRM._lexikonLaden;
    },

    /* Die Zeilen des Lexikons aus der vollen Bewertung + Korrektur. */
    lexikonZeilen(voll) {
        return WOERTER_DE.loesungen.map((wort) => {
            const r = (voll && voll.woerter[wort]) || [null, null, null, null, 0, 0, 0, null];
            const e = WORTBEWERTUNG.eintrag(wort) || { stufe: 2, skala: 5, ungeeignet: false, korrigiert: false };
            return { wort: wort, zahl: r[0], versuche: r[1], nachbarn: r[2], muster: r[3], doppelt: r[4],
                umlaut: r[5], vokale: r[7], stufe: e.stufe, skala: e.skala, ungeeignet: e.ungeeignet,
                korrigiert: e.korrigiert };
        });
    },

    /* Filtern und sortieren — rein, für den Test. */
    lexikonFiltern(zeilen, f) {
        const suche = String(f.suche || "").trim().toLowerCase();
        const nach = f.nach || "zahl";
        return zeilen.filter((z) => (!suche || z.wort.indexOf(suche) !== -1)
            && (!f.stufe || z.stufe === Number(f.stufe))
            && (f.vokale === "" || f.vokale === undefined
                || (f.vokale === "3" ? z.vokale >= 3 : z.vokale === Number(f.vokale)))
            && (!f.umlaut || z.umlaut)
            && (!f.doppelt || z.doppelt > 0))
            .sort((a, b) => {
                if (nach === "wort") {
                    return a.wort.localeCompare(b.wort, "de");
                }
                return ((b[nach] || 0) - (a[nach] || 0)) || a.wort.localeCompare(b.wort, "de");
            });
    },

    _lexikonZeigen(ort) {
        const f = VERWALTUNG_BILDSCHIRM._filter;
        ort.appendChild(BAUSTEINE.segment([
            { wert: "loesungen", text: "Lösungen · " + WOERTER_DE.loesungen.length },
            { wert: "zusatz", text: "Zusatz · " + WOERTER_DE.zusatz.length }
        ], f.liste, (wert) => {
            f.liste = wert;
            NAVIGATION.auffrischen();
        }, "Wortliste"));

        if (f.liste === "zusatz") {
            ort.appendChild(BAUSTEINE.el("p", "verwaltung-hinweis",
                "Dürfen geraten werden, kommen nie als Lösung — nicht bewertet."));
            const wolke = BAUSTEINE.el("p", "lexikon-wolke", WOERTER_DE.zusatz.slice().sort((a, b) =>
                a.localeCompare(b, "de")).join(" · "));
            ort.appendChild(wolke);
            return;
        }

        const datenKarte = VERWALTUNG_BILDSCHIRM._datenKarteBauen();
        if (datenKarte) {
            ort.appendChild(datenKarte);
        }
        /* Seit 0.18.1: ohne Admin-Quelle nur der Hinweis. */
        if (!VERWALTUNG_BILDSCHIRM.lexikonDa()) {
            ort.appendChild(ZUSTAND.leer({ zeichen: "info", text: "Nur im Werkzeug" }));
            return;
        }
        const platz = ZUSTAND.laden({ zeilen: 6, nochmal: () => NAVIGATION.auffrischen() });
        ort.appendChild(platz);
        VERWALTUNG_BILDSCHIRM.lexikonLaden().then((voll) => {
            if (!platz.isConnected) {
                return;
            }
            const inhalt = BAUSTEINE.el("div", "lexikon");
            platz.replaceWith(inhalt);
            VERWALTUNG_BILDSCHIRM._lexikonBauen(inhalt, VERWALTUNG_BILDSCHIRM.lexikonZeilen(voll), voll);
        }).catch(() => {
            if (platz.isConnected) {
                platz.replaceWith(ZUSTAND.fehler({ text: "Nicht geladen", nochmal: () => NAVIGATION.auffrischen() }));
            }
        });
    },

    _auswahl(klasse, optionen, wert, beiWahl, beschriftung) {
        const s = BAUSTEINE.el("select", klasse);
        s.setAttribute("aria-label", beschriftung);
        for (const [w, text] of optionen) {
            const o = BAUSTEINE.el("option", null, text);
            o.value = w;
            s.appendChild(o);
        }
        s.value = wert;
        s.addEventListener("change", () => beiWahl(s.value));
        return s;
    },

    _lexikonBauen(inhalt, alle, voll) {
        const f = VERWALTUNG_BILDSCHIRM._filter;
        const leiste = BAUSTEINE.el("div", "lexikon-leiste");
        const suche = BAUSTEINE.el("input", "lexikon-suche");
        suche.type = "search";
        suche.placeholder = "Wort suchen";
        suche.setAttribute("aria-label", "Wort suchen");
        suche.autocomplete = "off";
        suche.value = f.suche;
        leiste.appendChild(suche);
        leiste.appendChild(VERWALTUNG_BILDSCHIRM._auswahl("lexikon-wahl", [["", "alle Stufen"], ["1", "leicht"],
            ["2", "mittel"], ["3", "schwer"]], f.stufe, (w) => { f.stufe = w; neu(); }, "Stufe"));
        leiste.appendChild(VERWALTUNG_BILDSCHIRM._auswahl("lexikon-wahl", [["", "alle Vokale"], ["0", "0 Vokale"],
            ["1", "1 Vokal"], ["2", "2 Vokale"], ["3", "3+ Vokale"]], f.vokale, (w) => { f.vokale = w; neu(); }, "Vokale"));
        leiste.appendChild(VERWALTUNG_BILDSCHIRM._auswahl("lexikon-wahl", [["zahl", "nach Zahl"],
            ["versuche", "nach Löser"], ["nachbarn", "nach Fallen"], ["muster", "nach Muster"],
            ["wort", "nach Wort"]], f.nach, (w) => { f.nach = w; neu(); }, "Sortieren"));
        for (const [feld, text] of [["umlaut", "Umlaut"], ["doppelt", "Doppelbuchstabe"]]) {
            const label = BAUSTEINE.el("label", "lexikon-haken");
            const kasten = BAUSTEINE.el("input");
            kasten.type = "checkbox";
            kasten.checked = !!f[feld];
            kasten.addEventListener("change", () => { f[feld] = kasten.checked; neu(); });
            label.appendChild(kasten);
            label.appendChild(document.createTextNode(" " + text));
            leiste.appendChild(label);
        }
        inhalt.appendChild(leiste);
        if (voll) {
            inhalt.appendChild(BAUSTEINE.el("p", "verwaltung-hinweis", "Gerechnet am " + voll.erstellt
                + " · mittel ab " + voll.stufen[0] + ", schwer ab " + voll.stufen[1]
                + " · Korrekturen im lokalen Werkzeug"));
        }
        const zahl = BAUSTEINE.el("p", "verwaltung-hinweis");
        inhalt.appendChild(zahl);
        const liste = BAUSTEINE.el("ul", "lexikon-liste");
        inhalt.appendChild(liste);
        const mehr = BAUSTEINE.knopf({ text: "Mehr zeigen", art: "still", breit: true,
            beiKlick: () => { VERWALTUNG_BILDSCHIRM._zeigenBis += VERWALTUNG_BILDSCHIRM.SEITE; zeichnen(); } });
        inhalt.appendChild(mehr);

        function zeichnen() {
            const treffer = VERWALTUNG_BILDSCHIRM.lexikonFiltern(alle, f);
            zahl.textContent = treffer.length + " von " + alle.length + " Wörtern";
            liste.textContent = "";
            for (const z of treffer.slice(0, VERWALTUNG_BILDSCHIRM._zeigenBis)) {
                const li = BAUSTEINE.el("li", "lexikon-karte" + (z.ungeeignet ? " lexikon-ungeeignet" : ""));
                const kopf = BAUSTEINE.el("div", "lexikon-kopf");
                kopf.appendChild(BAUSTEINE.el("span", "lexikon-wort", z.wort));
                kopf.appendChild(BAUSTEINE.el("span", "lexikon-stufe lexikon-s" + z.stufe,
                    WORTBEWERTUNG.STUFEN_NAMEN[z.stufe]));
                kopf.appendChild(BAUSTEINE.el("span", "lexikon-zahl", (z.zahl === null ? "—" : z.zahl) + " · Skala " + z.skala));
                li.appendChild(kopf);
                const teile = ["Löser " + (z.versuche === null ? "—" : z.versuche.toFixed(2)),
                    "Vokale " + (z.vokale === null ? "—" : z.vokale), "Fallen " + (z.nachbarn === null ? "—" : z.nachbarn),
                    "Muster " + (z.muster === null ? "—" : z.muster.toFixed(2))];
                if (z.ungeeignet) {
                    teile.push("ungeeignet");
                }
                if (z.korrigiert) {
                    teile.push("korrigiert");
                }
                li.appendChild(BAUSTEINE.el("p", "lexikon-teile", teile.join(" · ")));
                liste.appendChild(li);
            }
            mehr.hidden = treffer.length <= VERWALTUNG_BILDSCHIRM._zeigenBis;
        }
        function neu() {
            VERWALTUNG_BILDSCHIRM._zeigenBis = VERWALTUNG_BILDSCHIRM.SEITE;
            zeichnen();
        }
        suche.addEventListener("input", () => { f.suche = suche.value; neu(); });
        zeichnen();
    },

    /* ---------------------------------------------------------------- *
     * Spieler — der gemeinsame Baustein, nur lesen
     * ---------------------------------------------------------------- */

    /* Spielzeit eines Spielers für Admins (seit 0.24.0, wie Blunderluck
       v0.155.0 Spalte „Spielzeit"): aus dem vollen Fortschritt, sonst aus
       einem veröffentlichten Auszug; „" ohne Angabe. Rein. */
    spielzeitText(daten, uid) {
        const stand = (daten && Array.isArray(daten.spieler)) ? daten.spieler : [];
        const spieler = uid ? stand.find((s) => s.uid === uid) : null;
        if (!spieler) {
            return "";
        }
        if (spieler.fortschritt) {
            const seit = FORTSCHRITT.seitVon(spieler.fortschritt);
            return "Spielzeit · " + FORTSCHRITT.spielzeitText(FORTSCHRITT.spielzeitSumme(spieler.fortschritt))
                + (seit ? " · dabei seit " + SPIELZEIT.datumText(seit) : "");
        }
        const auszug = spieler.auszug && spieler.auszug.werte;
        return (auszug && typeof auszug.spielzeit === "number")
            ? "Spielzeit · " + FORTSCHRITT.spielzeitText(auszug.spielzeit) : "";
    },

    /* Die Zeilen aus der Spielerliste — rein, für den Test. */
    spielerZeilen(daten, heute) {
        const stand = (daten && Array.isArray(daten.spieler)) ? daten.spieler : [];
        return UPCREW_SPIELERLISTE.zeilen(stand.filter((s) => !SPIELER.istVerteiler(s)), {
            rolle: (uid) => KONTO.rolleVon(daten, uid),
            level: (fortschritt) => {
                const l = FORTSCHRITT.level(fortschritt);
                return { level: l.level, xp: FORTSCHRITT.gesamtXp(fortschritt) };
            },
            serie: (fortschritt) => FORTSCHRITT.serieHeute(fortschritt, heute).tage,
            abzeichen: (fortschritt) => {
                const liste = FORTSCHRITT.abzeichen(fortschritt, heute);
                return { erreicht: liste.filter((a) => a.erreicht > 0).length, alle: liste.length };
            }
        });
    },

    /* ---------------------------------------------------------------- *
     * TYPOLUCK-DATEN (seit 0.23.1, Regel §12 Phase A Punkt 5 + 6; Konzept
     * DATENBANK-KONZEPT-12.md §6, §7.3, §7.4, §8): Lexikon einspielen und
     * aus der Datenbank ansehen, Schwierigkeit neu rechnen (Knopf und
     * höchstens 1× am Tag beim Öffnen), Statistik aufräumen (Knopf und
     * höchstens 1× im Monat), Detail-Ansicht je Spieler (erst beim
     * Antippen). Alles nur unter Regel §12 — unter der heutigen Regel gibt
     * es `typoluck-intern` nicht, und nichts wird gesendet.
     * ---------------------------------------------------------------- */

    AUTO_RECHNEN: "typoluck.verwaltung-rechnen",
    AUTO_AUFRAEUMEN: "typoluck.verwaltung-aufraeumen",
    TAG_MS: 86400000,
    MONAT_MS: 30 * 86400000,

    _intern() {
        const p12 = typeof KONTO !== "undefined" && typeof KONTO.istP12 === "function" && KONTO.istP12();
        return (p12 && typeof APP !== "undefined" && APP.internSpeicher) ? APP.internSpeicher : null;
    },

    /* Die Quelle des Lexikons: unter §12 der Admin-Knoten, sonst keine. */
    _quelleSetzen() {
        const intern = VERWALTUNG_BILDSCHIRM._intern();
        if (!intern) {
            VERWALTUNG_BILDSCHIRM.LEXIKON_QUELLE = null;
            return;
        }
        VERWALTUNG_BILDSCHIRM.LEXIKON_QUELLE = async () => {
            const lexikon = await intern.teilLaden("lexikon");
            if (!lexikon || typeof lexikon !== "object" || !Object.keys(lexikon).length) {
                throw new Error("leer");
            }
            VERWALTUNG_BILDSCHIRM._lexikonRoh = lexikon;
            return WORTSTATISTIK.lexikonAlsVoll(lexikon);
        };
    },

    _lexikonRoh: null,

    _datenKarteBauen() {
        const intern = VERWALTUNG_BILDSCHIRM._intern();
        if (!intern) {
            return null;
        }
        const karte = BAUSTEINE.karte("Typoluck-Daten");
        const reihe = BAUSTEINE.el("div", "verwaltung-knoepfe");
        const datei = BAUSTEINE.el("input", "verwaltung-datei");
        datei.type = "file";
        datei.accept = ".json,application/json";
        datei.hidden = true;
        datei.addEventListener("change", async () => {
            const f = datei.files && datei.files[0];
            datei.value = "";
            if (f) {
                await VERWALTUNG_BILDSCHIRM.lexikonEinspielen(await f.text());
            }
        });
        karte.appendChild(datei);
        reihe.appendChild(BAUSTEINE.knopf({ text: "Lexikon einspielen", art: "still", zeichen: "buch",
            beiKlick: () => datei.click() }));
        reihe.appendChild(BAUSTEINE.knopf({ text: "Schwierigkeit neu rechnen", art: "still", zeichen: "aktualisieren",
            beiKlick: async () => {
                const r = await VERWALTUNG_BILDSCHIRM.schwierigkeitRechnen();
                await DIALOG.hinweis(r.ok ? "Neu gerechnet" : "Nicht gerechnet", r.text);
            } }));
        reihe.appendChild(BAUSTEINE.knopf({ text: "Statistik aufräumen", art: "still", zeichen: "loeschen",
            beiKlick: async () => {
                const r = await VERWALTUNG_BILDSCHIRM.statistikAufraeumen();
                await DIALOG.hinweis(r.ok ? "Aufgeräumt" : "Nicht aufgeräumt", r.text);
            } }));
        karte.appendChild(reihe);
        return karte;
    },

    /* Eine Datei `lexikon-export.json` (Werkzeug) nach typoluck-intern/lexikon. */
    async lexikonEinspielen(text) {
        const intern = VERWALTUNG_BILDSCHIRM._intern();
        let roh = null;
        try {
            roh = JSON.parse(text);
        } catch (fehler) {
            roh = null;
        }
        const gepruefte = WORTSTATISTIK.lexikonPruefen(roh);
        if (!intern || !gepruefte.ok) {
            await DIALOG.hinweis("Nicht eingespielt", intern ? gepruefte.fehler : "Nur unter Regel §12");
            return { ok: false };
        }
        try {
            for (const schritt of WORTSTATISTIK.lexikonSchritte(gepruefte.eintraege)) {
                await intern.teilSchreiben(schritt);
            }
        } catch (fehler) {
            await DIALOG.hinweis("Nicht eingespielt", "Die Datenbank lehnt ab");
            return { ok: false };
        }
        VERWALTUNG_BILDSCHIRM._lexikonLaden = null;
        await DIALOG.hinweis("Eingespielt", Object.keys(gepruefte.eintraege).length + " Wörter"
            + (gepruefte.schlecht ? " · " + gepruefte.schlecht + " übersprungen" : ""));
        NAVIGATION.auffrischen();
        return { ok: true };
    },

    /* Summen + Lexikon lesen, neue Schwierigkeit schreiben. */
    async schwierigkeitRechnen() {
        const intern = VERWALTUNG_BILDSCHIRM._intern();
        if (!intern) {
            return { ok: false, text: "Nur unter Regel §12" };
        }
        try {
            const [lexikon, summen] = await Promise.all([intern.teilLaden("lexikon"), intern.teilLaden("summen")]);
            const daten = WORTSTATISTIK.appDaten(lexikon || {}, summen || {}, WOERTER_DE.loesungen, Date.now());
            await intern.teilSchreiben({ schwierigkeit: daten });
            VERWALTUNG_BILDSCHIRM._merken(VERWALTUNG_BILDSCHIRM.AUTO_RECHNEN);
            WORTSTATISTIK_ABGLEICH._anwenden(daten);
            return { ok: true, text: Object.keys(summen || {}).length + " Wörter mit Daten" };
        } catch (fehler) {
            return { ok: false, text: "Die Datenbank lehnt ab" };
        }
    },

    /* Datensätze älter als 12 Monate löschen — Spieler für Spieler. */
    async statistikAufraeumen() {
        const intern = VERWALTUNG_BILDSCHIRM._intern();
        const daten = ANMELDUNG.abgleich ? ANMELDUNG.abgleich.daten : null;
        if (!intern || !daten) {
            return { ok: false, text: "Nur unter Regel §12" };
        }
        const heute = WORTSTATISTIK.tagZahl(WORDLE.datumText(APP.jetzt()));
        let weg = 0;
        try {
            for (const spieler of (daten.spieler || []).filter((s) => s.uid)) {
                const runden = await intern.teilLaden("runden/" + spieler.uid);
                const schritt = WORTSTATISTIK.aufraeumen(spieler.uid, runden, heute);
                if (Object.keys(schritt).length) {
                    await intern.teilSchreiben(schritt);
                    weg += Object.keys(schritt).length;
                }
            }
        } catch (fehler) {
            return { ok: false, text: "Abgebrochen · " + weg + " gelöscht" };
        }
        VERWALTUNG_BILDSCHIRM._merken(VERWALTUNG_BILDSCHIRM.AUTO_AUFRAEUMEN);
        return { ok: true, text: weg + " gelöscht" };
    },

    _merken(schluessel) {
        try {
            window.localStorage.setItem(schluessel, String(Date.now()));
        } catch (fehler) {
            /* dann eben beim nächsten Öffnen noch einmal */
        }
    },

    _faellig(schluessel, abstand) {
        try {
            const zuletzt = Number(window.localStorage.getItem(schluessel) || 0);
            return !(zuletzt > 0 && Date.now() - zuletzt < abstand);
        } catch (fehler) {
            return false;
        }
    },

    /* Beim Öffnen: höchstens 1×/Tag rechnen, 1×/Monat aufräumen — still. */
    _automatisch() {
        if (!VERWALTUNG_BILDSCHIRM._intern()) {
            return;
        }
        if (VERWALTUNG_BILDSCHIRM._faellig(VERWALTUNG_BILDSCHIRM.AUTO_RECHNEN, VERWALTUNG_BILDSCHIRM.TAG_MS)) {
            VERWALTUNG_BILDSCHIRM._merken(VERWALTUNG_BILDSCHIRM.AUTO_RECHNEN);
            VERWALTUNG_BILDSCHIRM.schwierigkeitRechnen();
        }
        if (VERWALTUNG_BILDSCHIRM._faellig(VERWALTUNG_BILDSCHIRM.AUTO_AUFRAEUMEN, VERWALTUNG_BILDSCHIRM.MONAT_MS)) {
            VERWALTUNG_BILDSCHIRM._merken(VERWALTUNG_BILDSCHIRM.AUTO_AUFRAEUMEN);
            VERWALTUNG_BILDSCHIRM.statistikAufraeumen();
        }
    },

    /* Die Detail-Ansicht eines Spielers: erst beim Antippen `runden/<uid>`. */
    _detailBauen(zeile) {
        const halter = BAUSTEINE.el("div", "verwaltung-detail");
        const intern = VERWALTUNG_BILDSCHIRM._intern();
        if (!intern || !zeile.uid) {
            return halter;
        }
        halter.appendChild(ZUSTAND.laden({ zeilen: 3 }));
        Promise.all([intern.teilLaden("runden/" + zeile.uid),
            VERWALTUNG_BILDSCHIRM._lexikonRoh ? Promise.resolve(VERWALTUNG_BILDSCHIRM._lexikonRoh)
                : intern.teilLaden("lexikon").catch(() => ({}))]).then(([runden, lexikon]) => {
            VERWALTUNG_BILDSCHIRM._lexikonRoh = lexikon || {};
            const woerter = {};
            Object.keys(lexikon || {}).forEach((k) => { woerter[k] = lexikon[k].w; });
            const d = WORTSTATISTIK.detail(runden || {}, woerter);
            halter.innerHTML = "";
            halter.appendChild(BAUSTEINE.el("p", "verwaltung-hinweis", "Typoluck · " + d.summen.woerter + " Wörter · "
                + d.summen.quote + " % gelöst · Ø " + d.summen.versuche + " Versuche · Ø " + d.summen.dauer
                + " s · " + d.summen.hilfe + " % mit Hilfe"));
            const liste = BAUSTEINE.el("ol", "verwaltung-detail-liste");
            for (const z of d.zeilen.slice(0, 100)) {
                liste.appendChild(BAUSTEINE.el("li", null, z.wort.toUpperCase() + " · " + (z.v ? z.v + "/" + z.g : "X/" + z.g)
                    + " · " + { t: "Tag", u: "Üben", b: "Buch" }[z.m] + (z.h ? " · Hilfe " + z.h : "") + " · " + z.d + " s · "
                    + z.f + (z.r > 1 ? " · +" + (z.r - 1) + " (" + z.wg + " gelöst)" : "")));
            }
            halter.appendChild(liste);
        }).catch(() => {
            halter.innerHTML = "";
            halter.appendChild(BAUSTEINE.el("p", "verwaltung-hinweis", "Typoluck-Statistik nicht geladen"));
        });
        return halter;
    },

    /*
     * „§12 NACHZIEHEN" (seit 0.22.0, wie Blunderluck v0.154.0; Konzept
     * Phase A Punkt 4): Direkt nach dem Einspielen der Regel §12 fehlen die
     * öffentlichen Auszüge und das Anmeldeverzeichnis. Der Knopf schreibt
     * beides für alle Konten (`KONTO.nachziehen`), wiederholbar. Nur für
     * UP#Plus und nur, wenn die App die Regel §12 erkannt hat.
     */
    _nachziehenBauen() {
        if (typeof KONTO === "undefined" || typeof KONTO.istP12 !== "function"
                || !KONTO.istP12() || KONTO.uid() !== KONTO.OBER_UID) {
            return null;
        }
        const karte = BAUSTEINE.karte("Regel §12");
        karte.appendChild(BAUSTEINE.el("p", "verwaltung-hinweis", "Auszüge und Anmeldeverzeichnis · wiederholbar"));
        const knopf = BAUSTEINE.knopf({ text: "§12 nachziehen", art: "still",
            beiKlick: async () => {
                knopf.disabled = true;
                const ergebnis = await KONTO.nachziehen(ANMELDUNG.abgleich.speicher);
                knopf.disabled = false;
                if (!ergebnis.ok) {
                    await DIALOG.hinweis("Nicht nachgezogen", ergebnis.text || "");
                    return;
                }
                await ANMELDUNG._nachladen();
                await DIALOG.hinweis("Nachgezogen", ergebnis.geschrieben + " geschrieben · "
                    + ergebnis.uebersprungen + " übersprungen");
            } });
        karte.appendChild(knopf);
        return karte;
    },

    _spielerZeigen(ort) {
        const daten = ANMELDUNG.abgleich ? ANMELDUNG.abgleich.daten : null;
        const zeilen = VERWALTUNG_BILDSCHIRM.spielerZeilen(daten, WORDLE.datumText(APP.jetzt()));
        ort.appendChild(BAUSTEINE.el("p", "verwaltung-hinweis",
            "Nur lesen · Rechte und Umbenennen in der Blunderluck-Verwaltung"));
        const nachziehen = VERWALTUNG_BILDSCHIRM._nachziehenBauen();
        if (nachziehen) {
            ort.appendChild(nachziehen);
        }
        UPCREW_SPIELERLISTE.bauen(ort, {
            zeilen: zeilen,
            beiAuswahl: (zeile) => {
                /* Seit 0.23.1 darunter die Typoluck-Statistik (nur §12, erst jetzt geladen). */
                const inhalt = BAUSTEINE.el("div", "verwaltung-spieler");
                inhalt.appendChild(UPCREW_SPIELERLISTE.details(zeile));
                /* Seit 0.24.0: Spielzeit über alle Spiele und „dabei seit". */
                const zeit = VERWALTUNG_BILDSCHIRM.spielzeitText(daten, zeile.uid);
                if (zeit) {
                    inhalt.appendChild(BAUSTEINE.el("p", "verwaltung-hinweis", zeit));
                }
                inhalt.appendChild(VERWALTUNG_BILDSCHIRM._detailBauen(zeile));
                return DIALOG.hinweis(zeile.name + (zeile.tag ? " #" + zeile.tag : ""), "", inhalt);
            }
        });
    }
};
