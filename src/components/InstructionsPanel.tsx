import { useRef } from 'react'
import { useClickOutside } from '../hooks/useClickOutside'

export interface InstructionsPanelProps {
  onClose: () => void
  showAllSyllableCurves: boolean
  onToggleShowAllSyllableCurves: (value: boolean) => void
}

/** A small cursor with click ripples, overlaid on the metrics badge in the
 * teaching illustration below. A conventional pointer stays legible at this
 * compact size, unlike a detailed hand whose fingers can blur together. */
function ClickPointerIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="m5 3 13 9.2-6.1 1.4L9.6 20z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="var(--paper-bg)"
      />
    </svg>
  )
}

/** Segments of "per sempre adéu!" that get an underline curve in the real
 * editor, precomputed from the actual engine output: "per" and "sem" each
 * stand alone, while "pre" (end of "sempre") and "a" (start of "adéu")
 * fuse into one curve via sinalefa, and "déu" stands alone again — 4
 * syllables total, matching the badge below. Kept as a static mockup
 * (rather than calling the engine here) since this is a fixed teaching
 * illustration, not a live analysis. */
const CLICK_EXAMPLE_SEGMENTS: { text: string; curve: boolean }[] = [
  { text: 'per', curve: true },
  { text: ' ', curve: false },
  { text: 'sem', curve: true },
  { text: 'pre a', curve: true },
  { text: 'déu', curve: true },
  { text: '!', curve: false },
]

/** A static "screenshot-like" mockup teaching the click-to-analyze
 * interaction: reproduces the gutter badge (syllable count + rhyme
 * letter) and underline curves shown next to a verse in the real editor,
 * plus the explanation popup that appears when either is clicked — all
 * using real, verified output from the metrics engine for the verse "per
 * sempre adéu!" (see EXAMPLE_POEMS's "L'emigrant"). */
function ClickToAnalyzeIllustration() {
  return (
    <div className="mb-4">
      <p className="mb-2 text-xs leading-relaxed text-stone-600 dark:text-neutral-500">
        Clica sobre un nombre o lletra per veure l'anàlisi:
      </p>
      <div className="mb-3 flex items-center gap-2 rounded-md border border-stone-200 bg-[var(--paper-bg)] px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800">
        <span className="relative flex shrink-0 items-center gap-1 tabular-nums">
          <ClickPointerIcon className="pointer-events-none absolute top-3 left-2 h-5 w-5 text-stone-700 dark:text-neutral-300" />
          <span className="cursor-pointer text-sm text-stone-600 dark:text-neutral-500">4</span>
          <span className="cursor-pointer text-xs font-semibold rhyme-text-1">b</span>
        </span>
        <span className="font-serif text-base text-stone-800 dark:text-neutral-200">
          {CLICK_EXAMPLE_SEGMENTS.map((seg, i) =>
            seg.curve ? (
              <span key={i} className="syllable-curve-demo">
                {seg.text}
              </span>
            ) : (
              <span key={i}>{seg.text}</span>
            ),
          )}
        </span>
      </div>

      <div className="rounded-md border border-stone-200 bg-[var(--paper-bg)] p-3 text-sm shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
        <div className="mb-2 last:mb-0">
          <div className="mb-1 text-[11px] uppercase tracking-wide text-stone-600 dark:text-neutral-500">
            Síl·labes
          </div>
          <p className="text-xs leading-relaxed text-stone-600 dark:text-neutral-300">
            5 síl·labes comptant cada paraula per separat, -1 per sinalefa (fusió de vocals entre paraules) = 4
            síl·labes.
          </p>
        </div>
        <div className="last:mb-0">
          <div className="mb-1 text-[11px] uppercase tracking-wide text-stone-600 dark:text-neutral-500">Rima</div>
          <p className="text-xs leading-relaxed text-stone-600 dark:text-neutral-300">
            Rima «b»: aquest vers acaba igual (des de la vocal tònica) que els altres versos marcats «b» en aquesta
            estrofa. És un vers d'art menor (8 síl·labes o menys).
          </p>
        </div>
      </div>
    </div>
  )
}

/** Panel explaining how to read/interact with the editor's metrics gutter
 * (syllable count, rhyme letter, apostrophe convention) — split out from
 * the reference catalogs (Estructures, Peus) so each has a focused,
 * single-purpose surface. Also hosts the app's About/credits section
 * (formerly a separate floating button), shown after a separator at the end. */
