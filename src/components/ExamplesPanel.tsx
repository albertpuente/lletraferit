import { useRef } from 'react'
import { EXAMPLE_POEMS } from '../structures/examples'
import { useClickOutside } from '../hooks/useClickOutside'

export interface ExamplesPanelProps {
  onClose: () => void
  onLoadExample: (title: string, content: string) => void
}

/** Popup containing the bundled complete poems, kept separate from the
 * metrical-analysis instructions so each task has a focused surface. */
export function ExamplesPanel({ onClose, onLoadExample }: ExamplesPanelProps) {
  const ref = useRef<HTMLDivElement>(null)
  useClickOutside(ref, onClose)

  return (
    <div
      ref={ref}
      className="absolute right-2 left-2 top-14 z-10 rounded-lg border border-stone-200 bg-[var(--paper-bg)] p-4 shadow-lg sm:left-auto sm:right-4 sm:w-96 dark:border-neutral-800 dark:bg-neutral-900"
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium text-stone-900 dark:text-neutral-100">Exemples</h2>
        <button
          className="touch-manipulation p-1 text-stone-400 hover:text-stone-700 dark:hover:text-neutral-200"
          onClick={onClose}
          aria-label="Tanca"
        >
          ✕
        </button>
      </div>

      <p className="mb-3 text-xs leading-relaxed text-stone-400 dark:text-neutral-500">
        Carrega un poema real a l'editor per veure com se n'analitzen les síl·labes i la rima.
      </p>

      <div className="flex flex-col gap-2">
        {EXAMPLE_POEMS.map((example) => (
          <button
            key={example.id}
            className="touch-manipulation rounded-md border border-stone-200 bg-white px-3 py-2 text-left hover:bg-stone-100 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:bg-neutral-700"
            onClick={() => onLoadExample(example.title, example.content)}
          >
            <div className="text-sm font-medium text-stone-800 dark:text-neutral-200">{example.title}</div>
            <div className="text-[11px] text-stone-400 dark:text-neutral-500">{example.attribution}</div>
          </button>
        ))}
      </div>
    </div>
  )
}