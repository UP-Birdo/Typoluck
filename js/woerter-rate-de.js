/*
 * woerter-rate-de.js — die grosse RATE-LISTE (seit 0.23.4): Wörter, die
 * man raten darf, die aber NIE Lösung werden. Lösungen und Tagesplan
 * kommen weiter nur aus js/woerter-de.js (`loesungen`).
 *
 * Erlaubt beim Raten ist: Lösungen + `zusatz` (js/woerter-de.js) + diese
 * Liste in der passenden Länge (js/wordle.js `istErlaubt`).
 *
 * NACH LÄNGE GETRENNT: die 5 Buchstaben stehen hier (die Bücher und das
 * Tageswort haben 5), 4, 6 und 7 in js/woerter-rate-de-4.js, -6.js, -7.js.
 * Die lädt `laden(laenge)` erst, wenn eine Runde dieser Länge startet —
 * heute gibt es keine (Lösungswörter dieser Längen fehlen noch).
 *
 * REGELN (tests/test-woerter.js): genau N Buchstaben aus a–z, ä, ö, ü;
 * kein ß (→ ss); kein Wort doppelt innerhalb einer Liste.
 *
 * HERKUNFT UND LIZENZ (aus scratchpad\wortliste\QUELLE.txt der
 * UPCrew-Koordination, erzeugt und geprüft am 28.09.2026; vom Nutzer
 * freigegeben: „ja, wenn aus vertrauenswürdiger Quelle und geprüft"):
 *   Quelle   LanguageTool german-pos-dict,
 *            https://github.com/languagetool-org/german-pos-dict —
 *            Datei src/main/resources/org/languagetool/resource/de/german.dict
 *            (Git-Blob bb1e3370c9d515a225fe5879801b2180387333bd)
 *   Ursprung laut deren LICENSE: Export aus Morphy
 *            (http://morphy.wolfganglezius.de/), erweitert durch
 *            korrekturen.de/flexion (http://korrekturen.de/flexion)
 *   Lizenz   Creative Commons Attribution-ShareAlike 4.0 International
 *            (CC BY-SA 4.0), https://creativecommons.org/licenses/by-sa/4.0/
 *   Bearbeitung: alle Wortformen; ohne Eigennamen (EIG), Abkürzungen
 *            (ABK) und reine Großbuchstaben-Wörter; klein geschrieben;
 *            ß → ss; nur a–z ä ö ü; nach Länge getrennt.
 * DIESE DATEI steht als bearbeitete Fassung ebenfalls unter CC BY-SA 4.0
 * (https://creativecommons.org/licenses/by-sa/4.0/). Der übrige Code von
 * Typoluck ist davon nicht berührt.
 */

const WOERTER_RATE_DE = {

    QUELLE: "LanguageTool german-pos-dict (Morphy, korrekturen.de/flexion)",
    LIZENZ: "CC BY-SA 4.0",
    LIZENZ_LINK: "https://creativecommons.org/licenses/by-sa/4.0/",

    /* Die Listen je Länge: Text (Leerzeichen dazwischen) bis zum ersten
       Nachschlagen, dann eine Menge. */
    _texte: {},
    _mengen: {},

    /* Eine Liste eintragen (die Dateien -4/-6/-7 rufen das beim Laden). */
    eintragen(laenge, text) {
        WOERTER_RATE_DE._texte[laenge] = text;
        delete WOERTER_RATE_DE._mengen[laenge];
    },

    geladen(laenge) {
        return typeof WOERTER_RATE_DE._texte[laenge] === "string";
    },

    liste(laenge) {
        const text = WOERTER_RATE_DE._texte[laenge];
        return typeof text === "string" && text ? text.split(" ") : [];
    },

    /* Steht das Wort in der Rate-Liste seiner Länge? */
    hat(wort) {
        const w = String(wort || "").toLowerCase();
        const n = Array.from(w).length;
        if (!WOERTER_RATE_DE.geladen(n)) {
            return false;
        }
        if (!WOERTER_RATE_DE._mengen[n]) {
            WOERTER_RATE_DE._mengen[n] = new Set(WOERTER_RATE_DE.liste(n));
        }
        return WOERTER_RATE_DE._mengen[n].has(w);
    },

    /* Eine andere Länge nachladen (nur im Browser): Promise, true = da. */
    laden(laenge) {
        if (WOERTER_RATE_DE.geladen(laenge)) {
            return Promise.resolve(true);
        }
        if ([4, 6, 7].indexOf(laenge) === -1 || typeof document === "undefined") {
            return Promise.resolve(false);
        }
        return new Promise((fertig) => {
            const skript = document.createElement("script");
            skript.src = "js/woerter-rate-de-" + laenge + ".js";
            skript.onload = () => fertig(WOERTER_RATE_DE.geladen(laenge));
            skript.onerror = () => fertig(false);
            document.head.appendChild(skript);
        });
    }
};

