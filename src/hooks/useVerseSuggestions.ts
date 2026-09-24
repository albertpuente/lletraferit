import { useEffect, useMemo, useState } from 'react'
import { getVerseSuggestions } from '../suggestions/client'
import type { CatalanVariant, VerseSuggestion, VerseSuggestionTarget } from '../suggestions/client'

const SUGGESTION_DELAY_MS = 350

/** Builds a non-blocking suggestion query for the verse containing the caret.
 * Only the current stanza is considered, and at most its two preceding verses
 * are used as rhyme/metric models. */
export function useVerseSuggestions(content: string, activeLine: number, enabled: boolean, variant: CatalanVariant) {
  const [suggestions, setSuggestions] = useState<VerseSuggestion[]>([])
  const [loading, setLoading] = useState(false)

  const query = useMemo(() => {
    const lines = content.split('\n')
    const currentLine = lines[activeLine] ?? ''
    if (!enabled || activeLine <= 0 || currentLine.trim() === '') return null

    let stanzaStart = activeLine
    while (stanzaStart > 0 && lines[stanzaStart - 1].trim() !== '') stanzaStart--
    const stanzaLines = lines.slice(stanzaStart, activeLine)
    const targets: VerseSuggestionTarget[] = []
    for (let lineIndex = activeLine - 1; lineIndex >= 0 && targets.length < 2; lineIndex--) {
      const line = lines[lineIndex]
      if (line.trim() === '') break
      targets.push({ line, stanzaIndex: lineIndex - stanzaStart })
    }
    // Present the older reference first: two verses back, then the directly
    // preceding verse. This mirrors the reading order requested in the UI.
    targets.reverse()
    return targets.length > 0 ? { currentLine, targets, stanzaLines } : null
  }, [content, activeLine, enabled])

  useEffect(() => {
    if (!query) {
      setSuggestions([])
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    const timeout = window.setTimeout(() => {
      void getVerseSuggestions(query.currentLine, query.targets, query.stanzaLines, variant).then((next) => {
        if (cancelled) return
        setSuggestions(next)
        setLoading(false)
      })
    }, SUGGESTION_DELAY_MS)

    return () => {
      cancelled = true
      window.clearTimeout(timeout)
    }
  }, [query, variant])

  return { suggestions, loading }
}
