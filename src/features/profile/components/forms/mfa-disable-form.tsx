import { LoadingButton } from '@/shared/components/customize/loading-button'
import { Alert, AlertDescription, AlertTitle } from '@/shared/components/ui/alert'
import { Button } from '@/shared/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/components/ui/form'
import { Input } from '@/shared/components/ui/input'
import { InitMfaType, useDisableMfa, useVerifyMfa } from '@/features/profile/hooks/mutations/mfa'
import { confirmMfaSchema } from '@/shared/schemas/confirm-mfa'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'

type MFAFormDisableProps = {
  close: () => void
  initiateData?: InitMfaType
}

export const MFAFormDisable = ({ close, initiateData }: MFAFormDisableProps) => {
  const { mutate: verifyMfa, isPending: verifyPending } = useVerifyMfa()
  const { mutate: disableMfa } = useDisableMfa()

  const form = useForm<z.infer<typeof confirmMfaSchema>>({
    resolver: zodResolver(confirmMfaSchema),
    defaultValues: {
      passcode: '',
    },
  })

  const handleSubmit = (data: z.infer<typeof confirmMfaSchema>) => {
    verifyMfa(
      {
        passcode: data.passcode,
        secret: '',
      },
      {
        onSuccess: () => {
          disableMfa(undefined, {
            onSuccess: () => {
              close()
            },
          })
        },
      }
    )
  }
  const { t } = useTranslation(['setting'])

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <div className="flex flex-col justify-center gap-6 mt-6">
          <Alert variant="warning" className="[&_svg]:w-[40px]!">
            <AlertTitle className="mt-1">Warning</AlertTitle>
            <AlertDescription>
              Turning off multi-factor authentication makes your account less secure and more
              vulnerable to unauthorized access.
            </AlertDescription>
          </Alert>
          <div>
            {initiateData?.secret}
            <FormField
              control={form.control}
              name="passcode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex justify-center text-center text-[15px] text-slate-600 font-semibold">
                    Check your preferred one-time password application for a code:
                  </FormLabel>
                  <FormControl>
                    <Input
                      className="text-center"
                      type="text"
                      placeholder="Enter code"
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
            <Button
              onClick={close}
              variant="ghost"
              className="bg-neutral-400 font-medium text-slate-600"
              type="button"
            >
              Cancel
            </Button>
            <LoadingButton
              variant="destructive"
              type="submit"
              isLoading={verifyPending}
              className="font-medium"
            >
              {verifyPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                t('setting:mfa.disable_mfa')
              )}
            </LoadingButton>
          </div>
        </div>
      </form>
    </Form>
  )
}
