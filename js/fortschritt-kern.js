/*
 * fortschritt-kern.js — der Teil des gemeinsamen Fortschritts, der in JEDEM UPCrew-Spiel gleich ist.
 * Quelle: Apps\UPCrew\bausteine\kern — in die Apps KOPIEREN, nie abwandeln (Liste: BAUSTEINE.json).
 *
 * Seit 03.10.2026. Bis dahin stand jedes dieser Glieder zweimal: in Blunderlucks und in Typolucks
 * js\fortschritt.js, Zeile für Zeile gleich, und Typolucks Tests verglichen sie gegen Blunderluck.
 * Herausgezogen ist NUR, was gleich war — an keinem Glied wurde etwas geändert. Versionsangaben in
 * den Kommentaren („seit v0.152.0“) meinen Blunderluck, wo nichts anderes dabeisteht.
 *
 * WAS HIER LIEGT: Zusammenführen zweier Stände, die Serie über alle Spiele, die Erstattung alter
 * Schilde, der öffentliche Auszug fürs Profil, Spielzeit und „dabei seit“, Datums-Helfer, die
 * Tabellen für Rahmen und Titel. Reine Rechnung — kein Bildschirm, kein Speicher.
 *
 * WAS BEIM SPIEL BLEIBT: alles, was eine Partie ist und was sie gibt (XP-Quellen, Turm, Bibliothek,
 * Taten), das Prüfen des eigenen Zweigs (`normalisieren`), die Form fürs Konto (`fuerKonto`) und
 * vorerst die Level-Rechnung. Diese Teile sind in den Spielen noch verschieden gebaut; sie werden in
 * einer eigenen Runde angeglichen (Apps\UPCrew\ROADMAP.md, Schritt e).
 *
 * SO BAUT EIN SPIEL SEINEN FORTSCHRITT (js\fortschritt.js, geladen NACH dieser Datei):
 *
 *     const FORTSCHRITT = Object.assign({}, FORTSCHRITT_KERN, {
 *         APP: "<name des spiels>",
 *         ... die eigenen Glieder ...
 *     });
 *
 * Die Glieder hier rufen einander und das Spiel über den Namen `FORTSCHRITT` — also über das
 * zusammengesetzte Ding des Spiels, nie über `FORTSCHRITT_KERN`. So kann ein Spiel ein Glied
 * ersetzen, und der Kern nimmt das ersetzte.
 *
 * WAS DER KERN VOM SPIEL ERWARTET, steht in `FORTSCHRITT_KERN_ERWARTET` (unten). Fehlt eines davon,
 * rechnet der Kern nicht. Ein Test in UPCrew hält die Liste gleich mit dem, was der Kern wirklich
 * aufruft; jedes Spiel prüft in seinen Tests, dass es alle liefert.
 *
 * Fremde Bausteine: `UPCREW_ABZEICHEN.werte` (js\upcrew-abzeichen.js) für den Auszug — fehlt er,
 * sind die Werte 0.
 */

