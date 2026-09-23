/**
 * Sinalefa (vowel fusion across word boundaries) detection.
 */

const VOWELS = 'aeiouàèéíòóúïü'
const DIAERESIS_VOWELS = 'ïü'

function isVowelChar(ch: string | undefined): boolean {
  return !!ch && VOWELS.includes(ch)
}

/** Returns the word with a silent leading "h" stripped, if present. */
function stripLeadingH(word: string): string {
  return word[0] === 'h' ? word.slice(1) : word
}

/** A word-final unaccented i/u following a vowel is the semivowel in a
 * falling diphthong (e.g. adéu, esglai, riu), not a vowel nucleus available
 * for sinalefa. The silent u in final qui/gui is excluded: its following i
 * is a full vowel (qui, gui), rather than a semivowel. */
function endsInFallingDiphthongSemivowel(word: string): boolean {
  const last = word.at(-1)
  const previous = word.at(-2)
  if ((last !== 'i' && last !== 'u') || !isVowelChar(previous)) return false

  const silentUBeforeFinalI =
    last === 'i' &&
    previous === 'u' &&
    (word.at(-3) === 'q' || word.at(-3) === 'g')
  return !silentUBeforeFinalI
}

/**
 * Determines whether sinalefa occurs at the boundary between `wordA` (ends
 * this boundary) and `wordB` (starts this boundary): true when wordA ends in
 * a vowel sound and wordB starts in a vowel sound, unless wordB starts with a
 * diaeresis vowel (ï/ü), which the user can use to explicitly force a hiatus
 * and block the fusion.
 */
export function hasSinalefa(wordA: string, wordB: string): boolean {
  const a = wordA.toLowerCase()
  const b = stripLeadingH(wordB.toLowerCase())
  if (a.length === 0 || b.length === 0) return false

  const lastA = a[a.length - 1]
  const firstB = b[0]

  if (!isVowelChar(lastA) || !isVowelChar(firstB)) return false
  if (endsInFallingDiphthongSemivowel(a)) return false
  if (DIAERESIS_VOWELS.includes(firstB)) return false

  return true
}
