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

export interface AppSettings {
  key: 'settings'
  variant: CatalanVariant
  autosaveIntervalMs: number
  theme: 'light' | 'dark' | 'system'
  lastDocId: string | null
  paperTexture: boolean
  spellcheckEnabled: boolean
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

export const DEFAULT_SETTINGS: AppSettings = {
  key: 'settings',
  variant: 'central',
  autosaveIntervalMs: 2000,
  theme: 'light',
  lastDocId: null,
  paperTexture: false,
  spellcheckEnabled: true,
  ignoredWords: [],
}

export async function getSettings(): Promise<AppSettings> {
  const db = await getDb()
  const stored = await db.get('settings', 'settings')
  return stored ? { ...DEFAULT_SETTINGS, ...stored } : DEFAULT_SETTINGS
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
