/** Shared word-token finder for spellcheck extraction and decoration. */

export interface WordToken {
  word: string
  from: number
  to: number
}

const WORD_TOKEN_REGEX = /[a-zçàèéíòóúïü'’]+/gi

/** Finds word tokens (letters + internal apostrophes) with their offsets in `text`. */
export function findWordTokens(text: string): WordToken[] {
  const tokens: WordToken[] = []
  for (const match of text.matchAll(WORD_TOKEN_REGEX)) {
    const raw = match[0]
    // Trim leading/trailing apostrophes that aren't part of an elision (e.g. quoted text).
    const trimmed = raw.replace(/^['’]+|['’]+$/g, '')
    if (trimmed.length === 0) continue
    const offset = match.index + raw.indexOf(trimmed)
    tokens.push({ word: trimmed, from: offset, to: offset + trimmed.length })
  }
  return tokens
}
