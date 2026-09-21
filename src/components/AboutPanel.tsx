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
      className="absolute right-2 left-2 top-14 z-10 max-h-[80vh] overflow-auto rounded-lg border border-stone-200 bg-[#f6efe0] p-4 shadow-lg sm:left-auto sm:right-4 sm:w-80 dark:border-neutral-800 dark:bg-neutral-900"
    >
      <p className="mb-3 font-serif text-base italic leading-relaxed text-stone-700 dark:text-neutral-300">
        Una eina petita escrita amb IA, per gaudir de l'escriptura sense ella.
      </p>

      <p className="mb-3 text-xs leading-relaxed text-stone-400 dark:text-neutral-500">
        Versió Alpha - Segurament conté errors.
      </p>

      <p className="mb-3 text-xs leading-relaxed text-stone-400 dark:text-neutral-500">
        Lletraferit és un projecte de codi obert: 
        
        <br/>

        <a href="https://github.com/albertpuente/lletraferit" className="underline">GitHub - Albert Puente Encinas</a>.
      </p>
    </div>
  )
}
