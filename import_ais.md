# Import dát do AIS

Dobry den este raz dohladal som zvysne udaje k tomu importu.

import rozvrhov z csv súboru do AIS bol doplnený o možnosť importovať k
rozvrhovým akciám hneď aj vyučujúcich, prípadne aj s ich podielmi výuky. Je to
nová položka zaradená vo vete medzi položk KAPACITA a POZNAMKA. Popis je aj v v
AIS v Popise štruktúry vstupného súboru.

```
TYP_VETY;PREDMET;MISTNOST;DEN;ZACATEK;KONEC;TYP_AKCE;CETNOST;KAPACITA;UCITELE;POZNAMKA;POZNAMKA_CELA_AKCE;ROCNIK;PROGRAM;ZAMERENI;SKUPINA;SLUCKA
```

UCITELE: _ Učitel (učitelé) dané rozvrhové jednotky. _ Vyplňuje se UIS ID
uživatele - učitele. _ Lze vyplnit i více učitelů - odděleno čárkou. _ Při
nestejném podílu více učitelů lze vyplnit ve formátu
IDucitele1-podil1,IDucitele2-podil2,IDucitele3-podil3,... \* Podíl se uvádí v
celých procentech. Součet podílů všech učitelů na jednom řádku musí dát 100%,
jinak je údaj o podílu ignorován.

Príklad:

```
"3";"61920_6B";"51 01 001";"21.3.2007";"9";"11";"1";"";"20";"8857-30,12384-70";"";"";"";"";"";"";""
```

9.Dec 2021 13:11:11 chcem Vás informovať, že sa upravila štruktúra súboru csv
pre import rozvrhov do AIS - pribudla možnosť importu Poznámky, aktuálne je:

```
typ_vety;predmet;mistnost;den;zacatek;konec;typ_akce;cetnost;kapacita;POZNAMKA;POZNAMKA_CELA_AKCE;rocnik;program;zamereni;skupina;slucka;seznam_studentu
```

Viete, že pole Poznámka existuje na úrovni celej rozvrhovej akcie, ale rovnako
aj na úrovni periodického predpisu/konania v rámci rozvrhovej akcie. Import bude
fungovať nasledovne: POZNAMKA_CELA_AKCE .. zoberie sa LEN údaj z prvého riadku
danej rozvrhovej akcie (ak by sa cez SLUCKU importovalo do jednej RA viac per.
predpisov/konaní), ktorá sa importuje a ten sa vloží len do vytvorenej
rozvrhovej akcie. Všetky periodické predpisy a konania v rámci tejto RA budú bez
Poznámky.

POZNAMKA - sa vloží len k danému importovanému elementu (per. predpis/konanie).
Poznámku v príslušnej RA to neovplyvní.

Periodický predpis sa tiež v konečnom dôsledku rozbije na jednotlivé konania,
ktoré tiež majú položku Poznámka, tieto sa importom nikdy nenaplnia. Súbory vo
formáte bez položiek poznámok už teraz nie je možné v AIS spracovať, môžu byť
ale samozrejme prázdne (tak ako iné povinné elementy).

29.Jan 2020 14:08:00 chcem Vás informovať o úprave štruktúry csv súboru pre
import rozvrhov do AIS, ak túto cestu využívate. Išlo o doplnenie možnosti
importovať "spárované" predpisy do jednej rozvrhovej akcie (tak ako sa takéto
predpisy/konania teraz v nových rozvrhov v AIS evidujú).

Doteraz bols veta v csv

```
TYP_VETY;PREDMET;MISTNOST;DEN;ZACATEK;KONEC;TYP_AKCE;CETNOST;KAPACITA;ROCNIK;PROGRAM;ZAMERENI;SKUPINA
```

Na koniec (za SKUPINA) sa teda pridal paramater "SLUCKA" (niečo podobné ako
Slučka v hárkoch priebežného hodnotenia), ktorý pre ten istý predmet+slučka
znamená tú istú RA s viac predpismi/konaniami.

