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
| `test-sammlung.js` | Sammlung, das Modell (seit 0.9.0): Modi wie im Auftrag, nichts gesperrt, was es heute gibt; Kachel-Sets frei über Tat oder Level. Seit 0.30.0: die Kachel-Sets als Regal (`kachelsetStuecke` = `KACHELSETS.SETS` = Katalog-Art `kachelset`), die reine Sammlung ohne sie (`restGruppen`), „NN %" = Zahl des Bausteins plus eigene Abschnitte (`anteil`) |
| `test-sammlung-blatt.js` | Die Sammlung „Variante A" (seit 0.30.0): der ECHTE Bildschirm `js\bildschirm-sammlung.js` mit den ECHTEN Bausteinen (Anpassen, Sammlung, Katalog, Platz, Blatt, Abzeichen, Aussehen) an einem kleinen DOM (`kleines-dom.js`) — Kacheln statt Regal-Reihen, Kachel-Sets als erstes Regal, Abzeichen und Modi als Kacheln mit Blatt, „NN %" = `tab.zaehlen()` plus eigene Abschnitte, ein freies Kachel-Set im Blatt wählen und übernehmen (ohne Rückfrage), ein gesperrtes nur ansehen, kein Level in der Oberfläche, die Vorschau im Set des Entwurfs; Einbindung (`index.html`, `sw.js`) und kein waagrechter Rollbereich im Stil. Seit 0.31.0 mit Besitz: Kaufbares trägt „im Shop", ein GEKAUFTES Kachel-Set (und eine gekaufte Schrift) ist frei und lässt sich übernehmen — je Person, nicht was ein anderer auf dem Gerät gekauft hat |
| `test-besitz.js` | Der Besitz aus dem Shop (seit 0.31.0): das ECHTE `js\besitz.js` und `js\app.js` (`kaufenStueck`, `kaufOffenAufloesen`) mit den echten Bausteinen (Besitz, Katalog, Münzen) und dem echten Fortschritt — Gerät je Person (`upcrew.besitz`, fremde Einträge bleiben, Abmelden zeigt den Gast-Eintrag), Konto nur geänderte Arten, die geschriebene Form gegen den ECHTEN Regeltext §13 (`regel-nachbau.js`; Rand 2000 Zeichen, Gegenproben), Abgleich als Vereinigung, Kauf zieht Münzen ab und legt Besitz an, zu wenig = kein Kauf, doppelt unmöglich, Reihenfolge Merker → Besitz → Fortschritt → Merker weg, Gast nur aufs Gerät, Merker je Person (nachbuchen genau einmal), Gast → Konto |
| `test-shop.js` | Der Shop mit Design-Reiter (seit 0.31.0): der ECHTE Bildschirm `js\bildschirm-shop.js` mit den ECHTEN Bausteinen am kleinen DOM — Reiter, Optionen, Kauf im Blatt (Rückfrage, Kurzmeldung, das Blatt zeichnet sich neu), heute schon Freies wird nicht verkauft, derselbe Griff und Reiter über den Tab-Wechsel, Anprobe (zeigen ohne speichern, „Anprobe beenden", Ende beim Verlassen), der Streifen ausserhalb des Bandes |
| `test-zum-shop.js` | Der Weg aus der Sammlung in den Shop (seit 0.34.5, `opt.zumShop`): die ECHTEN Bildschirme Sammlung und Shop mit der ECHTEN Navigation, dem echten Band (`upcrew-wischen`) und echten Blättern (mit Verlauf) am kleinen DOM — „Im Shop ansehen“ ruft das Spiel mit `{ art, wert }` (Katalog-Schlüssel), danach Shop-Tab (Weg der Leiste, das Band fährt), Reiter „Design“, Stück-Blatt — auch wenn die Shop-Seite noch nie gebaut war; frische Seite wird nicht neu gebaut; Kaufen → zurück in die Sammlung: frei, „Übernehmen“; ohne Kauf-Weg (frei, besessen, „bald“, Sets) kein Knopf; Shop nicht geladen oder unbekanntes Stück: nur der Tab-Wechsel, kein Fehler. `test-brett-hoehe.js` prüft seit 0.34.5 auch die Ergebnis-Karte bei geringer Höhe (`@media (max-height: 800px)`) |
| `test-start.js` | Der Start in der gemeinsamen Form des Studios und die Bibliothek-Vorschau „B" (seit 0.32.0): der ECHTE Bildschirm `js\bildschirm-start.js` + `js\start-bibliothek.js` mit dem echten Modell, den echten Bausteinen (BAUSTEINE, Platz, Blatt) und `js\bildschirm-wordle.js` am kleinen DOM — die Liste der Arten ↔ das Quadrat (eine dritte Art ist ein Eintrag, ohne Umbau), die gewählte Art überlebt den Neustart, Bibliothek ein Knopf / Üben zwei, die offene Runde als „Zurück zur Runde" (führt in GENAU diese Runde, das Quadrat bleibt), die Karte ist ein Knopf und jede Grafik darin ein Platz `bibliothek/…`, Lage der Stationen für alle Kapitel, Tipp auf die Karte öffnet das Blatt und Zurück schliesst es, der Verlauf (`verlaufDaten`: war · jetzt · kommt aus dem Fortschritt; War + Jetzt + Kommt = alle Spalten des Buchs), fester Knopf-Bereich im Stil. Ob der Start bei 360 × 640 passt, misst der Browser (STATUS.md) |
| `test-rueckfrage.js` | Die Rückfragen der Runde (seit 0.31.0): der ECHTE Bildschirm `js\bildschirm-wordle.js` mit dem echten Modell — wer bei offener Frage „Tipp einsetzen?" / „Extra-Leben einsetzen?" mit Zurück geht und dann „Einsetzen" tippt, bekommt nichts eingesetzt und nichts gezeichnet (kein `im-spiel` auf dem Start); die beendete Runde wird trotzdem genau einmal gewertet |
| `test-wertung.js` | Wertung einer Runde (seit 0.10.0): Erwartung und Gruppen, Können 0–100, bester Versuch 100, „Lösung stand fest" wird nicht gewertet (Probelauf TISCH/BLUME/BLICK), Figuren nach den Schwellen, eine echte Runde unter 3 s |
| `test-fortschritt.js` | Fortschritt (seit 0.10.0): Level-Kosten, XP je Quelle nur einmal am Tag, ×1,5 für beide Spiele, Serie mit Schutz, Belohnungen nach Level 10, additiver Datenvertrag, Speicher je Spieler unter `upcrew.fortschritt`; seit 0.28.1 der Kern-Baustein: Typoluck liefert jedes Glied aus `FORTSCHRITT_KERN_ERWARTET`, und `js\fortschritt.js` schreibt kein Glied des Kerns noch einmal |
| `test-wischen.js` | Das Seiten-Band (seit 0.29.0, neu geschrieben): die Einbindung in `js\navigation.js` mit dem ECHTEN Baustein `js\upcrew-wischen.js` an einem nachgebauten Band (Rollstand, `scroll`, `scrollend`) — Band = Leiste in ihrer Reihenfolge, stiller Tab ohne Seite, Zeichnen sofort/Leerlauf/`kommt`, `wechseln` ruft `zu`, jede Seite behält ihren Inhalt, Sperre (Runde, Anmeldung, Dialog, Buch, Intro) über den Wächter, ein Bildschirm ohne Leisten-Knopf verbirgt das Band, Blatt über der Seite, Rückfall ohne Band. Seit 0.30.0 die Wahl `frueh: true`: losgelassen über der Hälfte = EIN Wechsel sofort, beim Einrasten kein zweiter (bedienbar wird die neue Seite erst beim Einrasten), kein eigenes Rollen dabei, nicht beim Tipp, nicht gesperrt, zurückgezogen = zurück. Die reine Logik und das Verhalten des Bausteins selbst prüft UPCrew (`..\UPCrew\tests\test-wischen-band.js`, `test-wischen-geraet.js`) |
| `test-veraltet.js` | Seiten im Band nur neu zeichnen, wenn sie veraltet sind (seit 0.33.0): `js\navigation.js` mit dem ECHTEN Baustein am nachgebauten Band wie `test-wischen.js`. Teil 1 „der Bestand" lief schon VOR dem Umbau grün: nach `auffrischen`, einer Runde, einer Änderung im Blatt oder bei ungestörter Seite zeigt jede Seite beim nächsten Besuch (Tipp und Wisch) den neuen Stand. Teil 2: Wechsel ohne Änderung = kein Neu-Zeichnen (fünfmal hin und her: 0), nach einem Auslöser genau eines je besuchter Seite, veraltete Nachbarn im Leerlauf (nicht, während das Band rollt), `kommt` zeichnet Veraltetes, kein doppeltes Zeichnen beim Einrasten, Inhalt und Rollstand bleiben, `geoeffnet`, die Stand-Marke (`frischMarke`), Rückfall ohne Band |
| `test-veraltet-app.js` | Wer veraltet meldet (seit 0.33.0): das ECHTE `js\app.js` und `js\spielzeit.js` mit echtem Fortschritt und Gerätespeicher — die Stand-Marke (ändert sich mit Fortschritt, Besitz, Aussehen, Person, angefangener Runde, wartendem Ergebnis, Einstellung, Tag, auch durch ein anderes Spiel im selben Browser; NICHT durch die Spielzeit), Kauf und Runden-Ende melden veraltet, neue Spielerdaten/Aussehen/Konto-Stand/Verlauf zeichnen neu oder melden veraltet (Sammlung, Runde ungestört), kein doppeltes Zeichnen nach der Anmeldung, Rückkehr in die App ohne Änderung zeichnet nichts |
| `test-rangliste-laden.js` | Die Rangliste lädt höchstens alle 60 s (seit 0.33.0): der ECHTE Bildschirm `js\bildschirm-rangliste.js` am kleinen DOM mit gestellter Uhr — erstes Öffnen lädt, ein junger Stand wird wiederverwendet (`zeigen`, `geoeffnet`), danach Nachladen bei stehender Tabelle (kein Platzhalter), „Aktualisieren" immer, je Zeitraum ein Stand, eigenes Tageswort (`standVerwerfen`), neuer Tag, Fehler, die Zahl aus `js\konfig.js` |
| `test-takt.js` | Der Takt der Marke-Abfrage je Bildschirm (seit 0.33.0): die Zahlen nur in `js\konfig.js`; der ECHTE Abgleich mit gestellter Uhr (ruhig 4 statt 12 Anfragen je Minute, Rangliste 12, Wechsel, verborgen, gesperrt); das ECHTE `js\app.js` (`abfrageTakt`: Rangliste und das Profil eines anderen 5 s, sonst 15 s) |
| `test-brett-hoehe.js` | Sechs Brett-Zeilen passen in der Runde ohne Rollen (seit 0.33.0): liest die ECHTE Regel aus `css\stil-wordle.css` (Mass-Behälter, Zeilenbreite aus `cqh`) und rechnet für die im Browser gemessenen Bretthöhen und für jede Höhe von 120 bis 900 px nach, dass sechs Zeilen passen oder die Kachel an ihrer Untergrenze (36 px) steht |
| `test-duell.js` | Das Duell als Modell (seit 0.34.0, `js\duell.js`): Prüfvektor des Konzepts (AAAAAAAAAAAAAAAAAAA1, 567 → 394, 257, 525), Wertung `p`, Muster/Zeiten wie die Regel §14 sie prüft, `w` als Liste oder Objekt, alle Stände (2:0, 2:1, 3:1, 2:2, 3:2, 3:3, Aufgabe, ohne Wertung, Frist), nächstes Wort, Lage, Geist nur Farben, Schritte, Schalter |
| `test-duell-abgleich.js` | Die Speicher-Schicht des Duells (seit 0.34.0): `KONFIG.REGEL_14_EINGESPIELT` false festgehalten, Schalter aus = keine dritte Art (echter Start + Duell-Bildschirm am kleinen DOM) und keine Anfrage; der ganze Ablauf mit der Werkstatt-Attrappe (gespielter Gegner, Einladung, Ablehnen, Zurückziehen, Aufgeben, nur ein Duell, kein Tipp/Extra); die echte Leitung gegen den Regel-Nachbau mit dem ECHTEN Regeltext §14 aus `..\UPCrew\Firebase-Regeln` (`now` fest und `.sv` aufgelöst nur im Test; fehlt der Text, prüft die Stelle nichts) — erlaubte Läufe, danach leer, Missbrauch verboten; Warteliste |
| `test-werkstatt-ort.js` | Die Werkstatt nur auf einem lokalen Rechner (seit 0.34.1, Prüfung Fund 4): das ECHTE `js\werkstatt.js` mit nachgestellter Adresse — auf der echten Seite (und jeder anderen) wird `?werkstatt` samt `&duell` still übergangen, nichts gelöscht, das Duell bleibt aus; auf `localhost`/`127.0.0.1`/`[::1]` alles wie bisher; die Adresse wird an EINER Stelle gelesen |
| `test-konto-eintrag.js` | Das Speichern des GANZEN eigenen Konto-Eintrags (seit 0.34.2): die ECHTEN Dateien (Konto, Speicher, Spieler, Fortschritt, Abgleich, Anmeldung, Besitz-Baustein) gegen die nachgebaute Firebase mit dem ECHTEN Regeltext §13 — Freund annehmen/ablehnen, Abzeichen, Name und Nummer ändern lassen den Zweig des anderen Spiels, Besitz, Aussehen je Spiel, Haken, Lieblingswörter, Stufe und unbekannte Felder am Konto stehen (auch wenn ein anderes Gerät inzwischen geschrieben hat); der öffentliche Auszug zählt alle Zweige (Level bleibt, auch beim ersten Start); scheitert das Laden vorher, wird nichts geschrieben; ein fremder Zweig am Rand der Regel (100 Kennungen, 1000 Tage, 1000 Taten) bleibt wörtlich, ein wilder besteht nach `fuerKonto` die Regel; das Runden-Senden schreibt weiter nur den eigenen Zweig |
| `test-regel-12.js` | Regel §12 Phase A (seit 0.22.0): die echten Dateien gegen eine Firebase mit der ECHTEN Regel (`regel-nachbau.js`, Kopie aus Blunderluck) — Umstieg alt → §12 → nachziehen → zurück; Lesen, Anmelden, Auswahl, Freund suchen nur Name#Nummer, Nummer ändern, Anlegen, Gast, Marke, Fortschritt + Auszug, Auszug = voller Fortschritt. Regeltexte aus `Apps/Blunderluck/SICHERHEIT.md` und `Apps/UPCrew/docs/DATENBANK-KONZEPT-12.md` (nur gelesen; fehlen sie, prüft der Test nichts) |

**Blicke aus dem Projekt hinaus** (Stand 03.10.2026, 0.28.1; fehlt der
Nachbar-Ordner, prüft die Stelle nichts). Die Quelle der gemeinsamen
Bausteine ist `..\UPCrew\bausteine`; ob die Kopien gleich sind, prüft
`..\UPCrew\tools\Bausteine-Pruefen.ps1` für alle Apps. Typoluck schaut nie
mehr in ein Schwester-Spiel — was unten noch nach Blunderluck schaut, ist im
Test vermerkt und fällt weg, sobald die Sache in UPCrew liegt:

| Test | Liest | Verbleib |
|---|---|---|
| `test-oberflaeche-7.js` | `..\UPCrew\bausteine\js`, `css` und (seit 0.28.1) `kern` — Byte-Vergleich der Bausteine (seit 0.30.0 auch Katalog, Platz, Anpassen, Wischen, Shop-Stil), `konto.js` bis auf den Schlüssel | bleibt (UPCrew) |
| `test-regel-12.js`, `test-lieblingswoerter.js` | `..\UPCrew\docs\DATENBANK-KONZEPT-12.md` | bleibt (UPCrew) |
| `test-besitz.js` | `..\UPCrew\Firebase-Regeln\2026-09-29 NEUE Regel mit 13.txt` (der eingespielte Regeltext, Zweig `besitz`) | bleibt (UPCrew) |
| `test-konto-eintrag.js` | `..\UPCrew\Firebase-Regeln\2026-09-29 NEUE Regel mit 13.txt` (der eingespielte Regeltext, ganz) | bleibt (UPCrew) |
| `test-wunsch.js` | `..\Blunderluck\js\wunsch.js` (Zeichenliste) | vorerst |
| `test-regel-12.js` | `..\Blunderluck\SICHERHEIT.md` (eingespielte Regeltexte) | vorerst, bis die Regeltexte in UPCrew liegen |

Weggefallen mit 0.28.1 (die Sache ist jetzt ein Kern-Baustein): `test-konto.js`
↔ `..\Blunderluck\js\speicher.js` (Klasse `SpeicherKonten`, jetzt
`js\speicher-konten.js`); `test-muenzen.js` und `test-spielzeit.js` ↔
`..\Blunderluck\js\fortschritt.js` (alle verglichenen Glieder stehen jetzt in
`js\fortschritt-kern.js`). Diese drei Tests lesen nur noch im eigenen Projekt.

`pruefer.js` ist das kleine Prüfwerkzeug (`pruefe`, `gleich`, `spaeter`,
`fazit`). **Neue Prüfungen gehören VOR `fazit()`** — dahinter laufen sie nie.

`kleines-dom.js` (seit 0.30.0) ist ein kleines DOM für Tests, die echte
Bausteine mit Markup aus Text fahren (`innerHTML`, `outerHTML`,
`querySelector`, `closest`, `click()` mit Aufsteigen). Es misst und zeichnet
nichts — wie es aussieht und ob etwas rollt, zeigt nur der Browser.

`kern.js` (seit 0.28.1) stellt `FORTSCHRITT_KERN` und das zusammengesetzte
`FORTSCHRITT` als globale Namen bereit, wie der Browser sie sieht. **Jeder
Test, der `js\fortschritt.js` lädt, holt zuerst `require("./kern.js")`** —
sonst fehlt der Kern. Tests mit eigenem Kontext (`vm`) stellen stattdessen den
Text von `js\fortschritt-kern.js` vor den von `js\fortschritt.js`, und
`js\speicher-konten.js` hinter `js\speicher.js`.

**Was kein Test prüft: die Bildschirme.** Sie werden angesehen — die
Werkstatt (`?werkstatt`, Kopf von `js\werkstatt.js`) stellt jeden Zustand
her, Edge kopflos macht das Bild (`docs\DEPLOYMENT.md`, Abschnitt 5).
