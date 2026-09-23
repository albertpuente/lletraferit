import { useEffect, useMemo, useRef } from 'react'
import type { MutableRefObject } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { EditorView } from '@codemirror/view'
import { syllableGutter, setVariant } from './extensions/lineInfo'
import type { MetricsClickInfo } from './extensions/lineInfo'
import { spellcheckDecoration, setUnknownWords } from './extensions/spellcheckDecoration'
import { wordClickExtension } from './extensions/wordClick'
import type { WordClickInfo } from './extensions/wordClick'
import { typingAnimation } from './extensions/typingAnimation'
import { rhymeHighlight, setHighlightedRhymeGroup } from './extensions/rhymeHighlight'
import { syllableCurves, setSyllableCurvesLine, setShowAllSyllableCurves } from './extensions/syllableCurves'
import { footBoundaries, setShowFootBoundaries } from './extensions/footBoundaries'
import { stressDots, setStressDotsLine, setShowAllStressDots } from './extensions/stressDots'
import { findWordTokens } from './tokenize'
import type { SpellChecker } from '../spellcheck/client'
import type { CatalanVariant } from '../engine/types'

const SPELLCHECK_DEBOUNCE_MS = 400

function createBaseTheme(dark: boolean, fontSize: number) {
  return EditorView.theme(
    {
      '&': {
        fontSize: `calc(${fontSize}px * var(--editor-font-scale, 1))`,
        backgroundColor: 'transparent',
        color: `var(--editor-text-color, ${dark ? '#f5f5f5' : '#1c1917'})`,
      },
      '.cm-content': {
        fontFamily: 'var(--font-editor)',
        letterSpacing: 'var(--editor-letter-spacing)',
        lineHeight: '2',
        padding: '8px 0',
        caretColor: `var(--editor-text-color, ${dark ? '#f5f5f5' : '#1c1917'})`,
      },
      '.cm-scroller': { overflow: 'auto' },
      '.cm-gutters': {
        border: 'none',
        backgroundColor: 'transparent',
      },
      '.cm-syllable-gutter': {
        minWidth: '2.2em',
        textAlign: 'left',
        color: 'inherit',
        userSelect: 'none',
      },
      '.cm-syllable-gutter .cm-gutterElement': {
        // Each gutter row is sized by CodeMirror to match its verse's full
        // line height; center the (smaller-font) badge within that row so
        // it lines up with the text instead of hugging the row's top edge.
        display: 'flex',
        alignItems: 'center',
      },
      '.cm-syllable-badge': {
        display: 'inline-grid',
        gridTemplateColumns: '1.6em auto',
        alignItems: 'baseline',
        columnGap: '0.3em',
        fontVariantNumeric: 'tabular-nums',
        fontSize: '13px',
        paddingLeft: '0.4em',
      },
      '.cm-syllable-count': {
        textAlign: 'right',
        opacity: 0.45,
        cursor: 'pointer',
      },
      '.cm-rhyme-letter': {
        textAlign: 'left',
        fontSize: '12px',
        fontWeight: 600,
        cursor: 'pointer',
      },
      '.cm-stress-dots-layer': {
        color: 'inherit',
        // Shift dots and their foot-connector lines as one overlay, keeping
        // their measured alignment intact while bringing them nearer to the
        // verse. The pencil theme supplies a slightly larger offset.
        transform: 'translateY(var(--stress-dots-offset, 1px))',
      },
      '.cm-stress-dot': {
        // Positioned by the layer itself (see extensions/stressDots.ts,
        // which measures real glyph coordinates via RectangleMarker), not
        // by CSS: `.cm-layer > *` already applies `position: absolute` and
        // each marker's left/top/width/height are set inline per-instance.
        // Being a layer overlay entirely outside the text's normal layout
        // flow, it can never shift or resize the verse's own characters.
        // The border is included in the inline marker dimensions, so
        // outlined atonic dots have exactly the same outer diameter as
        // their solid tonic counterparts.
        boxSizing: 'border-box',
        borderRadius: '50%',
        pointerEvents: 'none',
      },
      '.cm-stress-dot-tonic': {
        backgroundColor: dark ? '#fff' : '#000',
      },
      '.cm-stress-dot-atonic': {
        // In dark mode, match the application's neutral-950 editor surface
        // so this remains a hollow circle instead of looking solid white.
        backgroundColor: dark ? '#0a0a0a' : '#fff',
        border: `1px solid ${dark ? '#fff' : '#000'}`,
      },
      '.cm-foot-connector': {
        // Also a plain layer marker (see extensions/stressDots.ts): drawn
        // from the *measured* pixel positions of a foot's first and last
        // dot CENTER, then pushed into the markers array before the dots
        // themselves — so it paints first and the (fully opaque) dots
        // above naturally occlude its endpoints, reading as a line that
        // passes *behind* the dots rather than poking out past them.
        backgroundColor: dark ? '#fff' : '#000',
        pointerEvents: 'none',
      },
      '.cm-foot-connector-fade-out': {
        background: `linear-gradient(to right, ${dark ? '#fff' : '#000'}, transparent)`,
      },
      '.cm-foot-connector-fade-in': {
        background: `linear-gradient(to right, transparent, ${dark ? '#fff' : '#000'})`,
      },
      '.cm-activeLineGutter': {
        backgroundColor: 'transparent',
      },
      '.cm-activeLine': {
        backgroundColor: 'transparent',
      },
      '.cm-syllable-curve': {
        // `.cm-syllable-curve` wraps the verse's own text (it's a mark
        // decoration spanning each syllable), so `opacity` here would dim
        // the letters themselves, not just the underline — the verse must
        // always render in its normal, full-strength color. Fading is
        // applied only to the border's color (via color-mix), never to
        // the element itself.
        borderBottom: '2px solid color-mix(in srgb, currentColor 50%, transparent)',
        borderRadius: '0 0 60% 60% / 0 0 45% 45%',
        paddingBottom: '3px',
        // A mark can split across several visual rows when a long verse
        // wraps. Clone its curve decoration per fragment so it ends softly
        // at one row and resumes cleanly below instead of bridging the wrap.
        boxDecorationBreak: 'clone',
        WebkitBoxDecorationBreak: 'clone',
      },
      '.cm-metric-foot': {
        backgroundColor: 'color-mix(in srgb, var(--editor-text-color, #78716c) 8%, transparent)',
        borderBottom: '1px dashed color-mix(in srgb, var(--editor-text-color, #78716c) 40%, transparent)',
      },
      '.cm-foot-anapest, .cm-foot-dactyl, .cm-foot-amphibrach': {
        backgroundColor: 'color-mix(in srgb, #8b5cf6 12%, transparent)',
      },
      '.cm-foot-iamb, .cm-foot-trochee': {
        backgroundColor: 'color-mix(in srgb, #0ea5e9 10%, transparent)',
      },
      '&.cm-focused': { outline: 'none' },
    },
    { dark },
  )
}

