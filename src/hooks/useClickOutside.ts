import { useEffect } from 'react'
import type { RefObject } from 'react'

/** Calls `onOutsideClick` when a pointerdown lands outside `ref`'s element,
 * or when Escape is pressed. Used to close dropdown-style panels (Settings,
 * Structures, About, etc.) when the user clicks/taps elsewhere. */
export function useClickOutside(ref: RefObject<HTMLElement | null>, onOutsideClick: () => void): void {
  useEffect(() => {
    function handlePointerDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onOutsideClick()
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onOutsideClick()
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [ref, onOutsideClick])
}
