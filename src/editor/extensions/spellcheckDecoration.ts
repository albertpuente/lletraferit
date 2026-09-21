import { EditorView, Decoration, ViewPlugin } from '@codemirror/view'
import type { DecorationSet, ViewUpdate } from '@codemirror/view'
import { StateEffect, StateField } from '@codemirror/state'
import type { Extension } from '@codemirror/state'
import { findWordTokens } from '../tokenize'

export const setUnknownWords = StateEffect.define<Set<string>>()

export const unknownWordsField = StateField.define<Set<string>>({
  create() {
    return new Set()
  },
  update(value, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setUnknownWords)) return effect.value
    }
    return value
  },
})

function buildUnknownWordDecorations(view: EditorView): DecorationSet {
  const unknown = view.state.field(unknownWordsField)
  if (unknown.size === 0) return Decoration.none

  const text = view.state.doc.toString()
  const tokens = findWordTokens(text)
  const marks = tokens
    .filter((t) => unknown.has(t.word.toLowerCase()))
    .map((t) => Decoration.mark({ class: 'unknown-word' }).range(t.from, t.to))

  return Decoration.set(marks)
}

const unknownWordsViewPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet

    constructor(view: EditorView) {
      this.decorations = buildUnknownWordDecorations(view)
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.transactions.some((tr) => tr.effects.some((e) => e.is(setUnknownWords)))) {
        this.decorations = buildUnknownWordDecorations(update.view)
      }
    }
  },
  {
    decorations: (plugin) => plugin.decorations,
  },
)

export const spellcheckDecoration: Extension = [unknownWordsField, unknownWordsViewPlugin]
