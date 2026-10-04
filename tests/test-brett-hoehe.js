/*
 * test-brett-hoehe.js — sechs Brett-Zeilen passen in der Runde ohne Rollen
 * (seit 0.33.0; Fund des Laufs 0.32.0: bei 360 × 640 bekam das Brett 380 px,
 * sechs Zeilen brauchten 398 — die Kacheln waren allein aus der Breite
 * gerechnet).
 *
 * Der Test liest die ECHTE Regel aus css\stil-wordle.css, nimmt ihre Zahlen
 * und rechnet nach, was der Browser daraus macht: Für jede Höhe, die das
 * Brett bekommt, passen sechs Zeilen samt Lücken hinein — oder die Kachel
 * ist an ihrer Untergrenze (dann rollt das Brett wie früher). Ob der Browser
 * wirklich so zeichnet, zeigt nur der Browser (gemessen 04.10.2026 bei
 * 360 × 640, 360 × 606, 320 × 568 und 390 × 844 — STATUS.md).
 */

const fs = require("fs");
const pfad = require("path");
const { pruefe, gleich, fazit } = require("./pruefer.js");

const stil = fs.readFileSync(pfad.join(__dirname, "..", "css", "stil-wordle.css"), "utf8");
const ohneKommentar = stil.replace(/\/\*[\s\S]*?\*\//g, "");

/* Das Brett in der Runde: Mass-Behälter, rollt nur noch im Notfall. */
const brett = /body\.im-spiel \.wordle > \.wordle-brett \{([^}]*)\}/.exec(ohneKommentar);
pruefe("Die Regel für das Brett in der Runde steht da", !!brett);
const brettText = brett ? brett[1] : "";
pruefe("Das Brett ist ein Mass-Behälter (seine Zeilen kennen seine Höhe)", /container-type: size;/.test(brettText));
pruefe("… es füllt den Platz zwischen Kopf und Tastatur und darf im Notfall weiter rollen (siebte Zeile)",
    /flex: 1 1 auto;/.test(brettText) && /min-height: 0;/.test(brettText) && /overflow-y: auto;/.test(brettText));
const innen = /padding: (\d+)px (\d+)px (\d+)px;/.exec(brettText);
pruefe("… mit festem Innenabstand", !!innen);

/* Die Zeile: Breite aus der Höhe des Bretts. */
const zeile = /body\.im-spiel \.wordle > \.wordle-brett > \.wordle-zeile \{([^}]*)\}/.exec(ohneKommentar);
pruefe("Die Regel für die Zeile in der Runde steht da", !!zeile);
const zeileText = zeile ? zeile[1] : "";
const formel = /width: min\(100%, max\((\d+)px, calc\(\(100cqh - (\d+)px - (\d+) \* (\d+)px\) \/ (\d+) \* (\d+) \+ (\d+) \* (\d+)px\)\)\);/
    .exec(zeileText);
