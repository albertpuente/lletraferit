import { useCallback, useEffect, useRef, useState } from 'react'
import { downloadAsFile, isFileSystemAccessSupported, openFile, verifyPermission, writeToHandle } from '../storage/fileSystem'
import { getMostRecentDocument, saveSettings, upsertDocument } from '../storage/db'

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'needs-permission' | 'error'

const UNTITLED_NAME = 'Sense titol.txt'
const AUTOSAVE_DELAY_MS = 5000

function createId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `doc-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function useDocument() {
  const [id, setId] = useState<string>(() => createId())
  const [name, setNameState] = useState(UNTITLED_NAME)
  const [content, setContentState] = useState('')
  const [status, setStatus] = useState<SaveStatus>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const fileHandleRef = useRef<FileSystemFileHandle | undefined>(undefined)
  const [hasFileHandle, setHasFileHandle] = useState(false)
  const restoredRef = useRef(false)
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Restore the most recently edited document on first mount.
  useEffect(() => {
    if (restoredRef.current) return
    restoredRef.current = true
    ;(async () => {
      const doc = await getMostRecentDocument()
      if (doc) {
        setId(doc.id)
        setNameState(doc.name)
        setContentState(doc.content)
        fileHandleRef.current = doc.fileHandle
        setHasFileHandle(!!doc.fileHandle)
        setStatus('saved')
      }
    })()
  }, [])

  const persist = useCallback(async (docId: string, docName: string, docContent: string) => {
    setStatus('saving')
    try {
      if (fileHandleRef.current) {
        const granted = await verifyPermission(fileHandleRef.current)
        if (!granted) {
          setStatus('needs-permission')
          return
        }
        // Write the actual file first: this is the part the user cares
        // about, and it must not be skipped just because the IndexedDB
        // bookkeeping below (which also tries to persist the handle
        // itself, for restoring the file link on next launch) fails.
        await writeToHandle(fileHandleRef.current, docContent)
      }

      try {
        await upsertDocument({
          id: docId,
          name: docName,
          content: docContent,
          updatedAt: Date.now(),
          fileHandle: fileHandleRef.current,
        })
      } catch {
        // Some browsers can't structured-clone a FileSystemFileHandle into
        // IndexedDB. The real file above is already saved either way, so
        // just drop the handle from this record instead of failing the
        // whole save — the document just won't auto-relink to its file on
        // next launch.
        await upsertDocument({ id: docId, name: docName, content: docContent, updatedAt: Date.now() })
      }
      await saveSettings({ lastDocId: docId })

      setStatus('saved')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error))
      setStatus('error')
    }
  }, [])

  // Schedules a debounced autosave, resetting the 5s inactivity window on
  // every call — shared by both content and name edits so renaming the
  // document autosaves the same way typing does.
  const scheduleAutosave = useCallback(
    (docId: string, docName: string, docContent: string) => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
      autosaveTimer.current = setTimeout(() => {
        persist(docId, docName, docContent)
      }, AUTOSAVE_DELAY_MS)
    },
    [persist],
  )

  const setContent = useCallback(
    (next: string) => {
      setContentState(next)
      // Hide the "Desat" label immediately: the new content is genuinely
      // unsaved until the pending autosave (or an explicit save) completes,
      // so showing a stale "saved" status would be misleading.
      setStatus('idle')
      scheduleAutosave(id, name, next)
    },
    [id, name, scheduleAutosave],
  )

  const setName = useCallback(
    (next: string) => {
      setNameState(next)
      setStatus('idle')
      scheduleAutosave(id, next, content)
    },
    [id, content, scheduleAutosave],
  )

  const newDocument = useCallback(() => {
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
    const newId = createId()
    fileHandleRef.current = undefined
    setHasFileHandle(false)
    setId(newId)
    setNameState(UNTITLED_NAME)
    setContentState('')
    setStatus('saved')
    persist(newId, UNTITLED_NAME, '')
  }, [persist])

  const openDocument = useCallback(async () => {
    const opened = await openFile()
    if (!opened) return
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
    const newId = createId()
    fileHandleRef.current = opened.handle
    setHasFileHandle(!!opened.handle)
    setId(newId)
    setNameState(opened.name)
    setContentState(opened.content)
    // showOpenFilePicker only grants read permission by default; request
    // readwrite immediately, while we're still within the user gesture from
    // the Open click, so autosave doesn't silently discover the missing
    // permission later (from a non-gesture context) and get stuck showing
    // "Cal reconnectar el fitxer" on every opened file.
    if (opened.handle) {
      await verifyPermission(opened.handle)
    }
    setStatus('saved')
    await persist(newId, opened.name, opened.content)
  }, [persist])

  const saveDocument = useCallback(async () => {
    // Always a plain, immediate save — the same persist() an autosave
    // would trigger — never a file picker/dialog. A document only gets
    // linked to a real file via "Obre" (opening an existing file); "Desa"
    // just writes to that same file if one is linked (see persist()),
    // or otherwise only to the app's local document store.
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
    if (!isFileSystemAccessSupported()) {
      downloadAsFile(name, content)
    }
    await persist(id, name, content)
  }, [content, id, name, persist])

  const reconnectFile = useCallback(async () => {
    if (!fileHandleRef.current) return
    const granted = await verifyPermission(fileHandleRef.current)
    if (granted) {
      await persist(id, name, content)
    }
  }, [content, id, name, persist])

  // The browser can silently drop a file's write permission in the background
  // (e.g. autosave runs on a timer, with no user gesture, so it can't re-prompt;
  // some browsers also revoke the grant after the tab loses focus for a while).
  // Rather than forcing the user to notice and click "Cal reconnectar el
  // fitxer" every time, silently retry on the very next keystroke or click —
  // those *do* carry the user gesture needed to re-request permission, so in
  // the common case the file reconnects transparently and the banner just
  // disappears on its own.
  useEffect(() => {
    if (status !== 'needs-permission') return
    let attempted = false
    const tryReconnect = () => {
      if (attempted) return
      attempted = true
      reconnectFile()
    }
    window.addEventListener('keydown', tryReconnect, { capture: true, once: true })
    window.addEventListener('pointerdown', tryReconnect, { capture: true, once: true })
    return () => {
      window.removeEventListener('keydown', tryReconnect, { capture: true })
      window.removeEventListener('pointerdown', tryReconnect, { capture: true })
    }
  }, [status, reconnectFile])

  return {
    id,
    name,
    setName,
    content,
    setContent,
    status,
    errorMessage,
    hasFileHandle,
    isFileSystemAccessSupported: isFileSystemAccessSupported(),
    newDocument,
    openDocument,
    saveDocument,
    reconnectFile,
  }
}
