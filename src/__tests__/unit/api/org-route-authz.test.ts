import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { resolve, join, basename } from 'node:path'

/**
 * Bất biến: **mọi route dưới `api/organizations/[org_id]/**` phải kiểm THÀNH VIÊN**, hoặc ở chính
 * route hoặc ở service nó gọi — trừ một danh sách trắng ngắn, có lý do, bên dưới.
 *
 * Vì sao cần: `withAuth` CHỈ xác minh session tồn tại (`with-auth.ts`: `getSession` → nếu không có
 * thì `UnauthorizedError`). Nó **không** kiểm người gọi thuộc org nào. Mà `org_id` lấy thẳng từ URL
 * và các service truy bằng client **service-role** nên **bỏ qua RLS**. Nên một route chỉ có
 * `withAuth` là mở dữ liệu của MỌI tổ chức cho MỌI người đã đăng nhập, chỉ cần biết `org_id` — mà
 * ai từng là thành viên thì đều biết, vì nó nằm trong mọi URL `/org/<uuid>/...`.
 *
 * Và `src/middleware.ts` **loại trừ `api`** khỏi matcher, nên không có lớp nào đỡ phía trước.
 *
 * Audit 2026-10-26 (`docs/audit-route-quyen-2026-10-26.md`) tìm ra 31 route hở và đã vá. Test này
 * tồn tại để con số đó không âm thầm tăng lại: thêm một route mới mà quên gate thì nó đỏ.
 *
 * ## Cách đọc, và giới hạn của nó
 *
 * Test quét NGUỒN, hai tầng: route, rồi các method của service mà route gọi. Nó **không** đi sâu
 * hơn hai tầng, nên một route gate ở tầng thứ ba sẽ bị báo oan — khi đó hãy xác minh bằng tay rồi
 * thêm vào `ALLOWLIST` kèm lý do, đừng nới lỏng phép dò.
 */

const repoRoot = resolve(__dirname, '../../../..')
const ROUTES_DIR = 'src/app/api/organizations/[org_id]'
/**
 * Hai thư mục service, không một.
 *
 * ⚠ `src/ee/core/services` thêm 2026-11-04 khi tách bản OSS. Bài học của PR đầu tiên: chuyển
 * `deep-link-analytics.service.ts` sang `ee/` làm tầng hai của phép quét **mù** — test không
 * tìm thấy file nên báo hai route "thiếu kiểm thành viên" dù chúng không đổi một dòng nào.
 *
 * Nghĩa là: **mỗi lần chuyển một service sang `ee/`, phép dò này phải theo.** Nếu không, một
 * route thật sự hở sẽ im lặng lọt qua — audit mù còn tệ hơn không có audit, vì nó vẫn báo xanh.
 */
const SERVICES_DIRS = ['src/core/services', 'src/ee/core/services']

/** Mọi helper thực sự truy `org_members` để kiểm thành viên/quyền. */
const GATES = [
  'getPermissionScopeOrThrow',
  'getUserOrgPermissions',
  'ensureOrgMember',
  'ensureOrgPlan',
  'ensurePolicy',
  'ensureAnyPolicy',
  'ensureDeletePolicy',
  // ACL theo từng đối tượng — mạnh hơn kiểm thành viên, không yếu hơn
  'ensureViewer',
  'ensureEditor',
  'ensureOwner',
  'ensureCanView',
  'ensureCanEdit',
  'ensureCanDelete',
  'ensureCanManageMembers',
  'ensureCanViewTouchPoint',
  'ensureCanEditTouchPoint',
  'ensureCanDeleteTouchPoint',
  'ensureCanAddTouchPointsToCollection',
]

/**
 * Route cố tình KHÔNG kiểm thành viên. Mỗi dòng đã xác minh bằng tay — đừng thêm vào đây để làm
 * test xanh, thêm vào đây chỉ khi đọc code và chắc chắn route đó an toàn.
 */
