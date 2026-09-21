/**
 * Whole-document metrical analysis used by the editor's gutter and rhyme
 * decorations: splits text into lines (verses), analyzes each with the
 * Catalan metrics engine, and computes a rhyme scheme scoped per stanza
 * (a run of verses separated by blank lines, per the standard definition of
 * "estrofa"). Rhyme groups are intentionally NOT carried across stanzas:
 * even when two distant stanzas happen to share the same phonetic ending
 * (which does happen — e.g. Catalan cançó-style quartets that reuse a
 * consonant rhyme across otherwise-independent stanzas), each stanza's
 * rhyme scheme is conventionally labelled independently (A, B, C... restart
 * at each stanza), so the UI doesn't visually link unrelated stanzas.
 */

import { analyzeVerse, computeRhymeScheme } from '../engine'
import type { CatalanVariant, RhymeSchemeEntry, VerseAnalysis } from '../engine/types'
import { explainSyllableCount, explainRhyme } from './explain'

export interface LineInfo {
  syllableCount: number
  rhyme: RhymeSchemeEntry
  syllableExplanation: string
  rhymeExplanation: string
}

const EMPTY_RHYME: RhymeSchemeEntry = { groupIndex: null, label: '' }

export function analyzeDocument(text: string, variant: CatalanVariant = 'central'): LineInfo[] {
  const lines = text.split('\n')
  const verses: VerseAnalysis[] = lines.map((line) => analyzeVerse(line, variant))
  const result: LineInfo[] = new Array(lines.length)

  let stanzaLineIndices: number[] = []

  function flushStanza() {
    if (stanzaLineIndices.length === 0) return
    const stanzaVerses = stanzaLineIndices.map((i) => verses[i])
    const scheme = computeRhymeScheme(stanzaVerses)
    stanzaLineIndices.forEach((lineIndex, k) => {
      const verse = verses[lineIndex]
      const rhyme = scheme[k]
      result[lineIndex] = {
        syllableCount: verse.syllableCount,
        rhyme,
        syllableExplanation: explainSyllableCount(verse),
        rhymeExplanation: explainRhyme(rhyme),
      }
    })
    stanzaLineIndices = []
  }

  lines.forEach((line, i) => {
    if (line.trim() === '') {
      flushStanza()
      result[i] = { syllableCount: 0, rhyme: EMPTY_RHYME, syllableExplanation: '', rhymeExplanation: '' }
      return
    }
    stanzaLineIndices.push(i)
  })
  flushStanza()

  return result
}

/** Compares two `LineInfo` values for equality of everything a user could
 * perceive (syllable count, rhyme letter/group, explanations). Used to
 * detect exactly which lines' displayed metrics genuinely changed after an
 * edit, as opposed to lines that merely shifted position on screen. */
export function lineInfoEquals(a: LineInfo, b: LineInfo): boolean {
  return (
    a.syllableCount === b.syllableCount &&
    a.rhyme.label === b.rhyme.label &&
    a.rhyme.groupIndex === b.rhyme.groupIndex &&
    a.syllableExplanation === b.syllableExplanation &&
    a.rhymeExplanation === b.rhymeExplanation
  )
}