/* 5 Buchstaben: 5063 Wörter. */
WOERTER_RATE_DE.eintragen(5, (
        "aalen aales aalet aalst aalte aaren aares aasen aases aaset aasig aaste abaki abart abass abast "
        + "abata abate abati abbat abbau abbog abbuk abdüs abegg abend abers abgab abgas abgib abhab abhat "
        + "abhob abhol abhub abirr abiss abkam abkau ablad ablag ablas ablos ablud ablös abmüh abnag abnäh "
        + "abort abred abris abruf abrät absah absog absud abtat abtau abtei abtes abtue abtun abtut abtöt "
        + "abweg abwog abwäg abzog abzug abäse abäst abätz achat achse achte acida acids acker ackja acren "
        + "acres acryl actin actor adacs adams adele adeln adels adelt adept adern adieu adler adlig admin "
        + "adnex adrig adult adyta aerob affen affig affin affix after agame agape agave agens agent agien "
        + "agier agile aging agios aglei agnat agone agons agora aguti ahlen ahmen ahmes ahmet ahmst ahmte "
        + "ahnde ahnen ahnes ahnet ahnin ahnst ahnte ahorn aiden ainus aioli akkus aknen akten aktes aktie "
        + "aktin aktiv akute akuts alarm albas alben album alert algen alias alibi alien allee allem allen "
        + "aller alles allzu almen alpen alpin altar altem alten alter altes altöl ambig amens amigo ammen "
        + "ammer ampel amsel amtei amtes amöbe anass anbad anbau anbot aneck aness anfeg angab angel anger "
        + "angle angst anhab anhat anhob anhup anime anise ankam anker anlag anlas anlog anmut anpes anras "
        + "anruf anrät ansah ansog ansäe ansät antat antau antik antob antue antun antut anzog anzug anöde "
        + "apart apere apero apfel april arche areal areas arena argem argen arger arges arien arier armee "
        + "armem armen armer armes armut aroma arrak array arsch arten artet artig arzte asant asche asiat "
        + "assel assen asses asset astas asten astes astet asyle asyls atems atlas atmen atmet atome atoms "
        + "atout audio audis audit auftu augen auges aulas aulen auren aurum autor autos avise award axial "
        + "axiom ayran azubi babys bache bachs backe backt bacon baden bades badet badge bafög bagel bahne "
        + "bahnt bahre bahrt baken balge balgs balgt balle balls ballt balme balms balze balzt bambi bamse "
        + "banal bande bands bange bangt banne banns bannt barde barem baren barer bares bargt barke baron "
        + "barre barrt barst barte barts basar basen basis baske basse basta baten batet bauch bauen bauer "
        + "baues bauet baume baums baumt baust baute bayer bazar bazis beach beame beamt beats beaus bebau "
        + "beben bebet bebst bebte beefs beehr beeil beerb beere beete beets befug begab begeh begib behau "
        + "beheb behob beide beige beile beils beine beins beirr beiss beize beizt bejah bekam bekni belad "
        + "belag beleb beleg belle bellt belog belud belüg bemal bemüh berat bereu berge bergs bergt beruf "
        + "beruh berät besag besam besen beste betas beten beter betet beton bette betts betör beuge beugt "
        + "beule beult beute bevor beweg bewog bezog bezug beäug bibel biber bidet biege biegt biene biere "
        + "biers biest biete biken biker bikes biket bikst bikte bilch bilde bilds bimse bimst binde binom "
        + "binse binär birgt birke birne birst bison bisse bisst bitte blaff blage blank blase blass blast "
        + "blatt blaue blaus blech bleib bleie bleis bleue bleut blich blick blieb blies blind blink blitz "
        + "block blogg blogs blohm blond bloss blues bluff blume bluse blute bluts blähe bläht bläst bläue "
        + "bläut blöde blöke blökt blühe blüht blüte board bocke bocks bockt boden bogen bogst bohle bohne "
        + "bohre bohrt bojen bolid bolze bolzt bombe bombt bonds bonus bonze boome booms boomt boote boots "
        + "borde bords borge borgt borke borte bosse boten botet botin botox boule bowle bowls bowlt boxen "
        + "boxer boxet boxte brach brand brate braue braun braus braut brave bravo break breie breis breit "
        + "brems brenn brent brett brich brief briet bring brise brite brote brots bruch brumm brust brühe "
        + "brüht brüll brüte buben buche buchs bucht buden bufdi bugen buges buhen buhet buhle buhlt buhst "
        + "buhte buken bukst bulle bulli bully bumse bumst bunde bunds bunte burka busch busen busse bussi "
        + "butan bwler bytes bäche bäckt bäder bälle bände bänke bären bärge bärte bässe bäten bätet bäuer "
        + "bäume bäumt böcke böden bögen böget böige bölke bölkt börde börse bösem bösen böser böses böten "
        + "bötet bübin bücke bückt bügel bügle bühne büken büket bükst bünde bürde bürge bürgt büros büsse "
        + "büsst büste bütte büxen büxet büxte cache calla calls cameo camps canna capas cargo carve carvt "
        + "cases casts causa celli cello cents chaos chaot chart chats chatt check chefs chice chics chief "
        + "chili chill chino chipp chips chlor chore chors chose chunk chöre circa citys claim clane clans "
        + "clips clone clont cloud clous clown clubs coach cocas codas codes codex cokes colas combo comic "
        + "conga coole copys corde cords cores corps corso couch coupe coups court cover crack crash crawl "
        + "credo creme cremt crews crime crowd cruis curry cyane cyans dabei dache dachs dacht dafür daher "
        + "dahin daily dalag damen damit damle damme damms dampf dandy dangt danke danks dankt daran darbe "
        + "darbt darin darme darms darts dartu darum datei daten dates dativ datum dauer daune dause davon "
        + "davor deale deals debüt decke decks deckt deern degen dehne dehnt deich deine deins dekan dekor "
        + "dekos delle dellt delta demos denar denen denke denkt depot derbe derby deren desto detox deute "
        + "deuts dicht dicke diebe diebs diele diene dient diese diner dinge dings dingt dinos diode dippe "
        + "dippt dirne disco disko dispo disse disst divas djane docht docke docks dockt dogge dogma dohle "
        + "dohne dojos dokus dolan dolch dolle domen domes donau donja donut doofe dopen dopet dopst dopte "
        + "dorfe dorfs dorne dorns dosen doset dosis doste draft draht drall drama drang drauf dreck drehe "
        + "dreht dress drill dring drink dritt drive drobs droge drohe droht druck drums dräng dröge dröhn "
        + "drück drüse duale ducke duckt duden dudle duell duett dufte dufts dukes dulde dumas dumme dumpf "
        + "dumps dunst durch durst dusch dusel dusle dutte dutts duzen duzet duzte dämel dämme dämmt dämpf "
        + "dänen dänge dänin därme döner dörre dörrt dösen döset döste dübel düble düfte dünen dünge düngt "
        + "dünke dünkt dünne dünnt dürfe dürft dürre dürüm düsen düset düste ebben ebbet ebbst ebbte ebene "
        + "ebern ebers ebits ebnen ebnet echoe echos echot echse echte ecken eckig edlem edlen edler edles "
        + "effet egale egeln egels eggen egget eggst eggte ehren ehret ehrst ehrte eiche eicht eidam eiden "
        + "eides eiere eiern eiert eifer eigen eigne eilen eilet eilig eilst eilte eimer einem einen einer "
        + "eines einet einig einst einsä einte eisen eises eiset eisig eisse eiste eitel eiter eitle ekele "
        + "ekeln ekels ekelt eklat eklig ekzem elche elchs elend elfen elfte elite ellen email emoji empör "
        + "emsig enden endes endet engel engem engen enger enges enget engst engte enkel ennui enorm enten "
        + "enzym erahn erbat erbau erbeb erben erbes erbet erbin erbse erbst erbte erden erdet erdig erdöl "
        + "ereil ergab ergib erheb erhob erhol erhöh erhör erkor erlag erleb erleg erlen erlös ernst ernte "
        + "errat erreg errät ersah erste erwog erwäg erzog esche eseln esels espen essay essen esser esset "
        + "essig etage etats ether ethik ethos etuis etwas eulen eurem euren eures euros euter event ewige "
        + "exakt exile exils exits exote extra fabel fache fachs facht facto fadem faden fader fades fahle "
        + "fahne fahre fahrt faire faken fakes faket fakst fakte fakts falke falle falls fallt falte falze "
        + "falzt famos fange fangs fangt farbe farce farne farns fasan faser fasle fasse fasst faste fatal "
        + "fauch faule fault fauna faust faxen faxet faxte fazit feber feder feeds fegen feget fegst fegte "
        + "fehde fehle fehls fehlt feien feier feiet feige feile feilt feind feine feist feite felde felds "
        + "felge felle fells femen ferne ferse fesch fesen feses feste fests fetal fetas feten fette fetts "
        + "fetus fetze fetzt feuer fezen fezes fiats fibel ficht ficke fickt fidel fiele fielt fieps fiese "
        + "fight figur filet filii filme films filmt filou filze filzt final finca finde finge fingt finit "
        + "finke finne finte firma firme firmt first fisch fitem fiten fiter fites fitze fitzt fixem fixen "
        + "fixer fixes fixet fixte fjord flach flagg flair flamm flank flash flaue flaum flaut fleck flehe "
        + "fleht flenn flick flieg flieh flies flink flipp flips flirt flitz float flock flogt flohe flohs "
        + "floht floor flopp flops flora flore flors floss flott flows fluch fluge flugs fluid flupp flure "
        + "flurs fluse fluss flute flyer flämm fläze fläzt flöge flöhe flöss flöte flüge focht fohle fohlt "
        + "fokal fokus folge folgt folie fonds fonts foppe foppt foren forke forme formt forst forum fotos "
        + "fotze foule fouls foult foyer frage fragt frame frans franz frass freak frech freie fremd freue "
        + "freut frier friss frist frohe fromm front frort frost frust fräse fräst fröre frühe fuchs fuffi "
        + "fugen fuget fugst fugte fuhrt funde fundi funds funke funks funkt furie furor furze furzt fusse "
        + "fusst fäden fädle fähig fähre fährt fäkal fälle fällt fände fänge fängt färbe färbt färse fäule "
        + "föhne föhns föhnt fönen fönet fönst fönte förde fötal föten fötus fügen füget fügst fügte fühle "
        + "fühlt führe führt fülle füllt fünft fürst füsse gabel gaben gable gabst gaffe gafft gagen galle "
        + "gambe gamen gamer games gamet gamst gamte gange gangs ganze garbe garde garen garet garne garns "
        + "garst garte gasen gases gaset gasse gaste gasts gates gaudi gaule gauls gebar geben geber gebet "
        + "gebot gebär geeks gegen gehen geher gehet gehre gehrt gehst gehör geien geier geiet geige geigt "
        + "geile geilt geist geite geize geizt gelbe gelbs gelde gelds gelee gelen geles gelob gelte gemse "
        + "gemüt genas genau genen genes genie genre genug genus genüg gerat gerbe gerbt gerne gerät geste "
        + "gesät getan getto getue geäst geölt geübt gibst gicht giere giert giess gifte gifts gilet ginge "
        + "gingt gipse gipst girls giros glace glanz glase glast glatt glaub gleis gleit glich glied glimm "
        + "glitt glomm glotz glänz glück glühe glüht gmbhs gmünd gnade goali goals golde golds golfe golfs "
        + "golft gonge gongs gongt goren gorst gosse gosst goten gotik gotte gotts gouda grabe grabs grabt "
        + "grade grads grals gramm grand graph grase grast graue graul graus graut greif greis grell grenz "
        + "gries griff grill grins grips grobe grogs groko groll gross grube grubt gruft grund grunz gruss "
        + "gräbt gräme grämt gräte gröle grölt grübe grüne grüns grüss gucke guckt guide gummi gunst gurke "
        + "gurre gurrt gurte gurts gusse gutem guten guter gutes guttu gyros gäben gäbet gähne gähnt gälte "
        + "gämse gänge gänse gänze gären gäret gärst gärte gäste gäule gönne gönnt gören göret gösse götti "
        + "götze güsse güter gütig haare haars haart haben habet hacke hacks hackt hafen hafer hafte hagel "
        + "hager hagle hahne hahns haien haies haken haket hakst hakte halbe halde halft halle hallo halls "
        + "hallt halme halms halon halse halst halte halts handy hange hangs harem harfe harke harkt harre "
        + "harrt harte harze harzt hasch hasen hasse hasst haste hatte haube hauch hauen hauer hauet haupt "
        + "hause haust haute haxen heads hebel heben heber hebet heble hebst hecht hecke hecks heere heers "
        + "hefen hefte hefts hegen heget hegst hegte heide heile heils heilt heime heims heini heiss heize "
        + "heizt helfe helft helle hellt helme helms hemde hemds hemme hemmt henke henkt henne heran herbe "
        + "herde herds herrn herum herze herzt hesse hetze hetzt heuer heuet heule heult heute hexen hexet "
        + "hexte hielt hiess hieve hievt hilfe hilft hinge hingt hinke hinkt hintu hinzu hippe hirne hirns "
        + "hirte hisse hisst hitze hiwis hobby hobel hoben hoble hobst hochs hocke hockt hoden hofes hoffe "
        + "hofft hohem hohen hoher hohes hohle hohne hohns holde holen holet holst holte holze holzt honen "
        + "honet honey honig honst honte hoppe hoppt hopse hopst horch horde horne horns horst horte horts "
        + "hosen hosts hotel hotte house hubes hufen hufes huhne huhns hulas human humid humor hunde hunds "
        + "hunne hupen hupet hupst hupte huren huret hurra hurst hurte husch husky huste hutes hymne hypen "
        + "hypes hypet hypst hypte häfen hähne häkle hälfe hälse hände hänge hängt härte hätte häufe häuft "
        + "häute höben höbet höfen höhen höher höhle höhlt hölle hören hörer höret hörig hörst hörte hüben "
        + "hüfte hügel hülle hüllt hülse hülst hüpfe hüpft hürde hüten hüter hütet hütte ibans icons ideal "
        + "ideen idiom idiot idole idols igele igeln igels igelt igitt iglus ihnen ihrem ihren ihrer ihres "
        + "ikone ikons iltis image imago imame imams imker immer immun impfe impft inbox indem inder indes "
        + "index indiz infam infos inkas innen inner innig input insel intim intro inuit inuks ipads ipods "
        + "irrem irren irrer irres irret irrst irrte islam issue items jacht jacke jagen jaget jagst jagte "
        + "jahre jahrs japse japst jasse jasst jaule jault jazze jazzt jeans jecke jedem jeden jeder jedes "
        + "jeeps jenem jenen jener jenes jesum jesus jetzt jobbe jobbt jodes jodle jogge joggt johle johlt "
        + "joint joker jolle jotas jubel juble juchz juden judos julis jumps junge jungs junis juppi juras "
        + "juror jusos juten juwel jäger jähem jähen jäher jähes jäten jätet jüdin kabel kader kaffe kaffs "
        + "kahle kahne kahns kajak kakao kakis kakle kalbe kalbs kalbt kalif kalis kalke kalks kalkt kalla "
        + "kalte kamel kamen kamin kamme kamms kampe kampf kamps kamst kanal kanna kanne kanon kante kanus "
        + "kaper kappe kappt karge karos karre karrt karte karts kasse kaste kasus katen kater katze kauen "
        + "kauet kaufe kaufs kauft kauri kaust kaute kebab kecke kefir kegel kegle kehle kehre kehrt keife "
        + "keift keile keils keilt keime keims keimt keine kekse kelch kelle kenne kennt kerbe kerbt kerle "
        + "kerls kerne kerns kernt kerze kesse kette keuch keule khaki khmer kicke kicks kickt kieke kiekt "
        + "kiese kiest kiffe kifft kille killt kilos kimme kinde kinds kings kinne kinns kinos kiosk kippa "
        + "kippe kippt kiste kitas kiten kiter kitet kitte kitze kiwis klaff klage klagt klamm klane klang "
        + "klans klapp klare klart klaub klaue klaut klebe klebt klees kleid klein klemm klick klima klimm "
        + "kling klink klirr klomm klone klons klont klopf klopp kloss klotz klubs kluft kluge klump kläff "
        + "kläre klärt klöhn klöne klönt klüse knabe knack knall knapp knaps knarr knarz knast kneif knete "
        + "knick knien knies kniet kniff knips knopf knote knuff knurr knust knöpf knüll knüpf kobra koche "
        + "kochs kocht kodas kodes kodex koges kogge kohle kohls kohlt kokle kokse kokst kolbe kolik kolli "
        + "kollo komas kombi komet komma komme kommt konti konto kooge koogs kopfe kopfs kopie korbe korbs "
        + "korde kords koren korke korks korkt korne korns korps korse korso korst koste koten kotes kotet "
        + "kotze kotzt kpdsu krach krade krads kraft krake krall krame krams kramt krane krank krans kranz "
        + "krass kratz kraul kraus kraut krebs kredo kreis kreml krepp kreuz krieg krimi kripo krise kroch "
        + "krone kropf krude kruge krugs krumm krähe kräht kräne kränz kröne krönt kröte krüge krümm kucke "
        + "kuckt kugel kugle kuhle kulis kulte kults kumys kunde kunst kupon kuppe kurde kuren kurse kurve "
        + "kurvt kurze kusch kusse kutte käfer käfig kähne kälte kämen kämet kämme kämmt kämpe kämpf käppi "
        + "käsen käses käset käsig käste käuen käuet käufe käust käute köche köder könig könne könnt köpfe "
        + "köpft körbe kören köret körne körnt körst köter kötze kübel küble küche kühen kühle kühlt kühne "
        + "küken küren küret kürst kürte kürze kürzt küsse küsst küste label laben laber labet labil labor "
        + "labst labte lache lachs lacht lacke lacks laden ladet ladys lagen lager lagst lahme lahmt laibe "
        + "laibs laien laiin lakai laken lalle lallt lamas lamee lamme lamms lampe lande lands lange langt "
        + "lanze lappe lappt larve lasch lasen laser lasse lasso lasst laste latex latte laube laubs lauch "
        + "lauem lauen lauer laues laufe laufs lauft lauge laugt laune lause laust laute lauts laven laxem "
        + "laxen laxer laxes layer leads leake leaks leakt lease least leben leber lebet lebst lebte lecke "
        + "lecks leckt leder ledig leere leert legal legen leger leget legst legte lehme lehms lehne lehnt "
        + "lehre lehrt leibe leibs leibt leide leier leihe leiht leime leims leimt leine leint leise leite "
        + "lemma lende lenke lenkt lenze lerne lernt lesbe lesen leser leset letzt leute level lexem liane "
        + "licht lider lides liebe liebt liede lieds liefe lieft liege liegt liehe lieht liese liess liest "
        + "lifte lifts ligen light liken likes liket likst likte likör lilie limes limit limos linde liner "
        + "linie linke links linse linst lippe lisch liste liter litte litze lobby loben lobes lobet lobst "
        + "lobte loche lochs locht locke lockt lofts logen logge loggt logik login logos logst lohne lohnn "
        + "lohns lohnt loipe lokal looks loops lords losch losem losen loser loses loset loste loten lotet "
        + "lotse lotst lotto lotus lover loyal luden luder ludet lugen luget lugst lugte luken lulle lullt "
        + "lumen lumme lunch lunge lunte lupen lupfe lupft lurch lurke lurkt luxus luzid lycra lyrik läden "
        + "lädst lägen läget lähme lähmt länge längs lärme lärms lärmt läsen läset lässt läufe läuft läuse "
        + "läute lögen löget löhne löhnt lösch lösen löset löste löten lötet löwen löwin lücke lüden lüdet "
        + "lüfte lügen lüget lügst lüste lütte mache macho macht macke maden madig mafia magen mager magie "
        + "magma magst mahle mahls mahlt mahne mahnt maien maile mails mailt maise makel makle malen maler "
        + "males malet malst malte malum malus malze mamas mamba mambo mampf manag manga mango manie manko "
        + "manne manns mappe mappt marge marke marks markt marse maske massa masse masst maste masts match "
        + "mathe matte mauer maule mauls mault maure mayer media mediä meere meers mehle mehls mehre mehrt "
        + "meide meile meine meins meint meise meist mekka melde melke melkt memes memme memos menge mengt "
        + "mensa menue menüs merke merkt merze merzt messe messt meter metro meute miaue miaut miede miefe "
        + "miefs mieft miene miese miete mieze milbe milch milde milfs miliz milkt mimen mimet mimik mimst "
        + "mimte minen minna minne minus minze misch missa misse misst miste mists mitte mixen mixer mixes "
        + "mixet mixte mobbe mobbt mobil modal model modem moden moder modes modle modul modus mofas mogle "
        + "mogul mohne mohns molch molen molke molkt molle molls monat monde monds monom monos moore moors "
        + "moose moped moppe mopps moppt mopse mopst moral morde mords morse morst mosel motel motiv motor "
        + "motte motto motze motzt moves mrnas mucks muffe muffs mufft mulch mulde mulla multi mumie munde "
        + "munds murks murre murrt musen muses musik musse musst muten mutes mutet mutig mutti myope myrte "
        + "mythe mädel mägde mägen mähen mäher mähet mähne mähre mähst mähte mäkle märze mässe mäste mäuse "
        + "mäzen möbel möble mögen möget möhre mölke mönch möpse möwen mücke müdem müden müder müdes mühen "
        + "mühet mühle mühst mühte mülls münde münze münzt mürbe müsli müsse müsst mütze nabel naben nable "
        + "nacht nackt nadel nagel nagen nager naget nagle nagst nagte nahem nahen naher nahes nahmt naive "
        + "namen nanny napfe napfs narbe narre narrt nasal nasch nasen nasse nativ natur navis nazis nebel "
        + "neben neble nebst neffe neger nehme nehmt neide neids neige neigt neins nelke nenne nennt neons "
        + "neppe nepps neppt nerds nerve nervs nervt neste nests nette netze neuem neuen neuer neues nicht "
        + "nicke nicki nickt niere niese niest niete nimmt ninja nippe nippt nisse niste nixen nobel noble "
        + "noise nomen nonen nonne noobs noppe norde nords norme normt notar noten notiz novae noven novum "
        + "nudel nudle nugat nulle nullt nutte nutze nutzt nylon nägel nähen näher nähet nähme nähmt nähre "
        + "nährt nähst nähte näpfe näsle nässe nässt nölen nölet nölst nölte nöten nötig nüsse nütze nützt "
        + "oasen obere obern obers obhut obige oblag oboen obsts ochse ocker odems odium ofens offen ohmen "
        + "ohmes ohren ohres okaye okays oldie olive ollem ollen oller olles omama omens omina onkel opels "
        + "opera opere opern opfer opium optik orbit orden order ordne organ orgel orgie orgle orkan orten "
        + "ortes ortet ossis osten ostes otter ottos outen outet outro ouzos oxide oxids oxyde oxyds ozean "
        + "ozons paare paars paart pacht packe packs packt paffe pafft pagen pager pages paket pakte pakts "
        + "palme pampa panda panel panik panne panty papas paper pappe pappt papst parat pareo parka parke "
        + "parks parkt parse parst party passe passt pasta paste paten pater patin patte patts patze patzt "
        + "pauke paukt pause paust peche pechs pedal pegel peile peilt pelle pellt pelze penes penis penne "
        + "pennt pensa perle perls perlt pesen peset peste pesto petze petzt pfade pfads pfahl pfand pfaue "
        + "pfaus pfeif pfeil pferd pfiff pfleg pflug pflüg pfote pfuis pfund phase phons photo piano picke "
        + "pickt piepe pieps piept piere piers piken pikse pikst pille pilot pilze pimpe pimpf pimpt pinge "
        + "pingt pinie pinke pinne pinnt pinte pirat pisse pisst piste pitch pixel pizza plage plagt plane "
        + "plans plant platt platz plena plopp plump pläne pneus poche pocht pokal poker polar polen poles "
        + "polet polin polka polos polst polte polyp ponys poole pools poolt popel pople popos poppe poppt "
        + "poren porig porno porto porös posen poser posse poste posts potte potts pouch power prahl prall "
        + "prang prass preis prell press priel pries prima prime print prinz prios prise probe probt profi "
        + "proll promi prosa prost protz proxy prunk präge prägt prüde prüfe prüft psalm pucks pudel puder "
        + "puffe puffs pufft pulen pulet pulle pulli pullt pulst pulte pults pumas pumpe pumpt punks punkt "
        + "pupen pupet puppe puppt pupse pupst pupte purem puren purer pures pusch pushe pushs pusht puste "
        + "puten puter putte putti putto putts putze putzt pässe pöbel pöble pökle pönal pötte püffe püree "
        + "quads quake quakt quali qualm quark quarz quasi queen queer quell quere queue quiek quill quirl "
        + "quizz quoll quote quäle quält rabbi raben rache radar radau rades radio radle raffe rafft ragen "
        + "raget ragst ragte rahme rahms rahmt ramme rammt rampe rande rands range rangs rangt ranke rankt "
        + "rannt ranze ranzt rapid rappe rappt rapse rarem raren rarer rares rasch rasen raser raset rasse "
        + "raste rasur raten rates ratet ratte ratze ratzt raube raubs raubt rauch raudi rauem rauen rauer "
        + "raues rauet raufe rauft rauhe rauht raume raums raune raunt raupe raust raute raves rayon reais "
        + "reale realo reals reben rebus reche recht recke reden redet reell regal regel regen reget regie "
        + "regle regne regst regte rehas rehen rehes reibe reibt reich reife reifs reift reihe reiht reime "
        + "reims reimt reine reise reiss reist reite reize reizt rekle relax remis renen renes renke renkt "
        + "renne rennt rente reste rests rette reuig revue rhein riebe riebt riech riefe rieft riege riese "
        + "riete rigid rille rillt rinde ringe rings ringt rinne rinnt rippe rippt risse risst ritte ritts "
        + "ritze ritzt robbe robbt roben robot rocht rocke rocks rockt roden rodet rodle rohem rohen roher "
        + "rohes rohre rohrs rolex rolle rolli rollt roman romas romni rosen rosig rosse roste rotem roten "
        + "roter rotes rotor rotte rotze rotzt route rowdy royal rubel rubin rudel ruder rudre rufen rufes "
        + "rufet rufst rugby ruhen ruhet ruhig ruhme ruhms ruhst ruhte ruine ruins rumba rumms rumor rumpf "
        + "runde rupfe rupft rushs russe ruten räche rächt räder räkle ränge ränne räten rätin rätst räume "
        + "räumt röche röcke röhre römer röntg röste rösti röten röter rötet rüben rücke rückt rüdem rüden "
        + "rüder rüdes rügen rüget rügst rügte rühme rühmt rühre rührt rülps rümpf rüste saale saals sache "
        + "sacke sacks sackt safes safte safts sagas sagen saget sagst sagte sahen sahne sahnt sahst saite "
        + "sakko salat salbe salbt saldo sales salon salto salut salve salze salzt samba samen samet samst "
        + "samte samts sande sands sanft sangt sankt sannt sarge sargs sargt sasst satte satze sauce sauen "
        + "sauer sauet saufe sauft sauge saugt saume saums sauna saune saunt saure sause saust saute scann "
        + "scans scene schab schaf schal scham schar schau scher sches scheu schis schob schon schor schub "
        + "schuf schuh schul schäl schäm schön schür score scout sechs seele segel segen segle segne sehen "
        + "seher sehet sehne sehnt seide seien seiet seife seift seile seils seilt seine seins seist seite "
        + "sekte sekts selig semla senat sende senfe senfs senge sengt senil senke senkt senne sense serbe "
        + "seren serie serum sesam setze setzt seufz sexes sexte shake share sheet shift shirt shopp shops "
        + "shots shows sicht siebe siebs siebt siech siede siege siegs siegt siehe sieht sieze siezt siffs "
        + "sigma silbe silos simse simst singe singt sinke sinkt sinne sinns sinnt sinti sinto sippe sires "
        + "sirup sites sitte sitze sitzt skala skalp skate skats skier skins skort skype skypt slang slash "
        + "slips slots slums smart smogs snack snobs soaps socke sodas sofas sofft sogar sogen soges sogst "
        + "sohle sohlt sohne sohns sojas sojen sokos solar solch solds solis solle solls sollt solos somit "
        + "sonde songs sonne sonnt sonst sooft soren sorge sorgt sorry sorte sosse souls sound sowas sowie "
        + "sozia sozii sozis spack spacs spalt spams spane spann spans spant spare spart spass spate spats "
        + "spatz speck speed speer speie speis speit sperr spick spiee spiel spien spiet spind spinn spins "
        + "spion spitz spore sporn sport spots spott spray spree sprit sprüh spuck spuke spuks spukt spule "
        + "spult spure spurt spute spähe späht späne späte späti spüle spült spüre spürt staat stabe stabs "
        + "stach stadt stage stahl stall stamm stand stank stanz stapf starb stare stark starr stars start "
        + "stasi statt staub staue staun staus staut steak steck stege stegs stehe steht steif steig steil "
        + "stein stell stemm steno stepp steps stern stete stets stich stick stieb stieg stiel stier stift "
        + "stiko stile still stils stimm stink stipp stirb stirn stobt stock stoff stolz stopf stopp stops "
        + "store story stoss straf streb streu strip stroh strom ström stube stuck stufe stuft stuhl stumm "
        + "stunk stunt sture sturm sturz stuss stute stutz style stylt stäbe stähl stärk stäub stöbe stöhn "
        + "störe stört stück stülp stürm stürz stütz suche sucht sudle suffs suhle suhlt suite summe sumpf "
        + "super suppe surre surrt sushi swaps swing syncs syrer szene säbel säble säcke säend säens säest "
        + "säfte sägen säget sägst sägte sähen sähet sähst sähte sälen sänge sänke sänne särge sässe säten "
        + "sätet sätze säuen säuft säule säume säumt säure söffe sögen söget söhne söhnt sötte süden südes "
        + "sühne sühnt sülze sülzt sünde süsse süsst tabak tabus tacho tacos tadel tadle tafel taffe tagen "
        + "tages taget tagge taggt tagst tagte taiji takes takle takte takts taler tales talge talgs talib "
        + "talje talks tanga tango tanke tanks tankt tanne tante tanze tanzt tapas tapen taper tapes tapet "
        + "tapir tappe tappt tapre tapse tapst tapte taren targi tarif tarne tarnt taser tasks tasse taste "
        + "taten tatet tatst tatze taube tauch tauen taues tauet taufe tauft tauge taugt taust taute taxen "
        + "taxis teams teddy teeei teens teeny teere teers teert teich teige teigs teile teils teilt telko "
        + "tempi tempo tenor terne terra tesla teste tests teuer teure texte texts theke thema theme these "
        + "thron ticke ticks tickt tiefe tiefs tiere tiers tiger tilde tilge tilgt timen timer times timet "
        + "timst timte tinte tippe tipps tippt tisch titel toast tobak toben tobet tobst tobte toden todes "
        + "token tolle tollt toner tones tonne tonus tools topfe topfs topft topoi topos toppe toppt toren "
        + "tores torsi torso torte tosen toset toste total totem toten toter totes totos touch tough toure "
        + "touri tourt tower trabe trabs trabt trace track trade trafo traft trage tragt trakt tramp trams "
        + "trank trapp traps trash traue traum traut treck treff treib trend trenn trete treue trick trieb "
        + "trief triez triff trimm trine trink trios trips trist tritt troff troge trogs trogt troll tropf "
        + "trost trott trotz truck trugs trugt truhe trume trumm trums trunk trupp träfe träft träge trägt "
        + "träne tränt träte träuf träum tröge trübe trübt trüge trügt tuben tuche tuchs tuend tuest tulpe "
        + "tumor tunen tuner tunet tunke tunkt tunst tunte tupfe tupft turme turms turne turnt tusch tussi "
        + "tuten tutet tutor tutus tweet twist typen typus täfle täler tänze täten täter tätet tätig tölte "
        + "tölts tönen tönet tönst tönte töpfe törin törne törns törnt töten tötet tülle tülls tünch türen "
        + "türke türkt türme türmt tüten tütet udssr ufere ufern ufers ufert uhren ulcus ulken ulket ulkig "
        + "ulkst ulkte ulkus ulmen ulmer umarm umbau umbog umgab umgib umkam umlud umsah umweg umzog umzug "
        + "unfug ungut union units unken unket unkst unkte unmut unrat unser unsre untat unten unter untot "
        + "unzen uralt urans urban urige urine urins urnen uroma uropa urtyp usern users vagem vagen vager "
        + "vages vakua value vamps vasen vater vatis vegan verbs verse vertu verüb vespa vetos video viech "
        + "viehs viele viert villa vinyl viral viren virus visen visit visum vitae vital viten vizes vlies "
        + "vogel volke volks volle volvo vorab voran vorig vorne voten votet votum vulva vwler väter vögel "
        + "vögle waage waben wache wachs wacht waden waffe wagen waget wagon wagst wagte wahne wahns wahre "
        + "wahrt waise walde walds walen wales walke walks walkt walle wallt walte walze walzt wange wanke "
        + "wankt wanne wanze warbt waren warft warme warne warnt warst warte warts warum warze wasch waten "
        + "watet watte watts weben webet webst webte wecke wecks weckt weder wedle wegen weges wegtu wehen "
        + "wehes wehet wehre wehrs wehrt wehst wehte wehtu weibe weich weide weihe weiht weile weilt weine "
        + "weins weint weise weiss weist weite welke welkt welle wellt welpe wende wenig werbe werbt werde "
        + "werfe werft werke werks werkt werte werts wesen weser wespe wessi weste wests wette wetze wetzt "
        + "wiche wichs wicht wider widme wiege wiegt wiese wieso wiest wifis wikis wilde wilds wille winde "
        + "winds winke winks winkt wippe wippt wirbt wirft wirke wirkt wirre wirst wirte wirts wisch wisse "
        + "wisst witwe witze wlans wobei woben wobst woche wodka wofür wogen wogst woher wohin wohle wohls "
        + "wohne wohnt wolfe wolfs wolft wolke wolle wollt womit wonne woran worin worte worts worum wovon "
        + "wovor wrack wrang wraps wring wuchs wucht wulst wunde wurde wurfe wurfs wurme wurms wurmt wurst "
        + "wusch wusle wägen wäget wägst wähle wählt wähne wähnt währe währt wälze wälzt wände wärbe wären "
        + "wäret wärfe wärme wärmt wärst wöben wöbet wögen wöget wölbe wölbt wölfe wühle wühlt würde würfe "
        + "würge würgt würze würzt wüste wüten wütet xetra yacht yetis yogas yucca yufka zagen zaget zagst "
        + "zagte zahle zahlt zahme zahne zahns zahnt zange zanke zanks zankt zapfe zapft zappe zappt zaren "
        + "zarge zarin zarte zaune zauns zause zaust zebra zeche zecht zecke zehen zehes zehre zehrt zeige "
        + "zeigt zeile zelle zelte zelts zenit zerre zerrt zeuge zeugs zeugt zicke zickt ziege ziehe zieht "
        + "ziele ziels zielt zieme ziemt ziere ziert zimte zimts zinke zinks zinkt zinne zinns zinse zinst "
        + "zippe zippo zippt zirka zisch zitat zivil zivis zobel zocke zockt zofen zoffs zogen zogst zolle "
        + "zolls zollt zonen zoome zooms zoomt zopfe zopfs zorns zucht zucke zuckt zudem zugab zuges zukam "
        + "zulud zumal zunft zunge zupfe zupft zurre zurrt zuruf zurät zusah zutat zutun zuvor zuzog zwang "
        + "zweck zweig zweit zwerg zwick zwing zwirn zwist zwäng zwölf zyste zähem zähen zäher zähes zähle "
        + "zählt zähme zähmt zähne zäume zäumt zäune zäunt zögen zöget zölle zöpfe zügel zügen zügig zügle "
        + "zünde zürne zürnt äbten ächte ächze ächzt äcker ädere ädern ädert ädils ädrig äffen äffet äffin "
        + "äffst äffte ägide ähnle ähren älter ämter änder äpfel ärger ärmel ärmer ärzte äsern ässen ässet "
        + "ästen ästet äther ätsch ätzen ätzet ätzte äxten ödeme ödems ödend ödens ödest ödete öffis öffne "
        + "öfter ölend ölens ölest ölige ölten öltet ölung übeln übels übend übens übers übest üblem üblen "
        + "übler übles übrig übten übtet übung üppig"
));

if (typeof module !== "undefined" && module.exports) {
    module.exports = WOERTER_RATE_DE;
}
