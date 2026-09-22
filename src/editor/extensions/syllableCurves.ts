import { Decoration, EditorView, ViewPlugin } from '@codemirror/view'
import type { DecorationSet, ViewUpdate } from '@codemirror/view'
import { StateEffect, StateField } from '@codemirror/state'
import type { Extension } from '@codemirror/state'
import { lineInfoField } from './lineInfo'

/** Which line (0-based) should show its per-syllable curve marks, set when
 * the user clicks that line's metrics gutter and cleared when the popup
 * closes. */
export const setSyllableCurvesLine = StateEffect.define<number | null>()

export const syllableCurvesLineField = StateField.define<number | null>({
  create: () => null,
  update(value, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setSyllableCurvesLine)) return effect.value
    }
    return value
  },
})

function buildDecorations(view: EditorView): DecorationSet {
  const lineNumber = view.state.field(syllableCurvesLineField)
  if (lineNumber === null) return Decoration.none

  const doc = view.state.doc
  if (lineNumber < 0 || lineNumber >= doc.lines) return Decoration.none

  const { infos } = view.state.field(lineInfoField)
  const info = infos[lineNumber]
  if (!info) return Decoration.none

  const line = doc.line(lineNumber + 1)
  const ranges = info.metricalSyllables
    .filter((s) => s.to > s.from)
    .map((s) => Decoration.mark({ class: 'cm-syllable-curve' }).range(line.from + s.from, line.from + s.to))
  return Decoration.set(ranges, true)
}

/** Underlines each metrical syllable of the currently-active line (see
 * `setSyllableCurvesLine`) with a subtle curve, so a sinalefa boundary reads
 * as one continuous curve spanning both fused words instead of two. */
export const syllableCurves: Extension = [
  syllableCurvesLineField,
  ViewPlugin.fromClass(
    class {
      decorations: DecorationSet

      constructor(view: EditorView) {
        this.decorations = buildDecorations(view)
      }

      update(update: ViewUpdate) {
        const infosChanged = update.startState.field(lineInfoField) !== update.state.field(lineInfoField)
        const lineChanged =
          update.startState.field(syllableCurvesLineField) !== update.state.field(syllableCurvesLineField)
        if (infosChanged || lineChanged) {
          this.decorations = buildDecorations(update.view)
        }
      }
    },
    { decorations: (plugin) => plugin.decorations },
  ),
]
