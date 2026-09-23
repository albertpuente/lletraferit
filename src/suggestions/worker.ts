import { analyzeVerse, computeRhymeScheme } from '../engine'

interface SynonymsData {
  index: Record<string, number[]>
}

interface SuggestionTarget {
  line: string
  stanzaIndex: number
}

interface SuggestionRequest {
  type: 'suggest'
  requestId: number
  dataUrl: string
  currentLine: string
  targets: SuggestionTarget[]
  stanzaLines: string[]
}

interface SuggestionResponse {
  type: 'suggestions'
  requestId: number
  suggestions: { word: string; colorIndex: number; rhymeLabel: string; syllables: number; replacePrefix: string }[]
}

let dataPromise: Promise<SynonymsData | null> | null = null
const rhymeCandidates = new Map<string, string[]>()

function loadData(dataUrl: string): Promise<SynonymsData | null> {
  if (!dataPromise) {
    dataPromise = fetch(dataUrl)
      .then((response) => (response.ok ? response.json() : null))
      .catch(() => null)
  }
  return dataPromise
}

function candidatesForRhyme(data: SynonymsData, rhyme: string): string[] {
  const cached = rhymeCandidates.get(rhyme)
  if (cached) return cached

  const candidates: string[] = []
  for (const word of Object.keys(data.index)) {
    // Suggest a single word only; thesaurus keys can also contain labels or
    // multiword expressions that are unsuitable for direct insertion.
    if (!/^[a-zçàèéíòóúïü]+(?:['’][a-zçàèéíòóúïü]+)*$/i.test(word)) continue
    if (analyzeVerse(word).rhymeKey?.consonant === rhyme) candidates.push(word)
  }
  rhymeCandidates.set(rhyme, candidates)
  return candidates
}

self.onmessage = async ({ data: request }: MessageEvent<SuggestionRequest>) => {
  if (request.type !== 'suggest') return
  const data = await loadData(request.dataUrl)
  if (!data) {
    const response: SuggestionResponse = { type: 'suggestions', requestId: request.requestId, suggestions: [] }
    self.postMessage(response)
    return
  }

  const suggestions: SuggestionResponse['suggestions'] = []
  const seen = new Set<string>()
  // If the line ends inside a word, autocomplete that word rather than
  // treating it as a finished word followed by a new suggestion.
  const prefixMatch = /([a-zçàèéíòóúïü]+(?:['’][a-zçàèéíòóúïü]+)*)$/i.exec(request.currentLine)
  const replacePrefix = prefixMatch?.[1] ?? ''
  const lineBeforePrefix = replacePrefix
    ? request.currentLine.slice(0, -replacePrefix.length).trimEnd()
    : request.currentLine.trimEnd()
  const completedWords = new Set(
    lineBeforePrefix.toLocaleLowerCase().match(/[a-zçàèéíòóúïü]+(?:['’][a-zçàèéíòóúïü]+)*/gi) ?? [],
  )
  const rhymeScheme = computeRhymeScheme(request.stanzaLines.map((line) => analyzeVerse(line)))
  for (const target of request.targets) {
    const reference = analyzeVerse(target.line)
    const rhyme = reference.rhymeKey?.consonant
    if (!rhyme || reference.syllableCount === 0) continue
    const rhymeEntry = rhymeScheme[target.stanzaIndex]
    const colorIndex = (rhymeEntry?.groupIndex ?? 0) % 8
    const rhymeLabel = rhymeEntry?.label ?? ''

    for (const word of candidatesForRhyme(data, rhyme)) {
      const normalizedWord = word.toLocaleLowerCase()
      if (
        completedWords.has(normalizedWord) ||
        (replacePrefix && normalizedWord === replacePrefix.toLocaleLowerCase()) ||
        (replacePrefix && !normalizedWord.startsWith(replacePrefix.toLocaleLowerCase()))
      ) continue
      const separator = lineBeforePrefix ? ' ' : ''
      const completed = analyzeVerse(`${lineBeforePrefix}${separator}${word}`)
      if (completed.syllableCount !== reference.syllableCount || seen.has(word)) continue
      seen.add(word)
      suggestions.push({ word, colorIndex, rhymeLabel, syllables: completed.syllableCount, replacePrefix })
      if (suggestions.filter((suggestion) => suggestion.colorIndex === colorIndex).length >= 6) break
    }
  }

  const response: SuggestionResponse = { type: 'suggestions', requestId: request.requestId, suggestions }
  self.postMessage(response)
}
