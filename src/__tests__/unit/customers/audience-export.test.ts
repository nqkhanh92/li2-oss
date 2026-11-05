import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * CSV và bảng phải nói CÙNG một thứ.
 *
 * Nút "Xuất CSV" nằm ngay trên bảng, nên nếu bảng ẩn doanh thu mà file xuất ra vẫn có
 * `Leads / Sales / Revenue (USD)` — và không có hàng thiết bị nào — thì người dùng kết luận rằng
 * bảng đang che dữ liệu của họ. Đó là cách một "ẩn cột" biến thành mất niềm tin.
 *
 * Đọc source thay vì gọi route: route thật đòi session + `ensurePolicy` + Supabase, mà điều cần
 * chốt ở đây chỉ là bộ cột và nguồn dữ liệu. Cùng lối với `customers-gate.test.ts`.
 */

const repoRoot = resolve(__dirname, '../../../..')
const source = readFileSync(
  resolve(repoRoot, 'src/app/api/organizations/[org_id]/customers/export/route.ts'),
  'utf8'
)

describe('Xuất CSV khán giả', () => {
  it('không còn cột nào về tiền', () => {
    for (const header of ["'Revenue (USD)'", "'Leads'", "'Sales'"]) {
      expect(source, `${header} vẫn còn trong CSV dù bảng đã ẩn doanh thu`).not.toContain(header)
    }
  })

  it('có cột nội dung đã xem và lần thấy gần nhất', () => {
    expect(source).toContain("'Content Viewed'")
    expect(source).toContain("'Total Opens'")
    expect(source).toContain("'Last Seen'")
  })

  it('xuất cả thiết bị ẩn danh, và gọi chúng là "Device"', () => {
    // Một file CSV chỉ có người có email là một câu trả lời khác với bảng đang hiện.
    expect(source).toContain("'Device'")
    expect(source).toContain("'Fingerprint'")
  })

  it('lấy dữ liệu từ cùng service với bảng', () => {
    expect(source).toContain('contentAudienceService.listAudience')
    expect(source, 'đọc riêng customer_profiles là nguồn gây lệch giữa hai surface').not.toContain(
      'findAllCustomersForExport'
    )
  })
})
