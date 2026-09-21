/**
 * Human-readable Catalan labels for verse lengths and stanza rhyme
 * patterns, derived from the traditional names used in Catalan metrics
 * (mètrica catalana): art menor (<= 8 syllables) vs art major (> 8), and
 * conventional rhyme-scheme shapes (encadenada, creuada, caudada, etc.).
 */

const MENOR_NAMES: Record<number, string> = {
  0: '',
  1: 'Monosíl·lab',
  2: 'Bisíl·lab',
  3: 'Trisíl·lab',
  4: 'Tetrasíl·lab',
  5: 'Pentasíl·lab',
  6: 'Hexasíl·lab',
  7: 'Heptasíl·lab',
  8: 'Octosíl·lab',
}

const MAJOR_NAMES: Record<number, string> = {
  9: 'Enneasíl·lab',
  10: 'Decasíl·lab',
  11: 'Hendecasíl·lab',
  12: 'Dodecasíl·lab (alexandrí)',
  13: 'Tredecasíl·lab',
  16: 'Hexadecasíl·lab (octonari)',
}

/** Returns the traditional Catalan name for a verse of `syllableCount` syllables. */
export function verseTypeName(syllableCount: number): string {
  if (syllableCount <= 0) return ''
  if (syllableCount in MENOR_NAMES) return MENOR_NAMES[syllableCount]
  if (syllableCount in MAJOR_NAMES) return MAJOR_NAMES[syllableCount]
  return `Vers de ${syllableCount} síl·labes`
}

/**
 * Classifies the shape of a stanza's rhyme scheme from the (possibly null,
 * for unrhymed/empty lines) group indices assigned to each verse, returning
 * a conventional Catalan pattern name.
 */
export function classifyRhymePattern(groupIndices: (number | null)[]): string {
  const meaningful = groupIndices.filter((g) => g !== null)
  if (groupIndices.length === 0) return ''
  if (meaningful.length === 0) return 'versos blancs'

  // Build a normalized shape signature: sequential letters by first appearance,
  // '-' for unrhymed/empty lines.
  const letterByGroup = new Map<number, string>()
  const shape = groupIndices.map((g) => {
    if (g === null) return '-'
    if (!letterByGroup.has(g)) letterByGroup.set(g, String.fromCharCode(65 + letterByGroup.size))
    return letterByGroup.get(g)!
  })
  const signature = shape.join('')

  if (groupIndices.length === 2 && signature === 'AA') return 'apariat'
  if (groupIndices.length >= 3 && meaningful.length === groupIndices.length && letterByGroup.size === 1) {
    return 'monorima'
  }
  if (groupIndices.length === 3 && signature === 'ABA') return 'tercet encadenat'
  if (groupIndices.length === 4 && signature === 'ABAB') return 'encadenada'
  if (groupIndices.length === 4 && signature === 'ABBA') return 'creuada'
  if (groupIndices.length === 4 && signature === 'AABB') return 'caudada'
  if (letterByGroup.size === meaningful.length) return 'lliure'
  return 'irregular'
}
