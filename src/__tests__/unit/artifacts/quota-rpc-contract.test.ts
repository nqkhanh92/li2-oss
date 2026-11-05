import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { ARTIFACT_STATUSES } from '@/core/types/artifact.type'

/**
 * Contract test: every `.rpc('artifact_…', { … })` call in the repository must match a function the
 * migrations actually define, argument name for argument name.
 *
 * WHY THIS IS NOT COVERED BY ANYTHING ELSE
 *
 * `artifact.service.test.ts` mocks the repository, so it proves what the service does with a
 * refusal and proves nothing about whether the call would ever be made successfully. A typo in a
 * parameter name — `p_quota_bytes` in TypeScript against `p_quota_bytes_limit` in SQL — is not a
 * type error, because `database.types.ts` is hand-maintained here (regenerating it is unsafe: it
 * points at a project without this table) and the function's `Args` block is written by the same
 * hand. PostgREST answers a wrong argument name with an error at request time, so the first
 * evidence would be a 500 in production on an upload, with a green suite behind it.
 *
 * That is the same shape as the `; charset=utf-8` incident and the four missing i18n keys: two
 * files that must agree, and nothing that compares them.
 *
 * The lock is the other half of the correctness claim and is NOT testable here — it needs a real
 * database and two concurrent transactions. It is verified on LiHi.
 */

const ROOT = resolve(__dirname, '../../../..')
const REPOSITORY = resolve(ROOT, 'src/core/repositories/artifact.repository.ts')
const MIGRATION_DIR = resolve(ROOT, 'supabase/migrations')

