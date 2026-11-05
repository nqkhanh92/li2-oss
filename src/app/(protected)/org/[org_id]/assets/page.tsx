import { ContentLayout } from '@/shared/components/layout/content-layout'
import { AssetLists } from '@/features/assets/components/asset-list'

export default function AssetPage() {
  return (
    <ContentLayout title="Assets Management">
      <AssetLists />
    </ContentLayout>
  )
}
