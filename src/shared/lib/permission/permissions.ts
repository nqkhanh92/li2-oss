'use server'

import { createServiceClient } from '@/infrastructure/database/supabase/server'
import {
  RolePermission,
  RolePermissionKey,
  RolePermissionScope,
} from '@/shared/types/role-permission'
import { PermissionPolicy } from './policy'
import { PermissionError } from '../../../infrastructure/response/errors/domain.errors'
import { redis } from '../../../infrastructure/cache/redis'
import { getSession } from '../auth/session'
import { requestContext, RequestRole } from '@/shared/types/request'
import { validate } from 'uuid'
import { REDIS_KEYS } from '@/infrastructure/cache/redis/key'

export async function getUserOrgPermissions(org_id: string): Promise<RolePermission[] | undefined> {
  // Resolve the acting user id. Browser requests carry a Casdoor session (session.sub). Agent
  // back-hop requests (RequestRole.AGENT) have NO browser session, but withAgentAuth put the real
  // minting user's id into requestContext (that user passed ensureOrgMember at mint time), so we
  // fall back to it — mirroring getUserPlan's `userId || session.sub` pattern. Without this
  // fallback the function returned undefined for agents → ensureOrgMember / getPermissionScopeOrThrow
  // / ensurePolicy all silently DENIED, so every write tool (create_short_link) 403'd. The fallback
  // is the ONLY behavioral change: a session-bearing request still resolves to session.sub exactly
  // as before. Resolves plans/ai-agent-platform/phase-0-walking-skeleton/task-0.4.md "Deferred".
  const session = await getSession()
  const userId = session?.sub ?? requestContext.getStore()?.userId
  if (!userId) return undefined

  const redisKey = REDIS_KEYS.USER.PERMISSIONS_ORG(userId, org_id)
  const cache = await redis.get(redisKey)
  if (cache) return JSON.parse(cache) as RolePermission[]

  const supabase = await createServiceClient()

  // Check if org_id is a UUID or a slug

  let query = supabase
    .from('org_members')
    .select('*, roles(*), organizations!inner(id, org_slug)')
    .eq('user_id', userId)

  if (validate(org_id)) {
    query = query.eq('org_id', org_id)
  } else {
    query = query.eq('organizations.org_slug', org_id)
  }

  const { data, error } = await query.single()

  if (error) {
    return undefined
  }
  const permissions = data.roles.permissions as RolePermission[]
  redis.set(redisKey, JSON.stringify(permissions), 'EX', 1800)
  return permissions
}

async function evaluatePolicy(org_id: string, policy: PermissionPolicy): Promise<boolean> {
  const permissions = await getUserOrgPermissions(org_id)
  if (!permissions) return false
  return policy.evaluate({ permissions })
}

export async function getPermissionScopeOrThrow(
  org_id: string,
  permissionKey: RolePermissionKey
): Promise<RolePermissionScope> {
  const role = requestContext.getStore()?.role
  if (role === RequestRole.SERVICE) return RolePermissionScope.ALL

  const permissions = await getUserOrgPermissions(org_id)
  if (!permissions) throw new PermissionError("You don't have permission to do this action")
  const permission = permissions.find((permission) => permission.permission_key === permissionKey)
  if (!permission || !permission.scope)
    throw new PermissionError("You don't have permission to do this action")
  return permission.scope
}

export async function ensurePolicy(
  org_id: string,
  policy: PermissionPolicy,
  errorMessage?: string
) {
  if (requestContext.getStore()?.role === RequestRole.SERVICE) return

  const result = await evaluatePolicy(org_id, policy)
  if (!result) {
    throw new PermissionError(errorMessage)
  }
}

export async function ensureAnyPolicy(org_id: string, policies: PermissionPolicy[]): Promise<void> {
  if (requestContext.getStore()?.role === RequestRole.SERVICE) return

  for(const policy of policies) {
    const result = await evaluatePolicy(org_id, policy)
    if (result) return
  }
  throw new PermissionError("You don't have permission to do this action")
}

export async function ensureOrgMember(org_id: string): Promise<void> {
  const result = await getUserOrgPermissions(org_id)
  if (!result) {
    throw new PermissionError('You are not a member of this organization')
  }
}
