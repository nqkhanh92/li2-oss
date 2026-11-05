// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react'

import { ARTIFACT_KIND_SPECS, type ArtifactDTO } from '@/core/types/artifact.type'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const artifactEn = require('../../../../public/lang/en/artifact.json')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const commonEn = require('../../../../public/lang/en/common.json')

/**
 * Phân giải cả hai namespace chứ không chỉ `artifact`. Nếu `common:` rơi về chính chuỗi khoá thì
 * mọi assert chạm tới nhãn dùng chung (Huỷ, Tải QR…) sẽ đang kiểm một khoá thô — tức là một nhãn
 * hỏng vẫn làm test xanh, đúng lớp lỗi mà `i18n-keys.test.ts` được viết ra để bắt.
 */
function translate(key: string, params?: Record<string, unknown>) {
  const dict = key.startsWith('common:') ? commonEn : artifactEn
  const path = key.replace(/^(artifact|common):/, '')
  const value = path.split('.').reduce<unknown>((o, k) => (o as never)?.[k], dict)
  if (typeof value !== 'string') return path
  if (!params) return value
  return value.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k: string) => String(params[k] ?? ''))
}

vi.mock('react-i18next', () => ({
  // `i18n` có mặt vì bộ lọc ngày đọc `i18n.language` để chọn locale hiển thị.
  useTranslation: () => ({ t: translate, i18n: { language: 'vi', changeLanguage: vi.fn() } }),
}))

vi.mock('next/navigation', () => ({
  // Trên LiHi tham số route là **slug**, không UUID — và chính chỗ lệch đó là lỗi N4.
  useParams: () => ({ org_id: 'khanhqns-organization', artifact_id: 'artifact-1' }),
  useRouter: () => ({ push: routerPush }),
}))

const toastSuccess = vi.fn()
const toastError = vi.fn()
vi.mock('sonner', () => ({
  toast: {
    success: (...a: unknown[]) => toastSuccess(...a),
    error: (...a: unknown[]) => toastError(...a),
  },
}))

const routerPush = vi.fn()
const orgRouterPush = vi.fn()
vi.mock('@/shared/providers/organization-store-provider', () => ({
  useOrganizationStoreProvider: () => ({ orgRouterPush }),
}))

vi.mock('@/features/bootstrap/components/qr-render', () => ({
  QrRenderWithRef: () => <div data-testid="qr" />,
  DownloadQrPopover: ({ button }: { button: React.ReactNode }) => <>{button}</>,
}))

const useGetArtifacts = vi.fn()
const deleteMutate = vi.fn()
/** Quota mặc định: org dùng 10 MB / 30 MB, 2 live / 3 — còn rộng. */
const quotaState: { data: unknown } = {
  data: {
    used_bytes: 10 * 1024 * 1024,
    quota_bytes: 30 * 1024 * 1024,
    live_count: 2,
    live_quota: 3,
  },
}
const updateAccessMutate = vi.fn()
/**
 * Ghi lại **định danh tổ chức** mà component truyền vào hook. Trước N4, mock cũ bỏ qua tham số này,
 * nên thẻ truyền UUID trong khi danh sách query bằng slug mà test vẫn xanh.
 */
const updateAccessOrg = vi.fn()
const deleteArtifactOrg = vi.fn()
vi.mock('@/features/artifacts/hooks/use-artifacts', () => ({
  ARTIFACT_PHASE1_ACCESS_MODES: ['public', 'private', 'password'],
  useUpdateArtifactAccess: (org_id: string) => {
    updateAccessOrg(org_id)
    return { mutate: updateAccessMutate, isPending: false }
  },
  useArtifactAccessModes: () => ({ data: { modes: ['public', 'private', 'password'] } }),
  artifactKeys: {
    all: () => [],
    detail: () => [],
    list: () => [],
    quota: () => [],
    accessModes: () => [],
  },
  useGetArtifacts: (...args: unknown[]) => useGetArtifacts(...args),
  useShowArtifact: vi.fn(),
  // Trả object rỗng chứ không `vi.fn()` trần: `ArtifactQuickPublish` trong hàng công cụ của
  // danh sách destructure `mutateAsync` ngay lúc render, một hàm trả undefined sẽ ném.
  useCreateArtifact: () => ({ mutateAsync: vi.fn(), isPending: false }),
  usePublishArtifact: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteArtifact: (org_id: string) => {
    deleteArtifactOrg(org_id)
    return {
      mutate: deleteMutate,
      mutateAsync: (...a: unknown[]) => {
        deleteMutate(...a)
        return Promise.resolve(a[0])
      },
      isPending: false,
    }
  },
  useChangeArtifactSlug: () => ({ mutateAsync: vi.fn() }),
  useReplaceArtifact: () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }),
  useArtifactQuota: () => quotaState,
}))

const invalidateQueries = vi.fn()
vi.mock('@tanstack/react-query', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-query')>()),
  useQueryClient: () => ({ invalidateQueries }),
}))

// `CustomDialogV2` chọn Drawer hay Dialog theo `window.matchMedia`, thứ jsdom không có.
vi.mock('@/shared/hooks/use-mobile', () => ({ useIsMobile: () => false }))