Na konci sa ešte dajú vymenovať ID študentov, ktorí sa majú pri importe na akciu
hneď priradiť, to ostalo zachované. Presný popis nového parametra SLUCKA nájdete
v popise csv v AIS, v rozvrhoch v časti Import.

Dobry den posielam Vam subor, kde su vysvetlene jednotlive udaje od vyvojarov,
ktore sa daju importovat do AIS. David pouziva program ktory musim konvertovat,
tu ak by ste primo vytvarali textovy subor so strukturou ktoru AIS pozna, bolo
by to super. Ale aby to nebolo na uvod take jednoduche :o), medzicasom sa ten
import rozsiril, tu Vam napisem ako to vyzera v sucasnosti, ale popis tych
povodnych casti je stale rovnaky. Ostatne veci si mozme prejst casom, zrejme
osobne stretko by bolo fajn kedze je toto v nasich rozvrhoch dost co sa pomenilo
a nejaky sumar nemam, po castiach by som to vedel poslat, no nechcem Vas hned
takto z kraja znechutit. prajem pekny den Kolarik

```
(0)TYP_VETY;(1)KOD_PREDMETU;(2)MIESTNOST;(3)DEN;(4)ZACIATOK;(5)KONIEC;(6)TYP_AKCIE;(7)CETNOST;(8)KAPACITA;(9)UCITELIA;(10)POZNAMKA;(11)POZNAMKA_CELA_AKCE;(12)ROCNIK;(13)PROGRAM;(14)ZAMERANIE;(15)SKUPINA;(16)SLUCKA
```

# Rozvrh struktura

Navrh formatu pro import rozvrhu

Pouzil bych jednoduchy CSV soubor, jehoz strukturu popisuji dale. Jednotlive
hodnoty budou ohraniceny ve dvojitych uvozovkach a oddeleny strednikem.

U kazde polozky budu uvadet, zda je povinna, pripadne jaka bude standardni
hodnota, pokud polozka vyplnena nebude. Pokud bude polozka nevyplnena, musi byt
uvedena jako prazdny retezec, aby zustal zachovan format vety.

V AIS je rozvrh definovan pro kombinaci obdobi - forma studia. (Uz tohle mozna
pro vas muze byt problem). Soubor se bude skladat z vet (co veta, to radek),
pricemz veta popisuje jednu rozvrhovou akci. Vyjimkou je veta typu "hlavicka",
ktera obsahuje udaje k celemu rozvrhu.

---

## Struktura souboru

Hlavicka:

TYP_VETY;FAKULTA;OBDOBI;FORMA;NAZEV_ROZVRHU;ZACATEK;KONEC

pricemz jednotlive polozky znamenaji:

TYP_VETY: identifikace typu udaje v radku 1 - hlavicka 2 - periodicka akce 3 -
blokova akce priklad: pro hlavicku vzdy 1

FAKULTA: zkratka fakulty podle AIS priklad: MtF

OBDOBI: nazev obdobi podle AIS priklad: LS 2006/2007

FORMA: forma studia podle AIS 1 - presencni 2 - kombinovana

NAZEV_ROZVRHU - nazev rozvrhu priklad: Rozvrh prezenční formy

ZACATEK: zacatek platnosti rozvrhu - datum format data bude jednotny pro vsechny
polozky, ktere budou typu datum, a to DD.MM.YYYY (mezery za teckami mohou a
nemusi byt, je to jedno) pr.: 4.2.2007

KONEC: konec platnosti rozvrhu - datum pr.: 30.6.2007

Vsechny polozky hlavicky jsou povinne.

Priklad hlavicky: "1";"MtF";"LS 2006/2007";"1";"Rozvrh prezenční
formy";"4.2.2007";"30.6.2007";

---

Veta s rozvrhovou akci

Pro blokove i periodicke akce je format vety stejny, lisi jen v povinosti
polozek a obsahu polozky DEN.

