import type { CatalanVariant } from '../engine/types'

export interface LoadMessage {
  type: 'load'
  variant: CatalanVariant
}

export interface CheckMessage {
  type: 'check'
  id: number
  words: string[]
}

export type SpellcheckRequest = LoadMessage | CheckMessage

export interface ReadyMessage {
  type: 'ready'
  variant: CatalanVariant
}

export interface CheckResultMessage {
  type: 'check-result'
  id: number
  /** Subset of the requested words (lowercased) that are not recognized. */
  unknown: string[]
}

export interface ErrorMessage {
  type: 'error'
  message: string
}

export type SpellcheckResponse = ReadyMessage | CheckResultMessage | ErrorMessage

export const DICTIONARY_CODE: Record<CatalanVariant, string> = {
  central: 'ca',
  valencia: 'ca-valencia',
}

/** Clitic particles that elide their vowel before an apostrophe (l', d', s'...). */
export const ELIDABLE_CLITICS = new Set(['l', 'd', 's', 'n', 'm', 't', 'qu', 'c'])
