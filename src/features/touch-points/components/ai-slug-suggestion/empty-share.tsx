import { Button } from '@/shared/components/ui/button'
import { Loader2, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

type EmptyShareProps = {
  generateSlugSuggestions: () => void
  regenerateSlugSuggestions: () => void
  isLoading: boolean
  creditsRemaining: number
  defaultSuggestSlugs?: string[]
}

export const EmptyState = ({
  generateSlugSuggestions,
  regenerateSlugSuggestions,
  isLoading,
  creditsRemaining,
  defaultSuggestSlugs = [],
}: EmptyShareProps) => {
  const [isClickGenerateSlug, setIsClickGenerateSlug] = useState(false)
  const { t } = useTranslation('touchpoint')
  return (
    <div className="flex flex-row items-center justify-start text-center gap-6 w-full">
      <Button
        disabled={isLoading}
        onClick={() => {
          setIsClickGenerateSlug(true)
          if (isClickGenerateSlug || defaultSuggestSlugs.length > 0) {
            regenerateSlugSuggestions()
          } else {
            generateSlugSuggestions()
          }
        }}
        // disabled={isLoading || creditsRemaining <= 0}
        size="sm"
        className="rounded-[8px] px-4 py-2 text-white text-sm font-medium gap-[6px] bg-[#000E29]"
        type="button"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin text-white" />{' '}
            {t('ai-suggested-slugs.generating')}...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4 text-white" /> {t('ai-suggested-slugs.button_generate')}
          </>
        )}
      </Button>
    </div>
  )
}
