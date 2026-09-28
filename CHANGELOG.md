# Typoluck — Neuigkeiten

Was sich je Version geändert hat, neueste oben. Versionsregel: Haus-Regel
`0.MINOR.PATCH` (Dev-`CLAUDE.md`, Abschnitt „Versionierung").

## 0.18.5 — 28.09.2026

- Als Gast den Spielstand sichern klappt jetzt auch, wenn du schon eine
  Weile gespielt hast (vorher: „Die Anmeldung ist abgelaufen").
- Beim Anlegen eines Kontos steht an jedem Feld, was genau nicht stimmt:
  Name fehlt oder zu kurz, was dem Passwort fehlt, Wiederholung ungleich,
  Name mit genau diesem Passwort schon vergeben, keine Verbindung. Der
  Knopf ist immer drückbar und zeigt beim Drücken alle Meldungen.

## 0.18.4 — 28.09.2026

- Dein Aussehen in Typoluck (hell/dunkel, Farbwelt, Schrift, Knöpfe)
  reist jetzt mit deinem UPCrew-Konto auf andere Geräte — getrennt vom
  Aussehen in Blunderluck.

## 0.18.3 — 28.09.2026

- Alle Bosse der Bibliothek haben wieder sechs Versuche. Weniger Versuche
  kommen später gezielt bei einzelnen Gegnern.
- Das UPCrew-Intro zeigt die Farbwelt, die du in Typoluck gewählt hast,
  auch in der Ansicht für Bildschirmfotos (Werkstatt).

## 0.18.2 — 28.09.2026

- Das UPCrew-Intro kommt jetzt auch beim Neuladen der Seite zuverlässig —
  auch in der Ansicht für Bildschirmfotos (Werkstatt). Nur wenn die App
  sich selbst auf eine neue Version neu lädt, kommt es nicht noch einmal.
- Korrekturen an der Wort-Bewertung stehen nicht mehr lesbar in der App.

## 0.18.1 — 28.09.2026

- Die Bosse ab Buch 4 haben nur noch fünf Versuche (vorher sechs) — die
  Vorstellung vor dem Boss zeigt es rot an. Ein Extra-Leben gibt einen
  sechsten.
- Wie schwer ein Wort ist, steht nicht mehr lesbar in den App-Dateien.
- Admins: Das Lexikon mit der vollen Bewertung ist aus der App genommen
  und zeigt „Nur im Werkzeug"; die Spielerliste bleibt.

## 0.18.0 — 28.09.2026

**Die Bibliothek — Typolucks Weg nach oben, Buch für Buch.**

- Neu auf dem Start: die Bibliothek. Sechs Bücher mit je acht Leveln;
  das letzte Level jedes Buchs ist ein Boss. Buch 1 fragt nur Nomen ab,
  jedes weitere Buch wird schwerer.
- Jedes Level hat einen festen Schwierigkeitsbereich — das Wort darin
  ist bei jedem Start ein anderes (und bei jedem Spieler). Ein gerade
  gespieltes Wort kommt nicht gleich wieder.
- Je Level gibt es bis zu drei Figuren (Bauer, Springer, König) wie im
  Blunderluck-Turm; der Boss öffnet das nächste Buch. Figuren bringen XP
  und Münzen, der erste Sieg über einen Boss +25 Münzen.
- Am Quadrat neben „Spielen" wählst du Bibliothek oder Frei; Frei zeigt
  den Start wie bisher (Tageswort, Übung).
- Im Profil steht bei Typoluck jetzt dein Buch statt „Turm bald".

## 0.17.1 — 27.09.2026

- Die Verwaltung (nur für Admins) steht nicht mehr im Menü hinter den
  drei Balken, sondern nur noch als Knopf „Verwaltung" in den
  Einstellungen (Karte „UPCrew-Konto") — wie in Blunderluck.
- Shop: die Typoluck-Texte der Waren kommen jetzt über den gemeinsamen
  Shop-Baustein (sichtbar ändert sich nichts).

## 0.17.0 — 27.09.2026

**Münzen, Shop und eine einfachere Serie — über beide Spiele.**

- Neu: Münzen. Du bekommst sie in Typoluck und Blunderluck, der
  Kontostand gilt in beiden: Tageswort geschafft +10, gelöste Übung +3,
  Level-Aufstieg +10, jeder 7. Serientag +20.
- Der Tab rechts unten ist jetzt der Shop (statt „Bald"):
  - Flammen-Schild — rettet die Flamme über einen verpassten Tag;
  - Extra-Leben — ein 7. Versuch, wenn der 6. danebengeht;
  - Tipp — deckt einen richtigen Buchstaben an seiner Stelle auf.
  Mit Tipp oder Extra-Leben gibt das Tageswort höchstens einen Bauern,
  und in der Rangliste zählt ein 7. Versuch wie „X/6".
- Die Serie zählt jetzt, sobald du an einem Tag in IRGENDEINEM Spiel eine
  Runde spielst (in Typoluck: einen Versuch abgibst, Tageswort oder
  Übung) — und sie geht über 60 Tage hinaus.

## 0.16.3 — 27.09.2026

**Verwaltung für Admins.**

- Admins finden im Menü „Verwaltung": das Lexikon mit allen Wörtern
  (Lösungen mit ihrer Schwierigkeit, Zusatzwörter getrennt; suchen,
  filtern, sortieren) und die Spielerliste mit Level, Serie, Partien je
  Spiel, zuletzt aktiv und Abzeichen — antippen zeigt die Zahlen beider
  Spiele. Nur ansehen, nichts ändern.
- Für alle anderen ändert sich nichts; sie sehen den Eintrag nicht.

## 0.16.2 — 27.09.2026

- Im Kurzprofil oben steht nur noch „NN % gelöst" — die Serie zeigt die
  Flamme daneben (über beide Spiele). So passt alles auch auf kleine
  Handys.

## 0.16.1 — 27.09.2026

**Die Serien-Flamme oben neben deinem Profil.**

- Auf dem Start steht neben dem Kurzprofil ein Kreis mit einer Flamme, in
  der Flamme die Zahl deiner Serie (bis 999, darüber 1k+) — über beide
  Spiele und mit deinem Konto zusammengezählt, gleich wie in Blunderluck.
- Leuchtet, wenn du heute schon geschafft hast; gedämpft, wenn heute noch
  offen ist; ein kleines Schild zeigt einen Serien-Schutz.
- Antippen führt zu den Aufgaben.

## 0.16.0 — 27.09.2026

**Die Wörter haben jetzt eine echte Schwierigkeit.**

- Jedes Lösungswort ist bewertet: Wie lange ein guter Rater braucht, wie
  viele Vokale es hat (zwei verschiedene aus a, e, i, o, u = eher leicht),
  ob es „Fallen" gibt (Wörter, die sich nur in einem Buchstaben
  unterscheiden), doppelte Buchstaben, Umlaute, seltene Buchstaben.
- Daraus kommt die Stufe des Tagesworts (leicht, mittel, schwer — +15,
  +20, +30 XP wie bisher). Welches Wort an welchem Tag drankommt, bleibt
  gleich.
- Grundlage für den kommenden Turm: eine feinere Skala 1–10 je Wort.

## 0.15.13 — 27.09.2026

**Jedes Spiel sein eigenes Aussehen.**

- Was du in der Sammlung übernimmst (Farbwelt, Schrift, Knöpfe, hell oder
  dunkel), gilt nur noch für Typoluck — Blunderluck bleibt, wie es ist,
  und umgekehrt.
- Deine bisherige Wahl bleibt beim ersten Start erhalten.
- Der Umschalter Typoluck/Blunderluck über der Vorschau ist weg.
- Das Intro zeigt die Farbwelt von Typoluck.

## 0.15.12 — 27.09.2026

**Die Leiste unten gleitet.**

- Beim Tab-Wechsel fährt die orange Kapsel gefedert zum neuen Tab, das
  Zeichen hüpft kurz — beim Antippen wie beim Wischen, gleich wie in
  Blunderluck.
- Wer auf dem Gerät „Bewegung reduzieren" eingestellt hat, sieht den
  Wechsel ohne Bewegung.

## 0.15.11 — 27.09.2026

**Links und rechts ist Stopp.**

- Auf Aufgaben (ganz links) und Rangliste (ganz rechts) bewegt sich beim
  Wischen nach außen nichts mehr — kein Nachgeben, kein Rundlauf.
- Die Seite selbst lässt sich nicht mehr waagrecht verschieben oder
  überrollen. Die waagrechten Reihen in der Sammlung rollen weiter.

## 0.15.10 — 27.09.2026

**Tabs wechseln durch Wischen.**

- In Aufgaben, Sammlung, Start und Rangliste wechselt ein Wisch nach links
  zum nächsten Tab rechts in der Leiste, nach rechts zum vorherigen. An den
  Enden federt der Inhalt nur zurück.
- Während einer Runde, auf dem Spielfeld und der Tastatur, auf Umschaltern
  und in den waagrechten Reihen der Sammlung wird nicht gewischt; senkrecht
  rollen geht wie immer. Gleich wie in Blunderluck.

## 0.15.9 — 27.09.2026

**Die Sammlung sieht aus wie in Blunderluck — und hat jetzt die Abzeichen.**

- Kopf „Sammlung NN %", die Vorschau darunter mit klarer Kante, die Regale
  und der Balken „Zurück · Übernommen" direkt auf der Leiste: in beiden
  Apps dasselbe Gerüst. Eigen bleiben nur die Typoluck-Dinge (Modi,
  Kachel-Sets).
- Die Vorschau ist ganz zu sehen, auch die Tastatur.
- Auf niedrigen Handys (bis 600 px Höhe) rollt die Vorschau mit, damit die
  Regale Platz haben.
- Neu in der Sammlung: die fünf Abzeichen (Partien, Serie, Beide, Figuren,
  Heute) — dieselben wie im Profil, über beide Spiele gerechnet.

## 0.15.8 — 27.09.2026

**Oben nichts mehr unter der Uhrzeit; „Wunsch oder Fehler" nimmt nur Text.**

- Als App vom Home-Bildschirm lief beim Rollen das Spielfeld unter die
  Uhrzeit des iPhones. Jetzt liegt dort eine feste Fläche in der Grundfarbe,
  und alles beginnt darunter — auf jedem Bildschirm, auch in Dialogen, in
  der Anmeldung und bei den kurzen Meldungen.
- „Wunsch oder Fehler melden": nur noch Buchstaben, Ziffern, Leerzeichen,
  Zeilenumbrüche und . , ! ? - ( ) : ; — alles andere (Klammern wie < > [ ] { },
  Zeichen wie $ % & * = / \ |, Emojis, unsichtbare Zeichen) verschwindet
  schon beim Tippen. Höchstens 500 Zeichen, doppelte Leerzeichen werden zu
  einem. Das Feld hat jetzt mehrere Zeilen.
- Die Sammlung bekommt ihr neues Gerüst gleich in beiden Apps (gemeinsamer
  Baustein, folgt); in dieser Fassung rückt sie nur unter den Streifen oben.

## 0.15.7 — 27.09.2026

**Gleicher Name, gleiches Passwort? Dann fragt die App: „Welches Konto?"**

- Zwei Konten dürfen denselben Namen und dasselbe Passwort haben — sie
  unterscheiden sich nur in der Nummer.
- Passt dein Passwort zu mehreren Konten, zeigt die App eine kurze Liste:
  je Konto der Name, darunter klein die Nummer, dein Level und wann du
  zuletzt gespielt hast. Antippen meldet dich an; „Abbrechen" meldet
  niemanden an.
- Haben die Konten verschiedene Passwörter, bist du wie bisher sofort drin.

## 0.15.6 — 27.09.2026

**Anmelden nur mit Namen — um die Nummer musst du dich nicht kümmern.**

- Anmelden: „Name" und Passwort. Gibt es deinen Namen mehrmals, findet die
  App dein Konto selbst über dein Passwort.
- Neues Konto und Gast sichern: nur Name und Passwort. Die Nummer würfelt
  die App und zeigt sie nirgends an.
- Deine Nummer siehst und änderst du nur in den Einstellungen (Konto):
  „Nummer ändern" — eine eintippen oder leer lassen zum Würfeln.
- Freunde, Rangliste und Suche zeigen nur Namen; die Nummer steht klein
  daneben, wenn es denselben Namen mehrmals gibt.
- Kein Beispiel-Name mehr im Anmelden.
## 0.15.5 — 27.09.2026

**Geteilte Links zeigen eine Vorschau.**

- Schickst du jemandem den Link zu Typoluck, zeigen iMessage, WhatsApp und
  Co. jetzt ein Bild mit dem App-Zeichen, „Typoluck — Wortspiele mit
  Freunden" und fünf Kacheln — statt eines leeren grauen Symbols.
## 0.15.4 — 27.09.2026

**Behoben: weisse Seite am iPhone; die Anmeldung trägt deine Farben.**

- Startet die App einmal nicht richtig (nur ein weisses Blatt mit
  „Typoluck"), räumt sie nach 10 Sekunden ihren Zwischenspeicher selbst auf
  und lädt einmal neu. Klappt auch das nicht, steht dort „Neu laden".
- Die App nimmt beim Start nur noch Dateien ihrer eigenen Fassung aus dem
  Zwischenspeicher — keine Mischung aus alter und neuer Version mehr.
- Die Anmeldung (Anmelden, neues Konto, als Gast) ist nicht mehr fest
  violett, sondern in der Farbwelt, die du gewählt hast — ab Werk Orange.
## 0.15.3 — 27.09.2026

**Gäste stehen in keiner Rangliste mehr; beim Spielen ist die Leiste unten weg.**

- Wer als Gast spielt, erscheint nicht mehr in der Rangliste, nicht bei
  „Freunde heute" und nicht in der Suche nach Mitspielern.
- Als Gast siehst du deine eigene Zeile in der Rangliste weiterhin.
- Während einer Runde verschwindet die Leiste unten — Feld und Tastatur
  haben mehr Platz. Hinaus geht es mit dem Pfeil oben links; beim Ergebnis
  ist die Leiste wieder da.
- Die Leiste unten sieht neu aus: Der Tab, auf dem du bist, ist eine breite
  Kapsel mit Zeichen und Name nebeneinander — gleich wie in Blunderluck.
  Auch auf schmalen Handys passt „Sammlung" ganz hinein.

## 0.15.2 — 27.09.2026

**Behoben: Die neue Version kam nicht an.**

- Bisher startete die App aus dem Zwischenspeicher mit der alten Fassung;
  die neue lud sich nur im Hintergrund und zeigte sich erst beim
  übernächsten Start — als App vom Home-Bildschirm praktisch nie.
- Jetzt fragt die App beim Start und bei jeder Rückkehr nach einer neuen
  Version (höchstens alle 5 Minuten). Ist eine da, lädt sie einmal neu —
  aber nie, während du Buchstaben tippst oder ein Fenster offen ist. Dann
  erscheint oben „Neue Version" zum Antippen, und sie lädt beim nächsten
  ruhigen Moment von selbst.
- **Einmal noch von Hand:** Wer gerade eine ältere Fassung offen hat,
  bekommt diese Verbesserung erst mit dem nächsten Neustart der App.

## 0.15.1 — 27.09.2026

**Dein Fortschritt reist mit deinem Konto.**

- Mit UPCrew-Konto liegen Level, XP, Serie und Heute jetzt auch am Konto —
  auf einem anderen Gerät oder in der App vom Home-Bildschirm siehst du
  denselben Stand. Beim Start und beim Zurückkehren in die App wird
  abgeglichen; je Spiel gilt der neuere Stand.
- Typoluck schreibt dabei nur seinen eigenen Teil; was Blunderluck am Konto
  hat, bleibt unberührt und zählt beim Level mit.
- Als Gast bleibt alles wie bisher nur auf diesem Gerät.

## 0.15.0 — 27.09.2026

**Alle zehn Kachel-Sets sind drin.** Live seit 27.09.2026 — zusammen mit
allem aus 0.11.0 bis 0.14.0, die nie einzeln draussen waren.

- Papier hast du. Leder, Blei, Holz und Neon kommen weiter über ihre Taten.
- **Neu:** Kreide, Sand, Mitternacht, Kupfer und Glas kommen mit dem
  Level — ab Level 3, 6, 9, 12 und 16. Im Profil unter „Nächste Level"
  steht, welches Set als Nächstes kommt; in der Sammlung steht unter dem
  „?" „ab 6", und Antippen zeigt „Ab Level 6".
- Steigst du auf und bekommst ein Set, meldet die App „Neu: …".
## 0.14.0 — 27.09.2026

**Kachel-Sets zum Anziehen, XP nach Schwierigkeit, eine Rahmen-Regel.**

- **Neu: Kachel-Sets anziehen.** In der Sammlung ein Set antippen →
  „Anziehen": Spielkacheln und Tastatur bekommen ein anderes Material,
  hell und dunkel. Zehn Sets zum Ausprobieren: Papier (wie bisher), Leder,
  Blei, Holz, Neon, Kreide, Sand, Mitternacht, Kupfer, Glas. „Richtig"
  bleibt Orange, „vorhanden" bleibt Blau. Welche davon wirklich
  reinkommen, entscheidest du — die fünf neuen gibt es bis dahin nur in
  der Werkstatt.
- **Neu: Das Tageswort hat eine Schwierigkeit** — 1 bis 3 Punkte auf der
  Karte „Heute". Es bringt leicht 15, mittel 20, schwer 30 XP (dazu wie
  bisher +10 je Figur, ×1,5 und Serie). Blunderluck rechnet genauso.
- **Geändert: Rahmen** gibt es ab Level 10, dann alle 5 Level (Silber,
  Gold, Platin, danach Glanz) — gleich wie in Blunderluck. Kupfer ab 5 und
  Silber ab 8 fallen weg; Titel Neuling, Stammgast, Kenner, Legende.
- Der gesicherte alte Stand vom Umzug bleibt nur auf dem Gerät und geht nie
  ans Konto.

## 0.13.0 — 27.09.2026

**Taten: neue Sammelstücke, die man sich verdient.**

- **Neu in der Sammlung: Kachel-Sets.** Papier hast du, Leder, Blei, Holz
  und Neon stehen als „?" da. Tippst du eins an, steht dort die Tat, die es
  bringt: Tageswort im 2. Versuch, 7 Tage Serie, gelöst im Schwer-Modus,
  90 % Können in einer Runde.
- Schaffst du eine Tat, meldet die App „Neu: …" und das Stück ist in
  deiner Sammlung. Eine Serie von 7 Tagen zählt auch, wenn du sie schon
  vorher geschafft hast.
- Nichts, was du schon hattest, wird gesperrt. Anziehen lassen sich die
  Kachel-Sets noch nicht — das kommt später.

## 0.12.0 — 27.09.2026

**Dein Profil wie im Entwurf.**

- **Oben:** dein Level-Ring mit Rahmen (Kupfer ab Level 5, Silber ab 8,
  danach alle 5 Level ein neuer), dein Titel und der XP-Balken.
- **Darunter:** woher XP kommen, was die nächsten drei Level bringen, und
  „Spiele": für Blunderluck dein Ort im Turm und deine Figuren, für
  Typoluck deine Figuren.
- **Statistik mit sechs Kacheln:** Partien, gelöst, Ø Können, bestes
  Können, längste Serie, Tageswort Ø.
- **Abzeichen** mit Punkten je Stufe; antippen zeigt den Wert und alle
  Stufen. Sie zählen über beide Spiele und gehen nach oben offen weiter.
- Der Ring oben links auf dem Start trägt jetzt auch deinen Rahmen.

## 0.11.0 — 27.09.2026

**Ein Fortschritt für Typoluck und Blunderluck.**

- Level, XP und Serie liegen jetzt in derselben Form wie bei Blunderluck:
  Jedes Spiel führt seinen eigenen Teil, das Level zählt beide zusammen.
  So überschreibt kein Spiel mehr die XP des anderen.
- Dein bisheriger Stand zieht beim ersten Start einmal um — XP, Serie,
  Serien-Schutz und das heutige Tageswort bleiben erhalten.
- Die Karte „Tagesbrett" und das ×1,5 im Tab Aufgaben sehen jetzt, was du
  heute in Blunderluck geschafft hast. Die Serie zählt Tage aus beiden
  Spielen.
- **Geändert:** ×1,5 gibt es auf die Tagesaufgabe, wenn das andere Spiel
  seine heute schon geschafft hat — wie in Blunderluck. Bisher galt es für
  alles an diesem Tag.
- Der Knopf „Zu Blunderluck" führt zur Seite nebenan.

## 0.10.0 — 27.09.2026

**Level, Tagesaufgaben und eine Wertung für jede Runde.**

- **Neu: Level.** Jede Runde bringt XP — mehr für das Tageswort, für gute
  Figuren und für jeden Tag in Folge. Der Ring um dein Profilbild oben
  links füllt sich, die Zahl daneben ist dein Level. Mit jedem Level wird
  in der Sammlung mehr frei (Farbwelten, Schriften, Knöpfe).
- **Neu: „Heute" im Tab Aufgaben.** Das Tageswort und das Tagesbrett aus
  Blunderluck. Schaffst du beide am selben Tag, zählt der Tag ×1,5. Darunter
  deine Serie als sieben Flammen und dein Serien-Schutz, der einen
  verpassten Tag rettet.
- **Neu: Wertung nach jeder Runde.** Wie gut war jeder Versuch — wie viele
  Wörter er ausgeschlossen hat, verglichen mit dem besten möglichen. Glück
  steht getrennt daneben und zählt nicht. Beim Tageswort gibt es dafür
  Figuren: Bauer (gelöst), Springer (gut), König (sehr gut).
- **Neu im Profil:** Level mit XP-Balken, woher XP kommen, was die nächsten
  drei Level bringen, und fünf Abzeichen.
- Level und Serie liegen vorerst nur auf diesem Gerät. Im selben Browser
  teilt Blunderluck sie mit dir.

## 0.9.0 — 27.09.2026

**Neue Leiste unten und der Tab „Sammlung" — gleich wie in Blunderluck.**

- **Die Leiste unten zeigt nur noch Zeichen.** Der Tab, auf dem du gerade
  bist, hebt sich als farbige Kachel heraus und zeigt als einziger seinen
  Namen. Reihenfolge: Aufgaben · Sammlung · Start · Rangliste · Bald.
- **Neu: der Tab „Sammlung"** an Platz 2. Er ersetzt „Anpassen": oben die
  Vorschau, darunter Farbwelt, Schrift, Knöpfe und hell/dunkel zum
  Ausprobieren — jetzt direkt im Tab, ohne extra Knopf. Darunter deine
  Modi (Tageswort, Übung, Schwer-Modus; Blitzwort und Wort-Duell kommen
  noch). Oben rechts steht, wie viel du schon gesammelt hast.
- Die Zeile „Anpassen" in den Einstellungen führt jetzt in die Sammlung.

## 0.8.1 — 26.09.2026

**Neues App-Zeichen, keine Vibration mehr, und „Freunde heute" bleibt von
selbst aktuell.**

- **Neues App-Zeichen:** gestapelte Würfel „TYPO" im Lichtstreifen —
  passend zu den neuen Zeichen von Blunderluck und Trainer. Vorerst in
  einfacher Qualität, die fertige Fassung folgt.
- **Keine Vibration mehr** — weder beim Tippen noch bei Gewinn oder Fehler;
  der Schalter „Vibration" in den Einstellungen ist weg. Sie kommt später
  wieder, in allen UPCrew-Spielen gleich.

- Solange du auf den Start schaust, erscheinen neue Ergebnisse deiner
  Freunde nach spätestens einer halben Minute — ohne dass du etwas tippen
  musst. Kommst du in die App zurück, ist die Tabelle sofort frisch.
- Die Tabelle flackert nicht mehr (kein kurzes Grau), wenn der Start neu
  aufgebaut wird; ist das Netz kurz weg, bleibt die letzte Tabelle stehen.

## 0.8.0 — 26.09.2026

**Neuer Tab „Anpassen", eigene Schrift, neue Knöpfe — und ein Aussehen für
Typoluck und Blunderluck.**

- **Neu: „Anpassen" ganz rechts in der Leiste unten.** Oben eine Vorschau,
  darunter Farbwelt, Schrift, Knöpfe und hell/dunkel zum Ausprobieren,
  dazu ein Würfel für eine zufällige Mischung und drei Plätze, um
  Lieblings-Kombinationen zu merken. Was noch nicht freigeschaltet ist,
  kannst du in der Vorschau ansehen, aber noch nicht übernehmen —
  freigeschaltet wird später über die Herausforderungen.
- **Ein Aussehen für beide Spiele:** Stellst du in Typoluck um (hell,
  dunkel, Farbwelt, Schrift, Knöpfe), stellt sich Blunderluck mit um — und
  umgekehrt. Mit UPCrew-Konto reist die Wahl auch auf deine anderen Geräte.
  Deine bisherige Wahl hell/dunkel bleibt erhalten.
- **Eigene Schrift:** Die App schreibt jetzt in der runden UPCrew-Schrift,
  auch ohne Netz.
- **Neue Knöpfe:** Knöpfe haben jetzt die UPCrew-Form mit Kante, die beim
  Antippen einsinkt; „Abmelden" und „Löschen" sind rote Knöpfe.
- **Einstellungen:** neu „Standard-Schrift" (liest sich die gewählte Schrift
  schlecht, bleibt es bei der Standard-Schrift) und eine Zeile „Anpassen",
  die in den neuen Tab führt.
- Die Leiste unten hat jetzt fünf Plätze: Aufgaben · Bald · Start ·
  Rangliste · Anpassen.

## 0.7.0 — 26.09.2026

**Werkstatt-Farben, Kopfzeile wie in Blunderluck, und der Tab „Aufgaben".**

- **Neue Farben:** Die ganze App trägt jetzt die UPCrew-Farbwelt
  „Werkstatt" — Orange als Hauptfarbe statt Blau, warme Grautöne. Hell und
  dunkel; wechselt das Handy zwischen hell und dunkel, zieht die App mit.
  Die Kacheln bleiben Orange/Blau.
- **Oben links dein Kurzprofil:** Kreis, Name und „Serie · % gelöst". Ein
  Tipp öffnet dein Profil. Rechts die drei Balken wie bisher. Der
  Schriftzug „Typoluck" oben ist weg — wie in Blunderluck.
- **Neu: „Aufgaben" in der Leiste unten** (statt „Bald"). Dort kommen bald
  die Herausforderungen durch beide Spiele hin; heute steht dort, dass es
  bald kommt.
- Das Studio-Intro hat eine Reparatur an Art B bekommen.

## 0.6.2 — 25.09.2026

**Das Wortspiel heisst jetzt Wordguesser, die Kacheln sind Orange und Blau.**

- Neuer Name für das Wortspiel: **Wordguesser** (auf dem Start, in den
  Einstellungen, im Profil).
- Die Kacheln sind jetzt **Orange** (richtig) und **Blau** (woanders im
  Wort) statt Grün und Gelb. „Fehlt" ist ein etwas dunkleres Grau. Das
  App-Zeichen hat dieselben Farben.
- Der Schalter „Kacheln Grün/Gelb – Orange/Blau" in den Einstellungen ist
  weg: Orange und Blau sind jetzt der Standard und auch bei Rot-Grün-Schwäche
  gut zu unterscheiden. Später richten sich die Kacheln nach den
  Farbpaketen, die man freischalten kann.
- Warum: Name und Farben lehnten sich an ein bekanntes Spiel der New York
  Times an, die gegen solche Nachbauten vorgeht.

## 0.6.1 — 25.09.2026

**Das neue UPCrew-Studio-Intro.**

- Beim Start kommt jetzt das neue Studio-Intro — bei **jedem** Start, nicht
  mehr nur einmal je Besuch. Jedes Mal eine andere von sechs Arten
  (Anzeige, Taste, Pads, Typenschild, Plus wird zum P — zwei Fassungen).
- Es passt sich der Darstellung an: **hell oder dunkel**, wie die App.
- Die Studio-Farbe ist jetzt Werkstatt-Orange statt Violett.
- Antippen oder eine Taste überspringt es wie bisher.

## 0.6.0 — 25.09.2026

**Hell oder dunkel selbst wählen, Kachelfarben für Farbenblinde, und ein
Schwer-Modus.**

- **Schwer-Modus** (Einstellungen → Wordle): Was du gefunden hast, musst
  du weiter benutzen — grüne Buchstaben an ihrer Stelle, gelbe irgendwo im
  Wort. Sonst kommt z. B. „Feld 3: A" oder „E benutzen". Gilt ab der
  nächsten Runde; eine angefangene bleibt, wie sie war. Unter dem Titel
  steht dann klein „schwer".

- **Darstellung:** In den Einstellungen unter „Dieses Gerät" wählst du
  Auto (wie das Handy), Hell oder Dunkel.
- **Kacheln Orange/Blau:** Wer Grün und Gelb schlecht unterscheidet,
  stellt die Kacheln auf Orange (richtig) und Blau (woanders im Wort) um.
  Gilt für Brett, Tastatur und Ranglisten-Muster. Ab Werk bleibt es bei
  Grün/Gelb.

## 0.5.0 — 25.09.2026

**Die Leiste unten ist zurück — und bleibt immer stehen. Neu: Einstellungen.**

- **Leiste unten auf jedem Bildschirm**, auch mitten im Spiel: links ein
  freier Platz (kommt noch), in der Mitte Start, rechts die Rangliste. Der
  Bereich, in dem du gerade bist, ist blau markiert.
- **Einstellungen** im Menü hinter den drei Balken (neben Profil und
  Freunde): Vibration, dein UPCrew-Konto (Name, Passwort, Abmelden,
  Löschen) und „Über Typoluck" samt „Wunsch oder Fehler melden". Das stand
  bisher unten im Profil; das Profil zeigt jetzt nur noch dich und deine
  Statistik.
- Die Rangliste ist aus dem Menü in die Leiste gewandert.

## 0.4.0 — 25.09.2026

**Typoluck fühlt sich an wie eine UPCrew-App: weniger Text, mehr Bild,
Vibration.** (Erster Schritt des UPCrew-Standards.)

- **Vibration:** Jeder Knopf, jede Taste und jedes Feld vibriert kurz beim
  Antippen; ein gelöstes Wort und ein Fehler haben je ein eigenes Muster.
  Abschaltbar im Profil unter „Dieses Gerät". Auf dem iPhone geht das in
  Web-Apps bisher nicht — dort steht „nicht möglich".
- **Weniger Text:** keine Begrüßungen und keine Lob-Sprüche mehr. Am Ende
  einer Runde steht groß „3/6", dazu die Lösung und „+4 Punkte"; die
  Rangliste zeigt „3/6" statt „gelöst in 3".
- **Die Spielregel als Bild:** Ein Tipp auf das i zeigt drei Kacheln
  (richtig, woanders, fehlt) und eine Punkte-Tafel statt eines Absatzes.
- **Laden, Leer, Fehler:** Beim Laden erscheinen graue Platzhalter statt
  „Wird geladen …". Ist etwas leer, gibt es einen Knopf, der weiterhilft
  („Spielen", „Freunde finden", „Suchen"). Klappt etwas nicht, gibt es den
  Knopf „Nochmal". Dauert das Laden länger als 10 Sekunden, wird es zum
  Fehler.
- **Neue Formen:** Karten, Menü und Dialoge stehen auf einer harten Kante
  wie die Knöpfe; überall dieselben drei Rundungen.

## 0.3.0 — 25.09.2026

**Blau wie Blunderluck, ein Menü hinter drei Balken, und in Wordle kannst
du Buchstaben vor-eintragen.**

- **Neue Farben:** Hinter der Anmeldung trägt Typoluck jetzt dieselbe
  Farbwelt wie Blunderluck — Blau statt Violett, ruhiges Grau statt
  Lila-Tönen, hell wie dunkel. Die Anmeldung selbst bleibt im
  UPCrew-Violett; Grün und Gelb im Spiel bedeuten weiter dasselbe.
- **Menü hinter drei Balken:** Die Leiste unten ist weg. Oben rechts auf
  dem Start steht ein Knopf mit drei Balken, dahinter Profil, Freunde und
  Rangliste — wie in Blunderluck. Offene Freundesanfragen zeigt eine rote
  Zahl am Knopf. Jede dieser Seiten hat oben links „Zurück".
- **Felder antippen in Wordle:** In der Zeile, in die du gerade schreibst,
  kannst du jedes Feld antippen. Der nächste Buchstabe landet genau dort —
  so trägst du z. B. schon ein, dass das Wort auf E endet, und füllst den
  Rest danach. Das markierte Feld ist blau umrandet; nach dem Tippen
  springt die Markierung zum nächsten leeren Feld. Am Rechner gehen auch
  die Pfeiltasten.
## 0.2.1 — 25.09.2026

**UP#Plus ist nur noch der Rollen-Verteiler** (wie Blunderluck v0.139.0):
keine Rangliste, keine Suche, keine Freunde, keine Anfragen in beide
Richtungen.

## 0.2.0 — 2026-09-25

- **Name mit Nummer:** Jeder bekommt seine eigene Nummer, zum Beispiel
  Mia#4821. Angemeldet wird mit Name#Nummer. Namen nur aus Buchstaben und
  Ziffern, Symbole verschwinden beim Tippen.
- **Sicheres Passwort:** 8 bis 12 Zeichen, mit Gross- und Kleinbuchstaben,
  Ziffer und Sonderzeichen. Es prüft jetzt Firebase (Google); in der
  Datenbank steht es nicht mehr, auch nicht als Prüfsumme. Keine E-Mail,
  kein Google-Konto.
- **Als Gast spielen:** ohne Konto, an dein Gerät gebunden. Im Profil (und
  hin und wieder als Frage) kannst du deinen Spielstand sichern.
- **Jeder schreibt nur sich selbst:** Die Datenbank lässt jedes Konto nur
  seinen eigenen Eintrag ändern.
- **UPCrew-Konto löschen** im Profil, mit Rückfrage und Passwort.
- **Passwort vergessen?** Ein Admin gibt dein Konto zum Neu-Verbinden frei;
  dann legst du beim Anmelden ein neues Passwort fest.

## 0.1.1 — 2026-09-25

- **Knöpfe zum Drücken:** Knöpfe, Tasten und Buchstaben-Kacheln haben jetzt
  eine Kante und wirken wie echte Tasten. Beim Antippen sinken Knöpfe und
  Tasten sichtbar ein. Der erste Schritt zum 3D-Aussehen.
- **Seltener „Dieses Wort kenne ich nicht":** rund 450 geläufige Wörter mehr
  zum Raten (Mehrzahlen, Verb- und Adjektivformen, Wörter wie „nicht",
  „schon", „etwas"). Das Tageswort ändert sich dadurch nicht.

## 0.1.0 — 2026-09-24

Die erste Fassung: das Grundgerüst der Spielesammlung mit Wordle als erstem
Spiel.

- **Wordle auf Deutsch:** jeden Tag ein neues Wort mit fünf Buchstaben, sechs
  Versuche, Umlaute als eigene Tasten. Das Tageswort ist für alle gleich und
  wechselt um Mitternacht. Dazu Übungsrunden mit Zufallswort, so oft du willst.
- **Ein Spiel von UPCrew:** Beim Start erscheint kurz das Studio-Zeichen
  (antippen überspringt es).
- **UPCrew-Konto:** Du meldest dich mit einem UPCrew-Konto an — einem
  Konto für alle Spiele von UPCrew, mit denselben Freunden überall.
- **Rangliste:** heute oder die letzten 7 Tage, alle Spieler oder nur deine
  Freunde. Gelöst im ersten Versuch gibt 6 Punkte, im sechsten 1 Punkt.
- **Freunde:** suchen, anfragen, annehmen, entfernen. Sie gelten in allen
  UPCrew-Spielen.
- **Profil:** gespielte Tage, Quote, Serie, beste Serie und wie oft du im
  wievielten Versuch gelöst hast. Dazu Name und Passwort ändern.
- **Offline und auf den Startbildschirm:** Die App startet auch ohne Netz.
  Ein Tageswort, das ohne Netz gespielt wurde, wird später nachgereicht.
- **Wunsch oder Fehler melden** direkt aus dem Profil.
