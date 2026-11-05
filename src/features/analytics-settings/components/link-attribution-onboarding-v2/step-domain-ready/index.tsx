'use client'

import { useParams } from 'next/navigation'
import { ArrowLeft, CheckCircle2, ArrowRight, Clock, ExternalLink } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import { useOrganizationStoreProvider } from '@/shared/providers/organization-store-provider'
import { useDomainStore } from '@/shared/stores/domain-stepper-store'
import { useShowCustomDomain } from '@/features/custom-domains/hooks/queries'
import { ROLE_PERMISSION_KEYS } from '@/shared/types/role-permission'
import { cn } from '@/shared/lib/utils'

interface Props {
  onBack: () => void
}

export function StepDomainReady({ onBack }: Props) {
  const { t } = useTranslation('link_attribution_onboarding')
  const { orgRouterPush, hasPermission } = useOrganizationStoreProvider()
  const { org_id } = useParams<{ org_id: string }>()
  const domainId = useDomainStore((s) => s.domainId)
  const { data: domain } = useShowCustomDomain(org_id, domainId)

  const isVerified = domain?.is_verified ?? false
  const canManageDomains = hasPermission(ROLE_PERMISSION_KEYS.MANAGE_DOMAINS)

  return (
    <div className="flex flex-col gap-6 px-4 sm:px-12 py-6 w-full sm:h-full">
      {/* Header */}
      <div className="flex flex-col gap-1 shrink-0">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-s text-muted-foreground hover:text-foreground transition-colors w-fit mb-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {t('v2.common.back')}
        </button>
        <h1 className="text-xl font-semibold text-primary leading-7">
          {isVerified ? t('v2.domain_ready.title') : t('v2.domain_ready.title_pending')}
        </h1>
        <p className="text-s text-muted-foreground">
          {isVerified ? t('v2.domain_ready.subtitle') : t('v2.domain_ready.subtitle_pending')}
        </p>
      </div>

      {/* Status card */}
      <div className={cn(
        'rounded-xl border bg-card p-5 flex flex-col gap-4 shrink-0',
        isVerified ? 'border-semantic-success/30' : 'border-amber-200'
      )}>
        <div className="flex items-center gap-3">
          <div className={cn(
            'flex h-10 w-10 items-center justify-center rounded-full shrink-0',
            isVerified ? 'bg-semantic-success/10' : 'bg-amber-50'
          )}>
            {isVerified
              ? <CheckCircle2 className="w-5 h-5 text-semantic-success" />
              : <Clock className="w-5 h-5 text-amber-500" />
            }
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold text-foreground">
              {isVerified ? t('v2.domain_ready.domain_set') : t('v2.domain_ready.domain_pending')}
            </span>
            {domain?.name && (
              <span className="text-xs font-mono text-muted-foreground">{domain.name}</span>
            )}
          </div>
        </div>

        {!isVerified && (
          <>
            <div className="rounded-lg bg-amber-50 border border-amber-100 px-4 py-3 flex flex-col gap-1">
              <p className="text-xs font-medium text-amber-700">{t('v2.domain_ready.verify_notice')}</p>
              <p className="text-xs text-amber-600/80">{t('v2.domain_ready.verify_auto')}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                disabled={!canManageDomains}
                onClick={() => canManageDomains && orgRouterPush('custom-domains')}
                iconLeft={<ExternalLink className="w-3.5 h-3.5" />}
              >
                {t('v2.domain_ready.manage_domains')}
              </Button>
              {!canManageDomains && (
                <Badge variant="outline" className="text-xs text-muted-foreground border-muted-foreground/30">
                  {t('v2.domain_ready.role_restricted')}
                </Badge>
              )}
            </div>
          </>
        )}

        {isVerified && (
          <>
            <div className="w-full h-px bg-border" />
            <div className="flex flex-col gap-1.5">
              <p className="text-s font-medium text-foreground">{t('v2.domain_ready.next_step')}</p>
              <p className="text-xs text-muted-foreground">{t('v2.domain_ready.next_step_description')}</p>
            </div>
            <Button
              size="sm"
              onClick={() => orgRouterPush('short-links/create')}
              iconRight={<ArrowRight className="w-4 h-4" />}
            >
              {t('v2.domain_ready.create_btn')}
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
