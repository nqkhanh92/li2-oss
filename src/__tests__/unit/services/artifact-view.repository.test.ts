import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Supabase giả: mỗi `from(table)` trả một builder ghi lại lệnh; kết quả đọc từ `script` theo thứ tự
 * gọi. Đủ để chốt HÌNH của các lệnh (bảng nào, cột nào, lọc gì), không chốt SQL thật — việc đó là A24.
 */
type Step = { data?: unknown; error?: unknown; count?: number | null }
const calls: { table: string; op: string; args: unknown[]; filters: [string, unknown][] }[] = []
let script: Step[] = []

const builder = (table: string) => {
  const call = { table, op: '', args: [] as unknown[], filters: [] as [string, unknown][] }
  const chain: any = {
    select: (...a: unknown[]) => ((call.op ||= 'select'), call.args.push(['select', ...a]), chain),
    insert: (...a: unknown[]) => ((call.op = 'insert'), call.args.push(['insert', ...a]), chain),
    update: (...a: unknown[]) => ((call.op = 'update'), call.args.push(['update', ...a]), chain),
    eq: (k: string, v: unknown) => (call.filters.push([k, v]), chain),
    limit: () => chain,
    maybeSingle: () => finish(),
    single: () => finish(),
    then: (resolve: (v: unknown) => unknown) => finish().then(resolve),
  }
  const finish = async () => {
    calls.push(call)
    const step = script.shift() ?? {}
    return { data: step.data ?? null, error: step.error ?? null, count: step.count ?? null }
  }
  return chain
}
vi.mock('@/infrastructure/database/supabase', () => ({
  supabaseService: { from: (table: string) => builder(table) },
}))
const logWarn = vi.fn()
vi.mock('@/infrastructure/logging/logger', () => ({
  logger: { child: () => ({ warn: (...a: any[]) => logWarn(...a), error: vi.fn(), info: vi.fn() }) },
}))

import { ArtifactViewRepository } from '@/core/repositories/artifact-view.repository'

const repo = new ArtifactViewRepository()
const input = { artifactId: 'art-1', organizationId: 'org-1', touchPointId: 'tp-1', email: 'Khach@Example.COM' }

beforeEach(() => {
  calls.length = 0
  script = []
  vi.clearAllMocks()
})

describe('ArtifactViewRepository.recordGoogleViewer', () => {
  it('⭐ A24 lần đầu: INSERT profile (email lowercase, is_anonymous false, first_touch_point_id, KHÔNG name/avatar) rồi INSERT view', async () => {
    script = [{ data: null }, { data: { id: 'cp-1' } }, { data: null }, {}]
    await repo.recordGoogleViewer(input)

    expect(calls.map((c) => `${c.table}:${c.op}`)).toEqual([
      'customer_profiles:select',
      'customer_profiles:insert',
      'artifact_views:select',
      'artifact_views:insert',
    ])
    expect(calls[0].filters).toEqual([['organization_id', 'org-1'], ['email', 'khach@example.com']])
    const inserted = (calls[1].args[0] as unknown[])[1] as Record<string, unknown>
    expect(inserted).toMatchObject({
      organization_id: 'org-1',
      email: 'khach@example.com',
      is_anonymous: false,
      first_touch_point_id: 'tp-1',
      visit_count: 1,
    })
    expect(inserted).not.toHaveProperty('name')
    expect(inserted).not.toHaveProperty('avatar_url')
    const view = (calls[3].args[0] as unknown[])[1] as Record<string, unknown>
    expect(view).toMatchObject({ artifact_id: 'art-1', customer_profile_id: 'cp-1', organization_id: 'org-1', view_count: 1 })
  })

  it('⭐ A24 lần hai: UPDATE profile (visit_count+1, KHÔNG đụng first_touch_point_id) và UPDATE view (view_count+1)', async () => {
    script = [{ data: { id: 'cp-1', visit_count: 4 } }, {}, { data: { id: 'v-1', view_count: 1 } }, {}]
    await repo.recordGoogleViewer(input)

    expect(calls.map((c) => `${c.table}:${c.op}`)).toEqual([
      'customer_profiles:select',
      'customer_profiles:update',
      'artifact_views:select',
      'artifact_views:update',
    ])
    const profilePatch = (calls[1].args[0] as unknown[])[1] as Record<string, unknown>
    expect(profilePatch).toMatchObject({ is_anonymous: false, visit_count: 5 })
    expect(profilePatch).not.toHaveProperty('first_touch_point_id')
    expect(calls[1].filters).toEqual([['id', 'cp-1']])
    expect((calls[3].args[0] as unknown[])[1]).toMatchObject({ view_count: 2 })
    expect(calls[3].filters).toEqual([['id', 'v-1']])
  })

  it('INSERT view đụng UNIQUE (23505) → coi là xong, log WARN, không ném', async () => {
    script = [{ data: { id: 'cp-1', visit_count: 0 } }, {}, { data: null }, { error: { code: '23505' } }]
    await expect(repo.recordGoogleViewer(input)).resolves.toBeUndefined()
    expect(logWarn).toHaveBeenCalled()
  })

  it('lỗi khác → ném cho service nuốt + log', async () => {
    script = [{ error: new Error('db down') }]
    await expect(repo.recordGoogleViewer(input)).rejects.toThrow('db down')
  })
})

describe('ArtifactViewRepository.countViewersByArtifact', () => {
  it('count exact head trên artifact_views theo artifact_id — số NGƯỜI, không tổng view_count', async () => {
    script = [{ count: 7 }]
    expect(await repo.countViewersByArtifact('art-1')).toBe(7)
    expect(calls[0].table).toBe('artifact_views')
    expect(calls[0].args[0]).toEqual(['select', 'id', { count: 'exact', head: true }])
    expect(calls[0].filters).toEqual([['artifact_id', 'art-1']])
  })

  it('count null → 0', async () => {
    script = [{ count: null }]
    expect(await repo.countViewersByArtifact('art-1')).toBe(0)
  })
})
