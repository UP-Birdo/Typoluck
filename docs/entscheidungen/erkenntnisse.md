# Typoluck — Erkenntnisse

Teuer erkaufte Einsichten: Bug-Ursachen und Fallen, die nicht offensichtlich
sind. Jede neue gehört hierher UND in `00-INDEX.md`, bevor die Runde endet.

## Der Service Worker füllt sich aus der HTTP-Ablage (27.09.2026)

Auf 8093 lief nach einer Änderung an `js\sammlung.js` weiter die alte
Fassung, obwohl die Datei richtig war — auch nach Neuladen mit Umschalt.
Ursache: `cache.addAll` und `fetch` gehen durch die HTTP-Ablage des
Browsers; der Python-Server schickt nur `Last-Modified`, und der Browser
hält Dateien daraufhin eine Weile für frisch. Live droht dasselbe (GitHub
Pages: 10 Minuten): Ein neuer Worker kann alte Dateien einlagern — neue und
alte gemischt. Seit 0.13.0: `addAll` mit `cache: "reload"`, beim Bauen
`fetch(…, { cache: "no-cache" })`. Wer lokal trotzdem Altes sieht: im
Browser die Service Worker abmelden und die Zwischenspeicher leeren.

## Eine Wertung darf nicht bestrafen, was der Spieler nicht wissen kann (27.09.2026)

Erster Probelauf der Wertung (0.10.0): TISCH liess von 567 möglichen
Lösungen nur BLICK übrig. Streng gerechnet (wie WordleBot) bekam BLUME
danach 0 % — ein anderes Wort als das einzig mögliche — und drückte die
Runde von Springer auf Bauer. Der Spieler kennt die Lösungsliste aber
nicht; er kann nicht wissen, dass nur noch ein Wort bleibt. Deshalb:
Versuche mit nur noch einem Kandidaten werden nicht gewertet (`—`).
Lehre: Eine Kennzahl erst an einer echten Runde ansehen, bevor sie Figuren
vergibt — die Formel allein sah richtig aus.

## Der Bedingungs-Operator löst die Stufen-Prüfung aus (27.09.2026)

`test-syntax.js` sucht festgeschriebene Freischalt-Stufen mit
`/STUFEN\s*[=:]/`. `x ? UPCREW_ANPASSEN.STUFEN : null` trifft das auch —
der Doppelpunkt des Bedingungs-Operators. Nicht die Prüfung lockern (sie
fängt echte Tabellen), sondern die Stelle als `if` schreiben
(`APP._stufen`).

## Leiste mit fester Höhe und iPhone-Streifen (27.09.2026)

Der Baustein `css\upcrew-leiste.css` setzt `height: 64px` und
`padding-bottom: env(safe-area-inset-bottom)`. Mit `box-sizing:
border-box` (hier überall) zählt das Polster zur Höhe — auf dem iPhone
bliebe für die Tabs 64 px minus Streifen. Typoluck rechnet die Höhe in
`.leiste.up-leiste` selbst (`--leiste-hoehe` + Streifen); der Baustein
bleibt unverändert, der Befund ging an die Design-Sitzung (`STATUS.md`).

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
