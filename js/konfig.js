/*
 * konfig.js — die einzige Datei, die von Hand angepasst wird.
 *
 * Hier stehen Version und Speicher-Einstellungen. Ohne Datenbank-Adresse
 * läuft die App vollständig, speichert dann aber nur im Browser des
 * jeweiligen Besuchers.
 *
 * Bezeichner bleiben ohne Umlaute (wuerfel, aendern), Kommentare und alle
 * sichtbaren Texte werden korrekt deutsch geschrieben.
 */

const KONFIG = {

    /* Version der App (0.MINOR.PATCH, Haus-Regel in ..\..\CLAUDE.md,
       Abschnitt „Versionierung"). HIER STEHT DIE NUMMER GENAU EINMAL — sie
       wird im Profil unter „Über Typoluck" angezeigt, und tests\test-syntax.js
       prüft, dass sw.js, CHANGELOG.md und STATUS.md dieselbe nennen. */
    APP_VERSION: "0.2.0",

    speicher: {

        /* "lokal"     — alles bleibt im Browser dieses Geräts.
           "gemeinsam" — Konten und Ergebnisse liegen in der Firebase-Datenbank.
           Steht hier "gemeinsam", fehlt aber die Adresse, fällt die App von
           selbst auf "lokal" zurück und sagt es. */
        modus: "gemeinsam",

        /*
         * DIE UPCREW-DATENBANK (Nutzer-Entscheidung 24.09.2026): UPCrew ist
         * das Studio hinter allen Spielen. Die Konten gehören dem Studio,
         * nicht einem Spiel — wer ein UPCrew-Konto hat, meldet sich damit in
         * jedem UPCrew-Spiel an. Jedes Spiel hat daneben seinen eigenen
         * Bereich. Angelegt am 24.09.2026, Firebase-Projekt „UPCrew",
         * Region europe-west1 (Belgien). Die Adresse ist kein Geheimnis — sie
         * steht ohnehin im Quelltext jeder ausgelieferten Seite. Regeln und
         * Einrichtung: docs\DEPLOYMENT.md, Abschnitt 1.
         */
        firebaseBasis: "https://upcrew-7a29d-default-rtdb.europe-west1.firebasedatabase.app",

        /*
         * Die zwei Pfade in der Datenbank. UNANTASTBAR, sobald echte Daten
         * darin liegen (test-syntax.js wacht darüber).
         *
         *   spielerPfad   Die UPCrew-Konten, GETEILT mit allen UPCrew-Spielen.
         *                 Jedes Spiel liest und schreibt dort nur nach den
         *                 Regeln in js\spieler.js — vor allem: fremde Felder
         *                 bleiben unangetastet, eigene kommen keine dazu.
         *   spielPfad     Der Bereich, der nur Typoluck gehört (Ergebnisse,
         *                 Rangliste). Braucht in den Firebase-Regeln einen
         *                 eigenen Eintrag — sonst antwortet die Datenbank 401.
         */
        spielerPfad: "spieler",
        spielPfad: "typoluck",

        /* Wie oft (in Millisekunden) nach fremden Änderungen an der
           Spielerliste gefragt wird — nur, solange die Seite sichtbar ist.
           Gefragt wird zuerst nur die Marke (13 Bytes), der volle Stand
           nur, wenn sie sich geändert hat. */
        abfrageIntervallMs: 5000,

        /* Wie lange nach der letzten Änderung gewartet wird, bevor die
           Spielerliste geschrieben wird. */
        schreibVerzoegerungMs: 500,

        /* Schlüssel im Browser-Speicher für den lokalen Modus. Eigene Namen:
           Alle Apps unter up-birdo.github.io teilen sich denselben
           Browser-Speicher (Blunderluck benutzt "blunderluck.…") — die
           Schlüssel dürfen sich nie treffen. */
        lokalerSchluesselSpieler: "typoluck.spieler",
        lokalerSchluesselSpiel: "typoluck.spiel"
    },

    /*
     * DAS UPCREW-KONTO (seit v0.2.0, js\konto.js): Anmeldung über Firebase
     * Authentication, Projekt UPCrew. Beide Werte sind KEIN Geheimnis — sie
     * stehen bei jeder Firebase-Web-App im Quelltext; geschützt wird über
     * die Datenbank-Regeln. Eingetragen vom Nutzer am 25.09.2026, dieselben
     * wie in jedem UPCrew-Spiel.
     */
    konto: {
        apiKey: "AIzaSyC-oWrTMnUaUbb7Sb14TvzfdYcRIOIYcmU",
        appId: "1:355067454774:web:c97aeb6b21445897a53f97",

        /* Die erfundene Adresse `<kennung>@<domain>` — nie zustellbar, ohne
           Namen. In jedem UPCrew-Spiel gleich und UNANTASTBAR. */
        domain: "konten.upcrew.invalid"
    }
};

/* Damit die Regressionstests die Datei außerhalb des Browsers laden können. */
if (typeof module !== "undefined" && module.exports) {
    module.exports = KONFIG;
}
