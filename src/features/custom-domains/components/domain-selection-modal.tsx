'use client'

import { Button } from '@/shared/components/ui/button'
import { useTranslation } from 'react-i18next'
import { UserRoundCog, Globe } from 'lucide-react'
import { DialogCustomRef } from '@/shared/components/customize/custom-dialog'
import { RefObject } from 'react'

type DomainSelectionModalProps = {
  onSelectCustomDomain: () => void
  onSelectSubdomain: () => void
}

export const DomainSelectionModal = ({
  onSelectCustomDomain,
  onSelectSubdomain,
}: DomainSelectionModalProps) => {
  const { t } = useTranslation(['domain', 'common'])

  return (
    <div className="flex flex-col gap-4 py-2">
      <p className="text-sm text-slate-600">{t('domain:domainSelection.description')}</p>

      {/* Custom Domain Option */}
      <div
        className="group relative flex flex-col gap-3 rounded-lg border-2 border-slate-200 p-6 hover:border-primary hover:bg-slate-50 cursor-pointer transition-all"
        onClick={onSelectCustomDomain}
      >
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 shrink-0">
            <UserRoundCog className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-base text-slate-900">
              {t('domain:domainSelection.customDomain.title')}
            </h3>
            <p className="text-sm text-slate-600 mt-1">
              {t('domain:domainSelection.customDomain.description')}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                {t('domain:domainSelection.customDomain.features.professional')}
              </span>
              <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                {t('domain:domainSelection.customDomain.features.fullControl')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Free Subdomain Option */}
      <div
        className="group relative flex flex-col gap-3 rounded-lg border-2 border-slate-200 p-6 hover:border-primary hover:bg-slate-50 cursor-pointer transition-all"
        onClick={onSelectSubdomain}
      >
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 shrink-0">
            <Globe className="h-6 w-6 text-green-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-base text-slate-900">
              {t('domain:domainSelection.subdomain.title')}
            </h3>
            <p className="text-sm text-slate-600 mt-1">
              {t('domain:domainSelection.subdomain.description')}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700">
                {t('domain:domainSelection.subdomain.features.free')}
              </span>
              <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700">
                {t('domain:domainSelection.subdomain.features.instant')}
              </span>
              <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700">
                {t('domain:domainSelection.subdomain.features.noDns')}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
