/**
 * Heuristic grapheme-based phonetic normalization, used to compare verse
 * endings for rhyme matching. This is not a full IPA transcription, just
 * enough normalization to make orthographic variants that sound alike
 * compare as equal (e.g. accent marks, geminate consonants, qu/gu + e/i).
 */

import type { CatalanVariant } from './types'

export function normalizePhoneticTail(tail: string, variant: CatalanVariant = 'central'): string {
  let r = tail.toLowerCase()
  r = r.replace(/[à]/g, 'a')
  r = r.replace(/[èé]/g, 'e')
  r = r.replace(/[í]/g, 'i')
  r = r.replace(/[òó]/g, 'o')
  r = r.replace(/[ú]/g, 'u')
  r = r.replace(/ï/g, 'i')
  r = r.replace(/ü/g, 'u')
  r = r.replace(/l·l/g, 'l')
  r = r.replace(/qu([ei])/g, 'k$1')
  r = r.replace(/gu([ei])/g, 'g$1')
  r = r.replace(/ny/g, 'ny')
  r = r.replace(/ll/g, 'll')
  r = r.replace(/rr/g, 'r')
  r = r.replace(/ss/g, 's')
  r = r.replace(/ç/g, 's')
  r = r.replace(/[^a-z]/g, '')

  // A word-final "t" sitting between another consonant and the plural "-s"
  // is not pronounced in Catalan (e.g. "amants" -> [əˈmans], "molts" ->
  // [mols]), so such words rhyme with ones ending directly in that
  // consonant + "s" (e.g. "amants"/"mans", "molts"/"cols"). Applies to both
  // variants, unlike the final-r elision below, which is central-only.
  r = r.replace(/([bcdfghjklmnpqrstvwxyz])ts$/, '$1s')

  // Central/Oriental Catalan famously elides a word-final "r" in everyday
  // speech and song (e.g. "senyor" -> [səˈɲo], "cantar" -> [kanˈta]), so
  // rhymes routinely pair r-ending words with vowel-ending ones (e.g. Salvat-
  // Papasseit's "no" / "senyor"). Valencian keeps the final -r, so this
  // normalization only applies to the central variant.
  if (variant === 'central' && r.length > 1 && r.endsWith('r')) {
    r = r.slice(0, -1)
  }

  return r
}

export function vowelsOnly(normalized: string): string {
  return normalized.replace(/[^aeiou]/g, '')
}
