/*
 * kleines-dom.js — ein kleines DOM für Tests, die ECHTE Bausteine fahren, die
 * ihr Markup als Text setzen (seit 0.30.0, für tests\test-sammlung-blatt.js:
 * js\upcrew-anpassen.js schreibt `innerHTML`, js\upcrew-platz.js liest
 * `outerHTML`). Kein Browser, kein Netz — nur so viel DOM, wie diese
 * Bausteine brauchen:
 *
 *   - Elemente mit Attributen, `className`/`classList`, `dataset`, `style`
 *     (auch `setProperty`), `hidden`, `disabled`, `id`, `type`, `title`;
 *   - `innerHTML` setzen (ein kleiner Zerleger: Tags, Attribute, Text;
 *     `<x/>` und die leeren HTML-Tags schliessen sich selbst) und lesen,
 *     `outerHTML`, `textContent`;
 *   - `querySelector(All)`, `closest`, `matches` für Auswahlen aus Tag,
 *     `.klasse`, `#id`, `[attr]`, `[attr="wert"]`, `:not(…)`, Nachfahre
 *     (Leerzeichen), Kind (`>`) und Komma-Listen;
 *   - Ereignisse: `addEventListener`, `removeEventListener` und `click()`,
 *     das wie im Browser nach oben steigt (`target`, `stopPropagation`) und
 *     an einem abgeschalteten Knopf (`disabled`) nichts auslöst.
 *
 * Nichts wird gemessen (`offsetWidth`/`offsetHeight` = 0) und nichts
 * gezeichnet. Wie es aussieht, zeigt nur der Browser.
 *
 *     const { dokumentBauen } = require("./kleines-dom.js");
 *     const dokument = dokumentBauen();      // .documentElement, .head, .body
 */

const LEERE_TAGS = new Set(["img", "br", "hr", "input", "meta", "link"]);

const bindestrich = (name) => (String(name).indexOf("--") === 0 ? String(name)
    : String(name).replace(/[A-Z]/g, (b) => "-" + b.toLowerCase()));
const datenName = (name) => "data-" + String(name).replace(/[A-Z]/g, (b) => "-" + b.toLowerCase());
const datenSchluessel = (attribut) => attribut.slice(5).replace(/-([a-z])/g, (_, b) => b.toUpperCase());
const maskiert = (text) => String(text).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
const entmaskiert = (text) => String(text).replace(/&quot;/g, "\"").replace(/&amp;/g, "&");

/* ------------------------------------------------------------------ *
 * Auswahlen
 * ------------------------------------------------------------------ */

/* "a b > c, d" → [[{ kombi, teil }, …], …]; `teil` = eine zusammengesetzte Auswahl als Text. */
function auswahlZerlegen(text) {
    const listen = [];
    let glieder = [];
    let teil = "";
    let kombi = " ";
    let tiefe = 0;
    const abschliessen = () => {
        if (teil) {
            glieder.push({ kombi: kombi, teil: teil });
            teil = "";
            kombi = " ";
        }
    };
    for (const z of String(text)) {
        if (z === "(" || z === "[") {
            tiefe++;
        } else if (z === ")" || z === "]") {
            tiefe--;
        }
        if (tiefe === 0 && z === ",") {
            abschliessen();
            listen.push(glieder);
            glieder = [];
        } else if (tiefe === 0 && (z === " " || z === "\n" || z === ">")) {
            abschliessen();
            if (z === ">") {
                kombi = ">";
            }
        } else {
            teil += z;
        }
    }
    abschliessen();
    listen.push(glieder);
    return listen.filter((liste) => liste.length > 0);
}

/* Passt das Element auf EINE zusammengesetzte Auswahl ("button.a[data-x="1"]:not(.b)")? */
function teilPasst(el, teil) {
    let rest = teil;
    const tag = /^([a-zA-Z][\w-]*|\*)/.exec(rest);
    if (tag) {
        if (tag[1] !== "*" && el.localName !== tag[1].toLowerCase()) {
            return false;
        }
        rest = rest.slice(tag[0].length);
    }
    while (rest) {
        let t = /^\.([\w-]+)/.exec(rest);
        if (t) {
            if (!el.classList.contains(t[1])) {
                return false;
            }
            rest = rest.slice(t[0].length);
            continue;
        }
        t = /^#([\w-]+)/.exec(rest);
        if (t) {
            if (el.getAttribute("id") !== t[1]) {
                return false;
            }
            rest = rest.slice(t[0].length);
            continue;
        }
        t = /^\[([\w-]+)(?:=(?:"([^"]*)"|'([^']*)'|([^\]]*)))?\]/.exec(rest);
        if (t) {
            const soll = t[2] !== undefined ? t[2] : (t[3] !== undefined ? t[3] : t[4]);
            if (!el.hasAttribute(t[1]) || (soll !== undefined && el.getAttribute(t[1]) !== soll)) {
                return false;
            }
            rest = rest.slice(t[0].length);
            continue;
        }
        t = /^:not\(([^)]*)\)/.exec(rest);
        if (t) {
            if (teilPasst(el, t[1])) {
                return false;
            }
            rest = rest.slice(t[0].length);
            continue;
        }
        throw new Error("kleines-dom: Auswahl nicht verstanden: " + teil);
    }
    return true;
}

