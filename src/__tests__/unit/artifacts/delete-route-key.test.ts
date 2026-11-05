/**
 * `DELETE /api/organizations/{org}/artifacts/{id}` — the key mapping that keeps WP1 §4 invisible to
 * the dashboard.
 *
 * Wave 4 WP1 changed `artifactService.deleteForOrg` to throw `artifact:errors.removed` for a second
 * delete, so MCP's `delete_artifact` can answer that case as a success. The STATUS was already 404
 * and had to stay 404 — but that key's SENTENCE is written for `update_artifact` ("không cập nhật
 * được nữa. Đăng một artifact mới"), which is the wrong thing to put in a toast after someone pressed
 * Delete twice.
 *
 * So this route maps the one key back. These tests are the proof that the human-facing behaviour is
 * byte-identical to before the service changed — the only reason the service change was allowed.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const deleteForOrg = vi.fn()

vi.mock('@/core/services/artifact.service', () => ({
  artifactService: {
    deleteForOrg: (...args: unknown[]) => deleteForOrg(...args),
    getForOrg: vi.fn(),
    setAccess: vi.fn(),
  },
}))

vi.mock('@/shared/lib/auth/session', () => ({
  getSession: vi.fn(async () => ({ id: 'user-1', email: 'user@example.com' })),
}))

vi.mock('@/shared/lib/permission/permissions', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/lib/permission/permissions')>()),
  getPermissionScopeOrThrow: vi.fn(async () => 'ALL'),
}))

vi.mock('@/shared/lib/logs/system-logger', () => ({
  systemLogger: { logEvent: vi.fn() },
}))

vi.mock('@/infrastructure/logging/logger', () => ({
  logger: { child: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() })) },
}))

import { DELETE } from '@/app/api/organizations/[org_id]/artifacts/[artifact_id]/route'
import {
  ForbiddenError,
  NotFoundError,
  PermissionError,
} from '@/infrastructure/response/errors/domain.errors'

const ORG = 'org-1'
const ID = 'artifact-1'
const URL = `https://app.li2.ai/api/organizations/${ORG}/artifacts/${ID}`

const call = () =>
  DELETE(new NextRequest(URL, { method: 'DELETE' }), {
    params: { org_id: ORG, artifact_id: ID },
  } as never)

beforeEach(() => {
  vi.clearAllMocks()
  deleteForOrg.mockResolvedValue(undefined)
})

describe('a successful delete is untouched', () => {
  it('answers the same 200 payload and the same success key', async () => {
    const res = await call()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data).toEqual({ id: ID })
    expect(body.i18nMessage).toMatchObject({
      key: 'common:messages.success.deleted_field',
      params: { field: '$t(label.artifact)' },
    })
  })
})

describe('⭐ a second delete reads exactly as it did before wave 4', () => {
  it('maps artifact:errors.removed back to the generic not_found, still 404', async () => {
    // Without this mapping the toast would say "không cập nhật được nữa. Đăng một artifact mới" to
    // someone who pressed Delete, not Update.
    deleteForOrg.mockRejectedValue(
      new NotFoundError('Artifact has been taken down', { key: 'artifact:errors.removed' })
    )

    const res = await call()
    const body = await res.json()

    expect(res.status).toBe(404)
    expect(body.i18nMessage.key).toBe('common:messages.error.not_found')
    expect(body.i18nMessage.params).toEqual({ field: '$t(label.artifact)' })
    // The MCP-only key must not reach a human surface at all.
    expect(JSON.stringify(body)).not.toContain('artifact:errors.removed')
  })

  it('leaves a genuine not_found alone — it was already the right answer', async () => {
    deleteForOrg.mockRejectedValue(
      new NotFoundError('Artifact not found', {
        key: 'common:messages.error.not_found',
        params: { field: '$t(label.artifact)' },
      })
    )
    const res = await call()
    expect(res.status).toBe(404)
    expect((await res.json()).i18nMessage.key).toBe('common:messages.error.not_found')
  })
})

describe('the mapping is narrow', () => {
  it('⛔ does not swallow any other error — a 403 stays a 403 with its own key', async () => {
    // A mapping that caught more than the one key would turn a permission refusal into "not found",
    // and the user would go looking for a deleted artifact instead of asking for a role change.
    deleteForOrg.mockRejectedValue(new PermissionError())
    let res = await call()
    expect(res.status).toBe(403)
    expect((await res.json()).i18nMessage.key).toBe('common:messages.error.permission_error')

    deleteForOrg.mockRejectedValue(new ForbiddenError('storage is refusing'))
    res = await call()
    expect(res.status).toBe(403)
  })

  it('lets a storage outage propagate as a 5xx rather than reporting a delete', async () => {
    // `deleteForOrg` deliberately does NOT catch a storage failure: the row stays `live` and a retry
    // still has everything it needs. Reporting 404 here would tell the user it was already gone.
    deleteForOrg.mockRejectedValue(new Error('storage is down'))
    const res = await call()
    expect(res.status).toBeGreaterThanOrEqual(500)
  })
})
