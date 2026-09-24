/*
 * woerter-de.js — die deutschen Wörter für Wordle (5 Buchstaben).
 *
 * Zwei Listen, beide klein geschrieben, ein Wort je Eintrag:
 *
 *   loesungen   Was als Lösung drankommen darf: geläufige Wörter, die jeder
 *               kennt. Keine Eigennamen, nichts Anstössiges.
 *   zusatz      Was man ZUSÄTZLICH raten darf, das aber nie Lösung wird
 *               (Beugungsformen, Verben, seltenere Wörter).
 *
 * Geraten werden darf, was in einer der beiden Listen steht.
 *
 * REGELN FÜR JEDEN EINTRAG (tests\test-woerter.js prüft sie alle):
 *   - genau fünf Buchstaben aus a–z und ä, ö, ü;
 *   - kein ß: Wörter damit werden mit „ss" geschrieben (fluss), wie es die
 *     Tastatur des Spiels auch nur anbietet;
 *   - kein Wort doppelt, auch nicht über beide Listen hinweg.
 *
 * HERKUNFT: Von Hand zusammengestellt am 24.09.2026 — eine Startliste; am
 * 25.09.2026 (0.1.1) um rund 450 Zusatzwörter ergänzt, ebenfalls von Hand
 * (Lösungsliste und Tagesplan unverändert). Sie
 * ist bewusst klein; eine grosse Liste braucht eine Quelle mit passender
 * Lizenz, und die Wahl ist eine Nutzer-Entscheidung
 * (docs\entscheidungen\offen-und-abgelehnt.md, „Die grosse Wortliste").
 *
 * DER TAGESPLAN — warum es ihn gibt:
 * Das Tageswort wird aus dem Datum GERECHNET, damit alle Geräte ohne
 * Server dasselbe Wort haben (js\wordle.js, `tageswort`). Die Rechnung
 * hängt an der Länge der Lösungsliste. Wüchse die Liste einfach, bekäme
 * jeder vergangene und künftige Tag ein anderes Wort — und zwei Geräte mit
 * verschiedenen Fassungen der App sähen am selben Tag verschiedene Wörter.
 * Deshalb zählt nicht die Länge der Liste, sondern der Plan:
 *
 *   - Die Liste wird NUR HINTEN ERGÄNZT, nie umsortiert oder gekürzt.
 *   - Wer Wörter ergänzt, trägt einen NEUEN Planabschnitt ein, der erst in
 *     ein paar Tagen beginnt (Geräte brauchen Zeit, die neue Fassung zu
 *     holen), mit der neuen Anzahl.
 *   - Alte Abschnitte werden nie geändert.
 */

