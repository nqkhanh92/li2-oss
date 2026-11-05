import { BaseService } from './base.service'
import { EventRuleRepository, eventRuleRepo } from '../repositories/event-rule.repository'
import { ensurePolicy } from '@/shared/lib/permission/permissions'
import { nonScopePolicies } from '@/shared/lib/permission/policy'
import { ensureOrgPlan } from '@/shared/lib/plan/plans'
import { ADVANCED_FEATURE_KEYS, ORG_PLAN_LIMIT_KEYS } from '@/shared/types/plan-permission'
import { enqueueEventRuleRetroactiveTask } from '@/infrastructure/queue/event-rule-queue'
import type { CreateEventRuleInput, UpdateEventRuleInput } from '@/shared/schemas/event-rules'

export class EventRuleService extends BaseService<EventRuleRepository> {
  constructor(repo: EventRuleRepository) {
    super(repo)
  }

  async findAll(orgId: string) {
    await ensurePolicy(orgId, nonScopePolicies.view_event_rules)
    return this.repo.findAllByOrg(orgId)
  }

  async findOne(orgId: string, ruleId: string) {
    await ensurePolicy(orgId, nonScopePolicies.view_event_rules)
    return this.repo.findById(orgId, ruleId)
  }

  async create(orgId: string, userId: string, data: CreateEventRuleInput, source?: string) {
    await ensurePolicy(orgId, nonScopePolicies.add_event_rule)

    // Plan gating: check feature flag + quota limit
    await ensureOrgPlan(orgId, ADVANCED_FEATURE_KEYS.EVENT_TAGGING)
    await ensureOrgPlan(orgId, ORG_PLAN_LIMIT_KEYS.MAX_EVENT_RULES_PER_ORG)

    const rule = await this.repo.create(orgId, userId, data, source)

    // Trigger retroactive processing (fire-and-forget)
    enqueueEventRuleRetroactiveTask(rule.id, orgId)

    return rule
  }

  async update(orgId: string, ruleId: string, data: UpdateEventRuleInput) {
    await ensurePolicy(orgId, nonScopePolicies.edit_event_rule)
    return this.repo.update(orgId, ruleId, data)
  }

  async delete(orgId: string, ruleId: string) {
    await ensurePolicy(orgId, nonScopePolicies.delete_event_rule)
    return this.repo.delete(orgId, ruleId)
  }

  async getEventNames(orgId: string) {
    await ensurePolicy(orgId, nonScopePolicies.view_event_rules)
    return this.repo.getEventNames(orgId)
  }
}

export const eventRuleService =
  process.env.NODE_ENV !== 'production'
    ? new EventRuleService(eventRuleRepo)
    : (globalThis._eventRuleService ??
      (globalThis._eventRuleService = new EventRuleService(eventRuleRepo)))
