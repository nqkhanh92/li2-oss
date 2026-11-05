'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { updateUTMTemplateSchema, UpdateUTMTemplate } from '@/shared/schemas/utm-templates'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/components/ui/form'
import { Input } from '@/shared/components/ui/input'
import { Textarea } from '@/shared/components/ui/textarea'
import { Button } from '@/shared/components/ui/button'
import { useParams } from 'next/navigation'
import { useUpdateUTMTemplate } from '@/features/touch-points/hooks/useUTMTemplates'
import { LoadingButton } from '@/shared/components/customize/loading-button'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { UTMTemplate } from '@/app/api/organizations/[org_id]/utm-templates/route'
import { UTMTemplateListItem } from '@/core/types/utm-template.type'
import {
  MousePointerClick,
  Goal,
  Megaphone,
  TextSearch,
  Type,
  CircleHelp,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/shared/lib/utils'
import { CustomToolTip } from '@/shared/components/customize/custom-tooltip'

interface EditUTMTemplateFormProps {
  template: UTMTemplateListItem
  onSuccess?: () => void
  onCancel?: () => void
}

export function EditUTMTemplateForm({ template, onSuccess, onCancel }: EditUTMTemplateFormProps) {
  const { org_id }: { org_id: string } = useParams()
  const { mutate: updateTemplate, isPending } = useUpdateUTMTemplate(org_id, template.id)
  const { t } = useTranslation(['common', 'utm_template'])
  const [showAdvanced, setShowAdvanced] = useState(false)

  const form = useForm<UpdateUTMTemplate>({
    resolver: zodResolver(updateUTMTemplateSchema),
    defaultValues: {
      name: template.name,
      description: template.description || '',
      utm_source: template.utm_source || '',
      utm_medium: template.utm_medium || '',
      utm_campaign: template.utm_campaign || '',
      utm_term: template.utm_term || '',
      utm_content: template.utm_content || '',
    },
  })

  function onSubmit(data: UpdateUTMTemplate) {
    updateTemplate(data, {
      onSuccess: (response) => {
        form.reset()
        onSuccess?.()
      },
      onError: (error: any) => {
        toast.error(error?.response?.data?.message || 'Failed to update template')
      },
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem className="flex flex-col gap-1">
              <FormLabel className="text-sm font-normal text-foreground">
                {t('utm_template:labels.name')}
              </FormLabel>
              <FormControl>
                <Input placeholder="Enter Space Name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex flex-col gap-4">
          <FormField
            control={form.control}
            name="utm_source"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center w-full">
                  <div className="bg-slate-200 flex gap-1 h-10 items-center px-4 py-2 rounded-tl-md rounded-bl-md shrink-0 w-[190px]">
                    <MousePointerClick className="w-5 h-5 text-slate-700" />
                    <p className="flex-1 font-medium text-sm text-slate-700">
                      Source<span className="text-red-600">*</span>
                    </p>
                    <CustomToolTip content={t('utm_template:help.source')} side="top">
                      <CircleHelp className="w-4 h-4 text-blue-500" />
                    </CustomToolTip>
                  </div>
                  <FormControl>
                    <Input
                      placeholder="e.g. adwords, google, mailchimp"
                      {...field}
                      value={field.value || ''}
                      className="rounded-tl-none rounded-bl-none"
                    />
                  </FormControl>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="utm_campaign"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center w-full">
                  <div className="bg-slate-200 flex gap-1 h-10 items-center px-4 py-2 rounded-tl-md rounded-bl-md shrink-0 w-[190px]">
                    <Goal className="w-5 h-5 text-slate-700" />
                    <p className="flex-1 font-medium text-sm text-slate-700">Campaign</p>
                    <CustomToolTip content={t('utm_template:help.campaign')} side="top">
                      <CircleHelp className="w-4 h-4 text-blue-500" />
                    </CustomToolTip>
                  </div>
                  <FormControl>
                    <Input
                      placeholder="e.g. holiday special, birthday promotion"
                      {...field}
                      value={field.value || ''}
                      className="rounded-tl-none rounded-bl-none"
                    />
                  </FormControl>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex gap-2 items-center rounded-lg w-full"
          >
            <p className="flex-1 font-medium text-sm text-slate-500 text-left">
              See advanced settings
            </p>
            {showAdvanced ? (
              <ChevronUp className="w-4 h-4 text-slate-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-500" />
            )}
          </button>

          {showAdvanced && (
            <div className="flex flex-col gap-4">
              <FormField
                control={form.control}
                name="utm_medium"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center w-full">
                      <div className="bg-slate-200 flex gap-1 h-10 items-center px-4 py-2 rounded-tl-md rounded-bl-md shrink-0 w-[190px]">
                        <Megaphone className="w-5 h-5 text-slate-700" />
                        <p className="flex-1 font-medium text-sm text-slate-700">Medium</p>
                        <CustomToolTip content={t('utm_template:help.medium')} side="top">
                          <CircleHelp className="w-4 h-4 text-blue-500" />
                        </CustomToolTip>
                      </div>
                      <FormControl>
                        <Input
                          placeholder="e.g. banner ad, email, social post"
                          {...field}
                          value={field.value || ''}
                          className="rounded-tl-none rounded-bl-none"
                        />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="utm_term"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center w-full">
                      <div className="bg-slate-200 flex gap-1 h-10 items-center px-4 py-2 rounded-tl-md rounded-bl-md shrink-0 w-[190px]">
                        <TextSearch className="w-5 h-5 text-slate-700" />
                        <p className="flex-1 font-medium text-sm text-slate-700">Term</p>
                        <CustomToolTip content={t('utm_template:help.term')} side="top">
                          <CircleHelp className="w-4 h-4 text-blue-500" />
                        </CustomToolTip>
                      </div>
                      <FormControl>
                        <Input
                          placeholder="e.g. iphone 15, wireless earbuds, hotel deal"
                          {...field}
                          value={field.value || ''}
                          className="rounded-tl-none rounded-bl-none"
                        />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="utm_content"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center w-full">
                      <div className="bg-slate-200 flex gap-1 h-10 items-center px-4 py-2 rounded-tl-md rounded-bl-md shrink-0 w-[190px]">
                        <Type className="w-5 h-5 text-slate-700" />
                        <p className="flex-1 font-medium text-sm text-slate-700">Content</p>
                        <CustomToolTip content={t('utm_template:help.content')} side="top">
                          <CircleHelp className="w-4 h-4 text-blue-500" />
                        </CustomToolTip>
                      </div>
                      <FormControl>
                        <Input
                          placeholder="e.g. video_ad_short, popup_offer_button"
                          {...field}
                          value={field.value || ''}
                          className="rounded-tl-none rounded-bl-none"
                        />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-4">
          <Button onClick={onCancel} variant="ghost" type="button" className="px-4 py-2 rounded-md">
            <p className="font-medium text-base text-slate-700">{t('common:buttons.cancel')}</p>
          </Button>
          <LoadingButton
            type="submit"
            isLoading={isPending}
            className="bg-[#000d27] px-4 py-2 rounded-md hover:bg-[#000d27]/90"
          >
            <p className="font-medium text-base text-white">{t('common:buttons.update')}</p>
          </LoadingButton>
        </div>
      </form>
    </Form>
  )
}
