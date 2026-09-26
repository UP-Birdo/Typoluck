# Typoluck — Architektur

Wie die App gebaut ist. Das Warum einzelner Entscheidungen steht in
[entscheidungen/entschieden.md](entscheidungen/entschieden.md).

## Die Dateien

In der Ladereihenfolge aus `index.html` (dieselbe steht in `sw.js`):

| Datei | Schicht | Zweck |
|---|---|---|
| `js\konfig.js` | Einstellung | Version, Datenbank-Adresse, Pfade — die einzige Datei zum Anpassen |
| `js\versiegelung.js` | Modell | Passwort-Prüfsumme, **in allen UPCrew-Spielen gleich** |
| `js\spieler.js` | Modell | Die **geteilten** UPCrew-Konten: Freundschaft, Zusammenführen |
| `js\ich.js` | Gerät | Wer hier angemeldet ist, angefangene Runden, Warteliste |
| `js\speicher.js` | Leitung | Lokal oder Firebase-REST, gleiche Schnittstelle, Zeitlimits |
| `js\abgleich.js` | Leitung | Hält die Spielerliste mit dem Server zusammen (Marke, Zusammenführen) |
| `js\woerter-de.js` | Daten | Lösungs- und Zusatzwörter, Tagesplan |
| `js\wordle.js` | Modell | Die Spielregeln: bewerten, raten, Tageswort, Muster |
| `js\ergebnisse.js` | Modell + Leitung | Was von einer Runde in die Datenbank kommt, Warteliste |
| `js\rangliste.js` | Modell | Punkte, Tabellen, Statistik, Serie |
| `js\bausteine.js` | Oberfläche | Knopf, Karte, Kopfzeile, Segment, Zeichen — **die 3D-Naht** |
| `js\zustand.js` | Oberfläche | Laden, Leer, Fehler — je ein festes Bild statt eines Satzes (UPCrew-Standard, seit 0.4.0) |
| `js\upcrew-farbwelten.js` | Oberfläche | Die UPCrew-Farbwelten → Farb-Variablen an `<html>` (seit 0.7.0; gemeinsamer Baustein, kopiert aus `Design\3D-Schrift\final`, hier nie abwandeln; lädt mit `upcrew-intro.js` VOR `darstellung.js`) |
| `js\upcrew-aussehen.js` | Oberfläche | **Ein Aussehen für alle UPCrew-Spiele** (seit 0.8.0): hell/dunkel, Farbwelt, Schrift, Knöpfe, Standard-Schrift unter `upcrew.aussehen`; zieht Blunderluck im selben Browser mit (gemeinsamer Baustein, kopiert, nie abwandeln) |
| `js\darstellung.js` | Oberfläche | Typolucks Anschluss an `upcrew-aussehen.js` (seit 0.8.0 ohne eigene Werte; einmaliger Umzug der alten Wahl; früher Aufruf beim Laden), Kachelfarben-Sperre (NYT-Look) |
| `js\upcrew-anpassen.js` | Oberfläche | Der Tab „Anpassen" samt Vorschau und Freischalt-Stufen (seit 0.8.0; gemeinsamer Baustein, kopiert, nie abwandeln; Stil `css\upcrew-anpassen.css`) |
| `js\aussehen-abgleich.js` | Leitung | Das Aussehen am UPCrew-Konto: `konten/<uid>/aussehen` senden und holen, still bei Fehler (seit 0.8.0) |
| `js\dialog.js` | Oberfläche | Eigene Dialoge und Kurzmeldung |
| `js\navigation.js` | Oberfläche | Bildschirme, Menü hinter den drei Balken (seit 0.3.0), Leiste unten (seit 0.5.0; seit 0.8.0 fünf Plätze), Zurück-Taste |
| `js\anmeldung.js` | Bildschirm | Anmelde-Vollbild, Konto anlegen, Name/Passwort ändern |
| `js\bildschirm-start.js` | Bildschirm | Start mit Spiel-Kacheln und „Heute bei deinen Freunden" |
| `js\bildschirm-wordle.js` | Bildschirm | Brett, Tastatur, Aufdecken, Ende |
| `js\bildschirm-rangliste.js` | Bildschirm | Heute / 7 Tage, Alle / Freunde |
| `js\bildschirm-freunde.js` | Bildschirm | Anfragen, Freunde, Suche |
| `js\bildschirm-profil.js` | Bildschirm | Spieler und Statistik |
| `js\bildschirm-einstellungen.js` | Bildschirm | Wortspiel, dieses Gerät, UPCrew-Konto, Über Typoluck (seit 0.5.0) |
| `js\bildschirm-herausforderungen.js` | Bildschirm | Tab „Aufgaben": vorerst Platzhalter „Kommt bald" (seit 0.7.0; Pfad und Inventar kommen später) |
| `js\bildschirm-anpassen.js` | Bildschirm | Tab „Anpassen" ganz rechts in der Leiste: Kopfzeile + Baustein, Stufe 0 bis es den Pfad gibt (seit 0.8.0) |
| `js\wunsch.js` | Oberfläche | Wunsch-/Fehler-Knopf → GitHub-Formular |
| `js\werkstatt.js` | Werkzeug | Testzustand für Bildschirmfotos (`?werkstatt`), sonst untätig |
| `js\upcrew-intro.js` | Oberfläche | Das UPCrew-Studio-Intro samt den Grundfarben der Farbwelten (gemeinsamer Baustein, kopiert aus `Design\3D-Schrift\final`, hier nie abwandeln; Stil `css\upcrew-intro.css`; lädt seit 0.7.0 früh, vor `darstellung.js`) |
| `js\intro.js` | Oberfläche | Anpasser für Typoluck: bei jedem Start, hell/dunkel wie die App, Werkstatt-Schalter `&intro` |
| `js\app.js` | Start | Verbindet alles, hält den eigenen Verlauf |
| `css\stil.css` | Aussehen | Variablen (Farben, Tiefe, Ebenen), Knöpfe, Karten, Dialoge, Anmeldung |
| `css\stil-bildschirme.css` | Aussehen | Start, Rangliste, Freunde, Profil |
| `css\stil-wordle.css` | Aussehen | Brett, Kacheln, Tastatur, Bewegungen |
| `css\upcrew-knoepfe.css` | Aussehen | Die Knopf-Familien K1–K6 für alle `up-kn`-Knöpfe (seit 0.8.0; kopiert, nie abwandeln; lädt NACH dem eigenen Stil) |
| `schrift\` | Aussehen | Die zwölf Crew-Schriften (woff2) samt `LIZENZ.txt` (seit 0.8.0; kopiert aus `Design\3D-Schrift\final\schrift`, im Service Worker) |
| `sw.js` | Offline | Service Worker (Dateiliste + Versionsnummer) |
| `tools\` | Werkzeuge | Start, Tests, Deploy, Icons, Wünsche |
| `tests\` | Tests | siehe `tests\README.md` |

**Die Schichten wissen nur nach unten.** Modell-Dateien kennen kein DOM und
kein Netz (Ausnahme: `ergebnisse.js` bekommt die Leitung als Argument). Die
Bildschirme fragen das Modell und zeigen an.

## Die Datenbank

Die Firebase Realtime Database des Studios UPCrew (`upcrew-7a29d`,
europe-west1) — sie gehört keinem Spiel. Zwei Knoten betreffen Typoluck:

    spieler                    UPCrew-Konten, GETEILT mit allen Spielen — js\spieler.js
    typoluck                   gehört nur Typoluck — Aufbau: js\ergebnisse.js
    ├── geaendertAm
    └── wordle
        ├── tage/<datum>/<spielerId>      ERGEBNIS   (Rangliste des Tages)
        └── verlauf/<spielerId>/<datum>   ERGEBNIS   (Profil)

Andere Spiele bekommen daneben ihren eigenen Knoten; Typoluck fasst fremde
Spiel-Knoten nie an.

**Was wie geschrieben wird:**

- **Spielerliste:** immer ganz (PUT), vorher mit dem Server-Stand
  zusammengeführt — der eigene Eintrag vom Gerät, alles andere vom Server.
  Ohne Server-Kontakt wird NICHT geschrieben (die Änderung bleibt offen und
  wird wiederholt). Grund: Ein alter Stand würde in beiden Apps Spieler
  löschen.
- **Ergebnisse:** eine Mehrpfad-Änderung (PATCH) mit genau drei Pfaden —
  Tag, Verlauf, Marke. Jeder schreibt nur seine eigenen Knoten.

**Was wie gelesen wird:**

- Spielerliste: beim Start, dann alle 5 Sekunden die Marke (13 Bytes); die
  Liste nur, wenn die Marke sich bewegt hat.
- Rangliste: `tage/<heute>` bzw. die letzten 7 Tage, beim Öffnen und auf
  Knopfdruck — kein Dauer-Abgleich.
- Profil: `verlauf/<id>`, beim Öffnen (gilt eine halbe Minute).

**Wachstum:** Je Spieler und Tag ein Ergebnis von rund 150 Bytes, zweimal
gespeichert. Zehn Spieler ein Jahr lang: rund 1 MB. Keine Abfrage lädt je
den ganzen Knoten `typoluck`.

## Der Ablauf einer Tagesrunde

1. Start zeigt „Tageswort Nr. N wartet auf dich" (`START.SPIELE[…].tagesStand`).
2. Wordle-Bildschirm: `WORDLE.tageswort(heute)` bestimmt das Wort — auf
   jedem Gerät gleich, ohne Server. Angefangene Versuche liegen im
   Gerätespeicher (`ICH.spielstand("wordle-tag")`).
3. Jeder Versuch: `WORDLE.raten` → neue Runde → merken → Zeile aufdecken.
4. Ende: `APP.ergebnisMelden` → `ERGEBNISSE.melden`: erst in die Warteliste
   des Geräts, dann senden. Scheitert das, bleibt es liegen und geht beim
   nächsten Start raus (`ERGEBNISSE.nachreichen` in `APP._beiAngemeldet`).
5. Auf einem zweiten Gerät erkennt die App über den eigenen Verlauf
   (`APP.eigenesErgebnis`), dass heute schon gespielt wurde.

## Das Tageswort

`index = (tag * schritt + versatz) mod anzahl` — `tag` zählt ab dem Beginn
des Planabschnitts, `schritt` ist eine Primzahl teilerfremd zu `anzahl`. So
kommt jedes Wort genau einmal dran, bevor sich eines wiederholt. Die Regeln
für Erweiterungen stehen im Kopf von `js\woerter-de.js`; der Test hält das
Wort von Tag 1 und 2 für immer fest.

## Neues Spiel anlegen

1. Modell-Datei `js\<spiel>.js` (Regeln, ohne DOM), Tests dazu.
2. Bildschirm `js\bildschirm-<spiel>.js` mit `anmelden()` bei NAVIGATION
   (`imMenue: false` — ins Menü hinter den drei Balken kommen nur
   Profil, Freunde, Rangliste).
3. Eintrag in `START.SPIELE` (Name, Zeichen, `tagesName`, `tagesStand`).
4. Ergebnisse unter `typoluck/<spiel>/…` — eigener Unterbaum, dieselbe
   Regel „jeder schreibt nur seine Knoten".
5. `index.html`, `sw.js`, `APP.starten` (anmelden) ergänzen.

## 3D — wie es andockt

Nutzer-Ansage 24.09.2026: erst 2D, dann 3D-Knöpfe und mehr. Vorbereitet
ist, ohne etwas auf Vorrat zu bauen:

- **Stufe 1 — Tiefe per Stil. Gebaut in 0.1.1.** Alle Knöpfe und Tasten
  tragen `box-shadow: 0 var(--knopf-tiefe) 0 <Kantenfarbe>` und sinken beim
  Drücken um `--knopf-tiefe` ein; die Kacheln entsprechend `--kachel-tiefe`
  (4px / 3px, ohne JavaScript). Welche Kante zu welcher Fläche gehört:
  `docs\GESTALTUNG.md`, „Tiefe". Falle: Eine Knopf-Art, deren Regeln in
  `stil.css` VOR `.knopf` stehen, verliert gegen dessen Regeln — deshalb
  stehen die Menü-Einträge (seit 0.3.0) als `.knopf.knopf-menue` da (bis
  0.2.1 galt dasselbe für `.knopf-leiste`).
- **Stufe 2 — echte Formen.** Jeder Knopf entsteht in `BAUSTEINE.knopf`,
  jede Kachel in `WORDLE_BILDSCHIRM._kachelBauen`, jede Taste in
  `_tasteBauen`. Dort bekommt der Knopf später ein gerendertes Bild (Blender
  über den Render-Stick, wie bei Blunderluck) oder eine three.js-Fläche. Die
  Bildschirme merken davon nichts.
- **Stufe 3 — 3D-Brett.** Vorbild ist Blunderlucks `brett-3d.js`: ein Modul,
  das das fertige 2D-Brett LIEST und darüber zeichnet; Tipps auf die 3D-
  Fläche klicken den passenden 2D-Knopf. Keine zweite Regel-Rechnung. Die
  Aufdeck-Bewegung und das Muster kommen dafür schon als Klassen
  (`kachel-aufdecken`, `kachel-jubel`) aus einer Stelle.

Welche Stufe wann kommt, steht in der [ROADMAP](../ROADMAP.md).

## Code-Konventionen

- Ein Objekt je Datei, GROSS geschrieben (`WORDLE`, `START`), Bezeichner
  ohne Umlaute, Kommentare und Texte mit.
- Modell-Funktionen liefern NEUE Stände, sie ändern nie den übergebenen.
- Jede Modell-Datei endet mit dem `module.exports`-Block, damit die Tests
  sie laden können.
- Einzug 4 Leerzeichen; PowerShell-Skripte ASCII, weil PowerShell 5.1
  Dateien ohne BOM als ANSI liest.
