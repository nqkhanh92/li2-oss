'use client'

import { Organization } from '@/app/api/organizations/route'
import { CustomDomains } from '@/features/custom-domains/components/custom-domains'
import { DeleteOrganization } from '@/features/organizations/components/forms/delete-form'
import { EditOrganizationForm } from '@/features/organizations/components/forms/edit-form'
import { OrgMembers } from '@/features/organizations/components/members/org-members'
import { AuditLogsList } from '@/features/audit-logs/components/audit-logs-list'
import { useTranslation } from 'react-i18next'
import { SETTING_SECTIONS } from '../../constants/sections'
import { useOrganizationStoreProvider } from '@/shared/providers/organization-store-provider'
import { ROLE_PERMISSION_KEYS } from '@/shared/types/role-permission'
import { usePlanFeatures } from '@/features/touch-points/hooks'
import { LockableSection } from '@/shared/components/customize/lockable-section'

type Props = {
  organization: Organization | null
}

export const OrganizationTab = ({ organization }: Props) => {
  const { t } = useTranslation('setting')
  const { hasPermission } = useOrganizationStoreProvider()
  const { enableAuditLogs } = usePlanFeatures()
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 items-start" id={SETTING_SECTIONS.ORGANIZATION_MEMBER}>
        <span className="text-lg font-semibold text-foreground">
          {t('sidebar.organization.sub_label.member')}
        </span>
        <div className="flex flex-col p-6 bg-white rounded-2xl w-full">
          <OrgMembers />
        </div>
      </div>

      {hasPermission(ROLE_PERMISSION_KEYS.VIEW_AUDIT_LOGS) && (
        <div
          className="flex flex-col gap-4 items-start"
          id={SETTING_SECTIONS.ORGANIZATION_AUDIT_LOGS}
        >
          <span className="text-lg font-semibold text-foreground">
            {t('sidebar.organization.sub_label.audit_logs')}
          </span>
          <div className="flex flex-col p-6 bg-white rounded-2xl w-full">
            <LockableSection locked={!enableAuditLogs} lockBy="plan" lockText="Enterprise Feature">
              <AuditLogsList />
            </LockableSection>
          </div>
        </div>
      )}
      {hasPermission(ROLE_PERMISSION_KEYS.MANAGE_ORGANIZATION) && (
        <div className="flex flex-col gap-4 items-start" id={SETTING_SECTIONS.ORGANIZATION_EDIT}>
          <span className="text-lg font-semibold text-foreground">
            {t('setting:labels.orgEditSectionTitle')}
          </span>
          <div className="flex flex-col p-6 bg-white rounded-2xl w-full">
            <EditOrganizationForm initialValues={organization} />
          </div>
        </div>
      )}
      {hasPermission(ROLE_PERMISSION_KEYS.DELETE_ORAGNIZATION) && (
        <div className="flex flex-col gap-4 items-start" id={SETTING_SECTIONS.ORGANIZATION_DELETE}>
          <span className="text-lg font-semibold text-foreground">
            {t('common:buttons.delete', {
              field: t('common:module.organization'),
            })}
          </span>
          <div className="flex flex-col p-6 bg-white rounded-2xl w-full">
            <DeleteOrganization
              initialValues={organization}
              title={t('common:buttons.delete', {
                field: t('common:module.organization'),
              })}
              description={t('common:messages.delete_dialog', {
                field: t('common:module.organization'),
              })}
              buttonText={t('common:buttons.delete', {
                field: t('common:module.organization'),
              })}
            />
          </div>
        </div>
      )}
      <div className="flex flex-col gap-4 items-start h-0 md:h-[calc(100svh-60px-52px-222px)]"></div>
    </div>
  )
}
