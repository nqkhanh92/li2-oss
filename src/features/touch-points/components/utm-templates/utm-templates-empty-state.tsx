'use client'

import { DotLottieReact } from '@lottiefiles/dotlottie-react'
import { Button } from '@/shared/components/ui/button'
import { useTranslation } from 'react-i18next'

interface UTMTemplatesEmptyStateProps {
  onCreateClick: () => void
  isBlocked?: boolean
}

export const UTMTemplatesEmptyState = ({
  onCreateClick,
  isBlocked = false,
}: UTMTemplatesEmptyStateProps) => {
  const { t } = useTranslation('common')

  return (
    <div className="flex flex-col items-center justify-center py-12 px-6">
      <div className="w-64 h-64 mb-6">
        <DotLottieReact
          src="/assets/animations/Search List.lottie"
          loop
          autoplay
        />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
        {t('common:empty.no_templates')}
      </h3>
      <p className="text-gray-600 dark:text-gray-400 text-center max-w-md mb-6">
        {t('common:empty.no_templates_description')}
      </p>
      <Button        
        onClick={onCreateClick}
        disabled={isBlocked}
        size="sm"
        className="gap-2"
      >
        {t('buttons.create', { field: t('module.utmTemplates') })}
      </Button>
    </div>
  )
}
