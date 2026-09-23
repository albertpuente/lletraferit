import { useEffect, useState } from 'react'
import type { SaveStatus } from '../hooks/useDocument'

const INSTRUCTIONS_HINT_DELAY_MS = 1000
const COPIED_TOAST_DURATION_MS = 2000

export interface ToolbarProps {
  name: string
  /** Whether there are changes since the last successful save, shown as a
   * small dot next to the filename rather than any "saved"/"unsaved" text. */
  isDirty: boolean
  /** Transient save-action feedback (e.g. a brief error indicator) — not a
   * persistent "saved" status. */
  status: SaveStatus
  /** Human-readable detail shown as a tooltip when `status === 'error'`. */
  errorMessage: string | null
  hasFileHandle: boolean
  onNew: () => void
  onOpen: () => void
  onSave: () => void
  /** Copies the document's text to the clipboard; should reject/throw on
   * failure so the confirmation toast is only shown on genuine success. */
  onCopy: () => Promise<void>
  onToggleSettings: () => void
  onToggleInstructions: () => void
  onToggleStructures: () => void
  onTogglePeus: () => void
  onToggleExamples: () => void
}

export function Toolbar({
  name,
  isDirty,
  status,
  errorMessage,
  hasFileHandle,
  onNew,
  onOpen,
  onSave,
  onCopy,
  onToggleSettings,
  onToggleInstructions,
  onToggleStructures,
  onTogglePeus,
  onToggleExamples,
}: ToolbarProps) {
  // Draws attention to the Instructions button with a crimson triple-blink
  // shortly after the app loads, every time it's opened (not just the
  // first time ever), so it stays useful as a recurring nudge rather than
  // a one-off hint. Delayed so it doesn't fire before the page has settled.
  const [instructionsHintPending, setInstructionsHintPending] = useState(true)
  const [showInstructionsHint, setShowInstructionsHint] = useState(false)
  const [showCopiedToast, setShowCopiedToast] = useState(false)

  async function handleCopy() {
    try {
      await onCopy()
      setShowCopiedToast(true)
      window.setTimeout(() => setShowCopiedToast(false), COPIED_TOAST_DURATION_MS)
    } catch {
      // Clipboard write failed (e.g. permission denied): fail silently
      // rather than showing a confirmation for something that didn't happen.
    }
  }

  useEffect(() => {
    if (!instructionsHintPending) return
    const timer = window.setTimeout(() => setShowInstructionsHint(true), INSTRUCTIONS_HINT_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [instructionsHintPending])

  function dismissInstructionsHint() {
    setInstructionsHintPending(false)
    setShowInstructionsHint(false)
  }

  // The displayed "name" mirrors the hasFileHandle distinction: a document
  // not yet linked to a real file has no meaningful filename to show (its
  // internal name is just an untitled placeholder), so show "No desat"
  // instead of that placeholder.
  const displayName = hasFileHandle ? name : 'No desat'

  return (
    <header className="relative border-b border-stone-200 dark:border-neutral-800">
      {showCopiedToast && (
        <div
          role="status"
          className="pointer-events-none absolute top-full left-1/2 z-30 mt-2 -translate-x-1/2 rounded-full bg-emerald-600 px-3 py-1 text-xs font-medium text-white shadow-lg"
        >
          Copiat al porta-retalls
        </div>
      )}

      {/* Row 1: logo + actions, always on one line. On narrow (phone-width)
       * screens the filename and remaining icons move to row 2 below; from
       * the `sm` breakpoint up everything fits on a single row instead (see
       * the `sm:hidden` / `hidden sm:flex` pairs below). */}
      <div className="flex items-center gap-2 px-3 py-2 sm:gap-3 sm:px-4 sm:py-2.5">
        <Logo />

        <div className="mx-1 hidden h-5 w-px bg-stone-200 sm:block dark:bg-neutral-800" aria-hidden="true" />

        <div className="ml-auto flex flex-wrap items-center gap-1 sm:ml-0">
          <ToolbarButton onClick={onNew} title="Nou poema (⌘N)">
            Nou
          </ToolbarButton>
          <ToolbarButton onClick={onOpen} title="Obre un fitxer (⌘O)">
            Obre
          </ToolbarButton>
          <ToolbarButton onClick={onSave} title="Desa (⌘S)">
            Desa
          </ToolbarButton>
          <ToolbarButton onClick={handleCopy} title="Copia el text al porta-retalls">
            Copia
          </ToolbarButton>
        </div>

        <span
          className="hidden min-w-[8rem] flex-1 items-center gap-1.5 truncate px-2 text-sm text-stone-500 sm:flex dark:text-neutral-400"
          title={status === 'error' ? errorMessage ?? undefined : displayName}
        >
          <span className="truncate">{displayName}</span>
          <UnsavedDot isDirty={isDirty} hasError={status === 'error'} />
        </span>

        <div className="ml-auto hidden shrink-0 items-center gap-2 sm:flex">
          <ToolbarIconButton
            onClick={() => {
              if (instructionsHintPending) dismissInstructionsHint()
              onToggleInstructions()
            }}
            title="Instruccions"
            className={showInstructionsHint ? 'animate-structures-hint' : undefined}
            onAnimationEnd={dismissInstructionsHint}
          >
            <InfoIcon />
          </ToolbarIconButton>

          <ToolbarIconButton onClick={onToggleStructures} title="Estructures poètiques">
            <DocumentLinesIcon />
          </ToolbarIconButton>

          <ToolbarIconButton onClick={onTogglePeus} title="Peus mètrics">
            <MetronomeIcon />
          </ToolbarIconButton>

          <ToolbarIconButton onClick={onToggleExamples} title="Exemples de poemes">
            <BookmarkIcon />
          </ToolbarIconButton>

          <ToolbarIconButton onClick={onToggleSettings} title="Configuració">
            <GearIcon />
          </ToolbarIconButton>
        </div>
      </div>

      {/* Row 2: narrow screens only — filename on the left, structures/about/
       * settings icons on the right. */}
      <div className="flex items-center gap-2 px-3 pb-2 sm:hidden">
        <span
          className="flex min-w-0 flex-1 items-center gap-1.5 truncate text-sm text-stone-500 dark:text-neutral-400"
          title={status === 'error' ? errorMessage ?? undefined : displayName}
        >
          <span className="truncate">{displayName}</span>
          <UnsavedDot isDirty={isDirty} hasError={status === 'error'} />
        </span>

        <div className="flex shrink-0 items-center gap-2">
          <ToolbarIconButton
            onClick={() => {
              if (instructionsHintPending) dismissInstructionsHint()
              onToggleInstructions()
            }}
            title="Instruccions"
            className={showInstructionsHint ? 'animate-structures-hint' : undefined}
            onAnimationEnd={dismissInstructionsHint}
          >
            <InfoIcon />
          </ToolbarIconButton>

          <ToolbarIconButton onClick={onToggleStructures} title="Estructures poètiques">
            <DocumentLinesIcon />
          </ToolbarIconButton>

          <ToolbarIconButton onClick={onTogglePeus} title="Peus mètrics">
            <MetronomeIcon />
          </ToolbarIconButton>

          <ToolbarIconButton onClick={onToggleExamples} title="Exemples de poemes">
            <BookmarkIcon />
          </ToolbarIconButton>

          <ToolbarIconButton onClick={onToggleSettings} title="Configuració">
            <GearIcon />
          </ToolbarIconButton>
        </div>
      </div>
    </header>
  )
}

function Logo() {
  // The app's brand mark intentionally stays visually identical across all
  // visual themes (see Settings > "Estil" and index.css), unlike the editor
  // font/accent color/paper background, which do vary per theme.
  return (
    <div className="flex shrink-0 items-center select-none" title="Lletraferit">
      <span className="font-serif text-xl italic tracking-tight text-stone-900 dark:text-neutral-100">
        Lletra<span className="text-red-700 dark:text-red-400">ferit</span>
      </span>
    </div>
  )
}

/** A small dot next to the filename indicating unsaved changes — replaces
 * any "Desat"/"Cal reconnectar el fitxer" text status entirely. Amber for
 * ordinary unsaved changes, red if the last save attempt failed. */
function UnsavedDot({ isDirty, hasError }: { isDirty: boolean; hasError: boolean }) {
  if (!isDirty && !hasError) return null
  return (
    <span
      className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${hasError ? 'bg-red-500' : 'bg-amber-500'}`}
      aria-label={hasError ? 'Error en desar' : 'Canvis sense desar'}
    />
  )
}

function ToolbarButton({
  children,
  onClick,
  title,
}: {
  children: React.ReactNode
  onClick: () => void
  title: string
}) {
  return (
    <button
      className="touch-manipulation rounded-md px-2.5 py-1.5 text-sm text-stone-600 hover:bg-stone-100 sm:py-1 dark:text-neutral-300 dark:hover:bg-neutral-800"
      onClick={onClick}
      title={title}
    >
      {children}
    </button>
  )
}

function ToolbarIconButton({
  children,
  onClick,
  title,
  className,
  onAnimationEnd,
}: {
  children: React.ReactNode
  onClick: () => void
  title: string
  className?: string
  onAnimationEnd?: () => void
}) {
  return (
    <button
      className={`touch-manipulation rounded-md p-1.5 text-stone-600 hover:bg-stone-100 dark:text-neutral-300 dark:hover:bg-neutral-800${className ? ` ${className}` : ''}`}
      onClick={onClick}
      onPointerDown={(e) => e.stopPropagation()}
      onAnimationEnd={onAnimationEnd}
      title={title}
      aria-label={title}
    >
      {children}
    </button>
  )
}

const ICON_PROPS = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  className: 'h-5 w-5',
  'aria-hidden': true,
}

/** Estructures icon: a document/page with multiple horizontal lines,
 * representing the catalogue of stanza/verse-line templates shown in that
 * panel (as opposed to Peus mètrics, which is about rhythm, not layout). */
function DocumentLinesIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M6.5 3.5h8l4 4v13a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1v-16a1 1 0 0 1 1-1Z" />
      <path d="M14.5 3.5v4h4" />
      <path d="M8.25 12h7.5" />
      <path d="M8.25 15.25h7.5" />
      <path d="M8.25 18.5h4.5" />
    </svg>
  )
}

/** Instructions icon: a plain info circle, for the panel explaining how to
 * read the editor's metrics gutter (now also home to the app's About/credits
 * section). Sized up slightly from the shared default: its circular
 * artwork fills less of the 24x24 viewBox than e.g. DocumentLinesIcon's
 * rectangular one, so at the shared size it visually read smaller. */
function InfoIcon() {
  return (
    <svg {...ICON_PROPS} className="h-[22px] w-[22px]">
      <circle cx="12" cy="12" r="8.25" />
      <path d="M12 11v5.5" />
      <circle cx="12" cy="8" r="0.75" fill="currentColor" stroke="none" />
    </svg>
  )
}

/** Peus mètrics icon: a metronome — the classic, immediately-recognizable
 * symbol for rhythm, tempo, and pacing, matching what a metrical foot
 * describes. The pendulum arm pivots from the base (bottom center) and
 * swings up to one side, mid-beat, rather than resting straight up. Sized
 * up slightly, like InfoIcon, since its narrow triangular silhouette fills
 * less of the viewBox width than a squarer icon does. */
function MetronomeIcon() {
  return (
    <svg {...ICON_PROPS} className="h-[22px] w-[22px]">
      <path d="M12 4.5 17 20.5 7 20.5Z" />
      <path d="M8 20.5h8" />
      <path d="M12 19 16.2 7.3" />
      <circle cx="16.2" cy="7.3" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

/** Sized up slightly, like InfoIcon/MetronomeIcon: its narrow pennant shape
 * fills less of the viewBox width than a squarer icon does. */
function BookmarkIcon() {
  return (
    <svg {...ICON_PROPS} className="h-[22px] w-[22px]">
      <path d="M7 4.5h10v16l-5-3-5 3Z" />
    </svg>
  )
}

function GearIcon() {
  return (
    <svg {...ICON_PROPS}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}
