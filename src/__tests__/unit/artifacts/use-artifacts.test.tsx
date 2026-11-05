// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

import type { ArtifactDTO } from '@/core/types/artifact.type'

const get = vi.fn()
const post = vi.fn()
const patch = vi.fn()
const del = vi.fn()
vi.mock('@/shared/lib/axios', () => ({
  axiosApiInstance: {
    get: (...args: unknown[]) => get(...args),
    post: (...args: unknown[]) => post(...args),
    patch: (...args: unknown[]) => patch(...args),
    delete: (...args: unknown[]) => del(...args),
  },
}))

import {
  artifactKeys,
  useArtifactQuota,
  useCreateArtifact,
  useDeleteArtifact,
  useGetArtifacts,
  usePublishArtifact,
  useReplaceArtifact,
  useShowArtifact,
  useUpdateArtifactAccess,
  useArtifactAccessModes,
  useChangeArtifactSlug,
} from '@/features/artifacts/hooks/use-artifacts'

const ORG = 'org-123'

const artifact = (over: Partial<ArtifactDTO> = {}): ArtifactDTO => ({
  id: 'artifact-1',
  organization_id: ORG,
  user_id: 'user-1',
  name: 'Landing page',
  kind: 'html',
  status: 'draft',
  serve_token: 'abcdef0123456789',
  content_type: 'text/html',
  size_bytes: 2048,
  created_at: '2026-09-28T00:00:00.000Z',
  updated_at: '2026-09-28T00:00:00.000Z',
  touch_point_id: null,
  access_mode: 'public',
  password_set_at: null,
  viewer_count: null,
  visits: 0,
  serve_url: 'https://art.li2.ai/a/abcdef0123456789',

  preview_url: 'https://art.li2.ai/a/abcdef0123456789',
  download_url: 'https://art.li2.ai/a/abcdef0123456789/download',
  short_url: null,
  path_qr_code: null,
  ...over,
})

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return { queryClient, wrapper }
}

beforeEach(() => {
  get.mockReset()
  post.mockReset()
  patch.mockReset()
  del.mockReset()
})

/** R12 — PATCH quyền xem. */
describe('useUpdateArtifactAccess', () => {
  it('PATCH …/{id} với access_mode + password, ghi cache chi tiết, invalidate danh sách, KHÔNG quota', async () => {
    const updated = artifact({ access_mode: 'password', password_set_at: '2026-10-06T00:00:00Z' })
    patch.mockResolvedValue({ data: { data: updated } })
    const { queryClient, wrapper } = makeWrapper()
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useUpdateArtifactAccess(ORG), { wrapper })
    await result.current.mutateAsync({
      artifact_id: 'artifact-1',
      access_mode: 'password',
      password: 'Abcdefgh1',
    })

    expect(patch).toHaveBeenCalledWith(`/organizations/${ORG}/artifacts/artifact-1`, {
      access_mode: 'password',
      password: 'Abcdefgh1',
    })
    expect(queryClient.getQueryData(artifactKeys.detail(ORG, 'artifact-1'))).toEqual(updated)
    expect(invalidate).toHaveBeenCalledWith({ queryKey: artifactKeys.all(ORG) })
    expect(invalidate).not.toHaveBeenCalledWith({ queryKey: artifactKeys.quota(ORG) })
  })

  it('chế độ khác password → body KHÔNG mang password dù được truyền', async () => {
    patch.mockResolvedValue({ data: { data: artifact({ access_mode: 'private' }) } })
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useUpdateArtifactAccess(ORG), { wrapper })
    await result.current.mutateAsync({
      artifact_id: 'artifact-1',
      access_mode: 'private',
      password: 'leak?',
    })
    expect(patch).toHaveBeenCalledWith(expect.any(String), { access_mode: 'private' })
  })
})

/**
 * Wave 4 B2 — đổi đường dẫn của artifact đã live. `onSuccess` giống `useUpdateArtifactAccess`: ghi
 * DTO mới vào cache chi tiết rồi invalidate danh sách. KHÔNG invalidate `quota`: không byte nào đổi,
 * và `quota` nằm ngoài `all` chính vì nó không được bị gỡ theo mỗi thao tác artifact.
 */
