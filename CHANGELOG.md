# Typoluck — Neuigkeiten

Was sich je Version geändert hat, neueste oben. Versionsregel: Haus-Regel
`0.MINOR.PATCH` (Dev-`CLAUDE.md`, Abschnitt „Versionierung").

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
