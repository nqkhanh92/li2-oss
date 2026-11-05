import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Regression test for the AGENT upload trap (Phase 3a, layers 3 + 4).
//
// WHY THIS EXISTS: create_short_link forces a QR image on every touch point (FORCE_QR_ENABLED), so
// createTouchPoint -> parseQrCustomizeOptions -> simpleUploadFile runs on every agent write. The
// upload helpers used to (3) read only getSession() and throw 401 for an agent, and (4) use the
// browser Supabase client, whose per-user JWT (getSupabaseJwt) is null without a Casdoor cookie ->
// "Invalid Compact JWS" 500. Both broke EVERY agent write. The 3a.0 route test mocked the whole
// touchPointService and the 3a.W walk faked the back-hop, so neither reached this code — the bug
// shipped green and was only caught by the env-gated live walk case. This test drives the REAL
// resolveUploadContext (via simpleUploadFile) under each auth mode so the trap can never reopen in
// normal CI. It is the always-on parallel to agent-permissions.test.ts (layer 1).

vi.mock('server-only', () => ({}))

vi.mock('../../../shared/lib/auth/session', () => ({
  getSession: vi.fn(),
}))

// Two distinguishable storage clients so the test can assert WHICH one each mode selects — that
// selection IS layer 4. Each records the (bucket, path) it was asked to upload to.
const browserUploads: Array<{ bucket: string; path: string }> = []
const serviceUploads: Array<{ bucket: string; path: string }> = []

const makeStorageClient = (sink: Array<{ bucket: string; path: string }>) => ({
  storage: {
    from: (bucket: string) => ({
      upload: async (path: string) => {
        sink.push({ bucket, path })
        return { data: { path, fullPath: `${bucket}/${path}` }, error: null }
      },
    }),
  },
})

vi.mock('../../../infrastructure/database/supabase/client', () => ({
  createClient: vi.fn(() => makeStorageClient(browserUploads)),
}))

vi.mock('../../../infrastructure/database/supabase/server', () => ({
  createServiceClient: vi.fn(async () => makeStorageClient(serviceUploads)),
}))

import { simpleUploadFile } from '../../../shared/lib/storage/upload'
import { getSession } from '../../../shared/lib/auth/session'
import { createClient } from '../../../infrastructure/database/supabase/client'
import { createServiceClient } from '../../../infrastructure/database/supabase/server'
import { requestContext, RequestRole } from '../../../shared/types/request'
import { UnauthorizedError } from '../../../infrastructure/response/errors/domain.errors'

const BROWSER_USER = 'browser-user-sub-123'
const AGENT_USER = 'agent-minting-user-456'

// A tiny SVG "file"; skipValidateFileType avoids the file-type sniff path entirely.
const makeFile = () => new File(['<svg/>'], 'qr', { type: 'image/svg+xml' })
const upload = () =>
  simpleUploadFile({
    folder: 'qr-images',
    file: makeFile(),
    options: { skipValidateFileType: true, fallbackFileType: 'image/svg+xml' },
  })

const asAgent = <T>(userId: string | undefined, fn: () => Promise<T>): Promise<T> =>
  requestContext.run({ role: RequestRole.AGENT, userId, requestId: 'req_test' } as any, fn)

describe('upload helpers resolve client + userId by auth mode (agent trap)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    browserUploads.length = 0
    serviceUploads.length = 0
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('AGENT (no session, requestContext.userId set): uses the SERVICE client, not the browser one', async () => {
    // WHY (layer 4): the browser client signs with a Casdoor-derived JWT the agent lacks -> "Invalid
    // Compact JWS" 500. The service-role client is cookie-independent. This is THE 500 the live case hit.
    vi.mocked(getSession).mockResolvedValue(null as any)

    await asAgent(AGENT_USER, upload)

    expect(createServiceClient).toHaveBeenCalledTimes(1)
    expect(createClient).not.toHaveBeenCalled()
    expect(serviceUploads).toHaveLength(1)
    // WHY (layer 3): the storage path is prefixed with the AGENT's user id, not a session sub.
    expect(serviceUploads[0].path.startsWith(`${AGENT_USER}/`)).toBe(true)
  })

  it('AGENT: does NOT throw 401 (the layer-3 guard no longer denies a session-less agent)', async () => {
    vi.mocked(getSession).mockResolvedValue(null as any)
    await expect(asAgent(AGENT_USER, upload)).resolves.toBeDefined()
  })

  it('BROWSER (session present): uses the browser client and the session sub — behavior preserved', async () => {
    // WHY: the fix must not change the browser path. Session present -> browser client, path = sub.
    vi.mocked(getSession).mockResolvedValue({ sub: BROWSER_USER } as any)

    await upload()

    expect(createClient).toHaveBeenCalledTimes(1)
    expect(createServiceClient).not.toHaveBeenCalled()
    expect(browserUploads).toHaveLength(1)
    expect(browserUploads[0].path.startsWith(`${BROWSER_USER}/`)).toBe(true)
  })

  it('NO identity (no session, no agent context): still throws 401 — no anonymous upload happens', async () => {
    // WHY: the fallback is context-gated, not an unconditional bypass. With no session and no agent
    // userId, the userId guard throws UnauthorizedError before any upload. (resolveUploadContext does
    // build the service client first, then the guard rejects — a harmless no-op on this error path;
    // what matters is that NO file is ever written and the browser client is never selected.)
    vi.mocked(getSession).mockResolvedValue(null as any)

    await expect(asAgent(undefined, upload)).rejects.toBeInstanceOf(UnauthorizedError)
    expect(createClient).not.toHaveBeenCalled()
    expect(serviceUploads).toHaveLength(0)
    expect(browserUploads).toHaveLength(0)
  })
})
