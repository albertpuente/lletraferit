import { useEffect, useState } from 'react'
import type { AppSettings } from '../storage/db'

function systemPrefersDark(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
}

/** Resolves the effective light/dark theme from the user's setting, tracks
 * system preference changes when set to "system", and reflects the result
 * as a `dark` class on the document root so Tailwind's `dark:` variant and
 * the editor can react to it. */
export function useTheme(themeSetting: AppSettings['theme']): boolean {
  const [systemDark, setSystemDark] = useState(systemPrefersDark)

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  const isDark = themeSetting === 'system' ? systemDark : themeSetting === 'dark'

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
  }, [isDark])

  return isDark
}