function gliederPassen(el, glieder, stelle) {
    if (!teilPasst(el, glieder[stelle].teil)) {
        return false;
    }
    if (stelle === 0) {
        return true;
    }
    if (glieder[stelle].kombi === ">") {
        return !!el.parentNode && el.parentNode.nodeType === 1 && gliederPassen(el.parentNode, glieder, stelle - 1);
    }
    for (let ahne = el.parentNode; ahne && ahne.nodeType === 1; ahne = ahne.parentNode) {
        if (gliederPassen(ahne, glieder, stelle - 1)) {
            return true;
        }
    }
    return false;
}

function passt(el, auswahl) {
    return auswahlZerlegen(auswahl).some((glieder) => gliederPassen(el, glieder, glieder.length - 1));
}

/* ------------------------------------------------------------------ *
 * Knoten
 * ------------------------------------------------------------------ */

class TextKnoten {
    constructor(text) {
        this.nodeType = 3;
        this.parentNode = null;
        this._text = String(text);
    }

    get textContent() {
        return this._text;
    }

    set textContent(wert) {
        this._text = String(wert);
    }

    get outerHTML() {
        return this._text;
    }
}

function stilBauen() {
    const werte = {};
    const lesenAlsText = () => Object.keys(werte).map((name) => name + ":" + werte[name]).join(";");
    const ausText = (text) => {
        for (const name of Object.keys(werte)) {
            delete werte[name];
        }
        for (const satz of String(text || "").split(";")) {
            const stelle = satz.indexOf(":");
            if (stelle > 0) {
                werte[satz.slice(0, stelle).trim()] = satz.slice(stelle + 1).trim();
            }
        }
    };
    const glieder = {
        setProperty(name, wert) {
            werte[name] = String(wert);
        },
        getPropertyValue(name) {
            return name in werte ? werte[name] : "";
        },
        removeProperty(name) {
            delete werte[name];
        }
    };
    return new Proxy(werte, {
        get(ziel, name) {
            if (name === "cssText") {
                return lesenAlsText();
            }
            if (typeof name !== "string") {
                return undefined;
            }
            if (name in glieder) {
                return glieder[name];
            }
            const schluessel = bindestrich(name);
            return schluessel in ziel ? ziel[schluessel] : "";
        },
        set(ziel, name, wert) {
            if (name === "cssText") {
                ausText(wert);
                return true;
            }
            const schluessel = bindestrich(name);
            if (wert === "" || wert === null || wert === undefined) {
                delete ziel[schluessel];
            } else {
                ziel[schluessel] = String(wert);
            }
            return true;
        }
    });
}

class Element {
    constructor(tag, dokument) {
        this.nodeType = 1;
        this.localName = String(tag).toLowerCase();
        this.tagName = String(tag).toUpperCase();
        this.ownerDocument = dokument || null;
        this.parentNode = null;
        this.childNodes = [];
        this.scrollTop = 0;
        this.scrollLeft = 0;
        this.offsetWidth = 0;
        this.offsetHeight = 0;
        this.inert = false;
        this._attribute = {};
        this._horcher = {};
        this.style = stilBauen();
        const el = this;
        this.classList = {
            _liste: () => (el._attribute["class"] || "").split(/\s+/).filter(Boolean),
            contains(name) {
                return this._liste().indexOf(name) !== -1;
            },
            add(...namen) {
                const liste = this._liste();
                for (const name of namen) {
                    if (liste.indexOf(name) === -1) {
                        liste.push(name);
                    }
                }
                el._attribute["class"] = liste.join(" ");
            },
            remove(...namen) {
                el._attribute["class"] = this._liste().filter((name) => namen.indexOf(name) === -1).join(" ");
            },
            toggle(name, an) {
                const soll = an === undefined ? !this.contains(name) : !!an;
                if (soll) {
                    this.add(name);
                } else {
                    this.remove(name);
                }
                return soll;
            }
        };
        this.dataset = new Proxy({}, {
            get: (ziel, name) => (typeof name === "string" && datenName(name) in el._attribute
                ? el._attribute[datenName(name)] : undefined),
            set: (ziel, name, wert) => {
                el._attribute[datenName(name)] = String(wert);
                return true;
            },
            has: (ziel, name) => typeof name === "string" && datenName(name) in el._attribute,
            deleteProperty: (ziel, name) => {
                delete el._attribute[datenName(name)];
                return true;
            },
            ownKeys: () => Object.keys(el._attribute).filter((name) => name.indexOf("data-") === 0).map(datenSchluessel),
            getOwnPropertyDescriptor: (ziel, name) => (typeof name === "string" && datenName(name) in el._attribute
                ? { value: el._attribute[datenName(name)], writable: true, enumerable: true, configurable: true }
                : undefined)
        });
    }

