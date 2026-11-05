import { ContentLayout } from '@/shared/components/layout/content-layout'
import { DashboardView } from '@/ee/features/dashboards/components/dashboard-view'

export default function DashboardViewPage() {
  return (
    <ContentLayout title="" navBarEnabled={false} isBackable={false}>
      <DashboardView />
    </ContentLayout>
  )
}