export interface CatalanEditorProps {
  value: string
  onChange: (value: string) => void
  spellChecker: SpellChecker | null
  dark: boolean
  variant: CatalanVariant
  fontSize: number
  ignoredWords: ReadonlySet<string>
  onWordClick: (info: WordClickInfo) => void
  onMetricsClick: (info: MetricsClickInfo) => void
  /** Rhyme group whose syllables should be highlighted across all verses, or
   * null to clear the highlight (e.g. when the metrics popup closes). */
  highlightedRhymeGroup: number | null
  /** 0-based line whose metrical syllables should be underlined with curves,
   * or null to clear them (e.g. when the metrics popup closes). */
  activeMetricsLine: number | null
  /** When true, every verse's metrical syllables are permanently underlined
   * with curves, overriding `activeMetricsLine`'s single-line behavior. */
  showAllSyllableCurves: boolean
  showFootBoundaries: boolean
  /** When true, every verse's stress dots are permanently shown, overriding
   * `activeMetricsLine`'s single-line behavior — mirrors
   * `showAllSyllableCurves`. */
  showAllStressDots: boolean
  /** Current caret line, used by the asynchronous verse-ending suggestions. */
  onCursorLineChange: (lineIndex: number) => void
  /** Screen position of the caret, used to anchor suggestion results. */
  onCursorPositionChange: (position: { left: number; top: number; bottom: number }) => void
  handleRef?: MutableRefObject<CatalanEditorHandle | null>
}

