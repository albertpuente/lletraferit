import type { MetricFoot, MetricFootType, SyllableStress, VerseFeetAnalysis, WordAnalysis } from './types'

/** Hollow = àtona, filled = tònica. Kept as circles rather than letters:
 * more legible at a glance and matches the visual convention used elsewhere
 * in the app (gutter dots, popup, structures catalogue). */
const MARK: Record<SyllableStress, string> = { atonic: '○', tonic: '●' }

/** The single-character glyph for a syllable's stress, used both for foot
 * pattern matching and for the always-on gutter dots row. */
export function metricStressSymbol(stress: SyllableStress): string {
  return MARK[stress]
}

/** Joins a raw pattern string (e.g. "○○●", one character per syllable) with
 * a thin dash between each circle, for display — "○–○–●" rather than
 * "○○●". Used for a single foot's pattern in the reference table. */
export function hyphenateStressPattern(pattern: string): string {
  return pattern.split('').join('–')
}

/** Describes a full verse's rhythm as a space-separated sequence of its
 * detected feet, each rendered with `hyphenateStressPattern` (e.g.
 * "○–● ○–● ○–●" for three iambs). Used for the instructional examples. */
export function describeFeetPattern(feet: MetricFoot[]): string {
  return feet.map((foot) => hyphenateStressPattern(foot.pattern)).join(' ')
}

interface FootDefinition {
  type: MetricFootType
  pattern: string
}

/** The full set of binary accentual patterns for feet of two to four syllables.
 * Names follow their traditional Catalan forms where a conventional one exists. */
const FOOT_DEFINITIONS: FootDefinition[] = [
  { type: 'pyrrhic', pattern: '○○' }, { type: 'iamb', pattern: '○●' },
  { type: 'trochee', pattern: '●○' }, { type: 'spondee', pattern: '●●' },
  { type: 'tribrach', pattern: '○○○' }, { type: 'anapest', pattern: '○○●' },
  { type: 'amphibrach', pattern: '○●○' }, { type: 'bacchius', pattern: '○●●' },
  { type: 'dactyl', pattern: '●○○' }, { type: 'cretic', pattern: '●○●' },
  { type: 'antibacchius', pattern: '●●○' }, { type: 'molossus', pattern: '●●●' },
  { type: 'proceleusmatic', pattern: '○○○○' }, { type: 'paeon-first', pattern: '●○○○' },
  { type: 'paeon-second', pattern: '○●○○' }, { type: 'paeon-third', pattern: '○○●○' },
  { type: 'paeon-fourth', pattern: '○○○●' }, { type: 'ionic-major', pattern: '●●○○' },
  { type: 'ionic-minor', pattern: '○○●●' }, { type: 'ditrochee', pattern: '●○●○' },
  { type: 'diiamb', pattern: '○●○●' }, { type: 'choriamb', pattern: '●○○●' },
  { type: 'antispast', pattern: '○●●○' }, { type: 'epitrite-first', pattern: '○●●●' },
  { type: 'epitrite-second', pattern: '●○●●' }, { type: 'epitrite-third', pattern: '●●○●' },
  { type: 'epitrite-fourth', pattern: '●●●○' }, { type: 'dispondee', pattern: '●●●●' },
]

export const METRIC_FOOT_NAMES: Record<MetricFootType, string> = {
  pyrrhic: 'pirriqui', iamb: 'iambe', trochee: 'troqueu', spondee: 'espondeu',
  tribrach: 'tribraqui', anapest: 'anapest', dactyl: 'dàctil', amphibrach: 'amfíbrac',
  bacchius: 'baqui', antibacchius: 'antibaqui', cretic: 'crètic', molossus: 'molós',
  proceleusmatic: 'proceleusmàtic', 'paeon-first': 'peó 1r', 'paeon-second': 'peó 2n',
  'paeon-third': 'peó 3r', 'paeon-fourth': 'peó 4t', diiamb: 'diiambe',
  ditrochee: 'ditroqueu', choriamb: 'coriambe', antispast: 'antispast',
  'ionic-minor': 'jònic a minore', 'ionic-major': 'jònic a maiore',
  'epitrite-first': 'epítrit 1r', 'epitrite-second': 'epítrit 2n',
  'epitrite-third': 'epítrit 3r', 'epitrite-fourth': 'epítrit 4t',
  dispondee: 'dispondeu', irregular: 'fragment irregular',
}

export function metricFootName(type: MetricFootType): string {
  return METRIC_FOOT_NAMES[type]
}

