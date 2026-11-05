import { Button } from '@/shared/components/ui/button'
import { Crown } from 'lucide-react'
import { useTranslation } from 'react-i18next'

const CtaUpgrade = () => {
  const { t } = useTranslation('advanced_analytics')
  return (
    <div className="bg-linear-to-r from-purple-50 to-indigo-50 rounded-xl p-6 border border-purple-200 text-center">
      <Crown className="w-8 h-8 text-purple-500 mx-auto mb-3" />
      <h3 className="text-lg font-bold text-purple-900 mb-2">{t('behaviors.user_journeys.cta.title')}</h3>
      <p className="text-purple-700 text-sm mb-4">
        {t('behaviors.user_journeys.cta.description')}
      </p>
      <Button
        type="button"
        className="h-auto bg-linear-to-r from-purple-500 to-indigo-500 text-white px-6 py-2 rounded-lg font-medium hover:from-purple-600 hover:to-indigo-600 transition-all"
      >
        {t('behaviors.user_journeys.cta.btn')}
      </Button>
    </div>
  )
}

export default CtaUpgrade
