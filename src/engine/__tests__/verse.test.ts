import { describe, expect, it } from 'vitest'
import { analyzeVerse } from '../verse'
import { computeRhymeScheme } from '../rhyme'

describe('analyzeVerse', () => {
  it('counts syllables of a real alexandrí (12 syllables) with sinalefa, matching Joan Alcover\'s "Cap al tard"', () => {
    // "Jo só l'esqueix d'un arbre, esponerós ahir,"
    // Reference breakdown (ca.wikipedia.org/wiki/Mètrica_catalana):
    //   hemistich 1: Jo-so-les-queix-dun-ar-(bre)  -> counts to 6
    //   hemistich 2: es-po-ne-ros-a-hir             -> counts to 6
    // Whole-verse (non-cesura-aware) count should still total 12.
    const verse = analyzeVerse("Jo só l'esqueix d'un arbre, esponerós ahir,")
    expect(verse.syllableCount).toBe(12)
  })

  it('applies sinalefa between a vowel-ending and vowel-starting word', () => {
    const verse = analyzeVerse('arbre esponerós')
    expect(verse.sinalefaCount).toBe(1)
  })

  it('does not chain a sinalefa across three consecutive vowel-contact words (matching the standard "no hi ha pa" -> no-ja-pa example)', () => {
    // "hi" fuses with "ha" (both atonic), which consumes "hi"; "no"/"Andreu"
    // do not also fuse into the same chain even though they end in a vowel
    // right before "hi".
    expect(analyzeVerse('no hi ha pa').syllableCount).toBe(3)
    expect(analyzeVerse('A Sant Andreu hi ha molta gent').syllableCount).toBe(8)
  })

  it('truncates the count at the last word\'s stressed syllable when it ends plana', () => {
    // "el gran arbre" -> el(1) + gran(1) + arbre(2 syllables, but stressed on "ar",
    // trailing "bre" unstressed does not count) = 1+1+2 raw - 0 sinalefa - 1 trailing = 3
    const verse = analyzeVerse('el gran arbre')
    expect(verse.rawSyllables).toBe(4)
    expect(verse.syllableCount).toBe(3)
  })

  it('does not truncate when the verse ends in an aguda word', () => {
    const verse = analyzeVerse('vull tornar demà')
    expect(verse.syllableCount).toBe(verse.rawSyllables)
  })

  it('splits "funciona" as fun-cio-na (3 syllables), not fun-ci-o-na', () => {
    // Regression test: "funciona" is trisyllabic (fun-CIO-na, stressed
    // plana on "cio"), not four syllables. verse.syllableCount is 3, not 4,
    // because the verse-level metric count truncates the final unstressed
    // trailing syllable ("na") per the standard "count up to the last
    // stressed syllable" rule — the syllable split itself is what's under
    // test here, via rawSyllables and the word's own syllable list.
    const verse = analyzeVerse('No funciona')
    expect(verse.words[1].syllables).toEqual(['fun', 'cio', 'na'])
    expect(verse.rawSyllables).toBe(4)
    expect(verse.syllableCount).toBe(3)
  })

  it('counts heptasyllabic verses from Salvat-Papasseit\'s "Quina grua el meu estel"', () => {
    // Verified against Josep Bargalló's published scansion of the poem
    // (josepbargallo.wordpress.com), which marks all these as heptasíl·labs.
    expect(analyzeVerse("quin estel la meva grua!").syllableCount).toBe(7)
    expect(analyzeVerse("sembla una donzella nua.").syllableCount).toBe(7)
    expect(analyzeVerse("dono al cordill tota mida.").syllableCount).toBe(7)
  })
})

describe('rhyme with central-variant final-r elision', () => {
  it('rhymes a word ending in unstressed "-r" with one ending in the bare vowel (central Catalan elides final -r)', () => {
    // From Salvat-Papasseit's poem: "no" / "senyor" rhyme in performance
    // (as in Joan Manuel Serrat's sung version) because central Catalan
    // colloquially elides a word-final "r" (senyor -> [səˈɲo]).
    const central = [analyzeVerse('Vianant, no parlis, no,', 'central'), analyzeVerse('que et prendrà l\'amor senyor', 'central')]
    const scheme = computeRhymeScheme(central)
    expect(scheme[0].label.toUpperCase()).toBe(scheme[1].label.toUpperCase())
  })

  it('does not apply final-r elision for the Valencian variant', () => {
    const valencia = [analyzeVerse('Vianant, no parlis, no,', 'valencia'), analyzeVerse('que et prendrà l\'amor senyor', 'valencia')]
    const scheme = computeRhymeScheme(valencia)
    expect(scheme[0].label.toUpperCase()).not.toBe(scheme[1].label.toUpperCase())
  })
})

