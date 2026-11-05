'use client'

import React from 'react'
import { Textarea } from '@/shared/components/ui/textarea'
import UploadFile from '@/shared/components/customize/upload-file'
import { parse } from 'tldts'
import { useFormContext } from 'react-hook-form'
import {
  advancedTouchPointUpdateSchema,
  allowedMetaTagImageFormat,
} from '@/shared/schemas/touch-points'
import { z } from 'zod'
import { FormField, FormItem, FormLabel, FormMessage } from '@/shared/components/ui/form'
import Image from 'next/image'
import { ImagePlaceholderIcon } from '@/shared/components/icons/image-placeholder-icon'
import { defaultMetaTags } from '@/shared/constants'
import { useOrganizationStoreProvider } from '@/shared/providers/organization-store-provider'
import { LockableSection } from '@/shared/components/customize/lockable-section'
import { useTranslation } from 'react-i18next'

type TouchPointMetaDataFormProps = {
  short_url: string
}

export const TouchPointMetaDataForm = ({ short_url }: TouchPointMetaDataFormProps) => {
  const { control, watch } = useFormContext<z.infer<typeof advancedTouchPointUpdateSchema>>()
  const { orgPlan } = useOrganizationStoreProvider()
  const watchMetadata = watch('meta_tags')
  const metaTags = {
    title: watchMetadata?.title || defaultMetaTags.title,
    description: watchMetadata?.description || defaultMetaTags.description,
    // image: watchMetadata?.image || defaultMetaTags.image,
  }
  const { t } = useTranslation('advanced_custom')
  return (
    <div>
      {/* {JSON.stringify(formState.errors.meta_tags, null, 2)}
      {JSON.stringify(watchMetadata, null, 2)} */}
      <div className="flex md:flex-row flex-col gap-9">
        <LockableSection className="flex-1" lockBy="plan" locked={!orgPlan?.allow_custom_meta_tags}>
          <div className="flex-1 flex flex-col gap-4">
            <FormField
              control={control}
              name="meta_tags.image"
              render={({ field }) => (
                <FormItem>
                  <UploadFile
                    label={t('common:label.image')}
                    size="default"
                    mode="temp"
                    variant="dropzone"
                    accept={allowedMetaTagImageFormat.join(',')}
                    description="Recommend 1200 x 628"
                    defaultValue={field.value as string}
                    onUpload={(url) => field.onChange(url)}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name="meta_tags.title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('advanced_form.meta_tags.title')}</FormLabel>
                  <Textarea
                    rows={2}
                    placeholder={t('advanced_form.meta_tags.title_placeholder')}
                    className="border-transparent focus-within:border focus-within:border-slate-400"
                    {...field}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name="meta_tags.description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('advanced_form.meta_tags.description_field')}</FormLabel>
                  <Textarea
                    rows={3}
                    placeholder={t('advanced_form.meta_tags.description_placeholder')}
                    className="border-transparent focus-within:border focus-within:border-slate-400"
                    {...field}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </LockableSection>
        {/* <Separator orientation="vertical" className="h-[full] w-[36px]" /> */}
        <div className="w-full flex-1 flex flex-col gap-4 items-center justify-center">
          <div className="space-y-4 max-w-[357px]">
            <div className="w-full h-64 bg-gray-100 rounded-lg overflow-hidden">
              {watchMetadata?.image ? (
                <Image
                  src={
                    typeof watchMetadata.image === 'string'
                      ? watchMetadata.image
                      : URL.createObjectURL(watchMetadata.image)
                  }
                  width={1200}
                  height={628}
                  alt="Preview"
                  className="w-full h-full"
                  style={{ objectFit: 'contain' }}
                  unoptimized
                />
              ) : (
                <ImagePlaceholderIcon className="w-full h-full p-12" />
              )}
            </div>
            <div className="space-y-2 flex flex-col">
              <span className="text-base font-normal text-slate-600">{short_url}</span>
              <span className="text-lg font-semibold">{metaTags?.title}</span>
              <span className="text-base font-normal text-slate-600 max-w-[357px]">
                {metaTags?.description}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
