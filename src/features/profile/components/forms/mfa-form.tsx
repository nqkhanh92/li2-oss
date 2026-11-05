import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { InitMfaType, useEnableMfa, useVerifyMfa } from '@/features/profile/hooks/mutations/mfa'
import { toast } from '@/shared/hooks/use-toast'
import { Copy, Loader2 } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/components/ui/form'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { confirmMfaSchema } from '@/shared/schemas/confirm-mfa'
import { z } from 'zod'
import { LoadingButton } from '@/shared/components/customize/loading-button'
import { DialogCustomRef } from '@/shared/components/customize/custom-dialog'
import { useTranslation } from 'react-i18next'

type MFAFormProps = {
  initiateData: InitMfaType
  close: () => void
  finishFormRef: React.RefObject<DialogCustomRef>
}

export const MFAForm = ({ initiateData, close, finishFormRef }: MFAFormProps) => {
  const handleCopy = () => {
    navigator.clipboard.writeText(initiateData?.secret || '')
    toast({
      title: t('common:text.copied'),
      variant: 'success',
      description: t('common:messages.copy_to_clipboard'),
    })
  }

  const { mutate: verifyMfa, isPending: verifyPending } = useVerifyMfa()
  const { mutate: enableMfa } = useEnableMfa()

  const form = useForm<z.infer<typeof confirmMfaSchema>>({
    resolver: zodResolver(confirmMfaSchema),
    defaultValues: {
      passcode: '',
    },
  })

  const handleSubmit = (data: z.infer<typeof confirmMfaSchema>) => {
    verifyMfa(
      {
        secret: initiateData?.secret,
        passcode: data.passcode,
      },
      {
        onSuccess: () => {
          enableMfa(
            {
              recoveryCodes: initiateData?.recoveryCodes,
              secret: initiateData?.secret,
            },
            {
              onSuccess: () => {
                close()
                finishFormRef.current?.open()
              },
            }
          )
        },
        onError: () => {
          form.reset()
          form.setError('passcode', {
            type: 'manual',
            message: t('common:form.validation.field_invalid', {
              field: "Code",
            }),
          })
          toast({
            title: t('common:text.error'),
            description: t('common:messages.error.failed_to_verify_field', {
              field: 'MFA',
            }),
            variant: 'destructive',
          })
        },
      }
    )
  }

  const { t } = useTranslation('setting')

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <div className="flex flex-col justify-center gap-6 mt-6">
          <p className="text-center text-primary font-semibold">{t('mfa.heading')}</p>
          <div className="flex justify-center">
            <QRCodeSVG value={initiateData?.url} size={160} />
          </div>
          <p className="text-center text-xs text-slate-600">{t('mfa.description')}</p>
          <div className="flex items-center justify-center bg-slate-100 rounded-[8px]">
            <p className="text-center text-slate-400">{initiateData?.secret}</p>
            <Button
              type="button"
              onClick={handleCopy}
              className="text-slate-400 border-none"
              variant="secondary"
            >
              <Copy />
            </Button>
          </div>
          <div className="flex items-center gap-4">
            <div className="grow h-px bg-neutral-700" />
            <span className="text-xs font-normal text-slate-600">{t('mfa.then')}</span>
            <div className="grow h-px bg-neutral-700" />
          </div>
          <div>
            <FormField
              control={form.control}
              name="passcode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex justify-center text-center text-[15px] text-primary font-semibold">
                    {t('mfa.one_time_code')}
                  </FormLabel>
                  <FormControl>
                    <Input
                      className="text-center"
                      type="text"
                      placeholder={t('mfa.one_time_code_placeholder')}
                      {...field}
                      maxLength={6}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button onClick={close} variant="outline" type="button">
              {t('mfa.cancel')}
            </Button>
            <LoadingButton type="submit" isLoading={verifyPending}>
              {verifyPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                t('mfa.enable_mfa')
              )}
            </LoadingButton>
          </div>
        </div>
      </form>
    </Form>
  )
}