/** Xoá hàng loạt đi qua `useConfirmDialog`; bài kiểm quan tâm "có hỏi và xoá mấy cái". */
const confirmSpy = vi.fn(async () => true)
vi.mock('@/shared/components/customize/confirm-dialog', () => ({
  useConfirmDialog: () => ({ confirm: (...a: unknown[]) => confirmSpy(...(a as [])) }),
}))

import { ArtifactList } from '@/features/artifacts/components/artifact-list'
import { ArtifactCard } from '@/features/artifacts/components/artifact-list/artifact-card'
import { ArtifactStatusBadge } from '@/features/artifacts/components/artifact-status-badge'
import { ArtifactPreview } from '@/features/artifacts/components/artifact-detail/artifact-preview'
import { ArtifactPrimaryAction } from '@/features/artifacts/components/artifact-primary-action'
import { ArtifactDeleteButton } from '@/features/artifacts/components/artifact-delete-button'
import { ArtifactAccessBadge } from '@/features/artifacts/components/artifact-access-badge'
import { ArtifactAccessFields } from '@/features/artifacts/components/artifact-access-fields'
import { ArtifactCreatedDialog } from '@/features/artifacts/components/artifact-created-dialog'
import { generateArtifactPassword } from '@/features/artifacts/utils/artifact-access'
import { getArtifactBackPath } from '@/features/artifacts/utils/list-path'

const artifact = (over: Partial<ArtifactDTO> = {}): ArtifactDTO => ({
  id: 'artifact-1',
  /** UUID thật của tổ chức — KHÁC `org_id` slug trên route, đúng như dữ liệu LiHi. */
  organization_id: '11111111-2222-3333-4444-555555555555',
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
  visits: 0,
  serve_url: 'https://art.li2.ai/a/abcdef0123456789',

  preview_url: 'https://art.li2.ai/a/abcdef0123456789',
  download_url: 'https://art.li2.ai/a/abcdef0123456789/download',
  short_url: 'https://li2.ai/abc',
  path_qr_code: null,
  ...over,
})

// Card nhận `row` của TanStack; test cần `original` và hai hàm chọn hàng.
const rowOf = (data: ArtifactDTO, selected = false) =>
  ({
    original: data,
    getIsSelected: () => selected,
    toggleSelected: toggleSelected,
  }) as never
const toggleSelected = vi.fn()

describe('ArtifactList', () => {
  beforeEach(() => {
    confirmSpy.mockClear()
    confirmSpy.mockResolvedValue(true)
    deleteMutate.mockClear()
  })

  it('hiện empty state khi danh sách rỗng', () => {
    useGetArtifacts.mockReturnValue({ data: { data: [], rowCount: 0 }, isLoading: false })
    render(<ArtifactList />)
    expect(screen.getByText(artifactEn.list.empty.title)).toBeDefined()
    expect(screen.getByText(artifactEn.list.empty.cta)).toBeDefined()
  })

  it('không hiện empty state khi đang tải — tránh nháy "chưa có gì" rồi mới ra dữ liệu', () => {
    useGetArtifacts.mockReturnValue({ data: undefined, isLoading: true })
    render(<ArtifactList />)
    expect(screen.queryByText(artifactEn.list.empty.title)).toBeNull()
  })

  describe('chọn hàng loạt và hàng công cụ (wave 4)', () => {
    const twoRows = () => {
      useGetArtifacts.mockReturnValue({
        data: {
          data: [artifact(), artifact({ id: 'artifact-2', name: 'Menu PDF', kind: 'pdf' })],
          rowCount: 2,
        },
        isLoading: false,
      })
    }

    const selectAll = () => screen.getAllByLabelText(artifactEn.list.select_all)[0] as HTMLElement

    it('header bảng có checkbox Chọn tất cả; chọn hết rồi xoá thì gọi DELETE cho từng hàng', async () => {
      twoRows()
      render(<ArtifactList />)

      expect(selectAll()).toBeDefined()
      expect(screen.getByText(artifactEn.list.select_all)).toBeDefined()

      await act(async () => {
        fireEvent.click(selectAll())
      })
      expect(
        screen.getByText(translate('artifact:list.selected_count', { count: 2 }))
      ).toBeDefined()

      const bulkDelete = screen.getByLabelText(artifactEn.list.bulk_delete)
      await act(async () => {
        fireEvent.click(bulkDelete)
      })

      expect(confirmSpy).toHaveBeenCalledTimes(1)
      expect(deleteMutate.mock.calls.map((c) => c[0])).toEqual(['artifact-1', 'artifact-2'])
      expect(toastSuccess).toHaveBeenCalledWith(
        translate('artifact:list.bulk_deleted', { count: 2 })
      )
    })

    it('huỷ ở hộp xác nhận thì không xoá gì', async () => {
      twoRows()
      confirmSpy.mockResolvedValue(false)
      render(<ArtifactList />)

      await act(async () => {
        fireEvent.click(selectAll())
      })
      await act(async () => {
        fireEvent.click(screen.getByLabelText(artifactEn.list.bulk_delete))
      })

      expect(deleteMutate).not.toHaveBeenCalled()
    })

    /**
     * `listForOrg` chỉ nhận `page`/`limit`. Một ô tìm kiếm chạy được sẽ lọc năm hàng của trang hiện
     * tại và nói dối về phần còn lại — nên nó phải KHOÁ, kèm câu nói rõ vì sao.
     */
    it('ô tìm kiếm CHẠY được — gõ vào thì danh sách hỏi lại server kèm từ khoá', async () => {
      // Trước 2026-10-23 cả hàng công cụ bị khoá vì API chỉ nhận page/limit. Nay API nhận
      // search/from_date/to_date/status nên lọc chạy ở server, và đây là chỗ kiểm điều đó:
      // tham số phải ĐI TỚI hook, không phải lọc mảng của trang hiện tại.
      twoRows()
      render(<ArtifactList />)

      const search = screen.getByPlaceholderText(artifactEn.list.tools.search_placeholder)
      expect((search as HTMLInputElement).disabled).toBe(false)

      fireEvent.change(search, { target: { value: 'bao-cao' } })

      await waitFor(
        () => {
          const last = useGetArtifacts.mock.calls.at(-1)
          expect(last?.[1]?.search).toBe('bao-cao')
        },
        { timeout: 2000 }
      )
    })

    it('mặc định không gửi bộ lọc nào — tham số rỗng phải là undefined, không phải chuỗi rỗng', () => {
      // Chuỗi rỗng đi xuống repo thành `ilike.%%`: khớp mọi hàng mà vẫn tốn một truy vấn slug.
      twoRows()
      render(<ArtifactList />)
      const params = useGetArtifacts.mock.calls.at(-1)?.[1]
      expect(params.search).toBeUndefined()
      expect(params.from_date).toBeUndefined()
      expect(params.to_date).toBeUndefined()
      expect(params.status).toBeUndefined()
      expect(params.page).toBe(1)
    })

    it('dòng tổng nói số artifact, số đã xuất bản và dung lượng', () => {
      twoRows()
      render(<ArtifactList />)
      expect(
        screen.getByText(
          translate('artifact:list.summary', {
            total: 2,
            live: 2,
            liveQuota: 3,
            used: '10 MB',
            quota: '30 MB',
          })
        )
      ).toBeDefined()
    })
  })
})