describe('useChangeArtifactSlug', () => {
  it('⭐ POST …/{id}/slug với body {slug}, ghi cache chi tiết, invalidate all, KHÔNG quota', async () => {
    const updated = artifact({
      status: 'live',
      touch_point_id: 'tp-1',
      short_url: 'https://s.li2.ai/thuc-don-moi',
      updated_at: '2026-10-11T10:00:00.000Z',
    })
    post.mockResolvedValue({ data: { data: updated } })
    const { queryClient, wrapper } = makeWrapper()
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useChangeArtifactSlug(ORG), { wrapper })
    await result.current.mutateAsync({ artifact_id: 'artifact-1', slug: 'thuc-don-moi' })

    expect(post).toHaveBeenCalledWith(`/organizations/${ORG}/artifacts/artifact-1/slug`, {
      slug: 'thuc-don-moi',
    })
    expect(queryClient.getQueryData(artifactKeys.detail(ORG, 'artifact-1'))).toEqual(updated)
    expect(invalidate).toHaveBeenCalledWith({ queryKey: artifactKeys.all(ORG) })
    expect(invalidate).not.toHaveBeenCalledWith({ queryKey: artifactKeys.quota(ORG) })
  })

  it('lỗi 400 slug trùng → mutation reject, cache chi tiết KHÔNG bị ghi', async () => {
    post.mockRejectedValue({ response: { status: 400 } })
    const { queryClient, wrapper } = makeWrapper()

    const { result } = renderHook(() => useChangeArtifactSlug(ORG), { wrapper })
    await expect(
      result.current.mutateAsync({ artifact_id: 'artifact-1', slug: 'da-co-nguoi-dung' })
    ).rejects.toBeTruthy()

    expect(queryClient.getQueryData(artifactKeys.detail(ORG, 'artifact-1'))).toBeUndefined()
  })
})

describe('useArtifactAccessModes', () => {
  it('gọi …/access-modes và bóc envelope', async () => {
    get.mockResolvedValue({
      data: { data: { modes: ['public', 'private', 'password', 'google'] } },
    })
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useArtifactAccessModes(ORG), { wrapper })
    await waitFor(() => expect(result.current.isPlaceholderData).toBe(false))
    expect(get).toHaveBeenCalledWith(`/organizations/${ORG}/artifacts/access-modes`)
    expect(result.current.data?.modes).toContain('google')
  })

  it('placeholder là ba chế độ pha 1 trong lúc chờ — hộp thoại không trống', () => {
    get.mockReturnValue(new Promise(() => {}))
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useArtifactAccessModes(ORG), { wrapper })
    expect(result.current.data?.modes).toEqual(['public', 'private', 'password'])
  })
})