export interface CatalanEditorHandle {
  replaceRange: (from: number, to: number, text: string) => void
  insertAtCursor: (text: string, replacePrefix?: string) => void
}

export function CatalanEditor({
  value,
  onChange,
  spellChecker,
  dark,
  variant,
  fontSize,
  ignoredWords,
  onWordClick,
  onMetricsClick,
  highlightedRhymeGroup,
  activeMetricsLine,
  showAllSyllableCurves,
  showFootBoundaries,
  showAllStressDots,
  onCursorLineChange,
  onCursorPositionChange,
  handleRef,
}: CatalanEditorProps) {
  const viewRef = useRef<EditorView | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function syncPencilPaperRules(view: EditorView): void {
    const content = view.dom.querySelector<HTMLElement>('.cm-content')
    if (!content) return
    // A `.cm-line` is the browser's actual visual verse row, so its box is
    // more reliable than a nominal font-size calculation (especially for
    // platform handwriting fonts and user-adjusted text sizes).
    const firstLine = content.querySelector<HTMLElement>('.cm-line')
    const lineRect = firstLine?.getBoundingClientRect()
    const main = view.dom.closest('main')
    const mainRect = main?.getBoundingClientRect()
    const root = document.documentElement
    root.style.setProperty('--pencil-rule-height', `${lineRect?.height || view.defaultLineHeight}px`)
    // The paper grid is painted on the scrolling <main> surface, so its
    // origin must be measured in that surface's scrollable coordinate space
    // rather than against the viewport.
    const fallbackTop = content.getBoundingClientRect().top + 8
    const mainScrollTop = main instanceof HTMLElement ? main.scrollTop : 0
    const relativeTop = (lineRect?.top ?? fallbackTop) - (mainRect?.top ?? 0) + mainScrollTop
    root.style.setProperty('--pencil-rule-origin', `${relativeTop}px`)
  }

  // The notebook rules are painted by the page background so they can span
  // the entire viewport. Keep their grid aligned with the editor's actual
  // content position and measured line height as the viewport is resized,
  // the main writing area scrolls, or a visual-theme class changes the font.
  useEffect(() => {
    const view = viewRef.current
    if (!view) return

    const sync = () => syncPencilPaperRules(view)
    sync()
    const main = view.dom.closest('main')
    const observer = new ResizeObserver(sync)
    observer.observe(view.dom)
    const themeObserver = new MutationObserver(sync)
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    window.addEventListener('resize', sync)
    main?.addEventListener('scroll', sync, { passive: true })
    return () => {
      observer.disconnect()
      themeObserver.disconnect()
      window.removeEventListener('resize', sync)
      main?.removeEventListener('scroll', sync)
    }
  }, [dark, fontSize])

  const extensions = useMemo(
    () => [
      createBaseTheme(dark, fontSize),
      syllableGutter(onMetricsClick),
      rhymeHighlight,
      syllableCurves,
      footBoundaries,
      stressDots,
      spellcheckDecoration,
      wordClickExtension(onWordClick),
      typingAnimation,
      EditorView.updateListener.of((update) => {
        if (!update.docChanged && !update.selectionSet) return
        const cursor = update.state.selection.main.head
        onCursorLineChange(update.state.doc.lineAt(cursor).number - 1)
        const coords = update.view.coordsAtPos(cursor)
        if (coords) onCursorPositionChange({ left: coords.left, top: coords.top, bottom: coords.bottom })
      }),
      EditorView.lineWrapping,
    ],
    [dark, fontSize, onWordClick, onMetricsClick, onCursorLineChange],
  )

  useEffect(() => {
    viewRef.current?.dispatch({ effects: setVariant.of(variant) })
  }, [variant])

  useEffect(() => {
    viewRef.current?.dispatch({
      effects: setHighlightedRhymeGroup.of(
        highlightedRhymeGroup !== null && activeMetricsLine !== null
          ? { groupIndex: highlightedRhymeGroup, lineIndex: activeMetricsLine }
          : null,
      ),
    })
  }, [highlightedRhymeGroup, activeMetricsLine])

  useEffect(() => {
    viewRef.current?.dispatch({ effects: setSyllableCurvesLine.of(activeMetricsLine) })
  }, [activeMetricsLine])

  useEffect(() => {
    viewRef.current?.dispatch({ effects: setStressDotsLine.of(activeMetricsLine) })
  }, [activeMetricsLine])

  useEffect(() => {
    viewRef.current?.dispatch({ effects: setShowAllSyllableCurves.of(showAllSyllableCurves) })
  }, [showAllSyllableCurves])

  useEffect(() => {
    viewRef.current?.dispatch({ effects: setShowFootBoundaries.of(showFootBoundaries) })
  }, [showFootBoundaries])

  useEffect(() => {
    viewRef.current?.dispatch({ effects: setShowAllStressDots.of(showAllStressDots) })
  }, [showAllStressDots])

  useEffect(() => {
    if (!spellChecker) {
      // Spellchecking was turned off (or the worker isn't ready yet): clear
      // any existing wavy-underline decorations rather than leaving stale
      // ones on screen.
      viewRef.current?.dispatch({ effects: setUnknownWords.of(new Set()) })
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(async () => {
      const tokens = findWordTokens(value)
      const uniqueWords = Array.from(new Set(tokens.map((t) => t.word.toLowerCase())))
      const unknown = await spellChecker.checkWords(uniqueWords)
      const view = viewRef.current
      if (!view) return
      const filtered = unknown.filter((word) => !ignoredWords.has(word))
      view.dispatch({ effects: setUnknownWords.of(new Set(filtered)) })
    }, SPELLCHECK_DEBOUNCE_MS)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [value, spellChecker, ignoredWords])

  return (
    <CodeMirror
      value={value}
      onChange={onChange}
      extensions={extensions}
      theme="none"
      basicSetup={{ lineNumbers: false, foldGutter: false, highlightActiveLine: true }}
      onCreateEditor={(view) => {
        viewRef.current = view
        // Effects normally synchronize from the hooks above. On a reload,
        // however, persisted settings can finish loading before this callback
        // assigns `viewRef`, causing an effect dispatch to be skipped. Seed
        // every display-related field here as well, so the editor always
        // reflects the current checkbox state from its first rendered frame.
        view.dispatch({
          effects: [
            setVariant.of(variant),
            setHighlightedRhymeGroup.of(
              highlightedRhymeGroup !== null && activeMetricsLine !== null
                ? { groupIndex: highlightedRhymeGroup, lineIndex: activeMetricsLine }
                : null,
            ),
            setSyllableCurvesLine.of(activeMetricsLine),
            setStressDotsLine.of(activeMetricsLine),
            setShowAllSyllableCurves.of(showAllSyllableCurves),
            setShowFootBoundaries.of(showFootBoundaries),
            setShowAllStressDots.of(showAllStressDots),
          ],
        })
        const cursorCoords = view.coordsAtPos(view.state.selection.main.head)
        if (cursorCoords) {
          onCursorPositionChange({ left: cursorCoords.left, top: cursorCoords.top, bottom: cursorCoords.bottom })
        }
        syncPencilPaperRules(view)
        if (handleRef) {
          handleRef.current = {
            replaceRange: (from, to, text) => {
              view.dispatch({ changes: { from, to, insert: text } })
            },
            insertAtCursor: (text, replacePrefix = '') => {
              const { from, to } = view.state.selection.main
              const prefixStart = from - replacePrefix.length
              const currentPrefix =
                replacePrefix && prefixStart >= 0 ? view.state.doc.sliceString(prefixStart, from) : ''
              if (currentPrefix.toLocaleLowerCase() === replacePrefix.toLocaleLowerCase()) {
                view.dispatch({ changes: { from: prefixStart, to, insert: text } })
                return
              }
              const previous = from > 0 ? view.state.doc.sliceString(from - 1, from) : ''
              const separator = previous && !/\s/.test(previous) ? ' ' : ''
              view.dispatch({ changes: { from, to, insert: `${separator}${text}` } })
            },
          }
        }
      }}
      placeholder="Comença a escriure el teu poema…"
    />
  )
}
