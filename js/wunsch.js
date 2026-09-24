/*
 * wunsch.js — der Knopf „Wunsch oder Fehler melden" (im Profil).
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

    async oeffnen() {
        const text = await DIALOG.eingabe("Wunsch oder Fehler",
            "Was fehlt dir, was stört dich? Der Text landet als Eintrag auf GitHub "
                + "(dafür brauchst du dort ein Konto).", "", "Weiter");
        if (text === null || text.trim() === "") {
            return;
        }
        const adresse = "https://github.com/" + WUNSCH.KONTO + "/" + WUNSCH.REPO
            + "/issues/new?template=wunsch.yml"
            + "&idee=" + encodeURIComponent(text.trim())
            + "&stelle=" + encodeURIComponent(NAVIGATION.aktuell || "")
            + "&fassung=" + encodeURIComponent("v" + KONFIG.APP_VERSION);

        /* Bewusst OHNE "noopener" als drittes Argument: Damit liefert
           window.open immer null, und die Meldung unten käme jedes Mal. Die
           Verbindung zur neuen Seite wird stattdessen danach gekappt. */
        const fenster = window.open(adresse, "_blank");
        if (fenster) {
            fenster.opener = null;
        } else {
            await DIALOG.hinweis("Fenster blockiert",
                "Der Browser hat das GitHub-Formular nicht geöffnet. Dein Text: " + text.trim());
        }
    }
};
