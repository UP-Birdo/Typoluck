# Typoluck — Wegweiser in die Entscheidungs-Doku

**Lese-Regel:** Nur die Datei öffnen, die das Vorhaben berührt.
`erkenntnisse.md` fast immer; `historie.md` nur bei Fragen zur Vergangenheit.

## erkenntnisse.md — Fallen und Bug-Ursachen

- Eine Variable auf 0 versteckt, welche Regel wirklich gewinnt
- window.open mit "noopener" liefert immer null
- Eine CSS-Animation kann nicht „zur Farbe der Klasse" springen
- In der Testumgebung gibt es kein window.setInterval
- Firebase speichert leere Listen gar nicht

## entschieden.md — getroffene Entscheidungen

- UPCrew-Runde 3: ein Aussehen, Crew-Schrift, UPCrew-Knöpfe, Tab „Anpassen" (0.8.0)
- UPCrew-Runde 2: Farbwelt, Kopfzeile, Tab „Aufgaben" (0.7.0)
- Weg vom NYT-Look: Name Wordguesser, Kacheln Orange/Blau (0.6.2)
- UPCrew-Standard, erster Schritt (0.4.0)
- Blunderlucks Farben, Drei-Balken-Menü, antippbare Felder (0.3.0)
- UP#Plus ist in allen UPCrew-Spielen nur Rollen-Verteiler (0.2.1)
- Name: Typoluck
- Das Studio UPCrew: eigene Datenbank, UPCrew-Konten, Intro
- Ergebnisse zweimal gespeichert: je Tag und je Spieler
- Das Lösungswort steht nie in der Datenbank
- Das Tageswort wird gerechnet, nicht vom Server geholt
- Erst aufs Gerät, dann ins Netz
- Punkte: 7 minus Versuche, ungelöst 0
- Violett als Akzentfarbe (abgelöst durch 0.3.0)
- 2D zuerst, 3D angedockt statt vorgebaut
- Kein Firebase-SDK, keine Bibliothek
- Die Werkstatt wird mit ausgeliefert
- Passwort: Türschloss, kein Tresor

## offen-und-abgelehnt.md

Braucht eine Nutzer-Entscheidung:
- Die grosse Wortliste
- Ergebnis teilen
- Blunderlucks Umzug zu UPCrew
- Ein Anmelden für alle UPCrew-Spiele auf einem Gerät
- Passwort vergessen
- App-Zeichen blau oder violett

Bewusst nicht gebaut: eigene Felder im Spieler-Eintrag, Gesamt-Rangliste,
Übungsrunden in der Rangliste, das Wort in der Datenbank.

## historie.md — je Version das Warum

- 0.1.0 — 24.09.2026