describe('useGetArtifacts', () => {
  it('gọi đúng URL với page/limit và trả về PaginationResponse', async () => {
    get.mockResolvedValue({ data: { data: [artifact()], rowCount: 1 } })
    const { wrapper } = makeWrapper()

    const { result } = renderHook(() => useGetArtifacts(ORG, { page: 2, limit: 20 }), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(get).toHaveBeenCalledWith(`/organizations/${ORG}/artifacts`, {
      params: { page: 2, limit: 20 },
    })
    expect(result.current.data?.rowCount).toBe(1)
  })
})

describe('useShowArtifact', () => {
  it('gọi đúng URL chi tiết và bóc envelope `data`', async () => {
    get.mockResolvedValue({ data: { data: artifact({ status: 'live' }) } })
    const { wrapper } = makeWrapper()

    const { result } = renderHook(() => useShowArtifact(ORG, 'artifact-1'), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(get).toHaveBeenCalledWith(`/organizations/${ORG}/artifacts/artifact-1`)
    expect(result.current.data?.status).toBe('live')
  })
})

describe('useCreateArtifact', () => {
  it('gửi multipart có file và name, rồi invalidate danh sách', async () => {
    post.mockResolvedValue({ data: { data: artifact() } })
    const { queryClient, wrapper } = makeWrapper()
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useCreateArtifact(ORG), { wrapper })
    const file = new File(['<html></html>'], 'trang.html', { type: 'text/html' })
    await result.current.mutateAsync({ file, name: 'Landing page' })

    const [url, body, config] = post.mock.calls[0]
    expect(url).toBe(`/organizations/${ORG}/artifacts`)
    expect(body).toBeInstanceOf(FormData)
    // axiosApiInstance defaults to application/json. Without this override the FormData is sent
    // with no boundary and the route's `request.formData()` throws — which is exactly what
    // happened on LiHi while this test, named "gửi multipart", stayed green without checking it.
    expect((config as any)?.headers?.['Content-Type']).toBe('multipart/form-data')
    expect((body as FormData).get('file')).toBe(file)
    expect((body as FormData).get('name')).toBe('Landing page')
    expect(invalidate).toHaveBeenCalledWith({ queryKey: artifactKeys.all(ORG) })
    // Dung lượng đã dùng vừa đổi — hộp thoại thay file đọc số này.
    expect(invalidate).toHaveBeenCalledWith({ queryKey: artifactKeys.quota(ORG) })
  })
})

describe('useArtifactQuota', () => {
  it('gọi …/artifacts/quota, bóc envelope, khoá riêng không nằm dưới artifactKeys.all', async () => {
    const quota = { used_bytes: 1024, quota_bytes: 31457280, live_count: 1, live_quota: 3 }
    get.mockResolvedValue({ data: { data: quota } })
    const { queryClient, wrapper } = makeWrapper()

    const { result } = renderHook(() => useArtifactQuota(ORG), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(get).toHaveBeenCalledWith(`/organizations/${ORG}/artifacts/quota`)
    expect(result.current.data).toEqual(quota)
    expect(queryClient.getQueryData(artifactKeys.quota(ORG))).toEqual(quota)
    /**
     * `useDeleteArtifact` gọi `removeQueries` theo tiền tố của `all`; nếu khoá quota nằm dưới đó thì
     * xoá một artifact làm số "còn trống" biến mất khỏi cache giữa lúc hộp thoại đang mở.
     */
    const all = artifactKeys.all(ORG) as readonly string[]
    expect(all.every((part, i) => artifactKeys.quota(ORG)[i] === part)).toBe(false)
  })
})

describe('usePublishArtifact', () => {
  it('gọi endpoint publish với slug, ghi thẳng vào cache chi tiết và invalidate danh sách', async () => {
    const published = artifact({ status: 'live', short_url: 'https://li2.ai/abc' })
    post.mockResolvedValue({ data: { data: published } })
    const { queryClient, wrapper } = makeWrapper()
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => usePublishArtifact(ORG), { wrapper })
    await result.current.mutateAsync({ artifact_id: 'artifact-1', slug: 'landing' })

    expect(post).toHaveBeenCalledWith(`/organizations/${ORG}/artifacts/artifact-1/publish`, {
      slug: 'landing',
    })
    expect(queryClient.getQueryData(artifactKeys.detail(ORG, 'artifact-1'))).toEqual(published)
    expect(invalidate).toHaveBeenCalledWith({ queryKey: artifactKeys.all(ORG) })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: artifactKeys.quota(ORG) })
  })

  /** R2b/B1 — chế độ xem đi cùng request publish; password chỉ đi khi mode là password. */
  it('gửi access_mode + password cùng slug; password bị bỏ khi mode không phải password', async () => {
    post.mockResolvedValue({ data: { data: artifact({ status: 'live' }) } })
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => usePublishArtifact(ORG), { wrapper })

    await result.current.mutateAsync({
      artifact_id: 'artifact-1',
      access_mode: 'password',
      password: 'Abcdefgh1',
    })
    expect(post).toHaveBeenLastCalledWith(expect.any(String), {
      access_mode: 'password',
      password: 'Abcdefgh1',
    })

    await result.current.mutateAsync({
      artifact_id: 'artifact-1',
      slug: 'x',
      access_mode: 'private',
      password: 'no',
    })
    expect(post).toHaveBeenLastCalledWith(expect.any(String), { slug: 'x', access_mode: 'private' })
  })

  it('không có slug thì gửi body rỗng, không gửi slug undefined', async () => {
    post.mockResolvedValue({ data: { data: artifact({ status: 'live' }) } })
    const { wrapper } = makeWrapper()

    const { result } = renderHook(() => usePublishArtifact(ORG), { wrapper })
    await result.current.mutateAsync({ artifact_id: 'artifact-1' })

    expect(post.mock.calls[0][1]).toEqual({})
  })
})

