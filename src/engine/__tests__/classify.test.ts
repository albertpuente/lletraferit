import { describe, expect, it } from 'vitest'
import { classifyRhymePattern, verseTypeName } from '../classify'

describe('verseTypeName', () => {
  it('names art menor verses', () => {
    expect(verseTypeName(7)).toBe('Heptasíl·lab')
    expect(verseTypeName(8)).toBe('Octosíl·lab')
  })

  it('names art major verses, flagging the alexandrí', () => {
    expect(verseTypeName(10)).toBe('Decasíl·lab')
    expect(verseTypeName(12)).toBe('Dodecasíl·lab (alexandrí)')
  })

  it('returns empty string for an empty verse', () => {
    expect(verseTypeName(0)).toBe('')
  })
})

describe('classifyRhymePattern', () => {
  it('detects monorima (AAAA)', () => {
    expect(classifyRhymePattern([0, 0, 0, 0])).toBe('monorima')
  })

  it('detects encadenada (ABAB)', () => {
    expect(classifyRhymePattern([0, 1, 0, 1])).toBe('encadenada')
  })

  it('detects creuada (ABBA)', () => {
    expect(classifyRhymePattern([0, 1, 1, 0])).toBe('creuada')
  })

  it('detects caudada (AABB)', () => {
    expect(classifyRhymePattern([0, 0, 1, 1])).toBe('caudada')
  })

  it('detects tercet encadenat (ABA)', () => {
    expect(classifyRhymePattern([0, 1, 0])).toBe('tercet encadenat')
  })

  it('detects apariat (AA couplet)', () => {
    expect(classifyRhymePattern([0, 0])).toBe('apariat')
  })

  it('detects fully unrhymed verses as versos blancs', () => {
    expect(classifyRhymePattern([null, null, null])).toBe('versos blancs')
  })

  it('falls back to lliure when no two verses rhyme', () => {
    expect(classifyRhymePattern([0, 1, 2, 3])).toBe('lliure')
  })
})
