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
import { findWordTokens } from './tokenize'
import type { SpellChecker } from '../spellcheck/client'
import type { CatalanVariant } from '../engine/types'

const SPELLCHECK_DEBOUNCE_MS = 400

function createBaseTheme(dark: boolean) {
  return EditorView.theme(
    {
      '&': {
        fontSize: '19px',
        backgroundColor: 'transparent',
        color: dark ? '#f5f5f5' : '#1c1917',
      },
      '.cm-content': {
        fontFamily: "'iA Writer Quattro', 'Georgia', serif",
        lineHeight: '2',
        padding: '8px 0',
        caretColor: dark ? '#f5f5f5' : '#1c1917',
      },
      '.cm-scroller': { overflow: 'auto' },
      '.cm-syllable-gutter': {
        minWidth: '3.4em',
        textAlign: 'left',
        color: 'inherit',
        userSelect: 'none',
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
      '.cm-gutters': { border: 'none', backgroundColor: 'transparent' },
      '.cm-activeLineGutter': {
        backgroundColor: 'transparent',
      },
      '.cm-activeLine': {
        backgroundColor: 'transparent',
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
  ignoredWords: ReadonlySet<string>
  onWordClick: (info: WordClickInfo) => void
  onMetricsClick: (info: MetricsClickInfo) => void
  handleRef?: MutableRefObject<CatalanEditorHandle | null>
}

export interface CatalanEditorHandle {
  replaceRange: (from: number, to: number, text: string) => void
}

export function CatalanEditor({
  value,
  onChange,
  spellChecker,
  dark,
  variant,
  ignoredWords,
  onWordClick,
  onMetricsClick,
  handleRef,
}: CatalanEditorProps) {
  const viewRef = useRef<EditorView | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const extensions = useMemo(
    () => [
      createBaseTheme(dark),
      syllableGutter(onMetricsClick),
      spellcheckDecoration,
      wordClickExtension(onWordClick),
      typingAnimation,
      EditorView.lineWrapping,
    ],
    [dark, onWordClick, onMetricsClick],
  )

  useEffect(() => {
    viewRef.current?.dispatch({ effects: setVariant.of(variant) })
  }, [variant])

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
        view.dispatch({ effects: setVariant.of(variant) })
        if (handleRef) {
          handleRef.current = {
            replaceRange: (from, to, text) => {
              view.dispatch({ changes: { from, to, insert: text } })
            },
          }
        }
      }}
      placeholder="Comença a escriure el teu poema…"
    />
  )
}
