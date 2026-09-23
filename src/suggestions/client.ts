export interface VerseSuggestionTarget {
  line: string
  /** Position of this verse inside its stanza, used to recover its rhyme
   * group and therefore its existing gutter-letter color in the worker. */
  stanzaIndex: number
}

export interface VerseSuggestion {
  word: string
  colorIndex: number
  rhymeLabel: string
  syllables: number
  /** Unfinished word at the caret that this suggestion should replace. */
  replacePrefix: string
}

interface PendingRequest {
  resolve: (suggestions: VerseSuggestion[]) => void
}

let worker: Worker | null = null
let nextRequestId = 0
const pending = new Map<number, PendingRequest>()

function getWorker(): Worker {
  if (worker) return worker

  worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
  worker.onmessage = ({ data }: MessageEvent<{ requestId: number; suggestions: VerseSuggestion[] }>) => {
    const request = pending.get(data.requestId)
    if (!request) return
    pending.delete(data.requestId)
    request.resolve(data.suggestions)
  }
  worker.onerror = () => {
    for (const request of pending.values()) request.resolve([])
    pending.clear()
  }
  return worker
}

/** Finds metrically compatible rhyming endings in a dedicated worker. The
 * main editor thread only posts the small request payload, so typing remains
 * responsive while the thesaurus is searched and scanned. */
export function getVerseSuggestions(
  currentLine: string,
  targets: VerseSuggestionTarget[],
  stanzaLines: string[],
): Promise<VerseSuggestion[]> {
  if (targets.length === 0 || currentLine.trim() === '') return Promise.resolve([])

  const requestId = ++nextRequestId
  getWorker().postMessage({
    type: 'suggest',
    requestId,
    dataUrl: `${import.meta.env.BASE_URL}dictionaries/synonyms.json`,
    currentLine,
    targets,
    stanzaLines,
  })
  return new Promise((resolve) => pending.set(requestId, { resolve }))
}
