import { useRef } from 'react'
import { useClickOutside } from '../hooks/useClickOutside'

export interface AboutPanelProps {
  onClose: () => void
}

export function AboutPanel({ onClose }: AboutPanelProps) {
  const ref = useRef<HTMLDivElement>(null)
  useClickOutside(ref, onClose)

  return (
    <div
      ref={ref}
      className="fixed right-3 bottom-16 left-3 z-20 max-h-[80vh] overflow-auto rounded-lg border border-stone-200 bg-[var(--paper-bg)] p-4 shadow-lg sm:right-4 sm:left-auto sm:w-80 dark:border-neutral-800 dark:bg-neutral-900"
    >
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

      <p className="text-xs leading-relaxed text-stone-400 dark:text-neutral-500">
        Albert Puente Encinas
      </p>

      <p className="text-xs leading-relaxed text-stone-400 dark:text-neutral-500">
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

      <p className="text-xs leading-relaxed text-stone-400 dark:text-neutral-500">
        Versió Alpha - Segurament conté errors.
      </p>
    </div>
  )
}
