import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createSaveHandle,
  isFileSystemAccessSupported,
  pickSaveHandle,
  tryWriteToFreshHandle,
  tryWriteToHandle,
  verifyPermission,
} from '../fileSystem'

/** Minimal fake satisfying just the FileSystemFileHandle members these
 * functions actually touch, so tests don't need a real browser or a full
 * interface implementation. */
function fakeHandle(overrides: {
  queryPermission?: () => Promise<PermissionState>
  requestPermission?: () => Promise<PermissionState>
  name?: string
}) {
  return {
    name: overrides.name ?? 'poema.txt',
    queryPermission: overrides.queryPermission ?? vi.fn(async () => 'granted' as PermissionState),
    requestPermission: overrides.requestPermission ?? vi.fn(async () => 'granted' as PermissionState),
  } as unknown as FileSystemFileHandle
}

function fakeWritableHandle(overrides: {
  queryPermission?: () => Promise<PermissionState>
  requestPermission?: () => Promise<PermissionState>
  createWritable?: () => Promise<{ write: (data: string) => Promise<void>; close: () => Promise<void> }>
}) {
  return {
    ...fakeHandle({ queryPermission: overrides.queryPermission, requestPermission: overrides.requestPermission }),
    createWritable:
      overrides.createWritable ?? vi.fn(async () => ({ write: vi.fn(async () => {}), close: vi.fn(async () => {}) })),
  } as unknown as FileSystemFileHandle
}

describe('verifyPermission', () => {
  it('returns true and does not request permission when already granted', async () => {
    const requestPermission = vi.fn(async () => 'granted' as PermissionState)
    const handle = fakeHandle({ queryPermission: async () => 'granted', requestPermission })

    expect(await verifyPermission(handle)).toBe(true)
    expect(requestPermission).not.toHaveBeenCalled()
  })

  it('requests permission and returns true when the request is granted', async () => {
    const handle = fakeHandle({ queryPermission: async () => 'prompt', requestPermission: async () => 'granted' })
    expect(await verifyPermission(handle)).toBe(true)
  })

  it('returns false when neither query nor request permission are granted', async () => {
    // Regression test: this is exactly the scenario that made the app show
    // "Cal reconnectar el fitxer" — a handle whose permission genuinely
    // isn't granted must be reported as such, not silently treated as ok.
    const handle = fakeHandle({ queryPermission: async () => 'prompt', requestPermission: async () => 'denied' })
    expect(await verifyPermission(handle)).toBe(false)
  })
})

describe('pickSaveHandle', () => {
  afterEach(() => {
    // @ts-expect-error test-only global stub
    delete globalThis.window
  })

  it('returns the handle from showSaveFilePicker', async () => {
    const handle = fakeHandle({})
    // @ts-expect-error test-only global stub
    globalThis.window = { showSaveFilePicker: vi.fn(async () => handle) }

    expect(await pickSaveHandle('poema.txt')).toBe(handle)
  })

  it('returns null when the user cancels the picker', async () => {
    // @ts-expect-error test-only global stub
    globalThis.window = {
      showSaveFilePicker: vi.fn(async () => {
        throw new DOMException('cancelled', 'AbortError')
      }),
    }

    expect(await pickSaveHandle('poema.txt')).toBeNull()
  })

  it('rethrows non-cancellation errors', async () => {
    // @ts-expect-error test-only global stub
    globalThis.window = {
      showSaveFilePicker: vi.fn(async () => {
        throw new Error('disk full')
      }),
    }

    await expect(pickSaveHandle('poema.txt')).rejects.toThrow('disk full')
  })
})

describe('isFileSystemAccessSupported', () => {
  afterEach(() => {
    // @ts-expect-error test-only global stub
    delete globalThis.window
  })

  it('detects saving from showSaveFilePicker, without requiring the open picker', () => {
    // A save action must be feature-detected against the API it actually
    // uses. Requiring showOpenFilePicker here previously sent browsers that
    // exposed only showSaveFilePicker down the download fallback, skipping
    // their native Save As dialog entirely.
    // @ts-expect-error test-only partial window stub
    globalThis.window = { showSaveFilePicker: vi.fn() }

    expect(isFileSystemAccessSupported()).toBe(true)
  })

  it('returns false when the save picker is unavailable', () => {
    // @ts-expect-error test-only partial window stub
    globalThis.window = { showOpenFilePicker: vi.fn() }

    expect(isFileSystemAccessSupported()).toBe(false)
  })
})

