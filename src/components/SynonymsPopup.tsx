import { useEffect, useRef } from 'react'
import type { SynonymResult } from '../synonyms/client'

export interface SynonymsPopupProps {
  word: string
  matchedWord: string
  x: number
  y: number
  loading: boolean
  results: SynonymResult[]
  isUnknown: boolean
  onSelect: (synonym: string) => void
  onIgnoreWord: (word: string) => void
  onClose: () => void
}

export function SynonymsPopup({
  word,
  matchedWord,
  x,
  y,
  loading,
  results,
  isUnknown,
  onSelect,
  onIgnoreWord,
  onClose,
}: SynonymsPopupProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handlePointerDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  const isBaseForm = !loading && results.length > 0 && matchedWord.toLowerCase() !== word.toLowerCase()

  return (
    <div
      ref={ref}
      className="fixed z-20 max-h-72 w-64 max-w-[calc(100vw-1rem)] overflow-auto rounded-lg border border-stone-200 bg-[#f8f5ee] p-3 text-sm shadow-lg dark:border-neutral-800 dark:bg-neutral-900"
      style={{ left: x, top: y }}
    >
      <div className="mb-2 text-xs font-medium text-stone-400 dark:text-neutral-500">
        Sinònims de <span className="italic text-stone-600 dark:text-neutral-300">{word}</span>
      </div>

      {isBaseForm && (
        <div className="mb-2 text-[11px] leading-relaxed text-stone-400 dark:text-neutral-500">
          No hi ha entrada per "{word}"; mostrant sinònims de{' '}
          <span className="italic text-stone-600 dark:text-neutral-300">{matchedWord}</span>.
        </div>
      )}

      {isUnknown && (
        <button
          className="mb-2 w-full touch-manipulation rounded-md bg-amber-50 px-2 py-1 text-left text-[11px] text-amber-800 hover:bg-amber-100 dark:bg-amber-950 dark:text-amber-300 dark:hover:bg-amber-900"
          onClick={() => onIgnoreWord(word)}
        >
          Afegeix "{word}" al diccionari personal
        </button>
      )}

      {loading && <div className="text-xs text-stone-400 dark:text-neutral-500">Cercant…</div>}


      {!loading && results.length === 0 && (
        <div className="text-xs text-stone-400 dark:text-neutral-500">Cap sinònim trobat.</div>
      )}

      {!loading &&
        results.map((group, i) => (
          <div key={i} className="mb-2 last:mb-0">
            <div className="mb-1 text-[11px] uppercase tracking-wide text-stone-400 dark:text-neutral-500">
              {group.pos}
            </div>
            <div className="flex flex-wrap gap-1">
              {group.words.map((w) => (
                <button
                  key={w}
                  className="rounded-full bg-stone-100 px-2 py-0.5 text-stone-700 hover:bg-violet-100 hover:text-violet-800 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-violet-950 dark:hover:text-violet-300"
                  onClick={() => onSelect(w)}
                >
                  {w}
                </button>
              ))}
            </div>
          </div>
        ))}
    </div>
  )
}