    /* --- Attribute --- */

    setAttribute(name, wert) {
        if (name === "style") {
            this.style.cssText = wert;
        } else {
            this._attribute[name] = String(wert);
        }
    }

    getAttribute(name) {
        if (name === "style") {
            return this.style.cssText || null;
        }
        return name in this._attribute ? this._attribute[name] : null;
    }

    hasAttribute(name) {
        return name === "style" ? !!this.style.cssText : name in this._attribute;
    }

    removeAttribute(name) {
        delete this._attribute[name];
    }

    get className() {
        return this._attribute["class"] || "";
    }

    set className(wert) {
        this._attribute["class"] = String(wert);
    }

    get id() {
        return this._attribute.id || "";
    }

    set id(wert) {
        this._attribute.id = String(wert);
    }

    get type() {
        return this._attribute.type || "";
    }

    set type(wert) {
        this._attribute.type = String(wert);
    }

    get title() {
        return this._attribute.title || "";
    }

    set title(wert) {
        this._attribute.title = String(wert);
    }

    get hidden() {
        return "hidden" in this._attribute;
    }

    set hidden(wert) {
        if (wert) {
            this._attribute.hidden = "";
        } else {
            delete this._attribute.hidden;
        }
    }

    get disabled() {
        return "disabled" in this._attribute;
    }

    set disabled(wert) {
        if (wert) {
            this._attribute.disabled = "";
        } else {
            delete this._attribute.disabled;
        }
    }

    /* --- Baum --- */

    get children() {
        return this.childNodes.filter((k) => k.nodeType === 1);
    }

    get firstChild() {
        return this.childNodes[0] || null;
    }

    get lastChild() {
        return this.childNodes[this.childNodes.length - 1] || null;
    }

    get firstElementChild() {
        return this.children[0] || null;
    }

    get nextSibling() {
        if (!this.parentNode) {
            return null;
        }
        const reihe = this.parentNode.childNodes;
        return reihe[reihe.indexOf(this) + 1] || null;
    }

    get parentElement() {
        return this.parentNode && this.parentNode.nodeType === 1 ? this.parentNode : null;
    }

    appendChild(kind) {
        return this.insertBefore(kind, null);
    }

    insertBefore(kind, vor) {
        if (kind.parentNode) {
            kind.parentNode.removeChild(kind);
        }
        const stelle = vor ? this.childNodes.indexOf(vor) : -1;
        if (stelle === -1) {
            this.childNodes.push(kind);
        } else {
            this.childNodes.splice(stelle, 0, kind);
        }
        kind.parentNode = this;
        return kind;
    }

    removeChild(kind) {
        const stelle = this.childNodes.indexOf(kind);
        if (stelle !== -1) {
            this.childNodes.splice(stelle, 1);
            kind.parentNode = null;
        }
        return kind;
    }

    remove() {
        if (this.parentNode) {
            this.parentNode.removeChild(this);
        }
    }

    contains(anderer) {
        for (let k = anderer; k; k = k.parentNode) {
            if (k === this) {
                return true;
            }
        }
        return false;
    }

    /* --- Text und Markup --- */

    get textContent() {
        return this.childNodes.map((k) => k.textContent).join("");
    }

    set textContent(wert) {
        for (const k of this.childNodes) {
            k.parentNode = null;
        }
        this.childNodes = [];
        if (wert !== "" && wert !== null && wert !== undefined) {
            this.appendChild(new TextKnoten(wert));
        }
    }

    get innerHTML() {
        return this.childNodes.map((k) => k.outerHTML).join("");
    }

    set innerHTML(html) {
        this.textContent = "";
        zerlegen(String(html), this);
    }

    get outerHTML() {
        let attribute = Object.keys(this._attribute)
            .map((name) => " " + name + "=\"" + maskiert(this._attribute[name]) + "\"").join("");
        if (this.style.cssText) {
            attribute += " style=\"" + maskiert(this.style.cssText) + "\"";
        }
        return "<" + this.localName + attribute + ">" + this.innerHTML + "</" + this.localName + ">";
    }

    /* --- Suchen --- */

