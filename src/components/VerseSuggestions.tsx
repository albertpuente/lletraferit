import type { VerseSuggestion } from '../suggestions/client'

export interface VerseSuggestionsProps {
  suggestions: VerseSuggestion[]
  loading: boolean
  onSelect: (suggestion: VerseSuggestion) => void
}

/** Compact, passive word-ending suggestions. They are deliberately rendered
 * outside CodeMirror, so searching and showing them can never disturb text
 * layout, selection, or keystroke latency. */
export function VerseSuggestions({ suggestions, loading, onSelect }: VerseSuggestionsProps) {
  const groups = suggestions.reduce<{ colorIndex: number; rhymeLabel: string; suggestions: VerseSuggestion[] }[]>(
    (result, suggestion) => {
      const previous = result.at(-1)
      if (previous && previous.colorIndex === suggestion.colorIndex && previous.rhymeLabel === suggestion.rhymeLabel) {
        previous.suggestions.push(suggestion)
      } else {
        result.push({ colorIndex: suggestion.colorIndex, rhymeLabel: suggestion.rhymeLabel, suggestions: [suggestion] })
      }
      return result
    },
    [],
  )
  const visible = !loading && suggestions.length > 0

  return (
    <aside
      aria-hidden={!visible}
      className={`fixed right-3 bottom-3 z-10 w-72 max-w-[calc(100vw-1.5rem)] rounded-lg border border-stone-200 bg-[var(--paper-bg)] p-3 shadow-lg transition-[opacity,transform] duration-150 ease-out dark:border-neutral-800 dark:bg-neutral-900 ${
        visible ? 'translate-x-0 opacity-100' : 'pointer-events-none translate-x-[calc(100%+1rem)] opacity-0'
      }`}
    >
      {visible && (
        <div className="space-y-1.5">
          {groups.map((group) => (
            <div key={`${group.colorIndex}-${group.rhymeLabel}`} className="flex items-baseline gap-2 text-xs">
              <span className={`shrink-0 font-semibold rhyme-text-${group.colorIndex}`}>
                {group.rhymeLabel}
              </span>
              <div className="flex flex-wrap gap-x-2 gap-y-1">
                {group.suggestions.map((suggestion) => (
                  <button
                    key={suggestion.word}
                    className="touch-manipulation text-stone-700 hover:underline dark:text-neutral-200"
                    title={`${suggestion.syllables} síl·labes`}
                    onClick={() => onSelect(suggestion)}
                  >
                    {suggestion.word}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </aside>
  )
}