describe('computeRhymeScheme', () => {
  it('detects an ABBA rhyme scheme from matching verse endings', () => {
    const verses = [
      analyzeVerse('avui he vist el cel'),
      analyzeVerse('un pot ple de mida'),
      analyzeVerse('dolça com la vida'),
      analyzeVerse('bategant al cel'),
    ]
    const scheme = computeRhymeScheme(verses)
    const labels = scheme.map((e) => e.label.toUpperCase())
    expect(labels[0]).toBe(labels[3])
    expect(labels[1]).toBe(labels[2])
    expect(labels[0]).not.toBe(labels[1])
  })

  it('rhymes words ending in the same vowel+coda regardless of onset consonant', () => {
    // "cel" and "estel" rhyme in Catalan (both "-el"), even though the
    // stressed syllable's onset consonant differs (c- vs t-).
    const verses = [analyzeVerse('quina grua el meu estel'), analyzeVerse('de tant com brilla en el cel')]
    const scheme = computeRhymeScheme(verses)
    expect(scheme[0].label.toUpperCase()).toBe(scheme[1].label.toUpperCase())
  })

  it('rhymes words ending in a semivowel diphthong (verified against "Dolça Catalunya")', () => {
    // "Pirineu" and "adéu" both genuinely rhyme "-eu" in Catalan; "Pirineu"
    // has no written accent because it's aguda-by-default (ends in a
    // semivowel diphthong), not because it's plana.
    const eu = [analyzeVerse('blanc Pirineu,'), analyzeVerse('per sempre adéu!')]
    expect(computeRhymeScheme(eu)[0].label.toUpperCase()).toBe(computeRhymeScheme(eu)[1].label.toUpperCase())

    // "cantau" and "siau" (archaic/dialectal imperatives) both rhyme "-au".
    const au = [analyzeVerse('cantau, cantau,'), analyzeVerse('adéu-siau!')]
    expect(computeRhymeScheme(au)[0].label.toUpperCase()).toBe(computeRhymeScheme(au)[1].label.toUpperCase())
  })

  it('rhymes a stressed syllable starting with a silent qu/gu + e/i digraph correctly (not the "u")', () => {
    // "més" and "tingués" both rhyme "-és"; the stressed syllable of
    // "tingués" is "gués", where the "u" is a silent digraph marker (hard g
    // before e), not part of the vowel nucleus, and must not be mistaken
    // for the rhyme's starting vowel.
    const verses = [analyzeVerse('no us veuré més!'), analyzeVerse('jo el llit tingués!')]
    const scheme = computeRhymeScheme(verses)
    expect(scheme[0].label.toUpperCase()).toBe(scheme[1].label.toUpperCase())
  })

  it('rhymes words where a final "t" is silent between a consonant and the plural "-s"', () => {
    // "amants" is pronounced [əˈmans] in Catalan (the "t" between "n" and
    // the plural "-s" is silent), so it genuinely rhymes with "mans"; same
    // pattern for "molts" ([mols]) and "cols".
    const amantsMans = [analyzeVerse('dos amants'), analyzeVerse('unes mans')]
    expect(computeRhymeScheme(amantsMans)[0].label.toUpperCase()).toBe(
      computeRhymeScheme(amantsMans)[1].label.toUpperCase(),
    )

    const moltsCols = [analyzeVerse('en menjava molts'), analyzeVerse('unes bones cols')]
    expect(computeRhymeScheme(moltsCols)[0].label.toUpperCase()).toBe(
      computeRhymeScheme(moltsCols)[1].label.toUpperCase(),
    )
  })

  it('gives every syllable of a word containing a geminate "l·l" the correct on-screen character range (for the editor\'s underline curves)', () => {
    // Regression test: syllabifyWord() drops the "·" from its syllable text
    // (e.g. "col·laborar" -> ["col", "la", "bo", "rar"]), but metricalSyllables
    // maps those syllable lengths back onto the ORIGINAL text (including the
    // "·") to know where to draw each curve. Every syllable after a "·" used
    // to be shifted by one character, making its curve appear over the wrong
    // letters (e.g. "·lí" instead of "lí"). The "·" itself must land at the
    // end of the range of the syllable that PRECEDES it (e.g. "col·", not
    // "col"), matching how it's conventionally written attached there.
    const cases: [string, string[]][] = [
      ['col·laborar', ['col·', 'la', 'bo', 'rar']],
      ['pel·lícula', ['pel·', 'lí', 'cu', 'la']],
      ['al·leluia', ['al·', 'le', 'lu', 'ia']],
      ['il·lustre', ['il·', 'lus', 'tre']],
      ['pàl·lid', ['pàl·', 'lid']],
      ['intel·ligent', ['in', 'tel·', 'li', 'gent']],
    ]
    for (const [word, expectedRanges] of cases) {
      const verse = analyzeVerse(word)
      const actualRanges = verse.metricalSyllables.map((s) => verse.text.slice(s.from, s.to))
      expect(actualRanges).toEqual(expectedRanges)
    }
  })
})
