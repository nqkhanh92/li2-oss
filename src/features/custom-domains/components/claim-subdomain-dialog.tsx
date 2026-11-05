'use client'

import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/shared/components/ui/button'
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
import { useTranslation } from 'react-i18next'
import { Loader2, CheckCircle2, XCircle, InfoIcon } from 'lucide-react'
import { useClaimSubdomain } from '@/features/custom-domains/hooks/mutations'
import { useParams } from 'next/navigation'
import { useDebounce } from '@/shared/hooks/use-debounce'
import { useSubdomainAvailability } from '@/features/custom-domains/hooks/use-subdomain-availability'
import { AVAILABLE_DOMAINS } from '@/core/constants/claimable-domain'
import { claimSubdomainSchema } from '@/shared/schemas/custom-domains'

type ClaimSubdomainFormValues = z.infer<typeof claimSubdomainSchema>

type ClaimSubdomainDialogProps = {
  onFinish: () => void
  onSuccess?: (domainId: string) => void
}

export const ClaimSubdomainDialog = ({ onFinish, onSuccess }: ClaimSubdomainDialogProps) => {
  const { t } = useTranslation(['domain', 'common'])
  const { org_id } = useParams<{ org_id: string }>()
  const { mutate: claimSubdomain, isPending } = useClaimSubdomain(org_id)

  const form = useForm<ClaimSubdomainFormValues>({
    resolver: zodResolver(claimSubdomainSchema),
    defaultValues: {
      subdomain: '',
      baseDomain: AVAILABLE_DOMAINS[0],
    },
    mode: 'onChange',
  })

  const subdomain = form.watch('subdomain')
  const baseDomain = form.watch('baseDomain')
  const debouncedSubdomain = useDebounce(subdomain, 500)

  // Only hit the availability API when the debounced value already passes format validation
  const isDebouncedSubdomainValid = useMemo(
    () => claimSubdomainSchema.shape.subdomain.safeParse(debouncedSubdomain).success,
    [debouncedSubdomain]
  )

  const {
    data: availabilityData,
    isLoading: isCheckingAvailability,
    isError: hasAvailabilityError,
  } = useSubdomainAvailability(org_id, debouncedSubdomain, baseDomain, isDebouncedSubdomainValid)

  const isAvailable = availabilityData?.available ?? false
  const hasChecked = isDebouncedSubdomainValid && !isCheckingAvailability

  const onSubmit = (data: ClaimSubdomainFormValues) => {
    claimSubdomain(data, {
      onSuccess: (response) => {
        const domainId = response?.data?.data?.id
        form.reset()
        onFinish()
        if (domainId) onSuccess?.(domainId)
      },
    })
  }

  const fullDomain = subdomain ? `${subdomain}.${baseDomain}` : ''

  const statusIcon = useMemo(() => {
    if (isCheckingAvailability) {
      return <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
    }
    if (hasAvailabilityError) {
      return <XCircle className="h-4 w-4 text-red-600" />
    }
    if (hasChecked && isAvailable) {
      return <CheckCircle2 className="h-4 w-4 text-green-600" />
    }
    if (hasChecked && !isAvailable) {
      return <XCircle className="h-4 w-4 text-red-600" />
    }
    return <InfoIcon className="h-4 w-4 text-slate-400" />
  }, [isCheckingAvailability, hasAvailabilityError, hasChecked, isAvailable])

  const canSubmit =
    form.formState.isValid && hasChecked && isAvailable && !isPending && !isCheckingAvailability

  return (
    <div className="space-y-6">
      {/* <div className="space-y-2">
        <h3 className="text-lg font-semibold text-slate-900">{t('domain:claimSubdomain.title')}</h3>
        <p className="text-sm text-slate-600">{t('domain:claimSubdomain.description')}</p>
      </div> */}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Subdomain and Base Domain in same line */}
          <div className="space-y-2">
            <FormLabel>{t('domain:claimSubdomain.fields.subdomain.label')}</FormLabel>
            <div className="flex gap-2 h-10">
              {/* Subdomain Input */}
              <FormField
                control={form.control}
                name="subdomain"
                render={({ field }) => (
                  <FormItem className="flex-none">
                    <FormControl>
                      <Input
                        className="h-10!"
                        placeholder={t('domain:claimSubdomain.fields.subdomain.placeholder')}
                        {...field}
                        onChange={(e) => {
                          const value = e.target.value.toLowerCase().replace(/\s+/g, '-')
                          field.onChange(value)
                        }}
                        endAdornment={statusIcon}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* Base Domain Select */}
              <FormField
                control={form.control}
                name="baseDomain"
                render={({ field }) => (
                  <FormItem className="w-auto min-w-[140px]">
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-10">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {AVAILABLE_DOMAINS.map((domain) => (
                          <SelectItem key={domain} value={domain}>
                            .{domain}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>

            {/* Description and Messages */}
            {form.formState.errors.subdomain ? (
              <p className="text-sm text-red-600">{form.formState.errors.subdomain.message}</p>
            ) : (
              <FormDescription>
                {t('domain:claimSubdomain.fields.subdomain.description')}
              </FormDescription>
            )}
            {!form.formState.errors.subdomain && hasChecked && isAvailable && (
              <p className="text-sm text-green-600">
                {t('domain:claimSubdomain.availability.available', { domain: fullDomain })}
              </p>
            )}
            {!form.formState.errors.subdomain && hasChecked && !isAvailable && (
              <p className="text-sm text-red-600">
                {t('domain:claimSubdomain.availability.unavailable', { domain: fullDomain })}
              </p>
            )}
            {!form.formState.errors.subdomain && hasAvailabilityError && (
              <p className="text-sm text-red-600">{t('common:messages.error.generic')}</p>
            )}
          </div>

          <div className="rounded-lg bg-slate-50 p-4">
            <p className="text-sm text-slate-600 mb-1">
              {t('domain:claimSubdomain.preview.label')}
            </p>
            <p className="text-lg font-semibold text-slate-900">
              {fullDomain ||
                `${t('domain:claimSubdomain.fields.subdomain.placeholder')}.${baseDomain}`}
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="submit" disabled={!canSubmit}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('domain:claimSubdomain.buttons.claim')}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
