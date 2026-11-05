'use client'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/components/ui/form'
import { Input } from '@/shared/components/ui/input'
import { LoadingButton } from '@/shared/components/customize/loading-button'
import { CustomDialog, DialogCustomRef } from '@/shared/components/customize/custom-dialog'
import { useRef } from 'react'
import { Button } from '@/shared/components/ui/button'
import { toast } from '@/shared/hooks/use-toast'
import { logout } from '@/app/actions/auth'
import { useDeleteProfile } from '@/features/profile/hooks/mutations'
import { UserProfile } from '@/shared/providers/auth-provider'
import { useTranslation } from 'react-i18next'

export const DeleteProfileFormDanger = ({
  initialValues,
  title,
  description,
  buttonText,
}: {
  initialValues: UserProfile | null
  title: string
  description: string
  buttonText: string
}) => {
  const deleteProfileRef = useRef<DialogCustomRef>(null)
  const { mutate: deleteProfile, isPending: isPendingDelete } = useDeleteProfile()

  const handleSubmit = () => {
    deleteProfile(undefined, {
      onSuccess: async () => {
        toast({
          variant: 'success',
          title: t('common:text.success'),
          description: t('common:messages.success.deleted', { field: t('common:module.profile') }),
        })
        // await logout();
      },
    })
  }

  const { t } = useTranslation('common')

  return (
    <div className="flex flex-col gap-4 items-start">
      <div className="flex flex-col gap-2 items-start self-stretch">
        <div className="text-lg font-semibold text-red-500 leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          {t('common:text.danger_zone')}: {title}
        </div>
        <span className="text-sm leading-[20px] text-slate-600">{description}</span>
      </div>
      {/* <Button
        onClick={() => deleteProfileRef.current?.open?.()}
        variant="destructive"
        className="mt-2 bg-transparent border-destructive border text-destructive hover:bg-destructive hover:text-white"
      >
        {buttonText}
      </Button> */}
      <CustomDialog
        ref={
          deleteProfileRef as React.RefObject<{
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
          <DeleteProfileForm onSubmit={handleSubmit} isPending={isPendingDelete} close={close} />
        )}
      </CustomDialog>
    </div>
  )
}

type DeleteProfileFormProps = {
  onSubmit: () => void
  isPending: boolean
  close: () => void
}

const DeleteProfileFormSchema = z
  .object({
    confirm: z.string(),
  })
  .superRefine(({ confirm }, ctx) => {
    if (confirm !== 'CONFIRM') {
      ctx.addIssue({
        code: 'custom',
        message: 'The confirmation did not match',
        path: ['confirm'],
      })
    }
  })

const DeleteProfileForm = ({ onSubmit, isPending, close }: DeleteProfileFormProps) => {
  const form = useForm<z.infer<typeof DeleteProfileFormSchema>>({
    resolver: zodResolver(DeleteProfileFormSchema),
  })
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <FormField
              control={form.control}
              name="confirm"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Please type <span className="font-bold text-red-700">CONFIRM</span> to delete.
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="flex justify-end mt-2 gap-2">
            {close && (
              <Button
                type="button"
                onClick={close}
                variant="outline"
                className={`bg-transparent px-4 py-[8px] rounded-[8px] gap-[6px] text-guest-primary-default 
                text-base flex-1 max-w-fit font-medium border-guest-primary-default
                hover:text-guest-secondary-default hover:border-guest-secondary-default hover:bg-transparent`}
              >
                Cancel
              </Button>
            )}
            <LoadingButton
              type="submit"
              isLoading={isPending}
              variant="destructive"
              className="bg-transparent border-destructive border text-destructive hover:bg-destructive hover:text-white"
            >
              Confirm
            </LoadingButton>
          </div>
        </div>
      </form>
    </Form>
  )
}
