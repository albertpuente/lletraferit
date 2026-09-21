/**
 * Best-effort Catalan morphological heuristics used by the synonyms feature:
 * when the exact word a user clicked isn't a thesaurus entry (because the
 * thesaurus, like most, is indexed by lemma/dictionary form), this generates
 * plausible base-form candidates — de-pluralized nouns/adjectives, and
 * infinitives recovered from common regular verb endings (gerund,
 * participle, imperfect, a few present-tense forms) — so a plural or
 * conjugated form can still surface synonyms of its lemma.
 *
 * This is NOT a full lemmatizer. Catalan morphology (verb conjugation
 * especially) has extensive irregularity that a purely suffix-based
 * heuristic cannot recover; coverage is intentionally limited to common
 * regular patterns. Candidates are only ever used if they turn out to be
 * real thesaurus entries, so over-generating implausible candidates here is
 * harmless — it can only produce false negatives (missed synonyms), never
 * false positives from made-up words.
 */

/** Strips `suffix` from `word` if present and long enough to leave a
 * meaningful remainder, appending `replacement` (default: nothing). */
function strip(word: string, suffix: string, replacement = '', minRemaining = 2): string | null {
  if (!word.endsWith(suffix)) return null
  const stem = word.slice(0, -suffix.length)
  if (stem.length < minRemaining) return null
  return stem + replacement
}

/** If `word` ends in a doubled consonant (e.g. "ss" in "goss"), reduces it
 * to a single instance ("gos"). Used after stripping a plural "-os" suffix,
 * since Catalan gemination in plurals like "gos" -> "gossos" is undone by
 * dropping the epenthetic "-os" and then degeminating. */
function degeminate(word: string): string {
  const last = word[word.length - 1]
  if (last && word[word.length - 2] === last) return word.slice(0, -1)
  return word
}

function nounAdjectiveCandidates(word: string): string[] {
  const out: string[] = []

  // Velar-stem plurals, preserving the hard c/g sound before "-es":
  // "-ques" -> "-ca" (vaca -> vaques), "-gues" -> "-ga" (amiga -> amigues,
  // plain "gu", no diaeresis), "-gües" -> "-gua" (words where the "u" is
  // already pronounced in the singular, e.g. aigua -> aigües).
  const ques = strip(word, 'ques', 'ca')
  if (ques) out.push(ques)
  const gues = strip(word, 'gues', 'ga')
  if (gues) out.push(gues)
  const gues2 = strip(word, 'gües', 'gua')
  if (gues2) out.push(gues2)

  // Feminine plural "-es" -> feminine singular "-a" (casa -> cases).
  const esA = strip(word, 'es', 'a')
  if (esA) out.push(esA)

  // Epenthetic plural "-os" after s/x/ç/ig/sc/st (calaix -> calaixos), with
  // optional degemination (gos -> gossos: strip "os", then "ss" -> "s").
  const os = strip(word, 'os')
  if (os) {
    out.push(os)
    out.push(degeminate(os))
  }

  // Regular plural: just an added "-s" (llibre -> llibres, amic -> amics).
  const s = strip(word, 's')
  if (s) out.push(s)

  return out
}

// Verb-ending heuristics are restricted to relatively distinctive, multi-
// character suffixes (imperfect, gerund, participle, and the -im/-iu present
// forms unique to 3rd-conjugation verbs) to keep false-positive collisions
// with unrelated real words unlikely.
const AR_ENDINGS = ['ava', 'aves', 'àvem', 'àveu', 'aven', 'ant', 'at', 'ada', 'ats', 'ades']
const RE_ER_ENDINGS = ['ent', 'ut', 'uda', 'uts', 'udes']
const IR_ENDINGS = ['int', 'it', 'ida', 'its', 'ides', 'im', 'iu']

function verbCandidates(word: string): string[] {
  const out: string[] = []

  for (const ending of AR_ENDINGS) {
    const stem = strip(word, ending, '', 2)
    if (stem) out.push(stem + 'ar')
  }
  for (const ending of RE_ER_ENDINGS) {
    const stem = strip(word, ending, '', 2)
    if (stem) {
      out.push(stem + 're')
      out.push(stem + 'er')
    }
  }
  for (const ending of IR_ENDINGS) {
    const stem = strip(word, ending, '', 2)
    if (stem) out.push(stem + 'ir')
  }

  return out
}

/** Returns candidate base forms (lemmas) for `word`, most likely first,
 * excluding `word` itself and with duplicates removed. */
export function candidateLemmas(word: string): string[] {
  const lower = word.toLowerCase()
  const seen = new Set<string>([lower])
  const out: string[] = []

  for (const candidate of [...nounAdjectiveCandidates(lower), ...verbCandidates(lower)]) {
    if (seen.has(candidate)) continue
    seen.add(candidate)
    out.push(candidate)
  }

  return out
}
