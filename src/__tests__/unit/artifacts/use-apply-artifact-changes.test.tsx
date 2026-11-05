// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

import type { ArtifactDTO, ReplaceArtifactResult } from '@/core/types/artifact.type'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const artifactEn = require('../../../../public/lang/en/artifact.json')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const commonEn = require('../../../../public/lang/en/common.json')

function translate(key: string, params?: Record<string, unknown>) {
  const dict = key.startsWith('common:') ? commonEn : artifactEn
  const path = key.replace(/^(artifact|common):/, '')
  const value = path.split('.').reduce<unknown>((o, k) => (o as never)?.[k], dict)
  if (typeof value !== 'string') return path
  if (!params) return value
  return value.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k: string) => String(params[k] ?? ''))
}

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: translate }) }))

vi.mock('next/navigation', () => ({
  useParams: () => ({ org_id: 'org-123', artifact_id: 'artifact-1' }),
  useRouter: () => ({ push: vi.fn() }),
}))

const toastSuccess = vi.fn()
const toastError = vi.fn()
const toastInfo = vi.fn()
vi.mock('sonner', () => ({
  toast: {
    success: (...a: unknown[]) => toastSuccess(...a),
    error: (...a: unknown[]) => toastError(...a),
    info: (...a: unknown[]) => toastInfo(...a),
  },
}))

/** Mọi request đi qua đây; `calls` là bản ghi THỨ TỰ, thứ duy nhất chứng minh được chuỗi 3 bước. */
const calls: string[] = []
let slugExists = false
let replaceError: unknown = null
let accessError: unknown = null
let slugError: unknown = null

const get = vi.fn(async (url: string) => {
  calls.push(`GET ${url}`)
  if (url.endsWith('/quota')) {
    return {
      data: {
        data: {
          used_bytes: 10 * 1024 * 1024,
          quota_bytes: 30 * 1024 * 1024,
          live_count: 2,
          live_quota: 3,
        },
      },
    }
  }
  throw new Error(`unexpected GET ${url}`)
})

const post = vi.fn(async (url: string) => {
  calls.push(`POST ${url}`)
  if (url.endsWith('/slugs/check')) return { data: { data: { exists: slugExists } } }
  if (url.endsWith('/replace')) {
    if (replaceError) throw replaceError
    return { data: { data: { ...replaced } } }
  }
  if (url.endsWith('/slug')) {
    if (slugError) throw slugError
    return { data: { data: { ...base(), short_url: 'https://li2.ai/duong-dan-moi' } } }
  }
  throw new Error(`unexpected POST ${url}`)
})

const patch = vi.fn(async (url: string) => {
  calls.push(`PATCH ${url}`)
  if (accessError) throw accessError
  return { data: { data: { ...base(), access_mode: 'password' } } }
})

vi.mock('@/shared/lib/axios', () => ({
  axiosApiInstance: {
    get: (url: string) => get(url),
    post: (url: string) => post(url),
    patch: (url: string) => patch(url),
    delete: vi.fn(),
  },
}))

import { useApplyArtifactChanges } from '@/features/artifacts/components/artifact-detail/use-apply-artifact-changes'

const ORG = 'org-123'

const base = (over: Partial<ArtifactDTO> = {}): ArtifactDTO => ({
  id: 'artifact-1',
  organization_id: ORG,
  user_id: 'user-1',
  name: 'Landing page',
  kind: 'html',
  status: 'live',
  serve_token: 'abcdef0123456789',
  content_type: 'text/html',
  size_bytes: 2048,
  created_at: '2026-09-28T00:00:00.000Z',
  updated_at: '2026-09-28T00:00:00.000Z',
  touch_point_id: 'tp-1',
  access_mode: 'public',
  password_set_at: null,
  viewer_count: null,
  visits: 12,
  serve_url: 'https://art.li2.ai/a/abcdef0123456789',

  preview_url: 'https://art.li2.ai/a/abcdef0123456789',
  download_url: 'https://art.li2.ai/a/abcdef0123456789/download',
  short_url: 'https://li2.ai/duong-dan-cu',
  path_qr_code: null,
  ...over,
})

