import type { CatalanVariant } from '../engine/types'
import type { SpellcheckResponse } from './types'

type PendingCheck = { resolve: (unknown: string[]) => void; reject: (err: Error) => void }

/**
 * Main-thread client for the spellcheck Web Worker. Loads a Catalan Hunspell
 * dictionary offline and exposes `checkWords` to find unrecognized words.
 */
export class SpellChecker {
  private worker: Worker
  private ready: Promise<void>
  private resolveReady!: () => void
  private nextId = 1
  private pending = new Map<number, PendingCheck>()

  constructor(variant: CatalanVariant = 'central') {
    this.worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
    this.ready = new Promise((resolve) => {
      this.resolveReady = resolve
    })
    this.worker.addEventListener('message', this.handleMessage)
    this.worker.addEventListener('error', this.handleError)
    this.load(variant)
  }

  private handleError = (event: ErrorEvent) => {
    console.error('[spellcheck] worker error', event.message)
  }

  private handleMessage = (event: MessageEvent<SpellcheckResponse>) => {
    const message = event.data
    if (message.type === 'ready') {
      this.resolveReady()
      return
    }
    if (message.type === 'check-result') {
      const pending = this.pending.get(message.id)
      if (pending) {
        pending.resolve(message.unknown)
        this.pending.delete(message.id)
      }
      return
    }
    if (message.type === 'error') {
      console.error('[spellcheck]', message.message)
    }
  }

  load(variant: CatalanVariant) {
    this.ready = new Promise((resolve) => {
      this.resolveReady = resolve
    })
    this.worker.postMessage({ type: 'load', variant })
  }

  async whenReady(): Promise<void> {
    return this.ready
  }

  /** Returns the subset of `words` that are not recognized by the dictionary. */
  async checkWords(words: string[]): Promise<string[]> {
    await this.ready
    if (words.length === 0) return []
    const id = this.nextId++
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
      this.worker.postMessage({ type: 'check', id, words })
    })
  }

  dispose() {
    this.worker.removeEventListener('message', this.handleMessage)
    this.worker.removeEventListener('error', this.handleError)
    this.worker.terminate()
  }
}
