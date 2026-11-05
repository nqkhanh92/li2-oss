import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { isCloud, UNMETERED_AI_CREDITS } from '@/shared/constants/edition'
import { EmptyState } from './empty-share'
import { SuggestionsSection } from './suggestion-section'
import { useGenerateSlug } from '../../hooks/mutations'
import { Coins, Loader2 } from 'lucide-react'
import { useGetOrganizationAICredits } from '@/features/organizations/hooks/queries/org-credit'
import { queryClient } from '@/shared/lib/react-query'
import { GetTouchPointObject } from '@/app/api/organizations/[org_id]/touch-points/route'
import { useIsMutating } from '@tanstack/react-query'
import { Typography } from '@/shared/components/ui/typography'
import { Badge } from '@/shared/components/ui/badge'

export type SlugSuggestion = {
  success: boolean
  slug: string
  alternatives: string[]
  provider_used: string
  key_identifier?: string
  confidence_score?: number
  processing_time_ms?: number
  cost_estimate?: number
  error?: {
    type: string
    message: string
    fallback_used?: boolean
  } | null
}

type AISlugSuggestionProps = {
  onSlugSelect: (slug: string) => void
  touch_point_id?: string
  url: string | undefined
  isInTp?: boolean
  defaultSuggestSlugs?: string[]
  onSuggestSlugsChange?: (slugs: string[]) => void
}

export const AISlugSuggestion = ({
  onSlugSelect,
  touch_point_id,
  url,
  isInTp = false,
  defaultSuggestSlugs = [],
  onSuggestSlugsChange,
}: AISlugSuggestionProps) => {
  const { org_id }: { org_id: string } = useParams()
  const { t } = useTranslation('touchpoint')
  const [error, setError] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<string[] | null>(null)
  useEffect(() => {
    setSuggestions(defaultSuggestSlugs)
  }, [defaultSuggestSlugs])

  const [selectedSlug, setSelectedSlug] = useState('')

  const { data: orgAICredits, isLoading: isLoadingOrgAICredits } =
    useGetOrganizationAICredits(org_id)

  /**
   * Bản OSS không đo tín dụng AI — người vận hành dùng khoá LLM của chính họ. Trả
   * `UNMETERED_AI_CREDITS` để mọi phép kiểm `> 0` / `<= 0` ở dưới không khoá nút, còn phần
   * HIỂN THỊ con số thì được gate riêng bằng `isCloud` (nếu không sẽ hiện 9007199254740991).
   */
  const creditsRemaining = useMemo(
    () => (isCloud ? orgAICredits?.ai_credits_balance || 0 : UNMETERED_AI_CREDITS),
    [orgAICredits]
  )
  const { mutateAsync: generateSlug } = useGenerateSlug(org_id)
  const isGeneratingSlug =
    useIsMutating({
      mutationKey: ['organizations', org_id, 'slugs', 'ai-generate'],
    }) > 0

  const generateSlugSuggestions = async (regenerate = false) => {
    if (!url) return toast.error('Please enter a valid destination URL')
    setError(null)
    try {
      const result = await generateSlug({
        url,
        touch_point_id: touch_point_id ? touch_point_id : undefined,
        regenerate: regenerate,
      })

      // Handle the response directly
      const newSuggestions = [result.data.slug, ...(result.data.alternatives ?? [])]
      setSuggestions(newSuggestions)
      setSelectedSlug(result.data.slug)
      onSuggestSlugsChange?.(newSuggestions)

      if (regenerate) {
        queryClient.setQueryData<GetTouchPointObject>(
          ['organizations', org_id, 'touch-points', touch_point_id],
          (oldData) =>
            oldData
              ? {
                  ...oldData,
                  suggested_slugs: newSuggestions,
                }
              : oldData
        )
      }
    } catch {
      setError('Failed to generate suggestions. Please try again.')
    }
  }

  const handleSlugSelect = (slug: string) => {
    setSelectedSlug(slug)
    onSlugSelect(slug)
  }

  const handleRegenerate = async () => {
    await generateSlugSuggestions(true)
  }

  return (
    <div className="flex flex-col gap-3 py-3 px-4">
      <Badge className="self-baseline" color="#000EEE" size={'xs'}>
        {t('common:label.experimental')}
      </Badge>
      <div className="flex flex-col gap-3">
        {isLoadingOrgAICredits ? (
          <div className="flex flex-row justify-between items-center gap-4">
            <span className="text-[15px] leading-[22px] font-semibold text-foreground w-full">
              {t('ai-suggested-slugs.label')}
            </span>
            <p className="text-xs gap-[2px] flex flex-row text-green-600 justify-end items-center md:w-full w-fit">
              <Coins className="h-[18px] w-[18px]" />
              {!isInTp && (
                <span className="font-normal md:block hidden">
                  {t('common:text.credits_left')}:
                </span>
              )}
              <Loader2 className="h-[18px] w-[18px] animate-spin" />
            </p>
          </div>
        ) : (
          <div className="flex flex-row justify-between items-center gap-4">
            {/* <span className="text-[15px] leading-[22px] font-semibold text-foreground w-full">
              {t('ai-suggested-slugs.label')}
            </span> */}
            {/* GEN AI SLUG BUTTON */}
            <EmptyState
              generateSlugSuggestions={generateSlugSuggestions}
              regenerateSlugSuggestions={handleRegenerate}
              isLoading={isGeneratingSlug}
              creditsRemaining={creditsRemaining}
              defaultSuggestSlugs={defaultSuggestSlugs}
            />
            {isCloud && creditsRemaining > 0 && (
              <p className="text-xs gap-[2px] flex flex-row text-green-600 justify-end items-center md:w-full w-fit">
                <Coins className="h-[18px] w-[18px]" />
                {!isInTp && (
                  <span className="font-normal md:block hidden">
                    {t('common:text.credits_left')}:
                  </span>
                )}
                <span className="font-medium">{creditsRemaining}</span>
              </p>
            )}
            {isCloud && creditsRemaining <= 0 && (
              <p className="text-xs gap-[2px] flex flex-row text-red-600 justify-end items-center md:w-full w-fit">
                <Coins className="h-[18px] w-[18px]" />
                {!isInTp && (
                  <span className="font-normal md:block hidden">
                    {t('common:text.credits_left')}:
                  </span>
                )}
                <span className="font-medium">{creditsRemaining}</span>
              </p>
            )}
          </div>
        )}
      </div>

      {suggestions && (
        <div>
          <span className="text-xs font-medium">{t('common:text.suggested')}:</span>
          {!suggestions || suggestions.length === 0 ? (
            <div className="py-2 text-slate-600 font-normal text-sm flex flex-row gap-2 items-center">
              {t('common:text.no_ai_suggestion_yet')}
            </div>
          ) : (
            <SuggestionsSection
              suggestions={suggestions}
              selectedSlug={selectedSlug}
              handleSlugSelect={handleSlugSelect}
              error={error}
            />
          )}
        </div>
      )}
    </div>
  )
}
