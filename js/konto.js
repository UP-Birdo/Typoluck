/*
 * konto.js — das UPCrew-Konto: Anmeldung über Firebase Authentication,
 * Namen mit Nummer, Gäste, Rollen.
 *
 * DIESE DATEI IST IN JEDEM UPCREW-SPIEL GLEICH (Blunderluck, Typoluck) —
 * bis auf `SCHLUESSEL`. Wer hier etwas ändert, zieht es in allen Spielen
 * mit, sonst passen Namen, Passwörter und Regeln nicht mehr zusammen.
 *
 * WARUM ES DAS GIBT (UPCrew-Umzug, Nutzer-Aufträge 25.09.2026): Bis dahin
 * stand die Prüfsumme jedes Passworts öffentlich lesbar in der Spielerliste
 * (Apps\Blunderluck\SICHERHEIT.md, Befund 2). Jetzt prüft Firebase das
 * Passwort; in der Datenbank steht keines mehr, und die Regeln lassen jedes
 * Konto nur seinen EIGENEN Eintrag schreiben.
 *
 * KEINE ECHTE MAIL-ADRESSE, KEIN GOOGLE-KONTO: Firebase bekommt nur eine
 * erfundene Adresse aus der zufälligen Konto-Kennung —
 * `<kennung>@konten.upcrew.invalid`. Ohne Namen, nie zustellbar.
 *
 * NAME MIT NUMMER (Nutzer 25.09.2026, „#____-System"): Namen dürfen mehrfach
 * vorkommen; eindeutig ist erst „Name#Nummer" (vier Ziffern, z. B.
 * Jonas#0001). Den Anspruch sichert die DATENBANK selbst ab: Unter
 * `spieler/namen/<name klein>/<nummer>` steht die Konto-Nummer, und die
 * Regeln lassen einen besetzten Platz nicht überschreiben.
 *
 * GÄSTE: Ein anonymes Firebase-Konto, an das Gerät gebunden („Gast#1234").
 * Sichert der Gast seinen Spielstand, wird DASSELBE Konto zum richtigen —
 * es wird nichts kopiert.
 *
 * ROLLEN: „UP#Plus" ist das oberste Konto (AboveAdmin). Nur es vergibt die
 * Rolle „admin" (`spieler/rollen/<uid>`); spielen kann es nicht. Die Regeln
 * kennen seine Konto-Nummer (SICHERHEIT.md, Abschnitt 11).
 *
 * Über die REST-Schnittstelle, NICHT über das Firebase-SDK: keine fremde
 * Bibliothek, kein Bauschritt. Kein DOM in dieser Datei — die Bildschirme
 * stehen in anmeldung.js.
 */