const replaced: ReplaceArtifactResult = { ...base(), size_bytes: 4096, previous_size_bytes: 2048 }

const htmlFile = (size = 4096, name = 'ban-moi.html') => {
  const file = new File(['<html></html>'], name, { type: 'text/html' })
  Object.defineProperty(file, 'size', { value: size })
  return file
}

const apiError = (status: number, key?: string, params?: Record<string, unknown>) => ({
  response: { status, data: key ? { i18nMessage: { key, params } } : {} },
})

let queryClient: QueryClient
// Spy trên instance thật: hợp đồng invalidation nằm ở các hook mutation, không ở hook gộp.
/* eslint-disable @typescript-eslint/no-explicit-any */
let setQueryData: any
let invalidateQueries: any
/* eslint-enable @typescript-eslint/no-explicit-any */

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
)

const mount = (artifact = base()) =>
  renderHook(() => useApplyArtifactChanges({ orgId: ORG, artifact }), { wrapper })

beforeEach(() => {
  calls.length = 0
  slugExists = false
  replaceError = null
  accessError = null
  slugError = null
  get.mockClear()
  post.mockClear()
  patch.mockClear()
  toastSuccess.mockClear()
  toastError.mockClear()
  toastInfo.mockClear()
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  setQueryData = vi.spyOn(queryClient, 'setQueryData')
  invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries')
})

afterEach(() => {
  queryClient.clear()
})

/** Chỉ các request ghi — `GET /quota` và `POST /slugs/check` là tiếng ồn với bài kiểm thứ tự. */
const mutatingCalls = () =>
  calls.filter((c) => !c.startsWith('GET ') && !c.includes('/slugs/check'))

