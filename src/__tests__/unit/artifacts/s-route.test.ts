import { describe, it, expect, beforeEach, vi } from 'vitest'

const resolveTargetByPublicPath = vi.fn()
const getLiveContentByToken = vi.fn()
vi.mock('@/core/services/artifact-serve.service', () => ({
  artifactServeService: {
    resolveTargetByPublicPath: (...args: any[]) => resolveTargetByPublicPath(...args),
    resolveTargetByToken: vi.fn(),
    getLiveContentByToken: (...args: any[]) => getLiveContentByToken(...args),
    getBytes: vi.fn(),
    createOfficeViewerUrl: vi.fn(),
  },
}))
const evaluateGate = vi.fn()
vi.mock('@/core/services/artifact-gate.service', () => ({
  artifactGateService: { evaluateGate: (...args: any[]) => evaluateGate(...args) },
  ArtifactGateUnavailableError: class extends Error {},
}))

import { NextRequest } from 'next/server'
import { GET } from '@/app/(artifact)/a/s/[org_slug]/[slug]/route'

const TOKEN = 'abcdef0123456789'
const target = {
  id: 'artifact-1',
  serveToken: TOKEN,
  kind: 'html',
  storagePath: 'org/a.html',
  contentType: 'text/html; charset=utf-8',
  name: 'Bao gia',
  sizeBytes: 10,
  publicPath: '/khanhqns-organization/bao-gia',
  access: {
    mode: 'password',
    passwordHash: 'x',
    accessVersion: 1,
    organizationId: 'org-1',
    touchPointId: 'tp-1',
  },
}
const get = (
  host: string,
  org = 'khanhqns-organization',
  slug = 'bao-gia',
  headers: Record<string, string> = {}
) =>
  GET(new NextRequest(`https://${host}/${org}/${slug}`, { headers: { host, ...headers } }), {
    params: { org_slug: org, slug },
  })

describe('GET /<org_slug>/<slug> trên host artifact (rewrite → /a/s/…)', () => {
  beforeEach(() => {
    process.env.ARTIFACT_LINK_URL = 'https://artifact.li2.link'
    resolveTargetByPublicPath.mockReset()
    evaluateGate.mockReset()
    getLiveContentByToken.mockResolvedValue({
      body: '<html>ok</html>',
      contentType: 'text/html; charset=utf-8',
    })
  })

  it('live + public → 200 nội dung; tra bằng (org_slug, slug), không phải token', async () => {
    resolveTargetByPublicPath.mockResolvedValue({
      outcome: 'live',
      target: { ...target, access: { ...target.access, mode: 'public' } },
    })
    evaluateGate.mockResolvedValue({ kind: 'allow' })
    const res = await get('artifact.li2.link')
    expect(res.status).toBe(200)
    expect(resolveTargetByPublicPath).toHaveBeenCalledWith('khanhqns-organization', 'bao-gia')
    expect(await res.text()).toContain('ok')
  })

  it('cổng mật khẩu tại địa chỉ công khai: form POST về /a/<token>, hidden return_to=/<org>/<slug>', async () => {
    resolveTargetByPublicPath.mockResolvedValue({ outcome: 'live', target })
    evaluateGate.mockResolvedValue({ kind: 'password-required', hint: 'none' })
    const res = await get('artifact.li2.link')
    const html = await res.text()
    expect(res.status).toBe(401)
    expect(html).toContain(`action="/a/${TOKEN}"`)
    expect(html).toContain('name="return_to" value="/khanhqns-organization/bao-gia"')
  })

  it('removed → 410 bia mộ; not-found → 404', async () => {
    resolveTargetByPublicPath.mockResolvedValue({ outcome: 'removed' })
    expect((await get('artifact.li2.link')).status).toBe(410)
    resolveTargetByPublicPath.mockResolvedValue({ outcome: 'not-found' })
    expect((await get('artifact.li2.link')).status).toBe(404)
  })

  it('gọi trên app host (không phải host artifact) → 404, không tra DB', async () => {
    const res = await get('app.li2.ai')
    expect(res.status).toBe(404)
    expect(resolveTargetByPublicPath).not.toHaveBeenCalled()
  })

  it('X-Forwarded-Host thắng Host (sau proxy)', async () => {
    resolveTargetByPublicPath.mockResolvedValue({
      outcome: 'live',
      target: { ...target, access: { ...target.access, mode: 'public' } },
    })
    evaluateGate.mockResolvedValue({ kind: 'allow' })
    const res = await get('10.0.0.5:3000', 'khanhqns-organization', 'bao-gia', {
      'x-forwarded-host': 'artifact.li2.link',
    })
    expect(res.status).toBe(200)
  })

  it('đoạn đường dẫn không hợp lệ (có dấu chấm, quá dài) → 404, không tra DB', async () => {
    expect((await get('artifact.li2.link', 'khanhqns.organization', 'bao-gia')).status).toBe(404)
    expect(resolveTargetByPublicPath).not.toHaveBeenCalled()
  })
})
