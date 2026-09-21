import { useEffect } from 'react'

/** Reflects the "paper texture" setting as a class on <body>, so the subtle
 * grain background (defined in index.css) can be toggled without re-rendering
 * the whole app. Mirrors the approach used by useTheme for the `dark` class. */
export function usePaperTexture(enabled: boolean): void {
  useEffect(() => {
    document.body.classList.toggle('paper-texture', enabled)
  }, [enabled])
}
