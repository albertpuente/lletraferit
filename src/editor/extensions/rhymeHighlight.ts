import { Decoration, EditorView, ViewPlugin } from '@codemirror/view'
import type { DecorationSet, ViewUpdate } from '@codemirror/view'
import { StateEffect, StateField } from '@codemirror/state'
import type { Extension } from '@codemirror/state'
import { lineInfoField } from './lineInfo'
import type { LineInfo } from '../analysis'

export interface HighlightedRhyme {
  groupIndex: number
  /** 0-based line index of the clicked verse, so the highlight can be
   * scoped to just its stanza (see `stanzaRangeAround`) rather than every
   * verse in the whole document that happens to share the same group
   * index, since that index is only unique within a stanza. */
  lineIndex: number
}

/** Which rhyme group (if any) to highlight, set when the user clicks a
 * verse's syllable/rhyme gutter badge and cleared when the metrics popup
 * closes. */
export const setHighlightedRhymeGroup = StateEffect.define<HighlightedRhyme | null>()

export const highlightedRhymeGroupField = StateField.define<HighlightedRhyme | null>({
  create: () => null,
  update(value, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setHighlightedRhymeGroup)) return effect.value
    }
    return value
  },
})

/** Returns the [start, end] inclusive 0-based line-index range of the
 * stanza (contiguous run of non-blank lines) containing `lineIndex`, per
 * the same "estrofa" definition used by `analyzeDocument`. */
function stanzaRangeAround(infos: LineInfo[], lineIndex: number): [number, number] {
  let start = lineIndex
  while (start > 0 && !infos[start - 1].isBlank) start--
  let end = lineIndex
  while (end < infos.length - 1 && !infos[end + 1].isBlank) end++
  return [start, end]
}

function buildDecorations(view: EditorView): DecorationSet {
  const highlighted = view.state.field(highlightedRhymeGroupField)
  if (highlighted === null) return Decoration.none
  const { groupIndex, lineIndex } = highlighted

  const { infos } = view.state.field(lineInfoField)
  if (lineIndex < 0 || lineIndex >= infos.length) return Decoration.none
  const [stanzaStart, stanzaEnd] = stanzaRangeAround(infos, lineIndex)

  const doc = view.state.doc
  const ranges = []
  for (let i = stanzaStart; i <= stanzaEnd && i < doc.lines; i++) {
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