const KONTO = {

    /* Der Schlüssel im Gerätespeicher. Eigener Name je App: Alle Apps unter
       up-birdo.github.io teilen sich denselben Browser-Speicher. */
    SCHLUESSEL: "typoluck.konto",

    /* ---------------------------------------------------------------- *
     * Die Regeln — in jedem UPCrew-Spiel gleich
     * ---------------------------------------------------------------- */

    NAME_MIN: 3,
    NAME_MAX: 16,

    /* 8 bis 12 Zeichen, gross, klein, Ziffer, Sonderzeichen (Nutzer-
       Entscheidung 25.09.2026). */
    PASSWORT_MIN: 8,
    PASSWORT_MAX: 12,

    /* Die Sonderzeichen, die Firebase als solche zählt (Passwortrichtlinie,
       `allowedNonAlphanumericCharacters`, abgefragt am 25.09.2026). */
    SONDERZEICHEN: "^$*.[]{}()?\"!@#%&/\\,><':;|_~`-",

    /* Namen, die niemand wählen kann — sie gehören dem Studio oder den
       Gästen. Verglichen wird klein. */
    RESERVIERT: ["gast", "up", "upcrew", "admin", "aboveadmin", "plus", "moderator"],

    GAST_NAME: "Gast",

    /* Das oberste Konto: Name „UP", Nummer „Plus". Die Nummer ist keine
       Ziffernfolge — so kann sie kein anderes Konto je bekommen (die Regeln
       lassen Buchstaben nur für dieses eine Konto zu). */
    OBER_NAME: "UP",
    OBER_TAG: "Plus",

    /* Wer aus der alten Blunderluck-Datenbank umzieht, bekommt diese Nummer,
       wenn sie für seinen Namen noch frei ist (Jonas → Jonas#0001). */
    UMZUG_TAG: "0001",

    /* Nur für den Umzug: Der Zwischenstand vom 25.09.2026 nachts (lokal
       benutzt, nie ausgeliefert) setzte diese Zutat vor das alte Passwort.
       Wer damit schon ein Firebase-Konto bekam, zieht so trotzdem sauber um
       (`umziehen`). Kann weg, wenn die alte Datenbank gelöscht ist. */
    ZWISCHENSTAND_ZUTAT: "upcrew-konto|",

    VORLAUF_MS: 5 * 60 * 1000,
    ZEITLIMIT_MS: 12000,

    /* KONFIG.konto, wenn die Anmeldung über Firebase läuft — sonst null. */
    einstellung: null,

    /* { kennung, uid, idToken, refreshToken, ablauf, gast } oder null. */
    sitzung: null,

    _erneuerung: null,

    /* Wird gerufen, wenn Firebase die Sitzung nicht mehr anerkennt. */
    beiVerloren: null,

    /* Das Netz — die Tests setzen hier einen Nachbau ein. */
    netz: null,

    /* ---------------------------------------------------------------- *
     * Einrichten und Zustand
     * ---------------------------------------------------------------- */

    einrichten(konfig) {
        const speicher = konfig && konfig.speicher;
        const konto = konfig && konfig.konto;
        KONTO.einstellung = (konto && konto.apiKey && speicher
                && speicher.modus === "gemeinsam" && speicher.firebaseBasis)
            ? konto : null;
        KONTO.sitzung = KONTO.einstellung ? KONTO._lesen() : null;
    },

    aktiv() {
        return !!KONTO.einstellung;
    },

    angemeldet() {
        return !!(KONTO.sitzung && KONTO.sitzung.refreshToken && KONTO.sitzung.uid);
    },

    uid() {
        return KONTO.angemeldet() ? KONTO.sitzung.uid : null;
    },

    istGastSitzung() {
        return KONTO.angemeldet() && KONTO.sitzung.gast === true;
    },

    adresse(kennung) {
        const domain = (KONTO.einstellung && KONTO.einstellung.domain)
            || "konten.upcrew.invalid";
        return String(kennung).toLowerCase() + "@" + domain;
    },

    kennungVon(spieler) {
        if (!spieler) {
            return "";
        }
        return (typeof spieler.kennung === "string" && spieler.kennung !== "")
            ? spieler.kennung : spieler.id;
    },

    /* ---------------------------------------------------------------- *
     * Namen und Nummern
     * ---------------------------------------------------------------- */

    /*
     * Was im Namensfeld stehen bleiben darf: Buchstaben (auch Umlaute und ß)
     * und Ziffern. Alles andere — Symbole, Leerzeichen, fremde Schriftzeichen,
     * die wie lateinische aussehen — fällt beim Tippen sofort heraus
     * (Nutzer-Auftrag 25.09.2026). Nur lateinische Buchstaben: So kann sich
     * niemand mit einem kyrillischen „а" als jemand anderes ausgeben.
     */
    nameSaeubern(text) {
        return String(text === undefined || text === null ? "" : text)
            .normalize("NFC")
            .replace(/[^A-Za-zÄÖÜäöüß0-9]/g, "")
            .slice(0, KONTO.NAME_MAX);
    },

    /* Der Schlüssel des Namens in `spieler/namen` — klein geschrieben, damit
       „Jonas" und „jonas" derselbe Name sind. */
    nameSchluessel(name) {
        return String(name || "").toLowerCase();
    },

    /* Liefert "" bei gültigem Namen, sonst die Begründung. */
    namePruefen(name) {
        const wert = String(name || "");
        if (wert !== KONTO.nameSaeubern(wert)) {
            return "Nur Buchstaben und Ziffern, ohne Leerzeichen.";
        }
        if (wert.length < KONTO.NAME_MIN || wert.length > KONTO.NAME_MAX) {
            return "Der Name braucht " + KONTO.NAME_MIN + " bis " + KONTO.NAME_MAX + " Zeichen.";
        }
        if (KONTO.RESERVIERT.indexOf(KONTO.nameSchluessel(wert)) !== -1) {
            return "Dieser Name ist reserviert.";
        }
        return "";
    },

    /* Liefert "" bei gültigem Passwort, sonst was noch fehlt. */
    passwortPruefen(text) {
        const wert = String(text === undefined || text === null ? "" : text);
        if (/\s/.test(wert)) {
            return "Leerzeichen sind im Passwort nicht erlaubt.";
        }
        if (wert.length < KONTO.PASSWORT_MIN || wert.length > KONTO.PASSWORT_MAX) {
            return "Das Passwort braucht " + KONTO.PASSWORT_MIN + " bis "
                + KONTO.PASSWORT_MAX + " Zeichen.";
        }
        /* GENAU WIE DIE PASSWORTRICHTLINIE VON FIREBASE (in der Konsole
           erzwungen, nachgemessen 25.09.2026): Sie zählt nur a–z, A–Z und
           nur die Sonderzeichen in `SONDERZEICHEN` — ein „§", „€", „+" oder
           Umlaut zählt dort NICHT. Prüfte die App weiter, würde sie Passwörter
           durchlassen, die Firebase dann ablehnt. */
        const fehlt = [];
        if (!/[a-z]/.test(wert)) {
            fehlt.push("ein Kleinbuchstabe");
        }
        if (!/[A-Z]/.test(wert)) {
            fehlt.push("ein Grossbuchstabe");
        }
        if (!/[0-9]/.test(wert)) {
            fehlt.push("eine Ziffer");
        }
        if (!wert.split("").some((zeichen) => KONTO.SONDERZEICHEN.indexOf(zeichen) !== -1)) {
            fehlt.push("ein Sonderzeichen wie ! ? # % & @ - _ .");
        }
        return fehlt.length ? "Es fehlt noch: " + fehlt.join(", ") + "." : "";
    },

    passwortRegelText() {
        return KONTO.PASSWORT_MIN + " bis " + KONTO.PASSWORT_MAX
            + " Zeichen, mit Gross- und Kleinbuchstaben, Ziffer und Sonderzeichen (z. B. ! ? # %)";
    },

    /* „Jonas#0001" → { name: "Jonas", tag: "0001" }; ohne # ist tag null.
       Der Name wird gesäubert, die Nummer auf Buchstaben/Ziffern gekürzt. */
    eingabeZerlegen(text) {
        const roh = String(text || "");
        const stelle = roh.indexOf("#");
        if (stelle === -1) {
            return { name: KONTO.nameSaeubern(roh), tag: null };
        }
        return {
            name: KONTO.nameSaeubern(roh.slice(0, stelle)),
            tag: roh.slice(stelle + 1).replace(/[^A-Za-z0-9]/g, "").slice(0, 4)
        };
    },

    /* Das Anmeldefeld: Name, dann höchstens ein #, dann die Nummer. */
    eingabeSaeubern(text) {
        const teile = KONTO.eingabeZerlegen(text);
        return teile.tag === null ? teile.name : teile.name + "#" + teile.tag;
    },

    anzeigeName(spieler) {
        if (!spieler) {
            return "";
        }
        return (typeof spieler.tag === "string" && spieler.tag !== "")
            ? spieler.name + "#" + spieler.tag : spieler.name;
    },

    tagBelegt(daten, name, tag) {
        const namen = daten && daten.namen;
        const eintraege = namen && namen[KONTO.nameSchluessel(name)];
        return !!(eintraege && eintraege[tag]);
    },

    /* Die Wunsch-Nummer, wenn sie frei ist, sonst eine zufällige freie. */
    tagWaehlen(daten, name, wunsch) {
        if (wunsch && !KONTO.tagBelegt(daten, name, wunsch)) {
            return wunsch;
        }
        for (let versuch = 0; versuch < 500; versuch++) {
            const tag = String(KONTO._zufallsZahl(10000)).padStart(4, "0");
            if (tag !== "0000" && !KONTO.tagBelegt(daten, name, tag)) {
                return tag;
            }
        }
        return null;
    },

    /*
     * Ein Konto zur Eingabe finden. Mit Nummer genau dieses; ohne Nummer nur,
     * wenn es den Namen genau einmal gibt. Liefert { spieler } oder
     * { mehrdeutig: true } oder {}.
     */
    suchen(daten, eingabe) {
        const teile = KONTO.eingabeZerlegen(eingabe);
        const schluessel = KONTO.nameSchluessel(teile.name);
        const liste = (daten && Array.isArray(daten.spieler)) ? daten.spieler : [];
        const gleicherName = liste.filter((spieler) =>
            KONTO.nameSchluessel(spieler.name) === schluessel && spieler.tag);
        if (teile.tag !== null && teile.tag !== "") {
            const treffer = gleicherName.find((spieler) =>
                String(spieler.tag).toLowerCase() === teile.tag.toLowerCase());
            return treffer ? { spieler: treffer } : {};
        }
        if (gleicherName.length === 1) {
            return { spieler: gleicherName[0] };
        }
        return gleicherName.length > 1 ? { mehrdeutig: true } : {};
    },

    /* ---------------------------------------------------------------- *
     * Rollen (gelesen aus der Spielerliste; gesichert von den Regeln)
     * ---------------------------------------------------------------- */

    /* Das oberste Konto ist, wem „UP#Plus" in `spieler/namen` gehört — diesen
       Platz kann nur dieses Konto belegen (Regeln). */
    istOberAdmin(daten, uid) {
        const up = daten && daten.namen && daten.namen[KONTO.nameSchluessel(KONTO.OBER_NAME)];
        return !!(uid && up && up[KONTO.OBER_TAG] === uid);
    },

    istAdmin(daten, uid) {
        if (!uid) {
            return false;
        }
        return KONTO.istOberAdmin(daten, uid)
            || !!(daten && daten.rollen && daten.rollen[uid] === "admin");
    },

    rolleVon(daten, uid) {
        if (KONTO.istOberAdmin(daten, uid)) {
            return "AboveAdmin";
        }
        return KONTO.istAdmin(daten, uid) ? "Admin" : "";
    },

    /* ---------------------------------------------------------------- *
     * Firebase-Anmeldung — jede Handlung liefert { ok } oder
     * { ok: false, fehler } und wirft nie.
     * ---------------------------------------------------------------- */

    async registrieren(kennung, passwort) {
        const antwort = await KONTO._rufen("accounts:signUp", {
            email: KONTO.adresse(kennung), password: String(passwort),
            returnSecureToken: true
        });
        if (antwort.ok) {
            KONTO._sitzungSetzen(kennung, antwort.daten, false);
        }
        return KONTO._ergebnis(antwort);
    },

    async anmelden(kennung, passwort) {
        const antwort = await KONTO._rufen("accounts:signInWithPassword", {
            email: KONTO.adresse(kennung), password: String(passwort),
            returnSecureToken: true
        });
        if (antwort.ok) {
            KONTO._sitzungSetzen(kennung, antwort.daten, false);
        }
        return KONTO._ergebnis(antwort);
    },

    /* Ein anonymes Konto für einen Gast (Firebase-Anbieter „Anonym"). */
    async anonym() {
        const antwort = await KONTO._rufen("accounts:signUp", { returnSecureToken: true });
        if (antwort.ok) {
            KONTO._sitzungSetzen("", antwort.daten, true);
        }
        return KONTO._ergebnis(antwort);
    },

    /* Das Gast-Konto bekommt Adresse und Passwort — dieselbe Konto-Nummer. */
    async gastVerknuepfen(kennung, passwort) {
        const token = await KONTO.token();
        if (!token) {
            return { ok: false, fehler: "verloren" };
        }
        const antwort = await KONTO._rufen("accounts:update", {
            idToken: token, email: KONTO.adresse(kennung), password: String(passwort),
            returnSecureToken: true
        });
        if (antwort.ok) {
            KONTO._sitzungSetzen(kennung, antwort.daten, false);
        }
        return KONTO._ergebnis(antwort);
    },

    async passwortAendern(neues) {
        const token = await KONTO.token();
        if (!token) {
            return { ok: false, fehler: "verloren" };
        }
        const antwort = await KONTO._rufen("accounts:update", {
            idToken: token, password: String(neues), returnSecureToken: true
        });
        if (antwort.ok) {
            KONTO._sitzungSetzen(KONTO.sitzung.kennung, antwort.daten, false);
        }
        return KONTO._ergebnis(antwort);
    },

    async loeschen() {
        const token = await KONTO.token();
        if (!token) {
            return { ok: false, fehler: "verloren" };
        }
        const antwort = await KONTO._rufen("accounts:delete", { idToken: token });
        if (antwort.ok) {
            KONTO.abmelden();
        }
        return KONTO._ergebnis(antwort);
    },

    abmelden() {
        KONTO.sitzung = null;
        KONTO._erneuerung = null;
        try {
            window.localStorage.removeItem(KONTO.SCHLUESSEL);
        } catch (fehler) {
            /* Gesperrter Speicher: dann gibt es auch nichts zu vergessen. */
        }
    },

    /* Ein gültiger Anmelde-Schlüssel oder null. Wirft nie. */
    async token() {
        if (!KONTO.angemeldet()) {
            return null;
        }
        if (KONTO.sitzung.idToken
                && Date.now() < KONTO.sitzung.ablauf - KONTO.VORLAUF_MS) {
            return KONTO.sitzung.idToken;
        }
        if (!KONTO._erneuerung) {
            KONTO._erneuerung = KONTO._erneuern()
                .finally(() => { KONTO._erneuerung = null; });
        }
        return KONTO._erneuerung;
    },

    /* ---------------------------------------------------------------- *
     * Die Abläufe mit der Datenbank
     *
     * `speicher` ist die Konten-Rückwand (SpeicherKonten, speicher.js) —
     * gebraucht wird nur `teilSchreiben`. `daten` ist die aktuelle
     * Spielerliste (mit `namen` und `rollen` oben). Jeder Ablauf liefert
     * { ok, eintrag } oder { ok: false, text } und wirft nie.
     * Danach lädt der Aufrufer die Liste neu.
     * ---------------------------------------------------------------- */

    /* Ein neues Konto mit Name und Passwort. */
    async kontoAnlegen(speicher, daten, name, passwort) {
        const regel = KONTO.namePruefen(name) || KONTO.passwortPruefen(passwort);
        if (regel) {
            return { ok: false, text: regel };
        }
        const tag = KONTO.tagWaehlen(daten, name, null);
        if (!tag) {
            return { ok: false, text: "Für diesen Namen ist keine Nummer mehr frei." };
        }
        const id = KONTO._kennungErzeugen();
        const ergebnis = await KONTO.registrieren(id, passwort);
        if (!ergebnis.ok) {
            return { ok: false, text: KONTO.fehlerText(ergebnis.fehler) };
        }
        const eintrag = KONTO._neuerEintrag(id, name, tag, id);
        return KONTO._eintragSchreibenOderAufraeumen(speicher, eintrag, null);
    },

    /* Ein Gast: anonymes Konto, Name „Gast" mit zufälliger Nummer. */
    async gastAnlegen(speicher, daten) {
        const tag = KONTO.tagWaehlen(daten, KONTO.GAST_NAME, null);
        const ergebnis = await KONTO.anonym();
        if (!ergebnis.ok) {
            return { ok: false, text: ergebnis.fehler === "sonst"
                ? "Gast-Zugang ist gerade nicht möglich." : KONTO.fehlerText(ergebnis.fehler) };
        }
        const eintrag = Object.assign(
            KONTO._neuerEintrag(KONTO._kennungErzeugen(), KONTO.GAST_NAME, tag, ""),
            { gast: true });
        return KONTO._eintragSchreibenOderAufraeumen(speicher, eintrag, null);
    },

    /* Der Gast sichert seinen Spielstand: eigener Name, Passwort — und alles,
       was er als Gast gespielt hat, bleibt (dieselbe Spieler-Kennung). */
    async gastSichern(speicher, daten, eintrag, name, passwort) {
        const regel = KONTO.namePruefen(name) || KONTO.passwortPruefen(passwort);
        if (regel) {
            return { ok: false, text: regel };
        }
        const tag = KONTO.tagWaehlen(daten, name, null);
        const kennung = KONTO._kennungErzeugen();
        const ergebnis = await KONTO.gastVerknuepfen(kennung, passwort);
        if (!ergebnis.ok) {
            return { ok: false, text: KONTO.fehlerText(ergebnis.fehler) };
        }
        const neu = Object.assign(KONTO._sauber(eintrag),
            { name: name, tag: tag, kennung: kennung });
        delete neu.gast;
        return KONTO._eintragSchreiben(speicher, neu, eintrag);
    },

    /*
     * DER UMZUG aus der alten Blunderluck-Datenbank: Das alte Passwort ist
     * schon geprüft (Aufrufer). Das Konto bekommt ein NEUES Passwort nach der
     * UPCrew-Regel, seine bisherige Spieler-Kennung (Partien, Freunde,
     * Rangliste passen weiter) und — wenn frei — die Nummer 0001.
     */
    async umziehen(speicher, daten, altSpieler, name, neuesPasswort, altesPasswort) {
        const regel = KONTO.namePruefen(name) || KONTO.passwortPruefen(neuesPasswort);
        if (regel) {
            return { ok: false, text: regel };
        }
        let ergebnis = await KONTO.registrieren(altSpieler.id, neuesPasswort);
        if (!ergebnis.ok && ergebnis.fehler === "vorhanden") {
            /* Das Firebase-Konto gibt es schon: ein halber Umzug (Netzabbruch
               nach dem Anlegen — dann gilt schon das neue Passwort) oder ein
               Umzug mit dem Zwischenstand vom 25.09.2026 nachts, der das ALTE
               Passwort mit der Zutat `upcrew-konto|` anlegte. Dann wird mit
               dem alten angemeldet und gleich auf das neue umgestellt. */
            ergebnis = await KONTO.anmelden(altSpieler.id, neuesPasswort);
            if (!ergebnis.ok && altesPasswort) {
                ergebnis = await KONTO.anmelden(altSpieler.id,
                    KONTO.ZWISCHENSTAND_ZUTAT + altesPasswort);
                if (ergebnis.ok) {
                    ergebnis = await KONTO.passwortAendern(neuesPasswort);
                }
            }
            if (!ergebnis.ok) {
                return { ok: false, text: "Dein Umzug wurde schon begonnen. Melde "
                    + "dich mit dem NEUEN Passwort an oder bitte einen Admin um Hilfe." };
            }
        }
        if (!ergebnis.ok) {
            return { ok: false, text: KONTO.fehlerText(ergebnis.fehler) };
        }
        const tag = KONTO.tagWaehlen(daten, name, KONTO.UMZUG_TAG);
        const eintrag = Object.assign(KONTO._sauber(altSpieler),
            KONTO._neuerEintrag(altSpieler.id, name, tag, altSpieler.id),
            { freunde: altSpieler.freunde || [], abgelehnt: altSpieler.abgelehnt || [],
                abzeichen: altSpieler.abzeichen || [] });
        return KONTO._eintragSchreiben(speicher, eintrag, null);
    },

    /* NEU VERBINDEN („Passwort vergessen"): Ein Admin hat den Eintrag
       freigegeben. Neues Firebase-Konto, derselbe Eintrag (Kennung, Name,
       Nummer) zieht auf die neue Konto-Nummer um. */
    async neuVerbinden(speicher, daten, altEintrag, passwort) {
        const regel = KONTO.passwortPruefen(passwort);
        if (regel) {
            return { ok: false, text: regel };
        }
        const kennung = KONTO._kennungErzeugen();
        const ergebnis = await KONTO.registrieren(kennung, passwort);
        if (!ergebnis.ok) {
            return { ok: false, text: KONTO.fehlerText(ergebnis.fehler) };
        }
        const neu = Object.assign(KONTO._sauber(altEintrag),
            { uid: KONTO.uid(), kennung: kennung });
        delete neu.neuVerbinden;
        const weitere = {};
        weitere["konten/" + altEintrag.uid] = null;
        return KONTO._eintragSchreibenOderAufraeumen(speicher, neu, altEintrag, weitere);
    },

    /* Den eigenen Namen ändern. Die Nummer bleibt, wenn sie beim neuen
       Namen frei ist. */
    async nameAendern(speicher, daten, eintrag, name) {
        const regel = KONTO.namePruefen(name);
        if (regel) {
            return { ok: false, text: regel };
        }
        const gleich = KONTO.nameSchluessel(name) === KONTO.nameSchluessel(eintrag.name);
        const tag = gleich ? eintrag.tag : KONTO.tagWaehlen(daten, name, eintrag.tag);
        const neu = Object.assign(KONTO._sauber(eintrag), { name: name, tag: tag });
        return KONTO._eintragSchreiben(speicher, neu, eintrag);
    },

    /* Admin: freigeben zum Neu-Verbinden. */
    async freigeben(speicher, eintrag) {
        const neu = Object.assign(KONTO._sauber(eintrag), { neuVerbinden: true });
        return KONTO._eintragSchreiben(speicher, neu, eintrag);
    },

    /* Einen Eintrag samt Namens-Platz entfernen (eigener, oder Admin). */
    async eintragEntfernen(speicher, eintrag) {
        const aenderungen = { geaendertAm: Date.now() };
        aenderungen["konten/" + eintrag.uid] = null;
        if (eintrag.tag) {
            aenderungen["namen/" + KONTO.nameSchluessel(eintrag.name) + "/" + eintrag.tag] = null;
        }
        return KONTO._schreiben(speicher, aenderungen, null);
    },

    /* AboveAdmin: Rolle „admin" geben (true) oder nehmen (false). */
    async rolleSetzen(speicher, uid, admin) {
        const aenderungen = { geaendertAm: Date.now() };
        aenderungen["rollen/" + uid] = admin ? "admin" : null;
        return KONTO._schreiben(speicher, aenderungen, null);
    },

    /* Das eigene Konto ganz löschen: Passwort (frische Anmeldung), Eintrag,
       Namens-Platz, Firebase-Konto. */
    async kontoLoeschen(speicher, eintrag, passwort) {
        const probe = await KONTO.anmelden(KONTO.kennungVon(eintrag), passwort);
        if (!probe.ok) {
            return { ok: false, text: KONTO.fehlerText(probe.fehler) };
        }
        const weg = await KONTO.eintragEntfernen(speicher, eintrag);
        if (!weg.ok) {
            return weg;
        }
        await KONTO.loeschen();
        KONTO.abmelden();
        return { ok: true };
    },

    /* Anmelden mit „Name#Nummer" (oder eindeutigem Namen) und Passwort.
       Liefert zusätzlich `feld` ("name"/"passwort") für die Meldung und
       `freigegeben`, wenn der Admin das Konto zum Neu-Verbinden freigab. */
    async anmeldenMitEingabe(daten, eingabe, passwort) {
        const fund = KONTO.suchen(daten, eingabe);
        if (fund.mehrdeutig) {
            return { ok: false, feld: "name", fehler: "mehrdeutig",
                text: "Diesen Namen gibt es mehrmals. Gib ihn mit Nummer ein, z. B. Name#1234." };
        }
        const spieler = fund.spieler;
        if (!spieler) {
            return { ok: false, feld: "name", fehler: "unbekannt",
                text: "Dieses Konto gibt es nicht." };
        }
        if (spieler.gast === true) {
            return { ok: false, feld: "name", fehler: "gast",
                text: "Gast-Konten gehören zu einem Gerät und haben kein Passwort." };
        }
        if (spieler.neuVerbinden === true) {
            return { ok: false, feld: "name", fehler: "freigegeben", spieler: spieler,
                text: "Dein Konto ist zum Neu-Verbinden freigegeben. Leg ein neues Passwort fest." };
        }
        const ergebnis = await KONTO.anmelden(KONTO.kennungVon(spieler), passwort);
        if (!ergebnis.ok) {
            return { ok: false, feld: "passwort", fehler: ergebnis.fehler,
                text: KONTO.fehlerText(ergebnis.fehler) };
        }
        return { ok: true, spieler: spieler };
    },

    fehlerText(art) {
        switch (art) {
            case "falsch":
                return "Das Passwort stimmt nicht.";
            case "vorhanden":
                return "Dieses Konto gibt es schon.";
            case "zuViele":
                return "Zu viele Versuche. Bitte warte ein paar Minuten.";
            case "verloren":
                return "Die Anmeldung ist abgelaufen. Bitte melde dich neu an.";
            case "schwach":
                return "Firebase lehnt dieses Passwort ab: " + KONTO.passwortRegelText() + ".";
            case "netz":
                return "Keine Verbindung. Bitte versuch es gleich noch einmal.";
            default:
                return "Das hat nicht geklappt. Bitte versuch es noch einmal.";
        }
    },

    /* ---------------------------------------------------------------- *
     * Innereien
     * ---------------------------------------------------------------- */

    _neuerEintrag(id, name, tag, kennung) {
        return {
            id: id, name: name, tag: tag, uid: KONTO.uid(), kennung: kennung,
            freunde: [], abgelehnt: [], abzeichen: []
        };
    },

    /* Ein Eintrag, wie er auf den Server darf: ohne Passwort-Prüfsummen. */
    _sauber(eintrag) {
        const kopie = JSON.parse(JSON.stringify(eintrag || {}));
        delete kopie.pinPruefwert;
        delete kopie.pinSalz;
        return kopie;
    },

    /* Eintrag + Namens-Platz in EINEM Schritt; der alte Platz geht weg, wenn
       sich Name oder Nummer geändert haben. */
    _eintragSchreiben(speicher, eintrag, alt, weitere) {
        const sauber = KONTO._sauber(eintrag);
        const aenderungen = Object.assign({ geaendertAm: Date.now() }, weitere || {});
        aenderungen["konten/" + sauber.uid] = sauber;
        const neuerPlatz = "namen/" + KONTO.nameSchluessel(sauber.name) + "/" + sauber.tag;
        aenderungen[neuerPlatz] = sauber.uid;
        if (alt && alt.tag) {
            const alterPlatz = "namen/" + KONTO.nameSchluessel(alt.name) + "/" + alt.tag;
            if (alterPlatz !== neuerPlatz) {
                aenderungen[alterPlatz] = null;
            }
        }
        return KONTO._schreiben(speicher, aenderungen, sauber);
    },

    /* Wie oben — scheitert das Schreiben, wird das eben angelegte
       Firebase-Konto wieder gelöscht, damit keine Leiche bleibt. */
    async _eintragSchreibenOderAufraeumen(speicher, eintrag, alt, weitere) {
        const ergebnis = await KONTO._eintragSchreiben(speicher, eintrag, alt, weitere);
        if (!ergebnis.ok) {
            await KONTO.loeschen();
        }
        return ergebnis;
    },

    async _schreiben(speicher, aenderungen, eintrag) {
        try {
            await speicher.teilSchreiben(aenderungen);
            return { ok: true, eintrag: eintrag };
        } catch (fehler) {
            return { ok: false, text: "Das ging nicht: " + (fehler && fehler.message) };
        }
    },

    _kennungErzeugen() {
        const krypto = (typeof globalThis !== "undefined") ? globalThis.crypto : null;
        if (krypto && typeof krypto.randomUUID === "function") {
            return krypto.randomUUID();
        }
        return "k-" + Date.now().toString(36) + "-" + KONTO._zufallsZahl(1e9).toString(36);
    },

    _zufallsZahl(grenze) {
        const krypto = (typeof globalThis !== "undefined") ? globalThis.crypto : null;
        if (krypto && typeof krypto.getRandomValues === "function") {
            const zahl = new Uint32Array(1);
            krypto.getRandomValues(zahl);
            return zahl[0] % grenze;
        }
        return Math.floor(Math.random() * grenze);
    },

    async _erneuern() {
        const sitzung = KONTO.sitzung;
        let antwort;
        try {
            antwort = await KONTO._mitZeitlimit(
                "https://securetoken.googleapis.com/v1/token?key="
                    + encodeURIComponent(KONTO.einstellung.apiKey),
                {
                    method: "POST",
                    headers: { "Content-Type": "application/x-www-form-urlencoded" },
                    body: "grant_type=refresh_token&refresh_token="
                        + encodeURIComponent(sitzung.refreshToken)
                });
        } catch (fehler) {
            return null;
        }

        let daten = null;
        try {
            daten = await antwort.json();
        } catch (fehler) {
            daten = null;
        }

        if (KONTO.sitzung !== sitzung) {
            return KONTO.sitzung ? KONTO.sitzung.idToken : null;
        }

        if (antwort.ok && daten && daten.id_token) {
            KONTO.sitzung = Object.assign({}, sitzung, {
                idToken: daten.id_token,
                refreshToken: daten.refresh_token || sitzung.refreshToken,
                ablauf: Date.now() + 1000 * (Number(daten.expires_in) || 3600)
            });
            KONTO._schreibenGeraet();
            return KONTO.sitzung.idToken;
        }

        if (KONTO._art(KONTO._code(daten)) === "verloren") {
            KONTO.abmelden();
            if (typeof KONTO.beiVerloren === "function") {
                KONTO.beiVerloren();
            }
        }
        return null;
    },

    async _rufen(endpunkt, inhalt) {
        if (!KONTO.einstellung) {
            return { ok: false, fehler: "sonst" };
        }
        let antwort;
        try {
            antwort = await KONTO._mitZeitlimit(
                "https://identitytoolkit.googleapis.com/v1/" + endpunkt
                    + "?key=" + encodeURIComponent(KONTO.einstellung.apiKey),
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(inhalt)
                });
        } catch (fehler) {
            return { ok: false, fehler: "netz" };
        }
        let daten = null;
        try {
            daten = await antwort.json();
        } catch (fehler) {
            daten = null;
        }
        if (antwort.ok && daten) {
            return { ok: true, daten: daten };
        }
        return { ok: false, fehler: KONTO._art(KONTO._code(daten)) };
    },

    _ergebnis(antwort) {
        return antwort.ok ? { ok: true } : { ok: false, fehler: antwort.fehler };
    },

    _code(daten) {
        const text = (daten && daten.error && (daten.error.message
            || (typeof daten.error === "string" ? daten.error : ""))) || "";
        return String(text).split(/[\s:]/)[0].toUpperCase();
    },

    _art(code) {
        if (["INVALID_LOGIN_CREDENTIALS", "INVALID_PASSWORD", "EMAIL_NOT_FOUND"]
                .indexOf(code) !== -1) {
            return "falsch";
        }
        if (code === "EMAIL_EXISTS" || code === "CREDENTIAL_ALREADY_IN_USE") {
            return "vorhanden";
        }
        if (code === "TOO_MANY_ATTEMPTS_TRY_LATER") {
            return "zuViele";
        }
        if (code === "WEAK_PASSWORD" || code === "PASSWORD_DOES_NOT_MEET_REQUIREMENTS") {
            return "schwach";
        }
        if (["TOKEN_EXPIRED", "USER_NOT_FOUND", "USER_DISABLED",
                "INVALID_REFRESH_TOKEN", "INVALID_ID_TOKEN",
                "CREDENTIAL_TOO_OLD_LOGIN_AGAIN"].indexOf(code) !== -1) {
            return "verloren";
        }
        return "sonst";
    },

    _sitzungSetzen(kennung, daten, gast) {
        KONTO.sitzung = {
            kennung: String(kennung || ""),
            uid: String(daten.localId || (KONTO.sitzung && KONTO.sitzung.uid) || ""),
            idToken: String(daten.idToken || ""),
            refreshToken: String(daten.refreshToken
                || (KONTO.sitzung && KONTO.sitzung.refreshToken) || ""),
            ablauf: Date.now() + 1000 * (Number(daten.expiresIn) || 3600),
            gast: gast === true
        };
        KONTO._schreibenGeraet();
    },

    async _mitZeitlimit(adresse, einstellungen) {
        const holen = KONTO.netz || ((a, e) => fetch(a, e));
        if (typeof AbortController === "undefined") {
            return holen(adresse, einstellungen);
        }
        const abbruch = new AbortController();
        const uhr = setTimeout(() => abbruch.abort(), KONTO.ZEITLIMIT_MS);
        try {
            return await holen(adresse,
                Object.assign({}, einstellungen, { signal: abbruch.signal }));
        } finally {
            clearTimeout(uhr);
        }
    },

    _lesen() {
        try {
            const text = window.localStorage.getItem(KONTO.SCHLUESSEL);
            const roh = text ? JSON.parse(text) : null;
            if (roh && typeof roh.uid === "string" && roh.uid !== ""
                    && typeof roh.refreshToken === "string" && roh.refreshToken !== "") {
                return {
                    kennung: (typeof roh.kennung === "string") ? roh.kennung : "",
                    uid: roh.uid,
                    idToken: (typeof roh.idToken === "string") ? roh.idToken : "",
                    refreshToken: roh.refreshToken,
                    ablauf: (typeof roh.ablauf === "number") ? roh.ablauf : 0,
                    gast: roh.gast === true
                };
            }
        } catch (fehler) {
            /* Kaputter oder gesperrter Speicher: neu anmelden. */
        }
        return null;
    },

    _schreibenGeraet() {
        try {
            window.localStorage.setItem(KONTO.SCHLUESSEL, JSON.stringify(KONTO.sitzung));
        } catch (fehler) {
            /* Gesperrter Speicher: Die Sitzung gilt dann nur bis zum Neuladen. */
        }
    }
};

/* Damit die Regressionstests die Datei außerhalb des Browsers laden können. */
if (typeof module !== "undefined" && module.exports) {
    module.exports = KONTO;
}