/** In continuous speech these monosyllables are normally proclitic or
 * enclitic. Treating them as tonic would turn the teaching examples' rhythm
 * into a string of false stresses. Ambiguous lexical uses remain an accepted
 * limitation of automatic scansion. */
const ATONIC_MONOSYLLABLES = new Set([
  'a', 'al', 'als', 'amb', 'd', 'de', 'del', 'dels', 'el', 'els', 'em', 'en', 'ens', 'es', 'et',
  'hi', 'ho', 'i', 'la', 'les', 'li', 'm', 'me', 'n', 'ne', 'o', 'pels', 'pel', 'que',
  'sa', 'se', 'ses', 'son', 'sos', 't', 'te', 'u', 'un', 'uns', 'us', 'v', 'va', 'vos',
  'quan', 'com', 'on', 'meu', 'teu', 'seu',
])

/** Multi-syllable clitics that stay fully unstressed in scansion even though
 * their own syllable count would otherwise carry a normal word stress
 * (e.g. the indefinite article "una" is weak/proclitic, unlike the numeral
 * "una" said in isolation). */
const ATONIC_WORDS = new Set(['una', 'uns', 'unes'])

/** Single-letter (or "qu") clitic prefixes that elide their own vowel before
 * an apostrophe (e.g. the "d'" in "d'una", the "l'" in "l'illa") — mirrors
 * `ELIDABLE_CLITICS` in spellcheck/types.ts, duplicated here rather than
 * imported since the engine shouldn't depend on the spellcheck module. */
const ELIDABLE_CLITIC_PREFIXES = new Set(['l', 'd', 's', 'n', 'm', 't', 'c', 'qu'])

/** If `rawToken` (the word's ORIGINAL spelling, apostrophe included — e.g.
 * "d'una", unlike `WordAnalysis.word` which has it stripped) is a single
 * elided clitic fused onto another word, returns that word's lowercase
 * spelling (e.g. "una"); otherwise null.
 *
 * This exists because an elided clitic (a preposition, pronoun, or article
 * shortened before a vowel) never carries its own stress, but the fused
 * spelling's OWN natural word-stress rule (`analyzeWord`, which only looks
 * at the final letter) can't tell "duna" apart from a genuine word
 * spelled that way — it has no way to know an elision happened at all.
 * When the elided-into word is itself normally atonic (e.g. the indefinite
 * article "una", already special-cased in `ATONIC_WORDS`), that atonic
 * status must still apply to the combined form, e.g. "d'una" ("of a/one")
 * — that check alone otherwise misses it, since "duna" isn't literally
 * "una". A leading consonant doesn't usually change which syllable a word
 * naturally stresses (e.g. "sagita" and "agita" both stress "gi", their
 * shared final letter still governs), which is why this override is only
 * needed for the narrow case of an elision onto an already-special-cased
 * atonic word/monosyllable, not elisions in general. */
