/*
 * wortbewertung-daten.js — die Wort-Bewertung für die App, verschleiert
 * (js\wortbewertung.js, Kopf „VERSCHLEIERT“). Erzeugt von
 * werkzeug\woerter-bewerten.js — nicht von Hand ändern.
 * `kodiert`: je Lösungswort ein Byte (Base64); `stufenAb`/`skalaAb`: die
 * Schwellen. Die Teilwerte bleiben im Werkzeug.
 */

const WORTBEWERTUNG_DATEN = {
    "anzahl": 567,
    "pruefsumme": "f36676f2",
    "stufenAb": [
        27,
        42
    ],
    "skalaAb": [
        16,
        20,
        25,
        30,
        35,
        39,
        44,
        48,
        56
    ],
    "kodiert": "o2valhHGKrNqr1vjIUrLyOGo72O3VoeiPMVRnv7lskXUt5gpiG2ZLhwT/9B+qF8qKQW0SAVCFXaO9/RnkhiWTdhbRLJWua4lCA+PhZQZvn66OZTIWbFq+lI1T596h4tCHk5VrojlXwer8ei3IQKMNEwvs2/mkccD9Hk2tE9kiWYfwLz+UNXKNFaVqkd/HiR6dzMgDl7GiaSyhi+/bnNjG5nsPL320BUebvy7np+Z175/7/QToes1H8YbnYgWUUcDVd2PDcmyfVWSeXE8YMdGIkKzDDZ61VGCTsOpqSgpVVNBqMNN2+QdNkeBHohWkt1danPMEM7Q4zk5Gh+aYQecnIgf1/st3y3q+a9M9a2ouZATnIcuw8kgKLAvAD/MxmpvUi5c0jw77LiynLOQuv2vVLtW6AuFanfTbdhDfeyWHuXz0PVN3QIgxL4KdTRId3vWU/OmxVJfYOpaClpG8dlT7L7o2hM8n5kmusOjA2W+QwI/Ehl/Rc75Yj7yvxvHGfmrpvLNOtIBEEuHy0p2qEXrkkgDQPlPLqBmT0Z9j7qEovksahJivA+90C1Go+FN+GftFhw+31YV83ysgI9vm7R1jpDI/tBiBHFiTJiBHZMPkSSlJ5JuuYEcACFzDWIOJtWvInSsFgTMCk+OnaWdhQCwatidhmtd/+0H3YJ3jL1KY3obYtTwFD9tqaTm/T1w3rp0yE7ed9kY1IdDU0Q0b+ZR6kt88e3H1IPLH04LgqjW9VAlGWIDiJmx"
};

if (typeof module !== "undefined" && module.exports) {
    module.exports = WORTBEWERTUNG_DATEN;
}
