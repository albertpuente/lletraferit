import { EditorView, Decoration, ViewPlugin } from '@codemirror/view'
import type { ViewUpdate } from '@codemirror/view'
import { StateField, StateEffect } from '@codemirror/state'
import type { Extension } from '@codemirror/state'

/** How long a freshly-typed range stays tracked before being pruned. The fade-in
 * CSS animation itself is much shorter; this TTL just bounds memory growth. */
const TYPED_RANGE_TTL_MS = 1200

interface TypedRange {
  from: number
  to: number
  time: number
}

/** Forces a re-evaluation of `typedRangesField` (dropping now-stale ranges)
 * even when no further typing happens, since the field's `update` otherwise
 * only runs on doc-changing transactions and would keep every character
 * individually marked `cm-typed` forever after the last keystroke. That's
 * harmless for the one-shot fade-in animation itself (it just sits at its
 * end state), but those lingering per-character decoration boundaries force
 * *other* mark decorations spanning the same text (e.g. the syllable
 * curves) to be split one character at a time too, breaking their visual
 * continuity — hence actively pruning this instead of leaving it to chance. */
const pruneTypedRanges = StateEffect.define<null>()

/** Tracks recently-inserted text ranges and decorates them with a class that
 * triggers a subtle fade-in animation, giving typing a gentle, tactile feel. */
const typedRangesField = StateField.define<TypedRange[]>({
  create() {
    return []
  },
  update(value, tr) {
    const isPrune = tr.effects.some((e) => e.is(pruneTypedRanges))
    if (!tr.docChanged && !isPrune) return value

    const now = Date.now()
    const mapped = tr.docChanged
      ? value.map((r) => ({ from: tr.changes.mapPos(r.from, 1), to: tr.changes.mapPos(r.to, -1), time: r.time }))
      : value.slice()
    const pruned = mapped.filter((r) => r.to > r.from && now - r.time < TYPED_RANGE_TTL_MS)

    // Only animate ranges that came from actual keyboard typing/pasting, not
    // from programmatic edits (inserting a chosen synonym, opening/loading a
    // document, etc.) — those should update instantly without the fade-in.
    const isTypingEvent = tr.docChanged && (tr.isUserEvent('input.type') || tr.isUserEvent('input.paste'))
    if (isTypingEvent) {
      tr.changes.iterChangedRanges((_fromA, _toA, fromB, toB) => {
        if (toB > fromB) pruned.push({ from: fromB, to: toB, time: now })
      })
    }

    return pruned.sort((a, b) => a.from - b.from)
  },
  provide: (field) =>
    EditorView.decorations.from(field, (ranges) =>
      Decoration.set(ranges.map((r) => Decoration.mark({ class: 'cm-typed' }).range(r.from, r.to))),
    ),
})

/** Schedules the prune effect shortly after the TTL following each edit, so
 * stale `cm-typed` ranges clear themselves out instead of lingering until
 * (if ever) the next keystroke. */
const pruneScheduler = ViewPlugin.fromClass(
  class {
    timer: ReturnType<typeof setTimeout> | null = null

    update(update: ViewUpdate) {
      if (!update.docChanged) return
      if (this.timer) clearTimeout(this.timer)
      const view = update.view
      this.timer = setTimeout(() => {
        this.timer = null
        view.dispatch({ effects: pruneTypedRanges.of(null) })
      }, TYPED_RANGE_TTL_MS + 50)
    }

    destroy() {
      if (this.timer) clearTimeout(this.timer)
    }
  },
)

export const typingAnimation: Extension = [typedRangesField, pruneScheduler]
