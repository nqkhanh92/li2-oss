'use client'
import React, { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { setupOrganizationSchema } from '@/shared/schemas/organizations'
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
import { LoadingButton } from '@/shared/components/customize/loading-button'
import { Button } from '@/shared/components/ui/button'
import { Pencil } from 'lucide-react'
import { useSetupOrganization } from '@/features/organizations/hooks/mutations/mutations'
import {
  useOrganizationSlug,
  generateSlug,
} from '@/features/organizations/hooks/use-organization-slug'
import { useTranslation } from 'react-i18next'
import Image from 'next/image'
import { revalidatePath } from '@/app/actions/revalidate-path'
import { SlugHintRow } from './slug-hint-row'

const SLUG_FORMAT_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/

interface SetupOrganizationFormProps {
  organization: {
    id: string
    name: string
  }
}

export const SetupOrganizationForm = ({ organization }: SetupOrganizationFormProps) => {
  const { t } = useTranslation('organization')
  const router = useRouter()
  const [isEditingSlug, setIsEditingSlug] = useState(false)

  const form = useForm<z.infer<typeof setupOrganizationSchema>>({
    resolver: zodResolver(setupOrganizationSchema),
    defaultValues: {
      name: organization.name,
      org_slug: generateSlug(organization.name),
    },
  })

  const { slugStatus, handleSlugChange } = useOrganizationSlug({
    form,
    initialSlug: generateSlug(organization.name),
  })

  const { mutate, isPending } = useSetupOrganization(organization.id)
  const handleSubmit = (values: z.infer<typeof setupOrganizationSchema>) => {
    if (slugStatus !== 'available') {
      return
    }
    mutate(values, {
      onSuccess: () => {
        revalidatePath(`/setup/${organization.id}`)
        router.replace(`/org/${values.org_slug}`)
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
        <Image
          src="/images/li2-logo-withtext-black.svg"
          alt="Li2.ai"
          width={120}
          height={30}
          priority
        />

        <div className="flex flex-col gap-1 text-center w-full">
          <p className="text-xl font-semibold leading-7 text-slate-700">
            {t('setup.welcome_title')}
          </p>
          <p className="text-s leading-5 text-slate-500">{t('setup.welcome_description')}</p>
        </div>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-6 w-full">
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
              {t('setup.button')}
            </LoadingButton>
          </div>
        </form>
      </div>
    </Form>
  )
}