describe('ArtifactStatusBadge', () => {
  it('draft và live hiện đúng nhãn', () => {
    const { rerender } = render(<ArtifactStatusBadge status="draft" />)
    expect(screen.getByText(artifactEn.status.draft.badge)).toBeDefined()

    rerender(<ArtifactStatusBadge status="live" />)
    expect(screen.getByText(artifactEn.status.live.badge)).toBeDefined()
  })
})

describe('ArtifactCard', () => {
  it('live có short_url thì hiện link đã bỏ giao thức', () => {
    render(<ArtifactCard row={rowOf(artifact())} />)
    expect(screen.getByText('li2.ai/abc')).toBeDefined()
  })

  it('live nhưng short_url null thì nói link đã bị xoá, không để trống', () => {
    render(<ArtifactCard row={rowOf(artifact({ short_url: null }))} />)
    expect(screen.getByText(artifactEn.list.link_deleted)).toBeDefined()
  })

  it('draft hiện dòng hướng dẫn xuất bản thay cho link', () => {
    render(<ArtifactCard row={rowOf(artifact({ status: 'draft', short_url: null }))} />)
    expect(screen.getByText(artifactEn.status.draft.note)).toBeDefined()
  })

  /**
   * Bốn định dạng nằm lẫn trong một danh sách; không có nhãn thì hai hàng tên giống nhau là hai
   * hàng không phân biệt được, và người dùng phải mở từng cái ra mới biết cái nào là video.
   */
  it.each([
    ['html', artifactEn.kind.html],
    ['pdf', artifactEn.kind.pdf],
    ['slides', artifactEn.kind.slides],
    ['video', artifactEn.kind.video],
  ] as const)('%s hiện nhãn loại "%s"', (kind, label) => {
    render(<ArtifactCard row={rowOf(artifact({ kind }))} />)
    expect(screen.getByText(label)).toBeDefined()
  })

  it('live: checkbox, nút copy inline ghi short_url, thanh lượt quét và nút Phân tích', () => {
    const writeText = vi.fn()
    Object.assign(navigator, { clipboard: { writeText } })
    render(<ArtifactCard row={rowOf(artifact({ visits: 137 }))} />)

    expect(screen.getByLabelText(artifactEn.list.select_all)).toBeDefined()

    fireEvent.click(screen.getByLabelText(artifactEn.actions.copy_link))
    expect(writeText).toHaveBeenCalledWith('https://li2.ai/abc')

    expect(screen.getByTestId('artifact-card-visits').textContent).toContain('137')

    // Nút Phân tích đã bỏ (17/10): thẻ chỉ còn số lượt quét, không còn liên kết #sec-analytics.
    expect(screen.queryByLabelText('Analytics')).toBeNull()
  })

  it('draft: không thanh lượt quét, không nút Phân tích, QR là icon loại file', () => {
    render(<ArtifactCard row={rowOf(artifact({ status: 'draft', short_url: null }))} />)
    expect(screen.queryByTestId('artifact-card-visits')).toBeNull()
    expect(screen.queryByLabelText('Analytics')).toBeNull()
    expect(screen.queryByTestId('qr')).toBeNull()
  })

  /**
   * Ảnh QR được ghi lại vào CÙNG một path khi đổi đường dẫn, nên `created_at` không bao giờ đổi và
   * trình duyệt tiếp tục hiện mã QR của đường dẫn cũ — đúng lớp lỗi R2 của spec.
   */
  it('ảnh path_qr_code cache-bust bằng updated_at, không created_at', () => {
    const { container } = render(
      <ArtifactCard
        row={rowOf(
          artifact({
            path_qr_code: 'https://cdn.li2.ai/qr/abc.png',
            created_at: '2026-01-01T00:00:00.000Z',
            updated_at: '2026-10-05T00:00:00.000Z',
          })
        )}
      />
    )
    const src = container.querySelector('img')?.getAttribute('src') ?? ''
    expect(decodeURIComponent(src)).toContain(
      `?v=${new Date('2026-10-05T00:00:00.000Z').getTime()}`
    )
  })

  it('hiện updated_at, không phải created_at — sau khi thay nội dung thời điểm đổi mới đáng xem', () => {
    render(
      <ArtifactCard
        row={rowOf(
          artifact({
            created_at: '2026-01-01T00:00:00.000Z',
            updated_at: '2026-10-05T00:00:00.000Z',
          })
        )}
      />
    )
    expect(screen.getByText('Oct 5, 2026')).toBeDefined()
    expect(screen.queryByText('Jan 1, 2026')).toBeNull()
  })

  describe('menu ⋮ (wave 4)', () => {
    beforeEach(() => {
      orgRouterPush.mockReset()
      updateAccessMutate.mockReset()
      toastSuccess.mockClear()
    })

    const openMenu = () => {
      const trigger = screen.getByLabelText(artifactEn.actions.more)
      // Radix mở menu bằng pointerdown (cần `button === 0`, thứ jsdom không gắn vào Event) hoặc
      // Enter/Space — bàn phím là đường mở chắc chắn trong jsdom, và nó cũng phải chạy thật.
      fireEvent.keyDown(trigger, { key: 'Enter' })
    }

    it('đúng ba mục theo thứ tự Cập nhật nội dung / Công khai / Xoá, và không còn Sao chép link', () => {
      render(<ArtifactCard row={rowOf(artifact({ access_mode: 'private' }))} />)
      openMenu()
      const items = screen.getAllByRole('menuitem').map((i) => i.textContent ?? '')
      expect(items).toHaveLength(3)
      expect(items[0]).toContain(artifactEn.actions.update_content)
      expect(items[1]).toContain(artifactEn.list.menu.make_public)
      expect(items[2]).toContain(artifactEn.actions.delete)
      expect(screen.queryByText(artifactEn.actions.copy_link)).toBeNull()
    })

    it('Cập nhật nội dung điều hướng tới khối thay file, KHÔNG mở hộp thoại nào', () => {
      render(<ArtifactCard row={rowOf(artifact())} />)
      openMenu()
      fireEvent.click(screen.getByText(artifactEn.actions.update_content))
      expect(orgRouterPush).toHaveBeenCalledWith('/artifacts/artifact-1#sec-replace')
      expect(
        screen.queryByText(artifactEn.update.description.replace('{{name}}', 'Landing page'))
      ).toBeNull()
    })

    it('private: Công khai là nút, bấm gửi đúng một PATCH access_mode public kèm toast', () => {
      updateAccessMutate.mockImplementation(
        (_payload: unknown, options?: { onSuccess?: () => void }) => options?.onSuccess?.()
      )
      render(<ArtifactCard row={rowOf(artifact({ access_mode: 'private' }))} />)
      openMenu()
      fireEvent.click(screen.getByText(artifactEn.list.menu.make_public))

      expect(updateAccessMutate).toHaveBeenCalledTimes(1)
      expect(updateAccessMutate.mock.calls[0][0]).toEqual({
        artifact_id: 'artifact-1',
        access_mode: 'public',
      })
      expect(toastSuccess).toHaveBeenCalledWith(
        translate('artifact:list.made_public', { name: 'Landing page' })
      )
    })

    it('public: Công khai là mục tĩnh có dấu tick, aria-disabled, bấm không gọi API', () => {
      render(<ArtifactCard row={rowOf(artifact({ access_mode: 'public' }))} />)
      openMenu()
      const item = screen
        .getByText(artifactEn.list.menu.make_public)
        .closest('[role="menuitem"]') as HTMLElement
      expect(item.getAttribute('aria-disabled')).toBe('true')
      expect(item.textContent).toContain(artifactEn.list.menu.public_now_sub)

      fireEvent.click(item)
      expect(updateAccessMutate).not.toHaveBeenCalled()
    })

    it('Xoá mở hộp xác nhận xoá (dùng lại ArtifactDeleteDialog)', () => {
      render(<ArtifactCard row={rowOf(artifact())} />)
      openMenu()
      fireEvent.click(screen.getByText(artifactEn.actions.delete))
      expect(screen.getByText(artifactEn.detail.delete_confirm_title)).toBeDefined()
    })

    /**
     * i18next trả lại chính chuỗi khoá khi khoá thiếu, nên một khoá sai trông y hệt một khoá đúng
     * trong mọi assert khác của file này. Chốt bằng hình dạng của khoá thô.
     */
    it('không khoá i18n thô nào lọt ra thẻ hay menu', () => {
      render(<ArtifactCard row={rowOf(artifact({ access_mode: 'private' }))} />)
      openMenu()
      expect(screen.queryByText(/^(detail|list|access|actions)\.[a-z_.]+$/)).toBeNull()
    })
  })

  /**
   * N4 — PATCH trả 200 nhưng thẻ chỉ đổi sau khi tải lại trang. Thẻ truyền `data.organization_id`
   * (UUID) vào mutation trong khi `ArtifactList` query bằng `org_id` của route (slug trên LiHi),
   * nên `invalidateQueries(artifactKeys.all(...))` đánh dấu cũ một key không query nào đọc. Mọi
   * mutation gọi từ thẻ phải nhận CÙNG định danh mà danh sách đã query.
   */
  describe('định danh tổ chức truyền vào mutation (N4)', () => {
    beforeEach(() => {
      updateAccessOrg.mockClear()
      deleteArtifactOrg.mockClear()
      deleteMutate.mockReset()
      routerPush.mockReset()
    })

    const openMenu = () =>
      fireEvent.keyDown(screen.getByLabelText(artifactEn.actions.more), { key: 'Enter' })

    it('⭐ useUpdateArtifactAccess nhận org_id của ROUTE, không UUID của DTO', () => {
      render(<ArtifactCard row={rowOf(artifact({ access_mode: 'private' }))} />)
      expect(updateAccessOrg).toHaveBeenCalledWith('khanhqns-organization')
      expect(updateAccessOrg).not.toHaveBeenCalledWith('11111111-2222-3333-4444-555555555555')
    })

    it('⭐ hộp thoại xoá của thẻ cũng nhận org_id của ROUTE, và điều hướng về đúng URL đang mở', () => {
      deleteMutate.mockImplementation((_id: unknown, options?: { onSuccess?: () => void }) =>
        options?.onSuccess?.()
      )
      render(<ArtifactCard row={rowOf(artifact())} />)
      openMenu()
      fireEvent.click(screen.getByText(artifactEn.actions.delete))
      fireEvent.click(screen.getByText(artifactEn.detail.delete_confirm_action))

      expect(deleteArtifactOrg).toHaveBeenCalledWith('khanhqns-organization')
      expect(deleteArtifactOrg).not.toHaveBeenCalledWith('11111111-2222-3333-4444-555555555555')
      /**
       * Khoá **năng lực**, không khoá chuỗi: điều hướng phải mang `org_id` của ROUTE và phải rời
       * trang chi tiết. Đích cụ thể là danh sách gộp (`getArtifactBackPath`) — bản trước khoá
       * `/org/<id>/artifacts`, và chính cái đó đã chặn việc sửa một lỗi thật: `/artifacts` không
       * còn đường nào từ sidebar dẫn vào.
       */
      expect(routerPush).toHaveBeenCalledWith(getArtifactBackPath('khanhqns-organization'))
      expect(routerPush).toHaveBeenCalledWith(
        expect.stringContaining('/org/khanhqns-organization/')
      )
    })
  })
})

