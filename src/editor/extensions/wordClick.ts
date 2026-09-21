import { EditorView } from '@codemirror/view'
import type { Extension } from '@codemirror/state'
import { findWordTokens } from '../tokenize'
import { unknownWordsField } from './spellcheckDecoration'

export interface WordClickInfo {
  word: string
  from: number
  to: number
  clientX: number
  clientY: number
  /** Whether this word is currently flagged as misspelled (wavy underline). */
  isUnknown: boolean
}

/** Detects clicks landing on a word token and reports it via `onWordClick`,
 * used to trigger the synonyms popup. Ignores clicks that land between words
 * (whitespace/punctuation) or when there's an active text selection. */
export function wordClickExtension(onWordClick: (info: WordClickInfo) => void): Extension {
  return EditorView.domEventHandlers({
    mousedown: () => {
      // Let CodeMirror handle the click first (placing the cursor) before we
      // inspect the resulting position on the next tick.
      return false
    },
    click: (event, view) => {
      if (event.button !== 0) return false
      const pos = view.posAtCoords({ x: event.clientX, y: event.clientY })
      if (pos == null) return false

      const line = view.state.doc.lineAt(pos)
      const offsetInLine = pos - line.from
      const tokens = findWordTokens(line.text)
      const token = tokens.find((t) => offsetInLine >= t.from && offsetInLine <= t.to)
      if (!token) return false

      // `posAtCoords` clamps to the nearest valid document position, so a
      // click in the empty space at/after the end of a short line still
      // resolves to a position at the last word's boundary. Guard against
      // that false positive by checking the click actually falls within the
      // word's rendered horizontal (and vertical) bounds on screen.
      const startCoords = view.coordsAtPos(line.from + token.from)
      const endCoords = view.coordsAtPos(line.from + token.to)
      if (!startCoords || !endCoords) return false
      if (event.clientX < startCoords.left || event.clientX > endCoords.right) return false
      if (event.clientY < startCoords.top || event.clientY > startCoords.bottom) return false

      onWordClick({
        word: token.word,
        from: line.from + token.from,
        to: line.from + token.to,
        clientX: event.clientX,
        clientY: event.clientY,
        isUnknown: view.state.field(unknownWordsField).has(token.word.toLowerCase()),
      })
      return false
    },
  })
}
