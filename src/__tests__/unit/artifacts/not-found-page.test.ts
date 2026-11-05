import { describe, it, expect, beforeEach, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const resolveTargetByToken = vi.fn()
const resolveTargetByPublicPath = vi.fn()
vi.mock('@/core/services/artifact-serve.service', () => ({
  artifactServeService: {
    resolveTargetByToken: (...args: any[]) => resolveTargetByToken(...args),
    resolveTargetByPublicPath: (...args: any[]) => resolveTargetByPublicPath(...args),
    getLiveContentByToken: vi.fn(),
    getBytes: vi.fn(),
    createOfficeViewerUrl: vi.fn(),
  },
}))
vi.mock('@/core/services/artifact-gate.service', () => ({
  artifactGateService: { evaluateGate: vi.fn() },
  ArtifactGateUnavailableError: class extends Error {},
}))
vi.mock('@/shared/lib/casdoor/middleware', () => ({ casdoor_middleware: vi.fn() }))

import { NextRequest } from 'next/server'
import { ARTIFACT_LANDING_COPY } from '@/core/helpers/artifact-landing'
import { notFoundPage } from '@/core/helpers/artifact-gate-pages'
import { GET as serveByToken } from '@/app/(artifact)/a/[token]/route'
import { GET as serveByPublicPath } from '@/app/(artifact)/a/s/[org_slug]/[slug]/route'
import { GET as notFoundRoute, POST as notFoundRoutePost } from '@/app/(artifact)/a/not-found/route'
import { middleware } from '@/middleware'

const HOST = 'artifact.li2.link'

/**
 * Mở một đường không tồn tại trên host artifact trả về text thuần `Not found` ở BA chỗ khác nhau, giữa
 * một sản phẩm đã có bia mộ 410 và sáu trang cổng cùng theme. Test này ghim cả hai nửa của việc sửa:
 * trang có theme, và BA đường cùng trả đúng một trang.
 */
describe('trang 404 của host artifact: theme + giọng của bia mộ', () => {
  const vi_copy = ARTIFACT_LANDING_COPY.vi

  it('dựng trên landingShell layout gate, có mascot nội tuyến và dấu thương hiệu như bia mộ', () => {
    const html = notFoundPage(vi_copy, 'vi')

    expect(html).toContain('<main class="shell gate">')
    expect(html).toContain('<svg class="mascot"')
    expect(html).toContain('<div class="gone-brand">')
    expect(html).not.toContain('<img')
  })

  it('theme sáng của li2-be, không dark mode, không script', () => {
    const html = notFoundPage(vi_copy, 'vi')

    expect(html).toContain('background-color: rgb(249, 251, 253)')
    expect(html).toContain('radial-gradient(#d0d5d5 2px, transparent 0)')
    expect(html).not.toContain('prefers-color-scheme')
    expect(html).not.toContain('<script')
  })

  it('tiêu đề nằm ở CẢ <title> và <h1>, kèm câu giải thích trung tính và footer Li2', () => {
    const html = notFoundPage(vi_copy, 'vi')

    expect(html).toContain(`<title>${vi_copy.not_found_title}</title>`)
    expect(html).toContain(`<h1>${vi_copy.not_found_title}</h1>`)
    expect(html).toContain(vi_copy.not_found_body)
    expect(html).toContain(`${vi_copy.removed_footer} <a href="https://li2.ai">Li2</a>`)
  })

  /**
   * ⭐ Host artifact là mặt công khai: người xem thường không có tài khoản li2, nên một nút quay về app
   * chỉ dẫn họ tới trang đăng nhập. Và trang 404 không có gì để POST đi đâu.
   */
  it('⭐ không nút quay về app, không link đăng nhập, không form', () => {
    const html = notFoundPage(vi_copy, 'vi')

    expect(html).not.toContain('/auth/login')
    expect(html).not.toContain('<form')
    // `gate-btn` vẫn có trong khối <style> dùng chung — cái phải vắng là một phần tử mang class đó.
    expect(html).not.toContain('class="gate-btn"')
    expect(html).not.toContain('<button')
    expect(html.match(/<a /g)).toHaveLength(1) // chỉ chữ "Li2" ở footer
  })

  it('i18n đi qua cùng cơ chế copy: en đổi cả chữ và <html lang>', () => {
    const en = notFoundPage(ARTIFACT_LANDING_COPY.en, 'en')

    expect(en).toContain('<html lang="en">')
    expect(en).toContain('<title>Page not found</title>')
    expect(en).toContain(ARTIFACT_LANDING_COPY.en.not_found_body)
    expect(en).not.toContain(vi_copy.not_found_title)
  })
})

describe('404 áp vào cả ba đường từng trả text thuần', () => {
  beforeEach(() => {
    process.env.ARTIFACT_LINK_URL = `https://${HOST}`
    resolveTargetByToken.mockReset()
    resolveTargetByPublicPath.mockReset()
    resolveTargetByToken.mockResolvedValue({ outcome: 'not-found' })
    resolveTargetByPublicPath.mockResolvedValue({ outcome: 'not-found' })
  })

  const expectThemedNotFound = async (res: Response) => {
    expect(res.status).toBe(404)
    expect(res.headers.get('content-type')).toBe('text/html; charset=utf-8')
    expect(res.headers.get('cache-control')).toBe('no-store')
    expect(res.headers.get('x-robots-tag')).toBe('noindex, nofollow')
    expect(res.headers.get('content-security-policy')).toContain("default-src 'none'")
    expect(res.headers.get('content-security-policy')).toContain("form-action 'none'")
    const html = await res.text()
    expect(html).toContain('<svg class="mascot"')
    expect(html).toContain(`<title>${ARTIFACT_LANDING_COPY.vi.not_found_title}</title>`)
    expect(html).not.toBe('Not found')
    return html
  }

  it('/a/<token> với token không có thật → 404 HTML có mascot', async () => {
    const res = await serveByToken(new NextRequest('https://app.li2.ai/a/0000000000000000'), {
      params: { token: '0000000000000000' },
    })

    await expectThemedNotFound(res)
  })

  it('/a/s/<org>/<slug> → 404 HTML có mascot', async () => {
    const res = await serveByPublicPath(
      new NextRequest(`https://${HOST}/khong-co/gi`, { headers: { host: HOST } }),
      { params: { org_slug: 'khong-co', slug: 'gi' } }
    )

    await expectThemedNotFound(res)
  })

  it('route /a/not-found (đích rewrite của middleware) → 404 HTML có mascot, mọi method', async () => {
    await expectThemedNotFound(await notFoundRoute(new NextRequest(`https://${HOST}/a/not-found`)))
    const posted = await notFoundRoutePost(
      new NextRequest(`https://${HOST}/a/not-found`, { method: 'POST' })
    )
    expect(posted.status).toBe(404)
  })

  it('404 theo Accept-Language: en ra trang tiếng Anh', async () => {
    const res = await serveByToken(
      new NextRequest('https://app.li2.ai/a/0000000000000000', {
        headers: { 'accept-language': 'en-GB,en;q=0.9' },
      }),
      { params: { token: '0000000000000000' } }
    )

    expect(await res.text()).toContain('<title>Page not found</title>')
  })

  /**
   * ⭐ GHIM CHỐNG RÒ THÔNG TIN. Nếu "org không tồn tại" và "slug không tồn tại" khác nhau dù một byte,
   * người ngoài gõ thử `/<org>/<slug>` hàng loạt và đọc ra org nào có thật, slug nào đã được đặt. Cùng
   * lý lẽ cho một artifact tồn tại nhưng chưa `live`: nó phải không phân biệt được với một slug bịa ra.
   */
  it('⭐ 404 của org sai, slug sai, artifact chưa publish và /a/<token> sai giống nhau TỪNG BYTE', async () => {
    const req = (org: string, slug: string) =>
      new NextRequest(`https://${HOST}/${org}/${slug}`, { headers: { host: HOST } })

    resolveTargetByPublicPath.mockResolvedValue({ outcome: 'not-found' })
    const orgSai = await (
      await serveByPublicPath(req('org-bia-ra', 'bao-gia'), {
        params: { org_slug: 'org-bia-ra', slug: 'bao-gia' },
      })
    ).text()
    const slugSai = await (
      await serveByPublicPath(req('khanhqns-organization', 'slug-bia-ra'), {
        params: { org_slug: 'khanhqns-organization', slug: 'slug-bia-ra' },
      })
    ).text()
    const chuaPublish = await (
      await serveByPublicPath(req('khanhqns-organization', 'ban-nhap'), {
        params: { org_slug: 'khanhqns-organization', slug: 'ban-nhap' },
      })
    ).text()
    const tokenSai = await (
      await serveByToken(new NextRequest('https://app.li2.ai/a/0000000000000000'), {
        params: { token: '0000000000000000' },
      })
    ).text()
    const duongLa = await (
      await notFoundRoute(new NextRequest(`https://${HOST}/a/not-found`))
    ).text()

    expect(slugSai).toBe(orgSai)
    expect(chuaPublish).toBe(orgSai)
    expect(tokenSai).toBe(orgSai)
    expect(duongLa).toBe(orgSai)
  })

  it('404 không chứa tên artifact, token, org slug hay slug nào', async () => {
    const html = await (
      await serveByPublicPath(
        new NextRequest(`https://${HOST}/khanhqns-organization/bao-gia-thang-10`, {
          headers: { host: HOST },
        }),
        { params: { org_slug: 'khanhqns-organization', slug: 'bao-gia-thang-10' } }
      )
    ).text()

    expect(html).not.toContain('khanhqns-organization')
    expect(html).not.toContain('bao-gia-thang-10')
  })
})

describe('middleware trên host artifact: rewrite, không tự render (edge runtime)', () => {
  beforeEach(() => {
    process.env.ARTIFACT_LINK_URL = `https://${HOST}`
  })

  it('đường lạ trên host artifact → rewrite sang /a/not-found, bỏ query', async () => {
    const res = await middleware(
      new NextRequest(`https://${HOST}/mot-doan-thoi?x=1`, { headers: { host: HOST } })
    )

    expect(res?.headers.get('x-middleware-rewrite')).toBe(`https://${HOST}/a/not-found`)
  })

  it('đường đúng hình dạng vẫn rewrite sang /a/s/<org>/<slug> như cũ', async () => {
    const res = await middleware(
      new NextRequest(`https://${HOST}/khanhqns-organization/bao-gia`, { headers: { host: HOST } })
    )

    expect(res?.headers.get('x-middleware-rewrite')).toBe(
      `https://${HOST}/a/s/khanhqns-organization/bao-gia`
    )
  })

  /**
   * ⭐ `middleware.ts` chạy trên EDGE runtime, còn `notFoundPage` → `landingShell` → copy đều nằm sau
   * `import 'server-only'` và kéo theo `@/core/types/artifact.type`. Unit test chạy trên Node nên nó
   * sẽ xanh kể cả khi bundle edge vỡ lúc build — vì vậy ghim ở mức IMPORT: middleware không được nạp
   * một dòng nào của chuỗi render. Đó là lý do chọn rewrite thay vì tự render tại middleware.
   */
  it('⭐ middleware không import chuỗi render (server-only) nào — bundle edge giữ nguyên', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/middleware.ts'), 'utf8')

    for (const forbidden of [
      'artifact-not-found',
      'artifact-gate-pages',
      'artifact-landing-shell',
      'artifact-landing',
      'core/types/artifact.type',
    ]) {
      expect(source.includes(`from '@/core/helpers/${forbidden}'`), forbidden).toBe(false)
      expect(source.includes(`from '@/${forbidden}'`), forbidden).toBe(false)
    }
    expect(source).not.toContain("'Not found'")
  })
})
