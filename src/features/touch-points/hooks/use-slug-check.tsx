import { useEffect, useMemo, useState } from 'react'
import { Control, useWatch } from 'react-hook-form'
import { CheckCircle2, XCircle, LoaderCircle } from 'lucide-react'
import { useDebounceFn } from '@/shared/hooks/use-debounce'
import { slugSchema } from '@/shared/schemas/slug'
import { useSlugValidation } from './use-slug-validation'

interface UseSlugCheckOptions {
  control: Control<any>
  onTriggerValidation?: () => void
  currentSlug?: string
}

export function useSlugCheck({ control, onTriggerValidation, currentSlug }: UseSlugCheckOptions) {
  const { mutateAsync: checkSlug, isPending: isCheckingSlug } = useSlugValidation()
  const [slugStatus, setSlugStatus] = useState<'available' | 'taken' | null>(null)

  const slug = useWatch({ control, name: 'slug' })

  const checkSlugAvailability = useDebounceFn(async () => {
    onTriggerValidation?.()
    if (slug && slugSchema.safeParse(slug).success) {
      // Skip validation if slug hasn't changed from the current one
      if (currentSlug && slug === currentSlug) {
        setSlugStatus(null)
        return
      }
      const { exists } = await checkSlug(slug)
      setSlugStatus(exists ? 'taken' : 'available')
    }
  }, 500)

  useEffect(() => {
    setSlugStatus(null)
    checkSlugAvailability()
  }, [slug])

  const slugStatusIcon = useMemo(() => {
    if (isCheckingSlug) return <LoaderCircle className="size-4 text-slate-500 animate-spin" />
    if (slugStatus === 'available') return <CheckCircle2 className="size-4 text-green-500" />
    if (slugStatus === 'taken') return <XCircle className="size-4 text-red-500" />
    return null
  }, [slugStatus, isCheckingSlug])

  return {
    slugStatus,
    slugStatusIcon,
    isCheckingSlug,
  }
}
