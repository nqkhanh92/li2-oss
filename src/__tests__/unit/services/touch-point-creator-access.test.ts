import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * "Người tạo luôn xem/sửa được link của chính mình" — chốt chủ sản phẩm 2026-10-28.
 *
 * Vì sao quy tắc này tồn tại, bằng số đo trên **production**: 44 touch point nằm trong collection;
 * 38 có `tp.user_id = collection.user_id` (vốn đã có quyền), còn **6** là link của A nằm trong
 * collection của B. Giao diện Spaces vừa bị ẩn nên không còn chỗ cấp lại quyền collection — thiếu
 * quy tắc này thì 6 link **do chính A tạo** thành vô hình với A và không ai sửa được từ UI.
 *
 * Hai chiều đều phải khoá, và chiều thứ hai mới là chiều nguy hiểm:
 *   1. người tạo **được** thấy link của mình (thứ đang thêm);
 *   2. người **khác** KHÔNG vì thế mà thấy thêm gì (thứ dễ vỡ khi ai đó "dọn" lại điều kiện).
 */

const permMock = vi.hoisted(() => ({ getCollectionPermissions: vi.fn() }))
vi.mock('@/core/services/collection-permission.service', () => ({
  collectionPermissionService: permMock,
}))

const scopeMock = vi.hoisted(() => ({ getPermissionScopeOrThrow: vi.fn() }))
vi.mock('@/shared/lib/permission/permissions', async (orig) => {
  const actual = (await orig()) as Record<string, unknown>
  return { ...actual, getPermissionScopeOrThrow: scopeMock.getPermissionScopeOrThrow }
})

const { TouchPointService } = await import('@/core/services/touch-point.service')

const ME = '11111111-1111-4111-8111-111111111111'
const AI_KHAC = '22222222-2222-4222-8222-222222222222'
const COLLECTION_CUA_NGUOI_KHAC = '33333333-3333-4333-8333-333333333333'

const makeService = (touchPoint: Record<string, unknown> | null) =>
  new TouchPointService({
    getTouchPointById: vi.fn().mockResolvedValue(touchPoint),
    findByIds: vi.fn().mockResolvedValue(touchPoint ? [touchPoint] : []),
  } as any)

beforeEach(() => {
  vi.clearAllMocks()
  // Mặc định khắc nghiệt nhất: không có quyền gì trên collection của người khác.
  permMock.getCollectionPermissions.mockResolvedValue({
    canView: false,
    canEditContent: false,
    canDelete: false,
  })
  scopeMock.getPermissionScopeOrThrow.mockRejectedValue(new Error('không có quyền org'))
})

describe('canViewTouchPoint — người tạo', () => {
  it('⭐ THẤY link mình tạo dù nó nằm trong collection của người khác và mình không có quyền ở đó', async () => {
    const svc = makeService({
      id: 'tp-1',
      user_id: ME,
      collection_id: COLLECTION_CUA_NGUOI_KHAC,
    })

    expect(await svc.canViewTouchPoint('org-1', 'tp-1', ME)).toBe(true)
    // Không cần hỏi quyền collection nữa — vế người tạo đứng trước.
    expect(permMock.getCollectionPermissions).not.toHaveBeenCalled()
  })

  it('người KHÁC vẫn KHÔNG thấy link đó — quy tắc chỉ nới cho đúng người tạo', async () => {
    const svc = makeService({
      id: 'tp-1',
      user_id: AI_KHAC,
      collection_id: COLLECTION_CUA_NGUOI_KHAC,
    })

    expect(await svc.canViewTouchPoint('org-1', 'tp-1', ME)).toBe(false)
    expect(permMock.getCollectionPermissions).toHaveBeenCalled()
  })

  it('quyền collection vẫn có tác dụng cho người không phải người tạo', async () => {
    permMock.getCollectionPermissions.mockResolvedValue({ canView: true })
    const svc = makeService({
      id: 'tp-1',
      user_id: AI_KHAC,
      collection_id: COLLECTION_CUA_NGUOI_KHAC,
    })

    expect(await svc.canViewTouchPoint('org-1', 'tp-1', ME)).toBe(true)
  })
})

