import { useState, useEffect } from 'react'
import { UseFormReturn } from 'react-hook-form'
import { checkSlugAvailability } from '@/app/actions/organization'
import { useDebounceFn } from '@/shared/hooks/use-debounce'
import { orgSlugSchema } from '@/shared/schemas/organizations'

export type SlugStatus = 'idle' | 'checking' | 'available' | 'unavailable'

export const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 64)
}

interface UseOrganizationSlugProps {
  form: UseFormReturn<any>
  initialSlug?: string
}

export const useOrganizationSlug = ({ form, initialSlug }: UseOrganizationSlugProps) => {
  const [slugStatus, setSlugStatus] = useState<SlugStatus>('idle')
  const [isManualSlug, setIsManualSlug] = useState(false)

  const checkSlug = useDebounceFn(async (slug: string) => {
    const slugSchemaValid = orgSlugSchema.safeParse(slug)

    if (!slug || !slugSchemaValid.success) {
      setSlugStatus('idle')
      return
    }

    setSlugStatus('checking')
    try {
      const result = await checkSlugAvailability(slug)
      setSlugStatus(result.available ? 'available' : 'unavailable')
    } catch {
      setSlugStatus('idle')
    }
  }, 1000)

  useEffect(() => {
    const subscription = form.watch((value, { name: fieldName }) => {
      if (fieldName === 'name' && !isManualSlug && value.name) {
        const generatedSlug = generateSlug(value.name)
        form.setValue('org_slug', generatedSlug)
        setSlugStatus('checking')
        checkSlug(generatedSlug)
      }
    })
    return () => subscription.unsubscribe()
  }, [form, isManualSlug])

  useEffect(() => {
    if (initialSlug) {
      checkSlug(initialSlug)
    }
  }, [initialSlug])

  const handleSlugChange = (slug: string) => {
    setIsManualSlug(true)
    setSlugStatus('checking')
    checkSlug(slug)
  }

  return {
    slugStatus,
    isManualSlug,
    setIsManualSlug,
    checkSlug,
    handleSlugChange,
  }
}
