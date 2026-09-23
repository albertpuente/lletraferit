import { describe, expect, it } from 'vitest'
import { findWordTokens } from '../tokenize'

describe('findWordTokens', () => {
  it('keeps a geminate-l word with its interpunct as a single token, not split into "col" and "legi"', () => {
    const tokens = findWordTokens('El col·legi és bonic')
    expect(tokens.map((t) => t.word)).toEqual(['El', 'col·legi', 'és', 'bonic'])
  })

  it('reports correct character offsets for a geminate-l token', () => {
    const text = 'pel·lícula'
    const tokens = findWordTokens(text)
    expect(tokens).toEqual([{ word: 'pel·lícula', from: 0, to: text.length }])
  })

  it('still splits an elided clitic from the word it attaches to', () => {
    const tokens = findWordTokens("l'amor")
    expect(tokens.map((t) => t.word)).toEqual(["l'amor"])
  })
})
