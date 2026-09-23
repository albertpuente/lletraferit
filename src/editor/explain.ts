/**
 * Builds short, human-readable explanations (in Catalan) for the syllable
 * count and rhyme letter shown in the editor's gutter, shown as native
 * tooltips (`title` attribute) on hover so users can understand *why* a
 * verse was counted or classified the way it was.
 */

import { metricFootName } from '../engine/feet'
import type { RhymeSchemeEntry, VerseAnalysis } from '../engine/types'

function pluralize(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural
}

/** Explains how a verse's syllable count was computed: raw count per word,
 * minus sinalefes, minus the unstressed tail of the final word. */
export function explainSyllableCount(verse: VerseAnalysis): string {
  if (verse.words.length === 0) return ''

  const parts: string[] = [
    `${verse.rawSyllables} ${pluralize(verse.rawSyllables, 'síl·laba', 'síl·labes')} comptant cada paraula per separat`,
  ]

  if (verse.sinalefaCount > 0) {
    parts.push(
      `-${verse.sinalefaCount} per ${pluralize(verse.sinalefaCount, 'sinalefa', 'sinalefes')} (fusió de vocals entre paraules)`,
    )
  }

  if (verse.trailingUnstressed > 0) {
    const reason = verse.endingType === 'esdruixola' ? 'esdrúixola' : 'plana'
    parts.push(
      `-${verse.trailingUnstressed} perquè la paraula final és ${reason} (no es compten les síl·labes àtones després de la tònica)`,
    )
  }

  return `${parts.join(', ')} = ${verse.syllableCount} ${pluralize(verse.syllableCount, 'síl·laba', 'síl·labes')}.`
}

/** Explains a rhyme-scheme letter: what it means for this verse to share it
 * with others, and what the case/apostrophe convention indicates. */
export function explainRhyme(rhyme: RhymeSchemeEntry): string {
  if (!rhyme.label) return ''

  const hasApostrophe = rhyme.label.endsWith("'")
  const bareLetter = hasApostrophe ? rhyme.label.slice(0, -1) : rhyme.label
  const isArtMajor = bareLetter === bareLetter.toUpperCase()

  const parts: string[] = [
    `Rima "${rhyme.label}": aquest vers acaba igual (des de la vocal tònica) que els altres versos marcats "${rhyme.label}" en aquesta estrofa.`,
  ]

  parts.push(
    isArtMajor
      ? "És un vers d'art major (més de 8 síl·labes)."
      : "És un vers d'art menor (8 síl·labes o menys).",
  )

  if (hasApostrophe) {
    parts.push("L'apòstrof indica que la paraula final és plana.")
  }

  return parts.join(' ')
}

/** Explains accentual feet without presenting them as a replacement for the
 * app's syllable-count analysis. A foot can span word boundaries. */
export function explainMetricFeet(verse: VerseAnalysis): string {
  const { feet, predominantFoot, predominantRatio, cesuraAfter } = verse.feetAnalysis
  if (feet.length === 0) return ''

  const listed = feet.map((foot) => `${metricFootName(foot.type)} (${foot.pattern})`).join(' · ')
  const parts = [`Peus: ${listed}.`]
  if (predominantFoot) {
    parts.push(
      `Ritme predominant: ${metricFootName(predominantFoot)} (${Math.round(predominantRatio * 100)}% dels peus complets).`,
    )
  } else {
    parts.push('Ritme mixt: cap peu complet no predomina.')
  }
  if (cesuraAfter) {
    parts.push(`Alexandrí: cesura orientativa després de la síl·laba ${cesuraAfter} (dos hemistiquis de 6).`)
  }
  return parts.join(' ')
}
