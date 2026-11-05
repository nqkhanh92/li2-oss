import { OnboardingView } from '@/features/analytics-settings/components/v2/onboarding-view'
import { ContentLayout } from '@/shared/components/layout/content-layout'
import { disabledFeatures } from '@/shared/constants/disabled-features'
import { initServerI18n } from '@/shared/lib/i18n/i18n-server'
import { redirect } from 'next/navigation'

export async function generateMetadata() {
  const i18n = await initServerI18n('common')
  return {
    title: i18n.t('module.onboarding', { defaultValue: 'Get Started' }),
  }
}

export default async function OnboardingPage({ params }: { params: { org_id: string } }) {
  if (disabledFeatures.ONBOARDING) redirect(`/org/${params.org_id}`)

  const { t } = await initServerI18n()
  return (
    <div className="w-full h-full overflow-y-auto bg-background text-foreground">
      <OnboardingView />
    </div>
  )
}
