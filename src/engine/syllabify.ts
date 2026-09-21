/**
 * Catalan word syllabification and stress detection.
 *
 * This is a heuristic engine intended as a composition aid for poets, not a
 * linguistically exhaustive analyzer. It implements the general phonological
 * rules of Catalan syllabification (hiatus vs. diphthong, qu/gu silent u,
 * diaeresis, written-accent stress) which correctly handle the large majority
 * of Catalan vocabulary. Known limitation: a handful of lexicalized
 * exceptions to the general rules exist in real Catalan (mostly around
 * learned/Latinate words) that a purely spelling-based algorithm cannot
 * always resolve; users can use diaeresis (ï/ü) to force hiatus where the
 * automatic result doesn't match their intent.
 */

import type { StressType, WordAnalysis } from './types'

const VOWELS = 'aeiouàèéíòóúïü'
const STRONG_VOWELS = 'aeoàèéòó'
const WEAK_VOWELS = 'iuíúïü'
const HIATUS_FORCING_WEAK = 'íúïü'
const ACCENTED_VOWELS = 'àèéíòóú'

const ONSET_CLUSTERS = new Set([
  'pl', 'bl', 'cl', 'gl', 'fl',
  'pr', 'br', 'tr', 'dr', 'cr', 'gr', 'fr',
])

// Consonant digraphs/units that must stay together when splitting clusters.
// Order matters: longest first, so the tokenizer matches greedily.
const CONSONANT_DIGRAPHS = ['l·l', 'ny', 'ss', 'rr', 'tx', 'tj', 'tg', 'dj', 'qu', 'gu']

function isVowel(ch: string | undefined): ch is string {
  return !!ch && VOWELS.includes(ch)
}

function isStrongVowel(ch: string): boolean {
  return STRONG_VOWELS.includes(ch)
}

function isWeakVowel(ch: string): boolean {
  return WEAK_VOWELS.includes(ch)
}

function isHiatusForcingWeak(ch: string): boolean {
  return HIATUS_FORCING_WEAK.includes(ch)
}

function isAccentedVowel(ch: string): boolean {
  return ACCENTED_VOWELS.includes(ch)
}

/**
 * Marks each character of a lowercased word as vowel ('V') or consonant ('C'),
 * treating the silent/glide "u" in qu/gu + vowel as a consonant.
 */
function markRoles(lower: string): ('V' | 'C')[] {
  const roles: ('V' | 'C')[] = new Array(lower.length)
  for (let i = 0; i < lower.length; i++) {
    const ch = lower[i]
    if (!isVowel(ch)) {
      roles[i] = 'C'
      continue
    }
    if (ch === 'u' && i > 0 && (lower[i - 1] === 'q' || lower[i - 1] === 'g')) {
      const next = lower[i + 1]
      if (isVowel(next)) {
        roles[i] = 'C'
        continue
      }
    }
    roles[i] = 'V'
  }
  return roles
}

interface Segment {
  type: 'V' | 'C'
  start: number
  end: number // exclusive
}

function buildSegments(lower: string, roles: ('V' | 'C')[]): Segment[] {
  const segments: Segment[] = []
  let i = 0
  while (i < lower.length) {
    const type = roles[i]
    let j = i + 1
    while (j < lower.length && roles[j] === type) j++
    segments.push({ type, start: i, end: j })
    i = j
  }
  return segments
}

/**
 * Splits a vowel-only segment into syllable nuclei ranges, applying the
 * hiatus/diphthong rules pairwise.
 */
function splitVowelSegment(lower: string, start: number, end: number): [number, number][] {
  const nuclei: [number, number][] = []
  let nucleusStart = start
  for (let i = start; i < end - 1; i++) {
    const v1 = lower[i]
    const v2 = lower[i + 1]
    const prevChar = i - 1 >= 0 ? lower[i - 1] : undefined

    // Special case: ï/ü right after q/g always forms a diphthong/glide with
    // the following vowel (qüestió, pingüí), overriding the usual hiatus
    // rules for accented/diaeresis weak vowels.
    const isGlideAfterQG = (v1 === 'ï' || v1 === 'ü') && (prevChar === 'q' || prevChar === 'g')

    let hiatus: boolean
    if (isGlideAfterQG) {
      hiatus = false
    } else if (isHiatusForcingWeak(v2)) {
      hiatus = true
    } else if (isWeakVowel(v1) && isStrongVowel(v2)) {
      hiatus = true
    } else if (isStrongVowel(v1) && isStrongVowel(v2)) {
      hiatus = true
    } else {
      hiatus = false
    }

    if (hiatus) {
      nuclei.push([nucleusStart, i + 1])
      nucleusStart = i + 1
    }
  }
  nuclei.push([nucleusStart, end])
  return nuclei
}

/** Tokenizes a consonant run into digraph-aware units. */
function tokenizeConsonants(run: string): string[] {
  const units: string[] = []
  let i = 0
  outer: while (i < run.length) {
    for (const digraph of CONSONANT_DIGRAPHS) {
      if (run.startsWith(digraph, i)) {
        units.push(digraph)
        i += digraph.length
        continue outer
      }
    }
    units.push(run[i])
    i += 1
  }
  return units
}

/** Assigns a consonant run between two vowel nuclei to coda/onset. */
function assignConsonants(units: string[]): { coda: string[]; onset: string[] } {
  if (units.length === 0) return { coda: [], onset: [] }
  if (units.length === 1) return { coda: [], onset: units }
  const last = units[units.length - 1]
  const secondLast = units[units.length - 2]
  const isSingleLetterPair = last.length === 1 && secondLast.length === 1
  if (isSingleLetterPair && ONSET_CLUSTERS.has(secondLast + last)) {
    return { coda: units.slice(0, -2), onset: units.slice(-2) }
  }
  return { coda: units.slice(0, -1), onset: units.slice(-1) }
}

