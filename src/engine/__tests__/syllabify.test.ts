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
