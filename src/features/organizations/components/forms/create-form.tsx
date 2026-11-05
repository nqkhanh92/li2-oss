'use client'
import React, { useEffect, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { organizationFormSchema } from '@/shared/schemas/organizations'
import { z } from 'zod'
import {
  Form,
  FormField,
  FormControl,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/components/ui/form'
import { Input } from '@/shared/components/ui/input'
import { useRouter } from 'next/navigation'
import { useCreateOrganization } from '@/features/organizations/hooks/mutations/mutations'
import { LoadingButton } from '@/shared/components/customize/loading-button'
import { Button } from '@/shared/components/ui/button'
import { CheckCircle2, XCircle, Loader2, Pencil } from 'lucide-react'
import { authStore } from '@/shared/stores/profile-store'
import {
  useOrganizationSlug,
  generateSlug,
  type SlugStatus,
} from '@/features/organizations/hooks/use-organization-slug'
import { useTranslation } from 'react-i18next'
import Image from 'next/image'
import { SlugHintRow, type HintValidity } from './slug-hint-row'
import { toast } from '@/shared/hooks/use-toast'
import { isPlanGateError } from '@/shared/lib/axios'
import { disabledFeatures, ORG_HOME_SECTION } from '@/shared/constants/disabled-features'

const SLUG_FORMAT_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/

export const CreateOrganizationForm = () => {
  const { t } = useTranslation('organization')
  const router = useRouter()
  const profile = authStore().profile
  const [isEditingSlug, setIsEditingSlug] = useState(false)

  const form = useForm<z.infer<typeof organizationFormSchema>>({
    resolver: zodResolver(organizationFormSchema),
  })

  const { slugStatus, handleSlugChange, checkSlug } = useOrganizationSlug({
    form,
    initialSlug: form.getValues('org_slug'),
  })

  useEffect(() => {
    if (profile) {
      const name = `${profile.email.split('@')[0]}'s Organization`
      const slug = generateSlug(name)
      form.reset({ name, org_slug: slug })
      checkSlug(slug)
    }
  }, [profile])

  const { mutate, isPending } = useCreateOrganization()
  const handleSubmit = (values: z.infer<typeof organizationFormSchema>) => {
    if (slugStatus !== 'available') return
    mutate(values, {
      onSuccess: ({ organization }) => {
        const orgRef = organization.org_slug ?? organization.id
        // `ORG_HOME_SECTION` thắng cả cờ ONBOARDING: self-host đặt biến này là muốn chỉ định
        // thẳng trang chủ org. Main gộp hai nhánh vào `orgHomePath()`, nhưng helper đó chỉ đọc
        // env khi onboarding ĐÃ tắt — mất mất trường hợp env đặt mà onboarding vẫn bật.
        const homeSection =
          ORG_HOME_SECTION || (disabledFeatures.ONBOARDING ? 'overview' : 'onboarding')
        window.location.replace(`/org/${orgRef}/${homeSection}`)
      },
      onError: (error) => {
        if (isPlanGateError(error)) {
          window.location.replace('/org')
        } else {
          toast({ variant: 'destructive', title: t('create.error_failed') })
        }
      },
    })
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_BASE_URL ||
    (typeof window !== 'undefined' ? window.location.origin : '')
  const baseUrlWithoutProtocol = baseUrl.replace(/^https?:\/\//, '')

  const currentSlug = form.watch('org_slug') ?? ''
  const hasInput = currentSlug.length > 0
  const lengthValid = hasInput && currentSlug.length >= 3 && currentSlug.length <= 64
  const formatValid = hasInput && SLUG_FORMAT_RE.test(currentSlug)

  return (
    <Form {...form}>
      <div className="bg-white border border-slate-200 rounded-[8px] shadow-[0px_3px_10px_rgba(0,0,0,0.1),0px_2px_4px_rgba(0,0,0,0.08)] flex flex-col gap-6 items-center p-9 w-full max-w-[450px]">
        {/* Logo */}
        <Image
          src="/images/li2-logo-withtext-black.svg"
          alt="Li2.ai"
          width={120}
          height={30}
          priority
        />

        {/* Title */}
        <div className="flex flex-col gap-1 text-center w-full">
          <p className="text-xl font-semibold leading-7 text-slate-700">
            {t('create.setup_title')}
          </p>
          <p className="text-s leading-5 text-slate-500">{t('create.setup_subtitle')}</p>
        </div>

        {/* Fields */}
        <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-6 w-full">
          {/* Org name */}
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="flex flex-col gap-1 space-y-0">
                <FormLabel className="text-s font-normal text-foreground">
                  {t('form.organization_name')}
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder={t('form.organization_name')}
                    className="bg-slate-100 border-transparent hover:border-transparent focus:border-slate-300 rounded-[6px] placeholder:italic placeholder:opacity-50"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Org URL */}
          <FormField
            control={form.control}
            name="org_slug"
            render={({ field }) => (
              <FormItem className="flex flex-col gap-1 space-y-0">
                <FormLabel className="text-s font-medium text-foreground">
                  {t('create.org_url_label')}{' '}
                  <span className="font-normal">{t('create.org_url_hint')}</span>
                </FormLabel>
                <FormControl>
                  <div className="h-9 flex items-center">
                    {isEditingSlug ? (
                      <div className="flex items-center gap-2 w-full">
                        <span className="text-sm font-medium text-[#2e3646] whitespace-nowrap shrink-0">
                          {baseUrlWithoutProtocol}/org/
                        </span>
                        <Input
                          autoFocus
                          placeholder={t('create.slug_placeholder')}
                          className="bg-slate-100 border-transparent hover:border-transparent focus:border-slate-300 rounded-[6px] placeholder:italic placeholder:opacity-50 h-9"
                          {...field}
                          onChange={(e) => {
                            field.onChange(e)
                            handleSlugChange(e.target.value)
                          }}
                          onBlur={() => setIsEditingSlug(false)}
                        />
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="flex items-center gap-1.5 w-full text-left group p-0 bg-transparent border-none"
                        onClick={() => setIsEditingSlug(true)}
                      >
                        <span className="text-sm font-medium text-[#2e3646] whitespace-nowrap">
                          {baseUrlWithoutProtocol}/org/
                        </span>
                        <span className="text-sm text-[#2e3646] truncate">{field.value}</span>
                        <Pencil className="w-3.5 h-3.5 shrink-0 text-slate-400 group-hover:text-slate-600" />
                      </button>
                    )}
                  </div>
                </FormControl>
                <FormMessage />
                <div className="flex flex-col gap-0.5 pt-0.5">
                  <SlugHintRow
                    text={t('create.hint_length')}
                    validity={hasInput ? (lengthValid ? 'valid' : 'invalid') : 'neutral'}
                  />
                  <SlugHintRow
                    text={t('create.hint_format')}
                    validity={hasInput ? (formatValid ? 'valid' : 'invalid') : 'neutral'}
                  />
                  <SlugHintRow
                    text={
                      slugStatus === 'unavailable'
                        ? t('create.hint_unavailable')
                        : t('create.hint_available')
                    }
                    slugStatus={slugStatus}
                  />
                </div>
              </FormItem>
            )}
          />

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="w-1/4"
              onClick={() => router.push('/org')}
            >
              {t('create.cancel')}
            </Button>
            <LoadingButton
              type="submit"
              isLoading={isPending}
              disabled={slugStatus !== 'available' || isPending}
              variant="default"
              className="flex-1"
            >
              {t('create.button')}
            </LoadingButton>
          </div>
        </form>
      </div>
    </Form>
  )
}
