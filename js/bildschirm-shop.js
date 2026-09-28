/*
 * bildschirm-shop.js — der Tab „Shop" (seit 0.17.0, Platz 5 der Leiste statt
 * „Bald"; wie Blunderluck v0.152.0).
 *
 * Nutzer 27.09.2026: „wir brauchen eine In-Game-Währung, die über beide
 * Spiele geht; mit denen kann man sich Extra-Leben, Tipps und Schild für
 * Flammen kaufen in einem Shop" · „Shop auf dem Platz von Bald soll der
 * kommen". Den Tab zeichnet der gemeinsame Baustein js/upcrew-shop.js; die
 * Münzen rechnet js/upcrew-muenzen.js (Summe über alle Zweige des
 * gemeinsamen Fortschritts). Hier nur, was Typoluck eigen ist:
 *   - woher der Stand kommt (APP.fortschritt: Gerät + Konto) und wie ein
 *     Kauf gebucht wird (APP.kaufen: nur im eigenen Zweig);
 *   - was die Waren IN Typoluck tun (die Texte des Bausteins beschreiben
 *     Blunderluck): Extra-Leben = ein 7. Versuch, Tipp = ein richtiger
 *     Buchstabe an seiner Stelle, Schild = rettet die Flamme.
 *     Seit 0.17.1 über die Baustein-Option `texte` (UPCREW_SHOP.bauen /
 *     UPCREW_SHOP.text) — UPCREW_MUENZEN.WAREN bleibt unverändert.
 */

const SHOP_BILDSCHIRM = {

    TITEL: "Shop",

    /* Was die Waren in Typoluck tun (spieleigen; Option `texte` des Bausteins). */
    TEXTE: {
        schild: { text: "Rettet die Flamme über einen verpassten Tag" },
        leben: { text: "Ein 7. Versuch, wenn der 6. danebengeht" },
        tipp: { text: "Deckt einen richtigen Buchstaben an seiner Stelle auf" }
    },

    _griff: null,

    anmelden() {
        NAVIGATION.anmelden({
            id: "shop",
            titel: SHOP_BILDSCHIRM.TITEL,
            zeichen: "shop",
            imMenue: false,
            zeigen: (behaelter) => SHOP_BILDSCHIRM.zeigen(behaelter),
            verlassen: () => { SHOP_BILDSCHIRM._griff = null; }
        });
    },

    zeigen(behaelter) {
        if (typeof UPCREW_SHOP === "undefined" || typeof UPCREW_MUENZEN === "undefined") {
            behaelter.appendChild(BAUSTEINE.kopfzeile(SHOP_BILDSCHIRM.TITEL));
            behaelter.appendChild(ZUSTAND.fehler({ text: "Nicht geladen" }));
            return;
        }
        /* Wie die Sammlung: der Tab direkt im rollenden Inhalt (klebender Kopf). */
        const wurzel = BAUSTEINE.el("section");
        behaelter.appendChild(wurzel);
        SHOP_BILDSCHIRM._griff = UPCREW_SHOP.bauen(wurzel, {
            titel: SHOP_BILDSCHIRM.TITEL,
            lesen: () => APP.fortschritt(),
            texte: SHOP_BILDSCHIRM.TEXTE,
            kaufen: (ware) => SHOP_BILDSCHIRM.kaufen(ware)
        });
    },

    /* Nach neuen Daten (Konto-Stand, eine Runde) neu zeichnen. */
    zeichnen() {
        if (SHOP_BILDSCHIRM._griff) {
            SHOP_BILDSCHIRM._griff.zeichnen();
        }
    },

    async kaufen(ware) {
        const w = UPCREW_MUENZEN.WAREN[ware];
        if (!w) {
            return false;
        }
        const name = UPCREW_SHOP.text(ware, SHOP_BILDSCHIRM.TEXTE).name;
        const ja = await DIALOG.frage(name + " kaufen?", w.preis + " " + UPCREW_MUENZEN.WAEHRUNG.name, "Kaufen");
        if (!ja) {
            return false;
        }
        const r = APP.kaufen(ware);
        if (!r.ok) {
            DIALOG.kurzmeldung(r.grund === "voll" ? "Vorrat voll" : "Zu wenig " + UPCREW_MUENZEN.WAEHRUNG.name);
            return false;
        }
        DIALOG.kurzmeldung(name + " gekauft");
        return true;
    }
};
