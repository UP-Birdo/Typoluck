/*
 * woerter-rate-de-4.js — die Rate-Liste mit 4 Buchstaben (seit 0.23.4),
 * 1967 Wörter. Wird erst geladen, wenn eine Runde dieser Länge startet
 * (js/woerter-rate-de.js `laden`); nie Lösung.
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

(function (ziel) {
    ziel.eintragen(4, (
        "aale aals aalt aare aars aase aast abcs aber abis abms abos abri abte abts abtu abäs aces acht "
        + "acid acre acta acts adam adel ader ades adle affe agam agfa agil agio agon ahle ahme ahms ahmt "
        + "ahne ahns ahnt ahoi aide aids ainu airs akku akne akte akts akut akws alba alge alle alls alpe "
        + "also alte alts alus amen amis amme amte amts anis anno antu aper apis apps area arge arie arme "
        + "arms army arte arzt asse asst asta aste asts asyl atem atme atom atüs auch audi auen aufs auge "
        + "aula aura auto avis baby bach back bade bads bags bahn bahr bake bald balg ball balm balz bams "
        + "band bang bank bann bare barg barr bars bart base bass baue baum baus baut bazi beam beat beau "
        + "bebe bebt beef beet beil beim bein beiz bell berg beta bete bett beug beul bieg bier biet bike "
        + "bikt bild bims bind birg biss bist blas blau blei bleu blog blut bläh bläu blöd blök blüh bmws "
        + "bobs bock bogt bohr boje bolz bomb bond boni boom boot bord borg boss bote bots bowl boxe boxt "
        + "boys brat brau brav brei bros brot brut brät brüh bube bubs buch bude buge bugs buhe buhl buht "
        + "bukt bumm bums bund bunt burg byes byte bäte bäum böen böge böig bölk böse böte büke bükt bürg "
        + "büro büss büxe büxt call camp capa caps cars case cash cast cent ceos chat chef chic chip chor "
        + "city clan clip clon clou club coca coda code coke cola cool cops copy cord core coup cpus crem "
        + "crew crms crux cups cyan dach dads dame damm dang dank dann darb darf darm dass date daus dazu "
        + "deal deck dehn dein deko dell demo denk denn deos depp derb deut dias dich dick dieb dien dies "
        + "ding dino dipp dips dirn diss diva diät doch dock docs dojo doku doll dome doms dons doof dope "
        + "dopt dorf dorn dort dose dost dran dreh drei drin drob droh dual duck duft duke duma dumm dump "
        + "duos dutt duze duzt dämm däne dörr döse döst düne düng dünn dürr düse düst ebbe ebbt eben eber "
        + "ebit ebne echo echt ecke ecks edel edle egal egel egge eggt egos ehen eher ehre ehrt eich eide "
        + "eids eier eies eile eilt eine eins eint eise eist ekel ekgs ekle elbe elch elfe elle emos ende "
        + "enge engt ente epik erbe erbt erde erle erst esel espe esse esst etat etui etwa euch euer eule "
        + "eure euro ewig exil exit exot fach fade fahl fahr fair fake fakt fall falz fand fang fans faqs "
        + "farm farn fass fast faul faxe faxt feed feen fees fege fegt fehl feie feig feil fein feit feld "
        + "fell fels feme fern fese fest feta fete fett fetz feze fiat fick fiel fies fifa film filz find "
        + "fing fink firm fite fitz fixe fixt flau fleh flip flog floh flop flor flow flug flur flut fläz "
        + "fock fohl folg fond fons font fopp fora form fort foto foul frag frau frei freu froh fror fräs "
        + "früh fuge fugt fuhr fund funk funs furt furz fuss fäll färb föhn föne föns fönt füge fügt fühl "
        + "führ füll fünf fürs gabe gabt gaff gage gags gala galt game gams gamt gang gans ganz gare garn "
        + "gart gase gast gate gaul gebe gebt geck geek gehe gehr geht geie geig geil geit geiz gelb geld "
        + "gele gels gelt gema gene gens gerb gern gibt gier gift gigs gilt ging gins gips girl giro glas "
        + "glut glüh gmbh gnus goal gold golf gong gort goss gote gott gpus grab grad graf gral gras grau "
        + "grip grob grog gros grub gräm gröl grün guck gurr gurt guss gute guts gäbe gähn gäre gärt gönn "
        + "göre görs güte haar habe habt hack haft hahn haie hais hake hakt halb half hall halm hals halt "
        + "hand hang hark harr hart harz hase hass hast haue haus haut haxe head hebe hebt heck heer hefe "
        + "heft hege hegt hehl heil heim heiz held hell helm hemd hemm henk herb herd herr herz hetz heul "
        + "heus heut hexe hext hier hiev hilf hing hink hirn hiss hits hivs hiwi hobt hoch hock hofe hoff "
        + "hofs hohe hohl hohn hold hole holt holz hone hont hopp hops horn hort hose host hott hube hubs "
        + "hufe hufs huhn hula hund hupe hupt hure hurt hute huts hype hypt hält häme häng häuf höbe höfe "
        + "höhe höhl höre hört hübe hüll hüls hüpf hüte ices ichs icon idee idol igel igle iglu ihre ikon "
        + "imam impf info inka inuk iods ipad ipod iren irin iris irre irrt isst item jagd jage jagt jahr "
        + "jaks jams japs jass jaul jazz jeck jede jeep jene jesu jets jobb jobs jode jods jogg johl jota "
        + "jude judo juhu juli jump jung juni jura jury juso just jute jvas jähe jäte kaff kahl kahn kaki "
        + "kalb kali kalk kalt kamm kamp kamt kann kanu kapp kaps karg karo karr kart kate kats kaue kauf "
        + "kaum kaut keck kehr keif keil keim kein keks kenn kerb kerl kern kess kfzs kick kids kiek kies "
        + "kiez kiff kill kilo kind king kinn kino kipp kita kite kits kitz kiwi klag klan klar klau kleb "
        + "klee klon klos klub klug klär klön knie koch koda kode koge kogs kohl koka koks koma komm koog "
        + "kopf korb kord kork korn kort kost kote kots kotz krad kram kran krud krug krux kräh krön kuck "
        + "kuli kult kurs kurv kurz kuss käme kämm käse käst käue käut köge köms köpf köre körn kört kühe "
        + "kühl kühn küre kürt kürz küss labe labt lach lack lade lady lage lagt lahm laib laie lake lall "
        + "lama lamm land lang lapp lass last laub laue lauf laug laus laut lava laxe lead leak leas lebe "
        + "lebt leck leds leer lege legt lehm lehn lehr leib leid leih leim lein lenk lenz lern lese lest "
        + "lide lids lieb lied lief lieg lieh lies lift liga like likt lila limo link lins lira lire list "
        + "litt live lkws lobe lobs lobt loch lock loft loge logg logo logs logt lohn loks look loop lord "
        + "lose lost lote lots lude luft luge lugt luke lull lump lupe lupf lurk lust lädt läge lähm lärm "
        + "läse löge löhn löse löst löte löwe lüde lüge lügt lütt mach made magd mahl mahn maid maie mail "
        + "mais mala male mals malt malz mama mann mapp mark mars mass mast matt maul maus maut meer mehl "
        + "mehr meid mein meld melk meme memo meng menü merk merz miau mich mied mief mies mild milf milk "
        + "mime mimt mine miss mist mixe mixt mobb mobs mode modi mods mofa mohn mohr mole molk moll mond "
        + "mono moor moos mopp mops mord mors motz move mrna muds muff mund murr muse muss mute muts mvas "
        + "mähe mäht märz möge mögt möwe müde mühe müht müll münz nabe nach nage nagt nahe nahm naht naiv "
        + "naja name napf narr nase nass nato navi nazi nehm neid neig nein nenn neon nepp nerd nerv nest "
        + "nett netz neue neun news nick nies nimm nipp nixe noch none noob nord norm note nova novä null "
        + "nuss nutz nvas nähe nähr näht näss nöle nölt nöte nütz oase oben ober obig oboe obst obus odem "
        + "oden oder oems ofen ohme ohms ohne ohre ohrs okay olle omas omen omis opas opel oper opis opus "
        + "orte orts ossi oste osts otto oute ouzo oxid oxyd ozon paar pace pack pads paff page paks pakt "
        + "papa papp park pars pass pate patt patz pauk paus pdas pdfs pech peil pein pell pelz penn peps "
        + "perl pese pest petz pfad pfau pfui phon pick piep pier pike piks pils pilz pimp ping pinn pins "
        + "piss pkws plag plan plus pneu poch pocs poet pole polo pols polt pony pool popo popp pops pore "
        + "pose post pott prio prob pros präg prüf psst pubs puck puff pule pull pult puma pump punk pupe "
        + "pupp pups pupt pure push pute puts putt putz pvcs quad quak qual quer quiz quäl rabe rade rads "
        + "raff rage ragt rahm ramm rams rand rang rank rann ranz rapp raps rare rase rast rate rats ratz "
        + "raub raue rauf rauh raum raun raus raut rave real rebe rech rede rege regt reha rehe rehs reib "
        + "reif reih reim rein reis reit reiz rene renk renn rens reps rest reue rhos rieb rief riet rill "
        + "rind ring rinn ripp riss ritt ritz robb robe roch rock rode rohe rohr roll roma rosa rose ross "
        + "rost rote rots rotz rtls rufe rufs ruft ruhe ruhm ruhr ruht ruin rums rund rupf rush russ rute "
        + "räch räte räum röte rübe rück rüde rüge rügt rühm rühr saal saat sack safe saft saga sage sagt "
        + "sahn saht salb sale salz same samt sand sang sank sann sarg sass satt satz saue sauf saug saum "
        + "saun saus saut scan schi seen sees sehe sehn sehr seht seid seif seil sein seit sekt send senf "
        + "seng senk sera sets setz sexy shop shot show sich sieb sieg sieh siez siff silo sims sind sing "
        + "sink sinn sirs site sitz skat skie skin skis slip slot slum smog snob soap soda sofa soff soge "
        + "sogs sogt sohl sohn soja soko sold soli soll solo song sonn sore sorg sott soul sozi spam span "
        + "spar spas spat spei spie spin spot spuk spul spur späh spät spül spür stab star stau steg steh "
        + "step stet stgb stil stob stop stuf stur stör such suff suhl sums surr suvs swap sync säen säet "
        + "säge sägt sähe säht säle säst säte säue säum söge söhn süde süds sühn sülz süss tabs tabu taco "
        + "taff tage tagg tags tagt take takt tale talg talk tals tank tanz tapa tape tapp taps tapt tara "
        + "tarn task taub taue tauf taug taus taut taxe taxi team teds teen teer tees teig teil test text "
        + "tick tief tier tilg time timt tipp tips tobe tobt tode tods toll tone tons tool topf topp tops "
        + "tore tors tose tost tote toto tour toys trab traf trag tram trat trau treu trio trip trog trug "
        + "trum trän trüb trüg tuba tube tuch tuen tuet tune tunk tuns tunt tupf turm turn tust tute tutu "
        + "twix type typs täte tölt töne tönt törn töte tüll türe türk türm tüte tüvs ufer ufos uhus ulke "
        + "ulkt ulme umso unis unit unke unkt unze uran urdu urig urin urls urne user usps usus vage vamp "
        + "vans vase vati verb vers veto vieh viel vier visa vita vize volk voll volt vorn vota vote vpns "
        + "waas wabe wach wade wage wagt wahl wahn wahr wald wale walk wall wals walz wand wank wann warb "
        + "ware warf warm warn wart wate watt webe webs webt weck wege wegs wehe wehr wehs weht weib weih "
        + "weil wein weis weit welk well welt wend wenn werd werf werk wert west wetz wich wieg wies wifi "
        + "wiki wild will wind wink wipp wirb wird wirf wirk wirr wirt wiss witz woah wobt woge wogt wohl "
        + "wohn woks wolf wort wozu wrap wund wurf wurm wwws wäge wägt wähl wähn währ wälz wäre wärm wärt "
        + "wöbe wöge wölb wühl würd würg würz wüst wüte xmas yaks yeah yeti yoga zage zagt zahl zahm zahn "
        + "zank zapf zapp zart zaun zaus zech zehe zehn zehr zehs zeig zeit zelt zerr zeug zick zieh ziel "
        + "ziem zier zimt zink zinn zins zipp zivi zock zofe zoff zogt zoll zone zoom zoos zopf zorn zuck "
        + "zuge zugs zupf zurr zwar zwei zähe zähl zähm zäum zäun zöge züge zürn äbte ächz ädil äffe äfft "
        + "ähre äser ässe äste ätze ätzt äxte ödem öden öder ödes ödet öfen öffi ökos ölen öles ölet ölig "
        + "ölst ölte ösen übel üben über übet üble übst übte"
    ));
})((typeof WOERTER_RATE_DE !== "undefined") ? WOERTER_RATE_DE : require("./woerter-rate-de.js"));