describe('ArtifactPreview', () => {
  it('iframe trỏ vào serve_url của server và KHÔNG có allow-same-origin', () => {
    const { container } = render(<ArtifactPreview artifact={artifact()} />)
    const iframe = container.querySelector('iframe')
    expect(iframe).not.toBeNull()
    expect(iframe?.getAttribute('src')).toBe('https://art.li2.ai/a/abcdef0123456789')

    const sandbox = iframe?.getAttribute('sandbox') ?? ''
    expect(sandbox).toContain('allow-scripts')
    expect(sandbox).not.toContain('allow-same-origin')
  })

  it('chưa live thì không nhúng iframe — route phục vụ trả 404', () => {
    const { container } = render(<ArtifactPreview artifact={artifact({ status: 'draft' })} />)
    expect(container.querySelector('iframe')).toBeNull()
    expect(screen.getByText(artifactEn.detail.preview_unavailable)).toBeDefined()
  })

  it('kèm dòng ghi trách nhiệm nội dung', () => {
    render(<ArtifactPreview artifact={artifact()} />)
    expect(screen.getByText(artifactEn.detail.responsibility)).toBeDefined()
  })

  /**
   * Đúng MỘT kind được sandbox, ba kind còn lại thì attribute đó chỉ sinh ra khung trắng
   * (spec §4.5): `pdf` — attribute thiếu `allow-same-origin` bật cùng cờ *sandboxed plugins* mà
   * CSP directive bật, nên trình xem PDF bị chặn, trong khi chẳng có document HTML nào để bảo vệ;
   * `slides`/`video` — trang trong iframe là landing của chính li2, origin mờ giết `frame-src`
   * của Office viewer lẫn `media-src 'self'` của video.
   *
   * So thẳng với `ARTIFACT_KIND_SPECS` chứ không chép lại bảng đúng/sai vào test: ai đổi cờ bên
   * core mà quên FE, hoặc ngược lại, đều đỏ ở đây.
   */
  it.each(['html', 'pdf', 'slides', 'video'] as const)(
    '%s: attribute sandbox bám đúng ARTIFACT_KIND_SPECS',
    (kind) => {
      const { container } = render(<ArtifactPreview artifact={artifact({ kind })} />)
      expect(container.querySelector('iframe')?.hasAttribute('sandbox')).toBe(
        ARTIFACT_KIND_SPECS[kind].sandboxed
      )
    }
  )

  /** Test trên so FE với hợp đồng; test này ghim chính hợp đồng, nếu không cả hai cùng trôi. */
  it('chỉ html được sandbox', () => {
    expect(ARTIFACT_KIND_SPECS.html.sandboxed).toBe(true)
    for (const kind of ['pdf', 'slides', 'video'] as const) {
      expect(ARTIFACT_KIND_SPECS[kind].sandboxed).toBe(false)
    }
  })

  /**
   * Không giấu làm fallback: iframe cross-document không báo được về cho ta là nó render được
   * hay không, nên "hỏng rồi mới hiện nút" là lời hứa không giữ được (spec §4.3 ràng buộc 5).
   */
  it.each(['html', 'pdf', 'slides', 'video'] as const)(
    '%s: nút Mở tab mới và Tải về hiện sẵn ngay từ đầu',
    (kind) => {
      render(<ArtifactPreview artifact={artifact({ kind })} />)
      expect(
        screen.getByText(artifactEn.actions.open_new_tab).closest('a')?.getAttribute('href')
      ).toBe('https://art.li2.ai/a/abcdef0123456789')
      expect(screen.getByText(artifactEn.actions.download).closest('a')?.getAttribute('href')).toBe(
        'https://art.li2.ai/a/abcdef0123456789/download'
      )
    }
  )

  it('slides: skeleton Office viewer hiện trước, tắt sau onLoad', () => {
    const { container } = render(<ArtifactPreview artifact={artifact({ kind: 'slides' })} />)
    expect(screen.getByText(artifactEn.detail.office_viewer_loading)).toBeDefined()

    fireEvent.load(container.querySelector('iframe') as HTMLIFrameElement)
    expect(screen.queryByText(artifactEn.detail.office_viewer_loading)).toBeNull()
  })

  it('slides: nói thẳng file đi qua Microsoft, ngay dưới khung xem trước', () => {
    render(<ArtifactPreview artifact={artifact({ kind: 'slides' })} />)
    expect(screen.getByText(artifactEn.detail.office_viewer_privacy)).toBeDefined()
  })

  it('pdf: chỉ pdf mới nhắc mở tab mới; html không cần vì nó render thẳng', () => {
    const { rerender } = render(<ArtifactPreview artifact={artifact({ kind: 'pdf' })} />)
    expect(screen.getByText(artifactEn.detail.preview.open_direct)).toBeDefined()

    rerender(<ArtifactPreview artifact={artifact({ kind: 'html' })} />)
    expect(screen.queryByText(artifactEn.detail.preview.open_direct)).toBeNull()
  })

  /**
   * `markdown` và `site` nằm trong CHECK constraint nhưng không có đường upload nào sinh ra —
   * một hàng như vậy (di sản, hay sửa tay trong DB) đọc `ARTIFACT_KIND_SPECS[kind]` ra
   * `undefined` và làm vỡ cả trang chi tiết nếu không có nhánh riêng.
   */
  it('kind ngoài tập upload được: không vỡ, hiện khối tải về', () => {
    // 'site' thay cho 'markdown' — markdown đã có đường upload và serve mode từ 2026-10-24,
    // nên nó không còn là ví dụ cho "kind không phục vụ được".
    const { container } = render(<ArtifactPreview artifact={artifact({ kind: 'site' })} />)
    expect(container.querySelector('iframe')).toBeNull()
    expect(screen.getByText(artifactEn.detail.preview.download_to_view)).toBeDefined()
    expect(screen.getByText(artifactEn.actions.download)).toBeDefined()
  })
})

