import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve, join } from 'node:path'

import { hasPermission } from '@/shared/lib/permission/check-permission'
import { nonScopePolicies, policies } from '@/shared/lib/permission/policy'
import {
  noScopePermissionKeys,
  ROLE_PERMISSION_KEYS,
  RolePermissionScope,
  type RolePermission,
} from '@/shared/types/role-permission'

/**
 * Hồi quy 2026-10-26: bản vá phân quyền của tôi gate ~30 route bằng
 * `getPermissionScopeOrThrow(org_id, VIEW_ANALYTICS)` → **403 cho MỌI người, kể cả Owner.**
 *
 * Nguyên nhân: `getPermissionScopeOrThrow` (`permissions.ts:75-76`) ném khi
 * `!permission.scope` — nó đòi một **giá trị scope** để trả về cho caller lọc dữ liệu. Nhưng
 * `VIEW_ANALYTICS` nằm trong `noScopePermissionKeys`, tức **cố ý không có scope**: role Owner mang
 * `{ permission_key: 'view_analytics', scope: null }`. Frontend `hasPermission` chỉ cần CÓ KHOÁ nên
 * menu hiện; backend đòi scope nên chặn → lệch, người dùng thấy "Bạn không có quyền".
 *
 * Quy tắc rút ra, và đây là thứ test này canh:
 * - quyền **trong** `noScopePermissionKeys` → `ensurePolicy(org, nonScopePolicies[key])`
 * - quyền **ngoài** danh sách đó, VÀ caller thật sự dùng giá trị scope để lọc →
 *   `getPermissionScopeOrThrow`
 *
 * Vì sao test cũ của tôi không bắt được: nó chỉ kiểm "có gọi gate hay không", **không mô phỏng một
 * bộ permissions kiểu Owner với `scope: null`**. Đúng lớp lỗi tôi đã chỉ ra ở code người khác bốn
 * lần trong đợt này — test khẳng định đúng cái hành vi sai.
 */

const OWNER_LIKE: RolePermission[] = [
  // Y như hàng thật của role Owner (id 11111111-…): có khoá, scope NULL.
  { permission_key: ROLE_PERMISSION_KEYS.VIEW_ANALYTICS, scope: null as never },
]

describe('quyền scope-null: Owner phải qua được', () => {
  it('`nonScopePolicies` cho Owner (scope null) ĐI QUA', () => {
    expect(nonScopePolicies[ROLE_PERMISSION_KEYS.VIEW_ANALYTICS].evaluate({ permissions: OWNER_LIKE })).toBe(
      true
    )
  })

  it('vẫn CHẶN khi thiếu khoá — gate không thành vô nghĩa', () => {
    const other: RolePermission[] = [
      { permission_key: ROLE_PERMISSION_KEYS.VIEW_TOUCH_POINTS, scope: RolePermissionScope.ALL },
    ]
    expect(nonScopePolicies[ROLE_PERMISSION_KEYS.VIEW_ANALYTICS].evaluate({ permissions: other })).toBe(
      false
    )
  })

  it('vẫn CHẶN khi không có permissions nào (người ngoài tổ chức)', () => {
    // `evaluatePolicy` gọi `getUserOrgPermissions(org_id)`; không phải thành viên → undefined →
    // `evaluate` nhận mảng rỗng/thiếu → false → `ensurePolicy` ném. Đây là tính chất chặn
    // xuyên-tổ-chức, thứ KHÔNG được mất khi sửa hồi quy này.
    const policy = nonScopePolicies[ROLE_PERMISSION_KEYS.VIEW_ANALYTICS]
    expect(policy.evaluate({ permissions: [] })).toBe(false)
    expect(policy.evaluate(undefined)).toBe(false)
  })

  it('`hasPermission` không đòi scope khi khoá là scope-null — lý do frontend hiện menu', () => {
    expect(hasPermission(OWNER_LIKE, ROLE_PERMISSION_KEYS.VIEW_ANALYTICS)).toBe(true)
    // Ngay cả khi caller đòi ALL, khoá scope-null vẫn qua (check-permission.ts short-circuit).
    expect(
      hasPermission(OWNER_LIKE, ROLE_PERMISSION_KEYS.VIEW_ANALYTICS, RolePermissionScope.ALL)
    ).toBe(true)
  })

  it('quyền CÓ scope thì vẫn phân biệt scope — bản sửa không nới lỏng nhóm đó', () => {
    const own: RolePermission[] = [
      { permission_key: ROLE_PERMISSION_KEYS.VIEW_TOUCH_POINTS, scope: RolePermissionScope.OWN },
    ]
    expect(
      policies[ROLE_PERMISSION_KEYS.VIEW_TOUCH_POINTS][RolePermissionScope.ALL].evaluate({
        permissions: own,
      })
    ).toBe(false)
  })
})

