# Typoluck — Historie

Je Version das Warum. Das Was für Nutzer steht im `CHANGELOG.md`.
Archiv: suchen, nicht blättern.

## Aus der STATUS.md (ausgelagert 26.09.2026)

**0.6.2 — weg vom NYT-Look (25.09.2026, ausgeliefert mit 0.7.0).** Auftrag: prüfen, was
gegen Ärger mit der New York Times anders muss, dann „fang an". Warum so:
`entschieden.md`, oberster Eintrag.
- Name **Wordguesser** (Nutzer), nur in `WORDLE.NAME`; README und
  Meldeformular ohne „Wordle"; innere Namen und Datenbankpfade bleiben.
- Kacheln Orange/Blau als Standard, Schalter „Kacheln" (Grün/Gelb) weg;
  App-Zeichen orange/blau, PNGs neu.
- **Kachelfarben-Sperre** `DARSTELLUNG.kachelFarbeErlaubt` (richtig nie
  grün, vorhanden nie gelb) — Vorgabe des Nutzers für die künftigen
  Farbpakete; Test prüft jede Kachelfarbe im Stil.
- Tests 663 ok, 0 Fehler. Angesehen (Edge kopflos): Start hell
  (Wordguesser, orange Zeichen, orange/blaue Mini-Raster), Brett dunkel
  (blaue Kacheln und Tasten).

**0.6.1 — neues UPCrew-Studio-Intro (25.09.2026, ausgeliefert, Commit `4cb09fa`).** Auftrag:
`Design\3D-Schrift\docs\AUFTRAEGE-APPS.md`, Abschnitt 1 („kümmer dich
darum"). Baustein aus `Design\3D-Schrift\final` unverändert kopiert
(Byte-Vergleich gleich, 2er-Einzug der Quelle bleibt).
- `js\intro.js` = Anpasser: Nummer 02, Name, `KONFIG.APP_VERSION`; hell/
  dunkel aus `data-darstellung`, sonst Gerät; Werkstatt `&intro=A..F`
  wählt eine Art, `&hell`/`&dunkel` wirken schon beim Intro.
- Sitzungssperre `upcrew.intro-gesehen` weg; altes `.intro…`-CSS und
  `--upcrew-*` aus `css\stil.css` raus, `--ebene-intro: 55` bleibt;
  `sw.js` mit beiden Dateien; GESTALTUNG/ARCHITECTURE nachgezogen.
- Angesehen (Edge kopflos, 500 px): D dunkel (Version und „02 · typoluck"
  oben), B hell, E dunkel — alle auf der Endform. **Nicht angesehen:** das
  Weiterzählen über mehrere echte Starts (kopflos ohne bleibenden Speicher);
  der Zähler ist Sache des Bausteins.
- Tests 610 ok, 0 Fehler.

**0.6.0 — Darstellung und Farbenblind-Kacheln (25.09.2026, ausgeliefert mit 0.6.1).**
Auftrag: „weiter arbeiten" → ROADMAP Nr. 8 gewählt (erster Punkt ohne
Nutzer-Entscheidung, passt zur neuen Einstellungen-Seite). Warum so:
`entschieden.md`, oberster Eintrag.
- Neu `js\darstellung.js` (Attribute `data-darstellung`, `data-farben` an
  `<html>`, sofort beim Laden angewendet), `tests\test-darstellung.js`.
- Stil: Gerät-dunkel nur ohne `data-darstellung="hell"`; Block
  `data-farben="kontrast"` nach den Dunkel-Blöcken.