describe('ArtifactPrimaryAction', () => {
  it('draft: nút Xuất bản bấm được và gọi đúng handler', () => {
    const onPublish = vi.fn()
    render(
      <ArtifactPrimaryAction
        status="draft"
        onPublish={onPublish}
        onReupload={vi.fn()}
        onReplace={vi.fn()}
      />
    )
    const button = screen.getByRole('button', { name: artifactEn.actions.publish })
    expect(button.hasAttribute('disabled')).toBe(false)
    fireEvent.click(button)
    expect(onPublish).toHaveBeenCalledTimes(1)
  })

  it('blocked: tải lên file khác chỉ là điều hướng nên vẫn bấm được', () => {
    const onReupload = vi.fn()
    render(
      <ArtifactPrimaryAction
        status="blocked"
        onPublish={vi.fn()}
        onReupload={onReupload}
        onReplace={vi.fn()}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: artifactEn.actions.reupload }))
    expect(onReupload).toHaveBeenCalledTimes(1)
  })

  it.each(['expired', 'quarantined'] as const)(
    '%s: chưa có endpoint nên nút khoá VÀ tự giải thích bằng chữ, không tooltip',
    (status) => {
      render(
        <ArtifactPrimaryAction
          status={status}
          onPublish={vi.fn()}
          onReupload={vi.fn()}
          onReplace={vi.fn()}
        />
      )
      const button = screen.getByRole('button')
      expect(button.hasAttribute('disabled')).toBe(true)

      const reasonId = button.getAttribute('aria-describedby')
      expect(reasonId).toBeTruthy()
      const reason = document.getElementById(reasonId as string)
      expect(reason?.textContent).toBe(artifactEn.actions.not_available_yet)
    }
  )

  /**
   * Wave 3: `live` có nút chính — Cập nhật nội dung. Ô này từng trống; đây là chỗ hộp thoại thay
   * file bước vào mà không đẩy nút nào khác đi.
   */
  it('live: nút Cập nhật nội dung bấm được và gọi onReplace', () => {
    const onReplace = vi.fn()
    render(
      <ArtifactPrimaryAction
        status="live"
        onPublish={vi.fn()}
        onReupload={vi.fn()}
        onReplace={onReplace}
      />
    )
    const button = screen.getByRole('button', { name: artifactEn.actions.update_content })
    expect(button.hasAttribute('disabled')).toBe(false)
    fireEvent.click(button)
    expect(onReplace).toHaveBeenCalledTimes(1)
  })

  it.each(['scanning', 'removed'] as const)('%s: không có nút chính nào', (status) => {
    const { container } = render(
      <ArtifactPrimaryAction
        status={status}
        onPublish={vi.fn()}
        onReupload={vi.fn()}
        onReplace={vi.fn()}
      />
    )
    expect(container.querySelector('button')).toBeNull()
  })
})

