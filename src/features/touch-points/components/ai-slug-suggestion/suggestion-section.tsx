import { AlertCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { ActionsBar } from './action-bar'
import { SuggestionItem } from './suggestion-item'

type SuggestionSectionProps = {
  suggestions: string[] | null
  selectedSlug: string
  handleSlugSelect: (slug: string) => void
  error: string | null
}

export const SuggestionsSection = ({
  suggestions,
  selectedSlug,
  handleSlugSelect,
  error,
}: SuggestionSectionProps) => {
  const { t } = useTranslation()
  // Merge slug + alternatives safely
  const allSuggestions = suggestions
    ? suggestions.filter((s): s is string => Boolean(s && s.trim()))
    : []
  return (
    <div className="flex flex-col gap-2">
      {/* Suggestions List */}
      <div className="flex md:flex-row flex-col gap-2 flex-wrap w-full">
        {allSuggestions.slice(0, 4).map((s, i) => (
          <SuggestionItem
            key={s ?? i}
            suggestion={s}
            selectedSlug={selectedSlug}
            handleSlugSelect={handleSlugSelect}
          />
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 text-sm text-red-500 bg-red-50 rounded-md">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Actions + Credits */}
      {/* <ActionsBar
        creditsRemaining={creditsRemaining}
        maxCredits={maxCredits}
        isLoading={isLoading}
        handleRegenerate={handleRegenerate}
      /> */}
    </div>
  )
}
