'use client'

import { useEffect, useState } from 'react'
import { useWatch } from 'react-hook-form'
import { useShortLinkFormNavigation } from './form-navigation-context'
import { useTranslation } from 'react-i18next'
import { Separator } from '@/shared/components/ui/separator'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/components/ui/form'
import { Input } from '@/shared/components/ui/input'

import { DestinationUrlField } from '@/features/short-links/components/short-link-form/destination-url-field'
import { ShortLinkConfiguration } from '@/features/touch-points/components/forms/fields/short-link-configuration'

import { TagSelect } from '@/features/tags/components/tag-select'

import { useUrlVerification } from '@/features/touch-points/hooks/use-url-verification'
import { usePlanFeatures } from '@/features/touch-points/hooks/use-plan-features'

import type { UseFormReturn } from 'react-hook-form'
import type { ShortLinkFormValues } from '@/features/short-links/schemas/short-link-form.schema'

interface BasicEditingTabProps {
  form: UseFormReturn<ShortLinkFormValues>
  isEditMode?: boolean
}

export const BasicEditingTab = ({ form, isEditMode }: BasicEditingTabProps) => {
  const { t } = useTranslation(['common', 'touchpoint', 'collection'])

  const [tempSuggestSlugs, setTempSuggestSlugs] = useState<string[]>([])

  const { urlVerification, isVerifying } = useUrlVerification()

  // When another section requests focus on a Basic-Settings field (e.g., the
  // Smart Targeting "edit default destination" pencil), focus it once we're
  // mounted, then clear the request so it fires only once per click. rAF
  // defers until the field's <input> has rendered after the tab switch.
  const { pendingFocus, consumeFocus } = useShortLinkFormNavigation()
  useEffect(() => {
    if (!pendingFocus) return
    const id = window.requestAnimationFrame(() => {
      form.setFocus(pendingFocus, { shouldSelect: true })
      consumeFocus()
    })
    return () => window.cancelAnimationFrame(id)
  }, [pendingFocus, consumeFocus, form])
  const planFeatures = usePlanFeatures()

  const watchDestination = useWatch({ control: form.control, name: 'content_value' })

  return (
    <>
      <div className="flex flex-col gap-4 p-6">
        {/* Destination URL */}
        <DestinationUrlField
          control={form.control}
          urlVerification={urlVerification}
          isVerifying={isVerifying}
          isEditMode={isEditMode}
          required
        />

        {/* Smart Link Settings */}
        <ShortLinkConfiguration
          control={form.control}
          enableCustomDomain={!!planFeatures.enableCustomDomain}
          disableDomain={isEditMode}
          mode={isEditMode ? 'edit' : 'create'}
          destinationUrl={watchDestination}
          tempSuggestSlugs={tempSuggestSlugs}
          onSlugSelect={(slug) => form.setValue('slug', slug)}
          onSuggestSlugsChange={setTempSuggestSlugs}
          triggerSlugCheck={() => form.trigger('slug')}
          currentSlug={form.formState.defaultValues?.slug ?? undefined}
        />

        <Separator />

        {/* Title */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem className="gap-1">
              <FormLabel className="leading-5">
                {t('touchpoint:touch_point_create.form.linkNameLabel')}
              </FormLabel>
              <FormControl>
                <Input
                  variant="default"
                  placeholder={t('touchpoint:touch_point_create.form.linkNamePlaceholder')}
                  className="bg-slate-100"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Tags */}
        <FormField
          control={form.control}
          name="tags"
          render={({ field }) => (
            <FormItem className="gap-1">
              <FormLabel className="leading-5">
                {t('touchpoint:touch_point_create.form.tagSelectLabel')}
              </FormLabel>
              <FormControl>
                <TagSelect
                  placeholder={t('touchpoint:form.placeholders.tags')}
                  initialValues={field.value}
                  onChange={field.onChange}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Space và Conversion Tracking đã gỡ khỏi tab này — chủ sản phẩm 2026-10-23.
            Trường gán tag cho link thì GIỮ NGUYÊN ở đây; cái chuyển vào sidebar (dưới Link
            Cloaking) là trang QUẢN LÝ tag, xem `sections/tags-section.tsx`.
            `collection_id` và `conversion_tracking` vẫn còn trong schema nên link cũ giữ
            nguyên giá trị đã lưu. */}
      </div>
    </>
  )
}
