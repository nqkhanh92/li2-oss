'use client'

import { useEffect, useRef, useState } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import type { z } from 'zod'
import { axiosApiInstance } from '@/shared/lib/axios'
import { metaTagsSchema } from '@/shared/schemas/touch-points'
import equal from 'fast-deep-equal'
import { defaultMetaTags } from '@/shared/constants'
import { useUpdateTouchPoint } from '@/features/touch-points/hooks/mutations'
import { useParams } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'

type MetaTagsData = z.infer<typeof metaTagsSchema>

type Options = {
  /** Gate the entire hook. Default: true */
  enabled?: boolean
  /** Set meta_tags.enabled = true after a successful fetch. Default: false */
  enableMetaTagsOnFetch?: boolean
  /** Optional schema to validate the URL before fetching */
  urlSchema?: { safeParse: (val: unknown) => { success: boolean } }
  /** Called after meta_tags form values are updated */
  onFetched?: (data: MetaTagsData) => void
  /**
   * 'create' (default): fetch on URL change and set form values only.
   * 'edit': same as create, but also silently PATCHes the touch point the
   *         first time meta tags are fetched when the stored meta tags were
   *         empty or equal to the default at mount time.
   */
  mode?: 'create' | 'edit'
}

function isDefaultOrEmpty(meta: unknown): boolean {
  if (!meta || Object.keys(meta).length === 0) return true
  return equal(meta, defaultMetaTags)
}

export function useShortLinkMetaTags(
  form: UseFormReturn<any>,
  url: string | undefined,
  options: Options = {}
) {
  const {
    enabled = true,
    enableMetaTagsOnFetch = false,
    urlSchema,
    onFetched,
    mode = 'create',
  } = options

  const { org_id, touch_point_id } = useParams<{ org_id: string; touch_point_id?: string }>()
  const queryClient = useQueryClient()

  // Always call the hook (rules of hooks), but mutateAsync is only invoked
  // in edit mode when shouldSilentSaveRef is true.
  const { mutateAsync: updateTouchPoint } = useUpdateTouchPoint(org_id, touch_point_id ?? '', true)

  // Evaluated once at mount — shared by both refs below.
  const initialMetaIsDefault = isDefaultOrEmpty(form.getValues('meta_tags'))

  // In edit mode, skip the initial fetch when meta tags are already customized.
  // Pre-seeding lastFetchedUrlRef ensures isFetching is false on the first render
  // and the effect bails out without making a network request.
  const skipInitialFetchRef = useRef(mode === 'edit' && !initialMetaIsDefault)

  // Track the last URL for which a fetch completed. Lets us derive isFetching
  // synchronously (same render that `url` changes) so there's no one-render gap
  // between the new URL appearing and the loading mask showing.
  const lastFetchedUrlRef = useRef<string | undefined>(
    skipInitialFetchRef.current ? url : undefined
  )
  const [isFetchingInFlight, setIsFetchingInFlight] = useState(false)

  // Determine once at mount whether the silent PATCH should fire.
  // Conditions (all must be true):
  //   1. edit mode
  //   2. canEdit — read from the cache that useSuspenseQuery already populated
  //   3. meta tags are absent or equal to the default (never customised)
  const shouldSilentSaveRef = useRef(
    mode === 'edit' &&
      initialMetaIsDefault &&
      (queryClient.getQueryData<{ canEdit: boolean }>([
        'organizations',
        org_id,
        'touch-points',
        touch_point_id,
      ])?.canEdit ??
        false)
  )

  const onFetchedRef = useRef(onFetched)
  onFetchedRef.current = onFetched

  const isValidUrl = !!url?.trim() && enabled && (!urlSchema || urlSchema.safeParse(url).success)
  const isFetching = isValidUrl && (url !== lastFetchedUrlRef.current || isFetchingInFlight)

  useEffect(() => {
    if (!isValidUrl) return

    // Edit mode: skip the very first fetch when meta tags are already populated.
    // lastFetchedUrlRef was pre-seeded with the initial URL, so subsequent
    // user-triggered URL changes will still fetch normally.
    if (skipInitialFetchRef.current) {
      skipInitialFetchRef.current = false
      return
    }

    const controller = new AbortController()

    setIsFetchingInFlight(true)
    axiosApiInstance
      .get('/public/meta-tags', { params: { url }, signal: controller.signal })
      .then((res) => {
        if (!res.data) return
        const parsed = metaTagsSchema.safeParse(res.data)
        if (!parsed.success) return

        const newValues = {
          enabled: false,
          ...(form.getValues('meta_tags') ?? {}),
          ...(enableMetaTagsOnFetch ? { enabled: true } : {}),
          title: parsed.data.title,
          description: parsed.data.description,
          image: parsed.data.image,
          isAutoFetched: true,
        }

        // Always update the form (both create and edit)
        form.setValue('meta_tags', newValues)

        // In edit mode: silently persist to the server the first time,
        // only when meta tags were absent/default at mount time.
        if (shouldSilentSaveRef.current) {
          shouldSilentSaveRef.current = false // one-time only
          updateTouchPoint({ data: { meta_tags: newValues } }).catch(() => {})
        }

        onFetchedRef.current?.(parsed.data)
      })
      .catch(() => {})
      .finally(() => {
        // Skip state updates for aborted (superseded) requests to avoid
        // a stale fetch overwriting lastFetchedUrlRef and getting stuck.
        if (controller.signal.aborted) return
        lastFetchedUrlRef.current = url
        setIsFetchingInFlight(false)
      })

    return () => controller.abort()
  }, [url, enabled]) // eslint-disable-line react-hooks/exhaustive-deps

  return { isFetching }
}
