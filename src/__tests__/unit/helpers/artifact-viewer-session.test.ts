import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { SignJWT } from 'jose'

import {
  ARTIFACT_GOOGLE_NONCE_COOKIE,
  ARTIFACT_VIEWER_COOKIE,
  googleNonceCookieOptions,
  signGoogleState,
  signViewerSession,
  verifyGoogleState,
  verifyViewerSession,
  viewerCookieOptions,
  viewerSecret,
} from '@/core/helpers/artifact-viewer-session'
import { ARTIFACT_VIEWER_SESSION_SECONDS } from '@/core/types/artifact.type'

const SECRET = 'a'.repeat(64)
const TOKEN = 'abcdef0123456789'
const expected = { token: TOKEN, mode: 'password' as const, accessVersion: 2 }

beforeEach(() => {
  process.env.ARTIFACT_VIEWER_SECRET = SECRET
})
afterEach(() => {
  delete process.env.ARTIFACT_VIEWER_SECRET
})

/** R5 — cookie phiên người xem. Bất kỳ lệch nào = không có phiên. */
describe('signViewerSession / verifyViewerSession', () => {
  it('ký rồi verify với cùng token/mode/version → ok', async () => {
    const value = await signViewerSession(expected)
    expect(await verifyViewerSession(value, expected)).toEqual({ ok: true })
  })

  it('không cookie → absent', async () => {
    expect(await verifyViewerSession(undefined, expected)).toEqual({ ok: false, reason: 'absent' })
    expect(await verifyViewerSession('', expected)).toEqual({ ok: false, reason: 'absent' })
  })

  it('⭐ token khác → không phiên (cookie Path là của trình duyệt, không phải của ta)', async () => {
    const value = await signViewerSession(expected)
    expect(await verifyViewerSession(value, { ...expected, token: 'fedcba9876543210' })).toEqual({
      ok: false,
      reason: 'token',
    })
  })

  it('⭐ mode khác → reason mode (im lặng, không hint "đã đổi mật khẩu")', async () => {
    const value = await signViewerSession(expected)
    expect(await verifyViewerSession(value, { ...expected, mode: 'private' })).toEqual({
      ok: false,
      reason: 'mode',
    })
  })

  it('⭐ access_version khác → reason version (đổi mật khẩu/đổi chế độ đều giết phiên)', async () => {
    const value = await signViewerSession(expected)
    expect(await verifyViewerSession(value, { ...expected, accessVersion: 3 })).toEqual({
      ok: false,
      reason: 'version',
    })
  })

  it('chữ ký sai → invalid, không đọc claim nào để chọn hint', async () => {
    process.env.ARTIFACT_VIEWER_SECRET = 'b'.repeat(64)
    const forged = await signViewerSession({ ...expected, accessVersion: 99 })
    process.env.ARTIFACT_VIEWER_SECRET = SECRET
    expect(await verifyViewerSession(forged, expected)).toEqual({ ok: false, reason: 'invalid' })
  })

  it('hết hạn → invalid', async () => {
    const past = Math.floor(Date.now() / 1000) - 10
    const value = await new SignJWT({ purpose: 'artifact-viewer', tok: TOKEN, m: 'password', v: 2 })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt(past - 100)
      .setExpirationTime(past)
      .sign(new TextEncoder().encode(SECRET))
    expect(await verifyViewerSession(value, expected)).toEqual({ ok: false, reason: 'invalid' })
  })

  it('JWT HS256 khác mục đích (toolbar) ký cùng secret → invalid', async () => {
    const value = await new SignJWT({ purpose: 'toolbar', tok: TOKEN, m: 'password', v: 2 })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(new TextEncoder().encode(SECRET))
    expect(await verifyViewerSession(value, expected)).toEqual({ ok: false, reason: 'invalid' })
  })

  it('alg none / RS256 bị từ chối — chỉ HS256', async () => {
    const [h, p] = (await signViewerSession(expected)).split('.')
    const noneHeader = Buffer.from(JSON.stringify({ alg: 'none' })).toString('base64url')
    expect(await verifyViewerSession(`${noneHeader}.${p}.`, expected)).toEqual({
      ok: false,
      reason: 'invalid',
    })
    void h
  })

  it('exp = iat + 7 ngày', async () => {
    const value = await signViewerSession(expected)
    const payload = JSON.parse(Buffer.from(value.split('.')[1], 'base64url').toString())
    expect(payload.exp - payload.iat).toBe(ARTIFACT_VIEWER_SESSION_SECONDS)
    expect(payload.purpose).toBe('artifact-viewer')
    expect(payload).toMatchObject({ tok: TOKEN, m: 'password', v: 2 })
  })
})

