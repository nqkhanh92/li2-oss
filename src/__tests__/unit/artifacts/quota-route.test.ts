import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const quotaForOrg = vi.fn()
const getPermissionScopeOrThrow = vi.fn()

vi.mock('@/core/services/artifact.service', () => ({
  artifactService: { quotaForOrg: (...args: any[]) => quotaForOrg(...args) },
}))

vi.mock('@/shared/lib/permission/permissions', () => ({
  getPermissionScopeOrThrow: (...args: any[]) => getPermissionScopeOrThrow(...args),
  ensurePolicy: vi.fn(),
}))

vi.mock('@/shared/lib/auth/session', () => ({
  getSession: vi.fn(async () => ({ id: 'user-1', email: 'user@example.com' })),
}))

vi.mock('@/shared/lib/logs/system-logger', () => ({
  systemLogger: { logEvent: vi.fn() },
}))

vi.mock('@/infrastructure/logging/logger', () => ({
  logger: { child: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() })) },
}))

import { GET } from '@/app/api/organizations/[org_id]/artifacts/quota/route'
import { PermissionError } from '@/infrastructure/response/errors/domain.errors'
import { ROLE_PERMISSION_KEYS } from '@/shared/types/role-permission'

const ORG = 'org-1'
const URL = `https://app.li2.ai/api/organizations/${ORG}/artifacts/quota`
const call = () => GET(new NextRequest(URL), { params: { org_id: ORG } })

const quota = { used_bytes: 4096, quota_bytes: 31457280, live_count: 2, live_quota: 3 }

beforeEach(() => {
  vi.clearAllMocks()
  quotaForOrg.mockResolvedValue(quota)
  getPermissionScopeOrThrow.mockResolvedValue('ALL')
})

/** Spec R10 / A21. */
describe('GET …/artifacts/quota', () => {
  it('200 với đúng bốn trường, không thừa không thiếu', async () => {
    const res = await call()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toEqual(quota)
    expect(Object.keys(body.data).sort()).toEqual(
      ['live_count', 'live_quota', 'quota_bytes', 'used_bytes'].sort()
    )
    expect(quotaForOrg).toHaveBeenCalledWith(ORG)
  })

  it('cùng cổng với GET danh sách: VIEW_TOUCH_POINTS, kiểm TRƯỚC khi đọc', async () => {
    getPermissionScopeOrThrow.mockRejectedValue(new PermissionError())
    const res = await call()
    expect(res.status).toBe(403)
    expect(getPermissionScopeOrThrow).toHaveBeenCalledWith(
      ORG,
      ROLE_PERMISSION_KEYS.VIEW_TOUCH_POINTS
    )
    expect(quotaForOrg).not.toHaveBeenCalled()
  })
})
