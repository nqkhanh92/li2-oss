import { Badge } from '@/shared/components/ui/badge'
import { cn } from '@/shared/lib/cn'
import { Sparkles } from 'lucide-react'

export const SuggestionItem = ({ suggestion, selectedSlug, handleSlugSelect }: any) => {
  return (
    <Badge
      className={cn(
        'w-fit flex items-center justify-start px-3 py-1 rounded-full cursor-pointer transition-colors bg-slate-100 hover:bg-slate-200 gap-[2px] text-slate-600'
      )}
      onClick={() => handleSlugSelect(suggestion)}
    >
      <Sparkles className="h-4 w-4" />
      <span className="text-xs">{suggestion}</span>
    </Badge>
  )
}
