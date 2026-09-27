/*
 * wunsch.js — der Knopf „Wunsch oder Fehler melden" (in den Einstellungen, bis 0.4.0 im Profil).
 *
 * Der Weg eines Wunsches (Haus-Standard für öffentliche Apps):
 *
 *     App  ->  vorbefülltes GitHub-Formular  ->  Eintrag im Repo
 *          ->  tools\Wuensche-Abholen.ps1  ->  TODO.md „## Anfragen"
 *          ->  Nutzer schreibt „bestätigt" dahinter  ->  ROADMAP.md
 *
 * Kein Token in der App: Ein Schreib-Schlüssel in einer öffentlichen Seite
 * könnte jeder Besucher benutzen. Angemeldet wird der Melder von GitHub.
 */

const WUNSCH = {

    KONTO: "up-birdo",
    REPO: "Typoluck",

    /*
     * NUR TEXT (seit 0.15.8, Nutzer 27.09.2026: „bei Fehler melden eine
     * Sperre für Sonderzeichen und sonstigen Unfug einbauen, nur Text, sonst
     * kann was schiefgehen"). Dieselbe Zeichenliste wie Blunderluck
     * (js\wunsch.js ab v0.151.10).
     *
     * Erlaubt: lateinische Buchstaben (mit Umlauten, ß, Akzenten), Ziffern,
     * Leerzeichen, Zeilenumbruch und . , ! ? - ( ) : ; — alles andere
     * (spitze, eckige, geschweifte Klammern, \ / | $ % & * = ~ ^, Backtick,
     * Emojis, Steuer- und unsichtbare Zeichen) fliegt beim Tippen raus
     * (`zeichenFiltern`) und wird vor dem Senden noch einmal entfernt
     * (`saeubern`). Der Text geht nur als Adress-Teil (encodeURIComponent)
     * in ein GitHub-Formular; tools\Wuensche-Abholen.ps1 prüft beim
     * Abholen noch einmal (dort kann jeder direkt auf GitHub schreiben).
     */
    MAX_LAENGE: 500,
    NICHT_ERLAUBT: /[^\p{Script=Latin}0-9 \n.,!?\-():;]/gu,

    /* Beim Tippen: nur verbotene Zeichen weg (Tab → Leerzeichen), sonst
       nichts — ein Leerzeichen am Ende braucht man beim Weiterschreiben. */
    zeichenFiltern(text) {
        return String(text || "")
            .replace(/\r\n?/g, "\n")
            .replace(/\t/g, " ")
            .replace(WUNSCH.NICHT_ERLAUBT, "")
            .slice(0, WUNSCH.MAX_LAENGE);
    },

    /* Vor dem Senden: filtern, Mehrfach-Leerzeichen zu einem, höchstens eine
       Leerzeile am Stück, Ränder weg, Länge begrenzen. */
    saeubern(text) {
        return WUNSCH.zeichenFiltern(text)
            .replace(/ {2,}/g, " ")
            .replace(/ *\n */g, "\n")
            .replace(/\n{3,}/g, "\n\n")
            .trim()
            .slice(0, WUNSCH.MAX_LAENGE);
    },

    /* Die Adresse des vorbefüllten Formulars — nur mit gesäubertem Text. */
    adresse(text, stelle, fassung) {
        return "https://github.com/" + WUNSCH.KONTO + "/" + WUNSCH.REPO
            + "/issues/new?template=wunsch.yml"
            + "&idee=" + encodeURIComponent(WUNSCH.saeubern(text))
            + "&stelle=" + encodeURIComponent(String(stelle || "").replace(/[^a-z0-9-]/gi, ""))
            + "&fassung=" + encodeURIComponent(String(fassung || "").replace(/[^v0-9.]/g, ""));
    },

    async oeffnen() {
        const roh = await DIALOG.eingabe("Wunsch oder Fehler",
            "Was fehlt dir, was stört dich? Nur Text, höchstens " + WUNSCH.MAX_LAENGE
                + " Zeichen. Er landet als Eintrag auf GitHub (dafür brauchst du dort ein Konto).",
            "", "Weiter", false,
            { mehrzeilig: true, filter: WUNSCH.zeichenFiltern, maxLaenge: WUNSCH.MAX_LAENGE });
        if (typeof roh !== "string") {
            return;
        }
        const text = WUNSCH.saeubern(roh);
        if (text === "") {
            return;
        }
        const adresse = WUNSCH.adresse(text, NAVIGATION.aktuell, "v" + KONFIG.APP_VERSION);

        /* Bewusst OHNE "noopener" als drittes Argument: Damit liefert
           window.open immer null, und die Meldung unten käme jedes Mal. Die
           Verbindung zur neuen Seite wird stattdessen danach gekappt. */
        const fenster = window.open(adresse, "_blank");
        if (fenster) {
            fenster.opener = null;
        } else {
            await DIALOG.hinweis("Fenster blockiert",
                "Der Browser hat das GitHub-Formular nicht geöffnet. Dein Text:\n\n" + text);
        }
    }
};
