/// <reference lib="webworker" />

import { loadModule } from 'hunspell-asm'
import type { Hunspell, HunspellFactory } from 'hunspell-asm'
import { DICTIONARY_CODE, ELIDABLE_CLITICS } from './types'
import type { SpellcheckRequest, SpellcheckResponse } from './types'
import type { CatalanVariant } from '../engine/types'

// eslint-disable-next-line no-restricted-globals
const ctx = self as unknown as DedicatedWorkerGlobalScope

// The wasm module itself (the actual Hunspell C engine, compiled to
// WebAssembly) only needs to be loaded/compiled once; individual
// dictionaries are then mounted/unmounted into it as the variant changes.
// This matters because a naive pure-JS Hunspell reimplementation (this
// project previously used `nspell`) precomputes every inflected word form
// up front, which for a morphologically rich language like Catalan
// (thousands of affix rules over ~200k dictionary entries) blows up to the
// point of never finishing; the real Hunspell engine strips affixes lazily
// per lookup instead, so it stays fast regardless of dictionary size.
let factoryPromise: Promise<HunspellFactory> | null = null
let speller: Hunspell | null = null
let mountedPaths: string[] = []

function post(message: SpellcheckResponse) {
  ctx.postMessage(message)
}

async function loadDictionary(variant: CatalanVariant) {
  const code = DICTIONARY_CODE[variant]
  const base = `${import.meta.env.BASE_URL}dictionaries/${code}/`
  const [affBuffer, dicBuffer] = await Promise.all([
    fetch(base + 'index.aff').then((r) => r.arrayBuffer()),
    fetch(base + 'index.dic').then((r) => r.arrayBuffer()),
  ])

  if (!factoryPromise) factoryPromise = loadModule()
  const factory = await factoryPromise

  if (speller) speller.dispose()
  for (const path of mountedPaths) factory.unmount(path)

  // Pass explicit, deterministic virtual file names rather than leaving
  // hunspell-asm to generate one itself: its default path generator uses an
  // old, unmaintained `nanoid` version, and passing our own name avoids
  // invoking it at all.
  const affPath = factory.mountBuffer(new Uint8Array(affBuffer), `${code}.aff`)
  const dicPath = factory.mountBuffer(new Uint8Array(dicBuffer), `${code}.dic`)
  mountedPaths = [affPath, dicPath]

  speller = factory.create(affPath, dicPath)
  post({ type: 'ready', variant })
}

/** Checks a single token, aware of elided clitics like "l'amor" -> checks "amor". */
function isKnown(token: string): boolean {
  if (!speller) return true

  const apostropheIndex = token.search(/['’]/)
  if (apostropheIndex > 0) {
    const clitic = token.slice(0, apostropheIndex).toLowerCase()
    const rest = token.slice(apostropheIndex + 1)
    if (ELIDABLE_CLITICS.has(clitic)) {
      return rest.length === 0 || speller.spell(rest)
    }
  }

  return speller.spell(token)
}

ctx.addEventListener('message', async (event: MessageEvent<SpellcheckRequest>) => {
  const message = event.data
  try {
    if (message.type === 'load') {
      await loadDictionary(message.variant)
      return
    }

    if (message.type === 'check') {
      const unknown = message.words.filter((word) => !isKnown(word))
      post({ type: 'check-result', id: message.id, unknown })
    }
  } catch (error) {
    post({ type: 'error', message: error instanceof Error ? error.message : String(error) })
  }
})
