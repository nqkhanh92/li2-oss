import dayjs from 'dayjs'
import { ensureOrgMember } from '@/shared/lib/permission/permissions'
import {
  FormsAnalyticsRepository,
  formsAnalyticsRepo,
  FormDailyFilter,
} from '../repositories/forms-analytics.repository'

export class FormsAnalyticsService {
  constructor(private repo: FormsAnalyticsRepository) {}

  async getFormsOverview(orgId: string, dateFrom: string, dateTo: string, hostname?: string | null) {
    await ensureOrgMember(orgId)
    const from = dayjs(dateFrom).toISOString()
    const to = dayjs(dateTo).toISOString()
    return this.repo.getFormsOverview(orgId, from, to, hostname)
  }

  async getFormsDaily(
    orgId: string,
    dateFrom: string,
    dateTo: string,
    filter: FormDailyFilter = {}
  ) {
    await ensureOrgMember(orgId)
    const from = dayjs(dateFrom).toISOString()
    const to = dayjs(dateTo).toISOString()
    return this.repo.getFormsDaily(orgId, from, to, filter)
  }
}

export const formsAnalyticsService =
  process.env.NODE_ENV !== 'production'
    ? new FormsAnalyticsService(formsAnalyticsRepo)
    : (globalThis._formsAnalyticsService ??
      (globalThis._formsAnalyticsService = new FormsAnalyticsService(formsAnalyticsRepo)))
