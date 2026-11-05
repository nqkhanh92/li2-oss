'use client'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
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
import { Button } from '@/shared/components/ui/button'
import { createTagSchema } from '@/shared/schemas/tags'
import { Textarea } from '@/shared/components/ui/textarea'
import { CustomColorPicker } from '@/shared/components/customize/custom-color-picker'
import { GetTagObject, Tag } from '@/app/api/organizations/[org_id]/tags/route'
import { useMemo, useRef } from 'react'
import { CalendarIcon, Plus, Trash, UserRoundPen } from 'lucide-react'
import { CardContent } from '@/shared/components/ui/card'
import { LoadingButton } from '@/shared/components/customize/loading-button'
import { useDeleteTag } from '@/features/tags/hooks/mutations'
import { useParams, useRouter } from 'next/navigation'
import { CustomDialog, DialogCustomRef } from '@/shared/components/customize/custom-dialog'
import { useFormWarningProvider } from '@/shared/providers/form-warning-provider'
import { useEffect } from 'react'
import { ContentBlock } from '@/shared/components/customize/content-block'
import imageError from '@/public/images/reach_limit_tag_banner.png'
import { useTranslation } from 'react-i18next'
import dayjs from '@/shared/lib/dayjs'
import { TouchPointListInTag } from '@/features/touch-points/components/touch-point-list-in-tag'
import { getRandomSampleColors } from '@/shared/lib/utils'

