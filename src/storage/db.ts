import { openDB } from 'idb'
import type { DBSchema, IDBPDatabase } from 'idb'
import type { CatalanVariant } from '../engine/types'

export interface DocumentRecord {
  id: string
  name: string
  content: string
  updatedAt: number
  /** File System Access API handle, if this document is linked to a real file (Chrome/Edge only). */
  fileHandle?: FileSystemFileHandle
}

export type VisualTheme = 'classic' | 'typewriter' | 'modern' | 'pencil'

const VISUAL_THEMES: readonly VisualTheme[] = ['classic', 'typewriter', 'modern', 'pencil']

export interface AppSettings {
  key: 'settings'
  variant: CatalanVariant
  theme: 'light' | 'dark' | 'system'
  /** Overall visual "personality" (color accent, editor/logo font) —
   * independent of the light/dark setting above. */
  visualTheme: VisualTheme
  lastDocId: string | null
  spellcheckEnabled: boolean
  /** Editor text size in pixels; adjustable in Settings, persisted across restarts. */
  fontSize: number
  /** When true, every verse's metrical syllables are permanently underlined
   * with curves (not just the currently-clicked one) — toggled from the
   * Structures panel. */
  showAllSyllableCurves: boolean
  /** When true, shade the text ranges belonging to detected metrical feet. */
  showFootBoundaries: boolean
  /** When true, every verse's stress dots (○/● above each syllable) are
   * permanently shown (not just the currently-clicked verse's) — toggled
   * from the Peus panel. */
  showAllStressDots: boolean
  /** Show nonblocking rhyming, metrically compatible word suggestions while
   * composing a verse after the first line of a stanza. */
  verseSuggestionsEnabled: boolean
  /** User-added words (lowercased) that are always treated as correctly
   * spelled, regardless of what the dictionary says. */
  ignoredWords: string[]
}

interface PoemesDB extends DBSchema {
  documents: {
    key: string
    value: DocumentRecord
    indexes: { 'by-updatedAt': number }
  }
  settings: {
    key: string
    value: AppSettings
  }
}

const DB_NAME = 'poemes'
const DB_VERSION = 1

let dbPromise: Promise<IDBPDatabase<PoemesDB>> | null = null

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<PoemesDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const documents = db.createObjectStore('documents', { keyPath: 'id' })
        documents.createIndex('by-updatedAt', 'updatedAt')
        db.createObjectStore('settings', { keyPath: 'key' })
      },
    })
  }
  return dbPromise
}

export const FONT_SIZE_MIN = 14
export const FONT_SIZE_MAX = 28
export const FONT_SIZE_STEP = 1
export const FONT_SIZE_DEFAULT = 19
export const FONT_SIZE_DEFAULT_MOBILE = 16
/** Matches Tailwind's `sm` breakpoint, used elsewhere in the app's responsive classes. */
const MOBILE_BREAKPOINT_PX = 640

/** The text size to use when no explicit preference has been saved yet:
 * smaller on narrow (phone-width) screens, since the editor's default size
 * was tuned for desktop reading. */
export function getDefaultFontSize(): number {
  if (typeof window !== 'undefined' && window.innerWidth < MOBILE_BREAKPOINT_PX) {
    return FONT_SIZE_DEFAULT_MOBILE
  }
  return FONT_SIZE_DEFAULT
}

export const DEFAULT_SETTINGS: AppSettings = {
  key: 'settings',
  variant: 'central',
  theme: 'light',
  visualTheme: 'classic',
  lastDocId: null,
  spellcheckEnabled: true,
  fontSize: FONT_SIZE_DEFAULT,
  showAllSyllableCurves: false,
  showFootBoundaries: false,
  showAllStressDots: false,
  verseSuggestionsEnabled: true,
  ignoredWords: [],
}

export async function getSettings(): Promise<AppSettings> {
  const db = await getDb()
  const stored = await db.get('settings', 'settings')
  const merged = stored ? { ...DEFAULT_SETTINGS, ...stored } : { ...DEFAULT_SETTINGS }
  // No explicit fontSize saved yet (new user, or an older settings record
  // predating this feature): pick a size appropriate for the current
  // screen rather than always falling back to the desktop-tuned default.
  // Also guards against a corrupted/invalid persisted value (e.g. a stray
  // NaN written by a transient bug).
  if (stored?.fontSize === undefined || !Number.isFinite(merged.fontSize)) {
    merged.fontSize = getDefaultFontSize()
  }
  // A saved value can outlive a removed visual style (for example, the
  // former calligraphy style). Return a supported value so the selector and
  // page appearance remain in sync after an upgrade.
  if (!VISUAL_THEMES.includes(merged.visualTheme)) {
    merged.visualTheme = DEFAULT_SETTINGS.visualTheme
  }
  return merged
}

export async function saveSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
  const db = await getDb()
  const current = await getSettings()
  const next: AppSettings = { ...current, ...settings, key: 'settings' }
  await db.put('settings', next)
  return next
}

export async function upsertDocument(doc: DocumentRecord): Promise<void> {
  const db = await getDb()
  await db.put('documents', doc)
}

export async function getDocument(id: string): Promise<DocumentRecord | undefined> {
  const db = await getDb()
  return db.get('documents', id)
}

export async function deleteDocument(id: string): Promise<void> {
  const db = await getDb()
  await db.delete('documents', id)
}

export async function listRecentDocuments(limit = 10): Promise<DocumentRecord[]> {
  const db = await getDb()
  const all = await db.getAllFromIndex('documents', 'by-updatedAt')
  return all.sort((a, b) => b.updatedAt - a.updatedAt).slice(0, limit)
}

export async function getMostRecentDocument(): Promise<DocumentRecord | undefined> {
  const recent = await listRecentDocuments(1)
  return recent[0]
}