pruefe("… ihre Breite richtet sich nach der Höhe des Bretts (cqh), mit Untergrenze", !!formel, zeileText);
pruefe("… davor steht die Breite für Browser ohne cqh (100 %, wie bis 0.32.0)",
    /width: 100%;\s*width: min\(/.test(zeileText));
pruefe("… und die Zeile steht mittig", /justify-self: center;/.test(zeileText));

if (formel && innen) {
    const [, minBreite, luft, lueckenZahl, lueckeHoch, zeilenZahl, spalten, spaltLuecken, lueckeBreit] = formel.map(Number);
    gleich("Die Zahlen der Formel: 6 Zeilen, 5 Lücken von 6 px, 5 Spalten, 4 Lücken von 6 px",
        [zeilenZahl, lueckenZahl, lueckeHoch, spalten, spaltLuecken, lueckeBreit], [6, 5, 6, 5, 4, 6]);

    /* Die Lücken der Formel sind die des Bretts und der Zeile. */
    const brettGrund = /\.wordle-brett \{([^}]*)\}/.exec(ohneKommentar)[1];
    const zeileGrund = /\.wordle-zeile \{([^}]*)\}/.exec(ohneKommentar)[1];
    gleich("… dieselben Lücken wie im Brett und in der Zeile (gap)",
        [/gap: (\d+)px;/.exec(brettGrund)[1], /gap: (\d+)px;/.exec(zeileGrund)[1]], [String(lueckeHoch), String(lueckeBreit)]);
    const brettBreiteMax = Number(/width: min\(100%, (\d+)px\);/.exec(brettGrund)[1]);

    /* Was der Browser rechnet: `hoehe` = Höhe des Bretts (Rand zu Rand),
       `breite` = Breite des Bildschirms. Liefert Kachel und Platzbedarf. */
    const rechnen = (hoehe, bildschirmBreite) => {
        const oben = Number(innen[1]);
        const seitlich = Number(innen[2]);
        const unten = Number(innen[3]);
        const inhaltHoehe = hoehe - oben - unten;                          /* = 100cqh */
        const brettBreite = Math.min(bildschirmBreite - 32, brettBreiteMax);  /* 16 px Rand je Seite */
        const inhaltBreite = brettBreite - 2 * seitlich;                   /* = 100 % */
        const ausHoehe = (inhaltHoehe - luft - lueckenZahl * lueckeHoch) / zeilenZahl * spalten + spaltLuecken * lueckeBreit;
        const zeileBreite = Math.min(inhaltBreite, Math.max(minBreite, ausHoehe));
        const kachel = (zeileBreite - spaltLuecken * lueckeBreit) / spalten;
        const bedarf = zeilenZahl * kachel + lueckenZahl * lueckeHoch;
        return { kachel: Math.round(kachel * 10) / 10, passt: bedarf <= inhaltHoehe, bedarf: bedarf, platz: inhaltHoehe };
    };

    /* Die gemessenen Fälle (Höhe des Bretts aus dem Browser, 04.10.2026). */
    gleich("360 × 640 (Brett 380 px hoch): sechs Zeilen passen, Kachel 56,7 px (bis 0.32.0: 60 px, 18 px zu viel)",
        [rechnen(380, 360).passt, rechnen(380, 360).kachel], [true, 56.7]);
    gleich("360 × 640 mit Kerbe 34 px (Brett 346): passt, Kachel 51 px", [rechnen(346, 360).passt, rechnen(346, 360).kachel], [true, 51]);
    gleich("360 × 640 mit Uhr (Brett 339): passt", rechnen(339, 360).passt, true);
    gleich("360 × 640 beim Boss mit Chips und Tipp-Knöpfen (Brett 280): passt, Kachel 40 px",
        [rechnen(280, 360).passt, rechnen(280, 360).kachel], [true, 40]);
    gleich("320 × 568 (Brett 308): passt", rechnen(308, 320).passt, true);
    gleich("390 × 844 (Brett 584): wie bisher aus der BREITE, Kachel 60,4 px", [rechnen(584, 390).passt, rechnen(584, 390).kachel],
        [true, 60.4]);

    /* Jede Höhe: passt — oder die Kachel steht an ihrer Untergrenze. */
    const untergrenze = (minBreite - spaltLuecken * lueckeBreit) / spalten;
    gleich("Die Untergrenze der Kachel: 36 px", untergrenze, 36);
    let schlecht = [];
    for (let hoehe = 120; hoehe <= 900; hoehe++) {
        for (const breite of [320, 360, 390, 412, 768]) {
            const r = rechnen(hoehe, breite);
            if (!r.passt && r.kachel > untergrenze + 0.05) {
                schlecht.push(breite + "x" + hoehe);
            }
        }
    }
    gleich("Für JEDE Bretthöhe von 120 bis 900 px und jede Breite: sechs Zeilen passen, oder die Kachel ist schon 36 px klein",
        schlecht.slice(0, 5), []);
    const kleinste = (() => {
        for (let hoehe = 120; hoehe <= 900; hoehe++) {
            if (rechnen(hoehe, 360).passt) {
                return hoehe;
            }
        }
        return null;
    })();
    /* 6 · 36 + 5 · 6 = 246 px Zeilen + 8 px Innenabstand. */
    gleich("Ab 254 px Bretthöhe rollt bei sechs Zeilen nichts mehr (darunter wie früher)", kleinste, 254);
}

