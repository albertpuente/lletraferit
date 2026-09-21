/**
 * A short catalog of full example poems, offered from the Estructures panel
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
]