describe('useApplyArtifactChanges', () => {
  it('0 thay đổi: không mutation nào được gọi, toast nhắc, cuộn tới #sec-replace', async () => {
    const target = document.createElement('div')
    target.id = 'sec-replace'
    const scrollIntoView = vi.fn()
    target.scrollIntoView = scrollIntoView
    document.body.appendChild(target)

    const { result } = mount()
    expect(result.current.count).toBe(0)

    await act(async () => {
      await result.current.apply()
    })

    expect(mutatingCalls()).toEqual([])
    expect(toastInfo).toHaveBeenCalledWith(artifactEn.detail.apply.nothing_pending)
    expect(scrollIntoView).toHaveBeenCalled()
    target.remove()
  })

  it('một thay đổi (chỉ quyền xem): chỉ PATCH được gọi', async () => {
    const { result } = mount()
    await act(async () => {
      result.current.access.setMode('private')
    })
    expect(result.current.count).toBe(1)

    await act(async () => {
      await result.current.apply()
    })

    expect(mutatingCalls()).toEqual([`PATCH /organizations/${ORG}/artifacts/artifact-1`])
  })

  it('ba thay đổi: gọi đúng thứ tự replace → PATCH → slug, count 3 và tooltip ghép ba phần', async () => {
    const { result } = mount()
    await act(async () => {
      result.current.replace.setFile(htmlFile())
      result.current.access.setMode('password')
      result.current.link.setSlug('duong-dan-moi')
    })
    await act(async () => {
      result.current.access.setPassword('matkhau123')
    })

    expect(result.current.count).toBe(3)
    expect(result.current.tooltip).toBe(
      translate('artifact:detail.apply.tooltip', {
        parts: [
          artifactEn.detail.apply.part_file,
          artifactEn.detail.apply.part_access,
          artifactEn.detail.apply.part_slug,
        ].join(' + '),
      })
    )

    await act(async () => {
      await result.current.apply()
    })

    expect(mutatingCalls()).toEqual([
      `POST /organizations/${ORG}/artifacts/artifact-1/replace`,
      `PATCH /organizations/${ORG}/artifacts/artifact-1`,
      `POST /organizations/${ORG}/artifacts/artifact-1/slug`,
    ])
    // Mật khẩu hiện một lần ngay trong khối, không qua hộp thoại nào nữa.
    expect(result.current.access.phase).toBe('done')
    expect(result.current.access.savedPassword).toBe('matkhau123')
    expect(toastSuccess).toHaveBeenCalledTimes(1)
  })

  it('lỗi bước 1 (replace 413): PATCH và slug KHÔNG được gọi, cả ba thay đổi còn nguyên', async () => {
    replaceError = apiError(413, 'artifact:errors.file_too_large', { size: '12 MB', max: '10 MB' })
    const { result } = mount()
    await act(async () => {
      result.current.replace.setFile(htmlFile())
      result.current.access.setMode('private')
      result.current.link.setSlug('duong-dan-moi')
    })
    expect(result.current.count).toBe(3)

    await act(async () => {
      await result.current.apply()
    })

    expect(mutatingCalls()).toEqual([`POST /organizations/${ORG}/artifacts/artifact-1/replace`])
    expect(result.current.count).toBe(3)
    expect(result.current.replace.phase).toBe('select')
    expect(result.current.replace.fileIssue).toContain('12 MB')
  })

  it('lỗi bước 2 (PATCH 409): slug không gọi, pending file đã xoá, quyền + slug còn, toast partial_access', async () => {
    accessError = apiError(409, 'artifact:access.conflict')
    const { result } = mount()
    await act(async () => {
      result.current.replace.setFile(htmlFile())
      result.current.access.setMode('private')
      result.current.link.setSlug('duong-dan-moi')
    })

    await act(async () => {
      await result.current.apply()
    })

    expect(mutatingCalls()).toEqual([
      `POST /organizations/${ORG}/artifacts/artifact-1/replace`,
      `PATCH /organizations/${ORG}/artifacts/artifact-1`,
    ])
    expect(result.current.pending.file).toBe(false)
    expect(result.current.pending.access).toBe(true)
    expect(result.current.pending.slug).toBe(true)
    expect(result.current.count).toBe(2)
    expect(toastError).toHaveBeenCalledWith(
      translate('artifact:detail.apply.partial_access', { reason: artifactEn.access.conflict })
    )
  })

  it('lỗi bước 3 (slug 400 đã có người dùng): toast partial_slug, lỗi inline dưới ô slug, count về 1', async () => {
    slugError = apiError(400, 'common:messages.error.slug_is_taken')
    const { result } = mount()
    await act(async () => {
      result.current.replace.setFile(htmlFile())
      result.current.access.setMode('private')
      result.current.link.setSlug('duong-dan-moi')
    })

    await act(async () => {
      await result.current.apply()
    })

    expect(mutatingCalls()).toEqual([
      `POST /organizations/${ORG}/artifacts/artifact-1/replace`,
      `PATCH /organizations/${ORG}/artifacts/artifact-1`,
      `POST /organizations/${ORG}/artifacts/artifact-1/slug`,
    ])
    const reason = translate('common:messages.error.slug_is_taken')
    expect(toastError).toHaveBeenCalledWith(
      translate('artifact:detail.apply.partial_slug', { reason })
    )
    expect(result.current.link.reason).toBe(reason)
    expect(result.current.count).toBe(1)
  })

  describe('chặn trước khi gọi API', () => {
    it('file quá cỡ → toast lỗi, 0 request ghi', async () => {
      const { result } = mount()
      await act(async () => {
        result.current.replace.setFile(htmlFile(12 * 1024 * 1024, 'qua-co.html'))
      })
      await act(async () => {
        await result.current.apply()
      })
      expect(mutatingCalls()).toEqual([])
      expect(toastError).toHaveBeenCalledTimes(1)
    })

    it('mật khẩu 7 ký tự → toast lỗi, 0 request ghi', async () => {
      const { result } = mount()
      await act(async () => {
        result.current.access.setMode('password')
      })
      await act(async () => {
        result.current.access.setPassword('1234567')
      })
      await act(async () => {
        await result.current.apply()
      })
      expect(mutatingCalls()).toEqual([])
      expect(toastError).toHaveBeenCalledWith(artifactEn.access.password_too_short)
    })

    it('slug 5 ký tự → toast lỗi, 0 request ghi', async () => {
      const { result } = mount()
      await act(async () => {
        result.current.link.setSlug('ngan5')
      })
      await act(async () => {
        await result.current.apply()
      })
      expect(mutatingCalls()).toEqual([])
      expect(toastError).toHaveBeenCalledTimes(1)
    })

    it('slug trùng theo /slugs/check → chặn, không gọi endpoint slug', async () => {
      slugExists = true
      const { result } = mount()
      await act(async () => {
        result.current.link.setSlug('duong-dan-moi')
      })
      // Debounce 500ms như `use-slug-check.tsx`; chờ thật để không giả lập mất hành vi đó.
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 650))
      })
      await waitFor(() =>
        expect(result.current.link.reason).toBe(
          translate('artifact:detail.link.taken', { slug: 'duong-dan-moi' })
        )
      )

      await act(async () => {
        await result.current.apply()
      })
      expect(mutatingCalls()).toEqual([])
    })
  })

  it('invalidation: quota chỉ bị gỡ khi có bước file', async () => {
    const quotaKey = JSON.stringify(['artifact-quota', ORG])
    const invalidatedKeys = () =>
      invalidateQueries.mock.calls.map((args: unknown[]) =>
        JSON.stringify((args[0] as { queryKey: unknown }).queryKey)
      )

    const onlyAccess = mount()
    await act(async () => {
      onlyAccess.result.current.access.setMode('private')
    })
    await act(async () => {
      await onlyAccess.result.current.apply()
    })
    expect(setQueryData).toHaveBeenCalled()
    expect(invalidatedKeys()).toContain(JSON.stringify(['organizations', ORG, 'artifacts']))
    expect(invalidatedKeys()).not.toContain(quotaKey)

    invalidateQueries.mockClear()
    const withFile = mount()
    await act(async () => {
      withFile.result.current.replace.setFile(htmlFile())
    })
    await act(async () => {
      await withFile.result.current.apply()
    })
    expect(invalidatedKeys()).toContain(quotaKey)
  })

  it('applying bật trong lúc chạy và bấm đúp không gọi lần hai', async () => {
    let release: (() => void) | null = null
    post.mockImplementationOnce(async (url: string) => {
      calls.push(`POST ${url}`)
      await new Promise<void>((resolve) => {
        release = resolve
      })
      return { data: { data: { ...replaced } } }
    })

    const { result } = mount()
    await act(async () => {
      result.current.replace.setFile(htmlFile())
    })

    let first: Promise<void> = Promise.resolve()
    await act(async () => {
      first = result.current.apply()
      await Promise.resolve()
    })
    expect(result.current.applying).toBe(true)

    await act(async () => {
      await result.current.apply()
    })
    expect(mutatingCalls()).toEqual([`POST /organizations/${ORG}/artifacts/artifact-1/replace`])

    await act(async () => {
      release?.()
      await first
    })
    expect(result.current.applying).toBe(false)
  })

  it('đổi sang artifact khác thì reset, nhưng rerender cùng id với access_mode mới thì KHÔNG', async () => {
    const { result, rerender } = renderHook(
      ({ artifact }: { artifact: ArtifactDTO }) =>
        useApplyArtifactChanges({ orgId: ORG, artifact }),
      { wrapper, initialProps: { artifact: base() } }
    )

    await act(async () => {
      result.current.access.setMode('password')
    })
    await act(async () => {
      result.current.access.setPassword('matkhau123')
    })
    await act(async () => {
      await result.current.apply()
    })
    expect(result.current.access.phase).toBe('done')

    // Cache chi tiết vừa được ghi lại với `access_mode: 'password'` — pha `done` phải sống qua đó.
    await act(async () => {
      rerender({ artifact: base({ access_mode: 'password', password_set_at: '2026-10-11' }) })
    })
    expect(result.current.access.phase).toBe('done')
    expect(result.current.access.savedPassword).toBe('matkhau123')

    // Sang artifact khác thì mọi thứ phải sạch.
    await act(async () => {
      rerender({ artifact: base({ id: 'artifact-2' }) })
    })
    expect(result.current.access.phase).toBe('edit')
    expect(result.current.access.savedPassword).toBeNull()
  })
})
