/**
 * Verse-level metrical analysis: tokenizes a line of poetry into words,
 * computes syllable counts (accounting for sinalefa and the Catalan
 * "count up to the last stressed syllable" rule), and derives a rhyme key
 * from the verse ending.
 */

import { analyzeWord } from './syllabify'
import { hasSinalefa } from './sinalefa'
import { normalizePhoneticTail, vowelsOnly } from './phonetics'
import type { CatalanVariant, VerseAnalysis, WordAnalysis } from './types'

const WORD_TOKEN_REGEX = /[a-zçàèéíòóúïü·]+(?:['’][a-zçàèéíòóúïü·]+)*/gi

const VOWEL_REGEX = /[aeiouàèéíòóúïü]/

/**
 * Builds the rhyme tail for a word: everything from its tonic VOWEL through
 * the end of the word. Any onset consonant(s) of the stressed syllable are
 * excluded, since Catalan rhyme (like Spanish rhyme) is defined from the
 * stressed vowel onward, not from the start of the stressed syllable — e.g.
 * "cel" and "estel" rhyme (both "-el") despite differing onsets (c- vs t-).
 */
function rhymeTail(word: WordAnalysis): string {
  const stressedSyllable = word.syllables[word.stressIndex] ?? ''

  // Skip a silent "u" in a "qu"/"gu" onset before e/i (e.g. "gués" in
  // "tingués" is pronounced [ges], the "u" is a silent digraph marker, not
  // part of the vowel nucleus) so it isn't mistaken for the stressed vowel
  // itself — matches the qu/gu-silent-u rule already applied during
  // syllabification (see markRoles in syllabify.ts).
  let searchFrom = 0
  if (
    stressedSyllable.length > 2 &&
    (stressedSyllable[0] === 'q' || stressedSyllable[0] === 'g') &&
    stressedSyllable[1] === 'u' &&
    VOWEL_REGEX.test(stressedSyllable[2])
  ) {
    searchFrom = 2
  }

  const searchable = stressedSyllable.slice(searchFrom)
  const vowelMatch = searchable.match(VOWEL_REGEX)
  const fromVowel =
    vowelMatch?.index !== undefined ? searchable.slice(vowelMatch.index) : stressedSyllable.slice(searchFrom)
  return [fromVowel, ...word.syllables.slice(word.stressIndex + 1)].join('')
}

export function tokenizeVerse(text: string): string[] {
  const matches = text.match(WORD_TOKEN_REGEX)
  if (!matches) return []
  return matches.map((m) => m.replace(/['’]/g, ''))
}

export function analyzeVerse(text: string, variant: CatalanVariant = 'central'): VerseAnalysis {
  const tokens = tokenizeVerse(text)
  const words = tokens.map((t) => analyzeWord(t))

  const rawSyllables = words.reduce((sum, w) => sum + w.syllables.length, 0)

  let sinalefaCount = 0
  for (let i = 0; i < words.length - 1; i++) {
    if (hasSinalefa(words[i].word, words[i + 1].word)) sinalefaCount++
  }

  let trailingUnstressed = 0
  let rhymeKey: VerseAnalysis['rhymeKey'] = null
  let endingType: VerseAnalysis['endingType'] = null

  if (words.length > 0) {
    const lastWord = words[words.length - 1]
    trailingUnstressed = lastWord.syllables.length - 1 - lastWord.stressIndex
    endingType = lastWord.stressType

    const consonant = normalizePhoneticTail(rhymeTail(lastWord), variant)
    rhymeKey = { consonant, assonant: vowelsOnly(consonant) }
  }

  const syllableCount = Math.max(0, rawSyllables - sinalefaCount - trailingUnstressed)

  return {
    text,
    words,
    rawSyllables,
    sinalefaCount,
    trailingUnstressed,
    syllableCount,
    rhymeKey,
    endingType,
  }
}
