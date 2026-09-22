/**
 * Wraps the File System Access API (Chrome/Edge) for opening and saving
 * plain-text poem files directly on disk, with a fallback (upload input /
 * download link) for browsers that don't support it (Firefox, Safari).
 */

export function isFileSystemAccessSupported(): boolean {
  return typeof window !== 'undefined' && 'showOpenFilePicker' in window
}

const PICKER_OPTIONS: FilePickerOptions = {
  types: [
    {
      description: 'Poema (text)',
      accept: { 'text/plain': ['.txt', '.poema'] },
    },
  ],
}

export interface OpenedFile {
  name: string
  content: string
  handle?: FileSystemFileHandle
}

/** Opens a file picker and reads the selected file's text content. */
export async function openFile(): Promise<OpenedFile | null> {
  if (isFileSystemAccessSupported()) {
    try {
      const [handle] = await window.showOpenFilePicker(PICKER_OPTIONS)
      const file = await handle.getFile()
      const content = await file.text()
      return { name: file.name, content, handle }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return null
      throw error
    }
  }

  return openFileFallback()
}

function openFileFallback(): Promise<OpenedFile | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.txt,.poema,text/plain'
    input.addEventListener('change', () => {
      const file = input.files?.[0]
      if (!file) {
        resolve(null)
        return
      }
      file.text().then((content) => resolve({ name: file.name, content }))
    })
    input.addEventListener('cancel', () => resolve(null))
    input.click()
  })
}

/** Requests (or verifies) read-write permission on a previously granted handle. */
export async function verifyPermission(handle: FileSystemFileHandle): Promise<boolean> {
  const options: FileSystemHandlePermissionDescriptor = { mode: 'readwrite' }
  if ((await handle.queryPermission(options)) === 'granted') return true
  return (await handle.requestPermission(options)) === 'granted'
}

/** Writes `content` to an existing file handle. */
export async function writeToHandle(handle: FileSystemFileHandle, content: string): Promise<void> {
  const writable = await handle.createWritable()
  await writable.write(content)
  await writable.close()
}

/** Prompts the user to choose a location to save a new file, returning the handle. */
export async function pickSaveHandle(suggestedName: string): Promise<FileSystemFileHandle | null> {
  try {
    return await window.showSaveFilePicker({ suggestedName, ...PICKER_OPTIONS })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return null
    throw error
  }
}

export interface SaveHandleResult {
  handle: FileSystemFileHandle
  name: string
}

/**
 * Prompts the user to choose a save location and immediately verifies (or
 * requests) readwrite permission on the resulting handle, before returning
 * it — mirroring the same immediate-verification pattern already used for
 * open handles (see `openDocument` in useDocument.ts). A handle from
 * `showSaveFilePicker` is not reliably pre-granted permission in every
 * browser; deferring the permission check to a later, separately-awaited
 * step (as an earlier version of this code did, via `persist`) introduces
 * enough extra async hops for the browser to no longer treat the check as
 * connected to the user's original gesture, so `requestPermission` quietly
 * fails instead of prompting — which showed up as the app immediately
 * flagging a brand new file as "needs reconnecting" right after saving it.
 * Returns null if the user cancels the picker, or if permission is not
 * granted.
 */
export async function createSaveHandle(suggestedName: string): Promise<SaveHandleResult | null> {
  const handle = await pickSaveHandle(suggestedName)
  if (!handle) return null
  const granted = await verifyPermission(handle)
  if (!granted) return null
  return { handle, name: handle.name }
}

/** Fallback save: triggers a browser download of `content` as `name`. */
export function downloadAsFile(name: string, content: string): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  // Must be attached to the DOM for some mobile browsers/WebViews to honor
  // the click, and the object URL must outlive the click: mobile Chrome
  // processes the download asynchronously, so revoking the URL right away
  // (as opposed to on the next tick) races the actual blob read and yields
  // a 0-byte file on Android.
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 30_000)
}
