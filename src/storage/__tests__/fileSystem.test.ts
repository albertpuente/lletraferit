import { afterEach, describe, expect, it, vi } from 'vitest'
import { createSaveHandle, pickSaveHandle, verifyPermission } from '../fileSystem'

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

describe('createSaveHandle', () => {
  afterEach(() => {
    // @ts-expect-error test-only global stub
    delete globalThis.window
  })

  it('returns the handle and name when the picker succeeds and permission is granted', async () => {
    const handle = fakeHandle({ name: 'el-meu-poema.txt', queryPermission: async () => 'granted' })
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

  it('returns null (rather than a handle the app would immediately flag as needing reconnection) when permission is not granted', async () => {
    // Regression test for the bug where saving a brand new file
    // immediately showed "Cal reconnectar el fitxer": createSaveHandle
    // must verify permission itself, right after the picker resolves,
    // and refuse to hand back a handle that isn't actually usable yet.
    const handle = fakeHandle({ queryPermission: async () => 'prompt', requestPermission: async () => 'denied' })
    // @ts-expect-error test-only global stub
    globalThis.window = { showSaveFilePicker: vi.fn(async () => handle) }

    expect(await createSaveHandle('poema.txt')).toBeNull()
  })

  it('verifies permission with readwrite mode', async () => {
    const queryPermission = vi.fn(async () => 'granted' as PermissionState)
    const handle = fakeHandle({ queryPermission })
    // @ts-expect-error test-only global stub
    globalThis.window = { showSaveFilePicker: vi.fn(async () => handle) }

    await createSaveHandle('poema.txt')
    expect(queryPermission).toHaveBeenCalledWith({ mode: 'readwrite' })
  })
})
