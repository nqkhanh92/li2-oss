import { describe, it, expect, vi } from 'vitest'

/**
 * REGRESSION GUARD — do not delete.
 *
 * `/a/<token>` is the only public, unauthenticated route in the app. It once imported
 * `artifact.service`, which imports `touchPointService`, which imports the native `canvas` binary
 * via `qr-code-styling`. Every anonymous request 500'd at module-eval time, and no unit test caught
 * it: they all mocked `createTouchPoint`, so the heavy module was never actually loaded.
 *
 * These factories throw. Vitest only runs a mock factory when something in the graph actually
 * imports that module, so importing the serve service below fails loudly the moment anyone puts the
 * authenticated service — or anything native — back on the public path.
 */
vi.mock('canvas', () => {
  throw new Error('`canvas` must never be on the public artifact-serving import path')
})
vi.mock('qr-code-styling', () => {
  throw new Error('`qr-code-styling` must never be on the public artifact-serving import path')
})
vi.mock('@/core/services/touch-point.service', () => {
  throw new Error('`touch-point.service` must never be on the public artifact-serving import path')
})
vi.mock('@/core/services/artifact.service', () => {
  throw new Error('`artifact.service` must never be on the public artifact-serving import path')
})

describe('public artifact-serving import graph', () => {
  it('loads the serve service without dragging in the authenticated or native modules', async () => {
    const mod = await import('@/core/services/artifact-serve.service')
    expect(typeof mod.artifactServeService.getLiveContentByToken).toBe('function')
  })

  it('loads the public route without dragging them in either', async () => {
    const mod = await import('@/app/(artifact)/a/[token]/route')
    expect(typeof mod.GET).toBe('function')
    expect(typeof mod.POST).toBe('function')
  })

  /** R3: the gate reads permissions (supabase + redis) and the Casdoor session (jose) — and nothing heavier. */
  it('loads the gate service without the authenticated service layer', async () => {
    const mod = await import('@/core/services/artifact-gate.service')
    expect(typeof mod.artifactGateService.evaluateGate).toBe('function')
  })

  it.each([
    '@/app/(artifact)/a/[token]/file/route',
    '@/app/(artifact)/a/[token]/download/route',
  ])('loads %s without them', async (path) => {
    const mod = await import(path)
    expect(typeof mod.GET).toBe('function')
  })

  it('loads the switch-account route without them', async () => {
    const mod = await import('@/app/(artifact)/a/[token]/switch-account/route')
    expect(typeof mod.POST).toBe('function')
  })

  /** [P2] `google-auth-library` is pure JS (gaxios) — this is what notices if that ever changes. */
  it.each([
    '@/app/(artifact)/a/[token]/google/route',
    '@/app/(artifact)/a/google/callback/route',
  ])('[P2] loads %s without them', async (path) => {
    const mod = await import(path)
    expect(typeof mod.GET).toBe('function')
  })
})
