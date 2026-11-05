import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, useWatch } from 'react-hook-form'
import {
  createIntegrationSchema,
  googleSheetsConfigSchema,
  updateIntegrationSchema,
  verifyIntegrationSchema,
} from '@/shared/schemas/integrations'
import { Integration } from '@/app/api/organizations/[org_id]/integrations/route'
import { Suspense, useCallback, useMemo, useState } from 'react'
import { IntegrationType, integrationTypes } from '@/features/integrations/constants'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { ParcelvoyForm } from './type-form/parcelvoy'
import React from 'react'
import { Textarea } from '@/shared/components/ui/textarea'
import { useVerifyIntegration } from '@/features/integrations/hooks/mutations'
import { useDebounce } from '@/shared/hooks/use-debounce'
import { useParams } from 'next/navigation'
import { Alert, AlertDescription, AlertTitle } from '@/shared/components/ui/alert'
import { Button } from '@/shared/components/ui/button'
import { CooldownButton } from '@/shared/components/customize/cooldown-button'
import { LoadingButton } from '@/shared/components/customize/loading-button'
import { useTranslation } from 'react-i18next'
import { GoogleSheetsForm } from './type-form/google-sheets-form'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { SkeletonCard } from '@/shared/components/customize/skeleton-card'
type Props = {
  readOnly?: boolean
  initialData?: Integration | z.infer<typeof createIntegrationSchema>
  onSubmit?: (values: z.infer<typeof createIntegrationSchema>) => void
  onValidityChange?: (isValid: boolean) => void
  type: IntegrationType
  isPending?: boolean
  close?: () => void
}
export type IntegrationFormRef = {
  submit: () => void
}
export const IntegrationForm = React.forwardRef<IntegrationFormRef, Props>(
  ({ initialData, onSubmit, onValidityChange, readOnly, type, isPending, close }: Props, ref) => {
    const { org_id } = useParams<{ org_id: string }>()

    const defaultValues = useMemo(() => {
      if (initialData) {
        return initialData as unknown as z.infer<typeof createIntegrationSchema>
      }
      return {
        type,
      } as z.infer<typeof createIntegrationSchema>
    }, [initialData, type])

    const form = useForm<z.infer<typeof createIntegrationSchema>>({
      resolver: zodResolver(createIntegrationSchema),
      defaultValues,
    })
    const handleSubmit = async (data: z.infer<typeof createIntegrationSchema>) => {
      onSubmit?.(data)
    }

    const watchType = useWatch({
      control: form.control,
      name: 'type',
    })

    const watchConfig = useWatch({
      control: form.control,
      name: 'config',
    })

    const [verified, setVerified] = useState<boolean | null>(null)
    const [verifying, setVerifying] = useState<boolean>(false)

    const { t } = useTranslation('')

    return (
      <Form {...form}>
        <Suspense fallback={<SkeletonCard bodyParts={4} className="w-full h-[250px]" />}>
          <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_SHEETS_CLIENT_ID!}>
            <form onSubmit={form.handleSubmit(handleSubmit)}>
              <div className="flex flex-col gap-3">
                {!initialData && (
                  <div className="hidden">
                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Integration Type</FormLabel>
                          <FormControl>
                            <Select
                              disabled={readOnly}
                              onValueChange={(value) => field.onChange(value as IntegrationType)}
                              value={field.value}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select integration type" />
                              </SelectTrigger>
                              <SelectContent>
                                {integrationTypes.map((type) => (
                                  <SelectItem key={type} value={type}>
                                    {type}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormDescription>Integration type</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
                <div className="">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input
                            disabled={readOnly}
                            placeholder={t('form.fields.name', { field: '' })}
                            {...field}
                            className="w-full"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                {watchType === IntegrationType.GOOGLE_SHEETS && (
                  <GoogleSheetsForm
                    setVerified={setVerified}
                    initialValue={initialData as z.infer<typeof googleSheetsConfigSchema>}
                  />
                )}
                <div className="flex gap-6 mt-4 ">
                  <Button
                    disabled={form.formState.isSubmitting}
                    type="button"
                    onClick={close}
                    variant="secondary"
                    className={`gap-[6px] text-base flex-1 max-w-fit`}
                  >
                    {t('buttons.cancel')}
                  </Button>
                  {!readOnly && (
                    <LoadingButton
                      disabled={verified === null || verifying}
                      isLoading={isPending}
                      type="submit"
                      className="w-full"
                    >
                      {t('buttons.create', { field: t('module.integration') })}
                    </LoadingButton>
                  )}
                </div>
              </div>
            </form>
          </GoogleOAuthProvider>
        </Suspense>
      </Form>
    )
  }
)