- Werkstatt: `&hell`, `&kontrast`; `&dunkel` geht jetzt über DARSTELLUNG.
- Danach („weiter"), noch in 0.6.0 gebündelt: Schwer-Modus —
  `WORDLE.schwerPruefen`, Feld `schwer` in der Runde (additiv),
  Fehler „schwer" mit `hinweis`; Einstellung „schwer" je Gerät
  (`WORDLE_BILDSCHIRM.schwerGewaehlt/-Setzen`), „SCHWER" klein unter dem
  Titel; Werkstatt `&schwer`; 23 Prüfungen in `test-wordle.js`.
- Angesehen (Edge kopflos, 390 und 320 px, hell und dunkel): Einstellungen,
  Wordle mit Orange/Blau, Wordle schwer. Behoben: Darstellungs-Schalter
  ragte über die Karte, „· schwer" im Titel brach um.
- **Nicht gebaut:** Rangliste kennzeichnet schwer gelöste Runden nicht.

**0.5.0 — Leiste unten, Einstellungen (25.09.2026, ausgeliefert, Commit `67e4fe6`).** Auftrag:
„unten das Tab-Menü sollte nie weg, rechts soll weiterhin die Rangliste,
in die drei Balken soll auch Einstellungen rein, links im Tab-Menü ein
Platzhalter, wird noch kommen". Warum so: `entschieden.md`, oberster
Eintrag.
- `NAVIGATION.LEISTE` + `leisteBauen`/`_leisteMarkieren`, festes
  `<nav id="leiste">` in `index.html`, `--leiste-hoehe`/`--ebene-leiste`.
- Neu `js\bildschirm-einstellungen.js` (Karten aus dem Profil 1:1
  übernommen); Rangliste `imMenue: false`, ohne „Zurück".
- `test-syntax.js`: sieben Prüfungen zu Leiste und Menü.

**0.4.0 — UPCrew-Standard, erster Schritt (25.09.2026, lokal).** Auftrag:
„setz den UPCrew-Standard um". Warum so und was bewusst fehlt:
`entschieden.md`, oberster Eintrag.
- Neu: `js\zustand.js` (Laden/Leer/Fehler, 10-s-Grenze), `js\fuehlen.js`
  (Vibration, Schalter im Profil „Dieses Gerät"), `ICH.einstellung`.
- Texte: Start, Wordle, Rangliste, Freunde, Profil ohne Sätze; Ende „3/6"
  mit Lösung und „+4 Punkte"; Spielregel und Punkte als Bild
  (`DIALOG.hinweis` nimmt jetzt ein Element); Begrüßungen der Anmeldung raus.
- Formen: `--rund-klein/-mittel/-voll` (8/14/999 px), `--karte-tiefe` 3 px,
  keine weichen Schatten mehr; Schrift nur noch über `--schrift-familie`.
- Tests: `test-fuehlen.js` neu, `test-syntax.js` prüft Floskeln, Rundungen,
  Schatten, Schrift — 531 Prüfungen grün.
- Werte in `..\UPCrew-STANDARD.md` nachgetragen (Rundungen, Kante, Stand
  Typoluck) — für Blunderluck und Trainer.
- Angesehen (Edge kopflos, 390 px, dunkel): Start, Spielregel, Rundenende,
  Profil mit Vibrations-Schalter.
- **Noch mit Sätzen:** die Anmelde-Abläufe (Passwortregeln, Anmeldefehler),
  teils aus `konto.js` (gleich mit Blunderluck, nur gemeinsam ändern).

**0.3.0 — Blau, Drei-Balken-Menü, Felder antippen (25.09.2026, lokal).**
Drei Wünsche aus dem Chat, gebündelt. Warum so: `entschieden.md`, oberster
Eintrag.
- Farben 1:1 aus Blunderluck (`css\stil.css`), Kanten/Kacheln/Tasten
  abgeleitet; `.anmeldung` behält das UPCrew-Violett; `theme-color` und
  Manifest blau. **App-Zeichen noch violett** — Nutzer-Frage.
- Leiste unten entfernt; `NAVIGATION.menueBauen` (drei Balken, Profil,
  Freunde, Rangliste, rote Zahl für Anfragen), die drei Seiten mit
  „Zurück", Wege dorthin legen Verlaufseinträge an.
- Wordle: Eingabe = fünf Felder + Markierung (`WORDLE.eingabe…`, 33 neue
  Prüfungen), Felder antippbar, Pfeiltasten am Rechner.
- Werkstatt: neue Schalter `&menue`, `&felder=h...e&stelle=1`.
- Angesehen (Edge kopflos, 390 px, dunkel): Start mit offenem Menü, Wordle
  mit vorgetippten Feldern, Anmeldung (violett). Dabei behoben: ein offenes
  Menü klappte beim Neuzeichnen nach neuen Daten zu. Hell nicht fotografiert
  (die Werkstatt hat keinen Hell-Schalter; die Werte sind Blunderlucks).

## Aus der STATUS.md (ausgelagert 25.09.2026)

**0.1.1 — Knöpfe mit Tiefe, mehr Ratewörter (25.09.2026).** Auftrag: „mach
mit offenen Sachen weiter" (UPCrew-Datenbank-Umzug läuft in einer
Blunderluck-Sitzung, Auftrag dort über `TODO.md` vom Nutzer eingetragen).
- 3D Stufe 1: `--knopf-tiefe` 4px, `--kachel-tiefe` 3px, neue Kantenfarben
  je Fläche (hell, dunkel, Werkstatt-dunkel); rote Knöpfe mit roter Kante;
  flache Knöpfe sinken nicht ein. Leistenknöpfe bekamen ungewollt eine
  Kante — Ursache in `erkenntnisse.md`, behoben ohne ihr Aussehen zu ändern.
- Wortliste: 448 Zusatzwörter von Hand (jetzt 567 Lösungen + 659 Zusatz);
  Lösungsliste und Tagesplan unverändert.
- Angesehen (Edge kopflos, 390 px, hell und dunkel): Wordle mit gelben und
  grauen Kacheln, Start, Profil. 397 Prüfungen grün, Versionsstand stimmt.
- Ausgeliefert 25.09.2026, Commit `f5e3479`.

**0.1.0 — Grundgerüst, dann UPCrew (24.09.2026).** Direktauftrag: „beginne
mit dem Bau, erst die ganzen Grundlagen 2D mit Menüs und alles, es folgen
dann 3D-Knöpfe usw., also vorausschauend bauen". Gebaut:
- Modell: `wordle.js` (Bewertung mit doppelten Buchstaben, gerechnetes
  Tageswort mit Tagesplan), `woerter-de.js` (567 Lösungen + 211 Zusatz, von
  Hand), `ergebnisse.js` (Mehrpfad-Schreiben, Warteliste), `rangliste.js`
  (Punkte 7 minus Versuche, Heute/7 Tage, Serie), `spieler.js` (geteilte
  Konten: fremde Felder bleiben, Marke steigt).
- Oberfläche: Start mit Spiel-Kacheln und „Heute bei deinen Freunden",
  Wordle (Aufdecken, Wackeln, Jubel, physische Tastatur), Rangliste,
  Freunde, Profil mit Statistik und Konto, Anmelde-Vollbild, Leiste unten
  mit Zurück-Taste des Handys.
- 3D-Naht: jeder Knopf in `BAUSTEINE.knopf`, Tiefe als Variable (heute 0).
- Werkzeuge: Test-, Start-, Deploy-, Icon-, Wunsch-Skript; Werkstatt-Modus
  (`?werkstatt`, `&intro` zeigt das Intro) für Bildschirmfotos.
- **Noch vor der Auslieferung umgestellt auf UPCrew** (Nutzer: Spieler
  sollen sich nicht „bei einem anderen Spiel" anmelden): neue Datenbank,
  alle Texte „UPCrew-Konto", Intro `js\intro.js`, Test „die Anmeldung nennt
  kein anderes Spiel".
- **Angesehen** (Edge kopflos, 390 px, hell und dunkel): Intro, Anmeldung,
  Start, Wordle laufend und gewonnen, Rangliste, Freunde, Profil. Dabei
  behoben: ausgeschlossene Tasten im Dunkelmodus nicht erkennbar, Knopftext
  brach um, doppelter Name im Anmelde-Kasten, „präsentiert" erschien zu spät.

## 0.1.0 — 24.09.2026

Direktauftrag: „typoluck soll es werden, beginne mit dem Bau — erst die
ganzen Grundlagen 2D mit Menüs und alles, es folgen dann 3D-Knöpfe usw.,
also vorausschauend bauen." Vorher geklärt: dieselbe Datenbank wie
Blunderluck, zuerst auf GitHub, Rangliste und Freunde; Konten gemeinsam
(Nutzer-Antwort auf die Rückfrage). Gebaut als Sammlung mit Wordle als
erstem Spiel; Datenmodell, Tests und Werkzeuge nach Haus-Standard.
Noch vor der ersten Auslieferung umgestellt: Die Konten gehören nicht
Blunderluck, sondern dem Studio UPCrew (eigene Datenbank, UPCrew-Konto in
allen Texten, Intro beim Start) — Nutzer-Ansage, Einzelheiten in
`entschieden.md`. Weil 0.1.0 nie ausgeliefert war, bleibt es bei dieser
Nummer.
