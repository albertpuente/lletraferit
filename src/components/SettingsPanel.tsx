import { useRef } from 'react'
import type { AppSettings } from '../storage/db'
import { FONT_SIZE_MAX, FONT_SIZE_MIN, FONT_SIZE_STEP, getDefaultFontSize } from '../storage/db'
import type { CatalanVariant } from '../engine/types'
import { useClickOutside } from '../hooks/useClickOutside'

export interface SettingsPanelProps {
  settings: AppSettings
  onChange: (partial: Partial<AppSettings>) => void
  onClose: () => void
}

export function SettingsPanel({ settings, onChange, onClose }: SettingsPanelProps) {
  const ref = useRef<HTMLDivElement>(null)
  useClickOutside(ref, onClose)

  // Defensive fallback in case a corrupted value (e.g. a stray NaN) ever
  // makes it into persisted settings, so the control never gets stuck.
  const defaultFontSize = getDefaultFontSize()
  const fontSize = Number.isFinite(settings.fontSize) ? settings.fontSize : defaultFontSize

  return (
    <div
      ref={ref}
      className="absolute right-2 left-2 top-14 z-10 max-h-[80vh] overflow-auto rounded-lg border border-stone-200 bg-[#f6efe0] p-4 shadow-lg sm:left-auto sm:right-4 sm:w-72 dark:border-neutral-800 dark:bg-neutral-900"
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium text-stone-900 dark:text-neutral-100">Configuració</h2>
        <button
          className="touch-manipulation p-1 text-stone-400 hover:text-stone-700 dark:hover:text-neutral-200"
          onClick={onClose}
          aria-label="Tanca"
        >
          ✕
        </button>
      </div>

      <label className="mb-3 block text-xs text-stone-500 dark:text-neutral-400">
        Variant del català
        <select
          className="mt-1 w-full rounded-md border border-stone-200 bg-transparent px-2 py-1.5 text-base text-stone-900 sm:text-sm dark:border-neutral-700 dark:text-neutral-100"
          value={settings.variant}
          onChange={(e) => onChange({ variant: e.target.value as CatalanVariant })}
        >
          <option value="central">Central</option>
          <option value="valencia">Valencià</option>
        </select>
      </label>

      <label className="mb-3 block text-xs text-stone-500 dark:text-neutral-400">
        Tema
        <select
          className="mt-1 w-full rounded-md border border-stone-200 bg-transparent px-2 py-1.5 text-base text-stone-900 sm:text-sm dark:border-neutral-700 dark:text-neutral-100"
          value={settings.theme}
          onChange={(e) => onChange({ theme: e.target.value as AppSettings['theme'] })}
        >
          <option value="system">Sistema</option>
          <option value="light">Clar</option>
          <option value="dark">Fosc</option>
        </select>
      </label>

      <label className="mb-3 block text-xs text-stone-500 dark:text-neutral-400">
        Mida del text
        <div className="mt-1 flex items-center gap-2">
          <button
            className="touch-manipulation rounded-md border border-stone-200 px-2.5 py-1 text-base text-stone-700 hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
            onClick={() => onChange({ fontSize: Math.max(FONT_SIZE_MIN, fontSize - FONT_SIZE_STEP) })}
            disabled={fontSize <= FONT_SIZE_MIN}
            aria-label="Redueix la mida del text"
          >
            A−
          </button>
          <span className="min-w-[2.5em] text-center text-sm tabular-nums text-stone-600 dark:text-neutral-300">
            {fontSize}px
          </span>
          <button
            className="touch-manipulation rounded-md border border-stone-200 px-2.5 py-1 text-base text-stone-700 hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
            onClick={() => onChange({ fontSize: Math.min(FONT_SIZE_MAX, fontSize + FONT_SIZE_STEP) })}
            disabled={fontSize >= FONT_SIZE_MAX}
            aria-label="Augmenta la mida del text"
          >
            A+
          </button>
          <button
            className="touch-manipulation rounded-md px-2 py-1 text-xs text-stone-400 hover:text-stone-700 disabled:cursor-not-allowed disabled:opacity-40 dark:text-neutral-500 dark:hover:text-neutral-200"
            onClick={() => onChange({ fontSize: defaultFontSize })}
            disabled={fontSize === defaultFontSize}
          >
            Per defecte
          </button>
        </div>
      </label>

      <label className="mb-3 flex items-center justify-between text-xs text-stone-500 dark:text-neutral-400">
        <span>Textura de paper</span>
        <input
          type="checkbox"
          className="h-4 w-4 accent-stone-600 dark:accent-neutral-400"
          checked={settings.paperTexture}
          onChange={(e) => onChange({ paperTexture: e.target.checked })}
        />
      </label>

      <label className="mb-3 flex items-center justify-between text-xs text-stone-500 dark:text-neutral-400">
        <span>Correcció ortogràfica</span>
        <input
          type="checkbox"
          className="h-4 w-4 accent-stone-600 dark:accent-neutral-400"
          checked={settings.spellcheckEnabled}
          onChange={(e) => onChange({ spellcheckEnabled: e.target.checked })}
        />
      </label>

      {settings.ignoredWords.length > 0 && (
        <div className="mb-3">
          <div className="mb-1 text-xs text-stone-500 dark:text-neutral-400">
            Diccionari personal ({settings.ignoredWords.length})
          </div>
          <div className="flex max-h-32 flex-wrap gap-1 overflow-auto">
            {settings.ignoredWords.map((word) => (
              <button
                key={word}
                className="touch-manipulation rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600 hover:bg-stone-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
                title="Elimina del diccionari personal"
                onClick={() => onChange({ ignoredWords: settings.ignoredWords.filter((w) => w !== word) })}
              >
                {word} ✕
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="mb-3 text-xs leading-relaxed text-stone-400 dark:text-neutral-500">
        El comptatge de síl·labes i les rimes es calculen automàticament. Escriu una dièresi (ï/ü) per
        forçar un hiat on per defecte hi hauria una sinalefa o diftong.
      </p>

      <p className="text-xs leading-relaxed text-stone-400 dark:text-neutral-500">
        Els sinònims provenen del{' '}
        <a
          className="underline hover:text-stone-600 dark:hover:text-neutral-300"
          href="https://github.com/Softcatala/sinonims-cat"
          target="_blank"
          rel="noreferrer"
        >
          Diccionari de sinònims de Softcatalà
        </a>{' '}
        (CC-BY 4.0).
      </p>
    </div>
  )
}
