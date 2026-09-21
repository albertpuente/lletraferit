import { useCallback, useEffect, useState } from 'react'
import { DEFAULT_SETTINGS, getSettings, saveSettings } from '../storage/db'
import type { AppSettings } from '../storage/db'

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    getSettings().then((s) => {
      setSettings(s)
      setLoaded(true)
    })
  }, [])

  const update = useCallback(async (partial: Partial<AppSettings>) => {
    const next = await saveSettings(partial)
    setSettings(next)
  }, [])

  return { settings, update, loaded }
}
