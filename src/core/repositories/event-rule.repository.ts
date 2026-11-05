import { supabaseService } from '@/infrastructure/database/supabase'
import { CreateEventRuleInput, UpdateEventRuleInput } from '@/shared/schemas/event-rules'

export class EventRuleRepository {
  private query = () => supabaseService.from('event_rules')

  async findAllByOrg(orgId: string) {
    const { data, error } = await this.query()
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data
  }

  async findById(orgId: string, ruleId: string) {
    const { data, error } = await this.query()
      .select('*')
      .eq('id', ruleId)
      .eq('organization_id', orgId)
      .single()
    if (error) throw error
    return data
  }

  async create(orgId: string, userId: string, data: CreateEventRuleInput, source?: string) {
    const { data: rule, error } = await this.query()
      .insert({
        organization_id: orgId,
        created_by: userId,
        name: data.name,
        description: data.description ?? null,
        selector_path: data.selector_path ?? null,
        element_text: data.element_text ?? null,
        element_id: data.element_id ?? null,
        element_href: data.element_href ?? null,
        page_path: data.page_path ?? null,
        text_match_mode: data.text_match_mode ?? 'contains',
        is_active: true,
        trigger_type: data.trigger_type ?? 'click',
        form_id: data.form_id ?? null,
        form_name: data.form_name ?? null,
        form_action: data.form_action ?? null,
        ...(source && { source }),
      })
      .select('*')
      .single()
    if (error) throw error
    return rule
  }

  async update(orgId: string, ruleId: string, data: UpdateEventRuleInput) {
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (data.name !== undefined) updateData.name = data.name
    if (data.description !== undefined) updateData.description = data.description
    if (data.selector_path !== undefined) updateData.selector_path = data.selector_path
    if (data.element_text !== undefined) updateData.element_text = data.element_text
    if (data.element_id !== undefined) updateData.element_id = data.element_id
    if (data.element_href !== undefined) updateData.element_href = data.element_href
    if (data.page_path !== undefined) updateData.page_path = data.page_path
    if (data.text_match_mode !== undefined) updateData.text_match_mode = data.text_match_mode
    if (data.is_active !== undefined) updateData.is_active = data.is_active
    if (data.trigger_type !== undefined) updateData.trigger_type = data.trigger_type
    if (data.form_id !== undefined) updateData.form_id = data.form_id
    if (data.form_name !== undefined) updateData.form_name = data.form_name
    if (data.form_action !== undefined) updateData.form_action = data.form_action

    const { data: rule, error } = await this.query()
      .update(updateData)
      .eq('id', ruleId)
      .eq('organization_id', orgId)
      .select('*')
      .single()
    if (error) throw error
    return rule
  }

  async delete(orgId: string, ruleId: string) {
    const { error } = await this.query().delete().eq('id', ruleId).eq('organization_id', orgId)
    if (error) throw error
  }

  async getEventNames(orgId: string) {
    // Source 1: event rule names (marketer-defined)
    const { data: ruleNames, error: rulesErr } = await this.query()
      .select('name')
      .eq('organization_id', orgId)
      .eq('is_active', true)

    if (rulesErr) throw rulesErr

    // Source 2: developer events from pageviews (last 30 days)
    const { data: devNames, error: devErr } = await supabaseService.rpc(
      'get_distinct_event_names',
      { _org_id: orgId }
    )

    if (devErr) throw devErr

    // Merge and deduplicate
    const allNames = new Set<string>()
    ruleNames?.forEach((r: { name: string }) => allNames.add(r.name))
    devNames?.forEach((d) => allNames.add(d.event_name))

    return Array.from(allNames).sort()
  }
}

export const eventRuleRepo =
  process.env.NODE_ENV !== 'production'
    ? new EventRuleRepository()
    : (globalThis._eventRuleRepo ?? (globalThis._eventRuleRepo = new EventRuleRepository()))
