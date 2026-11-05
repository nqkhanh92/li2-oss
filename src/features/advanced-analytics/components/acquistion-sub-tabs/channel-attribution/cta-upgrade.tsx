import { Button } from '@/shared/components/ui/button'
import { Crown } from 'lucide-react'
import { useTranslation } from 'react-i18next'

const CTAUpgrade = () => {
  const { t } = useTranslation('advanced_analytics')
  return (
    <div className="bg-linear-to-r from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-200 text-center">
      <Crown className="w-8 h-8 text-indigo-500 mx-auto mb-3" />
      <h3 className="text-lg font-bold text-indigo-900 mb-2">{t('channel_attribution.cta_upgrade.title')}</h3>
      <p className="text-indigo-700 text-sm mb-4">
        {t('channel_attribution.cta_upgrade.description')}
      </p>
      <Button
        type="button"
        className="bg-linear-to-r from-indigo-500 to-purple-500 text-white px-6 py-2 rounded-lg font-medium hover:from-indigo-600 hover:to-purple-600 transition-all"
      >
        {t('channel_attribution.cta_upgrade.btn')}
      </Button>
    </div>
  )
}

export default CTAUpgrade
