import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve, join } from 'node:path'

/**
 * Hai bất biến của mục Customers, cả hai đều từng sai và không cái nào tự lộ ra.
 *
 * **1. Menu và route guard phải đọc CÙNG một cờ.**
 * Trước 2026-10-26, menu gate bằng `!ATTRIBUTION && !CUSTOMERS` còn `customers/page.tsx` redirect
 * theo `ATTRIBUTION`. Chủ sản phẩm muốn "chỉ hiện Customers", và cách rẻ nhất tưởng như là hạ
 * `NEXT_PUBLIC_DISABLE_ATTRIBUTION=false` — nhưng cờ đó còn được đọc ở 15 file, gồm trang Overview
 * (`overview.tsx:26` LINKS_ONLY) và tầng dữ liệu (`analytic.service.ts:540` xoá `VISITOR_FIELDS`
 * khỏi raw visits). Hạ nó để hiện một mục menu là đổi nhiều thứ không ai yêu cầu.
 * Cách đúng: `CUSTOMERS` là công tắc duy nhất, ở CẢ menu và CẢ hai route guard. Sửa một nửa thì
 * menu hiện mà bấm vào bị đẩy về `/org/<id>` — đúng lớp lỗi deep-link đã sửa ở `724d3d61`.
 *
 * **2. Mọi route API customers phải kiểm THÀNH VIÊN + QUYỀN.**
 * `withAuth` chỉ xác minh session tồn tại (`with-auth.ts`: `getSession` → `UnauthorizedError`).
 * Nó KHÔNG kiểm người gọi có thuộc `org_id` hay không, mà `org_id` lấy thẳng từ URL và
 * `conversion.service.findAllCustomers` truy bằng client service-role nên bỏ qua RLS. Thiếu gate
 * thì bất kỳ người dùng đã đăng nhập nào cũng đọc được email khách của tổ chức khác — chỉ cần biết
 * `org_id`, mà ai TỪNG là thành viên thì đều biết vì nó nằm trong mọi URL `/org/<uuid>/...`.
 *
 * ⚠ Gate đúng là `ensurePolicy(org_id, nonScopePolicies[VIEW_ANALYTICS])`, KHÔNG phải
 * `getPermissionScopeOrThrow` — xem chú thích tại chỗ ở test thứ hai bên dưới.
 *
 * Đọc nguồn thay vì render/gọi route: chứng minh "không có kiểm quyền" bằng cách gọi thật thì phải
 * dựng hai tài khoản ở hai org và đọc dữ liệu của org không thuộc mình — tức tự thực hiện đúng cái
 * rò rỉ đang muốn chặn.
 */

const repoRoot = resolve(__dirname, '../../../..')
const read = (p: string) => readFileSync(resolve(repoRoot, p), 'utf8')

const MENU = 'src/shared/constants/menu-list.tsx'
const PAGES = [
  'src/app/(protected)/org/[org_id]/customers/page.tsx',
  'src/app/(protected)/org/[org_id]/customers/[customer_id]/page.tsx',
  'src/app/(protected)/org/[org_id]/customers/device/[fp]/page.tsx',
]
const API_DIR = 'src/app/api/organizations/[org_id]/customers'

/** Khối cấu hình của một mục menu, cắt từ `href` tới dấu `},` của chính nó. */
const menuEntry = (href: string) => {
  const source = read(MENU)
  const start = source.indexOf(href)
  expect(start, `không tìm thấy mục menu ${href}`).toBeGreaterThan(-1)
  return source.slice(start, source.indexOf('\n        },', start))
}

const routeFiles = (dir: string): string[] => {
  const out: string[] = []
  for (const name of readdirSync(resolve(repoRoot, dir))) {
    const rel = join(dir, name)
    if (statSync(resolve(repoRoot, rel)).isDirectory()) out.push(...routeFiles(rel))
    else if (name === 'route.ts') out.push(rel)
  }
  return out
}

describe('Customers — menu và route guard đọc cùng một cờ', () => {
  it('mục menu gate bằng CUSTOMERS, KHÔNG bằng ATTRIBUTION', () => {
    const entry = menuEntry('/customers`')
    expect(entry).toContain('disabledFeatures.CUSTOMERS')
    expect(
      entry,
      'ATTRIBUTION còn gate Overview và tầng dữ liệu analytics — đừng dùng nó cho một mục menu'
    ).not.toContain('disabledFeatures.ATTRIBUTION')
  })

  it('mọi trang customers redirect theo CUSTOMERS, không theo ATTRIBUTION', () => {
    for (const page of PAGES) {
      const source = read(page)
      expect(source, `${page} phải đọc cờ CUSTOMERS`).toContain('disabledFeatures.CUSTOMERS')
      expect(
        source,
        `${page} còn đọc ATTRIBUTION — menu và guard lệch cờ thì menu hiện mà bấm vào bị redirect`
      ).not.toContain('disabledFeatures.ATTRIBUTION')
    }
  })

  it('Conversions thì VẪN giữ ATTRIBUTION — bản sửa này không được lan sang nó', () => {
    // Chủ sản phẩm chỉ yêu cầu hiện Customers. Conversions phải ẩn y như trước.
    const entry = menuEntry('/conversions`')
    expect(entry).toContain('disabledFeatures.ATTRIBUTION')
  })
})

describe('Customers — API kiểm thành viên và quyền', () => {
  const files = routeFiles(API_DIR)

  it('tìm được đủ 9 route — số này đổi thì có route mới chưa được soi', () => {
    // 7 route cũ + 2 của vòng "ai đã xem nội dung của tôi" (2026-11-01):
    // `customers/[customer_id]/content-views` và `customers/devices/[fp]`.
    expect(files.length).toBe(9)
  })

  it('mọi route đều kiểm thành viên bằng nonScopePolicies[VIEW_ANALYTICS]', () => {
    /**
     * `ensurePolicy(org_id, nonScopePolicies[VIEW_ANALYTICS])`, KHÔNG phải
     * `getPermissionScopeOrThrow`. Sửa 2026-10-26 sau hồi quy: `VIEW_ANALYTICS` nằm trong
     * `noScopePermissionKeys` (role Owner mang `scope: null`), mà `getPermissionScopeOrThrow` ném
     * khi `!permission.scope` — nên bản đầu trả **403 cho mọi người, kể cả Owner**.
     * Hai tính chất cần giữ, và `ensurePolicy` giữ cả hai: chặn người ngoài tổ chức
     * (`getUserOrgPermissions` trả undefined), và đòi CÓ quyền. Lý do đầy đủ:
     * `src/__tests__/unit/permission/no-scope-permission-gate.test.ts`.
     */
    const missing = files.filter((f) => {
      const s = read(f)
      return !/await ensurePolicy\(\s*[\w.]+,\s*nonScopePolicies\[ROLE_PERMISSION_KEYS\.VIEW_ANALYTICS\]\s*\)/.test(
        s
      )
    })

    expect(
      missing,
      `thiếu kiểm thành viên ở:\n  ${missing.join('\n  ')}\n` +
        '`withAuth` CHỈ kiểm có session, không kiểm thành viên org. Thiếu dòng này là rò rỉ ' +
        'dữ liệu khách xuyên tổ chức.'
    ).toEqual([])
  })

  it('không route nào chỉ dựa vào withAuth', () => {
    for (const f of files) {
      const s = read(f)
      expect(s, `${f} dùng withAuth mà không import kiểm quyền`).toContain('ensurePolicy')
    }
  })
})
