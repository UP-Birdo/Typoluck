# Typoluck — Offen und abgelehnt

Was eine Nutzer-Entscheidung braucht (nicht ungefragt bauen) und was bewusst
nicht gebaut wird (nicht erneut vorschlagen).

## Braucht eine Nutzer-Entscheidung

### App-Zeichen blau oder violett (seit 0.3.0)

Die App ist seit 0.3.0 blau wie Blunderluck, das Zeichen auf dem
Startbildschirm des Handys (`icon.svg`, daraus `icons\*.png` mit
`tools\Icons-Erzeugen.ps1`) ist noch violett. Nicht ungefragt geändert,
weil das Zeichen auch als UPCrew-Zeichen gelesen werden kann und ein neues
Zeichen auf den Handys erst nach Neu-Installieren erscheint. Zu
entscheiden: blau wie die App, oder violett wie das Studio.

### Die grosse Wortliste

Die Startliste (567 Lösungen, 211 Zusatzwörter) ist von Hand. Wer ein
geläufiges Wort rät, das nicht darin steht, bekommt „Dieses Wort kenne ich
nicht" — das wird schnell ärgerlich. Eine grosse Liste (10.000+ erlaubte
Wörter) braucht eine **Quelle mit passender Lizenz**. Kandidaten wären
freie Rechtschreib-Wörterbücher (etwa die deutschen Hunspell-Listen, Lizenz
GPL/LGPL/MPL je nach Fassung — vor Gebrauch prüfen). Zu entscheiden: welche
Quelle, und ob eine GPL-Liste in einem öffentlichen Repo in Ordnung ist.
Bis dahin: Liste von Hand erweitern (hinten anfügen, Tagesplan beachten).

### Ergebnis teilen

Das Teilen des NYT-Spiels sind farbige Quadrate als Emojis. **Abgelehnt
seit 25.09.2026 (0.6.2):** Dieses Raster ist Teil des Looks, gegen den die
NYT vorgeht (`entschieden.md`, „Weg vom NYT-Look"), und Emojis sind im Haus
ohnehin verboten. Offen bleibt nur: Text ohne Quadrate („Wordguesser Nr. 3
— 4/6") oder ein eigenes Bild. Zu entscheiden vom Nutzer.

### Blunderlucks Umzug zu UPCrew (Arbeit einer Blunderluck-Sitzung)

Blunderluck hat seine Konten noch in der eigenen Datenbank. Bis zum Umzug
brauchen seine Spieler für Typoluck ein neues UPCrew-Konto. Beim Umzug
lassen sich die vorhandenen Konten samt Passwort übernehmen (gleiche
Zutat). Offen dabei: ob Blunderluck Spieler ohne Schachpartie in seinen
Listen ausblendet — denn nach dem Umzug stehen dort alle UPCrew-Konten.

### Ein Anmelden für alle UPCrew-Spiele auf einem Gerät

Heute meldet man sich je Spiel getrennt an (siehe `entschieden.md`). Ein
gemeinsames An-/Abmelden ginge über den geteilten Browser-Speicher unter
up-birdo.github.io, koppelt aber die Apps eng. Nur auf Wunsch.

### Passwort vergessen

Es gibt in Typoluck keinen Verwaltungs-Zugang; die Anmeldung sagt „wende
dich an UPCrew". Wie UPCrew ein Passwort zurücksetzt (Verwaltungs-Werkzeug,
eigene Verwaltungs-Seite), ist zu entscheiden.

## Bewusst nicht gebaut

- **Eigene Felder im Spieler-Eintrag** (etwa Wordle-Einstellungen) — sie
  würden beim nächsten Schreiben durch Blunderluck gelöscht. Einstellungen
  gehören auf das Gerät (`ICH`) oder unter `typoluck/…`.
- **Eine Gesamt-Rangliste über alle Zeit** — Neue hätten nie eine Chance;
  „7 Tage" ist die Wertung über Zeit.
- **Übungsrunden in der Rangliste** — man könnte sich hochüben.
- **Das Wort in der Datenbank** — siehe `entschieden.md`.