describe('canEditTouchPoint — người tạo', () => {
  it('⭐ SỬA được link mình tạo trong collection của người khác', async () => {
    const svc = makeService({ id: 'tp-1', user_id: ME, collection_id: COLLECTION_CUA_NGUOI_KHAC })

    expect(await svc.canEditTouchPoint('org-1', 'tp-1', ME)).toBe(true)
  })

  it('người khác KHÔNG sửa được', async () => {
    const svc = makeService({
      id: 'tp-1',
      user_id: AI_KHAC,
      collection_id: COLLECTION_CUA_NGUOI_KHAC,
    })

    expect(await svc.canEditTouchPoint('org-1', 'tp-1', ME)).toBe(false)
  })
})

describe('canDeleteTouchPoint — CỐ Ý không nới', () => {
  /**
   * Đề bài nói "xem/sửa". Xoá là thao tác không đảo ngược; nới nó mà không ai yêu cầu là tự thêm
   * một đường mất dữ liệu. Ca này khoá chính cái sự KHÔNG nới đó, để lần sau ai "làm cho nhất
   * quán" thì test đỏ chứ không lặng lẽ mở.
   */
  it('người tạo KHÔNG tự nhiên xoá được link trong collection mình không có quyền', async () => {
    const svc = makeService({ id: 'tp-1', user_id: ME, collection_id: COLLECTION_CUA_NGUOI_KHAC })

    expect(await svc.canDeleteTouchPoint('org-1', 'tp-1', ME)).toBe(false)
  })
})

describe('bộ lọc danh sách — vế người tạo trong câu .or()', () => {
  const callFilter = (userId: string | undefined, data: Record<string, unknown>) => {
    const svc: any = makeService(null)
    const captured: string[] = []
    const query: any = {
      or: (c: string) => {
        captured.push(c)
        return query
      },
      eq: () => query,
      in: () => query,
    }
    svc.applyCollectionPermissionFilter(query, data, userId, {})
    return captured.join(' | ')
  }

  it('⭐ có vế user_id.eq.<tôi> ĐỘC LẬP, không bị nhốt trong and(collection_id.is.null, …)', () => {
    const c = callFilter(ME, { accessibleCollectionIds: [], canAccessUncategorized: false })

    expect(c).toContain(`user_id.eq.${ME}`)
    // Bản cũ chỉ có user_id bên trong `and(collection_id.is.null,…)` — tức chỉ áp cho hàng không
    // thuộc collection nào. Đúng cái đã làm 6 hàng prod vô hình.
    expect(c).not.toBe(`and(collection_id.is.null,user_id.eq.${ME})`)
  })

  it('người không có quyền gì VẪN thấy hàng của chính mình, thay vì danh sách rỗng', () => {
    const c = callFilter(ME, { accessibleCollectionIds: [], canAccessUncategorized: false })

    expect(c).toBe(`user_id.eq.${ME}`)
  })

  it('vẫn giữ nguyên hai vế cũ khi có quyền', () => {
    const c = callFilter(ME, {
      accessibleCollectionIds: [COLLECTION_CUA_NGUOI_KHAC],
      canAccessUncategorized: true,
    })

    expect(c).toContain(`collection_id.in.(${COLLECTION_CUA_NGUOI_KHAC})`)
    expect(c).toContain('collection_id.is.null')
    expect(c).toContain(`user_id.eq.${ME}`)
  })

  /**
   * `userId` đi thẳng vào **ngữ pháp** của `.or()`, nơi dấu phẩy và ngoặc là ký tự cú pháp. Nó đến
   * từ JWT nên không phải dữ liệu tự do, nhưng phép kiểm nằm ngay chỗ nối thì không phụ thuộc vào
   * việc ai gọi hàm này về sau.
   */
  it('userId không phải UUID thì KHÔNG được nối vào câu lọc', () => {
    const c = callFilter('xx,collection_id.not.is.null', {
      accessibleCollectionIds: [],
      canAccessUncategorized: false,
    })

    expect(c).not.toContain('xx,collection_id')
  })

  it('không có userId thì câu lọc không đổi hình', () => {
    const c = callFilter(undefined, { accessibleCollectionIds: [], canAccessUncategorized: true })

    expect(c).toBe('collection_id.is.null')
  })
})