describe('ArtifactDeleteButton', () => {
  beforeEach(() => {
    deleteMutate.mockReset()
    routerPush.mockReset()
    toastSuccess.mockReset()
    toastError.mockReset()
  })

  const openDialog = () => {
    render(<ArtifactDeleteButton orgId="org-123" artifactId="artifact-1" />)
    fireEvent.click(screen.getByText(artifactEn.actions.delete))
  }

  /**
   * Xoá là xoá cứng và mã QR đã in không gọi về xin phép được. Hộp thoại phải nói **hệ quả bên
   * ngoài hệ thống**, không phải "bạn có chắc không" — nếu câu đó biến mất thì người dùng mất
   * đúng thông tin duy nhất giúp họ dừng lại đúng lúc.
   */
  it('hộp thoại nói rõ link và QR đã phát sẽ chết', () => {
    openDialog()
    expect(screen.getByText(artifactEn.detail.delete_confirm_title)).toBeDefined()
    expect(screen.getByText(artifactEn.detail.delete_confirm_description)).toBeDefined()
  })

  it('mở hộp thoại thôi thì chưa xoá gì — phải bấm xác nhận', () => {
    openDialog()
    expect(deleteMutate).not.toHaveBeenCalled()
  })

  it('bấm Huỷ thì đóng hộp thoại và KHÔNG gọi xoá', () => {
    openDialog()
    fireEvent.click(screen.getByText(commonEn.buttons.cancel))
    expect(deleteMutate).not.toHaveBeenCalled()
  })

  it('xác nhận thì gọi xoá đúng artifact', () => {
    openDialog()
    fireEvent.click(screen.getByText(artifactEn.detail.delete_confirm_action))
    expect(deleteMutate).toHaveBeenCalledWith('artifact-1', expect.anything())
  })

  it('xoá xong thì về danh sách, không ở lại trang chi tiết đã chết', () => {
    openDialog()
    fireEvent.click(screen.getByText(artifactEn.detail.delete_confirm_action))
    const [, handlers] = deleteMutate.mock.calls[0]
    handlers.onSuccess()

    expect(routerPush).toHaveBeenCalledWith(getArtifactBackPath('org-123'))
    expect(toastSuccess).toHaveBeenCalledWith(artifactEn.detail.deleted)
  })

  it('lỗi thì hiện câu của backend, không phải câu chung', () => {
    openDialog()
    fireEvent.click(screen.getByText(artifactEn.detail.delete_confirm_action))
    const [, handlers] = deleteMutate.mock.calls[0]
    handlers.onError({
      response: {
        status: 403,
        data: { i18nMessage: { key: 'common:messages.error.permission_error' } },
      },
    })

    expect(toastError).toHaveBeenCalledWith(commonEn.messages.error.permission_error)
    expect(routerPush).not.toHaveBeenCalled()
  })
})

