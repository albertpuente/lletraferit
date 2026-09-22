/** Proper nouns that must always be treated as correctly spelled, regardless
 * of which bundled Catalan dictionary variant is active. */
const ALWAYS_KNOWN_WORDS = new Set(['catalunya', 'pirineu', 'montserrat', 'barcelona'])

export function isAlwaysKnownWord(word: string): boolean {
  return ALWAYS_KNOWN_WORDS.has(word.toLocaleLowerCase('ca'))
}