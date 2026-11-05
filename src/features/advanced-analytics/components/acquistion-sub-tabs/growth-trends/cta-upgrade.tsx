import { Button } from '@/shared/components/ui/button'
import { Crown } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export const CTAUpgrade = () => {
  const { t } = useTranslation('advanced_analytics')
  return (
    <div className="bg-linear-to-r from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200 text-center">
      <Crown className="w-8 h-8 text-green-500 mx-auto mb-3" />
      <h3 className="text-lg font-bold text-green-900 mb-2">{t('growth_trends.cta_upgrade.title')}</h3>
      <p className="text-green-700 text-sm mb-4">
        {t('growth_trends.cta_upgrade.description')}
      </p>
      <Button
        type="button"
        className="bg-linear-to-r from-green-500 to-emerald-500 text-white px-6 py-2 rounded-lg font-medium hover:from-green-600 hover:to-emerald-600 transition-all"
      >
        {t('growth_trends.cta_upgrade.btn')}
      </Button>
    </div>
  )
}
