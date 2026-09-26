# Typoluck — Erkenntnisse

Teuer erkaufte Einsichten: Bug-Ursachen und Fallen, die nicht offensichtlich
sind. Jede neue gehört hierher UND in `00-INDEX.md`, bevor die Runde endet.

## Das Deploy-Skript lädt nur freigegebene Ordner hoch (26.09.2026)

0.8.0 brachte den neuen Ordner `schrift\` (Crew-Schriften). Alle Tests
waren grün, auch „jede Datei aus `sw.js` existiert" — aber
`tools\Deploy-Typoluck.ps1` lädt nur die Ordner aus `$freigegebeneOrdner`
hoch und behandelt nur die Endungen aus `$binaerEndungen` als Binärdatei.
Erst `-NurAnzeigen` zeigte, dass keine Schrift dabei war. Live hätte der
Service Worker dann nicht installiert werden können (`addAll` scheitert an
jeder fehlenden Datei), und die App hätte ohne Crew-Schrift ausgesehen.
**Lehre:** Wer einen neuen Ordner oder eine neue Dateiart einführt, trägt sie
im Deploy-Skript ein und liest vor dem Ausliefern die `-NurAnzeigen`-Liste
gegen die `DATEIEN` in `sw.js`.

## Eine Variable auf 0 versteckt, welche Regel wirklich gewinnt (25.09.2026)

Beim Einschalten der Tiefe (0.1.1) bekamen die Knöpfe der Leiste unten eine
Kante, obwohl `.knopf-leiste` ausdrücklich `box-shadow: none` sagt. Ursache:
`.knopf-leiste` steht in `css\stil.css` VOR `.knopf`, beide Regeln wiegen
gleich, also gewinnt `.knopf` — schon immer, auch bei Schriftgrösse,
Innenabstand und Mindesthöhe. Solange `--knopf-tiefe` 0 war, war der
Schatten unsichtbar und fiel nicht auf. Die naheliegende Reparatur
(`.knopf.knopf-leiste` für die ganze Regel) hätte die Leiste sichtbar
verändert (kleinere Schrift), obwohl 0.1.0 so ausgeliefert ist. Deshalb
nimmt eine eigene Regel `.knopf.knopf-leiste` NUR die Kante weg. **Lehre:**
Wer einen Schalter von 0 hochdreht, sieht sich JEDE Stelle an, die ihn
benutzt — auch die, die ihn angeblich abschalten.

## window.open mit "noopener" liefert immer null (24.09.2026)

`window.open(adresse, "_blank", "noopener")` öffnet das Fenster, gibt aber
laut Norm IMMER `null` zurück. Wer daraus „Fenster blockiert" schliesst,
zeigt die Meldung bei jedem Klick. In `js\wunsch.js` deshalb ohne drittes
Argument öffnen und danach `fenster.opener = null` setzen.

## Eine CSS-Animation kann nicht „zur Farbe der Klasse" springen (24.09.2026)

Beim Aufdecken soll die Kachel neutral zuklappen und farbig aufklappen. Eine
Animation, die die Farbe nur in der ersten Hälfte festlegt, blendet danach
langsam zur Klassenfarbe über — kein Wechsel im Moment des Umklappens. Die
Farbe setzt deshalb `js\bildschirm-wordle.js` per Zeitgeber genau in der
Mitte (`_zeichnenMitAufdecken`); die Animation dreht nur.

## In der Testumgebung gibt es kein window.setInterval (24.09.2026)

Die Tests ersetzen `window` durch ein schlichtes Objekt mit Gerätespeicher.
Ein `window.setInterval` im Modell brach dort mit TypeError ab. In Modell-
und Leitungs-Dateien deshalb die globalen `setTimeout`/`setInterval`
benutzen — sie gibt es im Browser und in Node gleichermassen.

## Firebase speichert leere Listen gar nicht (übernommen aus Blunderluck)

`freunde: []` kommt beim nächsten Laden als fehlendes Feld zurück, und eine
Liste mit Lücken als Objekt mit Zahlen-Schlüsseln. `SPIELER.normalisieren`
legt fehlende Listen wieder an und macht aus dem Objekt eine Liste — der
Test „Liste als Objekt wird zur Liste" hält es fest.
