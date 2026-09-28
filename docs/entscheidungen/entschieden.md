# Typoluck — Getroffene Entscheidungen

Je Eintrag: was entschieden ist, und warum. Neueste oben.

## Konto-Formular sagt, was nicht stimmt; Gast-Umzug (28.09.2026, 0.18.5)

Nutzer 28.09.2026 (live in Blunderluck gemeldet): „Wenn man von einem
Gast-Account einen echten erstellen will, nimmt es das nicht an." · „Bei
falscher Eingabe beim Account-Erstellen soll eine Meldung kommen, was genau
nicht stimmt."
- **Version 0.18.5 (PATCH):** zwei Fehler behoben.
- `js\konto.js` = Blunderluck v0.152.4 bis auf `SCHLUESSEL`
  (`tests\test-konto.js` vergleicht Zeile für Zeile). Begründungen dort im
  Kopf von `gastSichern`, `_gastUmziehen`, `kombinationVergeben`,
  `formularPruefen`.
- Oberfläche wie Blunderluck (`js\anmeldung-konto.js`
  `_kontoFormularPruefen`, `_kontoAllgemein`, `_kontoFertig`): Meldung am
  Feld beim Tippen, Knopf immer drückbar, beim Drücken alle Meldungen und
  Fokus ins erste falsche Feld; Server-Absage an `ergebnis.feld` (Name,
  Passwort, Wiederholung) oder in die Zeile „allgemein" über dem Knopf
  (Verbindung). Gilt für Neues Konto, Spielstand sichern, Neu verbinden.
  Ohne Konto (lokaler Modus) dieselbe Form mit den alten Regeln aus
  `js\spieler.js`.
- Nicht gegen das echte Firebase gemessen: der Umzug bei
  CREDENTIAL_TOO_OLD_LOGIN_AGAIN (nur Nachbau, wie in Blunderluck).

## Aussehen je Spiel am Konto angeschaltet (28.09.2026, 0.18.4)

Nutzer 28.09.2026 zur Regel §11c (`aussehenJe`): „ja ist drin".
- **Version 0.18.4 (PATCH):** Das Aussehen je Spiel gab es seit 0.15.13;
  jetzt reist es auch am Konto mit.
- `AUSSEHEN_ABGLEICH.AUSSEHEN_JE_AM_KONTO = true` (wie Blunderluck
  `AUSSEHEN_KONTO.AUSSEHEN_JE_AM_KONTO`). Geschrieben wird nur der
  Teilpfad `konten/<uid>/aussehenJe/typoluck` mit `UPCREW_AUSSEHEN.fuerKonto()`
  (die sechs Felder) plus `geaendertAm`; gelesen derselbe Pfad, fehlt er,
  EINMAL das alte Feld `aussehen` als Umzug (Merker `typoluck.aussehen-umzug`,
  seit 0.15.13 gebaut). Test: der geschriebene Eintrag besteht die
  nachgebaute Regel §11c.

## Bosse wieder 6 Versuche; Intro in der Farbwelt des Spiels (28.09.2026, 0.18.3)

Nutzer 28.09.2026: „Nein → Boss heißt nicht automatisch weniger
Versuche." · „Bei der Animation am Anfang soll sie sich auch ändern, wenn
man ein neues Design-Paket nutzt, sprich pink, dann soll das UPCrew statt
Orange Pink nutzen."

