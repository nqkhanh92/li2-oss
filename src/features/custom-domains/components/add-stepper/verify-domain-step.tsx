import { LoadingButton } from '@/shared/components/customize/loading-button'
import { LoadingMask } from '@/shared/components/customize/loading-mask'
import { useShowCustomDomain } from '@/features/custom-domains/hooks/queries'
import { useDomainStore } from '@/shared/stores/domain-stepper-store'
import { Check, Copy, PinIcon, ShieldCheck } from 'lucide-react'
import { useParams } from 'next/navigation'
import { useState } from 'react'
import { parse } from 'tldts'
import { useVerifyCustomDomain } from '@/features/custom-domains/hooks/mutations'
import { CooldownButton } from '@/shared/components/customize/cooldown-button'
import { Alert, AlertDescription, AlertTitle } from '@/shared/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Switch } from '@/shared/components/ui/switch'
import { Label } from '@/shared/components/ui/label'
import { toast } from '@/shared/hooks/use-toast'
import { useTranslation } from 'react-i18next'
import dayjs from '@/shared/lib/dayjs'

// Cloudflare SSL states that mean "we've registered with CF, SSL is in progress".
// Includes both the canonical "generating_ssl" sentinel (new backend) and raw CF
// status strings (fallback for older backend versions).
const CF_GENERATING_STATUSES = new Set([
  'generating_ssl',
  'initializing',
  'pending_validation',
  'pending_issuance',
  'pending_deployment',
])

