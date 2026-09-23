import { useEffect, useRef } from 'react'

export interface MetricsPopupProps {
  x: number
  y: number
  syllableExplanation: string
  rhymeExplanation: string
  feetExplanation: string
  onClose: () => void
}

export function MetricsPopup({ x, y, syllableExplanation, rhymeExplanation, feetExplanation, onClose }: MetricsPopupProps) {
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

  return (
    <div
      ref={ref}
      className="fixed z-20 max-h-72 w-72 max-w-[calc(100vw-1rem)] overflow-auto rounded-lg border border-stone-200 bg-[var(--paper-bg)] p-3 text-sm shadow-lg dark:border-neutral-800 dark:bg-neutral-900"
      style={{ left: x, top: y }}
    >
      {syllableExplanation && (
        <div className="mb-2 last:mb-0">
          <div className="mb-1 text-[11px] uppercase tracking-wide text-stone-400 dark:text-neutral-500">
            Síl·labes
          </div>
          <p className="text-xs leading-relaxed text-stone-600 dark:text-neutral-300">{syllableExplanation}</p>
        </div>
      )}

      {rhymeExplanation && (
        <div className="mb-2 last:mb-0">
          <div className="mb-1 text-[11px] uppercase tracking-wide text-stone-400 dark:text-neutral-500">Rima</div>
          <p className="text-xs leading-relaxed text-stone-600 dark:text-neutral-300">{rhymeExplanation}</p>
        </div>
      )}

      {feetExplanation && (
        <div className="last:mb-0">
          <div className="mb-1 text-[11px] uppercase tracking-wide text-stone-400 dark:text-neutral-500">Peus i ritme</div>
          <p className="text-xs leading-relaxed text-stone-600 dark:text-neutral-300">{feetExplanation}</p>
        </div>
      )}
    </div>
  )
}
