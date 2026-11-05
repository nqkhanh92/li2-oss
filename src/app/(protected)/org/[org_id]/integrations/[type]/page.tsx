import { ContentBlock } from '@/shared/components/customize/content-block'
import { IntegrationList } from '@/features/integrations/components/lists/integration-list'
import { ContentLayout } from '@/shared/components/layout/content-layout'
import { initServerI18n } from '@/shared/lib/i18n/i18n-server'
import { ensurePolicy, getPermissionScopeOrThrow } from '@/shared/lib/permission/permissions'
import { policies } from '@/shared/lib/permission/policy'
import { ensureOrgPlan } from '@/shared/lib/plan/plans'
import { mappingIntegrationType } from '@/features/integrations/constants'
import { PLAN_LIMIT_KEYS } from '@/shared/types/plan-permission'
import { ROLE_PERMISSION_KEYS } from '@/shared/types/role-permission'
import { notFound } from 'next/navigation'
import { Metadata } from 'next'

export default async function IntegrationsPage({
  params,
}: {
  params: { org_id: string; type: string }
}) {
  /* 
    1. Check plan limit
    2. Check permission
    3. If both are ok, render the page
    4. If plan limit is exceeded, render the plan limit exceeded page
    5. If permission is not granted, render the permission not granted page
  */

  const { type } = params
  const key = type.toUpperCase() as keyof typeof mappingIntegrationType
  const integration = mappingIntegrationType[key]
  if (!integration) {
    notFound()
  }
  // let planBlocked = false;
  let permissionBlocked = false

  // /* Check plan limit */
  // try {
  //   await ensureOrgPlan(params.org_id, PLAN_LIMIT_KEYS.MAX_INTEGRATIONS_PER_ORG);
  // } catch (error) {
  //   planBlocked = true;
  // }
  // if(planBlocked){
  //   return (
  //     <ContentLayout title={`${integration?.label} integrations`}>
  //       <ContentBlock
  //         title="You've reach your limit"
  //         description="You've used all of your integrations. But don't let that stop you. Upgrade for a higher limit and other great features."
  //         blocked={planBlocked}
  //         blockBy="plan"
  //       >
  //         <IntegrationList type={key} />
  //       </ContentBlock>
  //     </ContentLayout>
  //   );
  // }

  /* Check permission */
  try {
    await getPermissionScopeOrThrow(params.org_id, ROLE_PERMISSION_KEYS.VIEW_INTEGRATIONS)
  } catch (error) {
    permissionBlocked = true
  }

  const { t } = await initServerI18n()

  if (permissionBlocked) {
    return (
      <ContentLayout title={t('common:buttons.integration', { field: integration?.label })}>
        <ContentBlock
          title={t('common:messages.dont_have_permission')}
          description={t('common:messages.dont_have_permission_to_view_integrations')}
          blocked={permissionBlocked}
          blockBy="permission"
        >
          <IntegrationList type={key} />
        </ContentBlock>
      </ContentLayout>
    )
  }

  return (
    <ContentLayout title={t('common:buttons.integration', { field: integration?.label })}>
      <IntegrationList type={key} />
    </ContentLayout>
  )
}