describe('viewerSecret — thiếu secret là 503, không phải secret rỗng', () => {
  it('null khi env trống hoặc dưới 32 ký tự', () => {
    delete process.env.ARTIFACT_VIEWER_SECRET
    expect(viewerSecret()).toBeNull()
    process.env.ARTIFACT_VIEWER_SECRET = 'short'
    expect(viewerSecret()).toBeNull()
  })

  it('sign ném lỗi khi thiếu secret; verify trả invalid, không throw', async () => {
    delete process.env.ARTIFACT_VIEWER_SECRET
    await expect(signViewerSession(expected)).rejects.toThrow(/ARTIFACT_VIEWER_SECRET/)
    expect(await verifyViewerSession('x.y.z', expected)).toEqual({ ok: false, reason: 'invalid' })
  })
})

describe('viewerCookieOptions', () => {
  it('Path=/a/<token>, HttpOnly, Secure, Lax, Max-Age 604800, không Domain', () => {
    const opts = viewerCookieOptions(TOKEN)
    expect(opts).toEqual({
      name: ARTIFACT_VIEWER_COOKIE,
      path: `/a/${TOKEN}`,
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 604800,
    })
    expect(ARTIFACT_VIEWER_COOKIE).toBe('artifact_viewer')
    expect('domain' in opts).toBe(false)
  })
})

/** [P2] R9 — state Google: cùng secret, purpose riêng, 10 phút, mang token + nonce. */
describe('signGoogleState / verifyGoogleState', () => {
  it('round-trip trả token + nonce', async () => {
    const state = await signGoogleState(TOKEN, 'n0nce')
    expect(await verifyGoogleState(state)).toEqual({ token: TOKEN, nonce: 'n0nce' })
  })

  it('⭐ cookie viewer không được nhận làm state, và ngược lại', async () => {
    const viewer = await signViewerSession(expected)
    expect(await verifyGoogleState(viewer)).toBeNull()
    const state = await signGoogleState(TOKEN, 'n')
    expect(await verifyViewerSession(state, expected)).toEqual({ ok: false, reason: 'invalid' })
  })

  it('null cho state thiếu, rác, sai chữ ký, hết hạn', async () => {
    expect(await verifyGoogleState(null)).toBeNull()
    expect(await verifyGoogleState('')).toBeNull()
    expect(await verifyGoogleState('a.b.c')).toBeNull()
    process.env.ARTIFACT_VIEWER_SECRET = 'b'.repeat(64)
    const forged = await signGoogleState(TOKEN, 'n')
    process.env.ARTIFACT_VIEWER_SECRET = SECRET
    expect(await verifyGoogleState(forged)).toBeNull()
    const past = Math.floor(Date.now() / 1000) - 10
    const expired = await new SignJWT({ purpose: 'artifact-google-state', tok: TOKEN, nonce: 'n' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt(past - 700)
      .setExpirationTime(past)
      .sign(new TextEncoder().encode(SECRET))
    expect(await verifyGoogleState(expired)).toBeNull()
  })

  it('exp = iat + 600', async () => {
    const payload = JSON.parse(Buffer.from((await signGoogleState(TOKEN, 'n')).split('.')[1], 'base64url').toString())
    expect(payload.exp - payload.iat).toBe(600)
  })

  it('cookie nonce: Path=/a/, HttpOnly, Secure, Lax, Max-Age 600', () => {
    expect(googleNonceCookieOptions()).toEqual({
      name: ARTIFACT_GOOGLE_NONCE_COOKIE,
      path: '/a/',
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 600,
    })
    expect(ARTIFACT_GOOGLE_NONCE_COOKIE).toBe('artifact_google_nonce')
  })
})
