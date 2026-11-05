'use client'

import { Card, CardContent, CardHeader } from '@/shared/components/ui/card'
import Link from 'next/link'
import { LockableSection } from '../../../../shared/components/customize/lockable-section'
import { useTranslation } from 'react-i18next'
import { mappingIntegrationType } from '@/features/integrations/constants'

export const IntegrationTypeList = ({ org_id }: { org_id: string }) => {
  const { t } = useTranslation('integration')
  return (
    <div className="space-y-4">
      <h4 className="text-lg font-semibold">{t('description')}</h4>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {Object.entries(mappingIntegrationType).map(([key, interactionType]) => {
          const Icon = interactionType.icon
          return (
            <LockableSection
              key={key}
              className="rounded-[8px]"
              lockBy="coming_soon"
              locked={!interactionType.enabled}
            >
              <Link href={`/org/${org_id}/integrations/${key.toLowerCase()}`}>
                <Card>
                  <CardHeader>
                    <Icon className="w-[48px]! h-[48px]!" />
                  </CardHeader>
                  <CardContent>
                    <p className="text-[15px] font-semibold">{t(interactionType.trans_key)}</p>
                    <p className="text-sm text-slate-600 text-wrap">
                      {t(interactionType.description)}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            </LockableSection>
          )
        })}
      </div>
    </div>
  )
}
