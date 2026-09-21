/**
 * Client for the offline Catalan thesaurus (Softcatalà's Diccionari de
 * sinònims, CC-BY 4.0). Lazily fetches the compiled JSON index (built by
 * scripts/build-synonyms.mjs) on first use and caches it in memory.
 */

import { candidateLemmas } from './lemmatize'

export interface SynonymGroup {
  /** Grammatical category or usage note the group was tagged with, e.g. "adj", "n (col·loquial)". */
  pos: string
  words: string[]
}

interface SynonymsData {
  groups: SynonymGroup[]
  index: Record<string, number[]>
}

export interface SynonymResult {
  pos: string
  words: string[]
}

export interface SynonymLookup {
  /** The word actually found in the thesaurus: either the queried word, or
   * (if that had no entry) a base form recovered by `candidateLemmas`, e.g.
   * the singular of a plural noun, or the infinitive of a conjugated verb. */
  matchedWord: string
  results: SynonymResult[]
}

let dataPromise: Promise<SynonymsData | null> | null = null

function loadSynonyms(): Promise<SynonymsData | null> {
  if (!dataPromise) {
    dataPromise = fetch(`${import.meta.env.BASE_URL}dictionaries/synonyms.json`)
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
  }
  return dataPromise
}

/** Preloads the synonyms index in the background, without blocking. */
export function preloadSynonyms(): void {
  void loadSynonyms()
}

function lookup(data: SynonymsData, key: string): SynonymResult[] {
  const groupIndices = data.index[key]
  if (!groupIndices) return []

  const results: SynonymResult[] = []
  for (const groupIndex of groupIndices) {
    const group = data.groups[groupIndex]
    const words = group.words.filter((w) => w.toLowerCase() !== key)
    if (words.length > 0) results.push({ pos: group.pos, words })
  }
  return results
}

/** Returns the synonym groups for `word` (case-insensitive). If `word` itself
 * isn't a thesaurus entry, falls back to trying a handful of morphologically
 * derived base forms (see `candidateLemmas`) — e.g. a plural noun or a
 * conjugated verb — so inflected forms can still surface their lemma's
 * synonyms. Returns an empty result if nothing is found or the thesaurus
 * hasn't loaded (e.g. offline on first visit). */
export async function getSynonyms(word: string): Promise<SynonymLookup> {
  const data = await loadSynonyms()
  if (!data) return { matchedWord: word, results: [] }

  const key = word.toLowerCase()
  const direct = lookup(data, key)
  if (direct.length > 0) return { matchedWord: word, results: direct }

  for (const candidate of candidateLemmas(key)) {
    const results = lookup(data, candidate)
    if (results.length > 0) return { matchedWord: candidate, results }
  }

  return { matchedWord: word, results: [] }
}