/**
 * Bất biến tĩnh: chặn cả LỚP lỗi, không chỉ ca đã nổ.
 *
 * Giới hạn, nói rõ: 19 chỗ **có sẵn từ trước** (funnels, collections, utm-templates, và vài service)
 * cũng dùng `getPermissionScopeOrThrow` với khoá scope-null. Chúng đang chạy được vì DB seed cho
 * những role đang dùng có `scope` khác null — tức **may**, không phải đúng. Đợt này cố ý KHÔNG sửa
 * (ngoài phạm vi hồi quy), nên allowlist dưới đây giữ nguyên trạng và là danh sách nợ.
 */
const ROUTES_DIR = 'src/app/api/organizations/[org_id]'
const repoRoot = resolve(__dirname, '../../../..')
const read = (p: string) => readFileSync(resolve(repoRoot, p), 'utf8')

/** Có sẵn từ trước bản vá 2026-10-26. Nợ, không phải chấp nhận. */
const KNOWN_DEBT = ['utm-templates/route.ts']

const walk = (dir: string): string[] => {
  const out: string[] = []
  for (const name of readdirSync(resolve(repoRoot, dir))) {
    const rel = join(dir, name)
    if (statSync(resolve(repoRoot, rel)).isDirectory()) out.push(...walk(rel))
    else if (name === 'route.ts') out.push(rel)
  }
  return out
}

const CALL = /getPermissionScopeOrThrow\(\s*[\w.]+\s*,\s*ROLE_PERMISSION_KEYS\.([A-Z_]+)/g

/**
 * Regex bắt **TÊN HẰNG** (`VIEW_ANALYTICS`), còn `noScopePermissionKeys` chứa **GIÁ TRỊ**
 * (`'view_analytics'`). Phải quy đổi qua `ROLE_PERMISSION_KEYS[name]` — bản đầu của test này so
 * trực tiếp tên với giá trị nên `includes` luôn false và test **xanh trong lúc lỗi đang sống**.
 * Chỉ lộ ra nhờ kiểm ngược có xác nhận mutation đã vào file.
 */
const keyValueOf = (constName: string): string | undefined =>
  (ROLE_PERMISSION_KEYS as Record<string, string>)[constName]

describe('không route nào dùng getPermissionScopeOrThrow với quyền scope-null', () => {
  it('danh sách noScopePermissionKeys đọc được (bắt việc quét hỏng)', () => {
    expect(noScopePermissionKeys.length).toBeGreaterThan(20)
    expect(noScopePermissionKeys).toContain(ROLE_PERMISSION_KEYS.VIEW_ANALYTICS)
  })

  it('mọi route (trừ nợ cũ) dùng đúng loại gate cho loại quyền', () => {
    const offenders: string[] = []
    for (const route of walk(ROUTES_DIR)) {
      const rel = route.slice(ROUTES_DIR.length + 1)
      if (KNOWN_DEBT.includes(rel)) continue
      for (const [, constName] of read(route).matchAll(CALL)) {
        const value = keyValueOf(constName)
        expect(value, `ROLE_PERMISSION_KEYS.${constName} không tồn tại — regex hay hằng đã đổi?`)
          .toBeDefined()
        if ((noScopePermissionKeys as string[]).includes(value!))
          offenders.push(`${rel} → ${constName}`)
      }
    }

    expect(
      offenders,
      `${offenders.length} chỗ đòi scope cho quyền KHÔNG có scope → 403 cho mọi người, kể cả ` +
        `Owner:\n  ${offenders.join('\n  ')}\n\n` +
        'Đổi sang `ensurePolicy(org_id, nonScopePolicies[ROLE_PERMISSION_KEYS.<KEY>])`. ' +
        'Chỉ dùng `getPermissionScopeOrThrow` khi caller THẬT SỰ dùng giá trị scope để lọc dữ liệu.'
    ).toEqual([])
  })

  it('mục nợ cũ vẫn tồn tại — hết thì phải xoá khỏi danh sách', () => {
    const live = new Set(walk(ROUTES_DIR).map((r) => r.slice(ROUTES_DIR.length + 1)))
    for (const d of KNOWN_DEBT) expect(live.has(d), `KNOWN_DEBT còn mục đã biến mất: ${d}`).toBe(true)
  })
})