export const VerifyDomainStep = ({ onFinish }: { onFinish: () => void }) => {
  const { t } = useTranslation('domain')
  const { org_id } = useParams<{ org_id: string }>()
  const { domainId, cooldownUntil, setCooldownUntil } = useDomainStore()
  const { data, isLoading } = useShowCustomDomain(org_id, domainId)
  const { mutate: verifyDomain, isPending: verifying } = useVerifyCustomDomain(org_id, domainId)

  const [cfProxyEnabled, setCfProxyEnabled] = useState(false)

  const [copied, setCopied] = useState({
    cname_name: false,
    cname_value: false,
    txt_name: false,
    txt_value: false,
  })

  const shortLinkUrl = parse(process.env.NEXT_PUBLIC_SHORT_LINK_URL || '').hostname

  // cf_hostname_id being set means Cloudflare was already called — so the reason
  // is a CF-phase status, not a DNS check failure.
  const isGeneratingSsl =
    !!data?.cf_hostname_id &&
    !data?.is_verified &&
    !!data?.last_failed_reason &&
    CF_GENERATING_STATUSES.has(data.last_failed_reason)

  const handleCopy = (
    type: 'cname_name' | 'cname_value' | 'txt_name' | 'txt_value',
    value: string
  ) => {
    navigator.clipboard.writeText(value)
    setCopied((prev) => ({ ...prev, [type]: true }))
    toast({
      title: t('common:text.copied'),
      variant: 'success',
      description: t('common:messages.copy_to_clipboard'),
    })
    setTimeout(() => {
      setCopied((prev) => ({ ...prev, [type]: false }))
    }, 1000)
  }

  const handleVerify = () => {
    if (!domainId) return
    verifyDomain(undefined, {
      onSuccess: (response) => {
        const domain = response?.data?.data
        if (domain?.is_verified) {
          toast({
            title: t('forms.verifyDomainStep.notices.domainVerifiedTitle'),
            variant: 'success',
          })
        } else if (
          domain?.cf_hostname_id ||
          CF_GENERATING_STATUSES.has(domain?.last_failed_reason ?? '')
        ) {
          // Phase 1 passed — Cloudflare received the hostname, SSL is being issued
          toast({
            title: t('forms.verifyDomainStep.notices.generatingSslTitle'),
            description: t('forms.verifyDomainStep.notices.generatingSslDescription'),
            variant: 'info',
          })
        } else {
          toast({ title: t('forms.toasts.verifyFailed'), variant: 'destructive' })
        }
      },
      onError: () => {
        toast({ title: t('forms.toasts.verifyFailed'), variant: 'destructive' })
      },
      onSettled: () => {
        setCooldownUntil(new Date(Date.now() + 30 * 1000))
      },
    })
  }

  return (
    <div className="space-y-6">
      <LoadingMask loading={isLoading} className="w-full">
        <div className="space-y-6">
          {data && data.is_verified && (
            <Alert variant="success">
              <AlertTitle>{t('forms.verifyDomainStep.notices.domainVerifiedTitle')}</AlertTitle>
              <AlertDescription>
                {t('forms.verifyDomainStep.notices.domainVerifiedDescription')}
              </AlertDescription>
            </Alert>
          )}
          {isGeneratingSsl && (
            <Alert variant="info" icon={<ShieldCheck />}>
              <AlertTitle>{t('forms.verifyDomainStep.notices.generatingSslTitle')}</AlertTitle>
              <AlertDescription>
                {t('forms.verifyDomainStep.notices.generatingSslDescription')}
              </AlertDescription>
            </Alert>
          )}
          {data && data.is_verified === false && data.last_failed_at && !isGeneratingSsl && (
            <Alert variant="destructive">
              <AlertTitle>
                {t('forms.verifyDomainStep.notices.domainVerificationFailedTitle', {
                  time: dayjs(data.last_failed_at).format('YYYY-MM-DD HH:mm'),
                })}
              </AlertTitle>
              <AlertDescription>
                {t('forms.verifyDomainStep.notices.domainVerificationFailedDescription')}:{' '}
                {data.last_failed_reason}
              </AlertDescription>
            </Alert>
          )}
          <Card className="border">
            <CardHeader>
              <CardTitle>
                <div className="flex items-center text-primary">
                  <h2 className="md:text-[15px] md:leading-[22px] text-sm font-medium">
                    {t('forms.verifyDomainStep.dnsInstruction')}
                  </h2>
                </div>
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4 md:h-auto h-fit">
              {/* Cloudflare proxy toggle */}
              <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium text-amber-900">
                    {t('forms.verifyDomainStep.cfProxyToggle.label')}
                  </Label>
                  <p className="text-xs text-amber-700">
                    {t('forms.verifyDomainStep.cfProxyToggle.description')}
                  </p>
                </div>
                <Switch checked={cfProxyEnabled} onCheckedChange={setCfProxyEnabled} />
              </div>

              {/* CNAME Record */}
              <div className="">
                <div>
                  <div className="flex gap-2">
                    <PinIcon className="w-[18px] h-[18px] text-neutral-900" />
                    <h2 className="text-sm font-medium text-foreground">
                      {t('forms.verifyDomainStep.cnameRecord.label')}
                    </h2>
                  </div>
                  <p className="text-sm text-slate-600">
                    {t('forms.verifyDomainStep.cnameRecord.description')}
                  </p>
                </div>
                <div className="py-2 space-y-3">
                  <div className="grid grid-cols-12 gap-6">
                    <div className="col-span-12 md:col-span-6 space-y-1">
                      <label className="block text-sm font-medium text-foreground">
                        {t('forms.verifyDomainStep.cnameRecord.fields.name')}
                      </label>
                      <Input
                        type="text"
                        readOnly
                        disabled
                        className="bg-neutral-500! text-foreground overflow-hidden"
                        value={data?.domain ?? ''}
                        endAdornment={
                          <Button
                            variant="link"
                            className="text-slate-400"
                            size="icon"
                            type="button"
                            onClick={() => handleCopy('cname_name', data?.domain ?? '')}
                          >
                            {copied.cname_name ? (
                              <Check className="text-green-500 w-6! h-6!" />
                            ) : (
                              <Copy className="w-6! h-6!" />
                            )}
                          </Button>
                        }
                      />
                    </div>
                    <div className="col-span-12 md:col-span-6 space-y-1">
                      <label className="block text-sm font-medium text-foreground">
                        {t('forms.verifyDomainStep.cnameRecord.fields.target')}
                      </label>
                      <Input
                        type="text"
                        value={shortLinkUrl ?? ''}
                        readOnly
                        disabled
                        className="bg-neutral-500! text-foreground overflow-hidden"
                        endAdornment={
                          <Button
                            variant="link"
                            className="text-slate-400"
                            size="icon"
                            type="button"
                            onClick={() => handleCopy('cname_value', shortLinkUrl || '')}
                          >
                            {copied.cname_value ? (
                              <Check className="text-green-500 w-6! h-6!" />
                            ) : (
                              <Copy className="w-6! h-6!" />
                            )}
                          </Button>
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* TXT Record — only shown when Cloudflare proxy is enabled */}
              {cfProxyEnabled && (
                <div className="">
                  <div>
                    <div className="flex gap-2">
                      <PinIcon className="w-[18px] h-[18px] text-neutral-900" />
                      <h2 className="text-sm font-medium text-foreground">
                        {t('forms.verifyDomainStep.txtRecord.label')}
                      </h2>
                    </div>
                    <p className="text-sm text-slate-600">
                      {t('forms.verifyDomainStep.txtRecord.description')}
                    </p>
                  </div>
                  <div className="py-2 space-y-3">
                    <div className="grid grid-cols-12 gap-6">
                      <div className="col-span-12 md:col-span-6 space-y-1">
                        <label className="block text-sm font-medium text-foreground">
                          {t('forms.verifyDomainStep.txtRecord.fields.name')}
                        </label>
                        <Input
                          type="text"
                          value={data?.txt_name ?? ''}
                          readOnly
                          disabled
                          className="bg-neutral-500! text-foreground overflow-hidden"
                          endAdornment={
                            <Button
                              variant="link"
                              className="text-slate-400"
                              size="icon"
                              type="button"
                              onClick={() => handleCopy('txt_name', data?.txt_name ?? '')}
                            >
                              {copied.txt_name ? (
                                <Check className="text-green-500 w-6! h-6!" />
                              ) : (
                                <Copy className="w-6! h-6!" />
                              )}
                            </Button>
                          }
                        />
                      </div>
                      <div className="col-span-12 md:col-span-6 space-y-1">
                        <label className="block text-sm font-medium text-foreground">
                          {t('forms.verifyDomainStep.txtRecord.fields.content')}
                        </label>
                        <Input
                          type="text"
                          value={data?.txt_code ?? ''}
                          readOnly
                          disabled
                          className="bg-neutral-500! text-foreground overflow-hidden"
                          endAdornment={
                            <Button
                              variant="link"
                              className="text-slate-400"
                              size="icon"
                              type="button"
                              onClick={() => handleCopy('txt_value', data?.txt_code || '')}
                            >
                              {copied.txt_value ? (
                                <Check className="text-green-500 w-6! h-6!" />
                              ) : (
                                <Copy className="w-6! h-6!" />
                              )}
                            </Button>
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </LoadingMask>

      {/* Verification Notice */}
      {data && !data.is_verified && (
        <Alert variant="info">
          <AlertTitle>{t('forms.verifyDomainStep.verificationNotice.title')}</AlertTitle>
          <AlertDescription>
            {t('forms.verifyDomainStep.verificationNotice.message')}
          </AlertDescription>
        </Alert>
      )}

      <div className="flex justify-center gap-6">
        {domainId && data?.is_verified ? (
          <LoadingButton
            variant="secondary"
            onClick={() => onFinish()}
            type="button"
            isLoading={false}
          >
            {t('common:buttons.close')}
          </LoadingButton>
        ) : (
          <LoadingButton
            variant="secondary"
            onClick={() => onFinish()}
            type="button"
            isLoading={false}
          >
            {t('forms.buttons.skip')}
          </LoadingButton>
        )}
        {domainId && !data?.is_verified && (
          <CooldownButton
            className="w-full"
            variant="default"
            cooldownUntil={cooldownUntil}
            onClick={() => handleVerify()}
            type="button"
            loading={verifying}
          >
            {t('forms.buttons.verifyDomain')}
          </CooldownButton>
        )}
      </div>
    </div>
  )
}
