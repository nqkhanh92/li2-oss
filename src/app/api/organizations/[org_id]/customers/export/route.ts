import { withAuth } from '@/shared/lib/middlewares/with-auth'
import { ensurePolicy } from '@/shared/lib/permission/permissions'
import { nonScopePolicies } from '@/shared/lib/permission/policy'
import { ROLE_PERMISSION_KEYS } from '@/shared/types/role-permission'
import { AudienceMember, contentAudienceService } from '@/core/services/content-audience.service'
import { logger } from '@/infrastructure/logging/logger'
import dayjs from 'dayjs'

const log = logger.child({ route: 'customers/export' })

const MAX_EXPORT_ROWS = 10000

/**
 * GET /api/organizations/:org_id/customers/export
 * Export customers to CSV file
 */
export const GET = withAuth<{ org_id: string }>(async (req, { params: { org_id }, context }) => {
  /**
   * Kiểm THÀNH VIÊN + QUYỀN, không chỉ có session. `withAuth` chỉ xác minh session tồn tại
   * (`with-auth.ts`), còn `org_id` thì lấy thẳng từ URL và `conversion.service` truy bằng
   * client service-role (bỏ qua RLS) — nên thiếu dòng này thì BẤT KỲ người dùng đã đăng nhập
   * nào cũng đọc được danh sách khách (tên, email, external id) của tổ chức khác, chỉ cần biết
   * `org_id`. Mà ai từng là thành viên thì đều biết: nó nằm trong mọi URL `/org/<uuid>/...`.
   * `VIEW_ANALYTICS` khớp đúng gate của mục Customers ở `menu-list.tsx`.
   */
  await ensurePolicy(org_id, nonScopePolicies[ROLE_PERMISSION_KEYS.VIEW_ANALYTICS])

  const startTime = Date.now()

  log.info({ orgId: org_id, userId: context.userId }, 'Customer export initiated')

  /**
   * CSV phải khớp BẢNG đang hiện, không phải một bộ cột khác.
   *
   * Trước đây route này đọc riêng `customer_profiles` và xuất Leads / Sales / Revenue (USD) —
   * nên sau khi bảng ẩn cột doanh thu, bấm "Xuất CSV" vẫn ra file đầy cột tiền và KHÔNG có hàng
   * thiết bị nào. Hai surface nói hai điều khác nhau về cùng một tập dữ liệu.
   *
   * Cột `phone` và nhóm `utm_*` cũng mất theo: cả hai đi qua `first_click_id`, cột rỗng ở mọi
   * hàng trên LiHi, nên chúng vốn luôn trống trong file xuất ra.
   *
   * ⚠ NỢ ĐÃ BIẾT — đọc trước khi bật lại conversion. Chủ sản phẩm chốt 2026-11-01: thông tin
   * thương mại **ẩn, không xoá**, và `stat-cards.tsx` làm đúng vậy — cả hai bộ thẻ ở lại, cờ
   * `disabledFeatures.CONVERSIONS` chọn bộ nào hiện. CSV thì KHÔNG theo được cách đó: ba cột
   * Leads / Sales / Revenue (USD) đi từ `customer_profiles`, mà `contentAudienceService` không
   * select chúng. Thêm lại cần sửa cả `content-audience.repository.ts`, service và type
   * `AudienceMember` — nên để nguyên thay vì làm nửa vời.
   *
   * Hệ quả cụ thể: ngày đổi `NEXT_PUBLIC_DISABLE_CONVERSIONS=false`, bốn thẻ thương mại trở lại
   * trên trang chi tiết nhưng **file CSV vẫn không có ba cột đó**. Nhớ sửa chỗ này cùng lúc.
   */
  const { data, count } = await contentAudienceService.listAudience(org_id, {
    pagination: { pageIndex: 0, pageSize: MAX_EXPORT_ROWS },
    sorting: [{ id: 'last_seen_at', desc: true }],
    filters: {},
  })

  if (count > MAX_EXPORT_ROWS) {
    log.warn(
      { orgId: org_id, total: count, exported: MAX_EXPORT_ROWS },
      'Export limited to max rows'
    )
  }

  const csvContent = transformToCSV(data)

  log.info(
    { orgId: org_id, rowCount: data.length, duration: Date.now() - startTime },
    'Customer export completed'
  )

  return new Response(csvContent, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="customers_${dayjs().format('YYYY-MM-DD')}.csv"`,
    },
  })
})

function transformToCSV(data: AudienceMember[]): string {
  const headers = [
    'Type',
    'Name',
    'Email',
    'External ID',
    'Fingerprint',
    'Content Viewed',
    'Total Opens',
    'Visits',
    'First Seen',
    'Last Seen',
    'Country',
    'Source Link',
  ]

  const rows = data.map((member) => [
    // "Device" chứ không phải "Person": `fp` đổi khi xoá cookie hay đổi máy.
    member.kind === 'device' ? 'Device' : 'Identified',
    member.display_name,
    member.email || '',
    member.external_id || '',
    member.fp || '',
    member.content_count,
    member.open_count,
    member.visit_count,
    member.first_seen_at ? dayjs(member.first_seen_at).format('YYYY-MM-DD HH:mm') : '',
    member.last_seen_at ? dayjs(member.last_seen_at).format('YYYY-MM-DD HH:mm') : '',
    member.country || '',
    member.touch_points?.short_url || member.touch_points?.name || '',
  ])

  const escape = (v: any) => {
    const str = String(v ?? '')
    return str.includes(',') || str.includes('"') || str.includes('\n')
      ? `"${str.replace(/"/g, '""')}"`
      : str
  }

  return [headers.join(','), ...rows.map((row) => row.map(escape).join(','))].join('\n')
}