function elidedCliticRemainder(rawToken: string): string | null {
  const match = /^([a-zçàèéíòóúïü]{1,2})['’](.+)$/i.exec(rawToken)
  if (!match) return null
  const [, prefix, remainder] = match
  if (!ELIDABLE_CLITIC_PREFIXES.has(prefix.toLowerCase())) return null
  return remainder.toLowerCase()
}

/** Flattens word stress to syllables and merges the two syllables consumed by
 * each sinalefa. A fused unit is tonic if either contributing syllable is
 * tonic. `rawWords`, when given, are each word's original spelling
 * (apostrophe included) in the same order as `words`, used only to detect
 * an elided-clitic prefix (see `elidedCliticRemainder`); omitting it (e.g.
 * in synthetic test input with no real elisions to detect) simply skips
 * that check. */
function rawSyllableStresses(words: WordAnalysis[], sinalefaBoundaries: boolean[], rawWords?: string[]): SyllableStress[] {
  const stresses: SyllableStress[] = []
  for (let wordIndex = 0; wordIndex < words.length; wordIndex++) {
    const word = words[wordIndex]
    const isAtonicWord = ATONIC_WORDS.has(word.word.toLowerCase())
    const isAtonicMonosyllable = word.syllables.length === 1 && ATONIC_MONOSYLLABLES.has(word.word.toLowerCase())
    const elidedRemainder = rawWords ? elidedCliticRemainder(rawWords[wordIndex]) : null
    const isAtonicElidedClitic =
      elidedRemainder !== null && (ATONIC_WORDS.has(elidedRemainder) || ATONIC_MONOSYLLABLES.has(elidedRemainder))
    for (let syllableIndex = 0; syllableIndex < word.syllables.length; syllableIndex++) {
      const isAtonicFunctionWord = isAtonicWord || isAtonicMonosyllable || isAtonicElidedClitic
      const stress: SyllableStress = !isAtonicFunctionWord && syllableIndex === word.stressIndex ? 'tonic' : 'atonic'
      if (syllableIndex === 0 && wordIndex > 0 && sinalefaBoundaries[wordIndex - 1] && stresses.length > 0) {
        if (stress === 'tonic') stresses[stresses.length - 1] = 'tonic'
      } else {
        stresses.push(stress)
      }
    }
  }
  return stresses
}

interface DominantPattern {
  size: number
  offset: number
  /** The specific most-common matched pattern (e.g. "●○○"), so its exact
   * tonic slot(s) — not just its length/phase — can guide accent
   * placement. */
  pattern: string
  repetitions: number
}

/** 0-based [start, end) ranges of every run of 3+ consecutive atonic
 * syllables in `stresses` — the runs `applyRhythmicAccentRules` will need
 * to insert a supporting accent into. */
function findLongAtonicRuns(stresses: SyllableStress[]): [number, number][] {
  const runs: [number, number][] = []
  let start: number | null = null
  for (let i = 0; i <= stresses.length; i++) {
    const isAtonic = i < stresses.length && stresses[i] === 'atonic'
    if (isAtonic) {
      if (start === null) start = i
    } else {
      if (start !== null && i - start >= 3) runs.push([start, i])
      start = null
    }
  }
  return runs
}

/** Finds the verse's own established rhythm — the foot pattern that recurs
 * in an unbroken run of consecutive identical feet among the syllables
 * *outside* any not-yet-fixed long atonic run — so a supporting accent
 * inserted into such a run can continue that beat instead of landing on an
 * arithmetically-arbitrary syllable.
 *
 * Scored by the LONGEST unbroken run of the same immediately-adjacent
 * pattern, not raw total occurrence count: two matches of the same pattern
 * scattered apart (with unrelated content between them) are just
 * coincidence, whereas two-or-more in a row are what a genuinely
 * established, regular rhythm looks like. Without this distinction, an
 * accidental longer-window match that happens to occur exactly as often as
 * the verse's real, consecutively-repeated foot could otherwise win purely
 * by having a numerically equal (but unrelated) match count.
 *
 * Windows that overlap a long atonic run are excluded from consideration
 * entirely (breaking any run-in-progress) — they mix pre-fix data and
 * aren't reliable signal — as are all-atonic matches like tribrach (they
 * don't indicate a tonic slot). Returns null if no pattern repeats
 * consecutively at least twice — i.e. there's no genuine rhythm to
 * continue, so callers should fall back to plain bisection instead. */
function findDominantPattern(stresses: SyllableStress[]): DominantPattern | null {
  const longRuns = findLongAtonicRuns(stresses)
  const overlapsLongRun = (start: number, end: number) => longRuns.some(([from, to]) => start < to && end > from)

  const marks = stresses.map((stress) => MARK[stress]).join('')
  let best: DominantPattern | null = null

  for (const size of [2, 3, 4]) {
    for (let offset = 0; offset < size; offset++) {
      if (marks.length - offset < size) continue

      let currentPattern: string | null = null
      let currentRun = 0
      let bestRun = 0
      let bestPattern = ''

      for (let start = offset; start + size <= marks.length; start += size) {
        const pattern = overlapsLongRun(start, start + size) ? null : marks.slice(start, start + size)
        const valid = pattern !== null && pattern.includes('●') && FOOT_DEFINITIONS.some((foot) => foot.pattern === pattern)

        if (valid && pattern === currentPattern) {
          currentRun++
        } else if (valid) {
          currentPattern = pattern
          currentRun = 1
        } else {
          currentPattern = null
          currentRun = 0
        }

        if (valid && currentRun > bestRun) {
          bestRun = currentRun
          bestPattern = pattern
        }
      }

      if (bestRun === 0) continue
      if (
        !best ||
        bestRun > best.repetitions ||
        (bestRun === best.repetitions && size > best.size) ||
        (bestRun === best.repetitions && size === best.size && offset < best.offset)
      ) {
        best = { size, offset, pattern: bestPattern, repetitions: bestRun }
      }
    }
  }

  return best && best.repetitions >= 2 ? best : null
}

/** Enforces the two rhythmic-accent adjustments traditional Catalan scansion
 * applies on top of plain word stress: a rhythmic accent never falls on two
 * consecutive tonic syllables (one is dropped), and a run of three or more
 * atonic syllables always receives a supporting accent ("accent de
 * suport") so no run exceeds two. This only affects the advisory foot
 * display — never syllable count, sinalefa, or rhyme. */
function applyRhythmicAccentRules(stresses: SyllableStress[]): SyllableStress[] {
  const result = [...stresses]

  // No two consecutive rhythmic tonics: scanning right to left and demoting
  // the left of any adjacent pair protects the verse's final stress (which
  // carries the rhyme) and cascades correctly through longer tonic runs.
  function demoteConsecutiveTonics(): void {
    for (let i = result.length - 2; i >= 0; i--) {
      if (result[i] === 'tonic' && result[i + 1] === 'tonic') result[i] = 'atonic'
    }
  }
  demoteConsecutiveTonics()

  // The verse's own established rhythm (if any), detected from the parts
  // that already alternate cleanly — used below so a supporting accent
  // continues that beat instead of landing on an arithmetically-arbitrary
  // syllable. E.g. in a dactylic verse ("¯˘˘ ¯˘˘ ¯˘˘..."), a long atonic
  // run partway through should still get its accent on a "downbeat" slot
  // (the position a dactyl's tonic would occupy), not on whichever
  // syllable happens to bisect the run.
  const dominant = findDominantPattern(result)

  // Recursively gives the middle syllable of an atonic run a supporting
  // accent, then re-checks each half. Used as a fallback: when no reliable
  // dominant rhythm was found at all, and to mop up any leftover overlong
  // sub-run phase alignment couldn't fully resolve (e.g. a dominant foot
  // with only one tonic slot per four syllables still leaves a 3-long gap).
  function bisectRun(start: number, end: number): void {
    const length = end - start
    if (length <= 2) return
    const middle = start + Math.floor(length / 2)
    result[middle] = 'tonic'
    bisectRun(start, middle)
    bisectRun(middle + 1, end)
  }

  // Promotes every syllable in [start, end) whose position lines up with
  // the dominant foot's tonic slot — continuing the established beat
  // through the run — rather than arbitrarily bisecting it. Skips any slot
  // whose promotion would land directly next to an already-tonic
  // neighbor (only possible at the run's own boundary, since a foot's
  // tonic slot(s) are always spaced `size` syllables apart, ≥3): doing so
  // would create an invalid double-tonic that the final safety pass would
  // then have to undo, which — since that undo isn't re-checked against
  // the "no atonic run >2" rule — could silently reintroduce the very
  // overlong run this function exists to fix. Leaving such a slot
  // unpromoted instead falls through to the plain-bisection pass below.
  function promoteByPhase(start: number, end: number, pattern: DominantPattern): void {
    for (let i = start; i < end; i++) {
      const slot = (((i - pattern.offset) % pattern.size) + pattern.size) % pattern.size
      if (pattern.pattern[slot] !== '●') continue
      const leftConflict = i > 0 && result[i - 1] === 'tonic'
      const rightConflict = i < result.length - 1 && result[i + 1] === 'tonic'
      if (leftConflict || rightConflict) continue
      result[i] = 'tonic'
    }
  }

  // No run of more than two atonic syllables: try continuing the
  // dominant rhythm first, then bisect whatever (if anything) is still
  // left too long.
  function fixRun(start: number, end: number): void {
    if (end - start <= 2) return
    if (dominant) promoteByPhase(start, end, dominant)

    let segmentStart: number | null = null
    for (let i = start; i <= end; i++) {
      const isAtonic = i < end && result[i] === 'atonic'
      if (isAtonic) {
        if (segmentStart === null) segmentStart = i
      } else {
        if (segmentStart !== null) bisectRun(segmentStart, i)
        segmentStart = null
      }
    }
  }

  let runStart: number | null = null
  for (let i = 0; i <= result.length; i++) {
    const isAtonic = i < result.length && result[i] === 'atonic'
    if (isAtonic) {
      if (runStart === null) runStart = i
    } else {
      if (runStart !== null) fixRun(runStart, i)
      runStart = null
    }
  }

  // Phase-aligned promotion can (rarely, at a run's edge) create a new
  // adjacent tonic pair; re-applying this keeps both invariants true no
  // matter what the run-fixing step above did.
  demoteConsecutiveTonics()

  return result
}

/** Per-syllable stress used for the advisory foot/rhythm display: plain word
 * stress and sinalefa merging, then adjusted for the two rhythmic-accent
 * rules above. Scans every syllable of the verse (including any trailing
 * unstressed syllables the official metrical `syllableCount` truncates),
 * since traditional peu scansion covers the whole verse. */
export function verseStresses(
  words: WordAnalysis[],
  sinalefaBoundaries: boolean[],
  totalSyllables: number,
  rawWords?: string[],
): SyllableStress[] {
  const raw = rawSyllableStresses(words, sinalefaBoundaries, rawWords).slice(0, totalSyllables)
  return applyRhythmicAccentRules(raw)
}

interface FootScan {
  size: number
  /** Leading syllables (anacrusis) skipped before the first regular foot. */
  offset: number
  repetitions: number
  matches: number
}

/** Finds the foot size and starting phase (anacrusis length) that best
 * explains the verse as a run of identical repeated feet. Trying every
 * offset (0..size-1), not just offset 0, is what lets a verse that begins
 * mid-pattern (anacrusis) still be recognised as regular — e.g. a verse
 * that reads as troqueu+iambe+pirriqui when grouped from its very first
 * syllable can instead reveal a clean, repeated dàctil or anapest once the
 * scan is allowed to skip a leading syllable.
 *
 * Scored primarily by `repetitions` — how many feet of the single most
 * common type recur — since that is the core signal of a regular rhythm.
 * Ties are broken by preferring the *larger* foot (a run of identical
 * trisyllabic feet is a much less likely coincidence than the same count
 * of bisyllabic feet, since there are only 4 possible two-syllable
 * patterns against 8 three-syllable ones, so it's the more specific,
 * more informative match), then by a shorter anacrusis. */
function preferredFootScan(stresses: SyllableStress[]): FootScan {
  const marks = stresses.map((stress) => MARK[stress]).join('')
  let best: FootScan = { size: 2, offset: 0, repetitions: 0, matches: 0 }
  for (const size of [2, 3, 4]) {
    for (let offset = 0; offset < size; offset++) {
      if (marks.length - offset < size) continue
      const frequencies = new Map<string, number>()
      let matches = 0
      for (let start = offset; start + size <= marks.length; start += size) {
        const pattern = marks.slice(start, start + size)
        if (FOOT_DEFINITIONS.some((foot) => foot.pattern === pattern)) {
          matches++
          frequencies.set(pattern, (frequencies.get(pattern) ?? 0) + 1)
        }
      }
      const repetitions = Math.max(0, ...frequencies.values())
      if (
        repetitions > best.repetitions ||
        (repetitions === best.repetitions && size > best.size) ||
        (repetitions === best.repetitions && size === best.size && offset < best.offset)
      ) {
        best = { size, offset, repetitions, matches }
      }
    }
  }
  return best
}

function matchFoot(stresses: SyllableStress[], start: number, size: number): FootDefinition | null {
  const pattern = stresses.slice(start, start + size).map((stress) => MARK[stress]).join('')
  return FOOT_DEFINITIONS.find((foot) => foot.pattern === pattern) ?? null
}

export function analyzeMetricFeet(
  words: WordAnalysis[],
  sinalefaBoundaries: boolean[],
  syllableCount: number,
  syllables: { from: number; to: number }[],
  text: string,
  rawWords?: string[],
): VerseFeetAnalysis {
  const stresses = verseStresses(words, sinalefaBoundaries, syllables.length, rawWords)
  const feet: MetricFoot[] = []
  const { size: footSize, offset } = preferredFootScan(stresses)

  if (offset > 0) {
    const first = syllables[0]
    const last = syllables[offset - 1]
    feet.push({
      type: 'irregular',
      pattern: stresses.slice(0, offset).map((stress) => MARK[stress]).join(''),
      syllableIndices: Array.from({ length: offset }, (_, i) => i),
      range: { from: first?.from ?? 0, to: last?.to ?? 0 },
    })
  }

  for (let start = offset; start < stresses.length;) {
    const length = Math.min(footSize, stresses.length - start)
    const match = length === footSize ? matchFoot(stresses, start, footSize) : null
    const indices = Array.from({ length }, (_, i) => start + i)
    const first = syllables[start]
    const last = syllables[start + length - 1]
    feet.push({
      type: match?.type ?? 'irregular',
      pattern: match?.pattern ?? stresses.slice(start, start + length).map((stress) => MARK[stress]).join(''),
      syllableIndices: indices,
      range: { from: first?.from ?? text.length, to: last?.to ?? text.length },
    })
    start += length
  }

  const complete = feet.filter((foot) => foot.type !== 'irregular')
  const counts = new Map<MetricFootType, number>()
  for (const foot of complete) counts.set(foot.type, (counts.get(foot.type) ?? 0) + 1)
  const winner = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]
  const predominantRatio = winner && complete.length > 0 ? winner[1] / complete.length : 0

  return {
    stresses,
    feet,
    predominantFoot: winner && predominantRatio > 0.5 ? winner[0] : null,
    predominantRatio,
    cesuraAfter: syllableCount === 12 ? 6 : null,
  }
}