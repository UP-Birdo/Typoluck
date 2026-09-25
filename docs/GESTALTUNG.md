# Typoluck — Gestaltung

Womit gestaltet wird. **Keine zweite Wahrheit:** Die Werte stehen nur als
Variablen in `css\stil.css`; hier steht, was sie bedeuten und wann man
welche nimmt. Deshalb keine Farbcodes in dieser Datei.

## Die Farben

**Seit 0.7.0 kommen die Farben aus der UPCrew-Farbwelt** (UPCrew-Runde 2):
`js\upcrew-farbwelten.js` (kopiert aus `Design\3D-Schrift\final`, nie hier
abwandeln) rechnet aus einer Welt alle Oberflächen-, Kachel- und
Tasten-Variablen und setzt sie direkt an `<html>` — `DARSTELLUNG.anwenden`,
bei jedem Wechsel hell/dunkel. Welt vorerst fest **Werkstatt** (Orange);
freischaltbare Welten kommen in Runde 3. Welche Welt wie aussieht, zeigt
`Design\3D-Schrift\final\farbwelten-ansicht.html`. Nicht aus der Welt kommen
die Bedeutungsfarben (`--gefahr`, `--gut`, `--warnung-flaeche`) und die
violette Anmeldung.

Die Werte in `css\stil.css` sind nur noch **Rückfall** (falls der Baustein
fehlt). Dort ist jede Farbe dreimal da: hell (`:root`), dunkel (`@media
(prefers-color-scheme: dark)`) und dunkel fest (`[data-darstellung="dunkel"]`).
Wer eine ergänzt, ergänzt sie an allen drei Stellen — und bittet die
Design-Sitzung, sie auch in die Farbwelten aufzunehmen.

| Variable | Wofür |
|---|---|
| `--flaeche` | Grund der Seite |
| `--karte`, `--karte-leise` | Kästen auf dem Grund; leise = zurückgenommen (Felder, Listen) |
| `--rahmen` | Linien ohne Bedeutung |
| `--schrift`, `--schrift-leise` | Lesetext; Zusätze und Hinweise |
| `--haupt` | **Die eine Akzentfarbe (seit 0.7.0 der Akzent der Farbwelt, Werkstatt = Orange; 0.3.0–0.6.x Blau):** Hauptaktion, Punkte, Namenskreis, markiertes Feld (`--kachel-markiert`), aktiver Eintrag der Leiste |
| `--haupt-schrift` | Text auf `--haupt` |
| `--gefahr` | Nur Zerstörendes (Abmelden, Entfernen) |
| `--gut`, `--gut-flaeche` | Erfolg („erledigt", „Ihr seid Freunde") |
| `--warnung-flaeche` | Hinweisstreifen oben |
| `--kachel-richtig`, `--kachel-vorhanden`, `--kachel-falsch` | **Nur** die drei Bedeutungen im Wortspiel — nie für etwas anderes. Seit 0.6.2 Orange / Blau / Grau; **„richtig" nie grün, „vorhanden" nie gelb** (NYT-Look, auch für künftige Farbpakete — `DARSTELLUNG.kachelFarbeErlaubt`, Test in `tests\test-darstellung.js`) |
| `--taste`, `--taste-schrift` | Tastatur im Grundzustand |

**Blau (0.3.0–0.6.x), überholt seit 0.7.0 durch die Farbwelt.** Der Nutzer wollte hinter der Anmeldung dieselbe
Farbwelt wie Blunderluck (25.09.2026) — die Spiele von UPCrew sollen
zusammengehörig aussehen. Die Grundfarben sind 1:1 Blunderlucks Werte;
Kanten, Kacheln und Tasten sind daraus abgeleitet (neutrales Grau,
dunkleres Blau). Bis 0.2.1 war Typoluck violett, mit der Begründung „Blau
trägt Blunderluck, Violett macht die Schwester-App eigen" — das ist
überholt (`entscheidungen\entschieden.md`).

