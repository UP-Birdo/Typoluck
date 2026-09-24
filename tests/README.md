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
| `test-syntax.js` | Übersetzbarkeit aller Dateien, Version an allen Stellen, `sw.js` gegen `index.html` und Platte, kein confirm/alert/prompt, keine Emojis, keine Tabs, unantastbare Werte |

`pruefer.js` ist das kleine Prüfwerkzeug (`pruefe`, `gleich`, `spaeter`,
`fazit`). **Neue Prüfungen gehören VOR `fazit()`** — dahinter laufen sie nie.

**Was kein Test prüft: die Bildschirme.** Sie werden angesehen — die
Werkstatt (`?werkstatt`, Kopf von `js\werkstatt.js`) stellt jeden Zustand
her, Edge kopflos macht das Bild (`docs\DEPLOYMENT.md`, Abschnitt 5).
