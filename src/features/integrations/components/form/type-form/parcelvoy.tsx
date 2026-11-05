import { CustomToolTip } from '@/shared/components/customize/custom-tooltip'
import { Alert, AlertDescription, AlertTitle } from '@/shared/components/ui/alert'
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
import { createIntegrationSchema } from '@/shared/schemas/integrations'
import { CheckIcon, InfoIcon, Loader2, XIcon } from 'lucide-react'
import Link from 'next/link'
import { useFormContext } from 'react-hook-form'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
type Props = {
  readOnly?: boolean
  isVerifying?: boolean
  verified?: boolean | null
}
export const ParcelvoyForm = ({ readOnly, isVerifying, verified }: Props) => {
  const {
    formState: { errors },
    control,
  } = useFormContext<z.infer<typeof createIntegrationSchema>>()
  const { t } = useTranslation()
  return (
    <>
      {/* <FormField
        control={control}
        name="config.base_url"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Client Base URL</FormLabel>
            <FormControl>
              <Input
                placeholder="Client Base URL"
                disabled={true}
                className="w-full"
                {...field}
              />
            </FormControl>
            <FormDescription>
              Base URL of your Parcelvoy Client API
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      /> */}
      <FormField
        control={control}
        name="config.api_key"
        render={({ field }) => (
          <FormItem>
            <FormLabel>API Key</FormLabel>
            <FormControl>
              <Input
                disabled={readOnly}
                placeholder="API Key"
                className="w-full max-h-10"
                endAdornment={
                  <span className="flex">
                    {isVerifying ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        {verified == true ? (
                          <CustomToolTip
                            content={t('messages.field_is_valid', { field: 'API Key' })}
                          >
                            <CheckIcon className="mr-2 h-5 w-5 text-green-500" />
                          </CustomToolTip>
                        ) : verified == false ? (
                          <CustomToolTip
                            content={t('messages.field_is_invalid', { field: 'API Key' })}
                          >
                            <XIcon className="mr-2 h-5 w-5 text-red-500" />
                          </CustomToolTip>
                        ) : (
                          <CustomToolTip
                            content={t('messages.verify_field_for_safety', { field: 'API Key' })}
                          >
                            <InfoIcon className="mr-2 h-5 w-5 text-yellow-500" />
                          </CustomToolTip>
                        )}
                      </>
                    )}
                  </span>
                }
                {...field}
              />
            </FormControl>
            <FormDescription>
              {t('parcelvoy.parcelvoy_secert_apikey_desc')}{' '}
              <Link
                className="text-blue-500 hover:underline"
                href={`${process.env.NEXT_PUBLIC_PARCELVOY_URL}/`}
                target="_blank"
              >
                [{t('parcelvoy.parcelvoy_secert_apikey_cta')}]
              </Link>
            </FormDescription>
            <FormMessage />
            {verified === false && (
              <Alert variant="destructive">
                <AlertTitle>{t('text.error')}</AlertTitle>
                <AlertDescription>
                  {t('messages.cant_connect_to_your_field', {
                    field_to_connect: t('module.integration'),
                    field_to_check: 'API Key',
                  })}
                </AlertDescription>
              </Alert>
            )}
            {verified === true && (
              <Alert variant="success">
                <AlertTitle>{t('text.success')}</AlertTitle>
                <AlertDescription>
                  {t('messages.field_verified_successfully', { field: t('module.integration') })}
                </AlertDescription>
              </Alert>
            )}
          </FormItem>
        )}
      />
    </>
  )
}
