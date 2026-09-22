/**
 * Wraps the File System Access API (Chrome/Edge) for opening and saving
 * plain-text poem files directly on disk, with a fallback (upload input /
 * download link) for browsers that don't support it (Firefox, Safari).
 */

/** Whether this browser can present a native location picker before saving. */
export function isFileSystemAccessSupported(): boolean {
  return typeof window !== 'undefined' && 'showSaveFilePicker' in window
}

/** Whether this browser can present a native picker for opening a file. */
function isOpenFilePickerSupported(): boolean {
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
  if (isOpenFilePickerSupported()) {
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

/**
 * Attempts to write `content` to `handle`, first (re-)verifying/requesting
 * readwrite permission, and never throwing: any failure along the way
 * (permission denied, the handle no longer being valid, a genuine disk
 * write error, etc.) is reported back as `false` rather than propagated,
 * so callers can uniformly fall back to a fresh save-location picker
 * instead of getting stuck on a broken handle or showing a "reconnect"
 * prompt. Intended for handles that may have been granted in a *previous*
 * session (e.g. restored from IndexedDB) and so may need re-verifying.
 *
 * Do NOT use this right after `createSaveHandle` for a handle the user just
 * picked in this same action — see `tryWriteToFreshHandle` instead, which
 * skips this permission dance entirely for that case.
 */
export async function tryWriteToHandle(handle: FileSystemFileHandle, content: string): Promise<boolean> {
  try {
    const granted = await verifyPermission(handle)
    if (!granted) return false
    await writeToHandle(handle, content)
    return true
  } catch {
    return false
  }
}

/**
 * Writes `content` to a handle that was *just* returned by
 * `createSaveHandle` in this same save action, without re-verifying
 * permission first.
 *
 * `showSaveFilePicker` already grants "readwrite" permission as part of
 * resolving the picker, and the browser creates (and truncates to 0 bytes)
 * the target file as soon as the user confirms a location — before any
 * writing happens. If a caller re-checks permission afterwards (as
 * `tryWriteToHandle` does) and that check needs to fall back to
 * `requestPermission`, it can silently fail because the "transient
 * activation" from the picker's own user gesture may already be spent by
 * the time the picker's promise resolves — with no further prompt shown to
 * the user. The write is then skipped, but the already-created empty file
 * is left behind, which is exactly what previously showed up as "saving
 * creates a 0-byte file". Since the handle is fresh and pre-granted, this
 * function writes directly with no permission check, still never throwing.
 */
export async function tryWriteToFreshHandle(handle: FileSystemFileHandle, content: string): Promise<boolean> {
  try {
    await writeToHandle(handle, content)
    return true
  } catch {
    return false
  }
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
 * Prompts the user to choose a save location, returning the resulting
 * handle and its name. Per the File System Access API spec, a handle
 * returned by `showSaveFilePicker` already comes pre-granted the
 * "readwrite" permission the picker was invoked with, so no separate
 * permission check is needed here. Returns null only if the user cancels
 * the picker.
 */
export async function createSaveHandle(suggestedName: string): Promise<SaveHandleResult | null> {
  const handle = await pickSaveHandle(suggestedName)
  if (!handle) return null
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
