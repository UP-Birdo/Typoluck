# Typoluck — Getroffene Entscheidungen

Je Eintrag: was entschieden ist, und warum. Neueste oben.

## UPCrew-Runde 3: ein Aussehen, Crew-Schrift, UPCrew-Knöpfe, Tab „Anpassen" (26.09.2026, 0.8.0)

Auftrag: `Design\3D-Schrift\docs\AUFTRAEGE-RUNDE-3.md`, Block 1 („beginne").
Blunderluck wurde gleichzeitig in einer eigenen Sitzung umgebaut — hier
wurde nur in Typoluck geschrieben, die Bausteine nur kopiert.

- **Ein Aussehen für beide Spiele** über den kopierten Baustein
  `upcrew-aussehen.js` (Schlüssel `upcrew.aussehen`). `DARSTELLUNG` hält
  keinen Wert mehr, nur noch den Anschluss: `thema`, `themaSetzen`,
  `leseschrift`, `anwenden`, `modus` lesen und schreiben über den Baustein.
  Die bis 0.7.0 gespeicherte Wahl (`ICH.einstellung "thema"`) geht EINMAL
  per `migrieren` hinüber — nur wenn es noch kein gemeinsames Aussehen gibt;
  hat Blunderluck im selben Browser schon eins angelegt, gilt dessen Wahl
  (ein Aussehen, nicht zwei). Ein Test prüft, dass "thema" nur noch dort
  gelesen wird.
- **Der frühe Aufruf ist `darstellung.js` selbst**, direkt nach
  `upcrew-aussehen.js` in `index.html`: erst Umzug, dann anwenden. So
  braucht es keine eigene Einzeiler-Datei, und der Umzug läuft garantiert
  VOR dem ersten Anwenden (sonst ein Aufblitzen in der Vorgabe).
- **Keine Standard- oder Stufen-Werte in der App.** S1/K1 und die
  Freischalt-Stufen stehen nur in den Bausteinen; die Werkstatt setzt auf
  `UPCREW_AUSSEHEN.STANDARD` zurück statt auf feste Werte. Ein Test sucht
  nach festgeschriebenen `S1`…`K6`/`STUFEN` im eigenen Code.
- **Knöpfe:** Nur `haupt`, `still`, `gefahr` werden `up-kn`
  (`up-haupt`/`up-zweit`/`up-gefahr`, ohne Text `up-rund`), mit
  Leuchtpunkt als erstem Kind. `flach` (Zeichen in Kopfzeilen,
  Textverweise), `menue` und `leiste` bleiben ohne — sie sind Navigation,
  keine Knöpfe im Sinne des Standards, wie Tasten und Kacheln. Die Regeln
  `.knopf-haupt/-still/-gefahr` und Kante/Rundung/Einsinken von `.knopf`
  sind gelöscht; `knopf-klein` bleibt als reine Grösse (`.up-kn.knopf-klein`,
  zwei Klassen, weil der Baustein nach dem eigenen Stil lädt).
  `DIALOG.zweiSchritt` tauscht seitdem nur die Beschriftung, sonst löschte
  „Sicher?" den Leuchtpunkt. Folge, bewusst so: Gefahr-Knöpfe
  („Abmelden", „Entfernen") sind jetzt voll rot statt rot umrandet.
- **Gefahr-Kante/-Schrift** in allen drei Farbblöcken von `stil.css`; Gefahr
  ist Bedeutungsfarbe, keine Farbwelt ändert sie.
- **Leiste mit fünf Plätzen** (Aufgaben · Bald · Start · Rangliste ·
  Anpassen): „Bald" wieder als abgeschalteter Platzhalter mit dem alten
  Zeichen `platzhalter`, damit Start in der Mitte bleibt wie in Blunderluck.
- **Tab „Anpassen"**: eigener Bildschirm mit Kopfzeile, darunter der Baustein.
  Stufe 0 an EINER Stelle (`ANPASSEN_BILDSCHIRM.stufe()`), weil es den
  Herausforderungs-Pfad noch nicht gibt; `alleFrei` nur in der Werkstatt.
  Der Tab räumt beim Verlassen UND vor jedem Neubau auf (sonst horchte ein
  alter Tab weiter). Neue Daten und Aussehens-Wechsel bauen ihn NICHT neu
  (`APP.UNGESTOERT`), sonst ginge der Entwurf verloren — er zeichnet sich
  selbst. `--upa-oben` bleibt 0 (die Kopfzeile klebt nicht); „Zurück /
  Übernehmen" klebt dafür über der festen Leiste (`stil-bildschirme.css`).
- **Konto-Abgleich in eigener Datei** `aussehen-abgleich.js`, nicht in
  `konto.js`: `konto.js` muss in allen UPCrew-Spielen gleich bleiben.
  Geschrieben wird `konten/<uid>/aussehen` zusammen mit `geaendertAm` in
  EINER Mehrpfad-Änderung (Regel 3 der Konten). Nur angemeldete Konten,
  keine Gäste, nicht die Werkstatt. Nur eigene Änderungen (`quelle
  "selbst"`) werden geschickt — was vom Konto oder aus Blunderluck kommt,
  nicht zurück. Fehler (Regel noch nicht eingespielt) enden still.
- **Test-Ausnahmen für die Kopien:** Die Form-Prüfungen (drei Rundungen)
  und die Emoji-Prüfung gelten nicht für `upcrew-*` — die Knopf-Familien
  haben eigene Rundungen (ihr Zweck), der Tab zeigt Schachfiguren
  (U+265A–265F, im geprüften Bereich, aber keine Emojis). Die Dateien
  dürfen nicht abgewandelt werden.
- MINOR 0.8.0: Anpassen-Tab, Standard-Schrift und Abgleich zwischen den
  Spielen gab es vorher nicht.

## UPCrew-Runde 2: Farbwelt, Kopfzeile, Tab „Aufgaben" (26.09.2026, 0.7.0)

Auftrag: `Design\3D-Schrift\docs\AUFTRAEGE-RUNDE-2.md`, Block 1 („fang an
zu bauen"); Hintergrund `Design\3D-Schrift\docs\FARBWELTEN-PLAN.md`.
Blunderluck und Trainer werden gleichzeitig in eigenen Sitzungen umgebaut —
hier wurde nur in Typoluck geschrieben.

- **Farbwelt über den gemeinsamen Baustein** `upcrew-farbwelten.js`,
  unverändert kopiert (Byte-Vergleich gleich). Angewendet in
  `DARSTELLUNG.anwenden`, damit es EINE Stelle gibt, die bei jedem Wechsel
  läuft: Laden, Einstellung, Gerät wechselt hell/dunkel (neuer Horcher).
  `DARSTELLUNG.modus()` ist die eine Regel für hell/dunkel — das Intro
  fragt seitdem dort statt selbst.
- **Früh laden:** `upcrew-intro.js` und `upcrew-farbwelten.js` stehen VOR
  `darstellung.js` in `index.html` (Auftrag sagte nur „nach
  upcrew-intro.js") — sonst sähe man beim Start kurz die alten blauen
  Rückfall-Farben. Ein Test prüft die Reihenfolge.
- **Welt fest „werkstatt"**, `upcrew.farbwelt` wird bewusst nicht gelesen
  (Freischalten = Runde 3). Werkstatt liefert genau die Kacheln aus 0.6.2.
  Der Test fährt Sperre und Lesbarkeit über ALLE fünf Welten — so fällt
  eine unpassende Welt auf, bevor sie freischaltbar wird.
- **Der Test liest die Quelle in `Design\` NICHT** zum Vergleich: Ein Pfad
  nach draussen zur Laufzeit ginge an der Projekt-Schranke vorbei, und das
  Projekt muss sich allein verschieben lassen. Gleichheit prüft der
  Byte-Vergleich beim Kopieren.
- **Kopfzeile wie Blunderluck:** Kurzprofil links (Kreis, Name, „Serie X ·
  Y % gelöst" aus `RANGLISTE.statistik`, dieselbe Zählung wie im Profil),
  rechts das Menü. Schriftzug „Typoluck" weg; der Namens-Kreis neben den
  Balken entfällt (das Kurzprofil ist jetzt der Weg ins Profil, das Menü
  der zweite).
- **Tab „Aufgaben"** mit Pfad und Texten wörtlich aus den gemeinsamen
  Absprachen; Bildschirm `herausforderungen` nur als Platzhalter.
- MINOR 0.7.0: „Aufgaben" ist ein neuer Bildschirm, Kurzprofil eine neue
  Anzeige.

## Weg vom NYT-Look: Name Wordguesser, Kacheln Orange/Blau (25.09.2026, 0.6.2)

Auftrag: „prüfe, wie viel wir anders machen müssen, damit wir von der New
York Times keinen auf den Deckel bekommen" — dann „fang an, damit ich nicht
zum Schluss auf etwas baue, was dann eh nicht mehr erlaubt ist".

**Anlass:** Im März 2024 liess die NYT hunderte Wordle-Nachbauten von
GitHub nehmen (DMCA). Begründung dort: der Name „Wordle" (ihre Marke) und
der Look — Anordnung und die grünen, gelben und grauen Kacheln. Laut ihrem
Sprecher stören ähnliche Wortspiele nicht, solange sie Marke und
„geschütztes Spielgeschehen" nicht übernehmen. (Einschätzung, keine
Rechtsberatung; vor dem Gang in die Stores anwaltlich prüfen lassen.)

- **Name: Wordguesser** (Nutzer: „Wort raten auf Englisch"). Steht nur in
  `WORDLE.NAME`; `test-syntax.js` sucht „Wordle" in allem Sichtbaren (Code
  ohne Kommentare, Seite, Manifest, README, Meldeformular). **Innere Namen
  bleiben** (`WORDLE`, Bildschirm-Id und Datenbankpfad `wordle`) —
  unsichtbar, und die Pfade sind Datenvertrag.
- **Kacheln Orange/Blau als Standard, Grün/Gelb gestrichen** — auch als
  Wahl. Der Schalter „Kacheln" aus 0.6.0 ist weg; die gespeicherte
  Einstellung `farbenKontrast` bleibt liegen und wirkt nicht mehr
  (additiv, nichts gelöscht). „Fehlt" hell etwas dunkler als das
  NYT-Grau.
- **Die Kachelfarben-Sperre** (Nutzer: „die Felder sollen sich an die
  Farbpakete anpassen, die man freischalten kann — achte darauf, dass
  dann nicht diese Farben angewendet werden können"):
  `DARSTELLUNG.kachelFarbeErlaubt(rolle, farbe)` verbietet für „richtig"
  jeden grünen Ton (75–165 Grad), für „vorhanden" jeden gelben (38–70 Grad);
  Grau ist frei. Ein Farbton-Bereich statt einer Liste verbotener Codes,
  weil schon unsere eigenen alten Farben (#3f8f4f, #c9a227) nicht auf der
  Liste gestanden hätten und trotzdem der Look sind. Der Test fährt die
  Sperre gegen jede Kachelfarbe in jeder Stil-Datei — ein künftiges
  Farbpaket fällt also auf, sobald es im Stil steht.
- **App-Zeichen** mit: orange T-Kachel, blaue kleine Kachel (`icon.svg`,
  `tools\Icons-Erzeugen.ps1`, PNGs neu).
- **Bleibt, weil nicht schützbar oder unser eigenes:** Spielregel (5
  Buchstaben, 6 Versuche, Tageswort), die von Hand gebaute deutsche
  Wortliste, der Code (neu geschrieben, keine fremde Datei, kein
  fremder Lizenztext).
- **Nicht gebaut, aber jetzt entschieden:** Teilen nie als Raster farbiger
  Quadrate (`offen-und-abgelehnt.md`, „Ergebnis teilen").
- PATCH 0.6.2: bestehende Funktionen umbenannt und umgefärbt, nichts
  Neues für den Spieler.

## Schwer-Modus (25.09.2026, 0.6.0)

Auftrag: „weiter" (nach 0.6.0 lokal, noch nicht ausgeliefert) — ROADMAP
Nr. 7, in dieselbe Nummer gebündelt, weil 0.6.0 nie draussen war.

- **Regeln wie das Original:** Grün bleibt an seiner Stelle, Grün/Gelb
  muss so oft vorkommen, wie es gezeigt wurde; Grau darf man weiter tippen.
  Geprüft gegen jeden früheren Versuch, grüne Stellen zuerst.
- **Die Runde trägt `schwer`**, festgelegt beim Anlegen. Eine gemerkte
  Runde ohne Versuch übernimmt noch die aktuelle Wahl; ab dem ersten
  Versuch nicht mehr — sonst liesse sich die Regel nach einem Blick auf
  die Tastatur abschalten.
- **Hinweis als Stichwort** („Feld 3: A", „E benutzen"), UPCrew-Standard.
- **Nicht gebaut:** Kennzeichen in der Rangliste — eigener Punkt (ROADMAP
  Nr. 7, Folge), weil er den Datenvertrag der Ergebnisse berührt.

## Darstellung und Farbenblind-Kacheln (25.09.2026, 0.6.0)

Auftrag: „weiter arbeiten". Gewählt: ROADMAP Nr. 8 — der erste Punkt, der
ohne Nutzer-Entscheidung geht (1, 2 und 4 warten auf ihn) und direkt an die
neue Einstellungen-Seite anschliesst.

- **Ein Baustein `DARSTELLUNG`** wie `FUEHLEN`: setzt nur Attribute an
  `<html>`, die Farben bleiben Variablen in `css\stil.css`. Angewendet
  beim Laden der Datei (früh in `index.html`), damit nichts in der falschen
  Farbe aufblitzt.
- **„Hell" schlägt das dunkle Gerät** über `:root:not([data-darstellung=
  "hell"])` im Dunkel-Block — statt die hellen Werte ein drittes Mal
  abzuschreiben.
- **Orange/Blau** wie die Kontrast-Einstellung des Original-Wordle; nur
  richtig/vorhanden ändern sich, grau bleibt. Ab Werk Grün/Gelb (TODO-
  Prüfliste Punkt 9: Standard nur ändern, wenn der Nutzer will — ein
  Angebot ändert ihn nicht).
- **Tastatur-Anordnung (Rest von Nr. 8) bewusst weggelassen:** QWERTZ ist
  der deutsche Standard; welche andere Anordnung jemand wollte, ist offen.
- Die Werkstatt geht über denselben Baustein (`&hell`, `&dunkel`,
  `&kontrast`), damit der Bildschirm die Wahl auch anzeigt.

## Leiste unten und Einstellungen (25.09.2026, 0.5.0)

Auftrag: „unten das Tab-Menü sollte nie weg, rechts soll weiterhin die
Rangliste, in die drei Balken soll auch Einstellungen rein, links im
Tab-Menü soll ein Platzhalter rein, wird noch kommen".

- **Leiste UND Menü, nicht entweder–oder.** 0.3.0 hatte die Leiste für das
  Drei-Balken-Menü entfernt. Jetzt: die Leiste für die Hauptbereiche
  (Platzhalter, Start, Rangliste), das Menü für Persönliches (Profil,
  Freunde, Einstellungen).
- **Die Mitte ist Start.** Der Nutzer hat links und rechts festgelegt; eine
  Leiste ohne Weg zurück zum Start wäre eine Sackgasse. Ein Spiel
  (Wordle) markiert Start als aktiv — es wird von dort geöffnet.
- **„Nie weg" wörtlich:** fest am unteren Rand auf jedem Bildschirm, auch
  im Spiel. Zugedeckt nur von Anmeldung, Intro und Dialogen (Vollbilder).
  Die Leiste wird einmal gebaut und nicht bei jedem Wechsel neu, damit sie
  nicht flackert.
- **Rangliste nicht doppelt:** aus dem Menü genommen, und ohne „Zurück"
  oben (wie der Start ein Ziel der Leiste). Ein Test wacht darüber.
- **Einstellungen = die drei Karten, die bisher unten im eigenen Profil
  standen** (Gerät, UPCrew-Konto, Über Typoluck), 1:1 übernommen. Doppelt
  wäre verwirrend; das Profil zeigt seitdem dasselbe wie ein fremdes.
- **Platzhalter:** abgeschaltet sichtbar (Kästchen mit Plus, „Bald"). Wer
  ihn füllt, gibt dem Eintrag in `NAVIGATION.LEISTE` eine `id`.

## UPCrew-Standard, erster Schritt (25.09.2026, 0.4.0)

Auftrag: „setz den UPCrew-Standard um" (`..\..\UPCrew-STANDARD.md`,
festgelegt mit dem Nutzer). Typoluck ist die erste der drei Apps.

- **Was gebaut ist und warum so:** Zustände und Vibration als je EIN
  Baustein, damit keine Stelle eigene Texte oder Muster erfindet; beide
  liefern bzw. tun nichts, wo das Gerät es nicht kann. Die Rundungswerte
  (8 / 14 / 999 px) hat diese Runde festgelegt: 14 px ist schon die
  Rundung des UPCrew-Zeichens, so passen Intro und App zusammen.
- **Die Spielregel als Bild:** drei Kacheln wie auf dem Brett (derselbe
  Baustein `_kachelBauen`), dazu die Punkte-Tafel aus `RANGLISTE.punkte` —
  kein Absatz. `RANGLISTE.ERKLAERUNG` bleibt als Vorlesetext der Tafel.
- **Bewusst NICHT in dieser Runde:** (1) die Schrift — der Nutzer wählt nach
  Bild, und die Dateien kann nur er holen (die Schranke lässt Claude nicht
  ins Netz); vorbereitet ist `--schrift-familie`. (2) Der iPhone-Umweg für
  die Vibration — der Standard verlangt erst eine Messung auf dem Gerät.
  (3) Die Sätze in den Anmelde-Abläufen (Passwortregeln, Fehler beim
  Anmelden): Ein Teil kommt aus `js\konto.js`, das mit Blunderluck gleich
  bleiben muss; nur die Begrüßungen sind schon raus. (4) Das Markenzeichen
  — Nutzer-Entscheidung nach Bild.

## Blunderlucks Farben, Drei-Balken-Menü, antippbare Felder (25.09.2026, 0.3.0)

Drei Nutzer-Wünsche in einer Nachricht, in EINE Version gebündelt.

- **Farben:** „hinter der Crew-Anmeldung dieselbe Farbpalette wie
  Blunderluck, statt Pink und Lila Blau". Die Grundfarben sind 1:1 aus
  Blunderlucks `stil.css`; was Blunderluck nicht hat (Kanten, Kacheln,
  Tasten), ist daraus abgeleitet. **Löst „Violett als Akzentfarbe" (unten)
  ab.** „Hinter der Anmeldung" wurde wörtlich genommen: Die Anmeldung
  bleibt UPCrew-violett, weil sie dem Studio gehört und das Intro ebenfalls
  violett ist. Soll auch sie blau werden, genügt es, die Farbblöcke von
  `.anmeldung` in `css\stil.css` zu löschen. **Das App-Zeichen (`icon.svg`,
  `icons\`) ist noch violett** — Nutzer-Frage, siehe `offen-und-abgelehnt.md`.
- **Menü:** „so wie bei Blunderluck Freunde und Profil in drei Balken
  Menü". Die Leiste unten ist ersatzlos weg; ein Knopf mit drei Balken
  oben rechts auf dem Start öffnet Profil, Freunde, Rangliste (Reihenfolge
  wie Blunderluck: Profil zuerst). Die drei Seiten bekamen „Zurück", und
  die Wege dorthin legen jetzt einen Verlaufseintrag an (vorher ersetzten
  sie ihn, weil die Leiste Tabs waren) — sonst führte „Zurück" aus der App
  heraus. Nachgebaut, nicht geteilt: Typoluck baut jeden Knopf in
  `BAUSTEINE.knopf`, Blunderluck nicht. Ein offenes Menü bleibt beim
  Neuzeichnen nach neuen Daten offen.
- **Felder antippen:** „auf die Felder klicken in der Zeile, wo man gerade
  schreiben soll, dass man schon vor-eintragen kann". Die Eingabe sind fünf
  Felder mit Markierung; die Regeln (wohin die Markierung springt, was
  Löschen tut) stehen im Modell `js\wordle.js` und sind getestet. Wer der
  Reihe nach tippt, merkt keinen Unterschied. Lücken sind erlaubt; mit
  Lücke sagt „Prüfen" wie bisher „Zu wenig Buchstaben".

## UP#Plus ist in allen UPCrew-Spielen nur Rollen-Verteiler (25.09.2026, 0.2.1)

Nutzer: keine Rangliste, keine Suche, keine Freunde, keine Anfragen —
„in allen UPCrew-Games soll das so sein". In der Datenschicht umgesetzt
(`SPIELER.istVerteiler`, `SPIELER.mitspieler`, `freundschaft`,
`freundHinzufuegen`), gleich wie Blunderluck v0.139.0. Begründung dort:
`Apps\Blunderluck\docs\entscheidungen\entschieden.md`.

## Name: Typoluck (24.09.2026, Nutzer)

Aus mehreren Vorschlägen gewählt. „Typo" (Tippfehler) steht neben „Blunder"
(Patzer) — beide Apps tragen einen Fehler aus ihrem Spiel im Namen und sehen
nebeneinander wie eine Familie aus. Bei der Websuche am 24.09.2026 kein
Spiel und keine App dieses Namens gefunden (die Suche in den Stores selbst
steht beim Nutzer aus).

## Das Studio UPCrew: eigene Datenbank, UPCrew-Konten, Intro (24.09.2026, Nutzer)

Erst war entschieden: dieselbe Datenbank und dieselben Konten wie
Blunderluck. Noch vor der ersten Auslieferung hat der Nutzer das
umgeworfen: „Ich möchte nicht, dass die Benutzerdaten auf Blunderluck
laufen — Spieler, die nur das eine spielen, sind dann verwirrt, warum sie
sich bei einem anderen Spiel anmelden sollen." Stattdessen ein Studio-Name
für das Entwicklerteam, der am Anfang jeder App kommt.

- **Name: UPCrew** („UP" = Upgrade, „Crew" = zusammen, als Team). Geprüft
  und verworfen: UPlus (LG U+, grosser Mobilfunkanbieter, und eine
  gleichnamige App), JKB (es gibt „JKB Games"; Initialen klingen nach einer
  Person, nicht nach einem Team), Lucky Slip, Oopsworks. Vor dem Gang in die
  Stores gehört UPCrew noch ins Markenregister (DPMA, EUIPO).
- **Eigene Datenbank, die keinem Spiel gehört** (Firebase-Projekt „UPCrew",
  `upcrew-7a29d`, vom Nutzer angelegt). Gefragt war „nur Texte" gegen
  „eigene Datenbank"; gewählt: eigene Datenbank. Blunderluck zieht mit
  seinen Konten dorthin um (eigene Sitzung; jetzt noch billig, zwei Spieler).
- **GitHub bleibt unter up-birdo** — keine Studio-Organisation (Nutzer).
- **Die Texte nennen immer das Studio**, nie ein anderes Spiel. Die
  Anmeldung trägt oben „UPCREW", die Knöpfe heissen „Mit UPCrew-Konto
  anmelden" / „Neues UPCrew-Konto erstellen".
- **Das UPCrew-Intro** eröffnet jede App (einmal je Besuch, antippen
  überspringt, die App lädt darunter weiter) — Aufbau in `js\intro.js`,
  Aussehen in `docs\GESTALTUNG.md`.

Was aus der früheren Entscheidung „gemeinsames Konto mit Blunderluck"
bleibt, gilt jetzt für ALLE UPCrew-Spiele:

- **Das Passwort-Verfahren ist in allen Spielen gleich** (Zutat
  `blunderluck-pin|`, SHA-256, Hex). Die Zutat trägt ihren alten Namen, weil
  Blunderlucks Konten so samt Passwort umziehen können; Spieler sehen sie nie.
- **Fremde Felder wandern durch, eigene kommen keine dazu.** Blunderluck
  verwirft beim Schreiben unbekannte Felder; jedes Spiel muss umgekehrt alle
  Felder der anderen erhalten, auch künftige. Deshalb kopiert
  `SPIELER.normalisieren` jeden Eintrag vollständig.
- **Die Marke `geaendertAm` zieht immer hoch** — und liegt nach dem
  Zusammenführen ÜBER der am Server.
- **Ohne Server-Kontakt wird die Kontenliste nie geschrieben**, weil ein
  alter Stand in allen Spielen Konten löschen würde.
- **Die Anmeldung auf dem Gerät ist NICHT zwischen den Spielen geteilt**
  (alle Apps teilen sich unter up-birdo.github.io den Browser-Speicher;
  Typoluck liest trotzdem nur `typoluck.…`). Grund: Eine App, die sich auf
  den Gerätespeicher einer anderen verlässt, bricht, sobald die andere ihn
  umbaut.

## Ergebnisse zweimal gespeichert: je Tag und je Spieler (24.09.2026)

`wordle/tage/<datum>/<id>` für die Rangliste, `wordle/verlauf/<id>/<datum>`
für das Profil. So lädt keine Ansicht mehr als nötig (ein Tag = alle
Spieler; ein Spieler = alle Tage). Beide in EINER Mehrpfad-Änderung —
entweder beide oder keiner.

## Das Lösungswort steht nie in der Datenbank (24.09.2026)

Die Datenbank ist öffentlich lesbar. Stünde das Wort im Ergebnis, verriete
jeder Frühaufsteher allen anderen die Lösung. Gespeichert wird nur das
Farbmuster (R/V/F); das Wort eines Tages rechnet `WORDLE.tageswort` nach.

## Das Tageswort wird gerechnet, nicht vom Server geholt (24.09.2026)

Kein Server-Schritt, der ausfallen kann; jedes Gerät hat offline dasselbe
Wort. Der Preis: Die Wortliste darf nur hinten wachsen, und jede Erweiterung
braucht einen neuen Planabschnitt (Kopf von `js\woerter-de.js`). Der Test
hält das Wort von Tag 1 und 2 für immer fest.

## Erst aufs Gerät, dann ins Netz (24.09.2026)

Ein fertiges Tageswort geht zuerst in die Warteliste auf dem Gerät. So geht
nichts verloren — weder ohne Netz noch solange die Firebase-Regel für
`typoluck` fehlt. Nachgereicht wird bei jedem Start nach der Anmeldung.

## Punkte: 7 minus Versuche, ungelöst 0 (24.09.2026)

Einfach zu erklären, belohnt schnelles Lösen, und wer löst, bekommt immer
mehr als wer nicht löst. Gewertet wird nur das Tageswort; die Übung zählt
nichts (sonst übte man sich in der Rangliste nach oben). Die Rangliste zeigt
Heute und die letzten 7 Tage — eine Gesamtwertung würde mit der Zeit Neue
chancenlos lassen.

## Violett als Akzentfarbe (24.09.2026) — ABGELÖST durch 0.3.0

Grün und Gelb sind Spielbedeutungen, Rot ist Gefahr, Blau gehört
Blunderluck. Violett ist frei und macht die Schwester-App erkennbar eigen.
**Seit 0.3.0 überholt:** Der Nutzer will Blunderlucks Blau (Eintrag oben);
Violett bleibt nur der Anmeldung und dem Intro.

## 2D zuerst, 3D angedockt statt vorgebaut (24.09.2026, Nutzer-Ansage)

„Erst die ganzen Grundlagen 2D mit Menüs und alles, es folgen dann
3D-Knöpfe usw., also vorausschauend bauen." Vorausschauend heisst hier:
jede sichtbare Grundform an genau einer Stelle (`BAUSTEINE.knopf`,
`_kachelBauen`, `_tasteBauen`) und die Tiefe schon als Variable — aber kein
three.js und keine 3D-Datei, bevor es gebraucht wird (Haus-Regel „nichts auf
Vorrat"). Plan: `ARCHITECTURE.md`, „3D".

## Kein Firebase-SDK, keine Bibliothek (24.09.2026)

Wie Blunderluck: REST über `fetch`. Kein Bauschritt, nichts Fremdes.

## Die Werkstatt wird mit ausgeliefert (24.09.2026)

`js\werkstatt.js` tut ohne `?werkstatt` nichts und schaltet mit ihm zwingend
auf „lokal" — die echte Datenbank ist unerreichbar. Ausgeliefert, damit
dieselbe Adresse auf dem Handy dasselbe zeigt wie am Rechner.

## Passwort: Türschloss, kein Tresor

Geerbt von Blunderluck: 4 bis 8 Zeichen, Prüfsumme mit offenem Salz in einer
öffentlichen Datenbank. Kurze Passwörter sind durchprobierbar. Eine
Verschärfung (PBKDF2) müsste in ALLEN UPCrew-Spielen gleichzeitig kommen und
alte Prüfsummen weiter annehmen (in Blunderluck ist das Bau-Punkt 46).
