import { describe, expect, it } from 'vitest'
import { analyzeWord, syllabifyWord } from '../syllabify'

describe('syllabifyWord', () => {
  const cases: [string, string[]][] = [
    ['país', ['pa', 'ís']],
    ['diürn', ['di', 'ürn']],
    ['riu', ['riu']],
    ['nació', ['na', 'ci', 'ó']],
    ['família', ['fa', 'mí', 'li', 'a']],
    ['gràcia', ['grà', 'ci', 'a']],
    ['estàtua', ['es', 'tà', 'tu', 'a']],
    ['sèrie', ['sè', 'ri', 'e']],
    ['cuina', ['cui', 'na']],
    ['aigua', ['ai', 'gua']],
    ['aigües', ['ai', 'gües']],
    ['quatre', ['qua', 'tre']],
    ['qüestió', ['qües', 'ti', 'ó']],
    ['pingüí', ['pin', 'güí']],
    ['uruguai', ['u', 'ru', 'guai']],
    ['arbre', ['ar', 'bre']],
    ['esponerós', ['es', 'po', 'ne', 'rós']],

    // Mid-word rising diphthong (weak+strong vowel pair NOT in the word's
    // last vowel segment): forms a single syllable, unlike the same "i/u +
    // strong vowel" pattern at the very end of a word (see e.g. "família",
    // "gràcia" above, which stay hiatus).
    ['funciona', ['fun', 'cio', 'na']],
    ['solucionar', ['so', 'lu', 'cio', 'nar']],
    // A 3-vowel run ("iau") is still a single vowel segment: the internal
    // weak+strong pair ("ia") must still hiatus-split (matching the
    // word-final rule) even though another vowel ("u") follows within that
    // same segment — regression test for a bug where checking "any vowel
    // later in the word" (instead of "later in this vowel segment")
    // incorrectly fused "siau" into one syllable.
    ['siau', ['si', 'au']],

    // Geminate "l·l" (punt volat) always splits into two plain "l"s across
    // a syllable boundary, with the "·" itself dropped entirely — not kept
    // together as a single digraph/unit.
    ['col·laborar', ['col', 'la', 'bo', 'rar']],
    ['pel·lícula', ['pel', 'lí', 'cu', 'la']],
    ['al·leluia', ['al', 'le', 'lu', 'ia']],
    ['il·lustre', ['il', 'lus', 'tre']],
    ['pàl·lid', ['pàl', 'lid']],
    ['intel·ligent', ['in', 'tel', 'li', 'gent']],
  ]

  for (const [word, expected] of cases) {
    it(`splits "${word}" into ${JSON.stringify(expected)}`, () => {
      expect(syllabifyWord(word)).toEqual(expected)
    })
  }
})

describe('analyzeWord stress detection', () => {
  it('detects aguda (last syllable stressed) for words ending in a consonant', () => {
    const result = analyzeWord('esponerós')
    expect(result.stressType).toBe('aguda')
    expect(result.stressIndex).toBe(result.syllables.length - 1)
  })

  it('detects plana (penultimate stressed) for words ending in a vowel', () => {
    const result = analyzeWord('arbre')
    expect(result.stressType).toBe('plana')
    expect(result.stressIndex).toBe(result.syllables.length - 2)
  })

  it('respects written accents over the regular rule', () => {
    const result = analyzeWord('país')
    expect(result.stressType).toBe('aguda')
    expect(result.stressIndex).toBe(1)
  })

  it('detects esdrúixola (antepenultimate stressed)', () => {
    const result = analyzeWord('família')
    expect(result.stressType).toBe('esdruixola')
    expect(result.stressIndex).toBe(1)
  })

  it('keeps plana stress for the regular "vowel + s" plural (does not shift to aguda)', () => {
    // "vides" (plural of "vida") is stressed "VI-des", same as the singular,
    // not "vi-DES" — the plural -s marker never shifts Catalan word stress.
    const singular = analyzeWord('vida')
    const plural = analyzeWord('vides')
    expect(plural.stressType).toBe('plana')
    expect(plural.stressIndex).toBe(singular.stressIndex)
  })

  it('still detects aguda for consonant endings that are not a vowel + s', () => {
    const result = analyzeWord('jardins')
    expect(result.stressType).toBe('aguda')
    expect(result.stressIndex).toBe(result.syllables.length - 1)
  })

  it('detects aguda (not plana) for words ending in a falling diphthong with a final semivowel u/i, without a written accent', () => {
    // Per Catalan orthography, words ending in a diphthong whose final
    // element is a semivowel (u/i) are treated like consonant-ending words
    // for stress purposes — aguda by default, no accent needed — unlike a
    // plain single-vowel ending (which would default to plana).
    for (const word of ['Pirineu', 'cantau', 'siau', 'esglai', 'festiu']) {
      const result = analyzeWord(word)
      expect(result.stressType).toBe('aguda')
      expect(result.stressIndex).toBe(result.syllables.length - 1)
    }
  })

  it('keeps the semivowel-diphthong ending aguda through a plural "-s" (does not shift to plana)', () => {
    const singular = analyzeWord('esglai')
    const plural = analyzeWord('esglais')
    expect(plural.stressType).toBe('aguda')
    expect(plural.stressIndex).toBe(singular.stressIndex)
  })
})