type Props = {
  onSubmit: (values: z.infer<typeof createTagSchema>) => void
  isPending: boolean
  close?: () => void
  initialData?: Tag
  blocked?: boolean
  className?: string
}
export const CreateTagForm = ({
  onSubmit,
  isPending,
  close,
  initialData,
  blocked,
  className,
}: Props) => {
  const { t } = useTranslation('tag')
  const { org_id, tag_id }: { org_id: string; tag_id: string } = useParams()
  const defaultValues = useMemo(() => {
    if (!initialData) {
      return {
        name: '',
        color: getRandomSampleColors(),
        desc: '',
      }
    }
    return Object.fromEntries(Object.entries(initialData).filter(([_, value]) => value !== null))
  }, [initialData])
  const form = useForm<z.infer<typeof createTagSchema>>({
    resolver: zodResolver(createTagSchema),
    defaultValues,
  })
  const handleSubmit = (values: z.infer<typeof createTagSchema>) => {
    onSubmit(values)
  }

  const { mutate: deleteTag, isPending: isDeletingTag } = useDeleteTag(org_id)
  const isEditPage = !!initialData
  const deleteFormRef = useRef<DialogCustomRef>(null)
  //Alert when form is dirty
  const { setEnabled, back, push } = useFormWarningProvider()
  const { push: routerPush } = useRouter()
  useEffect(() => {
    setEnabled(form.formState.isDirty && !form.formState.isSubmitSuccessful)
  }, [form.formState.isDirty, form.formState.isSubmitSuccessful])
  const handleDelete = () => {
    deleteTag(tag_id, {
      onSuccess: () => {
        routerPush(`/org/${org_id}/tags`)
      },
    })
  }
  return (
    <ContentBlock
      title={t('common:messages.reach_limit')}
      description={t('common:messages.reach_limit_description')}
      blocked={blocked}
      blockBy="plan"
      showButtonPlan={false}
      imageError={imageError.src}
      className={className}
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 w-full">
          <CardContent
            className={` ${
              isEditPage
                ? 'flex flex-col pt-6 bg-white rounded-2xl gap-4'
                : 'flex flex-col bg-white rounded-2xl gap-4 p-0 pt-6'
            }`}
          >
            {isEditPage && (
              <div className="flex flex-col gap-2">
                <span className="text-lg font-semibold leading-[28px] text-foreground">
                  {t('common:form.fields.info', {
                    field: t('common:module.tag'),
                  })}
                </span>
                <div className="flex items-start md:flex-row flex-col gap-4">
                  <div className="flex gap-1 items-center text-gray-500 text-ellipsis overflow-hidden font-normal text-sm">
                    <CalendarIcon className="w-3 h-3" />
                    {initialData?.created_at ? dayjs(initialData.created_at).format('LL') : 'N/A'}
                  </div>
                  <div className="flex gap-1 items-center text-gray-500 text-ellipsis overflow-hidden font-normal text-sm">
                    <UserRoundPen className="w-3 h-3" />
                    {(initialData as GetTagObject)?.profiles?.email || 'N/A'}
                  </div>
                </div>
              </div>
            )}
            <div className="flex items-start gap-6 self-stretch">
              <div className="flex flex-col gap-1 flex-1">
                <span className="text-foreground text-sm font-medium leading-[20px]">
                  {t('common:form.fields.name', {
                    field: t('common:module.tag'),
                  })}
                </span>
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          placeholder={t('common:form.fields.name', {
                            field: t('common:module.tag'),
                          })}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex flex-col items-start gap-1">
                <span className="text-foreground text-sm font-medium leading-[20px]">
                  {t('common:form.fields.color')}
                </span>
                <FormField
                  control={form.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <CustomColorPicker {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            <FormField
              control={form.control}
              name="desc"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('common:form.fields.description')}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('common:form.fields.description')}
                      {...field}
                      className="border-transparent focus-within:border focus-within:border-slate-400"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {!initialData && (
              <div className="w-full justify-end flex gap-6">
                <Button
                  type="button"
                  onClick={close}
                  variant="secondary"
                  className={`gap-[6px] flex-1 max-w-fit`}
                >
                  {t('common:buttons.cancel')}
                </Button>
                <LoadingButton type="submit" variant="default" isLoading={isPending}>
                  <Plus className="w-6! h-6!" size={24} />
                  {t('common:buttons.create', { field: 'Tag' })}
                </LoadingButton>
              </div>
            )}
            {isEditPage && <TouchPointListInTag isHeadless={true} enableRowSelection={false} />}
          </CardContent>
          {isEditPage && (
            <div className="flex md:flex-row flex-col gap-6 mt-6 w-full justify-between">
              <div className="flex gap-6 items-center flex-1 h-full">
                <LoadingButton
                  size={'default'}
                  type="submit"
                  className="gap-[6px] flex-1 md:max-w-fit md:w-fit w-full"
                  isLoading={isPending}
                  disabled={!form.formState.isDirty}
                >
                  {t('common:buttons.update', { field: 'Tag' })}
                </LoadingButton>
                <Button
                  type="button"
                  onClick={() => back()}
                  variant="secondary"
                  className={`gap-[6px] flex-1 md:max-w-fit md:w-fit w-full md:border-none border border-primary`}
                >
                  {t('common:text.cancel')}
                </Button>
              </div>
              <CustomDialog
                ref={deleteFormRef}
                noFooter
                button={
                  <LoadingButton
                    type="button"
                    isLoading={isDeletingTag}
                    variant="destructive"
                    className="md:bg-transparent py-[8px] rounded-[8px] gap-[6px] md:text-red-500 flex-1 md:max-w-fit md:w-fit w-full"
                  >
                    <Trash className="h-4 w-4" />
                    {t('common:buttons.delete', { field: 'Tag' })}
                  </LoadingButton>
                }
                title={t('common:buttons.delete', { field: 'Tag' })}
                size="md"
              >
                {({ close }) => (
                  <div className="flex flex-col gap-6 w-full">
                    <span className="text-slate-600 text-sm">
                      {t('common:messages.delete_dialog', { field: 'Tag' })}
                    </span>
                    <div className="flex justify-end gap-6 w-full">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={close}
                        className="gap-[6px] text-slate-600"
                      >
                        {t('common:buttons.cancel')}
                      </Button>
                      <LoadingButton
                        type="button"
                        isLoading={isDeletingTag}
                        variant="destructive"
                        onClick={handleDelete}
                        className="gap-[6px] text-base flex-1 max-w-fit font-medium"
                      >
                        <Trash className="h-4 w-4" />
                        {t('common:buttons.delete', { field: 'Tag' })}
                      </LoadingButton>
                    </div>
                  </div>
                )}
              </CustomDialog>
            </div>
          )}
        </form>
      </Form>
    </ContentBlock>
  )
}