/* Die Tastatur bleibt, wie sie war (fest unten, wird nie gedrückt). */
pruefe("Die Tastatur wird in der Runde nicht gedrückt (flex: none)",
    /body\.im-spiel \.wordle > \.wordle-uhr,\s*body\.im-spiel \.wordle > \.wordle-tipps,\s*body\.im-spiel \.wordle > \.tastatur \{\s*flex: none;/
        .test(ohneKommentar));

/*
 * Das Ende bei geringer Höhe (seit 0.34.5, Rauchprobe 0.34.3 Auffällig 3):
 * gemessen bei 360 × 640 (Leiste ab 576 px) — vorher Knopf zum Weitergehen
 * bei 693–906 px, nachher 474–558 px; bei 390 × 844 unverändert (Karte als
 * Block, Brett 330 px). Hier nur: die Regel gilt bis 800 px Höhe, nur nach
 * der Runde, und ihre Brett-Breite.
 */
{
    const block = /@media \(max-height: 800px\) \{([\s\S]*?)\n\}/.exec(ohneKommentar);
    pruefe("Das Ende bei geringer Höhe: eine Regel bis 800 px Höhe (390 × 844 bleibt)", !!block);
    const text = block ? block[1] : "";
    const breite = /body:not\(\.im-spiel\) \.wordle > \.wordle-brett \{\s*width: min\(100%, (\d+)px, max\((\d+)px, calc\(\(100dvh - (\d+)px\) \/ 6 \* 5 \+ 24px\)\)\);\s*\}/
        .exec(text);
    pruefe("… das Brett nach der Runde (nie in der Runde) richtet sich nach der Höhe", !!breite, text.slice(0, 200));
    if (breite) {
        const [, max, min, abzug] = breite.map(Number);
        const brettBreite = (h, w) => Math.min(w - 32, max, Math.max(min, (h - abzug) / 6 * 5 + 24));
        const kachel = (b) => Math.round((b - 24) / 5 * 10) / 10;
        gleich("… nie breiter als bisher (330 px), nie Kacheln unter 36 px", [max, (min - 24) / 5], [330, 36]);
        gleich("… 360 × 640: Kachel 44 px (vorher 60,8)", kachel(brettBreite(640, 360)), 44);
        gleich("… ab 800 px Höhe wie bisher (nach Breite)", [brettBreite(800, 360), brettBreite(800, 390)], [328, 330]);
    }
    pruefe("… in der Karte stehen Ergebnis, Herzen, Lösung, Punkte oben (order 0), der Knopf danach (1), der Rest darunter",
        /\.wordle > \.wordle-ende \{\s*display: flex;\s*flex-direction: column;/.test(text)
            && /\.wordle > \.wordle-ende > \* \{\s*order: 3;/.test(text)
            && /\.wordle-ende-titel,[\s\S]*?\.bib-herzen,[\s\S]*?\.wordle-ende-loesung,[\s\S]*?\.wordle-ende-punkte \{\s*order: 0;/.test(text)
            && /\.wordle > \.wordle-ende > button \{\s*order: 1;/.test(text));
    pruefe("… die Regel trifft nur die Karte im Spiel (.wordle > .wordle-ende), nicht „Gespielt · anderes Gerät“",
        !/(^|[\s,])\.wordle-ende[\s{>]/.test(text.replace(/\.wordle > \.wordle-ende/g, "")));
}

fazit();