export function InstructionsPanel({
  onClose,
  showAllSyllableCurves,
  onToggleShowAllSyllableCurves,
}: InstructionsPanelProps) {
  const ref = useRef<HTMLDivElement>(null)
  useClickOutside(ref, onClose)

  return (
    <div
      ref={ref}
      className="absolute right-2 left-2 top-14 z-10 max-h-[75vh] overflow-auto rounded-lg border border-stone-200 bg-[var(--paper-bg)] p-4 shadow-lg sm:left-auto sm:right-4 sm:w-96 dark:border-neutral-800 dark:bg-neutral-900"
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium text-stone-900 dark:text-neutral-100">Instruccions</h2>
        <button
          className="touch-manipulation p-1 text-stone-600 hover:text-stone-700 dark:hover:text-neutral-200"
          onClick={onClose}
          aria-label="Tanca"
        >
          ✕
        </button>
      </div>

      <ClickToAnalyzeIllustration />

      <p className="mb-4 text-xs leading-relaxed text-stone-600 dark:text-neutral-500">
        El nombre indica les síl·labes del vers; la lletra, el
        grup de rima (versos sense lletra són versos blancs). Una lletra{' '}
        <span className="font-semibold text-stone-600 dark:text-neutral-400">majúscula</span> indica un
        vers d'art major (més de 8 síl·labes); una{' '}
        <span className="text-stone-600 dark:text-neutral-400">minúscula</span>, un vers d'art menor (8
        síl·labes o menys).
      </p>

      <label className="mb-4 flex items-center justify-between rounded-md border border-stone-200 px-3 py-2 text-xs text-stone-600 dark:border-neutral-700 dark:text-neutral-300">
        <span>Mostra sempre les corbes de síl·labes</span>
        <input
          type="checkbox"
          className="h-4 w-4 shrink-0 accent-stone-600 dark:accent-neutral-400"
          checked={showAllSyllableCurves}
          onChange={(e) => onToggleShowAllSyllableCurves(e.target.checked)}
        />
      </label>

      <p className="text-xs leading-relaxed text-stone-600 dark:text-neutral-500">
        Un apòstrof després de la lletra (per exemple{' '}
        <span className="font-medium text-stone-600 dark:text-neutral-400">a'</span> en comptes de{' '}
        <span className="font-medium text-stone-600 dark:text-neutral-400">a</span>) indica que la
        paraula final d'aquest vers és plana (rima femenina); sense apòstrof, el vers acaba en una
        paraula aguda o esdrúixola (rima masculina). És la convenció clàssica per distingir totes dues
        terminacions dins un mateix esquema de rima.
      </p>

      <hr className="my-4 border-stone-200 dark:border-neutral-800" />

      <p className="mb-2 font-serif text-base italic leading-relaxed text-stone-700 dark:text-neutral-300">
        <span className="inline-block font-serif text-md italic tracking-tight text-stone-900 dark:text-neutral-100">
          Lletra<span className="text-red-700 dark:text-red-400">ferit</span>
        </span>{' '}
        és un projecte de{' '}
        <a
          href="https://github.com/albertpuente/lletraferit"
          className="underline hover:text-stone-900 dark:hover:text-neutral-100"
          target="_blank"
          rel="noreferrer"
        >
          codi obert
        </a>.{' '}
        <br />
        La seva finalitat és ajudar a l'aprenentatge de la mètrica catalana i a l'escriptura de poesia.
      </p>

      <p className="mb-3 text-xs leading-relaxed text-stone-600 dark:text-neutral-500">
        Aquesta web és una versió alpha i segurament conté errors.
      </p>

      <a
        href="https://github.com/albertpuente/lletraferit/issues/new"
        className="mb-3 inline-flex items-center rounded-md border border-stone-300 px-3 py-2 text-xs font-medium text-stone-700 hover:bg-stone-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
        target="_blank"
        rel="noreferrer"
      >
        Envia un suggeriment o correcció
      </a>

      <p className="text-xs leading-relaxed text-stone-600 dark:text-neutral-500">
        Albert Puente Encinas
      </p>

      <p className="text-xs leading-relaxed text-stone-600 dark:text-neutral-500">
        Llicència:{' '}
        <a
          href="https://github.com/albertpuente/lletraferit/blob/main/LICENSE"
          className="underline hover:text-stone-600 dark:hover:text-neutral-300"
          target="_blank"
          rel="noreferrer"
        >
          GPL-3.0-or-later
        </a>
      </p>

      <p className="text-xs leading-relaxed text-stone-600 dark:text-neutral-500">
        <a
          href="https://github.com/Softcatala/sinonims-cat"
          className="underline hover:text-stone-600 dark:hover:text-neutral-300"
          target="_blank"
          rel="noreferrer"
        >
          Diccionari de sinònims de Softcatalà
        </a>{' '}
        (
        <a
          href="https://github.com/albertpuente/lletraferit/blob/main/LICENSE-SOFTCATALA"
          className="underline hover:text-stone-600 dark:hover:text-neutral-300"
          target="_blank"
          rel="noreferrer"
        >
          CC-BY 4.0
        </a>
        ).
      </p>

      <p className="text-xs leading-relaxed text-stone-600 dark:text-neutral-500">
        Formes verbals: verbecc (
        <a
          href={`${import.meta.env.BASE_URL}licenses/verbecc-LGPL-3.0.txt`}
          className="underline hover:text-stone-600 dark:hover:text-neutral-300"
          target="_blank"
          rel="noreferrer"
        >
          LGPL-3.0-or-later
        </a>
        ).
      </p>
    </div>
  )
}
