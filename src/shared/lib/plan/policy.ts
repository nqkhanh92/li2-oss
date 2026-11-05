import {
  OrgAdvancedFeatureKey,
  OrganizationPlan,
  OrgPlanLimitKey,
  Plan,
  PlanLimitKey,
} from '@/shared/types/plan-permission'
import { checkOrgLimitation, hasPlan } from './check-plan'

export class PlanPolicy {
  private plan: Plan
  private limitKey: Exclude<PlanLimitKey, OrgAdvancedFeatureKey>
  private currentValue: number | string

  constructor(
    plan: Plan,
    limitKey: Exclude<PlanLimitKey, OrgAdvancedFeatureKey>,
    currentValue: number | string
  ) {
    this.plan = plan
    this.limitKey = limitKey
    this.currentValue = currentValue
  }

  evaluate(): boolean {
    return hasPlan(this.plan, this.limitKey, this.currentValue)
  }
}

export class OrgPlanPolicy {
  private plan: OrganizationPlan
  private limitKey: OrgPlanLimitKey
  private expectedValue?: number | string | string[]

  constructor(
    plan: OrganizationPlan,
    limitKey: OrgPlanLimitKey,
    expectedValue?: number | string | string[]
  ) {
    this.plan = plan
    this.limitKey = limitKey
    this.expectedValue = expectedValue
  }

  evaluate(): boolean {
    return checkOrgLimitation(this.plan, this.limitKey, this.expectedValue)
  }
}
