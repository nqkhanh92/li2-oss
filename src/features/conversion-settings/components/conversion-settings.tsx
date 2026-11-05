'use client'

import { useOrganizationStoreProvider } from '@/shared/providers/organization-store-provider'
import { CurrencySettingsSection } from './currency-settings-section'

export const ConversionSettings = () => {
  const { organization } = useOrganizationStoreProvider()

  return (
    <div className="flex flex-col gap-6">
      <CurrencySettingsSection
        org_id={organization?.id || ''}
        currentCurrency={organization?.default_currency || 'USD'}
      />
    </div>
  )
}
