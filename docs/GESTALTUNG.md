# Typoluck — Gestaltung

Womit gestaltet wird. **Keine zweite Wahrheit:** Die Werte stehen nur als
Variablen in `css\stil.css`; hier steht, was sie bedeuten und wann man
welche nimmt. Deshalb keine Farbcodes in dieser Datei.

## Die Farben

Jede Farbe ist dreimal da: hell (`:root`), dunkel (`@media
(prefers-color-scheme: dark)`) und dunkel fest (`[data-darstellung="dunkel"]`,
für Werkstatt-Fotos). Wer eine ergänzt, ergänzt sie an allen drei Stellen.

| Variable | Wofür |
|---|---|
| `--flaeche` | Grund der Seite |
| `--karte`, `--karte-leise` | Kästen auf dem Grund; leise = zurückgenommen (Felder, Listen) |
| `--rahmen` | Linien ohne Bedeutung |
| `--schrift`, `--schrift-leise` | Lesetext; Zusätze und Hinweise |
| `--haupt` | **Die eine Akzentfarbe (Violett):** Hauptaktion, aktiver Leisten-Eintrag, Punkte, Namenskreis |
| `--haupt-schrift` | Text auf `--haupt` |
| `--gefahr` | Nur Zerstörendes (Abmelden, Entfernen) |
| `--gut`, `--gut-flaeche` | Erfolg („erledigt", „Ihr seid Freunde") |
| `--warnung-flaeche` | Hinweisstreifen oben |
| `--kachel-richtig`, `--kachel-vorhanden`, `--kachel-falsch` | **Nur** die drei Wordle-Bedeutungen — nie für etwas anderes |
| `--taste`, `--taste-schrift` | Tastatur im Grundzustand |

**Warum Violett:** Grün und Gelb sind im Spiel belegt (richtig / kommt vor),
Rot heisst Gefahr, Blau trägt Blunderluck. Violett ist frei, beisst sich mit
keiner Spielfarbe und macht die Schwester-App erkennbar eigen.

## Tiefe — die Naht für 3D

Seit 0.1.1 (3D Stufe 1): `--knopf-tiefe` 4px, `--kachel-tiefe` 3px. Knöpfe,
Tasten und Kacheln stehen auf einer Kante in einer dunkleren Fassung ihrer
Farbe und sinken beim Drücken um die Tiefe ein (Kacheln sinken nicht, sie
werden nicht gedrückt). Auf `0px` gesetzt ist alles wieder flach.

| Kante | gehört zu |
|---|---|
| `--haupt-kante` | Hauptknopf (violett) |
| `--still-kante` | stille Knöpfe |
| `--gefahr` | roter Knopf — die Kante ist die Rahmenfarbe selbst |
| `--taste-kante`, `--taste-aus-kante` | Taste normal / ausgeschlossen |
| `--kachel-richtig-kante`, `--kachel-vorhanden-kante`, `--kachel-falsch-kante` | aufgedeckte Kacheln und gleichfarbige Tasten |
| `--kachel-rahmen`, `--kachel-rahmen-voll` | leere / getippte Kachel |

Flache Knöpfe (Leiste unten, `knopf-flach`) haben keine Kante und sinken
deshalb auch nicht ein. Plan der nächsten Stufen: `ARCHITECTURE.md`, „3D".

## Abstände und Formen

| Variable | Bedeutung |
|---|---|
| `--abstand` | Standard-Abstand zwischen zusammengehörigen Dingen |
| `--radius` | Rundung von Karten und Knöpfen |
| `--inhalt-breite` | Höchstbreite des Inhalts (am Rechner mittig) |
| `--inhalt-rand` | Seitenrand am Handy |
| `--leiste-hoehe` | Platz, den die Leiste unten braucht |

## Knöpfe

| Klasse | Wann |
|---|---|
| `knopf-haupt` | **Die eine Hauptaktion des Bildschirms** |
| `knopf-still` | Alles Übrige |
| `knopf-gefahr` | Nur Zerstörendes |
| `knopf-flach` | Zeichen-Knöpfe in Kopfzeilen, Verweise („Ganze Rangliste") |
| `knopf-leiste` | Die vier Einträge der Leiste unten |
| `knopf-klein`, `knopf-breit` | Zusatz für Zeilen bzw. volle Breite |

Alle entstehen in `BAUSTEINE.knopf` (`js\bausteine.js`).

## Zeichen

Eigene Linienzeichnungen im 24er-Raster, nur Striche (`BAUSTEINE.ZEICHEN`):
start, rangliste, freunde, profil, zurueck, weiter, info, wordle, uebung,
loeschen, aktualisieren, zahnrad, stern. Kein Emoji, keine fremde Sammlung.

## Ebenen

`--ebene-leiste` < `--ebene-hinweis` < `--ebene-kurzmeldung` <
`--ebene-vollbild` (Anmeldung) < `--ebene-dialog`. Nie eine eigene Zahl.

## Bewegung

Tipp (Kachel springt kurz), Aufdecken (320 ms je Kachel, 160 ms Versatz —
müssen zu `js\bildschirm-wordle.js` passen), Wackeln bei ungültigem Wort,
Hüpfen beim Gewinn. Wer im System „Bewegung reduzieren" eingestellt hat,
bekommt keine.

## Das UPCrew-Intro

Das Studio-Zeichen, mit dem JEDE UPCrew-App beginnen soll (`js\intro.js`,
Stil `.intro…` in `css\stil.css`):

- Grund `--upcrew-grund` (fast schwarz, violett getönt), bildschirmfüllend.
- „UP" weiss, fett, in einem violetten Block (`--upcrew-farbe`, Rundung
  14 px), daneben „Crew" weiss, fett. Darunter klein, gesperrt, halb
  durchsichtig: „präsentiert".
- Auftritt 700 ms (leichtes Anwachsen), steht 1,8 s, blendet in 400 ms aus.
  Antippen oder eine Taste überspringt. Einmal je Besuch.
- **Die Studio-Farben haben keine Dunkel-Fassung** — das Zeichen sieht in
  jedem Spiel und jeder Darstellung gleich aus.

Wer das Intro in einer anderen App nachbaut, übernimmt genau diese Werte.

## Schrift

Systemschrift, 16 px — die App soll ohne Netz vollständig aussehen. Kacheln
fett und in Grossbuchstaben.
