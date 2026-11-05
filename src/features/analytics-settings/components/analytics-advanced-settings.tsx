'use client'

import { useOrganizationStoreProvider } from '@/shared/providers/organization-store-provider'
import { useGetAnalyticsSettings } from '../hooks/queries'
import { AllowedHostnamesSection } from './allowed-hostnames-section'
import { DataCollectionRulesSection } from './data-collection-rules-section'
import { DebugModeSection } from './debug-mode-section'
import { Skeleton } from '@/shared/components/ui/skeleton'

export const AnalyticsAdvancedSettings = () => {
  const { organization } = useOrganizationStoreProvider()
  const org_id = organization?.id || ''

  const { data: settings, isLoading } = useGetAnalyticsSettings(org_id)

  if (isLoading) {
    return (
      <>
        <Skeleton className="h-[120px] rounded-2xl" />
        <Skeleton className="h-[200px] rounded-2xl" />
        <Skeleton className="h-[120px] rounded-2xl" />
      </>
    )
  }

  if (!settings) return null

  return (
    <>
      <div className="flex flex-col gap-4 items-start">
        <span className="text-lg font-semibold text-foreground">Allowed Hostnames</span>
        <div className="flex flex-col p-6 bg-white rounded-2xl w-full">
          <AllowedHostnamesSection org_id={org_id} hostnames={settings.allowed_hostnames} />
        </div>
      </div>

      <div className="flex flex-col gap-4 items-start">
        <span className="text-lg font-semibold text-foreground">Data Collection Rules</span>
        <div className="flex flex-col p-6 bg-white rounded-2xl w-full">
          <DataCollectionRulesSection org_id={org_id} rules={settings.data_collection_rules} />
        </div>
      </div>

      <div className="flex flex-col gap-4 items-start">
        <span className="text-lg font-semibold text-foreground">Debug Mode</span>
        <div className="flex flex-col p-6 bg-white rounded-2xl w-full">
          <DebugModeSection org_id={org_id} debug_mode_enabled={settings.debug_mode_enabled} />
        </div>
      </div>
    </>
  )
}
