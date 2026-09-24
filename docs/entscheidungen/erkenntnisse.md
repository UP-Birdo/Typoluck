# Typoluck — Erkenntnisse

Teuer erkaufte Einsichten: Bug-Ursachen und Fallen, die nicht offensichtlich
sind. Jede neue gehört hierher UND in `00-INDEX.md`, bevor die Runde endet.

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
