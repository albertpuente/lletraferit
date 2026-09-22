// @vitest-environment jsdom
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// React's `act` only suppresses its "not wrapped in act" warnings when the
// environment declares itself act-aware; jsdom (unlike a real browser) needs
// this flag set explicitly.
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('../../storage/db', () => ({
  getMostRecentDocument: vi.fn(async () => undefined),
  saveSettings: vi.fn(async () => {}),
  upsertDocument: vi.fn(async () => {}),
}))

vi.mock('../../storage/fileSystem', () => ({
  createSaveHandle: vi.fn(),
  downloadAsFile: vi.fn(),
  isFileSystemAccessSupported: vi.fn(() => true),
  openFile: vi.fn(),
  tryWriteToFreshHandle: vi.fn(),
  tryWriteToHandle: vi.fn(),
}))

import { useDocument } from '../useDocument'
import * as db from '../../storage/db'
import * as fileSystem from '../../storage/fileSystem'

const mockedDb = vi.mocked(db)
const mockedFs = vi.mocked(fileSystem)

function fakeHandle(name = 'poema.txt') {
  return { name } as unknown as FileSystemFileHandle
}

/** Mounts `useDocument` in a real (jsdom) React tree and exposes its latest
 * return value, re-rendering synchronously after every state update so
 * assertions always see up-to-date values — without pulling in
 * @testing-library/react. */
function renderUseDocument() {
  let hookValue!: ReturnType<typeof useDocument>
  function TestComponent() {
    // Test-only harness component (not a real app component): capturing the
    // hook's return value this way is how we observe it without pulling in
    // @testing-library/react. oxlint's react/globals rule flags this as a
    // side effect during render, which is fine here.
    hookValue = useDocument()
    return null
  }
  const container = document.createElement('div')
  const root = createRoot(container)
  act(() => {
    root.render(createElement(TestComponent))
  })
  return {
    get current() {
      return hookValue
    },
    unmount: () => act(() => root.unmount()),
  }
}

