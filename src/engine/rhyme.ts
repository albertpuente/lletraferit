/**
 * Assigns a conventional rhyme scheme (A, B, C, ... with case/apostrophe
 * marking art major/menor and masculina/femenina endings) to a sequence of
 * verses, based on their consonant rhyme key.
 */

import type { RhymeSchemeEntry, VerseAnalysis } from './types'

const ART_MAJOR_THRESHOLD = 8 // > 8 syllables = art major (uppercase letter)

function letterFor(index: number): string {
  // 0 -> A, 1 -> B, ..., 25 -> Z, 26 -> AA, 27 -> AB, ...
  let n = index
  let label = ''
  do {
    label = String.fromCharCode(65 + (n % 26)) + label
    n = Math.floor(n / 26) - 1
  } while (n >= 0)
  return label
}

export function computeRhymeScheme(verses: VerseAnalysis[]): RhymeSchemeEntry[] {
  const groupIndexByKey = new Map<string, number>()
  const entries: RhymeSchemeEntry[] = []

  for (const verse of verses) {
    if (!verse.rhymeKey || verse.words.length === 0 || verse.rhymeKey.consonant.length === 0) {
      entries.push({ groupIndex: null, label: '' })
      continue
    }

    const key = verse.rhymeKey.consonant
    let groupIndex = groupIndexByKey.get(key)
    if (groupIndex === undefined) {
      groupIndex = groupIndexByKey.size
      groupIndexByKey.set(key, groupIndex)
    }

    const isArtMajor = verse.syllableCount > ART_MAJOR_THRESHOLD
    let letter = letterFor(groupIndex)
    if (!isArtMajor) letter = letter.toLowerCase()
    if (verse.endingType === 'plana') letter += "'"

    entries.push({ groupIndex, label: letter })
  }

  return entries
}