TYP_VETY;PREDMET;MISTNOST;DEN;ZACATEK;KONEC;TYP_AKCE;CETNOST;KAPACITA;ROCNIK;PROGRAM;ZAMERENI;SKUPINA

TYP_VETY: viz hlavicka, hodnoty: 2 nebo 3 povinna polozka

PREDMET: kod predmetu podle AIS pr.: 61920_6B povinna polozka

MISTNOST: identifikace mistnosti tady si nejsem zcela jisty, jakou hodnotu
zvolit nabizi se dve moznosti z AIS: oznaceni - pak by asi ale byla nutna
kombinace areal-budova-oznaceni pasp. kod - ten je myslim jedinecny otazka je,
co by vam vice vyhovovalo

povinna polozka

DEN: peridodicke akce - cislo dne v tydnu (1 - pondeli .. 7 - nedele) pr.: 3

blokova akce - datum pr.: 21.3.2007 povinna polozka

ZACATEK: hodina zacatku akce - cele cislo pokud je mi znamo, rozsahy vyuky byly
stanoveny na zacatky v celou, delka 50 minut, 10 minut prestavka - z toho
vychazim

pr.: 9 povinna polozka

KONEC: konec akce - cele cislo, v AIS se uvadi jako cela hodina (tzn. delka
akce+prestavky) za predpokladu, ze hodina konci 10:50, uvede se 11 pokud by to
byl problem, lze se domluvit

pr.: 11 povinna polozka

TYP_AKCE: typ rozvrhove akce, prozatim bych navrhl hodnoty: 1 - prednaska 2 -
cviceni

pokud uz nekdo primo ve vystupech rozlisuje nejake presnejsi cleneni
(laboratore, ...) muzeme se domluvit na dalsich hodnotach povinna polozka

CETNOST: cetnost periodicke akce 1 - kazdy tyden 2 - lichy tyden 3 - sudy tyden

lichost a sudost se bere podle iso normy u blokove akce nehraje roli, muze byt
nevyplnena nepovinna polozka, pokud bude nevyplnena u periodicke akce, pouzije
se hodnota 1 - kazdy tyden

KAPACITA: maximalni pocet studentu na rozvrhove akci nepovinna polozka, v
pripade nezadani se pouzije kapacita mistnosti je ale treba si uvedomit, ze
kapacita ovlivnuje treba volbu cviceni pr.: 20

Nasleduji polozky pro omezeni rozvrhove akce jen na urcitou mnozinu studentu.
Polozky jsou nepovinne. Pokud by nekdo potreboval evidovat vice kombinaci k
jedne rozvrhove akci (coz AIS umoznuje), domluvili bychom dalsi podrobnosti. Ted
to zatim nebudu komplikovat.

ROCNIK: omezeni na rocnik studentu, cele cislo pr.: 1

PROGRAM: omezeni na studenty konkretniho programu zkratka studijniho programu
podle AIS vcetne typu studia pr.: B-PSA

ZAMERENI: omezeni na studenty konkretniho zamereni zkratka studijniho zamereni
podle AIS vcetne typu studia a programu pr.; I-oTSV-OB

SKUPINA: cislo studijni skupiny pr.: 62

priklad periodicke akce

TYP_VETY;PREDMET;MISTNOST;DEN;ZACATEK;KONEC;TYP_AKCE;CETNOST;KAPACITA;ROCNIK;PROGRAM;ZAMERENI;SKUPINA
"2";"61920_6B";"51 01 001";"3";"9";"11";"2";"1";"20";"1";"B-PSA";"";"62"

priklad blokove akce

TYP_VETY;PREDMET;MISTNOST;DEN;ZACATEK;KONEC;TYP_AKCE;CETNOST;KAPACITA;ROCNIK;PROGRAM;ZAMERENI;SKUPINA
"3";"61920_6B";"51 01 001";"21.3.2007";"9";"11";"1";"1";"";"";"";"";""

---

Soubor s rozvrhem by pak mel strukturu:

veta s hlavickou veta s per. akci veta s per. akci . . .
