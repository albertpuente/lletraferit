/**
 * A short catalog of full example poems, offered from the Examples popup
 * as a quick way to load real, previously-verified text into the editor
 * (rather than an empty document) — useful for exploring how the
 * syllable/rhyme engine analyzes an actual poem.
 */

export interface ExamplePoem {
  id: string
  title: string
  attribution: string
  content: string
}

export const EXAMPLE_POEMS: ExamplePoem[] = [
  {
    id: 'un-sonet-per-a-tu',
    title: 'Un sonet per a tu',
    attribution: 'Miquel Martí i Pol',
    content: `Un sonet per a tu que em fas més clar
tant el dolor fecund com l'alegria,
un sonet amb els mots de cada dia,
amb els mots de conèixer i estimar.

Discretament l'escric, i vull pensar
que el rebràs amb discreta melangia,
com si es tractés d'alguna melodia
que sempre és agradable recordar.

Un sonet per a tu, només això,
però amb aquell toc lleu de fantasia
que fa que els versos siguin de debò.

Un sonet per a tu que m'ha permès
de dir-te clarament el que volia:
més enllà de tenir-te no hi ha res.`,
  },
  {
    id: 'lemigrant',
    title: 'L’emigrant',
    attribution: 'Jacint Verdaguer',
    content: `Dolça Catalunya,
pàtria del meu cor,
quan de tu s'allunya
d'enyorança es mor.

Hermosa vall, bressol de ma infantesa,
blanc Pirineu,
marges i rius, ermita al cel suspesa,
per sempre adéu!
Arpes del bosc, pinsans i caderneres,
cantau, cantau,
jo dic plorant a boscos i riberes:
adéu-siau!

¿On trobaré tos sanitosos climes,
ton cel daurat?
Mes ai, mes ai! ¿on trobaré tes cimes,
bell Montserrat?
Enlloc veuré, ciutat de Barcelona,
ta hermosa Seu,
ni eixos turons, joiells de la corona
que et posà Déu.

Adéu, germans: adéu-siau, mon pare,
no us veuré més!
Oh! si al fossar on jau ma dolça mare,
jo el llit tingués!
Oh mariners, lo vent que me'n desterra
que em fa sofrir!
Estic malalt, mes ai! tornau-me a terra,
que hi vull morir!`,
  },
  {
    id: 'sonet13',
    title: 'Sonet número 13',
    attribution: 'Mercè Rodoreda',
    content: `Boques de rosa i vori on dues serps lascives
continuen eternes el dolç combat d'amor,
castament devoreu les vostres flors, salives
més pàl·lides que els astres. Aquest diví licor,

fresc com la mel antiga, beveu, tristos amants,
adorables cadàvers que un sol desig confina.
Déu us pasta de fang i refeu amb les mans
de vostres flancs reials la corba que s'afina.

Retuts per la fatiga dormiu junts en la pau;
la rosada que irisa un cel amarg i blau
desfà les seves perles en la claror daurada.

Pròdigs de somnis verges no us desvetlleu mai més,
la dea de l'oblit, damunt vostre vinclada,
gelosament us sotja i us pren el darrer bes.`,
  },
  {
    id: 'exemples-peus-metrics',
    title: 'Exemples de peus mètrics',
    attribution: 'Iambe, troqueu, dàctil, amfíbrac i anapest',
    content: `De dins el pit covard els mots com un estol

És quan dormo que hi veig clar

L’illa de l’últim adéu on es va inclinà el meu migdia

S’agita la pompa llanguent d’una immensa cortina

Va passant entremig de sa gent adormida`,
  },
]
