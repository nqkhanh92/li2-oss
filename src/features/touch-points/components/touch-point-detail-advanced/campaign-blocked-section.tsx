import { useTranslation } from 'react-i18next'
import { BanIcon } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { useParams, useRouter } from 'next/navigation'

export const CampaignBlockedSection = ({ campaignId }: { campaignId: string }) => {
  const { org_id } = useParams<{ org_id: string }>()
  const { t } = useTranslation(['common'])
  const router = useRouter()

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6">
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full blur-xl opacity-20 animate-pulse" />
        <div className="relative bg-gradient-to-r from-blue-500 to-purple-600 p-4 rounded-full">
          <BanIcon className="w-8 h-8 text-white" />
        </div>
      </div>

      <h2 className="text-2xl font-semibold text-foreground mb-2">
        {t('common:campaign_blocked.title')}
      </h2>

      <Button onClick={() => router.push(`/org/${org_id}/campaigns/${campaignId}`)}>
        EDIT IN CAMPAIGN
      </Button>

      <p className="text-sm text-slate-500 text-center max-w-md">
        {t('common:campaign_blocked.description')}
      </p>
    </div>
  )
}
