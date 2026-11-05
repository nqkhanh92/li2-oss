'use client'

import { useTranslation } from 'react-i18next'
import { useParams } from 'next/navigation'
import { CheckCircle2, XCircle, Loader2, Link2 } from 'lucide-react'
import { Badge } from '@/shared/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/shared/components/ui/tooltip'
import { useVerifyDeepLink } from '@/features/custom-domains/hooks/mutations'
import type { CustomDomain } from '@/features/custom-domains/hooks/queries'
import { parseDeepLinkConfig } from '@/shared/schemas/custom-domains'
import { usePlanFeatures } from '@/features/touch-points/hooks/use-plan-features'

interface DeepLinkVerificationBadgeProps {
  domain: CustomDomain
}

/**
 * "Deep Links Active" badge shown on domain rows that have deep_link_apps
 * enabled. Clicking the badge calls the server-side verify endpoint
 * (`/verify-deep-link`) which fetches AASA and assetlinks.json from the
 * user's domain and validates the shape — green check on success, red X
 * on failure, with per-platform error details in the tooltip.
 *
 * Returns null (renders nothing) when the domain has no enabled config —
 * the parent is expected to only render this component on eligible rows.
 */
export function DeepLinkVerificationBadge({ domain }: DeepLinkVerificationBadgeProps) {
  const { t } = useTranslation(['domain'])
  const { org_id } = useParams<{ org_id: string }>()
  const { enableDeepLinkAttribution } = usePlanFeatures()
  const attributionReady = !!enableDeepLinkAttribution
  const { mutate: verify, data, isPending, error, isSuccess } = useVerifyDeepLink(
    org_id,
    domain.id
  )

  const config = parseDeepLinkConfig(domain.deep_link_apps)
  if (!config?.enabled) return null

  const allOk =
    isSuccess &&
    data &&
    (data.ios === null || data.ios.ok) &&
    (data.android === null || data.android.ok)

  const anyFailed =
    isSuccess && data && ((data.ios && !data.ios.ok) || (data.android && !data.android.ok))

  const tooltipContent = (() => {
    const attributionLine = attributionReady ? (
      <p className="mt-1 text-green-700">{t('domain:deepLink.badge.attribution_ready')}</p>
    ) : null
    if (isPending) return <p>Verifying deep link files…</p>
    if (error) return <p>Network error — could not reach the verification endpoint</p>
    if (allOk)
      return (
        <div>
          <p>AASA and assetlinks are being served correctly</p>
          {attributionLine}
        </div>
      )
    if (anyFailed && data)
      return (
        <div className="space-y-1 text-xs">
          {data.ios && <p>iOS: {data.ios.ok ? '✓ OK' : `✗ ${data.ios.error}`}</p>}
          {data.android && (
            <p>Android: {data.android.ok ? '✓ OK' : `✗ ${data.android.error}`}</p>
          )}
        </div>
      )
    return <p>Click to verify deep link files are served correctly</p>
  })()

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            size="xs"
            className="cursor-pointer gap-1 bg-blue-50 text-blue-800 hover:bg-blue-100"
            onClick={() => verify()}
          >
            <Link2 className="h-3 w-3" />
            {t('domain:deepLink.configured')}
            {isPending && <Loader2 className="h-3 w-3 animate-spin" />}
            {allOk && <CheckCircle2 className="h-3 w-3 text-green-600" />}
            {anyFailed && <XCircle className="h-3 w-3 text-red-600" />}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
