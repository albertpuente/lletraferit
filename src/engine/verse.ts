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

/**
 * Resolves which adjacent word boundaries actually fuse via sinalefa,
 * disallowing a word from fusing on both sides at once. When a word has a
 * sinalefa opportunity on both its left and right, the right-hand one wins
 * (processed right-to-left, first come first served) — matching the
 * standard textbook example "no hi ha pa", pronounced "no-ja-pa": "hi"
 * fuses with "ha" (giving "ja"), but that consumes "hi", so "no" stays its
 * own syllable instead of also fusing into the chain.
 */
function resolveSinalefaBoundaries(words: WordAnalysis[]): boolean[] {
  const fuses = new Array<boolean>(Math.max(0, words.length - 1)).fill(false)
  const consumed = new Array<boolean>(words.length).fill(false)
  for (let i = words.length - 2; i >= 0; i--) {
    if (consumed[i] || consumed[i + 1]) continue
    if (hasSinalefa(words[i].word, words[i + 1].word)) {
      fuses[i] = true
      consumed[i] = true
      consumed[i + 1] = true
    }
  }
  return fuses
}

interface TokenSpan {
  raw: string
  clean: string
  from: number
  to: number
}

/** Same word matching as `tokenizeVerse`, but keeping each token's character
 * offsets within `text` so callers can map a word (or a substring of it,
 * such as the rhyming tail) back to its position in the original verse. */
function tokenizeVerseWithOffsets(text: string): TokenSpan[] {
  const spans: TokenSpan[] = []
  for (const match of text.matchAll(WORD_TOKEN_REGEX)) {
    const raw = match[0]
    const from = match.index ?? 0
    spans.push({ raw, clean: raw.replace(/['’]/g, ''), from, to: from + raw.length })
  }
  return spans
}

export function tokenizeVerse(text: string): string[] {
  return tokenizeVerseWithOffsets(text).map((t) => t.clean)
}

/** Maps character offsets in a word's apostrophe-stripped "clean" form (the
 * form syllabified) back to offsets in its original "raw" spelling, so
 * apostrophes are folded into whichever adjacent syllable's range they fall
 * next to instead of desyncing every offset after them. */
function cleanToRawBoundaries(raw: string): number[] {
  const boundaries = [0]
  let rawIdx = 0
  for (const ch of raw) {
    rawIdx++
    if (ch === "'" || ch === '’') continue
    boundaries.push(rawIdx)
  }
  return boundaries
}

/** Computes the character range (within `text`) of each syllable of `word`,
 * relative to the word's own start (i.e. 0 = first character of the word). */
function wordSyllableSpans(word: WordAnalysis, tokenSpan: TokenSpan): { from: number; to: number }[] {
  const rawBoundaries = cleanToRawBoundaries(tokenSpan.raw)
  const spans: { from: number; to: number }[] = []
  let cleanOffset = 0
  for (const syllable of word.syllables) {
    const from = rawBoundaries[cleanOffset] ?? cleanOffset
    cleanOffset += syllable.length
    const to = rawBoundaries[cleanOffset] ?? cleanOffset
    spans.push({ from: tokenSpan.from + from, to: tokenSpan.from + to })
  }
  return spans
}

/**
 * Character ranges (within `text`) of every syllable that counts toward the
 * verse's metrical `syllableCount`: one range per counted syllable, except
 * that a sinalefa boundary merges the two fused syllables into a single
 * continuous range (spanning both words), and the last word's uncounted
 * trailing unstressed syllables are dropped entirely.
 */
function computeMetricalSyllables(
  words: WordAnalysis[],
  tokenSpans: TokenSpan[],
  sinalefaBoundaries: boolean[],
): { from: number; to: number }[] {
  const flat: { from: number; to: number }[] = []
  for (let wi = 0; wi < words.length; wi++) {
    const spans = wordSyllableSpans(words[wi], tokenSpans[wi])
    for (let si = 0; si < spans.length; si++) {
      const fusesWithPrevious = si === 0 && wi > 0 && flat.length > 0 && sinalefaBoundaries[wi - 1]
      if (fusesWithPrevious) {
        flat[flat.length - 1] = { from: flat[flat.length - 1].from, to: spans[si].to }
      } else {
        flat.push(spans[si])
      }
    }
  }

  if (words.length > 0) {
    const lastWord = words[words.length - 1]
    const trailingUnstressed = lastWord.syllables.length - 1 - lastWord.stressIndex
    if (trailingUnstressed > 0) flat.length = Math.max(0, flat.length - trailingUnstressed)
  }

  return flat
}

export function analyzeVerse(text: string, variant: CatalanVariant = 'central'): VerseAnalysis {
  const tokenSpans = tokenizeVerseWithOffsets(text)
  const words = tokenSpans.map((t) => analyzeWord(t.clean))

  const rawSyllables = words.reduce((sum, w) => sum + w.syllables.length, 0)

  const sinalefaBoundaries = resolveSinalefaBoundaries(words)
  const sinalefaCount = sinalefaBoundaries.filter(Boolean).length

  let trailingUnstressed = 0
  let rhymeKey: VerseAnalysis['rhymeKey'] = null
  let endingType: VerseAnalysis['endingType'] = null
  let rhymeRange: VerseAnalysis['rhymeRange'] = null

  if (words.length > 0) {
    const lastWord = words[words.length - 1]
    trailingUnstressed = lastWord.syllables.length - 1 - lastWord.stressIndex
    endingType = lastWord.stressType

    const tail = rhymeTail(lastWord)
    const consonant = normalizePhoneticTail(tail, variant)
    rhymeKey = { consonant, assonant: vowelsOnly(consonant) }

    // Position of the rhyming tail within the original verse text, used to
    // highlight the rhyming syllable(s) in the editor. Clamped to the word's
    // own span in case internal apostrophes (stripped before syllabifying)
    // made the analyzed word a character or two shorter than its on-screen
    // span — a rare heuristic gap, not worth exact reconciliation.
    const lastSpan = tokenSpans[tokenSpans.length - 1]
    const tailLength = Math.min(tail.length, lastSpan.to - lastSpan.from)
    rhymeRange = { from: lastSpan.to - tailLength, to: lastSpan.to }
  }

  const syllableCount = Math.max(0, rawSyllables - sinalefaCount - trailingUnstressed)
  const metricalSyllables = computeMetricalSyllables(words, tokenSpans, sinalefaBoundaries)

  return {
    text,
    words,
    rawSyllables,
    sinalefaCount,
    trailingUnstressed,
    syllableCount,
    rhymeKey,
    endingType,
    rhymeRange,
    metricalSyllables,
  }
}
