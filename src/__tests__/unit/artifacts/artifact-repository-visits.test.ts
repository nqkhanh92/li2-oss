import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Hai phương thức repository của wave 4 — `countVisitsByTouchPoints` (S1) và `touchUpdatedAtForOrg`
 * (B2 bước 6) — đo bằng một Supabase giả, cùng khuôn `artifact-view.repository.test.ts`.
 *
 * Vì sao là file riêng, không nằm trong `artifact.service.test.ts`: file đó mock cả module
 * `artifact.repository` (`ArtifactRepository: class {}`) để không kéo chuỗi supabase vào, nên ở đó
 * chỉ ĐỌC ĐƯỢC SOURCE của repository, không chạy được nó. Mảng rỗng KHÔNG gọi DB là một hành vi, và
 * một hành vi phải được chạy mới gọi là có test.
 *
 * Chốt HÌNH của lệnh (gọi rpc nào, tham số gì, lọc theo cột nào), không chốt SQL thật — việc đó là
 * nghiệm thu trên LiHi.
 */
type Step = { data?: unknown; error?: unknown; count?: number | null }

const rpcCalls: { name: string; args: unknown[] }[] = []
const updateCalls: { table: string; payload: unknown[]; filters: [string, unknown][] }[] = []
let script: Step[] = []

const nextStep = () => {
  const step = script.shift() ?? {}
  return { data: step.data ?? null, error: step.error ?? null, count: step.count ?? null }
}

const updateBuilder = (table: string) => {
  const call = { table, payload: [] as unknown[], filters: [] as [string, unknown][] }
  const chain: any = {
    update: (...args: unknown[]) => (call.payload.push(...args), chain),
    eq: (key: string, value: unknown) => (call.filters.push([key, value]), chain),
    select: () => chain,
    maybeSingle: () => finish(),
    then: (resolve: (value: unknown) => unknown) => finish().then(resolve),
  }
  const finish = async () => {
    updateCalls.push(call)
    return nextStep()
  }
  return chain
}

vi.mock('@/infrastructure/database/supabase', () => ({
  supabaseService: {
    from: (table: string) => updateBuilder(table),
    rpc: async (name: string, ...args: unknown[]) => {
      rpcCalls.push({ name, args })
      return nextStep()
    },
  },
}))
vi.mock('@/infrastructure/logging/logger', () => ({
  logger: { child: () => ({ warn: vi.fn(), error: vi.fn(), info: vi.fn() }) },
}))

import { ArtifactRepository } from '@/core/repositories/artifact.repository'

const repo = new ArtifactRepository()
const ORG = 'org-1'
const TP_A = '11111111-1111-4111-8111-111111111111'
const TP_B = '22222222-2222-4222-8222-222222222222'

beforeEach(() => {
  rpcCalls.length = 0
  updateCalls.length = 0
  script = []
  vi.clearAllMocks()
})

describe('ArtifactRepository.countVisitsByTouchPoints', () => {
  it('⭐ mảng rỗng → Map rỗng và KHÔNG một round trip nào tới DB', async () => {
    const result = await repo.countVisitsByTouchPoints([])

    expect(result.size).toBe(0)
    expect(rpcCalls).toHaveLength(0)
  })

  it('⭐ gọi rpc artifact_visit_counts với p_tp_ids và trả Map tp_id → số', async () => {
    script = [
      {
        data: [
          { tp_id: TP_A, visits: 12 },
          { tp_id: TP_B, visits: 3 },
        ],
      },
    ]

    const result = await repo.countVisitsByTouchPoints([TP_A, TP_B])

    expect(rpcCalls).toHaveLength(1)
    expect(rpcCalls[0].name).toBe('artifact_visit_counts')
    expect(rpcCalls[0].args[0]).toEqual({ p_tp_ids: [TP_A, TP_B] })
    expect(result.get(TP_A)).toBe(12)
    expect(result.get(TP_B)).toBe(3)
  })

  it('touch point không có lượt quét nào thì vắng mặt trong Map (caller đọc thiếu key thành 0)', async () => {
    script = [{ data: [{ tp_id: TP_A, visits: 5 }] }]

    const result = await repo.countVisitsByTouchPoints([TP_A, TP_B])

    expect(result.get(TP_A)).toBe(5)
    expect(result.has(TP_B)).toBe(false)
  })

  it('bigint về dạng string vẫn thành số — count(*) của Postgres không phải int4', async () => {
    script = [{ data: [{ tp_id: TP_A, visits: '417' }] }]

    const result = await repo.countVisitsByTouchPoints([TP_A])

    expect(result.get(TP_A)).toBe(417)
  })

  it('RPC lỗi → NÉM, không nuốt: service là nơi quyết định hiện 0', async () => {
    script = [{ error: { message: 'function does not exist', code: '42883' } }]

    await expect(repo.countVisitsByTouchPoints([TP_A])).rejects.toMatchObject({ code: '42883' })
  })
})

describe('ArtifactRepository.touchUpdatedAtForOrg', () => {
  it('⭐ UPDATE updated_at, lọc theo CẢ id và organization_id, trả count', async () => {
    script = [{ count: 1 }]

    const count = await repo.touchUpdatedAtForOrg(ORG, 'artifact-1')

    expect(updateCalls).toHaveLength(1)
    expect(updateCalls[0].table).toBe('artifacts')

    const [payload, options] = updateCalls[0].payload as [Record<string, unknown>, unknown]
    expect(Object.keys(payload)).toEqual(['updated_at'])
    expect(payload.updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(options).toEqual({ count: 'exact' })

    expect(updateCalls[0].filters).toEqual([
      ['id', 'artifact-1'],
      ['organization_id', ORG],
    ])
    expect(count).toBe(1)
  })

  it('không hàng nào khớp → 0, không ném', async () => {
    script = [{ count: 0 }]
    expect(await repo.touchUpdatedAtForOrg(ORG, 'artifact-lạ')).toBe(0)
  })

  it('lỗi DB → ném', async () => {
    script = [{ error: { message: 'boom' } }]
    await expect(repo.touchUpdatedAtForOrg(ORG, 'artifact-1')).rejects.toMatchObject({
      message: 'boom',
    })
  })
})