    matches(auswahl) {
        return passt(this, auswahl);
    }

    closest(auswahl) {
        for (let k = this; k && k.nodeType === 1; k = k.parentNode) {
            if (passt(k, auswahl)) {
                return k;
            }
        }
        return null;
    }

    querySelectorAll(auswahl) {
        const treffer = [];
        const suchen = (el) => {
            for (const k of el.childNodes) {
                if (k.nodeType === 1) {
                    if (passt(k, auswahl)) {
                        treffer.push(k);
                    }
                    suchen(k);
                }
            }
        };
        suchen(this);
        return treffer;
    }

    querySelector(auswahl) {
        return this.querySelectorAll(auswahl)[0] || null;
    }

    /* --- Ereignisse --- */

    addEventListener(art, f) {
        (this._horcher[art] = this._horcher[art] || []).push(f);
    }

    removeEventListener(art, f) {
        this._horcher[art] = (this._horcher[art] || []).filter((x) => x !== f);
    }

    /* Ein Ereignis, das wie im Browser nach oben steigt. */
    ausloesen(art, zusatz) {
        let halt = false;
        const ereignis = Object.assign({
            type: art,
            target: this,
            preventDefault() { },
            stopPropagation() {
                halt = true;
            }
        }, zusatz || {});
        for (let k = this; k && !halt; k = k.parentNode) {
            for (const f of (k._horcher && k._horcher[art] ? k._horcher[art].slice() : [])) {
                f.call(k, ereignis);
            }
        }
        return ereignis;
    }

    /* Ein Tipp. An (oder in) einem abgeschalteten Knopf geschieht nichts. */
    click() {
        const knopf = this.closest("button");
        if (knopf && knopf.disabled) {
            return false;
        }
        this.ausloesen("click");
        return true;
    }

    focus() { }

    blur() { }

    scrollIntoView() { }

    getBoundingClientRect() {
        return { top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 };
    }
}

/* ------------------------------------------------------------------ *
 * Markup aus Text
 * ------------------------------------------------------------------ */

function zerlegen(html, wurzel) {
    const marke = /<!--[\s\S]*?-->|<\/([a-zA-Z][\w:-]*)\s*>|<([a-zA-Z][\w:-]*)((?:\s+[^\s"'<>\/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'<>]+))?)*)\s*(\/?)>|([^<]+)/g;
    const stapel = [wurzel];
    let t;
    while ((t = marke.exec(html)) !== null) {
        const oben = stapel[stapel.length - 1];
        if (t[1]) {
            /* schliessendes Tag: bis zum passenden offenen zurück */
            for (let i = stapel.length - 1; i > 0; i--) {
                if (stapel[i].localName === t[1].toLowerCase()) {
                    stapel.length = i;
                    break;
                }
            }
        } else if (t[2]) {
            const el = new Element(t[2], wurzel.ownerDocument);
            const attribut = /([^\s"'<>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'<>]+)))?/g;
            let a;
            while ((a = attribut.exec(t[3] || "")) !== null) {
                const wert = a[2] !== undefined ? a[2] : (a[3] !== undefined ? a[3] : (a[4] !== undefined ? a[4] : ""));
                el.setAttribute(a[1], entmaskiert(wert));
            }
            oben.appendChild(el);
            if (!t[4] && !LEERE_TAGS.has(el.localName)) {
                stapel.push(el);
            }
        } else if (t[5] && t[5].trim()) {
            oben.appendChild(new TextKnoten(t[5]));
        }
    }
}

/* ------------------------------------------------------------------ *
 * Das Dokument
 * ------------------------------------------------------------------ */

function dokumentBauen() {
    const horcher = {};
    const dokument = {
        nodeType: 9,
        visibilityState: "visible",
        activeElement: null,
        createElement: (tag) => new Element(tag, dokument),
        createElementNS: (raum, tag) => new Element(tag, dokument),
        createTextNode: (text) => new TextKnoten(text),
        addEventListener(art, f) {
            (horcher[art] = horcher[art] || []).push(f);
        },
        removeEventListener(art, f) {
            horcher[art] = (horcher[art] || []).filter((x) => x !== f);
        },
        querySelector: (auswahl) => dokument.documentElement.querySelector(auswahl),
        querySelectorAll: (auswahl) => dokument.documentElement.querySelectorAll(auswahl),
        getElementById: (id) => dokument.documentElement.querySelector("#" + id)
    };
    dokument.documentElement = new Element("html", dokument);
    dokument.head = new Element("head", dokument);
    dokument.body = new Element("body", dokument);
    dokument.documentElement.appendChild(dokument.head);
    dokument.documentElement.appendChild(dokument.body);
    return dokument;
}

module.exports = { dokumentBauen, Element, TextKnoten, passt };
