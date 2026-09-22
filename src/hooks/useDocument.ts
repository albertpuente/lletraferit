import { useCallback, useEffect, useRef, useState } from 'react'
import {
  createSaveHandle,
  downloadAsFile,
  isFileSystemAccessSupported,
  openFile,
  tryWriteToFreshHandle,
  tryWriteToHandle,
} from '../storage/fileSystem'
import { getMostRecentDocument, saveSettings, upsertDocument } from '../storage/db'

/** Transient save-action feedback only — NOT a persistent "saved"/"needs
 * reconnecting" indicator (see `isDirty` for that). 'saving' and 'error'
 * are only ever set for the duration of an explicit save action. */
export type SaveStatus = 'idle' | 'saving' | 'error'

const UNTITLED_NAME = 'Sense titol.txt'

function createId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `doc-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

/**
 * Manages the current document's content/name, its link (if any) to a real
 * on-disk file via the File System Access API, and explicit save/open/new
 * actions. Deliberately has NO autosave: the document is only ever written
 * to disk when the user explicitly saves (button click or Ctrl/Cmd+S).
 * `isDirty` tracks whether there are unsaved changes since the last
 * successful save (or load), for the UI to show as a simple indicator.
 */
export function useDocument() {
  const [id, setId] = useState<string>(() => createId())
  const [name, setNameState] = useState(UNTITLED_NAME)
  const [content, setContentState] = useState('')
  const [isDirty, setIsDirty] = useState(false)
  const [status, setStatus] = useState<SaveStatus>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const fileHandleRef = useRef<FileSystemFileHandle | undefined>(undefined)
  // React state updates are not visible to callbacks created by the previous
  // render until React has committed the next render. Keep the values used by
  // save actions in refs as well, so ⌘S immediately after typing cannot write
  // the old (often empty) `content` snapshot captured by the keyboard listener.
  const idRef = useRef(id)
  const nameRef = useRef(name)
  const contentRef = useRef(content)
  const [hasFileHandle, setHasFileHandle] = useState(false)
  const restoredRef = useRef(false)
  // Set by any action that establishes "what document is current"
  // (typing, renaming, New, Open, a completed save) before the async
  // restore below has resolved. Without this, a user who starts typing (or
  // opens/creates a document) right after mount can have that in-progress
  // work silently overwritten the moment the slower IndexedDB read resolves
  // afterwards — which then makes the *next* save write the wrong (stale,
  // restored) content over whatever the user actually meant to save.
  const documentReplacedRef = useRef(false)

  // Restore the most recently edited document on first mount, so a reload
  // doesn't lose in-progress work even though there's no autosave-to-disk.
  useEffect(() => {
    if (restoredRef.current) return
    restoredRef.current = true
    ;(async () => {
      const doc = await getMostRecentDocument()
      if (doc && !documentReplacedRef.current) {
        idRef.current = doc.id
        nameRef.current = doc.name
        contentRef.current = doc.content
        setId(doc.id)
        setNameState(doc.name)
        setContentState(doc.content)
        fileHandleRef.current = doc.fileHandle
        setHasFileHandle(!!doc.fileHandle)
        setIsDirty(false)
      }
    })()
  }, [])

  // Backs up the document to the app's local (IndexedDB) document store,
  // separate from the real on-disk file (if any) — purely so the most
  // recent document can be restored above if the app is reopened later.
  // This is NOT an autosave: it only ever runs right after an explicit,
  // successful save/new/open, never on a timer or on every keystroke.
  const backup = useCallback(async (docId: string, docName: string, docContent: string) => {
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
      // IndexedDB; back up without it rather than failing entirely.
      await upsertDocument({ id: docId, name: docName, content: docContent, updatedAt: Date.now() })
    }
    await saveSettings({ lastDocId: docId })
  }, [])

  const setContent = useCallback((next: string) => {
    documentReplacedRef.current = true
    contentRef.current = next
    setContentState(next)
    setIsDirty(true)
  }, [])

  const setName = useCallback((next: string) => {
    documentReplacedRef.current = true
    nameRef.current = next
    setNameState(next)
    setIsDirty(true)
  }, [])

  const newDocument = useCallback(() => {
    documentReplacedRef.current = true
    const newId = createId()
    fileHandleRef.current = undefined
    idRef.current = newId
    nameRef.current = UNTITLED_NAME
    contentRef.current = ''
    setHasFileHandle(false)
    setId(newId)
    setNameState(UNTITLED_NAME)
    setContentState('')
    setIsDirty(false)
    setStatus('idle')
    backup(newId, UNTITLED_NAME, '')
  }, [backup])

  const openDocument = useCallback(async () => {
    const opened = await openFile()
    if (!opened) return
    documentReplacedRef.current = true
    const newId = createId()
    fileHandleRef.current = opened.handle
    idRef.current = newId
    nameRef.current = opened.name
    contentRef.current = opened.content
    setHasFileHandle(!!opened.handle)
    setId(newId)
    setNameState(opened.name)
    setContentState(opened.content)
    setIsDirty(false)
    setStatus('idle')
    await backup(newId, opened.name, opened.content)
  }, [backup])

  const saveDocument = useCallback(async () => {
    // Read from the refs rather than the closure's React-state snapshot. This
    // matters when a native keyboard shortcut fires before React has rerendered
    // after CodeMirror's onChange callback.
    const currentId = idRef.current
    const currentName = nameRef.current
    const currentContent = contentRef.current
    documentReplacedRef.current = true
    setStatus('saving')
    setErrorMessage(null)

    // Already linked to a real file: just try to save straight to it.
    // tryWriteToHandle silently (re-)requests permission if needed — safe
    // here because this whole function only ever runs from a direct user
    // gesture (the Desa button or Ctrl/Cmd+S), never from a background
    // timer, so the browser can grant it without an extra prompt.
    if (fileHandleRef.current) {
      const wrote = await tryWriteToHandle(fileHandleRef.current, currentContent)
      if (wrote) {
        setIsDirty(false)
        setStatus('idle')
        await backup(currentId, currentName, currentContent)
        return
      }
      // Couldn't write (permission no longer available, handle no longer
      // valid, etc.): fall through to the save-location picker below
      // instead of getting stuck — the user just re-picks a location and
      // things work again, with no "reconnect" prompt ever shown.
    }

    if (!isFileSystemAccessSupported()) {
      downloadAsFile(currentName, currentContent)
      setIsDirty(false)
      setStatus('idle')
      await backup(currentId, currentName, currentContent)
      return
    }

    const picked = await createSaveHandle(currentName)
    if (!picked) {
      // User cancelled the picker: leave everything as it was.
      setStatus('idle')
      return
    }
    // Use tryWriteToFreshHandle (not tryWriteToHandle) here: this handle was
    // just picked, so re-verifying permission before writing is not only
    // unnecessary but can actively fail (see its docstring) and leave
    // behind the empty file the OS already created when the location was
    // chosen.
    const wrote = await tryWriteToFreshHandle(picked.handle, currentContent)
    if (!wrote) {
      setErrorMessage('No s\u2019ha pogut desar el fitxer.')
      setStatus('error')
      return
    }
    fileHandleRef.current = picked.handle
    setHasFileHandle(true)
    nameRef.current = picked.name
    setNameState(picked.name)
    setIsDirty(false)
    setStatus('idle')
    await backup(currentId, picked.name, currentContent)
  }, [backup])

  return {
    id,
    name,
    setName,
    content,
    setContent,
    isDirty,
    status,
    errorMessage,
    hasFileHandle,
    isFileSystemAccessSupported: isFileSystemAccessSupported(),
    newDocument,
    openDocument,
    saveDocument,
  }
}
