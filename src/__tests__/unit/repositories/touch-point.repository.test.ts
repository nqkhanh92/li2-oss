import { describe, it, expect, beforeEach, vi } from 'vitest'
import { TouchPointRepository } from '@/core/repositories/touch-point.repository'
import { supabaseService } from '@/infrastructure/database/supabase'

// Mock Supabase
vi.mock('@/infrastructure/database/supabase', () => ({
  supabaseService: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}))

// `.query()` in BaseRepository calls `supabaseService.from(...)` fresh every time it's invoked, so
// each of the three parallel branches (slug / short_code / name) gets its own builder via a
// separate `mockReturnValueOnce` — this lets each branch resolve independently, unlike a single
// shared `mockReturnValue`.
const buildQueryResult = (result: { data: unknown; error: unknown }) => ({
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  overrideTypes: vi.fn().mockResolvedValue(result),
})

describe('TouchPointRepository.getBySlugShortCodeOrNameForOrg', () => {
  let repository: TouchPointRepository
  const mockOrgId = 'org-123'

  beforeEach(() => {
    repository = new TouchPointRepository()
    vi.clearAllMocks()
  })

  it('resolves by slug over a short_code/name match on a different row (priority)', async () => {
    const slugRow = { id: 'tp-slug', name: 'walk-3aw-live-0ffa2a94', slug: '6LBCU' }
    const shortCodeRow = { id: 'tp-shortcode', name: 'other', short_code: '6LBCU' }
    const nameRow = { id: 'tp-name', name: 'walk-3aw-live-0ffa2a94' }

    vi.mocked(supabaseService.from)
      .mockReturnValueOnce(buildQueryResult({ data: slugRow, error: null }) as any)
      .mockReturnValueOnce(buildQueryResult({ data: shortCodeRow, error: null }) as any)
      .mockReturnValueOnce(buildQueryResult({ data: [nameRow], error: null }) as any)

    const result = await repository.getBySlugShortCodeOrNameForOrg(mockOrgId, '6LBCU')

    expect(result).toEqual({ row: slugRow, ambiguousName: false })
  })

  it('falls back to short_code when slug has no match', async () => {
    const shortCodeRow = { id: 'tp-shortcode', name: 'walk-3aw-live-0ffa2a94', short_code: '6LBCU' }
    const nameRow = { id: 'tp-name', name: 'walk-3aw-live-0ffa2a94' }

    vi.mocked(supabaseService.from)
      .mockReturnValueOnce(buildQueryResult({ data: null, error: null }) as any)
      .mockReturnValueOnce(buildQueryResult({ data: shortCodeRow, error: null }) as any)
      .mockReturnValueOnce(buildQueryResult({ data: [nameRow], error: null }) as any)

    const result = await repository.getBySlugShortCodeOrNameForOrg(mockOrgId, '6LBCU')

    expect(result).toEqual({ row: shortCodeRow, ambiguousName: false })
  })

  it('falls back to name (last resort) when exactly one row matches by name', async () => {
    const nameRow = { id: 'tp-name', name: 'walk-3aw-live-0ffa2a94' }

    vi.mocked(supabaseService.from)
      .mockReturnValueOnce(buildQueryResult({ data: null, error: null }) as any)
      .mockReturnValueOnce(buildQueryResult({ data: null, error: null }) as any)
      .mockReturnValueOnce(buildQueryResult({ data: [nameRow], error: null }) as any)

    const result = await repository.getBySlugShortCodeOrNameForOrg(
      mockOrgId,
      'walk-3aw-live-0ffa2a94'
    )

    expect(result).toEqual({ row: nameRow, ambiguousName: false })
  })

  it('flags ambiguousName instead of throwing when more than one row shares the name', async () => {
    const nameRowA = { id: 'tp-name-a', name: 'walk-3aw-live-0ffa2a94' }
    const nameRowB = { id: 'tp-name-b', name: 'walk-3aw-live-0ffa2a94' }

    vi.mocked(supabaseService.from)
      .mockReturnValueOnce(buildQueryResult({ data: null, error: null }) as any)
      .mockReturnValueOnce(buildQueryResult({ data: null, error: null }) as any)
      .mockReturnValueOnce(buildQueryResult({ data: [nameRowA, nameRowB], error: null }) as any)

    const result = await repository.getBySlugShortCodeOrNameForOrg(
      mockOrgId,
      'walk-3aw-live-0ffa2a94'
    )

    expect(result).toEqual({ row: null, ambiguousName: true })
  })

  it('returns row: null, ambiguousName: false when nothing matches any column', async () => {
    vi.mocked(supabaseService.from)
      .mockReturnValueOnce(buildQueryResult({ data: null, error: null }) as any)
      .mockReturnValueOnce(buildQueryResult({ data: null, error: null }) as any)
      .mockReturnValueOnce(buildQueryResult({ data: [], error: null }) as any)

    const result = await repository.getBySlugShortCodeOrNameForOrg(mockOrgId, 'does-not-exist')

    expect(result).toEqual({ row: null, ambiguousName: false })
  })

  it('throws (never swallows) when the slug lookup errors', async () => {
    const dbError = new Error('db down')

    vi.mocked(supabaseService.from)
      .mockReturnValueOnce(buildQueryResult({ data: null, error: dbError }) as any)
      .mockReturnValueOnce(buildQueryResult({ data: null, error: null }) as any)
      .mockReturnValueOnce(buildQueryResult({ data: [], error: null }) as any)

    await expect(
      repository.getBySlugShortCodeOrNameForOrg(mockOrgId, 'x')
    ).rejects.toThrow('db down')
  })
})

// AI Agent Platform — link-details tool's preferred `id` path. `id` is the primary key, so this
// is a single .eq('id', ...).maybeSingle() lookup — no priority branching, unlike the slug path.
describe('TouchPointRepository.getByIdForOrg', () => {
  let repository: TouchPointRepository
  const mockOrgId = 'org-123'

  beforeEach(() => {
    repository = new TouchPointRepository()
    vi.clearAllMocks()
  })

  it('returns the row when the id matches within the org', async () => {
    const row = { id: 'tp-1', name: 'Spring Sale', slug: '6LBCU' }

    vi.mocked(supabaseService.from).mockReturnValueOnce(
      buildQueryResult({ data: row, error: null }) as any
    )

    const result = await repository.getByIdForOrg(mockOrgId, 'tp-1')

    expect(result).toEqual(row)
  })

  it('returns null (never throws) on an org-scoped miss', async () => {
    vi.mocked(supabaseService.from).mockReturnValueOnce(
      buildQueryResult({ data: null, error: null }) as any
    )

    const result = await repository.getByIdForOrg(mockOrgId, 'does-not-exist')

    expect(result).toBeNull()
  })

  it('throws (never swallows) when the lookup errors', async () => {
    const dbError = new Error('db down')

    vi.mocked(supabaseService.from).mockReturnValueOnce(
      buildQueryResult({ data: null, error: dbError }) as any
    )

    await expect(repository.getByIdForOrg(mockOrgId, 'tp-1')).rejects.toThrow('db down')
  })
})