const ALLOWLIST: Record<string, string> = {
  // Tự phục vụ: `leaveCollection` kiểm `isMember(collectionId, session.sub)`, nên chỉ rời được
  // collection của chính mình.
  'collections/[collection_id]/leave/route.ts': 'tự phục vụ, scope theo session.sub',
  // Tự phục vụ: `leaveOrganization` lấy userId từ `requestContext` rồi `deleteByUserId(orgId,
  // userId)` — không nhận userId từ client.
  'members/leave/route.ts': 'tự phục vụ, userId từ requestContext',
  // `checkSlugExists(slug)` KHÔNG dùng `org_id`. Đây là phép kiểm tồn tại slug toàn cục, đã nằm
  // sau `withAuth`. Gate theo thành viên không thêm gì vì nó không đọc dữ liệu của org nào.
  'slugs/check/route.ts': 'không dùng org_id, kiểm tồn tại toàn cục',
  // Như trên: `org_id` chỉ có trong chữ ký, thân hàm không dùng.
  'subdomains/check-availability/route.ts': 'không dùng org_id',
}

const read = (p: string) => readFileSync(resolve(repoRoot, p), 'utf8')

const walk = (dir: string): string[] => {
  const out: string[] = []
  for (const name of readdirSync(resolve(repoRoot, dir))) {
    const rel = join(dir, name)
    if (statSync(resolve(repoRoot, rel)).isDirectory()) out.push(...walk(rel))
    else if (name === 'route.ts') out.push(rel)
  }
  return out
}

