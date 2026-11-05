import { supabaseService } from '@/infrastructure/database/supabase'
import { logger } from '@/infrastructure/logging/logger'

const log = logger.child({ service: 'FormsAnalyticsRepository' })

export type FormsOverviewRow = {
  form_id: string | null
  form_name: string | null
  form_action: string | null
  page_path: string | null
  fills: number
  submits: number
  completion_pct: number | null
  avg_time_on_form: number | null
}

export type FormsDailyRow = {
  day: string
  fills: number
  submits: number
}

export type FormDailyFilter = {
  form_id?: string | null
  form_name?: string | null
  page_path?: string | null
  hostname?: string | null
}

export class FormsAnalyticsRepository {
  async getFormsOverview(
    orgId: string,
    from: string,
    to: string,
    hostname?: string | null
  ): Promise<FormsOverviewRow[]> {
    const { data, error } = await supabaseService
      .rpc('get_forms_overview', {
        _org_id: orgId,
        _from: from,
        _to: to,
        _hostname: hostname ?? undefined,
      })
      .overrideTypes<FormsOverviewRow[]>()

    if (error) {
      log.error(error, 'getFormsOverview')
      throw error
    }
    return data ?? []
  }

  async getFormsDaily(
    orgId: string,
    from: string,
    to: string,
    filter: FormDailyFilter = {}
  ): Promise<FormsDailyRow[]> {
    const { data, error } = await supabaseService
      .rpc('get_forms_daily', {
        _org_id: orgId,
        _from: from,
        _to: to,
        _form_id: filter.form_id ?? undefined,
        _form_name: filter.form_name ?? undefined,
        _page_path: filter.page_path ?? undefined,
        _hostname: filter.hostname ?? undefined,
      })
      .overrideTypes<FormsDailyRow[]>()

    if (error) {
      log.error(error, 'getFormsDaily')
      throw error
    }
    return data ?? []
  }
}

export const formsAnalyticsRepo =
  process.env.NODE_ENV !== 'production'
    ? new FormsAnalyticsRepository()
    : (globalThis._formsAnalyticsRepo ??
      (globalThis._formsAnalyticsRepo = new FormsAnalyticsRepository()))
