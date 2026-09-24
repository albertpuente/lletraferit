// Downloads Softcatalà's open Catalan thesaurus (Diccionari de sinònims,
// CC-BY 4.0, https://github.com/Softcatala/sinonims-cat) and compiles it into
// a compact JSON index used by the app's "click a word for synonyms" feature.
//
// This script requires network access. It is NOT run automatically on
// `npm install` (unlike copy-dictionaries.mjs, which only copies files
// already present in node_modules) — run it manually with:
//   node scripts/build-synonyms.mjs
// and commit the resulting public/dictionaries/synonyms.json if you want to
// refresh the bundled thesaurus data.

import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

const SOURCE_URL = 'https://raw.githubusercontent.com/Softcatala/sinonims-cat/master/dict/sinonims.txt'
const LICENSE_URL = 'https://raw.githubusercontent.com/Softcatala/sinonims-cat/master/LICENSE'

const LINE_RE = /^-(\S+)(?:\s*\(([^)]*)\))?:\s*(.+)$/

/** Splits a comma-separated term list, respecting parenthesis nesting so that
 * annotations like "sofert (FEM soferta), sofrit (FEM sofrida)" aren't split
 * on the comma inside the parentheses. */
function splitTerms(rest) {
  const terms = []
  let depth = 0
  let current = ''
  for (const ch of rest) {
    if (ch === '(') depth++
    if (ch === ')') depth--
    if (ch === ',' && depth <= 0) {
      terms.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  if (current.trim()) terms.push(current.trim())
  return terms
}

/** Parses one term like "obrer (NOFEM)" or "festiu (antònim)" into its base
 * word and whether it's flagged as an antonym (which must be excluded from
 * the synonym group, not treated as a synonym). */
function parseTerm(term) {
  const match = term.match(/^(.*?)\s*\(([^)]*)\)\s*$/)
  if (!match) return { word: term.trim(), isAntonym: false }
  const [, base, annotation] = match
  const isAntonym = /antònim/i.test(annotation)
  return { word: base.trim(), isAntonym }
}

async function main() {
  console.log('[build-synonyms] Fetching', SOURCE_URL)
  const [text, license] = await Promise.all([
    fetch(SOURCE_URL).then((r) => r.text()),
    fetch(LICENSE_URL).then((r) => r.text()),
  ])

  const lines = text.split('\n')
  const groups = []
  const index = new Map()

  for (const line of lines) {
    if (!line.startsWith('-')) continue
    const m = line.match(LINE_RE)
    if (!m) continue
    const [, pos, , rest] = m

    const words = []
    for (const term of splitTerms(rest)) {
      if (!term) continue
      const { word, isAntonym } = parseTerm(term)
      if (isAntonym || !word) continue
      words.push(word)
    }
    if (words.length < 2) continue

    const groupIndex = groups.length
    groups.push({ pos, words })

    for (const word of words) {
      const key = word.toLowerCase()
      let list = index.get(key)
      if (!list) {
        list = []
        index.set(key, list)
      }
      list.push(groupIndex)
    }
  }

  const indexObj = Object.fromEntries(index)
  const output = { groups, index: indexObj }

  const destDir = path.join(root, 'public', 'dictionaries')
  await mkdir(destDir, { recursive: true })
  await writeFile(path.join(destDir, 'synonyms.json'), JSON.stringify(output))
  await writeFile(path.join(root, 'LICENSE-SOFTCATALA'), license)

  console.log(
    `[build-synonyms] Wrote ${groups.length} groups, ${index.size} indexed words to public/dictionaries/synonyms.json`,
  )
}

main().catch((error) => {
  console.error('[build-synonyms] Failed:', error)
  process.exitCode = 1
})
