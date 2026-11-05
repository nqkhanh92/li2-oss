import { describe, it, expect } from 'vitest'
import { getArtifactBackPath } from '@/features/artifacts/utils/list-path'

/**
 * Nút Back của trang artifact. Thứ cần khoá không phải chuỗi, mà là: nó **không** trả người dùng
 * về `/artifacts`.
 *
 * Từ 2026-10-26 sidebar chỉ còn một mục "Link & Artifact" dẫn tới danh sách gộp, nên `/artifacts`
 * vẫn chạy mà **không còn đường nào dẫn vào** — Back về đó là bỏ người dùng ở một trang mồ côi.
 */
describe('getArtifactBackPath', () => {
  it('về danh sách GỘP, không về trang artifact riêng', () => {
    const path = getArtifactBackPath('org-1')

    expect(path).toBe('/org/org-1/short-links')
    expect(path).not.toContain('/artifacts')
  })

  it('mang org vào đường dẫn — Back không được nhảy sang org khác', () => {
    expect(getArtifactBackPath('abc-123')).toContain('abc-123')
  })
})
