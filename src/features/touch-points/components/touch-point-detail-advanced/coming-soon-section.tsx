import { useTranslation } from 'react-i18next'
import { Sparkles } from 'lucide-react'

export const ComingSoonSection = () => {
  const { t } = useTranslation(['common'])

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6">
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full blur-xl opacity-20 animate-pulse" />
        <div className="relative bg-gradient-to-r from-blue-500 to-purple-600 p-4 rounded-full">
          <Sparkles className="w-8 h-8 text-white" />
        </div>
      </div>

      <h2 className="text-2xl font-semibold text-foreground mb-2">
        {t('common:coming_soon.title')}
      </h2>

      <p className="text-sm text-slate-500 text-center max-w-md">
        {t('common:coming_soon.description')}
      </p>
    </div>
  )
}