describe('useReplaceArtifact', () => {
  it('multipart POST tới …/replace, giữ header và onUploadProgress — S3 cần phần trăm thật', async () => {
    const replaced = {
      ...artifact({
        status: 'live',
        kind: 'pdf',
        size_bytes: 4096,
        short_url: 'https://li2.ai/abc',
      }),
      previous_size_bytes: 2048,
    }
    post.mockResolvedValue({ data: { data: replaced } })
    const { queryClient, wrapper } = makeWrapper()
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
    const onUploadProgress = vi.fn()

    const { result } = renderHook(() => useReplaceArtifact(ORG), { wrapper })
    const file = new File(['%PDF-'], 'v2.pdf', { type: 'application/pdf' })
    const out = await result.current.mutateAsync({
      artifact_id: 'artifact-1',
      file,
      onUploadProgress,
    })

    const [url, body, config] = post.mock.calls[0]
    expect(url).toBe(`/organizations/${ORG}/artifacts/artifact-1/replace`)
    expect(body).toBeInstanceOf(FormData)
    expect((body as FormData).get('file')).toBe(file)
    // Không có name: tên không đổi qua thay file (R9).
    expect((body as FormData).has('name')).toBe(false)
    expect((config as any).headers['Content-Type']).toBe('multipart/form-data')
    ;(config as any).onUploadProgress({ loaded: 32, total: 100 })
    expect(onUploadProgress).toHaveBeenCalledWith(32)

    expect(out.previous_size_bytes).toBe(2048)
    // Cache chi tiết nhận DTO MỚI nhưng không mang `previous_size_bytes` — nó là chuyện của request.
    const cached = queryClient.getQueryData(artifactKeys.detail(ORG, 'artifact-1')) as any
    expect(cached.kind).toBe('pdf')
    expect(cached).not.toHaveProperty('previous_size_bytes')
    expect(invalidate).toHaveBeenCalledWith({ queryKey: artifactKeys.all(ORG) })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: artifactKeys.quota(ORG) })
  })
})

describe('useDeleteArtifact', () => {
  it('gọi DELETE đúng URL của tổ chức và artifact', async () => {
    del.mockResolvedValue({ data: { success: true } })
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useDeleteArtifact(ORG), { wrapper })

    result.current.mutate('artifact-1')
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(del).toHaveBeenCalledWith(`/organizations/${ORG}/artifacts/artifact-1`)
  })

  /**
   * `artifactKeys.all` là **tiền tố** của `artifactKeys.detail`, nên chỉ invalidate thôi là ra
   * lệnh cho query của chính hàng vừa xoá đi lấy lại dữ liệu — và nó ăn 404 ngay sau một thao
   * tác vừa thành công. Query chi tiết phải bị GỠ, không phải đánh dấu cũ.
   */
  it('gỡ hẳn query chi tiết của hàng đã xoá khỏi cache', async () => {
    del.mockResolvedValue({ data: { success: true } })
    const { queryClient, wrapper } = makeWrapper()
    queryClient.setQueryData(artifactKeys.detail(ORG, 'artifact-1'), artifact())
    expect(queryClient.getQueryData(artifactKeys.detail(ORG, 'artifact-1'))).toBeDefined()

    const { result } = renderHook(() => useDeleteArtifact(ORG), { wrapper })
    result.current.mutate('artifact-1')
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(queryClient.getQueryData(artifactKeys.detail(ORG, 'artifact-1'))).toBeUndefined()
  })

  it('xoá xong thì quota được đánh dấu cũ, KHÔNG bị gỡ khỏi cache', async () => {
    del.mockResolvedValue({ data: { success: true } })
    const { queryClient, wrapper } = makeWrapper()
    const quota = { used_bytes: 1024, quota_bytes: 31457280, live_count: 1, live_quota: 3 }
    queryClient.setQueryData(artifactKeys.quota(ORG), quota)
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useDeleteArtifact(ORG), { wrapper })
    result.current.mutate('artifact-1')
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(invalidate).toHaveBeenCalledWith({ queryKey: artifactKeys.quota(ORG) })
    expect(queryClient.getQueryData(artifactKeys.quota(ORG))).toEqual(quota)
  })

  it('không gỡ nhầm hàng khác', async () => {
    del.mockResolvedValue({ data: { success: true } })
    const { queryClient, wrapper } = makeWrapper()
    queryClient.setQueryData(artifactKeys.detail(ORG, 'artifact-2'), artifact({ id: 'artifact-2' }))

    const { result } = renderHook(() => useDeleteArtifact(ORG), { wrapper })
    result.current.mutate('artifact-1')
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(queryClient.getQueryData(artifactKeys.detail(ORG, 'artifact-2'))).toBeDefined()
  })
})