/** Khai báo method của class, nhận cả `public async` / `private` / `static`. */
const METHOD_DEF = /\n {2}(?:public |private |protected |static )*(?:async )?([a-zA-Z_][\w]*)\s*\(/g

const gatedMethodsOf = (servicePath: string): Set<string> => {
  const source = read(servicePath)
  const names = new Set<string>()
  const defs = [...source.matchAll(METHOD_DEF)]
  defs.forEach((def, i) => {
    const start = def.index! + def[0].length
    const end = i + 1 < defs.length ? defs[i + 1].index! : source.length
    const body = source.slice(start, end)
    if (callsGate(body)) names.add(def[1])
  })
  return names
}

const serviceCache = new Map<string, Set<string>>()

/** `conversionService` → `conversion.service.ts`; `orgAuditLogService` → `org-audit-log.service.ts` */
const gatedMethodsForObject = (objectName: string): Set<string> => {
  const base = objectName.replace(/[Ss]ervice$/, '')
  const kebab = base.replace(/(?<!^)(?=[A-Z])/g, '-').toLowerCase()
  const candidates = SERVICES_DIRS.flatMap((dir) => [
    `${dir}/${kebab}.service.ts`,
    `${dir}/${base.toLowerCase()}.service.ts`,
  ])
  for (const candidate of candidates) {
    if (!existsSync(resolve(repoRoot, candidate))) continue
    if (!serviceCache.has(candidate)) serviceCache.set(candidate, gatedMethodsOf(candidate))
    return serviceCache.get(candidate)!
  }
  return new Set()
}

/**
 * Phải là LỜI GỌI, không phải chỉ cái tên.
 *
 * Phát hiện khi kiểm ngược: gỡ `await getPermissionScopeOrThrow(...)` mà để lại dòng `import` thì
 * một phép dò bằng `includes(tên)` vẫn cho qua — tức test xanh trong lúc route đã hở. Đòi có `(`
 * theo sau loại được dòng import, vì ở đó cái tên đứng trong `{ … }`.
 */
const callsGate = (source: string) =>
  GATES.some((g) => new RegExp(`\\b${g}\\s*\\(`).test(source))

const isGated = (routePath: string): boolean => {
  const source = read(routePath)
  if (callsGate(source)) return true
  const calls = [...source.matchAll(/\b([a-zA-Z]+[Ss]ervice)\.([a-zA-Z_]\w*)\s*\(/g)]
  return calls.some(([, obj, method]) => gatedMethodsForObject(obj).has(method))
}

const routes = walk(ROUTES_DIR)
const rel = (p: string) => p.slice(ROUTES_DIR.length + 1)

describe('api/organizations/[org_id] — mọi route phải kiểm thành viên', () => {
  it('quét được một lượng route hợp lý (bắt việc quét hỏng, không phải bắt code)', () => {
    // Nếu con số này rơi về 0 thì phép quét gãy và mọi assert dưới thành vô nghĩa.
    expect(routes.length).toBeGreaterThan(150)
  })

  it('không có route nào ngoài danh sách trắng mà thiếu kiểm thành viên', () => {
    const ungated = routes.map(rel).filter((r) => !(r in ALLOWLIST) && !isGated(join(ROUTES_DIR, r)))

    expect(
      ungated,
      `${ungated.length} route thiếu kiểm thành viên:\n  ${ungated.join('\n  ')}\n\n` +
        '`withAuth` CHỈ kiểm có session, KHÔNG kiểm người gọi thuộc org nào, và middleware loại ' +
        'trừ `api`. Thêm `getPermissionScopeOrThrow(org_id, <VIEW_*>)` hoặc `ensurePolicy(...)`. ' +
        'Nếu route thật sự an toàn thì thêm vào ALLOWLIST kèm lý do đã kiểm bằng tay.'
    ).toEqual([])
  })

  it('mọi mục trong danh sách trắng đều còn tồn tại', () => {
    // Danh sách trắng mục ruỗng là cách nó âm thầm che một route mới trùng tên.
    const live = new Set(routes.map(rel))
    for (const entry of Object.keys(ALLOWLIST))
      expect(live.has(entry), `ALLOWLIST còn mục đã biến mất: ${entry}`).toBe(true)
  })

  it('route `integrations/verify` phải có withAuth VÀ policy — nó từng là SSRF không xác thực', () => {
    const source = read(join(ROUTES_DIR, 'integrations/verify/route.ts'))
    expect(source, 'thiếu withAuth → mở cho cả Internet vì middleware loại trừ api').toContain(
      'withAuth'
    )
    expect(source).toContain('ensurePolicy')
    // `satisfies` chỉ là TypeScript, bị xoá lúc chạy — phải validate thật.
    expect(source, 'phải parse bằng zod lúc chạy, không dùng `satisfies`').toContain(
      'createIntegrationSchema.parse'
    )
    /**
     * Lọc comment TRƯỚC khi dò: chú thích trong chính route đó viết lại chuỗi `body satisfies` để
     * giải thích lỗi cũ, và một phép dò ngây thơ sẽ coi lời giải thích là lỗi. Cùng bẫy đã gặp ở
     * `next-image-hosts.test.ts` với `hostname: '**'`.
     */
    const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
    expect(code).not.toMatch(/body satisfies/)
  })
})

describe('middleware không đỡ cho /api — nên từng route phải tự gate', () => {
  it('matcher vẫn loại trừ `api`', () => {
    // Nếu một ngày middleware bắt cả /api thì lập luận của cả test trên đổi, và phải đọc lại.
    expect(read('src/middleware.ts')).toMatch(/\(\?!.*\bapi\b.*\)/)
  })
})

describe('withAuth đúng là KHÔNG kiểm org', () => {
  it('không tham chiếu org_members/permission — đây là tiền đề của cả audit', () => {
    const source = read('src/shared/lib/middlewares/with-auth.ts')
    expect(source).not.toContain('org_members')
    for (const gate of ['getPermissionScopeOrThrow', 'ensureOrgMember', 'ensurePolicy'])
      expect(source, `withAuth nay đã gate bằng ${gate}? Đọc lại audit`).not.toContain(gate)
  })
})

/** Dùng cho thông báo lỗi dễ đọc hơn khi debug cục bộ. */
export const __auditedRouteCount = routes.length
export const __allowlistSize = Object.keys(ALLOWLIST).length
export const __basename = basename
