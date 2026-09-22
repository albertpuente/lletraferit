import { GutterMarker, gutter } from '@codemirror/view'
import { StateEffect, StateField } from '@codemirror/state'
import type { Extension } from '@codemirror/state'
import { analyzeDocument } from '../analysis'
import type { LineInfo } from '../analysis'
import type { CatalanVariant } from '../../engine/types'

export const setVariant = StateEffect.define<CatalanVariant>()

export interface MetricsClickInfo {
  syllableExplanation: string
  rhymeExplanation: string
  /** Rhyme group of the clicked verse, so its rhyming syllables (and those
   * of other verses sharing the group) can be highlighted. */
  rhymeGroupIndex: number | null
  /** 0-based line index of the clicked verse, so its metrical syllables can
   * be shown as curves while the popup is open. */
  lineIndex: number
  /** Viewport bounds of the clicked line, used to position the popup so it
   * never covers the verse it describes. */
  lineLeft: number
  lineTop: number
  lineBottom: number
}

interface LineInfoState {
  variant: CatalanVariant
  infos: LineInfo[]
}

export const lineInfoField = StateField.define<LineInfoState>({
  create(state) {
    return { variant: 'central', infos: analyzeDocument(state.doc.toString(), 'central') }
  },
  update(value, tr) {
    let variant = value.variant
    for (const effect of tr.effects) {
      if (effect.is(setVariant)) variant = effect.value
    }
    if (!tr.docChanged && variant === value.variant) return value

    return { variant, infos: analyzeDocument(tr.state.doc.toString(), variant) }
  },
})

class SyllableMarker extends GutterMarker {
  readonly count: number
  readonly rhymeLabel: string
  readonly rhymeGroupIndex: number | null
  readonly syllableExplanation: string
  readonly rhymeExplanation: string

  constructor(
    count: number,
    rhymeLabel: string,
    rhymeGroupIndex: number | null,
    syllableExplanation: string,
    rhymeExplanation: string,
  ) {
    super()
    this.count = count
    this.rhymeLabel = rhymeLabel
    this.rhymeGroupIndex = rhymeGroupIndex
    this.syllableExplanation = syllableExplanation
    this.rhymeExplanation = rhymeExplanation
  }

  eq(other: SyllableMarker) {
    return (
      other.count === this.count &&
      other.rhymeLabel === this.rhymeLabel &&
      other.rhymeGroupIndex === this.rhymeGroupIndex &&
      other.syllableExplanation === this.syllableExplanation &&
      other.rhymeExplanation === this.rhymeExplanation
    )
  }

  toDOM() {
    const wrapper = document.createElement('span')
    wrapper.className = 'cm-syllable-badge'

    const countSpan = document.createElement('span')
    countSpan.className = 'cm-syllable-count'
    countSpan.textContent = this.count > 0 ? String(this.count) : ''
    wrapper.appendChild(countSpan)

    if (this.rhymeLabel) {
      const letterSpan = document.createElement('span')
      letterSpan.className = `cm-rhyme-letter rhyme-text-${(this.rhymeGroupIndex ?? 0) % 8}`
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
        const { infos } = view.state.field(lineInfoField)
        const info = infos[lineNumber]
        if (!info) return null
        return new SyllableMarker(
          info.syllableCount,
          info.rhyme.label,
          info.rhyme.groupIndex,
          info.syllableExplanation,
          info.rhymeExplanation,
        )
      },
      initialSpacer: () => new SyllableMarker(0, '', null, '', ''),
      domEventHandlers: {
        click(view, line) {
          const lineNumber = view.state.doc.lineAt(line.from).number - 1
          const info = view.state.field(lineInfoField).infos[lineNumber]
          if (!info || (!info.syllableExplanation && !info.rhymeExplanation)) return false
          const lineRect = view.coordsAtPos(line.from)
          if (!lineRect) return false
          onClick({
            syllableExplanation: info.syllableExplanation,
            rhymeExplanation: info.rhymeExplanation,
            rhymeGroupIndex: info.rhyme.groupIndex,
            lineIndex: lineNumber,
            lineLeft: lineRect.left,
            lineTop: lineRect.top,
            lineBottom: lineRect.bottom,
          })
          return true
        },
      },
    }),
  ]
}


