/**
 * Shared types for the Catalan metrics engine.
 */

export type StressType = 'aguda' | 'plana' | 'esdruixola'

export interface WordAnalysis {
  /** Original word token (apostrophes stripped, case preserved as lowercased). */
  word: string
  /** Syllable substrings, in order. */
  syllables: string[]
  /** Index (0-based) of the stressed syllable within `syllables`. */
  stressIndex: number
  /** Word stress classification (aguda/plana/esdrúixola). */
  stressType: StressType
}

export interface RhymeKey {
  /** Normalized phonetic tail from the last stressed vowel to the end (for consonant rhyme). */
  consonant: string
  /** Normalized vowel-only tail (for assonant rhyme). */
  assonant: string
}

export interface VerseAnalysis {
  /** Original verse text as typed by the user. */
  text: string
  /** Per-word analysis for every word token found in the verse. */
  words: WordAnalysis[]
  /** Sum of syllable counts for every word, with no adjustments. */
  rawSyllables: number
  /** Number of sinalefa (vowel fusion) boundaries detected between words. */
  sinalefaCount: number
  /** Unstressed syllables after the last word's stressed syllable, not counted
   * toward the metrical total (0 for aguda, 1 for plana, 2+ for esdrúixola). */
  trailingUnstressed: number
  /** Final metrical syllable count (raw - sinalefes - trailing unstressed syllables of the last word). */
  syllableCount: number
  /** Rhyme key derived from the last word of the verse, or null if the verse has no words. */
  rhymeKey: RhymeKey | null
  /** Stress classification of the verse ending (masculina=aguda, femenina=plana, esdrúixola). */
  endingType: StressType | null
}

export interface RhymeSchemeEntry {
  /** Index of the rhyme group this verse belongs to (0-based), or null if the verse is unrhymed/empty. */
  groupIndex: number | null
  /** Conventional letter label, e.g. "A", "b", "A'". Empty string if unrhymed/empty. */
  label: string
}

export type CatalanVariant = 'central' | 'valencia'
