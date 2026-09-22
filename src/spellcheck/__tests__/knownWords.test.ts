import { describe, expect, it } from 'vitest'
import { isAlwaysKnownWord } from '../knownWords'

describe('isAlwaysKnownWord', () => {
  it.each(['Catalunya', 'Pirineu', 'Montserrat', 'Barcelona'])('recognizes %s as a built-in Catalan proper noun', (word) => {
    expect(isAlwaysKnownWord(word)).toBe(true)
  })

  it('recognizes the names irrespective of casing', () => {
    expect(isAlwaysKnownWord('catalunya')).toBe(true)
    expect(isAlwaysKnownWord('BARCELONA')).toBe(true)
  })

  it('does not exempt unrelated words', () => {
    expect(isAlwaysKnownWord('paraula-inventada')).toBe(false)
  })
})