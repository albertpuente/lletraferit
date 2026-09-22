import { Decoration, EditorView, ViewPlugin } from '@codemirror/view'
import type { DecorationSet, ViewUpdate } from '@codemirror/view'
import { StateEffect, StateField } from '@codemirror/state'
import type { Extension } from '@codemirror/state'
import { lineInfoField } from './lineInfo'

/** Which rhyme group (if any) to highlight, set when the user clicks a
 * verse's syllable/rhyme gutter badge and cleared when the metrics popup
 * closes. */
export const setHighlightedRhymeGroup = StateEffect.define<number | null>()

export const highlightedRhymeGroupField = StateField.define<number | null>({
  create: () => null,
  update(value, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setHighlightedRhymeGroup)) return effect.value
    }
    return value
  },
})

function buildDecorations(view: EditorView): DecorationSet {
  const groupIndex = view.state.field(highlightedRhymeGroupField)
  if (groupIndex === null) return Decoration.none

  const { infos } = view.state.field(lineInfoField)
  const doc = view.state.doc
  const ranges = []
  for (let i = 0; i < infos.length && i < doc.lines; i++) {
    const info = infos[i]
    if (info.rhyme.groupIndex !== groupIndex || !info.rhymeRange) continue
    const line = doc.line(i + 1)
    const from = line.from + info.rhymeRange.from
    const to = line.from + info.rhymeRange.to
    if (to > from) {
      ranges.push(Decoration.mark({ class: `cm-rhyme-highlight rhyme-bg-${groupIndex % 8}` }).range(from, to))
    }
  }
  return Decoration.set(ranges, true)
}

/** Highlights the rhyming syllables of every verse sharing the currently
 * selected rhyme group (see `setHighlightedRhymeGroup`), replacing the old
 * per-badge pop animation with a persistent, explicit visual link between
 * rhyming verses. */
export const rhymeHighlight: Extension = [
  highlightedRhymeGroupField,
  ViewPlugin.fromClass(
    class {
      decorations: DecorationSet

      constructor(view: EditorView) {
        this.decorations = buildDecorations(view)
      }

      update(update: ViewUpdate) {
        const infosChanged = update.startState.field(lineInfoField) !== update.state.field(lineInfoField)
        const groupChanged =
          update.startState.field(highlightedRhymeGroupField) !== update.state.field(highlightedRhymeGroupField)
        if (infosChanged || groupChanged) {
          this.decorations = buildDecorations(update.view)
        }
      }
    },
    { decorations: (plugin) => plugin.decorations },
  ),
]
