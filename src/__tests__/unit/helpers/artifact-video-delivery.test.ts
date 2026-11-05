import { beforeEach, describe, expect, it, vi } from 'vitest'

const resolveTargetByToken = vi.fn()
const resolveVideoDelivery = vi.fn()

vi.mock('@/core/services/artifact-serve.service', () => ({
  artifactServeService: {
    resolveTargetByToken: (...args: any[]) => resolveTargetByToken(...args),
    getLiveContentByToken: vi.fn(),
    getBytes: vi.fn(),
    createOfficeViewerUrl: vi.fn(),
  },
}))

vi.mock('@/core/helpers/artifact-video-delivery', () => ({
  resolveVideoDelivery: (...args: any[]) => resolveVideoDelivery(...args),
}))

import { NextRequest } from 'next/server'
import { GET } from '@/app/(artifact)/a/[token]/route'

const TOKEN = 'abcdef0123456789'

const videoTarget = {
  id: 'artifact-1',
  serveToken: TOKEN,
  kind: 'video',
  storagePath: 'org/a.mp4',
  contentType: 'video/mp4',
  name: 'Clip',
  sizeBytes: 4096,
  access: { mode: 'public', passwordHash: null, accessVersion: 1, organizationId: 'org-1' },
}

const call = () =>
  GET(new NextRequest(`https://app.li2.ai/a/${TOKEN}`), { params: { token: TOKEN } })

beforeEach(() => {
  vi.clearAllMocks()
  resolveTargetByToken.mockResolvedValue({ outcome: 'live', target: videoTarget })
})

/**
 * The point of `resolveVideoDelivery` is that the strategy lives in ONE function. These two
 * assertions are what make that true rather than aspirational: if the route ever hardcodes
 * `/a/<token>/file` again, the second one goes red.
 */
describe('trang landing video lấy nguồn TỪ resolveVideoDelivery', () => {
  it('mode proxy → src là /a/<token>/file', async () => {
    resolveVideoDelivery.mockResolvedValue({ mode: 'proxy' })

    const html = await (await call()).text()

    expect(resolveVideoDelivery).toHaveBeenCalledWith(expect.objectContaining({ id: 'artifact-1' }))
    expect(html).toContain(`src="/a/${TOKEN}/file"`)
  })

  it('mode signed-url → src là URL đã ký, route không tự quyết', async () => {
    resolveVideoDelivery.mockResolvedValue({
      mode: 'signed-url',
      url: 'https://supa.example.test/object/sign/a.mp4?token=t',
    })

    const html = await (await call()).text()

    expect(html).toContain('src="https://supa.example.test/object/sign/a.mp4?token=t"')
    expect(html).not.toContain(`/a/${TOKEN}/file`)
  })
})

describe('resolveVideoDelivery — hàm thật', () => {
  it('mặc định là proxy: đó là nhánh đã chốt bằng số đo trên LiHi', async () => {
    const actual = await vi.importActual<typeof import('@/core/helpers/artifact-video-delivery')>(
      '@/core/helpers/artifact-video-delivery'
    )

    expect(await actual.resolveVideoDelivery(videoTarget as any)).toEqual({ mode: 'proxy' })
  })
})
