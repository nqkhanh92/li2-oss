import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ShortLinkHeaderActions } from '@/features/short-links/components/short-link-list/short-link-header-actions'
import {
  parseCreateKind,
  CREATE_KINDS,
} from '@/features/short-links/components/unified-create/create-kind'

/**
 * Trang `/short-links` gộp LINK và ARTIFACT, nên từ đây phải tạo được CẢ HAI.
 *
 * Hồi quy 2026-10-27, loại không test nào bắt được lúc đó: mục `/artifacts` bị bỏ khỏi sidebar,
 * mà vùng thả file với nút tạo artifact đầy đủ lại nằm ở chính trang đó. Kết quả là một danh sách
 * đầy artifact mà không còn đường nào thêm một cái — 3249 test vẫn xanh, vì **không test nào hỏi
 * đúng câu**.
 *
 * ⚠ Bản trước của file này khoá *cách bày nút* ("phải là HAI nút khác nhau"). Chủ sản phẩm chốt
 * ngược lại: MỘT nút trung tính, chọn loại ở trình tạo. Nên test phải khoá **năng lực** — "từ
 * trang này tới được trình tạo, và trình tạo làm được cả hai loại" — chứ không khoá hình dạng.
 * Một test khoá hình dạng sẽ chặn đúng thay đổi mà sản phẩm cần.
 */

const push = vi.fn()

vi.mock('next/navigation', () => ({
  useParams: () => ({ org_id: 'org-1' }),
  useRouter: () => ({ push }),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      opts ? `${key}:${JSON.stringify(opts)}` : key,
  }),
}))

// Hai thứ này có đường gọi API riêng và không phải thứ đang kiểm.
vi.mock('@/features/touch-points/components/touch-point-list/import-export-action', () => ({
  ImportExportAction: () => <div data-testid="import-export" />,
}))
vi.mock('@/features/short-links/components/short-link-list/merged-quota-meta', () => ({
  MergedQuotaMeta: () => <div data-testid="quota" />,
}))

describe('Header trang gộp', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    render(<ShortLinkHeaderActions />)
  })

  it('có một nút dẫn tới trình tạo chung', () => {
    fireEvent.click(screen.getByTestId('merged-create-button'))

    expect(push).toHaveBeenCalledWith('/org/org-1/create')
  })

  /**
   * Đây là phần chặn hồi quy thật: nút không được dẫn thẳng vào một nhánh loại nào. Nếu nó trỏ
   * `/short-links/create` thì artifact lại mất lối vào y như lần trước.
   */
  it('nút KHÔNG dẫn thẳng vào trang tạo theo loại', () => {
    fireEvent.click(screen.getByTestId('merged-create-button'))

    const target = push.mock.calls[0]?.[0] as string
    expect(target).not.toContain('short-links/create')
    expect(target).not.toContain('artifacts/create')
  })

  it('chỉ còn MỘT nút tạo, không phải một nút cho mỗi loại', () => {
    expect(screen.getAllByTestId('merged-create-button')).toHaveLength(1)
  })
})

describe('parseCreateKind — trình tạo chung làm được cả hai loại', () => {
  it('đọc được cả hai loại từ URL', () => {
    expect(parseCreateKind('link')).toBe('link')
    expect(parseCreateKind('artifact')).toBe('artifact')
  })

  it('hai loại là hai giá trị khác nhau — công tắc không được luôn ra một nhánh', () => {
    expect(parseCreateKind('artifact')).not.toBe(parseCreateKind('link'))
    expect(new Set(CREATE_KINDS).size).toBe(2)
  })

  it('không phân biệt chữ hoa thường — URL là thứ người ta gõ tay', () => {
    expect(parseCreateKind('ARTIFACT')).toBe('artifact')
    expect(parseCreateKind('Artifact')).toBe('artifact')
  })

  it('thiếu hoặc gõ sai thì về link, KHÔNG làm trắng trang', () => {
    expect(parseCreateKind(undefined)).toBe('link')
    expect(parseCreateKind(null)).toBe('link')
    expect(parseCreateKind('')).toBe('link')
    expect(parseCreateKind('hologram')).toBe('link')
  })

  it('mảng (query param lặp) lấy giá trị đầu', () => {
    expect(parseCreateKind(['artifact', 'link'])).toBe('artifact')
  })
})
