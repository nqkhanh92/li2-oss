import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const resolveTargetByToken = vi.fn()
vi.mock('@/core/services/artifact-serve.service', () => ({
  artifactServeService: { resolveTargetByToken: (...a: any[]) => resolveTargetByToken(...a) },
}))
const recordGoogleViewer = vi.fn()
vi.mock('@/core/services/artifact-gate.service', () => ({
  artifactGateService: { recordGoogleViewer: (...a: any[]) => recordGoogleViewer(...a) },
}))
const generateAuthUrl = vi.fn()
const verifiedEmail = vi.fn()
vi.mock('@/core/helpers/artifact-google-oauth', () => ({
  createArtifactGoogleClient: () => ({ client: true }),
  artifactGoogleAuthUrl: (_c: unknown, state: string) => generateAuthUrl(state),
  artifactGoogleVerifiedEmail: (_c: unknown, code: string) => verifiedEmail(code),
}))
vi.mock('@/infrastructure/logging/logger', () => ({
  logger: { child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }) },
}))

import { NextRequest } from 'next/server'
import { GET as startGET } from '@/app/(artifact)/a/[token]/google/route'
import { GET as callbackGET } from '@/app/(artifact)/a/google/callback/route'
import { signGoogleState, verifyGoogleState } from '@/core/helpers/artifact-viewer-session'

const TOKEN = 'abcdef0123456789'
const SECRET = 's'.repeat(64)

const target = (mode = 'google') => ({
  id: 'artifact-1',
  serveToken: TOKEN,
  kind: 'html',
  storagePath: 'org/a.html',
  contentType: 'text/html',
  name: 'Landing',
  sizeBytes: 1,
  access: {
    mode,
    passwordHash: null,
    accessVersion: 3,
    organizationId: 'org-1',
    touchPointId: 'tp-1',
  },
})

const start = (token = TOKEN) =>
  startGET(new NextRequest(`https://app.li2.ai/a/${token}/google`), { params: { token } })

const callback = (query: Record<string, string>, cookie?: string) => {
  const url = new URL('https://app.li2.ai/a/google/callback')
  for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v)
  return callbackGET(new NextRequest(url, { headers: cookie ? { cookie } : {} }))
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.ARTIFACT_VIEWER_SECRET = SECRET
  process.env.ARTIFACT_GOOGLE_CLIENT_ID = 'gid'
  process.env.ARTIFACT_GOOGLE_CLIENT_SECRET = 'gsecret'
  resolveTargetByToken.mockResolvedValue({ outcome: 'live', target: target() })
  generateAuthUrl.mockImplementation(
    (state: string) =>
      `https://accounts.google.com/o/oauth2/v2/auth?scope=openid%20email&prompt=select_account&state=${encodeURIComponent(state)}`
  )
  verifiedEmail.mockResolvedValue('khach@gmail.com')
  recordGoogleViewer.mockResolvedValue(undefined)
})
afterEach(() => {
  delete process.env.ARTIFACT_GOOGLE_CLIENT_ID
  delete process.env.ARTIFACT_GOOGLE_CLIENT_SECRET
})

/** [P2] R9 — A22. */
describe('GET /a/[token]/google', () => {
  it('⭐ A22: 302 tới accounts.google.com, scope openid email, prompt select_account, state ký; cookie nonce Path=/a/', async () => {
    const res = await start()
    expect(res.status).toBe(302)
    const location = new URL(res.headers.get('location')!)
    expect(location.host).toBe('accounts.google.com')
    expect(location.searchParams.get('scope')).toBe('openid email')
    expect(location.searchParams.get('prompt')).toBe('select_account')

    const state = await verifyGoogleState(location.searchParams.get('state'))
    expect(state?.token).toBe(TOKEN)

    const cookie = res.headers.get('set-cookie')!
    expect(cookie).toMatch(/^artifact_google_nonce=/)
    expect(cookie).toContain('Path=/a/')
    expect(cookie).toContain('Max-Age=600')
    expect(cookie).toContain('HttpOnly')
    expect(cookie.split(';')[0].split('=')[1]).toBe(state?.nonce)
  })

  it('token không hàng / removed → 404; mode không phải google → 404 (không 405)', async () => {
    resolveTargetByToken.mockResolvedValue({ outcome: 'not-found' })
    expect((await start()).status).toBe(404)
    resolveTargetByToken.mockResolvedValue({ outcome: 'removed' })
    expect((await start()).status).toBe(404)
    resolveTargetByToken.mockResolvedValue({ outcome: 'live', target: target('password') })
    expect((await start()).status).toBe(404)
    expect(generateAuthUrl).not.toHaveBeenCalled()
  })

  it('⭐ §9: env Google chưa đặt → 404 dù hàng ở chế độ google', async () => {
    delete process.env.ARTIFACT_GOOGLE_CLIENT_SECRET
    expect((await start()).status).toBe(404)
  })

  it('secret viewer thiếu → 503', async () => {
    delete process.env.ARTIFACT_VIEWER_SECRET
    expect((await start()).status).toBe(503)
  })
})

