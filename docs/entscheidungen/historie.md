# Typoluck — Historie

Je Version das Warum. Das Was für Nutzer steht im `CHANGELOG.md`.
Archiv: suchen, nicht blättern.

## Aus der STATUS.md (ausgelagert 25.09.2026)

**0.1.1 — Knöpfe mit Tiefe, mehr Ratewörter (25.09.2026).** Auftrag: „mach
mit offenen Sachen weiter" (UPCrew-Datenbank-Umzug läuft in einer
Blunderluck-Sitzung, Auftrag dort über `TODO.md` vom Nutzer eingetragen).
- 3D Stufe 1: `--knopf-tiefe` 4px, `--kachel-tiefe` 3px, neue Kantenfarben
  je Fläche (hell, dunkel, Werkstatt-dunkel); rote Knöpfe mit roter Kante;
  flache Knöpfe sinken nicht ein. Leistenknöpfe bekamen ungewollt eine
  Kante — Ursache in `erkenntnisse.md`, behoben ohne ihr Aussehen zu ändern.
- Wortliste: 448 Zusatzwörter von Hand (jetzt 567 Lösungen + 659 Zusatz);
  Lösungsliste und Tagesplan unverändert.
- Angesehen (Edge kopflos, 390 px, hell und dunkel): Wordle mit gelben und
  grauen Kacheln, Start, Profil. 397 Prüfungen grün, Versionsstand stimmt.
- Ausgeliefert 25.09.2026, Commit `f5e3479`.

**0.1.0 — Grundgerüst, dann UPCrew (24.09.2026).** Direktauftrag: „beginne
mit dem Bau, erst die ganzen Grundlagen 2D mit Menüs und alles, es folgen
dann 3D-Knöpfe usw., also vorausschauend bauen". Gebaut:
- Modell: `wordle.js` (Bewertung mit doppelten Buchstaben, gerechnetes
  Tageswort mit Tagesplan), `woerter-de.js` (567 Lösungen + 211 Zusatz, von
  Hand), `ergebnisse.js` (Mehrpfad-Schreiben, Warteliste), `rangliste.js`
  (Punkte 7 minus Versuche, Heute/7 Tage, Serie), `spieler.js` (geteilte
  Konten: fremde Felder bleiben, Marke steigt).
- Oberfläche: Start mit Spiel-Kacheln und „Heute bei deinen Freunden",
  Wordle (Aufdecken, Wackeln, Jubel, physische Tastatur), Rangliste,
  Freunde, Profil mit Statistik und Konto, Anmelde-Vollbild, Leiste unten
  mit Zurück-Taste des Handys.
- 3D-Naht: jeder Knopf in `BAUSTEINE.knopf`, Tiefe als Variable (heute 0).
- Werkzeuge: Test-, Start-, Deploy-, Icon-, Wunsch-Skript; Werkstatt-Modus
  (`?werkstatt`, `&intro` zeigt das Intro) für Bildschirmfotos.
- **Noch vor der Auslieferung umgestellt auf UPCrew** (Nutzer: Spieler
  sollen sich nicht „bei einem anderen Spiel" anmelden): neue Datenbank,
  alle Texte „UPCrew-Konto", Intro `js\intro.js`, Test „die Anmeldung nennt
  kein anderes Spiel".
- **Angesehen** (Edge kopflos, 390 px, hell und dunkel): Intro, Anmeldung,
  Start, Wordle laufend und gewonnen, Rangliste, Freunde, Profil. Dabei
  behoben: ausgeschlossene Tasten im Dunkelmodus nicht erkennbar, Knopftext
  brach um, doppelter Name im Anmelde-Kasten, „präsentiert" erschien zu spät.

## 0.1.0 — 24.09.2026

Direktauftrag: „typoluck soll es werden, beginne mit dem Bau — erst die
ganzen Grundlagen 2D mit Menüs und alles, es folgen dann 3D-Knöpfe usw.,
also vorausschauend bauen." Vorher geklärt: dieselbe Datenbank wie
Blunderluck, zuerst auf GitHub, Rangliste und Freunde; Konten gemeinsam
(Nutzer-Antwort auf die Rückfrage). Gebaut als Sammlung mit Wordle als
erstem Spiel; Datenmodell, Tests und Werkzeuge nach Haus-Standard.
Noch vor der ersten Auslieferung umgestellt: Die Konten gehören nicht
Blunderluck, sondern dem Studio UPCrew (eigene Datenbank, UPCrew-Konto in
allen Texten, Intro beim Start) — Nutzer-Ansage, Einzelheiten in
`entschieden.md`. Weil 0.1.0 nie ausgeliefert war, bleibt es bei dieser
Nummer.