**Die Anmeldung bleibt violett.** Sie gehört dem Studio UPCrew, nicht dem
Spiel: `.anmeldung` setzt die Grundfarben für sich neu (Abschnitt
„Anmeldung" in `css\stil.css`, dreifach wie alle Farben). Ein Dialog über
der Anmeldung zeigt die Farben der App.

## Tiefe — die Naht für 3D

Seit 0.1.1 (3D Stufe 1): `--knopf-tiefe` 4px, `--kachel-tiefe` 3px. Knöpfe,
Tasten und Kacheln stehen auf einer Kante in einer dunkleren Fassung ihrer
Farbe und sinken beim Drücken um die Tiefe ein (Kacheln sinken nicht, sie
werden nicht gedrückt). Auf `0px` gesetzt ist alles wieder flach.

| Kante | gehört zu |
|---|---|
| `--haupt-kante` | Hauptknopf (blau) |
| `--still-kante` | stille Knöpfe |
| `--gefahr` | roter Knopf — die Kante ist die Rahmenfarbe selbst |
| `--taste-kante`, `--taste-aus-kante` | Taste normal / ausgeschlossen |
| `--kachel-richtig-kante`, `--kachel-vorhanden-kante`, `--kachel-falsch-kante` | aufgedeckte Kacheln und gleichfarbige Tasten |
| `--kachel-rahmen`, `--kachel-rahmen-voll` | leere / getippte Kachel |

Flache Knöpfe (`knopf-flach`, Menü-Einträge `knopf-menue`) haben keine Kante und sinken
deshalb auch nicht ein. Plan der nächsten Stufen: `ARCHITECTURE.md`, „3D".

## Abstände und Formen

| Variable | Bedeutung |
|---|---|
| `--abstand` | Standard-Abstand zwischen zusammengehörigen Dingen |
| `--rund-klein` | Rundung von Feldern, Buchstaben-Kacheln, Tasten, Chips, Balken |
| `--rund-mittel` | Rundung von Knöpfen, Karten, Dialogen, Menü (= Rundung des UPCrew-Zeichens) |
| `--rund-voll` | Pillen, Namens-Kreise, Zähler |
| `--karte-tiefe` | Harte Kante unter Karten, Menü, Dialog, Kurzmeldung |
| `--schrift-familie` | Die Schrift — die einzige Stelle, an der sie steht |
| `--inhalt-breite` | Höchstbreite des Inhalts (am Rechner mittig) |
| `--inhalt-rand` | Seitenrand am Handy |

## Knöpfe

| Klasse | Wann |
|---|---|
| `knopf-haupt` | **Die eine Hauptaktion des Bildschirms** |
| `knopf-still` | Alles Übrige |
| `knopf-gefahr` | Nur Zerstörendes |
| `knopf-flach` | Zeichen-Knöpfe in Kopfzeilen, Verweise („Ganze Rangliste") |
| `knopf-menue` | Die Einträge im Menü hinter den drei Balken (seit 0.3.0; bis 0.2.1 gab es `knopf-leiste` für die Leiste unten) |
| `knopf-klein`, `knopf-breit` | Zusatz für Zeilen bzw. volle Breite |

Alle entstehen in `BAUSTEINE.knopf` (`js\bausteine.js`).

## Zeichen

Eigene Linienzeichnungen im 24er-Raster, nur Striche (`BAUSTEINE.ZEICHEN`):
start, rangliste, freunde, profil, zurueck, menue (drei gleich lange
Balken), weiter, info, wordle, uebung, loeschen, aktualisieren, zahnrad,
stern. Kein Emoji, keine fremde Sammlung.

## Der UPCrew-Standard (seit 0.4.0)

Gemeinsam mit Blunderluck und Trainer: `..\UPCrew-STANDARD.md`. In
Typoluck heißt das:

- **Formen:** drei Rundungen (`--rund-klein` 8 px, `--rund-mittel` 14 px,
  `--rund-voll`), sonst keine; kein weicher Schatten, nur harte Kanten.
- **Text:** keine ganzen Sätze, keine Begrüßung, kein Lob-Wort. Zahlen statt
  Sätzen („3/6", „+4 Punkte"), Stichworte mit „·" getrennt. Die Spielregel
  und die Punkte sind Bilder (drei Kacheln, Punkte-Tafel).
- **Zustände** (`js\zustand.js`): Laden = graue, pulsierende Balken (bei
  „Bewegung reduzieren" still); Leer = Zeichen im runden Feld, höchstens
  drei Wörter, ein stiller Knopf; Fehler = durchgestrichenes Funknetz in
  Rot, „Nicht erreichbar" oder „Keine Antwort", Knopf „Nochmal".
- **Vibration** (`js\fuehlen.js`): tippen 8 ms; Erfolg und Fehler je ein
  eigenes Muster. Im Profil unter „Dieses Gerät" abschaltbar.
- **Schrift:** heute die Systemschrift als Rückfall; die eigene, runde
  Schrift wählt der Nutzer nach Bild.

## Das Menü hinter den drei Balken (seit 0.3.0)

Nachgebaut nach Blunderlucks Menüband: oben rechts auf dem Start ein
flacher Knopf mit drei gleich langen Balken, darunter ein abgerundetes Feld
(`--rund-mittel`, seit 0.4.0 harte Kante statt weicher Schatten), je Eintrag das Zeichen links (leise)
und das Wort rechts. Einträge: Profil, Freunde, Rangliste — in der
Reihenfolge, in der sich die Bildschirme in `js\app.js` anmelden. Offene
Freundesanfragen stehen als rote Zahl am Knopf (Summe) und am Eintrag.
Kurzes Einblenden, ausser bei „Bewegung reduzieren".

## Das markierte Wordle-Feld (seit 0.3.0)

In der Zeile, in die getippt wird, trägt das markierte Feld Rahmen und
Kante in `--kachel-markiert` (= `--haupt`). Dorthin kommt der nächste
Buchstabe.

## Ebenen

`--ebene-menue` (das aufgeklappte Menü) < `--ebene-hinweis` < `--ebene-kurzmeldung` <
`--ebene-vollbild` (Anmeldung) < `--ebene-intro` < `--ebene-dialog`. Nie eine eigene Zahl.

## Bewegung

Tipp (Kachel springt kurz), Aufdecken (320 ms je Kachel, 160 ms Versatz —
müssen zu `js\bildschirm-wordle.js` passen), Wackeln bei ungültigem Wort,
Hüpfen beim Gewinn. Wer im System „Bewegung reduzieren" eingestellt hat,
bekommt keine.

## Das UPCrew-Intro

Das Studio-Zeichen, mit dem jede UPCrew-App beginnt. **Seit 0.6.1 ein
gemeinsamer Baustein:** `js\upcrew-intro.js` und `css\upcrew-intro.css`,
unverändert kopiert aus `Design\3D-Schrift\final\` — dort wird er gestaltet
und geändert (Aussehen: `Design\3D-Schrift\docs\GESTALTUNG.md` Abschnitt 10,
Einbau: `Design\3D-Schrift\docs\EINBAU-INTRO.md`). **Hier nie abwandeln**,
sondern dort ändern und neu kopieren. `js\intro.js` ist nur der Anpasser:
Er sagt dem Baustein hell oder dunkel, Nummer „02", Name und Version.

- **Immer dunkel UND hell:** Das Intro folgt der Darstellung der App
  (Einstellung Hell/Dunkel, sonst das Gerät). Die frühere Regel „Studio-Farben
  ohne helle Fassung" gilt nicht mehr.
- **Sechs Arten (A–F) rotieren:** Jeder Start zeigt die nächste. Der Zähler
  (`upcrew.intro-zaehler` im Browser-Speicher) ist für alle UPCrew-Apps auf
  `up-birdo.github.io` derselbe; als Home-Bildschirm-App zählt jede für sich.
- **Farbwelt Werkstatt-Orange ist Standard**; das bisherige Violett ist die
  Farbwelt „Studio" (später freischaltbar, `upcrew.farbwelt`). Die Farbwelt
  rotiert nie.
- **Bei jedem Start**, 1,7 bis 4,65 s je Art plus 0,7 s stehen, 0,4 s
  ausblenden; Antippen oder eine Taste überspringt; „Bewegung reduzieren"
  zeigt 1,2 s das Endbild. Schrift: Systemschrift-Monospace, kein Netz.
- Ebene über `--ebene-intro` (55) aus `css\stil.css` — die einzige Variable,
  die der Baustein von der App liest.

## Schrift

16 px, gleich breite Ziffern. Die Familie steht nur in `--schrift-familie`
(heute Systemschrift). Kommt die eigene Schrift (UPCrew-Standard), liegt sie
als woff2 im Projekt und im Service Worker — die App soll ohne Netz
vollständig aussehen. Kacheln fett und in Grossbuchstaben.
