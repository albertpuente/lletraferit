import { EditorView, RectangleMarker, layer } from '@codemirror/view'
import type { ViewUpdate } from '@codemirror/view'
import { EditorSelection, StateEffect, StateField } from '@codemirror/state'
import type { Extension } from '@codemirror/state'
import { lineInfoField } from './lineInfo'

/** Which line (0-based) should show its stress dots, set when the user
 * clicks that line's metrics gutter and cleared when the popup closes.
 * Ignored while "show all" mode (below) is on. Mirrors
 * `setSyllableCurvesLine` in syllableCurves.ts. */
export const setStressDotsLine = StateEffect.define<number | null>()

const stressDotsLineField = StateField.define<number | null>({
  create: () => null,
  update(value, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setStressDotsLine)) return effect.value
    }
    return value
  },
})

/** Permanently shows every verse's stress dots at once (Peus panel toggle),
 * rather than only the currently-clicked line's. */
export const setShowAllStressDots = StateEffect.define<boolean>()

const showAllStressDotsField = StateField.define<boolean>({
  create: () => false,
  update(value, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setShowAllStressDots)) return effect.value
    }
    return value
  },
})

/** Fixed physical pixel diameter for every stress dot, independent of the
 * editor's font size, zoom, verse length, or stress. Tonic dots are solid
 * and atonic dots use the same outer diameter with a contrasting outline
 * and interior; their black/white colors invert for dark mode (see the
 * `.cm-stress-dot-*` CSS rules in CatalanEditor.tsx). */
const DOT_SIZE = 7
/** Gap between the dot row and the top of its own verse's text — small
 * enough that dots read as belonging to their own line rather than
 * colliding with the line above. */
const LINE_GAP = 3
const CONNECTOR_THICKNESS = 1.5

/** The y-coordinate (document-relative) of the shared horizontal center
 * that every dot on this line and its foot-connector line are aligned to. */
function dotRowCenterY(lineTop: number): number {
  return lineTop - LINE_GAP - DOT_SIZE / 2
}

/** Document-relative `{ left, top }` of the glyph at `pos` (its own line's
 * left edge and top), or null if `pos` currently isn't rendered (e.g.
 * scrolled out of the viewport). Reuses `RectangleMarker.forRange`'s
 * internal coordinate conversion (view coordinates → the document-relative
 * ones `layer()` markers expect) rather than reimplementing it, since that
 * conversion isn't otherwise exposed by `@codemirror/view`. */
function documentRelativePos(view: EditorView, pos: number): { left: number; top: number } | null {
  const [marker] = RectangleMarker.forRange(view, '', EditorSelection.cursor(pos, 1))
  return marker ? { left: marker.left, top: marker.top } : null
}

function buildMarkers(view: EditorView): RectangleMarker[] {
  const showAll = view.state.field(showAllStressDotsField)
  const activeLine = view.state.field(stressDotsLineField)
  if (!showAll && activeLine === null) return []

  const { infos } = view.state.field(lineInfoField)
  const doc = view.state.doc
  const markers: RectangleMarker[] = []
  // Shifts every dot/connector one character's width to the right, so a
  // dot sits above the middle of the syllable's first letter rather than
  // flush against its left edge (which otherwise reads as hovering just
  // before the syllable instead of over it).
  const charOffset = view.defaultCharacterWidth

  const lineNumbers = showAll
    ? Array.from({ length: Math.min(infos.length, doc.lines) }, (_, i) => i)
    : activeLine !== null && activeLine >= 0 && activeLine < doc.lines
      ? [activeLine]
      : []

  for (const lineNumber of lineNumbers) {
    const info = infos[lineNumber]
    if (!info) continue
    const line = doc.line(lineNumber + 1)

    // Document-relative anchor point (line-top, character-left) for every
    // syllable, computed once and reused for both this syllable's own dot
    // and any foot-connector line that starts or ends on it.
    const points = info.metricalSyllables.map((s) => {
      if (s.to <= s.from) return null
      const pos = documentRelativePos(view, line.from + s.from)
      return pos ? { left: pos.left + charOffset, top: pos.top } : null
    })

    // A thin line connecting the dots of each recognized (non-"irregular")
    // foot with two or more syllables, computed from the real measured
    // pixel positions of its first and last syllable — unlike wrapping the
    // underlying text in a bordered <span>, this can't be fragmented or
    // misaligned by the dot widgets sitting inside the same range. Pushed
    // into `markers` BEFORE the dots themselves (below), so — per
    // CodeMirror's layer rendering, which paints markers in array order —
    // it's painted first and the opaque dots on top of it occlude its
    // endpoints, reading as a line passing behind the dots rather than
    // poking out past them.
    for (const foot of info.metricFeet) {
      if (foot.type === 'irregular' || foot.syllableIndices.length < 2) continue
      const first = points[foot.syllableIndices[0]]
      const last = points[foot.syllableIndices[foot.syllableIndices.length - 1]]
      if (!first || !last || first.left === last.left) continue
      const centerY = dotRowCenterY(first.top)
      const left = Math.min(first.left, last.left)
      const width = Math.abs(last.left - first.left)
      markers.push(
        new RectangleMarker('cm-foot-connector', left, centerY - CONNECTOR_THICKNESS / 2, width, CONNECTOR_THICKNESS),
      )
    }

    for (let i = 0; i < info.metricalSyllables.length; i++) {
      const stress = info.syllableStresses[i]
      const point = points[i]
      if (!stress || !point) continue
      const centerY = dotRowCenterY(point.top)
      markers.push(
        new RectangleMarker(
          `cm-stress-dot cm-stress-dot-${stress}`,
          point.left - DOT_SIZE / 2,
          centerY - DOT_SIZE / 2,
          DOT_SIZE,
          DOT_SIZE,
        ),
      )
    }
  }
  return markers
}

function shouldUpdate(update: ViewUpdate): boolean {
  return (
    update.docChanged ||
    update.viewportChanged ||
    update.geometryChanged ||
    update.startState.field(lineInfoField) !== update.state.field(lineInfoField) ||
    update.startState.field(stressDotsLineField) !== update.state.field(stressDotsLineField) ||
    update.startState.field(showAllStressDotsField) !== update.state.field(showAllStressDotsField)
  )
}

/** Shows each verse's rhythm directly above its own text — a small dot
 * above the start of every counted syllable (sinalefa-fused syllables
 * included, one dot at the fused unit's start): a contrasting outlined dot
 * for atonic and a solid dot for tonic, all sharing one level row —
 * connected by a thin line across each recognized metrical
 * foot, passing behind the dots so only the gaps between them show —
 * only for the currently-clicked verse (see `setStressDotsLine`), or for
 * every verse at once when "show all" mode is on (see
 * `setShowAllStressDots`), mirroring `syllableCurves`.
 *
 * Implemented as a `layer()` (the same mechanism CodeMirror uses to draw
 * selection backgrounds) rather than inline mark/widget decorations: dots
 * and connector lines are plain absolutely-positioned elements measured
 * from real glyph coordinates, entirely outside the text's normal layout
 * flow. This guarantees they can never shift the verse's own characters
 * (unlike a zero-size inline widget, which can still perturb line-box
 * metrics in some browsers) and that connector lines are pixel-exact
 * between dot centers instead of a bordered text-wrapping span that gets
 * fragmented — and visibly seamed — by the dot widgets sitting inside it. */
export const stressDots: Extension = [
  stressDotsLineField,
  showAllStressDotsField,
  layer({
    above: true,
    class: 'cm-stress-dots-layer',
    markers: buildMarkers,
    update: shouldUpdate,
  }),
]