/**
 * Splits a (lowercased) Catalan word into syllables.
 */
export function syllabifyWord(rawWord: string): string[] {
  const lower = rawWord.toLowerCase()
  if (lower.length === 0) return []

  const roles = markRoles(lower)
  const segments = buildSegments(lower, roles)

  // Collect vowel nuclei ranges (splitting hiatus within each vowel segment).
  const nucleiRanges: [number, number][] = []
  const consonantRuns: string[] = [] // consonantRuns[k] = run BEFORE nucleiRanges[k]
  let pendingConsonants = ''

  for (const seg of segments) {
    if (seg.type === 'C') {
      pendingConsonants += lower.slice(seg.start, seg.end)
      continue
    }
    const subNuclei = splitVowelSegment(lower, seg.start, seg.end)
    for (let k = 0; k < subNuclei.length; k++) {
      consonantRuns.push(k === 0 ? pendingConsonants : '')
      nucleiRanges.push(subNuclei[k])
    }
    pendingConsonants = ''
  }

  if (nucleiRanges.length === 0) {
    // No vowels at all (rare: initials, interjections like "psst"). Treat the
    // whole thing as a single syllable.
    return [lower]
  }

  const trailingConsonants = pendingConsonants

  // Now assign each inter-nucleus consonant run to coda of previous / onset of next.
  const syllables: string[] = []
  for (let idx = 0; idx < nucleiRanges.length; idx++) {
    const [start, end] = nucleiRanges[idx]
    const nucleus = lower.slice(start, end)

    let onsetForThis = ''
    if (idx === 0) {
      onsetForThis = consonantRuns[0]
    } else {
      const run = consonantRuns[idx]
      const units = tokenizeConsonants(run)
      const { onset } = assignConsonants(units)
      onsetForThis = onset.join('')
    }

    let codaForThis = ''
    if (idx < nucleiRanges.length - 1) {
      const nextRun = consonantRuns[idx + 1]
      const units = tokenizeConsonants(nextRun)
      const { coda } = assignConsonants(units)
      codaForThis = coda.join('')
    } else {
      codaForThis = trailingConsonants
    }

    syllables.push(onsetForThis + nucleus + codaForThis)
  }

  return syllables
}

/**
 * Determines the (0-based) index of the stressed syllable and the stress
 * classification (aguda/plana/esdrúixola) for a word already split into
 * syllables.
 */
export function detectStress(rawWord: string, syllables: string[]): { stressIndex: number; stressType: StressType } {
  const lower = rawWord.toLowerCase()

  if (syllables.length <= 1) {
    return { stressIndex: 0, stressType: 'aguda' }
  }

  // Written accent takes precedence.
  for (let i = 0; i < syllables.length; i++) {
    for (const ch of syllables[i]) {
      if (isAccentedVowel(ch)) {
        return { stressIndex: i, stressType: classify(i, syllables.length) }
      }
    }
  }

  // Regular rule: ends in a vowel, in a vowel + "-s" (the regular plural
  // marker, which never shifts stress: "vida" and "vides" are both plana,
  // stressed on "vi"), or in "-en"/"-in" => plana; otherwise aguda.
  //
  // Exception: words ending in a falling diphthong whose final element is a
  // semivowel i/u (e.g. "Pirineu", "cantau", "esglai", "festiu") are, per
  // Catalan orthography, treated like words ending in a CONSONANT for this
  // purpose — they default to aguda without needing a written accent
  // ("acaben en semivocal", as opposed to a plain vowel ending like "camí",
  // which needs an accent to be aguda). This also applies through a plural
  // "-s" the same way the vowel+s rule does (e.g. "esglais" stays aguda,
  // like singular "esglai").
  const lastChar = lower[lower.length - 1]
  const secondLastChar = lower[lower.length - 2]
  const hasTrailingS = lastChar === 's' && lower.length > 1
  const core = hasTrailingS ? lower.slice(0, -1) : lower
  const coreLast = core[core.length - 1]
  const coreSecondLast = core[core.length - 2]
  const endsInSemivowelDiphthong =
    (coreLast === 'i' || coreLast === 'u') && coreSecondLast !== undefined && isVowel(coreSecondLast)

  const endsInVowel = !endsInSemivowelDiphthong && isVowel(lastChar)
  const endsInVowelPlusS = !endsInSemivowelDiphthong && hasTrailingS && isVowel(secondLastChar)
  const endsInEnOrIn = /(en|in)$/.test(lower)
  const isPlana = endsInVowel || endsInVowelPlusS || endsInEnOrIn

  const stressIndex = isPlana ? syllables.length - 2 : syllables.length - 1
  return { stressIndex, stressType: classify(stressIndex, syllables.length) }
}

function classify(stressIndex: number, length: number): StressType {
  const fromEnd = length - 1 - stressIndex
  if (fromEnd === 0) return 'aguda'
  if (fromEnd === 1) return 'plana'
  return 'esdruixola'
}

/**
 * Full analysis of a single word: syllables + stress.
 */
export function analyzeWord(rawWord: string): WordAnalysis {
  const syllables = syllabifyWord(rawWord)
  const { stressIndex, stressType } = detectStress(rawWord, syllables)
  return { word: rawWord.toLowerCase(), syllables, stressIndex, stressType }
}
