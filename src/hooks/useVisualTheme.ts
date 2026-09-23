import { useEffect } from 'react'
import type { VisualTheme } from '../storage/db'

const THEME_CLASSES: Record<VisualTheme, string | null> = {
  classic: null,
  typewriter: 'theme-typewriter',
  modern: 'theme-modern',
  pencil: 'theme-pencil',
}

/** Reflects the "visual theme" setting (accent color, editor font, paper
 * background — see index.css) as a class on <html>, alongside (and
 * independent of) the light/dark `.dark` class toggled by useTheme. The
 * app's own logo is intentionally unaffected by this setting. */
export function useVisualTheme(visualTheme: VisualTheme): void {
  useEffect(() => {
    const root = document.documentElement
    for (const className of Object.values(THEME_CLASSES)) {
      if (className) root.classList.remove(className)
    }
    const className = THEME_CLASSES[visualTheme]
    if (className) root.classList.add(className)
  }, [visualTheme])
}
