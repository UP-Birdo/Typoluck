# Typoluck — Tests

Ein Aufruf, Haus-Standard:

    powershell -ExecutionPolicy Bypass -File "tools\Test-Typoluck.ps1" -NurFazit

Eine Zeile, erwartet `0 Fehler`, Exit 0. Ohne `-NurFazit` kommt die volle
Ausgabe je Testdatei. Kein Node auf diesem Rechner: `tests\Tests-Ausfuehren.ps1`
startet VS Codes Electron als Node (`ELECTRON_RUN_AS_NODE=1`) und sucht
`Code.exe` in allen Benutzerprofilen.

**Die Tests laden die ECHTEN Dateien aus `js\`** (`umgebung.js`), keine
Kopien. Sie gehen nie ins Netz — die Datenbank spielt eine Attrappe.

| Datei | Prüft |
|---|---|
| `test-woerter.js` | Wortliste: 5 Buchstaben, keine Doppelten, kein ß; Tagesplan: teilerfremd, wächst nur, jedes Wort einmal je Zyklus; **das Wort von Tag 1 und 2 für immer** |
| `test-wordle.js` | Bewerten (doppelte Buchstaben, Umlaute), Runde, Fehler, Tastatur-Zustand, Muster, Datum über die Zeitumstellung, Wiederherstellen |
| `test-spieler.js` | **Die geteilte Spielerliste:** fremde Felder bleiben, neue Einträge sehen aus wie Blunderlucks, Marke steigt, Zusammenführen, Freundschaft |
| `test-versiegelung.js` | Passwort-Prüfsumme gleich wie Blunderluck (unabhängig gerechneter Vergleichswert) |
| `test-ergebnisse-rangliste.js` | Ergebnis ohne Wort, Warteliste ohne/mit Netz, Punkte, Tabellen, Plätze, Serie |
| `test-speicher-abgleich.js` | Lokaler Speicher in Teilen; Abgleich: behält Neue vom Server, schreibt nie ohne Server, Marke spart Laden |
| `test-syntax.js` | Übersetzbarkeit aller Dateien, Version an allen Stellen, `sw.js` gegen `index.html` und Platte (seit 0.8.0 auch die Crew-Schriften), kein confirm/alert/prompt, keine Emojis, keine Tabs, unantastbare Werte, Leiste mit fünf Plätzen, keine festgeschriebenen Standard-/Stufen-Werte. Die kopierten `upcrew-*`-Bausteine und (seit 0.28.1) die Kern-Bausteine `speicher-konten.js`, `fortschritt-kern.js` (Quelle seit 03.10.2026 `..\UPCrew\bausteine`) sind von Form- und Emoji-Prüfung ausgenommen (Begründung im Kopf der Datei) |
| `test-darstellung.js` | Hell/dunkel und Standard-Schrift über das gemeinsame Aussehen (`upcrew-aussehen.js`), der einmalige Umzug der alten Wahl, Kachelfarben-Sperre für jede Kachelfarbe und jede Farbwelt |
| `test-knoepfe.js` | `BAUSTEINE.knopf` vergibt `up-kn`-Klassen und Leuchtpunkt (in einem Ersatz-DOM); kein eigener Stil gibt diesen Knöpfen Rundung, Kante, Schatten oder Rahmen |
| `test-aussehen-abgleich.js` | Aussehen am Konto: senden (mit Marke, fremde Felder bleiben), holen (neuer gewinnt), nichts für Gäste, still bei abgelehnter Regel |
| `test-sammlung.js` | Sammlung (seit 0.9.0): Modi 3/5 wie im Auftrag, nichts gesperrt, was es heute gibt; Anteil „NN %" aus den echten Stufen des Anpassen-Bausteins |
| `test-wertung.js` | Wertung einer Runde (seit 0.10.0): Erwartung und Gruppen, Können 0–100, bester Versuch 100, „Lösung stand fest" wird nicht gewertet (Probelauf TISCH/BLUME/BLICK), Figuren nach den Schwellen, eine echte Runde unter 3 s |
| `test-fortschritt.js` | Fortschritt (seit 0.10.0): Level-Kosten, XP je Quelle nur einmal am Tag, ×1,5 für beide Spiele, Serie mit Schutz, Belohnungen nach Level 10, additiver Datenvertrag, Speicher je Spieler unter `upcrew.fortschritt`; seit 0.28.1 der Kern-Baustein: Typoluck liefert jedes Glied aus `FORTSCHRITT_KERN_ERWARTET`, und `js\fortschritt.js` schreibt kein Glied des Kerns noch einmal |
| `test-regel-12.js` | Regel §12 Phase A (seit 0.22.0): die echten Dateien gegen eine Firebase mit der ECHTEN Regel (`regel-nachbau.js`, Kopie aus Blunderluck) — Umstieg alt → §12 → nachziehen → zurück; Lesen, Anmelden, Auswahl, Freund suchen nur Name#Nummer, Nummer ändern, Anlegen, Gast, Marke, Fortschritt + Auszug, Auszug = voller Fortschritt. Regeltexte aus `Apps/Blunderluck/SICHERHEIT.md` und `Apps/UPCrew/docs/DATENBANK-KONZEPT-12.md` (nur gelesen; fehlen sie, prüft der Test nichts) |

**Blicke aus dem Projekt hinaus** (Stand 03.10.2026, 0.28.1; fehlt der
Nachbar-Ordner, prüft die Stelle nichts). Die Quelle der gemeinsamen
Bausteine ist `..\UPCrew\bausteine`; ob die Kopien gleich sind, prüft
`..\UPCrew\tools\Bausteine-Pruefen.ps1` für alle Apps. Typoluck schaut nie
mehr in ein Schwester-Spiel — was unten noch nach Blunderluck schaut, ist im
Test vermerkt und fällt weg, sobald die Sache in UPCrew liegt:

| Test | Liest | Verbleib |
|---|---|---|
| `test-oberflaeche-7.js` | `..\UPCrew\bausteine\js`, `css` und (seit 0.28.1) `kern` — Byte-Vergleich der Bausteine, `konto.js` bis auf den Schlüssel | bleibt (UPCrew) |
| `test-regel-12.js`, `test-lieblingswoerter.js` | `..\UPCrew\docs\DATENBANK-KONZEPT-12.md` | bleibt (UPCrew) |
| `test-wunsch.js` | `..\Blunderluck\js\wunsch.js` (Zeichenliste) | vorerst |
| `test-regel-12.js` | `..\Blunderluck\SICHERHEIT.md` (eingespielte Regeltexte) | vorerst, bis die Regeltexte in UPCrew liegen |

Weggefallen mit 0.28.1 (die Sache ist jetzt ein Kern-Baustein): `test-konto.js`
↔ `..\Blunderluck\js\speicher.js` (Klasse `SpeicherKonten`, jetzt
`js\speicher-konten.js`); `test-muenzen.js` und `test-spielzeit.js` ↔
`..\Blunderluck\js\fortschritt.js` (alle verglichenen Glieder stehen jetzt in
`js\fortschritt-kern.js`). Diese drei Tests lesen nur noch im eigenen Projekt.

`pruefer.js` ist das kleine Prüfwerkzeug (`pruefe`, `gleich`, `spaeter`,
`fazit`). **Neue Prüfungen gehören VOR `fazit()`** — dahinter laufen sie nie.

`kern.js` (seit 0.28.1) stellt `FORTSCHRITT_KERN` und das zusammengesetzte
`FORTSCHRITT` als globale Namen bereit, wie der Browser sie sieht. **Jeder
Test, der `js\fortschritt.js` lädt, holt zuerst `require("./kern.js")`** —
sonst fehlt der Kern. Tests mit eigenem Kontext (`vm`) stellen stattdessen den
Text von `js\fortschritt-kern.js` vor den von `js\fortschritt.js`, und
`js\speicher-konten.js` hinter `js\speicher.js`.

**Was kein Test prüft: die Bildschirme.** Sie werden angesehen — die
Werkstatt (`?werkstatt`, Kopf von `js\werkstatt.js`) stellt jeden Zustand
her, Edge kopflos macht das Bild (`docs\DEPLOYMENT.md`, Abschnitt 5).
