import {
  ADVANCED_FEATURE_KEYS,
  MAPPING_QUOTA_KEYS,
  OrgAdvancedFeatureKey,
  OrganizationPlan,
  OrgPlanLimitKey,
  OrgQuota,
  PLAN_LIMIT_KEYS,
  PlanLimitKey,
} from '@/shared/types/plan-permission'
import { redis } from '../../../infrastructure/cache/redis'
import { getSession } from '../auth/session'
import { createServiceClient } from '../../../infrastructure/database/supabase/server'
import { OrgPlanPolicy, PlanPolicy } from './policy'
import { AppError, PlanError } from '../../../infrastructure/response/errors/domain.errors'
import { UserPlan } from '@/shared/providers/plan-provider'
import { userPlanService } from '@/core/services/user-plan.service'
import { requestContext, RequestRole } from '@/shared/types/request'
import { validate } from 'uuid'

export async function getOrgQuota(orgSlugOrId: string): Promise<OrgQuota | null> {
  const supabase = await createServiceClient()

  let query = supabase.from('org_quotas').select('*, organizations!inner(org_slug)')

  if (validate(orgSlugOrId)) {
    query = query.eq('org_id', orgSlugOrId)
  } else {
    query = query.eq('organizations.org_slug', orgSlugOrId)
  }

  const { data, error } = await query.returns<OrgQuota>().single()

  if (error) {
    return null
  }
  return data
}
export async function getOrganizationPlan(orgSlugOrId: string): Promise<OrganizationPlan | null> {
  const supabase = await createServiceClient()
  let query = supabase.from('organizations').select('id, user_id')

  if (validate(orgSlugOrId)) {
    query = query.eq('id', orgSlugOrId)
  } else {
    query = query.eq('org_slug', orgSlugOrId)
  }

  const { data: org, error: orgError } = await query.single()

  if (orgError) {
    return null
  }
  //** get user plan have cache, we reuse it to get org plan
  // and easy to clear cache when user update plan */
  const orgPlan = await getUserPlan(org.user_id)
  if (!orgPlan) return null
  return {
    ...orgPlan.plans,
    expires_at: orgPlan.expires_at,
  } as OrganizationPlan
}

export async function getUserPlan(userId?: string): Promise<UserPlan | null> {
  const session = await getSession()
  if (!session && !userId) return null

  const cacheKey = `user:${userId || session!.sub}:plan`
  const cached = await redis.get(cacheKey)
  if (cached) return JSON.parse(cached)

  const userPlan = await userPlanService.findOne(userId || session!.sub)
  if (!userPlan) {
    return null
  }
  await redis.set(cacheKey, JSON.stringify(userPlan), 'EX', 1800)
  return userPlan

  // const supabase = await createServiceClient();
  // const { data, error } = await supabase
  //   .from("user_plans")
  //   .select("*, plans(*)")
  //   .eq("user_id", userId || session!.sub)
  //   .returns<UserPlan>()
  //   .single();
  // if (error) {
  //   return null;
  // }

  // await redis.set(cacheKey, JSON.stringify(data), "EX", 86400);
  // return data;
}

export async function evaluatePlan(
  key: Exclude<PlanLimitKey, OrgAdvancedFeatureKey>,
  currentValue: number | string
): Promise<boolean> {
  const userPlan = await getUserPlan()
  if (!userPlan?.plans) throw new AppError()
  return new PlanPolicy(userPlan.plans, key, currentValue).evaluate()
}

export async function ensureUserPlan(key: PlanLimitKey, errorMessage?: string) {
  let result = false
  const userPlan = await getUserPlan()
  if (!userPlan?.plans) throw new AppError()

  if (key === PLAN_LIMIT_KEYS.MAX_ORGS_PER_USER) {
    result = await evaluatePlan(key, userPlan.total_organizations as number)
  }

  if (!result) {
    throw new PlanError(errorMessage, {
      key: 'common:messages.error.plan_error',
      params: {},
    })
  }
}

export async function ensureOrgPlan(
  orgId: string,
  key: OrgPlanLimitKey | OrgAdvancedFeatureKey,
  options: {
    expectedValue?: number | string[]
    errorMessage?: string
    onlyCheck?: boolean
  } = {}
) {
  if (requestContext.getStore()?.role === RequestRole.SERVICE) return

  const { expectedValue, errorMessage, onlyCheck } = options
  /**
   * Ensures that the user has enough quota in their organization plan for the given key.
   * @param orgId The ID of the organization to check.
   * @param key The plan limit key to check.
   * @param options
   * - `expectedValue`: The expected value of the plan limit key. If not provided,
   *   the function will only check if the key exists in the plan.
   * The expectedValue depends on the context.
   * Ex:
   * - For limit type number: the expectedValue is the number of items to add.
   * - For others: the expectedValue is the value to check.
   *
   * - `errorMessage`: The error message to throw if the quota is exceeded.
   * @throws {PlanError} If the quota is exceeded.
   * @throws {AppError} If the organization plan is not found.
   */

  const orgPlan = await getOrganizationPlan(orgId)
  if (!orgPlan) throw new AppError()

  // Handle advanced features separately
  if (Object.values(ADVANCED_FEATURE_KEYS).includes(key as OrgAdvancedFeatureKey)) {
    const availableFeatures = orgPlan.advanced_features_allowed || []
    const hasFeature = availableFeatures.includes(key as string)

    if (!hasFeature) {
      throw new PlanError(errorMessage, {
        key: `common:messages.error.plan_errors.${key}`,
        params: {},
      })
    }
    return // Early return for advanced features
  }

  // Handle org plan limits
  const planKeyLimit = orgPlan[key as OrgPlanLimitKey]
  // console.log({ orgPlan, planKeyLimit, key });

  //**This option is for just check if plan have this key or not */
  if (onlyCheck && !planKeyLimit) {
    throw new PlanError(errorMessage, {
      key: `common:messages.error.plan_errors.${key}`,
      params: {},
    })
  }

  switch (typeof planKeyLimit) {
    //** If type of key is number, just evaluate plan based on quota */
    case 'number':
      //if expectedValue is not provided, default to 1 (1 to add)
      let quota = 0
      const valueToAdd = Number(expectedValue) || 1

      const orgQuota = await getOrgQuota(orgId)
      if (!orgQuota) throw new AppError()

      const quotaKey = MAPPING_QUOTA_KEYS[key]
      if (typeof orgQuota[quotaKey] === 'number') {
        quota = orgQuota[quotaKey]
      }
      // console.log({ orgQuota, orgPlan, key, quotaKey, quota, valueToAdd });

      const evaluateResult = new OrgPlanPolicy(
        orgPlan,
        key as OrgPlanLimitKey,
        quota + valueToAdd
      ).evaluate()
      if (!evaluateResult) {
        throw new PlanError(errorMessage, {
          key: `common:messages.error.plan_errors.${key}`,
          params: {},
        })
      }
      break
    default:
      const result = new OrgPlanPolicy(orgPlan, key as OrgPlanLimitKey, expectedValue).evaluate()
      if (!result) {
        throw new PlanError(errorMessage, {
          key: `common:messages.error.plan_errors.${key}`,
          params: {},
        })
      }
      break
  }
}

export async function deletePlanCache() {
  const session = await getSession()
  if (!session) return
  await redis.del(`user:${session.sub}:plan`)
}
