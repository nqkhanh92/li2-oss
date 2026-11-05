import { ContentLayout } from '@/shared/components/layout/content-layout'
import { DashboardsList } from '@/ee/features/dashboards/components/dashboards-list'

export default function DashboardsPage() {
  return (
    <ContentLayout title="Dashboards" isBackable={false}>
      <DashboardsList />
    </ContentLayout>
  )
}
