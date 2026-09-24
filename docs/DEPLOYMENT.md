# Typoluck — Auslieferung

Die Klickanleitung. Einmalig: Abschnitte 1 bis 3. Jedes Mal: Abschnitt 4.

## 1. Die UPCrew-Datenbank (einmalig, Nutzer — am 24.09.2026 angelegt)

Typoluck benutzt die Datenbank des Studios **UPCrew** (Firebase-Projekt
„UPCrew", `upcrew-7a29d`, Region europe-west1). Sie gehört keinem Spiel:
`spieler` sind die UPCrew-Konten für alle Spiele, daneben hat jedes Spiel
seinen eigenen Bereich. Ohne Regel für einen Bereich antwortet die
Datenbank dort mit 401 — Typoluck läuft dann trotzdem, Ergebnisse warten
auf dem Gerät, die Rangliste sagt „nicht erreichbar".

So wurde sie angelegt (zum Nachbauen oder Prüfen):

1. `https://console.firebase.google.com` → **Projekt hinzufügen**, Name
   „UPCrew", Google Analytics abgewählt.
2. **Erstellen → Realtime Database → Datenbank erstellen**, Standort
   **Belgien (europe-west1)**, **im gesperrten Modus starten**.
3. Reiter **Regeln**, alles ersetzen durch:

       {
           "rules": {
               "spieler": {
                   ".read": true,
                   ".write": true
               },
               "typoluck": {
                   ".read": true,
                   ".write": true
               }
           }
       }

   Kommt ein Spiel dazu (oder zieht Blunderluck um), bekommt es hier eine
   eigene Zeile nach demselben Muster.
4. **Veröffentlichen**. Die Adresse aus dem Reiter **Daten** steht in
   `js\konfig.js` bei `firebaseBasis`.

Der Tarif bleibt **Spark** (kein Zahlungsmittel, keine Rechnung möglich).

**Kosten:** Der Spark-Plan hat kein Zahlungsmittel, eine Rechnung ist
unmöglich. Typoluck lädt wenig (Marke alle 5 s, Tabellen nur auf Abruf); der
Zähler bleibt im Firebase-Reiter **Nutzung** sichtbar.

**Bewusst in Kauf genommen:** Die Datenbank ist ohne Anmeldung lesbar und
schreibbar (dasselbe Modell wie bei Blunderluck). Nur Spitznamen, nichts Vertrauliches; das
Lösungswort steht deshalb nie darin.

## 2. Repository und Zugang (einmalig, Nutzer)

1. Auf github.com unter **up-birdo** ein Repository **Typoluck** anlegen:
   öffentlich, **mit „Add a README file"** (ohne README gibt es keinen Zweig
   `main`, an den das Deploy-Skript anhängen kann).
2. Fine-grained Token anlegen
   (`https://github.com/settings/personal-access-tokens/new`):
   Repository access → Only select repositories → **Typoluck**;
   Repository permissions → **Contents: Read and write** und
   **Issues: Read and write**.
3. Im Projektordner:

       powershell -ExecutionPolicy Bypass -File "tools\Deploy-Typoluck.ps1" -SetToken

   Der Schlüssel liegt danach DPAPI-verschlüsselt in `tools\github-token.dat`
   und gilt nur für DIESES Windows-Konto (zwei Anmeldungen am Rechner = zwei
   Schlüssel). Er wird nie hochgeladen.

## 3. Erste Auslieferung und Pages (einmalig)

1. Ausliefern wie in Abschnitt 4 (das darf Claude fahren).
2. Auf GitHub: **Settings → Pages → Branch `main`, Ordner `/ (root)` →
   Save.**
3. Nach ein bis zwei Minuten: `https://up-birdo.github.io/Typoluck/`.

## 4. Neue Version ausliefern

1. Version in `js\konfig.js` nach der Haus-Regel erhöhen.
2. **Im selben Schritt** `SPEICHER_NAME` in `sw.js` mitziehen.
3. `CHANGELOG.md` und `STATUS.md` nachziehen.
4. Tests: `powershell -ExecutionPolicy Bypass -File "tools\Test-Typoluck.ps1" -NurFazit`
   → `0 Fehler`.
5. Ansehen, was sich sichtbar geändert hat (Werkstatt, Abschnitt 5).
6. Erst anzeigen, dann senden:

       powershell -ExecutionPolicy Bypass -File "tools\Deploy-Typoluck.ps1" -NurAnzeigen
       powershell -ExecutionPolicy Bypass -File "tools\Deploy-Typoluck.ps1"

7. Nachsehen: `https://up-birdo.github.io/Typoluck/sw.js` zeigt die neue
   Nummer.
8. Bei jeder durch 5 teilbaren MINOR: `tools\Backup-Projekt.ps1 -Projekt Typoluck`
   (Dev-Ebene).

**Nicht ausgeliefert** werden `TODO.md`, `ROADMAP.md`, `CLAUDE.md`,
`STATUS.md` und `tools\github-token.dat` (Sperrliste im Skript).

## 5. Ansehen ohne echte Daten — die Werkstatt

`tools\Typoluck lokal starten.cmd` startet einen Server auf
`http://localhost:8091/`. **Achtung: Dort spricht die App mit der ECHTEN
Datenbank.** Zum Ansehen ohne echte Daten:

    http://localhost:8091/?werkstatt
    http://localhost:8091/?werkstatt&bildschirm=wordle&versuche=leben,tisch
    http://localhost:8091/?werkstatt&bildschirm=rangliste&dunkel
    http://localhost:8091/?werkstatt&anmeldung

Alle Schalter stehen im Kopf von `js\werkstatt.js`. Die Werkstatt läuft
immer lokal und legt bei jedem Aufruf frische Testdaten an.

Für Bildschirmfotos (Claude): Edge kopflos auf die Datei `index.html` mit
`?werkstatt…`, über eine Wegwerf-Seite mit `iframe` fester Breite (390 px),
weil `--window-size` nicht die Layout-Breite ist.

## 6. Der Service Worker

`sw.js` legt alle Dateien im Browser ab: Die App startet ohne Netz und lässt
sich auf den Startbildschirm legen. Die Datenbank wird NIE zwischengespeichert.
Auf `localhost` schaltet er auf „Netz zuerst" (`BEIM_BAUEN`), damit beim
Bauen jede Änderung sofort sichtbar ist. Wer eine Datei ergänzt, trägt sie in
`DATEIEN` ein — `test-syntax.js` meldet es sonst.

Hängt ein alter Stand: F12 → Application → Service Workers → Unregister,
dann Storage → Clear site data.