/**
 * Mười trạng thái của hộp thoại thay file (spec R7c, intent S1–S10). S1/S5/S6/S7/S8 là client-side —
 * chưa gửi byte nào; bốn trạng thái còn lại là phản ứng với server. Mọi con số trong copy sinh từ
 * state (`{delta}`, `{free}`, `{live}/3`) — không chép số vào test, so với hằng của core.
 */
describe('ArtifactAccessBadge / thẻ danh sách (M2.3)', () => {
  it('Công khai → KHÔNG badge', () => {
    render(<ArtifactAccessBadge mode="public" />)
    expect(screen.queryByTestId('artifact-access-badge')).toBeNull()
  })

  it.each([
    ['private', 'Private'],
    ['password', 'Password'],
    ['google', 'Google sign-in'],
  ])('%s → badge xám có chữ %s', (mode, label) => {
    render(<ArtifactAccessBadge mode={mode} />)
    const badge = screen.getByTestId('artifact-access-badge')
    expect(badge.textContent).toContain(label)
    expect(badge.className).toContain('bg-slate-100')
    expect(badge.className).toContain('text-slate-500')
  })

  it('giá trị lạ → vẫn badge (đóng), in nguyên chuỗi DB', () => {
    render(<ArtifactAccessBadge mode="invite-only" />)
    expect(screen.getByTestId('artifact-access-badge').textContent).toContain('invite-only')
  })

  it('thẻ: artifact public không badge; artifact password có badge cạnh badge kind', () => {
    const { unmount } = render(<ArtifactCard row={rowOf(artifact())} />)
    expect(screen.queryByTestId('artifact-access-badge')).toBeNull()
    unmount()
    render(<ArtifactCard row={rowOf(artifact({ access_mode: 'password' }))} />)
    expect(screen.getByTestId('artifact-access-badge').textContent).toContain('Password')
  })
})

