import { GutterMarker, gutter } from '@codemirror/view'
import { StateEffect, StateField } from '@codemirror/state'
import type { Extension, Transaction } from '@codemirror/state'
import { analyzeDocument, lineInfoEquals } from '../analysis'
import type { LineInfo } from '../analysis'
import type { CatalanVariant } from '../../engine/types'

export const setVariant = StateEffect.define<CatalanVariant>()

export interface MetricsClickInfo {
  syllableExplanation: string
  rhymeExplanation: string
  clientX: number
  clientY: number
}

interface LineInfoState {
  variant: CatalanVariant
  infos: LineInfo[]
  /** 0-based new-document line indices whose displayed metrics genuinely
   * changed as a result of the most recent edit (as opposed to lines that
   * merely shifted up/down on screen because a line was inserted/removed
   * elsewhere). Only these lines get the "just changed" pop animation. */
  changedLines: ReadonlySet<number>
}

const NO_CHANGES: ReadonlySet<number> = new Set()

export const lineInfoField = StateField.define<LineInfoState>({
  create(state) {
    return { variant: 'central', infos: analyzeDocument(state.doc.toString(), 'central'), changedLines: NO_CHANGES }
  },
  update(value, tr) {
    let variant = value.variant
    for (const effect of tr.effects) {
      if (effect.is(setVariant)) variant = effect.value
    }
    if (!tr.docChanged && variant === value.variant) return value

    const newInfos = analyzeDocument(tr.state.doc.toString(), variant)
    // Only compute (and thus animate) changed lines for actual keyboard
    // typing/pasting — programmatic edits (inserting a chosen synonym,
    // opening/loading a document, switching variant, etc.) should update the
    // gutter's numbers/letters instantly without the pop animation.
    const isTypingEvent = tr.isUserEvent('input.type') || tr.isUserEvent('input.paste')
    const changedLines = tr.docChanged && isTypingEvent ? computeChangedLines(value.infos, newInfos, tr) : NO_CHANGES
    return { variant, infos: newInfos, changedLines }
  },
})

/** Diffs old vs. new per-line analysis, mapping each old line's position
 * through the transaction's changes to find where its content ended up in
 * the new document. This correctly distinguishes "this line's metrics
 * actually changed" from "this line moved because a line was inserted or
 * removed above it", which a naive same-index comparison cannot do. */
function computeChangedLines(oldInfos: LineInfo[], newInfos: LineInfo[], tr: Transaction): ReadonlySet<number> {
  const changed = new Set<number>()
  const matchedNewIndices = new Set<number>()
  const oldDoc = tr.startState.doc

  for (let oldIdx = 0; oldIdx < oldInfos.length; oldIdx++) {
    if (oldIdx >= oldDoc.lines) break
    const oldLineFrom = oldDoc.line(oldIdx + 1).from
    const mappedPos = tr.changes.mapPos(oldLineFrom, 1)
    const newIdx = tr.state.doc.lineAt(mappedPos).number - 1
    if (newIdx < 0 || newIdx >= newInfos.length) continue
    matchedNewIndices.add(newIdx)
    if (!lineInfoEquals(oldInfos[oldIdx], newInfos[newIdx])) changed.add(newIdx)
  }

  for (let newIdx = 0; newIdx < newInfos.length; newIdx++) {
    if (!matchedNewIndices.has(newIdx)) changed.add(newIdx)
  }

  return changed
}

class SyllableMarker extends GutterMarker {
  readonly count: number
  readonly rhymeLabel: string
  readonly rhymeGroupIndex: number | null
  readonly syllableExplanation: string
  readonly rhymeExplanation: string
  readonly changed: boolean

  constructor(
    count: number,
    rhymeLabel: string,
    rhymeGroupIndex: number | null,
    syllableExplanation: string,
    rhymeExplanation: string,
    changed: boolean,
  ) {
    super()
    this.count = count
    this.rhymeLabel = rhymeLabel
    this.rhymeGroupIndex = rhymeGroupIndex
    this.syllableExplanation = syllableExplanation
    this.rhymeExplanation = rhymeExplanation
    this.changed = changed
  }

  eq(other: SyllableMarker) {
    return (
      other.count === this.count &&
      other.rhymeLabel === this.rhymeLabel &&
      other.rhymeGroupIndex === this.rhymeGroupIndex &&
      other.syllableExplanation === this.syllableExplanation &&
      other.rhymeExplanation === this.rhymeExplanation &&
      other.changed === this.changed
    )
  }

  toDOM() {
    const wrapper = document.createElement('span')
    wrapper.className = 'cm-syllable-badge'

    const countSpan = document.createElement('span')
    countSpan.className = this.changed ? 'cm-syllable-count cm-metric-pop' : 'cm-syllable-count'
    countSpan.textContent = this.count > 0 ? String(this.count) : ''
    wrapper.appendChild(countSpan)

    if (this.rhymeLabel) {
      const letterSpan = document.createElement('span')
      const base = `cm-rhyme-letter rhyme-text-${(this.rhymeGroupIndex ?? 0) % 8}`
      letterSpan.className = this.changed ? `${base} cm-metric-pop` : base
      letterSpan.textContent = this.rhymeLabel
      wrapper.appendChild(letterSpan)
    }

    return wrapper
  }
}

/** Gutter showing the syllable count and rhyme letter for each verse.
 * Clicking anywhere on a line's badge reports its explanation text via
 * `onClick`, instead of a hover tooltip, so touch/click users get the same
 * information as mouse users without relying on `:hover`. */
export function syllableGutter(onClick: (info: MetricsClickInfo) => void): Extension {
  return [
    lineInfoField,
    gutter({
      class: 'cm-syllable-gutter',
      lineMarker(view, line) {
        const lineNumber = view.state.doc.lineAt(line.from).number - 1
        const { infos, changedLines } = view.state.field(lineInfoField)
        const info = infos[lineNumber]
        if (!info) return null
        return new SyllableMarker(
          info.syllableCount,
          info.rhyme.label,
          info.rhyme.groupIndex,
          info.syllableExplanation,
          info.rhymeExplanation,
          changedLines.has(lineNumber),
        )
      },
      initialSpacer: () => new SyllableMarker(0, '', null, '', '', false),
      domEventHandlers: {
        click(view, line, event) {
          const lineNumber = view.state.doc.lineAt(line.from).number - 1
          const info = view.state.field(lineInfoField).infos[lineNumber]
          if (!info || (!info.syllableExplanation && !info.rhymeExplanation)) return false
          const mouseEvent = event as MouseEvent
          onClick({
            syllableExplanation: info.syllableExplanation,
            rhymeExplanation: info.rhymeExplanation,
            clientX: mouseEvent.clientX,
            clientY: mouseEvent.clientY,
          })
          return true
        },
      },
    }),
  ]
}


