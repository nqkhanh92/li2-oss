'use client'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { DeleteOrganizationFormSchema } from '@/shared/schemas/organizations'
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
import { useParams } from 'next/navigation'
import { useDeleteOrganization } from '@/features/organizations/hooks/mutations/mutations'
import { LoadingButton } from '@/shared/components/customize/loading-button'
import { Organization } from '@/app/api/organizations/route'
import { CustomDialog, DialogCustomRef } from '@/shared/components/customize/custom-dialog'
import { useRef } from 'react'
import { Button } from '@/shared/components/ui/button'
import { toast } from '@/shared/hooks/use-toast'
import { useTranslation } from 'react-i18next'

export const DeleteOrganization = ({
  initialValues,
  title,
  description,
  buttonText,
}: {
  initialValues: Organization | null
  title: string
  description: string
  buttonText: string
}) => {
  const deleteOrgRef = useRef<DialogCustomRef>(null)
  const { org_id } = useParams<{ org_id: string }>()
  const { mutate: deleteOrg, isPending } = useDeleteOrganization(org_id)
  const handleSubmit = () => {
    deleteOrg(undefined, {
      onSuccess: () => {
        deleteOrgRef.current?.close?.()
        toast({
          variant: 'success',
          title: 'Organization reset successfully',
          description: 'Organization reset successfully',
        })
        window.location.replace('/org')
      },
    })
  }

  const { t } = useTranslation('')

  return (
    <div className="flex flex-col gap-4 items-start">
      <div className="flex flex-col gap-2 items-start self-stretch">
        <div className="text-lg font-semibold text-red-500 leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          {t('common:text.danger_zone')}: {title}
        </div>
        <span className="text-sm leading-[20px] text-slate-600">{description}</span>
      </div>
      <Button
        onClick={() => deleteOrgRef.current?.open?.()}
        variant="destructive"
        className="bg-transparent border-destructive border text-destructive hover:bg-destructive hover:text-white"
      >
        {buttonText}
      </Button>
      <CustomDialog
        ref={
          deleteOrgRef as React.RefObject<{
            open: () => void
            close: () => void
          }>
        }
        noFooter
        noButton
        title={title}
        size="md"
      >
        {({ close }) => (
          <DeleteOrganizationForm
            organization={initialValues}
            onSubmit={handleSubmit}
            isPending={isPending}
            close={close}
          />
        )}
      </CustomDialog>
    </div>
  )
}

type ResetOrganizationFormProps = {
  onSubmit: (values: z.infer<typeof DeleteOrganizationFormSchema>) => void
  isPending: boolean
  organization: Organization | null
  close?: () => void
}

const DeleteOrganizationForm = ({
  onSubmit,
  isPending,
  organization,
  close,
}: ResetOrganizationFormProps) => {
  const handleSubmit = (values: z.infer<typeof DeleteOrganizationFormSchema>) => {
    onSubmit(values)
  }

  const form = useForm<z.infer<typeof DeleteOrganizationFormSchema>>({
    resolver: zodResolver(DeleteOrganizationFormSchema),
    defaultValues: {
      name: organization?.name,
      confirmName: '',
    },
  })
  const { t } = useTranslation('setting')

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <FormField
              control={form.control}
              name="confirmName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t('please_type')}{' '}
                    <span className="font-bold text-red-700">{organization?.name}</span>{' '}
                    {t('to_confirm')}
                  </FormLabel>
                  <FormControl>
                    <Input placeholder={t('common:form.fields.name', { field: '' })} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="flex justify-end mt-2 gap-6 w-full">
            {close && (
              // <Button
              //   type="button"
              //   onClick={close}
              //   variant="outline"
              //   className={`bg-transparent px-4 py-[8px] rounded-[8px] gap-[6px] text-slate-600
              //   text-base flex-1 max-w-fit font-medium border-slate-600
              //   hover:text-slate-600 hover:border-slate-600 hover:bg-transparent`}
              // >
              //   Cancel
              // </Button>
              <Button
                type="button"
                onClick={close}
                variant="secondary"
                className="gap-[6px] text-slate-600"
              >
                {t('common:buttons.cancel')}
              </Button>
            )}
            <LoadingButton
              type="submit"
              isLoading={isPending}
              variant="destructive"
              className="bg-red-500 border-red-500 text-white hover:bg-red-500 hover:text-white w-full"
            >
              {t('common:buttons.confirm')}
            </LoadingButton>
          </div>
        </div>
      </form>
    </Form>
  )
}
