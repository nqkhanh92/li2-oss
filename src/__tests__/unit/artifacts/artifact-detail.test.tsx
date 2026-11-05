// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react'

import type { ArtifactDTO } from '@/core/types/artifact.type'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const artifactEn = require('../../../../public/lang/en/artifact.json')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const commonEn = require('../../../../public/lang/en/common.json')

function translate(key: string, params?: Record<string, unknown>) {
  const dict = key.startsWith('common:') ? commonEn : artifactEn
  const path = key.replace(/^(artifact|common|analytic):/, '')
  const value = path.split('.').reduce<unknown>((o, k) => (o as never)?.[k], dict)
  if (typeof value !== 'string') return path
  if (!params) return value
  return value.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k: string) => String(params[k] ?? ''))
}

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: translate }) }))

const routerPush = vi.fn()
vi.mock('next/navigation', () => ({
  useParams: () => ({ org_id: 'org-123', artifact_id: 'artifact-1' }),
  useRouter: () => ({ push: routerPush }),
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

vi.mock('@/shared/hooks/use-mobile', () => ({ useIsMobile: () => false }))

/** `ContentLayout` kéo theo `useSidebar`; trang chi tiết không phải chỗ kiểm cái vỏ đó. */
vi.mock('@/shared/components/layout/content-layout', () => ({
  ContentLayout: ({ title, children }: { title: React.ReactNode; children?: React.ReactNode }) => (
    <div>
      <div data-testid="layout-title">{title}</div>
      {children}
    </div>
  ),
}))

const qrPreviewProps = vi.fn()
vi.mock('@/features/short-links/components/short-link-form/qr-preview-card', () => ({
  QrPreviewCard: (props: Record<string, unknown>) => {
    qrPreviewProps(props)
    return <div data-testid="qr-preview" data-edit-mode={String(props.isEditMode)} />
  },
}))

vi.mock('@/features/analytics/components/sections/analytic-by-touch-point', () => ({
  AnalyticByTouchPoint: ({ touchPointId }: { touchPointId?: string }) => (
    <div data-testid="analytics" data-tp={touchPointId} />
  ),
}))

vi.mock('@/shared/providers/organization-store-provider', () => ({
  useOrganizationStoreProvider: () => ({ organization: { name: 'Quik' }, orgRouterPush: vi.fn() }),
}))

const showArtifact = vi.fn()
const publishMutate = vi.fn()
const replaceAsync = vi.fn()
const updateAccessAsync = vi.fn()
const changeSlugAsync = vi.fn()
const accessModes = vi.fn(() => ({ data: { modes: ['public', 'private', 'password', 'google'] } }))

vi.mock('@/features/artifacts/hooks/use-artifacts', () => ({
  ARTIFACT_PHASE1_ACCESS_MODES: ['public', 'private', 'password'],
  artifactKeys: {
    all: (org: string) => ['organizations', org, 'artifacts'],
    detail: (org: string, id: string) => ['organizations', org, 'artifacts', id],
    list: () => [],
    quota: (org: string) => ['artifact-quota', org],
    accessModes: () => [],
  },
  useShowArtifact: () => showArtifact(),
  usePublishArtifact: () => ({ mutate: publishMutate, isPending: false }),
  useArtifactAccessModes: () => accessModes(),
  useArtifactQuota: () => ({
    data: {
      used_bytes: 10 * 1024 * 1024,
      quota_bytes: 30 * 1024 * 1024,
      live_count: 2,
      live_quota: 3,
    },
  }),
  useReplaceArtifact: () => ({ mutateAsync: replaceAsync }),
  useUpdateArtifactAccess: () => ({ mutateAsync: updateAccessAsync }),
  useChangeArtifactSlug: () => ({ mutateAsync: changeSlugAsync }),
  useDeleteArtifact: () => ({ mutate: vi.fn(), isPending: false }),
}))

const checkSlug = vi.fn(async () => ({ exists: false }))
vi.mock('@/features/touch-points/hooks/use-slug-validation', () => ({
  useSlugValidation: () => ({ mutateAsync: checkSlug, isPending: false }),
}))

const invalidateQueries = vi.fn()
vi.mock('@tanstack/react-query', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-query')>()),
  useQueryClient: () => ({ invalidateQueries, setQueryData: vi.fn() }),
}))

import { ArtifactDetail } from '@/features/artifacts/components/artifact-detail'
import { getArtifactBackPath } from '@/features/artifacts/utils/list-path'

const artifact = (over: Partial<ArtifactDTO> = {}): ArtifactDTO => ({
  id: 'artifact-1',
  organization_id: 'org-123',
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
  visits: 42,
  serve_url: 'https://art.li2.ai/a/abcdef0123456789',

  preview_url: 'https://art.li2.ai/a/abcdef0123456789',
  download_url: 'https://art.li2.ai/a/abcdef0123456789/download',
  short_url: 'https://li2.ai/duong-dan-cu',
  path_qr_code: null,
  ...over,
})

const loaded = (over: Partial<ArtifactDTO> = {}) => ({
  data: artifact(over),
  isLoading: false,
  isError: false,
})

const openHeaderMenu = () => {
  const trigger = screen.getByLabelText(artifactEn.actions.more)
  // Radix mở menu bằng pointerdown (jsdom không gắn `button`) hoặc Enter — bàn phím là đường chắc.
  fireEvent.keyDown(trigger, { key: 'Enter' })
}

const mergedButton = () =>
  screen
    .getAllByRole('button')
    .find((b) => /Update content/.test(b.textContent ?? '')) as HTMLElement

beforeEach(() => {
  routerPush.mockClear()
  publishMutate.mockClear()
  replaceAsync.mockReset()
  updateAccessAsync.mockReset()
  changeSlugAsync.mockReset()
  toastSuccess.mockClear()
  toastError.mockClear()
  toastInfo.mockClear()
  qrPreviewProps.mockClear()
  checkSlug.mockReset()
  checkSlug.mockResolvedValue({ exists: false })
  accessModes.mockReturnValue({ data: { modes: ['public', 'private', 'password', 'google'] } })
  showArtifact.mockReturnValue(loaded())
})

describe('ArtifactDetail — một trang cuộn', () => {
  it('live: bốn khối theo đúng thứ tự DOM — không còn khối Phân tích (bỏ 17/10 theo chủ sản phẩm)', () => {
    const { container } = render(<ArtifactDetail />)
    const ids = Array.from(container.querySelectorAll('section[id]')).map((s) => s.id)
    expect(ids).toEqual(['sec-link', 'sec-replace', 'sec-preview', 'sec-access'])
    expect(screen.queryByTestId('analytics')).toBeNull()
  })

  it('live: header hiện short URL, nút copy, lượt quét, nút gộp và ⋮ bốn mục', () => {
    render(<ArtifactDetail />)
    expect(screen.getByText('li2.ai/duong-dan-cu')).toBeDefined()
    expect(screen.getByLabelText(artifactEn.actions.copy_link)).toBeDefined()
    expect(screen.getByTestId('artifact-visits').textContent).toContain('42')
    expect(mergedButton()).toBeDefined()

    openHeaderMenu()
    const items = screen.getAllByRole('menuitem').map((i) => i.textContent ?? '')
    expect(items).toHaveLength(4)
    expect(items[0]).toContain(commonEn.buttons.share)
    expect(items[1]).toContain(artifactEn.actions.open_new_tab)
    expect(items[2]).toContain(artifactEn.actions.download)
    expect(items[3]).toContain(artifactEn.actions.delete)
  })

  /**
   * `ArtifactPrimaryAction` ở trạng thái `live` cũng mang nhãn "Cập nhật nội dung"; nếu nó còn trên
   * trang thì có HAI nút cùng nhãn làm hai việc khác nhau — đúng cái bẫy wave 4 gỡ đi.
   */
  it('live: chỉ còn MỘT nút mang nhãn Cập nhật nội dung', () => {
    render(<ArtifactDetail />)
    const buttons = screen
      .getAllByRole('button')
      .filter((b) => /Update content/.test(b.textContent ?? ''))
    expect(buttons).toHaveLength(1)
  })

  it('draft: không có khối Phân tích, header hiện tên + badge + Xuất bản, QR khoá kèm hint', () => {
    showArtifact.mockReturnValue(loaded({ status: 'draft', short_url: null, touch_point_id: null }))
    const { container } = render(<ArtifactDetail />)

    const ids = Array.from(container.querySelectorAll('section[id]')).map((s) => s.id)
    expect(ids).not.toContain('sec-analytics')
    const header = within(screen.getByTestId('layout-title'))
    expect(header.getByText('Landing page')).toBeDefined()
    expect(header.getByText(artifactEn.status.draft.badge)).toBeDefined()
    expect(header.getByText(artifactEn.actions.publish)).toBeDefined()
    // Chưa có gì chờ áp → không có nút gộp "(0)".
    expect(mergedButton()).toBeUndefined()
    expect(screen.getByTestId('qr-preview').getAttribute('data-edit-mode')).toBe('false')
    // Hai nút tải/sao chép QR bị khoá kèm đúng câu "Xuất bản trước đã", và hint nói lại ngay dưới.
    expect(qrPreviewProps.mock.calls.at(-1)?.[0]).toMatchObject({
      isEditMode: false,
      hideCustomize: true,
      lockedTooltip: artifactEn.detail.qr.publish_first,
    })
    expect(screen.getByText(artifactEn.detail.qr.publish_first_hint)).toBeDefined()
    // Link gốc chỉ có nghĩa khi đã live.
    expect(screen.queryByText(artifactEn.detail.link.origin_label)).toBeNull()
  })

  it('404 từ API: màn không tìm thấy + nút quay lại danh sách', () => {
    showArtifact.mockReturnValue({ data: undefined, isLoading: false, isError: true })
    render(<ArtifactDetail />)
    expect(screen.getByText(artifactEn.detail.not_found)).toBeDefined()
    fireEvent.click(screen.getByText(artifactEn.detail.back_to_list))
    expect(routerPush).toHaveBeenCalledWith(getArtifactBackPath('org-123'))
  })

  it('không còn khoá i18n thô nào lọt ra màn hình', () => {
    render(<ArtifactDetail />)
    expect(screen.queryByText(/^(detail|list|access|update)\.[a-z_.]+$/)).toBeNull()
  })
})

describe('ArtifactDetail — khối Quyền xem', () => {
  const pickMode = (label: string) =>
    fireEvent.click(screen.getByRole('radio', { name: new RegExp(label) }))

  it('Google → Mật khẩu: sau PATCH hiện mật khẩu một lần + Xong, rồi về radio với badge hiện tại', async () => {
    showArtifact.mockReturnValue(loaded({ access_mode: 'google', viewer_count: 3 }))
    updateAccessAsync.mockResolvedValue(artifact({ access_mode: 'password' }))
    render(<ArtifactDetail />)

    // "Ai đã xem" ở chế độ Google: chỉ số người + đường vào Khách hàng (quyết định Q4).
    expect(screen.getByText(artifactEn.access.who_viewed)).toBeDefined()
    expect(screen.getByText(translate('artifact:access.viewer_count', { count: 3 }))).toBeDefined()

    pickMode(artifactEn.access.mode.password.label)
    fireEvent.change(screen.getByPlaceholderText(artifactEn.access.password_placeholder), {
      target: { value: 'matkhau123' },
    })

    await act(async () => {
      fireEvent.click(mergedButton())
    })

    await waitFor(() => expect(screen.getByTestId('artifact-password-reveal')).toBeDefined())
    expect(updateAccessAsync).toHaveBeenCalledWith({
      artifact_id: 'artifact-1',
      access_mode: 'password',
      password: 'matkhau123',
    })

    // DTO mới quay về từ cache với `access_mode: 'password'` — reveal KHÔNG được biến mất vì nó.
    showArtifact.mockReturnValue(loaded({ access_mode: 'password', password_set_at: '2026-10-11' }))
    await act(async () => {
      fireEvent.click(screen.getByText(artifactEn.detail.file_info))
    })
    expect(screen.getByTestId('artifact-password-reveal')).toBeDefined()

    fireEvent.click(screen.getByText(artifactEn.access.password_dialog.done))
    await waitFor(() => expect(screen.queryByTestId('artifact-password-reveal')).toBeNull())
    const passwordRadio = screen.getByRole('radio', {
      name: new RegExp(artifactEn.access.mode.password.label),
    })
    expect(passwordRadio.closest('label')?.textContent).toContain(artifactEn.access.current_badge)
  })

  it('rời Mật khẩu thì cảnh báo người đang xem phải xác thực lại', () => {
    showArtifact.mockReturnValue(loaded({ access_mode: 'password' }))
    render(<ArtifactDetail />)
    pickMode(artifactEn.access.mode.public.label)
    expect(screen.getByText(artifactEn.access.dialog.leaving_password)).toBeDefined()
  })
})

/**
 * Dòng "Ai đã xem" — một DÒNG, không phải một bảng (chủ sản phẩm bác bản bảng 2026-11-01).
 *
 * Bốn ca ở đây là bốn CÂU KHÁC NHAU, và trộn chúng là nói sai với người dùng. Ca "không ở chế độ
 * Google" phải phân biệt được với ca "chưa ai mở": một cái nghĩa là không biết được ai, cái kia
 * nghĩa là biết và câu trả lời là không ai.
 */
describe('ArtifactDetail — dòng Ai đã xem', () => {
  const customersHref = (artifactId = 'artifact-1') =>
    `/org/org-123/customers?artifact_id=${artifactId}`

  it('google + có người mở: số người kèm liên kết sang Khách hàng đã lọc theo artifact', () => {
    showArtifact.mockReturnValue(loaded({ access_mode: 'google', viewer_count: 3 }))
    render(<ArtifactDetail />)

    expect(screen.getByText(artifactEn.access.who_viewed)).toBeDefined()
    expect(screen.getByText(translate('artifact:access.viewer_count', { count: 3 }))).toBeDefined()

    const link = screen.getByRole('link', { name: artifactEn.access.who_viewed_link })
    expect(link.getAttribute('href')).toBe(customersHref())

    // Không được nói "chưa ai mở" khi có 3 người.
    expect(screen.queryByText(artifactEn.access.viewers.none)).toBeNull()
    expect(screen.queryByText(artifactEn.access.viewers.anonymous)).toBeNull()
  })

  it('google + chưa ai mở: nói rõ chưa ai mở, KHÔNG nói "không thu được email"', () => {
    showArtifact.mockReturnValue(loaded({ access_mode: 'google', viewer_count: 0 }))
    render(<ArtifactDetail />)

    expect(screen.getByText(artifactEn.access.viewers.none)).toBeDefined()
    expect(screen.getByText(artifactEn.access.viewers.none_hint)).toBeDefined()
    expect(screen.queryByText(artifactEn.access.viewers.anonymous)).toBeNull()
  })

  it('KHÔNG ở chế độ google: nói không thu được email, KHÔNG nói "0 người đã mở" hay "chưa ai mở"', () => {
    showArtifact.mockReturnValue(loaded({ access_mode: 'public', viewer_count: null }))
    render(<ArtifactDetail />)

    expect(screen.getByText(artifactEn.access.viewers.anonymous)).toBeDefined()
    expect(
      screen.getByText(
        translate('artifact:access.viewers.anonymous_hint', {
          mode: artifactEn.access.mode.public.label,
        })
      )
    ).toBeDefined()

    // Hai câu của ca "google" không được xuất hiện ở đây.
    expect(screen.queryByText(artifactEn.access.viewers.none)).toBeNull()
    expect(screen.queryByText(translate('artifact:access.viewer_count', { count: 0 }))).toBeNull()

    const link = screen.getByRole('link', { name: artifactEn.access.viewers.anonymous_link })
    expect(link.getAttribute('href')).toBe(customersHref())
  })

  /**
   * Ca thứ tư, tồn tại thật trong dữ liệu LiHi: đã từng ở `google` nên có người xem được ghi lại,
   * nay đã đổi sang `public`. `getForOrg` chỉ đếm khi chế độ HIỆN TẠI là `google`, nên DTO trả
   * `viewer_count: null` — và dù một `viewer_count` cũ có lọt vào DTO thì dòng này VẪN phải nói
   * "không thu được email", không được hiện con số như thể đang đếm đúng.
   */
  it('từng ở google rồi đổi sang public: không hiện con số cũ như thể đang đếm đúng', () => {
    showArtifact.mockReturnValue(loaded({ access_mode: 'public', viewer_count: 5 }))
    render(<ArtifactDetail />)

    expect(screen.getByText(artifactEn.access.viewers.anonymous)).toBeDefined()
    expect(screen.queryByText(translate('artifact:access.viewer_count', { count: 5 }))).toBeNull()
    expect(screen.queryByText(artifactEn.access.viewers.none)).toBeNull()

    // Người đã ghi được vẫn tra được — đường dẫn sang Khách hàng còn đó.
    expect(
      screen
        .getByRole('link', { name: artifactEn.access.viewers.anonymous_link })
        .getAttribute('href')
    ).toBe(customersHref())
  })

  it('nháp: không có dòng này — chưa có địa chỉ công khai thì chưa ai mở được', () => {
    showArtifact.mockReturnValue(loaded({ status: 'draft', access_mode: 'google' }))
    render(<ArtifactDetail />)
    expect(screen.queryByText(artifactEn.access.who_viewed)).toBeNull()
  })

  it('google mà đếm hỏng (viewer_count null): không bịa "chưa ai mở", vẫn còn đường sang Khách hàng', () => {
    showArtifact.mockReturnValue(loaded({ access_mode: 'google', viewer_count: null }))
    render(<ArtifactDetail />)

    expect(screen.queryByText(artifactEn.access.viewers.none)).toBeNull()
    expect(screen.queryByText(artifactEn.access.viewers.anonymous)).toBeNull()
    expect(
      screen
        .getByRole('link', { name: artifactEn.access.viewers.anonymous_link })
        .getAttribute('href')
    ).toBe(customersHref())
  })
})

describe('ArtifactDetail — khối Link', () => {
  const slugInput = () => screen.getByLabelText(artifactEn.detail.link.short_label)

  it('live + đã sửa: hiện thông báo QR đã in vẫn chạy, và ẩn nút Sao chép/Mở', () => {
    render(<ArtifactDetail />)
    expect(screen.getByText(commonEn.actions.copy)).toBeDefined()

    fireEvent.change(slugInput(), { target: { value: 'duong-dan-moi' } })

    expect(screen.getByText(artifactEn.detail.link.warn_title)).toBeDefined()
    expect(
      screen.getByText(translate('artifact:detail.link.warn_body', { slug: 'duong-dan-cu' }))
    ).toBeDefined()
    expect(screen.queryByText(commonEn.actions.copy)).toBeNull()
  })

  it('slug trùng: lỗi inline và apply() bị chặn, không request nào đi', async () => {
    checkSlug.mockResolvedValue({ exists: true })
    render(<ArtifactDetail />)
    fireEvent.change(slugInput(), { target: { value: 'duong-dan-moi' } })

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 650))
    })
    await waitFor(() =>
      expect(
        screen.getByText(translate('artifact:detail.link.taken', { slug: 'duong-dan-moi' }))
      ).toBeDefined()
    )
    // Nút vẫn đếm thay đổi — điều bị chặn là thao tác, không phải phép đếm.
    expect(mergedButton().textContent).toContain('(1)')

    await act(async () => {
      fireEvent.click(mergedButton())
    })
    expect(changeSlugAsync).not.toHaveBeenCalled()
    expect(toastError).toHaveBeenCalled()
  })

  it('slug ngắn: lỗi inline nói đúng giới hạn 6–64 của schema thật', () => {
    render(<ArtifactDetail />)
    fireEvent.change(slugInput(), { target: { value: 'ngan5' } })
    expect(
      screen.getByText(translate('artifact:create.slug.invalid', { min: 6, max: 64 }))
    ).toBeDefined()
  })

  it('draft: hint nói đường dẫn mới dùng khi xuất bản, và publish nhận đúng slug đó', () => {
    showArtifact.mockReturnValue(loaded({ status: 'draft', short_url: null, touch_point_id: null }))
    render(<ArtifactDetail />)

    fireEvent.change(slugInput(), { target: { value: 'duong-dan-moi' } })
    expect(screen.getByText(artifactEn.detail.link.hint_changed_draft)).toBeDefined()

    fireEvent.click(screen.getByText(artifactEn.actions.publish))
    expect(publishMutate.mock.calls[0][0]).toEqual({
      artifact_id: 'artifact-1',
      slug: 'duong-dan-moi',
    })
  })
})
