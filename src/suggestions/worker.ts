import { analyzeVerse, computeRhymeScheme } from '../engine'

interface SynonymsData {
  index: Record<string, number[]>
}

interface VerbsData {
  version: number
  forms: string[]
}

interface SuggestionTarget {
  line: string
  stanzaIndex: number
}

interface SuggestionRequest {
  type: 'suggest'
  requestId: number
  dataUrl: string
  verbsUrl: string
  currentLine: string
  targets: SuggestionTarget[]
  stanzaLines: string[]
  variant: 'central' | 'valencia'
}

interface PreloadRequest {
  type: 'preload'
  verbsUrl: string
  variant: 'central' | 'valencia'
}

interface SuggestionResponse {
  type: 'suggestions'
  requestId: number
  suggestions: { word: string; colorIndex: number; rhymeLabel: string; syllables: number; replacePrefix: string }[]
}

let dataPromise: Promise<SynonymsData | null> | null = null
let verbsPromise: Promise<VerbsData | null> | null = null
const rhymeCandidates = new Map<string, string[]>()
const verbRhymeIndexes = new Map<string, Promise<Map<string, string[]>>>()

function loadData(dataUrl: string): Promise<SynonymsData | null> {
  if (!dataPromise) {
    dataPromise = fetch(dataUrl)
      .then((response) => (response.ok ? response.json() : null))
      .catch(() => null)
  }
  return dataPromise
}

function loadVerbs(verbsUrl: string): Promise<VerbsData | null> {
  if (!verbsPromise) {
    verbsPromise = fetch(verbsUrl)
      .then((response) => (response.ok ? response.json() : null))
      .then((data: VerbsData | null) => (data?.version === 1 && Array.isArray(data.forms) ? data : null))
      .catch(() => null)
  }
  return verbsPromise
}

function candidatesForRhyme(data: SynonymsData, rhyme: string, variant: SuggestionRequest['variant']): string[] {
  const cacheKey = `${variant}:${rhyme}`
  const cached = rhymeCandidates.get(cacheKey)
  if (cached) return cached

  const candidates: string[] = []
  for (const word of Object.keys(data.index)) {
    // Suggest a single word only; thesaurus keys can also contain labels or
    // multiword expressions that are unsuitable for direct insertion.
    if (!/^[a-zçàèéíòóúïü]+(?:['’][a-zçàèéíòóúïü]+)*$/i.test(word)) continue
    if (analyzeVerse(word, variant).rhymeKey?.consonant === rhyme) candidates.push(word)
  }
  rhymeCandidates.set(cacheKey, candidates)
  return candidates
}

function loadVerbRhymeIndex(verbsUrl: string, variant: SuggestionRequest['variant']): Promise<Map<string, string[]>> {
  const cached = verbRhymeIndexes.get(variant)
  if (cached) return cached

  const indexPromise = loadVerbs(verbsUrl).then((data) => {
    const index = new Map<string, string[]>()
    if (!data) return index
    for (const word of data.forms) {
      const rhyme = analyzeVerse(word, variant).rhymeKey?.consonant
      if (!rhyme) continue
      const words = index.get(rhyme)
      if (words) words.push(word)
      else index.set(rhyme, [word])
    }
    return index
  })
  verbRhymeIndexes.set(variant, indexPromise)
  return indexPromise
}

self.onmessage = async ({ data: request }: MessageEvent<SuggestionRequest | PreloadRequest>) => {
  if (request.type === 'preload') {
    await loadVerbRhymeIndex(request.verbsUrl, request.variant)
    return
  }
  if (request.type !== 'suggest') return
  const [data, verbRhymeIndex] = await Promise.all([
    loadData(request.dataUrl),
    loadVerbRhymeIndex(request.verbsUrl, request.variant),
  ])
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
  const rhymeScheme = computeRhymeScheme(request.stanzaLines.map((line) => analyzeVerse(line, request.variant)))
  for (const target of request.targets) {
    const reference = analyzeVerse(target.line, request.variant)
    const rhyme = reference.rhymeKey?.consonant
    if (!rhyme || reference.syllableCount === 0) continue
    const rhymeEntry = rhymeScheme[target.stanzaIndex]
    const colorIndex = (rhymeEntry?.groupIndex ?? 0) % 8
    const rhymeLabel = rhymeEntry?.label ?? ''

    const addCandidates = (words: string[], limit: number) => {
      let added = 0
      for (const word of words) {
        if (added >= limit) break
      const normalizedWord = word.toLocaleLowerCase()
      if (
        completedWords.has(normalizedWord) ||
        (replacePrefix && normalizedWord === replacePrefix.toLocaleLowerCase()) ||
        (replacePrefix && !normalizedWord.startsWith(replacePrefix.toLocaleLowerCase()))
      ) continue
      const separator = lineBeforePrefix ? ' ' : ''
      const completed = analyzeVerse(`${lineBeforePrefix}${separator}${word}`, request.variant)
      if (completed.syllableCount !== reference.syllableCount || seen.has(word)) continue
      seen.add(word)
      suggestions.push({ word, colorIndex, rhymeLabel, syllables: completed.syllableCount, replacePrefix })
        added++
      }
    }

    addCandidates(candidatesForRhyme(data, rhyme, request.variant), 3)
    addCandidates(verbRhymeIndex.get(rhyme) ?? [], 3)
  }

  const response: SuggestionResponse = { type: 'suggestions', requestId: request.requestId, suggestions }
  self.postMessage(response)
}
