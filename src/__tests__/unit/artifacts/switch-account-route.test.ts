import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const logout = vi.fn()
vi.mock('@/app/actions/auth', () => ({ logout: (...args: any[]) => logout(...args) }))

import { NextRequest } from 'next/server'
import { POST } from '@/app/(artifact)/a/[token]/switch-account/route'

const TOKEN = 'abcdef0123456789'
const ACCESS = 'eyJhbGciOiJSUzI1NiJ9.casdoor-access-token.sig'
const call = (token: string, opts: { cookie?: string | null } = {}) =>
  POST(
    new NextRequest(`https://app.li2.ai/a/${token}/switch-account`, {
      method: 'POST',
      headers:
        opts.cookie === null ? {} : { cookie: `casdoor_access_token=${opts.cookie ?? ACCESS}` },
    }),
    { params: { token } }
  )

beforeEach(() => {
  vi.clearAllMocks()
  process.env.NEXT_PUBLIC_APP_BASE_URL = 'https://app.li2.ai'
  // vitest.setup: NEXT_PUBLIC_CASDOOR_APP_URL = http://localhost:8000, CLIENT_ID = mock-client-id
})
afterEach(() => {
  delete process.env.NEXT_PUBLIC_APP_BASE_URL
})

/** R7 — nút "Đăng nhập bằng tài khoản khác": xoá cookie app RỒI đăng xuất Casdoor thật. */
describe('POST /a/[token]/switch-account', () => {
  it('⭐ A14: 303 tới <CASDOOR>/api/logout với post_logout_redirect_uri lồng redirect_to, client_id', async () => {
    const res = await call(TOKEN)
    expect(res.status).toBe(303)

    const location = new URL(res.headers.get('location')!)
    expect(location.origin).toBe('http://localhost:8000')
    expect(location.pathname).toBe('/api/logout')
    expect(location.searchParams.get('client_id')).toBe('mock-client-id')
    // Casdoor của LiHi (build 2026-07-29) từ chối logout có post_logout_redirect_uri mà thiếu hint;
    // hint đúng là access token của app, đọc TRƯỚC khi logout() xoá cookie.
    expect(location.searchParams.get('id_token_hint')).toBe(ACCESS)

    // Hai lớp giải mã: Casdoor bóc lớp 1, /auth/login bóc lớp 2.
    const back = new URL(location.searchParams.get('post_logout_redirect_uri')!)
    expect(back.origin + back.pathname).toBe('https://app.li2.ai/auth/login')
    expect(back.searchParams.get('redirect_to')).toBe(`/a/${TOKEN}`)
  })

  it('không có cookie Casdoor → bỏ qua Casdoor, 303 thẳng về /auth/login?redirect_to', async () => {
    const res = await call(TOKEN, { cookie: null })
    expect(res.status).toBe(303)
    const location = new URL(res.headers.get('location')!)
    expect(location.origin + location.pathname).toBe('https://app.li2.ai/auth/login')
    expect(location.searchParams.get('redirect_to')).toBe(`/a/${TOKEN}`)
    expect(location.searchParams.get('id_token_hint')).toBeNull()
    expect(logout).toHaveBeenCalledWith({ redirect_to: null })
  })

  it('⭐ xoá cookie app TRƯỚC khi redirect, không để logout() tự redirect', async () => {
    await call(TOKEN)
    expect(logout).toHaveBeenCalledWith({ redirect_to: null })
  })

  it('token sai dạng → 404, không logout', async () => {
    for (const bad of ['nope', '../x', 'ABCDEF0123456789Z']) {
      expect((await call(bad)).status).toBe(404)
    }
    expect(logout).not.toHaveBeenCalled()
  })

  it('thiếu env app/casdoor → 503, không redirect mù', async () => {
    delete process.env.NEXT_PUBLIC_APP_BASE_URL
    const res = await call(TOKEN)
    expect(res.status).toBe(503)
    expect(res.headers.get('location')).toBeNull()
  })

  it('không set-cookie nào của ta, header no-store', async () => {
    const res = await call(TOKEN)
    expect(res.headers.get('set-cookie')).toBeNull()
    expect(res.headers.get('cache-control')).toBe('no-store')
  })
})
