/**
 * Reference catalog of classic Catalan (and a couple of universally known)
 * poetic structures, used purely as a composition aid: shown to the user as
 * suggestions of verse lengths and rhyme-scheme shapes, not inserted as
 * literal text (a poem's actual words can't be templated).
 *
 * Rhyme labels follow the same convention as `computeRhymeScheme`: a letter
 * per rhyme group in order of first appearance, uppercase for art major
 * (>8 syllables) and lowercase for art menor, `null` for an unrhymed verse.
 */

export interface StructureVerse {
  syllables: number
  rhyme: string | null
}

export interface StructureStanza {
  verses: StructureVerse[]
}

export interface PoemStructure {
  id: string
  name: string
  description: string
  stanzas: StructureStanza[]
}

function verses(...spec: [number, string | null][]): StructureVerse[] {
  return spec.map(([syllables, rhyme]) => ({ syllables, rhyme }))
}

export const POEM_STRUCTURES: PoemStructure[] = [
  {
    id: 'sonet',
    name: 'Sonet',
    description:
      'Catorze versos decasíl·labs en dos quartets de rima creuada seguits de dos tercets. Forma clàssica per excel·lència.',
    stanzas: [
      { verses: verses([10, 'A'], [10, 'B'], [10, 'B'], [10, 'A']) },
      { verses: verses([10, 'A'], [10, 'B'], [10, 'B'], [10, 'A']) },
      { verses: verses([10, 'C'], [10, 'D'], [10, 'C']) },
      { verses: verses([10, 'D'], [10, 'C'], [10, 'D']) },
    ],
  },
  {
    id: 'quartet-creuat',
    name: 'Quartet de rima creuada',
    description: 'Quatre versos decasíl·labs amb rima ABBA (creuada): el primer rima amb el quart, el segon amb el tercer.',
    stanzas: [{ verses: verses([10, 'A'], [10, 'B'], [10, 'B'], [10, 'A']) }],
  },
  {
    id: 'quartet-encadenat',
    name: 'Quartet de rima encadenada',
    description: 'Quatre versos amb rima ABAB (encadenada): els parells rimen entre ells i els senars entre ells.',
    stanzas: [{ verses: verses([8, 'a'], [8, 'b'], [8, 'a'], [8, 'b']) }],
  },
  {
    id: 'quartet-caudat',
    name: 'Quartet de rima aparellada',
    description: 'Quatre versos amb rima AABB (caudada): parelles de versos consecutius que rimen entre si.',
    stanzas: [{ verses: verses([8, 'a'], [8, 'a'], [8, 'b'], [8, 'b']) }],
  },
  {
    id: 'tercet-encadenat',
    name: 'Tercet encadenat',
    description: 'Tres versos amb esquema ABA; encadenant diversos tercets (ABA BCB CDC…) es forma una cadena, com als tercets de Dant.',
    stanzas: [{ verses: verses([11, 'A'], [11, 'B'], [11, 'A']) }],
  },
  {
    id: 'romanc',
    name: 'Romanç',
    description:
      'Sèrie (sense límit fixe de versos) d\'octosíl·labs amb rima assonant només als versos parells; els senars queden lliures. Forma tradicional de la narrativa popular.',
    stanzas: [{ verses: verses([8, null], [8, 'a'], [8, null], [8, 'a'], [8, null], [8, 'a']) }],
  },
  {
    id: 'cobla-popular',
    name: 'Cobla popular (corranda)',
    description: 'Quatre versos heptasíl·labs, rimant només el segon i el quart; molt habitual en cançó i poesia popular breu.',
    stanzas: [{ verses: verses([7, null], [7, 'a'], [7, null], [7, 'a']) }],
  },
  {
    id: 'decasillab-blanc',
    name: 'Decasíl·labs blancs',
    description: 'Versos decasíl·labs sense rima (versos blancs): la mètrica es manté, però es prescindeix de la rima.',
    stanzas: [{ verses: verses([10, null], [10, null], [10, null], [10, null]) }],
  },
  {
    id: 'haiku',
    name: 'Haikú',
    description:
      "Forma d'origen japonès, adoptada també en poesia catalana: tres versos de 5, 7 i 5 síl·labes, sense rima, que capturen un instant o una imatge.",
    stanzas: [{ verses: verses([5, null], [7, null], [5, null]) }],
  },
]