describe('ArtifactAccessFields (M2.1)', () => {
  const setup = (over: Partial<React.ComponentProps<typeof ArtifactAccessFields>> = {}) => {
    const onChange = vi.fn()
    const onPasswordChange = vi.fn()
    const utils = render(
      <ArtifactAccessFields
        value="public"
        onChange={onChange}
        password=""
        onPasswordChange={onPasswordChange}
        modes={['public', 'private', 'password']}
        orgName="FPT"
        {...over}
      />
    )
    return { ...utils, onChange, onPasswordChange }
  }

  it('bốn-trừ-một dòng radio, không dropdown: 3 chế độ pha 1, Google ẨN khi server không đưa', () => {
    setup()
    expect(screen.getAllByRole('radio')).toHaveLength(3)
    expect(screen.queryByText('Google sign-in')).toBeNull()
    expect(screen.getByText('Anyone with the link can view.')).toBeTruthy()
    expect(screen.queryByRole('combobox')).toBeNull()
  })

  it('Google hiện khi server đưa 4 chế độ, kèm câu "email is recorded"', () => {
    setup({ modes: ['public', 'private', 'password', 'google'], value: 'google' })
    expect(screen.getAllByRole('radio')).toHaveLength(4)
    expect(screen.getByText(/Their email is recorded/)).toBeTruthy()
    expect(screen.getByText(/show up under Customers/)).toBeTruthy()
  })

  it('bấm Riêng tư → onChange(private); câu về người ngoài {org} nêu tên tổ chức', () => {
    const { onChange } = setup()
    fireEvent.click(screen.getByRole('radio', { name: /Private/ }))
    expect(onChange).toHaveBeenCalledWith('private')
    setup({ value: 'private' })
    expect(screen.getByText(/People outside FPT/)).toBeTruthy()
  })

  it('Mật khẩu → ô type=password, con mắt, Tạo ngẫu nhiên, câu "một tuần" cho NGƯỜI TẠO', () => {
    const { onPasswordChange } = setup({ value: 'password' })
    const input = screen.getByPlaceholderText('At least 8 characters') as HTMLInputElement
    expect(input.type).toBe('password')
    expect(screen.getByText(/can view for a week/)).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Show password' }))
    expect((screen.getByPlaceholderText('At least 8 characters') as HTMLInputElement).type).toBe(
      'text'
    )

    fireEvent.click(screen.getByRole('button', { name: 'Generate' }))
    const generated = onPasswordChange.mock.calls[0][0] as string
    expect(generated).toMatch(/^[a-z0-9]{16}$/)
  })

  it('lỗi mật khẩu ngắn hiện DƯỚI ô, thay câu một tuần', () => {
    setup({
      value: 'password',
      password: 'abc',
      passwordError: 'The password needs at least 8 characters.',
    })
    expect(screen.getByText('The password needs at least 8 characters.')).toBeTruthy()
    expect(screen.queryByText(/can view for a week/)).toBeNull()
    expect(screen.getByPlaceholderText('At least 8 characters').getAttribute('aria-invalid')).toBe(
      'true'
    )
  })
})

describe('generateArtifactPassword', () => {
  it('16 ký tự [a-z0-9], hai lần khác nhau, không Math.random', () => {
    const spy = vi.spyOn(Math, 'random')
    const a = generateArtifactPassword()
    const b = generateArtifactPassword()
    expect(a).toMatch(/^[a-z0-9]{16}$/)
    expect(a).not.toBe(b)
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })
})

describe('ArtifactCreatedDialog + quyền xem (M2.1)', () => {
  it('public → không dòng chế độ, không mật khẩu', () => {
    render(<ArtifactCreatedDialog shortUrl="https://li2.ai/abc" onClose={vi.fn()} />)
    expect(screen.queryByTestId('created-access-mode')).toBeNull()
    expect(screen.queryByTestId('artifact-password-reveal')).toBeNull()
  })

  it('password → dòng chế độ + mật khẩu + Sao chép, LẦN DUY NHẤT', () => {
    render(
      <ArtifactCreatedDialog
        shortUrl="https://li2.ai/abc"
        accessMode="password"
        password="Abcdefgh1"
        onClose={vi.fn()}
      />
    )
    expect(screen.getByTestId('created-access-mode').textContent).toContain(
      'View permission: Password'
    )
    expect((screen.getByLabelText('Password') as HTMLInputElement).value).toBe('Abcdefgh1')
    expect(screen.getByRole('button', { name: 'Copy password' })).toBeTruthy()
  })

  it('private → dòng chế độ, không ô mật khẩu', () => {
    render(
      <ArtifactCreatedDialog shortUrl="https://li2.ai/abc" accessMode="private" onClose={vi.fn()} />
    )
    expect(screen.getByTestId('created-access-mode').textContent).toContain('Private')
    expect(screen.queryByTestId('artifact-password-reveal')).toBeNull()
  })
})
