import { ContentLayout } from '@/shared/components/layout/content-layout'
import { AuditLogsList } from '@/features/audit-logs/components/audit-logs-list'
import { ensureOrgPlan } from '@/shared/lib/plan/plans'
import { ADVANCED_FEATURE_KEYS } from '@/shared/types/plan-permission'
import { PlanError } from '@/infrastructure/response/errors/domain.errors'
import { logger } from '@/infrastructure/logging/logger'
import { initServerI18n } from '@/shared/lib/i18n/i18n-server'
import { Metadata } from 'next'
import { CustomToolTip } from '@/shared/components/customize/custom-tooltip'
import { CircleHelp } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Audit Logs',
}

export default async function AuditLogsPage({ params }: { params: { org_id: string } }) {
  const { org_id } = params
  let blocked = false

  try {
    await ensureOrgPlan(org_id, ADVANCED_FEATURE_KEYS.AUDIT_LOGS)
  } catch (error) {
    if (error instanceof PlanError) blocked = true
    else logger.error({ org_id, error }, 'ensureOrgPlan failed')
  }

  const { t } = await initServerI18n(['audit'])

  return (
    <ContentLayout
      title={
        <div className="flex gap-3 items-center">
          <span className="text-l font-semibold">{t('audit:module.audit_logs')}</span>
          <CustomToolTip content={t('audit:sub_title')}>
            <CircleHelp className="size-4 text-slate-500" />
          </CustomToolTip>
        </div>
      }
      isBackable={false}
    >
      {blocked ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-muted-foreground">
              {t('audit:access.premium_required')}
            </h3>
            <p className="text-sm text-muted-foreground mt-2">
              {t('audit:access.upgrade_message')}
            </p>
          </div>
        </div>
      ) : (
        <AuditLogsList />
      )}
    </ContentLayout>
  )
}
