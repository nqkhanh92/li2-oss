'use client'

import { useEffect, useRef, useState } from 'react'
import { UseFormReturn } from 'react-hook-form'
import { z } from 'zod'
import { fetchMetaTags } from '@/app/actions/utilities'
import { metaTagsSchema } from '@/shared/schemas/touch-points'

type Options = {
  /** Gate the fetch — when false, nothing runs. Default: true */
  enabled?: boolean
  /** Set meta_tags.enabled = true after a successful fetch. Default: false (preserves current value) */
  enableMetaTagsOnFetch?: boolean
  /** Optional schema to validate the URL before fetching */
  urlSchema?: { safeParse: (val: unknown) => { success: boolean } }
  /** Called after meta_tags form values are updated */
  onFetched?: (data: z.infer<typeof metaTagsSchema>) => void
}

export function useMetaTagsAutoFetch(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<any>,
  url: string | undefined,
  options: Options = {}
) {
  const { enabled = true, enableMetaTagsOnFetch = false, urlSchema, onFetched } = options
  const [isFetching, setIsFetching] = useState(false)

  // Keep onFetched stable without it being a useEffect dependency
  const onFetchedRef = useRef(onFetched)
  onFetchedRef.current = onFetched

  useEffect(() => {
    if (!url?.trim() || !enabled) return
    if (urlSchema && !urlSchema.safeParse(url).success) return

    setIsFetching(true)
    fetchMetaTags(url).then((result) => {
      if (result) {
        const parsed = metaTagsSchema.safeParse(result)
        if (parsed.success) {
          const currentMeta = form.getValues('meta_tags') ?? {}
          form.setValue('meta_tags', {
            enabled: false,
            ...currentMeta,
            ...(enableMetaTagsOnFetch ? { enabled: true } : {}),
            title: parsed.data.title,
            description: parsed.data.description,
            image: parsed.data.image,
            isAutoFetched: true,
          })
          onFetchedRef.current?.(parsed.data)
        }
      }
      setIsFetching(false)
    })
  }, [url, enabled]) // eslint-disable-line react-hooks/exhaustive-deps

  return { isFetching }
}