- **Version 0.18.3 (PATCH).**
- **Versuche:** Die Regel „Boss ab Buch 4 = 5" (0.18.1) ist weg, alle
  Level und Bosse haben 6. Der Mechanismus bleibt (`bossVersuche`,
  `BIBLIOTHEK.versuche`, Runde `grund`, „N Versuche" in der Vorstellung,
  „X/N" am Ende) — Verschärfungen werden künftig je Level/Gegner gesetzt
  (neue Bibliothek: Karte, Elite-Gegner, Boss-Eigenheiten). Der Test prüft
  „alle 6" und den Mechanismus mit einem Probe-Wert.
- **Intro — Befund:** Der Baustein nimmt `optionen.welt` (sonst
  `upcrew.farbwelt`, sonst „werkstatt"). `js\intro.js` gab seit 0.15.13
  schon `UPCREW_AUSSEHEN.lesen().farbwelt` mit — der Schlüssel
  `typoluck.aussehen` stimmt, im Browser nachgemessen: Welt „Feld" →
  Intro-Grund #e2e7e1, grün. Orange kam in der WERKSTATT: Das Intro läuft
  vor `WERKSTATT.vorbereiten()`, und das setzt das Aussehen bei jedem Laden
  auf den Standard (Werkstatt = Orange) plus `&farbwelt` — eine im Tab
  „Sammlung" gewählte Welt war nach dem Neuladen wieder Orange, und das
  Intro zeigte den Stand des vorigen Aufrufs. Ein „Pink" gibt es heute in
  keinem Spiel; jede Farbwelt steht in `UPCREW_INTRO.WELTEN` (die
  App-Farben werden daraus gerechnet, `js\upcrew-farbwelten.js`) — ein
  neues Paket MUSS dort hinein, dann nimmt das Intro es automatisch.
- **Intro — Lösung nur in `js\intro.js`** (Baustein unverändert, kein
  Vorschlag nötig): `INTRO.welt()` → rein `INTRO.weltWaehlen({ werkstatt,
  werkstattWelt, gewaehlt, standard, welten })`: normal die gewählte Welt
  dieses Spiels (`UPCREW_AUSSEHEN.lesen().farbwelt`); Werkstatt
  `&farbwelt`, sonst `UPCREW_AUSSEHEN.STANDARD.farbwelt`; eine Welt, die
  `UPCREW_INTRO.WELTEN` nicht kennt → Standard. Dazu `INTRO.modus()` in der
  Werkstatt ohne `&hell`/`&dunkel` = Gerät (wie vorbereiten), nicht der
  gespeicherte Stand. Test `tests\test-intro.js`.

## Intro beim Neuladen; Deploy löscht; Korrektur verschleiert (28.09.2026, 0.18.2)

Nutzer 28.09.2026: „Wenn ich die Seite neu lade, soll die
UPCrew-Animation erneut kommen." · Deploy-Skript soll löschen können:
„ja" · Korrektur-Datei verschleiern: „ja" · Lösungsliste verschleiern:
„später / gar nicht" (geparkt, `offen-und-abgelehnt.md`) · „Boss soll es
jedes Buch am Ende geben" (war schon so, jetzt mit Test).

- **Version 0.18.2 (PATCH):** bestehende Funktionen geradegezogen.
- **Intro — Befund:** Im normalen Betrieb kam es schon bei jedem Laden
  (DOMContentLoaded → `APP.starten` → `INTRO.zeigen`; im eingebauten
  Browser nach `location.reload()` nachgemessen: 3,4 s sichtbar). Nicht
  gekommen ist es in der WERKSTATT (`?werkstatt`, über die der Nutzer die
  lokalen Stände ansieht): dort war es ohne `&intro` immer aus, auch beim
  Neuladen. Kein Merker in sessionStorage, kein Service-Worker-Problem
  gefunden.
- **Intro — Lösung** (`INTRO.entscheiden`, rein, `tests\test-intro.js`):
  jedes Laden → Intro, auch F5; Werkstatt → Intro, wenn die
  Navigationsart „reload" ist (`performance.getEntriesByType("navigation")`),
  sonst nur mit `&intro` (Bildschirmfotos sind frische Aufrufe). **Einzige
  Ausnahme:** das automatische Neuladen der Aktualisierung
  (`js\aktualisierung.js` setzt `sessionStorage["typoluck.neu-geladen"]`
  direkt davor; Merker jünger als 15 s → kein Intro). Grund: Es passiert
  von selbst mitten in der Benutzung an einem sicheren Moment; ein Intro
  wäre eine Unterbrechung, die der Spieler nicht ausgelöst hat, und das
  Intro dieser Sitzung hat er schon gesehen.
- **Deploy löscht** (`tools\Loeschauswahl.ps1`, eingebunden in
  `tools\Deploy-Typoluck.ps1`): Kandidat nur, wenn nicht in der aktuellen
  Auslieferung, in einem verwalteten Ordner bzw. eine freigegebene
  Wurzeldatei, nicht in der Schutzliste (CNAME, .nojekyll, README.md,
  LICENSE(.md), .gitignore, .gitattributes, 404.html, alles unter
  .github/). Fremde Ordner und unbekannte Wurzeldateien nie. Gelöscht wird
  im selben Commit (Baum-Eintrag mit `sha: null`), nur nach „j" auf die
  Rückfrage; `-NurAnzeigen` listet getrennt und löscht nie.
- **Korrektur verschleiert:** `WORTBEWERTUNG.korrekturDatei` schreibt,
  sobald Einträge da sind, `{ kodiert: "…" }` (JSON XOR Schlüsselstrom aus
  SCHLEIER, Base64); leer bleibt `{}`. `WORTBEWERTUNG.korrektur()` liest
  beide Formen, das Werkzeug liest darüber. Das Übernahme-Skript nimmt
  `kodiert` an (Wörter prüft dann der Test) und erlaubt jetzt auch das
  Feld `zahl` (fehlte seit 0.18.0).

## Boss ab Buch 4 mit 5 Versuchen; Bewertung nicht mehr öffentlich (28.09.2026, 0.18.1)

Nutzer 28.09.2026 auf die fünf Fragen aus 0.18.0: (1) Boss mit einem
Versuch weniger — „Später, damit es schwerer wird." (2) Nicht-Nomen —
„Ja, lasse es so." (3) Start zuerst Bibliothek — „Ja." (4) Zahl 0–100
öffentlich — „Ne, soll nicht öffentlich sein." (5) Zahl im Werkzeug von
Hand — „Ja, wenn zu komplex, dann nein, nicht so wichtig."

- **Version 0.18.1 (PATCH):** alles ändert Bestehendes (Boss, Daten,
  Verwaltung, Werkzeug); nichts kann der Spieler, was vorher nicht ging.
- **Boss ab Buch 4: 5 Versuche** (`bossVersuche` in `BIBLIOTHEK.BUECHER`,
  `BIBLIOTHEK.versuche`). Warum ab 4: Die Bücher 1–3 lernt man das Spiel
  (Bereiche bis 50, viele Wörter); ab Buch 4 liegen die Bosse bei 52–100,
  dort soll es spürbar schwerer werden, ohne dass Buch 1–3 abschrecken.
  Umsetzung additiv: Die Runde trägt `grund` (Versuche ohne Extra-Leben,
  fehlt = 6), `WORDLE.versucheGrund`; das Extra-Leben gibt dann den 6.
  Versuch (`lebenMoeglich` am letzten Grund-Versuch). Sichtbar: rotes
  „5 Versuche" in der Vorstellung, fünf Zeilen im Brett, „X/5" am Ende.
- **Verschleiern statt Klartext** (`js\wortbewertung-daten.js`): nur noch
  `kodiert` (Base64, je Lösungswort ein Byte = Zahl XOR Schlüssel-Byte aus
  FNV-1a über „typoluck|wb|1|" + Wort) und die Schwellen `stufenAb`,
  `skalaAb`. Stufe und Skala rechnet die App aus der Zahl. Warum so: Die
  App braucht zum Ziehen die Zahl JEDES Wortes (Bereiche fest, Wörter
  wandern später) — Kennungen je Bereich würden beim Wechsel auf
  Spieldaten nicht mehr passen und verrieten trotzdem die Bereiche. Ein
  Byte je Wort, am Wort verschlüsselt, ist klein und lässt nichts aus der
  Datei ablesen. **Ehrliche Grenze:** Wer den Code liest, rechnet es
  zurück; wirklich geheim geht nur mit einem Server.
  **Aufwand gemessen:** Datei 3 048 → 1 466 Byte; Entschleiern aller 567
  Wörter samt Nachschlagen 7,5 ms (Node, erster Aufruf); alle 567 Werte
  (Zahl, Stufe, Skala) gleich wie vorher (Vergleich vor/nach).
- **Admin-Lexikon nicht mehr ausgeliefert:** `js\lexikon-daten.js` liegt
  jetzt als `werkzeug\lexikon-daten-alt-0.18.0.js` (nicht ausgeliefert; das
  Werkzeug liest `wortbewertung-voll.js`), der Generator schreibt es nicht
  mehr, `tools\Deploy-Typoluck.ps1` sperrt `lexikon-daten.js` und
  `wortbewertung-voll.js` namentlich. Die Verwaltung zeigt „Nur im
  Werkzeug", bis eine Admin-Quelle (Datenbank-Knoten nur für Admins,
  nächste Regel) in `VERWALTUNG_BILDSCHIRM.LEXIKON_QUELLE` steht.
  **Achtung:** Das Deploy-Skript löscht nichts auf GitHub — die dort seit
  0.16.3 liegende Datei muss der Nutzer im Repository löschen; die
  Git-Geschichte behält alte Fassungen.
- **Sonst noch Klartext?** Geprüft (js, css, tests, docs, index.html,
  sw.js): keine Zahlen je Wort mehr. `js\wortbewertung-korrektur.js` ist
  leer; eine Korrektur von Hand stünde dort lesbar (Wort + Werte) — bei
  Bedarf genauso verschleiern.
- **Lösungsliste bleibt** (`js\woerter-de.js`, Nutzer). Zum Verschleiern
  wäre nötig: Liste als Bytes kodieren (wie oben) und im Spiel erst beim
  Ziehen entschlüsseln; `istErlaubt` bräuchte einen Hash-Vergleich statt
  Klartext; Tageswort-Plan, Tests und Werkzeug lesen sie heute im
  Klartext — mittlerer Umbau, bleibt ebenso zurückrechenbar.
- **Werkzeug:** Spalte „Zahl" ist ein Eingabefeld (leer = gerechnet); die
  Korrektur-Datei trägt `zahl` schon seit 0.18.0. Klein geblieben (ein
  Feld), deshalb gebaut.

## Die Bibliothek (28.09.2026, 0.18.0)

Nutzer 27.09.2026 (spät) wörtlich: „benenne es bei typoluck um in
Bibliothek und die Stockwerke … sollen Bücher werden -> Erste Buch nur
Nomen, zweite etwas schwerer, immer so weiter. Wichtig: die einzelnen Level
sollen nicht bei jedem dasselbe Wort haben, sondern die Wörter haben ja
einen Wert zwischen 0–100 von der Schwierigkeit her; ein Level soll ein
Wort aus einem Bereich nehmen, der soll fix sein, aber das Wort nicht fix
pro Level. Bosse soll es auch geben."
Nachtrag (Koordination, Nutzer-Entscheidung): Die Schwierigkeit soll später
aus echten Spieldaten kommen, keine Häufigkeitsliste; die heutige Bewertung
ist dann nur der Startwert — deshalb EINE Lesestelle.

- **Version 0.18.0 (MINOR):** neue Funktion.
- **Aufbau wie der Blunderluck-Turm** (`Apps\Blunderluck\js\turm.js`,
  `start-turm.js`): Weg aus Punkten, Boss am Ende, Buch durch = Boss gelöst,
  Boss erst nach allen Leveln, Nachholen erlaubt; Figuren 1–3 aus der
  Wertung (`WERTUNG.runde`, Schwellen 55/75), mit Shop-Hilfe höchstens 1.
- **Stand im bestehenden Feld:** `spiele.typoluck.turm.figuren`, Schlüssel
  „Buch-Level" (Level ab 0) — Regel §11b erlaubt `^[0-9]{1,2}-[0-9]{1,2}$`,
  1–3. Keine neuen Konto-Felder. Die Merkliste der zuletzt gespielten Wörter
  bleibt auf dem Gerät (`ICH.spielstand("bibliothek-zuletzt")`, 30 Wörter).
- **6 Bücher × 8 Level (7 + Boss):** Die Bewertung reicht 5–86, dicht
  15–55, oben dünn (20 Wörter über 65). Sechs Bücher in Schritten von
  rund 10 decken das ab, ohne dass oben ein Bereich leer läuft; acht Punkte
  passen als ein Weg auf den Handy-Bildschirm und sind etwas mehr als
  Blunderlucks 5–6 Stufen, weil ein Wort schneller gespielt ist als eine
  Partie. Im Buch steigt jedes Level um 2 Punkte (Fenster 8–9 breit).
- **Bereiche und Wortanzahl** (Stand 28.09.2026; Buch 1 nur Nomen gezählt;
  Test verlangt ≥ 8):

  | Buch | L1 | L2 | L3 | L4 | L5 | L6 | L7 | Boss |
  |---|---|---|---|---|---|---|---|---|
  | 1 (Nomen) | 5–14: 40 | 8–16: 50 | 10–18: 65 | 12–20: 90 | 14–22: 100 | 16–24: 102 | 18–26: 102 | 24–32: 84 |
  | 2 | 15–22: 98 | 17–24: 102 | 19–26: 102 | 21–28: 89 | 23–30: 93 | 25–32: 90 | 27–34: 91 | 32–40: 119 |
  | 3 | 25–32: 90 | 27–34: 91 | 29–36: 95 | 31–38: 95 | 33–40: 111 | 35–42: 106 | 37–44: 111 | 42–50: 101 |
  | 4 | 35–42: 106 | 37–44: 111 | 39–46: 108 | 41–48: 94 | 43–50: 89 | 45–52: 75 | 47–54: 70 | 52–60: 61 |
  | 5 | 45–52: 75 | 47–54: 70 | 49–56: 60 | 51–58: 57 | 53–60: 55 | 55–62: 39 | 57–64: 33 | 62–72: 20 |
  | 6 | 52–58: 49 | 54–60: 46 | 56–62: 35 | 58–64: 28 | 60–66: 23 | 62–68: 16 | 64–72: 18 | 68–100: 10 |

  Die Zahlen gelten für die heutige Bewertung. Wandern Wörter später
  (Spieldaten), bleiben die Bereiche fest, der Test zählt über dieselbe
  Lesestelle neu, und ein leer gewordener Bereich nimmt zur Laufzeit die
  8 nächstgelegenen Wörter (`BIBLIOTHEK.naechsteWoerter`).
- **Boss-Regel:** Bereich am oberen Ende des Buchs (Obergrenze über allen
  Leveln, breiteres Fenster), sichtbar anders (grösserer roter Punkt mit
  Maske, Vorstellung „BOSS" mit Beben, rote Kopfzeile in der Runde, +25
  Münzen beim ersten Sieg) — aber **sechs Versuche wie immer**. Warum
  nicht einen weniger: Das Extra-Leben aus dem Shop hängt am 6. Versuch
  (`WORDLE.lebenMoeglich`), fünf Versuche würden Modell, Brett und Shop
  zugleich ändern; und bei den schwersten Wörtern entscheidet mit fünf
  Versuchen oft Glück statt Können (die Wertung trennt Glück bewusst ab).
  Frage an den Nutzer, ob er es trotzdem will.
- **Buch 1 nur Nomen:** `js\wortarten-daten.js` nennt die Ausnahmen
  (alles andere gilt als Nomen). `keinNomen` (36): banal, blind, blond,
  braun, bravo, breit, dicht, eigen, eilig, eitel, flach, flink, frech,
  genau, glatt, grell, heute, klein, knapp, krank, krumm, leise, mager,
  mutig, nackt, nobel, offen, prima, ruhig, sanft, sauer, schön, stark,
  steil, still, weich. `beides` (11, auch nicht in Buch 1): bitte, elend,
  essen, extra, feige, ideal, leben, lokal, recht, reich, stolz. Von Hand
  gesetzt (Claude) — zum Nachsehen durch den Nutzer.
- **Eine Lesestelle:** `WORTBEWERTUNG.schwierigkeit(wort)` (0–100,
  vorgerechnet, Korrektur `zahl` gewinnt). `js\wortbewertung-daten.js`
  trägt dafür `zahlen` (zwei Ziffern je Wort) und `stufenAb` [27, 42];
  `WORTBEWERTUNG.stufe` (Tageswort-XP) rechnet seitdem daraus — heute
  gleich der vorgerechneten Stufe (Test). Die Zahl liegt damit öffentlich
  im Repository (wie schon `js\lexikon-daten.js`); die Teilwerte bleiben im
  Werkzeug.
- **Start:** Art-Wahl am Quadrat neben „Spielen" (Bibliothek · Frei, wie
  Blunderluck); Vorgabe Bibliothek (Entwurf „Start-Tab = Turm"); Frei zeigt
  die Kachel wie bisher, das Quadrat steht in ihrer Knopf-Reihe. Das
  Tageswort bleibt über Frei und den Tab Aufgaben erreichbar.
- **Nicht gebaut** (eigene Version nach Konzept): Datensammlung aus
  Spielen, Spieler-Stufe, anpassendes Tageswort.

## Verwaltung nur in den Einstellungen; Shop-Texte über `texte` (27.09.2026, 0.17.1)

Nutzer 27.09.2026 (spät) wörtlich: „der verwalten tab sollte aber nur in den
einstellungen der beiden spiele liegen und nicht doppelt irgendwo".
- **Ein Weg:** Knopf „Verwaltung" in der Karte „UPCrew-Konto" der
  Einstellungen, nur wenn `VERWALTUNG_BILDSCHIRM.erlaubt()` (Admin bzw.
  Werkstatt `&admin` auf localhost) — wie Blunderluck
  (`js\einstellungen.js`). Der Bildschirm meldet sich mit `imMenue: false`
  an, steht nicht in `NAVIGATION.LEISTE` (also auch nicht wischbar);
  `tests\test-verwaltung.js` prüft, dass keine andere js-Datei den
  Bildschirm nennt. Die Werkstatt-Adresse `&bildschirm=verwaltung` bleibt
  als Prüfhilfe (nur lokal, ohne Recht zurück zum Start).
- **Platz in der Konto-Karte** (vor „Abmelden"), nicht als eigene Karte:
  so steht er wie in Blunderluck zwischen den Konto-Knöpfen.
- **Version 0.17.1 (PATCH):** Die Verwaltung gab es schon; sie zieht nur um.
- **Shop-Texte:** `js\upcrew-shop.js` neu aus final (Option `texte`,
  `UPCREW_SHOP.text`). `SHOP_BILDSCHIRM.TEXTE` wird als `texte` übergeben
  und für Rückfrage/Kurzmeldung über `UPCREW_SHOP.text` gelesen;
  `UPCREW_MUENZEN.WAREN` wird nicht mehr überschrieben (erledigt den
  Vorschlag aus 0.17.0).

## Münzen, Shop, Serie ab Rundenstart (27.09.2026, 0.17.0)

Nutzer-Entscheidungen 27.09.; Blunderluck v0.152.0 baute zuerst, Typoluck
übernimmt 1:1.
- **Version 0.17.0** (neue Funktion für Spieler). Der Turm wird damit
  frühestens 0.18.0.
- **Rechnung gleich:** Die Serien- und Zähler-Funktionen in
  `js\fortschritt.js` sind Zeile für Zeile Blunderlucks (Test vergleicht
  elf Funktionen), dazu `spielLeer` als Name für `zweigLeer`.
- **„Start" in Typoluck = heute einen Versuch abgegeben** (Tageswort oder
  Übung, `APP.rundeGestartet`). Nur Öffnen zählt nicht — wer bloss das
  fertige Tageswort ansieht, hat nicht gespielt; wie Blunderlucks
  „Anpfiff" zählt erst die erste echte Handlung.
- **Münzen:** Tageswort (erstes Schaffen des Tages) +10, gelöste Übung +3,
  Level +10 je Stufe, jeder 7. Serientag +20; Figuren/Boss erst mit dem
  Turm.
- **Extra-Leben:** angeboten nach dem 6. Fehlversuch (einmal je Runde).
  Rangliste: ein 7. Versuch zählt wie „X/6" (fair gegenüber allen ohne
  Kauf, ältere Fassungen lesen höchstens 6 Versuche). **Tipp:** die erste
  Stelle, die noch nie grün war, wird aufgedeckt und in die Eingabe
  geschrieben. Mit einer Ware höchstens ein Bauer (`partie`, `hilfe`).
- **Waren-Texte:** Der Baustein beschreibt Blunderlucks Waren; Typoluck
  setzt beim Start eigene Texte (`SHOP_BILDSCHIRM.TEXTE`) — Vorschlag an
  final: `UPCREW_SHOP.bauen(…, { texte })`, dann entfällt das.

## Verwaltung für Admins: Lexikon und Spielerliste (27.09.2026, 0.16.3)

Nutzer: „der Admin soll in Typoluck das Lexikon sehen mit den Wörtern, und
in beiden generell eine Spielerliste mit Statistiken und co — aber nur der
Admin-Account".
- **0.16.3, nicht 0.17.0:** nur eine neue Ansicht für Admins; für Spieler
  ändert sich nichts, kein Datenmodell, keine Regel.
- **Wer:** `KONTO.istAdmin` (UP#Plus oder Rolle „admin"). Menü-Eintrag nur
  für sie (`imMenue` darf eine Frage sein); der Bildschirm prüft selbst noch
  einmal und schickt sonst sofort zum Start. Werkstatt-Schalter `&admin`
  nur auf localhost.
- **Lexikon:** die volle Bewertung (`js\lexikon-daten.js`) wird erst beim
  Öffnen nachgeladen — nicht in index.html, nicht im Vorabspeicher. Nur
  ansehen; Korrekturen bleiben im lokalen Werkzeug.
- **Spielerliste:** gemeinsamer Baustein `js\upcrew-spielerliste.js` +
  `css\upcrew-spielerliste.css` (Vorschlag für final), nur lesen, Karten
  statt breiter Tabelle. Blunderluck hängt ihn in seine Verwaltung neben
  Rechte/Umbenennen.
- **Nur eine Sperre der Oberfläche** (siehe STATUS: Vorschlag zu den Regeln).

## Die Wort-Bewertung (27.09.2026, 0.16.0)

Nutzer: „ein Bewertungssystem … Wörter bewerten, wie schwierig diese sind,
damit in einem Level-System mit Boss die Schwierigkeit erhöht wird" — dazu
„also einfache Worte sind welche mit zwei unterschiedlichen a e i o u" und
„nur ich soll diese filtern und die ganze Library sehen können".
- **Zahl 0–100 aus fünf Teilen** (`js\wortbewertung.js`, Gewichte im Kopf):
  Löser 0,40 (WordleBot-Art: kleinste erwartete Restmenge, gegen die eigene
  Liste, drei beste Startwörter ALTER/LASER/KLARE, Mittel der Versuche —
  misst, was ein guter Spieler erlebt), Vokale 0,25 (Nutzer-Regel: genau
  zwei verschiedene aus a/e/i/o/u = 0, drei = 0,3, vier+ = 0,5, einer =
  0,8, keiner = 1 — deutlich, damit sie sichtbar wirkt), Fallen 0,15
  (Nachbarn an genau einer Stelle, trifft Menschen härter als den Löser),
  Muster 0,20 (Doppelte, Umlaut, seltene Buchstaben — der alte Maßstab
  lebt hier weiter), Bekanntheit 0 (Platz vorgesehen; die Quelle einer
  Häufigkeitsliste entscheidet der Nutzer).
- **Stufen = Drittel** der Zahlen (leicht < 27 ≤ mittel < 42 ≤ schwer):
  so kommen +15/+20/+30 XP im Mittel gleich oft vor; **Skala 1–10 =
  Zehntel** für den Turm. Schwellen stehen in den Daten, ändern sich nur
  beim Neurechnen.
- **Vorab gerechnet, nicht live:** `werkzeug\Woerter-Bewerten.ps1`
  (1 Sekunde). Die App bekommt NUR Stufe und Skala je Wort
  (`js\wortbewertung-daten.js`, zwei Ziffernfolgen); die volle Bewertung
  liegt in `werkzeug\wortbewertung-voll.js`.
- **Nur für den Nutzer:** Werkzeug-Seite `werkzeug\woerter-werkzeug.html`
  (Tabelle, Filter, Korrektur, Tageswort-Plan), Ordner `werkzeug\` steht
  nicht in der Freigabe von `tools\Deploy-Typoluck.ps1`, kein Einstieg aus
  der App (Test).
- **Korrektur von Hand gewinnt immer** (`js\wortbewertung-korrektur.js`).
  Weg: Werkzeug-Seite → „Korrekturen herunterladen" →
  `werkzeug\Wortkorrektur-Uebernehmen.ps1` (prüft und legt nach `js\`).
  Einfacher ginge es nur mit einem Schreib-Dienst am lokalen Server — mehr
  bewegliche Teile als ein Klick plus ein Skript. „Ungeeignet" nimmt ein
  Wort aus der Übung (und später aus dem Turm), nie aus dem Tageswort.
- **Tageswort-Auswahl NICHT umgestellt:** Sie rechnet Datum → Wort ohne
  Stufen; jede Umstellung zur ausgewogenen Mischung änderte künftige
  Tage, die Geräte mit älterer Fassung anders sähen. Die Werkzeug-Seite
  zeigt den Plan der nächsten 30 Tage mit Stufen (Vorschlag/Ansicht).

## Gleicher Name und gleiches Passwort erlaubt (27.09.2026, 0.15.7)

Nutzer-Entscheid (über den Koordinator), gleich Blunderluck v0.151.9:
- Zwei Konten dürfen **denselben Namen UND dasselbe Passwort** haben; sie
  unterscheiden sich nur in der Nummer. Beim Anmelden nur mit Namen prüft
  die App **alle** gleichnamigen Konten (höchstens 20) und fragt bei
  mehreren Treffern „Welches Konto?".
- In dieser Liste — und nur dort im Anmelde-Ablauf — steht die Nummer,
  dazu Level und letzter Spieltag, soweit ohne Anmeldung lesbar; sonst
  wären die Konten nicht zu unterscheiden.
- Die Treffer bleiben nur im Speicher (nie auf dem Gerät), 10 Minuten
  gültig; danach wird beim Antippen einmal neu angemeldet. Abbrechen
  verwirft sie und meldet niemanden an.
- `js\konto.js` bleibt Blunderlucks Fassung (nur `SCHLUESSEL` eigen).

## Nachtrag Runde 6: XP nach Schwierigkeit, eine Rahmen-Regel, Kachel-Sets (27.09.2026, 0.14.0)

Nutzer-Antworten `AUFTRAEGE-RUNDE-6.md`, D0 „Nachtrag".
- **Grund-XP 15/20/30** nach Schwierigkeit, in beiden Spielen dieselbe
  Formel (+10 je Figur, ×1,5 und Serie wie bisher). Typolucks Stufe kommt
  aus der **Seltenheit der Buchstaben** (Summe über verschiedene
  Buchstaben, wie viele Lösungswörter sie enthalten; Drittel der Liste).
  Warum nicht „Kandidaten nach bestem ersten Versuch": Die Restmenge hängt
  am Farbmuster und streut stark; die Seltenheit ist schnell, fest je Wort
  und leicht zu erklären. Ob sie zum Gefühl passt, entscheidet der Nutzer.
- **Rahmen ab Level 10, dann alle 5** (Silber, Gold, Platin, „Glanz n") und
  Titel wie Blunderluck. Kupfer ab 5 fällt weg — Blunderluck muss das
  nachziehen (dessen `RAHMEN` hat noch Kupfer 5, nur gelesen).
- **Kachel-Sets**: zehn, nur Material (Grund, Rahmen, Abstufung der drei
  Kachelfarben, Tasten, feines Muster). Orange/Blau und die Sperre gelten;
  Lesbarkeit per Test. Das Set geht der Farbwelt bei Kacheln und Tasten
  vor (`!important`), Papier setzt nichts. Wahl nur auf dem Gerät. Die
  fünf eigenen Vorschläge gibt es nur in der Werkstatt, bis der Nutzer
  wählt.
- **`umzug` nur auf dem Gerät** (`typoluck.fortschritt-umzug`): Die Regel
  §11b nimmt nur Vertragsfelder an, und Blunderluck schickt alle Zweige
  mit. `fuerKonto` liefert genau die erlaubten Felder.

## UPCrew-Runde 6: gemeinsamer Vertrag, Profil-Blatt, Taten (27.09.2026, 0.11.0–0.13.0)

Auftrag `Design\3D-Schrift\docs\AUFTRAEGE-RUNDE-6.md` Teil A + C; Nutzer-
Antworten zu Teil D (27.09.2026, über den Hauptchat): Typoluck-Turm und
Schwur-Halle WARTEN („dafür muss erstmal ein Tool / Bewertungssystem her"),
Taten dagegen jetzt als 0.13.0; ausgeliefert wird erst nach Ansehen.

- **Zweig-Form statt flachem Stand** (0.11.0): `spiele.typoluck` unter
  `upcrew.fortschritt`, Vorlage Blunderluck. Warum: Mit einem gemeinsamen
  Stand überschreibt das eine Spiel die XP des anderen. Level = Summe der
  Zweige, Serie = Tage aller Zweige, beides nur gerechnet.
- **Gäste unter „gast"** wie Blunderluck (`_person`). Sonst sähen die Spiele
  bei Gästen verschiedene Einträge (Typoluck führte sie unter der Konto-Id
  des Gasts). Ein 0.10.0-Gaststand zieht einmal dorthin um
  (`gastUebernehmen`), der alte Eintrag bleibt stehen.
- **Umzug 0.10.0**: Serie → ebenso viele Tage bis `zuletzt`; Schutz wird
  seitdem aus dem Level gerechnet (wie Blunderluck) — nie weniger als der
  gespeicherte, weil der aus denselben Aufstiegen kam. Der alte Stand steht
  wörtlich in `umzug.alt`. Mischform (Blunderluck war zuerst da) wird
  erkannt; im Browser mit Blunderlucks echter `fortschritt.js` (v0.150.0)
  nachgespielt: Summen gleich (335/335), Blunderluck sieht das Tageswort.
- **×1,5 nur auf die eigene Tagesaufgabe**, wenn das andere Spiel heute
  schon geschafft hat (Blunderluck-Regel, Teil A). 0.10.0 gab ×1,5 auf
  alles des Tages, rückwirkend — das konnte Blunderluck nie spiegeln.
- **Figuren-XP beim Tageswort bleibt** (+10 je Figur, live seit 0.10.0);
  Blunderlucks Tagesbrett gibt keine. Abweichung bewusst stehen gelassen,
  bis der Nutzer sie angleichen will.
- **Profil-Blatt** (0.12.0) wie Entwurf `profilBlatt`; Rahmen nach Level 10
  wie Entwurf `belohnungen` („Glanz" bei 15, 25 …, „Rahmen 20/30 …").
  Blunderluck hat Silber erst ab 10 und „Glanz n" ab 25 — anders als der
  Entwurf; hier gilt der Entwurf. Orte von Blunderluck stehen als Namen in
  `KONFIG.andereSpiele.blunderluck.orte` (abgelesen), der Ort ist der
  höchste mit einer Figur.
- **Taten** (0.13.0): vier neue Kachel-Sets (Leder, Blei, Holz, Neon;
  Papier = Grund-Set) über sicher messbare Taten. Bestandsschutz: kein
  Stück von vorher hängt an einer Tat. Anziehen lassen sie sich noch nicht.

## UPCrew-Runde 5, Typoluck-Teil „Heute + Level" (27.09.2026, 0.10.0)

Auftrag: `Design\3D-Schrift\docs\AUFTRAEGE-RUNDE-5.md` (Regeln und Zahlen:
`Apps\UPCrew\docs\FORTSCHRITT.md`, „GÜLTIGER STAND"). Die offenen Fragen
der Auftragsdatei, soweit sie Typoluck betreffen, hat der Nutzer am
27.09.2026 beantwortet (die Fragen 1, 3, 5 gehören Blunderluck):

- **Erst Runde 4, dann Runde 5 — je eine Version** (0.9.0, 0.10.0).
  Beide liegen lokal; 0.9.0 wurde nicht einzeln ausgeliefert, weil Runde 5
  in derselben Sitzung darauf gebaut wurde. Geht 0.10.0 live, ist 0.9.0 im
  `CHANGELOG.md` die Zwischenstufe.
- **Frage 4 — kein Typoluck-Turm jetzt:** „erst Heute + Level". Der Turm
  braucht ein eigenes Wort-Thema (Orte, Gegner, Bosse); das legt der
  Nutzer später fest. Damit entfällt auch die Art-Wahl Turm/Frei am
  Spielen-Knopf — ohne Turm gäbe es nur eine Art.
- **Frage 6 — nach Level 10:** alle 5 Level ein Rahmen, dazwischen je ein
  Serien-Schutz („so übernehmen"). Der Schutz wird beim Aufstieg sofort
  gutgeschrieben; Rahmen und Titel stehen vorerst nur in der Liste der
  Belohnungen, getragen werden sie noch nirgends.
- **Speicher — erst nur auf dem Gerät:** Browser-Schlüssel
  `upcrew.fortschritt`, je Spieler-Id ein Eintrag. Bewusst ein
  `upcrew.`-Schlüssel und nicht `typoluck.`: Das Level gehört allen
  UPCrew-Spielen, und Typoluck und Blunderluck teilen auf
  up-birdo.github.io denselben Browser-Speicher (wie bei
  `upcrew.aussehen`). Je Spieler-Id, damit zwei Menschen am selben Gerät
  nicht ein Level teilen. Der Abgleich übers Konto
  (`spieler/konten/<uid>/fortschritt`) kommt mit der Datenbank-Regel.
- **Datenvertrag wie im Auftrag vorgeschlagen, additiv ergänzt:**
  `heute.xp` (für das rückwirkende ×1,5) und die Zähler `tagesaufgaben`,
  `figuren`, `besteSerie` (für die Abzeichen). `level` wird aus `xp`
  gerechnet, nie übernommen — so kann ein kaputter oder fremder Stand kein
  falsches Level behaupten.
- **Wertung Typoluck:** Können je Versuch gegen den besten möglichen
  Versuch (Logarithmus der erwarteten Restmenge), Glück getrennt; Figuren
  nach den Schwellen 55/75 des ersten Typoluck-Orts im Entwurf. Figuren
  gibt es nur für die Tagesaufgabe; die Übung bringt nur die Partie-XP —
  sonst liesse sich das Level mit Übungsrunden hochtreiben, ohne dass
  „neue Figur" noch etwas bedeutet.
- **Tagesaufgabe = Tageswort gelöst**, an seinem eigenen Tag. Verloren
  zählt es als Partie, nicht als Tagesaufgabe, und hält die Serie nicht.
- **Serie = Tage mit mindestens einer geschafften Tagesaufgabe**, egal in
  welchem Spiel — die Flammen gehören UPCrew, nicht Typoluck. Die alte
  Kennzahl „Serie" im Kurzprofil (gelöste Tageswörter in Folge) bleibt,
  sie misst etwas anderes.
- **Die andere App** (Tagesbrett) wird nur gelesen: Was Blunderluck unter
  `heute.brett` einträgt, zeigt Typoluck; sonst „Zu Blunderluck". Die
  Adresse steht in `KONFIG.andereSpiele`.

## UPCrew-Runde 4: Leiste nur Symbole, Tab „Sammlung" (27.09.2026, 0.9.0)

Auftrag: `Design\3D-Schrift\docs\AUFTRAEGE-RUNDE-4.md`, Blöcke „Gemeinsam"
und „Typoluck".

- **Leiste = kopierter Baustein** `css\upcrew-leiste.css`; die Tabs baut
  `BAUSTEINE.tab` (nicht `knopf`), weil der Baustein genau sein Markup
  verlangt und der eigene Knopf-Stil sich sonst einmischen würde. Nur die
  feste Lage unten bleibt Typoluck-eigen (`.leiste.up-leiste`).
- **Sammlung ersetzt Anpassen**, der Baustein steht direkt im Tab. Die
  Kopfzeile klebt auf diesem Bildschirm mit, damit die Vorschau bündig
  darunter kleben kann (Typoluck scrollt die ganze Seite, der Entwurf nur
  einen Rahmen).
- **Modi mit den Namen der App** („Übung", „Schwer") statt „Frei" und
  „Schwer-Modus" aus dem Auftrag: Der Spieler soll dasselbe Wort sehen wie
  auf dem Start; „Schwer-Modus" brach in der Kachel um.
- **„NN %"** zählt Farbwelt, Schrift, Knöpfe und die Modi — die
  Darstellung nicht (immer ganz frei, kein Sammelstück).

## Vibration raus, UPCrew-Icons, „Freunde heute" lebt (26.09.2026, 0.8.1)

- **Vibration ganz entfernt, nicht nur abgeschaltet** (Absprache Runde 3,
  Nutzer: „kommt erst wann anders"): `fuehlen.js` gelöscht statt stummer
  Hülle — toter Code würde gewartet, ohne etwas zu tun. Kommt sie wieder,
  dann als gemeinsamer Baustein für alle UPCrew-Spiele. Der gespeicherte
  Wert „vibration" bleibt liegen, wird nur nicht mehr gelesen (additiver
  Datenvertrag).
- **Icons nur als PNG:** `icon.svg` zeigt das alte Logo; Android kann ein
  SVG mit „any" dem PNG vorziehen — deshalb raus aus Manifest und Seite.
  Die Datei bleibt, `Icons-Erzeugen.ps1` ist gesperrt (`-AltesLogo`), damit
  niemand die neuen Icons versehentlich überzeichnet.
- **„Freunde heute" still auffrischen** (30 s, nur auf dem Start, nicht in
  der Werkstatt): stehende Tabelle bleibt, Neuzeichnen nur bei Änderung.
- PATCH: nichts kann der Nutzer neu, was vorher gar nicht ging; alles in
  EINER Auslieferung gebündelt, weil 0.8.1 noch nicht draussen war.

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