const WOERTER_DE = {

    SPRACHE: "de",
    LAENGE: 5,

    TAGESPLAN: [
        /* anzahl  wie viele Wörter vom Anfang der Lösungsliste gelten
           schritt Primzahl, teilerfremd zu anzahl — so kommt jedes Wort
                   genau einmal dran, bevor sich eines wiederholt
           versatz verschiebt den Anfang, damit Tag 1 nicht „abend" ist */
        { ab: "2026-09-24", anzahl: 567, schritt: 7919, versatz: 101 }
    ],

    loesungen: (
        "abend acker adler ahorn aktie alarm album allee alpen altar ampel amsel "
        + "angel angst anker anzug apfel april arena armee armut asche atlas augen "
        + "autor ärger ärmel "
        + "bahre banal bande banjo basis bauch bauer beere beute biber biene birke "
        + "birne bitte blase blatt blech blick blind blitz block blond blume bluse "
        + "boden bogen bohne bombe börse brand braun bravo breit brett brief brise "
        + "brote bruch brust buche bucht bühne busch bügel bäume "
        + "chaos chips chlor clown comic creme curry cello "
        + "dachs damen dampf datei datum dauer decke degen deich demut dicht diele "
        + "dinge docht dolch dosen draht drama dreck droge druck duell dunst durst "
        + "dünen "
        + "ebene echse eiche eifer eigen eimer eisen elend elfen elite engel enkel "
        + "erbse ernte esche essen etage eulen extra eitel eilig "
        + "fabel faden fahne fahrt falke falle falte farbe faser fauna feder feier "
        + "feige feile ferne ferse feuer fibel figur filet firma fisch fjord flach "
        + "flink flirt flöte fluch fluss folge folie forst frage frech frist frost "
        + "frust fuchs fülle funke fähre "
        + "gabel galle gasse gäste gebet gebot geist gelee gerät gicht glanz glatt "
        + "gleis glied glück gnade grube gruft grund gunst gurke güter genau grell "
        + "haare hafen hafer haken halle handy harfe harke hauch haube haupt hebel "
        + "hecht hecke heide henne herde heute hexen hilfe hitze hobby hobel höhle "
        + "hölle honig hotel hügel hülle humor hunde hütte hymne "
        + "ideal imker indiz insel "
        + "jacke jäger jubel juwel "
        + "kabel käfer kakao kamel kamin kampf kanal kante kanne kappe karte kasse "
        + "kater katze kegel kehle kelch kelle kerze kette keule kiste klage klang "
        + "klaue kleid klein klima klotz kluft knabe knall knopf kobra kohle komet "
        + "komma könig kopie krach kraft krake kranz kraut krebs kreis kreuz krieg "
        + "krone kröte krumm küche kugel kunde kunst kurve küste knapp krank "
        + "labor lachs lager lampe lanze laser lasso laube lauch laune leben leber "
        + "leder lehre leise leute licht liebe lilie limit linde linie linse liste "
        + "liter logik lokal lotse lücke lunge "
        + "macht magen mager magie maler mango marke markt maske masse matte mauer "
        + "meile meise menge messe meter miete milch minze mixer monat moral motiv "
        + "motor motte mücke mühle münze musik mütze mutig "
        + "nacht nadel nagel narbe natur nebel neffe nelke notiz nudel nobel nackt "
        + "onkel opfer optik orden orgel osten otter ozean offen "
        + "paket palme panik papst party pasta pause pedal perle pfeil pferd pflug "
        + "pfote phase piano pilot pirat piste pizza plage platz poker preis prinz "
        + "probe profi puder pumpe punkt puppe prima "
        + "qualm quark quarz quote "
        + "rache radar radio rampe rasen ratte rauch raupe recht regal regel regen "
        + "reich reihe reise rente riese rinde rippe robbe rolle roman röhre rosen "
        + "rotor ruder ruine rumpf runde ruhig "
        + "sache sahne saite salat salbe salon samen sauna säule schaf schal segel "
        + "segen seide seife seite serie sirup skala socke sohle sonne sorge sorte "
        + "spalt speck spiel spion spott staat stadt stahl stall stamm stand start "
        + "staub stein stern stich stier stift stirn stock stoff stolz strom stube "
        + "stück stufe stuhl sturm suche sumpf suppe süden szene seele sanft sauer "
        + "schön still stark steil "
        + "tabak tafel tanne tante tasse taste taube teich tempo thron tiger tinte "
        + "tisch titel toast tonne torte traum treue trost tulpe "
        + "umweg unfug "
        + "vater video villa viper vogel "
        + "waage wache waffe wagen walze wange wanne wärme watte weide weile weite "
        + "welle welpe wespe weste wette wiese wolke wolle woche wunde wurst wüste "
        + "weich "
        + "zange zebra zecke zeile zelle zeuge ziege zitat zunge zweig zwerg"
    ).split(" "),

    zusatz: (
        "achse adern affen agent alter anbau artig ärzte atmen audio autos ahnen "
        + "bagel bange barke bauen baden beine beten binde boote boxen buben bunte "
        + "böden bären blass "
        + "dicke diebe dösen dünne "
        + "ecken einig enden enten erben erden eilen ekeln euter eckig "
        + "fegen felge felle filme fotos fugen fäden flott fromm fähig "
        + "gatte gifte geben gehen gären "
        + "haben heben hegen hefte hupen hören "
        + "irren "
        + "jagen jahre "
        + "kauen keile kerbe kerle kerne köche körbe knien kraus "
        + "laden legen lesen lösen loben loten lügen laute locke löwen "
        + "malen mähen mäuse meere mulde mumie möwen "
        + "nagen nähen namen nasen nägel nüsse "
        + "ohren oasen organ "
        + "pegel pinie pulli puter pfahl pfand pfund polar prall platt "
        + "rasch raten reben reden rufen rasse rasur reste rüben ruhen rügen rodel "
        + "riege rinne "
        + "säbel sagen sehen säcke säfte satin scham schar schau schuh sehne sense "
        + "siebe siege silbe sinne sitte spray sprit spule steak stiel stute stumm "
        + "sturz steif scheu "
        + "tadel tänze texte tiere toben tönen trank trieb tritt trupp türme tüten "
        + "tenor total "
        + "uhren unmut unrat unter urban übrig "
        + "vasen venen verse vögel votum vital "
        + "waben waise wanze waren warze weber waten weben wehen weise wende werft "
        + "werke wesen wiege wille winde wirte witwe witze wonne worte wrack würde "
        + "zacke zeche zehen zelte ziele zinke zonen zucht zwirn zwist "
        /* Ergänzt am 25.09.2026 (0.1.1), von Hand: Zahl- und Bindewörter,
           Verb- und Adjektivformen, Mehrzahlen, geläufige Hauptwörter. */
        + "abgas abtei akten alben algen alibi allem allen aller alles alten "
        + "anruf armen aroma assel babys backe basar beige berge besen beton "
        + "beule bevor bibel biest bingo bisse blaue blieb blues blüte bonus "
        + "borte boxer buden busse bäche bäder bälle bänke bärte böcke chefs "
        + "chöre clubs codes dabei dafür daher dahin damit daten davon deine "
        + "delle denkt depot diese disko durch duzen dübel düfte echte ehren "
        + "elche erker ernst essay essig etwas eurer euros falls farne fatal "
        + "faule faxen fehlt feind feine fesch feste fette finte fleck flora "
        + "flure flyer flöhe fokus forum freie frohe front frühe fährt fälle "
        + "fügen fühlt führt füsse gaben ganze garde gaudi geber gecko gegen "
        + "gehst gelbe genie gerne getue gilde ginge gnome graue griff grill "
        + "grobe gross gruss gräte grüne gummi gurte guten guter gutes gänge "
        + "gänse hagel hager halbe hallo harte hasen hatte hauen heiss helle "
        + "helme hielt hirte hofft hohen hoher hohes hohle holen hosen humus "
        + "hurra hähne hälse hände hänge hätte häute hülse hüten ideen ihrem "
        + "ihren ihrer ihres immer indem index infos innen jacht jeans jedem "
        + "jeden jeder jedes jetzt joker junge juror kader kahle kajak kalte "
        + "kamen kanon kanus karre kauft keime keine kekse kennt kiosk klare "
        + "klebe klops kluge knete koala kommt konto krass krimi kräne krüge "
        + "kuppe kurse kurze kutte käfig kälte kämme köpfe kübel kühle laben "
        + "lacht lagen lahme laken lange latte lebte leere lehne leine lernt "
        + "leser lider liebt liege liegt liest likör linke lippe lobby loipe "
        + "lotto luchs lässt läufe läuft löhne lüfte macke magst makel manko "
        + "mappe meine miene milde mitte mixen moden molch monde motto musst "
        + "mädel möbel mögen möhre müden müsli nabel nahen nasse neben nennt "
        + "nette netze neuen neuer neues nicht niere niete nimmt ninja nonne "
        + "notar noten nugat obhut olive orten paare panda panne parks paste "
        + "patin pelze pilze pixel plane pläne pokal polka ponys posse prosa "
        + "psalm pudel pulte pässe radau ranch regie reife reime reine rennt "
        + "ringe risse rodeo roten roter rotes rubin rugby räder räume röcke "
        + "sacht sagst sagte sahen sakko samba satte schon sechs seine sekte "
        + "serum sitze sitzt skier slang snack sofas sogar sollt sonde sonst "
        + "sosse sowie spass spatz spitz sporn sport späte starr staus stege "
        + "steht stieg stroh stunt stäbe sucht summe sushi sägen söhne süsse "
        + "tacho tagen tango tanzt tarif taten tatze tauen taxis teddy teile "
        + "teilt tests thema tiefe tipps trotz truhe träne trübe tuten typen "
        + "täler töpfe türen ulken umbau umzug unser unten viele virus vokal "
        + "volle wachs wahre warme weine weiss wenig werde werte wieso wilde "
        + "wirft wirkt wirst wobei wodka wofür woher wohin wohnt wovon wurde "
        + "wählt wände wären wölfe yacht zahlt zahme zarte zeigt zenit zieht "
        + "zogen zudem zweck zwölf zählt zähne zäune übung"
    ).split(" ")
};

if (typeof module !== "undefined" && module.exports) {
    module.exports = WOERTER_DE;
}