/**
 * N4 — thẻ danh sách không đổi sau ⋮ → "Công khai" dù PATCH trả 200. `invalidateQueries(all)` chỉ
 * chạm tới query danh sách khi mutation và danh sách dùng CÙNG một định danh tổ chức; trên LiHi
 * danh sách dùng `org_id` slug của route còn thẻ từng dùng `data.organization_id` UUID, nên lệnh
 * invalidate rơi vào một key không ai đọc. Hai test dưới đo đúng hai phía đó.
 */
describe('mutation và danh sách — cùng key thì tải lại, khác key thì không (N4)', () => {
  const listPage = (access_mode: ArtifactDTO['access_mode']) => ({
    data: { data: [artifact({ status: 'live', access_mode })], rowCount: 1 },
  })

  it('⭐ cùng org_id: sau PATCH quyền xem, query danh sách refetch và hàng mang access_mode mới', async () => {
    get.mockResolvedValue(listPage('private'))
    patch.mockResolvedValue({ data: { data: artifact({ status: 'live', access_mode: 'public' }) } })
    const { wrapper } = makeWrapper()

    const { result } = renderHook(
      () => ({ list: useGetArtifacts(ORG, { page: 1, limit: 5 }), update: useUpdateArtifactAccess(ORG) }),
      { wrapper }
    )
    await waitFor(() => expect(result.current.list.isSuccess).toBe(true))
    expect(result.current.list.data?.data[0].access_mode).toBe('private')
    expect(get).toHaveBeenCalledTimes(1)

    get.mockResolvedValue(listPage('public'))
    await act(async () => {
      await result.current.update.mutateAsync({ artifact_id: 'artifact-1', access_mode: 'public' })
    })

    await waitFor(() => expect(result.current.list.data?.data[0].access_mode).toBe('public'))
    expect(get).toHaveBeenCalledTimes(2)
  })

  it('khác định danh tổ chức (UUID trong khi danh sách dùng slug): danh sách KHÔNG tải lại — chính lỗi N4', async () => {
    get.mockResolvedValue(listPage('private'))
    patch.mockResolvedValue({ data: { data: artifact({ status: 'live', access_mode: 'public' }) } })
    const { wrapper } = makeWrapper()

    const { result } = renderHook(
      () => ({
        list: useGetArtifacts('khanhqns-organization', { page: 1, limit: 5 }),
        update: useUpdateArtifactAccess('11111111-2222-3333-4444-555555555555'),
      }),
      { wrapper }
    )
    await waitFor(() => expect(result.current.list.isSuccess).toBe(true))

    get.mockResolvedValue(listPage('public'))
    await act(async () => {
      await result.current.update.mutateAsync({ artifact_id: 'artifact-1', access_mode: 'public' })
    })

    expect(get).toHaveBeenCalledTimes(1)
    expect(result.current.list.data?.data[0].access_mode).toBe('private')
  })
})
