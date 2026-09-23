import { describe, expect, it } from 'vitest'
import { analyzeMetricFeet, metricStressSymbol, verseStresses } from '../feet'
import { analyzeVerse } from '../verse'
import type { WordAnalysis } from '../types'

function word(syllables: string[], stressIndex: number): WordAnalysis {
  return { word: syllables.join(''), syllables, stressIndex, stressType: 'plana' }
}

function scan(stresses: ('atonic' | 'tonic')[]) {
  const words = stresses.map((stress, index) => word([`s${index}`], stress === 'tonic' ? 0 : 1))
  // A stressIndex that does not occur in a one-syllable synthetic word makes
  // it atonic; this keeps the test setup compact and exercises flattening.
  return analyzeMetricFeet(words, [], stresses.length, stresses.map((_, i) => ({ from: i * 2, to: i * 2 + 1 })), 'x x x x x x x x')
}

function pattern(text: string): string {
  const verse = analyzeVerse(text)
  return verse.feetAnalysis.stresses.map(metricStressSymbol).join('')
}

function predominant(text: string): string | null {
  return analyzeVerse(text).feetAnalysis.predominantFoot
}

describe('metrical feet', () => {
  it('demotes a rhythmic tonic that would otherwise be adjacent to another (no two consecutive tonics)', () => {
    // "no" + fused "hi ha" (tonic, since "hi" is tonic here) + "pa" are all
    // naturally tonic monosyllables, but the rhythmic-accent rule forbids two
    // consecutive tonics, so the middle one is demoted.
    const words = [word(['no'], 0), word(['hi'], 0), word(['ha'], 0), word(['pa'], 0)]
    expect(verseStresses(words, [false, true, false], 3)).toEqual(['tonic', 'atonic', 'tonic'])
  })

  it('treats Catalan monosyllabic function words as atonic', () => {
    const words = [word(['de'], 0), word(['dins'], 0), word(['el'], 0), word(['pit'], 0)]
    expect(verseStresses(words, [false, false, false], 4)).toEqual(['atonic', 'tonic', 'atonic', 'tonic'])
  })

  it('treats an elided clitic fused onto an atonic word (e.g. "d\'una") as fully atonic, not per its own fused spelling', () => {
    // "duna" alone would naturally be plana (stress on "du"), but here it's
    // "d'una" — the elided preposition "de" + the indefinite article "una",
    // both inherently atonic — so the whole fused word must stay atonic.
    const duna = word(['du', 'na'], 0)
    expect(verseStresses([duna], [], 2)).toEqual(['tonic', 'atonic'])
    expect(verseStresses([duna], [], 2, ["d'una"])).toEqual(['atonic', 'atonic'])
  })

  it('does not treat an elision onto an ordinary content word as atonic', () => {
    // "l'illa" ("the island") elides "la" onto "illa", a real noun — the
    // fused word's own natural stress (plana, on "il") still applies.
    const lilla = word(['lil', 'la'], 0)
    expect(verseStresses([lilla], [], 2, ["l'illa"])).toEqual(['tonic', 'atonic'])
  })

  it('recognises repeated anapests as the predominant rhythm', () => {
    const result = scan(['atonic', 'atonic', 'tonic', 'atonic', 'atonic', 'tonic'])
    expect(result.feet.map((foot) => foot.type)).toEqual(['anapest', 'anapest'])
    expect(result.predominantFoot).toBe('anapest')
  })

  it('scans alternating atonic-tonic syllables as iambs rather than a diiamb', () => {
    const result = scan(['atonic', 'tonic', 'atonic', 'tonic'])
    expect(result.feet.map((foot) => foot.type)).toEqual(['iamb', 'iamb'])
  })

  it('marks alexandrines with a six-syllable caesura', () => {
    const result = scan(['atonic', 'tonic', 'atonic', 'tonic', 'atonic', 'tonic', 'atonic', 'tonic', 'atonic', 'tonic', 'atonic', 'tonic'])
    expect(result.cesuraAfter).toBe(6)
  })

  it('adds advisory feet without changing a real verse count', () => {
    const verse = analyzeVerse("Jo só l'esqueix d'un arbre, esponerós ahir,")
    expect(verse.syllableCount).toBe(12)
    expect(verse.feetAnalysis.stresses).toHaveLength(12)
    expect(verse.feetAnalysis.cesuraAfter).toBe(6)
  })

  describe('accent de suport (supporting accent for long atonic runs)', () => {
    it('continues an established dactylic rhythm through a long atonic run instead of bisecting it arbitrarily', () => {
      // Two clean dactyls, then a real tonic anchor, then a 5-syllable
      // atonic run, then the next real tonic anchor (aligned so that a
      // clean, uninterrupted dactyl beat would span the whole run).
      // Phase-aligned placement promotes the syllable that continues the
      // ●○○ beat, so the run resolves into two more clean dactyls instead
      // of an arbitrary bisection landing on an unrelated foot.
      const result = scan([
        'tonic', 'atonic', 'atonic', // dactyl
        'tonic', 'atonic', 'atonic', // dactyl
        'tonic', // anchor starting the next dactyl
        'atonic', 'atonic', 'atonic', 'atonic', 'atonic', // long atonic run
        'tonic', 'atonic', 'atonic', // dactyl (real tonic right after the run)
      ])
      expect(result.feet.map((foot) => foot.type)).toEqual(['dactyl', 'dactyl', 'dactyl', 'dactyl', 'dactyl'])
      expect(result.predominantFoot).toBe('dactyl')
    })

    it('falls back to plain bisection when the phase-aligned slot would create an invalid double tonic', () => {
      // Established ○●○ amphibrach rhythm, then a 3-syllable atonic run
      // immediately followed by a real tonic. The phase-aligned slot for
      // ○●○ would land right next to that following tonic (an invalid
      // double tonic), so the algorithm falls back to bisecting the run
      // (promoting its middle syllable) instead of leaving it unresolved.
      const result = scan([
        'atonic', 'tonic', 'atonic', // amphibrach
        'atonic', 'tonic', 'atonic', // amphibrach
        'atonic', 'atonic', 'atonic', // long atonic run
        'tonic', // real tonic immediately after the run
      ])
      // No atonic run longer than 2 remains, and no two tonics are adjacent.
      const stresses = result.stresses
      let run = 0
      for (const stress of stresses) {
        run = stress === 'atonic' ? run + 1 : 0
        expect(run).toBeLessThanOrEqual(2)
      }
      for (let i = 0; i < stresses.length - 1; i++) {
        expect(stresses[i] === 'tonic' && stresses[i + 1] === 'tonic').toBe(false)
      }
    })
  })

  // Verified against the five canonical teaching examples for peus mètrics
  // (iambe, troqueu, dàctil, amfíbrac, anapest), including the rhythmic
  // accent rules: no two consecutive tonics, and no run of more than two
  // atonic syllables (an "accent de suport" breaks up longer runs).
  describe('canonical peus mètrics examples', () => {
    it('scans a iambe verse', () => {
      expect(pattern('De dins el pit covard els mots com un estol')).toBe('○●○●○●○●○●○●')
      expect(predominant('De dins el pit covard els mots com un estol')).toBe('iamb')
    })

    it('scans a troqueu verse', () => {
      expect(pattern('És quan dormo que hi veig clar')).toBe('●○●○●○●')
      expect(predominant('És quan dormo que hi veig clar')).toBe('trochee')
    })

    it('scans a dàctil verse', () => {
      expect(pattern("L'illa de l'últim adéu on es va inclinà el meu migdia")).toBe(
        '●○○●○○●○○●○○●○○●○',
      )
      expect(predominant("L'illa de l'últim adéu on es va inclinà el meu migdia")).toBe('dactyl')
    })

    it('scans an amfíbrac verse', () => {
      // "d'una" is the elided preposition "de" fused onto the indefinite
      // article "una" — both inherently atonic — so the whole fused word
      // must stay atonic despite its own spelling's natural (but
      // irrelevant here) plana stress; see elidedCliticRemainder in feet.ts.
      expect(pattern("S'agita la pompa llanguent d'una immensa cortina")).toBe(
        '○●○○●○○●○○●○○●○',
      )
      expect(predominant("S'agita la pompa llanguent d'una immensa cortina")).toBe('amphibrach')
    })

    it('scans an anapest verse', () => {
      expect(pattern('Va passant entremig de sa gent adormida')).toBe('○○●○○●○○●○○●○')
      expect(predominant('Va passant entremig de sa gent adormida')).toBe('anapest')
    })
  })
})