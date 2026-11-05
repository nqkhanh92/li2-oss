import { ContentLayout } from '@/shared/components/layout/content-layout'
import { LinkJourneyPage } from '@/ee/features/link-journey/components/link-journey-page'
import { disabledFeatures } from '@/shared/constants/disabled-features'
import { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = { title: 'Link Journey' }

export default async function LinkJourneyDashboardPage({ params }: { params: { org_id: string } }) {
  if (disabledFeatures.BEHAVIOR_ANALYTICS || disabledFeatures.LINK_JOURNEY)
    redirect(`/org/${params.org_id}`)

  return (
    <ContentLayout title="Link Journey" isBackable={false}>
      <LinkJourneyPage />
    </ContentLayout>
  )
}