const FORTSCHRITT_KERN = {

    VERSION: 1,

    /* Schutz gegen offensichtlichen Unsinn aus dem Speicher. */
    XP_MAX: 10000000,

    /* So viele Tage mit geschaffter Tagesaufgabe merkt sich ein Zweig —
       genug für jede sichtbare Serie (die Anzeige zeigt 7). */
    TAGE_MAX: 60,

    /* Rahmen und Titel am Profilbild. EINE Regel für beide Spiele (Runde 6
       Nachtrag, seit v0.151.0): der erste Rahmen ab Level 10, dann alle 5
       Level einer (10, 15, 20, 25 …): Silber 10, Gold 15, Platin 20, danach
       „Glanz <Level>" (`belohnungen`) — genau wie Typoluck 0.14.0. Bis
       v0.150.0 gab es Kupfer schon ab 5 (entfallen). */
    RAHMEN: [
        { ab: 10, id: "silber", name: "Silber" },
        { ab: 15, id: "gold", name: "Gold" },
        { ab: 20, id: "platin", name: "Platin" }
    ],

    TITEL: [
        { ab: 1, name: "Neuling" },
        { ab: 10, name: "Stammgast" },
        { ab: 25, name: "Kenner" },
        { ab: 50, name: "Legende" }
    ],

    /* ---------------------------------------------------------------- *
     * Grundformen
     * ---------------------------------------------------------------- */

    leer() {
        return { version: FORTSCHRITT.VERSION, spiele: {} };
    },

    _istObjekt(wert) {
        return !!wert && typeof wert === "object" && !Array.isArray(wert);
    },

    /* ---------------------------------------------------------------- *
     * Zusammenführen: je Spiel gewinnt der neuere Zweig
     * ---------------------------------------------------------------- */

    zusammenfuehren(a, b) {
        const eins = FORTSCHRITT.normalisieren(a);
        const zwei = FORTSCHRITT.normalisieren(b);
        const ergebnis = Object.assign({}, zwei, eins, { spiele: {} });
        const apps = new Set(Object.keys(eins.spiele).concat(Object.keys(zwei.spiele)));
        for (const app of apps) {
            const x = eins.spiele[app];
            const y = zwei.spiele[app];
            if (!x || !y) {
                ergebnis.spiele[app] = x || y;
            } else {
                const neuer = (y.stand > x.stand) ? y : x;
                const aelter = (neuer === y) ? x : y;
                ergebnis.spiele[app] = FORTSCHRITT._zaehlerZusammen(neuer, aelter);
            }
        }
        return ergebnis;
    },

    /* Die drei Zähler der Serie — sie gehören zusammen (seit v0.152.0). */
    SERIE_ZAEHLER: ["serie", "serieBis", "serieSchutz"],

    /* Zähler, bei denen beim Zusammenführen der FRÜHERE Wert gilt
       (JJJJMMTT „dabei seit", seit Blunderluck v0.155.0). */
    FRUEH_ZAEHLER: ["seit"],

    /*
     * Zwei Fassungen DESSELBEN Zweigs (zwei Geräte): die neuere gewinnt wie
     * bisher, aber ihre `zaehler` nehmen je Name den grösseren Wert (sie
     * wachsen nur — sonst ginge z. B. eine auf dem anderen Gerät verdiente
     * Münze verloren); die Serien-Zähler kommen gemeinsam aus der Fassung
     * mit dem neueren `serieBis` (seit v0.152.0).
     */
    _zaehlerZusammen(neuer, aelter) {
        const a = FORTSCHRITT._istObjekt(neuer.zaehler) ? neuer.zaehler : null;
        const b = FORTSCHRITT._istObjekt(aelter.zaehler) ? aelter.zaehler : null;
        if (!b) {
            return neuer;
        }
        const zaehler = Object.assign({}, a || {});
        for (const k of Object.keys(b)) {
            if (FORTSCHRITT.SERIE_ZAEHLER.indexOf(k) !== -1) {
                continue;
            }
            /* „dabei seit" (seit Blunderluck v0.155.0): das frühere Datum. */
            if (FORTSCHRITT.FRUEH_ZAEHLER.indexOf(k) !== -1) {
                if (typeof b[k] === "number" && b[k] > 0
                        && !(typeof zaehler[k] === "number" && zaehler[k] > 0 && zaehler[k] <= b[k])) {
                    zaehler[k] = b[k];
                }
                continue;
            }
            if (typeof b[k] === "number" && !(typeof zaehler[k] === "number" && zaehler[k] >= b[k])) {
                zaehler[k] = b[k];
            }
        }
        const bisA = (a && typeof a.serieBis === "number") ? a.serieBis : -1;
        const bisB = typeof b.serieBis === "number" ? b.serieBis : -1;
        if (bisB > bisA) {
            for (const k of FORTSCHRITT.SERIE_ZAEHLER) {
                if (typeof b[k] === "number") {
                    zaehler[k] = b[k];
                }
            }
        }
        return Object.assign({}, neuer, { zaehler: zaehler });
    },

    /* ---------------------------------------------------------------- *
     * Heute und die Serie (seit v0.149.0)
     * ---------------------------------------------------------------- */

    _istDatum(wert) {
        return typeof wert === "string" && /^\d{4}-\d{2}-\d{2}$/.test(wert);
    },

    /* Das Datum eines Zeitpunkts in ORTSZEIT als „JJJJ-MM-TT" — ein Tag
       beginnt um Mitternacht auf dem Gerät. */
    datumVon(zeitpunkt) {
        const d = new Date(zeitpunkt);
        const zwei = (zahl) => (zahl < 10 ? "0" : "") + zahl;
        return d.getFullYear() + "-" + zwei(d.getMonth() + 1) + "-" + zwei(d.getDate());
    },

    /* Der Tag davor, als „JJJJ-MM-TT" (rechnet in UTC — Datumsgrenzen
       spielen dabei keine Rolle, nur die Kalenderfolge). */
    _vortag(datum) {
        const d = new Date(datum + "T12:00:00Z");
        d.setUTCDate(d.getUTCDate() - 1);
        return d.toISOString().slice(0, 10);
    },

    /*
     * DIE SERIE: wie viele Tage am Stück bis heute (oder bis gestern, wenn
     * heute noch nichts geschafft ist) eine Tagesaufgabe geschafft wurde —
     * in irgendeinem Spiel. Ein fehlender Tag wird von einem SERIEN-SCHUTZ
     * überbrückt, solange welche da sind (`schutz`, verdient über das
     * Level). Liefert { tage, heute, schutzGenutzt }.
     *
     * Vereinfachung, bewusst: Gezählt wird nur, was die LAUFENDE Serie an
     * Schutz braucht; ein Schutz, der eine längst gerissene Serie einmal
     * gerettet hätte, wird nicht rückwirkend abgezogen.
     */
    serie(stand, datum, schutz) {
        const level = Math.max(0, Math.floor(schutz || 0));
        const st = FORTSCHRITT.serieStand(stand, level, datum);
        const leer = { tage: 0, heute: false, schutzGenutzt: 0 };
        if (!st.bis) {
            return leer;
        }
        if (st.bis === datum) {
            return { tage: st.tage, heute: true, schutzGenutzt: st.schutzImLauf };
        }
        const luecke = FORTSCHRITT._tageZwischen(st.bis, datum) - 1;
        if (luecke === 0) {
            return { tage: st.tage, heute: false, schutzGenutzt: st.schutzImLauf };
        }
        /* Gestern fehlt: Die Serie lebt noch, wenn heute ein Schutz den
           Tag überbrücken kann (verbraucht wird er erst beim nächsten Start). */
        if (luecke === 1 && (level - st.schutzImLauf > 0 || st.schildeFrei > 0)) {
            return { tage: st.tage, heute: false, schutzGenutzt: st.schutzImLauf };
        }
        return leer;
    },

    /* „JJJJ-MM-TT" ↔ Zahl JJJJMMTT (für `zaehler.serieBis`). */
    _datumZahl(datum) {
        return FORTSCHRITT._istDatum(datum) ? Number(datum.replace(/-/g, "")) : 0;
    },

    _zahlDatum(zahl) {
        const t = String(Math.floor(Number(zahl) || 0));
        return /^\d{8}$/.test(t) ? t.slice(0, 4) + "-" + t.slice(4, 6) + "-" + t.slice(6, 8) : "";
    },

    /* Wie viele Kalendertage von `a` bis `b` („JJJJ-MM-TT"), b nach a > 0. */
    _tageZwischen(a, b) {
        return Math.round((Date.parse(b + "T12:00:00Z") - Date.parse(a + "T12:00:00Z")) / 86400000);
    },

    /* Summe eines Zählers über alle Zweige. */
    _zaehlerSumme(stand, name) {
        const sauber = FORTSCHRITT.normalisieren(stand);
        let summe = 0;
        for (const app of Object.keys(sauber.spiele)) {
            const z = sauber.spiele[app].zaehler;
            if (FORTSCHRITT._istObjekt(z) && typeof z[name] === "number" && isFinite(z[name]) && z[name] > 0) {
                summe += Math.floor(z[name]);
            }
        }
        return summe;
    },

    /* Gekaufte, noch nicht verbrauchte Flammen-Schilde über alle Spiele. */
    schildVorrat(stand) {
        return 0;
    },

    /*
     * ERSTATTUNG ALTER SCHILDE (seit v0.157.0, wie Typoluck 0.26.0): Wer vor
     * dem Wegfall Flammen-Schilde gekauft und nicht verbraucht hat, bekommt
     * EINMAL den Kaufpreis als Münzen (`preis` je Stück, 50). Jedes Spiel
     * erstattet nur, was in SEINEM Zweig gekauft wurde, gemerkt im Zähler
     * `schildErstattet` (Stückzahl, wächst nur). Offen sind alle Käufe
     * minus alle Verbrauche über alle Zweige; was ein anderes Spiel schon
     * erstattet hat, zieht ab — so zahlt keiner zweimal. Rein; liefert
     * { stand, stueck, muenzen } (ohne Erstattung stueck 0).
     */
    schildeErstatten(stand, app, preis, zeitpunkt) {
        const sauber = FORTSCHRITT.normalisieren(stand);
        const zweig = sauber.spiele[app];
        const z = zweig && FORTSCHRITT._istObjekt(zweig.zaehler) ? zweig.zaehler : null;
        const zahl = (wert) => (typeof wert === "number" && isFinite(wert) && wert > 0) ? Math.floor(wert) : 0;
        const gekauft = z ? zahl(z.schildGekauft) : 0;
        const erstattet = z ? zahl(z.schildErstattet) : 0;
        const offen = Math.max(0, FORTSCHRITT._zaehlerSumme(sauber, "schildGekauft")
            - FORTSCHRITT._zaehlerSumme(sauber, "schildGenutzt"));
        const andere = FORTSCHRITT._zaehlerSumme(sauber, "schildErstattet") - erstattet;
        const soll = Math.min(gekauft, Math.max(0, offen - andere));
        const stueck = soll - erstattet;
        if (stueck <= 0) {
            return { stand: sauber, stueck: 0, muenzen: 0 };
        }
        const muenzen = stueck * Math.max(0, Math.floor(preis || 0));
        z.schildErstattet = soll;
        z.muenzenVerdient = Math.min(zahl(z.muenzenVerdient) + muenzen, 1000000000);
        zweig.stand = Math.max((zweig.stand || 0) + 1, zeitpunkt || 0);
        return { stand: sauber, stueck: stueck, muenzen: muenzen };
    },

    /*
     * DER STAND DER SERIE über alle Spiele (seit v0.152.0, Kopf „DIE SERIE"):
     * { tage, bis ("JJJJ-MM-TT" oder ""), schutzImLauf, schildeFrei,
     *   schildeVerbraucht }. `schildeVerbraucht` = gekaufte Schilde, die seit
     * dem neuesten Zähler zum Überbrücken nötig waren (das schreibende Spiel
     * bucht sie als `schildGenutzt`). Tage nach `bisDatum` zählen nicht.
     */
    serieStand(stand, levelSchutz, bisDatum) {
        const sauber = FORTSCHRITT.normalisieren(stand);
        const level = Math.max(0, Math.floor(levelSchutz || 0));
        const grenze = FORTSCHRITT._istDatum(bisDatum) ? bisDatum : "9999-12-31";

        let tage = 0;
        let bis = "";
        let schutzImLauf = 0;
        for (const app of Object.keys(sauber.spiele)) {
            const z = sauber.spiele[app].zaehler;
            if (!FORTSCHRITT._istObjekt(z)) {
                continue;
            }
            const datum = FORTSCHRITT._zahlDatum(z.serieBis);
            const laenge = Math.floor(Number(z.serie) || 0);
            if (!datum || datum > grenze || laenge < 1) {
                continue;
            }
            if (datum > bis || (datum === bis && laenge > tage)) {
                bis = datum;
                tage = laenge;
                schutzImLauf = Math.max(0, Math.floor(Number(z.serieSchutz) || 0));
            }
        }

        let schildeFrei = FORTSCHRITT.schildVorrat(sauber);
        let verbraucht = 0;
        const danach = Array.from(FORTSCHRITT.alleTage(sauber))
            .filter((tag) => tag > bis && tag <= grenze).sort();
        for (const tag of danach) {
            if (!bis) {
                tage = 1;
                schutzImLauf = 0;
            } else {
                const luecke = FORTSCHRITT._tageZwischen(bis, tag) - 1;
                if (luecke === 0) {
                    tage++;
                } else if (luecke === 1 && schutzImLauf < level) {
                    tage++;
                    schutzImLauf++;
                } else if (luecke === 1 && schildeFrei > 0) {
                    tage++;
                    schutzImLauf++;
                    schildeFrei--;
                    verbraucht++;
                } else {
                    tage = 1;
                    schutzImLauf = 0;
                }
            }
            bis = tag;
        }
        return { tage: bis ? tage : 0, bis: bis, schutzImLauf: schutzImLauf,
            schildeFrei: schildeFrei, schildeVerbraucht: verbraucht };
    },

    /*
     * EINE RUNDE WURDE GESTARTET (seit v0.152.0): Der Tag zählt für die Serie.
     * Einmal je Tag und Spiel; sonst unverändert. Schreibt den Tag in `tage`
     * und den über beide Spiele gerechneten Serien-Stand in den eigenen
     * `zaehler` (serie, serieBis, serieSchutz; verbrauchte gekaufte Schilde
     * in `schildGenutzt`). Liefert { stand, neu, serie }.
     */
    rundeGestartet(stand, datum, zeitpunkt, app, schutz) {
        const sauber = FORTSCHRITT.normalisieren(stand);
        const name = app || FORTSCHRITT.APP;
        const zweig = sauber.spiele[name] || FORTSCHRITT.spielLeer();
        const zaehler = FORTSCHRITT._zaehlerAnlegen(zweig);
        const tageListe = Array.isArray(zweig.tage) ? zweig.tage : [];
        if (!FORTSCHRITT._istDatum(datum)
                || (tageListe.indexOf(datum) !== -1 && zaehler.serieBis === FORTSCHRITT._datumZahl(datum))) {
            return { stand: sauber, neu: false, serie: FORTSCHRITT.serie(sauber, datum, schutz).tage };
        }
        zweig.tage = tageListe.indexOf(datum) === -1 ? tageListe.concat([datum]) : tageListe;
        sauber.spiele[name] = zweig;
        const st = FORTSCHRITT.serieStand(sauber, schutz, datum);
        zaehler.serie = st.tage;
        zaehler.serieBis = FORTSCHRITT._datumZahl(st.bis);
        zaehler.serieSchutz = st.schutzImLauf;
        if (st.schildeVerbraucht > 0) {
            zaehler.schildGenutzt = (zaehler.schildGenutzt || 0) + st.schildeVerbraucht;
        }
        zweig.zaehler = zaehler;
        zweig.stand = Math.max(zweig.stand + 1, zeitpunkt || 0);
        sauber.spiele[name] = zweig;
        const neu = FORTSCHRITT.normalisieren(sauber);
        return { stand: neu, neu: true, serie: st.tage };
    },

    /*
     * Die Zähler eines Zweigs (seit v0.152.0), mit einmaligem Umzug: Bis
     * v0.151 standen in `tage` NUR Tage mit geschaffter Tagesaufgabe — das
     * Abzeichen „Tagesaufgaben" zählte sie dort. Seit `tage` auch gestartete
     * Runden trägt, zählt `zaehler.tagesaufgaben`; beim ersten Anlegen
     * übernimmt es die bisherige Zahl der Tage.
     */
    _zaehlerAnlegen(zweig) {
        const zaehler = Object.assign({}, FORTSCHRITT._istObjekt(zweig.zaehler) ? zweig.zaehler : {});
        if (typeof zaehler.tagesaufgaben !== "number") {
            zaehler.tagesaufgaben = (Array.isArray(zweig.tage) ? zweig.tage : [])
                .filter(FORTSCHRITT._istDatum).length;
        }
        return zaehler;
    },

    /* Serien-Schutz gibt es nicht mehr (seit v0.157.0, Nutzer 29.09.2026:
       „serien schild raus … soll nach einem lose nicht aufhaltbar sein") —
       immer 0, die Serie reisst ohne Rettung. Wie Typoluck. */
    schutzVerdient(level) {
        return 0;
    },

    /* ---------------------------------------------------------------- *
     * DER ÖFFENTLICHE AUSZUG (seit v0.154.0, Regel §12 —
     * Apps\UPCrew\docs\DATENBANK-KONZEPT-12.md, Abschnitt 3 und K3)
     *
     * Unter §12 lesen andere nur noch `spieler/oeffentlich/<uid>`, nicht mehr
     * den ganzen Fortschritt. Was fremde Bildschirme davon brauchen (Level-
     * Karte, die fünf Abzeichen), steht im Auszug:
     *
     *     { xp, serie, serieBis, werte: { partien, besteSerie, beideTage,
     *       figuren, tagesaufgaben } }
     *
     * `xp` = Summe aller Zweige; `serie` = laufende Serie am Tag `heute`,
     * `serieBis` = ihr letzter gezählter Tag als JJJJMMTT (0 ohne Serie);
     * `werte` = die fünf Zahlen des Abzeichen-Bausteins
     * (`UPCREW_ABZEICHEN.werte`, mit der laufenden Serie). Schon unter der
     * alten Regel rechnet Blunderluck fremdes Level und fremde Abzeichen über
     * diesen Auszug (`auszugVon`) — dieselbe Rechnung wie später.
     * Grenzen wie in der Regel (xp ≤ 1e8, serie ≤ 1e5, werte ≤ 1e9).
     * ---------------------------------------------------------------- */

    AUSZUG_WERTE: ["partien", "besteSerie", "beideTage", "figuren", "tagesaufgaben"],

    auszug(stand, heute, optionen) {
        const sauber = FORTSCHRITT.normalisieren(stand);
        const datum = FORTSCHRITT._istDatum(heute) ? heute : FORTSCHRITT.datumVon(Date.now());
        const schutz = FORTSCHRITT.schutzVerdient(FORTSCHRITT.level(sauber).level);
        const serie = FORTSCHRITT.serie(sauber, datum, schutz);
        const bis = serie.tage > 0
            ? FORTSCHRITT._datumZahl(FORTSCHRITT.serieStand(sauber, schutz, datum).bis) : 0;
        const roh = (typeof UPCREW_ABZEICHEN !== "undefined" && typeof UPCREW_ABZEICHEN.werte === "function")
            ? UPCREW_ABZEICHEN.werte(sauber, serie.tage) : {};
        const werte = {};
        for (const name of FORTSCHRITT.AUSZUG_WERTE) {
            werte[name] = FORTSCHRITT._zahl(roh[name], 1000000000);
        }
        /* Die Spielzeit nur, wenn der Spieler sie öffentlich zeigt (seit
           Blunderluck v0.155.0, `optionen.spielzeit`). */
        if (optionen && optionen.spielzeit === true) {
            werte.spielzeit = FORTSCHRITT.spielzeitSumme(sauber);
        }
        return {
            xp: FORTSCHRITT._zahl(FORTSCHRITT.gesamtXp(sauber), 100000000),
            serie: FORTSCHRITT._zahl(serie.tage, 100000),
            serieBis: bis,
            werte: werte
        };
    },

    /* Ein Auszug vom Server in Form — oder null, wenn keiner da ist. */
    auszugPruefen(roh) {
        if (!FORTSCHRITT._istObjekt(roh)) {
            return null;
        }
        const werte = {};
        const rohWerte = FORTSCHRITT._istObjekt(roh.werte) ? roh.werte : {};
        for (const name of FORTSCHRITT.AUSZUG_WERTE) {
            werte[name] = FORTSCHRITT._zahl(rohWerte[name], 1000000000);
        }
        if (typeof rohWerte.spielzeit === "number") {
            werte.spielzeit = FORTSCHRITT._zahl(rohWerte.spielzeit, FORTSCHRITT.SPIELZEIT_MAX);
        }
        const bis = FORTSCHRITT._zahl(roh.serieBis, 99991231);
        return {
            xp: FORTSCHRITT._zahl(roh.xp, 100000000),
            serie: FORTSCHRITT._zahl(roh.serie, 100000),
            serieBis: /^\d{8}$/.test(String(bis)) ? bis : 0,
            werte: werte
        };
    },

    /* Der Auszug eines Spieler-Eintrags: Liegt der volle `fortschritt` da
       (alte Regel, eigener Eintrag, Admin), wird aus ihm gerechnet; sonst
       gilt `auszug` vom Eintrag (§12, aus `spieler/oeffentlich`). */
    auszugVon(spieler, heute) {
        if (spieler && FORTSCHRITT._istObjekt(spieler.fortschritt)) {
            return FORTSCHRITT.auszug(spieler.fortschritt, heute);
        }
        return (spieler && FORTSCHRITT.auszugPruefen(spieler.auszug))
            || FORTSCHRITT.auszug(null, heute);
    },

    /* Level aus dem Auszug — dasselbe wie `level(stand)` am vollen Stand. */
    auszugLevel(auszug) {
        return FORTSCHRITT.levelAus(auszug ? auszug.xp : 0);
    },

    /* Die laufende Serie am Tag `heute`: sie lebt, solange ihr letzter Tag
       höchstens gestern war (einen Serien-Schutz kennt der Auszug nicht). */
    auszugSerie(auszug, heute) {
        if (!auszug || !auszug.serie || !auszug.serieBis) {
            return 0;
        }
        const datum = FORTSCHRITT._istDatum(heute) ? heute : FORTSCHRITT.datumVon(Date.now());
        const luecke = FORTSCHRITT._tageZwischen(FORTSCHRITT._zahlDatum(auszug.serieBis), datum);
        return (luecke >= 0 && luecke <= 1) ? auszug.serie : 0;
    },

    /* Ein Stand, aus dem `UPCREW_ABZEICHEN.werte` genau die fünf Werte des
       Auszugs liest (der Baustein bleibt unverändert, er kommt aus final). */
    auszugAlsStand(auszug) {
        const w = (auszug && auszug.werte) || {};
        return {
            version: 1,
            spiele: {
                auszug: {
                    xp: 0, partien: w.partien || 0, tage: [],
                    zaehler: {
                        besteSerie: w.besteSerie || 0, beideTage: w.beideTage || 0,
                        figuren: w.figuren || 0, tagesaufgaben: w.tagesaufgaben || 0
                    }
                }
            }
        };
    },

    /* ---------------------------------------------------------------- *
     * SPIELZEIT UND „DABEI SEIT" (seit Blunderluck v0.155.0, Nutzer
     * 28.09.2026: „log die zeit wie lange die app offen ist auf jedem
     * account" · „okay privat … auch bei gästen … sowohl als auch der start
     * datum" · „bis zur ersten stunde 0 bis 59 min danach 1h+ 2h …")
     *
     * Je Spiel ein Zähler im EIGENEN Zweig: `zaehler.spielzeit` (Sekunden,
     * nur solange die App sichtbar ist — das misst die App) und
     * `zaehler.seit` (JJJJMMTT des ersten gezählten Tages; beim
     * Zusammenführen gilt das frühere, `FRUEH_ZAEHLER`). Beides passt in
     * die Regel §11b (Zähler: Buchstaben-Name, Zahl bis 1e9). Ein einzelner
     * Schritt zählt höchstens `SPIELZEIT_SCHRITT_MAX` Sekunden (Ausreisser:
     * Ruhezustand, verstellte Uhr). Zwei Geräte zugleich: Es gilt der
     * grössere Zähler, nicht die Summe (wie bei allen Zählern).
     *
     * Öffentlich nur mit Haken — seit v0.155.2 AM KONTO (Feld
     * `spielzeitOeffentlich` des Eintrags, Nutzer 28.09.2026; Regel §14
     * lässt es nur den Besitzer ändern), gilt also auf jedem Gerät und in
     * jedem UPCrew-Spiel. Der Standard ist EINE Konstante.
     * ---------------------------------------------------------------- */

    SPIELZEIT_OEFFENTLICH_STANDARD: false,

    SPIELZEIT_SCHRITT_MAX: 120,

    SPIELZEIT_MAX: 315360000,

    /* `sekunden` sichtbare Zeit auf den Zweig `app` buchen. Liefert einen
       NEUEN Stand (unverändert bei 0 oder Unsinn). */
    spielzeitZaehlen(stand, sekunden, zeitpunkt, app) {
        const sauber = FORTSCHRITT.normalisieren(stand);
        const dazu = Math.min(FORTSCHRITT._zahl(sekunden, FORTSCHRITT.SPIELZEIT_MAX),
            FORTSCHRITT.SPIELZEIT_SCHRITT_MAX);
        const jetzt = (typeof zeitpunkt === "number" && isFinite(zeitpunkt)) ? zeitpunkt : Date.now();
        if (dazu <= 0) {
            return sauber;
        }
        const name = app || FORTSCHRITT.APP;
        const zweig = sauber.spiele[name] || FORTSCHRITT.spielLeer();
        const zaehler = FORTSCHRITT._zaehlerAnlegen(zweig);
        zaehler.spielzeit = Math.min(FORTSCHRITT._zahl(zaehler.spielzeit, FORTSCHRITT.SPIELZEIT_MAX) + dazu,
            FORTSCHRITT.SPIELZEIT_MAX);
        if (!(typeof zaehler.seit === "number" && zaehler.seit > 0)) {
            zaehler.seit = FORTSCHRITT._datumZahl(FORTSCHRITT.datumVon(jetzt));
        }
        zweig.zaehler = zaehler;
        zweig.stand = Math.max(zweig.stand + 1, jetzt);
        sauber.spiele[name] = zweig;
        return FORTSCHRITT.normalisieren(sauber);
    },

    /* Sekunden eines Spiels. */
    spielzeitVon(stand, app) {
        const zweig = FORTSCHRITT.normalisieren(stand).spiele[app || FORTSCHRITT.APP];
        return (zweig && FORTSCHRITT._istObjekt(zweig.zaehler))
            ? FORTSCHRITT._zahl(zweig.zaehler.spielzeit, FORTSCHRITT.SPIELZEIT_MAX) : 0;
    },

    /* Sekunden über alle Spiele. */
    spielzeitSumme(stand) {
        return Math.min(FORTSCHRITT._zaehlerSumme(stand, "spielzeit"), FORTSCHRITT.SPIELZEIT_MAX);
    },

    /* „dabei seit": das früheste `seit` aller Zweige als „JJJJ-MM-TT", sonst "". */
    seitVon(stand) {
        const sauber = FORTSCHRITT.normalisieren(stand);
        let frueh = 0;
        for (const app of Object.keys(sauber.spiele)) {
            const z = sauber.spiele[app].zaehler;
            const wert = FORTSCHRITT._istObjekt(z) ? FORTSCHRITT._zahl(z.seit, 99991231) : 0;
            if (wert > 0 && (frueh === 0 || wert < frueh)) {
                frueh = wert;
            }
        }
        return frueh ? FORTSCHRITT._zahlDatum(frueh) : "";
    },

    /* Die Anzeige: unter einer Stunde „N min" (0–59), sonst „Nh+" (volle
       Stunden abgerundet). */
    spielzeitText(sekunden) {
        const s = FORTSCHRITT._zahl(sekunden, FORTSCHRITT.SPIELZEIT_MAX);
        return s < 3600 ? Math.floor(s / 60) + " min" : Math.floor(s / 3600) + "h+";
    },

    /* Zeigt dieser Konto-Eintrag seine Spielzeit öffentlich? Das Feld
       `spielzeitOeffentlich` (Ja/Nein) am Konto, ohne Angabe der Standard. */
    spielzeitOeffentlichVon(eintrag) {
        return (eintrag && typeof eintrag.spielzeitOeffentlich === "boolean")
            ? eintrag.spielzeitOeffentlich : FORTSCHRITT.SPIELZEIT_OEFFENTLICH_STANDARD;
    }
};

/* Diese Glieder liefert das Spiel (siehe Kopf). Reihenfolge nach dem Alphabet. */
const FORTSCHRITT_KERN_ERWARTET = [
    "APP",
    "_zahl",
    "alleTage",
    "gesamtXp",
    "level",
    "levelAus",
    "normalisieren",
    "spielLeer"
];

if (typeof module !== "undefined" && module.exports) {
    module.exports = { FORTSCHRITT_KERN, FORTSCHRITT_KERN_ERWARTET };
}