/** `artifact_` prefix only: these are the ones this feature owns and the ones the repo calls. */
const RPC_NAME = /\.rpc\(\s*'(artifact_[a-z0-9_]+)'\s*,\s*\{([\s\S]*?)\}\s*\)/g
const CALL_ARG = /(?:^|[\s,{])(p_[a-z0-9_]+)\s*:/g
const SQL_FUNCTION =
  /CREATE OR REPLACE FUNCTION\s+"public"\."(artifact_[a-z0-9_]+)"\s*\(([\s\S]*?)\)\s*RETURNS/g
// Types are quoted in these files (`"p_org_id" "uuid"`), so the type is matched with the optional
// quote included — without it only the bare `integer` parameter matches and the test compares a
// one-element list against a four-element one while looking like it checked something.
const SQL_PARAM = /"(p_[a-z0-9_]+)"\s+"?[A-Za-z]/g

/**
 * Whole `CREATE OR REPLACE FUNCTION … $$;` bodies, so the RETURN check below reads a function's own
 * statements rather than the whole file.
 */
const SQL_BODY =
  /CREATE OR REPLACE FUNCTION\s+"public"\."(artifact_[a-z0-9_]+)"[\s\S]*?RETURNS\s+(SETOF\s+)?[\s\S]*?\$\$([\s\S]*?)\$\$\s*;/g

const collect = (source: string, pattern: RegExp, group: number) => {
  const found: Record<string, string[]> = {}
  for (const match of source.matchAll(pattern)) {
    const args: string[] = []
    for (const arg of match[group].matchAll(CALL_ARG)) args.push(arg[1])
    found[match[1]] = args.sort()
  }
  return found
}

const repositorySource = readFileSync(REPOSITORY, 'utf8')
const migrationSource = readdirSync(MIGRATION_DIR)
  .filter((f) => f.endsWith('.sql') && f.includes('artifacts__'))
  .sort()
  .map((f) => readFileSync(resolve(MIGRATION_DIR, f), 'utf8'))
  .join('\n')

const calls = collect(repositorySource, RPC_NAME, 2)
const defined: Record<string, string[]> = {}
for (const match of migrationSource.matchAll(SQL_FUNCTION)) {
  const args: string[] = []
  for (const arg of match[2].matchAll(SQL_PARAM)) args.push(arg[1])
  defined[match[1]] = args.sort()
}

describe('artifact repository ↔ quota migrations', () => {
  /**
   * Bốn hàm từ wave 4: `artifact_visit_counts` (S1) là hàm đọc đầu tiên trong nhóm — nó không giữ
   * lock, không ghi gì, nhưng vẫn phải khớp tên tham số với phía TypeScript như ba hàm còn lại.
   */
  const ARTIFACT_RPCS = [
    'artifact_create_if_within_quota',
    'artifact_publish_if_within_quota',
    'artifact_replace_if_within_quota',
    'artifact_visit_counts',
  ]

  it('quét được cả hai phía — bốn hàm, test này không được phép xanh vì quét ra rỗng', () => {
    expect(Object.keys(calls).sort()).toEqual(ARTIFACT_RPCS)
    expect(Object.keys(defined).sort()).toEqual(ARTIFACT_RPCS)
  })

  it('mọi hàm repository gọi đều tồn tại trong migration', () => {
    for (const name of Object.keys(calls)) expect(defined, `thiếu hàm ${name}`).toHaveProperty(name)
  })

  it('tên tham số khớp từng chữ — lệch một chữ là PostgREST trả lỗi lúc chạy, không phải lúc compile', () => {
    for (const [name, callArgs] of Object.entries(calls))
      expect(defined[name], `tham số của ${name}`).toEqual(callArgs)
  })

  /**
   * Hàm `RETURNS SETOF` thì `RETURN <biểu thức>` là lỗi cú pháp PL/pgSQL, không phải lỗi runtime:
   * với `check_function_bodies` bật (mặc định), nó bung ngay tại `CREATE FUNCTION` —
   * `RETURN cannot have a parameter in function returning set`, `HINT: Use RETURN NEXT or RETURN QUERY`.
   *
   * VÌ SAO CÓ TEST NÀY: đúng lỗi đó đã lọt vào file này một lần. Hai hàm ban đầu khai
   * `RETURNS "public"."artifacts"`, sau đổi sang `RETURNS SETOF` mà **không** sửa thân hàm — thân vẫn
   * `RETURN NULL;` / `RETURN v_row;`. Ba test phía trên đều xanh, vì chúng so **tên tham số** chứ không
   * bắt Postgres parse câu lệnh nào. Migration lẽ ra fail sạch khi apply, và hệ quả là service gọi một
   * RPC không tồn tại.
   *
   * Giới hạn đã biết: đây là kiểm TĨNH. Nó bắt đúng cái bẫy đã sập, không thay thế được việc cho một
   * Postgres thật parse file — việc đó làm bằng `psql -f` trên DB tạm trước khi apply lên môi trường thật.
   */
  it('hàm RETURNS SETOF không được dùng RETURN kèm biểu thức', () => {
    const setofFunctions: string[] = []

    for (const match of migrationSource.matchAll(SQL_BODY)) {
      const [, name, isSetof, body] = match
      if (!isSetof) continue
      setofFunctions.push(name)

      // `RETURN NEXT`, `RETURN QUERY` và `RETURN;` trần đều hợp lệ; `RETURN <cái gì đó khác>` thì không.
      const offenders = [...body.matchAll(/\bRETURN\b[ \t]+(?!NEXT\b|QUERY\b)([^\s;]+)/gi)].map(
        (m) => m[1]
      )

      expect(offenders, `${name} dùng RETURN kèm biểu thức trong hàm trả set`).toEqual([])
    }

    /**
     * Không có hàm SETOF nào thì vòng lặp trên không chạy và test xanh vì rỗng — chốt lại.
     *
     * Dedupe: một hàm được `CREATE OR REPLACE` lần thứ hai trong migration sau (20261001000001 thay
     * `artifact_create_if_within_quota` để bia mộ không ăn quota) xuất hiện hai lần ở đây. Hợp đồng
     * cần chốt là **tập hàm SETOF**, không phải số lần CREATE — một migration sửa thân hàm không
     * được làm test này đỏ.
     */
    expect([...new Set(setofFunctions)].sort()).toEqual([
      'artifact_create_if_within_quota',
      'artifact_publish_if_within_quota',
      'artifact_replace_if_within_quota',
    ])
  })
})

/**
 * WP3 của `docs/artifact-scan-clamav-spec.md`: guard status trong `artifact_publish_if_within_quota`.
 *
 * VÌ SAO Ở ĐÂY, KHÔNG PHẢI MỘT FILE RIÊNG (spec đề xuất `unit/migrations/artifact-publish-guard.test.ts`):
 * file này đã đọc và đã gom sẵn toàn bộ migration `artifacts__*` theo đúng thứ tự Postgres chạy, và
 * đã có bộ regex để lấy thân từng hàm. Một file thứ hai sẽ phải dựng lại cùng cái parser đó, và hai
 * parser trên cùng một văn bản là cách chúng từ từ lệch nhau.
 *
 * ĐIỀU TEST NÀY KHÔNG CHỨNG MINH: nó so VĂN BẢN, không cho Postgres chạy. Nó bắt được "ai đó
 * CREATE OR REPLACE lại hàm này mà bỏ guard" — đúng cái cách lỗ hổng sẽ quay lại — chứ không chứng
 * minh được rằng một hàng `quarantined` thật sự bị từ chối. Việc đó cần DB thật (nghiệm thu trên LiHi).
 */
describe('WP3 — guard status của artifact_publish_if_within_quota', () => {
  /** Thân của LẦN ĐỊNH NGHĨA CUỐI CÙNG: `CREATE OR REPLACE` nên bản sau ghi đè bản trước. */
  const lastBodyOf = (name: string) => {
    const bodies = [...migrationSource.matchAll(SQL_BODY)]
      .filter((m) => m[1] === name)
      .map((m) => m[3])
    expect(bodies.length, `không tìm thấy thân hàm ${name}`).toBeGreaterThan(0)
    return bodies[bodies.length - 1]
  }

  /** `"status" IN ('a', 'b')` → `['a','b']`, bất kể khoảng trắng. */
  const statusesInGuard = (body: string) => {
    const match = /"status"\s+IN\s*\(([^)]*)\)/i.exec(body)
    expect(match, 'thân hàm không có mệnh đề `"status" IN (…)`').not.toBeNull()
    return [...match![1].matchAll(/'([a-z_]+)'/g)].map((m) => m[1]).sort()
  }

  const publishBody = lastBodyOf('artifact_publish_if_within_quota')

  it('UPDATE sang live chỉ khớp hàng draft/scanning — đây là chốt chặn, không phải TypeScript', () => {
    expect(statusesInGuard(publishBody)).toEqual(['draft', 'scanning'])
  })

  /**
   * Mệnh đề phải nằm trong WHERE của ĐÚNG câu UPDATE lật sang `live`. Một `"status" IN (…)` đặt ở
   * câu SELECT đếm slot phía trên sẽ qua được phép kiểm trên mà không chặn gì cả.
   */
  it('mệnh đề nằm trong WHERE của UPDATE … SET status = live', () => {
    const update =
      /UPDATE\s+"public"\."artifacts"\s+SET\s+"status"\s*=\s*'live'[\s\S]*?RETURNING/i.exec(
        publishBody
      )
    expect(update, 'không tìm thấy UPDATE lật sang live').not.toBeNull()
    expect(update![0]).toMatch(/"status"\s+IN\s*\(\s*'draft',\s*'scanning'\s*\)/i)
  })

  /**
   * Không có `IF NOT FOUND` thì thêm guard còn TỆ HƠN không có guard: UPDATE không khớp hàng nào để
   * `v_row` toàn NULL, `RETURN NEXT v_row` trả về MỘT hàng toàn NULL, và `data?.[0] ?? null` trong
   * `publishIfWithinQuota` thấy một object — service kết luận publish thành công.
   */
  it('UPDATE không khớp → trả tập RỖNG, không phải một hàng toàn NULL', () => {
    const afterUpdate = publishBody.slice(publishBody.search(/UPDATE\s+"public"\."artifacts"/i))
    expect(afterUpdate).toMatch(/IF\s+NOT\s+FOUND\s+THEN\s+RETURN;\s+END\s+IF;/i)
    expect(afterUpdate.indexOf('IF NOT FOUND')).toBeLessThan(afterUpdate.indexOf('RETURN NEXT'))
  })

  it('hàm replace vẫn giữ guard của nó — WP3 không được làm rơi bất biến cũ', () => {
    expect(statusesInGuard(lastBodyOf('artifact_replace_if_within_quota'))).toEqual([
      'draft',
      'live',
    ])
  })

  /**
   * Hai nửa của cùng một quy tắc, ở hai ngôn ngữ: pre-check trong `publish()` và WHERE trong SQL.
   * Lệch nhau thì pre-check cho qua rồi SQL từ chối SAU khi touch point đã mint, hoặc ngược lại —
   * đúng họ lỗi `; charset=utf-8` mà file này tồn tại để chặn.
   */
  it('tập status của SQL khớp từng chữ với isPublishableStatus trong service', () => {
    const service = readFileSync(resolve(ROOT, 'src/core/services/artifact.service.ts'), 'utf8')
    const line = /const isPublishableStatus\s*=\s*\(status: string\)\s*=>([^\n]*)/.exec(service)
    expect(line, 'không tìm thấy isPublishableStatus trong artifact.service.ts').not.toBeNull()
    const inTs = [...line![1].matchAll(/'([a-z_]+)'/g)].map((m) => m[1]).sort()

    expect(inTs).toEqual(statusesInGuard(publishBody))
  })

  /** Mọi giá trị trong guard phải là status thật — một chuỗi gõ sai chặn im lặng mọi publish. */
  it('mọi status trong guard đều thuộc ARTIFACT_STATUSES', () => {
    for (const status of statusesInGuard(publishBody))
      expect(ARTIFACT_STATUSES as readonly string[]).toContain(status)
  })
})
