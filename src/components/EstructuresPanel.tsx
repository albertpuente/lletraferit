import { useRef } from 'react'
import { POEM_STRUCTURES } from '../structures/definitions'
import type { StructureVerse } from '../structures/definitions'
import { verseTypeName } from '../engine'
import { useClickOutside } from '../hooks/useClickOutside'

export interface EstructuresPanelProps {
  onClose: () => void
}

function VerseBadge({ verse }: { verse: StructureVerse }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md bg-stone-100 px-1.5 py-0.5 text-[11px] text-stone-600 dark:bg-neutral-800 dark:text-neutral-300"
      title={verseTypeName(verse.syllables)}
    >
      <span className="font-medium tabular-nums">{verse.syllables}</span>
      {verse.rhyme && <span className="text-violet-500 dark:text-violet-400">{verse.rhyme}</span>}
    </span>
  )
}

/** Reference catalog of classic Catalan poem structures (sonnet, quartets,
 * romanç, haiku…), split out from the click-to-analyze instructions and
 * the peus mètrics reference so each has a focused, single-purpose surface. */
export function EstructuresPanel({ onClose }: EstructuresPanelProps) {
  const ref = useRef<HTMLDivElement>(null)
  useClickOutside(ref, onClose)

  return (
    <div
      ref={ref}
      className="absolute right-2 left-2 top-14 z-10 max-h-[75vh] overflow-auto rounded-lg border border-stone-200 bg-[var(--paper-bg)] p-4 shadow-lg sm:left-auto sm:right-4 sm:w-96 dark:border-neutral-800 dark:bg-neutral-900"
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium text-stone-900 dark:text-neutral-100">Estructures</h2>
        <button
          className="touch-manipulation p-1 text-stone-600 hover:text-stone-700 dark:hover:text-neutral-200"
          onClick={onClose}
          aria-label="Tanca"
        >
          ✕
        </button>
      </div>

      <p className="mb-4 text-xs leading-relaxed text-stone-600 dark:text-neutral-500">
        Catàleg de formes clàssiques catalanes: nombre de síl·labes i esquema de rima de cada vers, com a ajuda per
        compondre.
      </p>

      <div className="flex flex-col gap-4">
        {POEM_STRUCTURES.map((structure) => (
          <div key={structure.id} className="border-t border-stone-100 pt-3 first:border-t-0 first:pt-0 dark:border-neutral-800">
            <h3 className="text-xs font-medium text-stone-800 dark:text-neutral-200">{structure.name}</h3>
            <p className="mt-0.5 mb-2 text-xs leading-relaxed text-stone-600 dark:text-neutral-500">
              {structure.description}
            </p>
            <div className="flex flex-col gap-1">
              {structure.stanzas.map((stanza, i) => (
                <div key={i} className="flex flex-wrap items-center gap-1">
                  {stanza.verses.map((verse, j) => (
                    <VerseBadge key={j} verse={verse} />
                  ))}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
