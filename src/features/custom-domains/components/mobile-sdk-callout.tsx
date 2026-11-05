'use client'

import { Copy, Smartphone, ArrowUpRight } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { Alert, AlertDescription, AlertTitle } from '@/shared/components/ui/alert'
import { Button } from '@/shared/components/ui/button'
import { toast } from '@/shared/hooks/use-toast'
import { useGetAnalyticsSettings } from '@/features/analytics-settings/hooks/queries'

export function MobileSdkCallout() {
  const { t } = useTranslation(['domain', 'common'])
  const { org_id } = useParams<{ org_id: string }>()
  const { data: settings, isLoading } = useGetAnalyticsSettings(org_id)

  if (isLoading) return null

  const publishableKey = settings?.publishable_key

  const handleCopy = async () => {
    if (!publishableKey) return
    await navigator.clipboard.writeText(publishableKey)
    toast({ variant: 'success', description: t('common:messages.copied_to_clipboard') })
  }

  return (
    <Alert className="mt-4 border-primary/20 bg-primary/5">
      <Smartphone className="h-4 w-4" />
      <AlertTitle>{t('domain:deepLink.attribution.callout_title')}</AlertTitle>
      <AlertDescription className="flex flex-col gap-2">
        <span>{t('domain:deepLink.attribution.callout_body')}</span>
        {publishableKey ? (
          <div className="flex items-center gap-2 rounded-md border bg-background p-2 font-mono text-sm">
            <code className="flex-1 truncate">{publishableKey}</code>
            <Button size="sm" variant="ghost" onClick={handleCopy}>
              <Copy className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <Button asChild size="sm" variant="outline" className="w-fit">
            <Link href={`/org/${org_id}/site-analytics`}>
              {t('domain:deepLink.attribution.generate_key_cta')}
              <ArrowUpRight className="ml-1 h-3 w-3" />
            </Link>
          </Button>
        )}
      </AlertDescription>
    </Alert>
  )
}