/** [P2] R9 — A23/A24. */
describe('GET /a/google/callback', () => {
  const validState = (nonce = 'n0nce') => signGoogleState(TOKEN, nonce)

  it('⭐ A23: error=access_denied + state hợp lệ → 303 /a/<token>?g=cancelled, xoá cookie nonce', async () => {
    const res = await callback({ error: 'access_denied', state: await validState() })
    expect(res.status).toBe(303)
    expect(res.headers.get('location')).toBe(`/a/${TOKEN}?g=cancelled`)
    expect(res.headers.get('set-cookie')).toMatch(/artifact_google_nonce=;.*Max-Age=0/)
    expect(verifiedEmail).not.toHaveBeenCalled()
  })

  it('lỗi khác của Google → ?g=failed', async () => {
    const res = await callback({ error: 'server_error', state: await validState() })
    expect(res.headers.get('location')).toBe(`/a/${TOKEN}?g=failed`)
  })

  it('⭐ A23: state giả / thiếu → 400 trần (không biết quay về đâu)', async () => {
    expect((await callback({ code: 'c', state: 'gia' })).status).toBe(400)
    expect((await callback({ code: 'c' })).status).toBe(400)
    expect((await callback({ error: 'access_denied' })).status).toBe(400)
  })

  it('⭐ nonce cookie lệch hoặc thiếu → ?g=failed, không đổi code', async () => {
    const state = await validState('n0nce')
    expect((await callback({ code: 'c', state })).headers.get('location')).toBe(
      `/a/${TOKEN}?g=failed`
    )
    expect(
      (await callback({ code: 'c', state }, 'artifact_google_nonce=khac')).headers.get('location')
    ).toBe(`/a/${TOKEN}?g=failed`)
    expect(verifiedEmail).not.toHaveBeenCalled()
  })

  it('thiếu code → ?g=failed', async () => {
    const res = await callback({ state: await validState() }, 'artifact_google_nonce=n0nce')
    expect(res.headers.get('location')).toBe(`/a/${TOKEN}?g=failed`)
  })

  it('artifact không còn ở chế độ google (đổi giữa chừng) → ?g=failed', async () => {
    resolveTargetByToken.mockResolvedValue({ outcome: 'live', target: target('public') })
    const res = await callback(
      { code: 'c', state: await validState() },
      'artifact_google_nonce=n0nce'
    )
    expect(res.headers.get('location')).toBe(`/a/${TOKEN}?g=failed`)
    expect(verifiedEmail).not.toHaveBeenCalled()
  })

  it('email chưa verified / không email / exchange ném → ?g=failed, không cookie viewer, không ghi', async () => {
    verifiedEmail.mockResolvedValueOnce(null)
    let res = await callback(
      { code: 'c', state: await validState() },
      'artifact_google_nonce=n0nce'
    )
    expect(res.headers.get('location')).toBe(`/a/${TOKEN}?g=failed`)
    expect(res.headers.get('set-cookie')).not.toContain('artifact_viewer=')

    verifiedEmail.mockRejectedValueOnce(new Error('network'))
    res = await callback({ code: 'c', state: await validState() }, 'artifact_google_nonce=n0nce')
    expect(res.headers.get('location')).toBe(`/a/${TOKEN}?g=failed`)
    expect(recordGoogleViewer).not.toHaveBeenCalled()
  })

  it('⭐ A24: OK → ghi viewer, Set-Cookie artifact_viewer m=google v=3 Path=/a/<token>, 303 /a/<token> không ?g', async () => {
    const res = await callback(
      { code: 'c0de', state: await validState() },
      'artifact_google_nonce=n0nce'
    )

    expect(verifiedEmail).toHaveBeenCalledWith('c0de')
    expect(recordGoogleViewer).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'artifact-1' }),
      'khach@gmail.com'
    )
    expect(res.status).toBe(303)
    expect(res.headers.get('location')).toBe(`/a/${TOKEN}`)

    const cookies = res.headers.getSetCookie()
    const viewer = cookies.find((c) => c.startsWith('artifact_viewer='))!
    expect(viewer).toContain(`Path=/a/${TOKEN}`)
    expect(viewer).toContain('Max-Age=604800')
    const payload = JSON.parse(
      Buffer.from(viewer.split(';')[0].split('=')[1].split('.')[1], 'base64url').toString()
    )
    expect(payload).toMatchObject({ purpose: 'artifact-viewer', tok: TOKEN, m: 'google', v: 3 })
    expect(cookies.some((c) => c.startsWith('artifact_google_nonce=;'))).toBe(true)
    // Không cookie Casdoor nào (A25).
    expect(cookies.some((c) => c.startsWith('casdoor_'))).toBe(false)
  })

  it('R9 bước 3: ghi viewer thất bại (service đã nuốt) → vẫn cookie + 303', async () => {
    recordGoogleViewer.mockResolvedValue(undefined)
    const res = await callback(
      { code: 'c', state: await validState() },
      'artifact_google_nonce=n0nce'
    )
    expect(res.status).toBe(303)
    expect(res.headers.getSetCookie().some((c) => c.startsWith('artifact_viewer='))).toBe(true)
  })

  it('⭐ §9: env Google chưa đặt → 404', async () => {
    delete process.env.ARTIFACT_GOOGLE_CLIENT_ID
    expect((await callback({ code: 'c', state: await validState() })).status).toBe(404)
  })
})
