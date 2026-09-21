import { describe, expect, it } from 'vitest'
import { candidateLemmas } from '../lemmatize'

describe('candidateLemmas', () => {
  it('recovers a feminine singular from a "-es" plural', () => {
    expect(candidateLemmas('cases')).toContain('casa')
  })

  it('recovers a regular "-s" plural (noun ending in a consonant/other vowel)', () => {
    expect(candidateLemmas('amics')).toContain('amic')
    expect(candidateLemmas('arbres')).toContain('arbre')
  })

  it('recovers a velar-stem plural ("-ques" -> "-ca", "-gues" -> "-ga", "-gües" -> "-gua")', () => {
    expect(candidateLemmas('vaques')).toContain('vaca')
    expect(candidateLemmas('amigues')).toContain('amiga')
    expect(candidateLemmas('aigües')).toContain('aigua')
  })

  it('recovers an epenthetic "-os" plural, with and without degemination', () => {
    expect(candidateLemmas('calaixos')).toContain('calaix')
    expect(candidateLemmas('gossos')).toContain('gos')
  })

  it('recovers an -ar infinitive from imperfect, gerund, and participle forms', () => {
    expect(candidateLemmas('cantava')).toContain('cantar')
    expect(candidateLemmas('cantant')).toContain('cantar')
    expect(candidateLemmas('cantat')).toContain('cantar')
    expect(candidateLemmas('cantada')).toContain('cantar')
  })

  it('recovers a -re/-er infinitive candidate from gerund and participle forms', () => {
    expect(candidateLemmas('perdent')).toContain('perdre')
    expect(candidateLemmas('perdut')).toContain('perdre')
  })

  it('recovers an -ir infinitive from gerund, participle, and present-tense forms', () => {
    expect(candidateLemmas('dormint')).toContain('dormir')
    expect(candidateLemmas('dormit')).toContain('dormir')
    expect(candidateLemmas('dormim')).toContain('dormir')
    expect(candidateLemmas('dormiu')).toContain('dormir')
  })

  it('never includes the original word itself', () => {
    expect(candidateLemmas('cases')).not.toContain('cases')
  })

  it('does not generate candidates from words too short to safely strip a suffix', () => {
    expect(candidateLemmas('gat')).not.toContain('g')
    expect(candidateLemmas('viu')).not.toContain('vir')
  })
})
