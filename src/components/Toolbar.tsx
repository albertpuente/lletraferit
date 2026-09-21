import { useEffect, useState } from 'react'
import type { SaveStatus } from '../hooks/useDocument'

// Shown once, briefly, so first-time users notice the composition-help
// panel; dismissed permanently (via localStorage) as soon as it's been
// seen, whether the user clicks it or just lets it time out.
const STRUCTURES_HINT_KEY = 'lletraferit:seen-structures-hint'
const STRUCTURES_HINT_DURATION_MS = 5000

const STATUS_LABEL: Record<SaveStatus, string> = {
  idle: '',
  saving: 'Desant…',
  saved: 'Desat',
  'needs-permission': 'Cal reconnectar el fitxer',
  error: 'Error en desar',
}

export interface ToolbarProps {
  name: string
  onNameChange: (name: string) => void
  status: SaveStatus
  hasFileHandle: boolean
  onNew: () => void
  onOpen: () => void
  onSave: () => void
  onSaveAs: () => void
  onReconnect: () => void
  onToggleSettings: () => void
  onToggleStructures: () => void
  onToggleAbout: () => void
}

export function Toolbar({
  name,
  onNameChange,
  status,
  hasFileHandle,
  onNew,
  onOpen,
  onSave,
  onSaveAs,
  onReconnect,
  onToggleSettings,
  onToggleStructures,
  onToggleAbout,
}: ToolbarProps) {
  const [showStructuresHint, setShowStructuresHint] = useState(
    () => typeof window !== 'undefined' && !window.localStorage.getItem(STRUCTURES_HINT_KEY),
  )

  useEffect(() => {
    if (!showStructuresHint) return
    const timer = window.setTimeout(() => dismissStructuresHint(), STRUCTURES_HINT_DURATION_MS)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showStructuresHint])

  function dismissStructuresHint() {
    setShowStructuresHint(false)
    window.localStorage.setItem(STRUCTURES_HINT_KEY, '1')
  }

  return (
    <header className="flex flex-wrap items-center gap-2 border-b border-stone-200 px-3 py-2 sm:gap-3 sm:px-4 sm:py-2.5 dark:border-neutral-800">
      <Logo />

      <div className="mx-1 hidden h-5 w-px bg-stone-200 sm:block dark:bg-neutral-800" aria-hidden="true" />

      <div className="flex flex-wrap items-center gap-1">
        <ToolbarButton onClick={onNew} title="Nou poema (⌘N)">
          Nou
        </ToolbarButton>
        <ToolbarButton onClick={onOpen} title="Obre un fitxer (⌘O)">
          Obre
        </ToolbarButton>
        <ToolbarButton onClick={onSave} title="Desa (⌘S)">
          Desa
        </ToolbarButton>
        <ToolbarButton onClick={onSaveAs} title="Anomena i desa (⇧⌘S)">
          Anomena i desa
        </ToolbarButton>
      </div>

      <input
        className="min-w-[8rem] flex-1 truncate bg-transparent px-2 text-base text-stone-500 outline-none focus:text-stone-900 sm:text-sm dark:focus:text-neutral-100"
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        aria-label="Nom del document"
      />

      <div className="flex shrink-0 items-center gap-2">
        <div className="flex items-center gap-2 text-xs text-stone-400 dark:text-neutral-500">
          {status === 'needs-permission' && hasFileHandle ? (
            <button
              className="touch-manipulation rounded-full bg-amber-100 px-2.5 py-1 text-amber-800 hover:bg-amber-200 dark:bg-amber-950 dark:text-amber-300"
              onClick={onReconnect}
            >
              {STATUS_LABEL[status]}
            </button>
          ) : (
            <span>{STATUS_LABEL[status]}</span>
          )}
        </div>

        <ToolbarIconButton
          onClick={() => {
            if (showStructuresHint) dismissStructuresHint()
            onToggleStructures()
          }}
          title="Estructures de composició (ajuda)"
          className={showStructuresHint ? 'animate-soft-blink' : undefined}
        >
          <BookIcon />
        </ToolbarIconButton>

        <ToolbarIconButton onClick={onToggleAbout} title="Quant a">
          <InfoIcon />
        </ToolbarIconButton>

        <ToolbarIconButton onClick={onToggleSettings} title="Configuració">
          <GearIcon />
        </ToolbarIconButton>
      </div>
    </header>
  )
}

function Logo() {
  return (
    <div className="flex shrink-0 items-center select-none" title="Lletraferit">
      <span className="font-serif text-lg italic tracking-tight text-stone-900 dark:text-neutral-100">
        Lletra<span className="text-red-700 dark:text-red-400">ferit</span>
      </span>
    </div>
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
}: {
  children: React.ReactNode
  onClick: () => void
  title: string
  className?: string
}) {
  return (
    <button
      className={`touch-manipulation rounded-md p-1.5 text-stone-600 hover:bg-stone-100 dark:text-neutral-300 dark:hover:bg-neutral-800${className ? ` ${className}` : ''}`}
      onClick={onClick}
      onPointerDown={(e) => e.stopPropagation()}
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

function BookIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M12 6.5c-1.5-1-3.5-1.5-5.5-1.5-1 0-2 .1-3 .4v13c1-.3 2-.4 3-.4 2 0 4 .5 5.5 1.5V6.5Z" />
      <path d="M12 6.5c1.5-1 3.5-1.5 5.5-1.5 1 0 2 .1 3 .4v13c-1-.3-2-.4-3-.4-2 0-4 .5-5.5 1.5V6.5Z" />
    </svg>
  )
}

function InfoIcon() {
  return (
    <svg {...ICON_PROPS}>
      <circle cx="12" cy="12" r="8.25" />
      <path d="M12 11v5.5" />
      <circle cx="12" cy="8" r="0.75" fill="currentColor" stroke="none" />
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
