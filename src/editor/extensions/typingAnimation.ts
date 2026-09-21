import { EditorView, Decoration } from '@codemirror/view'
import { StateField } from '@codemirror/state'
import type { Extension } from '@codemirror/state'

/** How long a freshly-typed range stays tracked before being pruned. The fade-in
 * CSS animation itself is much shorter; this TTL just bounds memory growth. */
const TYPED_RANGE_TTL_MS = 1200

interface TypedRange {
  from: number
  to: number
  time: number
}

/** Tracks recently-inserted text ranges and decorates them with a class that
 * triggers a subtle fade-in animation, giving typing a gentle, tactile feel. */
const typedRangesField = StateField.define<TypedRange[]>({
  create() {
    return []
  },
  update(value, tr) {
    if (!tr.docChanged) return value

    const now = Date.now()
    const mapped = value
      .map((r) => ({ from: tr.changes.mapPos(r.from, 1), to: tr.changes.mapPos(r.to, -1), time: r.time }))
      .filter((r) => r.to > r.from && now - r.time < TYPED_RANGE_TTL_MS)

    // Only animate ranges that came from actual keyboard typing/pasting, not
    // from programmatic edits (inserting a chosen synonym, opening/loading a
    // document, etc.) — those should update instantly without the fade-in.
    const isTypingEvent = tr.isUserEvent('input.type') || tr.isUserEvent('input.paste')
    if (isTypingEvent) {
      tr.changes.iterChangedRanges((_fromA, _toA, fromB, toB) => {
        if (toB > fromB) mapped.push({ from: fromB, to: toB, time: now })
      })
    }

    return mapped.sort((a, b) => a.from - b.from)
  },
  provide: (field) =>
    EditorView.decorations.from(field, (ranges) =>
      Decoration.set(ranges.map((r) => Decoration.mark({ class: 'cm-typed' }).range(r.from, r.to))),
    ),
})

export const typingAnimation: Extension = typedRangesField
