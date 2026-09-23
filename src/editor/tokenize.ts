/** Shared word-token finder for spellcheck extraction and decoration. */

export interface WordToken {
  word: string
  from: number
  to: number
}

// Includes "·" (interpunct) so geminate-l words like "col·legi" are
// extracted as a single token instead of splitting into "col" and "legi" —
// the latter isn't a real word on its own and would be wrongly flagged as a
// spelling error, even though the dictionary itself stores the word with
// its "·" (e.g. "col·legi", not "collegi").
const WORD_TOKEN_REGEX = /[a-zçàèéíòóúïü·'’]+/gi

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