describe('createSaveHandle', () => {
  afterEach(() => {
    // @ts-expect-error test-only global stub
    delete globalThis.window
  })

  it('returns the handle and name when the picker succeeds', async () => {
    const handle = fakeHandle({ name: 'el-meu-poema.txt' })
    // @ts-expect-error test-only global stub
    globalThis.window = { showSaveFilePicker: vi.fn(async () => handle) }

    const result = await createSaveHandle('poema.txt')
    expect(result).toEqual({ handle, name: 'el-meu-poema.txt' })
  })

  it('returns null when the user cancels the picker', async () => {
    // @ts-expect-error test-only global stub
    globalThis.window = {
      showSaveFilePicker: vi.fn(async () => {
        throw new DOMException('cancelled', 'AbortError')
      }),
    }

    expect(await createSaveHandle('poema.txt')).toBeNull()
  })

  it('adopts the handle even when its permission would not (yet) report granted', async () => {
    // Regression test: an earlier version of this function called
    // verifyPermission (which can fall back to requestPermission) right
    // after the picker resolved, and discarded the handle if that didn't
    // report "granted". requestPermission needs a fresh user gesture, and
    // the time spent browsing folders in the native picker can exhaust the
    // original click's activation window by the time it resolves — so a
    // perfectly valid, just-picked handle was being silently thrown away.
    // That showed up as the app never adopting the file: its name never
    // updated, and "Desa" kept reopening the picker on every subsequent
    // click instead of just saving. createSaveHandle must always adopt the
    // handle once the user has picked a location, regardless of what a
    // permission check reports.
    const handle = fakeHandle({ queryPermission: async () => 'prompt', requestPermission: async () => 'denied' })
    // @ts-expect-error test-only global stub
    globalThis.window = { showSaveFilePicker: vi.fn(async () => handle) }

    expect(await createSaveHandle('poema.txt')).toEqual({ handle, name: handle.name })
  })

  it('does not call queryPermission or requestPermission at all', async () => {
    // createSaveHandle must not attempt to verify permission itself (see
    // docstring): any actual permission check happens later (if at all —
    // see tryWriteToFreshHandle below), always from within the direct user
    // gesture that triggered the save.
    const queryPermission = vi.fn(async () => 'granted' as PermissionState)
    const requestPermission = vi.fn(async () => 'granted' as PermissionState)
    const handle = fakeHandle({ queryPermission, requestPermission })
    // @ts-expect-error test-only global stub
    globalThis.window = { showSaveFilePicker: vi.fn(async () => handle) }

    await createSaveHandle('poema.txt')
    expect(queryPermission).not.toHaveBeenCalled()
    expect(requestPermission).not.toHaveBeenCalled()
  })
})

describe('tryWriteToHandle', () => {
  it('writes the content and returns true when permission is already granted', async () => {
    const write = vi.fn(async () => {})
    const close = vi.fn(async () => {})
    const handle = fakeWritableHandle({
      queryPermission: async () => 'granted',
      createWritable: async () => ({ write, close }),
    })

    expect(await tryWriteToHandle(handle, 'contingut')).toBe(true)
    expect(write).toHaveBeenCalledWith('contingut')
    expect(close).toHaveBeenCalled()
  })

  it('requests permission first when not already granted, and writes if it succeeds', async () => {
    const handle = fakeWritableHandle({
      queryPermission: async () => 'prompt',
      requestPermission: async () => 'granted',
    })
    expect(await tryWriteToHandle(handle, 'contingut')).toBe(true)
  })

  it('returns false (never throws) when permission is denied', async () => {
    // Regression test: this exact scenario used to surface as "Cal
    // reconnectar el fitxer" and get the app stuck. It must now just be
    // reported as a plain failure so the caller can fall back to a fresh
    // save-location picker instead.
    const handle = fakeWritableHandle({
      queryPermission: async () => 'prompt',
      requestPermission: async () => 'denied',
    })
    await expect(tryWriteToHandle(handle, 'contingut')).resolves.toBe(false)
  })

  it('returns false (never throws) when the write itself fails', async () => {
    const handle = fakeWritableHandle({
      queryPermission: async () => 'granted',
      createWritable: async () => {
        throw new Error('disk full')
      },
    })
    await expect(tryWriteToHandle(handle, 'contingut')).resolves.toBe(false)
  })
})

describe('tryWriteToFreshHandle', () => {
  it('writes the content and returns true, without checking permission at all', async () => {
    // Regression test: a fresh handle from createSaveHandle is already
    // pre-granted "readwrite" permission by the picker itself. Re-checking
    // permission here (as tryWriteToHandle does) can silently fail because
    // the picker's own user gesture may already be spent by the time it
    // resolves, skipping the write — but the OS has already created the
    // (now permanently empty) target file the moment the location was
    // picked. This is exactly what previously showed up as "saving creates
    // a 0-byte file". tryWriteToFreshHandle must write unconditionally.
    const queryPermission = vi.fn(async () => 'prompt' as PermissionState)
    const requestPermission = vi.fn(async () => 'denied' as PermissionState)
    const write = vi.fn(async () => {})
    const close = vi.fn(async () => {})
    const handle = fakeWritableHandle({ queryPermission, requestPermission, createWritable: async () => ({ write, close }) })

    expect(await tryWriteToFreshHandle(handle, 'contingut')).toBe(true)
    expect(write).toHaveBeenCalledWith('contingut')
    expect(close).toHaveBeenCalled()
    expect(queryPermission).not.toHaveBeenCalled()
    expect(requestPermission).not.toHaveBeenCalled()
  })

  it('returns false (never throws) when the write itself fails', async () => {
    const handle = fakeWritableHandle({
      createWritable: async () => {
        throw new Error('disk full')
      },
    })
    await expect(tryWriteToFreshHandle(handle, 'contingut')).resolves.toBe(false)
  })
})
