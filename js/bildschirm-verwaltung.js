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
            beiAuswahl: (zeile) => DIALOG.hinweis(zeile.name + (zeile.tag ? " #" + zeile.tag : ""), "", UPCREW_SPIELERLISTE.details(zeile))
        });
    }
};
