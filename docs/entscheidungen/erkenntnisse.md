# Typoluck — Erkenntnisse

Teuer erkaufte Einsichten: Bug-Ursachen und Fallen, die nicht offensichtlich
sind. Jede neue gehört hierher UND in `00-INDEX.md`, bevor die Runde endet.

## Ein `const` oben im Skript steht nicht an `globalThis` (27.09.2026)

`const WOERTER_DE = {…}` in einem klassischen Skript ist im ganzen Fenster
sichtbar, aber KEINE Eigenschaft von `window`/`globalThis`. Wer
`globalThis["WOERTER_DE"]` fragt, bekommt `undefined` — die Wort-Bewertung
fand so im Browser ihre Daten nicht (in Node lief es, dort kam `require`).
Immer `typeof WOERTER_DE !== "undefined"` direkt schreiben.

## Der eingebaute Browser behält Skripte je Tab (27.09.2026)

Nach Änderungen an `js\upcrew-aussehen.js` lief im selben Tab immer noch die
alte Fassung — trotz abgemeldetem Worker, geleerten Caches und
`fetch(…, {cache:"reload"})` (Ressource „aus dem Cache", 0 Byte). Ein NEUER
Tab lud sofort die neue. Beim Ansehen nach Änderungen: neuen Tab öffnen.
Ausserdem: In einem Hintergrund-Tab laufen keine CSS-Übergänge — Messungen
der Leisten-Kapsel nur im vorderen Tab.

## Weisse Seite am iPhone: kein Stil, kein Skript (27.09.2026)

Handy-Bild des Nutzers (iPhone, 17:54, live 0.15.2): weisse Seite, nur
„Typoluck" gross in Times. Das ist `<h1 class="nur-vorlesen">` aus
`index.html` OHNE Stil — und weil `js\app.js` sonst sofort Inhalt baut,
lief auch kein Skript. Die Seite selbst kam an, JEDE Unterdatei nicht. In
Chromium lud dieselbe Fassung sauber (Messung des Hauptchats).

**Ursache: nicht sicher.** Belegt ist nur das Muster: Alle Unterdateien
fallen auf einmal aus — das passt nicht zu EINER kaputten Datei, sondern zu
der Stelle, durch die alle gehen: dem Service Worker. Kandidaten aus dem
Code bis 0.15.3 (`sw.js`):
1. **Wechsel der Fassung am iPhone.** Neuer Worker mit `skipWaiting` +
   `clients.claim`, `activate` löscht die alten `typoluck-`Speicher — alles
   während die Seite lädt. WebKit ist bekannt empfindlich, wenn der
   steuernde Worker mitten im Laden abgelöst wird. Der Zeitpunkt passt
   (0.15.1 → 0.15.2 am selben Abend). Wahrscheinlichster Kandidat.
2. **Kein Auffangen:** Fand der Worker nichts im Speicher und schlug
   `fetch` fehl, warf er — die Datei fehlte ganz; ein Ersatz aus einem
   älteren Speicher war nur für Navigationen vorgesehen.
3. **`caches.match` ohne Speichernamen** sucht in ALLEN Speichern des
   Ursprungs — beim Wechsel sind Dateien zweier Fassungen mischbar. Erklärt
   eher Fehler IN der App als eine leere Seite.
4. **Umgeleitete Antworten** (Safari öffnet keine Seite daraus): GitHub
   Pages leitet `./` und `index.html` nicht um — unwahrscheinlich.
Die Selbst-Aktualisierung aus 0.15.2 (`js\aktualisierung.js`) scheidet
praktisch aus: Sie läuft erst in einer Seite, die schon gestartet hat.

**Gebaut in 0.15.4:** (a) Worker: zuerst NUR der eigene Speicher, Netzfehler
mit Treffer aus irgendeinem `typoluck-`Speicher auffangen, umgeleitete
Startseite nachbauen. (b) **Notfall-Weg** direkt in `index.html`
(`<script id="notfall">`, als Erstes im Kopf): nach 10 s ohne
`window.TYPOLUCK_GESTARTET` oder ohne Stil (`--rund-klein`) den Worker
DIESES Ordners abmelden, `typoluck-`Speicher leeren, einmal neu laden;
Merker in sessionStorage (höchstens alle 5 min), sonst Link „Neu laden".
**Lehre:** Wer einen Worker hat, braucht einen Weg heraus, der ohne ihn
läuft — sonst hilft beim Nutzer nur „Websitedaten löschen". Blunderluck
hat denselben Worker-Aufbau und kann genauso hängen.

## Ein neuer Service Worker macht die offene Seite nicht neu (27.09.2026)

Nutzer: „ich bekomme die neuste Version nicht mehr aufgerufen" (live
nachgemessen an Blunderluck, dasselbe Muster hier). Der Server lieferte
längst die neue Fassung. Die Seite startete aber aus dem Zwischenspeicher
des ALTEN Workers. Der neue installierte sich im Hintergrund und übernahm
mit skipWaiting/claim — doch eine schon geladene Seite behält ihre alten
Skripte. Erst der übernächste Start zeigt die neue Fassung, und eine App vom
Home-Bildschirm wird kaum neu gestartet, nur hervorgeholt: Dort kam die
neue Fassung praktisch nie an. `register()` allein fragt ausserdem nur beim
Laden nach, nicht bei der Rückkehr.
Seit 0.15.2 (`js\aktualisierung.js`, gleich in Blunderluck v0.151.2):
`registration.update()` beim Start und bei Rückkehr (höchstens alle 5 min),
bei `controllerchange` — nur wenn es vorher einen Controller gab — EINMAL
neu laden an einer sicheren Stelle, sonst Leiste „Neue Version"; Merker in
sessionStorage gegen Schleifen. **Lehre:** Wer skipWaiting/claim nutzt,
braucht auch den Schritt „Seite neu laden", sonst wirkt die Auslieferung
erst Tage später. Die Fassung, die den Fehler noch hat, braucht einmal
einen Neustart von Hand — erst ab 0.15.2 geht es von selbst.

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

## Ein Test auf den Rückfall-Schalter kann zufällig grün sein (30.09.2026)

`LIEBLINGSWOERTER.regelDa()` fragt `typeof SpeicherKonten` global. In Node
kommt die Klasse nur per `require` in eine lokale Variable, global fehlt
sie — `regelDa()` ist dort immer false. Solange `REGEL_GRAU_EINGESPIELT`
false war, stimmte der Test „ohne Test-Schalter gilt der Schalter" nur
zufällig; beim Umschalten auf true fiel er. Jetzt setzt der Test
`globalThis.SpeicherKonten` für genau diese Prüfung und prüft den Fall
„ohne Klasse" getrennt. Merke: Ein Test, der `false` gegen einen
Standardwert `false` prüft, misst nichts — einmal mit dem anderen Wert
gegenprüfen.
