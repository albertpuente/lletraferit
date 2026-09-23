import { Decoration, EditorView, ViewPlugin } from '@codemirror/view'
import type { DecorationSet, ViewUpdate } from '@codemirror/view'
import { StateEffect, StateField } from '@codemirror/state'
import type { Extension } from '@codemirror/state'
import { lineInfoField } from './lineInfo'

/** Controls the optional visual grouping of the detected metrical feet. */
export const setShowFootBoundaries = StateEffect.define<boolean>()

const showFootBoundariesField = StateField.define<boolean>({
  create: () => false,
  update(value, tr) {
    for (const effect of tr.effects) if (effect.is(setShowFootBoundaries)) return effect.value
    return value
  },
})

function buildDecorations(view: EditorView): DecorationSet {
  if (!view.state.field(showFootBoundariesField)) return Decoration.none
  const { infos } = view.state.field(lineInfoField)
  const ranges = []
  for (let lineNumber = 0; lineNumber < Math.min(view.state.doc.lines, infos.length); lineNumber++) {
    const line = view.state.doc.line(lineNumber + 1)
    for (const foot of infos[lineNumber]?.metricFeet ?? []) {
      if (foot.range.to > foot.range.from) {
        ranges.push(
          Decoration.mark({ class: `cm-metric-foot cm-foot-${foot.type}` }).range(
            line.from + foot.range.from,
            line.from + foot.range.to,
          ),
        )
      }
    }
  }
  return Decoration.set(ranges, true)
}

export const footBoundaries: Extension = [
  showFootBoundariesField,
  ViewPlugin.fromClass(
    class {
      decorations: DecorationSet
      constructor(view: EditorView) { this.decorations = buildDecorations(view) }
      update(update: ViewUpdate) {
        if (
          update.startState.field(showFootBoundariesField) !== update.state.field(showFootBoundariesField) ||
          update.startState.field(lineInfoField) !== update.state.field(lineInfoField)
        ) this.decorations = buildDecorations(update.view)
      }
    },
    { decorations: (plugin) => plugin.decorations },
  ),
]