import { useRef } from 'react'
import { COMMON_METRIC_FEET_EXAMPLES, METRIC_FEET_REFERENCE } from '../structures/definitions'
import { analyzeVerse, describeFeetPattern, hyphenateStressPattern } from '../engine'
import { useClickOutside } from '../hooks/useClickOutside'

export interface PeusPanelProps {
  onClose: () => void
  showAllStressDots: boolean
  onToggleShowAllStressDots: (value: boolean) => void
}

/** Reference panel for Catalan metrical feet (peus mètrics): the five most
 * commonly taught rhythms with real, live-scanned examples, the full
 * classical catalogue, and a note on alexandrí caesura — split out from the
 * click-to-analyze instructions and the poem-structures catalog so each has
 * a focused, single-purpose surface. */
export function PeusPanel({ onClose, showAllStressDots, onToggleShowAllStressDots }: PeusPanelProps) {
  const ref = useRef<HTMLDivElement>(null)
  useClickOutside(ref, onClose)

  return (
    <div
      ref={ref}
      className="absolute right-2 left-2 top-14 z-10 max-h-[75vh] overflow-auto rounded-lg border border-stone-200 bg-[var(--paper-bg)] p-4 shadow-lg sm:left-auto sm:right-4 sm:w-96 dark:border-neutral-800 dark:bg-neutral-900"
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium text-stone-900 dark:text-neutral-100">Peus mètrics</h2>
        <button
          className="touch-manipulation p-1 text-stone-600 hover:text-stone-700 dark:hover:text-neutral-200"
          onClick={onClose}
          aria-label="Tanca"
        >
          ✕
        </button>
      </div>

      <p className="mb-2 text-xs leading-relaxed text-stone-600 dark:text-neutral-500">
        En català, un peu descriu el ritme de síl·labes àtones (○) i tòniques (●). Pot travessar mots. L'anapest,
        per exemple, és ○○●; l'anàlisi indica el ritme predominant sense modificar el recompte de síl·labes.
      </p>

      <label className="mb-4 flex items-center justify-between rounded-md border border-stone-200 px-3 py-2 text-xs text-stone-600 dark:border-neutral-700 dark:text-neutral-300">
        <span>Mostra sempre els punts de ritme</span>
        <input
          type="checkbox"
          className="h-4 w-4 shrink-0 accent-stone-600 dark:accent-neutral-400"
          checked={showAllStressDots}
          onChange={(e) => onToggleShowAllStressDots(e.target.checked)}
        />
      </label>

      <div className="mb-3 space-y-2">
        {COMMON_METRIC_FEET_EXAMPLES.map(([name, verse]) => (
          <div key={name} className="text-xs leading-relaxed text-stone-600 dark:text-neutral-300">
            <span className="font-medium text-stone-800 dark:text-neutral-100">{name}</span>
            <span className="ml-2 font-mono font-semibold tracking-wide">
              {describeFeetPattern(analyzeVerse(verse).feetAnalysis.feet)}
            </span>
            <p className="text-stone-600 dark:text-neutral-400">{verse}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-stone-600 dark:text-neutral-300">
        {METRIC_FEET_REFERENCE.map(([name, pattern]) => (
          <span key={name} className="flex justify-between gap-1">
            <span>{name}</span>
            <span className="font-mono font-semibold tracking-wide">{hyphenateStressPattern(pattern)}</span>
          </span>
        ))}
      </div>

      <p className="mt-2 text-xs leading-relaxed text-stone-600 dark:text-neutral-500">
        En un alexandrí de 12 síl·labes, l'aplicació assenyala orientativament la cesura després de la sisena,
        separant dos hemistiquis de sis síl·labes.
      </p>
    </div>
  )
}
