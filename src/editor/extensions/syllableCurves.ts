import { Decoration, EditorView, ViewPlugin } from '@codemirror/view'
import type { DecorationSet, ViewUpdate } from '@codemirror/view'
import { StateEffect, StateField } from '@codemirror/state'
import type { Extension } from '@codemirror/state'
import { lineInfoField } from './lineInfo'

/** Which line (0-based) should show its per-syllable curve marks, set when
 * the user clicks that line's metrics gutter and cleared when the popup
 * closes. Ignored while "show all" mode (below) is on. */
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

/** Permanently shows every verse's curves at once (Structures panel
 * toggle), rather than only the currently-clicked line's. */
export const setShowAllSyllableCurves = StateEffect.define<boolean>()

export const showAllSyllableCurvesField = StateField.define<boolean>({
  create: () => false,
  update(value, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setShowAllSyllableCurves)) return effect.value
    }
    return value
  },
})

function buildDecorations(view: EditorView): DecorationSet {
  const showAll = view.state.field(showAllSyllableCurvesField)
  const activeLine = view.state.field(syllableCurvesLineField)
  if (!showAll && activeLine === null) return Decoration.none

  const doc = view.state.doc
  const { infos } = view.state.field(lineInfoField)
  const ranges = []

  const lineNumbers = showAll
    ? Array.from({ length: Math.min(infos.length, doc.lines) }, (_, i) => i)
    : activeLine !== null && activeLine >= 0 && activeLine < doc.lines
      ? [activeLine]
      : []

  for (const lineNumber of lineNumbers) {
    const info = infos[lineNumber]
    if (!info) continue
    const line = doc.line(lineNumber + 1)
    for (const s of info.metricalSyllables) {
      if (s.to > s.from) {
        ranges.push(Decoration.mark({ class: 'cm-syllable-curve' }).range(line.from + s.from, line.from + s.to))
      }
    }
  }
  return Decoration.set(ranges, true)
}

/** Underlines each metrical syllable of the currently-active line (see
 * `setSyllableCurvesLine`), or of every line at once when "show all" mode
 * is on (see `setShowAllSyllableCurves`), with a subtle curve, so a
 * sinalefa boundary reads as one continuous curve spanning both fused
 * words instead of two. */
export const syllableCurves: Extension = [
  syllableCurvesLineField,
  showAllSyllableCurvesField,
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
        const showAllChanged =
          update.startState.field(showAllSyllableCurvesField) !== update.state.field(showAllSyllableCurvesField)
        if (infosChanged || lineChanged || showAllChanged) {
          this.decorations = buildDecorations(update.view)
        }
      }
    },
    { decorations: (plugin) => plugin.decorations },
  ),
]