describe('useDocument saving', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedDb.getMostRecentDocument.mockResolvedValue(undefined)
    mockedDb.upsertDocument.mockResolvedValue(undefined)
    mockedDb.saveSettings.mockResolvedValue(undefined as never)
    mockedFs.isFileSystemAccessSupported.mockReturnValue(true)
  })

  let harness: ReturnType<typeof renderUseDocument> | undefined
  afterEach(() => {
    harness?.unmount()
    harness = undefined
  })

  it('writes straight to an already-linked file handle and marks the document clean', async () => {
    const handle = fakeHandle('existent.txt')
    mockedFs.openFile.mockResolvedValue({ name: 'existent.txt', content: 'hola', handle })
    mockedFs.tryWriteToHandle.mockResolvedValue(true)

    harness = renderUseDocument()
    await act(async () => {
      await harness!.current.openDocument()
    })
    expect(harness.current.hasFileHandle).toBe(true)

    await act(async () => {
      await harness!.current.saveDocument()
    })

    expect(mockedFs.tryWriteToHandle).toHaveBeenCalledWith(handle, 'hola')
    // Must never re-open the save picker when a working handle is already
    // linked — that would be a regression to the "asks for a location on
    // every save" bug.
    expect(mockedFs.createSaveHandle).not.toHaveBeenCalled()
    expect(harness.current.isDirty).toBe(false)
    expect(harness.current.status).toBe('idle')
  })

  it('falls back to a fresh save-location picker when the linked handle can no longer be written to', async () => {
    const oldHandle = fakeHandle('existent.txt')
    const newHandle = fakeHandle('existent.txt')
    mockedFs.openFile.mockResolvedValue({ name: 'existent.txt', content: 'hola', handle: oldHandle })
    mockedFs.tryWriteToHandle.mockResolvedValue(false)
    mockedFs.createSaveHandle.mockResolvedValue({ handle: newHandle, name: 'existent.txt' })
    mockedFs.tryWriteToFreshHandle.mockResolvedValue(true)

    harness = renderUseDocument()
    await act(async () => {
      await harness!.current.openDocument()
    })

    await act(async () => {
      await harness!.current.saveDocument()
    })

    expect(mockedFs.createSaveHandle).toHaveBeenCalled()
    expect(mockedFs.tryWriteToFreshHandle).toHaveBeenCalledWith(newHandle, 'hola')
    expect(harness.current.isDirty).toBe(false)
    expect(harness.current.status).toBe('idle')
    expect(harness.current.hasFileHandle).toBe(true)
  })

  it('prompts for a save location on first save of an untitled document', async () => {
    const handle = fakeHandle('nou-poema.txt')
    mockedFs.createSaveHandle.mockResolvedValue({ handle, name: 'nou-poema.txt' })
    mockedFs.tryWriteToFreshHandle.mockResolvedValue(true)

    harness = renderUseDocument()
    act(() => {
      harness!.current.setContent('un vers nou')
    })
    expect(harness.current.isDirty).toBe(true)

    await act(async () => {
      await harness!.current.saveDocument()
    })

    expect(mockedFs.createSaveHandle).toHaveBeenCalled()
    expect(mockedFs.tryWriteToFreshHandle).toHaveBeenCalledWith(handle, 'un vers nou')
    expect(harness.current.hasFileHandle).toBe(true)
    expect(harness.current.isDirty).toBe(false)
    expect(harness.current.status).toBe('idle')
  })

  it('writes the latest typed content when save runs before React rerenders the keyboard handler', async () => {
    // Regression test: CodeMirror invokes setContent, but a ⌘S keydown can
    // arrive before React has rerendered App's window listener. That listener
    // calls the previous render's saveDocument callback, which used to close
    // over the initial empty content and produce a 0-byte file.
    const handle = fakeHandle('nou-poema.txt')
    mockedFs.createSaveHandle.mockResolvedValue({ handle, name: 'nou-poema.txt' })
    mockedFs.tryWriteToFreshHandle.mockResolvedValue(true)

    harness = renderUseDocument()
    const saveBeforeTyping = harness.current.saveDocument

    await act(async () => {
      harness!.current.setContent('el vers que acabo d’escriure')
      await saveBeforeTyping()
    })

    expect(mockedFs.tryWriteToFreshHandle).toHaveBeenCalledWith(handle, 'el vers que acabo d’escriure')
    expect(harness.current.isDirty).toBe(false)
  })

  it('leaves state untouched when the user cancels the save-location picker', async () => {
    mockedFs.createSaveHandle.mockResolvedValue(null)

    harness = renderUseDocument()
    act(() => {
      harness!.current.setContent('contingut')
    })

    await act(async () => {
      await harness!.current.saveDocument()
    })

    expect(harness.current.status).toBe('idle')
    expect(harness.current.isDirty).toBe(true)
    expect(harness.current.hasFileHandle).toBe(false)
    expect(mockedDb.upsertDocument).not.toHaveBeenCalled()
  })

  it('shows an error status (without throwing) when writing the freshly-picked file fails', async () => {
    const handle = fakeHandle()
    mockedFs.createSaveHandle.mockResolvedValue({ handle, name: 'poema.txt' })
    mockedFs.tryWriteToFreshHandle.mockResolvedValue(false)

    harness = renderUseDocument()
    act(() => {
      harness!.current.setContent('contingut')
    })

    await act(async () => {
      await harness!.current.saveDocument()
    })

    expect(harness.current.status).toBe('error')
    expect(harness.current.errorMessage).toBeTruthy()
    expect(harness.current.hasFileHandle).toBe(false)
    expect(harness.current.isDirty).toBe(true)
  })

  it('downloads the file and marks it clean when the File System Access API is unsupported', async () => {
    mockedFs.isFileSystemAccessSupported.mockReturnValue(false)

    harness = renderUseDocument()
    act(() => {
      harness!.current.setContent('contingut')
    })

    await act(async () => {
      await harness!.current.saveDocument()
    })

    expect(mockedFs.downloadAsFile).toHaveBeenCalledWith('Sense titol.txt', 'contingut')
    expect(mockedFs.createSaveHandle).not.toHaveBeenCalled()
    expect(harness.current.isDirty).toBe(false)
    expect(harness.current.status).toBe('idle')
  })

  it('backs up the document to IndexedDB with the linked file handle after a successful save', async () => {
    const handle = fakeHandle('existent.txt')
    mockedFs.openFile.mockResolvedValue({ name: 'existent.txt', content: 'hola', handle })
    mockedFs.tryWriteToHandle.mockResolvedValue(true)

    harness = renderUseDocument()
    await act(async () => {
      await harness!.current.openDocument()
    })
    await act(async () => {
      await harness!.current.saveDocument()
    })

    expect(mockedDb.upsertDocument).toHaveBeenLastCalledWith(
      expect.objectContaining({ name: 'existent.txt', content: 'hola', fileHandle: handle }),
    )
    expect(mockedDb.saveSettings).toHaveBeenLastCalledWith({ lastDocId: harness.current.id })
  })

  it('does not let the async mount-time restore clobber content the user already typed', async () => {
    // Regression test: the mount-time "restore most recent document" effect
    // reads from IndexedDB asynchronously. If the user starts typing (or
    // creates/opens a document) before that read resolves, it must not
    // overwrite what the user is already working on once it does resolve —
    // otherwise the *next* save silently writes back the stale, restored
    // content instead of what the user actually typed.
    let resolveRestore!: (doc: db.DocumentRecord) => void
    mockedDb.getMostRecentDocument.mockReturnValue(
      new Promise((resolve) => {
        resolveRestore = resolve
      }),
    )

    harness = renderUseDocument()
    // Simulate the user typing before the mount-time "restore most recent
    // document" lookup has resolved.
    act(() => {
      harness!.current.setContent('un vers escrit molt rapid')
    })
    expect(harness.current.content).toBe('un vers escrit molt rapid')

    // Now let the restore resolve with a *different*, previously-saved
    // document — this is the realistic race: the app had an old document
    // sitting in IndexedDB from a previous session.
    await act(async () => {
      resolveRestore({
        id: 'old-doc-id',
        name: 'poema-antic.txt',
        content: 'contingut antic',
        updatedAt: 1,
      })
    })

    expect(harness.current.content).toBe('un vers escrit molt rapid')
  })

  it('does not let the async mount-time restore clobber a document created via New before it resolves', async () => {
    let resolveRestore!: (doc: db.DocumentRecord) => void
    mockedDb.getMostRecentDocument.mockReturnValue(
      new Promise((resolve) => {
        resolveRestore = resolve
      }),
    )

    harness = renderUseDocument()
    act(() => {
      harness!.current.newDocument()
    })
    const idAfterNew = harness.current.id

    await act(async () => {
      resolveRestore({
        id: 'old-doc-id',
        name: 'poema-antic.txt',
        content: 'contingut antic',
        updatedAt: 1,
      })
    })

    expect(harness.current.id).toBe(idAfterNew)
    expect(harness.current.content).toBe('')
  })

  it('does not let the async mount-time restore clobber a document opened before it resolves', async () => {
    let resolveRestore!: (doc: db.DocumentRecord) => void
    mockedDb.getMostRecentDocument.mockReturnValue(
      new Promise((resolve) => {
        resolveRestore = resolve
      }),
    )
    const handle = fakeHandle('obert.txt')
    mockedFs.openFile.mockResolvedValue({ name: 'obert.txt', content: 'contingut obert', handle })

    harness = renderUseDocument()
    await act(async () => {
      await harness!.current.openDocument()
    })

    await act(async () => {
      resolveRestore({
        id: 'old-doc-id',
        name: 'poema-antic.txt',
        content: 'contingut antic',
        updatedAt: 1,
      })
    })

    expect(harness.current.content).toBe('contingut obert')
    expect(harness.current.name).toBe('obert.txt')
  })
})
